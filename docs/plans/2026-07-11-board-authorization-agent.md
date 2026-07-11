# Board Authorization Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a profile-backed, API-accessible board authorization workflow that always generates three director signature/date pairs, preserves a durable decision record, and can be operated safely by a Codex skill.

**Architecture:** Store reusable defaults in a generic team/template profile, merge them with decision-specific API or form input, and validate the complete payload through the template registry. Expose creation through the existing authenticated API v2/tRPC surface, keep sending separate, and reject any envelope whose recipients or fields diverge from the authorization record before sending.

**Tech Stack:** Prisma/PostgreSQL, TypeScript, Zod, Remix/React Router, tRPC OpenAPI v2, Documenso envelope services, Codex skills, Node/Python script tests, Playwright.

---

### Task 1: Persist Generic Authorization Profiles And Idempotency Keys

**Files:**
- Modify: `packages/prisma/schema.prisma`
- Create: `packages/prisma/migrations/20260711120000_add_executive_authorization_profiles/migration.sql`
- Modify: `packages/lib/server-only/executive-authorizations/schema.ts`
- Modify: `packages/lib/server-only/executive-authorizations/create-executive-authorization.ts`
- Create: `packages/lib/server-only/executive-authorizations/profile-payload.ts`
- Create: `packages/lib/server-only/executive-authorizations/profile-payload.test.ts`
- Create: `packages/lib/server-only/executive-authorizations/get-executive-authorization-profile.ts`
- Create: `packages/lib/server-only/executive-authorizations/upsert-executive-authorization-profile.ts`

**Step 1: Write failing profile merge tests**

Cover these behaviors with real template schemas:

```ts
const payload = mergeAuthorizationProfilePayload({
  templateKey: 'board_resolution_secretary_certificate',
  profilePayload: stableBoardDefaults,
  payload: decisionFields,
});

assert.equal(payload.companyLegalName, stableBoardDefaults.companyLegalName);
assert.equal(payload.actionTitle, decisionFields.actionTitle);
assert.equal(payload.directors.length, 3);
```

Also assert that request overrides win and incomplete merged payloads fail validation.

**Step 2: Run the test and verify RED**

Run: `npx tsx packages/lib/server-only/executive-authorizations/profile-payload.test.ts`

Expected: FAIL because the profile merge helper does not exist.

**Step 3: Add the generic data model**

Add `ExecutiveAuthorizationProfile` with `teamId`, `templateKey`, `templateVersion`, `payloadDefaults`, timestamps, and `@@unique([teamId, templateKey])`. Add `externalId String?` and `@@unique([teamId, externalId])` to `ExecutiveAuthorization` for retry-safe agent calls. Add the corresponding team relation and SQL migration.

**Step 4: Implement validated profile parsing and merging**

Use a template-keyed profile schema map. The board profile accepts only stable fields and requires exactly the template-defined director count. Merge objects shallowly, let request values override profile values, then call `parseAuthorizationTemplatePayload` on the complete result.

**Step 5: Add scoped profile read/upsert services**

All reads and writes must include `teamId` and `templateKey`. Validate before storing and persist the current template version.

**Step 6: Extend authorization creation for `externalId`**

Accept the optional key through the create schema and persistence layer. On a duplicate team/key request, return the existing authorization rather than creating another record.

**Step 7: Verify GREEN and generate Prisma**

Run:

```bash
npx tsx packages/lib/server-only/executive-authorizations/profile-payload.test.ts
npm run prisma:generate
```

Expected: PASS and Prisma client generation exits 0.

**Step 8: Commit**

```bash
git add packages/prisma packages/lib/server-only/executive-authorizations
git commit -m "feat: add reusable authorization profiles"
```

### Task 2: Derive Signer Counts And Form Slots From Template Metadata

**Files:**
- Create: `packages/lib/server-only/executive-authorizations/validate-template-signers.ts`
- Create: `packages/lib/server-only/executive-authorizations/validate-template-signers.test.ts`
- Modify: `packages/lib/server-only/executive-authorizations/prepare-executive-authorization.ts`
- Modify: `apps/remix/app/components/executive-authorizations/board-authorization-form.tsx`
- Modify: `apps/remix/app/utils/executive-authorizations.ts`
- Modify: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.new.tsx`
- Modify: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.$id.edit.tsx`
- Modify: `apps/remix/tests/authorizations-route-structure.test.ts`

**Step 1: Write failing signer validation tests**

Assert that the board template accepts exactly three `Director` signers and rejects one, two, four, missing email addresses, and unexpected roles with useful messages.

**Step 2: Run and verify RED**

Run: `npx tsx packages/lib/server-only/executive-authorizations/validate-template-signers.test.ts`

Expected: FAIL because validation is not implemented.

**Step 3: Implement metadata-driven validation**

Count rendered signers by normalized role and enforce each `signerRoles` entry's `minCount`, `maxCount`, and required email/name values. Invoke it from `prepareExecutiveAuthorizationRecord` after rendering.

**Step 4: Replace hardcoded signer slots in create/edit flows**

Load `template.signing.signerRoles` in each route, pass the metadata to the form, and generate input names and signer cards from the role counts. Pass the same metadata to the FormData parser so UI and server parsing cannot drift.

**Step 5: Verify GREEN**

Run:

```bash
npx tsx packages/lib/server-only/executive-authorizations/validate-template-signers.test.ts
npx tsx packages/lib/server-only/executive-authorizations/prepare-executive-authorization.test.ts
npx tsx apps/remix/tests/authorizations-route-structure.test.ts
```

Expected: all commands PASS.

**Step 6: Commit**

```bash
git add packages/lib/server-only/executive-authorizations apps/remix/app apps/remix/tests
git commit -m "refactor: derive authorization signers from template metadata"
```

### Task 3: Add The Team Profile Settings Interface

**Files:**
- Create: `apps/remix/app/components/executive-authorizations/authorization-profile-form.tsx`
- Create: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.settings.tsx`
- Modify: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations._index.tsx`
- Modify: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.new.tsx`
- Modify: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.$id._layout.tsx`
- Modify: `apps/remix/tests/authorizations-route-structure.test.ts`

**Step 1: Extend the route structure test and verify RED**

Require the settings route and assert the new route does not shadow authorization detail children.

Run: `npx tsx apps/remix/tests/authorizations-route-structure.test.ts`

Expected: FAIL because the settings route is absent.

**Step 2: Implement profile settings loader/action**

Require an authenticated team manager, load the board profile, and upsert only validated stable defaults. Do not place API credentials or sending controls on this page.

**Step 3: Build the profile form**

Use normal inputs for company/officer values and template-derived signer cards for the three directors. Reuse existing field primitives and keep the interface operational and compact.

**Step 4: Prefill new authorizations**

Add a loader to the new route and pass profile defaults into `BoardAuthorizationForm`. Decision-specific fields remain blank.

**Step 5: Verify**

Run the route test and `npm run build -w @documenso/remix`.

Expected: route test PASS and build exits 0.

**Step 6: Commit**

```bash
git add apps/remix
git commit -m "feat: add authorization profile settings"
```

### Task 4: Add The Idempotent API V2 Creation Boundary

**Files:**
- Create: `packages/lib/server-only/executive-authorizations/create-profiled-executive-authorization.ts`
- Create: `packages/lib/server-only/executive-authorizations/create-profiled-executive-authorization.test.ts`
- Create: `packages/trpc/server/executive-authorization-router/create-authorization.types.ts`
- Create: `packages/trpc/server/executive-authorization-router/create-authorization.ts`
- Create: `packages/trpc/server/executive-authorization-router/profile.types.ts`
- Create: `packages/trpc/server/executive-authorization-router/get-profile.ts`
- Create: `packages/trpc/server/executive-authorization-router/update-profile.ts`
- Create: `packages/trpc/server/executive-authorization-router/router.ts`
- Modify: `packages/trpc/server/router.ts`

**Step 1: Write failing orchestration tests**

Test with injected persistence/envelope dependencies so the real profile merge and response mapping run without a database. Cover profile merging, `generateDocument=true`, generation failure preserving the draft result, and duplicate idempotency returning the original record.

**Step 2: Run and verify RED**

Run: `npx tsx packages/lib/server-only/executive-authorizations/create-profiled-executive-authorization.test.ts`

Expected: FAIL because the orchestration service does not exist.

**Step 3: Implement the orchestration service**

Create the authorization from merged data, generate its envelope when requested, and return a transport-neutral result. Never invoke `sendExecutiveAuthorization` here.

**Step 4: Add OpenAPI-enabled tRPC routes**

Use `authenticatedProcedure`, API token context, `getTeamById`, and `canExecuteTeamAction('MANAGE_TEAM', ...)`. Expose:

```text
GET   /api/v2/executive-authorization/profile/{templateKey}
POST  /api/v2/executive-authorization/profile/{templateKey}
POST  /api/v2/executive-authorization/create
```

Creation returns authorization/editor URLs and counts, but no recipient tokens. Default `generateDocument` to true.

**Step 5: Register the router and verify OpenAPI generation**

Run the focused test, TypeScript build, and inspect the generated OpenAPI JSON for all three paths.

**Step 6: Commit**

```bash
git add packages/lib/server-only/executive-authorizations packages/trpc/server
git commit -m "feat: expose board authorization automation api"
```

### Task 5: Block Mismatched Envelopes Before Sending

**Files:**
- Create: `packages/lib/server-only/executive-authorizations/assert-authorization-envelope-integrity.ts`
- Create: `packages/lib/server-only/executive-authorizations/assert-authorization-envelope-integrity.test.ts`
- Modify: `packages/lib/server-only/executive-authorizations/send-executive-authorization.ts`

**Step 1: Write failing integrity tests**

Build a valid three-recipient/six-field fixture and assert it passes. Independently mutate recipient name, email, order, field type, field count, page, and coordinates and assert each case fails before sending.

**Step 2: Run and verify RED**

Run: `npx tsx packages/lib/server-only/executive-authorizations/assert-authorization-envelope-integrity.test.ts`

Expected: FAIL because the assertion helper does not exist.

**Step 3: Implement and wire the guard**

Normalize comparison values, derive the expected plan from template metadata, and produce a specific `INVALID_REQUEST` message. Load recipients and fields in `sendExecutiveAuthorization`, run the assertion immediately before `sendDocument`, and leave the authorization/envelope unchanged on failure.

**Step 4: Verify against the known production mismatch without sending**

Run the pure test suite and a read-only production diagnostic against `envelope_bmefvkhvoxolyrsr`. Expected: tests PASS and the diagnostic reports a roster mismatch.

**Step 5: Commit**

```bash
git add packages/lib/server-only/executive-authorizations
git commit -m "fix: reject inconsistent authorization envelopes"
```

### Task 6: Create And Validate The Codex Skill

**Files:**
- Create: `skills/create-board-authorization/SKILL.md`
- Create: `skills/create-board-authorization/agents/openai.yaml`
- Create: `skills/create-board-authorization/references/api.md`
- Create: `skills/create-board-authorization/scripts/board_authorization.py`
- Create: `skills/create-board-authorization/scripts/test_board_authorization.py`

**Step 1: Initialize the skill**

Use the skill creator's `init_skill.py` with `scripts,references` and generated interface metadata. Do not add README or duplicate documentation.

**Step 2: Write the script test first and verify RED**

Use a local HTTP test server to assert authorization headers, endpoint paths, JSON bodies, error handling, and secret redaction. Do not call production in this test.

**Step 3: Implement the deterministic client**

Support `profile-get`, `profile-set`, and `create`. Read the base URL and API token from environment variables, accept JSON from a file or stdin, and emit machine-readable JSON.

**Step 4: Write concise skill guidance**

Require the agent to collect missing decision facts, summarize before creation, use an idempotency key, create and verify a draft, log the returned identifiers, and never send without a separate explicit instruction. Include the general executive-assistant rule to proactively preserve durable context for future agents.

**Step 5: Validate**

Run:

```bash
python3 skills/create-board-authorization/scripts/test_board_authorization.py
python3 /var/www/vhosts/disclosurecomics.com/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/create-board-authorization
```

Expected: both commands PASS.

**Step 6: Commit**

```bash
git add skills/create-board-authorization
git commit -m "feat: add board authorization agent skill"
```

### Task 7: Full Verification, Deployment, And Live Non-Sending Exercise

**Files:**
- Modify: `docs/plans/2026-07-09-executive-authorizations-follow-up.md`
- Modify: deployment checkout equivalents of all changed files

**Step 1: Run the complete focused test set**

Run every executive authorization test, route structure test, skill test, Prisma validation/generation, `git diff --check`, and the Remix production build.

**Step 2: Review the diff against requirements**

Confirm: three signers, six fields, profile-backed defaults, idempotent API, no automatic send, no leaked tokens/secrets, and durable identifiers in responses.

**Step 3: Fast-forward the source branch to origin**

Push the feature branch and fast-forward `origin/main` only after verification. Preserve the divergent live checkout history.

**Step 4: Mirror the verified patch to the live 2.4 deployment**

Apply compatibility adaptations without touching the known translation/runtime noise. Regenerate Prisma, apply the additive migration, build, commit the live deployment patch locally, and restart Passenger.

**Step 5: Install the skill for future agents**

Link the deployed canonical skill into `/var/www/vhosts/disclosurecomics.com/.codex/skills/create-board-authorization` and re-run skill validation through that installed path.

**Step 6: Configure the initial team profile**

Use Mike's authenticated profile UI or API. Do not infer production board emails from the validation aliases; retain user-approved values only.

**Step 7: Exercise the live API without sending**

Create one clearly labeled non-sending validation authorization through the skill/API, verify the returned URLs, and inspect the editor with Playwright. Assert three recipients, six fields, matching PDF roster, no email delivery, no console errors, and no failed application requests.

**Step 8: Record operations context**

Update the follow-up plan with endpoint paths, skill location, profile ownership, deployment commit IDs, migration result, validation record IDs, and the explicit-send rule.

**Step 9: Final commit and push**

Commit the operations note, push the feature branch and `origin/main`, and report source/live commit IDs plus exact verification evidence.
