import React from 'react';
import classNames from 'classnames';

import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import FontAwesome from './FontAwesome';
import Avatar from './Avatar';
import Link from './Link';
import bindComponentToInterval from './bindComponentToInterval';
import InlineEdit from 'react-edit-inline';


function ChatNavItem(props) {
  return (
    <li>
      <Avatar iconIndex={props.iconIndex} colorIndex={props.colorIndex} />
      {
        props.isCurrentUser ? (
          <InlineEdit
            text={props.name}
            change={(e) => props.setName(e.name)}
            paramName="name"
          />
        ) : (
          <span>{props.name}</span>
        )
      }
    </li>
  );
}


function ChatNav(props) {
  const style = Object.assign({padding: 0, margin: 0}, props.style);
  return (
    <ul className='chat-nav' style={style}>
      {props.presence.map((identity, i) => (
        <ChatNavItem
            key={i}
            setName={props.setName}
            isCurrentUser={props.currentIdentityId === identity.identityId}
            {...identity}  />
      ))}
    </ul>
  );
}


function durationString(duration) {
  let hours, minutes, seconds;

  if (duration > 0) {
    hours = Math.floor(duration/(60 * 60));
    minutes = Math.floor(duration/60) % 60;
    seconds = Math.floor(duration % 60);
  } else {
    hours = minutes = seconds = 0;
  }

  function pad(number) {
    if (number < 10)
      return `0${number}`;
    else
      return number;
  }

  if (hours > 0)
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  else if (minutes > 0)
    return `${minutes}:${pad(seconds)}`;
  else
    return `${seconds}`;
}



function Disconnected(props) {
  const seconds = Math.floor((props.reconnectingAt - props.now) /1000);

  function onClick(event) {
    event.preventDefault();
    if (props.onReconnect) {
      props.onReconnect();
    }
  }

  if (props.connectionState === 'disconnected') {
    return (
      <div className='disconnected-message'>
        You are disconnected. Reconnecting in {durationString(seconds)}. <a href="#" onClick={onClick}>Try now.</a>
      </div>
    );
  }

  if (props.connectionState === 'connecting') {
    return (
        <div className='disconnected-message'>
          Connecting...
        </div>
    );
  }

  return <div className='disconnected-message'></div>;
}


class ChatRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentWillMount() {
    this.MessageList = bindComponentToInterval(MessageList, 30000);
    this.Disconnected = bindComponentToInterval(Disconnected, 1000);
  }

  render() {
    let disconnectedOverlay;
    if (!this.props.connected) {
      disconnectedOverlay = <this.Disconnected
            reconnectingAt={this.props.reconnectingAt}
            onReconnect={this.props.onReconnect}
            connectionState={this.props.connectionState} />;
    }

    const style = {
      wrapper: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      },
      gridContainer: {
        overflow: 'hidden',
        flex: 1,
        display: 'flex'
      },
      leftColumn: {
        width: '20%',
        boxSizing: 'border-box',
        float: 'left',
        display: 'flex',
        flexDirection: 'column'
      },
      rightColumn: {
        width: '80%',
        boxSizing: 'border-box',
        float: 'left',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      },
      pageWrapper: {
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column'
      }
    };

    const messages = this.props.messages.map((source) => (
      {
        avatar: <Avatar {...source.identity} />,
        id: source.id,
        name: source.identity.name,
        body: source.body,
        timestamp: source.timestamp
      })
    );

    const avatar = <Avatar {...this.props.identity} />;

    return (
      <div
          style={style.pageWrapper}
          className={classNames('page-wrapper', {disconnected: !this.props.connected})}>
        {disconnectedOverlay}
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
              <FontAwesome icon='map-marker' /> {this.props.channelLocation}
            </span>
            <Link className='change-room-button' onClick={this.props.onChangeRoom}>
              Change room
            </Link>
          </div>
        </div>
        <div className='chat-room' style={style.gridContainer}>
          <div style={style.leftColumn}>
            <ChatNav presence={this.props.presence}
                currentIdentityId={this.props.identity.identityId}
                setName={this.props.setName}
                style={{flex: 1}} />
            <div style={{height: '57px', textAlign: 'center'}}>
              <Link className='change-name-button' onClick={this.props.onChangeName}>
                Change your name
              </Link>
            </div>
          </div>
          <div style={style.rightColumn}>
            <this.MessageList messages={messages} />
            <MessageComposer onSubmit={this.props.onSubmitMessage} avatar={avatar} />
          </div>
        </div>
      </div>
    );
  }
}

ChatRoom.propTypes = {
  connected:        React.PropTypes.bool.isRequired,
  connectionState:  React.PropTypes.string.isRequired,
  messages:         React.PropTypes.array.isRequired,
  presence:         React.PropTypes.array.isRequired,
  onReconnect:      React.PropTypes.func.isRequired,
  onSubmitMessage:  React.PropTypes.func.isRequired,
  onChangeName:     React.PropTypes.func.isRequired,
  onChangeRoom:     React.PropTypes.func.isRequired
};

export default ChatRoom;
