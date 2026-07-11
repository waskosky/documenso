import { ExecutiveAuthorizationType } from '@prisma/client';
import { z } from 'zod';

import type { AuthorizationTemplateKey } from './types';

export const ZAuthorizationTemplateKeySchema = z.enum(['board_resolution_secretary_certificate']);

const buildAuthorizationDateSchema = (label: string) => {
  const message = `${label} must be a valid date in YYYY-MM-DD format.`;

  return z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);

      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, message);
};

const ZAuthorizationActionDateSchema = buildAuthorizationDateSchema('Action date');
const ZAuthorizationCertificateDateSchema = buildAuthorizationDateSchema('Certificate date');

export const ZBoardDirectorVoteV1Schema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  name: z.string().trim().min(1),
  presence: z.string().trim().min(1).default('Consented'),
  vote: z.string().trim().min(1).default('For'),
});

export const ZBoardResolutionCertificatePayloadV1Schema = z.object({
  actionDate: ZAuthorizationActionDateSchema,
  actionTitle: z.string().trim().min(1),
  authorizedOfficerName: z.string().trim().min(1),
  authorizedOfficerTitle: z.string().trim().min(1),
  companyLegalName: z.string().trim().min(1),
  consentMethod: z.string().trim().min(1).default('unanimous written consent'),
  directors: z.array(ZBoardDirectorVoteV1Schema).min(1),
  entityType: z.string().trim().min(1).default('corporation'),
  investorCondition: z.string().trim().min(1),
  jurisdiction: z.string().trim().min(1).default('Colorado'),
  matterDescription: z.string().trim().min(1),
  materialsReviewed: z.array(z.string().trim().min(1)).default([]),
  resolutionDisposition: z.string().trim().min(1).default('approved unanimously'),
  resolutionTerms: z.string().trim().min(1),
  secretaryName: z.string().trim().min(1),
});

export const ZBoardAuthorizationActionMethodSchema = z.enum([
  'MEETING',
  'UNANIMOUS_WRITTEN_CONSENT',
  'WRITTEN_CONSENT',
]);
export const ZBoardDirectorPresenceSchema = z.enum(['ABSENT', 'CONSENTED', 'PRESENT']);
export const ZBoardDirectorVoteSchema = z.enum(['ABSTAIN', 'AGAINST', 'FOR', 'NOT_VOTING', 'RECUSED']);
export const ZBoardResolutionDispositionSchema = z.enum([
  'APPROVED_REQUIRED_VOTE',
  'APPROVED_UNANIMOUSLY',
  'NOT_APPROVED',
]);

const ZOptionalTrimmedStringSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const ZBoardDirectorV2Schema = z
  .object({
    email: z.preprocess((value) => value ?? '', z.string().trim().email().or(z.literal(''))),
    name: z.string().trim().min(1),
    presence: ZBoardDirectorPresenceSchema,
    vote: ZBoardDirectorVoteSchema,
  })
  .strict();

export const ZBoardResolutionCertificatePayloadV2BaseSchema = z
  .object({
    actionDate: ZAuthorizationActionDateSchema,
    actionMethod: ZBoardAuthorizationActionMethodSchema,
    actionTitle: z.string().trim().min(1),
    approvalRequiredCount: z.number().int().min(1).max(3),
    authorizedOfficerDirectorIndex: z.number().int().min(0).max(2),
    authorizedOfficerName: z.string().trim().min(1),
    authorizedOfficerTitle: z.string().trim().min(1),
    certificateDate: ZAuthorizationCertificateDateSchema,
    companyLegalName: z.string().trim().min(1),
    deliveryCondition: ZOptionalTrimmedStringSchema,
    deliveryRecipient: ZOptionalTrimmedStringSchema,
    directors: z.array(ZBoardDirectorV2Schema).length(3, 'Profile requires exactly 3 Director signers.'),
    entityType: z.string().trim().min(1).default('corporation'),
    equityHolderPlural: z.string().trim().min(1).default('stockholders'),
    governingBodyName: z.string().trim().min(1).default('Board of Directors'),
    governingMemberPlural: z.string().trim().min(1).default('directors'),
    governingMemberSingular: z.string().trim().min(1).default('director'),
    jurisdiction: z.string().trim().min(1).default('Colorado'),
    materialsReviewed: z.array(z.string().trim().min(1)).default([]),
    matterDescription: z.string().trim().min(1),
    quorumRequiredCount: z.number().int().min(1).max(3),
    ratifyPriorActions: z.boolean(),
    resolutionDisposition: ZBoardResolutionDispositionSchema.default('APPROVED_UNANIMOUSLY'),
    secretaryDirectorIndex: z.number().int().min(0).max(2),
    secretaryName: z.string().trim().min(1),
    specificAction: z.string().trim().min(1),
    specificTerms: z.string().trim().default(''),
  })
  .strict();

export const validateBoardExecutionRoleAssignments = (
  payload: {
    authorizedOfficerDirectorIndex: number;
    authorizedOfficerName: string;
    directors: Array<{ name: string }>;
    secretaryDirectorIndex: number;
    secretaryName: string;
  },
  context: z.RefinementCtx,
) => {
  const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
  const secretaryDirector = payload.directors[payload.secretaryDirectorIndex];
  const authorizedOfficerDirector = payload.directors[payload.authorizedOfficerDirectorIndex];

  if (secretaryDirector && normalizeName(secretaryDirector.name) !== normalizeName(payload.secretaryName)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Secretary name must match Director ${payload.secretaryDirectorIndex + 1}.`,
      path: ['secretaryName'],
    });
  }

  if (
    authorizedOfficerDirector &&
    normalizeName(authorizedOfficerDirector.name) !== normalizeName(payload.authorizedOfficerName)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Authorized officer name must match Director ${payload.authorizedOfficerDirectorIndex + 1}.`,
      path: ['authorizedOfficerName'],
    });
  }
};

export const validateBoardDecisionConsistency = (
  payload: {
    actionMethod: z.infer<typeof ZBoardAuthorizationActionMethodSchema>;
    approvalRequiredCount: number;
    directors: Array<{
      presence: z.infer<typeof ZBoardDirectorPresenceSchema>;
      vote: z.infer<typeof ZBoardDirectorVoteSchema>;
    }>;
    quorumRequiredCount: number;
    resolutionDisposition: z.infer<typeof ZBoardResolutionDispositionSchema>;
  },
  context: z.RefinementCtx,
) => {
  const expectedPresence = payload.actionMethod === 'MEETING' ? 'PRESENT' : 'CONSENTED';
  const participatingDirectors = payload.directors.filter((director) => director.presence === expectedPresence);
  const approvalCount = participatingDirectors.filter((director) => director.vote === 'FOR').length;
  const allParticipatingDirectorsVotedFor =
    participatingDirectors.length === payload.directors.length && approvalCount === payload.directors.length;

  if (payload.actionMethod === 'UNANIMOUS_WRITTEN_CONSENT') {
    if (!allParticipatingDirectorsVotedFor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unanimous written consent requires every director to vote FOR.',
        path: ['directors'],
      });
    }

    if (payload.resolutionDisposition !== 'APPROVED_UNANIMOUSLY') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unanimous written consent requires an APPROVED_UNANIMOUSLY disposition.',
        path: ['resolutionDisposition'],
      });
    }
  }

  if (payload.actionMethod === 'MEETING' && participatingDirectors.length < payload.quorumRequiredCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A quorum requires ${payload.quorumRequiredCount} directors marked PRESENT; received ${participatingDirectors.length}.`,
      path: ['directors'],
    });
  }

  if (payload.actionMethod === 'MEETING' && payload.directors.some((director) => director.presence === 'CONSENTED')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A meeting action must mark each director PRESENT or ABSENT, not CONSENTED.',
      path: ['directors'],
    });
  }

  if (payload.actionMethod !== 'MEETING' && payload.directors.some((director) => director.presence === 'PRESENT')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A written-consent action must mark each director CONSENTED or ABSENT, not PRESENT.',
      path: ['directors'],
    });
  }

  if (payload.directors.some((director) => director.presence === 'ABSENT' && director.vote !== 'NOT_VOTING')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A director marked ABSENT must use the NOT_VOTING vote.',
      path: ['directors'],
    });
  }

  if (payload.resolutionDisposition === 'APPROVED_UNANIMOUSLY' && !allParticipatingDirectorsVotedFor) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'An approved-unanimously disposition requires every director to participate and vote FOR.',
      path: ['resolutionDisposition'],
    });
  }

  if (payload.resolutionDisposition === 'APPROVED_REQUIRED_VOTE' && approvalCount < payload.approvalRequiredCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Approval requires at least ${payload.approvalRequiredCount} FOR votes from participating directors; received ${approvalCount}.`,
      path: ['resolutionDisposition'],
    });
  }

  if (payload.resolutionDisposition === 'NOT_APPROVED' && approvalCount >= payload.approvalRequiredCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A not-approved disposition requires fewer than ${payload.approvalRequiredCount} qualifying FOR votes; received ${approvalCount}.`,
      path: ['resolutionDisposition'],
    });
  }
};

export const ZBoardResolutionCertificatePayloadSchema = ZBoardResolutionCertificatePayloadV2BaseSchema.superRefine(
  (payload, context) => {
    validateBoardExecutionRoleAssignments(payload, context);
    validateBoardDecisionConsistency(payload, context);

    if (payload.certificateDate < payload.actionDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Certificate date cannot precede the action date.',
        path: ['certificateDate'],
      });
    }

    if (payload.resolutionDisposition === 'NOT_APPROVED' && payload.ratifyPriorActions) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A not-approved decision cannot ratify prior actions.',
        path: ['ratifyPriorActions'],
      });
    }

    if (
      payload.resolutionDisposition === 'NOT_APPROVED' &&
      (Boolean(payload.deliveryRecipient) || Boolean(payload.deliveryCondition))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A not-approved decision cannot authorize document delivery.',
        path: ['deliveryRecipient'],
      });
    }

    const normalizedEmails = new Set<string>();

    payload.directors.forEach((director, index) => {
      const normalizedEmail = director.email.trim().toLowerCase();

      if (!normalizedEmail) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Director ${index + 1} requires a valid email address.`,
          path: ['directors', index, 'email'],
        });
      } else if (normalizedEmails.has(normalizedEmail)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Each signer must have a unique email address. Duplicate: "${normalizedEmail}".`,
          path: ['directors', index, 'email'],
        });
      }

      normalizedEmails.add(normalizedEmail);
    });

    if (Boolean(payload.deliveryRecipient) !== Boolean(payload.deliveryCondition)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'deliveryRecipient and deliveryCondition must both be provided or both omitted.',
        path: ['deliveryRecipient'],
      });
    }
  },
);

const templatePayloadSchemas = {
  board_resolution_secretary_certificate: new Map<number, z.ZodTypeAny>([
    [1, ZBoardResolutionCertificatePayloadV1Schema],
    [2, ZBoardResolutionCertificatePayloadSchema],
  ]),
} satisfies Record<AuthorizationTemplateKey, Map<number, z.ZodTypeAny>>;

export const authorizationTemplateTypes = {
  board_resolution_secretary_certificate: ExecutiveAuthorizationType.BOARD_RESOLUTION,
} satisfies Record<AuthorizationTemplateKey, ExecutiveAuthorizationType>;

export const parseAuthorizationTemplatePayload = ({
  payload,
  templateKey,
  templateVersion,
}: {
  payload: unknown;
  templateKey: AuthorizationTemplateKey;
  templateVersion: number;
}) => {
  const schema = templatePayloadSchemas[templateKey].get(templateVersion);

  if (!schema) {
    throw new Error(`Authorization payload schema version ${templateVersion} is not registered for "${templateKey}".`);
  }

  return schema.parse(payload);
};

export const ZPrepareExecutiveAuthorizationRecordSchema = z.object({
  notes: z.string().trim().optional(),
  payload: z.unknown(),
  templateKey: ZAuthorizationTemplateKeySchema,
  templateVersion: z.number().int().positive().optional(),
});

export const ZCreateExecutiveAuthorizationSchema = ZPrepareExecutiveAuthorizationRecordSchema.extend({
  externalId: z.string().trim().min(1).max(255).optional(),
  teamId: z.number().int().positive(),
  userId: z.number().int().positive(),
});

export type TCreateExecutiveAuthorization = z.infer<typeof ZCreateExecutiveAuthorizationSchema>;
export type TPrepareExecutiveAuthorizationRecord = z.infer<typeof ZPrepareExecutiveAuthorizationRecordSchema>;
