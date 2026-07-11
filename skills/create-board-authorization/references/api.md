# Board Authorization API

## Authentication

Set `DISCLOSURE_SIGN_API_TOKEN` to a team API token with team-management permission. The client sends it as a bearer token and never prints it. Optional settings:

- `DISCLOSURE_SIGN_BASE_URL` defaults to `https://sign.disclosurecomics.com`.
- `DISCLOSURE_SIGN_TIMEOUT_SECONDS` defaults to `30`.

Run the client from this skill's directory or use its absolute path.

## Profile

The profile stores values reused across decisions. Read it with:

```bash
python3 scripts/board_authorization.py profile-get
```

Update it only with approved values:

```bash
python3 scripts/board_authorization.py profile-set --input profile.json
```

`profile.json` is the raw defaults object:

```json
{
  "authorizedOfficerName": "Approved officer name",
  "authorizedOfficerTitle": "Approved title",
  "companyLegalName": "Approved legal entity name",
  "consentMethod": "unanimous written consent",
  "directors": [
    { "email": "director1@example.com", "name": "Director One", "presence": "Consented", "vote": "For" },
    { "email": "director2@example.com", "name": "Director Two", "presence": "Consented", "vote": "For" },
    { "email": "director3@example.com", "name": "Director Three", "presence": "Consented", "vote": "For" }
  ],
  "entityType": "corporation",
  "jurisdiction": "Colorado",
  "resolutionDisposition": "approved unanimously",
  "secretaryName": "Approved secretary name"
}
```

Exactly three directors are required, with distinct valid email addresses. The names and addresses above are placeholders, never production defaults.

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
    "investorCondition": "None",
    "materialsReviewed": [
      "https://example.com/source-document"
    ],
    "matterDescription": "The board considered the proposed transaction.",
    "resolutionTerms": "The transaction and the authorized actions are approved."
  },
  "templateKey": "board_resolution_secretary_certificate"
}
```

Do not include stable profile keys in an ordinary create request. In particular, a person authorized by this specific resolution belongs in `resolutionTerms`, not `authorizedOfficerName`. Change stable profile values only as a separate operation explicitly approved by the user.

```bash
python3 scripts/board_authorization.py create --input request.json
```

The endpoint is idempotent by team and `externalId`. Retrying returns the existing authorization instead of creating a duplicate.

Successful output includes:

- `authorizationId` and `authorizationUrl`
- `envelopeId` and `editorUrl`
- `signerCount` (expected `3`)
- `fieldCount` (expected `6`: signature and date for each director)
- `status`
- `generationError`, normally `null`

The API never sends the envelope and never returns recipient signing tokens.

## Raw Routes

- `POST /api/v2/executive-authorization/create`
- `GET /api/v2/executive-authorization/profile/{templateKey}`
- `PUT /api/v2/executive-authorization/profile/{templateKey}` with body `{ "payloadDefaults": { ... } }`

Treat HTTP failures as failures. If draft creation returns a non-null `generationError`, preserve its `externalId`, report the error and authorization URL, and repair the same record rather than creating another.
