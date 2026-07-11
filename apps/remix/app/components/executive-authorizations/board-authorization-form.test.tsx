import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { BoardAuthorizationForm } from './board-authorization-form';

const signerRoles = [
  {
    key: 'director',
    label: 'Director',
    maxCount: 3,
    minCount: 3,
    required: true,
  },
];

const v2Html = renderToStaticMarkup(
  <BoardAuthorizationForm
    defaultValues={{
      actionDate: '2026-07-11',
      actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
      actionTitle: 'Approve transaction',
      approvalRequiredCount: 2,
      authorizedOfficerDirectorIndex: 0,
      authorizedOfficerName: 'Director One',
      authorizedOfficerTitle: 'President',
      certificateDate: '2026-07-12',
      companyLegalName: 'Example Company, Inc.',
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
      materialsReviewed: ['Transaction summary'],
      matterDescription: 'Review the transaction.',
      ratifyPriorActions: true,
      quorumRequiredCount: 2,
      resolutionDisposition: 'APPROVED_UNANIMOUSLY',
      secretaryDirectorIndex: 1,
      secretaryName: 'Director Two',
      specificAction: 'the transaction',
      specificTerms: 'on the reviewed terms',
    }}
    signerRoles={signerRoles}
    templateVersion={2}
  />,
);

for (const name of [
  'actionDate',
  'actionMethod',
  'actionTitle',
  'approvalRequiredCount',
  'authorizedOfficerDirectorIndex',
  'authorizedOfficerTitle',
  'certificateDate',
  'companyLegalName',
  'deliveryCondition',
  'deliveryRecipient',
  'entityType',
  'equityHolderPlural',
  'governingBodyName',
  'governingMemberPlural',
  'governingMemberSingular',
  'jurisdiction',
  'materialsReviewed',
  'matterDescription',
  'ratifyPriorActions',
  'quorumRequiredCount',
  'resolutionDisposition',
  'secretaryDirectorIndex',
  'specificAction',
  'specificTerms',
]) {
  assert.match(v2Html, new RegExp(`name="${name}"`));
}

assert.doesNotMatch(v2Html, /name="resolutionTerms"/);
assert.doesNotMatch(v2Html, /name="investorCondition"/);
assert.doesNotMatch(v2Html, /name="secretaryName"/);
assert.doesNotMatch(v2Html, /name="authorizedOfficerName"/);
assert.match(v2Html, /list="entityType-options"/);
assert.match(v2Html, /name="signer-director-2-email"/);
assert.match(v2Html, /type="checkbox"/);

const v1Html = renderToStaticMarkup(
  <BoardAuthorizationForm
    defaultValues={{
      actionDate: '2026-07-10',
      actionTitle: 'Legacy action',
      investorCondition: 'Legacy condition',
      resolutionTerms: 'Legacy resolution terms',
    }}
    signerRoles={signerRoles}
    templateVersion={1}
  />,
);

assert.match(v1Html, /name="consentMethod"/);
assert.match(v1Html, /name="resolutionTerms"/);
assert.match(v1Html, /name="investorCondition"/);
assert.doesNotMatch(v1Html, /name="certificateDate"/);

console.log('board authorization form tests passed');
