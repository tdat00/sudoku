# MS13a evidence: the inactive grouped chain graph and its proof checker

Base commit `8345e89` (MS12 accepted), branch `rating-v3`; SA2 amended the pack in `d9143de` (MS13a, MS13b and the check-list) and again in `e1cec9e` (GC-01 and S-AV36, landed during the SA1 fix round; it changes no file of this implementation); the amended brief governs this report. Nothing was staged or committed (the orchestrator commits). Developer: Dev-Sonnet (claude-sonnet-5.5). **Start 2026-11-16T22:53:07+07:00; end 2026-11-17T01:20+07:00** (2 h 27 min including the wait for SA2's rulings; SA1's census correction, section 9 and the design sentence, was made 01:40 to 01:55 and is the only change after that time: no engine edit, so E, the differential, the GH check and the mutants stand). Timing conventions (IR72 J3): a "wall" of a locked command is the `seconds` that `Invoke-Dv3Node` reports for it (the convention of MS12's 407.4 s); the seconds of a shard are the process seconds of its own line in the group transcript; "runner body time" is the `Time:` line of the runner. The task is in the S-OD4 analyst review set.

## 1. What is implemented

**An inactive builder and an independent checker; no registered output changes.**

| File | Change |
|---|---|
| `core/js/engine/tech-chain.js` | `SG.chainGraph = { build, LIMITS }`: a pure insertion of 354 lines (0 deleted; the registered finders, the seam and every constant of them are untouched). `buildGraph` and `constructGraph` are referenced only by the builder's own table (a test reads the source and counts the references; the five finders, the two seam functions and `buildStrongLinks`/`scratchFor` never mention the graph). |
| `core/tests/fixtures/chain-proofs.js` (new, 528 lines) | `SG.chainProofs`, the independent checker: `nodeProblems`, `weakLinked`, `strongLinked`, `expectedNodes`, `expectedWork`, `expectedTicks`, `graphProblems`, `solutionProblems`, `targets`, `pathProblems`. It recomputes membership, every cross pair of peers and the coverage of a complete unit from the model and the state and shares no table with the builder. |
| `core/tests/suites/tech-chain.test.js` | 40 new tests, all named `grouped graph` (1,448 lines added, none deleted or changed); the suite is 216 tests (176 before). |
| `generator/tests.html`, `player/tests.html` | `chain-proofs` in the fixture lists (`CORE_FIXTURE_FILES` of the Generator, the list of the Player). |
| `generator/design.md`, `player/design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `docs/architecture.md` | Section 8. |
| `.github/scripts/generator-quick.json` | Information fields only (section 7). |
| `generator/tests/artifacts/difficulty-v3/MS13a/` | Scratch scripts (the lock wrapper, the E driver and plans, the mutation harness and its lists, the differential, the census, the format check). |
| `docs/difficulty-v3/evidence/MS13a/` | This report and every log, ledger and record named here. |

**The builder** (`SG.chainGraph.build(model, state, ctx[, { groupLimit, workLimit }])` returns `{ nodes, weak, strong, complete, work, capHit }`):

- **Nodes.** `{ cells, digit }`, 1-based digit, ascending distinct non-empty open cells. The singletons come first (one per open candidate, ascending by cell and digit), then the groups sorted by the numeric key `[digit, ...cells]` with a shorter prefix first. **A group** is the set of open cells holding a digit in the intersection of a complete `box`/`region` unit with a complete `row`/`col` unit sharing at least two cells, with at least two such cells; identical groups collapse. Windows, diagonals and other complete units generate no group but still give strong links and (through `model.peers`) weak links.
- **Edges.** Weak: same digit, disjoint, every cross pair sees each other (never one convenient pair); different digits, two singletons of one cell. Strong: same digit, two disjoint nodes that are exactly all the open occurrences of the digit in one complete unit where it is not placed; different digits, the two singletons of a bivalue cell. Lists ascending, symmetric, without duplicates.
- **Work.** One unit = one tested combination: every candidate group before deduplication, every pair of candidates of one open cell, **every pair of nodes of one digit, charged before the first-cell prefilter**. Limits `{ groups: 4096, work: 50000 }` (frozen `LIMITS`); the optional fourth argument replaces either with a finite number of at least 0 (floored; otherwise `solver.invalidOption`); no unbounded mode.
- **Quota.** Enforced as the groups are collected: the candidate attempt is charged first, a duplicate costs work and no slot, exactly the limit is allowed and the next distinct group refuses the build; the groups are sorted only after a complete collection.
- **Budget.** The parent budget is checked at entry, after the model-only set-up (the peer matrix and the box-line intersections, cached per model, so a cold and a warm call account identically), once per 256 steps of the uncharged per-call scans, and so that no more than 256 charged units pass between two checks.
- **Incomplete.** `{ nodes: [], weak: [], strong: [], complete: false, work, capHit }` with `capHit` `'work'`, `'nodes'` (the quota; the existing observer vocabulary) or `null` (a spent parent budget). Cancellation and every other error propagate; the builder publishes no observer record. The state, the model and the context are never written, and the result owns its arrays.

**The checker** accepts the proofs of the amended brief: v2's ascending union, legacy ordering compatibility, exact endpoint targets, singleton starts for forced/contradiction proofs and exact root conclusions. After SA2's ruling 6 it **does not reject a placement merely because its candidate is also a member of a group inside the proof**; a group start or an arbitrary member stays rejected.

## 2. The rulings applied, and the runs they superseded

SA2's eight rulings (the amended brief, "SA2 rulings before final gates") were applied as follows.

| # | Ruling | Applied as |
|---|---|---|
| 1 | Groups only from complete `box`/`region` x `row`/`col`, at least two open occurrences, deduplicated; windows/diagonals keep strong coverage and weak peers but generate none | `graphGeometryOf` classifies units by kind; the checker's `groupCandidates` and the tests were adapted; kept a window/diagonal strong-edge test and a window-only-group negative; the `region` model has box-like overlapping groups; the prefix-order fixture now uses a box/region-line group (ruling 4) |
| 2 | Charge every tested same-digit pair before the prefilter; 50,000 unchanged (blank classic9 = 84,807); quota enforced during insertion; setup and scan checks; keep the equivalent guard | `chargeGraph` before the `peerMatrix` filter; `tickGraph` (a check every 256th scan step); `collected` Map with `if (collected.size >= groupLimit) throw GROUP_CAP`; checks at entry and after the geometry; finite test overrides (`BLANK_WORK = 84807`, `LIFTED = 100000000`); the guard `complete[u] !== 1` stays |
| 3 | Empty arrays; `'work'`, `'nodes'`, `null` | as stated in section 1; the old tag `'groups'` is a mutant (#52, detected) |
| 4, 5 | Schema/order and the optional argument accepted | unchanged semantics; boundary tests for the options |
| 6 | Checker: remove the blanket rejection of a placement whose candidate is also an internal group member | `pathProblems` no longer has the check; the reproducer is a positive test (below) and the old rule is a mutant (#65, detected) |
| 7 | Gate (b): fresh complete E, check-only | section 5 |
| 8 | Documents | section 8 |

**SA2's reproducer** is a positive test (`accepts a forced singleton root that is also a member of a group inside its own proof (SA2 vector)`): the 4x4 model with the units of the brief, cells 10..15 fixed to 4, the candidate sets `12,123,123,13,23,12,13,123,123,23`, the two paths from `0:1-` (one ending at G `+`, one at G `-`) and the forced Finding (placement `[0,1]`, cells `[0,1,2,3,5]`, length 5). The test asserts that every edge is valid, the nodes are canonical, `solutionProblems` is empty for the unique completion `[1,2,3,3,2,2,3,1,1,3,4,4,4,4,4,4]` (also found by brute force, with uniqueness), and that the checker accepts the proof; the group-start and arbitrary-member variants stay rejected.

**Superseded by the rulings and kept whole** (the first implementation, before SA2's reply, with the old work unit and the old family): `legacy-diff-tree.txt` and `legacy-diff-base.txt` (the same SHA-256 as the final ones), `work-census.json` and `logs/work-census.txt` (the old unit: the real classic9 positions cost at most 4,331 of 50,000 and a blank classic9 24,462; the pre-ruling figure that the brief asks to preserve as history), `mutations-1.txt` (62 mutants: 59 detected on the first run, two real survivors killed by two added tests, one equivalent), `mutations-2.txt`, `mutations-3.txt`, `logs/mutations-run-1.txt` to `-3.txt`, `logs/tech-chain-grouped-1.txt` to `-11.txt` (the development runs, among them the red ones), `logs/gh-check-all-37.txt` and the three source-identity refusals of the MS12 ledgers (section 5).

## 3. Focused gates and mutations (IR72 F1)

**Focused gates on the final source** (every command through `Invoke-Dv3Node`, `lock-log.jsonl`):

| Gate | Result | Wall |
|---|---|---|
| Generator `--suite=tech-chain,techniques,technique-weights,difficulty-floor,i18n,digger-target,tech-wing,pattern-cost-tools,ui-contract,purity` (`logs/focused-generator-final.txt`) | **1,343 of 1,343** (`tech-chain` 216, `techniques` 267, `tech-wing` 496, `difficulty-floor` 48, `digger-target` 75, `i18n` 86, `pattern-cost-tools` 32, `purity` 41, `technique-weights` 15, `ui-contract` 67) | 63.2 s |
| Player `--suite=play,i18n,help,help-example-tools,tech-chain,tech-wing,techniques,ui-contract` (`logs/focused-player-final-2.txt`; the first attempt `logs/focused-player-final.txt` named a `purity` suite that the Player does not have, exit 1 in 0.2 s) | **1,256 of 1,256** (`tech-chain` 216, `help-example-tools` 51, `help` 27, `i18n` 69) | 36.8 s |
| `--suite=tech-chain --filter="grouped graph"` (`logs/tech-chain-grouped-12.txt`) | **40 of 40** | 2.0 s |
| Player `--suite=help,ui-contract,i18n` after the documents (`logs/player-help-after-docs.txt`) | 158 of 158 | 4.0 s |

**Mutations: 78 in-memory mutants of the builder (59), the checker (18) and one argued-equivalent guard: 77 detected, 1 equivalent** (final source, `mutations-final-3.txt`, run `logs/mutations-final-run-3.txt`, 121.7 s; `mutations-final-2.txt` is the same list one comment-only edit earlier and has the same 77 + 1; the complete failing tests of every mutant are in the files). The list is `generator/tests/artifacts/difficulty-v3/MS13a/mutations-final.cjs` (each fragment is checked to occur exactly once). Kinds (MS08a's ten adapted to the graph, IR72 F1):

- **Edge obligations**: a weak link decided by the first cells only; one crossing pair instead of every pair; overlapping nodes not told apart; a strong link that needs only a subset of the occurrences; every unit taken as complete; a digit already placed still giving a strong link; the second node outside the unit; two candidates of one cell not weakly linked; a bivalue-style strong link for every cell with two or more candidates.
- **The group family**: partial units generating groups (the whole guard, the box half and the line half separately), a column no line, a window or diagonal generating groups, a region generating none, three cells needed for a group, a single occurrence as a group, a solved cell counted as an occurrence or as a singleton.
- **Order, ownership and state**: groups descending or unsorted; the digit or the prefix order reversed; singletons highest-digit-first; the state written; unsorted adjacency; a non-symmetric peer matrix; a stale geometry cache.
- **Limits and budget**: default limits 4097 and 50001; the quota allowing one more (`>`), refusing the last allowed group, checked only after collection or charging duplicates; a group candidate, a first-cell-rejected pair or a candidate pair not charged; the work limit off by one; the budget checked one unit early or 257 units late; the entry check or the check after the set-up dropped; each of the three scans not counting its steps; a scan check every 255, 257 or 512 steps; cancellation swallowed; a spent budget or the quota reported as a work cap or with the old tag `'groups'`; an incomplete graph saying it is complete or returning a partial list; options accepting `Infinity`, refusing 0, not floored, `null` not refused.
- **The checker**: a weak link comparing the first cells; strong links compared by count; a placed digit ignored; targets linked to either end; a group start allowed; placements not compared; the old over-restriction put back; strong or weak edges of a path not checked; extra graph edges not counted; the node cell order unchecked; the expected work, group family and scan steps weakened; solution-contradicting weak/strong edges not reported; endpoint targets and the proof length not compared.

**Honest record of the survivors.** On the first run after the rulings 72 of 75 were detected; **two real survivors**: #7 (the partial-unit guard of the group pass removed; the earlier "partial cage" test used a unit of kind `cage`, which never generates groups) and #44 (a scan check every 255 steps instead of 256; the 486-step scans of classic9 cannot tell them apart). Two tests were added (the `incompleteModel` test of a too-short region, a partial region and a partial row-kind unit, and `checks once per 256 scan steps exactly` on rows of four cells with 255, 256, 511, 512, 767 and 768 steps), together with the half-guard and 257-step mutants; the full list was then run twice more.

**The equivalent mutant (#77), with a non-circular argument.** Removing `complete[u] !== 1 ||` from `coverUnit` cannot change any result. The table `occ` is written only inside `for (u ...) { if (complete[u] !== 1) continue; ... }`, so for a unit that is not complete every `occ[u * digits + d]` is 0. `coverUnit` is called only with two non-empty nodes, so `total = x.cells.length + y.cells.length >= 2`, and the test `occ[...] !== total` is true for such a unit: the unit is skipped by the count alone. For a complete unit the removed term is false anyway. The explicit guard stays as a soundness guard; the argument depends on the table being written only for complete units and on the two nodes being non-empty, which `buildGraph` guarantees and a test pins (the checker's `nodeProblems` rejects empty nodes). A random search corroborates nothing here and none is claimed.

## 4. Inactivity (IR72's rule for a task whose kernel stays inactive)

**The differential on the same inputs**, tree against the base commit `8345e89` loaded from git in memory (`generator/tests/artifacts/difficulty-v3/MS13a/legacy-diff.js`, `load.js`): 6,370 calls (2,306 with a Finding): the general seam with four option sets and the restricted seam with three, each with its observer record; the five registered chain finders (`xyChain`, `forcingChain`, `forcingChainLong`, `nishio`, and `nishioDeep` on the evil puzzle), with and without a `maxChainLength`; and 135 complete ratings (6,129 steps, every step with its Finding and the classification). SHA-256 of the results and records:

| Engine | calls | Findings | ratings (steps) | SHA-256 |
|---|---|---|---|---|
| tree (`legacy-diff-tree-final.txt`) | 6,370 | 2,306 | 135 (6,129) | `8c0f69aa5c7c22acb3ec85be9af1907030916f97aa9c7d9450012a7e35b042e3` |
| `git:8345e89` (`legacy-diff-base-final.txt`) | 6,370 | 2,306 | 135 (6,129) | `8c0f69aa5c7c22acb3ec85be9af1907030916f97aa9c7d9450012a7e35b042e3` |

**Byte-identical**: the digest is identical, the base has no `SG.chainGraph` and the tree has it. The same digest was also obtained by the pre-ruling source (`legacy-diff-*.txt`). Other proofs: the test `is referenced by nothing but its own table` (the source with comments removed: `buildGraph` twice, `constructGraph` twice, none of the finders mentions a graph), and the test `changes no Finding and no observer record of the registered finders and the seam, built in between or not`.

**E and GH** (sections 5 and 6): every wire, analysis and hash equals the published one; the 37 help examples match.

## 5. E (GR wires, GR analyses, GG hashes): fresh, final source, check-only

**The source-identity refusals that closed the former route.** Merging the MS12 ledgers against the first implementation was refused ("recorded from other sources"): wires and analyses `767b39fe958a...` against the then-current `f7230c71f728...` (`logs/wire-merge-check.txt`, `logs/analysis-merge-check.txt`), hashes `bd7819402f15...` against `b63ed3e452e1...` (`logs/hash-merge-check.txt`), exit 1, nothing written. These are not passing merge-checks, and nothing was relabelled, removed from the fingerprints or bypassed. The announcement is `e-announcement.txt`; the frozen bytes are `engine-frozen.txt` (`tech-chain.js` `501481B4...`; the other engine, locale, perf and replay helpers and both source trees equal MS12's: `generator\js` `5C43DCE2...`; `core\js` `FA86482B...` differs only by `tech-chain.js`), re-hashed after E in `engine-after-e.txt`: **every line identical, no byte of a fingerprinted engine file changed between the freeze (00:45:50) and the end of E (00:56:19)**. The last engine edit before the freeze was a comment re-wrap to the 110 columns; the mutations, the differential and every gate were re-run after it where they read the engine.

**Fresh E under `evidence/MS13a/{wire,analysis,hashes}`**, IR12 compounds (each item has a projection of 2 x the MS12 measurement of the same shard + 5 s, admitted at `elapsed + max(projection, 60 s) <= 450 s`; one lock per compound; at least 15 s between locks), recorded on the frozen source:

| Kind | Shards | Node seconds | Projection | Over projection | Merge-check (check-only) |
|---|---|---|---|---|---|
| Wires G09-G13 (`logs/merge-check-wire-final.txt`) | 5 | 76.9 | 181 | 0 | `merged 5 ledgers: all 5 keys exactly once, recorded from the current sources`; G09-G13 `matches replay-wire.js`; `replay-wire.js is up to date` |
| Analyses G01-G14 (`logs/merge-check-analysis-final.txt`) | 14 | 107.3 | 294 | 0 | `merged 14 ledgers ... recorded from the current sources`; every G01-G14 `matches replay-goldens.js`; `replay-goldens.js is up to date` |
| Hashes (`logs/merge-check-hashes-final.txt`) | 104 of 5 seeds | 353.0 (one compound, 353.2 s) | 1,298 | 0 | `merged 104 ledgers: all 520 keys exactly once, recorded from the current sources`; `regression hashes: all 520 puzzles unchanged` |

The wires were merge-checked against the unchanged published wire fixture before the analyses were recorded. Every shard exited 0 and none exceeded its projection (`shard-runs.jsonl`, 123 lines). The identities of the fresh ledgers: wires and analyses `c348ab6e778c...`, hashes `d3b174e2ee16...` (one distinct value in each family). **No fixture was written, no `--update-hashes` was run**, `git status` shows no change to `replay-wire.js`, `replay-goldens.js` or the hash fixture, and there was no unexpected difference to investigate: the inactive builder changes no generated puzzle, wire or analysis.

## 6. Help examples (GH, H1)

`node tests\tools\make-technique-examples.js ..\generator --check --max-puzzles=64 --max-hints=400` from `player/`, on the final source (`logs\gh-check-final.txt`, 2.7 s): `help-examples.js is up to date for the 37 selected ID(s)`, 27 puzzles replayed, every ID `matches help-examples.js`. Check-only: no discovery and no write. The catalogue holds the same 37 examples.

## 7. Commands, timing, CI projections

**Complete quick sets on the final tree.** The first complete pair (`quick-final/`, 01:05 to 01:14) was run before SA1's review; SA1's census correction changed `generator/design.md`, which is in the Generator fingerprint but not in the Player's, so **the complete Generator quick set was run again** (`quick-final-2/`, 01:46 to 01:53) and the Player's results of `quick-final/` stand (its fingerprint is unchanged). The first Generator results (fingerprint `3fc19246...`) are kept as superseded history. Every results file is complete and source-stable:

| Set | Result | Wall of the command(s) |
|---|---|---|
| Generator (53 suites), `quick-final-2/` | **4,408 of 4,408** (core-shared 2,104; steps 57; replay 154; mega 108; own-fast 1,690; digger-target 75; pipeline 151; player 69) | 140.3 + 192.9 + 39.7 + 37.1 = **410.0 s** (shared-small, own-suites, pipeline, replay-player); the superseded first run was 407.2 s |
| Player (30 suites), `quick-final/` | **2,647 of 2,647** | 73.3 s |

The totals are the registered inventories (`--list-tests`: 4,408 tests in 53 suites; 2,647 in 30 suites, the two inventories were deleted after reading as redundant to the complete results files; the lines are in `inventory-counts.txt`): 4,368 + 40 and 2,607 + 40, the 40 being the new `grouped graph` tests of the shared `tech-chain` suite.

**CI check** (`quick-final-2/ci-check-final.txt`, run after the manifest update; the first one, `quick-final/ci-check-final.txt`, is superseded and identical in its verdict, `"C:\Program Files\Git\bin\bash.exe" .github/scripts/generator-suites.sh check`): `Generator quick set: 4408 tests in 53 suites; Player quick set: 2647 tests in 30 suites`; groups `shared-small` 840 s, `own-suites` 1,140 s, `pipeline` 360 s, `replay-player` 360 s of 1,800; Player job 510 s; `Every quick test is in exactly one shard (4408 of 4408) ... check passed`, exit 0.

**Projections (the rule of `c160bb4`: new = max(old, 10 x ceil(1.5 x m / 10)), m the process seconds of the shard in the complete successful run).** Machine: this Windows x64 host, Node v26.13.0, time factor 2; the sources are the `shard X: exit 0, N s` lines of `quick-final-2/log-*.txt` (the Generator shards) and `quick-final/log-player-quick.txt` (`exit=0 seconds=73.237`, the lock wall 73.3 s).

| Shard | old | m | calculation | new | in a group of / job total |
|---|---|---|---|---|---|
| core-shared | 100 | 64.3 | 10 x ceil(9.645) = 100 | **100** | shared-small: 180 + 3 x (100 + 40 + 40 + 40) = **840** of 1,800 |
| steps | 40 | 26.1 | 10 x ceil(3.915) = 40 | **40** | |
| replay | 40 | 25.5 | 10 x ceil(3.825) = 40 | **40** | |
| mega | 40 | 22.7 | 10 x ceil(3.405) = 40 | **40** | |
| own-fast | 290 | 189.4 | 10 x ceil(28.41) = 290 | **290** | own-suites: 180 + 3 x (290 + 30) = **1,140** of 1,800 |
| digger-target | 30 | 2.5 | 10 x ceil(0.375) = 10 | **30** (the old one stays) | |
| pipeline | 60 | 39.1 | 10 x ceil(5.865) = 60 | **60** | 180 + 3 x 60 = **360** of 1,800 |
| player (Generator shard) | 60 | 36.1 | 10 x ceil(5.415) = 60 | **60** | 180 + 3 x 60 = **360** of 1,800 |
| Player job | 110 | 73.3 | 10 x ceil(10.995) = 110 | **110** | 180 + 3 x 110 = **510** of the actual 900 (and of the generic 1,800) |

**No projection changes**; only `tests` (core-shared 2,064 to 2,104, the Player 2,607 to 2,647), `measuredSeconds` (updated again from the second Generator run) and the provenance text of `.github/scripts/generator-quick.json` were edited (the manifest is outside both fingerprints; IR72 I1). No shard moved or was regrouped; no factor, overhead or timeout changed.

**Fingerprints (J2):** `fingerprint-now.js` after the last edit of a fingerprinted file gives generator `a019fda114ca3531aed545355cd131dc4d0cd720e33da3d3a2172566d0435633` and player `7a1a84e9ccfa46239b32347d7ef810b5f1e1702aa7b1f160a4462a9d4654b0bd`; **all eight Generator results files of `quick-final-2/` carry the generator value and the Player file of `quick-final/` the player value**, every one `complete: true`. After the final quick runs only `.github/` and this folder were edited. The superseded first Generator results carry `3fc1924619fc7cdd099107576ee77f6ef240ceea57ad800d3c4c0d400b3f742e` (the design before the census correction).

**S-AV08 re-measured**: Generator 410.0 s against 407.4 s at MS12 (+0.6 % for +0.9 % tests), Player 73.3 s against 72.7 s (+0.8 % for +1.5 % tests). No stop.

**Locks:** 47 logged lock records (`lock-log.jsonl`; the compounds of E, the quick groups of both Generator runs, the focused gates, the mutation runs and the censuses among them), 2,090.8 node seconds in total, at least 15 s between a release and the next request (the minimum gap is 15.0 s), a maximum recorded wait of 0.1 s (the shared slot was free). Seven locked runs ended with exit 1, all recorded in the log: the five red development runs of the first implementation (`MS13a tech-chain grouped first`, `second`, `fourth`, `fifth`, `seventh`: failing tests that I then fixed), the first run after the rulings (`after SA2 rulings 1`) and the Player gate that named the nonexistent `purity` suite. Short commands (the merge-checks, the format check, the listings; each under 10 s) were not locked.

## 8. Documents (SA2's ruling 8)

Updated, all stating that the API is **inactive**: `generator/design.md` (section 6.6, the new paragraph "The inactive grouped chain graph (rating v3, MS13a, R16)" with the family, the work units, the quota and empty-result semantics, the options, the census and the mutation analysis; the handoff clause of the XY-chain paragraph; the file tree; section 13.6 API lines; section 15.1 total 4,408 and the `chain-proofs` fixture in section 15.2; the `tech-chain.test.js` row), `player/design.md` (the inactive proof note and total 2,647, the `tech-*` row), `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` (the grouped graph paragraph after the XY-chain one; totals 4,408 and 2,647 in all three places), and `docs/architecture.md` (the core test fixtures in the layout table and in the move map). The old totals were grepped before the final runs: the only remaining `4,368` and `2,607` are the MS12 history in `player/design.md` and `notes.md` and the older provenance text of `.github/scripts/generator-quick.json`. No user-guide or catalogue change (no user-visible output changes); `notes.md` is unchanged because every output is identical. `help` and `ui-contract` pass after the edits (the guides' `SG.` names exist). The format check (`check-format.cjs`: BOM, CRLF, trailing whitespace, final newline, the 110 columns of the engine files) passes on the 380 files of the change (330 before the census correction).

## 9. IR72 A to J (an inactive task applies A, C, D and F, plus E3, G and J by SA2's ruling 7)

| Item | Result | Evidence |
|---|---|---|
| A1 | The proof obligations (the weak/strong definitions, the group family, the complete-unit coverage, the order, the incomplete-graph rule) are in design 6.6 and the header of `tech-chain.js`; a group is a disjunction ("at least one listed cell holds the digit"), never a placement licence. There is no technique, no Finding and no board on which a pattern fires; Samurai is in the agreement corpus (the deduplication of a shared box) and the quota test; the partial-unit, irregular 6x6, window/diagonal and region models are in it too | design, header, tests |
| A2 | Every edge obligation is a vector checked first by the independent checker and then in the builder: all four cross pairs, one missing pair, overlapping groups, exact occurrences of a complete unit, one occurrence more, a digit placed, a partial unit (weak, never strong), a solved cell, a short or partial box/region/line (no group), windows/diagonals (strong only), different digits; determinism after other calls; no write to the state, model or context | `grouped graph` blocks `edge obligations` and `ownership, determinism and state reuse` |
| A3 | Agreement of every position field by field (nodes, both edge lists, `work`, scan steps): classic9 (6 puzzle and 10 pruned states), classic6, classic4, 12 and 16 digits, Samurai, a partial-unit model, three irregular 6x6 models, windows and a diagonal, overlapping regions, and four blank boards (at least 90 positions; more than 2,000 groups, 500 weak links between groups, 100 strong links with a group and 10 between groups); the singletons' links against the old `forcingChain` checker for more than 500,000 pairs | `agreement` tests |
| B1, B2 | Not applicable: nothing is registered, no weight, order or id, no reference changes (the E ledgers and the differential show no rating difference) | E, differential |
| C1 | Unit = one tested combination (section 1), limits 4,096 and 50,000 frozen in `LIMITS`; the counter is local; the entry, set-up and scan checks and the 256-charged-unit cadence are pinned by exact check positions (blank classic9: works 0, 0, 256, 486, 512; a 20-grid farm: 0, 0, 0; scan steps 255, 256, 511, 512, 767, 768) | tests, mutants #39-#48 |
| C2 | A spent limit: empty incomplete graph with `capHit: 'work'`, `work` equal to the limit; the quota: `'nodes'`; a spent budget: `null` (the caller re-checks its own budget); cancellation and errors propagate; **no observer record exists** (the builder has no observer; a test checks that the finders' records are unchanged by building in between) | tests, mutants #49-#54 |
| C3 | Options: floored, finite and non-negative or `solver.invalidOption` for `-1`, `NaN`, `Infinity`, strings, `null`, objects, arrays, booleans, and a non-object `options`; no unbounded mode | test, mutants #55-#58 |
| C4 | The structural maximum of a build is the pair scan: n_d (n_d - 1)/2 per digit (plus the group candidates and the cell pairs); `expectedWork` recounts it, and the blank-board maximum of **every one of the 15 models** is compared with the limit in the census below: it exceeds 50,000 on every board but 4 x 4 and 6 x 6 (84,807 on a 9 x 9 board, 1,715,391 on Samurai), so the limit is a cap and not a guarantee of completeness, and seeded ladder solves reach it on Samurai, Sohei, Flower and 16 digits. `pattern-cost.js` is for a registered finder: not applicable. The limit was **not** adjusted (SA2's ruling 2) | census |
| D1, D2, D3 | Not applicable (no technique, no `CURRENT` entry, no registry list); the new fixture is the independent checker `chain-proofs.js` | |
| E1 | Not applicable (no text) | |
| E2 | Guides EN and VI in step, design 6.6/13.6/15 and the tree, the Player note, `docs/architecture.md`; `notes.md` unchanged (nothing differs) | section 8 |
| E3 | Quick totals 4,368 to 4,408 and 2,607 to 2,647 in `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md` section 15 and `player/design.md`, from the registered inventories and the final runs; the old numbers were grepped before the final runs | section 8 |
| F1 | 78 mutants, 77 detected + 1 equivalent by a structural argument; superseded runs kept | section 3, `mutations-final-3.txt` |
| G1 | Complete E on the final source: 5 wires, 14 analyses, 520 hashes, in that order, IR12 compounds with per-item projections and bases | section 5, `shard-runs.jsonl` |
| G2 | Merge-checks only; nothing changed, so there is no `CHANGED` list and no cause to explain | `logs/merge-check-*-final.txt` |
| G3 | No byte of a fingerprinted engine file changed after the freeze; the merge-checks pass "recorded from the current sources"; the superseded refusals are kept whole | `engine-after-e.txt`, `logs/*-merge-check.txt` |
| H1 | `--check` of all 37 passes; no ID is refreshed | section 6 |
| I1, I2 | Files of the task only (section 1); **no pin was refreshed, nothing removed, skipped or loosened** (the 1,448 test lines are additions); `generator-quick.json`: information fields only | git diff, section 7 |
| J1 | Focused suites, both complete quick sets on the final tree and the CI check; one locked command per payload at most 540 s; compounds per IR12; at least 15 s between locks | sections 3, 5, 7 |
| J2 | Final fingerprints equal the tree's | section 7 |
| J3 | Base commit `8345e89`, the pack amendments `d9143de` and `e1cec9e` (GC-01 and S-AV36, during the SA1 fix round) and the timing conventions stated (header) | header |
| J4 | The quick-cost change (Generator +0.6 %, Player +0.8 %) is a re-measurement of S-AV08, not a stop; the construction census is reported as a candidate numerical item (section 12) | section 7 |

**The census on the final source, all 15 models** (corrected after SA1's review; locked, no engine edit; `census-all/<id>.json`, `census-all/table.md` with every population, `logs/census-all-1.txt` to `-3.txt`, scripts `work-census-all.js` and `work-census-table.js`, seed 77003 for the states and the six puzzles, 8001 for the wrong-candidate states). Each model was measured at the default limits and at lifted limits (the true work). Populations are labelled: **constructed** = the blank state; **synthetic** = test-kit states (6 puzzles dug from random solutions, 24 states: 6 initial, 6 propagated, 12 pruned, and 6 states with many wrong candidates); **ladder** = every position at which a ladder solve of the 6 propagated states reaches the chain group (`xyChain` is tried because every earlier technique found nothing), on those seeded test-kit puzzles, **not** published puzzles. Killer and Greater-Than are the test kit's uncaged and uninequalitied models. The first census of this task (`work-census-final.json`, `logs/work-census-final.txt`: 364 sampled calls on classic9, classic6, classic4, 12 digits, 16 digits and Samurai) is kept as history: it measured real named puzzles only on classic9 (the stuck positions of six evil puzzles: 7,536 to 12,086 units, all complete) and its "many wrong candidates" rows for the larger boards were synthetic; its conclusion "no real position was capped" was wrong and is withdrawn.

**Structural maximum: the blank state (constructed)** (the blank state has every candidate in every cell, so the most nodes, group candidates and same-digit pairs; the work of each board equals the independent checker's `expectedWork`):

| Model | cells x digits | blank work | x the 50,000 limit | additional groups | default result |
|---|---|---|---|---|---|
| classic4 | 16 x 4 | 2,144 | 0.04 | 64 | complete |
| classic6 | 36 x 6 | 13,590 | 0.27 | 180 | complete |
| every 9 x 9 board but jigsaw9 (classic9, diagonalX, hyper, killer, greaterThan, wordoku) | 81 x 9 | **84,807** | 1.70 | 486 | capped (`'work'`) |
| jigsaw9 | 81 x 9 | 78,822 | 1.58 | 441 | capped (`'work'`) |
| mega12 | 144 x 12 | 321,048 | 6.42 | 1,008 | capped (`'work'`) |
| mega16 | 256 x 16 | 1,209,344 | 24.19 | 2,048 | capped (`'work'`) |
| butterfly | 144 x 9 | 268,704 | 5.37 | 864 | capped (`'work'`) |
| flower | 189 x 9 | 459,297 | 9.19 | 1,134 | capped (`'work'`) |
| sohei | 288 x 9 | 1,047,384 | 20.95 | 1,728 | capped (`'work'`) |
| samurai | 369 x 9 | 1,715,391 | 34.31 | 2,214 | capped (`'work'`) |

A blank classic9 board costs 486 + 2,916 + 81,405 = 84,807 units (counted by the tests with `workLimit: 100000000`). No blank board reaches the 4,096-group quota (the largest is 2,214 groups).

**Ladder positions at the chain group (seeded test-kit puzzles, 6 per model):**

| Model | puzzles reaching the chain group | positions | capped at 50,000 (work / nodes) | lifted work min / median / p95 / max |
|---|---|---|---|---|
| classic4, classic6, wordoku | 0 of 6 | 0 | - | - |
| classic9 | 1 of 6 | 5 | 0 / 0 | 4,581 / 4,942 / 6,117 / 6,117 |
| killer, greaterThan (uncaged / uninequalitied test-kit models) | 1 of 6 | 5 | 0 / 0 | the same as classic9 |
| mega12 | 3 of 6 | 32 | 0 / 0 | 1,401 / 6,971 / 13,216 / 13,644 |
| **mega16** | 6 of 6 | 321 | **20 / 0** | 581 / 23,349 / 50,505 / 57,089 |
| diagonalX | 3 of 6 | 84 | 0 / 0 | 2,633 / 9,002 / 14,757 / 16,419 |
| hyper | 3 of 6 | 67 | 0 / 0 | 2,504 / 10,566 / 14,825 / 15,387 |
| jigsaw9 | 2 of 6 | 26 | 0 / 0 | 3,289 / 5,798 / 7,795 / 8,693 |
| **samurai** | 4 of 6 | 48 | **38 / 0** | 430 / 85,352 / 137,186 / 138,529 |
| **sohei** | 1 of 6 | 51 | **43 / 0** | 11,922 / 109,951 / 121,564 / 124,066 |
| butterfly | 3 of 6 | 15 | 0 / 0 | 10,495 / 26,658 / 31,008 / 31,008 |
| **flower** | 3 of 6 | 44 | **17 / 0** | 8,428 / 44,057 / 70,028 / 70,583 |

At the default limit the capped positions report `work` 50,000 (their default quantiles are in `table.md`). **Synthetic states (30 per model)** are capped at the default on mega16 (8 of 30; largest 72,092), Samurai (14; 263,265), Sohei (14; 190,178), Butterfly (6; 74,010) and Flower (10; 140,148) and on no other model (the largest of the others: classic9 9,712, 12 digits 29,833, Diagonal 18,494, Hyper 23,138, Jigsaw 9 21,142, Wordoku 10,695, classic6 1,708, classic4 295); no build was refused for the 4,096-group quota. The real generated wire puzzles reported by SA1 cost less (Samurai Nightmare G13 6,764 and 1,708 units, Killer Nightmare G10 660); that is SA1's measurement, not re-run here. **The limit was not raised** (SA2's ruling 2) and no code changed: the finding is that **the default 50,000 returns an incomplete graph at many positions of the large boards** (Samurai, Sohei, Flower, 16 digits), reported as a named item for MS13c (section 12).

## 10. Acceptance criteria

| ID | Evidence |
|---|---|
| MS13a-B01 | A group node is a disjunction: true when at least one listed cell holds the digit; the checker never accepts choosing an arbitrary member from the truth of a group (the group-start and exact-placement negatives, mutants #63 and #64), and it does accept a legitimately placed singleton that is also a member elsewhere (SA2's reproducer, mutant #65) |
| MS13a-B02 | Nothing half-integrated reaches players: `SG.chainGraph` is read by nothing; the differential has the same SHA-256 as the base, all 5 wires, 14 analyses and 520 hashes are unchanged, the 37 help examples match, and both quick sets and the CI check pass |
| MS13a-T01 | Every edge obligation and the malformed, overlapping and partial-unit negatives are tested against the independent checker (`grouped graph` tests; 77 of 78 mutants detected, the one equivalent argued) |
| MS13a-T02 | Actual-sized buffers (a farm of 65 4x4 boards whose 65th board is empty: exactly 4,096 groups complete and more nodes than cells x digits; one more distinct group is refused with `'nodes'` at work 4,097), deduplication (a Samurai overlap gives one node), per-call bounds (limits, quota during insertion, scan cadence) and state reuse (nothing cached, a state changed in place, other calls in between) |
| MS13a-T03 | Registered output unchanged: differential, complete E check-only, GH check, both complete quick sets (4,408 and 2,647) and CI (sections 4 to 7) |

## 11. Questions and rulings

**Before the final gates:** `QUESTION:` 1 to 8 (the group-generating units, the work and the group limits, incomplete graphs, schema and order, the optional argument, the checker's rules, the E gate, the documents), each with evidence, options and a default. **SA2 ruled on all eight** (the pack amendment `d9143de`; the orchestrator relayed it verbatim): 1 choose (b) box/region x row/col; 2 change the work unit to every tested same-digit pair, keep 50,000 (blank classic9 84,807), enforce the quota during insertion, keep the guard; 3 empty arrays and the tag `'nodes'`; 4 accepted; 5 accepted; 6 accepted with the one correction (the over-restriction on a placed singleton also in a group); 7 choose (b), fresh complete E, check-only; 8 accepted. All applied (section 2). **No question is open.** The brief's own stop points did not occur (no change of a recorded decision, no evidence corrupted, no unexplained gate failure).

## 12. Named items

**No new S-AV row is added by me.** S-AV01 to S-AV35 are inherited. **S-AV08** is re-measured (section 7). **Candidate numerical item for the pack author (MS13c, J4), corrected after SA1's review:** the construction work of the grouped graph against the 50,000-unit limit (section 9, `census-all/`). The blank-board structural maximum is 84,807 units on every 9 x 9 board but Jigsaw 9 (1.7 times the limit; Jigsaw 9 78,822, 1.6), 321,048 on 12 digits (6.4), 1,209,344 on 16 digits (24.2), 268,704 on Butterfly (5.4), 459,297 on Flower (9.2), 1,047,384 on Sohei (20.9) and 1,715,391 on Samurai (34.3); only 6 x 6 and 4 x 4 fit. **On seeded test-kit ladder solves the limit is reached at real chain-group positions of the large boards**: Samurai 38 of 48 positions over 50,000 (median 85,352, largest 138,529), Sohei 43 of 51 (median 109,951, largest 124,066), Flower 17 of 44 (median 44,057, largest 70,583) and 16 digits 20 of 321 (median 23,349, largest 57,089); classic9, 12 digits, Butterfly, Diagonal, Hyper, Jigsaw 9, Killer and Greater-Than stay under it (largest 31,008, Butterfly). The default limit therefore returns an incomplete graph at many such positions, and MS13c must decide the policy (the limit stays 50,000 by SA2's ruling 2 and is shared with the search); the 4,096-group quota is never reached by a real or blank board (the largest blank board has 2,214 groups) and only by an artificial farm of 65 boards. The earlier statement of this report that no real position was capped is withdrawn. MS13b/MS13c handoff: the schema (`{ cells, digit }`, 1-based, ascending), the singleton-first and numeric-key order, the incomplete-graph rule (`complete: false` is decisive, empty arrays, `capHit` `'work'`/`'nodes'`/`null`), `SG.chainProofs.pathProblems` (optional canonical-node checking, the exact-root and singleton-start rules, no global-minimum, registry or window check) and the 84,807 figure.

## 13. Honest gaps

- The census (section 9, all 15 models) is of constructed blank states, test-kit states and **seeded test-kit ladder solves** (6 puzzles dug from random solutions per model), not of published puzzles: real named puzzles were measured only on classic9 (six evil puzzles, first census), and the real generated wire puzzles are SA1's numbers, not re-run. Only 6 puzzles per model were solved (0 to 6 reach the chain group, so Sohei's 51 positions come from one puzzle and classic9's 5 from one), Killer and Greater-Than are the test kit's uncaged and uninequalitied models (their numbers equal classic9's), and the latency is of one locked but unprotected process. The result is a finding, not a bound: the large boards reach the 50,000 limit at real chain-group positions of the seeded solves, and the report does **not** claim that the limit is unreached anywhere. It is not a measurement of MS13c's own search positions or of CI. The first census of this report (364 calls, classic9 only for real puzzles) concluded wrongly that no real position was capped; it is kept as history and withdrawn.
- The equivalent mutant is equivalent by the structural argument of section 3 only for this implementation; a random search was not used.
- The mutations are in-memory and hand-written; two real survivors were found by the first run and fixed by two tests (section 3). The 78 are not claimed to be exhaustive.
- Only one complete quick pair was run for the Player and, after SA1's census correction of `generator/design.md`, one complete Generator set again (the first Generator set is superseded); the projections use the latest runs as m.
- `meanMs` is a latency of an unprotected process: no wall-time assertion exists or is claimed.
- The manual `difficulty` suite, qualification, soak and any CI run on a server were not run (not authorized in this inactive task).
- Process deviations: the `create` tool refuses existing files, so the post-ruling mutation list is `mutations-final.cjs` and the pre-ruling `mutations.cjs` stays as scratch; the edit tool reported "closest lines replaced" on many edits that were correct (each was re-read), and twice a replacement dropped an anchor comment of the test file (restored); the Player gate once named a suite that does not exist (rerun); two lines of the first doc batch were re-wrapped to 110 columns before the freeze; the two `--list-tests` inventories were deleted after their counts were recorded.
