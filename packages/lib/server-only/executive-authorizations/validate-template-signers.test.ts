import assert from 'node:assert/strict';

import { validateAuthorizationTemplateSigners } from './validate-template-signers';

const templateKey = 'board_resolution_secretary_certificate' as const;

const signers = [
  { email: 'one@example.test', name: 'Director One', role: 'Director', signingOrder: 1 },
  { email: 'two@example.test', name: 'Director Two', role: 'Director', signingOrder: 2 },
  { email: 'three@example.test', name: 'Director Three', role: 'Director', signingOrder: 3 },
];

assert.doesNotThrow(() =>
  validateAuthorizationTemplateSigners({
    signers,
    templateKey,
  }),
);

for (const invalidCount of [1, 2, 4]) {
  const invalidSigners =
    invalidCount <= signers.length
      ? signers.slice(0, invalidCount)
      : [...signers, { email: 'four@example.test', name: 'Director Four', role: 'Director', signingOrder: 4 }];

  assert.throws(
    () =>
      validateAuthorizationTemplateSigners({
        signers: invalidSigners,
        templateKey,
      }),
    /exactly 3 Director signers/i,
  );
}

assert.throws(
  () =>
    validateAuthorizationTemplateSigners({
      signers: [{ ...signers[0], email: '' }, signers[1], signers[2]],
      templateKey,
    }),
  /Director One.*email address/i,
);

assert.throws(
  () =>
    validateAuthorizationTemplateSigners({
      signers: [{ ...signers[0], name: '' }, signers[1], signers[2]],
      templateKey,
    }),
  /Signer 1.*name/i,
);

assert.throws(
  () =>
    validateAuthorizationTemplateSigners({
      signers: [{ ...signers[0], role: 'Secretary' }, signers[1], signers[2]],
      templateKey,
    }),
  /unexpected signer role.*Secretary/i,
);

for (const duplicateEmail of ['one@example.test', 'ONE@EXAMPLE.TEST', ' one@example.test ']) {
  assert.throws(
    () =>
      validateAuthorizationTemplateSigners({
        signers: [signers[0], { ...signers[1], email: duplicateEmail }, signers[2]],
        templateKey,
      }),
    /unique email address/i,
  );
}

console.log('authorization template signer validation tests passed');
