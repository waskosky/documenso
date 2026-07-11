# Board Authorization Template V2 Design

## Objective

Make every substantive placeholder and execution requirement in the supplied Board Resolution and Secretary's Certificate explicit, while retaining exactly three Documenso recipients and preserving all version-1 records unchanged.

## Compatibility

- Register a new template version `2`; keep version `1` and its six-field envelope plan available by stored `templateVersion`.
- New records and newly saved profiles use version 2. Existing authorization JSON, rendered Markdown, fingerprints, and envelopes are not rewritten.
- A version-1 profile must be reviewed and saved as version 2 before API automation can create a new record. Do not silently guess Secretary or Authorized Officer assignments.
- No Prisma migration is required because the expanded values remain versioned JSON.

## Version 2 Data Contract

Stable/profile-backed values:

- `companyLegalName`, `jurisdiction`, and `entityType`
- `governingBodyName`, `governingMemberSingular`, `governingMemberPlural`, and `equityHolderPlural`
- exactly three directors with distinct emails, controlled presence values, and controlled vote values
- `secretaryName` and `secretaryDirectorIndex`
- `authorizedOfficerName`, `authorizedOfficerTitle`, and `authorizedOfficerDirectorIndex`
- `actionMethod` default and `resolutionDisposition` default

Decision-specific values:

- `actionDate` and `certificateDate`
- `actionTitle`, `matterDescription`, and `materialsReviewed`
- `specificAction` and optional `specificTerms`
- optional paired `deliveryRecipient` and `deliveryCondition`
- `ratifyPriorActions`
- optional internal `notes`

Controlled values:

- action method: `MEETING`, `UNANIMOUS_WRITTEN_CONSENT`, or `WRITTEN_CONSENT`
- presence: `PRESENT`, `CONSENTED`, or `ABSENT`
- vote: `FOR`, `AGAINST`, `ABSTAIN`, or `RECUSED`
- disposition: `APPROVED_UNANIMOUSLY`, `APPROVED_REQUIRED_VOTE`, or `NOT_APPROVED`

The renderer derives exact human-readable language and vote rollups from these values. Delivery recipient and condition must either both be supplied or both omitted. Director assignment indexes must be `0`, `1`, or `2`.

## Document Rendering

- Use the configured governance terms consistently instead of slash-separated corporation/LLC language.
- Render one exact quorum/consent sentence from `actionMethod`.
- Render `specificAction` separately from optional `specificTerms`.
- Include the delivery/condition resolution only when both fields are present.
- Include prior-action ratification only when selected.
- Use `certificateDate` independently from `actionDate`.
- Remove unfillable blank signature lines and the duplicate Markdown signature table. State that execution appears on the attached Documenso execution page.
- When all directors vote for unanimous written consent, directors consent to and adopt the resolution. Otherwise, their signatures acknowledge the record and their respective recorded votes.

## Signing Contract

- Recipients remain the same three directors in signing order.
- Each director receives one signature and one date field.
- The selected Secretary director receives an additional Secretary signature and certificate-date field.
- The selected Authorized Officer director receives an additional acknowledgment signature field.
- The same director may hold both execution roles. Total expected fields are nine, distributed across three recipients.
- Version 2 uses one purpose-built execution page with non-overlapping director, Secretary, and Authorized Officer rows. Field targeting uses generic signer execution-role metadata, not names or hardcoded emails.

## UI And Automation

- Use select controls for action method, presence, vote, disposition, entity type, and director role assignments; use a checkbox for prior-action ratification.
- Defaults UI stores the stable roster, governance terms, execution assignments, and procedural defaults.
- Create/edit UI exposes all decision values and allows deliberate overrides.
- API automation accepts only decision-specific values and obtains stable values from the version-2 profile.
- The skill must require the expanded decision fields, never invent legal terms, expect exactly three recipients and nine fields, and remain no-send.

## Validation

- Unit checks cover schema cross-field rules, exact rendering, version preservation, role assignment, PDF/field placement, form parsing, API schemas, idempotency, and envelope integrity.
- Builds must pass on modern source and the deployed 2.4 compatibility branch.
- Live verification must use Mike's short-lived session, create no profile or draft without approved production values, send no email, and confirm the expanded blank/defaults UI and OpenAPI contract.

