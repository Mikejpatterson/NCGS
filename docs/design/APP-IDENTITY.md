# NCGS app identity

The owner's29October instruction extends the accepted results refinement to the whole application. Modern Club Character is one identity shared by members and organisers, with different emphasis for quiet club browsing, live play and the breakfast draw. Coordination and task ownership remain on Issue1.

## The common language

- Pine, warm ivory and restrained champagne remain the palette. Existing colour tokens are the source of truth; surface roles alias them. Navy/crimson still identify Buggy Wars teams, while warning/error colours retain their operational meaning.
- The approved display serif gives page titles, the Home season year and major club moments their character. People, scores, forms and interactions use the existing system sans. Numbers remain tabular; long names wrap and text size continues to grow.
- Standard page headers have one consistent title scale, spacing and pine rule. A header containing only a return link gets no empty decorative rule. Home's editorial composition, pine play panels and the theatre stage retain their own hierarchy.
- Collections use a quiet shared edge and separators. Numeric ledgers use rank, full name and an aligned total; initials circles are reserved for identifying people in browsing/selection contexts. Your own standing retains its left rule and stronger name. Data panels such as charts and score grids keep a contained white surface.
- Profiles, personal scorecards and season statistics use metric strips rather than several competing tiles. Principal club or match moments can still use pine panels.
- Page-local navigation uses underlined text tabs. Choice controls and primary actions remain pills. The main floating glass navigation is retained. Selected states and existing accessible labels remain explicit.
- Forms share field surfaces,12px corners, readable labels and consistent action spacing; fields are at least44px. Ordinary panels use16px corners and sheets24px. Existing featured pine compositions keep their dedicated shapes.
- Focus is pine on light surfaces and ivory in pine play panels. Alerts, provisional results, rejected saves and disabled controls keep their existing meaning. Visual simplification must never conceal an outstanding action.

## Coverage by purpose

| Purpose | Shared treatment | Preserved emphasis |
| --- | --- | --- |
| Club Home, current season, past seasons | Editorial type, shared collection rhythm | Large year, crest, quiet off-day voice and deliberate new-season priority |
| Round/trip details and past results | Related tab navigation, ledgers, section hierarchy | Match-day pine context, individual daily results and separate Westport formats |
| Players, profiles, handicaps and scorecards | Identity lists, metric strips, clear numeric tables | Full names, own-player cue, playing-handicap explanation and actual scoring marks |
| Live individual/scramble scoring and finish | Shared overlays and reference typography | Fast four-player entry, team colours, Drive-before-Score, saving/offline/conflict warnings |
| Draw, pots and lineup | Shared surrounding controls and headings | Large wheels, one current team, completed lineup names and iPad theatre |
| Organiser setup, groups, members and courses | Same list, header and form grammar | Organiser controls, PIN boundary, manual roster/handicap decisions and ready-made course library |
| Settings, season opening, logs, backup/export | Same form and information-list grammar | Existing validation, finalisation, archive context and confirmation safeguards |
| Sheets, rules, rejected saves and card checks | Common focus, close targets, labels and panel treatment | Contextual responses, image viewing and recovery actions |

## Implementation and future work

`render()` exposes the existing current view and member/organiser context as presentation-only data attributes. The shared component rules live in the existing stylesheet. New views should inherit the appropriate collection, panel, ledger, form or featured composition instead of introducing another local visual theme. These attributes do not select routes, change permissions, clear drafts or modify data.

The coverage record distinguishes render functions, helper/legacy views and actual interaction journeys. Appearance, navigation, offline scoring and organiser setup all need evidence. Physical-iPhone/New York rendering, sunlight and VoiceOver require device evidence; Linux screenshots cannot establish those results.

Scoring, storage, synchronisation, real data, published-site files and deployment configuration remain outside this design contribution. Generated-site integration is separately reviewed, and only the human owner can authorise a main merge or release.
