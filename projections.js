import Rx from 'rxjs';
import {flatten, mapValues, identity, uniq} from 'lodash';

import RedisDatabase from 'rxeventstore/redis';

const redis = new RedisDatabase(
    process.env['REDISCLOUD_URL'] ||
    process.env['REDIS_URL'] ||
    'redis://localhost/0'
);

const HEARTBEAT_INTERVAL_SECONDS = 15 * 60;
const EXPIRE_AFTER_SECONDS = 4 * HEARTBEAT_INTERVAL_SECONDS;

function earliestTimetamp() {
  return Date.now() - EXPIRE_AFTER_SECONDS * 1000;
}

const filters = {
  timestamp: {$gt: new Date(earliestTimetamp())}
};


function resumeChatIdentityEvents(driver, cursor) {
  return driver
      .observable('chat-identities', {
          cursor: cursor, includeMetadata: ['aggregateRoot', 'sessionId']
      })
      .map(function(batch) {
        const ops = [];

        batch.value.forEach(function(event) {
          const key = 'chat-identities:' + event.aggregateRoot;
          ops.push(
            [
              'hset',
              key,
              event.value.identityId,
              JSON.stringify(event.value.identity)
            ],
            [
              'hset',
              'identities-by-session:' + event.aggregateRoot,
              event.sessionId,
              event.value.identityId
            ]
          );
        });

        return {
          cursor: batch.cursor,
          value: ops
        };
      });
}


function resumeProcessEvents(driver, cursor) {
  return driver
    .observable('process-lifecycle', {
      cursor: cursor,
      includeMetadata: ['processId', 'timestamp'],
      filters: filters
    })
    .map(function(batch) {
      const ops = [];

      batch.value.forEach(function(event) {
        switch (event.value) {
          case 'startup':
          case 'heartbeat':
            ops.push(
              ['zadd', 'process-ids', event.timestamp.getTime(), event.processId],
              ['expire', keyForSessionsSet(event.processId), EXPIRE_AFTER_SECONDS]
            );
            break;
          case 'shutdown':
            ops.push(['zrem', 'process-ids', event.processId]);
            break;
        }
      });

      return {
        cursor: batch.cursor,
        value: ops
      };
    });
}

function keyForSessionsSet(processId) {
  return `process:${processId}:sessions`;
}

function resumeConnectionEvents(driver, cursor) {
  return driver
    .observable('connection-events', {
      cursor: cursor,
      includeMetadata: ['processId', 'sessionId'],
      filters: filters
    }).map(function(batch) {
      const ops = [];

      batch.value.forEach(function(event) {
        const key = keyForSessionsSet(event.processId);

        if (event.sessionId) {
          switch (event.value) {
            case 'connection-open':
              ops.push(
                  ['sadd', key, event.sessionId],
                  ['expire', key, EXPIRE_AFTER_SECONDS]
              );
              break;
            case 'connection-closed':
              ops.push(['srem', key, event.sessionId]);
              break;
          }
        }
      });

      return {
        cursor: batch.cursor,
        value: ops
      };
    });
}

export function run(driver, logger) {
  redis.runProjection('process-ids', resumeProcessEvents.bind(null, driver), logger);
  redis.runProjection('session-ids', resumeConnectionEvents.bind(null, driver), logger);
  redis.runProjection('chat-identities', resumeChatIdentityEvents.bind(null, driver), logger);
}


function getProcessesOnline() {
  return redis.clients.global.zrange('process-ids', 0, -1);
}


export const processesOnline = redis.channel('process-ids').switchMap(function() {
  redis.clients.global.zremrangebyscore('process-ids', '-inf', earliestTimetamp());
  return getProcessesOnline();
});


export const sessionsOnline = processesOnline.switchMap(function(processIds) {
  if (processIds.length > 0) {
    return Rx.Observable.combineLatest(
      processIds.map(function(processId) {
        const key = keyForSessionsSet(processId);
        return redis.channel(key).switchMap(() => redis.clients.global.smembers(key))
      })
    ).map(flatten)
  } else {
    return Rx.Observable.of([]);
  }
});


export function identitiesForChatRoom(channelName) {
  const key = 'chat-identities:' + channelName;
  return redis.channel(key).switchMap(function() {
    return redis.clients.global
        .hgetall(key)
        .then((obj) => mapValues(obj, JSON.parse));
  });
}

export function presenceForChatRoom(channelName) {
  const key = 'identities-by-session:' + channelName;

  return Rx.Observable.combineLatest(
    sessionsOnline,
    redis.channel(key),
    (sessionIds) => redis.clients.global.hmget(key, ...sessionIds)
  ).switchMap(identity).map(uniq);
}
