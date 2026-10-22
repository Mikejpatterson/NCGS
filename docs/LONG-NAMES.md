# Long player names (issue #1, long-names task)

Names used to be cut off, or ran into scores, icons and the Pick up button. Now a long name wraps onto another
line. Text keeps its size, buttons keep their size, and no name is hidden behind "…".

## What changed
- `src/styles.css` (end of file): names on Home, the round page, Groups, KBs, Golfer of the Year, results, closest
  to the pin and the hole screens may wrap. A single word too long for its space breaks inside the word.
- Score entry (owner's direction, 20 October): a name that fits keeps today's compact one-line row (name, Pick up,
  −, score, +). Only when a name or its arrow would touch Pick up or −, that row gets a line of its own for the name,
  with Pick up, −, score and + on the line below, in the same places. `fitNames()` in `src/app/30-play.js` measures
  each row after the screen is drawn (and when the phone is turned) and marks those rows `long`; the CSS for `long`
  rows is at the end of `styles.css`. This fixes the recorded case where the arrow after "Donnacha" ran into Pick up.
- `src/app/20-society.js` `pairNames`: the two names in a buggy pill may wrap (the "&" still stays with the first name).
- Nothing in scoring, saving or sync changed.

## How it was checked
`node tools/long-names-shots.js <preview.html> <std|ed> [outdir] [normal]` lends invented names such as
"Bartholomew Featherstonehaugh" to every member in the browser only (the checked-in fixture keeps its names). It opens
22 golfer screens at 360px, 390px and 390px with 135% text and checks, inside every card and control:
text cut off or ellipsised, text/icon/initials overlapping each other or a control, each name in the same row as its
own −, + and Pick up, and that Pick up, Save and the tab bar can be tapped and are at least 44px.

| Build (66 screens each) | Long names | Normal names |
|---|---|---|
| Before, standard | 44 fail | 3 fail (Donnacha's arrow / name runs into Pick up at 390px) |
| Before, editorial | 44 fail | 3 fail (same) |
| After, standard | all pass | all pass |
| After, editorial | all pass | all pass |

"Before" is the code at `6b27051`, built the same way. With normal names, score entry before and after is
pixel-identical at 360px and at 135% text. At 390px only Donnacha's row changes (name on its own line, the buttons
below); Aidan, Bartley and Cathal are unchanged, and all four players plus the save button still fit on a 390×844
screen.

Full output: `long-names-shots/check-{before,after}-{std,ed}-{long,normal}.txt`.

## Screenshots (`long-names-shots/`)
- `long-entry-{std,ed}-{360,390,390-135}-{before,after}.png`: score entry with long names.
- `long-{round-groups,round-kb,goy,board-scores,who,hole-pick}-{std,ed}-390-135-{before,after}.png`.
- `normal-{entry,entry-100,home,board-scores}-{std,ed}-390-{before,after}.png`: the fixture's own names.
  `normal-entry` is score entry before any score; `normal-entry-100` is after the + buttons are pressed, which turns
  Pick up green and wider.
- `std` is the standard look, `ed` the editorial look.

## Known limits
- At 135% text, very long single words in the narrow Groups pills break mid-word (for example "Konstantin" / "os").
  Nothing is cut off, but it is not pretty. Real member names are much shorter.
- A row can change between one line and two while scoring: Pick up gets wider once it is switched on, so a name that
  just fitted beside it may move onto its own line.
- Checked in Chromium only, not on a real iPhone. If the phone's text size is changed while the app is open, rows are
  measured again on the next tap. Checked in `docs/NAME-RESIZE.md`: in Chromium, a borderline name's arrow does run
  into Pick up or − until that tap.
