# MS09a — Finned X-Wing, including sashimi

| Header | Value |
|---|---|
| Depends on | MS08c accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M9a |
| Authority | R10/R12/R20/R21 |
| Status | Not started |

## Goal & business context

Recognize a two-base finned fish soundly, including a missing apparent corner, without changing
ordinary fish results or expanding into Franken/mutant fish.

## Scope and repository rules

In: bounded reusable n-fish fin engine, activate n=2 only, full B. Out: n=3 registration until MS09b.
AGENTS/checklist, no Git/pack/log edits, both locales/guides, CRLF, owned E.

## Inputs & context

R12, verbatim:

> For size n=2/3 choose n disjoint complete base lines and n disjoint covers. Every base candidate
> outside the covers is a fin; fins are nonempty and all in one box. A target lies on a chosen cover,
> outside the bases, and sees every fin. If no fin is true, the ordinary n-fish fills the covers;
> if a fin is true, it excludes the target. This permits a missing apparent corner (sashimi).

Register finnedXWing: fish/order 126/weight 400/baseCost 40, unscoped, no uniqueness.
Finding key `technique.finnedXWing.step`; args `{digit,bases:string[],covers:string[],fins:string[]}`;
R10 fields with placements=[], sorted/deduplicated owned output.
Use safe fish owner tables, actual peers and genuine complete lines; no all-cell bit mask.
Keep n=2/3/4 ordinary fish outputs unchanged. Fins must be nonempty; an ordinary fish is not relabelled.
New work limit 50000 combination extensions, entry/every 256 checks, per-call reset and metrics.

Vector: digit 5 bases R1{C2,C8}, R4{C2,C8,C9}; covers C2/C8, fin R4C9; eliminate at R5C8.
Remove apparent R4C2 corner for sashimi. Add R4C7 as a same-box second fin.
Reject split-box fins, off-cover target R5C7, target R7C8 missing fin visibility, partial/overlapping lines.
These geometry vectors supplement, not replace, real fixture/help requirements.
Baseline `core/js/engine/tech-fish.js:56-125` and `:281-305` (`function findFish`).

## Files to create/modify

- Fish engine/suite; full B and E. Generator design 6.6, Player technique design, both guide languages.

## Implementation steps

1. Enumerate bounded base/cover selections with exact full fin set and a complete witness.
2. Activate n=2; keep shared n=3 code unregistered until the next task.
3. Add ordinary/multiple-fin/sashimi/transpose tests and real B fixtures/example.
4. Measure limits, record reference changes and perform E/GH/quick acceptance.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS09a-B01 | Fins and sashimi are named only with the full visibility proof |
| MS09a-B02 | Ordinary fish and excluded families remain unchanged |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS09a-T01 | Complete/disjoint bases/covers, one fin box and every fin peer are checked |
| MS09a-T02 | Exact Findings, negatives, ordinary regression, caps/cancellation and state purity pass |
| MS09a-T03 | Full B/E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Complete E MS09a:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS09a\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS09a\analysis\G01.json
node tests\pattern-cost.js --ids=finnedXWing --runs=20 --json=..\docs\difficulty-v3\evidence\MS09a\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=finnedXWing --sources=tests\artifacts\difficulty-v3\MS09a\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=finnedXWing --sources=tests\artifacts\difficulty-v3\MS09a\sources.json --max-puzzles=8 --max-hints=400 --check
```

Use B's colour/chain real sources, then classic9 hard/expert bounded discovery. Jobs 1/no --jobs.
E 10-90 minutes; cost 1-30 seconds; GH 1-120 seconds curated or <=8 minutes/discovery.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Record at most one own-limit adjustment and rerun affected evidence; ten-minute command ceiling.

## Definition of done & handoff

Hand MS09b the bounded shared enumeration and its proof/ordering. Only finnedXWing is registered.

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
