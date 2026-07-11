import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AuthorizationProfileForm } from './authorization-profile-form';

const html = renderToStaticMarkup(
  <AuthorizationProfileForm
    defaultValues={{
      actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
      approvalRequiredCount: 2,
      authorizedOfficerDirectorIndex: 0,
      authorizedOfficerName: 'Director One',
      authorizedOfficerTitle: 'President',
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
      quorumRequiredCount: 2,
      resolutionDisposition: 'APPROVED_UNANIMOUSLY',
      secretaryDirectorIndex: 1,
      secretaryName: 'Director Two',
    }}
    signerRoles={[
      {
        key: 'director',
        label: 'Director',
        maxCount: 3,
        minCount: 3,
        required: true,
      },
    ]}
  />,
);

assert.match(html, /Example Company, Inc\./);
assert.match(html, /Director 1 name/);
assert.match(html, /Director 2 name/);
assert.match(html, /Director 3 name/);
assert.match(html, /signer-director-0-email/);
assert.match(html, /signer-director-1-email/);
assert.match(html, /signer-director-2-email/);
assert.match(html, /name="actionMethod"/);
assert.match(html, /name="approvalRequiredCount"/);
assert.match(html, /name="governingBodyName"/);
assert.match(html, /name="governingMemberSingular"/);
assert.match(html, /name="governingMemberPlural"/);
assert.match(html, /name="equityHolderPlural"/);
assert.match(html, /name="secretaryDirectorIndex"/);
assert.match(html, /name="authorizedOfficerDirectorIndex"/);
assert.match(html, /name="resolutionDisposition"/);
assert.match(html, /name="quorumRequiredCount"/);
assert.match(html, /list="entityType-options"/);
assert.doesNotMatch(html, /name="secretaryName"/);
assert.doesNotMatch(html, /name="authorizedOfficerName"/);
assert.match(html, /value="ABSENT"/);
assert.match(html, /value="CONSENTED"/);
assert.match(html, /value="PRESENT"/);
assert.match(html, /value="ABSTAIN"/);
assert.match(html, /value="AGAINST"/);
assert.match(html, /value="FOR"/);
assert.match(html, /value="NOT_VOTING"/);
assert.match(html, /value="RECUSED"/);

console.log('authorization profile form tests passed');
