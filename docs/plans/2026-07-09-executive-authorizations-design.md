# Executive Authorizations Design

## Goal

Create a team-scoped executive-assistant workflow inside `sign.disclosurecomics.com` for preparing, sending, and tracking board authorizations and related decision records. Documenso remains the signing engine; the custom layer owns intake, structured record keeping, template rendering, and links back to generated signing envelopes.

## Current Context

- `sign.disclosurecomics.com` is already a live Documenso deployment.
- Documenso already supports reusable templates, recipients, signing links, email distribution, audit logs, API tokens, and webhooks.
- The older WordPress signing plugins under `httpdocs/wp-content/plugins/e-signature` should not be the default for new executive workflows.
- The first template is a board resolution and secretary certificate, but the system should support more authorization templates later.

## Architecture

Add an `Authorizations` area to the existing authenticated team surface. It stores authorization records in the same database as Documenso and links each record to a Documenso envelope when sent for signature. The implementation should keep template definitions, rendering, signers, and status transitions generic enough for future templates and integrations.

## Data Model

Add an `ExecutiveAuthorization` model with:

- team/user ownership.
- title, company name, authorization type, status, action date.
- template key and template version.
- structured payload JSON for form data.
- signer JSON for role/name/email/order/status snapshots.
- rendered Markdown.
- optional generated document/envelope identifiers.
- internal notes and audit timestamps.

Use enums for authorization status and type so UI and future APIs can filter reliably.

## First Template

Seed the board resolution and secretary certificate as a code-defined template:

- key: `board_resolution_secretary_certificate`
- type: `BOARD_RESOLUTION`
- label: `Board Resolution and Secretary Certificate`
- required fields: company, jurisdiction/entity type, action title/date, matter description, reviewed materials, resolution text, officer/secretary details, directors/votes.

The renderer outputs Markdown for preview and later PDF generation. The model stores the source JSON and rendered Markdown so future agents can understand exactly what was sent.

## UI

Add routes under the team area:

- `/t/:teamUrl/authorizations`
- `/t/:teamUrl/authorizations/new`
- `/t/:teamUrl/authorizations/:id`

The first slice should include a list, create form, detail view, and rendered Markdown preview. Later slices can add PDF generation, Documenso envelope creation, webhook-driven status updates, and downloadable final artifacts.

## Guidance

Add this durable guidance to the repository:

> For executive-assistant and operations tasks, proactively keep a durable log of decisions, source documents, signers, sent URLs, status, final artifacts, and follow-up context so future agents can immediately pick up significant system or business workflows.

## Security

All routes are authenticated and team-scoped. Users should only see records for the current team. Sending actions should be limited to team admins in a later permission-hardening slice if the first implementation does not wire send behavior.

## Future Integrations

The authorization record should be the source of operational truth and can later sync to external systems such as a CRM, project tracker, board portal, cloud storage, Slack, email, or a legal document repository.
