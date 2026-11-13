# MS14b — Register Jigsaw law of leftovers

| Header | Value |
|---|---|
| Depends on | MS14a accepted |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared subset / both apps; M14b |
| Authority | R10/R17/R20/R21; SA2-Q-S09/S11 |
| Status | Not started |

## Goal & business context

Bring the proved multiset rule into Jigsaw ratings and hints, including a real region-aware example.

## Scope

In: registration/weight, scoped fixtures, cost adapter, locales/help, current references.
Out: new Killer technique, non-Jigsaw scope or changing earlier pattern limits.

## Repository rules

AGENTS/checklist and B; no Git/pack/log edits. Core tests build models without Generator-only code.
Real help uses MS03c cellRegion, never an invented candidate-state format.

## Inputs & context

R17, verbatim:

> Put `lawOfLeftovers` in `core/js/engine/tech-subset.js`: order 87, weight 200, group `locked`,
> scope `['jigsaw9']`, no uniqueness assumption.

Use MS14a's complete multiset/support kernel unchanged. Initial limits: 2 units/side, 4 difference
cells/side, 50000 work units/call. Scope check is explicit in the finder too. R10 Finding and key
`technique.lawOfLeftovers.step`; localized args use numeric `digits` and string line/region/cell labels.
Both EN+VI locale pairs get name, desc and step.

Add real scoped cases under `SG.fixtures.jigsawTechniques`: `{cellRegion,givens,after,expect}`
with explicit preprocessing IDs, or a full plain core model specification. Two positive cases
(row/column duals) and negative cases; independently count/prove against that exact region map.
Do not add this scoped ID to the classic-only F.ids map. Cost tool gains a scoped-case adapter.
Help snapshot `cellRegion` must be copied and reconstructed by MS03c; validate actual Player replay.
Baseline `player/js/engine/text-boards.js:141-160` (`function jigsawSpec`);
`core/js/engine/tech-subset.js:236-248` (`SG.techniques.register`).

## Files to create/modify

- Subset engine/suite; new `core/tests/fixtures/jigsaw-techniques.js`, both tests.html fixture lists.
- `generator/tests/pattern-cost.js` scoped adapter and tooling tests; full scoped B/E.
- Generator/Player designs, both guide languages and v3 notes.

## Implementation steps

1. Register the scoped ID/weight and add real model-aware fixtures.
2. Add scope/soundness/budget tests in both app harnesses and cost-tool support.
3. Add locale/help integration, generate a real Jigsaw snapshot and validate its regions.
4. Record bounds/reference changes, E/GH/cost and quick results.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS14b-B01 | Jigsaw hints explain equal multisets on the actual irregular regions |
| MS14b-B02 | Other variants do not gain an unsupported scoped rule |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS14b-T01 | Scope/weight/order, complete support and real row/column positives pass |
| MS14b-T02 | Both runners can build fixtures; cellRegion and real hint replay match |
| MS14b-T03 | Full B/E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-subset,techniques,technique-weights,difficulty-floor,pattern-cost-tools`;
Player `--suite=tech-subset,help,text-boards`; both quick sets. Complete E MS14b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS14b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS14b\analysis\G01.json
node tests\pattern-cost.js --ids=lawOfLeftovers --runs=20 --json=..\docs\difficulty-v3\evidence\MS14b\pattern-cost.json
```

Player, bounded discovery and then complete source-based write/check:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=lawOfLeftovers --discover --variants=jigsaw9 --levels=hard --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS14b\sources.json
node tests\tools\make-technique-examples.js ..\generator --ids=lawOfLeftovers --sources=tests\artifacts\difficulty-v3\MS14b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=lawOfLeftovers --sources=tests\artifacts\difficulty-v3\MS14b\sources.json --max-puzzles=8 --max-hints=400 --check
```

B permits bounded batches from Jigsaw's actual PLAN levels hard/expert/master if needed. Jobs 1/no --jobs; E 10-90
minutes, cost 1-60 seconds, GH 1-120 seconds curated/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Only this introducing rule's limits may adjust once with evidence; 540-second process ceiling.

## Definition of done & handoff

Report real region/proof/source data and final scoped limits. No duplicate cageLocked ID appears.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and generic soundness/order-invariant suites,
not routine analyst cross-review. Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical item for MS18c/MS18d and work continues within the bounds.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list, actual gates and CI membership.

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
