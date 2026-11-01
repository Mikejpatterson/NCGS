# Stress test of the day's flows: 1 November 2026

Independent reviewer. App at `main` `60cb604` (before #71 and #72), invented fixture data only.

**What the owner asked for.** Test the day the way people will use it: one scorer per group, everyone else looking. Look for screens that get stuck, dead ends, buttons that do nothing, and anything that isn't immediately obvious. The test is "would anyone message Mike that something's wrong?", not only "can a score be lost?".

## What was run

| Run | Situations | Taps | Result |
|---|---|---|---|
| Tap-every-button crawl (`test/crawl.run.js`, corrected; see below) | new phone, known player, organiser, scorer late in a round | ≈1,400 | No real dead ends or dead buttons |
| Same crawl from awkward starting points (`tools/stress-crawl.js`) | round today with no groups; draw pots with one or two names; phone set to someone not playing; everything finished; course with no card; new season; organiser view of several | ≈2,700 | No dead ends, no screen crashes, no script errors, no `undefined`/`NaN` on screen |
| Spectator check | player in a group who isn't scoring; phone not playing; brand-new phone, all during a live round | — | One important finding (1) |

**Every flag the crawler raised was checked by hand before being counted.** The original crawler was mostly noise:
- it didn't count the tab bar's **Home** as a way out, so every screen during a live round looked like a dead end;
- it counted tapping an already-selected tab, or a button it had lost track of, as "did nothing".

That noise is probably why it never ran in CI. `tools/stress-crawl.js` fixes the first problem and adds the awkward starting points.

## Findings, worst first ("would someone message Mike?")

**1. The app doesn't know who the scorer is. High; needs the owner's decision.**
Every player in a group who taps **Hole**, or "Continue · Hole N" on Home, lands on the score-entry screen with + and − buttons and Save. On a contest hole, every phone in the group pops up the "Nearest the pin, Let's play" card. With one scorer per group, three other people are one curious tap from entering scores. A second save gives "Saved on two phones" warnings. The scores themselves are safe, because the first save is kept, but the warnings are exactly what turns into "Mike, something's wrong".
*Recommendation (A):* the first time a phone opens Hole in a round, it asks **"Are you keeping the score for this group?"**
- **Yes** → the scoring screen as now.
- **No** → a read-only view of the group: the live card, Buggy Wars and the leaderboard, with a small "I'm keeping score" link to switch.

It's stored on the phone only, with no server change. The contest card shows only on the scorer's phone.
*Alternative (B):* the organiser names a scorer for each group in Groups. That's more setup on the morning, and still fails if that phone dies.

**2. Breakfast-draw setup is confusing. Medium.**
- (a) The round page says the draw is **"Under way"** when nobody has been drawn: one or two names in the pots counted as started. **#72 fixes this** (checked: `started` goes from `true` to `false` for `[['sean'],['colin']]`). It's waiting for the owner to merge.
- (b) For a round with pots, the setup checklist's **"Players and groups"** opens the ordinary Groups screen showing **"Tick who's playing… Playing · 0"**, although players are already in the pots. There are two routes to groups, and the checklist sends the organiser down the wrong one. *Fix:* for a round with pots, point that row at the breakfast draw, and say "N in the pots".

**3. Screen crashes are hidden. Medium.**
When a screen fails to draw, `render()` (`90-main.js:562-575`) shows "That screen is not available any more" and steps back. That's better than a frozen screen, but nobody learns what broke: the record (`DB.faultLog`) stays on that phone. One appears in Codex's own screenshot sheet (`sheet-5.jpg`, the organiser contest frame).
*Fix:* also write a short note to the change log, with the screen name and the error and no personal data. The building session then sees it the same day, and the owner never has to collect a description from a player. Change the message to "Something went wrong on that screen. It has been noted."

**4. The contest card can only be closed with "Let's play". Low.**
Tapping outside it does nothing. A spectator who only wanted to look has to press "Let's play". This goes away with 1A. Otherwise, let a tap outside close it.

**5. The crawler should run on every change. Process.**
- Adopt `tools/stress-crawl.js` as `test/crawl.run.js`, and run it in CI with the awkward starting points.
- It takes about 40 minutes for all of them, so run it as its own parallel job, or at least on every PR that touches `src/app/`.
- Once it's in, a dead button or dead end can't reach the owner unnoticed.

## Not covered by this run

- **Real iPhones.** Chromium can only imitate Safari. A 10-minute run-through on a real iPhone after each batch of changes remains necessary.
- **Whether the words are clear to a golfer.** The crawl proves every button does *something*, not that people understand it. Point 1 came from looking at the screens, not from the crawler.
- **Signal dropping on a real phone.** That's covered by the multi-phone suites on the dev server, not by this crawl.
