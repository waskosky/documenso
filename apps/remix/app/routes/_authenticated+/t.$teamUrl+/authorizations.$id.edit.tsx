import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ExecutiveAuthorizationStatus } from '@prisma/client';
import { ArrowLeftIcon } from 'lucide-react';
import { Form, Link, redirect, useActionData } from 'react-router';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/get-executive-authorization';
import type { BoardResolutionCertificatePayload } from '@documenso/lib/server-only/executive-authorizations/types';
import { updateExecutiveAuthorizationDraft } from '@documenso/lib/server-only/executive-authorizations/update-executive-authorization';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { formatAuthorizationsPath } from '@documenso/lib/utils/teams';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';

import { BoardAuthorizationForm } from '~/components/executive-authorizations/board-authorization-form';
import { buildBoardAuthorizationInputFromFormData } from '~/utils/executive-authorizations';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.$id.edit';

export function meta() {
  return appMetaTags(msg`Edit Authorization`.id as never);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });
  const authorization = await getExecutiveAuthorization({
    id: params.id,
    teamId: team.id,
  });

  if (!authorization) {
    throw new Response('Not Found', { status: 404 });
  }

  if (authorization.status !== ExecutiveAuthorizationStatus.DRAFT) {
    throw new Response('Only draft authorizations can be edited.', { status: 400 });
  }

  return {
    authorization: {
      id: authorization.id,
      notes: authorization.notes,
      payload: authorization.payload as BoardResolutionCertificatePayload,
      title: authorization.title,
    },
    authorizationDetailPath: `${formatAuthorizationsPath(team.url)}/${authorization.id}`,
    authorizationsPath: formatAuthorizationsPath(team.url),
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });
  const formData = await request.formData();

  try {
    const authorization = await updateExecutiveAuthorizationDraft({
      ...buildBoardAuthorizationInputFromFormData(formData),
      id: params.id,
      teamId: team.id,
    });

    throw redirect(`${formatAuthorizationsPath(team.url)}/${authorization.id}`);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : 'Unable to update authorization.',
    };
  }
}

export default function EditAuthorizationPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const { authorization, authorizationDetailPath, authorizationsPath } = loaderData;

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <Button asChild variant="ghost" className="-ml-3 mb-6">
        <Link to={authorizationDetailPath}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          <Trans>Authorization</Trans>
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          <Trans>Edit authorization</Trans>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{authorization.title}</p>
      </div>

      {actionData?.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>
            <Trans>Unable to update authorization</Trans>
          </AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      <Form method="post">
        <BoardAuthorizationForm
          defaultValues={{ ...authorization.payload, notes: authorization.notes }}
        />

        <div className="mt-6 flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link to={authorizationsPath}>
              <Trans>Cancel</Trans>
            </Link>
          </Button>
          <Button type="submit">
            <Trans>Save changes</Trans>
          </Button>
        </div>
      </Form>
    </div>
  );
}
