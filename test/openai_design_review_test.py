"""Offline tests for review completion and bounded output; no real API calls."""
import contextlib
import io
import json
import os
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "openai_design_review.py"

class Response:
    def __init__(self, payload):
        self.payload = payload
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def read(self):
        return json.dumps(self.payload).encode()

class ReviewOutputTests(unittest.TestCase):
    def run_review(self, response):
        posts = []
        def fake_urlopen(request, **kwargs):
            url = request.full_url
            if "/compare/" in url:
                return Response({"files": [{"filename": "src/styles.css", "patch": "+/* fixture */"}],
                                 "commits": [{"sha": "a" * 40}]})
            if url.endswith("/comments?per_page=100"):
                return Response([])
            if url == "https://api.openai.com/v1/responses":
                posts.append(("openai", json.loads(request.data)))
                return Response(response)
            if url.endswith("/issues/1/comments") and request.data:
                posts.append(("github", json.loads(request.data)))
                return Response({"html_url": "https://example.invalid/review"})
            raise AssertionError("Unexpected request: " + url)
        output = io.StringIO()
        code = 0
        with patch.dict(os.environ, {"OPENAI_API_KEY": "fixture-only", "GITHUB_TOKEN": "fixture-only",
                                     "GITHUB_REPOSITORY": "example/fixture", "OPENAI_REVIEW_MODEL": "fixture-model"}), \
             patch("urllib.request.urlopen", side_effect=fake_urlopen), contextlib.redirect_stdout(output):
            try:
                runpy.run_path(str(SCRIPT), run_name="__main__")
            except SystemExit as exc:
                code = exc.code
        return code, posts, output.getvalue()

    def test_completed_review_is_posted_once_with_bounded_budget(self):
        code, posts, output = self.run_review({"status": "completed", "output": [
            {"content": [{"type": "output_text", "text": "Complete review."}]}]})
        self.assertEqual(code, 0)
        api = [p for kind, p in posts if kind == "openai"]
        self.assertEqual(len(api), 1)
        self.assertEqual(api[0]["max_output_tokens"], 6000)
        self.assertEqual(api[0]["model"], "fixture-model")
        comments = [p for kind, p in posts if kind == "github"]
        self.assertEqual(len(comments), 1)
        self.assertIn("Complete review.", comments[0]["body"])

    def test_incomplete_partial_review_is_not_posted(self):
        code, posts, output = self.run_review({"status": "incomplete",
            "incomplete_details": {"reason": "max_output_tokens"},
            "output": [{"content": [{"type": "output_text", "text": "Unfinished finding"}]}]})
        self.assertEqual(code, 1)
        self.assertEqual([p for kind, p in posts if kind == "github"], [])
        self.assertEqual(len([p for kind, p in posts if kind == "openai"]), 1)
        self.assertIn("max_output_tokens", output)
        self.assertIn("::error::", output)

    def test_reasoning_only_response_is_not_posted(self):
        code, posts, output = self.run_review({"status": "incomplete",
            "incomplete_details": {"reason": "max_output_tokens"},
            "output": [{"type": "reasoning", "summary": []}]})
        self.assertEqual(code, 1)
        self.assertFalse(any(kind == "github" for kind, _ in posts))
        self.assertIn("::error::", output)

    def test_completed_without_text_is_not_posted(self):
        code, posts, output = self.run_review({"status": "completed", "output": []})
        self.assertEqual(code, 1)
        self.assertFalse(any(kind == "github" for kind, _ in posts))
        self.assertIn("completed without text", output)

if __name__ == "__main__":
    unittest.main()
