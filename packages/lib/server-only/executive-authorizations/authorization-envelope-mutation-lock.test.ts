import assert from 'node:assert/strict';

import { DocumentStatus } from '@prisma/client';

import { assertAuthorizationEnvelopeMutationAllowed } from './authorization-envelope-lock';

void (async () => {
  let lockCount = 0;
  const transaction = {
    $executeRaw: () => {
      lockCount += 1;

      return Promise.resolve(1);
    },
    envelope: {
      findUnique: () => Promise.resolve({ status: DocumentStatus.PENDING }),
    },
    executiveAuthorization: {
      findFirst: () => Promise.resolve({ id: 'authorization_example', teamId: 3 }),
    },
  };

  await assert.rejects(
    () =>
      assertAuthorizationEnvelopeMutationAllowed({
        envelopeId: 'envelope_example',
        transaction: transaction as never,
      }),
    /cannot be modified.*PENDING/i,
  );
  assert.equal(lockCount, 1);

  console.log('legacy authorization envelope mutation lock tests passed');
})();
