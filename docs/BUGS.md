# Bug list from the full break-test (October 2026)

Every bug has a regression test, so it cannot quietly come back.

| # | Severity | Bug | Fix | Test |
|---|----------|-----|-----|------|
| 1 | **Critical** | On a slow server, a score just entered vanished from the screen for a few seconds while the server confirmed it (it was in neither the outbox nor the server copy). | `DB.sent` overlay keeps a sent score visible until the server has confirmed it. | `phones.run.js` 6b (failed on old code: "blank for 12 checks") |
| 2 | High | The server accepted nonsense holes, strokes, players and groups (hole 99, strokes -5, a player not in the group). | `saveHole` validates all of them. | `server.test.js`, `fuzz.server.test.js` |
| 3 | High | `force` overwrote a score without the organiser PIN. | `force` is honoured only with a correct PIN. | `server.test.js` |
| 4 | High | A phone could write log entries "by Organiser", or rewrite existing log entries. | Log is insert-only; `by: Organiser` becomes `Player` without a PIN. | `server.test.js` |
| 5 | High | No limits on the size or number of rows sent to the server. | `MAX_CELL` 40,000 characters, `MAX_ROWS` 400 per request. | `fuzz.server.test.js` |
| 6 | High | The PIN could be guessed without limit. | Lockout after 10 wrong tries in 10 minutes; the app shows a clear message. | `server.test.js`, `organiser.run.js` |
| 7 | Medium | The app drew a blank or crashed when a screen's round, group or player no longer existed (for example deleted on another phone). | Render safety net steps back with a short message. | `break.ui.run.js` |
| 8 | Medium | `addMinutes` gave garbage for hours over 23, minutes over 59, negative steps and non-numbers; tee-time interval of 0 or blank. | Validated; falls back to 8 minutes. | `fuzz.engine.test.js` |
| 9 | Low | A handicap could show as "-0". | Normalised. | `fuzz.engine.test.js` |
| 10 | Low | "Who are you?" button was 34px high, too small for a thumb. | 44px. | `break.ui.run.js` (touch targets) |

## Still the organiser's to do
- Change the PIN in Organiser, Settings (the app shows a red banner while it is 1234). The PIN is never put in this public repository.
- Upload the new `server.js` to Drive, paste the new `bootstrap.gs`, run `installBackup` once. Until then the app shows "server is out of date" and backup/restore say "Unknown request".

## Not testable from here
Real iPhone behaviour, the offline app shell (needs https), Ruling (excluded by the organiser). See `docs/TEST-PLAN.md` for the manual checklist.
