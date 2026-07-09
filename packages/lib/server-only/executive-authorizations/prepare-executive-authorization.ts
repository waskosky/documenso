import { ExecutiveAuthorizationStatus } from '@prisma/client';

import { renderAuthorizationTemplate } from './render-authorization-template';
import {
  ZPrepareExecutiveAuthorizationRecordSchema,
  authorizationTemplateTypes,
  parseAuthorizationTemplatePayload,
} from './schema';
import type { AuthorizationTemplateKey } from './types';

const parseActionDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid authorization action date.');
  }

  return parsed;
};

export const prepareExecutiveAuthorizationRecord = (input: unknown) => {
  const parsed = ZPrepareExecutiveAuthorizationRecordSchema.parse(input);
  const templateKey = parsed.templateKey as AuthorizationTemplateKey;
  const payload = parseAuthorizationTemplatePayload({
    payload: parsed.payload,
    templateKey,
  });
  const rendered = renderAuthorizationTemplate({
    payload,
    templateKey,
  });

  return {
    actionDate: parseActionDate(payload.actionDate),
    companyLegalName: payload.companyLegalName,
    notes: parsed.notes,
    payload,
    renderedMarkdown: rendered.markdown,
    signers: rendered.signers,
    status: ExecutiveAuthorizationStatus.DRAFT,
    templateKey,
    templateVersion: rendered.templateVersion,
    title: payload.actionTitle,
    type: authorizationTemplateTypes[templateKey],
  };
};
