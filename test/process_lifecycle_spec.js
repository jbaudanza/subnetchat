import Rx from 'rxjs';
import assert from 'assert';
import {sortBy} from 'lodash';

import {processesOnline} from '../process_lifecycle';

function minutesAgo(n) {
  return new Date(Date.now() - n * 60 * 1000);
}

describe('process_lifecycle', () => {
  it('should work', () => {
    const events = [
      // Process 1 starts up and shuts down
      {
        value: 'startup',
        timestamp: minutesAgo(10),
        processId: 1,
      },
      {
        value: 'shutdown',
        timestamp: minutesAgo(5),
        processId: 1,
      },

      // Process 2 starts up and stays online
      {
        value: 'startup',
        timestamp: minutesAgo(11),
        processId: 2,
      },

      // Process 3 starts up but then times out
      {
        value: 'startup',
        timestamp: minutesAgo(60),
        processId: 3,
      }
    ];

    return processesOnline(Rx.Observable.of(sortBy(events, e => e.timestamp)))
        .take(1)
        .forEach(function(results) {
          assert.deepEqual(results, [2])
        });
  })
});
