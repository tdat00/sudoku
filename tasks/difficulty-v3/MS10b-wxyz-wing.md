# MS10b — WXYZ-Wing

| Header | Value |
|---|---|
| Depends on | MS10a accepted |
| Size / active time | Medium; 45-60 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M10 complete |
| Authority | R10/R13/R20/R21 |
| Status | Not started |

## Goal & business context

Add the bounded four-cell capacity proof, correctly classed in Master rather than Expert.

## Scope

In: WXYZ-Wing and B. Out: ALS families, uniqueness, changing other finder limits or level bands.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Both languages, real help, current/historical separation.

## Inputs & context

R13, verbatim:

> Four open cells with candidate union of four digits. Exactly one digit z is non-restricted;
> for each other digit, every pair of its occurrences in the four cells is mutually visible.
> If z were absent, four cells would need three digits each usable at most once.
> Remove z only from external candidates seeing all z occurrences.

Register wxyzWing: wing/order 155/weight 800/baseCost 57, unscoped, assumesUniqueness=false.
1.25*800=1000 is not below Expert's upper edge, so the tier is Master.
R10 Finding; key `technique.wxyzWing.step`, args `{digits:[...],digit:z,cells:string[]}`.
Use all-pairs visibility per restricted digit and every z occurrence for a target, not a convenient
pivot-only test. Canonical quartet order, sorted owned output, limit 50000 combination extensions;
entry/every 256 checks and per-call metrics. No all-cell numeric mask.

Vector: A=R1C1{1,4}, B=R1C5{1,2}, C=R1C9{2,3}, D=R5C9{3,4}.
Only 4 is non-restricted; R5C1 sees A/D and loses 4. Add 1 to D to make a second non-restricted digit:
reject. Add 4 to B while target misses B: no target elimination. Also test union size !=4.
Baseline `core/js/engine/tech-wing.js:130-249` (`function findXyWing` / `function findXyzWing`).

## Files to create/modify

- Wing engine/suite; full B/E, current reference data/notes and applicable designs/bilingual guides.

## Implementation steps

1. Bound quartet enumeration and prove restricted/non-restricted classification explicitly.
2. Add capacity/visibility negatives, two real exact-Finding positives and a negative.
3. Register/integrate; document Master membership from the unchanged weight rule.
4. Record bounded cost/reference changes, E/GH and quick results.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS10b-B01 | WXYZ is a genuine four-cell proof and receives its fixed Master prior |
| MS10b-B02 | No target is eliminated by overlooking a z occurrence |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS10b-T01 | Cardinality, all-pairs restriction and every-target-peer tests pass |
| MS10b-T02 | B, independent completion checks, state purity/caps/cancellation pass |
| MS10b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Full E MS10b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS10b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS10b\analysis\G01.json
node tests\pattern-cost.js --ids=wxyzWing --runs=20 --json=..\docs\difficulty-v3\evidence\MS10b\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=wxyzWing --sources=tests\artifacts\difficulty-v3\MS10b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=wxyzWing --sources=tests\artifacts\difficulty-v3\MS10b\sources.json --max-puzzles=8 --max-hints=400 --check
```

Prefer existing wing/chain sources, then bounded classic9 master/nightmare. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-30 seconds, GH 1-120 seconds curated/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
One evidenced own-limit adjustment maximum; 540-second process ceiling.

## Definition of done & handoff

M10 completes with both named IDs integrated, no weight fitting, and the capacity proof recorded.

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
