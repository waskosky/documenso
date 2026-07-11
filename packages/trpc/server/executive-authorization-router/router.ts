import { router } from '../trpc';
import { createAuthorizationRoute } from './create-authorization';
import { getAuthorizationProfileRoute } from './get-profile';
import { updateAuthorizationProfileRoute } from './update-profile';

export const executiveAuthorizationRouter = router({
  create: createAuthorizationRoute,
  profile: {
    get: getAuthorizationProfileRoute,
    update: updateAuthorizationProfileRoute,
  },
});
