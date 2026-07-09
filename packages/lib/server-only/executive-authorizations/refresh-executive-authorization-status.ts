import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

import { normalizeAuthorizationSigners } from './stored-signers';
import { buildAuthorizationStatusUpdate } from './sync-authorization-status';

export const refreshExecutiveAuthorizationStatus = async ({ id, teamId }: { id: string; teamId: number }) => {
  const authorization = await prisma.executiveAuthorization.findFirst({
    include: {
      envelope: {
        include: {
          recipients: true,
        },
      },
    },
    where: {
      id,
      teamId,
    },
  });

  if (!authorization) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Authorization not found',
    });
  }

  if (!authorization.envelope) {
    return authorization;
  }

  const update = buildAuthorizationStatusUpdate({
    completedAt: authorization.envelope.completedAt,
    envelopeStatus: authorization.envelope.status,
    existingSigners: normalizeAuthorizationSigners(authorization.signers),
    recipients: authorization.envelope.recipients,
  });

  return await prisma.executiveAuthorization.update({
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
