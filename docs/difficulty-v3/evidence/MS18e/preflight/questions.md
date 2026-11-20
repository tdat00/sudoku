# MS18e E0/E1 questions for the orchestrator and the solution architects

Written 2026-11-20 after E1, before any E2 live command. Nothing below was acted on; no row is admitted by this file.

## Q-B1-EXTRA — two more unguarded hidden-level requests in `difficulty.test.js` (blocks two E2 rows)

The static scan (`preflight/manual-hidden-requests-before.json`, repeated in `audit/manual-hidden-requests-final.json`)
classified all 116 entry-point call sites of the eight manual suites. The two known hits are now guarded
(`MS18c-COMPAT-DIFFICULTY-KILLER-MASTER`, `MS18c-COMPAT-PERF-GREATERTHAN-NORMAL`). **Two more remain**, both in
`generator/tests/manual/difficulty.test.js`, both on classic9 **Hell 1**, which the final qualification hides
(`generator/js/variants/classic.js:53-58`: classic9 offers veryEasy to nightmare only):

| Site | Test | Request | Effect today |
|---|---|---|---|
| `:1445` | `digger.generate: guarantees > keeps the configured symmetry on the top tiers too (proposals and their refinement)` | `SG.digger.generate(model9, level, SG.rng.create(8550 + i), {})`, level in `['nightmare', 'hell1']`, i 0..2 | `hell1` throws `difficulty.unsupportedLevel` at `spec()` (`generator/js/engine/difficulty.js:463-468`) |
| `:997` | `difficulty: labelled puzzles (fixtures/rated.js) > v3 reference: the level is required (or vacuous) as expected, derived and by the current floor` | `D.spec(LEVELS[i - 1], model9)`; the four labelled `hell2` puzzles give `i = 8`, so `LEVELS[7] = hell1` | `spec` throws the same code (a spec lookup, not a generation) |

Both groups passed at MS17b (`MS17b/gd/guarantees.json` 10/10, `labelled.json` 7/7), when classic9 still offered Hell 1.
They are the same family as the two assigned misses (MS18c hid the level, the diagnostic request was not guarded).
I did **not** wrap them (dispatch: report before E2, never silently wrap). Rows held: `GD-rest-08` (7 tests) and
`GD-rest-11` (10 tests) in `preflight/admission-plan.json`.
Options: (A) one-expression `SG.fixtures.toolRecords.withRequestedLevel('classic9', 'hell1', ...)` guards, as for the
two assigned hits, in a further E1 assignment; (B) leave them unexecuted and named; (C) change the test's level list
(an assertion change: not proposed). Default I would take: A, with the same recording of two new items.
Cosmetic, not a request: `:1237` `PER_LEVEL = { hell1: 20, hell2: 20 }` is dead configuration since classic9 offers seven levels.

## Q-TIME-FACTOR — which `SG_TIME_FACTOR` for the E2 runs

`core/tests/harness.js:31-38`: the factor is 1 locally, 3 when `CI` is set, or `SG_TIME_FACTOR`. The MS17b GD results that
the candidate bounds rest on ran at **factor 2** (`MS17b/gd/*.json`, `timeFactor: 2`); `run-locked-e.ps1` sets nothing,
so a run would use 1. The median-time assertion uses `SG.test.timeLimit(BUDGET_MS)`, so the factor decides its pass or
fail, not the generation work. Default I would take: `SG_TIME_FACTOR=2`, recorded in every transcript, for local GD.

## Q-GD-KNOWN — the classic9 Normal batch is expected to fail one assertion again

`MS17b/gd/classic9-normal.json`: 7 of 8 passed; `hits the requested level in at least 90 % of the puzzles` gave 83 of 100
(S-AV14, an availability item, never relabelled; also 83 at MS07e). The engine files of this path are unchanged since MS17b
(`git diff 57c1b10a..HEAD -- core/js generator/js`: ten files, only variant support arrays and two UI files), and the
seeds are deterministic, so the same exit 1 is expected. The Normal row needs the same declared exit-1 interpretation
as MS17b (only that assertion; any other failure blocks). Please confirm.

## Q-I5-BOUND — I5 rows have no same-selector current timing

For the 32 I5 selectors the only current-source evidence is the GP cell of the same variant and level (n=50, seeds
7000+101i, trace summary: a **different cohort**). `preflight/admission-plan.json` records, per row, N x the GP max, and a
proposed projection of twice that (margin 2 is my proposal). 31 of 32 are at most 310 s; `I5-extra-regions-nightmare-hyper`
is 428 s (envelope 213.9 s). The dispatch says a different cohort is not by itself a bound, so these rows are labelled
`candidate-envelope-different-cohort`, not admitted. Please rule whether the envelope basis is accepted, row by row or as a
class, or whether they stay held.

## Q-RATIO-BOUND — the three S-OD8 ratios have no defensible bound

Per work call (24 Easy + 2 Normal classic9) the same-engine cost from MS17b is 8.5 s (Easy 0.3235 s and Normal 0.3693 s
per puzzle, hit-rate tests). One internal attempt is 13 calls: best case about 112 s (off), 116 s (summary), 130 s (full);
**worst case with every internal attempt used: 558 s, 464 s and 520 s, all above 450 s** (formula in the row). The
synchronous test is not stopped by its 120000 ms timeout (`core/tests/harness.js:415-418`). A first-attempt pass is not a
bound and a pilot is forbidden, so the rows are `no-defensible-bound` and held. Options: owner/SA ruling on a bounded
launch (accepting the best-case basis), or keep the three ratios as named, unexecuted items.

## Q-DEEP-BOUND — the 28 deep occurrences: no bound, and the records are not current

Nightmare records (`MS05r5m/records`, source `fee8b8d6`, commit `1ae831c1`) and Hell 1 records
(`MS07b/mega-hell1/records`, source `ddf2fa5a`, commit `959aae09`) are 14 each. The engine has changed since:
27 files for the Nightmare commit, 22 for the Hell 1 commit (`preflight/reuse-map.json`). A `sourceHash` mismatch is
expected, so a coherent fourteen-record refresh per level is likely needed; the recorded non-generation-diff exception
cannot cover generation-path changes of that size. I did not run `--reconcile` (it would write an E2 path). Old
single-request durations: mega12 about 24 s (Nightmare) and 30-34 s (Hell 1), mega16 80-117 s and 100-123 s, all on older
engines; the 500000 ms diagnostic budget is not a bound. Rows `DEEP-*` are `no-defensible-bound`. Please say whether a bound
may rest on the old durations with a stated margin, whether a file-only `--reconcile` of the old records may write under
`preflight/`, or whether the deep tool stays an unexecuted named item.

## Q-SAV11-ROUTE — no existing route runs the S-AV11 tuple

`generator/tests/difficulty-recovery.js` knows only the cases G13, mega12-nightmare and mega16-nightmare (header, lines
9-17). jigsaw9 / Expert / seed 1111 / trace off / default 8 attempts needs either a new case in that tool (and its
`recovery-profile` suite, a quick-fingerprint change) or a one-off driver outside the dispatch file list, which needs an
assignment first. No current-source timing of Jigsaw Expert exists (Expert is hidden; GP has no such cell); the 325.313 s
observation is whole-request history, 1.38 x below the 450 s ceiling and only 1.66 x below 540 s. Held; no bound.

## Q-MS17B-FILES — MS17b GD files used as same-work evidence

`cap.json` and `score-v3.json` recorded failures that the later `cap-repaired.json` and `score-v3-repaired.json` replace
(MS17b `evidence.md`, the cap repair and the score-v3 repair). The plan uses the repaired runs (fewer failures) and names both. No action needed unless
you want the failed runs excluded from the plan.

## Not a question, for the record

- `MS05r6a-COV01`: the reveal fold is asserted today at `generator/tests/suites/player.test.js:703-728` on **G12**
  (greaterThan hard seed 3115968914, compact step 4: `replay.folded.reveal`, peak 3,221, the English "clues were restored"
  text) and in `replay.test.js:999-1012` on a synthetic jump table (`folded.revealed` 3). The item text says "G11", but G11
  (greaterThan expert seed 42) is the sign-jump specimen of `player.test.js:952-976` and has no reveal key; the record names
  the wrong golden. The branch is asserted; E3 executes it. No test or fixture was changed.
- `player/design.md:70` (`docs/ fixtures.md · qa.md`) names files that are not under `player/docs`; not in the assigned
  lines, not edited.
