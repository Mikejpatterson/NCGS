# Agent automation check

This file proves the automated Claude run can read the design-branch rules and write
one documentation file. It changes no application code, data, tests or settings.

## Files read
- `CLAUDE.md`
- `docs/AI-COLLABORATION.md`

`docs/EDITORIAL-PROTOTYPE.md` is also listed in `CLAUDE.md` as required reading for design
work. It was not read in this run, because the task asked for only the two files above.

## Design-branch safety rules (as recorded in those files)
- Work only on `design/crest-editorial-prototype`. Do not commit to `main`, merge or deploy.
- Do not alter production integrations, data or secrets. Never paste the API key into
  GitHub issues or ChatGPT.
- Never auto-merge or auto-deploy. Stop for the owner's approval before any production merge.
- Do not merge `.github/workflows/claude-design.yml` to `main` without first checking its
  branch guard, scopes and repository protections. The guard rejects non-design branches.
- The functional and data-safety rules in `CLAUDE.md` take precedence over design work:
  - a hole score entered on a phone must never be lost or silently overwritten;
  - scoring rules live only in `src/engine.js`;
  - real data (`data/ncgs-2026.json`, `data/seed.json`) is never committed, because the
    repository is public.
- Design scope is limited to Home, Hole/Score Entry and Buggy Wars appearance, not rules,
  storage or gameplay.
- Keep the optional `NCGS_DESIGN=editorial` prototype isolated, and check first-pass CSS
  selectors against the real page structure.
- Do not invent a new production crest from a mockup; mark it blocked until accurate
  vector artwork exists.
- ChatGPT review is not a background agent. A review turn must be asked for explicitly.
  Record each iteration in the branch or a draft pull request.

## Tests required
- `node --test test/engine.test.js test/server.test.js` (before every push).
- Layout suite `test/layout.run.js`, if available: no text overflow or cut-off and touch
  targets of at least 44px at 360px, 390px and 135% text.
- The standard build and the opt-in design build (`NCGS_DESIGN=editorial`).
- Any change to `src/server.js` (saveHole, versions, since) or `src/app/10-data.js`
  (outbox, sync) needs its own test.
- Report truthful pass/fail evidence, with screenshots where available.

No tests or Git commands were run by this agent. The workflow runs the tests and commits
after checking this output.
