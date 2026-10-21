# Light floating navigation — implementation evidence

Human-authorized refinement of Option 2, based on design `da1cf3ccb68023b01d0575ad7cef1d85a73844a4`.
This is a contribution for Claude's independent review, not a release or deployment.

## Reference and design judgment

I read the full [owner handover](https://github.com/Mikejpatterson/NCGS/blob/aecce8560fe3cadac08409a09b5fbd5c62c4295d/docs/design/NCGS-OWNER-DESIGN-HANDOVER.md)
and visually inspected its six original images: the Option 2 board, selected gold-border comparison and crest
presentation, and exploratory Home/Hole/Buggy screens. Original image files were retrieved through their linked
Drive IDs when GitHub's text/binary connector returned empty image content. No image was regenerated or substituted.

The board's visual rhythm, warm canvas and selective serif are useful starting points. Its invented expansion,
five-tab routing, sample scores and dark nav are not product requirements. The current app already has the four
routes and floating form we need; the actual shortcoming is the bright selected lens and excessive transparency
over pine content. This change refines that shared primitive rather than rebuilding completed screens.

- Keep the existing system font, pine/ivory foundation, shared routes and completed responsive/scoring work.
- Consolidate superseded nav-only CSS generations into one token-driven block. Keep functional rules that hide
  the bar during typing/speech or under sheets; retain the established size, bottom spacing and safe-area formula.
- Use warm ivory at 92% opacity with moderate blur, avoiding large background-dependent contrast swings.
- Remove the raised filled selected-tab lens. Use pine icon/text and a short marker so selection is not colour-only.
- Retain the existing tab hit areas and one-line labels, including room for the dynamic "Hole 18" label.
- Start opaque when filters are unsupported; respect reduced transparency and forced colours; show a visible
  keyboard focus outline. No new animation or remote dependency.

The new pine-primary-action decision is a separate slice owned by Claude after this nav contribution. This patch
does not replace yellow actions, alter routing/control attributes or introduce the unfinished gold crest artwork.

## Source scope and environment

Application diff: `src/styles.css` only. Branch instructions also record the new human-owner/equal-agent roles
in `AGENTS.md` and `docs/JOINT-WORKING-AGREEMENT.md`. No protected scoring/server/core/data, published site,
workflow, controller or private-preview address is changed. ROADMAP v1 stays complete and its queue untouched.

The shell's inherited Git proxy was unreachable. I reconstructed the current **source/test text snapshot** from
pinned GitHub content at `da1cf3c`, verifying each fetched blob SHA, and publish only the reviewed changed paths
against that exact remote base tree. This is not a claim to have a full Git clone: historical screenshot binaries
and card-photo assets were not copied. The three unchanged app icons were copied from the existing checkout
after matching their blob SHAs to the pinned remote tree, for the local full-build checks. No card-reading/camera
regression is claimed. Original reference images
were separately retrieved and inspected without editing.

Runtime: Node 24 and installed Chromium 154.0.8037.57, rather than the controller's pinned CI versions. Local
browser startup requires the permitted external process sandbox; previews are served on loopback only. A local
preload selects the installed Chromium and maps fixture `file:` navigation to loopback HTTP because this browser
blocks file URLs. Existing test assertions remain unchanged. Initial parallel/blocked-file runs were discarded;
the final results below come from serial tests against the consolidated candidate.

The same local adapter maps the existing full-round/start-hole tests' `localhost:8765/preview.html` to the
candidate's standard fixture preview. The multi-phone suite uses the unmodified local data service on 8766.
Its full build temporarily uses the invented fixture as the seed, removes that seed afterward, and publishes
none of the generated `dist/` files. Production integrations are never contacted.

## Validation

| Check | Result |
| --- | --- |
| `node --test test/engine.test.js test/server.test.js test/fuzz.engine.test.js test/fuzz.server.test.js` | Four test files passed, zero failures in the Node 24 reporter. |
| Claude's unchanged independent nav check, both looks | 40 cases passed; 320 rendered label/background measurements, minimum 5.37:1 over pine. |
| Existing layout suite, standard / editorial (`MIN_TARGET=44`) | 95 / 95 checks passed at 360px, 390px and 135% text. |
| Existing design comparison, standard | 38 cases passed; opening Results at 360px timed out. The unchanged assertions for that one case passed on a focused rerun. |
| Existing design comparison, editorial | All 39 cases passed. |
| Reduced transparency / unsupported filters | Six size/look states use opaque ivory with no filter; unsupported-filter fallback passed. Forced-colour focus screenshot inspected. |
| Existing multi-phone suite | 28 checks passed: offline queues/reconnect, clashes, outages, duplicate saves and round removal/finalisation. |
| Existing finish / start-hole suites | 6 / 5 checks passed. The finish fixture saved the final four holes of its already-started round; this is not a fresh 18-hole test. |
| Fixture builds / source guard | Both looks built. No protected source paths changed; whitespace and snapshot-relative guard passed before publication. |

Across the 78 distinct screen/size/look comparison cases, words, numbers and control attributes matched. The
standard comparison command itself exited 1 because of its single click timeout; its original log is retained,
not rewritten as a pass. The focused retry filters the existing test to `360 / board`, preserving its assertions
and click timeout, and exits 0. No application change was made between the original run and retry.

The local preload is test-environment plumbing only, not part of the PR. The multi-phone suite uses the real
local server code and invented data. Its checks do not prove a real phone's offline app-shell cache. Raw logs
preserve the exact results, including the finish fixture's four-hole coverage.


The independent nav check is Claude's `test/nav.run.js` from `claude/project-thread-rh5iyb`, blob
`24192800ed2a82cd13d6e01da9feb514ce5dd5b4`, run unchanged as external test evidence. It includes actual rendered
label contrast over both the page and a pine band, four sizes (including 360px/135%), "Hole 18", 44px targets,
label wrapping and overlap at the bottom of the page. Claude owns its integration/review separately.

## Screenshots and limitations

| Look / screen / width | Before | After |
| --- | --- | --- |
| standard / home / 360 | [PNG](light-nav-shots/standard-home-360-before.png) | [PNG](light-nav-shots/standard-home-360-after.png) |
| standard / entry-empty / 390 | [PNG](light-nav-shots/standard-entry-empty-390-before.png) | [PNG](light-nav-shots/standard-entry-empty-390-after.png) |
| standard / buggy-wars / 390 | [PNG](light-nav-shots/standard-buggy-wars-390-before.png) | [PNG](light-nav-shots/standard-buggy-wars-390-after.png) |
| editorial / home / 390-135 | [PNG](light-nav-shots/editorial-home-390-135-before.png) | [PNG](light-nav-shots/editorial-home-390-135-after.png) |
| editorial / entry-empty / 390-135 | [PNG](light-nav-shots/editorial-entry-empty-390-135-before.png) | [PNG](light-nav-shots/editorial-entry-empty-390-135-after.png) |
| editorial / buggy-wars / 390-135 | [PNG](light-nav-shots/editorial-buggy-wars-390-135-before.png) | [PNG](light-nav-shots/editorial-buggy-wars-390-135-after.png) |

[Opaque no-filter fallback](light-nav-shots/opaque-fallback.png) · [Forced colours with keyboard focus](light-nav-shots/forced-colors-focus.png).

Raw logs and comparison reports are in [light-nav-checks/](light-nav-checks/).

These are genuine Chromium fixture renders, not mockups or composites. Before/after source and words/controls
are compared by the existing design tool. PNGs use invented data. The existing private phone preview is not
replaced or published by this work.

Real iPhone backdrop rendering, Home Screen display mode, safe-area hardware and sunlight remain real-device
checks. Reduced-transparency and forced-colour evidence is browser emulation, not a claim about iOS settings.
No new font downloads, service workers, production endpoints or extra paid executor are introduced.
