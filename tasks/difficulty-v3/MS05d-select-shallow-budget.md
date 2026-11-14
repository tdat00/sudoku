# MS05d — Selection and closure absorbed by MS05r4/MS05r6

| Header | Value |
|---|---|
| Depends on | No independent dispatch; r4 selection retained, closure r6a/r6b/r6c after r5p/r5/r5m/b3 |
| Size / active time | Absorbed; see MS05r4, MS05r6a and MS05r6b |
| Owner / milestone | Generator evidence; M5 requiredness budget selected |
| Authority | R5/R23; SA2-Q-S12(c); S-OD2 recovery |
| Status | Superseded as a dispatch and acceptance boundary |

## Current routing — binding S-OD2-S-OD4 amendment

[MS05r4](MS05r4-select-recovery-allowance.md) already ran the unchanged 288-request R5 selector,
selected **256**, and stopped at original mega limits. Retain all twelve diagnostics and failed
preflights as history. S-OD3/S-OD4 answer that stop; do not rerun selection or restore Infinity.
r5p changes only the size-dependent attempt policy; all six selection boards still default to 8.

[MS05r6a](MS05r6a-final-evidence-and-pins.md) persists G13 first, then rechecks the approved
contracts and records 520/5/14 E/pins. [MS05r6b](MS05r6b-quick-gd-and-combined-acceptance.md)
reconciles r5m deep records, b3's live CV3 outcomes (Addendum B1) and items, classic9 GD and full quick
evidence. r6c CI follows inside the same combined commit; MS05e waits for it. Performance-only stops in
the archived body below are superseded by S-OD4; a changed final choice at MS18b still needs a decision.

| Retained requirement | Current evidence owner |
|---|---|
| MS05d-B01/B02, T01/T02 | MS05r4 full six-cell, four-setting comparison; literal R5 selector |
| MS05d-T03 | MS05r4 default-only edit; MS05r6a final E/pins and MS05r6b full quick |
| MS05d-T04, original GD | MS05r6b complete classic9 and explicit outstanding CV3 coverage |

The old dispatch/independent-gate commands, pre-selection b3 sequence and statements permitting
progress after none below are **archived**, not current authorization. Future references to
the “MS05d selected default” mean r4's value accepted at r6b. MS18b repeats the unchanged rule.
Leave the Execution log for the orchestrator's combined sign-off.

## Archived pre-S-OD2 specification

## Goal & business context

Choose the smallest justified extra allowance, not a convenient constant. Account for failures and
fallback quality, and leave all existing attempt limits and weights alone.

## Scope

In: fixed six-cell/four-setting experiment, chosen default only, evidence and its resulting refreshes;
the named post-selection closure of MS05b3's explicitly deferred per-level CV3 checks (FS26).
Out: any other search/solver adjustment, per-variant values, qualification/support changes.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Each run obtains the shared-machine slot. Do not hide
timeouts under --no-gate or substitute a probe with different seeds.

## Inputs & context

R5, verbatim:

> Choose the smallest finite cap with no exact-hit loss in any cell against no extra cap and a strict
> reduction in median full ratings in at least one cell. Otherwise choose no extra cap.

Settings: 64, 128, 256, none; cells:

| Variant | Levels |
|---|---|
| classic9 | normal, master, nightmare |
| killer | hard, expert |
| jigsaw9 | expert |

Twelve requests/cell/setting, seed base 20260101: 288 primary requests. Use soak's preserved direct/
pipeline routes, derived tag seeds, current default budgets and upper median. All errors/timeouts
are misses. Compare each cell, not a pooled hit rate. Work on failed requests remains recorded.
Choose using integer exact-hit counts and full-rating medians; timing/fallback scores are reported,
not extra selection criteria. No finite winner is also an approved result.

### Anchors

The engine anchor is at `2c665bb`; soak anchors are at `f788e02` after MS02's additions.
MS05b2/MS05c move them further: find the quoted text and use the accepted shard/counter contracts.

| File:line / quote | Context |
|---|---|
| `generator/js/engine/digger.js:630-641`, `const CAP_RATINGS` | Existing bounds remain fixed |
| `generator/tests/soak.js:260`, `function seedFor(tag)`; `:267-283`, `function generateOne` | Same derived streams |
| `:353`, `const t0 = process.hrtime.bigint()` | Generation timing boundary |
| `:586`, `const ok = failed === 0 && lowLevels.length === 0 && lowOthers.length === 0` | --no-gate never means invariants passed |

New setting/counters are the contracts delivered by MS05c, not baseline anchors.

## Files to create/modify

- `docs/difficulty-v3/shallow-cap-2026-11-12.md` (use actual run date in filename if later);
  `docs/difficulty-v3/evidence/MS05d/`; v3 notes.
- Only the `SG.digger.SHALLOW_SEARCH_RATINGS` default in `generator/js/engine/digger.js`, if selected.
- E's resulting fixtures; relevant Generator design 6.8/15.4 and both developer guides.

## Implementation steps

1. Record source/config and a complete manifest before running; use distinct setting directories.
2. Run all 24 cells, inspect invariants/errors, require MS05c's per-request work conservation and
   check every denominator. Missing work or an incomplete shard blocks selection, not just its JSON writer.
3. Compute the rule literally; record per-cell hits, full-rating median, p50/p95/max time and quality.
4. Set the one shared default, or keep Infinity. Test its normal no-override path.
5. If default changed, perform complete E. Record the selected value for MS05e, MS06 and MS18.
   MS05e owns the immediate post-selection Greater-Than baseline/repair; do not turn it into a
   seventh selection cell or change R5's six-cell rule.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05d-B01 | No measured per-cell hit loss is exchanged for a faster chosen cap |
| MS05d-B02 | The chosen value or none has complete, reproducible evidence |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05d-T01 | Exactly 288 requests accounted for, with failures in denominators |
| MS05d-T02 | Smallest qualifying finite cap wins; strict median improvement is required |
| MS05d-T03 | Default-only code change, matching E if changed, both quick sets green |
| MS05d-T04 | The deferred-CV3 manifest is reconciled after selection; completed selectors have total 1, and any uncompleted cell remains a reported blocking gate, not a passed result |

## Test plan and gates

From Generator, first cell/setting:

```powershell
Invoke-Dv3Node -Task MS05d -NodeArgs @('tests\soak.js','--variant=classic9','--level=normal','--count=12','--seed=20260101','--no-gate','--shallow-cap=64','--json=..\docs\difficulty-v3\evidence\MS05d\64\classic9-normal.json')
```

Repeat the exact flags for every table cell and each setting (including `--shallow-cap=none`);
the path includes the setting. These are one selected cell per command, jobs=1, no `--jobs`.
Use smaller shards if a whole cell cannot safely fit 540 seconds; for example, replace one
logical 12-request cell by the following two commands, not by two restarted index 0 samples:

```powershell
Invoke-Dv3Node -Task MS05d -NodeArgs @('tests\soak.js','--variant=killer','--level=expert','--from=0','--count=6','--total-count=12','--seed=20260101','--no-gate','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05d\none\killer-expert-00-05.json')
Invoke-Dv3Node -Task MS05d -NodeArgs @('tests\soak.js','--variant=killer','--level=expert','--from=6','--count=6','--total-count=12','--seed=20260101','--no-gate','--shallow-cap=none','--json=..\docs\difficulty-v3\evidence\MS05d\none\killer-expert-06-11.json')
```

Merge raw rows by absolute index, require exactly 0..11 once and compatible source/settings, and
recompute medians from the rows. A failed whole-cell attempt stays recorded; never double-count
its partial output together with replacement shards.

Use the complete E GG/GR recipe with task MS05d if the default changes:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS05d\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05d\analysis\G01.json
```

After selecting the default, obtain **complete GD coverage**, not one unbounded invocation.
Start with the Nightmare batch alone, retaining it as the first coverage shard:

```powershell
Invoke-Dv3Node -Task MS05d -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >')
```

`difficulty.test.js` caches **per level** (`batch(level)`, lines 1213-1226 at the reviewed source),
so the filter isolates that 100-request batch. Do not then rerun the whole suite and repeat it.
Finish every other offered level and every non-batch group using checklist section 7's GD manifest.
Each filter must select tests; record selected counts and prove complete, nonduplicated coverage.
Plan approximately 6-10 minutes of total GD work at this milestone, measured and split into commands
under 540 seconds. If one unchanged-count group itself exceeds the bound, stop/report for assigned
bounded tooling; do not raise the ceiling, reduce its request count, kill and blindly rerun it.
MS05b3's manifest distinguishes completed early I5/CV3 checks from explicitly deferred CV3
levels. This task also owns that **deferred list only**, after the default is selected.
Re-project it on the selected source/allowance; when <=450 seconds, run its exact original
`--suite=variants` / `--filter=> variants: <id> > CV3 <level>:` selector under the shared lock,
same 2/3-request counts and seeds, and require selected total 1 in the runner summary.
Retain outcomes under `docs/difficulty-v3/evidence/MS05d/deferred-cv3/`. If still projected
above 450 seconds or without a credible bound, do not launch it: retain the outstanding gate
and report it to the orchestrator for bounded completion. Deferral is not a pass and cannot
silently be pushed to release. It adds no R5 selection cell or criterion.

For example, **only if this cell is in that manifest and its post-selection projection fits**:

```powershell
Invoke-Dv3Node -Task MS05d -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=variants','--filter=> variants: samurai > CV3 nightmare:','--verbose')
```

Jobs 1/no `--jobs`, same 540-second process ceiling; use the recorded projection instead of
an invented fixed wall-time estimate. Keep the transcript and actual duration in the directory above.

**CV6-02 note:** this is only FS26's evidence-owner handoff, not a change to the b1-b2-b3-c-d
order, acceptance boundary or quick gates. Reconcile it with the answer when that is received.
Do not rerun unbounded whole-variant corpora or claim pre-allowance timings use the chosen default.

I5/digLevel/soundness failures block. Intermediate hit-rate shortfalls are availability evidence.
A median-time failure at a level whose exact-hit rate fell because of requiredness is also recorded
as a **failed assertion**, with its counts and time, and handed to MS18d; it does not by itself
invalidate R5's cap selection. Never edit `BUDGET_MS` or claim GD passed in that case. Unexplained
timeouts/invalid results are not excused as availability. Final release still needs an explicit
disposition of remaining failures. CV6 belongs to MS05e under S-OD1, not this GD.

Jobs=1, no --jobs. Allow 10-540 seconds/cell, approximately 0.5-4 hours for GS; E may add 10-90
minutes. These are planning allowances; stop/investigate at ten minutes. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Incomplete evidence blocks selection.
Use the shared lock for all runs over 10 seconds, quick suites included.
Then Generator `--suite=digger,difficulty-diagnostics,worker,cache` and both quick sets. No GQ.

## Definition of done & handoff

Report the selected value, 24-cell results, complete shard manifest, conservation checks, errors,
GD failures/coverage, the exact deferred-CV3 outcomes/outstanding gate list and actual timings.
R5's selected value is not by itself closure of an outstanding CV3 gate.
MS05e receives the no-override default for its control.
MS18 repeats this exact rule
and manifest; a changed final choice requires the owner before a new implementation task.

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
