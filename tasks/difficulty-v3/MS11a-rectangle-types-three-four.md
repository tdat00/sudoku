# MS11a — Unique Rectangle types 3 and 4

| Header | Value |
|---|---|
| Depends on | MS10b accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M11a |
| Authority | R10/R14/R20/R21 |
| Status | Not started |

## Goal & business context

Extend the existing uniqueness proof without weakening its geometry or uniqueness precondition.
Old types 1/2 retain priority over every new subtype.

## Scope

In: types 3/4, subtype text/fixtures, existing-ID integration. Out: hidden UR/BUG, new ID or weights.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. A known completion is not uniqueness: prove it for real
fixtures. Preserve historical positions and add current overrides only when behavior intentionally changes.

## Inputs & context

R14, verbatim:

> Type 3: two bivalue floor corners; roof extras form one virtual nonempty subset member in a unit
> containing both roofs. Combine with k other real cells whose candidate union with the extras has
> k+1 digits. Eliminate that union outside the real cells and roofs. The virtual member denotes at
> least one roof extra, not a fixed extra value in both roofs.
> Type 4: a true conjugate link for one deadly digit between roofs in a complete unit removes the
> other deadly digit from both roofs.

Keep ID uniqueRectangle/order 180/weight 900/baseCost and assumesUniqueness=true unchanged.
Keep `isDeadlyGeometry`/`buildRectangles`; every relevant unit must preserve the digit swap.
Reject cages/inequalities; direct find with ctx.assumeUniqueness=false returns null.
Run the existing type 1/2 search before the new-subtype pass, not type 3 on an earlier rectangle
before a later old type 1. New work guard 50000 extensions, checked at entry/every 256 and reset/call.
Finding uses the same ID; keys `technique.uniqueRectangle.type3.step` / `.type4.step`,
args use existing localized `digits`, `digit`, `partDigits`, plus string cell/unit labels.

Vectors: floors R1C1/R1C4={1,2}; roofs R2C1={1,2,3}, R2C4={1,2,4}.
Type 3: another R2 cell {3,4} forms the virtual+real pair; remove 3/4 from other row cells.
Type 4: make 1 occur only in the two roofs in complete row 2; remove 2 from both roofs.
Test empty extras, wrong union size, a third occurrence breaking conjugacy, extra diagonal with
one corner, partial unit, cages/signs and false uniqueness context.
Baseline `core/js/engine/tech-wing.js:349-399` (`isDeadlyGeometry` / `function buildRectangles`),
`:477-528` (`function findUniqueRectangle`).

### Pre-E rulings — SA2, 2026-11-16

The authority for these subtypes is **R14**, not R13. These rulings implement its existing general
virtual-subset rule; no ID, prior, uniqueness/geometry decision or work allowance changes.
Do not freeze or start E until the corrections below have their focused/mutation evidence.

1. **Finding arguments: accept the proposed shape.** Type 3 keeps the rectangle's four cells
   in the existing rectangle order, followed by the real cells ascending; no duplicates. Type 4
   keeps the four rectangle cells. Roof labels follow ascending cell indices; `digits` is [X,Y]
   ascending, `partDigits` is the full union D ascending, and argument `cells` lists the real-cell
   labels in that order. Type 4's `digit` is the removed digit; the other member of [X,Y] is the
   conjugate-link digit, already explained by the text. No extra `digitX`/`digitY`/link field is needed.
   Keep empty placements and eliminations sorted by cell then digit.

   Make the Type 3 text explicitly exclude **both** roofs, not an unidentified single virtual
   roof. Replace its final sentence in both apps with:
   - EN: `{partDigits} are removed from the cells of {unit} outside both {roof1} and {roof2} and the cells {cells}.`
   - VI: `Loại {partDigits} khỏi các ô của {unit}, trừ cả {roof1}, {roof2} và các ô {cells}.`
   Keep the rest of the capacity explanation and the matching placeholders/render checks.
2. **Dispatcher: accept.** Complete the old type 1/2 pass over all rectangles first. An old
   Finding on a later rectangle wins over a new subtype on an earlier one. Only then run the
   rectangle-major second pass, Type 3 across all eligible units before Type 4 on each rectangle.
   Keep unit indices ascending, subset sizes ascending, cells ascending within each size, and
   Type 4 link digits ascending. Do not switch to subtype-major or Type-4-first enumeration.
3. **Real-cell cap: change; three is sound but omits R14 deductions.** R14 does not restrict Type 3
   to an ordinary naked quad. Remove `UR_MAX_REAL = 3` as a heuristic cutoff; changing it to 4
   alone is also insufficient. For each roof unit, enumerate
   **k = max(1, |E| - 1) .. min(number of eligible real cells, model.digits - 1)**,
   subject to the same **50,000-unit per-call budget** and sound union-size pruning. The upper
   digit bound follows from |D| = k+1, not tuning. Resize scratch storage and remove the hard
   four-digit extras/pool filters; do not retain an equivalent hidden cap in the independent
   oracle, work recount, structural bounds or documentation. Keep exact |D| = k+1 at a leaf.

   The existing cap-negative test already contains a larger proof. Floors R1C1/R1C4={1,2},
   roofs R2C1={1,2,3}, R2C4={1,2,4}, and real cells R2C3={7,4}, R2C7={3,5},
   R2C8={5,6}, R2C9={6,7} give E={3,4}, k=4 and D={3,4,5,6,7}; remove D from
   R2C2/R2C5/R2C6 where present. With other masks full, SA2's read-only in-memory check returned
   null at cap 3 but this complete Type 3 Finding at cap 4 in **24 work units**, uncapped.
   The existing five-extras negative likewise becomes a positive (four real cells, D=3..7).
   Replace those unsupported cap negatives with exact-Finding/independent-proof positives.

   Also cover a size beyond four real cells: on a 12-digit 3x4-box board, floors R1C1/R1C5={1,2},
   roofs R2C1={1,2,3}, R2C5={1,2,4}; real cells R2C3={3,5}, R2C7={5,6}, R2C8={6,7},
   R2C9={7,8}, R2C10={8,4}. Here k=5 and D={3,4,5,6,7,8}, targeting the other row-2
   cells outside the roofs/real cells. SA2's finite in-memory check was null at cap 4 and found it
   at cap 5 in **41 units**. These are constructed finder/proof witnesses, not GH sources or
   independently certified unique-puzzle fixtures; keep the real unique subtype fixtures too.
   Test the larger complete witness and its capped prefix, retaining deterministic truncation
   and all existing soundness populations/firing minima. Adapt the mutations to catch a restored
   cap of three or four, rather than treating wider R14 coverage as a defect.

   **Survivor dispositions on the pre-E source:**
   - **#13 is equivalent there:** admitting five extras at the outer guard still cannot pass the
     inner <=4 pool filter or the k<=3 loop starting at |E|-1. It does not justify the cap. Retire
     or adapt that obsolete mutation after removing the cap, preserving its original result.
   - **#35 is equivalent:** `> k+1` was already rejected, so a later `>= k+1` is the same as `===`.
   - **#34 is not universally equivalent on the advertised constructed/partial-unit test surface.**
     Reuse the synthetic partial unit P1={R1C1,R2C4,R3C3,R5C6}. Set floors R1C4/R2C1={1,2},
     opposite roofs R1C1/R2C4={1,2,3}, real R3C3={3}, and all other masks full.
     The original returns null; changing the leaf equality to `<=` returns Type 3 with
     `partDigits:[3]` and removes 3 from R5C6. Old Type 2 does not intercept opposite roofs,
     and no smaller k is searched. SA2 verified both outcomes in memory. Add this wrong-union
     negative and require the mutant to fail. This state is contradictory, not a demonstration
     of unsoundness on a valid unique puzzle: the issue is the claimed universal equivalence
     and the explicit exact-union contract. Keep the equality guard in production.
4. **Work policy: accept the implementation, correct the report.** One unit is a tested Type 3
   pool-cell extension (including rejections) or a tested Type 4 link digit. Keep 50,000, the
   local counter, entry/every-256 parent checks, seam and second-pass-only observer. A local
   work-cap exhaustion returns null with `capHit:'work'`; a spent parent budget in pass 2 returns
   null with **`capHit:null`**, and the caller's budget remains spent. Current code/tests already
   distinguish these; do not change them to match the question's wording. Cancellation and
   other errors propagate without an observer record. Preserve the old pass's own checks/errors;
   a pass-1 Finding and `assumeUniqueness:false` still emit no second-pass work.
5. **Units: accept.** Type 3 needs all-different cells, not completeness; Type 4 needs an actual
   complete unit (`ctx.completeUnits[u] === 1`) and the true two-holder link. Shared-unit roofs
   need not have an added side restriction. Keep every swap guard and the cage/inequality ban:
   a test-only partial unit does not authorize UR on Killer.
6. **Fixtures: accept.** Keep four current real unique positives (3,4,1,2), the two negatives and
   three supplements, with exact Findings and independent uniqueness/completion evidence.
   Recheck them against the corrected search, refreshing only affected current data. Preserve
   `historyV2`, historical preprocessing and the generic soundness populations/minima.
7. **E: full scope, after corrections; no extra reachability gate.** Recheck focused suites,
   relevant mutations, 26-reference R20, pattern cost, structural/work evidence and affected
   current pins on the corrected source. Keep cap-3 measurements as preliminary history, not
   validation of the corrected search; no mandatory new 30,000/20,000 reachability campaign.
   Correct the current reach statement: (146+332)/5,118 is **9.34%** for new types 3/4;
   **20.0%** includes all four types, (452+95+146+332)/5,118.
   Then freeze and run all five G09-G13 wires, fourteen G01-G14 analyses and 520 hashes,
   with wires published/checked before analyses. Revalidate projections; 187/292/1,278 seconds
   are phase totals, not payload permissions. IR12 admission, 450 s compound admission,
   540 s process-tree ceiling and 15 s gaps stay. Explain each output change under R20/IR72,
   complete both quick sets and CI under the projection-maintenance rule. Actual cap/latency
   findings become named items; neither the work limit nor a required gate is silently waived.
8. **GH: accept both defaults.** MS11a owns every affected old example, including Remote Pairs
   from `testkit-4242-254` and Long Forcing Chain. IR72 H1 requires own-source replay first,
   then another real catalogue source if needed; record failed attempts, candidates, selection
   and truthful old/new provenance. RP-01/S-OD9 fixes the prior and normal-hint contract, not
   a permanent puzzle identity; do not rerun MS10a's special gate or relabel its corpus index.
   Keep this task's narrower eight-puzzle source command, <=400 hints and <=8-minute deadline.
   If discovery is needed, use B's at-most-four distinct batches, each at most twelve attempted
   requests (eight is permitted), across the task, starting classic9 master/nightmare; failed
   attempts consume the allowance. Stop with `QUESTION:` if it cannot supply the required real
   example. No fabricated snapshot, earlier-technique suppression or weakened replay assertion.
   Keep the existing unchanged UR example: there is one example per ID, not per subtype.
   No Type 3/4 catalogue replacement or extra discovery is required while it still replays.
   Real unique fixtures and localized subtype-render tests cover the added forms. After the
   corrected source, recheck all IDs, refresh every affected one and finish complete GH.

## Files to create/modify

- Wing engine/suite; B's current UR fixtures, reference expectations, both apps' locales/help/tests,
  real existing-ID example if affected, notes; E generated fixtures.
- Generator/Player technique designs and both user/developer guide languages.

## Implementation steps

1. Retain the old pass and all swap guards.
2. Implement bounded virtual-subset and conjugate proofs; never assign an extra to both roofs.
3. Add a real uniquely solvable positive per subtype, exact Findings and near-miss regressions.
4. Add subtype explanation keys/descriptions in both apps/languages; preserve catalogue count.
5. Record reference changes, cost, E/GH and quick acceptance.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS11a-B01 | New UR subtypes use a genuine uniqueness argument and meaningful explanations |
| MS11a-B02 | Old types and historical evidence are not silently replaced |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS11a-T01 | Virtual-member/conjugate/geometry/uniqueness negatives pass |
| MS11a-T02 | Old type priority, ID/cost/order, exact subtype keys and state purity hold |
| MS11a-T03 | E/GH/cost, current references and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor,tech-chain`;
Player `--suite=play,i18n,help,help-example-tools,tech-chain,tech-wing,techniques`; both quick sets.
Complete E MS11a:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS11a\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS11a\analysis\G01.json
node tests\pattern-cost.js --ids=uniqueRectangle --runs=20 --json=..\docs\difficulty-v3\evidence\MS11a\pattern-cost.json
```

Player GH, existing real source or B's bounded classic9 master/nightmare replacements:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11a\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11a\sources.json --max-puzzles=8 --max-hints=400 --check
```

Jobs 1/no --jobs; E 10-90 minutes, cost 1-60 seconds, curated GH 1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
At most one evidenced limit change for this new subtype search; 540-second process ceiling.

## Definition of done & handoff

Hand MS11b the ordered subtype dispatcher and guards. Catalogue still has one uniqueRectangle ID.

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
