import assert from 'node:assert/strict';

import { DocumentStatus, ExecutiveAuthorizationStatus, RecipientRole, SendStatus, SigningStatus } from '@prisma/client';

import { buildAuthorizationStatusUpdate } from './sync-authorization-status';

const pending = buildAuthorizationStatusUpdate({
  completedAt: null,
  envelopeStatus: DocumentStatus.PENDING,
  existingSigners: [
    {
      email: 'one@example.com',
      name: 'Director One',
      role: 'Board Chair',
      signingOrder: 1,
    },
  ],
  recipients: [
    {
      email: 'one@example.com',
      id: 1,
      name: 'Director One',
      role: RecipientRole.SIGNER,
      sendStatus: SendStatus.SENT,
      signedAt: new Date('2026-07-10T00:00:00.000Z'),
      signingOrder: 1,
      signingStatus: SigningStatus.SIGNED,
      token: 'token-one',
    },
    {
      email: 'two@example.com',
      id: 2,
      name: 'Director Two',
      role: RecipientRole.SIGNER,
      sendStatus: SendStatus.SENT,
      signedAt: null,
      signingOrder: 2,
      signingStatus: SigningStatus.NOT_SIGNED,
      token: 'token-two',
    },
  ],
});

assert.equal(pending.status, ExecutiveAuthorizationStatus.PARTIALLY_SIGNED);
assert.equal(pending.completedAt, undefined);
assert.equal(pending.signers[0]?.recipientId, 1);
assert.equal(pending.signers[0]?.role, 'Board Chair');
assert.equal(pending.signers[0]?.status, SigningStatus.SIGNED);
assert.match(pending.signers[0]?.signingUrl ?? '', /\/sign\/token-one$/);

const completed = buildAuthorizationStatusUpdate({
  completedAt: new Date('2026-07-11T00:00:00.000Z'),
  envelopeStatus: DocumentStatus.COMPLETED,
  recipients: [
    {
      email: 'one@example.com',
      id: 1,
      name: 'Director One',
      role: RecipientRole.SIGNER,
      sendStatus: SendStatus.SENT,
      signedAt: new Date('2026-07-10T00:00:00.000Z'),
      signingOrder: 1,
      signingStatus: SigningStatus.SIGNED,
      token: 'token-one',
    },
  ],
});

assert.equal(completed.status, ExecutiveAuthorizationStatus.COMPLETED);
assert.equal(completed.completedAt?.toISOString(), '2026-07-11T00:00:00.000Z');

const rejected = buildAuthorizationStatusUpdate({
  completedAt: null,
  envelopeStatus: DocumentStatus.PENDING,
  recipients: [
    {
      email: 'one@example.com',
      id: 1,
      name: 'Director One',
      role: RecipientRole.SIGNER,
      sendStatus: SendStatus.SENT,
      signedAt: null,
      signingOrder: 1,
      signingStatus: SigningStatus.REJECTED,
      token: 'token-one',
    },
  ],
});

assert.equal(rejected.status, ExecutiveAuthorizationStatus.REJECTED);
