# MS05e — Guided sign dig for Greater-Than

| Header | Value |
|---|---|
| Depends on | MS05r6b combined recovery accepted/committed, including r6a E/pins, finite r4 default and post-selection b3 evidence; MS06a still waits |
| Size / active time | Medium, about 450-750 changed lines; 50-60 active minutes plus bounded evidence runs |
| Owner / milestone | Greater-Than generation; M5e CV6 disposition before the target baseline |
| Authority | CV6-01/S-OD1 and R6 comparator; S-OD2 changes the prerequisite only |
| Gates owned | GS-CV6 diagnosis/comparison; per-level GD `greater-than` CV6/I5; scoped changes through GG/GR/GH |
| Status | Not started |

## Goal & business context

Restore Greater-Than Normal's generation performance without restoring its incorrect old ratings.
MS04 moved `ineqChain` from 65 to 46: a cheap inequality proof must precede an expensive pair. The old
Normal speed partly came from calling such puzzles Normal. CV6 now fails: p95 2,035 ms against its
unchanged 1,400 ms assertion in that run (700 ms design budget). Literal seeds 300-319 measured
2,088/2,216 ms; 7000-7039 measured 5,043 ms. Seed 308 retried three Easy/145 results at the 24-clue floor.

The author and owner authorised one bounded repair: guide the sign-removal pass with a small pool.
They did not promise it will succeed. Diagnose first; if this is not the dominant trap, stop before
changing production code. If closure still fails CV6, stop and return the measured fallback choice
to the owner. MS06a must not silently take a new baseline while this issue remains undisposed.

## Scope

In: the technique-oracle sign pass only, focused quick tests, a bounded diagnostic/measurement
driver, current design facts, Greater-Than output evidence. Keep `signs.minimal`, reveals,
`MAX_TUNE_ROUNDS`, keeper offers and final canonical rating as the accepted recovery left them.
MS05r4 owns the old MS05d selection; r6b owns acceptance after r6a. No independent MS05d commit is awaited.

Out: any floor or `clueFloorScale`, `CAP_RATINGS`, `CAP_PROPOSALS`, attempt/sample limit,
`MAX_TUNE_ROUNDS`, weight, order, band, exactness rule, CV6 assertion or performance target change.
No clue additions on a model with inequalities; no compensating clue relocation; no second search
strategy; no qualification/support-list changes. No new clock or production work cap.
If the change exceeds Medium scope, stop and report rather than expanding it.

## Repository rules

Read `AGENTS.md` and the checklist. Classic IIFE code on `SG`; no application imports or packages.
Never stage, commit, stash, reset, push, switch branches, edit the pack or fill this Execution log.
UTF-8 without BOM, CRLF, final newline, no trailing whitespace. Add a new quick suite to
`generator/tests.html`; Node discovers it automatically. Update both language guides when affected.

All commands expected to exceed 10 seconds, quick suites included, use checklist section 7's
`Invoke-Dv3Node` lock wrapper: wait for `dv3-timing.lock`, acquire `dv3-sudoku.lock`, run one bounded
command and remove only the owned lock. **Announce to the orchestrator before starting a gate
(Pentomino runs in parallel on the same machine).** Jobs=1; these tools do not take `--jobs`.
No timing comparison while Pentomino owns the timing lock.

## Inputs & context

### Accepted algorithm, copied from CV6-01/S-OD1

> In the technique-oracle pass only (`digPass(order, techniqueOracle, 'signs')`), evaluate a pool
> of the next `SIGN_POOL = 8` live signs in the existing shuffled order (fewer when fewer remain).
> Each evaluation is the solve the oracle already runs (`solveWithin` with the level's set, after
> the uniqueness count); classify its report to `{ score, tierUsed }`. Refuse an ambiguous,
> stuck, or score-at-or-above-`spec.max` result. Prefer `tierUsed`, then smaller distance to the
> sample target when present, otherwise the higher score. Ties keep the shuffled order.
> A refused sign stays refused for the rest of the pass.
>
> Every pool evaluation counts in `stats.oracleCalls` and ticks the inherited budget; no new
> cap, no clock. Each step removes one sign or refuses the whole pool. Keep the existing log
> vocabulary; an allowed member not chosen is `keep`, as in the cells dig.

R6 objective contract used here:

```text
{ kind: 'refused', reason: 'ambiguous' | 'techniques' | 'tooHard' }
{ kind: 'bounded', score: finite number, tierUsed: boolean }
winner: tierUsed first, then min(abs(score - target)) for a finite target,
        otherwise max(score); exactly tied candidates keep encounter order
```

`tierUsed` is a proxy from the bounded report's `techniqueCounts` and
`spec.tierTechniques`, not a floor certificate. For VeryEasy or an empty tier it is vacuous/true.
Never call `requiredOf` on this restricted solve. `SG.difficulty.classify(report, trialModel)`
provides its score without another solve. Keep `assumeUniqueness: false` in `solveWithin`.
Final exactness is still the canonical rating plus `requiredOf`, on the returned sign model.

`options.target` is an optional number or null. No target is drawn here. Before MS06 it is absent
and the comparator uses higher score; MS06b prepares/test-drives its forwarding and MS06c2
supplies the one originating sample target. MS06c1's transport-only stage must not start sending
finite production targets to this already-active comparator. Explicit null also uses higher score.
A finite target never outranks
`tierUsed`. The guided sign pass does not add a new “current versus winner” stop or polishing pass.

### Anchors (unchanged Greater-Than code at `2c665bb`; find moved lines by the quoted text)

| File:line / quote | Use |
|---|---|
| `generator/js/variants/greater-than.js:38`, `MAX_TUNE_ROUNDS = 8` | Add fixed `SIGN_POOL` beside it; do not change tune rounds |
| `:198`, `function solveWithin` | Inherited budget, restricted techniques, no uniqueness assumption |
| `:246`, `const stats =` | Oracle/evaluation accounting |
| `:292-301`, `uniqueOracle`, `techniqueOracle` | Reuse the uniqueness count and bounded report |
| `:303-334`, `function* digPass` | Leave this sequential pass for `signs.minimal`; add the guided technique pass |
| `:378-411`, `if (allowed !== null) yield* digPass` | Replace only the technique-pass call |
| `:445-450`, `clueFloorScale` | Unchanged |
| `generator/js/engine/digger.js:894-918`, strategy registry | Read-only diagnostic wrapper via register/unregister/get |
| `:1188-1208`, `const resolved =` | MS06b's later target forwarding point, not owned here |
| `core/js/engine/budget.js:47-65`, `tick`, `check` | Existing budget methods; check already accounts one work unit |
| `generator/js/engine/replay.js:361-393`, sign accept / `keep` | Existing replay log operations already read both |
| `generator/tests/manual/greater-than.test.js:18,183-207,1031-1035` | CV6 budgets, literal seeds and nearest-rank p95 |

The present sign oracle only tests `report.solved`; the new score bound is part of the accepted
guided pass. Do not copy the cells' proposal objective or `STUCK_SCORE` into this pass.

### Pool, rollback, counters and log

For each technique pass allocate a fresh refused-sign mask; do not carry it across a clue-reveal
round. Scan the existing shuffled `order` for the first at most `SIGN_POOL` alive, not-refused
signs. Evaluate each against the same current sign set: temporarily clear that sign, build
`withSigns`, run the existing oracle, and restore it in `finally`, including cancellation/errors.
Allowed losers remain eligible for a later pool; refused signs never return in this pass.

Account one `stats.tried` and one `stats.oracleCalls` per evaluated sign, not twice because its
oracle contains both DFS and a logical solve. Use the existing inherited `budget.check()` at each
evaluation boundary and pass that same budget into both solvers; no replacement guard budget.
Solver-internal work remains counted normally. Yield after each evaluation for cooperative runs.
Increment `accepted` only for the chosen removal and `rejected` for refused candidates; a `keep`
is neither. Preserve existing metric/event keys.

Record evaluation outcomes in order. As with the cells dig, each successful evaluation can record
`{ op: 'keep', cells: [a,b], sign: idx, score }`, and a refused one records
`{ op: 'reject', cells: [a,b], sign: idx, reason }`; after evaluating the pool, the winner alone
records `{ op: 'accept', cells: [a,b], sign: idx }`. This retains a winning keep for replay's
comparison span as well as keeps for all allowed losers. Use the existing `dig.keep` micro event,
with numeric score and unhighlight, not a new event kind or an objective object.
Only `accept` changes the alive-sign state. No new RNG call: the initial sign shuffle is unchanged.

If no candidate wins, every member is refused and the next pool advances; if the pool is empty,
the pass ends. Otherwise remove the winner and repeat. Thus every iteration removes or permanently
refuses at least one sign. Run `signs.minimal` exactly as before afterwards.

## Files to create/modify (exclusive ownership)

- `generator/js/variants/greater-than.js`.
- New `generator/tests/suites/greater-than-guided.test.js`; `generator/tests.html` test list.
  Add focused existing `replay`/`steps` suite cases only if needed to prove sign `keep` semantics;
  no replay engine redesign. `generator/tests/manual/greater-than.test.js` is run, not weakened.
- `generator/design.md` section 8.3, both developer guides if they describe sign digging.
  User guides only if their present description becomes false; EN and VI together.
- `docs/difficulty-v3/notes.md`, `docs/difficulty-v3/cv6-guided-sign-dig-<date>.md`,
  `docs/difficulty-v3/evidence/MS05e/`.
- The existing regression/wire/analysis/help generated files through the gates below:
  only Greater-Than records/examples may change. The required complete publication envelopes
  retain all unrelated entries byte-for-byte; never fabricate current-source ledgers from old ones.
- Scratch driver `generator/tests/artifacts/difficulty-v3/MS05e/measure-gt.js` and its aggregation
  helper; no committed new general-purpose tool, no temporary-system scratch.

## Implementation steps

1. **Diagnosis before production edits.** Capture seeds 300-319 Normal under accepted MS05r6b,
   using r4's normal no-override default.
   Record every attempt/sample's clue count/floor, sign count, solved score/level, `required`,
   and whether it is below band at the floor with a minimal sign set. Count disjoint failure
   categories and show that this trap dominates; a tied/unclear or different dominant cause is
   a stop/report, not permission for another strategy.
2. Record unchanged-source timing before-data for both Normal cohorts and Easy/Hard/Expert.
   Retain MS04's evidence too: MS05r6b is the immediate control, MS04 is historical context.
3. Implement fixed `SIGN_POOL = 8`, only the technique pass, with rollback, trace and quick tests.
4. Perform one planned comparison per tried value among 4/8/16. Do not retune another constant,
   change seeds, or run repeated discovery rounds. Keep 8 if it meets closure without a regression;
   otherwise compare the other permitted values once. Prefer an evidenced passing value without
   hit/neighbor regression; report the choice and all values tried. A disputed trade-off goes to
   the owner rather than inventing a looser acceptance. Fix the chosen literal in source.
5. Run unchanged GD CV6 and closure comparisons on the final literal. If CV6 still fails,
   stop/report with the fallback below; do not refresh fixtures to suggest acceptance.
6. On success, finish GG/GR/GH and documentation. Record actual times and all intended differences.
   If a correct intentional change affects an unrelated fixture, stop for assignment; do not
   silently expand the authorised Greater-Than-only scope.

### Diagnostic/measurement driver contract

Build the scratch driver once, using the existing Node loader, not a second solver:
`require('../../../replay-fixtures.js').nodeEnv().engine()` from its directory loads `globalThis.SG`.
It accepts exactly `--mode=diagnose|measure --level=<id> --from=N --count=N --repeat=N --json=<path>`.
`repeat` labels independent invocations; each file contains one run, not a hidden loop of repeats.

Run literal seeds `from+i`, **not** `perf.js`'s `seedBase+i*101` and not soak's FNV tags.
Use `SG.pipeline.run({ variantId:'greaterThan', difficulty:level, seed, trace:'summary' }, sink)`
with the current default configuration and budget behavior, as CV6 does. No warmup or support override.
Record per-request elapsed time, success/error, score/level, exact flag, canonical requiredness,
attempts, full-rating/work counters from MS05r3 (the absorbed MS05c contract) and oracle calls;
retain failed requests.
Independent validity/uniqueness/symmetry checks run after timing, never inside the timed interval.
Compute nearest-rank p50/p95/max exactly as the manual suite; no missing outcome becomes a zero.

For diagnosis only, wrap the registered `signs` strategy using get/unregister/register in the
isolated Node process, transparently drive/yield its iterator, capture copied results plus the
current `dig` stage's attempt/sample args, then restore the registration in `finally`. Capture
per-call data before keeper replacement. Verify minimality after the timed request by removing
each remaining sign and counting solutions up to 2; record errors/timeouts as unknown, not minimal.
This extra work is diagnosis, never headline latency. Do not edit production source to capture it.

JSON includes source identity, Node, machine, lock/task id, config, literal seed list, pool value
(null before the change), repeat label, all outcomes and total duration. Enforce a 540-second
process ceiling; shard by literal seed range if needed and merge exactly once per key. A timeout
stays a failure in the manifest and returns to the orchestrator.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05e-B01 | The observed dominant trap is established before the authorised repair |
| MS05e-B02 | CV6's unchanged assertion passes, or the task stops with the fixed fallback decision request |
| MS05e-B03 | Honest required Normal results are not traded for old order 65, relaxed budgets or invalid puzzles |
| MS05e-B04 | Easy/Hard/Expert and both Normal cohorts have matched time/hit/work evidence; no slowdown is hidden |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05e-T01 | Only the technique pass uses the tier-first pool; ties and refusal pruning are deterministic |
| MS05e-T02 | One counted oracle/evaluation, inherited budget, rollback on error, cooperative parity and existing log vocabulary |
| MS05e-T03 | Minimal signs, symmetry, clue floor, uniqueness, keeper and final-rating contracts remain valid |
| MS05e-T04 | SIGN_POOL is one fixed value from 4/8/16; every tried value and all outcomes are recorded |
| MS05e-T05 | Both quick suites, unchanged GD and scoped GG/GR/GH pass; only authorised differences are published |

## Test plan and gates

### Focused quick cases

- Scripted solved bounded reports: tier-used 650 beats non-tier 500 at target 500; tier-used 550/450
  tie keeps the first; without a target higher score wins within the same tier.
- Refuse uniqueness count 2, stuck, and score exactly `spec.max`; neither wins nor returns later
  in the same pass. Reset refusal state in a later reveal round.
- Fewer than `SIGN_POOL` live signs, all refused, and an allowed loser reconsidered after a winner.
  Assert each pool evaluates trial models differing by one sign from the same current model.
- No extra logical solve merely to classify; correct oracle count and inherited budget object.
  Cancellation/exception restores temporary alive state and propagates the original error.
- Fixed small real seed: sync/cooperative/logged/unlogged output identity; signs remain minimal,
  clues symmetric, canonical requiredness and published exact flag agree.
- Replay reconstructs the same final signs/givens with sign-bearing `keep` entries, including
  allowed losers; no new log/event kind. This tests replay behavior, not constant values.

From Generator, under the shared lock. Keep replay/steps in their measured r6b shard groups,
not in this combined focused command:

```powershell
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\node-runner.js','--suite=greater-than-guided,digger,events,ui-contract,help')
```

Run the new sign-replay cases by their preflighted full names/describe group; complete all
other replay/steps assertions in the final quick manifest below.

### GS-CV6 exact invocations

The driver is created by this task before these commands; it is not a pre-existing tool. From Generator:

```powershell
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\artifacts\difficulty-v3\MS05e\measure-gt.js','--mode=diagnose','--level=normal','--from=300','--count=20','--repeat=1','--json=..\docs\difficulty-v3\evidence\MS05e\before\diagnosis.json')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\artifacts\difficulty-v3\MS05e\measure-gt.js','--mode=measure','--level=normal','--from=300','--count=20','--repeat=1','--json=..\docs\difficulty-v3\evidence\MS05e\before\normal-300-r1.json')
```

Complete this finite manifest, one bounded invocation/file at a time, before the change and for each
tried pool. Replace `before` with `pool-4`, `pool-8` or `pool-16`; never overwrite a prior run:

| Level | Literal seeds | Count | Repeat labels |
|---|---|---:|---|
| normal | 300-319 | 20 | 1,2 |
| normal | 7000-7039 | 40 | 1,2 |
| easy | 300-319 | 20 | 1,2 |
| hard | 300-319 | 20 | 1,2 |
| expert | 300-319 | 20 | 1,2 |

These are 240 requests per tested source/pool, with no hidden failed runs. Planning allowance
5-240 seconds per timing invocation, up to 540 seconds for diagnosis; approximately 15-60 minutes
per full source/pool plus publication gates. Use observed projection after the first cohort.
Never silently substitute the manual suite's neighbor seeds (Easy 200+, Hard 400+, Expert 500+).

GD-CV6, from Generator, using MS05b3's lazy per-level cache. Run every existing CV6 and I5
assertion in the Greater-Than generated-puzzle group as **separate per-level selectors**;
do not run the unbounded whole `greater-than` suite, whose aggregate tests still build all levels.
Keep the original counts: 20 each for veryEasy/easy/normal, 10 each for
hard/expert/master/nightmare/hell1/hell2. Normal's exact commands are:

```powershell
Invoke-Dv3Node -Task MS05e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=greater-than','--filter=> normal: 20 puzzles > CV6:','--verbose')
Invoke-Dv3Node -Task MS05e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=greater-than','--filter=> normal: 20 puzzles > I5:','--verbose')
```

Replace only the level/count for the other eight levels, **keeping the leading `> `** inside
the filter value. The harness is case-insensitive substring matching: without that boundary,
Easy also selects Very Easy. Record a manifest of 18 selectors with unchanged seed range/count;
before attributing an outcome to a cell, verify its full name and selected total **1** in the
runner's summary. Zero, two or skipped tests are not a passed cell.
This is complete CV6/I5 coverage, not a claim that every unrelated Greater-Than manual test ran.
The quick sign/replay/steps tests and GS-CV6 controls cover this task's other changed behavior.
Record the exit, named failures, raw 700 ms target and actual `SG.test.timeLimit(700)` threshold.
`-AllowExit1` preserves the known-failure evidence, not acceptance. Any remaining CV6 failure
invokes the fallback; any other failure is also reported. Prefer the current GS-CV6/post-allowance
timings when projecting, and label MS05b3's data with its actual source/allowance. Earlier
pre-allowance costs are planning context, not a proved upper bound for a different source.
Before starting: jobs 1/no `--jobs`, initially 1-300 seconds per selector,
roughly 5-30 minutes total. Report a projected >450-second level before starting; no command
may exceed 540 seconds. An unchanged hit-rate threshold still failing under requiredness remains
an availability failure under the checklist rule, never a green assertion. Normal CV6 has no
such waiver: the fixed S-OD1 fallback applies. Do not lower any count, budget or threshold.

### GG/GR/GH — Greater-Than differences only

The current merge writers require complete current-source envelopes. Do not invent a partial
`--write`/`--update-hashes` flag or relabel old ledgers as current. Record full E's 520 keys,
four wire IDs and 14 analysis IDs in bounded shards; unrelated entries are invariant controls and
must remain unchanged. Only the Greater-Than 40 hash keys and G11/G12 wire/analysis may differ.

```powershell
# Generator: representative GT hash shard; all E shards still required for the guarded complete writer.
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\perf.js','--hash-key=greaterThan/normal','--hash-from=0','--hash-count=5','--hash-record=..\docs\difficulty-v3\evidence\MS05e\hashes\greaterThan-normal-00.json')
# Repeat normal/hard at indexes 0,5,10,15 and the unchanged E controls; inspect the complete comparison.
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05e\hashes','--update-hashes')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05e\hashes','--check-hashes')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\replay-fixtures.js','--ids=G11','--record=..\docs\difficulty-v3\evidence\MS05e\wire\G11.json')
# Record G09/G10/G12 separately too; inspect: G09/G10 must be unchanged. Publish wire BEFORE analysis.
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05e\wire','--write')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05e\wire','--check')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\replay-goldens.js','--ids=G11','--record=..\docs\difficulty-v3\evidence\MS05e\analysis\G11.json')
# Record all G01-G14 separately against the published wire, then inspect and merge.
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05e\analysis','--write')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05e\analysis','--check')
```

GH from Player, existing Greater-Than real sources (`ineqChain`, `minMaxForcing`):

```powershell
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\tools\make-technique-examples.js','..\generator','--ids=ineqChain,minMaxForcing','--max-puzzles=8','--max-hints=400','--check')
```

A sign-generation change should not change a fixed help puzzle's solving step. If an actual
Greater-Than example needs an explained refresh, acquire its real source using B's finite recipe,
then repeat the same selected command with `--sources=<owned-source-map> --write`, followed by
`--check`. Keep all other IDs untouched; do not start an unbounded discovery.
E planning allowance 10-90 minutes, GH 1-120 seconds; every command <=540 seconds.
Finally rebuild/reconcile both full quick inventories using MS05r5 tooling and the measured
r6b shard boundaries. A whole app command is allowed only with a <=450 s projection; otherwise
run disjoint suite/full-name shards, each <=540 s. Retain every assertion, no new skips, actual
result JSON and current source identities. Old r6b result files are not current-source passes.

## Definition of done & handoff

Return the diagnosis table; pool comparison; Normal and Easy/Hard/Expert p50/p95/max, exact hits,
attempts, full ratings and oracle work; every error; uniqueness/minimality/symmetry checks; unchanged
CV6 result; all gates and explained diffs. State the final literal and source. No claim that the
700 ms design budget was met merely because a scaled assertion passed.

**Fixed fallback:** if CV6 still fails, stop and report to the owner, who may choose only the
already named option(b): a documented slower Normal contract applied consistently to CV6 and GP,
or not offering the cell if final qualification fails it. Do not implement that choice here.
Order 65, relaxed floors, new caps and a second strategy remain forbidden. A failed trial is not an
accepted prerequisite; the orchestrator must record the owner's disposition before MS06a proceeds.

Handoff to MS06b/MS06c2: `options.target` controls only the pool's second ranking key; no extra draw.
The inequalities guard still prevents refinement. MS18d/MS18e verify the accepted CV6 disposition.

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
