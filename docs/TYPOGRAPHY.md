# Editorial typography check (issue #1)

DECIDED: the display serif is allowed only on `.hero.home .wordmark`, `.hero.home .now-name` and `.rp-name` (and text
inside them). Everything else, including names, numbers, buttons, tabs and the hole screen, stays in the system font.

## How it is checked
`test/layout.run.js` now checks fonts on every golfer screen at 360px, 390px and 390px with 135% text:
- each allowed title's computed font: `ui-serif` in the editorial build, the page's system font in the standard build;
- text inside an allowed title inherits the same font;
- editorial titles use lining numerals (`font-variant-numeric: lining-nums`), and no title uses old-style numerals;
- any visible text outside the allowed titles whose computed font is a serif fails the screen.
- the fixture's long round title, "Cabopino, the long-named second day of the trip", is lent in memory to the open
  rounds and checked on Home and on the round page at 360px and 360px with 135% text: whole text, no cut-off, no
  ellipsis or line clamp, inside the screen. In the editorial build it must take at most two lines.

Known exception, reported as `TYPE` lines and not failed: the Ruling screen's "i" button (official rule wording) is
a serif italic info glyph in the standard look (`styles.css`, `.rbtn.rinfo`). Changing it changes the live look, so
it is left for the owner.

## Result
| Long title, lines | Standard Home | Standard round | Editorial Home | Editorial round |
|---|---|---|---|---|
| 360px | 3 | 4 | 2 | 2 |
| 360px, 135% text | 4 | 4 | 2 | 2 |
| 390px | 3 | 3 | 2 | 2 |
| 390px, 135% text | 4 | 4 | 2 | 2 |

Before this change the editorial titles took 3 lines at 360px and 4 at 360px with 135% text. The fix is token-only:
`styles.css` gains `--t-display-home: 1.8rem` and `--t-display-round: 2rem` (same values as before, so the standard
look is unchanged) and `editorial-prototype.css` sets both to `min(…rem, 6.8vw)`.

Trade-off: in the editorial build these two titles no longer grow with the phone's larger text setting (at 360px they
are about 24.5px at both 100% and 135%). Two lines at 135% text is impossible otherwise: in Chromium's fallback serif
the long title needs 26px or less to fit two lines at 360px, while 1.8–2rem at 135% is 39–43px.

## What this does not prove
Linux Chromium has no New York; it renders a fallback serif. These results prove the configured font stack, the
computed styles and the layout, not how New York actually looks or wraps on an iPhone. Check on a real iPhone.

Screenshots (`node tools/typography-shots.js <preview.html> <std|ed> docs/typography-shots`):
- editorial: [Home 360](typography-shots/long-home-ed-360.png), [Home 360 + 135%](typography-shots/long-home-ed-360-135.png),
  [round 360](typography-shots/long-round-ed-360.png), [round 360 + 135%](typography-shots/long-round-ed-360-135.png)
- standard: [Home 360](typography-shots/long-home-std-360.png), [round 360 + 135%](typography-shots/long-round-std-360-135.png)
