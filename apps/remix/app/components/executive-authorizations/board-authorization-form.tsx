import { Trans } from '@lingui/react/macro';

import type { BoardResolutionCertificatePayload } from '@documenso/lib/server-only/executive-authorizations/types';
import { Card } from '@documenso/ui/primitives/card';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Textarea } from '@documenso/ui/primitives/textarea';

const signerSlots = [0, 1, 2];

type BoardAuthorizationFormDefaults = Partial<BoardResolutionCertificatePayload> & {
  notes?: string | null;
};

export const BoardAuthorizationForm = ({
  defaultValues = {},
}: {
  defaultValues?: BoardAuthorizationFormDefaults;
}) => {
  const directors = defaultValues.directors ?? [];

  return (
    <>
      <Card className="p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Company legal name"
            name="companyLegalName"
            required
            defaultValue={defaultValues.companyLegalName}
          />
          <Field
            label="Action title"
            name="actionTitle"
            required
            defaultValue={defaultValues.actionTitle}
          />
          <Field
            label="Action date"
            name="actionDate"
            required
            type="date"
            defaultValue={defaultValues.actionDate}
          />
          <Field
            label="Jurisdiction"
            name="jurisdiction"
            defaultValue={defaultValues.jurisdiction ?? 'Colorado'}
            required
          />
          <Field
            label="Entity type"
            name="entityType"
            defaultValue={defaultValues.entityType ?? 'corporation'}
            required
          />
          <Field
            label="Consent method"
            name="consentMethod"
            defaultValue={defaultValues.consentMethod ?? 'unanimous written consent'}
            required
          />
          <Field
            label="Secretary name"
            name="secretaryName"
            required
            defaultValue={defaultValues.secretaryName}
          />
          <Field
            label="Authorized officer name"
            name="authorizedOfficerName"
            required
            defaultValue={defaultValues.authorizedOfficerName}
          />
          <Field
            label="Authorized officer title"
            name="authorizedOfficerTitle"
            required
            defaultValue={defaultValues.authorizedOfficerTitle}
          />
          <Field
            label="Resolution disposition"
            name="resolutionDisposition"
            defaultValue={defaultValues.resolutionDisposition ?? 'approved unanimously'}
            required
          />
        </div>

        <div className="mt-5 grid gap-5">
          <TextField
            label="Matter description"
            name="matterDescription"
            required
            defaultValue={defaultValues.matterDescription}
          />
          <TextField
            label="Resolution terms"
            name="resolutionTerms"
            required
            defaultValue={defaultValues.resolutionTerms}
          />
          <TextField
            label="Investor or closing condition"
            name="investorCondition"
            required
            defaultValue={defaultValues.investorCondition}
          />
          <TextField
            label="Materials reviewed"
            name="materialsReviewed"
            placeholder="One item per line"
            defaultValue={defaultValues.materialsReviewed?.join('\n')}
          />
          <TextField
            label="Internal notes"
            name="notes"
            defaultValue={defaultValues.notes ?? undefined}
          />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">
          <Trans>Board signers</Trans>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans>These signers become the signature roster for this authorization.</Trans>
        </p>

        <div className="mt-5 grid gap-4">
          {signerSlots.map((index) => {
            const director = directors[index];

            return (
              <div key={index} className="grid gap-3 rounded-md border p-4 md:grid-cols-4">
                <Field
                  label={`Director ${index + 1} name`}
                  name={`directorName-${index}`}
                  defaultValue={director?.name}
                />
                <Field
                  label="Email"
                  name={`directorEmail-${index}`}
                  type="email"
                  defaultValue={director?.email}
                />
                <Field
                  label="Present / consenting"
                  name={`directorPresence-${index}`}
                  defaultValue={director?.presence ?? 'Consented'}
                />
                <Field
                  label="Vote"
                  name={`directorVote-${index}`}
                  defaultValue={director?.vote ?? 'For'}
                />
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
};

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
  defaultValue,
  label,
  name,
  placeholder,
  required,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Textarea
      defaultValue={defaultValue}
      id={name}
      name={name}
      placeholder={placeholder}
      required={required}
    />
  </div>
);
