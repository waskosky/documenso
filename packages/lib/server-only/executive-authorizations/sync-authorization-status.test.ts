import assert from 'node:assert/strict';

import { DocumentStatus, ExecutiveAuthorizationStatus, RecipientRole, SendStatus, SigningStatus } from '@prisma/client';

import { buildAuthorizationEnvelopePlan } from './build-authorization-envelope-plan';
import { buildAuthorizationStatusUpdate } from './sync-authorization-status';

const durableSigners = [
  {
    email: 'one@example.com',
    executionRoles: ['Secretary', 'Authorized Officer'],
    name: 'Director One',
    role: 'Board Chair',
    signingOrder: 1,
  },
  {
    email: 'two@example.com',
    executionRoles: [],
    name: 'Director Two',
    role: 'Director',
    signingOrder: 2,
  },
  {
    email: 'three@example.com',
    executionRoles: [],
    name: 'Director Three',
    role: 'Director',
    signingOrder: 3,
  },
];

const pendingRecipients = [
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
  {
    email: 'three@example.com',
    id: 3,
    name: 'Director Three',
    role: RecipientRole.SIGNER,
    sendStatus: SendStatus.NOT_SENT,
    signedAt: null,
    signingOrder: 3,
    signingStatus: SigningStatus.NOT_SIGNED,
    token: 'token-three',
  },
];

const pending = buildAuthorizationStatusUpdate({
  completedAt: null,
  envelopeStatus: DocumentStatus.PENDING,
  existingSigners: durableSigners,
  recipients: pendingRecipients,
});

assert.equal(pending.status, ExecutiveAuthorizationStatus.PARTIALLY_SIGNED);
assert.equal(pending.completedAt, undefined);
assert.equal(pending.signers[0]?.recipientId, 1);
assert.deepEqual(pending.signers[0]?.executionRoles, ['Secretary', 'Authorized Officer']);
assert.equal(pending.signers[0]?.role, 'Board Chair');
assert.equal(pending.signers[0]?.status, SigningStatus.SIGNED);
assert.match(pending.signers[0]?.signingUrl ?? '', /\/sign\/token-one$/);

assert.throws(
  () =>
    buildAuthorizationStatusUpdate({
      completedAt: null,
      envelopeStatus: DocumentStatus.DRAFT,
      existingSigners: durableSigners,
      recipients: pendingRecipients.map((recipient, index) =>
        index === 0 ? { ...recipient, name: 'Changed Director' } : recipient,
      ),
    }),
  /recipient 1 name does not match/i,
);

assert.throws(
  () =>
    buildAuthorizationStatusUpdate({
      completedAt: null,
      envelopeStatus: DocumentStatus.DRAFT,
      existingSigners: durableSigners,
      recipients: pendingRecipients.map((recipient, index) =>
        index === 1 ? { ...recipient, email: 'changed@example.com' } : recipient,
      ),
    }),
  /recipient 2 email does not match/i,
);

assert.throws(
  () =>
    buildAuthorizationStatusUpdate({
      completedAt: null,
      envelopeStatus: DocumentStatus.DRAFT,
      existingSigners: durableSigners,
      recipients: pendingRecipients.slice(0, 2),
    }),
  /recipient count must remain 3/i,
);

assert.throws(
  () =>
    buildAuthorizationStatusUpdate({
      completedAt: null,
      envelopeStatus: DocumentStatus.DRAFT,
      existingSigners: durableSigners,
      recipients: [
        ...pendingRecipients,
        {
          ...pendingRecipients[2],
          email: 'four@example.com',
          id: 4,
          name: 'Director Four',
          signingOrder: 4,
          token: 'token-four',
        },
      ],
    }),
  /recipient count must remain 3/i,
);

assert.throws(
  () =>
    buildAuthorizationStatusUpdate({
      completedAt: null,
      envelopeStatus: DocumentStatus.DRAFT,
      existingSigners: durableSigners,
      recipients: pendingRecipients.map((recipient, index) =>
        index === 2 ? { ...recipient, signingOrder: 2 } : recipient,
      ),
    }),
  /recipient 3 signing order must remain 3/i,
);

assert.throws(
  () =>
    buildAuthorizationStatusUpdate({
      completedAt: null,
      envelopeStatus: DocumentStatus.DRAFT,
      existingSigners: durableSigners,
      recipients: pendingRecipients.map((recipient, index) =>
        index === 2 ? { ...recipient, role: RecipientRole.APPROVER } : recipient,
      ),
    }),
  /recipient 3 role must remain SIGNER/i,
);

const rebuiltPlan = buildAuthorizationEnvelopePlan({
  authorizationId: 'auth_after_status_sync',
  renderedMarkdown: '# Synced authorization',
  signaturePageNumber: 2,
  signers: pending.signers,
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
  title: 'Synced authorization',
});

assert.equal(
  rebuiltPlan.recipients.reduce((count, recipient) => count + recipient.fields.length, 0),
  9,
);

const completed = buildAuthorizationStatusUpdate({
  completedAt: new Date('2026-07-11T00:00:00.000Z'),
  envelopeStatus: DocumentStatus.COMPLETED,
  existingSigners: durableSigners.slice(0, 1),
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

const completedFromSignedRecipients = buildAuthorizationStatusUpdate({
  completedAt: null,
  envelopeStatus: DocumentStatus.PENDING,
  existingSigners: durableSigners.slice(0, 2),
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
      signedAt: new Date('2026-07-12T00:00:00.000Z'),
      signingOrder: 2,
      signingStatus: SigningStatus.SIGNED,
      token: 'token-two',
    },
  ],
});

assert.equal(completedFromSignedRecipients.status, ExecutiveAuthorizationStatus.COMPLETED);
assert.equal(
  completedFromSignedRecipients.completedAt?.toISOString(),
  '2026-07-12T00:00:00.000Z',
);

const rejected = buildAuthorizationStatusUpdate({
  completedAt: null,
  envelopeStatus: DocumentStatus.PENDING,
  existingSigners: durableSigners.slice(0, 1),
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
