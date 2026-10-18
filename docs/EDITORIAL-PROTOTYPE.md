# NCGS editorial prototype
This branch is an **isolated design trial**, not a production release.
The current published app on `main` remains unchanged.

## Scope
- Home: selective editorial serif headings, restrained surfaces and deep-green actions.
- Hole/score entry: preserve all controls, hierarchy and save behaviour; refine the two buggy outlines.
- Buggy Wars: deep navy `#244A78` and rich crimson `#9B3443`.
- Navigation: retain the existing floating Liquid Glass capsule.
- Crest: approved champagne-gold double-ring mark is **not yet replaced** in the actual app; the image generation output requires an accurate production vector master, not a raster crop or guessed typeface.

## Preview without activating in normal builds
With the project's private seed data available locally:

```sh
NCGS_DESIGN=editorial node build.js
```

Open `dist/preview.html` in a local web server and review three screens on a real phone. A standard `node build.js` uses the existing visual design.

## Review criteria
1. Same content, controls, competition behaviour and score storage.
2. Home serif typography retains legibility; no decorative imagery.
3. Score entry preserves the plus/minus controls and responsive player tiles.
4. Buggy colours distinguish the teams in 9-hole and 18-hole views.
5. Bottom navigation remains a floating pill, not a rounded rectangle.
6. Test at 360px and 390px widths; 135% text; sunshine and low contrast.
7. Do not merge until the complete QA suite and real-phone checks pass.

This is a **first implementation pass**. It has not been visually or functionally signed off.
