# AI development workflow

## Current state (refreshed 20 October 2026, task `handover-current`)
Checked against design `ad957cf` and main `9e4cfc5`. Re-read the remote refs before relying on this.

- **Running.** The NCGS agent cycle runs from `main`: `.github/workflows/agent-cycle.yml` with the trusted
  controller in `tools/agent/`, documented in `docs/AGENT-CYCLE.md` (main). Claude codes on `agent/run-<run-id>`
  branches cut from the design branch; the workflow runs the hard tests; an OpenAI reviewer (a separate API call
  each round) reviews; up to three rounds. The secrets it needs are set: completed runs such as
  [39459564573](https://github.com/Mikejpatterson/NCGS/actions/runs/39459564573) used them.
- **Codex** takes part as design lead through issue #1, pull requests and the queue, following
  `docs/CODEX-INTEGRATION.md` (main, PR #16). No persistent or scheduled Codex agent has been activated.
- **Queue:** `.github/agent-queue.md` on `design/crest-editorial-prototype` is the only to-do list; `docs/ROADMAP.md`
  version 1 (owner-approved via PR #18, merge `e8e5a63`) sets its finite scope. The four original items
  (`ruling-target`, `serif-check`, `long-names`, `team-colours-check`) are done; what each produced is listed in
  `docs/CLAUDE-HANDOVER.md`. The team-colour run escalated to the owner, and the owner's colour-only decision for
  Buggy Wars result pills is recorded there and in `docs/TEAM-COLOURS.md`.
- **Not done:** no real-phone review, no production approval, no merge of design work into `main`, no deployment.
  The production crest is still blocked on vector artwork.

## Original plan (18 October 2026, kept for history)
The rest of this file is the plan as first written, when nothing was running yet. Where it differs from the
current state above, the current state wins.

### Roles
Claude Code: coding and test execution using the official GitHub action.
ChatGPT: design direction, review and GitHub-based feedback when invoked in an active conversation.
GitHub Actions: runner, logs, test evidence and a staging area.

### Activation prerequisite
An administrator installs the official Claude GitHub app (https://github.com/apps/claude)
and configures the GitHub Actions repository secret `ANTHROPIC_API_KEY`
under Settings → Secrets and variables → Actions.
Never paste the key in GitHub issues or ChatGPT.
At the time, the key was not confirmed configured (it has been since; see above).

### Execution details
This branch includes a manual-dispatch action at `.github/workflows/claude-design.yml`.
GitHub typically requires a workflow definition on the default branch for UI/API
dispatch discovery. Do **not** merge this workflow to main without first verifying
its branch guard, scopes and repository protections; the guard rejects non-design refs.
An admin may instead dispatch using GitHub CLI `gh workflow run ... --ref design/crest-editorial-prototype`
once the workflow is discoverable.
(The day-to-day path is now the agent cycle above. `docs/CODEX-INTEGRATION.md` lists `claude-design` among the
legacy workflows on main to avoid invoking.)

### Approval gates
- Never auto-merge or auto-deploy.
- Set branch protection/ruleset on main: require PR, human review and passing checks.
- Claude may modify the design branch; ChatGPT's later review is **not a persistent background agent**.
- Explicitly request a review turn here, or arrange a separately authorised automated review agent.
- Record each iteration in the branch or a draft pull request.

### Implementation state (as of 18 October)
Design branch and initial CSS are present; production crest is not integrated,
and full browser tests have not yet been certified.
