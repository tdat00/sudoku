#!/usr/bin/env node
'use strict';

/*
 * MS05r4: the R5 selection of the shallow-search allowance, computed from the raw rows of the soak ledgers.
 *
 *   node tests/artifacts/difficulty-v3/MS05r4/select-cap.cjs --declare=<manifest.json>
 *   node tests/artifacts/difficulty-v3/MS05r4/select-cap.cjs --manifest=<manifest.json> --selection=<dir>
 *        --diagnostic=<dir> --out=<selection.json>
 *
 * --declare writes the frozen manifest before anything is measured: the identity of the sources and tools, the
 * six cells of the rule (classic9 normal, master, nightmare; killer hard, expert; jigsaw9 expert), their 12
 * requests each (tag `variant:level:index` and the seed of the pipeline route) for each of the four settings
 * 64, 128, 256 and none (288 requests), and the 12 separate diagnostic outcomes (G13, mega12 Nightmare and mega16
 * Nightmare at the four settings). The selection reads `<dir>/<setting>/*.json` (soak ledgers, whole cells or
 * absolute-index shards) and `<diagnostic>/<setting>/<case>.json` (records of tests/difficulty-recovery.js),
 * merges the shards of each (setting, cell) with SG.fixtures.difficultyDiagnostics.mergeShards (indexes 0..11
 * once, tags, same source/tool/Node/setting), checks the rows against the manifest and computes, per cell, the
 * exact hits (`row.generationExact === true`, every error a miss) and the upper median of `row.fullRatings`
 * (sorted index floor(12 / 2)), never from a shard summary. The rule (the owner's R5, unchanged):
 *
 *   Choose the smallest finite cap with no exact-hit loss in any cell against no extra cap and a strict
 *   reduction in median full ratings in at least one cell. Otherwise choose no extra cap.
 *
 * Unknown work, a work mismatch, a gap, a duplicate, mixed sources or a failed invariant block the selection
 * (status `blocked`, never a guessed number). Exit code: 0 for status `selected` or `none` (the file says which;
 * `none` is an owner stop of the recovery), 1 for `blocked`, 2 for a usage error. An existing output is refused.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const GENERATOR = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');

const SETTINGS = ['64', '128', '256', 'none'];
const FINITE = ['64', '128', '256'];
const SEED_BASE = 20260101;
const REQUESTS = 12;
const CELLS = [
  { variant: 'classic9', level: 'normal' }, { variant: 'classic9', level: 'master' },
  { variant: 'classic9', level: 'nightmare' }, { variant: 'killer', level: 'hard' },
  { variant: 'killer', level: 'expert' }, { variant: 'jigsaw9', level: 'expert' }
];
const CASES = ['G13', 'mega12-nightmare', 'mega16-nightmare'];
const RULE = 'Choose the smallest finite cap with no exact-hit loss in any cell against no extra cap and a ' +
  'strict reduction in median full ratings in at least one cell. Otherwise choose no extra cap.';
const SOURCE_FILES_OF_TOOL = ['tests/soak.js', 'tests/fixtures/perf-helper.js',
  'tests/fixtures/difficulty-diagnostics.js'];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function cellKey(cell) {
  return cell.variant + '/' + cell.level;
}

/** The same FNV-1a seed as `seedFor` of tests/soak.js (the pipeline route). */
function seedFor(tag, base) {
  let h = (2166136261 ^ base) >>> 0;
  for (let k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
  return h;
}

/** JSON with the keys of every object sorted, so that a hash does not depend on the order of the keys. */
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') +
      '}';
  }
  return JSON.stringify(value);
}

function text(value) {
  return JSON.stringify(value, null, 2).replace(/\n/g, '\r\n') + '\r\n';
}

/**
 * The frozen manifest: identity (`frozen`: sourceHash, toolHash, node), the six cells with the tag and the
 * pipeline seed of each of their 12 requests, the four settings, and the 12 diagnostic outcomes.
 * `routes` maps a variant id to 'direct' or 'pipeline' (the route of tests/soak.js).
 */
function declareManifest(routes, frozen) {
  const cells = CELLS.map((cell) => {
    const route = routes[cell.variant];
    if (route !== 'direct' && route !== 'pipeline') throw new Error('no route for ' + cell.variant);
    const requests = [];
    for (let index = 0; index < REQUESTS; index++) {
      const tag = cell.variant + ':' + cell.level + ':' + index;
      requests.push({ index: index, tag: tag, pipelineSeed: route === 'pipeline' ? seedFor(tag, SEED_BASE) : null });
    }
    return { variant: cell.variant, level: cell.level, route: route, requests: requests };
  });
  const diagnostics = [];
  SETTINGS.forEach((setting) => CASES.forEach((id) => diagnostics.push({ case: id, setting: setting })));
  const body = {
    schema: 1, task: 'MS05r4', rule: RULE, seedBase: SEED_BASE, requestsPerCell: REQUESTS, settings: SETTINGS.slice(),
    frozen: frozen, cells: cells, diagnostics: diagnostics,
    counts: { selecting: SETTINGS.length * cells.length * REQUESTS, diagnostic: diagnostics.length }
  };
  return Object.assign({ manifestHash: sha256(canonical(body)) }, body);
}

function manifestBody(manifest) {
  const body = Object.assign({}, manifest);
  delete body.manifestHash;
  return body;
}

/** The upper median: the value at sorted index floor(n / 2). */
function upperMedian(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function sumBy(rows, pick) {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

/**
 * The hits and the upper median of the 12 merged rows of a cell: { ok, problems, stats }. A row whose work is
 * not known (a work check that is not 'ok', or a count that is not an integer) is never a zero: it is a problem
 * and there are no statistics. Error rows are misses and stay in the twelve with the work they report.
 */
function cellStats(rows) {
  const problems = [];
  if (rows.length !== REQUESTS) problems.push(rows.length + ' rows, not ' + REQUESTS);
  rows.forEach((row) => {
    if (row.outcome !== 'ok' && row.outcome !== 'error') {
      problems.push('index ' + row.index + ': outcome ' + String(row.outcome));
    }
    if (typeof row.generationExact !== 'boolean') problems.push('index ' + row.index + ': no generationExact');
    const status = row.workCheck ? row.workCheck.status : 'missing';
    if (status !== 'ok') {
      problems.push('index ' + row.index + ': work check ' + status +
        (row.workCheck && row.workCheck.reason ? ' (' + row.workCheck.reason + ')' : ''));
    } else if (!Number.isInteger(row.fullRatings) || row.fullRatings < 0) {
      problems.push('index ' + row.index + ': fullRatings ' + String(row.fullRatings));
    }
  });
  if (problems.length > 0) return { ok: false, problems: problems, stats: null };
  const ratings = rows.map((row) => row.fullRatings);
  const hits = rows.filter((row) => row.generationExact === true);
  const hit = (pick) => (row) => (row.capHits ? row.capHits[pick] : 0);
  return {
    ok: true,
    problems: [],
    stats: {
      requests: rows.length,
      hits: hits.length,
      hitIndexes: hits.map((row) => row.index),
      errors: rows.filter((row) => row.outcome === 'error').length,
      upperMedian: upperMedian(ratings),
      fullRatings: ratings.slice().sort((a, b) => a - b),
      sumFullRatings: sumBy(rows, (row) => row.fullRatings),
      sumProposals: sumBy(rows, (row) => row.proposals),
      sumLocalRatings: sumBy(rows, (row) => row.localRatings),
      sumShallowRatings: sumBy(rows, (row) => row.shallowRatings),
      capHits: { shallow: sumBy(rows, hit('shallow')), ratings: sumBy(rows, hit('ratings')),
        proposals: sumBy(rows, hit('proposals')) },
      generationMsTotal: Math.round(sumBy(rows, (row) => row.generationMs) * 1000) / 1000,
      references: { first: rows[0].referenceStatus, last: rows[rows.length - 1].referenceStatus }
    }
  };
}

/**
 * The rule. `table[setting][cellKey]` is { hits, upperMedian }. The finite settings are tried from the smallest;
 * a setting is eligible when no cell has fewer hits than with no extra cap (`none`) and at least one cell has
 * a strictly lower median of full ratings; the smallest eligible one is chosen, else null (none).
 */
function decide(table, keys) {
  const comparisons = FINITE.map((setting) => {
    const perCell = keys.map((key) => {
      const a = table[setting][key];
      const n = table.none[key];
      return {
        cell: key, hits: a.hits, noneHits: n.hits, hitDelta: a.hits - n.hits, hitLoss: a.hits < n.hits,
        upperMedian: a.upperMedian, noneUpperMedian: n.upperMedian, medianDelta: a.upperMedian - n.upperMedian,
        strictReduction: a.upperMedian < n.upperMedian
      };
    });
    const hitLossCells = perCell.filter((c) => c.hitLoss).map((c) => c.cell);
    const reductionCells = perCell.filter((c) => c.strictReduction).map((c) => c.cell);
    return {
      setting: setting, hitLossCells: hitLossCells, reductionCells: reductionCells,
      eligible: hitLossCells.length === 0 && reductionCells.length > 0, perCell: perCell
    };
  });
  const eligible = comparisons.filter((c) => c.eligible).map((c) => c.setting);
  return { comparisons: comparisons, eligible: eligible, chosen: eligible.length > 0 ? eligible[0] : null };
}

const SHARED_META = ['acceptance', 'sourceHash', 'sourceFiles', 'toolHash', 'node', 'seedBase'];
const SHARED_MANIFEST = ['ratingVersion', 'quick', 'perCombo', 'includeUnsupported', 'weights', 'bands',
  'referenceBudgetMs'];

function identityOf(ledger) {
  const out = {};
  SHARED_META.forEach((k) => { out[k] = ledger.meta[k]; });
  SHARED_MANIFEST.forEach((k) => { out[k] = ledger.meta.manifest[k]; });
  return out;
}

function checksProblems(label, ledger) {
  const checks = ledger.summary && ledger.summary.checks;
  if (!checks) return [label + ': no checks in the summary'];
  const out = [];
  const invariants = Object.keys(checks.invariantViolations || {})
    .reduce((sum, k) => sum + checks.invariantViolations[k], 0);
  if (invariants > 0) out.push(label + ': ' + invariants + ' invariant violation(s)');
  if ((checks.checkErrors || []).length > 0) out.push(label + ': ' + checks.checkErrors.length + ' check error(s)');
  if (checks.workUnavailable > 0) out.push(label + ': work unavailable for ' + checks.workUnavailable + ' request(s)');
  if (checks.pathMismatches > 0) out.push(label + ': ' + checks.pathMismatches + ' final-path mismatch(es)');
  return out;
}

/**
 * The whole analysis. input: { manifest, ledgers: [{ setting, file, sha256, ledger }], diagnostics: [{ setting,
 * case, file, sha256, record }] }, env: { mergeShards }. Returns the selection object; `decision.status` is
 * 'selected', 'none' or 'blocked' (then `decision.chosen` is undefined and `decision.problems` says why).
 */
function analyse(input, env) {
  const manifest = input.manifest;
  const problems = [];
  const cells = {};
  const table = {};
  SETTINGS.forEach((s) => { table[s] = {}; });

  if (sha256(canonical(manifestBody(manifest))) !== manifest.manifestHash) {
    problems.push('the manifest does not match its manifestHash');
  }
  const frozen = manifest.frozen || {};
  const byCell = {};
  input.ledgers.forEach((entry) => {
    const ledger = entry.ledger;
    const label = entry.file;
    if (SETTINGS.indexOf(entry.setting) === -1) {
      problems.push(label + ': unknown setting folder ' + entry.setting);
      return;
    }
    const cellList = ledger && ledger.meta && ledger.meta.manifest && ledger.meta.manifest.cells;
    if (!Array.isArray(cellList) || cellList.length !== 1) {
      problems.push(label + ': not a ledger of exactly one cell');
      return;
    }
    const key = cellKey({ variant: cellList[0].variant, level: cellList[0].level });
    if (!manifest.cells.some((c) => cellKey(c) === key)) {
      problems.push(label + ': ' + key + ' is not a cell of the rule');
      return;
    }
    const expectedCap = entry.setting === 'none' ? null : Number(entry.setting);
    if (ledger.meta.shallowCap !== entry.setting || ledger.meta.shallowSearchRatings !== expectedCap) {
      problems.push(label + ': the ledger says shallowCap ' + String(ledger.meta.shallowCap) + ' (' +
        String(ledger.meta.shallowSearchRatings) + ') but sits in the folder of ' + entry.setting);
      return;
    }
    const slot = entry.setting + '|' + key;
    (byCell[slot] = byCell[slot] || []).push(entry);
  });

  const identities = [];
  const files = [];
  manifest.cells.forEach((planned) => {
    const key = cellKey(planned);
    cells[key] = {};
    SETTINGS.forEach((setting) => {
      const entries = byCell[setting + '|' + key] || [];
      const label = setting + ' ' + key;
      if (entries.length === 0) {
        problems.push(label + ': no ledger');
        return;
      }
      entries.forEach((entry) => files.push({ file: entry.file, sha256: entry.sha256, setting: setting, cell: key,
        from: entry.ledger.meta.manifest.cells[0].from, requests: entry.ledger.meta.manifest.cells[0].requests }));
      const merged = env.mergeShards(entries.map((entry) => entry.ledger));
      if (!merged.ok) {
        merged.problems.forEach((p) => problems.push(label + ': ' + p));
        return;
      }
      let sound = true;
      entries.forEach((entry) => {
        const meta = entry.ledger.meta;
        const cell = meta.manifest.cells[0];
        identities.push({ file: entry.file, identity: identityOf(entry.ledger) });
        checksProblems(entry.file, entry.ledger).forEach((p) => { problems.push(p); sound = false; });
        if (cell.logicalTotal !== REQUESTS || canonical(cell.referenceIndexes) !== canonical([0, REQUESTS - 1])) {
          problems.push(entry.file + ': logical total ' + cell.logicalTotal + ', references ' +
            canonical(cell.referenceIndexes));
          sound = false;
        }
        if (cell.route !== planned.route) {
          problems.push(entry.file + ': route ' + cell.route + ', planned ' + planned.route);
          sound = false;
        }
        if (meta.seedBase !== manifest.seedBase) {
          problems.push(entry.file + ': seed base ' + meta.seedBase);
          sound = false;
        }
      });
      merged.rows.forEach((row, i) => {
        const want = planned.requests[i];
        if (row.index !== want.index || row.tag !== want.tag || row.pipelineSeed !== want.pipelineSeed) {
          problems.push(label + ': row ' + i + ' is ' + row.tag + ' seed ' + row.pipelineSeed + ', planned ' +
            want.tag + ' seed ' + want.pipelineSeed);
          sound = false;
        }
      });
      const result = cellStats(merged.rows);
      result.problems.forEach((p) => problems.push(label + ': ' + p));
      if (result.ok && sound) {
        cells[key][setting] = Object.assign({ shards: entries.map((e) => e.file) }, result.stats);
        table[setting][key] = { hits: result.stats.hits, upperMedian: result.stats.upperMedian };
      }
    });
  });

  // One source, one tool, one Node and the same settings other than the compared cap, for all ledgers.
  if (identities.length > 0) {
    const first = identities[0];
    identities.forEach((entry) => {
      Object.keys(first.identity).forEach((k) => {
        if (canonical(entry.identity[k]) !== canonical(first.identity[k])) {
          problems.push(entry.file + ' differs from ' + first.file + ' in ' + k);
        }
      });
    });
    ['sourceHash', 'toolHash', 'node'].forEach((k) => {
      if (frozen[k] !== undefined && first.identity[k] !== frozen[k]) {
        problems.push(k + ' of the ledgers is ' + first.identity[k] + ', the manifest froze ' + frozen[k]);
      }
    });
  }

  const keys = manifest.cells.map(cellKey);
  const complete = keys.every((key) => SETTINGS.every((setting) => table[setting][key] !== undefined));
  const blocked = problems.length > 0 || !complete;
  const outcome = blocked ? null : decide(table, keys);
  const decision = blocked
    ? { status: 'blocked', problems: problems }
    : { status: outcome.chosen === null ? 'none' : 'selected', chosen: outcome.chosen, eligible: outcome.eligible,
      problems: [] };

  const diagnostics = diagnosticsOf(input.diagnostics || [], manifest);
  return {
    schema: 1,
    task: 'MS05r4',
    rule: RULE,
    decision: decision,
    identity: {
      sourceHash: identities.length > 0 ? identities[0].identity.sourceHash : null,
      toolHash: identities.length > 0 ? identities[0].identity.toolHash : null,
      node: identities.length > 0 ? identities[0].identity.node : null,
      seedBase: manifest.seedBase,
      manifestHash: manifest.manifestHash,
      configHash: sha256(canonical({ seedBase: manifest.seedBase, requestsPerCell: manifest.requestsPerCell,
        settings: manifest.settings, cells: manifest.cells.map(cellKey), rule: RULE })),
      selectingRequests: manifest.counts.selecting,
      diagnosticOutcomes: manifest.counts.diagnostic
    },
    cells: cells,
    comparisons: outcome === null ? null : outcome.comparisons,
    diagnostics: diagnostics,
    inputs: files
  };
}

/** The recorded outcome of each of the 12 diagnostics, or why one is missing or untrustworthy. */
function diagnosticsOf(records, manifest) {
  return manifest.diagnostics.map((planned) => {
    const entry = records.find((r) => r.setting === planned.setting && r.case === planned.case);
    if (!entry) return { case: planned.case, setting: planned.setting, status: 'missing', file: null };
    const r = entry.record;
    const problems = [];
    if (r.caseId !== planned.case) problems.push('case ' + r.caseId);
    if (r.mode !== 'diagnostic') problems.push('mode ' + r.mode);
    const wantCap = planned.setting;
    if (r.capSetting !== wantCap) problems.push('setting ' + String(r.capSetting));
    if (r.complete !== true) problems.push('record not complete');
    return {
      case: planned.case, setting: planned.setting, file: entry.file, sha256: entry.sha256,
      status: problems.length === 0 ? 'recorded' : 'invalid', problems: problems, outcome: r.outcome,
      complete: r.complete, error: r.error ? r.error.code : null, exact: r.exact, required: r.required,
      attempts: r.attempts, samples: r.samples, generationMs: r.generationMs,
      effectiveMaxAttempts: r.effectiveMaxAttempts, warnings: r.warnings, score: r.score, achieved: r.achieved,
      work: r.work, workUnavailableReason: r.workUnavailableReason, sourceHash: r.sourceHash, toolHash: r.toolHash,
      node: r.node, instrumentationProblems: r.instrumentationProblems
    };
  });
}

// ---- command line -----------------------------------------------------------------------------------

function usageError(message) {
  const err = new Error(message);
  err.usage = true;
  return err;
}

function parseArgs(argv) {
  const opts = { declare: null, manifest: null, selection: null, diagnostic: null, out: null };
  argv.forEach((arg) => {
    const m = /^--(declare|manifest|selection|diagnostic|out)=(.+)$/.exec(arg);
    if (!m) throw usageError('unknown argument ' + arg);
    opts[m[1]] = m[2];
  });
  if (opts.declare !== null) {
    if (Object.keys(opts).some((k) => k !== 'declare' && opts[k] !== null)) {
      throw usageError('--declare is used alone');
    }
    return opts;
  }
  ['manifest', 'selection', 'diagnostic', 'out'].forEach((k) => {
    if (opts[k] === null) throw usageError('--' + k + ' is required (or --declare=<file> alone)');
  });
  return opts;
}

function projectPath(p) {
  if (path.isAbsolute(p)) throw usageError(p + ': give a project-relative path, not an absolute one');
  const abs = path.resolve(process.cwd(), p);
  const rel = path.relative(REPO, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) throw usageError(p + ': outside the repository');
  return abs;
}

function show(abs) {
  return path.relative(REPO, abs).split(path.sep).join('/');
}

function readJson(abs) {
  const raw = fs.readFileSync(abs, 'utf8');
  return { raw: raw, value: JSON.parse(raw.replace(/^\uFEFF/, '')) };
}

/** The identity of the sources and the soak tool, built as tests/soak.js builds it (LF line ends, `<path>\0<text>`). */
function frozenIdentity() {
  const runner = fs.readFileSync(path.join(GENERATOR, 'tests/node-runner.js'), 'utf8');
  const list = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g) || [])
    .map((s) => s.slice(1, -1));
  const read = (rel) => fs.readFileSync(path.join(GENERATOR, rel), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const source = crypto.createHash('sha256');
  list.filter((rel) => fs.existsSync(path.join(GENERATOR, rel)))
    .forEach((rel) => source.update(rel + '\0' + read(rel)));
  const tool = crypto.createHash('sha256');
  SOURCE_FILES_OF_TOOL.filter((rel) => fs.existsSync(path.join(GENERATOR, rel)))
    .forEach((rel) => tool.update(rel + '\0' + read(rel)));
  return { sourceHash: source.digest('hex'), toolHash: tool.digest('hex'), node: process.version };
}

function loadTools() {
  const loader = require(path.join(GENERATOR, 'tests', 'replay-fixtures.js'));
  return loader;
}

function routesOfEngine(loader) {
  loader.nodeEnv().engine();
  const SG = globalThis.SG;
  const routes = {};
  CELLS.forEach((cell) => {
    const def = SG.variants.list().find((d) => d.id === cell.variant);
    if (!def) throw new Error('variant ' + cell.variant + ' is not registered');
    routes[cell.variant] = def.digStrategy || def.postGenerate || def.build.length >= 2 ? 'pipeline' : 'direct';
  });
  return routes;
}

function listJson(dir) {
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
}

function summaryText(selection) {
  const lines = [];
  const decision = selection.decision;
  lines.push('R5 selection: ' + decision.status + (decision.status === 'blocked' ? '' :
    ', chosen ' + (decision.chosen === null ? 'none (no extra cap)' : decision.chosen)));
  if (decision.status === 'blocked') {
    decision.problems.slice(0, 40).forEach((p) => lines.push('  problem: ' + p));
    if (decision.problems.length > 40) lines.push('  ... ' + (decision.problems.length - 40) + ' more');
    return lines.join('\n');
  }
  Object.keys(selection.cells).forEach((key) => {
    const parts = SETTINGS.map((s) => s + ': ' + selection.cells[key][s].hits + ' hits, median ' +
      selection.cells[key][s].upperMedian);
    lines.push('  ' + key + '  ' + parts.join(' | '));
  });
  selection.comparisons.forEach((c) => lines.push('  ' + c.setting + ': eligible ' + c.eligible + ', hit loss in [' +
    c.hitLossCells.join(', ') + '], strict reduction in [' + c.reductionCells.join(', ') + ']'));
  lines.push('  eligible finite: [' + decision.eligible.join(', ') + ']');
  return lines.join('\n');
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
    if (opts.declare !== null) {
      const out = projectPath(opts.declare);
      if (fs.existsSync(out)) throw usageError(opts.declare + ': exists already (never overwritten)');
      const manifest = declareManifest(routesOfEngine(loadTools()), frozenIdentity());
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, text(manifest), { encoding: 'utf8', flag: 'wx' });
      console.log('declared ' + manifest.counts.selecting + ' selecting requests and ' + manifest.counts.diagnostic +
        ' diagnostic outcomes: ' + show(out) + ' (manifestHash ' + manifest.manifestHash + ')');
      return 0;
    }
    const out = projectPath(opts.out);
    if (fs.existsSync(out)) throw usageError(opts.out + ': exists already (never overwritten)');
    const manifestFile = projectPath(opts.manifest);
    const selectionDir = projectPath(opts.selection);
    const diagnosticDir = projectPath(opts.diagnostic);
    const manifest = readJson(manifestFile).value;
    const ledgers = [];
    SETTINGS.forEach((setting) => {
      const dir = path.join(selectionDir, setting);
      if (!fs.existsSync(dir)) return;
      listJson(dir).forEach((name) => {
        const parsed = readJson(path.join(dir, name));
        ledgers.push({ setting: setting, file: show(path.join(dir, name)), sha256: sha256(parsed.raw),
          ledger: parsed.value });
      });
    });
    const records = [];
    SETTINGS.forEach((setting) => {
      const dir = path.join(diagnosticDir, setting);
      if (!fs.existsSync(dir)) return;
      listJson(dir).forEach((name) => {
        const parsed = readJson(path.join(dir, name));
        records.push({ setting: setting, case: path.basename(name, '.json'), file: show(path.join(dir, name)),
          sha256: sha256(parsed.raw), record: parsed.value });
      });
    });
    loadTools().loadFixtures(['tests/fixtures/difficulty-diagnostics.js']);
    const selection = analyse({ manifest: manifest, ledgers: ledgers, diagnostics: records },
      { mergeShards: globalThis.SG.fixtures.difficultyDiagnostics.mergeShards });
    selection.aggregator = { file: show(__filename), sha256: sha256(fs.readFileSync(__filename, 'utf8')
      .replace(/\r\n/g, '\n')) };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text(selection), { encoding: 'utf8', flag: 'wx' });
    console.log(summaryText(selection));
    console.log('written: ' + show(out));
    return selection.decision.status === 'blocked' ? 1 : 0;
  } catch (err) {
    if (err && err.usage) {
      console.error(err.message);
      return 2;
    }
    console.error(err && err.stack ? err.stack : String(err));
    return 2;
  }
}

module.exports = {
  SETTINGS: SETTINGS, FINITE: FINITE, CELLS: CELLS, CASES: CASES, REQUESTS: REQUESTS, SEED_BASE: SEED_BASE,
  seedFor: seedFor, canonical: canonical, declareManifest: declareManifest, upperMedian: upperMedian,
  cellStats: cellStats, decide: decide, analyse: analyse, parseArgs: parseArgs, main: main
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));
