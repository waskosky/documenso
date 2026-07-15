import { randomUUID } from 'node:crypto';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { createProfiledExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/create-profiled-executive-authorization';
import { getExecutiveAuthorizationProfile } from '@documenso/lib/server-only/executive-authorizations/get-executive-authorization-profile';
import { parseAuthorizationTemplateProfilePayload } from '@documenso/lib/server-only/executive-authorizations/profile-payload';
import { buildAuthorizationProfileRevision } from '@documenso/lib/server-only/executive-authorizations/profile-revision';
import { getAuthorizationTemplate } from '@documenso/lib/server-only/executive-authorizations/templates';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { type ApiRequestMetadata, extractRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { formatAuthorizationsPath } from '@documenso/lib/utils/teams';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ExecutiveAuthorizationStatus } from '@prisma/client';
import { ArrowLeftIcon, FilePlus2Icon, Loader2Icon, Settings2Icon } from 'lucide-react';
import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';

import { AuthorizationProfileSummary } from '~/components/executive-authorizations/authorization-profile-summary';
import { BoardAuthorizationDecisionForm } from '~/components/executive-authorizations/board-authorization-decision-form';
import { requireAuthorizationManager } from '~/utils/authorization-permissions';
import { buildBoardAuthorizationDecisionInputFromFormData } from '~/utils/executive-authorizations';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.new';

export function meta() {
  return appMetaTags(msg`New Authorization`.id as never);
}

const templateKey = 'board_resolution_secretary_certificate' as const;
const expectedRecipientCount = 3;
const expectedFieldCount = 9;

const buildRequestMetadata = ({
  request,
  user,
}: {
  request: Request;
  user: { email: string; id: number; name?: string | null };
}): ApiRequestMetadata => ({
  auditUser: {
    email: user.email,
    id: user.id,
    name: user.name ?? null,
  },
  auth: 'session',
  requestMetadata: extractRequestMetadata(request),
  source: 'app',
});

const getProfileState = async (teamId: number) => {
  const template = getAuthorizationTemplate(templateKey);

  if (template.version !== 2) {
    throw new Response('The current board authorization template is not supported by this form.', { status: 500 });
  }

  const profile = await getExecutiveAuthorizationProfile({
    teamId,
    templateKey,
  });
  const profileNeedsUpgrade = Boolean(profile && profile.templateVersion !== template.version);
  const profileDefaults =
    profile?.payloadDefaults && !profileNeedsUpgrade
      ? parseAuthorizationTemplateProfilePayload({
          payload: profile.payloadDefaults,
          templateKey,
          templateVersion: template.version,
        })
      : null;

  return {
    profileDefaults,
    profileExists: Boolean(profile?.payloadDefaults),
    profileNeedsUpgrade,
    profileRevision: profileDefaults && profile ? buildAuthorizationProfileRevision(profile) : null,
  };
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });
  requireAuthorizationManager(team.currentTeamRole);

  return {
    ...(await getProfileState(team.id)),
    externalId: `board-web-${randomUUID()}`,
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });
  requireAuthorizationManager(team.currentTeamRole);

  const formData = await request.formData();
  const externalId = String(formData.get('externalId') ?? '').trim();

  try {
    const input = buildBoardAuthorizationDecisionInputFromFormData(formData);
    const result = await createProfiledExecutiveAuthorization({
      expectedProfileRevision: input.profileRevision,
      externalId: input.externalId,
      notes: input.notes,
      payload: input.payload,
      requestMetadata: buildRequestMetadata({ request, user }),
      teamId: team.id,
      templateKey,
      userId: user.id,
    });
    const recipients = result.authorization.envelope?.recipients ?? [];
    const recipientCount = recipients.length;
    const fieldCount = recipients.reduce((count, recipient) => count + recipient.fields.length, 0);
    const isReviewReady =
      result.authorization.status === ExecutiveAuthorizationStatus.READY &&
      recipientCount === expectedRecipientCount &&
      fieldCount === expectedFieldCount &&
      !result.generationError &&
      !result.integrityError;
    const createdState = isReviewReady ? 'ready' : 'review';

    throw redirect(`${formatAuthorizationsPath(team.url)}/${result.authorization.id}?created=${createdState}`);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : 'Unable to create authorization.',
      externalId,
    };
  }
}

export default function NewAuthorizationPage({ loaderData, params }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const authorizationsPath = formatAuthorizationsPath(params.teamUrl);
  const settingsPath = `${authorizationsPath}/settings`;
  const isSubmitting = navigation.state === 'submitting';
  const externalId = actionData?.externalId || loaderData.externalId;

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
        <Link to={authorizationsPath}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          <Trans>Authorizations</Trans>
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="font-semibold text-3xl">
          <Trans>New board authorization</Trans>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">Board resolution and secretary certificate</p>
      </div>

      {actionData?.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>
            <Trans>Unable to create authorization</Trans>
          </AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      {!loaderData.profileExists && (
        <Alert className="mb-6">
          <AlertTitle>Authorization defaults required</AlertTitle>
          <AlertDescription>
            Configure the organization, governance, board, and execution roles before creating a record.{' '}
            <Link className="font-medium underline" to={settingsPath}>
              Open Authorization defaults
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {loaderData.profileNeedsUpgrade && (
        <Alert className="mb-6">
          <AlertTitle>Authorization defaults need review</AlertTitle>
          <AlertDescription>
            The saved defaults use an earlier certificate version.{' '}
            <Link className="font-medium underline" to={settingsPath}>
              Review Authorization defaults
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {loaderData.profileDefaults && loaderData.profileRevision && (
        <>
          <AuthorizationProfileSummary
            actions={
              <Button asChild size="sm" variant="outline">
                <Link to={settingsPath}>
                  <Settings2Icon className="mr-2 h-4 w-4" />
                  Edit defaults
                </Link>
              </Button>
            }
            profile={loaderData.profileDefaults}
          />

          <Form className="mt-8" method="post">
            <BoardAuthorizationDecisionForm
              externalId={externalId}
              profileRevision={loaderData.profileRevision}
              resolutionDisposition={loaderData.profileDefaults.resolutionDisposition}
            />

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t pt-6">
              <Button asChild variant="outline">
                <Link to={authorizationsPath}>
                  <Trans>Cancel</Trans>
                </Link>
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FilePlus2Icon className="mr-2 h-4 w-4" />
                )}
                Create review draft
              </Button>
            </div>
          </Form>
        </>
      )}
    </div>
  );
}
