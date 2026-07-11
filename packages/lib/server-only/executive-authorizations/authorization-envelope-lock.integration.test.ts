import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { prisma } from '@documenso/prisma';

import { acquireAuthorizationEnvelopeLock, withAuthorizationEnvelopeLock } from './authorization-envelope-lock';

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

void (async () => {
  if (!process.env.NEXT_PRIVATE_DATABASE_URL && !process.env.DATABASE_URL) {
    console.log('authorization envelope lock integration test skipped: database URL is not set');
    return;
  }

  const authorizationId = `lock-test-${randomUUID()}`;
  let activeOperations = 0;
  let maximumActiveOperations = 0;

  await Promise.all(
    [1, 2].map(async (index) =>
      index === 1
        ? await withAuthorizationEnvelopeLock({
            authorizationId,
            operation: async () => {
              activeOperations += 1;
              maximumActiveOperations = Math.max(maximumActiveOperations, activeOperations);
              await delay(100);
              activeOperations -= 1;
            },
            teamId: 3,
          })
        : await prisma.$transaction(async (transaction) => {
            await acquireAuthorizationEnvelopeLock({
              authorizationId,
              teamId: 3,
              transaction,
            });
            activeOperations += 1;
            maximumActiveOperations = Math.max(maximumActiveOperations, activeOperations);
            await delay(100);
            activeOperations -= 1;
          }),
    ),
  );

  assert.equal(maximumActiveOperations, 1);

  console.log('authorization envelope lock integration tests passed');
})();
