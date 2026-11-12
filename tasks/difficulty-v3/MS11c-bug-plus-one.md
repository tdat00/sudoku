# MS11c — Guarded BUG+1

| Header | Value |
|---|---|
| Depends on | MS11b accepted |
| Size / active time | Medium; 45-60 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M11 complete |
| Authority | R10/R14/R20/R21 |
| Status | Not started |

## Goal & business context

Add the globally justified uniqueness deduction, not the unsafe shortcut of counting three local
occurrences near one cell.

## Scope

In: BUG+1 and full B, including the expanded uniqueness list. Out: general guessing or other BUG forms.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Unique real puzzles required; known solution alone is
insufficient. Both apps/languages and real help land with registration.

## Inputs & context

R14, verbatim:

> Require one trivalue open cell and every other open cell bivalue. After removing the proposed extra
> digit, every unplaced digit in every relevant complete unit has exactly two occurrences; fixed
> values are accounted for. The global Boolean structure then admits a solution flip without that
> extra digit, contradicting uniqueness. Place the extra digit. Reject cages, inequalities,
> unsupported partial constraints, a second trivalue cell, and a merely local "three occurrences" test.

Register bugPlusOne: wing/order182/weight920/baseCost72, unscoped, assumesUniqueness=true.
Direct find also honors ctx.assumeUniqueness=false.
R10 Finding; key `technique.bugPlusOne.step`, args `{cell,label,digit}`; one placement at the
trivalue cell, no eliminations. cells contains the proving/placed cell(s), sorted owned data.

For each candidate extra digit, virtually remove it without modifying state. Count every digit in
every complete constraint unit, with placed digits excluded correctly; do not inspect only the
three units touching the trivalue cell. A unit where an unplaced digit has one/three/zero occurrences
breaks the proposed Boolean remainder. Extra complete units participate; unsupported partial
constraints/cages/signs reject the form. Limit50000 tested occurrence/extensions, standard checks.
Do not treat a contradictory artificial remainder as a fabricated uniqueness fixture.

Baseline `core/js/engine/tech-wing.js:477-528` (`function findUniqueRectangle`);
`core/tests/suites/techniques.test.js:64-69` (`expect(assuming)`).

## Files to create/modify

- Wing engine/suite; `core/tests/suites/techniques.test.js` uniqueness list becomes exactly
  uniqueRectangle,bugPlusOne; full B/E and both design/guide languages.

## Implementation steps

1. Implement full-state and unit-occurrence guards before considering a placement.
2. Prove uniqueness of two real positive fixtures; add false-context and global-count negatives.
3. Register/weight/integrate explanations and a genuine Player example.
4. Preserve v2 records, update current reference expectations, run cost/E/GH and quick checks.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS11c-B01 | The extra digit is forced by a global uniqueness proof, not a local heuristic |
| MS11c-B02 | Ordinary non-uniqueness solving never invokes this deduction |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS11c-T01 | All-unit/fixed-value checks, second trivalue, partial/cage/sign and ctx=false negatives pass |
| MS11c-T02 | Real uniqueness counts, exact placement, immutable state, registry and full B pass |
| MS11c-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Include a distant unit with a wrong digit count while the trivalue cell's own units look valid.
Include a near-identical extra-candidate state, placed digits and an added complete diagonal.
Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Complete E MS11c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS11c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS11c\analysis\G01.json
node tests\pattern-cost.js --ids=bugPlusOne --runs=20 --json=..\docs\difficulty-v3\evidence\MS11c\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=bugPlusOne --sources=tests\artifacts\difficulty-v3\MS11c\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=bugPlusOne --sources=tests\artifacts\difficulty-v3\MS11c\sources.json --max-puzzles=8 --max-hints=400 --check
```

B sources: uniqueness/chain examples, then bounded classic9 master/nightmare. Jobs1/no --jobs;
E10-90 minutes, cost1-30 seconds, curated GH1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
One evidenced own-limit adjustment; no command beyond ten minutes.

## Definition of done & handoff

Report global proof/uniqueness evidence and every guard. M11 ends with exactly two uniqueness IDs.

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
