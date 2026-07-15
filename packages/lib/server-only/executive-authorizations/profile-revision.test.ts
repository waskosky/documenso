import assert from 'node:assert/strict';

import { buildAuthorizationProfileRevision } from './profile-revision';

const profile = {
  id: 'profile_example',
  templateVersion: 2,
  updatedAt: new Date('2026-07-15T20:00:00.000Z'),
};
const revision = buildAuthorizationProfileRevision(profile);

assert.match(revision, /^[a-f0-9]{64}$/);
assert.equal(buildAuthorizationProfileRevision({ ...profile }), revision);
assert.notEqual(
  buildAuthorizationProfileRevision({ ...profile, updatedAt: new Date('2026-07-15T20:01:00.000Z') }),
  revision,
);
assert.notEqual(buildAuthorizationProfileRevision({ ...profile, templateVersion: 3 }), revision);
assert.throws(
  () => buildAuthorizationProfileRevision({ ...profile, updatedAt: undefined }),
  /profile revision is unavailable/i,
);

console.log('authorization profile revision tests passed');
