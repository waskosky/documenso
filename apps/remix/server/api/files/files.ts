import { sValidator } from '@hono/standard-validator';
import { EnvelopeType, type Prisma } from '@prisma/client';
import contentDisposition from 'content-disposition';
import { Hono } from 'hono';

import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { APP_DOCUMENT_UPLOAD_SIZE_LIMIT } from '@documenso/lib/constants/app';
import { PDF_SIZE_A4_72PPI } from '@documenso/lib/constants/pdf';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { verifyEmbeddingPresignToken } from '@documenso/lib/server-only/embedding-presign/verify-embedding-presign-token';
import { generateAuditLogPdf } from '@documenso/lib/server-only/pdf/generate-audit-log-pdf';
import { generateCertificatePdf } from '@documenso/lib/server-only/pdf/generate-certificate-pdf';
import { getTeamById } from '@documenso/lib/server-only/team/get-team';
import { putNormalizedPdfFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { getPresignPostUrl } from '@documenso/lib/universal/upload/server-actions';
import { isDocumentCompleted } from '@documenso/lib/utils/document';
import { prisma } from '@documenso/prisma';

import type { HonoEnv } from '../../router';
import { handleEnvelopeItemFileRequest } from './files.helpers';
import {
  type TGetPresignedPostUrlResponse,
  ZGetEnvelopeArtifactPdfDownloadRequestParamsSchema,
  ZGetEnvelopeItemFileDownloadRequestParamsSchema,
  ZGetEnvelopeItemFileRequestParamsSchema,
  ZGetEnvelopeItemFileRequestQuerySchema,
  ZGetEnvelopeItemFileTokenDownloadRequestParamsSchema,
  ZGetEnvelopeItemFileTokenRequestParamsSchema,
  ZGetPresignedPostUrlRequestSchema,
  ZUploadPdfRequestSchema,
} from './files.types';

export const filesRoute = new Hono<HonoEnv>()
  /**
   * Uploads a document file to the appropriate storage location and creates
   * a document data record.
   */
  .post('/upload-pdf', sValidator('form', ZUploadPdfRequestSchema), async (c) => {
    try {
      const { file } = c.req.valid('form');

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Todo: (RR7) This is new.
      // Add file size validation.
      // Convert MB to bytes (1 MB = 1024 * 1024 bytes)
      const MAX_FILE_SIZE = APP_DOCUMENT_UPLOAD_SIZE_LIMIT * 1024 * 1024;

      if (file.size > MAX_FILE_SIZE) {
        return c.json({ error: 'File too large' }, 400);
      }

      const result = await putNormalizedPdfFileServerSide(file);

      return c.json(result);
    } catch (error) {
      console.error('Upload failed:', error);
      return c.json({ error: 'Upload failed' }, 500);
    }
  })
  .post('/presigned-post-url', sValidator('json', ZGetPresignedPostUrlRequestSchema), async (c) => {
    const { fileName, contentType } = c.req.valid('json');

    try {
      const { key, url } = await getPresignPostUrl(fileName, contentType);

      return c.json({ key, url } satisfies TGetPresignedPostUrlResponse);
    } catch (err) {
      console.error(err);

      throw new AppError(AppErrorCode.UNKNOWN_ERROR);
    }
  })
  .get(
    '/envelope/:envelopeId/audit-log/download',
    sValidator('param', ZGetEnvelopeArtifactPdfDownloadRequestParamsSchema),
    async (c) => {
      const logger = c.get('logger');

      try {
        const { envelopeId } = c.req.valid('param');
        const session = await getOptionalSession(c);

        if (!session.user) {
          return c.json({ error: 'Unauthorized' }, 401);
        }

        const envelope = await prisma.envelope.findFirst({
          where: {
            id: envelopeId,
            type: EnvelopeType.DOCUMENT,
          },
          include: {
            recipients: true,
            fields: {
              include: {
                signature: true,
              },
            },
            documentMeta: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
            envelopeItems: {
              orderBy: {
                order: 'asc',
              },
              select: {
                title: true,
              },
            },
          },
        });

        if (!envelope || !envelope.documentMeta) {
          return c.json({ error: 'Envelope not found' }, 404);
        }

        const team = await getTeamById({
          userId: session.user.id,
          teamId: envelope.teamId,
        }).catch((error) => {
          console.error(error);

          return null;
        });

        if (!team) {
          return c.json(
            {
              error: 'User does not have access to the team that this envelope is associated with',
            },
            403,
          );
        }

        const auditLogPdf = await generateAuditLogPdf({
          envelope,
          recipients: envelope.recipients,
          fields: envelope.fields,
          language: envelope.documentMeta.language,
          envelopeOwner: {
            email: envelope.user.email,
            name: envelope.user.name || '',
          },
          envelopeItems: envelope.envelopeItems.map((item) => item.title),
          pageWidth: PDF_SIZE_A4_72PPI.width,
          pageHeight: PDF_SIZE_A4_72PPI.height,
        });

        const result = await auditLogPdf.save();
        const baseTitle = envelope.title.replace(/\.pdf$/i, '');

        c.header('Content-Type', 'application/pdf');
        c.header('Content-Disposition', contentDisposition(`${baseTitle}_audit-log.pdf`));
        c.header('Cache-Control', 'no-cache, no-store, must-revalidate');

        return c.body(result);
      } catch (error) {
        logger.error(error);

        if (error instanceof AppError) {
          const { status, body } = AppError.toRestAPIError(error);

          return c.json({ error: body.message, code: error.code }, status);
        }

        return c.json({ error: 'Internal server error' }, 500);
      }
    },
  )
  .get(
    '/envelope/:envelopeId/certificate/download',
    sValidator('param', ZGetEnvelopeArtifactPdfDownloadRequestParamsSchema),
    async (c) => {
      const logger = c.get('logger');

      try {
        const { envelopeId } = c.req.valid('param');
        const session = await getOptionalSession(c);

        if (!session.user) {
          return c.json({ error: 'Unauthorized' }, 401);
        }

        const envelope = await prisma.envelope.findFirst({
          where: {
            id: envelopeId,
            type: EnvelopeType.DOCUMENT,
          },
          include: {
            recipients: true,
            fields: {
              include: {
                signature: true,
              },
            },
            documentMeta: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        });

        if (!envelope || !envelope.documentMeta) {
          return c.json({ error: 'Envelope not found' }, 404);
        }

        const team = await getTeamById({
          userId: session.user.id,
          teamId: envelope.teamId,
        }).catch((error) => {
          console.error(error);

          return null;
        });

        if (!team) {
          return c.json(
            {
              error: 'User does not have access to the team that this envelope is associated with',
            },
            403,
          );
        }

        if (!isDocumentCompleted(envelope.status) || String(envelope.status) === 'CANCELLED') {
          throw new AppError('DOCUMENT_NOT_COMPLETE', {
            message: 'Document is not complete',
          });
        }

        const certificatePdf = await generateCertificatePdf({
          envelope,
          recipients: envelope.recipients,
          fields: envelope.fields,
          language: envelope.documentMeta.language,
          envelopeOwner: {
            email: envelope.user.email,
            name: envelope.user.name || '',
          },
          pageWidth: PDF_SIZE_A4_72PPI.width,
          pageHeight: PDF_SIZE_A4_72PPI.height,
        });

        const result = await certificatePdf.save();
        const baseTitle = envelope.title.replace(/\.pdf$/i, '');

        c.header('Content-Type', 'application/pdf');
        c.header('Content-Disposition', contentDisposition(`${baseTitle}_certificate.pdf`));
        c.header('Cache-Control', 'no-cache, no-store, must-revalidate');

        return c.body(result);
      } catch (error) {
        logger.error(error);

        if (error instanceof AppError) {
          const { status, body } = AppError.toRestAPIError(error);

          return c.json({ error: body.message, code: error.code }, status);
        }

        return c.json({ error: 'Internal server error' }, 500);
      }
    },
  )
  .get(
    '/envelope/:envelopeId/envelopeItem/:envelopeItemId',
    sValidator('param', ZGetEnvelopeItemFileRequestParamsSchema),
    sValidator('query', ZGetEnvelopeItemFileRequestQuerySchema),
    async (c) => {
      const { envelopeId, envelopeItemId } = c.req.valid('param');
      const { token } = c.req.query();

      const session = await getOptionalSession(c);

      let userId = session.user?.id;

      if (token) {
        const presignToken = await verifyEmbeddingPresignToken({
          token,
        }).catch(() => undefined);

        userId = presignToken?.userId;
      }

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const envelope = await prisma.envelope.findFirst({
        where: {
          id: envelopeId,
        },
        include: {
          envelopeItems: {
            where: {
              id: envelopeItemId,
            },
            include: {
              documentData: true,
            },
          },
        },
      });

      if (!envelope) {
        return c.json({ error: 'Envelope not found' }, 404);
      }

      const [envelopeItem] = envelope.envelopeItems;

      if (!envelopeItem) {
        return c.json({ error: 'Envelope item not found' }, 404);
      }

      const team = await getTeamById({
        userId: userId,
        teamId: envelope.teamId,
      }).catch((error) => {
        console.error(error);

        return null;
      });

      if (!team) {
        return c.json(
          { error: 'User does not have access to the team that this envelope is associated with' },
          403,
        );
      }

      if (!envelopeItem.documentData) {
        return c.json({ error: 'Document data not found' }, 404);
      }

      return await handleEnvelopeItemFileRequest({
        title: envelopeItem.title,
        status: envelope.status,
        documentData: envelopeItem.documentData,
        version: 'signed',
        isDownload: false,
        context: c,
      });
    },
  )
  .get(
    '/envelope/:envelopeId/envelopeItem/:envelopeItemId/download/:version?',
    sValidator('param', ZGetEnvelopeItemFileDownloadRequestParamsSchema),
    async (c) => {
      const { envelopeId, envelopeItemId, version } = c.req.valid('param');

      const session = await getOptionalSession(c);

      if (!session.user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const envelope = await prisma.envelope.findFirst({
        where: {
          id: envelopeId,
        },
        include: {
          envelopeItems: {
            where: {
              id: envelopeItemId,
            },
            include: {
              documentData: true,
            },
          },
        },
      });

      if (!envelope) {
        return c.json({ error: 'Envelope not found' }, 404);
      }

      const [envelopeItem] = envelope.envelopeItems;

      if (!envelopeItem) {
        return c.json({ error: 'Envelope item not found' }, 404);
      }

      const team = await getTeamById({
        userId: session.user.id,
        teamId: envelope.teamId,
      }).catch((error) => {
        console.error(error);

        return null;
      });

      if (!team) {
        return c.json(
          { error: 'User does not have access to the team that this envelope is associated with' },
          403,
        );
      }

      if (!envelopeItem.documentData) {
        return c.json({ error: 'Document data not found' }, 404);
      }

      return await handleEnvelopeItemFileRequest({
        title: envelopeItem.title,
        status: envelope.status,
        documentData: envelopeItem.documentData,
        version,
        isDownload: true,
        context: c,
      });
    },
  )
  .get(
    '/token/:token/envelopeItem/:envelopeItemId',
    sValidator('param', ZGetEnvelopeItemFileTokenRequestParamsSchema),
    async (c) => {
      const { token, envelopeItemId } = c.req.valid('param');

      let envelopeWhereQuery: Prisma.EnvelopeItemWhereUniqueInput = {
        id: envelopeItemId,
        envelope: {
          recipients: {
            some: {
              token,
            },
          },
        },
      };

      if (token.startsWith('qr_')) {
        envelopeWhereQuery = {
          id: envelopeItemId,
          envelope: {
            qrToken: token,
          },
        };
      }

      const envelopeItem = await prisma.envelopeItem.findUnique({
        where: envelopeWhereQuery,
        include: {
          envelope: true,
          documentData: true,
        },
      });

      if (!envelopeItem) {
        return c.json({ error: 'Envelope item not found' }, 404);
      }

      if (!envelopeItem.documentData) {
        return c.json({ error: 'Document data not found' }, 404);
      }

      return await handleEnvelopeItemFileRequest({
        title: envelopeItem.title,
        status: envelopeItem.envelope.status,
        documentData: envelopeItem.documentData,
        version: 'signed',
        isDownload: false,
        context: c,
      });
    },
  )
  .get(
    '/token/:token/envelopeItem/:envelopeItemId/download/:version?',
    sValidator('param', ZGetEnvelopeItemFileTokenDownloadRequestParamsSchema),
    async (c) => {
      const { token, envelopeItemId, version } = c.req.valid('param');

      let envelopeWhereQuery: Prisma.EnvelopeItemWhereUniqueInput = {
        id: envelopeItemId,
        envelope: {
          recipients: {
            some: {
              token,
            },
          },
        },
      };

      if (token.startsWith('qr_')) {
        envelopeWhereQuery = {
          id: envelopeItemId,
          envelope: {
            qrToken: token,
          },
        };
      }

      const envelopeItem = await prisma.envelopeItem.findUnique({
        where: envelopeWhereQuery,
        include: {
          envelope: true,
          documentData: true,
        },
      });

      if (!envelopeItem) {
        return c.json({ error: 'Envelope item not found' }, 404);
      }

      if (!envelopeItem.documentData) {
        return c.json({ error: 'Document data not found' }, 404);
      }

      return await handleEnvelopeItemFileRequest({
        title: envelopeItem.title,
        status: envelopeItem.envelope.status,
        documentData: envelopeItem.documentData,
        version,
        isDownload: true,
        context: c,
      });
    },
  );
