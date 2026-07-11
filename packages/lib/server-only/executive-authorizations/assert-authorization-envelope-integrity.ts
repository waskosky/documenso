import { buildAuthorizationEnvelopePlan } from './build-authorization-envelope-plan';
import { generateAuthorizationPdf } from './generate-authorization-pdf';
import type { AuthorizationSigner, AuthorizationTemplateKey } from './types';

type AuthorizationEnvelopeIntegrityField = {
  height: unknown;
  page: number;
  positionX: unknown;
  positionY: unknown;
  type: string;
  width: unknown;
};

type AuthorizationEnvelopeIntegrityRecipient = {
  email: string;
  fields: AuthorizationEnvelopeIntegrityField[];
  name: string;
  role: string;
  signingOrder: number | null;
};

const integrityError = (message: string): never => {
  throw new Error(`Authorization envelope integrity check failed: ${message}`);
};

const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizeFields = <TField extends { type: string }>(fields: TField[]) =>
  [...fields].sort((left, right) => left.type.localeCompare(right.type));
const numericValuesMatch = (left: unknown, right: unknown) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && Math.abs(leftNumber - rightNumber) < 0.0001;
};

export const assertAuthorizationEnvelopeIntegrity = async ({
  authorization,
  envelope,
}: {
  authorization: {
    id: string;
    renderedMarkdown: string;
    signers: AuthorizationSigner[];
    templateKey: AuthorizationTemplateKey;
    title: string;
  };
  envelope: {
    externalId: string | null;
    id: string;
    recipients: AuthorizationEnvelopeIntegrityRecipient[];
  };
}) => {
  const pdf = await generateAuthorizationPdf({
    renderedMarkdown: authorization.renderedMarkdown,
    signers: authorization.signers,
    title: authorization.title,
  });
  const expected = buildAuthorizationEnvelopePlan({
    authorizationId: authorization.id,
    renderedMarkdown: authorization.renderedMarkdown,
    signaturePageNumber: pdf.signaturePageNumber,
    signers: authorization.signers,
    templateKey: authorization.templateKey,
    title: authorization.title,
  });

  if (envelope.externalId !== expected.externalId) {
    integrityError(`external ID must be "${expected.externalId}".`);
  }

  const actualRecipients = [...envelope.recipients].sort(
    (left, right) => (left.signingOrder ?? Number.MAX_SAFE_INTEGER) - (right.signingOrder ?? Number.MAX_SAFE_INTEGER),
  );

  if (actualRecipients.length !== expected.recipients.length) {
    integrityError(`recipient count must be ${expected.recipients.length}, received ${actualRecipients.length}.`);
  }

  expected.recipients.forEach((expectedRecipient, recipientIndex) => {
    const actualRecipient = actualRecipients[recipientIndex];
    const recipientNumber = recipientIndex + 1;

    if (!actualRecipient) {
      integrityError(`recipient ${recipientNumber} is missing.`);
    }

    if (normalizeText(actualRecipient.name) !== normalizeText(expectedRecipient.name)) {
      integrityError(`recipient ${recipientNumber} name does not match the authorization record.`);
    }

    if (normalizeText(actualRecipient.email) !== normalizeText(expectedRecipient.email)) {
      integrityError(`recipient ${recipientNumber} email does not match the authorization record.`);
    }

    if (actualRecipient.signingOrder !== expectedRecipient.signingOrder) {
      integrityError(`recipient ${recipientNumber} signing order must be ${expectedRecipient.signingOrder}.`);
    }

    if (actualRecipient.role !== expectedRecipient.role) {
      integrityError(`recipient ${recipientNumber} role must be ${expectedRecipient.role}.`);
    }

    const actualFields = normalizeFields(actualRecipient.fields);
    const expectedFields = normalizeFields(expectedRecipient.fields);

    if (actualFields.length !== expectedFields.length) {
      integrityError(`recipient ${recipientNumber} field count must be ${expectedFields.length}.`);
    }

    expectedFields.forEach((expectedField, fieldIndex) => {
      const actualField = actualFields[fieldIndex];
      const fieldNumber = fieldIndex + 1;

      if (!actualField) {
        integrityError(`recipient ${recipientNumber} field ${fieldNumber} is missing.`);
      }

      if (actualField.type !== expectedField.type) {
        integrityError(`recipient ${recipientNumber} field type must be ${expectedField.type}.`);
      }

      if (actualField.page !== expectedField.page) {
        integrityError(`recipient ${recipientNumber} field page must be ${expectedField.page}.`);
      }

      for (const property of ['positionX', 'positionY', 'width', 'height'] as const) {
        if (!numericValuesMatch(actualField[property], expectedField[property])) {
          integrityError(
            `recipient ${recipientNumber} field ${property} must be ${expectedField[property]}, received ${String(actualField[property])}.`,
          );
        }
      }
    });
  });
};
