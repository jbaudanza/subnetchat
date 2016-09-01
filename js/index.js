require('whatwg-fetch');

import React from 'react';
import ReactDOM from 'react-dom';
import ChatApp from './ChatApp';
import * as jindo from 'jindo/lib/client';

window.main = function(el) {
  ReactDOM.render(<ChatApp jindo={jindo} />, el);
}

