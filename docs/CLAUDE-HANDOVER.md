# Handover for any Claude working on the editorial design

Written by the Claude Code session that did the planning and Stage 0 (18–19 October 2026), so that automated
Claude runs started from GitHub know what that session knows. Read this after `CLAUDE.md`. The full debate
and every decision is on GitHub issue #1. Decisions there are tagged **DECIDED**.

## Where things stand (design branch `design/crest-editorial-prototype`)
Status refreshed 20 October 2026 (task `handover-current`) against design `ad957cf` and main `9e4cfc5`. Re-read
the remote refs, the queue and issue #1 before acting; these lines go out of date.

**Done** (do not repeat; the evidence is linked):
- **Stage 0**: fixture data, preview-only build gating, the guard, the comparison tool, tokens, a token-only
  editorial file and the design CI. Commits `f405fec` to `54fc9b7`.
- **Stage 3, hole header**: screenshot-first review, **no app change** (the real header already has Par/Index on the
  right). Evidence `docs/HOLE-HEADER.md`, run [39300956228](https://github.com/Mikejpatterson/NCGS/actions/runs/39300956228) (`257e416`).
- **44px touch-target audit** (report only): `docs/TOUCH-TARGETS.md`, run [39292696479](https://github.com/Mikejpatterson/NCGS/actions/runs/39292696479) (`7e0fac6`).
- **Queue, all four original items ticked** in `.github/agent-queue.md`:
  - `ruling-target`: run [39309515793](https://github.com/Mikejpatterson/NCGS/actions/runs/39309515793) (`989dc60`), `docs/TOUCH-TARGETS.md`.
  - `serif-check`: run [39413817239](https://github.com/Mikejpatterson/NCGS/actions/runs/39413817239) (`be954a1`, building on draft PR #13), `docs/TYPOGRAPHY.md`.
  - `long-names (pause)`: run [39459564573](https://github.com/Mikejpatterson/NCGS/actions/runs/39459564573) (`2e048eb`, building on draft PR #15), `docs/LONG-NAMES.md`.
  - `team-colours-check (pause)`: run [39469125470](https://github.com/Mikejpatterson/NCGS/actions/runs/39469125470) (`772be23`).
    The automated cycle **escalated** to the owner rather than approving; Claude then brought its evidence into
    design through PR #17 (merge `804d8fd`) and recorded the owner's decision and the ticked item in `79ba222`.
    That was not an automated approval. Evidence `docs/TEAM-COLOURS.md`.
- **Roadmap version 1** (`docs/ROADMAP.md`) was owner-approved via PR #18 (merge `e8e5a63`). The first three of its
  tasks were queued in `ad957cf`: `handover-current`, `name-resize-check`, `warning-token-audit`.

**Still open:**
- **Real-iPhone / sunlight review has not happened.** All screenshots so far are Chromium on Linux with invented
  data. Typography (New York), colours, text scaling and offline use still need one real-phone session
  (roadmap, "Blocked or owner-only work").
- **Phone preview:** fixture data only, its own path and service-worker scope, never replacing the live app shell.
  Agreed in principle; no hosting route has been authorised or published (roadmap task `prelaunch-review-pack`).
- **Crest: blocked** until vector artwork arrives (list on issue #1). Never draw a substitute.
- **Production:** nothing from the design branch has been approved for `main` or the live app.

## Decided (issue #1)
- **Owner, 20 October: Buggy Wars result pills show the leading pair by colour only, with no names or initials.**
  This is a deliberate exception to "colour is never the only team identifier". Do not flag it again or add leader text.
  Keep the existing screen-reader labels; the exception is not an accessibility conformance claim and must not be broadened.
  Team colours stay navy #244A78 and crimson #9B3443 (contrast and colour-blindness evidence in `docs/TEAM-COLOURS.md`).
- **Owner, 20 October: option A.** Display titles keep growing with the phone's text size. Long round names may take
  up to three lines at large text sizes, and are never cut off.
- Flag-yellow `#F6C515` stays as the one action / "now" accent. Champagne `#D4B483` is for the crest and awards only (it's 1.86:1 on ivory, so never use it to convey meaning there).
- Buttons, the save pill and the glass tab bar stay fully rounded pills.
- Serif **only** on `.hero.home .wordmark`, `.hero.home .now-name` and `.rp-name`, using `ui-serif` (New York on iPhone). Names, numbers, controls and the hole screen stay in the system font.
- Team colours: navy `#244A78` and crimson `#9B3443` wherever a team appears. Sunlight and colour-blindness checks may adjust them. Keep the text labels.
- The hole header was **not** a proven defect: the real app already shows Par/Index on the right. Start from the real app, not the mock-up.

## How the code is laid out
- `build.js` joins `src/app/*.js`, `styles.css`, `engine.js` and `server.js` into one HTML file. Views are template strings (`VIEWS.*`), and behaviour hangs off `data-act` attributes, not classes.
- `src/styles.css` is about 1,700 lines of stacked passes. Later rules override earlier ones, so read the whole cascade for a selector before changing it.
- Design tokens are in `:root` in `styles.css`: `--team-a`, `--team-b`, `--team-a-soft`, `--team-b-soft` and `--font-display`. `--red` is for errors and double-bogey marks, **not** a team.
- `src/editorial-prototype.css` must stay **token swaps only**: no selector restyling.

## Commands
```sh
node --test test/engine.test.js test/server.test.js       # before every push
NCGS_FIXTURE=1 node build.js                              # standard preview from invented data
NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js        # editorial preview
sh tools/guard.sh                                         # fails if scoring, sync, data or site/ changed
python3 -m http.server 8765 -d dist & node test/layout.run.js
node test/design.run.js a.html b.html out/ [--same-pixels]   # same controls + words, pixel count, screenshots
```
- There's no `package.json`. Playwright comes from a global install (`NODE_PATH`), or from `npm install --no-save playwright@1.56.1` in CI.
- `test/phones.run.js` needs a full build. Locally: copy `data/fixture-seed.json` to `data/seed.json`, run `node build.js`, then `node tools/devserver.js 8766`, run the test, and **delete `data/seed.json` afterwards** (it's gitignored, but never commit it).
- Comparing a build with itself differs by ≤ 3 px (glass blur noise). `--same-pixels` allows 0.01%.

## Gotchas already hit
- The several-phones test enters a 6 on hole 1. For a low handicapper that's a pick-up. The fixture uses handicaps 12–28.5 for this reason.
- Chromium on Linux has no New York, so CI screenshots show a fallback serif. Judge typography on a real iPhone.
- `pkill -f <pattern>` can kill your own shell if the pattern appears in the command line. Stop servers by port or by exact arguments.
- Comments posted with the workflow `GITHUB_TOKEN` don't trigger other workflows. Mentioning `@claude` from a bot comment does nothing.

## Rules that are easy to break
- Don't commit to `main`, merge or deploy. Every push to `main` re-publishes the live app (`site.yml`). A
  `Protect live app` ruleset requires a pull request and blocks deletion and force-push, but it needs
  zero approving reviews and no status checks (recorded in `docs/CODEX-INTEGRATION.md` on `main`). It is not an
  owner-only approval gate, so do not rely on it.
- Design work never touches `src/engine.js`, `src/server.js`, `src/app/00-core.js`, `src/app/10-data.js`, `data/` (except `fixture-seed.json`) or `site/`. `tools/guard.sh` enforces this.
- The owner isn't a developer: plain words, one step at a time, no jargon.

## Working with the owner and the other agents (owner's standing instruction, 19 October 2026)
- Keep the owner informed without needing them: say in plain words what is happening, roughly how long, whether
  it runs in the background, and what comes next.
- Sort problems out between the agents: fix failing commands, broken tests and workflow bugs yourself, and settle
  disagreements with evidence on issue #1.
- Come to the owner (@Mikejpatterson) only for: a product/design decision not already DECIDED; approval of anything
  that changes the live app (`main`); a setting, secret or account only they can change; extra spending; or a
  problem tried twice without success. Ask one plain question, with a recommendation, one step at a time.
- The automated cycle (the controller) now runs from `main`: `.github/workflows/agent-cycle.yml`, `tools/agent/`
  and its rules in `docs/AGENT-CYCLE.md`. Codex's part is in `docs/CODEX-INTEGRATION.md` on `main` (PR #16, merge
  `9e4cfc5`). The only to-do list is `.github/agent-queue.md` on the design branch; the scope is `docs/ROADMAP.md`.
- The OpenAI reviewer in the cycle is a separate API call per round, not a persistent Codex agent. No unattended
  Codex executor or schedule has been activated.
