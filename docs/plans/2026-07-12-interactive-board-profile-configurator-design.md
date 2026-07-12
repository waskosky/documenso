# Interactive Board Profile Configurator Design

## Objective

Make first-time and repeated Board Authorization profile setup safe to complete from a terminal without manually authoring JSON or handling API credentials.

## Selected Approach

Add `skills/create-board-authorization/scripts/configure_board_profile.sh` as a thin interactive wrapper around the existing `board_authorization.py` client. Keep authentication, HTTP behavior, redirect protection, and server-side validation in the Python client rather than duplicating them in Bash.

The wrapper will:

- load the current profile and use existing values as prompt defaults
- prompt for every version-2 profile field
- use numbered choices for action method, disposition, presence, vote, thresholds, and role assignments
- require non-empty legal identity, Director, email, and officer fields
- reject duplicate Director email addresses before submission
- construct JSON with `jq`, never string concatenation
- print a formatted preview
- support `--dry-run`, which prints JSON and performs no write
- require the operator to type `SAVE` before calling `profile-set`
- read credentials only through the existing Python client

## Interaction Model

On a missing profile, blank legal and personal fields require explicit input. Existing schema defaults may be offered as visible suggestions, but the operator must accept or replace them. Quorum and approval thresholds always require an explicit selection.

Unanimous written consent deterministically uses `CONSENTED` and `FOR` for all three Directors and the `APPROVED_UNANIMOUSLY` disposition. Other methods prompt for each Director's presence and vote and rely on the shared server schema for final cross-field validation.

## Failure Safety

- Missing `bash`, `jq`, or `python3` fails before prompting.
- Failure to read the current profile stops unless `--blank` was explicitly selected.
- EOF or interruption exits without writing.
- A server validation error is returned unchanged and does not partially save a profile.
- The script never prints or reads the API token directly.

## Verification

Extend the skill's Python test suite to execute the Bash wrapper against its local mock API. Cover dry-run JSON generation, existing-profile defaults, duplicate-email rejection, explicit save confirmation, and cancellation. Run `bash -n`, ShellCheck when available, the Python skill suite, skill validation, and both source/deployment compatibility checks before rollout.
