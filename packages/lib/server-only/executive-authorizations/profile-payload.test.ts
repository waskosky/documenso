import assert from 'node:assert/strict';

import { mergeAuthorizationProfilePayload, parseAuthorizationTemplateProfilePayload } from './profile-payload';

const templateKey = 'board_resolution_secretary_certificate' as const;

const stableBoardDefaults = {
  authorizedOfficerName: 'Morgan Officer',
  authorizedOfficerTitle: 'President',
  companyLegalName: 'Example Company, Inc.',
  consentMethod: 'unanimous written consent',
  directors: [
    {
      email: 'director-one@example.test',
      name: 'Director One',
      presence: 'Consented',
      vote: 'For',
    },
    {
      email: 'director-two@example.test',
      name: 'Director Two',
      presence: 'Consented',
      vote: 'For',
    },
    {
      email: 'director-three@example.test',
      name: 'Director Three',
      presence: 'Consented',
      vote: 'For',
    },
  ],
  entityType: 'corporation',
  jurisdiction: 'Colorado',
  resolutionDisposition: 'approved unanimously',
  secretaryName: 'Taylor Secretary',
};

const decisionFields = {
  actionDate: '2026-07-11',
  actionTitle: 'Approve an example transaction',
  investorCondition: 'Section 4.2 closing condition',
  materialsReviewed: ['Transaction summary', 'Draft agreement'],
  matterDescription: 'Approval of the example transaction.',
  resolutionTerms: 'the example transaction on the terms presented to the Board',
};

const profile = parseAuthorizationTemplateProfilePayload({
  payload: stableBoardDefaults,
  templateKey,
});

assert.equal(profile.companyLegalName, stableBoardDefaults.companyLegalName);
assert.equal(profile.directors.length, 3);

const merged = mergeAuthorizationProfilePayload({
  payload: decisionFields,
  profilePayload: stableBoardDefaults,
  templateKey,
});

assert.equal(merged.companyLegalName, stableBoardDefaults.companyLegalName);
assert.equal(merged.actionTitle, decisionFields.actionTitle);
assert.equal(merged.directors.length, 3);

const overridden = mergeAuthorizationProfilePayload({
  payload: {
    ...decisionFields,
    companyLegalName: 'One-Time Subsidiary, Inc.',
  },
  profilePayload: stableBoardDefaults,
  templateKey,
});

assert.equal(overridden.companyLegalName, 'One-Time Subsidiary, Inc.');

assert.throws(
  () =>
    mergeAuthorizationProfilePayload({
      payload: {
        ...decisionFields,
        investorCondition: undefined,
      },
      profilePayload: stableBoardDefaults,
      templateKey,
    }),
  /investorCondition/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        directors: stableBoardDefaults.directors.slice(0, 2),
      },
      templateKey,
    }),
  /exactly 3 Director signers/i,
);

console.log('authorization profile payload tests passed');
