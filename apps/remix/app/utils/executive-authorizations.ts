import type {
  AuthorizationTemplateSignerRole,
  BoardDirectorPresence,
  BoardDirectorVote,
  BoardResolutionCertificatePayload,
  BoardResolutionCertificatePayloadV1,
} from '@documenso/lib/server-only/executive-authorizations/types';

export type AuthorizationSignerSlot = {
  index: number;
  required: boolean;
  roleIndex: number;
  roleKey: string;
  roleLabel: string;
};

export type AuthorizationSignerField = 'email' | 'name' | 'presence' | 'vote';

export const buildAuthorizationSignerSlots = (
  signerRoles: readonly AuthorizationTemplateSignerRole[],
) => {
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

export const getAuthorizationSignerFieldName = (
  slot: AuthorizationSignerSlot,
  field: AuthorizationSignerField,
) => `signer-${slot.roleKey}-${slot.roleIndex}-${field}`;

const getString = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

const getList = (formData: FormData, key: string) =>
  getString(formData, key)
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

const buildBoardDirectorsFromFormData = (
  formData: FormData,
  signerRoles: readonly AuthorizationTemplateSignerRole[],
  templateVersion: number,
) =>
  buildAuthorizationSignerSlots(signerRoles)
    .filter((slot) => slot.roleKey === 'director')
    .map((slot) => ({
      email: getString(formData, getAuthorizationSignerFieldName(slot, 'email')),
      name: getString(formData, getAuthorizationSignerFieldName(slot, 'name')),
      presence:
        getString(formData, getAuthorizationSignerFieldName(slot, 'presence')) ||
        (templateVersion === 1 ? 'Consented' : 'CONSENTED'),
      vote:
        getString(formData, getAuthorizationSignerFieldName(slot, 'vote')) ||
        (templateVersion === 1 ? 'For' : 'FOR'),
    }))
    .filter((director) => director.name || director.email);

const getInteger = (formData: FormData, key: string) =>
  Number.parseInt(getString(formData, key), 10);

export const buildBoardAuthorizationDecisionInputFromFormData = (
  formData: FormData,
  resolutionDisposition?: BoardResolutionCertificatePayload['resolutionDisposition'],
) => {
  const isNotApproved = resolutionDisposition === 'NOT_APPROVED';

  return {
    externalId: getString(formData, 'externalId'),
    notes: getString(formData, 'notes'),
    payload: {
      actionDate: getString(formData, 'actionDate'),
      actionTitle: getString(formData, 'actionTitle'),
      certificateDate: getString(formData, 'certificateDate'),
      ...(!isNotApproved
        ? {
            deliveryCondition: getString(formData, 'deliveryCondition') || undefined,
            deliveryRecipient: getString(formData, 'deliveryRecipient') || undefined,
          }
        : {}),
      materialsReviewed: getList(formData, 'materialsReviewed'),
      matterDescription: getString(formData, 'matterDescription'),
      ratifyPriorActions: isNotApproved ? false : formData.has('ratifyPriorActions'),
      specificAction: getString(formData, 'specificAction'),
      specificTerms: getString(formData, 'specificTerms'),
    },
    profileRevision: getString(formData, 'profileRevision'),
  };
};

export const buildBoardAuthorizationProfileInputFromFormData = (
  formData: FormData,
  signerRoles: readonly AuthorizationTemplateSignerRole[],
) => {
  const directors = buildBoardDirectorsFromFormData(formData, signerRoles, 2).map((director) => ({
    ...director,
    presence: director.presence as BoardDirectorPresence,
    vote: director.vote as BoardDirectorVote,
  }));
  const authorizedOfficerDirectorIndex = getInteger(formData, 'authorizedOfficerDirectorIndex');
  const secretaryDirectorIndex = getInteger(formData, 'secretaryDirectorIndex');

  return {
    actionMethod: getString(
      formData,
      'actionMethod',
    ) as BoardResolutionCertificatePayload['actionMethod'],
    approvalRequiredCount: getInteger(formData, 'approvalRequiredCount'),
    authorizedOfficerDirectorIndex,
    authorizedOfficerName: directors[authorizedOfficerDirectorIndex]?.name ?? '',
    authorizedOfficerTitle: getString(formData, 'authorizedOfficerTitle'),
    companyLegalName: getString(formData, 'companyLegalName'),
    directors,
    entityType: getString(formData, 'entityType'),
    equityHolderPlural: getString(formData, 'equityHolderPlural'),
    governingBodyName: getString(formData, 'governingBodyName'),
    governingMemberPlural: getString(formData, 'governingMemberPlural'),
    governingMemberSingular: getString(formData, 'governingMemberSingular'),
    jurisdiction: getString(formData, 'jurisdiction'),
    quorumRequiredCount: getInteger(formData, 'quorumRequiredCount'),
    resolutionDisposition: getString(
      formData,
      'resolutionDisposition',
    ) as BoardResolutionCertificatePayload['resolutionDisposition'],
    secretaryDirectorIndex,
    secretaryName: directors[secretaryDirectorIndex]?.name ?? '',
  };
};

type BoardAuthorizationFormInputV1 = {
  notes: string;
  payload: BoardResolutionCertificatePayloadV1;
  templateKey: 'board_resolution_secretary_certificate';
  templateVersion: 1;
};

type BoardAuthorizationFormInputV2 = {
  notes: string;
  payload: BoardResolutionCertificatePayload;
  templateKey: 'board_resolution_secretary_certificate';
  templateVersion: 2;
};

export function buildBoardAuthorizationInputFromFormData(
  formData: FormData,
  signerRoles: readonly AuthorizationTemplateSignerRole[],
  templateVersion: 1,
): BoardAuthorizationFormInputV1;
export function buildBoardAuthorizationInputFromFormData(
  formData: FormData,
  signerRoles: readonly AuthorizationTemplateSignerRole[],
  templateVersion?: 2,
): BoardAuthorizationFormInputV2;
export function buildBoardAuthorizationInputFromFormData(
  formData: FormData,
  signerRoles: readonly AuthorizationTemplateSignerRole[],
  templateVersion: 1 | 2 = 2,
): BoardAuthorizationFormInputV1 | BoardAuthorizationFormInputV2 {
  const directors = buildBoardDirectorsFromFormData(formData, signerRoles, templateVersion);

  if (templateVersion === 1) {
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
      templateVersion: 1 as const,
    };
  }

  const currentDirectors = directors.map((director) => ({
    ...director,
    presence: director.presence as BoardDirectorPresence,
    vote: director.vote as BoardDirectorVote,
  }));
  const authorizedOfficerDirectorIndex = getInteger(formData, 'authorizedOfficerDirectorIndex');
  const secretaryDirectorIndex = getInteger(formData, 'secretaryDirectorIndex');

  return {
    notes: getString(formData, 'notes'),
    payload: {
      actionDate: getString(formData, 'actionDate'),
      actionMethod: getString(
        formData,
        'actionMethod',
      ) as BoardResolutionCertificatePayload['actionMethod'],
      actionTitle: getString(formData, 'actionTitle'),
      approvalRequiredCount: getInteger(formData, 'approvalRequiredCount'),
      authorizedOfficerDirectorIndex,
      authorizedOfficerName: currentDirectors[authorizedOfficerDirectorIndex]?.name ?? '',
      authorizedOfficerTitle: getString(formData, 'authorizedOfficerTitle'),
      certificateDate: getString(formData, 'certificateDate'),
      companyLegalName: getString(formData, 'companyLegalName'),
      deliveryCondition: getString(formData, 'deliveryCondition') || undefined,
      deliveryRecipient: getString(formData, 'deliveryRecipient') || undefined,
      directors: currentDirectors,
      entityType: getString(formData, 'entityType'),
      equityHolderPlural: getString(formData, 'equityHolderPlural'),
      governingBodyName: getString(formData, 'governingBodyName'),
      governingMemberPlural: getString(formData, 'governingMemberPlural'),
      governingMemberSingular: getString(formData, 'governingMemberSingular'),
      jurisdiction: getString(formData, 'jurisdiction'),
      matterDescription: getString(formData, 'matterDescription'),
      materialsReviewed: getList(formData, 'materialsReviewed'),
      ratifyPriorActions: formData.has('ratifyPriorActions'),
      quorumRequiredCount: getInteger(formData, 'quorumRequiredCount'),
      resolutionDisposition: getString(
        formData,
        'resolutionDisposition',
      ) as BoardResolutionCertificatePayload['resolutionDisposition'],
      secretaryDirectorIndex,
      secretaryName: currentDirectors[secretaryDirectorIndex]?.name ?? '',
      specificAction: getString(formData, 'specificAction'),
      specificTerms: getString(formData, 'specificTerms'),
    },
    templateKey: 'board_resolution_secretary_certificate' as const,
    templateVersion: 2 as const,
  };
}
