# MS03a — Bounded wire and analysis golden recorders

| Header | Value |
|---|---|
| ID | MS03a (first subtask of MS03, formerly the tooling task MS04) |
| Depends on | MS02 accepted and committed |
| Size / time | Medium; 45-60 active minutes plus bounded GR checks |
| Owner | Generator tooling |
| Milestone | M3a: intentional output changes can refresh all replay evidence safely |
| Traceability | R21; AUTH-S2, PROC-S1 |
| Status | Not started |

## Goal & business context

The quick replay tests pin fourteen analyses, but the existing recorder writes only four saved
PuzzleResults. Supply a real analysis recorder/checker and bounded recording/merge for both corpora
before the first order change. This task changes no generator/solver/replay behavior.

## Scope

In: analysis projection/recording, wire recorder selectors, complete record merge, quick tooling tests,
documentation. Out: any engine change, order/counter fixes, changing existing expected values, new
techniques or browser gates. Generated files may be written only to alternate artifacts in this task;
the canonical fixtures must remain unchanged.

## Repository rules

Follow `AGENTS.md`/checklist. No Git writes and no pack/log edits. Classic helper/fixture scripts on SG;
Node CLI entrypoints may use CommonJS. No dependencies or system-temp paths. Announce real recorder
checks as GR preparation before using the shared-machine slot.

## Inputs & context

### Accepted R21 contract (verbatim)

Build a bounded recorder/checker for the 14 analysis requests in
`generator/tests/fixtures/replay-goldens.js`, using the actual analysis outputs asserted at
`generator/tests/suites/replay.test.js:611-635`. The existing `generator/tests/replay-fixtures.js`
records only four wire snapshots in `generator/tests/fixtures/replay-wire.js`; it is not an analysis recorder.
Keep intentional step-score assertions at `generator/tests/suites/steps.test.js:879-889` in the same
review. Check-mode compares without writing and explains changed fields.

### Corpus and projection

- Read the fourteen `{id,request}` objects from `SG.fixtures.replayGoldens`; do not retype or derive seeds
  from level names. IDs are G01-G14. The wire manifest is exactly G09-G12.
- Generate through the same `SG.store.toConfig` / `SG.pipeline.run` route as the wire recorder,
  with the existing 120,000 ms caller budget and required trace. No new generation defaults.
- Wire records use `SG.replay.toPlainWire(result)` and set `timings={}`, as today.
- Analysis records use `SG.replay.analyse(result)` on the freshly generated result, not a stale wire
  fixture after a production change. Preserve the existing golden schema:

  ```text
  {id, request, today, counts, board, rows, details, alive, folds, jumps}
  rows = [step, movePosition, phaseCode, empties, score, delta, hardest, jump, culprit, line]
  ```

- Project counts, board facts, compact rows, details scores, alive-sign counts, folds and jump/choice/
  first-use expectations from the analysis. Use the existing test comparisons as the field specification,
  including the synthetic-vector conventions; `SG.replay.phaseCode` supplies phase codes. Use `—` for
  absent display fields; first/zero delta is 0; F/N come from first/newPeak transitions.
- P/W/R/V terms follow the existing six-decimal fixture precision, not a new scoring rounding.
  Exclude timings and diagnostic `checks` from equality, as the replay tests' `stable` helper does.
- Preserve `id`, `request` and historical `today` annotations. Do not copy stale asserted output fields
  from the old fixture. Unused researcher prose is historical, not freshly verified output; mark that
  distinction in the fixture renderer header. No assertion is removed to simplify recording.

Baseline spot vector G01 (must not change here): compact scores
`[0,23,44,551,568,992,992]`, compact count 7, details count 33; compact move positions
`[0,7,22,23,26,31,31]`. All fourteen complete existing expectation projections must agree, not only G01.

### CLI contracts of this pack

Add `generator/tests/replay-goldens.js`. Extend the existing wire recorder with the same bounded modes:

| Option | Behavior |
|---|---|
| `--check` | Compare selected freshly generated records; no writes; exit nonzero with ID/field differences |
| `--write` | Write the complete canonical fixture; reject a partial selection |
| `--ids=G01,G02` | Explicit subset of the script's manifest; reject unknown/duplicate IDs |
| `--record=<file.json>` | Generate selected records into a ledger only; never modify a canonical fixture |
| `--merge=<directory>` | Read ledgers, require the complete manifest, then --check or --write without generating |
| `--out=<file.js>` | Alternate fixture output for --write; project-relative, useful for baseline parity checks |
| `--list` / `--help` | No generation; show manifest/usage |

The wire tool's existing no-option write and `--check` behavior stay compatible. The new analysis tool
defaults to check, never an accidental write. Reject conflicting modes before generating.

Ledger:

```text
{schema:1, kind:'replay-wire'|'replay-goldens', sourceHash, manifestHash,
 node, commit, dirty, records:[{key:'Gnn', request, value}]}
```

`sourceHash`: SHA-256 over ordered relevant SOURCE_FILES bytes plus recorder/helper code.
`manifestHash`: canonical `{id,request}` recipe list, not the old expected numbers.
Keep timestamps/timings outside `value`; neither affects fixture equality.
Merge rejects missing, duplicate, unknown, malformed or source/manifest/kind-mismatched records.
Use manifest order, not file-system order. An interrupted shard is not a full-corpus pass.
No canonical write until the complete merge has validated; preserve the old file on failure.

Add a pure classic `SG.fixtures.toolRecords` helper for deterministic key/manifest validation and merge,
reused later by MS03d. A helper fixture needs an HTML `FIXTURE_FILES` entry; Node discovers it automatically.

### Anchors at `2c665bb`

| File:line / quoted anchor | Use |
|---|---|
| `generator/tests/replay-fixtures.js:23-28`, `const REQUESTS = [` | Exact four wire requests |
| `generator/tests/replay-fixtures.js:61-89`, `function loadSources` / `function build` | Source loading, budget, wire rendering |
| `generator/tests/replay-fixtures.js:92-127`, `function check` / `function main` | Existing no-write checker and CLI behavior |
| `generator/tests/fixtures/replay-goldens.js:1-7`, `SG.fixtures.replayGoldens` | Existing fourteen-request schema |
| `generator/tests/suites/replay.test.js:611-635`, `replay: golden details` | Board/count/score expectations; also inspect the same file's compact/jump comparisons |
| `generator/tests/suites/steps.test.js:879-889` | Intentional step-score pins, read-only here |
| `generator/tests/node-runner.js:228`, `SG.test.node = Object.freeze` | fs/path/vm/root for Node-only quick tests |

## Files to create/modify

- `generator/tests/replay-fixtures.js`; new `generator/tests/replay-goldens.js`.
- New `generator/tests/fixtures/tool-records.js` and, if projection separation is needed,
  `generator/tests/fixtures/replay-recording.js`.
- New `generator/tests/suites/replay-recorders.test.js`; `generator/tests.html` fixture/suite lists.
- Owned artifacts under `generator/tests/artifacts/difficulty-v3/MS03a/` and an evidence note under
  `docs/difficulty-v3/evidence/MS03a/`.
- Docs: `generator/design.md` 15.2 and replay-test tooling; both developer guides' recorder commands.

Read-only: `replay-goldens.js`/`replay-wire.js` under fixtures, existing replay/steps assertions,
all application code. A projection mismatch is investigated/reported, never fixed by rewriting a golden.

## Implementation steps

1. Implement pure projection/ledger validation and tests, following existing golden comparisons.
2. Add bounded modes to the wire tool and the new analysis CLI; retain old defaults where specified.
3. Ensure check mode does not write, and write mode is complete and deterministic CRLF without BOM.
4. Run selected real records, then complete per-ID checks, at most one announced bounded command at a time.
5. Compare complete merged projections to existing fixtures; record any diagnostic-only ignored fields.
6. Document exact commands/options for later output owners. Delete only this task's disposable alternate files.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS03a-B01 | Later changes can explain and deliberately refresh every pinned replay expectation |
| MS03a-B02 | A partial or stale corpus can never replace a complete fixture |
| MS03a-B03 | Existing puzzles and canonical fixtures remain unchanged in this preparation task |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS03a-T01 | Four wire and fourteen analysis identities retained, with exact recipe/config identity |
| MS03a-T02 | Complete current projections match baseline; diagnostic timing/check counts excluded explicitly |
| MS03a-T03 | Unknown/duplicate/missing/mixed-source rows and conflicting options fail without canonical writes |
| MS03a-T04 | Renderer/merge order deterministic; CRLF, no BOM; no temp-system paths |
| MS03a-T05 | Both quick sets and complete baseline checks pass, or a genuine baseline mismatch is reported as blocked |

## Test plan

Quick tests: projection of G01-shaped synthetic data; rated/zero/final and null-score/unverified states; deterministic
record order; duplicate/unknown/missing keys; source/kind/manifest mismatch; check-mode no writes;
partial-write refusal. Node-only CLI tests skip in browsers; pure helper tests run in both.

From `generator/`: `node tests\node-runner.js --suite=replay-recorders,replay,steps,help,ui-contract`,
then `node tests\node-runner.js`; from `player/`: `node tests\node-runner.js`.
Check every `$LASTEXITCODE`.

Announced GR preparation, from `generator/`, one request per command:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=tests\artifacts\difficulty-v3\MS03a\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=tests\artifacts\difficulty-v3\MS03a\analysis\G01.json
```

Repeat the wire command for G10-G12 and the analysis command for G02-G14, then:

```powershell
node tests\replay-fixtures.js --merge=tests\artifacts\difficulty-v3\MS03a\wire --check
node tests\replay-goldens.js --merge=tests\artifacts\difficulty-v3\MS03a\analysis --check
```

Use alternate `--out` paths to test writing, never the canonical files here. A command reaching ten
minutes is stopped and reported; do not silently omit its ID or accept mixed-source evidence.

## Definition of done & handoff

Report the CLI modes, projection schema, ledger helper API, complete baseline comparison and actual
durations. Hand the helper to MS03d and the GR route to MS04 onward. No commit/log editing.

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
