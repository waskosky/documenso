import assert from 'node:assert/strict';

import { normalizeAuthorizationSigners } from './stored-signers';

assert.deepEqual(
  normalizeAuthorizationSigners([
    {
      email: 'one@example.test',
      executionRoles: ['Secretary', 'Authorized Officer', 7, null],
      name: 'Director One',
      role: 'Director',
      signingOrder: 1,
    },
  ]),
  [
    {
      email: 'one@example.test',
      executionRoles: ['Secretary', 'Authorized Officer'],
      name: 'Director One',
      recipientId: undefined,
      role: 'Director',
      sendStatus: undefined,
      signedAt: undefined,
      signingOrder: 1,
      signingUrl: undefined,
      status: undefined,
    },
  ],
);

console.log('stored authorization signer tests passed');
