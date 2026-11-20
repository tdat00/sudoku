# MS05b3 — Post-selection lazy manual corpora and early evidence

| Header | Value |
|---|---|
| Depends on | MS05r5m step evidence, after r5p/r5; retained r4 selection 256 and S-OD3/S-OD4 contracts |
| Size / active time | Medium; 45-60 minutes plus bounded GD |
| Machine time | Approximately 20-90 minutes if the selected-source cells fit; replace with the manifest's measured sum |
| Acceptance | Step evidence complete only; no commit; MS05r6b owns combined acceptance |
| Owner / milestone | Generator test tooling; M5b3 early manual-contract verification |
| Authority / review | FS22/FS25/FS26, S-OD2-S-OD4 and CV6-03 (1); analyst cross-review |
| Gates owned | GD-I5/CV3 early, per-level; no production generation change |
| Status | Not started |

## Goal & business context

Execute MS05r2's absorbed MS05b2 manual contracts before acceptance/MS05e, not at release.
A filtered I5 test currently builds
every level of its variant on first use; the Killer corpus alone can exceed 540 seconds after
requiredness. Make a requested level generate only that level, preserving every seed, count,
option, assertion and full-suite population. The selected no-override default is already active.

**Recovery boundary:** this follows r5p's size defaults and r5m's approved mega contract, not passed
original mega limits. r6a closes E/pins; r6b reconciles this evidence and r6c CI precedes the combined
commit. Preserve every early I5/CV3/refusal obligation. Re-project on the actual source/defaults.
The mega16 Nightmare cell is no longer deferred; >240 s is an S-OD4 availability item, not an owner stop.

**Binding dispatch addendum B1:** SA1's text from section 5 of
`docs/difficulty-v3/claude-opus-5.5/10-review-of-recovery-steps.md` is copied verbatim before the
Execution log. It selects live mega Nightmare CV3 checks and supersedes this task's former
record-reuse route. The body below follows that dispatch contract.

## Scope

In: lazy caches in the five I5 manual suites and `variants`, Killer's per-level I5 registration,
per-level CV3 plus separate unsupported-level checks, focused test-only coverage and early
execution, live mega CV3 outcomes with deep-record cross-references and the numerical item handoff below.
Out: application code, solver/generator policy, changed counts, budgets, floors or assertions,
new user options, regression/hash/help refreshes, qualification and performance-target changes.
Use MS05r5's listing/results tooling; do not redesign it or claim all corpus-wide tests become bounded: aggregate
soundness/means tests still ask for their full unchanged population. Later tasks must not invoke
those whole corpora where only an I5 or CV6 selector is required.

## Repository rules

AGENTS/checklist; no Git, pack or Execution-log edits. Classic test IIFEs, no dependencies.
UTF-8 without BOM, CRLF, final newline, no trailing whitespace. Add a new Generator fixture/suite
to `generator/tests.html` if introduced; Node discovery is automatic. No shared application
script is introduced, so the eight application source lists do not change.

**Announce to the orchestrator before starting a gate (Pentomino runs in parallel on the same
machine).** Use checklist section 7's `Invoke-Dv3Node` for every possibly >10-second command;
jobs 1, no `--jobs`, one invocation at a time, 540-second process ceiling.

## Inputs & context

### Frozen population and lazy access

At `c9935cd`, use these quoted helpers (find them again after r5p/r5m):

| Suite / anchor | Preserve exactly | New access |
|---|---|---|
| `generator/tests/manual/killer.test.js:73-88`, `function corpus`, `function corpusOf` | Current `DEF.difficultySupport` order; seeds 1..`countOf(level)`; 20 below Expert, 8 from Expert; existing `generate(level, seed)`/timing wrapper | `corpusOf(level)` builds/caches that level alone; `corpus()` concatenates all levels in the old order |
| `jigsaw.test.js:795-806`, `function puzzleRun` | `LEVELS`, `countOf(level)`; seed `700 + li * 100 + i`; `generatePuzzle` | `puzzleRun()[level]` lazily builds just that array |
| `greater-than.test.js:197`, `function puzzleRun` | `LEVELS`, `countOf(level)`; seed `100 * (li + 1) + i`; `generate` | Same lazy property access; `allPuzzles()` retains full order/count |
| `extra-regions.test.js:171,175`, `function seedOf`, `function puzzleRun` | `VARIANT_IDS`, `LEVELS`; seed `10000 * (vi + 1) + 100 * li + i`; original count/options | `puzzleRun()[id][level]` builds only that variant/level |
| `wordoku.test.js:110`, `function puzzleRun` | 20 per level; seed `100 * (li + 1) + i`; `PLACEMENT_CYCLE[i % 4]` | Same lazy property access |
| `variants.test.js:73-105`, `function generate`, `function contextOf` | Existing supported levels, `volumeOf(def).perLevel`, seeds 1..perLevel, trace off and 240000 ms request budget | Add `ctx.corpusOf(level)` for one level; `ctx.corpus()` still materializes/returns all levels for aggregate callers |

Use the **original array indexes**, never indexes in a filtered level list. No request is seeded
from the order in which a test first asks for its level. Retain the original elapsed-time boundary;
do not cache a time from another request, regenerate the array per assertion, or use hash fixtures.

A small test fixture may expose `SG.test.lazyCorpus(keys, build)`:

```text
returns an object with an enumerable lazy getter for every key in the supplied order
first successful access calls build(key, originalIndex) once and stores its array
later access returns that same array reference
reading keys/registering tests does not call build
failure propagates unchanged; no partial array is published as a successful population
```

Use `Object.defineProperty` or explicit per-level accessors, not a proxy or a production cache.
The implementation must be usable from the existing Node and browser test pages. Killer can
wrap the same helper with `corpusOf`; its public-to-this-file `corpus()` still visits every level.
Preserve `futoshikiRun`, hybrid boards and all non-corpus helpers.

For `variants`, construct the per-level cache on first corpus access, retaining the original
support-array order. `corpusOf(level)` reads just that key. **`corpus()` must force all supported
keys before returning its map**, not merely return a lazy map: the existing `sweepMoving`
test at `generator/tests/manual/variants.test.js:487-498` fills the corpus, changes the clue floor, then expects CV4
to fail on those already-generated puzzles. Keep that test and the aggregate CV4/CV5/CV6
behavior. Preserve the existing cached definition/volume behavior and per-level reuse.

### Per-level assertions and selectors

Jigsaw, Greater-Than, extra-regions and Wordoku already register one I5 test per level.
Keep their existing nested describe names and assertion bodies. In Killer split **only** the
corpus-wide I5 into `LEVELS.forEach` registrations under:

```text
describe(level + ': ' + countOf(level) + ' puzzles', ...)
  it('I5: every puzzle ...', ...)
```

Use `corpusOf(level)`, a local hit count initially zero, and retain every per-puzzle assertion
from MS05r2 plus the identical strict `hits > countOf(level) * 0.8` assertion. Do not change
it to `>=`, omit misses, or replace it with a vacuous `every`. Other Killer tests remain unchanged.

The harness lower-cases full names and uses a **substring** search, not a regex
(`core/tests/harness.js:499,509`). Anchor I5/CV6 selectors at a describe boundary:

```text
> <level>: <count> puzzles > I5:
extra-regions: > <variantId> <level>: <count> puzzles > I5:
CV6 uses the identical prefix, ending in > CV6:
```

Without the leading `> `, `easy: 20 puzzles > I5:` also matches Very Easy. Preserve that prefix
when substituting levels; it is part of the quoted `--filter` value, not shell redirection.
Each generation selector must select exactly one test. Read the runner's selected total and
full test name before recording a result as that cell's evidence; zero, two or a skipped test
is not a passed cell. Use `--verbose` for the cell transcript so passing full names are printed.

### Split only the registered CV3 wrapper (FS26)

At `variants.test.js`, `function checkLevels` (line 189 at resume), extract the supported-level body into
`checkSupportedLevel(def, ctx, level)`, reading `ctx.corpusOf(level)`. Preserve MS05r2's exact
flag/warnings contract, counts, all array/model checks, the `exact === 0` failure and the
existing DEEP threshold. Extract the unsupported-level loop into `checkUnsupportedLevels(def)`;
it calls no corpus helper and still expects `difficulty.unsupportedLevel` for the same complement
of `SG.difficulty.LEVELS` and `def.difficultySupport`.
Keep every per-puzzle assertion before the aggregate `exact === 0` failure, as B1 requires.

Retain `checkLevels(def, ctx)` as the aggregate of these two helpers. Keep `CHECKS` with **one**
CV3 entry and keep `SG.test.variantSweep.sweepVariant(def, {only:['CV3']})`'s existing report
shape and all-level behavior. Split the registration under `variantsUnderTest().forEach` (line 411 at resume):

```text
describe('variants: ' + def.id, ...)
  it('CV3 ' + level + ': puzzles at the supported level', ...) // once per supported level
  it('CV3 unsupported: other levels are refused', ...)         // once per variant
```

Do not also register the old aggregate CV3 `it`; leave every other CHECKS registration intact.
Use these exact selectors:

```text
> variants: <id> > CV3 <level>:
> variants: <id> > CV3 unsupported:
```

There is a space after `CV3`, then the level and colon; `CV3 easy:` cannot match `CV3 veryEasy:`.
Each selector runs one test. The refusal test may have an empty unsupported complement for an
all-level variant; record that complement, not a skipped/zero-test result. It never generates
a supported puzzle. No new runner flag or change to its substring semantics is needed.

### Parity and measurement

Before changing the caches, retain a task-owned read-only snapshot of the six old corpus helper
bodies in `generator/tests/artifacts/difficulty-v3/MS05b3/`; never check out another revision.
Compare their full ordered request manifests with the lazy implementation using a scripted
producer. This covers **all** levels/variant indexes, counts, seeds, trace/options and Wordoku
placement cycles, in natural order and reverse first-access order. Assert no unrelated key is
built by one-level access and repeated access generates no duplicate requests.
For reverse access compare the keyed plans and final aggregate enumeration, not the intentionally
different chronological call order. Include all registered variants, the 2/3-request volume split,
unsupported-level refusal without generation and the eager aggregate `corpus()` contract.

Also compare real outputs for the first generated level of each suite (and both extra-regions
variants). Capture the old full-build **prefix**, stopping before it starts a different level;
do not run the old whole corpus. In the isolated driver, a wrapper around `SG.pipeline.run`
copies each requested config/output, throws an owned sentinel before the first out-of-prefix
request, and restores the wrapper in `finally`. Catch only that sentinel. Expose the private
old `corpus`/`puzzleRun` in the driver's in-memory copy, not the repository source; no-op
`describe`/`it` prevents test callbacks from running. The same chosen prefix can then be read
from the new one-level cache in a fresh process. For Hyper retain its existing variant index 1,
but select its first-level prefix directly from the saved old inner variant builder; the
scripted whole-manifest comparison proves this did not reindex the requests.
For the newly owned `variants` adapter, also compare one real small-variant first-level prefix
(classic4's first supported level, seeds 1..perLevel); its all-variant plans are covered by the
scripted comparison. Do not generate an old whole multigrid corpus for this parity test.

Compare copied givens, solution and generation-affecting model data (regions, cages, inequalities,
fixed cells/symbols where present), exact flag, rating and warnings; exclude clocks. This is
prefix parity, not a claim of a timing-equivalent old whole-suite run. No fixture is rewritten.
Retain snapshots, configs, projection digests and raw differences. An unexplained output
difference blocks; do not accept it as a new expected golden.

Then run every current per-level I5 selector of the five suites and every safely bounded CV3
level/refusal selector, once. Record the full manifest **before** running, with original request
counts/seeds, projections and any explicit deferrals below. Each completed selector must have
selected total 1 in the runner summary. Preflight the selection with r5's `--list-tests`
and retain `--results` JSON as well as the verbose transcript. Record its full name, actual
request count, wall time, exit and named failure/line. Classic9 difficulty is MS05r6b's full GD.
That task reconciles these early results; MS18e later reruns final-source selectors, never
relabels this evidence.

### CV3 preflight, live mega checks and named items

Before the first CV3 generation command, project **each (variant, level)**, not each whole
variant. Normal volume remains 2 seeds for samurai/sohei/flower/mega16/butterfly and 3 for the
others; seeds remain 1..perLevel. The live-generation 240-second guard stays unchanged.
Use r5p/r5m's current size-default evidence and this task's I5 measurements. Older r4/b1 times
must retain their old eight-attempt identity and cannot be called current bounds.
Scale a conservative observed per-request cost by the unchanged count and include known
non-generation overhead. The 220 s samurai seed-42 observation is a risk indicator, not a
measurement of this test's seeds 1 and 2. A source change or an unknown bound is not zero cost.

**Mega16 Nightmare must be checked now, not deferred on the former 620-second estimate.**
B1 uses r5m's measured seeds 1/2 to project about 221 s for the live mega16 cell, and seeds 1/2/3
to project about 71 s for mega12, plus registration/checks. Run the two normal CV3 selectors live,
one locked command per cell after a selected-total-1 `--list-tests` preflight. Use `-AllowExit1`,
`--verbose` and fresh `--results` files. No in-runner reuse, record provider or replay entry point.

First run B1's no-generation `mega-contract.js --reconcile` command without the lock. Inspect
`identity.currentMatches.sourceHash` and `.toolHash` explicitly; exit 0 alone is not compatibility.
If both are true, cite the deep records' additional checks by occurrence id:
`mega16-invariant-1/2` and `mega12-invariant-1/2/3`. Otherwise record the changed files and leave
deep compatibility to r6a/r6b; the live CV3 outcomes remain independently recorded. Never replace
a CV3 seed with a CV5 repeat or a different puzzle.

Keep all CV3 per-puzzle assertions before the aggregate hit check. The expected failures are only
"mega16 nightmare: none of 2 puzzles hit it" (S-AV03, 0 of 2) and mega12's "none of 3" (S-AV02,
0 of 3). They are failed availability assertions, not green cells; any other failing assertion is
a correctness stop. A request over 240 s is a named availability item for **MS07e and MS18c**.
Keep the request guard and counts unchanged.

Label both CV3 manifest rows `generation: live`, record their actual per-request/command times and
the r5m occurrence ids, and retain the deep times separately as prior measurements, not live timings.

For other cells projected above 450 s or with no credible bound, do not launch an unsafe callback.
Record the exact unexecuted population, projection/reason, item ID and MS07e/MS18c route in
`docs/difficulty-v3/evidence/MS05b3/deferred-cv3.json` (empty list if none). r6b reconciles it
without calling it passed. A known timeout stays a failed outcome, not a retrospective deferral.
Continue independent checks under S-OD4; no automatic extra tooling task, count reduction or cap change.

## Files to create/modify (exclusive ownership)

- `generator/tests/manual/killer.test.js`, `jigsaw.test.js`, `greater-than.test.js`,
  `extra-regions.test.js`, `wordoku.test.js`: the caches and Killer I5 registration only.
- `generator/tests/manual/variants.test.js`: per-level cache access, extracted unchanged CV3
  assertion helpers and split registration; preserve aggregate sweep and B1's assertion order.
- Optional small `generator/tests/fixtures/manual-corpus.js`; new
  `generator/tests/suites/manual-corpus.test.js`; `generator/tests.html` fixture/suite lists.
- `generator/design.md` 15.3/15.4; both developer guides, testing/filter facts only.
- `docs/difficulty-v3/notes.md`, `docs/difficulty-v3/evidence/MS05b3/`;
  task-owned parity/manifest scripts in `generator/tests/artifacts/difficulty-v3/MS05b3/`.
- `difficulty.test.js` is already per-level and is not edited. No application or generated
  fixture file is owned.
- B1 additionally forbids edits to `generator/tests/mega-contract.js`,
  `generator/tests/fixtures/mega-contract.js` and every file of `SOURCE_FILES`; build no reuse code.

## Implementation steps

1. Inventory MS05r2's changed sites and current level/variant/count/filter manifest. Capture the
   scripted old request plan and real first-level prefixes in bounded locked invocations.
2. Implement lazy caches, preserving caller shapes and whole-population aggregate helpers.
3. Split Killer I5 and registered CV3, preserving its aggregate API/refusal coverage; prove
   isolated access, full manifest parity, eager aggregate behavior and failure/cache semantics.
4. Validate boundary-prefixed selectors with Easy/Very Easy names. Run focused quick checks and the
   bounded early GD manifest, one selector at a time. Preflight every CV3 level and record any
   named unsafe-command item before launching; check both mega Nightmare cells live under B1.
   Verify selected total 1, record `generation: live`, and link the deep occurrence ids without reuse.
5. Hand all outcomes/projections and added quick identities to r6a/r6b. No independent
   tooling commit; full quick coverage belongs to r6b. MS05e/MS18e receive the accepted evidence.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05b3-B01 | Early manual contracts retain every request; mega16 Nightmare is checked now, performance-only findings are named and routed |
| MS05b3-B02 | A level-selected assertion cannot unexpectedly generate the whole variant corpus |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05b3-T01 | All six adapters isolate a key, preserve reuse/seed plans and aggregate order; variants.corpus() still materializes all keys |
| MS05b3-T02 | The five I5 suites' real prefixes (both extra-regions variants) and one small-variant CV3 prefix preserve outputs |
| MS05b3-T03 | Killer I5 and CV3 splits retain assertions/counts/thresholds; aggregate sweep API and unsupported-level refusals remain covered |
| MS05b3-T04 | Runner selectors select one test; B1's mega CV3 cells run live with fresh results, ordered per-puzzle/aggregate checks, deep occurrence-id links and honest availability outcomes |
| MS05b3-T05 | Focused quick/list checks pass; new cases join r6b's complete quick inventory; no application, fixture or performance-contract change |

## Test plan and gates

Quick cases: accessing `b` before `a` uses original indexes 1 then 0; `b` twice calls its producer
once; `Object.keys` calls none; aggregate visits all original keys in order; an error keeps its
identity and cannot publish a truncated array. Test all five adapters' seeded plans with a
scripted pipeline, including extra-regions' variant index and Wordoku's per-request options.
Also test the sixth (`variants`) adapter: a single CV3 level generates only its original
1..perLevel seeds; a second read reuses them; aggregate `corpus()` fills all remaining keys;
unsupported checks generate no supported puzzle; the `sweepMoving` cache-before-floor-change
regression still has teeth; `sweepVariant(...,{only:['CV3']})` still returns one CV3 verdict.
Use isolated/no-generation harness tests for Easy/Very Easy I5 and CV6 and for CV3 level/refusal
names. The old unprefixed Easy selector matches two; each new boundary-prefixed selector must
match exactly its intended one, case-insensitively.

From Generator, define/dot-source the checklist lock helper in the same shell invocation:

```powershell
Invoke-Dv3Node -Task MS05b3 -NodeArgs @('tests\node-runner.js','--suite=manual-corpus,ui-contract,help','--results=..\docs\difficulty-v3\evidence\MS05b3\tooling.json')
# Exact examples; expand the recorded current population, not an arbitrary sample of levels.
Invoke-Dv3Node -Task MS05b3 -NodeArgs @('tests\node-runner.js','--suite=killer','--filter=> normal: 20 puzzles > I5:','--list-tests=..\docs\difficulty-v3\evidence\MS05b3\selectors\killer-normal.json')
Invoke-Dv3Node -Task MS05b3 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=killer','--filter=> normal: 20 puzzles > I5:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05b3\i5\killer-normal.json')
Invoke-Dv3Node -Task MS05b3 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=greater-than','--filter=> normal: 20 puzzles > I5:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05b3\i5\greaterThan-normal.json')
Invoke-Dv3Node -Task MS05b3 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=wordoku','--filter=> normal: 20 puzzles > I5:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05b3\i5\wordoku-normal.json')
Invoke-Dv3Node -Task MS05b3 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=extra-regions','--filter=> diagonalX normal: 20 puzzles > I5:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05b3\i5\diagonalX-normal.json')
Invoke-Dv3Node -Task MS05b3 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=variants','--filter=> variants: classic9 > CV3 normal:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05b3\cv3\classic9-normal.json')
Invoke-Dv3Node -Task MS05b3 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=variants','--filter=> variants: classic9 > CV3 unsupported:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05b3\cv3\classic9-unsupported.json')
```

For Jigsaw and every other I5 cell use its unchanged `countOf`/`PER_LEVEL`, not a guessed 20;
CV3 uses its own unchanged 2/3 volume, not the I5 volume. List every selector before running,
not only the Killer example. Full quick follows at MS05r6b. Jobs 1/no
`--jobs`; each launched command must be projected <=450 seconds and finish within 540.
Planning allowance is 20-90 minutes total if the current-source cells fit; replace it with actual
per-cell projections. Both mega Nightmare cells use B1's live commands, not deep-record reuse.
An overlong I5/CV3 command or timeout is an S-OD4 item, not an owner stop; no count/ceiling changes.

I5 exactness/uniqueness/validity failures block. An unchanged hit-rate threshold may now fail
because required puzzles are rare; retain it as a failed availability assertion with counts
under checklist GD rules, hand it first to MS07e then MS18c/MS18d, and do not call the suite green. This test-only
task cannot resolve such an engine failure by changing expected output. CV6 is not run here;
MS05e owns its separately measured, unchanged assertion. No GG/GR/GH, GQ or GP.

## Definition of done & handoff

Provide the old/new population comparison, real prefix evidence, exact filter manifest, every
early I5/CV3 outcome/time, unresolved failures and projections. The orchestrator records
**step evidence complete** with the inherited/new item list and exact live-CV3/deep-reference/outstanding
manifest retained; no commit. MS05r6b audits all coverage and r6c closes CI before the combined
commit. MS14c uses corpus-free Killer checks; MS18e reruns I5/CV3/refusals and cannot inherit
an unrun cell as passed. MS05e waits for the combined commit, not this READY/evidence marker.

## Stop rules

Stop for unexplained changed request/output identities, corrupt evidence or per-puzzle correctness/
requiredness/warning failures, or a proposed recorded-decision change. Performance/availability
findings become named numerical items and the task continues under S-OD4. Do not change assertions,
choose another cap, increase a guard or invent additional evidence/tooling classes.

## 5. Addendum B1 to MS05b3 (binding; SA1, 2026-11-14)

**The mega Nightmare CV3 cells.** Check them through the normal live selectors. Do not reuse r5m's records in this
task. The reason: a runner-loaded suite has no `require` (`SG.test.node` is only `fs`, `path`, `vm` and `root`), so the
`variants` suite cannot compute the `sourceHash` and `toolHash` that `SG.fixtures.megaContract.reuse` must compare. A
Node replay entry point would also have to load the harness, the fixtures and the manual suite outside the runner. The
live path is bounded since MS05r5p, and step 4 already allows it.

1. **Run the two cells live.** After the CV3 split, run one locked `Invoke-Dv3Node` command per cell, with
   `-AllowExit1`, `--verbose` and a fresh `--results` file under `docs/difficulty-v3/evidence/MS05b3/cv3/`:
   - `'--suite=variants','--filter=> variants: mega16 > CV3 nightmare:'`
   - `'--suite=variants','--filter=> variants: mega12 > CV3 nightmare:'`

   Preflight each with `--list-tests` (selected total 1).
2. **Projection.** It comes from MS05r5m's records of exactly these requests: `{ variantId, difficulty: 'nightmare',
   seed, trace: 'off' }` through `SG.pipeline.run`, engine source `fee8b8d6…`.
   - mega16, seeds 1 and 2: 116.951 + 103.606 s, about 221 s;
   - mega12, seeds 1 to 3: about 71 s;
   - plus registration and checks.

   Both are under the 450-second projection rule and far from the unchanged 240 s request guard.
3. **Expected outcome.** In the extracted `checkSupportedLevel`, keep the current order: every per-puzzle assertion of
   the level first (`variants.test.js:193-208` at `1ae831c`), then the aggregate `exact === 0` failure (209-211).
   Each cell should then pass every per-puzzle assertion and fail only the aggregate: "mega16 nightmare: none of 2
   puzzles hit it", and for mega12 "none of 3". MS05r5m found every one of these requests to be a shallow fallback.
   Record each as a failed availability assertion:
   - S-AV03: 0 of 2;
   - S-AV02: 0 of 3.

   Give the per-request times from the transcript, route both to MS07e and then MS18c, and continue; it is not a stop.
   The task's own rules still apply: any other failing assertion is a correctness stop, and a request over 240 s is a
   named item.
4. **Confirm the records match.** Before the two commands, run this from `generator`. It generates nothing and takes
   under a second, so check-list section 7 does not require the lock:

   ```powershell
   node tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r5m\records --json=..\docs\difficulty-v3\evidence\MS05b3\mega-reconciled.json
   ```

   - **If `identity.currentMatches` is true for both hashes:** r5m's records of the same requests on the same engine
     carry the invariant, uniqueness, soundness, requiredness and warning checks that the task asks for in these
     cells beside CV3. Cite them by occurrence id.
   - **If either is false:** record the changed files. The live CV3 outcomes stand on their own, and MS05r6b
     reconciles them.
5. **What not to touch.**
   - Do not edit `generator/tests/mega-contract.js`, `generator/tests/fixtures/mega-contract.js` or any file of
     `SOURCE_FILES`.
   - Build no record provider, no replay entry point and no reuse code.
   - In the CV3 manifest, label both cells `generation: live` and name the r5m occurrence ids of the same requests
     (`mega16-invariant-1`, `-2`; `mega12-invariant-1`, `-2`, `-3`). MS05r6b then reconciles live outcomes, without
     double-counting generation.
6. **Anchor.** The harness's substring filter is now at `core/tests/harness.js:499,509` (it was 503 and 518-519); its
   meaning is unchanged.

## Execution log

| Field | Value |
|---|---|
| Status | Step evidence complete (S-OD2; no acceptance or commit of its own; the combined commit follows MS05r6b and MS05r6c) |
| Start | 2026-11-14 02:34 (+07:00) |
| End | 2026-11-14 06:19 developer; IR09 wording 06:56-07:00; 07:05 orchestrator review and backup ref |
| Duration | 3 h 45 min developer (186 cells; lock waits 7,948 s in all, about 7,330 s of them for the other task's lock); about 20 min review |
| Model | claude-sonnet-5.5 (developer); analyst implementation review claude-opus-5.5 (SA1, `docs/difficulty-v3/claude-opus-5.5/10-review-of-recovery-steps.md` §7); orchestrator review claude-opus-5.5 |
| Token usage | 277 model calls; 118,298,226 input tokens (117,007,560 cache reads); 335,182 output tokens |
| AI credits | about 1,828 (developer) |
| Verification | Developer (`evidence/MS05b3/`): `mega-contract.js --reconcile` before and after the live cells, 14 of 14, both `currentMatches` true; `parity.js` (1,213 request plans identical in natural and reverse order; 8 real prefixes identical); `manual-corpus,ui-contract,help` 143/143; 186 cells listed (selected total 1 each) and run: 167 pass, 19 fail only their aggregate availability assertion, every per-puzzle assertion passes; `sourceHash` `c3035e80…` in all 186 cells. Orchestrator re-run under the lock: `manual-corpus,mega-contract,ui-contract,help` 180/180 (8.6 s). SA1's review: order and seeds preserved, the aggregates still force every level, the refusal tests still bind; no evidence invalidated |
| Acceptance | MS05b3-B01, B02 and T01..T05 met, with Addendum B1. `SG.test.lazyCorpus` (`generator/tests/fixtures/manual-corpus.js`) used by the six adapters; Killer's I5 per level; CV3 per supported level plus one refusal test per variant; `checkLevels` and the CV3 aggregate kept; `ctx.corpus()` forces every level. B1 live cells: mega16 Nightmare 116.8 s and 103.9 s (cell 220.7 s), "none of 2 puzzles hit it" (S-AV03); mega12 Nightmare 23.5, 23.1 and 22.8 s (69.4 s), "none of 3" (S-AV02); r5m occurrence ids cited; `generation: live`; `deferred-cv3.json` empty (both deferred cells were run). The 46 new `manual-corpus` quick tests are listed for MS05r6b (`quick-additions.json`). `SG_CORPUS_TIMES=1` prints per-request times (documented). Documents: `generator/design.md`, both developer guides, `notes.md` |
| Issues & resolutions | (1) **Incident (IR07, Major, process):** 134 cells ran without the lock under a 10 s kill timer and 25 more were stopped at 10 s and rerun locked, against check-list §7; 112 unlocked windows (351 s) overlapped Pentomino's MP12b1 in 22 cases. SA1: no MS05b3 evidence invalidated (work-based limits; stopped attempts left no result); no MP12b1 conclusion can move (the overlapped ordinary cells finished far below their limit; contention can only push a Hell prescreen to "not offered"); recorded as a named item in MP12b2's dispatch addendum with a re-run safeguard. The lock rule now states that a kill timer is no exemption (check-list §7; MS05r6a, MS05r6b). (2) IR08: the legacy-8 fix round changes `store.js`, so MS05b3's fingerprint no longer matches; MS05r6b C accepts the store-only exact-diff proof for its 186 results. (3) IR09: `evidence.md` corrected (mega16 within 0.3 %, mega12 0.9-3.6 % faster; the lock waits include stopped attempts and gaps). (4) Two cells first deferred by the developer's 3x projection were then run (2.8 s and 1.3 s) |
| Handoff | MS05r6a/MS05r6b: the live CV3 outcomes and both reconciliations; the 46 new quick tests (`quick-additions.json`; MS05r6c gives `manual-corpus` a CI group; 40 skip in a browser). Items: S-AV02, S-AV03 (live), S-AV04 samurai Nightmare 0/2 (26.7, 25.2 s), S-AV05 Killer Hard 0/20 I5 and 0/3 CV3, S-AV06 Killer Expert 1/8 I5 and 0/3 CV3, new S-AV09 Killer Master 2/8 and Nightmare 1/8 I5 (0/3 CV3), S-AV10 Wordoku I5 Normal 15/20 and Nightmare 4/20 (CV3 Nightmare 0/3), S-AV11 a jigsaw9 Expert I5 request of 325.3 s, S-AV12 sohei/butterfly/flower Nightmare 0/2, S-AV13 butterfly and flower Easy 0/2; S-AV01 (Greater-Than Normal I5 p95 5,280 ms), S-AV07, S-AV08 carried |
