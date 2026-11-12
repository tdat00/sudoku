# MS10a — Remote pairs

| Header | Value |
|---|---|
| Depends on | MS09b accepted |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M10a |
| Authority | R10/R13/R20/R21 |
| Status | Not started |

## Goal & business context

Recognize a nontrivial alternating pair component without mislabelling a naked pair or accepting
an inconsistent odd cycle.

## Scope and repository rules

In: remotePairs plus full B. Out: WXYZ, uniqueness or general chain changes.
AGENTS/checklist, no Git/pack/log writes, CRLF, EN+VI, complete task-owned evidence.

## Inputs & context

R13, verbatim:

> Group identical bivalue masks; peer edges require alternating assignments. Two-colour consistent
> components. A nontrivial remote connection has at least three edges; a target seeing opposite
> colours loses both digits. Odd means edges, not cells. Reject inconsistent odd-cycle colouring;
> do not relabel a two-cell naked pair.

Register remotePairs: wing/order132/weight440/baseCost44, unscoped, no uniqueness.
R10 Finding, placements=[]; key `technique.remotePairs.step`;
args `{digits:[d1,d2],ends:string[],length}` where length is the odd endpoint path's edge count.
Use actual peers, canonical cell order and BFS shortest witness. For a target use nontrivial
opposite-colour endpoints (minimum visible opposite-colour path >=3); reject adjacent-pair-only
justification. Never eliminate either digit from proving cells.
Limit50000 edge/combination extensions, entry/every256 checks, per-call reset and metrics.

Vector: all four cells have {2,7}: A=R1C1, B=R2C2, C=R2C5, D=R5C5.
Edges AB(box), BC(row), CD(column); target R5C1 sees A/D only and loses2,7.
The A-B-C even path cannot justify elimination at a target seeing only A/C.
Test a two-cell component, an odd cycle, disconnected components and a missed endpoint.
Baseline `core/js/engine/tech-wing.js:130-187` (`function findXyWing`);
`:283-344` (`function findWWing`) supplies existing peer/candidate patterns.

## Files to create/modify

- Wing engine/suite; full B and E; applicable Generator/Player design and both guide languages.

## Implementation steps

1. Build per-mask peer components and deterministic colouring/path witnesses.
2. Validate parity/minimum and both-digit removals; add real exact-Finding fixtures.
3. Add weight/registration/locale/help/current reference data atomically.
4. Measure bounds, refresh E/GH and finish quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS10a-B01 | A real remote proof, not an adjacent naked pair, gets the new name |
| MS10a-B02 | Both digit eliminations and their parity reason are visible |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS10a-T01 | Odd/even, shortest nontrivial witness and inconsistent-component rejection pass |
| MS10a-T02 | Actual peers, state purity, cancellation/caps and full B pass |
| MS10a-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Complete E MS10a:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS10a\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS10a\analysis\G01.json
node tests\pattern-cost.js --ids=remotePairs --runs=20 --json=..\docs\difficulty-v3\evidence\MS10a\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=remotePairs --sources=tests\artifacts\difficulty-v3\MS10a\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=remotePairs --sources=tests\artifacts\difficulty-v3\MS10a\sources.json --max-puzzles=8 --max-hints=400 --check
```

Start with wing/chain real sources, then B's bounded classic9 hard/expert/master.
Jobs1/no --jobs; E10-90 minutes, cost1-30 seconds, GH1-120 seconds curated/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Own limit adjustment once with evidence; stop commands at ten minutes.

## Definition of done & handoff

Report parity convention, proof/fixture/source data, selected bound and any reclassifications.

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
