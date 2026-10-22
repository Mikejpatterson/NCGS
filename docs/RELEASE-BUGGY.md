# Release evidence: Buggy Wars (roadmap v1, task `release-buggy-evidence`)

Evidence only: no application change. Invented fixture data only (`data/fixture-seed.json`: Aidan, Bartley, Cathal,
Donnacha and so on). No real member data. All screenshots are **Linux Chromium (Playwright) with touch on**, not an
iPhone. The real-phone sunlight check is still outstanding (see the end).

## Source SHAs
| | Commit | Why this one |
|---|---|---|
| Before (baseline) | `79ba2225886f99e1af748adf19b047232164ff8c` | The design commit roadmap v1 was written against (same baseline as `docs/RELEASE-HOME.md` and `docs/RELEASE-HOLE.md`) |
| After (candidate) | `0ba3b08b1a6c06c3184778cdaf5bc0038f779a84` | Current design branch when the shots were taken (round 1 of this task added only the tools) |

`git diff --stat 79ba222 0ba3b08 -- src build.js data/fixture-seed.json`: `src/app/30-play.js` (+15 −1) and
`src/styles.css` (+4 −2). These are `name-resize-fix` and `three-digit-fix`, both on the score entry screen only.
This round changes no app source (`git diff --stat 0ba3b08 -- src build.js data/fixture-seed.json` is empty), so the
"after" shots also stand for the commit the workflow makes for this round.

The baseline was built from the files of `79ba222` (`src/`, `build.js`, `data/fixture-seed.json`, written out with
`git show 79ba222:<file>` into `dist/base`).

## Commands
```sh
# dist/base holds the 79ba222 files; each build writes dist/preview.html, copied out after each one
(cd dist/base && NCGS_FIXTURE=1 node build.js)                          # -> dist/rbw/before-std.html
(cd dist/base && NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js)    # -> dist/rbw/before-ed.html
NCGS_FIXTURE=1 node build.js                                            # -> dist/rbw/after-std.html
NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js                      # -> dist/rbw/after-ed.html
node tools/release-buggy-shots.js dist/rbw/after-std.html  std docs/release-buggy-shots/after --cvd > docs/release-buggy-shots/after-std.txt
node tools/release-buggy-shots.js dist/rbw/after-ed.html   ed  docs/release-buggy-shots/after --cvd > docs/release-buggy-shots/after-ed.txt
node tools/release-buggy-shots.js dist/rbw/before-std.html std docs/release-buggy-shots/before > docs/release-buggy-shots/before-std.txt
node tools/release-buggy-shots.js dist/rbw/before-ed.html  ed  docs/release-buggy-shots/before > docs/release-buggy-shots/before-ed.txt
node tools/release-buggy-shots.js --compare docs/release-buggy-shots/before/std-parity.json docs/release-buggy-shots/after/std-parity.json
node tools/release-buggy-shots.js --compare docs/release-buggy-shots/before/ed-parity.json  docs/release-buggy-shots/after/ed-parity.json
node tools/release-buggy-shots.js --compare docs/release-buggy-shots/after/std-parity.json  docs/release-buggy-shots/after/ed-parity.json
```
`tools/release-buggy-shots.js` reuses the measuring and colour-blindness simulation of `tools/team-colour-audit.js`
(the same code as `docs/TEAM-COLOURS.md`); its header explains every check. Sizes: 360×740, 390×844, and 390×844
with root text at 135%. Both looks: standard and editorial.

## States (7 per size and look, 42 screens per build)
| State | What it shows |
|---|---|
| `live-open` | Results › Buggy Wars, demo round (live, thru 14), Group 1: back nine open, navy leads "1 up, 4 to play" |
| `live-decided` | the same, Front nine opened: a decided nine ("Won 2 up") with its hole board |
| `live-halved` | the same, Group 2: a halved front nine (grey pill) beside a navy-led back nine |
| `final-decided` | a finished round (fx-r2), Group 3: crimson wins front nine (3&2) and overall (1 up), navy the back nine (4&2) |
| `results` | the finished round's results page, scrolled to Buggy Wars: "Buggy 1 / Buggy 2" pills and scores |
| `nobug-results` | no buggies: the demo round's groups lent, in memory only, as one team of four (the fixture has no such round). Results tab |
| `nobug-hole` | the same no-buggies draw, Hole tab: score entry |

## Result: before vs after
- **Screenshots: all 42 before/after pairs are byte-for-byte identical** (checked with a byte compare of every PNG).
  So the "before" PNGs were not kept; rerun the commands to reproduce them. Expected: neither app change since the
  baseline touches Buggy Wars.
- **Measurement logs:** `before-std.txt` = `after-std.txt` and `before-ed.txt` = `after-ed.txt`, line for line.
- **Content/control parity** (every control with its `data-*`, label, pressed/expanded/selected and disabled state,
  and every word on screen): before vs after, standard: "all 21 screens: same controls and same words"; editorial:
  the same; standard vs editorial (after): the same. The editorial look changes colours only.

## Checks: 21 of 21 screens pass in each look, before and after (84 of 84); all four logs end "ALL PASSED"
- **Colour-only result pills kept (owner, 20 October):** every Buggy Wars pill shows only the match words ("Won 2 up",
  "1 up, 4 to play", "3 up, 4 to play", "Won 3&2", "Won 4&2", "Won 1 up", "Halved"). No names, initials, "Buggy" or
  leader words. Colour class: navy (`a`), crimson (`b`) or grey (`n`, Halved).
- **Screen-reader labels unchanged:** a led pill is read as the pair then the words ("Aidan & Bartley Won 2 up",
  "Kevin & Lorcan Won 3&2"); Halved is read as "Halved". Identical before and after.
- **Pair order and initials:** Buggy 1 badges first, then "v", then Buggy 2 (AF BF v CF DF; EF FF v GF HF;
  IF JF v KF LF), each badge labelled with the player's name. In every hole board Buggy 1's row is above Buggy 2's.
  The round results page keeps its "Buggy 1 / Buggy 2" words (this is not a Buggy Wars result pill and is unchanged).
- **No buggies:** no Buggy Wars pill on Results and no team colour anywhere on either no-buggies screen (6 of 6).
- **Nothing cut off or off the side**, no page wider than the screen, **no button under 44px**, no page errors.

### Measured contrast (WCAG 2 ratio; text needs 4.5:1)
| Element | Standard (`#0A60C9` / `#C62828`) | Editorial (`#244A78` / `#9B3443`) |
|---|---|---|
| Result pill `.bw-res`, white on team colour | 5.95 / 5.62 | 9.03 / 7.08 |
| Initials badge `.bw-bd`, white on team colour | 5.95 / 5.62 | 9.03 / 7.08 |
| Hole won `.bw-c.wa` / `.wb`, white on team colour | 5.95 / 5.62 | 9.03 / 7.08 |
| Holes total `.bw-t`, team colour on white | 5.95 / 5.62 | 9.03 / 7.08 |
| Results page `.pill.a` / `.pill.b`, white on team colour | 5.95 / 5.62 | 9.03 / 7.08 |
| Results page soft pill `.pill.soft`, team colour on tint | 4.89 / 4.57 | 7.27 / 5.78 |

Lowest text: standard 4.57:1, editorial 5.78:1, both above 4.5:1. The only shape under 3:1 is the soft pill's pale
tint against the white card (1.22 standard, 1.23 editorial), the same as `docs/TEAM-COLOURS.md` records: the tint is
decoration, and the words inside carry the result.

## Screenshots (candidate `0ba3b08`)
Originals are `docs/release-buggy-shots/after/<state>-<std|ed>-<360|390|390-135>.png`. The `-cvd.png` beside each one
is labelled **ORIGINAL | SIMULATED DEUTERANOPIA | SIMULATED PROTANOPIA** (Machado et al. 2009, severity 1.0).

| State, 390px | Standard | Editorial |
|---|---|---|
| live-open | [original](release-buggy-shots/after/live-open-std-390.png) · [simulations](release-buggy-shots/after/live-open-std-390-cvd.png) | [original](release-buggy-shots/after/live-open-ed-390.png) · [simulations](release-buggy-shots/after/live-open-ed-390-cvd.png) |
| live-decided | [original](release-buggy-shots/after/live-decided-std-390.png) · [simulations](release-buggy-shots/after/live-decided-std-390-cvd.png) | [original](release-buggy-shots/after/live-decided-ed-390.png) · [simulations](release-buggy-shots/after/live-decided-ed-390-cvd.png) |
| live-halved | [original](release-buggy-shots/after/live-halved-std-390.png) · [simulations](release-buggy-shots/after/live-halved-std-390-cvd.png) | [original](release-buggy-shots/after/live-halved-ed-390.png) · [simulations](release-buggy-shots/after/live-halved-ed-390-cvd.png) |
| final-decided | [original](release-buggy-shots/after/final-decided-std-390.png) · [simulations](release-buggy-shots/after/final-decided-std-390-cvd.png) | [original](release-buggy-shots/after/final-decided-ed-390.png) · [simulations](release-buggy-shots/after/final-decided-ed-390-cvd.png) |
| results | [original](release-buggy-shots/after/results-std-390.png) · [simulations](release-buggy-shots/after/results-std-390-cvd.png) | [original](release-buggy-shots/after/results-ed-390.png) · [simulations](release-buggy-shots/after/results-ed-390-cvd.png) |
| nobug-results | [original](release-buggy-shots/after/nobug-results-std-390.png) | [original](release-buggy-shots/after/nobug-results-ed-390.png) |
| nobug-hole | [original](release-buggy-shots/after/nobug-hole-std-390.png) | [original](release-buggy-shots/after/nobug-hole-ed-390.png) |

The 360 and 390-135 files follow the same names. The no-buggies simulations are also there but show no team colour.

What the simulations show (by eye, not a pass/fail): navy stays blue under both; crimson becomes olive-brown
(deuteranopia) or dark grey-brown (protanopia). The two teams remain different in lightness and hue, and the badges
keep their order and initials, but the pill colour alone is harder to tell apart. That is the owner's recorded
colour-only decision; it is not broadened here and no leader words were added.

## Not covered: the real-phone sunlight check is still outstanding
Everything above is a desktop browser on Linux with invented data. Simulated colour blindness is a model, not a person,
and none of this is a real-iPhone or outdoor sunlight result. One real-phone session in daylight is still needed to
judge the navy/crimson pills, the soft pills and the hole board (roadmap, "Blocked or owner-only work").
