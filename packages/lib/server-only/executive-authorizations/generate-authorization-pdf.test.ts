import assert from 'node:assert/strict';

import { PDFDocument } from '@cantoo/pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { generateAuthorizationPdf } from './generate-authorization-pdf';

const main = async () => {
  const result = await generateAuthorizationPdf({
    renderedMarkdown:
      '# Board Approval\n\nThis approval authorizes the financing.\n\n## Resolution\n\nRESOLVED, approved.',
    signers: [
      {
        email: 'one@example.com',
        executionRoles: ['Secretary'],
        name: 'Director One',
        role: 'Director',
        signingOrder: 1,
      },
      {
        email: 'two@example.com',
        executionRoles: ['Authorized Officer'],
        name: 'Director Two',
        role: 'Director',
        signingOrder: 2,
      },
      {
        email: 'three@example.com',
        executionRoles: [],
        name: 'Director Three',
        role: 'Director',
        signingOrder: 3,
      },
    ],
    templateVersion: 2,
    title: 'Approval of SAFE Financing',
  });

  const pdf = await PDFDocument.load(result.bytes);

  assert.ok(Buffer.isBuffer(result.bytes));
  assert.ok(result.bytes.length > 500);
  assert.equal(result.signaturePageNumber, result.pageCount);
  assert.equal(pdf.getPageCount(), result.pageCount);
  assert.ok(result.pageCount >= 2);

  const readablePdf = await getDocument({ data: new Uint8Array(result.bytes), verbosity: 0 }).promise;
  const signaturePage = await readablePdf.getPage(result.signaturePageNumber);
  const signatureText = (await signaturePage.getTextContent()).items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ');

  assert.match(signatureText, /Secretary Certification/);
  assert.match(signatureText, /Execution Date:/);
  assert.match(signatureText, /Authorized Officer Acknowledgment/);
};

void main();
