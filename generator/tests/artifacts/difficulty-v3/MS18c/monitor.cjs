'use strict';

/*
 * MS18c Stage 3 task-owned runtime monitor, revision 2 (the Stage 2 rule of the committed manifest,
 * `monitor.version` 2). It replaces, for every real cell, the Stage 1 reference evaluation of
 * `rules.cjs` (whose bytes and log stay as they were: its upper-bound-only W-Q rule is superseded,
 * and this module reuses its structural counts and its S simulation instead of copying them).
 *
 * Before any next cell, from ONE completed qualifier record (`record`, cell `row` of the manifest,
 * the supervisor's monotonic W and the creation-boundary R, both in seconds):
 *   - the record is the approved cell: header, protocol, identities and machine equal the
 *     manifest's, its single cell has the row's cellCount, budget (ms) and attempts, and the
 *     existing canonical validation (`qualificationRecords.checkCell` with manifest-derived
 *     expectations) finds nothing. The canonical validation is MANDATORY here: there is no optional
 *     callback, and a missing records helper is a failure;
 *   - every outcome's ms is finite, non-negative and <= 130000; the structural slow counts hold;
 *   - Q - S <= V + epsilon = 11 s (a negative value is kept and passes), W <= A, and with R finite
 *     and 0 <= R <= W: R <= W - Q <= H = 60 s. W - Q below R (any negative W - Q included) is
 *     INVALID TIMING, not a small overhead to accept or subtract, and so is a missing, non-finite,
 *     negative or larger-than-W R.
 * Nothing is clamped, subtracted or adjusted. `proceed: false` (invalid data, invalid timing or a
 * breach) means the record is kept and GQ stops for joint review; a completed record is never rerun.
 */
const rules = require('./rules.cjs');

const isNumber = (x) => typeof x === 'number' && Number.isFinite(x);
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

/** The header problems of a record against the expectation taken from the manifest (and the engine). */
function headerProblems(record, exp) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return ['the record is not an object'];
  }
  const problems = [];
  const same = (name, wanted) => {
    if (rules.canon(record[name]) !== rules.canon(wanted)) {
      problems.push(name + ' is ' + JSON.stringify(record[name]).slice(0, 60) + ', not the approved value');
    }
  };
  if (record.shards !== undefined || record.matrix !== undefined) {
    problems.push('is a merged record, not a shard');
  }
  same('protocol', exp.protocol);
  same('seedBase', exp.seedBase);
  same('qualifierHash', exp.qualifierHash);
  same('acceptance', exp.acceptance);
  same('ratingVersion', exp.ratingVersion);
  same('probe', 0);
  same('earlyStop', true);
  same('guardMs', exp.guardMs);
  same('attemptPolicy', exp.attemptPolicy);
  same('machine', exp.machine);
  if (!record.engine || typeof record.engine !== 'object' || record.engine.sources !== exp.engineSources) {
    problems.push('engine.sources is not the approved ' + exp.engineSources);
  }
  ['started', 'finished'].forEach((name) => {
    if (typeof record[name] !== 'string' || !ISO.test(record[name])) {
      problems.push(name + ' is not an ISO instant');
    }
  });
  if (!Array.isArray(record.cells) || record.cells.length !== 1) {
    problems.push('does not hold exactly one cell');
  }
  return problems;
}

/** The premises of the single cell against the approved row. */
function premiseProblems(cell, row) {
  const problems = [];
  if (cell.variant + '/' + cell.level !== row.key) problems.push('cell ' + cell.variant + '/' + cell.level +
    ' is not the approved ' + row.key);
  if (cell.cellCount !== row.cellCount) {
    problems.push('cellCount ' + JSON.stringify(cell.cellCount) + ' is not the row\'s ' + row.cellCount);
  }
  if (cell.budget !== row.budgetMs) {
    problems.push('budget ' + JSON.stringify(cell.budget) + ' ms is not the row\'s ' + row.budgetMs);
  }
  if (cell.attempts !== row.attempts) {
    problems.push('attempts ' + JSON.stringify(cell.attempts) + ' is not the row\'s ' + row.attempts);
  }
  return problems;
}

/**
 * args: { row (manifest row: key, cellCount, attempts, b, budgetMs, A), record (the qualifier JSON),
 * wSeconds, rSeconds, records (SG.fixtures.qualificationRecords, required), expectation
 * (headerProblems) }.
 * Returns { proceed, invalid, invalidTiming, breaches, metrics }: every list is explicit and
 * nothing is hidden.
 */
function evaluate(args) {
  const invalid = [];
  const invalidTiming = [];
  const row = args.row;
  const record = args.record;
  if (!args.records || typeof args.records.checkCell !== 'function') {
    invalid.push('the canonical validation (qualificationRecords.checkCell) is not available: ' +
      'it is mandatory');
  }
  if (!row || !isNumber(row.b) || !isNumber(row.A)) invalid.push('the manifest row is missing');
  if (!args.expectation) invalid.push('the header expectation is missing');
  if (invalid.length > 0) {
    return { proceed: false, invalid: invalid, invalidTiming: [], breaches: [], metrics: null };
  }

  headerProblems(record, args.expectation).forEach((p) => invalid.push('header: ' + p));
  const cell = Array.isArray(record && record.cells) && record.cells.length === 1 ? record.cells[0] : null;
  if (cell === null || typeof cell !== 'object') {
    invalid.push('the record has no single cell');
  } else {
    premiseProblems(cell, row).forEach((p) => invalid.push('premise: ' + p));
    let found = [];
    try {
      found = Array.from(args.records.checkCell(cell, {
        cellCount: row.cellCount, attempts: row.attempts, jobs: rules.PROTOCOL.jobs, earlyStop: true
      }));
    } catch (err) {
      found = ['the canonical validation threw: ' + (err && err.message)];
    }
    found.forEach((p) => invalid.push('canonical: ' + p));
  }
  const w = args.wSeconds;
  const r = args.rSeconds;
  if (!isNumber(r)) invalidTiming.push('R is missing or not a finite number');
  else if (r < 0) invalidTiming.push('R ' + r + ' s is negative');
  else if (isNumber(w) && r > w) invalidTiming.push('R ' + r + ' s is larger than W ' + w + ' s');
  if (!isNumber(w)) {
    invalidTiming.push('W is unknown or not a finite number (a lost supervisor leaves no W)');
  }

  const base = cell === null ? null : rules.evaluateMonitor({
    envelope: rules.envelopeOf(row.b), cell: cell, started: record.started, finished: record.finished,
    wSeconds: w
  });
  if (base !== null) {
    // An unknown W is reported once, as invalid timing; the rules' own complaint about it is not repeated.
    base.invalid.forEach((p) => {
      if (isNumber(w) || !/^W is not a finite number/.test(p)) invalid.push('data: ' + p);
    });
  }
  const metrics = base && base.metrics ?
    Object.assign({ rSeconds: isNumber(r) ? r : null }, base.metrics) : null;
  if (metrics !== null && isNumber(r) && r >= 0 && metrics.wMinusQ < r) {
    invalidTiming.push('W-Q ' + metrics.wMinusQ + ' s is below R ' + r + ' s (a W-Q below R, ' +
      'negative included, is invalid timing)');
  }
  const breaches = base ? base.breaches.slice() : [];
  return {
    proceed: invalid.length === 0 && invalidTiming.length === 0 && breaches.length === 0,
    invalid: invalid, invalidTiming: invalidTiming, breaches: breaches, metrics: metrics
  };
}

module.exports = { headerProblems, premiseProblems, evaluate };
