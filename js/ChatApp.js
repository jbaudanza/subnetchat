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
    return <ChatRoom
        messages={this.state.messages}
        onSubmitMessage={this.onSubmitMessage} />;
  }
}

module.exports = ChatApp;
