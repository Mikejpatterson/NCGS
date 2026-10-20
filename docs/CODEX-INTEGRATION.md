# Codex participation in the existing NCGS cycle

Investigation: 20 October 2026. This is a runbook for the existing system, not a second queue or scheduler.
Read `AGENTS.md`, `CLAUDE.md`, the design handover, and new decisions on issue #1 before acting.

## Find the files on their actual branches

| Source | Branch | Purpose |
| --- | --- | --- |
| `AGENTS.md`, `docs/AGENT-CYCLE.md` | `main` | Roles and operating protocol |
| `.github/workflows/agent-cycle.yml`, `tools/agent/`, `test/agent_cycle_test.py` | `main` | Trusted controller, gates, reviewer and regression tests |
| `CLAUDE.md` | Both main and design | Design copy adds project-specific requirements |
| `docs/CLAUDE-HANDOVER.md` | `design/crest-editorial-prototype` | Design context; some progress/protection statements are historical |
| `.github/agent-queue.md` | `design/crest-editorial-prototype` | The only shared task queue |
| `.github/workflows/design-ci.yml`, `tools/guard.sh`, fixture/browser tools | `design/crest-editorial-prototype` | Design validation |

Main was `a4460a334ea2eceb1fe945aebdf962a552cc3072`; design was
`71247232eeb202441d97a76315fd66f9e9d2804b` when investigated. Re-read remote refs before each action.
An older local checkout lacked the queue; that did not mean the queue was missing remotely.

## What actually runs

- An owner-account **User** comment beginning `/agent-task` starts one task; `/agent-continue` selects the next
  waiting queue item. Codex and Claude connected sessions can post as that account. Do not mistake the shared
  account for independent reviewer identity: sign comments with the agent and record the reviewed SHA.
- `mode: pr` on its own line requests a draft PR for a one-off task. Queue selection uses merge mode.
- One concurrency group serializes the existing cycle. Work starts on `agent/run-<run-id>` from the design branch.
  The trusted controller and gates are checked out separately from the coder's work.
- Claude uses the pinned CLI, restricted tools and its Anthropic credential; the controller strips GitHub/OpenAI
  credentials from that subprocess. The controller commits, tests and pushes. OpenAI Responses API review is a
  separate invocation, not a persistent Codex session.
- Up to three rounds: Claude codes, quick hard gates run, OpenAI reviews task/diff/reports/screenshots, then Claude
  revises. Failed gates or remaining BLOCKER/ACTIONABLE findings override approval. Incomplete timed-out rounds
  retain work without approval. Full applicable checks run after approval.
- Gates always include protected-path checks and engine/server/fuzz tests. App/test changes build both looks and
  run layout checks; app changes also get comparisons. Full app checks include phones, finish and start-hole.
  Screenshot comparisons are informational in the current gate implementation; do not describe them as hard gates.
- Approved work fast-forwards design, or becomes a draft PR. Only successful integration (or an approved no-change
  result) can complete a queue item. `(pause)`, failures, an empty queue and the default five automatic dispatches
  per day stop the chain. A manual continue can resume it; the cap is not a universal spending limit.
- Comments record evidence. Automatic queue continuation uses explicit workflow dispatch, not a bot mention.

Observed evidence: [39459564573](https://github.com/Mikejpatterson/NCGS/actions/runs/39459564573) completed the
long-name task with checks/review, and its issue report records integration at `2e048eb50ed0`. The queue at the
design SHA above marks `ruling-target`, `serif-check`, and `long-names` complete.
[39469125470](https://github.com/Mikejpatterson/NCGS/actions/runs/39469125470) was in progress on
`team-colours-check (pause)`. Do not restart that task or remove its owner-review pause.

## How Codex and Claude work without a message relay

1. Use issue #1 for durable decisions and handoffs; use a PR for specific diff findings. Post STATUS, responsible
   agent, task/run link, exact head/base SHAs, checks, limitations, and the next action. End with the intended
   recipient. An ordinary handoff does not imply that recipient is awake.
2. Before editing queue wording or starting work, read current runs, PRs, the queue and new DECIDED comments.
   Preserve completed ids and pauses. Do not edit the active design branch under a cycle or start duplicate work.
3. Codex can review Claude's actual diff and evidence independently. Claude reviews Codex's proposals. A review
   applies only to the named head SHA; new commits require review again. Never call the shared account's approval
   an independent human approval. Use a signed COMMENT review if self-review restrictions prevent approval.
4. For code contributions, branch from the current design head and open a PR **into design**. Run its guard,
   engine/server tests, and applicable layout/comparison/score-safety checks. The current design CI is push/manual
   only, so a PR alone does not prove these ran. Supply actual logs and execution ids.
5. Trusted controller changes use an isolated branch based on current main. They remain proposals for Claude's
   review and the owner's eventual approval; neither agent merges them. Do not send them through the design
   coder, whose protected-file gate correctly blocks controller/workflow edits.
6. Execute only commands necessary for agreed work. Verify any requested start against an actual Actions run
   id/event/status and its start report. An accepted dispatch or a posted comment is not proof of execution.

The connected GitHub API successfully reads branches, files, runs, rulesets and issues, and posts directly to #1.
During this investigation shell `git fetch` failed to connect to its inherited proxy, and `gh auth status` failed
authentication. Do not replace credentials or bypass the proxy. Use the working connector for branch/tree/commit,
PR and issue operations, then verify the remote tree matches the locally tested files. No owner relay is needed.

## Remaining gaps and boundaries

- **Untested rebase on integration:** the original `finish()` rebased onto concurrent queue/docs commits after
  checks and review, then published a different SHA. The run branch had already been pushed at the old SHA.
  This change removes that retry: retain the tested SHA, create a draft PR on rejection, and leave the queue
  paused. Regression tests cover the divergent-base fallback and unchanged successful fast-forward path. The
  existing workflow now runs offline controller tests from `ctl` before paid model/tool setup. This is proposed
  until the controller change is explicitly approved and integrated; it does not alter a running controller.
- **PR validation:** design CI has no `pull_request` trigger and skips non-design refs. A future change should
  extend that existing workflow with read-only PR checks using trusted controls. Do not add another coding lane.
- **Persistent Codex activation is not established:** an earlier Codex bot response on #1 asked for a repository
  environment. No current workflow has a Codex coding/review executor or a two-hour schedule. This session's direct
  API access proves participation while active, not unattended future polling. Do not rename the existing API
  reviewer as Codex, create a paid executor, or claim account review settings were enabled.
- **Legacy proof paths remain:** main still contains `automation-coding-kickoff`, `automation-smoke`,
  `claude-coding-proof`, `two-agent-handoff-test`, `claude-review-response`, `claude-design` and
  `openai-design-review` workflows. Some dispatch separate writers outside the cycle's concurrency group.
  Avoid invoking them. Retirement belongs in Claude's reviewed controller maintenance, not an improvised replacement.
- **Deployment remains coupled to main:** `site.yml` deploys on every main push. The active `Protect live app`
  ruleset requires a PR and blocks deletion/force-push with no bypass, but requires zero approving reviews and
  no status checks. This is weaker than an enforced owner-only approval gate. Branch-protection API access was
  denied to the connector; the ruleset itself was readable. Do not claim stronger protection or relax it.
- **Historical instructions:** the design handover still says main is unprotected and refers to a pre-merge
  controller branch. Current rulesets, queue completion marks and issue decisions supersede those dated status
  statements. Keep its design/data invariants. Refresh it in a separate design-branch contribution after the active run.

Never push or merge into main, deploy the live app, change secrets/protections, or treat silence as approval.
No account settings, new scheduler, extra model run, queue reset or production change is part of this integration.
