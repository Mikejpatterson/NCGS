# Remaining NCGS redesign roadmap — version 1

**Status: proposed, not yet owner-approved.** Prepared by Codex on 20 October 2026 against design
`79ba2225886f99e1af748adf19b047232164ff8c` and controller main
[`a4460a3`](https://github.com/Mikejpatterson/NCGS/commit/a4460a334ea2eceb1fe945aebdf962a552cc3072).
This document is the finite scope and decision policy; `.github/agent-queue.md` remains the only executable queue.
Approval must identify this version/commit and explicitly include the delegation policy below. Claude's proposal,
an agent's approval, an elapsed deadline or an unanswered digest does not constitute owner approval.

## What is already done

Do not repeat completed work: fixture/preview isolation and design tokens; screenshot-first hole-header work;
the 44px Ruling target; scalable display titles; conditional long-name wrapping; and the team-colour audit.
All four current queue items are checked off. References: `docs/LONG-NAMES.md`, `docs/TEAM-COLOURS.md`, the queue
and issue #1. The audit's automated cycle escalated; Claude subsequently integrated its evidence and recorded
the owner's decision. Do not rewrite that history as an automated approval.

**Preserve the owner's recorded decisions:** flag-yellow actions; pill buttons and floating glass navigation;
serif only on the three allowlisted display elements; text-size scaling; normal names retain compact score rows;
navy/crimson team colours. The 20 October handover explicitly records the owner's exception: Buggy Wars result
pills keep the leader identified visibly by colour only, without added names/initials. Preserve existing
screen-reader labels. This exception is not an accessibility conformance claim and must not be silently broadened.
The phone/sunlight check remains outstanding unless new evidence establishes it.

## Proposed delegation: decide within scope, without waiting for silence

After explicit roadmap approval, Codex as design lead may select small reversible visual/copy details needed
to complete these tasks, with Claude's independent review and the existing gates. Record the chosen option,
alternative, reason, affected task and exact commit on issue #1 or in the evidence pack. These are agent design
decisions under a standing mandate, not statements that the owner personally approved each choice.

Prefer the smallest measured change that preserves existing words, controls and behaviour. Where two compliant
options remain and Claude does not object, Codex selects one; no 24-hour wait is required. Any reasoned Claude
dissent parks that task for the single owner digest, preserving the existing stop-on-disagreement rule. Failed
tests, scope/permission conflicts, a proposed change to an explicit owner decision, missing real-device evidence,
or score/data risk cannot be overridden as a design preference. Park the affected task and continue independent
eligible work; put genuine owner choices in the single daily digest. Never mark a hard failure as approved.

This mandate excludes scoring/saving/sync, production data, main, deployments, secrets, access controls, new paid
services, weakening tests, new screens/features and invented crest art. It does not authorize release or removal
of existing explicit pauses. Changes to pause/escalation/notification/controller behaviour require a separately
reviewed automation proposal, the owner's approval where required, and actual activation before use.

## Ordered task catalogue

Each entry is intended to fit one coding round (roughly 20 minutes of agent work, apart from workflow checks).
If evidence expands the task, stop with a concrete finding and split the remedy; do not skip checks to fit time.
Enqueue the instruction and acceptance criteria together using the existing heading format and the ids below.
No visible change is required merely to close an investigation.

### 1. `handover-current` — reconcile progress and decisions

Update the historical status sections of `docs/CLAUDE-HANDOVER.md`, `docs/AI-COLLABORATION.md` and the colour-audit
summary to reflect the actual completed queue, the active controller location and the recorded colour-only
exception. Keep the measured audit results and remaining real-phone limitations. Link evidence instead of
reopening settled decisions. No application, workflow or queue edits by the coding agent.

Acceptance: statements match current remote refs/runs and owner decisions; historical escalation remains visible;
no claim that phone review, native Codex activation or production approval occurred. Normal documentation gates.

### 2. `name-resize-check` — check an already-open score screen after text resizing

Investigate the documented limitation in `docs/LONG-NAMES.md`: rows are remeasured on redraw/orientation change,
but a live text-size change may wait for the next tap. Use fictional normal, borderline and long names on the
same open entry screen, at 360/390px, both looks, before and after changing to 135% text. Record whether overlap
actually occurs before the next tap. Preserve compact normal-name rows and controls. This task adds evidence,
not a speculative app fix.

Acceptance: reproducible command, actual dimensions/screenshots and pass/fail; distinguish browser simulation
from iPhone behaviour. State no defect if none is reproduced. Existing app/layout evidence remains intact.

### 3. `name-resize-fix` — conditional, only for a demonstrated defect from task 2

If task 2 demonstrates overlap, make the smallest render/measurement fix in permitted UI files. Avoid redraw loops,
new timers, duplicate event listeners and score-control changes. Otherwise record that this entry is unnecessary
and do not enqueue it. This is not permission to change protected core/data files.

Acceptance: task 2's reproduction passes before another tap, normal-name layout remains compact, four players
and Save still fit at 390×844/100%, both looks meet existing large-text/44px checks. Supply before/after and normal
app hard gates. If a protected change is needed, retain the evidence and stop this task.

### 4. `warning-token-audit` — distinguish warnings from team colours

Investigate the existing audit finding that `.c-b` is used for Delete round, Turn KBs off and Out of date as well
as team identity. Inspect actual DOM and computed colours in both looks with fictional data. Document exact uses
and whether the editorial theme changes warning meaning/readability. No general organiser redesign or copy change.

Acceptance: selector/element map, contrast values and screenshots for demonstrated cases, smallest proposed
remedy only if warranted. Colour distance alone is not an accessibility pass. Keep owner-approved team colours
and the colour-only result-pill exception. A no-change conclusion is valid.

### 5. `warning-token-fix` — conditional, only for a demonstrated defect from task 4

If task 4 demonstrates a warning styled as team identity, separate only those warning uses from team tokens,
using existing error/warning semantics. No new copy, action or palette. Otherwise do not enqueue this entry.

Acceptance: documented warning cases corrected, team surfaces and standard-look baseline preserved except for
any explicitly evidenced correction, normal 4.5:1 text contrast, applicable layout/comparison/hard gates. Record
intentional pixel differences. Do not silently make a new global `.c-b` override.

### 6. `release-home-evidence` — current Home comparison

Reuse valid pinned evidence where possible; otherwise capture the baseline and current Home for live/no-round/
finished fixture states at 360/390px and 390px/135%, in both looks. Include a long round title and normal names.
Record screenshot source SHAs, commands and the limited serif allowlist. This is evidence, not a styling pass.

Acceptance: linked before/after pairs; action yellow, full pill navigation, large text and unclipped content;
explicit difference notes. No real member data and no claim that Linux screenshots establish iPhone typography.

### 7. `release-hole-evidence` — current score-entry comparison

Capture or reuse SHA-matching evidence for empty/partial/completed entry, normal and long names, three-digit
scores and Pick up, at the same sizes and both looks. Show normal names remain compact and the save pill is
reachable. Reference relevant phone/finish/start-hole results at the candidate SHA; missing results stay pending
for the existing full gates, not invented as passed. No score logic or control-attribute changes.

Acceptance: linked before/after pairs, exact source SHAs and checks; intentional differences explained; no
clipping or name/control overlap. Preserve behaviour and data invariants.

### 8. `release-buggy-evidence` — current Buggy Wars comparison

Reuse the team-colour audit and capture missing candidate-SHA comparisons for open/decided nines, overall results
and the no-buggies fixture state. Use the same sizes and both looks. Preserve the owner's colour-only pill
decision, pair ordering/initials elsewhere and existing screen-reader labels; do not add visible leader words.

Acceptance: labelled originals and relevant simulations, measured contrast, source SHAs and existing content/
control parity results. Keep simulations separate from the outstanding real-phone sunlight check.

### 9. `prelaunch-review-pack` — assemble one review page, no deployment

Create one release-review document linking the three evidence sets, change summary, known limits, test run ids,
explicit owner decisions and a reproducible fictional-data phone-preview package. Include a real phone-preview
link only after an authorized isolated hosting route has actually been published and verified. Its service-worker
scope must not overlap the live app, and it must contain no real data, PINs, production endpoints or secrets.
Packaging is authorized design work; publication/hosting is not inferred from this roadmap. Technical preparation
continues without asking the owner to configure routine details. Record a blocked preview honestly if necessary.

Acceptance: one review page; complete traceable evidence; existing full gates at a named candidate SHA; verified
preview link or explicit pending state. Do not call the release ready while real-phone checks or mandatory
evidence are absent. No main push, release merge or live deployment.

## Blocked or owner-only work

- **Crest:** do not enqueue integration until the approved vector master, exact geometry/colours/font licence,
  small-size artwork and intended placement are supplied. Keep the current mark; no invented substitute. When
  supplied, add one narrowly scoped integration task and one evidence task under this same roadmap/queue.
- **Phone/sunlight review:** bundle typography, colours, text scaling and basic offline/reconnect observations
  into one pre-launch review session. Do not replace this evidence with simulated screenshots.
- **Release:** the owner reviews the single pack, requests changes or explicitly approves a named release PR.
  Main merge/deployment remain owner-controlled. No 24-hour default, silent consent or agent approval can release.
- **Automation:** Claude batches independently reviewed fixes in one weekly proposal. Preserve PR #16's separate
  tested commit; do not rebundle unrelated changes without fresh review. A critical safety problem pauses the
  affected automation immediately rather than waiting for the weekly batch. No change is active until approved
  and integrated through the existing policy.

## Queue replenishment and notifications

After explicit approval of this version, Codex may keep up to three **eligible** tasks waiting from this catalogue
in the existing queue, topping up to three when available. Three is a target, not a reason to invent work, enqueue
conditional fixes early, bypass a pause or repeat completed/in-flight tasks. Keep completed ids and source roadmap
version; reread current queue/runs/PRs before every update. While another cycle runs, prepare a queue-update PR
instead of writing underneath it. At the end of this finite catalogue, stop for the consolidated pre-launch review.

Record routine agent discussion directly on GitHub without tagging the owner. Use one daily digest marker
`<!-- ncgs-owner-digest YYYY-MM-DD Europe/Dublin -->`, updating that day's comment rather than tagging repeatedly.
Include genuine choices with recommendations, release readiness, parked work and measured cost (or cost unknown
when billing is unavailable). Do not invent cost from run durations. An urgent data/security or unintended-spending
incident is an exception: contain it and notify promptly; an absolute daily-message cap must not hide it.

Proposed future controller behaviour may replace routine taste pauses with the final review **only after explicit
approval and tested activation**. Existing pauses, reviewer disagreements, hard failures and spending stops still
apply today. Scheduled reviews are for observing/reviewing/responding; they must not dispatch more coding runs
to bypass a paused queue or the daily limit.
