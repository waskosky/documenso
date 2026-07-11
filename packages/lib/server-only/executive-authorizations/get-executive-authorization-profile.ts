import { prisma } from '@documenso/prisma';

import type { AuthorizationTemplateKey } from './types';

export type ExecutiveAuthorizationProfileRecord = {
  createdAt?: Date;
  id: string;
  payloadDefaults?: unknown;
  teamId?: number;
  templateKey?: string;
  templateVersion?: number;
  updatedAt?: Date;
};

export type ExecutiveAuthorizationProfilePrismaClient = {
  executiveAuthorizationProfile: {
    findUnique: (arguments_: {
      where: {
        teamId_templateKey: {
          teamId: number;
          templateKey: string;
        };
      };
    }) => Promise<ExecutiveAuthorizationProfileRecord | null>;
    upsert: (arguments_: {
      create: {
        payloadDefaults: unknown;
        teamId: number;
        templateKey: string;
        templateVersion: number;
      };
      update: {
        payloadDefaults: unknown;
        templateVersion: number;
      };
      where: {
        teamId_templateKey: {
          teamId: number;
          templateKey: string;
        };
      };
    }) => Promise<ExecutiveAuthorizationProfileRecord>;
  };
};

export const getExecutiveAuthorizationProfile = async ({
  prismaClient = prisma as unknown as ExecutiveAuthorizationProfilePrismaClient,
  teamId,
  templateKey,
}: {
  prismaClient?: ExecutiveAuthorizationProfilePrismaClient;
  teamId: number;
  templateKey: AuthorizationTemplateKey;
}) =>
  await prismaClient.executiveAuthorizationProfile.findUnique({
    where: {
      teamId_templateKey: {
        teamId,
        templateKey,
      },
    },
  });
