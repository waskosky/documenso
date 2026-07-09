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
      title: 'Missing Email',
    }),
  /email address/i,
);
