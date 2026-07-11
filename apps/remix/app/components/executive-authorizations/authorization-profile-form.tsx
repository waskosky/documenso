import type { BoardResolutionCertificateProfilePayload } from '@documenso/lib/server-only/executive-authorizations/profile-payload';
import type { AuthorizationTemplateSignerRole } from '@documenso/lib/server-only/executive-authorizations/types';
import { Card } from '@documenso/ui/primitives/card';

import {
  BoardExecutionRoleFields,
  BoardRosterFields,
  DatalistField,
  Field,
  SelectField,
} from './board-authorization-fields';

const ACTION_METHOD_OPTIONS = [
  { label: 'Unanimous written consent', value: 'UNANIMOUS_WRITTEN_CONSENT' },
  { label: 'Written consent', value: 'WRITTEN_CONSENT' },
  { label: 'Board meeting', value: 'MEETING' },
];

const RESOLUTION_DISPOSITION_OPTIONS = [
  { label: 'Approved unanimously', value: 'APPROVED_UNANIMOUSLY' },
  { label: 'Approved by required vote', value: 'APPROVED_REQUIRED_VOTE' },
  { label: 'Not approved', value: 'NOT_APPROVED' },
];

const ENTITY_TYPE_OPTIONS = ['corporation', 'limited liability company', 'nonprofit corporation', 'partnership'];
const BOARD_COUNT_OPTIONS = [
  { label: '1 of 3', value: '1' },
  { label: '2 of 3', value: '2' },
  { label: '3 of 3', value: '3' },
];

export const AuthorizationProfileForm = ({
  defaultValues = {},
  signerRoles,
}: {
  defaultValues?: Partial<BoardResolutionCertificateProfilePayload>;
  signerRoles: readonly AuthorizationTemplateSignerRole[];
}) => (
  <>
    <Card className="p-6">
      <h2 className="font-semibold text-lg">Organization and governance defaults</h2>
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
        <DatalistField
          label="Entity type"
          name="entityType"
          required
          defaultValue={defaultValues.entityType ?? 'corporation'}
          options={ENTITY_TYPE_OPTIONS}
        />
        <Field
          label="Governing body name"
          name="governingBodyName"
          required
          defaultValue={defaultValues.governingBodyName ?? 'Board of Directors'}
        />
        <Field
          label="Governing member (singular)"
          name="governingMemberSingular"
          required
          defaultValue={defaultValues.governingMemberSingular ?? 'director'}
        />
        <Field
          label="Governing members (plural)"
          name="governingMemberPlural"
          required
          defaultValue={defaultValues.governingMemberPlural ?? 'directors'}
        />
        <Field
          label="Equity holders (plural)"
          name="equityHolderPlural"
          required
          defaultValue={defaultValues.equityHolderPlural ?? 'stockholders'}
        />
        <SelectField
          label="Default action method"
          name="actionMethod"
          required
          defaultValue={defaultValues.actionMethod ?? 'UNANIMOUS_WRITTEN_CONSENT'}
          options={ACTION_METHOD_OPTIONS}
        />
        <SelectField
          label="Directors required for quorum"
          name="quorumRequiredCount"
          required
          defaultValue={defaultValues.quorumRequiredCount}
          options={BOARD_COUNT_OPTIONS}
          placeholder="Select a threshold"
        />
        <SelectField
          label="FOR votes required for approval"
          name="approvalRequiredCount"
          required
          defaultValue={defaultValues.approvalRequiredCount}
          options={BOARD_COUNT_OPTIONS}
          placeholder="Select a threshold"
        />
        <SelectField
          label="Default resolution disposition"
          name="resolutionDisposition"
          required
          defaultValue={defaultValues.resolutionDisposition ?? 'APPROVED_UNANIMOUSLY'}
          options={RESOLUTION_DISPOSITION_OPTIONS}
        />
      </div>
    </Card>

    <Card className="mt-6 p-6">
      <h2 className="font-semibold text-lg">Board roster</h2>
      <div className="mt-5">
        <BoardRosterFields directors={defaultValues.directors} signerRoles={signerRoles} templateVersion={2} />
      </div>
    </Card>

    <Card className="mt-6 p-6">
      <h2 className="font-semibold text-lg">Certificate and execution roles</h2>
      <div className="mt-5 grid gap-5">
        <Field
          label="Authorized officer title"
          name="authorizedOfficerTitle"
          required
          defaultValue={defaultValues.authorizedOfficerTitle}
        />
      </div>
      <div className="mt-5">
        <BoardExecutionRoleFields
          authorizedOfficerDirectorIndex={defaultValues.authorizedOfficerDirectorIndex}
          secretaryDirectorIndex={defaultValues.secretaryDirectorIndex}
          signerRoles={signerRoles}
        />
      </div>
    </Card>
  </>
);
