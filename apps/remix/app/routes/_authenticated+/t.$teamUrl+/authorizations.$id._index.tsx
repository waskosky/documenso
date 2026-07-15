import type { ReactNode } from 'react';

import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ExecutiveAuthorizationStatus } from '@prisma/client';
import {
  ArrowLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileCheck2Icon,
  FilePlus2Icon,
  PencilIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  SendIcon,
} from 'lucide-react';
import { Form, Link, redirect, useActionData } from 'react-router';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { buildAuthorizationArtifactLinks } from '@documenso/lib/server-only/executive-authorizations/authorization-artifacts';
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

import { EmailAddressText } from '~/components/executive-authorizations/email-address-text';
import {
  formatAuthorizationDate,
  formatAuthorizationDateTime,
} from '~/utils/authorization-date-format';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.$id._index';

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
  const created = new URL(request.url).searchParams.get('created');
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
      actionDateDisplay: formatAuthorizationDate(authorization.actionDate?.toISOString()),
      artifactLinks: buildAuthorizationArtifactLinks({
        envelope: authorization.envelope,
      }),
      companyLegalName: authorization.companyLegalName,
      completedAt: authorization.completedAt?.toISOString() ?? null,
      completedAtDisplay: formatAuthorizationDateTime(authorization.completedAt?.toISOString()),
      createdAt: authorization.createdAt.toISOString(),
      createdAtDisplay: formatAuthorizationDateTime(authorization.createdAt.toISOString()),
      createdByUser: authorization.createdByUser,
      envelope: authorization.envelope,
      externalId: authorization.externalId,
      id: authorization.id,
      notes: authorization.notes,
      renderedMarkdown: authorization.renderedMarkdown,
      sentAt: authorization.sentAt?.toISOString() ?? null,
      sentAtDisplay: formatAuthorizationDateTime(authorization.sentAt?.toISOString()),
      signers: normalizeAuthorizationSigners(authorization.signers),
      status: authorization.status,
      templateKey: authorization.templateKey,
      templateVersion: authorization.templateVersion,
      title: authorization.title,
      type: authorization.type,
      updatedAt: authorization.updatedAt.toISOString(),
      updatedAtDisplay: formatAuthorizationDateTime(authorization.updatedAt.toISOString()),
    },
    authorizationsPath: formatAuthorizationsPath(team.url),
    canManage: canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole),
    creationState: created === 'ready' || created === 'review' ? created : null,
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
  const { authorization, authorizationsPath, canManage, creationState, documentsPath } = loaderData;
  const signers = authorization.signers;
  const canEdit = canManage && authorization.status === ExecutiveAuthorizationStatus.DRAFT;
  const canGenerate =
    canManage &&
    authorization.status === ExecutiveAuthorizationStatus.DRAFT &&
    !authorization.envelope;
  const canSend =
    canManage &&
    authorization.status === ExecutiveAuthorizationStatus.READY &&
    Boolean(authorization.envelope);
  const canRefresh = canManage && Boolean(authorization.envelope);
  const showCreatedReady =
    creationState === 'ready' &&
    authorization.status === ExecutiveAuthorizationStatus.READY &&
    Boolean(authorization.envelope);
  const showCreatedReview = Boolean(creationState) && !showCreatedReady;

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
            {authorization.actionDateDisplay ? ` - ${authorization.actionDateDisplay}` : ''}
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

      {showCreatedReady && (
        <Alert className="mt-6">
          <AlertTitle>
            <Trans>Review draft created</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>The authorization record and signing envelope are ready for review. No email was sent.</Trans>
          </AlertDescription>
        </Alert>
      )}

      {showCreatedReview && (
        <Alert className="mt-6" variant="warning">
          <AlertTitle>
            <Trans>Authorization saved; document needs review</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>The durable record was created, but its signing envelope needs attention. No email was sent.</Trans>
          </AlertDescription>
        </Alert>
      )}

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
              <Detail label="Reference" value={authorization.externalId ?? 'Not set'} />
              <Detail label="Template" value={authorization.templateKey} />
              <Detail label="Template version" value={String(authorization.templateVersion)} />
              <Detail label="Created" value={authorization.createdAtDisplay ?? 'Not set'} />
              <Detail label="Updated" value={authorization.updatedAtDisplay ?? 'Not set'} />
              {authorization.sentAtDisplay && (
                <Detail label="Sent" value={authorization.sentAtDisplay} />
              )}
              {authorization.completedAtDisplay && (
                <Detail label="Completed" value={authorization.completedAtDisplay} />
              )}
              <Detail
                label="Created by"
                value={
                  authorization.createdByUser.name ? (
                    <>
                      {authorization.createdByUser.name} (
                      <EmailAddressText email={authorization.createdByUser.email} />)
                    </>
                  ) : (
                    <EmailAddressText email={authorization.createdByUser.email} />
                  )
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
                    {signer.email && (
                      <>
                        {' - '}
                        <EmailAddressText email={String(signer.email)} />
                      </>
                    )}
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

          {authorization.artifactLinks.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">
                <Trans>Final artifacts</Trans>
              </h2>
              <div className="mt-4 space-y-2">
                {authorization.artifactLinks.map((artifact) => (
                  <Button
                    key={artifact.key}
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <a href={artifact.href}>
                      <ArtifactIcon type={artifact.type} />
                      {artifact.label}
                    </a>
                  </Button>
                ))}
              </div>
            </Card>
          )}

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

const Detail = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words font-medium">{value}</dd>
  </div>
);

const ArtifactIcon = ({ type }: { type: 'audit_log_pdf' | 'certificate_pdf' | 'signed_pdf' }) => {
  if (type === 'audit_log_pdf') {
    return <ScrollTextIcon className="mr-2 h-4 w-4" />;
  }

  if (type === 'certificate_pdf') {
    return <FileCheck2Icon className="mr-2 h-4 w-4" />;
  }

  return <DownloadIcon className="mr-2 h-4 w-4" />;
};
