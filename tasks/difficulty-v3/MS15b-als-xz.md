# MS15b — ALS-XZ

| Header | Value |
|---|---|
| Depends on | MS15a accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared ALS / both apps; M15 complete |
| Authority | R10/R18/R20/R21; SA2-Q-S05/S08 |
| Status | Not started |

## Goal & business context

Add a constructive restricted-common-candidate proof using the bounded ALS records, without a
new group or a transient order inversion.

## Scope and repository rules

In: ALS-XZ and full B. Out: Sue de Coq, ALS-XY-Wing/death blossom, earlier limits/weights/offers.
AGENTS/checklist, no Git/pack/log edits, real examples, EN+VI and CRLF.

## Inputs & context

R18, verbatim:

> Choose disjoint ALS A/B and a restricted common digit x whose every A occurrence sees every B
> occurrence. For another common digit z, at least one z occurs in A or B: otherwise both ALS would
> have to use x, impossible. Eliminate z only from targets seeing every z occurrence in both sets.

Register alsXz: chain/order 194/weight 1250/baseCost 106, unscoped, no uniqueness.
ForcingChainLong is already 198. Use MS15a individually complete records; enumerate disjoint pairs
canonically and test every restricted-common cross-peer. No disjoint-cell shortcut for visibility.
Record cap 4096/max cells 4 and own 50000 total work cover enumeration plus pairs/targets. A prefix of
complete ALS records can give a constructive proof; never use truncation as an absence claim.
R10 Finding; key `technique.alsXz.step`;
args `{digitX:x,digitY:z,cells:string[]}`, copied sorted proof cells/eliminations, no placements.

Witness vector: A={R1C1{1,2},R1C2{2,3}}, B={R1C4{1,4},R2C4{3,4}};
x=1 cross-peers on row 1, z=3 at R1C2/R2C4; remove 3 at R2C2.
Negative: overlapping sets, one missing x cross-peer, target missing one z occurrence, or wrong
ALS cardinality. A different valid earlier witness may be returned by canonical enumeration;
unit-test the specified witness independently and record exact real catalogue Findings.
Baseline orientation `core/js/engine/tech-chain.js:516-538` (neighbouring registrations);
the enumerator is delivered by MS15a.

## Files to create/modify

- `core/js/engine/tech-als.js`, ALS suite; full B/E; both designs/guides and notes.
- Eight source lists already changed by MS15a: verify, do not add duplicate entries.

## Implementation steps

1. Implement bounded disjoint-pair witness search with one shared guard.
2. Add exact real positives/negative and independent full-completion/visibility tests.
3. Register/integrate at 194 with group chain and both locale/help packs.
4. Measure limits/cost/affected GP, record current reference changes and E/GH.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS15b-B01 | The x/z capacity proof is real and explained with localized digits |
| MS15b-B02 | Bounded records do not become false absence proofs or a new ALS group |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS15b-T01 | Disjointness, every x/z peer and exact cardinality negatives pass |
| MS15b-T02 | Shared work, retained records, state purity and order 194<198 are validated |
| MS15b-T03 | Full B/E/GH/cost/GP records and both quick sets complete |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-als,techniques,technique-weights,difficulty-floor,ui-contract`;
Player `--suite=tech-als,play,i18n,help,ui-contract`; both quick sets. Complete E MS15b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS15b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS15b\analysis\G01.json
node tests\pattern-cost.js --ids=alsXz --runs=20 --json=..\docs\difficulty-v3\evidence\MS15b\pattern-cost.json
node tests\perf.js --variant=classic9 --level=nightmare --runs=50 --warmup=0 --seed=7000 --gate
node tests\perf.js --variant=jigsaw9 --level=nightmare --runs=50 --warmup=0 --seed=7000 --gate
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=alsXz --sources=tests\artifacts\difficulty-v3\MS15b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=alsXz --sources=tests\artifacts\difficulty-v3\MS15b\sources.json --max-puzzles=8 --max-hints=400 --check
```

B sources: existing chains, then bounded classic9 nightmare/hell1. Jobs 1/no --jobs; E 10-90 minutes,
cost 1-60 seconds, GP 30-540 seconds/cell, curated GH 1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
This introducing task may adjust its new ALS limits once with before/after evidence; record them
for MS16/MS17. Never relax performance targets to hide a miss.

## Definition of done & handoff

Hand MS16 the selected enumerator limits and sound records. Report GP misses and all reclassifications.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and generic soundness/order-invariant suites,
not routine analyst cross-review. Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical MS18c/MS18d item and work continues.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s; project GP before launch.
Unsafe GP cells stay named/unmeasured, not new tooling tasks or omitted denominators. Use the
current bounded quick manifest; own any added suite's CI group. Return the inherited/new item list.

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
