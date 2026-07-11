import assert from 'node:assert/strict';

import type { AuthorizationTemplateSignerRole } from '@documenso/lib/server-only/executive-authorizations/types';

import {
  buildAuthorizationSignerSlots,
  buildBoardAuthorizationInputFromFormData,
  buildBoardAuthorizationProfileInputFromFormData,
  getAuthorizationSignerFieldName,
} from './executive-authorizations';

const signerRoles: AuthorizationTemplateSignerRole[] = [
  {
    key: 'director',
    label: 'Director',
    maxCount: 3,
    minCount: 3,
    required: true,
  },
];

const slots = buildAuthorizationSignerSlots(signerRoles);

assert.deepEqual(slots, [
  { index: 0, required: true, roleIndex: 0, roleKey: 'director', roleLabel: 'Director' },
  { index: 1, required: true, roleIndex: 1, roleKey: 'director', roleLabel: 'Director' },
  { index: 2, required: true, roleIndex: 2, roleKey: 'director', roleLabel: 'Director' },
]);
assert.equal(getAuthorizationSignerFieldName(slots[1], 'email'), 'signer-director-1-email');

const formData = new FormData();
formData.set('actionDate', '2026-07-11');
formData.set('actionTitle', 'Approve an example transaction');
formData.set('authorizedOfficerName', 'Morgan Officer');
formData.set('authorizedOfficerTitle', 'President');
formData.set('companyLegalName', 'Example Company, Inc.');
formData.set('consentMethod', 'unanimous written consent');
formData.set('entityType', 'corporation');
formData.set('investorCondition', 'Internal approval requirement');
formData.set('jurisdiction', 'Colorado');
formData.set('matterDescription', 'Approval of an example transaction.');
formData.set('materialsReviewed', 'Transaction summary\nDraft agreement');
formData.set('resolutionDisposition', 'approved unanimously');
formData.set('resolutionTerms', 'the example transaction');
formData.set('secretaryName', 'Taylor Secretary');

for (const slot of slots) {
  formData.set(getAuthorizationSignerFieldName(slot, 'email'), `${slot.roleIndex + 1}@example.test`);
  formData.set(getAuthorizationSignerFieldName(slot, 'name'), `Director ${slot.roleIndex + 1}`);
  formData.set(getAuthorizationSignerFieldName(slot, 'presence'), 'Consented');
  formData.set(getAuthorizationSignerFieldName(slot, 'vote'), 'For');
}

const parsed = buildBoardAuthorizationInputFromFormData(formData, signerRoles);

assert.deepEqual(parsed.payload.directors, [
  { email: '1@example.test', name: 'Director 1', presence: 'Consented', vote: 'For' },
  { email: '2@example.test', name: 'Director 2', presence: 'Consented', vote: 'For' },
  { email: '3@example.test', name: 'Director 3', presence: 'Consented', vote: 'For' },
]);

const profilePayload = buildBoardAuthorizationProfileInputFromFormData(formData, signerRoles);

assert.deepEqual(profilePayload, {
  authorizedOfficerName: 'Morgan Officer',
  authorizedOfficerTitle: 'President',
  companyLegalName: 'Example Company, Inc.',
  consentMethod: 'unanimous written consent',
  directors: parsed.payload.directors,
  entityType: 'corporation',
  jurisdiction: 'Colorado',
  resolutionDisposition: 'approved unanimously',
  secretaryName: 'Taylor Secretary',
});

console.log('executive authorization form utility tests passed');
