export type AuthorizationTemplateKey = 'board_resolution_secretary_certificate';

export type AuthorizationTemplateType = 'BOARD_RESOLUTION';

export type AuthorizationSigner = {
  email: string;
  name: string;
  role: string;
  signingOrder: number;
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
  type: AuthorizationTemplateType;
  version: number;
  render: (payload: TPayload) => AuthorizationRenderResult;
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
