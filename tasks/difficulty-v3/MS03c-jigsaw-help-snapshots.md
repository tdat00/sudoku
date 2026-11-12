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
