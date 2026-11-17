# MS13c — SA1 analyst review (S-OD4), archived by the orchestrator

SA1 = claude-opus-5.5 reviewer (agent `62fb5aa0`). This file keeps both review rounds verbatim. They are the
durable source for the A3 soundness sweep (684 positions, 306 Findings, 178 version 2) and for the cost
populations cited in S-AV04/S-AV38. SA1 ran its sweep through the locked runner (16.3 s); no artifact file of
the sweep itself was kept.

## Round 1 — 2026-11-17, requested about 12:10, answered 12:48 (+07:00): not accepted yet

**MS13c review: not accepted yet.** I found 1 blocking item that needs an owner decision and 7 non-blocking items. Nothing is wrong in the engine code or its tests. I edited nothing.

**What I checked against the code and evidence**
- **S-OD11 policy (point 1):** implemented exactly (`tech-chain.js` 1592–1746).
  - Only `forcingChain` falls back, and only after `construction-work`, `construction-nodes` or `search-work`.
  - The fallback runs only after a passing budget check and uses no work limit.
  - There is no fallback after a spent parent budget, cancellation, an error, a completed negative or an `'empty'` window.
  - `forcingChainLong` has no fallback. One counter covers construction and search and is never reset.
  - The domain comes from control flow. A best-so-far proof is never published after a cap: I injected that mutant in memory and the existing tests (limit W+S−1, and puzzle #530) catch it.
- **Proofs and IR54 (points 2–3):** a proof with no group equals the legacy Finding (the link order matches, and the byte-for-byte test passes); all data are copies. The IR54 tests are unchanged, and the fallback equals the singleton search with `workLimit:null`.
- **My own soundness check (locked, 16.3 s):** on all 15 test-kit models I solved 6 seeded puzzles each with the current ladder. That gave 684 forcing positions and 306 Findings, 178 of them version 2. The independent checker found 0 problems and 0 Findings conflict with the known solutions.
- **E, GH and fingerprints (point 5):**
  - I re-ran the three merge-checks: all say "recorded from the current sources" and match the fixtures.
  - The fixture diffs are exactly 2 wires, 7 analyses and 26 hashes (seeds match the evidence). The base-engine regeneration reproduces the old outputs.
  - The engine hash `5EBA1AE5…` equals the frozen copy. All 81 mutant fragments still match the final source.
  - GH `--check` passes 37 of 37.
  - Fingerprints `2a6afd40…` and `05125ec1…` match all 9 results: 4,483 and 2,722 tests, complete and source-stable.
- **Projections and CI (point 9):** the arithmetic is correct; all 123 E admissions are within 450 s and within projection.

**Findings**

1. **Blocking, needs the owner (SA2 to escalate): Jellyfish was refreshed using the S-OD10 corpus route.**
   - **Where:** `evidence.md:100` and `:146`, `notes.md:1389`, `player/design.md:562`, `help-examples.js:46`.
   - **Problem:** S-OD10 was a one-off for MS12: "no other ID/task inherits it" (check-list :230, :588–592, :686; S-AV35 :432). MS13c scanned indices 0–8,703 without approval and ran no ordinary discovery first. The evidence presents the route as authorized, and it was not raised as a question although S-OD4 says to stop for a change to a recorded decision.
   - **Required:** the owner chooses one of:
     - **(A) Approve this use retroactively.** The bounds were kept and the ledger is complete, so only the wording changes.
     - **(B) Refuse.** The developer reverts the example and runs the ordinary route. If that fails, GH is 36/37 and the task stops for the owner.

     Suggest the owner also sets a standing rule, because later active tasks can break old examples the same way.
2. **Non-blocking: the four "unkilled" mutants are equivalent (point 4).** No test is missing.
   - **Where:** `evidence.md:47`, `:144`, `:154`, `:158`; `notes.md:1385`, `:1393`.
   - **S01 and S03** (`:1503`, `:1458`): group starts are only "false" and are scanned after every singleton. Take a contradiction from a group: G false reaches m true in a links and m false in b links. Let x be the first node of the longer path, or a member of it. From "x true" you reach G false, then both polarities, within max(a,b) links. So a singleton proof at least as short is always found first. A shared path prefix gives a strictly shorter proof by the same argument.
   - **S06** (`:1463`): it only changes a group start reaching "G true", and "x true" then gives a contradiction at most L−1 long.
   - **P09** (`:1557`): an unsorted list needs a two-target endpoint proof (T1 in t's cell, T2 in s's cell, the two cells see each other). At 3 links it becomes either a 1-link endpoint first or a "forced" proof. At 5 or more links, "T2 true" gives a contradiction of at most (L+3)/2 links, which is shorter.
   - **Required:** record these as equivalent, mark IR72 F done, and drop the candidate named item.
   - The other four (A20, S05, E08, E09) are correctly argued.
3. **Non-blocking: the A3 claim is wrong.**
   - **Where:** `evidence.md:139`.
   - **Problem:** it says agreement was shown "by the census", but `census-run.js` never calls the checker.
   - **Required:** state what was actually checked, and cite my sweep above (or rerun it).
4. **Non-blocking: the cost section understates the effect (point 7).**
   - **Where:** `evidence.md:10`, `:61`, `:107`, `:154`; `notes.md:1391`.
   - **Problem:** the "1.5–2.2×" figure covers only the five 50-run cells. These met with the base engine and now miss:

     | Cell | Base | With this change |
     |---|---|---|
     | killer/hell2 | 8.8 s | 14.5 s |
     | hyper/nightmare | 0.66 s | 19.5 s |
     | jigsaw9/nightmare | 4.3 s | 22.3 s |
     | greaterThan/nightmare | 6.9 s | 11.5 s; the 50-run command passed 540 s |

     G13 (the Samurai Nightmare wire) went from 11.0 s to 94.2 s, above the 30 s qualification budget and close to the app's 120 s guard.
   - **Required:**
     - List these as numbered items for MS18c/MS18d.
     - "Five to twenty times" per call comes from pre-freeze logs; the range there is 5–25×.
     - `generator/design.md:623` is fingerprinted, so fix it in the next doc pass.
   - Under S-OD4 the treatment is admissible and work need not stop, but I recommend telling the owner the size of the slowdown.
5. **Non-blocking: lock and process record (point 9).** Required: disclose all four in §15 and `lock-log.jsonl`; no rerun.
   - The stale lock was removed without first reporting it (check-list :779–780), and the stopped quick run has no row in `lock-log.jsonl`. The orchestrator should confirm Pentomino was not blocked between 09:46 and 09:57.
   - The GP pilot projections used the cell's target as the bound, which is not conservative; 11 of 37 pilot items overran.
   - mega16/hell1 was rerun unchanged after hitting the 540 s ceiling.
   - The first E's overruns are undisclosed: G13 wire 97.4 s against 46 s, diagonalX-nightmare-05 45.6 s against 37 s.
6. **Non-blocking: living docs.**
   - `docs/architecture.md:32` still says "inactive grouped chain graph". It is outside both fingerprints, so it is a cheap fix.
   - `player/design.md:562` omits that the fallback has no local work limit and proves only the singleton-graph minimum. That file is in the Player fingerprint, so fix it together with any Player rerun.
7. **Non-blocking: the brief's GH command with `MS13c\sources.json` was never run.**
   - **Required:** add one sentence to §10: both forcing IDs still come from their own sources, so the catalogue has no grouped example; the real one is pinned in `play.test.js`.
8. **Non-blocking: the 50,000-unit limit rationale is wrong for the long ID (SA2 is ruling on Q3).**
   - **Where:** `evidence.md:63`, `notes.md:1383`.
   - **Problem:** "the cap keeps the singleton result" is true only for `forcingChain`. For the long ID, 200,000 would cut caps from 313 to 1 and find 139 more proofs.
   - **Required:** state the trade-off per ID.

**Nits:** `engine-final.txt:1` repeats words; `.last-release` still exists although §15 says it was deleted; the rename diff cannot be reproduced from the old hash, so list it.

**My view on the developer's questions:** Q1 and Q2 are acceptable: the real positions stay pinned and nothing is loosened. Q3 is acceptable with finding 8's wording; Q4 is covered by finding 4.

## Round 2 — 2026-11-17, requested 14:07, answered 14:17 (+07:00): ACCEPT

**ACCEPT.** MS13c can be committed. One wording error remains; it is optional to fix, outside both fingerprints and needs no rerun. I edited nothing and ran nothing long; every check below was a short read-only command.

**1. Findings 2–8 and the nits are fixed as SA2 ruled**
- **Mutants (2):** §4, §13 F and §14–§15 now say 73 detected and 8 argued equivalent, with my arguments and line references (`:1458`, `:1463`, `:1503`, `:1557`). The proposed mutant S-AV item is dropped. A rerun of `check-mutations.cjs` shows all 81 fragments still match the final source.
- **A3 (3):** the false claim that the census checked agreement is removed. My sweep is cited by its numbers (684 positions, 306 Findings, 178 version 2, no problems), and the text says honestly that no artifact path exists.
- **Cost and limits (4, 8):**
  - §5, §11, `notes.md` and `generator/design.md` line 623 now carry the per-ID trade-off, which matches `candidate-compare.txt` (caps 310/313 → 2/1, Findings 213/115 → 323/254, 1,990 → 2,305 ms).
  - The cost range is now "5 to 25 times", labelled pre-freeze.
  - The populations table matches the raw logs (I checked all 5 paired 50-run p95s and the 3 two-run maxima).
  - S-AV04, S-AV08, S-AV36, S-AV37 and S-AV38 are carried.
- **GP account:** `gp-table.md` accounts for all 50 cells: 21 complete records, 16 two-run-only and 13 with no pilot. The two-run cells carry no pass/fail mark.
  - The ledger shows 7 of 21 completed runs over projection.
  - 10 of 37 pilots were over their stated bound, by both the numbers and the flags.
  - The mega16/easy control is listed separately.
- **Lock and process record (5):** `lock-log.jsonl` keeps its raw rows and adds 5 correction rows, including the manually aborted run (pid 15480, unknowns left unknown). §15 now covers the unreported stale-lock removal, the pilot bounds, the unchanged mega16/hell1 retry and the first E's overruns (97.4 s vs 46 s, 45.6 s vs 37 s). No wait is blamed on Pentomino.
- **Docs and GH (6, 7):** `docs/architecture.md` line 32 is fixed. `player/design.md` line 562 now states the fallback has no local work limit, keeps the same budget and window, and proves only the singleton-graph minimum. §10 explains why the `sources.json` command was not run.
- **Nits:** the repeated header words are gone, `.last-release` is deleted, and the rename edits are listed; I confirmed lines 179, 1660, 1666 and test line 5494.

**2. The Jellyfish text matches S-OD12 everywhere.** `evidence.md` §0, §10 and §13 H, `notes.md` line 1389 and `player/design.md` line 562 all say the scan was unauthorized when performed and was approved afterwards for MS13c only, with S0 as the standing rule. The remaining S-OD10 mentions are MS12 history. `help-examples.js` is unchanged.

**3. E validity and the new fingerprints hold**
- I recomputed all 18 hashes in `engine-frozen.txt` on the current tree and all match; `tech-chain.js` is `5EBA1AE5…`. `engine-jf02.txt` and `engine-final2.txt` have the same hash lines.
- The three merge-checks print "recorded from the current sources" with 5/5 wires, 14/14 analyses and 520/520 hashes.
- Fingerprints `1f7c0d87…737e` and `3d565adc…7944` match all 9 results in `quick-final-2`: 4,483 and 2,722 tests, complete and source-stable.
- Only `generator/design.md` and `player/design.md` changed among fingerprinted files after 12:02, at 13:48–13:49, before the quick runs started at 13:51.
- **Projections:** the arithmetic is correct; pipeline rises to 80 and the Player job to 150. The groups come to 1,050 / 1,230 / 420 / 390 s and the Player job to 630 s.
- **Checks:** a GH `--check` rerun gives 37 of 37; the CI log passes; 24 changed files pass the format check.

**Optional nit:** `evidence.md` lines 97 and 164 and `notes.md` line 1393 say "20 E-relevant files" and "byte for byte" or "line for line". The freeze list is actually 16 named files plus 2 tree hashes (18 hash lines), and only the hash lines are identical; the header lines differ. Suggested wording: "the 16 E-input files and the two tree hashes (18 hash lines) are identical to `engine-frozen.txt`". (Applied by the developer before commit.)
