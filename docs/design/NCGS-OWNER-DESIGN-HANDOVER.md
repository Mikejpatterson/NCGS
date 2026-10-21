# NCGS — authoritative owner design handover (21 October 2026)

**Scope:** App-wide design direction for Codex and Claude Code. **Owner-selected visual direction; screen mock-ups remain exploratory.** This document is **not** permission to merge, publish, deploy, change scoring or overwrite the existing work. It supersedes earlier *aesthetic handover* drafts where they conflict with the decisions below, particularly the bottom navigation.

> **Copies in this folder (21 October, owner-approved):** the original mock-ups showed real members' first names, initials and handicaps, and the launch screen spelled out an invented expansion of NCGS. In these copies the names are replaced with made-up ones and the expansion is removed; nothing else is changed. The originals stay in the owner's private Google Drive folder. **Owner decision: the name is just "NCGS". It never stands for anything, and the app never spells it out.** Never put real member names, initials or handicaps in this public repository.

## The one-minute brief

Create a coherent mobile-first app using **Option 2 — Modern Club Character** as the **primary visual reference**: modern editorial elegance, pine green and warm ivory, rare flat champagne-gold accents, crisp predominantly sans-serif utility text with sparing classical serif display headings, restrained rounded cards, generous usable space, and confident but sociable competition character. Not a faux-luxury golf brand and not a generic golf template.

**CRITICAL LATEST REVISION (21 Oct):** The owner finds Option 2’s heavy, dark/solid bottom navigation too visually dominant. **Replace that treatment with a LIGHT floating, softly translucent warm-ivory pill, with subtle pine-green active icon/text and no large filled active-chip.** The *floating-pill navigation concept* remains; only its heavy dark styling is superseded. Icons and captions should fit in one line; maintain hit targets, safe-area clearance and contrast. Prior “precise nav” study was not delivered successfully and is **NOT APPROVED AS A LAYOUT**. Implement tastefully using the real app and existing architecture; do not ask owner to judge more AI-image mock-ups.

## Explicit decisions and their authority

| Item | Owner decision / status |
|---|---|
| Option 2 visual look board | **SELECTED primary aesthetic reference**. Not an exact screen template. |
| Visual character | **AGREED**: modern editorial elegance / modern club character; clean, confident, relaxed, competitive; not luxury, stuffy or decorative. |
| Palette | **AGREED colour relationship**: pine green and warm ivory dominate; champagne gold restrained, flat, chiefly identity highlights. Exact green/ivory/gold hex values **not individually owner approved**. |
| Buggy Wars pair colours | **Previously confirmed** navy `#244A78`, crimson `#9B3443`; check current semantic behaviour before changing existing visuals. |
| Typography | **AGREED principle**: roughly 90% highly legible sans UI, roughly 10% display serif where editorial/identity impact merits it. Exact families not fixed. Reference board suggests Playfair Display/Inter but these are **proposals**, not owner directives. |
| Cards and controls | **AGREED direction**: restrained rounded rectangular components, comfortable spacing, no unnecessary ornament or elaborate shadows. |
| Bottom nav, latest | **AGREED DIRECTION**: floating light warm-ivory translucent pill, compact and low-visual-weight; pine green selected tab icon/text; no thick solid dark slab and no heavy filled Home highlight. Exact CSS blur, padding and icon treatment are implementation details. |
| Nav defects | **REJECT** wrapping labels, cropped content, nav hiding actions or badly composited/pasted-over visual mock-ups. |
| Crest | **SELECTED visual direction**: ivory NCGS serif lettering with restrained underline, balanced **flat champagne-gold double border** on deep green. Independently selected after earlier ivory ring designs. |
| Individual Home / Hole / Buggy layouts | **EXPLORATORY.** Illustrate tone and function; no approval of precise positioning, invented event content, names, scores, team rules, or navigation destinations. |
| Photo/ornament | **REJECTED** golf-course hero photography, fairways, silhouettes, generic clip art, glossy metal, luxury-watch effect, fantasy/Victorian novelty type, unreadable interlocking monograms, overly prominent/repeated crest. |
| Dribbble dark/lime image | **NOT NCGS**, surfaced in error; never use. |

**Working, NOT final tokens:** pine `#123F32`; ivory `#F5F0E4`; gold `#C5A76A`; navy `#244A78` and crimson `#9B3443` confirmed above. A shared CSS/token implementation can choose and tune values to achieve accessible contrast. Do not say all numbers were separately approved.

## Primary visual evidence (original files, not recreated)

These original files are in the user's existing **NCGS App Brand Assets** Google Drive folder (links may require connected Google access). Repository-local copies are preferable for agents; when they exist, use the corresponding paths under `docs/design/assets/`.

- **OPTION 2 — PRIMARY AESTHETIC, OWNER SELECTED:** [Original full look board](https://drive.google.com/file/d/1c8Bb9mgpu2Ll7dsvX3QPLuZbDp3berC3/view). **Approved overall style**, not every pictured control/content. *Its heavy dark nav is now explicitly superseded by the latest light floating pill decision.*
- **CREST — SELECTED DETAIL:** [Original gold ring comparison](https://drive.google.com/file/d/1y_OcdDFk_c3yHNf5RPoiIAuUczKWcFpk/view). The owner chose **balanced flat champagne-gold double border / Option B** in the crest comparison.
- **CREST — PRESENTATION:** [Original gold crest presentation](https://drive.google.com/file/d/1SMiggagRuQ7LPH9Ogl4rfEap_oLPxxEs/view). *Visual evidence only; gold-crest SVG not confirmed.*
- **HOME — EXPLORATORY:** [Original Home UI](https://drive.google.com/file/d/17GUD3fwLaeP6ULQZisheiE7SLnjjLEZl/view). App feel illustrative; text and layouts not fixed.
- **HOLE / SCORE ENTRY — EXPLORATORY:** [Original Hole UI](https://drive.google.com/file/d/1Ob0AHz2tArCbscvqoa867ZHPJIgKcxpQ/view). Readability and workflow are principles, not pixel requirements.
- **BUGGY WARS — EXPLORATORY:** [Original Buggy Wars UI](https://drive.google.com/file/d/1jN2WK1EIawySzICyvQ6pPn8nFlxdakjc/view). Actual competition mechanics are controlled by source code, not image samples.
- **OLDER SVG — SUPERSEDED, VECTOR:** [Original ivory-border SVG](https://drive.google.com/file/d/1qGq3udwwVnbz2rbH1afQvyBW8ZMxcv7n/view). A genuine vector **for an older design**; **not** the final gold-border crest. Do not substitute or falsely describe gold crest PNG as vector.

No standalone verified production SVG of the selected gold-border crest has been recovered. Do not silently recreate it as though it were an original, mislabel raster as vector, or deploy the old ivory vector as the final logo. A production recreation is a **separate, reviewable implementation task** only if needed.

## Reusable page-level design rules

1. **Page composition:** ivory/light canvases for practical screens, deliberate headline/data/action hierarchy, deep green reserved for brand/emphasis and the most important actions. Avoid entire screens of green.
2. **Typography:** display serif for occasional event or society headlines; plain high-contrast sans for player names, score entry, leaderboard cells, forms and tab captions. Tabular numerals, adequate space for three-digit scores, no tiny shrunk player names.
3. **Navigation:** light floating translucent pill with a graceful opaque fallback, subtle shadow/border, limited pine-selected state, nonwrapping labels, hit targets ≥44 CSS px where practicable. No overlap with page content; test iPhone safe area.
4. **Cards/buttons:** consistent radius, margins, strokes and spacing. Avoid using champagne-gold as normal-size body text on ivory; keep accessible contrast.
5. **Competition:** Buggy Wars may use navy/crimson for participants, supplemented by accessible text/status, never colour alone. Keep score-entry and match statuses legible in outdoor light.
6. **Icons:** simple, consistent functional vectors; no decorative photography, emoji illustrations or heavy ornamental branding.
7. **Scope of flexibility:** Agents should independently design every route using the same primitives rather than asking owner to select a mock-up for each page. Escalate only material identity departures, risky functional changes or truly unresolved business rules.
8. **Prioritise reality over AI images:** review screen renders produced by actual application code at 360/390 px and 135% text; use screenshot/layout tests and real-phone evaluation.

## Preserve existing NCGS engineering work

As of the 21 October GitHub issue conversation, Claude/Codex have already implemented a provisional style layer and substantial Home, Hole and Buggy Wars testing on `design/crest-editorial-prototype`, with a privately shared owner-only phone preview. **Do not restart the app redesign, overwrite those changes, replenish the completed automation task queue, publish the private preview link, or disturb main/live.** Instead, compare this handover with the **actual HEAD** and propose the smallest coherent design-token/component changes, most importantly the revised **light navigation**. See [GitHub issue #1](https://github.com/Mikejpatterson/NCGS/issues/1), `CLAUDE.md`, `docs/ROADMAP.md` and latest evidence reports.

`CLAUDE.md` remains authoritative for app logic and safety: data not lost or silently overwritten; scoring and countback preserved; KBs naming/behaviour preserved; no real personal/production data committed; layout tests at 360/390px/135% font; applicable engine/server tests before push. It also explicitly says **never write “NCGS Golf Society”**, because NCGS already means golf society. Generated visual examples that invent a club expansion or event are not product facts.

## Roles and next work

- **Codex:** Read this handover, original visual files, current branch and existing component structure. Propose/implement the minimal revised light navigation within shared tokens/component architecture, run gates, produce true app screenshots and engineering review. Do not merge/deploy.
- **Claude Code:** Read the same materials; critically review implementation (especially readability, safe-area, score flows, action overlap, CSS/architecture, evidence). Coordinate in issue #1. Do not initiate a fresh task queue or overwrite Codex changes.
- **Both:** Refer to the **same handover and original image sources**. All visual examples marked exploratory remain nonbinding. If a design detail differs between a board and this document, **latest owner decisions in this document control**, except application integrity rules, which always control.
- **Owner:** No more rounds of choosing mock-up minutiae are needed. Review the real app preview before anything reaches production.

**Publication status:** Design handover only. No application code or live data is altered by publishing this document. 
