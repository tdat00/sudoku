'use strict';

/*
 * MS06c1: characterisation of the guided dig before and after the typed objectives. It loads the engine sources of
 * tests/node-runner.js, digs a fixed list of cases with `SG.digger.digStage` and prints, per case, a digest of what
 * the pass decided: the givens, the statistics (the oracle calls included), the dig log (every keep with its numeric
 * score or null, every reject with its reason) and the dig.* events (the same numbers). The digests of the
 * `digger-target` suite were captured with this script on the tree of HEAD 1d657b1, before the first edit of
 * `digger.js`. Run it through the shared-machine lock (generation):
 *
 *   node tests/artifacts/difficulty-v3/MS06c1/characterize.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function loadSources() {
  const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  }
  return globalThis.SG;
}

const SG = loadSources();

// The same two-offset FNV-1a as tests/fixtures/perf-helper.js (a browser has no crypto in a classic script).
const OFFSETS = [0x811c9dc5, 0x2545f491];
function hash64(text) {
  let out = '';
  for (const offset of OFFSETS) {
    let h = offset >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    out += ('00000000' + h.toString(16)).slice(-8);
  }
  return out;
}

const CASES = [
  { variant: 'classic4', level: 'veryEasy', seed: 4 },
  { variant: 'classic6', level: 'hard', seed: 4 },
  { variant: 'diagonalX', level: 'hard', seed: 4 }
];
['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master'].forEach((level) => {
  [4, 9, 14].forEach((seed) => CASES.push({ variant: 'classic9', level: level, seed: seed }));
});
[['normal', 4], ['expert', 9], ['nightmare', 4], ['master', 7], ['master', 16], ['hell1', 11], ['hell1', 13],
  ['hell1', 30]].forEach((pair) => CASES.push({ variant: 'classic9', level: pair[0], seed: pair[1], proposal: true }));
CASES.forEach((c) => { c.id = c.variant + ' ' + c.level + ' ' + c.seed + (c.proposal ? ' proposal' : ''); });

function run(c) {
  const model = SG.variants.get(c.variant).build({}, null);
  const rng = SG.rng.create(c.seed);
  const solution = SG.fullGrid.generate(model, rng.fork('grid'), null);
  const log = [];
  const events = [];
  const emit = SG.events.createEmitter('full', function (e) {
    if (typeof e.i18nKey === 'string' && e.i18nKey.indexOf('dig.') === 0) events.push([e.i18nKey, e.i18nArgs]);
  });
  const started = process.hrtime.bigint();
  const dug = SG.digger.digStage(model, solution, c.level, rng.fork('dig'),
    { log: log, emit: emit, proposal: c.proposal === true });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  const text = JSON.stringify({ givens: Array.from(dug.givens), clues: dug.clues, stats: dug.stats, log: log, events: events });
  const keeps = log.filter((e) => e.op === 'keep').length;
  const stuck = log.filter((e) => e.op === 'keep' && e.score === null).length;
  const reasons = {};
  log.filter((e) => e.op === 'reject').forEach((e) => { reasons[e.reason] = (reasons[e.reason] || 0) + 1; });
  const rejects = JSON.stringify(reasons);
  return { id: c.id, digest: hash64(text), clues: dug.clues, oracleCalls: dug.stats.oracleCalls, keeps: keeps + ' (' + stuck + ' stuck)',
    rejects: rejects, events: events.length, ms: Math.round(ms) };
}

module.exports = { run: run, CASES: CASES };

if (require.main === module) {
  CASES.map(run).forEach((r) => console.log([r.id, r.digest, r.clues, r.oracleCalls, r.keeps, r.rejects, r.events,
    r.ms + ' ms'].join(' | ')));
}
