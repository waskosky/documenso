import { DocumentStatus, type EnvelopeItem } from '@prisma/client';

type AuthorizationArtifactEnvelope = {
  id: string;
  status: DocumentStatus;
  envelopeItems: Array<Pick<EnvelopeItem, 'envelopeId' | 'id' | 'order' | 'title'>>;
};

export type AuthorizationArtifactLink = {
  href: string;
  key: string;
  label: string;
  type: 'signed_pdf' | 'certificate_pdf' | 'audit_log_pdf';
};

export const formatEnvelopeItemSignedPdfDownloadPath = ({
  envelopeId,
  envelopeItemId,
}: {
  envelopeId: string;
  envelopeItemId: string;
}) => `/api/files/envelope/${envelopeId}/envelopeItem/${envelopeItemId}/download/signed`;

export const formatEnvelopeCertificatePdfDownloadPath = ({ envelopeId }: { envelopeId: string }) =>
  `/api/files/envelope/${envelopeId}/certificate/download`;

export const formatEnvelopeAuditLogPdfDownloadPath = ({ envelopeId }: { envelopeId: string }) =>
  `/api/files/envelope/${envelopeId}/audit-log/download`;

export const buildAuthorizationArtifactLinks = ({
  envelope,
}: {
  envelope: AuthorizationArtifactEnvelope | null | undefined;
}): AuthorizationArtifactLink[] => {
  if (!envelope || envelope.status !== DocumentStatus.COMPLETED) {
    return [];
  }

  const signedPdfLinks = [...envelope.envelopeItems]
    .sort((a, b) => a.order - b.order)
    .map(
      (item): AuthorizationArtifactLink => ({
        href: formatEnvelopeItemSignedPdfDownloadPath({
          envelopeId: item.envelopeId,
          envelopeItemId: item.id,
        }),
        key: `signed_pdf:${item.id}`,
        label: `Signed PDF: ${item.title}`,
        type: 'signed_pdf',
      }),
    );

  return [
    ...signedPdfLinks,
    {
      href: formatEnvelopeCertificatePdfDownloadPath({ envelopeId: envelope.id }),
      key: `certificate_pdf:${envelope.id}`,
      label: 'Signing certificate PDF',
      type: 'certificate_pdf',
    },
    {
      href: formatEnvelopeAuditLogPdfDownloadPath({ envelopeId: envelope.id }),
      key: `audit_log_pdf:${envelope.id}`,
      label: 'Audit log PDF',
      type: 'audit_log_pdf',
    },
  ];
};
