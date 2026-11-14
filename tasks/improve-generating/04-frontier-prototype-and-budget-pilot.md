# IG-S04 - Frontier variants, S2 exit and budget pilot

| Header | Value |
|---|---|
| Depends on | IG-S03 accepted |
| Developer | claude-sonnet-5.5 |
| Size /active time | Large;2-4 h |
| Machine allocation | 12 min maximum; staged admission after the first two large-board probes |
| Owner /milestone | Test-side SM2 implementation |
| Authority | IG-S-Q05/Q06/Q08/Q09/Q10/Q11 |
| Status | Not started |

## Goal and scope

Implement the six fixed frontier variants in the check-list and measure enough counts to freeze a
first-round sample budget. This is a feasibility prototype, not a production generator design.
In: H `frontier.cjs`, `sample-budget.cjs`, private S2/native-objective hooks, tests and pilot evidence.
Out: production, S4 early-score exit, a new sign/cage strategy, new weights/tiers, bank decisions and
selection of a winner. Killer/Greater-Than/Jigsaw cannot enter this cell-frontier route.

Use the **reference** solver, not the scoped S3 prototype, so S1/S2 are not credited twice for S3.
No git or ordinary test runner. Read the check-list and Q08-Q10 answers first; ask Astra about a missing
contract instead of choosing a different algorithm or budget.

## Fixed algorithm

1. A grid trial builds the native model/full solution with the request seed's `model` and `grid#1`
   forks. Samples use the native `dig#1.t` root and named child forks. Record all fork labels.
2. Obtain actual `spec`, floor/tier and the cheap/middle/full ordered sets from the check-list.
   Never hard-code weights or call a cheap/middle failure the requested level's requiredness proof.
   An empty actual tier is recorded as vacuous/unsupported-frontier, not searched as a real frontier.
3. Use native symmetry groups, dig order and clue/per-unit floors. For the full ladder, revisit remaining
   groups once per distinct rung; for cheap/middle, run only that selected set. PhaseA always uses
   `assumeUniqueness:false`.
4. For each removable group, test the weakened parent. A complete permitted proof accepts the removal.
   With S2, an explicit `rederived` outcome accepts it when every removed cell has its original solution
   value again through sound deductions. Do not forge `report.solved=true` or a canonical rating.
5. S2 initially reuses no derived parent candidate eliminations: initialise from the weakened givens.
   This is the minimal early-exit prototype, not a claim that the planned initial-state cache is implemented.
   Mark the performance scope accordingly. Record deduction ordinal to re-derivation and full-solve ordinal
   in the fixed post-timing audit.
6. When the floor genuinely stops, run bounded native DFS uniqueness. Two proved solutions permit permanent
   rejection; unknown/capped counts do not. Other errors/contradictions are not “floor stuck”.
   Store each frontier group's discovery ordinal, parent snapshot/hash, floor/open-cell information and proof.
   Deduplicate by symmetry-group key. For a ladder keep the last rung's eligible failure for phaseB;
   earlier-rung records remain diagnostics only. Remove entries whose group was later removed/proved
   ambiguous, and recheck clue/unit-floor feasibility at the chosen parent. Do not spend K_F on three
   copies of one group's failures at different rungs.
7. PhaseB orders entries by `(recorded floor unsolved cells, discovery ordinal)`; no unrecorded search for
   a better ordering. Try at most K_F=12. F1/FC/FM/FU/F0 use the final parent; FS its immutable snapshot.
   Reprove uniqueness of the chosen reference candidate before a uniqueness-assuming solve.
8. FU, after that proof, runs the **actual full canonical floor** with uniqueness enabled. A solved
   floor is recorded as a filtered shallow frontier; a genuine stuck floor proceeds. PhaseA remains false.
   Other variants do not perform this extra filter.
9. Run the allowed-set solve and then the untouched canonical rating for candidates considered for return.
   Final exactness is native `requiredOf` plus complete in-band rating plus known uniqueness. Retain the
   best complete candidate with the native quality/tie rule; an oracle's tier flag is not a certificate.
   When embedded in native generation, canonical calls go through `rateCounted` and charge the passed
   attempt/sample caps as well as the prototype vector. A direct uncharged `difficulty.rate` is not allowed
   in generation; the independent verifier's later calls are separate and do not steer it.
10. Below-band complete candidates may deepen using at most16 proposals across the whole sample:
    use the native feasible-group/clue-floor checks and native bounded-removal objective, seeded order,
    and the current native objective comparator/target when available. Rate the committed best admissible
    proposal canonically before offering it. Stop at the count budget; never invent a numeric score for a
    future typed-objective result. Expose/reuse the runtime helpers in the private copy.
11. Keep an initial fully given, canonically rated solution as an explicit valid fallback, charged to the
    sample. This avoids publishing an unfinished state at budget exhaustion. `outcome=sample-budget`
    remains visible even if a fallback exists; it is not an exact hit or a completed frontier search.
12. Every trial leaves the model/givens/guards restored. A budget stops the sample with a distinct harness
    reason; no production error is swallowed as “budget”. Independent final verification runs outside timing.

## Deterministic budgets: pilot then frozen first-round limits

Use a count vector, not a time-dependent success rule. Record deductions, logical checks, actual DFS
entries, DFS checks, ladder passes, phaseB solves, deepen proposals and canonical verification solves.
Expose actual DFS entries separately: `budget.check()` calls include propagation and are not DFS nodes.

Pilot ceilings are **diagnostic safety envelopes**, not fitted production values:

- floor tests <=3G; ladder passes <=3; phaseB solves <=12; deepen proposals <=16;
- canonical ratings/verification solves <=64 per sample;
- floor deductions <=3G*N*(D+1), the monotone state-progress envelope;
- logical checks <= native `CAP_RATINGS * OBJECTIVE_STEPS`;
- DFS entries/checks <= `(3G+12+16+64)*UNIQUE_NODES`, retaining native per-count/check guards too.

Read the constants from the current source; do not substitute check calls for entries. The45 s host guard
still records censoring if these loose envelopes do not finish. An incomplete canonical solve is never
accepted. Reserved initial/final validation work must be represented in the budget, not performed secretly
after it is exhausted.

For each cell, fit the deduction/logical-check/DFS-entry/DFS-check limits from all completed pilot variants:
`min(pilot ceiling, next power of two >= 2*largest observed count)`.
Keep structural limits above fixed. If a dimension was never observed, retain its pilot ceiling and mark
it `unfitted`. A45 s-censored pilot or incomplete planned variant coverage makes that cell **unfitted**:
retain the pilot ceilings, not a survivor-only fit. Ask Astra to accept that explicit status before the
screen. Never fit a zero budget, discard slow pilots or retune limits after seeing IG-S05.

Write `budgets.json` with the exact input record ids, formula, limits, fitted/unfitted flags and hash.
Every arm of a cell's frontier screen uses that same budget vector.

## Exact population and commands

Cells: classic9, mega12, mega16, samurai; Nightmare. Literal pilot grid seeds11,12, attempt1.
The maximum planned population is one sample per mode, sample ordinal1, on each grid:
`proposal-only`, `ordinary-only`, F0, F1, FC, FM, FU, FS.
That is64 maximum trials, not a promise that all fit12 min. Keep these seeds disjoint from screening
and held-out requests. Execute in the following fixed priority:

1. mega16/11 and samurai/11: the two native controls and F1, one grid per logical block.
2. Stop and emit `pilot-reprojection.json` before any other real trial. Report stage counts/time, censored
   work and projected cost of the remaining64-key population and IG-S05's primary tier. The author/
   orchestrator reviews it; the developer may not enlarge budgets or silently shorten the algorithm.
3. If admitted, classic9 and mega12, seeds11,12, all modes; then the remaining mega16/samurai native/F1
   keys; then their FC/FM, FU/FS and F0 keys, in that order. Rotate arms within a priority block by grid index.
4. Pack consecutive complete trial jobs within270 s and the remaining task allocation. Unreached keys
   stay explicitly unstarted/inconclusive; they are not zero-cost trials or censored observations.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S04 -Round provisional-r1
```

**Projection, not measurement:** a frontier sample costs
`sum(floor tests by rung) + refused-test DFS + phaseB (<=12) + deepen (<=16) + canonical work (<=64)`.
Mega16 can test roughly128 symmetry groups at each of three rungs: up to384 floor solves before the later
work. Its native ordinary/proposal samples (about7.6/0.46 s) do not predict that cost. Use15-45 s/sample
as a risk scenario, not an evidence-based likely estimate; samurai is also unmeasured.
The first two F1 trials plus controls/grace are projected at roughly3-4 min. Re-project the rest from them.
At45 s/sample, twelve frontier trials on mega16 alone can consume9 min, before samurai, audits or grace.
The12 min allocation therefore bounds a staged/possibly partial pilot, not the former4-min work forecast.
Reserve post-timing audit/cleanup cost in admission; no seed substitution, hidden retry or larger guard.

Frozen rerun, same pilot seeds and dynamically re-derived catalogue/budgets:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S04 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | All Q08-Q10 variants have an explicit identity; nothing is silently adopted |
| B02 | Cheap failures, expensive refused floors and extra DFS are all visible in cost |
| B03 | Current hits/rates remain provisional and do not decide S1 or bank offering |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | PhaseA never assumes uniqueness; FU enables it only after proof on that exact reference |
| T02 | S2 re-derivation is a separate outcome, not a fabricated complete canonical report |
| T03 | Final/snapshot reference hashes, immutable snapshots and fresh uniqueness checks are correct |
| T04 | Every budget dimension is charged, exhaustion is explicit and source state is restored |
| T05 | Budgets follow the fixed fitting rule; any censored/incomplete cell remains explicitly unfitted |

## Test plan and records

Synthetic/native-state cases: multi-cell re-derivation; an already-derived cell; wrong value; no re-derivation;
uniqueness-assuming finder excluded; floor-budget versus true stuck; unique versus two solutions versus
unknown; stale snapshot; empty tier; coarse symmetry/floor constraints; exact/shallow/off-band keeper ties;
typed/numeric objective adapter; budget stopping in each phase.

Post-timing on each pilot trial, audit its first, middle and last accepted S2 removal (deduplicated) and
the final phaseA parent with a full reference floor solve. Record audited/accepted counts and any operational
solvability disagreement. Such a disagreement is guidance waste, not automatically an invalid puzzle;
an unsound deduction/false uniqueness/exact flag is a correctness stop.

Common records plus `variant-manifest.json`, `pilot-reprojection.json`, `budgets.json`, `s2-audit.json`,
`summary.json/md`.
Report F0/F1 as the isolated S2 comparison, FC/FM/F1 as floor choices, FU/F1 as uniqueness filter,
FS/F1 as reference-parent choice. Do not multiply these correlated gains as independent factors.

## Definition of done and handoff

IG-S05 receives reviewed variant semantics and the frozen budget hash. No implementation choice remains
for the measurement developer. A poor/zero-hit pilot is evidence, not permission to redesign the frontier.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start /end | |
| Developer /model | |
| Files /source identities | |
| Verification /evidence | |
| Machine charged /priority wait | |
| Findings /author answers | |
| Orchestrator review /acceptance | |
| Handoff | |
