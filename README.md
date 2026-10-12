# NCGS

The society app: rounds, scorecards, Stableford, KBs and Golfer of the Year, for phones.

- `site/` is the live app (built output, published by GitHub Pages).
- `src/engine.js` holds every scoring rule. `src/server.js` is the data service that runs in Google Apps Script on top of a Google Sheet. `src/app/` is the phone app.
- The society's real data is not in this repository. It lives in the Google Sheet.

Run the tests with `node --test test/engine.test.js test/server.test.js`.

Run everything (the two test files, then every screen test when the real data is present): `sh tools/check.sh`.

## Backups

- Organiser → Backup and export → **Back up now** saves a copy of the whole sheet in a Drive folder called "NCGS backups" (the newest 14 are kept).
- For a daily copy, paste the current `tools/bootstrap.gs` into Apps Script, then run `installBackup` once and approve the new permission.
- **Restore** in the same screen puts back anything missing from a pasted export. It never overwrites a row that exists, so a newer score cannot be lost to an old copy.
- The organiser PIN is kept in Apps Script's Script Properties, never in this repository. Change it under Organiser → Settings.
