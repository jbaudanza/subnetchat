import React from 'react'

import ChatRoom from './ChatRoom';
import * as words from './words';
import channelNameFromAddress from './channelName';


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

function getIdentity() {
  return {
    name: getFromLocalstorage('username', () => pick(words.adjectives) + ' ' + pick(words.animals)),
    color: getFromLocalstorage('color', () => randomIndex(8)),
    icon: getFromLocalstorage('icon', () => randomIndex(8))
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


class ChatApp extends React.Component {
  constructor(props) {
    super(props);
    this.onSubmitMessage = this.onSubmitMessage.bind(this);
    this.state = {};
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
      .startWith([]);

    const presence = this.props.jindo
        .observable('presence')
        .map(v => v.value)
        .startWith([]);

    const channelName = this.props.jindo.observable('ip-address')
        .map(v => channelNameFromAddress(v.ipAddress));

    this.Observer = subscribeToComponent(ChatRoom, {
      messages: messages,
      presence: presence,
      connected: this.props.jindo.connected,
      reconnectingAt: this.props.jindo.reconnectingAt,
      channelName: channelName
    })

    this.props.jindo.publish('chat-messages', Object.assign({
      type: 'chat-join'
    }, getIdentity()));
  }

  onSubmitMessage(message) {
    this.props.jindo.publish('chat-messages', Object.assign({
      type: 'chat-message',
      body: message
    }, getIdentity()));
  }

  render() {
    const extraProps = {
      onSubmitMessage: this.onSubmitMessage,
      identity: this.state.identity
    };

    if (this.state.ipInfo) {
      const ipInfo = this.state.ipInfo;
      extraProps.channelDescription = ipInfo.org;
      extraProps.channelLocation = `${ipInfo.city}, ${ipInfo.region}`
    }

    return <this.Observer {...extraProps} />;
  }
}

ChatApp.propTypes = {
  jindo: React.PropTypes.object.isRequired
};

module.exports = ChatApp;
