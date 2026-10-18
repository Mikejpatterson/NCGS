# Automated two-model review — setup plan

Status: **NOT ACTIVE**. Requires an OpenAI API project key and integration tests.

## Goal
Claude Code produces a scoped change on `design/crest-editorial-prototype`; an independent OpenAI API review then assesses it against `CLAUDE.md`, `docs/EDITORIAL-PROTOTYPE.md`, and existing scoring invariants. Findings are returned as machine-readable GitHub comments and actionable changes for Claude to answer or challenge.

## Boundaries
- Both agents work from the same written requirements, never from assumed access to the owner's ChatGPT conversation.
- No agent may merge, alter production secrets, deploy, or change real player data.
- Limited to three challenge/response rounds per change.
- Start with manual initiation, then enable event triggers after a successful dry run.
- On disagreement or failed tests, stop and request human assessment.
- Avoid triggering workflows on their own comments or commits (no unbounded automation loop).
- A code review is not an adequate visual review: require screenshots at 360/390px and text zoom to evaluate Home, Score Entry and Buggy Wars.
- Include user-approved design specifics, including the open header-balance issue and unfinished crest vector.

## Credentials
GitHub encrypted Actions secret `OPENAI_API_KEY` required. The user must create it in their OpenAI API account and enter it **only** in GitHub. ChatGPT Plus/Pro subscription does not supply API credits. Use a dedicated project key with account/project budget alerts, access restricted to this repository's automation when feasible.

## Phase gates
1. Configure API secret and check API access with a minimal non-production test.
2. Commit reviewer script/workflow on design branch, test with small sample diff and low per-run limits.
3. Verify GitHub comments, model challenge responses and exception handling.
4. Enable the feedback loop and cycle cap.
5. Decide whether to enable event-driven automation; keep manual merge approval.

This file is a design contract, not evidence that two-way automation already works.
