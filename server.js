"use strict";

/*
 TODO:
   - fix names. Probably need to rename name to queue-name, stream-name, etc..
   - expose a stream of presence info
   - export an ip specific stream
 */

require("babel-register")({
  presets: "es2015-node4"
});

const jindo = require('jindo/lib/server');
const database = require('jindo/lib/server/database');

const observables = {
  "chat-messages": function(minId, socket) {
    return database.streamEvents(minId, "chat-messages");
  }
}

const app = jindo.start(observables);

const browserifyOptions = {
  transform: [['babelify', {presets: ["react", 'es2015']}]]
};

if (app.settings.env === 'development') {
  const browserify = require('browserify-middleware');
  app.get('/chat.js', browserify('./js/index.js', browserifyOptions));
}


let logFormat;
if (process.env['NODE_ENV'] !== 'production') {
  require('dotenv').config();
  logFormat = 'dev';
} else {
  logFormat = 'short';
}


app.use(require('morgan')(logFormat));

const express = require('express');
app.use(express.static('public'));

const sass = require('node-sass');

app.get('/style.css', function(req, res) {
  sass.render({
    file: 'style.scss',
  }, function(err, result) {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Service Error")
    } else {
      res.setHeader('Content-Type', 'text/css');
      res.send(result.css);
    }
  });
});
