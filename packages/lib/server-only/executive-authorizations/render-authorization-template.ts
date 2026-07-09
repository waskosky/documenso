import { getAuthorizationTemplate } from './templates';
import type { AuthorizationRenderResult, AuthorizationTemplateKey, AuthorizationTemplatePayloadMap } from './types';

export const renderAuthorizationTemplate = <TKey extends AuthorizationTemplateKey>({
  payload,
  templateKey,
}: {
  payload: AuthorizationTemplatePayloadMap[TKey];
  templateKey: TKey;
}): AuthorizationRenderResult => {
  const template = getAuthorizationTemplate(templateKey);

  return template.render(payload);
};
