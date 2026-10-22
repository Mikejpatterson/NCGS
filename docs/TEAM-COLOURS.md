# Team colour audit: navy and crimson (issue #1)

DECIDED (issue #1): team colours are navy `#244A78` (Buggy 1) and crimson `#9B3443` (Buggy 2) wherever a team
appears, "subject to sunlight and colour-blindness checks". Keep the text labels. This page is that check, for the
editorial look, with the standard look (blue `#0A60C9`, red `#C62828`) beside it for comparison.

**Result: no colour change is recommended.** Every piece of text in a team colour, or on one, is at least 4.5:1 in
both looks. The two teams stay clearly different in both simulations. Nothing in the app was changed. The audit
raised two points for the owner: Buggy Wars result pills show the leader by colour only, and in simulated
protanopia crimson comes out close to the pine of the selected tabs and + buttons.

**Status (refreshed 20 October 2026, task `handover-current`).** The audit ran as queue item
`team-colours-check (pause)` in run [39469125470](https://github.com/Mikejpatterson/NCGS/actions/runs/39469125470)
(`772be23`). That cycle escalated to the owner instead of approving; the evidence then reached the design branch
through PR #17 (merge `804d8fd`), and Claude recorded the owner's decision and ticked the item in `79ba222`.
- **DECIDED (owner, 20 October):** the result pills keep showing the leading pair by colour only, with no visible
  names or initials. A deliberate exception to "colour is never the only team identifier", recorded in
  `docs/CLAUDE-HANDOVER.md`. Existing screen-reader labels stay. It is not an accessibility conformance claim and
  must not be broadened. Navy and crimson stay.
- **Still not done:** the real-phone and sunlight review. The protanopia crimson/pine closeness stays a point for
  that review. The measurements below are unchanged.

## What was checked, and how
`node tools/team-colour-audit.js <standard.html> <editorial.html> docs/team-colour-shots` (fixture builds only:
`NCGS_FIXTURE=1 node build.js` and `NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js`). Chromium on Linux, invented
fixture data, 360px, 390px and 390px with 135% text. It opens five screens: the hole screen with two buggies, the
result after Save, Buggy Wars, the round page's Groups tab with one group opened, and a finished round's results.
On each one it:
- **finds every element painted in a team colour**: text colour, solid or soft background, border, ring. It reads the
  colours the browser actually computed (not the CSS file), so it covers every selector that really applies;
- **works out the colour really behind it**: see-through backgrounds (the soft pills are 13% team colour) are blended
  down onto the first solid colour underneath;
- **contrast**: WCAG 2 contrast ratio from sRGB relative luminance. Text needs 4.5:1 (applied to all text here, even
  bold or large text that would only need 3:1). Shapes needed to tell the teams apart (dots, borders, solid pills) are
  compared with what surrounds them against WCAG 1.4.11's 3:1;
- **colour-blindness simulation**: Machado, Oliveira & Fernandes (2009), severity 1.0 (full deuteranopia and full
  protanopia), applied in linear RGB to every pixel of the screenshot and to the token colours;
- **colour distance**: CIEDE2000 (ΔE00) between the two teams, and between each team and the pine selected states,
  normal and simulated, plus the lightness (luminance) contrast between them.

ΔE00 is a measure of how different two colours look; roughly, under 2 is hard to see, over 10 is clearly
different. **It is not an accessibility pass.** Neither are the simulations: they model one kind of colour vision on
a calibrated screen. They say nothing about a phone in sunlight, glare, screen brightness or a tired golfer on the
16th. That needs a real phone outdoors.

The full measured list, one line per element, look, screen and colour pair, is in
[`team-colour-shots/measurements.txt`](team-colour-shots/measurements.txt).

## Contrast (measured in the page, the same at all three sizes)
| Where | Element | Text / shape | Behind | Standard | Editorial | Needs |
|---|---|---|---|---|---|---|
| Buggy Wars | initials badges `.bw-bd` | white initials, 11.9px bold | team colour | 5.95 / 5.62 | **9.03 / 7.08** | 4.5 |
| Buggy Wars | result pills `.bw-res` | white "Won 2 up", 15.3px bold | team colour | 5.95 / – | **9.03 / –** | 4.5 |
| Buggy Wars | hole cells won `.bw-c.wa/.wb` | white points, 13.6px bold | team colour | 5.95 / 5.62 | **9.03 / 7.08** | 4.5 |
| Buggy Wars | holes-won totals `.bw-t` | team-colour number, 15px bold | white | 5.95 / 5.62 | **9.03 / 7.08** | 4.5 |
| Round results | "Buggy 1/2" pills `.pill.a/.b` | white, 13px semibold | team colour | 5.95 / 5.62 | **9.03 / 7.08** | 4.5 |
| Round results | soft pills `.pill.soft` | team-colour "won 2 & 1", 13px semibold | 13% tint on white | 4.89 / 4.57 | **7.27 / 5.78** | 4.5 |
| Hole screen | buggy card border `.bugs.b1/.b2`, 2px | border | ivory page `#FAF8F3` | 5.61 / 5.30 | **8.51 / 6.67** | 3 |
| Round groups | pair pills `.pb/.pr`, 2px border | border | white card | 5.95 / 5.62 | **9.03 / 7.08** | 3 |
| Round groups | 8px dots `.dot` | dot | ivory | 5.61 / 5.30 | **8.51 / 6.67** | 3 |
| After Save | match dot `.afdot` | dot | white card | 5.95 | **9.03** | 3 |

Numbers are Buggy 1 / Buggy 2 contrast ratios (":1" left off). Every text pair passes 4.5:1 in both looks. The
editorial colours are darker, so they measure higher than the standard ones everywhere; the standard look's soft
red pill (4.57:1) is the closest to the line.

The soft pill's tint itself is only 1.22–1.24:1 against the white card. That is fine: the tint is decoration, the
words carry the meaning, and the solid "Buggy 1" pill sits right beside it.

## Team distinction and navy against pine
| Pair | Look | ΔE00 normal | ΔE00 deuteranopia | ΔE00 protanopia | Lightness contrast normal / deut / prot |
|---|---|---|---|---|---|
| Buggy 1 v Buggy 2 | standard | 44.5 | 57.4 | 47.8 | 1.06 / 1.33 / 1.51 |
| Buggy 1 v Buggy 2 | editorial | 35.7 | 36.6 | 23.6 | 1.28 / 1.51 / 1.04 |
| Buggy 1 v pine | standard | 38.3 | 33.6 | 38.3 | 2.05 / 2.01 / 2.26 |
| Buggy 1 v pine | editorial | 28.0 | 23.0 | 26.6 | 1.35 / 1.33 / 1.40 |
| Buggy 2 v pine | standard | 53.3 | 30.4 | 14.0 | 2.17 / 2.67 / 1.50 |
| Buggy 2 v pine | editorial | 49.0 | 18.9 | **6.5** | 1.72 / 2.00 / 1.34 |
| Buggy 1 v pick-up "on" green `#167A41` | editorial | 40.9 | 37.9 | 40.5 | 1.67 |

Simulated colours (editorial): navy stays blue (`#294577` deuteranopia, `#364D7A` protanopia); crimson turns olive
(`#686040`) or dark grey (`#4D4B43`); pine turns dark grey-brown (`#35332F`, `#3B382D`).

What this means:
- **The two teams stay different in both simulations**, as blue against olive/grey. The editorial pair is less far
  apart than the standard blue/red (23.6 against 47.8 in protanopia) but still well over 10.
- **Both looks tell the teams apart by hue, not lightness** (lightness contrast 1.04–1.51). If colour is washed out,
  for example by glare, the two can look alike. That is equally true of the standard look today.
- **Navy against pine** (the selected tab, the + button, the hole header): about 28 normally and 23–27 simulated,
  because navy stays blue while pine goes grey. Similar lightness (1.35:1), so on a real phone the difference is the
  blue.
- **Crimson against pine in protanopia is close (ΔE00 6.5)**. Places they sit together: Buggy Wars, where the dark
  "Buggy Wars" and "Group 1" selected tabs are just above the crimson initials and won-hole cells; and the hole screen,
  where the Buggy 2 card border runs round the pine + buttons. Neither pine element is a team, and each carries a word
  or a + sign, so this does not mix up the teams. It is noted for the phone review, not treated as a defect.

## Colour is never the only identifier? What the screens show
- **Round page, Groups**: pair pills carry the names ("Aidan & Bartley"), and the open group lists each player with a
  dot. Names identify the pairs. Pass.
- **Round results**: "Buggy 1" / "Buggy 2" in words, and the match is introduced as "Aidan & Bartley v Cathal &
  Donnacha". Pass.
- **After Save**: "Buggy 1 won the hole", "Buggy 1 · 1 up" in words beside the dot. Pass.
- **Buggy Wars**: the pairs are initials badges (AF BF v CF DF), and the hole board keeps Buggy 1 on the top row and
  Buggy 2 below. **But the Front nine / Back nine / Overall result pills ("Won 2 up", "1 up, 4 to play") say who leads
  only by colour.** The words are the same for either side; the screen-reader label has the pair name, the visible pill
  does not. Same in both looks, so it is not caused by navy and crimson, and fixing it would mean changing words, not
  colours. This went to the owner, who decided on 20 October to keep it as it is (see Status at the top).
- **Hole screen**: each pair is its own card with both names in it, so the pair is never shown by colour alone. Which
  card is Buggy 1 is shown by colour and by order (Buggy 1 on top); there is no visible "Buggy 1" word (it is in the
  screen-reader label). Same in both looks.

## Pictures
Each picture is one phone screen: **original** on the left, then **simulated deuteranopia** and **simulated
protanopia**, labelled at the top, with the method written underneath. The original panel is the real screenshot.

| Screen | Look | 360px | 390px | 390px, 135% text |
|---|---|---|---|---|
| Hole screen | standard | [360](team-colour-shots/hole-standard-360-cvd.png) | [390](team-colour-shots/hole-standard-390-cvd.png) | [390-135](team-colour-shots/hole-standard-390-135-cvd.png) |
| Hole screen | editorial | [360](team-colour-shots/hole-editorial-360-cvd.png) | [390](team-colour-shots/hole-editorial-390-cvd.png) | [390-135](team-colour-shots/hole-editorial-390-135-cvd.png) |
| After Save | standard | [360](team-colour-shots/after-standard-360-cvd.png) | [390](team-colour-shots/after-standard-390-cvd.png) | [390-135](team-colour-shots/after-standard-390-135-cvd.png) |
| After Save | editorial | [360](team-colour-shots/after-editorial-360-cvd.png) | [390](team-colour-shots/after-editorial-390-cvd.png) | [390-135](team-colour-shots/after-editorial-390-135-cvd.png) |
| Buggy Wars | standard | [360](team-colour-shots/buggy-wars-standard-360-cvd.png) | [390](team-colour-shots/buggy-wars-standard-390-cvd.png) | [390-135](team-colour-shots/buggy-wars-standard-390-135-cvd.png) |
| Buggy Wars | editorial | [360](team-colour-shots/buggy-wars-editorial-360-cvd.png) | [390](team-colour-shots/buggy-wars-editorial-390-cvd.png) | [390-135](team-colour-shots/buggy-wars-editorial-390-135-cvd.png) |
| Round groups | standard | [360](team-colour-shots/round-groups-standard-360-cvd.png) | [390](team-colour-shots/round-groups-standard-390-cvd.png) | [390-135](team-colour-shots/round-groups-standard-390-135-cvd.png) |
| Round groups | editorial | [360](team-colour-shots/round-groups-editorial-360-cvd.png) | [390](team-colour-shots/round-groups-editorial-390-cvd.png) | [390-135](team-colour-shots/round-groups-editorial-390-135-cvd.png) |
| Round results | standard | [360](team-colour-shots/round-results-standard-360-cvd.png) | [390](team-colour-shots/round-results-standard-390-cvd.png) | [390-135](team-colour-shots/round-results-standard-390-135-cvd.png) |
| Round results | editorial | [360](team-colour-shots/round-results-editorial-360-cvd.png) | [390](team-colour-shots/round-results-editorial-390-cvd.png) | [390-135](team-colour-shots/round-results-editorial-390-135-cvd.png) |

Action yellow and the standard look are untouched; they appear in the pictures only as they are today.

## Seen in passing, outside this task
- `.c-b` (Buggy 2's text colour) is also used for "Delete round", "Turn KBs off for the round" and "Out of date" on
  organiser screens, so in the editorial look those turn crimson. They are warnings, not teams. Not changed here;
  checked by roadmap task `warning-token-audit` in `docs/WARNING-TOKENS.md`: "Delete round" and "Turn KBs off" are
  in fact green and grey (a later rule wins), and the three that do turn crimson pass and need no change.
- `.pr` is both the crimson pair pill on the round page and the player row on the hole screen. The hole screen
  overrides the border, and the audit found no crimson border on any hole-screen row, so it has no visible effect.

## Not established
- Real-phone and sunlight readability. All of this is Chromium on Linux at device scale 1. The owner's phone review
  outdoors is what decides it.
- Tritanopia, partial colour blindness and low vision were not simulated.
- New York and the iPhone's colour handling (Display P3, True Tone, Night Shift) can change how the colours look.
