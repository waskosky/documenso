import type { AuthorizationTemplateSignerRole } from '@documenso/lib/server-only/executive-authorizations/types';

export type AuthorizationSignerSlot = {
  index: number;
  required: boolean;
  roleIndex: number;
  roleKey: string;
  roleLabel: string;
};

export type AuthorizationSignerField = 'email' | 'name' | 'presence' | 'vote';

export const buildAuthorizationSignerSlots = (signerRoles: readonly AuthorizationTemplateSignerRole[]) => {
  let index = 0;

  return signerRoles.flatMap((role) =>
    Array.from(
      { length: role.minCount },
      (_, roleIndex): AuthorizationSignerSlot => ({
        index: index++,
        required: role.required,
        roleIndex,
        roleKey: role.key,
        roleLabel: role.label,
      }),
    ),
  );
};

export const getAuthorizationSignerFieldName = (slot: AuthorizationSignerSlot, field: AuthorizationSignerField) =>
  `signer-${slot.roleKey}-${slot.roleIndex}-${field}`;

const getString = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

const getList = (formData: FormData, key: string) =>
  getString(formData, key)
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

export const buildBoardAuthorizationInputFromFormData = (
  formData: FormData,
  signerRoles: readonly AuthorizationTemplateSignerRole[],
) => {
  const directors = buildAuthorizationSignerSlots(signerRoles)
    .filter((slot) => slot.roleKey === 'director')
    .map((slot) => ({
      email: getString(formData, getAuthorizationSignerFieldName(slot, 'email')),
      name: getString(formData, getAuthorizationSignerFieldName(slot, 'name')),
      presence: getString(formData, getAuthorizationSignerFieldName(slot, 'presence')) || 'Consented',
      vote: getString(formData, getAuthorizationSignerFieldName(slot, 'vote')) || 'For',
    }))
    .filter((director) => director.name || director.email);

  return {
    notes: getString(formData, 'notes'),
    payload: {
      actionDate: getString(formData, 'actionDate'),
      actionTitle: getString(formData, 'actionTitle'),
      authorizedOfficerName: getString(formData, 'authorizedOfficerName'),
      authorizedOfficerTitle: getString(formData, 'authorizedOfficerTitle'),
      companyLegalName: getString(formData, 'companyLegalName'),
      consentMethod: getString(formData, 'consentMethod'),
      directors,
      entityType: getString(formData, 'entityType'),
      investorCondition: getString(formData, 'investorCondition'),
      jurisdiction: getString(formData, 'jurisdiction'),
      matterDescription: getString(formData, 'matterDescription'),
      materialsReviewed: getList(formData, 'materialsReviewed'),
      resolutionDisposition: getString(formData, 'resolutionDisposition'),
      resolutionTerms: getString(formData, 'resolutionTerms'),
      secretaryName: getString(formData, 'secretaryName'),
    },
    templateKey: 'board_resolution_secretary_certificate' as const,
  };
};
