import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getAuthorizationTemplate } from '@documenso/lib/server-only/executive-authorizations/templates';
import { upsertExecutiveAuthorizationProfile } from '@documenso/lib/server-only/executive-authorizations/upsert-executive-authorization-profile';
import { getTeamById } from '@documenso/lib/server-only/team/get-team';
import { canExecuteTeamAction } from '@documenso/lib/utils/teams';

import { authenticatedProcedure } from '../trpc';
import {
  ZAuthorizationProfileResponseSchema,
  ZUpdateAuthorizationProfileRequestSchema,
  updateAuthorizationProfileMeta,
} from './profile.types';

export const updateAuthorizationProfileRoute = authenticatedProcedure
  .meta(updateAuthorizationProfileMeta)
  .input(ZUpdateAuthorizationProfileRequestSchema)
  .output(ZAuthorizationProfileResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const team = await getTeamById({
      teamId: ctx.teamId,
      userId: ctx.user.id,
    });

    if (!canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole)) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, {
        message: 'You do not have permission to manage authorization defaults.',
        statusCode: 403,
      });
    }

    const profile = await upsertExecutiveAuthorizationProfile({
      payloadDefaults: input.payloadDefaults,
      teamId: team.id,
      templateKey: input.templateKey,
    });

    return {
      currentTemplateVersion: getAuthorizationTemplate(input.templateKey).version,
      exists: true,
      needsUpgrade: false,
      payloadDefaults: profile.payloadDefaults as Record<string, unknown>,
      templateKey: input.templateKey,
      templateVersion: profile.templateVersion ?? null,
    };
  });
