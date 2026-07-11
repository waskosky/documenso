import { ExecutiveAuthorizationType } from '@prisma/client';
import { z } from 'zod';

import type { AuthorizationTemplateKey } from './types';

export const ZAuthorizationTemplateKeySchema = z.enum(['board_resolution_secretary_certificate']);

const ZAuthorizationActionDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Action date must be a valid date in YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Action date must be a valid date in YYYY-MM-DD format.');

export const ZBoardDirectorVoteSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  name: z.string().trim().min(1),
  presence: z.string().trim().min(1).default('Consented'),
  vote: z.string().trim().min(1).default('For'),
});

export const ZBoardResolutionCertificatePayloadSchema = z.object({
  actionDate: ZAuthorizationActionDateSchema,
  actionTitle: z.string().trim().min(1),
  authorizedOfficerName: z.string().trim().min(1),
  authorizedOfficerTitle: z.string().trim().min(1),
  companyLegalName: z.string().trim().min(1),
  consentMethod: z.string().trim().min(1).default('unanimous written consent'),
  directors: z.array(ZBoardDirectorVoteSchema).min(1),
  entityType: z.string().trim().min(1).default('corporation'),
  investorCondition: z.string().trim().min(1),
  jurisdiction: z.string().trim().min(1).default('Colorado'),
  matterDescription: z.string().trim().min(1),
  materialsReviewed: z.array(z.string().trim().min(1)).default([]),
  resolutionDisposition: z.string().trim().min(1).default('approved unanimously'),
  resolutionTerms: z.string().trim().min(1),
  secretaryName: z.string().trim().min(1),
});

const templatePayloadSchemas = {
  board_resolution_secretary_certificate: ZBoardResolutionCertificatePayloadSchema,
} satisfies Record<AuthorizationTemplateKey, z.ZodTypeAny>;

export const authorizationTemplateTypes = {
  board_resolution_secretary_certificate: ExecutiveAuthorizationType.BOARD_RESOLUTION,
} satisfies Record<AuthorizationTemplateKey, ExecutiveAuthorizationType>;

export const parseAuthorizationTemplatePayload = ({
  payload,
  templateKey,
}: {
  payload: unknown;
  templateKey: AuthorizationTemplateKey;
}) => templatePayloadSchemas[templateKey].parse(payload);

export const ZPrepareExecutiveAuthorizationRecordSchema = z.object({
  notes: z.string().trim().optional(),
  payload: z.unknown(),
  templateKey: ZAuthorizationTemplateKeySchema,
});

export const ZCreateExecutiveAuthorizationSchema =
  ZPrepareExecutiveAuthorizationRecordSchema.extend({
    externalId: z.string().trim().min(1).max(255).optional(),
    teamId: z.number().int().positive(),
    userId: z.number().int().positive(),
  });

export type TCreateExecutiveAuthorization = z.infer<typeof ZCreateExecutiveAuthorizationSchema>;
export type TPrepareExecutiveAuthorizationRecord = z.infer<
  typeof ZPrepareExecutiveAuthorizationRecordSchema
>;
