import assert from 'node:assert/strict';

import type { AuthorizationTemplateSignerRole } from '@documenso/lib/server-only/executive-authorizations/types';

import {
  buildAuthorizationSignerSlots,
  buildBoardAuthorizationDecisionInputFromFormData,
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
formData.set('actionMethod', 'UNANIMOUS_WRITTEN_CONSENT');
formData.set('actionTitle', 'Approve an example transaction');
formData.set('approvalRequiredCount', '2');
formData.set('authorizedOfficerDirectorIndex', '0');
formData.set('authorizedOfficerTitle', 'President');
formData.set('certificateDate', '2026-07-12');
formData.set('companyLegalName', 'Example Company, Inc.');
formData.set('deliveryCondition', 'the closing approval condition');
formData.set('deliveryRecipient', 'Example Investor');
formData.set('entityType', 'corporation');
formData.set('equityHolderPlural', 'stockholders');
formData.set('governingBodyName', 'Board of Directors');
formData.set('governingMemberPlural', 'directors');
formData.set('governingMemberSingular', 'director');
formData.set('jurisdiction', 'Colorado');
formData.set('matterDescription', 'Approval of an example transaction.');
formData.set('materialsReviewed', 'Transaction summary\nDraft agreement');
formData.set('ratifyPriorActions', 'true');
formData.set('quorumRequiredCount', '2');
formData.set('resolutionDisposition', 'APPROVED_UNANIMOUSLY');
formData.set('secretaryDirectorIndex', '1');
formData.set('specificAction', 'the example transaction');
formData.set('specificTerms', 'on the terms described in the draft agreement');

for (const slot of slots) {
  formData.set(getAuthorizationSignerFieldName(slot, 'email'), `${slot.roleIndex + 1}@example.test`);
  formData.set(getAuthorizationSignerFieldName(slot, 'name'), `Director ${slot.roleIndex + 1}`);
  formData.set(getAuthorizationSignerFieldName(slot, 'presence'), 'CONSENTED');
  formData.set(getAuthorizationSignerFieldName(slot, 'vote'), 'FOR');
}

const parsed = buildBoardAuthorizationInputFromFormData(formData, signerRoles, 2);

assert.deepEqual(parsed.payload.directors, [
  { email: '1@example.test', name: 'Director 1', presence: 'CONSENTED', vote: 'FOR' },
  { email: '2@example.test', name: 'Director 2', presence: 'CONSENTED', vote: 'FOR' },
  { email: '3@example.test', name: 'Director 3', presence: 'CONSENTED', vote: 'FOR' },
]);
assert.deepEqual(parsed, {
  notes: '',
  payload: {
    actionDate: '2026-07-11',
    actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
    actionTitle: 'Approve an example transaction',
    approvalRequiredCount: 2,
    authorizedOfficerDirectorIndex: 0,
    authorizedOfficerName: 'Director 1',
    authorizedOfficerTitle: 'President',
    certificateDate: '2026-07-12',
    companyLegalName: 'Example Company, Inc.',
    deliveryCondition: 'the closing approval condition',
    deliveryRecipient: 'Example Investor',
    directors: parsed.payload.directors,
    entityType: 'corporation',
    equityHolderPlural: 'stockholders',
    governingBodyName: 'Board of Directors',
    governingMemberPlural: 'directors',
    governingMemberSingular: 'director',
    jurisdiction: 'Colorado',
    materialsReviewed: ['Transaction summary', 'Draft agreement'],
    matterDescription: 'Approval of an example transaction.',
    ratifyPriorActions: true,
    quorumRequiredCount: 2,
    resolutionDisposition: 'APPROVED_UNANIMOUSLY',
    secretaryDirectorIndex: 1,
    secretaryName: 'Director 2',
    specificAction: 'the example transaction',
    specificTerms: 'on the terms described in the draft agreement',
  },
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
});

const profilePayload = buildBoardAuthorizationProfileInputFromFormData(formData, signerRoles);

assert.deepEqual(profilePayload, {
  actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
  approvalRequiredCount: 2,
  authorizedOfficerDirectorIndex: 0,
  authorizedOfficerName: 'Director 1',
  authorizedOfficerTitle: 'President',
  companyLegalName: 'Example Company, Inc.',
  directors: parsed.payload.directors,
  entityType: 'corporation',
  equityHolderPlural: 'stockholders',
  governingBodyName: 'Board of Directors',
  governingMemberPlural: 'directors',
  governingMemberSingular: 'director',
  jurisdiction: 'Colorado',
  quorumRequiredCount: 2,
  resolutionDisposition: 'APPROVED_UNANIMOUSLY',
  secretaryDirectorIndex: 1,
  secretaryName: 'Director 2',
});

const legacyFormData = new FormData();
legacyFormData.set('actionDate', '2026-07-10');
legacyFormData.set('actionTitle', 'Legacy action');
legacyFormData.set('authorizedOfficerName', 'Legacy Officer');
legacyFormData.set('authorizedOfficerTitle', 'President');
legacyFormData.set('companyLegalName', 'Legacy Company');
legacyFormData.set('consentMethod', 'unanimous written consent');
legacyFormData.set('entityType', 'corporation');
legacyFormData.set('investorCondition', 'Legacy condition');
legacyFormData.set('jurisdiction', 'Colorado');
legacyFormData.set('matterDescription', 'Legacy matter');
legacyFormData.set('resolutionDisposition', 'approved unanimously');
legacyFormData.set('resolutionTerms', 'Legacy terms');
legacyFormData.set('secretaryName', 'Legacy Secretary');

for (const slot of slots) {
  legacyFormData.set(getAuthorizationSignerFieldName(slot, 'email'), `legacy-${slot.roleIndex + 1}@example.test`);
  legacyFormData.set(getAuthorizationSignerFieldName(slot, 'name'), `Legacy Director ${slot.roleIndex + 1}`);
  legacyFormData.set(getAuthorizationSignerFieldName(slot, 'presence'), 'Consented');
  legacyFormData.set(getAuthorizationSignerFieldName(slot, 'vote'), 'For');
}

const legacyParsed = buildBoardAuthorizationInputFromFormData(legacyFormData, signerRoles, 1);

assert.equal(legacyParsed.templateVersion, 1);
assert.equal(legacyParsed.payload.resolutionTerms, 'Legacy terms');
assert.equal(legacyParsed.payload.investorCondition, 'Legacy condition');

const decisionFormData = new FormData();
decisionFormData.set('externalId', 'board-web-12345678-1234-4123-8123-123456789abc');
decisionFormData.set('actionDate', '2026-07-15');
decisionFormData.set('certificateDate', '2026-07-16');
decisionFormData.set('actionTitle', 'Approve a distribution agreement');
decisionFormData.set('matterDescription', 'Review and approve the proposed distribution agreement.');
decisionFormData.set('materialsReviewed', 'Distribution agreement\n  Financial summary  \n\nBoard memorandum');
decisionFormData.set('specificAction', 'enter into the proposed distribution agreement');
decisionFormData.set('specificTerms', 'substantially on the terms presented to the Board');
decisionFormData.set('deliveryRecipient', 'Example Distributor');
decisionFormData.set('deliveryCondition', 'after the authorized officer approves non-material changes');
decisionFormData.set('ratifyPriorActions', 'true');
decisionFormData.set('notes', 'Prepared from the July board packet.');
decisionFormData.set('companyLegalName', 'Malicious Company Override');
decisionFormData.set('quorumRequiredCount', '1');
decisionFormData.set('signer-director-0-email', 'attacker@example.test');

const decisionInput = buildBoardAuthorizationDecisionInputFromFormData(decisionFormData, 'APPROVED_UNANIMOUSLY');

assert.deepEqual(decisionInput, {
  externalId: 'board-web-12345678-1234-4123-8123-123456789abc',
  notes: 'Prepared from the July board packet.',
  payload: {
    actionDate: '2026-07-15',
    actionTitle: 'Approve a distribution agreement',
    certificateDate: '2026-07-16',
    deliveryCondition: 'after the authorized officer approves non-material changes',
    deliveryRecipient: 'Example Distributor',
    materialsReviewed: ['Distribution agreement', 'Financial summary', 'Board memorandum'],
    matterDescription: 'Review and approve the proposed distribution agreement.',
    ratifyPriorActions: true,
    specificAction: 'enter into the proposed distribution agreement',
    specificTerms: 'substantially on the terms presented to the Board',
  },
});
assert.equal('companyLegalName' in decisionInput.payload, false);
assert.equal('quorumRequiredCount' in decisionInput.payload, false);
assert.equal('directors' in decisionInput.payload, false);

const rejectedDecisionInput = buildBoardAuthorizationDecisionInputFromFormData(decisionFormData, 'NOT_APPROVED');

assert.equal(rejectedDecisionInput.payload.ratifyPriorActions, false);
assert.equal('deliveryRecipient' in rejectedDecisionInput.payload, false);
assert.equal('deliveryCondition' in rejectedDecisionInput.payload, false);

console.log('executive authorization form utility tests passed');
