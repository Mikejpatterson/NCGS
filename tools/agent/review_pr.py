#!/usr/bin/env python3
"""Claude reviews one pull request when asked (Codex or the owner comments "/claude-review" on it).

Two modes, used by .github/workflows/claude-review.yml:
  check   decides whether a review is due and pins the exact head commit. Runs before any pull request code or model
          tool is touched. Skips a commit that already has a completed verdict; counts every attempt (completed or
          failed) towards MAX_REVIEWS per pull request.
  review  runs from the trusted control checkout on a separate machine from the tests. It reads the pull request at
          the pinned commit (never runs it), checks that the checkout really is that commit, asks Claude with
          read-only tools, and posts a verdict bound to that commit. A failed attempt is marked NO VERDICT and can be
          retried.
Only markers posted by the workflow's own account (github-actions[bot]) in the exact format count, so a quoted or
copied marker cannot suppress a review or use up the limit.
"""
import json, os, pathlib, re, subprocess, sys, urllib.request

E = os.environ
REPO = E["GITHUB_REPOSITORY"]
PR = int(E["PR_NUMBER"])
API = f"https://api.github.com/repos/{REPO}"
GH = {"Authorization": "Bearer " + E["GITHUB_TOKEN"], "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
RUN_URL = f'{E.get("GITHUB_SERVER_URL", "https://github.com")}/{REPO}/actions/runs/{E.get("GITHUB_RUN_ID", "?")}'
MAX_REVIEWS = int(E.get("MAX_REVIEWS", "5"))
PUBLISHER = "github-actions[bot]"
MARK = re.compile(r'^<!-- claude-review sha=([0-9a-f]{40}) verdict=(APPROVE|CHANGES REQUESTED|NO VERDICT) -->')


def fail(msg):
    print(f"::error title=Claude review::{msg}")   # an annotation, readable through the checks API
    sys.exit(1)


def http(url, data=None):
    req = urllib.request.Request(url, data=None if data is None else json.dumps(data).encode(), headers={**GH, "Content-Type": "application/json"},
                                 method="POST" if data is not None else "GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read() or b"{}")


def all_comments():
    out, page = [], 1
    while True:
        batch = http(f"{API}/issues/{PR}/comments?per_page=100&page={page}")
        out += batch
        if len(batch) < 100:
            return out
        page += 1


def markers():
    found = []
    for c in all_comments():
        m = MARK.match(c.get("body") or "")
        if m and (c.get("user") or {}).get("login") == PUBLISHER:
            found.append((m.group(1), m.group(2)))
    return found


def comment(body):
    return http(f"{API}/issues/{PR}/comments", {"body": body[:60000]}).get("html_url", "")


def output(**kv):
    with open(E.get("GITHUB_OUTPUT", os.devnull), "a") as f:
        for k, v in kv.items():
            f.write(f"{k}={v}\n")


def check():
    try:
        pr = http(f"{API}/pulls/{PR}")
    except Exception as e:
        fail(f"could not read pull request {PR}: {e}")
    head, base = pr["head"]["sha"], pr["base"]["ref"]
    try:
        seen = markers()
    except Exception as e:
        fail(f"could not read the review history: {e}")
    if any(sha == head and verdict != "NO VERDICT" for sha, verdict in seen):
        print(f"{head[:12]} already has a completed Claude review; nothing to do.")
        output(run="false", pr=PR, head=head, base=base); return
    if len(seen) >= MAX_REVIEWS:
        comment(f"Claude review limit reached ({MAX_REVIEWS} attempts on this pull request). @{REPO.split('/')[0]} decide whether more are needed. [run]({RUN_URL})")
        output(run="false", pr=PR, head=head, base=base); return
    output(run="true", pr=PR, head=head, base=base)


def review():
    head, base = E["HEAD"], E["BASE"]
    work = pathlib.Path(E["WORK"]).resolve()

    def git(*a):
        r = subprocess.run(["git", *a], cwd=work, capture_output=True, text=True)
        if r.returncode:
            fail(f"git {' '.join(a)} failed: {r.stderr[-300:]}")
        return r.stdout

    if git("rev-parse", "HEAD").strip() != head:
        fail(f"the checkout is not the pinned commit {head}")
    git("fetch", "-q", "origin", base)
    stat, diff = git("diff", "--stat", f"origin/{base}...{head}"), git("diff", f"origin/{base}...{head}")
    if not stat.strip():
        fail("empty diff against the base; refusing to review nothing")
    pr = http(f"{API}/pulls/{PR}")
    tests = E.get("TEST_RESULTS_TEXT") or "not available"
    if f"commit: {head}" not in tests:
        tests = "(test results do not name this commit, so treat them as missing)\n" + tests

    prompt = f"""You are Claude, reviewing pull request #{PR} in {REPO} because Codex or the owner asked for it.
Read CLAUDE.md and AGENTS.md first. The working directory is the pull request at commit {head}.

Title: {pr['title']}
Description:
{(pr.get('body') or '')[:6000]}

Tests the workflow ran on this exact commit, on a separate machine with no secrets:
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
    text, ok = "", False
    try:
        r = subprocess.run(["claude", "-p", prompt, "--output-format", "json", "--max-turns", E.get("CLAUDE_MAX_TURNS", "20"),
                            "--allowedTools", "Read,Glob,Grep,Bash(git diff:*),Bash(git log:*),Bash(git show:*)",
                            "--disallowedTools", "Write,Edit,WebFetch,WebSearch"],
                           cwd=work, env=env, capture_output=True, text=True, timeout=int(E.get("CLAUDE_TIMEOUT", "900")))
        res = json.loads(r.stdout)
        text = (res.get("result") or "").strip()
        ok = r.returncode == 0 and not res.get("is_error") and bool(text)
    except Exception as e:
        text = f"(the review could not be completed: {str(e)[:300]})"
    tail = text.rstrip()[-200:]
    verdict = ("APPROVE" if ok and tail.endswith("VERDICT: APPROVE") else
               "CHANGES REQUESTED" if ok and "VERDICT: CHANGES REQUESTED" in tail else "NO VERDICT")
    try:
        url = comment(f"<!-- claude-review sha={head} verdict={verdict} -->\n## Claude review of `{head[:12]}`: {verdict}\n\n{text}\n\n"
                      f"_Automated Claude review requested with `/claude-review` · [run]({RUN_URL}) · applies to commit `{head[:12]}` only; "
                      f"a new commit needs a new review{'; this attempt failed and can be retried' if verdict == 'NO VERDICT' else ''}._")
    except Exception as e:
        fail(f"could not post the review comment: {getattr(e, 'code', '')} {e}")
    print("Posted:", url, verdict)
    if verdict == "NO VERDICT":
        fail("Claude did not finish with a verdict: " + text[-300:].replace("\n", " "))


if __name__ == "__main__":
    {"check": check, "review": review}[sys.argv[1]]()
