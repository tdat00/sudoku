# MS11a — Unique Rectangle types 3 and 4

| Header | Value |
|---|---|
| Depends on | MS10b accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M11a |
| Authority | R10/R14/R20/R21 |
| Status | Not started |

## Goal & business context

Extend the existing uniqueness proof without weakening its geometry or uniqueness precondition.
Old types 1/2 retain priority over every new subtype.

## Scope

In: types3/4, subtype text/fixtures, existing-ID integration. Out: hidden UR/BUG, new ID or weights.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. A known completion is not uniqueness: prove it for real
fixtures. Preserve historical positions and add current overrides only when behavior intentionally changes.

## Inputs & context

R14, verbatim:

> Type 3: two bivalue floor corners; roof extras form one virtual nonempty subset member in a unit
> containing both roofs. Combine with k other real cells whose candidate union with the extras has
> k+1 digits. Eliminate that union outside the real cells and roofs. The virtual member denotes at
> least one roof extra, not a fixed extra value in both roofs.
> Type 4: a true conjugate link for one deadly digit between roofs in a complete unit removes the
> other deadly digit from both roofs.

Keep ID uniqueRectangle/order180/weight900/baseCost and assumesUniqueness=true unchanged.
Keep `isDeadlyGeometry`/`buildRectangles`; every relevant unit must preserve the digit swap.
Reject cages/inequalities; direct find with ctx.assumeUniqueness=false returns null.
Run the existing type1/2 search before the new-subtype pass, not type3 on an earlier rectangle
before a later old type1. New work guard50000 extensions, checked at entry/every256 and reset/call.
Finding uses the same ID; keys `technique.uniqueRectangle.type3.step` / `.type4.step`,
args use existing localized `digits`, `digit`, `partDigits`, plus string cell/unit labels.

Vectors: floors R1C1/R1C4={1,2}; roofs R2C1={1,2,3}, R2C4={1,2,4}.
Type3: another R2 cell {3,4} forms the virtual+real pair; remove3/4 from other row cells.
Type4: make1 occur only in the two roofs in complete row2; remove2 from both roofs.
Test empty extras, wrong union size, a third occurrence breaking conjugacy, extra diagonal with
one corner, partial unit, cages/signs and false uniqueness context.
Baseline `core/js/engine/tech-wing.js:349-399` (`isDeadlyGeometry` / `function buildRectangles`),
`:477-528` (`function findUniqueRectangle`).

## Files to create/modify

- Wing engine/suite; B's current UR fixtures, reference expectations, both apps' locales/help/tests,
  real existing-ID example if affected, notes; E generated fixtures.
- Generator/Player technique designs and both user/developer guide languages.

## Implementation steps

1. Retain the old pass and all swap guards.
2. Implement bounded virtual-subset and conjugate proofs; never assign an extra to both roofs.
3. Add a real uniquely solvable positive per subtype, exact Findings and near-miss regressions.
4. Add subtype explanation keys/descriptions in both apps/languages; preserve catalogue count.
5. Record reference changes, cost, E/GH and quick acceptance.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS11a-B01 | New UR subtypes use a genuine uniqueness argument and meaningful explanations |
| MS11a-B02 | Old types and historical evidence are not silently replaced |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS11a-T01 | Virtual-member/conjugate/geometry/uniqueness negatives pass |
| MS11a-T02 | Old type priority, ID/cost/order, exact subtype keys and state purity hold |
| MS11a-T03 | E/GH/cost, current references and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Complete E MS11a:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS11a\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS11a\analysis\G01.json
node tests\pattern-cost.js --ids=uniqueRectangle --runs=20 --json=..\docs\difficulty-v3\evidence\MS11a\pattern-cost.json
```

Player GH, existing real source or B's bounded classic9 master/nightmare replacements:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11a\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11a\sources.json --max-puzzles=8 --max-hints=400 --check
```

Jobs1/no --jobs; E10-90 minutes, cost1-60 seconds, curated GH1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
At most one evidenced limit change for this new subtype search; ten-minute command ceiling.

## Definition of done & handoff

Hand MS11b the ordered subtype dispatcher and guards. Catalogue still has one uniqueRectangle ID.

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
