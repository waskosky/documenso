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
TEST_TOKEN = "secret-test-token"


class _ApiHandler(BaseHTTPRequestHandler):
    requests = []
    response_status = 200
    response_body = {"ok": True}

    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def do_PUT(self):
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

        encoded_response = json.dumps(self.__class__.response_body).encode("utf-8")
        self.send_response(self.__class__.response_status)
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

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.server_thread.join(timeout=5)

    def setUp(self):
        _ApiHandler.requests = []
        _ApiHandler.response_status = 200
        _ApiHandler.response_body = {"ok": True}

    def run_client(self, *arguments, input_payload=None):
        env = {
            **os.environ,
            "DISCLOSURE_SIGN_API_TOKEN": TEST_TOKEN,
            "DISCLOSURE_SIGN_BASE_URL": self.base_url,
        }
        command = [sys.executable, str(SCRIPT_PATH), *arguments]

        if input_payload is not None:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", encoding="utf-8") as handle:
                json.dump(input_payload, handle)
                handle.flush()
                command.extend(["--input", handle.name])
                return subprocess.run(command, env=env, capture_output=True, text=True, check=False)

        return subprocess.run(command, env=env, capture_output=True, text=True, check=False)

    def test_create_posts_request_and_prints_response(self):
        payload = {
            "externalId": "board-2026-07-11-acquisition",
            "payload": {
                "actionDate": "2026-07-11",
                "actionTitle": "Approve acquisition",
                "investorCondition": "None",
                "materialsReviewed": ["Purchase agreement"],
                "matterDescription": "Acquire Example LLC.",
                "resolutionTerms": "The acquisition is approved.",
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

    def test_profile_set_wraps_defaults(self):
        profile = {
            "companyLegalName": "Disclosure Comics Entertainment LLC",
            "directors": [
                {"email": "one@example.com", "name": "One", "presence": "Consented", "vote": "For"},
                {"email": "two@example.com", "name": "Two", "presence": "Consented", "vote": "For"},
                {"email": "three@example.com", "name": "Three", "presence": "Consented", "vote": "For"},
            ],
        }

        result = self.run_client("profile-set", input_payload=profile)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            _ApiHandler.requests[0],
            {
                "authorization": f"Bearer {TEST_TOKEN}",
                "body": {"payloadDefaults": profile},
                "method": "PUT",
                "path": "/api/v2/executive-authorization/profile/board_resolution_secretary_certificate",
            },
        )

    def test_http_error_is_nonzero_and_redacts_token(self):
        _ApiHandler.response_status = 422
        _ApiHandler.response_body = {"message": f"Token {TEST_TOKEN} was rejected"}

        result = self.run_client("profile-get")

        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(TEST_TOKEN, result.stderr)
        self.assertIn("[REDACTED]", result.stderr)


if __name__ == "__main__":
    unittest.main()
