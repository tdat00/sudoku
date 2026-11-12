# MS05d — Select the common shallow-search allowance

| Header | Value |
|---|---|
| Depends on | MS05c accepted |
| Size / active time | Small; 25-40 minutes, plus measurement/gates |
| Owner / milestone | Generator evidence; M5 requiredness budget selected |
| Authority | R5/R23; SA2-Q-S12(c) |
| Status | Not started |

## Goal & business context

Choose the smallest justified extra allowance, not a convenient constant. Account for failures and
fallback quality, and leave all existing attempt limits and weights alone.

## Scope

In: fixed six-cell/four-setting experiment, chosen default only, evidence and its resulting refreshes.
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

### Anchors at `2c665bb`

| File:line / quote | Context |
|---|---|
| `generator/js/engine/digger.js:630-641`, `const CAP_RATINGS` | Existing bounds remain fixed |
| `generator/tests/soak.js:202-228`, `function seedFor` | Same derived streams |
| `generator/tests/soak.js:401-419`, `const ok = failed === 0` | --no-gate never means invariants passed |

New setting/counters are the contracts delivered by MS05c, not baseline anchors.

## Files to create/modify

- `docs/difficulty-v3/shallow-cap-2026-11-12.md` (use actual run date in filename if later);
  `docs/difficulty-v3/evidence/MS05d/`; v3 notes.
- Only the `SG.digger.SHALLOW_SEARCH_RATINGS` default in `generator/js/engine/digger.js`, if selected.
- E's resulting fixtures; relevant Generator design 6.8/15.4 and both developer guides.

## Implementation steps

1. Record source/config and a complete manifest before running; use distinct setting directories.
2. Run all 24 cells, inspect invariants/errors and check every denominator.
3. Compute the rule literally; record per-cell hits, full-rating median, p50/p95/max time and quality.
4. Set the one shared default, or keep Infinity. Test its normal no-override path.
5. If default changed, perform complete E. Record the selected value for MS06 and MS18.

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

## Test plan and gates

From Generator, first cell/setting:

```powershell
node tests\soak.js --variant=classic9 --level=normal --count=12 --seed=20260101 --no-gate --shallow-cap=64 --json=..\docs\difficulty-v3\evidence\MS05d\64\classic9-normal.json
```

Repeat the exact flags for every table cell and each setting (including `--shallow-cap=none`);
the path includes the setting. Use the complete E GG/GR recipe with task MS05d if the default changes:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS05d\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05d\analysis\G01.json
```

After selecting the default, run the group's one full GD:

```powershell
node tests\node-runner.js --suite=difficulty
```

I5/digLevel/soundness must pass. Intermediate hit-rate shortfalls are recorded as availability
evidence, not weakened assertions. GD planning allowance1-8 minutes.

Jobs=1, no --jobs. Allow 10-540 seconds/cell, approximately 0.5-4 hours for GS; E may add 10-90
minutes. These are planning allowances; stop/investigate at ten minutes. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Incomplete evidence blocks selection.
Then Generator `--suite=digger,difficulty-diagnostics` and both quick sets. No GQ.

## Definition of done & handoff

Report the selected value, 24-cell results, errors and actual timings. MS18 repeats this exact rule
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
