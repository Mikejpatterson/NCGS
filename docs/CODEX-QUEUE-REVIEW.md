# Codex → Claude: review of the initial design queue

STATUS: ready for engineering integration review; not installed on the active design branch.
Owner: Codex (design/tasks), Claude (coding cycle and integration).

Reviewed `AGENTS.md` from `codex/agents-md`, then confirmed the same file after PR #6 merged on main;
`CLAUDE.md`, the design handover, `docs/AGENT-CYCLE.md`, the existing candidate queue at `bed9ea7`,
and the decisions and latest cycle reports visible on issue #1, including Claude's welcome at
https://github.com/Mikejpatterson/NCGS/issues/1#issuecomment-6275021144.

The queue review is on `codex/queue-review`, based on the existing `queue/initial-list` branch.
It rewords that same four-task queue; it is not a second queue or scheduler. The design branch was not edited.

## Priority and acceptance

1. `ruling-target`: first, because a measured undersized input affects use on a phone. Require width and height,
   both looks, no behaviour changes, the strict 44px audit and linked before/after evidence.
2. `serif-check`: retain the strict agreed allowlist; distinguish legitimate inherited text from leakage.
   A computed CSS stack does not prove New York actually rendered on Linux. Keep the standard look unchanged.
3. `long-names (pause)`: retain the pause; include the existing Donnacha/arrow/Pick up overlap reported in the
   header screenshots. Check overlaps within cards, rather than relying solely on whole-page overflow.
   Use runtime fixture overrides, preserve the checked-in fixture, and keep score controls usable.
4. `team-colours-check (pause)`: retain the pause and evidence-first approach. Give contrast and simulation
   methods explicitly; no arbitrary colour-distance threshold or claim that simulations prove sunlight usability.

No crest task, new hole-header task, app functionality or production change is added.

## Header review to Claude and the OpenAI reviewer

Latest visible round 2 report: https://github.com/Mikejpatterson/NCGS/issues/1#issuecomment-6274905035,
run https://github.com/Mikejpatterson/NCGS/actions/runs/39300956228, reported tested commit `7d1d1adde4ed`.
The run page was in progress when checked. Do not confuse that historical observation with current execution.

The review calls R1 ACTIONABLE but says "Resolved" and cites all 16 committed screenshots as evidence.
Those two states conflict: a resolved finding should no longer block acceptance unless a remaining defect is
specified. The 53 vs 78 count is also reconciled: two prescribed unit files versus those files plus fuzz tests.
Do not spend another code iteration just to add needless changes for a resolved finding. Claude owns any
reviewer/orchestrator correction; no automation edits are part of this design review.

Claude's reported measurements support keeping the existing header: the mock adds 8px and the existing
Index line has strong reported contrast. I am not requesting bolder Index text or a header redesign.
This is a review of the report, not independent visual approval: the in-progress branch/screenshots were not
available through the Git remote at review time. Inspect the final published screenshots/commit before closing
that design review, and keep the name overlap assigned to the separate long-name task.

## Integration without collisions

After the header run finishes, reconcile this queue wording with the latest design-branch queue and live task.
Preserve checked-off tasks and any already running task; do not replace an active queue with four blank checkboxes.
If a task has started, keep its current instructions and apply applicable wording to remaining work only.
Use a PR into `design/crest-editorial-prototype`; do not merge main or change workflow permissions.
The existing `(pause)` and five-task daily limit remain in force. No new `/agent-continue` was posted here.

The GitHub website can be read from this environment, but `api.github.com` requests are blocked at HTTPS CONNECT.
Therefore this review branch can be pushed using native Git, but issue-comment posting and PR creation remain
unavailable. Publishing these notes does not claim that Claude was notified or another workflow was started.
No new product decision or production approval is requested.

Validation: 53/53 engine/server tests passed; the existing path guard passed against `queue/initial-list`;
`git diff --check` passed. The unchanged queue parser accepted the four unique IDs, revised order, nonempty
instructions and both original pauses. Browser/layout/comparison suites were not rerun: this branch changes
queue instructions and review notes only, with no application, style or test changes.
