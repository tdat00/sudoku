# MS16 — Sue de Coq

| Header | Value |
|---|---|
| Depends on | MS15b accepted |
| Accepted implementation base | `8b26e83` (MS15b); later pack-only commits do not replace this runtime baseline |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared ALS / both apps; M16 complete catalogue |
| Authority | R10/R19/R20/R21; S-OD4, S-OD12/S0 and accepted MS15a/MS15b guard contracts |
| Review | Orchestrator against MS08a/IR72 and generic soundness/order checks; no routine SA1 review |
| Status | Implementation reported complete; Q6 GH-source ruling below; orchestrator acceptance pending |

## Goal & business context

Finish the named catalogue with a bounded line/box capacity proof, not an unrestricted ALS pair scan.

## Scope and repository rules

In: the specified two/three-cell intersection form and full B. Out: other ALS families, retuning
MS15b's enumerator limits or earlier weights. AGENTS/checklist; no Git/pack/log edits.

### Accepted baseline — 2026-11-18

MS15b is accepted at **`8b26e83`**. Read its final evidence sections 19-24, not the
superseded quick-pass/pin-question states. The accepted complete pair is `quick-final/`.
The serial order is **MS16 -> MS17a -> MS17b**; one task/writer at a time.

| App | Accepted tests / suites | Accepted quick time | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,682 / 55** | **520.4 s** | `6fd07026f0546e127d073584fd2b19ebe91aba4e2bad1a3794f69f05d8474eb3` |
| Player | **2,906 / 32** | **107.7 s** | `0f53bb31168bfd866ca7e434762503a5e8ee45989849b09fb4b20558b41fe427` |

Preserve CI projections (seconds): **core-shared 150, steps 70, replay 70, mega 50,
own-fast 320, digger-target 30, pipeline 80, Generator player shard 90, Player job 170**.
The ALS/cage suites already belong to `core-shared`. Derive new inventories/fingerprints
after additions; keep every predecessor test and maintain projections under the measured
rule. Use the four bounded Generator groups, not an unbounded whole Generator command.

The accepted catalogue is **39**. `alsXz` is active at **194 / 1250 / 106** (order / weight /
base cost); the shared ALS defaults remain **4 / 4,096 / 50,000**. The current E families are
MS15b's complete `wire/`, `analysis/` and `hashes/` records:

- replay identity: `e1278c0b4e6966996ac79648b2210dd87acf714de8c08f485e6aab680f11ed26`;
- hash identity: `49a56a7e7212d126ea8f6cd2a7b9955283c0474b560933464ba6e7c3a4689234`.

Use the accepted MS15b canonical outputs/reference labels as the comparison baseline, not
MS15a's inactive outputs. This activation requires fresh E; the identities above are not
reusable final-source identities after another finder is added.

### Process: unresolved points, plans and source freezes

**Any unresolved point is a `QUESTION:` before the first dependent edit or run**, regardless
of whether it is called an assumption, default, D1-Dn or "for review". Return the evidence,
options and proposed choice, then wait for the orchestrator's answer and explicit resumption.
Once paused, do not continue independent edits/runs, acquisition or E. Do not make a
provisional specimen substitution first, even when a supplied pin/ruling turns out wrong.
Routine implementation within the settled contract and an evidenced, delegated R10 choice
remain developer work; a still-unsettled geometry/work-unit/order/API interpretation does not.

**Save and verify the plan before each bounded phase.** Include exact commands/cases,
source-qualified projections, expected statuses and output paths; IR12 compounds also need
finite per-item projections and admission checks. An edit-anchor/write failure blocks the
dependent launch until repaired and verified. Do not run a plan write and its dependent
payload in parallel, backdate a late plan or treat later disclosure as prior planning.
Announce the plan/slot to the orchestrator; use the existing shared-machine protocol.

**Format-check before every E freeze**, including new/touched comments and test code:
110-character code convention, CRLF/no BOM, final newline and trailing whitespace.
Finish included-source edits, the owned limit decision and living module contracts before
recording. Preserve exact source/diffs and identities; a later included-source byte change
requires fresh affected-family records, even for a comment. Finish fingerprinted guides,
designs, test-count wording, fixtures and tests before the final complete quick sets.

The CI manifest is outside both app fingerprints, but it is a separate CI input. Keep
selections/grouping fixed for the tested runs; finalize allowed counts/timing/projection/
provenance metadata **before the final CI check**, then verify actual workflow budgets and
the current fingerprints against all results. A later manifest edit needs another CI check.
No membership/tier/timeout/factor change is authorized by timing-metadata maintenance.

**S-OD12/S0:** no new corpus source-acquisition scan, cached or newly generated, without
prior owner authorization. Earlier Jellyfish permissions and unused quotas are not inherited.
Ordinary B remains: existing real sources/known unique fixtures first, then at most four
distinct discovery batches of twelve attempted requests **total for this task**, including
any old examples displaced by Sue de Coq, within the existing hint/time/lock bounds.
A failed batch or source edit does not reset that allowance. If it is insufficient, raise
QUESTION; no altered priority, disabled predecessor, synthetic production example or extra scan.
S0 does not prohibit the fixed E manifest or other measurements expressly owned here.

## Inputs & context

R19, verbatim:

> I: two or three open cells in a line/box intersection.
> A: p-cell ALS in the line outside the box; B: q-cell ALS in the box outside the line.
> A/B digit sets are disjoint and subsets of I's candidate union C.
> `|C| = |I| + p + q`; Z is C minus both ALS digit sets.

> Therefore all A digits are used among A+I in the line, all B digits among B+I in the box, and
> every Z digit occurs in I. Eliminate A digits elsewhere on the line, B digits elsewhere in
> the box, Z digits elsewhere in either unit; never eliminate from the proving sets themselves.

Register sueDeCoq: chain/order 196/weight 1300/baseCost 112, unscoped, no uniqueness.
Use genuine all-different line/box (or region) units and actual membership. The capacity argument
does not assume a digit must appear elsewhere in an incomplete unit. No suitable geometry => null.
Reuse complete ALS records/current MS15b limits; own total work starts at 50000 and includes enumeration/
pair extensions, never an uncounted second scan. Only this finder's own new work allowance may adjust once.

### Shared ALS handoff and this finder's own guard

Reuse `SG.alsPatterns.enumerate`, `createWork` and `spend`. Records contain only
`cells`, `digits`, `occurrences`, **not a unit id**: compute the needed actual membership
of every cell in I/A/B against the chosen line and box/region. An ALS's discovery unit
is not an ownership certificate for this pattern. Use the real model geometry/peers, not
visual-coordinate shortcuts or masks of all board cells.

The accepted shared cell/record bounds **4 / 4,096**, `SG.alsPatterns.LIMITS` and ALS-XZ's
50,000-unit default/behavior remain unchanged. Production supplies no `limits` override
to enumeration. The default effective cell bound is still clipped by `model.digits - 1`;
`complete` is not a feasibility, larger-ALS or later-search completeness certificate.

Sue de Coq gets **one fresh per-call guard**, initially 50,000, shared by all its charged
preparation, enumeration, intersection/partner and target work. It reuses the guard API,
not the spent guard of an earlier ALS-XZ call. Conversely, do not grant fresh work after
Sue de Coq's enumeration or per unit/intersection/phase. Any work before enumeration stays
charged when it receives the guard; a scope/geometry negative is not a cap.

MS16 may measure and make the existing once-only **Sue-de-Coq-specific work-allowance**
adjustment under R10, on before/after cap/latency evidence before final E. If selected, put
one common finite value for every model into its single `createWork(ownLimit)` call;
do not modify `LIMITS`, ALS-XZ's defaults/counter/order or the shared cell/record bounds.
The two/three-cell form is R19's algorithm scope, not another tuning knob.
MS15b's unused adjustment is not an extra allowance.
Unsettled policy or a change beyond that delegated envelope is a QUESTION.

Preserve entry/256-unit parent checks and explicit phase/publication checks:

- Work refusal means no Finding and an actual work cap; no fallback or uncounted continuation.
  Exactly consuming the allowance without a refused operation is not itself a cap.
- `complete:false, capHit:null` from enumeration is a parent stop, remembered even if a
  diagnostic context subsequently passes. Do not use the prefix or restart the budget.
- A record-quota prefix may supply a fully proved constructive witness with work/parent
  allowance left; no absence claim from omitted records or incomplete support.
- Publish one whole-call R10 record for `sueDeCoq`, not an extra record from the enumerator.
  Actual work refusal takes precedence over actual record-quota truncation; a parent-only
  stop leaves `capHit:null`, and a later parent stop does not erase an earlier local cap.
  Recheck before publication, discard a Finding on a final parent stop, and publish the
  observer outside the budget-exceeded handler. Observer/cancellation/other errors propagate.

Keep the inherited enumerator/ALS-XZ proofs, work definitions, purity and deterministic
repeat behavior. Update only the now-obsolete "Sue de Coq is absent" / "only ALS-XZ is active"
module, guide and API/registration pins, without deleting their remaining absence assertions.
The current chain-group membership becomes seven; do not put ALS-XZ/Sue de Coq into the
chain-proof-only `CHAIN_IDS` lists. No new module or duplicate entry in the eight loaders.

### S-AV39 and the inherited measurement gaps

Carry S-AV39 from accepted `8b26e83`, MS15b evidence section 5 and its named JSON records.
Its **ALS-XZ whole-call** results are not Sue de Coq measurements:

- Constructed stress: eighteen states; the 16 x 16 `{1,2}` flood hits the production work
  cap; the lifted whole-call count is 154,073 (not the older enumerator-only 154,032).
- Seeded/sweep population: 344 calls in 22 groups, 251 Findings, zero work caps and four
  record caps; the four capped Findings equal the lifted ones. This is not a generated-layout census.
- Repository-source population: 58 input rows, 254 calls, 20 Findings; fifteen source rows
  reaching ALS-XZ represent twelve distinct puzzles. Three work caps in the xWing help
  puzzle have no Finding even when lifted; repeat/duplicate rows are not independent puzzles.
  Maximum observed call latency 7.9 ms. Limits were retained, not proven universally sufficient.

Use this task's already-owned correctness/fixture/B/GH/cost cases to record its own
whole-call work, caps/parent stops, latency and proof yield, retaining the population and
source distinctions. Do not close S-AV39 merely because this second consumer passes; its
broader generated-position/whole-generation gaps go to MS18c/MS18d/MS18e.
Carry S-AV36, S-AV37, S-AV38 and all other inherited items without retuning their finders.
Also retain the explicit MS15b-Q6 constructed-placement coverage note for MS18e.

R10 Finding; args `{digits:A digits,partDigits:B digits,forced:Z,line:string,box:string}`;
key `technique.sueDeCoq.step` for Z empty, `.step.extra` when Z nonempty. These numeric list names
already localize correctly. Sorted owned eliminations, no placements.

Vectors: I=R1C1/R1C2 with C={1,2,3,4}, A=R1C5{1,2}, B=R2C3{3,4}.
Remove 1/2 elsewhere row 1 and 3/4 elsewhere box 1. Add R1C3 to I and 5 to C: also remove 5 elsewhere
in row 1 or box 1. Reject overlapping A/B digits, wrong C size, wrong spatial membership or overlaps.
Baseline orientation: core model all-different units and MS15a/b ALS module; final chain orders
must be 190/194/196/198/200/202, not a later deferred repair.

An isolated hand-vector success is not current normal-hint reachability. Earlier ALS-XZ
or another technique may take its deduction first; keep the registered order and earlier
techniques enabled when acquiring/replaying real examples. Both Z forms still need their
specified correctness coverage; one cannot be dropped because another technique pre-empts a specimen.

### SA2 rulings — pre-implementation Q1-Q5, 2026-11-18

The developer stopped before a tracked edit. Accept the five proposals with the precise
definitions/corrections below; no owner escalation is needed for these choices.
The R10 quantitative choice remains delegated within its existing envelope.
Resume only on the orchestrator's explicit relay; these rulings do not waive later QUESTION gates.

**Q1 — accept R1.** A line has `unitMeta.kind` **`row` or `col`**; the other unit has kind
**`box` or `region`**. Do not substitute diagonals, windows, cages or arbitrary all-different
units for either role. This is the named R19 form, not a claim that the broader R2 proof
is unsound. Keep `variantScope:null`: Diagonal/Hyper/Killer boards still have eligible
ordinary geometry, and Jigsaw's real regions are eligible.

Do **not** copy `tech-fish`'s `completeUnits` guard. The reason is the local capacity proof,
not an assumption that all future units with these kinds must be complete.
Require actual membership in the selected genuine all-different units. Do not invent
membership from displayed coordinates or impose a same-grid-label restriction on a real
multi-grid intersection. The deduplicated ALS records have no discovery-unit owner:
classify them by their cells, not by an assumed box/line origin.

**Q2 — accept option 1.** For the open shared cells `S = U intersect V`, enumerate **every
2-subset and 3-subset** as I, not only S itself when its length is two or three.
A lies in `U minus V` and B in `V minus U`, not merely outside the selected I.
Unselected shared cells are ordinary possible targets, subject to all R19 predicates and
the exclusion of I/A/B. The proof still gives `|Z| = |I| - 2`: I must use one A digit,
one B digit and every Z digit, so other intersection cells need no special exemption.
Keep an explicit proper-subset positive and a wrong-role/membership negative.

**Q3 — accept P3 as the production accounting, not the scratch scan's implementation.**
Use one per-call guard. Spend **before** each of the following actual operations:

1. **Box/region cell visited in geometry**, in ascending unit/cell order, including solved
   cells and visits that do not yield an eligible pair. Discover the intersecting lines
   from actual memberships (for example `cellUnits`) during these visits. Once geometry
   finishes, a lack of pairs with at least two open shared cells is a normal negative:
   no enumeration, retained zero, no local cap unless a spend really was refused.
2. **Enumeration extension**, with the existing enumerator counter and the already-used
   guard unchanged. No second allowance, refund or restart.
3. **Retained record classified**, once per call, in record order. This unit includes
   deriving all eligible line/box/region homes that contain every cell of that record.
   Build their home lists in the original canonical record order.
4. **Eligible (line, box) pair opened**, once, before rejecting empty side lists.
   Its bounded unit-list preparation may build the sorted, distinct `U union V` cell list.
5. **Home-list record tested** for being wholly outside the other unit, including a failed
   membership test. Visit the line's home list first, then the box's, each in record order;
   derive these two outside-side lists once for the unit pair.
6. **I opened**, once per complete two/three-cell tuple, before computing/testing its
   candidate union. This is a tuple unit, not an enumerator-style recursive-extension unit.
   Stream the tuples; do not materialize/search every combination before the first spend.
7. **Side candidate tested for `digits subset C`**, once per visited A/B record for this I,
   including rejection. Filter the A side first, then B, once each for this I, in record
   order; do not redo a B filter per A while claiming it was charged only once.
8. **Remaining (A,B) pair tested**, before overlap/disjointness, cardinality or any other
   capacity rejection. This unit includes those bounded predicates and computing Z.
9. **Distinct cell of `U union V` visited for a capacity-valid witness's targets**, once,
   in ascending cell order, before checking solved/proving-set/no-candidate exclusions.
   The unit includes all relevant A/B/Z digit checks for that cell. No filtered target
   prepass or double visit of an intersection cell charged as a single scan.

Repeated visits in different unit pairs, I tuples or witnesses are new units. A fully
scanned valid-capacity witness with zero targets is charged and skipped. Proven early
pruning may avoid unvisited search work, but cannot move the same work to an uncharged pass.
Unit-kind indexing is metadata setup; fixed-size tuple construction, mask predicates, local
ordering and owned Finding copies are bookkeeping, not additional units. This is a
documented logical-work counter, not a primitive-instruction or wall-time guarantee.

In particular, the probe's `geometry` cross product and `recordScan` full-record filters
are diagnostic implementations, **not** permitted production prepasses hidden behind
P3's smaller counters. Classify once, then actually use the home/side lists. No unmetered
all-pair/record/intersection/target scan, candidate-dependent cross-call cache or warm-call
counter discount. Measure actual executed work, not the probe's post-hoc totals.

Check the parent at entry before geometry, at most every 256 units, at phase boundaries
(geometry, enumeration, classification) and before every handled publication, including
an early geometry negative. Preserve remembered parent stops and local-cap precedence.
A refused spend ends the call with no Finding; mere exact-limit completion is not a cap.
A work/parent stop in target collection drops the **whole** partial Finding.

The developer may retain 50,000 or make the existing single **SDC_WORK_LIMIT-only** adjustment
on the registered finder's own before/after cap, parent-stop, latency and proof-yield evidence.
Keep this counter definition fixed for the comparison and finish the decision before E.
Do not infer production caps or a new limit from a lifted complete-scan projection, change
shared `LIMITS`/ALS-XZ, or acquire a new corpus to make the decision.

**Q4 — accept the first-witness order and Finding, with complete target collection.**
Order unit pairs by **line index, then box/region index**. For each, I has size two before
three, lexicographic ascending cell tuples; then A in retained record order, then B in
retained record order. The first (I,A,B) with a nonempty **finished** target scan returns
one Finding. Do not aggregate witnesses or select the largest elimination set.
A record-quota prefix promises only the first witness in that prefix, not a global minimum.

`technique:'sueDeCoq'`, `placements:[]`, sorted distinct I/A/B proof `cells`;
owned/deduplicated `eliminations`, ordered by cell then digit, containing **all** current
R19 targets for that witness: A digits elsewhere in U, B digits elsewhere in V, Z digits
elsewhere in either, never from I/A/B. No general shared-peer extension outside `U union V`.
Use sorted numeric digit lists in
`{digits:A digits, partDigits:B digits, forced:Z, line, box}` and the selected units'
actual `unitMeta.label` strings. Keep `technique.sueDeCoq.step` for empty Z and
`technique.sueDeCoq.step.extra` otherwise.

**Q5 — accept `SG.alsPatterns.findSueDeCoq(model,state,ctx[,opts])`**, with the documented
`{workLimit,limits}` diagnostic seam and no opts from the registered entry.
Use **`SDC_WORK_LIMIT` when `opts.workLimit` is undefined or opts is omitted**; an explicit
diagnostic value goes through the existing finite/nonnegative/flooring/zero validation.
Do not accidentally select `LIMITS.work` if the private SDC default is later adjusted.
Create exactly one guard; production forwards no `limits` override and never takes one
from `ctx.options`. Diagnostic ALS overrides do not change R19's I sizes or unit roles.

Undefined opts means no options; otherwise require a non-null, non-array object.
**Narrow coupled correction:** the current private `xzSeam` lacks the array rejection
already required by MS15b Q3. Reuse that private validator and add the missing array check,
with a focused regression for both finder entry points. This restores the recorded
diagnostic contract; no valid-input ALS-XZ behavior, limit, counter or order changes.
Validate an explicit `limits` value under the existing `resolveLimits` contract even
when geometry would return early; do not let an invalid option succeed only on a
no-geometry board. Keep all existing exports and add only `findSueDeCoq` to the exact API pin.

Publish exactly one fresh `{id:'sueDeCoq',work:guard.used,limit:guard.limit,capHit,retained}`
on a handled return, including capped/parent-declined null; `retained` is zero if no
enumeration ran, otherwise its actual retained count. Precedence remains
`guard.capped ? 'work' : recordQuotaHit ? 'records' : null`. A parent-only stop is null
and cannot erase an earlier local cap. A record-cap witness may return with that cap visible.
Final parent recheck precedes publication; the observer is **outside** the budget handler.
Cancellation/unhandled errors propagate without a later record; an observer exception,
including one named `budget.exceeded`, propagates unchanged with no retry/second record.

Keep focused boundary coverage in the existing ALS suite: geometry with no enum versus
a geometry work/parent stop; membership and proper I subsets; rejected-operation charges;
exact-limit versus one-short target completion; record-cap witness; sticky one-shot parent
stop and coincident local cap; invalid options before an early negative; observer errors,
purity/repetition and unchanged valid ALS-XZ behavior. Ordinary IR72 proof/oracle/mutation,
fixture and integration gates remain; these probes do not replace them.

**Evidence qualifications and corrections — retain the raw P0 records.**
P0.2 A has P3 **min 1,669, median 2,172, p90 2,810, max 3,103**; 2,172 is not its minimum.
The script deduplicates strings *before* recording `total:86`; **85 pass its unique-solution
check, one is skipped**, and sixteen remain unsolved after the preparatory prefix.
Do not conflate distinct strings with solution uniqueness or call this a census.
The three seeded complete-scan P3 totals above 50,000 use lifted records (up to 9,221,
versus production's 4,096) and continue past first witnesses: **not three demonstrated
production cap hits**. The first-witness figures also remain diagnostic.
The oracle/record scans compare structural pattern keys and share their geometry/target
helpers; the zero count means no removal of a supplied known solution. In particular seeded
positions need not have unique solutions. This is not a completed independent target-oracle/
exact-solver proof or GH reachability. Correct that prose; do not rewrite raw ledgers.
Keep the failed first-run transcript and the disclosed P0.2 extra pair-open-counter change,
which was absent from its pre-run plan; no retrospective claim that it was planned.

**GH heads-up — risk, not an owner/corpus request yet.** Zero hits at the first sixteen
order-196 fixture positions does not prove that later normal-hint positions of those or
other already-owned real puzzles lack Sue de Coq. The existing bounded known-source/
ordinary B route remains authorized, not a cached/test-kit corpus scan. Require real
fixture provenance and current normal-hint GH replay with all earlier techniques enabled;
seeded candidate states and an isolated direct-finder success are not GH sources.
If that route is exhausted or cannot run safely, pause with the actual attempted sources,
batch accounting and a concrete bounded acquisition proposal for the owner. Do not silently
substitute synthetic evidence, change priorities, broaden R1 or begin the proposed scan.

### SA2 ruling — Q6: fixed E request as the GH source, 2026-11-18

**Accept this source under ordinary B / IR72 H1. No S-OD12/S0 owner exception is needed.**
`classic9/nightmare#377` was already a fixed request in this task's mandatory E manifest.
Its current-source puzzle and Sue-de-Coq use were recorded in the owned E mechanism work
before GH. G4 materialized that one known request through the normal Generator pipeline
and checked its hash, rather than searching seeds, constructing a new corpus or changing
the request to obtain a hint. The saved export's 81 givens also equal
`mechanism-hash-tree.json`'s current-source givens exactly.

The subsequent Player normal-hint replay, not the rating's technique count alone, establishes
the real example: Sue de Coq at hint 19, 58 hints to solve; the all-40 check matches.
Keep the verified source/example. No replacement source, discovery batch, new generation
or owner request is needed merely because of this ruling.
This is **not I2 specimen replacement**: no old pin/premise was replaced, and no
"lowest qualifying seed of a scan" claim or unnecessary seed scan is required.

Record the following lineage in the **existing MS16 evidence**, not a new provenance schema:

| Field | Required record |
|---|---|
| Origin/choice | Fixed owned E request `classic9/nightmare#377`; selected after the sole changed hash and its E mechanism observation, not after a GH seed search |
| Runtime source | The frozen MS16 candidate on accepted base `8b26e83`, not the base engine itself; E `sourceHash` `8740fd9e8ed34fe1d80fada564b59b5467d75f8f61be0d2c14abae92320dfb4e`; preserve the ledger's actual commit/dirty provenance |
| Ledger/puzzle | `docs/difficulty-v3/evidence/MS16/hashes/classic9-nightmare-10.json`, record hash `7831a2bc8ff9c470`, no recorded overrides; current puzzle has 33 clues |
| Materialization | `make-source-e.js`: exactly one fixed `SG.pipeline.run` request, `classic9`, `nightmare`, seed 377, `trace:'off'`, empty variant options, unchanged defaults and the recorder's requested-level wrapper / 120000 ms budget; hash equality is checked before its output write |
| Export source | `player/tests/artifacts/difficulty-v3/MS16/sources-e377.json`; keep the established schema-1 export text and true Generator metadata `classic9` / `Nightmare` / `377`, including `#1,Classic Sudoku 9x9,Nightmare,377` |
| Replay/checks | G4-G6 commands/transcripts and actual lock-log times; one source replayed for the new ID, hint 19 / 58 hints solved, followed by all 40 matching |
| Accounting | One known-source materialization in G4; no discovery batch or corpus scan. E and its cause/mechanism regenerations remain separately accounted work, not erased by "one request" |

Do not relabel this as a test-kit seed/index or as proof of unique eligibility among all
regression seeds. Do not say that the base engine reproduces the **new** hash/puzzle:
the `8b26e83` comparator reproduces the old saved hash (36 clues), while the MS16 tree
reproduces the new E record and the 33-clue GH source. The existing section 10 records
that distinction correctly.

This confirms the fixed, already-owned source reuse above; it grants no standing corpus
scan, enumeration of additional candidate requests, quota reset, altered recipe, gate
waiver or change to normal-hint priorities. Other GH command/count/admission requirements
remain for the orchestrator's template review; this is not acceptance of the whole task.
In particular, reconcile G3's recorded 27-source / `--max-puzzles=64` new-ID check with
IR72 H1's at-most-16 source bound; this source-legitimacy ruling grants no count increase.
If review instead reveals a search, a recipe/source mismatch or failed normal replay,
preserve the records and raise QUESTION before replacement work or any expansion.

**Process note — MS16-Q6, carry to MS18e.** Record that the developer chose and acted on
the source-permission interpretation, including G4/G5, without the required QUESTION pause,
and first submitted that judgment for a ruling at completion. Record the actual chronology
and this later confirmation; do not imply prior approval. The source is legitimate, so
do not call this an unauthorized corpus scan or a retroactive S0 exception. The process
deviation is retaining an unresolved permission judgment for final review rather than
pausing before acting. A source inside a settled ordinary-B rule is otherwise a routine
choice; this does not impose individual approval for every unambiguous known source.

Add the note and lineage cross-references to the evidence/final report and its audit-item
list before acceptance. No runtime, catalogue, source text or golden change follows from
this ruling. Evidence-only corrections outside both fingerprints do not require new E
or quick runs; any actual fingerprinted change still follows the existing revalidation rules.

### Predecessor specimens: narrow MS16-only permission

Preserve the accepted literal **pre-ALS** recipe added under MS15b Q5, including its
`b958a58` provenance. Do not resnapshot it to include ALS-XZ or Sue de Coq. Those already-frozen
inputs are not a promise about the current full ladder.

For another **isolated predecessor-finder** quick specimen newly displaced solely by a
valid earlier Sue-de-Coq deduction, MS16 may apply the analogous scoped repair without
another ruling: capture the exact accepted **pre-Sue-de-Coq (`8b26e83`)** preparatory ID
sequence as a new explicit local list, prove the same baseline input/premise is recovered,
and record every affected test/helper caller and the causal evidence.
Keep puzzle strings, seeds, populations, C/window/limit settings and substantive assertions;
audit shared-helper callers and make a historical use opt-in where another caller is live.
Do not change the live `idsBefore`, registry, implementation under test, existing frozen
`LADDER`/`after`/v2 data, or manually alter candidates to force a premise.

This permission is **not** for current hints/GH, golden/replay/UI integration, ratings,
generation, qualification, GP or availability claims. It also cannot hide a shared-enumerator/
ALS-XZ regression, mutation or changed limit as "pre-emption". Mixed/unclear intent or an
unproved condition requires QUESTION before editing. This is MS16-local, not an acquisition
exception or automatic permission for later tasks.

### Golden-consumer pins: exact ruling before edits

After current E is recorded/explained, inventory every affected hard-coded golden/replay/
steps/Generator-player assertion and submit **one exact-value proposal for a ruling before
editing those pins**. Include file/full test name, expression and predicate being tested,
old/new value, golden ID, view, state position versus array/visual index, and the supporting
record/current-source transcript. The orchestrator routes the ruling as necessary.
No "refresh whatever fails" permission, silent alternative specimen or provisional edit.

Check the layer actually consumed by the test. In particular a raw move's `span.chosen:null`
does not imply a jump transition has `choice` at all; for a Why specimen establish a jump,
a non-null guided choice and `choice.chosen:null`, plus the required lines. Count compact
and details occurrences separately from distinct transitions. Preserve relational predicates,
not just numeric literals. Keep MS15b-Q6's explicitly controlled placement-only test, not
a claim that the current real goldens contain that case.
If a premise disappears, propose current in-manifest replacements or a clearly scoped
controlled case and wait for the ruling; do not lower counts, skip it or start a source scan.
This pin gate does not revoke the already-owned, deliberately explained E recorder writes
or routine registration/count updates for the one approved new ID.

## Files to create/modify

- `core/js/engine/tech-als.js`, ALS suite; full B/E; both designs/guides and v3 notes.
- Current chain-group membership pin and the narrowly authorized predecessor specimen
  derivations above; golden consumer tests only after the exact-value pin ruling.
- `.github/scripts/generator-quick.json` for owned counts/timing/projection metadata.
  The existing ALS/cage suite membership and all eight source entries stay; no duplicate.

## Implementation steps

1. Enumerate I and compatible disjoint A/B records under the shared guard.
2. Prove the capacity/cardinality conditions before constructing target removals.
3. Add two real exact-Finding positives/negative, both subtype messages and real help.
4. Record the own-work decision, complete formatting and freeze; finish E/GH/cost and obtain
   the exact-value golden-pin ruling before consumer assertion edits.
5. Confirm 40 total IDs/34 unscoped, current references and complete final quick/CI evidence.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS16-B01 | The line/box capacity argument is accurately named and explained |
| MS16-B02 | Full named scope is complete without claims of exhaustive omitted techniques |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS16-T01 | Two/three-cell, Z, disjoint/cardinality/membership and proving-set exclusion tests pass |
| MS16-T02 | Inherited ALS bounds/behavior, one own-call guard, truthful cap/parent-stop handling, purity and final order/counts hold |
| MS16-T03 | Full B/E/GH/GP-cost and both final quick sets/CI pass; inherited whole-generation GP gaps remain explicit, not relabelled passing |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-als,tech-chain,techniques,technique-weights,difficulty-floor,pattern-cost-tools,ui-contract,purity,i18n,help`;
Player `--suite=tech-als,tech-chain,techniques,play,i18n,help,help-example-tools,ui-contract`; both complete quick sets.

**Activation E:** finish the implementation, included-source docs/header and permitted own-work
selection, then format-check/freeze. Record **all five G09-G13 wires -> all fourteen G01-G14
analyses -> all 520 hashes** under the existing E/IR12 recipe. Merge/check the complete wire
family, explain differences from `8b26e83`, and publish/check intended wire updates **before**
recording analyses. Explain each subsequent changed record/key/reference effect before owned
publication. An unchanged family still gets current-source records/checks, without gratuitous writes.
Keep every request/seed and G13's 120000 ms recorder guard. No mixed-source/partial publication,
retagged MS15b ledger, guessed golden pin or pre-ALS comparator.
Any later included-source byte change invokes fresh affected-family records.

Individual shard/tool examples below are not the complete manifest or an execution script:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS16\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS16\analysis\G01.json
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS16\hashes\classic4-veryEasy-00.json
node tests\pattern-cost.js --ids=sueDeCoq --runs=20 --json=..\docs\difficulty-v3\evidence\MS16\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=sueDeCoq --sources=tests\artifacts\difficulty-v3\MS16\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=sueDeCoq --sources=tests\artifacts\difficulty-v3\MS16\sources.json --max-puzzles=8 --max-hints=400 --check
node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check
```

Check all 39 predecessor examples for displacement and refresh any affected ID through
ordinary B/current sources. Final GH must match **all 40 IDs**, not just Sue de Coq.
B sources: existing chains/ALS, then bounded classic9 nightmare/hell1. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-60 seconds, curated GH 1-120 seconds/discovery<=8 minutes.
These historical planning ranges are not launch bounds for the changed source.
**Write/verify/announce the bounded plan before starting.** Pentomino is complete, but the
shared slot/locks, IR12 admission, <=540 s process-tree ceiling and >=15 s gaps remain.
Report apparently stale locks before cleanup. Unknown/possibly >10-second work starts locked.
One own-limit adjustment maximum, not earlier ALS limits. 540-second process ceiling (check-list section 7).

### GP scope and the inherited jigsaw/unmeasured cells

**MS16 owns GP-cost (`pattern-cost.js`, 20 runs per owned fixture), not a new whole-generation
50-run GP matrix.** Checklist section 7 assigns intermediate generation GP to MS13c/MS15b
and the final offered matrix to MS18d. Activation alone does not silently add that campaign.
Report this scope honestly; no claim that MS16's generation GP passed.

Carry the accepted `8b26e83` observations, with their original source, not as MS16 measurements:

- **MS15b-GP-J:** jigsaw9/nightmare has only a two-run pilot (seeds 7000/7001): 9.065 s
  command wall, observed maximum 6,854 ms. The 50-run job was **not launched**: expected
  227 s, conservative 680 s above the 450 s admission basis. A two-run maximum is not a
  qualifying p95/verdict and the expected value is not a safe bound.
- **MS15b-GP-U:** 35 of MS15b's 37 admitted-technique cells have no GP measurement.
  The other full cell, classic9/nightmare, met at 50 runs (p95 2,312 ms / 2.5 s target).
  One full cell plus a pilot is not a complete/passing matrix. Do not combine these
  denominators with MS13c's different-source 50-cell evidence.

Route these gaps to MS18c for availability consequences and MS18d for final generation cost;
MS18e audits their disposition. No automatic retry of jigsaw9/nightmare, new pilot campaign
or work to fill the 35 cells belongs to MS16. If the orchestrator separately assigns a
generation measurement, obtain a credible current-source plan under the existing bounds
first; the changed source, an old mean or the per-puzzle target is not itself an admissible
50-run projection. Do not reduce the run count, split/merge a new evidence form, raise
guards/targets or call unmeasured cells passed. This is scope/admission discipline, not
a claim that S0 prohibits expressly authorized generation measurements.

## Definition of done & handoff

Give MS17 the complete catalogue and every final limit/source record. No missing ID/example waits
for the version task. Include the predecessor-specimen inventory, exact pin-ruling trace,
MS15b-Q6, the MS16-Q6 process/provenance disposition and all inherited/new numerical items,
explicitly including MS15b-GP-J/GP-U.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and generic soundness/order-invariant suites,
**not routine SA1 review**. MS17a is orchestrator-reviewed; **MS17b is the next SA1 task**.
Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical item for MS18c/MS18d and work continues within the bounds.
Unresolved choices and golden-pin proposals use the explicit QUESTION/ruling gates above.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list, actual gates and CI membership; all six S3 groups still remain.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted after orchestrator review (S-OD4: MS08a/IR72 template, generic soundness/order checks; not in the SA1 set). The developer paused before any tracked edit with Q1-Q5, ruled by SA2 in `248c697` (rows/columns against boxes/regions, no completeness gate; every 2- and 3-cell intersection subset; work unit P3; first canonical witness with complete target collection; `findSueDeCoq` API/observer with array-opts validation repair). The help-example source (the E hash key classic9/nightmare#377) was chosen without a pause; SA2 accepted it as ordinary-B/H1 reuse in `0a72b2a` and recorded the missing pause as MS16-Q6. Own work allowance retained at 50,000 |
| Start | 2026-11-18 05:16:56 (+07:00), base `2bae6f9` (implementation base `8b26e83`, MS15b); pack-only `248c697` and `0a72b2a` landed during the task |
| End | Q1-Q5 stop about 05:30, ruling 05:51; final report 08:33:12; orchestrator review and re-check about 08:36-08:41; SA2 GH-source ruling 08:47; evidence-only corrections about 08:48-08:52; commit 08:53 |
| Duration | About 3 h 16 min to the final report (about 21 min of question wait) plus about 4 min of evidence corrections; orchestrator review about 5 min; locked commands in `docs/difficulty-v3/evidence/MS16/lock-log.jsonl` |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 dispatch preparation and rulings); claude-opus-5.5 (orchestrator review) |
| Token usage | Developer: 458 model calls; 189,036,800 input tokens (187,104,540 cache reads); 664,557 output tokens. SA2 (MS16 preparation and rulings): 22 calls; 3,782,025 input (3,506,923 cache reads); 69,170 output |
| AI credits | about 3,019 (developer); about 1,040 (SA2) |
| Verification | `sueDeCoq` registered in `core/js/engine/tech-als.js` (group chain, order 196 between alsXz 194 and forcingChainLong 198, base cost 112, unscoped, no uniqueness) with weight 1300 in `generator/js/engine/difficulty.js`; `SG.alsPatterns.findSueDeCoq` with its own guard `SDC_WORK_LIMIT` 50,000 (shared 4/4,096/50,000 ALS limits untouched), nine charge points, first canonical witness, one observer record per returning call; the opts seam now refuses arrays (covers ALS-XZ too). Tests: `tech-als` 111 -> 174, `techniques` +8, `technique-weights` +1, `i18n` +1 per app; Generator 4,755, Player 2,978. Mutants: finder 139 (133 + 6 equivalent), ALS-XZ re-run 71 (70 + 1), enumerator 131 (130 + 1). Limits: real 301 calls on 23 puzzles, no cap; seeded 488 calls, 2 work caps (1 lost Finding on a sparse 16-digit position needing 101,791 units); allowance retained. E on the frozen bytes (freeze hash of `tech-als.js` `191923FA...` equals the tree): 0 of 5 wires, 0 of 14 analyses, 1 of 520 hashes changed (classic9/nightmare seed 377; the base engine reproduces the old hash, MS16 the new one); written to `regression.js` only. B: 0 of 26 references change. GH 40/40: Sue de Coq example from the fixed request classic9/nightmare#377 (normal hints find it at hint 19), provenance recorded per SA2's Q6. Pattern-cost 4 cases x 20, none capped. Quick sets: Generator 4,755/4,755 (549.4 s), Player 2,978/2,978 (116.8 s); projections core-shared 170, Player job 180; fingerprints Generator `c72462e8...`, Player `437d759f...`; CI check passes. Orchestrator: registration, weight, limit constant and freeze hash read; locked Generator `tech-als,techniques,technique-weights,difficulty-floor,pattern-cost-tools,tech-chain,tech-subset,tech-cage,i18n,digger-target,help` 1,209/1,209 (98.4 s), Player `tech-als,help,help-example-tools,play,i18n,techniques,ui-contract` 752/752 (37.3 s), CI shard check 4,755 of 4,755 |
| Acceptance | MS16-B01, B02, T01-T03 met (developer evidence in `docs/difficulty-v3/evidence/MS16/evidence.md`, sections 1-23); inherited whole-generation GP gaps stay explicit; orchestrator review: accept |
| Issues & resolutions | MS16-Q6: the GH source judgment was made without a QUESTION pause (accepted after the fact by SA2 as ordinary-B/H1 reuse, not a corpus exception). The read-only G3 check used 27 sources (above H1's 16 and the brief's 8) because the MS15b `--max-puzzles=64` check of other IDs was reused; it found no hint and contributed no source. The first evidence wording claimed the base reproduced every saved output; corrected to the single changed hash cell. Several plan times (D3b-D6, S) were imprecise; the lock log is authoritative. One mutant follow-up compound counted 30 s timeouts as detections (disclosed, repeated). Gaps: no generation-GP campaign (by brief); generated hell-level cap rate and whole-generation cost unmeasured; Sue de Coq is rare on real puzzles |
| Handoff | To MS17a: accepted source with `sueDeCoq` active (order 196, weight 1300); quick totals Generator 4,755 (549.4 s) and Player 2,978 (116.8 s); fingerprints Generator `c72462e8...`, Player `437d759f...`; projections core-shared 170, steps 70, replay 70, mega 50, own-fast 320, digger-target 30, pipeline 80, Generator player shard 90, Player job 180; help catalogue 40; named items S-AV36-S-AV39, MS15b-Q6, MS15b-GP-J, MS15b-GP-U, MS16-Q6; S-OD12/S0; M16 complete |
