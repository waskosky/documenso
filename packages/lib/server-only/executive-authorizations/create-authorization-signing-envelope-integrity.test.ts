import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./create-authorization-signing-envelope.ts', import.meta.url), 'utf8');

assert.match(source, /withAuthorizationEnvelopeLock/);
assert.match(source, /buildAuthorizationEnvelopeExternalId/);
assert.match(source, /prisma\.envelope\.findFirst/);
assert.match(source, /executiveAuthorization:\s*\{\s*is:\s*null/);
assert.match(source, /assertAuthorizationEnvelopeIntegrity/);
assert.match(source, /templateVersion:\s*authorization\.templateVersion/);
assert.match(source, /generatedDocumentDataId:\s*documentDataId/);
assert.match(source, /documentDataId:\s*documentData\.id/);
assert.ok(
  source.indexOf('prisma.envelope.findFirst') <
    source.indexOf('const uploadedDocumentData = await putPdfFileServerSide'),
  'retry must recover and validate an orphaned envelope before uploading another PDF',
);

console.log('authorization envelope generation integrity wiring tests passed');
