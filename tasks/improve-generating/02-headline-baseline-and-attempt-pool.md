# IG-S02 - Paired headline baseline and S5a attempt pool

| Header | Value |
|---|---|
| Depends on | IG-S01 accepted |
| Developer | claude-sonnet-5.5 |
| Size /active time | Large;90-150 min |
| Machine allocation | 25 min, including eight planned45 s admission periods |
| Owner /milestone | Generation prototype; M1 first paired headline results |
| Authority | IG-S-Q02/Q03/Q06; owner width4 permission |
| Status | Not started |

## Goal and business context

Obtain the earliest real before/after numbers for the six requested Nightmare rows. Isolate S5a:
same serial algorithm/output, independent attempts scheduled on four Node workers and consumed in order.
The report's approximately3x pool gain and the at-most-two-wide local work are hypotheses, not assertions.

## Scope and files

In H: add `attempt-pool.cjs`, the private attempt/merge adapter, pool tests and task manifest/summary support.
Read `digger.js:generateAttempts/createKeeper/qualityOf`, `pipeline.js:executeSteps` and variant hooks.
Out: S1/S2, S3, S4, S5b, new attempts/defaults, browser/UI/history/wire changes and production edits.
No git, broad tests or old difficulty-v3 wrapper. Questions/design gaps go to Astra.

## Fixed implementation contract

1. `native-w1` runs the full unmodified pipeline in one worker, with the exact normalised H3 request.
2. `attempts-w4` gives each worker the original request and an **absolute attempt ordinal**.
   Preserve `model`, `grid#a`, `extra#a`, `dig#a.t` and `search#a` forks. Calling maxAttempts1 with a
   different seed is not an implementation of attempt a.
3. Minimal private adaptation may expose/extract an attempt from the current `generateAttempts`.
   Preserve its current strategy, sample alternation, caps, local continuation and variant hook.
   Rebuilding the same base model from the model fork in each worker is allowed for these six cells;
   verify its hash and report duplicated build cost. Do not add Jigsaw to this experiment.
4. Return enough separate state to reproduce the **current** merge: first-best sample, keeper offers in
   encounter order, local terminal candidate, work and warnings. Do not collapse all of these into a
   worker's final best and assume a generic minimum-score merge is equivalent.
   The offer ledger includes every counted offer, accepted or rejected: distance, count result (including
   unknown), proof-of-uniqueness flag, unsound consequence, candidate/reference digest and encounter ordinal.
5. Consume attempts in native order. Preserve first-strictly-better, sample/keeper precedence, the
   first-sample exception after an exact hook, and the earliest exact stopping boundary.
   Later speculative results never count as delivered hits or leak warnings into the consumed prefix.
6. A fresh per-attempt keeper may do extra uniqueness work. Record that overhead. Any unsafe result,
   changed consumed warning or unexplained merge difference is a correctness stop, not a permissible
   speed trade-off. Use the actual runtime comparator; future target-policy changes cannot be guessed.
   Replay each consumed attempt's ledger with the running serial keeper threshold from earlier attempts.
   Only an offer below that threshold can affect serial best/distance/unsound; extra counts are speculative
   CPU. Apply the same consumed-prefix rule to `puzzle.unsound`, the keeper-exact break and local-entry
   condition. Never OR every worker's final unsound flag into the returned result.
7. On decision, capture host CPU/wall, terminate unneeded work, await cleanup and capture total CPU.
   CPU includes speculation; record actual peak active attempts. For A=2, do not report four busy lanes.
8. Validate the returned puzzle independently with the native verifier. Same-request identity must match
   `native-w1`; timing/startup may differ. Censored pairs remain visible and cannot prove identity or speed.
   Neither arm uses `worker-client`/`gen.worker`'s120 s active-time budget: the native pipeline keeps its
   count guards beneath the180 s research supervisor. Record both ready/cold wall above120 s explicitly;
   this is not proof of an application pass under either the old active-time or proposed wall-time guard.

## Population and exact commands

H3 from the check-list: Nightmare on mega16[1,2,3], mega12[1,2,3], samurai[1,2,42],
classic9[1,2,3], killer[1,2,3], greaterThan[1,2,3]. Eighteen paired requests,36 observations.
Trace off, rotational180, random order, native variant options/default attempts; no override.

| Shard | Paired seeds | Arms /order |
|---|---|---|
| m16-1 | mega16:1 | native-w1 then attempts-w4 |
| m16-2 | mega16:2 | attempts-w4 then native-w1 |
| m16-3 | mega16:3 | native-w1 then attempts-w4 |
| m12 | mega12:1,2,3 | alternate the same AB/BA pattern |
| sam | samurai:1,2,42 | AB/BA/AB |
| c9 | classic9:1,2,3 | AB/BA/AB |
| killer | killer:1,2,3 | AB/BA/AB |
| gt | greaterThan:1,2,3 | AB/BA/AB |

Each pair uses fresh request hosts. If the remaining270 s command window cannot admit a mate, persist
the completed arm and mark the mate unstarted; the existing resume mechanism starts only that mate
under a new wrapper. Do not rerun the pair or quietly lower the request's work.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S02 -Round provisional-r1
```

The helper wraps each of the eight shards with `Invoke-IgNode -Repo sudoku -Task 'IG-S02/<shard>'`.
The 25 min allocation is based on roughly15 min of serial-plus-pooled request work,6 min grace and
4 min setup/validation margin, using the existing80-117 s mega16 and smaller-cell records.

Frozen rerun, same H3 population:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S02 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | All six report rows have paired baseline/pool observations or explicit censoring/unstarted evidence |
| B02 | A pool speed-up never hides extra CPU/speculation or changes the puzzle |
| B03 | Results are provisional; no availability/default/qualification decision is made |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | Native versus consumed pooled result agrees on all promised identity fields for uncensored pairs |
| T02 | Absolute RNG labels, hook work, keeper tie rules and local continuation are preserved |
| T03 | Reversed completion order, earlier exact result, equal-quality offers and late worker replies are tested |
| T04 | Measured active attempts respect min(4,A), and CPU is process-wide once, through cleanup |
| T05 | Every planned key is accounted for; source-stability/firewall checks pass |

## Test plan and records

Synthetic pool tests first, inside the first shard: reorder completions; first exact at attempt1/3;
hook exact plus mandatory first sample; equal sample/keeper score; incomplete proofs cannot win;
consumed versus speculative warning; cancellation, worker error and cleanup. Use a short synthetic
timeout, not a real180 s wait.

Actual engine checks are the36 observations above; no extra unlisted seeds.
Write common records plus per-attempt `consumed`, work, CPU availability, model hash and candidate-source
digests; `summary.json/md` gives paired wall/CPU ratios, n, exact counts, first-exact origin and the
two-attempt occupancy ceiling. Distinguish warm-ready engine comparison from cold-start overhead.

## Definition of done and handoff

Handoff to IG-S03: the unchanged reference path, source identities, all baseline rows and saved returned
puzzles for solver parity. Baselines may be reused only if the active reference harness/runtime fingerprints
remain identical; a shared-driver change goes to Astra for compatibility or a charged refresh decision.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IG-S02 ACCEPT after the Killer audit) |
| Start /end | 2026-11-14 21:55 - 23:40 (+07:00) first pass (wrapped runs 22:27-23:34); 23:57-00:00 Killer re-audit; 00:05 author acceptance; orchestrator commit |
| Developer /model | claude-sonnet-5.5; 168 model calls, 70,484,143 input tokens (69,146,119 cache reads), 411,040 output tokens, about 1,437 AI credits. Author review gpt-6-astra; orchestrator claude-opus-5.5 |
| Files /source identities | New under `phase0/`: `attempt-pool.cjs`, `attempt-worker.cjs`, `adapters/attempt-pool.cjs`, `plans/ig-s02.cjs`, `ig02-run.cjs`, `pool-test.cjs`, `aggregate.cjs`, `killer-audit.cjs`, `ig02-killer-audit.cjs`, `killer-audit-test.cjs`; changed shared `loader.cjs` (strict `replace` transform), `worker.cjs` (job kinds; Killer-only `validate()` branch), `run.cjs` (hooks, `solverMode`, export), `README.md`. Runtime `36b2b832…b50a` unchanged; harness `dd759a22…` for the generation evidence, `c4f3a6e0…` accepted (reporting- and verification-only changes since) |
| Verification /evidence | `docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/` (`summary.md`, reconciled `summary-r2.md`, saved puzzles, `killer/audit-a1/`). Paired native-w1 against attempt-pool-w4, n = 3 per cell: mega16 1.92x (report 1.7-1.8), mega12 3.22x (2.8-3.0), samurai 1.79x (1.7-1.8), classic9 3.22x (2.8-3.0), Greater-Than 2.62x and Killer 2.55x (2.8-3.0, estimate refuted on this cohort); CPU ratio pool/native 0.98-1.58; exact hits identical in both arms; pool slower when the first attempt is exact (0.89-0.91x); 18/18 pairs identity-ok after the Killer audit (6/6 verified, 8 tampered copies rejected); pool checked on 21 synthetic cases and a 1,500-scenario keeper-ledger property test |
| Machine charged /priority wait | 1,399.9 s of the 1,500 s allocation over 11 commands; priority waits 3,000.0 s, not charged |
| Findings /author answers | (1) Killer: the shared verifier compared `model.units` to the base model and rejected every Killer puzzle (cage units); author ruling (A): a Killer-only rule (cage partition, connectivity, `distinct`, sums; full wire against `SG.killer.modelFromCages`) and a re-audit of the six saved puzzles without regeneration, hash-linked sidecar, originals preserved. (2) A real pool bug (decision stamped at the wrong arrival) was found by the c9 shard, fixed, with a regression check; failed attempts a1/a2 preserved. (3) Order: c9 first as a plumbing check; per-attempt rows nested in the request record; one unmeasured catalogue-probe worker per command |
| Orchestrator review /acceptance | Only harness and evidence folders added; no production, test, golden or difficulty-v3 file changed; formats checked |
| Handoff | IG-S03: accepted foundation `c4f3a6e0…`; reuse of the `dd759a22…` generation baselines approved; use `summary-r2` with the Killer audit overlay; report serial S3, incremental S3 over the pool and the combined speed-up separately; keep CPU/speculation costs and early-exact regressions; n = 3 tails are descriptive; any further reference-generation or timing change needs review before baseline reuse |
