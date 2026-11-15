# Phase-0 harness (H) for the improve-generating prototypes

**Everything this harness writes is provisional (pre-freeze).** It is test-side tooling: it never changes
`generator/js`, `core/`, `player/`, an existing test, a golden or a difficulty-v3 document, and no output enables a
cell, selects an allowance, changes a default or passes a gate. Formal IG-S-Q05 decisions need a rerun on the frozen
catalogue (`-Round frozen-gate`, with a freeze receipt and a budget receipt).

| File | Role |
|---|---|
| `Invoke-IgTask.ps1` | Dispatcher: the one command of a task. Sources the supplied wrapper (`-LockHelper`), calls `Invoke-IgNode` once per shard, keeps the budget ledger. Owns no lock. |
| `run.cjs` | One shard in one admitted command (`--plan-only` loads no engine). |
| `host.cjs` | Responsive request host: worker threads, guards, CPU read once at the host. |
| `worker.cjs` | One private engine instance per worker (request or independent verifier). |
| `loader.cjs` | `SOURCE_FILES` reader, fingerprints, private transforms, production firewall. |
| `manifest.cjs` | Logical jobs, expected keys, pair order, physical packing, budget arithmetic. |
| `records.cjs` | Record schema, journal, evidence folders, resume rules, digests, analysis, summary, gate. |
| `common.cjs` | Constants, canonical JSON, CRLF writers, authorised-path rule. |
| `self-test.cjs` | Synthetic self-test (IG-S01). |
| `attempt-pool.cjs` | IG-S02: the serial merge (keeper replay), the pool executor (min(4, A) workers) and the native/pooled identity report. |
| `attempt-worker.cjs` | IG-S02: one absolute attempt on a worker's private engine; captures the attempt's separate state. |
| `adapters/attempt-pool.cjs` | IG-S02: the five in-memory transforms of `digger.js` that expose one attempt and its keeper ledger. |
| `plans/ig-s02.cjs` | IG-S02: the eight shards, 18 pairs, 36 keys of the headline population H3. |
| `ig02-run.cjs` | IG-S02 glue for `run.cjs`: catalogue probe, synthetic tests, pool executor, record additions, summaries. |
| `pool-test.cjs` | IG-S02 synthetic tests (merge, pool on fake and real workers, identity, plan, transforms). |
| `aggregate.cjs` | IG-S02 task summary across the shards (JSON and markdown from evidence only; no engine); `--audit=` reconciles an audit sidecar. |
| `killer-audit.cjs` | IG-S02 re-audit: the Killer-only structure rule (data checks plus the complete rebuilt model wire), used by `worker.cjs` `validate()`. |
| `ig02-killer-audit.cjs` | IG-S02 re-audit: the one wrapped command that verifies the saved Killer puzzles again and writes the hash-linked sidecar. |
| `killer-audit-test.cjs` | IG-S02 re-audit tests (rule, malformed cages and units, reconciliation links, an offline dry run); no engine. |
| `scoped-solver.cjs` | IG-S03: the runtime of the S3 prototype (scoped negative scans of singles and subsets, replayed budget checks, counters, deliberate test mutations). |
| `adapters/scoped-solver.cjs` | IG-S03: the ten in-memory transforms that hook the runtime into `logical-solver.js`, `tech-basic.js`, `tech-subset.js` and `pipeline.js`. |
| `adapters/scoped-audit.cjs` | IG-S03: audit-only annotations of the native check sites (no behaviour change); never loaded in a timing instance. |
| `scoped-audit.cjs` | IG-S03: the check-site observer (token hash, bounded windows, checkpoints), the budget forms, ordinal selection and the audit comparisons. |
| `scoped-audit-worker.cjs` | IG-S03: one engine instance in the role plain / ref / scoped (ops: configure, phase1, phase2, synthetic). |
| `scoped-audit-host.cjs` | IG-S03: the three-instance session, the audit of one saved puzzle, the synthetic scenarios and the mutation tests. |
| `plans/ig-s03.cjs` | IG-S03: the eleven shards (two audit, six pooled, three serial), with the hash of every saved puzzle and synthetic state. |
| `ig03-run.cjs` | IG-S03 glue for `run.cjs`: executors, record additions, identity against IG-S02's baselines, shard summary. |
| `ig03-aggregate.cjs` | IG-S03 task summary across the shards: `parity.json`, `check-sequences.json`, `coverage.json`, `summary.json/md`. |
| `scoped-test.cjs` | IG-S03 focused tests that need no engine (the runtime against a native-style reference on a fake of the engine pieces; deliberate mutations; plan; transforms). |
| `frontier.cjs` | IG-S04: the S1/S2 frontier prototype (the six variants F0/F1/FC/FM/FU/FS, phase A ladder, phase B, deepen, fallback), the native comparison sample, the post-timing S2 audit and the list of interpretations. |
| `frontier-runtime.cjs` | IG-S04: the engine-side runtime of the hooks (counters per purpose, enforced count limits, the S2 early exit, the native helpers exposed by the digger transform). |
| `sample-budget.cjs` | IG-S04: the count vector of one sample, the pilot ceilings, the budget stop and the fixed fitting rule of `budgets.json`. |
| `adapters/frontier-hooks.cjs` | IG-S04: the five in-memory transforms of `logical-solver.js`, `dfs-solver.js` and `digger.js` (reference solver only; observers and sentinel errors, no behaviour change). |
| `ig04-worker.cjs` | IG-S04 worker side (every job kind `ig04-*`, one line in `worker.cjs`): the grid trial, the S2 audit, the parity run, the synthetic engine tests. |
| `plans/ig-s04.cjs` | IG-S04: the six shards and the 64 preregistered keys with their rotation and admission estimates. |
| `ig04-run.cjs` | IG-S04 glue for `run.cjs`: prepare (catalogue probe, synthetic tests, parity), the trial executor, record additions, identity, summary and the stage reprojection. |
| `ig04-aggregate.cjs` | IG-S04 task documents from evidence only: `variant-manifest.json`, `pilot-reprojection.json`, `budgets.json`, `s2-audit.json`, `summary.json/md`; with `--suffix=-r2` the revision files (reusing a frozen `budgets-r2.json`, with the branch review of the corrections). |
| `frontier-test.cjs` | IG-S04 tests: pure cases on a scripted fake engine (`--only=pure`, no engine) and the engine cases of the first command. |
| `ig04-retest.cjs` | IG-S04 revision r2: reruns the pure cases and the real-engine cases of `frontier-test.cjs` after a correction (one wrapped command, no trial, nothing timed) and writes `engine-retest-r2.json`. |
| `screen.cjs` | IG-S05: the two-sample grid trial of the SM2 screen (native loop of one kind, the frontier loop, the stop rules, the trial status) and the post-timing canonical classifier of the final phase A parent. |
| `ig05-worker.cjs` | IG-S05 worker side (every job kind `ig05-`, one line in `worker.cjs`): the grid trial, the parent classification, the synthetic engine tests. |
| `plans/ig-s05.cjs` | IG-S05: the single shard `screen`, the 32 logical blocks and 256 grid-mode trials, the frozen IG-S04 budget vectors (hash checked) and the pilot-based admission estimates. |
| `ig05-run.cjs` | IG-S05 glue for `run.cjs`: pre-registration checks, the trial executor with the per-sample guard, the parent classification, record additions, identity and the shard summary. |
| `ig05-stats.cjs` | IG-S05 analysis (pure functions): verified-hit rates per CPU and wall second, paired whole-cluster bootstrap, coverage, funnel, parent classes, the diagnostic selection and its stability. |
| `ig05-aggregate.cjs` | IG-S05 documents from evidence only: `screen-manifest.json` (before any run) and `rates.json`, `paired-intervals.json`, `selection.json`, `summary.json/md`. |
| `ig05-test.cjs` | IG-S05 tests: pure cases on synthetic records, a scripted fake engine and fake workers (`--only=pure`, no engine) and the engine cases of the first command. |
| `ig05-dev-check.cjs` | IG-S05: one wrapped development check (synthetic engine tests and the complete per-job flow on a few real jobs) written beside the shard evidence; its trials are not part of the screen. |
| `profile-runtime.cjs` | IG-S07: the wall-clock span profiler of one native request (exclusive accounting by segments into the matrices context x purpose x primitive and context x purpose x finder; install and restore of the engine-entry wrappers; the consistency check; the calibration of the instrumentation cost). |
| `adapters/profile.cjs` | IG-S07: the 27 in-memory transforms (version 2; r1 ran version 1 with 26) of `logical-solver.js`, `techniques.js`, `dfs-solver.js` and `digger.js` that call the profile runtime (observation only; the native code when `SG.__igProf` is absent). |
| `plans/ig-s07.cjs` | IG-S07: the nine shards, twelve requests and the IG-S02 comparator files; the revision r2 adds the request-free shard `lc`. |
| `ig07-worker.cjs` | IG-S07 worker side (every job kind `ig07-`, one line in `worker.cjs`): the profiled native request, the engine checks of the first command, the calibration, the loop-check comparison of the revision r2 (`ig07-loopcheck`). |
| `ig07-run.cjs` | IG-S07 glue for `run.cjs`: probe, reference compatibility, calibration and engine checks (`prepare`; for the shard `lc` only the loop-check comparison), the profiled request (`execute`), record additions, identity against the comparator, shard summary. |
| `ig07-aggregate.cjs` | IG-S07 documents from evidence only: `stage-profile.json`, `finder-profile.json`, `overhead.json`, `frontier-phase-a.json`, `summary.json/md`; a revision writes `-r2` files (`--suffix=-r2 --revision=<text> [--write=stage,finder]`). |
| `ig07-test.cjs` | IG-S07 tests: pure cases (fake clock, transforms on the real sources, the patched solver on a fake of the engine pieces, plan, glue, aggregator; `node ig07-test.cjs`, no engine), the engine checks of the first command and the loop-check comparison of the revision r2. |
| `jigsaw-profile.cjs` | IG-S08: the stage beacon of the bounded SM3 attribution (counters and exclusive wall time per context x sub in a SharedArrayBuffer, durable stage markers, install and restore of the engine-entry wrappers) and the pure readers: snapshot, attribution, journal parse and reconcile. |
| `adapters/jigsaw-profile.cjs` | IG-S08: the 32 in-memory transforms of `jigsaw.js`, `full-grid.js`, `dfs-solver.js`, `logical-solver.js` and `digger.js` that call the beacon (observation only; the native code when `SG.__igJig` is absent). |
| `plans/ig-s08.cjs` | IG-S08: the two shards (`control` seed 1100, `tail` seed 1111) and three requests. |
| `ig08-worker.cjs` | IG-S08 worker side (every job kind `ig08-`, one line in `worker.cjs`): the observed request, the engine checks, the calibration and the synthetic busy worker of the journal recovery test. |
| `ig08-run.cjs` | IG-S08 glue for `run.cjs` (`attemptDir` is passed to `prepare` and `execute`): the host-side recorder that journals stage markers and heartbeats of a worker (`stage-journal.jsonl`), probe, calibration, engine checks and the synthetic recovery test (`prepare`), the observed request (`execute`), the record additions reconciled from the journal alone, identity against the native control and the shard summary. |
| `ig08-aggregate.cjs` | IG-S08 documents from evidence only: `tail-attribution.json`, `summary.json/md` (`--suffix=-r2 --revision=<text>` for a revision). |
| `ig08-test.cjs` | IG-S08 tests: pure cases (beacon on a fake clock, transforms on the real sources, the patched layout and stage runner on a fake of the engine pieces, the recorder on fake workers, plan, glue, aggregator; `node ig08-test.cjs`, no engine, no thread) and the engine checks of the first command. |
| `greater-than-diagnostic.cjs` | IG-S09: the capture runtime published as `SG.__igGt` for one request (setup reveals with their origin, sign passes, removals, samples, the internal count guard, physical countSolutions calls / search-loop budget checks / restricted solves), the arm G1 oracle (`solveFirst`, which stops on a solver failure instead of retrying), and the pure analysis: the named-trap predicate, the disjoint miss split, minimality judgement, the setup-probe rule, validation reuse digests and the G0/G1 comparison with `guard-binding-difference`. |
| `adapters/gt-diagnostic.cjs` | IG-S09: the 23 in-memory transforms of `greater-than.js`, `digger.js` and `dfs-solver.js` that call the capture runtime (observation only; the native code when `SG.__igGt` is absent) and carry the G1 order of the oracle. |
| `plans/ig-s09.cjs` | IG-S09: the ten shards (four Normal, five Nightmare, `observer-control`), 30 paired requests and two observer-free controls. |
| `ig09-worker.cjs` | IG-S09 worker side (every job kind `ig09-`, one line in `worker.cjs`): the captured request of either arm (`ig09-g0-request`, `ig09-g1-request`) and the post-timing diagnosis on an unpatched instance (`ig09-diagnose`: independent rating, uniqueness and minimality of the cheap-clause samples, the setup probes). |
| `ig09-run.cjs` | IG-S09 glue for `run.cjs`: the captured request (`execute`), the diagnosis host call with its own 30 s budget and the exact-input validation reuse, the capture consistency check, the record additions, identity of G0 against G1 and of the observer-free controls against the captured G0, the shard summary. |
| `ig09-aggregate.cjs` | IG-S09 documents from evidence only: `samples.json`, `sign-passes.json`, `setup-probes.json`, `miss-split.json`, `order-parity.json`, `summary.json/md` (`--suffix=-r2 --revision=<text>` for a revision). |
| `ig09-dev-check.cjs` | IG-S09: one wrapped development check (the whole per-job flow on the real engine for Normal seed 300: G0, G1 and the observer-free control) written beside the task evidence with its own `command.json` (the charge). |
| `ig09-test.cjs` | IG-S09 tests: pure cases (the patched `greater-than.js` on a fake of the engine pieces, the oracle cases, the classification, the diagnosis on a fake instance, reuse, probes, plan, transforms, glue, aggregator; `node ig09-test.cjs`, no engine, no thread). |
| `plans/ig-s10.cjs` | IG-S10: the one analysis shard `reconcile` (kind `analysis`, one logical job, 180 s admission estimate: 225 s of the 240 s allocation with the grace). |
| `ig10-run.cjs` | IG-S10 glue for `run.cjs` (`runAnalysis`, no engine and no worker): the synthetic tests, `buildAll` (every round-level document in memory), the write-once outputs and the frozen closure; `--dry-run` builds everything in memory; `--write-r2` writes the r2 revision (unwrapped, read-only). |
| `reconcile.cjs` | IG-S10: the accepted evidence read back (hashes, parsed summaries), the coverage reconciliation (classification, duplicate / silent-exclusion / identity rules, the Killer audit overlay, auxiliary commands, excluded observations) and the machine accounting of the whole round. |
| `reconcile-report.cjs` | IG-S10: the headline cohort recomputed from the raw records (per-seed rows, cohort summaries, paired seed-cluster intervals, on-time lower bounds), the SM2, SM1, SM3 and Greater-Than sections, the cross-checks against the accepted summaries, the decisions for the author. |
| `reconcile-build.cjs` | IG-S10: the thirteen-row estimate table (no numeric verdict threshold: descriptive differences, the IG-S02 S5a rule, partial S3 "no material net gain demonstrated"), the provenance block (measurement, report-writer and corrected-harness fingerprints apart) and the machine block. |
| `reconcile-render.cjs` | IG-S10: the report markdown, rendered from the report JSON alone. |
| `frozen-plan.cjs` | IG-S10: the frozen-rerun plan: the one-command frozen rerun of every task, populations, 40-seed expansions, adapter dry runs on the current source, planning-scenario costs (formula, proxy, grace, per-phase command counts, unknown and censored bounds; none a guaranteed upper bound), IG-S06 and the four unapproved Nightmare extensions, the approvals needed. |
| `gate.cjs` | IG-S10: the frozen-gate evaluator (pure): receipts, limits, 40-cluster coverage, distinct grid and request seed populations, paired bootstrap, non-inferiority, the on-time exact lower bound, request level (a claimed-exact request that failed verification is invalid evidence); it publishes inputs and never a go or a no-go. |
| `ig10-test.cjs` | IG-S10 tests: 14 synthetic gate cases on 40-cluster fixtures and 19 reconciliation cases (rules on synthetic inputs; the accepted evidence reconciled; accounting invariants before and after the command; verdict scope; projection packing; populations; formats; the r2 bundle; no engine); `node ig10-test.cjs`, no engine, no thread. |

## Commands

Run from the repository root; the repository is derived from the script location. Every command that can exceed
10 s goes through the supplied low-priority wrapper; the dispatcher does this itself.

```powershell
# IG-S01 (two wrapper commands, 45 s admission grace charged to each)
$helper = Join-Path $env:USERPROFILE '.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
. $helper
Invoke-IgNode -Repo sudoku -Task 'IG-S01/self-test' -NodeArgs @(
  'generator\tests\artifacts\improve-generating\phase0\self-test.cjs', '--task=IG-S01', '--round=provisional-r1')
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S01 -Round provisional-r1

# any later task (replace the id): the same single command
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S02 -Round provisional-r1

# plan without an engine (source identity, shards, keys, packing, projected cost, budget); nothing is written
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S02 -Round provisional-r1 -PlanOnly

# resume only never-started keys of a paused command (never retries a started row)
& '.\...\Invoke-IgTask.ps1' -Task IG-S02 -Round provisional-r1 -ResumeUnstarted <path to command.json>

# frozen rerun, after approval
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S01 -Round frozen-gate `
  -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' `
  -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

Other dispatcher parameters: `-LockHelper <path>` (default beneath `$env:USERPROFILE`; it never changes the quiet
period or the 300 s limit), `-Attempt aN` (a new attempt id after a failed one), `-RuntimeLabel <text>` (supplied
provenance label), `-Shard <name[]>`.

The dispatcher also runs the synthetic `self-test` shard when it is not yet recorded for the round, so the frozen
command is one command. A shard with recorded evidence is never rerun.

Development only: `node self-test.cjs --task=IG-S01 --round=provisional-r1 --only=pure` runs the pure cases (no
worker, no engine, no timing, no evidence). The full self-test refuses to run unless the wrapper holds the lock.

Exit codes of `run.cjs`: 0 = recorded observations passed the correctness checks (a productive pause included, with
`command.status = paused-unstarted` and explicit `unstartedKeys`); 1 = incorrect output, parity, identity, source or
firewall problem; 2 = unsupported source or plan (stop for the author). The dispatcher exits 0 for a complete run or a
productive pause, 1 for a stop, 2 for unsupported.

## Evidence

`docs/improve-generating/evidence/phase0/<round>/<task>/<shard>/` (attempt `a1`; a later attempt is the sub-folder
`aN/`). Files are written once: `command.json`, `records.json`, `source-manifest.json`, `firewall-before.json`,
`firewall-after.json`, `summary.json`, `summary.md`, plus `manifest.json` (written before any generation) and
`journal.jsonl` (start/finish journal, flushed per line). Partial files are `.partial` siblings, renamed atomically.
An existing attempt id fails closed. The budget ledger is `<round>/ledger.json` (dispatcher entries; the orchestrator
may add `approvals`: `{ task | "round", extraMs, by }`); direct wrapper launches are charged from their `command.json`
(occupied time plus 45 s grace). Priority wait is never charged; a hard wrapper timeout charges 300 s plus grace.

## Records

- `command.json`: schema `ig-s-phase0/1`, task, shard, round, attemptId, status, `evidenceStatus`
  (`provisional (pre-freeze)` or `frozen-confirmatory`), runtime label (supplied), runtime fingerprint and files
  (ordered SHA-256 of the unmodified bytes of `SOURCE_FILES`), `sourceStable`, harness fingerprint, adapter ids and
  hashes, `catalogueSnapshot` (discovered from the loaded source), node/platform/CPU, `manifestHash`, `pairOrder`,
  `plannedKeys`/`completedKeys`/`censoredKeys`/`errorKeys`/`startedUnfinishedKeys`/`unstartedKeys`,
  `logicalBlockKeys`, `physicalPlanHash`, `lock` (wrapper path, expected owner, the lock file as observed read-only),
  `timing` (requested/admitted/ended, occupied, charged grace, priority wait), `exit`, `gate`, `cpu` (API, probed
  quantum), firewall result, resume reference, pause reason, `budgetLedgerReference`.
- Request record: `key, parentKey, recordKind, pairId, gridCluster, requestSeed, attempt, sample, variantId, level,
  mode, normalisedConfig, solverMode, poolWidth, sampleMode, parentMode, floorIds, tierIds, limits, limitOrigin,
  serialOrdinal, consumed, speculative, origin, outcome, timeoutScope, generation{...}, validation{...}, claimedExact,
  verifiedExact, required, vacuous, shallow, achieved, score, puzzleHash, attemptsUsed, samplesUsed, canonicalRatings,
  localProposals, localCapReasons, counts{...}, firstExactOrigin, firstExactOrdinal, checkpointHashes, warnings,
  error`. **Unknown is `null`, never zero.** Outcomes: `complete`, `sample-budget`, `request-timeout`,
  `validation-unknown`, `error`, `unstarted`; a timeout is never a hit and `timeoutScope` is `sample`, `request` or
  `command`. Extra fields: `arm`, `puzzleVariant`, `digests` (per-section SHA-256 of the normalised result: variant
  structure, givens, solution, canonical rating, config, warnings, dig log, work), `adapterProof`, `transforms`.
- `generation`: `readyWallMs` (engine-ready to decision), `coldWallMs` (request start to decision), `occupiedWallMs`
  (to the end of cleanup), `cpuToDecisionMs`, `cpuTotalMs` (to the end of cleanup, speculative work included),
  `cpuReadyTotalMs`, `startupMs`, `startupCpuMs`, `cleanupMs`, `readyOccupiedWallMs`, `gridBuildWallMs`/`CpuMs`
  (null outside an SM2 grid trial), `cpuApi`, `cpuResolutionStatus`. Validation (`wallMs`, `cpuMs`, ...) is a separate
  unpatched engine instance after the timed interval and is never part of a generation time.

## Rules the harness enforces

- **Loader.** `SOURCE_FILES` is parsed (never the runner executed); a missing, escaping, duplicated or malformed entry
  fails closed. The bytes are hashed, executed from the same read, and every worker checks them against the host's
  fingerprint. Sources are hashed before and after each command; a change invalidates the comparison. The scripts run
  in the global of a worker thread (a private VM per instance); the whole listed set is loaded, as the test runner does.
- **Transforms.** In-memory only: a unique function-header anchor, one declaration of that function, a line-start
  position and a patched text that still compiles; before/after hashes are recorded; no source file is rewritten.
  The built-in `noop-expose` adapter publishes `pipeline.normalizeConfig` as `SG.__igHooks.normalizeConfig` and must
  not change any output. Later tasks add `adapters/<id>.cjs` and `plans/<task>.cjs`, loaded lazily.
- **Firewall.** SHA-256 inventory before and after every command of everything outside the harness and evidence
  folders (size and mtime only for `docs/` besides `docs/improve-generating`). A difference stops the run.
- **No git.** Labels are supplied provenance; content fingerprints are the identity.
- **CPU.** `process.cpuUsage()` is read once at the host (worker threads are included already), never summed over
  workers. The observable quantum is probed at start; an interval below it is `unresolved`, and a rate or factor from
  an unresolved denominator is `null`, never infinity. Per-thread attribution is not implemented.
- **Guards.** Command 270 s, request 180 s, sample 45 s, Jigsaw diagnostic 240 s, below the wrapper's 300 s backstop.
  The host deadline is counted from the start of the process (the origin of the wrapper's backstop), is also bounded
  by the remaining task/round budget less the 45 s grace, and keeps an 8 s finalize reserve. An interrupted worker
  sends no result: the host records the timeout with its CPU and terminates it. A decision that arrives after the
  deadline is rejected as a timeout (`lateDecision`), never recorded as a result. A worker that does not terminate
  within 5 s is kept in the host (never forgotten), no further work starts and the command stops with status `error`
  and error code `terminate-timeout`. Short guards exist only in a test-only host and never in a manifest.
- **Lock.** `run.cjs` and the full self-test refuse to start unless the wrapper's lock file was read and names exactly
  their task: a missing or unreadable lock file fails the guard.
- **Rates.** Hits per CPU second and per cold wall second divide by all spent generation work of the started requests:
  completed, censored, error and validation-unknown, reported by category (`spent`) beside the rates. A started row with
  unknown spend makes the rate unknown (null), never a smaller denominator.
- **Resume.** Only keys proved never started, under identical manifest, runtime and harness fingerprints; a started
  row (finished, timed out or crashed) and the children of a started parent are never resumed. A resumed attempt
  records `resumeOf`; the attempts linked that way are one run chain, and only the keys of that chain count as started
  (an unrelated older attempt is a different run). A paused attempt is resumed once. The shard state is that of the
  latest chain. `command.chain` proves that nothing was started twice (`noRerun`, `rerunKeys`).
- **Parity.** A pair whose mate has not run yet is deferred, not failed, and is compared when the mate appears in a
  later attempt of the chain; the comparison runs over the merged records of the whole chain. A started arm that did
  not complete, or any difference, still fails.
- **Gate.** `provisional-r1` is always `not-evaluable-pre-freeze`. A frozen flag alone enables nothing. Before any frozen
  generation, `run.cjs` and the dispatcher check that a freeze receipt (`ig-s-freeze/1`) and a budget receipt
  (`ig-s-budget/1`, with the `runtimeFingerprint` it authorises) are both present, valid and name the loaded runtime;
  `run.cjs` also refuses the first job if the loaded catalogue is not the one the freeze receipt names. Even then the
  rate-to-request-fraction projection stays `projection-awaits-author-review`.

## IG-S01 populations

Shard `self-test` (synthetic) and shard `loader-parity`: `classic4/veryEasy/seed1` and `classic9/hard/seed1`, native
defaults, trace off, native versus the no-op-patched loader, reference first on the even seed-list index and prototype
first on the odd one. These are correctness controls, not timing observations.

## IG-S02: paired headline baseline and the S5a attempt pool

Population H3, eighteen paired Nightmare requests (36 observations), trace off, rotational180, random order, the
native variant options and default attempts (no override): mega16[1,2,3], mega12[1,2,3], samurai[1,2,42],
classic9[1,2,3], killer[1,2,3], greaterThan[1,2,3], as the eight shards `m16-1`, `m16-2`, `m16-3`, `m12`, `sam`, `c9`,
`killer`, `gt`. The arm order alternates by the seed index inside a cell (native-w1 first, attempts-w4 first, native-w1
first). In records and summaries native-w1 is the arm `reference` and attempts-w4 the arm `prototype`.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S02 -Round provisional-r1
# one cell only (the dispatcher skips shards that are already recorded): -Shard c9
# the task summary across the shards (reads evidence only, no engine, writes <round>/IG-S02/summary.json/md once):
node generator\tests\artifacts\improve-generating\phase0\aggregate.cjs --task=IG-S02 --round=provisional-r1
# development only, no engine, no timing (fake workers, no thread): the pure pool cases
node generator\tests\artifacts\improve-generating\phase0\pool-test.cjs --only=pure
```

- **native-w1** is the unchanged `Host.runRequest` path: the full unmodified pipeline in one worker on the unpatched
  engine, with the exact H3 request.
- **attempts-w4** starts `min(4, A)` workers, each a private engine instance patched in memory by the adapter
  `attempt-pool` (five transforms of `digger.js`, hashes in `command.json`). A worker runs the native `SG.pipeline.run` of
  the same request for one absolute attempt ordinal `a`: the loop of `generateAttempts` runs from `a` to `a`, so the forks
  `grid#a`, `extra#a`, `dig#a.t` and `search#a`, the caps, the sample alternation, the variant hook and the local
  continuation are the native code. Instead of the end-of-attempt merge it returns the first-best sample, the local search
  state, the attempt's own keeper (with a ledger of every offer it counted: distance, count including unknown,
  proof-of-uniqueness flag, candidate digest, encounter ordinal) and its work. The host performs the native merge in
  attempt order (`SerialMerge`): it replays each ledger against the running serial keeper threshold, so counts above the
  threshold are speculative CPU and change nothing, `unsound` and the keeper-exact break follow the consumed prefix only,
  and the first strictly better candidate wins; the earliest exact boundary decides. A replay that the worker's own state
  cannot explain, or an attempt consumed out of order, is a correctness stop (`merge-unexplained`), never a speed trade-off.
- **Accounting.** One host: wall and `process.cpuUsage()` are read at the decision, the speculative workers are
  terminated, the cleanup is awaited and the total is read once (workers included). `generation.readyWallMs` starts at
  the first worker ready; `pool` has the width, the peak of active attempts (checked against `min(4, A)`), the mean busy
  lanes, started / consumed / speculative attempts, the first-exact origin and attempt, the duplicated model build and one
  row per attempt (`recordKind: 'attempt'`, `consumed`, `speculative`, `origin`, work, base-model hash, candidate digests;
  per-attempt CPU is unavailable: only the host reading exists). Per-attempt rows live inside the request record, so the
  planned keys stay the 36 requests.
- **Catalogue probe.** Each command first starts one unmeasured worker to discover the catalogue and the default attempts
  (the pool needs A to size itself), so neither arm carries that discovery. Neither arm uses the 120 s application guard;
  both use the 180 s research guard, and a wall above 120 s is recorded (`above120s`), not a verdict.
- **Synthetic pool tests** (`pool-test.cjs`, 21 cases: 17 pure, 4 on real threads): merge equals the one-keeper serial loop on 1500 random scenarios,
  precedence and ties, an exact hook with the mandatory first sample, incomplete proofs and unknown counts, speculative
  versus consumed warnings, reversed completions, an earlier exact result, late replies, worker errors, termination and
  cleanup, a timeout, the two-attempt ceiling, identity, the plan and the transforms. The pure cases need no worker; the
  thread cases (short test-only timers) run with the first shard that is executed in the round, under the wrapper, unless
  an earlier command of the task already recorded them all passed.
- **Saved puzzles.** Each request's returned puzzle is written once to `puzzles/<arm>__<cell>-<seed>.json` beside its
  shard's records (compact JSON: the wire plus the hashes), for the solver parity of IG-S03.
- **Killer audit (resolved by the re-audit below).** The first audit of a variant with a `postGenerate` hook compared the
  `units` of the returned model with those of the base model rebuilt from the seed. Killer appends one partial
  all-different unit per cage of two or more cells (`unitMeta.kind: 'cage'`), so every Killer puzzle was rejected with
  "structure: the model differs from the variant rebuilt from the seed", native-w1 included (shard `killer`, attempt a1:
  six `validation-failed` records; their generation times and digests are real, the three pairs have equal digests in every
  section). The verifier now has a Killer-only structure rule and the six saved puzzles were audited again, without
  regeneration, by the sidecar `killer/audit-a1/` (see "Killer re-audit").

### Killer re-audit (author-approved)

`worker.cjs` `validate()` has one Killer-only branch (`cfg.variantId === 'killer'`, rule in `killer-audit.cjs`); every other
variant keeps its structure check byte for byte. The rule: the cages partition all 81 cells exactly once, each non-empty,
orthogonally connected, `distinct: true`, with an integer sum equal to the sum of its distinct saved solution digits; then the
model is rebuilt from the saved cages, in the saved order, with `SG.killer.modelFromCages` and the COMPLETE model wire is
compared: the 27 base units, exactly one matching cage unit per cage of size >= 2, none for a singleton, no extra unit, the
colours and the layout. Nothing is repaired, sorted or normalised, and a layout that fails the data rules is never rebuilt.
The solution/givens, uniqueness, canonical-rating and requiredness checks are unchanged.

```powershell
# one wrapped command (the wrapper's owner text must be IG-S02/killer-audit)
Invoke-IgNode -Repo sudoku -Task 'IG-S02/killer-audit' -NodeArgs @(
  'generator\tests\artifacts\improve-generating\phase0\ig02-killer-audit.cjs', '--task=IG-S02', '--round=provisional-r1',
  '--shard=killer', '--source=a1', '--out=audit-a1', "--requested-at=$((Get-Date).ToUniversalTime().ToString('o'))")
# then a NEW task summary (the records and the first summary stay as they are; every link is checked, a broken one stops):
node generator\tests\artifacts\improve-generating\phase0\aggregate.cjs --task=IG-S02 --round=provisional-r1 --out=summary-r2 `
  --audit=docs\improve-generating\evidence\phase0\provisional-r1\IG-S02\killer\audit-a1\audit.json
# development only (no engine): node generator\tests\artifacts\improve-generating\phase0\killer-audit-test.cjs
```

- **Sidecar** `<shard>/audit-a1/`: `audit.json`, `audit.md`, `command.json` (charged from its timing), firewall files. Each
  entry links by hash to the saved puzzle file and to the original record (`recordDigest`, `puzzleFileSha256`, digests of the
  saved wire against the record's, `linkHash`) and carries the verdict and the fields a reconciled row would have. The
  command first posts eight tampered copies of a saved puzzle (a missing, extra or wrong cage unit, a wrong sum, a cage that
  is not distinct, a cell in two cages or none, cages in another order) to the real verifier: it must reject all of them
  before the six acceptances count. Nothing is regenerated, no record is rewritten, the original timings and fingerprints stay.
- **Reconciliation** (`aggregate.cjs --audit=`): a copy of each audited record with the new outcome and validation next to the
  original outcome, error and validation; applied only when the verifier tests passed and the record, the puzzle file and the
  entry's link hash all match.
- **Harness changes since the shard evidence** (fingerprint `dd759a22…`): `ig02-run.cjs` and `aggregate.cjs` changed only in
  reporting (the pair rows, the cell summary, the task summary, the reconciliation); the generation hooks (`prepare`,
  `execute`, `augmentRecord`), the timing, worker-pool and adapter files and the plan are those of the evidence. `worker.cjs`
  changed afterwards only in `validate()` (the Killer branch) and `killer-audit.cjs`, `ig02-killer-audit.cjs`,
  `killer-audit-test.cjs` are new: verification only, no generation path. The sidecar lists the per-file comparison with the
  evidence manifest.

## IG-S03: scoped solver prototype (partial S3) and virtual-check parity

Test side only; every number is provisional (pre-freeze). The S3 prototype changes nothing outside private in-memory copies of
`logical-solver.js`, `tech-basic.js`, `tech-subset.js` and `pipeline.js` of a worker's engine; no production source, S4, graph
caching, extra technique, weight/order or cap-unit change. Implemented: negative scans of naked singles (cell scope), hidden
singles (unit scope) and the six naked/hidden pair/triple/quad finders (unit scope). Every other finder stays a native full scan.

- **`solverMode=reference|scoped`** is chosen by the adapter list of a worker: no adapter = reference (the native engine),
  `scoped-solver` = scoped (add `attempt-pool` for the pool). Records name the arm in `solverMode` (`scoped-native-w1`,
  `scoped-attempts-w4`); the audit adds `scoped-audit` to annotate the native check sites (never in a timing instance).
- **Scope proof** (`scoped-solver.cjs` header, `coverage.json`): a scope's result and, for the subset finders, its raw node
  increment depend only on the values/candidates of its cells (plus `completeUnits[u]`, fixed per solve); only negatives are
  cached; a placement dirties the placed cell and its peers, an elimination its cell, a dirty cell its units. Subset checks are
  replayed one by one: the unit-entry check, then `floor((r + inc) / 256) - floor(r / 256)` real `ctx.check()` calls at the virtual
  node positions, the node counter being at the boundary at every call and at `r + inc` at the end. A negative is recorded only
  after a completed scan. The audit mode shadow-checks every invalidation and re-scans every skipped scope natively.
- **Audit** (`scoped-audit*.cjs`): three engine instances (plain native, native + site annotations, scoped + annotations) over the 18
  saved IG-S02 puzzles (the native-w1 result of each request; the pooled arm returned the identical puzzle) in four solver sets
  (canonical ladder, floor set, oracle set with `assumeUniqueness: false`, proposal set without chains): unlimited runs must agree
  in the check count, the check-site token hash and checkpoints, every step and the rating; then count failures at the first,
  middle, last check and around the first, first multi-check, middle and last skipped scope must fail at the same ordinal, site,
  steps and with the same native error fields. Ceiling cases (100,000 objective, 30,000 Killer rating) are **boundary-injected**
  by controlled precharge, never presented as naturally binding; a natural case is listed apart when a solve crosses it.
  Nine synthetic states (fixed seeds, initial-state hashes in the manifest) cross the node cadence with different residues; four
  deliberate mutations (stale peers, last-check-count caching, dirty-first scan order, bulk check) must FAIL the same comparison and the
  prototype is restored and re-checked before any measurement. `scoped-test.cjs` has the engine-free counterparts.
- **Timing**: `scoped-attempts-w4` for the 18 H3 requests (six cell shards) and `scoped-native-w1` for mega16:3, mega12:3,
  samurai:42, classic9:3, killer:3, greaterThan:3 (three shards), each against IG-S02's matched native-w1 and attempts-w4 records
  (harness `dd759a22…` generation baselines, reused with the author's approval, never rerun). Identity against those baselines is
  checked on every digest section. Serial S3, incremental S3 over the pool and the combined factor are reported separately.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S03 -Round provisional-r1
# after the shards: the task summary, parity.json, check-sequences.json, coverage.json (evidence only, no engine, write once)
node generator\tests\artifacts\improve-generating\phase0\ig03-aggregate.cjs --task=IG-S03 --round=provisional-r1
# development only, no engine, no timing: the engine-free focused tests
node generator\tests\artifacts\improve-generating\phase0\scoped-test.cjs
```

Shards (plan order): `audit-1` (synthetic states and mutations, then the 9x9 puzzles), `audit-2` (samurai, mega12, mega16), `sc-c9`,
`sc-gt`, `sc-killer`, `sc-m12`, `sc-sam`, `sc-m16`, `ser-small`, `ser-m12-sam`, `ser-m16`. A started audit job that cannot start its
three engine instances stops the command (`unsupported-source`, never a silent retry). The first audit attempt (`audit-1` a1)
failed on a race in the audit session (two consumers of one worker channel, the second dropped `ready`); it is preserved, the fix
is in attempt a2.

- **Harness changes since the shard evidence** (fingerprint `baeb9ea2…`, attempt a2 and every later shard): `ig03-aggregate.cjs`
  only, in reporting (criterion B03 counted the sixth serial row; the limitation texts; `--out=summary-r2` writes its own
  `parity-r2.json`, `check-sequences-r2.json`, `coverage-r2.json`; the approved extra machine time is shown). `summary.json/md`
  of the round were written by the earlier text and are kept as history: their B03 row reads "NOT met" because serial mega16:3
  was then unstarted. `summary-r2.json/md` adds all 24 requests (B03 met by its own wording). `summary-r3.json/md` (reporting
  fixes after the author's review, no run and no machine time) is the current summary: verdict wording "no material net gain
  observed on this cohort" with what it does and does not say (partial S3 does not supply 1.3-1.65x, does not refute full S3,
  SM1 / IG-S07 still needed), the early-exact list limited to `firstExactOrdinal = 1`, B02 counting the 24 request identities
  apart from the 19 audit jobs, and the SM4 scope statement (sufficient for these families on this runtime, not a certification
  of the frozen source). The r1 and r2 files are kept unchanged.

## IG-S04: frontier prototype (S1/S2 variants) and the staged budget pilot

Test side only; every number is provisional (pre-freeze). Reference solver only (the S3 prototype is never loaded) and no S3
gain is assumed. The five private transforms of the adapter `frontier-hooks` observe the engine (counters per purpose, the
enforced count limits, the S2 early exit, the exposure of the digger's own constants and helpers); without the runtime the
patched code is the native code. A trial is one fresh worker: the native model and full grid of the request seed (forks `model`
and `grid#1`), then ONE sample of ordinal 1 (root fork `dig#1.1`) in one of eight modes.

| Mode | What it is |
|---|---|
| `proposal-only`, `ordinary-only` | the native `digLevel` sample of that kind at ordinal 1 (native forks, caps, keeper, guards); only the kind is forced |
| `F0` | full ladder (cheap, middle, full floor), S2 off, final parent |
| `F1` | full ladder, S2 on, final parent (the default frontier) |
| `FC`, `FM` | the cheap / middle set only (S2 on, final parent) |
| `FU` | F1, then, after the fresh DFS proof of the reference candidate, the actual full canonical floor with uniqueness enabled |
| `FS` | F1 with the stored immutable snapshot of each entry as its reference parent |

Cheap = the actual floor ids of the groups basic, locked, subset and wing; middle adds fish (the registered single-digit patterns
are in that group); full = the whole actual floor; all in registry order, equal rungs removed. An empty tier, or a registry
without these families, stops for the author. Phase A always runs `assumeUniqueness: false`; S2 raises a separate `rederived`
outcome (never a forged solved report or rating) when every removed cell holds its original value again and the grid is not yet
complete; a cell with another value is an unsound deduction. The readings the task text leaves open are listed in
`frontier.cjs` (`INTERPRETATIONS`) and in `variant-manifest.json` for the author.

```powershell
# the plan (no engine, nothing timed, nothing written)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S04 -Round provisional-r1 -PlanOnly
# staged, as the task requires: the large-board probes first (the first command also runs the unmeasured synthetic engine
# tests and the patched/plain parity run), whose end emits pilot-reprojection.json; later shards refuse to start without it
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S04 -Round provisional-r1 -Shard s1-large-controls
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S04 -Round provisional-r1 -Shard s2-small-all
# the documented single command runs every shard in the fixed priority order
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S04 -Round provisional-r1
# the task documents (evidence only, no engine, write once; --suffix=-r2 for a later revision: a budgets-r2.json frozen
# beforehand is reused, never recomputed)
node generator\tests\artifacts\improve-generating\phase0\ig04-aggregate.cjs --task=IG-S04 --round=provisional-r1
# development only, no engine, no timing: the pure cases on the scripted fake engine
node generator\tests\artifacts\improve-generating\phase0\frontier-test.cjs --only=pure
# after a correction of the frontier code: the pure cases plus the real-engine cases, one wrapped command, nothing timed
. (Join-Path $env:USERPROFILE '.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1')
Invoke-IgNode -Repo sudoku -Task 'IG-S04/engine-retest' -NodeArgs @(
  'generator\tests\artifacts\improve-generating\phase0\ig04-retest.cjs', '--round=provisional-r1', '--suffix=-r2')
```

- **Population.** Cells classic9, mega12, mega16, samurai; Nightmare; grid seeds 11 and 12 (attempt 1); the eight modes: 64
  keys. Shards in the fixed priority: `s1-large-controls` (mega16/11 and samurai/11: both native controls and F1),
  `s2-small-all` (classic9 and mega12, all modes), `s3-large-native-f1`, `s4-large-floors` (FC, FM), `s5-large-reference`
  (FU, FS), `s6-large-s2-control` (F0). Arms rotate inside a block by the grid index. Whole trials are packed into the 270 s
  window by planning estimates; unreached keys stay unstarted/inconclusive (never a zero-cost or censored observation).
- **Guards and accounting.** The 45 s trial guard is the host's `sample` guard (a cut trial is a `request-timeout`, scope
  `sample`, with the progress it had posted); the primary CPU/wall interval starts at engine-ready and ends after the trial's
  cleanup (`readyOccupiedWallMs`, `cpuReadyTotalMs`), with the grid build, the cold start and the verifier/audit reported apart.
- **Budget.** A count vector, never a time: floor tests (3G), ladder passes (3), phase B solves (K_F = 12), deepen proposals
  (16), canonical ratings (64, the fallback rating included), and the four fitted dimensions (floor deductions, logical checks,
  DFS entries, DFS checks) whose pilot ceilings follow the task formulas from the engine's own constants. A stop is the outcome
  `sample-budget` with the dimension, limit and phase; the fully given fallback stays valid but is never offered as a result.
  `budgets.json` applies the fixed fit (`min(ceiling, next power of two >= 2 x the largest observed count)`) only to a cell whose
  planned variants all completed; any censored, stopped, errored or missing variant leaves the cell unfitted with the pilot
  ceilings, and a dimension never observed (or only zero) keeps its ceiling, flagged. The hash is in the file.
- **Records.** Common records plus the counts of every budget part, the per-phase cost (phase A includes the refused-test DFS),
  the passes, the entries and diagnostics (discovery ordinal, parent hash, floor open cells, proof), the phase B rows
  (reference hash, fresh proof, filter, allowed-set status, canonical rating, quality), the deepen runs, the fork labels and the
  grid hash. `s2-audit.json`: after the timed interval, an unpatched instance re-solves in full the first, middle and last
  S2 removal and the final phase A parent; an operational disagreement is guidance waste, an unsound deduction or a differing
  ordinal is a correctness stop.
- **Tests.** `frontier-test.cjs`: 41 pure cases (multi-cell re-derivation, an already-derived cell, a wrong value, no
  re-derivation, the uniqueness-assuming finder excluded, a floor-budget stop versus a true stuck floor, unique versus two
  solutions versus unknown, stale snapshot and final parent, empty tier, coarse symmetry and clue/unit floors, the last
  executed rung only at phase B, a contradiction after proved uniqueness as an error, exact/shallow/off-band keeper ties,
  the typed/numeric objective adapter with an unsupported objective as a stop, a budget stop in every phase, the fit rule,
  the plan and packing, the reprojection, the adapter anchors on the real source text) and the engine cases that run in the
  first command under the wrapper (hook counters, S2 against an independent full solve, the trial path of every mode on
  classic9, a budget stop per dimension with the hooks restored, patched-versus-plain parity).
- **Reading the pilot.** Phase A is not empty: it accepts many removals. What is often empty is the frontier LIST (every
  refused group proved ambiguous by the DFS), an anticipated failure mode of the route; the DFS after every genuinely stuck
  floor test is the intended behaviour. `K_F = 12` bounds the ATTEMPTED phase B entries (`phaseBTries`); the allowed-set
  solves (`phaseBSolves`) are only the attempts that passed the fresh uniqueness proof (and the FU filter, counted apart).
  K_F and the 16 deepen proposals are acceptable prototype limits. The final phase A parent is omitted as a declared
  prototype restriction, not a theorem (S2 operational solvability is heuristic; canonical requiredness is the authority).
- **Revision r2.** After the pilot the author's review corrected the code (phase B admits only entries of the last executed
  rung; an unsupported objective stops the sample as `unsupported-source`; an allowed-set solve ending other than solved or
  stuck after proved uniqueness is an error) and the wording, added two pure cases (last rung only, contradiction) and
  changed the typed-objective case, and an approved extension
  finished the six keys the first command chain had left unstarted (samurai/12 FU and FS in `s5`, F0 on mega16 and samurai
  for seeds 11 and 12 in `s6`). `budgets-r2.json` is the completed fit frozen with the unchanged harness; `summary-r2.*`
  and `variant-manifest-r2.json` are the revision documents; the first-round files are kept. The trials ran before the
  corrections; `summary-r2` states which corrected branch any completed trial exercised.
- **Frozen rerun.** The same command with `-Round frozen-gate` and the two receipts; the catalogue, the floor sets and the
  ceilings are re-derived from the loaded source (nothing is hard-coded).

## IG-S05: paired SM2 grid screen and yield rates

Test side only; every number is provisional (pre-freeze). The reference solver only (no S3 gain assumed), the eight modes of
IG-S04, the frozen IG-S04 budget (`budgets-r2.json`, hash `f0a0c422…`, checked by the plan: any other hash is a source/budget
mismatch and nothing runs) and no retuning. A trial is ONE grid per mode (the native model and full grid of the request seed: forks
`model`, `grid#1`, built afresh for every mode; the grid hashes of a cluster must agree) and at most two native-fork samples
`dig#1.1` and `dig#1.2` on that grid:

- `proposal-only` / `ordinary-only`: the native `digLevel` sample of that kind for BOTH samples, with the native attempt caps and
  keeper shared by the two samples (as one attempt of `generateAttempts`), the native guards and no count budget; a later sample is
  not started once the keeper is exact or the caps are used up. No local-search continuation.
- `F0 F1 FC FM FU FS`: the IG-S04 frontier sample (frontier.cjs, unchanged) for each ordinal, each with the frozen per-cell count
  vector and its own fresh counters.
- The first exact sample ends the trial (`skipped-first-exact` for the later ordinal); the best candidate of the trial is the native
  one (a strict improvement is needed). The independent verifier runs after the timed interval, never steers generation and a failed
  check is a correctness stop (no replacement sample).
- Guard: the 45 s research guard of one sample observation, re-opened at the start of every sample (the worker posts
  `sample-start`); a trial that runs past it is censored with its CPU and progress and never retried.

Design: 4 cells (classic9, mega12, mega16, samurai) x grid seeds 101-108 (8 clusters per cell) x 8 modes = 256 trials (at most 512
sample observations), as 32 logical blocks (tier x cell x seed block): (1) primary: proposal-only, ordinary-only, F1; (2) floors:
FC, FM; (3) reference: FU, FS; (4) s2-control: F0; tier-major, inside a tier the seed block 101-104 across the four cells, then
105-108; arms rotate by the cluster index. It is ONE shard (`screen`) so that the physical packing (a separate layer with its own hash,
pilot-based admission estimates, never splitting a started trial) flows across blocks; a pause leaves the extension tiers unstarted.

```powershell
# 1. before any run: save the planned keys, the frozen budget and variant identities (written once)
node generator\tests\artifacts\improve-generating\phase0\ig05-aggregate.cjs --task=IG-S05 --round=provisional-r1 --stage=manifest
# 2. the plan (no engine, nothing timed, nothing written)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S05 -Round provisional-r1 -PlanOnly
# 3. the one command (the first command also runs the unmeasured synthetic engine tests)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S05 -Round provisional-r1
# 4. the documents (evidence only, no engine, written once; --suffix=-r2 for a later revision)
node generator\tests\artifacts\improve-generating\phase0\ig05-aggregate.cjs --task=IG-S05 --round=provisional-r1
# development only, no engine, no timing: the pure cases (synthetic records, scripted fake engine, fake workers)
node generator\tests\artifacts\improve-generating\phase0\ig05-test.cjs
# frozen rerun, after a separate budget approval (101-140 = 40 clusters per cell, 1,280 trials; the IG-S04 budgets must be
# recomputed on the frozen pilot first: until then the plan only projects the cost from the provisional vectors)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S05 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

- **Rates.** The numerator is the number of VERIFIED delivered grid hits (claimed by the generation AND independently verified exact;
  at most one per grid trial; a rejected, unverified, censored or budget-ended trial and a second copy of one return never count).
  The denominator is all generation CPU (wall) of the started trials of the mode from engine-ready to the end of cleanup, the actual
  grid build included; a started trial with unknown spend makes the rate null and an unresolved CPU sum is null, never infinity. The
  cold-inclusive rates, the conditional rate that excludes trials ending on the sample budget (secondary: it selects nothing) and the
  derived setup-amortised sensitivity (sample cost plus grid build divided by the native sample count) are reported apart.
- **Uncertainty.** Whole paired grid clusters are resampled (2,000 draws, analysis seed 20261114); rate differences of each frontier
  variant against `proposal-only` (the proposal-only control and the current proposal kind) and `ordinary-only`; one-sided 95% lower
  bound and 95% interval; zero hits give a zero lower bound and no pseudo-count. Eight clusters: descriptive intervals with poor
  small-sample coverage. A mode missing in a cluster keeps its coverage visible (an incomplete row selects nothing).
- **Parent classification.** After the timed interval an unpatched instance rebuilds the final phase A parent of every frontier
  sample (from the full grid and the removed groups, hash checked), counts its solutions and rates it with the untouched canonical
  rating: exact / shallow / below / above / incomplete / ambiguous / unknown. It never steers generation and never enters a hit count.
  Equal parents of one grid (F1, FU, FS share their phase A) are classified once per process.
- **Selection.** `selection.json` ranks, among variants with every planned trial observed, both controls observed everywhere and at
  least one verified hit, by hits per ready CPU second, then per wall second, then F1, FC, FM, FU, FS, F0; with none, F1 is an
  explicitly non-winning diagnostic default (never the fastest zero-hit mode). It reports how often resampled clusters pick each
  outcome. Every cell's formal gate is `not-evaluable-pre-freeze`; the zero-baseline feasibility is `projection-awaits-author-review`.
- **Records.** Common records plus `samples` (per sample: fork, kind, status, class, claimed exact, hash, counts, budget stop, the whole
  frontier detail), `skippedOrdinals`, `sampleStates` (returned / sample-budget / skipped-first-exact / censored / not-reached),
  `hostSamples` and `intervals` (startup, grid build, samples, cleanup apart), `parents`, `budgetStops`.
- **Revision r2 (reporting and accounting closure, no generation).** `ig05-aggregate.cjs --suffix=-r2` writes `rates-r2.json`,
  `paired-intervals-r2.json`, `summary-r2.json` and `summary-r2.md` beside the unchanged r1 files; `selection.json` is not rewritten (the
  revision recomputes the selection document and stops unless its hash equals the one of `selection.json`; the same check stops it if a
  hit count, a primary/cold-inclusive/conditional rate, a cell-mode outcome count or the verdict differs from r1). Changes: the
  setup-amortised sensitivity is `readyTotal - gridCost + m x gridCost / N` per started trial (m = the samples that started, N = the
  native sample count; r1 charged one share per trial) with r1's denominators beside it; an interval whose resamples are all identical
  is labelled `degenerate` (not evidence of equivalence or non-inferiority); the funnel counts empty frontiers and every cell has the
  separate problems (empty frontier, shallow or off-band candidates, budget-ended trials); the summary carries the interpretation and
  the disclosure of the wrapped dev-check (`ig05-dev-check.cjs`: 16 real screen keys under an earlier harness and manifest, excluded
  from every number, compared read-only with the screen's own trials of the same keys). The dev-check's charge (its occupied time plus
  the 45 s grace) is a ledger entry of shard `dev-check`: a wrapped command launched by hand is charged like a dispatcher command.

## IG-S07: SM1 stage and finder profiles and their overhead

Test side only; every number is provisional (pre-freeze). Nine fixed shards, twelve native requests (`c9`, `m16`, `m12`, `sam`, `killer-n`,
`gt-n` profiled; `killer-h`, `killer-e`, `gt-normal` each with one new unprofiled request first and the profiled one after it), exactly the
IG-S02 request (trace off, rotational180, random order, default attempts). A profiled request is an **attribution run, never a timing run**:
the headline timings stay IG-S02's, and the comparators of the six headline cells are IG-S02's matched native-w1 records (the runtime and
catalogue fingerprints are checked, and the accounting-path files `host.cjs`, `loader.cjs`, `common.cjs`, `records.cjs`, `manifest.cjs` must be
byte-identical to the harness of that evidence; the other changed files are listed, never hidden).

```powershell
# the plan (no engine, nothing timed, nothing written)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S07 -Round provisional-r1 -PlanOnly
# the nine shards in order (classic9 first: the plumbing check of the first command)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S07 -Round provisional-r1
# the task documents (evidence only, no engine, written once; --suffix=-r2 --revision=<text> [--write=stage,finder] for the revision r2)
node generator\tests\artifacts\improve-generating\phase0\ig07-aggregate.cjs --task=IG-S07 --round=provisional-r1
# the revision r2: the loop-check shard (one wrapped command, needs the remaining allocation and an admission window)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S07 -Round provisional-r1 -Shard lc
# development only, no engine, no timing, nothing written: the pure cases
node generator\tests\artifacts\improve-generating\phase0\ig07-test.cjs
```

- **The instrument.** The adapter `profile` (27 transforms in version 2, 26 in the version 1 of the r1 cohort; hashes in `command.json` and in every record) calls `SG.__igProf`, which exists only
  between `install` and `uninstall` of one request (`ig07-worker.cjs`, a `finally`); the entry points that need no source change
  (`logicalSolver.solve`, `difficulty.rate`, the four DFS calls, `fullGrid.generate`) are wrapped by `install` and restored by `uninstall`, which
  checks every restoration. Without the runtime the patched sources are the native code (the first command compares an unpatched instance, the
  patched sources without the runtime and with it: same puzzle and the same number of budget checks).
- **What is measured.** Wall clock (`performance.now()`), no process CPU per call. Every millisecond is booked once, by segments, to a cell of
  *context* (setup, attempt, ordinary, proposal, local) x *purpose* (the pipeline steps and the digger's stages: stage A oracle, stage B
  objective, safety count, keeper count, refinement, proposal rating, local search and its two counts) x *primitive* (own code, solver state/setup,
  solver loop, applied Findings, finders, the four DFS entry points, canonical rating, grid generation); finders have their own matrix (calls,
  hits, wall time, hit time, throw time, budget checks, throws; the negative-call time is wall - hit - throw). Nothing is redistributed: the unnamed remainder is the `self` cell of its
  purpose. A finder never contains another timed frame, so its inclusive and exclusive times are one number; the solver's remaining work has its
  own cells, so nothing is summed twice. `consistency` checks the root against the booked cells (a floating-point residual), the open frames, the
  counters against the rows.
- **Counters** (distinct, T02): canonical ratings (`difficulty.rate` calls, equal to the engine's work ratings), oracle solves (solves outside a
  rating), DFS entries, budget checks of the search loop and backtracks (checks inside constraint propagation are not counted), finder budget
  checks (`ctx.check()` of a budgeted solve) and the loop checks, guided candidates per round, refusal reasons, full-grid restarts and backtracks.
  **Revision r2 (loop checks).** The r1 instrument (adapter version 1) *derived* the loop checks from the finder passes; that count misses a
  check that throws before the first finder or before returning stuck, and every pass of an empty ladder, so the r1 budget-check totals are
  marked **inexact** (`counters.checkTotals`; the original r1 records are untouched and the cohort was not rerun). Adapter version 2 counts
  both check sites of the ladder loop before the call (`SG.__igProf.loopBudget`, the budget object of `iterate` forwarded unchanged), keeps the
  old derivation only as a diagnostic (`loopChecksDerived`), and the budget checks that nishio and forcingChain issue through the propagation
  engine (variants with propagation extensions) are still not observed. The shard `lc` (no request, no cell, no seed) runs one comparison on the
  real engine: `SG.logicalSolver.solve` of classic9 under budgets of 0, 1, 2, ... nodes on an unpatched instance and on the patched sources
  without and with the runtime, for an empty ladder, a ladder that solves, a ladder that ends stuck and one with finders that call
  `ctx.check()`; it records a verdict, never a stop.
- **Overhead.** `overhead.json`: the profiled request against its comparator (the same-command unprofiled arm of the controls, IG-S02's native-w1
  for the headline cells, time-separated), and the calibrated unit costs (a clock read, a finder timer pair, an applied-Finding timer, a frame pair,
  a counted check, a counter increment) times the operations the profile counted: an estimate, never a correction.
- **Frontier phase A.** `frontier-phase-a.json` is read from the IG-S05 ledgers (no run): F1 against FC and FM, accepted and refused floor tests,
  DFS counts, allowed-set and canonical work, deepen, and the three kinds of zero yield. Its wall time includes the floor tests and the DFS checks
  after stuck tests; its per-purpose counts are not per-purpose wall times, and native finder shares are not transplanted into it.
- **Conditional zero-cost scenarios (revision r2; r1 called some of them ceilings).** `finder-profile-r2.json` sets the wall time of a named
  group of finder calls to zero in this one profiled run (all finder time, the covered finders' time, the remaining finders' time, and the negative
  calls of each family) and gives root / (root - removed) next to IG-S03's measured partial-S3 factor for the same request. A scenario is
  arithmetic, not a forecast and not a ceiling of a full S3: a call that returns a Finding can also skip cached negative scopes (so a full S3 can
  save more than the negative calls) and a cache costs lookups and invalidation (so it saves less). Only the two family-time scenarios limit a
  change confined to those finders' calls. The bias-adjusted column of r1 is dropped.

## IG-S08: bounded SM3 attribution of Jigsaw Expert seed 1111 (pre-MS07)

Test side only; every number is provisional (pre-freeze) and labelled **pre-MS07**. Two fixed shards, three requests, all native `jigsaw9`, Expert,
trace off, rotational180, random order, default options and attempts: `control` (seed 1100: one unobserved native request, then one observed
request; in its first command also the unmeasured probe, the calibration of the instrument, its engine checks and the synthetic short-timeout
journal recovery test) and `tail` (seed 1111: one observed request under the 240 s Jigsaw diagnostic guard, or the command window if that is
smaller, whichever the allocation leaves: the limit actually applied is recorded). The unobserved historical total (325.313 s, I5) is never
remeasured to completion: that would need a 400 s command and the wrapper stops at 300 s.

```powershell
# the plan (no engine, nothing timed, nothing written)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S08 -Round provisional-r1 -PlanOnly
# the two shards in order
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S08 -Round provisional-r1
# the task documents (evidence only, no engine, written once; --suffix=-r2 --revision=<text> for a revision)
node generator\tests\artifacts\improve-generating\phase0\ig08-aggregate.cjs --task=IG-S08 --round=provisional-r1
# development only, no engine, no thread, nothing written: the pure cases
node generator\tests\artifacts\improve-generating\phase0\ig08-test.cjs
```

- **The instrument.** The adapter `jigsaw-profile` (32 transforms; hashes in `command.json` and every record) calls `SG.__igJig`, which exists only
  between `install` and `uninstall` of one request (`ig08-worker.cjs`, a `finally`); the engine entry points that need no source change are wrapped
  and restored as in IG-S07. Without the beacon the patched sources are the native code; the inserted lines draw no random number and change no limit,
  restart rule or branch (a pure test checks the inserted text). Nothing about the algorithm is bounded, restarted or optimised.
- **Why shared memory.** The request is one synchronous call in a worker that the host terminates without a word at the guard. The counters
  therefore live in a `SharedArrayBuffer` that the responsive host reads every 5 s (a heartbeat) and once more after the worker ended; every stage
  entry is also posted to the host as a message *before* the synchronous work starts (the pipeline steps, each layout attempt, the unlimited last
  full-grid search, the safety count, the proposal rating and the refinements; the hot inner contexts post none). The host writes everything to
  `stage-journal.jsonl` (one JSON line each, CRLF, flushed at each heartbeat); the attribution is computed **from that journal alone**, so it survives a
  worker that never answers. A counter only grows, so every read is a lower bound.
- **What is measured.** Wall time booked once, by segments, to a cell of *context* (configure, buildModel, layout growth, layout solvability check,
  layout plain-search check, fullGrid, extraStructure, dig, the stage A oracle, the stage B objective, the final count of the random dig, the safety
  count, the keeper count, the proposal rating, the refinement, rate, tune, and the local continuation with its own uniqueness counts, ratings and
  refinement) x *sub* (own code, one registered finder, the logical solver's own code, the rating's own code, the depth-first search, the full-grid
  generator); calls and finder hits per cell; layout attempts, growth backtracks, open levels, feasibility calls and outcomes; full-grid searches,
  restarts and backtracks and the entry of the unlimited last search; depth-first nodes, node checks and backtracks, booked to the current context.
  The time since the last booked segment is added to the cell that was running when the host ended the observation (a lower bound).
- **What is unknown, never zero** (`unknownCounters`): the totals of the solver's budget checks (**not instrumented** here: the request passes no
  external budget, but the digger's own internal budgets, such as the stage B objective step guard and the uniqueness-count node slices, issue
  checks this instrument does not count; the IG-S07 limitation that chain propagation checks bypass `ctx.check` stays), the operations inside
  constraint propagation, the time of applying a Finding (part of the solver's own code) and per-call times inside a context. The guards themselves
  are untouched. Counter scope: the depth-first counters are live (they include a search that is still running); the full-grid counters (searches,
  restarts, backtracks) are booked when a search returns, so they count completed searches only; all counters are cumulative over the request, per
  context, never per attempt (per-attempt node and backtrack counts are unknown: no snapshot is taken at a stage entry).
- **A censored request** is recorded as `request-timeout` with `timeoutScope` request or command, a `censoredLowerBound` (wall, CPU to the timeout) and
  the limit actually applied; it has no puzzle, no exactness and no check result, and it is never a completed latency, a pass, or evidence that a
  specific S7 ceiling is safe. A completed request is validated by the unpatched verifier after the timed interval like every other task.
- **Control and overhead.** The control compares the observed request with the native one (digests of every deterministic section; a mismatch stops
  the pack) and reports one ratio (n = 1, time-separated) beside the calibrated unit costs times the operations the beacon counted: an estimate,
  never a correction. An observed request is an attribution run, never a timing run.
- **The synthetic recovery test** (first command, test-only host, a busy worker that publishes stages and counters through the real beacon and never
  answers, a 1.5 s Jigsaw guard): the host records the timeout and no result, the journal holds the stage markers, heartbeats whose counters move while
  the worker is blocked and the post-mortem read; the attribution is also recomputed from the last heartbeat (the host died before the final read) and
  from a journal whose last line was cut short. The same judge runs on fake workers in the pure tests.

## IG-S09: Greater-Than miss predicate and solve-first diagnostic (pre-MS07)

Test side only; every number is provisional (pre-freeze), pre-MS07, and a diagnostic: no guided sign pool, setup-clue policy change or IR29 adoption follows
from it (IG-S-Q16). Ten fixed shards, 30 paired requests and two controls: Greater-Than Normal literal seeds 300-319 (`normal-300-304`, `-305-309`,
`-310-314`, `-315-319`), Nightmare seeds 700-709 (`nightmare-700-701` ... `-708-709`), and `observer-control` (observer-free native Normal 300 and Nightmare
700, inside the runner and the priority wrapper, compared with the captured G0 of the same seeds). Every request is trace **summary** (the historical
diagnostic population; not comparable with a trace-off headline), the other options native; the arm order alternates by the index in the seed list (even index:
G0 first).

```powershell
# the plan (no engine, nothing timed, nothing written)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S09 -Round provisional-r1 -PlanOnly
# the ten shards in order
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S09 -Round provisional-r1
# the task documents (evidence only, no engine, written once; --suffix=-r2 --revision=<text> for a revision)
node generator\tests\artifacts\improve-generating\phase0\ig09-aggregate.cjs --task=IG-S09 --round=provisional-r1
# development only, no engine, no thread, nothing written: the pure cases
node generator\tests\artifacts\improve-generating\phase0\ig09-test.cjs
# the wrapped development check (charged like any command: occupied time plus the 45 s grace); pass the caller's own request time as
# --requested-at=<ISO UTC> to record the priority wait, otherwise the wait is recorded as unknown (null), never 0
Invoke-IgNode -Repo sudoku -Task 'IG-S09-dev' -NodeArgs @('generator\tests\artifacts\improve-generating\phase0\ig09-dev-check.cjs', '--round=provisional-r1', '--seed=300')
```

- **Arms.** G0 is the native first-allowed sign pass. G1 changes the oracle of the **first technique sign pass of every sample only**: the native restricted solve
  (`assumeUniqueness: false`) runs first; a complete proof by techniques that do not assume uniqueness is the only thing that skips that candidate's DFS count; a
  stuck result runs the native count and keeps the original reason (`ambiguous` or `techniques`); a contradiction, a thrown solver error, a proof that used a
  uniqueness-assuming technique or a malformed report is never "stuck" and is **never retried through the native order** (r2): it is recorded with its code, site and
  ordinal (`firstFailure`) and stops the request (`ig09.g1-contradiction`, `ig09.g1-unsound-proof`, `ig09.g1-malformed-report`, or the solver's own code); a count that
  fails after a stuck solve propagates with its code. A report that claims a proof is audited before anything is skipped: its technique-count map must be a plain object of
  non-negative integers (`{}` is valid); a missing, null, string, array, non-plain or bad-valued map is `ig09.g1-malformed-report`, and neither the count nor the semantic-question
  callback runs for a malformed or unsound proof. The semantic "one oracle question"
  counter (`stats.oracleCalls`) is preserved; actual restricted solves, countSolutions calls, search-loop budget checks and skipped counts are separate counters. The sign-minimal
  pass, reveals, tuning, target handling, the keeper, the local search and every random draw are untouched. Both arms carry the same capture.
- **The instrument.** The adapter `gt-diagnostic` (23 in-memory transforms; hashes in `command.json`) calls `SG.__igGt`, published only for the one pipeline call of a
  request (`ig09-worker.cjs`, a `finally`). It records per sample: the attempt and sample ordinal, the kind (ordinary, proposal or local), the floor, every setup reveal
  with its origin (clue-floor rule, unit-floor rule, solvability help, tune), the post-setup parent, each sign pass with its decisions (one character per removal), its
  physical countSolutions calls and search-loop budget checks, restricted solves and skipped counts, the tuning reveals, the final state and canonical rating, exactness, and the local search's
  entry and cap data. **Counter units (r2):** `dfsCalls` are calls of `countSolutions` (one per uniqueness count; the r1 records alias them to `counts.dfsEntries`, which is
  therefore **not** a count of depth-first node entries; new records leave `counts.dfsEntries` null); `dfsChecks` are the search loop's budget checks; the `UNIQUE_NODES` slice
  counts budget checks (search-loop and propagation), not search nodes; node entries, propagation checks and the solver's own budget checks are **not instrumented**.
  `cpuTotalMs` (the CPU columns of the reports) is the request's total CPU from worker start to cleanup, startup and cleanup included, not the CPU from ready to decision.
- **Guards.** The sign passes receive the request budget (null: no external budget); whether the count or the solver has an internal limit there is **not instrumented**
  (the reports say "no external budget object reaches these calls", never "no guard exists"); the internal
  `UNIQUE_NODES` count slice (keeper offers and the local search) is observed (calls, budget checks used, trips); the stage B `OBJECTIVE_STEPS` guard is not on the sign path
  (entries observed, expected 0); the per-attempt caps come from `wire.work`. A shared external budget would bind differently in the two orders: the comparison
  classifies the first differing event as `guard-binding-difference` only when an external budget was present **and** the first differing event is an error event whose
  recorded first failure carries a recognised guard code (`budget.exceeded`, `budget.cancelled`, `digger.uniqueGuard`, `digger.objectiveGuard`); an arbitrary error, a solver
  error or a G1 stop code is a mismatch, and every other uncensored difference is a mismatch too and stops the pack (a request whose first failure is not a recognised guard
  is an identity violation of the request).
- **Post-timing diagnosis** (own 30 s host allowance per request **counted from the start of the diagnosis** and bounded by the command deadline, a 2 s margin and the worker start
  inside it; an unpatched instance, separate wall and CPU fields, never part of a generation time): the independent
  canonical re-rating of the dug samples (the cheap clue-floor clause first), and only for a sample that satisfies the clue-floor clause **and** is below the band the
  uniqueness and the minimality proof (removing each remaining sign admits another solution; a node-capped count is unknown, not minimal); then the probes of the first
  missed sample of the request: at most the first three above-floor setup groups in their recorded order against the saved post-setup, full-signs parent (the pure
  clue-floor / unit-floor rule, a bounded uniqueness count and the allowed-set solve after the removal). The worker reports each piece of work before it starts, so a row
  without a result is `unfinished` (started, result unknown) or `unstarted` (never reported), never assumed, and rows that arrived survive a timeout. The G0 proof of a
  sample is reused for the other arm only when the digest of the full canonical input (level, solution, givens, signs), the source fingerprint and the guard settings is
  identical (`validationReusedFrom`); the arm that runs first in a pair is diagnosed in full. The probe rows follow the same rule: the second-running arm's rows are **reused
  copies** of the first-running arm's executed group checks (`reusedFrom`); the reports list executed checks and reused copies apart and never call the sum independent
  executions.
- **The miss predicate.** The named trap is exactly: a complete canonical rating below the requested band AND `finalClues <= minClues + 1` AND an independently proved
  minimal sign set. The disjoint split is exact; shallow in-band; above / not rated / stuck; below + named trap; below + post-setup tune reveal; below + no tune reveal +
  setup at least two above the floor; other / unknown below; unconfirmed (no independent canonical rating). Lower and upper trap shares are reported with the minimality
  coverage; an ending category is not an intervention coverage.
- **Stage time.** The request's time is split into full-grid / model setup, sign placement, setup-clue placement, the first technique sign pass (the only stage G1 changes),
  later technique passes, minimal passes, tuning, the part after the strategy (safety count, rate step), local search and the remainder; the measured local-stage time is
  reported beside the old request-group share, by cohort and arm, with the engine wall of the same requests as denominator.
- **Comparisons and controls.** Every ratio is G0 / G1 (below 1: G1 took longer); a ratio of cohort totals and a median of per-pair ratios are labelled apart and an unresolved CPU
  interval is unknown (null). The two observer-free controls (`observer-control`) are singletons, time-separated from their G0 request and a separate population: they are checked for
  source, trace, configuration and output-digest compatibility with the captured G0, do not establish population-wide overhead and correct no G1 timing.
- **Report writer.** `ig09-aggregate.cjs` is a harness file, so a report written after the commands carries its own writer fingerprint (and revision label) beside the fingerprint the
  commands recorded; `--dry-run` prints the summary markdown and writes nothing. A budget-limited run lists its never-started rows as unstarted (not excluded, failed or replaced).
  The revision r2 (`--suffix=-r2 --revision=r2`) publishes beside the preserved r1 files: the counter units, the executed versus reused probe split, the failure accounting (a
  recorded stop is never a met T01), the diagnosis allowance, and the wait provenance (the ledger-recorded waits of the shard / control commands are a known partial figure, not an
  all-task total; the development check's wait is unknown; the charge is reconciled with the common budget reader, the development check charged once).

## IG-S10: reconciliation and the frozen-rerun handoff (pre-MS07)

Analysis only: one shard (`reconcile`, kind `analysis`) through the same dispatcher and the same low-priority wrapper (a 4-minute allocation: 45 s quiet-admission grace plus
analysis). It loads no engine, starts no worker and generates no puzzle; `run.cjs` sends an `analysis` shard to `ig10-run.cjs` `runAnalysis` before any host exists. Everything
is provisional (pre-freeze); the real `gate.json` stays `not-evaluable-pre-freeze`.

```powershell
# the plan (no engine, nothing timed, nothing written)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S10 -Round provisional-r1 -PlanOnly
# the one reconciliation shard (the synthetic tests first; nothing is written if one fails)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S10 -Round provisional-r1
# development only, no engine, no thread, nothing written: the 33 pure cases, and the whole build in memory
node generator\tests\artifacts\improve-generating\phase0\ig10-test.cjs
node generator\tests\artifacts\improve-generating\phase0\ig10-run.cjs --dry-run [--no-tests] [--out=<folder inside the harness>]
# revision r2 (after the pack author's review of r1): unwrapped and read-only, no engine, no worker, no ledger entry; writes the six r2 files once beside the unchanged r1 files
node generator\tests\artifacts\improve-generating\phase0\ig10-run.cjs --write-r2
# frozen closure, after the separately approved frozen tasks and both receipts (gate.json, coverage.json and budget-summary.json of the frozen round)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S10 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

- **Outputs** (round folder `docs/improve-generating/evidence/phase0/provisional-r1/`, written once, `report.json` carries the hashes of the others): `coverage.json`,
  `budget-summary.json`, `gate.json`, `frozen-rerun-plan.json`, `report.json`, `report.md`; the shard evidence (`IG-S10/reconcile/`: `command.json`, `records.json`, `summary.json/md`,
  journal, firewall) is the usual one. **Revision r2** adds `coverage-r2.json`, `budget-summary-r2.json`, `gate-r2.json`, `frozen-rerun-plan-r2.json`, `report-r2.json` and
  `report-r2.md` beside them (the r1 files stay unchanged; every r2 document carries `revision.supersedes` with the r1 hashes, the r1 command's harness fingerprint and the r2 writer's
  distinct harness fingerprint; `report-r2.json` carries the hashes of the others). r2 corrects the verdict scope and statistics, the final accounting (IG-S10's own ledger entry and the
  0.470 s IG-S07 pre-check debit, kept apart from the wrapped-command counts), the projection packing and the frozen-input validation.
- **Inputs.** The accepted revisions only (IG-S02 `summary-r2` with the Killer audit sidecar, IG-S03 `summary-r3`, IG-S04 `summary-r2` and `budgets-r2`, IG-S05 `summary-r2`, IG-S07
  `summary-r2`, IG-S08 `summary-r3`, IG-S09 `summary-r2`), each hashed; the raw records behind the headline pairs, the grid trials and the Greater-Than pairs are recomputed and
  checked against the summaries (a cross-check that disagrees stops the shard). A missing document stops: absent evidence is never a silent exclusion.
- **Coverage.** Every manifest key of IG-S01 to IG-S09 is completed, completed by audit overlay (the six IG-S02 Killer rows whose stored records stay `error`), budget-ended, censored,
  an error, validation unknown or explicitly unstarted; IG-S06 is deferred (no manifest). Duplicate keys, a record outside the manifest, a lost key, another runtime, changed sources, a
  firewall difference, a label other than provisional or a gate state other than `not-evaluable-pre-freeze` are problems and stop the shard. Commands outside every shard (audit, retest,
  development check) and observations that enter no count are listed. The harness never runs git.
- **Estimate table.** The check-list's thirteen rows with original estimates labelled P. No numeric verdict threshold is used (the pack names none): a "Today" anchor and an SM1 share are
  shown with their descriptive difference; the S5a factor follows the IG-S02 rule against the report's planning range (no pair reaching it is labelled "planning-factor estimate refuted
  on these pairs", which does not refute the usefulness of the improvement); partial S3 had no assigned gain forecast and reads "no material net gain demonstrated" (the median of the
  paired incremental ratios) with the full-S3 forecast untested/inconclusive.
  Cohorts are never mixed: trace-off headline pairs (IG-S02/S03), two-sample grid trials (IG-S04/S05), profiled requests (IG-S07), the censored attribution (IG-S08), the trace-summary
  Greater-Than cohort (IG-S09). The IG-S09 counter erratum (`counts.dfsEntries` are `countSolutions` calls) is applied everywhere.
- **Gate evaluator** (`gate.cjs`, pure): input is records; it returns the receipts' state, the limits comparison, per decision cell the 40-cluster coverage, verified hit rates per CPU
  and wall second over all spent work, paired whole-cluster bootstrap differences against both native kinds, non-inferiority on positive-baseline cells, the projection inputs on
  zero-baseline cells and the request-level on-time exact lower bound (exact one-sided 95 % binomial, seeds assumed independent). It never returns a go or a no-go: the cell verdicts are
  `invalid-evidence`, `inconclusive` or `inputs-collected-awaits-author-decision`; without an approved assumption set the projection is `projection-awaits-author-review`; sample-only
  evidence is `not-established-sample-only` at request level. Invalid evidence (`frozen-invalid-evidence`, the gate stays disabled): a claimed-exact grid trial or full request whose
  verification failed, a planned grid or request seed list that is not distinct (forty copies of one seed), a grid trial whose cluster is not its seed. In the frozen closure the receipt's
  `limitsAndDefaults` keys (`defaults`, `guards`, `budgetHash`) are compared with the run's catalogue defaults, guards and the frozen IG-S04 budget hash. Decision owners are the plan author
  (Fable), advised by the pack author (Astra).
- **Frozen plan** (`frozen-rerun-plan.json`): a PROPOSAL that grants nothing. For each task the exact command, `-PlanOnly` form, dependencies, population, the frozen manifest, the adapter
  dry run on today's runtime and the planning-scenario cost (the first round's measured occupied time scaled to the frozen population plus 45 s per command, against the dispatcher's
  admission plan, which is a planning figure and not a guaranteed upper bound; IG-S09's unstarted rows priced between the lowest and highest observed pair, IG-S08's censored tail with its
  lower bound and a guard-limited planning figure, no inferred ceiling). IG-S06 is not implemented: its populations (two modes x 40 requests on four cells, plus the 201/202 diagnostic
  population), formula, per-phase command counts and a guard scenario (one command per request at the 180 s request guard plus the 60 s validation guard; omitted components listed, so an
  incomplete upper bound) and a conditional proposal are listed. Wordoku, sohei, flower and butterfly are four separate unapproved Nightmare extensions (pilot 11, 12, SM2 101-140,
  requests 201-240) priced from named proxies with a scenario band; the pilot, the screen and the requests are separate commands (each at least one, recomputed for the low, central and
  high scenario).
