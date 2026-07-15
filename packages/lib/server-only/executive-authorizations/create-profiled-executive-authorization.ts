import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { prisma } from '@documenso/prisma';
import { ExecutiveAuthorizationStatus } from '@prisma/client';
import { z } from 'zod';

import { assertAuthorizationEnvelopeIntegrity } from './assert-authorization-envelope-integrity';
import { createAuthorizationSigningEnvelope } from './create-authorization-signing-envelope';
import { createExecutiveAuthorization } from './create-executive-authorization';
import { getExecutiveAuthorization } from './get-executive-authorization';
import { getExecutiveAuthorizationProfile } from './get-executive-authorization-profile';
import { mergeAuthorizationProfilePayload } from './profile-payload';
import { buildAuthorizationProfileRevision } from './profile-revision';
import { parseAuthorizationTemplatePayload } from './schema';
import { normalizeAuthorizationSigners } from './stored-signers';
import { getAuthorizationTemplate } from './templates';
import type { AuthorizationTemplateKey } from './types';

type AuthorizationEnvelopeIntegrityInput = Parameters<typeof assertAuthorizationEnvelopeIntegrity>[0];

type ProfiledExecutiveAuthorizationRecord = {
  envelope: AuthorizationEnvelopeIntegrityInput['envelope'] | null;
  generatedDocumentDataId: string | null;
  id: string;
  renderedMarkdown: string;
  signers: unknown;
  status: string;
  templateKey: string;
  templateVersion: number;
  title: string;
  [key: string]: unknown;
};

type ProfiledExecutiveAuthorizationDependencies = {
  assertEnvelopeIntegrity: typeof assertAuthorizationEnvelopeIntegrity;
  createAuthorization: (input: Record<string, unknown>) => Promise<{ id: string }>;
  createEnvelope: (input: {
    id: string;
    requestMetadata: ApiRequestMetadata;
    teamId: number;
    userId: number;
  }) => Promise<{ id: string }>;
  getAuthorization: (input: { id: string; teamId: number }) => Promise<ProfiledExecutiveAuthorizationRecord | null>;
  getAuthorizationByExternalId: (input: { externalId: string; teamId: number }) => Promise<{
    id: string;
    payload: unknown;
    templateKey: string;
    templateVersion: number;
  } | null>;
  getProfile: (input: { teamId: number; templateKey: AuthorizationTemplateKey }) => Promise<{
    id: string;
    payloadDefaults?: unknown;
    templateVersion?: number;
    updatedAt?: Date;
  } | null>;
};

const defaultDependencies: ProfiledExecutiveAuthorizationDependencies = {
  assertEnvelopeIntegrity: assertAuthorizationEnvelopeIntegrity,
  createAuthorization: createExecutiveAuthorization,
  createEnvelope: createAuthorizationSigningEnvelope,
  getAuthorization: getExecutiveAuthorization,
  getAuthorizationByExternalId: async ({ externalId, teamId }) =>
    await prisma.executiveAuthorization.findUnique({
      select: {
        id: true,
        payload: true,
        templateKey: true,
        templateVersion: true,
      },
      where: {
        teamId_externalId: {
          externalId,
          teamId,
        },
      },
    }),
  getProfile: getExecutiveAuthorizationProfile,
};

export const createProfiledExecutiveAuthorization = async (
  {
    expectedProfileRevision,
    externalId,
    generateDocument = true,
    notes,
    payload,
    requestMetadata,
    teamId,
    templateKey,
    userId,
  }: {
    expectedProfileRevision?: string;
    externalId: string;
    generateDocument?: boolean;
    notes?: string;
    payload: unknown;
    requestMetadata: ApiRequestMetadata;
    teamId: number;
    templateKey: AuthorizationTemplateKey;
    userId: number;
  },
  dependencies: ProfiledExecutiveAuthorizationDependencies = defaultDependencies,
) => {
  const existingAuthorization = externalId
    ? await dependencies.getAuthorizationByExternalId({ externalId, teamId })
    : null;
  let mergedPayload: unknown;
  let templateVersion: number;

  if (existingAuthorization) {
    if (existingAuthorization.templateKey !== templateKey) {
      throw new Error(`External ID "${externalId}" belongs to a different authorization template.`);
    }

    templateVersion = existingAuthorization.templateVersion;
    mergedPayload = parseAuthorizationTemplatePayload({
      payload: {
        ...z.record(z.unknown()).parse(existingAuthorization.payload),
        ...z.record(z.unknown()).parse(payload),
      },
      templateKey,
      templateVersion,
    });
  } else {
    const profile = await dependencies.getProfile({
      teamId,
      templateKey,
    });

    if (!profile?.payloadDefaults) {
      throw new Error(`Authorization defaults are not configured for template "${templateKey}".`);
    }

    templateVersion = getAuthorizationTemplate(templateKey).version;

    if (profile.templateVersion !== templateVersion) {
      throw new Error(
        `Authorization defaults for template "${templateKey}" must be reviewed and upgraded to version ${templateVersion}.`,
      );
    }

    if (
      expectedProfileRevision !== undefined &&
      buildAuthorizationProfileRevision(profile) !== expectedProfileRevision
    ) {
      throw new Error('Authorization defaults changed after this form was loaded. Reload and review them again.');
    }

    mergedPayload = mergeAuthorizationProfilePayload({
      payload,
      profilePayload: profile.payloadDefaults,
      templateKey,
      templateVersion,
    });
  }

  const authorization = await dependencies.createAuthorization({
    externalId,
    notes,
    payload: mergedPayload,
    teamId,
    templateKey,
    templateVersion,
    userId,
  });
  let generationError: string | null = null;
  let integrityError: string | null = null;

  if (generateDocument) {
    try {
      await dependencies.createEnvelope({
        id: authorization.id,
        requestMetadata,
        teamId,
        userId,
      });
    } catch (error) {
      generationError = error instanceof Error ? error.message : 'Unable to generate the signing document.';
    }
  }

  const currentAuthorization = await dependencies.getAuthorization({
    id: authorization.id,
    teamId,
  });

  if (!currentAuthorization) {
    throw new Error('Created authorization could not be loaded.');
  }

  const requiresPreSendIntegrityCheck =
    currentAuthorization.status === ExecutiveAuthorizationStatus.DRAFT ||
    currentAuthorization.status === ExecutiveAuthorizationStatus.READY;

  if (currentAuthorization.envelope && requiresPreSendIntegrityCheck) {
    try {
      await dependencies.assertEnvelopeIntegrity({
        authorization: {
          generatedDocumentDataId: currentAuthorization.generatedDocumentDataId,
          id: currentAuthorization.id,
          renderedMarkdown: currentAuthorization.renderedMarkdown,
          signers: normalizeAuthorizationSigners(currentAuthorization.signers),
          templateKey: currentAuthorization.templateKey as AuthorizationTemplateKey,
          templateVersion: currentAuthorization.templateVersion,
          title: currentAuthorization.title,
        },
        envelope: currentAuthorization.envelope,
      });
    } catch (error) {
      integrityError = error instanceof Error ? error.message : 'Unable to validate the signing document.';
    }
  }

  return {
    authorization: currentAuthorization,
    generationError,
    integrityError,
  };
};
