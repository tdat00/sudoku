#!/usr/bin/env node
'use strict';

/*
 * MS05b3 parity driver: the old (eager) and the new (lazy) corpus helpers of the six manual suites, read in memory.
 * Node >= 18, built-in modules only. Task evidence, not a test and not part of CI.
 *
 *   node tests/artifacts/difficulty-v3/MS05b3/parity.js --snapshot
 *   node tests/artifacts/difficulty-v3/MS05b3/parity.js --plans
 *   node tests/artifacts/difficulty-v3/MS05b3/parity.js --prefix=old|new --key=<key>
 *   node tests/artifacts/difficulty-v3/MS05b3/parity.js --compare
 *
 * --snapshot  writes the six old suites from the blob of HEAD (`git show`, no checkout) into old/ as `.txt`
 *             files, with their hashes in old/manifest.json. Nothing in old/ is ever rewritten.
 * --plans     no generation: every request of the whole old corpora (a scripted pipeline records them) against
 *             the lazy ones, in the natural order of the levels and in the reverse order of the first reads;
 *             writes parity/plans.json and parity/old-request-manifest.json.
 * --prefix    the real requests and outputs of the first level of one corpus, in a process of its own. `old`
 *             runs the old whole build and stops at the first request of another level (an owned sentinel);
 *             `new` reads that level alone and refuses any other request. Keys: killer, jigsaw, greaterThan,
 *             diagonalX, hyper, wordoku, classic4, classic6. Writes parity/prefix-<side>-<key>.json.
 * --compare   old against new for every key that has both files; writes parity/prefix-comparison.json; exit 1
 *             on any difference.
 *
 * The suites are evaluated with describe, it and the hooks as no-ops, so no test runs; their private helpers
 * are published by one statement added to the in-memory copy (the repository files are not changed). Output
 * files are new files: an existing one is an error, never overwritten.
 */
const crypto = require('crypto');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HERE = __dirname;
const GENERATOR = path.resolve(HERE, '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');
const OLD_DIR = path.join(HERE, 'old');
const OUT_DIR = process.env.MS05B3_PARITY_OUT ? path.resolve(process.env.MS05B3_PARITY_OUT) :
  path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS05b3', 'parity');
const FIXTURE = path.join(GENERATOR, 'tests', 'fixtures', 'manual-corpus.js');

const SUITES = {
  killer: { file: 'killer.test.js', names: ['corpus', 'corpusOf', 'LEVELS', 'countOf'] },
  jigsaw: { file: 'jigsaw.test.js', names: ['puzzleRun', 'LEVELS', 'countOf'] },
  greaterThan: { file: 'greater-than.test.js', names: ['puzzleRun', 'allPuzzles', 'LEVELS', 'countOf'] },
  extraRegions: { file: 'extra-regions.test.js',
    names: ['puzzleRun', 'allPuzzles', 'LEVELS', 'VARIANT_IDS', 'seedOf'] },
  wordoku: { file: 'wordoku.test.js', names: ['puzzleRun', 'allPuzzles', 'LEVELS'] },
  variants: { file: 'variants.test.js', names: ['contextOf', 'volumeOf', 'CHECKS'],
    newNames: ['checkSupportedLevel', 'checkUnsupportedLevels', 'checkLevels'] }
};

// The first level of a corpus: the suite, the variant its requests are for, and for extra-regions the old index.
const PREFIX_KEYS = {
  killer: { suite: 'killer', variantId: 'killer' },
  jigsaw: { suite: 'jigsaw', variantId: 'jigsaw9' },
  greaterThan: { suite: 'greaterThan', variantId: 'greaterThan' },
  diagonalX: { suite: 'extraRegions', variantId: 'diagonalX', index: 0 },
  hyper: { suite: 'extraRegions', variantId: 'hyper', index: 1 },
  wordoku: { suite: 'wordoku', variantId: 'wordoku' },
  classic4: { suite: 'variants', variantId: 'classic4' },
  classic6: { suite: 'variants', variantId: 'classic6' }
};

const SENTINEL = new Error('MS05b3 parity: the old build reached the first request of another level');

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readText(abs) {
  return fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
}

function writeNew(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, { encoding: 'utf8', flag: 'wx' });
}

function json(value) {
  return JSON.stringify(value, null, 2)
    .replace(/\[\s*(-?\d[\d.eE+-]*(?:,\s*-?\d[\d.eE+-]*)*)\s*\]/g, (match, body) => '[' + body.replace(/\s+/g, '') + ']')
    .replace(/\n/g, '\r\n') + '\r\n';
}

function loadHelpers() {
  globalThis.SG = { test: {}, fixtures: {} };
  vm.runInThisContext(readText(FIXTURE), { filename: FIXTURE });
  return globalThis.SG.fixtures.manualCorpus;
}

function newSandbox(MC) {
  return MC.sandbox({ fs: fs, path: path, vm: vm, root: GENERATOR });
}

function oldPath(suite) {
  return path.join(OLD_DIR, SUITES[suite].file + '.txt');
}

function sourceOf(side, suite) {
  return readText(side === 'old' ? oldPath(suite) : path.join(GENERATOR, 'tests', 'manual', SUITES[suite].file));
}

/** The helpers of one suite as `side` has them; the old extra-regions text is probed with its variant loop open. */
function probeOf(MC, sb, side, suite) {
  const info = SUITES[suite];
  let source = sourceOf(side, suite);
  const names = info.names.concat(side === 'new' && info.newNames ? info.newNames : []);
  const more = [];
  if (side === 'old' && suite === 'extraRegions') {
    source = MC.splitOldExtraRegions(source);
    more.push('prefixOf: function (id, vi) { innerBuilder(id, vi); }');
  }
  return sb.probe(source, names, more);
}

function gitText(args) {
  return childProcess.execFileSync('git', args, { cwd: REPO, encoding: 'utf8', windowsHide: true }).trim();
}

function snapshot() {
  const manifest = { schema: 1, task: 'MS05b3', commit: gitText(['rev-parse', 'HEAD']), files: {} };
  Object.keys(SUITES).forEach((suite) => {
    const rel = 'generator/tests/manual/' + SUITES[suite].file;
    const blob = childProcess.execFileSync('git', ['show', 'HEAD:' + rel], {
      cwd: REPO, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26
    });
    const text = blob.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    writeNew(oldPath(suite), text);
    manifest.files[rel] = {
      snapshot: 'generator/tests/artifacts/difficulty-v3/MS05b3/old/' + SUITES[suite].file + '.txt',
      gitBlob: gitText(['rev-parse', 'HEAD:' + rel]), sha256: sha256(text), bytes: Buffer.byteLength(text)
    };
  });
  writeNew(path.join(OLD_DIR, 'manifest.json'), json(manifest));
  console.log('snapshot: ' + Object.keys(SUITES).length + ' files in ' + path.relative(REPO, OLD_DIR));
  return 0;
}

// ----------------------------------------------------------------------------------------------------------
// Plans

function rowOf(entry) {
  return JSON.stringify([entry.config.variantId, entry.config.difficulty, entry.config.seed,
    entry.config.trace, entry.config.variantOptions === undefined ? null : entry.config.variantOptions,
    entry.emit, entry.budgetMs]);
}

function grouped(rows) {
  const out = {};
  rows.forEach((entry) => {
    const key = entry.config.variantId + ' ' + entry.config.difficulty;
    (out[key] = out[key] || []).push(rowOf(entry));
  });
  return out;
}

/** Runs fn with a recording pipeline: the requests it made and what it returned. */
function recorded(MC, sb, fn) {
  const rec = MC.recorder({ budgetMsOf: sb.budgetMsOf });
  const value = sb.withRun(rec.run, fn);
  return { rows: MC.planOf(rec.log), value: value };
}

/** The puzzles of a corpus as a list, whatever its shape: a list, or a map of lists in the order of its keys. */
function flat(value) {
  if (Array.isArray(value)) return value;
  return Object.keys(value).reduce((all, key) => all.concat(value[key]), []);
}

function enumerationOf(MC, value) {
  return flat(value).map((p) => MC.canonical(p.result && p.result.config ? p.result.config : p.config));
}

/** Reads every key of a corpus once, in the natural or the reverse order of its levels; returns the aggregate. */
function readAll(sb, probe, suite, id, order) {
  const ordered = (list) => (order === 'reverse' ? list.slice().reverse() : list.slice());
  if (suite === 'variants') {
    const def = sb.SG.variants.get(id);
    const ctx = probe.contextOf(def);
    ordered(def.difficultySupport).forEach((level) => ctx.corpusOf(level));
    return ctx.corpus();
  }
  if (suite === 'killer') {
    ordered(probe.LEVELS).forEach((level) => probe.corpusOf(level));
    return probe.corpus();
  }
  if (suite === 'extraRegions') {
    ordered(probe.VARIANT_IDS).forEach((vid) => {
      ordered(probe.LEVELS).forEach((level) => probe.puzzleRun()[vid][level]);
    });
    return probe.VARIANT_IDS.reduce((all, vid) => all.concat(probe.allPuzzles(vid)), []);
  }
  ordered(probe.LEVELS).forEach((level) => probe.puzzleRun()[level]);
  return probe.allPuzzles ? probe.allPuzzles() : flat(probe.puzzleRun());
}

/** The old whole build of one corpus (one registered variant for `variants`). */
function readOld(sb, probe, suite, id) {
  if (suite === 'variants') return probe.contextOf(sb.SG.variants.get(id)).corpus();
  if (suite === 'killer') return probe.corpus();
  if (suite === 'extraRegions') {
    probe.puzzleRun();
    return probe.VARIANT_IDS.reduce((all, vid) => all.concat(probe.allPuzzles(vid)), []);
  }
  probe.puzzleRun();
  return probe.allPuzzles ? probe.allPuzzles() : flat(probe.puzzleRun());
}

/** One key alone, in a fresh probe: what a level-selected assertion reads. */
function readOne(sb, probe, suite, variantId, level) {
  if (suite === 'variants') return probe.contextOf(sb.SG.variants.get(variantId)).corpusOf(level);
  if (suite === 'killer') return probe.corpusOf(level);
  if (suite === 'extraRegions') return probe.puzzleRun()[variantId][level];
  return probe.puzzleRun()[level];
}

function planOfSuite(MC, suite) {
  const sb = newSandbox(MC);
  const ids = suite === 'variants' ? sb.SG.variants.list().map((d) => d.id) : [null];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const oldProbe = probeOf(MC, sb, 'old', suite);
  let oldRows = [];
  let oldEnumeration = [];
  ids.forEach((id) => {
    const old = recorded(MC, sb, () => readOld(sb, oldProbe, suite, id));
    oldRows = oldRows.concat(old.rows);
    oldEnumeration = oldEnumeration.concat(enumerationOf(MC, old.value));
  });

  const reads = {};
  ['natural', 'reverse'].forEach((order) => {
    const probe = probeOf(MC, sb, 'new', suite);
    reads[order] = { rows: [], enumeration: [] };
    ids.forEach((id) => {
      const read = recorded(MC, sb, () => readAll(sb, probe, suite, id, order));
      reads[order].rows = reads[order].rows.concat(read.rows);
      reads[order].enumeration = reads[order].enumeration.concat(enumerationOf(MC, read.value));
    });
  });

  const oldGroups = grouped(oldRows);
  const keyedEqual = (rows) => same(Object.keys(grouped(rows)).sort(), Object.keys(oldGroups).sort()) &&
    Object.keys(oldGroups).every((key) => same(grouped(rows)[key], oldGroups[key]));

  const isolation = { keys: 0, onlyOwnRequests: 0, repeatedReadNoRequests: 0, problems: [] };
  Object.keys(oldGroups).forEach((key) => {
    const variantId = key.split(' ')[0];
    const level = key.split(' ')[1];
    const probe = probeOf(MC, sb, 'new', suite);
    const first = recorded(MC, sb, () => readOne(sb, probe, suite, variantId, level));
    const second = recorded(MC, sb, () => readOne(sb, probe, suite, variantId, level));
    isolation.keys++;
    if (same(first.rows.map(rowOf), oldGroups[key])) isolation.onlyOwnRequests++;
    else isolation.problems.push(key + ': the requests of a one-key read differ from the old plan');
    if (second.rows.length === 0 && second.value === first.value) isolation.repeatedReadNoRequests++;
    else isolation.problems.push(key + ': a second read made requests or returned another array');
  });

  const checks = {
    naturalOrderIdentical: same(reads.natural.rows.map(rowOf), oldRows.map(rowOf)),
    naturalKeyedPlansIdentical: keyedEqual(reads.natural.rows),
    reverseKeyedPlansIdentical: keyedEqual(reads.reverse.rows),
    reverseRequestCountIdentical: reads.reverse.rows.length === oldRows.length,
    naturalAggregateIdentical: same(reads.natural.enumeration, oldEnumeration),
    reverseAggregateIdentical: same(reads.reverse.enumeration, oldEnumeration),
    oneKeyOnlyOwnRequests: isolation.onlyOwnRequests === isolation.keys,
    repeatedReadNoRequests: isolation.repeatedReadNoRequests === isolation.keys
  };
  return {
    rows: oldRows,
    section: { suite: suite, oldRequests: oldRows.length, keys: Object.keys(oldGroups).length,
      aggregateEnumeration: oldEnumeration.length, checks: checks, isolation: isolation }
  };
}

function rowText(entry) {
  return [entry.config.variantId, entry.config.difficulty, 'seed ' + entry.config.seed, 'trace ' +
    entry.config.trace, 'options ' + (entry.config.variantOptions === undefined ? 'none' :
    JSON.stringify(entry.config.variantOptions)), 'emit ' + entry.emit, 'budget ' + entry.budgetMs].join(' | ');
}

function plans() {
  const MC = loadHelpers();
  const doc = {
    schema: 1, kind: 'manual-corpus-plan-parity', task: 'MS05b3', node: process.version,
    commit: gitText(['rev-parse', 'HEAD']), scripted: true, generation: 'none', suites: {}
  };
  const manifest = {
    schema: 1, kind: 'manual-corpus-old-request-manifest', task: 'MS05b3', generation: 'none (scripted pipeline)',
    row: 'variantId | difficulty | seed | trace | variantOptions | emit callback | budget ms', suites: {}
  };
  let failed = 0;
  Object.keys(SUITES).forEach((suite) => {
    const out = planOfSuite(MC, suite);
    doc.suites[suite] = out.section;
    manifest.suites[suite] = {
      requests: out.rows.length, keys: out.section.keys, digest: sha256(out.rows.map(rowOf).join('\n')),
      rows: out.rows.map(rowText)
    };
    const bad = Object.keys(out.section.checks).filter((name) => out.section.checks[name] !== true);
    failed += bad.length;
    console.log(suite + ': ' + out.rows.length + ' requests, ' + out.section.keys + ' keys, ' +
      (bad.length === 0 ? 'identical (natural, reverse, one key, repeated read)' : 'DIFFERENT: ' + bad.join(', ')));
  });
  doc.identical = failed === 0;
  writeNew(path.join(OUT_DIR, 'old-request-manifest.json'), json(manifest));
  writeNew(path.join(OUT_DIR, 'plans.json'), json(doc));
  return failed === 0 ? 0 : 1;
}

// ----------------------------------------------------------------------------------------------------------
// Real prefixes

const DIGESTED_MODEL = ['units', 'cellUnits', 'peers', 'unitMeta', 'cages', 'inequalities', 'layout', 'symbols',
  'fixedCells'];

function recordOf(MC, config, projected) {
  const model = projected.model || {};
  const row = {
    config: config, seed: projected.seed, attempts: projected.attempts, exact: projected.exact,
    warnings: projected.warnings, rating: projected.rating, givens: projected.givens,
    solution: projected.solution,
    model: { variantId: model.variantId, cellCount: model.cellCount, digits: model.digits },
    digests: {
      model: {}, digLog: sha256(MC.canonical(projected.digLog)), work: sha256(MC.canonical(projected.work)),
      full: sha256(MC.canonical(projected))
    }
  };
  DIGESTED_MODEL.forEach((key) => { row.digests.model[key] = sha256(MC.canonical(model[key])); });
  return row;
}

function prefix(side, key) {
  const spec = PREFIX_KEYS[key];
  if (!spec) throw new Error('unknown key ' + key + ' (' + Object.keys(PREFIX_KEYS).join(', ') + ')');
  const MC = loadHelpers();
  const sb = newSandbox(MC);
  const probe = probeOf(MC, sb, side, spec.suite);
  const def = spec.suite === 'variants' ? sb.SG.variants.get(spec.variantId) : null;
  const level = def ? def.difficultySupport[0] : probe.LEVELS[0];
  const rows = [];

  const real = sb.realRun();
  const wrapper = (config, emit, budget) => {
    const copy = JSON.parse(MC.canonical(MC.plain(config)));
    if (copy.difficulty !== level || copy.variantId !== spec.variantId) {
      if (side === 'old') throw SENTINEL;
      throw new Error('the one-level read asked for another request: ' + MC.canonical(copy));
    }
    const result = real(config, emit, budget);
    rows.push(recordOf(MC, copy, MC.projectResult(result)));
    return result;
  };
  const stopAtSentinel = (fn) => {
    try {
      fn();
    } catch (err) {
      if (err !== SENTINEL) throw err;
    }
  };

  const started = process.hrtime.bigint();
  sb.withRun(wrapper, () => {
    if (side === 'old') {
      if (spec.suite === 'killer') stopAtSentinel(() => probe.corpus());
      else if (spec.suite === 'variants') stopAtSentinel(() => probe.contextOf(def).corpus());
      else if (spec.suite === 'extraRegions') {
        // The whole old build starts with diagonalX; the first request of another variant stops it, and has
        // left the old inner variant builder behind, which then builds the level of the second variant.
        stopAtSentinel(() => probe.puzzleRun());
        if (spec.index > 0) stopAtSentinel(() => probe.prefixOf(spec.variantId, spec.index));
      } else stopAtSentinel(() => probe.puzzleRun());
    } else if (spec.suite === 'killer') probe.corpusOf(level);
    else if (spec.suite === 'extraRegions') probe.puzzleRun()[spec.variantId][level];
    else if (spec.suite === 'variants') probe.contextOf(def).corpusOf(level);
    else probe.puzzleRun()[level];
  });
  const seconds = Number(process.hrtime.bigint() - started) / 1e9;
  if (rows.length === 0) throw new Error('no request was made');
  const doc = {
    schema: 1, kind: 'manual-corpus-prefix', task: 'MS05b3', side: side, key: key, suite: spec.suite,
    variantId: spec.variantId, level: level, node: process.version, requests: rows.length,
    stoppedBySentinel: side === 'old', seconds: Math.round(seconds * 1000) / 1000,
    source: { file: SUITES[spec.suite].file, sha256: sha256(sourceOf(side, spec.suite)) }, rows: rows
  };
  writeNew(path.join(OUT_DIR, 'prefix-' + side + '-' + key + '.json'), json(doc));
  console.log(side + ' ' + key + ': ' + rows.length + ' real requests of ' + spec.variantId + ' ' + level +
    ' in ' + doc.seconds + ' s');
  return 0;
}

function differences(a, b, where, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  const plainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (plainObject(a) && plainObject(b)) {
    new Set(Object.keys(a).concat(Object.keys(b))).forEach((k) => differences(a[k], b[k], where + '.' + k, out));
    return;
  }
  out.push({ field: where, old: a, new: b });
}

function compare() {
  const files = fs.readdirSync(OUT_DIR).filter((name) => /^prefix-old-.*\.json$/.test(name)).sort();
  const doc = { schema: 1, kind: 'manual-corpus-prefix-comparison', task: 'MS05b3', node: process.version, keys: {} };
  let different = 0;
  files.forEach((name) => {
    const key = name.slice('prefix-old-'.length, -'.json'.length);
    const newFile = path.join(OUT_DIR, 'prefix-new-' + key + '.json');
    if (!fs.existsSync(newFile)) {
      doc.keys[key] = { compared: false, reason: 'no prefix-new file' };
      different++;
      return;
    }
    const oldDoc = JSON.parse(readText(path.join(OUT_DIR, name)));
    const newDoc = JSON.parse(readText(newFile));
    const diffs = [];
    differences({ variantId: oldDoc.variantId, level: oldDoc.level, requests: oldDoc.requests },
      { variantId: newDoc.variantId, level: newDoc.level, requests: newDoc.requests }, 'prefix', diffs);
    oldDoc.rows.forEach((row, i) => differences(row, newDoc.rows[i], 'row[' + i + ']', diffs));
    doc.keys[key] = {
      compared: true, variantId: oldDoc.variantId, level: oldDoc.level, requests: oldDoc.requests,
      identical: diffs.length === 0, digestOfFullDigests: sha256(oldDoc.rows.map((r) => r.digests.full).join(',')),
      differences: diffs
    };
    if (diffs.length > 0) different++;
    console.log(key + ': ' + oldDoc.requests + ' requests of ' + oldDoc.variantId + ' ' + oldDoc.level + ' ' +
      (diffs.length === 0 ? 'identical' : 'DIFFERENT (' + diffs.length + ')'));
  });
  doc.identical = different === 0 && files.length > 0;
  writeNew(path.join(OUT_DIR, 'prefix-comparison.json'), json(doc));
  return doc.identical ? 0 : 1;
}

function main(argv) {
  const mode = argv.find((a) => /^--(snapshot|plans|compare)$/.test(a));
  const side = (argv.find((a) => /^--prefix=/.test(a)) || '').slice('--prefix='.length);
  const key = (argv.find((a) => /^--key=/.test(a)) || '').slice('--key='.length);
  if (mode === '--snapshot') return snapshot();
  if (mode === '--plans') return plans();
  if (mode === '--compare') return compare();
  if ((side === 'old' || side === 'new') && key) return prefix(side, key);
  console.error('usage: parity.js --snapshot | --plans | --prefix=old|new --key=<key> | --compare');
  return 2;
}

module.exports = { SUITES, GENERATOR, REPO, loadHelpers, newSandbox, probeOf, readText, sha256, json };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
