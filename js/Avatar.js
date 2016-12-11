import React from 'react';


function Avatar(props) {
  return (
    <div className='avatar' style={{backgroundColor: colors[props.colorIndex]}}>
      {React.cloneElement(icons[props.iconIndex], {fill: 'white'})}
    </div>
  );
}

const svgIds = [
  '#poop',
  '#lego-man',
  '#apple',
  '#bear',
  '#guitar',
  '#bicycle',
  '#top-hat',
  '#dumbbell',
  '#high-heel'
];

export const icons = svgIds.map((id) => (
  <svg width="35px" height="35px" version="1.1">
    <use xlinkHref={id} />
  </svg>
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
