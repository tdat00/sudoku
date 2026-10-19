# Fix report — review findings on the rating v2 implementation

- **Implementer:** claude-opus-5.5 (Claude Opus 5.5, 1M context, max reasoning)
- **Date:** 2026-10-19
- **Step:** 5 of claude-opus-5.5's work (18:59, second part 20:05)
- **Answers:** [`../gpt-6-astra/5-implementation-review.md`](../gpt-6-astra/5-implementation-review.md) (findings
  B1–B4, S1–S5, N1–N2, and B5 of its re-check)
- **State:** uncommitted working tree of `sudoku-generator`

This is the implementer's reply after the fixes, saved verbatim as a report; only the file paths in it were updated to
the current names of the documentation. The review's evidence (probe scripts and outputs) is in
[`../gpt-6-astra/evidence/`](../gpt-6-astra/evidence/).

---

I've fixed all the review findings in sudoku-generator. Nothing was committed, pushed or staged by me; sudoku-player,
`docs/report-v2/*` and task.md are untouched.

- **B1:** a run now keeps every completely rated, unique, symmetric candidate it meets (refinement, local search,
  proposals, Killer layout search including above-band layouts, Greater-Than sign tuning) with its model, givens, rating
  and replay. The fallback compares them with the dig samples. The review's repro (killer/expert, seed 61843, diagonal,
  maxAttempts 2) now returns evil 1581 instead of veryHard 790. The review's `closest` probe: returned candidate = best
  seen in 4/4 cases. Regression test added.
- **B2:** one capacity-checked entry point, `SG.digger.rateCounted`, used by the digger, Killer and Greater-Than. Known
  ratings are carried out instead of re-rated; on exhaustion the result is the best kept candidate or `noRatedPuzzle`.
  The review's caps probe: actual calls = counted calls (99/13/7/258; 20 with cap 20). 5 tests added.
- **B3:** the pending batch is flushed before a reveal; 3 tests; the review's replay probe finds 0 errors.
- **B4:** a worker exit, IPC error or lost request fails the run (exit 1, nothing written), and a verdict needs exactly
  40 or 100 outcomes. 6 fake-worker tests; the review's fault injection now fails the run.
- **S1:** I kept the pruning and documented it as a measured heuristic (code comment, design.md:543 and §6.8,
  qualification.md). Re-checking refusals made qualification 4.59× slower (7,021 s vs 1,531 s over the first 40
  requests per level). Hit rate was the same (94.5% vs 94.4%), and 7 top levels were hidden for time (e.g. classic9
  nightmare1 p95 went from 0.7 s to 18.4 s).
- **S2:** `tests/fixtures/rated.js` certificates now use explicit technique-id sets.
- **S3:** EN/VI compatibility note in README, plus history/print/storage wording in README and design.md. "Fixed
  technique-priority order" now in Help, Explain, design.md and two solver comments; the solver is not reordered.
- **S5:** the points badge and its string are removed. **N1:** design.md example is now 502 / 0.68. **N2:** soak
  `--quick` ≈ 700 (710 measured), `--full` ≈ 3,550.
- **S4:** final qualification (source hash `12f460a1f057f943`, 173 s, 7 jobs): 5,055 requests, no invalid, unrated or
  error results. Offered levels: 4,718/4,720 hits on 118 (variant, level) pairs. The `difficultySupport` lists are
  unchanged, and the slowest offered p95 is greaterThan/veryHard at 5.8 s of its 10 s budget. Regression hashes:
  520/520 unchanged, so not regenerated.
- **Tests:** full suite 3,512/3,512 passed (43 suites, 499 s). `soak --quick`: 710 puzzles, I1–I7 ok, 708 exact, PASS.

**Visible changes:**
- The Help points badge is gone.
- Reworded en/vi text: the Help ladder intro, the Help seed paragraph (now with the version caveat) and the Explain
  "rate" text.
- When Killer falls back to a candidate from its layout search, the replay shows the dig as one "random removal" batch
  (a synthetic log).
- Replay no longer shows revealed cells before their reveal step.

The seed tooltip and the Explain "configure" sentence are unchanged; they are still true within one version. Extra
beyond the findings: comment-only fixes in `js/core/logical-solver.js` and `js/core/techniques.js`.

---

## Phase 9 — B5 and robust timing tests

Second reply, after gpt-6-astra's re-check (B5) and the orchestrator's finding that a timing test failed under CPU
load, saved verbatim.

I've fixed B5 and made the timing tests tolerant of slower or busy machines; the full suite passes (3,513/3,513), and
generated puzzles and qualification results are unchanged.

**B5:** every candidate the run might fall back to (in `js/core/digger.js`) now gets its own DFS count, with the
existing 200,000-node guard, before it can replace the current closest candidate. This applies whatever its proof
claims. Unverified candidates are never kept, the closest verified one stays (so B1 still holds), and a proof
contradicted by a second solution adds `digger.unsoundTechnique`.
- The `keeper-safety` probe on seeds 61843 / 3680590658 / 1 returns evil 1791 / hard 553 / expert 1457. Each has
  exactly one DFS solution, carries the warning, and doesn't use the guessing technique.
- A test with the B5 witness is next to the existing guessing-technique tests in `difficulty.test.js`.

**Timing assertions near their budget** (p95 in ms, idle → while 8 qualification workers ran / budget):

| Assertion | Idle | Under load | Budget |
|---|---|---|---|
| Greater-Than veryHard | 8,150 | 11,490 | 10,000 |
| Killer veryHard | 5,905 | 10,352 | 10,000 |
| Hyper veryHard | 351 | 434 | 500 |
| Killer medium | 438 | 584 | 700 |
| Wordoku medium | 142 | 178 | 250 |
| Killer evil | 4,675 | 5,399 | 10,000 |
| Killer nightmare2 | 4,619 | 6,124 | 10,000 |
| Greater-Than hard | 2,258 | 2,982 | 6,000 |

Every other timing assertion is at most 0.30 of its limit when idle. Under load, the first two would fail without a
tolerance.

**Approach:** the test harness now has `SG.test.timeLimit(budget)`, which multiplies the budget by 2 by default, by 3
when `CI` is set, or by `SG_TIME_FACTOR` (1 checks the budgets exactly). All 10 assertions that check the design
budgets use it. The budgets themselves are still enforced by `qualify.js` and measured by `perf.js`. This is
documented in the harness, README (EN/VI) and design.md.

**Tests:**
- Under load (CPU 76–99%), the four suites with assertions near their budget (Greater-Than, Killer, Extra-regions,
  Wordoku): 520/520 passed.
- Alone, 12 suites with timing assertions: 1,556/1,556 passed.
- Full suite on an idle machine: 3,513/3,513 in 43 suites, 534 s.

**Puzzles and qualification:** the regression hashes are unchanged (520/520). I re-qualified anyway because the engine
source changed (hash now `4891207ab97675e2`). Every request had the same outcome as in Phase 7 (5,053/5,053), offered
levels hit 4,718/4,720, and the support lists are the same. `docs/report-v2/qualification.md` has the new table and hash.
