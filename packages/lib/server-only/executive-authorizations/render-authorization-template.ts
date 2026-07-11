import { getAuthorizationTemplate } from './templates';
import type {
  AuthorizationRenderResult,
  AuthorizationTemplateKey,
  AuthorizationTemplatePayloadMap,
} from './types';

export const renderAuthorizationTemplate = <TKey extends AuthorizationTemplateKey>({
  payload,
  templateKey,
  templateVersion,
}: {
  payload: AuthorizationTemplatePayloadMap[TKey];
  templateKey: TKey;
  templateVersion?: number;
}): AuthorizationRenderResult => {
  const template = getAuthorizationTemplate(templateKey, templateVersion);

  return template.render(payload as never);
};
