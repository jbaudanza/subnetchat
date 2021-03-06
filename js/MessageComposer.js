import React from 'react';


class MessageComposer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {message: ''};
    this.onSubmit = this.onSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  onSubmit(event) {
    event.preventDefault();

    if (this.isEnabled()) {
      this.props.onSubmit(this.state.message);
      this.setState({message: ''});
    }
  }

  onChange(event) {
    this.setState({message: event.target.value.slice(0, 256)});
  }

  isEnabled() {
    return !!this.state.message.trim();
  }

  render() {
    const styles = {
      wrapper: {
        display: 'flex',
        padding: '5px'
      },
      input: {
        display: 'block',
        width: '100%',
        boxSizing: 'border-box'
      },
      sendButton: {
        'float': 'right'
      },
      form: {
        flex: '1',
        marginLeft: '5px'
      }
    };

    return (
      <div style={styles.wrapper} className='message-composer'>
        {this.props.avatar}
        <form style={styles.form} onSubmit={this.onSubmit}>
          <input style={styles.input} type="text" onChange={this.onChange} value={this.state.message} />
          <input style={styles.sendButton} type="submit" value="send" disabled={!this.isEnabled()} />
        </form>
      </div>
    );
  }
}

export default MessageComposer;

