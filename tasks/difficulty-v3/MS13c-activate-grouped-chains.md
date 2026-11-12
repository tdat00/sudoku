# MS13c — Activate bounded grouped forcing chains

| Header | Value |
|---|---|
| Depends on | MS13b accepted |
| Size / active time | Medium; 50-60 minutes plus E/GH/GP |
| Owner / milestone | Shared chains and both apps; M13 complete |
| Authority | R9/R10/R16/R20/R21 |
| Status | Not started |

## Goal & business context

Use the prepared graph and consumers together, with independently checked group proofs and no
claim of exhaustive Medusa/AIC/X-cycle coverage.

## Scope and repository rules

In: forcingChain/Long graph activation, owned proof data, affected examples/ratings/cost evidence.
Out: new IDs, changing selected C/depths, grouping XY-chain's restricted graph or weight fitting.
AGENTS/checklist, no Git/pack/log edits, complete B/E as affected.

## Inputs & context

R16, verbatim:

> Use singleton starting nodes for published forced/contradiction deductions; groups may be internal
> nodes and endpoint groups. A true multi-cell group is not permission to place an arbitrary member.
> An endpoint elimination must conflict with every member of each endpoint group.
> Each emitted Finding owns copied node/cell/path data, not borrowed mutable graph scratch.

Use MS13a canonical nodes/edges and MS13b proofVersion2:
`chains:[[{cells:[...],digit,truth},...],...]`; length is maximum path edge count; Finding.cells
is the full sorted union. Pure singleton paths may retain triples. Same IDs/weights/orders/windows.
Never decode a new node as cell*digits+digit. Incomplete construction or minimum search => null.
Construction plus search share a50000-work allowance; do not reset it between stages. Start with
4096 additional group nodes. Only these newly introduced limits may be adjusted once with evidence;
do not tune earlier XY/Nishio limits or selected C.

Independent checker validates every group member/edge/endpoint/target. Forced/contradiction starts
must be singleton; endpoint groups can eliminate only candidates conflicting with all members.
Regression vectors: one missed cross-peer; extra occurrence invalidating a strong group;
attempted arbitrary group placement; old singleton path retained after another call.
Baseline `core/js/engine/tech-chain.js:78-112`, `:348-429`
(`function pathData`, `function findForcingChain`).

## Files to create/modify

- Chain engine/suite and proof fixture helper; B's current chain fixtures/references, help/locales
  and real examples; E.
- Both designs' chain/proof/limitations sections and both language guides; v3 notes.

## Implementation steps

1. Connect the canonical graph to forcing/Long only, replacing every arithmetic node assumption.
2. Emit owned mixed proofs and validate them independently; keep registered windows enforced.
3. Refresh current reference/example data and document bounded, not exhaustive, coverage.
4. Record construction/search counts, cap hits, real GH and affected GP cells; finish E/quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13c-B01 | Every grouped deduction is sound and truthfully displayed |
| MS13c-B02 | Coverage is bounded and not advertised as all Medusa/AIC |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13c-T01 | All-member edges/targets, singleton placement starts and shortest windows hold |
| MS13c-T02 | Buffer bounds, shared work cap, cancellation and retained proof ownership pass |
| MS13c-T03 | B/E/GH, cost/GP records and both quick sets complete |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Complete E MS13c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS13c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS13c\analysis\G01.json
node tests\pattern-cost.js --ids=forcingChain,forcingChainLong --runs=20 --json=..\docs\difficulty-v3\evidence\MS13c\pattern-cost.json
node tests\perf.js --variant=classic9 --level=nightmare --runs=50 --warmup=0 --seed=7000 --gate
node tests\perf.js --variant=mega16 --level=easy --runs=50 --warmup=0 --seed=7000 --gate
```

Player GH:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong --sources=tests\artifacts\difficulty-v3\MS13c\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong --sources=tests\artifacts\difficulty-v3\MS13c\sources.json --max-puzzles=16 --max-hints=400 --check
```

Curated chain sources first, then bounded classic9 master/nightmare/hell1 under B.
Jobs1/no --jobs. E10-90 minutes, cost1-60 seconds, GP30-540 seconds/cell, curated GH1-120 seconds.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Record GP misses, never relax targets; ten-minute command ceiling.

## Definition of done & handoff

Return proof/limit records, real grouped example, reference changes and cost misses. No hidden
group activation remains for later tasks.

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
