import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./send-executive-authorization.ts', import.meta.url), 'utf8');
const integrityCall = source.lastIndexOf('await assertAuthorizationEnvelopeIntegrity');
const sendCall = source.indexOf('await sendDocument');

assert.ok(integrityCall >= 0, 'send flow must assert authorization envelope integrity');
assert.ok(sendCall >= 0, 'send flow must call Documenso sendDocument');
assert.ok(integrityCall < sendCall, 'integrity assertion must run before Documenso sendDocument');

console.log('executive authorization send integrity wiring tests passed');
