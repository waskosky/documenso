import assert from 'node:assert/strict';

import { createProfiledExecutiveAuthorization } from './create-profiled-executive-authorization';

const templateKey = 'board_resolution_secretary_certificate' as const;
const profilePayload = {
  actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
  approvalRequiredCount: 2,
  authorizedOfficerDirectorIndex: 1,
  authorizedOfficerName: 'Director Two',
  authorizedOfficerTitle: 'President',
  companyLegalName: 'Example Company, Inc.',
  directors: [
    { email: 'one@example.test', name: 'Director One', presence: 'CONSENTED', vote: 'FOR' },
    { email: 'two@example.test', name: 'Director Two', presence: 'CONSENTED', vote: 'FOR' },
    { email: 'three@example.test', name: 'Director Three', presence: 'CONSENTED', vote: 'FOR' },
  ],
  entityType: 'corporation',
  equityHolderPlural: 'stockholders',
  governingBodyName: 'Board of Directors',
  governingMemberPlural: 'directors',
  governingMemberSingular: 'director',
  jurisdiction: 'Colorado',
  quorumRequiredCount: 2,
  resolutionDisposition: 'APPROVED_UNANIMOUSLY',
  secretaryDirectorIndex: 0,
  secretaryName: 'Director One',
};
const decisionPayload = {
  actionDate: '2026-07-11',
  actionTitle: 'Approve example transaction',
  certificateDate: '2026-07-12',
  materialsReviewed: ['Transaction summary'],
  matterDescription: 'Approval of an example transaction.',
  ratifyPriorActions: true,
  specificAction: 'the example transaction',
  specificTerms: 'on the terms presented to the Board',
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
    getProfile: () => Promise.resolve({ payloadDefaults: profilePayload, templateVersion: 2 }),
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

  let completedIntegrityCalls = 0;
  const completedAuthorization = await createProfiledExecutiveAuthorization(input, {
    ...dependencies,
    assertEnvelopeIntegrity: () => {
      completedIntegrityCalls += 1;

      return Promise.reject(new Error('Completed document data has normal signed-PDF lineage.'));
    },
    getAuthorization: () => Promise.resolve({ ...readyAuthorization, status: 'COMPLETED' } as never),
  });

  assert.equal(completedIntegrityCalls, 0);
  assert.equal(completedAuthorization.integrityError, null);

  await assert.rejects(
    () =>
      createProfiledExecutiveAuthorization(input, {
        ...dependencies,
        getProfile: () => Promise.resolve(null),
      }),
    /authorization defaults.*not configured/i,
  );

  await assert.rejects(
    () =>
      createProfiledExecutiveAuthorization(input, {
        ...dependencies,
        getProfile: () => Promise.resolve({ payloadDefaults: profilePayload, templateVersion: 1 }),
      }),
    /reviewed and upgraded to version 2/i,
  );

  console.log('profiled executive authorization orchestration tests passed');
})();
