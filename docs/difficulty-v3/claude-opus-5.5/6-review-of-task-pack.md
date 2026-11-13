# Sudoku difficulty-v3 — review of the task pack

| Field | Value |
|---|---|
| Date | 2026-11-12; first round inventory at 17:46, second round at 21:50; third round 2026-11-13 at 06:30, fourth round at 09:25, CV6-03 cross-check at 14:17 (+07:00) |
| Reviewer | SA1, claude-opus-5.5 |
| Author reviewed | SA2, gpt-6-astra |
| Basis | Accepted [`report-detailed.md`](../report-detailed.md) (R1-R24, tasks MS01-MS18) and [`clarifications.md`](../clarifications.md) Parts A-H. Part H (CV6-01) was unanswered in the first round and answered (S-OD1) in the second. SA2's [response to FS01-FS10](../gpt-6-astra/7-response-to-task-pack-review.md); in the third round its section 7 (FS11-FS24) and the MS05b1 section of [`notes.md`](../notes.md); in the fourth round the owner's answer S-OD2 and the orchestrator's notes in CV6-02, and SA2's sections 9 and 10 (the recovery plan) |
| Code examined | First round `6165c42` (MS04 committed; the working tree differed only in Part H). Second round `f788e02` (MS05a committed); the uncommitted MS05b1 work in the working tree was not read. Third round `f788e02`, and the uncommitted MS05b1 work only where section 12 cites it. Fourth round `f788e02` with the uncommitted MS05b1 work (section 14); the CV6-03 cross-check `f788e02` with the uncommitted recovery work through MS05r4 (section 15) |
| Result | See [section 11](#11-summary) and, for the third round, [section 12](#12-third-round-sa2s-second-round-changes). The MS05 series was released with the marker line after section 4, the MS06 series with the marker line after section 7; the third round ends with the marker line `SUDOKU ROUND 3 DONE`; the fourth round ([section 14](#14-fourth-round-the-s-od2-recovery-tasks-ms05r1-ms05r6)) ends with `RECOVERY REVIEWED: 7 findings (0 Blocker, 3 Major)` and `MS05r1 DISPATCHABLE`; the CV6-03 cross-check ([section 15](#15-cv6-03-cross-check-2026-11-13)) ends with `CV6-03 CROSS-CHECKED` |
| Changes made | This review only, and in sections 13 and 15 one subsection each of [`clarifications.md`](../clarifications.md) (CV6-02, CV6-03). No task, checklist, code, evidence or Execution log was edited; nothing was staged or committed |

## 1. Reviewed versions and limits

Paths in the table are under [`tasks/difficulty-v3/`](../../../tasks/difficulty-v3/). Times are the files'
LastWriteTime on 2026-11-12, +07:00. Sections 5-10 add the files they review; section 7 lists the
second-round versions and section 12 the third-round versions.

| File | LastWriteTime | Scope |
|---|---|---|
| `check-list.md` | 17:28:31.889 | Gates (section 7), scheduling, recipes E and Q, wave and ownership rows of MS05-MS18 |
| `MS05a-exactness-transport-and-messages.md` | 14:05:21.461 | Whole task |
| `MS05b-required-keeper-and-search.md` | 14:24:54.198 | Whole task |
| `MS05c-shallow-budget-instrumentation.md` | 14:05:21.471 | Whole task |
| `MS05d-select-shallow-budget.md` | 14:05:21.475 | Whole task |

Specification versions read: `report-detailed.md` 12:39:06.084, `clarifications.md` 17:31:51.110 (with Part H),
`notes.md` 16:50:19.910. `AGENTS.md` was read.

The pack's anchor tables say "at `2c665bb`". MS01-MS04 changed `generator/tests/soak.js` (+314 lines), the
manual suites `difficulty`, `killer` and `greater-than`, `generator/js/engine/difficulty.js` and four core
technique files. Every other anchor quoted by a task was checked at `6165c42` and is unchanged unless a finding
says otherwise. All task files reviewed pass the UTF-8/no-BOM, CRLF, final-newline and trailing-whitespace checks.

First round: no test suite or gate was run. Two read-only probes ran outside the repository: the tier tables
of five variants at `6165c42` (0.2 s), and the approximation of MS05b's acceptance in section 2 (about 50 s of
generation, run under the Sudoku lock protocol after the timing lock had been released).

Second round: inventory at 21:50 on `f788e02`. Specification versions read: `clarifications.md` 18:27:14.444
(S-OD1 recorded) and `notes.md` 18:21:42.076; `report-detailed.md` is unchanged. Every anchor quoted by MS05b2,
MS05e and MS08a-MS18e was checked at `f788e02`, and all files of this round pass the four format checks. No
test suite, gate or generation ran in this round. The only probes were `git show` reads, a dump of the
technique registry from a scratch export of `f788e02` outside the repository (under one second), and a text
scan for fused numbers (FS24).

## 2. Evidence used by several findings: the cost of required exactness

The probe used a scratch copy of `core/js` and `generator/js` at `6165c42`, outside the repository. Only
`generator/js/engine/digger.js` was patched, in four places: the `exact` of `keptPuzzle` (`:1085`) and of a dig
sample (`:1266`) also requires `SG.difficulty.requiredOf(rating, level, model).required === true`;
`distanceToLevel` (`:1507-1515`) returns 0.5 for an in-band shallow rating; the local loop (`:1392`) runs while
the state is not exact. No keeper, refinement, event or cap change. Seeds: the manual suite's `7000 + i` on the
direct digger route, Part H's 300-302 on the pipeline route.

| Cell | Route | Seeds | Attempts | Exact (required) | Ratings per attempt | Proposals per attempt | Time per request |
|---|---|---|---|---|---:|---:|---:|
| classic9 Normal | direct | 7000-7002 | 4, 8, 4 | 2/3 | 38-135 | 32,768 (cap) | 0.2-0.7 s |
| classic9 Nightmare | direct, one attempt | 7000-7001 | 1, 1 | 0/2 | 75, 295 | 32,768 (cap) | 0.5-1.5 s |
| classic9 Nightmare | direct | 7002-7004 | 6, 8, 8 | 1/3 | 47-580 | 32,768 (cap) | 3.5-5.8 s |
| killer Hard | pipeline | 300-301 | 8, 8 | 0/2 | not exposed | not exposed | 4.8-5.6 s |
| killer Expert | pipeline | 300 | 8 | 0/1 | not exposed | not exposed | 14.1 s |
| greaterThan Normal | pipeline | 300-302 | 2, 1, 1 | 3/3 | not exposed | not exposed | 0.0-2.1 s |

Reading:

- An attempt whose best state is in-band shallow does not spend 1,024 ratings. It ends at the 32,768-proposal
  cap, mostly memo hits, after 0.5-1.5 s on classic9 Nightmare. A request with no required candidate runs all
  8 attempts.
- MS02's ledgers ([`../evidence/MS02/`](../evidence/MS02/)) give 1.7 s for twelve classic9 Nightmare requests
  and 26.0 s for twelve killer Expert ones. Per-request time therefore rises by roughly 30x (classic9
  Nightmare) and 6x (killer Expert) where required puzzles are rare.
- At `6165c42` the Nightmare tier is `["nishio"]` for classic9, killer, jigsaw9, greaterThan and diagonalX;
  the Hell 1 and Hell 2 tiers are empty (vacuous). MS02 measured 0/12 qualified hits for classic9 Nightmare,
  killer Hard and Expert, jigsaw9 Nightmare and diagonalX Nightmare.

This approximates MS05b; it is not its implementation. It is used only for orders of magnitude in the gate
allowances below.

## 3. CV6-01 (Greater-Than Normal performance): impact only

Not a finding of this review: SA2 raised it as `clarifications.md` Part H. Impacts seen in the MS05 series:

- MS05b: in the probe, requiredness at Greater-Than Normal is available (3/3 required at `6165c42`), so
  activation alone is not expected to make the cell slower. The p95 of 2,035 ms comes from MS04's order change,
  as Part H shows. Three requests are not a measurement.
- MS05d: the six selection cells exclude Greater-Than, while Part H proposes MS05e right after MS05d. Recommend
  that MS05d also records `greaterThan normal` as a seventh, report-only cell (same flags, all four settings,
  not part of the selection rule), so MS05e starts from a measured post-MS05 baseline.
- MS06a captures the pre-target GS. If MS05e is inserted, MS06a must depend on it (Part H proposes this order).
- MS05d's GD runs only `--suite=difficulty`, without `greater-than`. Later GD runs that include `greater-than`
  (MS07e, MS17b, MS18e) must record the CV6 assertion as the known CV6-01 failure until it is resolved, not as
  a new regression of their own task.

## 4. MS05 series (MS05a-MS05d)

### FS01 — Targeted suites omit the worker and cache round trips of the wire

**Severity: Minor.** MS05a:99, MS05b:132, MS05c:116.

**Quoted.** MS05a:99: "Generator: `node tests\node-runner.js --suite=pipeline,events,result-view,i18n,steps,help`."
MS05c-T03 (MS05c:106): "work survives worker round trip".

**Problem.** MS05a-T01 and MS05c-T03 are worker-boundary contracts. The round-trip tests live in
`generator/tests/suites/worker.test.js:516-600`, and `generator/js/ui/cache.js:209,268` persists the output of
`toWire` (`cache.test.js:499`). Neither suite is in the three targeted lists or the file lists. The full quick
set would run them, but the new cases these criteria need have no named home.

**Fix.** Add `worker,cache` to the three `--suite=` lists. Name `generator/tests/suites/worker.test.js` in the
files of MS05a (exact true, false and absent through `toWire`/`fromWire`) and MS05c (`work` through the same
round trip). Note, no fix needed: an entry cached before MS05a decodes as `exact: false`
(`fromWire: exact = wire.exact === true`). This development-only window closes when MS17b purges cache schema 2.

### FS02 — No stop when the keeper already holds a required candidate

**Severity: Major.** MS05b:43-45; MS05b-T04 at MS05b:110.

**Quoted.** "Offer every valid completely rated candidate even if the local path will reject its score decrease.
A required in-band lower score beats a shallow higher score. Local search runs while not exact and within
existing caps". T04: "first-exact stop".

**Problem.** T04 names a first-exact stop, but the input text defines it only for the path's own state. A
required candidate with a lower score is kept by the keeper at distance 0 while the path rejects it, and the loop
(`digger.js:1392`, "while not exact" after MS05b) then runs to the attempt's caps: 32,768 proposals and up to
several hundred ratings in the probe. The returned puzzle does not change, because distance 0 cannot be beaten
(`offer` needs a strict improvement, `:1054`). But the wasted ratings enter MS05c's counters and MS05d's
selection metric (median full ratings per cell). They inflate the no-cap medians and bias the rule toward a
finite cap.

**Fix.** State the loop condition:
`while (!isExact(rating, spec.level, model) && !(keeper !== null && keeper.distance === 0) && !capsExhausted(caps))`.
The same keeper test already ends the sampling (`:1667`, `if (t > 1 && keeper.distance === 0) break;`). Test with
the strategy seam: a lower-score required neighbour is offered first; the invocation ends at the next loop
check and its ratings are counted once.

### FS03 — The continuation after above-band refinement is under-specified

**Severity: Major.** MS05b:47-48.

**Quoted.** "Above-band refinement may land shallow; do not return early and bypass continued local search.
Rebuild group/clue counts from the refined state before continuing."

**Problem.** Today `localSearchSteps` returns the refined state at once (`digger.js:1342-1347`). `refineDown`
(`:1100-1147`) stops in the band or ends still above it when its 64 ratings, the groups or the caps run out; it
never keeps a state below the band, and it does not run on a model with inequalities. The task does not say what
happens when the refined state is still above the band. From there every move is rejected
(`:1469`: `next.score < rating.score || next.score >= spec.max`), so "continue" spends the attempt's proposal
cap for nothing. It also leaves open where the continued loop's state comes from.

**Fix.** Specify, after `refineDown`:

1. Refined state exact: return it, as today.
2. Refined rating solved, `spec.min <= score < spec.max`, not exact: assign `givens`, `rating` and `clues` from
   the refined result and fall through to the existing set-up (`:1349` onwards builds `groups`, `unitClues` and
   an empty memo). `refineDown` has already pushed its `reveal` entries into the shared `ctx.log`.
3. Anything else (still above the band, or not solved): return as today.

Tests: a refined in-band shallow state that continues, and a refined still-above state that returns with no
further proposal.

### FS04 — MS05b is larger than one 20-60 minute task

**Severity: Major.** MS05b:6.

**Quoted.** "| Size / active time | Medium, upper end; 55-60 minutes plus gates |".

**Problem.** The scope covers:

- model-aware exactness and distance at every keeper site (`digger.js:1129,1235,1463-1464`,
  `killer.js:825,907`, `greater-than.js:403`);
- refinement and local continuation, and the attempt exits;
- event emission and two warnings;
- soak's pipeline path and override check, and the qualifier predicate;
- seven manual files, four design sections and both guides in two languages;
- scripted tests;
- then E (GG over 520 keys, and GR).

MS04, a smaller engine change, took 66 minutes plus E and review (check-list:546).

**Fix.** Split it and keep the wave order:

- **MS05b1, "Required exactness in the engine":**
  - code: `digger.js`, the `killer.js` and `greater-than.js` call sites, event emission and warnings;
  - scripted tests in `digger`, `difficulty-floor`, `pipeline`, `events`, `result-view` and `worker`;
  - docs: design 6.8, 7.2 and 13.13, and both guides;
  - gates: E (GG/GR).
- **MS05b2, "Consumers and predicates":**
  - `soak.js`: the pipeline path `:281` `exact: r.rating.level === combo.level` becomes `exact: r.exact`; the
    override prefix check (FS06);
  - `qualify.js:170`;
  - the seven manual files, with `node --check`;
  - design 15.3 and the notes.
  - It changes no generated output, so no E.

MS05c then depends on MS05b2. Add the wave row and the ownership rows.

### FS05 — `required` on a solved off-band `tune.miss` is unspecified

**Severity: Minor.** MS05b:52.

**Quoted.** "Emit prepared `tune.shallow` with required=false; hit true; unverified/unrated miss null."

**Problem.** A solved, completely rated off-band miss (Master when Expert was requested) is neither "unverified"
nor "unrated". `requiredOf(rating, requested, model)` returns true for most such harder puzzles, which would
read as "required" on a miss.

**Fix.** `tune.miss` always carries `required: null`: the field answers "does this in-band result need the
requested tier". MS05a-T02's schema already allows null. Add one event test for a solved off-band miss.

### FS06 — The override prefix check has no stated algorithm

**Severity: Minor.** MS05b:56.

**Quoted.** "Reject diagnostic weight/band overrides before generation if any floor is not a ladder prefix."

**Problem.** "Ladder prefix" is defined only by the quick test
`generator/tests/suites/difficulty-floor.test.js:152-172`, not in the task. Without it, the soak check may
compare the wrong list, for example `SG.techniques.list()` without the weight and `appliesTo` filters.

**Fix.** Copy the test's algorithm into the task. After applying `--weights`/`--bands`, for every id of
`SG.variants.list()` and every level:

- build the ladder as in the test:

  ```js
  ladder = SG.techniques.list()
    .filter(t => hasOwn(D.WEIGHTS, t.id) && SG.techniques.appliesTo(t, variantId))
    .map(t => t.id);
  ```

- require `ladder.slice(0, floor.length)` to equal `D.floorTechniques(level, model)`;
- require the same for the floor plus `D.tierTechniques(level, model)`.

Otherwise print the variant, the level and both lists, and exit 2 before generating. Test: an override that
breaks the prefix exits 2; find the override with the check itself, for example by lowering a late technique's
weight below `pointing`'s.

### FS07 — Two counting rules are missing in MS05c

**Severity: Minor.** MS05c:46-57.

**Quoted.** MS05c:50: "Charge subsequent non-memo full ratings only." MS05c:57: "Compare fullRatings with MS02's
scoped wrapper."

**Problem.**

1. After FS03, `refineDown`'s ratings (`digger.js:1121`) occur inside a local invocation. The task does not say
   whether they count in `localSearches[].ratings`, nor whether a refined in-band shallow state is "initially
   shallow" (`firstShallowAt = 0`) or carries the ordinal of the refinement rating.
2. "Compare" has no pass criterion. Every generation rating goes through `rateCounted` (`digger.js:991-997`,
   also called by `killer.js:849` and `greater-than.js:396`), so the two counts must be equal per request.

**Fix.**

1. Count refinement ratings in the invocation's `ratings`. The allowance starts at the first in-band shallow
   state, whether refinement or the loop reaches it; its ordinal is the rating that produced it. An invocation
   that starts in-band shallow has `firstShallowAt = 0`.
2. Criterion: per request, `fullRatings === sum(work[].ratings) ===` the scoped wrapper's count. A difference
   fails MS05c-T03 unless a named `SG.difficulty.rate` call outside `rateCounted` explains it, recorded per
   request.

### FS08 — Stale soak anchors; no request-offset shard

**Severity: Minor.** MS05c:77; MS05d:52-53; check-list:348-349.

**Quoted.** "| `generator/tests/soak.js:87-88` | Diagnostic override parsing |";
"| `generator/tests/soak.js:202-228`, `function seedFor` |"; "| `generator/tests/soak.js:401-419`,
`const ok = failed === 0` |".

**Problem.** MS02 moved soak's code. At `6165c42` the lines are:

- `--weights`/`--bands` parsing: `soak.js:104-105`;
- `function seedFor(tag)`: `:260`;
- `generateOne`: direct route `:268-273`, pipeline route `:275-282`; exactness by level name at `:281`;
- `const ok = failed === 0 && lowLevels.length === 0 && lowOthers.length === 0;`: `:586`.

Separately, the check-list requires bounded shards for long matrices, but soak can only run a whole cell
(`--count` from index 0). Section 2 puts the slowest MS05d cell, killer Expert with no extra cap, near
12 x 14 s, about three minutes, so the ten-minute stop is not expected to apply. If it does, there is no
fallback.

**Fix.** Replace the anchors with these lines and quotes. Optionally, in MS05c (the soak owner), add
`--from=<k>`: requests k..k+count-1, with the tags `variant:level:index` and the seeds unchanged. A cell that
reaches ten minutes can then be split without changing its manifest.

### FS09 — The GD run after activation has no realistic allowance or rule for time failures

**Severity: Major.** MS05d:104-110; check-list section 7, GD row and :376-377.

**Quoted.** MS05d:106: "node tests\node-runner.js --suite=difficulty". MS05d:109-110: "Intermediate hit-rate
shortfalls are recorded as availability evidence, not weakened assertions. GD planning allowance1-8 minutes."

**Problem.**

- `--suite=difficulty` is the manual suite (`node-runner.js:13-14,127`). It generates 100 puzzles for each
  offered classic9 level and 20 for Hell 1 (`generator/tests/manual/difficulty.test.js:1199-1223`).
- MS04 ran it in 60.3 s with the old predicate (`../evidence/MS04/evidence.md:48`).
- With required exactness (section 2), a Nightmare request without a required candidate takes 3.5-5.8 s.
  The Nightmare batch alone is about 4-8 minutes, plus Normal's non-exact requests. The single invocation may
  reach the ten-minute stop (check-list:348).
- The median-time assertion `expect(times[times.length >> 1]).toBeLessThan(SG.test.timeLimit(BUDGET_MS[level]))`
  (`:1318`; Nightmare 2,500 ms at `:1202-1205`) will then fail. The GD rule covers only I5, `digLevel` and
  hit-rate shortfalls, so a developer cannot tell whether a time failure blocks the task or is evidence.

**Fix.**

1. Before the full GD, run the Nightmare batch alone:
   `node tests\node-runner.js --suite=difficulty --filter="time) > nightmare >"` (the filter matches
   "suite > describe > test", `core/tests/harness.js:492-519`). If its time projects the whole run
   beyond nine minutes, ask the orchestrator for a GD-specific ceiling before starting. Never kill and rerun.
2. State in MS05d and in the check-list's GD rule: a median-time failure at a level whose exact rate fell
   because of requiredness is recorded with the availability evidence and handed to MS18d. It is not an edit of
   `BUDGET_MS`, and not a blocker of MS05d.
3. Replace "1-8 minutes" with a measured planning figure (about 6-10 minutes on this estimate). Apply the same
   rule to the GD runs of MS07e, MS17b and MS18e.

### FS10 — Missing spaces before numerals across the pack

**Severity: Minor.** Pack-wide; first seen at MS05d:110.

**Quoted.** MS05d:110 "allowance1-8"; check-list:388 "is1-120 seconds/shard"; :370 "seed20260101"; :435
"indexes0/5/10/15"; :484 "base20260601 ... GS's20260101. First40, expand30-35 hits"; MS07b:44 "clamped to3";
MS11b:36 "A is2 ... an extra1"; MS12:32 "cap50000"; MS08b:39 "at50000, entry/every256".

**Problem.** Words and numbers are fused in prose and in algorithm statements. Most read correctly in context,
but in algorithm text ("clamped to3", "A is2") a developer has to guess whether a symbol or a value is meant.

**Fix.** Insert the missing spaces. The case-sensitive pattern
`\b(is|allowance|indexes|seed|All|all|base|budgets|these|cap|First|first|expand|jobs|Jobs|to|at)\d` finds them
all; check each hit by hand, because names such as `classic9`, `hell1` and `G09` are correct as written.

MS05 SERIES REVIEWED

## 5. MS06 series (MS06a-MS06d)

| File | LastWriteTime | Scope |
|---|---|---|
| `MS06a-pre-target-evidence.md` | 13:22:06.973 | Whole task |
| `MS06b-target-policy-primitives.md` | 14:21:26.251 | Whole task; R6/R7 contracts and vectors checked against the report |
| `MS06c-target-through-all-stages.md` | 14:17:14.407 | Whole task; `digGuidedSteps`, `refineDown` and the local loop read at `6165c42` |
| `MS06d-target-comparison.md` | 13:22:07.371 | Whole task |

R6 and R7 are copied correctly: the target draw, the three objective shapes, the apply table, the
quality-then-target ranking, the 64-rating refinement allowance and the comparison rule. The MS06b vectors
are consistent with the table (target 500: 550 and 450 tie; true/true 550 to 600 is refused). `rng.fork(tag)`
derives from the seed and the tag only (`generator/js/engine/rng.js:2-4`), so the target draw cannot disturb
the random and guided streams. The section 2 probe puts every MS06a/MS06d cell well under ten minutes.

### FS11 — Stale soak anchors in the two evidence tasks

**Severity: Minor.** MS06a:42-43; MS06d:36-37.

**Quoted.** MS06a:42: "Baseline anchors at `2c665bb`: `generator/tests/soak.js:202-228` (`function seedFor` /
`function generateOne`), `:234-241` (`const t0`)"; MS06d:36 has the same anchors.

**Problem.** MS02 moved the code. At `6165c42`: `function seedFor(tag)` at `soak.js:260`,
`function generateOne(combo, tag)` at `:267-283`, `const t0 = process.hrtime.bigint();` at `:353`.

**Fix.** Replace the line numbers; keep the quotes.

### FS12 — `acceptReveal` cannot tell an exact in-band state from a shallow one

**Severity: Minor.** MS06b:57 and MS06b:62-64.

**Quoted.** "acceptReveal(current,next,spec,target,nextIsExact) -> boolean"; "After crossing in-band required,
accept only an in-band required reveal strictly nearer target while above it."

**Problem.** The rule depends on whether the current state is in-band required, but the pure helper receives
only `nextIsExact`. It must either assume the caller's invariant (refinement continues in band only from an
exact state) or recompute requiredness, which a pure helper cannot do. The vectors test no `acceptReveal` case.

**Fix.** Add `currentIsExact` to the signature, or state the precondition in the contract: "called in band only
when `current` is exact; otherwise refinement has already stopped". Add vectors with `spec = {min: 700,
max: 1000}` and target 850: current 1100 above band, next 920 solved: true; current 920 exact, next 880 exact:
true; next 900 exact (not nearer): false; next 840 shallow: false; next 690 (below minimum): false; current 800
exact (below target): no further reveal.

### FS13 — What happens when the pool winner is not applied is unspecified

**Severity: Major.** MS06c:46; MS06b:38-46 (the apply table).

**Quoted.** "Apply MS06b's tier-first pool and stop table. Empty pool terminates; refusals remain rejected."

**Problem.** Today the guided pass always applies the pool's best removal and loops until no group is left
(`digger.js:719-797`; `if (best === null) continue;` at `:781` only handles an all-refused pool). With R6's
table the winner can be refused ("never", or a finite target that does not strictly improve). The task does not
say whether the pass then ends with the current board, or marks the winner's group rejected and draws the next
pool. Both terminate, but they produce different puzzles, so GG/GR and MS06d's comparison depend on the choice.

**Fix.** State it. Recommended: a refused winner ends the guided pass with the current board, recorded as
`trace.pass('guided', 'end', clues)`. The pool winner is the best of its pool by the same order, so no other
member could be applied either. Add a test where the current state is tier-used and the winner is not, and one
with true/true and a non-improving finite target; both end the pass and keep the givens.

### FS14 — The local acceptance predicate after MS06c is incomplete

**Severity: Major.** MS06c:52-53.

**Quoted.** "Local moves use quality then target distance, not raw-score nondecrease."

**Problem.** Today a local move is rejected when `!next.solved || next.score < rating.score ||
next.score >= spec.max` (`digger.js:1469`). The task replaces the middle test but does not say whether the band
ceiling stays. R3's quality is `gap * 1000 + off` off band (`distanceToLevel`, `:1507-1515`). From a state two
levels below the band (about 2000), a move one level above it (about 1000) has the lower quality, so pure
"quality then target" ranking would accept an above-band move that today's loop never accepts. Refinement, not
the local loop, owns above-band states.

**Fix.** Write the predicate out:

```js
accept = next.solved && next.score < spec.max &&
  preferRated(quality(next), next.score, quality(current), current.score, target);
```

Here `quality` is R3's distance computed with the candidate's model (0 exact, 0.5 in-band shallow, otherwise
the level-gap distance). Keep the loop condition from MS05b (with FS02's keeper stop). Test an above-band
neighbour with a lower quality value: it is rejected.

### FS15 — MS06c is larger than one 20-60 minute task

**Severity: Major.** MS06c:6.

**Quoted.** "| Size / active time | Medium, upper end; 55-60 minutes plus E |".

**Problem.** The task threads the target through five contexts and the keeper, makes the objective
discriminated, adds initialisation and the apply table to the guided pass, changes refinement and the local
ranking, adds `target` to the pipeline, wire, soak rows and tune events, edits both Generator locales and the
help/explain data, three design sections and both guides, then runs E. That is more than MS05b (FS04).

**Fix.** Split it without an intermediate guided-only policy:

- **MS06c1, "Target plumbing, no behaviour change":** draw `targetFor(spec, sampleRng)` in the sample context
  and carry it through `LevelPuzzle`, keeper candidates, `attemptBest`, `searchStrategy`, pipeline result,
  wire, soak rows and the optional tune-event argument. Wrap objectives in the discriminated shapes while the
  guided pass still applies today's rule. Tests for target lifetime and the unchanged outputs; GG must check
  unchanged; GR records the wire's new `target`.
- **MS06c2, "Activate the policy in all three stages":** initial evaluation and the apply table (FS13),
  refinement continuation, local ranking (FS14), locales, help/explain data, design and guides, E.

### FS16 — The refinement vector lacks its band and its entry point

**Severity: Minor.** MS06c:102-104.

**Quoted.** "Extend MS06b vectors with a scripted 1100->920(required)->880(required) refinement toward 850;
reject 840(shallow), under-minimum and non-improving reveals. Initially exact 920 does not start polishing."

**Problem.** The vector does not give the band, so "under-minimum" has no value, and "initially exact 920"
does not say which function receives it (refinement is entered only from above the band, so it cannot receive
an exact input).

**Fix.** Give the band (`spec = {min: 700, max: 1000}`, Expert) and say that "initially exact 920" is the input
of `localSearchSteps`: it returns at once with no refinement or move, and the attempt stops (first-exact stop).

## 6. MS07 series (MS07a-MS07e)

| File | LastWriteTime | Scope |
|---|---|---|
| `MS07a-window-kernels-and-pattern-metrics.md` | 14:17:14.413 | Whole task; `tech-chain.js` and `techniques-helper.js` anchors read |
| `MS07b-register-chain-windows.md` | 13:25:30.497 | Whole task; Player help snapshot test read |
| `MS07c-select-chain-cutoff.md` | 13:25:30.626 | Whole task |
| `MS07d-qualification-record-merger.md` | 14:28:31.838 | Whole task; `qualify.js` constants and early-stop proof checked |
| `MS07e-first-qualification.md` | 14:21:26.259 | Whole task |

Checked and correct: R9's table (orders 190/198/200/202, weights 1100/1400/1700/2600, base costs 118/210);
the catalogue count after MS07b (28 IDs, 23 unscoped: 21 existing unscoped plus the two split IDs); the
selection rule (more exact hits, C=6 on a tie); MS07d's protocol facts against `generator/tests/qualify.js`
(`FIRST_SEEDS` 40 at `:56`, `GUARD_MS` 120000 at `:61`, `SEED_BASE` 20260601 at `:62`, budgets 2000/10000/30000
ms at `:126-128`, tag `key + '/' + index` at `:393`, early stops at `:310-312`, second round queued with
`unshift` at `:337-339`). No production code passes `maxChainLength` or `maxNishioDepth`; only
`core/tests/suites/tech-chain.test.js` and `logical-solver.test.js` do, so clamping Infinity to the ID ceiling
affects tests only, as MS07a/MS07b plan.

### FS17 — The supplement recipe would replace the random sweep states

**Severity: Minor.** MS07a:68-70.

**Quoted.** "For rare techniques, retain all existing 120/300 random states and minFirings=3. Add deterministic
real positive states to `opts.states` using H.assertSound's existing API, and assert the resulting
random-plus-supplement count."

**Problem.** In the existing API, `opts.states` replaces the random states:
`var states = opts.states || randomStatesWithKnownSolution(m, SG.testkit.rng.create(seed), count);`
(`core/tests/fixtures/techniques-helper.js:594`). Passing only the supplements drops the random inputs, the
opposite of the intent. The default seed `DEFAULT_SEED = 20260101` (`:100`) is not exported.

**Fix.** Give the recipe: `opts.states = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(20260101),
count).concat(supplements)` with the suite's existing seed and count (300 or 120), keep `minFirings: 3`, and
assert that the returned `stats.states` equals `count + supplements.length`.

### FS18 — MS07b is larger than one 20-60 minute task, and part of it can move

**Severity: Major.** MS07b:6, :39, :108, :111-114.

**Quoted.** "| Size / active time | Medium, upper end; 55-60 minutes plus E/GH/cost |"; "Soak gains
`--chain-window=4|6`"; the `pattern-cost.js` command; the discovery commands.

**Problem.** Registration, both apps' locales and the help examples cannot be split: the Player help test
requires an example for exactly the registered IDs (`player/tests/suites/help.test.js:125-129`), and the
check-list forbids a separate fixture writer. The rest of the task is still large: wrappers, two registrations
and weights, fixtures, archives, locales in two apps and two languages, help discovery, soak override, cost
record, design, hint design and guides, E and GH.

**Fix.** Move the two measurement aids, which only MS07c needs, to MS07c: the soak `--chain-window=4|6`
override (MS07c then owns `generator/tests/soak.js`; update the check-list's ownership row) and the GP-cost
record of `forcingChainLong` and `nishioDeep`. MS07b keeps the coupled integration and E/GH.

Also plan the Hell 1 source. After the split, Hell 1's tier is `["nishioDeep"]`: 1.25 x 2600 = 3250 is below
Hell 1's maximum 3600 but not below Nightmare's 2400 (`allowedFor`, `generator/js/engine/difficulty.js:334-341`;
bands at `:121-123`). `--levels=hell1` discovery therefore needs puzzles that require depth-2 Nishio. Each batch
is bounded by the tool's 8-minute deadline, but B's 48 requests (check-list:203-206) may not yield one. Check
first whether the existing `nishio` help example is a depth-2 proof (today's default depth is 2,
`core/js/engine/tech-chain.js:64-66`). If it is, it is the natural `nishioDeep` source and `nishio` needs a
new depth-1 source.

### FS19 — The checkpoint's GD and the later gates do not account for a non-vacuous Hell 1

**Severity: Major.** MS07e:80, :85-86; check-list section 7, GD row.

**Quoted.** MS07e:86: "1-12 hours total; GG10-90 minutes, GD1-8 minutes."

**Problem.** At `6165c42` Hell 1's tier is empty, so every Hell 1 result is vacuously required (MS02: 12/12
"vacuous"). After MS07b it is `["nishioDeep"]`. The manual suite's Hell 1 batch has 20 puzzles
(`generator/tests/manual/difficulty.test.js:1200`), and each request that finds no depth-2 Nishio proof will
now run all 8 attempts with expensive top-tier ratings. Together with FS09's Nightmare batch, MS07e's GD can
exceed ten minutes. The same applies to Hell 1 cells in GQ-first (40 requests, protocol early stops apply)
and to any later GD.

**Fix.** In MS07b's handoff, record one bounded measurement of classic9 Hell 1 after registration
(`node tests\soak.js --variant=classic9 --level=hell1 --count=2 --seed=20260101 --no-gate --json=...`).
MS07e plans its GD from it under FS09's rule (Nightmare and Hell 1 batches measured alone first; an
orchestrator-approved ceiling if the projection exceeds nine minutes). Replace "GD1-8 minutes".

## 7. Second round: the MS05 split files, MS06 and MS07 re-checked

| File | LastWriteTime | Scope |
|---|---|---|
| `check-list.md` | 19:08:51.750 | Section 7 (GD, E, GQ), the gate rows, waves and ownership, again |
| `MS05b1-required-exactness-engine.md` | 18:54:37.133 | Dispatched before this round; read only for FS02-FS05 |
| `MS05b2-required-exactness-consumers.md` | 18:54:37.156 | Whole task |
| `MS05e-guided-sign-dig.md` | 19:17:06.731 | Whole task |
| `MS06a-pre-target-evidence.md` | 18:40:20.493 | Changes since the first round |
| `MS06b-target-policy-primitives.md` | 19:08:51.766 | Changes since the first round |
| `MS06c-target-through-all-stages.md`, `MS06d-target-comparison.md` | 14:17:14.407, 13:22:07.371 | Unchanged; re-read against MS05e |
| `MS07a-window-kernels-and-pattern-metrics.md` to `MS07e-first-qualification.md` | 19:08:51.772 to 19:08:51.790 | Changes since the first round |

**MS05b1.** Frozen at dispatch; read only to check the accepted fixes. FS02 and FS03 (the three-part local
loop condition with the keeper stop and the refinement outcomes, `:60-90`), FS05 (`null` for every miss,
solved off-band included, `:101`) and the quality computed before every keeper prefilter (`:54`) are in. Its
anchor `digger.js:1661` (`let attemptBest = null`) matches `f788e02`. No finding.

**MS05b2.** No finding. `allowedFor` (`generator/js/engine/difficulty.js`) reads the technique weights at
each call, so the ordered-prefix validation sees a `--weights` override, and the vector
`--weights={"nishio":1}` is a real prefix violation. The anchors `soak.js:104-105`, `:188`, `:260`, `:267-283`
(pipeline call `:281`), `qualify.js:170` and the exports at `:496` match `f788e02`.
`SG.difficulty.floorTechniques` and `tierTechniques` are exported, and the manual
`describe('qualification: …')` is at `difficulty.test.js:322`. Its seven manual files are only syntax-checked
(`:159-165`); see FS22.

**MS05e.** No content finding. The S-OD1 algorithm (`:52-64`) and the R6 objective contract with its
absent/null target rule (`:66-84`) agree with MS06b's table. The anchors are given "at `2c665bb`; find moved
lines by the quoted text" (`:86`), and every quote is found at `f788e02`: `greater-than.js`
`MAX_TUNE_ROUNDS` `:40`, `solveWithin` `:193`, `const stats` `:249`, `techniqueOracle` `:296`, `digPass`
`:303`, the technique pass `:380`, `clueFloorScale` `:449`; `digger.js` strategy registry `:894-914` and
`const resolved =` `:1192`. The bounded tools it calls exist at `f788e02`: `perf.js --hash-record` and
`--hash-merge`, `replay-fixtures.js` and `replay-goldens.js` with `--ids`, `--record` and `--merge`, and
`player/tests/tools/make-technique-examples.js`. Its fused numbers are in FS24.

**MS06.** MS06c and MS06d are unchanged, so FS13-FS16 stand as written. MS06a changed its dependency (MS05e
accepted after MS05d) and its goal; FS11 still applies, now at MS06a:43-44. MS06b added the target
forwarding step (`:83`), which raises FS20. SA2 has not answered FS11-FS19 yet.

### FS20 — The sample target reaches the sign dig through an untested hand-off that MS06c does not own

**Severity: Major.** MS06b:18-19, :82-83, :101; MS06c:30-38, :95, :107; MS05e:81-83.

**Quoted.** MS06b:83: "Prepare the CV6-01/S-OD1 handoff in `digLevelSteps`'s `resolved` options: forward
`options.target` only when present (including null) to MS05e's sign dig; MS06c supplies the sample's target,
with no new draw or active target in this preparatory task." MS06b:82: "Add helpers without changing any
existing caller." MS06b-T03: "Pure helpers remain unused by production; both quick sets pass". MS05e:81-83:
"MS06b prepares its forwarding and MS06c supplies the one originating sample target."

**Problem.**

- Under S-OD1 the Greater-Than sign pool ranks by the sample target (MS05e:58-59, :71). The strategy can see
  it only as `options.target`: `digLevelSteps` builds `resolved` (`generator/js/engine/digger.js:1192-1206`)
  and passes it to the strategy (`:1217`).
- MS06b puts the forwarding line in production code, against its own scope ("Out: calling it from production
  generation, new RNG draws, changed outputs", `:18-19`) and the first sentence of its step 1, and with no
  test and no AC row: T01-T03 cover the pure helpers only.
- MS06c (unchanged since 14:17, before MS05e was written) never mentions the sign dig, strategy options or
  Greater-Than. Its target route (`:30-38`) is the guided dig, `refineDown`, `localSearchSteps`,
  `searchStrategy` and `attemptBest`; T01 (`:95`) checks "attemptBest, later RNG, keeper, pipeline and wire";
  the test plan (`:107`) has no Greater-Than suite. "Draw `targetFor(spec,sampleRng)` once in the sample
  context" (`:35`) does not say whether the sample loop (`digger.js:1664-1688`, which calls `digLevelSteps`
  with `rng.fork('dig#' + attempt + '.' + t)` at `:1672-1674`) or `digLevelSteps` draws it. If MS06c draws
  in the loop and passes the target only to `LevelPuzzle`, the sign dig keeps ranking by the higher score, no
  test fails, and MS06d compares the three Greater-Than cells without the target effect the owner chose.

**Fix.**

1. MS06b: name the edit and test it. In `digLevelSteps`, after the `resolved` literal:
   `if (Object.prototype.hasOwnProperty.call(options, 'target')) resolved.target = options.target;`.
   Scope: "the only production edit is this forwarding line, inert while no caller passes `target`"; reword
   step 1 and T03 to match. Test in `digger-target.test.js`: a spy `options.strategy` records
   `'target' in opts` and `opts.target` and delegates to `SG.digger.getStrategy('cells')`; three
   `SG.digger.digLevel` runs with one seed (`target: 812`, `target: null`, no key) show 812, null and no key,
   and give equal givens.
2. MS06c: state the route. Recommended: the sample loop names the sample RNG
   (`const sampleRng = rng.fork('dig#' + attempt + '.' + t)`), draws `targetFor(spec, sampleRng)` (a child
   fork, so the sample stream is unchanged), and passes `target` in the `digLevelSteps` options; the local
   search call (`:1695-1698`) passes `target: attemptBest.target`. Add "the dig strategy's `options.target`,
   Greater-Than's sign dig included" to T01, and `greater-than-guided` to the test plan with one case: a
   Greater-Than Expert pipeline request whose `signs` strategy, wrapped through the register/unregister/get
   seam that MS05e already uses, receives the same finite target as `LevelPuzzle.target`.

**MS07.** MS07a-MS07e changed spacing. MS07e's GD now uses the check-list's bounded manifest and projects
"especially the now-nonvacuous Hell1" (`MS07e:87-95`), which answers the MS07e part of FS19. FS19's first fix
item (one bounded Hell 1 measurement in MS07b's handoff, the input of that projection), FS17 and FS18 remain
open.

MS06 SERIES REVIEWED

## 8. S3 groups 1-4 (MS08a-MS13c)

| File | LastWriteTime | Scope |
|---|---|---|
| `MS08a-skyscraper.md` to `MS13c-activate-grouped-chains.md` (13 files) | 19:10:35.327 to 19:10:35.386; `MS13b-group-proof-consumers.md` 14:05:21.495 | Whole tasks |

Checked and correct:

- Orders and weights fit the MS04 registry at `f788e02` with strictly increasing orders and non-decreasing
  weights, as R11-R16 give them: skyscraper 112/330 and two-string kite 114/340 between xWing 110/320 and
  simpleColouring 120/360; empty rectangle 124/380 and finned X-Wing 126/400 before swordfish 130/420; remote
  pairs 132/440 and finned swordfish 134/480 before cageSplit 135/520; WXYZ-Wing 155/800 between xyzWing
  150/750 and wWing 170/850; BUG+1 182/920 after uniqueRectangle 180/900; XY-Chain 186/1000 before
  forcingChain 190/1100. The final catalogue is 40 IDs, 34 unscoped: 28 and 23 after MS07b, plus 12 new IDs
  of which only `lawOfLeftovers` is scoped.
- Every geometry vector of MS08a, MS08b, MS08c, MS09a, MS09b, MS10a, MS10b, MS11a, MS11b and MS12 was worked
  by hand on its stated candidates and gives the stated eliminations and near misses.
- Anchors that did not move: `core/js/engine/tech-fish.js` `ownerTable` `:56`, `findFish` `:281`,
  `findStrongLinks` `:309`; `tech-wing.js` `findXyWing` `:130`, `findXyzWing` `:187`, `findWWing` `:283`,
  `isDeadlyGeometry` `:351`, `buildRectangles` `:383`, `findUniqueRectangle` `:477`; `tech-subset.js`
  `findSubset` `:195`; `player/js/ui/play.js` `localizeArgs` `:226`; `formatChains` in
  `player/js/ui/i18n.js:240` and `generator/js/ui/i18n.js:252`. MS13a's `tech-chain.test.js:124-185` lies
  inside the proof checker (from `:79`; `chainProblems` at `:120`).

### FS21 — Stale line anchors in MS08a, MS11c, MS17b and MS18a-MS18e

**Severity: Minor.** MS08a:48; MS11c:48; MS17b:59-61; MS18a:42; MS18b:37; MS18d:45-46; MS18e:39-40.

**Quoted.** MS11c:48: "`core/tests/suites/techniques.test.js:64-69` (`expect(assuming)`)". MS18d:45-46:
"`generator/tests/fixtures/perf-helper.js:41-47` (target rule), `:72-87` (`function cells`), `:108-129`
(`function measure`); `generator/tests/perf.js:244-254` (mode separation)".

**Problem.** These anchors were right at `2c665bb`. MS02-MS04 added tests and tooling above them, so at
`f788e02` they point at other code. Where the task quotes no text, a developer cannot find the intended line.

| Task:line | Anchor in the task | At `f788e02` |
|---|---|---|
| MS08a:48 | `techniques.test.js:71-87` (fixture coverage) | `:91-107` (the tests at `:91` and `:104`) |
| MS11c:48 | `techniques.test.js:64-69` (`expect(assuming)`) | `:75-79` |
| MS17b:59 | `difficulty.test.js:759-767` (`ratingVersion`) | `:765-773` |
| MS17b:60 | `difficulty.test.js:1316` (`p.rating.ratingVersion`) | `:1366` |
| MS17b:61 | `replay.test.js:1601` | `:1600` |
| MS18a:42, MS18b:37 | `soak.js:202-241`, `:202-228` | `seedFor` `:260`, `generateOne` `:267-283`, `const t0` `:353` (as FS11) |
| MS18d:45 | `perf-helper.js:41-47`, `:72-87`, `:108-129` | target rule `:47-53`, `function cells` `:77-89`, `function measure` `:113-135` |
| MS18d:46 | `perf.js:244-254` (mode separation) | `:455-476` |
| MS18e:39 | `difficulty.test.js:1182,1212,1363` | `:1232`, `:1262`, `:1413` |

**Fix.** Replace the line numbers, keep the quotes, and add a quote where there is none (MS17b:61, MS18e:39).

## 9. S3 groups 5-6 (MS14a-MS16)

| File | LastWriteTime | Scope |
|---|---|---|
| `MS14a-leftover-support-kernel.md` to `MS16-sue-de-coq.md` (6 files) | 19:10:35.392 to 19:10:35.416 | Whole tasks |

Checked and correct: `lawOfLeftovers` 87/200 (group `locked`, scope `['jigsaw9']`, MS14b:29-30) sits between
minMaxForcing 85/180 and hiddenTriple 90/220; ALS-XZ 194/1250 and Sue de Coq 196/1300 sit between forcingChain
190/1100 and forcingChainLong 198/1400; the vectors of MS14a, MS15a, MS15b and MS16 were worked by hand and are
right. MS14c's premises hold: there is no `core/tests/suites/tech-cage.test.js` at `f788e02`, `pointOutOfCage`
is at `tech-cage.js:118`, and the existing cageCombo fixtures of the manual Killer suite
(`generator/tests/manual/killer.test.js:561-660`) build their own boards without the generated corpus.

### FS22 — The whole-corpus manual suites have no measured bound, and MS05b2's manual edits first run in MS18e

**Severity: Major.** MS14c:51, :66, :71-77; MS18e:81-100; check-list:452, :516-517; MS05b2:118-119, :159-165.

**Quoted.** MS14c:74-77: "node tests\node-runner.js --suite=killer" and "Jobs 1/no --jobs; expected 10-180
seconds, stop at ten minutes." MS18e:97-98: "GD jobs 1/no --jobs; measure/project each group and retain
unchanged request counts, each command under 540 seconds." check-list:516-517: "If a single unchanged-count
group reaches540 seconds, stop/report for assigned bounded tooling".

**Problem.**

- Each manual variant suite generates its whole multi-level corpus on first use: `corpus()` in
  `generator/tests/manual/killer.test.js:73-85` (every level, 20 requests per level and 8 from Expert on: 120
  pipeline requests, 40 of them Expert or above), and `puzzleRun()` in `jigsaw.test.js:795-806`,
  `greater-than.test.js:196-208`, `extra-regions.test.js:173-193` and `wordoku.test.js:109-126`. A `--filter`
  selects tests, not levels, so each of MS18e's five `--filter="I5:"` selectors (`:83-87`) and MS14c's whole
  `--suite=killer` is one unsplittable unit.
- Nothing measures them under the new rules. The last run is MS04's GD (`difficulty,killer,greater-than`,
  338 s, check-list:692; `difficulty` alone took 60.3 s), before requiredness. After MS05b1, a Killer request
  at Hard or Expert with no required candidate runs all its attempts: 4.8-5.6 s and 14.1 s per request in
  section 2, against about 0.5 s and 2.2 s in MS02's ledgers. MS07b then makes Hell 1 non-vacuous. MS14c's
  "expected 10-180 seconds" has no basis; the Killer corpus alone may pass 540 s.
- When a selector reaches 540 s, check-list:516-517 asks for "assigned bounded tooling", but no task owns it.
  The stop would come in MS14c or in the release task MS18e.
- MS05b2 edits seven manual files at named sites (`:118-119`) but only runs `node --check` on them
  (`:159-165`). Apart from greater-than (MS05e's GD-CV6) and killer (MS14c), the edited contracts in jigsaw,
  extra-regions, wordoku and variants are first executed in MS18e.
- MS14c changes no production code (`:18-19`), so a Killer GD there checks nothing that the unchanged quick
  suites and its new `tech-cage` suite do not.

**Fix.**

1. Assign the bounded tooling now, as a small test-only task right after MS05b2 (or inside MS05b2): each
   manual variant corpus generates a level only when a test of that level first asks for it (same seeds, same
   counts, same order inside a level), and each corpus-wide I5 test becomes one `it` per level, named with the
   level, with unchanged assertions. A `--filter` on one level then generates only that level. The task shows
   for one level of each suite that the per-level build gives the same givens as the full build (a hidden
   cross-request cache would break this). `variants --filter=CV3` (MS18e:88) can already be split per variant
   (`describe('variants: ' + def.id`, `variants.test.js:405`).
2. In the same task, or in MS05d's GD, run every per-level I5 selector once under the lock and record its
   time. This executes MS05b2's edits early and gives MS14c, MS18e and the GD owners a measured projection.
3. MS14c: drop the Killer GD and the "GD Killer" of MS14c-T03, or run only corpus-free selectors, for example
   `--filter="killer: combination table (P4)"` and the cageCombo fixtures of
   `killer: cage techniques (K1 cageCombo, K2 ruleOf45, K3 cageSplit)` (seconds). Remove "expected 10-180
   seconds" and update check-list:452 ("MS14c runs killer only").

## 10. MS17-MS18 and pack-wide checks

| File | LastWriteTime | Scope |
|---|---|---|
| `MS17a-history-version-marker.md` to `MS18e-release-evidence-closure.md` (7 files) | 19:10:35.422 to 19:10:35.457 | Whole tasks |

Checked and correct:

- MS17a's `generator/js/ui/history.js` anchors match `f788e02`: `const VERSION = 1` at `:19` (inside
  `:18-22`), `entryOf` `:60`, `storedEntry` `:92`, `history.item.meta` `:302` and `history.open.title` `:319`
  (inside `:290-320`), and the EN/VI packs at `:430-449`.
- MS17b: `cache.js` `SCHEMA_VERSION = 2` `:47` and `verify` `:228` match. The regression hash serialises the
  givens, solution, regions, cages, inequalities and symbols, not the rating (`serialize`,
  `generator/tests/fixtures/perf-helper.js:179-192`), so the `RATING_VERSION` bump leaves the 520 records
  unchanged, as MS17b says.
- MS18c: `qualify.js` `child` `:141-171`, `replay.test.js` `entry` `:22-31` and `difficulty.test.js:297-317`
  (offered levels against the published table) match; `:443-466` is the summary step before `main` (`:466`).
- MS18e: classic9 `difficultySupport` is veryEasy to hell1 at `f788e02`, and the manifest one-liner selects
  those levels.

### FS23 — MS18d finds a GP cell that cannot finish in 540 s only at the stop

**Severity: Minor.** MS18d:29, :57-59, :89-92.

**Quoted.** MS18d:89-92: "Estimate 1-540 seconds/GP cell, 0.5-8 hours total ... Stop/investigate at ten
minutes; do not silently split runs with changed cold/warm timing semantics. An unsupported safe split is a
tooling blocker."

**Problem.** A GP cell is 50 requests in one invocation. The targets reach 20,000 ms for samurai, flower and
sohei from Hard on, 16,000 ms for mega12 Hell 2 and 30,000 ms for samurai Hell 2
(`generator/tests/fixtures/perf-helper.js:54-70`). A cell whose mean request time is above 10.8 s cannot
finish 50 runs in 540 s. `perf.js` can select a part of the seeds (seed `i` is `seedBase + i * 101`,
`perf-helper.js:121`, so `--seed=9525 --runs=25` gives i = 25-49), but it prints only p50/p95/max
(`perf.js:487-507`), so two parts cannot be merged into one nearest-rank p95: there is no supported safe split.
MS18c's GQ-final record already holds the per-cell request times of the final sources, so the risk is known
before MS18d starts; MS18d meets it only at the ten-minute stop, possibly after hours of other cells.

**Fix.** Add a step 0 to MS18d: project each cell's GP time as 50 times its GQ-final mean (or p50) request
time, list the cells projected above 450 s, and report them to the orchestrator before the first GP command.
If there is any, the orchestrator assigns the tooling first (for example a per-run JSON ledger in `perf.js`
and a merge that computes the nearest-rank percentiles from all 50 outcomes, as MS03 did for hashes). Replace
"Estimate 1-540 seconds/GP cell" with the projection.

### FS24 — Fused numbers remain after the FS10 pass

**Severity: Minor.** Pack-wide; files written or changed after FS10.

**Quoted.** MS05e:193: "Enforce a540-second"; MS05e:220: "tier-used650 beats non-tier500 at target500";
MS07d:51: "Guard120000ms"; MS11b:35: "If1 ... row2 ... column4"; MS14a:46: "candidates{5,7} forces removal7";
MS18d:29: "seedBase7000, ... warmup0, runs50"; check-list:516: "reaches540".

**Problem.** SA2 accepted FS10 and ran a spacing pass, but FS10's word list was not complete, and MS05e,
written after it, did not get the pass. A scan of prose outside code spans and fences, with identifiers such as
`classic9`, `hell1`, `G09` and `MS05b1` excluded, still finds about 90 fused words. In algorithm and vector
text they are ambiguous ("If1", "row2", "multiset{1,1,2} is NOT{1,2,2}").

**Fix.** Insert the spaces at these lines:

- check-list: 66, 486, 516, 533 (`GR,10-90`), 629; lines 326-331 read better as "S3 group 1" to "group 6".
- MS05e: 193, 220, 262, 272, 278, 320. MS07c: 33. MS07d: 51, 52, 54, 57.
- MS08a: 43, 55. MS08b: 42, 52. MS08c: 38-40. MS09a: 37, 45. MS09b: 36, 38.
- MS10a: 39. MS10b: 40-41. MS11a: 18, 39. MS11b: 31, 35. MS11c: 44. MS12: 31, 52.
- MS13a: 51, 60. MS13b: 75, 84. MS13c: 31, 35. MS14a: 32, 46, 54. MS14c: 31, 33.
- MS15a: 33, 42, 53, 81. MS15b: 30. MS16: 36, 45, 47, 58.
- MS17a: 19, 54, 74, 81. MS17b: 44, 47, 69, 70, 100.
- MS18a: 18, 34, 54. MS18b: 33, 48, 65. MS18c: 62. MS18d: 29, 32, 52, 74. MS18e: 26, 27, 36.

A general check is the pattern `(?<![\w\\/.#=:-])[A-Za-z][A-Za-z']*[a-z]\d` on prose lines; read each hit,
because identifiers stay as written. Frozen files are out of scope.

## 11. Summary

| Series | Findings | Blocker | Major | Minor |
|---|---|---:|---:|---:|
| MS05 (section 4) | FS01-FS10 | 0 | 4 (FS02, FS03, FS04, FS09) | 6 |
| MS06 (sections 5 and 7) | FS11-FS16, FS20 | 0 | 4 (FS13, FS14, FS15, FS20) | 3 |
| MS07 (section 6) | FS17-FS19 | 0 | 2 (FS18, FS19) | 1 |
| MS08-MS13 (section 8) | FS21 | 0 | 0 | 1 |
| MS14-MS16 (section 9) | FS22 | 0 | 1 | 0 |
| MS17-MS18 and pack-wide (section 10) | FS23, FS24 | 0 | 0 | 2 |
| **Total** | 24 | **0** | **11** | **13** |

SA2 accepted FS01-FS10; FS24 completes FS10. FS11-FS24 are open.

Most important:

1. FS22: the manual variant suites build their whole corpora on first use, so MS14c's and MS18e's GD commands
   cannot be bounded, nothing has measured them since requiredness, and MS05b2's edits to four of the seven
   manual files first run in the release task. Assign per-level corpus tooling and one measurement early.
2. FS20: S-OD1's target ranking of the Greater-Than sign dig has a production hand-off without a test, and
   MS06c does not own the delivery. MS06d could then compare the Greater-Than cells with no target effect.
3. FS13 and FS14: MS06c leaves open what a refused pool winner does and which local moves are accepted; both
   change the puzzles, so GG, GR and MS06d depend on the choice.
4. FS15 and FS18: MS06c and MS07b are each larger than one 20-60 minute task; splits are given.
5. FS19: after MS07b Hell 1 is non-vacuous, and no bounded Hell 1 measurement precedes the GD and GQ runs
   that depend on it.

Dispatch: MS06a can be dispatched when its dependency is met, with FS11 as a developer addendum. MS06b needs
FS12 and FS20's first item; MS06c needs FS13, FS14, FS15, FS16 and FS20's second item. MS07a needs FS17, MS07b
FS18 and FS19's measurement item. FS22's tooling should be assigned before MS05b2 is accepted. FS21, FS23 and
FS24 can be developer addenda or one spacing and anchor pass.

No test suite or gate was run for this review. The first round used two short read-only probes (section 1);
the second used only `git show` reads, a registry dump and a text scan. No file other than this review was
created or edited, and nothing was staged or committed.

## 12. Third round: SA2's second-round changes

SA2 accepted FS11-FS24 and disputed none ([response](../gpt-6-astra/7-response-to-task-pack-review.md), section 7,
22:43:24.644). Two answers added task files: MS05b3 after MS05b2 (FS22), and MS06c split into MS06c1 and MS06c2
(FS15). This round re-reads every file changed after the second round, at the versions below, against `f788e02`,
and reads the uncommitted MS05b1 work only where a line below cites it. Times are LastWriteTime on 2026-11-12,
+07:00. `notes.md` was read at 23:29:14.676 (the MS05b1 section, `:106-173`).

| File | LastWriteTime | Scope |
|---|---|---|
| `check-list.md` | 22:40:36.805 | Index, waves, ownership, the FS rows and section 7, again |
| `MS05b2-required-exactness-consumers.md` | 22:11:12.768 | The MS05b3 hand-off (`:27-29`, `:134`, `:150`, `:183`) |
| `MS05b3-bounded-manual-corpora.md` | 22:28:17.589 | New; whole task |
| `MS05c-shallow-budget-instrumentation.md`, `MS05d-select-shallow-budget.md` | 22:13:14.213, 22:13:14.223 | The MS05b3 dependency and the GD paragraphs |
| `MS05e-guided-sign-dig.md` | 22:14:37.852 | GD-CV6 (`:266-288`) and the FS24 lines |
| `MS06a-pre-target-evidence.md`, `MS06b-target-policy-primitives.md`, `MS06d-target-comparison.md` | 22:16:51.529, 22:19:09.043, 22:19:09.319 | Changes since the second round |
| `MS06c1-target-transport.md`, `MS06c2-activate-target-policy.md` | 22:24:06.892, 22:24:06.896 | New; whole tasks. `MS06c-target-through-all-stages.md` is deleted |
| `MS07a-window-kernels-and-pattern-metrics.md` to `MS07e-first-qualification.md` | 22:24:06.902 to 22:40:36.787 | Changes since the second round |
| `MS08a-skyscraper.md` to `MS18e-release-evidence-closure.md`, except `MS14b` | 22:28:17.597 to 22:40:36.791 | The FS21-FS24 lines and the MS05b3 references |

### FS11-FS24 are fixed

| Finding | Where | Check at `f788e02` |
|---|---|---|
| FS11 | MS06a:43-44; MS06d:36-37 | The soak anchors carry their quotes: `seedFor` `:260`, `generateOne` `:267-283`, `const t0` `:353` |
| FS12 | MS06b:60, :68-93 | `acceptReveal` takes the caller's exactness of both states. The predicate gives every listed vector; the sequence 920 → 880 → 900 shows why 900 is refused after 880 although it is nearer than 920 |
| FS13 | MS06c2:110-117, T02 `:223`, tests `:231-232` | A refused bounded winner ends the cells guided pass with the current givens and one guided end record; no other pool is tried |
| FS14 | MS06c2:134-158 | The local predicate is written out with the band ceiling, `preferRated` and the model-aware quality; MS05b1's loop condition is kept |
| FS15 | MS06c1; MS06c2; check-list:49-50 (waves 14a, 14b) | MS06c1 carries a nullable target and draws none (`:16`, `:22-27`); MS06c2 draws it and activates the policy in all stages in one commit |
| FS16 | MS06b:88-93; MS06c2:162-165 | The Expert band `{min:700, max:1000}`, target 850, and the entry point (`localSearchSteps` on an initially exact 920) are given |
| FS17 | MS07a:68-79 | The supplements are added to the random states, built as `H.assertSound` builds them (`core/tests/fixtures/techniques-helper.js:593-594`; `DEFAULT_SEED` 20260101 at `:100`) |
| FS18 | MS07b:38-41, :62-79; MS07c:41, :106 | The soak `--chain-window` option and the cost runs moved to MS07c; the help sources are real Player replays |
| FS19 | MS07b:81-88, :139; MS07c:73, :108; MS07e:50-52, :90-102 | A two-request Hell 1 pilot after registration, the 20-request projection, and the report of a projection above 450 s before the GD and GQ owners start |
| FS20 | MS06b:95-114, T03 `:147`; MS06c2:40-78, :235-241 | Forwarding by `hasOwnProperty`, a spy test of a finite, null and absent target, one draw from the sample RNG, and a test through the real `signs` strategy |
| FS21 | MS08a:49; MS11c:48; MS17b:59-61; MS18a:42; MS18b:37; MS18d:45-47; MS18e:39 | The anchors match |
| FS22 | MS05b3; MS05c:26-27; MS05d:136-139; MS05e:266-288; MS14c:51-52, :67, :72-82; MS18c:69-74; MS18e:86-104; check-list:41, :139, :307, :468-469, :550-558 | Lazy per-level corpora in five suites, Killer's I5 per level, and an early run of the manual contracts; MS14c runs only corpus-free Killer checks. FS25 and FS26 are two defects of the new text |
| FS23 | MS18d:50-93, :115, :119-127 | A step 0 projects every GP cell from the GQ-final per-request times (`qualify.js:156` and `:453` record `ms`) before the first GP command |
| FS24 | Pack-wide | The scan of section 10 finds no fused number in prose |

SA2's adjustments to my proposed fixes are right:

- MS06c1 draws no target (`:25-27`). MS05e already reads `options.target` in the Greater-Than sign pool, so a
  finite target in MS06c1 would change Greater-Than puzzles and break MS06c1's unchanged GG.
- The nishio help example has `"depth":1` (`player/js/ui/help-examples.js:46`, source `Classic Sudoku 9x9,Hell 1,8`).
  My second-round remark (FS18) that it might be the depth-2 source was wrong; MS07b:68-75 treats it correctly.
- MS06c2's expected target `targetFor(spec, SG.rng.create(rng.seed))` (`:237`) is computable: an RNG exposes its
  `seed`, and `fork` derives the child from the seed and the tag only, so the recreated RNG gives the production
  draw.
- MS06c1's keeper view, `Object.create(keeper)` with a wrapping `offer` (`:68-75`), works with MS05b1's keeper in
  the working tree: `closer` and `offer` use the closure variable `keeper`, not `this`, and `best`, `distance` and
  `unsound` are written only on the original object (`generator/js/engine/digger.js:1046-1077`), so the view reads
  them live.

### FS25 — The Easy selectors also select Very Easy

**Severity: Major.** MS05b3:91, :95, :98-99, :185-187; MS05e:270-278; MS18e:87-89, :91, :102-104;
check-list:473, :551-553.

**Quoted.** MS05b3:91 and :95: "`<level>: <count> puzzles > I5:`" and "Each selects exactly one test."
MS05e:277-278: "Replace only the level/count in that suffix for the other eight levels. Record a manifest of 18
selectors, each selecting exactly one existing test". check-list:551-553: "Use `<level>: <count> puzzles > I5:`
for Killer, Jigsaw, Greater-Than and Wordoku; ... Each selects exactly one current assertion."

**Problem.** `--filter` keeps a test when its lower-cased full name contains the filter text anywhere
(`core/tests/harness.js:503`, `:518-519`); the full name joins the suite file, the describes and the test with
" > ". Very Easy and Easy have the same count in the four suites: 20 in Killer below Expert
(`killer.test.js:24-31`), Jigsaw (`jigsaw.test.js:21-26`), Greater-Than (`greater-than.test.js:20-26`) and Wordoku
(`wordoku.test.js:20`). So `easy: 20 puzzles > I5:` is contained in `veryEasy: 20 puzzles > I5: ...` and selects
two tests, Very Easy's and Easy's (describes at `jigsaw.test.js:816`, `greater-than.test.js:951`,
`wordoku.test.js:713`, and Killer's new per-level describe). The same holds for MS05e's Easy CV6 selector
(`greater-than.test.js:1031`). Each task then breaks its own contract: MS05b3 says that an accidentally
multi-level selector "fails the evidence contract" (`:98-99`) but gives no form that avoids it; MS05e's "18
selectors, each selecting exactly one existing test" is false; MS18e must prove that "no requested assertion is
missing or duplicated" (`:103-104`) while its Easy selector repeats Very Easy. The Easy exit code also mixes two
levels. No other selector of the pack is affected: no other level name ends another (`hell1` and `hell2` differ
before the colon), extra-regions' `<id> <level>:` has a space before the level, and the `time) > <level> >`
selectors of the difficulty suite have `> ` before it.

**Fix.** Anchor the four suites' selectors at the describe boundary: `> <level>: <count> puzzles > I5:` and, in
MS05e and check-list:473, `> <level>: <count> puzzles > CV6:`; for example `'--filter=> easy: 20 puzzles > I5:'`
in the PowerShell argument array (the runner takes the whole value, `generator/tests/node-runner.js:146-153`).
State the form once in check-list:551-553, use it in the example commands of MS05b3:185-187, MS05e:273-274 and
MS18e:87-89 and :91, and add to each manifest step that every command's selected test count is 1, read from the
runner's summary before its result is recorded.

### FS26 — A per-variant CV3 selector still builds the whole variant corpus

**Severity: Major.** MS05b3:21-22, :95-96, :127-128, :142, :170, :189, :193-197; MS18e:92, :98-102;
check-list:469, :553-554.

**Quoted.** MS05b3:142: "`variants.test.js` is read/run, not edited". MS05b3:96: "select `variants: <id> > CV3`
once per registered variant." MS05b3:195-197: "A projected >450-second cell is reported **before starting**; a
cell that cannot fit 540 seconds requires assigned request-ledger tooling, not fewer requests, a longer ceiling or
an unbounded retry."

**Problem.**

- `variants: <id> > CV3` is one test per variant (`generator/tests/manual/variants.test.js:404-410`). Its body
  `checkLevels` (`:189-211`) calls `ctx.corpus()`, which generates every level of `difficultySupport` at once
  (`:82-105`): 2 requests per level for the five `HEAVY` variants (`:29`, `:43-48`) and 3 for the others. Samurai,
  sohei, butterfly and flower support all nine levels (`generator/js/variants/multigrid.js:324-332`), so each of
  their CV3 selectors is 18 requests in one invocation. MS05b3's lazy corpora do not reach this suite, because
  MS05b3 does not own it. My FS22 fix said that CV3 "can already be split per variant"; that was not enough,
  because the per-variant unit still builds every level.
- The cost after MS05b1 (`notes.md:159-166`): `samurai` Nightmare seed 42 went from 0.16 s to 220 s (8 attempts,
  no required puzzle), a Killer Nightmare request to 26 s, `diagonalX` Nightmare requests to up to 20 s. Two samurai
  Nightmare requests at that cost are 440 s before the 16 requests of the other eight levels. Sohei and flower have
  the samurai performance targets (`generator/tests/fixtures/perf-helper.js:67-69`). Each request here also has a
  240-second budget (`variants.test.js:77-78`): a request that exceeds it throws `budget.exceeded`, which
  check-list:546 does not allow to be excused as a timing miss, so MS05b3 could block on the cost that MS05c and
  MS05d exist to bound. MS05b3 runs before them (check-list:41-43).
- So `variants: samurai > CV3`, and probably the other multigrid selectors, must be reported as projected above
  450 s, and the task's rule then needs "assigned request-ledger tooling" that no task owns. MS05b3-T04 ("Complete
  early I5/CV3 manifest") cannot be met for those variants, and MS18e:92 and :99-102 inherit the same unit.
  MS05b3's estimate (`:193-195`: 1-300 s per cell, 30-120 minutes in all) was written at 22:28, before the MS05b1
  costs were recorded in `notes.md` (23:29).

**Fix.**

1. Give MS05b3 a narrow edit of `variants.test.js` (ownership `:135-143`): build the corpus of `contextOf` through
   the same lazy helper, one key per supported level, with the same seeds `1..perLevel`, the same
   `generate(def, level, seed)` and its 240-second budget; `corpus()` still returns every level for CV4, CV5 and
   CV6. Register CV3 as one test per supported level, `'CV3 ' + level + ': ' + title`, with the unchanged
   per-level assertions of `checkLevels` (`:191-210`), and one test for the refusal of the other levels (`:213`
   on). Selectors: `variants: <id> > CV3 <level>:` (unambiguous: `cv3 easy:` is not in `cv3 veryeasy:`) and the
   refusal test's name. Add the suite to the old/new manifest parity of `:103-109` and to T01-T04; update
   MS18e:92, :99-102 and check-list:469, :553-554.
2. Before the first CV3 command, project every (variant, level) cell from `notes.md` and MS05b3's own I5 times. A
   cell still projected above 450 s is not run in MS05b3: record it as "deferred: projected above 450 s" with its
   projection, and add it to MS05d's GD manifest after the default allowance is selected (MS05d:139 limits that GD
   to classic9 today, so MS05d needs the matching line), or to another post-allowance owner the orchestrator
   names. This replaces, for this task, the reference to tooling that no task owns.

Without the edit of `variants.test.js`, item 2 alone would defer every multigrid CV3 as a whole variant, and MS18e
would meet the same unbounded unit at release.

### MS05b1's generation cost: impact on this round

Not a finding: SA2 is analysing the cost as pack author (`notes.md:154-173`). Its effects on the files of this
round:

- MS05b3-T05 and every later "both quick sets pass" criterion cannot be met while the generator quick set does not
  fit one 540-second command and the `steps`, `replay` and `player` suites cannot regenerate G13 within 120 s
  (`notes.md:168-173`). MS05b3 should not be dispatched before SA2's resolution states its quick-set gate.
- MS05b3 runs before the allowance of MS05c and MS05d, so its measured times are upper bounds of the later cost.
  MS05e projects "from MS05b3 and the current GS-CV6 timings" (`:283-284`) and MS18e uses "MS05b3's per-level
  timings" (`:115`). Both should label them as pre-allowance upper bounds and prefer later measurements where they
  exist, so that an upper bound alone does not raise a bounded-tooling request.
- If the resolution moves the allowance before the activation, FS26's projection is redone from the new numbers;
  the per-level CV3 unit stays the right bound.

### Round summary

| Round | Findings | Blocker | Major | Minor |
|---|---|---:|---:|---:|
| First and second (section 11) | FS01-FS24 | 0 | 11 | 13 |
| Third (this section) | FS25 (MS05b3, MS05e, MS18e, check-list), FS26 (MS05b3, MS18e, check-list) | 0 | 2 | 0 |
| **Total** | 26 | **0** | **13** | **13** |

FS01-FS24 are fixed and verified: FS01-FS10 in the second round, FS11-FS24 at the start of this section. FS25 and
FS26 are open.

Dispatch: MS05b3 needs FS25, FS26 and SA2's MS05b1 resolution before dispatch. MS05e needs FS25 for its GD-CV6
manifest. MS18e and the check-list rows (`:469`, `:473`, `:550-554`) need FS25 and FS26's selector changes before
MS18e. MS05c, MS05d (apart from FS26's deferred cells), MS06a-MS06d and MS07a-MS07e have no new finding.

No test suite or gate was run for this round. It read the task files, the code at `f788e02` and in the working
tree, `notes.md` and SA2's response; every command took under 10 seconds, so no lock was needed. No file other
than this review was edited, and nothing was staged or committed.

SUDOKU ROUND 3 DONE

## 13. CV6-02 cross-check (2026-11-13)

SA2's runtime finding RF01 and its question CV6-02 (the acceptance boundary of MS05b1) are cross-checked in the
subsection "SA1 cross-check (claude-opus-5.5, 2026-11-13)" of CV6-02 in [`clarifications.md`](../clarifications.md),
Part H. It confirms SA2's facts (one anchor slip) and recommends (a), amended: a work profile of G13 and mega
first, G13 and mega measured at all four R5 settings as non-selecting diagnostics, G13 persistence from (d), an
owner decision now on mega's quick contract, and green commits. It adds a missed option, (g) dark landing.
Besides that subsection only this file was edited; no generation or timing was run, and nothing was staged or
committed.

CV6-02 CROSS-CHECKED

## 14. Fourth round: the S-OD2 recovery tasks (MS05r1-MS05r6)

The owner answered CV6-02 with (a) (S-OD2, 2026-11-13 06:45). The orchestrator's notes in CV6-02 adopt SA1's
diagnostic points (1) and (2), keep (3) and (4) for a stop, and replace checkpoint commits by private backup refs.
SA2 wrote the recovery tasks and marked them "RECOVERY TASKS READY" (SA2's response, section 10, line 723). This
round reviews them, with the changed routing notes, against the working tree: `f788e02` plus the uncommitted MS05b1
work (`generator/js/engine/digger.js` 2026-11-12 22:56:33, `pipeline.js` 18:04:58). Times are LastWriteTime on
2026-11-13, +07:00.

| File | LastWriteTime | Scope |
|---|---|---|
| `MS05r1-profile-active-recovery.md` | 08:03:55.202 | Whole task |
| `MS05r2-recovery-consumers.md` | 08:26:26.378 | Whole task |
| `MS05r3-recovery-allowance-instrumentation.md` | 08:35:48.754 | Whole task |
| `MS05r4-select-recovery-allowance.md` | 08:26:26.389 | Whole task |
| `MS05r5-bounded-quick-coverage.md` | 08:32:36.671 | Whole task |
| `MS05r6-combined-recovery-acceptance.md` | 08:26:26.399 | Whole task |
| `MS05b1`, `MS05b2`, `MS05c` and `MS05d` task files | 08:16:59.430 to 08:16:59.458 | Their routing to the recovery |
| `MS05b3-bounded-manual-corpora.md` | 08:19:28.900 | Its place after the selection; FS25 and FS26 |
| `MS05e-guided-sign-dig.md`, `MS06a-pre-target-evidence.md` | 08:24:44.761, 08:24:44.769 | The dependency on MS05r6 |
| `check-list.md` | 08:24:44.781 | Index (`:45-55`), waves (`:113`), estimates and commit (`:197-228`), the standing quick gate (`:332-337`) |
| SA2's response, sections 9 and 10 | 08:44:15.860 | FS25 and FS26 accepted; the recovery plan |

### What holds

| Point checked | Result |
|---|---|
| Start from the uncommitted MS05b1 tree | Every task works on the same uncommitted candidate; MS05r1:14-16 forbids restarting from HEAD or copying the backup ref over the tree |
| MS05r1 can be dispatched | Its anchors match the tree: `pipeline.js:73` (`maxAttempts`), `:170` (the strategy from the registry), `:222` (`yield* SG.digger.generateSteps`, called through the namespace, so the driver can wrap it); `digger.js:106` `createStageSteps`, `:140` `resolveStage`, `:897` and `:906` `registerStrategy` and `unregisterStrategy`, `:994` `rateCounted` (it calls `SG.difficulty.rate` through the namespace), the stages dig `:1213`, rate `:1260`, tune `:1275` and finalize `:1795`, the local triplet's `where` at `:1752`, `work` at `:1825`. Its diagnostic mode is refused until MS05r3's API exists |
| Adopted diagnostic (1) | MS05r1: three one-attempt profiles (G13, and mega12 and mega16 Nightmare, seed 3), T01 and its commands |
| Adopted diagnostic (2) | MS05r4 part A (`:32-43`): the same three requests at none, 64, 128 and 256 with the full attempt limit, 12 outcomes, non-selecting |
| R5 selector unchanged | MS05r4 part B (`:45-65`) quotes the rule: six cells, 12 requests each, seed base 20260101, settings 64, 128, 256 and none, upper median at index `floor(12/2)` as in MS05d at `f788e02` |
| `soak.js:281` fixed before R5 | MS05r2 (`:88`) makes the exact flag authoritative on both routes (`:281` compares levels on the pipeline route, which Killer and Jigsaw take, `soak.js:211`); MS05r4:59 counts `row.generationExact === true` after MS05r2 and MS05r3 |
| Every run at most 540 s, under the lock | `Invoke-Dv3Node` (check-list:465) waits at most 540,000 ms; every task projects at most 450 s per invocation. One command is outside the helper: FS31 |
| Stop points | "none" (MS05r4 step 5); an invalid selected-setting diagnostic (step 6); a G13 or mega failure (MS05r6:50); any quick failure (MS05r6 phase C and `:256`) |
| FS25 and FS26 | Kept: `> ` boundary selectors in MS05b3, MS05e and MS18e; CV3 per level plus `CV3 unsupported:`; the deferred rows owned by MS05r6 |
| Commit plan | One combined commit after MS05r6 (`:263-268`); no checkpoint commit; backup refs are not acceptance |
| (b), (d) or (e) by the back door | No guard, time factor or budget change, and no G13 persistence: G13 persistence and mega's fallback assertions are owner stops (MS05r6:256-261). (e): FS30 |

### FS27 — The original-contract closure runs only after MS05r5 and MS05b3

**Severity: Major.** MS05r6:40-92 (phase A); MS05r4:103-107; check-list:212, :544.

**Quoted.** MS05r4:105-106: "A slow successful diagnostic is a warning requiring r6's original uninstrumented
closure, not a passed latency assertion or permission to pick another value." MS05r6:40: "A — Original-contract
preflight, before fresh E".

**Problem.** G13 (its 120 s guard) and the mega12 and mega16 Nightmare groups (60 s guard, `timeLimit(3000)` and
`timeLimit(10000)`) are the gates whose failure opened CV6-02, and S-OD2 makes a remaining failure an owner stop.
Their original contract runs first in MS05r6 phase A, after MS05r5 (40-60 minutes) and MS05b3 (45-60 minutes plus
20-90 minutes of machine time): about 1.5 to 2 hours of development and up to 95 minutes of machine time spent
before the one result that can stop the recovery, all on the open uncommitted tree. The engine's behaviour is final
once MS05r4 sets the default literal: MS05r5 changes tooling only, MS05b3 manual tests only, MS05r6 fixtures, pins
and comments. MS05r4's diagnostics do not replace the closure: they are instrumented, may run 500 s and use seed 3
only.

**Fix.** Make phase A the last step of MS05r4, after the default literal. MS05r4 owns `g13-closure.cjs` (under
`generator/tests/artifacts/difficulty-v3/MS05r4/`; the script of MS05r6:56-71 unchanged) and runs the two mega groups
with the flags that exist before MS05r5 (`--suite=mega --filter=<group> --verbose`; `--list-tests` and `--results`
come with MS05r5, MS05r5:38-40): it checks from the verbose listing and the summary that exactly the two tests ran
and keeps the console output as evidence. A failure stops for the owner before MS05r5 and MS05b3, with the data of
MS05r6:50. MS05r6 keeps phase A as the re-check on the final source; its rule at `:51-53` says when a row may be
retained. Update the closure row (check-list:544) and the estimates (`:212`).

### FS28 — MS05r6 is two dispatches, not one Medium task

**Severity: Major.** MS05r6:6-7, :94-142 (phase B), :143-172 (C), :174-204 (D), :251; check-list:54, :113, :212.

**Quoted.** MS05r6:6: "Medium; 45-60 minutes plus bounded evidence runs". `:251`: "Planning: preflights 2-8 minutes;
E 12-45; full quick 10-30; classic9/deferred GD 10-25."

**Problem.** Phase B alone is MS05b1's E recipe: 104 GG shards (26 combinations x 4 shards of 5 seeds), four wire
and fourteen analysis records, their merges, checks and writes, then the coupled pins in steps, replay and player
(`docs/difficulty-v3/evidence/MS05b1/evidence.md:14-15`, `:25`, `:37-46`); MS05b1's developer recorded it three
times. Phases C and D add both apps' full quick manifests, classic9 GD for every level, MS05b3's reconciliation and
the combined audit: about 150 locked commands, each announced and checked. That does not fit 45-60 minutes, and a
session that fails late in D leaves a written E and an unreported state on the open tree.

**Fix.** Split MS05r6 into MS05r6a (the phase A re-check and phase B: final-source E and the coupled pins; step
evidence) and MS05r6b (phases C and D, the reconciliation and the audit; the sole combined acceptance), each one
dispatch with its own handoff, on the same tree, with one commit after MS05r6b as now. Size them from MS05b1's E:
MS05r6a about 2 to 3 hours and 20 to 45 minutes of machine time; MS05r6b about 1.5 to 2.5 hours and 25 to 60
minutes. Update the index (`:54`), the waves (`:113`), the estimates (`:212`) and the stop rules' references.

### FS29 — No owner for quick assertions that MS05r3 or the selected default change

**Severity: Major.** MS05r3:84-86, :144-147, :184-186; MS05r4:92-93, :156; MS05r6:205-207.

**Quoted.** MS05r4:92: "No instrumentation repair, other source change, test expectation update or canonical
fixture write." MS05r6:206-207: "Intentional coupled assertions in Generator `steps`, `replay`, `player` suites
[...]. Other quick assertion edits need explicit orchestrator assignment."

**Problem.** Two kinds of quick assertion change between MS05r3 and MS05r6, and nobody runs them in time.
- Schema: MS05r3 adds `localSearches` to every `work` entry (`:46-48`). 'MS05b1-T03: an exact keeper ends the
  sampling and the attempt' pins `work` exactly (`generator/tests/suites/pipeline.test.js:2148`,
  `toEqual([{ ratings: 0, proposals: 0, maxRatings: 1024, maxProposals: 32768 }])`). MS05r3 must update it (its
  "exact-key" assertions, `:84-86`), but its selectors (`:184-186`) do not run it.
- Default: MS05r3 step 5 scopes Infinity only in tests that *explicitly* assume no allowance. A test that relies on
  it silently, such as 'MS05b1-T02: removing a sign starts a new memo' (`pipeline.test.js:1981-1993`,
  `maxProposals: 400`, where a finite allowance can end the local search first), fails only in MS05r6 phase C, where
  the edit is unowned and the failure is an owner stop.

**Fix.** (1) MS05r3 adds `--suite=pipeline --filter=MS05b1-` to its focused commands (the MS05b1 pipeline cases, not
the 295-s suite). (2) After the default literal, MS05r4 runs a wider focused check under `Invoke-Dv3Node`:
`--suite=digger,difficulty-diagnostics,difficulty-floor,worker,cache,recovery-profile`, then the pipeline selectors
`MS05b1-` and `recovery: shallow allowance`. A failure whose premise is "no additional allowance" goes back to
MS05r3 (MS05r4's own rule, `:93`); any other is a genuine default-coupled pin, listed with its reason and not edited.
(3) MS05r6 owns the listed pins explicitly (its file list and its audit), so phase C meets no unowned edit.

### FS30 — The slower quick set becomes the standing gate without a recorded acknowledgement

**Severity: Minor.** check-list:332-337; MS05e:238-246; MS05r6:251; `AGENTS.md:11`.

**Quoted.** check-list:333-334: "A whole `node tests\node-runner.js` is allowed only if projected <=450 s; otherwise
use MS05r5's disjoint checked suite/full-name manifest". `AGENTS.md:11`: "about one minute".

**Problem.** After the recovery every task's quick gate is the sharded manifest, and MS05r6 plans 10-30 minutes of
quick time. SA2's option (e) row says "A longer total quick set [...] must be documented and approved"; option (a),
which the owner chose, warned that quick coverage "may still need bounded shards", so this is not a new contract,
but nothing records the measured cost for the owner or corrects `AGENTS.md`.

**Fix.** MS05r6's acceptance package states the measured quick time and shard count of each app as the standing
cost, for the owner's acknowledgement with the acceptance; then `AGENTS.md`'s quick-time comments and the
developer guides' quick-test paragraphs are updated (MS05r6's documents, or a named follow-up). Not a stop.

### FS31 — MS05r4's focused check bypasses the helper

**Severity: Minor.** MS05r4:156.

**Quoted.** "Focused post-edit check: `node tests\node-runner.js --suite=difficulty-diagnostics,recovery-profile`."

**Problem.** Every other command of the recovery runs through `Invoke-Dv3Node`; this one has no lock and no 540-s
limit, and its duration is not known.

**Fix.** Run it as `Invoke-Dv3Node -Task MS05r4 -NodeArgs @('tests\node-runner.js','--suite=...')`, with the wider
selection of FS29.

### FS32 — The recorded backup recipe would miss new files

**Severity: Minor.** `clarifications.md` CV6-02, the orchestrator's note 3 (`:844`); MS05r1:171.

**Quoted.** `:844`: "(`git stash create` + `git update-ref refs/dv3-wip/<name>`, outside the branch)". MS05r1:171:
"The orchestrator backs up new files too."

**Problem.** `git stash create` takes no `--include-untracked` (git 2.56.0), so a ref made that way leaves out the
new evidence, scripts and task files. The ref actually made is complete: `refs/dv3-wip/MS05b1-20261113-0650`
(`fc37b14`, 07:44:53) has the single parent `f788e02` and holds 129 of the 135 files that are untracked now; the
other six are the MS05r task files, written after it (08:03 to 08:35). Only the recorded recipe is wrong, but
MS05r1's promise rests on it.

**Fix.** Record the recipe used, for example with a temporary index:

```powershell
$env:GIT_INDEX_FILE = Join-Path $env:TEMP 'dv3-backup.index'
git read-tree HEAD; git add -A; $tree = git write-tree
$commit = git commit-tree $tree -p HEAD -m 'dv3 backup <name>'
Remove-Item Env:GIT_INDEX_FILE; Remove-Item (Join-Path $env:TEMP 'dv3-backup.index')
git update-ref refs/dv3-wip/<name> $commit
```

It leaves the real index and the working tree untouched; ignored files stay out.

### FS33 — "The immutable driver" contradicts MS05r3

**Severity: Minor.** MS05r1:171; MS05r3:92-93.

**Quoted.** MS05r1:171: "Hand the immutable driver/profile to MS05r2/r3/r4." MS05r3:92-93: "Extend the MS05r1 driver
only as needed to copy the richer work shape".

**Problem.** A developer of MS05r3 reads two contradicting rules for the same file.

**Fix.** MS05r1:171: "Hand the profile evidence (immutable) and the driver to MS05r2/r3/r4; only MS05r3 may extend
the driver, as its section 'Transport' says, with the profile protocol unchanged."

### Summary of the fourth round

| Finding | Severity | Must be fixed before |
|---|---|---|
| FS27 | Major | MS05r4's dispatch (and MS05r6's) |
| FS28 | Major | MS05r6's dispatch |
| FS29 | Major | MS05r3's dispatch (part 1), MS05r4's (part 2), MS05r6's (part 3) |
| FS30 | Minor | MS05r6's acceptance |
| FS31 | Minor | MS05r4's dispatch |
| FS32 | Minor | the next backup (the orchestrator's note) |
| FS33 | Minor | MS05r3's dispatch; MS05r1 can go with it unchanged |

MS05r1 has no finding that blocks it: FS33 changes only a handoff sentence and FS32 the orchestrator's note.
MS05r2, MS05r5 and MS05b3 have no finding. No test suite, generation or timing was run for this round: it read the
task files, the code in the working tree, MS05b1's evidence and SA2's response, and checked the backup ref with
read-only git commands; every command took under 10 seconds. Only this file was edited; nothing was staged or
committed.

RECOVERY REVIEWED: 7 findings (0 Blocker, 3 Major)

MS05r1 DISPATCHABLE

## 15. CV6-03 cross-check (2026-11-13)

MS05r4 stopped at an S-OD2 stop point: R5 selected 256 and G13 passes its guard, but both mega Nightmare quick
groups fail their original limits. SA2's question CV6-03 is cross-checked in the subsection "SA1 cross-check
(claude-opus-5.5, 2026-11-13)" of CV6-03 in [`clarifications.md`](../clarifications.md), Part H. It confirms
SA2's facts (two anchor slips) and agrees with (a), (d) and keeping 256, with three conditions on (a): the slow
tier is a tool outside CI's suite groups, it runs once after the last engine change and is keyed by request
identity, and the quick set keeps a one-attempt mega12 request. It disagrees that (c) needs a new product policy
in the recovery: the plan's final qualification (SA1-Q-S5, MS18c) already hides a level that misses, and a
bounded fallback would not keep a level offered. It adds two points SA2 missed: CV3's mega16 Nightmare cell
would stop the recovery a third time at MS05r6b unless the answer covers it, and no task owns the CI workflows
that the v3 pull request runs. Besides that subsection only this file was edited; nothing was run, staged or
committed.

CV6-03 CROSS-CHECKED
