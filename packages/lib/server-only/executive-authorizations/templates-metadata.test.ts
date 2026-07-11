import assert from 'node:assert/strict';

import { getAuthorizationTemplate } from './templates';

const template = getAuthorizationTemplate('board_resolution_secretary_certificate');

assert.equal(getAuthorizationTemplate('board_resolution_secretary_certificate', 1), template);
assert.throws(() => getAuthorizationTemplate('board_resolution_secretary_certificate', 999), /template version 999/i);

assert.deepEqual(template.signing.signerRoles, [
  {
    key: 'director',
    label: 'Director',
    maxCount: 3,
    minCount: 3,
    required: true,
  },
]);

assert.deepEqual(template.signing.fieldPlacements, [
  {
    appliesTo: 'all_signers',
    field: 'SIGNATURE',
    height: 5.5,
    page: 'signature_page',
    positionX: 30,
    positionY: { start: 28, step: 18 },
    width: 38,
  },
  {
    appliesTo: 'all_signers',
    field: 'DATE',
    height: 4.5,
    page: 'signature_page',
    positionX: 75,
    positionY: { start: 28.5, step: 18 },
    width: 14,
  },
]);

console.log('authorization template metadata tests passed');
