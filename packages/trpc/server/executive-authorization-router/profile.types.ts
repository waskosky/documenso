import { ZAuthorizationTemplateKeySchema } from '@documenso/lib/server-only/executive-authorizations/schema';
import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

const profilePath = '/executive-authorization/profile/{templateKey}' as const;

export const getAuthorizationProfileMeta: TrpcRouteMeta = {
  openapi: {
    method: 'GET',
    path: profilePath,
    summary: 'Get executive authorization defaults',
    tags: ['Executive Authorization'],
  },
};

export const updateAuthorizationProfileMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: profilePath,
    summary: 'Update executive authorization defaults',
    tags: ['Executive Authorization'],
  },
};

export const ZGetAuthorizationProfileRequestSchema = z.object({
  templateKey: ZAuthorizationTemplateKeySchema,
});

export const ZUpdateAuthorizationProfileRequestSchema = ZGetAuthorizationProfileRequestSchema.extend({
  payloadDefaults: z.record(z.unknown()),
});

export const ZAuthorizationProfileResponseSchema = z.object({
  currentTemplateVersion: z.number().int().positive(),
  exists: z.boolean(),
  needsUpgrade: z.boolean(),
  payloadDefaults: z.record(z.unknown()).nullable(),
  templateKey: ZAuthorizationTemplateKeySchema,
  templateVersion: z.number().int().positive().nullable(),
});

export type TGetAuthorizationProfileRequest = z.infer<typeof ZGetAuthorizationProfileRequestSchema>;
export type TUpdateAuthorizationProfileRequest = z.infer<typeof ZUpdateAuthorizationProfileRequestSchema>;
export type TAuthorizationProfileResponse = z.infer<typeof ZAuthorizationProfileResponseSchema>;
