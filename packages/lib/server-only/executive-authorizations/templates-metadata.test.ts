import assert from 'node:assert/strict';

import { getAuthorizationTemplate } from './templates';

const template = getAuthorizationTemplate('board_resolution_secretary_certificate');
const legacyTemplate = getAuthorizationTemplate('board_resolution_secretary_certificate', 1);

assert.equal(template.version, 2);
assert.equal(legacyTemplate.version, 1);
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
    positionX: 40.5,
    positionY: { start: 23, step: 13 },
    width: 29,
  },
  {
    appliesTo: 'all_signers',
    field: 'DATE',
    height: 4.5,
    page: 'signature_page',
    positionX: 80,
    positionY: { start: 23.5, step: 13 },
    width: 12,
  },
  {
    appliesTo: { signerRole: 'Secretary' },
    field: 'SIGNATURE',
    height: 5.5,
    page: 'signature_page',
    positionX: 40.5,
    positionY: 70,
    width: 26.5,
  },
  {
    appliesTo: { signerRole: 'Secretary' },
    field: 'DATE',
    height: 4.5,
    page: 'signature_page',
    positionX: 80,
    positionY: 70.5,
    width: 12,
  },
  {
    appliesTo: { signerRole: 'Authorized Officer' },
    field: 'SIGNATURE',
    height: 5.5,
    page: 'signature_page',
    positionX: 40.5,
    positionY: 83,
    width: 29,
  },
]);

assert.equal(legacyTemplate.signing.fieldPlacements.length, 2);

console.log('authorization template metadata tests passed');
