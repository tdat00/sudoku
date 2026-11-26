# Independent Audit of Plan v4 (`improve-generating`) on Final `main` (`rating-v3`)

- **Auditor:** Neon (Gemini 4 Neon)
- **Date:** 2026-11-26
- **Audited source baseline:** `improve-generating` rebased onto `main` (`1cfc810c`, PR #2 `rating-v3` post-MS18e; branch tip `85d7ed9c`).
- **Audited documents:** [plan.md](plan.md) (v4, 2026-11-15, SA-Fable / SA-Opus / SA-Astra), [plan-v3-joint-report.md](plan-v3-joint-report.md), [speed-main-v3-v4.md](speed-main-v3-v4.md).
- **Authoritative post-freeze references:** [qualification.md](../difficulty-rating/qualification.md) (MS18c, 2026-11-19), [limits-v3.md](../difficulty-v3/limits-v3.md), [performance-v3.md](../difficulty-v3/performance-v3.md) (MS18d), [release-v3.md](../difficulty-v3/release-v3.md), and [e4a-summary.md](../difficulty-v3/evidence/MS18e/e4a-summary.md) (MS18e, 2026-11-20).
- **Verification environment:** Windows, Node `v26.8.2`, serial (`--jobs=1`), zero edits to repository production/test/fixture files (in-memory instrumentation and A/B parity harnesses run directly on exact MS18c seeds from `docs/difficulty-v3/evidence/MS18c/merge/qualification-v3.json`).

Evidence labels: **M** (Measured directly on `1cfc810c`), **Q18c** (official MS18c qualification record), **D** (Derived mathematically or from source control flow), **P** (Projection via Amdahl's law from measured shares).

---

## 1. Executive Verdict

At the time it was approved (**2026-11-15**, against checkpoint `MS07e`), **Plan v4** demonstrated strong methodological discipline: a clear intrinsic-vs-generator contract boundary (§3.1), strict parity rules, and refusal to project unmeasured multipliers.

**However, against final frozen `main` (`1cfc810c`, post-MS18e), Plan v4's approach set is NO LONGER OPTIMAL.** Both its target list and its primary optimization strategy have been invalidated by MS08–MS16:

1. **Plan v4's core retargeting premise inverted after MS08–MS16:** Plan v4 narrowed its scope assuming most Nightmare cells already passed fast under `MS07e` and that only tail/failure latency remained (lines 11–13, §2.2). In final MS18c qualification, the 14 newly added finders (notably `finnedSwordfish`, `lawOfLeftovers`, `alsXz`, `sueDeCoq`, `groupedForcing`, and `wxyzWing`) slowed Nightmare/Hell generation by **5x–42x**, causing **10+ cells with 93–100% exact hit rates to be hidden SOLELY FOR TIME** (`mega16/nightmare` 25/25 at 60.8s, `jigsaw9/nightmare` 27/27 at 18.1s, `greaterThan/nightmare` 13/13 at 46.1s, `sohei/nightmare` 29/30 at 78.8s, `killer/hell2` 40/40 at 21.2s, `samurai/hell2` 40/40 at 43.6s, `greaterThan/normal` 40/40 at 10.2s, `greaterThan/expert` 38/40 at 14.3s, `diagonalX/expert` 37/40 at 11.8s).
2. **`S5a` (Attempt Pool) cannot rescue the hidden 100%-exact cells:** Direct runs show `mega16/nightmare`, `sohei/nightmare`, `greaterThan/nightmare`, `killer/hell2`, and `classic9/nightmare` frequently hit exact on **attempt 1** (`att = 1/2` or `1/8`), where `S5a` yields **0% speedup** (or regresses). Furthermore, boards with >144 cells have `defaultMaxAttempts = 2`, capping `S5a` at 2 workers and leaving 4-core pools underutilized.
3. **High-impact Equal-Result optimizations (zero puzzle, rating, or hash changes) were missed because MS08–MS16 did not exist when Plan v4 was written:**
   - **Finding #1 (M):** `finnedSwordfish` is the #1 bottleneck across multiple slow cells (`sohei/nightmare` **59.2%**, `killer/hell2` **35.8%**, `mega16/nightmare` **35.3%**, `greaterThan/nightmare` **18.2%**, `jigsaw9/nightmare` **15.4%**). Exact geometric pruning inside `finnedOf` achieved **16.34x** speedup with **40/40 parity** (Finding, `work`, and `capHit`).
   - **Finding #2 (M):** `lawOfLeftovers` accounts for **35.5–40.5%** of total wall time on `jigsaw9/nightmare` (the primary driver of its 42x slowdown). Caching static model geometry + O(1) `peerMatrix` + flat typed-array scratch achieved **16.50x** speedup with **40/40 parity**.
   - **Finding #3 (M):** `alsXz` accounts for **10.2–24.9%** of total wall time across `classic9`, `greaterThan`, `mega16`, `jigsaw9`, and `hell1`. Replacing `Array.indexOf` and per-pair array allocations with O(1) `peerMatrix` and bitmask intersection achieved **2.29x whole-call / 3.36x pair-phase** speedup with **30/30 parity** (before even optimizing `enumerate`).
   - **Finding #4 (M):** Intra-solve duplicate work on the **exact same unmodified `state`** inside `logicalSolver` (**A1**): `forcingChainLong` immediately following `forcingChain` consumes **3.6–18.2%** of total wall time (`killer/hell2` **18.2%**, `greaterThan/nightmare` **10.7–13.9%**, `mega16/nightmare` **7.0%**); `sueDeCoq` re-enumerating ALSs immediately after `alsXz` consumes **2.5–4.4%**; `nishioDeep` re-scanning `depth = 1` immediately after `nishio` consumes **14.5%** on `classic9/hell1`.
   - **Finding #5 (M):** `Greater-Than` invokes `SG.model.create(...)` up to **24,815 times in a single request** (`1,039.3 ms` direct cost, while invalidating every `WeakMap(model)` cache across the engine 24,815 times); `Killer` exhibits the same pattern in `modelWithCages` (115–509 calls/request).
   - **Finding #6 (M):** On `S-AV11` (`jigsaw9/expert` seed 1111, 335.2 s in `fullGrid` in MS18e), **attempt #4** is the exact culprit trapped by `unlimited = Infinity` after restart 50 in `full-grid.js`. Replacing `Infinity` with a **Luby restart schedule (`base = 200`)** solves attempt #4 in **28.3–45.1 ms** (**~7,400x–11,800x faster**).
   - **Finding #7 (D + M via `SG.difficulty.breakdown`):** `Hell 1`'s `0/112` exact rate is a structural artifact of the `rating v3` score formula (`tier(hell1)` contains only `nishioDeep` at weight 2600, leaving an upper limit on all non-`nishioDeep` work of only **`1,984` pts** on `classic9` and **`1,813` pts** on `samurai` before overshooting into `hell2 >= 3600`).

---

## 2. Target Comparison: Plan v4 (Checkpoint Q) vs Final `main` (MS18c)

Sources: [plan.md](plan.md#L83-L96) and [qualification.md](../difficulty-rating/qualification.md#L125-L179) (**Q18c**).

| Cell | Plan v4 basis (MS07e Q) | Final `main` (MS18c) | Budget | Optimization implication |
|---|---|---|---:|---|
| `mega16/nightmare` | Pilot 4/4 (mean 11.8s) | **25/25 (100%)**, p50 15.1s, **p95 60.8s** | 30s | Hidden **for time only**; needs ~2.5x single-attempt/solver gain |
| `sohei/nightmare` | Pass (p95 7.59s) | **29/30 (97%)**, p50 17.2s, **p95 78.8s** | 30s | Hidden **for time only**; needs ~3x |
| `samurai/nightmare` | Pass (p95 7.56s) | 14/17 (82%), p50 32.3s, **p95 120.0s** | 30s | Hidden for time + timeout; needs ~4x+ |
| `jigsaw9/nightmare` | Pass (p95 0.429s) | **27/27 (100%)**, p50 4.86s, **p95 18.1s** | 10s | **42x slower**, hidden for time only; needs ~2x |
| `greaterThan/nightmare` | Pass (p95 5.18s) | **13/13 (100%)**, p50 12.9s, **p95 46.1s** | 10s | **9x slower**, hidden for time only; needs ~5x |
| `killer/hell2` | Not listed as target | **40/40 (100%)**, p50 2.95s, **p95 21.2s** | 10s | Hidden **for time only** (`extraStructure` 97.6%) |
| `samurai/hell2` | Not listed as target | **40/40 (100%)**, p50 16.2s, **p95 43.6s** | 30s | Hidden **for time only**; needs ~1.5–2x |
| `greaterThan/normal` | Pass (p95 9.63s) | **40/40 (100%)**, **p95 10.2s** | 10s | 1.9% over budget — hidden for time only |
| `greaterThan/expert` | Pilot 1/2 | **38/40 (95%)**, **p95 14.3s** | 10s | Hidden **for time only**; needs ~1.5x |
| `diagonalX/expert` | Not listed | **37/40 (93%)**, **p95 11.8s** | 10s | Hidden **for time only**; needs ~1.2x |
| `greaterThan/master` | "Demonstrated time target" (14.48s) | **40/40 (100%)**, **p95 5.95s (OFFERED)** | 10s | Already passes in MS18c |
| `classic9/nightmare` (control) | 0.14s / 0.26s | **0.94s / 2.79s** (10.7x slower) | 10s | Still passes, much thinner margin |
| `hyper/nightmare` (control) | 0.22s / 0.71s | **1.83s / 8.50s** (12.0x slower) | 10s | Near 10s ceiling |
| `butterfly/nightmare` (control) | 0.54s / 1.97s | **3.94s / 16.1s** (8.2x slower) | 30s | 8x slower |

---

## 3. Empirical Verification on Final `main` (`1cfc810c`)

### 3.1 Experiment 1 — Finder, Attempt, and Redundancy Profile (**M**)

Executed 11 representative requests using exact seeds from `docs/difficulty-v3/evidence/MS18c/merge/qualification-v3.json` (median `p50` and ~p85 `slow` requests). Absolute times on the local machine (`v26.8.2`, serial) are roughly 2x faster than the EPYC `--jobs=4` MS18c host, while **per-finder time shares (%) and attempt counts are deterministic invariants**.

| Cell (tag) | Seed | Wall (ms) | `att` | Exact | Top finders (% of total wall time) | `models` (`SG.model.create`) | A1 same-state duplicates (`fcL` / `sdc` / `nD`) |
|---|---|---:|:---:|:---:|---|---:|---|
| `classic9/nightmare` (p50) | `3781267577` | 418.2 | **1/8** | true | `alsXz` 18.2%, `finnedSwordfish` 12.5%, `wxyzWing` 8.6%, `forcingChain` 7.5%, `finnedXWing` 5.8%, `forcingChainLong` 5.0% | 1 (0.4 ms) | `fcL` 5.0%, `sdc` 3.2% |
| `classic9/nightmare` (slow) | `462826589` | 977.4 | 3/8 | true | `alsXz` **24.9%**, `finnedSwordfish` 8.8%, `forcingChain` 8.0%, `forcingChainLong` 6.5%, `wxyzWing` 5.3%, `finnedXWing` 4.6% | 1 (0.1 ms) | `fcL` 6.5%, `sdc` 3.5% |
| `jigsaw9/nightmare` (p50) | `3236444067` | 2,520.7 | 2/8 | true | **`lawOfLeftovers` 40.5%**, `finnedSwordfish` 12.5%, `alsXz` 10.2%, `forcingChain` 7.4%, `finnedXWing` 4.8%, `forcingChainLong` 3.9% | 2 (0.2 ms) | `fcL` 3.9%, `sdc` 1.4% |
| `jigsaw9/nightmare` (slow) | `955232336` | 8,031.0 | 4/8 | true | **`lawOfLeftovers` 35.5%**, `finnedSwordfish` **15.4%**, `alsXz` 10.6%, `forcingChain` 9.6%, `finnedXWing` 5.2%, `forcingChainLong` 3.6% | 2 (0.2 ms) | `fcL` 3.6%, `sdc` 1.4% |
| `greaterThan/nightmare` (p50) | `743661144` | 6,849.6 | **1/8** | true | **`alsXz` 21.2%**, **`finnedSwordfish` 18.2%**, **`forcingChain` 17.3%**, **`forcingChainLong` 13.9%**, `finnedXWing` 6.2%, `sueDeCoq` 4.4% | **1,407** (64.1 ms) | `fcL` **13.9%**, `sdc` **4.4%** |
| `greaterThan/nightmare` (slow) | `676550668` | 18,886.4 | 3/8 | true | **`alsXz` 20.4%**, **`finnedSwordfish` 18.1%**, **`forcingChain` 14.8%**, **`forcingChainLong` 10.7%**, `finnedXWing` 5.6%, `sueDeCoq` 3.6% | **24,815** (1,039.3 ms) | `fcL` **10.7%**, `sdc` **3.6%** |
| `mega16/nightmare` (p50) | `2403627244` | 7,597.7 | **1/2** | true | **`finnedSwordfish` 35.3%**, `alsXz` 13.0%, `forcingChain` 12.1%, `forcingChainLong` 7.0%, `finnedXWing` 6.6%, `wxyzWing` 4.9% | 1 (0.2 ms) | `fcL` **7.0%**, `sdc` 3.4% |
| `sohei/nightmare` (p50) | `4010337793` | 8,531.1 | **1/2** | true | **`finnedSwordfish` 59.2%**, `forcingChain` 7.7%, `finnedXWing` 5.2%, `alsXz` 5.1%, `wxyzWing` 4.6% | 1 (0.2 ms) | `fcL` 1.5%, `sdc` 1.1% |
| `killer/nightmare` (p50) | `617313647` | 3,188.2 | 3/8 | true | `finnedSwordfish` **15.5%**, `forcingChain` 8.0%, `ruleOf45` 4.8%, `cageCombo` 4.0%, `finnedXWing` 3.8%, `forcingChainLong` 3.1% | **509** (26.1 ms) | `fcL` 3.1%, `sdc` 0.5% |
| `killer/hell2` (slow) | `2090100668` | 5,608.5 | **1/8** | true | **`finnedSwordfish` 35.8%**, **`forcingChain` 20.9%**, **`forcingChainLong` 18.2%**, `finnedXWing` 6.6%, `nishio` 3.1% | **115** (7.2 ms) | `fcL` **18.2%**, `sdc` 1.8% |
| `classic9/hell1` (p50) | `3777041142` | 6,755.3 | 8/8 | false | **`alsXz` 21.2%**, **`nishioDeep` 14.5%**, `finnedSwordfish` 9.6%, `forcingChain` 6.8%, `forcingChainLong` 4.9%, `wxyzWing` 4.7% | 1 (0.1 ms) | `fcL` 4.9%, `sdc` 2.5%, `nD` **14.5%** |

Stage timing (`pipeline.timings`) and `work` breakdown on four headline requests (**M**):
- `sohei/nightmare` (`4010337793`): `dig = 8,386 ms` (**98.1%**), `rate = 153 ms`, `att = 1`, `ratings = 156`, `localSearches = 0`.
- `mega16/nightmare` (`2403627244`): `dig = 8,485 ms` (**99.6%**), `rate = 34 ms`, `att = 1`, `ratings = 83`, `localSearches = 0`.
- `jigsaw9/nightmare` (`3236444067`): `dig = 2,467 ms` (**97.2%**), `rate = 64 ms`, `att = 2` (attempt 1: `ratings = 270`, `ls = 1`; attempt 2: `ratings = 36`, `ls = 0`).
- `killer/hell2` (`2090100668`): **`extraStructure = 5,606 ms` (97.6%)**, `dig = 138 ms`, `att = 1`, `ratings = 102`, `proposals = 305`, `localSearches = 0`.

**Key takeaways:**
1. **`finnedSwordfish` + `finnedXWing` + `alsXz` + `lawOfLeftovers` + `forcingChain`/`forcingChainLong`** account for **55%–85% of total wall time** across nearly every slow cell — yet Plan v4 contains **zero optimization proposals** for any of these MS09–MS16 finders.
2. **5 of 10 exact samples hit on `attempt = 1`** (including `mega16/nightmare`, `sohei/nightmare`, `greaterThan/nightmare`, `killer/hell2`), confirming that `S5a` alone cannot restore the hidden 100%-exact cells.
3. On `killer/hell2`, **97.6% of time is spent inside `extraStructure` (`searchCagesSteps`)** — neither `S5a` nor `digGuided` parallelism touches it; **only solver/finder optimization accelerates Killer**.

---

### 3.2 Experiment 2 — A/B Kernel Micro-Benchmarks with 100% Parity Verification (**M**)

Evaluated on real board positions captured directly from the Experiment 1 runs, asserting exact equality of eliminations, `work` counters, and `capHit` flags between the production code and equal-result optimized prototypes:

| Equal-Result Optimization | Captured positions | Parity | Production | Optimized | Kernel speedup | Mechanism |
|---|---:|:---:|---:|---:|---:|---|
| **`finnedSwordfish`** ([tech-fish.js](../../core/js/engine/tech-fish.js#L1071-L1118)) | 40 | **40/40** (Finding + `work` + `capHit`) | 265.7 ms | **16.3 ms** | **16.34x** | Exact geometric pruning inside `finnedOf` (preserving `spend(run)` unchanged): (1) reject immediately if `pool <= size` or `pool > size + maxBoxCovers`; (2) verify at least one candidate `finBox` leaves `<= size` forced covers outside it before enumerating `C(pool, 3)`. |
| **`lawOfLeftovers`** ([tech-subset.js](../../core/js/engine/tech-subset.js#L321-L450)) | 40 (`jigsaw9`) | **40/40** (eliminations) | 13.6 ms | **0.8 ms** | **16.50x** | Cache static model geometry of valid `(lineUnits, regionUnits)` pairs (1–4 leftover cells) and their `seen` masks (`peerMatrix` O(1)); replace per-signature `new Int32Array` allocations with a flat typed-array pool. *(Production implementation must retain exact unit-selection `spendLeftover` accounting to preserve `work` cap parity).* |
| **`alsXz` pair phase** ([tech-als.js](../../core/js/engine/tech-als.js#L400-L501)) | 30 | **30/30** (Finding + `work` + `capHit`) | 31.1 ms total / 31.4 ms pair | **13.6 ms** total / **9.3 ms** pair | **2.29x total / 3.36x pair** | Replace `sees()` (`Array.indexOf`) with O(1) `peerMatrix`; replace `commonDigits` / `sharesCell` allocations with `aMask & bMask` bitmask check (`(m & (m - 1)) === 0` skips in 2 ops); `enumerate` and `chargeUnit` untouched. |

*(Applying the identical `finnedOf` pruning to `finnedXWing` removes an additional 4–7% of wall time across all boards.)*

---

### 3.3 Experiment 3 — Luby Restart Verification on `S-AV11` (`jigsaw9/expert` seed 1111) (**M**)

In MS18e ([e4a-summary.md](../difficulty-v3/evidence/MS18e/e4a-summary.md#L55)), `jigsaw9/expert` seed `1111` took **342.1 s**, with **335.2 s (98.0%)** summed across 5 `fullGrid` attempts. Testing each attempt `grid#1`..`grid#8` individually on the exact `jigsaw9` layout generated from `rng(1111).fork('model')`:

| Attempt | Current `full-grid.js` (`threshold = 4050`, `unlimited` from restart 50) | **Luby Restart (`base = 200`, no `Infinity`, 200k total bt cap)** | Notes |
|---:|---|---|---|
| `#1` | 27.7 ms (9 restarts, 38,538 bt) | **11.8 ms** (33 restarts, 16,640 bt) | 2.3x faster |
| `#2` | 36.8 ms (13 restarts, 53,141 bt) | **3.8 ms** (13 restarts, 4,491 bt) | 9.7x faster |
| `#3` | 99.4 ms (36 restarts, 146,204 bt) | **13.5 ms** (36 restarts, 17,604 bt) | 7.4x faster |
| **`#4`** | **TIMED OUT > 3,000 ms** *(exact culprit of the 335,178 ms stall in MS18e)* | **28.3 ms** (64 restarts, 38,665 bt) | **~11,800x faster (335s → 28ms)** |
| `#5` | 19.6 ms (7 restarts, 29,816 bt) | **3.2 ms** (9 restarts, 2,832 bt) | 6.1x faster |
| `#6` | 30.1 ms (10 restarts, 44,193 bt) | **2.9 ms** (11 restarts, 3,418 bt) | 10.4x faster |
| `#7` | 28.6 ms (11 restarts, 44,562 bt) | **2.7 ms** (11 restarts, 3,412 bt) | 10.6x faster |
| `#8` | 7.9 ms (3 restarts, 12,155 bt) | **0.6 ms** (3 restarts, 805 bt) | 13.2x faster |

**Implication for `S7`:** Adding only a total-work ceiling as proposed in Plan v4 (§3.6) burns the entire ceiling and discards attempt #4. Removing `unlimited = Infinity` in favor of a **Luby restart schedule** plus declaring `restartThreshold: 200` on `jigsaw9` (matching [jigsaw.js](../../generator/js/variants/jigsaw.js#L42-L47), which already proved `SOLVE_RESTART = 200` drops layout stalls from 6% to <1%) solves **all 8 attempts combined in 66.8 ms**, while keeping S7's total-work cap as a deterministic fail-safe.

---

### 3.4 Experiment 4 — Exact Mathematical Bound for `Hell 1` (**D** + **M** via `SG.difficulty.breakdown`)

From [difficulty.js](../../generator/js/engine/difficulty.js#L81-L138):
- The `hell1` band is `[2400, 3600)`; `floor(hell1)` covers everything up to `nishio` (1700); **`tier(hell1)` contains only one technique: `nishioDeep` (weight 2600)**.
- Evaluating `SG.difficulty.breakdown` directly to find the maximum total weight $W_{\text{other}}$ of all non-`nishioDeep` steps that keeps `score < 3600`:

| Board (representative empty count `E`) | `1x nishioDeep` alone | **Max $W_{\text{other}}$ for `score < 3600`** | `2x nishioDeep` | `1x nishioDeep + 1x nishio + 300` |
|---|---:|---:|---:|---:|
| `classic9` (`E = 55`, `V = 46.3`) | `3296` | **`1,984` pts** | `3677` (`hell2`) | `3601` (`hell2`) |
| `mega16` (`E = 180`, `V = 65.5`) | `3315` | **`1,839` pts** | `3696` (`hell2`) | `3621` (`hell2`) |
| `samurai` (`E = 250`, `V = 69.0`) | `3319` | **`1,813` pts** | `3699` (`hell2`) | `3624` (`hell2`) |

**Implication for Plan v4 §5.5:** Any puzzle needing **two `nishioDeep` steps** or **one `nishioDeep` + one `nishio` + minor steps** automatically overshoots into `hell2` ($\ge 3600$). Speed improvements or `S5a` will shorten `hell1` misses, **not produce offerable `hell1` exact yield under v3 weights**. This algebraic constraint should be documented up front rather than spending F5 budget to rediscover it.

---

## 4. Superior Optimization Set (Ranked by Priority & ROI)

### Group 1 — 100% Equal-Result (Identical Puzzles, Ratings, and Hashes; No `generatorVersion: 2` Required; Benefits Both `file://` Serial and Browser Workers)

| ID | Optimization | Target files | Projected impact (**P**, Amdahl from Exp 1–2) | Comparison vs Plan v4 |
|---|---|---|---|---|
| **N1** | **Pruned `finnedOf` for `finnedSwordfish` & `finnedXWing`:** reject `pool <= size \|\| pool > size + maxBoxCovers` and verify a feasible `finBox` before enumerating `C(pool, size)` | [tech-fish.js](../../core/js/engine/tech-fish.js#L1071-L1118) | **16.3x** kernel → cuts **~60%** wall time on `sohei/nightmare`, **~39%** `mega16/nightmare`, **~40%** `killer/hell2`, **~22%** `greaterThan/nightmare`, **~19%** `jigsaw9/nightmare` | **New** — absent from Plan v4 |
| **N2** | **Optimized `lawOfLeftovers`:** cache static valid `(lineUnits, regionUnits)` geometry per `model` + O(1) `peerMatrix` + flat typed-array pool (retaining `spendLeftover` cap parity) | [tech-subset.js](../../core/js/engine/tech-subset.js#L321-L450) | **~10–16x** kernel → cuts **~33–38%** wall time on `jigsaw9/nightmare` (with N1: **~2.2–2.5x** pure serial) | **New** — directly rescues `jigsaw9/nightmare` |
| **N3** | **Optimized `alsXz` & `sueDeCoq`:** O(1) `peerMatrix` replacing `Array.indexOf`, bitmask `aMask & bMask` in `xzSearch`, reusable typed-array scratch for `enumerate` and `recordOf` | [tech-als.js](../../core/js/engine/tech-als.js#L287-L501) | **2.3x–3.4x** (higher once `enumerate` is also scratch-backed) → cuts **~12–16%** on `classic9/nightmare`, `greaterThan/nightmare`, `classic9/hell1` | **New** — far safer and higher ROI than `K2` |
| **N4** | **Intra-solve per-step memoization via `stateVersion` in `logicalSolver`:** reuse (1) `buildGraph + adjacency` (including `capHit`) from `forcingChain` to `forcingChainLong`, (2) `enumerate` from `alsXz` to `sueDeCoq`, (3) completed `depth = 1` scan from `nishio` to `nishioDeep`, fast-forwarding exact `work` and `ctx.check()` | [logical-solver.js](../../core/js/engine/logical-solver.js#L237-L302), [tech-chain.js](../../core/js/engine/tech-chain.js#L833-L940), [tech-als.js](../../core/js/engine/tech-als.js#L512-L804) | Cuts **5–18%** wall time directly (`killer/hell2` **~18%**, `greaterThan/nightmare` **~14–18%**, `classic9/hell1` **~15–20%**) | **New** — eliminates pure redundant work |
| **N5** | **Optimized `constructGraph` & `searchAdjacency` in Grouped Forcing:** eliminate duplicate `completeUnits` scan ([L1342-L1359](../../core/js/engine/tech-chain.js#L1342-L1359)), reuse `WeakMap` typed-array scratch (`stamp/parent/dist/queue/mark`), replace `join(',')` string keys and per-node JS arrays | [tech-chain.js](../../core/js/engine/tech-chain.js#L1147-L1415) | Cuts `forcingChain` cost (7–21% share) and GC pressure | **New** — supersedes `K2` priority |
| **N6** | **Eliminate `WeakMap(model)` cache thrashing in `Greater-Than` & `Killer`:** key static base-grid geometry and scratch pools by board shape / shared geometry rather than fresh `SG.model.create` instances (`withSigns` called 24,815x; `modelWithCages` 115–509x) | [greater-than.js](../../generator/js/variants/greater-than.js#L106-L123), [killer.js](../../generator/js/variants/killer.js#L901), `core/js/engine/*.js` | Cuts **>1,000 ms** direct overhead + all cold-cache/GC churn on `greaterThan/nightmare` (~6–10%+) and `Killer` | **New** — undetected in Plan v4 |
| **N7** | **Two-Tier Adaptive Worker Pool (`digGuidedSteps` candidate pool + selective `S5a`):** share a single 4-worker pool; during attempt-1 head-start or on 2-attempt boards, distribute the independent `digGuidedSteps` candidate pool ([digger.js](../../generator/js/engine/digger.js#L833-L855)) across all 4 workers (**0% speculative waste, 100% equal-result**); launch speculative attempts 2..4 (`S5a`) only after the head-start threshold | [digger.js](../../generator/js/engine/digger.js#L833-L855), [worker-client.js](../../generator/js/worker/worker-client.js) | Fixes `S5a`'s blind spot on **attempt-1 hits** and **2-attempt boards (`mega16`, `samurai`, `sohei`)** without speculative CPU bloat | **Strictly stronger than `S5a` alone** |
| **N8** | **Early-abort in `localSearch` when `keeper.distance < 1000`:** once any in-band candidate (e.g., `shallow`, quality `0.5`) is held, any neighbor with `score >= spec.max` has `qualityOf >= 1000` and can never beat `keeper` or `follows` → abort `logicalSolver` via Predictive Lookahead Bound *(disabled under node-budget tests)* | [digger.js](../../generator/js/engine/digger.js#L1753-L1774), [logical-solver.js](../../core/js/engine/logical-solver.js#L246-L264) | Skips `nishioDeep`/`nishio`/`forcingChainLong`/`alsXz` on every overshooting move in `localSearch` | **Equal-result extension of `S4`** |

### Combined Projection for Group 1 (**N1–N6 Serial Only**, Before Worker Pool **N7**) (**P**)

Amdahl scenario combining N1 (`finnedSwordfish/XWing` ~15x), N2 (`lawOfLeftovers` ~15x), N3 (`alsXz` ~2.3x), N4 (intra-solve dedup), and N5/N6:

| MS18c time-hidden cell | MS18c p95 / Budget | Targeted share (measured in Exp 1) | Projected p95 after **N1–N6 (serial)** | Projected p95 with **+ N7 (4-worker pool)** | Recovery outlook |
|---|---:|---:|---:|---:|---|
| `sohei/nightmare` (29/30) | 78.8s / 30s | ~70% (`finned` 64% + `als`/`fc`) | **~28–33s** (~2.4–2.8x) | **~15–22s** | **Very high** |
| `mega16/nightmare` (25/25) | 60.8s / 30s | ~62% (`finned` 42% + `als` 13% + `fcL` 7%) | **~28–34s** (~1.8–2.2x) | **~15–22s** | **Very high** |
| `jigsaw9/nightmare` (27/27) | 18.1s / 10s | ~70% (`leftovers` 36–41% + `finned` 18–20% + `als` 10% + `fcL` 4%) | **~6.5–8.0s** (~2.3–2.8x) | **~4.0–6.0s** | **Very high (passes serial)** |
| `killer/hell2` (40/40) | 21.2s / 10s | ~65% (`finned` 42% + `fcL` 18% + `fc` 21%) | **~8.5–10.5s** (~2.0–2.5x) | **~8.5–10.5s** *(extraStructure)* | **High** |
| `greaterThan/nightmare` (13/13) | 46.1s / 10s | ~68% (`als` 21% + `finned` 24% + `fcL/sdc` 15–18% + `models` 6%) | **~18–23s** (~2.0–2.5x) | **~10–14s** *(needs B1 too)* | **Medium–High** (with B1 + N7) |
| `greaterThan/normal` (40/40) | 10.2s / 10s | 1.9% over budget | **< 7s** | **< 5s** | **Certain** |
| `greaterThan/expert` (38/40) | 14.3s / 10s | ~50%+ | **~7–9s** | **~5–7s** | **Very high** |
| `diagonalX/expert` (37/40) | 11.8s / 10s | 18% over budget | **~6–8s** | **~5–7s** | **Very high** |
| `samurai/hell2` (40/40) | 43.6s / 30s | ~55–65% | **~18–24s** | **~12–18s** | **Very high (passes serial)** |

*(These projections are Amdahl scenarios from Experiment 1–2 samples, not official 40/100-request qualification verdicts.)*

---

### Group 2 — `generatorVersion: 2` (Changed Search Path, Canonical Rating v3 Unchanged)

| ID | Optimization | Improvement over Plan v4 |
|---|---|---|
| **B1** | **Predictive Lookahead `S4`:** before invoking `tech.find()` in `boundedObjective` ([digger.js](../../generator/js/engine/digger.js#L724-L747)) and `greater-than.js` (`solveWithin`), compute $\text{minNext} = \text{round}(V + P' + 0.25\,P'\log_2(1 + (W + w)/P'))$; if $\text{minNext} \ge \text{spec.max}$, abort immediately without calling `tech.find()` or any heavier finder behind it | Much stronger than Plan v4's `S4`, which only exits *after* an expensive step already ran and pushed the score over `max` |
| **B2** | **Luby Restart Schedule + `restartThreshold: 200` for `jigsaw9` + `S7` total-work cap:** remove `unlimited = (attempt >= maxRestarts)` from [full-grid.js](../../generator/js/engine/full-grid.js#L244-L260) | Verified on `S-AV11` (attempt #4): **335,178 ms → 28.3 ms (~11,800x)** instead of exhausting a large node cap and discarding the attempt |
| **B3** | **Complete `S6` (Anytime Result):** merge best validated checkpoints by `qualityOf` across *all* workers in the pool, and emit checkpoints for `best` produced by ordinary `digStage` samples (not only `keeper.best`) | Closes two checkpoint gaps in Plan v4's `S6` design |

---

## 5. Recommended Re-Ordered Roadmap (Plan v4 → Plan v5)

1. **Defer `K2` (trail and undo in `constraints.js`):** high shared-state risk across both apps for a modest ~1.17x ceiling, whereas **N1–N6** avoid `constraints.js` and `dfs-solver.js`, admit straightforward check-sequence parity proofs, and deliver **2x–3x serial speedups** directly on the hidden cells.
2. **Revised phase ordering:**
   - **Phase 0 (Baseline refresh):** Replace §2's stale `MS07e` checkpoint with the final MS18c/MS18d matrix (`1cfc810c`) and record Experiments 1–4; drop unnecessary F5 exploration for `Hell 1`'s known algebraic band bound.
   - **Phase 1A (Equal-Result, zero hash changes — highest priority):** Ship `generatorVersion` + History v2 + Wire v2; implement **N1** (`finnedSwordfish`/`finnedXWing`) → **N2** (`lawOfLeftovers`) → **N3** (`tech-als.js`) → **N4** (intra-solve memoization) → **N5** (`groupedForcing` scratch) → **N6** (`Greater-Than`/`Killer` `WeakMap` cache fix) → **N8** (`localSearch` early-abort). Gate: all quick suites pass and **0/520 regression hashes change**.
   - **Phase 1B (Equal-Result, Two-Tier Worker Pool):** Implement **N7** (`digGuidedSteps` candidate pool + selective `S5a` on a single 4-worker pool), preserving puzzle/keeper/event invariance at widths 1/2/4 and in `file://` mode.
   - **Phase 2 (`generatorVersion: 2`):** Ship **B2** (Luby restart + `jigsaw9` `restartThreshold: 200` + `S7` total ceiling), **B1** (Predictive Lookahead `S4`), and **B3** (`S6` anytime result). Re-qualify time-hidden cells to restore offers.
   - **Phase 3 (Residual):** Revisit `K2` / `S5b` / `S10 (WASM)` only if post-Phase-2 profiles still expose a bottleneck above the kernel gate; route `Hell 1` to an owner product decision between `S9` (seed bank) or rating-v4 calibration.
