#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase A, task-owned and READ-ONLY: the preflight of the final performance matrix (GP). It generates
 * no puzzle, runs no pipeline and writes nothing but the --json file. It never grants a timing or admission
 * approval: the admission block of every cell says "unadmitted" and why.
 *
 *   node tests/artifacts/difficulty-v3/MS18d/project-gp.js --qualification=<file> --json=<file>
 *
 * It reads the merged final qualification (the raw bytes are hashed, the JSON is validated), loads the
 * published `difficultySupport` and the current PERF_TARGETS through replay-fixtures.loadFixtures (the engine
 * files of perf.js and perf-helper.js; never perf.js itself, whose main() would start the default GP), joins
 * each published (variant, level) to its qualification requests and writes
 *   { qualificationHash, qualificationEngine, publishedCells, projections, flagged, targetProposal, inputs }
 * in stable cell order (the matrix order of the qualification), UTF-8, CRLF.
 *
 *  - projections: the FS23 scheduling alert 50 * mean(requests.ms) / 1000 seconds (arithmetic mean over every
 *    request, errors included; complete, finite, non-negative data or the input is invalid). Flagged when
 *    the alert is above 450 s. Not a bound, not a forecast and not a GP result.
 *  - targetProposal: the qualification-derived target rule of the brief. With q the raw p95 and t the
 *    positive target of a cell: keep t when q <= t, else min(b, max(predecessor, ceil(3 * q))), the
 *    predecessor being the selected target of the previous published level of the variant (0 if none).
 *
 * Exit code 0: complete projections, nothing flagged; 1: complete projections flag a cell; 2: missing or
 * invalid input (nothing is written).
 */
const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const GENERATOR = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');

const GP_RUNS = 50;
const ALERT_LIMIT_SECONDS = 450;
const HARD_LIMIT_SECONDS = 540;
const MS_SCALE = 10000;
const PUBLICATION_PROOF = 'docs/difficulty-v3/evidence/MS18c/closure/final/publication-check-final-2.txt';
const HASH_CODE_FILES = ['tests/fixtures/perf-helper.js', 'tests/fixtures/tool-records.js', 'tests/perf.js'];
const RECORDER_FILES = ['tests/fixtures/tool-records.js', 'tests/fixtures/replay-recording.js',
  'tests/replay-fixtures.js', 'tests/replay-goldens.js'];

// What the brief and the accepted MS18c closure bind (raw bytes, or the recipe named in the key).
const ACCEPTED = Object.freeze({
  qualificationSha256: 'b8e546fc0ba5bd1f79f408984bf3bf8f82559305ea6bd63cbe6dc53beff0df04',
  perfJsSha256: '7395472b46bcfe7f93f805efc1fc4747003da43e2fa53645ec0ae6a25e8f9a60',
  perfHelperSha256: 'd64f8b3c207f94fb8c2ce614c480ca06d96f5d9015e66ca6368bba43b59b1724',
  toolRecordsSha256: 'eec5e268287f0543fb3e1677b293b64c75618d68f50e7f176573dbb1729367c6',
  hashIdentity: '1032ab2f510fe2b9ed1bac744f534d5cfee7e039f456fc56d3e19682d53158a0',
  replayIdentity: '1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc',
  measuredSources: '0ca29eaeebc295b6',
  publicationSources: '75b0955e3e356bd1',
  qualifierHash: 'c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77',
  published: 79
});

/** Missing or invalid input: exit code 2, nothing is written. */
class InputError extends Error {
  constructor(problems) {
    super(problems.join('\n'));
    this.problems = problems;
  }
}

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readSource = (abs) => fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const unique = (list) => Array.from(new Set(list));
const posix = (abs) => path.relative(REPO, abs).replace(/\\/g, '/');

// -------------------------------------------------------------------------------------------------
// Pure arithmetic
// -------------------------------------------------------------------------------------------------

/** The request time as an integer number of 1e-4 ms (the qualification records four decimals), else null. */
function scaledMs(ms) {
  const scaled = Math.round(ms * MS_SCALE);
  return Math.abs(scaled / MS_SCALE - ms) < 1e-9 ? scaled : null;
}

/** ceil(3 * q) without floating-point noise for the four-decimal times of the records. */
function ceilTriple(q) {
  const scaled = scaledMs(q);
  if (scaled === null) return Math.ceil(3 * q);
  return Math.floor((3 * scaled + MS_SCALE - 1) / MS_SCALE);
}

/** The minimum number of cells that must meet their target for the 90 % acceptance (integer arithmetic). */
const minSuccesses = (cells) => Math.ceil((9 * cells) / 10);

const round9 = (x) => Math.round(x * 1e9) / 1e9;

/**
 * The statistics and the FS23 alert of the requests of one cell. `records` supplies the nearest-rank
 * percentile of the qualifier. Incomplete data (no request, a duplicate index, a time that is not finite and
 * >= 0) adds to `problems` and returns null.
 */
function projectRequests(key, requests, records, problems) {
  const before = problems.length;
  if (!Array.isArray(requests) || requests.length === 0) {
    problems.push(key + ': no requests');
    return null;
  }
  const times = [];
  const indexes = new Set();
  requests.forEach((r, i) => {
    if (!isObject(r)) {
      problems.push(key + ': request ' + i + ' is not an object');
      return;
    }
    if (r.key !== key) problems.push(key + ': request ' + i + ' has key ' + JSON.stringify(r.key));
    if (!Number.isInteger(r.index) || r.index < 0) problems.push(key + ': request ' + i + ' has no index');
    else if (indexes.has(r.index)) problems.push(key + ': duplicate request index ' + r.index);
    else indexes.add(r.index);
    if (!isNumber(r.ms) || r.ms < 0) {
      problems.push(key + ': request ' + i + ' has ms ' + JSON.stringify(r.ms) + ', not finite and >= 0');
    } else {
      times.push(r.ms);
    }
  });
  if (problems.length > before) return null;
  const n = times.length;
  const sorted = times.slice().sort((a, b) => a - b);
  const scaled = times.map(scaledMs);
  const exact = scaled.every((v) => v !== null);
  const sum4 = exact ? scaled.reduce((a, b) => a + b, 0) : null;
  const max4 = exact ? Math.max.apply(null, scaled) : null;
  const mean = exact ? sum4 / (n * MS_SCALE) : times.reduce((a, b) => a + b, 0) / n;
  const alertSeconds = exact ? (GP_RUNS * sum4) / (n * MS_SCALE * 1000) : (GP_RUNS * mean) / 1000;
  const flagged = exact ? GP_RUNS * sum4 > ALERT_LIMIT_SECONDS * n * MS_SCALE * 1000
    : alertSeconds > ALERT_LIMIT_SECONDS;
  const max = sorted[n - 1];
  const maxAlertSeconds = exact ? (GP_RUNS * max4) / (MS_SCALE * 1000) : (GP_RUNS * max) / 1000;
  const maxOver = exact ? GP_RUNS * max4 > ALERT_LIMIT_SECONDS * MS_SCALE * 1000
    : maxAlertSeconds > ALERT_LIMIT_SECONDS;
  return {
    n: n, mean: mean, p50: records.percentile(sorted, 0.5), p95: records.percentile(sorted, 0.95), max: max,
    meanAlertSeconds: alertSeconds, flagged: flagged, maxAlertSeconds: maxAlertSeconds,
    maxAlertOver450: maxOver, exactDecimal: exact
  };
}

/**
 * The qualification-derived target of every published cell, in the order of `variants` and `levels`.
 * `targets[variant][level]` is the existing positive target; `budgets[key]` the board budget in ms.
 */
function targetProposal(input) {
  const rows = [];
  input.variants.forEach((variant) => {
    let predecessor = 0;
    input.levels.filter((level) => input.published[variant].indexOf(level) !== -1).forEach((level) => {
      const key = variant + '/' + level;
      const q = input.p95[key];
      const old = input.targets[variant][level];
      const budget = input.budgets[key];
      const ceil3 = ceilTriple(q);
      const row = {
        key: key, q: q, oldTarget: old, predecessor: predecessor, ceil3q: ceil3, budget: budget
      };
      if (q <= old) {
        row.action = 'keep';
        row.decidedBy = null;
        row.proposedTarget = old;
      } else {
        const floor = Math.max(predecessor, ceil3);
        row.action = 'update';
        row.decidedBy = budget < floor ? 'budget' : predecessor > ceil3 ? 'predecessor' : 'ceil3q';
        row.proposedTarget = Math.min(budget, floor);
      }
      predecessor = row.proposedTarget;
      rows.push(row);
    });
  });
  return rows;
}

// -------------------------------------------------------------------------------------------------
// Declarations, identities, git (read-only)
// -------------------------------------------------------------------------------------------------

/** The existing engine files of perf.js (SOURCE_FILES of node-runner.js minus the UI and worker files). */
function sourceList(generatorDir, all) {
  const runner = readSource(path.join(generatorDir, 'tests', 'node-runner.js'));
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (!match) throw new Error('cannot find SOURCE_FILES in tests/node-runner.js');
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  return files.filter((rel) => fs.existsSync(path.join(generatorDir, rel)) &&
    (all || !/^js\/(ui|worker)\//.test(rel)));
}

/**
 * The published declarations, without generating anything: the engine files and perf-helper.js are only
 * run as classic scripts (they define functions and register the variants), through `loader`, the
 * `loadFixtures` of tests/replay-fixtures.js. Never tests/perf.js.
 */
function loadDeclarations(loader, generatorDir) {
  const dir = generatorDir || GENERATOR;
  const files = sourceList(dir, false).concat(['tests/fixtures/perf-helper.js']);
  const SG = loader(files);
  const tools = SG.fixtures.perfTools;
  const published = {};
  const cellCounts = {};
  const attempts = {};
  SG.variants.list().forEach((def) => {
    published[def.id] = def.difficultySupport.slice();
    cellCounts[def.id] = SG.variants.cellCountOf(def.id);
    attempts[def.id] = SG.digger.defaultMaxAttempts(cellCounts[def.id]);
  });
  const targets = {};
  Object.keys(tools.PERF_TARGETS).forEach((variant) => {
    targets[variant] = Object.assign({}, tools.PERF_TARGETS[variant]);
  });
  return {
    files: files, published: published, cellCounts: cellCounts, attempts: attempts, targets: targets,
    targetLevels: tools.TARGET_LEVELS.slice(), perfCells: tools.cells().map((c) => c.key)
  };
}

/** The shared decision helpers of the qualifier (percentile, budgetOf, protocol), in a context of its own. */
function loadRecords(generatorDir) {
  const file = path.join(generatorDir || GENERATOR, 'tests', 'fixtures', 'qualification-records.js');
  const sandbox = vm.createContext({});
  vm.runInContext(readSource(file), sandbox, { filename: file });
  return vm.runInContext('SG.fixtures.qualificationRecords', sandbox);
}

/** The recipes of qualify.js (sources, tool), perf.js (hash) and replay-fixtures.js (replay), by the tree. */
function computeIdentities(generatorDir) {
  const dir = generatorDir || GENERATOR;
  const abs = (rel) => path.join(dir, rel);
  const engine = sourceList(dir, false);
  const sourcesHash = crypto.createHash('sha256');
  engine.forEach((rel) => sourcesHash.update(fs.readFileSync(abs(rel))));
  const identity = (files) => {
    const h = crypto.createHash('sha256');
    files.forEach((rel) => h.update(rel + '\0' + readSource(abs(rel)).replace(/\r\n/g, '\n')));
    return h.digest('hex');
  };
  const toolHash = crypto.createHash('sha256');
  ['tests/qualify.js', 'tests/fixtures/qualification-records.js'].forEach((rel) => {
    toolHash.update(fs.readFileSync(abs(rel)));
    toolHash.update('\0');
  });
  const raw = (rel) => sha256(fs.readFileSync(abs(rel)));
  return {
    sources: sourcesHash.digest('hex').slice(0, 16),
    qualifierHash: toolHash.digest('hex'),
    hashIdentity: identity(engine.concat(HASH_CODE_FILES)),
    replayIdentity: identity(sourceList(dir, true).concat(RECORDER_FILES)),
    files: {
      'tests/perf.js': raw('tests/perf.js'),
      'tests/fixtures/perf-helper.js': raw('tests/fixtures/perf-helper.js'),
      'tests/fixtures/tool-records.js': raw('tests/fixtures/tool-records.js'),
      'tests/fixtures/qualification-records.js': raw('tests/fixtures/qualification-records.js'),
      'tests/qualify.js': raw('tests/qualify.js'),
      'tests/replay-fixtures.js': raw('tests/replay-fixtures.js')
    },
    engineFileCount: engine.length
  };
}

function machineNow() {
  const cpus = os.cpus();
  return {
    cpu: cpus.length > 0 ? cpus[0].model.trim() : 'unknown', logicalProcessors: cpus.length,
    memoryGb: Math.round(os.totalmem() / 1073741824), platform: os.platform() + ' ' + os.release(),
    node: process.version
  };
}

/** Commit and the paths changed outside the evidence and artifact folders (no index refresh), else null. */
function gitState() {
  const git = (args) => childProcess.execFileSync('git', ['--no-optional-locks'].concat(args), {
    cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true
  });
  try {
    const head = git(['rev-parse', 'HEAD']).trim();
    const changed = git(['status', '--porcelain', '--', '.', ':(exclude)docs/difficulty-v3/evidence/MS18d',
      ':(exclude)generator/tests/artifacts/difficulty-v3/MS18d']).split(/\r?\n/).filter((l) => l !== '');
    return { head: head, changedPaths: changed.map((l) => l.slice(3)) };
  } catch (err) {
    return null;
  }
}

/** The documented support-only publication proof of MS18c, bound by its bytes and its two key lines. */
function publicationProof(repo) {
  const file = path.join(repo || REPO, PUBLICATION_PROOF);
  if (!fs.existsSync(file)) return { file: PUBLICATION_PROOF, present: false };
  const bytes = fs.readFileSync(file);
  const text = bytes.toString('utf8');
  return {
    file: PUBLICATION_PROOF, present: true, sha256: sha256(bytes),
    namesPublicationSources: text.indexOf('publication engine.sources ' + ACCEPTED.publicationSources) !== -1,
    okLine: /^OK: no problem$/m.test(text.replace(/\r/g, ''))
  };
}

// -------------------------------------------------------------------------------------------------
// The preflight
// -------------------------------------------------------------------------------------------------

/**
 * Validates the qualification against the declarations and builds the output object, or throws an
 * InputError listing every problem found. `expect` holds the identities the accepted base binds (null in
 * the synthetic tests); `env` supplies the tree-dependent inputs (identities, machine, git, proof).
 */
function build(args) {
  const q = args.qualification;
  const decl = args.declarations;
  const records = args.records;
  const expect = args.expect;
  const env = args.env;
  const problems = [];
  if (!isObject(q) || !Array.isArray(q.cells) || !isObject(q.matrix) || !isObject(q.support) ||
      !Array.isArray(q.matrix.variants) || !Array.isArray(q.matrix.levels)) {
    throw new InputError(['the qualification has no cells, matrix and support']);
  }
  if (!isObject(q.engine) || !/^[0-9a-f]{16}$/.test(q.engine.sources)) {
    problems.push('the qualification names no 16-hex engine.sources');
  }
  if (expect && args.qualificationHash !== expect.qualificationSha256) {
    problems.push('qualification sha256 ' + args.qualificationHash + ' is not the accepted ' +
      expect.qualificationSha256);
  }
  const variants = q.matrix.variants.slice();
  const levels = q.matrix.levels.slice();
  const matrixKeys = [];
  variants.forEach((v) => levels.forEach((l) => matrixKeys.push(v + '/' + l)));
  const byKey = new Map();
  q.cells.forEach((cell, i) => {
    if (!isObject(cell) || typeof cell.variant !== 'string' || typeof cell.level !== 'string') {
      problems.push('cell ' + i + ' has no variant and level');
      return;
    }
    const key = cell.variant + '/' + cell.level;
    if (byKey.has(key)) problems.push('duplicate cell ' + key);
    else if (matrixKeys.indexOf(key) === -1) problems.push('cell ' + key + ' is not in the matrix');
    else byKey.set(key, cell);
  });
  matrixKeys.filter((key) => !byKey.has(key)).forEach((key) => problems.push('missing cell ' + key));

  const published = {};
  const publishedKeys = [];
  variants.forEach((variant) => {
    if (!Array.isArray(decl.published[variant])) {
      problems.push('variant ' + variant + ' is not registered');
      return;
    }
    published[variant] = decl.published[variant];
    const recorded = Array.isArray(q.support[variant]) ? q.support[variant] : null;
    const live = levels.filter((l) => published[variant].indexOf(l) !== -1);
    if (recorded === null || recorded.join(',') !== live.join(',')) {
      problems.push(variant + ': published support [' + live.join(',') + '] differs from the record [' +
        (recorded === null ? 'missing' : recorded.join(',')) + ']');
    }
    live.forEach((level) => publishedKeys.push(variant + '/' + level));
  });
  const expectedPublished = expect ? expect.published : args.expectedPublished;
  if (expectedPublished !== undefined && publishedKeys.length !== expectedPublished) {
    problems.push(publishedKeys.length + ' published cells, not ' + expectedPublished);
  }
  const offered = Array.from(byKey.values())
    .filter((c) => isObject(c.summary) && c.summary.verdict === 'offered')
    .map((c) => c.variant + '/' + c.level);
  offered.filter((k) => publishedKeys.indexOf(k) === -1)
    .forEach((k) => problems.push(k + ': offered in the record but not published'));

  const positive = [];
  variants.forEach((variant) => {
    const row = decl.targets[variant];
    if (!isObject(row)) {
      problems.push(variant + ': no PERF_TARGETS row');
      return;
    }
    levels.forEach((level) => {
      const t = row[level];
      if (t === undefined || t === null) return;
      if (!isNumber(t) || t <= 0) problems.push(variant + '/' + level + ': target ' + t + ' is not positive');
      else positive.push(variant + '/' + level);
    });
  });
  positive.filter((k) => publishedKeys.indexOf(k) === -1)
    .forEach((k) => problems.push(k + ': has a target but is not published'));
  publishedKeys.filter((k) => positive.indexOf(k) === -1)
    .forEach((k) => problems.push(k + ': is published but has no positive target'));

  const projections = [];
  const p95 = {};
  const budgets = {};
  publishedKeys.forEach((key) => {
    const cell = byKey.get(key);
    if (!cell) return;
    const [variant] = key.split('/');
    const before = problems.length;
    const summary = isObject(cell.summary) ? cell.summary : {};
    if (summary.verdict !== 'offered') problems.push(key + ': verdict ' + summary.verdict + ', not offered');
    const proj = projectRequests(key, cell.requests, records, problems);
    if (proj === null) return;
    if (proj.n !== summary.n) problems.push(key + ': ' + proj.n + ' requests, summary n ' + summary.n);
    if (proj.n !== records.PROTOCOL.firstSeeds && proj.n !== records.PROTOCOL.firstSeeds +
        records.PROTOCOL.moreSeeds) {
      problems.push(key + ': ' + proj.n + ' requests is not a complete round');
    }
    ['p50', 'p95', 'max'].forEach((name) => {
      if (proj[name] !== summary[name]) {
        problems.push(key + ': ' + name + ' ' + proj[name] + ' differs from the summary ' + summary[name]);
      }
    });
    if (cell.cellCount !== decl.cellCounts[variant] ||
        cell.budget !== records.budgetOf(decl.cellCounts[variant])) {
      problems.push(key + ': cellCount/budget ' + cell.cellCount + '/' + cell.budget + ' is not the ' +
        decl.cellCounts[variant] + '/' + records.budgetOf(decl.cellCounts[variant]) + ' of the board');
    }
    if (cell.attempts !== decl.attempts[variant]) {
      problems.push(key + ': attempts ' + cell.attempts + ' is not the default ' + decl.attempts[variant]);
    }
    if (problems.length > before) return;
    p95[key] = proj.p95;
    budgets[key] = cell.budget;
    projections.push({ key: key, proj: proj, cell: cell });
  });
  if (problems.length > 0) throw new InputError(problems);

  const rows = targetProposal({
    variants: variants, levels: levels, published: published, targets: decl.targets, p95: p95,
    budgets: budgets
  });
  const anomalies = rows.filter((r) => r.action === 'update' && r.proposedTarget < r.oldTarget)
    .map((r) => r.key + ': proposed ' + r.proposedTarget + ' is below the old ' + r.oldTarget);
  const projectionRecords = projections.map((p) => {
    const flagged = p.proj.flagged;
    return {
      key: p.key, requests: p.proj.n, mean: p.proj.mean, p50: p.proj.p50, p95: p.proj.p95, max: p.proj.max,
      meanAlertSeconds: p.proj.meanAlertSeconds, flagged: flagged, maxAlertSeconds: p.proj.maxAlertSeconds,
      maxAlertOver450: p.proj.maxAlertOver450,
      admission: {
        status: flagged ? 'flagged-mean-alert' : 'unadmitted-no-reviewed-basis',
        approved: false, basis: null, margin: null,
        reason: flagged
          ? 'FS23 mean alert above ' + ALERT_LIMIT_SECONDS + ' s before setup, readiness and variance'
          : 'no source-qualified whole-command planning basis; a mean alert below ' +
            ALERT_LIMIT_SECONDS + ' s is not a bound'
      }
    };
  });
  const flagged = projectionRecords.filter((p) => p.flagged)
    .map((p) => ({ key: p.key, requests: p.requests, mean: p.mean, meanAlertSeconds: p.meanAlertSeconds }));
  const largest = projectionRecords.slice().sort((a, b) => b.meanAlertSeconds - a.meanAlertSeconds)
    .slice(0, 7).map((p) => ({ key: p.key, mean: p.mean, meanAlertSeconds: p.meanAlertSeconds }));
  const changes = rows.filter((r) => r.action === 'update');
  const ident = env.identities;
  const gate = {
    cells: publishedKeys.length, requestsPerCell: GP_RUNS, requests: publishedKeys.length * GP_RUNS,
    minSuccesses: minSuccesses(publishedKeys.length)
  };
  const files = {};
  Object.keys(ident.files).forEach((rel) => {
    const accepted = { 'tests/perf.js': 'perfJsSha256', 'tests/fixtures/perf-helper.js': 'perfHelperSha256',
      'tests/fixtures/tool-records.js': 'toolRecordsSha256' }[rel];
    files[rel] = { sha256: ident.files[rel], acceptedBase: expect && accepted ? expect[accepted] : null,
      equalsAcceptedBase: expect && accepted ? ident.files[rel] === expect[accepted] : null };
  });
  const machine = env.machine;
  const gq = q.machine || {};
  return {
    schema: 1,
    kind: 'ms18d-gp-preflight',
    task: 'MS18d',
    phase: 'A',
    note: 'Read-only preflight: no puzzle was generated, nothing here is a timing result or an admission.',
    qualificationHash: args.qualificationHash,
    qualificationEngine: q.engine,
    publishedCells: publishedKeys.map((key) => {
      const [variant, level] = key.split('/');
      return { key: key, variant: variant, level: level, cellCount: decl.cellCounts[variant],
        target: decl.targets[variant][level] };
    }),
    projections: projectionRecords,
    flagged: flagged,
    targetProposal: {
      rule: 'keep t when q <= t; else min(b, max(predecessor, ceil(3 * q))); predecessor = selected target ' +
        'of the previous published level of the variant, 0 if none; q = raw GQ p95, b = board budget (ms)',
      summary: { cells: rows.length, kept: rows.length - changes.length, changed: changes.length },
      anomalies: anomalies,
      changes: changes.map((r) => ({ key: r.key, q: r.q, oldTarget: r.oldTarget,
        proposedTarget: r.proposedTarget, decidedBy: r.decidedBy })),
      rows: rows
    },
    totals: {
      publishedCells: publishedKeys.length,
      requestsPerCellInGq: unique(projectionRecords.map((p) => p.requests)),
      sumOfMeanAlertSeconds: round9(projectionRecords.reduce((a, p) => a + p.meanAlertSeconds, 0)),
      flaggedCells: flagged.length,
      cellsWithMaxAlertOver450: projectionRecords.filter((p) => p.maxAlertOver450).map((p) => p.key),
      unadmittedWithoutBasis: projectionRecords.filter((p) => !p.flagged).length,
      largestMeanAlerts: largest
    },
    inputs: {
      qualification: {
        path: args.qualificationPath, bytes: args.qualificationBytes, sha256: args.qualificationHash,
        acceptedSha256: expect ? expect.qualificationSha256 : null,
        equalsAccepted: expect ? args.qualificationHash === expect.qualificationSha256 : null,
        measuredSources: q.engine.sources, qualifierHash: q.qualifierHash, ratingVersion: q.ratingVersion,
        seedBase: q.seedBase, jobs: gq.jobs === undefined ? null : gq.jobs, guardMs: q.guardMs,
        started: q.started, finished: q.finished, totals: q.totals, machine: q.machine
      },
      publication: {
        sources: ident.sources, acceptedSources: expect ? expect.publicationSources : null,
        equalsAccepted: expect ? ident.sources === expect.publicationSources : null,
        measuredSourcesAccepted: expect ? expect.measuredSources : null,
        measuredEqualsAccepted: expect ? q.engine.sources === expect.measuredSources : null,
        qualifierHashNow: ident.qualifierHash,
        qualifierHashEqualsRecord: ident.qualifierHash === q.qualifierHash,
        proof: env.proof
      },
      tools: files,
      identities: {
        hashIdentity: ident.hashIdentity, acceptedHashIdentity: expect ? expect.hashIdentity : null,
        hashIdentityEqualsAccepted: expect ? ident.hashIdentity === expect.hashIdentity : null,
        replayIdentity: ident.replayIdentity, acceptedReplayIdentity: expect ? expect.replayIdentity : null,
        replayIdentityEqualsAccepted: expect ? ident.replayIdentity === expect.replayIdentity : null,
        engineFiles: ident.engineFileCount
      },
      declarations: {
        loadedFiles: decl.files.length, loader: 'tests/replay-fixtures.js loadFixtures',
        perfCellsEqualPublished: decl.perfCells.length === publishedKeys.length &&
          decl.perfCells.every((k) => publishedKeys.indexOf(k) !== -1),
        attemptsByVariant: decl.attempts
      },
      node: process.version,
      machine: machine,
      machineEqualsGq: ['cpu', 'logicalProcessors', 'memoryGb', 'platform', 'node']
        .every((k) => machine[k] === gq[k]),
      git: env.git,
      protocol: {
        runs: GP_RUNS, seedBase: 7000, seedStride: 101, warmup: 0, trace: 'summary', jobs: 1,
        comparison: 'p95 < target, strict, unrounded (no SG_TIME_FACTOR)', gate: gate,
        alertLimitSeconds: ALERT_LIMIT_SECONDS, hardLimitSeconds: HARD_LIMIT_SECONDS,
        gqProtocol: 'trace off, jobs 4, guard 120000 ms, seeds 20260601 base: a scheduling signal only'
      },
      exactTimesAreFourDecimals: projections.every((p) => p.proj.exactDecimal)
    }
  };
}

// -------------------------------------------------------------------------------------------------
// Text output
// -------------------------------------------------------------------------------------------------

const pad = (text, width, left) => {
  const s = String(text);
  if (s.length >= width) return s;
  return left ? s + ' '.repeat(width - s.length) : ' '.repeat(width - s.length) + s;
};

/** The complete table and the summary lines of an output object. */
function render(out) {
  const lines = [];
  const proj = new Map(out.projections.map((p) => [p.key, p]));
  lines.push('MS18d GP preflight: read-only, no timing or admission approval');
  const inp = out.inputs;
  lines.push('qualification ' + inp.qualification.path + ' sha256 ' + out.qualificationHash +
    (inp.qualification.equalsAccepted === null ? '' : inp.qualification.equalsAccepted
      ? ' (accepted base)' : ' (NOT the accepted base)'));
  lines.push('GQ measured sources ' + inp.qualification.measuredSources + '; tree sources now ' +
    inp.publication.sources + (inp.publication.equalsAccepted ? ' (publication, accepted)' : ''));
  lines.push('Node ' + inp.node + '; ' + inp.machine.cpu + ', ' + inp.machine.logicalProcessors +
    ' logical, ' + inp.machine.memoryGb + ' GB, ' + inp.machine.platform + '; same machine class as GQ: ' +
    inp.machineEqualsGq);
  lines.push('published cells ' + out.publishedCells.length + '; GP protocol ' + inp.protocol.gate.cells +
    ' cells x ' + GP_RUNS + ' = ' + inp.protocol.gate.requests + ' requests, at least ' +
    inp.protocol.gate.minSuccesses + ' successes');
  lines.push('');
  lines.push(pad('cell', 22, true) + pad('n', 4) + pad('mean', 11) + pad('p50', 10) + pad('p95 (q)', 11) +
    pad('max', 11) + pad('alert s', 10) + pad('target', 7) + pad('pred', 7) + pad('ceil3q', 7) +
    pad('budget', 7) + '  proposed');
  out.targetProposal.rows.forEach((r) => {
    const p = proj.get(r.key);
    lines.push(pad(r.key, 22, true) + pad(p.requests, 4) + pad(p.mean.toFixed(4), 11) +
      pad(p.p50.toFixed(4), 10) + pad(p.p95.toFixed(4), 11) + pad(p.max.toFixed(4), 11) +
      pad(p.meanAlertSeconds.toFixed(3), 10) + pad(r.oldTarget, 7) + pad(r.predecessor, 7) +
      pad(r.ceil3q, 7) + pad(r.budget, 7) + '  ' +
      (r.action === 'keep' ? 'keep' : String(r.proposedTarget) + ' (' + r.decidedBy + ')') +
      (p.flagged ? '  FLAGGED' : ''));
  });
  lines.push('');
  const s = out.targetProposal.summary;
  lines.push('target proposal: ' + s.cells + ' cells, ' + s.kept + ' kept, ' + s.changed + ' changed');
  out.targetProposal.changes.forEach((c) => {
    lines.push('  ' + pad(c.key, 22, true) + 'q ' + pad(c.q.toFixed(4), 11) + '  ' + pad(c.oldTarget, 6) +
      ' -> ' + pad(c.proposedTarget, 6) + '  (' + c.decidedBy + ')');
  });
  out.targetProposal.anomalies.forEach((a) => lines.push('  ANOMALY ' + a));
  lines.push('sum of the mean alerts ' + out.totals.sumOfMeanAlertSeconds + ' s (not a GP runtime forecast)');
  lines.push('largest mean alerts: ' + out.totals.largestMeanAlerts
    .map((p) => p.key + ' ' + p.meanAlertSeconds.toFixed(3) + ' s').join('; '));
  lines.push('cells with 50 x observed GQ max above ' + ALERT_LIMIT_SECONDS + ' s (' +
    out.totals.cellsWithMaxAlertOver450.length + ', descriptive only): ' +
    out.totals.cellsWithMaxAlertOver450.join(', '));
  lines.push('FLAGGED (mean alert above ' + ALERT_LIMIT_SECONDS + ' s): ' + (out.flagged.length === 0 ? 'none'
    : out.flagged.map((f) => f.key + ' n=' + f.requests + ' mean ' + f.mean + ' ms alert ' +
      f.meanAlertSeconds + ' s').join('; ')));
  lines.push('UNKNOWN whole-command planning basis (unadmitted, not approved): all ' +
    out.projections.length + ' cells; ' + out.totals.unadmittedWithoutBasis + ' of them are below the ' +
    ALERT_LIMIT_SECONDS + ' s mean alert but still have no reviewed basis');
  return lines;
}

// -------------------------------------------------------------------------------------------------
// Command line
// -------------------------------------------------------------------------------------------------

const USAGE = 'Usage: node project-gp.js --qualification=<file> --json=<file>';

function parseArgs(argv) {
  const opts = { qualification: null, json: null, help: false };
  argv.forEach((arg) => {
    let m;
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if ((m = /^--qualification=(.+)$/.exec(arg))) opts.qualification = m[1];
    else if ((m = /^--json=(.+)$/.exec(arg))) opts.json = m[1];
    else throw new InputError(['unknown argument ' + arg]);
  });
  return opts;
}

const crlf = (text) => text.replace(/\r?\n/g, '\r\n');

/**
 * The command. `io` replaces the console, the working directory and the tree-dependent inputs (the synthetic
 * tests use it); the defaults are the real ones. Returns the exit code.
 */
function main(argv, io) {
  const env = Object.assign({
    out: console.log, err: console.error, cwd: process.cwd(), generator: GENERATOR, expect: ACCEPTED,
    loadDeclarations: null, identities: null, machine: null, git: undefined, proof: null, records: null
  }, io || {});
  try {
    const opts = parseArgs(argv);
    if (opts.help) {
      env.out(USAGE);
      return 0;
    }
    if (!opts.qualification || !opts.json) throw new InputError([USAGE]);
    const qualificationFile = path.resolve(env.cwd, opts.qualification);
    const jsonFile = path.resolve(env.cwd, opts.json);
    const rel = path.relative(REPO, jsonFile);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new InputError(['--json must be a file inside the repository']);
    }
    if (!fs.existsSync(qualificationFile)) throw new InputError(['missing ' + opts.qualification]);
    const bytes = fs.readFileSync(qualificationFile);
    let qualification;
    try {
      qualification = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    } catch (err) {
      throw new InputError([opts.qualification + ' is not valid JSON: ' + err.message]);
    }
    const loader = env.loadDeclarations || (() => loadDeclarations(
      require(path.join(env.generator, 'tests', 'replay-fixtures.js')).loadFixtures, env.generator));
    const output = build({
      qualification: qualification, qualificationBytes: bytes.length, qualificationHash: sha256(bytes),
      qualificationPath: posix(qualificationFile), declarations: loader(),
      records: env.records || loadRecords(env.generator), expect: env.expect,
      env: {
        identities: env.identities || computeIdentities(env.generator), machine: env.machine || machineNow(),
        git: env.git !== undefined ? env.git : gitState(), proof: env.proof || publicationProof(REPO)
      }
    });
    fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
    const part = jsonFile + '.part';
    fs.writeFileSync(part, crlf(JSON.stringify(output, null, 2)) + '\r\n', 'utf8');
    fs.renameSync(part, jsonFile);
    render(output).forEach((line) => env.out(line));
    env.out('wrote ' + posix(jsonFile));
    return output.flagged.length > 0 ? 1 : 0;
  } catch (err) {
    if (!(err instanceof InputError)) throw err;
    err.problems.forEach((p) => env.err('INVALID: ' + p));
    return 2;
  }
}

module.exports = {
  ACCEPTED, InputError, scaledMs, ceilTriple, minSuccesses, projectRequests, targetProposal, loadDeclarations,
  loadRecords, computeIdentities, build, render, main, GP_RUNS, ALERT_LIMIT_SECONDS
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));
