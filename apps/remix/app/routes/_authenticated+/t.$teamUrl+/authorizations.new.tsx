import { Trans } from '@lingui/react/macro';
import { ArrowLeftIcon } from 'lucide-react';
import { Form, Link, redirect, useActionData } from 'react-router';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { createExecutiveAuthorization } from '@documenso/lib/server-only/executive-authorizations/create-executive-authorization';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { formatAuthorizationsPath } from '@documenso/lib/utils/teams';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Card } from '@documenso/ui/primitives/card';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Textarea } from '@documenso/ui/primitives/textarea';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/authorizations.new';

export function meta() {
  return appMetaTags('New Authorization');
}

const signerSlots = [0, 1, 2];

const getString = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

const getList = (formData: FormData, key: string) =>
  getString(formData, key)
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

export async function action({ params, request }: Route.ActionArgs) {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({
    teamUrl: params.teamUrl,
    userId: user.id,
  });
  const formData = await request.formData();

  const directors = signerSlots
    .map((index) => ({
      email: getString(formData, `directorEmail-${index}`),
      name: getString(formData, `directorName-${index}`),
      presence: getString(formData, `directorPresence-${index}`) || 'Consented',
      vote: getString(formData, `directorVote-${index}`) || 'For',
    }))
    .filter((director) => director.name || director.email);

  try {
    const authorization = await createExecutiveAuthorization({
      notes: getString(formData, 'notes'),
      payload: {
        actionDate: getString(formData, 'actionDate'),
        actionTitle: getString(formData, 'actionTitle'),
        authorizedOfficerName: getString(formData, 'authorizedOfficerName'),
        authorizedOfficerTitle: getString(formData, 'authorizedOfficerTitle'),
        companyLegalName: getString(formData, 'companyLegalName'),
        consentMethod: getString(formData, 'consentMethod'),
        directors,
        entityType: getString(formData, 'entityType'),
        investorCondition: getString(formData, 'investorCondition'),
        jurisdiction: getString(formData, 'jurisdiction'),
        matterDescription: getString(formData, 'matterDescription'),
        materialsReviewed: getList(formData, 'materialsReviewed'),
        resolutionDisposition: getString(formData, 'resolutionDisposition'),
        resolutionTerms: getString(formData, 'resolutionTerms'),
        secretaryName: getString(formData, 'secretaryName'),
      },
      teamId: team.id,
      templateKey: 'board_resolution_secretary_certificate',
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
        <Card className="p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Company legal name" name="companyLegalName" required />
            <Field label="Action title" name="actionTitle" required />
            <Field label="Action date" name="actionDate" required type="date" />
            <Field label="Jurisdiction" name="jurisdiction" defaultValue="Colorado" required />
            <Field label="Entity type" name="entityType" defaultValue="corporation" required />
            <Field
              label="Consent method"
              name="consentMethod"
              defaultValue="unanimous written consent"
              required
            />
            <Field label="Secretary name" name="secretaryName" required />
            <Field label="Authorized officer name" name="authorizedOfficerName" required />
            <Field label="Authorized officer title" name="authorizedOfficerTitle" required />
            <Field
              label="Resolution disposition"
              name="resolutionDisposition"
              defaultValue="approved unanimously"
              required
            />
          </div>

          <div className="mt-5 grid gap-5">
            <TextField label="Matter description" name="matterDescription" required />
            <TextField label="Resolution terms" name="resolutionTerms" required />
            <TextField label="Investor or closing condition" name="investorCondition" required />
            <TextField
              label="Materials reviewed"
              name="materialsReviewed"
              placeholder="One item per line"
            />
            <TextField label="Internal notes" name="notes" />
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold">
            <Trans>Board signers</Trans>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans>These signers become the initial signature roster for this authorization.</Trans>
          </p>

          <div className="mt-5 grid gap-4">
            {signerSlots.map((index) => (
              <div key={index} className="grid gap-3 rounded-md border p-4 md:grid-cols-4">
                <Field label={`Director ${index + 1} name`} name={`directorName-${index}`} />
                <Field label="Email" name={`directorEmail-${index}`} type="email" />
                <Field
                  label="Present / consenting"
                  name={`directorPresence-${index}`}
                  defaultValue="Consented"
                />
                <Field label="Vote" name={`directorVote-${index}`} defaultValue="For" />
              </div>
            ))}
          </div>
        </Card>

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

const Field = ({
  defaultValue,
  label,
  name,
  required,
  type = 'text',
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Input defaultValue={defaultValue} id={name} name={name} required={required} type={type} />
  </div>
);

const TextField = ({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Textarea id={name} name={name} placeholder={placeholder} required={required} />
  </div>
);
