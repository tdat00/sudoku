#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase A, task-owned and READ-ONLY: the reconciliation of MS18c-GQ-ENGINE-COST. It reads the recorded
 * requests of two qualification runs and writes one JSON file (UTF-8, CRLF); it generates nothing, times
 * nothing and adjusts nothing.
 *
 *   node tests/artifacts/difficulty-v3/MS18d/cost-compare.js --old=<MS07e checkpoint json> --new=<final
 *        qualification json> --json=<file>
 *
 *  - old: the MS07e checkpoint (rating v2, one shard file per executed cell, each verified against the
 *    SHA-256 the checkpoint lists); new: the merged final qualification (rating v3). Both identities are
 *    recorded.
 *  - A pair is the same cell, request index and seed in both runs. The ratio of a pair is new ms / old ms.
 *    Four pair-selection rules are reported side by side and never merged:
 *      strict        every recorded request field except ms equal (score included), old ms > 0: the check of
 *                    the MS18c leaf (2,122 pairs, median 1.1240 there);
 *      outcomeScore  the same hit, achieved level and score;
 *      outcome       the same hit and achieved level;
 *      seed          the same cell, index and seed only.
 *    The leaf quotes SA1's ratios (about 1.13 overall; 6.6, 5.1, 4.3, 2.7, 2.1 for five cells) without the
 *    exact filter: no rule here is claimed to be that filter, the numbers are printed next to the quoted
 *    ones.
 *  - The median of an even number of ratios is the mean of the two middle ones.
 * Exit code 0 when the strict rule reproduces the leaf's totals, 1 when it does not, 2 for invalid input.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');

// The five cells of the leaf, in its order, with SA1's quoted ratio and SA2's pair count and median.
const COHORT_CELLS = [
  { key: 'mega16/expert', sa1: 6.6, sa2Pairs: 29, sa2Median: 6.553 },
  { key: 'jigsaw9/expert', sa1: 5.1, sa2Pairs: 15, sa2Median: 4.794 },
  { key: 'sohei/master', sa1: 4.3, sa2Pairs: 5, sa2Median: 4.316 },
  { key: 'mega12/expert', sa1: 2.7, sa2Pairs: 18, sa2Median: 2.6429 },
  { key: 'diagonalX/expert', sa1: 2.1, sa2Pairs: 8, sa2Median: 2.2272 }
];
const LEAF = { sa1Overall: 1.13, sa2Pairs: 2122, sa2Median: 1.124 };

class InputError extends Error {}

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const posix = (abs) => path.relative(REPO, abs).replace(/\\/g, '/');

/** The median of a list of numbers (the mean of the two middle ones for an even count), null when empty. */
function median(values) {
  if (values.length === 0) return null;
  const s = values.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** JSON with the keys sorted, for the comparison of two request records. */
function canon(value) {
  if (Array.isArray(value)) return '[' + value.map(canon).join(',') + ']';
  if (isObject(value)) {
    return '{' + Object.keys(value).sort()
      .map((k) => JSON.stringify(k) + ':' + canon(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

const withoutMs = (request) => {
  const copy = Object.assign({}, request);
  delete copy.ms;
  return copy;
};

const RULES = {
  strict: (o, n) => canon(withoutMs(o)) === canon(withoutMs(n)) && o.ms > 0,
  outcomeScore: (o, n) => o.ms > 0 && o.hit === n.hit && o.achieved === n.achieved && o.score === n.score,
  outcome: (o, n) => o.ms > 0 && o.hit === n.hit && o.achieved === n.achieved,
  seed: (o, n) => o.ms > 0
};

/** Requests of the cells by `key#index`, each with its cell key. */
function indexRequests(cells) {
  const map = new Map();
  cells.forEach((cell) => {
    (cell.requests || []).forEach((r) => {
      const id = cell.variant + '/' + cell.level + '#' + r.index;
      if (map.has(id)) throw new InputError(['duplicate request ' + id]);
      map.set(id, { cell: cell.variant + '/' + cell.level, request: r });
    });
  });
  return map;
}

/** The pairs (same cell, index and seed) of two lists of cells that a rule accepts, in id order. */
function pairs(oldCells, newCells, rule) {
  const oldMap = indexRequests(oldCells);
  const newMap = indexRequests(newCells);
  const out = [];
  Array.from(oldMap.keys()).sort().forEach((id) => {
    const o = oldMap.get(id);
    const n = newMap.get(id);
    if (!n || n.request.seed !== o.request.seed) return;
    if (!Number.isFinite(o.request.ms) || !Number.isFinite(n.request.ms)) return;
    if (!rule(o.request, n.request)) return;
    out.push({ id: id, cell: o.cell, oldMs: o.request.ms, newMs: n.request.ms,
      ratio: n.request.ms / o.request.ms });
  });
  return out;
}

const r4 = (x) => (x === null ? null : Math.round(x * 1e4) / 1e4);

/** The report of one rule: pairs, median, the five named cohorts and a digest of the selected ids. */
function summarize(oldCells, newCells, rule) {
  const all = pairs(oldCells, newCells, rule);
  const cohorts = COHORT_CELLS.map((c) => {
    const mine = all.filter((p) => p.cell === c.key);
    return { key: c.key, pairs: mine.length, median: r4(median(mine.map((p) => p.ratio))),
      ids: mine.map((p) => p.id) };
  });
  return {
    pairs: all.length, median: r4(median(all.map((p) => p.ratio))),
    cells: new Set(all.map((p) => p.cell)).size,
    idDigest: sha256(all.map((p) => p.id).join('\n')), cohorts: cohorts
  };
}

/** The cells of the MS07e checkpoint: every shard file is read and verified against the listed SHA-256. */
function readOld(checkpointFile, repo) {
  const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8').replace(/^\uFEFF/, ''));
  if (!isObject(checkpoint) || !Array.isArray(checkpoint.shards) || !isObject(checkpoint.identity)) {
    throw new InputError(['the old checkpoint lists no shards and identity']);
  }
  const cells = [];
  const files = [];
  checkpoint.shards.forEach((s) => {
    const abs = path.join(repo, s.file);
    if (!fs.existsSync(abs)) throw new InputError(['missing shard ' + s.file]);
    const bytes = fs.readFileSync(abs);
    if (sha256(bytes) !== s.sha256) throw new InputError([s.file + ' does not match its listed SHA-256']);
    const shard = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    shard.cells.forEach((c) => cells.push(c));
    files.push({ file: s.file, sha256: s.sha256, engine: shard.engine });
  });
  return { checkpoint: checkpoint, cells: cells, shardFiles: files };
}

function compare(old, current) {
  const report = {};
  Object.keys(RULES).forEach((name) => { report[name] = summarize(old.cells, current.cells, RULES[name]); });
  return report;
}

/** True when the strict rule reproduces the totals and the five cohorts of the MS18c leaf. */
function matchesLeaf(strict) {
  return strict.pairs === LEAF.sa2Pairs && strict.median === LEAF.sa2Median &&
    strict.cohorts.every((c, i) => c.pairs === COHORT_CELLS[i].sa2Pairs &&
      c.median === COHORT_CELLS[i].sa2Median);
}

const crlf = (text) => text.replace(/\r?\n/g, '\r\n');

function main(argv, io) {
  const env = Object.assign({ out: console.log, err: console.error, cwd: process.cwd() }, io || {});
  try {
    const opts = { old: null, current: null, json: null };
    argv.forEach((arg) => {
      let m;
      if ((m = /^--old=(.+)$/.exec(arg))) opts.old = m[1];
      else if ((m = /^--new=(.+)$/.exec(arg))) opts.current = m[1];
      else if ((m = /^--json=(.+)$/.exec(arg))) opts.json = m[1];
      else throw new InputError(['unknown argument ' + arg]);
    });
    if (!opts.old || !opts.current || !opts.json) {
      throw new InputError(['Usage: node cost-compare.js --old=<file> --new=<file> --json=<file>']);
    }
    const oldFile = path.resolve(env.cwd, opts.old);
    const newFile = path.resolve(env.cwd, opts.current);
    const jsonFile = path.resolve(env.cwd, opts.json);
    const rel = path.relative(REPO, jsonFile);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new InputError(['--json must be a file inside the repository']);
    }
    [oldFile, newFile].forEach((f) => {
      if (!fs.existsSync(f)) throw new InputError(['missing ' + f]);
    });
    const old = readOld(oldFile, REPO);
    const newBytes = fs.readFileSync(newFile);
    const current = JSON.parse(newBytes.toString('utf8').replace(/^\uFEFF/, ''));
    if (!isObject(current) || !Array.isArray(current.cells) || !isObject(current.engine)) {
      throw new InputError(['the new qualification has no cells and engine']);
    }
    const report = compare(old, current);
    const reproduced = matchesLeaf(report.strict);
    const output = {
      schema: 1,
      kind: 'ms18d-gq-engine-cost',
      note: 'Read-only comparison of recorded requests; no timing, no normalisation, no attribution.',
      old: {
        file: posix(oldFile), sha256: sha256(fs.readFileSync(oldFile)), task: old.checkpoint.task,
        engineSources: old.checkpoint.identity.engineSources,
        ratingVersion: old.checkpoint.identity.ratingVersion,
        qualifierHash: old.checkpoint.identity.qualifierHash, machine: old.checkpoint.identity.machine,
        shards: old.shardFiles.length, cells: old.cells.length,
        shardEngines: Array.from(new Set(old.shardFiles.map((s) => JSON.stringify(s.engine)))).sort()
      },
      new: {
        file: posix(newFile), sha256: sha256(newBytes), engine: current.engine,
        ratingVersion: current.ratingVersion, qualifierHash: current.qualifierHash,
        machine: current.machine, cells: current.cells.length
      },
      leaf: {
        sa1: { overall: LEAF.sa1Overall, cells: COHORT_CELLS.map((c) => ({ key: c.key, ratio: c.sa1 })) },
        sa2: { pairs: LEAF.sa2Pairs, median: LEAF.sa2Median,
          cells: COHORT_CELLS.map((c) => ({ key: c.key, pairs: c.sa2Pairs, median: c.sa2Median })) }
      },
      strictReproducesLeaf: reproduced,
      rules: report
    };
    fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
    const part = jsonFile + '.part';
    fs.writeFileSync(part, crlf(JSON.stringify(output, null, 2)) + '\r\n', 'utf8');
    fs.renameSync(part, jsonFile);
    env.out('old ' + output.old.task + ' sources ' + output.old.engineSources + ' (rating v' +
      output.old.ratingVersion + '), ' + output.old.shards + ' shards, ' + output.old.cells + ' cells');
    env.out('new sources ' + current.engine.sources + ' (' + current.engine.commit + ', dirty ' +
      current.engine.dirty + ', rating v' + current.ratingVersion + '), ' + current.cells.length + ' cells');
    Object.keys(report).forEach((name) => {
      const r = report[name];
      env.out(name.padEnd(13) + String(r.pairs).padStart(5) + ' pairs in ' + String(r.cells).padStart(3) +
        ' cells, median ' + r.median + '; ' + r.cohorts.map((c) => c.key + ' ' + c.pairs + '/' + c.median)
        .join(', '));
    });
    env.out('quoted: SA1 about ' + LEAF.sa1Overall + ' overall, ' +
      COHORT_CELLS.map((c) => c.key + ' ' + c.sa1).join(', ') + '; SA2 ' + LEAF.sa2Pairs +
      ' pairs, median ' + LEAF.sa2Median + ', ' +
      COHORT_CELLS.map((c) => c.key + ' ' + c.sa2Pairs + '/' + c.sa2Median).join(', '));
    env.out('strict rule reproduces the leaf totals and cohorts: ' + reproduced);
    env.out('wrote ' + posix(jsonFile));
    return reproduced ? 0 : 1;
  } catch (err) {
    if (!(err instanceof InputError) && err.name !== 'SyntaxError') throw err;
    env.err('INVALID: ' + err.message);
    return 2;
  }
}

module.exports = { InputError, median, canon, pairs, summarize, compare, matchesLeaf, readOld, RULES, main,
  COHORT_CELLS, LEAF };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
