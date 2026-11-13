# MS07b — Register chain/depth windows with complete integration

| Header | Value |
|---|---|
| Depends on | MS07a accepted |
| Size / active time | Medium; 50-60 minutes plus E/GH and a two-request Hell 1 pilot |
| Owner / milestone | Shared solver and both apps; M7b split catalogue |
| Authority | R9/R10/R20/R21; SA1-Q-S1, SA2-Q-S04/S08/S11 |
| Status | Not started |

## Goal & business context

Distinguish short/long chains and shallow/deep Nishio in ratings and hints, including when a single
ID is invoked alone. C=6 is only the initial measurement configuration, not the selected winner.

## Scope

In: wrappers, two new IDs, costs/weights, fixtures/locales/help and the bounded Hell 1 pilot.
Out: selecting C, soak cutoff tooling or GP-cost records (both MS07c), grouped nodes,
qualification/offers, default depth 3.

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
MS07c adds the soak `--chain-window=4|6` override and cost measurements; neither is needed for
this coupled registration/locales/help commit.

Caller options are existing `maxChainLength` and `maxNishioDepth`: absent/non-number/NaN uses the
ID default; numeric values are floored; <=0 disables; larger values/Infinity are clamped to the ID
ceiling. Long cannot return <=C, deep cannot return depth 1; deep default 2, explicit larger maximum
clamped to 3. Search from depth/length 1 to prove the minimum, then filter by the ID window.

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

### Real source and non-vacuous Hell 1 handoff (FS18/FS19)

After registration, Hell 1's tier contains `nishioDeep`: its weight 2600 gives the unrounded
lower term `1.25 * 2600 = 3250`, below Hell 1's maximum 3600 but not Nightmare's 2400.
Hell 1 is no longer a vacuous exactness case; each miss can consume every attempt.

Inspect/replay the existing real `SG.helpExamples.nishio.source.puzzle` before discovery.
At reviewed `f788e02`, `player/js/ui/help-examples.js:46` has
`hint.stepArgs.depth: 1`, source `Classic Sudoku 9x9,Hell 1,8`, step 17.
Its old requested label is **not** evidence of depth 2. Prefer it for shallow `nishio` if it
still replays under the new registry; do not relabel its Finding as `nishioDeep`.
If the current source actually exposes a minimum-depth-2 Finding after replay, it may supply
deep instead, with a different real depth-1 source for shallow. Every snapshot must be generated
by the real Player and match the registered window, never hand-transformed.

Acquire a genuine depth-2 source within B's four batches/48 requests, first from existing
real unique fixtures, then the bounded Hell 1 discovery command below. A missing source blocks;
report the exact attempts and missing ID rather than expanding the bound or faking a snapshot.

After integration/GH and with provisional C=6, run the two-request classic9 Hell 1 pilot below
once. Retain both request outcomes, exact/shallow/error status, per-request ms, counts and
source/defaults. Project the unchanged 20-request Hell 1 GD batch as `20 * mean(ms)` and the
serial-equivalent first 40 GQ requests as `40 * mean(ms)`; GQ's jobs-4 scheduling/early stops
make that an estimate, not a proof of its wall time. Report a GD projection >450 seconds
before its owner starts. Never raise the 540-second process ceiling.
MS07c repeats this pilot only if selecting C=4 changes the default/source; MS07e uses the latest
applicable measurement, not an old vacuous-tier timing. Pilot requests are not selection hits.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `core/js/engine/tech-chain.js:114-128`, `function chainLimit` | Wrapper override semantics |
| `core/js/engine/tech-chain.js:516-538`, `id: 'forcingChain'` | Registrations |
| `core/tests/suites/tech-chain.test.js:818-920` | Generic long-proof tests use unregistered seam |
| `player/js/ui/help-examples.js:46` at `f788e02`, `nishio:` / `"depth":1` | Inspect the old real source; not an assumed deep example |

## Files to create/modify

- `core/js/engine/tech-chain.js`, its suite. `generator/tests/soak.js` is read/run, not edited.
- Full B for four affected IDs: weights, active/current fixtures, current registry order, both apps'
  locales/help/tests, real help catalogue, v3 notes; E generated fixtures.
- Generator design 6.6/13.6 and Player hint design; both user/developer guides.

## Implementation steps

1. Wire windowed kernels, exposed C and the two registrations/weights at final orders.
2. Add fixture/window regressions and full locale/help integration, preserving historical records.
3. Check/replay the existing shallow source and acquire the genuinely deep source within B's bound.
4. Capture real sources separately with --record-sources, combine maps, publish a complete catalogue.
5. Run E, quick sets and the two-request Hell 1 pilot; hand provisional C=6, source maps and
   observed/projection timings to MS07c/MS07e. Cost recording and override tooling belong to MS07c.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07b-B01 | Labels name the minimum represented proof window, not whichever ID was allowed |
| MS07b-B02 | Each new ID has a real, correctly replaying explanation |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07b-T01 | C/C+1/12/13 and depth 1/2/3, alone/mixed, invalid/off/oversized options pass |
| MS07b-T02 | Catalogue is 28/23 unscoped; monotone weights, cost table and full B pass |
| MS07b-T03 | Cancellation/exhaustion cannot publish an unproved minimum |
| MS07b-T04 | Both quick sets, E and real GH pass; two-request Hell 1 outcomes/projections are retained without a vacuous-tier assumption |

## Test plan and gates

Generator: `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor`.
Both quick sets. Full E with MS07b (GG/GR); first commands:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS07b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS07b\analysis\G01.json
Invoke-Dv3Node -Task MS07b -NodeArgs @('tests\soak.js','--variant=classic9','--level=hell1','--count=2','--seed=20260101','--no-gate','--json=..\docs\difficulty-v3\evidence\MS07b\hell1-pilot.json')
```

Player GH discovery source command (repeat separately for deep with `--ids=nishioDeep --levels=hell1`):

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChainLong --discover --variants=classic9 --levels=nightmare --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS07b\long.json
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong,nishio,nishioDeep --sources=tests\artifacts\difficulty-v3\MS07b\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong,nishio,nishioDeep --sources=tests\artifacts\difficulty-v3\MS07b\sources.json --max-puzzles=16 --max-hints=400 --check
```

Use existing/curated sources first; complete the source map for all selected IDs. Follow B's finite
discovery limit; missing real examples block, never synthesize them. Jobs=1, no --jobs. Estimate
10-90 minutes E, 10-480 seconds per discovery and initially 1-300 seconds for the Hell 1 pilot
(record actuals, hard stop 540 seconds). If even two requests project too long, use MS05c's
`--from=0 --count=1 --total-count=2` and `--from=1 --count=1 --total-count=2` without changing
the two seeds/reference endpoints. **Announce to the orchestrator before starting (pentomino
runs in parallel on the same machine).** Every possibly >10-second command uses the lock helper.

## Definition of done & handoff

Report provisional cutoff, exact windows, current-reference changes, real source manifests and
the Hell 1 pilot with GD/GQ projections. MS07c adds its override/cost tooling and selects C;
this task makes no qualification claim or offer change.

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
