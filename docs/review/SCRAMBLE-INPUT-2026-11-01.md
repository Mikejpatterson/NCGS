# Compact scramble entry and team results

Michael approved the actual-app 2×2 mockup after reporting that four full-width drive choices pushed score entry under the floating Save/navigation controls. The old automatic grid could collapse to one column at normal phone widths with larger system text.

The four drive choices now stay in two columns with readable names and full touch targets. Team entry borrows the existing Stableford score-row presentation: outlined Pick up, minus, strokes with points beside them, and plus. It still records one team score and the selected driver. A single in-flow Save button follows the score instead of covering it. Results pairs the four names with their drive counts in two columns; long names can wrap and carry their dots onto the next line.

All existing scramble actions, score calculations, draft persistence, save payloads, driver counting, conflict recovery, final-round protections and organiser rules remain unchanged. No scoring/server/storage/course data, automatic writes, workflow or controller code is altered. The clean stroke value retains its existing `.scr-val` selector for the real multi-phone regression; points are a separate superscript.

## Evidence

- 46 focused browser checks pass at 360/390/393/430px and enlarged text with a long name. They measure the two-column grid, score/Save/nav clearance without scrolling, full 44px targets, strokes/points, driver retention, Pick up, clear-to-incomplete state, paired drive counts and unchanged stored data after draft edits.
- The same-size baseline app reproduces one-column choices and score/Save overlap. Before/after actual fixture captures and measurements stay local; no new public screenshot or production data payload is included.
- Existing scramble browser regression: 28 pass. Real-server scramble phone regression: 14 pass, including offline disagreement, reload, recovery and driver resolution.
- Required engine/server tests and all existing unit test files pass. Full strict layout/chained suites and GitHub CI run normally, with final evidence recorded on the PR. The new focused regression is part of the existing screen-audit chain; no workflow change is needed.
- All unrelated build/test inputs were checked against current main blob hashes. The contribution starts at `fa5e550`, retaining the completed draw/pots work. Open scorer-ownership PR #76 and crawler PR #75 are separate work.

The generated frontend and cache are a separately scoped companion build, preserving the production endpoint and server fingerprint. Source/site parity and exact-head independent review are required. Approval of the preview is recorded in the conversation; existing human release-approval and main safeguards continue to apply. Simulated Chromium phone checks do not certify physical iPhone rendering.
