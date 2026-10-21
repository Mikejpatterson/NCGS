# NCGS editorial prototype
This branch is an **isolated design trial**, not a production release.
The current published app on `main` remains unchanged.

## Scope
- Home: selective editorial serif headings, restrained surfaces and deep-green actions.
- Hole/score entry: preserve all controls, hierarchy and save behaviour; refine the two buggy outlines.
- Buggy Wars: deep navy `#244A78` and rich crimson `#9B3443`.
- Navigation: retain the existing floating Liquid Glass capsule.
- Crest: approved champagne-gold double-ring mark is **not yet replaced** in the actual app; the image generation output requires an accurate production vector master, not a raster crop or guessed typeface. Blocked until the artwork listed on issue #1 arrives.

## Preview without activating in normal builds
No private data is needed. The fixture has invented names and rounds (`tools/make-fixture.js`).

> **One look since 21 October 2026 (owner).** The Option 2 styles are in `src/styles.css`; `src/editorial-prototype.css` and the `NCGS_DESIGN=editorial` switch are gone. The variable is now ignored, so a "standard v editorial" comparison compares two identical builds and proves nothing. To compare designs, build an older commit (for example `da1cf3c`, the design before the redesign) in a `git worktree` and compare against that.

```sh
NCGS_FIXTURE=1 node build.js                          # the preview -> dist/preview.html
```

With the fixture flag the build writes only the preview, never `dist/site` or `dist/server.js`.
Open `dist/preview.html` in a local web server (`python3 -m http.server 8765 -d dist`).

## How the trial is built
- `src/styles.css` holds design tokens: `--team-a`, `--team-b` (and `-soft`), `--font-display`.
- (Until 21 October 2026, `src/editorial-prototype.css` swapped those tokens; it has been folded into `styles.css`.)
- Decisions are recorded on GitHub issue #1, tagged **DECIDED**.

## Checks
- `sh tools/guard.sh` fails if the branch touches scoring, storage, sync, data or the published site.
- `node test/design.run.js a.html b.html [outdir] [--same-pixels]` compares two builds on Home, the hole screens, the round pages and Buggy Wars at 360, 390 and 135% text. It fails if the controls or the words differ, reports how many pixels changed, and saves screenshots.
- `.github/workflows/design-ci.yml` runs all of this on every push to this branch (no secrets, no deploy) and keeps the screenshots as a download for 14 days.

## Review criteria
1. Same content, controls, competition behaviour and score storage.
2. Home serif typography retains legibility; no decorative imagery.
3. Score entry preserves the plus/minus controls and responsive player tiles.
4. Buggy colours distinguish the teams in 9-hole and 18-hole views.
5. Bottom navigation remains a floating pill, not a rounded rectangle.
6. Test at 360px and 390px widths; 135% text; sunshine and low contrast.
7. Do not merge until the complete QA suite and real-phone checks pass.

This is a **first implementation pass**. It has not been visually or functionally signed off.
