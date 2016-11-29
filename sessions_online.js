import Rx from 'rxjs';
import {assign, omit, includes, pickBy} from 'lodash';

import {batchedScan} from 'rxeventstore/lib/batches';


// Reduces to a Object that looks like:
/*
  {
    [sessionId]: {
      processId: [processId]
    },
    ...
  }
*/
function reduceToSessionList(sessions, event) {
  switch (event.value) {
    case 'connection-open':
      const obj = {};
      obj[event.sessionId] = {processId: event.processId};
      return assign({}, sessions, obj);

    case 'connection-closed':
      return omit(sessions, event.sessionId);
  }

  return sessions;
}


function removeOfflineSessions(allSessions, processIds) {
  return Object.keys(pickBy(
      allSessions, (props, sessionId) => includes(processIds, props.processId)
  ));
}


// Returns an observable of session ids that are currently online.
export function sessionsOnline(connectionEvents, processesOnline) {
  const allSessions = batchedScan.call(connectionEvents, reduceToSessionList, {});

  return Rx.Observable.combineLatest(
    [allSessions, processesOnline], removeOfflineSessions
  );
}
