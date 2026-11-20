# MS03c — Region-aware Jigsaw help snapshots

| Header | Value |
|---|---|
| ID | MS03c |
| Depends on | MS03b accepted and committed |
| Size / time | Small-Medium; 30-45 active minutes plus one bounded GH source |
| Owner | Player help/tooling |
| Milestone | M3c: a real Jigsaw technique example can be reconstructed correctly |
| Traceability | R21/R17; SA2-Q-S11, SA2-Q-S09 |
| Status | Not started |

## Goal & business context

Jigsaw puzzles are already a discovery input, but snapshots lose their region map and the help UI
cannot rebuild their board. Fix this before `lawOfLeftovers` needs a real example. Do not introduce
that technique or replace current canonical examples.

## Scope

In: `cellRegion` snapshot data, Jigsaw reconstruction, real-source regression tests and bilingual
developer documentation. Out: solver/generator changes, new IDs, synthetic candidate-state examples,
the existing puzzle/export fixtures and canonical `help-examples.js`.

## Repository rules

Read `AGENTS.md`/checklist. No Git writes or pack/log edits; CRLF, classic scripts; no dependencies.
Only the quick checks and one announced bounded GH preparation request below are authorized.

## Inputs & context

### Accepted R21 contract (verbatim)

Jigsaw is already an input variant. Add `cellRegion` to snapshots and a reconstruction branch in
`player/js/ui/help.js`, reusing `SG.textBoards.jigsawSpec`
(`player/js/engine/text-boards.js:141-160`). Test a genuine Jigsaw example.

The existing snapshot stays:

```text
{variant, givens, values, notes, cages?, signs?, hint, source:{puzzle,step}}
```

For `variant:'jigsaw9'` add an owned plain `cellRegion:number[]`, copied from
`puzzle.model.layout.cellRegion`, exactly 81 entries. Preserve all other variants' shape/data.
Rebuild with `SG.textBoards.create(SG.textBoards.jigsawSpec(ex.cellRegion))`; never substitute regular
3x3 boxes or infer regions from givens. An absent/invalid map is unavailable/error through the existing
help handling, never a silently different board.

MS03b supplies `SG.fixtures.helpExampleTools.snapshot(...)`. The source remains a real Generator
export block whose Player hint replay produces the snapshot. No separate synthetic format.

### Anchors at `2c665bb`

| File:line / quote | Use |
|---|---|
| `player/tests/tools/make-technique-examples.js:131-152`, `const out = {` | Snapshot fields, now extracted by MS03b |
| `player/js/ui/help.js:70-78`, `function modelOf(ex)` | Add Jigsaw before the DERIVED fallback |
| `player/js/ui/help.js:82-93`, `function buildExample(id)` | Public pure reconstruction seam |
| `player/js/engine/text-boards.js:141-160`, `jigsawSpec` | Existing region validation/model builder |
| `player/tests/suites/text-boards.test.js:10-38`, `var K = SG.testkit` / `function shape(model)` | Full model comparison, not just digit count |
| `player/tests/suites/help.test.js:126-177`, `replaying the puzzle of an example` | Genuine source/hint acceptance |

## Files to create/modify

- `player/tests/fixtures/help-example-tools.js` and `player/tests/tools/make-technique-examples.js`
  (schema header/usage as needed).
- `player/js/ui/help.js`.
- `player/tests/suites/help.test.js`, `help-example-tools.test.js`, and `text-boards.test.js` only for
  directly relevant reconstruction coverage.
- New `player/tests/fixtures/jigsaw-help-source.js`, containing only one genuine export-text source;
  `player/tests.html` fixture list. Do not modify `fixtures/puzzles/` or `fixtures/exports/`.
- `player/design.md` help snapshot schema and both developer guides' help-example/Jigsaw sections.
- Owned artifacts/evidence under `player/tests/artifacts/difficulty-v3/MS03c/` and
  `docs/difficulty-v3/evidence/MS03c/`.

## Implementation steps

1. Copy the region array in the shared snapshot helper; prove later model-array mutation cannot alter it.
2. Add the reconstruction branch with existing validation; update the tool's generated schema description.
3. Obtain one real Jigsaw source using the bounded command below. Copy its unchanged export text into
   the new classic fixture (record the command/seed); do not hand-build candidate notes.
4. In the quick test, import that source, create a Player game, fill notes and obtain its current first
   real hint. Snapshot it through the helper, temporarily supply that entry to `SG.helpExamples`, call
   `SG.help.buildExample`, and restore the old catalogue in `finally`.
5. Compare model variant, units, unit metadata, layout.cellRegion, givens, values and actual hint effects.
   Snapshot notes intentionally cover only shown cells: their mask must equal the source game's mask;
   other reconstructed cells keep zero notes, not the game's full fill-notes array.
   Do not pin a hint step from an old ladder: the frozen input puzzle is replayed by the
   current hint code in the test. This avoids a new stale golden when S3 changes the hint path.
6. Document the schema in both languages and run the quick checks.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS03c-B01 | A Jigsaw example shows its real regions, not a regular Sudoku board |
| MS03c-B02 | It is sourced from a real puzzle/hint and does not invent a new example format |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS03c-T01 | cellRegion is an owned 81-entry plain array; source and snapshot do not alias |
| MS03c-T02 | Reconstructed units/layout, values, projected notes and hint match the source game |
| MS03c-T03 | Missing/malformed region maps are not silently accepted as classic boards |
| MS03c-T04 | Classic, Killer, Greater-Than and other existing examples remain unchanged |
| MS03c-T05 | Bilingual docs, fixture list and both quick sets pass |

## Test plan

Cases: genuine non-rectangular Jigsaw; copied map ownership; missing map; wrong-length map; invalid
region membership; unchanged classic/Killer/sign examples. Use the existing Jigsaw builder's validation,
not a competing test-only validator.

Announced GH preparation, from `player/`:

Jobs: 1, no --jobs flag; estimated 10-120 seconds for this one-puzzle discovery, never more than
the tool's eight-minute deadline. **Announce to the orchestrator before starting (pentomino runs
in parallel on the same machine).**

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=nakedSingle --discover --variants=jigsaw9 --levels=hard --max-puzzles=1 --max-hints=400 --write --out=tests\artifacts\difficulty-v3\MS03c\help-examples.js
```

Only the alternate output is written. Its selected source supplies the committed text fixture; all
canonical examples remain untouched. Record its region-map shape and successful Player replay.

From `player/`: `node tests\node-runner.js --suite=help-example-tools,help,text-boards,ui-contract`,
then `node tests\node-runner.js`. From `generator/`: `node tests\node-runner.js`.
Check every `$LASTEXITCODE`; no other discovery or browser gate.

## Definition of done & handoff

Hand MS14 and later GH owners the `cellRegion` contract, real source and successful reconstruction
evidence. Report malformed-map behavior and unchanged canonical examples. No commit/log editing.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MS03c: Region-aware Jigsaw snapshots`) |
| Start | 2026-11-12 15:03 (+07:00) |
| End | 2026-11-12 15:19 developer; 15:25 orchestrator review and commit |
| Duration | 16 min developer (986 s); about 6 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 103 model calls; 20,015,202 input tokens (19,739,529 cache reads); 96,118 output tokens |
| AI credits | about 362 (developer) |
| Verification | Developer: player `--suite=help-example-tools,help,text-boards,ui-contract` 154 passed (6.7 s); player quick 30 suites, 1,666 passed (29.8 s); generator quick 46 suites, 2,933 passed (103.8 s); bounded GH: one `--discover --variants=jigsaw9 --levels=hard --max-puzzles=1` write to the MS03c artifact (1 request, 70 hints, solved, 0.39 s), its `--check` (match, 0.17 s), default `--check` of all 26 (1.11 s); a mutation without `SG.model.validate` failed the bad-map test. Orchestrator re-run: default `--check` exit 0 (26 IDs up to date), targeted exit 0, player quick 1,666/1,666 (30 s), generator quick 2,933/2,933 (104 s); no absolute path in the new fixture, artifacts or evidence |
| Acceptance | MS03c-B01, MS03c-B02 and MS03c-T01..T05 met. Canonical `player/js/ui/help-examples.js` unchanged (no saved example has `cellRegion`). Diff reviewed: `snapshot()` adds an owned plain 81-number `cellRegion` copy for `jigsaw9` only; `validateSnapshot` refuses a Jigsaw example without a valid map and a map in any other variant; `help.js` `jigsawModelOf` builds the board with the importer's Jigsaw builder and `SG.model.validate(model, {solve:false})`, returning null (shown as unavailable) on any bad map, never the 3x3 boxes |
| Issues & resolutions | None blocking. Decisions accepted: the generated header documents `cellRegion` only when the catalogue holds a Jigsaw example (the existing test requires the render to equal the read-only canonical file); a second test scene at the first hint that looks into a Jigsaw region (`pointing` in J2); `sources-jigsaw.json` written from the fixture text rather than by a second discovery (to stay within the one announced discovery); the tool test reuses MS03b's sandbox path; `drawExample` not exercised (no browser gate in this task). No living document made inaccurate (`docs/qa/browser-run.md` counts are a dated record) |
| Handoff | A Jigsaw example needs no new format: record a source with `--discover --variants=jigsaw9 --levels=hard` (or a Jigsaw block in a `--sources` file), then `--write`. The first canonical write of a Jigsaw example also changes the generated header of `help-examples.js` (the `variant` line and one added `cellRegion` line). Real Jigsaw source text: `player/tests/fixtures/jigsaw-help-source.js` (command and seed in its header) |
