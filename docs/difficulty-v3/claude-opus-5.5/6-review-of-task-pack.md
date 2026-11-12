# Sudoku difficulty-v3 — review of the task pack

| Field | Value |
|---|---|
| Date | 2026-11-12; inventory at 17:46 (+07:00) |
| Reviewer | SA1, claude-opus-5.5 |
| Author reviewed | SA2, gpt-6-astra |
| Basis | Accepted [`report-detailed.md`](../report-detailed.md) (R1-R24, tasks MS01-MS18) and [`clarifications.md`](../clarifications.md) Parts A-G. Part H (CV6-01) was uncommitted and unanswered during this review |
| Code examined | `6165c42` (MS04 committed). The working tree differed only in `docs/difficulty-v3/clarifications.md` (Part H) |
| Result | See [section 10](#10-summary). The MS05 series was reviewed first and released with the marker line after section 4 |
| Changes made | This review only. No task, checklist, code, evidence or Execution log was edited; nothing was staged or committed |

## 1. Reviewed versions and limits

Paths in the table are under [`tasks/difficulty-v3/`](../../../tasks/difficulty-v3/). Times are the files'
LastWriteTime on 2026-11-12, +07:00. Sections 5-9 add the files they review.

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

No test suite or gate was run. Two read-only probes ran outside the repository: the tier tables of five variants
at `6165c42` (0.2 s), and the approximation of MS05b's acceptance in section 2 (about 50 s of generation, run
under the Sudoku lock protocol after the timing lock had been released).

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
