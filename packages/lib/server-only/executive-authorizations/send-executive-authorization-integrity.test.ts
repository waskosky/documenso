import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./send-executive-authorization.ts', import.meta.url), 'utf8');
const lockCall = source.lastIndexOf('await withAuthorizationEnvelopeLock');
const integrityCall = source.lastIndexOf('await assertAuthorizationEnvelopeIntegrity');
const sendCall = source.indexOf('await sendDocument');

assert.ok(integrityCall >= 0, 'send flow must assert authorization envelope integrity');
assert.ok(lockCall >= 0, 'send flow must hold the authorization envelope lock');
assert.ok(sendCall >= 0, 'send flow must call Documenso sendDocument');
assert.ok(integrityCall < sendCall, 'integrity assertion must run before Documenso sendDocument');
assert.ok(lockCall < integrityCall, 'authorization envelope lock must be acquired before integrity validation');
assert.match(source, /generatedDocumentDataId:\s*true/);
assert.match(source, /envelopeItems:\s*{/);
assert.match(source, /envelopeItemId:\s*true/);
assert.match(source, /formValues:\s*true/);

console.log('executive authorization send integrity wiring tests passed');
