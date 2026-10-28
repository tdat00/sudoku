# Check of gpt-6-astra's golden acceptance data — Generation Steps

- **Reviewer:** claude-opus-5.5 (Claude Opus 5.5, 1M context, max reasoning).
- **Date:** 2026-10-28.
- **Checked:** [`../gpt-6-astra/4-acceptance-data.md`](../gpt-6-astra/4-acceptance-data.md): the requests G01–G14,
  the controls of its §2, the Killer search of its §3 and the totals of its §0.
- **Against:** the final rules of the joint report draft [`../report-detailed.md`](../report-detailed.md) (R1–R19),
  applied by my own prototype (my move model and selector), not by gpt-6-astra's scripts.
- **Code:** `8d9510a`; Node v24.22.1, Windows.
- **Experiments:** `E\…` is my experiment folder (not part of the repository); the scripts of this check are in
  `E\xreview\`.
- **Scope:** research only; this file is the only file written in the repository. `git status --short` at the start
  and at the end: `?? docs/generation-steps/`.
- **Notation:** ✔ agrees, ✘ differs; "m" is the 0-based position in the move list (m = 0: the full solution).

## 0. Verdict in brief

1. **The golden data are right.** I generated the 14 requests again and compared 1,514 fields. All but 9 agree, and
   none of the 9 is a golden number:
   - 8 are the request's `variantOptions`. The file says every request has `variantOptions: {}` and that this is
     "the exact object returned by `SG.store.toConfig`". For Jigsaw, Killer, Greater-Than and Mega 16×16,
     `SG.store.toConfig` returns the variant's complete default options. Both forms give the same puzzle and log
     (8 of 8 digests equal), so only that sentence is wrong.
   - 1 is the order of G05's four singleton probes (mine by cell, theirs removed cells first). The values are the
     same.
2. **Every golden number agrees**, to 10⁻⁶ on the printed decimals:
   - the 101 compact rows (m, phase/title, E, score, Δ, hardest technique, jump flag, culprit, line);
   - the 814 details scores, the 7 fold notes and the alive-sign counts;
   - the 13 jump explanations: P, W, R, V, E and level before and after, the generator's check, the singletons,
     the cause class, the frame, the first use and the text key.
3. **The controls of its §2, the Killer search of its §3 and the totals of its §0 reproduce exactly**: 338 steps
   today with 129 lacking a table; 101 compact steps and 814 details steps; 0 and 41 decreases; 13 jumps and
   5 frames; 30 partial ratings; a largest rating work of 113,177 checks.
4. **The check shows six points that `report-detailed.md` should state** (§5):
   - the first use is taken on the step's end board (three of the report's numbers change);
   - with no rise condition, the "new hardest technique" line gives 155 lines in the details view, not 149;
   - the order of the singleton probes;
   - the counts of the choice sentence, and the case where the chosen removal's own check did not finish (G13, G14);
   - the class names of the analysis;
   - the request is built by `SG.store.toConfig`.

## 1. Method

- `E\xreview\p4b-check.js` reads gpt-6-astra's file (read-only) and parses every G section: the request, the counts
  of today's replay, the board line, the compact table, the details scores, the fold notes, the alive signs and each
  jump. It then builds each request with `SG.store.toConfig` (as the page does) and generates it with
  `SG.pipeline.run`. Finally it runs my prototype under the rules of `report-detailed.md`:
  - **moves**: R2, with the exchange as one move;
  - **ratings**: R5 (guard 1,000,000; the final reuses `result.rating`; a 200,000-node count when a proof assumes
    uniqueness);
  - **compact selection**: R7, with the audit of R8 and the restart folded;
  - **tiers**: R10, the jump rule and the new-hardest line without a rise condition;
  - **cause**: R14, with the share `max(0, log(s / before) / log(after / before))`, the culprit when exactly one share
    is ≥ 0.9, "together" when all are ≤ 0.1, and no frame when a probe fails;
  - **choice and first use**: R13, the round bound by the accept's log offset and the first use solved on the step's
    end board with `SG.difficulty.rate(…, { collectSteps: true })`.
- Today's replay is counted with `SG.player.buildSteps` and `SG.player.create({}).rateStep(p)`. A step has a
  numerical table when the rating is not null and has a positive technique count, as gpt-6-astra's §4 states.
- Fields compared per request:
  - 7 for the request, 2 for today's replay, 2 for the view sizes, 5 for the board;
  - 9 per compact row, 1 for the whole details sequence, plus the alive signs and the fold notes;
  - 27 per jump: from, to, 12 terms, 5 choice fields or "not applicable", singletons, class, frame, 5 first-use
    fields and the key.

  Numbers are compared exactly, except the printed decimals (10⁻⁶). Fold notes are compared both ways: a folded step
  that gpt-6-astra did not list would count as a mismatch.

## 2. Agreement per request

| # | Request | Today: steps / no table | Compact / details | Compact scores (mine = golden) | Jumps: class, frame | Fields | ✘ |
|---|---|---|---|---|---|--:|--:|
| G01 | Classic 9×9, Expert, 3275974478 | 21 / 10 | 7 / 33 | `0, 23, 44, 551, 568, 992, 992` | 44 → 551 single-culprit, R1C2 | 109 | 0 |
| G02 | Classic 9×9, Very easy, 1 | 7 / 1 | 5 / 23 | `0, 15, 25, 43, 43` | — | 63 | 0 |
| G03 | Classic 9×9, Nightmare, 42 | 12 / 1 | 6 / 29 | `0, 25, 44, 870, 1572, 1572` | 44 → 870 together | 100 | 0 |
| G04 | Classic 9×9, Hell 1, 2400651925 | 39 / 19 | 7 / 43 | `0, 27, 44, 47, 1206, 2879, 2879` | 47 → 1206 single-culprit, R6C5 | 109 | 0 |
| G05 | Classic 9×9, Hell 1, 2299986211 | 106 / 50 | 7 / 77 | `0, 27, 44, 50, 2010, 3274, 3274` | 50 → 2010 together (an exchange) | 105 | 1 (M2) |
| G06 | Jigsaw 9×9, Nightmare, 42 | 16 / 2 | 7 / 33 | `0, 25, 44, 49, 138, 1678, 1678` | 138 → 1678 multi-move | 106 | 1 (M1) |
| G07 | Jigsaw 9×9, Nightmare, 3962167687 | 17 / 2 | 9 / 33 | `0, 25, 43, 46, 252, 666, 1938, 1938, 1938` | 46 → 252 mixed | 128 | 1 (M1) |
| G08 | Killer, Very easy, 1 | 8 / 2 | 6 / 24 | `0, 0, 15, 25, 43, 43` | — | 72 | 1 (M1) |
| G09 | Killer, Expert, 3514204290 | 24 / 2 | 10 / 41 | `0, 0, 23, 42, 96, 98, 168, 533, 968, 968` | 168 → 533 mixed | 136 | 1 (M1) |
| G10 | Killer, Nightmare, 42 | 28 / 5 | 9 / 45 | `0, 0, 25, 98, 168, 529, 607, 1940, 1940` | 168 → 529 together; 607 → 1940 multi-move | 152 | 1 (M1) |
| G11 | Greater-Than, Expert, 42 | 23 / 22 | 9 / 114 | `0, 0, 135, 135, 242, 242, 973, 973, 973` | 242 → 973 single-sign, s6(R2C4<R1C4) | 126 | 1 (M1) |
| G12 | Greater-Than, Hard, 3115968914 | 12 / 11 | 5 / 106 | `0, 0, 130, 638, 638` | 130 → 638 multi-move | 90 | 1 (M1) |
| G13 | Samurai, Nightmare, 42 | 14 / 1 | 8 / 134 | `0, 25, 59, 69, 72, 1483, 1637, 1637` | 72 → 1483 single-culprit, G2-R8C9 | 118 | 0 |
| G14 | Mega 16×16, Hell 2, 12 | 11 / 1 | 6 / 79 | `0, 29, 65, 1646, 4476, 4476` | 65 → 1646 single-culprit, R8C4 | 100 | 1 (M1) |
| **All** | 14 requests | **338 / 129** | **101 / 814** | 101 rows ✔ | 13 jumps, 5 frames ✔ | **1,514** | **9** |

The 13 jump explanations, as my prototype computes them; every value equals the golden one:

| # | Jump | Singleton shares | Generator's check: chosen, other scored / unscored, maximum, accept offset | First use (end board) | Text key |
|---|---|---|---|---|---|
| G01 | 44 → 551 | R1C2 0.999281, R9C8 0 | 551, 9 / 0, 45, 42 | 32/47 | `technique.simpleColouring.step` |
| G03 | 44 → 870 | R2C3 0.00753, R8C7 0 | 870, 11 / 0, 45, 43 | 17/47 | `technique.xyWing.step` |
| G04 | 47 → 1206 | R4C5 0, R6C5 0.999744 | 1206, 1 / 0, 48, 66 | 22/60 | `technique.wWing.step` |
| G05 | 50 → 2010 | R2C1, R8C9, R4C6, R6C4: all 0 | not applicable (an exchange) | 12/75 | `technique.forcingChain.step.contradiction` |
| G06 | 138 → 1678 | — (4 moves) | not applicable | 16/71 | `technique.forcingChain.step.endpoints` |
| G07 | 46 → 252 | R1C4 0.63736, R9C6 0.012645 | 252, 12 / 0, 47, 73 | 21/63 | `technique.nakedPair.step` |
| G09 | 168 → 533 | R3C6 0, R7C4 0.610608 | 533, 2 / 0, 169, 203 | 17/116 | `technique.ruleOf45.step` |
| G10 | 168 → 529 | R3C7 0, R7C3 0 | 529, 3 / 0, 170, 208 | 28/113 | `technique.ruleOf45.step` |
| G10 | 607 → 1940 | — (several moves) | not applicable | 39/127 | `technique.forcingChain.step.contradiction` |
| G11 | 242 → 973 | — (one sign) | not applicable | 25/61 | `technique.xyWing.step` |
| G12 | 130 → 638 | — (several moves) | not applicable | 47/75 | `technique.simpleColouring.step` |
| G13 | 72 → 1483 | G2-R8C9 1, G3-R2C1 0 | **null**, 6 / 0, 72, 229 | 209/228 | `technique.forcingChain.step.contradiction` |
| G14 | 65 → 1646 | R8C4 1.001126, R9C13 0 | **null**, 6 / 0, 66, 84 | 84/146 | `technique.forcingChain.step.contradiction` |

In every jump the number of proof steps equals the sum of the technique counts of the end board (47, 47, 60, 75, 71,
63, 116, 113, 127, 61, 75, 228, 146), so the ordinal is counted in the same proof as the table.

## 3. The mismatches and their causes

**M1 — the request's `variantOptions` (8 requests: G06, G07, G08, G09, G10, G11, G12, G14).**

- Mine: `{ compactness: 0.6 }` (Jigsaw), `{ cageSize: 0 }` (Killer), `{ futoshiki: false }` (Greater-Than),
  `{ symbolSet: 'hex' }` (Mega 16×16). The golden §1.1 says `{}`.
- Cause: `SG.store.toConfig` sanitises the state, and its options are "always complete for the variant"
  (`generator/js/ui/store.js:12, 231, 258–272`). gpt-6-astra's own snippet in its §4 (item 1) passes
  `variantOptions: {}` through `toConfig` and also gets the complete options (`E\xreview\out-p4b-config.txt`).
- Who is right: `toConfig` is what the page sends, so the §1.1 sentence is wrong. The data are not affected: with a
  literal `{}` the pipeline fills the same defaults, and the puzzle and log are the same for all 8 requests (equal
  digests of givens, solution, score and log).
- Fix: in its §1.1, say "the variant's default options, as `SG.store.toConfig` fills them". Tests build the request
  with `SG.store.toConfig`, as its §4 already does.

**M2 — the order of G05's singleton probes.**

- Mine: R2C1, R4C6, R6C4, R8C9 (cell order). Golden: R2C1, R8C9 (removed), then R4C6, R6C4 (shown again).
- The scores are the same (50, 50, 49, 49; every share 0, class "together").
- Cause: the spec does not fix an order, and a test that compares arrays needs one. I propose the golden order: removed
  cells first, then cells shown again, each by cell index. It also reads naturally in the sentence about an exchange
  (§5, S3).

## 4. Controls and totals

| Item | gpt-6-astra | Mine | |
|---|---|---|---|
| §2.1 G01, m 26–30 (all 568, E 51, P 360, Pointing 2, Box/Line 1, Simple Colouring 2) | Naked / Hidden Single (box) / W: 29/22/906.5, 30/21/906.25, 30/21/906.25, 31/20/906, 28/23/906.75 | the same | ✔ |
| §2.2 G04, today's step 35 | `guided`; that givens string; 3422, solved, proof assumes uniqueness; ≥ 2 solutions; absent from the moves; final 2879 | the same (count 2 at its cap of 2) | ✔ |
| §2.3 G01, today's step 11 | that givens string; `stuck`, unsolved, E 53; counts NS 2, HSB 15, Pointing 6, Box/Line 1, Naked Pair 2, Hidden Pair 2, W-Wing 2, Unique Rectangle 1, Forcing Chain 4; ≥ 2 solutions | the same; absent from the moves | ✔ |
| §2.4 a guard of one check | `budget.exceeded`; the final keeps 992 | the same; with the guard at 1 for the whole analysis, 30 of 32 positions are capped and the final keeps 992 (`final`) | ✔ |
| §2.5 restart, synthetic | compact positions 0, 4, 5, 6, 7, 8; compact `0, 0, 23, 44, 600, 992, 992`; details `0, 23, 44, 551, 0, 23, 44, 600, 992, 992` | the same, with one phase or with random / guided / search phases | ✔ |
| §3 Killer rebuilt log | G09's 208-entry log not rebuilt; the 39-entry synthetic copy recognised; 8 searches with final scores 1031, 571, 642, 665, 1078, 573, 1921, 1100, none rebuilt (8,006.840 ms) | the same; my move model gives the copy 39 positions ending on the givens; the 8 searches 7,736.7 ms | ✔ |
| §0 today: steps / without a table | 338 / 129 | 338 / 129 | ✔ |
| §0 compact / details, all numerical | 101 / 814 | 101 / 814 | ✔ |
| §0 decreases compact / details | 0 / 41 | 0 / 41 (G06 1, G07 1, G10 2, G11 24, G12 13) | ✔ |
| §0 jumps / culprit frames | 13 / 5 | 13 / 5 (R1C2, R6C5, s6, G2-R8C9, R8C4) | ✔ |
| §0 partial-board ratings | 30 | 30 (8 pairs × 2 and one 4-cell exchange × 14) | ✔ |
| §0 largest work of one rating | 113,177 | 113,177 at G14 m 76; the final m 77 needs 123,741 but is reused, never rated (R5) | ✔ |

Generating the 14 requests took 24,659.8 ms here (gpt-6-astra: 24,580.875 ms); times are not golden values.

## 5. Spec clarifications for `report-detailed.md`

I do not edit the draft now; these are for the corrections round.

**S1. The first use is taken on the step's end board.**

- R13 item 7 does not say which board. The goldens use the end board, the one whose P, W and E the disclosure shows,
  and my checker matched all 13 that way.
- The report's numbers came from `E\xreview\p4-cost.js`. For the 13 several-move jumps it solved the board where the
  technique first appears, which differs from the end board in 12 of them. Examples: Jigsaw Nightmare 42, step 6,
  end board 16/71 against 25/75; G12, end board 47/75 against 52/80.
- On the end boards of the 84 jumps of the 107-request corpus (`E\xreview\out-p4b-extra.txt`): 56.77 ms in all
  (was 64.37 ms), maximum 3.96 ms (was 6.32 ms), median proof step 33 of 75 (was 33 of 76). The median time of one
  solve (0.41 ms in the report) was not measured again.
- Places to change: Executive summary item 10 (140.02 ms becomes 132.42 ms = 42.87 + 56.77 + 32.78), R13 "Evidence",
  §7.4 "First use found" and §7.5 "First use".
- The lighter-only check of R11 h is also meant for the end board. My phase-3 wording check already used it: 0 of 84
  jump boards finish with lighter techniques, so "stopped in 84 of 84" stands.

**S2. The new-hardest line has no rise condition.**

- R10 (aligned with the goldens) gives the line whenever the end board's hardest technique was not used by the step
  before.
- Compact view: still 124 lines; no compact step keeps or lowers the score while bringing a new hardest technique.
- Details view: **155** lines, not 149; 6 of them are at an equal or lower score.
- Places to change: R10 "details 107, 90 in 76 runs, 149" and §7.1 "107 / 149" become 155.

**S3. The order of the singleton probes:** removed cells first, then cells shown again, each by cell index (M2).

**S4. The choice sentence.**

- (a) `{others}` counts the other candidates with a logged score (golden "other scored"); `{nulls}` counts those
  without one (golden "other unscored").
- (b) The analysis also keeps the chosen candidate's own logged score, or null, and the accept's log offset. The
  goldens test both; R15's `choice` lists neither.
- (c) In G13 and G14 the chosen removal's own logged score is null. These are the top tiers' proposal dig: the
  generator's check without the chain techniques could not finish the board, and its objective ranks such a removal
  above every removal it could finish (`generator/js/engine/digger.js:369–371, 608–609, 644–670`). The sentence
  should say so; otherwise "the other 6 would have scored at most 72" reads as if the chosen one had a score too.
  Proposed key `steps.jump.choice.chosenStuck`:
  - EN: "Its own check could not finish this removal, and the generator ranks such a removal above every removal it
    could finish."
  - VI: "Phép kiểm tra của chính nó không giải hết được cách xóa này, và trình sinh đề xếp cách xóa như vậy trên mọi
    cách nó giải hết được."

  The golden wording "check unfinished" is right but vague: it is a board that could not be finished without chains,
  not a time-out, as gpt-6-astra itself notes.

**S5. Class names.** R14 names the causes culprit, together, parts, single and grouped. The goldens name them
single-culprit, together, mixed, single-sign and multi-move. The analysis (R15 `cause.class`) needs one set; I propose
the goldens' names, plus `single-cell` for a group of one cell (no golden case).

**S6. The request.** Tests build it with `SG.store.toConfig`, with the variant's complete options (M1).

No other change is needed: the phase codes of the rows (including `G+A/Mixed`, `C+I/Mixed` and `I+A+IM/Mixed`), E for
multigrid cells, the alive-sign model, the folded notes, the sign frame format and the audit all match R2–R14 as
drafted.

## 6. Not checked

- gpt-6-astra's payload digests: the file does not give the hashing scheme. I compared the puzzles field by field
  instead.
- Its timing figures, which are not golden values.
- Its scripts, which I did not run: the check uses my own code only.
- The texts of the details view: the goldens give its scores, not its lines or sentences.
- The UI: nothing is implemented yet.

## Appendix — experiments

All in `E\xreview\`; they load `core/` and `generator/` read-only through my helpers `E\lib.js` and `E\moves.js`, and
`E\xreview\converged.js` (the selector of the joint report).

| Script | Output | What it does | Time |
|---|---|---|---|
| `p4b-check.js` | `out-p4b-check.txt`, `out-p4b-check.json` | parses the golden file, generates the 14 requests, compares 1,514 fields; the controls of §2 and §3 | 35 s |
| `p4b-config.js` | `out-p4b-config.txt` | `toConfig`'s options for the 8 requests with options; digests with complete options and with `{}` | not timed |
| `p4b-extra.js` | `out-p4b-extra.txt` | decreases, partial ratings and rating work on the 14; on the 107-request corpus, the lines with and without a rise and the first use on the end board | 123 s |
| `p4b-work.js` | `out-p4b-work.txt` | rating work of every position of G14 | not timed |
| `p4b-show.js` | — | prints the per-request summary of `out-p4b-check.json` | — |

Commands, run in `E\`: `node xreview\p4b-check.js > xreview\out-p4b-check.txt 2> xreview\out-p4b-check.err`,
`node xreview\p4b-config.js`, `node xreview\p4b-extra.js > xreview\out-p4b-extra.txt`, `node xreview\p4b-work.js`.
The error streams were empty.

Raw numbers quoted above:

- Generation in ms: G01 138.3, G02 1.6, G03 226.6, G04 492.5, G05 376, G06 20.3, G07 23.2, G08 5.6, G09 7,741.1,
  G10 2,254.8, G11 8,564.7, G12 4,072, G13 100.2, G14 642.9.
- Ratings of the analysis, in ms (fresh ratings): G01 2.21 (30), G04 24.44 (34), G05 19.23 (31), G11 41.96 (110),
  G13 21.51 (131), G14 578.93 (76).
- Work of G14: the three largest are m 77 with 123,741 checks, m 76 with 113,177 and m 75 with 99,591. In
  `p4b-extra.js`, which rated the positions in another order, the final position measured 123,742.
- First use on the corpus, the 12 several-move jumps whose end board differs from the first-appearance board (end
  board against first-appearance board):

  | Request | Step | End board | First appearance |
  |---|--:|---|---|
  | Greater-Than Expert 1 | 5 | m 99, 47/74 | m 82, 56/90 |
  | Jigsaw 9×9 Nightmare 42 | 6 | m 31, 16/71 | m 29, 25/75 |
  | Classic 9×9 Nightmare 1191943706 | 5 | m 28, 19/64 | m 27, 13/69 |
  | Samurai Nightmare 2591681282 | 7 | m 119, 207/245 | m 115, 204/241 |
  | Killer Hard 2449675408 | 7 | m 41, 15/138 | m 39, 19/134 |
  | Killer Expert 3530981909 | 7 | m 37, 9/100 | m 35, 11/98 |
  | Killer Nightmare 1445283430 | 8 | m 40, 78/139 | m 38, 58/156 |
  | Greater-Than Hard 3115968914 | 4 | m 103, 47/75 | m 93, 52/80 |
  | Greater-Than Expert 138818955 | 5 | m 90, 44/86 | m 81, 45/87 |
  | Greater-Than Expert 155596574 | 5 | m 101, 51/79 | m 93, 58/86 |
  | Greater-Than Expert 172374193 | 5 | m 95, 52/75 | m 72, 58/79 |
  | Greater-Than Nightmare 733709325 | 6 | m 106, 43/85 | m 95, 42/105 |
