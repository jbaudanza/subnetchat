import React from 'react'
import distanceOfTimeInWords from './distanceOfTimeInWords'
import linkify from 'linkify';


class Linkify extends React.Component {
  render() {
    const parts = linkify(this.props.text).map(function([text, href], i) {
      if (href)
        return <a href={href} key={i}>{text}</a>
      else
        return <span key={i}>{text}</span>
    });

    return <div className={this.props.className}>{parts}</div>;
  }
}

Linkify.propTypes = {
  text:      React.PropTypes.string.isRequired,
  className: React.PropTypes.string
};



class ChatMessage extends React.Component {
  render() {
    const styles = {
      row: {
        display: 'flex',
        padding: 0,
        margin: 0,
        borderBottom: '1px solid #ccc',
        marginTop: 5,
        paddingBottom: 5,
        listStyleType: 'none'
      },
      avatar: {
        width: 35,
        height: 35,
        marginRight: 5
      },
      timestamp: {
        color: '#ccc',
        float: 'right'
      }
    };

    return (
      <li style={styles.row}>
        <img className="avatar" style={styles.avatar} src='' />
        <div style={{flex: 1}}>
          <div className="header">
            <b>{this.props.name}</b>
            <span className="timestamp" style={styles.timestamp}>
              {distanceOfTimeInWords(this.props.now - new Date(this.props.timestamp))}
            </span>
          </div>
          <Linkify className="body" text={this.props.body} />
        </div>
      </li>
    );
  }
}

ChatMessage.propTypes = {
  timestamp: React.PropTypes.number.isRequired,
  body:      React.PropTypes.string.isRequired,
  name:      React.PropTypes.string.isRequired
};

export default ChatMessage;