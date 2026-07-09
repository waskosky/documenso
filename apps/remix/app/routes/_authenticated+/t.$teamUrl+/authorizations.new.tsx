import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ArrowLeftIcon } from 'lucide-react';
import { Form, Link, redirect, useActionData } from 'react-router';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { createExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/create-executive-authorization';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { formatAuthorizationsPath } from '@documenso/lib/utils/teams';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';

import { BoardAuthorizationForm } from '~/components/executive-authorizations/board-authorization-form';
import { buildBoardAuthorizationInputFromFormData } from '~/utils/executive-authorizations';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.new';

export function meta() {
  return appMetaTags(msg`New Authorization`.id as never);
}

export async function action({ params, request }: Route.ActionArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });
  const formData = await request.formData();

  try {
    const authorization = await createExecutiveAuthorization({
      ...buildBoardAuthorizationInputFromFormData(formData),
      teamId: team.id,
      userId: user.id,
    });

    throw redirect(`${formatAuthorizationsPath(team.url)}/${authorization.id}`);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : 'Unable to create authorization.',
    };
  }
}

export default function NewAuthorizationPage({ params }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const authorizationsPath = formatAuthorizationsPath(params.teamUrl);

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <Button asChild variant="ghost" className="-ml-3 mb-6">
        <Link to={authorizationsPath}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          <Trans>Authorizations</Trans>
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          <Trans>New board authorization</Trans>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          <Trans>
            Fill the structured decision record first. The generated certificate can then be used
            for Documenso signing and future audit trails.
          </Trans>
        </p>
      </div>

      {actionData?.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>
            <Trans>Unable to create authorization</Trans>
          </AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      <Form method="post">
        <BoardAuthorizationForm />

        <div className="mt-6 flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link to={authorizationsPath}>
              <Trans>Cancel</Trans>
            </Link>
          </Button>
          <Button type="submit">
            <Trans>Create authorization</Trans>
          </Button>
        </div>
      </Form>
    </div>
  );
}
