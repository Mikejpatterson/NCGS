# Contest summaries: consistent titles and intact hole labels

The owner's two phone screenshots showed different contest-title treatment on Home and Results, and “Hole 2” wrapping between the word and number on Home. The Home status column competed with the title for horizontal space.

## Correction

- One presentation-only `contestHeading` helper supplies the same sans-serif title and smaller secondary hole label to both surfaces.
- Home gives that heading the full content width, with claimant and status beneath it. The flag, claimant, report status and navigation remain.
- Hole labels use a nonbreaking space and remain an intact unit even if the heading needs to wrap. Normal and enlarged-text phone layouts are measured.
- Results uses the same heading family, size and colour, with a body-size claimant beneath. Confirmed winners retain their cup and existing status semantics.
- Owner feedback exposed an unbalanced hierarchy in the initial versions: an enlarged claimant dominated a small hole label. Contest and hole now share one readable heading size; weight distinguishes the contest rather than shrinking the hole. The claimant uses normal body size on both surfaces, and status remains legible beneath. This composition was checked together on Home and Results, including long names and enlarged text; the earlier size-only iteration is superseded.
- A contest that has no report no longer gets the contradictory “To be confirmed” badge alongside “Not yet played”. The badge remains for reported results awaiting confirmation; confirmed winners retain their existing display. This is a view-only condition, using existing status fields; no claims, winner selection or confirmation rules change.

No scoring, storage, sync, course data, automatic data writes, workflows or controller files change. This is not implementation of the exploratory leaderboard mockups.

## Verification

The focused browser regression covers360/390/393/430px,135% text, a long claimant name, pending claims, confirmed winners and an unplayed contest. It measures actual text ranges to ensure Hole and its number occupy one line, headings fit and do not overlap, and both screens use the same effective typography. It also snapshots rounds/scores/claims/winners to prove browsing the two pages does not change them. All57 focused checks pass.

The existing contest-order regression retains all original ordering/removed-group assertions. It only normalizes the intentional nonbreaking space when matching human-readable text. The new test runs through the existing screen-audit/layout CI chain. Core/unit, member UI and strict layout checks are run, with final results recorded on the PR. Actual fixture before/after screenshots remain in the workspace; no new public image payload or production data is included. Browser tests are Chromium, not physical-iPhone certification.

## Build and review

The contribution starts from main60cb604, including the already-released Players/Who/course changes and the1November review/role instructions. A matching generated frontend/cache build is prepared as a separate integration commit. It preserves the production API/server fingerprint and uses only temporary invented build inputs, which are not committed. Source/site parity and normal CI remain required. Per the owner's1November instruction, `/claude-review` plus green CI is appropriate for this purely presentational change. No main merge or live deployment is authorized without the owner's explicit approval.
