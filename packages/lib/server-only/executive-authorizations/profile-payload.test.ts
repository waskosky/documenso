import assert from 'node:assert/strict';

import { mergeAuthorizationProfilePayload, parseAuthorizationTemplateProfilePayload } from './profile-payload';

const templateKey = 'board_resolution_secretary_certificate' as const;

const stableBoardDefaults = {
  actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
  approvalRequiredCount: 2,
  authorizedOfficerDirectorIndex: 1,
  authorizedOfficerName: 'Director Two',
  authorizedOfficerTitle: 'President',
  companyLegalName: 'Example Company, Inc.',
  directors: [
    {
      email: 'director-one@example.test',
      name: 'Director One',
      presence: 'CONSENTED',
      vote: 'FOR',
    },
    {
      email: 'director-two@example.test',
      name: 'Director Two',
      presence: 'CONSENTED',
      vote: 'FOR',
    },
    {
      email: 'director-three@example.test',
      name: 'Director Three',
      presence: 'CONSENTED',
      vote: 'FOR',
    },
  ],
  entityType: 'corporation',
  equityHolderPlural: 'stockholders',
  governingBodyName: 'Board of Directors',
  governingMemberPlural: 'directors',
  governingMemberSingular: 'director',
  jurisdiction: 'Colorado',
  quorumRequiredCount: 2,
  resolutionDisposition: 'APPROVED_UNANIMOUSLY',
  secretaryDirectorIndex: 0,
  secretaryName: 'Director One',
};

const decisionFields = {
  actionDate: '2026-07-11',
  actionTitle: 'Approve an example transaction',
  certificateDate: '2026-07-12',
  deliveryCondition: 'Section 4.2 closing condition',
  deliveryRecipient: 'Example Investor',
  materialsReviewed: ['Transaction summary', 'Draft agreement'],
  matterDescription: 'Approval of the example transaction.',
  ratifyPriorActions: true,
  specificAction: 'the example transaction',
  specificTerms: 'on the terms presented to the Board',
};

const profile = parseAuthorizationTemplateProfilePayload({
  payload: stableBoardDefaults,
  templateKey,
  templateVersion: 2,
});

assert.equal(profile.companyLegalName, stableBoardDefaults.companyLegalName);
assert.equal(profile.directors.length, 3);
assert.equal(profile.approvalRequiredCount, 2);
assert.equal(profile.quorumRequiredCount, 2);

const merged = mergeAuthorizationProfilePayload({
  payload: decisionFields,
  profilePayload: stableBoardDefaults,
  templateKey,
  templateVersion: 2,
});

assert.equal(merged.companyLegalName, stableBoardDefaults.companyLegalName);
assert.equal(merged.actionTitle, decisionFields.actionTitle);
assert.equal(merged.directors.length, 3);

assert.throws(
  () =>
    mergeAuthorizationProfilePayload({
      payload: {
        ...decisionFields,
        certificateDate: '2026-07-10',
      },
      profilePayload: stableBoardDefaults,
      templateKey,
      templateVersion: 2,
    }),
  /certificate date cannot precede the action date/i,
);

const rejectedBoardDefaults = {
  ...stableBoardDefaults,
  actionMethod: 'MEETING',
  directors: stableBoardDefaults.directors.map((director) => ({
    ...director,
    presence: 'PRESENT',
    vote: 'AGAINST',
  })),
  resolutionDisposition: 'NOT_APPROVED',
};

const rejectedDecisionFields = {
  actionDate: '2026-07-11',
  actionTitle: 'Consider an example transaction',
  certificateDate: '2026-07-12',
  materialsReviewed: ['Transaction summary'],
  matterDescription: 'Consideration of the example transaction.',
  ratifyPriorActions: false,
  specificAction: 'the example transaction',
  specificTerms: 'on the terms presented to the Board',
};

assert.throws(
  () =>
    mergeAuthorizationProfilePayload({
      payload: {
        ...rejectedDecisionFields,
        ratifyPriorActions: true,
      },
      profilePayload: rejectedBoardDefaults,
      templateKey,
      templateVersion: 2,
    }),
  /not-approved decision cannot ratify prior actions/i,
);

assert.throws(
  () =>
    mergeAuthorizationProfilePayload({
      payload: {
        ...rejectedDecisionFields,
        deliveryCondition: 'a closing condition',
        deliveryRecipient: 'Example Investor',
      },
      profilePayload: rejectedBoardDefaults,
      templateKey,
      templateVersion: 2,
    }),
  /not-approved decision cannot authorize document delivery/i,
);

const overridden = mergeAuthorizationProfilePayload({
  payload: {
    ...decisionFields,
    companyLegalName: 'One-Time Subsidiary, Inc.',
  },
  profilePayload: stableBoardDefaults,
  templateKey,
  templateVersion: 2,
});

assert.equal(overridden.companyLegalName, 'One-Time Subsidiary, Inc.');

assert.throws(
  () =>
    mergeAuthorizationProfilePayload({
      payload: {
        ...decisionFields,
        deliveryCondition: undefined,
      },
      profilePayload: stableBoardDefaults,
      templateKey,
      templateVersion: 2,
    }),
  /deliveryRecipient.*deliveryCondition/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        directors: stableBoardDefaults.directors.slice(0, 2),
      },
      templateKey,
      templateVersion: 2,
    }),
  /exactly 3 Director signers/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        directors: stableBoardDefaults.directors.map((director, index) =>
          index === 1 ? { ...director, email: '' } : director,
        ),
      },
      templateKey,
      templateVersion: 2,
    }),
  /Director 2.*email address/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        directors: stableBoardDefaults.directors.map((director, index) => {
          if (index !== 1) {
            return director;
          }

          const { email: _email, ...withoutEmail } = director;

          return withoutEmail;
        }),
      },
      templateKey,
      templateVersion: 2,
    }),
  /Director 2.*email address/i,
);

for (const duplicateEmail of [
  stableBoardDefaults.directors[0].email,
  stableBoardDefaults.directors[0].email.toUpperCase(),
  ` ${stableBoardDefaults.directors[0].email} `,
]) {
  assert.throws(
    () =>
      parseAuthorizationTemplateProfilePayload({
        payload: {
          ...stableBoardDefaults,
          directors: stableBoardDefaults.directors.map((director, index) =>
            index === 1 ? { ...director, email: duplicateEmail } : director,
          ),
        },
        templateKey,
        templateVersion: 2,
      }),
    /unique email address/i,
  );
}

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        secretaryDirectorIndex: 3,
      },
      templateKey,
      templateVersion: 2,
    }),
  /secretaryDirectorIndex/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        secretaryName: 'Someone Else',
      },
      templateKey,
      templateVersion: 2,
    }),
  /Secretary name must match Director 1/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        authorizedOfficerName: 'Someone Else',
      },
      templateKey,
      templateVersion: 2,
    }),
  /Authorized officer name must match Director 2/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        directors: stableBoardDefaults.directors.map((director, index) =>
          index === 2 ? { ...director, vote: 'AGAINST' } : director,
        ),
      },
      templateKey,
      templateVersion: 2,
    }),
  /unanimous written consent requires every director to vote FOR/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        actionMethod: 'MEETING',
        directors: stableBoardDefaults.directors.map((director, index) => ({
          ...director,
          presence: index === 0 ? 'PRESENT' : 'ABSENT',
          vote: index === 0 ? 'FOR' : 'AGAINST',
        })),
        resolutionDisposition: 'NOT_APPROVED',
      },
      templateKey,
      templateVersion: 2,
    }),
  /quorum requires 2 directors marked PRESENT/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        resolutionDisposition: 'NOT_APPROVED',
      },
      templateKey,
      templateVersion: 2,
    }),
  /not-approved disposition requires fewer than 2 qualifying FOR votes/i,
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        actionMethod: 'MEETING',
        directors: stableBoardDefaults.directors.map((director) => ({
          ...director,
          presence: 'PRESENT',
          vote: 'AGAINST',
        })),
        resolutionDisposition: 'APPROVED_REQUIRED_VOTE',
      },
      templateKey,
      templateVersion: 2,
    }),
  /approval requires at least 2 FOR votes/i,
);

assert.doesNotThrow(() =>
  parseAuthorizationTemplateProfilePayload({
    payload: {
      ...stableBoardDefaults,
      actionMethod: 'WRITTEN_CONSENT',
      directors: stableBoardDefaults.directors.map((director, index) => ({
        ...director,
        presence: index < 2 ? 'CONSENTED' : 'ABSENT',
        vote: index < 2 ? 'FOR' : 'NOT_VOTING',
      })),
      resolutionDisposition: 'APPROVED_REQUIRED_VOTE',
    },
    templateKey,
    templateVersion: 2,
  }),
);

assert.throws(
  () =>
    parseAuthorizationTemplateProfilePayload({
      payload: {
        ...stableBoardDefaults,
        actionMethod: 'WRITTEN_CONSENT',
        directors: stableBoardDefaults.directors.map((director, index) => ({
          ...director,
          presence: index < 2 ? 'CONSENTED' : 'ABSENT',
          vote: index < 2 ? 'FOR' : 'AGAINST',
        })),
        resolutionDisposition: 'APPROVED_REQUIRED_VOTE',
      },
      templateKey,
      templateVersion: 2,
    }),
  /director marked ABSENT must use the NOT_VOTING vote/i,
);

console.log('authorization profile payload tests passed');
