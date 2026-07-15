# Board Authorization Web Intake Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a manager-only, decision-only web intake that creates and validates a review-ready board authorization envelope without sending it.

**Architecture:** Refactor the existing team authorization route instead of introducing a second application. A dedicated form-data adapter accepts only variable decision facts, while `createProfiledExecutiveAuthorization` supplies stable profile facts and performs generation and integrity checks. The detail route reports the creation result and remains the sole place for an explicit send action.

**Tech Stack:** React Router framework routes, React, TypeScript, Zod-backed authorization services, Prisma models, Documenso UI primitives, Lucide icons, `tsx` assertion tests, Playwright.

---

### Task 1: Define the decision-only form contract

**Files:**
- Modify: `apps/remix/app/utils/executive-authorizations.test.ts`
- Modify: `apps/remix/app/utils/executive-authorizations.ts`

**Step 1: Write the failing test**

Add assertions that the adapter parses all decision fields, preserves a stable external ID, converts reviewed-material lines to an array, supports paired delivery fields, and never emits profile-backed keys. Add a rejected-disposition case that forces ratification off and omits delivery data.

**Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/tsx apps/remix/app/utils/executive-authorizations.test.ts`

Expected: FAIL because `buildBoardAuthorizationDecisionInputFromFormData` is not exported.

**Step 3: Write minimal implementation**

Add `buildBoardAuthorizationDecisionInputFromFormData(formData, resolutionDisposition)`. Reuse existing string and list parsing helpers. Return `{ externalId, notes, payload }` and include no stable-profile property.

**Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/tsx apps/remix/app/utils/executive-authorizations.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/remix/app/utils/executive-authorizations.ts apps/remix/app/utils/executive-authorizations.test.ts
git commit -m "feat: define board decision intake contract"
```

### Task 2: Add the focused intake form and profile summary

**Files:**
- Create: `apps/remix/app/components/executive-authorizations/board-authorization-decision-form.test.tsx`
- Create: `apps/remix/app/components/executive-authorizations/board-authorization-decision-form.tsx`
- Create: `apps/remix/app/components/executive-authorizations/authorization-profile-summary.test.tsx`
- Create: `apps/remix/app/components/executive-authorizations/authorization-profile-summary.tsx`

**Step 1: Write the failing tests**

Render both components to static markup. Assert that the intake contains the variable field names and hidden external ID but none of the profile field names. Assert that a `NOT_APPROVED` profile suppresses delivery and ratification controls. Assert that the summary renders organization, governance, three directors, secretary, and officer facts.

**Step 2: Run the tests to verify they fail**

Run:

```bash
npm exec -w @documenso/remix -- vite-node --config vite.config.ts app/components/executive-authorizations/board-authorization-decision-form.test.tsx
npm exec -w @documenso/remix -- vite-node --config vite.config.ts app/components/executive-authorizations/authorization-profile-summary.test.tsx
```

Expected: FAIL because the components do not exist.

**Step 3: Write minimal components**

Build an accessible responsive form from the existing authorization field helpers and a compact, read-only definition-list summary. Use stable layout constraints and no nested cards.

**Step 4: Run the tests to verify they pass**

Run the two commands from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/remix/app/components/executive-authorizations
git commit -m "feat: add focused board decision intake"
```

### Task 3: Create and validate the profiled envelope from the route

**Files:**
- Modify: `apps/remix/tests/authorizations-route-structure.test.ts`
- Modify: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.new.tsx`

**Step 1: Write the failing route-structure assertions**

Assert that the route uses `createProfiledExecutiveAuthorization`, the decision-only adapter, the profile summary, and request metadata; assert that it does not call `createExecutiveAuthorization`, render `BoardAuthorizationForm`, or invoke sending.

**Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/tsx apps/remix/tests/authorizations-route-structure.test.ts`

Expected: FAIL on the new route architecture assertions.

**Step 3: Implement the route**

Generate a UUID-based external reference in the loader, block a missing/outdated profile, and preserve the reference through action errors. In the action, parse decision-only input, call the profiled creator with session audit metadata, count recipients and actual fields, then redirect to detail with `created=ready` or `created=review`. Never send.

**Step 4: Run route and focused tests**

Run:

```bash
node_modules/.bin/tsx apps/remix/tests/authorizations-route-structure.test.ts
node_modules/.bin/tsx apps/remix/app/utils/executive-authorizations.test.ts
node_modules/.bin/tsx packages/lib/server-only/executive-authorizations/create-profiled-executive-authorization.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/remix/app/routes/_authenticated+/t.\$teamUrl+/authorizations.new.tsx apps/remix/tests/authorizations-route-structure.test.ts
git commit -m "feat: generate board authorization review drafts"
```

### Task 4: Make creation state explicit on the review page

**Files:**
- Modify: `apps/remix/tests/authorizations-route-structure.test.ts`
- Modify: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.$id._index.tsx`

**Step 1: Write the failing assertions**

Assert that the detail loader exposes `externalId` and parses the `created` query parameter, and that the page contains explicit no-email-sent review guidance.

**Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/tsx apps/remix/tests/authorizations-route-structure.test.ts`

Expected: FAIL on detail result-state assertions.

**Step 3: Implement the review state**

Return the external reference and a constrained creation state from the loader. Render success or warning alerts from actual record status plus the query state, and add the reference to Record details. Keep send as an explicit existing action.

**Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/tsx apps/remix/tests/authorizations-route-structure.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/remix/app/routes/_authenticated+/t.\$teamUrl+/authorizations.\$id._index.tsx apps/remix/tests/authorizations-route-structure.test.ts
git commit -m "feat: clarify board authorization review state"
```

### Task 5: Verify, review, publish, and deploy

**Files:**
- Modify: `docs/executive-assistant/board-authorizations-log.md`

**Step 1: Run focused verification**

Run all executive-authorization assertion tests, route-generation/type checks, formatter/linter checks for touched files, and the relevant build command.

Expected: all checks pass with no newly introduced diagnostics.

**Step 2: Review the diff**

Check permission enforcement, profile isolation, idempotency, no-send behavior, error recovery, localization conventions, responsive layout, and unrelated-file preservation.

**Step 3: Verify UI**

Start the application using the repository's established command. Capture authenticated desktop and mobile Playwright screenshots, verify no overlap, and confirm a missing-permission account cannot open the route. Do not create a production authorization merely for visual testing.

**Step 4: Publish source**

Push the feature commit range to `https://github.com/waskosky/documenso`, then fast-forward `origin/main` as approved.

**Step 5: Deploy**

Port the source commits to the deployment branch, run its checks/build, push it, fast-forward the live checkout without disturbing unrelated changes, and restart through the established process.

**Step 6: Verify production and log it**

Test the authenticated production routes at desktop and mobile widths, verify no request sends email on create, and append the route, commits, validation evidence, and follow-up state to `docs/executive-assistant/board-authorizations-log.md`.
