# Implementation review — difficulty scoring v2

> **Paths.** Written when the generator and the player were two repositories (`sudoku-generator`, `sudoku-player`):
> paths such as `js/core/…`, `js/ui/…`, `tests/…` and `design.md` belong to those repositories, and line numbers to the commits named below.
> In this repository they are `generator/…` or `player/…`, and the files both projects share are in `core/` — see
> [where the old paths went](../../architecture.md#where-the-old-paths-went). Commands such as `node tests/node-runner.js` run in `generator/` or `player/`.

- **Reviewer:** gpt-6-astra
- **Date:** 2026-10-19
- **Verdict:** **REQUEST CHANGES — four blocking findings.**
- **Scope:** the generator's uncommitted implementation, `tests\qualify.js` and `docs\report-v2\qualification.md`, against the agreed report §§5–7. The copied research reports were not reviewed again.
- **Repository changes by this review:** none. All instrumentation and outputs were written to this researcher's experiment folder; the ones this review relies on are copied to [`evidence/`](evidence/). Neither application, nor either `task.md`, was edited. No commit or other state-changing Git operation was performed.

## Reading the citations

- `G\` = the sudoku-generator repository (paths from its root)
- `P\` = the sudoku-player repository
- `E\` = [`evidence\`](evidence/) next to this file: the probe scripts and outputs this review relies on, copied from my experiment folder (which is not part of the repository)
- Line numbers identify the working tree reviewed, before fixes.
- The engine fingerprint computed by the qualification tool and by my loader was **`9002e195df0dec28`**, on commit `fb07fef` plus working-tree changes. See S4 concerning the different fingerprint in the published qualification.

## Executive assessment

The central scoring implementation matches the agreed formula, weights, integer rounding, ladder, tie rule and unrated policy. The two score tables share their allocation helper, the new level texts match the player, and real v2 exports import successfully. The published support lists are plausible and agree with the registry; the three qualification cells I independently repeated reproduce their hit counts.

The blockers are not a rejection of the formula or the demonstrated high-level generation. They are defects in **closest-candidate retention, work-cap enforcement, replay fidelity, and qualification failure handling**. All four survive the existing passing test suite.

### Verification performed

| Check | Result |
|---|---|
| Full generator suite, `node tests\node-runner.js` | **3,497/3,497 passed**, 43 suites, no skips; 486.74 s total |
| Independent qualification, classic6 / hard | **39/40**, p95 **79.65 ms**, budget 2 s |
| Independent qualification, Killer / veryHard | **39/40**, p95 **4,976.18 ms**, budget 10 s |
| Independent qualification, Mega16 / nightmare2 | **40/40**, p95 **1,199.21 ms**, budget 30 s |
| Generation invariants | 29 configurations, including 23 default-option configurations and six non-default symmetry configurations; ten repeated runs, **39 generations** altogether |
| Results of those generation checks | No invalid solution, inconsistent given, nonunique puzzle, incomplete returned proof, broken clue symmetry, invalid cage, incorrect final dig-log reconstruction, or score-table sum mismatch; all ten repeats identical |
| Default-option spot checks | **23/23 exact**; the two approximate results in the six additional configurations were Killer / expert with a two-attempt limit |
| Score allocation | **10,000** fixed-seed cases; every displayed row sum equals the integer total |
| Locale parity | All nine names and descriptions match between generator and player, in both languages |
| Actual generator → player imports | Five real exports covering all three new IDs and classic9, Killer, Greater-Than and Mega16: all accepted with version 2 and unchanged givens |
| Adversarial checks | Reproduced the four blocking findings below |

The qualification reruns used **one worker**, the original seed derivation, default options/symmetry, and all 40 requests. Their timings are measurements of this rerun, not substitutes for the original seven-worker timings. Node emitted its experimental `localStorage` warning; it did not fail any test. I did not run a new generator browser/visual session.

## BLOCKING findings

### B1 — A closer, completely rated, unique candidate is discarded before fallback selection

**Locations:** `G\js\variants\killer.js:965–975`; the analogous rejection in `G\js\core\digger.js:1535–1541`; fallback selection in `G\js\core\digger.js:1775–1784,1796–1800`.  
**Contract:** report §5.7(6), “The closest complete candidate is kept throughout,” and §5.5's closest completely rated fallback.

The cage search discards an above-band candidate immediately at line 968. Only a completed dig sample reaches the outer `best` comparison. Consequently, a valid, completely rated candidate encountered in the structure search can be closer than the eventual “closest puzzle found.”

**Real reproduction:**

```js
SG.pipeline.run({
  variantId: 'killer',
  difficulty: 'expert',
  seed: 61843,
  symmetry: 'diagonal',
  maxAttempts: 2,
  trace: 'off'
});
```

- Returned: **790, veryHard**, with `difficulty.approximate`.
- Full-rating call **72**, inside `searchCagesSteps`, had already produced **1581, evil**.
- That candidate has a complete proof, **exactly one solution by an independent DFS count**, a valid cage partition with connected/distinct cages of at least two cells, and the requested clue symmetry. A separate re-rating reproduces **1581**.
- Using the implementation's own `distanceToLevel` (`digger.js:1577–1585`):
  - returned candidate: `1000 + (1000 − 790)/1000 = 1000.21`;
  - discarded candidate: `1000 + (1581 − 1500)/1500 = 1000.054`.
- It is also nearer in ordinary score distance: **81** from the band versus **210**.

This is a non-default-symmetry, two-attempt case. It does **not** contradict the default-options qualification; it demonstrates that the documented fallback is wrong when the target is missed.

**Concrete fix:** separate “adopt this move as the search state” from “remember this valid candidate for fallback.” Retain every qualifying complete candidate with its matching model, solution, givens, rating and truthful replay information, including cage candidates rejected for exceeding the target band. Let the outer fallback compare that retained candidate with completed dig samples. The same rule should cover refinement intermediates: the specified refinement can keep an above-band addition even if its score rises, so keeping only the final refinement state is not a substitute for remembering the closest state. Where §5.7 permits downward refinement, do not silently lose the above-band candidate before that opportunity either.

**Regression needed:** the reproduction above must not return a farther fallback than an independently verified candidate encountered during its own run. The retained candidate must still pass uniqueness, symmetry, cage validity and replay checks.

**Evidence:** `E\implementation-closest.json`; `node .\implementation-probes.js closest`.

### B2 — The advertised full-rating cap is neither completely counted nor strictly enforced

**Locations:** `G\js\variants\greater-than.js:478`; `G\js\core\digger.js:1158–1166,1346–1353,1475–1477,1535–1537`.  
**Contract:** report §5.7(9), separate deterministic counters and at most 1,024 full ratings per attempt. The implementation itself describes the counter as covering **every** `SG.difficulty.rate` call (`digger.js:739–742`).

There are two independently reproduced problems:

1. **Greater-Than's tuning ratings bypass the counter.** For `greaterThan / veryHard`, seed **222131648**, `maxAttempts: 1`, the actual pipeline performs **14** full ratings while its counter ends at **7**. For `greaterThan / hard`, seed **1704806780**, it performs **26** while recording **14**. These are not bounded-oracle classifications; they are direct calls to the full `SG.difficulty.rate`.
2. **The final rating after local search can exceed the cap.** Local search consumes its last available rating, returns its candidate, and `digLevelSteps` calls `rateCounted` again. That function increments without checking capacity and does not reuse the candidate's already known rating. A controlled boundary test with an **in-memory cap of 20** ends at **21** calls/counted ratings, for `classic9 / nightmare2`, seed **124192814**, one attempt. The constant in the repository was not changed. This exercises the same boundary logic used by the default cap; I am not claiming that this probe observed 1,025 calls under the unmodified default.

**Concrete fix:** provide one counted/guarded full-rating entry point to the generic digger and variant strategies; use it in the Greater-Than loop. Check capacity before starting a full rating, and carry a valid cached rating out of local search/refinement rather than spending another call on the identical candidate. On exhaustion, use the previously verified complete candidate or the specified no-rated-candidate error path; do not bypass the cap to manufacture a final rating.

**Regression needed:** actual call count equals recorded count, neither exceeds the configured limit, and low-cap tests cover exhaustion inside a search, a refinement and a variant strategy.

**Evidence:** `E\implementation-caps.json`, `E\implementation-cap-boundary.json`; modes `caps` and `cap-boundary`. Only the latter deliberately lowers a cap in memory.

### B3 — Re-added clues appear in the preceding replay step

**Location:** `G\js\ui\player.js:370–380`, especially the mutation at line 372 before `flush()` at line 376; batching at `player.js:278–324`.  
**Contract:** report §5.7(6) and §5.9: faithful replay must be preserved.

The `reveal` handler changes the shared board values **before** flushing a pending removal batch. That batch therefore snapshots some of the following reveal's board state. Its displayed puzzle—and potentially the score calculated for that displayed puzzle—is not the position after its own removals.

**Real default-option witnesses:**

| Request | Incorrect transition |
|---|---|
| `mega16 / evil`, seed **478576959** | Cells **98,157** are already filled in the guided snapshot preceding reveal step **11** |
| `mega16 / nightmare1`, seed **2422420669** | Cells **92,163** are already filled in the guided snapshot preceding reveal step **12** |

Cell indices and step indices above are those of the API: cells are zero-based; `step.index` is one-based. The compact dig logs themselves reconstruct the correct final puzzle; this is a **renderer/batching** defect, not a broken final clue mask.

A minimal synthetic log also shows the problem: `pass(random) → accept([0,80]) → reveal([0,80])` displays both cells filled even in the step claiming to remove them.

**Concrete fix:** flush the pending batch **before** changing `values` for a reveal, then apply the added clues and push the reveal step. Keep the existing opening-clues grouping behavior. This fixes the ordering without a layout change.

**Regression needed:** the snapshot immediately before a reveal still has each newly revealed cell empty; the reveal snapshot contains it; snapshots, clue counts and final reconstruction agree. Include a larger board, where several guided rounds share a batch.

**Evidence:** `E\implementation-replay.json` and the synthetic case in `E\implementation-contracts.json`; modes `replay` and `contracts`.

### B4 — Qualification can publish an “offered” verdict after silently losing a request

**Locations:** `G\tests\qualify.js:368–374` and `qualify.js:201–216`.  
**Contract:** report §6: every request counts, including errors; an offered first-round result is based on 40 outcomes, or the second round on 100.

An abnormal worker exit is rejected only while the queue is nonempty. If the last worker dies after receiving the final queued request, its result is missing but the parent resolves normally. `decide` then permits an offered verdict with `n <= 40`, rather than requiring a completed 40-request round.

**Fault-injection reproduction:** simulate a one-worker classic4 / veryEasy qualification whose request index 39 exits with code 1. The unmodified scheduler publishes:

```text
n = 39, hits = 39, rate = 100%, errors = 0, verdict = offered
exit result = success
```

The injected worker is an in-memory event emitter, not a replacement file or a killed external process. This does not allege a crash in the published run. It demonstrates that a future crashed request can disappear from both the sample count and the time percentile. The example's absolute hit threshold would still be met if the missing request were counted as a miss; the incorrect denominator, missing error, and potentially missing slow duration remain protocol violations.

**Concrete fix:** fail the qualification on any unexpected worker exit/IPC error irrespective of queue length, or explicitly record the in-flight request as a miss and replace the worker. Do not resolve with pending requests. An offered verdict must require exactly 40 or 100 recorded outcomes; early stopping may produce a shorter **hidden** row, never an incomplete offered row.

**Regression needed:** worker failure at the end of a first round and at the end of an extension round; no successful publication of a partial qualification.

**Evidence:** `E\implementation-qualification-fault.js` and `E\implementation-qualification-fault.json`.

## SHOULD-FIX findings

### S1 — The rejection cache still assumes a state-independent difficulty refusal

**Locations:** `G\js\core\digger.js:647–650,676–680,825–831,868,889–892`; contradictory documentation at `G\design.md:543`.

The guided-dig comment explicitly says “more clues gone never makes a puzzle easier.” All refused groups—including `tooHard` and solver/technique refusals—are marked permanently rejected and skipped after other clues change. Nonuniqueness is monotone under further removal; the selected proof and its score are not. The agreed specification explicitly calls this out.

**Fix:** distinguish permanent pins/nonuniqueness refusals from state-dependent score/solver refusals. Cache the latter for the current clue state only and reconsider them after an accepted change, including the transition from Stage A. Preserve Killer's deliberate pinned clues. Alternatively, any retained pruning must be identified and measured as a search heuristic, not justified as a monotonicity fact or described as “never assuming” monotonicity.

**Evidence limit:** my bounded scans covered **180** stage digs and **115** eligible reconsiderations, with no threshold-crossing witness found in those scans. Thus I am not alleging an observed bad puzzle or quantifying a default hit-rate loss. This is a concrete invalid pruning justification and a search-completeness risk, below the reproduced blockers. Results: `E\implementation-rejections.json`, `E\implementation-rejections-high.json`.

### S2 — Preserve the independent technique certificates instead of weakening them with the renamed bands

**Location:** `G\tests\fixtures\rated.js:98–140`.

Changing constructed labels to the new bands is correct. However:

- the old medium certificates' “not solvable with singles **and locked candidates**” becomes only “not solvable within veryEasy,” i.e. singles;
- the old evil certificates' “not solvable without chains” becomes “not solvable within veryHard,” which also omits W-Wing and Unique Rectangle.

The puzzles and solver are unchanged, so these stronger technique facts can still be checked independently of the new scoring. The new score assertions do not replace a **score-independent** certificate.

**Fix:** retain the new score labels, but encode the old solvability/non-solvability certificates using explicit technique IDs or explicit technique-group sets, not a mutable difficulty ID. Do not restore group-owned difficulty classification.

### S3 — Document the upgrade's regeneration behavior and describe solver order accurately

**Locations:** `G\README.md:81,97–98,361–362,847,865–866,1097–1098`; `G\design.md:1088,1187,1691`; `G\js\ui\help.js:1239–1242,1498–1502`; `G\js\ui\locale.en.js:263–266`, `locale.vi.js:258–260`.

The README and history/export descriptions still promise “same seed, same puzzle” without the version limitation or the explicitly agreed warning that old links/history **may regenerate a different puzzle**. The README also does not explain the additive `difficulty.ratingVersion: 2` metadata, although the design's format section does.

Separately, Help/Explain still say the solver always tries the “cheapest” technique first. It intentionally retains registration order, not v2 weight order: XY-Wing is order 140 / weight 650, whereas Jellyfish is order 160 / weight 520. Calling that ascending score cost is misleading.

**Fix:** add the concise EN/VI v2 compatibility note required by §5.8: reproducibility within a generator/rating version, old links/history may differ on regeneration, old stored scores are not bulk re-rated, cache v1 is discarded once, and the v1 document format gains `difficulty.ratingVersion: 2`. Replace “cheapest first” with “fixed technique-priority order” (and the Vietnamese equivalent); do not reorder the solver.

### S4 — Reconcile qualification provenance with the final source

**Location:** `G\docs\report-v2\qualification.md:27–45`; fingerprint calculation in `G\tests\qualify.js:173–187`.

The published run names source hash **`f67c9276d07d0070`**. The current source and all three independent qualification reruns name **`9002e195df0dec28`**. Both use the qualification tool's file ordering/filter and hashing method. Reverting only the changed Explain comment in memory gives **`791a67f63e466e26`**, not the published fingerprint.

This is **not proof that the recorded hit rates are wrong**: all three repeated cells reproduce their counts, and other differences could be nonfunctional. It does mean that the published fingerprint does not identify the exact reviewed bytes.

**Fix:** after the functional fixes, qualify the final engine and publish the corresponding raw result, fingerprint, table and support lists together. If an earlier table is retained, explain the exact nonfunctional source difference rather than silently substituting its hash. The required fixes already provide a reason to refresh qualification.

### S5 — The added Help point badges are optional, not necessary for this implementation

**Location:** `G\js\ui\help.js:651–664`.

The new per-technique `{points} points` badge adds visible material and wrapping to the technique descriptions. It is useful, but neither the score computation nor the prescribed existing table needs this extra display. The user specifically asked to keep UI changes minimal.

**Recommendation:** remove the added visible badge span; retaining the `points` data for the score-band explanation is fine. If the badge is deliberately retained, report it as an optional UI change—not as necessary to implement the formula.

## NIT findings

### N1 — The format example was tagged v2 without recalculating its numbers

**Location:** `G\design.md:1621–1625`.

For the example's stated counts `{nakedSingle:21, hiddenSingleBox:14, nakedPair:3, xWing:1}` and `empties:54`, the implemented/agreed score is **502**, not **612**; the hard-band confidence is **0.68**. Both `score` and `rawScore` still say 612 after adding `ratingVersion:2`.

**Fix:** preferably replace the schematic metadata with a real v2 export; otherwise use internally consistent score/rawScore/confidence values. Evidence: `E\implementation-fixtures.json`.

### N2 — The advertised full-soak size is stale after adding the levels

**Locations:** `G\README.md:742,1256`, `G\design.md:1760`; allocation in `G\tests\soak.js:174–196`.

With the published **118** offered pairs, eight of them classic9, the full preset's 25 requests per ordinary pair and 100 per classic9 pair mean **3,550**, not approximately 2,000, requests. This matters when budgeting a validation run.

**Fix:** update the estimate or describe the allocation without a hard-coded approximate total.

## Findings by the requested review focus

### 1. Score and allocation — correct on the reviewed contract

- The 26 weights and nine bands match §§5.2–5.3 (`G\js\core\difficulty.js:102–148`).
- `breakdown` computes `V`, `P`, `W`, `R` and rounds the unrounded sum once (`difficulty.js:323–360`). No variant, size or requested-level term enters it.
- `classify` supplies integer `score`, identical `rawScore`, `ratingVersion:2`, the prescribed hardest metadata and the existing edge-margin confidence definition; incomplete proofs get null level/score/rawScore (`difficulty.js:536–574`).
- All three prescribed tie examples select the right winner. The no-technique/no-empty case scores zero; the no-technique/81-empty arithmetic case scores 54 without division by zero.
- `scoreTable` performs one allocation over the technique shares and the empty-cell share, in registration order (`difficulty.js:381–429`). The 499 worked example allocates `6 + 4 + 1 + 38 + 23 + 381 + 46 = 499`.
- Both consumers call that helper: `G\js\ui\result-view.js:123–132` and `G\js\ui\step-view.js:327–361`. There is no bonus/floor row.
- The raw logical solver and its technique ordering were not rewritten. Keeping `assumeUniqueness:true` for the **final rating** is correct: the completed dig is checked independently for uniqueness. The uniqueness-free bounded oracle remains separate.

### 2. `spec()` — correct for the registered variants

`G\js\core\difficulty.js:459–500` applies the unscaled bands and strict `1.25*w < max` pruning, with all weighted applicable techniques admitted to the open top band. The oracle is `techniques` at every level; the top-tier proposal flag is separate.

The base clue floors are `40/34/29/25/25/22/17/17/17`, and the 9-digit unit minima are `2/2/1/1/1/0/0/0/0`. The registered variants explicitly copy the hard scale to veryHard; the existing evil factor is the default factor for their nightmare tiers. Killer keeps its existing special floor and zero-unit-minimum strategy.

### 3. Generation — strong positive evidence, but B1–B3 prevent approval

- Stage A enforces the bounded score edge (`G\js\core\digger.js:339–361,995–1004`); dense veryEasy puzzles were reproduced on Mega12, Mega16 and Samurai.
- An exact sample requires **both** completion and the requested level (`digger.js:1353–1354`).
- The downward-addition keep/undo rule itself matches the clarified §5.7(5), including keeping a complete above-band addition and undoing below-minimum or incomplete additions (`digger.js:1184–1225`). The bookkeeping defects are B1/B2, not a reversal of this rule.
- Local clue moves use whole symmetry groups; accepted moves preserve floors and require a complete proof, uniqueness and nondecreasing below-maximum score (`digger.js:1413–1573`). Every independently checked final clue mask, including non-default symmetries, was correct.
- Killer's nightmare tilt, veryHard profile, connected/distinct/minimum-size cage moves, symmetric revealed clues and structure-before-dig placement are consistent with the intended design (`G\js\variants\killer.js:43–64,232–239,875–976,1012–1041,1078–1090`). Keeping the layout search's in-band clue groups is a reasonable generation adjustment, not an unrelated UI change.
- Greater-Than's own tune loop still reveals clue groups and compares level indices. “Never adds clues” applies only to the **new generic local search/refinement**, not to the entire variant (`G\js\variants\greater-than.js:458–496`; `G\js\core\digger.js:1188–1193,1464–1467`). Avoiding additions after the sign set is minimal is justified by the existing minimal-sign invariant; re-pruning signs would be the alternative.
- The uniqueness/objective guards are work-count based and propagate the parent's cancellation/time errors. I found no new wall-clock selection of a different successful puzzle. Ten repeated generations were identical, and the full worker/cancellation suite passed. This does not repair the accounting defects in B2.
- Unrated results are excluded from the outer fallback and eventually produce `digger.noRatedPuzzle` (`digger.js:1577–1585,1812–1816`).

### 4. Qualification and support

The registry and published table agree for all 15 variants: classic4 `{veryEasy}`; classic6 `{veryEasy,hard}`; classic9/Wordoku through nightmare1; the other eleven variants all nine levels. The dedicated support-table test also passes (`G\tests\suites\difficulty.test.js:297–318`).

The normal protocol uses real pipeline requests, default options/symmetry, fixed FNV-derived seeds, complete-proof/exact/no-approximate hits, independent solution validation and nearest-rank p95 over **all returned/error outcomes** (`G\tests\qualify.js:116–165,201–216,303–324`). Temporarily widening the support list in the worker is appropriate for measuring levels that are currently hidden.

The documented early stops are mathematically conservative for a **hidden** verdict: eleven first-round misses preclude the 30-hit extension threshold; eleven total misses preclude 90/100; six over-budget durations cannot pass p95 even over 100 requests. The shortened hidden rows are explicitly labelled. B4 is different: a worker failure produces an incorrectly incomplete **offered** row.

The three 40-seed reruns reproduce the published hit counts, with no invalid/unrated result or generation error. They verify those cells, not all 5,053 historical requests. S4 limits what can be claimed about the exact published engine provenance.

### 5. UI and compatibility

The shared level strings match exactly. Real generator JSON documents have `difficulty.ratingVersion:2`, retain `format:'sudoku-generator/v1'`, and are accepted by the updated player. The rating tag is nested in the correct object (`G\js\ui\export.js:177–190`; `P\js\ui\importer.js:704–720`).

The cache **schema** is bumped to 2 while the storage key remains `sg.cache.v1`, which is sufficient to discard old cached payloads (`G\js\ui\cache.js:81–87,392–404`). History reads preserve stored entries without re-rating them (`G\js\ui\history.js:151–180`). URL/state normalization uses the shared nine-ID ladder and nearest supported level; the strict-symmetry warning still starts at **expert**, not veryHard (`G\js\ui\store.js:241–256,384–390`; `G\js\ui\controls.js:43,83–90`).

I also checked the legacy-history export path: it goes through `SG.store.toConfig` before regeneration (`G\js\ui\export.js:971–982`), so removal of classic4/classic6's old easy offering does not by itself make the Print/Export/Play path pass an unsupported raw level to the pipeline.

**Disposition of the implementer's “beyond §7” list:**

| Change | Judgment |
|---|---|
| Search re-reveal sentence | **Keep:** needed to describe clue additions honestly; fix B3's snapshot order |
| Explain build-model/rating text and pseudocode | **Keep:** scaled bands and a sum of technique costs would now be false; correct the “cheapest” wording in S3 |
| Technique point badges in Help | **Optional; recommend reverting** under S5 |
| Variant-level note and classic9 description | **Keep:** the former six-level wording is now false |
| Four new error messages | **Keep:** unknown weights/no completely rated puzzle require intelligible errors; the two guard-code strings are defensive and normally caught internally |
| Fewer expensive combinations pre-generated | **Keep and report:** using measured costs is part of the cache update and avoids unwanted expensive background work |
| No score table for unratable replay positions | **Keep:** expressly required by §5.5, using the existing unavailable state |

No new screen or game control, stylesheet change, or player gameplay behavior was introduced by the diff reviewed.

### 6. Tests and regression hashes

The full suite is green, but it does not catch the four reproductions above.

The following changed tests are justified by the change in generated puzzles:

- **Killer pruning 20% → 10%:** the algorithm is unchanged but the selected generated layouts differ; the new test samples all 20 hard layouts and still requires nontrivial pruning (`G\tests\suites\killer.test.js:446–466`). This is a statistical fixture expectation, not a uniqueness/soundness invariant. A separate frozen-layout performance check would provide a less calibration-sensitive baseline.
- **Greater-Than clue/sign trends:** adjacent grade means need not be monotone under a score-based ladder. Validity, uniqueness, clue symmetry and minimality of the remaining signs are still tested; loosening the mean-order assertions is appropriate (`G\tests\suites\greater-than.test.js:965–1086`).
- **Killer easy/medium clue ordering:** likewise not a new scoring invariant; removing it is appropriate. The floor and sparse-clue checks remain (`G\tests\suites\killer.test.js:1070–1085`).
- **Technique-bug safety test:** the replacement uses a genuinely unsound guessing technique whose reported proof completes, then requires DFS uniqueness and at least one caught bug. This remains meaningful under the no-incomplete-proof policy (`G\tests\suites\difficulty.test.js:1314–1393`).
- **Additional loosening not in the summary:** the worker test raises the longest guided/sign-dig work slice from 8,000 to 16,000 checks because the expert technique set now includes forcing chains (`G\tests\suites\worker.test.js:519–529`). This is understandable for the new corpus; it does not establish a browser latency guarantee. Cancellation and synchronous/cooperative-equivalence tests remain and pass.

S2 identifies the separate loss of score-independent technique-certificate strength.

I audited the hash diff rather than treating regeneration as proof: the same 20 seeds are retained; the removed combinations are `classic4/easy` and `classic6/easy`; the new combinations are `classic6/veryEasy`, `classic6/hard`, `classic9/veryHard`. Among **460 shared (configuration,seed) entries, 71 hashes are unchanged**. In particular, classic4 / veryEasy and classic9 / veryEasy retain **20/20** each. The current generated hashes pass the full suite. Functional fixes require an intentional subsequent qualification/regression review, not a blind re-recording to make tests pass.

### 7. Documentation

The main design formula, weight table, nine-band ladder, cap constants, Killer profiles, support matrix, cache schema and nested rating-version field generally match the implementation. The exceptions/revisions are S1, S3, S4 and N1–N2. The report's original human-calibration caveat is retained; no new technique IDs or purported human validation were slipped into this implementation.

## Evidence and reproducible commands

All commands below are read-only with respect to the application repositories. Output filenames are relative to the evidence folder (`E\`, `docs\report-v2\gpt-6-astra\evidence`); the instrumentation script changes its own process's working directory to that folder before writing results (set `SG_REVIEW_OUTPUT_PREFIX` to keep the recorded outputs, see `E\README.md`).

### Full suite

```powershell
# from the sudoku-generator repository root
$env:SG_UPDATE_HASHES = $null
node .\tests\node-runner.js
```

Saved output: `E\implementation-tests.log`. `SG_UPDATE_HASHES` was explicitly cleared because that opt-in test mode writes regression fixtures; it was not used.

### Qualification cells

```powershell
Set-Location docs\report-v2\gpt-6-astra\evidence    # from the repository root
node ..\..\..\..\tests\qualify.js --variant=classic6 --level=hard --jobs=1 --quiet --json=implementation-qualified-classic6-hard.json
node ..\..\..\..\tests\qualify.js --variant=killer --level=veryHard --jobs=1 --quiet --json=implementation-qualified-killer-veryHard.json
node ..\..\..\..\tests\qualify.js --variant=mega16 --level=nightmare2 --jobs=1 --quiet --json=implementation-qualified-mega16-nightmare2.json
```

Each file includes all 40 request seeds/outcomes/times and the engine/machine information. Seed base is **20260601**, requests **0–39**, exactly as in the qualification tool.

### Instrumentation and integration checks

Run these from the same experiment directory:

```powershell
node .\implementation-probes.js contracts
node .\implementation-probes.js generation
node .\implementation-probes.js caps
node .\implementation-probes.js cap-boundary
node .\implementation-probes.js replay
node .\implementation-probes.js closest
node .\implementation-probes.js exchange
node .\implementation-probes.js fixtures
node .\implementation-probes.js rejections
node .\implementation-probes.js rejections-high
node .\implementation-qualification-fault.js
```

- `contracts`: exact tie examples, zero-work/zero-empty arithmetic, 499 example, **10,000** allocation cases with seed **2060619**, bilingual player parity, and the minimal replay reproduction.
- `generation`: the explicit 23 default pairs in the script use `seedFor('variant/level/0')`; ten are regenerated identically. The six extra configurations use seed **61843**, `maxAttempts:2`, and `mirrorBoth` or `diagonal`. Results: `implementation-generation.json`.
- `caps`: four real one-attempt requests with actual call/counter instrumentation. `cap-boundary` lowers only the in-memory classic9 attempt cap to 20 and exposes the extra call.
- `replay`: reconstructs the nine cases from the generation sample containing reveal operations and checks the rendered transitions, not just the final dig log.
- `closest`: monitors full ratings in two default qualification misses and the two non-default Killer configurations. The retained witness is independently counted with DFS, cage-validated and re-rated; call origin is included.
- `exchange`: five actual generator exports opened by the player engine in a separate VM context.
- `fixtures`: reads the HEAD regression fixture through Git and the working fixture through the filesystem, compares hashes, calculates the design example, and records the source-fingerprint check.
- `rejections` / `rejections-high`: bounded fixed-seed scans, 90 stage digs each; they found no threshold-crossing witness and are reported as such under S1.
- `implementation-qualification-fault.js`: executes the real scheduler in a VM with an in-memory worker that exits on the last request; it creates no worker process and alters no source file.

Each mode writes `implementation-<mode>.json`. `replay` expects the generation output; `closest` expects the qualification outputs. No individual experiment exceeded 15 minutes.

**Non-finding:** the `contracts` output also records failure when `difficulty` is omitted for classic4/classic6. This is pre-existing: the unchanged pipeline default is `medium`, which neither old nor new versions offer there (`G\js\core\pipeline.js:40,84–87`). I did not classify it as a regression or request an unrelated fix.

## Final repository-state check

The generator still has the original **48 tracked modified files, 2,999 insertions / 1,661 deletions**, plus its pre-existing untracked qualification/docs/research directory. The player still has the **14-file Phase-5 diff, 279 insertions / 46 deletions**. Neither `task.md` is modified. `git diff --check` reports no whitespace error; the existing line-ending warnings are not test failures.

No implementation fixes have been applied by this reviewer. Approval should wait for B1–B4 to be corrected and for their regressions, qualification provenance, and resulting generated-puzzle hashes to be verified against the final source.

## Re-check — Phase 8 (2026-10-19)

**Verdict: the four original blocking reproductions are fixed, but one newly introduced BLOCKING safety-net regression remains (B5 below).**

The reviewed engine fingerprint is **`12f460a1f057f943`**, matching the final qualification's raw JSON and the updated support document. I did **not** run the full suite, re-run the multi-hour pruning comparison, or alter either repository or the index. The existing staged/unstaged changes were left alone. The original Phase-6 evidence is preserved: an output-prefix option in my research-only probes writes this re-check's outputs as `E\phase8-*.json`.

### Requested probe results

| Probe | Independently reproduced result |
|---|---|
| `closest` | **4/4** returned scores equal the closest verified encountered scores: 33, 682, 631, **1581**; each has one DFS solution |
| Original Killer / expert witness | Seed **61843**, `diagonal`, `maxAttempts:2`, now returns **evil / 1581**, not veryHard / 790 |
| `caps` | Actual full-rating calls = counted calls: **99 / 13 / 7 / 258** for the four original cases |
| `cap-boundary` | **20 actual = 20 counted**, cap 20; no 21st call |
| `replay` | **Nine cases, zero errors** in final reconstruction, removed-cell marks, reveal ordering and snapshot clue counts |
| `contracts` | Correct synthetic before/after reveal snapshots; all three tie examples and zero-work/zero-empty examples unchanged; **10,000/10,000** apportioned sums correct; EN/VI names/descriptions match the player |
| `qualification-fault` | Expected **exit 1**: “a worker stopped unexpectedly (code 1) with classic4/veryEasy #39 in flight”; no qualification JSON published |

The fixes are visible in `G\js\core\digger.js:1176–1194` (capacity check and unrated state), `digger.js:1231–1277` (candidate keeper), `digger.js:1479–1488,1729–1731` (reuse of known ratings), `G\js\variants\greater-than.js:478–518` (counted tuning and retained ratings), `G\js\ui\player.js:370–383` (flush before reveal), and `G\tests\qualify.js:205–224,353–438` (complete outcome counts and worker/IPC failure handling).

### B5 — BLOCKING: the new Killer keeper-return path bypasses the independent uniqueness safety net

**Locations:** `G\js\variants\killer.js:909–913,940–962,994–1003`; `G\js\core\digger.js:1980–1985`.  
**Required invariant:** `G\design.md:630,1750` explicitly retains the risk-R3 final independent DFS check and “every generated puzzle has exactly one solution.” The existing safety-net implementation remains at `G\js\core\digger.js:1094–1117`, but the newly selected keeper result does not pass through it.

Killer checks a layout independently only when `needsCount(r)` is true. When a complete reported proof uses no uniqueness-assuming technique, it trusts `provesUniqueness(r)` and offers the layout to the keeper without a count. The outer loop can then publish that retained layout directly through `keptPuzzle`. This bypasses the independent safety net that previously checked a structure-search layout after it went through the ordinary dig.

**Bounded fault-injection reproduction, not an allegation of a bug in a currently shipped technique:** the research probe registers one deliberately faulty technique, analogous to the existing risk-R3 guessing-technique tests. On an ambiguous cage-search model, it places values from a DFS solution without proving uniqueness; it does not mutate the solver state. It has an explicit test-only weight of 350 and does not declare `assumesUniqueness`. All of these additions exist only inside the probe's Node process and are restored afterwards.

With:

```js
{
  variantId: 'killer',
  difficulty: 'expert',
  seed: 61843,
  symmetry: 'diagonal',
  maxAttempts: 1,
  trace: 'off'
}
```

the real pipeline returns:

```text
rating.solved = true
rating.level = veryHard
rating.score = 945
test guessing-technique uses = 73
warnings = ['difficulty.approximate']
independent SG.dfs.countSolutions(..., 2) = 2
```

Thus the new path can return an ambiguous puzzle instead of enforcing the retained safety-net contract. No standard technique was changed and no source file was patched. The original four positive probes still pass because their real techniques produced valid proofs.

**Concrete fix:** independently verify a Killer layout before it can replace the keeper's best candidate, even when its logical report purports to prove uniqueness. It is sufficient to do this for candidates eligible to improve the keeper, rather than every trial. Keep the existing deterministic uniqueness guard/cancellation behavior. Do not merely check and discard the single final keeper result after losing earlier valid candidates: that would reintroduce B1. Retain the closest independently verified candidate, or the specified error path if none exists; do not publish an ambiguous candidate. Preserve/report the unsound-technique warning when an actual contradictory uniqueness count is found.

**Regression:** the new research-only `keeper-safety` mode must return a unique puzzle or the permitted error, never a two-solution puzzle. Add equivalent coverage to the Killer keeper/fallback safety tests alongside the existing ordinary-dig guessing-technique tests.

**Evidence:** `E\phase8-keeper-safety.json`; reproduction:

```powershell
Set-Location docs\report-v2\gpt-6-astra\evidence    # from the repository root
$env:SG_REVIEW_OUTPUT_PREFIX = 'phase8'
node .\implementation-probes.js keeper-safety
```

### Synthetic Killer fallback replay

The normal, unmodified-technique witness now returns **1581** with exactly one solution, correct cages and clue symmetry. Its compact log contains **one `pass:'random'`**, but the existing UI batcher renders **eight random-removal steps**, not literally one displayed batch. Starting from the full solution, both the compact-log reconstruction and the final rendered snapshot equal the returned puzzle; all replay checks report zero errors.

This is a **synthetic construction of the selected layout's puzzle**, not a chronological replay of all cage-search attempts. That distinction, and the actual batching, should be stated when reporting the small visible change. Under the requested “reconstruction = returned puzzle” criterion the normal fallback is correct. Source: `G\js\variants\killer.js:900–913`. Evidence: `E\phase8-fallback-replay.json`.

### S1–S5 and N1–N2

- **S1 accepted as the explicitly documented measured heuristic.** The false monotonicity justification is removed (`G\js\core\digger.js:825–838`; `G\design.md:543,614`). I checked the other researcher's raw `experiments\phase7\qualifyA.json` and `qualifyB.json`: summed first-round durations are **1,530.548 s** and **7,020.825 s**, a **4.587×** ratio, and the reported seven offered levels are lost in B. Caveat: these are early-stopped qualification runs with **5,054 versus 5,032 outcomes**, not a perfectly paired 5,400-request experiment. The evidence supports the stated engineering trade-off, not a monotonicity theorem.
- **S2 fixed:** the original score-independent certificates now use explicit `singles`, `locked`, `subsets`, `fish`, `wings`, and `chains` ID sets (`G\tests\fixtures\rated.js:98–180`). Medium is still tested against locked candidates and evil against the full no-chain set; new score labels remain separate.
- **S3 fixed:** EN/VI version caveats, rating-version metadata, cache invalidation and stored-history behavior are documented; Help and Explain say fixed technique-priority order (`G\README.md:83–88,857–862`; `G\js\ui\help.js:1234–1238,1288–1292,1493–1497,1544–1548`). The changes in `logical-solver.js` and `techniques.js` are comments only.
- **S4 provenance reconciled:** raw `experiments\phase7\qualify-final.json` identifies the current **12f460a1f057f943** engine, totals **5,055** outcomes, and contains **4,718/4,720** hits on **118** offered pairs. Its support lists equal the current registry exactly. I checked those raw totals, not merely the prose. The parent's full-suite/hash-generation verification is not duplicated here.
- **S5 fixed:** the extra Help point-badge span and its text keys are removed; the data needed for the ladder remain.
- **N1 fixed:** the schema example now says **502 / rawScore 502 / confidence 0.68** (`G\design.md:1621–1625`).
- **N2 fixed:** the full-soak estimate is now approximately **3,550** in EN/VI and the design; the quick preset is also described by its actual allocation.

### Re-check artifacts and scope

The requested modes were run with:

```powershell
$env:SG_REVIEW_OUTPUT_PREFIX = 'phase8'
node .\implementation-probes.js closest
node .\implementation-probes.js caps
node .\implementation-probes.js cap-boundary
node .\implementation-probes.js replay
node .\implementation-probes.js contracts
node .\implementation-qualification-fault.js  # expected exit 1; no JSON publication
```

Additional narrowly targeted modes: `fallback-replay` and `keeper-safety`. Results are the corresponding `E\phase8-*.json` files; expected qualification failure output is `E\phase8-qualification-fault.log`. Baseline `implementation-*.json` files were not overwritten. No full suite, fresh full qualification, or repository/index mutation was performed by this re-check.

**Approval is withheld only for B5 above.** The original B1–B4 reproduction cases and the requested documentation/compatibility follow-ups are otherwise resolved, subject to the parent's final test run.
