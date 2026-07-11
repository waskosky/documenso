import { prisma } from '@documenso/prisma';

import type { ExecutiveAuthorizationProfilePrismaClient } from './get-executive-authorization-profile';
import { parseAuthorizationTemplateProfilePayload } from './profile-payload';
import { getAuthorizationTemplate } from './templates';
import type { AuthorizationTemplateKey } from './types';

export const upsertExecutiveAuthorizationProfile = async ({
  payloadDefaults,
  prismaClient = prisma as unknown as ExecutiveAuthorizationProfilePrismaClient,
  teamId,
  templateKey,
}: {
  payloadDefaults: unknown;
  prismaClient?: ExecutiveAuthorizationProfilePrismaClient;
  teamId: number;
  templateKey: AuthorizationTemplateKey;
}) => {
  const parsedPayloadDefaults = parseAuthorizationTemplateProfilePayload({
    payload: payloadDefaults,
    templateKey,
  });
  const template = getAuthorizationTemplate(templateKey);

  return await prismaClient.executiveAuthorizationProfile.upsert({
    create: {
      payloadDefaults: parsedPayloadDefaults,
      teamId,
      templateKey,
      templateVersion: template.version,
    },
    update: {
      payloadDefaults: parsedPayloadDefaults,
      templateVersion: template.version,
    },
    where: {
      teamId_templateKey: {
        teamId,
        templateKey,
      },
    },
  });
};
