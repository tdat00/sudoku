'use strict';

/*
 * MS18a task-owned, read-only: the identities of the tree now. File-only, no generation.
 *   node generator/tests/artifacts/difficulty-v3/MS18a/identity-check.cjs [out file]
 * It prints (and, with an out file, writes as UTF-8 with CRLF and a final newline):
 *   - the Generator and Player quick-set fingerprints, computed with the inputs of the two runners (copied
 *     from generator/tests/node-runner.js and player/tests/node-runner.js, as MS17b's fingerprint-now.js);
 *   - the two E identities of MS17b (the replay identity with the recorder files, the hash identity),
 *     computed as the recorders do;
 *   - the soak's own `sourceHash` and `toolHash`, computed as `loadSources` of tests/soak.js does (they are
 *     their own identities, neither an E identity nor a quick fingerprint).
 */
const childProcess = require('child_process');
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
const RECORDER_FILES = ['tests/fixtures/tool-records.js', 'tests/fixtures/replay-recording.js',
  'tests/replay-fixtures.js', 'tests/replay-goldens.js'];
const HASH_CODE_FILES = ['tests/fixtures/perf-helper.js', 'tests/fixtures/tool-records.js', 'tests/perf.js'];
const SOAK_HELPERS = ['tests/fixtures/perf-helper.js', 'tests/fixtures/difficulty-diagnostics.js'];

const read = (rel) => fs.readFileSync(path.join(GEN, rel), 'utf8').replace(/^\uFEFF/, '');
const lf = (text) => text.replace(/\r\n/g, '\n');
const runnerText = read('tests/node-runner.js');
const sources = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runnerText)[1].match(/'[^']+'/g))
  .map((s) => s.slice(1, -1));
const existing = sources.filter((rel) => fs.existsSync(path.join(GEN, rel)));

const BASE = '57c1b10';
function git(args) {
  const run = childProcess.spawnSync('git', args, { cwd: REPO, encoding: 'utf8', windowsHide: true });
  return { status: run.status, out: (run.stdout || '').trim() };
}

const lines = [];
lines.push('HEAD ' + git(['rev-parse', 'HEAD']).out);
lines.push('git status --porcelain: ' + git(['status', '--porcelain', '--untracked-files=all']).out
  .split(/\r?\n/).filter(Boolean).length + ' entries');
lines.push('git diff --stat ' + BASE + ' HEAD, last line: ' +
  git(['diff', '--stat', BASE, 'HEAD']).out.split(/\r?\n/).pop());
lines.push('git diff --quiet ' + BASE + ' HEAD outside tasks/: exit ' +
  git(['diff', '--quiet', BASE, 'HEAD', '--', '.', ':(exclude)tasks']).status);
Object.keys(inputs).forEach((app) => {
  const evidence = evidenceTools.create({ app, repoRoot: REPO, inputs: inputs[app] });
  lines.push(app + ' quick-set fingerprint ' + evidence.fingerprint().sourceHash);
});

const replay = crypto.createHash('sha256');
existing.concat(RECORDER_FILES).forEach((rel) => replay.update(rel + '\0' + lf(read(rel))));
lines.push('replay identity (E wires and analyses) ' + replay.digest('hex'));
const hashes = crypto.createHash('sha256');
existing.filter((rel) => !/^js\/(ui|worker)\//.test(rel)).concat(HASH_CODE_FILES)
  .forEach((rel) => hashes.update(rel + '\0' + lf(read(rel))));
lines.push('hash identity (E hashes) ' + hashes.digest('hex'));

const soak = crypto.createHash('sha256');
existing.forEach((rel) => soak.update(rel + '\0' + lf(read(rel))));
lines.push('soak sourceHash (' + existing.length + ' SOURCE_FILES) ' + soak.digest('hex'));
const tool = crypto.createHash('sha256');
['tests/soak.js'].concat(SOAK_HELPERS).forEach((rel) => {
  if (fs.existsSync(path.join(GEN, rel))) tool.update(rel + '\0' + lf(read(rel)));
});
lines.push('soak toolHash (soak.js and its two helpers) ' + tool.digest('hex'));

lines.forEach((line) => console.log(line));
if (process.argv[2]) {
  fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
}
