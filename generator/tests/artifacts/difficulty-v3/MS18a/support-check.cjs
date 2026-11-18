'use strict';

/*
 * MS18a task-owned, read-only: loads the sources the way tests/soak.js does (the SOURCE_FILES of
 * tests/node-runner.js, in load order) and prints what the fixed GS manifest needs to know before any
 * request:
 * which of the 17 cells are offered at this source (a hidden one would need `--include-unsupported`), the
 * rating version, the shallow allowance, the short-chain cutoff C and the default attempts of an 81-cell
 * board. It builds no model and generates nothing.
 *   node generator/tests/artifacts/difficulty-v3/MS18a/support-check.cjs [out file]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const MANIFEST = {
  classic9: ['normal', 'hard', 'expert', 'master', 'nightmare', 'hell1'],
  killer: ['normal', 'hard', 'expert'],
  jigsaw9: ['normal', 'hard', 'expert', 'nightmare'],
  greaterThan: ['normal', 'hard', 'expert'],
  diagonalX: ['nightmare']
};

const runner = fs.readFileSync(path.join(GEN, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g) || [])
  .map((s) => s.slice(1, -1));
let loaded = 0;
files.forEach((rel) => {
  const abs = path.join(GEN, rel);
  if (!fs.existsSync(abs)) return;
  vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  loaded++;
});
const SG = globalThis.SG;

const lines = [];
lines.push('SOURCE_FILES loaded: ' + loaded + ' of ' + files.length + ' listed');
lines.push('rating version ' + SG.difficulty.RATING_VERSION + ', shallow allowance ' +
  SG.digger.SHALLOW_SEARCH_RATINGS + ', short-chain cutoff C ' + SG.chainSearch.SHORT_MAX +
  ', default attempts of an 81-cell board ' + SG.digger.defaultMaxAttempts(81) +
  ', of 82-144 cells ' + SG.digger.defaultMaxAttempts(144) + ', above 144 ' +
  SG.digger.defaultMaxAttempts(145));
let hidden = 0;
Object.keys(MANIFEST).forEach((id) => {
  const def = SG.variants.list().find((candidate) => candidate.id === id);
  if (!def) {
    lines.push(id + ': NOT REGISTERED');
    hidden += MANIFEST[id].length;
    return;
  }
  const offered = MANIFEST[id].map((level) => {
    const yes = def.difficultySupport.indexOf(level) !== -1;
    if (!yes) hidden++;
    return level + (yes ? ' offered' : ' HIDDEN');
  });
  lines.push(id + ': ' + offered.join(', ') + '  (difficultySupport: ' +
    def.difficultySupport.join(' ') + ')');
});
lines.push('manifest levels not offered at this source: ' + hidden + (hidden === 0 ?
  ' (no `--include-unsupported` is needed)' : ' (these cells need `--include-unsupported`)'));
lines.forEach((line) => console.log(line));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
