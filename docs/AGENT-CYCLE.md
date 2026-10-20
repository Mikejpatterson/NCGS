# The agent cycle: how Claude and the OpenAI reviewer work without anyone passing messages

## In one paragraph
Someone writes a task on GitHub issue #1, starting the comment with `/agent-task`. GitHub then runs the
**NCGS agent cycle** workflow. Claude makes the change on a fresh branch. The workflow runs the hard tests itself.
An independent OpenAI reviewer reads the change, the test results and screenshots, and replies with findings.
Claude fixes each finding or disagrees with evidence. This repeats at most three times, in one run. Every round is
posted to the issue. When the reviewer approves and every hard test passes, the change goes into the design branch.
Otherwise a draft pull request waits, and the owner is mentioned only when a decision is needed.
**`main`, the live app, is never touched.** Production changes only happen through a pull request the owner approves.

## Who can start it
- Only comments from the owner's GitHub account. That covers the owner and ChatGPT posting through the owner's GitHub connection.
- Comments from bots never start it, so the agents cannot set each other off in a loop.
- Also: Actions → NCGS agent cycle → Run workflow.

Write the task as a plain instruction:

```
/agent-task
Stage 3 proposal: hole header with a PAR | SI stat block (see DECIDED on issue #1). Screenshots at 360, 390, 135%.
```
Add a line `mode: pr` to always get a draft pull request instead of an automatic update of the design branch.

Codex uses this same issue and queue. See `docs/CODEX-INTEGRATION.md` for branch locations,
direct contribution/review arrangements, and the distinction between a handoff comment and a verified run.

## Safety
| Risk | What stops it |
|---|---|
| Changes to scoring, saving, sync, real data, the live site, workflows or this automation | Hard gate on protected files. These are also blocked when pushing (the workflow token cannot change workflows). |
| The agent weakening tests or its own checks | The gates, reviewer and orchestrator run from a separate checkout the agent cannot edit. Changed test files are flagged to the reviewer. |
| Endless back-and-forth | At most 3 rounds in one run. A run never starts another. The reviewer must escalate a repeated disagreement. |
| A lost score | Every round runs the several-phones, whole-round and start-hole tests and the engine/server tests. |
| Leaked keys | Claude gets only its own key, with no GitHub token and no OpenAI key. It cannot push, commit or use the web. |
| Anything reaching golfers | Nothing in this cycle can push to `main`. Protecting `main` (owner setting) makes that a hard rule for everyone. |

Before installing model tools or making paid calls, the workflow runs the offline controller regression tests
from its trusted checkout. Approved work is published at the tested SHA only. If a fast-forward is rejected,
the controller retains that run branch and opens a draft PR; it never rebases after testing or advances the
queue on a failed integration. The agents resolve the changed base with fresh checks and review.

## What each round posts on the issue
The commit, a table of hard-test results, Claude's report (changes, commands run, answer to each finding), and the
reviewer's verdict and findings (BLOCKER / ACTIONABLE / QUESTION / NOTE). Logs, reviews and screenshots are kept
with the run for 14 days.

## Settings it needs (owner)
- Secrets `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` (already set).
- Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" (for draft pull requests).
- Optional variables `OPENAI_REVIEW_MODEL` and `AGENT_CLAUDE_MODEL`.
- This file and the workflow must be on `main` for issue comments to start runs. That is the one change to
  `main`, made through a pull request the owner approves.

## How the agents work with the owner (the owner's standing instruction, 19 October 2026)
The owner wants Claude and the OpenAI reviewer (and ChatGPT as design lead) to work together the way a good
colleague does, and to come to the owner only for real input or approval.
- **Keep the owner informed without asking anything.** Every post says, in plain words, what is happening now,
  roughly how long it will take, whether it runs in the background, and what comes next.
- **Fix it yourselves.** Failing commands, wrong paths, broken tests, disagreements between agents and workflow
  bugs are the agents' job to sort out, with evidence, on the issue.
- **Only come to the owner for:** a product or design decision not already DECIDED; approval of anything that
  would change the live app (`main`); a setting, secret or account only the owner can change; spending beyond
  what was agreed; or a problem the agents have tried and failed to solve twice.
- **When you do ask:** mention @Mikejpatterson, ask one plain-English question, give a recommendation, and if
  they must do something by hand, give one step at a time with what they should see on screen.

## The to-do list: tasks run one after another without anyone
The list is `.github/agent-queue.md` on the design branch. The owner and ChatGPT edit it. The coding agent cannot,
because `.github/` is protected. Each task is a heading, with its instruction underneath:

```
## [ ] ruling-target
Make the Ruling question box at least 44px tall at 360, 390 and 135% text in both looks. CSS only.
## [ ] long-names (pause)
...
```
- When a task from the list is approved and merged into the design branch, the workflow ticks it off (`[x]`) and starts the next one.
- **(pause)** after a task's name means: when it's approved, stop and tag the owner to have a look before going on.
- The chain also stops, and tags the owner, when a task is not approved, when the list is empty, or after
  `AGENT_DAILY_LIMIT` automatic tasks in a day (default 5). This keeps spending bounded.
- To carry on after any stop, comment `/agent-continue` on issue #1. That runs the next waiting task.
- A one-off task started with `/agent-task` does not advance the list.

## Speed: quick checks every round, full checks once (owner's instruction, 19 October)
- **Each round** runs only what the change touches: protected files and engine/server tests always; and if app code
  changed, both previews, the layout test on both looks side by side, and a 390px screenshot comparison. About 4 minutes.
  A documents-only change needs about 1 minute.
- **Once, after the reviewer approves**, the slow checks run, and only if app code changed: the full screenshot comparison
  at 360/390/135% on both looks, and the several-phones, whole-round and start-hole scoring tests. If they fail, the
  work goes back to Claude as a BLOCKER.
- The reviewer only sends work back for real defects or unmet requirements. Wording, documentation style and
  "consider also" ideas are notes, not reasons for another round.
- **Combine small related tasks into one list item.** Each task has a fixed start-up cost of a few minutes.
- For quick tweaks while the owner is around, the owner can ask Claude directly (the fast lane). The same checks
  apply, and the result goes into the design branch.

