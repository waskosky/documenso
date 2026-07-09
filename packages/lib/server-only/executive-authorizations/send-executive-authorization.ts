import { ExecutiveAuthorizationStatus } from '@prisma/client';

import { sendDocument } from '@documenso/lib/server-only/document/send-document';
import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { prisma } from '@documenso/prisma';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { createAuthorizationSigningEnvelope } from './create-authorization-signing-envelope';
import { refreshExecutiveAuthorizationStatus } from './refresh-executive-authorization-status';

type SendExecutiveAuthorizationOptions = {
  id: string;
  requestMetadata: ApiRequestMetadata;
  teamId: number;
  userId: number;
};

export const sendExecutiveAuthorization = async ({
  id,
  requestMetadata,
  teamId,
  userId,
}: SendExecutiveAuthorizationOptions) => {
  const authorization = await prisma.executiveAuthorization.findFirst({
    select: {
      envelopeId: true,
      id: true,
      status: true,
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

  if (
    authorization.status !== ExecutiveAuthorizationStatus.DRAFT &&
    authorization.status !== ExecutiveAuthorizationStatus.READY
  ) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Only draft or ready authorizations can be sent.',
    });
  }

  const envelope = authorization.envelopeId
    ? { id: authorization.envelopeId }
    : await createAuthorizationSigningEnvelope({
        id,
        requestMetadata,
        teamId,
        userId,
      });

  await sendDocument({
    id: {
      id: envelope.id,
      type: 'envelopeId',
    },
    requestMetadata,
    teamId,
    userId,
  });

  await prisma.executiveAuthorization.update({
    data: {
      sentAt: new Date(),
      status: ExecutiveAuthorizationStatus.SENT,
    },
    where: {
      id,
    },
  });

  return await refreshExecutiveAuthorizationStatus({
    id,
    teamId,
  });
};
