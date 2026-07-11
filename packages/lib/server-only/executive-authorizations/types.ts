export type AuthorizationTemplateKey = 'board_resolution_secretary_certificate';

export type AuthorizationTemplateType = 'BOARD_RESOLUTION';

export type AuthorizationSigner = {
  email: string;
  executionRoles?: string[];
  name: string;
  recipientId?: number;
  role: string;
  sendStatus?: string;
  signedAt?: string | null;
  signingOrder: number;
  signingUrl?: string;
  status?: string;
};

export type AuthorizationRenderResult = {
  markdown: string;
  signers: AuthorizationSigner[];
  templateKey: AuthorizationTemplateKey;
  templateVersion: number;
};

export type AuthorizationTemplate<TPayload> = {
  key: AuthorizationTemplateKey;
  label: string;
  signing: AuthorizationTemplateSigningMetadata;
  type: AuthorizationTemplateType;
  version: number;
  render: (payload: TPayload) => AuthorizationRenderResult;
};

export type AuthorizationTemplateSignerRole = {
  key: string;
  label: string;
  maxCount?: number;
  minCount: number;
  required: boolean;
};

export type AuthorizationTemplatePlacementValue =
  | number
  | {
      start: number;
      step: number;
    };

export type AuthorizationTemplateFieldPlacement = {
  appliesTo:
    | 'all_signers'
    | {
        signerRole: string;
      };
  field: 'DATE' | 'SIGNATURE';
  height: number;
  page: 'signature_page';
  positionX: AuthorizationTemplatePlacementValue;
  positionY: AuthorizationTemplatePlacementValue;
  width: number;
};

export type AuthorizationTemplateSigningMetadata = {
  fieldPlacements: AuthorizationTemplateFieldPlacement[];
  signerRoles: AuthorizationTemplateSignerRole[];
};

export type BoardDirectorVoteV1 = {
  email?: string;
  name: string;
  presence: string;
  vote: 'For' | 'Against' | 'Abstain' | 'Recused' | string;
};

export type BoardResolutionCertificatePayloadV1 = {
  actionDate: string;
  actionTitle: string;
  authorizedOfficerName: string;
  authorizedOfficerTitle: string;
  companyLegalName: string;
  consentMethod: string;
  directors: BoardDirectorVoteV1[];
  entityType: string;
  investorCondition: string;
  jurisdiction: string;
  matterDescription: string;
  materialsReviewed: string[];
  resolutionDisposition: string;
  resolutionTerms: string;
  secretaryName: string;
};

export type BoardAuthorizationActionMethod = 'MEETING' | 'UNANIMOUS_WRITTEN_CONSENT' | 'WRITTEN_CONSENT';

export type BoardDirectorPresence = 'ABSENT' | 'CONSENTED' | 'PRESENT';
export type BoardDirectorVote = 'ABSTAIN' | 'AGAINST' | 'FOR' | 'NOT_VOTING' | 'RECUSED';
export type BoardResolutionDisposition = 'APPROVED_REQUIRED_VOTE' | 'APPROVED_UNANIMOUSLY' | 'NOT_APPROVED';

export type BoardDirectorV2 = {
  email: string;
  name: string;
  presence: BoardDirectorPresence;
  vote: BoardDirectorVote;
};

export type BoardResolutionCertificatePayload = {
  actionDate: string;
  actionMethod: BoardAuthorizationActionMethod;
  actionTitle: string;
  approvalRequiredCount: number;
  authorizedOfficerDirectorIndex: number;
  authorizedOfficerName: string;
  authorizedOfficerTitle: string;
  certificateDate: string;
  companyLegalName: string;
  deliveryCondition?: string;
  deliveryRecipient?: string;
  directors: BoardDirectorV2[];
  entityType: string;
  equityHolderPlural: string;
  governingBodyName: string;
  governingMemberPlural: string;
  governingMemberSingular: string;
  jurisdiction: string;
  materialsReviewed: string[];
  matterDescription: string;
  quorumRequiredCount: number;
  ratifyPriorActions: boolean;
  resolutionDisposition: BoardResolutionDisposition;
  secretaryDirectorIndex: number;
  secretaryName: string;
  specificAction: string;
  specificTerms: string;
};

export type BoardResolutionCertificateVersionedPayload =
  | BoardResolutionCertificatePayloadV1
  | BoardResolutionCertificatePayload;

export type AuthorizationTemplatePayloadMap = {
  board_resolution_secretary_certificate: BoardResolutionCertificateVersionedPayload;
};
