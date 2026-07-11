import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { renderAuthorizationTemplate } from './render-authorization-template';
import { getAuthorizationTemplate } from './templates';

const template = getAuthorizationTemplate('board_resolution_secretary_certificate');

assert.equal(template.label, 'Board Resolution and Secretary Certificate');
assert.equal(template.version, 2);
assert.equal(getAuthorizationTemplate('board_resolution_secretary_certificate', 1).version, 1);

const legacyRendered = renderAuthorizationTemplate({
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 1,
  payload: {
    actionDate: '2026-07-09',
    actionTitle: 'Legacy Approval',
    authorizedOfficerName: 'Legacy Officer',
    authorizedOfficerTitle: 'President',
    companyLegalName: 'Legacy Company, Inc.',
    consentMethod: 'unanimous written consent',
    directors: [
      { email: 'one@example.test', name: 'Director One', presence: 'Consented', vote: 'For' },
      { email: 'two@example.test', name: 'Director Two', presence: 'Consented', vote: 'For' },
      { email: 'three@example.test', name: 'Director Three', presence: 'Consented', vote: 'For' },
    ],
    entityType: 'corporation',
    investorCondition: 'Legacy closing condition',
    jurisdiction: 'Colorado',
    materialsReviewed: ['Legacy agreement'],
    matterDescription: 'Legacy matter.',
    resolutionDisposition: 'approved unanimously',
    resolutionTerms: 'the legacy transaction',
    secretaryName: 'Legacy Secretary',
  },
});

assert.equal(
  createHash('sha256').update(legacyRendered.markdown).digest('hex'),
  '8ac99903ee09834e3e765578635e3c4f73e6da2313220f8e79642e9b9c7554d8',
);

const rendered = renderAuthorizationTemplate({
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
  payload: {
    actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
    actionDate: '2026-07-09',
    actionTitle: 'Approval of SAFE Financing',
    approvalRequiredCount: 2,
    authorizedOfficerDirectorIndex: 1,
    authorizedOfficerName: 'Director Two',
    authorizedOfficerTitle: 'President',
    certificateDate: '2026-07-10',
    companyLegalName: 'Disclosure Comics Inc.',
    deliveryCondition: 'Section 4.2 of the Simple Agreement for Future Equity',
    deliveryRecipient: 'Example Investor',
    directors: [
      {
        email: 'one@example.test',
        name: 'Director One',
        presence: 'CONSENTED',
        vote: 'FOR',
      },
      {
        email: 'two@example.test',
        name: 'Director Two',
        presence: 'CONSENTED',
        vote: 'FOR',
      },
      {
        email: 'three@example.test',
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
    matterDescription:
      'approval of the Company entry into that certain Simple Agreement for Future Equity with Example Investor',
    materialsReviewed: ['SAFE', 'financing summary', 'cap table'],
    ratifyPriorActions: true,
    quorumRequiredCount: 2,
    resolutionDisposition: 'APPROVED_UNANIMOUSLY',
    secretaryDirectorIndex: 0,
    secretaryName: 'Director One',
    specificAction: 'the Company entry into the SAFE with Example Investor',
    specificTerms: 'an aggregate purchase amount of $100,000 and the documents presented to the Board',
  },
});

assert.match(rendered.markdown, /# Board Resolution and Secretary's Certificate/);
assert.match(rendered.markdown, /\*\*Disclosure Comics Inc\.\*\*/);
assert.match(rendered.markdown, /Approval of SAFE Financing/);
assert.match(rendered.markdown, /SAFE/);
assert.match(rendered.markdown, /\| Director One \| Consented \| For \|/);
assert.match(rendered.markdown, /\*\*For:\*\* Director One, Director Two, Director Three/);
assert.match(rendered.markdown, /All directors consented in writing\./);
assert.match(rendered.markdown, /approves and authorizes \*\*the Company entry into the SAFE/);
assert.match(rendered.markdown, /including without limitation \*\*an aggregate purchase amount/);
assert.match(rendered.markdown, /deliver.*to \*\*Example Investor\*\*.*Section 4\.2/s);
assert.match(rendered.markdown, /actions previously taken.*ratified/s);
assert.match(rendered.markdown, /on \*\*2026-07-09\*\* by \*\*unanimous written consent\*\*/);
assert.match(rendered.markdown, /Certificate Date: \*\*2026-07-10\*\*/);
assert.match(rendered.markdown, /Secretary signature and execution date by \*\*Director One\*\*/);
assert.match(rendered.markdown, /Authorized Officer acknowledgment by \*\*Director Two, President\*\*/);
assert.doesNotMatch(rendered.markdown, /By: _+/);
assert.doesNotMatch(rendered.markdown, /\| Director \| Signature \| Date \|/);
assert.deepEqual(rendered.signers, [
  {
    email: 'one@example.test',
    executionRoles: ['Secretary'],
    name: 'Director One',
    role: 'Director',
    signingOrder: 1,
  },
  {
    email: 'two@example.test',
    executionRoles: ['Authorized Officer'],
    name: 'Director Two',
    role: 'Director',
    signingOrder: 2,
  },
  {
    email: 'three@example.test',
    executionRoles: [],
    name: 'Director Three',
    role: 'Director',
    signingOrder: 3,
  },
]);

const withoutOptionalClauses = renderAuthorizationTemplate({
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
  payload: {
    actionMethod: 'MEETING',
    actionDate: '2026-07-09',
    actionTitle: 'Appoint an officer',
    approvalRequiredCount: 1,
    authorizedOfficerDirectorIndex: 1,
    authorizedOfficerName: 'Manager Two',
    authorizedOfficerTitle: 'President',
    certificateDate: '2026-07-09',
    companyLegalName: 'Example LLC',
    directors: [
      { email: 'one@example.test', name: 'Manager One', presence: 'PRESENT', vote: 'FOR' },
      { email: 'two@example.test', name: 'Manager Two', presence: 'PRESENT', vote: 'AGAINST' },
      { email: 'three@example.test', name: 'Manager Three', presence: 'PRESENT', vote: 'ABSTAIN' },
    ],
    entityType: 'limited liability company',
    equityHolderPlural: 'members',
    governingBodyName: 'Board of Managers',
    governingMemberPlural: 'managers',
    governingMemberSingular: 'manager',
    jurisdiction: 'Colorado',
    materialsReviewed: [],
    matterDescription: 'Appointment of an officer.',
    ratifyPriorActions: false,
    quorumRequiredCount: 2,
    resolutionDisposition: 'APPROVED_REQUIRED_VOTE',
    secretaryDirectorIndex: 0,
    secretaryName: 'Manager One',
    specificAction: 'the appointment of an officer',
    specificTerms: '',
  },
});

assert.match(withoutOptionalClauses.markdown, /Board of Managers/);
assert.match(
  withoutOptionalClauses.markdown,
  /A quorum of the Board of Managers was present \(3 present; 2 required\)\./,
);
assert.match(withoutOptionalClauses.markdown, /\*\*Against:\*\* Manager Two/);
assert.match(withoutOptionalClauses.markdown, /\*\*Abstained:\*\* Manager Three/);
assert.doesNotMatch(withoutOptionalClauses.markdown, /in satisfaction of/);
assert.doesNotMatch(withoutOptionalClauses.markdown, /actions previously taken/);

const rejectedProposal = renderAuthorizationTemplate({
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
  payload: {
    actionMethod: 'MEETING',
    actionDate: '2026-07-09',
    actionTitle: 'Consider proposed transaction',
    approvalRequiredCount: 2,
    authorizedOfficerDirectorIndex: 1,
    authorizedOfficerName: 'Director Two',
    authorizedOfficerTitle: 'President',
    certificateDate: '2026-07-10',
    companyLegalName: 'Example Company, Inc.',
    directors: [
      { email: 'one@example.test', name: 'Director One', presence: 'PRESENT', vote: 'AGAINST' },
      { email: 'two@example.test', name: 'Director Two', presence: 'PRESENT', vote: 'AGAINST' },
      { email: 'three@example.test', name: 'Director Three', presence: 'PRESENT', vote: 'ABSTAIN' },
    ],
    entityType: 'corporation',
    equityHolderPlural: 'stockholders',
    governingBodyName: 'Board of Directors',
    governingMemberPlural: 'directors',
    governingMemberSingular: 'director',
    jurisdiction: 'Colorado',
    materialsReviewed: ['Transaction summary'],
    matterDescription: 'The proposed transaction.',
    ratifyPriorActions: false,
    quorumRequiredCount: 2,
    resolutionDisposition: 'NOT_APPROVED',
    secretaryDirectorIndex: 0,
    secretaryName: 'Director One',
    specificAction: 'the proposed transaction',
    specificTerms: '',
  },
});

assert.match(rejectedProposal.markdown, /considered whether approval.*best interests/s);
assert.match(rejectedProposal.markdown, /proposed resolutions.*were not adopted/s);
assert.doesNotMatch(rejectedProposal.markdown, /remain in full force and effect/);
assert.match(rejectedProposal.markdown, /acknowledge this record and their respective votes/);
assert.doesNotMatch(rejectedProposal.markdown, /FURTHER RESOLVED/);
assert.doesNotMatch(rejectedProposal.markdown, /hereby approves and authorizes/);
assert.doesNotMatch(rejectedProposal.markdown, /authorized and directed/);
assert.match(rejectedProposal.markdown, /No authorization, ratification, or delivery authority was granted/);

const ratifiedLlcAction = renderAuthorizationTemplate({
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 2,
  payload: {
    actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
    actionDate: '2026-07-09',
    actionTitle: 'Ratify LLC action',
    approvalRequiredCount: 2,
    authorizedOfficerDirectorIndex: 1,
    authorizedOfficerName: 'Manager Two',
    authorizedOfficerTitle: 'President',
    certificateDate: '2026-07-09',
    companyLegalName: 'Example LLC',
    directors: [
      { email: 'one@example.test', name: 'Manager One', presence: 'CONSENTED', vote: 'FOR' },
      { email: 'two@example.test', name: 'Manager Two', presence: 'CONSENTED', vote: 'FOR' },
      { email: 'three@example.test', name: 'Manager Three', presence: 'CONSENTED', vote: 'FOR' },
    ],
    entityType: 'limited liability company',
    equityHolderPlural: 'members',
    governingBodyName: 'Board of Managers',
    governingMemberPlural: 'managers',
    governingMemberSingular: 'manager',
    jurisdiction: 'Colorado',
    materialsReviewed: [],
    matterDescription: 'Ratification of an LLC action.',
    quorumRequiredCount: 2,
    ratifyPriorActions: true,
    resolutionDisposition: 'APPROVED_UNANIMOUSLY',
    secretaryDirectorIndex: 0,
    secretaryName: 'Manager One',
    specificAction: 'the LLC action',
    specificTerms: '',
  },
});

assert.match(ratifiedLlcAction.markdown, /any officer, manager, employee, or authorized representative/);
assert.doesNotMatch(ratifiedLlcAction.markdown, /manager, manager/);
