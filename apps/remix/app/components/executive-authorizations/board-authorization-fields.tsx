import type {
  AuthorizationTemplateSignerRole,
  BoardDirectorV2,
  BoardDirectorVoteV1,
} from '@documenso/lib/server-only/executive-authorizations/types';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Textarea } from '@documenso/ui/primitives/textarea';

import {
  buildAuthorizationSignerSlots,
  getAuthorizationSignerFieldName,
} from '~/utils/executive-authorizations';

type DirectorDefaults = Partial<BoardDirectorV2 | BoardDirectorVoteV1>;

type SelectOption = {
  label: string;
  value: string;
};

const V1_PRESENCE_OPTIONS: SelectOption[] = [
  { label: 'Consented', value: 'Consented' },
  { label: 'Present', value: 'Present' },
  { label: 'Absent', value: 'Absent' },
];

const V1_VOTE_OPTIONS: SelectOption[] = [
  { label: 'For', value: 'For' },
  { label: 'Against', value: 'Against' },
  { label: 'Abstain', value: 'Abstain' },
  { label: 'Recused', value: 'Recused' },
];

const V2_PRESENCE_OPTIONS: SelectOption[] = [
  { label: 'Present', value: 'PRESENT' },
  { label: 'Consented', value: 'CONSENTED' },
  { label: 'Absent', value: 'ABSENT' },
];

const V2_VOTE_OPTIONS: SelectOption[] = [
  { label: 'For', value: 'FOR' },
  { label: 'Against', value: 'AGAINST' },
  { label: 'Abstain', value: 'ABSTAIN' },
  { label: 'Not voting', value: 'NOT_VOTING' },
  { label: 'Recused', value: 'RECUSED' },
];

const includeCurrentOption = (options: SelectOption[], currentValue?: string) => {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }

  return [{ label: currentValue, value: currentValue }, ...options];
};

export const BoardRosterFields = ({
  directors = [],
  signerRoles,
  templateVersion,
}: {
  directors?: DirectorDefaults[];
  signerRoles: readonly AuthorizationTemplateSignerRole[];
  templateVersion: 1 | 2;
}) => {
  const signerSlots = buildAuthorizationSignerSlots(signerRoles);

  return (
    <div className="grid gap-4">
      {signerSlots.map((slot) => {
        const director = slot.roleKey === 'director' ? directors[slot.roleIndex] : undefined;
        const defaultPresence =
          director?.presence ?? (templateVersion === 1 ? 'Consented' : 'CONSENTED');
        const defaultVote = director?.vote ?? (templateVersion === 1 ? 'For' : 'FOR');

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
            <SelectField
              label="Present / consenting"
              name={getAuthorizationSignerFieldName(slot, 'presence')}
              required={slot.required}
              defaultValue={defaultPresence}
              options={includeCurrentOption(
                templateVersion === 1 ? V1_PRESENCE_OPTIONS : V2_PRESENCE_OPTIONS,
                defaultPresence,
              )}
            />
            <SelectField
              label={templateVersion === 1 ? 'Vote' : 'Default vote'}
              name={getAuthorizationSignerFieldName(slot, 'vote')}
              required={slot.required}
              defaultValue={defaultVote}
              options={includeCurrentOption(
                templateVersion === 1 ? V1_VOTE_OPTIONS : V2_VOTE_OPTIONS,
                defaultVote,
              )}
            />
          </div>
        );
      })}
    </div>
  );
};

export const BoardExecutionRoleFields = ({
  authorizedOfficerDirectorIndex,
  secretaryDirectorIndex,
  signerRoles,
}: {
  authorizedOfficerDirectorIndex?: number;
  secretaryDirectorIndex?: number;
  signerRoles: readonly AuthorizationTemplateSignerRole[];
}) => {
  const directorOptions = buildAuthorizationSignerSlots(signerRoles)
    .filter((slot) => slot.roleKey === 'director')
    .map((slot) => ({
      label: `${slot.roleLabel} ${slot.roleIndex + 1}`,
      value: String(slot.roleIndex),
    }));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <SelectField
        defaultValue={secretaryDirectorIndex}
        label="Secretary signer"
        name="secretaryDirectorIndex"
        options={directorOptions}
        placeholder="Select a director"
        required
      />
      <SelectField
        defaultValue={authorizedOfficerDirectorIndex}
        label="Authorized officer signer"
        name="authorizedOfficerDirectorIndex"
        options={directorOptions}
        placeholder="Select a director"
        required
      />
    </div>
  );
};

export const Field = ({
  defaultValue,
  label,
  name,
  required,
  type = 'text',
}: {
  defaultValue?: number | string;
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

export const DatalistField = ({
  defaultValue,
  label,
  name,
  options,
  required,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: readonly string[];
  required?: boolean;
}) => {
  const listId = `${name}-options`;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input defaultValue={defaultValue} id={name} list={listId} name={name} required={required} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
};

export const SelectField = ({
  defaultValue,
  label,
  name,
  options,
  placeholder,
  required,
}: {
  defaultValue?: number | string;
  label: string;
  name: string;
  options: readonly SelectOption[];
  placeholder?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <select
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      defaultValue={defaultValue === undefined ? '' : String(defaultValue)}
      id={name}
      name={name}
      required={required}
    >
      {placeholder && (
        <option disabled value="">
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export const TextField = ({
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
