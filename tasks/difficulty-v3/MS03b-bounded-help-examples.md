# MS03b — Curated, bounded help-example tooling

| Header | Value |
|---|---|
| ID | MS03b |
| Depends on | MS03a accepted and committed |
| Size / time | Medium; 45-60 active minutes plus bounded GH checks |
| Owner | Player tooling |
| Milestone | M3b: every technique can receive a real, reproducible example without an unbounded search |
| Traceability | R21, R10; SA2-Q-S11, AUTH-S2 |
| Status | Not started |

## Goal & business context

The current tool may generate thousands of puzzles before `--puzzles` truncates stage 2, and writes
its intermediate file in a system-temp directory. Replace that workflow with explicit per-ID curated
sources and bounded optional discovery. This task does not change any solver, hint or canonical example.

## Scope

In: CLI selections, source manifests, stage-1/stage-2 limits, read-only check, deterministic rendering
and safe partial-ID merge. Out: Jigsaw snapshot/reconstruction (MS03c), new techniques, arbitrary
synthetic candidate-state examples, production example changes or unlimited discovery.

## Repository rules

`AGENTS.md`/checklist apply. No Git writes or pack/log edits. No dependencies or system-temp paths.
Announce GH preparation before real hint replay/discovery. Current generated examples are read-only;
test writes go to this task's project-relative artifacts.

## Inputs & context

### Accepted R21 contract (verbatim)

Adapt `player/tests/tools/make-technique-examples.js` to explicit source/ID selection and bounded
stage-1 generation; `--puzzles` currently truncates only stage 2. Use project-relative artifacts and
line-ending-correct output, not `os.tmpdir()`. Curated real puzzles remain the agreed help format.
If an ID cannot obtain a real hint-replay example within the chosen bound, the task stops and reports;
do not remove its assertion or substitute a synthetic candidate-state example.

### CLI/data contract

Retain the optional generator-directory argument and `--out`. Add:

```text
--ids=id[,id]                 exact registered technique IDs; default all current IDs
--sources=<file.json>         explicit per-ID real puzzle sources
--max-puzzles=N               positive cap applied BEFORE stage-1 generation and to stage-2 input
--max-hints=N                 positive cap per puzzle, default 400 (existing bound)
--check                      compare selected snapshots, no writes (default mode)
--write                      merge selected snapshots into the existing complete catalogue
--discover                   explicitly allow bounded stage-1 PLAN generation
--variants=id[,id]            filter discovery variants before any generation
--levels=id[,id]              filter discovery levels before any generation
--work-dir=<directory>        project-relative intermediates; default tests/artifacts/difficulty-v3/help
--help                       no source loading/generation
```

`--puzzles=N` remains an alias for the new total input cap, not a stage-2-only promise; conflicting
values are a usage error. Without `--discover`, **never generate**. Default sources come from each
selected existing `SG.helpExamples[id].source.puzzle`; a new ID without a source fails with its name.
Explicit discovery uses only the newly generated bounded source list for selected IDs; it does not
silently fall back to their old snapshots. Reject --sources together with --discover. Discovery
variant/level filters are valid only with discovery. `--discover` requires explicit `--write`;
reject it with `--check`, so check mode never generates or writes intermediates.
Default puzzle cap is 64; bounded invocations should choose smaller explicit counts. Keep a tool-level
eight-minute deadline and child timeout so cleanup/reporting fits the ten-minute invocation ceiling;
deadline exhaustion is an incomplete error, never a partial successful canonical write.

Explicit source file:

```text
{schema:1, sources:{
  techniqueId:[{variantId, level:null|string, seed:null|string, text:string}]
}}
```

`text` is a real Generator export block, parsed by the Player importer as today. For each requested ID,
consider only its assigned sources in listed order; do not let an unrelated source silently replace an
unchanged example. Replay fill-notes/hint/apply exactly as the Player does; the selected snapshot must
be a real hint for that ID. Preserve the existing clarity score/tie rule and the cageCombo size>=2 rule.
Within an assigned source choose the clearest eligible occurrence, earliest on ties, as today.
No clue/candidate-state invention and no weakening of the registry's one-example-per-ID assertion.

Check mode compares selected snapshots semantically and reports ID/field differences. Write mode
preserves unselected IDs, requires every requested ID found, and validates the resulting complete
registry catalogue before one canonical write. Output keys follow registry order and use CRLF/no BOM.
An error preserves the old output. Old source provenance text/step remains meaningful; no timestamps
or tool timings enter deterministic snapshot equality.
`--out` also selects the comparison target for --check. Default source puzzles still come from the
canonical catalogue; use --sources to check an alternate catalogue against different curated inputs.

Discovery remains a separate explicit route: pass limits into the child; stop the PLAN loop before
generating request N+1, counting attempted requests including failures. No endless retry to fill a cap.
All intermediates are owned files inside the selected project work directory; no `os.tmpdir`.

### Anchors at `2c665bb`

| File:line / quote | Use |
|---|---|
| `player/tests/tools/make-technique-examples.js:29-40`, `const PLAN = [` | Currently large discovery plan; never run it implicitly |
| `player/tests/tools/make-technique-examples.js:42-54`, `function parseArgs` | Add/validate bounded modes |
| `player/tests/tools/make-technique-examples.js:73-96`, `function stage1` | Apply total cap before `SG.pipeline.run` |
| `player/tests/tools/make-technique-examples.js:157-194`, `async function stage2` | Actual Player hint replay and clarity selection |
| `player/tests/tools/make-technique-examples.js:195-230`, `function write` | Exact-ID completeness and deterministic renderer |
| `player/tests/tools/make-technique-examples.js:233-249`, `os.tmpdir()` / `puzzles.slice` | Remove temporary-directory use and late-only truncation |
| `player/tests/suites/help.test.js:126-177`, `has an example for exactly` / `replaying the puzzle` | Baseline acceptance; no assertion removed |

## Files to create/modify

- `player/tests/tools/make-technique-examples.js`.
- New `player/tests/suites/help-example-tools.test.js`; `player/tests.html` suite list.
- New `player/tests/fixtures/help-example-tools.js`, a pure classic
  `SG.fixtures.helpExampleTools` helper exposing the existing snapshot calculation as
  `snapshot(SG, game, puzzle, hint, item, step)` plus pure selection/render helpers. The CLI loads it
  explicitly after Player sources; add it to the HTML fixture list. Node-only filesystem tests skip
  explicitly in browsers. MS03c extends this same snapshot function.
- Artifacts/evidence under `player/tests/artifacts/difficulty-v3/MS03b/` and
  `docs/difficulty-v3/evidence/MS03b/`.
- `player/design.md` help-example/tooling sections; both developer guides' help-example commands.

Canonical `player/js/ui/help-examples.js`, solver files, existing puzzle/export fixtures and help UI
are read-only. Jigsaw support is the next task, not part of this one.

## Implementation steps

1. Separate parsing/selection/rendering from the CLI entrypoint so quick tests do not invoke discovery.
2. Add the source schema, assigned-source replay and no-write checker.
3. Bound both stages and child execution; replace the temp path with owned project-local files and cleanup.
4. Implement complete-catalogue merge/atomic write to alternate output, preserving unselected data.
5. Run quick tests and bounded checks of existing sources. Update both-language command documentation.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS03b-B01 | Examples remain genuine Player hint replays, not synthetic teaching states |
| MS03b-B02 | Selecting one ID never launches an unbounded discovery sweep |
| MS03b-B03 | Missing/budget-limited examples fail honestly without deleting existing examples |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS03b-T01 | All new flags/legacy alias validated before work; stages honor the cap |
| MS03b-T02 | Check writes nothing; selected merge retains all unselected IDs and rejects incomplete output |
| MS03b-T03 | Same curated input gives equal snapshot data/CRLF output; no system-temp writes |
| MS03b-T04 | Existing help replay/locale/catalogue tests remain unchanged and green |
| MS03b-T05 | Both quick sets pass; canonical help-examples.js unchanged |

## Test plan

Cases: one assigned source/ID; unknown ID; missing source; malformed source; cap at one before a second
generation; legacy --puzzles cap; no generation in check/default mode; child timeout; per-puzzle hint
limit; missing requested ID leaves output untouched; selected update preserves another ID; stable tie;
invalid discovery/check/source/filter combinations; CRLF/no BOM; cleanup only owned intermediates.

From `player/`: `node tests\node-runner.js --suite=help-example-tools,help,ui-contract`, then
`node tests\node-runner.js`. From `generator/`: `node tests\node-runner.js`.
Check `$LASTEXITCODE` after every command.

Announced bounded GH preparation from `player/` (defaults to that ID's existing real source):

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=nakedSingle --max-puzzles=1 --max-hints=400 --check
node tests\tools\make-technique-examples.js ..\generator --ids=cageCombo --max-puzzles=1 --max-hints=400 --check
```

Exercise --write only with `--out=tests\artifacts\difficulty-v3\MS03b\help-examples.js`; compare the
selected data to the canonical fixture. No full discovery PLAN or canonical rewrite is authorized here.

## Definition of done & handoff

Give MS03c and later GH owners the source schema, limit semantics, failure/merge behavior and commands.
Report examples checked, evidence paths and any baseline discrepancy. No commit/log editing.

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
