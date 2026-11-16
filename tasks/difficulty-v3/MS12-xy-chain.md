# MS12 — Restricted XY-chain

| Header | Value |
|---|---|
| Depends on | MS11c accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared chains / both apps; M12 |
| Authority | R10/R15/R20/R21 |
| Status | Not started |

## Goal & business context

Name a bivalue-only chain distinctly from general forcing chains, with a proof graph that actually
enforces that restriction.

## Scope and repository rules

In: restricted edge mode, xyChain and B. Out: grouped nodes or relabelled general chains.
AGENTS/checklist, no Git/pack/log writes, real examples, EN+VI, CRLF and owned E.

## Inputs & context

R15, verbatim:

> Strong edges are only the two candidates in a bivalue cell; weak edges are equal-digit candidates
> in distinct peer cells. No conjugate-unit strong edges or general multivalue cell edges.
> Endpoints have the same digit in distinct cells; a false-to-true path proves their disjunction.
> Eliminate that digit from external candidates seeing both.

Register xyChain: chain/order 186/weight 1000/baseCost 82, unscoped, no uniqueness.
Maximum 12 edges intersected with a smaller caller maxChainLength; invalid/off rules match MS07.
Deterministic globally shortest represented endpoint proof; work cap 50000 edge expansions.
Local exhaustion returns null, never a partial minimum. No placement/contradiction modes for this ID.
R10 Finding, key `technique.xyChain.step`, args
`{digit,kind:'endpoints',length,chains:[[[cell,digit,truth],...]]}` with copied arrays.
A common builder is allowed only with explicit edge filters; a renamed general finder is not.

Vector: A=R1C1{1,4}, B=R1C5{1,2}, C=R1C9{2,3}, D=R5C9{3,4}.
False 4@A -> true 1@A -> false 1@B -> true 2@B -> false 2@C -> true 3@C ->
false 3@D -> true 4@D is seven edges; remove 4 at R5C1. A unit-conjugate shortcut is not an
allowed XY strong edge. Use a longer genuine path for help if earlier WXYZ consumes this example.
Baseline `core/js/engine/tech-chain.js:78-112` (scratch), `:353-385` (`function buildChainFinding`);
MS07a supplies the unregistered shortest-search seam.

### Pre-E rulings — SA2, 2026-11-16

These implement R10/R15/R20 and B/IR72; no owner or Fable decision is needed. Keep the assigned
186/1000/82, chain group, unscoped/no uniqueness, 12-edge ceiling and 50,000-work registered limit.

1. **Shared builder: accept the explicit `edges` option.** Absent means `general`; the two named
   modes select immutable policy records, and any other explicit value is `solver.invalidOption`.
   General's true/true/false/true flags preserve the old edge enumeration, polarity proofs,
   tie order, Findings and work records on the same input. SA2 inspected the diff and the two
   `legacy-diff-*.txt` records: both have 3,682 calls, 1,305 Findings and SHA-256
   `b5458dd3484951418407082b4bee8980f20d78a5dbcee4c131b6468bcf06007e`.
   This is fixed-input kernel compatibility, not a claim that normal solves are unchanged after
   a new earlier ID is registered. Repeat/retain the compatibility check on final source and
   preserve default/explicit-general and interleaved-mode behavior.

   Correct the header/report wording "`ctx.completeUnits` is not read": `scanForcing` currently
   fetches the property to pass it to the shared builder, but the restricted unit loop is disabled.
   Use: **"The restricted graph does not consult the contents of ctx.completeUnits or use
   unit-conjugate strong links."** Keep the existing completeness-array/shortcut regressions;
   no algorithm change is needed merely to avoid this unused property fetch.

   The existing generic seam remains a low-level/reference tool; its explicit long windows
   and unbounded-work test options do not widen the registered xyChain. That wrapper always
   selects restricted edges, at most 12 edges and 50,000 work; caller maxChainLength only narrows.
   General registered finders do not take a caller-supplied edge mode.
   **MS13 handoff:** these flags describe the current atomic graph, not the whole grouped-graph
   API. MS13a adds its canonical graph/checker inactive; MS13b prepares consumers; MS13c activates
   groups for forcingChain/Long only. Preserve atomic restricted XY proofs and legacy triples;
   no grouped/unit-strong edge leaks into them. The grouped tasks must use actual node sizes and
   their explicit decoder/graph path, not decode group nodes with cell*digits arithmetic.
2. **Finding.cells: accept ascending distinct cells.** Keep owned/deduplicated ascending proof
   cells and ascending eliminations; actual literal order/polarity stays in the copied `chains`
   array. Do not reorder legacy general-chain Findings to match this new-ID convention.
3. **Work: accept the unit and unchanged limit.** Count every visited restricted edge, including
   edges to non-bivalue terminal candidates and already-visited literals; do not add unrecorded
   pruning, another cap or an automatic increase. Preserve the entry/at-most-256 checks and
   current off-window rules. If the bounded search cannot complete its global minimum, return
   null with the truthful cap/budget outcome, not the best partial minimum.

   The crude bound `4*n*n*(P+1)` is a valid atomic restricted bound: at most 2n eligible false
   starts, each expanding at most 2n bivalue strong edges and 2nP weak edges (P is maximum peer
   count). It is not an observed cap hit or an elapsed-time bound, and zero observed caps does
   not prove exhaustive coverage within the limit. No named item is inferred solely from the
   current zero-cap data; record final-source populations/work/latency and route an actual
   cap or cost finding numerically. Keep constructed cases separate from sampled states.
   Do not reduce the 12-edge search window to 11 merely because successful endpoint paths have
   odd length: depth-12 edge visits affect charged work and the bounded prefix.
4. **Cell revisits: accept.** A shortest path of literals need not be a simple path of physical
   cells. Retain the literal visited-set rule and independent verification of every edge, both
   same-digit distinct-cell ends and their actual common-weak targets. Add no simple-cell-path
   restriction. This remains an endpoint disjunction, not a placement/contradiction Finding
   or permission to use a unit-conjugate/multivalue-cell strong edge.
5. **Lower-end mutant: accept as equivalent for Findings and charged edge work, with the
   precise argument below.** Reverse the path **and complement every truth bit**; plain
   reversal is not a directed restricted path. Bivalue strong pairs and same-digit peer weak
   pairs are symmetric, so the complemented reverse is a valid proof of the same length.
   `commonWeak` depends on the two ends, not on the selected internal path; reversing the ends
   therefore gives the same target set. Both ends are eligible false starts because their
   entering strong edges are reversible.

   Suppose an added reverse-end match from higher node b to lower node a could be accepted at
   length L. Node a was already searched in false polarity, with a bound at least as large as
   the current one. It would have found the reverse proof, or another proof no longer than L.
   The global best length would then be <=L, and b's search is bounded by bestLength-1, so it
   cannot accept L. If the earlier search capped, exhausted its parent budget or rejected a
   minimum below the window, the call ended before b. Thus the added branch cannot select a
   new Finding or change the search/edge count.
   Keep the lower-end guard: the mutant may perform extra unmetered target-intersection checks,
   so this is not a claim of identical latency. The argument depends on these symmetric edges,
   targets determined solely by endpoints, eligible roots, ascending root order and best-length
   pruning; do not assume it automatically transfers to a later graph/search with different rules.
   Report **42 detected + 1 equivalent**, not 43 detected. SA2 also compared original/mutated
   code in memory on 35 constructed/vector states, both modes and six window/cap settings:
   420 paired comparisons matched Findings and work records, including reduced-limit cases.
   This corroborates the argument; it is not an exhaustive search or default-limit cap census.
6. **Registry priority: accept.** The shortest-proof promise is within xyChain's restricted
   search, not across IDs. At order 186 a genuine seven-edge XY endpoint proof may precede a
   four-edge general proof at order 190. MS12-B02 forbids relabelling a general proof as XY:
   the emitted proof must independently meet every restricted-edge obligation. It does not
   introduce a global shortest-among-techniques selector. Do not retune either prior/order.
7. **GH: accept the proposed preference order, with bounded known-source curation.** Use the
   known forcing-chain sources for xyChain; refresh forcingChain from its own source; use the
   recorded alternative catalogue candidates for nakedTriple and retain the tool's verified
   choice. For jellyfish, after the failed own/catalogue replays, try **already identified**
   unique fixture/corpus puzzles as curated sources, retaining unchanged givens and provenance.
   For newly curated non-Generator sources use level null and an empty export-header level.
   Test-kit sources use a non-numeric `testkit-<seed>-<index>` marker; a published/other fixture
   without a corpus index needs its truthful non-numeric source marker, not invented Generator
   request metadata. Preserve the recorded provenance of existing catalogue sources and genuine
   original Generator provenance where known. Each example must replay through normal `game.hint()`.

   Discovery **is allowed** if known sources fail: B's at-most-four distinct batches of twelve
   attempted requests **across the whole MS12 task**, <=400 hints/puzzle, <=8-minute deadline.
   Start with classic9 master/nightmare, then other existing PLAN levels if needed; failed
   requests consume the allowance and identical no-progress reruns are forbidden. This is
   not four new batches per ID. The task's eight-source curated command stays; affected old
   multi-ID refreshes use the existing bounded E/B recipe. A fresh broad test-kit generation
   scan is not "free curation" and may not bypass the discovery allowance.
   Record failed candidates, selection and source identities. Use source-record mode where a
   partial collection is not yet publishable; do not fabricate snapshots or suppress earlier
   techniques. If the finite route cannot supply a required real example, send `QUESTION:`
   with the missing ID and exact attempts. Finish the complete **37-ID** GH check.
8. **E and reclassification: proceed after the rulings, with no extra reachability gate.**
   `1.25 * 1000 = 1250`, so xyChain's earliest admitting tier is **Master**. In the fixed GG
   manifest the admitting cells are classic9 master/nightmare, diagonalX nightmare and jigsaw9
   master. An unexpected below-Master GG change needs `QUESTION:`/investigation before
   publication. This restriction is not a ban on changed wires/analyses for other admitting
   requests, nor on changed help examples of lower-named techniques in harder puzzles.

   The reported G03/G04/G14 and reference-score differences are plausible consequences of the
   earlier restricted proof, not automatic stops. Final records and per-key attribution must
   establish them. R20 allows explained reference reclassification; keep historical labels,
   priors and correct requiredness evaluation rather than fitting weights to old outputs.
   Run all five G09-G13 wires, fourteen G01-G14 analyses and 520 hashes on frozen source,
   publishing/checking wires before analyses, with complete final merge-checks.
   Refresh output pins from those records, like for like, listing before/after values.
   For a pure golden assertion, a jump becoming newPeak legitimately changes the recorded
   classification/cause. A test whose purpose is a jump/cause-class branch must still exercise
   that branch: retain a real qualifying witness under IR72 I2, or ask if none remains; do not
   turn it into an unrelated newPeak check or loosen/remove its assertions.

   Complete final-source mutations, legacy compatibility, R20, pattern cost/census, GH,
   guides/designs/notes, both quick sets and CI/projection arithmetic. Preserve final source
   identities and the shared lock, IR12 admission, 450 s compound admission, 540 s process-tree
   ceiling and 15 s gaps. A test-only pin refresh does not itself require E to be recorded again;
   a later fingerprinted generation-source change does.
   Preserve the surviving exploratory tee logs and disclose precisely which outputs were
   corrupted/deleted; do not claim their missing detail was preserved or invent a reconstruction.
   The final-source mutation run must retain its full outcomes/failing-test evidence. If any
   evidence required to substantiate an accepted gate cannot be verified, send `QUESTION:`.

## Files to create/modify

- Chain engine/suite; full B/E, both designs' chain coverage and both guide languages.

## Implementation steps

1. Add explicit restricted edge construction/search and own endpoint Finding/key.
2. Test the seven-edge vector, excluded shortcut, max 12 boundary, ties and generic/partial units.
3. Add two real exact-Finding positives/negative, bounded firing cases and full locale/help integration.
4. Measure cost/caps, update current references/notes and E; finish quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS12-B01 | Every XY-chain explanation is genuinely bivalue-only |
| MS12-B02 | Lower named cost does not hide a general-chain proof |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS12-T01 | Edge filters, same-digit endpoints, shortest ties, 12/13 and caller limits pass |
| MS12-T02 | Exact ID/key, state/retained-proof ownership, cancellation/caps and full B hold |
| MS12-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor,i18n,digger-target,tech-wing,pattern-cost-tools`;
Player `--suite=play,i18n,help,help-example-tools,tech-chain,tech-wing,techniques`; both quick sets.
Full E MS12:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS12\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS12\analysis\G01.json
node tests\pattern-cost.js --ids=xyChain --runs=20 --json=..\docs\difficulty-v3\evidence\MS12\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=xyChain --sources=tests\artifacts\difficulty-v3\MS12\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=xyChain --sources=tests\artifacts\difficulty-v3\MS12\sources.json --max-puzzles=8 --max-hints=400 --check
```

Prefer existing forcing-chain sources, then bounded classic9 master/nightmare. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-60 seconds, curated GH 1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Own work limit may adjust once with evidence; maximum 12 is not tuning permission.

## Definition of done & handoff

Give MS13 the explicitly restricted edge mode and legacy-proof compatibility. No grouped graph is active.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and generic soundness/order-invariant suites,
not routine analyst cross-review. Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical item for MS18c/MS18d and work continues within the bounds.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list, actual gates and CI membership.

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
