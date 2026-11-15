# MS08b — Two-string kite

| Header | Value |
|---|---|
| Depends on | MS07f accepted (after MS08a); S-OD8 serial CI-manifest handoff |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M8b |
| Authority | R10/R11/R20/R21 |
| Status | Not started |

## Goal & business context

Recognize the row-column kite as a named short proof, without confusing a shared cell or incomplete
unit with a conjugate pair.

## Scope

In: kite and full B integration. Out: empty rectangle, finned fish, weights/offers outside this ID.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Both locale pairs, real fixtures/help, CRLF and E.

## Inputs & context

Use MS08a's accepted technique template after MS07f's approved quick-tier move. Preserve that
move and its current r6c manifest; do not restore the three ratio cases or the two mega16 replay
requests to quick coverage. MS07f precedes this task so the two developers never edit the
manifest concurrently. MS18e owns their named final-source manual checks.

R11, verbatim:

> A complete-row conjugate pair and complete-column conjugate pair, four distinct cells. One
> endpoint of each is in the same box and conflicts; at least one remaining endpoint is d.
> Targets see both remaining endpoints.

Register `twoStringKite`: fish, order 114, weight 340, baseCost 34, unscoped, no uniqueness assumption.
Finding: `{technique,cells,placements:[],eliminations,i18nKey,i18nArgs}` with
key `technique.twoStringKite.step`, args `{digit,lines:string[],bridge:string[],ends:string[]}`.
All lists are owned/sorted/deduplicated; labels are strings, digit remains numeric.

Use complete units and existing unambiguous owner tables. Check all four cells distinct, both
bridge endpoints in the same real box, and all target peer obligations. No box => no pattern.
Bound tested pair/orientation extensions at 50000, entry/every 256 budget checks, per-call reset,
MS07a work callback; cancellation propagates.

Geometry vector: digit 5 row R2 pair C1/C8, column C2 pair R1/R7. R2C1/R1C2 share box;
remove 5 at R7C8. Negative: shared endpoint, missing box link, incomplete row/column, target seeing
only one free end. Include transpose and ambiguous multigrid ownership.
Baseline: `core/js/engine/tech-fish.js:56-125` (owner tables), `:309-335`
(`function findStrongLinks`); current fixture contracts at `core/tests/suites/techniques.test.js:91-107`.

## Files to create/modify

- Fish engine/suite; full B (current fixtures/registry/weights/references, both apps' locales/help,
  generated real example, notes) and E.
- Generator design 6.6, Player hint design, both language user/developer guides.

## Implementation steps

1. Reuse safe geometry; enumerate row/column conjugate pairs and both bridge choices.
2. Add vectors/negatives and two real positive exact Findings plus a negative.
3. Ship registration, weight, locale/help and current reference changes together.
4. Capture bounded cost/E/GH and run both quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS08b-B01 | A genuine kite is named and explained instead of over-rated |
| MS08b-B02 | Invalid geometry never creates a deduction |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS08b-T01 | Distinctness, complete units, box conflict, both target peers and transposes tested |
| MS08b-T02 | B, exact Finding fixtures, completion checks and deterministic work pass |
| MS08b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `--suite=tech-fish,techniques,technique-weights,difficulty-floor`; Player
`--suite=help,play,i18n`, then both complete bounded quick manifests (whole runs only if projected <=450 s).
Complete E with MS08b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS08b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS08b\analysis\G01.json
node tests\pattern-cost.js --ids=twoStringKite --runs=20 --json=..\docs\difficulty-v3\evidence\MS08b\pattern-cost.json
```

Player GH:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=twoStringKite --sources=tests\artifacts\difficulty-v3\MS08b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=twoStringKite --sources=tests\artifacts\difficulty-v3\MS08b\sources.json --max-puzzles=8 --max-hints=400 --check
```

Use B's existing colour/chain sources then bounded classic9 hard/expert discovery. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-30 seconds, curated GH 1-120 seconds; discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Own limit can change once with evidence; no other task's limit is tuned.

## Definition of done & handoff

Supply source/proof/limit records and any reference changes; nothing is left to a later cleanup task.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and the generic soundness/order-invariant suites,
not routine analyst cross-review. Stop for correctness/evidence corruption or changing a recorded
decision; performance/availability is a named numerical item for MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list and actual B/T, coverage and CI outcomes.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (orchestrator check against IR72 A-J; outside the analyst review set). The developer's own reading of "box" was routed to the pack author (SA2), who ruled (b): a fix round followed before commitment |
| Start | 2026-11-15 17:19:18 (+07:00), base `75b99e6` |
| End | 2026-11-15 19:08 first pass; 19:15-19:19 SA2 ruling; fix round 19:19:12-20:34; orchestrator re-check and commit |
| Duration | 3 h 4 min developer (1 h 49 min first pass + 1 h 15 min fix round); about 4 min SA2 ruling |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 ruling); claude-opus-5.5 (orchestrator) |
| Token usage | 539 model calls; 211,164,942 input tokens (209,615,762 cache reads); 531,371 output tokens |
| AI credits | about 3,015 (developer) |
| Verification | `twoStringKite` in `core/js/engine/tech-fish.js` (fish group, order 114, base cost 34, unscoped, `assumesUniqueness: false`), `WEIGHTS.twoStringKite = 340` in `generator/js/engine/difficulty.js`. Pattern: a complete row and a complete column, whole-line disjoint, each holding the digit in exactly two cells, with one cell of each in the same complete box-like unit (`kind` `box` or `region`); each bridge cell has exactly one complete box-like owner counted across both kinds and the owners match (an overlapped multi-grid box bridges nothing); the digit leaves every real peer of both ends. Limits: 50,000 units per call, parent budget at entry and at most every 256 units (pinned at 0, 256, ... 1,792), spent limit gives `null` with `capHit: 'work'`; structural maximum 729 on 9x9 and Jigsaw 9, 6,561 on Samurai (largest), 0 on Butterfly. Shared helpers with Skyscraper: identical on 2,336 states (differential). `tech-fish` 155 -> 236 tests: vector and transpose, near misses, independent `referenceKites` enumeration on every grid shape, Jigsaw 9 firing coverage (minimum 20 per 120 states; 28 and 31 observed), multi-grid ownership negative on the real Samurai; 20/20 mutations detected (incl. box-only eligibility). **E** (complete, wires -> analyses -> hashes; pass 1 and pass 2a kept): 18 of 520 hashes changed (classic9 hard 1, expert 3, master 2, nightmare 1; diagonalX nightmare 6; hyper hard 1; jigsaw9 master 4), no key below Hard; wires G10 (work counters only) and G11 (957 -> 994); analyses G01 (jump now Two-String Kite 47 -> 593 at R2C4; final 925 unchanged), G05, G06 (2,329 -> 2,327), G07 (a different dug puzzle), G11, G14. Reference ratings: no level or `v3Expected` change; four ratings change by 1-13 points. Help catalogue 30 examples (`twoStringKite` new; `hiddenTriple`, `xWing` regenerated from their own sources; `simpleColouring` moved), `--check` 30/30. Quick sets on the final tree: Generator 3,651/3,651 (303.4 s, sum of the four group walls; +2.3 % against S-AV08's 296.670 s for +2.6 % tests), Player 1,897/1,897 (38.1 s); fingerprints match the tree; CI check passes. Orchestrator: locked gate suites 496/496 (`tech-fish` 236, `techniques` 204, `technique-weights` 8, `difficulty-floor` 48; 38.5 s); CI shard check 3,651 |
| Acceptance | MS08b-B01, B02, T01, T02, T03 met; IR72 A-J pass (A design §6.6 and the reference enumeration on every shape incl. Jigsaw; B weight and reference ratings; C limits and structural maxima; D positives, negatives, sweep; E bilingual docs and totals; F 20/20 mutants; G complete E; H 30/30 help; I pins refreshed with before/after values; J fingerprints) |
| Issues & resolutions | **Box reading (fix round).** The developer read "real box" as `kind === 'box'` only, so Jigsaw had no kite; the engine treats regions as box-like (`model.js`, `tech-wing.js`). SA2 ruled (b): box-like = `box` or `region`; the overlapped-box restriction stands as a conservative ownership rule. The finder, the reference enumeration, the tests (Jigsaw firings, multi-grid negative, a box-only mutant), the structural bounds, complete E, help, wording ("box or region" / "hoặc vùng"), design §6.6, guides, notes and evidence were redone. The first fix-round Player quick run failed (the Player's own `jigsaw9` layout differs from the Generator's); the suite now writes the Generator layout and its transpose and checks the environment's layout for agreement only; the failed run is kept. E was recorded twice in the fix round because the recorders hash the locale files, which changed after the first recording. A late `generator/design.md` edit in the first pass required one more Generator quick run (fingerprint). No new S-AV item |
| Handoff | To MS08c: the shared fish helpers (Skyscraper and Two-String Kite) and their reference enumerations; box-like units are `box` or `region` with the single-owner rule; IR72 A-J is the checklist; base quick totals Generator 3,651 (303.4 s) and Player 1,897 (38.1 s); help catalogue 30 |
