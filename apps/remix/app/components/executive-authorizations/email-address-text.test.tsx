import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { EmailAddressText } from './email-address-text';

const email = 'mike@disclosurecomics.com';
const html = renderToStaticMarkup(<EmailAddressText email={email} />);

assert.ok(!html.includes(email));
assert.ok(html.includes('mike'));
assert.ok(html.includes('@'));
assert.ok(html.includes('disclosurecomics.com'));

console.log('email address text tests passed');
