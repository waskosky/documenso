import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/get-executive-authorization';
import type { AuthorizationSigner } from '@documenso/lib/server-only/executive-authorizations/types';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { formatAuthorizationsPath, formatDocumentsPath } from '@documenso/lib/utils/teams';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card } from '@documenso/ui/primitives/card';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react';
import { Link } from 'react-router';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.$id';

export function meta() {
  return appMetaTags(msg`Authorization`);
}

const normalizeSigners = (value: unknown): AuthorizationSigner[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((signer, index) => {
      if (!signer || typeof signer !== 'object') {
        return null;
      }

      const data = signer as Record<string, unknown>;

      return {
        email: typeof data.email === 'string' ? data.email : '',
        name: typeof data.name === 'string' ? data.name : 'Unnamed signer',
        role: typeof data.role === 'string' ? data.role : 'Signer',
        signingOrder: typeof data.signingOrder === 'number' ? data.signingOrder : index + 1,
      };
    })
    .filter((signer): signer is AuthorizationSigner => Boolean(signer));
};

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
      createdAt: authorization.createdAt.toISOString(),
      createdByUser: authorization.createdByUser,
      envelope: authorization.envelope,
      id: authorization.id,
      notes: authorization.notes,
      renderedMarkdown: authorization.renderedMarkdown,
      signers: normalizeSigners(authorization.signers),
      status: authorization.status,
      templateKey: authorization.templateKey,
      templateVersion: authorization.templateVersion,
      title: authorization.title,
      type: authorization.type,
      updatedAt: authorization.updatedAt.toISOString(),
    },
    authorizationsPath: formatAuthorizationsPath(team.url),
    documentsPath: formatDocumentsPath(team.url),
  };
}

export default function AuthorizationDetailPage({ loaderData }: Route.ComponentProps) {
  const { authorization, authorizationsPath, documentsPath } = loaderData;
  const signers = authorization.signers;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
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
          <h1 className="max-w-3xl font-semibold text-3xl">{authorization.title}</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {authorization.companyLegalName}
            {authorization.actionDate ? ` - ${new Date(authorization.actionDate).toLocaleDateString()}` : ''}
          </p>
        </div>

        {authorization.envelope && (
          <Button asChild variant="outline">
            <Link to={`${documentsPath}/${authorization.envelope.id}`}>
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              <Trans>View document</Trans>
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6">
          <h2 className="font-semibold text-lg">
            <Trans>Rendered certificate</Trans>
          </h2>
          <pre className="mt-5 whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-foreground text-sm leading-6">
            {authorization.renderedMarkdown}
          </pre>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold text-lg">
              <Trans>Record details</Trans>
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail label="Template" value={authorization.templateKey} />
              <Detail label="Template version" value={String(authorization.templateVersion)} />
              <Detail label="Created" value={new Date(authorization.createdAt).toLocaleString()} />
              <Detail label="Updated" value={new Date(authorization.updatedAt).toLocaleString()} />
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
            <h2 className="font-semibold text-lg">
              <Trans>Signers</Trans>
            </h2>
            <div className="mt-4 space-y-3">
              {signers.map((signer, index) => (
                <div key={index} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{String(signer.name ?? 'Unnamed signer')}</div>
                  <div className="mt-1 text-muted-foreground">
                    {String(signer.role ?? 'Signer')}
                    {signer.email ? ` - ${String(signer.email)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {authorization.notes && (
            <Card className="p-6">
              <h2 className="font-semibold text-lg">
                <Trans>Internal notes</Trans>
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground text-sm">{authorization.notes}</p>
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
