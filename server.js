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

const Rx = require('rxjs');
const jindo = require('jindo/lib/server');
const database = require('jindo/lib/server/database');
const sessions = require('jindo/lib/server/presence').sessions;
const _ = require('lodash');
const channelName = require('./js/channelName');

const onlineSessions = sessions(
    database.observable('connection-events'),
    database.observable('process-lifecycle')
);


const joinEvents = database.observable('chat-messages')
  .map((batch) => batch.filter((o) => o.type === 'chat-join'))
  .scan((list, item) => list.concat(item), [])


// TODO: This is rescanning all the events to look for join events. Is there
// someway to embed this into the SQL query?
const presence = Rx.Observable.combineLatest(joinEvents, onlineSessions, reduceToPresenceList);


function reduceToPresenceList(joinEvents, sessionIds) {
  return joinEvents
      .filter((e) => _.includes(sessionIds, e.sessionId))
      .map(e => e.name);
}



function addressForSocket(socket) {
  return (
    socket.upgradeReq.headers['x-forwarded-for'] ||
    socket.upgradeReq.connection.remoteAddress
  );
}

// TODO:
//  - rethink how bulk messages are sent
//  - Is is right to require that all events are Objects (not strings or numbers)
//  - Rethink the minId concept.
const observables = {
  "chat-messages"(minId) {
    return database.observable("chat-messages", minId);
  },

  // LEFT OFF HERE: This seems to work, but I don't think the session stream
  // is working properly.
  "presence"(minId) {
    return presence.map(value => [{value: value, id: minId + 1}]);
  },

  "channel-name"(minId) {
    return Rx.Observable.of([channelName])
  },

  "ip-address"(minId, socket) {
    return Rx.Observable.of([{
      id: minId + 1,
      ipAddress: addressForSocket(socket)
    }])
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
