# MS08a — Skyscraper

| Header | Value |
|---|---|
| Depends on | MS07e accepted |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M8a |
| Authority | R10/R11/R20/R21 |
| Status | Not started |

## Goal & business context

Name a small single-digit proof instead of charging it as a generic chain. Keep every generated
rating, hint, fixture and explanation consistent with the new cheaper finder.

## Scope and repository rules

In: skyscraper and full B integration. Out: other fish/chain patterns, weight fitting or offers.
AGENTS/checklist; no Git/pack/log edits. Classic scripts, CRLF, both languages, task-owned E.

## Inputs & context

R11, verbatim:

> Two disjoint complete parallel lines, exactly two candidates for d in each. One endpoint pair
> shares an orthogonal line; the other endpoints differ. At least one of the latter is d.
> Eliminate d from external candidates seeing both.

Register `skyscraper`: group fish, order 112, weight 330, baseCost 33, unscoped, assumesUniqueness=false.
Finding contract:

```text
{technique:'skyscraper',cells:number[],placements:[],eliminations:[cell,digit][],
 i18nKey:'technique.skyscraper.step',i18nArgs:{digit,lines:string[],ends:string[]}}
```

Use actual peers and the fish module's safe line ownership tables, not row*9 arithmetic.
Both row and column orientations; distinct four endpoints; do not turn an ordinary X-Wing into a
skyscraper. Sort/deduplicate output and retain deterministic enumeration order.
Limit 50000 tested combination extensions/call; parent check at entry/every 256, fresh counter.
Emit MS07a pattern metrics. Exhaustion loses a deduction, never invents one.

Geometry vector (unit test, not a substitute for real fixtures): digit 5 pairs
R1{C2,C8}, R4{C2,C7}; target R2C7 sees the two non-aligned ends, so remove 5.
Transpose it. Adding a third candidate to either base, partial bases, overlapping endpoints or a
target missing one end must not authorize that elimination.
Baseline anchors: `core/js/engine/tech-fish.js:56-125` (line ownership),
`:281-305` (`function findFish`); fixture anchors after MS04 at `f788e02`:
`core/tests/suites/techniques.test.js:91-107`, `has fixtures for exactly the techniques` and
`has at least 2 positive and 1 negative fixture`.

## Files to create/modify

- `core/js/engine/tech-fish.js`, `core/tests/suites/tech-fish.test.js`.
- Full B: current core fixtures/registry list, Generator weights/reference expectations, both apps'
  locales/help/tests, real help catalogue, notes; E generated fixtures.
- Generator design 6.6 and Player hint/technique design; both user/developer guides.

## Implementation steps

1. Build the restricted pattern over existing safe geometry; add cancellation/cap accounting.
2. Add geometry negatives and two real exact-Finding positives plus a negative, explicit after arrays.
3. Add registration/weight/EN+VI names/descriptions/step and real help source in the same change.
4. Record any reference reclassification, bounded cost and E/GH; finish both quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS08a-B01 | The named cheaper proof is real and explained in both apps/languages |
| MS08a-B02 | No guessed label preservation or availability change |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS08a-T01 | Constructive proof, transpose, ownership/partial/near-miss tests pass |
| MS08a-T02 | Full B, soundness against completions, immutable state and deterministic caps |
| MS08a-T03 | E/GH/cost evidence and both quick sets pass |

## Test plan and gates

Generator: `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor`.
Player: `node tests\node-runner.js --suite=help,play,i18n`; then both quick sets.
Complete E GG/GR under MS08a, beginning with:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS08a\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS08a\analysis\G01.json
node tests\pattern-cost.js --ids=skyscraper --runs=20 --json=..\docs\difficulty-v3\evidence\MS08a\pattern-cost.json
```

Player GH, after B's bounded source acquisition:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=skyscraper --sources=tests\artifacts\difficulty-v3\MS08a\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=skyscraper --sources=tests\artifacts\difficulty-v3\MS08a\sources.json --max-puzzles=8 --max-hints=400 --check
```

Prefer the existing simpleColouring source, then B's classic9 hard/expert bound. Jobs=1/no --jobs;
E 10-90 minutes, cost 1-30 seconds, GH 1-120 seconds/curated run (discovery<=8 minutes).
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
No command exceeds ten minutes; own work-limit adjustment at most once with before/after evidence.

## Definition of done & handoff

Report exact proof/fields, fixtures, source/limit records, reclassifications and B/T evidence. No
unfinished integration is deferred to MS08b; no commit/log edit.

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
