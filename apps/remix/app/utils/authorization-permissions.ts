import { canExecuteTeamAction } from '@documenso/lib/utils/teams';

export const requireAuthorizationManager = (teamRole: Parameters<typeof canExecuteTeamAction>[1]) => {
  if (!canExecuteTeamAction('MANAGE_TEAM', teamRole)) {
    throw new Response('Forbidden', { status: 403 });
  }
};
