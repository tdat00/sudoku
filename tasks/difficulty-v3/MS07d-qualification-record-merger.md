# MS07d — Complete, checked qualification-shard merger

| Header | Value |
|---|---|
| Depends on | MS07c accepted |
| Size / active time | Medium; 40-55 minutes |
| Owner / milestone | Generator tooling; M7d checkpoint reporting ready |
| Authority | R24; AUTH-S1, PROC-S1 |
| Status | Not started |

## Goal & business context

Turn bounded variant/level runs into one auditable 135-cell record without accepting omissions,
mixed sources, fabricated early stops or probe data.

## Scope

In: no-generation merge CLI, pure validation/aggregation tests, complete metadata/CRLF writer.
Out: changing scheduler, seeds, qualification thresholds, worker count, budgets or live offers.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. No real qualification in this preparation task. Preserve
worker crash/IPC failure behavior and all request outcomes.

## Inputs & context

R24, verbatim:

> Final qualification covers the full **15 variants x 9 levels = 135 cells**, including currently
> hidden levels, not only current offers.
> Preserve the 40/100-seed protocol: >=36/40 plus p95 passes; 30-35/40 expands to 100 and needs >=90/100;
> <30/40 hides. Protocol-proved early hidden stops are valid; arbitrary truncation is not.

Existing JSON shape:

```text
{protocol,seedBase,machine:{...,node,jobs},engine:{sources,commit,dirty},started,finished,seconds,
 cells:[{variant,level,cellCount,budget,summary,requests:[{key,index,seed,hit,ms,...}]}],support}
```

Add `qualifierHash` (qualify.js and merger helper bytes) and explicit probe/early-stop protocol
metadata when writing new shards, including `acceptance:'canonical-required-tier'` and the actual
ratingVersion. The intermediate checkpoint still has the development rating version until MS17b;
do not label it a released v3 result. `--merge=<directory> --jobs=4 --json=<file> --markdown=<file>`
does no generation. Require the exact 15x9 matrix from checklist Q, jobs 4, Node/machine/protocol/
source/tool identity consistency. Reject duplicate cells/requests, unknown indexes/seeds, probes,
nonfinite/negative ms, missing outcomes and unexplained stopped/incomplete rows.

Recompute summaries from requests, using existing nearest-rank percentiles. Seeds use
SEED_BASE=20260601 and FNV tag `variant/level/index`, not soak's seed base. Guard 120000 ms; p95
budgets 2000 ms <=36 cells, 10000 ms <=81, else 30000 ms. Validate legitimate early hides:
>10 misses in first 40 or total 100, or >5 requests over p95 budget; queued/in-flight outcomes
already completed remain in the record. An offered row needs exactly 40 or 100 outcomes.
For offered 40 require indexes 0..39; for offered 100 require 0..99. Any second-round outcome requires
all first 40 with 30-35 hits. Early-stopped second-round indexes need not be contiguous: the existing
scheduler prepends 40..99 and dispatches that round in reverse index order. Validate actual keys/
seeds and the early-stop proof, not an invented ascending prefix.
An engine timeout/error is a recorded miss; an unexpected worker/IPC loss is a failed run.
Never turn a failed run into a hidden verdict.

Keep metadata for each shard and record cumulative shard wall time separately from the wall span
across collection. Preserve original table columns/order and support lists derived from verdicts.
Canonical output is written only after complete validation. No live table path is a default output.

### Anchors at `2c665bb`

| File:line / quote | Use |
|---|---|
| `generator/tests/qualify.js:52-59`, `const FIRST_SEEDS` | Fixed protocol constants |
| `generator/tests/qualify.js:199-222`, `function decide` | Reuse decision semantics |
| `generator/tests/qualify.js:230-247`, `function markdownOf` | Existing table schema |
| `generator/tests/qualify.js:306-365`, `function certain` | Early-stop proof |
| `generator/tests/qualify.js:443-466`, `const summary = Object.assign` | Actual record shape |

## Files to create/modify

- `generator/tests/qualify.js`; new pure `generator/tests/fixtures/qualification-records.js`,
  new `generator/tests/suites/qualification-records.test.js`; `generator/tests.html` lists.
- `generator/tests/manual/difficulty.test.js` only its existing fake-worker qualification tests
  (`:322-452`) for changed loader/metadata contracts, never its hit thresholds.
- Generator design 15.4 and both developer guides. No live qualification data.

## Implementation steps

1. Extract/share pure decision/merge logic without changing live scheduling.
2. Validate protocol, source and manifest before rendering any complete output.
3. Add explicit metadata and merge mode; reject conflicting generation/merge options.
4. Add synthetic record tests, preserving original request/worker failure behavior.
5. Document exact checkpoint/final commands and report schema.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07d-B01 | A partial or mixed matrix can never masquerade as qualification |
| MS07d-B02 | Errors, timeouts and justified early hides are distinguished honestly |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07d-T01 | 135-cell completeness, seeds/jobs/source/tool consistency and summaries validated |
| MS07d-T02 | Missing/duplicate/probe/incomplete outcomes fail without publishing |
| MS07d-T03 | Scheduler/protocol unchanged, deterministic CRLF output, quick sets pass |

## Test plan

Synthetic cases: 36/40 fast offered; 35/40 incomplete expansion rejected; 90/100 fast offered;
89/100 hidden; 11 misses early hidden; sixth slow request early hidden; invalid stopped reason;
duplicate indexes; wrong derived seed; jobs 2 mixed with 4; missing one of 135; byte-unchanged output
on rejected merge. These are unit vectors, not gate evidence.
Generator: `node tests\node-runner.js --suite=qualification-records,help,ui-contract`, then both
quick sets. Also run the existing fake-worker contract selector:

```powershell
node tests\node-runner.js --suite=difficulty --filter="qualification:"
```

GD-fake only, jobs 1/no --jobs, expected 1-15 seconds; no real qualification workers/generation.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
No real GQ or other heavy tool invocation.

## Definition of done & handoff

Give MS07e/MS18c exact merge validation and metadata semantics. No publication/availability claim.
All Execution log fields remain for the orchestrator.

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
