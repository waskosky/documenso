import assert from 'node:assert/strict';

import { DocumentStatus, ExecutiveAuthorizationStatus, RecipientRole, SendStatus, SigningStatus } from '@prisma/client';

import { syncExecutiveAuthorizationForEnvelope } from './sync-authorization-for-envelope';

const main = async () => {
  const updates: unknown[] = [];

  const synced = await syncExecutiveAuthorizationForEnvelope({
    envelopeId: 'env_123',
    prismaClient: {
      executiveAuthorization: {
        findFirst: async () => ({
          id: 'auth_123',
          signers: [
            {
              email: 'one@example.com',
              name: 'Director One',
              role: 'Board Chair',
              signingOrder: 1,
            },
          ],
          envelope: {
            completedAt: new Date('2026-07-10T12:00:00.000Z'),
            status: DocumentStatus.COMPLETED,
            recipients: [
              {
                email: 'one@example.com',
                id: 1,
                name: 'Director One',
                role: RecipientRole.SIGNER,
                sendStatus: SendStatus.SENT,
                signedAt: new Date('2026-07-10T11:00:00.000Z'),
                signingOrder: 1,
                signingStatus: SigningStatus.SIGNED,
                token: 'token-one',
              },
            ],
          },
        }),
        update: (args) => {
          updates.push(args);
          return Promise.resolve(args);
        },
      },
    },
  });

  assert.equal(updates.length, 1);
  assert.equal((updates[0] as { where: { id: string } }).where.id, 'auth_123');
  assert.equal(
    (updates[0] as { data: { status: ExecutiveAuthorizationStatus } }).data.status,
    ExecutiveAuthorizationStatus.COMPLETED,
  );
  assert.equal(
    (updates[0] as { data: { completedAt?: Date } }).data.completedAt?.toISOString(),
    '2026-07-10T12:00:00.000Z',
  );
  assert.equal(synced, updates[0]);

  const missing = await syncExecutiveAuthorizationForEnvelope({
    envelopeId: 'env_missing',
    prismaClient: {
      executiveAuthorization: {
        findFirst: async () => null,
        update: () => Promise.reject(new Error('Unexpected update')),
      },
    },
  });

  assert.equal(missing, null);
};

void main();
