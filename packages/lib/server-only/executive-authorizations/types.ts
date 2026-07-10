export type AuthorizationTemplateKey = 'board_resolution_secretary_certificate';

export type AuthorizationTemplateType = 'BOARD_RESOLUTION';

export type AuthorizationSigner = {
  email: string;
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

export type BoardDirectorVote = {
  email?: string;
  name: string;
  presence: string;
  vote: 'For' | 'Against' | 'Abstain' | 'Recused' | string;
};

export type BoardResolutionCertificatePayload = {
  actionDate: string;
  actionTitle: string;
  authorizedOfficerName: string;
  authorizedOfficerTitle: string;
  companyLegalName: string;
  consentMethod: string;
  directors: BoardDirectorVote[];
  entityType: string;
  investorCondition: string;
  jurisdiction: string;
  matterDescription: string;
  materialsReviewed: string[];
  resolutionDisposition: string;
  resolutionTerms: string;
  secretaryName: string;
};

export type AuthorizationTemplatePayloadMap = {
  board_resolution_secretary_certificate: BoardResolutionCertificatePayload;
};
