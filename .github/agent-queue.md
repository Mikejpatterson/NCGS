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

## [x] handover-current
From docs/ROADMAP.md version 1 (owner-approved via #18, merge e8e5a63), task `handover-current`.

Update the historical status sections of `docs/CLAUDE-HANDOVER.md`, `docs/AI-COLLABORATION.md` and the colour-audit
summary to reflect the actual completed queue, the active controller location and the recorded colour-only
exception. Keep the measured audit results and remaining real-phone limitations. Link evidence instead of
reopening settled decisions. No application, workflow or queue edits by the coding agent.

Acceptance: statements match current remote refs/runs and owner decisions; historical escalation remains visible;
no claim that phone review, native Codex activation or production approval occurred. Normal documentation gates.

## [x] name-resize-check
From docs/ROADMAP.md version 1 (owner-approved via #18, merge e8e5a63), task `name-resize-check`.

Investigate the documented limitation in `docs/LONG-NAMES.md`: rows are remeasured on redraw/orientation change,
but a live text-size change may wait for the next tap. Use fictional normal, borderline and long names on the
same open entry screen, at 360/390px, both looks, before and after changing to 135% text. Record whether overlap
actually occurs before the next tap. Preserve compact normal-name rows and controls. This task adds evidence,
not a speculative app fix.

Acceptance: reproducible command, actual dimensions/screenshots and pass/fail; distinguish browser simulation
from iPhone behaviour. State no defect if none is reproduced. Existing app/layout evidence remains intact.

## [x] warning-token-audit
From docs/ROADMAP.md version 1 (owner-approved via #18, merge e8e5a63), task `warning-token-audit`.

Investigate the existing audit finding that `.c-b` is used for Delete round, Turn KBs off and Out of date as well
as team identity. Inspect actual DOM and computed colours in both looks with fictional data. Document exact uses
and whether the editorial theme changes warning meaning/readability. No general organiser redesign or copy change.

Acceptance: selector/element map, contrast values and screenshots for demonstrated cases, smallest proposed
remedy only if warranted. Colour distance alone is not an accessibility pass. Keep owner-approved team colours
and the colour-only result-pill exception. A no-change conclusion is valid.



## [x] name-resize-fix
From docs/ROADMAP.md version 1 (owner-approved via #18, merge `e8e5a63`), conditional task
`name-resize-fix`. Run [39487303357](https://github.com/Mikejpatterson/NCGS/actions/runs/39487303357)
demonstrated overlap in Chromium before the next tap after a live text-size change: 2 of 12 states failed in
both looks. Build on `docs/NAME-RESIZE.md` and commit `0a5a79a`.

Make the smallest render/measurement fix in permitted UI files so rows remeasure when the effective text size
changes, without waiting for another tap. Avoid redraw loops, polling timers, duplicate event listeners and any
score-control or protected core/data change. Preserve compact normal-name rows.

Acceptance: the task 2 reproduction passes before another tap in both looks at 360/390px for 100%↔135% changes;
normal-name layout remains compact; four players and Save still fit at 390×844/100%; both looks meet the existing
large-text and 44px checks. Supply before/after screenshots and normal app hard gates. Keep the documented
iPhone limitation explicit; browser evidence must not be described as an iPhone result.

## [x] release-home-evidence
From docs/ROADMAP.md version 1 (owner-approved via #18, merge `e8e5a63`), task
`release-home-evidence`.

Reuse valid SHA-pinned evidence where possible; otherwise capture the baseline and current Home for live,
no-round and finished fixture states at 360px, 390px and 390px/135%, in both looks. Include a long round title
and normal names. Record screenshot source SHAs, commands and the limited serif allowlist. This is evidence,
not a styling pass.

Acceptance: linked before/after pairs; action yellow, full pill navigation, large text and unclipped content;
explicit difference notes. Use no real member data and do not claim that Linux screenshots establish iPhone
typography. No application change is required merely to complete the evidence.

## [x] release-hole-evidence
From docs/ROADMAP.md version 1 (owner-approved via #18, merge `e8e5a63`), task
`release-hole-evidence`. Run after `name-resize-fix`, so the candidate evidence includes that result.

Capture or reuse SHA-matching evidence for empty, partial and completed score entry; normal and long names;
three-digit scores and Pick up; at 360px, 390px and 390px/135%, in both looks. Show normal names remain compact
and the Save pill is reachable. Reference relevant phone, finish and start-hole results at the candidate SHA;
missing results remain pending for the existing full gates and must not be presented as passed. Do not change
score logic or control attributes.

Acceptance: linked before/after pairs, exact source SHAs and checks; intentional differences explained; no
clipping or name/control overlap. Preserve behaviour and data invariants.

## [x] three-digit-fix
Found by `release-hole-evidence` (run 39553987116, `docs/RELEASE-HOLE.md`, `docs/release-hole-shots/after-*.txt`):
at 390px with 135% text, a three-digit score ("100 (0 pts)") runs 6-9px under the - and + buttons in both looks.
At 360px/135% it clears by only 1px. `CLAUDE.md` requires numbers to leave room for three digits with nothing cut
off or overlapping, so this is a required fix, not an owner choice (Claude, 21 October, issue #1).

Make the smallest CSS change in permitted UI files so the score and its points never overlap the - or + buttons at
360px, 390px and 390px/135% in both looks. Keep the buttons at least 44px, tabular figures, compact normal rows,
four players plus Save on the first screen at 390x844/100%. No change to score logic, control attributes or words.

Acceptance: rerun `tools/release-hole-shots.js` and update the "after" shots, logs and `docs/RELEASE-HOLE.md`, so
all 36 states pass in each look, with linked before/after for the three-digit states. Normal hard gates pass.

## [x] release-buggy-evidence
From docs/ROADMAP.md version 1 (owner-approved via #18, merge `e8e5a63`), task
`release-buggy-evidence`.

Reuse the team-colour audit and capture missing candidate-SHA comparisons for open and decided nines, overall results
and the no-buggies fixture state. Use 360px, 390px and 390px/135% text in both looks. Preserve the owner's
20 October colour-only result-pill decision, pair ordering and initials elsewhere, and existing screen-reader labels;
do not add visible leader words.

Acceptance: labelled originals and relevant simulations, measured contrast, source SHAs and existing content/control
parity results. Keep simulations separate from the outstanding real-phone sunlight check. Use no real member data,
do not broaden the colour-only exception and do not present browser evidence as a real-iPhone result.

## [ ] prelaunch-review-pack
From docs/ROADMAP.md version 1 (owner-approved via #18, merge `e8e5a63`), task
`prelaunch-review-pack`. Run after the Home, Hole and Buggy Wars evidence tasks.

Create one release-review document linking the three evidence sets, change summary, known limits, test run ids,
explicit owner decisions and a reproducible fictional-data phone-preview package. Include a real phone-preview link
only after an authorized isolated hosting route has actually been published and verified. Its service-worker scope
must not overlap the live app, and it must contain no real data, PINs, production endpoints or secrets. Packaging is
authorized design work; publication or hosting is not inferred from this roadmap.

Acceptance: one review page with complete traceable evidence and existing full gates at a named candidate SHA;
include a verified preview link or an explicit pending state. Do not call the release ready while real-phone checks
or mandatory evidence are absent. Do not push main, open a release merge, deploy, publish or invent crest artwork.
