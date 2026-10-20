# Warnings in Buggy 2's colour? (`warning-token-audit`, roadmap v1 task 4)

The team colour audit (`docs/TEAM-COLOURS.md`, "Seen in passing") noted that `.c-b`, Buggy 2's text colour, is also
put on "Delete round", "Turn KBs off for the round" and "Out of date", so in the editorial look those would turn
crimson. This page checks that against the real page in both looks.

**Result: no change recommended, so task 5 (`warning-token-fix`) should not be queued.**
- Only **three** warning texts actually show in Buggy 2's colour: "Takes no further part", "Out of date" (and its
  sibling "Old version"), and the preview-only "Start the preview again".
- **"Delete round" and "Turn KBs off for the round" do not.** They carry the `.c-b` class, but a later rule in
  `styles.css` wins: "Delete round" is green like every other link, and "Turn KBs off" is grey like the other footer
  links. Same in both looks. The earlier note was right about the class and wrong about what is on screen.
- Each of the three is plain words that say what they do, and none of them sits on a screen that shows a team.
  The editorial look makes them darker and **more** readable (7.08:1 against 5.62:1), still red-family, and does
  not change their meaning. Nothing in the app was changed.

## How it was checked
`node tools/warning-token-audit.js <standard.html> <editorial.html> docs/warning-token-shots`, on fixture builds
(`NCGS_FIXTURE=1 node build.js`, then the same with `NCGS_DESIGN=editorial`). Chromium on Linux, invented fixture
data, 360px, 390px and 390px with 135% text, device scale 1. The tool adds an upcoming organiser round
("Warning check") with three groups and no scores to the page, then opens each screen. For every `.c-a`, `.c-b`,
`.banner.warn` and `.err` element it reads:
- the colour the browser actually computed (not the CSS file), and the colour really behind it;
- the WCAG 2 contrast ratio (sRGB relative luminance; 4.5:1 is applied to all text);
- the colour the same element gets **with its `.c-a`/`.c-b` class taken off**. If that is the same colour, the class
  has no visible effect there.

"Out of date" only appears in the live app after it has talked to a server with a different build. The tool
fakes that inside the page (`NCGS_BOOT.mode = 'live'`, a different `server` build, a recent `lastSync`). Nothing is
sent anywhere: the page is a local file with no server. The full list is in
[`warning-token-shots/measurements.txt`](warning-token-shots/measurements.txt).

## Every use of `.c-b` in the code
| Where (source) | Element | Words | Kind | What is on screen (both looks) |
|---|---|---|---|---|
| `00-core.js` `sideCls` / `status()` | `span.b.c-a`/`.c-b` | match status text, coloured for the side that leads | team | Buggy 2 colour (covered by `docs/TEAM-COLOURS.md`) |
| `30-play.js:532` scorecard head | `span.cap.b.c-b` | Buggy 2 players' names | team | Buggy 2 colour |
| `40-org.js:234` organiser group scorecard head | `span.cap.b.c-b` | Buggy 2 players' names | team | Buggy 2 colour (measured below) |
| `40-org.js:130` round page | `button.link.c-b` `[data-act=delete-round]` | "Delete round" / "Tap again to delete the round…" | warning | **green**, `.link` wins: `.c-b` has no effect |
| `40-org.js:217`, `:225` KBs page | `.foot button.link.c-b` `[data-act=org-kb-clear]` | "Turn KBs off for the round" | warning | **grey**, `.foot .link` wins: `.c-b` has no effect |
| `40-org.js:291` Change a player | `button.row > span.c-b` `[data-act=late-drop]` | "Takes no further part" / "Tap again to take them out" | warning | Buggy 2 colour |
| `40-org.js:369` Settings, About | `span.b.num.c-b` (only when the server is stale) | "Out of date" (or "Old version") | warning | Buggy 2 colour |
| `40-org.js:61` organiser home, preview builds only | `button.row > span.c-b` `[data-act=reset-preview]` | "Start the preview again" | warning | Buggy 2 colour (never in the live app) |

`styles.css` has one `.c-b` rule (line 62, `color: var(--team-b)`). Why it loses on the two links: `.link` (line 70,
`color: var(--green)`) has the same weight and comes later; `.foot .link` (line 695, `color: var(--sub)`) is
heavier. The editorial file only swaps the `--team-*` tokens, so it cannot change which rule wins.

## Measured (same at 360, 390 and 390/135%)
| Screen | Words | Font | Tap height | Standard: colour on behind, ratio | Editorial: colour on behind, ratio | Without `.c-b` |
|---|---|---|---|---|---|---|
| Round page | "Delete round" / "Tap again to delete the round" | 17px regular | 44px | `#167A41` on `#FAF8F3`, **5.08** | `#167A41` on `#FAF8F3`, **5.08** | `#167A41` (same) |
| KBs | "Turn KBs off for the round" | 15px regular | 44px | `#55625A` on `#FAF8F3`, **6.03** | `#55625A` on `#FAF8F3`, **6.03** | `#55625A` (same) |
| Change a player | "Takes no further part" | 17px regular | 54px row | `#C62828` on white, **5.62** | `#9B3443` on white, **7.08** | `#0F1A14` (ink) |
| Organiser home (preview) | "Start the preview again" | 17px regular | 54px row | `#C62828` on white, **5.62** | `#9B3443` on white, **7.08** | `#0F1A14` |
| Settings, About | "Out of date" | 17px semibold | 22px (not a button) | `#C62828` on white, **5.62** | `#9B3443` on white, **7.08** | `#0F1A14` |
| Organiser home, for comparison | "The server is out of date…" banner `.banner.warn` | 15px | 85px | `#B3261E` on `#FBE7E5`, **5.50** | same, **5.50** | – |
| Group scorecard, for comparison (team) | Buggy 2 names "Cathal", "Donnacha" | 13px semibold | – | `#C62828` on white, **5.62** | `#9B3443` on white, **7.08** | `#55625A` |

Every warning text passes 4.5:1 in both looks. Contrast is not the whole story, so the meaning:

**Does the editorial look change what the warnings mean?** No, as far as screenshots on a desktop browser can show.
- **The colour was already Buggy 2's in the standard look.** Standard Buggy 2 red `#C62828` is almost the same as
  the error red `--red #CF2A2A` (ΔE00 2.0, very hard to tell apart), so today the sharing is invisible. In the
  editorial look crimson `#9B3443` is further from the warning reds: ΔE00 13.9 from `--red`, 12.0 from the warning
  banner's `#B3261E`, 13.5 in simulated protanopia. So the warnings read as a darker, browner red than the banner,
  not as "the same red". It is still clearly in the red family, not navy or green.
- **The words carry the meaning.** "Takes no further part", "Out of date" and "Start the preview again" all say what
  they mean; none relies on colour. The two destructive ones already ask for a second tap ("Tap again to…").
- **No team is on those screens.** Change a player, Settings and the organiser home show no Buggy 1/Buggy 2
  colours, so a golfer cannot read "Takes no further part" as "Buggy 2". The only screens where crimson means a team
  (Buggy Wars, scorecards, round results, the hole screen) show none of these warnings.
- **These are organiser screens.** Golfers do not see any of them in normal use.

ΔE00 (CIEDE2000) is a measure of how different two colours look; it is not an accessibility pass, and neither are
the simulations (Machado et al. 2009, severity 1.0).

## Smallest remedy, if ever wanted (not recommended now)
Not warranted by this evidence. If the owner later wants warnings and Buggy 2 to be visibly different colours, the
smallest change would be to swap the three effective uses (`late-drop`, the stale "Out of date"/"Old version",
`reset-preview`) from `.c-b` to the existing error colour `--red`, with no new colour, copy or action, and to leave
the two links whose `.c-b` has no effect alone. That would change the standard look too (by ΔE00 2, almost
invisible) and is roadmap task 5's job, not this one. A new global `.c-b` override is not needed and would recolour
team names.

Seen in passing, not changed (outside this task, no organiser redesign): "Delete round" is the same green as an
ordinary link, in both looks, so it does not look like a destructive action until the second tap's words. That is
how the live app is today, not something the editorial look causes.

## Pictures
One phone screen each, scrolled so the measured element is in the middle. Same file names with `-360`, `-390` and
`-390-135` in [`warning-token-shots/`](warning-token-shots/).

| Screen | Standard 390 | Editorial 390 | Editorial 390, 135% |
|---|---|---|---|
| Delete round | [std](warning-token-shots/delete-round-standard-390.png) | [ed](warning-token-shots/delete-round-editorial-390.png) | [ed 135](warning-token-shots/delete-round-editorial-390-135.png) |
| Tap again to delete | [std](warning-token-shots/delete-round-confirm-standard-390.png) | [ed](warning-token-shots/delete-round-confirm-editorial-390.png) | [ed 135](warning-token-shots/delete-round-confirm-editorial-390-135.png) |
| Turn KBs off | [std](warning-token-shots/kb-off-standard-390.png) | [ed](warning-token-shots/kb-off-editorial-390.png) | [ed 135](warning-token-shots/kb-off-editorial-390-135.png) |
| Takes no further part | [std](warning-token-shots/late-drop-standard-390.png) | [ed](warning-token-shots/late-drop-editorial-390.png) | [ed 135](warning-token-shots/late-drop-editorial-390-135.png) |
| Start the preview again | [std](warning-token-shots/reset-preview-standard-390.png) | [ed](warning-token-shots/reset-preview-editorial-390.png) | [ed 135](warning-token-shots/reset-preview-editorial-390-135.png) |
| Server out of date | [std](warning-token-shots/out-of-date-standard-390.png) | [ed](warning-token-shots/out-of-date-editorial-390.png) | [ed 135](warning-token-shots/out-of-date-editorial-390-135.png) |
| Out-of-date banner (comparison) | [std](warning-token-shots/out-of-date-banner-standard-390.png) | [ed](warning-token-shots/out-of-date-banner-editorial-390.png) | [ed 135](warning-token-shots/out-of-date-banner-editorial-390-135.png) |
| Group scorecard (team, comparison) | [std](warning-token-shots/team-scorecard-standard-390.png) | [ed](warning-token-shots/team-scorecard-editorial-390.png) | [ed 135](warning-token-shots/team-scorecard-editorial-390-135.png) |

## Not established
- Real-phone and sunlight readability: all of this is Chromium on Linux at device scale 1 with invented data.
- "Out of date" was produced by faking a stale server inside the page, not by a real mismatched server.
- The "KBs need two groups or more" variant of "Turn KBs off" (`40-org.js:217`) was not opened; it is the same
  `.foot .link.c-b` markup, so the same rule wins.
- Team colours and the colour-only Buggy Wars result pills (DECIDED) were not revisited.
