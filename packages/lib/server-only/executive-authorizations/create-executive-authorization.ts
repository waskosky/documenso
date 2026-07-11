import { prisma } from '@documenso/prisma';

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

  if (parsed.externalId) {
    const existing = await prismaClient.executiveAuthorization.findUnique({
      where: {
        teamId_externalId: {
          externalId: parsed.externalId,
          teamId: parsed.teamId,
        },
      },
    });

    if (existing) {
      return existing;
    }
  }

  const prepared = prepareExecutiveAuthorizationRecord(parsed);

  return await prismaClient.executiveAuthorization.create({
    data: buildExecutiveAuthorizationCreateData({ parsed, prepared }),
  });
};
