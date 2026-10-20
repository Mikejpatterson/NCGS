# Long player names (issue #1, long-names task)

Names used to be cut off, or ran into scores, icons and the Pick up button. Now a long name wraps onto another
line. Text keeps its size, buttons keep their size, and no name is hidden behind "…".

## What changed
- `src/styles.css` (end of file): names on Home, the round page, Groups, KBs, Golfer of the Year, results, closest
  to the pin and the hole screens may wrap. A single word too long for its space breaks inside the word.
- Score entry: the name now has the full width of its tile, with Pick up, −, score and + on the line below. This
  fixes the recorded case where the arrow after "Donnacha" ran into Pick up (see `normal-entry-100-*`). Each row is
  taller as a result.
- `src/app/20-society.js` `pairNames`: the two names in a buggy pill may wrap (the "&" still stays with the first name).
- Nothing in scoring, saving or sync changed.

## How it was checked
`node tools/long-names-shots.js <preview.html> <std|ed> [outdir] [normal]` lends invented names such as
"Bartholomew Featherstonehaugh" to every member in the browser only (the checked-in fixture keeps its names). It opens
22 golfer screens at 360px, 390px and 390px with 135% text and checks, inside every card and control:
text cut off or ellipsised, text/icon/initials overlapping each other or a control, each name in the same row as its
own −, + and Pick up, and that Pick up, Save and the tab bar can be tapped and are at least 44px.

| Build | Long names | Normal names |
|---|---|---|
| Before, standard | 44 of 66 screens fail | 3 fail (Donnacha / arrow / Pick up) |
| Before, editorial | 44 of 66 fail | not saved |
| After, standard | all 66 pass | all 66 pass |
| After, editorial | all 66 pass | all 66 pass |

Full output: `long-names-shots/check-*.txt`.

## Screenshots (`long-names-shots/`)
- `long-entry-{std,ed}-{360,390,390-135}-{before,after}.png`: score entry with long names.
- `long-{round-groups,round-kb,goy,board-scores,who,hole-pick}-{std,ed}-390-135-{before,after}.png`.
- `normal-{entry-100,home,board-scores}-{std,ed}-390-{before,after}.png`: the fixture's own names. Home and results
  look the same; score entry is the documented change.
- `std` is the standard look, `ed` the editorial look.

## Known limits
- At 135% text, very long single words in the narrow Groups pills break mid-word (for example "Konstantin" / "os").
  Nothing is cut off, but it is not pretty. Real member names are much shorter.
- Checked in Chromium only, not on a real iPhone.
