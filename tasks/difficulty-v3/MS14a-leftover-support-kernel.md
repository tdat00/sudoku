# MS14a — Complete multiset support for leftovers, inactive

| Header | Value |
|---|---|
| Depends on | MS13b accepted; sole inactive run-ahead during the GC-01 wait |
| Size / active time | Medium; 50-60 minutes plus current-source E recording/checks |
| Owner / milestone | Shared subset engine/tests; M14a |
| Authority | R10/R17; IR72 inactive E closure; SA2 GC-01 scheduling exception below |
| Status | Not started |

## Goal & business context

Prove leftover candidates from equal digit multisets, including repeated/fixed digits. Do not
mistake a truncated assignment table for impossible support.

## Scope and repository rules

In: inactive complete-support kernel/tests. Out: registration/weight/help activation until MS14b.
AGENTS/checklist, no Git/pack/log writes, classic core, CRLF, no Generator dependency in core.

### Serial run-ahead during GC-01 — SA2, 2026-11-17

This is the **only** later task permitted before the GC-01 answer. The current accepted
implementation boundary is MS13b (`55d11ee`); intervening pack-only commits do not change its
engine, fixtures or quick inventory. Use the actual dispatch HEAD, not an imaginary accepted
MS13c source. The sequence is **MS13b -> MS14a -> MS13c (GC-01 answered) -> MS14b -> MS14c**.
Complete this task's evidence, review and commit before any next developer starts, including
if the owner answers while it is running. If GC-01 remains unanswered afterwards, wait.

The kernel needs only existing model/bit/unit APIs, not grouped chains or a GC-01 choice.
Keep it unregistered and unreachable from normal solves, ratings, generation and hints.
Do not edit chain engine/consumers, choose a fallback/work policy, activate `lawOfLeftovers`,
add weights/locales/examples, adjust limits or take another task's implementation scope.
Retain the existing two-unit/four-cell/50,000-work starting contract. The original MS13-before-
MS14 **activation and milestone** order remains: MS14b explicitly also requires accepted
MS13c. This is preparatory scheduling, not a new owner/product decision or a review waiver.

**Baseline and quick bookkeeping.** MS13b's accepted totals are Generator **4,416** (431.8 s)
and Player **2,658** (74.2 s); its catalogue has **37** IDs/examples. These are source-qualified
baselines, not promised final counts/times. Derive this task's final inventories after adding
the shared tests/helper, cover every test in both quick sets, and record the actual increases
and per-app costs. Preserve the accepted MS13b strings/consumers. Update affected live guide/
design counts before the quick fingerprint and maintain CI timing metadata under the existing
check-list rule; no suite/tier removal, count reduction, timeout change or skipped test.
Hand off the new inventories, fingerprints and projections to MS13c; it must not reset them
to MS13b's numbers or overwrite these additions with an earlier whole-file version.

**Independent inactive closure, not work parked for MS13c.** Show registry/output inactivity
against the accepted baseline, including unchanged existing subset results when new-kernel
calls are interleaved with them (no shared-scratch interference). Use the existing focused
fixtures and inactive-task evidence recipe, not a new broad discovery or qualification run.
Changes to `core/js/engine/tech-subset.js` change all three E source identities: record **all
five G09-G13 wires, fourteen G01-G14 analyses and 520 hash keys** on this task's final source,
under its own evidence folder. Verify fresh wires against the unchanged canonical fixture
before recording analyses; merge-check all three families with **no canonical writes and no
--update-hashes**. Old ledgers remain history, not current-source evidence. Do not retag them
or defer their replacement until MS13c's activation E. Run complete GH `--check` without
discovery or writes; the catalogue remains 37 and the solver still never calls this kernel.
An unexpected output difference is an inactivity failure to investigate, not a pin refresh.

Announce the recorder work, use the existing E/IR12 item projections and locked compounds,
<=450-second admission, <=540-second process ceiling and >=15-second gaps. No GP/GQ/GS or
new evidence/tooling class is introduced. MS13c later owns its normal full activation E on
the source that includes this accepted inactive kernel; it need not redispatch MS14a, but
its complete quick sets retain these tests. The required orchestrator/template review of
MS14a is unchanged; this exception adds no routine analyst review.

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
- Generator design 6.6 and both developer guides describing the inactive support contract;
  affected test/file inventories in both app designs and the guides.
- Task-owned evidence and recorder-driver artifacts under the existing MS14a evidence/artifact
  directories; no recorder redesign or canonical fixture writes.
- CI timing metadata under the existing check-list maintenance rule, with no membership/tier change.

## Implementation steps

1. Enumerate valid equal-count unit selections and cancel shared cells.
2. Build complete signatures/support with fixed-value and within-side peer checks.
3. Construct only nonempty proved eliminations; exercise forced truncation/no-signature cases.
4. Keep registration absent and existing subset behavior unchanged.
5. Complete this task's current-source E/GH checks, both quick sets, CI and inventory handoff
   before MS13c; do not leave its inactive closure for the later activation task.

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
| MS14a-T03 | Kernel inactive; existing registered/canonical outputs unchanged; complete current-source E/GH, both quick sets and CI pass |

## Test plan

Generator `node tests\node-runner.js --suite=tech-subset,techniques,ui-contract,purity`; both quick sets.
Independent bounded assignment enumeration validates positive/negative vectors; known solutions
must satisfy full Jigsaw units. Artificial inconsistent states are negative tests only.
Apply the current-source inactive E/GH closure above. This replaces the earlier "no heavy gate"
wording for the already-required E provenance only; no GP/GQ/GS, discovery or synthetic help example.

## Definition of done & handoff

MS14b receives a complete-support, inactive scoped kernel and model-building helper, not a
best-effort absence heuristic, and cannot register it before MS13c acceptance. MS13c receives
this task's accepted source, unchanged canonical-output proof, full E/GH ledger/check paths,
current quick counts/fingerprints/costs/CI projections and inherited/new item list (including
the still-open GC-01/S-AV36 handoff). No further run-ahead is inferred if the owner is still absent.

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
