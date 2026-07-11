import assert from 'node:assert/strict';

import { buildCreateAuthorizationResponse, ZCreateAuthorizationRequestSchema } from './create-authorization.types';

const decisionPayload = {
  actionDate: '2026-07-11',
  actionTitle: 'Approve example transaction',
  certificateDate: '2026-07-12',
  deliveryCondition: 'Section 4.2 closing condition',
  deliveryRecipient: 'Example Investor',
  materialsReviewed: ['Transaction summary'],
  matterDescription: 'Approval of an example transaction.',
  ratifyPriorActions: true,
  specificAction: 'the example transaction',
  specificTerms: 'on the terms presented to the Board',
};

const parsedRequest = ZCreateAuthorizationRequestSchema.parse({
  externalId: 'board-2026-07-11-example-transaction',
  payload: decisionPayload,
});

assert.deepEqual(parsedRequest.payload, decisionPayload);
const { ratifyPriorActions: _ratifyPriorActions, ...payloadWithoutRatificationDecision } = decisionPayload;
assert.throws(
  () =>
    ZCreateAuthorizationRequestSchema.parse({
      externalId: 'board-2026-07-11-missing-ratification-decision',
      payload: payloadWithoutRatificationDecision,
    }),
  /ratifyPriorActions/i,
);
assert.throws(
  () =>
    ZCreateAuthorizationRequestSchema.parse({
      externalId: 'board-2026-07-11-stable-override',
      payload: {
        ...decisionPayload,
        companyLegalName: 'One-Time Override, Inc.',
      },
    }),
  /unrecognized key/i,
);
assert.throws(
  () =>
    ZCreateAuthorizationRequestSchema.parse({
      externalId: 'board-2026-07-11-unpaired-delivery',
      payload: {
        ...decisionPayload,
        deliveryCondition: undefined,
      },
    }),
  /deliveryRecipient.*deliveryCondition/i,
);
assert.throws(
  () =>
    ZCreateAuthorizationRequestSchema.parse({
      externalId: 'board-2026-07-11-legacy-fields',
      payload: {
        ...decisionPayload,
        investorCondition: 'Legacy condition',
        resolutionTerms: 'Legacy terms',
      },
    }),
  /unrecognized key/i,
);

const response = buildCreateAuthorizationResponse({
  authorization: {
    envelope: {
      id: 'envelope_example',
      recipients: [
        {
          fields: [{ type: 'SIGNATURE' }, { type: 'DATE' }, { type: 'SIGNATURE' }, { type: 'DATE' }],
        },
        { fields: [{ type: 'SIGNATURE' }, { type: 'DATE' }, { type: 'SIGNATURE' }] },
        { fields: [{ type: 'SIGNATURE' }, { type: 'DATE' }] },
      ],
    },
    id: 'authorization_example',
    signers: [
      { email: 'one@example.test', name: 'Director One', role: 'Director', signingOrder: 1 },
      { email: 'two@example.test', name: 'Director Two', role: 'Director', signingOrder: 2 },
      { email: 'three@example.test', name: 'Director Three', role: 'Director', signingOrder: 3 },
    ],
    status: 'READY',
    templateKey: 'board_resolution_secretary_certificate',
  },
  generationError: null,
  integrityError: null,
  teamUrl: 'personal_example',
  webAppUrl: 'https://sign.example.test/',
});

assert.deepEqual(response, {
  authorizationId: 'authorization_example',
  authorizationUrl: 'https://sign.example.test/t/personal_example/authorizations/authorization_example',
  editorUrl: 'https://sign.example.test/t/personal_example/documents/envelope_example/edit?step=addFields',
  envelopeId: 'envelope_example',
  fieldCount: 9,
  generationError: null,
  integrityError: null,
  integrityValid: true,
  signerCount: 3,
  status: 'READY',
});
assert.equal('signingLinks' in response, false);
assert.equal(JSON.stringify(response).includes('/sign/'), false);

const inconsistentResponse = buildCreateAuthorizationResponse({
  authorization: {
    ...response,
    envelope: {
      id: 'envelope_inconsistent',
      recipients: [{ fields: [{ type: 'SIGNATURE' }] }],
    },
    id: 'authorization_inconsistent',
    signers: [],
    status: 'READY',
    templateKey: 'board_resolution_secretary_certificate',
  },
  generationError: null,
  integrityError: 'Authorization envelope integrity check failed: field count does not match.',
  teamUrl: 'personal_example',
  webAppUrl: 'https://sign.example.test/',
});

assert.equal(inconsistentResponse.fieldCount, 1);
assert.equal(inconsistentResponse.signerCount, 1);
assert.equal(inconsistentResponse.integrityValid, false);
assert.match(inconsistentResponse.integrityError ?? '', /field count/i);

console.log('executive authorization API response tests passed');
