import assert from 'node:assert/strict';

import { buildCreateAuthorizationResponse } from './create-authorization.types';

const response = buildCreateAuthorizationResponse({
  authorization: {
    envelope: { id: 'envelope_example' },
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
  teamUrl: 'personal_example',
  webAppUrl: 'https://sign.example.test/',
});

assert.deepEqual(response, {
  authorizationId: 'authorization_example',
  authorizationUrl: 'https://sign.example.test/t/personal_example/authorizations/authorization_example',
  editorUrl: 'https://sign.example.test/t/personal_example/documents/envelope_example/edit?step=addFields',
  envelopeId: 'envelope_example',
  fieldCount: 6,
  generationError: null,
  signerCount: 3,
  status: 'READY',
});
assert.equal('signingLinks' in response, false);
assert.equal(JSON.stringify(response).includes('/sign/'), false);

console.log('executive authorization API response tests passed');
