import { ExecutiveAuthorizationStatus } from '@prisma/client';

import { renderAuthorizationTemplate } from './render-authorization-template';
import {
  ZPrepareExecutiveAuthorizationRecordSchema,
  authorizationTemplateTypes,
  parseAuthorizationTemplatePayload,
} from './schema';
import { getAuthorizationTemplate } from './templates';
import type { AuthorizationTemplateKey } from './types';
import { validateAuthorizationTemplateSigners } from './validate-template-signers';

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
  const templateVersion = getAuthorizationTemplate(templateKey, parsed.templateVersion).version;
  const payload = parseAuthorizationTemplatePayload({
    payload: parsed.payload,
    templateKey,
    templateVersion,
  });
  const rendered = renderAuthorizationTemplate({
    payload,
    templateKey,
    templateVersion,
  });
  const signers = validateAuthorizationTemplateSigners({
    signers: rendered.signers,
    templateKey,
    templateVersion,
  });

  return {
    actionDate: parseActionDate(payload.actionDate),
    companyLegalName: payload.companyLegalName,
    notes: parsed.notes,
    payload,
    renderedMarkdown: rendered.markdown,
    signers,
    status: ExecutiveAuthorizationStatus.DRAFT,
    templateKey,
    templateVersion: rendered.templateVersion,
    title: payload.actionTitle,
    type: authorizationTemplateTypes[templateKey],
  };
};
