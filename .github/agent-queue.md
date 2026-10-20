# Agents' to-do list
<!-- Edited by the owner and Codex (design lead). Claude codes through the existing cycle.
     "## [ ] id" waits, "## [x] id" is done, "(pause)" = stop for the owner to look after approval.
     Preserve task ids and completed state when integrating a queue review. Never restart an active task. -->

## [x] ruling-target
Fix the measured 44px touch-target failure before cosmetic work. `docs/TOUCH-TARGETS.md` reports the Ruling
question box at 36px high (42px at 135% text). Make its visible width and height at least 44px in both looks,
with the smallest CSS change. Preserve its text growth, focus, input, submit behaviour and position in the flow.

Acceptance: run `MIN_TARGET=44` on the existing layout audit for both standard and editorial builds at 360px,
390px and 390px with 135% text. Record exact passed/failed counts and dimensions; update `docs/TOUCH-TARGETS.md`.
Supply linked before/after screenshots of Ruling at those sizes, from fictional fixture data. Other controls,
colours, words and navigation must remain unchanged. Run the normal hard gates. Report unrelated failures
separately; do not change tests or controls to hide them.

## [x] serif-check
Finish the editorial typography check, building on the work in draft PR #13 (branch `origin/agent/run-39379145362`;
bring its files across with `git show origin/agent/run-39379145362:<path>`), but follow the owner's decision:

**DECIDED (owner, 20 October): option A.** Display titles keep growing with the phone's text size, as DESIGN.md
says. Long round names may take up to three lines at large text sizes, but must never be cut off.
- Remove the `min(…, 6.8vw)` cap from #13. The display titles keep scaling with text size in both looks.
- Change the long-title check to: never clipped, never ellipsis, at most 2 lines at 360px and 390px at normal text
  size, at most 3 lines at 135% text. Apply it in **both** looks.
- Fix the existing clip found in the standard (live) look: the long `.hero.home .now-name` at 360px with 135% text
  is cut off by about 2px (292×165 in a 292×163 box). Use the smallest CSS change; normal-length names must look identical.
- Keep #13's computed-font and lining-numeral checks (serif only on the three allowed elements). Make the
  editorial detection explicit and robust (reviewer point R2-2), not a search for a comment string.
- Keep the Ruling "i" glyph as a documented exception; don't change it.
Close the task with layout passing on both looks, and before/after screenshots of the long title at 360px with 135% text.

## [ ] long-names (pause)
Fix the recorded player-name clipping and overlap as a separate usability task. Include the score-entry case
where the arrow after Donnacha runs into Pick up, as well as the screens identified in the Stage 0 report.
Use temporary browser-injected fictional names such as "Bartholomew Featherstonehaugh"; leave the committed
fixture and its normal names unchanged. Prefer wrapping or allowing space; do not hide names with ellipsis,
shrink functional text below its existing size, or reduce touch targets to fit.

Acceptance: before/after screenshots and assertions on affected screens at 360px, 390px and 390px with 135% text,
in both looks. Check text bounds and overlaps within cards/controls, not just page-wide overflow. Names must
remain associated with the correct score controls, and Pick up, save and navigation must remain reachable.
Show unchanged controls/words and normal-name layout outside the documented fix. Pass the 44px layout audit
and the usual scoring, phone, whole-round and start-hole gates. Link the evidence for owner review at this pause.

## [ ] team-colours-check (pause)
Audit the editorial navy #244A78 and crimson #9B3443 on Buggy Wars, the hole screen and round-page groups,
including labels, borders, selected states and soft backgrounds. Keep pair names/initials: colour must never be
the only team identifier. This is an evidence task first; do not recolour the app just to produce a change.

Acceptance: report actual foreground/background contrast with the method and values (normal text at least 4.5:1),
plus clearly labelled deuteranopia/protanopia simulations and original screenshots. Compare team distinction and
navy against adjacent pine selection states. Name the simulation/colour-distance method; do not present a
colour-distance number as a universal accessibility pass. Capture both looks and the usual 360px, 390px and
390px with 135% text contexts. Preserve action yellow and the standard look.
If evidence demonstrates a problem, show the smallest measured alternative, with before/after comparisons and
unchanged team semantics, before recommending adoption. Run normal hard gates for any CSS change. Record that
simulations do not establish real-phone sunlight readability. Pause with linked evidence for the owner's phone review.
