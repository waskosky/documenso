import assert from 'node:assert/strict';

import { createProfiledExecutiveAuthorization } from './create-profiled-executive-authorization';

const templateKey = 'board_resolution_secretary_certificate' as const;
const profilePayload = {
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
  jurisdiction: 'Colorado',
  resolutionDisposition: 'approved unanimously',
  secretaryName: 'Taylor Secretary',
};
const decisionPayload = {
  actionDate: '2026-07-11',
  actionTitle: 'Approve example transaction',
  investorCondition: 'Internal approval requirement',
  materialsReviewed: ['Transaction summary'],
  matterDescription: 'Approval of an example transaction.',
  resolutionTerms: 'the example transaction',
};

const input = {
  externalId: 'agent-request:example-approval-2026-07-11',
  generateDocument: true,
  notes: 'Created through the executive-assistant API.',
  payload: decisionPayload,
  requestMetadata: {} as never,
  teamId: 3,
  templateKey,
  userId: 1,
};

void (async () => {
  let createInput: Record<string, unknown> | undefined;
  let envelopeCalls = 0;
  let integrityCalls = 0;
  const readyAuthorization = {
    envelope: {
      id: 'envelope_example',
      recipients: [
        { fields: [{ type: 'SIGNATURE' }, { type: 'DATE' }] },
        { fields: [{ type: 'SIGNATURE' }, { type: 'DATE' }] },
        { fields: [{ type: 'SIGNATURE' }, { type: 'DATE' }] },
      ],
    },
    id: 'authorization_example',
    signers: profilePayload.directors.map((director, index) => ({
      email: director.email,
      name: director.name,
      role: 'Director',
      signingOrder: index + 1,
    })),
    status: 'READY',
    templateKey,
  };
  const dependencies = {
    assertEnvelopeIntegrity: () => {
      integrityCalls += 1;

      return Promise.resolve();
    },
    createAuthorization: (value: Record<string, unknown>) => {
      createInput = value;
      return Promise.resolve({ id: 'authorization_example' });
    },
    createEnvelope: () => {
      envelopeCalls += 1;
      return Promise.resolve({ id: 'envelope_example' });
    },
    getAuthorization: () => Promise.resolve(readyAuthorization as never),
    getProfile: () => Promise.resolve({ payloadDefaults: profilePayload }),
  };

  const result = await createProfiledExecutiveAuthorization(input, dependencies);

  assert.equal(createInput?.externalId, input.externalId);
  assert.deepEqual(createInput?.payload, {
    ...profilePayload,
    ...decisionPayload,
  });
  assert.equal(envelopeCalls, 1);
  assert.equal(integrityCalls, 1);
  assert.equal(result.generationError, null);
  assert.equal(result.integrityError, null);
  assert.equal(result.authorization, readyAuthorization);

  const withoutEnvelope = await createProfiledExecutiveAuthorization(
    { ...input, generateDocument: false },
    {
      ...dependencies,
      getAuthorization: () => Promise.resolve({ ...readyAuthorization, envelope: null, status: 'DRAFT' } as never),
    },
  );

  assert.equal(envelopeCalls, 1);
  assert.equal(integrityCalls, 1);
  assert.equal(withoutEnvelope.authorization.status, 'DRAFT');

  const failedGeneration = await createProfiledExecutiveAuthorization(input, {
    ...dependencies,
    createEnvelope: () => Promise.reject(new Error('PDF conversion unavailable')),
    getAuthorization: () => Promise.resolve({ ...readyAuthorization, envelope: null, status: 'DRAFT' } as never),
  });

  assert.equal(failedGeneration.authorization.status, 'DRAFT');
  assert.equal(failedGeneration.generationError, 'PDF conversion unavailable');

  const failedIntegrity = await createProfiledExecutiveAuthorization(input, {
    ...dependencies,
    assertEnvelopeIntegrity: () => Promise.reject(new Error('Generated PDF identity does not match.')),
  });

  assert.equal(failedIntegrity.integrityError, 'Generated PDF identity does not match.');

  await assert.rejects(
    () =>
      createProfiledExecutiveAuthorization(input, {
        ...dependencies,
        getProfile: () => Promise.resolve(null),
      }),
    /authorization defaults.*not configured/i,
  );

  console.log('profiled executive authorization orchestration tests passed');
})();
