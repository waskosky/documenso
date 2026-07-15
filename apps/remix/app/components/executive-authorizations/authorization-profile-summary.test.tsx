import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AuthorizationProfileSummary } from './authorization-profile-summary';

const html = renderToStaticMarkup(
  <AuthorizationProfileSummary
    profile={{
      actionMethod: 'UNANIMOUS_WRITTEN_CONSENT',
      approvalRequiredCount: 2,
      authorizedOfficerDirectorIndex: 1,
      authorizedOfficerName: 'Director Two',
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
      secretaryDirectorIndex: 0,
      secretaryName: 'Director One',
    }}
  />,
);

for (const content of [
  'Example Company, Inc.',
  'Colorado corporation',
  'Unanimous written consent',
  'Approved unanimously',
  '2 of 3 directors',
  'Director One',
  'one@example.test',
  'Director Two',
  'two@example.test',
  'Director Three',
  'three@example.test',
  'Secretary',
  'Authorized officer',
  'President',
]) {
  assert.match(html, new RegExp(content));
}

for (const name of ['companyLegalName', 'resolutionDisposition', 'signer-director-0-email']) {
  assert.doesNotMatch(html, new RegExp(`name="${name}"`));
}

console.log('authorization profile summary tests passed');
