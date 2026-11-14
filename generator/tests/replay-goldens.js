#!/usr/bin/env node
'use strict';

/*
 * Recorder and checker of the Generation Steps golden data, tests/fixtures/replay-goldens.js: the 14 golden
 * requests (G01-G14, read from SG.fixtures.replayGoldens) are generated again with the route of the wire
 * recorder (SG.store.toConfig, SG.pipeline.run, a 120,000 ms budget), analysed with SG.replay.analyse, and
 * projected to the golden record (SG.fixtures.replayRecording.goldenOf). The wire data of G09-G13 is the
 * business of tests/replay-fixtures.js.
 *
 *   node tests/replay-goldens.js                 the same as --check (this tool never writes by accident)
 *   node tests/replay-goldens.js --check         generate and compare, no writes; exit 1, the ID and fields
 *   node tests/replay-goldens.js --ids=G01 --record=<file.json>    one bounded shard, into a ledger only
 *   node tests/replay-goldens.js --merge=<directory> --check       the complete ledgers, no generation
 *   node tests/replay-goldens.js --merge=<directory> --write       render the canonical fixture from them
 *   node tests/replay-goldens.js --write [--out=<file.js>]         generate all 14 and write the fixture
 *   node tests/replay-goldens.js --list            show the manifest and the identity of the sources
 *
 * --help describes every mode. Timings and the work counts `checks` are not part of a record. Refresh the
 * file only when the generator's output changes on purpose, together with the other expectations of the
 * same change (tests/suites/steps.test.js pins a few step scores by hand).
 */
const { nodeEnv, loadFixtures, RECORDER_FILES, BUDGET_MS } = require('./replay-fixtures.js');

function goldenSpec(SG) {
  const RR = SG.fixtures.replayRecording;
  const goldens = SG.fixtures.replayGoldens;
  const find = (id) => goldens.filter((g) => g.id === id)[0];
  return {
    tool: 'tests/replay-goldens.js',
    kind: 'replay-goldens',
    fixture: 'tests/fixtures/replay-goldens.js',
    defaultMode: 'check',
    compareText: false,
    manifest: goldens.map((g) => ({ key: g.id, request: g.request })),
    extraFiles: RECORDER_FILES,
    describe: (entry) => entry.request.variantId + ' ' + entry.request.difficulty + ' ' + entry.request.seed,
    saved: (key) => find(key),
    generate: (entry) => {
      const req = entry.request;
      const run = SG.fixtures.toolRecords.withRequestedLevel(req.variantId, req.difficulty, () => {
        const config = SG.store.toConfig(req);
        return SG.pipeline.run(config, null, SG.budget.create({ ms: BUDGET_MS }));
      });
      const analysis = SG.replay.analyse(run.value);
      const golden = RR.goldenOf({ id: entry.key, request: req, today: find(entry.key).today }, analysis,
        run.value.model);
      return {
        value: JSON.parse(JSON.stringify(golden)),
        overrides: run.overridden ? [req.variantId + ':' + req.difficulty] : []
      };
    },
    render: RR.renderGoldens
  };
}

function main(argv) {
  const SG = loadFixtures(['tests/fixtures/tool-records.js', 'tests/fixtures/replay-recording.js',
    'tests/fixtures/replay-goldens.js']);
  return SG.fixtures.replayRecording.runCli(nodeEnv(), goldenSpec(SG), argv);
}

process.exitCode = main(process.argv.slice(2));
