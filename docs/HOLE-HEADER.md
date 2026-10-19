# Hole screen header: screenshot-first review (Stage 3, no app change)

Issue #1, DECIDED 5: start from the real app, not the mock-up, and change the header only if screenshots show a real
improvement. Conclusion: **no app change**. The real header already has the proposed shape, and the proposed PAR | SI
block costs more than it gains.

## How it was measured
- Builds: `NCGS_FIXTURE=1 node build.js` (standard) and `NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js` (editorial),
  invented fixture data only, Chromium, Hole tab → first group → score entry (fixture opens on hole 15, par 3, index 14, 148 yds).
- Sizes: 360px, 390px, 390px with 135% text, and 360px with 135% text (the tightest case). Element boxes and computed
  styles were read from the live page (`.entcard`, `.entl`, `.entn`, `.entr`).
- The PAR | SI proposal was tried **in the screenshots only**, by replacing the right-hand block in the browser. It was never
  added to the app.

## Screenshots (in `docs/hole-header-shots/`, invented fixture data, Chromium on Linux)
There are no "after" shots, because the app was not changed. `before-*` is the real app; `mock-*` is the proposal,
patched into the page in the browser only.

| Size | Standard, now | Editorial, now | Standard, proposal | Editorial, proposal |
|---|---|---|---|---|
| 360px | [before-standard-360](hole-header-shots/before-standard-360.png) | [before-editorial-360](hole-header-shots/before-editorial-360.png) | [mock-standard-360](hole-header-shots/mock-standard-360.png) | [mock-editorial-360](hole-header-shots/mock-editorial-360.png) |
| 390px | [before-standard-390](hole-header-shots/before-standard-390.png) | [before-editorial-390](hole-header-shots/before-editorial-390.png) | [mock-standard-390](hole-header-shots/mock-standard-390.png) | [mock-editorial-390](hole-header-shots/mock-editorial-390.png) |
| 390px, 135% | [before-standard-390-135](hole-header-shots/before-standard-390-135.png) | [before-editorial-390-135](hole-header-shots/before-editorial-390-135.png) | [mock-standard-390-135](hole-header-shots/mock-standard-390-135.png) | [mock-editorial-390-135](hole-header-shots/mock-editorial-390-135.png) |
| 360px, 135% | [before-standard-360-135](hole-header-shots/before-standard-360-135.png) | [before-editorial-360-135](hole-header-shots/before-editorial-360-135.png) | [mock-standard-360-135](hole-header-shots/mock-standard-360-135.png) | [mock-editorial-360-135](hole-header-shots/mock-editorial-360-135.png) |

To redo them: build both previews (commands above), copy each `dist/preview.html` somewhere, then run
`node tools/hole-header-shots.js <file> std|ed <outdir>` (add `1` at the end for the mock). It prints the measurements
used in the table below.

Tests run for this review (nothing in the app changed, so these only confirm that):
- `node --test test/engine.test.js test/server.test.js`: the two files CLAUDE.md lists (53 tests).
- `node --test test/engine.test.js test/server.test.js test/fuzz.engine.test.js test/fuzz.server.test.js`: the same plus
  the random-input tests, as the workflow runs them (`.github/workflows/design-ci.yml`), 78 tests.
- `sh tools/guard.sh 7e0fac6e51f22f6bc6a95b108c7e4a80bffdd7ae`: no protected files changed.

## What the real header does now (both looks are identical here; only team colours differ further down)
| Size | Card height | Left: hole number | Right block | Par line | Index · yards line |
|---|---|---|---|---|---|
| 360px | 109px | 62px wide, 61px type, weight 900 | 123px wide, right-aligned | 25.5px, weight 800, white | 15px, white at 82% |
| 390px | 109px | same | 123px wide | same | same |
| 390px, 135% | 128px | 79px wide, 78px type | 156px wide | 32.4px | 19px |
| 360px, 135% | 128px | same | 156px wide, 23px gap to the number | 32.4px | 19px |

So the hole number is already dominant on the left, Par is already on the right, and Index and yards already sit
beneath it. The header is not left-heavy: the right block is wider than the left one at every size.

## The proposal, tried in screenshots
Separate PAR and SI columns (small label above a big figure, thin divider), yards beneath.

Gains
- The stroke index becomes a big bold figure (34px, 43px at 135%) instead of 15px regular text.

Costs
- The card grows 8px at every size, which pushes every player row and score button down by 8px. On a small phone
  with large text that leaves less of the second buggy on screen before you scroll.
- The words on screen change ("Par 3", "Index 14" become "PAR 3", "SI 14"). The app says "Index" everywhere else
  (the next-hole button, the per-player shot details), and changing that is a wording decision that isn't recorded.
- Two more yellow labels next to "HOLE" weaken flag-yellow as the one "now" accent (DECIDED).
- It needs new markup in `src/app/30-play.js` and new rules in `styles.css`, so it would change the standard look too.
  It can't be kept to the editorial look, because `editorial-prototype.css` is token swaps only.
- Par is what scoring starts from (every empty score reads "Par 3"), so it already gets the most weight on the right.
  The stroke index matters less while scoring, because each player's shots on the hole already show as dots under their name.

## If the design lead still wants the index bigger
The smallest change would be to make the existing "Index 14 · 148 yds" line bolder or larger, with no new markup or
wording. That wasn't done here, because the screenshots don't show the current line failing: 15px at 82% white on pine
is still about 8.7:1 contrast (AAA needs 7:1).
