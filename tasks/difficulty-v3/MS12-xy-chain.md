# MS12 — Restricted XY-chain

| Header | Value |
|---|---|
| Depends on | MS11c accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared chains / both apps; M12 |
| Authority | R10/R15/R20/R21 |
| Status | Not started |

## Goal & business context

Name a bivalue-only chain distinctly from general forcing chains, with a proof graph that actually
enforces that restriction.

## Scope and repository rules

In: restricted edge mode, xyChain and B. Out: grouped nodes or relabelled general chains.
AGENTS/checklist, no Git/pack/log writes, real examples, EN+VI, CRLF and owned E.

## Inputs & context

R15, verbatim:

> Strong edges are only the two candidates in a bivalue cell; weak edges are equal-digit candidates
> in distinct peer cells. No conjugate-unit strong edges or general multivalue cell edges.
> Endpoints have the same digit in distinct cells; a false-to-true path proves their disjunction.
> Eliminate that digit from external candidates seeing both.

Register xyChain: chain/order186/weight1000/baseCost82, unscoped, no uniqueness.
Maximum12 edges intersected with a smaller caller maxChainLength; invalid/off rules match MS07.
Deterministic globally shortest represented endpoint proof; work cap50000 edge expansions.
Local exhaustion returns null, never a partial minimum. No placement/contradiction modes for this ID.
R10 Finding, key `technique.xyChain.step`, args
`{digit,kind:'endpoints',length,chains:[[[cell,digit,truth],...]]}` with copied arrays.
A common builder is allowed only with explicit edge filters; a renamed general finder is not.

Vector: A=R1C1{1,4}, B=R1C5{1,2}, C=R1C9{2,3}, D=R5C9{3,4}.
False4@A -> true1@A -> false1@B -> true2@B -> false2@C -> true3@C ->
false3@D -> true4@D is seven edges; remove4 at R5C1. A unit-conjugate shortcut is not an
allowed XY strong edge. Use a longer genuine path for help if earlier WXYZ consumes this example.
Baseline `core/js/engine/tech-chain.js:78-112` (scratch), `:353-385` (`function buildChainFinding`);
MS07a supplies the unregistered shortest-search seam.

## Files to create/modify

- Chain engine/suite; full B/E, both designs' chain coverage and both guide languages.

## Implementation steps

1. Add explicit restricted edge construction/search and own endpoint Finding/key.
2. Test the seven-edge vector, excluded shortcut, max12 boundary, ties and generic/partial units.
3. Add two real exact-Finding positives/negative, bounded firing cases and full locale/help integration.
4. Measure cost/caps, update current references/notes and E; finish quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS12-B01 | Every XY-chain explanation is genuinely bivalue-only |
| MS12-B02 | Lower named cost does not hide a general-chain proof |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS12-T01 | Edge filters, same-digit endpoints, shortest ties, 12/13 and caller limits pass |
| MS12-T02 | Exact ID/key, state/retained-proof ownership, cancellation/caps and full B hold |
| MS12-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Full E MS12:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS12\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS12\analysis\G01.json
node tests\pattern-cost.js --ids=xyChain --runs=20 --json=..\docs\difficulty-v3\evidence\MS12\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=xyChain --sources=tests\artifacts\difficulty-v3\MS12\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=xyChain --sources=tests\artifacts\difficulty-v3\MS12\sources.json --max-puzzles=8 --max-hints=400 --check
```

Prefer existing forcing-chain sources, then bounded classic9 master/nightmare. Jobs1/no --jobs;
E10-90 minutes, cost1-60 seconds, curated GH1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Own work limit may adjust once with evidence; maximum12 is not tuning permission.

## Definition of done & handoff

Give MS13 the explicitly restricted edge mode and legacy-proof compatibility. No grouped graph is active.

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
