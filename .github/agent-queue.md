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

## [ ] serif-check
Verify the agreed editorial typography; change CSS only if the evidence shows a violation. Extend an existing
browser test to check every golfer screen at 360px, 390px and 390px with 135% text. Display serif is allowed only
on `.hero.home .wordmark`, `.hero.home .now-name` and `.rp-name`, including their intentionally inheriting children.
Functional labels, scoring numbers, people names, buttons, tabs and the hole screen remain in the system sans.

Acceptance: assert the computed font-family at each allowed element and detect serif leakage outside those
subtrees, rather than merely searching the CSS source. Assert lining numerals on display text. With the existing
long round title, show that the whole title fits in at most two lines at 360px and at 360px with 135% text,
without clipping or ellipsis. Preserve the standard look and the token-only editorial-file restriction. If those
constraints conflict, explain the specific engineering conflict rather than silently widening scope.
Link representative screenshots and run the normal hard gates. Linux Chromium proves the configured stack and
layout, not the actual New York rendering on iPhone; record that distinction. A proved no-change outcome is valid.

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
