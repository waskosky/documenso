import type {
  AuthorizationRenderResult,
  AuthorizationTemplate,
  AuthorizationTemplateKey,
  BoardResolutionCertificatePayload,
} from './types';

const joinNamesByVote = (payload: BoardResolutionCertificatePayload, vote: string) => {
  const names = payload.directors
    .filter((director) => director.vote.toLowerCase() === vote.toLowerCase())
    .map((director) => director.name);

  return names.length > 0 ? names.join(', ') : 'None';
};

const renderMaterials = (materials: string[]) => {
  if (materials.length === 0) {
    return '**None specified.**';
  }

  return materials.map((material) => `- ${material}`).join('\n');
};

const renderDirectorRows = (payload: BoardResolutionCertificatePayload) =>
  payload.directors
    .map((director) => `| ${director.name} | ${director.presence} | ${director.vote} |`)
    .join('\n');

const renderDirectorSignatureRows = (payload: BoardResolutionCertificatePayload) =>
  payload.directors
    .map((director) => `| ${director.name} | __________________________ | ${payload.actionDate} |`)
    .join('\n');

const renderBoardResolutionCertificate = (
  payload: BoardResolutionCertificatePayload,
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
${renderDirectorRows(payload)}

A quorum was present, or all directors consented in writing, as applicable.

The following resolution was presented to the Board:

---

## 3. Resolution

**RESOLVED**, that the Board hereby approves and authorizes **${payload.resolutionTerms}**.

**FURTHER RESOLVED**, that **${payload.authorizedOfficerName}, ${payload.authorizedOfficerTitle}** is authorized and directed, for and on behalf of the Company, to execute, deliver, and perform any agreements, certificates, notices, consents, filings, instruments, and other documents that such officer determines are necessary or advisable to carry out the foregoing resolution.

**FURTHER RESOLVED**, that any and all actions previously taken by any officer, director, manager, employee, or authorized representative of the Company in connection with the foregoing matter are hereby ratified, confirmed, and approved in all respects.

**FURTHER RESOLVED**, that the officers of the Company are authorized to deliver a copy of these resolutions, or a certificate confirming these resolutions, in satisfaction of **${payload.investorCondition}**.

The resolution was approved by the Board as follows:

**For:** ${joinNamesByVote(payload, 'For')}
**Against:** ${joinNamesByVote(payload, 'Against')}
**Abstained:** ${joinNamesByVote(payload, 'Abstain')}
**Recused:** ${joinNamesByVote(payload, 'Recused')}

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
${renderDirectorSignatureRows(payload)}
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

export const AUTHORIZATION_TEMPLATES = {
  board_resolution_secretary_certificate: {
    key: 'board_resolution_secretary_certificate',
    label: 'Board Resolution and Secretary Certificate',
    render: renderBoardResolutionCertificate,
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
  },
} satisfies {
  board_resolution_secretary_certificate: AuthorizationTemplate<BoardResolutionCertificatePayload>;
};

export const getAuthorizationTemplate = (key: AuthorizationTemplateKey) =>
  AUTHORIZATION_TEMPLATES[key];
