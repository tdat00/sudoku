# MS10b — WXYZ-Wing

| Header | Value |
|---|---|
| Depends on | MS10a accepted |
| Size / active time | Medium; 45-60 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M10 complete |
| Authority | R10/R13/R20/R21 |
| Status | Not started |

## Goal & business context

Add the bounded four-cell capacity proof, correctly classed in Master rather than Expert.

## Scope

In: WXYZ-Wing and B. Out: ALS families, uniqueness, changing other finder limits or level bands.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Both languages, real help, current/historical separation.

## Inputs & context

R13, verbatim:

> Four open cells with candidate union of four digits. Exactly one digit z is non-restricted;
> for each other digit, every pair of its occurrences in the four cells is mutually visible.
> If z were absent, four cells would need three digits each usable at most once.
> Remove z only from external candidates seeing all z occurrences.

Register wxyzWing: wing/order 155/weight 800/baseCost 57, unscoped, assumesUniqueness=false.
1.25*800=1000 is not below Expert's upper edge, so the tier is Master.
R10 Finding; key `technique.wxyzWing.step`, args `{digits:[...],digit:z,cells:string[]}`.
Use all-pairs visibility per restricted digit and every z occurrence for a target, not a convenient
pivot-only test. Canonical quartet order, sorted owned output, limit 50000 combination extensions;
entry/every 256 checks and per-call metrics. No all-cell numeric mask.

### Pre-E rulings — SA2, 2026-11-16

These fix the implementation details under R10/R13/R20 and IR72, not a new prior, plan exception
or gate. Registration remains 155/800/57, wing / Master / unscoped / no uniqueness.

1. **Finding arguments: accept A.** `digits` is the complete four-digit candidate union, ascending
   and including z; `digit` is z. Argument `cells` contains the four labels in ascending cell-index
   order. Finding `cells` contains those four indices, `placements` is empty, and eliminations are
   sorted by cell with digit z only. Return the first lexicographic quartet with removals and all
   its targets. Do not substitute only the three restricted digits in `digits`.
2. **Literal scope: accept A.** Four distinct open cells, each with a nonempty mask of 1-4
   candidates, union exactly four, exactly one non-restricted digit, all-pairs real-peer visibility
   for each other digit, and external targets seeing every z occurrence. Add no pivot, connectivity
   or two-candidate minimum. Without z the four cells would need three digits each usable at most
   once; this proof does not depend on those extra restrictions. Cage-only peers count; layout rows
   are not peers. Keep the 3,000-position census as sampled evidence, not proof of universal
   equivalence. Its `disconnected` predicate detects a cell sharing no digit with the other three,
   not general graph connectivity; label it as that isolated-cell test. No new scope scan is required.
3. **Work unit and limit: accept A, keep 50,000.** One unit is one eligible open cell tested as
   the next member of a partial quartet, including its first member. Charge rejected extensions
   (union >4 or a second non-restricted digit); the target scan belongs to the completing extension.
   Keep the deterministic prefix, local counter, entry/every-256 parent checks, seam and observer.
   A witnessed complete Finding before exhaustion is valid; `null` with `capHit: 'work'` is not
   proof of absence. Retain the exact 4-versus-3-unit witness boundary and exhaustion tests.
   No limit adjustment or structural-maximum-sized default follows from these findings.

   Carry **S-AV33, WXYZ-Wing bounded-prefix coverage/cost**, to MS18d and the MS18e audit.
   The first census has 7,168 sampled calls, two capped (Samurai: one of twelve for each of seeds
   4242 and 777), and a separate 17 constructed calls, fifteen capped. Sohei is **0/24 capped**,
   maximum 42,542 units; do not describe it as an observed cap hit. Keep sample rates, constructed
   floods, structural bounds and per-call latency separate. A cap hit alone does not establish a
   missed deduction; the equal-{1,2,3,4} flood has no WXYZ-Wing and, on boards with more digits,
   is not a valid solvable puzzle. Correct any comment calling that flood a lost deduction.
   The current Killer census uses `H.model('killer')`, and the structural row has 27 units:
   label it uncaged, not assembled-cage evidence. The cell-count-only crude bound remains an
   upper bound; it does not turn the uncaged flood/census into caged observations.
   Keep these preliminary records and report the already-planned final census/cost on its named
   source, with capped-state indices and actual populations; no additional gate or benchmark campaign.
4. **Effect and E: proceed without an extra gate.** WXYZ's measured reach and the size of the
   output change do not alter its prior or import MS10a's special reachability gate. Complete the
   five wires, fourteen analyses and 520 hashes, review every changed key and refresh current pins
   like for like from recorded outputs. The 41 preview failures are not passes until that work
   and the final checks finish. Phase projections (156/261/1,233 seconds) are totals, not permission
   for a long payload: each IR12 item/compound still needs its own credible admission and <=540 s.

   **R20 correction to the proposed stop:** a causally explained, correctly computed reference
   level or requiredness change is an authorized reclassification, not an automatic `QUESTION:`.
   Preserve historical v2/external labels, record before/after v3 labels/requiredness and the cause
   in this task's evidence/notes, and evaluate requiredness at the stated v3 level. Do not fit
   weights or preserve an obsolete current pin. An unexplained change or incorrect exact/warning
   result needs investigation and `QUESTION:` before dependent publication. An unexpected GG
   hash change for a request below Master likewise needs `QUESTION:`/investigation, not a blind
   hash refresh. A changed example for a lower-order technique on a harder puzzle is not such
   a below-tier hash change.

   **GH source replacement is allowed by IR72 H1.** First replay the old ID's own source. If it
   no longer yields the ID, use another real source from the catalogue and record the candidates,
   choice and actual normal-hint replay; the own-source preference is not a permanent source lock.
   Keep the initial 34-ID check, both trial logs, old/new provenance and final 35-ID check.
   The five replacements (nakedPair, finnedXWing, xyzWing, uniqueRectangle, forcingChainLong)
   follow this authorized route; do not fabricate snapshots or weaken replay. The new ID retains
   this task's eight-source curated bound. Finish complete GH, both quick sets, guides/designs/notes
   and CI; apply check-list section 2's `c160bb4` projection rule and actual Player 900 s limit.

Vector: A=R1C1{1,4}, B=R1C5{1,2}, C=R1C9{2,3}, D=R5C9{3,4}.
Only 4 is non-restricted; R5C1 sees A/D and loses 4. Add 1 to D to make a second non-restricted digit:
reject. Add 4 to B while target misses B: no target elimination. Also test union size !=4.
Baseline `core/js/engine/tech-wing.js:130-249` (`function findXyWing` / `function findXyzWing`).

## Files to create/modify

- Wing engine/suite; full B/E, current reference data/notes and applicable designs/bilingual guides.

## Implementation steps

1. Bound quartet enumeration and prove restricted/non-restricted classification explicitly.
2. Add capacity/visibility negatives, two real exact-Finding positives and a negative.
3. Register/integrate; document Master membership from the unchanged weight rule.
4. Record bounded cost/reference changes, E/GH and quick results.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS10b-B01 | WXYZ is a genuine four-cell proof and receives its fixed Master prior |
| MS10b-B02 | No target is eliminated by overlooking a z occurrence |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS10b-T01 | Cardinality, all-pairs restriction and every-target-peer tests pass |
| MS10b-T02 | B, independent completion checks, state purity/caps/cancellation pass |
| MS10b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Full E MS10b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS10b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS10b\analysis\G01.json
node tests\pattern-cost.js --ids=wxyzWing --runs=20 --json=..\docs\difficulty-v3\evidence\MS10b\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=wxyzWing --sources=tests\artifacts\difficulty-v3\MS10b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=wxyzWing --sources=tests\artifacts\difficulty-v3\MS10b\sources.json --max-puzzles=8 --max-hints=400 --check
```

Prefer existing wing/chain sources, then bounded classic9 master/nightmare. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-30 seconds, GH 1-120 seconds curated/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
One evidenced own-limit adjustment maximum; 540-second process ceiling.

## Definition of done & handoff

M10 completes with both named IDs integrated, no weight fitting, and the capacity proof recorded.
Return the inherited/new item list, including S-AV33's final-source cap/cost evidence and S-AV08's
quick-cost growth. Preserve the pre-E record/logs as preliminary history, not final-source validation.

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
| Status | Accepted (orchestrator check against IR72 A-J; outside the analyst review set). The developer stopped before E with four questions; SA2 accepted all four defaults with reporting corrections, corrected the stop rule (an explained reference reclassification is not a stop), allowed the five help-source replacements under IR72 H1 and reserved **S-AV33** (`c8f0006`). Three pin decisions after E were accepted by SA2 without reruns |
| Start | 2026-11-16 08:13:25 (+07:00), base `c928472` |
| End | 09:05 stop before E (4 questions); 09:20 SA2 ruling (`c8f0006`); 10:20 final report with three pin questions; about 11:34 SA2 acceptance (relay delayed while the orchestrator waited on an owner question for the pentomino pack); orchestrator re-check and commit at about 11:40 |
| Duration | About 1 h 52 min developer (52 min to the questions, 1 h after the ruling); about 15 min for the first ruling and about 1 h 15 min waiting for the pin acceptance; 50+ locked commands, lock waits a few seconds in all |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 rulings and pack amendment); claude-opus-5.5 (orchestrator) |
| Token usage | 369 model calls; 135,974,927 input tokens (134,053,546 cache reads); 471,725 output tokens (developer) |
| AI credits | about 2,293 (developer) |
| Verification | `wxyzWing` in `core/js/engine/tech-wing.js` (group `wing`, order 155, base cost 57, weight 800: Master tier, 1.25 x 800 = 1000), unscoped, `assumesUniqueness: false`: four distinct open cells of 1-4 candidates, union of exactly four digits, exactly one non-restricted digit z, all-pairs peer visibility, z removed from outside cells seeing every z cell; Finding args `digits` (the four-digit union), `digit` z, `cells` labels ascending; 50,000 extension units per call, seam `SG.wingSearch.wxyzWing`. Reach (seed 4242): 3,522 of 30,000 positions after the techniques below it (11.7 %), 3,323 of 20,000 complete solves (16.6 %; hardest in 1,057). Focused gates Generator 627/627, Player 161/161, shared 666/666; 56/56 mutants; 70 new finder tests. **E** on frozen bytes: wires G10 and G13 (dig path), analyses 9 of 14, **36 of 520 hashes changed**, all in the four admitting cells (`classic9/master` 13, `classic9/nightmare` 6, `diagonalX/nightmare` 7, `jigsaw9/master` 10), the same 36 with and without the technique, none below Master; merge-checks pass. R20: four scores change (golden-nugget 5,689 -> 5,681; constructed-nightmare-1 2,743 -> 2,739; -2 2,633 -> 2,661; -3 2,652 -> 2,565), no level, requiredness, hardest or `v3Expected` change. GH: `wxyzWing` from Nightmare 13 step 37 through `game.hint()`; seven examples refreshed from their own sources, five moved to other real sources (IR72 H1); catalogue 35/35. Pins refreshed from recorded outputs; three pin decisions (flat new-hardest case on G13 position 101, unfinished-check witness from G10 details step 36, three same-stream `tech-chain` replacements) accepted by SA2. Quick sets: Generator 4,097/4,097 (390.0 s), Player 2,338/2,338 (63.8 s); core-shared projection 80 -> 90 s; fingerprints match; CI check passes. Orchestrator: locked `tech-wing,tech-fish,tech-chain,techniques,technique-weights,difficulty-floor` 1,217/1,217 (69.4 s), Player `help,help-example-tools,play,i18n` 212/212 (8.7 s), CI shard check 4,097 of 4,097 |
| Acceptance | MS10b-B01, B02, T01-T03 met; IR72 A-J pass (developer's table with evidence pointers in `docs/difficulty-v3/evidence/MS10b/evidence.md` section 10) |
| Issues & resolutions | **S-AV33** "WXYZ-Wing bounded-prefix coverage/cost" (two capped Samurai calls of 7,168 sampled; Sohei 0/24, max 42,542; 15 of 17 constructed floods capped, none containing the pattern; Killer census uncaged) routed to MS18d/MS18e. The developer's focused gate omitted `tech-chain` and `help-example-tools`, so the first quick runs failed on both (kept as `quick-final/`); after the pin refreshes the second runs passed (`quick-final-2/`). G13 took another dig path, which removed the recorded flat new-hardest position and the unfinished-check witness; replacements accepted by SA2. Not run: the manual `difficulty` suite (pure assertions evaluated by script), qualification, soak |
| Handoff | To MS11a: the wing group holds `remotePairs` (116) and `wxyzWing` (155, Master); IR72 A-J is the checklist; include `tech-chain` and `help-example-tools` in the focused gate whenever help examples or chain fixtures can move; base quick totals Generator 4,097 (390.0 s) and Player 2,338 (63.8 s); help catalogue 35; S-AV01-S-AV33 open as recorded; ask before E |
