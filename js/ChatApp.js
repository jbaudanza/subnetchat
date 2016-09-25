import React from 'react'
import {bindAll} from 'lodash';

import ChatRoom from './ChatRoom';
import * as words from './words';
import channelNameFromAddress from './channelName';
import IdentitySelector from './IdentitySelector'
import Overlay from './Overlay';
import uuid from 'node-uuid';


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
    name: getFromLocalstorage('name', () => pick(words.adjectives) + ' ' + pick(words.animals)),
    colorIndex: parseInt(getFromLocalstorage('colorIndex', () => randomIndex(8))),
    iconIndex: parseInt(getFromLocalstorage('iconIndex', () => randomIndex(8)))
  };
}

function subscribeToComponent(Component, observables) {
  return class ReactObserver extends React.Component {
    constructor(props) {
      super(props);
      this.state = {};
    }

    componentWillMount() {
      this.unsubs = [];
      Object.keys(observables).forEach((key) => {
        this.unsubs.push(
          observables[key].subscribe((v) => this.setState({[key]: v}))
        );
      });

    }

    componentWillUnmount() {
      this.unsubs.forEach(function(sub) {
        sub.unsubscribe();
      })
    }

    render() {
      return <Component {...this.state} {...this.props} />;
    }
  }
}


function addIdentitiesToMessages(messages, identities) {
  return messages.map(function(msg) {
    let identity;

    if ('identityId' in msg) {
      if (msg.identityId in identities) {
        identity = identities[msg.identityId]
      } else {
        console.warn('Identity not found for ' + msg.identityId);
      }
    } else {
      console.warn('Message is missing identityId', message);
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


class ChatApp extends React.Component {
  constructor(props) {
    super(props);

    bindAll(this, 'onSubmitMessage', 'showOverlay', 'hideOverlay', 'setIdentity');

    this.state = {
      showOverlay: false
    };
  }

  setIdentity(identity) {
    this.hideOverlay();
    this.setState({identity: identity});

    Object.assign(localStorage, identity);

    this.publishIdentity();
  }

  componentWillMount() {
    window.fetch("http://ipinfo.io/json")
      .then(r => r.json())
      .then(r => this.setState({ipInfo: r}));

    this.setState({identity: getIdentity()});

    // TODO: restrict to just this subnet
    const messages = this.props.jindo.observable('chat-messages')
      .filter((msg) => msg.type === 'chat-message')
      .scan((list, e) => list.concat(e), [])

    const presence = this.props.jindo
        .observable('presence')
        .startWith([]);

    const messagesWithIdentity = Rx.Observable.combineLatest(
      messages,
      this.props.jindo.observable('identities'),
      addIdentitiesToMessages
    ).startWith([]);

    const channelName = this.props.jindo.observable('ip-address')
        .map(channelNameFromAddress);

    this.Observer = subscribeToComponent(ChatRoom, {
      messages: messagesWithIdentity,
      presence: presence,
      connected: this.props.jindo.connected,
      reconnectingAt: this.props.jindo.reconnectingAt,
      channelName: channelName
    })

    this.publishIdentity();
  }

  publishIdentity() {
    this.props.jindo.publish('chat-identities', {
      type: 'identify',
      identityId: getIdentityId(),
      identity: getIdentity()
    });
  }

  onSubmitMessage(message) {
    this.props.jindo.publish('chat-messages', {
      type: 'chat-message',
      body: message,
      identityId: getIdentityId()
    });
  }

  showOverlay() {
    this.setState({showOverlay: true});
  }

  hideOverlay() {
    this.setState({showOverlay: false});
  }

  render() {
    const extraProps = {
      onSubmitMessage: this.onSubmitMessage,
      identity: this.state.identity,
      onChangeName: this.showOverlay
    };

    if (this.state.ipInfo) {
      const ipInfo = this.state.ipInfo;
      extraProps.channelDescription = ipInfo.org;
      extraProps.channelLocation = `${ipInfo.city}, ${ipInfo.region}`
    }

    let overlay;
    if (this.state.showOverlay) {
      overlay = (
        <Overlay onClose={this.hideOverlay}>
          <IdentitySelector
              {...this.state.identity}
              onClose={this.hideOverlay}
              onSubmit={this.setIdentity} />
        </Overlay>
      );
    }

    return (
      <div>
        {overlay}
        <this.Observer {...extraProps} />
      </div>
    );
  }
}

ChatApp.propTypes = {
  jindo: React.PropTypes.object.isRequired
};

module.exports = ChatApp;
