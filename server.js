"use strict";

require("babel-register")({
  presets: "es2015-node4",
  plugins: 'transform-flow-strip-types'
});

const Rx = require('rxjs');
const express = require('express');
const _ = require('lodash');

const PgDatabase = require('rxeventstore/lib/database/pg').default;
const processId = require('rxeventstore/lib/processId');
const batchedScan = require('rxeventstore/lib/batches');

const sessions = require('jindo/lib/server/presence').sessions;
const processLifecycle = require('jindo/lib/server/process_lifecycle');

const ObservablesServer = require('rxremote/observables_server');
const PublishingServer = require('rxremote/lib/publishing_server').default;

const channelName = require('./js/channelName').default;

const database = new PgDatabase(
  process.env['DATABASE_URL'] || "postgres://localhost/observables_development"
);

// Only pull an hours worth of process lifecycle events
const processFilter = {
  timestamp: {$gt: new Date(Date.now() - 60 * 60 * 1000)}
};

/*
   This is a list of all session ids that are currently online. It looks like:

    [sessionId, sessionId, sessionId, ...]
 */

const onlineSessions = sessions(
    database.observable('connection-events', {includeMetadata: true}),
    database.observable('process-lifecycle', {includeMetadata: true, filters: processFilter})
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

function keyNameForSocket(prefix, socket) {
  return keyNameForIp(prefix, addressForSocket(socket))
}

function keyNameForIp(prefix, ipAddress) {
  return prefix + '-' + channelName(ipAddress);
}

const observables = {
  "chat-messages"(cursor, socket) {
    const key = keyNameForSocket('chat-messages', socket);

    return database
      .observable(key, {cursor, includeMetadata: ['timestamp', 'id']});
  },

  "presence"(cursor, socket) {
    // TODO: This is rescanning all the events to look for join events. Is there
    // someway to embed this into the SQL query?
    const key = keyNameForSocket('chat-identities', socket);

    const identityEvents = database.observable(key, {includeMetadata: ['sessionId']});

    const sessionToIdentity = batchedScan.call(
          identityEvents,
          (set, event) => Object.assign(set, {[event.sessionId]: event.value.identityId}),
          {}
    );

    return Rx.Observable.combineLatest(
      sessionToIdentity, onlineSessions, reduceToPresenceList
    ).map(value => ({cursor: 0, value: value}));
  },

  "identities"(cursor, socket) {
    const key = keyNameForSocket('chat-identities', socket);
    const observable = database.observable(key);

    return batchedScan.call(observable,
      (set, event) => Object.assign(set, {[event.identityId]: event.identity}), {}
    ).map(value => ({cursor: 0, value: value}));
  },

  "ip-address"(cursor, socket) {
    return Rx.Observable.of(addressForSocket(socket))
        .concat(Rx.Observable.never())
        .map(value => ({cursor: 0, value: value}))
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

const app = express();
app.enable('trust proxy');
app.use(PublishingServer(handlers, process.env['SECRET']));

const server = app.listen((process.env['PORT'] || 5000), function() {
  console.log("HTTP server listening to", server.address().port);
});

function logger(message) {
  console.log(new Date().toISOString(), message);
}

processLifecycle.log.subscribe(logger);

logger('processId: ' + processId);
processLifecycle.startup((event) => (
  database.insertEvent('process-lifecycle', event)
));


const observablesServer = new ObservablesServer(server, observables);
observablesServer.log.subscribe(logger);
observablesServer.events.subscribe(function([event, meta]) {
  database.insertEvent('connection-events', event, meta);
});


const browserifyOptions = {
  transform: [['babelify', {presets: ["react", 'es2015'], plugins: ['transform-flow-strip-types']}]]
};

if (app.settings.env === 'development') {
  const browserify = require('browserify-middleware');
  app.get('/chat.js', browserify('./js/index.js', browserifyOptions));
  app.get('/style.css', require('./stylesheet').serve);
}

let logFormat;
if (process.env['NODE_ENV'] !== 'production') {
  logFormat = 'dev';
} else {
  logFormat = 'short';
}


app.use(require('morgan')(logFormat));

app.use(express.static('public'));

