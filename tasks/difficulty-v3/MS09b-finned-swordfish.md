# MS09b — Finned Swordfish

| Header | Value |
|---|---|
| Depends on | MS09a accepted |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M9 complete |
| Authority | R10/R12/R20/R21 |
| Status | Not started |

## Goal & business context

Complete the three-base version with the same constructive fin proof, not an unrestricted fish search.

## Scope

In: n=3 and full B. Out: changing MS09a's selected limit or ordinary/four-base fish.

## Repository rules

AGENTS/checklist; no Git/pack/log writes; complete real fixtures/help, EN+VI and task-owned E.

## Inputs & context

R12, verbatim:

> Every base candidate outside the covers is a fin; fins are nonempty and all in one box.
> A target lies on a chosen cover, outside the bases, and sees every fin.

Use exactly three disjoint complete bases and three disjoint covers. If no fin is true the
three bases fill the three covers; otherwise the true fin excludes the target. Missing corners
are allowed; no complete-support claim from truncated enumeration.
Register finnedSwordfish: fish/order 134/weight 480/baseCost 48, unscoped, no uniqueness.
R10 Finding; key `technique.finnedSwordfish.step`;
args `{digit,bases:string[],covers:string[],fins:string[]}`. Sorted owned cells/eliminations.
Own work limit starts at 50000; do not silently change finnedXWing's already selected limit.

Vector: digit 5 bases R1{C2,C5}, R4{C5,C8,C9}, R7{C2,C8}; covers C2/C5/C8;
fin R4C9; target R5C8. Add same-box fins, a missing apparent corner and transpose.
Negative: wrong base/cover count, split fin boxes, off-cover target, one unseen fin,
overlapping/partial units. Preserve every ordinary n=2/3/4 regression.
Baseline `core/js/engine/tech-fish.js:281-305` (`function findFish`); the shared fin kernel is MS09a.

## Files to create/modify

- Fish engine/suite; full B/E; applicable designs and both user/developer guide languages.

## Implementation steps

1. Add n=3 wrapper and independent per-ID work setting/metrics.
2. Test all witness obligations and negatives; add two real exact-Finding positives and a negative.
3. Ship weight/registration/locales/current expectations/real help together.
4. Record cost, reference changes and complete E/GH.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS09b-B01 | Three-base fin proofs are named and explained correctly |
| MS09b-B02 | Existing fish behavior and bounds are not retuned |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS09b-T01 | Exact three-base proof, sashimi/transpose and all fin visibility negatives pass |
| MS09b-T02 | State purity, cap/parent cancellation and full B hold |
| MS09b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Complete E MS09b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS09b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS09b\analysis\G01.json
node tests\pattern-cost.js --ids=finnedSwordfish --runs=20 --json=..\docs\difficulty-v3\evidence\MS09b\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=finnedSwordfish --sources=tests\artifacts\difficulty-v3\MS09b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=finnedSwordfish --sources=tests\artifacts\difficulty-v3\MS09b\sources.json --max-puzzles=8 --max-hints=400 --check
```

Use B's fish/chain sources then bounded classic9 hard/expert/master. Jobs 1/no --jobs; E 10-90 minutes,
cost 1-30 seconds, curated GH 1-120 seconds/discovery<=8 minutes. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Own limit may adjust once
with evidence. Never exceed ten minutes/command.

## Definition of done & handoff

M9 is complete with both IDs independently bounded and all old fish regressions retained.

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
