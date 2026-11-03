# Event lifecycle — working design notes

> **Historical working notes from `539be61`, superseded where answered below.** The owner's explanation continued after this file was written. The [consolidated owner brief](../OWNER-CONTEXT-2026-10-23.md), especially §§3–7, now records the settled season trigger, lifecycle, trip, scramble and draw requirements. PR #36 fixed the undated-round promotion described here. Preserve the original observations as history; do not treat them as current defects or ask the owner to repeat settled answers.

At the time these notes were written, the owner was still explaining requirements. They capture the principles and candidate edge cases known then; the later consolidated brief controls. Neither document approves a release or a new attendance workflow.

The examples below were abstract because event details were not then cleared for public sharing. The owner approved the full consolidated brief for public GitHub on 24 October.

## Confirmed direction

- The frontend must reflect different people and stages, not just a quiet/live visual toggle.
- An undated, unannounced future standalone round must not be promoted as Next round merely because the organiser may intend to hold it.
- Once the organiser sets/announces its date in the backend, members should see the upcoming event and confirmed details.
- Attendance, groups, handicaps and arrangements can be settled progressively closer to play. An early announcement must not look fully organised.
- During play, scoring, individual standings, nearest the pin, longest drive and Buggy Wars have matchday importance; between rounds retain restrained club character.
- Standalone rounds and trips containing several rounds need distinct event/round context. Known examples include a three-round trip and a trip involving two courses; two courses alone does not establish the number of rounds.
- A more complicated trip is explicitly deferred until the owner explains it. Do not invent its travel, teams, accommodation or competition rules.

## Readiness has several dimensions

Do not turn the earlier five-stage outline into one rigid sequence. A date may be known while attendance is not; players may be known before groups; one round may be complete while a trip continues.

| Dimension | Distinctions to design and verify |
| --- | --- |
| Audience | Organiser preparing the event; identified participant; member following without playing; identity not selected |
| Public certainty | Unannounced planning; date announced; confirmed information versus information still pending |
| Arrangements | Attendee list, draw, tee times, handicaps and contest holes may become ready independently |
| Play | Today but not started; round live; this group finished while others continue; results provisional versus final |
| Trip context | Before the trip; between its rounds; one round live; completed-round results alongside the next round; whole trip finished |

An ordinary member should see relevant confirmed information and clear pending language, not administrative setup warnings. A nonparticipant should be able to follow results without a false Continue-scoring invitation. An unidentified user needs an honest identity-selection path rather than an assumed group.

A trip remains the parent context. Its individual courses, dates, groups, participants and results must remain distinguishable. Do not assume everyone plays every round, the groups stay identical, or a round finishing ends the trip. Those are design cases to resolve, not facts already established by the owner.

## Historical evidence from main 539be61

These are source observations, not a claim that every case was reproduced on a real phone:

- `src/app/10-data.js`: `upcoming()` includes all upcoming records and sorts undated ones last; it does not exclude them. `src/app/20-society.js` can select such a record as the featured next round and render Date to be confirmed. The owner's undated/unannounced example therefore requires a deliberate visibility decision; do not claim it is already handled.
- Home's Continue action depends on an identified golfer's live group. Do not remove that useful distinction.
- Upcoming players/groups views currently derive much of their content from saved groups. A member-visible attendance list before the draw may need additional consideration; do not assume a self-service RSVP feature exists or has been requested.
- Round status is broadly upcoming/live/final. Date, groups and trip/day fields also exist. Those labels alone do not express every member-facing readiness state.
- The current model links a round to a trip and trip day. A richer trip-level presentation must be checked against that model rather than assumed complete.

Scoring/sync code is protected. These observations are not authorization to edit it during visual exploration.

## Cases identified for clarification at the time

Tentative versus member-visible groups; attendance for only some trip rounds; tee-time or date changes; postponement/cancellation; results awaiting confirmation; overlapping upcoming events; selecting the relevant round during an ongoing trip. Do not decide policy, add notifications or create new workflows from these questions.

## Next creative pass

Using the later consolidated brief to separate settled requirements from remaining questions, refine the member-view matrix and mock up any still-missing states: date-only announcement, preparations becoming visible, today-before-play, between trip rounds and end-of-trip. Keep the already explored quiet/live designs as two states within that larger lifecycle.

The main design question is: **what can this person know, and what is useful for them to do at this point?**
