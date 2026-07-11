import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(process.cwd());
const mutationFiles = [
  'packages/lib/server-only/document-meta/upsert-document-meta.ts',
  'packages/lib/server-only/envelope/update-envelope.ts',
  'packages/lib/server-only/field/create-envelope-fields.ts',
  'packages/lib/server-only/field/delete-document-field.ts',
  'packages/lib/server-only/field/set-fields-for-document.ts',
  'packages/lib/server-only/field/update-envelope-fields.ts',
  'packages/lib/server-only/recipient/create-envelope-recipients.ts',
  'packages/lib/server-only/recipient/delete-envelope-recipient.ts',
  'packages/lib/server-only/recipient/set-document-recipients.ts',
  'packages/lib/server-only/recipient/update-envelope-recipients.ts',
  'packages/trpc/server/envelope-router/create-envelope-items.ts',
  'packages/trpc/server/envelope-router/delete-envelope-item.ts',
  'packages/trpc/server/envelope-router/envelope-fields/delete-envelope-field.ts',
  'packages/trpc/server/envelope-router/update-envelope-items.ts',
];

for (const file of mutationFiles) {
  const source = readFileSync(path.join(repositoryRoot, file), 'utf8');

  assert.match(
    source,
    /assertAuthorizationEnvelopeMutationAllowed/,
    `${file} must join the authorization envelope mutation lock`,
  );
}

console.log('legacy authorization envelope mutation wiring tests passed');
