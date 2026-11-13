# MS14a — Complete multiset support for leftovers, inactive

| Header | Value |
|---|---|
| Depends on | MS13c accepted |
| Size / active time | Medium; 50-60 minutes |
| Owner / milestone | Shared subset engine/tests; M14a |
| Authority | R10/R17 |
| Status | Not started |

## Goal & business context

Prove leftover candidates from equal digit multisets, including repeated/fixed digits. Do not
mistake a truncated assignment table for impossible support.

## Scope and repository rules

In: inactive complete-support kernel/tests. Out: registration/weight/help activation until MS14b.
AGENTS/checklist, no Git/pack/log writes, classic core, CRLF, no Generator dependency in core.

## Inputs & context

R17, verbatim:

> Compare n disjoint complete rows or columns with n disjoint complete regions. Their digit multisets
> contain n copies of each digit; subtract shared cells. The two difference sets have equal **multisets**,
> including fixed values, not just equal digit sets.
> Intersect complete digit-count signatures and retain per-candidate support. Only a candidate with
> no support in a matching signature may be removed.

Add internal `SG.leftoverPatterns.find(model,state,ctx)` in tech-subset.js, unregistered.
Scope guard jigsaw9. Choose n=1 or 2; both chosen sides internally disjoint, complete units and equal
unit counts. Difference sides each <=4 cells. Fixed cells contribute fixed counts; open cells use
current candidates. Enumerate assignments respecting within-side peers; ignoring cross-side
constraints is a safe over-approximation.

Signature: digit-count vector of length model.digits, not a bitset. Retain per-signature/per-cell
supported digit masks. Only after both enumerations complete, intersect signatures; empty
intersection => decline inconsistent state, not remove all candidates. For each open cell, union
its supported candidates across matching signatures and remove only absent candidates.
Budget 50000 tested unit/assignment extensions across the ENTIRE call; check entry/every 256.
Any incomplete required enumeration => no Finding. No state-identity memoization.

Kernel returns normal R10 Finding with id lawOfLeftovers, key `technique.lawOfLeftovers.step`,
args `{lines:string[],regions:string[],cells:string[],digits:[...]}`, owned sorted output.
Tests: singleton side {5} vs candidates {5,7} forces removal 7; multiset {1,1,2} is NOT {1,2,2};
fixed values remain in signatures; transpose; mismatched unit counts; overlapping/partial sides.
Baseline `core/js/engine/tech-subset.js:195-239` (`function findSubset` / registrations).

## Files to create/modify

- `core/js/engine/tech-subset.js`, `core/tests/suites/tech-subset.test.js`.
- Pure core fixture helper for Jigsaw model construction if needed; both tests.html fixture lists.
- Generator design 6.6 and both developer guides describing the inactive support contract.

## Implementation steps

1. Enumerate valid equal-count unit selections and cancel shared cells.
2. Build complete signatures/support with fixed-value and within-side peer checks.
3. Construct only nonempty proved eliminations; exercise forced truncation/no-signature cases.
4. Keep registration absent and existing subset behavior unchanged.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS14a-B01 | Repeated and fixed digits are respected, not flattened into a set |
| MS14a-B02 | Exhaustion cannot manufacture an elimination |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS14a-T01 | Unit geometry, signature/support and singleton/repeated/fixed vectors pass |
| MS14a-T02 | Both sides must finish; cap/cancellation/state mutation tests pass |
| MS14a-T03 | Kernel inactive; existing outputs and both quick sets unchanged |

## Test plan

Generator `node tests\node-runner.js --suite=tech-subset,techniques,ui-contract,purity`; both quick sets.
Independent bounded assignment enumeration validates positive/negative vectors; known solutions
must satisfy full Jigsaw units. Artificial inconsistent states are negative tests only.
No heavy gate or synthetic help example.

## Definition of done & handoff

MS14b receives a complete-support, inactive scoped kernel and model-building helper, not a
best-effort absence heuristic.

## Resume rules — S-OD4

Review: orchestrator against the applicable inactive-kernel parts of MS08a's template and generic
soundness/order suites, not routine analyst cross-review. Correctness/evidence corruption or a
recorded-decision change stops; time/availability is a named numerical MS18c/MS18d item and work continues.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s, and the current bounded quick
manifest. Own any authorized new suite's r6c CI group; no new slow-cell evidence/tooling class.
Return the inherited/new item list and proof that registration/output remain inactive.

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
