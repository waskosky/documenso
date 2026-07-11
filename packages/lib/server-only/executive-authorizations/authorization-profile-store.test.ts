import assert from 'node:assert/strict';

import { getExecutiveAuthorizationProfile } from './get-executive-authorization-profile';
import { upsertExecutiveAuthorizationProfile } from './upsert-executive-authorization-profile';

const templateKey = 'board_resolution_secretary_certificate' as const;
const payloadDefaults = {
  authorizedOfficerName: 'Morgan Officer',
  authorizedOfficerTitle: 'President',
  companyLegalName: 'Example Company, Inc.',
  consentMethod: 'unanimous written consent',
  directors: [
    { email: 'one@example.test', name: 'Director One', presence: 'Consented', vote: 'For' },
    { email: 'two@example.test', name: 'Director Two', presence: 'Consented', vote: 'For' },
    { email: 'three@example.test', name: 'Director Three', presence: 'Consented', vote: 'For' },
  ],
  entityType: 'corporation',
  jurisdiction: 'Colorado',
  resolutionDisposition: 'approved unanimously',
  secretaryName: 'Taylor Secretary',
};

void (async () => {
  let findArguments: unknown;
  let upsertArguments: unknown;

  const prismaClient = {
    executiveAuthorizationProfile: {
      findUnique: (arguments_: unknown) => {
        findArguments = arguments_;
        return Promise.resolve({ id: 'profile_example' });
      },
      upsert: (arguments_: unknown) => {
        upsertArguments = arguments_;
        return Promise.resolve({ id: 'profile_example' });
      },
    },
  };

  const found = await getExecutiveAuthorizationProfile({
    prismaClient,
    teamId: 3,
    templateKey,
  });

  assert.deepEqual(found, { id: 'profile_example' });
  assert.deepEqual(findArguments, {
    where: {
      teamId_templateKey: {
        teamId: 3,
        templateKey,
      },
    },
  });

  const saved = await upsertExecutiveAuthorizationProfile({
    payloadDefaults,
    prismaClient,
    teamId: 3,
    templateKey,
  });

  assert.deepEqual(saved, { id: 'profile_example' });
  assert.deepEqual(upsertArguments, {
    create: {
      payloadDefaults,
      teamId: 3,
      templateKey,
      templateVersion: 1,
    },
    update: {
      payloadDefaults,
      templateVersion: 1,
    },
    where: {
      teamId_templateKey: {
        teamId: 3,
        templateKey,
      },
    },
  });

  await assert.rejects(
    () =>
      upsertExecutiveAuthorizationProfile({
        payloadDefaults: {
          ...payloadDefaults,
          directors: payloadDefaults.directors.slice(0, 2),
        },
        prismaClient,
        teamId: 3,
        templateKey,
      }),
    /exactly 3 Director signers/i,
  );

  console.log('executive authorization profile store tests passed');
})();
