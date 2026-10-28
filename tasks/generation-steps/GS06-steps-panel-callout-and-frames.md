# GS06 — Steps panel: table states, tiers, jump callout, "Why?", culprit frames

| Header | Value |
|---|---|
| ID | GS06 |
| Depends on | GS05 (accepted and committed) |
| Estimated size | Large: about 1,000–1,400 changed lines (code, styles, strings, tests, documents) |
| Owner role | Generator UI + core board |
| Milestone | M6 — every step shows its table; every jump is explained on the page |
| Design refs | `docs/generation-steps/report-detailed.md` R9, R10, R11 a–h, R13, R14 (frames), R17; §6.2; §8 (`steps.*`); §9.3 cases 1, 4, 6–10, 12 (traceability only) |
| Implementation status | Not started |

## Goal & business context

After GS05 every step has a table model, and the panel shows today's table for scored steps through an adapter.
This task draws what the user asked for and decided:

- **N2**: a table on **every** step — the replay's start, the zero steps (solution, cages, signs, "Starting
  again"), every scored step with the change of its Total ("551 (+507)", "992 (unchanged)"), and, in the details
  view, the honest status of a board that cannot be rated (Q14 a, Q18 b: no retry);
- **N4** (13:54): a genuine jump is explained on the page; **Q4 b** (15:30): the badge "Score jump ×{ratio}" and the
  callout when the rise is at least ×3 **and** at least +100 with a positive score before; every new hardest
  technique still gets one line; the first scored step is "First rated puzzle", with no multiplier;
- **Q5 a** (15:30): two or three visible sentences, then a "Why?" disclosure; **Q11 i+ii+iii** (16:20): the level
  before → after, the generator's recorded choice, the first use of the new technique;
- **Q10 b** (16:20): a frame on the board, with a legend entry, only when exactly one clue or sign causes the jump;
- **Q16 a**: no slider marks, no proof drawn on the board.

Every sentence speaks of **the generator's solution**, never of what the puzzle "needs" in general (R11 a).

## Scope

### In scope

- `generator/js/ui/step-view.js`: the `table` option (replaces `stats`), the table states, the Total's change, the
  status branch, the tier line, the heading badge, the callout and "Why?", the row label, the legend entries of the
  culprit frames; a pure text model `SG.stepView.explain(table, step)`; the `steps.*` strings.
- `generator/js/ui/player.js`: the culprit frames in the steps of both views (`marks.cause`, `marks.causeRestore`,
  `signs.cause`), `MARK_CLASSES`, `viewAt`, `render`; five `replay.*` strings.
- `generator/js/ui/app.js`: the steps panel gets `table: p => player.tableAt(p)` (the GS05 adapter goes).
- `generator/css/steps.css` (badge, tier line, callout, "Why?", row label, Total highlight, status tables, legend
  swatches), `core/css/board.css` (`cell--cause`, `sign--cause`), `core/js/ui/board-view.js` (`setSignMarks` accepts
  a `cause` list).
- `generator/js/ui/help.js` (`help.generation.replay`: one more sentence, EN and VI).
- Tests: `generator/tests/suites/steps.test.js`, `generator/tests/suites/player.test.js` (frames).
- Documents: both user guides, both developer guides (the steps panel), `generator/design.md` §7.3 (the step
  description bullet), §10.5, §13.12.

### Out of scope

- The analysis, the views, the step texts, the preparation (GS01–GS05). A wrong number in a callout is a defect of
  the data (report it), not something to recompute in the UI.
- Slider marks, a drawn proof, a retry button (decided: never).

## Repository rules

- Classic scripts on `SG`; UI files load without a DOM; colours only through existing tokens (`--sg-color-accent`,
  `--sg-color-accent-soft`, `--sg-color-border`, `--sg-color-surface`, `--sg-color-text-muted`, `--sg-board-probe`);
  no animation; text plus border so that colour is never the only signal; `currentColor` in the
  `@media (forced-colors: active)` block.
- Every string through `SG.i18n.t()`, EN and VI, same placeholders per key, plural pairs; numbers formatted with
  `SG.i18n.formatNumber` (the locale's decimal separator).
- A `core/` change: run both apps' quick sets. 2-space indent, single quotes, semicolons; UTF-8 without BOM, CRLF.
- Quick suites only; no commit / stage / stash / push / branch switch; do not edit `tasks/generation-steps/`.

## Inputs & context

### The table model (GS05; `player.tableAt(p)`)

```text
TableModel = { state: 'start' | 'zero' | 'scored' | 'final' | 'status',
               status: null | 'capped' | 'stuck' | 'ambiguous' | 'unverified', reasons: [string],
               counts, before, empties, score, change, transition, proof, position }
transition = { view, step, from, to, role ('step' | 'final'), change, tier ('first' | 'jump' | 'newPeak' | null),
               ratio, newHardest, auditScope ('complete' | 'ratedOnly' | null), folded,
               before: Terms, after: Terms, cause, choice }
Terms = { P, W, E, V, R, total, level, hardest, counts }
cause = { class: 'single-culprit' | 'together' | 'mixed' | 'single-sign' | 'single-cell' | 'multi-move'
          | 'unavailable', changes: [{ cell, action }], singles: [{ cell, action, score }],
          culprit: null | { cell, action, score, otherScore }, largest: null | { cell, action, score },
          sign, k, n, kMove, verifiedOnly, frame: null | { kind: 'cell', cell, action } | { kind: 'sign', sign } }
choice = { kind: 'guided' | 'random' | 'checked' | 'combined' | 'none', count, chosen, at, rated, refused, others,
           nulls, max }
proof = { firstUse: null | { k, n, technique, i18nKey, i18nArgs, eliminations: [[cell, digit]],
                             placements: [[cell, digit]] },
          restricted: 'stuck' | 'complete' | 'unavailable' }
```

The `Step` of the view (`player.getStep(p)`) gives `role`, `first`, `last`, `position`, `context`, `marks`,
`signs`. Use **`step.context.moves`** and **`step.context.signs`**, explicitly supplied by GS05; there are no
free `analysis` or `built` variables inside `explain`. Slice moves by `first … last`; resolve `kMove` in the
same full move array. Sign pairs satisfy `value[a] < value[b]`. Cell names: `SG.i18n.cellLabel(cell)`
(the app installs a labeler of the result's model, so multigrid cells read `G2-R8C9`). Level names:
`SG.i18n.t('difficulty.' + level)`. Technique names: `SG.i18n.t('technique.' + id)`.

### Today's code (anchors at `8d9510a`)

- `generator/js/ui/step-view.js`: `LEGEND` 27–29, `usesMark` 31–35, `create` 281 (options doc 271–280), `renderLegend`
  309–322, `renderHeading` 324–332, `scoreCell` 397–409, `techniquesBlock` 415–518 (the Total row 488–495), `render`
  520–543, the instance 548–580, `SG.stepView` 597–606, locale fragment 608–693.
- `generator/js/ui/player.js` (after GS05): `MARK_CLASSES`, `viewAt`, `render`, `buildViews`.
- `core/css/board.css`: replay frames 220–240 (`cell--dug`, `cell--kept`, `cell--revealed`), signs 242–254, the
  highlight base `.sgb .hl` (stroke-width 3) line 196, forced colours 383.
- `core/js/ui/board-view.js`: `applySignMarks` 983–993, `setSignMarks` 1177–1184.

## The text model (`SG.stepView.explain(table, step)`)

A pure function (strings in the current language) that `create` renders and the tests read:

```text
explain(table, step) -> {
  total: string | null,     // the Total cell: null (start, status); score with its change (including a details
                            //   restart's real negative delta; ordinary introductory zero steps just read '0'):
                            //   change null -> fmt(score); 0 -> steps.techniques.unchanged; else
                            //   steps.techniques.change with change '+507' or '−20' (U+2212)
  badge: null | { kind: 'jump' | 'first', text },
  line: string | null,      // tier first -> steps.first; tier newPeak -> steps.newPeak; else null
  rowLabel: null | { technique, text },   // steps.techniques.newPeak on after.hardest when transition.newHardest
                                          //   and the tier is 'jump' or 'newPeak'
  totalHighlight: boolean,  // tier jump and not newHardest
  callout: null | { heading, sentences: [S1, S2, S3?], why: [string] },   // tier jump only
  status: null | { sentences: [string], attempted: string | null }        // state status only
}
```

Formats: `fmt(x)` = `formatNumber(x)`; `fmt2(x)` = `formatNumber(x, { maximumFractionDigits: 2 })`; `signed(d)` =
`'+' + fmt2(d)` when `d >= 0`, else `'\u2212' + fmt2(-d)` (a term's change is rounded after the subtraction:
V 42.352941 − 41.445783 → "+0.91"); `list(items)` = the items joined with ", " and the last two with
`replay.list.last`; `name(cell)` = the cell label; `tech(id)` = the technique name.

### Tier and line (R10)

| Tier of `table.transition` | Badge | Line |
|---|---|---|
| `first` | `{ kind: 'first', text: steps.first.label }` | `steps.first` `{ score: fmt(after.total), technique: tech(after.hardest) }` |
| `jump` | `{ kind: 'jump', text: steps.jump.badge { ratio } }` with `ratio = formatNumber(transition.ratio, { minimumFractionDigits: 1, maximumFractionDigits: 1 })` (×12.5, VI ×12,5; ×3.0; ×3.3) | none (the callout) |
| `newPeak` | none | `steps.newPeak` `{ technique: tech(after.hardest), w: fmt(after.P), previous: tech(before.hardest), previousW: fmt(before.P) }` — also on a flat or falling transition (details view) |
| null | none | none |

### The callout (tier `jump`; R13)

- `heading`: `steps.jump.heading` `{ from: fmt(before.total), to: fmt(after.total), change: signed(after.total −
  before.total) }`.
- The change fragment `{change}` of the step (and of a single move for `grouped`):

| Moves | Fragment |
|---|---|
| several moves | `steps.jump.change.moves` `{ count: number of moves }` |
| one sign move | `steps.jump.change.sign` `{ sign: replay.sign { a: name(signs[s][0]), b: name(signs[s][1]) } }` |
| one move with removed and restored cells | `steps.jump.change.exchange` `{ removedCells: list(names), restoredCells: list(names) }` |
| one move with removed cells only | `steps.jump.change.remove` `{ count: removed.length, cells: list(names) }` |
| one move with restored cells only | `steps.jump.change.restore` `{ count: restored.length, cells: list(names) }` |

- **S1**: `after.hardest !== before.hardest` → `steps.jump.uses` `{ change, technique: tech(after.hardest), count:
  after.counts[after.hardest], previous: tech(before.hardest) }` (plural by `count`); otherwise `steps.jump.work`
  `{ change, from: fmt2(before.W), to: fmt2(after.W) }`.
- **S2**: `steps.jump.full` `{ w: fmt(after.P) }`.
- **S3** (the cause; none when `cause` is null). "Restores" = any change of the move has action `restore`:

| `cause.class` | Sentence |
|---|---|
| `single-culprit` | culprit action `restore` → `steps.jump.cause.culpritRestore` `{ cell, score, otherScore }`; else the move restores → `steps.jump.cause.culpritExchange` `{ cell, score, otherScore }`; else 2 changes → `steps.jump.cause.culprit` `{ cell, score, other: name(the other change), otherScore }`; else (3–4) → `steps.jump.cause.culpritGroup` `{ cell, score, count: changes.length − 1, otherScore }` |
| `together` | restores → `steps.jump.cause.togetherExchange` `{ scores, after }`; else `steps.jump.cause.together` `{ scores, after }` — `scores` = `list(singles.map(s => fmt(s.score)))`, `after` = `fmt(after.total)` |
| `mixed` | restores → `steps.jump.cause.partsExchange`, else `steps.jump.cause.parts`, both `{ cell: name(largest.cell), score: fmt(largest.score), after: fmt(after.total) }` |
| `single-sign` | `steps.jump.cause.sign` |
| `single-cell` | action `restore` → `steps.jump.cause.cellRestore`; else `steps.jump.cause.cell` |
| `multi-move` | `k === null` → `steps.jump.cause.combined` `{ count: n }`; otherwise `verifiedOnly` → `steps.jump.cause.groupedRated`, else `steps.jump.cause.grouped`, with `{ technique: tech(after.hardest), k, n, change: the fragment of move kMove }` |
| `unavailable` | `steps.jump.cause.unavailable` |

(`cell`, `score`, `otherScore` are `name(culprit.cell)`, `fmt(culprit.score)`, `fmt(culprit.otherScore)`.)

- **"Why?"** (`why`, in this order, one line each):
  1. `steps.jump.p` `{ from: fmt2(before.P), to: fmt2(after.P), change: signed(after.P − before.P) }`
  2. `steps.jump.w` `{ from: fmt2(before.W), to: fmt2(after.W) }`
  3. `steps.jump.r` `{ from: fmt2(before.R), to: fmt2(after.R), change: signed(after.R − before.R) }`
  4. `steps.jump.e` `{ from: fmt(before.E), to: fmt(after.E) }`
  5. `steps.jump.v` `{ from: fmt2(before.V), to: fmt2(after.V), change: signed(after.V − before.V) }`
  6. `steps.jump.total` `{ from: fmt(before.total), to: fmt(after.total), change: signed(after.total −
     before.total) }`
  7. `steps.jump.level` `{ from: levelName(before.level), to: levelName(after.level) }`
  8. The generator's choice (`transition.choice`): kind `guided` → when `others ≥ 1`: `steps.jump.choice.guided`
     `{ count: others, rated, refused, max: fmt(max) }`, then `steps.jump.choice.nulls` `{ count: nulls }` when
     `nulls ≥ 1`; when `others = 0` and `nulls ≥ 1`: `steps.jump.choice.span` `{ rated, refused }` then
     `steps.jump.choice.noScores`; when `others = 0` and `nulls = 0`: `steps.jump.choice.span` (only when `rated ≥ 2`)
     then `steps.jump.choice.only`; after these, when `chosen === null`: `steps.jump.choice.chosenUnscored`. Kind
     `random` → `steps.jump.choice.random`; `checked` → `steps.jump.choice.checked`; `combined` →
     `steps.jump.choice.none` `{ count }`; `none` or null → nothing. (`rated`, `refused`, `count` are bare numbers.)
  9. `proof.restricted === 'stuck'` → `steps.jump.lighter` `{ w: fmt(after.P) }` (never after `complete` or
     `unavailable`).
  10. `transition.auditScope === 'ratedOnly'` → `steps.jump.auditScope`.
  11. `proof.firstUse` → `steps.jump.firstUse` `{ k, n }`; then `SG.i18n.t(firstUse.i18nKey, firstUse.i18nArgs)`;
      then the effects: group `eliminations` by cell (digits ascending), cells with the same digit set together (in
      order of first appearance), one `steps.jump.removedHere` `{ count: digits.length, digits: list(digits), cells:
      list(names) }` per group; one `steps.jump.placedHere` `{ digit, cell: name(cell) }` per placement.
  12. `steps.jump.scope`.

### Status tables (`state: 'status'`; R9)

`sentences`: when reasons include `missingRating`, use `steps.status.missingRating`; when they include
`contradiction`, use `steps.status.contradiction`; otherwise use the status's usual sentence. Append
`steps.status.ambiguous` when also known (without duplicating it). Never describe missing data as a solver run.
`attempted`: `steps.status.attempted` when `counts` has at least one technique, else null. The rows are drawn as
"technique — uses" only: no points, work or score cells, no tooltips, no Total, no retry button.

## Rendering (`SG.stepView.create(rootEl, { table })`)

- The option `stats` is replaced by `table(position) -> TableModel | null`. Without it, no table is drawn (today's
  behaviour without `stats`).
- `render()`: no steps → nothing (as today). Position 0 → today's hint `steps.detail.empty`, then a techniques block
  with its heading `steps.techniques.title` and the line `replay.start.noScore`. A step → meta, text, the tier line
  (`<p class="step-tier">`), the callout (below the text, above the table), then the techniques block by state:
  - `zero`: the heading, `steps.techniques.none`, and a table with only the Other section's "Empty cells" row
    (uses 0, score 0) and the Total from `explain().total` (normally "0"; a details restart can show its drop);
  - `scored` / `final`: today's table; the Total cell's `data-role="score"` text is `explain().total`; the row of
    `rowLabel.technique` gets `<span class="step-table__label" data-role="new-hardest">` with its text inside the
    name cell; `totalHighlight` adds `step-table__total--jump` to the Total row. The uses column keeps "(+n)"
    against `table.before` (no per-row score change);
  - `status`: the sentences (`<p class="step-status">`), the attempted note, the rows (name, uses).
- The callout: `<div class="step-callout" data-role="jump">` with `<p class="step-callout__heading">`, one
  `<p class="step-callout__text">` per visible sentence, and `<details class="step-why"><summary>` (text
  `steps.jump.why`) `</summary><ul class="step-why__list">` one `<li>` per line `</ul></details>` — closed by
  default; keyboard and touch work through the native element.
- `renderHeading()`: today's text node, then, when `explain().badge`, a `<span class="step-badge
  step-badge--jump|first">` with the badge text (text, not colour only).
- Legend: three more entries, shown only when a step of the view uses them: `['cause',
  'replay.legend.cause.cell']`, `['causeRestore', 'replay.legend.cause.restore']`, `['signCause',
  'replay.legend.cause.sign']` (`usesMark`: `marks.cause`, `marks.causeRestore`, `signs.cause` non-empty).
- Everything re-renders on a change of language (no solver call).

## Culprit frames (`player.js`; Q10 b, R14)

In `buildViews`, for every step whose transition has tier `jump` and a `cause.frame`:

- `{ kind: 'cell', cell, action: 'remove' }` → `marks.cause = [cell]` and `cell` leaves `marks.dug`;
- `{ kind: 'cell', cell, action: 'restore' }` → `marks.causeRestore = [cell]` and `cell` leaves `marks.revealed`;
- `{ kind: 'sign', sign }` → `signs.cause = [sign]` and **keep it in `signs.removed`**. The original sign is still
  a removed, inactive constraint; the culprit marker is a separate frame around its gap, not a bold live sign.

Every step has `marks.cause` and `marks.causeRestore` (empty arrays by default) and, with signs, `signs.cause`;
`viewAt` at position 0 too. `MARK_CLASSES` gains `cause: 'cell--cause'` and `causeRestore: 'cell--cause'`; `render`
highlights them like the others and passes `signs` (with `cause`) to `setSignMarks`. No frame for `together`,
`mixed`, `multi-move` or `unavailable`; a restored culprit never gets the removal legend.

`core/js/ui/board-view.js`: `setSignMarks(marks)` keeps `cause: new Set(marks.cause || [])`; the JSDoc names it.
In `applySignMarks`, retain the existing hidden/removed/kept classes on each original `[data-sign]` path.
Remove old `[data-cause-sign]` frames, then for each visible cause path append a separate SVG `rect` to that
path's parent sign layer: its local `getBBox()` padded by 4 units, class `sign--cause`, `data-cause-sign`
containing the original sign index, `aria-hidden="true"` and `pointer-events="none"`. Do **not** put `data-sign`
on the rectangle (it must not re-enter the path loop). No frame for a hidden path or a failed/empty bounding box.
`setSignMarks(null)` and model replacement leave no stale frames. Appending to the sign layer preserves its
existing visibility controls. `core/css/board.css`, next to the replay frames:

```css
.sgb .hl.cell--cause {
  stroke: var(--sg-color-accent);
  stroke-width: 5;
  fill: var(--sg-color-accent-soft);
  fill-opacity: 0.35;
}

.sgb rect.sign--cause {
  stroke: var(--sg-color-accent);
  stroke-width: 3;
  fill: none;
  pointer-events: none;
}
```

`core/tests/suites/board-view.test.js` tests pure functions only and stays unchanged: the sign frame is checked
through the fake board of `player.test.js` (GS06-T07) and on the real page in GS08 (Greater-Than Expert seed 42,
one `.sign--cause`). Add nothing to the `@media (forced-colors: active)` block of `board.css` (lines 381–385): the
existing replay frames have no rule there either. In `steps.css`, new bordered elements (badge, callout, legend
swatches) get `border-color: currentColor` in its forced-colours block (line 232), as `.steps-legend__swatch` does.

## Strings

`generator/js/ui/step-view.js` (new `steps.*` keys; † = decision D12 or D19):

| Key | English | Vietnamese |
|---|---|---|
| `steps.techniques.change` | {score} ({change}) | {score} ({change}) |
| `steps.techniques.unchanged` | {score} (unchanged) | {score} (không đổi) |
| `steps.techniques.newPeak` | New hardest technique | Kỹ thuật khó nhất mới |
| `steps.status.capped` | Not rated: the computational limit for this rating was reached. | Chưa chấm điểm: đã đạt giới hạn tính toán cho lần chấm này. |
| `steps.status.stuck` | Not rated: this solver stopped before completing the board. | Chưa chấm điểm: bộ giải này đã dừng khi chưa giải xong đề. |
| `steps.status.ambiguous` | Not rated: this board has at least two solutions. | Chưa chấm điểm: đề này có ít nhất hai lời giải. |
| `steps.status.unverified` | Not rated: the page could not confirm a unique solution for this board. | Chưa chấm điểm: chưa xác nhận được đề này có lời giải duy nhất. |
| `steps.status.attempted` | The rows show techniques the solver applied, not a validated difficulty rating. | Các dòng chỉ ghi những kỹ thuật bộ giải đã áp dụng, không phải kết quả chấm độ khó. |
| `steps.status.missingRating` | Not rated: no verified final rating is available. | Chưa chấm điểm: không có kết quả chấm điểm cuối cùng đã được xác nhận. |
| `steps.status.contradiction` | Not rated: the board or deduction trace contains a contradiction. | Chưa chấm điểm: bàn cờ hoặc chuỗi suy luận có mâu thuẫn. |
| `steps.first.label` | First rated puzzle | Đề đầu tiên được chấm điểm |
| `steps.first` | First rated puzzle: score {score}. The generator's solution uses {technique} as its hardest technique. | Đề đầu tiên được chấm điểm: {score} điểm. Trong lời giải mà trình sinh đề tìm được, kỹ thuật khó nhất là {technique}. |
| `steps.newPeak` | The generator's solution now uses {technique} (weight {w}) as its hardest technique, instead of {previous} (weight {previousW}). | Trong lời giải mới của trình sinh đề, kỹ thuật khó nhất là {technique} (trọng số {w}), thay cho {previous} (trọng số {previousW}). |
| `steps.jump.badge` | Score jump ×{ratio} | Điểm tăng vọt ×{ratio} |
| `steps.jump.heading` | Score jump: {from} → {to} ({change}) | Điểm tăng vọt: {from} → {to} ({change}) |
| `steps.jump.change.remove_one` | the clue at {cells} is removed | khi bỏ số cho sẵn ở {cells} |
| `steps.jump.change.remove_other` | the clues at {cells} are removed | khi bỏ số cho sẵn ở {cells} |
| `steps.jump.change.restore_one` | the clue at {cells} is restored | khi khôi phục số cho sẵn ở {cells} |
| `steps.jump.change.restore_other` | the clues at {cells} are restored | khi khôi phục số cho sẵn ở {cells} |
| `steps.jump.change.sign` | {sign} is removed | khi bỏ {sign} |
| `steps.jump.change.exchange` | the clues at {removedCells} are removed and those at {restoredCells} are restored | khi bỏ số ở {removedCells} và khôi phục số ở {restoredCells} |
| `steps.jump.change.moves` | the {count} changes in this step | {count} thay đổi trong bước này |
| `steps.jump.uses_one` | After {change}, the generator's solution uses {technique} once; previously, its hardest technique was {previous}. | Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} 1 lần; trước đó, kỹ thuật khó nhất là {previous}. |
| `steps.jump.uses_other` | After {change}, the generator's solution uses {technique} {count} times; previously, its hardest technique was {previous}. | Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} {count} lần; trước đó, kỹ thuật khó nhất là {previous}. |
| `steps.jump.work` | After {change}, the weighted sum of technique uses in the generator's solution grew from {from} to {to}. | Sau {change}, tổng trọng số các lần áp dụng kỹ thuật trong lời giải tăng từ {from} lên {to}. |
| `steps.jump.full` | The largest technique weight, {w}, contributes in full as the P term of the score (P = {w}). | Trọng số cao nhất {w} được tính toàn bộ vào điểm ở thành phần P (P = {w}). |
| `steps.jump.cause.culprit` | Removing the clue at {cell} alone gives {score}; removing the clue at {other} alone gives {otherScore}. | Chỉ bỏ số ở {cell} cho {score} điểm; chỉ bỏ số ở {other} cho {otherScore} điểm. |
| `steps.jump.cause.culpritGroup` | Removing the clue at {cell} alone gives {score}; removing the other {count} clues without it gives {otherScore}. | Chỉ bỏ số ở {cell} cho {score} điểm; bỏ {count} số còn lại mà không bỏ số ở ô này cho {otherScore} điểm. |
| `steps.jump.cause.culpritExchange` | Removing the clue at {cell} alone gives {score}; the rest of this change without it gives {otherScore}. | Chỉ bỏ số ở {cell} cho {score} điểm; thực hiện các thay đổi còn lại và giữ nguyên ô này cho {otherScore} điểm. |
| `steps.jump.cause.culpritRestore` | Restoring the clue at {cell} alone gives {score}; the rest of this change without it gives {otherScore}. | Chỉ khôi phục số ở {cell} cho {score} điểm; thực hiện các thay đổi còn lại và giữ nguyên ô này cho {otherScore} điểm. |
| `steps.jump.cause.together` | Removing each clue alone gives {scores}; removing the whole group gives {after}. | Bỏ riêng từng số cho các điểm {scores}; bỏ cả nhóm cho {after} điểm. |
| `steps.jump.cause.togetherExchange` | The separate changes give {scores}; the combined change gives {after}. | Từng thay đổi riêng lẻ cho các điểm {scores}; thay đổi gộp cho {after} điểm. |
| `steps.jump.cause.parts` | Removing the clue at {cell} alone gives {score}, versus {after} for the whole symmetric group, which is always displayed as one complete change. | Chỉ bỏ số ở {cell} cho {score} điểm, còn cả nhóm đối xứng cho {after} điểm và luôn được hiển thị trong một thay đổi trọn vẹn. |
| `steps.jump.cause.partsExchange` | On its own, the change at {cell} gives {score}, versus {after} for the whole change, which is always displayed as one complete change. | Riêng thay đổi ở {cell} cho {score} điểm, còn cả thay đổi cho {after} điểm và luôn được hiển thị trong một thay đổi trọn vẹn. |
| `steps.jump.cause.sign` | This step removes one sign; there is no smaller sign-removal move to show. | Bước này bỏ một dấu; không có thay đổi bỏ dấu nhỏ hơn để hiển thị. |
| `steps.jump.cause.cell` | This step removes one clue; there is no smaller clue-removal move to show. | Bước này bỏ một số cho sẵn; không có thay đổi bỏ số nhỏ hơn để hiển thị. |
| `steps.jump.cause.cellRestore` | This step restores one clue; there is no smaller clue-restoring move to show. | Bước này khôi phục một số cho sẵn; không có thay đổi khôi phục số nhỏ hơn để hiển thị. |
| `steps.jump.cause.grouped` | Within this step, {technique} first appears after complete change {k} of {n} ({change}). | Trong bước này, {technique} xuất hiện lần đầu sau thay đổi trọn vẹn thứ {k}/{n} ({change}). |
| `steps.jump.cause.groupedRated` | The first rated position using {technique} within this step follows change {k} of {n} ({change}). | Trong bước này, trạng thái đầu tiên được chấm điểm có dùng {technique} xuất hiện sau thay đổi thứ {k}/{n} ({change}). |
| `steps.jump.cause.combined` | This step combines {count} complete changes; no single cause is named. | Bước này gộp {count} thay đổi trọn vẹn; không xác định riêng một nguyên nhân. |
| `steps.jump.cause.unavailable` | The parts of this change could not all be rated, so no single cause is named. | Không chấm được điểm cho mọi phần của thay đổi này, nên không nêu nguyên nhân riêng. |
| `steps.jump.why` | Why? | Vì sao? |
| `steps.jump.p` | P, peak technique weight: {from} → {to} ({change}) | P, trọng số cao nhất: {from} → {to} ({change}) |
| `steps.jump.w` | W, weighted sum of technique uses: {from} → {to} | W, tổng trọng số các lần áp dụng kỹ thuật: {from} → {to} |
| `steps.jump.r` | R = 0.25 × P × log₂(1 + W ÷ P): {from} → {to} ({change}) | R = 0,25 × P × log₂(1 + W ÷ P): {from} → {to} ({change}) |
| `steps.jump.e` | E, number of empty cells: {from} → {to} | E, số ô trống: {from} → {to} |
| `steps.jump.v` † | V = 80 × E ÷ (E + 40): {from} → {to} ({change}) | V (điểm của ô trống) = 80 × E ÷ (E + 40): {from} → {to} ({change}) |
| `steps.jump.total` | Score = V + P + R, rounded: {from} → {to} ({change}) | Điểm = V + P + R, làm tròn: {from} → {to} ({change}) |
| `steps.jump.level` | Level: {from} → {to} | Mức độ: {from} → {to} |
| `steps.jump.choice.guided_one` † | The log records {rated} candidates before this accepted removal, with {refused} rejected; the other candidate with a completed score reached {max} by the generator's limited check. | Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó {refused} bị loại; phương án khác còn lại có điểm sau phép kiểm tra giới hạn của trình sinh đề đạt {max} điểm. |
| `steps.jump.choice.guided_other` | The log records {rated} candidates before this accepted removal, with {refused} rejected; the other {count} candidates with completed scores reached at most {max} by the generator's limited check. | Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó {refused} bị loại; {count} phương án khác có điểm sau phép kiểm tra giới hạn của trình sinh đề đạt cao nhất {max} điểm. |
| `steps.jump.choice.span` | The log records {rated} candidates before this accepted removal, with {refused} rejected. | Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó {refused} bị loại. |
| `steps.jump.choice.nulls_one` † | The limited check did not finish the board for {count} other retained candidate, so it has no numerical check score. | Với {count} phương án khác được giữ lại, phép kiểm tra giới hạn chưa giải xong đề, nên các phương án đó không có điểm kiểm tra. |
| `steps.jump.choice.nulls_other` | The limited check did not finish the boards for {count} other retained candidates, so they have no numerical check score. | Với {count} phương án khác được giữ lại, phép kiểm tra giới hạn chưa giải xong đề, nên các phương án đó không có điểm kiểm tra. |
| `steps.jump.choice.noScores` | No numerical score from the limited check is available for the other candidates. | Không có điểm từ phép kiểm tra giới hạn để so sánh với các phương án khác. |
| `steps.jump.choice.only` | The log records no other retained removal candidate for this choice. | Bản ghi không có phương án bỏ số nào khác được giữ lại cho lần chọn này. |
| `steps.jump.choice.chosenUnscored` | The generator's limited check did not finish the board after the chosen removal; its objective ranks such a removal above every removal it could finish. | Phép kiểm tra giới hạn của trình sinh đề chưa giải xong đề sau lần bỏ số được chọn; tiêu chí lựa chọn ưu tiên các phương án chưa giải xong đề hơn những phương án đã giải xong trong phép kiểm tra này. |
| `steps.jump.choice.random` | This group was picked at random. | Nhóm này được chọn ngẫu nhiên. |
| `steps.jump.choice.checked` | The log contains no comparable-candidate scores for this change. | Bản ghi không có dữ liệu so sánh các phương án cho thay đổi này. |
| `steps.jump.choice.none` | This step combines {count} changes; it is not a single candidate-comparison round. | Bước này gồm {count} thay đổi; nó không tương ứng với một vòng so sánh phương án duy nhất. |
| `steps.jump.lighter` | In a separate check, this solver stopped before completing the board using only techniques with weights below {w}. | Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới {w} và đã dừng khi chưa giải xong đề. |
| `steps.jump.auditScope` | Only the recorded boards that could be rated were searched for smaller steps. | Chỉ các trạng thái bàn cờ đã được ghi lại và chấm điểm mới được xét để chia nhỏ các bước. |
| `steps.jump.firstUse` | First use in the generator's solution: logical deduction {k} of {n}. | Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận {k}/{n}. |
| `steps.jump.removedHere_one` | In that deduction, candidate {digits} is removed from {cells}. | Ở bước suy luận đó, loại ứng viên {digits} khỏi {cells}. |
| `steps.jump.removedHere_other` | In that deduction, candidates {digits} are removed from {cells}. | Ở bước suy luận đó, loại ứng viên {digits} khỏi {cells}. |
| `steps.jump.placedHere` | In that deduction, {digit} is placed in {cell}. | Ở bước suy luận đó, điền {digit} vào {cell}. |
| `steps.jump.scope` | These numbers describe the generator's solution, not every way to solve the puzzle. | Các con số này mô tả cách giải mà trình sinh đề tìm được, không đại diện cho mọi cách giải đề. |

`generator/js/ui/player.js` (five `replay.*` keys):

| Key | English | Vietnamese |
|---|---|---|
| `replay.start.noScore` | No score yet: this is not a puzzle yet. | Chưa có điểm: chưa có đề để chấm. |
| `replay.legend.cause.cell` | Removing this clue causes the score jump | Bỏ số cho sẵn này làm điểm tăng vọt |
| `replay.legend.cause.sign` | Removing this sign causes the score jump | Bỏ dấu này làm điểm tăng vọt |
| `replay.legend.cause.restore` | Restoring this clue causes the score jump | Khôi phục số cho sẵn này làm điểm tăng vọt |
| `replay.sign` | the sign between {a} and {b} | dấu giữa {a} và {b} |

### Expected rendering of the example's step 4 (G01, compact)

| Part | English | Vietnamese |
|---|---|---|
| Badge | Score jump ×12.5 | Điểm tăng vọt ×12,5 |
| Heading | Score jump: 44 → 551 (+507) | Điểm tăng vọt: 44 → 551 (+507) |
| S1 | After the clues at R1C2 and R9C8 are removed, the generator's solution uses Simple Colouring 2 times; previously, its hardest technique was Naked Single. | Sau khi bỏ số cho sẵn ở R1C2 và R9C8, lời giải mà trình sinh đề tìm được dùng Tô màu đơn giản (Simple Colouring) 2 lần; trước đó, kỹ thuật khó nhất là Ô một ứng viên (Naked Single). |
| S2 | The largest technique weight, 360, contributes in full as the P term of the score (P = 360). | Trọng số cao nhất 360 được tính toàn bộ vào điểm ở thành phần P (P = 360). |
| S3 | Removing the clue at R1C2 alone gives 550; removing the clue at R9C8 alone gives 44. | Chỉ bỏ số ở R1C2 cho 550 điểm; chỉ bỏ số ở R9C8 cho 44 điểm. |
| Why 1–7 | P, peak technique weight: 1 → 360 (+359) · W, weighted sum of technique uses: 43 → 768.25 · R = 0.25 × P × log₂(1 + W ÷ P): 1.36 → 148.32 (+146.96) · E, number of empty cells: 43 → 45 · V = 80 × E ÷ (E + 40): 41.45 → 42.35 (+0.91) · Score = V + P + R, rounded: 44 → 551 (+507) · Level: Very easy → Hard | P, trọng số cao nhất: 1 → 360 (+359) · W, tổng trọng số các lần áp dụng kỹ thuật: 43 → 768,25 · R = 0,25 × P × log₂(1 + W ÷ P): 1,36 → 148,32 (+146,96) · E, số ô trống: 43 → 45 · V (điểm của ô trống) = 80 × E ÷ (E + 40): 41,45 → 42,35 (+0,91) · Điểm = V + P + R, làm tròn: 44 → 551 (+507) · Mức độ: Rất dễ → Khó |
| Why 8 | The log records 15 candidates before this accepted removal, with 5 rejected; the other 9 candidates with completed scores reached at most 45 by the generator's limited check. | Bản ghi có 15 phương án trước lần bỏ số được chọn này, trong đó 5 bị loại; 9 phương án khác có điểm sau phép kiểm tra giới hạn của trình sinh đề đạt cao nhất 45 điểm. |
| Why 9 | In a separate check, this solver stopped before completing the board using only techniques with weights below 360. | Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới 360 và đã dừng khi chưa giải xong đề. |
| Why 10–12 | First use in the generator's solution: logical deduction 32 of 47. · (the solver's own text of `technique.simpleColouring.step`, rule `trap`, naming colour 1 R2C4, R6C6, R8C5, R9C2) · In that deduction, candidate 3 is removed from R5C2 and R8C3. | Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận 32/47. · (văn bản của bộ giải) · Ở bước suy luận đó, loại ứng viên 3 khỏi R5C2 và R8C3. |
| Why 13 | These numbers describe the generator's solution, not every way to solve the puzzle. | Các con số này mô tả cách giải mà trình sinh đề tìm được, không đại diện cho mọi cách giải đề. |
| Table | Simple Colouring row labelled "New hardest technique"; Total "551 (+507)" | "Kỹ thuật khó nhất mới"; Tổng "551 (+507)" |
| Board | R1C2 `cell--cause` with the legend "Removing this clue causes the score jump"; R9C8 `cell--dug` | chú giải "Bỏ số cho sẵn này làm điểm tăng vọt" |

Other steps of the example: step 2 badge "First rated puzzle" and the line "First rated puzzle: score 23. The
generator's solution uses Naked Single as its hardest technique." (VI "Đề đầu tiên được chấm điểm: 23 điểm. Trong
lời giải mà trình sinh đề tìm được, kỹ thuật khó nhất là Ô một ứng viên (Naked Single)."); step 6 the line "The
generator's solution now uses XYZ-Wing (weight 750) as its hardest technique, instead of Simple Colouring (weight
360)." and the label on XYZ-Wing, no badge; step 7 Total "992 (unchanged)" / "992 (không đổi)", no line.

## Files to create/modify

### Exclusive ownership

- `generator/js/ui/step-view.js`, `generator/css/steps.css`
- `generator/js/ui/player.js` (frames, `MARK_CLASSES`, `viewAt`, `render`, the five keys), `generator/js/ui/app.js`
  (the `table` option only), `generator/js/ui/help.js` (`help.generation.replay` only)
- `core/css/board.css` (the two rules), `core/js/ui/board-view.js` (`setSignMarks` / `applySignMarks` only)
- `generator/tests/suites/steps.test.js`, `generator/tests/suites/player.test.js` (frame tests)

### Documentation slot

- `USERGUIDE.md` / `USERGUIDE.vn.md` ("Generator features", after the "Step-by-step replay" bullet, lines 110–113
  and VN 110–113): a bullet **Score jumps explained**: when a step's score at least triples and rises by at least
  100 points, the step shows a "Score jump" badge and says why — which technique the generator's solution now uses,
  its weight, and the clue (or sign) that causes the jump, framed on the board when there is exactly one; "Why?"
  opens the numbers behind the score (P, W, E, V, R, the level, the generator's recorded choice and the first
  deduction that uses the technique); a new hardest technique without a jump gets one line; the first scored step is
  marked "First rated puzzle"; in "Show every move", a board that cannot be rated says why instead of a score.
- `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md` (the replay paragraph of GS05): `SG.stepView.create(rootEl, { table })`
  draws the table states from `player.tableAt` (start, zero, scored, final, status), the tiers (first rated puzzle,
  score jump with badge, callout and "Why?", new hardest technique) and the culprit frames; `SG.stepView.explain`
  is the pure text model; `board.setSignMarks` takes a `cause` list.
- `generator/design.md` §7.3 (the "Step description" bullet): the `table` option, the table states, the Total's change,
  the tiers and their exact rule (≥ ×3 **and** ≥ +100 with a positive score before; badge ratio rounded down to one
  decimal), the callout's three sentences, "Why?" and its twelve lines, the frames and their legend, the status
  tables. §10.5 (line 1185): "`player.rateStep` gives …" → "`player.tableAt` gives …", the change in the Total and the
  status tables of the details view. §13.12 (`SG.boardView`): `setSignMarks({ hidden, removed, kept, cause })`.
- `generator/js/ui/help.js` `help.generation.replay`: append EN "When the score jumps (at least three times as high
  and at least 100 points more), the step shows a \u201cScore jump\u201d badge and explains why; Why? opens the numbers
  behind it, and a frame marks the clue or sign that causes the jump when there is exactly one." VI "Khi điểm tăng
  vọt (gấp ba lần trở lên và tăng ít nhất 100 điểm), bước đó có nhãn \u201cĐiểm tăng vọt\u201d kèm lời giải thích; mục
  Vì sao? mở các con số phía sau, và một khung đánh dấu số cho sẵn hoặc dấu gây ra bước nhảy khi chỉ có đúng một."
  Also replace GS05's interim table sentence with EN "Every step has a score table; a position that cannot be
  rated shows its status and attempted techniques instead of a total." / VI "Bước nào cũng có bảng điểm;
  trạng thái chưa chấm được điểm sẽ hiện lý do và các kỹ thuật đã thử thay cho dòng Tổng."
  Make the equivalent user-guide update now that zero/status rendering actually exists.

## Implementation steps

1. `board-view.js` and `board.css` (core); `player.js` frames and keys.
2. `step-view.js`: `explain`, the `table` option, the states, the tier line, the badge, the callout, "Why?", the status
   branch, the legend; the strings; `steps.css`.
3. `app.js`: `table: function (p) { return player !== null ? player.tableAt(p) : null; }`.
4. Tests; `help.js`; documents; both quick sets.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| GS06-B01 | N2: the start shows the table heading with "No score yet…"; zero steps show a numerical table (Empty cells 0, Total 0); every scored step shows its Total with the change from the step before ("551 (+507)", "992 (unchanged)") | `steps` suite |
| GS06-B02 | The details view shows real decreases ("(−20)") and the neutral new-hardest line on flat and falling transitions (G13 m101 70 → 70; G10 m42 2788 → 1940) | `steps` suite |
| GS06-B03 | Q14 a / Q18 b: an unscorable board shows its status sentence(s), the attempted rows with their label (`stuck`, `ambiguous`, `unverified`) or none (`capped`), no Total, no score cells, no retry button | `steps` suite |
| GS06-B04 | Q4 b: the badge appears exactly on jump transitions (13 compact, 16 details in the goldens), with ×{ratio} rounded down to one decimal in the locale's format (×12.5 / ×12,5; ×3.0; ×3.3); "First rated puzzle" once per view, without a multiplier | `steps` suite |
| GS06-B05 | Q5 a + Q11: the callout has the heading and two or three visible sentences; "Why?" is closed by default and lists P, W, R, E, V, the Total, the level, the generator's choice, the restricted sentence (only after a stuck restricted solve), the audit scope (only `ratedOnly`), the first use with every effect, and the scope line; the example matches the table above in EN and VI | `steps` suite |
| GS06-B06 | Q10 b: exactly one culprit clue or sign is framed, with its legend entry (removal or restore wording); no frame for `together`, `mixed`, `multi-move`, `unavailable` | `player`, `steps` suites |
| GS06-B07 | R11 a: no rendered text of the goldens (both views, EN and VI) says "cannot be solved without" or "must use"; "at random" only for a random order of a normal log | `steps` suite |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| GS06-T01 | `SG.stepView.explain` is pure and gives the parts of "The text model"; `create` accepts `table` and no longer reads `stats` | `steps` suite; review |
| GS06-T02 | The cause sentences per class on the goldens: G01 culprit, G03 together ("45 and 44 … 870"), G05 togetherExchange, G07 parts (R1C4, 136, 252), G11 sign, G13 culprit with a multigrid name, G06 / G10 step 8 / G12 grouped (k of n with the fragment of move kMove) | `steps` suite |
| GS06-T03 | The choice sentences: G01 guided (`_other`); G13 / G14 chosen null → `chosenUnscored`; synthetic choices `{ others: 1 }` → `_one`, `{ others: 0, nulls: 2, rated: 16 }` → span + `noScores`, `{ others: 0, nulls: 0, rated: 1 }` → `only` without span, `{ kind: 'combined', count: 3 }` → `none` | `steps` suite |
| GS06-T04 | The first-use effects are grouped by cell and digit set: G09 "candidates 2 and 5 are removed from R7C5"; G10 step 6 "candidates 1, 6, 7 and 9 are removed from R7C1" | `steps` suite |
| GS06-T05 | A jump whose hardest technique was already used (synthetic, `newHardest` false) has no row label and a highlighted Total | `steps` suite |
| GS06-T06 | The status branch never calls `SG.difficulty.scoreTable` (no score shares for partial counts) | `steps` suite (spy) |
| GS06-T07 | Frames: G01 compact step 4 `marks.cause` = [R1C2], `marks.dug` = [R9C8], the fake board receives `cell--cause` for R1C2; G11's jump step passes `cause: [6]` to `setSignMarks`; a synthetic restored culprit uses `causeRestore` and the restore legend | `player` suite |
| GS06-T08 | The callout is a `div.step-callout` between the step text and the table; "Why?" is a `details` with a `summary`; the badge is a text `span` in the heading; legend entries only when used | `steps` suite |
| GS06-T09 | Strings: every key above in EN and VI, same placeholders, plural pairs (`i18n` passes, including the D19 Vietnamese `steps.jump.v`); no placeholder left in any rendered text of the goldens | `i18n`, `steps` suites |
| GS06-T10 | Q16 a: no slider mark and no proof pattern on the board (the frames are the only board change) | review |
| GS06-T11 | Both quick sets pass (`core/` changed); `theme`, `ui-contract`, `help` green; documents in both languages; CRLF | command output; review |

## Test plan

### Exact Node commands

```powershell
$ErrorActionPreference = 'Stop'
Push-Location generator
try {
  node tests\node-runner.js --suite=steps,player
  if ($LASTEXITCODE -ne 0) { throw 'Replay UI suites failed' }
  node tests\node-runner.js --suite=i18n,ui-contract,theme,help
  if ($LASTEXITCODE -ne 0) { throw 'Contract suites failed' }
  node tests\node-runner.js
  if ($LASTEXITCODE -ne 0) { throw 'Generator quick set failed' }
} finally { Pop-Location }
Push-Location player
try {
  node tests\node-runner.js
  if ($LASTEXITCODE -ne 0) { throw 'Player quick set failed' }
} finally { Pop-Location }
```

### Required test cases

Analyses from `SG.replay.analyse` of the goldens (G09–G12 through `SG.fixtures.replayWire`), steps from
`SG.player.buildViews`, tables from `step.table`; set the cell labeler of each result's model. Synthetic transitions
are plain objects with the shapes above.

| Case | Expected result |
|---|---|
| The example (EN, VI) | `explain()` of G01 compact step 4 equals the table "Expected rendering" (the solver's paragraph equals `SG.i18n.t(proof.firstUse.i18nKey, proof.firstUse.i18nArgs)` and contains "colour 1 is R2C4, R6C6, R8C5, R9C2"); steps 2, 6 and 7 as described below that table; step 1 total "0" |
| Table states | start (position 0): hint + "No score yet: this is not a puzzle yet."; zero: the none line, Empty cells 0, Total 0; the details view of G01 has 33 tables |
| Status tables | synthetic `stuck` with reasons `['stuck', 'ambiguous']` and the renderer-control counts of GS01 → both sentences, the attempted label, 9 rows, no Total, no `data-role="score"`; `capped` → one sentence, no rows; `unverified` → its sentence and rows |
| Badge boundaries | synthetic jump transitions 100 → 300 (×3.0 / ×3,0), 300 → 1000 (×3.3), 44 → 551 (×12.5 / ×12,5) |
| Tier counts | over the 14 goldens: 13 compact and 16 details badges; one "First rated puzzle" per view |
| Neutral lines | G13 details m101 (70 → 70) and G10 details m42 (2788 → 1940; Total `formatNumber(1940)` + " (−848)", "1,940 (−848)" in English) show `steps.newPeak` and the row label, no badge |
| Causes, choices, effects | GS06-T02, T03, T04 |
| Lighter sentence | a synthetic proof with `restricted: 'complete'` or `'unavailable'` gives no `steps.jump.lighter` line; `'stuck'` gives it |
| Audit scope | a synthetic jump with `auditScope: 'ratedOnly'` gives the `steps.jump.auditScope` line |
| Wording | GS06-B07 over every golden, both views, EN and VI |
| DOM | GS06-T08 with the suite's fake document |
| Frames | GS06-T07 |

Additional cases: the missing-rating fallback performs no solve and uses its own status text; contradiction
reasons use the contradiction sentence; a details restart shows `0 (−551)` in the synthetic trace; a
multi-move work-only jump uses `combined`, and uncertain first occurrence uses `groupedRated`.
G11's fake-board marks must include sign 6 in **both** `removed` and `cause`; GS08 checks that the real SVG
has one separate frame and that the original sign remains removed. Synthetic callout steps provide `context`.

## Definition of done & handoff

- Every criterion has its evidence; both quick sets pass; no test was weakened.
- Handoff to GS07: the documents touched and any wording left for the consistency pass; to GS08: the selectors
  (`.step-badge--jump`, `.step-callout`, `details.step-why`, `.cell--cause`, `.sign--cause`, `#replay-status`,
  `#btn-prepare-replay`, `#replay-view-details`) for the real-page smoke.

## Execution log

| Field | Value |
|---|---|
| Status | Done (real-browser look of the frames and callout left to GS08) |
| Start | 2026-10-29 00:45:39 (+07:00) |
| End | 2026-10-29 01:10:57 (+07:00) |
| Duration | 25 min 18 s |
| Model | claude-sonnet-5.5 (sub-agent `GS06-steps-panel`, general-purpose); wave 6, alone |
| Token usage | 151 model calls; 38,257,201 input (37,835,528 cache read), 181,884 output |
| AI credits | 665.64 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: generator quick set 43 suites 2,818/2,818 (89.8 s); player quick set 29 suites 1,609/1,609 (23.8 s); `--suite=steps,player` 124; `--suite=i18n,ui-contract,theme,help` in both apps 235; a sweep of the 14 goldens × 2 views × EN/VI (wording, placeholders; 29 jumps framed exactly when `cause.frame` is set, never for together, mixed, multi-move or unavailable causes); spies confirm the zero and status tables call no `scoreTable` and no solve; the badge rounds down (×3.0 / ×3,0, ×3.3, ×12.5); a throw-away fake-DOM check of the SVG sign frame, deleted. Orchestrator re-run: generator quick set 43 suites, 2,818 passed / 0 failed (89.9 s); player quick set 29 suites, 1,609 passed / 0 failed (23.6 s); the 14 edited files CRLF, no BOM; nothing outside the GS06 list changed; `core/css/board.css` uses only existing tokens (`--sg-color-accent`, `--sg-color-accent-soft`). |
| Acceptance | GS06-B01–B07 and GS06-T01–T11 met; G01 step 4 matches the task's English and Vietnamese text. B02 and B05 (board frames, callout look) rest on fake-DOM tests and a CSS review: GS08 confirms them on a real page. |
| Issues & resolutions | (1) Intended contract-test changes: `steps.test.js` reads tables through the `table` option (`tableOf` instead of `statsOf`) and its legend test also expects `cause`, `causeRestore` and `signCause`; `player.test.js` "frames what each dig step did" counts `dug + cause` as cleared cells, because the culprit cell leaves `marks.dug`. No golden, fixture or hash touched; nothing weakened or skipped. (2) The developer's own bug (reading the proof from the transition instead of `table.proof`) was found and fixed before hand-off. (3) Readings accepted: the status block omits the "Techniques needed" heading (misleading there) and shows no attempted rows for `capped`; Vietnamese never uses `_one`; `signed()` never prints "−0"; the badge falls back to `SG.replay.badgeRatio` only when `transition.ratio` is missing; the jump sentence is appended to `help.generation.replay`. (4) The stale comments of `step-view.js` (old lines 4 and 276) fixed. (5) The guides' quick-set counts left to GS07. |
| Handoff | `SG.stepView.create(rootEl, { table })` (replaces the `stats` adapter; `table(position)` is `player.tableAt`, wired in `app.js`); `SG.stepView.explain(table, step)` pure → `{ total, badge, line, rowLabel, totalHighlight, callout, status }`; a view carries `marks.cause`, `marks.causeRestore` (cell arrays) and `signs.cause`; `board-view.setSignMarks({ hidden, removed, kept, cause })` (a cause sign is a separate `rect.sign--cause`, `aria-hidden`, no `data-sign`, no pointer events; a cause cell gets `.hl.cell--cause`). Selectors for GS08: `.step-badge--jump`, `.step-badge--first`, `.step-callout[data-role=jump]`, `details.step-why`, `.step-tier`, `.step-status`, `.step-status__attempted`, `.step-table__label[data-role=new-hardest]`, `.step-table__total--jump`. Risks for GS08: the SVG sign frame, the callout / badge / legend look (also in forced-colors mode) were never seen in a real browser; `#step-detail` is `aria-live="polite"`, so a re-rendered callout is announced; the "Why?" disclosure closes again on re-render or a language change. |
