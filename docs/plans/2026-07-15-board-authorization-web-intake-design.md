# Board Authorization Web Intake Design

**Date:** 2026-07-15

## Objective

Turn the existing manager-only `/authorizations/new` route into the fastest safe way to create a review-ready board authorization from the team's saved defaults. The page must create the durable authorization record, document envelope, three recipients, and nine signing fields without sending email.

## Approved Direction

Use the existing Documenso authorization module and routes. Do not build a separate WordPress form, public intake page, or second application. Access remains authenticated and restricted to team roles with `MANAGE_TEAM`, which currently means owners and managers.

The saved authorization profile is the source of truth for stable facts:

- organization, jurisdiction, and entity type
- action method, disposition, quorum, and approval thresholds
- the three directors and their email addresses
- secretary and authorized-officer assignments

The new page displays those values as a compact read-only summary with a link to Authorization defaults. It does not post them back or allow one-off overrides.

## Decision Intake

The form accepts only facts that vary per decision:

- action date
- certificate date
- action title
- matter description
- reviewed materials, one per line
- specific action
- optional specific terms
- optional paired delivery recipient and condition
- explicit prior-action ratification choice
- optional internal notes

When the saved disposition is `NOT_APPROVED`, the UI omits delivery and ratification controls, and the server forces `ratifyPriorActions` to `false` while omitting delivery fields.

## Creation Workflow

1. The loader verifies the session, team membership, `MANAGE_TEAM`, current template version, and usable profile.
2. The loader creates an opaque `externalId` for idempotency. The form preserves it across validation errors.
3. The action repeats authorization checks and converts only decision fields into the profiled-create request.
4. `createProfiledExecutiveAuthorization` merges the current profile, creates the database record, generates the signing envelope, and checks envelope integrity.
5. The route verifies the expected contract: `READY`, one envelope, exactly three recipients, exactly nine fields, and no generation or integrity error.
6. The browser redirects to the authorization detail page. The detail page identifies a successful review draft or a recoverable generation warning.
7. Sending remains a separate explicit manager action on the detail page. Creating a record never sends email.

If a durable authorization exists but generation or integrity validation fails, the user is redirected to that record instead of being encouraged to submit a duplicate. A retry uses the same stable external ID.

## Interface

The page is a quiet operational form, not a landing page. The profile summary and decision fields use unframed bordered sections, compact responsive grids, standard Documenso controls, and Lucide icons. Missing or outdated defaults block creation and direct the manager to settings.

The detail page adds:

- a creation result alert that explicitly says whether the draft is review-ready
- a reminder that no email was sent
- the durable external reference in Record details

## Extensibility

The route uses the template profile and existing server-only creation service rather than company-specific constants. A focused decision-input builder isolates the web form contract while preserving the existing full form for editing and legacy workflows. Future templates can add their own decision-only adapters without weakening the profile boundary.

## Deferred Work

- Add "Duplicate as new" from an existing authorization after the initial flow is proven.
- Add optional integrations that mirror authorization status into other operational systems.
- Revisit email delivery only after the separate SES investigation is resolved; this feature does not change transport configuration.
