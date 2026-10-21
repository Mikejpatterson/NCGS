# Golf Trip App: Design Decisions

First approved 10 October 2026. Revised 11 October 2026 after the "nothing needs explaining" review. These decisions are the source of truth for the build. Change them deliberately, not in passing.

## The test

If the player who asks the most questions would need to ask more than two "how do I…?" questions, the design is wrong. The fix is never a hint or a label explaining the screen. Change the screen until it is obvious.

## Design ethos (Apple-style)

- **Anticipate.** The app knows the player, group, round and current hole. Players configure nothing.
- **Defer to content.** The hole, the dots, the scores and the match are the interface. Chrome stays quiet.
- **One job per screen.** Each screen has one obvious primary action, within thumb reach.
- **Forgive.** No "are you sure?" dialogs. Everything can be undone. No entered score is ever lost.
- **No instructions.** No hints, footnotes or "tap here" text. Standard controls carry the meaning: chevrons mean "opens", a filled button means "selected", back arrows mean "back".
- **Golf conventions over invention.** Stroke dots, "4 for 2", "2 up", "AS".
- **Neutral wording.** Every screen can be shown to the whole fourball. No "you" or "them".
- **Quiet when fine.** Save status appears only when something is wrong.

## Visual system

- **Type:** four sizes and two weights.
  - Sizes: title 28, body 17, secondary 15, caption 13.
  - Weights: regular and semibold.
  - Font: the system font, SF on iPhone.
- **Spacing:** 4, 8, 16 and 24 only.
  - Section gap: 24.
  - Gap between related blocks: 16.
  - Label to card: 8.
- **One left edge.** Titles, section labels and pills align with the edge of the cards. Text inside cards sits 16 in.
- **One pill style.** 24 high, 12 radius, 13 semibold. Variants:
  - Buggy 1 blue
  - Buggy 2 red
  - neutral grey
  - amber (in progress or to confirm)
  - green (final)
- **Colour:**
  - Golf green #1E7A3D for primary actions.
  - Buggy 1 blue #0A60C9 and Buggy 2 red #C62828 for team identity only, never the only carrier of meaning.
  - Light only, because the app is read outdoors.
- **Team marker:** above player lists, a "Buggy 1" or "Buggy 2" pill, not the players' names again.
- **Touch targets:** 44 pt minimum. Text follows the phone's text-size setting.
- **Tab bar:** Results, Hole, Ruling. Hidden during score entry.

## The hole loop

### 1. On the tee
- Title "Hole N" with "Groups" on the right.
- Below the title: "Par X · Index Y · Z yds".
- On contest holes, a neutral pill: "Nearest the pin" or "Longest drive".
- Players under their Buggy pill. Each row has the name and shot dots, with no text about shots.
- One row for the match in the nine being played. It opens Buggy Wars.
- One button: "Enter scores", or "Continue scores" if some are already in.
- No scorer role. Anyone in the group can enter scores.

### 2. On the green (one screen, no scrolling on a standard iPhone)
- Header: back arrow, "Hole N", "Par X · Index Y".
- Players under their Buggy pill.
- **Each player row:**
  - Name, with shot dots underneath.
  - On the right, once a score is entered: the score name in grey (Par, Bogey…) and the strokes with Stableford points raised: 4².
  - Below: a row of stroke buttons from par − 2 to par + 4, then "Pick up". One tap enters a score. Tapping it again clears it.
- **Contest holes:** one row, for example "Nearest the pin · Liam leads ›". It opens a short list of the four names plus "Nobody closer".
- **Save button:**
  - Grey while scores are missing: "1 score to go · Seán".
  - Green when complete: "Save hole N".
  - It stays pinned at the bottom on small phones.

### 3. Walking off the green
- "Saved" with Undo.
- The result in the winning buggy's colour: "Seán & Mick win 15", with "Seán's 4 points beat 2" underneath.
- Each match that changed: the old status struck through, then the new one.
- One button: "Hole N+1", with par, index and yards.

## Scorecard photo check

The group still keeps a paper card. The app checks the two against each other at the turn and at the end, so the "card says 6, app says 5" argument is settled while the hole is still fresh.

- **When it's asked for:** after the hole that finishes a nine (usually the 9th and the 18th). The result screen offers "Photo of the front nine", with "Later" underneath. While a finished nine is unchecked, the tee screen shows a "Front nine card" row in the match card. After 18, the card screen lists both nines, and "Submit without checking" stays possible but is logged.
- **Taking the photo:** the phone's own camera. The photo is kept with the check.
- **Reading:** Claude reads the photo and returns strokes per hole per player, with a confidence for each. The prompt covers:
  - pencil writing
  - keys that say Player A–D or Jugador A–D
  - holes running down or across the card
  - X, dash, slash, P or NR meaning a pick-up
  - rubbed-out corrections
  - small points written beside the strokes
- **Matching rows to players:** by the names in the key (short forms and accents are fine). If that doesn't work, by whichever rows agree most with the scores already in the app.
- **Comparing:**
  - Only holes already saved are compared.
  - A reading counts as unclear ("Hard to read") when the reader says so, or when it is implausible for the hole (more than par + 4).
  - Unreadable cells are raised, never guessed.
- **Deciding:**
  - The app never changes a score on its own.
  - Each difference shows "Hole 4 · Seán" with two buttons, "Card: 6" and "App: 5". The photo is one tap away, full size.
  - "Done · 1 score changed" applies the choices, updates every result and logs them.
- **No reader available:** the check falls back to "compare the app with the photo", with the nine's scores in a table and "All correct". Tapping a hole opens it for correction.
- **Organiser:** the group screen shows each nine as "Checked", "Open" or "Not checked", and opens the photo.
- **Testing:** three synthetic pencil cards (holes down, Spanish holes across, reordered key), with an answer key and a blind reading recorded for each. In the test version, "Use a test card" runs one through the whole flow.

## Other player screens

- **Who are you?** 12 names, picked once.
- **Groups (Round N):**
  - Back link to the hole.
  - Your tee time and group.
  - Each player's index and playing handicap, with a chevron that opens the working.
  - Tee data: slope, rating, par and allowance.
  - Other groups, which expand.
  - "Not Pat?" at the bottom.
- **Handicap working:** index → × slope ÷ 113 → + (rating − par) → course handicap → × 95% → playing handicap.
- **Buggy Wars:**
  - Group switcher.
  - A key matching Buggy 1 and Buggy 2 to their names.
  - Front, back and overall statuses.
  - A board with one row per hole: hole number, each buggy's best points (the winner filled in its colour), and the running match pill ("S&M 2 up", "AS").
  - A summary row between the nines.
  - The current hole is highlighted and scrolled into view.
  - Played holes can be tapped to change them.
- **Leaderboard:**
  - Round and Trip switcher.
  - Status pill: "Thru 14" or "Final".
  - Stableford points, with ties shown as T3.
  - KBs: the table is highlighted on its bottom row, the lowest score. No drinks wording anywhere.
  - Contests.
  - "Share results".
  - The organiser link.
- **Results card:** headline, top five, KBs, Buggy Wars money, contests, and the "Demo scores" label.
- **Card after 18:** points per player, Buggy Wars results, then "Submit card".

## Organiser

- Same app and style, behind a PIN.
- **Home:** round switcher, then groups with progress, contests to confirm, and Manage (handicaps, groups and buggies, course, change log, export).
- **Finalise round:** names what is blocking it. Reopening is deliberate and logged.
- **Corrections:** use the same score entry screen. Every change is logged.

## Rules defaults (until the organiser confirms)

1. Anyone in the group can enter scores. In the shared version, a phone sees another phone's entry live, and conflicting saves are flagged rather than overwritten.
2. Every hole is recorded. A decided nine shows "won 3 & 2", and the overall match continues.
3. Handicap allowance is 95% of the WHS course handicap, rounded once. Editable and logged.
4. No countback rule is invented. Ties are shown as ties.
5. Picked up counts as 0 Stableford points. Any score worse than par + 4 is entered as a pick-up.
6. Self-contained hosted app: one link, no player accounts, organiser PIN.

## Data

- **Course:** Cabopino Golf Marbella, yellow tees. Par, stroke index and distances come from published scorecards. The distances are metres, shown as yards, and Golfshot readings on holes 1 to 3 agree with them.
- **Players and scores:** demo data, clearly labelled, until the real data is provided.

## Contest icons (chosen 15 October 2026, not built yet)

Draw them the same way as the Stats tab medals (built 15 October): champagne line icon (an award on pine; flag-yellow was retired on 21 October 2026), stroke 1.9, no fills, on a pine circle. The pictures below were chosen in a two-tone mock; keep the shapes and drop the fills.

- **Longest drive: "Ball on fire"** (option E), green ring #1B7A43. SVG (24 grid, stroke #1D3B30, width 1.6):
  `<path d="M14.5 7.6C11 6 7.5 6.6 2.5 4.5c1.6 2.6 3.4 3.6 5.2 4.1-2.2.4-4 .2-5.7-.2 1.9 2.4 4.4 3.4 7 3.7-1.8 1-3.6 1.6-5.6 1.7 3 1.8 7 2 11.3.4z" fill="#FFB27A"/><path d="M14.5 9.2C12 8.4 9.8 8.6 7 8c1.3 1.4 2.8 2.1 4.3 2.4-1.4.6-2.6.9-4 1 2.4.9 4.7.9 7.2.1z" fill="#F0C63F" stroke="none"/><circle cx="17" cy="10.5" r="4.5" fill="#fff"/><path d="M15 8.7a2.8 2.8 0 0 1 2.4-1" stroke-width="1.3"/>`
- **Nearest the pin: "Ball by the pin"** (option A), gold ring #E3B21C. SVG:
  `<path d="M2.5 18.5c0-2 4.3-3.2 9.5-3.2s9.5 1.2 9.5 3.2-4.3 2.5-9.5 2.5-9.5-.5-9.5-2.5z" fill="#8FD1A8"/><path d="M12 18.2V3.5"/><path d="M12 3.8h6.5l-2 2.5 2 2.5H12z" fill="#F0C63F"/><ellipse cx="12" cy="18.2" rx="1.8" ry=".7" fill="#1D3B30"/><circle cx="16.8" cy="17.6" r="1.3" fill="#fff"/>`
- Use them next to each contest on the Contests tab and on the hole screen's contest tag.
