import assert from 'node:assert/strict';

import { ExecutiveAuthorizationStatus, ExecutiveAuthorizationType } from '@prisma/client';

import { prepareExecutiveAuthorizationRecord } from './prepare-executive-authorization';

const prepared = prepareExecutiveAuthorizationRecord({
  notes: 'Send after legal review.',
  payload: {
    actionDate: '2026-07-09',
    actionTitle: 'Approval of SAFE Financing',
    authorizedOfficerName: 'Alex Officer',
    authorizedOfficerTitle: 'President',
    companyLegalName: 'Disclosure Comics Inc.',
    consentMethod: 'unanimous written consent',
    directors: [
      {
        email: 'one@example.com',
        name: 'Director One',
        presence: 'Consented',
        vote: 'For',
      },
      {
        email: 'two@example.com',
        name: 'Director Two',
        presence: 'Consented',
        vote: 'For',
      },
      {
        email: 'three@example.com',
        name: 'Director Three',
        presence: 'Consented',
        vote: 'For',
      },
    ],
    entityType: 'corporation',
    investorCondition: 'the investor closing condition',
    jurisdiction: 'Colorado',
    matterDescription: 'approval of a financing transaction',
    materialsReviewed: ['SAFE', 'cap table'],
    resolutionDisposition: 'approved unanimously',
    resolutionTerms: 'the SAFE financing transaction',
    secretaryName: 'Sam Secretary',
  },
  templateKey: 'board_resolution_secretary_certificate',
});

assert.equal(prepared.companyLegalName, 'Disclosure Comics Inc.');
assert.equal(prepared.title, 'Approval of SAFE Financing');
assert.equal(prepared.templateKey, 'board_resolution_secretary_certificate');
assert.equal(prepared.templateVersion, 1);
assert.equal(prepared.type, ExecutiveAuthorizationType.BOARD_RESOLUTION);
assert.equal(prepared.status, ExecutiveAuthorizationStatus.DRAFT);
assert.equal(prepared.notes, 'Send after legal review.');
assert.equal(prepared.actionDate?.toISOString(), '2026-07-09T00:00:00.000Z');
assert.match(prepared.renderedMarkdown, /approval of a financing transaction/);
assert.deepEqual(prepared.signers, [
  {
    email: 'one@example.com',
    name: 'Director One',
    role: 'Director',
    signingOrder: 1,
  },
  {
    email: 'two@example.com',
    name: 'Director Two',
    role: 'Director',
    signingOrder: 2,
  },
  {
    email: 'three@example.com',
    name: 'Director Three',
    role: 'Director',
    signingOrder: 3,
  },
]);
