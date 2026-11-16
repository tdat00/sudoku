# MS13a — Canonical grouped graph, inactive

| Header | Value |
|---|---|
| Depends on | MS12 accepted |
| Size / active time | Medium; 50-60 minutes plus current-source E recording/checks |
| Owner / milestone | Shared chain engine/tests; M13a |
| Authority | R10/R16; IR72 source-identity closure (SA2 ruling below) |
| Status | Not started |

## Goal & business context

Replace the assumption that every graph node is one candidate with a proved group-node model.
Do not expose grouped Findings before both proof consumers can read them.

## Scope and repository rules

In: inactive graph builder and independent proof checker/tests. Out: changing registered finders,
ratings, UI or examples. AGENTS/checklist; no Git/pack/log edits; classic core code and CRLF.

## Inputs & context

R16, verbatim:

```text
Node = { cells:sorted unique nonempty cell[], digit }
truth(Node) = at least one listed occurrence is true
```

> Same-digit weak edges require disjoint groups and conflict between **every** cross-pair.
> Same-digit strong edges require disjoint nodes exhausting all current occurrences in a complete unit.
> Retain different-digit singleton weak links inside one cell and bivalue-cell strong links.
> Never create an implication from one convenient peer pair or overlapping groups.

Add internal `SG.chainGraph.build(model,state,ctx)` returning
`{nodes,weak:number[][],strong:number[][],complete,work,capHit}` for tests/later activation.
Singletons: active candidates in ascending cell/digit order. Additional groups: current nonempty
box-line intersections, canonical key digit+sorted cells, deduplicated and sorted lexicographically.
No stale candidate cache. Weak/strong adjacency is deterministic and deduplicated.
Group limit 4096 additional nodes; work limit 50000 tested combination/edge extensions. On incomplete
construction return complete=false; later search must not use it as a complete graph.
Entry/every 256 budget checks; allocate for actual nodes/edges, not old cell*digits products.

Independent test checker must recompute candidate membership, every cross-peer and complete-unit
coverage from model/state, not trust builder adjacency. For paths verify polarity, each edge,
endpoint consequences and every target; group truth is not a placement in an arbitrary member.
Define its fixture/test helper in `core/tests/fixtures/chain-proofs.js`, shared by chain tests.

Vectors: same-digit A={0,1}, B={9,10} is weak only if all four cross-pairs conflict; one missing
pair or A/B overlap invalidates it. A={0,1}, B={2} is strong only if a complete unit's remaining
digit occurrences are exactly {0,1,2}; add occurrence 3 => no strong link.
These predicate vectors are synthetic unit tests, never production help examples.
Baseline `core/js/engine/tech-chain.js:78-112` (`function scratchFor`) and `:348-385`
(`function pathData`); `core/tests/suites/tech-chain.test.js:124-185` (proof checker).

### SA2 rulings before final gates — 2026-11-16

These resolve the builder/checker execution details. The graph remains inactive and no
registered output, prior, finder window or canonical generated expectation may change.

1. **Group family: choose (b).** For canonical group generation, a box-like unit is a complete
   unit of kind **`box` or `region`**, intersected with a complete `row` or `col` unit.
   Keep only sets of at least two open occurrences of the digit; singleton occurrences are
   already nodes, and duplicate digit/cell-set groups collapse. This follows the explicit
   box/region interpretation used for MS08b; `tech-basic`'s broader convenience category does
   not expand R16's canonical box-line group family.
   Other complete units (including Hyper windows/diagonals) still participate in strong-edge
   coverage, and all actual peers still participate in weak edges. They do not themselves
   generate extra canonical groups. Update the independent node oracle, tests and docs too;
   preserve a window/diagonal strong-edge test and a negative for a window-only group.
2. **Work accounting: change the third unit to every tested same-digit node pair.** Charge
   before the first-cell-peer prefilter, disjointness and edge checks. The first-cell prefilter
   is sound (all-cross weak links imply it; a strong pair lies in one complete unit), but its
   quadratic pair scan is not uncharged linear setup. Keep the other two units: a generated
   group candidate before deduplication, and a pair of candidates in one open cell.
   Keep 50,000; do not raise it to preserve the blank-board result. On blank classic9 the
   complete work becomes **486 + 2,916 + 81,405 = 84,807**, so the default correctly returns
   incomplete at 50,000. Use an explicit finite test allowance when a complete blank graph is
   needed; remeasure counts/census on final source and preserve 24,462 as pre-ruling history.
   Retain entry/at-most-256 charged-unit checks. Check the parent before/after model-only setup
   and periodically in per-call state/occurrence scans; keep the accounting deterministic
   across cold/warm geometry-cache reuse. Do not equate zero charged work with zero cost or
   ignore cancellation there. Test a setup/no-charge interruption and charged-loop cadence.

   Enforce the **unique additional-group quota during deduplication/insertion**, before retaining
   a group beyond the configured limit, not after retaining the entire over-limit node set.
   Charge its candidate attempt first; duplicates spend work but not another group slot.
   Exactly the configured number is allowed; the next distinct group refuses the build.
   Keep at most that many additional group nodes, sort them only after successful collection,
   and never substitute a partial prefix for a complete graph. Completion also requires enough
   work budget: allowing 4,096 groups does not promise a complete graph under 50,000 work.

   The surviving completeness-guard mutant is equivalent on this implementation: the fresh
   occurrence table is populated only for complete units, so a partial unit's zero count cannot
   equal the union of two nonempty disjoint nodes (at least two occurrences). Keep the explicit
   guard and the proof; re-run the adapted mutants after these changes, reporting the real
   detected/equivalent counts rather than assuming the preliminary 61+1 still describes them.
3. **Incomplete result: keep the empty arrays; change the group-cap tag to `nodes`.**
   Return `{nodes:[],weak:[],strong:[],complete:false,work,capHit}`; `work` remains the
   construction work actually charged. Use `capHit:'work'` for the work cap, **`'nodes'` for
   the additional-group quota**, and null for a spent parent budget. This uses the existing
   MS07a observer/recorder vocabulary for MS13c instead of introducing `groups`.
   `complete:false` is decisive even when capHit is null; the caller must still check its spent
   budget. Empty arrays mean no usable graph, not no construction work or no possible proof.
   Cancellation/non-budget errors propagate; the standalone builder publishes no observer record.
4. **Node schema/order: accept.** Digits are 1-based; node cells are ascending, unique and
   nonempty. Singletons precede groups in (cell,digit) order; groups use numeric lexicographic
   `[digit,...cells]` order with shorter prefixes first, not decimal-string order. Adapt the
   prefix-order fixture to a permitted box/region-line group rather than a window-only group.
5. **Fourth argument: accept.** `{groupLimit,workLimit}` uses finite nonnegative numbers,
   floored, otherwise `solver.invalidOption`; undefined uses frozen defaults
   `{groups:4096,work:50000}`. No unbounded mode. These controls support exact boundary tests
   and later explicit remaining-work accounting; they do not activate registered code.
   MS13c must share one 50,000 construction-plus-search allowance, not reset it after building.
6. **Checker rules: accept with a correction to group-member placements.** Keep raw legacy/
   v2/mixed paths, alternating valid edges, maximum edge-count length, the exact common-conflict
   target set, v2's ascending cell union and legacy's same unique set in its old order.
   Forced/contradiction proofs must start at a singleton and conclude exactly that root
   candidate (place it for forced, eliminate it for contradiction). Canonical-node checking
   may be opt-in for general proof validity, but generated graphs and MS13c's emitted proofs
   must be checked against the approved canonical family. Registry/key assertions remain in
   finder/integration tests; this helper does not replace them.
   Proof validity alone also establishes neither global shortestness nor search completeness;
   MS13c must enforce the complete-graph/minimum/window contracts separately.

   **Remove the blanket rejection of a placement merely because its candidate also appears
   in an internal group.** R16 forbids selecting an arbitrary group member from group truth;
   it does not forbid an independently forced singleton root that is also a member elsewhere.
   The exact-root conclusion and singleton-start checks already prevent arbitrary placement.
   Keep those negatives and add the following positive; SA2 verified every edge, canonical
   membership and a unique completion of this synthetic candidate state:

   - Digits 1..4; complete units (zero-based cells):
     `[0,1,2,10]` box, `[0,3,4,11]`, `[1,3,8,12]`, `[0,5,6,13]`, `[5,2,7,14]`
     extra units, and `[0,1,9,15]` row. Cells 10..15 are fixed to 4.
     Lay out the cells in rows `[0,1,9,15]`, `[2,10,3,4]`, `[5,6,7,8]`,
     `[11,12,13,14]`, so the named row and box have their stated geometry.
   - Candidate sets of cells 0..9:
     `12,123,123,13,23,12,13,123,123,23`. Let G be `{cells:[0,1],digit:1}`.
   - Paths (`+` true, `-` false):
     `0:1- -> 0:2+ -> 5:2- -> 5:1+ -> 2:1- -> G+`,
     and `0:1- -> 3:1+ -> G-`.
   - Valid forced Finding: placement `[0,1]`, no eliminations, cells `[0,1,2,3,5]`,
     length 5. The state completes to
     `[1,2,3,3,2,2,3,1,1,3,4,4,4,4,4,4]`.
     Current `pathProblems(...,{canonical:true})` rejects only the incidental membership,
     twice. The corrected checker must accept it. This is a proof-checker vector, not GH.
7. **Choose (b): fresh complete E provenance, check-only.** MS07a really recorded no E:
   its accepted evidence was the 35,020-find differential, quick/pin suites, CLI records and
   CI. That acceptance predates IR72 and does not waive its later source-aware closure rule.
   The present source-identity refusals are not green merge-checks. The differential and GH
   check supplement, rather than replace, current-source E; a Nightmare-only subset cannot
   substantiate the full 520-key merge.
   This task now owns fresh **five G09-G13 wire records, fourteen G01-G14 analysis records
   and all 520 hash records**, under its own evidence folder, on final frozen source.
   Use the existing E/IR12 recipes and predecessor per-item measurements, announce/coordinate
   the runs and preserve all command bounds. Verify the fresh wire records against the
   unchanged published wire before analysis. All three final merge-checks must pass with
   **no output difference and no fixture writes / --update-hashes**. An unexpected value
   difference is investigated as an inactivity failure, not refreshed away.
   Do not relabel old ledgers, remove fingerprint inputs or bypass identity checks.
   The checklist's source-aware inactive closure below supersedes this brief's former
   "no heavy gate" sentence for E provenance only; no GP/GQ/GS or discovery is added.
   MS13b follows that rule only for E families whose identities actually change; do not
   regenerate solely for a new task ID. MS13c still owns full activation E.
8. **Documents: accept.** Update both developer guides, Generator design 6.6/13.6/15 and the
   file tree, Player's inactive proof note, and the fixture lists in `docs/architecture.md`.
   State the approved group family, work units, quota/empty-result semantics, options and
   inactive status; do not advertise grouped hints as active. Confirm counts from final
   inventories/runs, not the preliminary +35 forecast. No user-guide/catalogue change is
   needed without a user-visible output change. `notes.md` may remain unchanged if outputs
   remain identical; the task evidence must record these rulings, source-identity refusals,
   fresh E and the final-source inactivity differential/quick/GH/CI results.

## Files to create/modify

- `core/js/engine/tech-chain.js`; chain suite; new core fixture `chain-proofs.js`;
  both apps' tests.html CORE_FIXTURE_FILES entries.
- Generator design 6.6/13.6, Player proof design and both developer guides (inactive API stated).
- `docs/architecture.md`'s fixture inventory and task-owned E ledgers; no canonical E fixture writes.

## Implementation steps

1. Implement canonical nodes and complete edge obligations with bounded construction.
2. Add independent proof checking, including invalid/arbitrary group placements.
3. Keep registered kernels on the old singleton graph.
4. Test caps, deterministic ordering, mutated state reuse and input immutability.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13a-B01 | Group reasoning means an actual disjunction, not a convenient singleton |
| MS13a-B02 | No half-integrated proof reaches players |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13a-T01 | Every edge obligation and malformed/overlapping/partial-unit negative is independent-tested |
| MS13a-T02 | Actual-sized buffers, deduplication, per-call bounds and state reuse are correct |
| MS13a-T03 | Registered output stays unchanged; final-source differential, complete E check-only, GH check, both quick sets and CI pass |

## Test plan

Generator `node tests\node-runner.js --suite=tech-chain,techniques,ui-contract,purity`; then both
quick sets. Include >old-product synthetic node count within the configured limit, limit+1 refusal,
cancellation, an added unit occurrence and identical node ordering after unrelated calls.
Under the source-identity ruling above, record complete current-source E and merge-check it with
no canonical output update. No qualification/performance/discovery gate or new generated
expectation is authorized in this inactive task.

## Definition of done & handoff

Give MS13b/c the canonical graph/checker schema and incomplete-graph rule. Do not activate it early.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness/evidence corruption or changing a recorded
decision; performance/availability is a named numerical item for MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any authorized new suite owns its r6c CI group/manifest entry too.
No new slow-cell evidence/tooling class. Return the inherited/new item list and inactive-graph proof.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted after SA1 analyst review (S-OD4 review set). Eight points before the final gates: SA2 ruled in `d9143de` (groups only from box/region x row/col; every tested same-digit pair charged; quota during insertion; capHit `'work'`/`'nodes'`/`null`; one checker over-restriction removed; full E recorded and merge-checked with no writes, since IR72 now applies to inactive tasks). SA1 review: one blocking finding (the work census covered only classic9 and wrongly claimed no real position was capped), fixed by an all-model census with no engine change; one minor finding escalated by SA2 to the owner as GC-01 (MS13c's shared allowance against IR54's unbounded forcingChain), S-AV36 added (`e1cec9e`); three text slips fixed; then accepted |
| Start | 2026-11-16 22:53:07 (+07:00), base `8345e89` |
| End | 23:32 stop with 8 points; 00:20 SA2 ruling (`d9143de`); 01:20 final report; SA1 review about 01:22-01:33; census fix finished 01:44; SA2's GC-01 escalation 01:53 (`e1cec9e`); SA1 accept with three text slips about 01:55; slips fixed 01:59; orchestrator re-check and commit 02:02 |
| Duration | About 1 h 55 min developer (39 min to the points, 1 h after the ruling, about 11 min census fix, about 4 min slips); about 48 min SA2 ruling; SA1 review about 20 min over two rounds (plus 12 min context); 3 h 09 min from start to commit; locked commands in `docs/difficulty-v3/evidence/MS13a/lock-log.jsonl` |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 rulings, GC-01, pack amendments); claude-opus-5.5 (SA1 review; orchestrator) |
| Token usage | Developer: 313 model calls; 103,288,162 input tokens (101,173,518 cache reads); 544,266 output tokens. SA1 reviewer: 178 calls; 61,823,645 input (60,354,183 cache reads); 157,798 output |
| AI credits | about 2,085 (developer); about 2,257 (SA1 review, including its context build for MS13a-MS18c) |
| Verification | Inactive `SG.chainGraph.build(model, state, ctx[, {groupLimit, workLimit}])` and frozen `LIMITS` (4096 groups / 50,000 units) in `core/js/engine/tech-chain.js` (354 lines inserted, none deleted; referenced nowhere else; hash `501481B4...`), with canonical groups from complete box/region x row/col intersections, 1-based digits, ascending cells, singleton-first and numeric-lexicographic group order, every tested same-digit pair charged, the group quota enforced during insertion, incomplete graphs with empty arrays and capHit `'work'`, `'nodes'` or `null`. Independent checker fixture `core/tests/fixtures/chain-proofs.js` (`SG.chainProofs`), SA2's singleton-in-group reproducer as a positive. Tests: `tech-chain` 176 -> 216. Mutants: 77 detected + 1 equivalent. Inactivity: differential 6,370 calls, 2,306 Findings, 135 ratings, SHA-256 `8c0f69aa...42e3` identical for the tree and `8345e89`; full E (5 wires, 14 analyses, 520 hashes) recorded on the final source and merge-checked "recorded from the current sources" with no writes (re-run by SA1); GH 37/37. Census on all 15 models (blank structural maxima, synthetic and ladder chain-group positions): the default 50,000 is reached at real chain-group positions on Samurai (38 of 48), Sohei (43 of 51), Flower (17 of 44) and mega16 (20 of 321); none on 9x9 boards, mega12 or Butterfly. Quick sets: Generator 4,408/4,408 (410.0 s, `quick-final-2`), Player 2,647/2,647 (73.3 s); no projection changes; fingerprints Generator `a019fda1...`, Player `7a1a84e9...`; CI check passes. Orchestrator: locked `tech-chain,tech-wing,techniques,technique-weights,difficulty-floor,i18n,digger-target` 1,203/1,203 (58.7 s), Player `help,help-example-tools,tech-chain,i18n` 363/363 (22.2 s), CI shard check 4,408 of 4,408 |
| Acceptance | MS13a-B01, B02, T01-T03 met (developer's evidence in `docs/difficulty-v3/evidence/MS13a/evidence.md` sections 9-10); SA1 analyst review: accept |
| Issues & resolutions | The first census measured real positions only on classic9 and claimed no real position was capped; SA1's measurements showed the default 50,000 reached at most Samurai and Sohei chain-group positions; corrected with an all-model census and design/evidence text, engine untouched. This makes MS13c's shared 50,000 allowance a policy question against IR54's unbounded forcingChain: escalated to the owner as **GC-01** (A preserve the legacy singleton route, SA2 recommends; B supersede IR54), S-AV36 opened for construction cost and caps (MS13c, MS18d, MS18e). MS07a's no-E closure predates IR72 and is not a precedent. Seven locked runs ended with exit 1 during development (logged). Not run: qualification, soak |
| Handoff | To MS13b: `SG.chainGraph.build` and `SG.chainProofs` exist, inactive; MS13b's inactive consumer work may proceed; MS13c waits for the owner's GC-01 answer and the pack amendment; base quick totals Generator 4,408 (410.0 s) and Player 2,647 (73.3 s); help catalogue 37; S-AV01-S-AV36 open as recorded; MS13b is in the S-OD4 analyst review set (SA1) |
