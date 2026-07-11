import assert from 'node:assert/strict';

import { buildExecutiveAuthorizationCreateData } from './create-executive-authorization';
import { prepareExecutiveAuthorizationRecord } from './prepare-executive-authorization';
import { ZCreateExecutiveAuthorizationSchema } from './schema';

const parsed = ZCreateExecutiveAuthorizationSchema.parse({
  externalId: 'agent-request:example-approval-2026-07-11',
  notes: 'Created through the executive-assistant API.',
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
  templateKey: 'board_resolution_secretary_certificate',
  userId: 1,
});

assert.equal(parsed.externalId, 'agent-request:example-approval-2026-07-11');

const createData = buildExecutiveAuthorizationCreateData({
  parsed,
  prepared: prepareExecutiveAuthorizationRecord(parsed),
});

assert.equal(createData.externalId, parsed.externalId);
assert.match(createData.requestFingerprint ?? '', /^[a-f0-9]{64}$/);
assert.equal(createData.teamId, parsed.teamId);
assert.equal(createData.createdByUserId, parsed.userId);

console.log('executive authorization creation schema tests passed');
