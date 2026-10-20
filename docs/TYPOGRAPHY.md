# Editorial typography check (issue #1)

DECIDED: the display serif is allowed only on `.hero.home .wordmark`, `.hero.home .now-name` and `.rp-name` (and text
inside them). Everything else, including names, numbers, buttons, tabs and the hole screen, stays in the system font.

DECIDED (owner, 20 October, option A): display titles keep growing with the phone's text size. A long round name may
take up to three lines at large text sizes, but is never cut off. No `min(…, 6.8vw)` cap (draft PR #13 had one).

## How it is checked
`test/layout.run.js` checks fonts on every golfer screen at 360px, 390px and 390px with 135% text:
- which look is being checked comes from the build's explicit mark, `<html data-design="editorial">` (`build.js`, only
  when `NCGS_DESIGN=editorial`). It is cross-checked against `--font-display`, so a mark without the editorial styles,
  or the styles without the mark, fails instead of checking the wrong rules;
- each allowed title's computed font: `ui-serif` in the editorial build, the page's system font in the standard build;
- text inside an allowed title inherits the same font;
- editorial titles use lining numerals (`font-variant-numeric: lining-nums`), and no title uses old-style numerals;
- any visible text outside the allowed titles whose computed font is a serif fails the screen.

The fixture's long round title, "Cabopino, the long-named second day of the trip" (47 letters), is lent in memory to
the open rounds and checked on Home and on the round page, in **both** looks: whole text, never cut off, no ellipsis or
line clamp, inside the screen; at most 2 lines at 360px and 390px, at most 3 lines with 135% text.

Known exception, reported as `TYPE` lines and not failed: the Ruling screen's "i" button (official rule wording) is
a serif italic info glyph in the standard look (`styles.css`, `.rbtn.rinfo`). It is left unchanged.

## The CSS change (`styles.css`, both looks)
- A round name longer than about 33 letters gets smaller: its size is `60rem ÷ its length`, between 1.15rem and the
  usual 1.8rem (Home) or 2rem (round page). The view sets the length as `--len` (`src/app/20-society.js`). It is in rem,
  so it still grows with the phone's text size. Shorter names keep exactly their old size.
- The 2px cut-off in the live look (long Home title at 360px with 135% text) was the last line's letters dipping below
  the box (line height 1.05). Both titles get `padding-bottom: .08em` with the same negative bottom margin: room for
  the letters, nothing moves.

Normal-length names look identical: the Home screenshots before and after are byte-for-byte the same in both looks at
all four sizes.

## Result (long title, lines; Linux Chromium)
| | Before: Home | Before: round | After: Home | After: round |
|---|---|---|---|---|
| 360px | 3 | 4 (std), 3 (ed) | 2 | 2 |
| 360px, 135% text | 4, cut off 2px (std) | 4 | 3 | 3 |
| 390px | 3 | 3 | 2 | 2 |
| 390px, 135% text | 4 (std), 3 (ed) | 4 | 3 (std), 2 (ed) | 3 (std), 2 (ed) |

Screenshots, 360px with 135% text (`node tools/typography-shots.js <preview.html> <std|ed> <folder>`):
- standard Home: [before](typography-shots/before/long-home-std-360-135.png), [after](typography-shots/after/long-home-std-360-135.png)
- standard round: [before](typography-shots/before/long-round-std-360-135.png), [after](typography-shots/after/long-round-std-360-135.png)
- editorial Home: [before](typography-shots/before/long-home-ed-360-135.png), [after](typography-shots/after/long-home-ed-360-135.png)
- editorial round: [before](typography-shots/before/long-round-ed-360-135.png), [after](typography-shots/after/long-round-ed-360-135.png)

All other sizes are in the same folders.

## What this does not prove
Linux Chromium has no New York or San Francisco; it renders fallback fonts. These results prove the configured font
stack, the computed styles and the layout, not how the real fonts wrap on an iPhone. Check on a real iPhone.
