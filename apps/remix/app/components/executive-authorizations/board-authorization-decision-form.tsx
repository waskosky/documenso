import type { BoardResolutionCertificatePayload } from '@documenso/lib/server-only/executive-authorizations/types';
import { Label } from '@documenso/ui/primitives/label';

import { Field, TextField } from './board-authorization-fields';

type BoardAuthorizationDecisionDefaults = Partial<
  Pick<
    BoardResolutionCertificatePayload,
    | 'actionDate'
    | 'actionTitle'
    | 'certificateDate'
    | 'deliveryCondition'
    | 'deliveryRecipient'
    | 'materialsReviewed'
    | 'matterDescription'
    | 'ratifyPriorActions'
    | 'specificAction'
    | 'specificTerms'
  >
> & {
  notes?: null | string;
};

export const BoardAuthorizationDecisionForm = ({
  defaultValues = {},
  externalId,
  resolutionDisposition,
}: {
  defaultValues?: BoardAuthorizationDecisionDefaults;
  externalId: string;
  resolutionDisposition: BoardResolutionCertificatePayload['resolutionDisposition'];
}) => {
  const isNotApproved = resolutionDisposition === 'NOT_APPROVED';

  return (
    <>
      <input name="externalId" type="hidden" value={externalId} />

      <section aria-labelledby="decision-record-heading" className="border-t pt-6">
        <h2 className="font-semibold text-lg" id="decision-record-heading">
          Decision record
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field defaultValue={defaultValues.actionDate} label="Action date" name="actionDate" required type="date" />
          <Field
            defaultValue={defaultValues.certificateDate}
            label="Certificate date"
            name="certificateDate"
            required
            type="date"
          />
          <div className="md:col-span-2">
            <Field defaultValue={defaultValues.actionTitle} label="Action title" name="actionTitle" required />
          </div>
          <div className="md:col-span-2">
            <TextField
              defaultValue={defaultValues.matterDescription}
              label="Matter description"
              name="matterDescription"
              required
            />
          </div>
          <div className="md:col-span-2">
            <TextField
              defaultValue={defaultValues.materialsReviewed?.join('\n')}
              label="Materials reviewed (one per line)"
              name="materialsReviewed"
              required
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="decision-terms-heading" className="mt-8 border-t pt-6">
        <h2 className="font-semibold text-lg" id="decision-terms-heading">
          Authorization terms
        </h2>
        <div className="mt-5 grid gap-5">
          <TextField
            defaultValue={defaultValues.specificAction}
            label="Specific action"
            name="specificAction"
            required
          />
          <TextField
            defaultValue={defaultValues.specificTerms}
            label="Specific terms (optional)"
            name="specificTerms"
          />

          {!isNotApproved && (
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                defaultValue={defaultValues.deliveryRecipient}
                label="Delivery recipient (optional)"
                name="deliveryRecipient"
              />
              <TextField
                defaultValue={defaultValues.deliveryCondition}
                label="Delivery condition (optional)"
                name="deliveryCondition"
              />
            </div>
          )}

          {!isNotApproved && (
            <div className="flex min-h-10 items-center gap-3">
              <input
                className="h-4 w-4 shrink-0 rounded-sm border border-input accent-primary"
                defaultChecked={defaultValues.ratifyPriorActions ?? false}
                id="ratifyPriorActions"
                name="ratifyPriorActions"
                type="checkbox"
                value="true"
              />
              <Label htmlFor="ratifyPriorActions">Ratify prior related actions</Label>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="internal-record-heading" className="mt-8 border-t pt-6">
        <h2 className="font-semibold text-lg" id="internal-record-heading">
          Internal record
        </h2>
        <div className="mt-5">
          <TextField defaultValue={defaultValues.notes ?? undefined} label="Internal notes (optional)" name="notes" />
        </div>
      </section>
    </>
  );
};
