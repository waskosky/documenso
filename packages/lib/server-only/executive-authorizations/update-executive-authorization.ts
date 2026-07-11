import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { ExecutiveAuthorizationStatus } from '@prisma/client';
import { z } from 'zod';

import { buildExecutiveAuthorizationRequestFingerprint } from './authorization-request-fingerprint';
import { prepareExecutiveAuthorizationRecord } from './prepare-executive-authorization';
import { ZPrepareExecutiveAuthorizationRecordSchema } from './schema';

const ZUpdateExecutiveAuthorizationSchema = ZPrepareExecutiveAuthorizationRecordSchema.extend({
  id: z.string().min(1),
  teamId: z.number().int().positive(),
});

export const buildExecutiveAuthorizationUpdateData = (
  prepared: ReturnType<typeof prepareExecutiveAuthorizationRecord>,
) => ({
  actionDate: prepared.actionDate,
  companyLegalName: prepared.companyLegalName,
  notes: prepared.notes,
  payload: prepared.payload,
  renderedMarkdown: prepared.renderedMarkdown,
  requestFingerprint: buildExecutiveAuthorizationRequestFingerprint(prepared),
  signers: prepared.signers,
  templateKey: prepared.templateKey,
  templateVersion: prepared.templateVersion,
  title: prepared.title,
  type: prepared.type,
});

export const updateExecutiveAuthorizationDraft = async (input: unknown) => {
  const parsed = ZUpdateExecutiveAuthorizationSchema.parse(input);
  const existing = await prisma.executiveAuthorization.findFirst({
    where: {
      id: parsed.id,
      teamId: parsed.teamId,
    },
  });

  if (!existing) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Authorization not found',
    });
  }

  if (existing.status !== ExecutiveAuthorizationStatus.DRAFT) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Only draft authorizations can be edited.',
    });
  }

  const prepared = prepareExecutiveAuthorizationRecord(parsed);

  return await prisma.executiveAuthorization.update({
    data: buildExecutiveAuthorizationUpdateData(prepared),
    where: {
      id: existing.id,
    },
  });
};
