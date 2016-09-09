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


class ChatApp extends React.Component {
  constructor(props) {
    super(props);
    this.onSubmitMessage = this.onSubmitMessage.bind(this);
    this.state = {
      messages: []
    };
  }

  componentWillMount() {
    window.fetch("http://ipinfo.io/json")
      .then(r => r.json())
      .then(r => this.setState({ipInfo: r}));

    // TODO: restrict to just this subnet
    const messages = this.props.jindo.observable('chat-messages')
      .filter((msg) => msg.type === 'chat-message')
      .scan((list, e) => list.concat(e), []);

    const presence = this.props.jindo.observable('presence');

    messages.subscribe((list) => this.setState({messages: list}));

    presence.subscribe((value) => this.setState({presence: value}));

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

    let presence;
    if (this.state.presence) {
      presence = this.state.presence.value;
    } else {
      presence = [];
    }

    return <ChatRoom
        messages={this.state.messages}
        presence={presence}
        roomName={roomName}
        onSubmitMessage={this.onSubmitMessage} />;
  }
}

ChatApp.propTypes = {
  jindo: React.PropTypes.object.isRequired
};

module.exports = ChatApp;
