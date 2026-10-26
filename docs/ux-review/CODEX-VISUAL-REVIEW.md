# Codex independent visual review — 59-screen Westport walkthrough

26 October 2026. Response to Claude's handoff6413738752, before the joint report. This is visual review, not approval to release or a new task queue.

## Evidence and independence

[Captured screens and captions](README.md) · [Critical withdrawn-row image](shots/59-withdraw-player-phone.png) · [iPad line-up image](shots/13-draw-organiser-ipad.png)

- Inspected **all59 original PNGs** indexed by docs/ux-review/README.md on exact capture commit `520c74c3596581a8fd444f3a743454cc093758a2`.
- Downloaded the SHA-pinned public archive and verified every image against its Git blob SHA. Used analysis contact sheets and reopened critical screens13,37,59 at original resolution. The original images were not altered.
- Screens reflect the combined Westport/draw/Groups build described in that index. Findings are about those captured states; check current branches before fixing anything that has since changed.
- Reviewed independently of Claude's not-yet-published process review. Existing handoff comments explain scope and owner decisions; they are not substitutes for the image inspection.
- **Screenshot limits:** ux-capture.js increases viewport height to fit each page (up to3000px), rather than capturing every state in a fixed844px phone viewport. Consequently these images do not establish original-screen reachability, keyboard behaviour, scroll/focus persistence, touch-target measurements, interactive safety, contrast ratios, sunlight visibility or breakfast-room distance readability. No application/browser test execution is claimed by this review.
- Fixture warnings about the initial PIN/testing mode and fictional venue/course combinations must not be treated as evidence of a production incident. Do not hide legitimate warnings to make a screen look cleaner.

## What should be retained

The pine/ivory identity, restrained champagne on pine and light navigation remain coherent. The enlarged draw wheels and large revealed names follow the owner's direction. Keep Drive before Score, visible drive progress for every team, the named team ledger, clear selected-driver state and team-only results. The phone line-up already gives names priority over team numbers. Functional scoring actions should retain practical sans-serif; selective editorial serif and pine rules supply the club character.

## Findings

Priority: **must** = misleading state, visibly broken presentation, or missing required review evidence; **should** = worthwhile clarity/readability improvement; **could** = optional polish. A must marked as an evidence issue is not a newly demonstrated product-code defect.

Requested format: screen number · problem · proposed fix · priority. IDs only make cross-reference easier.

- **F01 — 03, 14** · The scramble preparation checklist includes “KBs optional”, suggesting the ordinary cross-group pair setup is still needed. · **Fix:** Omit that setup item for a scramble; retain ordinary-round KB setup. · **must**

- **F02 — 04, 15** · Before any team exists, Groups says “Made by the breakfast draw” and the prominent Start round button says “Draw the groups first”. · **Fix:** Say “Teams not drawn yet”; make Breakfast draw the clear next action and show Start round as unavailable rather than the main invitation. · **must**

- **F03 — 06, 17** · Pot counts are a small line above a long assignment list and disappear from view while editing. · **Fix:** Keep a compact A/B/C/D count strip visible while the list scrolls, with a clear saved/pending indication; retain explicit organiser assignments. · **should**

- **F04 — 09, 20** · The active pot is indicated mainly by wheel motion, while “Tap a wheel to stop it” is nonspecific. · **Fix:** Give the spinning pot a persistent active treatment and name it in the stop instruction; keep the other wheels visually secondary. · **should**

- **F05 — 10, 21** · After the first reveal, Draw pot B becomes a low-emphasis control outside the green stage, unlike the prior primary action. · **Fix:** Keep the next-pot action in the same prominent stage-footer position used before the reveal. · **should**

- **F06 — 12, 23** · The stage ends on Team 3 with See the line-up, without acknowledging the fourth team made from the remaining players. · **Fix:** Add one short transition identifying Team 4 as the remaining players; do not add a fourth random draw or reveal future teams early. · **should**

- **F07 — 13** · The portrait iPad line-up puts all 16 names in one shallow row of four cards and leaves most of the display empty. · **Fix:** Use a two-by-two portrait line-up with materially larger names; adapt columns for landscape while keeping team numbers and tee times subordinate. · **must**

- **F08 — 28, 40** · The scramble Players view gives an Index column substantial space beside each player's team and tee time. · **Fix:** Prioritise player, team and tee time here; keep individual index information in the appropriate profile/organiser context. · **should**

- **F09 — 29** · Each team is compressed into one small name pill, with four names competing in a single line. · **Fix:** Use a wrapping named team list within the same row and test realistic full-length names; preserve the single-team treatment rather than restore buggy-pair styling. · **should**

- **F10 — 31** · During the draw, undrawn slots say “No one from pot …”, and several future empty teams compete with the team being revealed. · **Fix:** Show the current team with clear “Not drawn yet” placeholders and the active pot; reserve the all-team line-up for completion. Distinguish a genuinely exhausted pot from a pending pick. · **must**

- **F11 — 32** · Longest drive is labelled Not played although this player's group has scored through hole 14 and the pending hole-12 question follows on screen 33. · **Fix:** Use an awaiting-reports state when play has passed the contest hole; distinguish no submitted answer from a hole not yet played. Preserve provisional-result rules. · **must**

- **F12 — 33** · The gallery calls this the question on arriving at a hole, but the image says Scores saved and asks for the post-hole nominee. · **Fix:** Correct the caption and separately capture the pre-hole contest introduction; do not claim this image covers both moments. · **should**

- **F13 — 34–37** · The live drive warning ends in “KBs” while the team is still playing, but other views defer final outcomes. · **Fix:** Describe the actual live condition (“Minimum cannot be met” in this fixture) and retain the required final KB outcome; keep warning and final-result language distinct. · **should**

- **F14 — 35** · The selected drive looks recorded, but the image does not explain that it is only on this phone until the team score is saved. · **Fix:** If user walkthroughs show uncertainty, add a brief selected-state acknowledgement such as “Drive noted on this phone”; avoid another permanent paragraph. · **could**

- **F15 — 41** · The trip choices are only Day 1 and Day 2, so the member cannot identify the course or scoring format before opening them. · **Fix:** Label the rows with Ballinrobe / individual Stableford and Westport / team scramble; lead with the two separate results rather than a negative leaderboard explanation. · **should**

- **F16 — 42** · A live, scored scramble still offers Breakfast draw with “Set the pots, then draw the teams”. · **Fix:** Show the completed/locked draw state or remove the setup invitation during play; do not suggest teams can be redrawn now. · **must**

- **F17 — 42, 55** · Finalise is visually stronger than its small line of unmet prerequisites, while all groups still have holes/cards outstanding. · **Fix:** Make the outstanding work clear beside the finalisation control and match its readiness treatment to the existing rules; do not change force/finalisation permissions from a visual review. · **should**

- **F18 — 43, 44** · The scramble Groups header says tap a player to withdraw, then tapping says “no one needs withdrawing”. · **Fix:** Use a format-aware locked-team heading and explain the restriction plainly; remove the withdrawal invitation for this scramble and avoid implying a real withdrawal is unnecessary. · **must**

- **F19 — 47** · The promised all-teams-finished/KB screenshot is actually on Contests, so the key final team outcome is missing from the evidence. · **Fix:** Capture Scores with every team complete and the correct KB rows visible; assert the intended state/tab before capture. This is a required review-evidence correction, not proof of a results-code defect. · **must**

- **F20 — 48** · After all teams finish, Home's main action is Players · Groups; results and the failed-drive KB outcome are not the focal task. · **Fix:** Promote the team results as the main action, retain appropriate provisional/live wording until finalisation, and surface the known KB outcome without inventing an overall trip winner. · **must**

- **F21 — 50, 56** · On the ordinary-round group lists, blue/red dots carry buggy-pair grouping without a corresponding pair label or visible pair boundary. · **Fix:** Add a quiet non-colour grouping cue or pair label. Preserve the specific colour-only leader-result-pill exception elsewhere. · **should**

- **F22 — 51, 54** · Take out of the round uses the same green action language as Move, Swap and Replace inside a crowded editor. · **Fix:** Separate removal from the normal editing controls and give it an appropriately distinct treatment and named target, without adding an unnecessary confirmation maze. · **should**

- **F23 — 54** · Once Replace with is open, Move, Swap and Take out remain equally prominent around the replacement picker. · **Fix:** Give the replacement task a focused heading and Cancel/back path; quiet the competing edit choices until that task is closed. · **should**

- **F24 — 52** · The swap instruction names only 10:16, while the target group is far down the list and the selected source still dominates. · **Fix:** Name Group 3 as well as its tee time, visually focus/scroll to the eligible target group, and keep Cancel discoverable. · **should**

- **F25 — 57** · The prominent withdrawal button names the starting hole but not the golfer being withdrawn. · **Fix:** Use “Withdraw Eoghan from hole 15” and retain the concise explanation of scratch scores; keep the selected-player context visible. · **should**

- **F26 — 59** · The withdrawn golfer's name, Withdrawn badge and scratch message visibly overlap at the normal phone width. · **Fix:** Use a dedicated read-only row: name on one line, withdrawal/scratch status on its own line, with no overlapping score controls; recheck 360px, 390px and 135% text while retaining the three active players' controls. · **must**

## Cross-screen themes and proposed order

1. **Make the interface tell the truth about the current moment.** Remove ordinary KB preparation from a scramble; distinguish not drawn from no player, unfinished reporting from not played, and a locked team from an invitation to withdraw. These are ordinary corrections within the brief, not owner policy questions.
2. **Give the person one obvious next action.** Before the draw: draw the teams. During it: reveal the next pot in a consistent location. After it: show the line-up and relevant round information. After golf: team results. Keep underlying setup and administrative destinations available with quieter hierarchy.
3. **Use the iPad as a room-facing stage where appropriate.** Wheels and the current team deserve the space they have gained; the final portrait line-up needs comparable scale. Keep nearby organiser forms compact rather than enlarging every page indiscriminately.
4. **Pair wording and visuals with the format.** Ordinary buggy/KB language and withdrawal actions do not belong on locked scramble screens. Keep index/profile detail separate from the immediate team/tee-time task.
5. **Keep evidence honest and specific.** Recapture the missing pre-hole intro and completed team/KB results. Future capture should fail or clearly flag a wrong tab/state instead of quietly producing a plausible but irrelevant image. Recheck normal phone heights, long names,135% text, keyboard/input and physical devices separately.

Suggested first repair batch: F26 (overlap), F01/F02/F10/F11/F16/F18 (state/format truth), F19/F20 (completed-play results), then F07 (room-facing line-up). Retest the affected journey and adjacent screen for each. Do not fix isolated labels while leaving contradictory cues on neighbouring screens.

**OWNER:** no new owner-only product decision is required for these corrections. The iPad layout proposal and other should/could recommendations can be challenged by the agents within the selected aesthetic. If a material departure is proposed, identify that departure with a concrete rendered alternative rather than asking the owner to re-explain the existing brief.

## All-screen coverage

A row without a finding means no additional visual defect was identified in that image; it does not certify interaction, accessibility or end-to-end correctness.

| Screen | Visual review outcome |
| --- | --- |
| [01](shots/01-pots-before-member-phone.png) | Retain the clear See the pots action; no additional visual finding. |
| [02](shots/02-pots-before-member-phone.png) | Retain the simple four-pot member grid. |
| [03](shots/03-draw-organiser-ipad.png) | F01; fixture warnings are legitimate setup warnings, not proposed for hiding. |
| [04](shots/04-draw-organiser-ipad.png) | F02. |
| [05](shots/05-draw-organiser-ipad.png) | No additional finding; setup and pace choices are understandable. |
| [06](shots/06-draw-organiser-ipad.png) | F03. |
| [07](shots/07-draw-organiser-ipad.png) | Retain the full-width current-team wheels. |
| [08](shots/08-draw-organiser-ipad.png) | No additional finding; the next draw action is clear. |
| [09](shots/09-draw-organiser-ipad.png) | F04. |
| [10](shots/10-draw-organiser-ipad.png) | F05. |
| [11](shots/11-draw-organiser-ipad.png) | Retain the large, names-first revealed team. |
| [12](shots/12-draw-organiser-ipad.png) | F06. |
| [13](shots/13-draw-organiser-ipad.png) | F07. |
| [14](shots/14-draw-organiser-phone.png) | F01; same fixture-warning caveat as03. |
| [15](shots/15-draw-organiser-phone.png) | F02. |
| [16](shots/16-draw-organiser-phone.png) | No additional finding beyond the paired iPad setup view. |
| [17](shots/17-draw-organiser-phone.png) | F03. |
| [18](shots/18-draw-organiser-phone.png) | Retain the current-team-only phone stage. |
| [19](shots/19-draw-organiser-phone.png) | No additional finding; primary action is evident. |
| [20](shots/20-draw-organiser-phone.png) | F04. |
| [21](shots/21-draw-organiser-phone.png) | F05. |
| [22](shots/22-draw-organiser-phone.png) | Retain the full current-team reveal. |
| [23](shots/23-draw-organiser-phone.png) | F06. |
| [24](shots/24-draw-organiser-phone.png) | Retain names-first phone line-up and quiet team labels. |
| [25](shots/25-draw-organiser-phone.png) | No additional visual finding; completed draw and ready start are distinguishable. |
| [26](shots/26-draw-organiser-phone.png) | No additional visual finding; organiser team membership is clear. |
| [27](shots/27-after-draw-member-phone.png) | No additional finding; round-details action fits the post-draw member state. |
| [28](shots/28-after-draw-member-phone.png) | F08. |
| [29](shots/29-after-draw-member-phone.png) | F09. |
| [30](shots/30-draw-watch-member-phone.png) | Retain the explicit Follow the draw action. |
| [31](shots/31-draw-watch-member-phone.png) | F10. |
| [32](shots/32-scramble-player-phone.png) | F11. |
| [33](shots/33-scramble-player-phone.png) | F12; the post-save nominee picker itself is clear. |
| [34](shots/34-scramble-player-phone.png) | F13; retain Drive before Score. |
| [35](shots/35-scramble-player-phone.png) | F13, F14; selected driver is visually clear. |
| [36](shots/36-scramble-player-phone.png) | F13; numeric score, points and ready Save are clear. |
| [37](shots/37-scramble-player-phone.png) | F13; next-hole reset and saved-hole toast are clear. |
| [38](shots/38-scramble-player-phone.png) | Retain the named drive ledger and separate team totals. |
| [39](shots/39-scramble-player-phone.png) | Retain provisional contest states; no additional visual finding. |
| [40](shots/40-scramble-player-phone.png) | F08. |
| [41](shots/41-scramble-player-phone.png) | F15. |
| [42](shots/42-scramble-organiser-phone.png) | F16, F17. |
| [43](shots/43-scramble-organiser-phone.png) | F18. |
| [44](shots/44-scramble-organiser-phone.png) | F18. |
| [45](shots/45-scramble-organiser-phone.png) | No additional visual finding; team allowance and editable team targets are clear. |
| [46](shots/46-scramble-player-phone.png) | Retain team-only finish and explicit minimum-drive KB explanation. |
| [47](shots/47-scramble-player-phone.png) | F19; final teams/KB view still needs its own correct capture. |
| [48](shots/48-scramble-player-phone.png) | F20. |
| [49](shots/49-groups-day-organiser-phone.png) | No additional visual finding; ordinary-round setup is legible. |
| [50](shots/50-groups-day-organiser-phone.png) | F21. |
| [51](shots/51-groups-day-organiser-phone.png) | F22. |
| [52](shots/52-groups-day-organiser-phone.png) | F24. |
| [53](shots/53-groups-day-organiser-phone.png) | No additional visual finding; selected group and reorder controls are clear. |
| [54](shots/54-groups-day-organiser-phone.png) | F22, F23. |
| [55](shots/55-withdraw-organiser-phone.png) | F17. |
| [56](shots/56-withdraw-organiser-phone.png) | F21; individual-round withdrawal instruction fits this format. |
| [57](shots/57-withdraw-organiser-phone.png) | F25. |
| [58](shots/58-withdraw-organiser-phone.png) | Retain the explicit withdrawn/hole badge; the toast is transient. |
| [59](shots/59-withdraw-player-phone.png) | F26. |

## Handoff

Claude: combine these numbered visual findings with your independently produced process review, preserving the difference between a visible defect, a proposed improvement and a missing evidence state. Verify each against the current combined head before editing; resolve routine corrections directly. Return one prioritised report and genuine updated views to the owner, rather than59 separate approval requests.

No source/queue/workflow changes, main merge, preview publication or live deployment was performed as part of this review.
