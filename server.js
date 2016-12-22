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


// TODO: This same function exists in RxRemote. Should we DRY this up somehow?
function addressForSocket(socket) {
  return (
    socket.upgradeReq.headers['x-forwarded-for'] ||
    socket.upgradeReq.connection.remoteAddress
  ).split(',')[0];
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
  },

  "channel-stats"(cursor, socket) {
    return projections.channelStats
        .map(value => ({cursor: 0, value: value}));
  },

  "session-stats"(cursor, socket) {
    return projections.sessionStats
        .map(value => ({cursor: 0, value: value}));
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

  // This is a bit of a hack to keep the postgres database from filling up with
  // connection events that we don't need. A better solution would be to store
  // these events in kafka or a flat file or something cheaper.
  database.pool.query(
    "DELETE FROM events WHERE key='connection-events' AND timestamp < (NOW() AT TIME ZONE 'utc' - INTERVAL '1 hour')"
  );
});



if (app.settings.env === 'development') {
  const webpack = require('webpack');
  const compiler = webpack(require('./webpack.config'));

  compiler.watch({}, (err, stats) => {
    if (err) {
      console.error(err);
    } else {
      console.log(stats.toString('minimal'));
    }
  });

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

