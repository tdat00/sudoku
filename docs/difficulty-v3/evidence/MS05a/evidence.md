# MS05a evidence: exactness transport and prepared shallow messages

Scope: `PuzzleResult.exact` and `Wire.exact` (wire version 1), the strict flag in the result view, the `required` /
`target` arguments of `tune.hit` / `tune.miss` / `tune.shallow`, the warning `difficulty.shallow` and the texts of
both languages. Nothing is emitted by production yet and no acceptance or rating changed. The explanation of the
output difference is in [notes.md](../../notes.md). Paths are relative to the repository root; commands run from
`generator/` unless a command says `player`.

## Recording identity

| Field | Value |
|---|---|
| Recorded at commit | `6165c42` with a dirty working tree (the uncommitted MS05a files) |
| Node, machine | v26.13.0; Windows NT 10.0.26300, AMD EPYC 7763, 16 logical processors |
| Run discipline | one process at a time, no `--jobs`; before every command the timing lock of the shared machine was checked and the sudoku lock held (the timing lock was never present: no wait) |
| Wire and analysis ledgers | kinds `replay-wire` and `replay-goldens`, source hash `275de123f3f18401e2997cd4b97e54e9b126f13f08e5c2ebfc86fa2a8ae59f33` (still the current source hash after all tests); manifests `4ecb6f12ec73a8311b8d3f0583e20ea013a34baca52c758c6d92cbbce8a1c40a` (wire) and `46c7ebd93dccd22c2d18bcb03a062ee3ee9f785b1b70f6b3013345e6c3fd2204` (analysis) |
| Files | `wire/` 4 ledgers (G09 to G12), `analysis/` 14 (G01 to G14) |
| Not run | GG (no hash gate in this task), GQ, GD, GP and any performance gate |

## E recipe, in the order run

| Step | Command (shape) | Exit | Wall | Result |
|---|---|---|---|---|
| GR wire shards | `node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS05a\wire\G09.json` (G09 to G12) | all 0 | 8.7, 1.1, 8.7, 4.3 s (22.8 s) | 4 of 4 keys recorded |
| GR analysis shards | `node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05a\analysis\G01.json` (G01 to G14) | all 0 | 0.5 to 8.6 s per shard (30.6 s) | 14 of 14 keys recorded |
| Wire merge, check | `node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS05a\wire --check` | 1 | 0.4 s | G09, G10, G11, G12 each differ in one field: `exact`, saved `undefined`, fresh `true` |
| Analysis merge, check | `node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS05a\analysis --check` | 0 | 0.4 s | all 14 records match `replay-goldens.js`; nothing to write |
| Wire merge, write | `replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS05a\wire --write` | 0 | under 1 s | `replay-wire.js` rewritten: four lines, each gains `"exact":true,` after `rating`; the file equals the old one once those four insertions are removed |
| Re-check | the wire and the analysis merges with `--check` | 0, 0 | under 1 s | both fixtures up to date |

The analysis goldens were not written: they did not differ. The wire fixture differs from its previous content only
by the new field, so no generation output changed (the four requests give the same models, givens, solutions,
ratings, configs, warnings and dig logs).

## Tests

| Command | Exit | Result | Time |
|---|---|---|---|
| `node tests\node-runner.js --suite=pipeline,events,result-view,i18n,steps,help,worker,cache` (first run) | 1 | 591 tests, 590 passed, 1 failed: `pipeline > the PuzzleResult > has exactly the fields of the contract` listed the old ten fields; the contract now has `exact`, so its field list was updated | 30 s |
| the same suites, after the update | 0 | 8 suites, 591 tests passed | 30 s |
| `node tests\node-runner.js --suite=pipeline,events,result-view,i18n,worker,cache --filter=MS05a` | 0 | the 12 tests tagged with an MS05a acceptance ID passed | under 1 s |
| `node tests\node-runner.js` (generator) | 0 | 47 suites, 2,998 tests passed | 118 s |
| `node tests\node-runner.js` (player, from `player`) | 0 | 30 suites, 1,670 tests passed | 30 s |
| `node tests\node-runner.js` (generator, again after the wire fixture was written) | 0 | 47 suites, 2,998 tests passed | 118 s |

## Acceptance IDs

| ID | Evidence |
|---|---|
| MS05a-B01 | `result-view.test.js`: a Hard-requested, Hard-reached result with `exact` false (and an absent or non-boolean flag) has `exact` false in the view model; only `exact === true` shows true |
| MS05a-B02 | `i18n.test.js`: `tune.shallow` renders in both languages without "wanted" / "got" and without a stray placeholder; `difficulty.shallow` and `tune.shallow` have the same placeholders in both packs |
| MS05a-T01 | `pipeline.test.js` (result, done event, wire, rebuilt result and view agree, for a hit and for the unreachable-level fallback), `worker.test.js` (true, false, absent and malformed flags through `toWire` / `fromWire`; `expectSameResult` now compares `exact` for every loopback, fake and real-worker round trip), `cache.test.js` (flag kept, older entry decodes false) |
| MS05a-T02 | `events.test.js`: required true / false / null with target absent, null, 0, negative and fractional pass `eventProblems` and the vocabulary; other values are refused |
| MS05a-T03 | `result-view.test.js`: `{level}` localized in both languages, kind `approximate`, one Retry for both warnings or the shallow one alone, one Retry button in a rendered panel that calls `onRetry` |
| MS05a-T04 | no change to `digger.js`, acceptance or rating; the four wire records and the 14 analyses show no generation change; both quick sets pass |
