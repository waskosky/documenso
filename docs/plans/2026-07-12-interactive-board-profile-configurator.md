# Interactive Board Profile Configurator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a safe interactive terminal questionnaire that previews and saves the complete Board Authorization version-2 profile through the existing API client.

**Architecture:** Keep the Bash layer limited to interaction, local input checks, and `jq` JSON construction. Delegate credentials, HTTP requests, redirect protection, and authoritative schema validation to `board_authorization.py` and the deployed API.

**Tech Stack:** Bash, `jq`, Python `unittest`, existing Board Authorization Python client, Git worktrees.

---

### Task 1: Add Red Interactive-Wrapper Tests

**Files:**
- Modify: `skills/create-board-authorization/scripts/test_board_authorization.py`

**Steps:**

1. Add a wrapper path constant and a helper that invokes Bash with scripted standard input and the mock API environment.
2. Add a dry-run test covering all profile fields and asserting valid parsed JSON, three distinct Directors, role indexes, thresholds, and unanimous-consent semantics.
3. Add tests for current-profile defaults, duplicate-email rejection, cancellation, and confirmed `profile-set` submission.
4. Run `python3 skills/create-board-authorization/scripts/test_board_authorization.py` and verify failure because the wrapper does not exist.

### Task 2: Implement the Interactive Wrapper

**Files:**
- Create: `skills/create-board-authorization/scripts/configure_board_profile.sh`

**Steps:**

1. Add dependency checks, `--dry-run`, `--blank`, and help handling.
2. Load current profile JSON through `profile-get` unless `--blank` is supplied.
3. Implement required text, email, numbered enum, and threshold prompts with current values as defaults.
4. Prompt all organization, governance, roster, role, presence, and vote fields; deterministically set unanimous-consent values.
5. Reject duplicate normalized emails and construct the payload exclusively through `jq --arg`/`--argjson`.
6. Print dry-run JSON without writing; otherwise preview to stderr, require exact `SAVE`, and pipe JSON to `profile-set`.
7. Mark the script executable and rerun the Python tests until green.

### Task 3: Document the Easy Path

**Files:**
- Modify: `skills/create-board-authorization/SKILL.md`
- Modify: `skills/create-board-authorization/references/api.md`
- Modify: `skills/create-board-authorization/scripts/test_board_authorization.py`

**Steps:**

1. Add a failing documentation assertion for the wrapper path, dry-run, and save confirmation.
2. Document the interactive command as the preferred human profile setup path while retaining JSON `profile-set` for automation.
3. Document `--dry-run`, `--blank`, current-value defaults, and the exact no-token/no-send safety behavior.
4. Rerun the Python suite and skill validator.

### Task 4: Verify Source Implementation

**Files:**
- Verify all files above.

**Steps:**

1. Run `bash -n skills/create-board-authorization/scripts/configure_board_profile.sh`.
2. Run ShellCheck when available.
3. Run the Python suite and skill validator.
4. Run the wrapper in `--dry-run --blank` mode with scripted placeholder input and confirm no production profile mutation.
5. Run `git diff --check`, review the complete diff, commit, and push the feature branch and GitHub `main`.

### Task 5: Port And Deploy

**Files:**
- Apply the design and implementation commits to `deploy/executive-authorization-agent`.

**Steps:**

1. Cherry-pick the source commits into the Documenso 2.4 deployment worktree.
2. Run Bash syntax, ShellCheck, Python tests, and skill validation in the compatibility worktree.
3. Push the deployment branch and fast-forward the live checkout without touching existing runtime/translation changes.
4. Run the deployed wrapper with `--help` and a mock/dry-run input path.
5. Confirm the live profile remains absent and append the rollout to the durable executive-assistant log.
