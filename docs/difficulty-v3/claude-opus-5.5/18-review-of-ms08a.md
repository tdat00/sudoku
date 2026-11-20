# 18 — Implementation review of MS08a (Skyscraper; the technique-task template)

Reviewer: SA1 (claude-opus-5.5), 2026-11-15. Review set: S-OD4 analyst review of MS08a and of its template.

Scope: HEAD `7ab77b1` plus the uncommitted MS08a tree (31 tracked files), its evidence
(`docs/difficulty-v3/evidence/MS08a/`) and the scratch of both apps (`generator/tests/artifacts/difficulty-v3/MS08a/`,
`player/tests/artifacts/difficulty-v3/MS08a/`).

Against: `tasks/difficulty-v3/MS08a-skyscraper.md` (template items 1 to 8, B01-B02, T01-T03, the test plan), R10,
R11, R20 and R21 (`docs/difficulty-v3/report-detailed.md`), S-OD4, the IR12 compound rule (check-list), my IR52
(strict 256-unit gate), IR54 and IR55, and the next task, `tasks/difficulty-v3/MS07f-quick-tier-move.md`.

Method: read-only. I read every diff against HEAD and recomputed what can be checked without generating:

- the 520 regression hashes, key by key, against HEAD's fixture;
- the level specs of the changed and the unchanged keys (Killer included), by loading the engine in Node;
- the largest number of tested pairs per call on every registered variant;
- both quick fingerprints of the working tree, with the runners' own fingerprint code;
- the IR12 admission arithmetic over the 246 recorded E items of the two passes;
- UTF-8 without BOM, CRLF, trailing whitespace and the 110-character engine rule on all 31 files.

These were small Node scripts in a scratch folder that I removed afterwards. I ran no test, tool, generation or
timing, and changed nothing except this file.

## 1. Verdict

**Accept.** One binding fix, evidence only (IR68: two passages of `evidence.md`, outside both quick fingerprints, no
rerun). No correctness, evidence-corruption or recorded-decision finding, and no Major.

- IR67 (Minor): the quick-set totals stated in the guides and designs are stale (Generator 3,505, now 3,563; Player
  1,749, now 1,807). Routed to MS07f, which edits these sections next; no change to MS08a.
- IR68 (Info): the evidence names a stale base commit and mixes two timing conventions.
- IR69 (Info): "disjoint" is read as whole-line disjointness, stricter than X-Wing's ownership rule. Accepted; the
  template fixes the rule for the later fish tasks.
- IR70 (Info): the rulings on the developer's five points: all accepted.
- IR71 (Info): what MS07f inherits from MS08a.
- IR72: the technique-task template checklist, binding for MS08b and the later technique tasks.

The five points in short:

1. **Pin refreshes outside the explicit file list: in scope** (template item 6, "refresh affected current references
   with reasons"). Every new value comes from a record, no matcher was loosened, every specimen premise is
   re-asserted.
2. **`.github/scripts/generator-quick.json`: accepted**, information only; no group, suite or projection changed.
3. **The manual `difficulty` suite, edited and not run: accepted**, as in MS07b and MS07c.
4. **`lines` = the two base lines and `ends` = the two free ends: correct.** The brief itself calls them "the two
   non-aligned ends", and MS08b's contract uses `ends` the same way.
5. **The IR12 compound rule: applied correctly** (section 2.8).

## 2. What holds

### 2.1 The proof and the finder (R11; template items 1 to 3; T01)

- The finder (`collectLinkedLines`, `skyscraperOf`, `scanSkyscraper` in `core/js/engine/tech-fish.js`) is the brief's
  proof and nothing wider. A base line is a complete row or column that is disjoint, has no *d* placed and exactly two
  open *d* cells, each with exactly one cover line from the fish module's ownership tables. Nothing is computed from
  cell indices.
- `skyscraperOf` counts the shared covers over the four root pairs. Two cells of one line never share a cover line,
  so the count is 0, 1 or 2. Exactly one makes a pattern, and then the two ends lie on different covers. Two is the
  X-Wing, left to `xWing`.
- A target is an open cell with the candidate that is a real peer (`model.peers`) of both ends and is neither a root
  nor an end. Leaving out a root that sees both ends is conservative and matches R11's "external candidates"; the
  near miss "a root that sees both ends" pins it.
- Eliminations are sorted and deduplicated, `cells` and `ends` are ascending, `lines` are in line order, every array
  is new per call, and the state is only read (the immutability test changes a Finding and calls again).
- Soundness needs only three facts: the base lines are complete (each holds *d* once), the shared cover is complete
  (the roots see each other), and targets are real peers. All three hold on every model. The finder is therefore sound
  on every variant, scoped or not, and it assumes no uniqueness.

### 2.2 Work, budget and cost (R10; template item 3)

- One unit is one tested pair of base lines, the limit is 50,000 per call and the counter is local. `spend` checks the
  parent budget before the unit that would carry the work since the last check over 256 (IR52's strict gate); the
  entry check sits inside the same `try`. The cadence test pins the exact checks (0, 256, ..., 1,792: eight for
  1,920 units), and mutation 4 (one unit early) is caught by it.
- A spent budget is swallowed as "nothing found" with `capHit: null`, and the test shows that the caller's budget
  still fails afterwards (IR55). Cancellation and every other error propagate with no observer record, exactly as the
  chain finders' `measured` does.
- A spent limit throws the private `WORK_CAP` and ends with `null` and `capHit: 'work'`. It never yields a finding:
  the tests use limits 0, 1, 100 and 1,919 on a 1,920-unit flood; a limit of exactly 1,920 has no cap.
- The seam takes an absent limit as 50,000 and floors a finite limit of at least 0. Anything else (`null`, `Infinity`,
  `NaN`, negative, non-number) is `solver.invalidOption`. Unlike the chain seam (IR54: `null` unbounded for the legacy
  IDs), there is no unbounded mode, which is right for a new finder under R10.
- The structural maximum is far below the limit. My count of the tested pairs per call for every registered variant:
  - classic9 and the other 9 × 9 boards 648, mega12 1,584, mega16 3,840;
  - Samurai 6,318 (the largest), Sohei 2,754, Flower 270, Butterfly 0.

  The limit can never bind on a registered board, and design §6.6's "binds on no real board" is true. The pattern
  cost is 3, 21, 74 and 37 units, nothing capped, and the limit was not adjusted.

### 2.3 Registration, weight and tier (template item 2; B02)

- `define('skyscraper', 33, 112, ...)` gives group `fish`, `variantScope: null` and `assumesUniqueness: false`.
  `WEIGHTS.skyscraper = 330` sits between `xWing` 320 and `simpleColouring` 360, so the registry stays monotone.
- The specs, by loading the engine:
  - classic9 Normal does not allow it;
  - classic9 Hard allows it and has it in its tier, and classic9 Expert allows it (as a floor technique);
  - Killer Hard and Greater-Than Hard allow it and have it in their tier;
  - Jigsaw 9 Master allows it;
  - Mega 12 Normal does not allow it.
- References (`rated-effect.txt`): of the 26 puzzles, four ratings change and no level or `v3Expected` entry changes,
  so `rated.js` needs no edit. The three constructed Hard puzzles become skyscraper-rated: 560 → 475, 563 → 521 and
  554 → 515; `constructed-nightmare-3` goes from 2,642 to 2,653. No offer changes.

### 2.4 Fixtures, soundness and tests (template item 4; T01, T02)

- `CURRENT.skyscraper` has two real positives with exact Findings, each with a unique solution: rows on
  `constructed-hard-1` and columns on seeded puzzle 26. Each test checks the eliminations against the solution and
  that the reduced state still completes. There are two negatives: nothing is left after the technique itself, and a
  genuine X-Wing before `xWing`. The `after` lists are explicit copies (`BELOW_SKYSCRAPER`, `THROUGH_SKYSCRAPER`,
  `BEFORE_XWING`), and `historyV2`, `LADDER` and the v2 positions are untouched.
- `SUPPLEMENTS.skyscraper` adds three real positions on top of the unchanged random sweep, which fires the technique 65
  times in 300 states; `minFirings` is unchanged.
- `tech-fish` gains 49 tests. Every geometry case is first checked against an independent enumeration
  (`referenceSkyscrapers`), which is built only from `model.units`, `cellUnits`, `unitMeta` and `peers`, not from the
  finder's tables. The cases are:
  - the R11 vector and its transpose, and ends in one box;
  - every near miss of the brief in both orientations, and the X-Wing boundary in both orientations;
  - incomplete base and cover lines, and a multigrid-ownership negative;
  - digit and orientation order, determinism and immutability.
- Agreement is checked field by field (digit, cells, eliminations, lines, ends) against the enumeration's first
  removing pattern on classic9 (seeds 777 and 99), classic6, classic4, 12 and 16 digits, diagonalX, hyper and Jigsaw 9,
  each with a minimum number of firings.
- Mutations: 10 of 10 are detected, each listed with its failing tests. The first-source run is kept.

### 2.5 E: hashes, wires and analyses (template item 6; T03)

- My recount: 26 keys, 520 hashes, 66 changed, exactly the developer's list and the before-write check. The changed
  keys and seeds are:
  - `classic6/hard` 2 (34, 610);
  - `classic9/hard` 8, `classic9/expert` 8, `classic9/master` 10 and `classic9/nightmare` 5;
  - `diagonalX/nightmare` 9, `hyper/hard` 7, `jigsaw9/master` 8 and `greaterThan/hard` 9.
- Mechanism. Among the generation sources, only `tech-fish.js` and one line of `difficulty.js` changed; the locales
  and the Player catalogue do not generate. Every changed key's level allows the technique, and none of the 16 keys
  below Hard changed.
- The converse does not hold for one key. `killer/hard` admits the technique (allowed, in the Hard tier) and keeps its
  20 hashes; nothing requires a change, and S-OD7 now hides Killer Hard.
- Protocol:
  1. A merged check before writing listed the 66 changes (exit 1, kept).
  2. `--update-hashes` wrote them from the merged ledgers, with nothing generated.
  3. After the comment re-wrap, a complete second pass on the final source passed all checks with no diff: wires 5 of
     5, analyses 14 of 14, hashes 520 of 520 "recorded from the current sources".

  Wires came before analyses and analyses before hashes. The first pass is kept whole in `e-source-1/`.
- Wires G09, G11 and G12 and analyses G01, G04, G06, G11, G12 and G14 changed. G01, the example of the guides, is
  another puzzle (925, the jump 47 → 621), and the guides and the design follow it in both languages.

### 2.6 GH, locales and the Player (template item 5; B01)

- Both apps have the EN and VI name, description and step, with the same keys and placeholders (`{digit}`, `{lines}`,
  `{ends}`). The VI name, "Skyscraper (nhà chọc trời)", follows the fish names ("X-Wing (cánh X)", "Swordfish (cá
  kiếm)").
- The catalogue has 29 examples. `skyscraper` comes from the brief's first-choice source (the `simpleColouring`
  source, Hell 1 seed 214, step 33). I checked the example: rows R6 and R7 with roots on C7, ends R6C5 and R7C4, and
  targets R5C4 and R8C5, each of which sees both ends.
- Five old IDs were refreshed: four from their own sources, and `xyzWing` from another real source of the catalogue
  (Nightmare seed 11). Every write was bounded (at most 16 puzzles and 400 hints, no discovery), and `--check`
  reproduces all 29.

### 2.7 Documents (template item 5)

- Design §6.6 has the proof, Finding, work, structural bound and reference effects; the table, the tiers, the file
  tree, the G01 example and its cut list are updated.
- Both developer guides are in step: the bounded-finder paragraph, the supplements and the fixtures.
- The user guides say 24 techniques and 29 examples; the Player design has the catalogue note; `notes.md` has the MS08a
  section with each output difference and its cause.
- The only stale facts are the quick totals (IR67).

### 2.8 Runs, compounds, fingerprints and formats (template items 7 and 8; T03)

- Runs: focused 405 of 405 (Generator) and 161 of 161 (Player); Generator quick 3,563 in four groups (699.8 s); Player
  quick 1,807 (35.3 s). The CI check covers 3,563 and 1,807 tests, each in exactly one shard, with the projections
  unchanged.
- IR12. Each pass is 123 items in three compounds (5 wires, 14 analyses, 104 hash shards). Every item has a projection
  with its basis: MS07c's measurement of the same item, doubled plus 5 s. The worst admission (elapsed before the item
  plus the larger of its projection and 60 s) is 362.2 s and 365.5 s. The longest compound took 304.7 s and 308.1 s,
  and the longest item 29.7 s. Every item stayed within its projection and exited 0.
- The quick groups ran through the r6c group runner, one lock per group (longest 318.0 s); the mutations ran as one
  compound (63.8 s). The gaps were 16 s, and no process exceeded 540 s.
- The working tree's quick fingerprints equal those of the final results (Generator `519cd6653180…`, Player
  `222e69cffbc2…`), so the final quick sets describe the tree as it stands.
- Formats: all 31 files are UTF-8 without BOM, CRLF only, with a final newline and no trailing whitespace; both engine
  files keep the 110-character rule.

## 3. Findings

### IR67 — Minor: stale quick-set totals in the guides and designs

- **Where.**
  - Generator "3,505 tests": `DEVELOPERGUIDE.md:910, 922, 972`; `DEVELOPERGUIDE.vn.md:665, 676, 725` ("3.505 bài");
    `generator/design.md:1936`.
  - Player "1,749 tests": `DEVELOPERGUIDE.md:1379`; `DEVELOPERGUIDE.vn.md:1124`; `player/design.md:442`.
- **What.** After MS08a the totals are 3,563 and 1,807. The Generator total was right until MS08a (MS07d wrote
  3,505). The Player total has been stale since MS07c made it 1,750: MS07b wrote 1,749 and no task since updated it.
  I missed that in review 17, and this corrects it.
- **Why routed, not fixed here.** All ten lines are fingerprinted: the guides in both apps' fingerprints, each design
  in its own app's. Editing them now would mean a new final quick run of both apps for MS08a. It would also stop MS07f
  from reusing MS08a's final results as its before set (IR71). MS07f edits these sections next, and its brief already
  says to derive the totals from the actual inventories and not to copy 3,505.
- **Binding text, for MS07f's dispatch (not for MS08a).** "Write the actual quick-set totals in the ten places of
  IR67: the Generator total from MS07f's final inventory (expected 3,560) and the Player total from its final
  inventory (expected 1,807; MS07f does not change it). The three Player lines count as directly affected count
  references."

### IR68 — Info: the evidence's base commit and timing conventions

- **Base.** `evidence.md` line 3 says HEAD `7fe14fb`. The orchestrator's commit `7ab77b1` (S-OD7, S-OD8, MS07f: pack
  and decision files only) landed at 15:03, during the task. The second E pass, the final checks and both final quick
  sets ran on the working tree over `7ab77b1`. None of its files is fingerprinted, so nothing is invalidated.
- **Timing.**
  - The 699.8 s is the sum of the four `Invoke-Dv3Node` group walls (71.582 + 170.353 + 317.976 + 139.922 s).
  - The manifest's shard values are the group runner's per-shard process seconds (pipeline 317.3 s, player 139.4 s).
  - The Player's 35.3 s is its `Invoke-Dv3Node` wall (35.295 s). The manifest's 34.7 s is the runner's body time
    (34.66 s "running tests"), although the manifest defines `measuredSeconds` as process seconds.
- **Binding fix (evidence only).** `evidence.md` is in neither fingerprint, so this needs no rerun.
  - Add to the header: "Base `7fe14fb` at the start; the orchestrator's pack-only commit `7ab77b1` (S-OD7, S-OD8, MS07f)
    landed at 15:03 and touched no fingerprinted file; the second E pass, the final checks and the final quick sets
    ran over `7ab77b1`."
  - Add to section 3, after the standing cost: "Conventions: 699.8 s is the sum of the four `Invoke-Dv3Node` group walls
    (71.582, 170.353, 317.976 and 139.922 s); the manifest's shard values are the group runner's per-shard process
    seconds; the Player's 35.3 s is its `Invoke-Dv3Node` wall, and the manifest's 34.7 s its body time. Final quick
    fingerprints: Generator `519cd6653180d243…`, Player `222e69cffbc2ea1c…` (`quick-final-2/`)."
  - Leave the manifest's Player value as it is (information, not checked); MS07f compares like with like (IR71).

### IR69 — Info: the skyscraper's line-ownership rule

- MS08a reads R11's "disjoint" as whole-line disjointness (`disjointTable`): a base line may share no cell at all with
  another line of its kind. X-Wing's search (`findFish`, header lines 18-24) only needs the base line's candidate cells
  to be owned by it. On multi-grid boards the skyscraper is therefore the stricter of the two.
- **Consequence (my structural count).** Butterfly has no disjoint row or column, so the skyscraper never fires there,
  while X-Wing can. Samurai keeps 27 rows and 27 columns as possible bases, Sohei 18 and 18, and Flower 6 and 6.
  Single-grid boards are unaffected. No regression key or golden has a multi-grid board at Hard or above, so nothing
  measured changes.
- **Ruling: accepted.** R11 asks to "preserve existing fish safety for ambiguous overlapping-grid line ownership". The
  stricter rule is never wrong, and design §6.6 says so ("overlapping sub-grids give no skyscraper, never a wrong
  one"). It does not change now: the weaker rule would change the engine source and with it all of E.
- **For the later tasks: rule A1 of IR72.** A later change of the skyscraper's rule would need its own task with E.
  The lower multi-grid coverage is not a required item; at most it is a note for MS18-level analysis of multi-grid
  ratings.

### IR70 — Info: rulings on the developer's five points

1. **Pin refreshes** in `cache`, `worker`, `pipeline`, the Generator `player` suite and `help-example-tools` (and in
   `replay` and `steps`): **in scope** under template item 6, which covers suites that pin generated or recorded
   output. In the diffs:
   - every changed value is read from a record (`golden-facts.txt`, `player-facts.txt`, `g01-compact.txt`,
     `shallow-seeds.txt`);
   - matchers are replaced like for like: `expect` calls replay 44 → 45, steps 23 → 26, player 17 → 16, and no test is
     removed or skipped;
   - the one dropped assertion is the old second culprit frame at G01 step 5, which the new G01 does not have; the
     loop now asserts that every step other than step 4 has no cause;
   - the shallow-fallback specimen still asserts its premise (exact false, both warnings, `tune.shallow` events), and
     seed 21 is the lowest qualifying seed of the recorded scan of seeds 1 to 29 (21, 24 and 29 qualify).
2. **`generator-quick.json`: accepted.** The changes are information only (counts, measured seconds, provenance), as
   in MS07c. The CI check passes, and `.github/` is in neither fingerprint. MS07f must keep these additions (IR71).
3. **The manual `difficulty` suite: accepted**, as in MS07b and MS07c. The two edits are current-contract pins (the
   weight table, and Hard's first techniques now including `skyscraper`). A scratch script evaluated them against the
   registry, and `node --check` passes. The suite stays under the existing item "the manual `difficulty` suite is
   unrun" for its later owner; MS17b edits it as well.
4. **`lines` and `ends`: correct.** The brief's vector says "target R2C7 sees the two non-aligned ends", R11 says "at
   least one of the latter is d", and MS08b's contract is `{digit, lines, bridge, ends}`. They are pinned by the
   vector, transpose and agreement tests, and mutation 7 (unsorted ends) is caught.
5. **Compounds: correct** (section 2.8).

### IR71 — Info: what MS07f inherits from MS08a

1. **Baseline.** The final quick results in `docs/difficulty-v3/evidence/MS08a/quick-final-2/` describe the tree as it
   stands now. On the Generator side all eight shards are complete and source-stable (`519cd6653180…`); the Player
   fingerprint is `222e69cffbc2…`; Node v26.13.0, time factor 2. They are MS07f's preferred before set as long as no
   fingerprinted file changes before MS07f's pre-move check. IR67 and IR68 keep MS08a's remaining edits outside both
   fingerprints for that reason.
2. **Before figures.** Generator 699.8 s (group walls, IR68) and Player 35.3 s. Inventories: Generator 3,563 (pipeline
   154 and player 69, neither changed by MS08a) and Player 1,807. Expected after the move: Generator quick 3,560,
   pipeline 151, player 69, manual +4.
3. **Anchors.** `pipeline.test.js:654, :658, :662` and the Generator's `player.test.js:563` sit at the same lines and
   are unchanged, and so are the helpers they need. MS08a's hunks in these files are elsewhere: `pipeline.test.js:2521`
   only; `player.test.js` at 353, 477, 598-611, 670, 704, 838-844, 915-940 and 1004.
4. **Manifest.** MS08a's "added" paragraph and counts are the additions MS07f must keep; MS07f changes only the
   `pipeline` and `replay-player` groups. For the Player value's convention, compare like with like (IR68).
5. **Projections.** MS08a changed generation outputs (66 hashes, six analyses), and the pipeline group took 317.3 s
   against 309.1 s at MS07d; the developer attributes this to run-to-run variance. Re-project the three ratio cases
   and the two mega16 requests on the post-MS08a source: mega16 Nightmare and Hell 1 admit the skyscraper. MS07f's
   brief already says so; its 281 s and 111 s are history, not projections.
6. **Counts in the documents:** IR67.

## 4. IR72 — the technique-task template (binding for MS08b and later)

MS08a meets the eight template items of its brief. The orchestrator checks each later technique task (MS08b to MS12,
MS14a to MS14c, MS15b, MS16) against the list below; "as MS08a" names the accepted precedent.

A task whose kernel stays inactive, or that adds tests only, applies A, C, D and F. It then proves that nothing is
registered and no output changed: the three E merge-checks and the GH `--check` pass with no update.

**A. Proof and geometry**

- A1. Design §6.6 states the proof and every precondition: complete units, the ownership rule, scope and uniqueness.
  It also states what is never a target, the enumeration order, and each Finding field with its order. The ownership
  rule is MS08a's whole-line disjointness or `findFish`'s candidate ownership, never weaker. The design names the
  multi-grid boards on which the pattern can fire, and the tests include a multigrid-ownership negative (IR69).
- A2. The brief's vector and its transpose, and every near miss of the brief in both orientations, each checked first
  against an independent enumeration. The enumeration is built only from `model.units`, `cellUnits`, `unitMeta` and
  `peers`, never from the finder's tables. Add the boundary with the neighbouring technique (as MS08a: X-Wing in both
  orientations), determinism after another call, and immutability of the Finding and the state.
- A3. Agreement field by field (digit, cells, eliminations, every i18n argument) with the enumeration's first removing
  pattern, on classic9 (two seeds), classic6, classic4, 12 and 16 digits, and every unit-shape class the pattern can
  use (as MS08a: diagonalX, hyper, Jigsaw 9). Each setup has a minimum number of firings.

**B. Registration and weight**

- B1. The assigned ID, group, order, base cost, weight, scope and `assumesUniqueness`, unchanged. A technique-weights
  test covers the placement between the neighbours, the hardest-technique choice, and the allowed, tier and floor sets
  (1.25 × weight against the band maxima).
- B2. No relabelling. Record the references with and without the technique (as `rated-effect.txt`). A level or
  `v3Expected` change is a recorded reclassification (R20), never a silent edit.

**C. Limits and cost (R10)**

- C1. State the unit. A new finder gets 50,000 per call unless its task assigns another limit. The counter is local;
  the parent budget is checked at entry and with at most 256 units between checks (IR52), pinned by a cadence test
  with the exact check positions.
- C2. A spent limit gives `null` and `capHit: 'work'`. A spent budget is "nothing found" with `capHit: null`, and the
  caller re-checks its own budget (IR55). Cancellation and every other error propagate with no observer record. The
  record is `{ id, work, limit, capHit, retained }`.
- C3. The seam: an absent limit is the default, a finite limit of at least 0 is floored, and anything else is
  `solver.invalidOption`. A new finder has no unbounded mode.
- C4. Design §6.6 gives the structural maximum of units per call on the registered variants, against the limit.
  Record `pattern-cost.js --ids=<id> --runs=20` on the fixtures; add no wall-time assertion. Adjust the limit at most
  once, with before/after evidence.

**D. Fixtures and soundness**

- D1. A `CURRENT` entry with two real positives and exact Findings. Each positive has a unique solution, its
  eliminations are checked against the solution, and its reduced state still completes. Add at least one negative (as
  MS08a: nothing left after the technique itself, and the neighbour's boundary). Use explicit `after` copies, and keep
  `historyV2`, `LADDER` and the v2 positions untouched.
- D2. The generic seeded sweep and `minFirings` stay as they are; `SUPPLEMENTS` add real positions on top of them.
- D3. Update `REGISTRY_ORDER`, the `BELOW_*` lists and the lists of `techniques.test.js`.

**E. Integration**

- E1. Both apps' locales in EN and VI: name, description, step and every subtype key, with the same placeholders. The
  VI name follows the style of its group.
- E2. Guides in EN and VI, in step. Design §6.6 with the tables, tiers and file tree; the Player design's catalogue
  note; the user guides' technique and example counts; a `notes.md` section with every output difference and its
  cause.
- E3. Every stated total that the task changes: technique and example counts, and the quick-set totals in
  `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md` §15 and `player/design.md` (IR67). Grep for the
  old numbers before the final quick run.

**F. Mutations**

- F1. At least one in-memory mutation per precondition and per limit rule, at minimum MS08a's ten kinds adapted to
  the pattern:
  - a pattern cell as a target;
  - the neighbour's boundary pattern accepted;
  - a target that sees only part of the required cells;
  - the ownership or disjointness rule dropped;
  - the budget checked one unit early;
  - cancellation swallowed;
  - the limit off by one;
  - unsorted output;
  - an ownerless or incomplete unit accepted;
  - the wrong anchor (root, bridge) chosen.

  The task's own suite must detect all of them. Record the failing tests for each mutation, and keep superseded runs.

**G. E (GG and GR) and the hash update**

- G1. Complete E: 520 hashes in 104 shards of 5, the five wires G09-G13 and the fourteen analyses G01-G14, in the
  order wires, analyses, hashes. Run them through an IR12 compound driver: every item has a projection with its
  recorded basis (the previous task's measurement of the same item), and each item is admitted only if the elapsed
  time plus the larger of its projection and 60 s is at most 450 s.
- G2. Run the merge-checks before writing and keep the `CHANGED` lists. Explain every changed key by the mechanism:
  - the generation-source diff is only the technique and its weight;
  - every changed key's level admits the technique;
  - no key below the technique's tier changed;
  - list the keys that admit the technique but did not change.

  Then write the wires and analyses and run `--update-hashes`, all from the merged ledgers.
- G3. After any later byte change of a fingerprinted engine file, even a comment, record E again on the final source.
  Show that the three merge-checks pass "recorded from the current sources" with no diff, and keep the superseded pass
  whole.

**H. GH**

- H1. Run `--check` on all existing IDs first and record which differ. Take the new ID's source in the brief's order
  of preference, bounded: at most 16 puzzles and 400 hints, and discovery at most 8 minutes. Refresh every affected
  old ID from its own source; if that source no longer yields it, use another real source from the catalogue and
  record the candidates and the choice. Finish with `--check` on all IDs. Never fabricate a snapshot.

**I. Pins and file ownership**

- I1. The task owns:
  - the engine file and its suite;
  - the core fixtures and lists;
  - the Generator weights, `technique-weights`, and the manual `difficulty` suite's current-contract pins (evaluated
    by a script, not run; IR70);
  - both apps' locales, `help-examples.js`, and the `help` and `help-example-tools` pins;
  - the E fixtures;
  - the suites that pin generated or recorded output: `replay`, `steps`, the Generator `player` suite, and the
    `cache`, `worker` and `pipeline` specimens (`rated.js` only when a level or `v3Expected` changes);
  - the guides, designs and notes;
  - the information fields of `.github/scripts/generator-quick.json`: counts, measured seconds and provenance. It
    changes groups, suites or projections only when it adds a suite.
- I2. A pin refresh is valid only if:
  - the new value is read from a recorded output;
  - the matcher is replaced like for like;
  - no test or matcher is removed, skipped or loosened, and a dropped case assertion is replaced by an assertion of
    the new truth;
  - a specimen test re-asserts its premise, and the new specimen is the lowest qualifying seed of a recorded scan;
  - every refresh is listed with its before and after values in the evidence.

**J. Runs, evidence and handoff**

- J1. The focused suites, both complete quick sets on the final tree and the CI check. One locked command per payload,
  at most 540 s; compounds per IR12; at least 15 s between locks.
- J2. After the final quick sets, edit only files outside both fingerprints (evidence, `notes.md`, `.github/`), or run
  both quick sets again. Check the final results' fingerprints against the tree.
- J3. The evidence states the base commit and any commit that landed during the task, and the timing conventions
  (group walls, per-shard process seconds, runner body time).
- J4. S-OD4: performance and availability numbers become named S-AV items or re-measurements (as S-AV08), never stops.
  Only a correctness failure or a needed change of a recorded decision stops.

## 5. Summary

| ID | Severity | Where | Finding | Action |
|---|---|---|---|---|
| IR67 | Minor | `DEVELOPERGUIDE.md:910, 922, 972, 1379`; `DEVELOPERGUIDE.vn.md:665, 676, 725, 1124`; `generator/design.md:1936`; `player/design.md:442` | Stale quick totals (3,505 → 3,563; 1,749 → 1,807) | MS07f writes the actual totals (its dispatch) |
| IR68 | Info | `evidence.md` header and section 3 | Stale base; mixed timing conventions | Evidence-only text (binding) |
| IR69 | Info | `core/js/engine/tech-fish.js` (`disjointTable`) | Whole-line disjointness, stricter than X-Wing's | Accepted; IR72 A1 |
| IR70 | Info | — | Rulings on the five points | All accepted |
| IR71 | Info | MS07f | Baseline, anchors, manifest, projections, counts | For MS07f's dispatch |
| IR72 | — | — | The technique-task template checklist | Binding for the later technique tasks |

MS08a REVIEWED: 0 blocking, 0 major, 1 minor (IR67, routed to MS07f), 4 info (IR68 to IR71), template IR72.
