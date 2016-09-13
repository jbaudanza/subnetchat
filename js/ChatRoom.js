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


function Avatar(props) {
  const icons = [
    71,   // sunglasses
    73,   // eyes
    83,   // coffee
    87,   // panda
    109,  // skateboard
    110,  // pin
    121,  // rose
    114   // lightning
  ];

  const colors = [
    '#913CCD', // purple
    '#F05F74', // red
    '#F76E3C', // orange
    '#F7D842', // yellow
    '#2DA8C2', // light blue
    '#98CB4A', // green
    '#839098', // grey
    '#5481E6'  // dark-blue
  ];

  return (
    <div className='avatar' style={{backgroundColor: colors[props.colorIndex]}}>
      {String.fromCharCode(icons[props.iconIndex])}
    </div>
  )
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
        boxSizing: 'border-box',
        float: 'left',
        height: '100%'
      },
      rightColumn: {
        width: '80%',
        boxSizing: 'border-box',
        float: 'left',
        height: '100%',
        position: 'relative'
      }
    };

    return (
      <div>
        <header>
          <a href="https://www.subnetchat.com/" className='logo'>
            subnetchat.com
          </a>
          <span className='tag-line'>
            A private chatroom for your office, school, or local subnet.
          </span>
        </header>
        <div className='channel-header'>
          <div style={style.leftColumn}>
            <span className='chatting-with'>You are chatting with</span>
            <span className='channel-name'>
              {this.props.channelName}
            </span>
          </div>
          <div style={Object.assign({paddingLeft: '5px'}, style.rightColumn)}>
            <span className='channel-description'>
              {this.props.channelDescription}
            </span>
            <span className='channel-location'>
              <i className="fa fa-map-marker" /> {this.props.channelLocation}
            </span>
          </div>
        </div>
        <div className='chat-room' style={{overflow: 'hidden'}}>
          <div style={style.leftColumn}>
            <div style={style.wrapper}>
              <ChatNav presence={this.props.presence} style={{display: 'flex', flex: 1}}/>
              <div style={{display: 'flex', height: '57px'}}>
                <a href="#" className='change-name-button'>
                  Change your name or avatar
                </a>
              </div>
            </div>
          </div>
          <div style={style.rightColumn}>
            <div style={style.wrapper}>
              <this.MessageList messages={this.props.messages} />
              <MessageComposer onSubmit={this.props.onSubmitMessage} avatar={<Avatar iconIndex={2} colorIndex={3} />} />
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
