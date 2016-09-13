import React from 'react';
import {bindAll} from 'lodash';

import Avatar from './Avatar';
import {icons, colors} from './Avatar';
import Link from './Link';


function BoxPicker(props) {
  let className = 'box-picker';
  if (props.className)
    className += ' ' + props.className;

  return (
    <div className={className}>
    {
      React.Children.map(props.children, (child, i) => (
        <Link key={i}
           className={(i === props.selectedIndex ? ' active' : null)}
           onClick={props.onChange.bind(null, i)}>
              {child}
        </Link>
      ))
    }
    </div>
  );
}


class IdentitySelector extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      colorIndex: props.colorIndex,
      iconIndex: props.iconIndex,
      name: props.name
    };

    bindAll(this,
        'setColorIndex',
        'setIconIndex',
        'onChangeName',
        'onSubmit',
    );
  }

  setColorIndex(index) {
    this.setState({colorIndex: index})
  }

  setIconIndex(index) {
    this.setState({iconIndex: index})
  }

  onChangeName(event) {
    this.setState({name: event.target.value})
  }

  onSubmit(event) {
    event.preventDefault();
    this.props.onSubmit(this.state);
  }

  render() {
    return (
      <form onSubmit={this.onSubmit} className='identity-selector'>
        <label htmlFor='change-name'>Your name</label>
        <input id='change-name' type="text" value={this.state.name} onChange={this.onChangeName} />

        <label htmlFor='change-avatar'>Your avatar</label>
        <div className='picker-wrapper' id='change-avatar'>
          <Avatar iconIndex={this.state.iconIndex} colorIndex={this.state.colorIndex} />
          <div className='options'>
            <BoxPicker selectedIndex={this.state.colorIndex} onChange={this.setColorIndex}>
            {
              colors.map((color, i) => (
                <div key={i} style={{backgroundColor: color, height: '100%', width: '100%'}}>
                </div>
              ))
            }
            </BoxPicker>

            <BoxPicker className='icon-picker' selectedIndex={this.state.iconIndex} onChange={this.setIconIndex}>
              {icons.map((icon, i) => React.cloneElement(icon, {key: i}))}
            </BoxPicker>
          </div>

        </div>

        <div className='actions'>
          <Link onClick={this.props.onClose}>Nevermind</Link>

          <input type="submit" />
        </div>
      </form>
    );
  }
}

export default IdentitySelector;
