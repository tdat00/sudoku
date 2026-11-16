# MS13c — Activate grouped forcing chains

| Header | Value |
|---|---|
| Depends on | MS13b and the run-ahead MS14a accepted; GC-01 owner answer incorporated into this brief |
| Size / active time | Medium; 50-60 minutes plus E/GH/GP |
| Owner / milestone | Shared chains and both apps; M13 complete |
| Authority | R9/R10/R16/R20/R21; IR54; GC-01 pending |
| Status | Not started; dispatch held for GC-01 |

## Goal & business context

Use the prepared graph and consumers together, with independently checked group proofs and no
claim of exhaustive Medusa/AIC/X-cycle coverage.

## Scope and repository rules

In: forcingChain/Long graph activation, owned proof data, affected examples/ratings/cost evidence.
Out: new IDs, changing selected C/depths, grouping XY-chain's restricted graph or weight fitting.
AGENTS/checklist, no Git/pack/log edits, complete B/E as affected.

## Inputs & context

R16, verbatim:

> Use singleton starting nodes for published forced/contradiction deductions; groups may be internal
> nodes and endpoint groups. A true multi-cell group is not permission to place an arbitrary member.
> An endpoint elimination must conflict with every member of each endpoint group.
> Each emitted Finding owns copied node/cell/path data, not borrowed mutable graph scratch.

Use MS13a canonical nodes/edges and MS13b proofVersion 2:
`chains:[[{cells:[...],digit,truth},...],...]`; length is maximum path edge count; Finding.cells
is the full sorted union. Pure singleton paths may retain triples. Same IDs/weights/orders/windows.
Never decode a new node as cell*digits+digit. An incomplete grouped construction or minimum search
cannot publish a grouped result or the best proof seen so far. The grouped attempt starts with
4096 additional nodes and one 50000-work allowance shared by construction and search, without a
reset between stages. **How that attempt composes with the accepted unbounded `forcingChain`
is unresolved: GC-01 below is a dispatch prerequisite.** Neither a whole-ID cap nor a fallback is
authorized by this paragraph. The once-only R10 adjustment applies to the newly introduced limits,
not to resolving the policy conflict or tuning earlier XY/Nishio limits or selected C.

Independent checker validates every group member/edge/endpoint/target. Forced/contradiction starts
must be singleton; endpoint groups can eliminate only candidates conflicting with all members.
Regression vectors: one missed cross-peer; extra occurrence invalidating a strong group;
attempted arbitrary group placement; old singleton path retained after another call.
Current source anchors in `core/js/engine/tech-chain.js`: `pathData`, `findForcingChain`,
`findForcingChainLong`, `forcingWith`, `scanForcing`, `buildGraph`, `constructGraph` and
`SG.chainGraph.LIMITS`. Read the IR54 assertions in `core/tests/suites/tech-chain.test.js`,
including `keeps forcingChain unbounded where an accidental limit of 50000 would stop it`.

### SA2 ruling on MS13a review finding 2 — 2026-11-17

**Escalate the activation policy, not the numerical finding.** MS07b's IR54 ruling explicitly
retains `workLimit:null` for `forcingChain`; its regression uses odd rings of 2001 and 5 cells
and finds a three-link deduction after more than 50,000 units. The registered long ID already
has a work cap. This is a tested accepted contract, not an omitted default.

Applying the grouped construction-plus-search cap to the entire short ID would change that
decision, including when construction alone consumes the allowance. MS13a ruling 5's shared-cap
handoff does not authorize an implicit supersession of IR54. Conversely, falling back merely
because a grouped call returned null is not an adequate specification: null also represents
parent-budget exhaustion, a completed negative/window rejection and an incomplete minimum test.
R9 requires a proved minimum in the represented graph; a singleton minimum is not evidence that
the abandoned canonical grouped graph has no shorter proof.

The pack author therefore does **not** silently choose either behavior. GC-01 asks the owner to
choose the whole-ID policy and, if a fallback is approved, its explicit minimum-proof domain.
MS13a remains inactive and needs no engine amendment for this finding. MS13b may finish its
consumer-only work after MS13a acceptance. Do not dispatch MS13c, activate groups, change limits
or weaken the IR54 regression until the answer is recorded and this brief is amended.

### S-AV36 — grouped-graph construction cost and cap exposure

Origin: SA1's locked final-source MS13a review, relayed by the orchestrator on 2026-11-17 at
01:52 (+07:00), and the developer's corrected all-model census. Engine SHA-256:
`501481B415F1AD9B49D3BE355767C8922C5475FF2D93200A41DA1338705B9AEE`
(`docs/difficulty-v3/evidence/MS13a/engine-frozen.txt`, unchanged after E).
The corrected `docs/difficulty-v3/evidence/MS13a/census-all/table.md` and per-model JSONs retain
the populations; the earlier `work-census-final.json` is history, not a no-caps conclusion.

The following are **construction only**, before any grouped search, at the common 50,000 limit.
Ladder positions come from the propagated portion of
`H.randomStatesWithKnownSolution(m, rng(77003), 24)`: six seeded test-kit puzzles per model,
not a generated-puzzle qualification sample. Positions are where the ladder reaches the chain
group, not necessarily where a registered forcing ID would be selected. Diagnostic full-build
counts above the default cap are not the work actually spent by the capped default call.

| Model | Ladder positions over 50,000 / sampled | Full-build median | Full-build maximum |
|---|---:|---:|---:|
| Samurai | 38 / 48 | 85,352 | 138,529 |
| Sohei | 43 / 51 | 109,951 | 124,066 |
| Flower | 17 / 44 | 44,057 | 70,583 |
| mega16 | 20 / 321 | 23,349 | 57,089 |
| classic9 | 0 / 5 | 4,942 | 6,117 |
| mega12 | 0 / 32 | 6,971 | 13,644 |
| Butterfly | 0 / 15 | 26,658 | 31,008 |

Constructed blank maxima, kept separate: Samurai **1,715,391**, mega16 **1,209,344**,
Sohei **1,047,384**, Flower **459,297**, mega12 **321,048**, Butterfly **268,704**,
9x9 **84,807** (jigsaw9 **78,822**), classic6 **13,590**, classic4 **2,144**.
The largest blank has 2,214 additional groups, below 4,096; these are work-cap observations,
not evidence that the node quota must rise. SA1's real generated-wire observations are much
smaller: Samurai Nightmare G13 **6,764 and 1,708**, Killer G10 **660**. Do not pool these
with synthetic/blank populations; the census's Killer/Greater-Than test-kit models are
uncaged/uninequalitied, unlike a structured generated wire.

These counts demonstrate incomplete construction at many sampled large-board positions,
**not** a count of lost deductions, a future active-finder cap rate, or a GQ/GP verdict.
The inactive builder has removed no live deduction. MS13c owns the active cost/cap record;
MS18d carries the final cost disposition and MS18e audits it. Any measured generation/
availability consequence also goes to MS18c under the existing complete qualification.

**Use these data in the once-only adjustment decision; do not select a new number now.**
Construction counts alone cannot determine a construction-plus-search budget or a latency
trade-off. After GC-01, within this task's existing cost scope:

- Keep 50,000/4,096 as the starting configuration and the full source-qualified baseline.
  Reuse the labelled census inputs, and measure actual forcing/long call positions and the
  existing real-wire/fixture cases on activation source. Keep model, seed, preprocessing,
  position IDs, denominators, parent-budget failures and every cap visible.
- Account for setup time, construction work, search work, node counts and whole-call latency;
  under option A also report fallback count/work/latency and total cost, not just the bounded
  grouped attempt. Distinguish graph completion, minimum completion, no deduction and cap.
- R10 permits at most one evidenced adjustment of these new limits, common to every board,
  before final E. Record before/after cap rates and latency, the chosen value or explicit
  decision to retain the defaults, and its rationale in the task record and v3 notes.
  No board-dependent limit, automatic rise to a blank maximum, changed work unit, extra
  per-stage allowance, another task's limit change or repeated retuning is authorized.
- Preserve the existing locked <=450-second admission / 540-second process ceiling.
  Keep unsafe or incomplete populations as named items; no new tooling/evidence class,
  qualification waiver or automatic broader campaign follows from this item.

### GC-01 — owner question: retain legacy work coverage or bound the whole short ID?

**Decision requested from the owner before MS13c dispatch. No answer is assumed.**

IR54 deliberately leaves `forcingChain` unbounded in local work, subject to its length window
and parent budget/cancellation. The proposed grouped attempt is bounded at 50,000 construction
plus search units. S-AV36 shows that construction alone exhausts that starting allowance at
38/48 Samurai and 43/51 Sohei sampled chain-group positions; the current short ID demonstrably
can find deductions beyond 50,000. A cap on the whole ID can therefore remove existing
deductions. A fallback preserves a legacy route but needs an explicit proof-domain policy.
Please choose **A or B**, or specify an alternative with both rules resolved.

**A — preserve the unbounded legacy route; authorize a bounded grouped enhancement with an
explicit complete-singleton fallback for `forcingChain` only (SA2's recommendation).**

- Try the canonical grouped graph and minimum search under their one shared new allowance.
  A completed grouped result follows R9's windows and complete-graph minimum as usual.
- Only a **local work/node cap** in that attempt permits the short ID to discard all grouped
  scratch and run the accepted complete singleton search, with the same caller-clamped
  short window and `workLimit:null`. Check and retain the same parent budget; no reset.
  A spent parent budget, cancellation or another error never triggers recovery. Neither
  a completed negative nor a below-window result is a reason to run another search.
- The fallback Finding certifies the minimum in the **complete singleton graph**, not in the
  discarded grouped graph. This explicitly changes the planned all-or-null grouped policy
  and defines which represented graph R9's minimum refers to. Never emit a partial grouped
  proof or claim that no shorter grouped proof exists. Legacy triples remain truthful.
- `forcingChainLong` keeps the bounded grouped attempt with no fallback or second allowance;
  an incomplete graph/minimum gives null. An ID called alone still cannot relabel a short
  represented proof as long. No other finder inherits a fallback.
- The whole short call is **not** capped at 50,000: grouped work plus legacy work/time must
  both be recorded. Added work still spends the parent budget, so this is not a promise of
  unchanged puzzles, latency, or wall-budget-limited availability.

**B — supersede IR54 for `forcingChain` and bound both whole forcing IDs.**

- Both IDs use only the complete canonical grouped graph and one shared finite
  construction-plus-search allowance, initially 50,000; no fallback or reset.
  Incomplete construction/minimum search returns null even when the legacy singleton
  finder would have found a deduction. Accept that deliberate loss of legacy coverage.
- Amend the short-ID policy/tests/docs explicitly under the owner's answer, preserving the
  earlier IR54 evidence as history. This does not bound `nishio`, alter XY/deep limits or
  select another C. A larger finite new allowance would still be a cap on the old short ID;
  the once-only numerical adjustment cannot substitute for this policy decision.

**Common to both choices:** full S3 scope, IDs/weights/orders/windows, parent-budget/cancellation,
independent proof checking, B/E/GH, quick/CI, the once-only R10 rule and final qualification (c1)
stay. The graph minimum must complete before a grouped Finding is published. MS13c must explain
rating/wire/hash changes, measure costs/caps on its final source and carry S-AV36 to MS18d/MS18e.
No new offer, guard increase, fabricated example, deferred technique or weakened correctness
assertion is approved. A is recommended to preserve the accepted legacy route, **not** because
its cost or availability is already measured; its fallback/minimum-domain exception needs the
owner's explicit approval just as B's replacement of IR54 does.

**Owner answer requested:** choose A, B or an exact alternative; confirm the whole-ID work policy
and the minimum-proof domain. The pack author records the answer and amends this brief before
dispatch. Until then MS13a's inactive closure and MS13b's consumer work may finish, but MS13c
and later serial tasks are not dispatched. No new S-OD number is assigned before an answer.

### Dispatch-only scheduling exception — SA2, 2026-11-17

The posted GC-01 question above is retained unchanged. Its blanket hold on later preparation
is superseded **only for inactive MS14a**: after accepted MS13b (`55d11ee`), run MS14a to its
own accepted/committed boundary, then MS13c once GC-01 is answered and the pack amended,
then MS14b and MS14c. One task/writer at a time. An owner answer arriving during MS14a does
not preempt that task or permit a second writer. If the answer is still absent after MS14a,
wait; no other run-ahead is authorized.

This changes preparatory scheduling, not either GC-01 option, the active technique order,
milestone completion order, limits, qualification, review rules or full S3 scope. MS14a
depends on the existing model/bit/unit APIs and remains unregistered; it needs no grouped
chain result. MS14b registration still requires this task's acceptance. No owner decision
is needed for this isolated scheduling exception; GC-01's policy decision still needs one.

Start MS13c from the **accepted MS14a source**, retaining its inactive kernel, tests, fixture
helper and current documentation/CI metadata. Capture that actual baseline's source identities
and quick inventories; MS13b's 4,416 Generator / 2,658 Player totals remain historical, not
the expected post-MS14a totals. Do not copy a pre-MS14a guide, manifest or whole source file
over the accepted additions.

MS14a owns complete current-source inactive E (five wires, fourteen analyses, 520 hashes,
all check-only) before acceptance. Its canonical values must match the preceding boundary.
MS13c's already-required full activation E then includes the accepted MS14a source; it does
not absorb an unfinished MS14a gate or retag its ledgers. Compare against the unchanged
canonical baseline, explain the activation's changes and record all families on final source.
No extra activation E family or rerun of an accepted task is added merely by reordering;
MS14a's tests remain in the subsequent complete quick sets. MS14b's full E remains its own.

## Files to create/modify

- Chain engine/suite and proof fixture helper; B's current chain fixtures/references, help/locales
  and real examples; E.
- Both designs' chain/proof/limitations sections and both language guides; v3 notes.

## Implementation steps

0. Require the recorded GC-01 answer and amended dispatchable brief; implement neither proposal
   merely because it appears in the question above.
1. Connect the canonical graph to forcing/Long only, replacing every arithmetic node assumption.
2. Emit owned mixed proofs and validate them independently; keep registered windows enforced.
3. Refresh current reference/example data and document bounded, not exhaustive, coverage.
4. Record S-AV36 construction/search counts, cap and approved-fallback outcomes, real GH and
   affected GP cells; decide any permitted adjustment before final E/quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13c-B01 | Every grouped deduction is sound and truthfully displayed |
| MS13c-B02 | Coverage is bounded and not advertised as all Medusa/AIC |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13c-T01 | All-member edges/targets, singleton placement starts and shortest windows hold |
| MS13c-T02 | Buffer bounds, the approved GC-01 cap/fallback policy, stage accounting, cancellation and retained proof ownership pass |
| MS13c-T03 | B/E/GH, S-AV36 cost/limit decision and GP records and both quick sets complete |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Once GC-01 is answered, add focused regressions
for construction exhaustion, search exhaustion after a candidate but before its minimum is proved,
the exact shared-limit boundary/no reset, parent exhaustion versus local cap, and the approved
disposition of the existing >50,000-work singleton deduction. Preserve a complete grouped proof
shorter than its singleton counterpart, long called alone, narrowed/disabled caller windows and
retained Finding ownership. Do not silently drop IR54's old contract test; preserve its legacy
seam coverage and explicitly update only the registered policy authorized by the owner.
Under A test both cap-triggered fallback paths and no fallback for budget/cancellation/error or
a completed negative; account for both stages, and never label the fallback a grouped minimum.
Round-trip a real grouped version-2 Finding through step events, replay and wire serialization/deserialization, asserting unchanged `i18nArgs.proofVersion`, nested node/path data, proof cells, placements and eliminations; the error-only depth-4 `toPlain` truncation must not affect this successful path.
Complete E MS13c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS13c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS13c\analysis\G01.json
node tests\pattern-cost.js --ids=forcingChain,forcingChainLong --runs=20 --json=..\docs\difficulty-v3\evidence\MS13c\pattern-cost.json
node tests\perf.js --variant=classic9 --level=nightmare --runs=50 --warmup=0 --seed=7000 --gate
node tests\perf.js --variant=mega16 --level=easy --runs=50 --warmup=0 --seed=7000 --gate
```

Player GH:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong --sources=tests\artifacts\difficulty-v3\MS13c\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong --sources=tests\artifacts\difficulty-v3\MS13c\sources.json --max-puzzles=16 --max-hints=400 --check
```

Curated chain sources first, then bounded classic9 master/nightmare/hell1 under B.
Jobs 1/no --jobs. E 10-90 minutes, cost 1-60 seconds, GP 30-540 seconds/cell, curated GH 1-120 seconds.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Record GP misses, never relax targets; 540-second process ceiling.

## Definition of done & handoff

Return the recorded GC-01 choice, proof/limit records, S-AV36 disposition and complete inherited/
new item list, real grouped example, reference changes and cost misses. No hidden group activation
or unapproved fallback remains for later tasks; MS18d owns the final cost disposition, MS18e its
audit, and MS18c any measured availability consequence.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness/evidence corruption or changing a recorded
decision; performance/availability is a named numerical item for MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s; project GP before launch
and retain an unsafe/unmeasured cell as an item, not an automatic new tooling task or dropped case.
Both quick sets use the current bounded manifest; any added suite owns its r6c CI group.
Return the inherited/new item list, complete applicable B/E and truthful cost verdicts.

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
