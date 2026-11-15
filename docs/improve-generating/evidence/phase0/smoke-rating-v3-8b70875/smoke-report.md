# Smoke report smoke-rating-v3-8b70875

Provisional (pre-freeze) compatibility smoke of the improve-generating phase-0 harness against the `rating-v3` source; not a pack round, no gate, no verdict on any prototype.

**Result:** smoke smoke-rating-v3-8b70875 (rating-v3@8b70875): 5 of 8 adapters apply textually (gt-diagnostic fails at js/engine/digger.js [anchor-missing]; jigsaw-profile fails at js/engine/digger.js [anchor-missing]; profile fails at js/engine/digger.js [anchor-missing]); pure tests 2 passed / 5 failed / 2 unstarted or timed out; self-test passed 36/36; loader-parity 1/4 rows; charged 144472/180000 ms in 3 admission(s)

## Identity

- Smoke worktree: `Q:\git\sudoku.ig-smoke-8b70875`, HEAD `8b70875e1839d7f2753d20853a4a0c9226cf2035` (target `8b70875e1839d7f2753d20853a4a0c9226cf2035`), HEAD at the end `8b70875e1839d7f2753d20853a4a0c9226cf2035`.
- Source loaded from the smoke worktree: true (files outside the root: 0, in `Q:\git\sudoku` or the improve-generating worktree: 0).
- Runtime fingerprint `bad5fb5040b7666a3a226158e82dcd62a81afe5e93bd16613adce8d6db98a3c1` (63 sources, runner SHA-256 `e14e1bd179d7481a`).
- The older pack runtime (improve-generating worktree, read only) has fingerprint `36b2b8327f348fc6`; sources changed in the smoke tree: `../core/js/engine/tech-chain.js`, `js/engine/difficulty.js`, `js/engine/digger.js`, `js/engine/explain-data.js`, `js/engine/pipeline.js`, `js/ui/locale.en.js`, `js/ui/locale.vi.js`, `js/ui/help.js`; added 0, removed 0.
- Harness copy: pack files only `8f0018b5c36db04a16707d44fd3c3f011ff3a75321c6d9c81e539beb283bd901`, with the smoke files `c961af25bc432e02854fda27db1508498ec72647bd00a02c0ba3a1c0727cc171` (what the child commands record as `harnessFingerprint`).
- Harness in the improve-generating worktree (read only) has fingerprint `53e7acbc62e6fd45`: identical to the copy: **false**; differing files: `README.md`, `frozen-plan.cjs`, `ig10-run.cjs`, `ig10-test.cjs`, `reconcile-build.cjs`, `reconcile-render.cjs`, `reconcile-report.cjs`, `reconcile.cjs`; only there: `reconcile-errata.cjs`. The smoke tested the copy.
- Labels: self-test.cjs has no --runtime-label option and always records RUN.DEFAULT_RUNTIME_LABEL, a constant of run.cjs naming the older pack runtime (1c042ad / f7be90f); a stale human-readable label in an unchanged self-test record is not source authority. The identity of the loaded source is its runtimeFingerprint and the per-file SHA-256 of command.json.runtimeFiles, compared here with the inspection of the smoke worktree.
  - self-test record label `1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc)`: runtimeFingerprint is the smoke tree's true, per-file hashes match the inspection true, harness fingerprint as inspected true.
  - loader-parity record label `rating-v3@8b70875e1839d7f2753d20853a4a0c9226cf2035` (supplied): runtimeFingerprint is the smoke tree's true, per-file hashes match the inspection true, harness fingerprint as inspected true.

## Charges and waits

Charged 144472 ms of 180000 ms (occupied 9472 ms from the wrapper receipts + 135000 ms grace); admissions 3 of 3; remaining 35528 ms; priority wait (not charged) 439099 ms.

| phase | requested (UTC) | admitted (UTC) | receipt | occupied ms | charged ms | payload deadline ms | wait to admission ms | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| smoke-inventory | 2026-11-15T07:07:28.9201634Z | 2026-11-15T07:13:17.8740000Z | IG IG-S01/smoke-inventory exit=0 seconds=4.079 | 4079 | 49079 | 4000 | 348954 | ok |
| self-test | 2026-11-15T07:13:22.0651808Z | 2026-11-15T07:14:07.3570000Z | IG IG-S01/self-test exit=0 seconds=3.621 | 3621 | 48621 | 15921 | 45292 | ok |
| loader-parity | 2026-11-15T07:14:10.8335756Z | 2026-11-15T07:14:56.2160000Z | IG IG-S01/loader-parity exit=0 seconds=1.772 | 1772 | 46772 | 25000 | 45382 | ok |

Allocation note: the inventory payload was reserved at 4000 ms because the later phases keep their grace, a cleanup reserve and their minimum payload (self-test 15,000 ms = the harness estimate, loader-parity 23,000 ms = the smallest `--deadline-ms` run.cjs accepts); the self-test and the loader-parity command then needed only 3621 ms and 1772 ms of occupied time. 35528 ms of the allocation remain unspent but cannot admit another command (grace alone is 45000 ms) and all 3 admissions are used.

## Textual applicability (private transforms on the source text; semantic parity not tested)

| adapter | used by | transforms | independently applicable | applied in sequence | first failing file / anchor | error code |
| --- | --- | --- | --- | --- | --- | --- |
| noop-expose | IG-S01 | 1 | 1/1 | all 1 | - | - |
| attempt-pool | IG-S02, IG-S03 | 5 | 5/5 | all 5 | - | - |
| frontier-hooks | IG-S04, IG-S05 | 5 | 5/5 | all 5 | - | - |
| gt-diagnostic | IG-S09 | 23 | 22/23 | 20 of 23 (stops) | js/engine/digger.js :: `function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) {` find `const objective = removalObjective(model, spec, ctx.proposal === true);` (dig.guided-entry) | anchor-missing |
| jigsaw-profile | IG-S08 | 32 | 31/32 | 22 of 32 (stops) | js/engine/digger.js :: `function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) {` find `const value = objective(givens, solution, group, ctx.budget, stats);` (dig.objective) | anchor-missing |
| profile | IG-S07 | 27 | 25/27 | 12 of 27 (stops) | js/engine/digger.js :: `function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) {` find `const value = objective(givens, solution, group, ctx.budget, stats);` (profile.objective) | anchor-missing |
| scoped-audit | IG-S03 | 6 | 6/6 | all 6 | - | - |
| scoped-solver | IG-S03 | 10 | 10/10 | all 10 | - | - |

Independently inapplicable transforms of `gt-diagnostic`: `dig.guided-entry` (js/engine/digger.js, anchor-missing).
Independently inapplicable transforms of `jigsaw-profile`: `dig.objective` (js/engine/digger.js, anchor-missing).
Independently inapplicable transforms of `profile`: `profile.objective` (js/engine/digger.js, anchor-missing), `profile.refusal` (js/engine/digger.js, anchor-missing).

Adapter combinations used by the task manifests (applied in their manifest order):

| combination | tasks | origin | result | first failing transform |
| --- | --- | --- | --- | --- |
| (native, no adapter) | IG-S01, IG-S02, IG-S07, IG-S08, IG-S09, IG-S10 | manifest | applies | - |
| noop-expose | IG-S01 | manifest | applies | - |
| attempt-pool | IG-S02 | manifest | applies | - |
| attempt-pool + scoped-solver | IG-S03 | static (manifest not buildable here) | applies | - |
| scoped-solver | IG-S03 | static (manifest not buildable here) | applies | - |
| scoped-solver + scoped-audit | IG-S03 | static (manifest not buildable here) | applies | - |
| frontier-hooks | IG-S04, IG-S05 | manifest; static (manifest not buildable here) | applies | - |
| profile | IG-S07 | manifest | FAILS | profile.objective @ js/engine/digger.js [anchor-missing] |
| jigsaw-profile | IG-S08 | manifest | FAILS | dig.objective @ js/engine/digger.js [anchor-missing] |
| gt-diagnostic | IG-S09 | manifest | FAILS | dig.guided-entry @ js/engine/digger.js [anchor-missing] |

## Per task

| task | adapter combinations | textual | plan-only | shards:keys | engine-free tests |
| --- | --- | --- | --- | --- | --- |
| IG-S01 | (native) ; noop-expose | applies | ok | self-test:0 loader-parity:4 | self-test (full run) |
| IG-S02 | (native) ; attempt-pool | applies | ok | m16-1:2 m16-2:2 m16-3:2 m12:6 sam:6 c9:6 killer:6 gt:6 | pool-test.pure, killer-audit-test.pure |
| IG-S03 | attempt-pool+scoped-solver ; scoped-solver ; scoped-solver+scoped-audit (static (manifest not buildable here)) | applies | prerequisite-evidence-absent: the saved IG-S02 puzzle is missing: docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/c9/a3/puzzles/native-w | - | scoped-test.pure |
| IG-S04 | frontier-hooks | applies | ok | s1-large-controls:6 s2-small-all:32 s3-large-native-f1:6 s4-large-floors:8 s5-large-reference:8 s6-large-s2-control:4 | frontier-test.pure |
| IG-S05 | frontier-hooks (static (manifest not buildable here)) | applies | prerequisite-evidence-absent: the frozen budgets are missing: docs/improve-generating/evidence/phase0/provisional-r1/IG-S04/budgets-r2.json | - | ig05-test.pure |
| IG-S06 | - (no manifest) | no adapter | expected-no-plan-file: IG-S06 has no plan in this harness yet (plans/ig-s06.cjs is added by that task) | - | - |
| IG-S07 | profile ; (native) | DOES NOT APPLY | ok | c9:1 m16:1 m12:1 sam:1 killer-n:1 gt-n:1 killer-h:2 killer-e:2 gt-normal:2 lc:0 | ig07-test.pure |
| IG-S08 | (native) ; jigsaw-profile | DOES NOT APPLY | ok | control:2 tail:1 | ig08-test.pure |
| IG-S09 | gt-diagnostic ; (native) | DOES NOT APPLY | ok | normal-300-304:10 normal-305-309:10 normal-310-314:10 normal-315-319:10 nightmare-700-701:4 nightmare-702-703:4 nightmare-704-705:4 nightmare-706-707:4 nightmare-708-709:4 observer-control:2 | ig09-test.pure |
| IG-S10 | (native) | no adapter | ok | reconcile:1 | ig10-test.gate |

Plan-only classes: `ok`; `expected-no-plan-file` (IG-S06: expected, not a regression); `prerequisite-evidence-absent` (the plan reads evidence of `provisional-r1` that the smoke worktree does not hold; not a source incompatibility); `unexpected`.

## Engine-free pure tests (explicit entry points, no engine, no generation)

| unit | task | status | ok lines | fail lines | wall ms | first failing case: cause [code] |
| --- | --- | --- | --- | --- | --- | --- |
| ig07-test.pure | IG-S07 | failed (exit 1) | 0 | 0 | 1005 | crashed before its summary: HarnessError: replaced text not found in js/engine/digger.js: profile.objective [anchor-missing] |
| ig09-test.pure | IG-S09 | failed (exit 1) | 16 | 20 | 1253.5 | dig.patched-source-without-runtime-is-native: HarnessError: replaced text not found in js/engine/digger.js: dig.guided-entry [anchor-missing] |
| ig08-test.pure | IG-S08 | failed (exit 1) | 29 | 3 | 2439.6 | adapter.transforms-apply: HarnessError: replaced text not found in js/engine/digger.js: dig.objective [anchor-missing] |
| scoped-test.pure | IG-S03 | failed (exit 1) | 16 | 1 | 1375.6 | P09: the saved IG-S02 puzzle is missing: docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/c9/a3/puzzles/native-w1__classic9-1.json [prerequisite-evidence-absent] |
| frontier-test.pure | IG-S04 | failed (exit 1) | 40 | 1 | 573.2 | adapter.anchors: Error: digger.js declares refusalReason |
| pool-test.pure | IG-S02 | passed | 17 | 0 | 563 | pure pool cases: 17 passed, 0 failed |
| ig05-test.pure | IG-S05 | timeout (terminated at the payload deadline) | 0 | 0 | 1956.1 | - |
| killer-audit-test.pure | IG-S02 (Killer re-audit) | passed | 10 | 0 | 156.9 | killer audit cases: 10 passed, 0 failed |
| ig10-test.gate | IG-S10 | timeout (terminated at the payload deadline) | 0 | 0 | 1616.2 | - |

- `ig09-test.pure` failing cases by cause: 20 x "HarnessError: replaced text not found in js/engine/digger.js: dig.guided-entry" [anchor-missing].
- `ig08-test.pure` failing cases by cause: 3 x "HarnessError: replaced text not found in js/engine/digger.js: dig.objective" [anchor-missing].
- `scoped-test.pure` failing cases by cause: 1 x "the saved IG-S02 puzzle is missing: docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/c9/a3/puzzles/native-w1__classic9-1.json" [prerequisite-evidence-absent].
- `frontier-test.pure` failing cases by cause: 1 x "Error: digger.js declares refusalReason".
- `ig07-test.pure` crashed: `HarnessError: replaced text not found in js/engine/digger.js: profile.objective` (code anchor-missing), first frame loader.cjs:255:28; raw output in `smoke/smoke-inventory/ig07-test.pure.stderr.txt`.

A timed-out unit was terminated by PID at the payload deadline and verified gone; it is unstarted coverage, not a failure. Not run by design: `self-test.cjs --only=pure` (covered by the full self-test), engine retests, audit drivers, dev-check generators, the non-gate groups of `ig10-test.cjs`.

## Source drift behind the textual failures (read-only comparison with the older pack runtime)

| adapter | transform | replaced line (find) or anchor | in older runtime | in rating-v3 | closest lines in rating-v3 |
| --- | --- | --- | --- | --- | --- |
| gt-diagnostic | dig.guided-entry (js/engine/digger.js) | const objective = removalObjective(model, spec, ctx.proposal === true); | true | false | L689 `function removalObjective(model, spec, proposal) {` ; L786 `const objective = removalObjective(model, spec, proposal);` |
| jigsaw-profile | dig.objective (js/engine/digger.js) | const value = objective(givens, solution, group, ctx.budget, stats); | true | false | L839 `const objectiveResult = objective(givens, solution, group, ctx.budget, stats);` |
| profile | profile.objective (js/engine/digger.js) | const value = objective(givens, solution, group, ctx.budget, stats); | true | false | L839 `const objectiveResult = objective(givens, solution, group, ctx.budget, stats);` |
| profile | profile.refusal (js/engine/digger.js, bodyStart) | anchor `function refusalReason(value) {` | 1 occurrence(s) | 0 occurrence(s) | the anchored function header is absent |

- `frontier-hooks` exposes the identifier `refusalReason`, which is no longer in the rating-v3 sources of the files it patches (in the older runtime: true): the transforms apply textually, but the exposure would name an identifier the source no longer declares (not run here).

## Runtime canaries (existing self-test and loader-parity rows only)

- **IG-S01/self-test**: ran true, child passed (exit 0, 3349.8 ms), command.json status `complete`, selfTestPassed true, cases 36 passed / 0 failed; engine-related cases: plan-only-loads-no-engine:ok, busy-worker-request-timeout:ok, busy-worker-command-timeout:ok, real-worker-cold-ready-intervals:ok, worker-fails-closed:ok, engine-loads-and-discovers-catalogue:ok, verifier-audits-a-handmade-puzzle:ok; firewall clean true, source stable true.
- **IG-S01/loader-parity**: ran true, child passed (exit 0, 1438.4 ms), command status `paused-unstarted`, rows completed 1 of 4; given --deadline-ms=25000.
  - Packing arithmetic (inspection, before the run): at 25000 ms the window is 13000 ms, every row estimates 10000 ms, so 4 physical commands and one run.cjs call runs only `IG-S01/loader-parity/classic4:veryEasy:1/native`; a complete pair needs `--deadline-ms` >= 32000 and all four rows >= 52000 (static packing arithmetic of manifest.cjs: only the first physical command is run by one run.cjs call).
| row | outcome | claimed exact | verified exact | validation | cold wall ms | puzzle hash |
| --- | --- | --- | --- | --- | --- | --- |
| IG-S01/loader-parity/classic4:veryEasy:1/native | complete | true | true | verified | 109.06269999999995 | 357db3ddfa704c2a |
| IG-S01/loader-parity/classic4:veryEasy:1/noop-expose | unstarted | - | - | - | - | - |
| IG-S01/loader-parity/classic9:hard:1/noop-expose | unstarted | - | - | - | - | - |
| IG-S01/loader-parity/classic9:hard:1/native | unstarted | - | - | - | - | - |
  - parity report: [{"pairId":"classic4:veryEasy:1","verdict":"deferred"},{"pairId":"classic9:hard:1","verdict":"not-started"}]

## Failures with first failing anchor and error code

| where | kind | first failing file / anchor / case | error code | detail |
| --- | --- | --- | --- | --- |
| adapter gt-diagnostic (used by IG-S09) | textual-applicability | js/engine/digger.js :: function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) { | anchor-missing | replaced text not found in js/engine/digger.js: dig.guided-entry |
| adapter jigsaw-profile (used by IG-S08) | textual-applicability | js/engine/digger.js :: function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) { | anchor-missing | replaced text not found in js/engine/digger.js: dig.objective |
| adapter profile (used by IG-S07) | textual-applicability | js/engine/digger.js :: function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) { | anchor-missing | replaced text not found in js/engine/digger.js: profile.objective |
| ig07-test.pure (IG-S07) | pure-test (crashed before its summary) | - | anchor-missing | HarnessError: replaced text not found in js/engine/digger.js: profile.objective |
| ig09-test.pure (IG-S09) | pure-test | dig.patched-source-without-runtime-is-native | anchor-missing | HarnessError: replaced text not found in js/engine/digger.js: dig.guided-entry |
| ig08-test.pure (IG-S08) | pure-test | adapter.transforms-apply | anchor-missing | HarnessError: replaced text not found in js/engine/digger.js: dig.objective |
| scoped-test.pure (IG-S03) | pure-test | P09 | prerequisite-evidence-absent | the saved IG-S02 puzzle is missing: docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/c9/a3/puzzles/native-w1__classic9-1.json |
| frontier-test.pure (IG-S04) | pure-test | adapter.anchors | exit 1 | Error: digger.js declares refusalReason |

## Unstarted work and timeouts

| what | kind | reason |
| --- | --- | --- |
| ig05-test.pure | timeout | terminated at the payload deadline (it had run 1956.1 ms; these files write their output only at the end) |
| ig10-test.gate | timeout | terminated at the payload deadline (it had run 1616.2 ms; these files write their output only at the end) |
| IG-S01/loader-parity/classic4:veryEasy:1/noop-expose | unstarted row | next-physical-command |
| IG-S01/loader-parity/classic9:hard:1/noop-expose | unstarted row | next-physical-command |
| IG-S01/loader-parity/classic9:hard:1/native | unstarted row | next-physical-command |

## Not tested

- semantic parity: that a patched (adapter) instance returns the same puzzles, ratings, checks and work as the native engine on the rating-v3 runtime is NOT tested; only the existing no-op hook (noop-expose) is exercised by the loader-parity rows that ran
- textual applicability of an adapter means its private string transforms find unique anchors and the patched text compiles (vm.Script); it does not run the patched code
- the engine-free tests that ran use fakes and the real source text; none of them generates a puzzle, and the groups that need accepted evidence (reconcile, the historical IG-S10 cases) were not run
- no performance, timing, throughput or pool-width figure was measured or is meaningful here; all numbers are provisional compatibility observations
- IG-S06, rows 706-709 and every frozen-gate run are out of scope; IG-S03 and IG-S05 plan-only is blocked by prerequisite evidence of provisional-r1 that this worktree does not hold

## Driver files

As run (hashes recorded before the first admission; copies in `driver/`):

| file | sha256 |
| --- | --- |
| Invoke-IgSmoke.ps1 | 90d608873a96186f18e80dcbc62fc7d7fec00043c4b217ceed4536141579c666 |
| smoke-inventory.cjs | ac4bcd241533345e9488acb19940267eb25fe9526373865e1b6f8b19962dd977 |
| smoke-lib.cjs | fe14bb322431308995c198a093ae7e9c8b3bd8632219411ee21b1c6dbd1a27c8 |
| smoke-probe.cjs | 910be7225b09c7da7084c64d8867ab2b151380e15fdd1b40ffe51844f9e79a5d |
| smoke-report.cjs | 34bc747668c2a35d165670edd3ad0e139ce7bdf1aa7e018c3051d9a2380c19ce |
| smoke-supervise.cjs | 63460fcfd3fc584e17d35b631764e4fb210baee97f93d4e67e3169bb94c81b12 |

Revised after the run (pure reporting / finalize mode only; copies in `driver/revised/`):

| file | sha256 |
| --- | --- |
| Invoke-IgSmokeFinalize.ps1 | 8fb88a391e82f6a3f142c77769f9c0dd27c7c380ead231e158ec331f92d1f5db |
| smoke-report.cjs | 1a62aaebb2bb4da5ad77b8fb9b9edfc1a4584f4cfc542d4f7005d0d6571a8e50 |

asRun are the hashes recorded before the first admission (copies in driver/); a file listed as revised was changed after the run (report writer, finalize mode) and its copy is in driver/revised/; the wrapper-phase scripts smoke-lib, smoke-supervise, smoke-probe and smoke-inventory are the ones that ran

## Worktree

- `git status --short` of the smoke worktree after the smoke: tracked changes 0 (tracked files unchanged); untracked entries: `?? docs/improve-generating/evidence/`, `?? generator/tests/artifacts/improve-generating/`.
- HEAD unchanged: true.
