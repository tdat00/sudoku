# MS01 — Tier algebra and the reference floor API

| Header | Value |
|---|---|
| ID | MS01 |
| Depends on | Accepted specification; branch `rating-v3` at `2c665bb` |
| Size / time | Medium, about 250-400 changed lines; 45-60 active minutes |
| Owner | Generator engine |
| Milestone | M1: independently check whether a puzzle needs its requested tier |
| Traceability | R1, R2, R20; SA2-Q-S01/S02/S10, SA1-Q-S2/S7 |
| Status | Not started |

## Goal & business context

An in-band score alone does not establish that the puzzle needs that level's techniques. Provide the
set algebra and independent restricted-solver reference on which the later acceptance change relies.
**Do not change generation or acceptance yet.** The ladder still has the known order inversion;
the derived production helper is installed/activated by MS04 after tooling and the order correction.

## Scope

In: extract the allowed-set calculation, expose floor/tier helpers, extend `spec`, implement the
reference `certifyFloor`, add focused quick tests and API documentation.
Out: `requiredOf`, digger/keeper changes, order/weight/band/version changes, fixtures/hashes/goldens,
new techniques, cache/history/export, heavy gates.

## Repository rules

Read `AGENTS.md` and `check-list.md`. Classic IIFE on `SG`; no modules/DOM in the engine, engine lines
<=110, CRLF/UTF-8 without BOM. No dependency installation. No Git write operations and no edits to this
pack or its Execution log. Only the quick commands below are authorized.

## Inputs & context

### Accepted contracts (R1/R2)

```text
allowed(i,v) = registered, weighted, v-applicable IDs with 1.25 * weight < bandMax(i)
              (all weighted applicable IDs at an infinite upper edge), in actual registry order
floor(L)     = [] at index 0; otherwise allowed(index(L)-1,v)
tier(L)      = allowed(index(L),v) minus floor(L)
vacuous(L)   = index(L) == 0 OR tier(L).length == 0

FloorResult = { required:boolean, vacuous:boolean, floorLevel:string|null }
ReferenceFloorResult = FloorResult + { unsolvedCount:nonnegative integer }
```

Bands stay `[0,45)`, `[45,180)`, `[180,400)`, `[400,700)`, `[700,1000)`, `[1000,1500)`,
`[1500,2400)`, `[2400,3600)`, `[3600,Infinity)`.

Public API for this pack:

```text
SG.difficulty.floorTechniques(level, model) -> fresh string[]
SG.difficulty.tierTechniques(level, model)  -> fresh string[]
SG.difficulty.certifyFloor(model, givens, level, budget) -> ReferenceFloorResult
SG.difficulty.spec(level, model)           -> existing fields + floorTechniques + tierTechniques
```

Use an internal `allowedFor(index, variantId)` shared with `spec`; do not export a second policy table.
The floor is the previous **global** level even if the variant does not offer it. Helpers derive sets
for any valid global level; `spec` alone retains its existing requested-level support check.
Do not call `spec(previous)`, and do not cache by level while weights/registrations can change in tests.
With no model, preserve `spec`'s existing unfiltered variant behavior.

`certifyFloor` is a reference for tests, soak and other tools. Its caller establishes uniqueness for
these exact givens/model, including cages/signs. It performs no uniqueness count itself.

- Use only the inherited `budget` (or null); check it at entry and pass that same object to the solver.
  No local floor cap, retry or DFS completion.
- Vacuous returns `{required:true,vacuous:true,floorLevel:null,unsolvedCount:0}` without a solve.
- Otherwise call `SG.logicalSolver.solve` with the floor IDs, `assumeUniqueness:true`,
  `collectSteps:false`, `stopOnStuck:true`, and the inherited budget.
- `status:'solved'`: required false, vacuous false, preceding global level, unsolvedCount 0.
- `status:'stuck'`: required true, vacuous false, preceding global level,
  `unsolvedCount = report.state.unsolvedCount`.
- `status:'contradiction'` is an error, never required. Reuse the module's `fail` helper with existing
  code `unexpected`, args `{reason:'floorContradiction',level}`, diagnostic text
  `floor solve returned contradiction`. No new user-visible error key.
- Invalid-input errors, cancellation and budget failures propagate unchanged; never catch them as stuck.

VeryEasy's tier is the three singles but its certificate is vacuous. Empty higher tiers are also
vacuous. Singles-only Easy is shallow. Preserve v2 fixture labels/family certificates as history.
Before S2.1, test set union/difference, **not** that the floor is already a prefix of the full ladder.

### Anchors at `2c665bb`

| File:line / quoted anchor | Use |
|---|---|
| `generator/js/engine/difficulty.js:66-68`, `const SCORING = Object.freeze` | Use `SCORING.peakBound`, not another tunable factor |
| `generator/js/engine/difficulty.js:331-368`, `function spec(level, model)` | Extract its existing applicability/weight filter without changing other fields |
| `generator/js/engine/difficulty.js:455-474`, `SG.difficulty = {` | Add the three public methods |
| `core/js/engine/logical-solver.js:34-37`, `STATUS_NAMES` | Status strings are solved/stuck/contradiction |
| `core/js/engine/logical-solver.js:316-355`, `function solve(model, givens, options)` | Remaining count is on `report.state`, not a top-level report field |
| `generator/tests/fixtures/rated.js:103-179`, `var CONSTRUCTED_ROWS` / `label: row[0]` | Frozen reference puzzles and family sets; do not rewrite them |
| `generator/tests/manual/difficulty.test.js:39-40`, `SG.fixtures.classic.parse` | Reuse fixture parsing in a new quick suite; do not run the manual suite |
| `generator/tests/node-runner.js:103-105`, `FIXTURES_DIRS` | Fixtures/core suites are auto-loaded by Node |

## Files to create/modify

- `generator/js/engine/difficulty.js`.
- New `generator/tests/suites/difficulty-floor.test.js`.
- `generator/tests.html`: add the new suite to `SUITE_FILES`, in the existing ordering.
- Documentation: `generator/design.md` sections 6.7 and 13.7; the difficulty/API portions of
  `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`.

Historical fixture content is read-only. Put reference expectations in the new test table; later
output-changing tasks own v3 fixture expectations/reclassification notes. No user behavior changes
here, so do not claim new exactness in the user guides yet.

## Implementation steps

1. Extract the shared allowed-ID filter, retaining ordering, applicability, strict `< max`, and infinity.
2. Implement floor/tier helpers and add their arrays to `spec`. Keep all old spec fields/guards identical.
3. Implement `certifyFloor` as above; use statuses explicitly, not `!report.solved` as a stuck test.
4. Add the tests below using global `describe/it/expect`. Restore mutable registry/weight/budget stubs in
   `finally`. Use classic fixture models or `SG.variants.get('classic9').build({}, SG.rng.create(1))`.
   Keep real fixture solves in a fresh Node VM registry so this new suite cannot perturb the pre-MS04
   subset counter for later replay/smoke tests. Via `SG.test.node.fs/path/vm/root`, load the runner's
   ordered SOURCE_FILES into a new context, then `core/tests/fixtures/classic.js` and
   `generator/tests/fixtures/rated.js` (paths resolved from the repository root). Build/parse/count/solve
   inside that registry. Pure algebra and stubbed status/budget cases still run in either harness;
   the source-isolation fixture checks skip explicitly in a browser. Do not patch/reset production
   counters here; `core/js/engine/tech-subset.js:48,136` is MS04's fix.
5. Add the HTML suite entry and bilingual API docs; run the combined targeted command then quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS01-B01 | The reference distinguishes score-band membership from needing a tier |
| MS01-B02 | VeryEasy/empty tiers are explicit vacuous cases; Easy is not exempt |
| MS01-B03 | No puzzle, score, hint order, version or published availability changes |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS01-T01 | Floor/tier are disjoint, union equals allowed as a set, each list follows registry order and variant scope |
| MS01-T02 | The previous global level works across offered-level gaps; current `spec` support errors stay |
| MS01-T03 | Solved/stuck/contradiction and vacuous outputs follow the exact contracts |
| MS01-T04 | Budget identity and failure propagation hold, including a pre-cancelled vacuous call |
| MS01-T05 | Historical labels/expectations stay untouched; new real solves cannot perturb existing golden tests' finder state |
| MS01-T06 | Public exports, HTML registration, bilingual docs and both quick sets pass |

## Test plan

Required cases:

| Case | Expected |
|---|---|
| Every global level, classic9 and scoped Killer/Greater-Than models | Algebra and applicability; no duplicate IDs |
| VeryEasy | Empty floor, three singles in tier; vacuous result; spy proves no solver call |
| Hell 2 at this baseline | Empty tier, vacuous result; helpers work even if that level is not offered |
| Classic6 Hard | Floor derives Normal despite its absent offer; `spec('normal', model6)` still rejects |
| Temporarily change one weight, then restore | Helpers/spec reflect the current weight; no stale cache |
| Constructed Normal 1/2/3 | Reference required false/true/false |
| Constructed Hard 1/2/3 and Expert 1/2/3 | Reference required true |
| Constructed Nightmare 1/2/3 | Reference required false (old family certificates are not v3 floors) |
| Three constructed Easy fixtures | Reference required false |
| Contradictory givens at a nonvacuous level | Throws, never `{required:true}` |
| Stubbed `status:'contradiction'` solver report | Existing `unexpected` error with `reason:'floorContradiction'`; no false certificate |
| Budget whose `check` throws a sentinel | The same failure escapes; no false stuck/vacuous success |
| Valid solved reference call | Caller-proved uniqueness; no extra count and no DFS fallback |

Prove uniqueness once for the real fixtures used before invoking the uniqueness-assuming reference.
Do not assert derived/reference equivalence at the known HEAD order inversion; that belongs to MS04.

From `generator/`:

```powershell
node tests\node-runner.js --suite=difficulty-floor,technique-weights,ui-contract,help
if ($LASTEXITCODE -ne 0) { throw 'MS01 targeted checks failed' }
node tests\node-runner.js
if ($LASTEXITCODE -ne 0) { throw 'Generator quick checks failed' }
```

From `player/`:

```powershell
node tests\node-runner.js
if ($LASTEXITCODE -ne 0) { throw 'Player quick checks failed' }
```

## Definition of done & handoff

All B/T criteria evidenced; only assigned files changed; both quick sets green. Report the exact public
API and error contract to MS02/MS04, observed suite counts/durations and any unexpected fixture result.
Do not stage/commit or fill the following table.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MS01: Tier algebra and reference floor API`) |
| Start | 2026-11-12 12:41 (+07:00) |
| End | 2026-11-12 12:59 developer; 13:06 orchestrator review and commit |
| Duration | 18 min developer (1,072 s); about 7 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 87 model calls; 16,212,046 input tokens (15,907,374 cache reads); 110,380 output tokens |
| AI credits | about 346 (developer) |
| Verification | Developer: `--suite=difficulty-floor,technique-weights,ui-contract,help` 4 suites, 133 passed (0.9 s); generator quick 44 suites, 2,852 passed (93.3 s); player quick 29 suites, 1,609 passed (24.7 s); two temporary mutations (stuck decided by `!report.solved`, no entry budget check) failed 2 and 3 tests and were reverted. Orchestrator re-run: generator quick 2,852/2,852 (93.8 s), player quick 1,609/1,609 (31.2 s); CRLF/BOM/trailing-whitespace clean; `git diff --check` clean |
| Acceptance | MS01-B01..B03 and MS01-T01..T06 met. Diff reviewed: `allowedFor`/`floorFor`/`bandSets` share one filter with `spec` (old fields unchanged, 144 variant x level combinations plus no-model compared); `certifyFloor` follows the status contract and reuses `fail('unexpected', {reason:'floorContradiction', level})`; real solves isolated in a fresh VM registry |
| Issues & resolutions | (1) The developer also updated the suite counts (43 to 44 quick, 51 to 52 total, 27 to 28) in `generator/design.md` section 15 and both developer guides: accepted as directly affected living facts. (2) Finding: at this baseline Hell 1's tier is empty too (Nishio sits in Nightmare's tier), so Hell 1 is vacuous; the suite asserts emptiness only for Hell 2, as specified; MS04 owns the order changes. (3) A budget object without `check` throws a TypeError at entry (not `solver.invalidOption`); accepted, callers pass a real budget or null. (4) The vacuous path does not validate givens or model, by contract (no solve) |
| Handoff | API: `floorTechniques(level, model)` and `tierTechniques(level, model)` return fresh id arrays for any valid global level (null model: unfiltered); `certifyFloor(model, givens, level, budget)`: `levelIndex` (throws `difficulty.unknownLevel`), `budget.check()`, vacuous `{true, true, null, 0}` without a solve, else one `SG.logicalSolver.solve` with `{allowedTechniques, collectSteps:false, assumeUniqueness:true, stopOnStuck:true, budget}`; solved gives `{false, false, previous level, 0}`, stuck gives `{true, false, previous level, report.state.unsolvedCount}`, anything else throws `unexpected`/`floorContradiction`. `spec` adds `floorTechniques`/`tierTechniques`. No cache; sets re-read from the registry and `WEIGHTS` on every call |
