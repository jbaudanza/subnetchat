import React from 'react'
import {bindAll, first, times, fill} from 'lodash';
import uuid from 'node-uuid';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/startWith';

import PublishingClient from 'rxremote/lib/publishing_client';
import ObservablesClient from 'rxremote/observables_client';


require('whatwg-fetch');

import ChatRoom from './ChatRoom';
import SvgAssets from './SvgAssets'
import * as words from './words';
import channelNameFromAddress from './channelName';
import IdentitySelector from './IdentitySelector'
import RoomSelector from './RoomSelector'
import Overlay from './Overlay';

import bindComponentToObservables from './bindComponentToObservables';


const publishingClient = new PublishingClient();
const observablesClient = new ObservablesClient();

function randomIndex(ceil) {
  return Math.floor(Math.random() * ceil);
}


function pick(array) {
  return array[randomIndex(array.length)];
}


function getFromLocalstorage(key, generator) {
  if (!(key in localStorage)) {
    localStorage[key] = generator();
  }

  return localStorage[key];
}


function getIdentityId() {
  return getFromLocalstorage('identityId', () => uuid.v4());
}


function getIdentity() {
  return {
    identityId: getIdentityId(),
    name: getFromLocalstorage('name', () => pick(words.adjectives) + ' ' + pick(words.animals)),
    colorIndex: parseInt(getFromLocalstorage('colorIndex', () => randomIndex(8))),
    iconIndex: parseInt(getFromLocalstorage('iconIndex', () => randomIndex(8)))
  };
}


function addIdentitiesToMessages(messages, identities) {
  return messages.map(function(msg) {
    if ('identity' in msg)
      return msg;

    let identity;

    if ('identityId' in msg) {
      if (msg.identityId in identities) {
        identity = identities[msg.identityId]
      } else {
        console.warn('Identity not found for ' + msg.identityId);
      }
    } else {
      console.warn('Message is missing identityId', msg);
    }

    if (!identity) {
      identity = {name: '???'};
    }

    return {
      id: msg.id,
      body: msg.body,
      timestamp: msg.timestamp,
      identity: identity
    }
  });
}

function flattenMessage(msg) {
  let obj = Object.assign({}, msg.value, msg);
  delete obj.value;
  return obj;
}


function extendWithHelperBot(list, channelName) {
  const welcomeMessage = `Welcome to subnetchat.com! This chat room is only accessible to people on your local subnet. Your subnet refers to the network of computers that are directly connected to you. This could be your office, school, or neighborhood block. Messages in this chat room will only be visible to people with an IP address that starts with ${channelName}.`;

  return [{
    body: welcomeMessage,
    timestamp: (list.length > 0) ? first(list).timestamp : (new Date().toISOString()),
    identity: {
      iconId: '#info',
      colorIndex: 6,
      name: 'Helper Bot'
    },
    id: 0
  }].concat(list);
}


const rooms = [
  {
    name: '*',
    messages: 100,
    online: 2,
    description: 'Entire Internet'
  },
  {
    name: '192.*.*.*',
    messages: 20,
    online: 4,
    description: 'Your Class A Subnet'
  },
  {
    name: '192.168.*.*',
    messages: 20,
    online: 4,
    description: 'Your Class B Subnet'
  },
  {
    name: '192.168.1.*',
    messages: 20,
    online: 4,
    description: 'Your Class C Subnet'
  },
  {
    name: '192.168.1.50',
    messages: 20,
    online: 4,
    description: 'Your IP Address'
  }
];


import ip from 'ip-address';

const ipv6Descriptions = [
    "Everyone in the world",
    "In a massive subnet",
    "In a huge subnet",
    "In a smaller subnet",
    "In your immediate subnet",
    "Only your IP"
];

const ipv4Descriptions = [
  "Everyone in the world",
  "In your class A subnet",
  "In your class B subnet",
  "In your class C subnet",
  "Only your IP"
];

function makeRoomList(addressString) {
  let addr;

  function chomp(addr, delim) {
    function join(list) {
      return list.join(delim)
    }

    const multiplier = addr.parsedAddress.length / 4;
    return times(5, (i) => join(addr.parsedAddress.slice(0, i*multiplier).concat(fill(Array(addr.parsedAddress.length - i*multiplier), '*'))));
  }

  function mix(roomNames, descriptions) {
    return roomNames.map((name, i) => ({name: name, description: descriptions[i], messages: 1, online: 1}))
  }

  addr = new ip.Address6(addressString);
  if (addr.valid) {
    return mix(chomp(addr, ':'), ipv6Descriptions);
  }

  addr = new ip.Address4(addressString);
  if (addr.valid) {
    return mix(chomp(addr, '.'), ipv4Descriptions);
  }
}

class ChatApp extends React.Component {
  constructor(props) {
    super(props);

    bindAll(this,
        'onSubmitMessage','hideOverlay', 'setName', 'setIdentity',
        'onReconnect', 'onChangeName', 'onChangeRoom'
    );

    this.state = {
      showOverlay: null
    };
  }

  setIdentity(identity) {
    this.hideOverlay();
    this.setState({identity: identity});

    Object.assign(localStorage, identity);

    this.publishIdentity();
  }

  onReconnect() {
    observablesClient.reconnect();
  }

  setName(name) {
    const identity = Object.assign({}, this.state.identity, {name})
    this.setState({identity: identity});

    Object.assign(localStorage, identity);

    this.publishIdentity();
  }

  componentWillMount() {
    window.fetch("https://ipinfo.io/json")
      .then(r => r.json())
      .then(r => this.setState({ipInfo: r}));

    this.setState({identity: getIdentity()});

    const ipAddress$ = observablesClient.observable('ip-address');

    const messages = ipAddress$.switchMap((ipAddress) => (
      observablesClient.observable('chat-messages')
          .map(batch => batch.map(flattenMessage))
          .scan((list, e) => list.concat(e), [])
          .startWith([])
          .map(list => extendWithHelperBot(list, channelNameFromAddress(ipAddress)))
    ))

    const identities = ipAddress$.switchMap(() => observablesClient.observable('identities'))

    const presence = Observable.combineLatest(
      ipAddress$.switchMap(() => observablesClient.observable('presence')),
      identities,
      (presenceList, identities) => presenceList.map((id) => identities[id]).filter(x => x)
    ).startWith([]);

    const messagesWithIdentity = Observable.combineLatest(
      messages,
      identities,
      addIdentitiesToMessages
    ).startWith([]);

    const channelName$ = ipAddress$.map(channelNameFromAddress);

    this.Observer = bindComponentToObservables(ChatRoom, {
      messages: messagesWithIdentity,
      presence: presence,
      connected: observablesClient.connected,
      connectionState: observablesClient.connectionState,
      reconnectingAt: observablesClient.reconnectingAt,
      channelName: channelName$
    })

    this.publishIdentity();
  }

  publishIdentity() {
    publishingClient.publish('chat-identities', {
      type: 'identify',
      identityId: getIdentityId(),
      identity: getIdentity()
    });
  }

  onSubmitMessage(message) {
    publishingClient.publish('chat-messages', {
      type: 'chat-message',
      body: message,
      identityId: getIdentityId()
    });
  }

  onChangeName() {
    this.setState({showOverlay: 'change-identity'});
  }

  onChangeRoom() {
    this.setState({showOverlay: 'change-room'});
  }

  hideOverlay() {
    this.setState({showOverlay: false});
  }

  render() {
    const extraProps = {
      onSubmitMessage: this.onSubmitMessage,
      identity: this.state.identity,
      onChangeName: this.onChangeName,
      onChangeRoom: this.onChangeRoom,
      onReconnect: this.onReconnect,
      setName: this.setName
    };

    if (this.state.ipInfo) {
      const ipInfo = this.state.ipInfo;
      extraProps.channelDescription = ipInfo.org;
      extraProps.channelLocation = `${ipInfo.city}, ${ipInfo.region}`
    }

    let overlay;
    switch (this.state.showOverlay) {
      case 'change-identity':
        overlay = (
          <Overlay onClose={this.hideOverlay}>
            <IdentitySelector
                {...this.state.identity}
                onClose={this.hideOverlay}
                onSubmit={this.setIdentity} />
          </Overlay>
        );
        break;
      case 'change-room':
        overlay = (
          <Overlay onClose={this.hideOverlay}>
            <RoomSelector
                rooms={makeRoomList(this.state.ipInfo.ip)}
                ipAddress={this.state.ipInfo.ip}
            />

          </Overlay>
        );
    }

    return (
      <div>
        <SvgAssets />
        {overlay}
        <this.Observer {...extraProps} />
      </div>
    );
  }
}

module.exports = ChatApp;
