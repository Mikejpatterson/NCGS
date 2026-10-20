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

## [x] long-names (pause)
Finish the long-name fix, building on draft PR #15 (branch `origin/agent/run-39416700568`; bring its files across with
`git show origin/agent/run-39416700568:<path>`). Keep everything from #15 except the score-entry layout.

Score entry (owner's direction via Claude, 20 October): keep today's compact one-line row (name, Pick up, −, score, +)
whenever the name fits. Only when a name does not fit, let Pick up / − / score / + drop onto a line below that name.
Normal-length names must look exactly as they do today, and four players plus Save must still fit on one 390×844 screen
at normal text size. This must also fix the recorded overlap of "Donnacha" and its arrow with Pick up.

Acceptance: #15's long-name check passes on all 22 screens × 3 sizes in both looks, `normal-entry` screenshots match
today's layout for normal names, and the missing "before" check log the reviewer asked for is added.
Owner reviews the screenshots at this pause.

## [x] team-colours-check (pause)
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

## [ ] handover-current
From docs/ROADMAP.md version 1 (owner-approved via #18, merge e8e5a63), task `handover-current`.

Update the historical status sections of `docs/CLAUDE-HANDOVER.md`, `docs/AI-COLLABORATION.md` and the colour-audit
summary to reflect the actual completed queue, the active controller location and the recorded colour-only
exception. Keep the measured audit results and remaining real-phone limitations. Link evidence instead of
reopening settled decisions. No application, workflow or queue edits by the coding agent.

Acceptance: statements match current remote refs/runs and owner decisions; historical escalation remains visible;
no claim that phone review, native Codex activation or production approval occurred. Normal documentation gates.

## [ ] name-resize-check
From docs/ROADMAP.md version 1 (owner-approved via #18, merge e8e5a63), task `name-resize-check`.

Investigate the documented limitation in `docs/LONG-NAMES.md`: rows are remeasured on redraw/orientation change,
but a live text-size change may wait for the next tap. Use fictional normal, borderline and long names on the
same open entry screen, at 360/390px, both looks, before and after changing to 135% text. Record whether overlap
actually occurs before the next tap. Preserve compact normal-name rows and controls. This task adds evidence,
not a speculative app fix.

Acceptance: reproducible command, actual dimensions/screenshots and pass/fail; distinguish browser simulation
from iPhone behaviour. State no defect if none is reproduced. Existing app/layout evidence remains intact.

## [ ] warning-token-audit
From docs/ROADMAP.md version 1 (owner-approved via #18, merge e8e5a63), task `warning-token-audit`.

Investigate the existing audit finding that `.c-b` is used for Delete round, Turn KBs off and Out of date as well
as team identity. Inspect actual DOM and computed colours in both looks with fictional data. Document exact uses
and whether the editorial theme changes warning meaning/readability. No general organiser redesign or copy change.

Acceptance: selector/element map, contrast values and screenshots for demonstrated cases, smallest proposed
remedy only if warranted. Colour distance alone is not an accessibility pass. Keep owner-approved team colours
and the colour-only result-pill exception. A no-change conclusion is valid.

