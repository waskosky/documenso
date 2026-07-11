import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getExecutiveAuthorizationProfile } from '@documenso/lib/server-only/executive-authorizations/get-executive-authorization-profile';
import { parseAuthorizationTemplateProfilePayload } from '@documenso/lib/server-only/executive-authorizations/profile-payload';
import { getAuthorizationTemplate } from '@documenso/lib/server-only/executive-authorizations/templates';
import { getTeamById } from '@documenso/lib/server-only/team/get-team';
import { canExecuteTeamAction } from '@documenso/lib/utils/teams';

import { authenticatedProcedure } from '../trpc';
import {
  getAuthorizationProfileMeta,
  ZAuthorizationProfileResponseSchema,
  ZGetAuthorizationProfileRequestSchema,
} from './profile.types';

export const getAuthorizationProfileRoute = authenticatedProcedure
  .meta(getAuthorizationProfileMeta)
  .input(ZGetAuthorizationProfileRequestSchema)
  .output(ZAuthorizationProfileResponseSchema)
  .query(async ({ input, ctx }) => {
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

    const profile = await getExecutiveAuthorizationProfile({
      teamId: team.id,
      templateKey: input.templateKey,
    });
    const currentTemplateVersion = getAuthorizationTemplate(input.templateKey).version;
    const storedTemplateVersion = profile?.templateVersion ?? null;

    return {
      currentTemplateVersion,
      exists: Boolean(profile),
      needsUpgrade: Boolean(profile && storedTemplateVersion !== currentTemplateVersion),
      payloadDefaults: profile?.payloadDefaults
        ? parseAuthorizationTemplateProfilePayload({
            payload: profile.payloadDefaults,
            templateKey: input.templateKey,
            templateVersion: storedTemplateVersion ?? 1,
          })
        : null,
      templateKey: input.templateKey,
      templateVersion: storedTemplateVersion,
    };
  });
