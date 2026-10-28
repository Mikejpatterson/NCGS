# NCGS structural review

Independent review, 27 October 2026, of `main` at `54108b8`. It covers the whole codebase, not only recent changes. I changed no application code, tests or workflows. Only the invented fixture data was used; the real data was not fetched.

## Status update, 28 October 2026

All the fixes below are merged into `main` (`3909939`). The server side went live on the owner's Apps Script setup on 28 October: Drive file replaced, server fingerprint `5d110ed7`, and the "server is out of date" banner has gone.

| Fix | Findings | PR | Status |
|---|---|---|---|
| 1. The app opens from its saved copy after 2 s | H3 | #50 | Live. Measured 20.1 s → 2.1 s |
| 2. No Script Properties read on a poll; small server file | H4, M1 | #51 | Live. The rehearsal against a copy is still to do (see below) |
| 3. Refused and clashing scores kept and shown | H1, M2, M3 | #52 | Live |
| 4. Round delete takes its settings; scores need confirming; VER cache re-put | H2, M4 (part) | #53 | Live |
| 5. CI on every PR, whole-day test, stale tests fixed | M6, M7, T1, B3 test | #54 | Live |
| 6. Starting data loads only from setup | **H5** (below) | #55 | Live |

**Still open:**
- the 20-phone rehearsal against a copy of the updated setup (`docs/review/REHEARSAL-COPY.md`);
- Testing mode switched off before Athenry (M4, owner step);
- the follow-ups agreed on #52 (a "dealt with" action for refused scores, plainer wording, the `rejected` view in the layout suite);
- L1–L7.

**H5. The starting-data request needed no PIN.** High. VERIFIED on the memory store, never on the live server. Fixed in #55 and live since 28 October 2026.
I missed this in the original review and found it on 27 October while planning the rehearsal.
- **The problem:** `ops.seed` (`server.js:578-591` at `54108b8`) had no PIN check. With `force: true` it wrote any rows to any table, skipping row validation, conflict checks and the final-round rule. The web app's address is in the public `site/index.html`, so anyone who read the code could have changed scores, members or rounds.
- **The fix:** the Apps Script entry point now refuses that request outright. Starting data loads only from `setup()` inside Apps Script, and loading over existing data also needs the organiser PIN.
- **Owner check:** an unexpected "Data loaded" entry in the change log would be the only sign the gap was ever used.

**L8 (new, low).** `photoPut` needs no PIN, so anyone with the address could fill the Drive photo folder. Agreed to handle later.

---

## Part A: for the owner

**Verdict: fit for Athenry, if four things are done first.** This is not the fragile, thrown-together code you were warned about. The most important part, getting a score from a phone into the Google Sheet without losing it, is carefully designed and well tested. A score typed with no signal is stored on the phone and sent later. If two phones save the same hole, the second is flagged rather than overwriting the first. A score sent twice is only saved once. I ran the multi-phone tests (no signal, server down, server slow, phone restarted, two phones clashing, Save tapped three times) and every one passed. The scoring rules match what you set down: handicaps, Stableford, countback and Golfer of the Year ties.

The risks are mostly around the edges: how the app behaves on weak signal, Google's daily limits, and a few organiser actions that could quietly do the wrong thing.

**Top risks, worst first**

*Could lose or corrupt scores*
1. **Scores that arrive after you finalise are hidden.** If a phone without signal sends a late score or correction after you press Finalise, it is refused. That is correct, but the refused score is then stored out of sight on that phone. Nobody, including you, can see it.
2. **A deleted round can pass its settings on to a new one.** If you delete a test round and create a new round at the same course on the same date, the new round inherits the old one's settings. That includes "player withdrew", which fills in pick-ups automatically on that player's remaining holes. I reproduced this.
3. **Testing mode is on unless someone switched it off.** While it is on, a live round and all its scores can be deleted with two taps.
4. **A clash warning disappears if the phone restarts.** The other phone's score is kept, but this phone's version is quietly dropped.

*Could fail on the day*
5. **The app is slow to open on weak signal.** Even when the phone already has the app saved, it waits for the internet before opening. In my test it took 20 seconds on a slow connection, and it can take longer on a really poor one.
6. **Google's daily limit.** On a personal Gmail account, Google allows 50,000 reads of the script's settings a day. Every phone checks for new scores every 15 seconds, and each check uses 2 of those reads. With 20 phones open for the whole day the count gets close to the limit. If it is reached, every phone shows "no signal" until the next day. Scores stay safe on the phones, but nothing syncs and the round can't be finalised.
7. **The server is slower than it needs to be.** It probably reloads its own program from Google Drive on every request, because the program is too big for Google's short-term memory store.

*Makes future changes harder or riskier*
8. Newer features keep their data as loose entries in the general settings table, with nothing that cleans them up.
9. The automatic checks on GitHub only run the quick rule tests. The phone tests never run automatically, although they can run on the invented data. Two of them have already gone out of date without anyone noticing.
10. A few very large files, and repeated copies of the same logic.

**What I'd fix before March**

| Fix | Rough effort |
|---|---|
| 1. Open the saved copy of the app straight away and check for updates in the background. | 2 to 3 hours, plus a test |
| 2. Remove the two settings reads from every request and keep the server program small enough to stay in memory. Then rehearse: 20 simulated phones for two hours against a copy of the real setup. | 1 day, including the rehearsal |
| 3. Show any refused or clashing score on the phone and on the organiser screen until someone deals with it, and keep it if the phone restarts. | 1 day |
| 4. When a round is deleted, delete its settings too. Before Athenry, check in Settings that Testing mode is off. | Half a day; the check takes 1 minute |
| 5. Run the phone tests and a full round from first score to Finalise automatically on every change, using the invented data. | Half a day |

Paper cards are the fallback if Google's service is down. The app already checks photos of paper cards, so the day can still finish if the service fails.

---

## Part B: for the developers

Severity: **High** = could lose, corrupt or block scores on the day. **Medium** = likely friction or a narrower data risk. **Low** = hygiene.
Evidence status: **VERIFIED** = reproduced or traced end to end. **SUSPECTED** = plausible, not proven.

### B0. Test results (run on this review, 27 October 2026, Node 22.22.0)

| Command | Result |
|---|---|
| `node --test test/engine.test.js test/server.test.js` | 59/59 pass |
| `node --test test/*.test.js` | 144/144 pass |
| `python3 -m unittest discover -s test -p '*_test.py'` | 24/24 pass |
| `NCGS_FIXTURE=1 node build.js` | builds (668 KB preview) |
| Browser suites `test/*.run.js` against the fixture preview (excluding `crawl` and `design`, which `check.sh` also skips) | **25 of 27 pass.** `organiser.run.js` and `ui.run.js` fail (2 of 91 checks); see T1 |
| `layout.run.js` (360, 390 and 135% text, every golfer screen) | pass |
| `phones.run.js`, `scramble-phones.run.js`, `draw-phones.run.js`, run against `tools/devserver.js`, with the **fixture copied in as `data/seed.json` in a scratch copy outside the repo** | 28/28, 14/14, 28/28 pass |

**T1. Two browser suites are out of date, and nothing noticed.** VERIFIED.
- `ui.run.js:361` expects finalise to say "cards open". That text appears nowhere in `src/app/`: `finaliseBlockers()` (`40-org.js:69-80`) only reports groups still playing and contests to confirm. This check cannot pass against the current code with any data.
- `ui.run.js:369` (change log wording): SUSPECTED to have the same drift.
- `organiser.run.js:26` taps `[data-act="org-go"][data-v="late"]`. No element in `src/app/` has that, so the "Change a player" screen (`ORG.late`, `40-org.js:302-318`, with handlers at `90-main.js:301-315`) can no longer be reached from the app. It became dead code when the Groups screens were merged; `layout2.run.js` still reaches it only by pushing it onto the stack directly.

Neither suite runs in CI (M6), which is how both went stale.

### B1. Score path: what is sound (VERIFIED)

The path is phone → `saveHole()` (`src/app/30-play.js:270`) → `send()` → outbox in localStorage (`src/app/10-data.js:197-202`) → `flush()` in order, one at a time (`10-data.js:160-195`) → `ops.saveHole` under `LockService.getScriptLock()` (`src/server.js:184-188`, `316-395`).

- **Two phones, same hole.** Each player's score carries the `base` the phone saw when the draft opened (`30-play.js:145`, `289`). The server refuses to change a score whose current value differs from `base` and returns a conflict (`server.js:347-349`). Reproduction 2: the second phone gets 4 conflicts and the first phone's scores are kept.
- **Retries and duplicates.** A timed-out request that committed on the server is a no-op on retry, because `cur === want` (`server.js:346`; reproduction 2b, `changed: 0`). `put` is an upsert by key, and player log rows are de-duplicated by id (`server.js:405-411`). A triple-tap on Save writes once (`phones.run.js` check 6).
- **Offline.** The outbox is saved before any network call. Only network errors and `server` errors are retried (`10-data.js:155`, `169-175`). Unsent saves survive a reload (`phones.run.js` check 3). A failed localStorage write is surfaced as "This phone is not saving" (`10-data.js:30`, `30-play.js:118`).
- **Sync ordering.** The version number is published only after its rows are written (`server.js:244-246`). `since` reads the version first and the tables second, so a poll can repeat rows but never skip them (`server.js:287-298`). Deletions use tombstones that lose to newer re-creations (`10-data.js:117-123`), and there is a test for this.
- **Locking.** Every write op takes the script lock. `waitLock(20000)` throws on timeout, the error becomes `server`, and the client retries. Good.
- **Clocks and time zones.** Contest order comes from tee times and the server's `at`, not phone clocks (`engine.js:763-772`). "Today" uses the local calendar and `Math.round` over days, so it is DST-safe (`00-core.js:59-66`). The Apps Script daily rules-checker cap uses the server's UTC date, which is harmless.
- **Sheet size.** At about 7 columns per score row, the 10M-cell limit is about 1M score rows. A season is a few thousand. Not a concern.

### B2. Findings

#### High

**H1. Refused saves are kept where nobody can see them.** VERIFIED.
`flush()` moves a non-retryable failure (`final`, `missing`, `notlive`, `bad`) into `DB.prefs.rejected` (`10-data.js:156-159`, `182`). `rejected` is never read anywhere else in `src/app/`; I checked with grep. The only signal is a toast, which is missed if the app is in a pocket when the queue drains. `pin` failures are not even kept: the comment at `10-data.js:154` says they are, but line 182 skips them. Finalise is blocked only on the organiser's *view* of hole completion (`40-org.js:69-80`), not on card checks or on other phones' outboxes. So corrections made offline during the card check can arrive after Finalise and be refused (reproduction 3; `phones.run.js` check 7 proves the score is "kept" but not shown).
*Remedy:* show an "N changes not saved" row on Home and the Hole tab, with the detail and a "send to organiser" or "discard" action. Add a count to the organiser's round screen, for example a `rejected` log row written by the phone through the player-writable `log` table. Keep `pin` failures too.

**H2. A deleted round's settings rows survive and attach to a re-created round with the same id.** VERIFIED (reproduction 1).
Round ids are deterministic: `${season}-${slug(course)}-${date}` (`90-main.js:357-358`). The `-suffix` is added only while the old round still exists. `ops.remove` for `rounds` cascades to scores, claims, winners, checks and cards, but not `settings` (`server.js:430-438`). The settings table holds round state: `wd:<rid>:<pid>` (`44-groups.js:8`, `151`), `format:<rid>`, `teamshots:<rid>` (`10-data.js:300-301`), `pots:`, `draw:`, `drawdev:`, `drawepoch:` and `drawshort:` (`42-draw.js:226-296`). A stale `wd:` row makes the entry screen auto-fill and save `P` for that player from the withdrawal hole (`30-play.js:222-223`). A stale `format:` row turns an individual round into a scramble.
*Remedy:* include settings keys containing `:<rid>:` or ending `:<rid>` in the server cascade, and tombstone them. Better, give new rounds a non-reusable id, for example by always appending a short random suffix.

**H3. The service worker is network-first with no timeout, so the app opens only as fast as the network.** VERIFIED.
`build.js:87-91`: every same-origin GET waits for `fetch()` and falls back to the cache only when the fetch *fails*. A slow but alive connection, typical on a course, never fails quickly. Test: a fixture "live" build served locally; the page loaded once so the service worker controls it and holds a cached copy; then `index.html` was answered after a 20 s delay. Result: **20.1 s to open the app**, although a full cached copy was available. The page is a single 594 KB HTML file, so a slow 3G connection also means a slow download.
*Remedy:* for navigations, serve from cache and update the cache in the background (stale-while-revalidate), or race the network against a 2 to 3 s timeout. The existing pull-to-refresh version check (`90-main.js:701-704`) already covers picking up new releases.

**H4. Script Properties quota: two property reads on every request.** SUSPECTED, because the quota is confirmed but the usage is estimated.
Every HTTP request calls `ensureReady()` → `props.getProperty('READY')` (`server.js:624`) and `spreadsheet()` → `props.getProperty('SHEET')` (`server.js:612`). Writes add `getVer` and `setVer`. Google's consumer limit is **50,000 property reads and writes per day per user**, plus 30 simultaneous executions ([Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)). The owner's account is a gmail.com account, so I assume the script runs under consumer quotas. Polling runs every 15 s per visible phone during a live round (`90-main.js:643-648`). That is about 480 reads per phone-hour, so roughly 100 phone-hours of open screens exhausts the day's quota. 20 golfers × 5 h with screens on is right at that line. Hidden screens don't poll, which helps. When the quota runs out, `ensureReady` throws outside `api()`'s try/catch, Apps Script returns an HTML error, and every phone goes "offline" for the rest of the day. Scores stay safe in outboxes, but nothing syncs and nothing can be finalised.
*Remedy:* keep the sheet id in the code or in CacheService, check `READY` only in `setup()`, and keep `VER` cache-first as `since` already does. Then rehearse load: 20 headless phones polling for 2 h against a *copy* of the deployment.

#### Medium

**M1. The server program is probably reloaded from Drive on every request.** SUSPECTED (strong).
`tools/bootstrap.gs` caches the server source with `CacheService.put('src', s, 300)` inside `try{}catch{}`. CacheService values are limited to 100 KB. `dist/server.js` is `server.js` plus the whole seed: **87 KB built from the 13-member, 3-round fixture**. The real 2026 seed is larger, so the put almost certainly fails silently. Every request then does `DriveApp.getFileById().getBlob()` and compiles the whole program plus the season's seed with `new Function`. The result is extra latency on every poll and save, and more time holding the lock.
*Remedy:* don't embed the seed in the per-request source. It is needed only by `setup()`, so ship it separately. Alternatively, paste `server.js` into the Apps Script project directly.

**M2. Clash notices live only in memory.** VERIFIED.
`DB.conflicts` (`10-data.js:18`, `185`) is never persisted, and `saveHole()` clears the draft as it sends (`30-play.js:297-298`). If the phone reloads or iOS evicts the page before the user taps the conflict row, this phone's entry is gone. The server keeps the first phone's score, so this is not an overwrite, but one person's input is dropped silently.
*Remedy:* persist conflicts in `prefs` beside `drafts`.

**M3. A stuck queue looks like "Sending…" forever.** VERIFIED (code trace).
On a `server` error `flush()` sets `DB.online = !!resp`, which is `true` (`10-data.js:170`), so `saveWarning()` shows nothing (`30-play.js:119`). The queue is strictly first-in-first-out, so one item that keeps failing with a `server` error blocks every later save. For example, `put` on a sheet that has hit a Google error. The only visible sign is the after-card chip "Sending…" (`30-play.js:437`).
*Remedy:* after N retries, show "Not reaching the server · N waiting". Consider skipping a poisoned item after N attempts into the visible rejected list from H1.

**M4. Testing mode defaults to on, and in that mode a live round with scores can be deleted.** VERIFIED (code).
`D.testing()` returns true unless the setting is `'0'` (`10-data.js:253`). Delete is offered on any round when it is on (`40-org.js:134`), and the confirmation is a second tap (`90-main.js:265-268`). The server cascades the delete to scores. Restore from an export is the only way back. I did not check the live setting; the owner should.
*Remedy:* refuse to delete a round with scores server-side unless an explicit flag is set, or require typing the round name. Default the setting to off.

**M5. Organiser round edits write the whole row from the phone's copy (last writer wins).** VERIFIED (reproduction 4).
Every round change is `put('rounds', [Object.assign({}, r, …)])` (`40-org.js:202`, `44-groups.js:35`, `110`, `90-main.js:235-262`, `307`, `315`, `366`). An edit made from a copy taken before the first score was saved (`status: 'upcoming'`) writes `upcoming` back over `live`. The next score flips it back, but meanwhile phones treat the round as not live: polling drops to 60 s and Home changes. Two organiser devices can overwrite each other's group edits.
*Remedy:* make `put` for rounds merge only the fields being changed, or never let `put` move status backwards from `live` or `final` except through an explicit reopen op.

**M6. No CI for anything beyond unit tests on `main`.** VERIFIED.
`.github/workflows/site.yml:21` runs `node --test test/*.test.js`, then deploys the committed `site/`. The browser, layout and multi-phone suites run only by hand (`tools/check.sh:7` skips them without the real `data/seed.json`). Nothing in CI proves that `site/` was rebuilt from the current `src/`; I checked by hand and today it matches. The multi-phone suites **run green on the fixture** (B0), so the "needs real data" barrier is avoidable.
*Remedy:* add a fixture "live" build target (`NCGS_FIXTURE=1` producing `dist/site` with an empty api), and run `phones`, `scramble-phones`, `finish` and `layout` in CI on every PR. Add a CI step that rebuilds the app part of `site/index.html` and diffs it against the committed copy, ignoring the stamped version and api.

**M7. No end-to-end test of a whole day.** VERIFIED (gap).
`finish.run.js` plays one group on the in-browser server. `phones.run.js` plays a few holes. No test plays every group through 18 holes over HTTP and then finalises, checking results, KBs, contests and Golfer of the Year.
*Remedy:* one scripted test on `devserver.js` with 3 groups, all 18 holes, two phones per group, one outage, finalise, then assert the leaderboard and Golfer of the Year against hand-computed values.

#### Low

- **L1. The server accepts a save with no `base` as a blind overwrite.** VERIFIED (reproduction 2c; `server.js:347`). Every current client path sends `base`, so this is defence-in-depth only. *Remedy:* treat a missing `base` as `null`.
- **L2. A stale organiser PIN locks the PIN for everyone.** VERIFIED (reproduction 5). Organiser-mode saves send `ORGPIN.pin` (`30-play.js:299`). `pinOk` counts each wrong PIN (`server.js:252-258`), so 10 saves with an old PIN lock it for 10 minutes. Scoring itself continues.
- **L3. Restore brings back deliberately cleared scores and deleted rounds.** VERIFIED (reproduction 6; `server.js:468-493` ignores the `deleted` table). This is documented as "puts back anything missing", but an organiser recovering one thing may be surprised. *Remedy:* skip keys whose tombstone is newer than the export's `ver`.
- **L4. Handicaps aren't frozen until Finalise** (`90-main.js:256`). Editing a member's index mid-round changes live points for that round. This is a design choice; it should be documented.
- **L5. Dead code.** VERIFIED. Server `force` (`server.js:347`) is never sent by the app. The `folder();` rewrite in `bootstrap.gs` matches nothing in `server.js`. `design-ci.yml:38` still sets `NCGS_DESIGN=editorial`, which `build.js` no longer reads, so the "two looks" comparison compares two identical builds. The "Change a player" screen can't be reached (T1).
- **L6. Each pull-to-refresh caches a new `sw.js?<timestamp>` entry** (`90-main.js:703` through `build.js:90`). Tiny files, cleared on the next release.
- **L7. The phone keeps every row of every season** in one localStorage key, `ncgs-cache-v1`, and `saveCache` ignores failure (`10-data.js:33`). It's fine for years at this size. If it ever fails, the phone just re-fetches.

### B3. Scoring (`src/engine.js`) against CLAUDE.md: sound

| Rule | Where | Status |
|---|---|---|
| WHS: course handicap unrounded, allowance applied, one rounding | `engine.js:25-35` | Correct. |
| 100% allowance by default | `10-data.js:251` | Correct. |
| Shots by stroke index, including over 18 and plus handicaps (given back from SI 18) | `engine.js:42-47` | Correct. |
| Stableford `max(0, par + shots − gross + 2)`, pick-up 0 | `engine.js:56-60` | Correct. |
| Countback: back 9, 6, 3, then 18 → 1 on physical holes | `engine.js:530-536` | Correct, and as specified for groups starting on 10. |
| Imported rounds keep recorded order | `10-data.js:344-355` | Correct. |
| Golfer of the Year: best N, ties on counting scores best to worst, then the 4th best… | `engine.js:626-644` | Correct; a missing round counts as −1. |
| Scramble: one team score, double entries flagged not guessed, minimum drives | `engine.js:587-624` | Correct and tested. |

The live leaderboard deliberately shows ties ("T3") and applies countback only when the round is final (`10-data.js:365`). That is consistent with "do not invent tie-breaks". The engine is pure, with no screen or storage code, and well covered.

One test is hollow: `test/fuzz.engine.test.js:88`, `assert.ok(E.compareKeys(k(c), k(d)) !== 0 || true)`, always passes. The case it sets up (equal back 9, `d` better on back 6) should assert `compareKeys(k(d), k(c)) < 0`.

### B4. Maintainability

- **The data model has drifted into the settings table.** VERIFIED. About ten key families (`format:`, `teamshots:`, `tripboard:`, `wd:`, `pots:`, `draw:…:<device>`, `drawdev:`, `drawepoch:`, `drawshort:`, `drawpace:`) hold round-scoped state. The comment at `10-data.js:297` gives the reason: "so no server change is needed". Consequences: no cascade (H2), no validation, `draw:` writes one row per device per pick, and the meaning lives in string formats spread over four files. *Remedy:* move round-scoped state onto the round row (`rounds` already has JSON columns), or add a `round_meta` table keyed `(round, key)` that the round delete cascades to.
- **Global mutable state.** VERIFIED. `UI` has 47 distinct fields and `DB.prefs` has 9, mutated from every file. `90-main.js` holds one `ACT` object with about 119 handlers. Rendering is string templates rebuilt whole on each `render()`. For a single-developer app this is workable, but it makes "what changed this?" hard to answer.
- **Display mixed with logic.** `resultsOf()` builds contest rows twice (`10-data.js:357` and `368`). `phOf` is copied three times (`20-society.js:421`, `632`, `660`). Finalise logic and validation sit in click handlers (`90-main.js:250-259`).
- **File size.** `30-play.js` (1,013 lines), `20-society.js` (849), `90-main.js` (724), `styles.css` (2,124). These are big but cohesive. Splitting is worth doing only alongside real changes.
- **Repository sprawl.** 11 workflows, mostly agent automation; 76 remote branches, 22 of them stale `agent/run-*`; about 30 process documents. Not a risk to the app, but it raises the cost of finding what's current.
- **What is good.** One `server.js` runs in three places (Sheet, in-browser preview and tests), so the tests exercise the real rules. `engine.js` is pure. Comments say *why*. Output is escaped consistently (`esc()` throughout; rules-checker markup is escaped before `**bold**` is applied, `35-rules.js:13`).

### B5. Testing: what is guaranteed and what only looks covered

- **Guaranteed:** server validation, conflicts, tombstones, version ordering, PIN lockout and restore (`server.test.js`, `fuzz.server.test.js`), all against both the memory store and a fake Sheet. Engine rules (`engine.test.js`, `fuzz.engine.test.js`). Multi-phone behaviour through a real HTTP server (`phones.run.js`), which passes on fixture data.
- **Only appears covered:**
  - Locking: `fakeLock` is a no-op (`server.test.js:36`), so contention and `waitLock` timeouts are untested.
  - Apps Script quotas, latency and the `bootstrap.gs` loader are not exercised anywhere.
  - The countback test line in B3 asserts nothing.
  - The design comparison runs on identical builds (L5).
  - Two browser suites assert text or links that no longer exist (T1).
- **Needs unavailable data:** `tools/check.sh` skips every screen test without `data/seed.json`. Fixable (M6).

### Appendix: reproduction script

Run from the repo root: `node <file>`. It uses only `src/server.js` and `data/fixture-seed.json`.

```js
const N = require('./src/server.js');
const seed = require('./data/fixture-seed.json');
const fresh = () => { const st = N.memoryStore(); const s = N.createServer(st); s.api({ op: 'seed', data: seed }); return { st, s }; };
const pin = '1234', R = () => JSON.parse(JSON.stringify(seed.rounds.find(x => x.id === 'fx-r3')));
const all = (p, v) => Object.fromEntries(p.map(x => [x, { v, base: null }]));
// 1 settings survive a round delete and attach to a re-created round
{ const { s, st } = fresh(); const r = R();
  s.api({ op: 'put', table: 'settings', pin, rows: [{ key: 'wd:fx-r3:sean', value: '1' }, { key: 'format:fx-r3', value: 'scramble' }] });
  s.api({ op: 'remove', table: 'rounds', pin, rows: [{ id: 'fx-r3' }] }); s.api({ op: 'put', table: 'rounds', pin, rows: [r] });
  console.log(1, st.read('settings').filter(x => /fx-r3/.test(x.key)).map(x => x.key)); }
// 2 clash, 2b idempotent retry, 2c no-base overwrite
{ const { s, st } = fresh(); const r = R(), g = r.groups[0], p = g.teams.flat();
  s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 1, scores: all(p, 4) });
  console.log(2, s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 1, scores: all(p, 5) }).conflicts.length);
  console.log('2b', s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 1, scores: all(p, 4) }).changed);
  s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 1, scores: { [p[0]]: { v: 9 } } });
  console.log('2c', st.read('scores').find(x => x.round === r.id && x.hole === 1 && x.player === p[0]).strokes); }
// 3 late correction after finalise; 4 stale whole-row round edit; 5 stale PIN; 6 restore resurrects a cleared score
{ const { s, st } = fresh(); const r = R(), g = r.groups[0], p = g.teams.flat();
  s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 1, scores: all(p, 4) });
  s.api({ op: 'put', table: 'rounds', pin, rows: [Object.assign(R(), { first_tee: '10:30' })] });
  console.log(4, st.read('rounds').find(x => x.id === r.id).status);
  s.api({ op: 'put', table: 'rounds', pin, rows: [Object.assign(R(), { status: 'final' })] });
  console.log(3, s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 1, scores: { [p[0]]: { v: 5, base: 4 } } }).error); }
{ const { s } = fresh(); const r = R(), g = r.groups[0], p = g.teams.flat();
  for (let h = 1; h <= 10; h++) s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: h, pin: '9999', scores: all(p, 4) });
  console.log(5, s.api({ op: 'checkPin', pin })); }
{ const { s, st } = fresh(); const r = R(), g = r.groups[0], p = g.teams.flat();
  s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 2, scores: { [p[0]]: { v: 6, base: null } } });
  const exp = JSON.parse(JSON.stringify(s.api({ op: 'load' })));
  s.api({ op: 'saveHole', round: r.id, grp: g.id, hole: 2, scores: { [p[0]]: { v: null, base: 6 } } });
  s.api({ op: 'restore', pin, data: exp });
  console.log(6, st.read('scores').filter(x => x.round === r.id && x.hole === 2).map(x => x.strokes)); }
```

Observed: `1 ['wd:fx-r3:sean','format:fx-r3']` · `2 4` · `2b 0` · `2c 9` · `4 upcoming` · `3 final` · `5 { ok: false, locked: true }` · `6 [6]`.
