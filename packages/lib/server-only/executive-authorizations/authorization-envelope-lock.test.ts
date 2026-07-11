import assert from 'node:assert/strict';

import { withAuthorizationEnvelopeLock } from './authorization-envelope-lock';

void (async () => {
  let queryCalled = false;
  let operationCalled = false;
  let transactionOptions: unknown;

  const result = await withAuthorizationEnvelopeLock({
    authorizationId: 'authorization_example',
    operation: () => {
      operationCalled = true;

      return Promise.resolve('locked-result');
    },
    prismaClient: {
      $transaction: async (
        callback: (transaction: { $executeRaw: () => Promise<unknown> }) => Promise<unknown>,
        options: unknown,
      ) => {
        transactionOptions = options;

        return await callback({
          $executeRaw: () => {
            queryCalled = true;

            return Promise.resolve([]);
          },
        });
      },
    } as never,
    teamId: 3,
  });

  assert.equal(result, 'locked-result');
  assert.equal(queryCalled, true);
  assert.equal(operationCalled, true);
  assert.deepEqual(transactionOptions, {
    maxWait: 10_000,
    timeout: 120_000,
  });

  console.log('authorization envelope lock tests passed');
})();
