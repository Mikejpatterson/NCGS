#!/usr/bin/env python3
"""Claude reviews one pull request when asked (Codex or the owner comments "/claude-review" on it).

Runs inside .github/workflows/claude-review.yml from the trusted control checkout. The pull request's code is only
read, never run here: its tests run in an earlier step without any secrets, and their results are passed in.
Claude gets read-only tools and only the Anthropic key. The verdict is bound to the exact head commit; a review of
the same commit is not repeated, and at most MAX_REVIEWS reviews are posted per pull request (spending limit).
"""
import json, os, pathlib, subprocess, sys, urllib.request

E = os.environ
REPO, PR = E["GITHUB_REPOSITORY"], int(E["PR_NUMBER"])
WORK = pathlib.Path(E["WORK"]).resolve()
API = f"https://api.github.com/repos/{REPO}"
GH = {"Authorization": "Bearer " + E["GITHUB_TOKEN"], "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
RUN_URL = f'{E.get("GITHUB_SERVER_URL", "https://github.com")}/{REPO}/actions/runs/{E.get("GITHUB_RUN_ID", "?")}'
MAX_REVIEWS = int(E.get("MAX_REVIEWS", "5"))
MARK = "<!-- claude-review sha="


def http(url, data=None):
    req = urllib.request.Request(url, data=None if data is None else json.dumps(data).encode(), headers={**GH, "Content-Type": "application/json"},
                                 method="POST" if data is not None else "GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read() or b"{}")


def sh(*cmd, env=None, timeout=None):
    return subprocess.run(cmd, cwd=WORK, env=env, timeout=timeout, capture_output=True, text=True)


def comment(body):
    return http(f"{API}/issues/{PR}/comments", {"body": body[:60000]}).get("html_url", "")


def fail(msg):
    print(f"::error title=Claude review::{msg}")   # shows as an annotation, readable through the checks API
    sys.exit(1)


try:
    pr = http(f"{API}/pulls/{PR}")
except Exception as e:
    fail(f"could not read pull request {PR}: {e}")
head, base = pr["head"]["sha"], pr["base"]["ref"]
done = [c["body"] for c in http(f"{API}/issues/{PR}/comments?per_page=100") if MARK in (c.get("body") or "")]
if any(f"{MARK}{head} " in b for b in done):
    print(f"Already reviewed {head[:12]}; nothing to do."); sys.exit(0)
if len(done) >= MAX_REVIEWS:
    comment(f"Claude review limit reached ({MAX_REVIEWS} reviews on this pull request). @{REPO.split('/')[0]} decide whether more are needed. [run]({RUN_URL})")
    sys.exit(0)

sh("git", "fetch", "-q", "origin", base)
stat = sh("git", "diff", "--stat", f"origin/{base}...HEAD").stdout
diff = sh("git", "diff", f"origin/{base}...HEAD").stdout
tests = pathlib.Path(E.get("TEST_RESULTS", "/dev/null")).read_text(errors="replace")[-6000:] if E.get("TEST_RESULTS") else "not run"

prompt = f"""You are Claude, reviewing pull request #{PR} in {REPO} because Codex or the owner asked for it.
Read CLAUDE.md and AGENTS.md first. The working directory is the pull request at commit {head}.

Title: {pr['title']}
Description:
{(pr.get('body') or '')[:6000]}

Tests run by the workflow on this exact commit, without secrets (reliable):
{tests}

Files changed (base {base}):
{stat[:4000]}

Review the actual diff below, and read surrounding code with your tools where needed. Judge it the way the project
works: scores must never be lost; design work stays off main; trusted controls (workflows, tools/agent/) need the owner;
no needless complexity. Ground every point in a file and line. Be brief and concrete; no praise padding.

End with exactly one line, either
VERDICT: APPROVE
or
VERDICT: CHANGES REQUESTED
(changes requested only for real defects or risks, not style).

DIFF:
{diff[:80000]}
"""
env = {k: v for k, v in E.items() if k not in ("GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY", "ACTIONS_RUNTIME_TOKEN", "ACTIONS_ID_TOKEN_REQUEST_TOKEN")}
try:
    r = sh("claude", "-p", prompt, "--output-format", "json", "--max-turns", E.get("CLAUDE_MAX_TURNS", "20"), "--permission-mode", "default",
           "--allowedTools", "Read,Glob,Grep,Bash(git diff:*),Bash(git log:*),Bash(git show:*)",
           "--disallowedTools", "Write,Edit,WebFetch,WebSearch", env=env, timeout=int(E.get("CLAUDE_TIMEOUT", "900")))
    res = json.loads(r.stdout)
    text = (res.get("result") or "").strip()
    ok = r.returncode == 0 and not res.get("is_error") and text
except Exception as e:
    text, ok = f"(the review could not be completed: {str(e)[:300]}; stderr: {(locals().get('r').stderr if locals().get('r') else '')[-300:]})", False

verdict = "APPROVE" if ok and text.rstrip().endswith("VERDICT: APPROVE") else ("CHANGES REQUESTED" if ok and "VERDICT: CHANGES REQUESTED" in text[-200:] else "NO VERDICT")
try:
  url = comment(f"{MARK}{head} verdict={verdict} -->\n## Claude review of `{head[:12]}`: {verdict}\n\n{text}\n\n"
              f"_Automated Claude review requested with `/claude-review` · [run]({RUN_URL}) · applies to commit `{head[:12]}` only; a new commit needs a new review._")
except Exception as e:
    fail(f"could not post the review comment: {getattr(e, 'code', '')} {e}")
print("Posted:", url, verdict)
if verdict == "NO VERDICT":
    fail("Claude did not finish with a verdict: " + text[-300:].replace("\n", " "))
