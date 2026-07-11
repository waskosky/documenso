import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./create-authorization-signing-envelope.ts', import.meta.url), 'utf8');

assert.match(source, /withAuthorizationEnvelopeLock/);
assert.match(source, /templateVersion:\s*authorization\.templateVersion/);
assert.match(source, /generatedDocumentDataId:\s*documentData\.id/);

console.log('authorization envelope generation integrity wiring tests passed');
