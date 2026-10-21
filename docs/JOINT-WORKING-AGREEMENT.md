# Joint working agreement — human instruction, 21 October 2026

This records the human Product Owner's **NCGS — Joint Design and Development Instructions**, supplied directly
to both Codex and Claude. It replaces older agent-role descriptions; it does not replace score/data protections.

The human owns direction, significant decisions, priorities and release approval. Codex initially leads
implementation/testing; Claude initially provides independent design, UX and engineering challenge. Both may
invent better solutions and contribute code. Neither agent supervises the other. They can change the division
by mutual agreement and record task ownership on Issue #1 to avoid colliding edits.

ChatGPT's earlier contribution ends with its handover. It is not the Product Owner, arbiter, supervisor or
approver. Both agents should challenge its suggestions and the other's ideas constructively. Routine reversible
improvements within the selected direction can proceed through agent agreement/review. Material departures
and genuinely unresolved significant product choices go to the human with a recommendation.

## Shared design starting point

Read the full [current owner handover](https://github.com/Mikejpatterson/NCGS/blob/aecce8560fe3cadac08409a09b5fbd5c62c4295d/docs/design/NCGS-OWNER-DESIGN-HANDOVER.md)
including its original image links. The [earlier repository asset bundle](https://github.com/Mikejpatterson/NCGS/tree/911290bbea61e6d90381532d22aeb040d51f1125/docs/design/assets)
is provenance for the original images, not a competing authority. The human's latest instruction and the owner
handover above control. The direction is **Option 2 — Modern Club Character**: pine/ivory, rare flat
champagne gold, mostly modern sans with selective display serif, quiet components and useful space. Screen
mockups are exploratory; invented labels/names/scores are not requirements. Fonts and exact tokens may improve.
The selected double-ring crest treatment remains the identity reference, subject to authentic production artwork.

The latest navigation direction is a **light, warm-ivory, softly translucent floating pill**, restrained pine
active emphasis, one-line labels, accessible opaque fallback and safe-area clearance. It supersedes the heavy
dark nav in the board. Do not generate more presentation-board variants instead of testing the real application.

## Work and evidence

Inspect current code, refs, completed work, evidence and active runs first. Codex implements consistent shared
primitives and tests the real application; Claude independently checks aesthetic coherence, accessibility,
responsive layouts, navigation, score flows, offline/sync reliability and implementation quality. Preserve
scoring/competition calculations, outbox/sync, data integrity and existing safeguards. Use real screenshots and
appropriate automated tests; do not claim simulated browser evidence proves real-iPhone behaviour.

Issue #1 is the common record for plans, progress, decisions, disagreements and ownership; PRs hold precise
diff findings at exact SHAs. Neither agent asks ChatGPT to arbitrate or the human to relay technical messages.
Explain unavailable activation/communication clearly; a mention is not proof of execution. Use existing verified
review/cycle routes without replacing the controller or task queue.

The subsequently recorded human collaboration rule limits unresolved debate to two exchanges, then referral
with both positions and a recommendation. Do not post empty acknowledgements. `/agent-task` and `/agent-continue`
require the human's request in the invoking conversation; review triggers remain allowed once per PR head.

ROADMAP v1 is complete at design `da1cf3ccb68023b01d0575ad7cef1d85a73844a4`. Retain it and its evidence;
do not automatically restart it or add filler. Under the new implementation instruction, the first focused
contribution is the lighter shared navigation, with Claude's independent review. App-wide consistency continues
from the existing tokens/components; broad restyling is not required to make this useful first improvement.

Keep the owner informed concisely; ask only for material decisions, genuine blockers or explicit release approval.
No main merge, live-app change or production deployment is authorized by this agreement. The private fixture
preview and its existing permission are not authority to publish a new address or deploy production.
