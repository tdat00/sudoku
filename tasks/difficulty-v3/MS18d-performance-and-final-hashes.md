# MS18d — Final performance matrix and full hash check

| Header | Value |
|---|---|
| Depends on | MS18c accepted |
| Size / active time | Small-Medium; 25-40 minutes plus GP/GG |
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

Use existing seedBase7000, seed i=7000+i*101, trace summary, warmup0, runs50 and existing
nearest-rank percentile. The full intended matrix is perfTools.cells() after final offers.
Every offered level must have a documented performance target; do not omit a newly offered cell.
Aggregate success requires >=90% of these cells meeting their target, not90% of chosen requests.
Individual misses remain visible. A crash/missing result is not merely a slow cell.
The existing perf CLI uses strict `p95 < target`; qualification uses `p95 <= budget`. Preserve that
distinction rather than silently making a boundary miss pass.

Allowed target rule from perf-helper: keep an existing target while qualification p95 meets it;
for a new/outgrown target use ceil(3*qualification p95), never below the preceding applicable target
or above the qualification budget. The v2 Easy-from-Normal migration does not remap unchanged v3
bands. Record old/new target, qualifying p95, previous target and budget before GP; never change a
target because GP failed. Any genuinely undefined target-policy case is a blocker, not an omitted cell.

GG retains all26 combinations x20 fixed seeds, including now-hidden requests through the MS03d
diagnostic guard. Record fresh complete shards for current source/helper identity; compare only.
Baseline `generator/tests/fixtures/perf-helper.js:41-47` (target rule), `:72-87` (`function cells`),
`:108-129` (`function measure`); `generator/tests/perf.js:244-254` (mode separation).

## Files to create/modify

- Evidence/MS18d, new docs/difficulty-v3/performance-v3.md, notes.
- `generator/tests/fixtures/perf-helper.js` PERF_TARGETS only if the documented qualification rule
  requires it; corresponding Generator design9.1 and both developer guides.
- No production code, regression.js or other expected fixture.

## Implementation steps

1. Enumerate final intended cells; apply only qualification-authorized target updates with arithmetic.
2. Measure every cell, save stdout/exit/time/source/seed metadata and all misses.
3. Aggregate the complete matrix against >=90%; do not relax targets after seeing GP.
4. Fresh-record every GG identity and complete check-only merge.
5. Run quick sets if target/docs changed; report blockers rather than repairing algorithms here.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18d-B01 | Published performance is measured on the entire offered table |
| MS18d-B02 | No target or hash is changed to conceal a failure |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18d-T01 | Every cell has50 outcomes with seed/warmup/trace/percentile protocol preserved |
| MS18d-T02 | Complete >=90% aggregate and every individual miss/error recorded |
| MS18d-T03 | Fresh complete520-key GG matches; any target changes follow only the documented rule |

## Test plan and gates

From Generator, first GP cell then each final perfTools.cells() cell:

```powershell
node tests\perf.js --variant=classic4 --level=veryEasy --runs=50 --warmup=0 --seed=7000 --gate --ascii
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS18d\hashes\classic4-veryEasy-00.json
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS18d\hashes --check-hashes
```

Persist each command's transcript under evidence/MS18d with its exit code. Complete all E hash
identities before merge; no --update-hashes. Jobs1/no --jobs. Estimate1-540 seconds/GP cell,
0.5-8 hours total; GG10-90 minutes. **Announce to the orchestrator before starting (pentomino runs
in parallel on the same machine).** Stop/investigate at ten minutes; do not silently split runs
with changed cold/warm timing semantics. An unsupported safe split is a tooling blocker.
If files changed: Generator `--suite=perf-tooling,smoke,help` and both quick sets.

## Definition of done & handoff

Return full cell coverage, target arithmetic, aggregate verdict, misses and complete GG evidence.
Any performance fix is separately assigned and invalidates affected final evidence.

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
