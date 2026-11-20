# MS05r4 — Measure all settings and select the recovery default

| Header | Value |
|---|---|
| Depends on | MS05r3 step evidence complete; requiredness active, normal allowance still Infinity |
| Size / active time | Medium; 45-60 minutes plus runs |
| Machine time | Approximately 25-90 minutes; projected per invocation, never >540 s |
| Acceptance | Step evidence only after finite selection, classified focused checks and original-limit preflights; no commit |
| Authority | S-OD2; absorbed MS05d selection; unchanged R5, plus adopted non-selecting diagnostics |
| Status | Not started |

## Goal & business context

Choose by the owner's unchanged six-cell rule, while returning the G13/mega trade-offs for
**all four settings**. A winner of none is a valid experiment result but an explicit recovery
stop, not permission to proceed with the failed interim contract.

## Scope

In: 12 full-request diagnostic runs, 288 R5 requests, checked aggregation, one selected default,
widened focused checks/pin triage, original-limit G13/mega preflights and documentation.
Out: changing the selector, any other engine policy, caps, weights,
requests, recorder/test guards, fixture data, G13 persistence or mega fallback assertions.

## Repository rules

AGENTS/checklist; no Git/ref/pack/log edits. Preserve the old MS05b1 evidence and every trial;
use new paths. One sequential process, no `--jobs`, no concurrent timing work with Pentomino.
Announce every matrix/shard to the orchestrator and use the shared lock/540-second helper.

## Inputs & context

### A — Non-selecting diagnostics, first

Use MS05r1's exact cases G13 (samurai/nightmare/42), mega12-nightmare (seed 3) and
mega16-nightmare (seed 3), each at **none, 64, 128, 256**, one invocation per case/setting:
12 outcomes. `--mode=diagnostic` retains the full normal attempt limit (8), not the profile's 1.
The driver uses its documented 500 s diagnostic ceiling, never the closure test contract.
Do not reuse MS05r1's one-attempt profile as a full-request none control.

Retain outcomes, partial errors, exactness/quality, all work/cap hits, samples versus local
time and full request time. These three requests are **not selection cells**, cannot veto a
rule-winning value in favor of a convenient alternative, and cannot change the measured winner.
They expose a reason to stop for the owner when that winner does not recover the existing gates.

### B — Exact R5 selector, unchanged

> Choose the smallest finite cap with no exact-hit loss in any cell against no extra cap and a
> strict reduction in median full ratings in at least one cell. Otherwise choose no extra cap.

| Variant | Levels |
|---|---|
| classic9 | normal, master, nightmare |
| killer | hard, expert |
| jigsaw9 | expert |

Four settings: 64/128/256/none, twelve requests per cell per setting, seed base 20260101:
**24 cells / 288 primary requests**. Keep the existing direct/pipeline routes and derived tags,
not literal puzzle seeds 1..12. Every error/timeout is a miss; retain work on failed requests.
Use **`row.generationExact === true`** after r2/r3, verified against the derived certificate.
Never count old score-only hits or only the independently referenced endpoints.

Compute each cell's integer hit count and upper-median fullRatings: sort all 12 known counts
and take index `floor(12/2)`. Unknown work is not zero; missing work/completeness blocks the
selection. Timing, fallback quality, proposals and diagnostics A are reported, not extra
selection criteria. No per-variant allowance, early statistical guess or new seventh cell.

### Checked input/selection output

Use the existing soak container `{schema,complete,meta,rows,summary}`. Merge only complete,
compatible spans for each `(setting,variant,requested)`; require indexes 0..11 once, correct
tags/seeds, same source/tool/Node/settings other than the compared cap, and conserved work.
Do not join partial killed requests to replacement runs or average shard medians.

Write `docs/difficulty-v3/evidence/MS05r4/selection.json` with source/config/manifest hashes,
all 24 per-cell counts/medians, comparisons to none, the eligible finite list, chosen value
(`null` for none), and all diagnostic outcome paths. Keep a human-readable report in
`docs/difficulty-v3/shallow-cap-2026-11-13.md` (actual date if later).
A small task-owned aggregation script may live under
`generator/tests/artifacts/difficulty-v3/MS05r4/`; record its source/hash and test it on fake rows.

The experiment runs on one frozen, instrumented source with normal default Infinity. After
selection, the **only production edit** is `SG.digger.SHALLOW_SEARCH_RATINGS`'s default literal.
Record before/after source identities and that exact diff; all four trials used overrides on
the same pre-default source. No need to pretend those trial files were generated from the later
default-literal hash. Final GG/GR/quick will use the actual final source, without overrides.

### C — Focused checks on the selected default (FS29/FS31)

After setting the literal, run the wider suite selection and both pipeline filters below,
with **no allowance override**. The scoped Infinity of a specific no-allowance-premise test
is r3's test setup, not an override around these commands or around ordinary generation.

Classify every failure before proceeding:

| Class | Owner/action |
|---|---|
| Work schema or an explicit/implicit no-additional-allowance premise (such as the sign-memo test) | Return to r3 for its narrowly assigned correction; keep the behavioral assertion and restore any scoped setting |
| Genuine default-coupled datum: an exact old puzzle/trace/work pin changes, while the **same behavioral requirement** remains satisfied | Record the exact file/full name/assertion, old/actual values, source/default, rationale and preservation proof in the manifest below; do not edit it here; r6a owns the reviewed pin |
| Validity, requiredness/exactness requirement, uniqueness, cancellation, work conservation, cap/budget/latency contract, or an unexplained difference | Stop/report; never relabel a contract failure as a pin or an availability miss |

No weakened true/false correctness requirement, timing limit, seed/count, request, or emptied
test is a “pin update”. A doubtful classification stops for the orchestrator. A premise-only
test correction does not automatically invalidate R5; compare the actual source/tool identities.
Any changed production/instrumentation/measurement input requires replacement of affected
evidence before selection can be trusted.

Write `docs/difficulty-v3/evidence/MS05r4/default-pin-manifest.json`, even when empty:

```text
schema:1, selectedDefault, sourceHash, node, selections:[{args,exit,counts,transcript}],
pins:[{app,suite,file,fullName,assertion,oldValue,actualValue,reason,
       preservedRequirement,proof,owner:'MS05r6a'}],
returnedPremises:[], blockers:[]
```

Only completely explained, specifically owned data pins may remain for r6a. All other focused
failures must be resolved through their assigned owner or stop the recovery. The orchestrator
reviews this list before r6a dispatch; it is not blanket permission to edit quick assertions.

### D — Original-limit preflights before r5/b3 (FS27)

The diagnostic's 500 s ceiling, instrumentation and seed-3 sample do **not** close the original
contracts. Run these checks **now**, after the finite default and C, before spending time on
r5 or b3. Failure is the S-OD2 owner stop; never select a different setting to evade it.

1. Generate the **actual G13 fixture request**, normal attempts/default and no diagnostic
   override, under its original **120000 ms** generation guard. Record time, attempts,
   score/exact/required/warnings and copied work. This is a generation-only preflight, not
   a golden, saved wire or independent-validity pass.
2. Run each original mega Nightmare two-test group separately, retaining the four seeds 1..4
   and CV5's 3/3/4, the **60000 ms** generation guard and unchanged
   `timeLimit(3000)` / `timeLimit(10000)` assertions. Record the actual factor/environment.
   A fallback is not exempted.
3. Each verbose mega result must show exactly the two named tests, two passes, no skips and
   exit 0. A failed callback may abort its seed loop: do not report the remainder as run.

Create `generator/tests/artifacts/difficulty-v3/MS05r4/g13-closure.cjs`, accepting only the
required fresh project-relative `--json` path. Its one generation call is:

```js
const path = require('path');
const loader = require(path.resolve('tests', 'replay-fixtures.js'));
const env = loader.nodeEnv();
env.engine();
const SG = loader.loadFixtures(['tests/fixtures/replay-goldens.js']);
const g = SG.fixtures.replayGoldens.find((entry) => entry.id === 'G13');
if (!g || g.request.variantId !== 'samurai' || g.request.difficulty !== 'nightmare' ||
    String(g.request.seed) !== '42' || loader.BUDGET_MS !== 120000) {
  throw new Error('G13 closure request/guard changed');
}
const result = SG.pipeline.run(SG.store.toConfig(g.request), null,
  SG.budget.create({ ms: loader.BUDGET_MS }));
```

Validate CLI/path/non-overwrite before generation; wrap that call with a wall timer and
truthful catch/write. Save loader/source identity, script hash, request/config, selected
default, Node/machine, guard and outcome. Copy `result.work`; partial error work may be null
with a reason, never zero. Exit 1 for a generation error, 0 only for a completed run.
No instrumentation wrapper, second request, retry, source patch, saved puzzle or 500 s
replacement guard. Keep the script and evidence for r6a's final-source compatibility check.

For mega retain the **complete console output verbatim**, command/exit/duration and identities
under `evidence/MS05r4/preflight/mega12-nightmare.txt` and `mega16-nightmare.txt`, with sidecar
metadata (source, runner/harness/suite hashes, default, Node and actual time factor).
The flags available here are `--suite`, `--filter`, `--verbose`; **do not use `--list-tests`,
`--exact` or `--results` before r5 implements them**. Preserve raw transcripts, not merely
an edited summary. They are early guard evidence, not r5-format final quick coverage rows.

## Files to create/modify (exclusive ownership)

- Evidence/MS05r4, the cap report, v3 notes; optional owned aggregation script.
- `generator/tests/artifacts/difficulty-v3/MS05r4/g13-closure.cjs` and raw preflight transcripts/
  metadata; the default-pin manifest above. No new public runner feature.
- Only the allowance default literal in `generator/js/engine/digger.js` if a finite value wins.
- Generator design 6.8/15.4 and both developer guides for the actual selected value/evidence.
- No instrumentation repair, other source change, test expectation update or canonical fixture write.
  If instrumentation needs a fix, return it to r3 and replace affected experiment evidence.

## Implementation steps

1. Freeze source/Node/config; declare the 12 diagnostic and 288 selecting request manifests.
2. Record all 12 non-selecting diagnostics, inspecting data fields, not just driver exit codes.
3. Run all 24 R5 cells in bounded absolute-index shards, retaining all errors and reference outcomes.
4. Validate completeness/conservation; calculate the rule literally and publish the decision.
5. **If none wins, stop.** Send the 24-cell comparison and all 12 diagnostic outcomes to the owner;
   leave Infinity and do not dispatch r5/b3/r6a/r6b or refresh E.
6. If finite wins, set only that default and document it. A selected-setting diagnostic with an
   invalid result, generation error or incomplete evidence also stops for the owner.
   A slow successful diagnostic is not a passed latency assertion or permission to pick another value.
7. Run C's widened focused checks; resolve r3-owned premises and record only specifically
   justified genuine pins for r6a. Preserve the same R5 source identity or replace affected data.
8. Run D's original-limit G13/mega preflights. A failure stops **before r5 and b3** with the
   four-setting diagnostic table; no cap, guard, factor, fallback assertion or request change.
9. Hand the finite default, passed guards, full data and reviewed pin list to r5/b3/r6a/r6b.
   No combined acceptance yet.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r4-B01 | The owner's fixed hit/work rule, not a desired runtime or guessed number, selects the default |
| MS05r4-B02 | None, a failed selected diagnostic or an original-limit guard failure returns to the owner before r5/b3 |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r4-T01 | Exactly 288 selecting and 12 separate full-request diagnostic outcomes, or an explicit stopped/incomplete manifest |
| MS05r4-T02 | Per-cell hits/upper medians, conservation, errors, identities and shard coverage checked |
| MS05r4-T03 | None blocks progress; finite selection changes only the default literal and matching docs |
| MS05r4-T04 | Widened focused selections complete; schema/premise fixes are resolved and only reviewed genuine pins remain assigned to r6a |
| MS05r4-T05 | Original G13 and both unchanged mega Nightmare groups pass, with full evidence and no r5-only flags |
| MS05r4-T06 | Driver/aggregator checks pass; final E/full quick/GD remain for r6a/r6b, not the early guard decision |

## Test plan and commands

Pure aggregation cases: smallest eligible 64 wins; a one-hit loss in any cell disqualifies it;
128 wins when 64 loses but 128 preserves every cell with improvement; all ties/no strict work
improvement select none; error rows stay in 12; unknown work/duplicate/gap/mixed source rejects.

From Generator, examples below are **one invocation each**, not the complete manifest:

```powershell
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\difficulty-recovery.js','--mode=diagnostic','--case=G13','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05r4\diagnostic\none\G13.json')
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\difficulty-recovery.js','--mode=diagnostic','--case=mega12-nightmare','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05r4\diagnostic\none\mega12-nightmare.json')
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\difficulty-recovery.js','--mode=diagnostic','--case=mega16-nightmare','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05r4\diagnostic\none\mega16-nightmare.json')
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\soak.js','--variant=classic9','--level=normal','--count=12','--seed=20260101','--no-gate','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05r4\selection\none\classic9-normal.json')
```

Repeat the three diagnostic cases at 64/128/256, and the six selecting cells at every setting.
Prefer a twelve-request cell only when its projection fits; otherwise preserve the logical
12-request manifest with these r3 shards (example Killer Expert):

```powershell
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\soak.js','--variant=killer','--level=expert','--from=0','--count=6','--total-count=12','--seed=20260101','--no-gate','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05r4\selection\none\killer-expert-00-05.json')
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\soak.js','--variant=killer','--level=expert','--from=6','--count=6','--total-count=12','--seed=20260101','--no-gate','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05r4\selection\none\killer-expert-06-11.json')
```

Smaller spans, down to one original request, are allowed with unchanged indexes/total. No restarts
at index zero. A single request that cannot finish is recorded incomplete and escalated, not dropped.
`--no-gate` does not mean invariants passed. Inspect every row/check; malformed/missing evidence blocks.

Widened post-default checks, all through the shared helper. `-AllowExit1` is solely for
capturing/classifying a specifically justified data-pin failure, never permission to carry
an unexplained or contractual failure forward:

```powershell
Invoke-Dv3Node -Task MS05r4 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=digger,difficulty-diagnostics,difficulty-floor,worker,cache,recovery-profile','--verbose')
Invoke-Dv3Node -Task MS05r4 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=pipeline','--filter=MS05b1-','--verbose')
Invoke-Dv3Node -Task MS05r4 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=pipeline','--filter=recovery: shallow allowance','--verbose')
```

Use the same locked form for the pure aggregator checks (the owned script's tested CLI).
Each selection must run its intended nonzero cases. If the combined suite projection exceeds
450 s, split by its unchanged suite names, not by omitting cases.

Then the mandatory original-limit preflights:

```powershell
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\artifacts\difficulty-v3\MS05r4\g13-closure.cjs','--json=..\docs\difficulty-v3\evidence\MS05r4\preflight\G13.json')
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega12 nightmare:','--verbose')
Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega16 nightmare:','--verbose')
```

The mega names are “4 puzzles are unique, valid and inside the 9.1 time budget” and
“the same seed gives the same puzzle (CV5)” under the respective Nightmare group.
Verify both full names and the two-test summary, not just exit 0.

Jobs 1/no `--jobs`. Initially allow 1-300 s per diagnostic (up to 500 s with its explicit guard),
roughly 5-240 s per selecting cell, and 2-8 minutes total for the original-limit preflights;
revise from the profiles. Total planning allowance **25-90 minutes**, including focused checks,
always <=540 s/process and projected <=450 s for compound runs. Announce/lock every command.
No GG/GR, full quick, qualification, GP or generated manual corpus yet.

## Stop rules

None winner: **mandatory owner stop**, even though none is mathematically permitted by R5.
Selected-setting invalid/error diagnostic, missing work/outcome, source drift, unclassified/
contractual focused failure or **any original-limit preflight failure**: stop and report.
Only C's reviewed data pins may await r6a; a returned r3 premise is not resolved by listing it.
Never replace the winner, broaden a budget, return a time-driven fallback,
persist G13 or alter mega's assertions. The default alone is not combined acceptance.

## Definition of done & handoff

Return the rule calculation, all 300 selecting/diagnostic outcomes or exact stopped manifest,
source/default diff, classified focused results, pin manifest and original-limit preflight
records/transcripts. Only finite trustworthy selection **and passed guards** enable r5/b3/r6a.
MS05r6a rechecks identities on the final source; these early transcripts do not replace its
current-source quick/result protocol. MS05r6b alone owns combined acceptance.
The orchestrator records **step evidence complete**, not a branch commit or acceptance.

## Execution log

| Field | Value |
|---|---|
| Status | Stopped at an S-OD2 stop point: R5 selected 256 (made the default), G13 passes its original guard, both mega Nightmare preflights fail their original limits; owner question CV6-03. No acceptance and no commit of its own (combined commit after MS05r6b) |
| Start | 2026-11-13 11:46 (+07:00) |
| End | 2026-11-13 13:34 developer; 13:36 orchestrator review |
| Duration | 1 h 48 min developer (Node time 61.5 min in 54 locked commands, lock waits 17.7 min); about 3 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 151 model calls; 37,641,802 input tokens (37,273,986 cache reads); 175,047 output tokens |
| AI credits | about 640 (developer) |
| Verification | Developer, every command through the verbatim helper (`runs.jsonl`): 12 diagnostics all `ok` and complete; 28 selecting ledgers (classic9 normal/master/nightmare and killer hard/expert whole, jigsaw9 expert in two shards, at none/256/128/64) all PASS, 0 errors; focused checks at the 256 default: the six-suite selector 463/463, `--filter=MS05b1-` 30/30, the allowance selector 16/16, `help` and `ui-contract` 97/97; `select-cap.cjs` self-test 18/18, mutation check 11/11; preflights under the original limits (see Acceptance). Orchestrator: evidence and selection read; no re-run (the stop is a decision, not a defect) |
| Acceptance | MS05r4-B01, B02 and T01..T04, T06 met; T05 not met (mega). R5 (hits of 12 / upper median of full ratings), none / 256 / 128 / 64: classic9 normal 10/75 at all; classic9 master 12/4 at all; classic9 nightmare 2/1,417, 2/1,345, 1/1,000, 0/616; killer hard 0/512, 0/512, 0/512, 0/497; killer expert 0/2,250 (64: 0/2,238); jigsaw9 expert 11/318, 11/318, 11/260, 11/170. 64 and 128 lose a classic9 nightmare hit; 256 is the only eligible setting (a 5 % median reduction in one cell; the rule is met as written). Diagnostics (same puzzle hash at every setting): G13 220.5 / 104.6 / 86.7 / 80.0 s, not exact; mega12 65.1 / 47.1 / 43.8 / 39.4 s, not exact; mega16 388.7 / 310.2 / 296.3 / 270.4 s, exact at attempt 6; ordinary samples (G13 74 s, mega12 38 s, mega16 264-281 s) are the same at every setting. Preflights at 256: G13 passes (104.7 s of 120 s); mega12 fails (48.2 s against 6,000 ms); mega16 fails (`budget.exceeded` at the 60 s guard). The only production edit: `SHALLOW_SEARCH_DEFAULT` `Infinity` to `256` (`digger.js:653`), engine source hash `19afa6ee...` to `9a833d93...` |
| Issues & resolutions | (1) S-OD2 stop: no allowance value can bring mega Nightmare under its original limits (the ordinary samples alone exceed them); the developer stopped as required; question CV6-03 (SA2 writes it, SA1 cross-checks) for the plan author and the owner. (2) The developer added `Run-Dv3Logged.ps1` and `runs.jsonl` to capture transcripts and lock waits (the helper unchanged). (3) The preflights ran with `-AllowExit1` to capture the failing output; the real exit code 1 is recorded. (4) `default-pin-manifest.json` lists the two mega failures under `blockers`. (5) Not run by scope: the full `pipeline`, `mega`, `steps`, `replay` and `player` suites, GG, GR and the manual corpora (other puzzles may change under 256; that surfaces in MS05r6a/r6b). (6) No overlap with Pentomino; 15 s pauses kept |
| Handoff | MS05r5, MS05b3 and MS05r6a wait for the CV6-03 decision. When resumed: default 256, source hash `9a833d93...`, the pin list empty, G13 passed (104.7 s, 87 % of its guard; `preflight/G13.json` and `g13-closure.cjs` reusable); the mega evidence under `evidence/MS05r4/preflight/` and `diagnostic/` |
