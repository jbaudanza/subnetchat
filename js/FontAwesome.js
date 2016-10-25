import React from 'react';
import {omit} from 'lodash';

function FontAwesome(props: Object): ReactElement {
  return <i
    {...omit(props, 'icon')}
    className={`fa fa-${props.icon}`}
  />;
}

export default FontAwesome;
