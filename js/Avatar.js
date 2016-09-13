import React from 'react';

function Avatar(props) {
  return (
    <div className='avatar' style={{backgroundColor: colors[props.colorIndex]}}>
      {icons[props.iconIndex]}
    </div>
  );
}

export const icons = [
  71,   // sunglasses
  73,   // eyes
  83,   // coffee
  87,   // panda
  109,  // skateboard
  110,  // pin
  121,  // rose
  114   // lightning
].map((charCode) => (
  <span className='avatar-icon'>{String.fromCharCode(charCode)}</span>
));


export const colors = [
  '#913CCD', // purple
  '#F05F74', // red
  '#F76E3C', // orange
  '#F7D842', // yellow
  '#2DA8C2', // light blue
  '#98CB4A', // green
  '#839098', // grey
  '#5481E6'  // dark-blue
];


export default Avatar;
