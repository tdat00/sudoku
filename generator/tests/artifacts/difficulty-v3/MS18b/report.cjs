'use strict';

/*
 * MS18b task-owned, READ-ONLY reporter of the two fixed experiments (R5 cap, R9 window). It validates every
 * ledger of docs/difficulty-v3/evidence/MS18b against the plan, merges each of the 30 logical cells with
 * `SG.fixtures.difficultyDiagnostics.mergeShards` (indexes 0..11 once, one source, tool, Node and effective
 * setting; there is no soak --merge), checks the rows against the manifest keys, applies the two literal
 * selection rules of rules.cjs to the raw rows, and writes the decision packet. It generates nothing, writes
 * only the output files named on the command line and never touches a ledger or a record.
 *
 *   node report.cjs [--dir=<evidence folder>] [--out-md=<file>] [--out-json=<file>] [--out-discord=<file>]
 *                   [--ms18a=<MS18a folder>|none]
 *
 * Exit code: 0 complete (360 outcomes, every check passed); 4 INCOMPLETE (a gap, nothing defective: no winner
 * is claimed for an incomplete experiment); 1 a check failed or a record is defective. The transcript of an
 * entry is that of the attempt that actually started the payload (`<id>-admission2` when its readiness
 * record shows a payload start, else `<id>`): a held attempt's `NOT STARTED` transcript is never a
 * measurement. The commit display lists every distinct commit of the ledgers with its shard count.
 *
 * `analyse(input, env)` is pure so that test-select.cjs can run it on fake data.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const admission = require('./admission.cjs');
const rules = require('./rules.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const GEN = path.join(REPO, 'generator');
const LABEL = admission.LABEL;
const SEED = 20260101;
const REFERENCE_INDEXES = [0, 11];
const finite = rules.finite;
const sum = (list) => list.reduce((a, b) => a + b, 0);
const f = (x, d) => (finite(x) ? x.toFixed(d === undefined ? 2 : d) : 'n/a');
const canonical = (value) => JSON.stringify(value);
const cellName = (key) => key.replace('/', ' ');

function checksVerdict(checks) {
  if (!checks || typeof checks !== 'object') return { kind: 'defect', note: 'no summary.checks' };
  const invariants = sum(Object.keys(checks.invariantViolations || {})
    .map((k) => checks.invariantViolations[k]));
  const defects = [];
  if (invariants > 0) defects.push(invariants + ' invariant violation(s)');
  if ((checks.checkErrors || []).length > 0) defects.push(checks.checkErrors.length + ' check error(s)');
  ['referenceErrors', 'pathErrors', 'pathMismatches', 'workUnavailable'].forEach((k) => {
    if (checks[k] > 0) defects.push(k + ' ' + checks[k]);
  });
  if (defects.length > 0) return { kind: 'defect', note: defects.join(', ') + ' (' + checks.result + ')' };
  if (checks.result === 'PASS') return { kind: 'pass', note: 'PASS' };
  if (checks.result === 'FAIL' && checks.requestErrors > 0) {
    return { kind: 'request-errors', note: 'FAIL by ' + checks.requestErrors + ' request error(s) only' };
  }
  return { kind: 'defect', note: 'result ' + checks.result };
}

/** The defects of one ledger against its plan entry: [] when the ledger is what the plan asked for. */
function ledgerProblems(entry, ledger, plan) {
  const out = [];
  const meta = ledger && ledger.meta;
  if (!ledger || ledger.schema !== 1 || ledger.complete !== true || !meta || !Array.isArray(ledger.rows)) {
    return ['not a complete schema 1 ledger'];
  }
  const cells = meta.manifest && Array.isArray(meta.manifest.cells) ? meta.manifest.cells : [];
  const cell = cells[0];
  const exp = plan.expected;
  const say = (name, value) => out.push(name + ' ' + String(value));
  if (meta.acceptance !== 'canonical-required-tier') say('acceptance', meta.acceptance);
  if (meta.sourceHash !== exp.sourceHash) say('sourceHash', meta.sourceHash);
  if (meta.toolHash !== exp.toolHash) say('toolHash', meta.toolHash);
  if (meta.node !== exp.node) say('node', meta.node);
  if (meta.seedBase !== SEED) say('seedBase', meta.seedBase);
  if (canonical(meta.argv) !== canonical(entry.payload.slice(1))) out.push('argv differs from the plan');
  if (entry.family === 'cap') {
    const want = entry.setting === 'none' ? null : Number(entry.setting);
    if (meta.shallowCap !== entry.setting) say('shallowCap', meta.shallowCap);
    if (meta.shallowSearchRatings !== want) say('shallowSearchRatings', meta.shallowSearchRatings);
    if (meta.chainWindow !== null) say('chainWindow in a cap run', meta.chainWindow);
    if (meta.chainShortMax !== exp.chainShortMax) say('chainShortMax', meta.chainShortMax);
  } else {
    if (meta.chainWindow !== Number(entry.setting)) say('chainWindow', meta.chainWindow);
    if (meta.chainShortMax !== Number(entry.setting)) say('chainShortMax', meta.chainShortMax);
    if (meta.shallowCap !== null) say('shallowCap in a window run', meta.shallowCap);
    if (meta.shallowSearchRatings !== exp.shallowAllowance) {
      say('shallowSearchRatings', meta.shallowSearchRatings);
    }
  }
  const mf = meta.manifest || {};
  if (mf.ratingVersion !== 3) say('ratingVersion', mf.ratingVersion);
  if (mf.includeUnsupported !== false) say('includeUnsupported', mf.includeUnsupported);
  if (mf.weights !== null && mf.weights !== undefined) out.push('weights override present');
  if (mf.bands !== null && mf.bands !== undefined) out.push('bands override present');
  if (cells.length !== 1) {
    out.push(cells.length + ' manifest cells, not 1');
  } else if (cell.variant !== entry.variant || cell.level !== entry.level || cell.from !== entry.from ||
      cell.requests !== entry.count || cell.logicalTotal !== 12 || cell.route !== entry.route ||
      canonical(cell.referenceIndexes) !== canonical(REFERENCE_INDEXES)) {
    out.push('the manifest cell differs from the plan entry (' + canonical(cell) + ')');
  }
  const verdict = checksVerdict(ledger.summary && ledger.summary.checks);
  if (verdict.kind === 'defect') out.push('summary.checks: ' + verdict.note);
  return out;
}

/** The transcript facts of an attempt: the soak's `puzzles in <s> s` line and the wrapper's exit line. */
function transcriptFacts(text) {
  if (typeof text !== 'string') return null;
  const soak = /puzzles in ([0-9.]+) s/.exec(text);
  const diag = /diagnostic solves took ([0-9.]+) s/.exec(text);
  const exit = /^exit=(\d+) seconds=([0-9.]+)/m.exec(text);
  const result = /^DIAGNOSTICS: (\w+)/m.exec(text);
  return {
    soakSeconds: soak ? Number(soak[1]) : null, diagnosticSeconds: diag ? Number(diag[1]) : null,
    exit: exit ? Number(exit[1]) : null, processSeconds: exit ? Number(exit[2]) : null,
    diagnostics: result ? result[1] : null
  };
}

function analyse(input, env) {
  const plan = input.plan;
  const manifest = input.manifest;
  const checks = [];
  const check = (label, ok, detail, kind) => {
    checks.push({ label: label, ok: ok === true, detail: detail === undefined ? '' : String(detail),
      kind: kind || 'correctness' });
  };
  const result = {
    label: LABEL, entries: [], cells: {}, checks: checks, commits: [], dirty: [], identity: {}, admission: {},
    coverage: {}, R5: null, C: null, determinism: null, time: {}
  };

  // ---- entries: ledger, attempts, executed attempt ------------------------------------------------------
  const lockRows = input.lockLog || [];
  const startedId = (entry) => {
    const second = input.readiness[entry.id + '-admission2'];
    if (second && second.payloadStartedAt) return entry.id + '-admission2';
    const first = input.readiness[entry.id];
    return first && first.payloadStartedAt ? entry.id : null;
  };
  plan.entries.forEach((entry) => {
    const ledger = input.ledgers[entry.id] || null;
    const attempts = ['', '-admission2'].map((suffix, k) => {
      const id = entry.id + suffix;
      const r = input.readiness[id] || null;
      if (!r) return null;
      const log = lockRows.filter((row) => row.id === id);
      return {
        id: id, ordinal: k + 1, record: r, log: log[log.length - 1] || null, logRows: log.length,
        verdict: admission.reportVerdict(r)
      };
    }).filter(Boolean);
    const executedId = startedId(entry);
    const executed = attempts.find((a) => a.id === executedId) || null;
    const problems = ledger ? ledgerProblems(entry, ledger, plan) : [];
    const facts = executed ? transcriptFacts(input.transcripts[executed.id]) : null;
    const status = !ledger ? (attempts.length === 0 ? 'not run' : 'unexecuted') :
      problems.length > 0 ? 'defect' : 'valid';
    result.entries.push({
      id: entry.id, experiment: entry.experiment, family: entry.family, setting: entry.setting,
      variant: entry.variant, level: entry.level, from: entry.from, count: entry.count,
      requests: entry.requests, status: status, problems: problems, attempts: attempts,
      executedId: executedId, transcript: facts, ledgerFile: input.ledgerFiles[entry.id] || null,
      checks: ledger && ledger.summary ? ledger.summary.checks : null,
      checksVerdict: ledger && ledger.summary ? checksVerdict(ledger.summary.checks) : null,
      meta: ledger ? ledger.meta : null, boundSeconds: entry.boundSeconds
    });
    if (status === 'valid' || status === 'defect') {
      const startedCount = attempts.filter((a) => a.record.payloadStartedAt).length;
      check('entry ' + entry.id + ': one executed attempt, admitted under ' + admission.POLICY +
        ', payload exit 0', executed !== null && startedCount === 1 && executed.verdict.ok === true,
      executed ? executed.verdict.reason : 'no attempt started the payload');
      check('entry ' + entry.id + ': the started attempt\'s transcript shows exit 0 and DIAGNOSTICS',
        facts !== null && facts.exit === 0 && facts.diagnostics !== null,
        facts ? 'exit ' + facts.exit + ', diagnostics ' + facts.diagnostics : 'no transcript');
      check('entry ' + entry.id + ': the ledger matches the plan (identity, setting, span, checks)',
        problems.length === 0, problems.join('; '));
    }
  });

  // ---- cells: merge, manifest, statistics ---------------------------------------------------------------
  const settingsOf = { cap: ['64', '128', '256', 'none'], window: ['4', '6'] };
  const experiments = { R5: { family: 'cap' }, R9: { family: 'window' } };
  const table = { cap: {}, window: {} };
  const cellsOfExp = {};
  Object.keys(experiments).forEach((name) => {
    const exp = manifest.experiments[name];
    cellsOfExp[name] = exp.cells.map((c) => c.variant + '/' + c.level);
    const fam = experiments[name].family;
    settingsOf[fam].forEach((setting) => { table[fam][setting] = {}; });
    exp.cells.forEach((planned) => {
      const key = planned.variant + '/' + planned.level;
      settingsOf[fam].forEach((setting) => {
        const entries = result.entries.filter((e) => e.family === fam && e.setting === setting &&
          e.variant === planned.variant && e.level === planned.level);
        const slot = fam + '|' + setting + '|' + key;
        const cell = {
          experiment: name, family: fam, setting: setting, key: key, entries: entries.map((e) => e.id),
          status: 'valid', problems: [], missingIndexes: [], stats: null, rows: null
        };
        result.cells[slot] = cell;
        const absent = entries.filter((e) => e.status !== 'valid');
        absent.forEach((e) => {
          if (e.status === 'defect') cell.problems.push(e.id + ': ' + e.problems.join('; '));
          cell.missingIndexes = cell.missingIndexes.concat(e.requests);
        });
        if (absent.length > 0) {
          cell.status = absent.some((e) => e.status === 'defect') ? 'defect' : 'incomplete';
          return;
        }
        const merged = env.mergeShards(entries.map((e) => input.ledgers[e.id]));
        if (!merged.ok) {
          cell.status = 'defect';
          merged.problems.forEach((p) => cell.problems.push('merge: ' + p));
          return;
        }
        let sound = true;
        merged.rows.forEach((row, i) => {
          const want = planned.keys[i];
          if (row.index !== want.index || row.tag !== want.tag || row.pipelineSeed !== want.pipelineSeed) {
            cell.problems.push('row ' + i + ' is ' + row.tag + ' seed ' + row.pipelineSeed + ', planned ' +
              want.tag + ' seed ' + want.pipelineSeed);
            sound = false;
          }
        });
        const stats = rules.cellStats(merged.rows, 12);
        stats.problems.forEach((p) => { cell.problems.push(p); sound = false; });
        if (!sound) {
          cell.status = 'defect';
          return;
        }
        cell.stats = stats.stats;
        cell.rows = merged.rows;
        table[fam][setting][key] = stats.stats;
      });
      const slotList = settingsOf[fam].map((s) => result.cells[fam + '|' + s + '|' + key]);
      check('cell ' + name + ' ' + key + ': every setting merged, 12 rows each, keys equal the manifest',
        slotList.every((c) => c.status === 'valid'),
        slotList.filter((c) => c.status !== 'valid').map((c) => c.setting + ' ' + c.status).join(', '),
        slotList.some((c) => c.status === 'defect') ? 'correctness' : 'completeness');
    });
  });

  // ---- rules --------------------------------------------------------------------------------------------
  result.R5 = rules.decideCap(table.cap, cellsOfExp.R5);
  result.R5.table = table.cap;
  result.R5.inForce = rules.IN_FORCE.R5;
  result.R5.disposition = rules.dispositionOf(rules.IN_FORCE.R5, result.R5);
  result.C = rules.decideWindow(table.window, cellsOfExp.R9);
  result.C.table = table.window;
  result.C.inForce = rules.IN_FORCE.C;
  result.C.disposition = rules.dispositionOf(rules.IN_FORCE.C, result.C);
  result.cellKeys = cellsOfExp;

  // ---- coverage -----------------------------------------------------------------------------------------
  const all = Object.keys(result.cells).map((k) => result.cells[k]);
  const valid = all.filter((c) => c.status === 'valid');
  const recorded = (name) => sum(valid.filter((c) => c.experiment === name).map((c) => c.stats.requests));
  const missing = [];
  Object.keys(result.cells).forEach((k) => {
    const c = result.cells[k];
    if (c.status !== 'valid') {
      missing.push({ slot: k, status: c.status, indexes: c.missingIndexes.slice().sort((a, b) => a - b) });
    }
  });
  const errorRows = [];
  valid.forEach((c) => c.stats.errorIndexes.forEach((i) => {
    errorRows.push({ slot: c.family + '|' + c.setting + '|' + c.key, index: i });
  }));
  result.coverage = {
    intended: { R5: 288, R9: 72, total: 360 }, recorded: { R5: recorded('R5'), R9: recorded('R9') },
    missing: missing, errorRows: errorRows, validCells: valid.length, cells: all.length
  };
  result.coverage.recorded.total = result.coverage.recorded.R5 + result.coverage.recorded.R9;
  const defects = result.entries.filter((e) => e.status === 'defect').length +
    all.filter((c) => c.status === 'defect').length;
  const complete = result.coverage.recorded.total === 360 && result.R5.status === 'determined' &&
    result.C.status === 'determined';
  result.complete = complete;
  result.defects = defects;
  check('360 of the intended 288 + 72 outcomes are recorded (30 logical cells)', complete,
    result.coverage.recorded.total + ' recorded; ' + missing.length + ' cell(s) incomplete or defective',
    defects > 0 ? 'correctness' : 'completeness');

  // ---- identity -----------------------------------------------------------------------------------------
  const metas = result.entries.filter((e) => e.meta).map((e) => e.meta);
  const distinct = (pick) => Array.from(new Set(metas.map(pick)));
  const commitCount = {};
  metas.forEach((m) => { commitCount[m.commit] = (commitCount[m.commit] || 0) + 1; });
  result.commits = Object.keys(commitCount).map((c) => ({ commit: c, ledgers: commitCount[c] }));
  result.dirty = distinct((m) => m.dirty);
  result.identity = {
    sourceHash: distinct((m) => m.sourceHash), toolHash: distinct((m) => m.toolHash),
    node: distinct((m) => m.node), ratingVersion: distinct((m) => m.manifest.ratingVersion),
    machine: distinct((m) => (m.machine ? m.machine.cpuModel + ' x' + m.machine.cpus : null)),
    expected: plan.expected, ledgers: metas.length
  };
  const id = result.identity;
  check('one source, tool and Node identity in every ledger, equal to the plan',
    metas.length > 0 && id.sourceHash.length === 1 && id.toolHash.length === 1 && id.node.length === 1 &&
    id.sourceHash[0] === plan.expected.sourceHash && id.toolHash[0] === plan.expected.toolHash &&
    id.node[0] === plan.expected.node,
    'source ' + id.sourceHash.length + ', tool ' + id.toolHash.length + ', node ' + id.node.length);

  // ---- admission ----------------------------------------------------------------------------------------
  const attemptRows = [];
  result.entries.forEach((e) => e.attempts.forEach((a) => attemptRows.push({ entry: e, attempt: a })));
  const started = attemptRows.filter((x) => x.attempt.record.payloadStartedAt);
  const holds = attemptRows.filter((x) => x.attempt.record.admitted === false);
  const reAsked = result.entries.filter((e) => e.attempts.length >= 2);
  const gaps = result.entries.filter((e) => e.status === 'unexecuted' && e.attempts.length >= 2);
  const pending = result.entries.filter((e) => e.status === 'unexecuted' && e.attempts.length === 1);
  const notRun = result.entries.filter((e) => e.status === 'not run');
  result.admission = {
    entries: result.entries.length, executed: started.length, attemptRecords: attemptRows.length,
    holds: holds.length, reAsked: reAsked.map((e) => e.id), gaps: gaps.map((e) => e.id),
    heldPending: pending.map((e) => e.id), notRun: notRun.map((e) => e.id),
    strictFailed: started.filter((x) => x.attempt.record.ready !== true).length,
    strictPassed: started.filter((x) => x.attempt.record.ready === true).length
  };
  check('no entry has more than two admission attempts', result.entries.every((e) => e.attempts.length <= 2),
    result.entries.filter((e) => e.attempts.length > 2).map((e) => e.id).join(', '));
  check('every plan entry has a ledger (an unexecuted gap is not a pass)',
    gaps.length + pending.length + notRun.length === 0,
    (gaps.length + pending.length + notRun.length) + ' entries without a ledger', 'completeness');

  // ---- time ---------------------------------------------------------------------------------------------
  const execTimes = result.entries.filter((e) => e.executedId).map((e) => {
    const a = e.attempts.find((x) => x.id === e.executedId);
    return { id: e.id, payloadSeconds: a.record.payloadSeconds, readinessSeconds: a.record.readinessSeconds };
  });
  result.time = {
    payloadSeconds: Math.round(sum(execTimes.map((t) => t.payloadSeconds || 0)) * 10) / 10,
    readinessSeconds: Math.round(sum(execTimes.map((t) => t.readinessSeconds || 0)) * 10) / 10,
    commands: execTimes.length
  };

  // ---- reproduction of MS18a at the defaults (informational) --------------------------------------------
  if (input.ms18a) {
    const compare = (fam, setting) => {
      let same = 0;
      let total = 0;
      let exactSame = 0;
      all.filter((c) => c.family === fam && c.setting === setting && c.status === 'valid').forEach((c) => {
        const base = input.ms18a[c.key];
        if (!base) return;
        c.rows.forEach((row, i) => {
          total++;
          if (base[i] && row.puzzleHash === base[i].puzzleHash) same++;
          if (base[i] && row.generationExact === base[i].generationExact) exactSame++;
        });
      });
      return { total: total, samePuzzle: same, sameExactFlag: exactSame };
    };
    result.determinism = { cap256: compare('cap', '256'), window4: compare('window', '4') };
  }
  result.milestone = complete && defects === 0 ? 'complete' : 'incomplete';
  const pendingChoices = [];
  if (result.R5.disposition === 'owner decision pending') pendingChoices.push('R5');
  if (result.C.disposition === 'owner decision pending') pendingChoices.push('C');
  result.pendingChoices = pendingChoices;
  if (!result.complete || defects > 0) result.decisionStatus = 'undetermined / incomplete milestone';
  else if (pendingChoices.length > 0) result.decisionStatus = 'measurements complete; owner decision pending';
  else result.decisionStatus = 'reconfirmed (256 / C4)';
  result.failedChecks = checks.filter((c) => !c.ok);
  return result;
}

/**
 * The exit code of a run: 0 complete and sound; 4 incomplete with nothing defective (a gap, a missing shard:
 * only completeness checks fail); 1 a correctness check failed or a record is defective.
 */
function exitCodeOf(r) {
  const hard = r.failedChecks.filter((c) => c.kind !== 'completeness');
  if (hard.length > 0 || r.defects > 0) return 1;
  return r.complete ? 0 : 4;
}

// ---- rendering --------------------------------------------------------------------------------------------
const WORK_HEAD = 'Local searches: ended by allowance / proposal cap / rating cap / natural';

function workRow(c) {
  const st = c.stats;
  if (!st) return ['n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a'];
  return [st.hits + '/12', st.inBand + ' / ' + st.shallow + ' / ' + st.errors, String(st.upperMedian),
    String(st.sumFullRatings), st.attempts + ' (max ' + st.maxAttempts + ')',
    st.localSearches + ': ' + st.endedByAllowance + ' / ' + st.endedByProposals + ' / ' +
    st.endedByRatingCap + ' / ' + st.endedNaturally, f(st.generationSeconds)];
}

function renderMarkdown(r, plan) {
  const out = [];
  const para = (...parts) => out.push(parts.join(''), '');
  const heading = (t) => out.push('', t, '');
  const table = (headers, rows) => {
    if (rows.length === 0) {
      out.push('None.', '');
      return;
    }
    out.push('| ' + headers.join(' | ') + ' |');
    out.push('|' + headers.map((h, i) => (i < 2 ? '---' : '---:')).join('|') + '|');
    rows.forEach((row) => out.push('| ' + row.join(' | ') + ' |'));
    out.push('');
  };
  const idxs = (list) => (list.length === 0 ? '-' : list.join(','));
  const win = (d) => (d.winner === null ? 'undetermined' : d.winner);
  out.push('# MS18b decision packet: the final R5 cap and R9 chain-window rechecks', '');
  para('**Every timing here is "', LABEL, '"** (MS18b-host-active): descriptive, never a GQ or GP verdict, ',
    'never a bound. The raw strict screen is recorded unchanged for every command and is not turned into ',
    'a pass.');
  para('**Status: ', r.decisionStatus, '.** Coverage ', r.coverage.recorded.total, ' of the intended ',
    r.coverage.intended.total, ' outcomes (R5 ', r.coverage.recorded.R5, ' of 288, R9 ',
    r.coverage.recorded.R9, ' of 72). R5: in force **', r.R5.inForce, '**, rule winner **', win(r.R5),
    '**, ', r.R5.disposition, '. C: in force **C', r.C.inForce, '**, rule winner **',
    r.C.winner === null ? 'undetermined' : 'C' + r.C.winner, '**, ', r.C.disposition,
    '. Reporter checks: ', r.checks.length - r.failedChecks.length, ' of ', r.checks.length, ' pass.');

  heading('## 1. Coverage, identity and evidence');
  para('Intended: R5 = 6 cells x 4 settings x 12 = 288; R9 = 3 cells x 2 settings x 12 = 72; 30 logical ',
    'cells, 360 fresh outcomes. Production defaults in force: shallow allowance **256**, C **4**, attempts ',
    '**8** (board default, no override); the fixed other default is the source default (no flag).');
  table(['Experiment', 'Setting', 'Cell', 'Merge status', 'Outcomes', 'Missing indexes',
    'Error rows (misses)', 'Entries (ledgers)'],
  Object.keys(r.cells).map((k) => r.cells[k]).map((c) => [c.experiment,
    c.family === 'cap' ? c.setting : 'C' + c.setting, cellName(c.key), c.status,
    c.stats ? String(c.stats.requests) : '0',
    c.status === 'valid' ? '-' : idxs(c.missingIndexes.slice().sort((a, b) => a - b)),
    c.stats ? idxs(c.stats.errorIndexes) : '-', c.entries.join(', ')]));
  para('Identity (every ledger): source `', r.identity.sourceHash.join(', '), '`, tool `',
    r.identity.toolHash.join(', '), '`, Node ', r.identity.node.join(', '), ', rating version ',
    r.identity.ratingVersion.join(', '), '; expected `', plan.expected.sourceHash.slice(0, 12), '` / `',
    plan.expected.toolHash.slice(0, 12), '`; machine ', r.identity.machine.join('; '), '.');
  para('Commits of the ledgers: ', r.commits.length === 0 ? 'none' : r.commits.map((c) => '`' +
    String(c.commit).slice(0, 8) + '` (' + c.ledgers + ' ledgers)').join(', '), '; dirty flags: ',
  r.dirty.join(', '), ' (pack-only commits and this task\'s evidence and helper files; nothing in a ',
  'fingerprint changed).');
  table(['Entry', 'Status', 'Requests', 'summary.checks', 'Payload', 'Transcript (the started attempt)',
    'Ledger'],
  r.entries.map((e) => [e.id, e.status, e.requests[0] + '-' + e.requests[e.requests.length - 1],
    e.checksVerdict ? e.checksVerdict.note : '-',
    e.transcript ? 'exit ' + e.transcript.exit + ', ' + e.transcript.diagnostics : '-',
    e.executedId ? '`logs\\' + e.executedId + '.txt`' : '-',
    e.ledgerFile ? '`' + e.ledgerFile.file + '`' : '-']));

  heading('## 2. R5: the 24-row table (12 requests per row)');
  const rows24 = [];
  ['64', '128', '256', 'none'].forEach((s) => r.cellKeys.R5.forEach((key) => {
    rows24.push([s, cellName(key)].concat(workRow(r.cells['cap|' + s + '|' + key])));
  }));
  table(['Setting', 'Cell', 'Exact', 'In band / shallow / errors', 'Upper median full ratings (index 6)',
    'Full ratings (sum)', 'Attempts', WORK_HEAD, 'Generation s (sum; descriptive)'], rows24);
  para('Upper median: sorted index 6 of the twelve `row.fullRatings` (all requests, all attempts, error ',
    'rows with their work; not the exact-only cohort). "Allowance" is the shallow allowance of the setting ',
    '(none: ',
    'it cannot end a search). Generation seconds are of "', LABEL, '".');
  r.R5.comparisons.forEach((cmp) => {
    out.push('### Cap ' + cmp.setting + ' against none', '');
    table(['Cell', 'none exact', 'cap ' + cmp.setting + ' exact', 'Difference', 'Hit loss', 'none median',
      'cap median', 'Strict reduction', 'Exact at none, not at the cap (indexes)',
      'Exact at the cap, not at none'],
    cmp.perCell.map((c) => {
      if (!c.known) return [cellName(c.cell), 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a'];
      const reduced = c.strictReduction ?
        '**yes** (' + c.noneUpperMedian + ' -> ' + c.upperMedian + ')' : 'no';
      return [cellName(c.cell), String(c.noneHits), String(c.hits), (c.hitDelta > 0 ? '+' : '') + c.hitDelta,
        c.hitLoss ? '**yes**' : 'no', String(c.noneUpperMedian), String(c.upperMedian), reduced,
        idxs(c.lostIndexes), idxs(c.gainedIndexes)];
    }));
    const witness = cmp.perCell.filter((c) => c.known && c.strictReduction)
      .map((c) => cellName(c.cell) + ' ' + c.noneUpperMedian + ' -> ' + c.upperMedian);
    const verdict = cmp.eligible === null ? 'not determinable' : cmp.eligible ? 'eligible' : 'not eligible';
    para('Eligibility of cap ', cmp.setting, ': **', verdict, '**; hit-loss cells: ',
      cmp.hitLossCells.length ? cmp.hitLossCells.map(cellName).join(', ') : 'none',
      '; reduction witness(es): ', witness.length ? witness.join('; ') : 'none', '; matched losses ',
      cmp.matchedLosses, ', matched gains ', cmp.matchedGains, ' (request level, against none).');
  });
  if (r.R5.status === 'determined') {
    para('**R5 result:** eligible finite caps: ', r.R5.eligible.length ? r.R5.eligible.join(', ') : 'none',
      '; the rule winner (smallest eligible, else none) is **', r.R5.winner, '**; in force **256**; ',
      'disposition **', r.R5.disposition, '**.');
  } else {
    para('**R5 result: UNDETERMINED.** No winner is claimed (the measured winner `none` is not the default ',
      'for missing evidence). Missing or invalid evidence: ', r.R5.missing.join(', '), '.');
  }

  heading('## 3. C: the 6-row table (12 requests per row)');
  const rows6 = [];
  ['4', '6'].forEach((s) => r.cellKeys.R9.forEach((key) => {
    rows6.push(['C' + s, cellName(key)].concat(workRow(r.cells['window|' + s + '|' + key])));
  }));
  table(['Cutoff', 'Cell', 'Exact', 'In band / shallow / errors', 'Upper median full ratings',
    'Full ratings (sum)', 'Attempts', WORK_HEAD, 'Generation s (sum; descriptive)'], rows6);
  const total = (s) => (r.C.totals[s] === null ? 'n/a' : r.C.totals[s] + '/36');
  if (r.C.status === 'determined') {
    para('Totals over the three cells: C4 **', total('4'), '**, C6 **', total('6'), '**. Rule (more exact ',
      'hits wins; C6 on any tie): ', r.C.tie ? '**a tie, so C6** (a tie is a changed winner, never ' +
      '"reconfirmed C4")' : 'C' + r.C.winner + ' has more exact hits', '. Rule winner **C', r.C.winner,
    '**, in force C4, disposition **', r.C.disposition, '**.');
  } else {
    para('Totals over the three cells: C4 **', total('4'), '**, C6 **', total('6'), '**. **UNDETERMINED**: ',
      'no winner is claimed. Missing or invalid: ', r.C.missing.join(', '), '.');
  }

  heading('## 4. Disposition of each choice');
  table(['Choice', 'In force', 'Rule winner', 'Disposition'], [
    ['R5 shallow allowance', '256', win(r.R5), r.R5.disposition],
    ['C short-chain cutoff', 'C4', r.C.winner === null ? 'undetermined' : 'C' + r.C.winner,
      r.C.disposition]]);
  para('**Milestone status: ', r.decisionStatus, '.** The one-factor results prove nothing about the joint ',
    'behavior of two changed defaults. Both experiments ran under the unchanged production defaults 256 / ',
    'C4: the winner of one was never installed for the other, and no combined pair was tested.',
    r.pendingChoices.length ? ' The owner chooses, separately for each changed choice: A keep the current ' +
      'value (the computed winner stays recorded as measured), or B insert a separate implementation task ' +
      'that changes it and re-runs GG/GR/GH/GD. No default, source or GQ-final change is made by this task.' :
      '');

  heading('## 5. Admission and attempts (MS18b-host-active; the strict screen is kept unchanged)');
  const a = r.admission;
  para('Entries of the plan: **', a.entries, '**; commands executed (payload started): **', a.executed,
    '**; admission attempt records: **', a.attemptRecords, '**; holds (admitted false): **', a.holds,
    '**; entries re-asked: **', a.reAsked.length, '**',
    a.reAsked.length ? ' (' + a.reAsked.join(', ') + ')' : '',
    '; unexecuted gaps after two holds: **', a.gaps.length, '**', a.gaps.length ? ' (' + a.gaps.join(', ') +
    ')' : '', '; held once and not yet re-asked: ', a.heldPending.length, '; not run: ', a.notRun.length,
    '. Raw strict screen of the executed commands: **', a.strictFailed, ' failed, ', a.strictPassed,
    ' passed** (mean <= 0.5 and max <= 1.0 busy cores of the logical CPUs). Admission was decided ',
    'separately by the named policy (the confirmed host PID 1968 only, no other process at 0.5 CPU-s per ',
    'second or more over the snapshot window, locks, valid counters); no CPU was subtracted and no failed ',
    'screen was turned into a pass. Timing label for every command: **', LABEL, '**.');
  const attRows = [];
  r.entries.forEach((e) => e.attempts.forEach((x) => {
    const rec = x.record;
    const host = rec.hostObservation && finite(rec.hostObservation.cpuSeconds) ?
      f(rec.hostObservation.cpuSeconds, 2) + ' (' + f(rec.hostObservation.cpuSecondsPerSecond, 3) + '/s)' :
      'n/a';
    const other = rec.processContext ? rec.processContext.busiest.filter((p) => !p.host && !p.launchChain)
      .slice(0, 1).map((p) => p.name + ' ' + f(p.perSecond, 3) + '/s').join('') : '-';
    const span = rec.payloadStartedAt ? rec.payloadStartedAt.slice(11, 19) + '-' +
      (rec.payloadEndedAt || '').slice(11, 19) : 'not started';
    attRows.push([x.id, rec.ready ? 'passed' : 'FAILED', f(rec.meanBusyCores, 3) + ' / ' +
      f(rec.maxBusyCores, 3), rec.admitted ? 'admitted' : 'HOLD: ' + (rec.admissionHolds || []).join(' / '),
    host, other || '-', span, rec.payloadSeconds === undefined ? '-' : f(rec.payloadSeconds, 1),
    String(rec.payloadExit === undefined ? '-' : rec.payloadExit), x.log ? f(x.log.waitSeconds, 1) : 'n/a',
    x.log && x.log.foreignLockSeenAtAsk ? 'seen' : 'none seen']);
  }));
  table(['Attempt record', 'Strict screen', 'Mean / max busy cores', 'Admission', 'Host PID 1968 CPU-s',
    'Busiest other process', 'Payload start-end', 'Payload s', 'Exit', 'Lock wait s', 'Foreign lock'],
  attRows);
  para('Payload seconds of the executed commands: **', f(r.time.payloadSeconds, 1), ' s** in ',
    r.time.commands, ' commands (readiness ', f(r.time.readinessSeconds, 1), ' s, kept separately). ',
    'Descriptive, "', LABEL, '".');
  if (r.determinism) {
    const d = r.determinism;
    para('Informational reproduction check against MS18a (same source, same requests, the default ',
      'settings): the shallow-allowance 256 rows give the same puzzle hash as MS18a in ', d.cap256.samePuzzle,
      ' of ', d.cap256.total, ' requests (same exact flag in ', d.cap256.sameExactFlag, '); the C4 rows in ',
      d.window4.samePuzzle, ' of ', d.window4.total, ' (same exact flag in ', d.window4.sameExactFlag,
      '). It is a disclosure, not a check.');
  }

  heading('## 6. Reporter checks');
  out.push(r.checks.length + ' checks, ' + r.failedChecks.length + ' failed' +
    (r.failedChecks.length ? ':' : '.'), '');
  r.failedChecks.forEach((c) => out.push('- FAIL ' + c.label + (c.detail ? ' (' + c.detail + ')' : '')));
  out.push('');
  return out.join('\r\n');
}

/** The Vietnamese question of the brief's template: complete validated data with a changed choice only. */
function discordText(r, evidencePath) {
  if (r.milestone !== 'complete' || r.pendingChoices.length === 0 || r.failedChecks.length > 0) return null;
  const sign = (n) => (n > 0 ? '+' : '') + n;
  const diffs = r.R5.comparisons.map((c) => 'cap ' + c.setting + ': ' +
    c.perCell.map((x) => cellName(x.cell) + ' ' + sign(x.hitDelta)).join(', ')).join('; ');
  const medians = r.R5.comparisons.map((c) => {
    const ok = c.perCell.filter((x) => x.strictReduction)
      .map((x) => cellName(x.cell) + ': ' + x.noneUpperMedian + ' -> ' + x.upperMedian);
    const lost = c.hitLossCells.length ?
      ' (mất exact ở ' + c.hitLossCells.map(cellName).join(', ') + ')' : '';
    return 'cap ' + c.setting + ': ' + (ok.length ? ok.join(', ') : 'không đạt') + lost;
  }).join('; ');
  return [
    'MS18b đã đo đủ 360 lượt. R5: hiện tại 256; quy tắc chọn ' + r.R5.winner + '; chênh lệch số exact ' +
    'theo từng ô so với none: ' + diffs + '; điều kiện trung vị full ratings: ' + medians + '.',
    'C: hiện tại 4; C4=' + r.C.totals['4'] + '/36, C6=' + r.C.totals['6'] + '/36; quy tắc chọn ' +
    r.C.winner + ' (hòa chọn 6).',
    'Chưa đổi mã; GQ-final dừng chờ quyết định. Với từng mục thay đổi, chọn A giữ giá trị hiện tại, hay B ' +
    'chèn task đổi sang giá trị được chọn và chạy lại GG/GR/GH/GD cùng dữ liệu cuối bị ảnh hưởng trước khi ' +
    'tiếp tục? Bằng chứng: ' + evidencePath + '.'
  ].join('\r\n') + '\r\n';
}

// ---- main -------------------------------------------------------------------------------------------------
function loadEnv() {
  const load = (rel) => {
    const abs = path.join(GEN, rel);
    if (!fs.existsSync(abs)) return;
    vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  };
  const runner = fs.readFileSync(path.join(GEN, 'tests/node-runner.js'), 'utf8');
  (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g) || [])
    .map((s) => s.slice(1, -1)).forEach(load);
  load('tests/fixtures/perf-helper.js');
  load('tests/fixtures/difficulty-diagnostics.js');
  return { mergeShards: globalThis.SG.fixtures.difficultyDiagnostics.mergeShards };
}

function ms18aRows(basisDir, manifest) {
  const out = {};
  manifest.experiments.R5.cells.concat(manifest.experiments.R9.cells).forEach((c) => {
    const key = c.variant + '/' + c.level;
    if (out[key]) return;
    const files = [path.join(basisDir, c.variant + '-' + c.level + '.json')];
    const shards = path.join(basisDir, 'shards');
    if (fs.existsSync(shards)) {
      fs.readdirSync(shards).filter((n) => n.startsWith(c.variant + '-' + c.level + '-'))
        .forEach((n) => files.push(path.join(shards, n)));
    }
    const rows = [];
    files.filter((x) => fs.existsSync(x)).forEach((x) => {
      JSON.parse(fs.readFileSync(x, 'utf8')).rows.forEach((row) => rows.push(row));
    });
    rows.sort((p, q) => p.index - q.index);
    if (rows.length === 12) out[key] = rows;
  });
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const opt = (name, fallback) => {
    const hit = argv.find((x) => x.startsWith('--' + name + '='));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  const dir = path.resolve(opt('dir', path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18b')));
  const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
  const plan = JSON.parse(readText(path.join(dir, 'plan-recheck.json')));
  const manifest = JSON.parse(readText(path.join(dir, 'manifest-keys.json')));
  const input = {
    plan: plan, manifest: manifest, ledgers: {}, ledgerFiles: {}, readiness: {}, transcripts: {},
    lockLog: (readText(path.join(dir, 'lock-log.jsonl')) || '').split(/\r?\n/).filter(Boolean)
      .map((line) => JSON.parse(line)),
    ms18a: null
  };
  plan.entries.forEach((entry) => {
    const file = path.join(dir, entry.json);
    const bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
    if (bytes) {
      try {
        input.ledgers[entry.id] = JSON.parse(bytes.toString('utf8'));
      } catch (err) {
        input.ledgers[entry.id] = { schema: 0, complete: false, rows: [] };
      }
      input.ledgerFiles[entry.id] = { file: entry.json, sha256: crypto.createHash('sha256').update(bytes)
        .digest('hex').toUpperCase() };
    }
    ['', '-admission2'].forEach((suffix) => {
      const rid = entry.id + suffix;
      const ready = readText(path.join(dir, 'readiness', rid + '.json'));
      if (ready) input.readiness[rid] = JSON.parse(ready);
      const log = readText(path.join(dir, 'logs', rid + '.txt'));
      if (log !== null) input.transcripts[rid] = log;
    });
  });
  const basisDir = opt('ms18a', path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18a'));
  if (basisDir !== 'none' && fs.existsSync(basisDir)) input.ms18a = ms18aRows(basisDir, manifest);
  const result = analyse(input, loadEnv());
  const md = renderMarkdown(result, plan);
  const rel = path.relative(REPO, dir).replace(/\//g, '\\');
  const discord = discordText(result, rel + '\\decision-packet.md');
  const write = (name, text) => {
    const file = opt(name, null);
    if (file && text !== null) fs.writeFileSync(path.resolve(file), text, 'utf8');
  };
  write('out-md', md);
  const json = {
    schema: 1, milestone: result.milestone, decisionStatus: result.decisionStatus, complete: result.complete,
    coverage: result.coverage, R5: Object.assign({}, result.R5, { table: undefined }),
    C: Object.assign({}, result.C, { table: undefined }), identity: result.identity,
    commits: result.commits, admission: result.admission, time: result.time,
    determinism: result.determinism,
    cells: Object.keys(result.cells).map((k) => Object.assign({ slot: k }, result.cells[k],
      { rows: undefined })),
    entries: result.entries.map((e) => ({ id: e.id, status: e.status, problems: e.problems,
      executedId: e.executedId, ledger: e.ledgerFile, checks: e.checks, transcript: e.transcript })),
    checks: result.checks, discord: discord
  };
  write('out-json', JSON.stringify(json, null, 2).replace(/\n/g, '\r\n') + '\r\n');
  write('out-discord', discord);
  const c = result.coverage;
  console.log('status: ' + result.decisionStatus);
  console.log('recorded ' + c.recorded.total + ' of 360 (R5 ' + c.recorded.R5 + ', R9 ' + c.recorded.R9 +
    '); checks ' + (result.checks.length - result.failedChecks.length) + ' of ' + result.checks.length +
    ' pass');
  console.log('R5: in force ' + result.R5.inForce + ', winner ' + result.R5.winner + ', ' +
    result.R5.disposition);
  console.log('C: in force C' + result.C.inForce + ', winner ' +
    (result.C.winner === null ? 'null' : 'C' + result.C.winner) + ' (C4 ' + result.C.totals['4'] + ', C6 ' +
    result.C.totals['6'] + '), ' + result.C.disposition);
  result.failedChecks.forEach((x) => {
    console.log('FAIL ' + x.label + (x.detail ? ' (' + x.detail + ')' : ''));
  });
  process.exitCode = exitCodeOf(result);
}

module.exports = {
  analyse: analyse, renderMarkdown: renderMarkdown, discordText: discordText, checksVerdict: checksVerdict,
  ledgerProblems: ledgerProblems, transcriptFacts: transcriptFacts, loadEnv: loadEnv, exitCodeOf: exitCodeOf
};
if (require.main === module) main();
