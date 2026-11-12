# MS15a — Bounded ALS enumeration, inactive

| Header | Value |
|---|---|
| Depends on | MS14c accepted |
| Size / active time | Medium; 45-60 minutes |
| Owner / milestone | New shared engine module; M15a |
| Authority | R10/R18 |
| Status | Not started |

## Goal & business context

Provide complete individual almost-locked sets for both ALS-XZ and Sue de Coq without an unbounded
subset scan or candidate cache tied only to state identity.

## Scope and repository rules

In: new core module/enumerator, eight source lists, shared tests. Out: any registration/weight/output
change. AGENTS/checklist; no Git/pack/log edits, classic SG IIFE, CRLF and bilingual developer docs.

## Inputs & context

R18, verbatim:

> Enumerate k open cells within a genuine all-different unit with exactly k+1 candidate digits.
> Completeness of the unit is not required for this at-most-once argument. Deduplicate identical cell
> sets across units, order them canonically, use R10 limits and cache immutable geometry only.
> Candidate-dependent records are recomputed or keyed by exact candidate content.

Create `core/js/engine/tech-als.js`, exposing internal `SG.alsPatterns.enumerate(model,state,ctx,work)`.
Record: `{cells:sorted number[], digits:sorted number[], occurrences:{digit:sorted cell[]}}`.
Return `{records,complete,capHit}`; each retained record is individually complete/valid.
Maximum4 cells/set, 4096 retained records, 50000 combination extensions for an enclosing finder.
The supplied per-call work guard is shared with later pair search; never reset it at phase changes.
Check budget at entry/every256 units. Stop a retained-record prefix canonically; incomplete global
enumeration is NOT an assertion that another ALS does not exist. Such valid records may supply a
constructive witness if work remains. Work exhaustion leaves no allowance for an uncounted pair scan.

Order by cell-count then lexicographic cell indexes; deduplicate by cells (candidate content fixed
within this call). Candidate union/counts use digit masks only, never masks of all board cells.
No cached candidate-dependent list survives mutation of the same state object.
Vectors: two cells {1,2}/{2,3} form a2-cell ALS; union2 or4 does not. A bivalue cell is a1-cell ALS.
Duplicate row/box geometry yields one record. Genuine partial all-different units are allowed.

Baseline orientation: `core/js/engine/model.js:249-257` (`const partial =`);
`generator/tests/node-runner.js:42-48` (technique source order). New module has no baseline lines.

## Files to create/modify

- New core tech-als.js and `core/tests/suites/tech-als.test.js`.
- All eight L source lists; place after tech-chain.js in the existing technique block. Both
  tests.html CORE_SUITE_FILES lists include tech-als.
- Generator design6.6/13.6, Player engine design, both developer guides.

## Implementation steps

1. Implement canonical complete records and a shared per-call work-guard interface.
2. Test cardinality, duplicate geometry, partial units, fixed cells and candidate mutation.
3. Add all eight source/suite entries without registering an ID.
4. Run both harnesses and document the inactive API/cap-prefix semantics.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS15a-B01 | Later ALS proofs use real all-different capacity, not guessed support |
| MS15a-B02 | Bounded coverage cannot pretend an omitted set is impossible |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS15a-T01 | Exact k+1 cardinality, canonical dedup and individually complete retained records |
| MS15a-T02 | Shared work, record cap, cancellation and no stale state cache pass |
| MS15a-T03 | Eight source lists/two suite lists and both quick sets pass; no output change |

## Test plan

Generator `node tests\node-runner.js --suite=tech-als,techniques,ui-contract,purity,help`;
Player same selector except purity (Generator-only); then both quick sets.
Test max4 boundary, 4096 prefix with lowered test-only limits for a small regression, repeated calls,
same object changed candidates, complete-vs-partial units and a parent cancellation sentinel.
No heavy gate.

## Definition of done & handoff

MS15b/MS16 receive the exact ALS and shared-guard contracts. No solver ID is active yet.

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
