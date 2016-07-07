import React from 'react';

import ChatMessage from './ChatMessage';
import MessageComposer from './MessageComposer';


function ChatNavItem(props) {
  let icon;
  let className;

  if (props.type === 'user') {
    icon = <i className="fa fa-user"></i>;
  } else {
    icon = <i>#</i>;
  }

  if (props.selected) {
    className = 'selected';
  }

  return (
    <li className={className}>
      <a href="#">{icon}<span>{props.children}</span></a>
    </li>
  );
}


function ChatNav(props) {
  const style = Object.assign({padding: 0, margin: 0}, props.style)
  return (
    <ul className='chat-nav' style={style}>
      <ChatNavItem selected type="channel">192.168.1.*</ChatNavItem>
      <ChatNavItem type="user">Jonathan B</ChatNavItem>
      <ChatNavItem type="user">Biggie S</ChatNavItem>
    </ul>
  );
}


class ChatRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentWillMount() {
    this.tick();
    this.timerId = setInterval(this.tick.bind(this), 30000);
  }

  componentDidMount() {
    this.scrollToBottom();
  }

  componentWillUnmount() {
    clearInterval(this.timerId);
    delete this.timerId;
  }

  componentDidUpdate(prevProps: Object, prevState: Object) {
    if (this.props.messages.length !== prevProps.messages.length) {
      const ul = this.refs.messageList;

      // If the user is somewhat close to the bottom of the scroll window
      if (ul.clientHeight + ul.scrollTop + 100 >= ul.scrollHeight)
        this.scrollToBottom()
    }
  }

  scrollToBottom() {
    const ul = this.refs.messageList;
    ul.scrollTop = ul.scrollHeight - ul.clientHeight;
  }

  tick() {
    this.setState({now: new Date()});
  }

  render() {
    const style = {
      list: {
        overflowY: 'auto',
        padding: 0,
        margin: 0,
        flex: 1
      },
      wrapper: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      },
      leftColumn: {
        width: '20%',
        float: 'left'
      },
      rightColumn: {
        width: '80%',
        float: 'left',
        height: '100%',
        position: 'relative'
      }
    }


    return (
      <div className='chat-room' style={{overflow: 'hidden'}}>
        <ChatNav style={style.leftColumn} />
        <div style={style.rightColumn}>
          <div style={style.wrapper}>
            <div className='room-name'>
              {this.props.roomName}
            </div>
            <ul style={style.list} ref='messageList'>
              {this.props.messages.map(e => <ChatMessage key={e.id} now={this.state.now} {...e} />)}
            </ul>
            <MessageComposer onSubmit={this.props.onSubmitMessage} />
          </div>
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