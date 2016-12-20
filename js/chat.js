import React from 'react';
import ReactDOM from 'react-dom';
import ChatApp from './ChatApp';

window.main = function(el) {
  ReactDOM.render(<ChatApp />, el);
}

