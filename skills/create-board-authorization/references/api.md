# Board Authorization API

## Authentication

Use a team API token with team-management permission. The client reads `DISCLOSURE_SIGN_API_TOKEN` first, then `DISCLOSURE_SIGN_API_TOKEN_FILE`, and finally `~/.config/disclosure-sign/api-token`. Token files must use mode `0600`. The client sends the token as a bearer token and never prints it. Optional settings:

- `DISCLOSURE_SIGN_API_TOKEN_FILE` selects a private token file.
- `DISCLOSURE_SIGN_BASE_URL` defaults to `https://sign.disclosurecomics.com`.
- `DISCLOSURE_SIGN_TIMEOUT_SECONDS` defaults to `30`.

Run the client from this skill directory or use its absolute path.

## Profile

Read stable defaults before every create operation:

```bash
python3 scripts/board_authorization.py profile-get
```

The response includes `exists`, `templateVersion`, `currentTemplateVersion`, and `needsUpgrade`. Do not create from a missing profile or one with `needsUpgrade: true`. Update only with reviewed, user-approved values:

```bash
./scripts/configure_board_profile.sh --dry-run
./scripts/configure_board_profile.sh
```

The interactive configurator is the preferred human setup path. It loads existing values as defaults, prompts for every version-2 field, and builds the JSON with `jq`. `--dry-run` prints the proposed profile without writing it. A real update shows the same preview and requires the exact confirmation `SAVE`. Use `--blank` only to deliberately skip loading the current profile. Authentication remains in `board_authorization.py`; the Bash script never reads or prints the token. Profile setup does not create or send an envelope.

For non-interactive automation, submit a reviewed raw defaults object directly:

```bash
python3 scripts/board_authorization.py profile-set --input profile.json
```

`profile.json` is the raw defaults object. Placeholder example:

```json
{
  "actionMethod": "UNANIMOUS_WRITTEN_CONSENT",
  "approvalRequiredCount": 2,
  "authorizedOfficerDirectorIndex": 1,
  "authorizedOfficerName": "Director Two",
  "authorizedOfficerTitle": "President",
  "companyLegalName": "Example Company, Inc.",
  "directors": [
    {
      "email": "director1@example.com",
      "name": "Director One",
      "presence": "CONSENTED",
      "vote": "FOR"
    },
    {
      "email": "director2@example.com",
      "name": "Director Two",
      "presence": "CONSENTED",
      "vote": "FOR"
    },
    {
      "email": "director3@example.com",
      "name": "Director Three",
      "presence": "CONSENTED",
      "vote": "FOR"
    }
  ],
  "entityType": "corporation",
  "equityHolderPlural": "stockholders",
  "governingBodyName": "Board of Directors",
  "governingMemberPlural": "directors",
  "governingMemberSingular": "director",
  "jurisdiction": "Colorado",
  "quorumRequiredCount": 2,
  "resolutionDisposition": "APPROVED_UNANIMOUSLY",
  "secretaryDirectorIndex": 0,
  "secretaryName": "Director One"
}
```

Exactly three directors with distinct valid email addresses are required. `secretaryName` and `authorizedOfficerName` must match the directors selected by their zero-based indexes. The same director may hold both execution roles. Valid controlled values are:

- `actionMethod`: `MEETING`, `UNANIMOUS_WRITTEN_CONSENT`, `WRITTEN_CONSENT`
- `presence`: `ABSENT`, `CONSENTED`, `PRESENT`
- `vote`: `ABSTAIN`, `AGAINST`, `FOR`, `NOT_VOTING`, `RECUSED`; an `ABSENT` director must use `NOT_VOTING`
- `resolutionDisposition`: `APPROVED_REQUIRED_VOTE`, `APPROVED_UNANIMOUSLY`, `NOT_APPROVED`

`approvalRequiredCount` and `quorumRequiredCount` are reviewed governance thresholds from `1` through `3`; do not infer them. Meeting presence and written-consent participation must support the selected method and disposition.

All names and addresses above are placeholders, never production defaults.

## Create Draft

Create requests contain only variable decision values plus an idempotency key:

```json
{
  "externalId": "board-2026-07-11-example-transaction",
  "generateDocument": true,
  "notes": "Optional internal context",
  "payload": {
    "actionDate": "2026-07-11",
    "actionTitle": "Approve Example Transaction",
    "certificateDate": "2026-07-12",
    "deliveryCondition": "Section 4.2 closing condition",
    "deliveryRecipient": "Example Investor",
    "materialsReviewed": ["https://example.com/source-document"],
    "matterDescription": "The board considered the proposed transaction.",
    "ratifyPriorActions": true,
    "specificAction": "the proposed transaction",
    "specificTerms": "on the terms in the reviewed agreement"
  },
  "templateKey": "board_resolution_secretary_certificate"
}
```

Required decision fields are `actionDate`, `actionTitle`, `certificateDate`, `materialsReviewed`, `matterDescription`, `ratifyPriorActions`, and `specificAction`. `specificTerms` is optional. `certificateDate` must not precede `actionDate`. `deliveryRecipient` and `deliveryCondition` are optional but paired. The API does not default ratification; use `true` only after explicit confirmation. When the profile disposition is `NOT_APPROVED`, ratification must be `false` and both delivery fields must be omitted.

Do not include stable profile keys in an ordinary create request. Change stable values only as a separate profile operation explicitly approved by the user.

```bash
python3 scripts/board_authorization.py create --input request.json
```

The endpoint is idempotent by team and `externalId`. Retry the same decision with the same value.

Successful output includes:

- `authorizationId` and `authorizationUrl`
- `envelopeId` and `editorUrl`
- `signerCount` (expected `3`)
- `fieldCount` (expected `9`: six director fields, a Secretary signature and execution-date field, and one Authorized Officer field)
- `integrityValid` (expected `true`) and `integrityError` (expected `null`)
- `status`
- `generationError`, normally `null`

The API never sends the envelope and never returns recipient signing tokens. Sending is a separate human action available only after a READY envelope exists for review.

## Raw Routes

- `POST /api/v2/executive-authorization/create`
- `GET /api/v2/executive-authorization/profile/{templateKey}`
- `POST /api/v2/executive-authorization/profile/{templateKey}` with body `{ "payloadDefaults": { ... } }`

Treat HTTP failures as failures. If creation returns a non-null `generationError` or `integrityError`, or false `integrityValid`, preserve its `externalId`, report the error and authorization URL, and repair that record rather than creating another.
