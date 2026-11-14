'use strict';

/*
 * MS05e: writes the shard plans of the E recipe (hashes, wires, analyses) for the final source, with a finite projection
 * for every item (IR12), into docs/difficulty-v3/evidence/MS05e/e/. Reads MS05r6a's plan of the 104 hash shards (the
 * fixed 26 combinations x 4 five-seed shards) and its measured seconds; runs nothing.
 *
 *   node tests/artifacts/difficulty-v3/MS05e/make-e-plans.cjs
 *
 * Projection of an item = the larger of 3 x the seconds MS05r6a measured for the same command (locked, same code except
 * greater-than.js for the items that do not generate Greater-Than puzzles) and 20 s; for the items that generate
 * Greater-Than puzzles it is the stated bound below (this task's own cohort times with the chosen pool, per request, for
 * the number of requests of the item), because MS05r6a's times belong to the unguided pass.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const OLD = 'docs/difficulty-v3/evidence/MS05r6a';
const OUT = 'docs/difficulty-v3/evidence/MS05e';
const GT_HASH_BOUND = { normal: 150, hard: 100 };
const GT_WIRE = { G11: 120, G12: 60 };

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
}

function lines(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l));
}

const measured = {};
lines(OLD + '/shard-runs.jsonl').forEach((r) => { measured[r.label] = r.nodeSeconds; });
lines(OLD + '/runs.jsonl').forEach((r) => { if (r.nodeSeconds !== null) measured[r.label] = r.nodeSeconds; });

function swap(arg) {
  return arg.replace('MS05r6a', 'MS05e');
}

function projection(oldLabel, gtBound) {
  if (gtBound !== undefined) {
    return { projectionSeconds: gtBound, projectionBasis: 'STATED BOUND ' + gtBound + ' s: the item generates ' +
      'Greater-Than puzzles with the chosen pool 4; the slowest single request of this task\'s pool-4 cohorts was ' +
      '22.8 s (expert), 18.3 s (normal) and 6.9 s (hard), five requests per hash shard' +
      ' (docs/difficulty-v3/evidence/MS05e/comparison.md)' };
  }
  const m = measured[oldLabel];
  if (m === undefined) throw new Error('no measurement for ' + oldLabel);
  const own = Math.max(Math.round(3 * m), 20);
  return { projectionSeconds: own, projectionBasis: 'MEASURED ' + m + ' s by MS05r6a (' + oldLabel + ', locked, same ' +
    'code: this item generates no Greater-Than puzzle), stated bound 3 times, at least 20 s' };
}

function write(rel, data) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(data, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  console.log('written ' + rel + ' (' + data.length + ' items)');
}

const hashes = readJson('generator/tests/artifacts/difficulty-v3/MS05r6a/plan-hashes.json').map((item) => {
  const gt = /greaterThan\/(normal|hard)/.exec(item.args[1]);
  return Object.assign({ label: item.label.replace(/^b3-/, 'e-'), args: item.args.map(swap) },
    projection(item.label, gt ? GT_HASH_BOUND[gt[1]] : undefined));
});
write(OUT + '/e/plan-hashes.json', hashes);

const wires = ['G09', 'G10', 'G11', 'G12', 'G13'].map((id) => Object.assign({
  label: 'e-wire-' + id,
  args: ['tests\\replay-fixtures.js', '--ids=' + id, '--record=..\\' + OUT.replace(/\//g, '\\') + '\\wire\\' + id + '.json']
}, projection('b1-wire-' + id, GT_WIRE[id])));
write(OUT + '/e/plan-wire.json', wires);

const analyses = [];
for (let i = 1; i <= 14; i++) {
  const id = 'G' + String(i).padStart(2, '0');
  const old = 'b2-analysis-' + id;
  analyses.push(Object.assign({
    label: 'e-analysis-' + id,
    args: ['tests\\replay-goldens.js', '--ids=' + id, '--record=..\\' + OUT.replace(/\//g, '\\') + '\\analysis\\' + id + '.json']
  }, projection(measured[old] === undefined ? 'b2-compound-analysis-G07-G14' : old)));
}
write(OUT + '/e/plan-analysis.json', analyses);
