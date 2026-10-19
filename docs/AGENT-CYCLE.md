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

## Safety
| Risk | What stops it |
|---|---|
| Changes to scoring, saving, sync, real data, the live site, workflows or this automation | Hard gate on protected files. These are also blocked when pushing (the workflow token cannot change workflows). |
| The agent weakening tests or its own checks | The gates, reviewer and orchestrator run from a separate checkout the agent cannot edit. Changed test files are flagged to the reviewer. |
| Endless back-and-forth | At most 3 rounds in one run. A run never starts another. The reviewer must escalate a repeated disagreement. |
| A lost score | Every round runs the several-phones, whole-round and start-hole tests and the engine/server tests. |
| Leaked keys | Claude gets only its own key, with no GitHub token and no OpenAI key. It cannot push, commit or use the web. |
| Anything reaching golfers | Nothing in this cycle can push to `main`. Protecting `main` (owner setting) makes that a hard rule for everyone. |

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
