# Round Players: correct phone column alignment

The phone screenshot showed the Index and Playing figures below each player's name, although the headings remained in columns above the list. This was a layout defect in the deployed CSS, not a scoring or handicap calculation problem.

## Cause and correction

A `max-width:420px` override expanded every name across the numeric columns and moved both handicap values onto a second grid row. It applied to ordinary short names as well as long ones. Existing clipping/overflow checks passed because the displaced figures were still inside the row; they did not verify their relationship to the headings.

Remove that override so heading and data rows use the same grid. Keep the player's name and tee time together, with index and playing handicap vertically centered alongside them. Narrow the two numeric tracks slightly to leave more space for names. Playing handicaps use normal body-size semibold figures instead of oversized extra-bold figures. The full row remains the handicap-detail tap target. Scramble's existing three-column roster is unchanged.

The correction is limited to `src/styles.css`. No application handlers, scoring/handicap rules, data, storage, synchronisation, live site, deployment or workflow files are changed. It starts from main `542b7f28000a284d4cdbd8859b3cd9d0b1443148` after the course auto-completion work; it does not reopen the old design stack or implement the exploratory leaderboard mockups.

## Verification

`test/player-columns.run.js` opens round details through the actual Home link and Players tab. It checks rendered geometry, not CSS implementation details: numeric values share their heading's right edge, stay alongside the same player's identity, names do not overlap those columns, rows remain at least44px tall, ordinary rows remain compact, and tapping a player still opens their handicap calculation.

Coverage:360/390/393/430px phones,135% text at360/390, and unusually long fictional names at ordinary/enlarged text.30 checks pass on the correction. Against an untouched main preview, the same test produces10 failures, reproducing the defect. It runs through the existing screen-audit/layout entry point, so it is covered by the established CI without a workflow edit.

The required engine/server checks and member UI91/91 pass. The existing strict layout/chained suites are also run; the PR records their final result. Genuine before/after captures are retained in the working workspace with invented data. Chromium evidence does not establish physical iPhone/Safari rendering.

## Integration

This is a source correction for independent review. The generated-site consistency safeguard remains in place: a reviewed companion site rebuild is required before any release merge. No source-only bypass, main merge or live deployment is authorized by this correction. Claude is notified directly on Issue1 to review and prepare that build in the normal workflow; a plain issue comment is not proof a native agent has executed it.
