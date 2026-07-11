import {
  ZAuthorizationTemplateKeySchema,
  ZBoardResolutionCertificatePayloadSchema,
} from '@documenso/lib/server-only/executive-authorizations/schema';
import { normalizeAuthorizationSigners } from '@documenso/lib/server-only/executive-authorizations/stored-signers';
import { ExecutiveAuthorizationStatus } from '@prisma/client';
import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const createAuthorizationMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/executive-authorization/create',
    summary: 'Create an executive authorization draft',
    description: 'Creates a logged authorization and optionally generates its ready-to-review signing envelope.',
    tags: ['Executive Authorization'],
  },
};

const ZBoardAuthorizationAutomationPayloadSchema = ZBoardResolutionCertificatePayloadSchema.partial().extend({
  actionDate: ZBoardResolutionCertificatePayloadSchema.shape.actionDate,
  actionTitle: ZBoardResolutionCertificatePayloadSchema.shape.actionTitle,
  investorCondition: ZBoardResolutionCertificatePayloadSchema.shape.investorCondition,
  materialsReviewed: ZBoardResolutionCertificatePayloadSchema.shape.materialsReviewed,
  matterDescription: ZBoardResolutionCertificatePayloadSchema.shape.matterDescription,
  resolutionTerms: ZBoardResolutionCertificatePayloadSchema.shape.resolutionTerms,
});

export const ZCreateAuthorizationRequestSchema = z.object({
  externalId: z.string().trim().min(1).max(255),
  generateDocument: z.boolean().default(true),
  notes: z.string().trim().optional(),
  payload: ZBoardAuthorizationAutomationPayloadSchema,
  templateKey: ZAuthorizationTemplateKeySchema.default('board_resolution_secretary_certificate'),
});

export const ZCreateAuthorizationResponseSchema = z.object({
  authorizationId: z.string(),
  authorizationUrl: z.string().url(),
  editorUrl: z.string().url().nullable(),
  envelopeId: z.string().nullable(),
  fieldCount: z.number().int().nonnegative(),
  generationError: z.string().nullable(),
  integrityError: z.string().nullable(),
  integrityValid: z.boolean(),
  signerCount: z.number().int().nonnegative(),
  status: z.nativeEnum(ExecutiveAuthorizationStatus),
});

export const buildCreateAuthorizationResponse = ({
  authorization,
  generationError,
  integrityError,
  teamUrl,
  webAppUrl,
}: {
  authorization: {
    envelope: {
      id: string;
      recipients: Array<{ fields: unknown[] }>;
    } | null;
    id: string;
    signers: unknown;
    status: string;
    templateKey: string;
  };
  generationError: string | null;
  integrityError: string | null;
  teamUrl: string;
  webAppUrl: string;
}) => {
  const baseUrl = webAppUrl.replace(/\/+$/, '');
  const signers = normalizeAuthorizationSigners(authorization.signers);
  const fieldCount =
    authorization.envelope?.recipients.reduce((count, recipient) => count + recipient.fields.length, 0) ?? 0;
  const authorizationUrl = `${baseUrl}/t/${teamUrl}/authorizations/${authorization.id}`;
  const envelopeId = authorization.envelope?.id ?? null;

  return {
    authorizationId: authorization.id,
    authorizationUrl,
    editorUrl: envelopeId ? `${baseUrl}/t/${teamUrl}/documents/${envelopeId}/edit?step=addFields` : null,
    envelopeId,
    fieldCount,
    generationError,
    integrityError,
    integrityValid: Boolean(authorization.envelope) && integrityError === null,
    signerCount: authorization.envelope?.recipients.length ?? signers.length,
    status: authorization.status as ExecutiveAuthorizationStatus,
  };
};

export type TCreateAuthorizationRequest = z.infer<typeof ZCreateAuthorizationRequestSchema>;
export type TCreateAuthorizationResponse = z.infer<typeof ZCreateAuthorizationResponseSchema>;
