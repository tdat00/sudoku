'use strict';

/*
 * MS18c Stage 1 task-owned, PURE (no I/O, no clock, no solver, no generator): the agreed structural rule of
 * the GQ-only ceilings (method MS18c-GQ-structural-v1; SA1/SA2 agreement relayed 2026-11-18 22:42 +07:00,
 * brief sections "Agreed structural ceiling rule" and "Agreed runtime monitor"), the premises of one cell,
 * the checks of the 135 rows, the two renderers of the preflight and a REFERENCE evaluation of the runtime
 * monitor over a qualifier cell record, so that test-rules.cjs can run all of it on fake data.
 *
 * It chooses no number: every constant is the brief's and every derived number must equal the brief's
 * table. It approves nothing: a row is `awaiting Stage 2`, and no object built here carries an approval
 * (Stage 2 is a joint SA1/SA2 decision; Stage 3 also needs the recorded Q3 answer). The monitor function is
 * the reference check for Stage 2 review and for fake-data tests; it is not a supervisor.
 */

const METHOD = 'MS18c-GQ-structural-v1';
const POLICY = 'MS18c-GQ-host-active';
const BINDING = 'awaiting Stage 2';
const SCHEMA = 'MS18c-gq-cells-v1';

const VARIANTS = Object.freeze(['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX',
  'hyper', 'jigsaw9', 'killer', 'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku']);
const LEVELS = Object.freeze(['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
  'hell2']);

// The unchanged protocol of tests/qualify.js (PROTOCOL of tests/fixtures/qualification-records.js).
const PROTOCOL = Object.freeze({
  jobs: 4, seedBase: 20260601, firstSeeds: 40, moreSeeds: 60, guardMs: 120000, earlyStop: 'default',
  singleCell: true, probe: 0
});
const ALLOWANCES = Object.freeze({ H: 60, D: 10, V: 10, epsilon: 1 });
const G = PROTOCOL.guardMs / 1000 + ALLOWANCES.D + ALLOWANCES.V + ALLOWANCES.epsilon;
// O = T + two 20-minute acquisition waits + 300 s of release settling, spacing, startup, output, cleanup.
const WAITS = Object.freeze({ acquisitionWaits: 2, acquisitionWaitSeconds: 1200, settleSeconds: 300 });
const OUTER_EXTRA = WAITS.acquisitionWaits * WAITS.acquisitionWaitSeconds + WAITS.settleSeconds;
const BUDGETS = Object.freeze([2, 10, 30]);
const CLASS_COUNTS = Object.freeze({ 2: 18, 10: 63, 30: 54 });
const BRIEF_TABLE = Object.freeze({
  2: Object.freeze({ P: 1751, A: 1770, T: 2220, O: 4920 }),
  10: Object.freeze({ P: 2271, A: 2280, T: 2850, O: 5550 }),
  30: Object.freeze({ P: 3571, A: 3600, T: 4500, O: 7200 })
});
const OUTER_CAPS = Object.freeze({ A: 9600, T: 12000 });
const MAX_REQUEST_MS = 130000;
const SLOW_NO_STOP = 5;
const SLOW_FIRST_ROUND_STOP = 9;
const SLOW_SECOND_ROUND = 6;
const HEX16 = /^[0-9a-f]{16}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

const isCount = (x) => Number.isInteger(x) && x >= 1;
const isNumber = (x) => typeof x === 'number' && Number.isFinite(x);

/** JSON with the keys of every object sorted: equal data gives equal text. */
function canon(value) {
  if (Array.isArray(value)) return '[' + value.map(canon).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().filter((k) => value[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + canon(value[k])).join(',') + '}';
  }
  const text = JSON.stringify(value);
  return text === undefined ? 'undefined' : text;
}

// ---------------------------------------------------------------------------------------------------------
// The structural rule
// ---------------------------------------------------------------------------------------------------------

function needCount(cellCount) {
  if (!isCount(cellCount)) {
    throw new RangeError('cellCount ' + String(cellCount) + ' is not a whole number >= 1');
  }
}

/** p95 budget of a board in seconds (qualifier's budgetOf): 2 up to 36 cells, 10 up to 81, else 30. */
function budgetSecondsOf(cellCount) {
  needCount(cellCount);
  if (cellCount <= 36) return 2;
  return cellCount <= 81 ? 10 : 30;
}

/** Default full-grid attempts of a board (SG.digger.defaultMaxAttempts): 8 up to 81, 4 up to 144, else 2. */
function defaultAttemptsOf(cellCount) {
  needCount(cellCount);
  if (cellCount <= 81) return 8;
  return cellCount <= 144 ? 4 : 2;
}

/** R30 of numerator/denominator in exact integer arithmetic: the smallest multiple of 30 not below it. */
function roundUp30(numerator, denominator) {
  const den = denominator === undefined ? 1 : denominator;
  if (!Number.isInteger(numerator) || !Number.isInteger(den) || numerator < 0 || den < 1) {
    throw new RangeError('R30 needs a non-negative whole numerator and a positive whole denominator');
  }
  const step = 30 * den;
  return Math.floor((numerator + step - 1) / step) * 30;
}

/** b, H, D, V, epsilon, G, F and the table-derived P, A, T, O of one board budget (2, 10 or 30 seconds). */
function envelopeOf(b) {
  if (BUDGETS.indexOf(b) === -1) {
    throw new RangeError('no structural class for the board budget ' + String(b));
  }
  const F = b + ALLOWANCES.V + ALLOWANCES.epsilon;
  const P = ALLOWANCES.H + 6 * G + 65 * F;
  const A = roundUp30(P);
  const T = roundUp30(5 * A, 4);
  return {
    b: b, H: ALLOWANCES.H, D: ALLOWANCES.D, V: ALLOWANCES.V, epsilon: ALLOWANCES.epsilon, G: G, F: F, P: P,
    A: A, T: T, O: T + OUTER_EXTRA
  };
}

/**
 * The worst-case counting bounds of the structural argument, in seconds, for slow outcomes of at most G and
 * fast ones of at most F on four workers, the serial second round added: a first-round stop (at most nine
 * slow, Graham's list-scheduling bound 3G + 7.75F) and a second round after k slow outcomes among the first
 * forty (k = 0..5, at most six slow in all). For k = 0 all forty outcomes are at most F and some worker
 * runs at most nine of the first 39, so the round ends within 10F; for k >= 1 Graham's bound applies.
 */
function structuralBounds(b) {
  const F = envelopeOf(b).F;
  const bounds = { firstRoundStop: 3 * G + 7.75 * F, secondRound: [] };
  for (let k = 0; k <= 5; k++) {
    const first = k === 0 ? 10 * F : (k * G + (40 - k) * F) / 4 + 0.75 * G;
    const second = (6 - k) * G + (54 + k) * F;
    bounds.secondRound.push({ k: k, seconds: first + second });
  }
  return bounds;
}

// ---------------------------------------------------------------------------------------------------------
// Premises and rows
// ---------------------------------------------------------------------------------------------------------

/** The premises of one cell's payload: single cell, jobs 4, default early stop, no probe, default tries. */
function premisesOf(cell) {
  const counted = isCount(cell.cellCount);
  return {
    key: cell.variant + '/' + cell.level, variant: cell.variant, level: cell.level,
    cellCount: cell.cellCount, attempts: counted ? defaultAttemptsOf(cell.cellCount) : null,
    budgetSeconds: counted ? budgetSecondsOf(cell.cellCount) : null,
    jobs: PROTOCOL.jobs, seedBase: PROTOCOL.seedBase, firstSeeds: PROTOCOL.firstSeeds,
    moreSeeds: PROTOCOL.moreSeeds, guardMs: PROTOCOL.guardMs, earlyStop: PROTOCOL.earlyStop,
    probe: PROTOCOL.probe, cellsInPayload: 1, explicitMaxAttempts: false
  };
}

/** The reasons a cell's premises cannot be bound to the structural rule (empty: they can). */
function premiseProblems(p) {
  if (p === null || typeof p !== 'object') return ['premises are not an object'];
  const problems = [];
  const text = (x) => String(x);
  if (VARIANTS.indexOf(p.variant) === -1) {
    problems.push('variant ' + text(p.variant) + ' is not one of the 15');
  }
  if (LEVELS.indexOf(p.level) === -1) problems.push('level ' + text(p.level) + ' is not one of the 9');
  if (p.key !== p.variant + '/' + p.level) problems.push('key ' + text(p.key) + ' is not variant/level');
  if (!isCount(p.cellCount)) {
    problems.push('cellCount ' + text(p.cellCount) + ' is not a whole number >= 1');
  } else {
    if (p.attempts !== defaultAttemptsOf(p.cellCount)) {
      problems.push('attempts ' + text(p.attempts) + ' is not the size default ' +
        defaultAttemptsOf(p.cellCount) + ' of a board of ' + p.cellCount + ' cells');
    }
    if (p.budgetSeconds !== budgetSecondsOf(p.cellCount)) {
      problems.push('board budget ' + text(p.budgetSeconds) + ' s is not ' + budgetSecondsOf(p.cellCount) +
        ' s of a board of ' + p.cellCount + ' cells');
    }
  }
  if (BUDGETS.indexOf(p.budgetSeconds) === -1) {
    problems.push('no structural class for the board budget ' + text(p.budgetSeconds));
  }
  [['jobs', 'jobs'], ['seedBase', 'seed base'], ['firstSeeds', 'first-round seeds'],
    ['moreSeeds', 'second-round seeds'], ['guardMs', 'request guard (ms)']].forEach(([name, label]) => {
    if (p[name] !== PROTOCOL[name]) {
      problems.push(label + ' ' + text(p[name]) + ' is not ' + PROTOCOL[name]);
    }
  });
  if (p.earlyStop !== 'default') {
    problems.push('early stop ' + text(p.earlyStop) + ' is not the default');
  }
  if (p.probe !== 0) {
    problems.push('probe ' + text(p.probe) + ' is not 0: a probe is never a qualification');
  }
  if (p.cellsInPayload !== 1) {
    problems.push('the payload names ' + text(p.cellsInPayload) + ' cells, not one');
  }
  if (p.explicitMaxAttempts !== false) {
    problems.push('an explicit maxAttempts override is not allowed');
  }
  return problems;
}

/** The identity strings every row carries; the problems of missing or malformed ones. */
function identityProblems(ids) {
  if (ids === null || typeof ids !== 'object') return ['identities are not an object'];
  const problems = [];
  const hex = (value, pattern) => typeof value === 'string' && pattern.test(value);
  if (!hex(ids.source, HEX16)) problems.push('source identity is not 16 hex');
  if (!hex(ids.tool, HEX64)) problems.push('tool identity is not 64 hex');
  if (!hex(ids.attemptPolicy, HEX64)) problems.push('attempt-policy identity is not 64 hex');
  if (!hex(ids.node, /^v\d+\.\d+\.\d+$/)) problems.push('Node identity is not a version');
  if (!hex(ids.machine, HEX64)) problems.push('machine identity is not 64 hex');
  return problems;
}

/**
 * One row of the preflight for a cell { variant, level, cellCount, digits }. A cell whose premises or
 * identities cannot be bound keeps the explicit `blockers` and no numbers: nothing is guessed.
 */
function rowOf(cell, ids) {
  const p = premisesOf(cell);
  const blockers = premiseProblems(p).concat(identityProblems(ids));
  const ok = blockers.length === 0;
  const e = ok ? envelopeOf(p.budgetSeconds) : null;
  return {
    key: p.key, variant: cell.variant, level: cell.level,
    board: { cellCount: cell.cellCount, digits: cell.digits },
    defaultAttempts: p.attempts, budgetSeconds: p.budgetSeconds,
    budgetMs: p.budgetSeconds === null ? null : p.budgetSeconds * 1000,
    jobs: p.jobs, seedBase: p.seedBase,
    protocol: {
      firstSeeds: p.firstSeeds, moreSeeds: p.moreSeeds, earlyStop: p.earlyStop, singleCell: true,
      probe: p.probe, guardMs: p.guardMs, explicitMaxAttempts: false
    },
    identities: ok ? {
      source: ids.source, tool: ids.tool, attemptPolicy: ids.attemptPolicy, node: ids.node,
      machine: ids.machine
    } : null,
    method: METHOD,
    constants: ok ? { b: e.b, H: e.H, D: e.D, V: e.V, epsilon: e.epsilon, G: e.G, F: e.F } : null,
    P: ok ? e.P : null, A: ok ? e.A : null, T: ok ? e.T : null, O: ok ? e.O : null,
    binding: BINDING, blockers: blockers
  };
}

/** The 135 keys in manifest order (variants of the registry x the nine levels). */
function expectedKeys() {
  const keys = [];
  VARIANTS.forEach((v) => LEVELS.forEach((l) => keys.push(v + '/' + l)));
  return keys;
}

/** Where a document says "approved": a key named approved, a filled approvals key or a status "approved". */
function approvalOffences(value, where) {
  const here = where === undefined ? '$' : where;
  const found = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) => found.push.apply(found, approvalOffences(item, here + '[' + i + ']')));
  } else if (value !== null && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      const item = value[key];
      const filled = item !== null && item !== undefined && item !== false && item !== '' &&
        !(Array.isArray(item) && item.length === 0);
      if (/^approved$/i.test(key) && item !== undefined) found.push(here + '.' + key);
      else if (/approv/i.test(key) && filled) found.push(here + '.' + key);
      found.push.apply(found, approvalOffences(item, here + '.' + key));
    });
  } else if (typeof value === 'string' && /^approved(:true)?$/i.test(value.trim())) {
    found.push(here + ' = ' + value);
  }
  return found;
}

/** The problems of one row against the rule re-derived from its own board (empty: it is the table's). */
function rowProblems(row, first) {
  const label = String(row.key) + ': ';
  const problems = [];
  if (!Array.isArray(row.blockers) || row.blockers.length > 0) {
    return [label + 'is blocked: ' + (row.blockers || ['no blockers field']).join('; ')];
  }
  const board = row.board || {};
  if (!isCount(board.cellCount)) return [label + 'has no whole board cellCount'];
  const e = envelopeOf(budgetSecondsOf(board.cellCount));
  if (row.budgetSeconds !== e.b || row.budgetMs !== e.b * 1000) {
    problems.push(label + 'budget is not ' + e.b + ' s');
  }
  if (row.defaultAttempts !== defaultAttemptsOf(board.cellCount)) problems.push(label + 'attempts differ');
  if (['P', 'A', 'T', 'O'].some((n) => row[n] !== e[n] || row[n] !== BRIEF_TABLE[e.b][n])) {
    problems.push(label + 'P/A/T/O are not the table values ' + canon(BRIEF_TABLE[e.b]));
  }
  const constants = { b: e.b, H: e.H, D: e.D, V: e.V, epsilon: e.epsilon, G: e.G, F: e.F };
  if (canon(row.constants) !== canon(constants)) problems.push(label + 'constants differ');
  if (row.method !== METHOD) problems.push(label + 'method is not ' + METHOD);
  if (row.binding !== BINDING) problems.push(label + 'binding is not "' + BINDING + '"');
  if (row.jobs !== PROTOCOL.jobs || row.seedBase !== PROTOCOL.seedBase) {
    problems.push(label + 'jobs or seed base differ');
  }
  const premises = { firstSeeds: 40, moreSeeds: 60, earlyStop: 'default', singleCell: true, probe: 0,
    guardMs: 120000, explicitMaxAttempts: false };
  if (canon(row.protocol || {}) !== canon(premises)) problems.push(label + 'protocol premises differ');
  if (first && canon(row.identities) !== canon(first.identities)) problems.push(label + 'identities differ');
  if (!row.identities || identityProblems(row.identities).length > 0) {
    problems.push(label + 'identities invalid');
  }
  return problems;
}

/** The problems of a list of rows against the agreed 135-cell, 18 / 63 / 54 structure (empty: complete). */
function validateRows(rows) {
  if (!Array.isArray(rows)) return ['rows is not an array'];
  const problems = [];
  if (rows.length !== 135) problems.push('has ' + rows.length + ' rows, not 135');
  const keys = rows.map((r) => (r && typeof r.key === 'string' ? r.key : null));
  const seen = new Set();
  const twice = new Set();
  keys.forEach((k) => (seen.has(k) ? twice : seen).add(k));
  const want = expectedKeys();
  const missing = want.filter((k) => !seen.has(k));
  const extra = Array.from(seen).filter((k) => want.indexOf(k) === -1);
  if (twice.size > 0) problems.push('duplicate keys: ' + Array.from(twice).join(', '));
  if (missing.length > 0) problems.push('missing keys: ' + missing.join(', '));
  if (extra.length > 0) problems.push('keys outside the matrix: ' + extra.join(', '));
  if (problems.length === 0 && canon(keys) !== canon(want)) problems.push('keys are not in manifest order');
  const counts = { 2: 0, 10: 0, 30: 0 };
  rows.forEach((row) => {
    if (row === null || typeof row !== 'object') {
      problems.push('a row is not an object');
      return;
    }
    if (BUDGETS.indexOf(row.budgetSeconds) !== -1) counts[row.budgetSeconds]++;
    rowProblems(row, rows[0]).forEach((p) => problems.push(p));
  });
  Object.keys(CLASS_COUNTS).forEach((b) => {
    if (counts[b] !== CLASS_COUNTS[b]) {
      problems.push('class ' + b + ' s has ' + counts[b] + ' cells, not ' + CLASS_COUNTS[b]);
    }
  });
  return problems.concat(approvalOffences(rows).map((w) => 'approval-like content at ' + w));
}

/** Sums of the structural envelopes of the rows (seconds): conditional planning envelopes, not forecasts. */
function structuralSums(rows) {
  const sums = { cells: rows.length, P: 0, A: 0, T: 0, O: 0 };
  rows.forEach((r) => ['P', 'A', 'T', 'O'].forEach((n) => { sums[n] += r[n]; }));
  return sums;
}

/** Per class: the number of cells and the envelope (from the rows, so a tampered row shows). */
function classTable(rows) {
  return BUDGETS.map((b) => {
    const mine = rows.filter((r) => r.budgetSeconds === b);
    const e = envelopeOf(b);
    return { b: b, cells: mine.length, F: e.F, P: e.P, A: e.A, T: e.T, O: e.O };
  });
}

/** The identity strings of a row from the expanded identities of the document. */
function idsOf(expanded) {
  const x = expanded || {};
  const pick = (part, name) => (x[part] && typeof x[part] === 'object' ? x[part][name] : undefined);
  return {
    source: pick('source', 'engineSources'), tool: pick('tool', 'qualifierHash'),
    attemptPolicy: pick('attemptPolicy', 'digest'), node: pick('node', 'version'),
    machine: pick('machine', 'digest')
  };
}

/** The whole preflight document from the boards { id: { cellCount, digits } } and the expanded identities. */
function buildDocument(boards, expanded, base) {
  const rows = [];
  const ids = idsOf(expanded);
  VARIANTS.forEach((v) => LEVELS.forEach((l) => {
    const board = boards[v];
    rows.push(rowOf({ variant: v, level: l, cellCount: board ? board.cellCount : undefined,
      digits: board ? board.digits : undefined }, ids));
  }));
  return {
    schema: SCHEMA, method: METHOD, policy: POLICY, binding: BINDING,
    authority: 'none: this planner emits no approval; Stage 2 is a joint SA1/SA2 decision, Stage 3 also ' +
      'needs the recorded Q3 answer and the explicit release',
    base: base, identities: expanded,
    constants: {
      H: ALLOWANCES.H, D: ALLOWANCES.D, V: ALLOWANCES.V, epsilon: ALLOWANCES.epsilon, G: G,
      outerExtra: OUTER_EXTRA, waits: WAITS, outerCaps: OUTER_CAPS, maxRequestMs: MAX_REQUEST_MS
    },
    table: classTable(rows),
    structuralSums: structuralSums(rows),
    rows: rows
  };
}

// ---------------------------------------------------------------------------------------------------------
// Renderers (UTF-8, CRLF, a final line end, no trailing whitespace)
// ---------------------------------------------------------------------------------------------------------

/** The JSON text of the document: one line per top-level field and per row, so differences stay small. */
function renderJson(doc) {
  const lines = ['{'];
  const keys = Object.keys(doc);
  keys.forEach((key, i) => {
    const comma = i < keys.length - 1 ? ',' : '';
    if (key === 'rows') {
      lines.push('  "rows": [');
      doc.rows.forEach((row, j) => {
        lines.push('    ' + JSON.stringify(row) + (j < doc.rows.length - 1 ? ',' : ''));
      });
      lines.push('  ]' + comma);
    } else {
      lines.push('  ' + JSON.stringify(key) + ': ' + JSON.stringify(doc[key]) + comma);
    }
  });
  lines.push('}');
  return lines.join('\r\n') + '\r\n';
}

const hours = (seconds) => (seconds / 3600).toFixed(1);

/** The human table of the preflight. */
function renderMarkdown(doc) {
  const ids = doc.identities || {};
  const val = (part, name) => (ids[part] ? ids[part][name] : '?');
  const out = [];
  out.push('# MS18c Stage 1 preflight: the 135 GQ cells');
  out.push('');
  out.push('Method `' + doc.method + '`, policy `' + doc.policy + '`, binding **' + doc.binding + '**. ' +
    doc.authority + '.');
  out.push('');
  out.push('Produced by `generator/tests/artifacts/difficulty-v3/MS18c/plan-gq.cjs` (file-only, no ' +
    'solver). ' +
    'The machine-readable twin is `gq-cells.json`; this file carries the same numbers. Seconds throughout.');
  out.push('');
  out.push('## Identities of every row');
  out.push('');
  out.push('| Identity | Value |');
  out.push('|---|---|');
  out.push('| source (`engine.sources`) | `' + val('source', 'engineSources') + '` |');
  out.push('| tool (`qualifierHash`) | `' + val('tool', 'qualifierHash') + '` |');
  out.push('| attempt policy (digest) | `' + val('attemptPolicy', 'digest') + '` |');
  out.push('| Node | `' + val('node', 'version') + '` |');
  out.push('| machine (digest) | `' + val('machine', 'digest') + '` |');
  out.push('');
  out.push('## Classes');
  out.push('');
  out.push('| Board budget b | Cells | F=b+11 | P | A | T | O=T+2700 |');
  out.push('|---:|---:|---:|---:|---:|---:|---:|');
  doc.table.forEach((c) => {
    out.push('| ' + [c.b + ' s', c.cells, c.F, c.P, c.A, c.T, c.O].join(' | ') + ' |');
  });
  const s = doc.structuralSums;
  out.push('');
  out.push('Sums of the structural envelopes over ' + s.cells + ' cells (conditional planning envelopes, ' +
    'never runtime forecasts; no waits, gaps or admission re-asks): P ' + s.P + ' s, A ' + s.A + ' s (' +
    hours(s.A) + ' h), T ' + s.T + ' s (' + hours(s.T) + ' h), O ' + s.O + ' s (' + hours(s.O) + ' h).');
  out.push('');
  out.push('## Rows');
  out.push('');
  out.push('| # | Key | Board cells | Attempts | b | Jobs | P | A | T | O | Binding |');
  out.push('|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  doc.rows.forEach((r, i) => {
    out.push('| ' + [i + 1, r.key, r.board.cellCount, r.defaultAttempts, r.budgetSeconds, r.jobs, r.P, r.A,
      r.T, r.O, r.binding].join(' | ') + ' |');
  });
  return out.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------------------------------------
// Reference evaluation of the runtime monitor (brief "Agreed runtime monitor")
// ---------------------------------------------------------------------------------------------------------

/**
 * S: first-round generation on four workers all ready at once, dispatched in index order to the first free
 * worker, then the recorded second-round generation times added serially. Milliseconds.
 */
function simulate(requests, jobs, firstSeeds) {
  const free = new Array(jobs).fill(0);
  let first = 0;
  requests.filter((r) => r.index < firstSeeds).sort((a, b) => a.index - b.index).forEach((r) => {
    let w = 0;
    for (let i = 1; i < free.length; i++) if (free[i] < free[w]) w = i;
    free[w] += r.ms;
    first = Math.max(first, free[w]);
  });
  const second = requests.filter((r) => r.index >= firstSeeds).reduce((sum, r) => sum + r.ms, 0);
  return { firstMs: first, secondMs: second, totalMs: first + second };
}

/** The data problems of a monitor input (not breaches): nothing can be judged from such a record. */
function monitorDataProblems(args, requests, summary, instants) {
  const invalid = [];
  if (requests === null || requests.length === 0) invalid.push('the cell record has no requests');
  if (summary === null) {
    invalid.push('the cell record has no summary');
  } else if (summary.stopped !== null && summary.stopped !== 'misses' && summary.stopped !== 'time') {
    invalid.push('the cell is not a completed record (stopped ' + JSON.stringify(summary.stopped) + ')');
  }
  (requests || []).forEach((r, i) => {
    if (r === null || typeof r !== 'object' || !Number.isInteger(r.index) || r.index < 0) {
      invalid.push('request at position ' + i + ' has no whole index');
    } else if (!isNumber(r.ms) || r.ms < 0) {
      invalid.push('request #' + r.index + ' ms ' + String(r.ms) + ' is not a finite number >= 0');
    }
  });
  if (!Number.isFinite(instants.started) || !Number.isFinite(instants.finished)) {
    invalid.push('started/finished are not ISO instants of the record');
  } else if (instants.finished < instants.started) {
    invalid.push('finished is before started');
  }
  if (!isNumber(args.wSeconds) || args.wSeconds < 0) invalid.push('W is not a finite number of seconds >= 0');
  return invalid;
}

const instantOf = (text) => (typeof text === 'string' && ISO.test(text) ? Date.parse(text) : NaN);

/**
 * Before any next cell: every outcome's finite non-negative ms <= 130000, the structural slow counts, then
 * Q - S <= V + epsilon, W - Q <= H and W <= A, with unrounded Q (finished - started of the record) and the
 * supervisor's monotonic W (seconds). Negative residuals are kept as they are. `args`: { envelope
 * (envelopeOf), cell (the qualifier cell record: requests, summary), started, finished (ISO text), wSeconds,
 * validate (optional: cell => the problems of the existing record checks) }. Invalid timing/record data and
 * breaches both mean `proceed: false`: a joint review before another cell. Nothing here approves anything.
 */
function evaluateMonitor(args) {
  const e = args.envelope;
  const cell = args.cell;
  const requests = cell && Array.isArray(cell.requests) ? cell.requests : null;
  const summary = cell && cell.summary && typeof cell.summary === 'object' ? cell.summary : null;
  const instants = { started: instantOf(args.started), finished: instantOf(args.finished) };
  const invalid = monitorDataProblems(args, requests, summary, instants);
  if (invalid.length === 0 && typeof args.validate === 'function') {
    args.validate(cell).forEach((problem) => invalid.push('record: ' + problem));
  }
  if (invalid.length > 0) return { proceed: false, invalid: invalid, breaches: [], metrics: null };

  const breaches = [];
  const budgetMs = e.b * 1000;
  const secondRoundRan = requests.some((r) => r.index >= PROTOCOL.firstSeeds);
  const slowTotal = requests.filter((r) => r.ms > budgetMs).length;
  const slowFirst = requests.filter((r) => r.index < PROTOCOL.firstSeeds && r.ms > budgetMs).length;
  const maxMs = requests.reduce((m, r) => Math.max(m, r.ms), 0);
  if (maxMs > MAX_REQUEST_MS) {
    breaches.push('request ms ' + maxMs + ' is above ' + MAX_REQUEST_MS + ' (successful or errored alike)');
  }
  const stopped = summary.stopped;
  const limit = stopped === null ? SLOW_NO_STOP :
    (secondRoundRan ? SLOW_SECOND_ROUND : SLOW_FIRST_ROUND_STOP);
  if (slowTotal > limit) {
    const where = stopped === null ? 'no stop' :
      (secondRoundRan ? 'stop after round 2 ran' : 'first-round stop');
    breaches.push(slowTotal + ' slow outcomes, above ' + limit + ' (' + where + ')');
  }
  if (secondRoundRan && slowFirst > SLOW_NO_STOP) {
    breaches.push(slowFirst + ' slow outcomes in round 1 before the expansion, above ' + SLOW_NO_STOP);
  }
  const sim = simulate(requests, PROTOCOL.jobs, PROTOCOL.firstSeeds);
  const qMs = instants.finished - instants.started;
  const qMinusSMs = qMs - sim.totalMs;
  const wMs = args.wSeconds * 1000;
  const wMinusQMs = wMs - qMs;
  if (qMinusSMs > (e.V + e.epsilon) * 1000) {
    breaches.push('Q-S ' + qMinusSMs / 1000 + ' s is above ' + (e.V + e.epsilon) + ' s');
  }
  if (wMinusQMs > e.H * 1000) breaches.push('W-Q ' + wMinusQMs / 1000 + ' s is above ' + e.H + ' s');
  if (wMs > e.A * 1000) breaches.push('W ' + args.wSeconds + ' s is above A ' + e.A + ' s');
  // Follows from the checks above; a violation means the premises or this evaluation are wrong.
  if (sim.totalMs > (6 * (PROTOCOL.guardMs / 1000 + e.D) + 65 * e.b) * 1000) {
    breaches.push('S ' + sim.totalMs / 1000 + ' s is above 6*(120+D)+65*b');
  }
  return {
    proceed: breaches.length === 0, invalid: invalid, breaches: breaches,
    metrics: {
      requests: requests.length, maxMs: maxMs, stopped: stopped, secondRoundRan: secondRoundRan,
      slowTotal: slowTotal, slowFirstRound: slowFirst, qSeconds: qMs / 1000, sSeconds: sim.totalMs / 1000,
      sFirstRoundSeconds: sim.firstMs / 1000, sSecondRoundSeconds: sim.secondMs / 1000,
      qMinusS: qMinusSMs / 1000, wSeconds: args.wSeconds, wMinusQ: wMinusQMs / 1000
    }
  };
}

module.exports = {
  METHOD, POLICY, BINDING, SCHEMA, VARIANTS, LEVELS, PROTOCOL, ALLOWANCES, G, WAITS, OUTER_EXTRA, BUDGETS,
  CLASS_COUNTS, BRIEF_TABLE, OUTER_CAPS, MAX_REQUEST_MS, canon, budgetSecondsOf, defaultAttemptsOf,
  roundUp30, envelopeOf, structuralBounds, premisesOf, premiseProblems, identityProblems, rowOf,
  expectedKeys, approvalOffences, validateRows, structuralSums, classTable, idsOf, buildDocument, renderJson,
  renderMarkdown, simulate, evaluateMonitor
};
