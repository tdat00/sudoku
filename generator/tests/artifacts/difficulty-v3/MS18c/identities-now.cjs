'use strict';

/*
 * MS18c closure task-owned, FILE-ONLY (from MS17b's fingerprint-now.js and freeze-hashes.cjs, identities
 * only):
 * the source identities of the tree now, to compare with what a results file or a ledger recorded:
 *   node generator/tests/artifacts/difficulty-v3/MS18c/identities-now.cjs
 *  - the Generator and the Player quick fingerprints, computed with the inputs of the two runners (the
 *    `sourceHash` of a quick results file; the manual tier adds `generator/tests/manual` when a manual
 *    suite is selected, so it is printed apart);
 *  - the replay identity the wire and analysis ledgers write (replay-fixtures.js
 *    `identity(RECORDER_FILES)`: the existing SOURCE_FILES entries of generator/tests/node-runner.js plus
 *    the four recorder files);
 *  - the hash identity the 520 hash ledgers write (perf.js `hashIdentity`: the SOURCE_FILES entries that are
 *    not UI or worker files plus perf-helper.js, tool-records.js and perf.js).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const evidenceTools = require('../../../../../core/tests/node-evidence.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const GEN = path.join(REPO, 'generator');
const COMMON = ['AGENTS.md', 'README.md', 'USERGUIDE.md', 'USERGUIDE.vn.md', 'DEVELOPERGUIDE.md',
  'DEVELOPERGUIDE.vn.md', 'core/tests/harness.js', 'core/tests/node-evidence.js'];
const inputs = {
  generator: {
    files: COMMON.concat(['generator/design.md', 'generator/index.html', 'generator/tests.html']),
    trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'generator/js',
      'generator/css', 'generator/assets', 'generator/tests/fixtures', 'generator/tests/suites',
      { dir: 'generator/tests', recursive: false }],
    manualTrees: ['generator/tests/manual']
  },
  player: {
    files: COMMON.concat(['player/design.md', 'player/help.html', 'player/index.html', 'player/tests.html']),
    trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'player/js',
      'player/css', 'player/assets', 'player/tests/fixtures', 'player/tests/suites', 'player/tests/tools',
      { dir: 'player/tests', recursive: false }]
  }
};
Object.keys(inputs).forEach((app) => {
  const evidence = evidenceTools.create({ app, repoRoot: REPO, inputs: inputs[app] });
  console.log(app + ' quick fingerprint ' + evidence.fingerprint().sourceHash);
});
const manual = evidenceTools.create({ app: 'generator', repoRoot: REPO, inputs: inputs.generator });
if (typeof manual.fingerprint({ manual: true }) === 'object') {
  console.log('generator with the manual trees ' + manual.fingerprint({ manual: true }).sourceHash);
}

const RECORDER_FILES = ['tests/fixtures/tool-records.js', 'tests/fixtures/replay-recording.js',
  'tests/replay-fixtures.js', 'tests/replay-goldens.js'];
const HASH_CODE_FILES = ['tests/fixtures/perf-helper.js', 'tests/fixtures/tool-records.js', 'tests/perf.js'];
const read = (rel) => fs.readFileSync(path.join(GEN, rel), 'utf8').replace(/^\uFEFF/, '');
const runner = read('tests/node-runner.js');
const sources = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g))
  .map((s) => s.slice(1, -1));
const existing = sources.filter((rel) => fs.existsSync(path.join(GEN, rel)));
const identity = (files) => {
  const h = crypto.createHash('sha256');
  files.forEach((rel) => h.update(rel + '\0' + read(rel).replace(/\r\n/g, '\n')));
  return h.digest('hex');
};
console.log('replay identity (wire and analysis ledgers) ' + identity(existing.concat(RECORDER_FILES)));
console.log('hash identity (hash ledgers) ' +
  identity(existing.filter((rel) => !/^js\/(ui|worker)\//.test(rel))
    .concat(HASH_CODE_FILES)));
