# GS05 — Replay views, step texts, preparation flow and main-mode gate

| Header | Value |
|---|---|
| ID | GS05 |
| Depends on | GS02, GS03, GS04 (accepted and committed) |
| Estimated size | Large: about 1,200–1,600 changed lines (code, tests, strings, documents) |
| Owner role | Generator UI |
| Milestone | M5 — a scored table on every step, two views, and nothing on the page before it is asked for |
| Design refs | `docs/generation-steps/report-detailed.md` R2–R4, R6, R9 (table data), R11 i–j, R12, R15, R17; §6.1; §8 (the `replay.*` strings); §9.3 cases 3, 5, 10, 11 (traceability only) |
| Implementation status | Not started |

## Goal & business context

Today the Generation Steps tab cuts the dig log into fixed batches (`generator/js/ui/player.js:44–54, 170–399`) and
rates each batch's board on the page within 400 ms (`player.js:39–42, 512–553`). This task replaces both with the
analysis of GS01–GS03, prepared by the client of GS04:

- **N2** (the user's request): every step has a score table, even when the score did not change;
- **N3** and **Q1 a** (15:30): a compact view of score-chosen steps that rise steadily (default), and a "Show every
  move" toggle for the details view (one step per recorded move);
- **Q3 a**, **Q12 a**, **Q13 a**: the compact view never decreases; what it folds is told in the step's text; a
  restart is folded into "Starting again";
- **Q15 a**: Killer's rebuilt log gets order-neutral texts and a note;
- **Q17 b** and **Q19 a** (18:40): without a Web Worker (for example `file://`) nothing runs by itself; the finished
  puzzle and its Summary stay usable; the replay shows only a notice and the "Prepare score tables" button, with
  browsing disabled, until the button is pressed; then both scored views open. Each new puzzle needs a new press;
- **N1**: the generation is untouched; nothing new is stored (cache, history, export, URL unchanged).

The jump badge, the callout, "Why?", the status tables and the culprit frames are GS06. This task feeds the steps
panel through its existing `stats` option with an adapter, so every scored step already shows today's table.

## Scope

### In scope

- `generator/js/ui/player.js`: `SG.player.buildViews(result, analysis)` (replaces `buildSteps`), step objects,
  titles, sentences, one-line summaries, table models, the player instance's new methods, the view toggle and the
  status block, `SG.player.createPreparation(options)`; the removal of the fixed batching and of the page ratings;
  the `replay.*` strings of this task.
- `generator/js/ui/app.js`: the preparation wiring, `SG.app.markTraceUnavailable()`, the `'replay:consent'` event,
  the `stats` adapter, the JSDoc header.
- `generator/js/ui/cache.js`: the trace gate (main mode waits for the press; a worker page with a main-thread
  background client marks the record unavailable; a failed regeneration marks it unavailable).
- `generator/index.html`: the toggle and the status block (markup only); `generator/css/steps.css`: their styles.
- `generator/js/ui/help.js`: `help.generation.replay` and `help.controls.replay` (EN and VI).
- Tests: `player.test.js`, `steps.test.js` (migration only), `cache.test.js`, `ui-contract.test.js` (`SURFACE.player`,
  `SURFACE.app`, `PLAYER_INSTANCE`, `MOUNT_IDS`).
- Documents: both user guides, both developer guides, `generator/design.md` §7.3, §12.1 (the `player.js` line),
  §13.14, §15.2 (the `player.test.js` / `steps.test.js` row).

### Out of scope

- The steps panel's table states, tiers, badge, callout, "Why?", new-hardest label, status tables, culprit frames and
  the strings `replay.start.noScore`, `replay.legend.cause.*`, `replay.sign` and every `steps.*` key (GS06).
- `SG.replay`, the worker and the clients (report defects to the orchestrator).
- Slider marks, a proof drawn on the board (Q16 a: never), autoplay (does not exist, D14), storing the toggle.

## Repository rules

- Classic scripts on `SG`; every UI file still loads without a DOM (`ui-contract`); no colour literal (tokens of
  `core/css/tokens*.css` only); every visible string through `SG.i18n.t()` in English and Vietnamese, with the same
  placeholders per key and `_one` / `_other` pairs; numbers formatted with `SG.i18n.formatNumber` (except `count`).
- 2-space indent, single quotes, semicolons; UTF-8 without BOM, CRLF, final newline.
- Quick suites only; no commit / stage / stash / push / branch switch; do not edit `tasks/generation-steps/`.
- Tests: the edits listed in "Test migration" are intended contract changes (decision D13); any other failing test is
  reported, not edited. Never weaken an assertion to make it pass.
- Documents in both languages in this task; no absolute path; `help.test.js` must stay green (it checks that the
  English developer guide's Generator part names every script of `index.html`, only commands that exist and only
  `SG.x.y` names that resolve).

## Inputs & context

### The analysis (GS01–GS03; read `generator/js/engine/replay.js`)

```text
Analysis = { version, fallback, rebuilt, randomOrder, structure ('cages' | 'signs' | null), signs ([[a, b]] | null),
             level, band, moves: Move[], ratings: Rating[], chapter, views: { compact: View, details: View },
             transitions: Transition[], proofs, stats }
Move = { index, kind ('solution' | 'clues' | 'random' | 'guided' | 'searchRemove' | 'exchange' | 'searchAdd'
         | 'reveal' | 'sign' | 'restart' | 'final'), phase, pass, from, to, at, removed: [cell], restored: [cell],
         sign, span: { rated, refused, chosen, others, nulls, max, rejected: [cell], rejectedSigns: [sign],
         reasons: { name: count }, trail: null | { rated, refused, rejected, rejectedSigns, reasons } } | null,
         values: Int32Array, alive: [sign] | null }
Rating = { status ('rated' | 'zero' | 'final' | 'capped' | 'stuck' | 'ambiguous' | 'unverified'), reasons, score,
           counts, empties, hardest, P, W, R, V, level, checks, memo }
View = { name, steps: ViewStep[], audit }
ViewStep = { role ('solution' | 'structure' | 'restart' | 'moves' | 'final'), first, last, position, phases, kinds,
             transition: index into transitions | null }
Transition = { view, step, from, to, role, before: Terms, after: Terms, change, tier, ratio, newHardest,
               folded: { peak, aboveBand, revealed, unscored, restart: null | { peak, moves } }, auditScope,
               cause, choice }
Terms = { P, W, E, V, R, total, level, hardest, counts }
analysis.proofs[position] = { firstUse, restricted }
```

`SG.replay.moves(result)` is pure and cheap (no solver); `SG.replay.fallback(result, reason)` never calls a solver,
including when the supplied final rating is absent (GS01 returns a `missingRating` status, not a fresh solve).

### The client (GS04)

`client.replay(result, { onProgress({ done, total }), allowMain: false }) -> Promise<Analysis>`,
`client.cancelReplay() -> boolean`,
`client.ready() -> Promise<'worker' | 'main'>`, `client.mode`. Rejections: `budget.cancelled` (cancelled or
replaced), `unexpected` with `i18nArgs.message === 'busy'` (a generation runs). Cancellation reason
`replayConsentRequired` means the client would need the main thread without permission; show the consent
notice, not an error/fallback. The cache wrapper forwards the options unchanged.

### Today's code (anchors at `8d9510a`)

- `generator/js/ui/player.js`: header 1–17; `LAYER_NAMES`, `STRUCTURE_LAYERS`, `KINDS` 25–30; `MARK_CLASSES` 32;
  `RATE_FREE_KINDS` 39; `RATE_BUDGET_MS` 42; `batchCells` / `roundsPerStep` / `batchSigns` 44–54; `buildSteps` 75–168;
  `replayLog` 170–399; `viewAt` 402–412; `T`, `unitText`, `cellName` 414–431; `displayArgs` 433–452; `describeStep`
  455–458; `stepTitle` 460–462; `stepMeta` 464–478; `positionText` 480–483; `create` 490–811 (`techniquesAt` /
  `rateStep` 512–553, `render` 593–610, `updateUi` 634–651, `load` 682–696, `reset` 698–712, `bindControls`
  725–760, the instance object 762–806); `SG.player` 813–826; locale fragment 828–935.
- `generator/js/ui/app.js`: header 1–77 (PUBLIC API, events, generation client, replay contract); `loadReplay` 634;
  `showFinished` 640; `explainContext` 649; `handlePosition` 662; `beginRun` 690; `succeed` 711 (line 723 loads the
  replay only when the result has a `digLog`); `fail` 735; `cancel` 809; `discardPuzzle` 832; `attachTrace` 858;
  `start` 1061 (`stepView` with `stats` 1083–1085, `player` 1090); `destroy` 1121; the `app` object 1145–1171.
- `generator/js/ui/cache.js`: `createController` 676; `backgroundClient` 763; `serve` 930; `finishTrace` 984;
  `startTrace` 1006; `forget` 1056; `onResult` 1065 (line 1085 starts the trace of a served puzzle at once);
  `start` 1096 (the subscriptions).
- `generator/index.html`: `#steps-root` 292; `.player__controls` 293–321; the panel header 323–329; `#step-detail`
  330.
- `generator/js/ui/help.js`: `help.generation.replay` EN 1183–1193, VI 1444–1454; `help.controls.replay` EN 1228–1230,
  VI 1489–1491.

### Contracts to implement

```js
SG.player = {
  LAYER_NAMES, STRUCTURE_LAYERS,
  KINDS,                          // ['solution', 'cages', 'signs', 'clues', 'random', 'dig', 'guided', 'search',
                                  //  'signDig', 'reveal', 'mixed', 'restart', 'final']
  buildViews(result, analysis) -> Views,         // pure
  viewAt(built, position),                       // unchanged contract (built = one view)
  describeStep(step, labeler?) -> string,        // every sentence of the step; null step: replay.start
  stepTitle(step), stepMeta(step, labeler?), positionText(position, length),
  createPreparation(options) -> Preparation,     // pure controller (no DOM)
  create(options) -> Player
};
// batchCells, roundsPerStep, batchSigns and buildSteps are removed.
Views = { compact: Built, details: Built, signs: [[a, b]] | null, cellCount }
Built = { name: 'compact' | 'details', steps: Step[], signs: [[a, b]] | null, cellCount }
Step = {
  index,                 // 1-based within its view
  view,                  // 'compact' | 'details'
  role, first, last, position,   // from the ViewStep
  kind,                  // the title kind (one of KINDS)
  phase,                 // 'fullGrid' | 'extraStructure' | 'dig' (the Help's pipeline step)
  line,                  // 'place' | 'build' | 'check' | 'deeper' | 'verify' | null (the pseudocode line)
  parts: [{ key, args }],// the sentences, in order
  key, args,             // = parts[0] (kept for the helpers and the tests)
  meta: { key, args },   // the one-line summary
  values,                // Int32Array: the board at the end of the step
  structure,             // cages / signs drawn
  marks: { dug, kept, revealed },                  // cell frames (GS06 adds `cause`)
  signs: null | { hidden, removed, kept },         // sign marks by index into built.signs (GS06 adds `cause`)
  metrics,               // { attempts, accepted, rejected, clues } or null
  context: { moves, signs }, // one shared read-only context per buildViews call; the full analysis move array
                            // and original sign list, so GS06 can format changes without private player state
  table                  // TableModel
}
TableModel = {
  state: 'start' | 'zero' | 'scored' | 'final' | 'status',
  status: null | 'capped' | 'stuck' | 'ambiguous' | 'unverified',
  reasons: [string],
  counts: { techniqueId: uses },   // proof counts (scored, final), attempted counts (status), {} (start, zero)
  before: { techniqueId: uses } | null,   // counts of the step shown before in this view when it has a score
  empties,                          // E (0 for start and zero)
  score: number | null,             // the Total (null for start and status)
  change: number | null,            // transition.change; null without two numeric endpoints (start/status).
                                   // A details restart keeps its real negative change to zero.
  transition: Transition | null,    // the object of analysis.transitions (null at position 0 and for k = 0)
  proof: { firstUse, restricted } | null,   // analysis.proofs[step.position] when present
  position                          // the move index of the step's board (null at position 0)
}
Player (instance) = { load(result, opts?), setPreparation(state), setAnalysis(analysis, opts?), setView(name),
  getView(), tableAt(p), reset, first, prev, next, last, seek, state, describe, getSteps, getStep,
  bindControls, destroy }
// create(options): { board, onPosition, onStateChange, onSteps({ steps, position, view }), onPrepare() }
Preparation = { start(result), press() -> boolean, unavailable(result) -> boolean, cancel(), state() }
PrepState = { status: 'idle' | 'waiting' | 'consent' | 'trace' | 'preparing' | 'ready' | 'unavailable' | 'error',
              done, total }
SG.app.markTraceUnavailable() -> boolean      // the generation record of the puzzle on show cannot be had
// new app event 'replay:consent' { result }: the user pressed "Prepare score tables" for a puzzle whose record
// must be rebuilt first (main mode); the cache listens.
```

## Building the steps (`buildViews`)

For each view `v` in `['compact', 'details']` and each `ViewStep` `vs` (index `k`, 0-based) of
`analysis.views[v].steps`, build one `Step`. `moves = analysis.moves`, `model = result.model`, `n =
model.cellCount`, `signList = analysis.signs`, `clueCount(values)` = the number of non-zero cells.
Create `context = { moves, signs: signList }` once, assign that same read-only object to every Step in both views,
and preserve it when the player returns a step to GS06. It is not attached to `result` or serialized.

### Title kind, phase and line

| `vs.role` / moves | `kind` | `phase` | `line` |
|---|---|---|---|
| `solution` | `solution` | `fullGrid` | `place` |
| `structure` | `cages` (structure `'cages'`) or `signs` | `extraStructure` | `build` |
| `restart` | `restart` | `dig` | `verify` |
| `final` | `final` | `dig` | `verify` |
| `moves`, `vs.phases.length > 1` | `mixed` | `dig` | the line of its last move's phase (below) |
| `moves`, phase `random` | `random` when `analysis.randomOrder`, else `dig` | `dig` | `check` |
| `moves`, phase `guided` | `guided` | `dig` | `deeper` |
| `moves`, phase `search` | `search` | `dig` | `deeper` |
| `moves`, phase `reveal` | `reveal` | `dig` | null |
| `moves`, phase `clues` | `clues` | `dig` | null |
| `moves`, phase `signs` or `signsMinimal` | `signDig` | `dig` | `check` |

(`analysis.randomOrder` is already false for a rebuilt log.)

### Board, structure and marks

- `values`: `moves[vs.position].values` (the solution for `solution` and `structure`; `result.givens` for `final`).
- `structure`: false for `solution`, else `analysis.structure !== null`.
- `marks` (cells): empty for `solution`, `structure`, `restart` and `final`. For `moves`: `start` =
  `moves[vs.first - 1].values`, or all zeros when `moves[vs.first].kind === 'clues'`; `end` = `values`;
  `dug` = cells with `start ≠ 0` and `end = 0`; `revealed` = cells with `start = 0` and `end ≠ 0`; `kept` = the cells of
  `span.rejected` and `span.trail.rejected` of the step's moves that are not 0 in `end` and not in `revealed`
  (deduplicated). All three ascending. The frames show the **net** change; the text gives the gross counts.
  Example: compact step 6 of the example (five exchanges) has `dug` R4C2, R5C1, R5C9, R6C8 and `revealed` R1C8,
  R2C8, R8C2, R9C2, while its text says 10 cells cleared and 10 clues restored.
- `signs`: null when `signList === null`. `solution` and `structure`: `{ hidden: [], removed: [], kept: [] }`.
  `final`: `{ hidden: <signs not alive at the end>, removed: [], kept: [] }`. Otherwise with `aliveStart =
  moves[vs.first - 1].alive` and `aliveEnd = moves[vs.last].alive`: `hidden` = indexes not in `aliveStart`;
  `removed` = in `aliveStart` and not in `aliveEnd`; `kept` = the `rejectedSigns` of the spans and trails of the
  step's moves that are in `aliveEnd` (deduplicated). All ascending.
- `metrics`: null for `solution`, `structure` and for every step of a fallback analysis. Otherwise counters over
  the moves `1 … vs.last` (cumulative, a restart does not reset them): `accepted` = Σ `removed.length` of the moves
  of kind `random`, `guided`, `searchRemove`, `exchange` + 1 per `sign` move; `rejected` = Σ (`span.rejected.length
  + span.rejectedSigns.length` + the same of `span.trail`); `attempts = accepted + rejected`; `clues =
  clueCount(values)`. The final step counts every move.

### Sentences (`parts`)

- `solution`: `replay.solution` `{ filled: n, unit: 'cell' }`.
- `structure`: `replay.cages` `{ count: model.cages.length }` or `replay.signs` `{ signs: signList ? signList.length :
  model.inequalities.length }`.
- `final`: `replay.final` `{ clues }`, or `replay.final.signs` `{ clues, signs: model.inequalities.length }` when the
  model has signs (`clues` = clueCount of the givens).
- `restart`: `replay.restart` `{ filled: n, unit: 'cell' }`; in the compact view, when
  `transition.folded.restart.peak !== null`, also `replay.restart.folded` `{ peak, moves:
  transition.folded.restart.moves }`.
- `moves`: one sentence per maximal run of consecutive moves (`vs.first … vs.last`) of one move kind.
  For **both cell and sign runs**, `reasonOf(run)` merges span/trail reason counts: use the sole reason when
  it is `ambiguous`, `techniques` or `tooHard`, otherwise `mixed`. The sign branch does not depend on a local
  variable defined only by the random-removal branch.

| Move kind of the run | Sentence |
|---|---|
| `clues` | `replay.clues` `{ clues: clueCount(last move's values) }` |
| `random` | `removed` = Σ `removed.length`; `kept` = Σ (`span.rejected.length + trail.rejected.length`); `tried = removed + kept`; `reason` = the only reject reason of the run (merged `span.reasons` and `trail.reasons`; a name other than `ambiguous`, `techniques`, `tooHard`, or several names, give `mixed`). `analysis.rebuilt` → `replay.dig.rebuilt` `{ removed, unit: 'cell' }`; else `analysis.randomOrder` → `replay.random.some` `{ tried, removed, kept, reason, unit: 'cell' }` when `kept > 0`, else `replay.random.all` `{ removed, unit: 'cell' }`; else the same with `replay.dig.some` / `replay.dig.all` |
| `guided` | `rounds` = number of moves; `rated` = Σ (`span.rated + trail.rated`); `refused` = Σ (`span.refused + trail.refused`); `cellList` = the moves' `removed` cells concatenated in move order. One move → `replay.guided` `{ rated, refused, cellList }`; several → `replay.guided.rounds` `{ rounds, rated, refused, cellList }` |
| `searchRemove` | `replay.searchRemove` `{ removed: Σ removed.length, unit: 'cell' }` |
| `exchange` | `replay.exchange` `{ count: number of moves, removed: Σ removed.length, revealed: Σ restored.length, unit: 'cell' }` (`_one` / `_other` by `count`) |
| `searchAdd` | `replay.reveal.search` `{ revealed: Σ restored.length }` |
| `reveal` | `replay.reveal` `{ revealed: Σ restored.length, clues: clueCount(last move's values) }` |
| `sign` | `removed` = number of moves; `kept` = Σ (`span.rejectedSigns.length + trail.rejectedSigns.length`); `tried = removed + kept`; `signs` = alive signs after the run; `kept > 0` → `replay.signDig.some` `{ tried, removed, kept, reason, signs, unit: 'sign' }`, else `replay.signDig.all` `{ removed, signs, unit: 'sign' }` |

Then, for a `moves` step:

- compact view only, from `transition.folded`: when `peak !== null`: `replay.folded.reveal` `{ peak, revealed }` when
  `aboveBand && revealed > 0`, else `replay.folded.peak` `{ peak }`; when `unscored > 0`: `replay.folded.unscored`
  `{ count: unscored }`;
- when `analysis.rebuilt`: `replay.rebuilt` `{}` (every dig step of a rebuilt Killer log, Q15 a).

The tier lines ("First rated puzzle…", "The generator's solution now uses…") are not sentences of the step: GS06
draws them from the transition.

### One-line summary (`meta`)

| Step | `meta` |
|---|---|
| `solution` / `cages` / `signs` structure | `replay.meta.solution` `{ filled, unit: 'cell' }` / `replay.meta.cages` `{ count }` / `replay.meta.signs` `{ signs }` |
| `restart` | `replay.meta.restart` `{ filled, unit: 'cell' }` |
| `final` | `replay.meta.final` `{ clues }` or `replay.meta.final.signs` `{ clues, signs }` |
| `moves` that both clear and restore cells (an exchange, or removals and a reveal) | `replay.meta.change` `{ removed: Σ cleared (gross), revealed: Σ restored (gross, not the opening), clues }` |
| `moves` that removed signs (otherwise) | `replay.meta.signDigKept` `{ removed, kept, signs, unit: 'sign' }` when signs were kept, else `replay.meta.signDig` `{ removed, signs, unit: 'sign' }` (`signs` = alive at the end) |
| `moves` that cleared cells (otherwise) | `replay.meta.digKept` `{ removed, kept, clues, unit: 'cell' }` when cells were put back, else `replay.meta.dig` `{ removed, clues, unit: 'cell' }` |
| `moves` that restored clues only | `replay.meta.reveal` `{ revealed, clues }` |
| `moves` with only the opening `clues` move | `replay.meta.clues` `{ clues }` |

### Display arguments (`displayArgs`, extended)

| Argument | Shown as |
|---|---|
| `cellList`, `cells`, `removedCells`, `restoredCells` | cell names (`SG.i18n.cellLabel(cell, labeler)`), joined with ", " and the last two with `replay.list.last` ("R1C2 and R9C8", "R3C3, R7C7 and R6C9"); one cell: its name |
| `reason` | `T('replay.reason.' + reason)` |
| `clues`, `revealed` | counted clues (`unit.clue`) |
| `signs` | counted signs (`replay.unit.sign`) |
| `rated` | counted possible removals (`replay.unit.removal`) |
| `moves` | counted moves (`replay.unit.move`) |
| `filled`, `tried`, `removed`, `kept` | counted in the step's `unit` (`unit.cell`, or `replay.unit.sign` for `'sign'`) |
| `peak` | `SG.i18n.formatNumber(peak)` |
| `count`, `rounds`, `refused` | unchanged numbers (`count` chooses the plural form) |

`describeStep(step)` = the translated `parts` joined with one space; `describeStep(null)` = `T('replay.start')`.

### Table models (`step.table`, `player.tableAt`)

- Position 0 (no step): `{ state: 'start', status: null, reasons: [], counts: {}, before: null, empties: 0, score:
  null, change: null, transition: null, proof: null, position: null }`.
- `solution`, `structure`, `restart`: `state: 'zero'`, `counts: {}`, `empties: 0`, `score: 0`, `before: null`.
  Use the transition's change for a details restart (its real drop to 0); introductory zero steps have no delta.
- Other steps with `rating = analysis.ratings[vs.position]`: when `rating.score` is a number → `state: 'final'` for
  role `final`, else `'scored'`; `counts = rating.counts`; `empties = rating.empties`; `score = rating.score`;
  `change = transition ? transition.change : null`; `before = transition.before.counts` only when the transition
  exists and its previous total is finite. A one-step fallback has no predecessor. When `rating.score` is null →
  `state: 'status'`, `status = rating.status`, `reasons = rating.reasons`,
  `counts = rating.counts` (attempted rows, possibly `{}`), `empties = rating.empties`, `score: null`, `change: null`,
  `before: null`.
- `transition` = `analysis.transitions[vs.transition]` (null when `vs.transition` is null); `proof =
  analysis.proofs[vs.position] || null`.

## The player instance

- `load(result, opts)`: forget the views; store `result`; `position = 0`; draw the **finished puzzle** at once
  (`setValues(result.givens)`, `setGivens(result.givens)`, `clearHighlights()`, every layer of `LAYER_NAMES` visible,
  `setSignMarks(null)`; the app has installed the result's model); `state().loaded` is false (no steps), so every
  control is disabled; the view is reset to `'compact'` (the toggle is not stored, R6). With `opts.analysis`, call
  `setAnalysis(opts.analysis, { position: opts.position })` at once.
- `setAnalysis(analysis, opts)`: `views = buildViews(result, analysis)`; `built = views[view]` (`'compact'` after a
  load); `position = opts.position` when it is an integer, else the last position (the finished puzzle); render;
  update the controls; `onSteps({ steps: built.steps, position, view })`; emit the state and
  `onPosition(…, 'seek')`.
- `setView(name)`: no-op unless views exist and `name` is the other view. Map the position (R6): 0 → 0; a
  `solution` / `structure` / `final` step → the step of the same role; compact → details: the details step of move
  `step.last`; details → compact: the compact step whose `first ≤ step.position ≤ last` (a `moves` or `restart`
  step). Then `built = views[name]`, render, `onSteps(…)`, emit state and position (`'seek'`).
- `getView()` → `'compact'` | `'details'` | null (no views). `tableAt(p)` → the start model for `p === 0`, the
  step's `table` for `1 ≤ p ≤ length`, null otherwise or before the analysis.
- `setPreparation(state)`: store the `PrepState`; update the status block (below).
- `reset()`: also forgets the views and hides the status block. `getSteps`, `getStep`, `describe`, `state`, the
  navigation and `render` work on `built` as today. `render` keeps today's drawing (`viewAt`, frames by
  `MARK_CLASSES`, layers, Greater-Than models and sign marks).
- `bindControls(rootEl)` also binds `#replay-view-details` (`change` → `setView(checked ? 'details' : 'compact')`),
  `#replay-status`, `#replay-status-text` and `#btn-prepare-replay` (`click` → `options.onPrepare()`). `updateUi`
  keeps the toggle `disabled` while there are no views and `checked` when the view is `details`, and renders the
  status block:

| `PrepState.status` | `#replay-status` | `#replay-status-text` | `#btn-prepare-replay` | Browsing |
|---|---|---|---|---|
| `idle`, `ready`, `waiting` | hidden | — | hidden | enabled when views exist |
| `consent` | shown | `replay.prepare.notice` `{ button: T('replay.prepare.button') }` | shown, enabled | disabled |
| `trace` | shown | `replay.preparing.trace` | hidden | disabled |
| `preparing` | shown | `replay.preparing` `{ done, total }` (formatted numbers) | hidden | disabled |
| `unavailable` | shown | `replay.trace.unavailable` | hidden | enabled (fallback views) |
| `error` | shown | `replay.prepare.error` | hidden | enabled (fallback views) |

  "Browsing" is the four buttons, the slider and the toggle; they are disabled whenever there are no views. The
  texts follow a change of language (the existing `SG.i18n.onChange(updateUi)`). No mark is added to the slider
  (Q16 a): `.player__ticks` keeps one tick per step.

## The preparation controller (`SG.player.createPreparation`)

Options: `getClient()` (the app's client), `onState(state)`, `onAnalysis(analysis, result)`, `emit(name,
payload)`, and `fallback(result, reason)` (default `SG.replay.fallback`). All callbacks are called inside
`try … catch`.

Internals: `activeJob`, a monotonically increasing token, `consented`, and the current `PrepState`.
`isCurrent(job)` compares the captured job with `activeJob`; `publish(job, analysis, status)` is the guarded
publication helper described below. `run(job)` binds `result = job.result` locally, not a free variable.

```text
start(result):
  stop the old job and invalidate its token, WITHOUT clearing consent for this same result
  if consented !== result: consented = null
  activeJob = job = { token, result, client: getClient(), mode: null, running: false, runId: 0, traceUnavailable: false }
  state = waiting
  mode = await (job.client.ready ? job.client.ready() : job.client.mode)   (a rejection counts as 'main')
  if job changed meanwhile: return
  job.mode = mode === 'worker' ? 'worker' : 'main'
  if mode === 'worker' or consented === result: run(job) else state = consent
run(job):
  if job is stale: return
  result = job.result
  if job.traceUnavailable: publish(job, fallback(result, 'noLog'), unavailable); return
  if result.digLog is not a non-empty array:
    if result.fromCache === true:
      state = trace
      if consented === result: emit('replay:consent', { result })
    else: publish(job, fallback(result, 'noLog'), unavailable)
    return
  total = SG.replay.moves(result).moves.length (0 on a throw); state = preparing { done: 0, total }
  job.running = true; mine = ++job.runId
  call job.client.replay(result, { allowMain: consented === result, onProgress: guarded progress callback })
    (convert a synchronous throw into the same rejection path)
    resolve -> if job current AND job.runId === mine: job.running = false; publish(job, analysis, ready)
    reject  -> if job current AND job.runId === mine:
      job.running = false
      consent-required cancellation -> job.mode = main; consented = null; state = consent; no analysis
      other cancellation -> cancel(); no analysis
      otherwise -> publish(job, fallback(result, 'error'), error)
press():  job = activeJob; only in state consent: consented = job.result; run(job); return true (else false)
unavailable(result):
  job = activeJob
  only for the current job.result: latch job.traceUnavailable = true; return false for another result
  while mode is unknown, or in main mode without consent: do not publish or enable browsing
  otherwise increment job.runId, clear running, cancel the replay on job.client, then publish the fallback
  return true
cancel(): stop the job on its CAPTURED client, invalidate its token; consented = null; state = idle
state():  the current PrepState
```

- Every progress and settlement callback checks both the job token and its captured `runId`.
- Before running or publishing a fallback, a live `job.client.mode === 'main'` overrides an earlier worker
  readiness result: without same-result consent, stay in `consent`, not a browsable fallback. Unknown readiness
  still waits. Cover the worker-to-main race with a missing-log result, not only the scored replay path.
- `publish` checks the job token before `onAnalysis` and again before changing state (callbacks can cancel or
  replace a job). All running flags are cleared on settlement. Stopping a job inside `start` is not the public
  `cancel()` method, which intentionally clears consent. Calls to `unavailable` before readiness/consent are
  **latched**, not a way to bypass Q19 a.
- A cancelled job never calls `onAnalysis` (its answer is stale). Nothing calls `client.replay` or a solver while
  the state is `waiting` or `consent` (Q17 b, Q19 a).
- In main mode a cached puzzle without its record: the press moves to `trace` and emits `'replay:consent'`; the
  cache generates the record (one direct regeneration, not a cache hit, so it cannot loop) and calls
  `SG.app.attachTrace`; the app calls `start(result)` again, which runs at once because `consented === result` — no
  second press. An imported puzzle without a record: `unavailable` (after the press in main mode).

## App wiring (`app.js`)

- `start()`: create the player with `onSteps: function (info) { stepView.setSteps(info.steps);
  stepView.setPosition(info.position); }` and `onPrepare: function () { preparation.press(); }`; then
  `preparation = SG.player.createPreparation({ getClient: getClient, onState: function (s) {
  player.setPreparation(s); }, onAnalysis: function (analysis, result) { if (current !== null && current.result ===
  result) player.setAnalysis(analysis); }, emit: emit })`. The steps panel keeps its `stats` option through an
  adapter (decision D18):
  `stats: function (p) { const m = player !== null ? player.tableAt(p) : null; return m && (m.state === 'scored' ||
  m.state === 'final' || m.state === 'zero') ? { counts: m.counts, before: m.before || {}, empties: m.empties,
  score: m.score } : null; }`.
- `loadReplay(result)`: `player.load(result); stepView.clear(); preparation.start(result);`.
- `succeed()`: always `loadReplay(result)` (line 723 no longer depends on `digLog`).
- `attachTrace()`: retain the same result identity and restart its preparation through `loadReplay`.
  Replace an absent **or empty** `result.digLog` with a non-empty supplied log; reject attachment if neither
  is usable. The old `Array.isArray([])` check must not strand a consented job in `trace` forever.
- `beginRun`, `fail`, `cancel`, `discardPuzzle`, `destroy`: `preparation.cancel()` (when it exists).
- `markTraceUnavailable()`: `if (!started || current === null) return false; return
  preparation.unavailable(current.result);` — exported on `SG.app`.
- The JSDoc header: `markTraceUnavailable()` in PUBLIC API; the event `'replay:consent' { result }`; `'position'`
  carries "a step of `SG.player.buildViews`"; the replay contract: the board shows the finished puzzle at once; the
  score tables are prepared after the result is shown (worker mode: automatically; main mode: after "Prepare score
  tables"); nothing plays by itself.

## Cache gate (`cache.js`)

- `modeOf(client)` returns `Promise.resolve('main')` when absent. Otherwise call `client.ready()` inside
  `try … catch` when available (or read `client.mode`), normalize through `Promise.resolve`, and resolve
  only `'worker'` or `'main'`; a throw/rejection resolves `'main'`. Callers still guard the served identity.
- `onResult`: instead of `startTrace(served)` (line 1085) call `gateTrace(served)`:

```text
gateTrace(s):
  if already started this gate: maybeStartTrace(s); return
  set s.gateStarted = true, s.traceStarted = false, s.traceReady = false; preserve s.consented
  s.pageMode = await modeOf(inner), treating a rejection as main; guard served identity
  if page mode is main:
    s.traceClient = inner; s.traceReady = true; maybeStartTrace(s)
  otherwise:
    obtain the background client; await its mode; guard served identity
    if absent, rejected or not worker: markUnavailable()
    else s.traceClient = background; s.traceReady = true; maybeStartTrace(s)
maybeStartTrace(s):
  stale, already started, or not ready -> return
  if inner.mode is now main: s.pageMode = main; s.traceClient = inner
  page main and !s.consented -> wait
  otherwise set s.traceStarted = true BEFORE startTrace(s, s.traceClient); call exactly once
markUnavailable() = attempt(() => typeof app.markTraceUnavailable === 'function' && app.markTraceUnavailable())
on 'replay:consent' { result }: if served !== null && served.result === result:
  served.consented = true; maybeStartTrace(served)
```

- Consent can arrive **before** background readiness; never require a previously set `waiting` flag or discard
  that click. Readiness failures before the click must not expose fallback browsing. Keep the direct uncached
  regeneration of `startTrace`; it must not call the cache wrapper's `generate` recursively.
- Make the default background factory `SG.workerClient.create({ forceMode: 'worker' })`; GS04 enforces this
  even on respawn failure. An automatic trace can therefore never silently become a main-thread generation.
  After a main-mode press, use **inner.generate**, not the cache wrapper and not a worker-only background
  client. `startTrace(s, traceClient)` uses the supplied client for its existing job/buffer/cancel lifecycle.
  A main-mode page does not need to create or await a background worker to obtain consent.
- In `startTrace`, when the regeneration fails and `served === s`: today's `note.show('cache.failed')` **and**
  `markUnavailable()`. In `finishTrace`, when `attachTrace` returns false: today's note and `markUnavailable()` (it
  does nothing when nothing is shown).
- Subscribe to `'replay:consent'` in `start()` with the other subscriptions (removed by `destroy`).
- The schema, keys, payloads, the pool and the four `cache.*` strings do not change.

## Markup and styles

Insert in `generator/index.html` inside `#steps-root`, after the closing `</div>` of `.player__controls` (line 321)
and before the panel header (line 323):

```html
          <div class="replay-bar">
            <label class="replay-view" for="replay-view-details">
              <input id="replay-view-details" class="replay-view__input" type="checkbox" disabled>
              <span data-i18n="replay.view.details"></span>
            </label>
          </div>
          <div id="replay-status" class="replay-status" role="status" aria-live="polite" hidden>
            <p id="replay-status-text" class="replay-status__text"></p>
            <button id="btn-prepare-replay" type="button" class="btn btn--primary btn--sm" hidden>
              <span data-i18n="replay.prepare.button"></span>
            </button>
          </div>
```

`generator/css/steps.css`: `.replay-bar` (flex row, `gap: var(--sg-space-2)`, `margin-top: var(--sg-space-2)`),
`.replay-view` (inline-flex, centred, `gap: var(--sg-space-1)`, `font-size: var(--sg-font-size-sm)`, pointer cursor),
`.replay-status` (`border: 1px solid var(--sg-color-border)`, `border-radius: var(--sg-radius-2)`, `padding:
var(--sg-space-2) var(--sg-space-3)`, `margin: var(--sg-space-2) 0`, `background: var(--sg-color-surface)`),
`.replay-status[hidden] { display: none; }`, `.replay-status__text` (`margin: 0 0 var(--sg-space-2)`). Existing
tokens only (the `steps` suite checks it).

## Strings (`player.js` locale fragment)

New or changed keys of this task (report §8; † = decision D7 / D12). Keep every other existing `replay.*` key. The
straight quotes of `replay.prepare.notice` are part of the text (escape them in the single-quoted JS string).

| Key | English | Vietnamese |
|---|---|---|
| `replay.view.details` | Show every move | Hiện từng thay đổi |
| `replay.preparing` | Preparing the score tables… {done} of {total} | Đang chuẩn bị bảng điểm… {done}/{total} |
| `replay.preparing.trace` † | Preparing the score tables: rebuilding the generation record… | Đang chuẩn bị bảng điểm: đang dựng lại bản ghi quá trình tạo đề… |
| `replay.prepare.button` | Prepare score tables | Chuẩn bị bảng điểm |
| `replay.prepare.notice` | This page has no background worker. Press '{button}' to calculate the score tables on this page; the page may stop responding briefly while it works. | Trang này không có tiến trình nền. Nhấn '{button}' để tính bảng điểm ngay trên trang; trang có thể tạm thời không phản hồi trong lúc tính. |
| `replay.prepare.error` | The replay could not be fully prepared. Available tables are kept; unavailable results show a status. | Không thể chuẩn bị đầy đủ phần phát lại. Các bảng điểm đã có vẫn được giữ lại; kết quả chưa có được thay bằng trạng thái tương ứng. |
| `replay.trace.unavailable` | The full generation record of this puzzle is not available; the replay shows only the solution, the structure and the finished puzzle. | Không có bản ghi đầy đủ quá trình tạo đề này; phần phát lại chỉ hiện lời giải, cấu trúc và đề hoàn chỉnh. |
| `replay.title.guided` (changed) | Choosing clues to remove | Chọn số cho sẵn để bỏ |
| `replay.title.dig` | Removing clues | Bỏ số cho sẵn |
| `replay.title.search` | Adjusting the puzzle | Điều chỉnh đề |
| `replay.title.mixed` | Combined changes | Các thay đổi được gộp |
| `replay.random.all` (changed) | Clear {removed} chosen at random: the puzzle can still be solved without their clues. | Bỏ số ở {removed} được chọn ngẫu nhiên: đề vẫn giải được khi thiếu các số đó. |
| `replay.random.some` (changed) | Try to clear {tried} chosen at random: {removed} cleared, {kept} put back because {reason}. | Thử bỏ số ở {tried} được chọn ngẫu nhiên: bỏ được số ở {removed} và khôi phục số ở {kept}, vì {reason}. |
| `replay.dig.all` | Clear {removed}: the puzzle can still be solved without their clues. | Bỏ số ở {removed}: đề vẫn giải được khi thiếu các số đó. |
| `replay.dig.some` | Try to clear {tried}: {removed} cleared, {kept} put back because {reason}. | Thử bỏ số ở {tried}: bỏ được số ở {removed} và khôi phục số ở {kept}, vì {reason}. |
| `replay.dig.rebuilt` | Clear {removed}. | Bỏ số ở {removed}. |
| `replay.reason.techniques` (changed) | without their clues, the solver did not finish the puzzle with the techniques of this level | bộ giải chưa giải xong đề bằng các kỹ thuật của mức này khi thiếu các số đó |
| `replay.unit.removal_one` (VI changed) | {count} possible removal | {count} cách bỏ số |
| `replay.unit.removal_other` (VI changed) | {count} possible removals | {count} cách bỏ số |
| `replay.guided` (changed) | Compare {rated} ({refused} rejected) and choose the removal preferred by the generator's check: {cellList}. | Xét {rated} ({refused} bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề: bỏ số ở {cellList}. |
| `replay.guided.rounds` (changed) | Across {rounds} accepted removals, compare {rated} ({refused} rejected); the removed clues are at {cellList}. | Qua {rounds} lần chọn phương án bỏ số, đã xét {rated} ({refused} bị loại); các ô được bỏ số là {cellList}. |
| `replay.exchange_one` | Adjust the clues to look for a higher-scoring puzzle: clear {removed} and restore {revealed}. | Điều chỉnh số cho sẵn để thử tạo đề có điểm cao hơn: bỏ số ở {removed} và khôi phục {revealed}. |
| `replay.exchange_other` | Across {count} complete changes, clear {removed} and restore {revealed} while looking for a higher-scoring puzzle. | Qua {count} thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn, tổng cộng bỏ số ở {removed} và khôi phục {revealed}. |
| `replay.searchRemove` | Clear {removed} while looking for a higher-scoring puzzle. | Bỏ số ở {removed} để thử tạo đề có điểm cao hơn. |
| `replay.reveal.search` (changed) | Restore {revealed} while looking for a higher-scoring puzzle. | Khôi phục {revealed} để thử tạo đề có điểm cao hơn. |
| `replay.meta.change` | {removed} cleared · {revealed} restored · {clues} left | bỏ số ở {removed} · khôi phục {revealed} · còn {clues} |
| `replay.folded.peak` | Within this step, the score reached {peak}. | Trong bước này, điểm có lúc đạt {peak}. |
| `replay.folded.reveal` | Within this step, the score reached {peak}, above the chosen level, and {revealed} were restored during refinement. | Trong bước này, điểm có lúc đạt {peak}, vượt mức độ khó đã chọn; {revealed} đã được khôi phục khi điều chỉnh đề. |
| `replay.folded.unscored_one` † | {count} position within this step could not be rated. | Có {count} trạng thái trong bước này không chấm được điểm. |
| `replay.folded.unscored_other` | {count} positions within this step could not be rated. | Có {count} trạng thái trong bước này không chấm được điểm. |
| `replay.restart` (VI changed) | The final check found a second solution, so the holes are dug again from the full grid with a plain uniqueness check ({filled}). | Bước kiểm tra cuối tìm thấy lời giải thứ hai, nên trình sinh đề bắt đầu lại từ lưới đầy đủ, chỉ với phép kiểm tra lời giải duy nhất ({filled}). |
| `replay.restart.folded` | Before starting again, generation reached {peak} points after {moves}. | Trước khi làm lại, quá trình tạo đề đã đạt {peak} điểm sau {moves}. |
| `replay.unit.move_one` | {count} move | {count} thay đổi |
| `replay.unit.move_other` | {count} moves | {count} thay đổi |
| `replay.rebuilt` | This replay is reconstructed from the finished puzzle's clues; it is not a record of the original generation order. | Bản phát lại này được dựng từ các số cho sẵn của đề hoàn chỉnh, không ghi lại thứ tự tạo đề ban đầu. |
| `replay.clues` (changed) | Clear the grid, then show {clues}. | Xóa các số trên lưới rồi hiện {clues}. |
| `replay.list.last` | {list} and {last} | {list} và {last} |

### Expected texts of the example (compact view; Classic 9×9, Expert, seed 3275974478)

| Step | Title (EN / VI) | Text (EN) | Text (VI) |
|--:|---|---|---|
| 1 | Full solution / Lời giải đầy đủ | Fill the whole grid with a random solution that follows every rule (81 cells). | Điền kín lưới bằng một lời giải ngẫu nhiên tuân theo mọi luật (81 ô). |
| 2 | Random removals / Xóa ngẫu nhiên | Clear 14 cells chosen at random: the puzzle can still be solved without their clues. | Bỏ số ở 14 ô được chọn ngẫu nhiên: đề vẫn giải được khi thiếu các số đó. |
| 3 | Random removals / Xóa ngẫu nhiên | Try to clear 35 cells chosen at random: 29 cells cleared, 6 cells put back because without their clues, the solver did not finish the puzzle with the techniques of this level. | Thử bỏ số ở 35 ô được chọn ngẫu nhiên: bỏ được số ở 29 ô và khôi phục số ở 6 ô, vì bộ giải chưa giải xong đề bằng các kỹ thuật của mức này khi thiếu các số đó. |
| 4 | Choosing clues to remove / Chọn số cho sẵn để bỏ | Compare 15 possible removals (5 rejected) and choose the removal preferred by the generator's check: R1C2 and R9C8. | Xét 15 cách bỏ số (5 bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề: bỏ số ở R1C2 và R9C8. |
| 5 | Choosing clues to remove / Chọn số cho sẵn để bỏ | Across 3 accepted removals, compare 17 possible removals (6 rejected); the removed clues are at R3C3, R7C7, R3C9, R7C1, R4C1 and R6C9. | Qua 3 lần chọn phương án bỏ số, đã xét 17 cách bỏ số (6 bị loại); các ô được bỏ số là R3C3, R7C7, R3C9, R7C1, R4C1 và R6C9. |
| 6 | Adjusting the puzzle / Điều chỉnh đề | Across 5 complete changes, clear 10 cells and restore 10 clues while looking for a higher-scoring puzzle. | Qua 5 thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn, tổng cộng bỏ số ở 10 ô và khôi phục 10 số cho sẵn. |
| 7 | Finished puzzle / Đề hoàn chỉnh | The finished puzzle: 30 clues. | Đề hoàn chỉnh: 30 số cho sẵn. |

Table totals of these steps: 0, 23, 44, 551, 568, 992, 992; changes: none (a zero step), +23, +21, +507, +17, +424
and 0 (the final step: "992 (unchanged)").

## Files to create/modify

### Exclusive ownership

- `generator/js/ui/player.js`, `generator/js/ui/app.js`, `generator/js/ui/cache.js`, `generator/index.html`
  (the replay markup only), `generator/css/steps.css` (the rules above only), `generator/js/ui/help.js`
  (`help.generation.replay` and `help.controls.replay` only)
- `generator/tests/suites/player.test.js`, `generator/tests/suites/steps.test.js` (migration only),
  `generator/tests/suites/cache.test.js`, `generator/tests/suites/ui-contract.test.js` (`SURFACE.player`,
  `SURFACE.app`, `PLAYER_INSTANCE`, `MOUNT_IDS`)

### Documentation slot

- At this commit, describe the new views/preparation and the already-rendered ordinary scored tables.
  Do not promise that the unchanged `step-view.js` already renders zero/status tables: GS06 completes that
  presentation and updates the relevant user-guide/Help sentence. The data models are complete in GS05.
- `USERGUIDE.md` (lines 82–86, 110–115, 233–237) and `USERGUIDE.vn.md` (lines 83–87, 110–116, 233–237): the replay
  opens on the finished puzzle and shows a few steps chosen so that the score rises steadily and never goes down;
  "Show every move" shows every recorded change, including those that lowered the score; scored construction
  steps show their technique/empty-cell tables (the all-state presentation is GS06); the score
  tables are prepared after the puzzle appears; opened from a file, the replay waits for "Prepare score tables" and
  the page may pause briefly while it works (Known limitations). No code, no test.
- `DEVELOPERGUIDE.md`: the replay paragraph (lines 235–257): `SG.player.buildViews(result, analysis)` (pure) builds
  the steps of both views from `SG.replay`'s analysis; the compact view (score-chosen steps, never decreasing, a step
  at every phase end) and the details view (one step per complete move); titles and sentences per run of moves; the
  frames show the net change; the example becomes "A Classic 9×9 *easy* puzzle with seed 3, for example, replays in
  7 steps (26 with every move shown): the full solution, four steps of random removals (scores 14, 24, 34 and 44),
  one step of the guided dig (46) and the finished puzzle with 34 clues" (assert these expectations in the
  "guide example" test; do not change them to fit a failure); the preparation (worker mode automatic, main mode after the button; the status block;
  `SG.player.createPreparation`); the step description takes its tables from `player.tableAt`. The cache paragraph
  (lines 271–282): a cached puzzle's replay waits while its record is regenerated in the background ("Preparing the
  score tables: rebuilding the generation record…"); in main mode the regeneration waits for the press;
  `SG.app.markTraceUnavailable()` shows the fallback when the record cannot be had. The UI-modules paragraph (lines
  351–362): add `markTraceUnavailable()` and the `replay:consent` event; `step` is a step of `SG.player.buildViews`.
- `DEVELOPERGUIDE.vn.md`: the same facts (lines 221–238, 255–266, 320–331).
- `generator/design.md` §7.3 (lines 757–790): rewrite for the new replay: the diagram (result → `SG.replay` analysis
  (worker or after the button) → `SG.player.buildViews` → player → board; `#step-detail`); finished first, moved by
  hand; the two views and the toggle; built from the analysis (moves from the dig log, §7.5); the table of kinds
  (title, what the board shows, card phase / line) with the new kinds `dig`, `search`, `mixed` and without batch
  sizes; the example (Classic 9×9 easy seed 3: 7 compact / 26 details; Killer hell 2 seed 11: 9 compact
  (0, 0, 27, 98, 162, 517, 579, 3723, 3723) / 38 details — verify both with the implementation); steps are plain data
  (the `Step` fields above); one place drives the rest; the board (net frames); the step description (tables from
  `player.tableAt` via `stats`; GS06 completes it); the cache and the main-mode gate. §12.1 (line 1361): the
  `player.js` line ("replay steps of both views from the analysis, the preparation controller"). §13.14 (line 1588):
  `markTraceUnavailable()`, the `replay:consent` event, `SG.player.buildViews`. §15.2 (line 1749): the row of
  `steps.test.js`, `player.test.js` (the views, texts, table models, preparation, toggle).
- `generator/js/ui/help.js` `help.generation.replay`: EN "As soon as a puzzle is ready, the board shows it; nothing
  plays by itself. The Generation steps tab then prepares a score table for every step (in the background; when the
  page has no background worker, for example opened from a file, press Prepare score tables first). Use First step,
  Previous step, Next step and Last step under the board, or drag the slider, to see how the puzzle was made: the
  full solution, the cages or the signs (Killer and Greater-Than only), the removals chosen at random, the removals
  the generator chose with its own check, any adjustments, and the finished puzzle. The steps are chosen so that the
  score rises steadily and never goes down; tick Show every move to see each recorded change on its own, including
  changes that lowered the score. Rated construction steps show the techniques used and the empty cells.
  The Explain button opens this page at the step on
  show. On the board, an amber frame marks the cells whose clues were cleared in the step, a dashed red frame the
  cells put back, and a dotted frame the clues shown again." VI "Khi đề đã sẵn sàng, bàn cờ hiện ngay đề hoàn chỉnh;
  không có gì tự chạy. Thẻ Các bước tạo đề sau đó chuẩn bị bảng điểm cho từng bước (chạy ở nền; nếu trang không có
  tiến trình nền, chẳng hạn khi mở từ tệp, hãy nhấn Chuẩn bị bảng điểm trước). Dùng các nút Bước đầu tiên, Bước
  trước, Bước tiếp theo và Bước cuối cùng bên dưới bàn cờ, hoặc kéo thanh trượt, để xem đề được làm ra thế nào: lời
  giải đầy đủ, các lồng hoặc các dấu so sánh (chỉ có ở Sudoku Sát thủ và Sudoku So sánh), các lần bỏ số được chọn
  ngẫu nhiên, các lần bỏ số do trình sinh đề chọn theo phép kiểm tra của nó, các lần điều chỉnh nếu có, và đề hoàn
  chỉnh. Các bước được chọn để điểm tăng đều và không bao giờ giảm; đánh dấu Hiện từng thay đổi để xem riêng từng
  thay đổi đã ghi lại, kể cả những thay đổi làm điểm giảm. Các bước tạo đề đã được chấm điểm có bảng ghi kỹ thuật
  đã dùng và số ô trống. Nút Giải thích mở trang này ở đúng
  bước đang xem. Trên bàn cờ, khung màu hổ phách đánh dấu các ô bị bỏ số ở bước này, khung đỏ nét đứt đánh dấu các ô
  được trả lại, và khung chấm đánh dấu các số cho sẵn được hiện lại."
- `generator/js/ui/help.js` `help.controls.replay` (the replay controls of the glossary; the toggle and the button are
  new replay controls): EN "Under the board, First step and Last step jump to the beginning or the end of the
  replay, Previous step and Next step move one step at a time, and the slider goes straight to any step. The label
  beside them tells which step is shown. Show every move switches between the steps chosen for a steady score and
  every recorded change, and keeps the replay at the same point of the generation. When the page has no background
  worker, these controls wait until Prepare score tables has been pressed and preparation has finished."
  VI "Bên dưới bàn cờ, Bước đầu tiên và
  Bước cuối cùng nhảy về đầu hoặc đến cuối phần phát lại, Bước trước và Bước tiếp theo chuyển từng bước một, còn
  thanh trượt đưa thẳng đến bước bất kỳ. Nhãn bên cạnh cho biết bước nào đang được hiển thị. Hiện từng thay đổi
  chuyển giữa các bước được chọn để điểm tăng đều và toàn bộ các thay đổi đã ghi lại, và giữ phần phát lại ở cùng
  thời điểm của quá trình tạo đề. Khi trang không có tiến trình nền, các nút này chờ đến khi bạn nhấn Chuẩn bị bảng
  điểm và việc chuẩn bị đã hoàn tất."

## Implementation steps

1. `player.js`: remove `RATE_FREE_KINDS`, `RATE_BUDGET_MS`, `batchCells`, `roundsPerStep`, `batchSigns`,
   `buildSteps`, `replayLog`, `scored`, `techniquesAt`, `rateStep`; add `buildViews` and its helpers, the extended
   `displayArgs`, `describeStep` over `parts`, `stepMeta` over `meta`, the new `KINDS`, the strings.
2. The instance: `load`, `setAnalysis`, `setView`, `getView`, `tableAt`, `setPreparation`, the bound toggle and
   status block, `onSteps` / `onPrepare`; then `createPreparation`.
3. `index.html` markup and `steps.css` rules.
4. `app.js` wiring and header; `cache.js` gate.
5. Tests (migration and new cases); `help.js`; documents; the quick set.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| GS05-B01 | N2 data contract: every compact step of the 14 goldens has a numerical table model (`zero`, `scored` or `final`), and every details step has a table model. The existing adapter displays ordinary scored tables; zero/status rendering is completed in GS06, not falsely required from the unchanged panel here | `player`, `steps` suites |
| GS05-B02 | Q17 b + Q19 a: in main mode nothing is prepared before the press — no `client.replay`, no solver call, no record regeneration (also on a cache hit without a record, through `attachTrace` and after a change of language); browsing is disabled and the notice and button are shown; after the press both views open; in worker mode the preparation starts by itself only after `ready()` confirmed the worker | `player`, `cache` suites; GS08 smoke |
| GS05-B03 | Q1 a: the compact view is the default after every new puzzle; "Show every move" switches to the details view and back, keeping the place; the choice is not stored | `player` suite; review |
| GS05-B04 | Q3 a / Q13 a: a compact step that folds a higher inner score says so (`replay.folded.*`); the "Starting again" step tells the abandoned peak; real drops appear only in the details view | `player` suite |
| GS05-B05 | Q15 a and R11 i: a rebuilt Killer log uses "Clear {removed}." and the note; "at random" only for a random order of a normal log (a `snake` order gets the order-neutral text) | `player` suite |
| GS05-B06 | The example's seven compact steps read exactly as in the table above, in English and Vietnamese | `player` suite |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| GS05-T01 | `buildViews` is pure and deterministic; every `Step` has the fields of the contract; `KINDS` has the 13 kinds and each has a `replay.title.*` key | `player` suite |
| GS05-T02 | Counts per run of moves: guided `rated` / `refused` from spans and trails (G01 step 4: 15 / 5; step 5: 17 / 6 with `rounds` 3); random `tried = removed + kept`; exchange gross counts (G01 step 6: 5 / 10 / 10) | `player` suite |
| GS05-T03 | Marks show the net change (G01 compact step 6: `dug` R4C2, R5C1, R5C9, R6C8; `revealed` R1C8, R2C8, R8C2, R9C2); in the details view `dug` cells are 0 and `kept` cells hold their solution value | `player` suite |
| GS05-T04 | Table models: start at 0; `zero` for the solution, structure and restart steps; `scored` / `final` with `score`, `change`, `before`; a `status` step has no score and no change, and the next scored step has `change` null | `player` suite |
| GS05-T05 | View mapping (G01): compact step 4 ↔ details step 24 (move 23); details step 26 (move 25) → compact step 5; position 0 and the final step map to themselves | `player` suite |
| GS05-T06 | The preparation controller: every transition of the pseudo-code (worker, main, press, cached without record in both modes, imported without record, error, stale answer, cancel) | `player` suite (fake clients) |
| GS05-T07 | Cache gate: main page waits for `'replay:consent'` (and ignores one for another result); worker page with a main background → `markTraceUnavailable`; a failed regeneration → `markTraceUnavailable`; the existing trace tests pass with `await flush()` after the display | `cache` suite |
| GS05-T08 | The page no longer rates: no `RATE_BUDGET_MS`, `RATE_FREE_KINDS`, `techniquesAt`, `rateStep`, `batchCells`, `roundsPerStep`, `batchSigns`, `buildSteps` in `player.js`; navigating, toggling and changing the language after `setAnalysis` call `SG.logicalSolver.solve` 0 times | `player` suite (spy); review |
| GS05-T09 | Q16 a: no slider mark, no proof drawn on the board; one tick per step | `player` suite; review |
| GS05-T10 | Contract updates of D13 only: `SURFACE.player` (`buildViews`, `createPreparation`; `buildSteps` gone), `SURFACE.app` (+ `markTraceUnavailable`), `PLAYER_INSTANCE` (+ `setPreparation`, `setAnalysis`, `setView`, `getView`, `tableAt`), `MOUNT_IDS` (+ `replay-view-details`, `replay-status`, `replay-status-text`, `btn-prepare-replay`); the page has no untranslated text | `ui-contract`, `i18n` suites |
| GS05-T11 | Strings: every key above in both languages with the same placeholders, plural pairs, no placeholder left in any rendered step text (EN and VI, every golden, both views) | `i18n`, `player` suites |
| GS05-T12 | N1 and storage: `pipeline`, `smoke`, `history`, `export`, `cache` storage tests unchanged and green; the quick sets pass; documents in both languages; CRLF | command output; review |

## Test plan

### Exact Node commands

```powershell
$ErrorActionPreference = 'Stop'
Push-Location generator
try {
  node tests\node-runner.js --suite=player,steps
  if ($LASTEXITCODE -ne 0) { throw 'Replay UI suites failed' }
  node tests\node-runner.js --suite=cache,ui-contract,i18n,help
  if ($LASTEXITCODE -ne 0) { throw 'Contract suites failed' }
  node tests\node-runner.js
  if ($LASTEXITCODE -ne 0) { throw 'Generator quick set failed' }
} finally { Pop-Location }
Push-Location player
try {
  node tests\node-runner.js --suite=help
  if ($LASTEXITCODE -ne 0) { throw 'Player guide checks failed' }
} finally { Pop-Location }
```

### Test migration (intended contract changes, D13)

Results: build them with `SG.store.toConfig` or keep the suites' own `realResult` helper; analyses with
`SG.replay.analyse(result)` (memoised per result). `stepsOf(result)` becomes the details view
(`P.buildViews(result, analysisOf(result)).details.steps`) unless a row says otherwise.

| Test (line at `8d9510a`) | Change |
|---|---|
| `player.test.js` 152 (the nine cases) | run for both views; `P.KINDS` contains every kind |
| 178 (frames what each dig step did) | details view; `dug` cells are 0 and were clues before; `kept` cells keep their value; `args.removed` equals `marks.dug.length` for single-move removal steps |
| 199 (counters add up) | details view; the counters as defined in "Board, structure and marks" |
| 223 (batches of a ninth) | rewritten: the compact view never decreases, every compact step is scored and the last one is the finished puzzle; the details view has one step per move |
| 240 (one guided round per step) | rewritten: a guided step's `rated` / `refused` come from its spans (G01 values of GS05-T02), `cellList` equals its removed cells in move order, `line` is `deeper` |
| 256 (Killer cages), 265 (Greater-Than), 292 (no log: use `SG.replay.fallback(result, 'noLog')`), 303 (deterministic) | the same assertions on the new steps (Greater-Than: `signs.hidden` / `removed` follow the alive signs; the final step uses `replay.final.signs`) |
| 311 (sizes its batches) | removed with the batch helpers; replaced by "one complete move per details step: no position shows half of an exchange" |
| 336 (a batch closes before a reveal) | keeps its meaning: in the synthetic log the details steps are `solution, random, reveal, final` and the reveal's clues are not on the removal step's board |
| 354 (several guided rounds share a step) | keep the existing log: it contains no `keep`. Engine moves are `solution, searchRemove, exchange`; details title kinds are `solution, search, search, final`. The second accept merges with its immediately following search reveal. Assert the restored `[0, n-1]` and removed `[1, n-2]` on the exchange endpoint; never expect two guided moves or a separate `searchAdd` |
| 379 (real results replay faithfully) | details view: every step's values equal `analysis.moves[step.position].values` |
| 391 (`viewAt`), 405 (texts), 437 (titles), 444–548 (navigation, Greater-Than models, reset) | `P.buildViews(…).details` for `viewAt`; texts for both views and every golden of GS02 that is fast; navigation tests call `player.load(result, { analysis })` |
| 549 (controls) | `fakeControls` gains `#replay-view-details`, `#replay-status`, `#replay-status-text`, `#btn-prepare-replay` |
| `steps.test.js` 199–390 | `SG.player.buildSteps(r).steps` → `SG.player.buildViews(r, SG.replay.analyse(r)).compact.steps`; `player.rateStep(p)` → the adapter of "App wiring" over `player.tableAt(p)`; the test "rates the puzzle of each step" (270) becomes "every step has a table model: start at 0, zero for the solution, the result's rating at the end, `before` = the counts of the step shown before"; when the legend test's exact list changes with the new steps, compare with the frames the steps actually use |
| `cache.test.js` 961, 985, 996, 1012, 1023, 1041, 1058, 1070, 1088, 1394, 1479 | `await flush();` right after the `env.app.display(...)` of a served puzzle (the trace now starts after `ready()`) |
| `ui-contract.test.js` 51–74, 426–430 | the D13 lists of GS05-T10 |

### New test cases

| Case | Expected result |
|---|---|
| The example's texts | G01 compact: the titles and texts of the table "Expected texts of the example" in EN and VI (cell labels with `SG.i18n.setCellLabeler`); `stepMeta` of step 6 is "10 cells cleared · 10 clues restored · 30 clues left" |
| The guide example | `classic9` / `easy` / seed 3: 7 compact steps with totals `0, 14, 24, 34, 44, 46, 46` and 26 details steps (the numbers the guides state) |
| Table models | GS05-T04 on G01 (step 1: `zero`; step 2: `scored`, change 23, `before` {}; step 4: change 507, `before` the counts of step 3; step 7: `final`, change 0) and on a synthetic analysis whose `ratings[k]` is `{ status: 'stuck', reasons: ['stuck', 'ambiguous'], score: null, counts: {...} }` |
| Folds | G06 compact step 6 ends with the `replay.folded.*` sentence of peak 2967; G07 step 8 and G10 step 8 likewise; a step without a fold has none |
| Restart (synthetic) | GS01's synthetic restart log (`pass random; accept [0,15]; restart; pass fallback; accept [0,15]; reject [1,14] ambiguous` on Classic 4×4) analysed with `SG.replay.analyse`: the compact restart step's text is `replay.restart` then `replay.restart.folded` with the score of move 1 as the peak and "1 move" |
| Rebuilt log | the rebuilt copy of G09 (GS01's synthetic case): every compact dig step uses `replay.dig.rebuilt` and ends with `replay.rebuilt`; title `dig` ("Removing clues") |
| Order-neutral | the example with `config.digOrder: 'snake'` on a copy (analyse the copy): random steps use `replay.dig.*` and the title "Removing clues" |
| Preparation (fake clients) | worker: `start(r)` → after a flush `replay` called once, states `waiting` → `preparing` → `ready`, `onAnalysis` once; main: `start(r)` → `consent`, 0 `replay` calls; `press()` → `replay` called, then `ready`; cached without record, worker → `trace`, no emit; cached without record, main → `consent`, `press()` → `trace` + one `'replay:consent'`, then `start(r)` with a record → `replay` called without a second press; imported without record → `unavailable` with a fallback analysis (main: after the press); a rejected replay → `error` with `fallback === 'error'`; `start(r2)` before `r1` answers → `cancelReplay` called, `r1`'s analysis ignored; `cancel()` → `idle` |
| No solver before the press | spy on `SG.logicalSolver.solve` and `SG.replay.prepare`: a main-mode `start`, `setPreparation`, a locale change and navigation calls leave both counts at 0 |
| Toggle | `setView('details')` on G01 at compact step 4 → position 24; back → 4; `getView()`; `onSteps` called each time; `tableAt` follows the view |
| Status block | with fake controls: `consent` shows the notice with the translated button name and the button; `preparing` shows "Preparing the score tables… 3 of 32" (EN); controls disabled until `setAnalysis`; clicking the button calls `onPrepare` once |
| Cache gate | GS05-T07 with `makeEnv({ mode: 'main' })`, `makeEnv({ bgMode: 'main' })` and a failing regeneration; the spy `env.app.markTraceUnavailable` is added by the test |

Add race controls: a main-mode press before background `ready()` resolves still starts exactly one trace;
unavailability received before readiness or consent keeps browsing disabled until the press; the same result
after `attachTrace` retains consent (including an initially empty log); a changed result does not.
A client switching from worker to main returns
to consent without a `prepare` call. A replaced/running job is cancelled on its captured client and cannot publish.
For all synthetic logs that change the final givens, recompute the supplied final rating in setup (GS01).

## Definition of done & handoff

- Every criterion has its evidence; the quick set passes; the migrations are only those listed.
- Handoff to GS06: the `Step` and `TableModel` shapes as implemented; where `marks` / `signs` are built (GS06 adds
  `cause`); the `stats` adapter that GS06 replaces with `table`; the help text as written.

## Execution log

| Field | Value |
|---|---|
| Status | Done (plus one orchestrator fix in a heavy suite, see issues) |
| Start | 2026-10-29 00:08:28 (+07:00) |
| End | 2026-10-29 00:42:25 (+07:00) |
| Duration | 33 min 57 s |
| Model | claude-sonnet-5.5 (sub-agent `GS05-replay-views-texts`, general-purpose); wave 5, alone |
| Token usage | 195 model calls; 44,385,905 input (43,829,909 cache read), 256,658 output |
| AI credits | 833.94 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: `--suite=player,steps` 64 + 27; `--suite=cache,ui-contract,i18n,help` 98 + 67 + 81 + 30 (after fixing one guide reference); generator quick set 43 suites 2,785/2,785 (85.7 s); re-runs after the last edits (`smoke,purity,result-view,controls,a11y,theme` 233; `player,steps,cache,ui-contract,i18n,help` 367); player `--suite=help` 22/22; a throw-away script checked the guide examples (Classic 9×9 Easy seed 3: 7 compact steps 0, 14, 24, 34, 44, 46, 46 and 26 details steps; Killer Hell 2 seed 11: 9 compact 0, 0, 27, 98, 162, 517, 579, 3723, 3723 and 38 details). Orchestrator re-run: generator quick set 43 suites, 2,785 passed / 0 failed (85.7 s); player `--suite=help` 22/22; the 15 edited files CRLF, no BOM; after the orchestrator's fix, `node tests/node-runner.js --suite=killer --filter="seed 61843"` 1/1 (8.0 s). |
| Acceptance | GS05-B01–B06 and GS05-T01–T12 met. |
| Issues & resolutions | (1) Contract tests rewritten around the new invariants, none weakened: in `player.test.js` the five batch-bound tests (batch sizes, rounds per step, batch signs, the rating budget, `rateStep`) now assert the new invariants and the other tests use `buildViews` and the details view (the guide-example test asserts 7 compact and 26 details steps); `steps.test.js` migrated (`rateStep` → a `tableAt` adapter, `buildSteps` → `buildViews` compact, the legend test compares the frames actually used); `cache.test.js` 11 tests gained `await flush()` and 8 gate tests were added; `ui-contract.test.js` surface lists. (2) `generator/tests/manual/killer.test.js:1731`, a heavy suite outside the task's files, still called the removed `SG.player.buildSteps` and would have failed under `--all` (GS08). Resolution (orchestrator, delegated authority, tightly coupled to this change): one line migrated to `SG.player.buildViews(result, SG.replay.analyse(result)).details.steps`, keeping the assertion (the last dig step's values equal `result.givens`); only that test was run (1/1). (3) Developer's readings, accepted: the compact restart step has `table.change = null` (only a details restart carries `transition.change`); a `busy` rejection is a generic failure and shows the fallback replay; `showFinished` kept only as the fallback when `attachTrace` fails. (4) Left for later tasks: the comments of `generator/js/ui/step-view.js` lines 4 and 276 still name `buildSteps` / `rateStep` (GS06 owns the file); the guides' quick-set counts (GS07). |
| Handoff | `SG.player.buildViews(result, analysis)` → `{ compact, details, signs, cellCount }`, each view `{ name, steps, audit, signs, cellCount }`; a step `{ index, view, role, first, last, position, kind, phase, line, parts, key, args, meta, values, structure, marks, signs, metrics, context, table }` (`marks` / `signs` the step's net change; `metrics` null for the solution, the structure and fallback steps); `table` = `{ state: start \| zero \| scored \| final \| status, status, reasons, counts, before, empties, score, change, transition, proof, position }` — the `zero` and `status` states are data only until GS06 draws them. Player instance: `setAnalysis`, `setView` / `getView`, `tableAt(position)`, `setPreparation`, callbacks `onSteps`, `onPrepare`; the `stats` adapter in `app.js` `start()` reads `tableAt` (GS06 replaces it). `SG.player.createPreparation` → `{ start, press, unavailable, cancel, state }`; `SG.app.markTraceUnavailable()`; the app emits `replay:consent`. New mount ids `#replay-view-details`, `#replay-status`, `#replay-status-text`, `#btn-prepare-replay`. Risks: the cache regeneration gate (worker-only background client; main mode waits for `replay:consent`) is covered by fake-client tests only, not a real browser or `file://` run (GS08). |
