# MS11b — Hidden Unique Rectangle

| Header | Value |
|---|---|
| Depends on | MS11a accepted |
| Size / active time | Medium; 35-50 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M11b |
| Authority | R10/R14/R20/R21 |
| Status | Not started |

## Goal & business context

Complete the hidden rectangle form while keeping the same deadly-geometry and uniqueness guards.

## Scope and repository rules

In: hidden form after existing subtypes, its text/fixtures. Out: BUG/new IDs/weight changes.
AGENTS/checklist, no Git/pack/log edits, both language pairs and task-owned E.

## Inputs & context

R14, verbatim:

> Hidden form: one corner exactly x/y; the opposite corner has conjugate links on x along its row
> and column to the adjacent rectangle corners. It cannot be y, which would force a deadly rectangle.
> Search the transposes and swapped digit roles.

Same ID/order 180/weight 900/baseCost/uniqueness flag. Key
`technique.uniqueRectangle.hidden.step`, args `{digit:x,digits:[x,y],cells:string[]}`.
Actual complete row/column conjugates, same swap-preserving geometry, no cages/signs, false
uniqueness context => null. Preserve type 1/2 priority and MS11a's types before the new hidden pass.
Own work limit 50000 extensions, entry/every 256 checks, copied deterministic Findings/metrics.

Vector: A=R1C1{1,2}, B=R1C4{1,2,4}, C=R2C1{1,2,5}, D=R2C4{1,2,3}.
If 1 is conjugate D-C on row 2 and D-B on column 4, eliminate 2 at D. If D were 2 then B/C are 1
and A is 2, the forbidden rectangle. Add an extra 1 in either conjugate unit => no such witness.
Test digit swap, transpose, wrong opposite corner, incomplete/extra units and ctx=false.
Baseline `core/js/engine/tech-wing.js:349-399`, `:477-528` (`function findUniqueRectangle`).

## Files to create/modify

- Wing engine/suite, B's affected UR fixture/current-reference/locale/help data, E.
- Applicable Generator/Player designs, both guide languages, v3 notes.

## Implementation steps

1. Add hidden proof after existing subtype passes with unchanged geometry guards.
2. Add uniquely proved real positive, exact elimination and all conjugate/geometry negatives.
3. Add both apps' subtype text and update reference changes without fitting weights.
4. Record cost/E/GH and quick results.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS11b-B01 | The hidden proof is explicit and conditional on genuine uniqueness |
| MS11b-B02 | No new technique ID or changed old subtype priority |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS11b-T01 | Both true conjugates, opposite-corner geometry and false-context guards pass |
| MS11b-T02 | ID/key, state purity, deterministic bounds and historical/current separation hold |
| MS11b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Complete E MS11b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS11b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS11b\analysis\G01.json
node tests\pattern-cost.js --ids=uniqueRectangle --runs=20 --json=..\docs\difficulty-v3\evidence\MS11b\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11b\sources.json --max-puzzles=8 --max-hints=400 --check
```

B acquisition: existing UR source, then bounded classic9 master/nightmare. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-60 seconds, curated GH 1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Only this new pass's limit may adjust once; ten-minute command ceiling.

## Definition of done & handoff

Report hidden-form proof and real fixture, with no deferred locale/help or reference update.

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
