# MS05b3 — Post-selection lazy manual corpora and early evidence

| Header | Value |
|---|---|
| Depends on | MS05r5 step evidence complete, after MS05r4's finite selection/passed original-limit guards; same active tree |
| Size / active time | Medium; 45-60 minutes plus bounded GD |
| Machine time | Approximately 20-90 minutes if the selected-source cells fit; replace with the manifest's measured sum |
| Acceptance | Step evidence complete only; no commit; MS05r6b owns combined acceptance |
| Owner / milestone | Generator test tooling; M5b3 early manual-contract verification |
| Authority | FS22/FS25/FS26; R3/R4/R21; S-OD2 post-selection evidence; unchanged assertions/540-second ceiling |
| Gates owned | GD-I5/CV3 early, per-level; no production generation change |
| Status | Not started |

## Goal & business context

Execute MS05r2's absorbed MS05b2 manual contracts before acceptance/MS05e, not at release.
A filtered I5 test currently builds
every level of its variant on first use; the Killer corpus alone can exceed 540 seconds after
requiredness. Make a requested level generate only that level, preserving every seed, count,
option, assertion and full-suite population. The selected no-override default is already active.

**S-OD2 boundary:** this follows r4 selection/passed guards and r5 tooling; then r6a closes E/pins
and r6b closes the combined recovery. It no longer precedes instrumentation/selection and has no independent
green-commit checkpoint. Preserve every early I5/CV3/refusal obligation. Re-evaluate projections
on the actual selected source; none or an earlier recovery stop forbids dispatch.

## Scope

In: lazy caches in the five I5 manual suites and `variants`, Killer's per-level I5 registration,
per-level CV3 plus separate unsupported-level checks, focused test-only coverage and early
execution with the explicit deferred-CV3 handoff below.
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

At `f788e02`, find these quotes if MS05r2 moved the line numbers:

| Suite / anchor | Preserve exactly | New access |
|---|---|---|
| `generator/tests/manual/killer.test.js:73-88`, `function corpus`, `function corpusOf` | Current `DEF.difficultySupport` order; seeds 1..`countOf(level)`; 20 below Expert, 8 from Expert; existing `generate(level, seed)`/timing wrapper | `corpusOf(level)` builds/caches that level alone; `corpus()` concatenates all levels in the old order |
| `jigsaw.test.js:795-806`, `function puzzleRun` | `LEVELS`, `countOf(level)`; seed `700 + li * 100 + i`; `generatePuzzle` | `puzzleRun()[level]` lazily builds just that array |
| `greater-than.test.js:196-208`, `function puzzleRun` | `LEVELS`, `countOf(level)`; seed `100 * (li + 1) + i`; `generate` | Same lazy property access; `allPuzzles()` retains full order/count |
| `extra-regions.test.js:173-193`, `function seedOf`, `function puzzleRun` | `VARIANT_IDS`, `LEVELS`; seed `10000 * (vi + 1) + 100 * li + i`; original count/options | `puzzleRun()[id][level]` builds only that variant/level |
| `wordoku.test.js:109-126`, `function puzzleRun` | 20 per level; seed `100 * (li + 1) + i`; `PLACEMENT_CYCLE[i % 4]` | Same lazy property access |
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
test at `variants.test.js:486-491` fills the corpus, changes the clue floor, then expects CV4
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
(`core/tests/harness.js:503,518-519`). Anchor I5/CV6 selectors at a describe boundary:

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

At `variants.test.js:189-226`, extract the existing supported-level assertion body into
`checkSupportedLevel(def, ctx, level)`, reading `ctx.corpusOf(level)`. Preserve MS05r2's exact
flag/warnings contract, counts, all array/model checks, the `exact === 0` failure and the
existing DEEP threshold. Extract the unsupported-level loop into `checkUnsupportedLevels(def)`;
it calls no corpus helper and still expects `difficulty.unsupportedLevel` for the same complement
of `SG.difficulty.LEVELS` and `def.difficultySupport`.

Retain `checkLevels(def, ctx)` as the aggregate of these two helpers. Keep `CHECKS` with **one**
CV3 entry and keep `SG.test.variantSweep.sweepVariant(def, {only:['CV3']})`'s existing report
shape and all-level behavior. Only the harness registration at `:404-410` is split:

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

### CV3 preflight and named deferred owner

Before the first CV3 generation command, project **each (variant, level)**, not each whole
variant. Normal volume remains 2 seeds for samurai/sohei/flower/mega16/butterfly and 3 for the
others; seeds remain 1..perLevel. The 240-second request guard stays unchanged.
Use r4's selected-setting diagnostics, this task's I5 measurements and applicable historical
MS05b1 data, recording actual source, allowance, seed cohort and projection basis.
Scale a conservative observed per-request cost by the unchanged count and include known
non-generation overhead. The 220 s samurai seed-42 observation is a risk indicator, not a
measurement of this test's seeds 1 and 2. A source change or an unknown bound is not zero cost.

If a level is projected **above 450 seconds**, do not launch it. Record
`deferred: projected above 450 s`, its estimate/basis, exact selector, original seeds/count and
owner **MS05r6b, combined recovery closure** in `docs/difficulty-v3/evidence/MS05b3/deferred-cv3.json`.
If no credible bounded projection exists, record that distinct reason and the same owner.
Write an explicit empty deferred list if none; a missing file is not proof of no outstanding
coverage. Deferred rows have no executed selected count/exit/time (null), never invented passes.
Do not run a risky whole variant to obtain its projection. Run the independent refusal checks.
A deferral is unrun coverage, not a passed test or an excused timeout.

MS05r6b reconciles this exact list using the selected default, executing only credibly bounded
cells. Selection has already happened; there is no later allowance change promised to fix
them. A still-overlong/unbounded cell is a mandatory owner stop under S-OD2, not permission
for r6b to lower counts, change assertions, add tooling policy or transfer it to release.
This handoff adds no R5 selection cell or criterion.
An already-run failure is retained as a failure, never retrospectively labelled deferred.

## Files to create/modify (exclusive ownership)

- `generator/tests/manual/killer.test.js`, `jigsaw.test.js`, `greater-than.test.js`,
  `extra-regions.test.js`, `wordoku.test.js`: the caches and Killer I5 registration only.
- `generator/tests/manual/variants.test.js`: per-level cache access, extracted unchanged CV3
  assertion helpers and split harness registration; preserve the aggregate sweep API.
- Optional small `generator/tests/fixtures/manual-corpus.js`; new
  `generator/tests/suites/manual-corpus.test.js`; `generator/tests.html` fixture/suite lists.
- `generator/design.md` 15.3/15.4; both developer guides, testing/filter facts only.
- `docs/difficulty-v3/notes.md`, `docs/difficulty-v3/evidence/MS05b3/`;
  task-owned parity/manifest scripts in `generator/tests/artifacts/difficulty-v3/MS05b3/`.
- `difficulty.test.js` is already per-level and is not edited. No application or generated
  fixture file is owned.

## Implementation steps

1. Inventory MS05r2's changed sites and current level/variant/count/filter manifest. Capture the
   scripted old request plan and real first-level prefixes in bounded locked invocations.
2. Implement lazy caches, preserving caller shapes and whole-population aggregate helpers.
3. Split Killer I5 and registered CV3, preserving its aggregate API/refusal coverage; prove
   isolated access, full manifest parity, eager aggregate behavior and failure/cache semantics.
4. Validate boundary-prefixed selectors with Easy/Very Easy names. Run focused quick checks and the
   bounded early GD manifest, one selector at a time. Preflight every CV3 level and record any
   explicit MS05r6b deferral before starting its command; verify selected total 1 for every result.
5. Hand all outcomes/projections and added quick identities to r6a/r6b. No independent
   tooling commit; full quick coverage belongs to r6b. MS05e/MS18e receive the accepted evidence.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05b3-B01 | Changed manual contracts execute after selection/before acceptance; unrun CV3 levels have unchanged manifests and mandatory MS05r6b closure/owner stops |
| MS05b3-B02 | A level-selected assertion cannot unexpectedly generate the whole variant corpus |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05b3-T01 | All six adapters isolate a key, preserve reuse/seed plans and aggregate order; variants.corpus() still materializes all keys |
| MS05b3-T02 | The five I5 suites' real prefixes (both extra-regions variants) and one small-variant CV3 prefix preserve outputs |
| MS05b3-T03 | Killer I5 and CV3 splits retain assertions/counts/thresholds; aggregate sweep API and unsupported-level refusals remain covered |
| MS05b3-T04 | Every completed selector selects exactly one test; complete manifest distinguishes outcomes from explicitly owned deferred CV3 cells |
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
Planning allowance is 20-90 minutes total if the selected-source cells fit; replace that range
with the sum of actual per-cell projections. CV3 deferrals follow the MS05r6b route above. An overlong
I5 or an actual timeout still blocks under the existing rule; no count/ceiling is changed.

I5 exactness/uniqueness/validity failures block. An unchanged hit-rate threshold may now fail
because required puzzles are rare; retain it as a failed availability assertion with counts
under checklist GD rules, hand it to MS18c/MS18d, and do not call the suite green. This test-only
task cannot resolve such an engine failure by changing expected output. CV6 is not run here;
MS05e owns its separately measured, unchanged assertion. No GG/GR/GH, GQ or GP.

## Definition of done & handoff

Provide the old/new population comparison, real prefix evidence, exact filter manifest, every
early I5/CV3 outcome/time, unresolved failures and projections. The orchestrator records
**step evidence complete** with any permitted availability assertions and the exact deferred-CV3
list retained; no commit. MS05r6b alone can accept the recovery after closing all required
coverage. MS14c uses corpus-free Killer checks; MS18e reruns I5/CV3/refusals and cannot inherit
an unrun cell as passed. MS05e waits for the combined commit, not this READY/evidence marker.

## Stop rules

Stop for changed manifests/outputs, a failed focused check, an actual timeout, unbounded I5
or a per-puzzle correctness/requiredness failure. Only unchanged aggregate availability
assertions and explicitly named **unrun** CV3 rows use the retained reporting routes above.
Do not silently expand that exception, choose another cap or amend a budget.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
