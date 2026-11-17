# MS15b — ALS-XZ

| Header | Value |
|---|---|
| Depends on | MS15a accepted |
| Accepted implementation base | `b958a58` (MS15a); later pack-only commits do not replace this runtime baseline |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared ALS / both apps; M15 complete |
| Authority | R10/R18/R20/R21; SA2-Q-S05/S08; S-OD4, S-OD12/S0 and accepted MS15a D1-D8 |
| Review | Orchestrator against MS08a/IR72 and generic soundness/order checks; no routine SA1 review |
| Status | Implementation in progress; Q5 ruled below; awaiting explicit orchestrator resumption |

## Goal & business context

Add a constructive restricted-common-candidate proof using the bounded ALS records, without a
new group or a transient order inversion.

## Scope and repository rules

In: ALS-XZ and full B, including the deferred enumerator header correction.
Out: Sue de Coq, ALS-XY-Wing/death blossom, other finders' limits/weights or offered levels.
The prepared ALS defaults have only this task's existing once-only R10 selection, not a
general permission to retune earlier work.
AGENTS/checklist, no Git/pack/log edits, real examples, EN+VI and CRLF.

### Accepted baseline — 2026-11-17

**MS15a is accepted at `b958a58`**, following SA1 acceptance, SA2's `01e06629` rulings and
the developer's fix round. See `docs/difficulty-v3/evidence/MS15a/evidence.md` section 14;
the accepted pair is **`quick-final-2/`**, not the earlier `quick-final/`.
The serial order is MS15b -> MS16 -> MS17a -> MS17b, one task/writer at a time.

| App | Accepted tests / suites | Accepted quick time | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,618 / 55** | **505.4 s** | `fc00c83f0b268d8cf484229e81953ddb25b0ac5cd0d8220c194689bf2bf001c2` |
| Player | **2,844 / 32** | **100.5 s** | `d323c6158bca07f9f0852eed94a6fd404c503a31ab500fd39a9f4698497cf18d` |

Preserve CI projections (seconds): **core-shared 140, steps 70, replay 70, mega 40,
own-fast 320, digger-target 30, pipeline 80, Generator player shard 90, Player job 160**.
`tech-als` and `tech-cage` already belong to `core-shared`; no duplicate suite/loader entry.
Derive final inventories/fingerprints after the activation and maintain projections under
the measured rule. Run the four bounded Generator groups, not an unbounded whole command.

The accepted catalogue is **38**; valid ALS-XZ integration makes it **39**, not 38 replacements.
Compare against the current G06/22-Jigsaw-hash updates, not pre-MS14b fixtures; only explained
owned activation updates through E may change the current fixtures/pins. Preserve predecessor
test coverage and the S-OD11 grouped-chain policy/consumers.
The current E records are MS15a's own complete `wire/`, `analysis/`,
`hashes/` families, with identities:

- replay: `9f91a305ec02ef0c07a64b428d75f7a620b169af5c33304913508c44a81590c9`;
- hashes: `e91fff8a3cb4960847acb19367869588a353790fad049cdba55ff3431919f8ba`.

These are the accepted comparison records, not final-source ledgers for the activation.
Do not restore pre-MS15a sources or use MS14b's older identities as the current baseline.

### Mandatory unresolved-point pause — not an end-of-task review list

**An unresolved point is a `QUESTION:` even if it is labelled D1, an assumption, a default
or "for the reviewer to settle".** If a contract interpretation, interface, limit/reporting
choice, scope permission or evidence rule needs a ruling, stop **before implementing or
running work that depends on the choice**. Return the evidence, options and proposed default
to the orchestrator and wait for an explicit answer **and resumption**.
Once a question is raised, do not continue independent edits/runs, acquisition or E.
Do not implement the default, freeze it, finish the gates and ask for approval in the final
report. SA1/template review is not a substitute for this pause; MS15b has no routine SA1
decision stage. The MS13c/MS15a pattern of retrospective unresolved decisions must not recur.

Check for unresolved points before the first dependent edit and again before freezing E.
Routine implementation choices wholly within the settled contract remain the developer's
job; settled performance findings use numbered items under S-OD4. Neither is permission to
hide an unresolved decision. Preserve/finish or safely interrupt already-running owned work
through the helper; leave no orphaned process. Only the orchestrator routes a needed owner
decision or additional permission.

**S-OD12/S0:** no new corpus source-acquisition scan without prior owner permission, including
a cached/test-kit corpus. S-OD10/S-OD12 give this task no inherited exception or unused quota.
Ordinary B remains authorized: existing real sources/known unique fixtures first, then at most
**four distinct batches of twelve attempted requests total for this task**, not per ID,
within the hint/time/lock bounds. This includes any earlier examples affected by activation.
Failure of a batch consumes it; source edits do not reset it. If the required new/refreshed
example cannot be supplied within that route, raise `QUESTION:` and stop, not an extra scan,
changed priority, disabled predecessor technique or fabricated real source.

**Format before every E freeze.** Finish the deferred header fix, algorithm, limit selection
and other included-source edits, then check formatting (including comments, the 110-character
code convention, CRLF/no BOM, final newline and trailing whitespace) before recording.
Preserve the exact source/diff and complete identities. Any later included-source byte change
requires fresh affected-family records; no comment exemption or retagging. Finish all
fingerprinted docs, counts, fixtures and lists before the final quick sets as well.

### SA2 rulings — pre-implementation Q1-Q4, 2026-11-17

The developer stopped correctly before a tracked edit. These rulings settle the four points;
none needs an owner decision. Resume only on the orchestrator's explicit relay/resumption.
The R10 permission below is an already-delegated quantitative choice, not permission to
silently settle another unresolved contract.

**Q1 — accept (a), with the precise charge points below.** Preserve enumeration's existing
extension counter. The subsequent phase spends from the **same guard**, before each:

1. **Record pair visited**, once for `i < j`, before rejecting overlap, insufficient common
   digits or failed RCC conditions. This unit includes the disjointness/common-digit work
   and the bounded RCC cross-peer checks for that pair; no extra per-lookup unit is charged.
2. **(x,z) target scan opened**, for an RCC x and a different common z, even if it yields
   nothing.
3. **Peer-list cell visited in that scan**, before any eligibility/visibility rejection:
   solved cells, cells inside the proof, cells lacking z and cells failing an occurrence
   check all cost one unit. Do not prefilter them for free or count only successful targets.

Repeated visits in different scans are distinct units. No unmetered all-pair/RCC/target
prepass, new guard, refund or phase reset. A refused spend sets the work cap but does not
charge an extra unit. Merely finishing exactly at the limit is not a cap without a refused
operation. Document this counter and keep entry/256-unit parent checks and phase/publication
checks; the work unit is not a wall-time promise. The choice is fixed for the subsequent
limit comparison, not something to redefine to make 50,000 appear sufficient.
Option (c) alone would leave rejected pairs uncharged; it is not the selected accounting.
Total work is enumeration extensions + visited pairs + opened (x,z) scans + visited peer cells.

**Q2 — accept the proposed first-witness order/granularity, not "most eliminations".**
Use records in their canonical order; i outer, j increasing with j > i; x numerically
ascending over RCC digits, then z numerically ascending over other common digits. A z that
is also an RCC is allowed: the proof requires z != x, not that z be unrestricted.
Use the actual record digits / `model.digits`, not P0's literal nine.
Use **`A.occurrences[z][0]` as the target-scan pivot**, matching P0.1; iterate its actual
`model.peers` in ascending cell order. This fixes "first occurrence" unambiguously without
changing the probe's accounting. Test every z occurrence of both sets for visibility.

The first fully scanned (A,B,x,z) with nonempty targets supplies one Finding: all its valid
z targets, eliminations sorted by cell, no placements; sorted A-union-B proof cells and
their `SG.model.cellLabel` labels in that order. Never aggregate different witnesses.
**Finish that target scan before publishing it.** A work/parent stop during the scan drops
the partial target list, even if some individual eliminations were already proved; do not
return a subset while claiming all targets. An incomplete record prefix can still support
the first witness within that retained prefix, with its record cap visible; no global
first/minimum/most-eliminating witness is promised over omitted ALS records.

**Q3 — accept the owned diagnostic export**
`SG.alsPatterns.findXz(model,state,ctx[,opts])`, with `opts = {workLimit,limits}`.
The registered entry calls it with **no opts**. The helper creates exactly one guard via
`createWork()` when opts is omitted, otherwise `createWork(opts.workLimit)` (an undefined
value selects the default), and uses enumeration's defaults
unless the explicit diagnostic `opts.limits` is supplied. Do not forward `ctx.options`
into this seam or create an unbounded production path. `undefined` means no options;
otherwise require a non-null, non-array options object and preserve the existing helper
validation / `solver.invalidOption`, flooring and zero semantics for its values. No input object is mutated.
Add `findXz` deliberately to the exact API pin; preserve `enumerate`, `createWork`, `spend`
and the frozen `LIMITS`. The registered wrapper and this implementation must not both emit:
the shared implementation owns the one R10 record.

**Q4 — accept the decline/final-check rules, with a cap-precedence correction.**
Remember a parent stop from enumeration (`complete:false`, `capHit:null`) even if a diagnostic
context does not throw again; no prefix use or pair continuation follows. Recheck the parent
as specified. A final `budget.exceeded` before publication drops an otherwise complete
Finding. Cancellation and other errors propagate; a local work stop returns no Finding.

Use the observer's local-cap field as:

```text
guard.capped ? 'work' : recordQuotaHit ? 'records' : null
```

`recordQuotaHit` means enumeration actually returned `capHit:'records'`, not merely that
`complete` was false or a record-count bound was exactly reached.
Thus a **parent-only** stop has `capHit:null`; a later parent stop does **not erase** an
already observed work/record cap. Work refusal takes precedence if both local caps occur.
The parent-stop status is separate from this local-cap field in the measurements. Keep
the normal post-finder budget check; for one-shot diagnostic contexts also retain whether
a budget stop was observed during the call, since a later successful check cannot undo it.

Emit one fresh `{id:'alsXz',work:guard.used,limit:guard.limit,capHit,retained:records.length}`
on a handled return (including capped/budget-declined null). Do not emit after an operation
has thrown cancellation or an unhandled error. Run the final budget check **before** observer
publication, and invoke the observer **outside** the budget-exceeded handler: an observer
exception propagates unchanged, even if its code is `budget.exceeded`, with no second record
or manufactured successful return. A record-cap Finding remains valid with that cap visible.

Add focused coverage of exact-limit completion versus one-unit-short target scans, rejected
peer-cell charges, another RCC as z, record-cap witnesses, parent-only and coincident
local-cap/parent stops, a one-shot parent stop, and observer exceptions. Keep them within
the existing ALS suite and combine with the planned gates; no new tooling/evidence class.

**R10 — the developer may make the already-authorized choice itself, within its envelope.**
It may retain 4/4,096/50,000 or make the introducing task's single common, finite own-ALS
adjustment, **after** recording before/after cap and latency evidence under the fixed Q1
accounting. Bounded diagnostic comparisons through the Q3 seam on the already-owned
populations can establish that evidence without changing production constants; they are
not themselves production-limit adjustments. Record the chosen values, rationale and
populations in the task evidence and v3 notes **before final E**. No additional approval gate is added for that settled,
evidenced, explicitly delegated choice. P0 alone is not a global cap/latency study or a
reason to raise a bound automatically.

This is not one adjustment per phase, model or failed gate. It changes no other finder,
weight, band, caller budget, target or offer, and waives no correctness/fixture/GH obligation.
Retaining defaults does not spend the adjustment, but unused permission does not transfer
to MS16. A proposed second adjustment, changed work definition, model-dependent limit,
permission expansion or still-unsettled choice is a `QUESTION:` **before acting**, not a
routine default saved for later review. The one permitted selected configuration still
receives the normal orchestrator review and full current-source E/GH/quick/CI closure.

**Correct P0's report labels; preserve its raw script/log.** No new puzzle run is needed
merely to correct these descriptions:

- The script uses work **`1e9`** and records **`1e7`**, not the default record bound. Cells
  retain the default four. All observed counts happen to fit the nominal production bounds;
  that is an arithmetic prediction under (a), not production-finder cap telemetry.
- W2's 91-16,653 values are **pair counts only**, not the proposed option (b)'s pair-plus-cell
  cost. Relabel W2; no comparison run of the rejected alternative is required.
- The largest recorded **per-position full-scan sum is 46,041** = 1,140 enumeration + 44,901
  pair/target units (`uniqueRectangles`). **46,627** sums maxima from different positions:
  a conservative bound, not an observed maximum. The production finder will stop at its
  first completed witness; P0's full scans are not its measured per-call work.
- There are 86 distinct fixture strings inspected and 19 measured unique-solution states
  remaining open after the lower-order prefix. Uniqueness-rejected versus solved skip counts
  were not logged; do not claim the other 67 were all solved or infer a census/rate.
  The six oracle-positive states and zero solution-conflicting removals remain this finite
  observation, not completed GH or a whole-generator soundness/availability claim.

### SA2 ruling — Q5 predecessor chain specimens, 2026-11-18

**Choose A, with an explicit frozen preprocessing recipe and the boundaries below.**
The four named failures test chain-window ownership and S-OD11 cap/fallback/parent-budget
behavior on input states, not the requirement that today's full ladder reach those states.
They already use diagnostic C values and direct finder/seam calls. A valid puzzle-derived
state remains a legitimate input when an earlier new technique can solve it.
Preserve that coverage; do not lower `>20`, alter a cap/window, remove a case or replace a
failed search-cap premise by a solved/no-work position. **B is neither needed nor authorized;
no owner question or new corpus scan is required for this repair. C remains forbidden.**

Implementation:

1. Define a clearly named **explicit ID-list snapshot** of the accepted MS15a (`b958a58`)
   classic, unscoped prefix before `forcingChainLong`, with its existing order and scope
   filtering. It includes the earlier approved techniques and `forcingChain`, but no
   `alsXz`. Use a copied/immutable test-local list; do not use the unrelated frozen v2
   `LADDER` as a substitute. Do not leave this historical recipe as a live
   `idsBefore(...).filter(...)` expression that silently absorbs future registrations.
2. Pass that recipe only to the isolated specimen builders/call sites: the windows test's
   `below`, the grouped-cap `stuck()` helper and `capState()`. Audit shared helper callers
   before changing a default. The other isolated soundness/registered-versus-seam uses of
   `LONG_CHAIN_PUZZLES` may use the same recipe where they rely on the same long-proof
   premise, even if an aggregate assertion did not fail. List all affected callers.
   If a helper also serves a current-ladder contract, make the historical use opt-in instead.
3. Keep all twelve puzzle strings, seed/index provenance, `PUZZLE_530`, givens, models,
   C=4/C=6 settings, budgets, thresholds and substantive assertions unchanged. Do not
   duplicate/filter specimens to repair a firing count or hand-edit their candidate masks.
   Preserve the old acquisition history, but label these as **valid states derived through
   the pre-ALS prefix**, not positions guaranteed to be reached by today's full ladder.
   Describe the preprocessing under its actual bounded policies, not as proof that every
   possible earlier logical deduction is absent.
4. Prove the recipe preserves the accepted specimen inputs/premises: compare values and
   candidates (or their deterministic hashes) with the accepted pre-ALS derivation, or
   provide the exact unchanged-source/argument identity proof. Keep the existing paired
   effect logs and verify the earlier ALS deductions against the puzzles' solutions /
   existing soundness checks. Re-establish the unchanged window coverage and the #530
   C=6 `search-work`/50,000 premise, singleton seven-link proof and parent-budget controls.
   A mismatch/unsound deduction is a real investigation, not grounds to freeze away a bug.

**Keep the live registry live.** Do not change `idsBefore()` itself to exclude ALS, remove
or disable `alsXz`, run assertions against an old engine, alter production ordering, or
change the solver's allowed-technique set under test. Only the fixture's preparatory
deduction sequence is historical; the finders/seams being asserted are the current ones.
The registration membership pin should describe the **six current chain-group IDs**:
`xyChain`, `forcingChain`, `alsXz`, `forcingChainLong`, `nishio`, `nishioDeep`.
Preserve the existing predecessor metadata checks. Do not add `alsXz` to chain-proof/window
lists such as `CHAIN_IDS` merely because it shares the `chain` group.

**Task-local standing permission — yes, narrowly for MS15b.** The same recipe-freezing
repair may be applied to another existing quick predecessor-finder contract test without
a fresh QUESTION only when all of the following hold:

- It is an isolated finder/window/cap/cancellation/purity/soundness specimen, not a claim
  about the current full hint/generation ladder. Its intended contract is unchanged.
- Valid earlier ALS-XZ activity is the sole reason its required specimen premise disappeared;
  the predecessor implementation/policy has not regressed, and the baseline recipe restores
  the same input/premise. Keep the existing puzzle/seed/model population and assertions.
- The change is test-only preprocessing plus truthful labels/provenance. No original `LADDER`,
  existing frozen `after` array, v2 record, producer code, limit, threshold or puzzle source is
  rewritten to obtain a pass. A local explicit recipe replaces the problematic live lookup.
- Every changed file/test and every affected shared-helper caller is inventoried in this
  task's evidence, with the baseline/recipe, causal evidence and final verification.

This ruling grants only those derivation edits in existing quick predecessor-finder tests,
not general ownership of their implementation or a permanent exception for later tasks.
If the test has mixed/unclear intent or any condition is unproved, **QUESTION before editing**.
Do not silently reclassify a current-ladder test as an isolated/historical test.

**Excluded:** normal-hint reachability, Player normal-hint/event/replay/wire integration,
GH/catalogue sources, current ratings/`v3Expected`, E/canonical data, generation, qualification,
GP and availability contracts. They continue to run the current ladder including ALS-XZ.
Use their existing current-source B/E/GH/I2 refresh routes, or ask if those routes do not
cover the failure; never use A to fabricate a current example or green integration result.
All-39 current GH and the activation's ordinary integration gates remain mandatory.
I2's explanation/provenance duty stays; its new-source/lowest-qualifying-seed selection clause
does not require a scan when the existing input puzzles and their provenance are retained.

Record each application in the evidence and final reply, preserving the failed focused run
and current-ladder takeover observations rather than relabelling them passes. Run the
affected chain suite in **both app harnesses**, then the remaining owned focused/final gates
under the normal lock/admission rules. These test-only edits do not themselves invalidate E;
follow actual recorder identities and never re-record merely to erase the incident.
The activation's first complete E is still required; this is not permission to reuse MS15a's
ledgers for the changed production source.
They do change both quick fingerprints: settle the test changes and formatting before the
final complete quick sets/CI. No new evidence class, acquisition allowance or assertion waiver.

## Inputs & context

R18, verbatim:

> Choose disjoint ALS A/B and a restricted common digit x whose every A occurrence sees every B
> occurrence. For another common digit z, at least one z occurs in A or B: otherwise both ALS would
> have to use x, impossible. Eliminate z only from targets seeing every z occurrence in both sets.

Register alsXz: chain/order 194/weight 1250/baseCost 106, unscoped, no uniqueness.
`forcingChain` is 190 and `forcingChainLong` is 198. Use MS15a individually complete records;
enumerate disjoint pairs canonically and test every restricted-common cross-peer.
No disjoint-cell shortcut for visibility.
Record cap 4096/max cells 4 and own 50000 total work cover enumeration plus pairs/targets. A prefix of
complete ALS records can give a constructive proof; never use truncation as an absence claim.
R10 Finding; key `technique.alsXz.step`;
args `{digitX:x,digitY:z,cells:string[]}`, copied sorted proof cells/eliminations, no placements.

### Deferred header correction — owned here before E

SA1 finding 1 / D8 was deliberately deferred from MS15a's unchanged engine bytes. In
`core/js/engine/tech-als.js`, replace the header's mathematical definition at about line 7
and its `complete` description at about line 36, not merely a guide paragraph:

> An ALS is k open cells of one all-different unit with exactly k+1 candidate digits.
> This enumerator searches within the call's effective cell bound, resolved from the
> production default or the test-only override and clipped by `model.digits - 1`.
> `complete:true` means every eligible structural ALS within that effective bound was
> enumerated and retained. It does not certify feasibility, absence of larger ALSs or
> completion of the later pair/target search. `complete:false` is not an exhaustion proof.

Make the text accurate for the existing test-only override as well as the production default.
State the final selected default accurately (MS15a starts at four); do not define the
mathematical concept by that implementation limit. Describe a cap/budget stop as "no Finding",
not an exhaustive "nothing found" result.
Also replace the now-stale "INACTIVE / nothing is registered here" module/test/living-doc
claims: the enumerator remains a helper with no inner observer, while ALS-XZ is active here;
Sue de Coq is not active yet. Preserve the historical MS15a evidence and its accepted boundary.
Fold this correction into the activation's source freeze/E; no separate inactive E pass is needed.

### Accepted MS15a / SA1 consumer handoff

Create one `SG.alsPatterns.createWork()` guard for the whole call and use its `spend` for
enumeration plus pairs/targets; no replacement, refund or phase reset. The helper emits no
observer record: this registered finder owns one fresh whole-call
`{ id, work, limit, capHit, retained }` record through the existing R10 route. Charge actual
pair/target work to that guard too; no unmetered continuation or rejection scan outside it.
Preserve the enumerator's work definition and entry/256-unit budget cadence.
Production passes **no `limits` argument** to `enumerate`; diagnostic overrides are not
production configuration or a workaround for a cap.

Records are `{cells,digits,occurrences}` with **no unit id**. Recompute any needed membership
from all record cells and the actual `model.units`/`cellUnits`, including genuine partial
all-different units. Do not guess ownership from a first cell, use a mask of board cells,
change the record schema to attach an invented unit, or require both ALSs to share one unit.
The RCC test is still **every cross-peer relation** between the x occurrences; the target
must see **every** z occurrence in both disjoint sets.

| Enumerator result | Enclosing finder obligation |
|---|---|
| `complete:false`, `capHit:'work'` | The guard is spent. No pair/target continuation or fallback. Return no Finding through the existing API and report the work cap (`capHit:'work'`), not a completed "nothing found" / absence result. |
| `complete:false`, `capHit:null` | The parent budget ran out. Recheck it; do not use the prefix or silently turn this into a completed negative. Preserve the existing parent-budget stop semantics, not an invented local-cap flag or replacement budget. |
| `capHit:'records'` | A canonical prefix of individually complete records may supply a constructive witness while shared work and parent budget remain. Keep the truncation visible; no exhaustive absence claim. A subsequent work stop is still a work cap. |
| `complete:true` | Only enumeration within the effective bound is complete. Pair/target search has its own remaining work and parent checks; this flag does not complete that search. |

Recheck the parent budget after enumeration/before consuming records and before publication.
`null` as the existing no-Finding return value must not erase the stop cause in observer/
evidence handling. Cancellation and other errors propagate; the cost tool's post-finder
budget check stays intact. A zero-candidate cell is inconsistent, not made feasible by a
structural record. See the accepted D1-D8 rulings for the full contract.

### S-AV39 measurement/limit duty; inherited S-AV36/37/38

Own S-AV39's first **active whole-call** coverage/cost measurements and the already-permitted
once-only R10 limit decision within existing B/GH/cost/affected-GP work. Record enumeration
versus pair/target work, retained records, local record/work caps versus parent stops, latency
and real proof yield, with source, model/position population and denominator. Keep constructed
stress, seeded test positions and normal real-puzzle positions separate.

The accepted MS15a data are in its evidence sections 12/14: blank 9 x 9 costs 810 units;
the `{1,2}` 16 x 16 flood has 154,032 full units and is cut by the default work limit.
The 33 density probes used diagnostic work `1e9` / records `1e7` (SA1 reproduced their rows
on the final source), **not production limits or a default cap-rate census**.
Keep **4/4,096/50,000** unless the once-only measured R10 route selects otherwise before E.
Justify retention or a common adjustment by coverage/cost evidence, not by avoiding reruns.
No automatic rise to a stress maximum, model-specific allowance, unbounded fallback or
transfer of another finder's unused tuning allowance. MS16 inherits the selected shared limits.

Carry S-AV36 (grouped-chain construction/search/fallback exposure), S-AV37 (leftover limits
2/4/50,000; measured blank/60-seeded/14-real-puzzle populations and remaining gaps) and S-AV38
(MS13c's incomplete GP/slowdown record) unchanged as inherited, source-qualified items.
They do not authorize chain/leftover tuning or a new campaign. S-AV39 goes to MS18c for
measured availability, MS18d for cost and MS18e for audit; no wider acquisition/census/tooling
allowance follows. New activation cost outcomes must be identified on this source, not
silently treated as additional completed rows of MS13c's old GP.

### Witnesses, current anchors and activation-test updates

Witness vector: A={R1C1{1,2},R1C2{2,3}}, B={R1C4{1,4},R2C4{3,4}};
x=1 cross-peers on row 1, z=3 at R1C2/R2C4; remove 3 at R2C2.
Negative: overlapping sets, one missing x cross-peer, target missing one z occurrence, or wrong
ALS cardinality. A different valid earlier witness may be returned by canonical enumeration;
unit-test the specified witness independently and record exact real catalogue Findings.
An isolated hand-vector success is not normal-hint reachability: keep earlier techniques
enabled in real acquisition/replay, and never move ALS-XZ ahead of them merely to get a source.
Current anchors: `core/js/engine/tech-chain.js` registrations for `forcingChain` / `forcingChainLong`
(190 / 198), `generator/js/engine/difficulty.js::WEIGHTS`, and
`core/js/engine/tech-als.js::enumerate/createWork/spend`.

Retain MS15a's 58 enumerator tests, including the corrected oracle-independence wording and
finite C34 check. Intentionally retarget the now-obsolete "no ALS ID is registered" test and
inactive header to **ALS-XZ active, Sue de Coq and other unapproved IDs absent**, not deletion
of that coverage. If an owned finder/test export extends `SG.alsPatterns`, update its exact
API pin deliberately while preserving the existing methods/contracts. The helper's
"emits no observer" assertion remains true even though the enclosing finder now emits one.
Any default-limit/cap pins changed by a permitted R10 selection need the same explicit
before/after justification; keep the boundary, prefix, cadence and soundness coverage.

## Files to create/modify

- `core/js/engine/tech-als.js`, ALS suite; full B/E; both designs/guides and notes.
- `core/tests/suites/tech-chain.test.js`: current chain-group membership and the Q5
  fixed-specimen derivations. The task-local standing permission above owns only equivalent
  derivation/label edits in other existing quick predecessor-finder tests, with its inventory
  and exclusions; it grants no additional production or current-ladder integration scope.
- Existing unscoped technique fixtures/cost route for `alsXz`; no new cost-tool family.
- `.github/scripts/generator-quick.json`: current inventories/measured projections and any
  owned selector coupling, preserving `core-shared` membership and every predecessor test.
- Eight source lists already changed by MS15a: verify, do not add duplicate entries.

## Implementation steps

1. Apply the deferred header correction and implement bounded disjoint-pair witness search with one shared guard.
2. Add exact real positives/negative and independent full-completion/visibility tests.
3. Register/integrate at 194 with group chain and both locale/help packs.
4. Measure S-AV39 and settle the owned limit decision; complete formatting before freezing E.
5. Record/explain activation effects through complete E/GH/cost/affected GP; finish docs, quick sets and CI.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS15b-B01 | The x/z capacity proof is real and explained with localized digits |
| MS15b-B02 | Bounded records do not become false absence proofs or a new ALS group |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS15b-T01 | Disjointness, every x/z peer and exact cardinality negatives pass |
| MS15b-T02 | Shared work, truthful cap/parent-stop handling, retained records, state purity and order 190<194<198 are validated |
| MS15b-T03 | Full B/E/GH/cost/GP accounting, both final quick sets and CI; failed/incomplete numerical outcomes remain explicit, never a green claim |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-als,techniques,technique-weights,difficulty-floor,ui-contract`;
Player `--suite=tech-als,techniques,play,i18n,help,ui-contract`; both quick sets.

### Activation E — fresh records and deliberate output updates

This is **activating**, not MS15a's inactive check-only closure. Freeze final included source
after the header, implementation and permitted own-limit decision are complete.
Record **five G09-G13 wires first**; merge/check the complete family, investigate/explain
differences from `b958a58`, then publish/check any intended wire changes **before** analysis.
Next record/merge/explain/publish/check **all fourteen G01-G14 analyses**, then **all 520
hashes**, using the existing E/IR12 recipe. An unchanged family still gets current-source
records/checks; it needs no gratuitous write.

Keep all requests/seeds, hidden-level diagnostic keys and G13's 120000 ms recorder guard.
Explain every changed wire, analysis, hash key and qualifying tier/reference effect using
the accepted MS15a implementation as comparator, not a pre-grouped/pre-leftover engine copy.
Only intended owned updates and their I2 pins may be written; no bulk refresh to conceal an
unexplained failure, no partial/mixed-source publication or retagging of MS15a ledgers.
Any later included-source byte change requires fresh affected-family records again.
MS15a's timings are planning references, not guarantees for an active ALS-XZ candidate;
announce credible complete-item projections and output paths before each bounded phase.

The following are **individual shard/tool examples**, not the complete E manifest or a
permission to start analysis before the full wire family is checked/published:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS15b\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS15b\analysis\G01.json
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS15b\hashes\classic4-veryEasy-00.json
node tests\pattern-cost.js --ids=alsXz --runs=20 --json=..\docs\difficulty-v3\evidence\MS15b\pattern-cost.json
```

### GP and GH

Derive and list the **affected variant/level cells** on the active source; these two GP
commands are named checks, not a substitute for the affected-cell accounting:

```powershell
node tests\perf.js --variant=classic9 --level=nightmare --runs=50 --warmup=0 --seed=7000 --gate
node tests\perf.js --variant=jigsaw9 --level=nightmare --runs=50 --warmup=0 --seed=7000 --gate
```

Project the **whole 50-run command** before launch, using credible source-qualified data;
the per-puzzle target is not an upper bound. Unsafe/unmeasured cells and genuine timing
misses remain named current-source items for MS18c/MS18d under S-OD4. Keep every intended
cell/status in the report; no pilot-as-p95/pass claim, omitted denominator, invented aggregate
pass or new tooling/evidence class to force a slow cell. Do not launch an unchanged timed-out
command again without a new admissible basis.

Check all 38 old examples for activation effects and own any needed refresh through B.
New ALS-XZ and refreshed examples must be from the normal current hint ladder, with real
source provenance and unchanged acquisition ceilings. From Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=alsXz --sources=tests\artifacts\difficulty-v3\MS15b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=alsXz --sources=tests\artifacts\difficulty-v3\MS15b\sources.json --max-puzzles=8 --max-hints=400 --check
node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check
```

The final complete check must match **all 39 IDs**, including any refreshed old examples
and the region-aware Jigsaw example; selecting only `alsXz` does not close GH.
B sources: existing chains, then bounded classic9 nightmare/hell1. Jobs 1/no --jobs; E 10-90 minutes,
cost 1-60 seconds, GP 30-540 seconds/cell, curated GH 1-120 seconds/discovery<=8 minutes.
Those are historical planning ranges, not command bounds or permission to exceed admission.
**Announce the bounded plan to the orchestrator before starting.** Pentomino is complete,
but another task may hold the shared timing slot. Keep `Invoke-Dv3Node`, <=450 s compound
admission, <=540 s process-tree ceiling and >=15 s release gaps; report stale locks before cleanup.
This introducing task may adjust its new ALS limits once with before/after evidence; record them
for MS16/MS17. Never relax performance targets to hide a miss.
Finish current fixtures, counts, living docs and formatting before the final complete quick
sets; reconcile fingerprints, measured CI metadata and the existing CI membership/budget check.

## Definition of done & handoff

Hand MS16 the selected shared limits, sound record/membership and budget/cap contracts,
whole-call measurements and remaining S-AV39 gaps. Report every reclassification and GP
miss/unmeasured cell, plus inherited S-AV36/37/38 and the other open items. MS16 cannot retune
the shared ALS selection merely because it adds a second consumer.

## Resume rules — S-OD4

Review: orchestrator against MS08a/IR72 and generic soundness/order-invariant suites,
**not routine SA1 review**. MS16 is likewise template-reviewed, MS17a gets orchestrator
review, and **MS17b is the next task in the SA1 set**.
Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical MS18c/MS18d item and work continues.
The unresolved-point QUESTION pause above applies before acting; a performance item is not
permission to self-approve a new interpretation or scope change. An incomplete mandatory
E/GH/GP outcome is never relabelled passing.
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
