import Rx from 'rxjs';
import {flatten, mapValues, identity, uniq, countBy, forEach, groupBy, get} from 'lodash';

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
            );
            ops.push(...cmdsToExpireProcess(event.processId));
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

function cmdsToExpireProcess(processId) {
  const prefix = `process:${processId}`;
  return [
    ['expire', prefix + ":sessions", EXPIRE_AFTER_SECONDS],
    ['expire', prefix + ":sessions-ip", EXPIRE_AFTER_SECONDS],
    ['expire', prefix + ":sessions-timestamps", EXPIRE_AFTER_SECONDS],
  ];
}

function resumeConnectionEvents(driver, cursor) {
  return driver
    .observable('connection-events', {
      cursor: cursor,
      includeMetadata: ['processId', 'sessionId', 'timestamp', 'ipAddress'],
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
                  ['hsetnx', `process:${event.processId}:sessions-timestamp`, event.sessionId, event.timestamp.getTime()],
                  ['hset', `process:${event.processId}:sessions-ip`, event.sessionId, event.ipAddress],
              );
              ops.push(...cmdsToExpireProcess(event.processId));
              break;
            case 'connection-closed':
              ops.push(
                ['srem', key, event.sessionId],
                ['hdel', `process:${event.processId}:sessions-timestamp`, event.sessionId],
                ['hdel', `process:${event.processId}:sessions-ip`, event.sessionId]
              );
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

function resumeChannelStatsByIdentities(driver, cursor) {
  return driver.observable('chat-identities', {cursor: cursor, includeMetadata: ['aggregateRoot', 'timestamp']})
      .map(function(batch) {
        const ops = [];

        forEach(groupBy(batch.value, 'aggregateRoot'), function(events, key) {
          ops.push(['hsetnx', 'channel-created-at', key, events[0].timestamp.getTime()]);
        });

        return {
          cursor: batch.cursor,
          value: ops
        };
      });
}

function resumeChannelStatsByMessages(driver, cursor) {
  return driver.observable('chat-messages', {cursor: cursor, includeMetadata: 'aggregateRoot'})
      .map(function(batch) {
        const ops = [];

        forEach(countBy(batch.value, 'aggregateRoot'), function(count, key) {
          ops.push(['hincrby', 'chat-message-counts', key, count]);
          ops.push(['sadd', 'channel-names', key]);
        });

        batch.value.forEach(function(event) {
          ops.push(['hset', 'last-message', event.aggregateRoot, JSON.stringify(event)]);
          ops.push(['hset', 'last-message-at', event.aggregateRoot, event.timestamp.getTime()]);
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
  redis.runProjection('channel-stats-by-messages', resumeChannelStatsByMessages.bind(null, driver), logger);
  redis.runProjection('channel-stats-by-identities', resumeChannelStatsByIdentities.bind(null, driver), logger);
}


function getProcessesOnline() {
  return redis.client.zrange('process-ids', 0, -1);
}


export const processesOnline = redis.notifier.channel('process-ids').switchMap(function() {
  redis.client.zremrangebyscore('process-ids', '-inf', earliestTimetamp());
  return getProcessesOnline();
});

export const sessionStats = processesOnline.switchMap(function(processIds) {
  if (processIds.length > 0) {
    return Rx.Observable.combineLatest(
      processIds.map(function(processId) {
        const keyPrefix = `process:${processId}`;

        return redis.notifier.channel(keyPrefix + ':sessions').switchMap(function() {
          return Promise.all([
            redis.client.smembers(keyPrefix + ':sessions'),
            redis.client.hgetall(keyPrefix + ':sessions-ip'),
            redis.client.hgetall(keyPrefix + ':sessions-timestamp')
          ]).then((results) => (
            results[0].map((sessionId) => ({
              sessionId: sessionId,
              ipAddress: results[1][sessionId],
              timestamp: parseInt(results[2][sessionId])
            }))
          ))
        })
      })
    ).map(flatten)
  } else {
    return Rx.Observable.of([]);
  }
});

export const sessionsOnline = sessionStats.map((list) => list.map(o => o.sessionId));

export function identitiesForChatRoom(channelName) {
  const key = 'chat-identities:' + channelName;
  return redis.notifier.channel(key).switchMap(function() {
    return redis.client
        .hgetall(key)
        .then((obj) => mapValues(obj, JSON.parse));
  });
}

export function presenceForChatRoom(channelName) {
  const key = 'identities-by-session:' + channelName;

  return Rx.Observable.combineLatest(
    sessionsOnline,
    redis.notifier.channel(key),
    function(sessionIds) {
      if (sessionIds.length === 0) {
        return [];
      } else {
        return redis.client.hmget(key, ...sessionIds);
      }
    }
  ).switchMap(identity).map(uniq);
}

export const channelStats = Rx.Observable.merge(
  redis.notifier.channel('chat-message-counts'),
  redis.notifier.channel('channel-created-at')
).switchMap(() => {
  return Promise.all([
    redis.client.smembers('channel-names'),
    redis.client.hgetall('chat-message-counts'),
    redis.client.hgetall('channel-created-at'),
    redis.client.hgetall('chat-message-counts'),
    redis.client.hgetall('last-message'),
    redis.client.hgetall('last-message-at')
  ]).then((results) => (
    results[0].map((channelName) => ({
      name: channelName,
      count: results[1][channelName],
      createdAt: parseInt(results[2][channelName]),
      messageCount: results[3][channelName],
      lastMessage: get(JSON.parse(results[4][channelName]), 'value.body'),
      lastMessageAt: parseInt(results[5][channelName])
    }))
  ))
});
