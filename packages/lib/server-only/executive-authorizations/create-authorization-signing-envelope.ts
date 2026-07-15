import {
  DocumentDistributionMethod,
  DocumentSigningOrder,
  type DocumentStatus,
  EnvelopeType,
  ExecutiveAuthorizationStatus,
  FieldType,
} from '@prisma/client';

import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { putPdfFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { prisma } from '@documenso/prisma';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { createEnvelope } from '../envelope/create-envelope';
import { assertAuthorizationEnvelopeIntegrity } from './assert-authorization-envelope-integrity';
import { withAuthorizationEnvelopeLock } from './authorization-envelope-lock';
import {
  buildAuthorizationEnvelopeExternalId,
  buildAuthorizationEnvelopePlan,
} from './build-authorization-envelope-plan';
import { generateAuthorizationPdf } from './generate-authorization-pdf';
import { normalizeAuthorizationSigners } from './stored-signers';
import {
  type AuthorizationStatusRecipient,
  buildAuthorizationStatusUpdate,
} from './sync-authorization-status';
import type { AuthorizationSigner, AuthorizationTemplateKey } from './types';

type CreateAuthorizationSigningEnvelopeOptions = {
  id: string;
  requestMetadata: ApiRequestMetadata;
  teamId: number;
  userId: number;
};

const linkAuthorizationSigningEnvelope = async ({
  authorizationId,
  documentDataId,
  envelope,
  signers,
}: {
  authorizationId: string;
  documentDataId: string;
  envelope: {
    completedAt: Date | null;
    id: string;
    recipients: AuthorizationStatusRecipient[];
    status: DocumentStatus;
  };
  signers: AuthorizationSigner[];
}) => {
  const statusUpdate = buildAuthorizationStatusUpdate({
    completedAt: envelope.completedAt,
    envelopeStatus: envelope.status,
    existingSigners: signers,
    recipients: envelope.recipients,
  });

  await prisma.executiveAuthorization.update({
    data: {
      envelopeId: envelope.id,
      generatedDocumentDataId: documentDataId,
      signers: statusUpdate.signers,
      status:
        statusUpdate.status === ExecutiveAuthorizationStatus.READY
          ? ExecutiveAuthorizationStatus.READY
          : statusUpdate.status,
    },
    where: {
      id: authorizationId,
    },
  });

  return envelope;
};

const createAuthorizationSigningEnvelopeUnlocked = async ({
  id,
  requestMetadata,
  teamId,
  userId,
}: CreateAuthorizationSigningEnvelopeOptions) => {
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

  if (authorization.envelope) {
    return authorization.envelope;
  }

  if (authorization.status !== ExecutiveAuthorizationStatus.DRAFT) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Only draft authorizations can generate a signing document.',
    });
  }

  const signers = normalizeAuthorizationSigners(authorization.signers);
  const orphanedEnvelope = await prisma.envelope.findFirst({
    include: {
      envelopeItems: true,
      recipients: {
        include: {
          fields: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    where: {
      deletedAt: null,
      executiveAuthorization: {
        is: null,
      },
      externalId: buildAuthorizationEnvelopeExternalId(authorization.id),
      teamId,
      type: EnvelopeType.DOCUMENT,
    },
  });

  if (orphanedEnvelope) {
    const recoveredDocumentDataId = orphanedEnvelope.envelopeItems[0]?.documentDataId ?? null;

    await assertAuthorizationEnvelopeIntegrity({
      authorization: {
        generatedDocumentDataId: recoveredDocumentDataId,
        id: authorization.id,
        renderedMarkdown: authorization.renderedMarkdown,
        signers,
        templateKey: authorization.templateKey as AuthorizationTemplateKey,
        templateVersion: authorization.templateVersion,
        title: authorization.title,
      },
      envelope: orphanedEnvelope,
    });

    if (!recoveredDocumentDataId) {
      throw new Error('Recovered authorization envelope is missing its document data.');
    }

    return await linkAuthorizationSigningEnvelope({
      authorizationId: authorization.id,
      documentDataId: recoveredDocumentDataId,
      envelope: orphanedEnvelope,
      signers,
    });
  }

  const pdf = await generateAuthorizationPdf({
    renderedMarkdown: authorization.renderedMarkdown,
    signers,
    templateVersion: authorization.templateVersion,
    title: authorization.title,
  });
  const plan = buildAuthorizationEnvelopePlan({
    authorizationId: authorization.id,
    renderedMarkdown: authorization.renderedMarkdown,
    signaturePageNumber: pdf.signaturePageNumber,
    signers,
    templateKey: authorization.templateKey as AuthorizationTemplateKey,
    templateVersion: authorization.templateVersion,
    title: authorization.title,
  });

  const uploadedDocumentData = await putPdfFileServerSide({
    arrayBuffer: async () => Promise.resolve(pdf.bytes),
    name: plan.fileName,
    type: 'application/pdf',
  });
  const documentData = (
    'documentData' in uploadedDocumentData
      ? uploadedDocumentData.documentData
      : uploadedDocumentData
  ) as {
    id: string;
  };

  const envelope = await createEnvelope({
    ...({ bypassDefaultRecipients: true } as Record<string, unknown>),
    data: {
      envelopeItems: [
        {
          documentDataId: documentData.id,
          title: plan.fileName,
        },
      ],
      externalId: plan.externalId,
      recipients: plan.recipients.map((recipient) => ({
        email: recipient.email,
        fields: recipient.fields.map((field) =>
          field.type === FieldType.SIGNATURE
            ? {
                documentDataId: documentData.id,
                fieldMeta: field.fieldMeta,
                height: field.height,
                page: field.page,
                positionX: field.positionX,
                positionY: field.positionY,
                type: FieldType.SIGNATURE,
                width: field.width,
              }
            : {
                documentDataId: documentData.id,
                fieldMeta: field.fieldMeta,
                height: field.height,
                page: field.page,
                positionX: field.positionX,
                positionY: field.positionY,
                type: FieldType.DATE,
                width: field.width,
              },
        ),
        name: recipient.name,
        role: recipient.role,
        signingOrder: recipient.signingOrder,
      })),
      title: plan.title,
      type: EnvelopeType.DOCUMENT,
    },
    internalVersion: 2,
    meta: {
      distributionMethod: DocumentDistributionMethod.EMAIL,
      message: plan.emailMessage,
      signingOrder: DocumentSigningOrder.PARALLEL,
      subject: plan.emailSubject,
    },
    requestMetadata,
    teamId,
    userId,
  });

  return await linkAuthorizationSigningEnvelope({
    authorizationId: authorization.id,
    documentDataId: documentData.id,
    envelope,
    signers,
  });
};

export const createAuthorizationSigningEnvelope = async (
  options: CreateAuthorizationSigningEnvelopeOptions,
) =>
  await withAuthorizationEnvelopeLock({
    authorizationId: options.id,
    operation: async () => await createAuthorizationSigningEnvelopeUnlocked(options),
    teamId: options.teamId,
  });
