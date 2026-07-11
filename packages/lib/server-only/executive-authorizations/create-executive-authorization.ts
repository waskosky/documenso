import { prisma } from '@documenso/prisma';
import { Prisma } from '@prisma/client';

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
      return existing;
    }
  }

  const prepared = prepareExecutiveAuthorizationRecord(parsed);

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

    return existing;
  }
};
