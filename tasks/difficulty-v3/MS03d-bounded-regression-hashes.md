# MS03d — Selected hash records and complete checked merge

| Header | Value |
|---|---|
| ID | MS03d (completes parent MS03) |
| Depends on | MS03c accepted and committed |
| Size / time | Medium; 45-60 active minutes plus one bounded GG check |
| Owner | Generator tooling |
| Milestone | M3d: every future hash refresh can finish in bounded, complete shards |
| Traceability | R21/R24; AUTH-S2, PROC-S1 |
| Status | Not started |

## Goal & business context

Today perf's hash modes ignore measurement filters and always generate 520 puzzles. Add explicit
hash selection/records and complete checked merge without changing seed order, hashes or the corpus.
This preparation task does not update `regression.js` or change generation.

## Scope

In: hash-only CLI selectors, ledger integration, safe complete writes, focused tests and docs.
Out: performance timing thresholds/methodology, production code/order fixes, corpus changes, calibration,
canonical hash updates, full performance or qualification runs.

## Repository rules

Read `AGENTS.md`/checklist. No Git writes or pack/log edits; no dependencies/temp-system directories.
Announce the bounded GG preparation check before running it.

## Inputs & context

### Accepted R21 contract (verbatim)

`generator/tests/perf.js --update-hashes/--check-hashes` currently processes the full 26x20 hash
corpus before applying measurement filters (`:122-126,195-218,246-247`). Do not claim existing
variant/level flags shard those modes. If bounded recording is needed, preserve all keys/seeds,
support selected complete chunks and checked merge, and fail on missing/duplicate outcomes.

The immutable manifest is `SG.fixtures.perfTools.COMBOS` in its existing order and:

```text
SEEDS = [1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765,10946]
```

26 combinations x 20 seeds = 520 `(combo.key,seed)` records. `hashOf(variant,level,seed)` already
generates the correct payload hash; do not reimplement or change it. The payload includes givens,
solution, regions, cages, signs and symbols, not ratings/timings/trace.

### CLI contract

Retain unfiltered `--update-hashes` and `--check-hashes` semantics. Add:

```text
--hash-key=variant/level      one exact existing COMBOS key
--hash-from=N                zero-based index in SEEDS, default 0
--hash-count=N               positive number of consecutive seed indexes
--hash-record=<file.json>    generate selected records, write only the ledger
--hash-merge=<directory>     require complete 520-record ledger, then --check-hashes or --update-hashes
--hash-list                  print exact keys/seeds without generation
--hash-out=<file.js>         alternate output for a complete update (baseline renderer check)
```

Selection flags are hash-mode-only and do not alter timing selectors. Reject unknown keys, invalid
ranges, duplicate/conflicting modes and partial canonical updates before generation. A selected
`--check-hashes` is allowed but says explicitly how many of 520 it checked; it cannot claim full pass.
Use explicit hash selectors, not the existing `--variant`/`--level` timing flags.

Reuse MS03a's pure `SG.fixtures.toolRecords` merge with:

```text
{schema:1, kind:'regression-hashes', sourceHash, manifestHash,
 node, commit, dirty,
 records:[{key:'variant/level#seed', variant, level, seed, hash}]}
```

Hash source identity covers ordered engine SOURCE_FILES plus relevant hash/helper code; manifest
identity covers COMBOS/SEEDS, not old expected hashes. Complete merge rejects missing, duplicate,
unexpected, malformed or mismatched-source/manifest/kind records. Each requested key needs one
successful outcome; never represent a failed generation with the previous hash.

Reconstruct the table in original combo/seed order and use `perfTools.render`. Normalize file output
to CRLF without changing hash values. Do not mutate canonical `regression.js` until complete validation
succeeds; an incomplete merge leaves it byte-identical.

The hash corpus remains fixed even if final qualification hides an old level. In this **test/tool
helper only**, temporarily enable a missing requested corpus level around `hashOf`'s pipeline call,
then restore the original support array in `finally`. Record that diagnostic override. No production
support list changes, and no implication that such a level is offered.

### Anchors at `2c665bb`

| File:line / quote | Use |
|---|---|
| `generator/tests/perf.js:64-87`, `function parseArgs` | Separate hash selectors from timing options |
| `generator/tests/perf.js:122-131`, `function updateHashes` | Currently records all, then writes |
| `generator/tests/perf.js:195-218`, `function checkHashes` | Currently checks all combos |
| `generator/tests/perf.js:244-254`, `if (opts.update)` before `let cells` | Why old --variant/--level do not shard hashes |
| `generator/tests/fixtures/perf-helper.js:137-161`, `var SEEDS` / `var COMBOS` | Fixed manifest |
| `generator/tests/fixtures/perf-helper.js:174-198`, `function serialize` / `function hashOf` | Existing payload identity and generation |
| `generator/tests/fixtures/perf-helper.js:211-247`, `function render(table)` | Preserve order/data; normalize output EOL at the writer |
| `generator/tests/suites/smoke.test.js:17-19,60-64` | Eleven quick-pinned cells; no expected hash edits here |

## Files to create/modify

- `generator/tests/perf.js`, `generator/tests/fixtures/perf-helper.js`.
- MS03a's `generator/tests/fixtures/tool-records.js` only for generic compatible ledger functionality.
- New `generator/tests/suites/perf-tooling.test.js`; `generator/tests.html` suite list.
- Artifacts/evidence under `generator/tests/artifacts/difficulty-v3/MS03d/` and
  `docs/difficulty-v3/evidence/MS03d/`.
- `generator/design.md` 15.2/15.4 and both developer guides' hash-tool commands.

Do not edit `generator/tests/fixtures/regression.js`, the manual perf suite, production variants,
or performance targets. Do not fix the known subset counter here; MS04 owns it.

## Implementation steps

1. Add validated selection/manifest planning and pure complete-merge tests.
2. Generate each selected record via the existing helper and capture exact identity/failure metadata.
3. Add complete comparison/rendering with atomic/no-partial-write behavior; leave timing mode intact.
4. Add the diagnostic hidden-level guard/restoration in the test helper, including restoration on error.
5. Run quick tests and a small first-corpus real check. Full current-corpus recording is not needed to
   validate a pure merge algorithm and is not authorized to change expectations here.
6. Document the first full refresh/check in MS04 and later checkpoints. Record the pre-MS04
   call-history-counter caveat if a baseline selected check disagrees; do not rewrite hashes to hide it.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS03d-B01 | Future intentional output changes can refresh the entire corpus without unbounded commands |
| MS03d-B02 | Missing or mixed evidence cannot replace valid regression expectations |
| MS03d-B03 | No current generated puzzle, offer or expected hash changes in this task |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS03d-T01 | All 520 identities, seed order and hash algorithm are preserved |
| MS03d-T02 | Partial checks are labelled; canonical writes require a complete validated merge |
| MS03d-T03 | Invalid modes/ranges and missing/duplicate/mixed-source rows fail without writes |
| MS03d-T04 | Diagnostic support override restores the exact original array, including on failure |
| MS03d-T05 | Renderer equality, CRLF/no BOM, both quick sets and the bounded baseline check pass |

## Test plan

Quick tests use synthetic ledger rows or the existing fixture table as **unit-test data**, not as
fabricated gate evidence. Test out-of-order shards, exact reconstruction, duplicates, omissions,
unknown keys/seeds, wrong source/kind, range boundaries 0/19/20, conflicting modes, partial update
refusal, zero canonical writes on failure, and support restoration on success/error.
Prove timing-mode selectors/options still take their old route.

From `generator/`: `node tests\node-runner.js --suite=perf-tooling,smoke,help,ui-contract`, then
`node tests\node-runner.js`. From `player/`: `node tests\node-runner.js`.
Check every `$LASTEXITCODE`.

Announced GG preparation, from `generator/`:

Jobs: 1, no --jobs flag; estimated 1-30 seconds for each five-seed classic4 command. **Announce to
the orchestrator before starting (pentomino runs in parallel on the same machine).**

```powershell
node tests\perf.js --check-hashes --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=tests\artifacts\difficulty-v3\MS03d\classic4-00.json
```

An attempted complete merge of only that shard must fail as incomplete and leave the canonical fixture
unchanged. Full render equality is tested from synthetic complete records, clearly labelled as a unit test.
No `--update-hashes` against the canonical file, full `--gate`, `--alloc`, or `--all` run here.

## Definition of done & handoff

Report exact selectors, manifest/merge schema, source hashing and hidden-level handling. Give MS04
the bounded GG commands; MS03 completes only when all four subpacks are accepted. No commit/log editing.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MS03d: Selected hash records and complete merge`) |
| Start | 2026-11-12 15:23 (+07:00) |
| End | 2026-11-12 15:48 developer; 15:55 orchestrator review and commit |
| Duration | 25 min developer (1,503 s); about 7 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 98 model calls; 24,799,907 input tokens (24,417,421 cache reads); 173,358 output tokens |
| AI credits | about 513 (developer) |
| Verification | Developer: `--suite=perf-tooling,smoke,help,ui-contract` 172 tests (13.9 s); generator quick 47 suites, 2,964 passed (118 s); player quick 30 suites, 1,666 passed (31 s); bounded GG: `--check-hashes --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5` (5 of 520 unchanged, 0.19 s), the same with `--hash-record` (5 records equal to the fixture, 0.56 s), one-shard `--hash-merge` with `--check-hashes` and `--update-hashes` both refused as incomplete (exit 1, nothing written). Orchestrator re-run: the bounded GG check exit 0 (5 of 520 unchanged, "not a pass of the complete corpus"), targeted exit 0, generator quick 47 suites (120 s) exit 0, player quick 1,666/1,666; `generator/tests/fixtures/regression.js` SHA-256 still `8213ef9a...`; no absolute path in evidence or artifacts |
| Acceptance | MS03d-B01..B03 and MS03d-T01..T05 met. No hash, corpus, generation or fixture change. Diff reviewed: hash selectors `--hash-key/--hash-from/--hash-count/--hash-list/--hash-record/--hash-merge/--hash-out` separate from the timing selectors (timing route untouched); the 520-record manifest, ledger (schema 1, kind `regression-hashes`) and complete merge reuse `SG.fixtures.toolRecords` (optional flat-record `shape` and `checkValue`); incomplete, duplicate, malformed or other-source merges write nothing; hidden-level guard restores the original support array |
| Issues & resolutions | (1) The ledger source hash of this tool covers the engine files `perf.js` loads plus `perf-helper.js`, `tool-records.js` and `perf.js` (no UI/worker files), unlike MS02/MS03a which hash all 63 sources; accepted. (2) Editing `tool-records.js` changes the source hash of MS03a's recorder ledgers, so the MS03a baseline ledgers in `generator/tests/artifacts/difficulty-v3/MS03a/` are now stale for `--merge`; expected, MS04 records fresh ledgers. (3) Legacy behaviour changes accepted: `--check-hashes` with `--update-hashes` now conflicts (update used to win silently); `--alloc` refused with any hash mode; timing flags refused with any `--hash-*` option; unfiltered `--update-hashes` writes atomically and in CRLF (was LF); generation failures exit 1. The manual `perf` suite's `SG_UPDATE_HASHES=1` path still writes LF (out of scope). (4) Spec gaps decided by the developer: `--hash-merge` defaults to check; a selector without `--hash-key` applies to all 26 combinations; `--hash-count` defaults to the remaining seeds; a selection of all 520 is allowed for `--update-hashes`. (5) The guides keep "about 2,900 / 3,910 tests" while the quick set is now 2,964; suite counts updated. (6) The `perf-tooling` suite adds about 12 s to the generator quick run (process spawns) |
| Handoff | From `generator/`: `node tests\perf.js --hash-key=<v>/<l> --hash-from=0/5/10/15 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\<task>\hashes\<v>-<l>-<from>.json` per shard (26 combinations x 4 shards = 520 keys); `--hash-merge=<dir> --check-hashes` to inspect CHANGED lines; `--hash-merge=<dir> --update-hashes` (complete, valid merge only; `--hash-out=<file.js>` for an alternate file); then `--check-hashes` again. Ledger records `{key:'variant/level#seed', variant, level, seed, hash, ms, overrides}`; `ms` and `overrides` never compared. Pre-MS04 caveat: a selected-check disagreement on another combination may come from the subset finder's counter (MS04 fixes it); do not rewrite hashes before MS04 |
