# MS05r1 — Profile the preserved requiredness-active candidate

| Header | Value |
|---|---|
| Depends on | MS05a at `f788e02`; existing uncommitted MS05b1 tree preserved by the orchestrator |
| Size / active time | Medium; 45-60 minutes |
| Machine time | Approximately 3-15 minutes; three separate one-request profiles, each <=540 s |
| Acceptance | Step evidence complete only; no branch acceptance or commit |
| Authority | CV6-02(a), owner S-OD2 and orchestrator adoption of SA1 diagnostic points 1/2 |
| Status | Not started |

## Goal & business context

Find whether G13/mega time is spent in ordinary samples or in the local continuation that R5
can limit. Keep the existing requiredness implementation and its 149 improved fixed puzzles;
do not restart from HEAD or copy the backup ref over the working tree.

The orchestrator has a first private backup at `refs/dv3-wip/MS05b1-20261113-0650`.
It is a recovery reference, not a branch checkpoint or developer Git permission.

## Scope

In: a small reusable Node diagnostic driver, pure driver tests, the three one-attempt profiles
and their report. No production edit, new allowance/default, fixture rewrite or guard relaxation.
MS05b1 remains open. MS05r2/r3 follow when this step's evidence is reviewed; only MS05r6 may
claim the combined acceptance. No G13 saved-wire expansion or changed mega fallback assertion.

## Repository rules

AGENTS/checklist; no staging, commits, stashes, resets, pushes, branch/ref changes, pack/log edits.
Classic test fixtures, built-in Node modules only. UTF-8/no BOM, CRLF, final newline, no trailing
whitespace. Project-relative artifacts only. Never run two heavy/timing commands on this machine.

**Announce every profile to the orchestrator first (Pentomino shares this machine).** Use
checklist section 7's `Invoke-Dv3Node`: wait for `dv3-timing.lock` to disappear, exclusively
acquire `dv3-sudoku.lock`, recheck, run one attached bounded command and remove only the owned
lock. Define/dot-source the helper in the same shell call. Jobs 1; no `--jobs`.

## Inputs & context

### Fixed diagnostic requests

| Driver case ID | Base request | Profile-only change |
|---|---|---|
| G13 | Actual `SG.fixtures.replayGoldens` G13 request -> `SG.store.toConfig`; samurai/nightmare/seed 42 | `maxAttempts: 1` |
| mega12-nightmare | `{variantId:'mega12', difficulty:'nightmare', seed:3, trace:'off'}` | `maxAttempts: 1` |
| mega16-nightmare | `{variantId:'mega16', difficulty:'nightmare', seed:3, trace:'off'}` | `maxAttempts: 1` |

Seed 3 is the existing mega CV5 repeat seed, not a newly searched fast example. Keep these
identities in all later diagnostic settings. Do not equate G13's seed 42 with CV3's seeds 1/2.
Read maxAttempts from the normalized configuration: it is 1 here, ordinarily 8 later.
Do not reduce `digTries`, attempt rating/proposal caps, floors, symmetry or the sample schedule.

Recorded interim data: G13 took 219.7 s over eight attempts with a 500 s diagnostic budget,
but its recorder fails at 120 s. Mega quick generation uses a **60 s** guard; its Nightmare
design assertions are 3000/10000 ms times the actual test factor (normally 6 s/20 s).
This profile does not satisfy those acceptance guards or latency assertions.

### Driver and transparent observation

Create `generator/tests/difficulty-recovery.js` with a main guard and exported pure helpers.
CLI:

```text
--mode=profile|diagnostic --case=G13|mega12-nightmare|mega16-nightmare
[--shallow-cap=64|128|256|none] --json=<project-relative file>
```

Profile mode permits only absent/none and sets maxAttempts 1. Diagnostic mode requires one of
the four values, keeps the full base request's normal attempts and requires MS05r3's runtime
allowance API; before that API exists, reject diagnostic mode before generation.
Neither mode is an acceptance run. One process executes exactly one case, never a hidden loop.
Reject overwriting an existing evidence file.

Use the existing `tests/replay-fixtures.js` Node loader (`nodeEnv().engine()`) and load the
golden requests with its `loadFixtures`. Do not clone the engine or patch its source strings.
Temporarily wrap **exported** `SG.digger.generateSteps` to capture its returned `work` before
the current pipeline drops that field. Delegate with `yield*`, unchanged arguments/options
except a diagnostic stage observer; preserve the returned object and every yield.

The pipeline already supplies `options.stage`. Wrap it with a generator delegate whose
`isStepStage === true`, `timings` aliases the original, and `current` reads the original.
Time each original stage call in `try/finally`; pass its body through untouched. The pipeline
keeps its original stage/budget/clock, and its error handler still sees the original current stage.
No new emitter verbosity, RNG draw, solve, cap or production clock decision.

Track ordinary versus local triplets by the stage arguments, not a guessed strategy label:

```text
within one attempt, a dig stage with a newly increasing args.sample starts an ordinary sample
the one extra dig stage with the SAME last args.sample starts local continuation
its following rate/tune stages belong to that same triplet
finalize:true tune is separate; fullGrid/extraStructure are separate
```

The local continuation currently inherits the ordinary strategy label. Do not classify it
from `args.strategy`. Assert at most one repeated-sample continuation per attempt, no
overlapping stages and every completed triplet's identity; otherwise record an instrumentation
error, not a fabricated split.

To retain partial counters on an exception, transparently wrap the registered `cells` strategy
using get/unregister/register before pipeline configuration. Save its existing `options.caps`
reference for the current attempt, then return the original strategy's result/iterator unchanged.
These three requests use cells; no variant algorithm is replaced. Copy counters at boundaries
and on exit; never retain live objects in the JSON. Restore both wrappers in `finally`.
On success reconcile these snapshots with the actual returned `puzzle.work`.

Count full ratings independently with a scoped wrapper around `SG.difficulty.rate` if needed
for attribution; it must only delegate/count and be restored. Do not wrap the exported
`rateCounted` expecting to intercept private calls inside `digger.js`.

### What to record

```text
schema, complete, mode, caseId, baseRequest, normalizedConfig, effectiveMaxAttempts,
capSetting, sourceHash, toolHash, commit, dirty, node, machine, jobs:1,
diagnosticBudgetMs:500000, generationMs, validationMs,
outcome:'ok'|'generation-error'|'validation-error'|'instrumentation-error',
error:{code,message}|null, attempts, samples, exact, required, score, warnings, puzzleHash,
work:[{ratings,proposals,maxRatings,maxProposals,...}], workUnavailableReason,
segments:[{attempt,sample,kind:'sample'|'local'|'other',stepId,ms,complete,...}],
summary:{sampleMs,localMs,otherMs,sampleRatings,localStageRatings,otherRatings}
```

Use one **500000 ms diagnostic budget for the entire invocation's engine/validation work**,
as in the recorded diagnostic, leaving margin below the 540 s process limit. This is not a
change to the recorder's 120000 ms or mega's 60000 ms guards. Keep timing outside deterministic
work records. Samples include their proposal refinement; local-stage totals include the local
triplet, not merely a solver call. Reconcile additive work; label partial/unavailable counts,
never substitute zero. Timing totals may differ by observer/rounding overhead; report that residual.

After generation timing, check givens/solution consistency, `model.isSolution` and independent
uniqueness using the **same remaining budget**. Derive requiredness from the complete canonical
rating on the returned model. A failed validation is not a valid fallback. No fresh 500 s
budget for validation after an already long generation.

Write a complete outcome row even for a caught diagnostic budget error, preserving its code
and partial work; exit 0 means the diagnostic row was written, not that generation passed.
Exit 2 for invalid CLI/path/source setup, 1 for inability to produce a trustworthy complete
diagnostic record. A process killed at 540 s is incomplete even if an earlier partial file exists.
Later selection/closure reads outcome explicitly, never only exit code.

### Anchors in the current MS05b1 tree at `f788e02`

| File:line / quote | Contract |
|---|---|
| `generator/js/engine/pipeline.js:69-97`, `const maxAttempts`, returned config | Existing supported profile option |
| `:222-234`, `yield* SG.digger.generateSteps` | Exported capture seam and supplied stage |
| `generator/js/engine/digger.js:106-150`, `isStepStage`, `resolveStage` | Transparent stage-delegate shape |
| `:1724-1763`, sample loop / `strategy: searchStrategy(attemptBest)` | Increasing sample IDs, then repeated last ID |
| `:1825-1828`, `work: work.map` | Existing per-attempt counters |
| `generator/tests/suites/mega.test.js:653-658,703-711` | 60 s helper and seed-3 CV5 repeats |

## Files to create/modify (exclusive ownership)

- New `generator/tests/difficulty-recovery.js`, optional pure fixture helper
  `generator/tests/fixtures/recovery-profile.js`, new `generator/tests/suites/recovery-profile.test.js`.
- `generator/tests.html` for a new fixture/suite; Node discovers it automatically.
- Both developer guides and Generator design 15.4 for this diagnostic command, explicitly
  not a production setting or a passing performance gate.
- `docs/difficulty-v3/evidence/MS05r1/`, v3 notes and `docs/difficulty-v3/recovery-profile.md`.
- No existing application, assertion, recipe, golden, hash or developer-evidence overwrite.

## Implementation steps

1. Inventory the preserved MS05b1 diff/evidence; record source identity, not acceptance.
2. Implement/test the driver on scripted stage streams and a small real control.
3. Before any consumer/allowance edits, run the three fixed one-attempt profiles separately.
4. Report ordinary-sample versus local time/work, including an irreducible sample-cost warning
   where applicable. Do not choose an allowance from these three non-selecting requests.
5. Hand the immutable driver/profile to MS05r2/r3/r4. The orchestrator backs up new files too.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r1-B01 | The owner can see which work an R5 allowance can and cannot reduce |
| MS05r1-B02 | Existing requiredness work and fixed request identities are preserved |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r1-T01 | Exactly three fixed profiles, maxAttempts 1, all original other settings/guards documented |
| MS05r1-T02 | Transparent delegation/yields/results, stage classification, work reconciliation and restoration tested |
| MS05r1-T03 | Outcome/error/partial-counter evidence is truthful and each invocation bounded |
| MS05r1-T04 | Focused tests pass; no production/fixture change, no acceptance claim |

## Test plan and commands

Script ordinary samples 1/2 followed by repeated 2 local, no-local exact stop, finalize tune,
two attempts, exception during local, invalid repeated IDs and restoration after an error.
A small classic4 control through the observation seam must keep givens, rating, exactness,
dig log, RNG results and deterministic counters identical (exclude clocks).

From Generator, through the shared lock:

```powershell
Invoke-Dv3Node -Task MS05r1 -NodeArgs @('tests\node-runner.js','--suite=recovery-profile,ui-contract,help')
Invoke-Dv3Node -Task MS05r1 -NodeArgs @('tests\difficulty-recovery.js','--mode=profile','--case=G13','--json=..\docs\difficulty-v3\evidence\MS05r1\profile\G13.json')
Invoke-Dv3Node -Task MS05r1 -NodeArgs @('tests\difficulty-recovery.js','--mode=profile','--case=mega12-nightmare','--json=..\docs\difficulty-v3\evidence\MS05r1\profile\mega12-nightmare.json')
Invoke-Dv3Node -Task MS05r1 -NodeArgs @('tests\difficulty-recovery.js','--mode=profile','--case=mega16-nightmare','--json=..\docs\difficulty-v3\evidence\MS05r1\profile\mega16-nightmare.json')
```

Expected 1-180 s per profile initially, at most 500 s engine/validation and 540 s process;
roughly 3-15 minutes machine time including focused checks. Report actuals. No GG/GR, full
quick, manual suite, GQ or GP at this step.

## Stop rules

Stop for invalid/ambiguous results, unreliable work/stage attribution, unexpected source change,
a failed focused test or an incomplete 540 s invocation. A one-attempt diagnostic miss/shallow
fallback is expected and is not closure failure; retain it. If even the short profile cannot
complete, return its partial data to the orchestrator/owner, not a larger cap or guard.

## Definition of done & handoff

Reply with step evidence, source/tool hashes, counts/times, profile table and file list.
**Step evidence complete is not combined acceptance.** No branch commit; the orchestrator
records the handoff/backup and may dispatch MS05r2 on this same tree.

## Execution log

| Field | Value |
|---|---|
| Status | Step evidence complete (S-OD2: no acceptance and no commit of its own; the combined acceptance and the one commit come after MS05r6b) |
| Start | 2026-11-13 09:30 (+07:00) |
| End | 2026-11-13 10:11 developer; 10:16 orchestrator review |
| Duration | 41 min developer (of which about 12 min waiting for the timing slot); about 5 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 138 model calls; 40,432,566 input tokens (39,956,580 cache reads); 227,971 output tokens |
| AI credits | about 747 (developer) |
| Verification | Developer: `--suite=recovery-profile,ui-contract,help` 123/123 (4.9 s), before and after the docs; profiles through `Invoke-Dv3Node`, one request each, `maxAttempts: 1`: G13 `ok` complete (24.8 s), mega12 Nightmare seed 3 `ok` (7.5 s), mega16 Nightmare seed 3 `ok` (82.5 s); CLI refusal probes exit 2 and write nothing. Orchestrator re-run: `node tests\node-runner.js --suite=recovery-profile,ui-contract,help` 123/123 (4.8 s); engine hashes unchanged |
| Acceptance | MS05r1-B01, B02 and T01..T04 met as step evidence. Per request (generation; ordinary samples / local continuation; ratings ordinary / local; ended by): G13 24.4 s; 10.2 s (42 %) / 14.1 s (58 %); 19 / 1005; the 1024-rating cap. mega12 7.0 s; 4.2 s (61 %) / 2.7 s (39 %); 20 / 615; the proposal cap. mega16 79.7 s; 54.9 s (69 %) / 24.7 s (31 %); 39 / 985; the 1024-rating cap. All three end not exact, with `difficulty.approximate` and `difficulty.shallow`. Evidence: R5 can shorten only the local continuation; mega16's ordinary samples alone are 92 % of mega's 60 s quick guard, and mega12's 615 local ratings mean an allowance above 615 changes nothing there. New files: the CLI `generator/tests/difficulty-recovery.js`, `fixtures/recovery-profile.js`, `suites/recovery-profile.test.js` (26 tests), `docs/difficulty-v3/recovery-profile.md`, `evidence/MS05r1/`; no engine, fixture, golden or hash change |
| Issues & resolutions | (1) Incident: one inline `node -e` (about 70 s: samurai Easy and Hard, the full 8-attempt mega12 Nightmare) ran outside `Invoke-Dv3Node`, possibly overlapping a Pentomino timing slot (MP10b2's page loop); none of its numbers are in the evidence; reminded for later tasks. (2) Lock starvation: Pentomino's 20-run page loop (MP10b2) freed the timing lock for about 1 s every 40-80 s, the helper polls every 5 s, so the first G13 call timed out after 10 minutes without starting; orchestrator rule from now on: a loop of locked runs leaves at least 15 s between releasing and taking the lock again. (3) The task's get/unregister/register strategy wrapper is impossible (`unregisterStrategy('cells')` returns false, `registerStrategy` throws on a duplicate); `SG.digger.getStrategy` is wrapped instead, no production edit. (4) `sourceHash`/`toolHash` defined by the developer; the record carries extra descriptive fields. (5) Suite counts updated in both developer guides and `generator/design.md`. (6) 27 lines of the new suite exceed 110 characters (the 110 limit is for the engines; existing suites reach 121) |
| Handoff | MS05r2: no consumer work from r1; the new fixture and suite are in `tests.html` and the guide counts. MS05r3: diagnostic mode is refused until `SG.digger.SHALLOW_SEARCH_RATINGS` exists; it then sets `Infinity` for `none` or 64/128/256 and restores the old value, keeping 8 attempts; `work` is deep-copied, reconciliation compares only the four base fields. MS05r4: read `outcome` and `complete`, not just the exit code; a new path per cell (the CLI refuses an existing file); a full `none` mega16 (8 attempts, about 640 s) may give a valid `budget.exceeded` row; a full G13 is about 220 s |
