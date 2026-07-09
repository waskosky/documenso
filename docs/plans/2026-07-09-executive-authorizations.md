# Executive Authorizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a team-scoped executive authorization log and board-certificate template workflow to `sign.disclosurecomics.com`.

**Architecture:** Store structured authorization records in Documenso's database and render reusable authorization templates from typed payloads. Add authenticated team routes for list, create, and detail views; keep Documenso envelope sending behind a service boundary so later work can plug into internal envelope creation without hardcoding board-specific behavior.

**Tech Stack:** Remix routes, React, Prisma, Zod, TypeScript, Documenso UI primitives, simple `tsx` assertion tests for pure rendering utilities.

---

### Task 1: Guidance And Planning Artifacts

**Files:**

- Modify: `AGENTS.md`
- Create: `docs/plans/2026-07-09-executive-authorizations-design.md`
- Create: `docs/plans/2026-07-09-executive-authorizations.md`

**Steps:**

1. Add an executive-assistant guidance section to `AGENTS.md`.
2. Include the durable logging guidance line.
3. Confirm docs are tracked with `git status --short`.

### Task 2: Template Renderer Test

**Files:**

- Create: `packages/lib/server-only/executive-authorizations/render-authorization-template.test.ts`
- Create: `packages/lib/server-only/executive-authorizations/render-authorization-template.ts`
- Create: `packages/lib/server-only/executive-authorizations/types.ts`
- Create: `packages/lib/server-only/executive-authorizations/templates.ts`

**Steps:**

1. Write a failing `tsx` test that renders the board certificate template from structured payload data.
2. Run:
   `npx tsx packages/lib/server-only/executive-authorizations/render-authorization-template.test.ts`
3. Expected: fail because renderer/types do not exist.
4. Implement minimal generic template registry and renderer.
5. Run the test again and confirm it passes.

### Task 3: Prisma Schema

**Files:**

- Modify: `packages/prisma/schema.prisma`

**Steps:**

1. Add `ExecutiveAuthorizationStatus` and `ExecutiveAuthorizationType` enums.
2. Add `ExecutiveAuthorization` model with team, user, and optional envelope relations.
3. Add relations on `Team`, `User`, and `Envelope`.
4. Run:
   `npm run prisma:generate`
5. Expected: Prisma client generation succeeds.

### Task 4: Server Data Helpers

**Files:**

- Create: `packages/lib/server-only/executive-authorizations/create-executive-authorization.ts`
- Create: `packages/lib/server-only/executive-authorizations/get-executive-authorization.ts`
- Create: `packages/lib/server-only/executive-authorizations/list-executive-authorizations.ts`
- Create: `packages/lib/server-only/executive-authorizations/schema.ts`

**Steps:**

1. Write the Zod schemas for create payloads.
2. Create helpers that validate input, render Markdown, and read/write `ExecutiveAuthorization` records scoped to team/user.
3. Keep helpers generic by template key and payload, not board-specific argument lists.

### Task 5: Team Routes

**Files:**

- Create: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations._index.tsx`
- Create: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.new.tsx`
- Create: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/authorizations.$id.tsx`
- Modify: route navigation helpers if required.

**Steps:**

1. Implement list route with loader data from the server helper.
2. Implement new route with a practical first form for the board certificate.
3. Implement detail route with metadata, signer summary, and rendered Markdown preview.
4. Use existing Documenso UI primitives and team providers.

### Task 6: Verification

**Commands:**

- `npx tsx packages/lib/server-only/executive-authorizations/render-authorization-template.test.ts`
- `npm run prisma:generate`
- `npm run typecheck -w @documenso/remix`

**Expected:**

- Renderer test passes.
- Prisma generation succeeds.
- Remix typecheck succeeds or reports unrelated baseline errors that are documented.

### Task 7: Merge, Commit, Push

**Steps:**

1. Review diff with `git status --short` and `git diff --stat`.
2. Commit scoped changes on `feature/executive-authorizations`.
3. Merge back into `main`.
4. Push `main` to `origin`.
