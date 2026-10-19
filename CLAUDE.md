# NCGS: rules for working on this project

- A hole score entered on a phone must never be lost or silently overwritten. Any change to `src/server.js` (saveHole, versions, since) or `src/app/10-data.js` (outbox, sync) needs a test.
- Scoring rules live only in `src/engine.js`: WHS course handicap kept unrounded, 100% allowance by default, Stableford = max(0, par + shots - gross + 2), a pick-up scores 0.
- Countback is back 9, back 6, back 3, then the 18th hole and backwards. Do not invent other tie-break rules. GameBook is no longer used; imported 2026 rounds keep the order recorded at the time.
- Golfer of the Year: best 3 scores count. Ties compare counting scores best to worst, then the 4th best, and so on.
- KBs is a pair competition with partners in different groups. Call it "KBs" and do not explain it in the app.
- Never write "NCGS Golf Society". NCGS already means golf society.
- The real data (`data/ncgs-2026.json`, `data/seed.json`) is never committed. This repository is public.
- Design: warm white pages, rounded pine cards for the big moments (home round, hole, leader), flag-yellow accent, floating glass tab bar (Home, Hole, Results, Ruling), initials badges on people, system font, big touch targets, readable outdoors.
- Layout: no text may overflow or be cut off, and touch targets are at least 44px, at 360px, 390px and 135% text. `test/layout.run.js` checks this on every golfer screen. Numbers use tabular figures and leave room for three digits.
- Run `node --test test/engine.test.js test/server.test.js` before every push.

# Working with the owner
- The owner is not a software developer. Assume no technical knowledge: no jargon without a plain explanation, and never assume they know where a menu or setting is.
- When asking them to do something by hand (Google Drive, Apps Script, GitHub and so on), give ONE step at a time, say exactly what they should see on screen, and wait for their reply before the next step. Ask for a screenshot when that is quicker than describing.
- Do not guess facts about their situation (which round is real, what is live). Check, or ask.
- Keep replies short and plain. Own mistakes briefly and carry on.


# Approved editorial-design project (design branch only)

Read `docs/EDITORIAL-PROTOTYPE.md`, `docs/AI-COLLABORATION.md` and `docs/CLAUDE-HANDOVER.md` (current state, decisions, commands and pitfalls from earlier Claude sessions). The existing functional and data-safety rules above take precedence.

- Scope: Home, Hole/Score Entry and Buggy Wars aesthetics, **not** rules, storage or gameplay.
- Palette: forest/pine green #0B3D2E, warm ivory #FAF8F3, extremely limited flat champagne gold #D4B483 in crest only or award accents, Buggy Wars deep navy #244A78 and crimson #9B3443.
- Use contemporary serif selectively for brand and editorial display titles; system sans for interaction, navigation, player names and scoring. Preserve floating Liquid Glass pill navigation and generous phone touch targets.
- No golf-course photos, decorative ornamental motifs, fake metallic shine or luxury-brand effects.
- Approved crest: ivory serif NCGS and underline, double thin champagne-gold ring on pine green. **Do not** improvise a new production crest from a mockup; mark blocked pending accurate vector artwork if necessary.
- Known design defect: Hole screen pine-green header overloaded on left and underuses right side; redistribute hole/par/SI hierarchy intentionally, without centring everything arbitrarily.
- Only work on `design/crest-editorial-prototype`. Do not commit to `main`, merge, deploy, or alter production integrations, data or secrets.
- Keep optional `NCGS_DESIGN=editorial` prototype isolated. Audit selectors: first-pass CSS needs checking against actual DOM.
- Test with `node --test test/engine.test.js test/server.test.js`, layout suite if available, standard build and opt-in design build. Include truthful pass/fail evidence and screenshots if available.
- Stop for the owner's approval before any production merge.
