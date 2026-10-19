# Touch-target audit at 44px (report only)

Issue #1, DECIDED 4: report what fails at 44px before changing any control. Nothing in the app was changed.

## How it was measured
- `test/layout.run.js` with the new opt-in setting `MIN_TARGET=44`. Without it, the test behaves exactly as before
  (checked: output identical to the previous version, 81 of 81 pass on the standard look and 81 of 81 on the editorial look).
- With `MIN_TARGET=44` the test checks **width and height** of every visible control on the page: buttons, links,
  text boxes, tabs and anything with `data-act`. That includes the floating tab bar, which the normal check doesn't look at.
- Builds: `NCGS_FIXTURE=1 node build.js` (standard) and `NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js` (editorial),
  invented fixture data, Chromium, 27 golfer screens at 360px, 390px and 390px with 135% text.
- To repeat: `python3 -m http.server 8765 -d dist & MIN_TARGET=44 node test/layout.run.js` (each small control prints as a `TARGET` line).

## Results
Standard look: 78 of 81 screen checks pass. Editorial look: the same 78 of 81. Both looks fail in the same one place.

| Look | Screen | Size | Control | Measured | Suggestion |
|---|---|---|---|---|---|
| Standard | Ruling (`rules`) | 360px | Your rules question (text box) | 322 × 36 | Make the question box at least 44px tall when empty; it can still grow as you type. |
| Standard | Ruling (`rules`) | 390px | Your rules question (text box) | 352 × 36 | Same: give the empty question box a 44px minimum height. |
| Standard | Ruling (`rules`) | 390px, 135% text | Your rules question (text box) | 352 × 42 | Same: a 44px minimum height also covers large text. |
| Editorial | Ruling (`rules`) | 360px | Your rules question (text box) | 322 × 36 | Same as standard (the editorial look only swaps colours and fonts here). |
| Editorial | Ruling (`rules`) | 390px | Your rules question (text box) | 352 × 36 | Same as standard. |
| Editorial | Ruling (`rules`) | 390px, 135% text | Your rules question (text box) | 352 × 42 | Same as standard. |

Every other control on the 27 screens is at least 44 × 44px in both looks, including the tab bar.

## Fix: Ruling question box (issue #1, after the audit above)
One CSS value changed in `src/styles.css`: the question box's smallest height went from 28px to 44px
(`.askbar textarea { … min-height: 44px; … }`). It still grows as you type, because the height the app sets while
you type is only ever larger. Nothing else changed: same text, focus, typing, send button and place on the page.

Measured with `node tools/ruling-shots.js <build> <tag> docs/ruling-shots` (fixture builds, Chromium, no animation):

| Look | Size | Before (empty box) | After (empty box) | Long question, before → after |
|---|---|---|---|---|
| Standard | 360px | 322 × 36 | 322 × 44 | 82 → 82 tall |
| Standard | 390px | 352 × 36 | 352 × 44 | 82 → 82 tall |
| Standard | 390px, 135% text | 352 × 42 | 352 × 44 | 100 → 100 tall |
| Editorial | 360px | 322 × 36 | 322 × 44 | 82 → 82 tall |
| Editorial | 390px | 352 × 36 | 352 × 44 | 82 → 82 tall |
| Editorial | 390px, 135% text | 352 × 42 | 352 × 44 | 100 → 100 tall |

Screenshots (empty Ruling screen), before / after:
- Standard 360: [before](ruling-shots/ruling-std-before-360.png) / [after](ruling-shots/ruling-std-after-360.png)
- Standard 390: [before](ruling-shots/ruling-std-before-390.png) / [after](ruling-shots/ruling-std-after-390.png)
- Standard 390 at 135%: [before](ruling-shots/ruling-std-before-390-135.png) / [after](ruling-shots/ruling-std-after-390-135.png)
- Editorial 360: [before](ruling-shots/ruling-ed-before-360.png) / [after](ruling-shots/ruling-ed-after-360.png)
- Editorial 390: [before](ruling-shots/ruling-ed-before-390.png) / [after](ruling-shots/ruling-ed-after-390.png)
- Editorial 390 at 135%: [before](ruling-shots/ruling-ed-before-390-135.png) / [after](ruling-shots/ruling-ed-after-390-135.png)

Other checks after the fix: the normal layout test passes 81 of 81 on both looks, and the design comparison
(before vs after build) shows the same controls, the same words and 0 changed pixels on all 39 of its screens in
both looks (it does not open Ruling, which is the only screen that changed).

Not yet re-run here: the full `MIN_TARGET=44` layout audit. The agent's sandbox would not allow the command with
that setting, so the 44px pass count after the fix comes from the workflow's own run. Expected: 81 of 81 on both
looks, since the question box was the only failure and now measures 44px tall at every size.

## Worth knowing
- Many controls are **exactly** 44px tall (for example "Who are you?", "Back", the round tabs Players / Groups / KBs /
  Weather / Course). They pass, but with no margin: a later style change that trims a pixel would make them fail.
  A trial run at 48px listed 317 such cases across the three sizes on the standard look.
- The audit measures the visible box of each control. If a control has an invisible enlarged tap area (made with
  CSS outside the box), that extra area is not counted. This was not checked separately.
- Only the screens the layout test opens are covered (the 27 golfer screens). Organiser screens and pop-ups that the
  test does not open were not audited.
