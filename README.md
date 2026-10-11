# NCGS

The society app: rounds, scorecards, Stableford, KBs and Golfer of the Year, for phones.

- `site/` is the live app (built output, published by GitHub Pages).
- `src/engine.js` holds every scoring rule. `src/server.js` is the data service that runs in Google Apps Script on top of a Google Sheet. `src/app/` is the phone app.
- The society's real data is not in this repository. It lives in the Google Sheet.

Run the tests with `node --test test/engine.test.js test/server.test.js`.
