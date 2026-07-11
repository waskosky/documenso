import { FieldType, RecipientRole } from '@prisma/client';

import { getAuthorizationTemplate } from './templates';
import type {
  AuthorizationSigner,
  AuthorizationTemplateFieldPlacement,
  AuthorizationTemplateKey,
  AuthorizationTemplatePlacementValue,
} from './types';

type BuildAuthorizationEnvelopePlanOptions = {
  authorizationId: string;
  renderedMarkdown: string;
  signaturePageNumber: number;
  signers: AuthorizationSigner[];
  templateKey: AuthorizationTemplateKey;
  templateVersion: number;
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

const resolvePlacementValue = (value: AuthorizationTemplatePlacementValue, signerIndex: number) => {
  if (typeof value === 'number') {
    return value;
  }

  return value.start + signerIndex * value.step;
};

const placementAppliesToSigner = (
  placement: AuthorizationTemplateFieldPlacement,
  signer: AuthorizationSigner,
) => {
  if (placement.appliesTo === 'all_signers') {
    return true;
  }

  return placement.appliesTo.signerRole.toLowerCase() === signer.role.toLowerCase();
};

const buildFieldFromPlacement = ({
  placement,
  signaturePageNumber,
  signerIndex,
}: {
  placement: AuthorizationTemplateFieldPlacement;
  signaturePageNumber: number;
  signerIndex: number;
}): AuthorizationEnvelopeFieldPlan => {
  const baseField = {
    height: placement.height,
    page: signaturePageNumber,
    positionX: resolvePlacementValue(placement.positionX, signerIndex),
    positionY: resolvePlacementValue(placement.positionY, signerIndex),
    width: placement.width,
  };

  if (placement.field === 'SIGNATURE') {
    return {
      ...baseField,
      fieldMeta: {
        overflow: 'auto',
        type: 'signature',
      },
      type: FieldType.SIGNATURE,
    };
  }

  return {
    ...baseField,
    fieldMeta: {
      overflow: 'auto',
      type: 'date',
    },
    type: FieldType.DATE,
  };
};

export const buildAuthorizationEnvelopePlan = ({
  authorizationId,
  renderedMarkdown,
  signaturePageNumber,
  signers,
  templateKey,
  templateVersion,
  title,
}: BuildAuthorizationEnvelopePlanOptions): AuthorizationEnvelopePlan => {
  const template = getAuthorizationTemplate(templateKey, templateVersion);
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
    throw new Error(
      `Signer "${missingEmailSigner.name || 'Unnamed signer'}" is missing an email address.`,
    );
  }

  return {
    emailMessage:
      'Please review and sign this Board authorization. The signed document and audit trail will remain available in Documenso.',
    emailSubject: `Signature requested: ${title}`,
    externalId: `executive_authorization:${authorizationId}`,
    fileName: slugifyFileName(title),
    recipients: recipients.map((signer, index) => ({
      email: signer.email,
      fields: template.signing.fieldPlacements
        .filter((placement) => placementAppliesToSigner(placement, signer))
        .map((placement) =>
          buildFieldFromPlacement({
            placement,
            signaturePageNumber,
            signerIndex: index,
          }),
        ),
      name: signer.name,
      role: RecipientRole.SIGNER,
      signingOrder: signer.signingOrder,
    })),
    renderedMarkdown,
    title,
  };
};
