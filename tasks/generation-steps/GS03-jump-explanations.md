# GS03 — Jump explanations: cause, culprit, choice, first use, restricted check

| Header | Value |
|---|---|
| ID | GS03 |
| Depends on | GS02 (accepted and committed) |
| Estimated size | Large: about 600–1,000 lines of engine code and tests |
| Owner role | Engine (generator) |
| Milestone | M3 — every remaining jump carries the data that explains it |
| Design refs | `docs/generation-steps/report-detailed.md` R11, R13, R14, R15; §6.2; §7.4; §9.3 cases 1, 2, 8, 9 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The user accepted, at 13:54, that some score jumps stay — when no grouping or splitting of the recorded moves
removes them — on one condition: **the page must explain to the player why the score jumped**. In the example,
removing the pair of clues at R1C2 and R9C8 takes the score from 44 to 551, because the generator's solution then
uses Simple Colouring (weight 360).

This task computes, for every transition of tier `jump` (both views), the data of that explanation; GS06 turns
them into sentences. The data are honest by construction: they describe the generator's own solution and its
limited check, never a mathematical necessity.

- **Cause** (R14, decision Q10 b): which part of the move carries the jump — rated on partial boards that are never
  steps (Q2 a); a single culprit clue or sign is framed on the board.
- **The generator's choice** (Q11 ii): what the log records about the candidates compared before the move.
- **First use** (Q11 iii): the first deduction of the end board's solution that uses the new hardest technique.
- **Restricted check** (R11 h): whether this solver stops on the end board with only lighter techniques.

## Scope

### In scope

- `SG.replay.classifyShares`, `SG.replay.firstUse`, `SG.replay.restrictedCheck`.
- In `prepare`: after the ratings and the views, the explanations of every jump transition (`transition.cause`,
  `transition.choice`) and `analysis.proofs[position]` for their end positions; `options.explain === false` skips
  them; `options.probeNodes` (default `RATE_NODES`) guards every optional solve.
- Tests in `generator/tests/suites/replay.test.js`; documents (`generator/design.md` §7.5, both developer guides).

### Out of scope

- Every sentence and every drawing (GS06). The analysis stays language-neutral: ids, numbers and cell indexes.
- Changing the move model, the ratings, the views or the tiers (GS01, GS02); a defect there goes back to the
  orchestrator.

## Repository rules

- As GS01/GS02: classic script, pure, deterministic, lines ≤ 110 characters in `replay.js`, CRLF, quick suites
  only, no commit / stage / push / branch switch, no edit of the test data or of `tasks/generation-steps/`.
- **Optional work never undoes a rating**: every probe, first-use solve and restricted solve runs inside
  `try … catch`; a failure (guard, error, cancellation) leaves that piece `null` / `'unavailable'`, never removes a
  certified rating, never throws out of `prepare`.

## Inputs & context

### What GS02 delivered

`analysis.views.{compact, details}.steps[k] = { role, first, last, position, phases, kinds, transition }` and
`analysis.transitions[t] = { view, step, from, to, role, before, after, change, tier, ratio, newHardest, folded,
auditScope, cause: null, choice: null }` with `before` / `after` = `{ P, W, E, V, R, total, level, hardest,
counts }`. `analysis.moves[i]` = `{ kind, phase, removed, restored, sign, span, values, alive, at, … }` with
`span = { rated, refused, chosen, others, nulls, max, rejected, rejectedSigns, reasons, trail }`;
`analysis.rebuilt`, `analysis.randomOrder`, `analysis.signs`. `SG.replay.rateBoard(model, values, { rateNodes,
countNodes })` gives a `Rating` (status `rated` when the board is uniquely confirmed).

### New contracts

```text
Transition.cause (tier 'jump' only; else null) = {
  class: 'single-culprit' | 'together' | 'mixed' | 'single-sign' | 'single-cell' | 'multi-move' | 'unavailable',
  changes: [{ cell, action: 'remove' | 'restore' }],   // the move's changes: removed cells ascending, then restored
                                                       //   cells ascending ([] for a sign or several moves)
  singles: [{ cell, action, score }],                  // the score with that change alone, in `changes` order
  culprit: null | { cell, action, score, otherScore }, // single-culprit: otherScore = score of all the other changes
                                                       //   together without the culprit
  largest: null | { cell, action, score },             // mixed: the change with the largest share (ties: lower cell)
  sign: number | null,                                 // single-sign
  k: number | null, n: number | null, kMove: number | null,   // multi-move: the first change (1-based within the
                                                       //   step) whose rated board uses the new hardest technique
  verifiedOnly: boolean,                              // unknown earlier positions prevent claiming the first
                                                       //   occurrence outright; false for the other classes
  frame: null | { kind: 'cell', cell, action } | { kind: 'sign', sign }   // Q10 b: exactly one culprit clue or sign
}
Transition.choice (tier 'jump' only; else null) = {
  kind: 'guided' | 'random' | 'checked' | 'combined' | 'none',
  count,                                               // 'combined': number of moves in the step
  chosen, at, rated, refused, others, nulls, max       // 'guided': from the move's span (null otherwise)
}
analysis.proofs[position] = {                          // end positions of jump transitions (both views)
  firstUse: null | { k, n, technique, i18nKey, i18nArgs, eliminations: [[cell, digit]], placements: [[cell, digit]] },
  restricted: 'stuck' | 'complete' | 'unavailable'
}
SG.replay.classifyShares(before, after, singles) -> { class: 'single-culprit' | 'together' | 'mixed', index }
  // singles: [{ cell, score }] in change order; index: the culprit (single-culprit) or the largest share (mixed)
SG.replay.firstUse(model, values, technique, options) -> firstUse object | null
SG.replay.restrictedCheck(model, values, w, options) -> 'stuck' | 'complete' | 'unavailable'
```

### The cause (R14)

For a transition of tier `jump` into view step `st` (moves `st.first … st.last`), with `before = t.before.total`,
`after = t.after.total`:

1. **Several moves** (`st.last > st.first`): class `multi-move`; `n = st.last − st.first + 1`; `technique =
   t.after.hardest`. If it was already used before the step (`t.before.counts[technique] > 0`), leave `k` and
   `kMove` null: GS06 uses neutral combined-change text, not a false first-appearance claim. Otherwise find the
   first numeric-scored position with `counts[technique] > 0`, setting `k` (1-based within this step) and `kMove`.
   Set `verifiedOnly` when an earlier position within this step has no score; GS06 then explicitly says
   "first rated position". No frame. The known endpoint guarantees a match for a genuinely new technique.
2. One move `m = moves[st.last]`. A sign move: class `single-sign`, `sign = m.sign`, frame `{ kind: 'sign',
   sign }`.
3. `changes` = `m.removed` (action `remove`) then `m.restored` (action `restore`). One change: class
   `single-cell`, frame `{ kind: 'cell', cell, action }`. No change or more than `PROBE_MAX_CELLS` (4) changes:
   class `unavailable` (decision D11), no frame.
4. 2–4 changes: the start board is `moves[st.last − 1].values` (its alive signs are those of the move). For every
   proper non-empty subset of `changes` (bitmasks `1 … 2^k − 2`), apply its changes to a copy of the start board
   (`remove` → 0, `restore` → the solution's value) and rate it with `rateBoard(modelFor(alive), board,
   { rateNodes: probeNodes, countNodes: COUNT_NODES, forceCount: <the subset removes any clue> })`,
   inside `try … catch`. A remove/mixed probe must pass the independent count even when its logical proof
   claims uniqueness (R14). A pure restoration on the certified start board preserves uniqueness.
   Partial boards are probes only:
   never moves, never steps, never stored as ratings. Probe order: the single changes first, in `changes` order.
5. Any probe that is not `rated` (or throws) → class `unavailable`, no frame.
6. `singles[i].score` = the score of the subset `{ i }`. `classifyShares(before, after, singles)`: the share of a
   change is `max(0, ln(s / before) / ln(after / before))` (before > 0 and after > before for a jump). Exactly one
   share ≥ `CULPRIT_SHARE` (0.9) → `single-culprit`; else every share ≤ `TOGETHER_SHARE` (0.1) → `together`; else
   `mixed` (including two or more shares ≥ 0.9). `index` = the culprit, or for `mixed` the largest share (ties: the
   lower cell index).
7. `single-culprit`: `culprit = { cell, action, score, otherScore }` with `otherScore` = the score of the subset of
   all the other changes; frame `{ kind: 'cell', cell, action }`. `mixed`: `largest`. `together`: neither.

Measured on the 84 compact jumps of the research: 42 single-culprit, 21 together, 4 mixed, 4 single-sign,
13 multi-move, 0 single-cell, 0 unavailable; 46 frames; 146 partial ratings in 42.87 ms (largest case 9.33 ms,
14 boards, a 4-cell exchange). The example: removing R1C2 alone scores 550, R9C8 alone 44, so R1C2 (share 0.9993)
is the culprit and is framed.

### The generator's choice (R13 item 8)

| Step of the jump | `choice.kind` and fields |
|---|---|
| several moves | `combined`, `count` = number of moves |
| a rebuilt Killer log (`analysis.rebuilt`) | `none` |
| one `guided` move | `guided`, from its span: `chosen` (the chosen candidate's logged score, or null), `at` (its accept's log offset), `rated`, `refused`, `others`, `nulls`, `max` |
| one `random` move | `random` when `analysis.randomOrder`, else `checked` |
| one `exchange`, `searchRemove` or `sign` move | `checked` (the log holds no comparable-candidate scores for it) |
| one `reveal`, `searchAdd` or `clues` move | `none` |

A null `chosen` is not 0, not a time-out and not a failed uniqueness test: it is the proposal dig's objective for a
board its limited check did not finish, ranked above every finished one (`generator/js/engine/digger.js:369–371,
608–609, 644–671`). Cases: G13 (offset 229; 6 others, at most 72) and G14 (offset 84; 6 others, at most 66); the
witness move 76 of G14 (offset 167) has 16 candidates in its span, 13 rejects, 0 numeric others and 2 unscored.

### First use and restricted check (R11 h, R13 item 11)

For each end position `p` of a jump transition (once per position): `model = modelFor(moves[p].alive)`, `values =
moves[p].values`, `technique = t.after.hardest`, `w = t.after.P` (the weight of that technique):

- `firstUse(model, values, technique, { rateNodes: probeNodes })`: `rating = SG.difficulty.rate(model, values,
  { collectSteps: true, budget: SG.budget.create({ nodes }) })`; find the first index `i` of `rating.steps` with
  `steps[i].technique === technique`; return `{ k: i + 1, n: rating.steps.length, technique, i18nKey:
  steps[i].i18nKey, i18nArgs, eliminations, placements }` (plain copies; every effect of that deduction), or null
  when `rating.solved !== true`, when not found, or on any error. An attempted, unfinished proof is not the
  generator's solution. The step entries are `{ technique, i18nKey, i18nArgs, cells, eliminations:
  [[cell, value]], placements: [[cell, value]] }` (`core/js/engine/techniques.js:44–56`); their `i18nArgs`
  already hold cell labels (e.g. `colour1: 'R2C4, R6C6, …'`).
- `restrictedCheck(model, values, w, { rateNodes: probeNodes })`: `ids` = `SG.techniques.list()` ids that have
  a weight in `SG.difficulty.WEIGHTS` strictly below `w`; `report = SG.logicalSolver.solve(model, values,
  { allowedTechniques: ids, collectSteps: false, assumeUniqueness: true, budget })`; `'stuck'` when
  `report.status === 'stuck'`, `'complete'` when `'solved'`, else (or on any error) `'unavailable'`. GS06 shows its
  sentence only after `'stuck'`, inside "Why?".
- `analysis.proofs[p] = { firstUse, restricted }`.

Research numbers: the first use was found on the end board in 84 of 84 jump steps (median deduction 33 of 75;
56.77 ms in all, at most 3.96 ms); the restricted solve stopped on all 84 compact jump end boards and on the
13 golden after-boards, while all 13 golden before-boards completed (54.50 ms for the after-checks). Example:
deduction **32 of 47** (`technique.simpleColouring.step`, rule `trap`), candidate 3 removed from R5C2 and R8C3;
the restricted solve (weights below 360) stops.

### Progress

The explanations run after the ratings. Each probe, first-use solve and restricted solve is one unit of work:
`yield { done: total, total }` after each, so the page (main mode) and the worker can pre-empt between them.
Compute each `(from, to)` pair once **inside this one analysis** and share the immutable cause/choice between
the views. Never share a position-index cache across puzzles. Proofs remain keyed by their end position.

## Files to create/modify

### Exclusive ownership

- `generator/js/engine/replay.js`
- `generator/tests/suites/replay.test.js`

### Documentation slot

- `generator/design.md` §7.5: a subsection "Explaining a jump": the cause classes (table with their rule), the
  partial boards (never steps), the frame rule (exactly one culprit clue or sign), the choice kinds, the first use
  on the step's end board, the restricted check (only after a `stuck` restricted solve), and the rule that optional
  work never undoes a rating. Example numbers of the step 44 → 551.
- `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: one sentence: for every jump, `analysis.transitions` also holds
  its cause (probes of the parts of the move, never shown as steps), the generator's recorded choice and, in
  `analysis.proofs`, the first use of the new hardest technique; only `SG.x.y` names that exist.

## Implementation steps

1. `classifyShares`, `firstUse`, `restrictedCheck` (pure, guarded).
2. The cause and the choice of a jump transition; the proofs of its end position; dedupe by `(from, to)`.
3. Wire them into `prepare` after the views (yielding between units); honour `explain: false` and `probeNodes`.
4. Tests; documents; quick set.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| GS03-B01 | Every jump transition of the 14 goldens (13 compact, 16 details) carries a cause, a choice and a proof of its end position | `replay` suite |
| GS03-B02 | Partial boards are probes only (Q2 a): they are rated but never become moves, steps or ratings of the analysis | `replay` suite; review |
| GS03-B03 | A frame is given only when exactly one clue or sign causes the jump (Q10 b): the golden frames R1C2 (G01), R6C5 (G04), G2-R8C9 (G13), R8C4 (G14), sign 6 R2C4 < R1C4 (G11), and none elsewhere; two shares ≥ 0.9 give `mixed` and no frame | `replay` suite |
| GS03-B04 | The data of Q11: the generator's recorded choice per golden (e.g. G01 15 candidates, 5 rejected, 9 others at most 45, chosen 551 at offset 42; G13 / G14 chosen null), the first use (G01 32 of 47, Simple Colouring, candidate 3 removed from R5C2 and R8C3), the levels before and after | `replay` suite |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| GS03-T01 | Golden jumps: `cause.class`, frame, `singles` (action, cell label, score, in order), choice fields, `firstUse` (`k`, `n`, technique, `i18nKey`) and the effects string equal the golden data | `replay` suite |
| GS03-T02 | The probe order is fixed: removed cells first, then restored, each by cell index (G05) | `replay` suite |
| GS03-T03 | Restricted check: `'stuck'` on the 13 golden after-boards, `'complete'` on the 13 before-boards (with the after-board's `w`), `'unavailable'` with a guard of 1 | `replay` suite |
| GS03-T04 | Failure policy: `analyse(G01, { probeNodes: 1 })` keeps every rating, view and tier of the default analysis; its jump has cause `unavailable`, no frame, `firstUse` null, `restricted` `'unavailable'` | `replay` suite |
| GS03-T05 | `explain: false` gives the same moves, ratings, views and tiers with `cause`, `choice` null and `proofs` empty | `replay` suite |
| GS03-T06 | The analysis stays deterministic and language-neutral (no text, no function); the quick set passes; documents in both languages; CRLF | `replay` suite; command output; review |

## Test plan

### Exact Node commands

```powershell
$ErrorActionPreference = 'Stop'
Push-Location generator
try {
  node tests\node-runner.js --suite=replay
  if ($LASTEXITCODE -ne 0) { throw 'Replay suite failed' }
  node tests\node-runner.js --suite=help
  if ($LASTEXITCODE -ne 0) { throw 'Guide checks failed' }
  node tests\node-runner.js
  if ($LASTEXITCODE -ne 0) { throw 'Generator quick set failed' }
} finally { Pop-Location }
Push-Location player
try {
  node tests\node-runner.js --suite=help
  if ($LASTEXITCODE -ne 0) { throw 'Player guide checks failed' }
} finally { Pop-Location }
```

### Required test cases

Golden data: `SG.fixtures.replayGoldens[i].jumps[j] = { step, from, to, before, after, choice, singles, cause,
frame, firstUse: { k, n, technique }, key, effects }` and the culprit column `rows[k][8]`. Cell labels with
`SG.model.cellLabel(result.model, cell)`; a sign frame is written `'s' + sign + '(' + label(signs[sign][0]) + '<' +
label(signs[sign][1]) + ')'` (for example `s6(R2C4<R1C4)`); the effects string is `'remove candidate ' +
eliminations.map(([c, d]) => d + '@' + label(c)).join(', ')` in the order of `eliminations`.

| Case | Expected result |
|---|---|
| Golden causes (13 compact jumps) | for each golden jump: the compact transition into `step` has `cause.class === cause`; frame label (or null) `=== frame` (`'—'` in the fixture's `rows` means none); `singles` mapped to `{ op: action, cell: label, score }` equal the golden `singles` in order; the culprit column of every row equals the frame of that step's transition (or `'—'`) |
| Golden choices | golden `choice` object ↔ `choice.kind === 'guided'` with `chosen`, `at`, `rated`, `refused`, `others`, `nulls`, `max` equal; golden `null` ↔ kind `checked`, `combined` or `none` (G05 exchange: `checked`; G06, G10 step 8, G12: `combined`; G11: `checked`) |
| Golden first uses | `proofs[to].firstUse` has `k`, `n`, `technique` of the golden `firstUse`, `i18nKey === key`, and the effects string equals `effects` (G01 `remove candidate 3@R5C2, 3@R8C3`; G09 `2@R7C5, 5@R7C5`; G10 step 6 `1@R7C1, 6@R7C1, 7@R7C1, 9@R7C1`) |
| Example values | G01 step 4: class `single-culprit`, culprit R1C2 score 550, otherScore 44, frame `{ kind: 'cell', cell: <R1C2>, action: 'remove' }`; choice `{ kind: 'guided', chosen: 551, at: 42, rated: 15, refused: 5, others: 9, nulls: 0, max: 45 }`; first use 32 of 47 `technique.simpleColouring.step`; restricted `'stuck'` |
| G14 witness | `moves[76].span`: `rated` 16, `refused` 13, `others` 0, `nulls` 2; `moves[76].at` 167 |
| Restricted check | for each golden jump: `restrictedCheck(after board, after.P)` = `'stuck'`, `restrictedCheck(before board, after.P)` = `'complete'`; with `{ rateNodes: 1 }` → `'unavailable'` |
| Negative fixture (O3) | `classifyShares(44, 551, [{ cell: 1, score: 550 }, { cell: 79, score: 549 }])` → `mixed`, index 0 (no frame); `classifyShares(44, 551, [{ cell: 1, score: 550 }, { cell: 79, score: 44 }])` → `single-culprit`, index 0; `classifyShares(168, 529, [{ cell: 24, score: 168 }, { cell: 56, score: 168 }])` → `together` (G10 step 6) |
| Guarded probes | GS03-T04 |
| `explain: false` | GS03-T05 |
| Multi-move invariants | for G06, G10 step 8 and G12: `1 <= k <= n`, `n = last − first + 1`, `ratings[kMove].counts[after.hardest] > 0`, and no earlier move of the step has a score with that technique |
| Details jumps | every details transition of tier `jump` (16 in the goldens) has a non-null `cause` and `choice` and a proof at its `to` |
| Independent probe certification | Spy on the count in test setup: every subset containing a removal is independently counted; an ambiguous/guarded probe gives `unavailable`, never a frame, even if a stub logical proof claims success |
| Honest multi-move scope | A work-only jump whose hardest technique was already used has class `multi-move`, `k`/`kMove` null; a new technique after an unknown earlier position has `verifiedOnly: true`; no fabricated first occurrence |

## Definition of done & handoff

- All criteria have their evidence; the quick set passes; no golden number was edited.
- Handoff to GS06: the final shapes of `cause`, `choice`, `proofs`; the cause classes and when each sentence
  variant applies (removal-only moves use `culprit` / `culpritGroup` / `together` / `parts`; a move that restores
  any clue uses `culpritExchange`, `culpritRestore`, `togetherExchange`, `partsExchange`); the measured time of the
  explanations for the goldens.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
