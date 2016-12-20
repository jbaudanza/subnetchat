import React from 'react';
import ReactDOM from 'react-dom';
import AdminApp from './AdminApp';

window.main = function(el) {
  ReactDOM.render(<AdminApp />, el);
}

