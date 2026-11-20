# MS08c — Restricted empty rectangle

| Header | Value |
|---|---|
| Depends on | MS08b accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M8 complete |
| Authority | R10/R11/R20/R21 |
| Status | Not started |

## Goal & business context

Add the bounded empty-rectangle grouped implication without waiting for the general grouped graph.
Every member of an arm matters to the proof.

## Scope

In: the restricted R11 form and full B. Out: broader rectangle variants or grouped-chain activation.

## Repository rules

AGENTS/checklist; no Git/pack/log writes; real help, both languages, CRLF, named gates only.

## Inputs & context

R11, verbatim:

> A complete box's candidates split into disjoint nonempty row/column arms A/B, empty intersection.
> External conjugate pair p/q has p conflicting with every occurrence in A; then B or q is true.
> Eliminate only where every B occurrence and q are seen.

Register emptyRectangle: fish, order 124, weight 380, baseCost 38, unscoped, no uniqueness.
Both external pair cells are outside the box. Reject a candidate at the empty intersection and
three-line boxes; test both arm orientations/transposes. Use safe owner tables and complete units.
Finding key `technique.emptyRectangle.step`; args `{digit,box:string,lines:string[],ends:string[]}`;
normal R10 Finding fields, sorted owned cells/eliminations, no placements.

Vector: box B1 digit 5 arms A={R2C1,R2C3}, B={R1C2,R3C2}, no 5 at R2C2.
External column-C5 pair p=R2C5,q=R7C5 gives elimination 5 at R7C2.
Adding 5 at the intersection or outside the arms invalidates this restricted witness.
Missing visibility to R3C2 must invalidate the target, even if it sees R1C2.

Limit 50000 tested arm/pair/target extensions; entry/every 256 checks, reset each call, report metrics.
Incomplete support search never supplies a false group claim.
Baseline `core/js/engine/tech-fish.js:56-125` (ownership), `:309-335` (`function findStrongLinks`);
current R10 integration is the B contract.

## Files to create/modify

- Fish engine/suite; full B and E; applicable Generator/Player design and both language guides.

## Implementation steps

1. Build complete-box arm records and exact external conjugates.
2. Test the constructive implication independently and all near-miss visibility cases.
3. Register/integrate with two real exact-Finding positives, negative and real Player example.
4. Record current reference changes, cost/cap evidence and complete output refreshes.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS08c-B01 | The named grouped proof is explained and never treats one arm member as the whole arm |
| MS08c-B02 | No unsupported rectangle variant is advertised |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS08c-T01 | Empty intersection, complete box/pair, externality and every-member visibility hold |
| MS08c-T02 | Transposes, partial/overlap/three-line negatives, immutability and cancellation pass |
| MS08c-T03 | Full B/E/GH/cost and quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Complete E, MS08c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS08c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS08c\analysis\G01.json
node tests\pattern-cost.js --ids=emptyRectangle --runs=20 --json=..\docs\difficulty-v3\evidence\MS08c\pattern-cost.json
```

Player GH after B source acquisition:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=emptyRectangle --sources=tests\artifacts\difficulty-v3\MS08c\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=emptyRectangle --sources=tests\artifacts\difficulty-v3\MS08c\sources.json --max-puzzles=8 --max-hints=400 --check
```

Prefer existing forcingChain/colour sources, then bounded classic9 hard/expert. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-30 seconds, curated GH 1-120 seconds; discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
At most one evidenced own-limit change; enforce the 540-second process ceiling.

## Definition of done & handoff

Report the restricted coverage, source and all-member proof cases. M8 is complete only with all
three IDs integrated and current references truthful.

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
| Status | Accepted (orchestrator check against IR72 A-J; outside the analyst review set). The developer stopped before E with five questions; the pack author (SA2) accepted all five and the four named conventions as implemented |
| Start | 2026-11-15 20:40:50 (+07:00), base `398c832` |
| End | 2026-11-15 21:29 stop before E; 21:32-21:41 SA2 ruling; 21:42-22:33 E and final evidence; orchestrator re-check and commit |
| Duration | 1 h 43 min developer (49 min to the question + 51 min after the ruling); about 9 min SA2 ruling |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 ruling); claude-opus-5.5 (orchestrator) |
| Token usage | 314 model calls; 115,753,456 input tokens (114,318,791 cache reads); 389,220 output tokens |
| AI credits | about 1,891 (developer) |
| Verification | `emptyRectangle` in `core/js/engine/tech-fish.js` (fish group, order 124, base cost 38, unscoped, `assumesUniqueness: false`), `WEIGHTS.emptyRectangle = 380` (between `simpleColouring` 360 and `swordfish` 420: Hard tier). Pattern: a box-like unit (`box` or `region`) whose candidates of the digit lie on one row arm and one column arm with an empty intersection, candidate ownership as `findFish` (the box as the only box-like owner, exactly one complete row and column); an external conjugate pair in any complete unit (rows, columns, boxes, regions, diagonals, windows) with both cells outside the box; a target sees all of arm B and q; pattern cells are never targets. Finding `{ cells (sorted union), box (unit label), lines (unit order), ends (cell order) }` with no positional role encoding. Work unit: one `(digit, box, conjugate unit)` combination, at most eight trials, counted before rejection checks; limit 50,000, budget at entry and at most every 256 units; structural maximum 44,955 on Samurai (90 %), 2,187 on 9x9. Skyscraper and Two-String Kite unchanged (18,688 lines on 2,336 states against `398c832`). `tech-fish` 236 -> 317 tests (vector, transpose, bare vector with both rectangles, labelled decoy variant, ten near misses each way, `referenceRectangles` agreement on every board class incl. Jigsaw and the four multi-grid boards, Samurai ownership negative); 27/27 mutants (two earlier runs kept). **E** (once, on the frozen final source): 29 of 520 hashes changed, none below Hard (classic9 hard 1, expert 4, master 1, nightmare 2; diagonalX nightmare 9; hyper hard 1; jigsaw9 master 10; greaterThan hard 1); wires G09 (counters), G11 and G12 (re-dug Greater-Than puzzles); analyses G07, G11, G12 (hardest technique now `emptyRectangle`), G14. Reference ratings: 2 change (platinum-blonde 5,676 -> 5,665; constructed-nightmare-2 2,661 -> 2,637), no level. Help catalogue 31 (`emptyRectangle` new; `skyscraper` moved; three regenerated from their own sources), 31/31 on the final check. Quick sets: Generator 3,742/3,742 (308.4 s; +1.6 % for +2.5 % tests), Player 1,987/1,987 (39.9 s); fingerprints match; CI check passes. Orchestrator: locked gate suites 587/587 (`tech-fish` 317, `techniques` 213, `technique-weights` 9, `difficulty-floor` 48; 39.7 s); CI shard check 3,742 |
| Acceptance | MS08c-B01, B02, T01, T02, T03 met; IR72 A-J pass (A design §6.6 with the SA2 clarifications and the work-unit definition, reference enumeration on every class; B weight and 2 rating changes, 0 levels; C limits, cadence, structural maxima; D positives, negatives, supplements; E bilingual docs and totals; F 27/27; G complete E; H 31/31 help; I pin table; J fingerprints) |
| Issues & resolutions | **Questions before E (as instructed after MS08b):** which units may hold the external pair, the Finding's content, the work unit, the first-pattern order of the two-rectangle vector, and the wording; SA2 accepted all as implemented and asked for the work-unit definition to be recorded precisely (done in design §6.6). Twelve Generator pins and one Player pin refreshed like for like after E (table in the evidence). Honest gaps stated in the evidence: the lock waits of the wire and analysis compounds, the pin runs and the first differential were not recorded; a 0.8 s firing-rate probe ran unlocked before the switch to `Invoke-Dv3Node` (permitted by SA2); the lock status of some under-10 s probes is not recorded. No new S-AV item; S-AV08 re-measured (308.4 s / 39.9 s) |
| Handoff | To MS09a: box-like units `box`/`region` with the single-owner rule; external pairs from any complete unit; the fish group now holds Skyscraper (112), Two-String Kite (114) and Empty Rectangle (124) with shared helpers and reference enumerations; IR72 A-J is the checklist; base quick totals Generator 3,742 (308.4 s) and Player 1,987 (39.9 s); help catalogue 31; ask before E |
