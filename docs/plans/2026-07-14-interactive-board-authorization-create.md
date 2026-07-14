# Interactive Board Authorization Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a safe interactive terminal questionnaire that creates and validates a review-only Board Authorization draft through the existing API client.

**Architecture:** Keep the Bash layer limited to prompting, local input checks, JSON construction, confirmation, and response-contract checks. Reuse a namespaced prompt helper across both terminal questionnaires, while delegating credentials, HTTP, authoritative validation, idempotency, persistence, document generation, and signing-envelope behavior to `board_authorization.py` and the API.

**Tech Stack:** Bash, `jq`, Python `unittest`, existing Board Authorization Python client, Git worktrees.

---

### Task 1: Add Red Interactive-Create Tests

**Files:**
- Modify: `skills/create-board-authorization/scripts/test_board_authorization.py`

**Steps:**

1. Add the create-wrapper path and a runner using the existing mock API environment.
2. Add a complete saved-profile fixture and scripted answers for every variable decision field.
3. Assert `--dry-run` emits only the expected create request, performs one profile GET, and performs no POST.
4. Add tests for exact `CREATE`, cancellation, missing/obsolete profiles, invalid and out-of-order dates, `NOT_APPROVED` restrictions, and a malformed/integrity-invalid create response.
5. Run `python3 skills/create-board-authorization/scripts/test_board_authorization.py` and confirm failure because `create_board_authorization.sh` does not exist.

### Task 2: Extract Shared Prompt Primitives

**Files:**
- Create: `skills/create-board-authorization/scripts/board_authorization_prompts.sh`
- Modify: `skills/create-board-authorization/scripts/configure_board_profile.sh`

**Steps:**

1. Move namespaced failure, cancellation, dependency, trim, required-text, email, and numbered-choice functions into the sourced helper.
2. Add optional-text and yes/no helpers needed by decision creation.
3. Update the profile configurator to source and call the shared functions without changing its prompts, JSON, confirmation, or API behavior.
4. Run Bash syntax checks and the existing suite; all profile-configurator tests must remain green.

### Task 3: Implement The Creation Questionnaire

**Files:**
- Create: `skills/create-board-authorization/scripts/create_board_authorization.sh`

**Steps:**

1. Add `--dry-run` and help handling, dependency checks, signal-safe cancellation, and current-profile loading.
2. Stop before prompting when `exists` is false, `needsUpgrade` is true, or profile defaults are unavailable.
3. Prompt and locally validate action/certificate dates, required decision text, one-or-more materials, optional terms, paired delivery values, explicit ratification, and optional notes.
4. Suggest an editable `board-YYYY-MM-DD-<title-slug>` external ID using a deterministic Python standard-library slug function.
5. For `NOT_APPROVED`, omit delivery values and force `ratifyPriorActions: false`.
6. Build the request exclusively with `jq`; include only `externalId`, `generateDocument`, optional `notes`, and variable decision payload fields.
7. Print dry-run JSON without a create call; otherwise require exact `CREATE` and pipe the JSON to `board_authorization.py create`.
8. Print the response, then verify authorization/envelope/editor identifiers, three signers, nine fields, valid integrity, and null generation/integrity errors. Exit nonzero without retrying when the response contract fails.
9. Run the Python suite until all new and existing tests pass.

### Task 4: Document The Preferred Decision Path

**Files:**
- Modify: `skills/create-board-authorization/SKILL.md`
- Modify: `skills/create-board-authorization/references/api.md`
- Modify: `skills/create-board-authorization/scripts/test_board_authorization.py`

**Steps:**

1. Add failing documentation assertions for `create_board_authorization.sh`, `--dry-run`, exact `CREATE`, idempotent `externalId`, and the no-send boundary.
2. Document the questionnaire as the preferred human decision-entry path while retaining raw JSON for automation.
3. Explain that a successful run creates a database authorization and review envelope but sends no email.
4. Re-run the Python suite and skill validator.

### Task 5: Verify And Publish Modern Source

**Steps:**

1. Run `bash -n` on all three Bash files and ShellCheck when available.
2. Run the complete Python skill suite and skill validator.
3. Run a local mock/dry-run smoke test and confirm no production create call.
4. Run `git diff --check`, inspect the complete diff, and request an independent read-only review.
5. Commit the implementation, push the feature branch, and fast-forward GitHub `main`.

### Task 6: Port And Deploy

**Steps:**

1. Cherry-pick the design, plan, and implementation commits into `deploy/executive-authorization-agent`.
2. Repeat Bash, Python, skill, and dry-run checks in the compatibility worktree.
3. Push the deployment branch and fast-forward the live checkout without touching existing runtime/translation changes.
4. Verify the deployed help and dry-run paths, confirm the saved production profile remains current, and create no authorization during rollout.
5. Append the rollout and exact operator command to `~/docs/executive-assistant/board-authorizations-log.md`.
