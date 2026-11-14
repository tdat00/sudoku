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
