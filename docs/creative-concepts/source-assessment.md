# Released-source assessment — 23 October 2026

> **Historical assessment of `539be61`; status updated 24 October.** The finished KB summary was fixed in #32. Undated-round promotion and archive-to-player season context were fixed in #36. Do not repeat those fixes from the reproductions below. Explicit active-season switching was then released in #37; retain it too. The delayed-claim and team/trip observations below remain separate engineering topics. Read the [consolidated owner brief](../OWNER-CONTEXT-2026-10-23.md), especially §§3 and 9, for current decisions and implementation status. Source references and test evidence below describe the historical baseline, not today's code.

Codex stage-one investigation. Baseline: released main and design both
`539be61ed2a0b98ed7a8c291c6e5b267ca10a3a9`. The old redesign roadmap/queue is complete.
This assessment builds on that release and the existing [creative boards](refinement-rounds.md).
It does not add executable tasks, change application code, or authorize a release.

This public document contains observations of public source and invented-fixture reproductions only.
At the time of this assessment, detailed event requirements were withheld. The owner subsequently approved publishing the [consolidated brief](../OWNER-CONTEXT-2026-10-23.md) on 24 October; use that document for the complete shared context.

## Retain the existing work

- Approved vector crest, pine/ivory identity, restrained gold and light floating navigation.
- Identified live Home already has Continue and includes the player's rank outside the leaders.
- Individual score controls, drafts, outbox and conflict handling; distinct KBs and Buggy Wars.
- Best-three GOY calculation, year selection and historical scorecards.
- Before-hole contest introduction and after-hole member/Nobody submission.
- Existing guest setup, organiser group preparation and all completed validation evidence.

The creative opportunity remains a calmer browsing composition and a stronger matchday hierarchy,
with the leaderboard and contests alongside scoring. This is refinement of an existing application.

## Reproduced observations

### Finished KB summary selects the highest pair

At [20-society.js:396](../../src/app/20-society.js#L396), `finishedBody()` selects rows matching
`res.kb[0].posLabel`. The app-scored KB table is descending
([engine.js:566](../../src/engine.js#L566)); `kbLowest()` separately identifies the bottom row.

Reproduction: fixture preview → Past rounds → first final fixture round → expand KBs.
The summary displays the 74-point pair, while the expanded table ends with a 59-point pair.
The live/general results path already uses `E.kbLowest()`. This is a concrete inconsistency in the
finished summary, not a reason to change KB ranking or scoring. Independently verify before a focused UI fix.

### Undated upcoming record is promoted

With a previous final fixture round and one upcoming record with no date, Home displays
Next round / Example unannounced round / Date to be confirmed. This confirms the source observation
already recorded in [event lifecycle notes](event-lifecycle.md).
`upcoming()` sorts undated records last but still includes them.

### Upcoming-only season does not enter the year picker

With a completed 2026 fixture and only an upcoming 2027 record, GOY still displays 2026 and no year picker.
`seasonOf()` and `seasonsList()` derive available seasons from non-upcoming/live/final rounds.
The current organiser settings have no active-season selection.

### Archive-to-player changes the statistical context

In a synthetic archive fixture, GOY is explicitly selected to 2025 and its first row totals 9.
Opening that player displays Best 3 = 40 from 2026.
`VIEWS.goy` uses `yearOn()`; `VIEWS.player` uses `seasonOf()`, and player statistics also include
an all-years summary. Preserve the distinction between season and career context when refining this.

## Other code boundaries to respect

- Trip membership groups records by trip name, season and demo state; the current trip route renders
  summed individual standings. A trip container and a standings calculation are coupled in the present UI.
- Current persistence stores scores by round/player/hole and group claims by round/hole/group.
  Existing group teams are used for buggy pair calculations; their name alone is not proof of another scoring format.
- `contestStatus()` confirms after every group has answered or an organiser winner exists.
  Nobody retains an earlier claimant. Claim ordering follows timestamps.
  A delayed earlier-group claim can become the last non-Nobody claimant: this merits reliability investigation,
  not a speculative engine patch or a claim that physical playing order is established.
- Normal group preparation and guest entry already exist. Reuse them before proposing parallel workflows.

## Evidence and limits

All 15 build-input source/build/fixture blobs match the current GitHub tree. The four existing engine,
server and fuzz test files were restored byte-for-byte from that SHA before the final run.
`NCGS_FIXTURE=1 node build.js` succeeded. Engine/server plus the two existing fuzz files pass
(exit 0; four file entries, zero failures in Node24). A direct best-three example returns
40 + 35 + 31 = 106, excluding 20.

Fresh genuine Chromium fixture screens were inspected at 390×844, with a Home capture at 1194×834.
The lifecycle/KB reproductions produced no page errors. They are not live-site or real-iPad/iPhone evidence.
No new 360px/135% layout pass, offline multi-device pass, or usability pass is claimed in this analysis.
The earlier completed checks remain historical evidence at their recorded SHAs.

## Handoff

Codex owns this assessment and the next connected design study. Proposed working arrangement:
Claude independently challenges these source findings and the existing boards before implementation is assigned.
Do not start the completed queue, merge this PR, or deploy. Issue #1 remains the common coordination record.
An ordinary comment records a handoff; only an actual review run/result establishes agent execution.
