import type { BoardResolutionCertificateProfilePayload } from '@documenso/lib/server-only/executive-authorizations/profile-payload';
import type { ReactNode } from 'react';

const actionMethodLabels: Record<BoardResolutionCertificateProfilePayload['actionMethod'], string> = {
  MEETING: 'Board meeting',
  UNANIMOUS_WRITTEN_CONSENT: 'Unanimous written consent',
  WRITTEN_CONSENT: 'Written consent',
};

const dispositionLabels: Record<BoardResolutionCertificateProfilePayload['resolutionDisposition'], string> = {
  APPROVED_REQUIRED_VOTE: 'Approved by required vote',
  APPROVED_UNANIMOUSLY: 'Approved unanimously',
  NOT_APPROVED: 'Not approved',
};

export const AuthorizationProfileSummary = ({
  actions,
  profile,
}: {
  actions?: ReactNode;
  profile: BoardResolutionCertificateProfilePayload;
}) => (
  <section aria-labelledby="authorization-defaults-heading" className="border-y py-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="font-semibold text-lg" id="authorization-defaults-heading">
          Authorization defaults
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">Applied from the saved team profile</p>
      </div>
      {actions}
    </div>

    <div className="mt-5 grid gap-x-8 gap-y-6 lg:grid-cols-3">
      <SummaryGroup title="Organization">
        <SummaryItem label="Legal name" value={profile.companyLegalName} />
        <SummaryItem label="Jurisdiction and entity" value={`${profile.jurisdiction} ${profile.entityType}`} />
        <SummaryItem label="Governing body" value={profile.governingBodyName} />
      </SummaryGroup>

      <SummaryGroup title="Governance">
        <SummaryItem label="Action method" value={actionMethodLabels[profile.actionMethod]} />
        <SummaryItem label="Disposition" value={dispositionLabels[profile.resolutionDisposition]} />
        <SummaryItem
          label="Quorum"
          value={`${profile.quorumRequiredCount} of ${profile.directors.length} ${profile.governingMemberPlural}`}
        />
        <SummaryItem label="Approval" value={`${profile.approvalRequiredCount} FOR votes`} />
      </SummaryGroup>

      <SummaryGroup title="Execution roles">
        <SummaryItem label="Secretary" value={profile.secretaryName} />
        <SummaryItem
          label="Authorized officer"
          value={`${profile.authorizedOfficerName}, ${profile.authorizedOfficerTitle}`}
        />
      </SummaryGroup>
    </div>

    <div className="mt-6 border-t pt-5">
      <h3 className="font-medium text-sm">Board signers</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {profile.directors.map((director, index) => (
          <div className="min-w-0 border-l-2 pl-3 text-sm" key={`${director.email}-${index}`}>
            <div className="truncate font-medium">{director.name}</div>
            <div className="mt-1 break-all text-muted-foreground">{director.email}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const SummaryGroup = ({ children, title }: { children: ReactNode; title: string }) => (
  <div className="min-w-0">
    <h3 className="font-medium text-sm">{title}</h3>
    <dl className="mt-3 space-y-3">{children}</dl>
  </div>
);

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 break-words font-medium">{value}</dd>
  </div>
);
