#!/usr/bin/env node
'use strict';

/*
 * MS07e GQ summary (reads only): joins the per-cell shards of qualification/, the projections and the run log into
 * gq-summary.json and gq-summary.md (one row per cell of the 135, executed or not), and the observed offers against the
 * current ones. It runs and validates nothing itself (the merger does the validation; see merge-attempt.txt).
 *
 *   node summarize-gq.cjs
 */
const fs = require('fs');
const path = require('path');

const EVIDENCE = 'Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e';
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
const VARIANTS = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper', 'jigsaw9', 'killer',
  'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'];
const CURRENT = {
  classic4: ['veryEasy'], classic6: ['veryEasy', 'hard'],
  classic9: LEVELS.slice(0, 8), wordoku: LEVELS.slice(0, 8)
};
VARIANTS.forEach((v) => { if (!CURRENT[v]) CURRENT[v] = LEVELS.slice(); });
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const fmt = (ms) => (ms >= 10000 ? (ms / 1000).toFixed(1) + ' s' : ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms.toFixed(0) + ' ms');

const projections = read(path.join(EVIDENCE, 'projections', 'gq-projections.json'));
const runs = fs.readFileSync(path.join(EVIDENCE, 'run-log.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const gqRuns = {};
runs.filter((r) => r.phase === 'gq' && r.state === 'ran').forEach((r) => { (gqRuns[r.id] = gqRuns[r.id] || []).push(r); });
const dir = path.join(EVIDENCE, 'qualification');
const shards = {};
fs.readdirSync(dir).filter((f) => /\.json$/.test(f)).forEach((f) => { shards[f] = read(path.join(dir, f)); });

const rows = [];
let identity = null;
VARIANTS.forEach((v) => LEVELS.forEach((l) => {
  const id = v + '-' + l;
  const shard = shards[id + '.json'];
  const proj = projections.find((p) => p.variant === v && p.level === l);
  const row = { variant: v, level: l, cell: v + '/' + l, currentOffer: CURRENT[v].indexOf(l) !== -1,
    projectionSeconds: proj ? Math.round(proj.projection * 10) / 10 : null, m: proj ? proj.m : null, e: proj ? proj.e : null };
  const rs = gqRuns['gq-' + id] || [];
  const last = rs[rs.length - 1];
  row.runs = rs.map((r) => ({ outcome: r.outcome, exit: r.exit, nodeSeconds: r.nodeSeconds, totalSeconds: r.totalSeconds,
    lockWaitSeconds: r.lockWaitSeconds, started: r.started, ended: r.ended }));
  if (shard) {
    const c = shard.cells[0];
    const s = c.summary;
    row.status = 'executed';
    row.n = s.n; row.hits = s.hits; row.rate = s.rate; row.p50 = s.p50; row.p95 = s.p95; row.max = s.max;
    row.budget = c.budget; row.verdict = s.verdict; row.stopped = s.stopped; row.errors = s.errors;
    row.approximate = s.approximate; row.invalid = s.invalid; row.attempts = c.attempts; row.cellCount = c.cellCount;
    row.round2 = c.requests.some((r) => r.index >= 40);
    row.nodeSeconds = last ? last.nodeSeconds : null;
    row.shardSeconds = shard.seconds;
    row.exactHits = c.requests.filter((r) => r.exact === true).length;
    row.shallowInBand = c.requests.filter((r) => r.achieved === l && r.exact !== true).length;
    identity = identity || { sources: shard.engine.sources, qualifierHash: shard.qualifierHash, node: shard.machine.node,
      cpu: shard.machine.cpu, jobs: shard.machine.jobs };
  } else if (last && last.outcome === 'timeout') {
    row.status = 'incomplete: stopped at the 540 s ceiling';
  } else if (last) {
    row.status = 'attempt failed: ' + last.outcome;
  } else {
    row.status = 'unexecuted';
    row.reason = proj && proj.reason ? proj.reason : 'not run';
  }
  rows.push(row);
}));

const offered = {};
VARIANTS.forEach((v) => { offered[v] = rows.filter((r) => r.variant === v && r.verdict === 'offered').map((r) => r.level); });
const diff = [];
VARIANTS.forEach((v) => LEVELS.forEach((l) => {
  const r = rows.find((x) => x.variant === v && x.level === l);
  const cur = CURRENT[v].indexOf(l) !== -1;
  if (r.status === 'executed') {
    const obs = r.verdict === 'offered';
    if (obs !== cur) diff.push(r.cell + ': observed ' + (obs ? 'offered' : 'hidden') + ', current ' + (cur ? 'offered' : 'hidden'));
  } else {
    diff.push(r.cell + ': no verdict (' + r.status + '), current ' + (cur ? 'offered' : 'hidden'));
  }
}));
const summary = { schema: 1, task: 'MS07e', identity: identity,
  counts: { cells: rows.length, executed: rows.filter((r) => r.status === 'executed').length,
    unexecuted: rows.filter((r) => r.status === 'unexecuted').length,
    incomplete: rows.filter((r) => /^incomplete|^attempt/.test(r.status)).length,
    offered: rows.filter((r) => r.verdict === 'offered').length, hidden: rows.filter((r) => r.verdict === 'hidden').length },
  observedOffersExecutedCells: offered, offersDiffer: diff, rows: rows };
fs.writeFileSync(path.join(EVIDENCE, 'gq-summary.json'), JSON.stringify(summary, null, 2).replace(/\n/g, '\r\n') + '\r\n');
const md = ['| cell | status | n | hits | rate | p50 | p95 | budget | verdict | exact hits | in band, shallow | round 2 | projected s | node s | current offer |',
  '|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---|---:|---:|---|'];
rows.forEach((r) => {
  if (r.status === 'executed') {
    md.push('| ' + r.cell + ' | executed | ' + r.n + ' | ' + r.hits + ' | ' + (100 * r.rate).toFixed(0) + ' % | ' + fmt(r.p50) + ' | ' +
      fmt(r.p95) + ' | ' + fmt(r.budget) + ' | ' + r.verdict + (r.stopped ? ' (stopped: ' + r.stopped + ')' : '') + ' | ' +
      r.exactHits + ' | ' + r.shallowInBand + ' | ' + (r.round2 ? 'yes' : 'no') + ' | ' + r.projectionSeconds + ' | ' +
      r.nodeSeconds + ' | ' + (r.currentOffer ? 'offered' : 'hidden') + ' |');
  } else {
    md.push('| ' + r.cell + ' | ' + r.status + ' | | | | | | | | | | | ' + r.projectionSeconds + ' | | ' + (r.currentOffer ? 'offered' : 'hidden') + ' |');
  }
});
fs.writeFileSync(path.join(EVIDENCE, 'gq-summary.md'), md.join('\r\n') + '\r\n');
console.log(JSON.stringify(summary.counts));
