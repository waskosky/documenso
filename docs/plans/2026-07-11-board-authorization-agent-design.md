# Board Authorization Agent Design

## Goal

Let an executive-assistant agent turn structured decision details into a logged, editable, ready-to-review Documenso board authorization without re-entering stable company or board information. Sending remains a separate explicit action.

## Confirmed Signing Model

The board resolution and secretary certificate has exactly three signing recipients. Each director receives one signature field and one signing-date field. The Secretary and Authorized Officer lines do not create additional signing requirements.

Decision facts are prefilled into the generated PDF from the authorization record. Directors do not re-enter company, resolution, vote, officer, or certificate data while signing.

## Current State

The authorization workflow already stores structured payloads, renders a PDF, creates a Documenso envelope, adds six fields from template metadata, sends through Documenso, synchronizes status, and exposes final artifacts.

The inspected production validation envelope has all six expected fields. It also demonstrates an integrity risk: the rendered PDF names validation directors while the envelope recipients were later changed to real people. The system must reject sending whenever the authorization roster, envelope recipients, or required fields no longer agree.

## Architecture

Keep `ExecutiveAuthorization` as the durable decision record and Documenso as the signing engine. Add four narrowly scoped capabilities:

1. A team- and template-scoped reusable profile containing stable payload defaults.
2. Template-driven signer validation and form slot generation.
3. An authenticated API v2 route that creates an authorization record and, by default, its ready-to-review envelope.
4. A project skill that collects user input and calls the API through a deterministic script.

The API is the reusable boundary. A future MCP server can wrap it without changing authorization rendering, persistence, validation, or envelope creation.

## Reusable Profile

Add a generic `ExecutiveAuthorizationProfile` record keyed by team and template. Store validated partial payload defaults as JSON rather than board-specific columns. For the first template, the profile contains stable values such as:

- company legal name, jurisdiction, and entity type;
- consent method and normal resolution disposition;
- secretary and authorized officer details;
- the three-director roster, including names, emails, presence, and default votes.

Action-specific facts such as title, date, matter, reviewed materials, resolution terms, and investor or closing condition remain request data. Request values override profile defaults, and the fully merged payload must pass the template's complete schema before anything is stored.

The Authorizations UI gets a profile settings page. The normal create form loads those defaults but remains editable for exceptional decisions.

## API

Expose API-token-authenticated endpoints through the existing v2 OpenAPI/tRPC surface:

- read and update the current team's profile for a template;
- create a draft authorization from decision data and profile defaults.

Creation accepts an idempotency key so agent retries cannot create duplicate board records. It stores the authorization first and then generates the Documenso envelope. A generation failure leaves an auditable draft that can be repaired rather than silently losing the decision.

The response includes the authorization ID and URL, status, envelope ID, editor URL, signer count, and field count. It does not send email and does not expose signing tokens.

## Integrity And Sending

Before sending, compare the stored authorization signers with envelope recipients and verify each signer has the template-required fields. Normalize names and emails for comparison while preserving display values. Reject sending with a specific error if recipients, order, field type, field count, or field placement no longer match the template-generated plan.

This check makes the currently mismatched validation envelope unsendable without deleting historical data. A correct document must be regenerated from a consistent authorization record.

## Agent Skill

Create a concise `create-board-authorization` skill with:

- the required conversational intake workflow;
- a reference describing the template payload and API response;
- a deterministic command-line script for profile and authorization API calls;
- an explicit rule to create and verify drafts but never send unless the user separately requests sending;
- the durable logging guidance required for executive-assistant work.

Keep API tokens in environment variables. Do not store credentials, signer data, or generated signing URLs in the skill source.

## Error Handling

- Missing profile defaults or decision fields return precise validation errors.
- Invalid signer counts are rejected using template metadata.
- Duplicate idempotency keys return the existing record.
- Envelope generation errors preserve the draft and return its URL for recovery.
- Pre-send integrity failures identify the inconsistent recipient or field requirement.

## Verification

Use test-driven coverage for profile merging, signer counts, idempotency, response URL construction, and envelope integrity. Validate the skill folder and exercise its script against a non-sending production draft. Use Playwright under Mike's account to confirm the profile UI, generated envelope, three recipients, six fields, and absence of unexpected browser/network errors.

## Non-Goals

- Rebuilding Documenso email, reminders, signing, certificates, or audit logs.
- Sending automatically during intake or creation.
- Returning recipient signing tokens from the automation API.
- Building an MCP server before the stable API and skill have been exercised in real use.
