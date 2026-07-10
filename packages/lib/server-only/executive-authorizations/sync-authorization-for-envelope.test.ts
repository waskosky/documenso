import assert from 'node:assert/strict';

import { DocumentStatus, ExecutiveAuthorizationStatus, RecipientRole, SendStatus, SigningStatus } from '@prisma/client';

import { syncExecutiveAuthorizationForEnvelope } from './sync-authorization-for-envelope';

const main = async () => {
  const updates: Array<{
    data: {
      completedAt?: Date;
      status: ExecutiveAuthorizationStatus;
    };
    where: {
      id: string;
    };
  }> = [];

  const synced = await syncExecutiveAuthorizationForEnvelope({
    envelopeId: 'env_123',
    prismaClient: {
      executiveAuthorization: {
        findFirst: async () =>
          Promise.resolve({
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
        update: async (args) => {
          updates.push(args);
          return Promise.resolve(args);
        },
      },
    },
  });

  assert.equal(updates.length, 1);
  const firstUpdate = updates[0];
  assert.ok(firstUpdate);
  assert.equal(firstUpdate.where.id, 'auth_123');
  assert.equal(firstUpdate.data.status, ExecutiveAuthorizationStatus.COMPLETED);
  assert.equal(firstUpdate.data.completedAt?.toISOString(), '2026-07-10T12:00:00.000Z');
  assert.equal(synced, firstUpdate);

  const missing = await syncExecutiveAuthorizationForEnvelope({
    envelopeId: 'env_missing',
    prismaClient: {
      executiveAuthorization: {
        findFirst: async () => Promise.resolve(null),
        update: async () => Promise.reject(new Error('Unexpected update')),
      },
    },
  });

  assert.equal(missing, null);
};

void main();
