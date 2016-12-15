"use strict";

require("babel-register")({
  presets: "es2015-node4",
  plugins: 'transform-flow-strip-types'
});

const Rx = require('rxjs');
const express = require('express');
const _ = require('lodash');

const PgDatabase = require('rxeventstore/pg');
const {batchedScan} = require('rxeventstore/lib/batches');

const {sessionsOnline} = require('./sessions_online');
const processLifecycle = require('./process_lifecycle');

const ObservablesServer = require('rxremote/observables_server');
const PublishingServer = require('rxremote/lib/publishing_server').default;

const channelName = require('./js/channelName').default;

const database = new PgDatabase(
  process.env['DATABASE_URL'] || "postgres://localhost/subnetchat_development"
);

const loggerSubject = new Rx.Subject();

const projections = require('./projections');
projections.run(database, loggerSubject);


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
    const aggregateRoot = channelName(addressForSocket(socket));

    return database
      .observable('chat-messages', {
        cursor: cursor,
        includeMetadata: ['timestamp', 'id'],
        filters: {aggregateRoot}
    });
  },

  "presence"(cursor, socket) {
    const aggregateRoot = channelName(addressForSocket(socket));

    return projections
        .presenceForChatRoom(aggregateRoot)
        .map(value => ({cursor: 0, value: value}))
  },

  "identities"(cursor, socket) {
    return projections
        .identitiesForChatRoom(channelName(addressForSocket(socket)))
        .map(value => ({cursor: 0, value: value}));
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
    const aggregateRoot = channelName(metadata.ipAddress);

    metadata = Object.assign({}, metadata, {aggregateRoot});
    const key = 'chat-identities';

    return database.throttled({ipAddress: metadata.ipAddress, key: key}, windowSize, limit,
        () => database.insertEvent(key, value, metadata)
    );
  },

  'chat-messages'(value, metadata) {
    const aggregateRoot = channelName(metadata.ipAddress);

    metadata = Object.assign({}, metadata, {aggregateRoot});
    const key = 'chat-messages';

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

loggerSubject.subscribe(logger);
processLifecycle.log.subscribe(logger);


processLifecycle.startup(database);


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

