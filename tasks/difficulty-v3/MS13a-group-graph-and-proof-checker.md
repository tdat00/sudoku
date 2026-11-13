# MS13a — Canonical grouped graph, inactive

| Header | Value |
|---|---|
| Depends on | MS12 accepted |
| Size / active time | Medium; 50-60 minutes |
| Owner / milestone | Shared chain engine/tests; M13a |
| Authority | R10/R16 |
| Status | Not started |

## Goal & business context

Replace the assumption that every graph node is one candidate with a proved group-node model.
Do not expose grouped Findings before both proof consumers can read them.

## Scope and repository rules

In: inactive graph builder and independent proof checker/tests. Out: changing registered finders,
ratings, UI or examples. AGENTS/checklist; no Git/pack/log edits; classic core code and CRLF.

## Inputs & context

R16, verbatim:

```text
Node = { cells:sorted unique nonempty cell[], digit }
truth(Node) = at least one listed occurrence is true
```

> Same-digit weak edges require disjoint groups and conflict between **every** cross-pair.
> Same-digit strong edges require disjoint nodes exhausting all current occurrences in a complete unit.
> Retain different-digit singleton weak links inside one cell and bivalue-cell strong links.
> Never create an implication from one convenient peer pair or overlapping groups.

Add internal `SG.chainGraph.build(model,state,ctx)` returning
`{nodes,weak:number[][],strong:number[][],complete,work,capHit}` for tests/later activation.
Singletons: active candidates in ascending cell/digit order. Additional groups: current nonempty
box-line intersections, canonical key digit+sorted cells, deduplicated and sorted lexicographically.
No stale candidate cache. Weak/strong adjacency is deterministic and deduplicated.
Group limit 4096 additional nodes; work limit 50000 tested combination/edge extensions. On incomplete
construction return complete=false; later search must not use it as a complete graph.
Entry/every 256 budget checks; allocate for actual nodes/edges, not old cell*digits products.

Independent test checker must recompute candidate membership, every cross-peer and complete-unit
coverage from model/state, not trust builder adjacency. For paths verify polarity, each edge,
endpoint consequences and every target; group truth is not a placement in an arbitrary member.
Define its fixture/test helper in `core/tests/fixtures/chain-proofs.js`, shared by chain tests.

Vectors: same-digit A={0,1}, B={9,10} is weak only if all four cross-pairs conflict; one missing
pair or A/B overlap invalidates it. A={0,1}, B={2} is strong only if a complete unit's remaining
digit occurrences are exactly {0,1,2}; add occurrence 3 => no strong link.
These predicate vectors are synthetic unit tests, never production help examples.
Baseline `core/js/engine/tech-chain.js:78-112` (`function scratchFor`) and `:348-385`
(`function pathData`); `core/tests/suites/tech-chain.test.js:124-185` (proof checker).

## Files to create/modify

- `core/js/engine/tech-chain.js`; chain suite; new core fixture `chain-proofs.js`;
  both apps' tests.html CORE_FIXTURE_FILES entries.
- Generator design 6.6/13.6, Player proof design and both developer guides (inactive API stated).

## Implementation steps

1. Implement canonical nodes and complete edge obligations with bounded construction.
2. Add independent proof checking, including invalid/arbitrary group placements.
3. Keep registered kernels on the old singleton graph.
4. Test caps, deterministic ordering, mutated state reuse and input immutability.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13a-B01 | Group reasoning means an actual disjunction, not a convenient singleton |
| MS13a-B02 | No half-integrated proof reaches players |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13a-T01 | Every edge obligation and malformed/overlapping/partial-unit negative is independent-tested |
| MS13a-T02 | Actual-sized buffers, deduplication, per-call bounds and state reuse are correct |
| MS13a-T03 | Existing registered output and both quick sets remain unchanged |

## Test plan

Generator `node tests\node-runner.js --suite=tech-chain,techniques,ui-contract,purity`; then both
quick sets. Include >old-product synthetic node count within the configured limit, limit+1 refusal,
cancellation, an added unit occurrence and identical node ordering after unrelated calls.
No heavy gate or new generated expectation in this inactive task.

## Definition of done & handoff

Give MS13b/c the canonical graph/checker schema and incomplete-graph rule. Do not activate it early.

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
