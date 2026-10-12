# NCGS test plan

Run everything: `sh tools/check.sh` (builds, starts its own servers, runs every suite).
Before every push: `node --test test/engine.test.js test/server.test.js`.

## Automated

| Area | What is covered | File |
|------|-----------------|------|
| Scoring engine | WHS handicap, allowance, Stableford, pick-up, countback, Golfer of the Year ties, round stats (comeback, fade, streaks) | `engine.test.js` |
| Engine abuse | Random and hostile inputs to every engine function (NaN, negatives, blanks, huge numbers) | `fuzz.engine.test.js` |
| Server rules | Saving holes, versions, conflicts, `since`, tombstones, PIN, lockout, backup, restore, log | `server.test.js` |
| Server abuse | Random garbage requests, oversized cells and rows, wrong types, forged organiser claims | `fuzz.server.test.js` |
| Several phones | Two to four simulated phones scoring the same group; server down, slow, dropping replies; score never lost or blanked | `phones.run.js` (dev server, port 8766) |
| Every screen | Empty database, odd rounds (no date, no group, one player, no course), bogus ids, hostile forms, long names, emoji | `break.ui.run.js` |
| Time zones | Dublin, Los Angeles, Auckland, Kolkata, UTC | `break.ui.run.js` |
| Screen sizes | 320, 375, 414, 768, 1280 px, nothing off the side; 150% text | `break.ui.run.js`, `largetext.run.js` |
| Touch targets | Every button at least 40px | `break.ui.run.js` |
| Speed | Main screens with 25 extra rounds | `break.ui.run.js` |
| Features | Testing mode, start hole, stats and player stats, backup/restore, organiser actions, guests, late changes, course snapshot, speech | the other `*.run.js` files |

## Manual, on a real phone (cannot be tested here)
1. Install to the home screen on iPhone and Android; open in aeroplane mode: the app should still open.
2. Score a hole with no signal, walk into signal, check it reaches the other phones.
3. Microphone permission and dictation (iOS Safari).
4. iOS back swipe from the left edge on every screen.
5. Rotate the phone mid-round; lock and unlock.
6. Bright sunlight: green header and yellow accent readable.
7. Two real phones scoring one group at the same time.
8. After uploading the new server: banner "server is out of date" disappears; Backup now works and a copy appears in the Drive folder "NCGS backups".
9. After changing the PIN: old PIN refused, new one accepted.
10. Ruling (once set up).
