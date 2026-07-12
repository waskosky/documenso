---
name: create-board-authorization
description: Use when a user asks to create, prepare, record, or revise a Board Resolution, Board Consent, Secretary Certificate, or other board authorization in the Disclosure Comics signing system.
---

# Create Board Authorization

Create a logged Documenso authorization draft from decision facts. The API creates a reviewable draft and signing envelope; it does not send the envelope.

## Workflow

1. Read `references/api.md` before the first API operation in a session.
2. Get the current profile with `scripts/board_authorization.py profile-get`. Do not create a draft when `exists` is false or `needsUpgrade` is true. Stable organization, governance thresholds, officer, secretary, and three-director details come from this profile. Update it only with values explicitly approved by the user. For human-assisted setup, prefer `scripts/configure_board_profile.sh`: first run it with `--dry-run`, then run it without that flag and type the exact confirmation `SAVE` only after reviewing the preview. Existing values become prompt defaults. Use `--blank` only when intentionally ignoring those defaults for one run. Profile setup does not create or send an envelope.
3. Gather the variable decision facts:
   - `actionDate` (prefer `YYYY-MM-DD`)
   - `certificateDate` (prefer `YYYY-MM-DD`; it must not precede `actionDate`)
   - `actionTitle`
   - `matterDescription`
   - `materialsReviewed` (an array, including source-document names or URLs)
   - `specificAction`
   - optional `specificTerms`
   - optional `deliveryRecipient` and `deliveryCondition` (provide both or neither)
   - `ratifyPriorActions` (required boolean; use `true` only after explicit confirmation)
   - optional `notes`
     Ordinary create payloads must contain only these decision fields. Do not override profile-backed organization, governance, officer, secretary, director, action-method, or disposition values. A person or entity specific to this decision belongs in `specificAction`, `specificTerms`, or the paired delivery fields; it is not a profile change.
     When the profile disposition is `NOT_APPROVED`, `ratifyPriorActions` must be `false` and the delivery fields must be omitted.
4. Resolve material ambiguity before creation. Do not invent decision terms, dates, reviewed materials, conditions, people, or email addresses.
5. Build a stable, unique `externalId`. Prefer `board-YYYY-MM-DD-<short-subject>`; reuse the same value when retrying the same decision.
6. Create the draft with `scripts/board_authorization.py create --input REQUEST.json` or pipe the JSON over standard input.
7. Confirm the response has exactly three signers, nine actual fields, an envelope ID, `integrityValid: true`, and no `generationError` or `integrityError`. Give the user the authorization and editor URLs for review.

Do not send, expose recipient signing URLs/tokens, or claim approval. Sending remains a separate, explicit human action after the generated READY envelope has been reviewed.

## Durable Log

Proactively append significant, reusable facts to `~/docs/executive-assistant/board-authorizations-log.md`: source documents, decision summary, `externalId`, authorization/envelope IDs, review URLs, status, profile changes, and follow-up. Keep it concise. Never log API tokens, recipient signing URLs/tokens, or unnecessary sensitive content. This log lets future agents resume work without reconstructing system history.

## Failure Handling

An API error means no success. A non-null `generationError` means the authorization record exists but the envelope needs repair or regeneration. A non-null `integrityError` or false `integrityValid` means the envelope does not match the durable authorization record. Report the recoverable authorization URL and error; do not retry with a new `externalId`.
