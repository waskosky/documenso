---
name: create-board-authorization
description: Use when a user asks to create, prepare, record, or revise a Board Resolution, Board Consent, Secretary Certificate, or other board authorization in the Disclosure Comics signing system.
---

# Create Board Authorization

Create a logged Documenso authorization draft from decision facts. The API creates a reviewable draft and signing envelope; it does not send the envelope.

## Workflow

1. Read `references/api.md` before the first API operation in a session.
2. Get the current profile with `scripts/board_authorization.py profile-get`. Stable company, officer, and three-director details come from this profile. Update it only when the user explicitly changes those defaults.
3. Gather the variable decision facts:
   - `actionDate` (prefer `YYYY-MM-DD`)
   - `actionTitle`
   - `matterDescription`
   - `materialsReviewed` (an array, including source-document names or URLs)
   - `resolutionTerms`
   - `investorCondition` (use a clear statement such as `None` only when the user confirms none applies)
   - optional `notes`
   Ordinary create payloads must contain only these decision fields. Do not override profile-backed company, officer, secretary, director, jurisdiction, consent, or disposition values. A person named in the authorized action belongs in `resolutionTerms`; it is not a profile change.
4. Resolve material ambiguity before creation. Do not invent decision terms, dates, reviewed materials, conditions, people, or email addresses.
5. Build a stable, unique `externalId`. Prefer `board-YYYY-MM-DD-<short-subject>`; reuse the same value when retrying the same decision.
6. Create the draft with `scripts/board_authorization.py create --input REQUEST.json` or pipe the JSON over standard input.
7. Confirm the response has three signers, six actual fields, an envelope ID, `integrityValid: true`, and no `generationError` or `integrityError`. Give the user the authorization and editor URLs for review.

Do not send, expose recipient signing URLs/tokens, or claim approval. Sending remains a separate, explicit human action after review.

## Durable Log

Proactively append significant, reusable facts to `~/docs/executive-assistant/board-authorizations-log.md`: source documents, decision summary, `externalId`, authorization/envelope IDs, review URLs, status, profile changes, and follow-up. Keep it concise. Never log API tokens, recipient signing URLs/tokens, or unnecessary sensitive content. This log lets future agents resume work without reconstructing system history.

## Failure Handling

An API error means no success. A non-null `generationError` means the authorization record exists but the envelope needs repair or regeneration. A non-null `integrityError` or false `integrityValid` means the envelope does not match the durable authorization record. Report the recoverable authorization URL and error; do not retry with a new `externalId`.
