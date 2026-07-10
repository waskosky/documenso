import { prisma } from '@documenso/prisma';
import type { DocumentStatus, ExecutiveAuthorizationStatus } from '@prisma/client';

import { normalizeAuthorizationSigners } from './stored-signers';
import { type AuthorizationStatusRecipient, buildAuthorizationStatusUpdate } from './sync-authorization-status';
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

export const syncExecutiveAuthorizationForEnvelope = async ({
  envelopeId,
  prismaClient = prisma as unknown as SyncAuthorizationPrismaClient,
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
