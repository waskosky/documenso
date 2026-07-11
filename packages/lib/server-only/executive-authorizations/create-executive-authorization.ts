import { prisma } from '@documenso/prisma';
import { Prisma } from '@prisma/client';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { buildExecutiveAuthorizationRequestFingerprint } from './authorization-request-fingerprint';
import { prepareExecutiveAuthorizationRecord } from './prepare-executive-authorization';
import { type TCreateExecutiveAuthorization, ZCreateExecutiveAuthorizationSchema } from './schema';

export const buildExecutiveAuthorizationCreateData = ({
  parsed,
  prepared,
}: {
  parsed: TCreateExecutiveAuthorization;
  prepared: ReturnType<typeof prepareExecutiveAuthorizationRecord>;
}) => ({
  actionDate: prepared.actionDate,
  companyLegalName: prepared.companyLegalName,
  createdByUserId: parsed.userId,
  externalId: parsed.externalId,
  notes: prepared.notes,
  payload: prepared.payload,
  renderedMarkdown: prepared.renderedMarkdown,
  requestFingerprint: buildExecutiveAuthorizationRequestFingerprint(prepared),
  signers: prepared.signers,
  status: prepared.status,
  teamId: parsed.teamId,
  templateKey: prepared.templateKey,
  templateVersion: prepared.templateVersion,
  title: prepared.title,
  type: prepared.type,
});

export const createExecutiveAuthorization = async (
  input: unknown,
  prismaClient: Pick<typeof prisma, 'executiveAuthorization'> = prisma,
) => {
  const parsed = ZCreateExecutiveAuthorizationSchema.parse(input);
  const externalId = parsed.externalId;
  const prepared = prepareExecutiveAuthorizationRecord(parsed);
  const requestFingerprint = buildExecutiveAuthorizationRequestFingerprint(prepared);

  const assertMatchingRequest = (existing: { requestFingerprint?: string | null }) => {
    if (existing.requestFingerprint !== requestFingerprint) {
      throw new AppError(AppErrorCode.ALREADY_EXISTS, {
        message: `External ID "${externalId}" is already associated with a different request.`,
        statusCode: 409,
      });
    }
  };

  if (externalId) {
    const existing = await prismaClient.executiveAuthorization.findUnique({
      where: {
        teamId_externalId: {
          externalId,
          teamId: parsed.teamId,
        },
      },
    });

    if (existing) {
      assertMatchingRequest(existing);
      return existing;
    }
  }

  try {
    return await prismaClient.executiveAuthorization.create({
      data: buildExecutiveAuthorizationCreateData({ parsed, prepared }),
    });
  } catch (error) {
    if (!externalId || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }

    const existing = await prismaClient.executiveAuthorization.findUnique({
      where: {
        teamId_externalId: {
          externalId,
          teamId: parsed.teamId,
        },
      },
    });

    if (!existing) {
      throw error;
    }

    assertMatchingRequest(existing);
    return existing;
  }
};
