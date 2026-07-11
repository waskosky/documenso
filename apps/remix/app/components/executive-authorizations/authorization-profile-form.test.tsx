import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AuthorizationProfileForm } from './authorization-profile-form';

const html = renderToStaticMarkup(
  <AuthorizationProfileForm
    defaultValues={{
      companyLegalName: 'Example Company, Inc.',
      directors: [
        { email: 'one@example.test', name: 'Director One', presence: 'Consented', vote: 'For' },
        { email: 'two@example.test', name: 'Director Two', presence: 'Consented', vote: 'For' },
        { email: 'three@example.test', name: 'Director Three', presence: 'Consented', vote: 'For' },
      ],
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

console.log('authorization profile form tests passed');
