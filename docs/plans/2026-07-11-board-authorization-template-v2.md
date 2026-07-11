# Board Authorization Template V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the complete Board Resolution and Secretary's Certificate as a version-2 structured record and nine-field, three-recipient signing envelope.

**Architecture:** Preserve the registered version-1 renderer and field plan. Add a strict version-2 payload/profile schema, renderer, generic signer execution roles, and a redesigned execution page; route UI, API automation, and the installed skill through the current version while stored records continue resolving by `templateVersion`.

**Tech Stack:** TypeScript, Zod, Remix/React Router, Prisma JSON records, pdf-lib, Documenso envelope services, Python skill client, Playwright.

---

### Task 1: Lock The Versioned Data Contract

**Files:**
- Modify: `packages/lib/server-only/executive-authorizations/schema.ts`
- Modify: `packages/lib/server-only/executive-authorizations/types.ts`
- Test: `packages/lib/server-only/executive-authorizations/create-executive-authorization.test.ts`
- Test: `packages/lib/server-only/executive-authorizations/profile-payload.test.ts`

1. Add failing tests for all version-2 fields, enums, exactly three directors, paired delivery fields, and valid director assignment indexes.
2. Run both assertion scripts and confirm failures are caused by missing version-2 support.
3. Implement strict version-1 and version-2 payload/profile schemas and version-aware parsing.
4. Run the focused scripts and typecheck; commit the data contract.

### Task 2: Preserve V1 And Render Complete V2 Text

**Files:**
- Modify: `packages/lib/server-only/executive-authorizations/templates.ts`
- Modify: `packages/lib/server-only/executive-authorizations/render-authorization-template.ts`
- Test: `packages/lib/server-only/executive-authorizations/render-authorization-template.test.ts`
- Test: `packages/lib/server-only/executive-authorizations/templates-metadata.test.ts`

1. Add failing snapshots/assertions for exact governance wording, action method, split action/terms, conditional delivery and ratification clauses, certificate date, controlled vote rollups, and no blank/duplicate signature blocks.
2. Verify version 1 still renders its original output by explicit version lookup.
3. Register version 2 as current and implement its renderer without changing version 1.
4. Run focused tests and commit the renderer.

### Task 3: Build The Three-Recipient/Nine-Field Envelope

**Files:**
- Modify: `packages/lib/server-only/executive-authorizations/types.ts`
- Modify: `packages/lib/server-only/executive-authorizations/stored-signers.ts`
- Modify: `packages/lib/server-only/executive-authorizations/generate-authorization-pdf.ts`
- Modify: `packages/lib/server-only/executive-authorizations/build-authorization-envelope-plan.ts`
- Modify: `packages/lib/server-only/executive-authorizations/assert-authorization-envelope-integrity.ts`
- Test: corresponding `*.test.ts` files in the same directory

1. Add failing checks for Secretary/Officer execution-role preservation and exact field ownership/coordinates.
2. Add generic execution-role targeting to signer metadata and template field placements.
3. Render one version-2 execution page with three director rows plus Secretary and Officer rows.
4. Sort integrity fields deterministically by type/page/coordinates and validate all nine fields.
5. Run unit and live PostgreSQL advisory-lock integration checks; commit the signing contract.

### Task 4: Update Profile, Create, And Edit Workflows

**Files:**
- Modify: `packages/lib/server-only/executive-authorizations/profile-payload.ts`
- Modify: `packages/lib/server-only/executive-authorizations/create-profiled-executive-authorization.ts`
- Modify: `apps/remix/app/utils/executive-authorizations.ts`
- Modify: `apps/remix/app/components/executive-authorizations/authorization-profile-form.tsx`
- Modify: `apps/remix/app/components/executive-authorizations/board-authorization-form.tsx`
- Modify: authorization settings/new/edit routes
- Test: associated profile/form/route tests

1. Add failing form-parser and rendered-form assertions for every new field and control.
2. Implement version-aware profile handling and require a reviewed version-2 profile for API automation.
3. Add select, checkbox, date, governance, role-assignment, and optional delivery controls to defaults/create/edit forms.
4. Keep all controls metadata-driven where signer counts or field roles come from the template.
5. Run component scripts through Vite, route tests, and Remix typecheck; commit the workflows.

### Task 5: Update API And Agent Skill

**Files:**
- Modify: `packages/trpc/server/executive-authorization-router/*.ts`
- Modify: `skills/create-board-authorization/SKILL.md`
- Modify: `skills/create-board-authorization/references/api.md`
- Modify: `skills/create-board-authorization/scripts/test_board_authorization.py`

1. Add failing API-schema and Python tests for the new decision payload and nine-field expectation.
2. Expose profile upgrade state and reject creation from stale defaults without creating a record.
3. Update skill guidance/examples; keep redirect rejection, private token loading, stable `externalId`, durable logging, and no-send rules.
4. Run API scripts, seven-plus Python tests, and skill validation; commit automation updates.

### Task 6: Verify, Review, Port, And Deploy

**Files:**
- Update: `docs/plans/2026-07-09-executive-authorizations-follow-up.md`
- Update: `~/docs/executive-assistant/board-authorizations-log.md`

1. Run all executive-authorization assertion scripts, component tests, Python tests, database lock integration, diff checks, and the full modern build.
2. Perform an independent code review and address correctness or compatibility findings with tests first.
3. Cherry-pick/adapt commits into `deploy/executive-authorization-agent`, run legacy-specific mutation-lock tests, typecheck, and full production build.
4. Push modern feature/main and the deployment branch; fast-forward the live checkout and copy verified build artifacts.
5. Restart Passenger and verify health, OpenAPI, authenticated desktop/mobile forms, exactly three recipients/nine fields in a non-production fixture, and no send action.
6. Remove temporary sessions/artifacts, update durable handoff notes, and report the remaining approved-profile input only.

