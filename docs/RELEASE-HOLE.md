# Release evidence: score entry (roadmap v1, task `release-hole-evidence`)

Evidence only: no application change, no score logic or control attribute touched. Invented fixture data only
(`data/fixture-seed.json`, normal names Aidan, Bartley, Cathal, Donnacha); the long names are invented and lent to
the same four players in memory (the same names as `docs/LONG-NAMES.md`). No real member data.

## Source SHAs
| | Commit | Why this one |
|---|---|---|
| Before (baseline) | `79ba2225886f99e1af748adf19b047232164ff8c` | The design commit roadmap v1 was written against (same baseline as `docs/RELEASE-HOME.md`) |
| After (candidate) | `c70b254133af622b53a68882d51e293162829ba0` (app source identical to `a462872`, the `name-resize-fix` result) | Current design branch |

`git diff --stat 79ba222 c70b254 -- src build.js data/fixture-seed.json` shows one change: `src/app/30-play.js`
(+14 lines, the `name-resize-fix` re-measure when the text size changes, `docs/NAME-RESIZE.md`).
`git diff --stat a462872 c70b254 -- src build.js data/fixture-seed.json` is empty.

How the screenshots were tied to those commits (checked this round, not assumed):
- The baseline tree used (`dist/base`, unpacked with `git archive`) differs from the candidate's `src/` only by that
  14-line change (`git diff --no-index --stat dist/base/src src`), and `build.js` and the fixture are identical, so it
  is the `79ba222` app source.
- The two "after" previews used differ from a fresh build at `c70b254` only in the build time stamp
  (`NCGS_BOOT.version`).

## Commands
```sh
mkdir -p dist/base && git archive 79ba2225886f99e1af748adf19b047232164ff8c | tar -x -C dist/base
(cd dist/base && NCGS_FIXTURE=1 node build.js)                          # -> dist/rhole/before-std.html
(cd dist/base && NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js)    # -> dist/rhole/before-ed.html
NCGS_FIXTURE=1 node build.js                                            # -> dist/rhole/after-std.html
NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js                      # -> dist/rhole/after-ed.html
node tools/release-hole-shots.js dist/rhole/before-std.html std docs/release-hole-shots/before > docs/release-hole-shots/before-std.txt
node tools/release-hole-shots.js dist/rhole/before-ed.html  ed  docs/release-hole-shots/before > docs/release-hole-shots/before-ed.txt
node tools/release-hole-shots.js dist/rhole/after-std.html  std docs/release-hole-shots/after  > docs/release-hole-shots/after-std.txt
node tools/release-hole-shots.js dist/rhole/after-ed.html   ed  docs/release-hole-shots/after  > docs/release-hole-shots/after-ed.txt
```
(Each build writes `dist/preview.html`; copy it out after each one.) Linux Chromium (Playwright), touch on. Sizes:
360×740, 390×844, and 390×844 with root text at 135%. The tool's header (`tools/release-hole-shots.js`) explains
every check. Demo round, first group, hole 15 (par 3), as the preview opens it.

States, each with normal and long names:
- `empty`: nothing entered. `partial`: two of four entered (par, par + 1). `complete`: all four at par.
- `pickup`: all four entered, then Pick up on the second player.
- `two` / `three`: width tests, two-digit (10–13) and three-digit (100, 104, 108, 111) strokes put straight into the
  phone's unsaved draft. The + button stops at the pick-up, so taps cannot reach these on a par 3; a score
  corrected on the organiser's sheet has no upper limit and would show here. Nothing is saved in any state.

Long screens get a second shot scrolled to the end (`-end`), showing the Save pill clear of the tab bar.

## Result: before vs after
All 122 before/after screenshot pairs are **byte-for-byte identical** (`diff -rq docs/release-hole-shots/before
docs/release-hole-shots/after` prints nothing), and the before/after measurement logs are identical for both looks.
This is expected: the only app change since the baseline (`name-resize-fix`) acts when the text size changes on an
open screen, which these static shots do not do. That change has its own evidence in `docs/NAME-RESIZE.md`.

## Checks (same before and after; the standard and editorial measurement logs are also line-for-line identical)
**34 of 36 screens pass in each look (68 of 72); the 2 failures per look are the same pre-existing defect (below).**
- **Normal names stay compact**: Aidan, Bartley and Cathal stay on one line beside their controls at every size and
  state (row 72–73px at 390px; 100–101px at 360px and 135%, where the controls take the second line by design).
  Donnacha is the recorded borderline name: it takes its own line at 390px/100% only, by design (`docs/LONG-NAMES.md`).
- **Long names**: always on their own line, wrapping, never cut off or running into a control.
- **No name/control overlap and no clipping** (cut, ellipsis, line clamp, off screen) anywhere.
- **44px**: no button under 44px. Tab bar: four tabs (Home, Hole 15, Results, Ruling), smallest 52px.
- **Save pill**: fully rounded (radius 28px), 328 or 358px wide, 56px high (taller when the "to go" list wraps with
  long names: up to 86px). It floats above the content on the first screen; scrolled to the end, a tap at its
  centre lands on it in every shot and it sits 16–103px above the tab bar. Label: "4 scores to go", "2 scores to go
  · names", then "Save hole 15".
- **Pick up**: the picked-up player shows the pick-up strokes, 0 points and "Scratch"; the button shows on.
- **Figures**: scores use tabular figures (`tabular-nums`) in every state.
- **Three digits** (the CLAUDE.md "leave room for three digits" rule):
  - 360px: fits, 1–3px to the nearer of − and +.
  - 390px/100%: touching (−1 to 1px), under the tool's 1px overlap threshold, so it passes, only just.
  - **390px/135%: FAIL, both looks, before and after.** The number with its points mark runs 6–9px into both the −
    and + buttons ([standard](release-hole-shots/after/three-normal-std-390-135.png),
    [editorial](release-hole-shots/after/three-normal-ed-390-135.png)). The text stays readable and the buttons stay
    tappable, but the number is under the buttons' edges. Two digits fit everywhere (5px or more at 135%).

### The three-digit defect
Not a regression: it is identical at the baseline `79ba222`. A three-digit hole score can only arrive through a
correction on the organiser's sheet, never from taps, so it is rare, but CLAUDE.md asks for room for three digits.
This task does not allow changing the controls, so it is recorded here only. A fix would be a separate, small
layout task in permitted UI files (for example letting the score number shrink to fit at large text), with the
same evidence re-run.

## Other gates at the candidate SHA
Run this round on the fixture preview built from `c70b254` (served on port 8765), standard and editorial looks:

| Test | Standard | Editorial |
|---|---|---|
| `test/finish.run.js` (whole round with real taps, finish screen, short Back history, back home) | all passed (6 checks) | all passed |
| `test/starthole.run.js` (group start hole chosen, saved, scoring starts there) | all passed (5 checks) | all passed |
| `test/phones.run.js` (several phones, offline, server faults) | **pending**: run by the workflow's full gates after this round, not run here | pending |
| `test/layout.run.js` and the screenshot comparison | **pending**: run by the workflow after this round | pending |

The pending rows are not claimed as passed; see the workflow run for their results.

## Difference notes
- **Before → after**: none on screen (see above).
- **Standard → editorial**: colours only. Group borders and the + button use the editorial pine and team navy/crimson
  instead of the standard blue/red/green; the hole header is the same pine card in both. Fonts, sizes, positions
  and every measurement are the same (the hole screen stays in the system font, DECIDED in `docs/TYPOGRAPHY.md`).
- Observation, by design: on the first screen the floating Save pill sits over the last row when the list is long;
  scrolling reveals the row and the pill stays reachable (`-end` shots).

## Pairs
Each cell: before · after (and the scrolled-to-end pair where the screen scrolls).

| State, names, size | Standard | Editorial |
|---|---|---|
| empty, normal, 360 | [before](release-hole-shots/before/empty-normal-std-360.png) · [after](release-hole-shots/after/empty-normal-std-360.png) · [end b](release-hole-shots/before/empty-normal-std-360-end.png)/[a](release-hole-shots/after/empty-normal-std-360-end.png) | [before](release-hole-shots/before/empty-normal-ed-360.png) · [after](release-hole-shots/after/empty-normal-ed-360.png) · [end b](release-hole-shots/before/empty-normal-ed-360-end.png)/[a](release-hole-shots/after/empty-normal-ed-360-end.png) |
| empty, normal, 390 | [before](release-hole-shots/before/empty-normal-std-390.png) · [after](release-hole-shots/after/empty-normal-std-390.png) | [before](release-hole-shots/before/empty-normal-ed-390.png) · [after](release-hole-shots/after/empty-normal-ed-390.png) |
| empty, normal, 390/135% | [before](release-hole-shots/before/empty-normal-std-390-135.png) · [after](release-hole-shots/after/empty-normal-std-390-135.png) | [before](release-hole-shots/before/empty-normal-ed-390-135.png) · [after](release-hole-shots/after/empty-normal-ed-390-135.png) |
| partial, normal, 360 | [before](release-hole-shots/before/partial-normal-std-360.png) · [after](release-hole-shots/after/partial-normal-std-360.png) · [end b](release-hole-shots/before/partial-normal-std-360-end.png)/[a](release-hole-shots/after/partial-normal-std-360-end.png) | [before](release-hole-shots/before/partial-normal-ed-360.png) · [after](release-hole-shots/after/partial-normal-ed-360.png) · [end b](release-hole-shots/before/partial-normal-ed-360-end.png)/[a](release-hole-shots/after/partial-normal-ed-360-end.png) |
| partial, normal, 390 | [before](release-hole-shots/before/partial-normal-std-390.png) · [after](release-hole-shots/after/partial-normal-std-390.png) | [before](release-hole-shots/before/partial-normal-ed-390.png) · [after](release-hole-shots/after/partial-normal-ed-390.png) |
| partial, normal, 390/135% | [before](release-hole-shots/before/partial-normal-std-390-135.png) · [after](release-hole-shots/after/partial-normal-std-390-135.png) · [end b](release-hole-shots/before/partial-normal-std-390-135-end.png)/[a](release-hole-shots/after/partial-normal-std-390-135-end.png) | [before](release-hole-shots/before/partial-normal-ed-390-135.png) · [after](release-hole-shots/after/partial-normal-ed-390-135.png) · [end b](release-hole-shots/before/partial-normal-ed-390-135-end.png)/[a](release-hole-shots/after/partial-normal-ed-390-135-end.png) |
| complete, normal, 360 | [before](release-hole-shots/before/complete-normal-std-360.png) · [after](release-hole-shots/after/complete-normal-std-360.png) · [end b](release-hole-shots/before/complete-normal-std-360-end.png)/[a](release-hole-shots/after/complete-normal-std-360-end.png) | [before](release-hole-shots/before/complete-normal-ed-360.png) · [after](release-hole-shots/after/complete-normal-ed-360.png) · [end b](release-hole-shots/before/complete-normal-ed-360-end.png)/[a](release-hole-shots/after/complete-normal-ed-360-end.png) |
| complete, normal, 390 | [before](release-hole-shots/before/complete-normal-std-390.png) · [after](release-hole-shots/after/complete-normal-std-390.png) | [before](release-hole-shots/before/complete-normal-ed-390.png) · [after](release-hole-shots/after/complete-normal-ed-390.png) |
| complete, normal, 390/135% | [before](release-hole-shots/before/complete-normal-std-390-135.png) · [after](release-hole-shots/after/complete-normal-std-390-135.png) | [before](release-hole-shots/before/complete-normal-ed-390-135.png) · [after](release-hole-shots/after/complete-normal-ed-390-135.png) |
| pickup, normal, 360 | [before](release-hole-shots/before/pickup-normal-std-360.png) · [after](release-hole-shots/after/pickup-normal-std-360.png) · [end b](release-hole-shots/before/pickup-normal-std-360-end.png)/[a](release-hole-shots/after/pickup-normal-std-360-end.png) | [before](release-hole-shots/before/pickup-normal-ed-360.png) · [after](release-hole-shots/after/pickup-normal-ed-360.png) · [end b](release-hole-shots/before/pickup-normal-ed-360-end.png)/[a](release-hole-shots/after/pickup-normal-ed-360-end.png) |
| pickup, normal, 390 | [before](release-hole-shots/before/pickup-normal-std-390.png) · [after](release-hole-shots/after/pickup-normal-std-390.png) | [before](release-hole-shots/before/pickup-normal-ed-390.png) · [after](release-hole-shots/after/pickup-normal-ed-390.png) |
| pickup, normal, 390/135% | [before](release-hole-shots/before/pickup-normal-std-390-135.png) · [after](release-hole-shots/after/pickup-normal-std-390-135.png) | [before](release-hole-shots/before/pickup-normal-ed-390-135.png) · [after](release-hole-shots/after/pickup-normal-ed-390-135.png) |
| two, normal, 360 | [before](release-hole-shots/before/two-normal-std-360.png) · [after](release-hole-shots/after/two-normal-std-360.png) · [end b](release-hole-shots/before/two-normal-std-360-end.png)/[a](release-hole-shots/after/two-normal-std-360-end.png) | [before](release-hole-shots/before/two-normal-ed-360.png) · [after](release-hole-shots/after/two-normal-ed-360.png) · [end b](release-hole-shots/before/two-normal-ed-360-end.png)/[a](release-hole-shots/after/two-normal-ed-360-end.png) |
| two, normal, 390 | [before](release-hole-shots/before/two-normal-std-390.png) · [after](release-hole-shots/after/two-normal-std-390.png) | [before](release-hole-shots/before/two-normal-ed-390.png) · [after](release-hole-shots/after/two-normal-ed-390.png) |
| two, normal, 390/135% | [before](release-hole-shots/before/two-normal-std-390-135.png) · [after](release-hole-shots/after/two-normal-std-390-135.png) | [before](release-hole-shots/before/two-normal-ed-390-135.png) · [after](release-hole-shots/after/two-normal-ed-390-135.png) |
| three, normal, 360 | [before](release-hole-shots/before/three-normal-std-360.png) · [after](release-hole-shots/after/three-normal-std-360.png) · [end b](release-hole-shots/before/three-normal-std-360-end.png)/[a](release-hole-shots/after/three-normal-std-360-end.png) | [before](release-hole-shots/before/three-normal-ed-360.png) · [after](release-hole-shots/after/three-normal-ed-360.png) · [end b](release-hole-shots/before/three-normal-ed-360-end.png)/[a](release-hole-shots/after/three-normal-ed-360-end.png) |
| three, normal, 390 | [before](release-hole-shots/before/three-normal-std-390.png) · [after](release-hole-shots/after/three-normal-std-390.png) | [before](release-hole-shots/before/three-normal-ed-390.png) · [after](release-hole-shots/after/three-normal-ed-390.png) |
| three, normal, 390/135% (FAIL, see above) | [before](release-hole-shots/before/three-normal-std-390-135.png) · [after](release-hole-shots/after/three-normal-std-390-135.png) | [before](release-hole-shots/before/three-normal-ed-390-135.png) · [after](release-hole-shots/after/three-normal-ed-390-135.png) |
| empty, long, 360 | [before](release-hole-shots/before/empty-long-std-360.png) · [after](release-hole-shots/after/empty-long-std-360.png) · [end b](release-hole-shots/before/empty-long-std-360-end.png)/[a](release-hole-shots/after/empty-long-std-360-end.png) | [before](release-hole-shots/before/empty-long-ed-360.png) · [after](release-hole-shots/after/empty-long-ed-360.png) · [end b](release-hole-shots/before/empty-long-ed-360-end.png)/[a](release-hole-shots/after/empty-long-ed-360-end.png) |
| empty, long, 390 | [before](release-hole-shots/before/empty-long-std-390.png) · [after](release-hole-shots/after/empty-long-std-390.png) · [end b](release-hole-shots/before/empty-long-std-390-end.png)/[a](release-hole-shots/after/empty-long-std-390-end.png) | [before](release-hole-shots/before/empty-long-ed-390.png) · [after](release-hole-shots/after/empty-long-ed-390.png) · [end b](release-hole-shots/before/empty-long-ed-390-end.png)/[a](release-hole-shots/after/empty-long-ed-390-end.png) |
| empty, long, 390/135% | [before](release-hole-shots/before/empty-long-std-390-135.png) · [after](release-hole-shots/after/empty-long-std-390-135.png) · [end b](release-hole-shots/before/empty-long-std-390-135-end.png)/[a](release-hole-shots/after/empty-long-std-390-135-end.png) | [before](release-hole-shots/before/empty-long-ed-390-135.png) · [after](release-hole-shots/after/empty-long-ed-390-135.png) · [end b](release-hole-shots/before/empty-long-ed-390-135-end.png)/[a](release-hole-shots/after/empty-long-ed-390-135-end.png) |
| partial, long, 360 | [before](release-hole-shots/before/partial-long-std-360.png) · [after](release-hole-shots/after/partial-long-std-360.png) · [end b](release-hole-shots/before/partial-long-std-360-end.png)/[a](release-hole-shots/after/partial-long-std-360-end.png) | [before](release-hole-shots/before/partial-long-ed-360.png) · [after](release-hole-shots/after/partial-long-ed-360.png) · [end b](release-hole-shots/before/partial-long-ed-360-end.png)/[a](release-hole-shots/after/partial-long-ed-360-end.png) |
| partial, long, 390 | [before](release-hole-shots/before/partial-long-std-390.png) · [after](release-hole-shots/after/partial-long-std-390.png) · [end b](release-hole-shots/before/partial-long-std-390-end.png)/[a](release-hole-shots/after/partial-long-std-390-end.png) | [before](release-hole-shots/before/partial-long-ed-390.png) · [after](release-hole-shots/after/partial-long-ed-390.png) · [end b](release-hole-shots/before/partial-long-ed-390-end.png)/[a](release-hole-shots/after/partial-long-ed-390-end.png) |
| partial, long, 390/135% | [before](release-hole-shots/before/partial-long-std-390-135.png) · [after](release-hole-shots/after/partial-long-std-390-135.png) · [end b](release-hole-shots/before/partial-long-std-390-135-end.png)/[a](release-hole-shots/after/partial-long-std-390-135-end.png) | [before](release-hole-shots/before/partial-long-ed-390-135.png) · [after](release-hole-shots/after/partial-long-ed-390-135.png) · [end b](release-hole-shots/before/partial-long-ed-390-135-end.png)/[a](release-hole-shots/after/partial-long-ed-390-135-end.png) |
| complete, long, 360 | [before](release-hole-shots/before/complete-long-std-360.png) · [after](release-hole-shots/after/complete-long-std-360.png) · [end b](release-hole-shots/before/complete-long-std-360-end.png)/[a](release-hole-shots/after/complete-long-std-360-end.png) | [before](release-hole-shots/before/complete-long-ed-360.png) · [after](release-hole-shots/after/complete-long-ed-360.png) · [end b](release-hole-shots/before/complete-long-ed-360-end.png)/[a](release-hole-shots/after/complete-long-ed-360-end.png) |
| complete, long, 390 | [before](release-hole-shots/before/complete-long-std-390.png) · [after](release-hole-shots/after/complete-long-std-390.png) · [end b](release-hole-shots/before/complete-long-std-390-end.png)/[a](release-hole-shots/after/complete-long-std-390-end.png) | [before](release-hole-shots/before/complete-long-ed-390.png) · [after](release-hole-shots/after/complete-long-ed-390.png) · [end b](release-hole-shots/before/complete-long-ed-390-end.png)/[a](release-hole-shots/after/complete-long-ed-390-end.png) |
| complete, long, 390/135% | [before](release-hole-shots/before/complete-long-std-390-135.png) · [after](release-hole-shots/after/complete-long-std-390-135.png) · [end b](release-hole-shots/before/complete-long-std-390-135-end.png)/[a](release-hole-shots/after/complete-long-std-390-135-end.png) | [before](release-hole-shots/before/complete-long-ed-390-135.png) · [after](release-hole-shots/after/complete-long-ed-390-135.png) · [end b](release-hole-shots/before/complete-long-ed-390-135-end.png)/[a](release-hole-shots/after/complete-long-ed-390-135-end.png) |
| pickup, long, 360 | [before](release-hole-shots/before/pickup-long-std-360.png) · [after](release-hole-shots/after/pickup-long-std-360.png) · [end b](release-hole-shots/before/pickup-long-std-360-end.png)/[a](release-hole-shots/after/pickup-long-std-360-end.png) | [before](release-hole-shots/before/pickup-long-ed-360.png) · [after](release-hole-shots/after/pickup-long-ed-360.png) · [end b](release-hole-shots/before/pickup-long-ed-360-end.png)/[a](release-hole-shots/after/pickup-long-ed-360-end.png) |
| pickup, long, 390 | [before](release-hole-shots/before/pickup-long-std-390.png) · [after](release-hole-shots/after/pickup-long-std-390.png) · [end b](release-hole-shots/before/pickup-long-std-390-end.png)/[a](release-hole-shots/after/pickup-long-std-390-end.png) | [before](release-hole-shots/before/pickup-long-ed-390.png) · [after](release-hole-shots/after/pickup-long-ed-390.png) · [end b](release-hole-shots/before/pickup-long-ed-390-end.png)/[a](release-hole-shots/after/pickup-long-ed-390-end.png) |
| pickup, long, 390/135% | [before](release-hole-shots/before/pickup-long-std-390-135.png) · [after](release-hole-shots/after/pickup-long-std-390-135.png) · [end b](release-hole-shots/before/pickup-long-std-390-135-end.png)/[a](release-hole-shots/after/pickup-long-std-390-135-end.png) | [before](release-hole-shots/before/pickup-long-ed-390-135.png) · [after](release-hole-shots/after/pickup-long-ed-390-135.png) · [end b](release-hole-shots/before/pickup-long-ed-390-135-end.png)/[a](release-hole-shots/after/pickup-long-ed-390-135-end.png) |
| two, long, 360 | [before](release-hole-shots/before/two-long-std-360.png) · [after](release-hole-shots/after/two-long-std-360.png) · [end b](release-hole-shots/before/two-long-std-360-end.png)/[a](release-hole-shots/after/two-long-std-360-end.png) | [before](release-hole-shots/before/two-long-ed-360.png) · [after](release-hole-shots/after/two-long-ed-360.png) · [end b](release-hole-shots/before/two-long-ed-360-end.png)/[a](release-hole-shots/after/two-long-ed-360-end.png) |
| two, long, 390 | [before](release-hole-shots/before/two-long-std-390.png) · [after](release-hole-shots/after/two-long-std-390.png) · [end b](release-hole-shots/before/two-long-std-390-end.png)/[a](release-hole-shots/after/two-long-std-390-end.png) | [before](release-hole-shots/before/two-long-ed-390.png) · [after](release-hole-shots/after/two-long-ed-390.png) · [end b](release-hole-shots/before/two-long-ed-390-end.png)/[a](release-hole-shots/after/two-long-ed-390-end.png) |
| two, long, 390/135% | [before](release-hole-shots/before/two-long-std-390-135.png) · [after](release-hole-shots/after/two-long-std-390-135.png) · [end b](release-hole-shots/before/two-long-std-390-135-end.png)/[a](release-hole-shots/after/two-long-std-390-135-end.png) | [before](release-hole-shots/before/two-long-ed-390-135.png) · [after](release-hole-shots/after/two-long-ed-390-135.png) · [end b](release-hole-shots/before/two-long-ed-390-135-end.png)/[a](release-hole-shots/after/two-long-ed-390-135-end.png) |
| three, long, 360 | [before](release-hole-shots/before/three-long-std-360.png) · [after](release-hole-shots/after/three-long-std-360.png) · [end b](release-hole-shots/before/three-long-std-360-end.png)/[a](release-hole-shots/after/three-long-std-360-end.png) | [before](release-hole-shots/before/three-long-ed-360.png) · [after](release-hole-shots/after/three-long-ed-360.png) · [end b](release-hole-shots/before/three-long-ed-360-end.png)/[a](release-hole-shots/after/three-long-ed-360-end.png) |
| three, long, 390 | [before](release-hole-shots/before/three-long-std-390.png) · [after](release-hole-shots/after/three-long-std-390.png) · [end b](release-hole-shots/before/three-long-std-390-end.png)/[a](release-hole-shots/after/three-long-std-390-end.png) | [before](release-hole-shots/before/three-long-ed-390.png) · [after](release-hole-shots/after/three-long-ed-390.png) · [end b](release-hole-shots/before/three-long-ed-390-end.png)/[a](release-hole-shots/after/three-long-ed-390-end.png) |
| three, long, 390/135% (FAIL, see above) | [before](release-hole-shots/before/three-long-std-390-135.png) · [after](release-hole-shots/after/three-long-std-390-135.png) · [end b](release-hole-shots/before/three-long-std-390-135-end.png)/[a](release-hole-shots/after/three-long-std-390-135-end.png) | [before](release-hole-shots/before/three-long-ed-390-135.png) · [after](release-hole-shots/after/three-long-ed-390-135.png) · [end b](release-hole-shots/before/three-long-ed-390-135-end.png)/[a](release-hole-shots/after/three-long-ed-390-135-end.png) |

## Limits
- Linux Chromium has no San Francisco: layout and computed styles, **not iPhone typography**. Number widths on a
  real iPhone may differ, so the three-digit margins (1–3px at 360px) need the real-phone check.
- 135% is simulated by raising the root text size, not by iOS Dynamic Type.
- The real-iPhone / sunlight review is still outstanding.
