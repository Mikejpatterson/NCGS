# Pre-launch review pack (roadmap v1, task `prelaunch-review-pack`)

**Status: NOT READY FOR RELEASE.** These are still missing: the real-phone and sunlight check, an authorised
phone-preview link, and the full test results for the candidate commit (the workflow runs those after this round).
This page collects the evidence in one place. It does not ask for approval to release, and nothing has been merged,
deployed or published.

## Candidate
| | Commit |
|---|---|
| Candidate (app source) | `4804d50cd10164361cf53aea63e54b8b10fb50b1`, design branch head when this pack was made |
| This round adds | `docs/RELEASE-REVIEW.md` and `tools/phone-preview-pack.js` only. No app source change, so the workflow's commit for this round has the same app as `4804d50` |
| Baseline for before/after | `79ba2225886f99e1af748adf19b047232164ff8c` (roadmap v1 was written against it) |
| Live app (`main`) | `9e4cfc5`, unchanged |

App source at each evidence set, compared with the candidate (`git diff --stat <commit> 4804d50 -- src build.js data/fixture-seed.json data/demo.json data/card-fixtures.json`):

| Evidence set | Taken at | Same app as candidate? |
|---|---|---|
| Home, [`docs/RELEASE-HOME.md`](RELEASE-HOME.md) | `9868aac` | No: `three-digit-fix` came later (`.entry .bugs` score-entry CSS and one score-entry expression). **Re-measured at the candidate in this round**, see below |
| Score entry, [`docs/RELEASE-HOLE.md`](RELEASE-HOLE.md) | `44af9c8` (the `three-digit-fix` commit) | Yes, empty diff |
| Buggy Wars, [`docs/RELEASE-BUGGY.md`](RELEASE-BUGGY.md) | `0ba3b08` | Yes, empty diff |

### Home re-measured at the candidate (this round)
Commands (`dist/` is not committed):
```sh
node tools/phone-preview-pack.js              # builds both looks from invented data; see "Phone preview" below
mkdir -p dist/rh-cand && cp dist/phone-preview/standard.html dist/rh-cand/std.html && cp dist/phone-preview/editorial.html dist/rh-cand/ed.html
node tools/release-home-shots.js dist/rh-cand/std.html std dist/rh-cand/shots > dist/rh-cand/after-std.txt   # exit 0
node tools/release-home-shots.js dist/rh-cand/ed.html  ed  dist/rh-cand/shots > dist/rh-cand/after-ed.txt    # exit 0
diff docs/release-home-shots/after-std.txt dist/rh-cand/after-std.txt    # no output
diff docs/release-home-shots/after-ed.txt  dist/rh-cand/after-ed.txt     # no output
```
- **Measurement logs are identical** to the recorded "after" logs in both looks: same tab bar, yellow, text size,
  serif allowlist, nothing cut off, nothing under 44px.
- **Screenshots:** 12 of the 46 are pixel-identical (the scrolled-to-end shots). The other 34 differ **only in the date
  line** at the top (y 85–103 CSS px: "Tuesday, 20 October · Good evening" became "Wednesday, 21 October · Good
  morning"). In the `next` state the countdown also changed ("in 31 days" became "in 30 days"). Checked by a
  pixel-difference box for every shot and by eye on `next-std-390`. The recorded screenshots were not replaced.

## The three evidence sets
| Screen | Page | Result recorded there | Cycle run |
|---|---|---|---|
| Home | [`RELEASE-HOME.md`](RELEASE-HOME.md), shots in [`release-home-shots/`](release-home-shots/) | 5 states × 3 sizes × 2 looks; before = after; serif allowlist kept; no clipping; nothing under 44px | [39498019065](https://github.com/Mikejpatterson/NCGS/actions/runs/39498019065) |
| Score entry | [`RELEASE-HOLE.md`](RELEASE-HOLE.md), shots in [`release-hole-shots/`](release-hole-shots/) | 36 of 36 states pass in each look (72 of 72) after `three-digit-fix`; normal names compact; Save pill reachable | [39553987116](https://github.com/Mikejpatterson/NCGS/actions/runs/39553987116), fix [39564291185](https://github.com/Mikejpatterson/NCGS/actions/runs/39564291185) |
| Buggy Wars | [`RELEASE-BUGGY.md`](RELEASE-BUGGY.md), shots in [`release-buggy-shots/`](release-buggy-shots/) | 21 of 21 screens pass in each look, before and after (84 of 84); contrast lowest 4.57:1 standard, 5.78:1 editorial; colour-blindness simulations labelled as simulations | [39567164569](https://github.com/Mikejpatterson/NCGS/actions/runs/39567164569) |

All three use invented fixture data and Linux Chromium. None of them is an iPhone result.

## What would change for golfers (design branch compared with the live app `main`)
`git diff --stat origin/main 4804d50 -- src build.js`: `build.js`, `src/app/20-society.js`, `src/app/30-play.js`,
`src/app/90-main.js`, `src/styles.css`, `src/editorial-prototype.css` (6 files, +147 −46). Scoring, saving and sync
files are untouched (`sh tools/guard.sh origin/main`: ok).

**In the standard look (what a merge would put in the live app):**
- Ruling and other small buttons made at least 44px (`docs/TOUCH-TARGETS.md`).
- Big round titles keep growing with the phone's text size and long ones wrap, never cut off (`docs/TYPOGRAPHY.md`).
- Long player names wrap instead of being cut off; normal names keep the compact score row (`docs/LONG-NAMES.md`).
- Score entry re-measures rows when the text size changes while it is open (`docs/NAME-RESIZE.md`).
- Three-digit scores no longer run under − and + (`docs/RELEASE-HOLE.md`).
- A tied place such as "T2" is no longer cut off on Home (`41ac1a4`).
- Team colours and the display font are now named settings in the stylesheet (same colours in the standard look).
- `build.js` can build a preview from invented data (`NCGS_FIXTURE=1`) and an editorial preview (`NCGS_DESIGN=editorial`);
  the live app is never built with the editorial styles.

**Only in the editorial look (opt-in preview, never in the live app as built today):** pine/ivory colour settings,
navy `#244A78` and crimson `#9B3443` teams, serif on the three allowed titles. `src/editorial-prototype.css` is
colour and font settings only.

**Not changed:** the crest (blocked, see below), words, controls, scoring, saving, sync, data.

## Owner decisions this pack relies on (issue #1, DECIDED)
- 20 October: Buggy Wars result pills show the leading pair **by colour only**, no names or initials. Screen-reader
  labels kept. Not an accessibility conformance claim; not broadened.
- 20 October, option A: display titles keep growing with text size; long round names up to three lines at large text,
  never cut off.
- Flag-yellow `#F6C515` is the one action / "now" colour. Champagne `#D4B483` only for crest and awards.
- Buttons, the Save pill and the glass tab bar stay fully rounded pills.
- Serif only on `.hero.home .wordmark`, `.hero.home .now-name` and `.rp-name`.
- Team colours navy `#244A78` and crimson `#9B3443`, with text labels kept.
- The hole header was not a proven defect (Par/Index already on the right).
- Roadmap version 1 approved through PR #18 (merge `e8e5a63`).

Agent findings that are not owner decisions: `warning-token-audit` found no change needed (`docs/WARNING-TOKENS.md`),
so `warning-token-fix` was not queued; `three-digit-fix` was queued as a required fix under the CLAUDE.md
three-digit rule (`c4b17d6`).

## Test runs
| Task | Run | Evidence |
|---|---|---|
| Hole header (no change) | [39300956228](https://github.com/Mikejpatterson/NCGS/actions/runs/39300956228) | `docs/HOLE-HEADER.md` |
| 44px audit / Ruling target | [39292696479](https://github.com/Mikejpatterson/NCGS/actions/runs/39292696479), [39309515793](https://github.com/Mikejpatterson/NCGS/actions/runs/39309515793) | `docs/TOUCH-TARGETS.md` |
| Serif check | [39413817239](https://github.com/Mikejpatterson/NCGS/actions/runs/39413817239) | `docs/TYPOGRAPHY.md` |
| Long names | [39459564573](https://github.com/Mikejpatterson/NCGS/actions/runs/39459564573) | `docs/LONG-NAMES.md` |
| Team colours (escalated to the owner) | [39469125470](https://github.com/Mikejpatterson/NCGS/actions/runs/39469125470) | `docs/TEAM-COLOURS.md` |
| Handover update | [39486846005](https://github.com/Mikejpatterson/NCGS/actions/runs/39486846005) | `docs/CLAUDE-HANDOVER.md` |
| Name resize check / fix | [39487303357](https://github.com/Mikejpatterson/NCGS/actions/runs/39487303357), [39495595156](https://github.com/Mikejpatterson/NCGS/actions/runs/39495595156) | `docs/NAME-RESIZE.md` |
| Warning colours | [39488307092](https://github.com/Mikejpatterson/NCGS/actions/runs/39488307092) | `docs/WARNING-TOKENS.md` |
| Home / score entry / three-digit fix / Buggy Wars | see "The three evidence sets" | |
| **This pack** | [39568593451](https://github.com/Mikejpatterson/NCGS/actions/runs/39568593451) | this page |

Run ids come from the to-do list commits. This agent could not open the run pages from its sandbox, so the table
does not restate their pass/fail. Each task was ticked done by the cycle.

### Full gates at the candidate
| Gate | Result |
|---|---|
| `node --test test/engine.test.js test/server.test.js` | **pass, 53 of 53** (this round, candidate app source) |
| `sh tools/guard.sh 4804d50…` and `sh tools/guard.sh origin/main` | **ok** (this round) |
| `NCGS_FIXTURE=1 node build.js` and `NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js` | **pass** (inside `tools/phone-preview-pack.js`, this round) |
| `test/layout.run.js`, screenshot comparison (`test/design.run.js`), several phones (`test/phones.run.js`) | **pending**: the workflow runs them straight after this round (run 39568593451). Read them there; they are not claimed as passed here |
| `test/finish.run.js`, `test/starthole.run.js` | passed at `c70b254`/`a5fe07e` (`docs/RELEASE-HOLE.md`); **not re-run** at the candidate. The only app change since is `three-digit-fix` |

## Phone preview package (invented data)
**Link: pending, not published.** No hosting route for a preview has been authorised. This roadmap does not
authorise publishing. The package is ready to put on a host once one is approved.

Build it:
```sh
node tools/phone-preview-pack.js          # -> dist/phone-preview/ ; exits 1 if any check fails
```
The folder contains `index.html` (two buttons: current look, editorial look), `standard.html`, `editorial.html`,
`cards/` (the synthetic scorecard photos) and `PACKAGE.json` (commit, file fingerprints, check results). Any plain
static host can serve it as it is.

Result this round, at `4804d50`: **all checks passed**, and two runs gave the same fingerprint
`8f3d2a5d65ec7fa66e14b14b7afac7f994290c8c8addf702d8e5af093611e381`. The fingerprint ignores the build time stamp.
- Both previews contain exactly `data/fixture-seed.json` and run in "local" mode (data stays in the phone's browser).
- No data-service address in the settings, and no Apps Script address anywhere. No key-like strings (Anthropic,
  OpenAI, GitHub, private keys).
- There is no offline worker or install manifest in the folder. The app registers its offline worker only in "live"
  mode. In a browser (Chromium, served locally) all three pages showed **no offline worker registered**, saved only
  `ncgs-preview-…` keys (the live app uses `ncgs-…`), made no requests outside their own address and had no script errors.
- The real-name check is skipped, because the real data is not on this computer (it is never committed). Run it on a
  computer that has `data/seed.json` before publishing.

Conditions for any future host (not met yet, not chosen):
1. **A different address (origin) from the live app.** A sub-folder of the live app's GitHub Pages address would sit
   inside the live offline worker's scope (`./`) and share its browser storage. So the preview needs a separate address.
2. Serve the folder exactly as packaged, re-run the tool first and compare the fingerprint.
3. Verify on the published address: no offline worker, invented names only, the date shows, both looks open. Only
   then put the link on this page.

Known content limits of the package:
- The organiser screen shows **"Preview PIN: 1234"**. That is the app's built-in starting PIN (`DEFAULT_PIN` in
  `src/server.js`, already public in this repository). The live app warns the organiser to change it. This agent
  cannot check whether the live PIN is different.
- The hidden internal ids of the invented golfers (for example `john-w`, `colin`, `mike-p`) come from
  `data/demo.json` and are inside the page source, though never shown on screen. They are already public in this
  repository. Whether they point to real members is an owner question (below). Changing them is outside design scope
  (`data/` is protected).
- The preview cannot test install-to-home-screen or offline use, because it has no offline worker by design. Those
  stay on the real-phone list.
- The preview can load one outside script (html2canvas from cdnjs) only if someone uses the share-card image button.
  This is the same as the live app.

## Known limits and what is still open
- **Real iPhone / sunlight check: not done.** Typography (New York and San Francisco), team colours in daylight,
  the soft pills, iOS Dynamic Type (135% here is simulated), three-digit margins with iPhone digits, and offline or
  reconnect behaviour. One session is needed (roadmap, "Blocked or owner-only work"; `docs/TEST-PLAN.md`, manual list).
- **Crest: blocked.** It waits for the vector artwork listed on issue #1. The current mark is kept and no substitute
  was drawn.
- Colour-blindness evidence is a simulation, not people.
- The Home "Last round" label wraps to two lines next to a long title at 360px (nothing cut off; observation in
  `docs/RELEASE-HOME.md`).

## What the owner would decide later (not now)
The owner reviews this page and the real-phone results, then either asks for changes or approves one named release
pull request. Merging to `main` re-publishes the live app. No agent, deadline or silence can approve that.
