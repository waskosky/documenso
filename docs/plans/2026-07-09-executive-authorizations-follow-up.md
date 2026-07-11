# Executive Authorizations Follow-Up Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the operational signing workflow for executive authorizations after the first database/template/UI slice lands.

**Architecture:** Keep `ExecutiveAuthorization` as the durable operational record. Generate Documenso signable documents from authorization records, delegate delivery/signing/audit behavior to Documenso, and sync status back into the authorization log through explicit service boundaries and webhook handling.

**Tech Stack:** Remix routes/actions, Prisma, Documenso document/template/envelope services, Documenso mail transport, webhook handlers, TypeScript tests, production SMTP/SES configuration.

## Current Implementation State From 2026-07-09

- Draft executive authorization records can now generate native Documenso document envelopes from the rendered board certificate.
- The generated document is a plain PDF with a dedicated director consent signature page and Documenso signature/date fields.
- The detail page can generate the document, send it through Documenso's normal email/signing flow, refresh signer status manually, and link to the native Documenso document page.
- Draft records are editable through a dedicated edit route; generated/sent records are locked for material edits.
- The remaining soon-next work is webhook-driven status sync and final signed artifact/certificate surfacing, not rebuilding email delivery or signature collection.
- A live smoke test completed all three signer tokens through Documenso's signing UI. Manual refresh correctly moved the authorization log to `COMPLETED` and now derives `completedAt` from the latest signer timestamp when the envelope has not been sealed yet.
- That same smoke test showed the underlying Documenso envelope can remain `PENDING` after all recipients sign, so Priority 4 should investigate the seal/final-artifact job path and make final signed PDFs/certificates first-class on the authorization detail page.

**Seal/final-artifact recovery update from 2026-07-10:**

- Root cause 1 was operational background-job delivery. The local job provider created `BackgroundJob` rows, but `NEXT_PRIVATE_INTERNAL_WEBAPP_URL` pointed at `http://127.0.0.1:3000`; no process was listening there under the Passenger deployment, so self-callbacks never reached `/api/jobs/...`.
- Live was repaired by setting `NEXT_PRIVATE_INTERNAL_WEBAPP_URL=https://sign.disclosurecomics.com` and restarting Passenger. A fresh non-sending smoke `send.recipient.signed.email` job created through `jobs.triggerJob(...)` completed through that HTTPS callback path.
- Root cause 2 was signing-certificate format. The configured `.p12` file and passphrase were readable by OpenSSL, but Documenso's signer library failed with `Failed to get private key bags` against the modern OpenSSL 3 PBES2/AES-256 PKCS#12 export.
- Live was repaired by backing up `certs/signing.p12` and re-exporting it with legacy-compatible PKCS#12 encryption using `openssl pkcs12 -export -legacy ...` and the existing configured passphrase. The new file uses a 3DES shrouded keybag and loads successfully in the seal handler.
- The original smoke authorization `cmre5d6bk0001gpelwlsqwvg1` now has authorization status `COMPLETED`, underlying envelope status `COMPLETED`, `envelope.completedAt=2026-07-10T00:05:49.035Z`, a `DOCUMENT_COMPLETED` audit log, and signed/certified PDF bytes stored in the existing document data row.
- One failed historical seal job remains for audit trail visibility: `cmre5n1oe0021gpelsi7j7y3r` is `FAILED` after the pre-fix attempts. Do not treat that old failed job as the current envelope state; the envelope itself is completed.
- Keep a deployment runbook note: under this Passenger deployment, the local job provider must use a reachable HTTPS internal webapp URL unless a real localhost listener is added. For higher volume production, revisit BullMQ or Inngest rather than relying indefinitely on the local provider.
- Keep a certificate runbook note: when regenerating `certs/signing.p12` with OpenSSL 3, use the legacy-compatible PKCS#12 export path or verify the exact signer library accepts the new format before deploying.

---

## Priority 1: Production Email Delivery

**Findings from 2026-07-09:**

- WordPress sends through the active `wp-offload-ses` plugin, not the inactive `wp-ses` plugin.
- WordPress settings use AWS SES in `us-east-1`, sender `Disclosure Comics <info@disclosurecomics.com>`, return path `info@disclosurecomics.com`, and `send-via-ses=1`.
- Documenso is configured for SMTP auth against `email-smtp.us-west-2.amazonaws.com` with sender `Disclosure Comics <noreply@sign.disclosurecomics.com>`.
- Documenso's current SMTP credentials authenticate successfully, but a real send fails because `noreply@sign.disclosurecomics.com` is not verified in SES `US-WEST-2`.
- Sending through the same Documenso SMTP account as `info@disclosurecomics.com` also fails because that identity is not verified in `US-WEST-2`.
- The WordPress SES credentials can be converted to SMTP credentials for `us-east-1` and authenticate, but a real send fails because AWS reports sending is paused for that account.
- Initial practical read: there was no safe code-level email fix while only `us-east-1` and the old Documenso SMTP account had been tested. The recovery update below supersedes that: the working production path is the WordPress AWS credential set in SES `us-west-2`.

**Recovery update from 2026-07-09:**

- The server does not have the `aws` CLI installed; SES was inspected through the AWS SDK already available in the Documenso/WordPress environment.
- The WordPress SES credentials show `EnforcementStatus=SHUTDOWN` only in `us-east-1`.
- The same WordPress SES credentials show `EnforcementStatus=HEALTHY` in `us-west-2`, with `disclosurecomics.com` verified and DKIM `SUCCESS`.
- A real SMTP send using the WordPress AWS credentials converted to SES SMTP credentials for `us-west-2` succeeded from `Disclosure Comics <info@disclosurecomics.com>`.
- WordPress `wp-offload-ses` was switched from `us-east-1` to `us-west-2`; a post-change `wp_mail()` test logged email `24895` as `sent`.
- Documenso `.env` was switched to the same healthy SES path: `smtp-auth`, `email-smtp.us-west-2.amazonaws.com`, port `465`, sender `Disclosure Comics <info@disclosurecomics.com>`, and the matching SES SMTP/API credentials.
- The `sign.disclosurecomics.com` Passenger Node process was restarted after the `.env` change.
- A deployed Documenso mailer-module test verified SMTP and sent successfully from the repaired configuration.
- Do not move production mail back to SES `us-east-1` unless AWS support clears the shutdown/enforcement state there.

**Files to inspect first:**

- `.env`
- `.env.example`
- `apps/remix/app/**`
- `packages/email/**`
- `packages/lib/**/mail*`
- production deployment environment for `sign.disclosurecomics.com`
- working mail configuration in the main `disclosurecomics.com` WordPress installation

**Work:**

1. Identify the current Documenso mail transport and exact failing behavior.
2. Compare it with the working WordPress mail transport, likely AWS SES or SMTP.
3. In AWS, either verify `sign.disclosurecomics.com` or `info@disclosurecomics.com` in the Documenso SES account/region, or resolve the paused sending state on the WordPress SES account.
4. Configure Documenso through environment variables or a narrow transport adapter; do not hardcode credentials, regions, senders, or board-member addresses.
5. Add `.env.example` documentation for the required mail settings if upstream docs are not sufficient.
6. Send a real test email from the deployed site and capture the result in the durable operations log.

**Done when:**

- Documenso can send a test email from `sign.disclosurecomics.com`.
- The sender domain, reply-to behavior, and bounce/failure logs are known.
- No secrets are committed.

## Priority 2: Generate Signable Documents From Authorization Records

**Files to inspect first:**

- `packages/lib/server-only/executive-authorizations/*`
- existing Documenso document/template creation services
- existing document upload, PDF conversion, and recipient placement code
- Documenso API routes for document creation and sending

**Work:**

1. Add a service that converts `renderedMarkdown` into a signable PDF or Documenso-compatible document artifact.
2. Create recipients from the stored signer array, preserving signing order.
3. Add signature/date/name fields using a reusable placement strategy for the selected authorization template.
4. Link the generated Documenso document/envelope back to `ExecutiveAuthorization.envelopeId` and `ExecutiveAuthorization.envelopeExternalId`.
5. Keep template-specific field placement behind a registry so future authorization types do not require board-specific branching through the app.

**Done when:**

- A saved authorization can generate a Documenso signing instance.
- The generated instance has three director signer slots for the board template.
- The authorization detail page links to the generated signing/admin URLs.

## Priority 3: Send For Signature

**Files to inspect first:**

- existing Documenso send/distribute document actions
- email template code
- recipient notification settings
- team permission helpers

**Work:**

1. Add a detail-page action to send a ready authorization through Documenso's existing send flow.
2. Reuse Documenso's normal email system; do not rebuild delivery, reminders, audit trails, or signing links.
3. Restrict send actions to appropriate team roles.
4. Record `sentAt`, `status=SENT`, signer snapshots, and generated signing URLs when available.

**Done when:**

- A team admin can send one authorization to all required board members.
- Recipients receive Documenso signing emails.
- The authorization record shows when it was sent and where the signing instance lives.

## Priority 4: Status Sync And Final Artifacts

**Files to inspect first:**

- Documenso webhook/event handling
- document completion logic
- audit log and certificate generation code

**Work:**

1. Sync recipient events into the signer JSON status snapshots.
2. Promote authorization status through `SENT`, `PARTIALLY_SIGNED`, `COMPLETED`, `REJECTED`, and `CANCELLED`.
3. Store completion timestamps and links to final signed documents/certificates.
4. Add a manual refresh action if webhook delivery is unavailable or delayed.

**Done when:**

- The authorization detail page reflects signing progress without manual database edits.
- Completed records expose final signed artifacts and audit evidence.

**Current status from 2026-07-10:**

- Manual refresh and the seal path have both been repaired on the live smoke record.
- The underlying Documenso completed envelope now holds the signed PDF/certificate output, so the remaining product work is surfacing those final artifacts directly on the authorization detail page and adding webhook-driven sync so manual refresh is not required.

**Product update from 2026-07-10:**

- The authorization detail page now builds final artifact links from the linked Documenso envelope once the envelope status is `COMPLETED`.
- Completed authorizations expose direct same-site downloads for each signed envelope PDF, the signing certificate PDF, and the audit log PDF.
- Session-authenticated `/api/files/envelope/:envelopeId/certificate/download` and `/api/files/envelope/:envelopeId/audit-log/download` routes were added so artifact links do not require API tokens.
- `syncExecutiveAuthorizationForEnvelope(...)` now updates the authorization record from the envelope recipient/status state.
- The sync service is called after recipient signing, seal completion/rejection, recipient rejection, external/API rejection, and cancellation, so manual refresh remains a fallback rather than the normal path.

## Production Automation Handoff From 2026-07-11

- The generalized board-authorization workflow is deployed at `https://sign.disclosurecomics.com`.
- Board Authorization template v2 is on GitHub `main` through implementation commit `4f48e58`; the deployed Documenso 2.4 compatibility implementation is `818050f`.
- Migration `20260711120000_add_executive_authorization_profiles` is applied, and Prisma reports the live database schema is current.
- The production endpoints are:
  - `POST /api/v2/executive-authorization/create`
  - `GET /api/v2/executive-authorization/profile/{templateKey}`
  - `POST /api/v2/executive-authorization/profile/{templateKey}`
- The team-scoped API token named `Codex Board Authorization Agent` is stored only in hashed form by Documenso. Its one-time client value is in `~/.config/disclosure-sign/api-token` with mode `0600`; do not copy it into a repository, shell history, durable log, or chat response.
- The canonical skill is `skills/create-board-authorization`, installed for agents at `~/.codex/skills/create-board-authorization` as a symlink to the live checkout.
- The skill reads a direct `DISCLOSURE_SIGN_API_TOKEN` first, then `DISCLOSURE_SIGN_API_TOKEN_FILE`, then the private default token file. It uses an explicit agent user-agent because Cloudflare rejects Python urllib's default signature with error 1010.
- The skill API client rejects redirects so bearer credentials cannot be forwarded to another origin. Draft creation never sends and never returns recipient signing tokens.
- Live authenticated browser verification as `mike@disclosurecomics.com` confirmed:
  - authorization index, defaults, and new-authorization routes load without browser, server, or console errors
  - the current template is version 2, with exactly three director slots and nine generated signing fields
  - the defaults form exposes 26 structured controls and the create form exposes 37 controls on desktop and 390px mobile
  - all governance thresholds, controlled vote/presence values, execution-role assignments, and decision fields are present
  - ratification defaults unchecked, defaults flow into the new-record form, and legacy v1 records remain version-bound
  - creation has no automatic send action
  - desktop and 390px mobile layouts have no horizontal overflow or overlapping controls
- The production profile currently returns `exists: false`. Do not configure it until the legal company/officer/secretary defaults and three distinct production director email addresses are explicitly approved. Validation aliases used by earlier smoke tests are not production defaults.
- Known historical authorization `cmreqf4v00004gpzb04o9ma5z` remains `READY`, with envelope `envelope_bmefvkhvoxolyrsr` still `DRAFT`. The current pre-send check blocks it because its generated document identity is not linked to the durable authorization record. Do not send it.
- Sending and editor mutations use the same PostgreSQL advisory lock. A send re-reads status and validates exact document, item, recipient, and field identity while holding that lock; concurrent edits or duplicate sends cannot bypass the check.
- Status synchronization treats the durable three-director signer roster as authoritative and rejects changed, missing, reordered, role-changed, or additional envelope recipients.
- Sending now requires a separately generated `READY` envelope so PDF and field placement review cannot be bypassed by a combined generate-and-send action.
- Human-browser streaming currently leaves a stray `$` text node at the very bottom of Documenso pages because late React stream chunks arrive after the closing HTML tags. A bot request using `onAllReady` does not reproduce it. Treat an adapter/streaming correction as separate, soon follow-up work; evaluate the latency tradeoff before making all human requests wait for `onAllReady`.

**Next operational action:** collect and approve the stable legal entity, governance thresholds, three-director roster, Secretary assignment, and Authorized Officer assignment. Save them through `/t/personal_yhxdhhoozfmdbnbd/authorizations/settings` or the skill's `profile-set`, then create one review-only authorization through the skill and verify `signerCount=3`, `fieldCount=9`, and `integrityValid=true`. Sending remains a separate explicit human action after review.

## Near-Term Future Work: Integration And Export

Keep Documenso and `ExecutiveAuthorization` as replaceable system boundaries rather than coupling agents to one vendor-specific document model.

1. Add read-only query tooling for agents to list authorization records, inspect status, and retrieve final artifact links without exposing recipient tokens.
2. Publish normalized authorization lifecycle events through an outbox/webhook adapter so future accounting, records, project-management, or board-minute systems can subscribe without changing authorization services.
3. Add structured JSON and CSV exports of decision metadata, signer status, external IDs, and artifact references; keep signed PDF and certificate bytes in Documenso rather than duplicating them by default.
4. Add a narrow MCP server only when the target agent platform and authentication boundary are selected. It should call the existing profile/create/query APIs and must retain the no-send default.
5. Add retention, backup, and reconciliation checks for authorization records and linked Documenso envelopes before connecting another system of record.

Do not create a separate integration repository until one of these adapters has an independently deployable lifecycle. If that point is reached, use a private, narrowly scoped repository such as `waskosky/documenso-custom` rather than hardcoding platform-specific logic into the fork.

## Priority 5: Editable Records And Template Expansion

**Files to inspect first:**

- authorization create/detail routes
- template registry
- Documenso field placement code

**Work:**

1. Add edit support for draft records only.
2. Lock material edits after sending unless a revision/cancel-and-resend flow is created.
3. Add a generic template metadata shape for required fields, signer roles, and placement definitions.
4. Add more authorization templates only through the registry.

**Done when:**

- Draft authorizations are editable from the UI.
- Sent/completed authorizations remain auditable and immutable except for notes/status sync fields.
- New templates can be added without changing route-level business logic.
