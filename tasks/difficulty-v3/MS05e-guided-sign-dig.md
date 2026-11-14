# MS05e — Guided sign dig for Greater-Than

> **Closed: measured, set aside — CV6-05 / S-OD6, 2026-11-14.** Fable chose Q1(b), withdraw
> the pool, and Q2(a), keep the contracts. The orchestrator restored the 12 existing files
> byte-for-byte from `f7be90f` (runtime `00647f9`), deleted the added guided suite and proved
> fingerprinted-source/artifact identity, with no run. The rejected 13-file candidate is retained in
> `docs/difficulty-v3/evidence/MS05e/candidate-pool-4.patch`, which rebuilds it from `f7be90f`.
> S-AV01 stays open; S-AV16/S-AV17 are withdrawn as current-source items, not erased from history.
> MS05e-B02's honest CV6 verdict is retained; IR29, IR30, F01 and F02 are moot and need no owner.
> MS06 transports the target through the first-allowed sign pass without consuming it there;
> no edit to `greater-than.js`. After the document corrections and SA1's pack cross-check,
> MS06a captures all 17 cells on the restored source. The original dispatch brief below is
> historical, not permission to reinstate its pool, suite or target-consumer handoff.
> The orchestrator owns the formal index mark and Execution log.

| Header | Value |
|---|---|
| Depends on | r6b/r6c combined recovery accepted/committed, including r5p/r5m, r6a 520/5/14 E/pins and b3 evidence |
| Size / active time | Medium, about 450-750 changed lines; 50-60 active minutes plus bounded evidence runs |
| Owner / milestone | Greater-Than generation; M5e CV6 disposition before the target baseline |
| Authority / review | CV6-01/S-OD1, R6, PR-S1/S-OD4 stop/review rules; analyst cross-review |
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
changing production code: another strategy would change S-OD1. If closure still fails only CV6
timing, retain S-AV01 with the measured numbers for MS07e/MS18d and continue the task under S-OD4.
MS06a records that unresolved performance item explicitly in its new baseline; it does not wait
for an owner answer merely because the unchanged timing assertion remains red.

## Scope

In: the technique-oracle sign pass only, focused quick tests, a bounded diagnostic/measurement
driver, current design facts, Greater-Than output evidence. Keep `signs.minimal`, reveals,
`MAX_TUNE_ROUNDS`, keeper offers and final canonical rating as the accepted recovery left them.
MS05r4 selected 256; the r6b/r6c combined commit accepted the recovery. Greater-Than has 81 cells,
so its default remains eight attempts after r5p. No independent MS05d commit is awaited.

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

### Anchors at c9935cd (find the quoted symbols again after the recovery)

| File:line / quote | Use |
|---|---|
| `generator/js/variants/greater-than.js:40`, `MAX_TUNE_ROUNDS = 8` | Add fixed `SIGN_POOL` beside it; do not change tune rounds |
| `:193`, `function solveWithin` | Inherited budget, restricted techniques, no uniqueness assumption |
| `:249`, `const stats =` | Oracle/evaluation accounting |
| `:291-300`, `uniqueOracle`, `techniqueOracle` | Reuse the uniqueness count and bounded report |
| `:303-334`, `function* digPass` | Leave this sequential pass for `signs.minimal`; add the guided technique pass |
| `:378-411`, `if (allowed !== null) yield* digPass` (line 380) | Replace only the technique-pass call |
| `:445-450`, `clueFloorScale` | Unchanged |
| `generator/js/engine/digger.js:911-932`, strategy registry | Signs may be wrapped/restored with register/unregister/get; built-in cells cannot be unregistered |
| `:1324-1339`, `const resolved =` | MS06b's later target forwarding point, not owned here |
| `core/js/engine/budget.js:47-65`, `tick`, `check` | Existing budget methods; check already accounts one work unit |
| `generator/js/engine/replay.js:361-393`, sign accept / `keep` | Existing replay log operations already read both |
| `generator/tests/manual/greater-than.test.js:18,197,1037`, `puzzleRun`, `CV6:` | CV6 budgets, literal seed formula and nearest-rank p95; b3 makes access lazy |

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
  Own its bounded CI group/manifest entry after r6c, without adding manual generation to CI.
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
5. Run unchanged GD CV6 and closure comparisons on the final literal. A timing-only miss is S-AV01,
   not a stop; do not claim that CV6 passed or implement a fallback policy without an answer.
6. With correctness intact, finish GG/GR/GH and documentation even when a timing item remains.
   Record actual times and all intended differences.
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
stays a failed availability item with its numbers; loss/corruption of a record is correctness.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05e-B01 | The observed dominant trap is established before the authorised repair |
| MS05e-B02 | CV6's actual verdict is retained; a time-only miss continues as S-AV01, without changing its target |
| MS05e-B03 | Honest required Normal results are not traded for old order 65, relaxed budgets or invalid puzzles |
| MS05e-B04 | Easy/Hard/Expert and both Normal cohorts have matched time/hit/work evidence; no slowdown is hidden |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05e-T01 | Only the technique pass uses the tier-first pool; ties and refusal pruning are deterministic |
| MS05e-T02 | One counted oracle/evaluation, inherited budget, rollback on error, cooperative parity and existing log vocabulary |
| MS05e-T03 | Minimal signs, symmetry, clue floor, uniqueness, keeper and final-rating contracts remain valid |
| MS05e-T04 | SIGN_POOL is one fixed value from 4/8/16; every tried value and all outcomes are recorded |
| MS05e-T05 | Quick correctness and scoped GG/GR/GH pass, unchanged GD outcomes/items are honest; only authorized differences and CI membership change |

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
is retained as S-AV01 for MS07e/MS18d under S-OD4; any correctness failure still blocks.
Prefer the current GS-CV6/post-allowance
timings when projecting, and label MS05b3's data with its actual source/allowance. Earlier
pre-allowance costs are planning context, not a proved upper bound for a different source.
Before starting: jobs 1/no `--jobs`, initially 1-300 seconds per selector,
roughly 5-30 minutes total. Report a projected >450-second level before starting; no command
may exceed 540 seconds. An unchanged hit-rate threshold still failing under requiredness remains
an availability failure under the checklist rule, never a green assertion. Normal CV6's target
still has no waiver, but its performance-only owner stop is superseded by S-OD4. Do not lower
any count, budget or threshold.

### GG/GR/GH — Greater-Than differences only

The current merge writers require complete current-source envelopes. Do not invent a partial
`--write`/`--update-hashes` flag or relabel old ledgers as current. Record full E's 520 keys,
five wire IDs G09-G13 and 14 analysis IDs in bounded shards; unrelated entries are invariant controls and
must remain unchanged. Only the Greater-Than 40 hash keys and G11/G12 wire/analysis may differ.

```powershell
# Generator: representative GT hash shard; all E shards still required for the guarded complete writer.
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\perf.js','--hash-key=greaterThan/normal','--hash-from=0','--hash-count=5','--hash-record=..\docs\difficulty-v3\evidence\MS05e\hashes\greaterThan-normal-00.json')
# Repeat normal/hard at indexes 0,5,10,15 and the unchanged E controls; inspect the complete comparison.
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05e\hashes','--update-hashes')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05e\hashes','--check-hashes')
Invoke-Dv3Node -Task MS05e -NodeArgs @('tests\replay-fixtures.js','--ids=G11','--record=..\docs\difficulty-v3\evidence\MS05e\wire\G11.json')
# Record G09/G10/G12/G13 separately too; G09/G10/G13 are invariant controls. Publish wire BEFORE analysis.
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

**Fixed fallback, with S-OD4 process:** if CV6 still fails only for time, retain S-AV01 and continue.
MS07e/MS18d receive the numbers. Changing the contract still requires the owner's option (b):
a documented slower Normal target applied consistently to CV6 and GP, or qualification-based
non-offering. Do not implement that choice here. Order 65, relaxed floors, new caps and another
strategy remain forbidden. Correctness/evidence failures or a proposed decision change stop;
time-only failure does not block MS06a's explicitly labelled before-record.

Handoff to MS06b/MS06c2: `options.target` controls only the pool's second ranking key; no extra draw.
The inequalities guard still prevents refinement. MS18d/MS18e verify the actual CV6 verdict and
any later owner disposition. Return the inherited/new S-OD4 item list and the new suite's CI group.

## Execution log

| Field | Value |
|---|---|
| Status | Closed: measured, set aside (CV6-05 / S-OD6; Fable's Q1(b) withdraw the pool, Q2(a) keep the contracts). Not an accepted repair; the runtime is the pre-MS05e baseline |
| Start | 2026-11-14 12:28 (+07:00) |
| End | 2026-11-14 15:19 developer implementation and pool comparison; 15:52 D1 to the owner (email and CLI); 16:38 owner delegates D1 to Fable (S-OD6); 17:00 CV6-05 pushed to `clarifications` (snapshot `c0e4954`, also `refs/dv3-wip/MS05e-pending-20261114-1700`); Fable's answer read 17:12, branch deleted; 17:19 developer document rounds; 17:50 SA2 pack edits with SA1's cross-check; orchestrator commit |
| Duration | 2 h 51 min developer implementation and evidence runs + about 25 min of document rounds; SA1 review (`11-review-of-ms05e.md` sections 1-5) and cross-check (section 6); SA2 ruling, CV6-05 and pack edits |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (SA1 review and cross-check); gpt-6-astra (SA2 ruling, CV6-05, pack edits); claude-opus-5.5 (orchestrator) |
| Token usage | Developer 373 model calls (292 implementation, 81 document rounds); 140,739,353 input tokens (139,009,263 cache reads); 400,215 output tokens |
| AI credits | about 2,223 (developer: 1,722 implementation, 501 document rounds) |
| Verification | Candidate (history): the developer's correctness checks were green and the quick sets green on the pool-4 tree (Generator 3,279, Player 1,683); the pool comparison 4/8/16 over 240 requests per source, matched repeats; SA1 confirmed the measurements, GG/GR/pins and E for that tree. Disposition (orchestrator, no run, as Fable requires): (1) the 13 candidate files equal snapshot `c0e4954` blob for blob; (2) `evidence/MS05e/candidate-pool-4.patch` written as `git diff -U0 --full-index f7be90f c0e4954` over those 13 paths, and applied with `git apply --cached --unidiff-zero` to `f7be90f` in a temporary index it yields a tree identical to the candidate on all 13 paths; (3) the 12 existing files restored byte for byte from `f7be90f` and `generator/tests/suites/greater-than-guided.test.js` deleted (SA1 section 4, option (ii), steps 1-2); (4) identity: `git diff --quiet HEAD -- generator core player DEVELOPERGUIDE.md DEVELOPERGUIDE.vn.md AGENTS.md .github` exit 0, no untracked file in a fingerprinted folder (only the scratch scripts of `generator/tests/artifacts/difficulty-v3/MS05e/`, outside every fingerprint); `greater-than.js` blob `cbab64b8` equals `f7be90f`'s. MS05r6c's final quick runs (Generator 3,262 in 7 shards, 648.0 s; Player 1,683), MS05r6b's E and GD and MS05e's `before/` and `gd/before/` records therefore apply by identity |
| Acceptance | MS05e-B02 holds: CV6's verdict is retained and reported honestly (Normal 5,209 ms against the unchanged 1,400 ms assertion). The guided pool did not close CV6 at any permitted value and broke Nightmare CV6 (40,396 ms against 20,000 ms), so per CV6-05 it is set aside, not accepted. The record of the measured repair is kept: report `docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md` (outcome "measured, set aside", IR23-IR28 applied, Fable's two acknowledged errors), `docs/difficulty-v3/evidence/MS05e/` with the candidate patch, the scratch scripts and SA1's review 11 |
| Issues & resolutions | (1) IR23 (Major): the diagnosis dropped S-OD1's clue-floor condition; the named trap was 83/376 = 22.1 % of misses, so step 1's stop-and-report condition was met and not taken. Fable acknowledged the premise (one seed, 308) and the cost (about `SIGN_POOL` ratings per removal) as his errors; the check-list now requires an exact-predicate gate table and a wait before the first production edit. (2) D1 went to the owner, who delegated it to Fable (S-OD6); CV6-05 answered Q1(b), Q2(a). (3) IR24-IR28 corrected in the report, evidence and notes; IR27 left as "unexplained" (optional). (4) IR29, IR30, F01, F02 moot with the pool. (5) SA1 cross-check CC01 (design.md section 9.1 named in the conditional Normal contract step) applied by SA2; CC02 (short Expert seed for MS06c2's T01) left to MS06b/MS06c2 as optional |
| Handoff | MS06a: the complete 17-cell, 204-request before-record on the restored source (Greater-Than Normal/Hard/Expert included). MS06: on Greater-Than the target is transported, not consumed, by the first-allowed sign pass; no edit to `greater-than.js`; MS06c2's T01 lives in `digger-target`; MS06d may find a small or null effect on the three Greater-Than cells. Items: S-AV01 open (5,209 ms against 1,400 ms; 10.6 s p95 on 7000-7039) with the three fixed endings of Q2(a); S-AV16/S-AV17 withdrawn as current-source items, kept as history; S-AV08 648.0 s; Nightmare CV6 passes at 19,192 of 20,000 ms (about 4 % margin) — noted for MS07e |
