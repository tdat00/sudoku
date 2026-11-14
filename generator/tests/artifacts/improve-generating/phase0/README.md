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
