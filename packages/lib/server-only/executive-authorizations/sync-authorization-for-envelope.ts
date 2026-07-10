import type { DocumentStatus, ExecutiveAuthorizationStatus } from '@prisma/client';

import { prisma } from '@documenso/prisma';

import { normalizeAuthorizationSigners } from './stored-signers';
import {
  type AuthorizationStatusRecipient,
  buildAuthorizationStatusUpdate,
} from './sync-authorization-status';
import type { AuthorizationSigner } from './types';

type AuthorizationForEnvelopeSync = {
  id: string;
  signers: unknown;
  envelope: {
    completedAt: Date | null;
    recipients: AuthorizationStatusRecipient[];
    status: DocumentStatus;
  } | null;
};

type SyncAuthorizationUpdateArgs = {
  data: {
    completedAt: Date | undefined;
    signers: AuthorizationSigner[];
    status: ExecutiveAuthorizationStatus;
  };
  where: {
    id: string;
  };
};

type SyncAuthorizationPrismaClient = {
  executiveAuthorization: {
    findFirst: (args: {
      include: {
        envelope: {
          include: {
            recipients: true;
          };
        };
      };
      where: {
        envelopeId: string;
      };
    }) => Promise<AuthorizationForEnvelopeSync | null>;
    update: (args: SyncAuthorizationUpdateArgs) => Promise<unknown>;
  };
};

const defaultPrismaClient: SyncAuthorizationPrismaClient = {
  executiveAuthorization: {
    findFirst: async (args) => prisma.executiveAuthorization.findFirst(args),
    update: async (args) => prisma.executiveAuthorization.update(args),
  },
};

export const syncExecutiveAuthorizationForEnvelope = async ({
  envelopeId,
  prismaClient = defaultPrismaClient,
}: {
  envelopeId: string;
  prismaClient?: SyncAuthorizationPrismaClient;
}) => {
  const authorization = await prismaClient.executiveAuthorization.findFirst({
    include: {
      envelope: {
        include: {
          recipients: true,
        },
      },
    },
    where: {
      envelopeId,
    },
  });

  if (!authorization?.envelope) {
    return null;
  }

  const update = buildAuthorizationStatusUpdate({
    completedAt: authorization.envelope.completedAt,
    envelopeStatus: authorization.envelope.status,
    existingSigners: normalizeAuthorizationSigners(authorization.signers),
    recipients: authorization.envelope.recipients,
  });

  return await prismaClient.executiveAuthorization.update({
    data: {
      completedAt: update.completedAt,
      signers: update.signers,
      status: update.status,
    },
    where: {
      id: authorization.id,
    },
  });
};
