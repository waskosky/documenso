#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PATH="${SCRIPT_DIR}/board_authorization.py"
PROMPT_HELPERS_PATH="${SCRIPT_DIR}/board_authorization_prompts.sh"

[[ -f "$PROMPT_HELPERS_PATH" ]] || {
  printf 'Error: Board Authorization prompt helpers not found: %s\n' "$PROMPT_HELPERS_PATH" >&2
  exit 1
}

# shellcheck source=board_authorization_prompts.sh
source "$PROMPT_HELPERS_PATH"

dry_run=false
blank_profile=false
PROFILE_EOF_MESSAGE='Input ended before setup was complete; no changes were saved.'

usage() {
  cat <<'EOF'
Usage: configure_board_profile.sh [--dry-run] [--blank]

Interactively configure the stable Board Authorization profile.

Options:
  --dry-run  Print the resulting profile JSON without saving it.
  --blank    Start without loading the current profile.
  -h, --help Show this help text.
EOF
}

cancel_profile_setup() {
  board_cancel 'Cancelled; no changes were saved.'
}

save_interrupted() {
  printf '\nSave interrupted; verify the current profile before retrying.\n' >&2
  exit 130
}

prompt_required() {
  board_prompt_required "$1" "$2" "$3" "$PROFILE_EOF_MESSAGE"
}

prompt_email() {
  board_prompt_email "$1" "$2" "$3" "$PROFILE_EOF_MESSAGE"
}

prompt_choice() {
  board_prompt_choice "$1" "$2" "$3" "$PROFILE_EOF_MESSAGE" "${@:4}"
}

profile_default() {
  local selector="$1"
  local fallback="$2"
  local value

  value="$(jq -r "${selector} // empty" <<<"$current_profile")"
  printf '%s' "${value:-$fallback}"
}

for argument in "$@"; do
  case "$argument" in
    --dry-run)
      dry_run=true
      ;;
    --blank)
      blank_profile=true
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

trap cancel_profile_setup INT TERM

current_profile='{}'

if [[ "$blank_profile" != true ]]; then
  printf 'Loading the current Board Authorization profile...\n' >&2

  if ! profile_response="$(python3 "$CLIENT_PATH" profile-get)"; then
    board_fail "Unable to load the current profile. Use --blank only when you intentionally want to start over."
  fi

  if jq -e '.exists == true and (.payloadDefaults | type == "object")' >/dev/null <<<"$profile_response"; then
    current_profile="$(jq -c '.payloadDefaults' <<<"$profile_response")"
    printf 'Current values are shown as prompt defaults.\n' >&2
  else
    printf 'No saved profile exists; starting with schema defaults.\n' >&2
  fi
fi

printf '\nOrganization\n' >&2
prompt_required company_legal_name 'Company legal name' "$(profile_default '.companyLegalName' '')"
prompt_required jurisdiction 'Jurisdiction' "$(profile_default '.jurisdiction' 'Colorado')"
prompt_required entity_type 'Entity type' "$(profile_default '.entityType' 'corporation')"
prompt_required governing_body_name 'Governing body name' "$(profile_default '.governingBodyName' 'Board of Directors')"
prompt_required governing_member_singular 'Governing member (singular)' "$(profile_default '.governingMemberSingular' 'director')"
prompt_required governing_member_plural 'Governing members (plural)' "$(profile_default '.governingMemberPlural' 'directors')"
prompt_required equity_holder_plural 'Equity holders (plural)' "$(profile_default '.equityHolderPlural' 'stockholders')"

printf '\nGovernance\n' >&2
prompt_choice action_method 'How does the board take this action?' "$(profile_default '.actionMethod' 'UNANIMOUS_WRITTEN_CONSENT')" \
  'UNANIMOUS_WRITTEN_CONSENT=Unanimous written consent' \
  'WRITTEN_CONSENT=Written consent' \
  'MEETING=Meeting'
prompt_choice quorum_required_count 'How many directors are required for quorum?' "$(profile_default '.quorumRequiredCount' '')" \
  '1=1 director' \
  '2=2 directors' \
  '3=3 directors'
prompt_choice approval_required_count 'How many FOR votes are required for approval?' "$(profile_default '.approvalRequiredCount' '')" \
  '1=1 vote' \
  '2=2 votes' \
  '3=3 votes'

if [[ "$action_method" == 'UNANIMOUS_WRITTEN_CONSENT' ]]; then
  resolution_disposition='APPROVED_UNANIMOUSLY'
  printf 'Unanimous written consent sets every director to CONSENTED / FOR.\n' >&2
else
  prompt_choice resolution_disposition 'Decision disposition' "$(profile_default '.resolutionDisposition' '')" \
    'APPROVED_UNANIMOUSLY=Approved unanimously' \
    'APPROVED_REQUIRED_VOTE=Approved by required vote' \
    'NOT_APPROVED=Not approved'
fi

director_names=()
director_emails=()
director_presences=()
director_votes=()

for director_index in 0 1 2; do
  director_number="$((director_index + 1))"
  printf '\nDirector %s\n' "$director_number" >&2
  prompt_required director_name 'Legal name' "$(profile_default ".directors[$director_index].name" '')"
  prompt_email director_email 'Email address' "$(profile_default ".directors[$director_index].email" '')"

  if [[ "$action_method" == 'UNANIMOUS_WRITTEN_CONSENT' ]]; then
    director_presence='CONSENTED'
    director_vote='FOR'
  elif [[ "$action_method" == 'MEETING' ]]; then
    prompt_choice director_presence 'Participation' "$(profile_default ".directors[$director_index].presence" '')" \
      'PRESENT=Present' \
      'ABSENT=Absent'
  else
    prompt_choice director_presence 'Participation' "$(profile_default ".directors[$director_index].presence" '')" \
      'CONSENTED=Consented' \
      'ABSENT=Absent'
  fi

  if [[ "$action_method" != 'UNANIMOUS_WRITTEN_CONSENT' ]]; then
    if [[ "$director_presence" == 'ABSENT' ]]; then
      director_vote='NOT_VOTING'
      printf 'An absent director is recorded as NOT_VOTING.\n' >&2
    else
      prompt_choice director_vote 'Vote' "$(profile_default ".directors[$director_index].vote" '')" \
        'FOR=For' \
        'AGAINST=Against' \
        'ABSTAIN=Abstain' \
        'RECUSED=Recused' \
        'NOT_VOTING=Not voting'
    fi
  fi

  director_names+=("$director_name")
  director_emails+=("$director_email")
  director_presences+=("$director_presence")
  director_votes+=("$director_vote")
done

normalized_email_1="${director_emails[0],,}"
normalized_email_2="${director_emails[1],,}"
normalized_email_3="${director_emails[2],,}"

if [[ "$normalized_email_1" == "$normalized_email_2" ||
      "$normalized_email_1" == "$normalized_email_3" ||
      "$normalized_email_2" == "$normalized_email_3" ]]; then
  board_fail 'Each director must have a distinct email address; no changes were saved.'
fi

printf '\nExecution roles\n' >&2
prompt_choice secretary_director_index 'Which director is the Secretary?' "$(profile_default '.secretaryDirectorIndex' '')" \
  "0=${director_names[0]}" \
  "1=${director_names[1]}" \
  "2=${director_names[2]}"
prompt_choice authorized_officer_director_index 'Which director is the Authorized Officer?' "$(profile_default '.authorizedOfficerDirectorIndex' '')" \
  "0=${director_names[0]}" \
  "1=${director_names[1]}" \
  "2=${director_names[2]}"
prompt_required authorized_officer_title 'Authorized Officer title' "$(profile_default '.authorizedOfficerTitle' '')"

directors_json="$(
  jq -n \
    --arg name_1 "${director_names[0]}" \
    --arg email_1 "${director_emails[0]}" \
    --arg presence_1 "${director_presences[0]}" \
    --arg vote_1 "${director_votes[0]}" \
    --arg name_2 "${director_names[1]}" \
    --arg email_2 "${director_emails[1]}" \
    --arg presence_2 "${director_presences[1]}" \
    --arg vote_2 "${director_votes[1]}" \
    --arg name_3 "${director_names[2]}" \
    --arg email_3 "${director_emails[2]}" \
    --arg presence_3 "${director_presences[2]}" \
    --arg vote_3 "${director_votes[2]}" \
    '[
      { name: $name_1, email: $email_1, presence: $presence_1, vote: $vote_1 },
      { name: $name_2, email: $email_2, presence: $presence_2, vote: $vote_2 },
      { name: $name_3, email: $email_3, presence: $presence_3, vote: $vote_3 }
    ]'
)"

profile_json="$(
  jq -n \
    --arg action_method "$action_method" \
    --argjson approval_required_count "$approval_required_count" \
    --argjson authorized_officer_director_index "$authorized_officer_director_index" \
    --arg authorized_officer_name "${director_names[$authorized_officer_director_index]}" \
    --arg authorized_officer_title "$authorized_officer_title" \
    --arg company_legal_name "$company_legal_name" \
    --argjson directors "$directors_json" \
    --arg entity_type "$entity_type" \
    --arg equity_holder_plural "$equity_holder_plural" \
    --arg governing_body_name "$governing_body_name" \
    --arg governing_member_plural "$governing_member_plural" \
    --arg governing_member_singular "$governing_member_singular" \
    --arg jurisdiction "$jurisdiction" \
    --argjson quorum_required_count "$quorum_required_count" \
    --arg resolution_disposition "$resolution_disposition" \
    --argjson secretary_director_index "$secretary_director_index" \
    --arg secretary_name "${director_names[$secretary_director_index]}" \
    '{
      actionMethod: $action_method,
      approvalRequiredCount: $approval_required_count,
      authorizedOfficerDirectorIndex: $authorized_officer_director_index,
      authorizedOfficerName: $authorized_officer_name,
      authorizedOfficerTitle: $authorized_officer_title,
      companyLegalName: $company_legal_name,
      directors: $directors,
      entityType: $entity_type,
      equityHolderPlural: $equity_holder_plural,
      governingBodyName: $governing_body_name,
      governingMemberPlural: $governing_member_plural,
      governingMemberSingular: $governing_member_singular,
      jurisdiction: $jurisdiction,
      quorumRequiredCount: $quorum_required_count,
      resolutionDisposition: $resolution_disposition,
      secretaryDirectorIndex: $secretary_director_index,
      secretaryName: $secretary_name
    }'
)"

if [[ "$dry_run" == true ]]; then
  jq . <<<"$profile_json"
  exit 0
fi

printf '\nProfile preview\n' >&2
jq . <<<"$profile_json" >&2
printf '\nType SAVE to replace the stored Board Authorization profile: ' >&2

if ! IFS= read -r confirmation; then
  board_fail "Input ended before confirmation; no changes were saved."
fi

if [[ "$confirmation" != 'SAVE' ]]; then
  printf 'Confirmation not received; no changes were saved.\n' >&2
  exit 0
fi

trap save_interrupted INT TERM
printf '%s\n' "$profile_json" | python3 "$CLIENT_PATH" profile-set
