import assert from 'node:assert/strict';

import {
  formatAuthorizationDate,
  formatAuthorizationDateTime,
} from './authorization-date-format';

const isoDate = '2026-07-10T00:00:00.000Z';
const isoDateTime = '2026-07-10T09:27:15.805Z';

assert.equal(formatAuthorizationDate(isoDate), 'Jul 10, 2026');
assert.equal(formatAuthorizationDateTime(isoDateTime), 'Jul 10, 2026, 9:27 AM UTC');

assert.equal(formatAuthorizationDate(isoDate), 'Jul 10, 2026');
assert.equal(formatAuthorizationDateTime(isoDateTime), 'Jul 10, 2026, 9:27 AM UTC');
assert.equal(formatAuthorizationDate(null), null);
assert.equal(formatAuthorizationDateTime(undefined), null);

console.log('authorization date formatter tests passed');
