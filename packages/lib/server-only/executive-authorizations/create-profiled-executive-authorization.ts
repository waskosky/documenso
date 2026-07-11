import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';

import { createAuthorizationSigningEnvelope } from './create-authorization-signing-envelope';
import { createExecutiveAuthorization } from './create-executive-authorization';
import { getExecutiveAuthorization } from './get-executive-authorization';
import { getExecutiveAuthorizationProfile } from './get-executive-authorization-profile';
import { mergeAuthorizationProfilePayload } from './profile-payload';
import type { AuthorizationTemplateKey } from './types';

type ProfiledExecutiveAuthorizationRecord = {
  envelope: null | {
    id: string;
    [key: string]: unknown;
  };
  id: string;
  signers: unknown;
  status: string;
  templateKey: string;
  [key: string]: unknown;
};

type ProfiledExecutiveAuthorizationDependencies = {
  createAuthorization: (input: Record<string, unknown>) => Promise<{ id: string }>;
  createEnvelope: (input: {
    id: string;
    requestMetadata: ApiRequestMetadata;
    teamId: number;
    userId: number;
  }) => Promise<{ id: string }>;
  getAuthorization: (input: { id: string; teamId: number }) => Promise<ProfiledExecutiveAuthorizationRecord | null>;
  getProfile: (input: {
    teamId: number;
    templateKey: AuthorizationTemplateKey;
  }) => Promise<{ payloadDefaults?: unknown } | null>;
};

const defaultDependencies: ProfiledExecutiveAuthorizationDependencies = {
  createAuthorization: createExecutiveAuthorization,
  createEnvelope: createAuthorizationSigningEnvelope,
  getAuthorization: getExecutiveAuthorization,
  getProfile: getExecutiveAuthorizationProfile,
};

export const createProfiledExecutiveAuthorization = async (
  {
    externalId,
    generateDocument = true,
    notes,
    payload,
    requestMetadata,
    teamId,
    templateKey,
    userId,
  }: {
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
  const profile = await dependencies.getProfile({
    teamId,
    templateKey,
  });

  if (!profile?.payloadDefaults) {
    throw new Error(`Authorization defaults are not configured for template "${templateKey}".`);
  }

  const mergedPayload = mergeAuthorizationProfilePayload({
    payload,
    profilePayload: profile.payloadDefaults,
    templateKey,
  });
  const authorization = await dependencies.createAuthorization({
    externalId,
    notes,
    payload: mergedPayload,
    teamId,
    templateKey,
    userId,
  });
  let generationError: string | null = null;

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

  return {
    authorization: currentAuthorization,
    generationError,
  };
};
