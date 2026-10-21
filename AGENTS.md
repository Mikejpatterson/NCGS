# NCGS agent instructions

Read `CLAUDE.md`, `docs/CLAUDE-HANDOVER.md`, current activity and human decisions on GitHub Issue #1, and
`docs/JOINT-WORKING-AGREEMENT.md`. The human's 21 October joint instruction supersedes older role descriptions.

## Authority and collaboration

- The human Product Owner alone has final authority over product direction, material aesthetic/scope changes,
  priorities and release approval. ChatGPT is not the owner and has no continuing approval, arbitration or
  supervisory role. Its earlier handover is a reference whose ideas both agents may challenge.
- Codex initially leads implementation and tests. Claude initially provides independent design, UX and engineering
  review and may contribute original solutions. Neither agent has authority over the other. Agree task ownership
  on Issue #1; the division may change by mutual agreement. Resolve ordinary design decisions together within
  Option 2; refer genuinely unresolved significant product choices to the human with a recommendation.
- Option 2 — Modern Club Character is the broad app-wide aesthetic, not a fixed screen template. The later light,
  warm-ivory translucent floating nav supersedes the dark board nav. Exact spacing/type/token choices are routine
  engineering/design judgment. Preserve product language and real gameplay instead of copying mockup content.
- Inspect active runs, branches, open PRs and the queue before acting. ROADMAP v1 is complete; do not refill its
  queue or repeat completed work. The current light-navigation work is a new human-authorized refinement.
- Use Issue #1 and SHA-bound PR reviews directly. A comment is durable communication, not proof that an agent
  executed. `/claude-review` requests review on a PR; `/agent-task` and `/agent-continue` use the existing cycle.
  Preserve its caps/stops; no duplicate scheduler or competing task queue.
- At most two exchanges on an unresolved point, then present both positions and a recommendation to the human.
  Post substantive evidence/decisions rather than empty acknowledgements. `/agent-task` and `/agent-continue`
  require the human's request in the invoking conversation; review triggers remain allowed once per PR head.

## Branches and checks

- Use an isolated contribution branch and a PR into `design/crest-editorial-prototype`; do not edit that shared
  branch under another running cycle. Keep completed work, score controls, routing and real data intact.
- Run `node --test test/engine.test.js test/server.test.js` before publication, and the applicable existing fuzz,
  layout, comparison and phone/full-round/start-hole checks for UI changes. Compare genuine app screenshots at
  360px, 390px and 135% text. Targets are at least 44px; names/numbers do not clip. Report limits honestly.
- Design work must not change `src/engine.js`, `src/server.js`, `src/app/00-core.js`, `src/app/10-data.js`, `data/`
  (except the invented fixture), `site/`, deployment configuration, secrets, workflows or `tools/agent/`.
  Protected logic changes and trusted-controller maintenance require their own explicitly scoped review.
- Never push/merge into main, deploy the live app, release or change access controls without explicit human
  authorization. A passed test, agent approval, silence or prior preview permission does not authorize release.
- The selected gold double-ring crest has raster references but no verified final gold-border vector. Do not
  invent a substitute or ship the superseded ivory SVG. Do not expose the private phone-preview URL publicly.

Keep owner updates concise and focused on results, meaningful decisions and genuine blockers. Do not ask the
human to relay messages or perform routine implementation/testing work.
