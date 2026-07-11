import assert from 'node:assert/strict';

import { buildExecutiveAuthorizationRequestFingerprint } from './authorization-request-fingerprint';
import { prepareExecutiveAuthorizationRecord } from './prepare-executive-authorization';
import { buildExecutiveAuthorizationUpdateData } from './update-executive-authorization';

const prepared = prepareExecutiveAuthorizationRecord({
  notes: 'Edited through the manager interface.',
  payload: {
    actionDate: '2026-07-11',
    actionTitle: 'Approve edited transaction',
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
    investorCondition: 'None',
    jurisdiction: 'Colorado',
    matterDescription: 'The edited transaction.',
    materialsReviewed: ['Edited agreement'],
    resolutionDisposition: 'approved unanimously',
    resolutionTerms: 'the edited transaction',
    secretaryName: 'Taylor Secretary',
  },
  templateKey: 'board_resolution_secretary_certificate',
});

const updateData = buildExecutiveAuthorizationUpdateData(prepared);

assert.equal(updateData.requestFingerprint, buildExecutiveAuthorizationRequestFingerprint(prepared));

console.log('executive authorization update fingerprint tests passed');
