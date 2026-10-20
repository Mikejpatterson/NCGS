# Text size changed while score entry is open (roadmap task `name-resize-check`)

`docs/LONG-NAMES.md` said: rows on score entry are measured again when the screen is drawn or the phone is turned,
but if the text size changes while the screen is open, they wait for the next tap. This checks whether a name
actually runs into a button in that gap. Evidence only: no app code was changed.

**Result: yes, overlap happens before the next tap, in both looks.** The next tap puts it right every time.

## How it was checked
```
NCGS_FIXTURE=1 node build.js                        # then copy dist/preview.html to dist/nrc-std.html
NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js  # then copy dist/preview.html to dist/nrc-ed.html
node tools/name-resize-check.js dist/nrc-std.html std docs/name-resize-shots
node tools/name-resize-check.js dist/nrc-ed.html  ed  docs/name-resize-shots
```
The tool opens one group's score entry, lends four invented names to that group's players (in memory only), and
then, on the same open screen with no tap, changes the text size: 100% to 135% ("up") and 135% to 100% ("down"), at
360×740 and 390×844. It measures every row three times: as drawn, straight after the change, and after the next tap
(+ on the first player). A row fails if a letter or the arrow after the name overlaps that row's Pick up, −, score or
+, if the name goes outside its row, or if a control is under 44px. It exits 1 when any state fails.

| Name | Kind |
|---|---|
| Aidan | normal (fits beside the buttons everywhere) |
| Donnacha | borderline (the recorded case from `docs/LONG-NAMES.md`) |
| Fiachra Óg | borderline |
| Bartholomew Featherstonehaugh | long (always on its own line) |

## What happened (both looks give the same numbers)
| Width, change | As drawn | After the change, before any tap | After the next tap |
|---|---|---|---|
| 360, 100% → 135% | pass | **FAIL**: Fiachra Óg's arrow on the − button (name ends 178px, − starts 160px). Donnacha's arrow ends at 169px, just above the − circle | pass (both move to their own line) |
| 360, 135% → 100% | pass | pass, but Donnacha and Fiachra Óg stay on two lines although they now fit on one | pass (back to compact one-line rows) |
| 390, 100% → 135% | pass | pass, but Donnacha and Fiachra Óg stay on two lines although they now fit on one | pass (back to one line) |
| 390, 135% → 100% | pass | **FAIL**: Donnacha's and Fiachra Óg's arrows on top of "Pick up" (names end 143px and 151px, Pick up starts 129px) | pass (both move to their own line) |

- Aidan's row stays compact and one-line in every state; the long name is on its own line in every state.
- No control was under 44px and no name went outside its row in any state.
- The change produced **0** window "resize" events, which is why `fitNames()` (it listens for "resize") does not run.
- Full numbers: `name-resize-shots/check-std.txt` and `check-ed.txt`.

## Screenshots (`name-resize-shots/`)
`{std,ed}-{360,390}-{up,down}-{a-drawn,b-changed,c-tapped}.png`, full page. The overlap is easiest to see in
`ed-390-down-b-changed.png` / `std-390-down-b-changed.png` (arrows over Pick up) and `*-360-up-b-changed.png`
(Fiachra Óg's arrow on −). `std` is the standard look, `ed` the editorial look.

## What this does and does not show
- This is Chromium on Linux. The text size is changed by CSS on the page, which is how the other layout checks
  simulate 135% text. It is **not** an iPhone.
- On an iPhone the text size is set in Settings or Control Centre. Not tested here: whether Safari or the home-screen
  app reflows the open screen at once, and whether it sends a "resize" event (if it does, `fitNames()` already fixes
  the rows). Changing it in Settings means leaving the app; on return the app syncs, but it only redraws if new scores
  came in, so the gap can last until the next tap or the next score from another phone.
- A real-phone check needs: score entry open with a name like "Donnacha", change Text Size in Control Centre, come
  back without tapping, and look at the arrow beside Pick up.
- Roadmap task 3 (`name-resize-fix`) was conditional on a demonstrated overlap; this is that evidence in Chromium.
  This tool is its reproduction: a fix should make all 24 states pass.
