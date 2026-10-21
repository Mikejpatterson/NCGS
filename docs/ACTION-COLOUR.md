# Action colour: flag-yellow retired (Slice 2)

**Owner DECIDED, 21 October 2026 (issue #1):** main buttons are pine with white text, flag-yellow `#F6C515` is
retired, and champagne gold `#D4B483` is kept for identity and awards on pine surfaces only. This follows the
"Not a flag" rule in `docs/design/NCGS-OWNER-DESIGN-HANDOVER.md`.

## Role tokens (`src/styles.css` `:root`)

The single `--flag` token is gone. Each former use was given a role:

| Token | Value | Role |
|---|---|---|
| `--action` / `--on-action` | pine `#0B3D2E` / white | Buttons and fills on ivory or white: `.pill.flag`, `.rulechip`, save button, `.after` and `.fin` buttons, `.ask .btn`, `.hs-tag`, `.mk.eagle`, `.chart .cbar.top`, the round page action |
| `--action-inverse` / `--on-action-inverse` | ivory `#FAF8F3` / pine | A button sitting **on a pine card** (pine on pine would vanish): `.go` on the Home round card, `.rp-go .go`, `.introcard .btn`, `.ah-mic`, `.introflag`, `.hero .tile.flag` |
| `--on-pine-label` | `#E9E2CF` (softened ivory) | Small labels and eyebrows on pine: `.now-kind`, `.fact b`, `.lc-k`, `.mgk`, `.ft-k`, `.rp-kind`, `.entl small`, `.ah-txt small`, `.introkind`, `.fin .fink`, `.mr .mn small`, `.hrow2 .big small` |
| `--award` | champagne `#D4B483` | Leader and award highlights on pine: `.lead-pts`, `.fin .finpts`, stats medals `.sbm`, pine leader badges `.av.is-lead`, `.posp.p1`, `.rk.r1`, the crest badge, the cup on the pine winner card |
| `--action-tint` | `#E3EFE6` with a pine edge | "Next", "you" and "lowest" markers on ivory: `.hs.nxt`, `.hs-k.nxt`, `.lrow.low`, `.rg.me`, `.pk.me`, `.pl-row.me`, `.bw-n.cur` |
| `--lead-tint` | `#F3EFE5` | The leader's row on ivory; the pine and gold badge in the row says who leads, so the tint never carries meaning alone |

The editorial file (`src/editorial-prototype.css`) stays token-only; it does not need its own yellow overrides.
The `--flag-soft` fallback and the yellow glows (`rgba(247, 197, 22, …)`) were removed. The cup is drawn in yellow in
`src/app/00-core.js` (a protected file); CSS repaints it pine on ivory and champagne on the pine winner card.

## Measured contrast (WCAG 2)

Reproduce with `node tools/action-colour-contrast.js`. Text needs 4.5:1 (3:1 for large text); markers need 3:1.

| Foreground | Background | Ratio | Use | Pass |
|---|---|---|---|---|
| white `#FFFFFF` | pine `#0B3D2E` | 12.20:1 | `--on-action` on `--action`, `.rp-time b` | yes |
| pine `#0B3D2E` | ivory `#FAF8F3` | 11.50:1 | `--on-action-inverse` buttons on pine cards | yes |
| `#E9E2CF` | pine `#0B3D2E` | 9.44:1 | `--on-pine-label` eyebrows | yes |
| `#E9E2CF` | pine-2 `#14573F` | 6.59:1 | same, on the lighter end of a hero gradient | yes |
| champagne `#D4B483` | pine `#0B3D2E` | 6.19:1 | `--award` text and icons | yes |
| champagne `#D4B483` | pine-2 `#14573F` | 4.32:1 | only if an award sat on the gradient's light end; award uses are on flat pine or are large (`.lead-pts` 4.4rem, `.finpts` 3.6rem) | yes (large / not used) |
| champagne `#D4B483` | ivory `#FAF8F3` | 1.86:1 | never used to carry meaning on ivory | n/a |
| pine `#0B3D2E` | `--action-tint` `#E3EFE6` | 10.32:1 | "next"/"you" text and the pine edge | yes |
| pine `#0B3D2E` | white / page `#E5ECE6` | 12.20:1 / 10.15:1 | pine outlines and marker rings (`.hs.nxt`, `.lrow.low` edge) | yes |
| pine `#0B3D2E` | `#E9E2CF` | 9.44:1 | `.hero .pill.w` | yes |
| pine `#0B3D2E` | `--lead-tint` `#F3EFE5` | 10.63:1 | leader row, `.st-b` | yes |
| text `#0F1A14` | `--lead-tint` `#F3EFE5` | 15.52:1 | leader row names | yes |
| `--sub` `#55625A` | `--lead-tint` `#F3EFE5` | 5.57:1 | `.st-b .cap` | yes |
| `--sub` `#55625A` | `--fill` `#EAF0EB` | 5.54:1 | `.pp.p1` (was brown on yellow) | yes |
| `--sub` `#55625A` | `--action-tint` `#E3EFE6` | 5.41:1 | secondary text in a tinted row | yes |
| `--green` `#167A41` | `--green-soft` `#DDF1E4` | 4.56:1 | `.stile.tf` | yes |
| pine `#0B3D2E` | `#E8F3EA` / `#CFE5D5` | 10.71:1 / 9.19:1 | `.lnk.sun` title and icon | yes |
| `#3E6B57` | `#E8F3EA` / `#CFE5D5` | 5.35:1 / 4.59:1 | `.lnk.sun .lnk-s` | yes |
| white 80% (`#CED8D5`) | pine | 8.37:1 | `.after .btn small` | yes |
| white 55% (`#91A8A1`) | pine | 4.83:1 | `.prog i.done` marker (current dot is solid white, 12.20:1) | yes |
| old flag-yellow `#F6C515` | ivory | 1.53:1 | for reference: why a yellow marker on ivory never passed | — |

## Screenshots

`docs/action-colour-shots/` holds before (flag-yellow, commit `e277038`) and after pictures of Home, Hole entry,
Results, Buggy Wars and Ruling at 360px, 390px and 390px with 135% text, in the standard look (`std-…`) and the
editorial look (`ed-…`): 60 pictures. They were made with fixture data only:

```
node tools/action-colour-shots.js <before.html> <after.html> <std|ed> docs/action-colour-shots
```

## Not changed

Crest, scoring, saving, sync, control attributes and words. Touch targets keep their sizes (the tokens only change
colours). The comment in `src/app/00-core.js` that calls the leader badge "flag-yellow" is in a protected file and
was left alone; the CSS now paints that badge pine with a champagne initial.
