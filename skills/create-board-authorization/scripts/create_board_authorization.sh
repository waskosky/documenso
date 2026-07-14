#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PATH="${SCRIPT_DIR}/board_authorization.py"
PROMPT_HELPERS_PATH="${SCRIPT_DIR}/board_authorization_prompts.sh"
TEMPLATE_KEY='board_resolution_secretary_certificate'
CREATE_EOF_MESSAGE='Input ended before the questionnaire was complete; no authorization was created.'

dry_run=false

usage() {
  cat <<'EOF'
Usage: create_board_authorization.sh [--dry-run]

Interactively create a review-only Board Authorization draft.

Options:
  --dry-run  Print the proposed request JSON without creating a draft.
  -h, --help Show this help text.

This script never sends an envelope or email.
EOF
}

[[ -f "$PROMPT_HELPERS_PATH" ]] || {
  printf 'Error: Board Authorization prompt helpers not found: %s\n' "$PROMPT_HELPERS_PATH" >&2
  exit 1
}

# shellcheck source=board_authorization_prompts.sh
source "$PROMPT_HELPERS_PATH"

cancel_creation() {
  board_cancel 'Cancelled; no authorization was created.'
}

create_interrupted() {
  printf '\nCreation was interrupted. Check external ID %s before retrying; the API result may be uncertain.\n' \
    "${external_id:-unknown}" >&2
  exit 130
}

prompt_required() {
  board_prompt_required "$1" "$2" "$3" "$CREATE_EOF_MESSAGE"
}

prompt_optional() {
  board_prompt_optional "$1" "$2" "$3" "$CREATE_EOF_MESSAGE"
}

prompt_choice() {
  board_prompt_choice "$1" "$2" "$3" "$CREATE_EOF_MESSAGE" "${@:4}"
}

is_valid_date() {
  python3 - "$1" <<'PY'
import datetime
import sys

try:
    datetime.date.fromisoformat(sys.argv[1])
except ValueError:
    raise SystemExit(1)
PY
}

prompt_date() {
  local destination="$1"
  local label="$2"
  local date_value=''

  while true; do
    prompt_required date_value "$label" ''

    if [[ "$date_value" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && is_valid_date "$date_value"; then
      printf -v "$destination" '%s' "$date_value"
      return
    fi

    printf 'Enter a valid date in YYYY-MM-DD format.\n' >&2
  done
}

build_title_slug() {
  python3 - "$1" <<'PY'
import re
import sys
import unicodedata

normalized = unicodedata.normalize("NFKD", sys.argv[1]).encode("ascii", "ignore").decode("ascii")
slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
print((slug or "decision")[:80].rstrip("-"))
PY
}

for argument in "$@"; do
  case "$argument" in
    --dry-run)
      dry_run=true
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      board_fail "Unknown option: $argument"
      ;;
  esac
done

board_require_command bash
board_require_command jq
board_require_command python3

[[ -f "$CLIENT_PATH" ]] || board_fail "Board Authorization client not found: $CLIENT_PATH"

trap cancel_creation INT TERM

printf 'Loading the current Board Authorization profile...\n' >&2

if ! profile_response="$(python3 "$CLIENT_PATH" profile-get)"; then
  board_fail 'Unable to load the current profile; no authorization was created.'
fi

if ! jq -e '.exists == true' >/dev/null <<<"$profile_response"; then
  board_fail 'The Board Authorization profile is not configured. Run configure_board_profile.sh first.'
fi

if jq -e '.needsUpgrade == true' >/dev/null <<<"$profile_response"; then
  board_fail 'The Board Authorization profile needs an upgrade. Review and save it before creating a draft.'
fi

if ! jq -e '.payloadDefaults | type == "object"' >/dev/null <<<"$profile_response"; then
  board_fail 'The Board Authorization profile has no usable defaults.'
fi

profile="$(jq -c '.payloadDefaults' <<<"$profile_response")"
company_legal_name="$(jq -r '.companyLegalName' <<<"$profile")"
action_method="$(jq -r '.actionMethod' <<<"$profile")"
resolution_disposition="$(jq -r '.resolutionDisposition' <<<"$profile")"

printf 'Using profile: %s | %s | %s\n' \
  "$company_legal_name" "$action_method" "$resolution_disposition" >&2

printf '\nDecision\n' >&2
prompt_date action_date 'Action date (YYYY-MM-DD)'

while true; do
  prompt_date certificate_date 'Certificate date (YYYY-MM-DD)'

  if [[ "$certificate_date" < "$action_date" ]]; then
    printf 'Certificate date cannot precede the action date.\n' >&2
    continue
  fi

  break
done

prompt_required action_title 'Decision title' ''
prompt_required matter_description 'Matter being considered' ''

printf '\nMaterials reviewed\n' >&2
materials=()
prompt_required material_value 'Material 1 name or URL' ''
materials+=("$material_value")
material_number=2

while true; do
  prompt_optional material_value "Material ${material_number} name or URL (blank to finish)" ''

  if [[ -z "$material_value" ]]; then
    break
  fi

  materials+=("$material_value")
  material_number="$((material_number + 1))"
done

printf '\nAuthorization terms\n' >&2
prompt_required specific_action 'Specific action being authorized' ''
prompt_optional specific_terms 'Specific terms (optional)' ''

delivery_recipient=''
delivery_condition=''

if [[ "$resolution_disposition" == 'NOT_APPROVED' ]]; then
  ratify_prior_actions='false'
  printf 'The saved NOT_APPROVED profile cannot authorize delivery or ratify prior actions.\n' >&2
else
  prompt_optional delivery_recipient 'Delivery recipient (optional)' ''

  if [[ -n "$delivery_recipient" ]]; then
    prompt_required delivery_condition 'Delivery condition' ''
  fi

  prompt_choice ratify_prior_actions 'Ratify prior related actions?' '' \
    'true=Yes' \
    'false=No'
fi

prompt_optional notes 'Internal notes (optional)' ''

suggested_external_id="board-${action_date}-$(build_title_slug "$action_title")"
prompt_required external_id 'Stable external ID (reuse this value for retries)' "$suggested_external_id"

if ((${#external_id} > 255)); then
  board_fail 'External ID must be 255 characters or fewer; no authorization was created.'
fi

materials_json="$(printf '%s\n' "${materials[@]}" | jq -R . | jq -s .)"

payload_json="$(
  jq -n \
    --arg action_date "$action_date" \
    --arg action_title "$action_title" \
    --arg certificate_date "$certificate_date" \
    --arg delivery_condition "$delivery_condition" \
    --arg delivery_recipient "$delivery_recipient" \
    --argjson materials_reviewed "$materials_json" \
    --arg matter_description "$matter_description" \
    --argjson ratify_prior_actions "$ratify_prior_actions" \
    --arg specific_action "$specific_action" \
    --arg specific_terms "$specific_terms" \
    '{
      actionDate: $action_date,
      actionTitle: $action_title,
      certificateDate: $certificate_date,
      materialsReviewed: $materials_reviewed,
      matterDescription: $matter_description,
      ratifyPriorActions: $ratify_prior_actions,
      specificAction: $specific_action
    }
    + if $specific_terms != "" then { specificTerms: $specific_terms } else {} end
    + if $delivery_recipient != "" then {
        deliveryRecipient: $delivery_recipient,
        deliveryCondition: $delivery_condition
      } else {} end'
)"

request_json="$(
  jq -n \
    --arg external_id "$external_id" \
    --arg notes "$notes" \
    --argjson payload "$payload_json" \
    --arg template_key "$TEMPLATE_KEY" \
    '{
      externalId: $external_id,
      generateDocument: true,
      payload: $payload,
      templateKey: $template_key
    }
    + if $notes != "" then { notes: $notes } else {} end'
)"

if [[ "$dry_run" == true ]]; then
  jq . <<<"$request_json"
  exit 0
fi

printf '\nAuthorization request preview\n' >&2
jq . <<<"$request_json" >&2
printf '\nType CREATE to create the review-only authorization and envelope: ' >&2

if ! IFS= read -r confirmation; then
  board_fail 'Input ended before confirmation; no authorization was created.'
fi

if [[ "$confirmation" != 'CREATE' ]]; then
  printf 'Confirmation not received; no authorization was created.\n' >&2
  exit 0
fi

trap create_interrupted INT TERM

if ! create_response="$(printf '%s\n' "$request_json" | python3 "$CLIENT_PATH" create)"; then
  board_fail "The create request failed. Reuse external ID ${external_id} after resolving the error."
fi

jq . <<<"$create_response"

if ! jq -e '
  (.authorizationId | type == "string" and length > 0)
  and (.authorizationUrl | type == "string" and length > 0)
  and (.envelopeId | type == "string" and length > 0)
  and (.editorUrl | type == "string" and length > 0)
  and .signerCount == 3
  and .fieldCount == 9
  and .status == "READY"
  and .integrityValid == true
  and .generationError == null
  and .integrityError == null
' >/dev/null <<<"$create_response"; then
  authorization_url="$(jq -r '.authorizationUrl // "unavailable"' <<<"$create_response")"
  printf 'Error: The create response failed the expected response contract. Review the recoverable record at %s and do not retry with a new external ID.\n' \
    "$authorization_url" >&2
  exit 1
fi

printf 'Draft created and validated. No envelope or email was sent.\n' >&2
printf 'Authorization: %s\n' "$(jq -r '.authorizationUrl' <<<"$create_response")" >&2
printf 'Editor: %s\n' "$(jq -r '.editorUrl' <<<"$create_response")" >&2
