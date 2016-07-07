import React from 'react'

import ChatRoom from './ChatRoom';

class ChatApp extends React.Component {
  constructor(props) {
    super(props);
    this.onSubmitMessage = this.onSubmitMessage.bind(this);
    this.state = {
      messages: [
        {id: 0, timestamp: 0, name: 'Jon', body: 'hello'}
      ]
    };
  }

  componentWillMount() {
    window.fetch("http://ipinfo.io/json")
      .then(r => r.json())
      .then(r => this.setState({ipInfo: r}));
  }

  onSubmitMessage(message) {
    this.setState({
      messages: this.state.messages.concat({
        id: this.state.messages.length,
        timestamp: Date.now(), 
        body: message, 
        name: 'Jon'
      })
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

    return <ChatRoom
        messages={this.state.messages}
        roomName={roomName}
        onSubmitMessage={this.onSubmitMessage} />;
  }
}

module.exports = ChatApp;
