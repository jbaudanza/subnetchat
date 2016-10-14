"use strict";

require("babel-register")({
  presets: "es2015-node4",
  plugins: 'transform-flow-strip-types'
});

const Rx = require('rxjs');
const jindo = require('jindo/lib/server');
const database = require('jindo/lib/server/database');
const sessions = require('jindo/lib/server/presence').sessions;
require('jindo/lib/server/snapshotLatest');

const _ = require('lodash');
const channelName = require('./js/channelName').default;

function mapMetadataForServerEvents(list) {
  return Object.assign({}, list[0], list[1])
}



// Only pull an hours worth of process lifecycle events
const processFilter = {
  timestamp: {$gt: new Date(Date.now() - 60 * 60 * 1000)}
};

/*
   This is a list of all session ids that are currently online. It looks like:

    [sessionId, sessionId, sessionId, ...]
 */
const onlineSessions = sessions(
    database
        .observable('connection-events', {includeMetadata: true})
        .map(mapMetadataForServerEvents),
    database.observable('process-lifecycle', {includeMetadata: true, filters: processFilter})
        .map(mapMetadataForServerEvents)
);


// This is a set of any identity that has ever been seen.
/*
  This could be a behavior subject. How would new events be fed in?
    - A designated worker?
    - The server that receives the identity event will update the subject
  How do you stop from re-ingesting the same events?

  There's two strategies for reducing state.
   - generate on read
      - use a ReplaySubject and snapshotLatest()
      - Maybe snapshotLatest takes a subject or observer/observable pair
   - generate on write
      - use a BehaviorSubject and recalculate on write. (How to deal with write conflicts?)
   - consider how you would solve these problems in a traditional relational-db? how
     do those solutions map onto observable patterns?
*/
//const identities = database.observable('chat-identities')
//  .scan((set, event) => Object.assign(set, {[event.identityId]: event.identity}), {});


function reduceToPresenceList(sessionToIdentity, sessionIds) {
  return _.chain(sessionToIdentity)
    .pick(sessionIds)
    .values()
    .uniq()
    .value();
}


function addressForSocket(socket) {
  return (
    socket.upgradeReq.headers['x-forwarded-for'] ||
    socket.upgradeReq.connection.remoteAddress
  );
}

function mapMetadata(list) {
  const value = list[0];
  const meta = list[1];
  return Object.assign({}, value, {timestamp: meta.timestamp, id: meta.id});
}

function keyNameForSocket(prefix, socket) {
  return keyNameForIp(prefix, addressForSocket(socket))
}

function keyNameForIp(prefix, ipAddress) {
  return prefix + '-' + channelName(ipAddress);
}

const observables = {
  "chat-messages"(offset, socket) {
    const key = keyNameForSocket('chat-messages', socket);
    return database
      .observable(key, {offset, includeMetadata: true})
      .map(mapMetadata);
  },

  "presence"(offset, socket) {
    // TODO: This is rescanning all the events to look for join events. Is there
    // someway to embed this into the SQL query?
    const key = keyNameForSocket('chat-identities', socket);

    const sessionToIdentity = database.observable(key, {includeMetadata: true})
        .map(mapMetadataForServerEvents)
        .scan((set, event) => Object.assign(set, {[event.sessionId]: event.identityId}), {})

    return Rx.Observable.combineLatest(
      sessionToIdentity, onlineSessions, reduceToPresenceList
    );
  },

  "identities"(offset, socket) {
    const key = keyNameForSocket('chat-identities', socket);
    return database.observable(key)
      .scan((set, event) => Object.assign(set, {[event.identityId]: event.identity}), {});
  },

  "ip-address"(offset, socket) {
    return Rx.Observable.of(addressForSocket(socket));
  }
};

let limit;
if (process.env['NODE_ENV'] === 'production') {
  limit = 5;
} else {
  limit = 1000;
}

const windowSize = '10 seconds';

const handlers = {
  'chat-identities'(value, metadata) {
    const key = keyNameForIp('chat-identities', metadata.ipAddress);

    return database.throttled({ipAddress: metadata.ipAddress, key: key}, windowSize, limit,
        () => database.insertEvent(key, value, metadata)
    );
  },

  'chat-messages'(value, metadata) {
    const key = keyNameForIp('chat-messages', metadata.ipAddress);

    return database.throttled({ipAddress: metadata.ipAddress, key: key}, windowSize, limit,
        () => database.insertEvent(key, value, metadata)
    );
  }
};

const app = jindo.start(observables, handlers);

const browserifyOptions = {
  transform: [['babelify', {presets: ["react", 'es2015'], plugins: ['transform-flow-strip-types']}]],
  ignore: ["ws"] // TODO: This should really go in the jindo package somehow
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
