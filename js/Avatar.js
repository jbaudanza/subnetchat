import React from 'react';


function Avatar(props) {
  const iconId = (props.iconId || iconIds[props.iconIndex]);
  return (
    <div className='avatar' style={{backgroundColor: colors[props.colorIndex]}}>
      <Icon iconId={iconId} color='white' />
    </div>
  );
}

// Props: {id, color}
export function Icon(props) {
  return (
    <svg width="31px" height="31px" version="1.1" style={{margin: 1}} fill={props.color} stroke={props.color}>
      <use xlinkHref={props.iconId} />
    </svg>
  );
}

export const iconIds = [
  '#poop',
  '#lego-man',
  '#apple',
  '#bear',
  '#guitar',
  '#bicycle',
  '#high-heel',
  '#coffee-cup'
];

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
