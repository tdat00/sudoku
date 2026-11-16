# MS10a — Remote pairs

| Header | Value |
|---|---|
| Depends on | MS09b accepted |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M10a |
| Authority | R10/R13/R20/R21; RP-01 / S-OD9 (owner confirmed 2026-11-16 06:23 +07:00) |
| Status | Not started |

## Goal & business context

Recognize a nontrivial alternating pair component without mislabelling a naked pair or accepting
an inconsistent odd cycle.

## Scope and repository rules

In: remotePairs plus full B. Out: WXYZ, uniqueness or general chain changes.
AGENTS/checklist, no Git, pack or orchestrator execution-log edits; CRLF, EN+VI, complete task-owned
evidence (including its logs). Keep the pre-E implementation and evidence; revise only what this
confirmed amendment requires. The old 543/543 focused result describes 132/440/44, not the new source.

**Binding resume amendment — RP-01 / S-OD9.** Apply **116/350/35**; do not retain weight 440 at
the earlier order. Fable's answer and the owner's confirmation are in `clarifications-resolved.md`.
The corrected prior preserves order-follows-weight and the Hard/floor prefixes. GH, IR72 H1, bundle B,
SA2-Q-S11 and the discovery ceiling are unchanged. MS10a's gate and real normal-hint example must pass
before E; MS10b-MS18e remain behind MS10a's acceptance.

**Quick projections (SA2, 2026-11-16):** check-list section 2, "Maintaining CI quick projections",
applies now and supersedes a `QUESTION:` solely for exceeding an old shard estimate. This task
may raise timing projections under that fixed rule even without adding a suite. It may not
move tests, change grouping or increase any timeout/factor. A proposed projection that cannot
fit the fixed shard/actual-workflow ceilings still needs orchestrator assignment.

## Inputs & context

R13, verbatim:

> Group identical bivalue masks; peer edges require alternating assignments. Two-colour consistent
> components. A nontrivial remote connection has at least three edges; a target seeing opposite
> colours loses both digits. Odd means edges, not cells. Reject inconsistent odd-cycle colouring;
> do not relabel a two-cell naked pair.

Register remotePairs: wing/order **116**/weight **350**/baseCost **35**, unscoped,
`assumesUniqueness: false`, Hard tier. Neighbours: twoStringKite 114/340/34, simpleColouring 120/360/36.
R10 Finding, placements=[]; key `technique.remotePairs.step`;
args `{digits:[d1,d2],ends:string[],length}` where length is the odd endpoint path's edge count.
Use actual `model.peers`, including cage-only peers in an assembled Killer model, not a graph
restricted to complete units. Inequalities alone supply no extra edges. Two-colour each same-pair
component from its lowest cell; reject an inconsistent odd-cycle component whole, including its tails.
For a target, select non-peer opposite-colour ends whose shortest BFS witness has an odd edge count
>=3. This minimum is **between the selected ends**, not across every pair the target sees: an
additional visible adjacent pair does not disqualify a genuine longer witness. An adjacent pair
alone is insufficient. Never eliminate either digit from proving cells.
Return the first removing pattern with all its targets. `cells` is the witness path's cells sorted
in cell order, not the whole component; `digits` and `ends` ascend, and eliminations sort by cell
then digit. Enumerate components by lowest cell, then lower end, then higher end.
Keep the accepted 50000 limit: one same-pair peer found while expanding a cell in either the
colouring or witness walk, or one tested pair of ends, is one unit. Keep the local per-call counter,
entry/every 256 parent checks, `capHit: 'work'`, observer and `SG.wingSearch.remotePairs` seam.
RP-01 does not authorize retuning this limit.

Vector: all four cells have {2,7}: A=R1C1, B=R2C2, C=R2C5, D=R5C5.
Edges AB(box), BC(row), CD(column); target R5C1 sees A/D only and loses 2,7.
The A-B-C even path cannot justify elimination at a target seeing only A/C.
Test a two-cell component, an odd cycle, disconnected components and a missed endpoint.
Baseline `core/js/engine/tech-wing.js:130-187` (`function findXyWing`);
`:283-344` (`function findWWing`) supplies existing peer/candidate patterns.

## Files to create/modify

- Wing engine/suite; full B and E; applicable Generator/Player design and both guide languages.
- Developer-owned live documentation: `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`,
  `DEVELOPERGUIDE.vn.md`, `generator/design.md`, affected `player/design.md`, and the B notes.
  Update these with the code, before their relevant fingerprints freeze. The pack author owns
  the report/plan/task/decision amendments; do not edit those or earlier tasks' execution logs.
- Task-owned scan helpers under `generator/tests/artifacts/difficulty-v3/MS10a/`, gate/evidence
  logs under `docs/difficulty-v3/evidence/MS10a/`, and Player curated sources under
  `player/tests/artifacts/difficulty-v3/MS10a/`.
- `.github/scripts/generator-quick.json`: timing/projection and informational metadata only,
  under check-list section 2's rule; no membership, job-limit or test-tier change.

## Implementation steps

1. Retain the accepted finder/proof conventions; change registration, weight and base cost to
   116/350/35. Update every affected registry/order list, fixture prefix, allowed set, floor and
   requiredness expectation. In `technique-weights`, pin **"between twoStringKite and
   simpleColouring: order 116, weight 350"**, plus hardest-technique/tier/floor invariants.
   Audit `REGISTRY_ORDER`, `BELOW_*` (including `BELOW_FSF` and `BELOW_CHAINS`), `THROUGH_RP`,
   `difficulty-floor` and current manual `difficulty` expectations. Hard still gains `wing`;
   1.25 * 350 = 437.5, within Hard. Do not edit frozen `LADDER`, historical `after` arrays or v2 data.
2. Keep the two real `after: null` positives and independent soundness populations; recheck current
   prefix negatives on the new order. Add the caged Killer test and qualify its bound evidence
   as specified below. Retain the accepted EN/VI proof wording in both apps.
3. Rerun focused checks, relevant mutations and 20-run positive/negative pattern cost. Recheck all
   26 reference puzzles under R20, including with/without-technique attribution; record every changed
   rating, level or requiredness verdict and its cause. Refresh current reference/`v3Expected` pins
   with those reasons, not by preserving old labels or adjusting priors.
4. Run both complete order-116 scans, then the curated normal-hint GH route. Follow their stop
   conditions below; do not start E or another prior experiment while either prerequisite is missing.
5. After gate/GH pass, finish source/document edits and complete E, affected pins and old help examples,
   complete GH, both quick sets and CI. Keep earlier tasks' evidence as source-specific history.
   Reconcile projections from final process-wall times; verify the Player's actual 900 s budget.

### Caged Killer soundness and bound evidence

Use an **assembled caged Killer model**, not the uncaged `build()` model. Construct a same-pair
chain with an edge between cage-mates sharing no complete row/column/box unit; assert the actual
peer edge and partial cage, the finder's witness/eliminations, independent soundness and no removal
from proving cells. This is a finder-level test, not a GH source or a claim that normal hints reach it.
Record exactly:

> A cage-only peer edge invalidates the complete-unit subsumption proof; this alone does not demonstrate normal-hint reachability.

The earlier Killer structural/work evidence used a 27-unit uncaged model. Retain and label that
population honestly; recheck or qualify the claimed Killer bound with the assembled cage geometry.
Do not present the old 27-unit figure as covering caged Killer, or claim the limit never binds on all
registered variants from it. Record units/peers, work units, bound versus observations and cap outcomes.
Carry this known exception and the corrected evidence into S-AV32's handoff.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS10a-B01 | A real remote proof, not an adjacent naked pair, gets the new name |
| MS10a-B02 | Both digit eliminations and their parity reason are visible |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS10a-T01 | Odd/even, shortest nontrivial witness and inconsistent-component rejection pass |
| MS10a-T02 | Actual peers, state purity, cancellation/caps and full B pass |
| MS10a-T03 | Full E/GH/cost, 26-reference R20 recheck and both quick sets pass; CI projection revisions follow check-list section 2 and fit the unchanged actual workflow limits |
| MS10a-T04 | 116/350/35 and neighbour/order/tier/floor/requiredness tests pass; both complete scans are recorded and at least one completed solve contains remotePairs |
| MS10a-T05 | A caged Killer finder test covers a cage-only edge soundly; bound evidence distinguishes the earlier uncaged model; a real normal-hint GH example remains mandatory |

## Test plan and gates

### 1. Focused integration, references and cost

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor`;
Player `node tests\node-runner.js --suite=help,play,i18n` after catalogue integration. Do not weaken
the missing-example assertion. Recheck the 26 references and affected current-contract pins;
the manual `difficulty` suite remains unrun unless separately assigned (check its edited pure
expectations/syntax and retain the inherited item).

```powershell
node tests\pattern-cost.js --ids=remotePairs --runs=20 --json=..\docs\difficulty-v3\evidence\MS10a\pattern-cost.json
```

### 2. RP-01 reachability gate — before any E

After the registered source is 116/350/35, rerun the **same seed-4242 populations in full**:

- 30,000 dug classic9 positions after exhausting the unscoped registry prefix **below 116**.
- 20,000 complete classic9 solve attempts with the current full ladder and the same
  `assumeUniqueness` setting as before (`true` in `explore-solves.js`, `allowedTechniques: null`).

Keep the corpus construction, indices and preprocessing settings; do not stop counting after the
first hit. In `explore-dug.js`, derive the cutoff from `SG.techniques.get('remotePairs').order`,
assert it is 116 and that the resulting prefix excludes Remote Pairs, and print the cutoff in the
log header. Do not leave the hardcoded `<132` predicate or let the technique consume its own witness.
In `explore-solves.js`, compute `remoteSteps` and count/select a match **only when
`report.solved && remoteSteps.length > 0`**. Preserve the selected original givens and corpus indices.
Report attempted, solved and qualifying-solve counts separately; an unsolved trace with the step
does not pass the gate or supply a selected source.

The unchanged full-population invocations, from Generator, are:

```powershell
node tests\artifacts\difficulty-v3\MS10a\explore-dug.js 4242 30000 0 below
node tests\artifacts\difficulty-v3\MS10a\explore-solves.js 4242 20000 0
```

Run them through the existing locked bounded route, not as unlocked trials. Preserve the question's
four logs byte for byte. Write new transcripts under `docs/difficulty-v3/evidence/MS10a/`:

- `logs/explore-dug-4242-30000-order116.txt`
- `logs/explore-solves-4242-20000-order116.txt`

Record source identity, actual settings, counts/rates and durations; an interrupted scan is incomplete,
not zero or a completed gate. Retain the old 132/440/44 evidence as history. **Pass requires at least
one completed solve containing a Remote Pairs step**, with both populations completed and recorded.
Report that count/rate for S-AV32. If the complete solve scan has zero qualifying solves, send
`QUESTION:` and **stop before E**: the orchestrator takes (B) or removal to the **owner**, not Fable.
Do not try another order/weight, expand the population, or treat a position-scan hit as a GH pass.

### 3. Curated sources and unchanged normal-hint GH — before E

Take the **lowest-index qualifying solves, at most eight**, from the complete solve scan. Write
`player/tests/artifacts/difficulty-v3/MS10a/sources.json` as
`{"schema":1,"sources":{"remotePairs":[...]}}`. Each assigned-source entry has exactly this shape:

```json
{"variantId":"classic9","level":null,"seed":"testkit-4242-<index>","text":"#1,Classic Sudoku 9x9,,testkit-4242-<index>\n<9 rows>"}
```

Use the unchanged original givens for the nine rows. Leave the level null and its export-header
field empty; use the **non-numeric** seed string so `importer.js` does not interpret it as a
Generator seed. Record test-kit corpus seed 4242 and the index as provenance; never invent a
pipeline seed or requested level. Do not put extra provenance keys in the strictly checked entry.
These are curated sources under SA2-Q-S11, not discovery requests.

From Player, run `--write`, then `--check`:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=remotePairs --sources=tests\artifacts\difficulty-v3\MS10a\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=remotePairs --sources=tests\artifacts\difficulty-v3\MS10a\sources.json --max-puzzles=8 --max-hints=400 --check
```

The real Player `game.hint()` must select Remote Pairs; a direct finder call, `after: null` fixture,
synthetic snapshot or suppression of earlier techniques does not meet GH. If the gate passes but
none of these curated sources replays to the step, retain the failures and use B's existing ceiling:
**at most four distinct batches of twelve requests**, starting with classic9 hard/expert/master,
one variant/level per batch, <=400 hints/puzzle, <=8-minute tool deadline. B's existing PLAN-level
fallback remains available; failed requests consume the same task-wide allowance, with no identical
no-progress rerun. Record the exact attempts and provenance. Do not use Killer's theoretical exception
as an alternative GH route. If no real normal-hint source is found within the bound, send `QUESTION:`
with the missing ID and attempts and **stop before E**; do not waive GH or silently defer the example.

### 4. Full E, affected old examples and final quick/CI checks

Once gate and new-ID GH pass, finish the relevant source and live documentation before recording
their evidence. Follow check-list section 7 and IR72 G: **five G09-G13 wires**, published/checked
before the **fourteen G01-G14 analyses**, then **all 520 hashes** (26 combinations x 20 seeds).
These sample first shards are not the complete E:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS10a\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS10a\analysis\G01.json
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS10a\hashes\classic4-veryEasy-00.json
```

Keep CHANGED lists and explain every changed key; update only affected current pins from evidence.
Re-run all three final merge-checks on the final source. A later fingerprinted engine byte change
requires fresh E; preserve the superseded run, never mix or relabel its ledgers. Recheck every affected
earlier help example, not only Remote Pairs (likely Simple Colouring, Empty Rectangle and the finned
fish); refresh with real sources, run their write/check and the **complete catalogue GH check**.
Earlier tasks' accepted runs remain history for their source, not validation of the new order.

Update both user and developer guides in EN/VI, `generator/design.md` and affected Player design/counts
in the same implementation change. State the corrected prior, placement, proof, fields, current
technique/example/quick totals and the bounded Killer qualification. Include this explanation where
Remote Pairs is described (with equivalent Vietnamese wording in VI documents):

> After the naked pairs are done, every Remote Pairs deduction on a standard board is also a Simple Colouring deduction, and the ladder names the simpler pattern first.

Finish **both complete quick sets** via the current disjoint bounded manifest; no test/tier moves.
Apply `c160bb4`'s projection rule to each relevant final process-wall measurement:
`max(oldProjectionSeconds, 10 * ceil(1.5 * m / 10))`. Record before/after calculations and S-AV08's
actual cost growth. Each projection stays <=450 s; Generator groups satisfy
`180 + 3 * sum(projections) <= 1800`, and the Player satisfies **`180 + 3 * projection <= 900`**.
Run the existing CI registration/group check and record the actual-workflow arithmetic and final
fingerprints; the helper's generic 1800 s Player display is not authority. If the formula cannot fit,
send `QUESTION:` for orchestrator assignment, leave CI readiness open and continue only independent
safe work; never clamp projections, lower the factor, raise a timeout or move tests.

Jobs 1/no --jobs; E 10-90 minutes, cost 1-30 seconds, GH 1-120 seconds curated/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Use `Invoke-Dv3Node` for every possibly >10-second payload, with the shared lock, 15-second fairness
gap, IR12 admission and the unchanged 540-second process-tree ceiling. Keep gate runs separately
bounded and recorded; no unbounded retry, new evidence class or speculative unlocked generation.

## Definition of done & handoff

Report 116/350/35, the retained proof conventions, focused/mutation results, the caged Killer test and
bound qualification, both scan populations/counts/rates and new log paths, lowest-index curated-source
provenance and actual normal-hint GH. Include all 26-reference changes/causes, full E key coverage and
final merge-checks, affected old examples, complete GH, quick counts/process times/fingerprints, CI
projection arithmetic and updated live documents. Return all inherited/new named items, with S-AV32's
order-116 rate and Killer exception for MS18e and S-AV08's quick costs; no acceptance claim while gate,
GH, evidence integrity or CI readiness is unresolved. The orchestrator owns pack/log updates and commit.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template / IR72 A-J and generic soundness/order-invariant suites,
not routine analyst cross-review. Send `QUESTION:` through the orchestrator to SA2 for a genuine
proof/contract ambiguity, unexplained correctness failure, corrupted/lost evidence or any further
recorded-decision change; stop dependent work. RP-01's zero-hit gate and exhausted GH source bound
are explicit pre-E stops as above, not availability deferrals. A failed gate's (B)/removal decision
belongs to the owner, not Fable. Report an incomplete/unlaunchable gate, keep it unpassed, and do
not start E; no time-limit waiver. A projection formula exceeding fixed ceilings follows the
bounded-assignment stop above. Other time/availability findings become named numerical items for
MS18c/MS18d and work continues within the bounds.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list, actual gates and CI membership.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (orchestrator check against IR72 A-J; outside the analyst review set). The developer stopped before E with eight questions; SA2 accepted Q1-Q6 and Q8 and escalated Q7 (reachability at order 132) to the plan author as RP-01. Fable answered (A) with a corrected prior, the owner confirmed it (S-OD9, `1456f50`), SA2 amended the pack (`f193545`), and the task finished at 116/350/35 after the reachability gate passed |
| Start | 2026-11-16 03:30:39 (+07:00), base `9156024` (pack commits `c160bb4`, `1456f50` and `f193545` landed during the task) |
| End | 04:14 stop before E (8 questions); 04:25 SA2 ruling; 04:39 accepted parts applied, waiting for RP-01; about 06:40 resumed under `f193545`; 07:58:37 final report; orchestrator re-check and commit at about 08:12 |
| Duration | About 2 h 27 min developer (44 min to the questions, 14 min applying the ruling, 1 h 18 min after the resume); about 2 h waiting for RP-01 (Fable's answer, both analysts' check, the owner's confirmation and the pack amendment); 87 locked commands, every lock wait 0-0.1 s (6.9 s in all) |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 rulings, RP-01 question and pack amendment); claude-opus-5.5 (SA1 check of the answer; orchestrator); claude-fable-5-2 (RP-01 answer) |
| Token usage | 386 model calls; 137,272,762 input tokens (134,832,620 cache reads); 497,811 output tokens (developer) |
| AI credits | about 2,456 (developer) |
| Verification | `remotePairs` in `core/js/engine/tech-wing.js` (group `wing`, order 116, base cost 35, weight 350, between `twoStringKite` and `simpleColouring`; Hard, unscoped, `assumesUniqueness: false`): identical bivalue cells joined by `model.peers`, two-coloured, odd-cycle components skipped whole, ends at least three edges apart, `cells` the sorted witness path, 50,000 work units per call through `SG.wingSearch.remotePairs`. Caged Killer test with a cage-only peer edge (caged structural bounds 2,268 / 2,274 / 3,131 / 7,505). **Reachability gate (seed 4242, order 116):** 51 of 30,000 positions after the prefix (0.170 %); **45 of 20,000 complete solves contain the step** (0.2250 %; hardest technique in 20), logs `explore-*-order116.txt`. GH: `remotePairs` from curated source `testkit-4242-254` step 30 through `game.hint()` (8 sources replay); `xWing` refreshed from its own source; catalogue 34/34. **E** on frozen bytes: wire G10 only (3 local-search counters), analysis G06 only (score 3,002 -> 3,017, a Remote Pairs step replaces a Simple Colouring step), **520 of 520 hashes unchanged**; merge-checks recorded from the current sources. 26 reference ratings unchanged (no level or requiredness change). Focused gates Generator 548/548, Player 161/161, shared tech suites 588/588; 56/56 mutants. Quick sets: Generator 4,018/4,018 (379.9 s), Player 2,260/2,260 (61.1 s); seven projections raised under `c160bb4` (Player 60 -> 100 s: 180 + 3 x 100 = 480 of 900); fingerprints match; CI check passes. Orchestrator: locked `tech-wing,tech-fish,techniques,technique-weights,difficulty-floor` 1,031/1,031 (58.3 s), Player `help,play,i18n` 161/161 (3.3 s), CI shard check 4,018 of 4,018 in one shard each, every job inside its limit |
| Acceptance | MS10a-B01, B02, T01-T05 met; IR72 A-J pass (developer's table with evidence pointers in `docs/difficulty-v3/evidence/MS10a/evidence.md`) |
| Issues & resolutions | **RP-01 / S-AV32:** at the recorded 132/440/44 Remote Pairs sat behind Simple Colouring and was unreachable on complete-unit boards (0 of 20,000 solves), so the mandatory normal-hint example was impossible; resolved by S-OD9 (116/350/35) and a pre-E gate, which passed. Killer cages are the known exception to the subsumption argument (finder evidence only). The earlier order-132 evidence (four logs, 53 mutants, the first census) is kept as history. The Player's quick shard exceeded its old 60 s projection (61.1 s) and was raised to 100 s under the projection rule. Two text errors in fingerprinted documents (a stale total in `player/design.md`, a population list in `generator/design.md`) cost a second run of both quick sets; the first results are kept as superseded. Not run: the manual `difficulty` suite (pure pins updated and evaluated by script), qualification, soak |
| Handoff | To MS10b: the wing group now holds `remotePairs` at order 116 (before `simpleColouring`); IR72 A-J is the checklist; base quick totals Generator 4,018 (379.9 s) and Player 2,260 (61.1 s, projection 100 s); help catalogue 34; S-AV01-S-AV32 open as recorded (S-AV32 with the order-116 rates and the Killer qualification, for MS18e); ask before E |
