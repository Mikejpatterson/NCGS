# NCGS: rules for working on this project

- A hole score entered on a phone must never be lost or silently overwritten. Any change to `src/server.js` (saveHole, versions, since) or `src/app/10-data.js` (outbox, sync) needs a test.
- Scoring rules live only in `src/engine.js`: WHS course handicap kept unrounded, 100% allowance by default, Stableford = max(0, par + shots - gross + 2), a pick-up scores 0.
- Countback is back 9, back 6, back 3, then the 18th hole and backwards. Do not invent other tie-break rules. GameBook is no longer used; imported 2026 rounds keep the order recorded at the time.
- Golfer of the Year: best 3 scores count. Ties compare counting scores best to worst, then the 4th best, and so on.
- KBs is a pair competition with partners in different groups. Call it "KBs" and do not explain it in the app.
- Never write "NCGS Golf Society". NCGS already means golf society.
- The real data (`data/ncgs-2026.json`, `data/seed.json`) is never committed. This repository is public.
- Design: pine green header bands, flag-yellow accent, system font, big touch targets, readable outdoors.
- Run `node --test test/engine.test.js test/server.test.js` before every push.

# Working with the owner
- The owner is not a software developer. Assume no technical knowledge: no jargon without a plain explanation, and never assume they know where a menu or setting is.
- When asking them to do something by hand (Google Drive, Apps Script, GitHub and so on), give ONE step at a time, say exactly what they should see on screen, and wait for their reply before the next step. Ask for a screenshot when that is quicker than describing.
- Do not guess facts about their situation (which round is real, what is live). Check, or ask.
- Keep replies short and plain. Own mistakes briefly and carry on.
