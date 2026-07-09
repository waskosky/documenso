import { formatSigningLink } from '@documenso/lib/utils/recipients';
import {
  DocumentStatus,
  ExecutiveAuthorizationStatus,
  RecipientRole,
  type SendStatus,
  type SigningStatus,
} from '@prisma/client';

import type { AuthorizationSigner } from './types';

export type AuthorizationStatusRecipient = {
  email: string;
  id: number;
  name: string;
  role: RecipientRole;
  sendStatus: SendStatus;
  signedAt: Date | null;
  signingOrder: number | null;
  signingStatus: SigningStatus;
  token: string;
};

type BuildAuthorizationStatusUpdateOptions = {
  completedAt: Date | null;
  envelopeStatus: DocumentStatus;
  existingSigners?: AuthorizationSigner[];
  recipients: AuthorizationStatusRecipient[];
};

const mapEnvelopeStatus = ({
  completedAt,
  envelopeStatus,
  recipients,
}: BuildAuthorizationStatusUpdateOptions): ExecutiveAuthorizationStatus => {
  const signerRecipients = recipients.filter((recipient) => recipient.role === RecipientRole.SIGNER);

  if ((envelopeStatus as string) === 'CANCELLED') {
    return ExecutiveAuthorizationStatus.CANCELLED;
  }

  if (
    envelopeStatus === DocumentStatus.REJECTED ||
    signerRecipients.some((recipient) => recipient.signingStatus === 'REJECTED')
  ) {
    return ExecutiveAuthorizationStatus.REJECTED;
  }

  if (
    envelopeStatus === DocumentStatus.COMPLETED ||
    completedAt ||
    (signerRecipients.length > 0 && signerRecipients.every((recipient) => recipient.signingStatus === 'SIGNED'))
  ) {
    return ExecutiveAuthorizationStatus.COMPLETED;
  }

  if (signerRecipients.some((recipient) => recipient.signingStatus === 'SIGNED')) {
    return ExecutiveAuthorizationStatus.PARTIALLY_SIGNED;
  }

  if (envelopeStatus === DocumentStatus.PENDING) {
    return ExecutiveAuthorizationStatus.SENT;
  }

  return ExecutiveAuthorizationStatus.READY;
};

export const buildAuthorizationStatusUpdate = ({
  completedAt,
  envelopeStatus,
  existingSigners = [],
  recipients,
}: BuildAuthorizationStatusUpdateOptions) => {
  const existingSignersByEmail = new Map(
    existingSigners.map((signer) => [signer.email.trim().toLowerCase(), signer] as const),
  );

  return {
    completedAt: completedAt ?? undefined,
    signers: recipients
      .filter((recipient) => recipient.role === RecipientRole.SIGNER)
      .sort((a, b) => {
        const orderA = a.signingOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.signingOrder ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.id - b.id;
      })
      .map((recipient, index) => {
        const existingSigner = existingSignersByEmail.get(recipient.email.trim().toLowerCase());

        return {
          email: recipient.email,
          name: recipient.name,
          recipientId: recipient.id,
          role: existingSigner?.role ?? recipient.role,
          sendStatus: recipient.sendStatus,
          signedAt: recipient.signedAt?.toISOString() ?? null,
          signingOrder: recipient.signingOrder ?? index + 1,
          signingUrl: formatSigningLink(recipient.token),
          status: recipient.signingStatus,
        };
      }),
    status: mapEnvelopeStatus({
      completedAt,
      envelopeStatus,
      recipients,
    }),
  };
};
