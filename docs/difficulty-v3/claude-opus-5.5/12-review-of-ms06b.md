# Sudoku difficulty-v3 — review of MS06b, pure target and comparison primitives

| Field | Value |
|---|---|
| Reviewer | SA1 (agent Opus, claude-opus-5.5), analyst review set MS06b-MS06c2 (S-OD4) |
| Date | 2026-11-14 |
| Subject | MS06b, uncommitted on `rating-v3` at `1a89745` (`git diff` and the untracked files; the orchestrator's one-line MS05e log edit is ignored) |
| Against | `tasks/difficulty-v3/MS06b-target-policy-primitives.md`; R3, R6 and R7 (`docs/difficulty-v3/report-detailed.md:273-317, 427-533`); CV6-05 (`clarifications-resolved.md:1819-1950`); the needs of MS06c1 and MS06c2 |
| Ran | read-only only: git reads, file reads, and the repository's own fingerprint rules recomputed in memory. No test, no generation |

**Verdict: accept with a short fix round.** Two Minor items need attention: a test gap (IR31) and one inaccurate design
sentence (IR32). Both are test or doc wording only, and both may instead be carried into MS06c1, which owns
`generator/design.md` §6.8 and `digger-target` next.

Everything else holds:

- Every helper matches the task's tables and vectors exactly.
- The forwarding line is the specified one, is the only production-path change, and is inert for every default
  request.
- The three "choices within the spec" are allowed; none needs routing.
- The CI shard is correct.
- Both quick sets apply to the current tree by fingerprint.

## 1. The helpers against the task, R6 and R7

All references are to `generator/js/engine/digger.js`.

| Helper | Specification | Result |
|---|---|---|
| `targetFor(spec, rng)` (`:1772-1775`) | `null` when `spec.max == Infinity`; else `spec.min + rng.fork('target').next() * (spec.max - spec.min)`; no truncation; the parent streams do not move | Exact. `fork` depends only on seed and tag (`rng.js`), so no parent stream advances. `bandMax` of the top level is `Infinity` (`difficulty.js:184-186`), so the `=== Infinity` test matches real specs |
| `preferObjective(c, i, t)` (`:1779-1785`) | Strict, same successful kind. Bounded: tier first, then the nearer finite target or the higher score for null. Proposals maximise priority, whatever the target. Mixed kinds are not comparable. Refusals never win | Exact for its domain. Outside it the result is false (IR33) |
| `applyBounded(cur, win, t)` (`:1791-1797`) | The five rows of R6's table | Exact: true/false never; false/true yes; false/false yes; true/true with a finite target only on a strictly nearer score; true/true with a null target yes. Non-bounded input gives false (conservative, consistent with MS06c2's "refused initialization ends the pass") |
| `preferRated(cq, cs, curQ, curS, t)` (`:1801-1805`) | The lower R3 quality wins; at equal quality the nearer finite target, otherwise the higher score; exact ties false; explicit comparisons only | Exact. There is no quality subtraction, so `Infinity` against `Infinity` falls through to the score rule |
| `acceptReveal(cur, next, spec, t, curEx, nextEx)` (`:1809-1816`) | The exact predicate of the task (lines 70-76) | Exact, condition by condition. `current in band` is written as `current.score >= spec.min` after the above-band branch |

Every vector the task names is asserted:

- 650 with the tier beats 500 without it;
- 550 and 450 tie, so the first is kept;
- false/false 650 to 700 applies;
- true/true 550 to 600 is refused;
- quality 0 with score 430 beats quality 0.5 with score 500;
- `STUCK_SCORE + 9` beats `STUCK_SCORE + 2` for targets 500, 10 and null;
- all seven reveal vectors of the Expert band with target 850.

## 2. The production path

- **One line.** `digger.js:1357` is the task's line verbatim, immediately after `const resolved = { ... }`. `options`
  is never undefined there (`options = options || {}` at `:1323`).
- **The other edits are inert.** They are comments (`:919-920`, `:1310-1313`), the helper object and its export
  (`:2117`). Nothing calls the helpers: across `generator/`, `core/` and `player/` they appear only in their own
  definition, the new suite and `design.md`.
- **Inert for every default request.**
  - No production caller supplies `target`: none in `pipeline.js`, the worker, `soak.js`, `qualify.js` or
    `perf.js`.
  - Nothing reads `resolved.target`. The only `.target` readers in engine code are the tune-event schema
    (`events.js:335-336`) and unrelated DOM and technique code.
  - The quick sets pass with the replay goldens and the smoke suite's sample of regression hashes.
- **CV6-05.** `greater-than.js` is not modified, and the `signs` strategy has no reader of the option.

## 3. The developer's three choices

1. **`preferObjective` is false unless both objectives succeed and are of one kind.**
   - Allowed: the task annotates the signature "strict, same successful kind". The design text and the code comment
     state the caller's precondition: the first success of a pool is its incumbent.
   - Not a routing matter. One naming point: IR33.
2. **A non-finite target acts as no target.**
   - Allowed: it is the literal reading of "nearer finite target, otherwise higher score".
   - It is also what Killer's untargeted structure stage needs.
   - Consequence for MS06c2: IR34.
3. **hell2 is tested with a literal spec.**
   - Allowed, but the stated reason ("real specs throw") holds only for classic9. See IR35.

## 4. Would the tests catch plausible wrong implementations?

Mostly yes. The following would fail at least one assertion:

- **`targetFor`:**
  - drawing from the parent stream (the parent stream is checked);
  - another fork tag (the exact expected value);
  - rounding or clamping (exact values at 0, at the largest value and at 0.5).
- **The comparators:**
  - non-strict ties (550 and 450; equal scores);
  - distance before tier (650 against 500 at target 500);
  - comparing a proposal with the target or with a score;
  - a false/false row that demands nearness (650 to 700);
  - a null target treated as "nearer" (550 to 450 with null).
- **`acceptReveal`:**
  - `>` instead of `>=` at the band maximum (1000 to 700);
  - a dropped `current > target` (800 to 840);
  - a dropped exactness flag (920 to 840 shallow; a shallow 920);
  - a dropped finite-target check (null).
- **The forwarding:**
  - a truthiness test (explicit null and 0);
  - an unconditional copy (absent stays absent);
  - any wiring of a helper into generation (the spy on the exported object).

One gap is IR31.

## 5. Documentation, counts and CI

- **`generator/design.md`.**
  - §6.8 (`:709-721`) documents the helpers, the tier table, the reveal vectors and the forwarding line, and says
    they are "tested, not wired", as the task asks. One sentence is wrong (IR32).
  - The counts at `:1550`, `:1899` and `:1901` (35 + 16 suites, 51 quick, 3,290 tests, 59 in all) and the §15.2 row
    at `:1923` are right.
- **Both developer guides.** The internal API paragraph and the counts are right. The Vietnamese paragraph lacks
  the English one's link to §6.8 (IR36).
- **Counts.** 3,262 + 28 = 3,290. No stale 3,262 or 50/58-suite count remains in AGENTS, README, the guides, the
  design or the workflows; only the manifest's historical `from` note keeps it, explained by the new `added` note.
- **CI** (`.github/scripts/generator-quick.json`).
  - The shard `digger-target` (28 tests, measured 0.7 s, projected 30 s) sits in group `own-suites`.
  - Read from the files: all 51 quick suites (35 Generator, 16 core) are in exactly one shard, with no duplicate or
    unknown suite, and the shard test counts sum to 3,290.
  - The group projects 180 + 3 x (220 + 30) = 930 s of 1,800 s.
  - `tests.html` lists the suite.
- **Quick results** (`generator/tests/artifacts/difficulty-v3/MS06b/quick/`).
  - Generator: 8 shards, 3,290 of 3,290, fingerprint `bae3ceb6…`. Player: 1,683 of 1,683, fingerprint `28fc49a4…`.
    Both equal what I recompute for the current tree, so the results apply as they are.
  - The shard test time sums to about 649 s, consistent with the reported 652.9 s process time against 648.0 s.
- **Format.** CRLF, no BOM, no trailing whitespace, final newlines. The only line over 110 characters in
  `digger.js` (`:1860`) predates this task.

## 6. What MS06c1 and MS06c2 get

The shapes match MS06c1's typed objectives:

- `bounded`: a finite `score` and a boolean `tierUsed`;
- `proposal`: a finite `priority`, including `STUCK_SCORE + n`.

The helpers' signatures match MS06c2's calls as written in its brief:

- `targetFor` in the sample loop;
- `preferObjective` and `applyBounded` in the cells pool;
- the explicit local predicate around `preferRated`;
- `acceptReveal` with caller-computed exactness.

IR33, IR34 and IR38 are the handoff points.

## 7. Findings

| Id | Severity | File:line | Summary |
|---|---|---|---|
| IR31 | Minor | `generator/tests/suites/digger-target.test.js` (reveal cases); `digger.js:1814` | The in-band floor `next.score >= spec.min` is never tested on its own: with target 850 every below-minimum reveal is also farther, so dropping the condition passes all 28 tests |
| IR32 | Minor | `generator/design.md:719` | "The rule that no sign is added back" names a guard that does not exist; the guard is that no clue is added to a model with signs |
| IR33 | Info | `digger-target.test.js` ("a refusal never wins, whatever it is compared with"); `digger.js:1779-1785` | The case asserts that a success does not replace a refused or absent incumbent, so the name overstates it; MS06c2 must seed each pool with its first success |
| IR34 | Info | `digger.js:1751-1754` (`nearerOrHigher`) | A non-finite target silently means "no target": the helpers cannot reveal a lost target, so MS06c2's transport tests are the only guard |
| IR35 | Info | `digger-target.test.js:18` (`HELL2`) | Real open bands exist (`SG.difficulty.bandOf('hell2')`; hell2 specs of every variant that offers it); the literal could be replaced |
| IR36 | Info | `DEVELOPERGUIDE.vn.md:259-275` | The Vietnamese paragraph lacks the English paragraph's link to `design.md` §6.8 |
| IR37 | Info | `generator/tests/artifacts/difficulty-v3/MS06b/` | No `generator-suites.sh check` output is recorded; the results sit in `artifacts/`, not `docs/difficulty-v3/evidence/MS06b/` |
| IR38 | Info | `digger.js:1923-1925`, `:2002`, `:2024` | Handoff confirmed: `generate` copies a caller's `options.target` into every sample and into the local-search entry; MS06c2 must override it per sample |

#### IR31 — Minor: the in-band floor of `acceptReveal` is not pinned

**What.** The in-band branch requires `next.score >= spec.min` (`digger.js:1814`). Every reveal vector uses target
850, and with a target that far above the minimum a reveal below 700 is always farther than the current state. So
920 to 690 and 920 to 699 are refused by the distance rule alone.

**Why it matters.** The condition binds only when the target lies near the minimum. Removing it would pass all 28
tests, and a reveal below the band would then be kept.

**Fix (test only).** Add one case on the Expert band with target 705:

- exact 730 to exact 699 must be false (nearer, but below the minimum);
- exact 730 to exact 701 must be true.

#### IR32 — Minor: a wrong guard in `generator/design.md` §6.8

**What.** The paragraph ends: "The 64-rating allowance of a refinement, the rule that no sign is added back and the
`enterLocal`/`leaveLocal` accounting stay the caller's, unchanged" (`:719`).

**Why it matters.** No code adds signs back. The guard the task means (MS06b:82, "no-sign-additions guard") is the
Greater-Than rule that no **clue** is added to a model with signs:

- R7: "the Greater-Than prohibition on adding clues that make its sign structure redundant";
- MS06c2:17: "the no-clue-additions rule on models with inequalities";
- refinement is not entered for such a model (`digger.js:1252`);
- local search makes no additions there (`:1568`).

MS06c2's developer reads this paragraph.

**Fix (one phrase).** Replace it with "the rule that adds no clue to a model with signs (refinement is not entered
for inequalities, R7)".

#### IR33 — Info: the name of a contract case

**What.** The case "a refusal never wins, whatever it is compared with" also asserts that
`preferObjective(success, refused)` and `preferObjective(success, null)` are false. In those positions the refusal
or the absence stays the incumbent.

**Why it is allowed.** The behaviour is within the documented domain ("defined only for two successful objectives of
the same kind"). MS06c2's natural loop, `best === null || preferObjective(objective, bestObjective, target)` with
refusals handled first, never reaches it.

**Fix (optional, either one).**

- (a) Rename the case to "only two successful objectives of one kind are compared; anything else is never
  preferred". Smallest.
- (b) Let a successful candidate beat a refused or absent incumbent, so that "a refusal never wins" holds in both
  positions.

Either way, MS06c2's brief should keep "seed the pool with its first success".

#### IR34 — Info: a lost target cannot be detected by the helpers

**What.** `undefined`, `NaN` and the infinities behave exactly like `null`: the higher score, the unbounded row of the
table, and no in-band refinement.

**Why it is allowed.** It is the literal spec, and it suits Killer's untargeted structure stage, whose offers carry no
target.

**Consequence for MS06c2.** A target lost in transport would silently restore the old behaviour, and MS06d would see
a null effect. MS06c2's T01 (the origin equality of the real `signs` route) and its keeper and search inheritance
tests must therefore stay strict. No change to MS06b.

#### IR35 — Info: the hell2 literal

**What.** `HELL2 = { min: 3600, max: Infinity }` equals `SG.difficulty.bandOf('hell2')`, which is exported at
`difficulty.js:588` and computed at `:184-191`. `SG.difficulty.spec('hell2', model)` works for every variant whose
`difficultySupport` lists hell2, such as greaterThan and diagonalX; only the suite's classic9 model refuses it.

**Fix (optional).** Using the real band would bind the `targetFor` test to the real representation of the open band.

#### IR36 — Info: guide parity

The English paragraph ends with "([design.md](generator/design.md) §6.8)" and the Vietnamese one has no link. Adding
it is optional.

#### IR37 — Info: CI check and evidence location

- My file-level reconciliation passes: 51 suites, each in one shard, 3,290 tests, every group inside 1,800 s.
- The artifacts do not contain `bash .github/scripts/generator-suites.sh check`, the check CI runs (registration only,
  a few seconds). Confirm it from the developer's report, or run it at acceptance.
- The quick results sit under `generator/tests/artifacts/` (outside every fingerprint), unlike the
  `docs/difficulty-v3/evidence/<task>/` folders of earlier tasks. No rule is broken; record the path in the
  Execution log.

#### IR38 — Info: handoff for MS06c2, confirmed

**What.** `generateAttempts` builds `digOptions = Object.assign({}, options, ...)` (`digger.js:1923-1925`), so a
caller's `options.target` reaches every sample (`:2002`) and the local-search entry (`:2024`). The developer's
handoff note is accurate.

**What MS06c2 must do.** Pass each sample's own draw in the per-sample options; it overrides the copy by
`Object.assign` order. It must also state what a caller-supplied `generate`-level target means, since R7 gives each
sample its own target.

## 8. Fix round, if taken now

Apply IR31 (one added test case) and IR32 (one phrase). Then:

- Rerun only `--suite=digger-target`, expecting 29 of 29.
- Record an exact-diff compatibility note for the other shards: only `generator/design.md` prose and one test case
  of `digger-target` changed, and no other suite loads either. This is the rule accepted at MS05r6b and MS05r6c.
- The Generator quick fingerprint changes. The Player fingerprint changes too, because only the guides are shared
  with it; but IR32 touches no guide, so it does not.

**Alternative.** Accept now and give IR31 and IR32 to MS06c1 as binding items; it already owns `design.md` §6.8 and
the `digger-target` suite.

MS06b REVIEWED: 0 blocking, 0 major, 2 minor (IR31, IR32), 6 info (IR33-IR38). Verdict: accept with a short fix round.
