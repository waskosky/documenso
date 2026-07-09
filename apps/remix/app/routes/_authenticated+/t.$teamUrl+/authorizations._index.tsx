import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { listExecutiveAuthorizations } from '@documenso/lib/server-only/executive-authorizations/list-executive-authorizations';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { formatAuthorizationsPath } from '@documenso/lib/utils/teams';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card } from '@documenso/ui/primitives/card';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations._index';

export function meta() {
  return appMetaTags(msg`Authorizations`);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });
  const authorizations = await listExecutiveAuthorizations({
    teamId: team.id,
  });

  return {
    authorizations: authorizations.map((authorization) => ({
      actionDate: authorization.actionDate?.toISOString() ?? null,
      companyLegalName: authorization.companyLegalName,
      createdAt: authorization.createdAt.toISOString(),
      envelopeId: authorization.envelopeId,
      id: authorization.id,
      status: authorization.status,
      title: authorization.title,
      type: authorization.type,
    })),
    authorizationsPath: formatAuthorizationsPath(team.url),
  };
}

export default function AuthorizationsPage({ loaderData }: Route.ComponentProps) {
  const { authorizations, authorizationsPath } = loaderData;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-3xl">
            <Trans>Authorizations</Trans>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
            <Trans>
              Prepare board approvals, permission records, and executive decisions for signature while keeping the
              source details editable and easy to audit.
            </Trans>
          </p>
        </div>

        <Button asChild>
          <Link to={`${authorizationsPath}/new`}>
            <PlusIcon className="mr-2 h-4 w-4" />
            <Trans>New authorization</Trans>
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        {authorizations.length === 0 ? (
          <Card className="p-8">
            <h2 className="font-medium text-lg">
              <Trans>No authorizations yet</Trans>
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
              <Trans>
                Create the first authorization record to generate a board certificate, track signers, and preserve the
                decision context for future agents.
              </Trans>
            </p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    <Trans>Decision</Trans>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <Trans>Company</Trans>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <Trans>Status</Trans>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <Trans>Action date</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {authorizations.map((authorization) => (
                  <tr key={authorization.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link
                        to={`${authorizationsPath}/${authorization.id}`}
                        className="font-medium text-documenso-700 hover:opacity-80"
                      >
                        {authorization.title}
                      </Link>
                      <div className="mt-1 text-muted-foreground text-xs">{authorization.type}</div>
                    </td>
                    <td className="px-4 py-3">{authorization.companyLegalName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{authorization.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {authorization.actionDate ? new Date(authorization.actionDate).toLocaleDateString() : 'Not set'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
