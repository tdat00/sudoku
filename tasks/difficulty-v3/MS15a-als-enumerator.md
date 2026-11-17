# MS15a — Bounded ALS enumeration, inactive

| Header | Value |
|---|---|
| Depends on | MS14c accepted |
| Accepted implementation base | `6a9fbf6` (MS14c); later pack-only commits do not replace this runtime baseline |
| Size / active time | Medium; 45-60 minutes plus inactive E/gates |
| Owner / milestone | New shared engine module; M15a |
| Authority | R10/R18; S-OD4, S-OD12/S0 and IR72 source-aware inactive closure |
| Review | SA1 cross-review before acceptance, plus orchestrator gates; not template-only |
| Status | Implementation submitted; D1-D8 ruled below; awaiting SA1, fixes and acceptance |

## Goal & business context

Provide complete individual almost-locked sets for both ALS-XZ and Sue de Coq without an unbounded
subset scan or candidate cache tied only to state identity.

## Scope and repository rules

In: new core module/enumerator, eight source lists, shared tests. Out: any registration/weight/output
change. AGENTS/checklist; no Git/pack/log edits, classic SG IIFE, CRLF and bilingual developer docs.

### Accepted baseline and serial handoff — 2026-11-17

**MS14c is accepted at `6a9fbf6`; M14 is complete.** The next order is **MS15a -> MS15b -> MS16**,
one task/writer at a time. MS15a loads an **inactive helper**, not an ALS-XZ or Sue de Coq
finder: no new registered ID, weight, rating, hint or help example. MS15b owns ALS-XZ activation.

The accepted final results are `docs/difficulty-v3/evidence/MS14c/evidence.md` section 7 and
`quick-final-2/` for both apps; `quick-final/` is the superseded pair.

| App | Accepted tests / suites | Accepted quick time | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,559 / 54** | **500.9 s** | `e587fe7e9b0d1051e21338e4b6ff1ee04a935b17427230900f4b476078e769ff` |
| Player | **2,786 / 31** | **97.1 s** | `cb4f326ea9dc87c8ada980b2b38f073fd2215f617c3424cc925421d975832285` |

Preserve CI projections (seconds): **core-shared 130, steps 70, replay 70, mega 40,
own-fast 320, digger-target 30, pipeline 80, Generator player shard 90, Player job 150**.
Keep `tech-cage` and every predecessor test/list entry; add `tech-als` to the existing
`core-shared` shard. Derive new inventories/fingerprints and maintain projections under the
standing measured rule, not by restoring older counts. Use the four bounded Generator
groups, not one unbounded no-options run. The accepted timings retain their evidence
conventions and are source-qualified measurements, not promises for the changed source.

Catalogue **38**, MS14b's G06 analysis/pins and 22 Jigsaw hashes, the active leftover
registration and S-OD11 grouped chains/consumers stay unchanged. MS14c changed no production
source and re-recorded no E family: the accepted comparison records are still MS14b's
final **E-2** top-level `wire/`, `analysis/` and `hashes/`, checked by MS14c, not `e-1/`.
They are comparison evidence, not reusable final-source ledgers after this task adds its module.

### S-AV handoffs — carry, do not retune or expand measurement

| Item | Source-qualified handoff and remaining owner |
|---|---|
| S-AV36 | Carry MS13a's construction observations and accepted MS13c (`9d58d86`, its evidence report) construction/search/fallback measurements separately. S-OD11 settled the policy; the numerical cap/coverage/cost item remains open. Do not retune the chain limits or import its short-only fallback into ALS. MS18d owns final cost, MS18c measured availability consequences and MS18e the audit. |
| S-AV37 | Carry accepted MS14b (`0e3a0c4`, evidence section 6 / `s-av37.json`), unchanged through MS14c. Limits **2/4/50,000** stay: blank stress **2/5** layouts cap (`staggered`, `wavy`); **0/60** seeded positions cap, max **5,842**; **0/38** real calls across **14 puzzles** cap, max **3,845**. Keep the populations separate. Generated-layout cap rates, broader real positions and whole-generation cost remain unmeasured. No leftover tuning, Jigsaw census or inherited unused adjustment; MS18c/MS18d/MS18e retain the item. |
| S-AV38 | Carry accepted MS13c's honestly incomplete GP: **21** affected cells have 50-run results (15 meet, six miss), **16** have two-run pilots only and **13** have no complete pilot. Preserve the recorded slowdown, gaps and source-qualified comparisons against MS14a, not `main`; pilot maxima are not p95/pass verdicts. No chain repair or new GP campaign belongs to this inactive task. MS18c/MS18d/MS18e own final availability/cost/audit. |

Include these and the other inherited items in the final reply. A passing inactive enumerator
or unchanged E does not close an earlier availability/cost item. Report any new ALS numerical
finding separately under S-OD4 rather than relabelling an inherited item.

### QUESTION pause, S-OD12/S0 and format-before-freeze

**Any `QUESTION:` stops this task for the orchestrator.** Return state, evidence, options and
the proposed default; do not apply it, continue independent edits/runs or start more gates
until an answer and explicit resumption. Preserve/finish or safely interrupt an already-running
owned bounded command through the normal helper; leave no orphaned process. Settled
performance findings remain named items under S-OD4, not automatic owner stops.

**S-OD12/S0 keeps case-by-case prior permission.** Neither S-OD10 nor S-OD12 supplies a
standing corpus route or unused acquisition quota. This inactive task owns no source-discovery
batch or corpus scan. GH checks existing sources only; full E below is the fixed authorized
recorder manifest, not an acquisition allowance. Any proposed exception needs its ruling
before work begins, including prior owner authorization where required.

**Run the format check before any E source freeze**: include comments and the engine's
110-character limit, UTF-8/no BOM, CRLF, final newline and trailing whitespace. Verify all
eight source entries before recording. A copied freeze helper must cover the new module
and changed loaders, not merely an old hand-picked file list. Preserve the exact source/diff
and complete identities, not only a remembered wrap or truncated hash.
Any later included-source byte change invokes fresh-record rules for the affected complete
families. Never retag old ledgers. Finish all fingerprinted docs, counts, fixtures and list
changes before the final quick-set freeze too; a comment is not exempt from its fingerprint.

### SA2 rulings — D1-D8 and closure disclosures, 2026-11-17

These are rulings on the submitted implementation on `8bd2487`, not task acceptance or a
waiver of SA1's independent review. **None requires an owner decision.** The default limits
and the inactive/no-output-change contract are unchanged.

| Point | Ruling | Binding interpretation / action |
|---|---|---|
| D1 shared guard | **Accept** | Keep `{ limit, used, checkedAt, capped }`, `createWork` and `spend`. A missing/invalid guard must fail, never silently create a replacement. One guard belongs to the enclosing finder call; enumeration and later search share it without refund/reset. Updating `checkedAt` after a real entry budget check is not a work-allowance reset. |
| D2 observer | **Accept** | The unregistered enumerator emits none. MS15b's enclosing registered finder owns the one whole-call work record, including enumeration and pair/target work. Do not invent an enumerator technique ID or double-count by emitting both inner and outer records. |
| D3 work-cut prefix | **Accept** | Keep completed sizes and discard the interrupted size. That conservative prefix satisfies the canonical-order contract; a partial traversal of a size need not be its canonical prefix. A spent work guard provides no free pair/target scan, and a parent-budget stop provides no permission to consume the retained records as a Finding. |
| D4 exact record quota | **Accept** | Exactly 4,096 retained records is allowed. Set `capHit:'records'` only after a further distinct record is established; charge the probe to the same guard and parent budget. If work runs out while probing, report the work stop/incompleteness, not an invented overflow proof or a fresh allowance. |
| D5 zero-candidate open cell | **Accept the literal structural enumeration** | The helper reads candidate masks and applies the stated cell-count/union predicate; it does not validate feasibility or propagate constraints. Clarify the evidence: **"A returned record certifies the structural ALS predicate and complete occurrence data, not that the position has a completion. An open cell with no candidates is inconsistent; its literal record is not a feasible-puzzle example or a deduction on such a position."** Consistency handling remains with the caller; no new invalid-position solving behavior is authorized. |
| D6 sizes beyond the digit count | **Accept** | `k + 1 <= model.digits` is a necessary mathematical condition. Skipping impossible sizes, including stopping at three cells on a four-digit model, is not a production-limit adjustment or missing eligible coverage. |
| D7 optional test seam | **Accept** | Keep the fifth `{ cells, records }` argument and the guard's diagnostic work limit. Lowered limits and the existing finite raised-limit stress/diagnostic calls are test-only, with their actual values recorded. Production callers pass no seam overrides; defaults stay 4/4,096/50,000. A diagnostic override neither changes production scope nor consumes/grants a tuning allowance. |
| D8 completeness | **Accept implementation; clarify the evidence and consumer contract** | Use: **"`complete:true` means every eligible structural ALS within the effective cell bound `1 <= k <= min(cells, model.digits - 1)` was returned; `cells` defaults to 4. It does not claim feasibility, larger-set completeness or completeness of a later pair/target search. `complete:false` makes no exhaustion claim."** A parent-budget stop (`complete:false`, `capHit:null`) is not a completed negative; the enclosing finder rechecks its budget before using records and before publication. |

**Process record.** Replace "for SA1 to settle" / "no QUESTION is open" as the disposition of
these points with the dated rulings above and the fact that they were implemented before
this ruling. Do not imply prior authorization or independent acceptance. Routine implementation
choices within a settled brief do not each need a permission request, but an unresolved
contract/permission/default must be raised as `QUESTION:` and paused before acting, not
implemented for a later reviewer to approve. No retrospective revert/replay is required
merely to manufacture that earlier pause. SA1 still owns implementation review, including
the reported IR72 coverage/mutation gaps; these rulings do not mark those gaps resolved.

**New item: S-AV39 — ALS cost/cap exposure.** Replace the unnumbered candidate in the evidence,
notes and final reply with this ID. Preserve the submitted observations: blank 9 x 9 costs
810 units; sparse 16-digit/Samurai-shaped test positions expose the record/work bounds;
the constructed 16 x 16 `{1,2}` flood costs 154,032 units with a sufficiently raised guard,
while the production guard stops at 50,000. Keep defaults 4/4,096/50,000.
These are constructed/seeded positions, not a real/generated-puzzle census, a lost-deduction
count, a universal structural maximum or a whole-generation/GP verdict.

The density transcript is **33 probe calls**, not 30: three classic9, twelve 12-digit,
fifteen 16-digit and three Samurai; seed 1504 is reused across density ranges. Its script
uses **work limit `1e9`, record limit `1e7`, cells 4**, so counts above 4,096/50,000 are
diagnostic totals, not production-cap breaches or a measured default cap rate. Keep those
limits, populations and the probe's actual source identity separate from the final default
tests; do not assign a final-source identity to an earlier development run without proof.
If that identity is unavailable, retain the probe honestly as development evidence.

Route S-AV39 to **MS15b** for the already-owned whole-call coverage/cost measurements and
once-only own-limit decision; **MS16** inherits the selected shared limits without retuning;
**MS18c** receives measured availability consequences, **MS18d** cost and **MS18e** the audit.
No automatic increase to 154,032, model-specific allowance, fallback, wider acquisition,
new census or extra gate follows from the item.

**The 87 overlong test lines need fixing.** AGENTS/checklist explicitly mention engines,
but do not exempt tests from the full conventions they reference:
`DEVELOPERGUIDE.md` "Conventions" and `generator/design.md` section 12.2 state the
110-character limit without that qualification. Rewrap only this task's new suite through
the edit tool, preserving test names, strings, vectors, assertions and behavior. Do not
weaken the convention or mass-format unrelated existing suites.

Batch the formatting/report fixes with SA1's review fixes before the final runs. Test-only
wrapping does **not** invalidate E: keep its current ledgers and verify the three final-source
merge-checks, with no regeneration solely for that edit. It **does** change both quick
fingerprints: rerun the focused gates and both complete quick sets, reconcile current
fingerprints/projections and finish CI on the final files. Preserve the prior results as
superseded, not failed. Retain behavioral evidence only with its actual source/test provenance;
an assertion/behavior change needs its affected verification, not a "format-only" label.
If any E input changes during the fix round, even an engine comment, apply the normal
complete affected-family recording rule. No source-identity exemption is being granted.

**Unlocked 25.9 s draft run:** disclosure suffices on the reported facts. It failed 11/58
draft expectations, published nothing, and later final-source focused/quick coverage ran
under the lock. Preserve the failure, approximate time, unprotected timing status and
**overlap not excluded**. Do not rerun merely to erase the incident, or use its duration
as a protected measurement; replace only evidence that actually depended on that run.
The short recorded lock waits do not prove nobody else held the slot during the unlocked
window: change that claim to "no contention observed at the recorded acquisitions".
The separate 540 s mutation abort remains aborted/incomplete; its stale `exit:0` is not a
pass or a known real exit. Retain that explanation and the later complete run. None of
this permits an unknown/possibly >10-second command to start unlocked in future.

## Inputs & context

R18, verbatim:

> Enumerate k open cells within a genuine all-different unit with exactly k+1 candidate digits.
> Completeness of the unit is not required for this at-most-once argument. Deduplicate identical cell
> sets across units, order them canonically, use R10 limits and cache immutable geometry only.
> Candidate-dependent records are recomputed or keyed by exact candidate content.

Create `core/js/engine/tech-als.js`, exposing internal `SG.alsPatterns.enumerate(model,state,ctx,work)`.
Record: `{cells:sorted number[], digits:sorted number[], occurrences:{digit:sorted cell[]}}`.
Return `{records,complete,capHit}`; each retained record is individually complete/valid.
Maximum 4 cells/set, 4096 retained records, 50000 combination extensions for an enclosing finder.
The supplied per-call work guard is shared with later pair search; never reset it at phase changes.
Check budget at entry/every 256 units. Stop a retained-record prefix canonically; incomplete global
enumeration is NOT an assertion that another ALS does not exist. Such valid records may supply a
constructive witness if work remains. Work exhaustion leaves no allowance for an uncounted pair scan.
Keep these starting limits; MS15b, not this inactive preparation, owns the introducing task's
once-only measured adjustment. No earlier finder's unused allowance transfers here.

Order by cell-count then lexicographic cell indexes; deduplicate by cells (candidate content fixed
within this call). Candidate union/counts use digit masks only, never masks of all board cells.
No cached candidate-dependent list survives mutation of the same state object.
Vectors: two cells {1,2}/{2,3} form a 2-cell ALS; union 2 or 4 does not. A bivalue cell is a 1-cell ALS.
Duplicate row/box geometry yields one record. Genuine partial all-different units are allowed.

Current anchors at `6a9fbf6`: `core/js/engine/model.js::checkUnits` (`meta.partial`);
`generator/tests/node-runner.js::SOURCE_FILES`, with `tech-chain.js` immediately before
`tech-cage.js`. All eight loaders have that insertion point. Neither `tech-als.js` nor its
suite exists at this baseline; old source-order line numbers are not the contract.

## Files to create/modify

- New core tech-als.js and `core/tests/suites/tech-als.test.js`.
- All eight L source lists; place after tech-chain.js in the existing technique block. Both
  tests.html CORE_SUITE_FILES lists include tech-als.
  The eight are Generator index.html, tests.html, tests/node-runner.js and js/worker/gen.worker.js;
  Player index.html, help.html, tests.html and tests/node-runner.js.
- `.github/scripts/generator-quick.json`: add `tech-als` to `core-shared`, retain `tech-cage`,
  and maintain the owned measured metadata.
- Generator design 6.6/13.6, Player engine design, both developer guides.
- `docs/difficulty-v3/evidence/MS15a/`, project-relative task artifacts and `docs/difficulty-v3/notes.md`.
  No canonical regression/replay/help-example fixture, existing finder or weight edit.

## Implementation steps

1. Implement canonical complete records and a shared per-call work-guard interface.
2. Test cardinality, duplicate geometry, partial units, fixed cells and candidate mutation.
3. Add all eight source/suite entries without registering an ID.
4. Document the inactive API/cap-prefix semantics, format-check and freeze the final E source.
5. Complete inactive E/GH, both harnesses/quick sets and CI, then hand the full record to SA1.

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
| MS15a-T03 | Eight source lists/two suite lists, fresh complete inactive E, all-38 GH check, both quick sets and CI pass; no activation or canonical output change |

## Test plan

Generator `node tests\node-runner.js --suite=tech-als,techniques,ui-contract,purity,help`;
Player same selector except purity (Generator-only); then both quick sets.
Test max 4 boundary, 4096 prefix with lowered test-only limits for a small regression, repeated calls,
same object changed candidates, complete-vs-partial units and a parent cancellation sentinel.
The inactive E/GH closure below supersedes the former "No heavy gate" sentence. It adds no
GP, qualification, soak, deep/manual corpus, discovery or pattern-cost-tool assignment.

### Inactive E — fresh complete recording/check-only

**Inactive does not mean unchanged source identity.** Adding `tech-als.js` to the production
`SOURCE_FILES` changes all three required E identities: replay's
`replay-fixtures.js::nodeEnv.identity` hashes that list, and hashes use
`perf.js::engineFiles/hashIdentity`. The new module is included even without a registered ID.
MS14c's reuse-only route therefore does **not** close MS15a.

After format checks and the source freeze, use checklist section 7's existing E/IR12 recipe
to record, in order, **all five G09-G13 wires -> all fourteen G01-G14 analyses -> all 520
hashes**, into this task's own directories. Check fresh wires against the unchanged published
wire before beginning analyses. Keep all original requests/seeds, including hidden-level
diagnostic requests and G13's 120000 ms recorder guard. No alternate request or partial
family substitutes for the complete fixed manifest.

These are the merge-checks of the **newly recorded complete families**, from Generator:

```powershell
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS15a\wire --check
node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS15a\analysis --check
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS15a\hashes --check-hashes
```

Require current-source identities, exact **5/14/520** coverage and unchanged canonical
outputs. **No `--write`, `--update-hashes`, pin refresh, ledger retagging or fixture change.**
A changed output is an inactivity/correctness problem: raise `QUESTION:` and stop, rather
than treating it as the expected effect of ALS-XZ. Preserve failed/superseded records; any
later included-source edit requires replacement records for each affected complete family.

For admission, use the source-qualified MS14b E-2 item timings (MS14c changed no E input)
and a stated conservative bound for this candidate, not an assumed target or a timing from
another request. Announce the exact plan before running. Existing <=450 s compound admission,
<=540 s process-tree ceiling, shared locks and >=15 s gaps apply; no unbounded whole-corpus
command, new slow-cell evidence class or recorder-contract change is authorized.

### GH and final quick/CI closure

Catalogue **38** stays unchanged. From Player, check the existing approved sources only:

```powershell
node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check
```

Require all 38 IDs to match, including the region-aware Jigsaw example; no discovery, corpus
scan, catalogue write or replacement source. An unexpected failure requires a QUESTION pause,
not reuse of a predecessor's one-off acquisition permission.
Finish living docs/counts and format checks before both complete final quick sets. Retain all
predecessor tests, account for the new suite in `core-shared`, maintain measured projections,
and run the existing CI membership/budget check. Return the final inventories/fingerprints,
all E/GH outcomes and the source-qualified inactive/no-output-change evidence for SA1 review.

## Definition of done & handoff

MS15b/MS16 receive the exact ALS and shared-guard contracts, retained-record/prefix semantics,
limits and completed evidence. No new ALS solver ID is active yet. MS15b waits for SA1 review
and orchestrator acceptance/commit of MS15a; a green local kernel alone does not unlock it.

## Resume rules — S-OD4

Review: **SA1 analyst cross-review**, plus orchestrator verification, before acceptance.
Correctness/evidence corruption or changing a recorded decision
stops; time/availability is a named numerical item for MS18c/MS18d and work continues.
The QUESTION pause above applies immediately; no unanswered default is self-approved.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Own `tech-als`'s r6c CI group/manifest entry as well as all eight source/two HTML lists.
Pentomino's completion does not remove the shared-machine lock/admission/gap rules; another
task may hold the timing slot. Report apparently stale locks before cleanup, even when owned.
No new slow-cell evidence/tooling class. Return the inherited/new item list and inactive-enumerator proof.

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
