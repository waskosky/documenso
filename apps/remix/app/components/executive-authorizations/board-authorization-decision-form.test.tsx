import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { BoardAuthorizationDecisionForm } from './board-authorization-decision-form';

const approvedHtml = renderToStaticMarkup(
  <BoardAuthorizationDecisionForm
    defaultValues={{
      actionDate: '2026-07-15',
      certificateDate: '2026-07-16',
      materialsReviewed: ['Board memorandum', 'Draft agreement'],
      ratifyPriorActions: true,
    }}
    externalId="board-web-test"
    resolutionDisposition="APPROVED_UNANIMOUSLY"
  />,
);

for (const name of [
  'externalId',
  'actionDate',
  'certificateDate',
  'actionTitle',
  'matterDescription',
  'materialsReviewed',
  'specificAction',
  'specificTerms',
  'deliveryRecipient',
  'deliveryCondition',
  'ratifyPriorActions',
  'notes',
]) {
  assert.match(approvedHtml, new RegExp(`name="${name}"`));
}

for (const name of [
  'companyLegalName',
  'jurisdiction',
  'entityType',
  'actionMethod',
  'quorumRequiredCount',
  'approvalRequiredCount',
  'resolutionDisposition',
  'authorizedOfficerTitle',
  'authorizedOfficerDirectorIndex',
  'secretaryDirectorIndex',
  'signer-director-0-name',
  'signer-director-0-email',
]) {
  assert.doesNotMatch(approvedHtml, new RegExp(`name="${name}"`));
}

assert.match(approvedHtml, /value="board-web-test"/);
assert.match(approvedHtml, /Board memorandum\nDraft agreement/);
assert.match(approvedHtml, /name="ratifyPriorActions"[^>]*checked=""/);

const rejectedHtml = renderToStaticMarkup(
  <BoardAuthorizationDecisionForm externalId="board-web-rejected" resolutionDisposition="NOT_APPROVED" />,
);

assert.doesNotMatch(rejectedHtml, /name="deliveryRecipient"/);
assert.doesNotMatch(rejectedHtml, /name="deliveryCondition"/);
assert.doesNotMatch(rejectedHtml, /name="ratifyPriorActions"/);

console.log('board authorization decision form tests passed');
