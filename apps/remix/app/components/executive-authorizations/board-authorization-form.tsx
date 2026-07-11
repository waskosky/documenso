import type {
  AuthorizationTemplateSignerRole,
  BoardResolutionCertificatePayload,
  BoardResolutionCertificatePayloadV1,
} from '@documenso/lib/server-only/executive-authorizations/types';
import { Card } from '@documenso/ui/primitives/card';
import { Label } from '@documenso/ui/primitives/label';

import {
  BoardExecutionRoleFields,
  BoardRosterFields,
  DatalistField,
  Field,
  SelectField,
  TextField,
} from './board-authorization-fields';

type BoardAuthorizationFormDefaults =
  | (Partial<BoardResolutionCertificatePayload> & { notes?: null | string })
  | (Partial<BoardResolutionCertificatePayloadV1> & { notes?: null | string });

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

const ENTITY_TYPE_OPTIONS = [
  'corporation',
  'limited liability company',
  'nonprofit corporation',
  'partnership',
];
const BOARD_COUNT_OPTIONS = [
  { label: '1 of 3', value: '1' },
  { label: '2 of 3', value: '2' },
  { label: '3 of 3', value: '3' },
];

export const BoardAuthorizationForm = ({
  defaultValues = {},
  signerRoles,
  templateVersion,
}: {
  defaultValues?: BoardAuthorizationFormDefaults;
  signerRoles: readonly AuthorizationTemplateSignerRole[];
  templateVersion: 1 | 2;
}) => {
  if (templateVersion === 1) {
    return (
      <LegacyBoardAuthorizationForm
        defaultValues={
          defaultValues as Partial<BoardResolutionCertificatePayloadV1> & { notes?: null | string }
        }
        signerRoles={signerRoles}
      />
    );
  }

  return (
    <CurrentBoardAuthorizationForm
      defaultValues={
        defaultValues as Partial<BoardResolutionCertificatePayload> & { notes?: null | string }
      }
      signerRoles={signerRoles}
    />
  );
};

const CurrentBoardAuthorizationForm = ({
  defaultValues,
  signerRoles,
}: {
  defaultValues: Partial<BoardResolutionCertificatePayload> & { notes?: null | string };
  signerRoles: readonly AuthorizationTemplateSignerRole[];
}) => (
  <>
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Decision and organization</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Field
          label="Action title"
          name="actionTitle"
          required
          defaultValue={defaultValues.actionTitle}
        />
        <Field
          label="Company legal name"
          name="companyLegalName"
          required
          defaultValue={defaultValues.companyLegalName}
        />
        <Field
          label="Action date"
          name="actionDate"
          required
          type="date"
          defaultValue={defaultValues.actionDate}
        />
        <Field
          label="Certificate date"
          name="certificateDate"
          required
          type="date"
          defaultValue={defaultValues.certificateDate}
        />
        <SelectField
          label="Action method"
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
          label="Resolution disposition"
          name="resolutionDisposition"
          required
          defaultValue={defaultValues.resolutionDisposition ?? 'APPROVED_UNANIMOUSLY'}
          options={RESOLUTION_DISPOSITION_OPTIONS}
        />
        <Field
          label="Jurisdiction"
          name="jurisdiction"
          defaultValue={defaultValues.jurisdiction ?? 'Colorado'}
          required
        />
        <DatalistField
          label="Entity type"
          name="entityType"
          defaultValue={defaultValues.entityType ?? 'corporation'}
          options={ENTITY_TYPE_OPTIONS}
          required
        />
        <Field
          label="Governing body name"
          name="governingBodyName"
          defaultValue={defaultValues.governingBodyName ?? 'Board of Directors'}
          required
        />
        <Field
          label="Governing member (singular)"
          name="governingMemberSingular"
          defaultValue={defaultValues.governingMemberSingular ?? 'director'}
          required
        />
        <Field
          label="Governing members (plural)"
          name="governingMemberPlural"
          defaultValue={defaultValues.governingMemberPlural ?? 'directors'}
          required
        />
        <Field
          label="Equity holders (plural)"
          name="equityHolderPlural"
          defaultValue={defaultValues.equityHolderPlural ?? 'stockholders'}
          required
        />
      </div>
    </Card>

    <Card className="mt-6 p-6">
      <h2 className="text-lg font-semibold">Decision record</h2>
      <div className="mt-5 grid gap-5">
        <TextField
          label="Matter description"
          name="matterDescription"
          required
          defaultValue={defaultValues.matterDescription}
        />
        <TextField
          label="Specific action"
          name="specificAction"
          required
          defaultValue={defaultValues.specificAction}
        />
        <TextField
          label="Specific terms (optional)"
          name="specificTerms"
          defaultValue={defaultValues.specificTerms}
        />
        <TextField
          label="Materials reviewed"
          name="materialsReviewed"
          placeholder="One item per line"
          defaultValue={defaultValues.materialsReviewed?.join('\n')}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Delivery recipient (optional)"
            name="deliveryRecipient"
            defaultValue={defaultValues.deliveryRecipient}
          />
          <TextField
            label="Delivery condition (optional)"
            name="deliveryCondition"
            defaultValue={defaultValues.deliveryCondition}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            className="h-4 w-4 rounded-sm border border-input accent-primary"
            defaultChecked={defaultValues.ratifyPriorActions ?? false}
            id="ratifyPriorActions"
            name="ratifyPriorActions"
            type="checkbox"
            value="true"
          />
          <Label htmlFor="ratifyPriorActions">Ratify prior related actions</Label>
        </div>
        <TextField
          label="Internal notes"
          name="notes"
          defaultValue={defaultValues.notes ?? undefined}
        />
      </div>
    </Card>

    <Card className="mt-6 p-6">
      <h2 className="text-lg font-semibold">Board signers</h2>
      <div className="mt-5">
        <BoardRosterFields
          directors={defaultValues.directors}
          signerRoles={signerRoles}
          templateVersion={2}
        />
      </div>
    </Card>

    <Card className="mt-6 p-6">
      <h2 className="text-lg font-semibold">Certificate and execution roles</h2>
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

const LegacyBoardAuthorizationForm = ({
  defaultValues,
  signerRoles,
}: {
  defaultValues: Partial<BoardResolutionCertificatePayloadV1> & { notes?: null | string };
  signerRoles: readonly AuthorizationTemplateSignerRole[];
}) => (
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
      <h2 className="text-lg font-semibold">Board signers</h2>
      <div className="mt-5">
        <BoardRosterFields
          directors={defaultValues.directors}
          signerRoles={signerRoles}
          templateVersion={1}
        />
      </div>
    </Card>
  </>
);
