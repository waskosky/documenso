import { ExecutiveAuthorizationStatus } from '@prisma/client';

import { sendDocument } from '@documenso/lib/server-only/document/send-document';
import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { prisma } from '@documenso/prisma';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { assertAuthorizationEnvelopeIntegrity } from './assert-authorization-envelope-integrity';
import { createAuthorizationSigningEnvelope } from './create-authorization-signing-envelope';
import { refreshExecutiveAuthorizationStatus } from './refresh-executive-authorization-status';
import { normalizeAuthorizationSigners } from './stored-signers';
import type { AuthorizationTemplateKey } from './types';

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

  const integrityAuthorization = await prisma.executiveAuthorization.findFirst({
    select: {
      envelope: {
        select: {
          externalId: true,
          id: true,
          recipients: {
            orderBy: {
              signingOrder: 'asc',
            },
            select: {
              email: true,
              fields: {
                select: {
                  height: true,
                  page: true,
                  positionX: true,
                  positionY: true,
                  type: true,
                  width: true,
                },
              },
              name: true,
              role: true,
              signingOrder: true,
            },
          },
        },
      },
      id: true,
      renderedMarkdown: true,
      signers: true,
      templateKey: true,
      title: true,
    },
    where: {
      envelopeId: envelope.id,
      id,
      teamId,
    },
  });

  if (!integrityAuthorization?.envelope) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Authorization signing envelope not found.',
    });
  }

  await assertAuthorizationEnvelopeIntegrity({
    authorization: {
      id: integrityAuthorization.id,
      renderedMarkdown: integrityAuthorization.renderedMarkdown,
      signers: normalizeAuthorizationSigners(integrityAuthorization.signers),
      templateKey: integrityAuthorization.templateKey as AuthorizationTemplateKey,
      title: integrityAuthorization.title,
    },
    envelope: integrityAuthorization.envelope,
  });

  await sendDocument({
    id: {
      id: integrityAuthorization.envelope.id,
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
