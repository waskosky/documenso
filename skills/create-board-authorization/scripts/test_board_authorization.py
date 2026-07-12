#!/usr/bin/env python3

import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


SCRIPT_PATH = Path(__file__).with_name("board_authorization.py")
CONFIGURE_SCRIPT_PATH = SCRIPT_PATH.with_name("configure_board_profile.sh")
SKILL_PATH = SCRIPT_PATH.parents[1] / "SKILL.md"
API_REFERENCE_PATH = SCRIPT_PATH.parents[1] / "references" / "api.md"
TEST_TOKEN = "secret-test-token"
EXPECTED_USER_AGENT = "DisclosureComics-BoardAuthorization-Agent/1.0 (+https://sign.disclosurecomics.com)"

UNANIMOUS_PROFILE = {
    "actionMethod": "UNANIMOUS_WRITTEN_CONSENT",
    "approvalRequiredCount": 2,
    "authorizedOfficerDirectorIndex": 1,
    "authorizedOfficerName": "Director Two",
    "authorizedOfficerTitle": "President",
    "companyLegalName": "Example Company, Inc.",
    "directors": [
        {
            "email": "one@example.test",
            "name": "Director One",
            "presence": "CONSENTED",
            "vote": "FOR",
        },
        {
            "email": "two@example.test",
            "name": "Director Two",
            "presence": "CONSENTED",
            "vote": "FOR",
        },
        {
            "email": "three@example.test",
            "name": "Director Three",
            "presence": "CONSENTED",
            "vote": "FOR",
        },
    ],
    "entityType": "corporation",
    "equityHolderPlural": "stockholders",
    "governingBodyName": "Board of Directors",
    "governingMemberPlural": "directors",
    "governingMemberSingular": "director",
    "jurisdiction": "Colorado",
    "quorumRequiredCount": 2,
    "resolutionDisposition": "APPROVED_UNANIMOUSLY",
    "secretaryDirectorIndex": 0,
    "secretaryName": "Director One",
}

MEETING_PROFILE = {
    **UNANIMOUS_PROFILE,
    "actionMethod": "MEETING",
    "directors": [
        {
            **UNANIMOUS_PROFILE["directors"][0],
            "presence": "PRESENT",
        },
        {
            **UNANIMOUS_PROFILE["directors"][1],
            "presence": "PRESENT",
        },
        {
            **UNANIMOUS_PROFILE["directors"][2],
            "presence": "ABSENT",
            "vote": "NOT_VOTING",
        },
    ],
    "resolutionDisposition": "APPROVED_REQUIRED_VOTE",
}


def _unanimous_answers(*, action_choices=None, second_email="two@example.test", confirmation=None):
    action_choices = action_choices or ["1"]
    answers = [
        "Example Company, Inc.",
        "Colorado",
        "corporation",
        "Board of Directors",
        "director",
        "directors",
        "stockholders",
        *action_choices,
        "2",
        "2",
        "Director One",
        "one@example.test",
        "Director Two",
        second_email,
        "Director Three",
        "three@example.test",
        "1",
        "2",
        "President",
    ]

    if confirmation is not None:
        answers.append(confirmation)

    return "\n".join(answers) + "\n"


class _ApiHandler(BaseHTTPRequestHandler):
    requests = []
    response_status = 200
    response_body = {"ok": True}
    response_headers = {}
    user_agents = []

    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def log_message(self, _format, *_args):
        return

    def _handle_request(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b""
        body = json.loads(raw_body) if raw_body else None

        self.__class__.requests.append(
            {
                "authorization": self.headers.get("Authorization"),
                "body": body,
                "method": self.command,
                "path": self.path,
            }
        )
        self.__class__.user_agents.append(self.headers.get("User-Agent"))

        encoded_response = json.dumps(self.__class__.response_body).encode("utf-8")
        self.send_response(self.__class__.response_status)
        self.send_header("Content-Type", "application/json")
        for name, value in self.__class__.response_headers.items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(encoded_response)))
        self.end_headers()
        self.wfile.write(encoded_response)


class _RedirectTargetHandler(BaseHTTPRequestHandler):
    requests = []

    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def log_message(self, _format, *_args):
        return

    def _handle_request(self):
        self.__class__.requests.append(
            {
                "authorization": self.headers.get("Authorization"),
                "method": self.command,
                "path": self.path,
            }
        )

        encoded_response = json.dumps({"redirected": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded_response)))
        self.end_headers()
        self.wfile.write(encoded_response)


class BoardAuthorizationClientTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), _ApiHandler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

        cls.redirect_target_server = ThreadingHTTPServer(("127.0.0.1", 0), _RedirectTargetHandler)
        cls.redirect_target_thread = threading.Thread(
            target=cls.redirect_target_server.serve_forever,
            daemon=True,
        )
        cls.redirect_target_thread.start()
        cls.redirect_target_url = f"http://127.0.0.1:{cls.redirect_target_server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.server_thread.join(timeout=5)
        cls.redirect_target_server.shutdown()
        cls.redirect_target_server.server_close()
        cls.redirect_target_thread.join(timeout=5)

    def setUp(self):
        _ApiHandler.requests = []
        _ApiHandler.response_status = 200
        _ApiHandler.response_body = {"ok": True}
        _ApiHandler.response_headers = {}
        _ApiHandler.user_agents = []
        _RedirectTargetHandler.requests = []

    def run_client(self, *arguments, input_payload=None, environment=None):
        env = {
            **os.environ,
            "DISCLOSURE_SIGN_API_TOKEN": TEST_TOKEN,
            "DISCLOSURE_SIGN_BASE_URL": self.base_url,
        }
        for name, value in (environment or {}).items():
            if value is None:
                env.pop(name, None)
            else:
                env[name] = value
        command = [sys.executable, str(SCRIPT_PATH), *arguments]

        if input_payload is not None:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", encoding="utf-8") as handle:
                json.dump(input_payload, handle)
                handle.flush()
                command.extend(["--input", handle.name])
                return subprocess.run(command, env=env, capture_output=True, text=True, check=False)

        return subprocess.run(command, env=env, capture_output=True, text=True, check=False)

    def run_configurator(self, *arguments, input_text="", environment=None):
        env = {
            **os.environ,
            "DISCLOSURE_SIGN_API_TOKEN": TEST_TOKEN,
            "DISCLOSURE_SIGN_BASE_URL": self.base_url,
        }
        env.update(environment or {})

        return subprocess.run(
            ["bash", str(CONFIGURE_SCRIPT_PATH), *arguments],
            env=env,
            input=input_text,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_create_posts_request_and_prints_response(self):
        payload = {
            "externalId": "board-2026-07-11-acquisition",
            "payload": {
                "actionDate": "2026-07-11",
                "actionTitle": "Approve acquisition",
                "certificateDate": "2026-07-12",
                "materialsReviewed": ["Purchase agreement"],
                "matterDescription": "Acquire Example LLC.",
                "ratifyPriorActions": True,
                "specificAction": "the acquisition of Example LLC",
                "specificTerms": "on the terms in the Purchase Agreement",
            },
        }
        _ApiHandler.response_body = {
            "authorizationId": "auth_123",
            "editorUrl": "https://sign.example.test/edit",
        }

        result = self.run_client("create", input_payload=payload)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), _ApiHandler.response_body)
        self.assertEqual(
            _ApiHandler.requests,
            [
                {
                    "authorization": f"Bearer {TEST_TOKEN}",
                    "body": payload,
                    "method": "POST",
                    "path": "/api/v2/executive-authorization/create",
                }
            ],
        )

    def test_profile_get_uses_default_template_key(self):
        result = self.run_client("profile-get")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            _ApiHandler.requests,
            [
                {
                    "authorization": f"Bearer {TEST_TOKEN}",
                    "body": None,
                    "method": "GET",
                    "path": "/api/v2/executive-authorization/profile/board_resolution_secretary_certificate",
                }
            ],
        )

    def test_profile_get_uses_identifiable_user_agent(self):
        result = self.run_client("profile-get")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(_ApiHandler.user_agents, [EXPECTED_USER_AGENT])

    def test_profile_get_reads_token_from_default_private_file(self):
        with tempfile.TemporaryDirectory() as home_directory:
            token_path = Path(home_directory) / ".config" / "disclosure-sign" / "api-token"
            token_path.parent.mkdir(parents=True)
            token_path.write_text(f"{TEST_TOKEN}\n", encoding="utf-8")
            token_path.chmod(0o600)

            result = self.run_client(
                "profile-get",
                environment={
                    "DISCLOSURE_SIGN_API_TOKEN": None,
                    "DISCLOSURE_SIGN_API_TOKEN_FILE": None,
                    "HOME": home_directory,
                },
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(_ApiHandler.requests[0]["authorization"], f"Bearer {TEST_TOKEN}")

    def test_profile_set_wraps_defaults(self):
        profile = {
            "actionMethod": "UNANIMOUS_WRITTEN_CONSENT",
            "approvalRequiredCount": 2,
            "authorizedOfficerDirectorIndex": 1,
            "authorizedOfficerName": "Two",
            "authorizedOfficerTitle": "President",
            "companyLegalName": "Disclosure Comics Entertainment LLC",
            "directors": [
                {"email": "one@example.com", "name": "One", "presence": "CONSENTED", "vote": "FOR"},
                {"email": "two@example.com", "name": "Two", "presence": "CONSENTED", "vote": "FOR"},
                {"email": "three@example.com", "name": "Three", "presence": "CONSENTED", "vote": "FOR"},
            ],
            "entityType": "limited liability company",
            "equityHolderPlural": "members",
            "governingBodyName": "Board of Managers",
            "governingMemberPlural": "managers",
            "governingMemberSingular": "manager",
            "jurisdiction": "Colorado",
            "quorumRequiredCount": 2,
            "resolutionDisposition": "APPROVED_UNANIMOUSLY",
            "secretaryDirectorIndex": 0,
            "secretaryName": "One",
        }

        result = self.run_client("profile-set", input_payload=profile)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            _ApiHandler.requests[0],
            {
                "authorization": f"Bearer {TEST_TOKEN}",
                "body": {"payloadDefaults": profile},
                "method": "POST",
                "path": "/api/v2/executive-authorization/profile/board_resolution_secretary_certificate",
            },
        )

    def test_configurator_dry_run_builds_complete_profile_without_api_write(self):
        result = self.run_configurator(
            "--dry-run",
            "--blank",
            input_text=_unanimous_answers(),
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), UNANIMOUS_PROFILE)
        self.assertEqual(_ApiHandler.requests, [])

    def test_configurator_uses_current_profile_as_prompt_defaults(self):
        _ApiHandler.response_body = {
            "currentTemplateVersion": 2,
            "exists": True,
            "needsUpgrade": False,
            "payloadDefaults": MEETING_PROFILE,
            "templateKey": "board_resolution_secretary_certificate",
            "templateVersion": 2,
        }

        result = self.run_configurator("--dry-run", input_text="\n" * 25)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), MEETING_PROFILE)
        self.assertEqual(
            _ApiHandler.requests,
            [
                {
                    "authorization": f"Bearer {TEST_TOKEN}",
                    "body": None,
                    "method": "GET",
                    "path": "/api/v2/executive-authorization/profile/board_resolution_secretary_certificate",
                }
            ],
        )

    def test_configurator_rejects_duplicate_director_emails_without_api_write(self):
        result = self.run_configurator(
            "--dry-run",
            "--blank",
            input_text=_unanimous_answers(second_email="ONE@example.test"),
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("distinct email address", result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertEqual(_ApiHandler.requests, [])

    def test_configurator_reprompts_for_a_noncanonical_numeric_choice(self):
        result = self.run_configurator(
            "--dry-run",
            "--blank",
            input_text=_unanimous_answers(action_choices=["08", "1"]),
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("value too great for base", result.stderr)
        self.assertEqual(json.loads(result.stdout), UNANIMOUS_PROFILE)
        self.assertEqual(_ApiHandler.requests, [])

    def test_configurator_cancels_without_api_write(self):
        result = self.run_configurator(
            "--blank",
            input_text=_unanimous_answers(confirmation="CANCEL"),
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("no changes were saved", result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertEqual(_ApiHandler.requests, [])

    def test_configurator_saves_only_after_exact_confirmation(self):
        _ApiHandler.response_body = {"saved": True}

        result = self.run_configurator(
            "--blank",
            input_text=_unanimous_answers(confirmation="SAVE"),
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), {"saved": True})
        self.assertEqual(
            _ApiHandler.requests,
            [
                {
                    "authorization": f"Bearer {TEST_TOKEN}",
                    "body": {"payloadDefaults": UNANIMOUS_PROFILE},
                    "method": "POST",
                    "path": "/api/v2/executive-authorization/profile/board_resolution_secretary_certificate",
                }
            ],
        )

    def test_configurator_stops_when_current_profile_cannot_be_loaded(self):
        _ApiHandler.response_status = 503
        _ApiHandler.response_body = {"message": "Profile service unavailable"}

        result = self.run_configurator("--dry-run")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unable to load the current profile", result.stderr)
        self.assertEqual(
            _ApiHandler.requests,
            [
                {
                    "authorization": f"Bearer {TEST_TOKEN}",
                    "body": None,
                    "method": "GET",
                    "path": "/api/v2/executive-authorization/profile/board_resolution_secretary_certificate",
                }
            ],
        )

    def test_http_error_is_nonzero_and_redacts_token(self):
        _ApiHandler.response_status = 422
        _ApiHandler.response_body = {"message": f"Token {TEST_TOKEN} was rejected"}

        result = self.run_client("profile-get")

        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(TEST_TOKEN, result.stderr)
        self.assertIn("[REDACTED]", result.stderr)

    def test_redirect_is_rejected_without_contacting_target(self):
        _ApiHandler.response_status = 302
        _ApiHandler.response_headers = {
            "Location": f"{self.redirect_target_url}/redirect-target",
        }

        result = self.run_client("profile-get")

        self.assertEqual(
            {
                "redirect_target_requests": _RedirectTargetHandler.requests,
                "returncode": result.returncode,
            },
            {
                "redirect_target_requests": [],
                "returncode": 1,
            },
            result.stderr,
        )
        self.assertIn("(302)", result.stderr)

    def test_skill_uses_complete_v2_decision_contract(self):
        skill = SKILL_PATH.read_text(encoding="utf-8")
        reference = API_REFERENCE_PATH.read_text(encoding="utf-8")

        for field in [
            "certificateDate",
            "deliveryCondition",
            "deliveryRecipient",
            "ratifyPriorActions",
            "specificAction",
            "specificTerms",
        ]:
            self.assertIn(field, skill)
            self.assertIn(field, reference)

        self.assertNotIn("investorCondition", skill)
        self.assertNotIn("resolutionTerms", skill)
        self.assertIn("must not precede", skill)
        self.assertIn("NOT_APPROVED", skill)
        self.assertIn("must not precede", reference)
        self.assertIn("NOT_APPROVED", reference)
        self.assertIn("expected `9`", reference)

    def test_skill_requires_reviewed_current_profile(self):
        skill = SKILL_PATH.read_text(encoding="utf-8")
        reference = API_REFERENCE_PATH.read_text(encoding="utf-8")

        self.assertIn("needsUpgrade", skill)
        self.assertIn("needsUpgrade", reference)
        self.assertIn("authorizedOfficerDirectorIndex", reference)
        self.assertIn("approvalRequiredCount", reference)
        self.assertIn("quorumRequiredCount", reference)
        self.assertIn("secretaryDirectorIndex", reference)

    def test_skill_documents_interactive_profile_configuration(self):
        skill = SKILL_PATH.read_text(encoding="utf-8")
        reference = API_REFERENCE_PATH.read_text(encoding="utf-8")

        for document in [skill, reference]:
            self.assertIn("configure_board_profile.sh", document)
            self.assertIn("--dry-run", document)
            self.assertIn("SAVE", document)
            self.assertIn("does not create or send an envelope", document)


if __name__ == "__main__":
    unittest.main()
