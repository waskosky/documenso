import assert from 'node:assert/strict';

import { FieldType, RecipientRole } from '@prisma/client';

import { buildAuthorizationEnvelopePlan } from './build-authorization-envelope-plan';

const plan = buildAuthorizationEnvelopePlan({
  authorizationId: 'auth_123',
  renderedMarkdown: '# Board Approval\n\nResolution text.',
  signaturePageNumber: 4,
  signers: [
    {
      email: 'ONE@EXAMPLE.COM',
      name: 'Director One',
      role: 'Director',
      signingOrder: 1,
    },
    {
      email: 'two@example.com',
      name: 'Director Two',
      role: 'Director',
      signingOrder: 2,
    },
    {
      email: 'three@example.com',
      name: 'Director Three',
      role: 'Director',
      signingOrder: 3,
    },
  ],
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 1,
  title: 'Approval of SAFE Financing',
});

assert.equal(plan.externalId, 'executive_authorization:auth_123');
assert.equal(plan.fileName, 'approval-of-safe-financing.pdf');
assert.equal(plan.title, 'Approval of SAFE Financing');
assert.match(plan.emailSubject, /Approval of SAFE Financing/);
assert.match(plan.emailMessage, /Board authorization/);
assert.deepEqual(
  plan.recipients.map((recipient) => ({
    email: recipient.email,
    name: recipient.name,
    role: recipient.role,
    signingOrder: recipient.signingOrder,
  })),
  [
    {
      email: 'one@example.com',
      name: 'Director One',
      role: RecipientRole.SIGNER,
      signingOrder: 1,
    },
    {
      email: 'two@example.com',
      name: 'Director Two',
      role: RecipientRole.SIGNER,
      signingOrder: 2,
    },
    {
      email: 'three@example.com',
      name: 'Director Three',
      role: RecipientRole.SIGNER,
      signingOrder: 3,
    },
  ],
);

assert.equal(plan.recipients.length, 3);
assert.equal(plan.recipients[0]?.fields.length, 2);
assert.equal(plan.recipients[0]?.fields[0]?.type, FieldType.SIGNATURE);
assert.equal(plan.recipients[0]?.fields[0]?.page, 4);
assert.equal(plan.recipients[0]?.fields[1]?.type, FieldType.DATE);
assert.equal(plan.recipients[0]?.fields[1]?.page, 4);

const versionTwoPlan = buildAuthorizationEnvelopePlan({
  authorizationId: 'auth_v2',
  renderedMarkdown: '# Complete Board Approval',
  signaturePageNumber: 5,
  signers: [
    {
      email: 'one@example.com',
      executionRoles: ['Secretary'],
      name: 'Director One',
      role: 'Director',
      signingOrder: 1,
    },
    {
      email: 'two@example.com',
      executionRoles: ['Authorized Officer'],
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
  ],
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
  title: 'Complete Board Approval',
});

assert.equal(versionTwoPlan.recipients.length, 3);
assert.deepEqual(
  versionTwoPlan.recipients.map((recipient) => recipient.fields.length),
  [4, 3, 2],
);
assert.equal(
  versionTwoPlan.recipients.reduce((count, recipient) => count + recipient.fields.length, 0),
  9,
);
assert.deepEqual(
  versionTwoPlan.recipients[0]?.fields.map((field) => [field.type, field.positionY]),
  [
    [FieldType.SIGNATURE, 23],
    [FieldType.DATE, 23.5],
    [FieldType.SIGNATURE, 70],
    [FieldType.DATE, 70.5],
  ],
);
assert.deepEqual(
  versionTwoPlan.recipients[1]?.fields.map((field) => [field.type, field.positionY]),
  [
    [FieldType.SIGNATURE, 36],
    [FieldType.DATE, 36.5],
    [FieldType.SIGNATURE, 83],
  ],
);

const combinedExecutionRolePlan = buildAuthorizationEnvelopePlan({
  authorizationId: 'auth_combined_roles',
  renderedMarkdown: '# Combined execution roles',
  signaturePageNumber: 2,
  signers: [
    {
      email: 'one@example.com',
      executionRoles: ['Secretary', 'Authorized Officer'],
      name: 'Director One',
      role: 'Director',
      signingOrder: 1,
    },
    { email: 'two@example.com', executionRoles: [], name: 'Director Two', role: 'Director', signingOrder: 2 },
    { email: 'three@example.com', executionRoles: [], name: 'Director Three', role: 'Director', signingOrder: 3 },
  ],
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
  title: 'Combined execution roles',
});

assert.deepEqual(
  combinedExecutionRolePlan.recipients.map((recipient) => recipient.fields.length),
  [5, 2, 2],
);
assert.equal(
  combinedExecutionRolePlan.recipients.reduce((count, recipient) => count + recipient.fields.length, 0),
  9,
);

assert.throws(
  () =>
    buildAuthorizationEnvelopePlan({
      authorizationId: 'auth_456',
      renderedMarkdown: '# Missing Email',
      signaturePageNumber: 1,
      signers: [
        {
          email: '',
          name: 'Director Without Email',
          role: 'Director',
          signingOrder: 1,
        },
      ],
      templateKey: 'board_resolution_secretary_certificate',
      templateVersion: 1,
      title: 'Missing Email',
    }),
  /email address/i,
);

assert.throws(
  () =>
    buildAuthorizationEnvelopePlan({
      authorizationId: 'auth_unknown_version',
      renderedMarkdown: '# Unknown Version',
      signaturePageNumber: 1,
      signers: [],
      templateKey: 'board_resolution_secretary_certificate',
      templateVersion: 999,
      title: 'Unknown Version',
    }),
  /template version 999/i,
);
