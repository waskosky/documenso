import { z } from 'zod';

import {
  ZBoardResolutionCertificatePayloadV1Schema,
  ZBoardResolutionCertificatePayloadV2BaseSchema,
  parseAuthorizationTemplatePayload,
  validateBoardDecisionConsistency,
  validateBoardExecutionRoleAssignments,
} from './schema';
import { findDuplicateAuthorizationSignerEmail } from './signer-email';
import { getAuthorizationTemplate } from './templates';
import type {
  AuthorizationTemplateKey,
  AuthorizationTemplatePayloadMap,
  BoardResolutionCertificatePayload,
  BoardResolutionCertificatePayloadV1,
} from './types';

export type BoardResolutionCertificateProfilePayloadV1 = Pick<
  BoardResolutionCertificatePayloadV1,
  | 'authorizedOfficerName'
  | 'authorizedOfficerTitle'
  | 'companyLegalName'
  | 'consentMethod'
  | 'directors'
  | 'entityType'
  | 'jurisdiction'
  | 'resolutionDisposition'
  | 'secretaryName'
>;

export type BoardResolutionCertificateProfilePayload = Pick<
  BoardResolutionCertificatePayload,
  | 'actionMethod'
  | 'approvalRequiredCount'
  | 'authorizedOfficerDirectorIndex'
  | 'authorizedOfficerName'
  | 'authorizedOfficerTitle'
  | 'companyLegalName'
  | 'directors'
  | 'entityType'
  | 'equityHolderPlural'
  | 'governingBodyName'
  | 'governingMemberPlural'
  | 'governingMemberSingular'
  | 'jurisdiction'
  | 'quorumRequiredCount'
  | 'resolutionDisposition'
  | 'secretaryDirectorIndex'
  | 'secretaryName'
>;

type AuthorizationTemplateProfilePayloadMap = {
  board_resolution_secretary_certificate:
    | BoardResolutionCertificateProfilePayloadV1
    | BoardResolutionCertificateProfilePayload;
};

const validateProfileDirectors = (
  directors: Array<{ email?: string }>,
  context: z.RefinementCtx,
  expectedCount: number,
) => {
  directors.forEach((director, index) => {
    if (!director.email?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Director ${index + 1} requires a valid email address.`,
        path: ['directors', index, 'email'],
      });
    }
  });

  const duplicateEmail = findDuplicateAuthorizationSignerEmail(
    directors.map((director) => director.email ?? ''),
  );

  if (duplicateEmail) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Each signer must have a unique email address. Duplicate: "${duplicateEmail}".`,
      path: ['directors'],
    });
  }

  if (directors.length !== expectedCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Profile requires exactly ${expectedCount} Director signers.`,
      path: ['directors'],
    });
  }
};

const ZBoardResolutionCertificateProfilePayloadV1Schema =
  ZBoardResolutionCertificatePayloadV1Schema.pick({
    authorizedOfficerName: true,
    authorizedOfficerTitle: true,
    companyLegalName: true,
    consentMethod: true,
    directors: true,
    entityType: true,
    jurisdiction: true,
    resolutionDisposition: true,
    secretaryName: true,
  })
    .strict()
    .superRefine((payload, context) => {
      const template = getAuthorizationTemplate('board_resolution_secretary_certificate', 1);
      const directorRole = template.signing.signerRoles.find((role) => role.key === 'director');

      validateProfileDirectors(payload.directors, context, directorRole?.minCount ?? 3);
    });

const ZBoardResolutionCertificateProfilePayloadSchema =
  ZBoardResolutionCertificatePayloadV2BaseSchema.pick({
    actionMethod: true,
    approvalRequiredCount: true,
    authorizedOfficerDirectorIndex: true,
    authorizedOfficerName: true,
    authorizedOfficerTitle: true,
    companyLegalName: true,
    directors: true,
    entityType: true,
    equityHolderPlural: true,
    governingBodyName: true,
    governingMemberPlural: true,
    governingMemberSingular: true,
    jurisdiction: true,
    quorumRequiredCount: true,
    resolutionDisposition: true,
    secretaryDirectorIndex: true,
    secretaryName: true,
  })
    .strict()
    .superRefine((payload, context) => {
      const template = getAuthorizationTemplate('board_resolution_secretary_certificate', 2);
      const directorRole = template.signing.signerRoles.find((role) => role.key === 'director');

      validateProfileDirectors(payload.directors, context, directorRole?.minCount ?? 3);
      validateBoardDecisionConsistency(payload, context);
      validateBoardExecutionRoleAssignments(payload, context);
    });

const authorizationTemplateProfileSchemas = {
  board_resolution_secretary_certificate: new Map<number, z.ZodTypeAny>([
    [1, ZBoardResolutionCertificateProfilePayloadV1Schema],
    [2, ZBoardResolutionCertificateProfilePayloadSchema],
  ]),
} satisfies Record<AuthorizationTemplateKey, Map<number, z.ZodTypeAny>>;

export function parseAuthorizationTemplateProfilePayload(arguments_: {
  payload: unknown;
  templateKey: 'board_resolution_secretary_certificate';
  templateVersion: 1;
}): BoardResolutionCertificateProfilePayloadV1;
export function parseAuthorizationTemplateProfilePayload(arguments_: {
  payload: unknown;
  templateKey: 'board_resolution_secretary_certificate';
  templateVersion: 2;
}): BoardResolutionCertificateProfilePayload;
export function parseAuthorizationTemplateProfilePayload<
  TTemplateKey extends AuthorizationTemplateKey,
>(arguments_: {
  payload: unknown;
  templateKey: TTemplateKey;
  templateVersion: number;
}): AuthorizationTemplateProfilePayloadMap[TTemplateKey];
export function parseAuthorizationTemplateProfilePayload<
  TTemplateKey extends AuthorizationTemplateKey,
>({
  payload,
  templateKey,
  templateVersion,
}: {
  payload: unknown;
  templateKey: TTemplateKey;
  templateVersion: number;
}): AuthorizationTemplateProfilePayloadMap[TTemplateKey] {
  const schema = authorizationTemplateProfileSchemas[templateKey].get(templateVersion);

  if (!schema) {
    throw new Error(
      `Authorization profile schema version ${templateVersion} is not registered for "${templateKey}".`,
    );
  }

  return schema.parse(payload) as AuthorizationTemplateProfilePayloadMap[TTemplateKey];
}

export const mergeAuthorizationProfilePayload = <TTemplateKey extends AuthorizationTemplateKey>({
  payload,
  profilePayload,
  templateKey,
  templateVersion,
}: {
  payload: unknown;
  profilePayload: unknown;
  templateKey: TTemplateKey;
  templateVersion: number;
}): AuthorizationTemplatePayloadMap[TTemplateKey] => {
  const parsedProfile = parseAuthorizationTemplateProfilePayload({
    payload: profilePayload,
    templateKey,
    templateVersion,
  });
  const parsedPayload = z.record(z.unknown()).parse(payload);

  return parseAuthorizationTemplatePayload({
    payload: {
      ...parsedProfile,
      ...parsedPayload,
    },
    templateKey,
    templateVersion,
  }) as AuthorizationTemplatePayloadMap[TTemplateKey];
};
