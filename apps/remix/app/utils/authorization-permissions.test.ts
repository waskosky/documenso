import assert from 'node:assert/strict';

import { TeamMemberRole } from '@prisma/client';

import { requireAuthorizationManager } from './authorization-permissions';

assert.doesNotThrow(() => requireAuthorizationManager(TeamMemberRole.ADMIN));
assert.doesNotThrow(() => requireAuthorizationManager(TeamMemberRole.MANAGER));
assert.throws(
  () => requireAuthorizationManager(TeamMemberRole.MEMBER),
  (error: unknown) => error instanceof Response && error.status === 403,
);

console.log('authorization permission tests passed');
