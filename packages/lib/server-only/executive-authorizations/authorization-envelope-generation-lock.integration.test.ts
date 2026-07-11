import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { withAuthorizationEnvelopeGenerationLock } from './authorization-envelope-generation-lock';

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

void (async () => {
  if (!process.env.NEXT_PRIVATE_DATABASE_URL && !process.env.DATABASE_URL) {
    console.log('authorization envelope generation lock integration test skipped: database URL is not set');
    return;
  }

  const authorizationId = `lock-test-${randomUUID()}`;
  let activeOperations = 0;
  let maximumActiveOperations = 0;

  await Promise.all(
    [1, 2].map(
      async () =>
        await withAuthorizationEnvelopeGenerationLock({
          authorizationId,
          operation: async () => {
            activeOperations += 1;
            maximumActiveOperations = Math.max(maximumActiveOperations, activeOperations);
            await delay(100);
            activeOperations -= 1;
          },
          teamId: 3,
        }),
    ),
  );

  assert.equal(maximumActiveOperations, 1);

  console.log('authorization envelope generation lock integration tests passed');
})();
