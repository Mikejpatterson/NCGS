# Claude's process review: 26 October 2026

Screen numbers refer to [README.md](README.md). Each finding is written as screen · problem · fix · priority. Priority is **must**, **should** or **could**; **OWNER** marks a decision only Michael can make.

## Bugs (wrong on screen)

- **#31** · While a draw is under way, places not yet drawn say "No one from pot B/C/D", which reads as though the pot has run out · Show an empty "—" (or nothing) until drawn; keep "No one from pot X" only for a pot that really has run out · **must**
- **#59** · The withdrawn player's tile on the hole screen overlaps itself ("E Withdrawn Picked up…") · Lay it out like the other tiles: name on the first line, "Withdrawn · pick-ups from hole 15" under it · **must**

## Organiser (Michael)

- **#14** · The organiser's "Next up" checklist doesn't know about the breakfast draw: it asks for "Players and groups", and offers "KBs (optional)" for a scramble · For a scramble with pots, the item is "Breakfast draw" (done once the groups are made); there's no KBs item for a scramble · **should**
- **#15, #25, #49** · A big pine **Start round** button suggests it must be pressed, but the round goes live by itself when the first score is saved (`src/server.js`) · Remove it, or make it a quiet link. **OWNER** (does Start round mean anything to you?)
- **#42** · During the live scramble the round page still shows "Breakfast draw · Set the pots, then draw the teams", although the teams are playing · Show the Breakfast draw row only before play (or once pots exist) · **should**
- **#42** · "Groups" progress rows say "Group 1 · Thru 15", with "Thru 15" wrapping onto two lines; in a scramble they're teams · "Team 1 · 15 holes", on one line · **should**
- **#25, #42** · The Team shots row reads "Team 1: 0 · Team 2: 2 · Team 3: 0 · Team 4: 3" and wraps · "None yet", or "2 teams get shots" · **could**
- **#6, #17** · Setting the pots: names only, no handicaps, although pots are set by handicap; it also lists every member, not just those on the trip · Show each player's index; add **Fill pots by handicap** (sorts the players picked for the trip into four equal pots, then adjust by hand) · **should** · **OWNER** (does the committee pick pots purely by handicap?)
- **#43, #44** · During the live scramble the names on Groups can be tapped, only to say "no one needs withdrawing" · Not tappable; one line at the top: "Play has started: teams are fixed" · **should**
- **#42, #47** · Finishing a scramble: "Finalise · 4 cards open" and contests still to be confirmed. Card photo checks were built for individual cards, so it's not clear what a scramble team has to "check" · **OWNER** (should a scramble need card checks, or just contest confirmation?)

## Draw (breakfast room)

- **#8, #19** · Two taps to the first spin ("Start the draw", then "Draw pot A") · "Start the draw" also spins pot A · **could**
- **#11, #22** · A finished team doesn't show its tee time, which is what people want to hear announced · "Team 1 · tees off 10:00" on the stage once the team is complete · **should**

## Members and players

- **#27** · After the draw, Home doesn't show *my* tee time and team, only "View round details". It's the one thing everyone wants on the morning · On Home's round card: "You're off at 10:20 · with Donnacha, Oisín, Pádraig" (the round page already has it) · **must**
- **#28, #40** · In a scramble, the round page opens on Players, sorted by name with handicap indexes, which mean nothing there · Open on Groups (your team highlighted); drop the Index column for a scramble · **should**
- **#34–#37** · The drive warning reads "6 drives owed · 4 holes left · KBs": "KBs" alone is cryptic, and it doesn't say *who* owes · "Gearóid and Jarlath need 3 drives each · 4 holes left", in amber, and red only when it can no longer be done · **must**
- **#41** · The trip page shows "Day 1 / Day 2" with no course, date or result: it looks unfinished · "Sat · Ballinrobe · won by …" / "Sun · Westport scramble · live" · **should**
- **#48** · When every team has finished, Home still says "Live" and doesn't say who's KBs · "Finished · KBs: Team 1" (provisional until the organiser finalises) · **should**
- **#32** · Home's leaderboard says "Team 1 27": members can't tell whose team that is · First names under each team, or "Team 1 (Aidan's)" · **could** · **OWNER**

## Themes

1. **Screens built for individual Stableford leak into the scramble**: Players with indexes, Group/Thru, KBs wording, card checks. Each scramble screen should be checked against "what does a team need here".
2. **The organiser's checklist and round page don't follow the day's order** (pots, then draw, then play, then confirm, then finalise). They should lead Michael through the next thing to do, in order.
3. **What I most want to know is often one tap away**: my tee time, my team, who's KBs. Home should answer it directly.
