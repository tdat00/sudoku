# MS07c — Select short-chain cutoff from exact hits

| Header | Value |
|---|---|
| Depends on | MS07b accepted |
| Size / active time | Small; 25-35 minutes plus GS/E |
| Owner / milestone | Solver evidence; M7c selected default |
| Authority | R9/R23; owner SA1-Q-S1(c) |
| Status | Not started |

## Goal & business context

Measure C=4 and C=6 on fresh generation requests, not on the old fixed-board re-scoring sample.

## Scope

In: 72-request experiment, one selected SHORT_MAX default, resulting fixtures/docs.
Out: changing long maximum12, depths, weights, other caps or offers.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Never count floor-stuck Hell1 as exact Nightmare.

## Inputs & context

R9, verbatim:

> Select the cutoff with **more exact hits in total; C=6 on a tie**. Report each variant, timings and
> shallow outcomes separately. Run GQ-first only after the selected default is in force without an override.

For each C, 12 fresh Nightmare requests of classic9, diagonalX and jigsaw9, using soak base
20260101. Total 36/C, 72 overall; every timeout/error is a miss. Keep all other defaults fixed.
The old fixed-board observation (C6:0/12 exact; C4:2/12, not6) is not this experiment's denominator.
Unchanged low-depth default2 and long ceiling12; order remains198.
Baseline anchor: `core/js/engine/tech-chain.js:387-429` (`function findForcingChain`);
the mutable SHORT_MAX/override were delivered by MS07b.

## Files to create/modify

- `docs/difficulty-v3/chain-window-2026-11-12.md` (actual date if later), evidence/MS07c, v3 notes.
- Only the SHORT_MAX default in `core/js/engine/tech-chain.js`, if winner differs.
- Affected E/B examples/current expectations; design and bilingual guides' selected cutoff facts.

## Implementation steps

1. Record settings/source and six cells. Run both values with identical requests/configuration.
2. Check all outcomes/invariants; total exact counts, then apply tie=6.
3. Set the selected default if needed; rerun affected E/GH and window tests without overrides.
4. Hand the recorded value to MS07d/e and final recheck owners.

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
| MS07c-T03 | Only allowed default/derived evidence changes; quick sets pass |

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
```

Player refresh/check affected chain IDs with the MS07b curated source map and --ids/--sources/
--max-puzzles=16/--max-hints=400, E's exact GH recipe. Generator `--suite=tech-chain,techniques,technique-weights,difficulty-floor`,
then both quick sets. Jobs=1, no --jobs; 10-540 seconds/cell, 10-60 minutes GS plus 10-90 minutes E.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
No qualification until this selection is complete; ten-minute command ceiling.

## Definition of done & handoff

Report selected C, per-variant counts/times, complete paths and refreshes. MS18 repeats the rule;
a different final choice goes to the owner, not an automatic retune.

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
