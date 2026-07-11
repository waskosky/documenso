import {
  DocumentStatus,
  ExecutiveAuthorizationStatus,
  RecipientRole,
  type SendStatus,
  type SigningStatus,
} from '@prisma/client';

import { formatSigningLink } from '@documenso/lib/utils/recipients';

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

export type BuildAuthorizationStatusUpdateOptions = {
  completedAt: Date | null;
  envelopeStatus: DocumentStatus;
  existingSigners: AuthorizationSigner[];
  recipients: AuthorizationStatusRecipient[];
};

type AuthorizationEnvelopeStatusOptions = Pick<
  BuildAuthorizationStatusUpdateOptions,
  'completedAt' | 'envelopeStatus' | 'recipients'
>;

const normalizeSignerIdentity = (value: string) => value.trim().toLowerCase();

const sortRecipients = (recipients: AuthorizationStatusRecipient[]) =>
  [...recipients].sort((a, b) => {
    const orderA = a.signingOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.signingOrder ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.id - b.id;
  });

const sortSigners = (signers: AuthorizationSigner[]) =>
  [...signers].sort((a, b) => a.signingOrder - b.signingOrder);

const assertDurableSignerContract = ({
  existingSigners,
  recipients,
}: Pick<BuildAuthorizationStatusUpdateOptions, 'existingSigners' | 'recipients'>) => {
  const sortedRecipients = sortRecipients(recipients);
  const sortedSigners = sortSigners(existingSigners);

  if (sortedRecipients.length !== sortedSigners.length) {
    throw new Error(
      `Authorization recipient count must remain ${sortedSigners.length}; received ${sortedRecipients.length}.`,
    );
  }

  sortedSigners.forEach((signer, index) => {
    const recipient = sortedRecipients[index];
    const recipientNumber = index + 1;

    if (!recipient) {
      throw new Error(`Authorization recipient ${recipientNumber} is missing.`);
    }

    if (recipient.role !== RecipientRole.SIGNER) {
      throw new Error(`Authorization recipient ${recipientNumber} role must remain SIGNER.`);
    }

    if (normalizeSignerIdentity(recipient.name) !== normalizeSignerIdentity(signer.name)) {
      throw new Error(
        `Authorization recipient ${recipientNumber} name does not match the durable signer record.`,
      );
    }

    if (normalizeSignerIdentity(recipient.email) !== normalizeSignerIdentity(signer.email)) {
      throw new Error(
        `Authorization recipient ${recipientNumber} email does not match the durable signer record.`,
      );
    }

    if (recipient.signingOrder !== signer.signingOrder) {
      throw new Error(
        `Authorization recipient ${recipientNumber} signing order must remain ${signer.signingOrder}; received ${String(recipient.signingOrder)}.`,
      );
    }
  });

  return {
    recipients: sortedRecipients,
    signers: sortedSigners,
  };
};

const mapEnvelopeStatus = ({
  completedAt,
  envelopeStatus,
  recipients,
}: AuthorizationEnvelopeStatusOptions): ExecutiveAuthorizationStatus => {
  const signerRecipients = recipients.filter(
    (recipient) => recipient.role === RecipientRole.SIGNER,
  );

  if (String(envelopeStatus) === 'CANCELLED') {
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
    (signerRecipients.length > 0 &&
      signerRecipients.every((recipient) => recipient.signingStatus === 'SIGNED'))
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

const deriveCompletedAt = ({ completedAt, recipients }: AuthorizationEnvelopeStatusOptions) => {
  if (completedAt) {
    return completedAt;
  }

  const signerRecipients = recipients.filter(
    (recipient) => recipient.role === RecipientRole.SIGNER,
  );

  const signedTimestamps = signerRecipients
    .map((recipient) => recipient.signedAt)
    .filter((signedAt): signedAt is Date => signedAt instanceof Date);

  if (
    signerRecipients.length > 0 &&
    signedTimestamps.length === signerRecipients.length &&
    signerRecipients.every((recipient) => recipient.signingStatus === 'SIGNED')
  ) {
    return new Date(Math.max(...signedTimestamps.map((signedAt) => signedAt.getTime())));
  }

  return undefined;
};

export const buildAuthorizationStatusUpdate = ({
  completedAt,
  envelopeStatus,
  existingSigners,
  recipients,
}: BuildAuthorizationStatusUpdateOptions) => {
  const durableContract = assertDurableSignerContract({ existingSigners, recipients });

  const status = mapEnvelopeStatus({
    completedAt,
    envelopeStatus,
    recipients: durableContract.recipients,
  });

  return {
    completedAt:
      status === ExecutiveAuthorizationStatus.COMPLETED
        ? deriveCompletedAt({ completedAt, envelopeStatus, recipients: durableContract.recipients })
        : undefined,
    signers: durableContract.signers.map((signer, index) => {
      const recipient = durableContract.recipients[index];

      if (!recipient) {
        throw new Error(`Authorization recipient ${index + 1} is missing.`);
      }

      return {
        ...signer,
        recipientId: recipient.id,
        sendStatus: recipient.sendStatus,
        signedAt: recipient.signedAt?.toISOString() ?? null,
        signingUrl: formatSigningLink(recipient.token),
        status: recipient.signingStatus,
      };
    }),
    status,
  };
};
