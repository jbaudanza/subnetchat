import React from 'react';
import _ from 'lodash';

function FontAwesome(props: Object): ReactElement {
  return <i
    {..._(props).omit('icon')}
    className={`fa fa-${props.icon}`}
  />;
}

export default FontAwesome;
