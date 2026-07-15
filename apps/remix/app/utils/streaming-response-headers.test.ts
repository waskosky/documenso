import assert from 'node:assert/strict';

import { ensureNoTransformCacheControl } from './streaming-response-headers';

const emptyHeaders = new Headers();
ensureNoTransformCacheControl(emptyHeaders);
assert.equal(emptyHeaders.get('Cache-Control'), 'no-transform');

const protectedHeaders = new Headers({
  'Cache-Control': 'private, no-cache',
});
ensureNoTransformCacheControl(protectedHeaders);
assert.equal(protectedHeaders.get('Cache-Control'), 'private, no-cache, no-transform');

const existingDirectiveHeaders = new Headers({
  'Cache-Control': 'private, NO-TRANSFORM',
});
ensureNoTransformCacheControl(existingDirectiveHeaders);
ensureNoTransformCacheControl(existingDirectiveHeaders);
assert.equal(existingDirectiveHeaders.get('Cache-Control'), 'private, NO-TRANSFORM');
