# Executive Authorizations Follow-Up Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the operational signing workflow for executive authorizations after the first database/template/UI slice lands.

**Architecture:** Keep `ExecutiveAuthorization` as the durable operational record. Generate Documenso signable documents from authorization records, delegate delivery/signing/audit behavior to Documenso, and sync status back into the authorization log through explicit service boundaries and webhook handling.

**Tech Stack:** Remix routes/actions, Prisma, Documenso document/template/envelope services, Documenso mail transport, webhook handlers, TypeScript tests, production SMTP/SES configuration.

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
