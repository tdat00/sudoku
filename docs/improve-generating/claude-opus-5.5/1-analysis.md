# Improve generating (Sudoku): independent analysis of the plan (SA1, claude-opus-5.5)

Status: phase-1 analysis, 2026-11-14, of [docs/improve-generating/plan.md](../plan.md) (plan author Fable,
claude-fable-5-2) against the code of the worktree `improve-generating` at `f7be90f`. Read-only: no engine file, test,
fixture or hash changed; no generation, test, benchmark, soak, qualification or perf run; no timing lock touched. Every
number comes from committed evidence, recomputed with small `node` scripts that read JSON only (no engine loaded). Paths
are repository-relative. The other analyst's files were not read.

Labels: **Measured** (a recorded number, with its source), **Derived** (computed from measured numbers; the formula is
given), **Projection** (depends on an assumption, which is stated). Ranges read low / likely / high, or `likely [best -
worst]` in the tables.

---

## 0. Summary and verdict

The plan's diagnosis is right in kind: the time of the failing upper-level cells is the uncounted oracle solves of the
ordinary samples, a failed request runs every attempt, everything is single-threaded, and the search is blind to
requiredness. Its anchors are correct (§1.1). But the measured evidence corrects three of its quantities, and those
corrections move the expected gain from "about 60 times" to "about 4 to 8 times in time, with availability decided by a
number nobody has measured yet":

1. **The per-sample solve count is not 1,296.** Stage B only sees the groups left after stage A (about 0.235 N groups at
   the hand-over of 0.47 N clues) and its pool is `min(B(N), candidates)`. The code bounds it at about 190 solves on 81
   cells and 460 to 590 on 144 to 369 cells, and the measured sample times put it at about 350 to 500 solves per
   score-targeted sample on mega16 and about 45 rating-equivalents on classic9 (§2.2, Derived).
2. **Two sample kinds of very different cost.** At Nightmare and above the odd samples (proposals) cost 1/14 to 1/19 of
   the even, score-targeted samples on mega12 and mega16 (465 ms against 7,615 ms on mega16, MS05r5p) and 1/4 to 1/6 on
   the samurai board. 85 % of the mega16 request is the 12 score-targeted samples (§2.1, Measured). The plan's "4.0 s per
   sample" averages the two.
3. **S1's per-sample saving is real on mega16 only.** Phase A of the frontier dig still pays a full floor solve to its
   fixpoint for every group it refuses (about half the groups of a near-minimal puzzle) plus a uniqueness check. On 81 to
   144 cells today's samples are already cheap (27 ms on classic9, 410 ms on mega12), so S1 is time-neutral there or
   slightly dearer; on mega16 it saves about 2.5 times per sample (1.2 to 4) (§3, S1; §5.1, Projection). S1's value is
   the hit probability per sample, which is not recorded anywhere (the plan says so too).
4. **Exact Nightmare is a narrow target, and MS07 widens it.** Under the present weights an exact Nightmare puzzle needs
   Nishio once and at most about 1,400 to 1,550 points of other weighted work, singles included: its score lies in about
   2,180 to 2,400 (§2.5, Derived from `difficulty.js`; both recorded exact hits fit: 2,320 and 2,386). After MS07 the
   Nightmare tier is `forcingChainLong` (1,400) or Nishio, and the window becomes about 1,810 to 2,400. The hit
   probability the feature starts from is therefore not today's; SM1 and SM2 must run on the frozen catalogue (the plan
   says the feature starts after MS18e).
5. **S3 is not automatically identical.** Finders call `ctx.check()` inside their scans (`tech-fish.js`, `tech-subset.js`,
   `tech-wing.js`, `tech-chain.js`, `tech-cage.js`, `tech-ineq.js`), and three guards count those checks:
   `OBJECTIVE_STEPS` (100,000 per objective solve, `digger.js:659`), Killer's `ANALYSIS_NODES` (30,000 per analysis) and
   its accumulated `REPAIR_NODES` meter. Skipping clean scopes issues fewer checks, so a guard can flip and the puzzle
   changes. S3 (and S10) must charge the checks the full scan would have made, or the guards must move to a unit S3
   keeps (§3, S3).
6. **S4 changes dig-log reasons.** An early exit at the score bound reports `tooHard` where the full solve would have
   ended stuck (`techniques`); the replay wires G09-G13 carry 3 `techniques` rejects. Puzzles stay equal; logs may not.
7. **S5a's "up to 8 on 81-cell boards" contradicts its own pool size** `min(4, hardwareConcurrency - 1)`: the gain is at
   most 4. For mega16, samurai, sohei and flower (2 attempts) S5a gives at most 2; only S5b (samples in parallel, new
   version) reaches about 3 there.
8. **The version has no home yet.** Sudoku has `RATING_VERSION`, `WIRE_VERSION` and storage versions, but no
   generator-algorithm version. History entries store only the configuration and regenerate on pick
   (`generator/js/ui/history.js:1-60`), so "old recipes keep their stored puzzle" (OD-S1's default) is not possible for
   history without a format change or a permanently kept old search path.
9. **Hidden consumers of S1.** The Generation Steps replay (`generator/js/engine/replay.js`, 58 KB) interprets the dig
   log's passes (`random`, `guided`, `signs`) and requires the first entry to be a `random` pass (`replay.js:180`); S1's
   new phases need log support there, in the step view and in the goldens G01-G14. The plan does not list them.
10. **Faster, but not necessarily offerable.** With the likely factors, a failing mega16 Nightmare request falls from
    104 / 117 s (median / p95, Measured) to about 12 / 14 s after S1-S6 (6 to 37 s), mega12 from 24 to 5 s, the
    multigrids from 23 to 33 s to 6 to 7 s. To reach 90 % exact hits inside the 30 s budget the per-sample hit
    probability must rise about 5 times on mega12, 7 times on mega16 and 8 times on samurai, sohei and flower (4 times on
    butterfly) (§5.5, Derived from the projected times). On 81 cells, phases 1 and 2 (identical puzzles) plus more
    attempts (OD-S4) already give about 88 % on classic9 and wordoku Nightmare inside 10 s; any S1 gain above 1.2 to 2.5
    closes the gap.
11. **Killer is a calibration matter, Greater-Than a speed matter.** Killer Hard to Nightmare become 4 to 5 times faster
    (S3 and S5) but stay at 0 to 25 % exact; Greater-Than Nightmare's p95 (19.2 s) falls inside the 10 s budget (about
    4.8 s). Note that `digKiller` calls `SG.digger.digStage` (`killer.js:1010-1019`), so S1 placed inside `digStage`
    reaches Killer's cell dig, contrary to plan §8.
12. **SM2 should move to phase 0.** It is a diagnostics strategy (no app change, `registerStrategy` exists), it decides
    the expensive part of the feature and whether S9 is needed, and its gate should be per-cell break-even gains
    (§5.5), not a flat 3 / 10.

**Headline (likely values; Node, 4 workers; failing request = the ceiling a no-hit request pays).**

| Cell | Now, median / p95 (Measured) | After S1-S6 (Projection) | Factor | Exact now | p gain needed for 90 % in budget |
|---|---|---|---|---|---|
| mega16 Nightmare | 104 / 117 s | 12 / 14 s [6.2 - 37] | about 8 (3 - 17) | 0 / 7 | 6.6 (3 - 27) |
| mega12 Nightmare | 24 / 25 s | 5.1 / 5.4 s [2.1 - 12] | about 4.7 (2 - 11) | 0 / 7 | 5.0 (2 - 11) |
| samurai, sohei, flower Nightmare | 23 - 27 s | 5.6 - 6.6 s | about 4 | 0 / 2 each | 7.6 - 8.4 |
| butterfly Nightmare | 33 s | 6.0 s | about 5.5 | 0 / 2 | 3.8 |
| classic9 Nightmare | 4.9 / 5.7 s | 1.2 / 1.4 s | about 4 (2 - 9) | 21 / 100 | 1.2 (0.6 - 2.4) |
| Greater-Than Nightmare | 9.3 / 19.2 s | 2.3 / 4.8 s | about 4 | at least 90 % | none (time was the issue) |
| Killer Expert | 10.8 / 14.7 s | 2.1 / 2.9 s | about 5 | 1 / 8 | S1 not modelled; calibration (MS07e) |

**Verdict.** Proceed with the measurement phase, with amendments: SM2 in phase 0 and on the frozen catalogue, per-cell
break-even gates, check-count accounting as part of S3's identity proof, a decision on how qualification credits a
worker pool, and a place for the algorithm version in history and cache. Phases 1 and 2 are safe and buy most of the
time on boards of at most 144 cells; phase 3 (S1) is a bet on a hit probability whose baseline MS07 is about to change.

---

## 1. Basis

### 1.1 Code identity

`git diff 1d19101 f7be90f -- generator/js core/js player/js` is empty: the engine at `f7be90f` is the engine the plan and
the state report read at `1d19101`. Every line number below is that of `f7be90f` and was checked in this worktree. The
anchors of the plan (`digger.js`, `difficulty.js`, `pipeline.js`, `logical-solver.js`, `dfs-solver.js`,
`worker-client.js`, `gen.worker.js`) are correct; the corrections in this report are about quantities and consequences,
not about what the code does.

### 1.2 Evidence read

| Source | Used for |
|---|---|
| `docs/difficulty-v3/generator-state-2026-11-14.md` (SA2) | pipeline, cost model, every recorded timing |
| `docs/difficulty-v3/clarifications-resolved.md`, PR-S2 with the plan author's answer | Fable's reasoning |
| `docs/difficulty-v3/evidence/MS02/*.json` (via the state report §4.1) | old score-only baseline |
| `docs/difficulty-v3/evidence/MS05r1/profile/{G13,mega12-nightmare,mega16-nightmare}.json` | one-attempt segments per sample |
| `docs/difficulty-v3/evidence/MS05r4/selection/{none,256,128,64}/*.json`, `.../MS05r4/diagnostic/{256,none}/*.json` | R5 rows (per-request ratings, proposals); 8-attempt segments; where the mega16 hit came from |
| `docs/difficulty-v3/evidence/MS05r5p/{G13,mega12-nightmare,mega16-nightmare}.json` | default-attempt segments per sample |
| `docs/difficulty-v3/evidence/MS05r5m/records/*.json` (14) | deep population, seeds, scores |
| `docs/difficulty-v3/evidence/MS05b3/outcomes.json` | 171 I5 / CV3 cell distributions |
| `docs/difficulty-v3/evidence/MS05r6b/evidence.md`, `.../MS05r6b/gd/classic9-nightmare.json`, `.../MS05r6b/standing-quick-cost-final.json` | GD 21 / 100 exact at Nightmare, standing quick cost |
| S-AV01 to S-AV15 (state report §4.7, MS05r6b items) | named availability and cost items |

All runs are Node v26.13.0 on Windows x64, AMD EPYC 7763, 16 logical processors; trace off except G13 (summary). No
browser timing of the Sudoku generator exists in the evidence.

---

## 2. The measured baseline, decomposed

### 2.1 Two sample kinds of very different cost (Measured)

At Nightmare, Hell 1 and Hell 2 (`spec.proposal`) odd samples are proposals (DFS-guarded stage A, the "stuck without
chains" objective, then a rating and `refineDown`) and even samples are score-targeted digs (stage A with
`techniqueOracle`, stage B with `boundedObjective`) (`digger.js:1918`). Per-sample times from the `segments` of the
profiles (the `dig` + `rate` + `tune` steps of each sample):

| Request (source) | Proposal samples: n, mean | Score-targeted: n, mean | Ratio | Rating (rate step, median) | Local search per attempt |
|---|---|---|---|---|---|
| mega16 Nightmare seed 3, 2 attempts (MS05r5p) | 12, 465 ms | 12, 7,615 ms | 16.4 | 21.6 ms | 6.0 s and 4.2 s, 256 ratings each |
| mega16 seed 3, 1 attempt (MS05r1) | 6, 594 ms | 6, 8,562 ms | 14.4 | 21.7 ms | 24.7 s, 985 ratings |
| mega16 seed 3, 8 attempts, 6 used (MS05r4, 256) | 36, 506 ms | 36, 7,220 ms | 14.3 | 23.5 ms | the exact hit came from attempt 6's local search: 7 ratings, 0.1 s |
| mega12 Nightmare seed 3, 4 attempts (MS05r5p) | 24, 42 ms | 24, 783 ms | 18.6 | 7.4 ms | 0.8 - 1.1 s |
| mega12 seed 3, 8 attempts (MS05r4, 256) | 48, 45 ms | 48, 741 ms | 16.5 | 8.4 ms | 0.8 - 1.6 s |
| samurai G13 seed 42, 2 attempts, summary trace (MS05r5p) | 12, 250 ms | 12, 1,040 ms | 4.2 | 3.1 ms | 2.7 s and 3.4 s |
| samurai G13, 8 attempts (MS05r4, 256) | 48, 232 ms | 48, 1,308 ms | 5.6 | 4.9 ms | 2.5 - 7.9 s |

Shares of the default-attempt requests (MS05r5p): mega16 proposals 5.6 s (5 %), score-targeted 91.4 s (85 %), local
10.3 s (10 %); mega12 1.0 s (4 %), 18.8 s (79 %), 4.0 s (17 %); G13 3.0 s (14 %), 12.5 s (58 %), 6.1 s (28 %). The full
grid is 1 to 10 ms per attempt everywhere.

### 2.2 How many solves a sample makes (Derived)

The plan (§2.2) says stage B evaluates about `G * B(N) = 1,296` candidates per sample on every board. The code differs in
two ways (`digger.js:751-825`, `853-911`):

- Stage A hands over at `max(minClues, round(0.47 N))` clues (`digger.js:605`), so stage B starts with about 0.235 N
  groups present, not G = N / 2.
- Each round rates `min(B(N), candidates)` groups (`digger.js:786-788`); refused groups leave the pool for good and every
  round removes one group or prunes at least one.

Upper bound per score-targeted sample: about 190 on 81 cells (19 + 18 + ... + 1, since B = 32 exceeds the 19 candidates),
about 460 on 144, 555 on 256 and 590 on 369 cells. The measured times give the order of the real count: mega16 7.6 s per
score-targeted sample against a 22 ms canonical rating is about 350 rating-equivalents; with stage A on easy puzzles and
stage B solves somewhat cheaper than the final rating, about 350 to 500 solves (Derived). On classic9, the sample part of
a request is 2.6 s for 96 samples (§2.3), 27 ms per sample against a 1.1 ms rating: about 25 rating-equivalents on
average, about 45 for a score-targeted sample (Derived). The plan's "80 times the per-sample time for 3.2 times the
cells" divides mega16's sample time by classic9's whole request per sample (local search included); the sample-only ratio
is about 150.

### 2.3 81-cell requests: samples against the local search (Derived)

The R5 rows (MS05r4) record per request the full ratings, the local ratings and the local proposals at four allowances
with the same samples. A least-squares fit over the 43 eight-attempt rows of classic9 Nightmare (time = sample part per
request + a x local ratings + b x local proposals; mean absolute residual 69 ms) gives:

| Cell | Sample part per request (median, min - max) | Per local rating | Per local proposal | At allowance 256 |
|---|---|---|---|---|
| classic9 Nightmare (96 samples) | 2.6 s (2.0 - 3.3), about 27 ms per sample | 1.12 ms | 4.66 us | samples 2.6 s, local ratings about 1.4 s, proposals about 0.95 s: 4.9 s |
| Killer Hard (48 rows) | 4.1 s (3.1 - 5.3), structure and local ratings included | not separable | 4.26 us | proposals 262,144 x 4.26 us = 1.1 s |
| Killer Expert (48 rows) | 8.7 s (5.6 - 14.9), cage-layout search included | not separable | 3.67 us | about 1.0 s of proposals |

So a classic9 Nightmare request is about half samples and half local search; a Killer request is mostly structure work
(cage growth, repairs, from Expert the layout search) and about a fifth of capped local proposals.

### 2.4 Hit probability per attempt (Derived)

Only hits per request are recorded; per-attempt values follow from `r = 1 - (1 - p_a)^A`.

| Cell | Record | p_a (per attempt, local search included) |
|---|---|---|
| classic9 Nightmare | GD 21 / 100 at A = 8 (MS05r6b); R5 2 / 12 (hits at attempts 3 and 5) | 2.9 % |
| wordoku Nightmare | I5 4 / 20 | 2.8 % |
| mega16 Nightmare | 1 hit in 12 distinct attempts (seeds 1, 2, 4: 2 each; seed 3: 6, hit in attempt 6's local search) | about 8 % (95 % interval 0.2 - 38 %) |
| mega12 Nightmare | 0 in 20 distinct attempts (seeds 1, 2, 4: 4 each; seed 3: 8) | below 14 % (95 %); 2 % assumed |
| samurai, sohei, flower, butterfly Nightmare | 0 in 4 to 12 attempts each | 3 % assumed |
| Killer Hard / Expert / Master / Nightmare | 0 / 35, 1 / 23, 2 / 11, 1 / 11 requests | below 1.1 %, 0.55 %, 2.5 %, 1.2 % |

The seven deep occurrences per board hold four distinct seeds, and the CV3 requests repeat seeds 1 to 3; they add no
attempts.

### 2.5 Why exact Nightmare is rare: the score window (Derived)

`score = V + P + 0.25 P log2(1 + W / P)` with `V = 80 E / (E + 40)` (`difficulty.js:243-280`). At this snapshot the
Nightmare tier is Nishio alone (1,700): Master allows `1.25 w < 1,500`, so up to `forcingChain` (1,100) and
`uniqueRectangle` (900). A puzzle that needs Nishio has `P = 1,700` and `W >= 1,700` plus its singles, so its score is at
least about `V + 1,700 + 435`: about 2,180 to 2,200 for V = 46 to 63 (classic9 to mega16). Staying below 2,400 requires
`log2(1 + W / P)` below 1.54 (classic9) to 1.50 (mega16), that is `W` below about 3,240 to 3,100: one Nishio and at most
about 1,400 to 1,550 points of everything else, singles included. A single forcing chain (1,100) uses most of it; two
Nishio steps leave the band. Both recorded exact hits fit:

- R5 classic9 request 0: Nishio 1, simple colouring 1, X-Wing 1, a naked pair, pointing, box-line and singles; W = 2,644,
  score 2,320 (recomputed from the recorded counts with the formula above).
- mega16 seed 3, attempt 6: score 2,386, hardest Nishio.

The shallow fallbacks of the deep population are 1,925 to 2,164 with `forcingChain` as the hardest technique: in band,
not needing the tier.

**What MS07 changes (Projection from the planned weights).** MS07 splits forcing chains into `forcingChain` (up to C
links, 1,100) and `forcingChainLong` (1,400) and adds `nishioDeep` (2,600). Then the Nightmare tier is
`forcingChainLong` and Nishio; a long-chain puzzle has a minimum score of about 1,810 and stays below 2,400 with W up to
about 7,700. The Nightmare window widens from about 220 points to about 590. The earlier probe (SA1's report of
2026-11-12) found today's Nightmare puzzles peaking at forcing chains of 3 to 6 links, so with C = 4 part of today's
shallow Nightmare population becomes exact. Hell 1's tier becomes `nishioDeep`, with a window of about 3,300 to 3,600:
again one tier step and little else.

### 2.6 The baseline will move before the feature starts

The plan starts after MS18e. Between now and then MS07 changes the tiers (§2.5), MS08 to MS16 add about 14 finders (the
final catalogue has 40 ids, state report §5), MS06 adds the target policy, and MS17b bumps the rating and cache to 3.
New finders make every failed solve dearer and can make hits commoner. **Every "current" number in §5 is today's
measurement**; the factors are the transferable part. SM1 and SM2 must be measured on the frozen catalogue.

---

## 3. The proposals against the code

Each entry: what changes, the code it touches (checked), the plan's claims, then gaps, hidden costs and interactions
with the difficulty-v3 contracts.

### S1. Frontier dig

**What.** Replace stage A and stage B (`digStageSteps` `digger.js:853-911`, `digGuidedSteps` `751-825`) and the
proposal/score-targeted alternation (`1918`) by a descent with the floor techniques (phase A) and at most K_F full-set
solves past the frontier (phase B), with `deepen` reusing `boundedObjective` (`710-732`) and MS06's target policy.
Keeper, `refineDown` (`1247-1293`), local search (`1496-1692`) and the variant strategies stay.

**Code touched.** `digger.js` (a new strategy, the sample loop of `generateAttempts` `1818-2012`), `difficulty.js` (a
ladder of floors over `floorTechniques` `391`/`bandSets` `350`), `logical-solver.js` (S2's exit), `replay.js` and the step
view (new dig-log passes), the goldens, hashes and help snapshots.

| Plan claim | Verdict | Evidence |
|---|---|---|
| An exact puzzle is `not floor(P)`, `full(P)`, score in band, given the prefix property | correct | `requiredOf` `difficulty.js:391-405` derives requiredness from the canonical counts under the prefix property |
| Uniqueness refusals are final, tested once | correct | removing clues only adds solutions |
| "G + 1,296 full solves today" per sample | overstated | §2.2: at most about 190 (81 cells) and 460 - 590 (144 - 369 cells); measured about 350 - 500 on mega16 and about 45 equivalents on classic9 |
| "About 10x fewer solves per sample" | overstated as a time factor | each refused phase-A group still costs a floor solve to its fixpoint plus a DFS; projected per-sample time factor 0.6 - 1.5 on 81 cells, 0.7 - 1.6 on 144, 1.2 - 4.0 on mega16, 0.7 - 2.3 on the multigrids (§5.1) |
| "A sample with an empty frontier fails in milliseconds on 81 cells" | partly | it fails after phase A, but phase A has already paid every refused floor solve |
| Monotone floor along removals | guidance only, as the plan says | Nishio depth and chain length limits are not monotone in general |

**Gaps and hidden costs.**

- *The floor test cannot use uniqueness-assuming techniques.* Phase A proves uniqueness by solving, so it must run with
  `assumeUniqueness: false` (as `techniqueOracle` does, `digger.js:293-316`). The Nightmare floor contains
  `uniqueRectangle` (900, `1.25 x 900 < 1,500`), and after MS08 to MS16 more uniqueness-based finders. A frontier entry
  that only UR resolves is shallow under the canonical rating (uniqueness assumed). It is waste, not an error.
- *Frontier entries need a new uniqueness check at the final P.* An entry found at a snapshot with more clues can lose
  uniqueness once more clues are gone; "for g in frontier still removable from P" means a DFS per entry in phase B.
- *The score window (§2.5) argues for a cheap floor.* If phase A descends with the full floor (forcing chains included),
  the puzzle it crosses from already carries chain work; one Nishio on top exceeds 2,400 when the floor proof used two
  forcing chains. Stopping phase A at the cheap floor (singles to wings) makes "one tier step and little else" the
  natural crossing. After MS07 the long chain is a tier technique and the argument changes; it has to be re-derived on
  the frozen weights (IG-S-OPUS-Q2).
- *Scope by level is unspecified.* "Replaces stage A and stage B for non-proposal samples" reads as every level. Hard to
  Master qualify today on most boards (GD 100 requests: veryEasy to Master pass the 90 % assertion except Normal,
  S-AV14), and SM2 measures only Nightmare and Hard. A level-scoped switch avoids changing puzzles that work.
- *Killer.* `digKiller` (`killer.js:1010-1019`) calls `SG.digger.digStage` with cage settings; S1 inside `digStage`
  reaches Killer's cell dig. Greater-Than's `signs` strategy is separate (`greater-than.js:226`), as the plan says.
- *Replay and help.* `replay.js:180` refuses a log whose first entry is not a `random` pass; `replay.js:320-395` maps
  `random` / `guided` / `signs` passes to the Generation Steps phases. New passes need replay support, the Player's
  replay, the step view, goldens G01-G14 and the guides (EN / VI).
- *Interactions.* Requiredness and exactness unchanged (verify = canonical rating + `requiredOf`). New algorithm version:
  regression hashes (520), goldens (14), wires (5), manual corpus pins, help examples and qualification lists change once
  (plan §6, phase 3). Determinism: kept (one fork per sample). History and cache: see §3 S6 and §4.3.

### S2. Re-derivation early exit

**What.** In a phase-A floor test, stop as soon as every cell of the removed group has its value again; cache the initial
candidate state of P.

**Code.** `logical-solver.js` (`solve` `316-345`, `iterate` `237-302`): an option naming the cells to watch, and an
incremental initial state (restoring candidates that only g's values eliminated needs per-candidate elimination counts or
a rebuild of the peers of g).

**Claims.** Uniqueness argument correct (sound techniques, every solution of P - g agrees with g, hence solves P). "Exact
for a monotone set" correct; the plan limits it to phase A. The saving applies to accepted tests only; a refused test
runs to its fixpoint (the plan says so). **Gap:** with the ladder of floors, a group refused at a cheaper floor is tested
again at the next one, so each surviving group can pay several refused solves.

### S3. Event-driven ladder

**What.** Per technique, dirty scopes; a finder scans dirty scopes in canonical order and skips clean ones.

**Code.** `logical-solver.js` (`iterate`), `techniques.js` (the finder contract and the context), every finder of
`tech-basic.js` (338 lines), `tech-subset.js` (248), `tech-fish.js` (521), `tech-wing.js` (569), `tech-chain.js` (537),
`tech-cage.js` (630), `tech-ineq.js` (537), and every finder MS08 to MS16 add (40 ids in the final catalogue).

| Plan claim | Verdict | Evidence |
|---|---|---|
| Same step sequence, technique counts and score, if footprints are right | correct for the Findings | the ladder takes the first finding in technique order (`logical-solver.js:251-263`) |
| "Identical results" for generation | **not automatic** | finders call `ctx.check()` inside their loops (`tech-fish.js:289,490`, `tech-subset.js:136,204`, `tech-wing.js:141,197,298,487`, `tech-chain.js:424,441`, `tech-cage.js:220,510,606`, `tech-ineq.js:252,437`); `boundedObjective` refuses at 100,000 checks (`digger.js:713-728`), Killer's analyses and layout ratings stop at 30,000 checks (`killer.js:469-489,836-842`) and the repair loop stops when the accumulated meter passes `REPAIR_NODES` (`killer.js:711`). Fewer checks can flip a guard and change the puzzle |
| Applies to oracles, ratings, hints and replay | correct | one solver |
| Gain 3 - 10x on the non-chain part | plausible, unmeasured | the forcing chain keeps the shortest proof over the whole grid (`tech-chain.js:25-33`), so chain calls stay whole-grid |

**Required to keep the identity:** charge the checks a skipped scan would have made (a "virtual check" count per skipped
scope, which depends on each finder's loop shape), or move the three guards to a unit S3 preserves (applied steps,
deductions) as part of the new version. Trace equality (SM4) must compare the check sequence, not only the steps, and
its corpus must contain guard-binding cases (the mega16 Hell 2 request that `OBJECTIVE_STEPS` cut from 106 s to 8 s,
`digger.js:655-658`).

**Projected effect (§5.1).** Nightmare-level solves 1.2 / 1.5 / 2.5 times; Hard to Master solves 1.5 / 2.5 / 4.

### S4. Monotone-score early exit

**What.** A score bound in the solver; stop with "too hard" once the running score reaches it.

**Code.** `logical-solver.js` (a bound or predicate option; the solver scores with `baseCost`, the rating with
`WEIGHTS`, so the bound must come from `difficulty.js` as a callback: core must not know generator weights), `digger.js`
(`techniqueOracle` `293-316`, `boundedObjective` `710-732`).

**Claims.** Monotonicity correct: V is fixed at the start, P and W only grow (`breakdown` `difficulty.js:243-280`); the
rounded running score bounds the final one. The boolean answer is identical. **Gap:** the refusal reason is not. Today a
refused solve that ends stuck reports `techniques` even if its score passed the bound (`digger.js:304-312`, `727`); with
the exit it reports `tooHard`. The reason enters the dig log (`reject` entries) and the Generation Steps trail; the wires
G09-G13 contain 53 `ambiguous` and 3 `techniques` rejects. Regression hashes (givens, solution, structure;
`generator/tests/fixtures/perf-helper.js:178-191`) do not include the log. Either accept a log-only change or keep it for the new
version (IG-S-OPUS-Q5). S4 does not apply to the proposal objective (no bound) or to Hell 2 (`max` infinite).

### S5. Worker pool

**What.** S5a: attempts on P workers, consumed in attempt order. S5b: per-sample quotas instead of shared caps, samples in
parallel (new version).

**Code.** `generator/js/worker/worker-client.js` (787 lines; one `Worker`, `120`), `gen.worker.js` (380), `pipeline.js`
(375), `digger.js` (`generateAttempts` and the merge of `best` and the keeper), events ordering (`events.js`).

| Plan claim | Verdict | Evidence |
|---|---|---|
| Attempts use independent forks and separate caps | correct | `rng.fork(tag)` is a pure function of (seed, tag) (`generator/js/engine/rng.js:77-79`); `newCaps` per attempt (`digger.js:1162-1171`) |
| Coupled only through `best` and the keeper, first strictly better wins | correct for the result | the keeper changes the search path only through "keeper exact" checks (`digger.js:1914`, `1936`, `1527`, `1578`), which cannot be true at the start of an attempt that runs |
| Gain up to 8 on 81-cell boards | **wrong** | the pool is `min(4, hardwareConcurrency - 1)`: at most 4 |
| Pentomino's pool as a reference | design reference only | ES modules there, classic scripts here |

**Gaps.**

- *Per-attempt keepers count more candidates.* The serial keeper runs `countWithin` only for candidates closer than its
  current best (`digger.js:1199-1203`); a fresh keeper per attempt counts more. Cost only, except that `keeper.unsound`
  (a technique bug) could be set on a candidate the serial run never counts, changing the `digger.unsoundTechnique`
  warning. Replaying the offer sequence at merge time keeps it exact.
- *Killer's layout search* runs `counted()` only when `keeper.closer` (`killer.js:907-913`): more DFS per worker, same
  path.
- *Jigsaw.* Rebuilding the model in each worker repeats `buildJigsaw` (up to 200 layouts); transfer it.
- *Qualification.* `generator/tests/qualify.js` runs `SG.pipeline.run` synchronously in `--jobs` processes (half the
  logical processors). Whether its p95 budget means single-thread time or pooled wall time decides whether S5 helps any
  verdict (IG-S-OPUS-Q6). A pooled run with 8 jobs would oversubscribe 16 threads.
- *Guard semantics.* Today the 120 s guard counts active worker time (`gen.worker.js:249-261`); a wall-clock guard over
  a pool is a different contract.
- *`file://`* has no worker; the main-thread mode keeps one lane.

### S6. Anytime result

**What.** At the time guard, return the best complete unique candidate of `best` or the keeper with the approximate
warnings and a new time-limit warning.

**Code.** `digger.js` (`generateSteps` `1807-1815`, which today attaches the work to the error and rethrows), `pipeline.js`,
i18n (EN / VI), guides.

**Claims.** Correct: today a timeout returns nothing (`attachWork` and rethrow). **Hidden costs:** the result depends on
the device speed, so (a) the cache's background regeneration, which must reproduce givens, solution and rating
(`generator/js/ui/cache.js:5-13`), will usually fail and drop the entry; (b) a history entry (configuration only)
regenerates another puzzle or times out again; (c) exports need the warning in the wire. Qualification counts it as a
miss (S-OD4), as the plan implies.

### S7. Bound the unbounded pieces

**Facts verified.** The full-grid search is unlimited from its 50th internal restart (`full-grid.js:241-261`);
`secureUniqueness` counts with the request budget only (`digger.js:951-968`); Greater-Than's sign checks use
`SG.dfs.countSolutions(trial, givens, 2, budget)` and restricted solves without a local cap (`greater-than.js:293,299`);
Jigsaw's solvability screens have node budgets (`jigsaw.js:604-632`), but the pipeline's full grid for an accepted layout
does not. **Gap:** a ceiling "that never triggers on the corpus" is still a behaviour change for the seeds where it
triggers; it belongs to the version, or must be shown never to trigger on the regression corpus and qualification seeds.

### S8. Idle pre-generation and a stock

**Gap.** A pre-generator already exists: `cache.js` keeps a pool of one or two seedless puzzles per configuration after
1 s of quiet, skips configurations whose `COSTS` estimate exceeds 3 s and abandons jobs after 8 s (`cache.js:14-19,
54-55, 64-98`). Its `COSTS` table comes from the rating-v2 qualification (mega16 Nightmare 700 ms, measured now about
105 s), and no difficulty-v3 task refreshes it. S8 should say whether it extends or replaces this pool. An explicit seed
is never served from the pool (`cache.js:16`), so "the next seeds of the same settings" only helps seedless requests.

### S9. Seed bank with transformations

Transformations listed are validity-preserving; the canonical rating is not invariant (scan order), so "rate once, accept
only if exact" is required, as the plan says. Requiredness is re-derived on the transformed puzzle by the same rating.
Product decision OD-S3. Content, offline generation time and per-variant transformation code are the cost. The bank's
content becomes part of the generator version: changing or adding an entry changes the puzzle of every seed that maps to
it, so recipes and the cache key need the bank's version as well.

### S10. WebAssembly kernels

Same identity obligation as S3: the DFS (`dfs-solver.js:120`, one check per node) and the chain search must charge the
same checks, because `UNIQUE_NODES` (200,000), `OBJECTIVE_STEPS` and Killer's slices count them. Loading from base64
bytes works under `file://`.

---

## 4. Feasibility and risk

### 4.1 Size (rough)

| Proposal | Files | Engine lines (rough) | Tests | Results | Owner decision |
|---|---|---|---|---|---|
| S1 + S2 | `digger.js`, `difficulty.js`, `logical-solver.js`, `replay.js`, step view, guides | 600 - 1,000 | frontier soundness and determinism, SM2 tool, replay of new passes; regenerate 520 hashes, 14 goldens, 5 wires, manual pins | new version | OD-S1; level scope |
| S3 | `logical-solver.js`, `techniques.js`, 7 technique files plus MS08-MS16's | 600 - 1,500 | trace equality incl. check sequence, guard-binding corpus | identical only with check accounting | none if identical; else the version |
| S4 | `logical-solver.js`, `digger.js`, `difficulty.js` (callback) | 60 - 120 | bound equivalence | identical puzzles, log reasons may change | Q5 |
| S5a | `worker-client.js`, `gen.worker.js`, `pipeline.js`, `digger.js`, `events.js` | 500 - 900 | pool invariance 1/2/4 and main mode, cancellation, event order | identical (warning edge case aside) | qualification protocol (Q6) |
| S5b | `digger.js` caps | 150 - 300 | quota determinism | new version | OD-S1 |
| S6 | `digger.js`, `pipeline.js`, i18n, history, cache, export | 200 - 400 | time-guard test, cache and history handling | behaviour change | OD-S2 |
| S7 | `full-grid.js`, `digger.js`, `greater-than.js`, `jigsaw.js` | 60 - 150 | ceilings, SM3 | rare changes | with OD-S1 |
| S8 | `cache.js` (or a new store), `COSTS` | 200 - 400 | stock invalidation by version | none | none |
| S9 | bank data, transformations per variant | 400 - 800 plus data | per-variant validity, qualification of served cells | product | OD-S3 |
| S10 | wasm module, glue | 300 plus module | equality incl. checks | identical | none |

### 4.2 What could break

- **Puzzles of working cells** (S1 at all levels): hit rates at Hard to Master are unmeasured under S1.
- **Identity of phase 1** (S3, S4, S10): count-based guards and dig-log reasons (§3).
- **History and cache** across the version and S6 (§3 S6, §4.3).
- **Replay and Generation Steps** for S1's passes.
- **Quick-set cost.** The Generator quick set costs 646.7 s on the final fingerprint (MS05r6b, S-AV08), 286 s of it the
  `pipeline` shard; S3 makes generating tests faster (identical outputs), S1 regenerates their expectations once.
- **Browser.** Phones have 2 to 4 slow cores and `hardwareConcurrency - 1` workers (1 to 3).

### 4.3 Owner decisions

| Id | Decision | Needed by | Remark |
|---|---|---|---|
| OD-S1 | New algorithm version; old seeds give other puzzles | S1, S2, S5b, S7 | history stores configurations only: "old recipes keep their stored puzzle" needs history v2 or a kept old path (Q7) |
| OD-S2 | Anytime result | S6 | cache and history handling of device-dependent results (Q12) |
| OD-S3 | Seed bank | S9 | |
| OD-S4 | Attempts by size | phase 2 already | on 81 cells it is the cheapest lever (§5.5) |
| new | How qualification credits a pool (single-thread or pooled wall time, which P) | S5 | Q6 |
| new | S3's identity: virtual checks, or guards in a preserved unit under the version | S3, S10 | Q4 |
| new | S8 against the existing pre-generator and its stale `COSTS` | S8 | Q11 |

### 4.4 Phase and gate order (plan §6)

Sound in principle (measure, then identical work, then the version). Amendments:

1. **SM2 to phase 0**, on the frozen catalogue, beside SM1. It needs no app change and decides the largest item and
   whether S9 is needed. Today it sits after phases 1 and 2 are built.
2. **Phase 1's gate** must include the check sequence and guard-binding cases; otherwise S3 moves to phase 3.
3. **Phase 2 needs OD-S2 and the qualification decision** before its gate, and should measure OD-S4 (more attempts) on 81
   cells: §5.5 projects classic9 and wordoku Nightmare at about 88 % inside 10 s with phases 1 and 2 alone.
4. **Phase 3's gate per cell:** the break-even gain of §5.5 instead of the plan's "p / c at least 3 times in every cell
   and 10 times on mega16". With the per-sample costs of §5.1 that gate means a p gain of about 3 on 81 to 144 cells and
   about 4 on mega16, which is enough for classic9 but not for mega12 (needs 5), mega16 (6.6) or samurai (8).
5. **S7 belongs with the version** unless shown never to trigger on the regression and qualification seeds.

---

## 5. Speed: before and after (estimates only)

### 5.1 Model and assumptions

A request's time is split into dig samples (`smp`), local search (`loc`) and structure or other work (`oth`), with the
shares of §2.1 and §2.3 (Derived). A proposal acts on a component:

```text
after S1+S2:   smp / s1            (s1 = per-sample time factor of the frontier dig, by board class)
after S3, S4:  part x ((1 - f) + f / (f3 x f4))   with f = share of the part that is logical solving
               (samples 0.85, local search 0.7, structure 0.6; Projection from the code structure)
after S5:      samples / pool (S5b, cells where S1 applies), every other part / min(pool, 0.85 A) (S5a)
failing request = all A attempts (the ceiling); a request that hits stops earlier
p_a' = 1 - (1 - p_a)^g            (g = gain of the per-sample hit probability under S1)
```

| Factor | Low | Likely | High | Label and basis |
|---|---|---|---|---|
| s1, 81 cells | 0.6 | 0.8 | 1.5 | Projection: S1 sample about 42 rating-equivalents (28 cheap accepted tests, 12 refused floor solves, 12 DFS, 12 phase-B solves) against 27 ms average today (§2.2) |
| s1, 144 cells (mega12) | 0.7 | 1.0 | 1.6 | Projection: about 76 equivalents x 8 ms against 410 ms |
| s1, 256 cells (mega16) | 1.2 | 2.5 | 4.0 | Projection: about 64 refused floor solves + 16 phase-B solves + 128 cheap tests and DFS against about 350 - 500 solves per score-targeted sample |
| s1, multigrid | 0.7 | 1.3 | 2.3 | Projection: about 128 equivalents x 4 ms against 650 ms |
| f3, Nightmare-level solves | 1.2 | 1.5 | 2.5 | Projection: chains and Nishio stay whole-grid |
| f3, Hard to Master solves | 1.5 | 2.5 | 4.0 | Projection: plan's 3 - 10x on the non-chain part |
| f4 | 1.0 | 1.1 | 1.3 | Projection: only the bounded oracles |
| pool (Node, 4 workers) | 2.4 | 3.2 | 3.6 | Projection: 60 - 90 % efficiency; one 81-cell sample is 30 - 50 ms, task overhead below 1 ms |
| g (S1 hit gain per sample) | 1 | 4 | 20 | Projection: nothing measured; SM2 decides |

### 5.2 Per proposal (whole-request factor on the cells it serves)

| Proposal | Effect | Low / likely / high | Label |
|---|---|---|---|
| S1 + S2 | time of a failing request | 81 cells 0.8 / 0.9 / 1.2; mega12 0.7 / 1.0 / 1.5; mega16 1.1 / 2.2 / 3.1; multigrid 0.8 / 1.2 / 1.6 | Projection |
| S1 + S2 | per-sample hit probability | 1 / 4 / 20 | Projection (SM2) |
| S3 | whole request | 1.2 / 1.4 / 2.0 at Nightmare; 1.4 / 1.9 / 2.6 at Hard to Master | Projection |
| S4 | whole request | 1.0 / 1.05 / 1.15 | Projection |
| S5a | failing request | min(P, A) x 0.85: 1.7 (A = 2), 3.2 - 3.4 (A = 4 or 8) | Derived from the attempt structure |
| S5b | failing request, A = 2 boards | 2.4 / 3.2 / 3.6 on the samples; local search stays one per attempt | Projection |
| S6 | time | none; the app answers instead of failing | |
| S7 | tail | the 325.3 s Jigsaw request bounded; p95 unchanged | Projection (cause unknown, SM3) |
| S8 | perceived time of the next seedless request | near zero when the user spends longer than the generation | Projection |
| S9 | served cells | one transformation and a few ratings per request, well below 1 s | Projection |
| S10 | kernels | 1.5 - 3 on DFS and chains; 1.1 - 1.5 on a request | plan's figure |

### 5.3 Plan phases, cumulative (failing request, median / p95, seconds; likely [best - worst])

| Cell | Now (Measured) | Phase 1: S3, S4 | Phase 2: + S5a | Phase 3: + S1, S2, S5b |
|---|---|---|---|---|
| classic9 Nightmare | 4.9 / 5.7 | 3.5 / 4.1 [2.4 - 5.0] | 1.1 / 1.3 [0.67 - 2.1] | 1.2 / 1.4 [0.57 - 2.8] |
| wordoku Nightmare | 5.0 / 5.5 | 3.5 / 3.9 | 1.1 / 1.2 | 1.2 / 1.4 |
| mega12 Nightmare | 24 / 25 | 16 / 17 [10 - 22] | 5.1 / 5.4 [3.1 - 9.1] | 5.1 / 5.4 [2.1 - 12] |
| mega16 Nightmare | 104 / 117 | 70 / 79 [45 - 101] | 41 / 46 [26 - 59] | 12 / 14 [6.2 - 37] |
| samurai Nightmare | 27 | 19 [12 - 23] | 11 [7.2 - 14] | 6.5 [3.5 - 14] |
| butterfly Nightmare | 33 | 23 | 7.1 | 6.0 |
| Killer Expert | 10.8 / 14.7 | 6.9 / 9.3 | 2.1 / 2.9 | 2.1 / 2.9 (S1 not modelled) |
| Greater-Than Nightmare | 9.3 / 19.2 | 7.4 / 15 | 2.3 / 4.8 | 2.3 / 4.8 (S1 not applicable) |

Phases 1 and 2 (identical puzzles) buy most of the time on boards of at most 144 cells; phase 3 matters for time on the
two-attempt boards (S5b) and on mega16 (S1), and for availability everywhere.

### 5.4 Board x level (the required table)

Current = Measured (source and n given). Projections are for a failing request (the ceiling) unless the cell hits
almost always, in which case they scale the measured median and p95. Budgets: qualification p95 10 s up to 81 cells, 30
s above, with 36 of 40 exact; app guard 120 s of active time. "Hits" = what the qualification verdict also needs.

| Board (cells, A) | Level | Current median / p95 s | Exact now | After S1+S2 | After S1-S4 | After S1-S6 (pool) | Qualification (time; hits) | App 120 s |
|---|---|---|---|---|---|---|---|---|
| classic9 (81, 8) | Hard / Expert / Master | 0.028 / 0.071; 0.116 / 0.155 (CV3 n = 3); 0.057 / 0.123 (R5 n = 12) | GD at least 90 % (100 each) | puzzles change, time about the same | x 2 - 2.5 | x 2.5 - 4 on p95 | fits; hits fine today, unmeasured under S1 | fits |
| classic9 | Nightmare | 4.9 / 5.7 (R5 n = 12); GD mean 4.3 (n = 100) | 21 / 100 | 5.6 / 6.5 [4.0 - 7.7] | 3.9 / 4.6 [2.1 - 6.7] | 1.2 / 1.4 [0.57 - 2.8] | fits; needs g 1.2 (0.6 - 2.4) with 33 - 65 attempts, or OD-S4 alone about 88 % | fits |
| classic9 | Hell 1 | 1.5 / 2.0 (CV3, vacuous tier) | vacuous | post-MS07b no data; Projection: at least the Nightmare row | as Nightmare x 1 - 3 | as Nightmare x 1 - 3 | unknown | fits |
| killer (81, 8) | Hard | 4.75 / 6.47 (I5 n = 20) | 0 / 20 (0 / 35 all) | S1 not modelled | 3.0 / 4.1 [2.5 - 5.1] | 0.93 / 1.3 [0.71 - 2.1] | time fits; hits fail: calibration (MS07e) | fits |
| killer | Expert | 10.8 / 14.7 (I5 n = 8) | 1 / 8 | not modelled | 6.9 / 9.3 | 2.1 / 2.9 [1.6 - 4.9] | time fits after S5; hits fail (needs g about 11) | fits |
| killer | Master | 12.5 / 23.4 (I5 n = 8) | 2 / 8 | not modelled | 9.9 / 19 | 3.1 / 5.8 [2.2 - 8.7] | time fits; hits need g about 3.6 | fits |
| killer | Nightmare | 17.8 / 30.0 (I5 n = 8) | 1 / 8 | not modelled | 14 / 24 | 4.4 / 7.5 [3.1 - 11] | time fits; hits need g about 11 | fits |
| killer | Hell 1 | 0.95 / 1.85 (I5, vacuous) | vacuous | post-MS07b unknown | | | unknown | fits |
| jigsaw9 (81, 8) | Hard / Master | 0.019 / 0.078; 0.047 / 0.130 (I5 n = 20) | at least 90 % | puzzles change | x 2 | x 2 - 3 | fits | fits |
| jigsaw9 | Expert | 0.92 / 2.44, max 325.3 (I5 n = 20) | at least 90 % | puzzles change | x 1.5 - 2 | p95 about 0.6 - 0.8; S7 bounds the 325 s tail | fits; the tail is a guard issue | today the tail breaks 120 s |
| jigsaw9 | Nightmare | 0.95 / 2.33 (I5 n = 20) | at least 90 % | puzzles change; hit risk unmeasured | x 1.4 | p95 about 0.5 - 0.8 | fits | fits |
| jigsaw9 | Hell 1 | 0.04 / 0.16 (vacuous) | vacuous | post-MS07b unknown | | | unknown | fits |
| greaterThan (81, 8) | Hard | 0.18 / 4.83 (I5 n = 10) | at least 90 % | S1 not applicable | 0.12 / 3.0 | 0.12 / 0.9 | fits | fits |
| greaterThan | Expert | 2.40 / 14.2 (I5 n = 10) | at least 90 % | n/a | 1.5 / 9.0 | 0.48 / 2.8 [0.36 - 4.7] | p95 fails today, fits after S5 | fits |
| greaterThan | Master | 4.07 / 6.85 (I5 n = 10) | at least 90 % | n/a | 2.6 / 4.3 | 0.81 / 1.4 | fits | fits |
| greaterThan | Nightmare | 9.30 / 19.2 (I5 n = 10) | at least 90 % | n/a | 7.4 / 15 | 2.3 / 4.8 [1.6 - 7.2] | p95 fails today, fits after S5 | fits |
| greaterThan | Hell 1 | 0.23 / 0.65 (vacuous) | vacuous | | | | unknown | fits |
| mega12 (144, 4) | Hard / Expert / Master | 0.065 / 0.068; 0.081 / 0.117; 0.170 / 0.448 (CV3 n = 3) | at least 1 / 3 | puzzles change | x 2 | x 2 - 3 | fits; hit rates unknown (n = 3) | fits |
| mega12 | Nightmare | 23.7 / 25.2 (deep n = 7) | 0 / 7 | 24 / 25 [16 - 34] | 16 / 17 [7.4 - 29] | 5.1 / 5.4 [2.1 - 12] | time fits; needs g 5.0 (2 - 11) with about 23 attempts | fits |
| mega12 | Hell 1 | 0.05 / 1.29 (vacuous) | vacuous | | | | unknown | fits |
| mega16 (256, 2) | Hard / Expert / Master | 0.31; 0.58; 1.16 (CV3, max of 2) | at least 1 / 2 | puzzles change | x 2 | x 2 - 3 | fits; hit rates unknown | fits |
| mega16 | Nightmare | 104 / 117 (deep n = 7) | 0 / 7 | 48 / 54 [34 - 99] | 33 / 37 [16 - 86] | 12 / 14 [6.2 - 37] | time fits likely; needs g 6.6 (3 - 27) with about 4 attempts | fails today; fits after |
| mega16 | Hell 1 | 0.62 (vacuous) | vacuous | | | | unknown | fits |
| samurai (369, 2) | Nightmare | 26.7 (CV3 max of 2); G13 21.6 | 0 / 2 | 22 [16 - 35] | 16 [7.8 - 30] | 6.5 [3.5 - 14] | time fits; needs g 8.4 (4.4 - 19) | fits on desktop, marginal on phones today |
| sohei (288, 2) | Nightmare | 27.5 (CV3 max of 2) | 0 / 2 | 23 [16 - 36] | 16 [8.0 - 31] | 6.6 [3.6 - 14] | needs g 8.4 | as samurai |
| flower (189, 2) | Nightmare | 23.1 (CV3 max of 2) | 0 / 2 | 19 [14 - 30] | 13 [6.7 - 26] | 5.6 [3.0 - 12] | needs g 7.6 | as samurai |
| butterfly (144, 4) | Nightmare | 32.8 (CV3 max of 2) | 0 / 2 | 27 [19 - 43] | 19 [9.6 - 37] | 6.0 [2.7 - 15] | needs g 3.8 (1.8 - 11) | as samurai |
| multigrids | Hard to Master | 0.09 - 3.05 (CV3 max of 2) | at least 1 / 2 (Easy 0 / 2 on butterfly and flower, S-AV13) | puzzles change | x 2 | x 2 - 3 | fits; hit rates unknown | fits |
| multigrids | Hell 1 | 0.3 - 5.2 (vacuous) | vacuous | | | | unknown | fits |

### 5.5 Availability: exact hits, and the gain each cell needs

`A_max` is the number of attempts whose failing time after S1-S6 still fits the budget; the needed gain is the g with
`1 - (1 - p_a')^A_max >= 0.9` (Derived from the projected times and §2.4; the projected times are Projection).

| Cell | p_a now | Request rate now (A default) | After S1-S6: time per attempt | A_max | g needed (likely; low - high) | Request rate at g = 4, default A |
|---|---|---|---|---|---|---|
| classic9 Nightmare | 2.9 % | 21 % | 0.15 s | 65 | 1.2 (2.4 - 0.6) | 61 % |
| wordoku Nightmare | 2.8 % | 20 % | 0.16 s | 64 | 1.3 | 59 % |
| mega12 Nightmare | 2 % (assumed) | 8 % | 1.3 s | 23 | 5.0 (11 - 2.0) | 28 % |
| mega16 Nightmare | 8 % | 16 % | 6.2 s | 4 | 6.6 (27 - 3.0) | 50 % |
| samurai, sohei Nightmare | 3 % (assumed) | 6 % | 3.2 - 3.3 s | 9 | 8.4 (19 - 4.4) | 22 % |
| flower Nightmare | 3 % (assumed) | 6 % | 2.8 s | 10 | 7.6 (15 - 4.0) | 22 % |
| butterfly Nightmare | 3 % (assumed) | 11 % | 1.5 s | 20 | 3.8 (11 - 1.8) | 39 % |
| Killer Master / Nightmare / Expert / Hard | 2.5 / 1.2 / 0.55 / 0.1 % (assumed; 0 / 35 requests) | 18 / 9 / 4 / 0 % | 0.12 - 0.55 s | 18 - 85 | 3.6 / 11 / 11 / 27 | S1 not applied |

**Phases 1 and 2 alone** (identical puzzles) with more attempts (OD-S4): classic9 Nightmare 0.14 s per attempt, 73
attempts in 10 s, about 88 % exact; wordoku about 87 %; mega12 about 37 % (23 attempts); mega16 8 % (one attempt fits).
On 81 cells that is the cheapest route to the 90 % line; above 81 cells only a real gain in p (S1) or S9 gets there.

**Cells that would become offerable (Projection, likely scenario g = 4):** classic9 and wordoku Nightmare (with OD-S4),
butterfly Nightmare (with OD-S4), Greater-Than Expert and Nightmare (time only). Not with g = 4: mega12 (borderline,
needs 5), mega16, samurai, sohei, flower, Killer Hard to Nightmare. With g = 20 (high) every Nightmare cell except Killer
qualifies on time and hits. Hell 1 is unknown until MS07b; its window (§2.5) suggests it behaves like today's Nightmare.

### 5.6 The 120 s app guard

No browser measurement of Sudoku generation exists. Assumption (Projection): a desktop browser runs at 1.2 to 2 times the
Node time with `min(4, cores - 1)` workers, a phone at 3 to 5 times with 1 to 3 workers. Today mega16 Nightmare (104 to
117 s in Node, one worker) times out in a browser on most devices, as Fable expects; the multigrid Nightmare cells (23 to
33 s) are marginal on phones. After S1-S6 the worst failing request (mega16, 12 to 14 s in Node, 6 to 37 s range) is 15 to
30 s on a desktop and about 50 to 95 s on a 4-core phone with 3 workers: inside 120 s, with little margin at the slow end.
With S6 a request that still reaches the guard returns a puzzle with warnings instead of an error.

### 5.7 The named items (S-AV) and what addresses them

| Item | Measured now | Addressed by | Projected after (likely) |
|---|---|---|---|
| S-AV01 Greater-Than Normal time | I5 p95 5.28 s; CV6 assertion 1.40 s | S3, S5 | p95 about 1 - 2.6 s; the CV6 assertion may come within reach |
| S-AV02, S-AV03 mega12, mega16 Nightmare | 0 / 7 each; 24 s and 104 - 117 s | S1 - S6; S9 as the fallback | 5 s and 12 s; hits need gains of 5 and 6.6 |
| S-AV04, S-AV12 samurai, sohei, butterfly, flower Nightmare | 0 / 2 each; 20 - 33 s | S1 - S6; S9 | 6 - 7 s; hits need gains of 3.8 - 8.4 |
| S-AV05, S-AV06, S-AV09 Killer Hard to Nightmare | 0 - 25 % exact; 4.8 - 17.8 s | S3, S5 for time; calibration (MS07e) for hits | 1 - 4.4 s; hits unchanged |
| S-AV07, S-AV10 classic9, wordoku Nightmare | 21 / 100, 4 / 20 | phases 1 - 2 and OD-S4; S1 | about 88 % with OD-S4 alone; 90 % or more with any gain above 1.2 - 2.5 |
| S-AV08 standing quick cost | Generator 646.7 s, Player 31.8 s | S3 (identical outputs) | generating suites faster by about 1.4 times or more; S1 regenerates their pins once |
| S-AV11 Jigsaw tail | 325.3 s, stage unknown | SM3, S7 | bounded; size depends on the stage SM3 finds |
| S-AV13 butterfly, flower Easy misses | 0 / 2 each | none directly | not addressed by the plan |
| S-AV14 classic9 Normal hits | 86 / 100 | OD-S4 (more attempts), S1 | not projected (Normal is not a target of the plan) |
| S-AV15 confusion matrix not run | 504.8 s of batches | S3 | below 450 s if S3 gives about 1.15 times or more on these batches |

---

## 6. The measurement phase (plan §5)

| Id | Confirms or refutes | What it should measure exactly |
|---|---|---|
| SM1 | the solve counts of §2.2; the chain share behind f3; the per-kind costs of §2.1 | per sample kind (proposal, score-targeted) and per stage: solves, their outcome (kept, refused stuck, refused too hard, guard), time per solve, `find` calls and time per technique, **budget checks per solve**, DFS nodes; per sample: exact, shallow, in band; per local search: hit or not. On the frozen catalogue, also at Hell 1 |
| SM2 | g and s1 (§5.1); the break-even gains of §5.5 | p and time per frontier sample against each current kind separately; frontier size; share of entries solved with the tier; share too hard after crossing (the window of §2.5); with phase A at the cheap floor and at the full floor; classic9, wordoku, mega12, mega16, samurai Nightmare and one Hard cell; 40 requests each is enough for p around 10 %, not for 1 % |
| SM3 | the stage of the 325.3 s Jigsaw request | the stage profile plus full-grid restarts and DFS nodes per stage |
| SM4 | S3's identity and f3 | step and **check-sequence** equality on the regression corpus plus guard-binding requests (mega16 Hell 2, Killer Expert layouts); time per solve per technique family on 81, 144, 256 cells |
| SM5 | the pool factor (2.4 - 3.6) | wall time at 1, 2, 4 workers on classic9 (8 attempts) and mega16 (2 attempts, S5a against a S5b prototype); message cost of the model |
| add: SM6 | the OD-S4 route of §5.5 | after phase 2: exact rate and p95 of classic9 and wordoku Nightmare with 16, 32, 64 attempts on 4 workers |

---

## 7. Questions for Fable

- **IG-S-OPUS-Q1 (S1 baseline).** The code bounds stage B at about 190 solves on 81 cells and 460 to 590 on larger boards,
  and the evidence shows proposal samples costing 1/14 to 1/19 of score-targeted ones on mega12 and mega16. Should SM2's
  gate compare frontier samples with each kind separately, and would a proposal-only top tier (cheap today) be worth
  measuring as a baseline before S1?
- **IG-S-OPUS-Q2 (S1 floor).** Under today's weights an exact Nightmare puzzle is one Nishio plus at most about 1,400 to
  1,550 points of other work, singles included; one forcing chain in the floor proof uses most of that. Should phase A
  stop at the cheap floor (no chains) rather than descend with the full floor, and is that to be re-derived on MS07's
  weights (long chains in the tier, `nishioDeep` for Hell 1)?
- **IG-S-OPUS-Q3 (S1 and uniqueness-assuming floor techniques).** Phase A must solve without `uniqueRectangle` (and,
  after MS08 to MS16, the other uniqueness-based finders) because it proves uniqueness, while the Nightmare floor
  contains them. Accept the resulting shallow candidates as waste, or run the floor with them (uniqueness already known
  from the DFS) before spending a phase-B solve?
- **IG-S-OPUS-Q4 (S3 identity).** `OBJECTIVE_STEPS`, Killer's `ANALYSIS_NODES` slices and its `REPAIR_NODES` meter count
  the budget checks that finders issue inside their scans; skipping clean scopes changes those counts. Should S3 charge
  virtual checks to stay in phase 1, or should the guards move to a unit S3 preserves under the new version?
- **IG-S-OPUS-Q5 (S4 log).** The early exit turns some `techniques` rejects into `tooHard` in the dig log and the
  Generation Steps (puzzles unchanged). Is a log-only change acceptable in phase 1, or does S4 wait for the version?
- **IG-S-OPUS-Q6 (qualification and the pool).** Does the 10 s / 30 s p95 budget mean single-thread Node time or pooled
  wall time, and with which worker count and `--jobs`? Without a decision S5 changes no qualification verdict.
- **IG-S-OPUS-Q7 (where the version lives).** History entries store only the configuration and regenerate on pick, and
  there is no generator-algorithm version field. Keep the old search path selectable forever, or move history to v2 with
  puzzles and let v1 entries regenerate new puzzles with a notice?
- **IG-S-OPUS-Q8 (more attempts first).** Phases 1 and 2 plus about 70 attempts project classic9 and wordoku Nightmare at
  about 88 % inside 10 s without S1. Would you take OD-S4 for 81-cell boards right after phase 2, before S1?
- **IG-S-OPUS-Q9 (S1 scope).** Should S1 apply only to the levels and cells that fail (Nightmare and up), keeping today's
  dig where hit rates already pass, or should SM2 also measure Normal to Master?
- **IG-S-OPUS-Q10 (Killer).** `digKiller` calls `digStage`, so S1 inside `digStage` reaches Killer's cell dig. Exclude
  Killer explicitly until MS07e has settled its calibration, or include it in SM2?
- **IG-S-OPUS-Q11 (S8).** `cache.js` already pre-generates seedless puzzles under a rating-v2 `COSTS` table (mega16
  Nightmare listed at 700 ms, measured about 105 s). Is S8 meant to replace that pool, and should someone refresh
  `COSTS` before then?
- **IG-S-OPUS-Q12 (S6 and storage).** A time-limited result cannot be regenerated identically: the cache's background
  regeneration will drop it and a history pick will produce another puzzle. Should such results be cached and stored in
  history at all, and if so with their puzzle?
