# Home — club character and matchday hierarchy

This contribution refines the existing application Home, building on released source
`1e81df4609b328ec8b0221e93dd44d06bb74c94f` (including the finished-KB fix).
It is proposed on an isolated branch into design. It is not a release or deployment.

## Behaviour

- With no featured round, show the actual current season in a large regular-weight display serif,
  with a pine rule and an honest empty/between-rounds message. Keep the existing season list and routes.
- An upcoming round retains its pine announcement and gains a clearer date treatment and a direct
  round-details label. Do not offer Continue for an upcoming round.
- Live Home retains the existing identified-player Continue action and personal rank outside the leaders.
  Separate the leaderboard from the scoring ticket and link to the existing full-field view.
- Surface nearest-the-pin/longest-drive state from the same results/claims used by Results.
  Confirmed, pending, Nobody and not-yet-played states remain distinct. A partial set of Nobody responses
  must not be described as an unplayed hole. The next hole's contest is also signalled on the live ticket.

The crest, light navigation, score controls and season-list destinations are retained. The season-list
icons intentionally use pine circles for stronger contrast, scoped to Home's sibling sections. The changes
are in `20-society.js`, Home-scoped styles and browser tests; there is no save operation here.

## Scope and dependencies

The displayed year still comes from the existing `seasonOf()` helper. This contribution does not implement
manual season opening, change upcoming-record visibility, revise the year picker, alter trip aggregation,
or introduce another scoring format. Those need separately scoped engineering work. The source observation
that undated upcoming records can be featured remains true; this change must not be presented as fixing it.

Do not edit scoring, server, core/data helpers, real data, deployment, workflows or the controller to land this
visual slice. The original roadmap queue stays complete. Detailed private event requirements are excluded.

## Validation

Exact commands and final results are recorded in the PR discussion at its named head. Required checks:

```sh
sh tools/guard.sh
node --test test/engine.test.js test/server.test.js test/fuzz.engine.test.js test/fuzz.server.test.js test/bw-pill.test.js test/extra-shot.test.js
NCGS_FIXTURE=1 node build.js
node test/home-states.run.js
node test/layout.run.js
node test/design.run.js dist/baseline.html dist/preview.html out/home-comparison
node test/phones.run.js
node test/finish.run.js
node test/starthole.run.js
```

The new Home test covers quiet/upcoming/live states, personal rank and navigation, provisional claims,
partial Nobody responses and fully confirmed Nobody, plus 360px/390px/enlarged-text renders.
It is invoked by the existing layout entry point after every original layout assertion passes, so the
existing design CI automatically runs it. Its failure propagates to the job; no workflow changes are needed.

The comparison intentionally reports Home's added words/Full field control and changed composition.
That is expected; it must not be called an unchanged-content pass. Downstream scoring/competition views
are checked for unchanged controls, words and pixels. No test expectations were relaxed for this change.

Local environment: unchanged repository browser tests run with installed Chromium. A local-only preload
selects `/usr/bin/chromium` and maps the comparison's file URLs to loopback HTTP because file navigation
is restricted in this environment. It does not change assertions. Fixture-only data is used throughout;
the multi-phone server is an in-memory copy, not production. Its full build uses a temporary copy of
the invented fixture as ignored seed input; no real seed is read or committed.

Genuine Chromium screenshots and viewport tests do not establish real-iPhone typography, sunlight
readability or physical iPad behaviour. These remain explicit review limits.
