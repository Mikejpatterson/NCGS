# NCGS — consolidated owner design and event brief

Recorded by Codex from the owner's 23–24 October 2026 conversation. On 24 October the owner explicitly approved publishing the full design discussion, season rules and future event details to the public NCGS GitHub repository so Claude can read them. That approval resolves the earlier disclosure hold for this brief. No member identities, individual handicaps, private data files or private preview addresses are included.

This is a synthesis of the conversation, not a verbatim transcript or an assertion that every feature below has been implemented. Where an earlier working note says a question is open and this document records a later answer, the later answer controls. Existing data-safety and release safeguards continue to apply.

## 1. Authority and how to review this work

The human Product Owner sets direction, significant scope and release approval. Codex and Claude are peers, expected to exercise independent creative and engineering judgement and challenge each other constructively. ChatGPT's earlier handover has no continuing approval or arbitration role.

The owner asked for deeper creative thinking, original alternatives, mockups and several refinement passes, not just small compliance adjustments. Ordinary improvements within the chosen direction need no new owner decision for every screen. Material departures need the owner's decision. Neither agent should dismiss later explicit owner feedback because an older document uses a more general description.

This brief supplies missing context; it does not dismiss Claude's critique. Distinguish a concern about correctness, accessibility or reliability from a different aesthetic preference. Preserve endorsed character while solving practical problems. Show rendered proposals when an owner view is needed; do not ask for approval of unseen changes. Enthusiasm for a study is not approval to merge main or deploy.

## 2. Creative direction and the refinements the owner liked

**Option 2 — Modern Club Character** remains the foundation: pine green and warm ivory, restrained flat champagne gold, modern editorial elegance with personality, contemporary sans-serif for practical UI and selective serif display lettering. Use the approved gold double-ring crest artwork and the lighter softly translucent floating navigation pill. Do not return to the earlier heavy dark-green navigation bar.

The owner is comfortable with green and gold. We discussed their Irish associations, including a green flag and gold harp, but the owner does not see the chosen pine/ivory/champagne treatment as an Irish tricolour and is happy with it. No flag motif or more literal Irish styling was requested.

The next creative step is **a restrained club feel between events and a stronger matchday feel during play**, expressed through context and composition within one coherent app. Do not add a manual theme/mode switch merely to demonstrate this idea. Outdoor readability, fast score entry and practical phone use remain fundamental.

On matchday, **leaderboard, nearest the pin and longest drive are important features**, alongside a clear scoring action. They should not be buried in generic repeated cards. Retain personal standing even when a player is outside the leaders; members following along should have useful information without a false invitation to score.

The owner initially asked that quiet/upcoming concepts have a touch more pop. After further refinement, the three club/Home study screens received emphatic approval as the strongest design work so far. In particular:

- The large, elegant serif **2027** treatment is loved; the owner explicitly asked for more of that typographic character.
- The pine horizontal rules on the first screen are loved.
- These club screens are the creative benchmark for further work, not a reason to restart the identity.
- The owner liked the broader direction of the draw screens but initially felt they were good rather than great by comparison.

The admired year uses a regular-weight system serif/Georgia fallback stack in the study. Do not invent a licensed font name or claim identical rendering on every device. Extend the editorial character selectively; it does not mean every number should dominate its page.

Previous creative boards and rationale remain in [README](creative-concepts/README.md) and [refinement rounds](creative-concepts/refinement-rounds.md). Those AI-assisted boards are exploratory. The later working studies and actual PR #33 renders are distinct evidence; do not imply all later studies are present in those older boards.

## 3. Seasons: explicit organiser switchover, not a calendar reset

The existing data discussed was the **2026 season**. The owner described preparation for **2027**.

**The organiser controls opening the next active season in the backend. When the organiser opens it, Home immediately leads with that season, even before its first round is played.** Do not wait for its first live/final result, choose the year from the latest played round, or silently revert to the previous year's standings because the new year is empty. Do not assume an automatic 1 January switch.

Opening a season starts a fresh season competition; it does not delete, overwrite or relabel historical results. Preserve accessible previous seasons, their Golfer of the Year standings, rounds and results. Historical views should clearly retain their year context through drill-in and back navigation; career information should be distinguishable from selected-season information.

The active competition season, today's calendar year and the date of the next announced event are separate concepts. Preparing a future event must not itself imply that the organiser has opened its season.

**Golfer of the Year is the sum of each player's best three qualifying round scores.** It is not an average or the sum of every round. Preserve existing tie rules. The owner stated that all rounds count except the Westport scramble; Ballinrobe on day one of that trip does count. Do not fabricate individual scramble results to fit the GOY table. Exact wording before three results exist can be refined against existing behaviour; no new formula was requested.

Build on existing season-filtered results, year selection and archives rather than create a competing history system. The older note saying the switchover decision is still open is superseded by the answer above.

## 4. What members should see as an event approaches

The lifecycle is more nuanced than quiet versus live. These are presentation situations, not a demand for a new database status enum.

| Situation | Member-facing intent |
| --- | --- |
| Active season opened; nothing announced | Lead with that season and calm club identity. Show an honest no-rounds-yet state and access to history. Do not borrow last season's leader. |
| A round is intended but undated/unannounced | Do not promote it as Next round or Upcoming simply because a backend record exists. |
| Date/course announced by organiser | Show the next event and confirmed details. A fixed date does not mean attendance, groups or handicaps are ready. |
| Preparation progressing | Reveal the arrangements that are actually available; do not invent players or treat missing groups as an error. |
| Groups/handicaps ready | Let members see their relevant playing information. Scramble pots may be visible before teams exist. |
| Event day before play | Show useful tee/group information; the calendar date alone is not proof that scoring has started. |
| Live play | Make scoring, leaderboard and NTP/LD appropriate to the format and the viewer. A nonparticipant can follow the event. |
| One group finished, others playing | Preserve saved group status while showing the ongoing competition. Do not prematurely label the whole event final. |
| Between rounds of a trip | Keep completed round results and the next round's arrangements accessible. A finished round does not mean the trip is over. |
| Event/season finished | Show final results and clear historical context; maintain access to scorecards and past seasons. |

Concrete example: Athenry was described as the intended first game of 2027, **with no date yet set**. It must not appear as the confirmed next round at that point. The owner later sets its date in the backend; then members should see the announcement. A date “in March” was illustrative, not a confirmed booking.

Attendance coordination remains outside the app, mainly WhatsApp and committee outreach. **Do not build RSVP/invitation/attendance-response workflows.** Occasional substitutes may not be regular members or app users; account creation must not be assumed necessary to participate. Visibility of an organiser-entered attendee list before groups/pots exist was not settled and is not a blocker for the rest.

## 5. Standalone rounds and trips are different contexts

The owner described:

- Athenry as a standalone round.
- A separate standalone Ballinrobe round.
- Marbella as a trip with three rounds.
- Sligo as a trip involving two courses; the exact round count was not established.
- Westport as a two-round trip with different formats, below.

Ballinrobe can be both a standalone event and a round within a different trip. Recurring course names are not event identities. Preserve season, trip instance and round context.

**Being a trip does not automatically mean there is a combined trip competition.** Westport specifically has no trip leaderboard. Do not present its missing aggregate as an empty/loading table or invent a trip winner.

## 6. Westport: two rounds, deliberately different competitions

### Day one — Ballinrobe

Ordinary individual Stableford, usual four-player groups, Buggy Wars and normal cross-group KB pairings. This round counts towards GOY. It is distinct from the standalone Ballinrobe event.

### Day two — Westport Golf Course scramble

Normally sixteen players, four teams of four. Organisers grade four pots A/B/C/D, with the strongest four players in A and progressively lower groups thereafter. Each team receives one player from each pot.

Everyone plays; the team chooses the best position and everyone plays again from there. Record **one team stroke score per hole**, converted to ordinary Stableford with any team allowance. There is no individual day-two score.

Team playing allowance normally defaults to zero. Exceptionally the organisers may leave a particularly strong player's team at zero and give other teams two or three shots to balance the field. Provide manual organiser control; do not invent automatic balancing, an individual-WHS calculation or a specified allowance maximum.

**Each player must contribute at least three selected tee shots.** Record whose drive was selected on every hole and show running per-player counts. A team finishing without meeting the minimum for every player is automatically KB regardless of its points: the owner's “golden rule.” Useful unobtrusive warnings are appropriate. The owner says no team has failed this in 25 years; do not let elaborate hypothetical disqualification cases dominate the UX or delay the work.

Rank teams by most Stableford points, with normal countback. Highlight the bottom team as **KBs**. There is no winners' prize; avoiding last place is the social drama, and second last is jokingly the best finish. Do not turn this into a conventional trophy-winner presentation.

NTP and LD also happen. Do not automatically attach ordinary Buggy Wars or a separate paired KB competition to this scramble.

**No combined Westport trip leaderboard:** day one is individual and day two is a team score. Do not assign the team total to each person, fabricate individual results or sum unlike competitions. The trip can have itinerary and separate results without an aggregate standings view.

Sixteen/four-per-team is the strong practical preference, not an established software hard cap. The committee tries to replace withdrawals but occasionally has uneven numbers. **There is no standing agreed three-player scramble rule.** The committee has handled this differently on different occasions and may decide only on the morning. Defer compensating shots, extra attempts, minimum-drive variations and pot exceptions to an event-specific decision. Do not invent a permanent automatic policy or repeatedly ask the owner to settle one now. Keep pre-draw preparation editable; do not silently force incomplete pots through a four-person draw.

## 7. Breakfast draw: a social feature, not just group administration

The committee assigns pots shortly before the trip using attendance and supplied handicaps, currently discussing this on WhatsApp. **Members should see the pots a couple of days beforehand**; that generates anticipation and banter.

At Saturday breakfast before Westport, the group currently uses Wheel of Names to select one player from each preassigned pot. The random draw selects FROM pots; it does not decide pot membership. The owner currently copies the outcome onto paper/WhatsApp and then recreates playing groups elsewhere. The desired in-app feature should reduce that repeated administration while preserving the fun.

The drawn team **is** the playing group. Do not add a second grouping draw. Avoid duplicates and select without replacement. Retain the outcome reliably so reloading cannot silently redraw it. Persistence, confirmation, double taps, recovery and permissions need engineering design; a wheel animation alone is not the feature. No WhatsApp integration or external wheel service dependency was requested.

Preferred device: **iPad Pro** at breakfast. Phone and laptop must also work. A TV would be nice but is impractical at the small hotel and must not be required. People may be gathered some distance away.

Specific owner feedback:

- The first draw screen was too understated. **The wheels are the core elements.**
- Give wheels room, high contrast and legible labels; selected names must remain large and readable from farther away.
- **During the draw, show only the team currently being drawn.** Do not fill that screen with previously drawn teams.
- After all teams are drawn, use a **separate final line-up screen** showing everyone.
- On that final screen **member names matter more than team numbers**. Team numbers are quiet signposts; large editorial numerals must not displace the useful information.
- The names-first refinement received the owner's positive response (“all good,” transcribed as “Olly good”).

Pacing remains open: four pots spinning/revealing together versus pot A, then B, then C, then D for each team. The owner sees appeal in the slower dramatic reveal because saved administration time may make room for it. Do not call simultaneous spins a settled requirement. A simple organiser-controlled choice was a creative recommendation, not a final owner-selected interaction. Avoid forced lengthy timers.

Carry the admired serif character and pine rules into the draw where useful, while keeping wheels and names dominant. Real tablet/distance readability remains to be checked; a viewport screenshot is not proof.

## 8. Competition distinctions and contest finality

**KBs and Buggy Wars are separate.** Normal KBs uses cross-group pairs and focuses on the lowest pair. Buggy Wars is between buggy pairs within a playing group, with Front nine, Back nine and Overall as separate matches. The scramble's losing-team KB outcome is a specific exception, not a replacement definition for ordinary rounds. Keep the established product term “KBs.”

For NTP/LD, groups report the relevant member if they improve the standing result, or Nobody if they do not. The owner described the last playing group passing the contest hole as the point at which its response settles the result. **Nobody must not erase an existing leader.**

Engineering must reconcile that intent with real ordering, missing responses and offline/delayed saves. Current Results/Home distinguish provisional from confirmed outcomes through existing all-group responses or an organiser-selected winner. That existing behaviour is not proof that physical last-group passage is fully represented. Do not mark an incomplete result final or silently change claim rules during visual work. No distance-entry workflow was requested.

## 9. Implementation status and next collaboration

Status refreshed on 24 October against main `68cf84f5723cbe18076b341e68ee9878e7727667`, including the merged season-switch release #37. Resolve current refs again before implementation; this is a named-source record, not a live status feed:
- The released foundation includes the separate KB-summary fix from PR #32.
- PR #33, head f14c7c409e9d63cf368c148d43de08362ff200c1, implements a focused Home UI slice: season typography/rule, upcoming date treatment, live leaderboard and contest presentation using existing helpers.
- Claude approved that head. PR #33 was subsequently integrated and released via #34. The bounded follow-up #35 and announcement/archive-context work were then incorporated into #36, which has now merged to main; publish run 40071990961 succeeded. The earlier broad Home comparison against the pre-#33 release was incomplete; do not confuse later follow-up comparison passes with completion of that older evidence. Physical-device testing is not claimed.
- **Explicit active-season switching is implemented and released in #37.** The organiser's existing Settings now stores the selected season; Home/GOY lead with it immediately, including an empty new season, while previous results remain accessible. The two-tap switch is logged, reversible, and unavailable during live play. The source's season-start test was rerun independently by Codex at the named main SHA and exits successfully; no new full-browser claim is made here. Do not rebuild this feature or ask the owner to decide its trigger again. Undated-round promotion and archive/player context were addressed in #36; retain that work too.
- **Remaining work:** optional trip aggregation, scramble team scoring and the breakfast draw. Delayed/offline contest-claim ordering is a separate protected-code correctness issue; Codex reproduced it in both engine status and the before-hole leader helper and handed the evidence to Claude. No fix is claimed here.
- The later Home/draw working studies are prototypes, not completed application features. Do not mark the wider brief complete because the first Home contribution exists.

Suggested dependency order: address delayed contest-claim correctness in its own protected-code PR; then optional trip standings and team-format scoring/persistence before relying on a production draw flow. Preserve the already released season switch, announcement and archive work and continue ordinary competition refinement. This is a dependency recommendation, not a competing roadmap or queue. Inspect existing activity, agree ownership in Issue #1 and use the existing system. Do not restart the completed original roadmap or add filler.

Claude: please review future design choices against this full context and identify any remaining mismatch between intended behaviour and actual code. Challenge the solutions while retaining explicit owner decisions. Codex should not use the aesthetic brief to conceal missing behaviour, and Claude should not treat implementation gaps as evidence that the owner never requested that behaviour.

No main merge, live-app change, production deployment or bypass of protected-code review is authorised by this brief.

