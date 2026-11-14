# MS18d — Final performance matrix and full hash check

| Header | Value |
|---|---|
| Depends on | MS18c accepted |
| Size / active time | Medium; 40-55 minutes including preflight tooling, plus GP/GG |
| Owner / milestone | Performance evidence; M18d |
| Authority | R24/R21 |
| Status | Not started |

## Goal & business context

Measure every offered performance-table cell, not a convenient fast subset, and verify all fixed
puzzle hashes after publication. A hash-only pass is not a timing gate.

## Scope and repository rules

In: published qualification-derived target rule, full GP, full GG check and evidence.
Out: performance-driven algorithm tuning, arbitrary target relaxation, canonical hash rewriting.
AGENTS/checklist; no Git/pack/log edits; timing runs serialized with Pentomino.

## Inputs & context

R24, verbatim:

> Final GP measures 50 runs per offered performance-table cell, records p50/p95/max and the aggregate
> published success criterion. Hash mode is not a timing gate.

Use existing seedBase 7000, seed i=7000+i*101, trace summary, warmup 0, runs 50 and existing
nearest-rank percentile. The full intended matrix is perfTools.cells() after final offers.
Every offered level must have a documented performance target; do not omit a newly offered cell.
Aggregate success requires >=90% of these cells meeting their target, not 90% of chosen requests.
Individual misses remain visible. A crash/missing result is not merely a slow cell.
The existing perf CLI uses strict `p95 < target`; qualification uses `p95 <= budget`. Preserve that
distinction rather than silently making a boundary miss pass.

Allowed target rule from perf-helper: keep an existing target while qualification p95 meets it;
for a new/outgrown target use ceil(3*qualification p95), never below the preceding applicable target
or above the qualification budget. The v2 Easy-from-Normal migration does not remap unchanged v3
bands. Record old/new target, qualifying p95, previous target and budget before GP; never change a
target because GP failed. Any genuinely undefined target-policy case is a blocker, not an omitted cell.

GG retains all 26 combinations x 20 fixed seeds, including now-hidden requests through the MS03d
diagnostic guard. Record fresh complete shards for current source/helper identity; compare only.
Anchors verified at `c9935cd`: `generator/tests/fixtures/perf-helper.js:47-53`
(`p95 budgets in milliseconds`), `:77-89` (`function cells`), `:113-135` (`function measure`);
`generator/tests/perf.js:455-476` (`if (plan.mode !== 'timing') return runHashes`).
Find these quotes after later tooling changes.

### PR-S2 remarks — performance evidence, unchanged scope

Fable's answer (`92a7693`, `docs/difficulty-v3/clarifications-resolved.md`) leaves MS05e-MS18e
unchanged. The following notes belong to the existing performance/item reporting; they add no
new scope, cap, budget, performance target or generator change.

- **S-AV11 stage profile:** when this task measures performance, obtain a stage profile of the
  single recorded Jigsaw request (`jigsaw9`, Expert, seed 1111; 325.313 s in MS05b3).
  Use the existing pipeline stage timings/recording facilities, retaining the request's trace/options
  and the measured source identity. Keep this identified diagnostic separate from the unchanged
  50-run GP populations, seeds, warmup and aggregate. Until the profile identifies its stage, do not
  describe the historical 325 s as a dig cost. If the delay no longer reproduces, say so rather than
  assigning a cause to the old run. Use the existing lock/projection/guard rules; no guard is raised
  and no broad search for more outliers or new profiling tool is authorized by this remark.
- **Existing request counters:** where per-request records are already written, retain the existing
  `stats` counters, including `samples`, `attempts` and `oracleCalls`, with the source/request/default
  metadata. Preserve their actual scope and available values; do not replace missing data with zero
  or infer whole-request totals from a returned sample's counters. They are the baseline for the
  later improvement feature, not a new telemetry or schema project in this task.
- **S-AV03 wording:** on the source reviewed in PR-S2, mega16 Nightmare fails the 30 s qualification
  budget by its work ceiling, not as a tail. Keep historical and final-source measurements distinct.

The profile informs which unbounded piece might be guarded **later**; it authorizes no repair here.
`docs/improve-generating/plan.md` is saved for a separately authorized future feature and must not
be implemented as part of this performance task.

### Mandatory preflight before any GP invocation (FS23)

The final GQ record already has raw `cells[].requests[].ms` for this candidate. First project
every final offered cell as `50 * mean(requests.ms)`, retaining errors in the observed times and
requiring complete, finite, non-negative data. Use the arithmetic mean, not a mean of shard
percentiles. Retain the GQ source identity, actual sample count, mean/p50 and projected seconds.
Enumerate **all final offered cells from the published support arrays**, including any awaiting
a new performance target; do not let an absent old PERF_TARGETS entry hide a cell.

GQ uses trace off/jobs 4 and different seeds; GP uses trace summary/jobs 1. This is a conservative
scheduling alert, not an equality or a claimed GP result. Flag every projected total >450 seconds,
leaving startup/variance margin below the 540-second ceiling. Report the full table and flagged
cells to the orchestrator **before the first GP command**, not only when one times out.
Missing/inapplicable GQ data also blocks this preflight; it is not a zero-millisecond estimate.

If a cell is flagged, do not launch that unsafe command. Under S-OD4 create a named final-cost
item and continue other credibly bounded cells; there is no automatic new tooling task/evidence
class. This task does not own `perf.js`/`measure` changes or an unsupported CLI. Keep every
flagged cell in the intended denominator and mark its measurement incomplete, not passed.
Do not compute a complete >=90% verdict from only the cells that finished.
`--seed=9525 --runs=25` is not a valid split: it adds a cold start and printed percentiles cannot
be merged. A separately decided protocol change would need its own authorization; preserve
50 raw outcomes, seeds, percentiles and cold/warm semantics unless that decision says otherwise.

Implement a read-only task-owned `project-gp.js` in the artifact directory below. It accepts
`--qualification=<file> --json=<file>`, loads the normal engine via the existing replay-fixture
Node loader, reads published `difficultySupport`, and joins each `(variant,level)` to the
validated final qualification requests. It generates no puzzles and mutates no support array.
Write `{qualificationHash, qualificationEngine, publishedCells, projections, flagged}` with
the fields above, stable cell order and CRLF; print the flagged list. Exit 2 for missing/invalid
input, 1 when complete projections flag any cell, 0 otherwise. Exit 1 prevents those commands,
not the rest of the task; retain the named items and intended matrix. Missing/corrupt qualification
input must be resolved, never guessed as a zero-cost cell.

## Files to create/modify

- Evidence/MS18d, new docs/difficulty-v3/performance-v3.md, notes.
- Task-owned read-only `generator/tests/artifacts/difficulty-v3/MS18d/project-gp.js` and
  `docs/difficulty-v3/evidence/MS18d/gp-preflight.json`; no permanent new perf tool in this scope.
- `generator/tests/fixtures/perf-helper.js` PERF_TARGETS only if the documented qualification rule
  requires it; corresponding Generator design 9.1 and both developer guides.
- No production code, regression.js or other expected fixture.

## Implementation steps

0. Run the complete GQ-derived preflight before timing. Record flagged cells as named cost items;
   continue safe cells without new tooling, relaxed guards or a false complete-matrix claim.
1. Enumerate final intended cells; apply only qualification-authorized target updates with arithmetic.
2. Measure every cell, save stdout/exit/time/source/seed metadata and all misses.
3. Aggregate the complete matrix against >=90%; do not relax targets after seeing GP.
4. Fresh-record every GG identity and complete check-only merge.
5. Run bounded quick coverage if target/docs changed; reconcile inherited/new cost items, including
   CV6 and checkpoint large-board findings. No algorithm repair or budget change here.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18d-B01 | Published performance is measured on the entire offered table |
| MS18d-B02 | No target or hash is changed to conceal a failure |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18d-T01 | Every cell has 50 outcomes with seed/warmup/trace/percentile protocol preserved |
| MS18d-T02 | Complete >=90% aggregate and every individual miss/error recorded |
| MS18d-T03 | Fresh complete 520-key GG matches; any target changes follow only the documented rule |
| MS18d-T04 | Full preflight precedes timing; every >450-second projection has an explicit item/outcome, and missing/corrupt input is not hidden |

## Test plan and gates

From Generator, preflight first (read-only, expected under a second; create the named artifact
driver before this command). Do not start a flagged cell; other bounded cells may proceed:

```powershell
node tests\artifacts\difficulty-v3\MS18d\project-gp.js --qualification=..\docs\difficulty-v3\qualification-v3.json --json=..\docs\difficulty-v3\evidence\MS18d\gp-preflight.json
```

Test its arithmetic with synthetic 40- and 100-request rows, a missing offered cell, duplicate
cell, non-finite/negative/missing ms, and a 10,000 ms mean => 500-second flagged projection.
No real generation is needed to validate this preflight. Then first GP cell and each final
`SG.fixtures.perfTools.cells()` cell:

```powershell
node tests\perf.js --variant=classic4 --level=veryEasy --runs=50 --warmup=0 --seed=7000 --gate --ascii
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS18d\hashes\classic4-veryEasy-00.json
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS18d\hashes --check-hashes
```

Persist each command's transcript under evidence/MS18d with its exit code. Complete all E hash
identities before merge; no --update-hashes. Jobs 1/no --jobs. Use the recorded per-cell preflight
projections, not an assumed 1-540-second allowance; summed projections give the GP planning total.
GG is approximately 10-90 minutes. **Announce to the orchestrator before starting (pentomino runs
in parallel on the same machine).** Enforce the 540-second process ceiling; do not silently split runs
with changed cold/warm timing semantics. If no authorized safe route exists, retain a named
unmeasured-cost item and the incomplete aggregate rather than create another tooling task.
If files changed: Generator `--suite=perf-tooling,smoke,help` and both quick sets.

## Definition of done & handoff

Return preflight/projections, intended/completed cell coverage, target arithmetic, the actual
aggregate verdict (incomplete where appropriate), complete GG evidence and the cumulative item list.
S-OD4 allows continuing after a performance miss, not claiming a failed release gate passed.
Any proposed change to a recorded performance contract still needs the owner; an authorized
implementation change invalidates affected final evidence.

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or changing a recorded decision stops;
performance findings remain named numerical items with actual failed/incomplete verdicts.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s; do not invent another evidence
class/tooling task for a slow cell. If docs/targets change, verify the current bounded quick manifest.
Return the complete inherited/new item list to MS18e; no suite addition is authorized here.

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
