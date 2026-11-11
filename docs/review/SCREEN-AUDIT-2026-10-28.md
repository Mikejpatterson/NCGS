# NCGS screen audit — 28 October 2026

**Baseline:** `39099395870bf2971e036426dc66dd2e0b566c22` (current main, rechecked after capture).
**Owner request:** every screen should do its job, provide appropriate navigation, comply with the brief, and use colour and type consistently. Away from Home, a non-playing screen without the floating navigation needs a usable way back.

## Verdict

The screen audit found real gaps that the previous layout checks did not establish. Retain the current visual direction; a wholesale redesign is not indicated. Fix navigation when play ends and the unreadable shared-results headline first, then long-name layouts, reference-text contrast, touch targets and trip-day labels.

This is a UI audit with findings, not a release approval or a claim that every backend action has passed an end-to-end test. No product source, protected logic, main, deployment or live data was changed by the audit.

## Evidence and method

- Invented-data build of the frozen public source. Chromium on Linux, local loopback only.
- Catalogued **49 rendering functions**: 24 member/play functions and 25 organiser functions. These are not 49 separate user pages: some share a view, one is a nested contest prompt, and one is a retained legacy screen. See the coverage table below.
- Initial **76 screen/state samples at 390px, 360px and 390px with 135% text: 228 records**. Captured actual fixed-height viewports, not artificially expanded pages.
- Additional corrected fixtures and card-check/completion states; a 390px scrolling pass with **73 lower-page frames**; **74 long-name/large-text records** using four invented long names.
- Independent real-control reproductions: Home → Ruling/Results/Hole tabs → finalise fixture elsewhere; Home → Trip standings → Day 1 → Share results; Home → Organiser → Members → member editor.
- Draw exercised through the existing controls to a real completed 16-person line-up on an iPad-sized viewport, then phone, then long names at 135%. The existing draw geometry/target checker returned no issues at those three final states. This is not a measurement of readability across a breakfast room.
- Computed font families, foreground/background colours, text overflow and 44px target geometry inspected across the rendered DOM, including content below the first viewport. Visual review of normal-size and scrolling contact sheets; critical originals reopened.
- Fixture build and required engine/server command passed (2 file entries under Node 24). The captured records are observations, **not 228 passing assertions**. The audit did not re-run the entire scoring/reliability suite.

The first scaffold supplied an incomplete after-hole snapshot and opened a contest on a round with no contests. Both fell back to Home. These were audit setup errors, not app defects; corrected captures rendered successfully. One initial large-text Back click timed out; the repeat succeeded. Synthetic unsupported tab names and a forced root identity picker are excluded from findings.

The existing typography checker calls the approved Home year, quiet headline and draw team heading unexpected serif. Those are owner-endorsed display uses; they are **not** defects and must not be removed to make a whitelist pass. Real member-editor navigation confirmed `.title.is-name` uses the system sans family.

## Findings

### A01 — must: screens can become navigation dead ends when play finishes

**Reproduced with real controls:** open the Ruling, Results or Hole tab from Home in the `today` fixture. Then mark the fixture rounds final, clear the fixture view cache and render, simulating a finalisation received from another device. Each keeps its current screen, hides the floating navigation, and has **zero Back/Home controls**. The Hole view can also retain its unfinished-entry presentation alongside the final-round notice.

Source: `src/app/90-main.js` decides bar visibility from current round state; `src/app/35-rules.js` has no fallback return; `src/app/30-play.js` adds a board Back link only for a nested board stack. Tab navigation can replace the root stack entry.

**Fix:** use one shared rule for a usable return when the bar is absent, while preserving drafts/pending or rejected saves. Apply it to the affected play views, including scramble/completion variants; do not add unnecessary Back controls to the Home root or block live scoring. Where a work screen becomes read-only after finalisation, show that state and a clear route to results. Test the transition on an already-open screen, not just a fresh page.

Evidence: [Ruling after finalisation](screen-audit-2026-10-28/rules-ended.png), [Results after finalisation](screen-audit-2026-10-28/board-ended.png), [Hole after finalisation](screen-audit-2026-10-28/hole-ended.png).

### A02 — must: shared-results winner headline is invisible

**Reproduced through Home → Trip standings → Day 1 → Share results.** The headline exists (fictional example: “Aidan wins with 40”), but its computed colour and its parent's background are both `rgb(15, 26, 20)`: **1:1 contrast**. The result card's most important message disappears. The share image is made from that same card.

Source: `VIEWS.results` in `src/app/30-play.js`; `.rcard .top` and the later global `.title` colour in `src/styles.css`.

**Fix:** explicitly style this headline and surface using the approved on-dark/pine tokens, without changing scoring or result selection. Check the rendered card and generated-image input at normal and large text. A global `.title` change is not sufficient evidence that every header inherits the right foreground.

Evidence: [actual shared-results screen](screen-audit-2026-10-28/share-result.png).

### A03 — should: long player names break heading and personal-summary layouts

At 390px with 135% text, “Bartholomew Featherstonehaugh” takes the profile/member editor beyond the viewport: the app measures **414px wide in a 390px viewport**, and the title measures **398px inside 358px**. The scorecard title and handicap header also clip/overflow. The round's personal playing summary clips a long opponent name; the Players list can fragment names into several short pieces. The past-round winner subtitle truncates.

**Fix:** wrap long tokens safely and give names adequate width; use a responsive second line for supporting handicap/time information rather than shrinking names to tiny text. Preserve sans-serif person names and the approved serif event headings. Test member profile, card, handicap working, member editor, round summary and player list together.

Evidence: [profile at 135%](screen-audit-2026-10-28/long-profile.png), [member editor at 135%](screen-audit-2026-10-28/long-member.png), [round/player layout at 135%](screen-audit-2026-10-28/long-round.png).

### A04 — should: pale reference text is too weak on white

Score-entry “Par” reference text (`.stv.none`) and scorecard par values use `rgb(154, 167, 159)` on white: approximately **2.50:1**. These are useful reference information, not disabled controls. They fall below ordinary text contrast and are poor candidates for outdoor reading.

**Fix:** give these reference roles a stronger shared secondary-text token. Keep genuinely disabled controls visually distinct; do not recolour Buggy Wars teams or gold awards as part of this repair. Verify the actual backgrounds after the cascade resolves.

Evidence: [scorecard](screen-audit-2026-10-28/scorecard.png); the entry screen has the same measured foreground/background combination.

### A05 — should: touch-target consistency does not extend to every organiser/control view

Examples measured in the ordinary 390px render: organiser KB partner choices around **36px high**; individual editable Buggy Wars hole buttons around **29px wide**; course-editor hole fields **40px high**. The organiser Done target is slightly narrower than 44px. Many other controls already meet the intended size.

**Fix:** enlarge/restructure these targets within the shared control system. A dense hole table can open a full-size editor rather than require accurate taps on narrow cells. Keep the owner-approved colour-only Buggy Wars result-pill exception; it does not exempt editing controls from usable target sizes.

Evidence: [KB editor](screen-audit-2026-10-28/kb-editor.png). Source/geometry observations are not a claim that every small field is impossible to use.

### A06 — should: a trip's day choices do not identify the actual golf

The trip screen's “Each day” buttons are just “Day 1” / “Day 2”, even when a round has a course name, date and result. On a multi-course trip this makes the next destination unnecessarily ambiguous. This was also identified in the earlier visual review; it remains in this baseline.

**Fix:** show the round/course name and a compact date/status alongside the day number. Keep Westport's individual and team results separate and do not invent a combined trip winner or add a paragraph explaining familiar society customs.

## What should be retained

- Pine/ivory dominance, rare champagne accents on dark surfaces, the light floating navigation and shared rounded controls.
- The quiet Home year and pine rules; the stronger matchday card and practical system-sans player names/scores.
- The identity picker is optional in the normal Home experience; do not introduce onboarding to solve navigation.
- Personal tee-time/group information, separate trip-day access, the single organiser Groups destination, focused replacement and the locked live scramble.
- The current-team draw stage and separate names-first line-up. The completed iPad line-up uses a useful two-by-two arrangement. [iPad capture](screen-audit-2026-10-28/ipad-lineup.png).
- Existing score safety, offline behaviour, scoring/countback, minimum drives, GOY and KB/Buggy Wars distinctions. No rules changes are proposed here.

## Coverage and completion meaning

“Reviewed” below means the screen's visible job, controls, navigation presentation and shared visual roles were inspected in source and rendered fixture states. It is **not** a certification that its complete save/upload/service integration was tested. The contrast, long-name and touch findings apply across the indicated view families; see the case manifest for fixture/state details.

| Rendering function | Visible job | Audit note |
| --- | --- | --- |
| [member.home](../../src/app/20-society.js#L241) | Season/event hub; choose the relevant next action | Approved quiet display type retained; Home root needs no Back |
| [member.rounds](../../src/app/20-society.js#L289) | Browse past rounds and open a result | A03: long winner subtitle clips |
| [member.players](../../src/app/20-society.js#L298) | Find a member and their cards | Reviewed presentation and return controls; no additional specific defect identified |
| [member.goy](../../src/app/20-society.js#L312) | Compare the selected season’s best-three standings | Reviewed presentation and return controls; no additional specific defect identified |
| [member.round](../../src/app/20-society.js#L544) | Understand an event and reach its groups/results/play | A03: personal summary/player list; live/upcoming/final variants reviewed |
| [member.stats](../../src/app/20-society.js#L727) | Read society statistics and drill into a player | Reviewed presentation and return controls; no additional specific defect identified |
| [member.player](../../src/app/20-society.js#L756) | Read a player’s season/history | A03: long-name heading overflow |
| [member.card](../../src/app/20-society.js#L824) | Read a player’s hole-by-hole scorecard | A03/A04: long heading and pale par references |
| [member.who](../../src/app/20-society.js#L844) | Select or change identity | Reviewed presentation and return controls; no additional specific defect identified |
| [member.ask](../../src/app/30-play.js#L36) | Confirm the contest nominee or Nobody | Nested helper, not a standalone route; captured via pending scramble contest |
| [member.tee](../../src/app/30-play.js#L79) | Resume the group’s next scoring task | A01/A04: finalisation return and pale reference text |
| [member.rejected](../../src/app/30-play.js#L123) | Inspect refused changes kept on the phone | Empty and constructed populated state inspected; recovery backend belongs to structural work |
| [member.entry](../../src/app/30-play.js#L231) | Enter a group’s hole scores | A01/A04: finalisation return and pale reference text |
| [member.after](../../src/app/30-play.js#L408) | Understand the saved hole and continue | Corrected saved-hole fixture reviewed; A01 family needs a transition regression |
| [member.check](../../src/app/30-play.js#L616) | Compare/read/resolve a card check | Empty/reading/failed/manual/done rendered; actual reading-service transaction not asserted |
| [member.finish](../../src/app/30-play.js#L707) | Finish/submit the group card and reach results | Reviewed presentation and return controls; no additional specific defect identified |
| [member.hcp](../../src/app/30-play.js#L741) | Inspect handicap working | A03: long name clips |
| [member.board](../../src/app/30-play.js#L843) | Follow scores, Buggy Wars, contests and statistics | A01/A05: root tab return and narrow editing targets |
| [member.trip](../../src/app/30-play.js#L891) | Compare/access the trip’s separate rounds | A06: day buttons lack course/date identity |
| [member.results](../../src/app/30-play.js#L923) | Read and share a result card | A02: headline is 1:1 against its background |
| [member.scramble](../../src/app/32-scramble.js#L54) | Record the selected driver and team score | Nested contest prompt and member/team entry share this route; A01 family |
| [member.scrambleFinish](../../src/app/32-scramble.js#L166) | Read team completion and drive compliance | Completed 18-hole team fixture reviewed; preserve drive-rule semantics |
| [member.rules](../../src/app/35-rules.js#L241) | Ask/read a ruling | A01: real tab → finalisation dead end |
| [org.lock](../../src/app/40-org.js#L10) | Unlock organiser access or leave | Reviewed presentation and return controls; no additional specific defect identified |
| [org.home](../../src/app/40-org.js#L48) | Organiser overview/checklist; choose a round or management task | A05: Done target slightly below 44px width; normal checklist retained |
| [org.round](../../src/app/40-org.js#L82) | Prepare/monitor a round; inspect readiness and finalisation | Live scramble summary correctly says teams fixed (PR47 integrated) |
| [org.details](../../src/app/40-org.js#L146) | Set course/date/tee time/format details and save | Reviewed presentation and return controls; no additional specific defect identified |
| [org.playing](../../src/app/40-org.js#L179) | Choose players before drawing groups | Reviewed presentation and return controls; no additional specific defect identified |
| [org.groupsview](../../src/app/40-org.js#L207) | Read saved group arrangements | Reviewed presentation and return controls; no additional specific defect identified |
| [org.kb](../../src/app/40-org.js#L216) | Set/review the cross-group KB pairs | A05: 36px partner targets |
| [org.group](../../src/app/40-org.js#L237) | Inspect a group/team and choose a hole to correct | Ordinary and scramble correction lists reviewed |
| [org.correct](../../src/app/40-org.js#L266) | Correct a selected group/team hole | Ordinary and scramble editor return controls reviewed; A04 reference text |
| [org.teamshots](../../src/app/40-org.js#L268) | Set the committee’s team allowances | Reviewed presentation and return controls; no additional specific defect identified |
| [org.contest](../../src/app/40-org.js#L274) | Review contest nominations and confirm a result | Reviewed presentation and return controls; no additional specific defect identified |
| [org.guest](../../src/app/40-org.js#L289) | Add a round guest | Reviewed presentation and return controls; no additional specific defect identified |
| [org.late](../../src/app/40-org.js#L305) | Legacy player-change screen | Legacy source/render inspected; no ordinary incoming route located |
| [org.members](../../src/app/40-org.js#L332) | Find/add a member | Reviewed presentation and return controls; no additional specific defect identified |
| [org.member](../../src/app/40-org.js#L342) | Edit a member’s name/index/status | A03: long member heading; real navigation confirms correct sans font |
| [org.courses](../../src/app/40-org.js#L359) | Find/add a course | Reviewed presentation and return controls; no additional specific defect identified |
| [org.course](../../src/app/40-org.js#L364) | Set tees and hole/course data | A05: 40px fields; lower rows/Save scrolled into view |
| [org.settings](../../src/app/40-org.js#L402) | Edit defaults, switch season, testing and PIN | Reviewed presentation and return controls; no additional specific defect identified |
| [org.log](../../src/app/40-org.js#L418) | Read the change log | Reviewed presentation and return controls; no additional specific defect identified |
| [org.export](../../src/app/40-org.js#L442) | Backup, restore and export data | Reviewed presentation and return controls; no additional specific defect identified |
| [org.drawhome](../../src/app/42-draw.js#L105) | Configure publishing and draw pace | Reviewed presentation and return controls; no additional specific defect identified |
| [org.pots](../../src/app/42-draw.js#L124) | Assign committee-selected pots | Reviewed presentation and return controls; no additional specific defect identified |
| [org.draw](../../src/app/42-draw.js#L137) | Reveal the current team | Actual current-team reveal exercised on iPad |
| [org.drawlineup](../../src/app/42-draw.js#L180) | Show the completed team line-up | Actual 16-name completed draw inspected on iPad/phone/large text |
| [org.groups](../../src/app/44-groups.js#L42) | Edit arrangements before play; withdraw only where allowed | Reviewed presentation and return controls; no additional specific defect identified |
| [member.scenarios](../../src/app/45-preview.js#L2) | Preview-only situation selector | Reviewed presentation and return controls; no additional specific defect identified |

## Remaining verification and next batch

- This pass does not establish iOS font rendering, soft-keyboard behaviour, voice/microphone permissions, sunlight or real room-distance readability. Keep those physical/device checks distinct from Chromium evidence. The owner's earlier offline phone result is valid evidence for that specific journey, not every interaction here.
- Every photo-reading mismatch/conflict, every offline error, and every backend form transaction was not exhaustively replayed. The card-check empty/reading/failed/manual/resolved presentations and a rejected-save list were rendered with constructed fictional states. That does not prove the real photo service, restore/export or data recovery paths.
- No new product decision is needed for A01–A06. Proposed Codex UI batches: (1) navigation fallback/state transition and readable share headline; (2) long-name/contrast/control consistency; (3) useful trip-day labels. Claude challenges the changes and integrates them with its separately owned structural work.
- Add regression coverage to existing checks for actual tab → finalisation navigation, shared-results headline contrast and long person-name headings. Extend expected typography roles for the already-approved Home/draw display elements; do not weaken the design assertions or create a second orchestration system.
- Main/release/deployment remains explicit human approval only. The audit report is not a request for Michael to repeat these technical checks or relay findings.
