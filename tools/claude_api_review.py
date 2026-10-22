#!/usr/bin/env python3
"""One-shot, read-only Claude review reply for the GitHub automation test."""
import json
import os
import sys
import urllib.error
import urllib.request

REPO = os.environ.get("GITHUB_REPOSITORY", "Mikejpatterson/NCGS")
ISSUE = "1"
KEY = os.environ["ANTHROPIC_API_KEY"]
TOKEN = os.environ["GH_TOKEN"]

def api(url, headers, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(url, data=data, headers=headers,
                                     method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=90) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f"Request failed: HTTP {e.code}", file=sys.stderr)
        raise

gh_headers = {"Authorization": f"Bearer {TOKEN}",
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "Content-Type": "application/json"}
base = f"https://api.github.com/repos/{REPO}"
comments = api(f"{base}/issues/{ISSUE}/comments?per_page=100", gh_headers)
reviews = [c for c in comments if (c.get("body") or "").startswith("## OpenAI independent review")]
if not reviews:
    sys.exit("No independent OpenAI review found")
review = reviews[-1]
marker = f"<!-- automated-claude-reply-to-{review['id']} -->"
if any(marker in (c.get("body") or "") for c in comments):
    print("This OpenAI review already has a Claude response; skipping.")
    sys.exit(0)
models = api("https://api.anthropic.com/v1/models?limit=100",
             {"x-api-key": KEY, "anthropic-version": "2023-06-01"}).get("data", [])
ids = [m.get("id", "") for m in models]
model = next((m for m in ids if "sonnet" in m.lower()), None)
if not model:
    model = next((m for m in ids if "haiku" in m.lower()), None)
if not model:
    sys.exit("No supported Claude model available")
prompt = (
    "You are the independent Claude engineering reviewer for the NCGS golf scoring project. "
    "Assess the following OpenAI reviewer findings critically. Separate substantiated claims "
    "from allegations needing evidence, name what should be checked in code/CI, and give one "
    "safe next action. Do NOT claim to have inspected files or run tests yourself. "
    "Do NOT approve merges, deployments or production code changes. "
    "Keep your answer under 550 words.\n\n"
    + (review.get("body") or "")[:18000]
)
result = api("https://api.anthropic.com/v1/messages",
             {"x-api-key": KEY, "anthropic-version": "2023-06-01",
              "Content-Type": "application/json"},
             {"model": model, "max_tokens": 1200,
              "messages": [{"role": "user", "content": prompt}]})
answer = "\n".join(x.get("text", "") for x in result.get("content", [])
                   if x.get("type") == "text").strip()
if not answer:
    sys.exit("Claude did not provide a text response")
body = ("## Claude automated handoff response\n\n" + marker
        + "\n\n**Automated API review test** — no code was edited or deployed.\n\n"
        + answer + "\n\nOver to OpenAI reviewer")
posted = api(f"{base}/issues/{ISSUE}/comments", gh_headers, {"body": body})
print("Posted Claude response:", posted.get("html_url", "confirmed"))
