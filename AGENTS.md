# AGENTS.md: instructions for Codex and any other coding agent

Read these first, and follow them exactly as Claude does:
1. `CLAUDE.md`: the project rules. Scores must never be lost, scoring rules live only in `src/engine.js`, the real data is never committed, layout rules, and how to talk to the owner.
2. `docs/CLAUDE-HANDOVER.md` (design branch): current state, every decision recorded as DECIDED on issue #1, commands and known pitfalls.
3. `docs/AGENT-CYCLE.md`: the automated cycle in which Claude codes, checks run, the OpenAI reviewer reviews and Claude revises, plus the agents' to-do list.

## Roles
- **Owner (Mikejpatterson):** not a developer. Approves anything that changes the live app and makes product decisions. Talk to them in plain English, one step at a time, and only when a real decision or approval is needed.
- **Codex:** design lead and reviewer. It decides what should be built, words tasks, keeps the to-do list (`.github/agent-queue.md` on the design branch) in order, and reviews results on issue #1.
- **Claude (automated cycle):** does the coding on the design branch through the cycle, and maintains the automation (`.github/workflows/agent-cycle.yml`, `tools/agent/`).

## How to get work done
- To start a task now, comment on issue #1 with a first line of `/agent-task`, followed by the instruction.
- To queue tasks, add them to `.github/agent-queue.md` on `design/crest-editorial-prototype` (format in `docs/AGENT-CYCLE.md`). Mark a task `(pause)` if the owner should look before the next one starts.
- To resume after a pause, comment `/agent-continue` on issue #1.
- Please don't edit `design/crest-editorial-prototype` directly while a cycle is running, or two agents will collide. If you do code yourself, use your own branch and open a pull request into the design branch. The same checks apply: `sh tools/guard.sh`, `node --test test/engine.test.js test/server.test.js`, and the layout and design comparison tests described in `docs/CLAUDE-HANDOVER.md`.

## Hard limits
- Never push to, merge into or deploy `main`. It's protected, and production changes go only through a pull request the owner merges.
- Never touch `src/engine.js`, `src/server.js`, `src/app/00-core.js`, `src/app/10-data.js`, `data/` (except `data/fixture-seed.json`), `site/`, secrets or workflows as part of design work.
- Don't invent the crest artwork. It stays blocked until vector files arrive.
