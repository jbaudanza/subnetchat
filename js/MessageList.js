import React from 'react';
import ReactDOM from 'react-dom';

import ChatMessage from './ChatMessage';

export default class MessageList extends React.Component {
  constructor() {
    super();
    this.state = {autoScroll: true};
    this.onScroll = this.onScroll.bind(this);
  }

  componentDidMount() {
    this.scrollToBottom();
  }

  onScroll(event) {
    const ul = event.target;
    this.setState({
      autoScroll: (ul.clientHeight + ul.scrollTop + 100 >= ul.scrollHeight)
    });
  }

  componentDidUpdate(prevProps: Object, prevState: Object) {
    if (this.state.autoScroll && this.props.messages.length !== prevProps.messages.length) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    const ul = ReactDOM.findDOMNode(this);
    ul.scrollTop = ul.scrollHeight - ul.clientHeight;
  }

  render() {
    const style = {
      overflowY: 'auto',
      margin: 0,
      flex: 1,
      border: '1px solid #eee',
      borderTop: 'none',
      padding: '5px'
    };

    const borderBottom = {borderBottom: '1px solid #eee'};

    return (
      <ul style={style} onScroll={this.onScroll}>
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
