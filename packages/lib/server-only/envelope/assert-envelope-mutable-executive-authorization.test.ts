import assert from 'node:assert/strict';

import { DocumentStatus } from '@prisma/client';

import { assertEnvelopeMutable } from './assert-envelope-mutable';

void (async () => {
  let queryCount = 0;
  let lockCount = 0;
  const transaction = {
    $executeRaw: () => {
      lockCount += 1;

      return Promise.resolve(1);
    },
    envelope: {
      findFirstOrThrow: () => {
        queryCount += 1;

        return Promise.resolve({
          executiveAuthorization: {
            id: 'authorization_example',
            teamId: 3,
          },
          signatureLevel: 'SES',
          status: queryCount === 1 ? DocumentStatus.DRAFT : DocumentStatus.PENDING,
        });
      },
    },
  };

  await assert.rejects(
    () => assertEnvelopeMutable({ id: 'envelope_example' }, transaction as never),
    /cannot be modified.*PENDING/i,
  );
  assert.equal(queryCount, 2);
  assert.equal(lockCount, 1);

  console.log('executive authorization envelope mutation lock tests passed');
})();
