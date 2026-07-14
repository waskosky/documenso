# Interactive Board Authorization Creation Design

## Objective

Let an operator create a review-only Board Authorization draft from a terminal questionnaire without manually writing JSON, handling API credentials, or remembering response-integrity checks.

## Selected Approach

Add `skills/create-board-authorization/scripts/create_board_authorization.sh` as a thin interactive wrapper around the existing `board_authorization.py` client. Extract the terminal prompt primitives shared with `configure_board_profile.sh` into a sourced, namespaced Bash helper so required text, optional text, numbered choices, trimming, cancellation, and dependency errors behave consistently.

Keep credentials, HTTP requests, redirect protection, idempotent record creation, authoritative schema validation, document generation, and persistence in the existing Python client and API. The new script will not add another database, signing implementation, or send path.

## Questionnaire And Request

The wrapper will first read the saved profile and stop when it is missing or needs an upgrade. It will then prompt for:

- action date and certificate date, with local format/order checks
- decision title and matter description
- one or more reviewed material names or URLs
- the specific action being authorized
- optional specific terms
- optional paired delivery recipient and condition
- an explicit yes/no decision on ratifying prior actions
- optional internal notes
- a suggested, editable `externalId` derived from the action date and title

For a `NOT_APPROVED` profile, delivery values will be omitted and ratification will be forced to `false`, matching the shared server schema. The request will set `generateDocument: true` and will contain no profile-backed organization, roster, role, governance, method, or disposition fields.

## Safety And Output

- `--dry-run` prints the complete request JSON and performs no create call.
- A real run prints the same preview and requires exact `CREATE` confirmation.
- Cancellation or EOF exits without a create call.
- The script never reads or prints the API token directly.
- The endpoint creates a database record and review envelope but never sends it.
- The operator can reuse the displayed `externalId` to retrieve the same idempotent record after an uncertain retry.

After creation, the wrapper will print the API response and require three signers, nine fields, a nonempty envelope/editor result, `integrityValid: true`, and null generation/integrity errors. A failed integrity check exits nonzero while preserving and displaying the recoverable authorization details; it never retries under a new ID.

## Verification

Extend the existing Python mock-API suite before implementation. Cover dry-run request generation, confirmed creation, cancellation, missing/obsolete profiles, date reprompting, not-approved restrictions, and bad response integrity. Re-run the existing profile configurator tests to protect the shared prompt refactor, then run Bash syntax checks, ShellCheck when available, skill validation, a credential-free/mock dry run, and source/deployment compatibility checks before rollout.
