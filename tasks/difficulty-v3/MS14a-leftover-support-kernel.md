# MS14a — Complete multiset support for leftovers, inactive

| Header | Value |
|---|---|
| Depends on | MS13b accepted; inactive preparation before MS13c |
| Size / active time | Medium; 50-60 minutes plus current-source E recording/checks |
| Owner / milestone | Shared subset engine/tests; M14a |
| Authority | R10/R17; IR72 inactive E closure; SA2 scheduling and execution rulings below |
| Status | Not started |

## Goal & business context

Prove leftover candidates from equal digit multisets, including repeated/fixed digits. Do not
mistake a truncated assignment table for impossible support.

## Scope and repository rules

In: inactive complete-support kernel/tests. Out: registration/weight/help activation until MS14b.
AGENTS/checklist, no Git/pack/log writes, classic core, CRLF, no Generator dependency in core.

### Serial run-ahead during GC-01 — SA2, 2026-11-17

This was the **only** later task permitted before the GC-01 answer. The owner has now selected
A under S-OD11, recorded in pack-only commit `88fe324`; this changes no MS14a kernel requirement.
The accepted implementation boundary is MS13b (`55d11ee`); intervening pack-only commits do not change its
engine, fixtures or quick inventory. Use the actual dispatch HEAD, not an imaginary accepted
MS13c source. The sequence is **MS13b -> MS14a -> MS13c (S-OD11) -> MS14b -> MS14c**.
Complete this task's evidence, review and commit before any next developer starts; the owner
answer does not preempt it or permit another writer.

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

### SA2 execution rulings — 2026-11-17

These settle the two pre-closure questions. Both implemented defaults are accepted; the kernel
stays unregistered, its limits stay 2/4/50,000, and all final gates remain to be completed.

1. **Finding fields: accept (a), with these exact semantics.**

   | Field | Binding meaning and order |
   |---|---|
   | `Finding.cells` | The distinct union of both difference sides after cancelling shared cells, ascending by numeric cell index. Include fixed leftover cells and leftover cells with no elimination; do not include the cancelled intersection merely because it belonged to a chosen unit. |
   | `i18nArgs.cells` | Labels of those same cells in that same order, using the model's cell-label API. |
   | `i18nArgs.digits` | Distinct **removed** digits from `Finding.eliminations`, ascending, as numeric 1-based values. Not a matching signature, its digit set, or a multiset common to all surviving assignments. |
   | `i18nArgs.lines`, `i18nArgs.regions` | `unitMeta.label` for each chosen unit, ordered within each list by its numeric unit index. Do not sort the label strings lexically or collapse distinct units merely because their displayed labels match. |
   | `Finding.eliminations` | Actual unsupported open-cell candidates, unique and sorted by cell index, then digit. `placements` stays empty. |

   Every published array is owned by the Finding, not borrowed mutable selection/support
   scratch. Keep the existing `{lines, regions, cells, digits}` shape; no per-side field or
   fabricated single matching multiset is needed. MS14b receives this semantic contract
   with the unchanged kernel. Its explanation must not call `digits` the digits shared by
   the sides, nor imply that every listed digit is removed from every listed proof cell.
   The exact per-cell action remains `eliminations`.
   Keep the existing singleton vector (`digits:[7]` when matching support is `{5}`),
   fixed-cell, multiset, field-by-field agreement, ordering and ownership assertions.

2. **Empty signature intersection: accept (a), whole-call decline.** At the first evaluated
   eligible choice for which **both required enumerations completed** and their signature
   intersection is empty, terminate the call with null. Do not skip that inconsistency to
   find a later elimination, remove every candidate, or emit a contradiction/placement.
   Keep `LEFTOVER_DECLINED` (or its explicit whole-call equivalent) distinct from an
   ordinary no-elimination choice.

   The reason is structural: each selection consists of the same number of disjoint
   complete units, so its two leftover sides must have equal digit multisets. The two
   within-side enumerations over-approximate the restrictions of every full solution.
   If their complete signature sets cannot meet, the **supplied candidate state** has no
   completion satisfying that choice's required constraints. Additional cross-side rules
   cannot repair an already-empty intersection. This is not a claim that the original
   givens alone are unsatisfiable; incorrect candidate masks can be the source of the conflict.

   This is an encountered-inconsistency rule, not a new whole-position validation pass.
   Do not scan otherwise ineligible/no-op choices, or continue beyond an earlier first
   valid Finding, merely to certify global consistency. Conversely, an incomplete/capped
   enumeration supplies **no** empty-intersection proof: return null under the existing
   exhaustion/budget contract without declaring inconsistency. Retain the existing `crossed`
   regression whose first choice is inconsistent while its later choice would remove
   something, and the separate complete-negative, truncation and budget cases.

### Interrupted development run — evidence correction, not a new gate

The manually entered `MS14a dev tech-subset leftovers 5` row in `lock-log.jsonl` already identifies
itself as hand-entered and keeps exit/node/wait values null. Keep that honest incident record;
it is not a fabricated automated pass. Add a short incident account in the task's existing
evidence report with the following:

- The interrupted command/filter, available source/test revision and transcript/tool-session
  reference; observed stop around 85 seconds, separately from any inferred cause.
- The tool/session or process IDs and termination evidence for the owned process tree, and
  the basis for identifying `dv3-sudoku.lock` as this task's stale lock before removing it.
  Preserve available partial output. If an identity, exact time or cleanup check was not
  recorded, mark it unknown/unverified; do not invent it or infer absence of overlap from
  the missing lock file alone.
- Classify the run as **manually aborted/incomplete**, not passed, not a 540-second timeout,
  and not a solver verdict. Confirm that no partial result entered published evidence.
  Keep the manual incident separate when aggregating automatic completed-run/node-time
  totals: null is unknown, not zero, and approximately 85 seconds is not a measured Node duration.
- Record the fixture-construction change to the restarting test solver, not a claimed finder
  speedup. Re-run the affected coverage and full mutation set on final source under the
  normal helper as already required; do not rerun the abandoned slow source solely to recreate
  an automatic log. No lock-helper redesign or blanket stale-lock deletion is authorized.

No owner stop is needed merely because an interrupted development run needs a labelled manual
record. Any actual evidence contamination, foreign/live-lock removal or unresolved overlap
affecting claimed final measurements must instead be reported to the orchestrator and resolved
before acceptance; it is not waived by this ruling.

**Bookkeeping:** `88fe324` is committed, not an uncommitted MS14a change. Retain `bc3450c` as
the developer's start base, name intervening pack-only commits accurately, and use fresh Git
status and final source identities in the report. S-OD11 resolves GC-01 without changing this
task's scope; S-AV36 remains open for later measurements/audit. This ruling is not acceptance
of the implementation: the orchestrator still reviews the completed task and its final gates.

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
resolved GC-01/S-OD11 and the still-open S-AV36 measurement/audit handoff). No further run-ahead
is authorized; MS13c follows this task's accepted/committed boundary.

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
| Status | Accepted after orchestrator review (S-OD4: inactive-kernel parts of the MS08a template, generic soundness/order suites; not in the SA1 set). Sole inactive run-ahead while GC-01 waited (SA2 `bc3450c`); the owner answered GC-01 during the task (S-OD11, `88fe324`, pack only). Two points ruled by SA2 in `058f16d`: Finding fields per option (a) (`cells` the distinct leftover cells of both sides, `digits` the distinct removed digits, unit labels by unit index); an empty signature intersection declines the whole call. Lock incident reclassified as aborted/incomplete per the same ruling |
| Start | 2026-11-17 03:51:30 (+07:00), base `bc3450c` (pack-only `88fe324` and `058f16d` landed during the task) |
| End | 04:49 stop with 2 points; SA2 ruling 04:51-05:06 (`058f16d`), relayed about 05:07; 06:02:16 final report; orchestrator review, re-check and commit 06:06 |
| Duration | About 1 h 53 min developer (58 min to the points, 55 min after the ruling); about 15 min SA2 ruling; about 4 min orchestrator review; 2 h 15 min from start to commit; locked commands in `docs/difficulty-v3/evidence/MS14a/lock-log.jsonl` (56 automatic rows, 2,501.8 node seconds, max 357.6 s, plus one hand-entered aborted row) |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 ruling and brief amendment); claude-opus-5.5 (orchestrator review) |
| Token usage | Developer: 373 model calls; 131,272,931 input tokens (129,568,667 cache reads); 477,042 output tokens. SA2 ruling: 9 calls; 3,242,625 input (3,197,344 cache reads); 26,770 output |
| AI credits | about 2,199 (developer); about 953 (SA2 ruling) |
| Verification | Inactive `SG.leftoverPatterns.find(model, state, ctx[, {workLimit}])` and frozen `LIMITS {units: 2, cells: 4, work: 50000}` in `core/js/engine/tech-subset.js` (289 lines added, none removed; referenced only by tests), jigsaw9 only: complete row/col and region sides with equal n (1 or 2), 1-4 leftover cells, every assignment of each side enumerated with fixed values and within-side peers, digit-count signatures (radix 5), per-signature per-cell support, removal only of candidates with no support in a shared signature after both enumerations complete; whole-call work cap with parent-budget checks at entry and at most every 256 units; cancellation propagates with no record. New fixture `core/tests/fixtures/jigsaw-models.js` (six layouts; both `tests.html`). Tests: `tech-subset` 100 -> 140, including agreement with an independent oracle on 480 seeded positions whose known solutions satisfy every Jigsaw unit. Mutants: 92, 91 detected + 1 equivalent (S04 radix 4: a side's digit count is at most n <= 2 by within-side peers). Inactivity: legacy differential 6,370 calls `8c0f69aa...042e3` for tree and base; subset/registry differential 526 states `bfce0d4c...4359`, interleaved digest equal to plain; `lawOfLeftovers` unregistered. E on the final source (freeze 05:10:30): 5 wires (77.4 s), 14 analyses (107.9 s), 520 hash keys (357.6 s), all three merge-checked with no writes and no `--update-hashes`; GH 37/37. Quick sets: Generator 4,456/4,456 (415.5 s), Player 2,698/2,698 (79.9 s); projection core-shared 100 -> 110, others unchanged; fingerprints Generator `2e7fa7f8...`, Player `3b3bebde...`; CI check passes. Orchestrator: code review of the kernel (soundness: the true assignment of each side lies in both tables under one signature, so a true digit is never removed); locked Generator `tech-subset,techniques,ui-contract,purity,technique-weights,difficulty-floor,tech-chain,i18n,digger-target` 963/963 (54.6 s), Player `tech-subset,help,help-example-tools,play,i18n` 366/366 (15.0 s), CI shard check 4,456 of 4,456 |
| Acceptance | MS14a-B01, B02, T01-T03 met (developer's evidence in `docs/difficulty-v3/evidence/MS14a/evidence.md` sections 4 and 6-9); orchestrator review: accept |
| Issues & resolutions | Two Finding/decline points ruled by SA2 (`058f16d`). One locked development run was stopped by hand after about 85 s (a random solution search hit a dead end); the wrapper wrote no record, so a hand-entered row with null unknowns is kept and classified aborted/incomplete, the stale owned lock was removed, and the tests now use a restarting solver (about 5 s). Three early layout-search scripts ran unlocked before the wrapper existed (durations unknown, not evidence). One superseded Generator quick run kept (`quick-superseded-1`). New numerical item for SA2 to number: the blank state of two irregular test layouts needs 98,530 and 81,664 work units, above the 50,000 limit (capHit 'work'); no census over generated Jigsaw layouts yet (IR72 C4 partial). Older MS13a/MS13b design paragraphs still say GC-01 is open. Not run: pattern-cost, Jigsaw census, qualification, soak |
| Handoff | To MS13c: accepted source with the inactive leftover kernel; quick totals Generator 4,456 (415.5 s) and Player 2,698 (79.9 s), fingerprints Generator `2e7fa7f8...`, Player `3b3bebde...`, core-shared projection 110; MS13c must keep these tests and counts and not reset them to MS13b's; help catalogue 37; GC-01 resolved by S-OD11 (option A); S-AV36 open; the Jigsaw kernel-cost item goes to SA2 for numbering (MS14b/MS14c and later measurements). To MS14b (after MS13c): the kernel and fixed Finding shape are frozen; MS14b must not imply every listed digit is removed from every listed cell |
