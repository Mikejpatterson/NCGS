# Handover for any Claude working on the editorial design

Written by the Claude Code session that did the planning and Stage 0 (18–19 October 2026), so that automated
Claude runs started from GitHub know what that session knows. Read this after `CLAUDE.md`. The full debate
and every decision is on GitHub issue #1. Decisions there are tagged **DECIDED**.

## Where things stand (design branch `design/crest-editorial-prototype`)
- **Stage 0 is done**, and the design CI is green. That covers fixture data, preview-only build gating, the guard,
  the comparison tool, tokens, a token-only editorial file and the design CI. Commits run from `f405fec` to `54fc9b7`.
- **Next, in this order:**
  1. Real-iPhone preview of the editorial look, fixture data only. It must use its own path and service-worker scope and must never replace the live app shell. Agreed in principle; where to host it is still undecided.
  2. Stage 3: the hole header. Screenshot-first proposal: the hole number stays dominant on the left, with a PAR | SI stat block on the right and yards beneath it. Before/after at 360, 390 and 135% text. No changes to controls.
  3. Raise the layout test's touch-target minimum from 40px to 44px (the standard in `CLAUDE.md`). **Report** what fails before changing any control. Don't lower the standard to make tests pass.
- **Crest: blocked** until vector artwork arrives (list on issue #1). Never draw a substitute.
- **Separate task, not part of the redesign:** a long player name is cut off on about 12 screens.

## Decided (issue #1)
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
- Don't commit to `main`, merge or deploy. Every push to `main` re-publishes the live app (`site.yml`), and `main` is unprotected.
- Design work never touches `src/engine.js`, `src/server.js`, `src/app/00-core.js`, `src/app/10-data.js`, `data/` (except `fixture-seed.json`) or `site/`. `tools/guard.sh` enforces this.
- The owner isn't a developer: plain words, one step at a time, no jargon.
