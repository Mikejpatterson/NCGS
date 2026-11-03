# Selected scramble drive: show the contribution being chosen

Michael reported that selecting Colin's drive still left only one dot filled when the choice would be his second drive. The pine tile communicated selection, but the dot count did not show the consequence.

The selected tile now previews the current hole once and shows a short label such as “2nd drive” beside the dots. Switching players moves the preview; deselecting restores the saved totals. Names, the 2×2 grid and score entry keep their existing layout. At ordinary phone text sizes the label uses the existing dot row without increasing the tile height. Enlarged text can grow naturally.

## Count boundaries

This is a read-only projection in the scramble view. It reads the saved counts and the draft driver; it does not increment an object, write a score or award a drive. If the current hole already has a valid saved driver, that contribution is removed before the new selection is added. Reopening or rerendering therefore cannot accumulate extra drives. An unresolved two-driver hole has no counted contribution to remove.

Saved-hole corrections show a total such as “2 drives” rather than claiming the historical hole was the player's second drive in chronological order. Final rounds show the stored totals without projecting a retained draft. Counts above the three-drive minimum keep three quota dots and an explicit label such as “4th drive” or “11th drive”. Existing ordinal formatting is reused.

Official Results counts, minimum-drive/KB calculations, warnings, score entry, draft persistence, save payloads, conflict handling and final-round locks remain unchanged. All save and driver action handlers are untouched. No engine/server/storage/course-data, workflow, controller or automatic-write changes.

## Evidence and release

The focused browser regression covers 360/390/393px and enlarged text with a long name: second/first drives, switching, deselection, saved-hole replacement, conflicts, final rounds with a retained draft, ordinal suffixes through 13th, reload persistence, ordinary tile height and unchanged stored tables/Results counts. It also preserves the current engine's recorded tee-shot count for a legacy pick-up: the stroke score needs correcting, but its existing drive is not silently erased. Team rows are found by team name rather than assuming their rank. Final pass counts are recorded on the PR.

The current compact-layout regression, required engine/server, unit, scorer/follower, real-server scramble phone and strict layout/chained suites run normally; final results are recorded on the PR. The new regression is in the existing screen-audit chain, with no workflow edit. Actual before/selected/switched fixture screenshots remain local and are shown directly to Michael.

The release candidate includes current main `c67a6f7`, retaining #79's stroke-play rules and controls, #76's scorer/follower safeguards, #77's layout and #75's crawler. The preview patch is confined to the drive tiles; it does not reintroduce points or Pick up, or change the engine. All unrelated build/test inputs, including protected scoring/data modules and workflow, are checked byte-for-byte against current main blob hashes. The screen-audit hook retains the scorer prompts and adds the new preview regression. A matching generated frontend/cache is a separately scoped companion build with production API/server fingerprint preserved. Fresh exact-head independent review and required CI are run on this combined candidate. Michael explicitly authorized publication on 2 November; the existing release workflow is used after those checks. The crawler remains report-only under the unchanged main configuration. Browser evidence is simulated Chromium, not physical-iPhone certification.
