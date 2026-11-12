# MS08b — Two-string kite

| Header | Value |
|---|---|
| Depends on | MS08a accepted |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M8b |
| Authority | R10/R11/R20/R21 |
| Status | Not started |

## Goal & business context

Recognize the row-column kite as a named short proof, without confusing a shared cell or incomplete
unit with a conjugate pair.

## Scope

In: kite and full B integration. Out: empty rectangle, finned fish, weights/offers outside this ID.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Both locale pairs, real fixtures/help, CRLF and E.

## Inputs & context

R11, verbatim:

> A complete-row conjugate pair and complete-column conjugate pair, four distinct cells. One
> endpoint of each is in the same box and conflicts; at least one remaining endpoint is d.
> Targets see both remaining endpoints.

Register `twoStringKite`: fish, order114, weight340, baseCost34, unscoped, no uniqueness assumption.
Finding: `{technique,cells,placements:[],eliminations,i18nKey,i18nArgs}` with
key `technique.twoStringKite.step`, args `{digit,lines:string[],bridge:string[],ends:string[]}`.
All lists are owned/sorted/deduplicated; labels are strings, digit remains numeric.

Use complete units and existing unambiguous owner tables. Check all four cells distinct, both
bridge endpoints in the same real box, and all target peer obligations. No box => no pattern.
Bound tested pair/orientation extensions at50000, entry/every256 budget checks, per-call reset,
MS07a work callback; cancellation propagates.

Geometry vector: digit5 row R2 pair C1/C8, column C2 pair R1/R7. R2C1/R1C2 share box;
remove5 at R7C8. Negative: shared endpoint, missing box link, incomplete row/column, target seeing
only one free end. Include transpose and ambiguous multigrid ownership.
Baseline: `core/js/engine/tech-fish.js:56-125` (owner tables), `:309-335`
(`function findStrongLinks`); `core/tests/suites/techniques.test.js:71-87`.

## Files to create/modify

- Fish engine/suite; full B (current fixtures/registry/weights/references, both apps' locales/help,
  generated real example, notes) and E.
- Generator design6.6, Player hint design, both language user/developer guides.

## Implementation steps

1. Reuse safe geometry; enumerate row/column conjugate pairs and both bridge choices.
2. Add vectors/negatives and two real positive exact Findings plus a negative.
3. Ship registration, weight, locale/help and current reference changes together.
4. Capture bounded cost/E/GH and run both quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS08b-B01 | A genuine kite is named and explained instead of over-rated |
| MS08b-B02 | Invalid geometry never creates a deduction |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS08b-T01 | Distinctness, complete units, box conflict, both target peers and transposes tested |
| MS08b-T02 | B, exact Finding fixtures, completion checks and deterministic work pass |
| MS08b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `--suite=tech-fish,techniques,technique-weights,difficulty-floor`; Player
`--suite=help,play,i18n`, then both full quick commands `node tests\node-runner.js`.
Complete E with MS08b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS08b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS08b\analysis\G01.json
node tests\pattern-cost.js --ids=twoStringKite --runs=20 --json=..\docs\difficulty-v3\evidence\MS08b\pattern-cost.json
```

Player GH:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=twoStringKite --sources=tests\artifacts\difficulty-v3\MS08b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=twoStringKite --sources=tests\artifacts\difficulty-v3\MS08b\sources.json --max-puzzles=8 --max-hints=400 --check
```

Use B's existing colour/chain sources then bounded classic9 hard/expert discovery. Jobs1/no --jobs;
E10-90 minutes, cost1-30 seconds, curated GH1-120 seconds; discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Own limit can change once with evidence; no other task's limit is tuned.

## Definition of done & handoff

Supply source/proof/limit records and any reference changes; nothing is left to a later cleanup task.

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
