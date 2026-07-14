#!/usr/bin/env bash

board_fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

board_cancel() {
  printf '\n%s\n' "$1" >&2
  exit 130
}

board_require_command() {
  command -v "$1" >/dev/null 2>&1 || board_fail "Required command not found: $1"
}

board_trim_value() {
  local value="$1"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

board_prompt_required() {
  local destination="$1"
  local label="$2"
  local default_value="$3"
  local eof_message="$4"
  local input_value

  while true; do
    if [[ -n "$default_value" ]]; then
      printf '%s [%s]: ' "$label" "$default_value" >&2
    else
      printf '%s: ' "$label" >&2
    fi

    if ! IFS= read -r input_value; then
      board_fail "$eof_message"
    fi

    input_value="$(board_trim_value "${input_value:-$default_value}")"

    if [[ -n "$input_value" ]]; then
      printf -v "$destination" '%s' "$input_value"
      return
    fi

    printf 'A value is required.\n' >&2
  done
}

board_prompt_optional() {
  local destination="$1"
  local label="$2"
  local default_value="$3"
  local eof_message="$4"
  local input_value

  if [[ -n "$default_value" ]]; then
    printf '%s [%s]: ' "$label" "$default_value" >&2
  else
    printf '%s: ' "$label" >&2
  fi

  if ! IFS= read -r input_value; then
    board_fail "$eof_message"
  fi

  input_value="$(board_trim_value "${input_value:-$default_value}")"
  printf -v "$destination" '%s' "$input_value"
}

board_prompt_email() {
  local destination="$1"
  local label="$2"
  local default_value="$3"
  local eof_message="$4"
  local email_value=''

  while true; do
    board_prompt_required email_value "$label" "$default_value" "$eof_message"

    if [[ "$email_value" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
      printf -v "$destination" '%s' "$email_value"
      return
    fi

    printf 'Enter a valid email address.\n' >&2
  done
}

board_prompt_choice() {
  local destination="$1"
  local label="$2"
  local default_value="$3"
  local eof_message="$4"
  shift 4

  local options=("$@")
  local option
  local option_index
  local option_label
  local option_value
  local default_index=''
  local default_label=''
  local answer
  local choice_number

  while true; do
    printf '%s\n' "$label" >&2

    for option_index in "${!options[@]}"; do
      option="${options[$option_index]}"
      option_value="${option%%=*}"
      option_label="${option#*=}"
      printf '  %d. %s\n' "$((option_index + 1))" "$option_label" >&2

      if [[ "$option_value" == "$default_value" ]]; then
        default_index="$((option_index + 1))"
        default_label="$option_label"
      fi
    done

    if [[ -n "$default_index" ]]; then
      printf 'Choice [%s, %s]: ' "$default_index" "$default_label" >&2
    else
      printf 'Choice: ' >&2
    fi

    if ! IFS= read -r answer; then
      board_fail "$eof_message"
    fi

    answer="$(board_trim_value "$answer")"

    if [[ -z "$answer" && -n "$default_index" ]]; then
      answer="$default_index"
    fi

    if [[ "$answer" =~ ^[1-9][0-9]*$ && ${#answer} -le 9 ]]; then
      choice_number="$((10#$answer))"

      if ((choice_number <= ${#options[@]})); then
        option="${options[$((choice_number - 1))]}"
        printf -v "$destination" '%s' "${option%%=*}"
        return
      fi
    fi

    printf 'Choose a number from 1 through %d.\n' "${#options[@]}" >&2
  done
}
