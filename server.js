"use strict";

/*
 TODO:
   - fix names. Probably need to rename name to queue-name, stream-name, etc..
   - expose a stream of presence info
   - export an ip specific stream
 */

require("babel-register")({
  presets: "es2015-node4",
  plugins: 'transform-flow-strip-types'
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


const identityEvents = database.observable('chat-identities')
  .batchScan(reduceChatIdentities, {})

const identities = identityEvents.map(function(events) {
  return _.mapValues(events, (v) => v.identity);
});

// TODO: This is rescanning all the events to look for join events. Is there
// someway to embed this into the SQL query?
const presence = Rx.Observable.combineLatest(identityEvents, onlineSessions, reduceToPresenceList);

function reduceToPresenceList(identityEvents, sessionIds) {
  return _.values(identityEvents)
      .filter((e) => _.includes(sessionIds, e.sessionId))
      .map(e => e.identity);
}

function reduceChatIdentities(set, event) {
  return Object.assign({}, set, {[event.identityId]: event});
}

function addressForSocket(socket) {
  return (
    socket.upgradeReq.headers['x-forwarded-for'] ||
    socket.upgradeReq.connection.remoteAddress
  );
}

const observables = {
  "chat-messages"(minId) {
    // TODO: don't send down all the database metadata
    return database.observable("chat-messages", minId);
  },

  // TODO: I don't think this is going to restart correctly.
  "presence"() {
    return presence;
  },

  "identities"() {
    return identities;
  },

  "ip-address"(minId, socket) {
    let count = 0;
    return Rx.Observable.of({
      id: minId + ++count,
      ipAddress: addressForSocket(socket)
    });
  }
}

const app = jindo.start(observables);

const browserifyOptions = {
  transform: [['babelify', {presets: ["react", 'es2015'], plugins: ['transform-flow-strip-types']}]]
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
const bourbon = require('node-bourbon');

app.get('/style.css', function(req, res) {
  sass.render({
    file: 'style.scss',
    includePaths: bourbon.includePaths
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
