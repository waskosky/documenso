import assert from 'node:assert/strict';

import { PDFDocument } from '@cantoo/pdf-lib';

import { generateAuthorizationPdf } from './generate-authorization-pdf';

const main = async () => {
  const result = await generateAuthorizationPdf({
    renderedMarkdown:
      '# Board Approval\n\nThis approval authorizes the financing.\n\n## Resolution\n\nRESOLVED, approved.',
    signers: [
      {
        email: 'one@example.com',
        name: 'Director One',
        role: 'Director',
        signingOrder: 1,
      },
      {
        email: 'two@example.com',
        name: 'Director Two',
        role: 'Director',
        signingOrder: 2,
      },
      {
        email: 'three@example.com',
        name: 'Director Three',
        role: 'Director',
        signingOrder: 3,
      },
    ],
    title: 'Approval of SAFE Financing',
  });

  const pdf = await PDFDocument.load(result.bytes);

  assert.ok(Buffer.isBuffer(result.bytes));
  assert.ok(result.bytes.length > 500);
  assert.equal(result.signaturePageNumber, result.pageCount);
  assert.equal(pdf.getPageCount(), result.pageCount);
  assert.ok(result.pageCount >= 2);
};

void main();
