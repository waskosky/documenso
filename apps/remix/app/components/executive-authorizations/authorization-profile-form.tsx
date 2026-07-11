import type { BoardResolutionCertificateProfilePayload } from '@documenso/lib/server-only/executive-authorizations/profile-payload';
import type { AuthorizationTemplateSignerRole } from '@documenso/lib/server-only/executive-authorizations/types';
import { Card } from '@documenso/ui/primitives/card';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';

import { buildAuthorizationSignerSlots, getAuthorizationSignerFieldName } from '~/utils/executive-authorizations';

export const AuthorizationProfileForm = ({
  defaultValues = {},
  signerRoles,
}: {
  defaultValues?: Partial<BoardResolutionCertificateProfilePayload>;
  signerRoles: readonly AuthorizationTemplateSignerRole[];
}) => {
  const directors = defaultValues.directors ?? [];
  const signerSlots = buildAuthorizationSignerSlots(signerRoles);

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-lg">Organization defaults</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Field
          label="Company legal name"
          name="companyLegalName"
          required
          defaultValue={defaultValues.companyLegalName}
        />
        <Field
          label="Jurisdiction"
          name="jurisdiction"
          required
          defaultValue={defaultValues.jurisdiction ?? 'Colorado'}
        />
        <Field
          label="Entity type"
          name="entityType"
          required
          defaultValue={defaultValues.entityType ?? 'corporation'}
        />
        <Field
          label="Consent method"
          name="consentMethod"
          required
          defaultValue={defaultValues.consentMethod ?? 'unanimous written consent'}
        />
        <Field label="Secretary name" name="secretaryName" required defaultValue={defaultValues.secretaryName} />
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
          required
          defaultValue={defaultValues.resolutionDisposition ?? 'approved unanimously'}
        />
      </div>

      <div className="mt-8 border-t pt-6">
        <h2 className="font-semibold text-lg">Board roster</h2>
        <div className="mt-5 grid gap-4">
          {signerSlots.map((slot) => {
            const director = slot.roleKey === 'director' ? directors[slot.roleIndex] : undefined;

            return (
              <div
                key={`${slot.roleKey}-${slot.roleIndex}`}
                className="grid gap-3 rounded-md border p-4 md:grid-cols-4"
              >
                <Field
                  label={`${slot.roleLabel} ${slot.roleIndex + 1} name`}
                  name={getAuthorizationSignerFieldName(slot, 'name')}
                  required={slot.required}
                  defaultValue={director?.name}
                />
                <Field
                  label="Email"
                  name={getAuthorizationSignerFieldName(slot, 'email')}
                  required={slot.required}
                  type="email"
                  defaultValue={director?.email}
                />
                <Field
                  label="Present / consenting"
                  name={getAuthorizationSignerFieldName(slot, 'presence')}
                  required={slot.required}
                  defaultValue={director?.presence ?? 'Consented'}
                />
                <Field
                  label="Default vote"
                  name={getAuthorizationSignerFieldName(slot, 'vote')}
                  required={slot.required}
                  defaultValue={director?.vote ?? 'For'}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
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
