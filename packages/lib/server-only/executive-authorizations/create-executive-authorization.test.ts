import assert from 'node:assert/strict';

import { buildExecutiveAuthorizationCreateData } from './create-executive-authorization';
import { prepareExecutiveAuthorizationRecord } from './prepare-executive-authorization';
import { ZCreateExecutiveAuthorizationSchema } from './schema';

const parsed = ZCreateExecutiveAuthorizationSchema.parse({
  externalId: 'agent-request:example-approval-2026-07-11',
  notes: 'Created through the executive-assistant API.',
  payload: {
    actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
    actionDate: '2026-07-11',
    actionTitle: 'Approve example transaction',
    approvalRequiredCount: 2,
    authorizedOfficerDirectorIndex: 1,
    authorizedOfficerName: 'Director Two',
    authorizedOfficerTitle: 'President',
    certificateDate: '2026-07-12',
    companyLegalName: 'Example Company, Inc.',
    deliveryCondition: 'Section 4.2 closing condition',
    deliveryRecipient: 'Example Investor',
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
    matterDescription: 'Approval of an example transaction.',
    materialsReviewed: ['Transaction summary'],
    ratifyPriorActions: true,
    quorumRequiredCount: 2,
    resolutionDisposition: 'APPROVED_UNANIMOUSLY',
    secretaryDirectorIndex: 0,
    secretaryName: 'Director One',
    specificAction: 'the example transaction',
    specificTerms: 'on the terms presented to the Board',
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

assert.throws(
  () =>
    prepareExecutiveAuthorizationRecord({
      ...parsed,
      payload: {
        ...parsed.payload,
        certificateDate: '2026-02-31',
      },
    }),
  /Certificate date must be a valid date/i,
);

console.log('executive authorization creation schema tests passed');
