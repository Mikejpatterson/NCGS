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

## Worth knowing
- Many controls are **exactly** 44px tall (for example "Who are you?", "Back", the round tabs Players / Groups / KBs /
  Weather / Course). They pass, but with no margin: a later style change that trims a pixel would make them fail.
  A trial run at 48px listed 317 such cases across the three sizes on the standard look.
- The audit measures the visible box of each control. If a control has an invisible enlarged tap area (made with
  CSS outside the box), that extra area is not counted. This was not checked separately.
- Only the screens the layout test opens are covered (the 27 golfer screens). Organiser screens and pop-ups that the
  test does not open were not audited.
