# GS02 — Two views, compact selection, audit, transitions and tiers

| Header | Value |
|---|---|
| ID | GS02 |
| Depends on | GS01 (accepted and committed) |
| Estimated size | Medium–Large: about 500–900 lines of engine code and tests |
| Owner role | Engine (generator) |
| Milestone | M2 — the default view has steadily rising scores and a scored board on every step |
| Design refs | `docs/generation-steps/report-detailed.md` R6–R10, R12 (folds), R15; §6; §9.3 cases 1–3, 5, 6 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The user asked that the steps of the replay rise **steadily** (35, 100, 300, 1000 rather than 35, 40, 40, 1000)
and that every step shows a score table, even when the score does not change. The recorded moves of a
generation do not rise steadily on their own: 22 random removals add a few points each, then one guided removal
can multiply the score by 12.

This task adds, to the analysis of GS01, the two views of the replay (decision Q1 a):

- **compact** (default): a few score-chosen steps whose scores never go down (Q3 a), each ending on a rated board,
  with a step at the end of every phase (Q12 a), a restart folded into "Starting again" (Q13 a), and an **audit**
  proving that a jump left in it cannot be removed with the recorded moves (decision of 13:54);
- **details** ("Show every move"): one step per move, with real decreases and status steps.

It also computes, for each pair of adjacent steps of a view, the **transition**: the change of the Total, the
values of P, W, E, V, R before and after, and the **tier** (`first`, `jump`, `newPeak`) with the exact jump rule of
decision Q4 b. No UI yet: GS05 and GS06 draw these data.

## Scope

### In scope

- `SG.replay.select`, `SG.replay.audit`, `SG.replay.isJump`, `SG.replay.badgeRatio`, `SG.replay.phaseCode`,
  `SG.replay.buildViews`.
- In `prepare` / `analyse` / `fallback`: `analysis.chapter`, `analysis.views.compact` (with its audit records),
  the transitions of both views (`analysis.transitions`, `ViewStep.transition`), the folded notes.
- Tests in `generator/tests/suites/replay.test.js`; documents (`generator/design.md` §7.5, the `SG.replay`
  paragraph of both developer guides).

### Out of scope

- Causes, culprits, the generator's choice, the first use, the restricted check (GS03): `cause` and `choice` stay
  `null` in this task.
- Worker, client, UI, strings (GS04–GS06).
- Changing GS01's move model, rating plan or test data (report a defect to the orchestrator instead).

## Repository rules

- Same as GS01: classic script on `SG`, pure and deterministic, lines ≤ 110 characters in `replay.js`, CRLF,
  quick suites only, no commit / stage / push / branch switch, no edit of `tasks/generation-steps/`.
- Do not edit `generator/tests/fixtures/replay-goldens.js` or `replay-wire.js`: a golden mismatch is a defect to
  fix in the code (or to report), never a number to change.

## Inputs & context

### What GS01 delivered (read `generator/js/engine/replay.js`)

`analysis = { version: 1, fallback, rebuilt, randomOrder, structure, signs, level, band: { min, max }, moves,
ratings, chapter: 0, views: { compact: null, details: { name: 'details', steps: ViewStep[], audit: [] } },
transitions: [], proofs: {}, stats }`. `moves[i]` has `kind`, `phase`, `removed`, `restored`, `sign`, `span`,
`values`, `alive`; `ratings[i]` has `status`, `score` (null without a score), `counts`, `empties`, `hardest`,
`P`, `W`, `R`, `V`, `level`. Move phases: `start` (solution, restart), `clues`, `random`, `guided`, `search`,
`reveal`, `signs`, `signsMinimal`, `final` (a fallback's final move only). `ViewStep = { role, first, last,
position, phases, kinds, transition }` with roles `solution`, `structure`, `restart`, `moves`, `final`.

### New contracts

```js
SG.replay.isJump(before, after) -> boolean       // exact integer totals:
  // before > 0 && after - before >= CONSTANTS.JUMP_GAIN (100) && after >= CONSTANTS.JUMP_RATIO (3) * before
SG.replay.badgeRatio(before, after) -> number    // Math.floor(10 * after / before) / 10 (only for a jump)
SG.replay.select(entries, options) -> { s, e, ratio, cuts: [{ position, rank }] }   // pure; R7 below
  // entries: [{ score: number | null, phase: string, kind: string }], one per position (move index)
  // options (optional): { minGain, rMin, rMax, rExp } (defaults: CONSTANTS)
SG.replay.audit(entries, positions) -> { positions: number[], edges: AuditEdge[] }   // pure; R8 below
  // AuditEdge = { from, to, scope: 'complete' | 'ratedOnly', inserted: number[], remaining: boolean }
SG.replay.phaseCode(step, structure) -> string   // e.g. 'S/Sol', 'D/Dig', 'G+A/Mixed' (table below)
SG.replay.buildViews(analysis) -> { chapter, views, transitions }
  // pure: reads moves, ratings, structure, signs, band and fallback; never changes the input or calls a solver.
  // prepare/fallback assign these returned fields to their own Analysis; tests use the same public builder.
```

```text
Analysis (after GS02) adds / fills:
  chapter: s                         // the index of the last restart move, or 0
  views.compact = { name: 'compact', steps: ViewStep[], audit: AuditEdge[] }
  views.details.steps[k].transition, views.compact.steps[k].transition   // index into transitions, or null (k = 0)
  transitions: Transition[]          // compact first, then details; each has its view and step index
Transition = {
  view: 'compact' | 'details', step,           // index of the ViewStep it leads to (>= 1)
  from, to,                                    // positions of the step before and of this step
  role: 'step' | 'final',                      // 'final' when the step is the finished-puzzle step
  before: Terms, after: Terms,
  change: number | null,                       // after.total - before.total; null when either is null and for the
                                               //   introductory solution/structure steps; a details restart
                                               //   keeps its actual drop to 0 when its predecessor is scored
  tier: 'first' | 'jump' | 'newPeak' | null,
  ratio: number | null,                        // badgeRatio(before.total, after.total) when tier = 'jump'
  newHardest: boolean,                         // both totals finite, before.total > 0, after.hardest !== null and
                                               //   !(before.counts[after.hardest] > 0)
  folded: Folded,
  auditScope: 'complete' | 'ratedOnly' | null, // the scope of the audit edge this transition lies on (compact)
  cause: null, choice: null                    // GS03
}
Terms = { P, W, E, V, R, total, level, hardest, counts }   // from the rating of the position (total = score);
                                               //   zero ratings: all numbers 0, level and hardest null, counts {}
Folded = { peak: number | null,               // largest score of a rated position inside the step (first .. last-1)
                                               //   when it is above the step's end score; else null
           aboveBand: boolean,                 // peak !== null && peak >= analysis.band.max
           revealed: number,                   // clues restored by the step's 'reveal' (refinement) moves
           unscored: number,                   // positions inside the step (first .. last-1) without a score
           restart: null | { peak: number | null, moves: number } }   // the 'restart' step only (below)
```

### The compact selection (R7; decisions Q2 a, Q3 a, Q12 a, Q13 a)

Constants: `MIN_GAIN = 10`, `R_MIN = 1.3`, `R_MAX = 3`, `R_EXP = 1/6`, `f10(x) = max(x, 10)`. Positions are move
indexes `0 … N − 1`; `score(i)` is the rating's score (null = not scored).
`select`'s optional fields override their corresponding constants; production `buildViews` uses the defaults.
`audit` has no tuning options: it always uses the decided jump predicate and whole moves.

1. **Chapter.** `s` = the index of the last move of kind `restart`, or 0. `e` = the last finite-scored position
   at or after `s` (normally `N − 1`, the finished puzzle with `result.rating`). Never attach an unscored tail
   to an earlier scored board. Empty input/no scored position gives `{ s, e: -1, ratio: rMin, cuts: [] }`.
   Production analyses with a missing final score already take GS01's conservative fallback.
2. **Eligible positions** (Q3 a): `s`, `e`, and every scored `i` in `(s, e)` whose score is not above the score of
   any later scored position up to `e` (`score(i) <= min{ score(j) : scored j, i < j <= e }`). Everything else is
   folded into a step and told in its text.
3. **Ratio**: `R = clamp((f10(score(e)) / 10) ^ R_EXP, R_MIN, R_MAX)` (992 gives 2.15).
4. **Cuts with a rank** (a position's rank is the largest rule that cuts it):
   - `s` (rank 4) and `e` (rank 3);
   - **rise** (rank 3): for consecutive eligible `a < b`, if `f10(score(b)) >= R * f10(score(a))`, both `a` and
     `b`;
   - **phase end** (rank 2): in every maximal run of consecutive moves of one `phase` in `(s, e]`, its last
     eligible position (a run with no eligible position gives no cut);
   - **fill** (rank 1): walking the eligible positions `i > s` in order with `last` = the latest cut, add `i` when
     `f10(score(i)) >= R * f10(score(last))` and `score(i) - score(last) >= MIN_GAIN` (when `i` is already a cut,
     `last = i`).
5. **Small steps.** Repeat until nothing changes: for consecutive cuts `a < b` with `score(b) - score(a) <
   MIN_GAIN`, drop `b` if its rank is 1, else drop `a` if its rank is 1 and `a !== s`, else keep both (a flat
   step between two protected cuts, allowed by N2).
6. **Audit** (below).
7. **Steps shown**: the solution step (position 0); the structure step (position 0) when `structure !== null`;
   when `s > 0`, the "Starting again" step `{ role: 'restart', first: 1, last: s, position: s }`; one step
   `{ role: 'moves', first: previous + 1, last: c, position: c }` per cut `c > s` in order (`previous` starts at
   `s`); and the final step `{ role: 'final', first: e, last: e, position: e }`. `phases` / `kinds` list the
   distinct phases / kinds of moves `first … last` in order of first appearance (`[]` for solution, structure,
   final).

```text
select(entries):
  s = lastIndexOfKind(entries, 'restart') or 0
  e = last finite-scored index >= s; if none: return {s, e: -1, ratio: rMin, cuts: []}
  eligible = [i in s..e : i == s or i == e or (scored(i) and score(i) <= min score of scored j in (i, e])]
  R = min(3, max(1.3, (f10(score(e)) / 10) ^ (1/6)))
  rank = { s: 4 }; rank[e] = max(rank[e] or 0, 3)
  for consecutive a < b in eligible: if f10(score(b)) >= R * f10(score(a)): rank[a] = max(rank[a], 3), same for b
  for each maximal run of one phase in (s, e]: p = its last eligible position; if p exists: rank[p] = max(rank[p], 2)
  last = s
  for i in eligible with i > s:
    if i in rank: last = i
    else if f10(score(i)) >= R * f10(score(last)) and score(i) - score(last) >= 10: rank[i] = 1; last = i
  repeat until stable: for consecutive cuts a < b with score(b) - score(a) < 10:
    if rank[b] == 1: drop b    else if rank[a] == 1 and a != s: drop a
  return { s, e, ratio: R, cuts: sorted positions with their rank }
```

The example (Classic 9×9 Expert seed 3275974478): cuts at 7 (fill: 23 ≥ 2.15 × 10, +23), 22 and 23 (rise
44 → 551; 22 also ends the random run), 26 (end of the guided run, 568) and 31 (end, 992). Between 23 and 44 there
is no fill (44 < 2.15 × 23); the four exchanges at 568 fold into the last step (992 < 2.15 × 568). Shown:
`0, 23, 44, 551, 568, 992, 992` (7 steps).

### The avoidability audit (R8; decision 13:54)

`audit(entries, positions)` makes sure that a jump left in the compact view cannot be removed with the recorded
moves (whole moves only, Q2 a). Work on the sorted cut positions; for every pair of consecutive positions `a < b`
(including edges created by the audit):

1. Skip the edge unless `isJump(score(a), score(b))` and `b - a >= 2`.
2. `scope` = `'complete'` when every position strictly between `a` and `b` has a score, else `'ratedOnly'`. A
   position without a score is never used as a bridge nor taken as proof that no bridge exists.
3. Nodes = the scored positions `j` with `a < j < b` and `score(a) <= score(j) <= score(b)`. An edge `u → v`
   (`u < v`, both in `{a} ∪ nodes ∪ {b}`) is allowed when `score(u) <= score(v)`; it is *calm* when it is not a
   jump. `ratio(u, v) = f10(score(v)) / f10(score(u))`.
4. **Bridge**: the path `a → … → b` made of calm edges only with the fewest inner nodes, then the smallest
   largest ratio (a dynamic programme over the nodes in index order). If it exists, insert its inner nodes and
   record `{ from: a, to: b, scope, inserted, remaining: false }`.
5. **Partial reduction** (no bridge): the path over allowed edges with the smallest largest ratio, then the fewest
   inner nodes. If it has inner nodes and its largest ratio is below `ratio(a, b)`, insert them and audit its new
   edges again; record the edge with `remaining: true` (and its `inserted`); otherwise record `{ …, inserted: [],
   remaining: true }`.
6. Return the final sorted positions and the records. A transition of the compact view gets the `scope` of the
   record whose `[from, to]` contains it (`auditScope`), else null.

On the 107 requests of the research no edge needed an insertion and every scope was `complete`; the rule is
exercised by the synthetic vectors below.

### Transitions and tiers (R9, R10; decision Q4 b)

For each view, for `k = 1 … steps.length − 1`: the transition from step `k − 1` to step `k`, with `before` /
`after` = the Terms of their positions, `role` = `'final'` for the final step. Push the compact transitions first,
then the details ones; set `steps[k].transition` to the index.

- `change` = `after.total − before.total` when both are finite numbers and step `k` is not an introductory
  solution/structure step; else null. A **details restart** records its real drop to 0 (for example −551);
  a compact restart follows zero setup steps, so cannot introduce a decrease. An ordinary final duplicate has
  change 0; a conservative fallback's final step is not a duplicate and uses its actual difference.
- `tier`, in this order, with integer totals:
  1. `'first'`: `before.total === 0`, `after.total > 0`, and the view has no `'first'` yet (once per view: in the
     details view the first rated board after a restart gets no tier);
  2. `'jump'`: `before.total > 0` and `isJump(before.total, after.total)`;
  3. `'newPeak'`: `before.total > 0`, `after.total !== null`, `after.hardest !== null` and
     `!(before.counts[after.hardest] > 0)` — whether the score rises, stays or falls;
  4. otherwise `null` (also when either total is null: a status step).
- `ratio` = `badgeRatio(before.total, after.total)` for a jump: 551 / 44 → 12.5; 300 / 100 → 3.0;
  1000 / 300 → 3.3. Never below 3.0 and never above the exact ratio.
- `newHardest` as in the contract (the "New hardest technique" row label of GS06 uses it on jumps and new-peak
  steps).
- `folded` as in the contract. For the restart step: `restart = { peak: the largest score of positions 1 … s − 1
  (null when none is scored), moves: s − 1 }`.

### Phase codes (`phaseCode(step, structure)`, used by the golden rows)

| Role or phase | Code | Letter in a mixed code |
|---|---|---|
| solution | `S/Sol` | — |
| structure | `S/Cag` (cages) or `S/Sig` (signs) | — |
| restart | `S/Restart` | — |
| final | `F/Final` | — |
| `random` | `D/Dig` | `D` |
| `guided` | `G/Choose` | `G` |
| `search` | `X/Adjust` | `X` |
| `reveal` | `A/Restore` | `A` |
| `clues` | `C/Clues` | `C` |
| `signs` | `I/Signs` | `I` |
| `signsMinimal` | `IM/Signs` | `IM` |

A `moves` step with several phases: the letters of its phases in order of first appearance, joined with `+`,
then `/Mixed` (for example `G+A/Mixed`, `C+I/Mixed`, `I+A+IM/Mixed`).

## Files to create/modify

### Exclusive ownership

- `generator/js/engine/replay.js`
- `generator/tests/suites/replay.test.js`

### Documentation slot

- `generator/design.md` §7.5: a subsection "Views, selection, audit and tiers": the two views, the compact rules
  1–7 and the pseudo-code above, the audit and its scope, the transitions (per view: the same end position can
  be a jump in one view and not in the other), the tier table (first, jump at ≥ ×3 **and** ≥ +100 with a score
  before > 0, new hardest technique) and the badge ratio rule (one decimal rounded down; the tier is decided on
  the exact integer totals). Example sequences: compact `0, 23, 44, 551, 568, 992, 992`, details 33 steps.
- `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: extend the `SG.replay` sentences of GS01: `analysis.views`
  holds the compact view (score-chosen steps that never go down) and the details view (one step per move), and
  `analysis.transitions` the change, the values P, W, E, V, R before and after and the tier of each step. Only
  name functions that exist (`SG.replay.select`, `SG.replay.isJump` …).

## Implementation steps

1. Add `isJump`, `badgeRatio`, `phaseCode`, `select` and `audit` (pure, on plain entries).
2. Implement and export `buildViews(analysis)`. For a normal analysis, build the compact view from
   `select` + `audit` on `entries = ratings.map((r, i) => ({ score: r.score, phase: moves[i].phase, kind:
   moves[i].kind }))`; set `chapter`. Return new view/transition objects, not mutations of the input.
3. Build the transitions of both views with Terms, change, tier, ratio, newHardest, folded and auditScope.
4. For a fallback, clone GS01's conservative details steps into both views **without `select`**; construct
   their transitions normally. Do not insert the final position twice. `prepare` and `fallback` assign the
   return of `buildViews` to their owned analysis objects.
5. Tests; then the documents; then the quick set.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| GS02-B01 | Every compact step of the 14 goldens ends on a scored position; the last one is the finished puzzle with `result.rating` | `replay` suite |
| GS02-B02 | The compact view never decreases (every golden) and folds the excursions it skips: each golden fold has its peak and end, and no other compact step has a fold | `replay` suite |
| GS02-B03 | Every phase end that can be cut is a step (Q12 a): the golden phase codes match row by row; the synthetic phase-end vector keeps its +5 step | `replay` suite |
| GS02-B04 | A jump remains only when the recorded moves cannot bridge it: the synthetic overshoot gets its bridge (200 inserted); a jump over an unscored position is audited with scope `ratedOnly` | `replay` suite |
| GS02-B05 | Two views exist: compact by default and details with one step per move (the example 7 and 33 steps; every golden's counts) | `replay` suite |
| GS02-B06 | The tiers follow Q4 b exactly: jump iff before > 0, +100 or more and ×3 or more; "first rated puzzle" once per view without a multiplier; the badge ratio rounds down to one decimal | `replay` suite |
| GS02-B07 | A restart is folded into the "Starting again" step of the compact view (Q13 a), which tells the abandoned peak; the details view keeps both digs | `replay` suite |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| GS02-T01 | `buildViews`, `select`, `audit`, `isJump`, `badgeRatio`, `phaseCode` are pure and exported; constants come from `CONSTANTS` only | review; `replay` suite |
| GS02-T02 | The 14 goldens: every compact row matches columns `m`, phase, `E`, score, delta, hardest, `J`, line; `counts.compact` and `counts.details` match; Greater-Than `alive` counts match; every golden jump's P, W, R, V, E and level before and after match (tolerance 0.000001) | `replay` suite |
| GS02-T03 | View-dependent transitions: G06 m 31 is a jump in the compact view (138 → 1678) and not in the details view (2967 → 1678, −1289); G10 m 42 607 → 1940 against 2788 → 1940; G12 m 103 130 → 638 against 642 → 638; G01's step to m 31 starts from W = 906.5 (compact) and W = 906.75 (details) | `replay` suite |
| GS02-T04 | Jump totals over the 14 goldens: 13 compact, 16 details, 19 distinct `(goldenId, from, to)` transitions (dedupe the two views within each request, never across unrelated requests) | `replay` suite |
| GS02-T05 | The new-hardest line also on flat and falling details transitions: G13 into m 101 (70 → 70, Naked Single → Hidden Single (box)); G10 into m 42 (2788 → 1940, Nishio → Forcing Chain); G11 into m 104 (1967 → 1264, Forcing Chain → W-Wing); G07 into m 31 (2515 → 1938, Nishio → Forcing Chain) | `replay` suite |
| GS02-T06 | The final transition of the example is `992 → 992`, role `final`, change 0, tier null | `replay` suite |
| GS02-T07 | The first rated compact step never hides a rise of ×R: it ends at or before the first rise (every golden) | `replay` suite |
| GS02-T08 | The quick set passes; `help` passes with the new developer-guide sentences; documents in both languages; CRLF | command output; review |

## Test plan

### Exact Node commands

```powershell
$ErrorActionPreference = 'Stop'
Push-Location generator
try {
  node tests\node-runner.js --suite=replay
  if ($LASTEXITCODE -ne 0) { throw 'Replay suite failed' }
  node tests\node-runner.js --suite=help,ui-contract
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

### Required test cases (add to `generator/tests/suites/replay.test.js`)

Read the goldens from `SG.fixtures.replayGoldens` (columns: `[step, m, phase, E, score, delta, hardest, J,
culprit, line]`; `'—'` means none). Generated results as in GS01 (G09–G12 from `SG.fixtures.replayWire`).

| Case | Expected result |
|---|---|
| Golden rows (14 requests) | for compact step `k` (row `k`): `phaseCode(step, structure)` = `row[2]`; `step.position` = `row[1]`; rating `empties` = `row[3]`; score = `row[4]`; score − previous step's score = `row[5]` (0 for the first step); `hardest` (or `'—'`) = `row[6]`; `tier === 'jump' ? 'Y' : '—'` = `row[7]`; `tier === 'first' ? 'F' : tier === 'newPeak' ? 'N' : '—'` = `row[9]` |
| Golden jump terms | for each entry of `golden.jumps`, the compact transition into step `step` has `before.total = from`, `after.total = to`, and `P`, `W`, `R`, `V`, `E` of `before` / `after` equal to the golden values within 0.000001, `level` equal (for example G01: P 1 → 360, W 43 → 768.25, R 1.364858 → 148.321617, V 41.445783 → 42.352941, E 43 → 45, `veryEasy` → `hard`) |
| Golden counts | `views.compact.steps.length = counts.compact`; `views.details.steps.length = counts.details` |
| Golden alive (G11, G12) | `moves[step.position].alive.length` per compact step = `alive` (`[108, 108, 85, 74, 6, 5, 4, 3, 3]`, `[108, 108, 17, 6, 6]`) |
| Golden folds | for each `{ step, peak, end }`: compact step `step` has `folded.peak = peak` and score `end`; when its phase code contains `A` and `restored > 0`, `folded.revealed = restored`; `folded.aboveBand = peak >= band.max`; every other compact step has `folded.peak` null |
| Compact invariants (every golden) | scores never decrease; every step position is scored; the last step is `final` at `moves.length − 1` with `result.rating.score` |
| View-dependent transitions | GS02-T03 values |
| Jump totals | GS02-T04 values |
| New hardest on flat / falling | GS02-T05 values (details transitions whose `to` is that position: tier `newPeak`, the changes 0, −848, −703, −577, the hardest technique ids `hiddenSingleBox` / `nakedSingle`, `forcingChain` / `nishio`, `wWing` / `forcingChain`, `forcingChain` / `nishio`) |
| Final transition | GS02-T06 |
| First rated step | GS02-T07 |
| Overshoot (synthetic) | entries scores `[0, 23, 44, 100, 200, 400, 800, 992]`, phases `['start', 'random' ×7]`: `select` cuts at `[0, 1, 2, 3, 5, 7]` (ranks 4, 3, 3, 3, 1, 3); `audit` inserts 4 (edge 3 → 5, 100 → 400, ×4 +300; scope `complete`) and returns `[0, 1, 2, 3, 4, 5, 7]` |
| Restart (synthetic, 4-acceptance-data §2.5) | scores `[0, 23, 44, 551, 0, 23, 44, 600, 992]`, kinds `solution, random, random, guided, restart, random, random, guided, guided`, phases `start, random, random, guided, start, random, random, guided, guided`: `s = 4`; cuts `[4, 5, 6, 7, 8]`; feed synthetic moves/ratings to `SG.replay.buildViews`: compact scores `0, 0, 23, 44, 600, 992, 992`, restart `folded.restart = { peak: 551, moves: 3 }`; details scores `0, 23, 44, 551, 0, 23, 44, 600, 992, 992`, restart change −551. Compact: `first` after restart and `jump` 44 → 600; details: `first` at m1, jump 44 → 551, no second `first` after restart |
| Phase end kept (synthetic) | scores `[0, 30, 33, 35, 36, 1000]`, phases `start, random, random, random, guided, guided`: cuts `[0, 1, 3, 4, 5]` (3 is the random run's end, kept although +5; 4 and 5 form a rise) |
| Rated-only scope (synthetic) | scores `[0, 50, null, 400]`, phases `start, random, random, random`: cuts `[0, 1, 3]`; audit record `{ from: 1, to: 3, scope: 'ratedOnly', inserted: [], remaining: true }`; the compact step to 3 has `folded.unscored = 1` and `auditScope = 'ratedOnly'` |
| Tier boundaries | `isJump(100, 300)` true, `isJump(100, 299)` false, `isJump(50, 150)` true, `isJump(49, 148)` false, `isJump(0, 900)` false; `badgeRatio(44, 551) = 12.5`, `badgeRatio(100, 300) = 3`, `badgeRatio(300, 1000) = 3.3` |
| No label without a new technique | a synthetic pair of ratings where the jump keeps the same hardest technique (before counts contain it): tier `jump`, `newHardest` false |
| Fallback | a result without a log: compact = details = solution (+ structure) + final; the transition into the final step has tier `first` |

For synthetic view tests, call the specified `SG.replay.buildViews(analysis)` with matching synthetic `moves`,
`ratings`, `structure: null`, `signs: null`, `fallback: null` and a band. No alternative test-only builder or
solver monkey-patch is needed. Add a zero-count-key case: a technique with count 0 was **not** used.

## Definition of done & handoff

- All criteria have their evidence; the quick set passes; the goldens were not edited.
- Handoff to GS03, GS05 and GS06: the final shapes of `views`, `ViewStep`, `Transition`, `Terms`, `Folded`; any
  implementation notes for the specified `SG.replay.buildViews`; the order of `transitions` (compact first, then
  details); the measured time of
  the `replay` suite.

## Execution log

| Field | Value |
|---|---|
| Status | Done |
| Start | 2026-10-28 23:14:27 (+07:00) |
| End | 2026-10-28 23:31:04 (+07:00) |
| Duration | 16 min 37 s |
| Model | claude-sonnet-5.5 (sub-agent `GS02-views-selection`, general-purpose); wave 2, alone |
| Token usage | 72 model calls; 11,307,089 input (11,086,960 cache read), 120,100 output |
| AI credits | 285.99 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: `--suite=replay` 93/93 (3.0 s); `--suite=help,ui-contract` 97/97; generator quick set 43 suites 2,643/2,643 (78 s); player `--suite=help` 22/22; two throw-away fuzz checks (30,000 random score/restart sequences: compact never decreasing, ends on the final board, no avoidable jump by brute force; 20,000 geometric sequences for the partial reduction), no files created. Orchestrator re-run: generator quick set 43 suites, 2,643 passed / 0 failed (79.2 s); player `--suite=help` 22/22; the five edited files CRLF, no BOM; nothing outside the GS02 list changed. |
| Acceptance | GS02-B01–B07 and GS02-T01–T08 met: the 14 goldens row by row (phase codes, E, scores, deltas, hardest, jump flag, first/new-hardest line, counts, alive, folds); jump terms within 0.000001; jump totals 13 / 16 / 19; the view-dependent transitions of G06, G10, G12 and G01 (W 906.5 / 906.75); the flat and falling new-hardest cases of G13, G10, G11, G07; the final `992 → 992`; every synthetic vector. |
| Issues & resolutions | (1) Two GS01 assertions encoded the GS01-only state (`views.compact` null, `transitions` `[]`): updated to the GS02 contract (7 compact steps, 38 transitions for G01), an intended contract change; no other test, golden or fixture touched. (2) Choices recorded by the developer: `folded.restart` only on the compact "Starting again" step (the details restart shows its drop through `change`); `folded.revealed` counts `moves` steps only; `auditScope` is the narrowest audit record containing the transition, only when `from < to` (null for the final duplicate and one-move jumps); audit tie-break earliest predecessor; partial reduction minimises the largest ratio, then the node count; an analysis with no rated position (impossible in production) clones details into compact. (3) The quick-set counts in the guides still say "about 2,590" (now 2,643): left to GS07. (4) `replay.test.js` has lines up to 121 characters; the 110 limit applies to engine files only. |
| Handoff | `SG.replay` adds `isJump`, `badgeRatio`, `phaseCode`, `select`, `audit`, `buildViews`; `buildViews(analysis)` → `{ chapter, views, transitions }`, pure, no solver call, works on synthetic analyses; `prepare` and `fallback` assign it. `views.compact` / `views.details` = `{ name, steps, audit }`; `analysis.transitions` = compact transitions first, then details; `steps[k].transition` indexes it (null at k = 0); `Transition`, `Terms`, `Folded`, `ViewStep` as in the task; `cause` and `choice` null (GS03). `audit` returns `{ positions, edges }` (edges for G06, G10, G12, all `complete`, no insertion). `phaseCode` returns the raw phase for an unknown phase and `''` for none: GS05 handles step roles itself. |
