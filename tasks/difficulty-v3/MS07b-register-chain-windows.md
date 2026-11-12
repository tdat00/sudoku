# MS07b — Register chain/depth windows with complete integration

| Header | Value |
|---|---|
| Depends on | MS07a accepted |
| Size / active time | Medium, upper end; 55-60 minutes plus E/GH/cost |
| Owner / milestone | Shared solver and both apps; M7b split catalogue |
| Authority | R9/R10/R20/R21; SA1-Q-S1, SA2-Q-S04/S08/S11 |
| Status | Not started |

## Goal & business context

Distinguish short/long chains and shallow/deep Nishio in ratings and hints, including when a single
ID is invoked alone. C=6 is only the initial measurement configuration, not the selected winner.

## Scope

In: wrappers, two new IDs, costs/weights, fixtures/locales/help, diagnostic cutoff override.
Out: selecting C, grouped nodes, qualification/offers, default depth3.

## Repository rules

AGENTS/checklist and integration bundle B. No Git/pack/log writes, synthetic help examples or deferred
new-ID integration. All four IDs must work at one accepted boundary.

## Inputs & context

R9 table, verbatim:

| ID | Weight | Order | Window |
|---|---:|---:|---|
| forcingChain | 1100 | 190 | 1..C links |
| forcingChainLong | 1400 | 198 | C+1..12 links |
| nishio | 1700 | 200 | depth 1 |
| nishioDeep | 2600 | 202 | minimum 2; default maximum 2, explicit maximum 3 |

New baseCosts: forcingChainLong=118, nishioDeep=210; group chain, unscoped, no uniqueness assumption.
Keep existing costs. Expose `SG.chainSearch.SHORT_MAX`, initially 6, read at each wrapper call.
Soak gains `--chain-window=4|6`, off by default. It changes no weights or gate verdicts.

Caller options are existing `maxChainLength` and `maxNishioDepth`: absent/non-number/NaN uses the
ID default; numeric values are floored; <=0 disables; larger values/Infinity are clamped to the ID
ceiling. Long cannot return <=C, deep cannot return depth1; deep default2, explicit larger maximum
clamped to3. Search from depth/length1 to prove the minimum, then filter by the ID window.

Finding (R10):

```text
{technique:id,cells:number[],placements:[cell,digit][],eliminations:[cell,digit][],
 i18nKey:string,i18nArgs:plain cloneable data}
```

Chain keys in BOTH apps/languages: name, desc, `.step.endpoints`, `.step.contradiction`,
`.step.forced`. Deep Nishio needs name/desc/`.step`. Keep numeric digit argument conventions.
Two real positive exact-Finding fixtures and one negative per new ID; use <=4 short and >=7 long
fixtures/examples where possible so either measured cutoff is valid. Archive unchanged v2
forcingChain/nishio fixture records; use current overrides for the new definitions, not old labels.
Update current reference expectations, record reclassifications; never fit weights to labels.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `core/js/engine/tech-chain.js:114-128`, `function chainLimit` | Wrapper override semantics |
| `core/js/engine/tech-chain.js:516-538`, `id: 'forcingChain'` | Registrations |
| `core/tests/suites/tech-chain.test.js:818-920` | Generic long-proof tests use unregistered seam |
| `generator/tests/soak.js:87-88` | Add diagnostic parser branch |

## Files to create/modify

- `core/js/engine/tech-chain.js`, its suite; `generator/tests/soak.js` and diagnostics tests.
- Full B for four affected IDs: weights, active/current fixtures, current registry order, both apps'
  locales/help/tests, real help catalogue, v3 notes; E generated fixtures.
- Generator design 6.6/13.6 and Player hint design; both user/developer guides.

## Implementation steps

1. Wire windowed kernels, exposed C and the two registrations/weights at final orders.
2. Add fixture/window regressions and full locale/help integration, preserving historical records.
3. Add soak override and measured path histograms; no production floor solve.
4. Capture real sources separately with --record-sources, combine maps, publish a complete catalogue.
5. Run E, cost records and quick sets; hand provisional C=6 to selection.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07b-B01 | Labels name the minimum represented proof window, not whichever ID was allowed |
| MS07b-B02 | Each new ID has a real, correctly replaying explanation |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07b-T01 | C/C+1/12/13 and depth1/2/3, alone/mixed, invalid/off/oversized options pass |
| MS07b-T02 | Catalogue is 28/23 unscoped; monotone weights, cost table and full B pass |
| MS07b-T03 | Cancellation/exhaustion cannot publish an unproved minimum |
| MS07b-T04 | Both quick sets, E, real GH and bounded cost evidence pass |

## Test plan and gates

Generator: `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor,difficulty-diagnostics`.
Both quick sets. Full E with MS07b (GG/GR); first commands:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS07b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS07b\analysis\G01.json
node tests\pattern-cost.js --ids=forcingChainLong,nishioDeep --runs=20 --json=..\docs\difficulty-v3\evidence\MS07b\pattern-cost.json
```

Player GH discovery source command (repeat separately for deep with `--ids=nishioDeep --levels=hell1`):

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChainLong --discover --variants=classic9 --levels=nightmare --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS07b\long.json
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong,nishio,nishioDeep --sources=tests\artifacts\difficulty-v3\MS07b\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong,nishio,nishioDeep --sources=tests\artifacts\difficulty-v3\MS07b\sources.json --max-puzzles=16 --max-hints=400 --check
```

Use existing/curated sources first; complete the source map for all selected IDs. Follow B's finite
discovery limit; missing real examples block, never synthesize them. Jobs=1, no --jobs. Estimate
10-90 minutes E, 1-30 seconds cost, 10-480 seconds per discovery. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Ten-minute command ceiling.

## Definition of done & handoff

Report provisional cutoff, exact windows, current-reference changes and source manifests. MS07c
selects C; this task makes no qualification claim or offer change.

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
