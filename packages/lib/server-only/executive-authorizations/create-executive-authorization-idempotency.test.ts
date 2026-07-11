import assert from 'node:assert/strict';

import { createExecutiveAuthorization } from './create-executive-authorization';

const input = {
  externalId: 'agent-request:example-approval-2026-07-11',
  payload: {
    actionDate: '2026-07-11',
    actionTitle: 'Approve example transaction',
    authorizedOfficerName: 'Morgan Officer',
    authorizedOfficerTitle: 'President',
    companyLegalName: 'Example Company, Inc.',
    consentMethod: 'unanimous written consent',
    directors: [
      { email: 'one@example.test', name: 'Director One', presence: 'Consented', vote: 'For' },
      { email: 'two@example.test', name: 'Director Two', presence: 'Consented', vote: 'For' },
      { email: 'three@example.test', name: 'Director Three', presence: 'Consented', vote: 'For' },
    ],
    entityType: 'corporation',
    investorCondition: 'Internal approval requirement',
    jurisdiction: 'Colorado',
    matterDescription: 'Approval of an example transaction.',
    materialsReviewed: ['Transaction summary'],
    resolutionDisposition: 'approved unanimously',
    resolutionTerms: 'the example transaction',
    secretaryName: 'Taylor Secretary',
  },
  teamId: 3,
  templateKey: 'board_resolution_secretary_certificate' as const,
  userId: 1,
};

void (async () => {
  const existing = { id: 'authorization_existing' };
  let createCalled = false;
  let findArguments: unknown;

  const prismaClient = {
    executiveAuthorization: {
      create: () => {
        createCalled = true;
        return Promise.resolve({ id: 'authorization_duplicate' });
      },
      findUnique: (arguments_: unknown) => {
        findArguments = arguments_;
        return Promise.resolve(existing);
      },
    },
  };

  const result = await createExecutiveAuthorization(input, prismaClient as never);

  assert.equal(result, existing);
  assert.equal(createCalled, false);
  assert.deepEqual(findArguments, {
    where: {
      teamId_externalId: {
        externalId: input.externalId,
        teamId: input.teamId,
      },
    },
  });

  console.log('executive authorization idempotency tests passed');
})();
