import React from 'react'

import ChatRoom from './ChatRoom';
import * as words from './words';

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getUsername() {
  if (!localStorage.username) {
    localStorage.username = pick(words.adjectives) + ' ' + pick(words.animals);
  }

  return localStorage.username;
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

    // TODO: restrict to just this subnet
    const messages = this.props.jindo.observable('chat-messages')
      .filter((msg) => msg.type === 'chat-message')
      .scan((list, e) => list.concat(e), [])
      .startWith([]);

    const presence = this.props.jindo
        .observable('presence')
        .map(v => v.value)
        .startWith([]);

    this.Observer = subscribeToComponent(ChatRoom, {
      messages: messages,
      presence: presence,
      connected: this.props.jindo.connected,
      reconnectingAt: this.props.jindo.reconnectingAt
    })

    this.props.jindo.publish('chat-messages', {
      type: 'chat-join',
      name: getUsername()
    });
  }

  onSubmitMessage(message) {
    this.props.jindo.publish('chat-messages', {
      type: 'chat-message',
      body: message, 
      name: getUsername()
    });
  }

  render() {
    let roomName;

    if (this.state.ipInfo) {
      const ipInfo = this.state.ipInfo;
      roomName = `${ipInfo.org} - ${ipInfo.city}, ${ipInfo.region}`;
    } else {
      roomName = '...';
    }

    return <this.Observer
        roomName={roomName}
        onSubmitMessage={this.onSubmitMessage} />;
  }
}

ChatApp.propTypes = {
  jindo: React.PropTypes.object.isRequired
};

module.exports = ChatApp;
