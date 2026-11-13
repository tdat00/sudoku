# MS07c — Select short-chain cutoff from exact hits

| Header | Value |
|---|---|
| Depends on | MS07b accepted |
| Size / active time | Medium; 40-55 minutes plus GS/GP-cost and conditional E |
| Owner / milestone | Solver evidence; M7c selected default |
| Authority | R9/R23; owner SA1-Q-S1(c) |
| Status | Not started |

## Goal & business context

Measure C=4 and C=6 on fresh generation requests, not on the old fixed-board re-scoring sample.

## Scope

In: soak cutoff override/tests, bounded split-ID cost record, 72-request experiment, one selected
SHORT_MAX default, resulting fixtures/docs and a Hell 1 pilot repeat if the default changes.
Out: changing long maximum 12, depths, weights, other caps or offers.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Never count floor-stuck Hell 1 as exact Nightmare.

## Inputs & context

R9, verbatim:

> Select the cutoff with **more exact hits in total; C=6 on a tie**. Report each variant, timings and
> shallow outcomes separately. Run GQ-first only after the selected default is in force without an override.

For each C, 12 fresh Nightmare requests of classic9, diagonalX and jigsaw9, using soak base
20260101. Total 36/C, 72 overall; every timeout/error is a miss. Keep all other defaults fixed.
The old fixed-board observation (C6: 0/12 exact; C4: 2/12, not 6) is not this experiment's denominator.
Unchanged low-depth default 2 and long ceiling 12; order remains 198.
Resume anchor: `core/js/engine/tech-chain.js:389-429` (`function findForcingChain`);
the mutable SHORT_MAX is delivered by MS07b; this task supplies the diagnostic override.

### Measurement tooling transferred from MS07b (FS18)

Add `--chain-window=4|6` to `generator/tests/soak.js`, off by default. Reject every other value
before generation with the existing CLI error exit (2), even with `--no-gate`. After loading
the registry, set `SG.chainSearch.SHORT_MAX` once, before prefix/reference checks and requests;
no weight, order, band or other limit changes. Do not add a production/user setting.
Record the effective cutoff and explicit override/null in diagnostic configuration so shard
merges cannot mix C=4 with C=6. Existing `--from/--total-count` and absolute tags remain unchanged.
Quick tests use scripted requests to prove the initial default 6, overrides 4/6, invalid-input rejection
before any request and setting/merge identity; explicitly reject otherwise-compatible C=4/C=6
shards in the same merge. Restore the runtime value in `finally`.
Once selection changes the default to 4, update only the preparatory default premise accordingly;
retain both override tests. Do not leave a universal "default is 6" assertion to fail final checks.

At c9935cd the parser is `parseArgs` (`soak.js:127`), runtime overrides follow source loading
at 273-295, and `prefixViolationOf` immediately follows. Find those symbols after MS06.
Do not regress r2's prefix validation or r5p's default-attempt behavior.

Use MS07a's cost CLI on the newly registered real positive/negative fixtures after choosing the
default. Its fixed 20 runs/case measure work/cap/latency, never alter the C selection rule.

## Files to create/modify

- `docs/difficulty-v3/chain-window-2026-11-12.md` (actual date if later), evidence/MS07c, v3 notes.
- Only the SHORT_MAX default in `core/js/engine/tech-chain.js`, if winner differs.
- `generator/tests/soak.js`, its diagnostic helper/suite for the override/config/shard checks.
- Affected E/B examples/current expectations; design and bilingual guides' selected cutoff facts.
  Update Generator design 15.3/15.4 and both developer guides for the new override/metadata even
  when the selected default stays 6.

## Implementation steps

1. Implement/test the cutoff override and metadata; then record settings/source and six cells.
   Run both values with identical requests/configuration.
2. Check all outcomes/invariants; total exact counts, then apply tie=6.
3. Set the selected default if needed; rerun affected E/GH and window tests without overrides.
4. Record split-ID cost with the selected default. If C changes from 6, repeat MS07b's two-request
   Hell 1 pilot once on this source and update the unchanged 20-request GD projection.
5. Hand the recorded value, cost and latest Hell 1 projection to MS07d/e and final recheck owners.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07c-B01 | Cutoff follows the owner's exact-hit rule, not an analyst's preferred value |
| MS07c-B02 | Variant losses, errors and cost remain visible |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07c-T01 | All 72 fresh outcomes, no mixed defaults or missing denominators |
| MS07c-T02 | Chosen no-override windows pass boundary/ID/minimum tests |
| MS07c-T03 | Validated override/config/shards, allowed default-only production change, real split-ID cost evidence and both quick sets pass |
| MS07c-T04 | Latest Hell 1 pilot matches the selected cutoff, or explicitly identifies the unchanged C=6 predecessor evidence |

## Test plan and gates

Generator:

```powershell
node tests\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=4 --json=..\docs\difficulty-v3\evidence\MS07c\4\classic9-nightmare.json
```

Repeat with diagonalX/jigsaw9 and C6, unique paths. If default changes, complete E GG/GR/GH under
MS07c; exact first hash and analysis shards:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS07c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS07c\analysis\G01.json
Invoke-Dv3Node -Task MS07c -NodeArgs @('tests\pattern-cost.js','--ids=forcingChainLong,nishioDeep','--runs=20','--json=..\docs\difficulty-v3\evidence\MS07c\pattern-cost.json')
# Only if the selected default changed from 6; the two pilot requests do not enter the 72-request selection.
Invoke-Dv3Node -Task MS07c -NodeArgs @('tests\soak.js','--variant=classic9','--level=hell1','--from=0','--count=2','--total-count=2','--seed=20260101','--no-gate','--json=..\docs\difficulty-v3\evidence\MS07c\hell1-pilot.json')
```

Player refresh/check affected chain IDs with the MS07b curated source map and --ids/--sources/
--max-puzzles=16/--max-hints=400, E's exact GH recipe. Generator
`--suite=tech-chain,techniques,technique-weights,difficulty-floor,difficulty-diagnostics,pattern-cost-tools`,
then both quick sets. Jobs=1, no --jobs; 10-540 seconds/cell, 10-60 minutes GS plus conditional
10-90 minutes E, 1-30 seconds cost and initially 1-300 seconds for the optional pilot.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
No qualification until this selection is complete; use the shared lock and 540-second command
ceiling. Use MS05c's absolute-index shards if a whole soak cell cannot fit; never restart seeds.

## Definition of done & handoff

Report selected C, tested override/identity, per-variant counts/times, split-ID cost, latest Hell 1
pilot/projections, complete paths and refreshes. MS18 repeats the rule;
a different final choice goes to the owner, not an automatic retune.

## Resume rules — S-OD4

Review: analyst cross-review. Correctness/evidence corruption or changing a recorded decision stops;
performance/availability becomes a named numerical item for MS07e then MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s; preserve exact absolute-index
shards and the current bounded quick manifest. No new slow-cell evidence class/tooling task.
Any authorized new suite owns its CI group/manifest entry after r6c.
Return the inherited/new item list, selected default and exact coverage/source identities.

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
