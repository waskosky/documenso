import { PDFDocument, PageSizes, StandardFonts } from '@cantoo/pdf-lib';

import type { AuthorizationSigner } from './types';

type GenerateAuthorizationPdfOptions = {
  renderedMarkdown: string;
  signers: AuthorizationSigner[];
  title: string;
};

type GenerateAuthorizationPdfResult = {
  bytes: Buffer;
  pageCount: number;
  signaturePageNumber: number;
};

const PAGE_WIDTH = 612;
const MARGIN_X = 54;
const TOP_Y = 730;
const BOTTOM_Y = 56;
const BODY_SIZE = 10;
const BODY_LINE_HEIGHT = 14;

const stripMarkdown = (line: string) =>
  line
    .replace(/^#{1,6}\s*/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^[-*]\s+/, '- ')
    .trimEnd();

const wrapLine = (line: string, fontSize: number, usableWidth = PAGE_WIDTH - MARGIN_X * 2) => {
  const normalized = stripMarkdown(line);
  const maxChars = Math.max(24, Math.floor(usableWidth / (fontSize * 0.55)));

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const wrapped: string[] = [];
  const words = normalized.split(/\s+/);
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxChars && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped;
};

export const generateAuthorizationPdf = async ({
  renderedMarkdown,
  signers,
  title,
}: GenerateAuthorizationPdfOptions): Promise<GenerateAuthorizationPdfResult> => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage(PageSizes.Letter);
  let y = TOP_Y;

  const drawLine = (text: string, options: { size?: number; yGap?: number } = {}) => {
    const size = options.size ?? BODY_SIZE;
    const yGap = options.yGap ?? BODY_LINE_HEIGHT;

    if (y < BOTTOM_Y + yGap) {
      page = pdf.addPage(PageSizes.Letter);
      y = TOP_Y;
    }

    page.drawText(text, {
      font,
      size,
      x: MARGIN_X,
      y,
    });

    y -= yGap;
  };

  drawLine(title, { size: 16, yGap: 24 });

  for (const rawLine of renderedMarkdown.split('\n')) {
    if (!rawLine.trim()) {
      y -= 8;
      continue;
    }

    const isHeading = rawLine.startsWith('#');
    const isTable = rawLine.trim().startsWith('|');
    const size = isHeading ? 13 : isTable ? 8 : BODY_SIZE;
    const lineHeight = isHeading ? 20 : isTable ? 11 : BODY_LINE_HEIGHT;

    for (const line of wrapLine(rawLine, size)) {
      if (line.trim()) {
        drawLine(line, { size, yGap: lineHeight });
      }
    }
  }

  const signaturePage = pdf.addPage(PageSizes.Letter);
  const signaturePageNumber = pdf.getPageCount();

  signaturePage.drawText('Director Written Consent Signatures', {
    font,
    size: 16,
    x: MARGIN_X,
    y: 700,
  });
  signaturePage.drawText(
    'The undersigned directors approve and adopt the authorization attached above.',
    {
      font,
      size: 10,
      x: MARGIN_X,
      y: 672,
    },
  );

  signers.forEach((signer, index) => {
    const rowY = 575 - index * 140;

    signaturePage.drawText(signer.name || `Director ${index + 1}`, {
      font,
      size: 11,
      x: MARGIN_X,
      y: rowY,
    });
    signaturePage.drawText('Signature:', {
      font,
      size: 10,
      x: 184,
      y: rowY,
    });
    signaturePage.drawText('________________________________', {
      font,
      size: 10,
      x: 248,
      y: rowY,
    });
    signaturePage.drawText('Date:', {
      font,
      size: 10,
      x: 458,
      y: rowY,
    });
    signaturePage.drawText('____________', {
      font,
      size: 10,
      x: 492,
      y: rowY,
    });
  });

  const bytes = Buffer.from(await pdf.save());

  return {
    bytes,
    pageCount: pdf.getPageCount(),
    signaturePageNumber,
  };
};
