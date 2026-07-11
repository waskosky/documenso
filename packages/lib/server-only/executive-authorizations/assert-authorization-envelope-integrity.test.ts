import assert from 'node:assert/strict';
import { assertAuthorizationEnvelopeIntegrity } from './assert-authorization-envelope-integrity';
import { buildAuthorizationEnvelopePlan } from './build-authorization-envelope-plan';
import { generateAuthorizationPdf } from './generate-authorization-pdf';

const signers = [
  { email: 'one@example.test', name: 'Director One', role: 'Director', signingOrder: 1 },
  { email: 'two@example.test', name: 'Director Two', role: 'Director', signingOrder: 2 },
  { email: 'three@example.test', name: 'Director Three', role: 'Director', signingOrder: 3 },
];
const authorization = {
  generatedDocumentDataId: 'document_data_example',
  id: 'authorization_example',
  renderedMarkdown: '# Board Resolution\n\nThe Board approves the example transaction.',
  signers,
  templateKey: 'board_resolution_secretary_certificate' as const,
  templateVersion: 1,
  title: 'Approve example transaction',
};

void (async () => {
  const pdf = await generateAuthorizationPdf({
    renderedMarkdown: authorization.renderedMarkdown,
    signers,
    title: authorization.title,
  });
  const plan = buildAuthorizationEnvelopePlan({
    authorizationId: authorization.id,
    renderedMarkdown: authorization.renderedMarkdown,
    signaturePageNumber: pdf.signaturePageNumber,
    signers,
    templateKey: authorization.templateKey,
    templateVersion: authorization.templateVersion,
    title: authorization.title,
  });
  const envelopeItem = {
    documentDataId: authorization.generatedDocumentDataId,
    id: 'envelope_item_example',
  };
  const envelope = {
    envelopeItems: [envelopeItem],
    externalId: plan.externalId,
    id: 'envelope_example',
    recipients: plan.recipients.map((recipient, recipientIndex) => ({
      email: recipient.email,
      fields: recipient.fields.map((field, fieldIndex) => ({
        ...field,
        envelopeItemId: envelopeItem.id,
        id: recipientIndex * 2 + fieldIndex + 1,
      })),
      id: recipientIndex + 1,
      name: recipient.name,
      role: recipient.role,
      signingOrder: recipient.signingOrder,
    })),
  };

  await assert.doesNotReject(() =>
    assertAuthorizationEnvelopeIntegrity({
      authorization,
      envelope,
    }),
  );

  const alteredCases: Array<{ expected: RegExp; envelope: typeof envelope }> = [
    {
      expected: /external ID/i,
      envelope: { ...envelope, externalId: 'different-external-id' },
    },
    {
      expected: /exactly one document/i,
      envelope: { ...envelope, envelopeItems: [] },
    },
    {
      expected: /generated document/i,
      envelope: {
        ...envelope,
        envelopeItems: [{ ...envelopeItem, documentDataId: 'replacement_document_data' }],
      },
    },
    {
      expected: /recipient 1.*name/i,
      envelope: {
        ...envelope,
        recipients: [{ ...envelope.recipients[0], name: 'Different Director' }, ...envelope.recipients.slice(1)],
      },
    },
    {
      expected: /recipient 1.*email/i,
      envelope: {
        ...envelope,
        recipients: [{ ...envelope.recipients[0], email: 'different@example.test' }, ...envelope.recipients.slice(1)],
      },
    },
    {
      expected: /signing order/i,
      envelope: {
        ...envelope,
        recipients: [{ ...envelope.recipients[0], signingOrder: 2 }, ...envelope.recipients.slice(1)],
      },
    },
    {
      expected: /field count/i,
      envelope: {
        ...envelope,
        recipients: [
          { ...envelope.recipients[0], fields: envelope.recipients[0].fields.slice(0, 1) },
          ...envelope.recipients.slice(1),
        ],
      },
    },
    {
      expected: /field type/i,
      envelope: {
        ...envelope,
        recipients: [
          {
            ...envelope.recipients[0],
            fields: [
              { ...envelope.recipients[0].fields[0], type: 'TEXT' as never },
              ...envelope.recipients[0].fields.slice(1),
            ],
          },
          ...envelope.recipients.slice(1),
        ],
      },
    },
    {
      expected: /field page/i,
      envelope: {
        ...envelope,
        recipients: [
          {
            ...envelope.recipients[0],
            fields: [
              { ...envelope.recipients[0].fields[0], page: pdf.signaturePageNumber + 1 },
              ...envelope.recipients[0].fields.slice(1),
            ],
          },
          ...envelope.recipients.slice(1),
        ],
      },
    },
    {
      expected: /field positionX/i,
      envelope: {
        ...envelope,
        recipients: [
          {
            ...envelope.recipients[0],
            fields: [
              { ...envelope.recipients[0].fields[0], positionX: envelope.recipients[0].fields[0].positionX + 1 },
              ...envelope.recipients[0].fields.slice(1),
            ],
          },
          ...envelope.recipients.slice(1),
        ],
      },
    },
    {
      expected: /generated document/i,
      envelope: {
        ...envelope,
        recipients: [
          {
            ...envelope.recipients[0],
            fields: [
              { ...envelope.recipients[0].fields[0], envelopeItemId: 'different_item' },
              ...envelope.recipients[0].fields.slice(1),
            ],
          },
          ...envelope.recipients.slice(1),
        ],
      },
    },
  ];

  for (const alteredCase of alteredCases) {
    await assert.rejects(
      () =>
        assertAuthorizationEnvelopeIntegrity({
          authorization,
          envelope: alteredCase.envelope,
        }),
      alteredCase.expected,
    );
  }

  console.log('authorization envelope integrity tests passed');
})();
