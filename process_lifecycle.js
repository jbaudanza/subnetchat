import Rx from 'rxjs';
import {isEqual, omitBy, omit} from 'lodash';
import {batchedScan} from 'rxeventstore/lib/batches';

const logSubject = new Rx.Subject();

export const log = logSubject.asObservable();

const HEARTBEAT_INTERVAL = 15 * 60 * 1000;


const ticks = Rx.Observable
    .interval(HEARTBEAT_INTERVAL)
    .startWith(0)
    .map((x) => new Date());


function removeDeadProcesses(now, processes) {
  return omitBy(processes, (p) => (now - p.lastSeen) > HEARTBEAT_INTERVAL)
}

function reduceToServerList(processes, event) {
  if (!event.processId)
    return processes;

  function build(value) {
    const obj = {};
    if (obj.processId) {
      obj[event.processId] = Object.assign({}, obj.processId, value);
    } else {
      obj[event.processId] = value;
    }

    return Object.assign({}, processes, obj);
  }

  switch (event.value) {
    case 'startup':
      return build({startedAt: event.timestamp, lastSeen: event.timestamp});

    case 'heartbeat':
      return build({lastSeen: event.timestamp});

    case 'shutdown':
      return omit(processes, event.processId);

    default:
      return processes;
  }
}


export function processesOnline(processEvents) {
  // This is an observable set of processIds that are online
  return Rx.Observable.combineLatest(
    ticks,
    batchedScan.call(processEvents, reduceToServerList, {}),
    removeDeadProcesses
  ).map(Object.keys).distinctUntilChanged(isEqual);
}


export function startup(driver, key='process-lifecycle') {
  function insertEvent(value) {
    return driver.insertEvent(key, value);
  }

  insertEvent('startup');

  const intervalId = setInterval(
    () => insertEvent('heartbeat')
  , HEARTBEAT_INTERVAL);

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Only pull the most recent process lifecycle events
  const processFilter = {
    timestamp: {$gt: new Date(Date.now() - 4 * HEARTBEAT_INTERVAL)}
  };

  const processEvents = driver.observable(key, {includeMetadata: true, filters: processFilter})

  return processesOnline(processEvents);

  function cleanup() {
    logSubject.next("Cleaning up")

    clearInterval(intervalId);

    function exit() {
      logSubject.next('exiting');
      process.exit(0);
    }

    function exitWithError(error) {
      console.error(error);
      process.exit(1);
    }

    setTimeout(
      function() {
        logSubject.next("Cleanup timed out");
        process.exit(2);
      },
      15000
    )

    insertEvent('shutdown').then(exit, exitWithError);
  }
}
