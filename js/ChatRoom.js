import React from 'react';

import ChatMessage from './ChatMessage';
import MessageComposer from './MessageComposer';


class ChatRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentWillMount() {
    this.tick();
    this.timerId = setInterval(this.tick.bind(this), 30000);
  }

  componentWillUnmount() {
    clearInterval(this.timerId);
    delete this.timerId;
  }

  tick() {
    this.setState({now: new Date()});
  }

  render() {
    const styles = {
      list: {
        padding: 0,
        margin: 0
      },
      avatar: {
        height: 40,
        width: 40
      }
    };

    return (
      <div className='chat-room'>
        <div>
          <ul style={styles.list}>
            {this.props.messages.map(e => <ChatMessage key={e.id} now={this.state.now} {...e} />)}
          </ul>
          <MessageComposer onSubmit={this.props.onSubmitMessage} />
        </div>  
      </div>
    );
  }
}

ChatRoom.propTypes = {
  messages:         React.PropTypes.array.isRequired,
  onSubmitMessage:  React.PropTypes.func.isRequired
};

export default ChatRoom;