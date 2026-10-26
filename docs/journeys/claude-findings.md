# Claude's findings: journeys (process, state, integration), 26 October 2026

Recorded with `tools/journeys.js` at `claude/groups`. Each finding is: journey/frame · what happens · why it matters · proposal. Tags: **defect** (wrong), **friction** (works, but costs effort or confuses), **gap** (a job the app can't do).

## Facts checked in code (the two open process questions)

- **Start round.** `start-round` sets the round live early (it checks there are groups, a course card, and no other live round). The server also starts the round itself on the first saved score of an upcoming round with groups (`src/server.js:334`, which logs "Round started · First score saved"). Starting early only changes presentation: Home shows Live, phones check for news every 15s instead of 60s, Groups switches to withdraw-only, and the organiser sees progress and contests. The automatic start skips the "another round is live" check. **Proposal:** remove the button. Treat the round as under way from its date and first tee time, or from its first score, whichever comes first. Keep "Reopen" for corrections.
- **Finalising.** `finaliseBlockers` needs every group to have completed 18 holes, and every contest with a claim to be confirmed. Card photo checks are **not** required, and never were. So for a scramble "4 cards open" just means "4 teams still playing". **Proposal:** for a scramble, word it "teams still playing"; the rule stays as it is.

## 1. Returning member, empty season, past seasons

- 1/7 · Back from last season's player page returns to last season's table · **works**, keep.
- 1/10 · A past round's back link reads "NCGS" instead of where you came from ("Past rounds") · friction · Name the back link after the screen it returns to.
- 1/2 · Home's "Past rounds · None played yet" is true for the new season, yet the page opens on last season's rounds · friction (small) · "Past rounds · 2026".

## 2. Organiser sets up an outing

- 2/4–6 · The new-round form has no name field (the course name is used), and saves without a first tee time. Groups then have no tee times, so members' cards show a big "1 · Group" where the time should be (2/22) · friction · Ask for first tee on the form (prefilled 10:00); when it's missing, the member card shows "Group 1", not a giant "1".
- 2/8–15 · Two different screens are both called groups: **"Groups and buggies"** (tick who's playing, Draw, then Save) before the draw, and the new **Groups** screen afterwards · friction · One Groups screen. When nobody is drawn it shows the tick-list and Draw; once drawn it's the editable groups, with no separate Save step (each change saves, as the new screen already does).
- 2/13–14 · After a draw, every group carries a "Starts on hole [1]" dropdown · friction · Hide it behind the group's own options ("Start on another hole"), since shotgun starts are rare.
- 2/15 · "Groups and KB pairs saved": KBs are made silently, then reviewed on a separate KBs page · works · keep. Show the KB pairs in the member Groups tab as now.
- 2/18–19 · Moving a late player to a group with room is one tap, and KB pairs repaired themselves (toast: "3 KB pairs updated") · works.
- 2/20 · Member Home after groups are out doesn't show their group, tee time or partners · friction · Agreed with Codex: show "You're off at 10:08 with …" on the Home card.

## 3. Golfer scores a round (signal loss, restart, second phone)

- 3/1–4 · First open: "Who are you?" is one tap from Home, then a name list · works.
- 3/8–11 · Score, then save, then an after-card (result plus Buggy Wars), then tap "Hole 2" · works. The after-card is useful, but it's an extra tap on every hole · **Codex to judge** whether it should time out on its own.
- 3/16–17 · With no signal, the hole saves and the after-card says "Saved", but nothing says it's only on this phone · friction · A quiet "On this phone · will send when there's signal" until it's sent.
- 3/18 · A restart with no signal is not tested here (the offline cache is off in the recorder) · evidence gap · Needs a real-phone check before release.
- 3/19 · Back online: the scores had reached the server, and the app reopened on hole 4 · works.
- 3/20–22 · Second phone: name, then Home's "Continue · Hole 4", then the right hole · works.
- 3/12 · Results don't offer a Contests pill in this round (Scores and Buggy Wars only), although the round has contests · **check**: confirm why, then make it consistent.

## 4. Trip and season

- 4/5–8 · From the trip page, a day's results open with **no back link**; the tab bar is the only way out · **defect** · Back to the trip.
- 4/4 · "Each day: Day 1 / Day 2" doesn't name the course or date · friction · (F15) "Thu 14 May · Cabopino · won by Aidan".
- 4/11–13 · Player page: good. The "To beat –" tile is empty when you lead · could · Hide the tile when there's nothing to beat.

## 5. Westport: pots, draw, teams, play

- 5/1–10 · The iPad draw flows from Start to the line-up in a sensible order · works.
- 5/11 · On the iPad, Home is a thin phone column in the middle of the screen · could · Only the draw needs the full width; leave the rest.
- 5/12–20 · On scramble day, Home has no route to the trip or to day 1's (Ballinrobe) result, because the trip leaderboard is off · gap · A trip strip on Home: "Westport trip · Day 1 Ballinrobe: won by … · Day 2 scramble: live".
- 5/14 · The longest-drive question (hole 12) comes back when the team taps Continue on hole 15 · works as designed (it's compulsory); fine.

## 6. Organiser finishes and corrects

- 6/5 and 6/15 · **Defect:** the contest-confirm screen and the round page show "_nobody", the internal code, where they should say "Nobody".
- 6/3 · Finalise early gives "Not yet: 3 cards open, 2 contests to confirm" · works · Make "cards open" read "groups still playing".
- 6/5–6 · Confirming a contest means opening it and picking a claim; each claim has its own Confirm. Clear once you're in · works.
- 6/10–11 · Correcting a hole from a group's card works, and the round page shows the card grid · works.
- 6/16 · Finalise is one tap with no confirmation, but Reopen exists · works (reopen is the undo).
- 6/18 · After finalising, Home's first card is the *next* round, so the just-finished result is under "Last round" · could · On the day it's finalised, Home leads with the result.

## 7. Scramble finish

- 7/5 · Team finish screen: points, the KBs reason, and the drives used · works.
- 7/6–7 · Home "All in", See the results, "KBs: Team 1 (to be confirmed)" · works (fixed this morning).
- 7/9–11 · Organiser: finalising needs both contests confirmed · works. The wording "contests to confirm" is fine.
- 7/5 · After finishing, the Hole tab is labelled "Card" · friction · "Team" or "Our team".

## Themes I'd put in the plan

1. **One Groups flow**: before, during and after the draw (2, 5).
2. **Your day on Home**: your tee time, your group or team, Continue, results when all are in, and the trip strip (2, 5, 6).
3. **Navigation that always returns where you came from**: back links named after their destination; no dead ends (1, 4).
4. **Honest states**: "on this phone" until sent, "Nobody" not "_nobody", "groups still playing" (3, 6).
5. **Remove what doesn't earn its place**: the Start round button, the per-group start-hole dropdown, the extra Save step.
