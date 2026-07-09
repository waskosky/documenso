import assert from 'node:assert/strict';

import { renderAuthorizationTemplate } from './render-authorization-template';
import { getAuthorizationTemplate } from './templates';

const template = getAuthorizationTemplate('board_resolution_secretary_certificate');

assert.equal(template.label, 'Board Resolution and Secretary Certificate');

const rendered = renderAuthorizationTemplate({
  templateKey: 'board_resolution_secretary_certificate',
  payload: {
    actionDate: '2026-07-09',
    actionTitle: 'Approval of SAFE Financing',
    authorizedOfficerName: 'Alex Officer',
    authorizedOfficerTitle: 'President',
    companyLegalName: 'Disclosure Comics Inc.',
    consentMethod: 'unanimous written consent',
    directors: [
      {
        name: 'Director One',
        presence: 'Consented',
        vote: 'For',
      },
      {
        name: 'Director Two',
        presence: 'Consented',
        vote: 'For',
      },
      {
        name: 'Director Three',
        presence: 'Consented',
        vote: 'For',
      },
    ],
    entityType: 'corporation',
    investorCondition: 'the closing condition in Section 4.2 of the Simple Agreement for Future Equity',
    jurisdiction: 'Colorado',
    matterDescription:
      'approval of the Company entry into that certain Simple Agreement for Future Equity with Example Investor',
    materialsReviewed: ['SAFE', 'financing summary', 'cap table'],
    resolutionDisposition: 'approved unanimously',
    resolutionTerms:
      'the Company entry into the SAFE with Example Investor for an aggregate purchase amount of $100,000',
    secretaryName: 'Sam Secretary',
  },
});

assert.match(rendered.markdown, /# Board Resolution and Secretary's Certificate/);
assert.match(rendered.markdown, /\*\*Disclosure Comics Inc\.\*\*/);
assert.match(rendered.markdown, /Approval of SAFE Financing/);
assert.match(rendered.markdown, /SAFE/);
assert.match(rendered.markdown, /\| Director One \| Consented \| For \|/);
assert.match(rendered.markdown, /\*\*For:\*\* Director One, Director Two, Director Three/);
assert.match(rendered.markdown, /Name: \*\*Sam Secretary\*\*/);
assert.match(rendered.markdown, /Name: \*\*Alex Officer\*\*/);
assert.match(rendered.markdown, /Title: \*\*President\*\*/);
assert.deepEqual(rendered.signers, [
  {
    email: '',
    name: 'Director One',
    role: 'Director',
    signingOrder: 1,
  },
  {
    email: '',
    name: 'Director Two',
    role: 'Director',
    signingOrder: 2,
  },
  {
    email: '',
    name: 'Director Three',
    role: 'Director',
    signingOrder: 3,
  },
]);
