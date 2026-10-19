#!/usr/bin/env python3
"""NCGS agent cycle: Claude codes -> hard gates -> independent OpenAI review -> Claude revises. Bounded rounds.

Runs inside .github/workflows/agent-cycle.yml. It comes from the trusted control checkout, so the coding agent
cannot edit it, the gates or the reviewer. Rules it enforces:
- work happens on a fresh branch agent/run-<id> cut from BASE (the design branch); never on main
- the coding agent gets only the Anthropic key: no GitHub token, no OpenAI key; the workflow commits and pushes
- at most MAX_ROUNDS coding rounds; a run never starts another run; bot comments start nothing
- approved (all hard gates pass, reviewer has no BLOCKER/ACTIONABLE) -> fast-forward into BASE when MODE=merge,
  otherwise a draft pull request into BASE; anything else -> draft pull request + owner mention, labelled
- production (main) is never touched: that only happens through a pull request the owner approves
"""
import json, os, re, subprocess, sys, base64, urllib.request, urllib.error, pathlib, time

E = os.environ
CTL = pathlib.Path(E["CTL"]).resolve()            # trusted control checkout (this script, gates, reviewer)
WORK = pathlib.Path(E["WORK"]).resolve()          # checkout of BASE where the agent works
OUT = pathlib.Path(E.get("OUT", "agent-out")).resolve()
BASE = E.get("BASE", "design/crest-editorial-prototype")
REPO = E["GITHUB_REPOSITORY"]
ISSUE = int(E.get("ISSUE", "1"))
RUN_ID = E.get("GITHUB_RUN_ID", str(int(time.time())))
RUN_URL = f'{E.get("GITHUB_SERVER_URL", "https://github.com")}/{REPO}/actions/runs/{RUN_ID}'
MAX_ROUNDS = max(1, min(3, int(E.get("MAX_ROUNDS", "3"))))   # 1 build + at most 2 revisions
MODE = E.get("MODE", "pr")                                   # "merge" or "pr"
OWNER = REPO.split("/")[0]
BRANCH = f"agent/run-{RUN_ID}"
TASK = pathlib.Path(E["TASK_FILE"]).read_text().strip()
GH = {"Authorization": "Bearer " + E["GITHUB_TOKEN"], "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
API = f"https://api.github.com/repos/{REPO}"
OUT.mkdir(parents=True, exist_ok=True)


def http(url, headers, data=None, method=None, timeout=60):
    req = urllib.request.Request(url, data=None if data is None else json.dumps(data).encode(), headers={**headers, "Content-Type": "application/json"}, method=method or ("POST" if data is not None else "GET"))
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read()
        return json.loads(body) if body else {}


def comment(body):
    body = body if len(body) < 60000 else body[:60000] + "\n\n…(cut to fit GitHub's limit; full text in the run's artefacts)"
    try:
        return http(f"{API}/issues/{ISSUE}/comments", GH, {"body": body}).get("html_url", "")
    except Exception as e:
        print("could not comment:", e)
        return ""


def sh(cmd, cwd=WORK, env=None, timeout=None, check=False):
    r = subprocess.run(cmd, cwd=cwd, env=env, timeout=timeout, capture_output=True, text=True, shell=isinstance(cmd, str))
    if check and r.returncode:
        raise RuntimeError(f"{cmd} failed: {r.stderr[-2000:]}")
    return r


def git(*a, check=True):
    return sh(["git", *a], check=check).stdout.strip()


def read(rel, limit):
    p = WORK / rel
    return p.read_text(errors="replace")[:limit] if p.exists() else "[missing]"


# ---------------- coding agent ----------------
CLAUDE_TOOLS = ",".join([
    "Read", "Write", "Edit", "Glob", "Grep",
    "Bash(node:*)", "Bash(NCGS_FIXTURE=1 node:*)", "Bash(NCGS_FIXTURE=1 NCGS_DESIGN=editorial node:*)",
    "Bash(sh tools/guard.sh:*)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(git log:*)", "Bash(git show:*)",
    "Bash(ls:*)", "Bash(grep:*)", "Bash(python3 -m http.server:*)",
])
CLAUDE_DENY = "Bash(git push:*),Bash(git commit:*),Bash(git checkout:*),Bash(git reset:*),Bash(curl:*),Bash(wget:*),WebFetch,WebSearch"


def claude_prompt(rnd, review, gates, report):
    p = f"""You are the NCGS coding agent in an automated cycle: you code, the workflow runs hard tests, an independent
OpenAI reviewer reviews, you revise. This is round {rnd} of at most {MAX_ROUNDS}. Nobody is watching live.

First read CLAUDE.md and docs/CLAUDE-HANDOVER.md, then the files the task needs.

TASK (from the owner or the design lead on GitHub issue #{ISSUE}):
{TASK}

Rules:
- Do only this task. If it needs a product or design decision that is not already recorded as DECIDED, do not guess:
  write it under NEEDS OWNER in your report and do the parts that do not depend on it.
- Never edit .github/, tools/agent/, src/engine.js, src/server.js, src/app/00-core.js, src/app/10-data.js, data/
  (except regenerating data/fixture-seed.json with node tools/make-fixture.js), site/ or deploy.json. Never create data/seed.json.
- Do not commit, push or switch branches: the workflow commits your changes after the tests.
- Before finishing run: node --test test/engine.test.js test/server.test.js   and   sh tools/guard.sh {BASE_SHA}
  The workflow then runs the full hard gates (layout at 360/390/135%, several phones, whole round, design comparison).
- Do not weaken a test to make it pass. If a test is wrong, say so with evidence in your report and leave it.
"""
    if rnd > 1:
        p += f"""
LAST ROUND'S HARD GATES (from the workflow, not from you):
{json.dumps(gates, indent=1)[:12000]}

INDEPENDENT REVIEW OF LAST ROUND (OpenAI). It can be wrong. For EVERY finding id: fix it, or answer DISAGREE with
concrete evidence (file:line, command output), or QUESTION. Do not accept a claim you have not checked.
{json.dumps(review, indent=1)[:20000]}

YOUR REPORT FROM LAST ROUND:
{report[:6000]}
"""
    p += """
Fix problems yourself where you can (a failing command, a wrong path, a test you can run). Only NEEDS OWNER for a
real product/design decision, an approval for anything production, or a setting only the owner can change.

Finish with exactly this section (it is posted to the issue and given to the reviewer). Its first line is one plain
English sentence the owner (not a developer) can understand: what you did and whether it worked.
## Report
- Changed: files and what changed
- Ran: each command and its result (pass/fail counts)
- Findings: one line per reviewer finding id: FIXED / DISAGREE / QUESTION, with evidence (round 2+ only)
- Risks: anything not verified (e.g. needs a real iPhone)
- NEEDS OWNER: a plain-English question, or "none"
"""
    return p


def run_claude(rnd, review, gates, report):
    env = {k: v for k, v in E.items() if k not in ("GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY", "ACTIONS_RUNTIME_TOKEN", "ACTIONS_ID_TOKEN_REQUEST_TOKEN")}
    cmd = ["claude", "-p", claude_prompt(rnd, review, gates, report), "--output-format", "json", "--max-turns", E.get("CLAUDE_MAX_TURNS", "40"),
           "--permission-mode", "acceptEdits", "--allowedTools", CLAUDE_TOOLS, "--disallowedTools", CLAUDE_DENY]
    if E.get("CLAUDE_MODEL"):
        cmd += ["--model", E["CLAUDE_MODEL"]]
    try:
        r = sh(cmd, env=env, timeout=int(E.get("CLAUDE_TIMEOUT", "1800")))
    except subprocess.TimeoutExpired:
        return "## Report\nThe coding agent ran out of time this round.", False
    (OUT / f"claude-{rnd}.json").write_text(r.stdout or r.stderr)
    try:
        res = json.loads(r.stdout)
        text = res.get("result") or ""
        ok = not res.get("is_error")
    except Exception:
        text, ok = (r.stdout or r.stderr)[-6000:], False
    m = text.find("## Report")
    return (text[m:] if m >= 0 else text[-6000:]).strip(), ok


# ---------------- hard gates ----------------
def run_gates(rnd):
    out = OUT / f"gates-{rnd}"
    r = sh(["bash", str(CTL / "tools/agent/gates.sh"), str(WORK), BASE_SHA, str(out)], timeout=3600)
    (out / "gates.txt").write_text(r.stdout + r.stderr)
    try:
        return json.loads((out / "gates.json").read_text())
    except Exception:
        return {"hard_ok": False, "checks": [{"name": "gates", "kind": "hard", "result": "fail", "detail": (r.stdout + r.stderr)[-1500:]}]}


# ---------------- independent review ----------------
REVIEW_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "required": ["verdict", "summary", "findings", "owner_question"],
    "properties": {
        "verdict": {"type": "string", "enum": ["approve", "revise", "escalate"]},
        "summary": {"type": "string"},
        "owner_question": {"type": "string"},
        "findings": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["id", "severity", "file", "claim", "evidence", "demonstrated", "reply_to_claude"],
            "properties": {
                "id": {"type": "string"},
                "severity": {"type": "string", "enum": ["BLOCKER", "ACTIONABLE", "QUESTION", "NOTE"]},
                "file": {"type": "string"}, "claim": {"type": "string"}, "evidence": {"type": "string"},
                "demonstrated": {"type": "boolean"}, "reply_to_claude": {"type": "string"}}}},
    },
}
REVIEW_RULES = """You are the independent reviewer in the NCGS agent cycle (a golf society scoring app; owner is not a developer).
Review ONE round of work by the Claude coding agent against the task, CLAUDE.md, the handover, the diff and the
workflow's hard-gate results (those results are produced by the workflow, not by Claude, and are reliable).
- Ground every finding in the diff, a gate result or a named rule. Mark demonstrated=true only if the diff or a gate
  result shows it. Speculation is a NOTE at most. Do not repeat generic advice already handled in the handover.
- BLOCKER: breaks a CLAUDE.md rule, a hard gate failed, scoring/sync/data risk, out of scope, or weakens a test.
  ACTIONABLE: should be fixed within this task. QUESTION: you need an answer. NOTE: no action needed.
- Keep ids stable across rounds (R1, R2, ...). If Claude answered DISAGREE with evidence, check it: either accept
  (drop the finding, say so in reply_to_claude) or keep it with stronger evidence. If the same disagreement is
  still unresolved after Claude's evidence, verdict "escalate" - do not loop.
- verdict "approve" only if every hard gate passed and no BLOCKER or ACTIONABLE remains.
  "escalate" if a product/design decision is needed from the owner (put one plain-English question in
  owner_question), the task cannot be done without touching protected files, or the round limit makes further
  revision pointless. Otherwise "revise".
- Never ask for anything to be merged to main, deployed or published. That is only ever the owner's decision.
- Start "summary" with one plain-English sentence the owner (not a developer) can follow.
- Only put a question in owner_question if it truly needs the owner: a product/design decision, approval of a
  production change, or a setting only the owner can change. Everything else the agents settle between them."""


def review(rnd, gates, report, prev):
    diff = git("diff", "--stat", BASE_SHA, "HEAD") + "\n\n" + git("diff", BASE_SHA, "HEAD")
    text = (f"TASK:\n{TASK}\n\nROUND {rnd} of {MAX_ROUNDS}\n\nCLAUDE.md:\n{read('CLAUDE.md', 9000)}\n\nHANDOVER:\n{read('docs/CLAUDE-HANDOVER.md', 9000)}\n\n"
            f"HARD GATES (workflow):\n{json.dumps(gates, indent=1)[:10000]}\n\nCLAUDE'S REPORT:\n{report[:8000]}\n\n"
            f"YOUR PREVIOUS REVIEW:\n{json.dumps(prev, indent=1)[:12000] if prev else 'none (first round)'}\n\nDIFF vs base {BASE_SHA[:12]}:\n{diff[:70000]}")
    content = [{"type": "input_text", "text": text}]
    # The two screens that changed most (base left, this round right), so the reviewer sees the look, not only code.
    try:
        rep = json.loads((OUT / f"gates-{rnd}/design/editorial/report.json").read_text())
        top = sorted([x for x in rep if x["size"] == "390"], key=lambda x: -float(str(x["pixels"]).split("%")[0] or 0))[:int(E.get("REVIEW_IMAGES", "2"))]
        for x in top:
            for tag in ("a", "b"):
                f = OUT / f"gates-{rnd}/design/editorial/{x['screen']}-390-{tag}.png"
                if f.exists():
                    content.append({"type": "input_image", "image_url": "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()})
            content.append({"type": "input_text", "text": f"Images above: {x['screen']} at 390px, editorial look, base then this round ({x['pixels']} pixels changed)."})
    except Exception:
        pass
    req = {"model": E.get("OPENAI_REVIEW_MODEL", "gpt-5-mini"), "instructions": REVIEW_RULES,
           "input": [{"role": "user", "content": content}], "max_output_tokens": 12000,
           "text": {"format": {"type": "json_schema", "name": "review", "strict": True, "schema": REVIEW_SCHEMA}}}
    try:
        res = http("https://api.openai.com/v1/responses", {"Authorization": "Bearer " + E["OPENAI_API_KEY"]}, req, timeout=300)
        out = "".join(c.get("text", "") for i in res.get("output", []) for c in i.get("content", []) or [] if c.get("type") == "output_text")
        data = json.loads(out)
    except Exception as e:
        detail = e.read().decode()[:500] if isinstance(e, urllib.error.HTTPError) else str(e)[:500]
        data = {"verdict": "escalate", "summary": f"The reviewer could not be reached or replied badly: {detail}", "findings": [], "owner_question": ""}
    (OUT / f"review-{rnd}.json").write_text(json.dumps(data, indent=1))
    # The workflow, not the model, has the last word on hard gates.
    if data["verdict"] == "approve" and not gates.get("hard_ok"):
        data["verdict"] = "revise"
        data["summary"] += " (Overridden by the workflow: a hard gate failed, so this cannot be approved.)"
    if data["verdict"] == "approve" and any(f["severity"] in ("BLOCKER", "ACTIONABLE") for f in data["findings"]):
        data["verdict"] = "revise"
    return data


# ---------------- reporting ----------------
def gates_table(g):
    rows = "\n".join(f'| {"✅" if c["result"] == "ok" else "❌" if c["kind"] == "hard" else "ℹ️"} | {c["name"]} | {c["kind"]} | {c["detail"][:160]} |' for c in g["checks"])
    return "| | Check | Kind | Result |\n|---|---|---|---|\n" + rows


def findings_list(rv):
    if not rv["findings"]:
        return "_No findings._"
    return "\n".join(f'- **{f["id"]} {f["severity"]}**{" (shown)" if f["demonstrated"] else ""} `{f["file"]}`: {f["claim"]}'
                     + (f'\n  Evidence: {f["evidence"]}' if f["evidence"] else "") + (f'\n  To Claude: {f["reply_to_claude"]}' if f["reply_to_claude"] else "")
                     for f in rv["findings"])


def main():
    global BASE_SHA
    git("checkout", "-q", "-b", BRANCH)
    BASE_SHA = git("rev-parse", "HEAD")
    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    comment(f"## Agent cycle started\n\n**STATUS:** working · **Owner:** automation · [run {RUN_ID}]({RUN_URL})\n\n"
            f"Base `{BASE}` at `{BASE_SHA[:12]}` → branch `{BRANCH}` · up to {MAX_ROUNDS} rounds · on approval: "
            f"{'fast-forward into ' + BASE if MODE == 'merge' else 'draft pull request into ' + BASE} · `main` is never touched.\n\n**Task**\n\n> " + TASK.replace("\n", "\n> "))
    review_data, gates, report, status, changed = None, {}, "", "error", False
    for rnd in range(1, MAX_ROUNDS + 1):
        report, ok = run_claude(rnd, review_data, gates, report)
        sh(["git", "add", "-A"])
        if sh(["git", "diff", "--cached", "--quiet"]).returncode:
            git("commit", "-q", "-m", f"Agent round {rnd}: {TASK.splitlines()[0][:60]}\n\nAutomated agent cycle, run {RUN_URL}")
            changed = True
        gates = run_gates(rnd)
        review_data = review(rnd, gates, report, review_data)
        head = git("rev-parse", "HEAD")
        comment(f"## Agent cycle · round {rnd} of {MAX_ROUNDS}\n\n**Commit:** `{head[:12]}` · **Reviewer verdict:** **{review_data['verdict'].upper()}** · [run]({RUN_URL})\n\n"
                f"### Hard gates (run by the workflow)\n{gates_table(gates)}\n\n### Claude (coding)\n{report[:12000]}\n\n"
                f"### OpenAI (independent review)\n{review_data['summary']}\n\n{findings_list(review_data)}")
        if not ok and not changed:
            status = "error"; break
        if review_data["verdict"] == "approve":
            status = "approved"; break
        if review_data["verdict"] == "escalate":
            status = "escalated"; break
        status = "out-of-rounds"
    finish(status, review_data, gates, report, changed)


def push(ref):
    tok = base64.b64encode(f"x-access-token:{E['GITHUB_TOKEN']}".encode()).decode()
    return sh(["git", "-c", f"http.extraheader=AUTHORIZATION: basic {tok}", "push", "origin", ref])


def finish(status, rv, gates, report, changed):
    head = git("rev-parse", "HEAD")
    where, pr_url = "", ""
    if changed:
        push(f"HEAD:refs/heads/{BRANCH}")
        merged = False
        if status == "approved" and MODE == "merge":
            r = push(f"HEAD:refs/heads/{BASE}")      # fast-forward only: refused if the base moved meanwhile
            merged = r.returncode == 0
            where = f"fast-forwarded `{BASE}` to `{head[:12]}`" if merged else f"`{BASE}` moved during the run, so it was not updated"
        if not merged:
            try:
                pr = http(f"{API}/pulls", GH, {"title": f"[agent] {TASK.splitlines()[0][:70]}", "head": BRANCH, "base": BASE, "draft": True,
                                               "body": f"Automated agent cycle [run {RUN_ID}]({RUN_URL}), status **{status}**. Review thread: #{ISSUE}.\n\nInto `{BASE}`, never `main`."})
                pr_url = pr.get("html_url", "")
                where = (where + "; " if where else "") + f"draft pull request {pr_url}"
            except Exception as e:
                where = (where + "; " if where else "") + f"branch `{BRANCH}` pushed (pull request not created: {str(e)[:120]}; check that Actions may create pull requests)"
    else:
        where = "no file changes"
    needs = {"approved": "nothing: done", "escalated": f"@{OWNER} a decision is needed", "out-of-rounds": f"@{OWNER} or the design lead: the agents did not converge in {MAX_ROUNDS} rounds",
             "error": f"@{OWNER} the run failed; see the run log"}[status]
    q = rv.get("owner_question") if rv else ""
    comment(f"## Agent cycle finished · {status.upper()}\n\n**STATUS:** {'ready' if status == 'approved' else 'review needed'} · **Tested commit:** `{head[:12]}` · [run]({RUN_URL})\n\n"
            f"**Result:** {where}\n\n**Needs:** {needs}" + (f"\n\n**Question for the owner:** {q}" if q and status != "approved" else "")
            + "\n\n`main` and the live app were not touched. Anything for production goes through a pull request the owner approves.")
    try:
        http(f"{API}/issues/{ISSUE}/labels", GH, {"labels": [f"agent:{status}"]})
    except Exception:
        pass
    with open(E.get("GITHUB_STEP_SUMMARY", os.devnull), "a") as s:
        s.write(f"## Agent cycle: {status}\n\n{where}\n\n{gates_table(gates) if gates else ''}\n")
    sys.exit(0 if status in ("approved", "escalated", "out-of-rounds") else 1)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        comment(f"## Agent cycle failed\n\n[run {RUN_ID}]({RUN_URL}): {str(e)[:1500]}\n\n@{OWNER} nothing was merged; `main` was not touched.")
        raise
