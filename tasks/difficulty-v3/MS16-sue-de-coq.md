# MS16 — Sue de Coq

| Header | Value |
|---|---|
| Depends on | MS15b accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared ALS / both apps; M16 complete catalogue |
| Authority | R10/R19/R20/R21 |
| Status | Not started |

## Goal & business context

Finish the named catalogue with a bounded line/box capacity proof, not an unrestricted ALS pair scan.

## Scope and repository rules

In: the specified two/three-cell intersection form and full B. Out: other ALS families, retuning
MS15b's enumerator limits or earlier weights. AGENTS/checklist; no Git/pack/log edits.

## Inputs & context

R19, verbatim:

> I: two or three open cells in a line/box intersection.
> A: p-cell ALS in the line outside the box; B: q-cell ALS in the box outside the line.
> A/B digit sets are disjoint and subsets of I's candidate union C.
> `|C| = |I| + p + q`; Z is C minus both ALS digit sets.

> Therefore all A digits are used among A+I in the line, all B digits among B+I in the box, and
> every Z digit occurs in I. Eliminate A digits elsewhere on the line, B digits elsewhere in
> the box, Z digits elsewhere in either unit; never eliminate from the proving sets themselves.

Register sueDeCoq: chain/order196/weight1300/baseCost112, unscoped, no uniqueness.
Use genuine all-different line/box (or region) units and actual membership. The capacity argument
does not assume a digit must appear elsewhere in an incomplete unit. No suitable geometry => null.
Reuse complete ALS records/current MS15b limits; own total work starts50000 and includes enumeration/
pair extensions, never an uncounted second scan. Only this finder's own new work allowance may adjust once.

R10 Finding; args `{digits:A digits,partDigits:B digits,forced:Z,line:string,box:string}`;
key `technique.sueDeCoq.step` for Z empty, `.step.extra` when Z nonempty. These numeric list names
already localize correctly. Sorted owned eliminations, no placements.

Vectors: I=R1C1/R1C2 with C={1,2,3,4}, A=R1C5{1,2}, B=R2C3{3,4}.
Remove1/2 elsewhere row1 and3/4 elsewhere box1. Add R1C3 to I and5 to C: also remove5 elsewhere
in row1 or box1. Reject overlapping A/B digits, wrong C size, wrong spatial membership or overlaps.
Baseline orientation: core model all-different units and MS15a/b ALS module; final chain orders
must be190/194/196/198/200/202, not a later deferred repair.

## Files to create/modify

- `core/js/engine/tech-als.js`, ALS suite; full B/E; both designs/guides and v3 notes.

## Implementation steps

1. Enumerate I and compatible disjoint A/B records under the shared guard.
2. Prove the capacity/cardinality conditions before constructing target removals.
3. Add two real exact-Finding positives/negative, both subtype messages and real help.
4. Confirm40 total IDs/34 unscoped, current references and complete cost/E/GH/quick evidence.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS16-B01 | The line/box capacity argument is accurately named and explained |
| MS16-B02 | Full named scope is complete without claims of exhaustive omitted techniques |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS16-T01 | Two/three-cell, Z, disjoint/cardinality/membership and proving-set exclusion tests pass |
| MS16-T02 | Current ALS bounds, work/cancellation/state purity and final order/counts hold |
| MS16-T03 | Full B/E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-als,techniques,technique-weights,difficulty-floor`;
Player `--suite=tech-als,play,i18n,help`; both quick sets. Complete E MS16:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS16\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS16\analysis\G01.json
node tests\pattern-cost.js --ids=sueDeCoq --runs=20 --json=..\docs\difficulty-v3\evidence\MS16\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=sueDeCoq --sources=tests\artifacts\difficulty-v3\MS16\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=sueDeCoq --sources=tests\artifacts\difficulty-v3\MS16\sources.json --max-puzzles=8 --max-hints=400 --check
```

B sources: existing chains/ALS, then bounded classic9 nightmare/hell1. Jobs1/no --jobs;
E10-90 minutes, cost1-60 seconds, curated GH1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
One own-limit adjustment maximum, not earlier ALS limits. Ten-minute command ceiling.

## Definition of done & handoff

Give MS17 the complete catalogue and every final limit/source record. No missing ID/example waits
for the version task.

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
