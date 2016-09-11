import React from 'react';

import MessageComposer from './MessageComposer';
import MessageList from './MessageList';


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
      {props.presence.map((name, i) => <ChatNavItem key={i} type="user">{name}</ChatNavItem>)}
    </ul>
  );
}


function Disconnected(props) {
  const seconds = Math.floor((props.reconnectingAt - props.now) /1000);

  return (
    <div>
      You are disconnected. Reconnecting in {seconds} seconds.
    </div>
  );
}


function createTickingComponent(Component, interval) {
  return class TickingComponent extends React.Component {
    constructor(props) {
      super(props);
      this.state = {};
    }

    componentWillMount() {
      this.tick();
      this.timerId = setInterval(this.tick.bind(this), interval);
    }

    componentWillUnmount() {
      clearInterval(this.timerId);
      delete this.timerId;
    }

    tick() {
      this.setState({now: new Date()});
    }

    render() {
      return <Component now={this.state.now} {...this.props} />;
    }
  };
}


class ChatRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentWillMount() {
    this.MessageList = createTickingComponent(MessageList, 30000);
    this.Disconnected = createTickingComponent(Disconnected, 1000);
  }

  render() {
    if (!this.props.connected) {
      return <this.Disconnected reconnectingAt={this.props.reconnectingAt} />;
    }

    const style = {
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
    };

    return (
      <div>
        <header>
          <span className='logo'>
            subnetchat.com
          </span>
          <span className='tag-line'>
            The simplest chatroom for your office, school, or private subnet.
          </span>
        </header>
        <div className='chat-room' style={{overflow: 'hidden'}}>
          <ChatNav
              style={style.leftColumn}
              presence={this.props.presence} />
          <div style={style.rightColumn}>
            <div style={style.wrapper}>
              <div className='channel-header'>
                <span className='channel-name'>
                  {this.props.channelName}
                </span>
                <span className='channel-description'>
                  {this.props.roomName}
                </span>
              </div>
              <this.MessageList messages={this.props.messages} />
              <MessageComposer onSubmit={this.props.onSubmitMessage} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ChatRoom.propTypes = {
  connected:        React.PropTypes.bool.isRequired,
  messages:         React.PropTypes.array.isRequired,
  presence:         React.PropTypes.array.isRequired,
  onSubmitMessage:  React.PropTypes.func.isRequired
};

export default ChatRoom;
