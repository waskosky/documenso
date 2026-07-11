import type {
  AuthorizationRenderResult,
  AuthorizationTemplate,
  AuthorizationTemplateKey,
  BoardAuthorizationActionMethod,
  BoardDirectorPresence,
  BoardDirectorVote,
  BoardResolutionCertificatePayload,
  BoardResolutionCertificatePayloadV1,
  BoardResolutionDisposition,
} from './types';

const renderMaterials = (materials: string[]) => {
  if (materials.length === 0) {
    return '**None specified.**';
  }

  return materials.map((material) => `- ${material}`).join('\n');
};

const joinNamesByLegacyVote = (payload: BoardResolutionCertificatePayloadV1, vote: string) => {
  const names = payload.directors
    .filter((director) => director.vote.toLowerCase() === vote.toLowerCase())
    .map((director) => director.name);

  return names.length > 0 ? names.join(', ') : 'None';
};

const renderLegacyDirectorRows = (payload: BoardResolutionCertificatePayloadV1) =>
  payload.directors.map((director) => `| ${director.name} | ${director.presence} | ${director.vote} |`).join('\n');

const renderLegacyDirectorSignatureRows = (payload: BoardResolutionCertificatePayloadV1) =>
  payload.directors
    .map((director) => `| ${director.name} | __________________________ | ${payload.actionDate} |`)
    .join('\n');

const renderBoardResolutionCertificateV1 = (
  payload: BoardResolutionCertificatePayloadV1,
): AuthorizationRenderResult => {
  const markdown = `# Board Resolution and Secretary's Certificate
## ${payload.actionTitle}

**${payload.companyLegalName}**
a **${payload.jurisdiction} ${payload.entityType}**
Date of Board Action: **${payload.actionDate}**

---

## 1. Background

The Board of Directors of **${payload.companyLegalName}** (the "Company") considered the following matter:

**${payload.matterDescription}**

The Board reviewed, as applicable, the following materials:

${renderMaterials(payload.materialsReviewed)}

The Board determined that the approval of the matter described above is in the best interests of the Company and its stockholders/members.

---

## 2. Board Vote

The following directors were in office as of the date of the vote:

| Director Name | Present / Consenting | Vote |
|---|---:|---:|
${renderLegacyDirectorRows(payload)}

A quorum was present, or all directors consented in writing, as applicable.

The following resolution was presented to the Board:

---

## 3. Resolution

**RESOLVED**, that the Board hereby approves and authorizes **${payload.resolutionTerms}**.

**FURTHER RESOLVED**, that **${payload.authorizedOfficerName}, ${payload.authorizedOfficerTitle}** is authorized and directed, for and on behalf of the Company, to execute, deliver, and perform any agreements, certificates, notices, consents, filings, instruments, and other documents that such officer determines are necessary or advisable to carry out the foregoing resolution.

**FURTHER RESOLVED**, that any and all actions previously taken by any officer, director, manager, employee, or authorized representative of the Company in connection with the foregoing matter are hereby ratified, confirmed, and approved in all respects.

**FURTHER RESOLVED**, that the officers of the Company are authorized to deliver a copy of these resolutions, or a certificate confirming these resolutions, in satisfaction of **${payload.investorCondition}**.

The resolution was approved by the Board as follows:

**For:** ${joinNamesByLegacyVote(payload, 'For')}
**Against:** ${joinNamesByLegacyVote(payload, 'Against')}
**Abstained:** ${joinNamesByLegacyVote(payload, 'Abstain')}
**Recused:** ${joinNamesByLegacyVote(payload, 'Recused')}

The resolution was therefore **${payload.resolutionDisposition}**.

---

## 4. Secretary's Certificate

I, **${payload.secretaryName}**, am the duly appointed and acting Secretary of **${payload.companyLegalName}**.

I hereby certify that the resolutions set forth above were duly adopted by the Board of Directors of the Company on **${payload.actionDate}** by **${payload.consentMethod}**.

I further certify that the resolutions have not been amended, modified, rescinded, or revoked and remain in full force and effect as of the date of this certificate.

Date: **${payload.actionDate}**

By: _______________________________
Name: **${payload.secretaryName}**
Title: Secretary

Acknowledged by:

By: _______________________________
Name: **${payload.authorizedOfficerName}**
Title: **${payload.authorizedOfficerTitle}**

---

## Director Written Consent Signatures

The undersigned directors, constituting all members of the Board of Directors of the Company, hereby consent to, approve, and adopt the foregoing resolutions.

| Director | Signature | Date |
|---|---|---|
${renderLegacyDirectorSignatureRows(payload)}
`;

  return {
    markdown,
    signers: payload.directors.map((director, index) => ({
      email: director.email ?? '',
      name: director.name,
      role: 'Director',
      signingOrder: index + 1,
    })),
    templateKey: 'board_resolution_secretary_certificate',
    templateVersion: 1,
  };
};

const presenceLabels: Record<BoardDirectorPresence, string> = {
  ABSENT: 'Absent',
  CONSENTED: 'Consented',
  PRESENT: 'Present',
};

const voteLabels: Record<BoardDirectorVote, string> = {
  ABSTAIN: 'Abstain',
  AGAINST: 'Against',
  FOR: 'For',
  NOT_VOTING: 'Not voting',
  RECUSED: 'Recused',
};

const dispositionLabels: Record<BoardResolutionDisposition, string> = {
  APPROVED_REQUIRED_VOTE: 'approved by the required vote',
  APPROVED_UNANIMOUSLY: 'approved unanimously',
  NOT_APPROVED: 'not approved',
};

const actionMethodCertificateLabels: Record<BoardAuthorizationActionMethod, string> = {
  MEETING: 'a vote at a duly called meeting',
  UNANIMOUS_WRITTEN_CONSENT: 'unanimous written consent',
  WRITTEN_CONSENT: 'written consent as permitted by the Company governing documents and applicable law',
};

const joinNamesByVote = (payload: BoardResolutionCertificatePayload, vote: BoardDirectorVote) => {
  const names = payload.directors.filter((director) => director.vote === vote).map((director) => director.name);

  return names.length > 0 ? names.join(', ') : 'None';
};

const renderDirectorRows = (payload: BoardResolutionCertificatePayload) =>
  payload.directors
    .map((director) => `| ${director.name} | ${presenceLabels[director.presence]} | ${voteLabels[director.vote]} |`)
    .join('\n');

const renderActionMethodStatement = (payload: BoardResolutionCertificatePayload) => {
  if (payload.actionMethod === 'MEETING') {
    const presentCount = payload.directors.filter((director) => director.presence === 'PRESENT').length;

    return `A quorum of the ${payload.governingBodyName} was present (${presentCount} present; ${payload.quorumRequiredCount} required).`;
  }

  if (payload.actionMethod === 'UNANIMOUS_WRITTEN_CONSENT') {
    return `All ${payload.governingMemberPlural} consented in writing.`;
  }

  const writtenApprovalCount = payload.directors.filter(
    (director) => director.presence === 'CONSENTED' && director.vote === 'FOR',
  ).length;

  return `${writtenApprovalCount} ${payload.governingMemberPlural} approved by written consent; ${payload.approvalRequiredCount} approvals were required under the Company governing documents and applicable law.`;
};

const renderSpecificTerms = (specificTerms: string) =>
  specificTerms ? `, including without limitation **${specificTerms}**` : '';

const renderRatificationResolution = (payload: BoardResolutionCertificatePayload) => {
  if (!payload.ratifyPriorActions) {
    return '';
  }

  return `\n\n**FURTHER RESOLVED**, that any and all actions previously taken by any officer, ${payload.governingMemberSingular}, employee, or authorized representative of the Company in connection with the foregoing matter are hereby ratified, confirmed, and approved in all respects.`;
};

const renderDeliveryResolution = (payload: BoardResolutionCertificatePayload) => {
  if (!payload.deliveryRecipient || !payload.deliveryCondition) {
    return '';
  }

  return `\n\n**FURTHER RESOLVED**, that the officers of the Company are authorized to deliver a copy of these resolutions, or a certificate confirming these resolutions, to **${payload.deliveryRecipient}** in satisfaction of **${payload.deliveryCondition}**.`;
};

const renderBestInterestsStatement = (payload: BoardResolutionCertificatePayload) =>
  payload.resolutionDisposition === 'NOT_APPROVED'
    ? `The ${payload.governingBodyName} considered whether approval of the matter described above would be in the best interests of the Company and its ${payload.equityHolderPlural}.`
    : `The ${payload.governingBodyName} determined that the approval of the matter described above is in the best interests of the Company and its ${payload.equityHolderPlural}.`;

const renderSecretaryCertification = (payload: BoardResolutionCertificatePayload) => {
  if (payload.resolutionDisposition === 'NOT_APPROVED') {
    return `I hereby certify that the proposed resolutions set forth above were considered by the ${payload.governingBodyName} of the Company on **${payload.actionDate}** by **${actionMethodCertificateLabels[payload.actionMethod]}**, but were not adopted.

I further certify that the vote and disposition shown above accurately reflect the action taken by the ${payload.governingBodyName}.`;
  }

  return `I hereby certify that the resolutions set forth above were duly adopted by the ${payload.governingBodyName} of the Company on **${payload.actionDate}** by **${actionMethodCertificateLabels[payload.actionMethod]}**.

I further certify that the resolutions have not been amended, modified, rescinded, or revoked and remain in full force and effect as of the date of this certificate.`;
};

const renderResolutionText = (payload: BoardResolutionCertificatePayload) => {
  if (payload.resolutionDisposition === 'NOT_APPROVED') {
    const specificTerms = payload.specificTerms ? `\n\nSpecific terms considered: **${payload.specificTerms}**.` : '';

    return `**PROPOSED RESOLUTION (NOT ADOPTED)**

The ${payload.governingBodyName} considered whether to authorize **${payload.specificAction}**.${specificTerms}

No authorization, ratification, or delivery authority was granted by the vote recorded below.`;
  }

  return `**RESOLVED**, that the ${payload.governingBodyName} hereby approves and authorizes **${payload.specificAction}**${renderSpecificTerms(payload.specificTerms)}.

**FURTHER RESOLVED**, that **${payload.authorizedOfficerName}, ${payload.authorizedOfficerTitle}** is authorized and directed, for and on behalf of the Company, to execute, deliver, and perform any agreements, certificates, notices, consents, filings, instruments, and other documents that such officer determines are necessary or advisable to carry out the foregoing resolution.${renderRatificationResolution(payload)}${renderDeliveryResolution(payload)}`;
};

const renderBoardResolutionCertificateV2 = (payload: BoardResolutionCertificatePayload): AuthorizationRenderResult => {
  const allDirectorsApprove = payload.directors.every((director) => director.vote === 'FOR');
  const directorExecutionStatement =
    payload.actionMethod === 'UNANIMOUS_WRITTEN_CONSENT' && allDirectorsApprove
      ? `The undersigned ${payload.governingMemberPlural}, constituting all members of the ${payload.governingBodyName}, consent to, approve, and adopt the foregoing resolutions.`
      : `The undersigned ${payload.governingMemberPlural} acknowledge this record and their respective votes shown above.`;
  const markdown = `# Board Resolution and Secretary's Certificate
## ${payload.actionTitle}

**${payload.companyLegalName}**
a **${payload.jurisdiction} ${payload.entityType}**
Date of Board Action: **${payload.actionDate}**

---

## 1. Background

The ${payload.governingBodyName} of **${payload.companyLegalName}** (the "Company") considered the following matter:

**${payload.matterDescription}**

The ${payload.governingBodyName} reviewed, as applicable, the following materials:

${renderMaterials(payload.materialsReviewed)}

${renderBestInterestsStatement(payload)}

---

## 2. Board Vote

The following ${payload.governingMemberPlural} were in office as of the date of the vote:

| ${payload.governingMemberSingular} | Present / Consenting | Vote |
|---|---:|---:|
${renderDirectorRows(payload)}

${renderActionMethodStatement(payload)}

The following proposed resolution was presented to the ${payload.governingBodyName}:

---

## 3. ${payload.resolutionDisposition === 'NOT_APPROVED' ? 'Proposed Resolution' : 'Resolution'}

${renderResolutionText(payload)}

${payload.resolutionDisposition === 'NOT_APPROVED' ? `The vote on the proposed resolution was recorded by the ${payload.governingBodyName} as follows:` : `The resolution was approved by the ${payload.governingBodyName} as follows:`}

**For:** ${joinNamesByVote(payload, 'FOR')}
**Against:** ${joinNamesByVote(payload, 'AGAINST')}
**Abstained:** ${joinNamesByVote(payload, 'ABSTAIN')}
**Not Voting:** ${joinNamesByVote(payload, 'NOT_VOTING')}
**Recused:** ${joinNamesByVote(payload, 'RECUSED')}

The resolution was therefore **${dispositionLabels[payload.resolutionDisposition]}**.

---

## 4. Secretary's Certificate

I, **${payload.secretaryName}**, am the duly appointed and acting Secretary of **${payload.companyLegalName}**.

${renderSecretaryCertification(payload)}

Certificate Date: **${payload.certificateDate}**

Secretary signature and execution date by **${payload.secretaryName}** are completed on the attached execution page.

Authorized Officer acknowledgment by **${payload.authorizedOfficerName}, ${payload.authorizedOfficerTitle}** is completed on the attached execution page.

---

## 5. Execution

${directorExecutionStatement}

The attached Documenso execution page is incorporated into and forms part of this authorization.
`;

  return {
    markdown,
    signers: payload.directors.map((director, index) => {
      const executionRoles: string[] = [];

      if (index === payload.secretaryDirectorIndex) {
        executionRoles.push('Secretary');
      }

      if (index === payload.authorizedOfficerDirectorIndex) {
        executionRoles.push('Authorized Officer');
      }

      return {
        email: director.email,
        executionRoles,
        name: director.name,
        role: 'Director',
        signingOrder: index + 1,
      };
    }),
    templateKey: 'board_resolution_secretary_certificate',
    templateVersion: 2,
  };
};

const BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V1: AuthorizationTemplate<BoardResolutionCertificatePayloadV1> = {
  key: 'board_resolution_secretary_certificate',
  label: 'Board Resolution and Secretary Certificate',
  render: renderBoardResolutionCertificateV1,
  signing: {
    fieldPlacements: [
      {
        appliesTo: 'all_signers',
        field: 'SIGNATURE',
        height: 5.5,
        page: 'signature_page',
        positionX: 30,
        positionY: { start: 28, step: 18 },
        width: 38,
      },
      {
        appliesTo: 'all_signers',
        field: 'DATE',
        height: 4.5,
        page: 'signature_page',
        positionX: 75,
        positionY: { start: 28.5, step: 18 },
        width: 14,
      },
    ],
    signerRoles: [
      {
        key: 'director',
        label: 'Director',
        maxCount: 3,
        minCount: 3,
        required: true,
      },
    ],
  },
  type: 'BOARD_RESOLUTION',
  version: 1,
};

const BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V2: AuthorizationTemplate<BoardResolutionCertificatePayload> = {
  key: 'board_resolution_secretary_certificate',
  label: 'Board Resolution and Secretary Certificate',
  render: renderBoardResolutionCertificateV2,
  signing: {
    fieldPlacements: [
      {
        appliesTo: 'all_signers',
        field: 'SIGNATURE',
        height: 5.5,
        page: 'signature_page',
        positionX: 40.5,
        positionY: { start: 23, step: 13 },
        width: 29,
      },
      {
        appliesTo: 'all_signers',
        field: 'DATE',
        height: 4.5,
        page: 'signature_page',
        positionX: 80,
        positionY: { start: 23.5, step: 13 },
        width: 12,
      },
      {
        appliesTo: { signerRole: 'Secretary' },
        field: 'SIGNATURE',
        height: 5.5,
        page: 'signature_page',
        positionX: 40.5,
        positionY: 70,
        width: 26.5,
      },
      {
        appliesTo: { signerRole: 'Secretary' },
        field: 'DATE',
        height: 4.5,
        page: 'signature_page',
        positionX: 80,
        positionY: 70.5,
        width: 12,
      },
      {
        appliesTo: { signerRole: 'Authorized Officer' },
        field: 'SIGNATURE',
        height: 5.5,
        page: 'signature_page',
        positionX: 40.5,
        positionY: 83,
        width: 29,
      },
    ],
    signerRoles: BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V1.signing.signerRoles,
  },
  type: 'BOARD_RESOLUTION',
  version: 2,
};

export const AUTHORIZATION_TEMPLATES = {
  board_resolution_secretary_certificate: BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V2,
} satisfies {
  board_resolution_secretary_certificate: AuthorizationTemplate<BoardResolutionCertificatePayload>;
};

const AUTHORIZATION_TEMPLATE_VERSIONS = {
  board_resolution_secretary_certificate: new Map<
    number,
    | AuthorizationTemplate<BoardResolutionCertificatePayloadV1>
    | AuthorizationTemplate<BoardResolutionCertificatePayload>
  >([
    [BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V1.version, BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V1],
    [BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V2.version, BOARD_RESOLUTION_SECRETARY_CERTIFICATE_V2],
  ]),
};

export const getAuthorizationTemplate = (key: AuthorizationTemplateKey, version?: number) => {
  if (version === undefined) {
    return AUTHORIZATION_TEMPLATES[key];
  }

  const template = AUTHORIZATION_TEMPLATE_VERSIONS[key].get(version);

  if (!template) {
    throw new Error(`Authorization template version ${version} is not registered for "${key}".`);
  }

  return template;
};
