# Codex audit and handover to Claude — 19 October 2026

## Task record

- Task: audit existing automation and make the smallest safe collaboration improvements.
- Assigned by: repository owner, in the cloud Codex task.
- Executing agent: Codex, active cloud session; not a GitHub Actions run.
- Branch: `automation/codex-cycle-audit`, based on main `f224c4e5e17d12e98eb58a72fe35eab1c8a8ef0a`.
- Status: local changes tested; GitHub API access blocked by this environment's egress proxy.
- Acceptance: preserve the existing queue, Claude executor, independent review and production boundaries;
  test concrete fixes; exchange evidence through GitHub without claiming unverified execution.
- Next action: publish this branch, then open a dedicated automation review PR and post the findings to issue #1
  when GitHub API access works. This record does not claim a PR, issue comment or new agent run exists.
- Owner decision: no product/release decision requested. The environment needs access to `api.github.com`.
- Tests: 8 offline orchestrator regression tests and 78 existing engine/server/fuzz tests passed.
- Paid API calls, workflow dispatches, merges and deployments performed by this session: none.

## What is authoritative

The current main branch contains `.github/workflows/agent-cycle.yml`, `tools/agent/run.py`,
`tools/agent/gates.sh`, `tools/agent/queue.py` and `docs/AGENT-CYCLE.md`. The intended work branch is
`design/crest-editorial-prototype`, fetched at `7e0fac6e51f22f6bc6a95b108c7e4a80bffdd7ae`.
The control workflow runs Claude CLI coding, then trusted hard gates, then an OpenAI Responses API review,
with at most three rounds. It may update only the design branch and dispatch the next eligible queue task.
The API reviewer is not an autonomous Codex coding session.

The only discovered queue is `.github/agent-queue.md` on `queue/initial-list` at
`bed9ea71018aa7ba5669f0791d80720f8e263588`. It is absent from the fetched design branch.
That candidate queue lists `serif-check`, `ruling-target`, `long-names (pause)` and
`team-colours-check (pause)`. The cycle reads the queue from the design branch (workflow lines 88–95),
so it cannot find these tasks yet. Do not recreate a second queue or silently assume the candidate was accepted.
Check issue #1 and the queue PR before integrating that exact list.

`docs/CLAUDE-HANDOVER.md` exists on the design branch, not main. It records the design decisions and
fixture workflow; its old activation statements must be checked against current GitHub state.
`docs/AGENT-QUEUE.md` was not found in the inspected branches.

Git reads through the existing HTTPS proxy worked. Authenticated `gh api`, PR listing and run listing failed;
unauthenticated HTTPS CONNECT to `api.github.com` also returned 403. This establishes a network blocker,
not a missing GitHub credential. Latest issue #1 comments, open PRs, run/job state and branch protection
could not be checked. PR #2 being closed is supplied by the owner, not independently reverified here.

## Blocking findings for Claude

1. **The queue is not installed where the runner reads it.** See the branch evidence above. Review the existing
   queue PR and agreed issue decisions; install the same queue on the design branch through the normal review
   path. No task ownership or queue status was changed during this audit.
2. **A failed Claude invocation could still be accepted.** `run_claude` ignored the subprocess exit code,
   and `main` rejected failure only if no changes had ever been made. A failed round with partial changes and an
   approving review could be marked approved and advance the list. This branch checks both process/model status
   and prevents a failed coder from reaching the approved path. Regression tests simulate that exact combination.
3. **A failed branch push could be reported as pushed.** `finish` ignored its first push result, then attempted a PR
   and potentially further work. It now stops before PR creation or queue advancement when that push fails.
4. **False owner intervention.** Any PR API error was attributed to the owner-only Actions setting, including a
   temporary API failure or invalid head/base. This branch retains the actual error and routes diagnosis to automation
   without inventing a setting requirement. Other generic escalation/owner mentions remain for separate review.
5. **Unverified execution claim.** A successful workflow-dispatch request was reported as “Started”. It now reports
   an accepted request and explicitly says execution is unverified. A future improvement should correlate the task ID
   with an actual run/job before changing its state to running.

This branch also adds an explicit exact design-base guard and an allowlist of push destinations, including the
current run branch. It rejects main, arbitrary branches and force-prefixed refspecs before invoking Git.
It does not replace server-side branch protection; current protection state still needs API verification.

These are edits to the trusted orchestrator itself. They require a dedicated human/independent automation review;
ordinary coding-agent protected-file checks must continue to reject edits under `tools/agent/`.
Do not exempt this branch from those checks or ask the ordinary coding agent to merge its own controller changes.

## Dashboard findings (not modified or deployed)

`site/control-centre/index.html` still contains multiple fallback links and statements treating PR #2 as pending.
Its automation-name matcher does not include `NCGS agent cycle`; the Claude/OpenAI cards also infer agents from
separate workflow names, although both execute inside the cycle. Job lookup returns an empty list in the snapshot
adapter. This cannot identify which agent is currently executing inside the cycle.

`tools/dashboard_snapshot.py:13` requests only the first 100 issue comments and slices the last 20 of that first
page: once issue #1 exceeds 100 comments, newer decisions and handoffs disappear. It gathers neither queue contents,
PR state nor job steps. Snapshots can therefore be fresh timestamps over incomplete information. The browser adapter
also starts three parallel snapshot fetches before caching one response, so a refresh can mix generations.

Adapt this dashboard, not a second dashboard. Minimum feed: the exact design-queue commit and ordered tasks,
latest fully paginated issue records, cycle run IDs/attempts, actual jobs/steps, timestamps and PR links.
For each item distinguish waiting, dispatch requested, queued, running, failed, reviewed and accepted.
Owner intervention must be backed by an explicit unresolved question/permission error, not inferred from an idle
workflow, draft PR, failed job, old comment or old commit. On missing/stale evidence, show unknown.
No `site/` files were changed here; rendering and production deployment need their own reviewed change.

## Smallest collaboration integration

Keep Claude responsible for the existing coding cycle. Codex can independently review exact branch commits,
run local tests, create isolated contributions and attach findings to issue #1 and the related PR.
Use the existing queue's task IDs in comments and PRs; never create a second task list. Before claiming a queued
item, check its current assignment and live run so Codex does not duplicate Claude's work.

For durable task metadata, extend each existing queue task with assignment/assigner, acceptance criteria, current
status, UTC start/latest activity, run/commit/PR links, findings, blocker/next action and an explicit owner question
or none. Preserve the checkbox ordering parser and owner-approved pause semantics. Do not treat a comment as a
machine claim or execution receipt: the orchestrator must own a serial claim before dispatch and record its run ID.
The existing global concurrency group serializes this workflow, but does not lock out separate legacy workflows
or an external Codex session. Resolve those competing writers before enabling another unattended coding executor.

No callable tool in this cloud session starts a persistent Codex cloud coding task. GitHub workflow dispatch starts
only the implementation named by that workflow; here that is Claude plus an API reviewer. If unattended Codex
coding is wanted, add a supported Codex executor to this same orchestrator after verifying its current official
interface, credentials, costs and isolation. Preserve the trusted gates, bounded rounds, daily cap and single queue.
Do not deploy an untested action, add a second scheduler, or claim an API review equals a coding handoff.

## Validation and next actions for Claude

```
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s test -p '*_test.py' -v
node --test test/engine.test.js test/server.test.js test/fuzz.engine.test.js test/fuzz.server.test.js
git diff --check
```

Eight orchestrator regressions passed; all 78 existing tests passed. Tests mock Git/network/model boundaries and
exercise actual orchestration decisions. They do not demonstrate a live Actions run, queue chain or AI-to-AI
exchange. No scoring, saving, sync, data, published assets, workflow definitions or hard gates were changed.

After API access is enabled: read current issue #1 with pagination, open PRs and active jobs first; publish an issue
handover linking this branch; open the dedicated review PR against the appropriate non-production integration
branch; resolve the existing queue placement; verify actual cycle execution and then update dashboard telemetry.
Do not merge main, activate legacy coding triggers, or dispatch paid runs just to make activity appear on the screen.
