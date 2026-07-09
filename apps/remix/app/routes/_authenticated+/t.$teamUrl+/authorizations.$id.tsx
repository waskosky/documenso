import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ExecutiveAuthorizationStatus } from '@prisma/client';
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  FilePlus2Icon,
  PencilIcon,
  RefreshCwIcon,
  SendIcon,
} from 'lucide-react';
import { Form, Link, redirect, useActionData } from 'react-router';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { createAuthorizationSigningEnvelope } from '@documenso/lib/server-only/executive-authorizations/create-authorization-signing-envelope';
import { getExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/get-executive-authorization';
import { refreshExecutiveAuthorizationStatus } from '@documenso/lib/server-only/executive-authorizations/refresh-executive-authorization-status';
import { sendExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/send-executive-authorization';
import { normalizeAuthorizationSigners } from '@documenso/lib/server-only/executive-authorizations/stored-signers';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import {
  type ApiRequestMetadata,
  extractRequestMetadata,
} from '@documenso/lib/universal/extract-request-metadata';
import {
  canExecuteTeamAction,
  formatAuthorizationsPath,
  formatDocumentsPath,
} from '@documenso/lib/utils/teams';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card } from '@documenso/ui/primitives/card';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.$id';

export function meta() {
  return appMetaTags(msg`Authorization`.id as never);
}

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

  return {
    authorization: {
      actionDate: authorization.actionDate?.toISOString() ?? null,
      companyLegalName: authorization.companyLegalName,
      completedAt: authorization.completedAt?.toISOString() ?? null,
      createdAt: authorization.createdAt.toISOString(),
      createdByUser: authorization.createdByUser,
      envelope: authorization.envelope,
      id: authorization.id,
      notes: authorization.notes,
      renderedMarkdown: authorization.renderedMarkdown,
      sentAt: authorization.sentAt?.toISOString() ?? null,
      signers: normalizeAuthorizationSigners(authorization.signers),
      status: authorization.status,
      templateKey: authorization.templateKey,
      templateVersion: authorization.templateVersion,
      title: authorization.title,
      type: authorization.type,
      updatedAt: authorization.updatedAt.toISOString(),
    },
    authorizationsPath: formatAuthorizationsPath(team.url),
    canManage: canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole),
    documentsPath: formatDocumentsPath(team.url),
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });

  if (!canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole)) {
    throw new Response('Forbidden', { status: 403 });
  }

  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');
  const requestMetadata = buildRequestMetadata({ request, user });

  try {
    if (intent === 'generate') {
      await createAuthorizationSigningEnvelope({
        id: params.id,
        requestMetadata,
        teamId: team.id,
        userId: user.id,
      });
    } else if (intent === 'send') {
      await sendExecutiveAuthorization({
        id: params.id,
        requestMetadata,
        teamId: team.id,
        userId: user.id,
      });
    } else if (intent === 'refresh') {
      await refreshExecutiveAuthorizationStatus({
        id: params.id,
        teamId: team.id,
      });
    } else {
      return {
        error: 'Unknown authorization action.',
      };
    }

    throw redirect(`${formatAuthorizationsPath(team.url)}/${params.id}`);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : 'Unable to update authorization.',
    };
  }
}

export default function AuthorizationDetailPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const { authorization, authorizationsPath, canManage, documentsPath } = loaderData;
  const signers = authorization.signers;
  const canEdit = canManage && authorization.status === ExecutiveAuthorizationStatus.DRAFT;
  const canGenerate =
    canManage &&
    authorization.status === ExecutiveAuthorizationStatus.DRAFT &&
    !authorization.envelope;
  const canSend =
    canManage &&
    (authorization.status === ExecutiveAuthorizationStatus.DRAFT ||
      authorization.status === ExecutiveAuthorizationStatus.READY);
  const canRefresh = canManage && Boolean(authorization.envelope);

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8">
      <Button asChild variant="ghost" className="-ml-3 mb-6">
        <Link to={authorizationsPath}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          <Trans>Authorizations</Trans>
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{authorization.status}</Badge>
            <Badge variant="neutral">{authorization.type}</Badge>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold">{authorization.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {authorization.companyLegalName}
            {authorization.actionDate
              ? ` - ${new Date(authorization.actionDate).toLocaleDateString()}`
              : ''}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {canEdit && (
            <Button asChild variant="outline">
              <Link to={`${authorizationsPath}/${authorization.id}/edit`}>
                <PencilIcon className="mr-2 h-4 w-4" />
                <Trans>Edit draft</Trans>
              </Link>
            </Button>
          )}

          {canGenerate && (
            <Form method="post">
              <input type="hidden" name="intent" value="generate" />
              <Button type="submit" variant="outline">
                <FilePlus2Icon className="mr-2 h-4 w-4" />
                <Trans>Generate document</Trans>
              </Button>
            </Form>
          )}

          {canSend && (
            <Form method="post">
              <input type="hidden" name="intent" value="send" />
              <Button type="submit">
                <SendIcon className="mr-2 h-4 w-4" />
                <Trans>Send for signature</Trans>
              </Button>
            </Form>
          )}

          {canRefresh && (
            <Form method="post">
              <input type="hidden" name="intent" value="refresh" />
              <Button type="submit" variant="outline">
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                <Trans>Refresh status</Trans>
              </Button>
            </Form>
          )}

          {authorization.envelope && (
            <Button asChild variant="outline">
              <Link to={`${documentsPath}/${authorization.envelope.id}`}>
                <ExternalLinkIcon className="mr-2 h-4 w-4" />
                <Trans>View document</Trans>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {actionData?.error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>
            <Trans>Unable to update authorization</Trans>
          </AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">
            <Trans>Rendered certificate</Trans>
          </h2>
          <pre className="mt-5 whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6 text-foreground">
            {authorization.renderedMarkdown}
          </pre>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">
              <Trans>Record details</Trans>
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail label="Template" value={authorization.templateKey} />
              <Detail label="Template version" value={String(authorization.templateVersion)} />
              <Detail label="Created" value={new Date(authorization.createdAt).toLocaleString()} />
              <Detail label="Updated" value={new Date(authorization.updatedAt).toLocaleString()} />
              {authorization.sentAt && (
                <Detail label="Sent" value={new Date(authorization.sentAt).toLocaleString()} />
              )}
              {authorization.completedAt && (
                <Detail
                  label="Completed"
                  value={new Date(authorization.completedAt).toLocaleString()}
                />
              )}
              <Detail
                label="Created by"
                value={
                  authorization.createdByUser.name
                    ? `${authorization.createdByUser.name} (${authorization.createdByUser.email})`
                    : authorization.createdByUser.email
                }
              />
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">
              <Trans>Signers</Trans>
            </h2>
            <div className="mt-4 space-y-3">
              {signers.map((signer, index) => (
                <div key={index} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium">{String(signer.name ?? 'Unnamed signer')}</div>
                    {signer.status && <Badge variant="neutral">{signer.status}</Badge>}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {String(signer.role ?? 'Signer')}
                    {signer.email ? ` - ${String(signer.email)}` : ''}
                  </div>
                  {signer.signingUrl && (
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs text-documenso-700 hover:opacity-80"
                      href={signer.signingUrl}
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                      <Trans>Signing link</Trans>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {authorization.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">
                <Trans>Internal notes</Trans>
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {authorization.notes}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words font-medium">{value}</dd>
  </div>
);
