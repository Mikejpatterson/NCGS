# AI development workflow — staged, not yet running

## Roles
Claude Code: coding and test execution using the official GitHub action.
ChatGPT: design direction, review and GitHub-based feedback when invoked in an active conversation.
GitHub Actions: runner, logs, test evidence and a staging area.

## Activation prerequisite
An administrator installs the official Claude GitHub app (https://github.com/apps/claude)
and configures the GitHub Actions repository secret `ANTHROPIC_API_KEY`
under Settings → Secrets and variables → Actions.
Never paste the key in GitHub issues or ChatGPT.
The key is not currently confirmed configured.

## Execution details
This branch includes a manual-dispatch action at `.github/workflows/claude-design.yml`.
GitHub typically requires a workflow definition on the default branch for UI/API
dispatch discovery. Do **not** merge this workflow to main without first verifying
its branch guard, scopes and repository protections; the guard rejects non-design refs.
An admin may instead dispatch using GitHub CLI `gh workflow run ... --ref design/crest-editorial-prototype`
once the workflow is discoverable.

## Approval gates
- Never auto-merge or auto-deploy.
- Set branch protection/ruleset on main: require PR, human review and passing checks.
- Claude may modify the design branch; ChatGPT's later review is **not a persistent background agent**.
- Explicitly request a review turn here, or arrange a separately authorised automated review agent.
- Record each iteration in the branch or a draft pull request.

## Implementation state
Design branch and initial CSS are present; production crest is not integrated,
and full browser tests have not yet been certified.
