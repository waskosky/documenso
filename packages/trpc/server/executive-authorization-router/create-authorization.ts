import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { createProfiledExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/create-profiled-executive-authorization';
import { getTeamById } from '@documenso/lib/server-only/team/get-team';
import { canExecuteTeamAction } from '@documenso/lib/utils/teams';

import { authenticatedProcedure } from '../trpc';
import {
  buildCreateAuthorizationResponse,
  createAuthorizationMeta,
  ZCreateAuthorizationRequestSchema,
  ZCreateAuthorizationResponseSchema,
} from './create-authorization.types';

export const createAuthorizationRoute = authenticatedProcedure
  .meta(createAuthorizationMeta)
  .input(ZCreateAuthorizationRequestSchema)
  .output(ZCreateAuthorizationResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const team = await getTeamById({
      teamId: ctx.teamId,
      userId: ctx.user.id,
    });

    if (!canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole)) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, {
        message: 'You do not have permission to create executive authorizations.',
        statusCode: 403,
      });
    }

    const result = await createProfiledExecutiveAuthorization({
      externalId: input.externalId,
      generateDocument: input.generateDocument,
      notes: input.notes,
      payload: input.payload,
      requestMetadata: ctx.metadata,
      teamId: team.id,
      templateKey: input.templateKey,
      userId: ctx.user.id,
    });

    return buildCreateAuthorizationResponse({
      authorization: result.authorization,
      generationError: result.generationError,
      teamUrl: team.url,
      webAppUrl: NEXT_PUBLIC_WEBAPP_URL(),
    });
  });
