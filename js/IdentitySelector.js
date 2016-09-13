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
        <h2>Change your name, icon or color</h2>

        <div className='row'>
          <Avatar iconIndex={this.state.iconIndex} colorIndex={this.state.colorIndex} />
          <input type="text" value={this.state.name} onChange={this.onChangeName} />
        </div>

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

        <Link onClick={this.props.onClose}>Nevermind</Link>

        <input type="submit" />
      </form>
    );
  }
}

export default IdentitySelector;
