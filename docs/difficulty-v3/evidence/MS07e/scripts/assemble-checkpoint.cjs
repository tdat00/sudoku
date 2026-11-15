#!/usr/bin/env node
'use strict';

/*
 * MS07e checkpoint assembler (reads only; execution record, not the merger). The merger (`tests/qualify.js --merge`) refuses a
 * folder that lacks a cell of the 135, and writes nothing then. When the checkpoint is incomplete this script writes the
 * checkpoint-only record `docs/difficulty-v3/qualification-checkpoint-<date>.json` from the shards that exist, labelled
 * `complete: false, merged: false`: every executed cell's summary is copied verbatim from its shard (nothing is recomputed or
 * invented), the shard's SHA-256 identifies the file the requests are in, and every cell that has no shard says why
 * (unexecuted with its projection, stopped at the ceiling, or an attempt that failed). The merger's rejection of the same folder
 * (evidence/MS07e/merge-attempt.txt) is the proof that the shards are otherwise valid.
 *
 *   node assemble-checkpoint.cjs <YYYY-MM-DD>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = 'Q:\\git\\sudoku';
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS07e');
const date = process.argv[2];
if (!/^\d{4}-\d\d-\d\d$/.test(date || '')) {
  console.error('usage: node assemble-checkpoint.cjs <YYYY-MM-DD>');
  process.exit(2);
}
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const summary = read(path.join(EVIDENCE, 'gq-summary.json'));
const dir = path.join(EVIDENCE, 'qualification');
const shardFiles = fs.readdirSync(dir).filter((f) => /\.json$/.test(f)).sort();
const shards = shardFiles.map((f) => {
  const bytes = fs.readFileSync(path.join(dir, f));
  const s = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  return { file: 'docs/difficulty-v3/evidence/MS07e/qualification/' + f, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    started: s.started, finished: s.finished, seconds: s.seconds, engine: s.engine, cells: s.cells.map((c) => c.variant + '/' + c.level) };
});
const first = read(path.join(dir, shardFiles[0]));
const projections = read(path.join(EVIDENCE, 'projections', 'gq-projections.json'));
const cells = summary.rows.map((r) => {
  const out = { variant: r.variant, level: r.level, status: r.status, currentOffer: r.currentOffer };
  if (r.status === 'executed') {
    const shard = read(path.join(dir, r.variant + '-' + r.level + '.json'));
    const c = shard.cells[0];
    out.cellCount = c.cellCount; out.budget = c.budget; out.attempts = c.attempts; out.summary = c.summary;
    out.shard = 'docs/difficulty-v3/evidence/MS07e/qualification/' + r.variant + '-' + r.level + '.json';
    out.secondRound = r.round2;
  } else {
    const p = projections.find((x) => x.variant === r.variant && x.level === r.level);
    out.attemptsConfigured = p ? p.attempts : null;
    out.projectionSeconds = r.projectionSeconds;
    out.projection = p ? { meanRequestSeconds: p.m, margin: p.f, expansionPossible: p.e === 1, basis: p.basis,
      pooledEarlierHits: p.pooled.h + '/' + p.pooled.n, pilot: p.pilot } : null;
    out.reason = r.reason || p && p.reason || null;
    out.runs = r.runs;
  }
  return out;
});
const record = {
  schema: 1, kind: 'difficulty-v3-qualification-checkpoint', task: 'MS07e', date: date, complete: false, merged: false,
  note: 'Checkpoint-only record of the first qualification (R24): no offer is published and the live table is untouched. It is not a ' +
    'merged record (the merger refuses a folder with a missing cell) and is not a complete-checkpoint claim: the cells without ' +
    'a shard are named, with their projection and reason, and carry no verdict.',
  mergeAttempt: 'docs/difficulty-v3/evidence/MS07e/merge-attempt.txt',
  identity: { protocol: first.protocol, seedBase: first.seedBase, machine: first.machine, engineSources: first.engine.sources,
    qualifierHash: first.qualifierHash, ratingVersion: first.ratingVersion, acceptance: first.acceptance, guardMs: first.guardMs,
    earlyStop: first.earlyStop, probe: first.probe, attemptPolicy: first.attemptPolicy },
  matrix: { variants: summary.rows.map((r) => r.variant).filter((v, i, a) => a.indexOf(v) === i),
    levels: summary.rows.map((r) => r.level).filter((v, i, a) => a.indexOf(v) === i), cells: 135 },
  counts: summary.counts, shards: shards, cells: cells, observedOffersOfExecutedCells: summary.observedOffersExecutedCells,
  offersDiffer: summary.offersDiffer
};
const out = path.join(REPO, 'docs', 'difficulty-v3', 'qualification-checkpoint-' + date + '.json');
if (fs.existsSync(out)) {
  console.error(out + ' exists already');
  process.exit(2);
}
fs.writeFileSync(out, JSON.stringify(record, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log('written ' + out + ': ' + cells.length + ' cells, ' + shards.length + ' shards, executed ' + summary.counts.executed);
