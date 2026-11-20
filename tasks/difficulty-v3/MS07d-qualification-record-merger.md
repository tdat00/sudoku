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
also retains the effective size-default attempts for each board and the attempt-policy source identity;
neither worker nor merger inserts an explicit eight-attempt override. The merge
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

### Anchors at c9935cd

| File:line / quote | Use |
|---|---|
| `generator/tests/qualify.js:58-64`, `FIRST_SEEDS`, `GUARD_MS` | Fixed protocol constants |
| `generator/tests/qualify.js:143,186`, `child`, `hitOf` | Strict producer flag and no explicit attempt override already implemented |
| `generator/tests/qualify.js:223`, `decide` | Reuse decision semantics |
| `generator/tests/qualify.js:250`, `markdownOf` | Existing table schema |
| `generator/tests/qualify.js:320`, `certain` | Early-stop proof |
| `generator/tests/qualify.js`, `const summary = Object.assign(header, ...)` | Actual record shape; add metadata without changing scheduler |

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

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or changing a recorded decision stops;
performance/availability becomes a named numerical item for MS07e then MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, with the current bounded quick
manifest. No new slow-cell evidence class/tooling task; the assigned merger itself remains in scope.
Own `qualification-records` and any added suite's r6c CI group/manifest entry.
Return the inherited/new item list, metadata/default contract and coverage/CI handoff.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (orchestrator review; SA2 rulings on the developer's design choices; one fix round for pair-atomic output) |
| Start | 2026-11-15 08:40 (+07:00) |
| End | 2026-11-15 09:53 developer first pass; 09:55-10:05 SA2 rulings; 10:07-10:27 fix round (pair-atomic merge output); orchestrator re-check and commit |
| Duration | 1 h 13 min developer + 20 min fix round; about 10 min SA2 rulings |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 rulings); claude-opus-5.5 (orchestrator) |
| Token usage | 204 model calls; 92,358,227 input tokens (90,949,988 cache reads); 384,438 output tokens |
| AI credits | about 1,646 (developer) |
| Verification | Developer: new pure helper `generator/tests/fixtures/qualification-records.js` (protocol constants, seeds, budgets, nearest-rank percentiles, hit, decision, table, merge validation) shared by `qualify.js`'s scheduler and the new `--merge=DIR --jobs=4 [--json] [--markdown] [--quiet]` mode (no generation; refuses `--variant/--level/--probe/--no-early-stop/--child` with exit 2; no default output; refuses outputs inside the shard folder, a file named twice and the live table; CRLF via `.partial` and rename, now pair-atomic with rollback). New shard metadata `qualifierHash`, `acceptance:'canonical-required-tier'`, `ratingVersion` (2, development), `probe`, `earlyStop`, `guardMs`, `attemptPolicy` (8/4/2, `explicitMaxAttempts:false`, SHA-256 of `digger.js`/`pipeline.js`/`registry.js`), per-cell `attempts` (the configured maximum); merged `shardSeconds` apart from `wallSpanSeconds`. Suite `qualification-records` 46 tests: every test-plan vector (36/40 and 90/100 offered; 35/40 without round 2 rejected; 89/100 hidden; 11-miss and sixth-slow early hides accepted, their 10/5 neighbours rejected; invalid stop, duplicate index, wrong seed, jobs 2 with 4, 1 of 135 missing rejected; rejected merge and failed second rename leave outputs byte-unchanged, no `.partial`); 45 real-`parent` runs on random-order fake workers; five spawned-process exits; six mutations detected. Scheduler body unchanged. Final tree: Generator quick 3,505/3,505 (about 679.4 s), Player 1,750/1,750, fake-worker selector 6/6, CI check 3,505 of 3,505. Orchestrator: locked focused re-runs 141/141 and 6/6 (first pass), 226/226 after the fix round; CI check passes |
| Acceptance | MS07d-B01, B02, T01, T02, T03 met. Evidence `docs/difficulty-v3/evidence/MS07d/evidence.md` (round 1 kept under `superseded-round1/`) |
| Issues & resolutions | SA2 rulings on the developer's own choices: (1) `commit`/`dirty` are per-shard provenance, never compared; identity = source and tool hashes plus protocol/configuration and machine; hashed inputs stay frozen during collection: accepted. (2) Overlapping shards rejected: accepted (matches MS07e's serial lock protocol; parallel workers inside a shard stay valid). (3) S-AV27 routing accepted, with a timing-comparability caveat for MS18d/MS18e; no scheduler fix authorised in MS07d/MS07e; a separately authorised fix would change `qualifierHash`, so pre- and post-fix shards cannot mix. (4) `stats` unavailable, reported as unavailable, not zero. SA2 finding: the merge output write was not pair-atomic (`qualify.js:555`); fixed with byte copies and rollback, two new tests and mutation M6. MS07e amended by the orchestrator with SA2's text (GQ time projection with 60 serial second-round request times, launch only at a credible <=450 s; `stats` unavailable; `attempts` is the configured maximum) |
| Handoff | MS07e: merge command and validation rules as in design 15.4 and `evidence.md`; collect shards serially under `Invoke-Dv3Node` with frozen hashed inputs; project each possibly expanding cell with S-AV27's one-worker second round; report missing `stats` as unavailable. Items: S-AV27 new; S-AV08 679.4 s; S-AV01-S-AV07, S-AV18-S-AV26 carried unchanged (no generation ran); MS07c's handoffs stand (manual `difficulty` suite edited, only the fake-worker selector run; S-AV25 expected failure; Master, Greater-Than Nightmare CV6 margin and large boards unmeasured at C = 4) |
