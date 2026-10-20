# Release evidence: Home (roadmap v1, task `release-home-evidence`)

Evidence only: no application change. Invented fixture data only (`data/fixture-seed.json`; "you" is the fixture
golfer Cathal, whose internal id is `colin`, which is why `tools/release-home-shots.js` sets
`prefs.me = 'colin'`: see the rename map in `tools/make-fixture.js`; normal names such as Kevin, Bartley, Aidan). No real member data.

## Source SHAs
| | Commit | Why this one |
|---|---|---|
| Before (baseline) | `79ba2225886f99e1af748adf19b047232164ff8c` | The design commit the approved roadmap v1 was written against |
| After (current) | `9868aac2f9564e3c1019715ee0686a1e06bec551` (app source identical to `a462872`) | Current design branch |

`git diff --stat 79ba222 9868aac -- src build.js data` shows one change: `src/app/30-play.js` (+14 lines, the
`name-resize-fix` re-measure on the score-entry screen). Nothing that draws Home changed.

Earlier evidence reused for context, not re-captured: `docs/TYPOGRAPHY.md` (serif allowlist, long-title rules) and
`docs/LONG-NAMES.md`.

## Commands
```sh
# baseline tree, unpacked from git (no branch switch)
mkdir -p dist/base && git archive 79ba2225886f99e1af748adf19b047232164ff8c | tar -x -C dist/base
# four previews (each build writes dist/preview.html; copy it out after each one)
(cd dist/base && NCGS_FIXTURE=1 node build.js)                          # -> dist/rh/before-std.html
(cd dist/base && NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js)    # -> dist/rh/before-ed.html
NCGS_FIXTURE=1 node build.js                                            # -> dist/rh/after-std.html
NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js                      # -> dist/rh/after-ed.html
# screenshots + measurements (the current tool for both builds, so both are measured the same way)
node tools/release-home-shots.js dist/rh/before-std.html std docs/release-home-shots/before > docs/release-home-shots/before-std.txt
node tools/release-home-shots.js dist/rh/before-ed.html  ed  docs/release-home-shots/before > docs/release-home-shots/before-ed.txt
node tools/release-home-shots.js dist/rh/after-std.html  std docs/release-home-shots/after  > docs/release-home-shots/after-std.txt
node tools/release-home-shots.js dist/rh/after-ed.html   ed  docs/release-home-shots/after  > docs/release-home-shots/after-ed.txt
```
Linux Chromium (Playwright), 2× pixels, touch on. Sizes: 360×740, 390×844, and 390×844 with root text at 135%.

States (made from the fixture in memory before the app starts; the checked-in fixture is unchanged):
- `next`: as built, next round booked (no round in play)
- `live`: normal title "Cabopino", thru 9
- `live-long`: the fixture's 47-letter title "Cabopino, the long-named second day of the trip", thru 9
- `finished`: nothing booked, last round final
- `no-round`: no rounds at all

Long screens get a second shot scrolled to the end (`-end`), showing the content under the tab bar.

## Serif allowlist (DECIDED, `docs/TYPOGRAPHY.md`)
Display serif only on `.hero.home .wordmark`, `.hero.home .now-name` and `.rp-name`. The tool flags any other
serif text as `NOT ALLOWED`. Result: standard look has no serif text anywhere; editorial look has serif only on
`.wordmark` and `.now-name`. No `NOT ALLOWED` line in any of the 30 measurements.

## Result: before vs after
All 46 before/after screenshot pairs are **byte-for-byte identical**, and the four measurement logs are identical
(`diff before-std.txt after-std.txt`, same for `ed`). There is no difference on Home between the baseline and now.

## Checks (same before and after, every state, size and look)
- **Action yellow** (#F6C515): the badge in every state; "Today"/"Next" label and the main yellow button (`.go`) when
  a round is booked or live; the "Thru 9" pill when live.
- **Pill navigation**: when a round is live, a floating glass pill (blur on, radius 34px) with all four tabs
  (Home, Hole 10, Results, Ruling), 328×68 at 360px and 358×68 at 390px, smallest tab 52px high, inside the screen.
  In `next`, `finished` and `no-round` the tab bar is hidden: by design it only shows while a round is in play
  (`src/app/90-main.js`, `inPlay`).
- **Large text**: root 17px → 21.6px at 135%; titles grow with it (30.6px → 38.88px).
- **Unclipped**: no cut-off, ellipsis or off-screen text; no button or link under 44px.
- **Long title**: whole text, no ellipsis. Standard: 2 lines at 360/390px, 3 lines at 135%. Editorial: 2 lines at
  all three sizes (the serif is narrower). Within the DECIDED limit (2 lines, 3 at large text).

## Difference notes
- **Before → after**: none (see above).
- **Standard → editorial** (the only visible difference): the wordmark "NCGS" and the round title / "No round
  booked" are in the serif. Everything else (names, numbers, rows, buttons, tabs) stays in the system font, same
  sizes, same colours, same positions except where the shorter serif title takes fewer lines (long title at 135%:
  editorial 2 lines vs standard 3, so the card below moves up by one line, about 28px).
- Observation, not a defect: in `finished`, the "Last round" row label wraps to two lines next to the long title
  value at 360px (both looks). Nothing is cut off.

## Pairs
Each row: before | after. Standard (`std`) and editorial (`ed`) look.

| State, size | Standard | Editorial |
|---|---|---|
| next 360 | [before](release-home-shots/before/next-std-360.png) · [after](release-home-shots/after/next-std-360.png) · [end b](release-home-shots/before/next-std-360-end.png)/[a](release-home-shots/after/next-std-360-end.png) | [before](release-home-shots/before/next-ed-360.png) · [after](release-home-shots/after/next-ed-360.png) · [end b](release-home-shots/before/next-ed-360-end.png)/[a](release-home-shots/after/next-ed-360-end.png) |
| next 390 | [before](release-home-shots/before/next-std-390.png) · [after](release-home-shots/after/next-std-390.png) | [before](release-home-shots/before/next-ed-390.png) · [after](release-home-shots/after/next-ed-390.png) |
| next 390/135% | [before](release-home-shots/before/next-std-390-135.png) · [after](release-home-shots/after/next-std-390-135.png) · [end b](release-home-shots/before/next-std-390-135-end.png)/[a](release-home-shots/after/next-std-390-135-end.png) | [before](release-home-shots/before/next-ed-390-135.png) · [after](release-home-shots/after/next-ed-390-135.png) · [end b](release-home-shots/before/next-ed-390-135-end.png)/[a](release-home-shots/after/next-ed-390-135-end.png) |
| live 360 | [before](release-home-shots/before/live-std-360.png) · [after](release-home-shots/after/live-std-360.png) · [end b](release-home-shots/before/live-std-360-end.png)/[a](release-home-shots/after/live-std-360-end.png) | [before](release-home-shots/before/live-ed-360.png) · [after](release-home-shots/after/live-ed-360.png) · [end b](release-home-shots/before/live-ed-360-end.png)/[a](release-home-shots/after/live-ed-360-end.png) |
| live 390 | [before](release-home-shots/before/live-std-390.png) · [after](release-home-shots/after/live-std-390.png) · [end b](release-home-shots/before/live-std-390-end.png)/[a](release-home-shots/after/live-std-390-end.png) | [before](release-home-shots/before/live-ed-390.png) · [after](release-home-shots/after/live-ed-390.png) · [end b](release-home-shots/before/live-ed-390-end.png)/[a](release-home-shots/after/live-ed-390-end.png) |
| live 390/135% | [before](release-home-shots/before/live-std-390-135.png) · [after](release-home-shots/after/live-std-390-135.png) · [end b](release-home-shots/before/live-std-390-135-end.png)/[a](release-home-shots/after/live-std-390-135-end.png) | [before](release-home-shots/before/live-ed-390-135.png) · [after](release-home-shots/after/live-ed-390-135.png) · [end b](release-home-shots/before/live-ed-390-135-end.png)/[a](release-home-shots/after/live-ed-390-135-end.png) |
| live-long 360 | [before](release-home-shots/before/live-long-std-360.png) · [after](release-home-shots/after/live-long-std-360.png) · [end b](release-home-shots/before/live-long-std-360-end.png)/[a](release-home-shots/after/live-long-std-360-end.png) | [before](release-home-shots/before/live-long-ed-360.png) · [after](release-home-shots/after/live-long-ed-360.png) · [end b](release-home-shots/before/live-long-ed-360-end.png)/[a](release-home-shots/after/live-long-ed-360-end.png) |
| live-long 390 | [before](release-home-shots/before/live-long-std-390.png) · [after](release-home-shots/after/live-long-std-390.png) · [end b](release-home-shots/before/live-long-std-390-end.png)/[a](release-home-shots/after/live-long-std-390-end.png) | [before](release-home-shots/before/live-long-ed-390.png) · [after](release-home-shots/after/live-long-ed-390.png) · [end b](release-home-shots/before/live-long-ed-390-end.png)/[a](release-home-shots/after/live-long-ed-390-end.png) |
| live-long 390/135% | [before](release-home-shots/before/live-long-std-390-135.png) · [after](release-home-shots/after/live-long-std-390-135.png) · [end b](release-home-shots/before/live-long-std-390-135-end.png)/[a](release-home-shots/after/live-long-std-390-135-end.png) | [before](release-home-shots/before/live-long-ed-390-135.png) · [after](release-home-shots/after/live-long-ed-390-135.png) · [end b](release-home-shots/before/live-long-ed-390-135-end.png)/[a](release-home-shots/after/live-long-ed-390-135-end.png) |
| finished 360 | [before](release-home-shots/before/finished-std-360.png) · [after](release-home-shots/after/finished-std-360.png) | [before](release-home-shots/before/finished-ed-360.png) · [after](release-home-shots/after/finished-ed-360.png) |
| finished 390 | [before](release-home-shots/before/finished-std-390.png) · [after](release-home-shots/after/finished-std-390.png) | [before](release-home-shots/before/finished-ed-390.png) · [after](release-home-shots/after/finished-ed-390.png) |
| finished 390/135% | [before](release-home-shots/before/finished-std-390-135.png) · [after](release-home-shots/after/finished-std-390-135.png) | [before](release-home-shots/before/finished-ed-390-135.png) · [after](release-home-shots/after/finished-ed-390-135.png) |
| no-round 360 | [before](release-home-shots/before/no-round-std-360.png) · [after](release-home-shots/after/no-round-std-360.png) | [before](release-home-shots/before/no-round-ed-360.png) · [after](release-home-shots/after/no-round-ed-360.png) |
| no-round 390 | [before](release-home-shots/before/no-round-std-390.png) · [after](release-home-shots/after/no-round-std-390.png) | [before](release-home-shots/before/no-round-ed-390.png) · [after](release-home-shots/after/no-round-ed-390.png) |
| no-round 390/135% | [before](release-home-shots/before/no-round-std-390-135.png) · [after](release-home-shots/after/no-round-std-390-135.png) | [before](release-home-shots/before/no-round-ed-390-135.png) · [after](release-home-shots/after/no-round-ed-390-135.png) |

## Limits
- Linux Chromium has neither New York nor San Francisco: these screenshots show layout and computed styles, **not
  iPhone typography**. Serif widths, line counts and weights on a real iPhone may differ. The phone/sunlight check
  is still outstanding.
- 135% is simulated by raising the root text size, not by iOS Dynamic Type.
- The date line shows the day the shots were taken (20 October 2026).
