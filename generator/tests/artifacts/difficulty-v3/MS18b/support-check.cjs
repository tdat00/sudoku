'use strict';

/*
 * MS18b task-owned, read-only: loads the sources the way tests/soak.js does (the SOURCE_FILES of
 * tests/node-runner.js, in load order) and prints what the two fixed experiments need to know before any
 * request: which of the nine cells are offered at this source (a hidden one would need
 * `--include-unsupported`), the rating version, the shallow allowance in force (R5's 256), the short-chain
 * cutoff C in force (R9's 4) and the default attempts of an 81-cell board (8), and whether `soak.js` still
 * documents `--shallow-cap` and `--chain-window` with the settings of the experiments. It builds no model
 * and generates nothing.
 *   node generator/tests/artifacts/difficulty-v3/MS18b/support-check.cjs [out file]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const MANIFEST = {
  classic9: ['normal', 'master', 'nightmare'],
  killer: ['hard', 'expert'],
  jigsaw9: ['expert', 'nightmare'],
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
const problems = [];
lines.push('SOURCE_FILES loaded: ' + loaded + ' of ' + files.length + ' listed');
const state = {
  ratingVersion: SG.difficulty.RATING_VERSION, allowance: SG.digger.SHALLOW_SEARCH_RATINGS,
  shortMax: SG.chainSearch.SHORT_MAX, attempts81: SG.digger.defaultMaxAttempts(81)
};
lines.push('rating version ' + state.ratingVersion + ', shallow allowance ' + state.allowance +
  ', short-chain cutoff C ' + state.shortMax + ', default attempts of an 81-cell board ' + state.attempts81 +
  ', of 82-144 cells ' + SG.digger.defaultMaxAttempts(144) + ', above 144 ' +
  SG.digger.defaultMaxAttempts(145));
if (state.ratingVersion !== 3) problems.push('rating version is not 3');
if (state.allowance !== 256) problems.push('the shallow allowance in force is not 256');
if (state.shortMax !== 4) problems.push('the short-chain cutoff in force is not 4');
if (state.attempts81 !== 8) problems.push('the default attempts of an 81-cell board is not 8');
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
lines.push('experiment cells not offered at this source: ' + hidden + (hidden === 0 ?
  ' (no `--include-unsupported` is needed)' : ' (these cells need `--include-unsupported`)'));
if (hidden > 0) problems.push(hidden + ' experiment cell(s) are not offered');
const soak = fs.readFileSync(path.join(GEN, 'tests/soak.js'), 'utf8');
const SHALLOW = "const SHALLOW_CAPS = ['64', '128', '256', 'none'];";
const WINDOWS = "const CHAIN_WINDOWS = ['4', '6'];";
lines.push('soak.js settings: --shallow-cap ' +
  (soak.indexOf(SHALLOW) !== -1 ? '64 128 256 none' : 'CHANGED') +
  '; --chain-window ' + (soak.indexOf(WINDOWS) !== -1 ? '4 6' : 'CHANGED'));
if (soak.indexOf(SHALLOW) === -1) problems.push('the --shallow-cap settings of soak.js changed');
if (soak.indexOf(WINDOWS) === -1) problems.push('the --chain-window settings of soak.js changed');
lines.push(problems.length === 0 ? 'RESULT: the defaults in force are 256 / C 4 / attempts 8 and every ' +
  'experiment cell is offered' : 'RESULT: PROBLEMS: ' + problems.join('; '));
lines.forEach((line) => console.log(line));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
process.exitCode = problems.length === 0 ? 0 : 1;
