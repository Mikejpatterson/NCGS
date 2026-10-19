# Agents' to-do list
<!-- Edited by the owner and ChatGPT (design lead). The coding agent cannot change this file.
     "## [ ] id" waits, "## [x] id" is done, "(pause)" = stop for the owner to look after it is approved.
     Runs one task after another; see docs/AGENT-CYCLE.md. Order matters: top first. -->

## [ ] serif-check
Prove the serif rule holds in the editorial look, and fix only CSS if it does not.
Add a test (or extend test/design.run.js / test/layout.run.js) that, on every golfer screen at 360px, 390px and 135% text,
checks the computed font-family is the display serif on exactly these elements and no others: `.hero.home .wordmark`,
`.hero.home .now-name`, `.rp-name` (DECIDED 3 on issue #1). Check those three use lining numerals, and that the
round name ("Cabopino, the long-named second day of the trip" in the fixture) is at most two lines at 360px and 135% text
without being cut off. Keep the standard look unchanged.

## [ ] ruling-target
`docs/TOUCH-TARGETS.md` found one control under 44px: the Ruling question box (36px, 42px at 135% text). Make it at
least 44px tall at 360px, 390px and 135% text in both looks, with the smallest CSS change. Re-run the 44px audit
(`MIN_TARGET=44`) and update `docs/TOUCH-TARGETS.md` with the result. No other controls change.

## [ ] long-names (pause)
Long player names are cut off or go off-screen on about a dozen screens (see `docs/CLAUDE-HANDOVER.md`). Make them wrap
or fit without being cut off, at 360px, 390px and 135% text in both looks, without changing scores, controls or layout
for normal-length names. Prove it with a temporary long name in the fixture (for example "Bartholomew Featherstonehaugh"),
before-and-after screenshots, and the layout test passing. Keep the fixture's normal names as they are afterwards.

## [ ] team-colours-check (pause)
Check the editorial team colours (navy #244A78, crimson #9B3443) on Buggy Wars, the hole screen and the round page.
Report contrast of white text on each, how far apart the two teams are in simulated deuteranopia and protanopia, and
how close navy is to the pine green next to it. Include screenshots. Change colour values only if the numbers show a
real problem, and if you do, show before-and-after. The owner will check the result on a real phone outdoors.
