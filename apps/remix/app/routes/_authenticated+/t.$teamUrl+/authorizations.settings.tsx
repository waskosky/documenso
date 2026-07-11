import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getExecutiveAuthorizationProfile } from '@documenso/lib/server-only/executive-authorizations/get-executive-authorization-profile';
import { parseAuthorizationTemplateProfilePayload } from '@documenso/lib/server-only/executive-authorizations/profile-payload';
import { getAuthorizationTemplate } from '@documenso/lib/server-only/executive-authorizations/templates';
import { upsertExecutiveAuthorizationProfile } from '@documenso/lib/server-only/executive-authorizations/upsert-executive-authorization-profile';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { formatAuthorizationsPath } from '@documenso/lib/utils/teams';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { ArrowLeftIcon, SaveIcon } from 'lucide-react';
import { Form, Link, redirect, useActionData } from 'react-router';

import { AuthorizationProfileForm } from '~/components/executive-authorizations/authorization-profile-form';
import { requireAuthorizationManager } from '~/utils/authorization-permissions';
import { buildBoardAuthorizationProfileInputFromFormData } from '~/utils/executive-authorizations';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.settings';

const templateKey = 'board_resolution_secretary_certificate' as const;

export function meta() {
  return appMetaTags(msg`Authorization Defaults`.id as never);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });

  requireAuthorizationManager(team.currentTeamRole);

  const profile = await getExecutiveAuthorizationProfile({
    teamId: team.id,
    templateKey,
  });
  const profileDefaults = profile?.payloadDefaults
    ? parseAuthorizationTemplateProfilePayload({
        payload: profile.payloadDefaults,
        templateKey,
      })
    : null;

  return {
    authorizationsPath: formatAuthorizationsPath(team.url),
    profileDefaults,
    saved: new URL(request.url).searchParams.get('saved') === '1',
    signerRoles: getAuthorizationTemplate(templateKey).signing.signerRoles,
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });

  requireAuthorizationManager(team.currentTeamRole);

  const signerRoles = getAuthorizationTemplate(templateKey).signing.signerRoles;
  const formData = await request.formData();

  try {
    await upsertExecutiveAuthorizationProfile({
      payloadDefaults: buildBoardAuthorizationProfileInputFromFormData(formData, signerRoles),
      teamId: team.id,
      templateKey,
    });

    throw redirect(`${formatAuthorizationsPath(team.url)}/settings?saved=1`);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : 'Unable to save authorization defaults.',
    };
  }
}

export default function AuthorizationSettingsPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const { authorizationsPath, profileDefaults, saved, signerRoles } = loaderData;

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
        <Link to={authorizationsPath}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Authorizations
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="font-semibold text-3xl">Authorization defaults</h1>
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertTitle>Defaults saved</AlertTitle>
          <AlertDescription>New board authorizations will start with these values.</AlertDescription>
        </Alert>
      )}

      {actionData?.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Unable to save defaults</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      <Form method="post">
        <AuthorizationProfileForm defaultValues={profileDefaults ?? undefined} signerRoles={signerRoles} />

        <div className="mt-6 flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link to={authorizationsPath}>Cancel</Link>
          </Button>
          <Button type="submit">
            <SaveIcon className="mr-2 h-4 w-4" />
            Save defaults
          </Button>
        </div>
      </Form>
    </div>
  );
}
