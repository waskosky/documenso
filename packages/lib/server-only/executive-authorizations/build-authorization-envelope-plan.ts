import { FieldType, RecipientRole } from '@prisma/client';

import type { AuthorizationSigner, AuthorizationTemplateKey } from './types';

type BuildAuthorizationEnvelopePlanOptions = {
  authorizationId: string;
  renderedMarkdown: string;
  signaturePageNumber: number;
  signers: AuthorizationSigner[];
  templateKey: AuthorizationTemplateKey;
  title: string;
};

type AuthorizationEnvelopeFieldPlan = {
  height: number;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
} & (
  | {
      fieldMeta: { overflow: 'auto'; type: 'signature' };
      type: 'SIGNATURE';
    }
  | {
      fieldMeta: { overflow: 'auto'; type: 'date' };
      type: 'DATE';
    }
);

type AuthorizationEnvelopeRecipientPlan = {
  email: string;
  fields: AuthorizationEnvelopeFieldPlan[];
  name: string;
  role: RecipientRole;
  signingOrder: number;
};

export type AuthorizationEnvelopePlan = {
  emailMessage: string;
  emailSubject: string;
  externalId: string;
  fileName: string;
  recipients: AuthorizationEnvelopeRecipientPlan[];
  renderedMarkdown: string;
  title: string;
};

const MAX_FILE_NAME_LENGTH = 90;

const slugifyFileName = (title: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_FILE_NAME_LENGTH)
    .replace(/-+$/g, '');

  return `${slug || 'authorization'}.pdf`;
};

const signerFieldPlacement = (signerIndex: number, page: number): AuthorizationEnvelopeFieldPlan[] => {
  const rowTop = 28 + signerIndex * 18;

  return [
    {
      fieldMeta: {
        overflow: 'auto',
        type: 'signature',
      },
      height: 5.5,
      page,
      positionX: 30,
      positionY: rowTop,
      type: FieldType.SIGNATURE,
      width: 38,
    },
    {
      fieldMeta: {
        overflow: 'auto',
        type: 'date',
      },
      height: 4.5,
      page,
      positionX: 75,
      positionY: rowTop + 0.5,
      type: FieldType.DATE,
      width: 14,
    },
  ];
};

const AUTHORIZATION_FIELD_PLACEMENTS = {
  board_resolution_secretary_certificate: signerFieldPlacement,
} satisfies Record<AuthorizationTemplateKey, typeof signerFieldPlacement>;

export const buildAuthorizationEnvelopePlan = ({
  authorizationId,
  renderedMarkdown,
  signaturePageNumber,
  signers,
  templateKey,
  title,
}: BuildAuthorizationEnvelopePlanOptions): AuthorizationEnvelopePlan => {
  const fieldPlacement = AUTHORIZATION_FIELD_PLACEMENTS[templateKey];
  const recipients = signers
    .map((signer, index) => ({
      ...signer,
      email: signer.email.trim().toLowerCase(),
      name: signer.name.trim(),
      signingOrder: signer.signingOrder || index + 1,
    }))
    .sort((a, b) => a.signingOrder - b.signingOrder);

  const missingEmailSigner = recipients.find((signer) => signer.email.length === 0);

  if (missingEmailSigner) {
    throw new Error(`Signer "${missingEmailSigner.name || 'Unnamed signer'}" is missing an email address.`);
  }

  return {
    emailMessage:
      'Please review and sign this Board authorization. The signed document and audit trail will remain available in Documenso.',
    emailSubject: `Signature requested: ${title}`,
    externalId: `executive_authorization:${authorizationId}`,
    fileName: slugifyFileName(title),
    recipients: recipients.map((signer, index) => ({
      email: signer.email,
      fields: fieldPlacement(index, signaturePageNumber),
      name: signer.name,
      role: RecipientRole.SIGNER,
      signingOrder: signer.signingOrder,
    })),
    renderedMarkdown,
    title,
  };
};
