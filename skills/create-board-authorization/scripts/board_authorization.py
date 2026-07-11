#!/usr/bin/env python3

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import HTTPRedirectHandler, Request, build_opener


DEFAULT_BASE_URL = "https://sign.disclosurecomics.com"
DEFAULT_TEMPLATE_KEY = "board_resolution_secretary_certificate"


class _RejectRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        raise HTTPError(request.full_url, code, "Redirects are not allowed.", headers, file_pointer)


_URL_OPENER = build_opener(_RejectRedirectHandler())


def _load_json(path):
    try:
        if path:
            raw_value = Path(path).read_text(encoding="utf-8")
        elif not sys.stdin.isatty():
            raw_value = sys.stdin.read()
        else:
            raise ValueError("Provide JSON with --input PATH or standard input.")

        value = json.loads(raw_value)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        raise ValueError(f"Unable to read input JSON: {error}") from error

    if not isinstance(value, dict):
        raise ValueError("Input JSON must be an object.")

    return value


def _request(*, base_url, body, method, path, timeout, token):
    url = f"{base_url.rstrip('/')}{path}"
    encoded_body = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(
        url,
        data=encoded_body,
        method=method,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with _URL_OPENER.open(request, timeout=timeout) as response:
            raw_response = response.read().decode("utf-8")
    except HTTPError as error:
        raw_error = error.read().decode("utf-8", errors="replace")
        safe_error = raw_error.replace(token, "[REDACTED]")
        raise RuntimeError(f"API request failed ({error.code}): {safe_error}") from error
    except URLError as error:
        safe_reason = str(error.reason).replace(token, "[REDACTED]")
        raise RuntimeError(f"API request failed: {safe_reason}") from error

    if not raw_response:
        return None

    try:
        return json.loads(raw_response)
    except json.JSONDecodeError as error:
        raise RuntimeError("API returned a non-JSON response.") from error


def _build_parser():
    parser = argparse.ArgumentParser(description="Manage Disclosure Comics board authorization drafts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="Create or retrieve an idempotent authorization draft.")
    create_parser.add_argument("--input", help="JSON request path; omit to read standard input.")

    get_parser = subparsers.add_parser("profile-get", help="Read stable authorization defaults.")
    get_parser.add_argument("--template-key", default=DEFAULT_TEMPLATE_KEY)

    set_parser = subparsers.add_parser("profile-set", help="Set stable authorization defaults.")
    set_parser.add_argument("--input", help="Profile defaults JSON path; omit to read standard input.")
    set_parser.add_argument("--template-key", default=DEFAULT_TEMPLATE_KEY)

    return parser


def main():
    parser = _build_parser()
    arguments = parser.parse_args()
    token = os.environ.get("DISCLOSURE_SIGN_API_TOKEN", "").strip()

    if not token:
        parser.error("DISCLOSURE_SIGN_API_TOKEN is required.")

    base_url = os.environ.get("DISCLOSURE_SIGN_BASE_URL", DEFAULT_BASE_URL).strip() or DEFAULT_BASE_URL

    try:
        timeout = float(os.environ.get("DISCLOSURE_SIGN_TIMEOUT_SECONDS", "30"))
    except ValueError:
        parser.error("DISCLOSURE_SIGN_TIMEOUT_SECONDS must be numeric.")

    try:
        if arguments.command == "create":
            body = _load_json(arguments.input)
            method = "POST"
            path = "/api/v2/executive-authorization/create"
        elif arguments.command == "profile-get":
            body = None
            method = "GET"
            path = f"/api/v2/executive-authorization/profile/{quote(arguments.template_key, safe='')}"
        else:
            body = {"payloadDefaults": _load_json(arguments.input)}
            method = "POST"
            path = f"/api/v2/executive-authorization/profile/{quote(arguments.template_key, safe='')}"

        response = _request(
            base_url=base_url,
            body=body,
            method=method,
            path=path,
            timeout=timeout,
            token=token,
        )
    except (RuntimeError, ValueError) as error:
        print(str(error).replace(token, "[REDACTED]"), file=sys.stderr)
        return 1

    print(json.dumps(response, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
