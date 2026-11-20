# MS03a replay recorders: preparation evidence

Scope: the bounded wire and analysis recorders. No generator, solver or replay behaviour changed and the
canonical fixtures `generator/tests/fixtures/replay-wire.js` and `generator/tests/fixtures/replay-goldens.js` are
unchanged. Paths are relative to the repository root.

## Recording identity

| Field | Value |
|---|---|
| Recorded at commit | `ce0f259` with a dirty working tree (the uncommitted MS03a files) |
| Node | v26.13.0 |
| Wire manifest | 4 keys, kind `replay-wire`, `manifestHash` 4ecb6f12ec73a8311b8d3f0583e20ea013a34baca52c758c6d92cbbce8a1c40a |
| Analysis manifest | 14 keys, kind `replay-goldens`, `manifestHash` 46c7ebd93dccd22c2d18bcb03a062ee3ee9f785b1b70f6b3013345e6c3fd2204 |
| Source hash (both tools) | 47b2f0e1c980d9d318dc5b445b6bc63b7f2efe123e2c941fd87e7648c60de813 |
| Ledgers | `generator/tests/artifacts/difficulty-v3/MS03a/wire/G09..G12.json`, `generator/tests/artifacts/difficulty-v3/MS03a/analysis/G01..G14.json` |

The source hash covers the generator sources plus the four recorder files. A later edit to any of them makes
every ledger here stale, and `--merge` refuses it.

## Commands, from `generator/`, one request per command

All exit codes are 0. "gen" is the generation time printed by the tool, "wall" the process wall time.

| Tool | Request | gen s | wall s |
|---|---|---|---|
| wire | G09 killer expert 3514204290 | 7.7 | 8.2 |
| wire | G10 killer nightmare 42 | 2.4 | 2.8 |
| wire | G11 greaterThan expert 42 | 8.2 | 8.6 |
| wire | G12 greaterThan hard 3115968914 | 3.9 | 4.4 |
| analysis | G01 classic9 expert 3275974478 | 0.1 | 0.6 |
| analysis | G02 classic9 veryEasy 1 | 0.0 | 0.5 |
| analysis | G03 classic9 nightmare 42 | 0.3 | 0.7 |
| analysis | G04 classic9 hell1 2400651925 | 0.6 | 1.1 |
| analysis | G05 classic9 hell1 2299986211 | 0.5 | 0.9 |
| analysis | G06 jigsaw9 nightmare 42 | 0.1 | 0.5 |
| analysis | G07 jigsaw9 nightmare 3962167687 | 0.1 | 0.5 |
| analysis | G08 killer veryEasy 1 | 0.0 | 0.5 |
| analysis | G09 killer expert 3514204290 | 7.8 | 8.2 |
| analysis | G10 killer nightmare 42 | 2.5 | 3.0 |
| analysis | G11 greaterThan expert 42 | 8.6 | 9.0 |
| analysis | G12 greaterThan hard 3115968914 | 4.0 | 5.7 |
| analysis | G13 samurai nightmare 42 | 0.2 | 0.8 |
| analysis | G14 mega16 hell2 12 | 1.3 | 1.9 |

The table is the second, final recording. The first recording (source hash 1c62159b8ba2...) was discarded after a
trailing blank line was removed from generator/tests/replay-fixtures.js: the edit changed the source hash, so the
stale ledgers were refused by --merge --check (14 problems, nothing written) and all 18 requests were recorded
again, one process after the other. No command reached the ten-minute ceiling.

## Complete checks

| Command | Exit | Wall | Result |
|---|---|---|---|
| `node tests\replay-fixtures.js --merge=tests\artifacts\difficulty-v3\MS03a\wire --check` | 0 | 0.4 s | 4 ledgers, all 4 keys exactly once; G09-G12 match; `replay-wire.js is up to date` (projection and byte-for-byte text compare) |
| `node tests\replay-goldens.js --merge=tests\artifacts\difficulty-v3\MS03a\analysis --check` | 0 | 0.4 s | 14 ledgers, all 14 keys exactly once; G01-G14 match; `replay-goldens.js is up to date` |

## Alternate writes (disposable, deleted afterwards)

| Command | Result |
|---|---|
| `node tests\replay-fixtures.js --merge=tests\artifacts\difficulty-v3\MS03a\wire --write --out=tests\artifacts\difficulty-v3\MS03a\wire-out\replay-wire.js` | exit 0; 20 lines; SHA-256 equal to the canonical file (138384528697218a5d7170a926ddb6bd9cfa14c4c1578d728affc477aadc9166) |
| `node tests\replay-goldens.js --merge=tests\artifacts\difficulty-v3\MS03a\analysis --write --out=tests\artifacts\difficulty-v3\MS03a\analysis-out\replay-goldens.js` | exit 0; 481 lines; the loaded data equals the canonical fixture (same JSON text); the file is CRLF without BOM; the text differs from the canonical file only by the new header and re-wrapped long `details` and `alive` lists (27638 against 27077 bytes) |

## Fields excluded from the comparison

- Timings (`ms`) and `checks` counts are diagnostic only. The wire ledger keeps `ms` outside `value`, and the
  analysis projection omits both.
- `today` is copied from the saved fixture as a historical annotation, not regenerated.
- The fold fields `removed`, `restored` and `signs` are projected but are not asserted by any current test;
  the renderer header says so.
- The analysis check compares data only. A text compare is not used because the canonical hand-formatted file has
  a different header and wrapping.

## Handoff commands for later output-changing tasks

```powershell
node tests\replay-fixtures.js --ids=G09 --record=tests\artifacts\difficulty-v3\<task>\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=tests\artifacts\difficulty-v3\<task>\analysis\G01.json
node tests\replay-fixtures.js --merge=tests\artifacts\difficulty-v3\<task>\wire --check
node tests\replay-goldens.js --merge=tests\artifacts\difficulty-v3\<task>\analysis --check
```

Record every ID alone, merge, then use `--merge=<dir> --write` only after the deliberate comparison. A write needs the
complete key set from one source hash; a partial or stale set is refused and nothing is written.
