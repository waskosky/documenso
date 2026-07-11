import { z } from 'zod';

import { parseAuthorizationTemplatePayload, ZBoardResolutionCertificatePayloadSchema } from './schema';
import { getAuthorizationTemplate } from './templates';
import type {
  AuthorizationTemplateKey,
  AuthorizationTemplatePayloadMap,
  BoardResolutionCertificatePayload,
} from './types';

export type BoardResolutionCertificateProfilePayload = Pick<
  BoardResolutionCertificatePayload,
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

type AuthorizationTemplateProfilePayloadMap = {
  board_resolution_secretary_certificate: BoardResolutionCertificateProfilePayload;
};

const ZBoardResolutionCertificateProfilePayloadSchema = ZBoardResolutionCertificatePayloadSchema.pick({
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
    const template = getAuthorizationTemplate('board_resolution_secretary_certificate');
    const directorRole = template.signing.signerRoles.find((role) => role.key === 'director');

    if (!directorRole) {
      return;
    }

    const exceedsMaximum = directorRole.maxCount !== undefined && payload.directors.length > directorRole.maxCount;

    if (payload.directors.length < directorRole.minCount || exceedsMaximum) {
      const expectedCount = directorRole.maxCount === directorRole.minCount ? `exactly ${directorRole.minCount}` : null;

      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: expectedCount
          ? `Profile requires exactly ${directorRole.minCount} ${directorRole.label} signers.`
          : `Profile requires at least ${directorRole.minCount} ${directorRole.label} signers.`,
        path: ['directors'],
      });
    }
  });

const authorizationTemplateProfileSchemas = {
  board_resolution_secretary_certificate: ZBoardResolutionCertificateProfilePayloadSchema,
} satisfies Record<AuthorizationTemplateKey, z.ZodTypeAny>;

export const parseAuthorizationTemplateProfilePayload = <TTemplateKey extends AuthorizationTemplateKey>({
  payload,
  templateKey,
}: {
  payload: unknown;
  templateKey: TTemplateKey;
}): AuthorizationTemplateProfilePayloadMap[TTemplateKey] =>
  authorizationTemplateProfileSchemas[templateKey].parse(
    payload,
  ) as AuthorizationTemplateProfilePayloadMap[TTemplateKey];

export const mergeAuthorizationProfilePayload = <TTemplateKey extends AuthorizationTemplateKey>({
  payload,
  profilePayload,
  templateKey,
}: {
  payload: unknown;
  profilePayload: unknown;
  templateKey: TTemplateKey;
}): AuthorizationTemplatePayloadMap[TTemplateKey] => {
  const parsedProfile = parseAuthorizationTemplateProfilePayload({
    payload: profilePayload,
    templateKey,
  });

  const parsedPayload = z.record(z.unknown()).parse(payload);

  return parseAuthorizationTemplatePayload({
    payload: {
      ...parsedProfile,
      ...parsedPayload,
    },
    templateKey,
  }) as AuthorizationTemplatePayloadMap[TTemplateKey];
};
