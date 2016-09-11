import React from 'react';

import ChatMessage from './ChatMessage';

export default class MessageList extends React.Component {
  componentDidMount() {
    this.scrollToBottom();
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

  render() {
    const style = {
      overflowY: 'auto',
      margin: 0,
      flex: 1,
      border: '1px solid #eee',
      padding: '5px'
    };

    const borderBottom = {borderBottom: '1px solid #eee'};

    return (
      <ul style={style} ref='messageList'>
        {
          this.props.messages.map((e, i) => (
            <ChatMessage
                key={e.id}
                style={i === (this.props.messages.length - 1) ? {} : borderBottom}
                now={this.props.now}
                {...e} />
          ))
        }
      </ul>
    );
  }
}

MessageList.propTypes = {
  messages: React.PropTypes.array.isRequired,
  now:      React.PropTypes.instanceOf(Date).isRequired
};
