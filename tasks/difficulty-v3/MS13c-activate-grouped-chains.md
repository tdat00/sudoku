# MS13c — Activate grouped forcing chains

| Header | Value |
|---|---|
| Depends on | MS13b and the run-ahead MS14a accepted and committed; S-OD11 applies |
| Size / active time | Medium; 50-60 minutes plus E/GH/GP |
| Owner / milestone | Shared chains and both apps; M13 complete |
| Authority | R9/R10/R16/R20/R21; IR54; GC-01 option A / S-OD11 |
| Status | Not started; awaits MS14a acceptance/commit |

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
is decided by S-OD11: option A below is binding.** Only the short ID falls back after a local
grouped-attempt cap, under the same parent budget/window; its legacy search has no local work cap.
The once-only R10 adjustment applies to the newly introduced grouped limits, not to the fallback's
unbounded work policy, earlier XY/Nishio limits or selected C.

Independent checker validates every group member/edge/endpoint/target. Forced/contradiction starts
must be singleton; endpoint groups can eliminate only candidates conflicting with all members.
Regression vectors: one missed cross-peer; extra occurrence invalidating a strong group;
attempted arbitrary group placement; old singleton path retained after another call.
Current source anchors in `core/js/engine/tech-chain.js`: `pathData`, `findForcingChain`,
`findForcingChainLong`, `forcingWith`, `scanForcing`, `buildGraph`, `constructGraph` and
`SG.chainGraph.LIMITS`. Read the IR54 assertions in `core/tests/suites/tech-chain.test.js`,
including `keeps forcingChain unbounded where an accidental limit of 50000 would stop it`.

### S-OD11 — binding GC-01 option A

**Owner, Discord, 2026-11-17 04:30 (+07:00): "GC-01: chọn A."** The original question and
adjacent confirmation are in `docs/difficulty-v3/clarifications-resolved.md`, GC-01 / S-OD11.
The policy hold is lifted. Option B is not approved, and MS14a must still finish first.

The earlier escalation protected MS07b's IR54 contract: `forcingChain` explicitly retains
unbounded local work, subject to its window and parent budget/cancellation. Its odd-rings
regression (2001 and 5 cells) finds a three-link deduction beyond 50,000 units. S-OD11 preserves
that legacy route rather than imposing the grouped allowance on the whole short call.

1. **Grouped attempt first for both forcing IDs.** Resolve the same R9/caller-clamped
   windows; an empty/disabled window stays empty. Try the canonical grouped graph and
   minimum search, initially with 4,096 additional nodes and **one shared 50,000-work
   allowance**. Construction spends from it; search receives only what remains. No reset,
   singleton-first shortcut, board-specific bypass or partial grouped result.
   Publish a grouped-route Finding only with a complete graph and a proved minimum in its
   window. A completed negative or below-window rejection returns null without another search.
2. **Short-only fallback on an explicit local cap.** On a local grouped construction/search
   work cap or additional-node cap, `forcingChain` must, if the parent-budget check passes,
   discard the grouped scratch and run the accepted **complete singleton search**, with the same
   resolved short window and **`workLimit:null`** (the legacy private unbounded spec when
   calling that kernel directly). Do not accidentally inherit the seam's 50,000 default.
   Distinguish the termination reason; `Finding === null`, empty graph arrays, or work
   merely equalling a limit is not by itself authorization to retry.
3. **One parent budget, no recovery from its exhaustion.** Check the caller's budget before
   entering fallback and retain that same budget/deadline and cancellation throughout.
   Do not refund grouped work/time, create a fresh parent budget, expand the window, or
   turn parent-budget exhaustion into a local-cap retry. A spent parent budget gives no
   Finding under the existing contract; cancellation and non-budget errors propagate.
   Neither a completed negative nor a window rejection triggers fallback. The singleton
   route's own budget/error handling cannot trigger a second fallback or restart.
4. **Long stays bounded.** `forcingChainLong` has only the grouped attempt. Incomplete
   construction or minimum search returns null; no singleton fallback, extra allowance or
   relabelling of a short proof, including when the long ID is invoked alone.
5. **The minimum belongs to the graph actually searched to completion.** A grouped-route
   Finding certifies the minimum in the complete canonical grouped graph. A fallback
   Finding certifies it only in the complete singleton graph; it does not certify that the
   abandoned grouped graph has no shorter proof. Discard any best-so-far grouped candidate
   on truncation. Preserve deterministic tie/window behavior and copied proof ownership;
   never place an arbitrary member of a true group. Legacy triples remain permitted.
   Record the selected domain from control flow, not from whether the winning path happens
   to contain a group: a singleton-only path can also win a complete grouped search.
6. **Whole-call cost and evidence stay honest.** Record construction and grouped-search
   work, graph/minimum completion, local cap kind, fallback entry/result/work/latency,
   parent-budget outcomes, selected proof domain and total call work/latency. Keep phase
   caps distinct from the final call's outcome: a successful fallback is not a completed
   grouped minimum or a whole-call denial. The short call is **not** capped at 50,000;
   do not hide the first phase's cost or present only the successful fallback's work.
   Use the existing cost/evidence machinery; no new tooling/evidence class is authorized.
7. **No additional policy freedom.** IR54, IDs/weights/orders, selected C, caller windows,
   parent budgets and the other finders' limits remain. R10 permits one measured adjustment
   of the new grouped limits only; keep it separate from constants shared with XY/Nishio.
   This is an internal proof-search fallback, not the Generator's non-exact puzzle fallback:
   it does not itself change exactness, warnings, floors or qualification. Added grouped
   work still spends the parent budget, so unchanged puzzles, latency and wall-budget-limited
   availability are not promised. S-AV36 stays open for measurements and final audit.

Required closure remains independent proof checking, B/E/GH, both quick sets, CI and analyst
cross-review. Explain reference/wire/hash changes on final source, record both phases' costs
and apply final qualification normally. Any proposed widening of these fallback conditions
or a fallback for another finder would change S-OD11 and needs another owner decision.

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
trade-off. Under S-OD11, within this task's existing cost scope:

- Keep 50,000/4,096 as the starting configuration and the full source-qualified baseline.
  Reuse the labelled census inputs, and measure actual forcing/long call positions and the
  existing real-wire/fixture cases on activation source. Keep model, seed, preprocessing,
  position IDs, denominators, parent-budget failures and every cap visible.
- Account for setup time, construction work, search work, node counts and whole-call latency;
  also report fallback count/work/latency and total cost, not just the bounded
  grouped attempt. Distinguish graph completion, minimum completion, no deduction and cap.
- R10 permits at most one evidenced adjustment of these new limits, common to every board,
  before final E. Record before/after cap rates and latency, the chosen value or explicit
  decision to retain the defaults, and its rationale in the task record and v3 notes.
  No board-dependent limit, automatic rise to a blank maximum, changed work unit, extra
  per-stage allowance, another task's limit change or repeated retuning is authorized.
- Preserve the existing locked <=450-second admission / 540-second process ceiling.
  Keep unsafe or incomplete populations as named items; no new tooling/evidence class,
  qualification waiver or automatic broader campaign follows from this item.

### Serial scheduling retained after S-OD11 — 2026-11-17

The posted GC-01 question is archived unchanged with its answer. The scheduling exception
remains: after accepted MS13b (`55d11ee`), finish the already-running inactive MS14a to its
own accepted/committed boundary, then **MS13c -> MS14b -> MS14c**. S-OD11 lifts the policy
hold, not MS14a's prerequisite. One task/writer at a time; no preemption, dirty-task parking,
second writer or further run-ahead. MS14a's scope and running brief remain unchanged.

This preserves the active technique order, milestone completion order, limits, qualification,
review rules and full S3 scope. MS14a depends on the existing model/bit/unit APIs and remains
unregistered; it needs no grouped
chain result. MS14b registration still requires this task's acceptance. No new approval is
needed for this retained scheduling; the separate policy decision is now S-OD11.

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

0. Require accepted/committed MS14a and capture its actual source/inventory baseline.
   Implement S-OD11 option A only; the archived alternative is not an implementation choice.
1. Connect the canonical graph to forcing/Long only, replacing every arithmetic node assumption.
2. Emit owned mixed proofs and validate them independently; keep registered windows enforced.
3. Refresh current reference/example data and living EN/VI guides/designs. Replace pending-GC-01
   wording with S-OD11, distinguish the bounded grouped attempt from the uncapped short fallback,
   and document the proof domains and non-exhaustive coverage without changing other policies.
4. Record S-AV36 construction/search counts, cap and approved-fallback outcomes, real GH and
   affected GP cells; decide any permitted adjustment before final E/quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13c-B01 | Every grouped deduction is sound and truthfully displayed |
| MS13c-B02 | Bounded grouped coverage and the unbounded-local-work short fallback are described truthfully, not as all Medusa/AIC |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13c-T01 | All-member edges/targets, singleton placement starts and shortest windows hold |
| MS13c-T02 | Buffer bounds, S-OD11's exact cap/fallback policy and proof domains, stage accounting, cancellation and retained proof ownership pass |
| MS13c-T03 | B/E/GH, S-AV36 cost/limit decision and GP records and both quick sets complete |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor`;
Player `--suite=play,i18n,help`; both quick sets. Add focused regressions for construction work/
node exhaustion, search exhaustion after a candidate but before its minimum is proved, the exact
shared-limit boundary/no reset, and parent exhaustion versus local cap. Retain the existing
singleton deduction that uses more than 50,000 work units: with ample parent budget, the short fallback
must match the accepted uncapped singleton seam's deduction, proof paths and minimum length on
the same state and window; verify the full sorted cell union separately. Do not impose the
grouped cap on that route or count only its work. Preserve a complete grouped proof
shorter than its singleton counterpart, long called alone, narrowed/disabled caller windows and
retained Finding ownership. Keep IR54's legacy policy/seam coverage. Test all local-cap fallback
paths, no fallback after parent-budget exhaustion/cancellation/error/completed negative/window
rejection, and no long-ID fallback. Account for both stages; never label a fallback a grouped
minimum or infer the domain from a singleton-only winning path.
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

Return the implemented S-OD11 policy, proof-domain/limit records, S-AV36 disposition and complete inherited/
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
