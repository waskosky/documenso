import assert from 'node:assert/strict';

import { DocumentStatus } from '@prisma/client';

import { buildAuthorizationArtifactLinks } from './authorization-artifacts';

const completedLinks = buildAuthorizationArtifactLinks({
  envelope: {
    id: 'env_123',
    status: DocumentStatus.COMPLETED,
    envelopeItems: [
      {
        envelopeId: 'env_123',
        id: 'item_2',
        order: 2,
        title: 'Second approval.pdf',
      },
      {
        envelopeId: 'env_123',
        id: 'item_1',
        order: 1,
        title: 'Board approval.pdf',
      },
    ],
  },
});

assert.deepEqual(
  completedLinks.map((link) => ({ href: link.href, label: link.label, type: link.type })),
  [
    {
      href: '/api/files/envelope/env_123/envelopeItem/item_1/download/signed',
      label: 'Signed PDF: Board approval.pdf',
      type: 'signed_pdf',
    },
    {
      href: '/api/files/envelope/env_123/envelopeItem/item_2/download/signed',
      label: 'Signed PDF: Second approval.pdf',
      type: 'signed_pdf',
    },
    {
      href: '/api/files/envelope/env_123/certificate/download',
      label: 'Signing certificate PDF',
      type: 'certificate_pdf',
    },
    {
      href: '/api/files/envelope/env_123/audit-log/download',
      label: 'Audit log PDF',
      type: 'audit_log_pdf',
    },
  ],
);

assert.deepEqual(
  buildAuthorizationArtifactLinks({
    envelope: {
      id: 'env_pending',
      status: DocumentStatus.PENDING,
      envelopeItems: [
        {
          envelopeId: 'env_pending',
          id: 'item_pending',
          order: 1,
          title: 'Pending approval.pdf',
        },
      ],
    },
  }),
  [],
);

assert.deepEqual(buildAuthorizationArtifactLinks({ envelope: null }), []);
