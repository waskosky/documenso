import { prisma } from '@documenso/prisma';

import { prepareExecutiveAuthorizationRecord } from './prepare-executive-authorization';
import { ZCreateExecutiveAuthorizationSchema } from './schema';

export const createExecutiveAuthorization = async (input: unknown) => {
  const parsed = ZCreateExecutiveAuthorizationSchema.parse(input);
  const prepared = prepareExecutiveAuthorizationRecord(parsed);

  return await prisma.executiveAuthorization.create({
    data: {
      actionDate: prepared.actionDate,
      companyLegalName: prepared.companyLegalName,
      createdByUserId: parsed.userId,
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
    },
  });
};
