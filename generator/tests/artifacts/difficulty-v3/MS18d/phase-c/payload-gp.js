'use strict';

/*
 * MS18d Phase C0b task-owned (SA1 C0-6): the two typed G3 payloads of the final GP matrix, registered in
 * payloads.js next to the stock `gp-cell` and the `generic` type, with the plan checks the controller makes
 * for them before admission.
 *
 *   gp-recorder  allowsMissExit=false. Complete success = the recorder's exit 0 with zero stderr bytes, a
 *                clean transport and barrier, stdout exactly the start line and the completion marker, and
 *                the ledger the marker names: the exact bytes (size and SHA-256), the planned chunk, n raw
 *                finite non-negative times in request order with the planned indices and seeds, the campaign
 *                identity, empty Node flags, no stand-in provenance (unless the request itself is a
 *                stand-in). It makes no performance verdict; any other exit is a STOP.
 *   gp-merge     allowsMissExit=true (R1). Exit 0 = complete pass, 1 = complete numerical MISS or gate
 *                failure ONLY, and only when stdout ends in the machine-readable result line that agrees
 *                with the exit, the requested scope, the report.json of the run and the numbers (the strict
 *                p95 < target, or the integer success count against the required count); exit 1 without that
 *                line, with contradictory data or with any stderr byte is a STOP, never a MISS. 2 and 3 are
 *                STOPs.
 * `extraChecks` (the controller runs it inside the lock, before admission): the plan manifest (raw and
 * canonical digest, soundness), the request against the manifest (chunk, declared slot, identities, policy),
 * and for a recorder the attempt accounting of its chunk derived from the immutable run folders and the C
 * lock log (R4, attempts.js). Records go into the run directory as plan-check.json and attempts.json.
 */
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const { sha256 } = require('./common.js');
const { STOP_EXIT } = require('./classify.js');
const { MARKER, START, validateLedgerShape } = require('./ledger-schema.js');
const { frozenRecorderArgs } = require('./merge-core.js');
const { chunkAttempts } = require('./attempts.js');

const MERGE_REL = 'tests\\artifacts\\difficulty-v3\\MS18d\\phase-c\\merge-gp.js';
const RESULT_CELL = new RegExp('^ms18d-gp-merge-result scope=(cell:\\S+) complete=true ' +
  'meets=(true|false) p95=(\\S+) target=(\\S+)$');
const RESULT_ALL = new RegExp('^ms18d-gp-merge-result scope=(all-79) complete=true meets=(true|false) ' +
  'successes=(\\d+) cells=(\\d+) required=(\\d+)$');

const same = (a, b) => plan.canonicalJson(a) === plan.canonicalJson(b);
const linesOf = (text) => String(text === null || text === undefined ? '' : text).split(/\r?\n/)
  .filter((l) => l.trim() !== '');

/** The checks every payload of the final matrix shares; `exits` are the command exits it defines. */
function transportCheck(e, exits) {
  const kinds = [];
  const problems = [];
  const bad = (kind, text) => {
    if (kinds.indexOf(kind) === -1) kinds.push(kind);
    problems.push(text);
  };
  const exitCode = e.cli && Number.isInteger(e.cli.exit) ? e.cli.exit : null;
  if (!e.cli || e.cli.signal) bad('cli-signal', 'the command ended on the signal ' + (e.cli && e.cli.signal));
  else if (exitCode === null) bad('cli-no-exit', 'the command has no recorded exit code');
  else if (exits.indexOf(exitCode) === -1) {
    bad('cli-exit', 'the command exit ' + exitCode + ' is not one of ' + exits.join('/') +
      ' for this payload');
  }
  if (!Number.isInteger(e.stderrBytes)) bad('stderr-output', 'the raw stderr byte count was not recorded');
  else if (e.stderrBytes !== 0) bad('stderr-output', e.stderrBytes + ' raw byte(s) arrived on stderr');
  if (e.stderr !== '') bad('stderr-output', 'the retained stderr is missing or not empty');
  const m = e.tee && typeof e.tee.marker === 'string'
    ? /^exit=(\d+) seconds=[0-9.]+$/.exec(e.tee.marker) : null;
  if (!m) bad('marker-missing', 'the tee transcript does not end with exit=<code> seconds=<n>');
  else if (exitCode !== null && Number(m[1]) !== exitCode) bad('tee-status-mismatch', 'the tee marker exit');
  if (!e.tee || e.tee.exit !== exitCode) bad('tee-status-mismatch', 'the tee process exit differs');
  if (!e.barrier || e.barrier.verdict !== 'clean') bad('orphan', 'the orphan barrier verdict is not clean');
  if (!e.binding || e.binding.ok !== true) bad('binding', 'the source binding is not a proved success');
  if (!e.acquisition || e.acquisition.decision !== 'proceed') bad('admission', 'acquisition not proceeded');
  return { kinds, problems, exitCode, bad };
}

function resultOf(profile, t, e, extra) {
  const complete = t.problems.length === 0;
  const miss = complete && t.exitCode === 1;
  return Object.assign({
    schema: 'ms18d-c-result-class-1', profile, outcome: !complete ? 'stop' : miss ? 'miss' : 'success',
    complete, controllerExit: !complete ? STOP_EXIT : miss ? 1 : 0, kinds: t.kinds, problems: t.problems,
    cli: { exit: t.exitCode, signal: e.cli ? e.cli.signal || null : null },
    tee: { marker: e.tee ? e.tee.marker : null, exit: e.tee ? e.tee.exit : null }
  }, extra || {});
}

/** The plan manifest the request names: { doc, planFile, rawSha256 }. Throws on any difference. */
function readPlan(request) {
  const planFile = path.resolve(request.repo, request.plan.file);
  if (path.relative(request.repo, planFile).startsWith('..')) throw new Error('the plan is outside the repo');
  const bytes = fs.readFileSync(planFile);
  const doc = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  const problems = plan.verifyManifest(doc);
  if (problems.length > 0) throw new Error('the plan manifest is unsound: ' + problems[0]);
  if (doc.manifestSha256 !== request.plan.manifestSha256 || sha256(bytes) !== request.plan.rawSha256) {
    throw new Error('the plan is not the one the request names');
  }
  return { doc, planFile, rawSha256: sha256(bytes) };
}

/** The identities the request expects against the manifest (a difference is a hold). */
function identityProblems(request, doc) {
  const problems = [];
  const x = request.expected || {};
  const ids = x.identities || {};
  if (ids.hashIdentity !== doc.sources.hashIdentity) problems.push('E hash of the request');
  if (ids.replayIdentity !== doc.sources.replayIdentity) problems.push('E replay of the request');
  if (ids.sources !== doc.sources.sources) problems.push('sources of the request');
  if (x.tableSha256 !== doc.targets.tableSha256) problems.push('target table of the request');
  if (x.node !== doc.environment.node) problems.push('Node of the request');
  if (!same(x.machine, doc.environment.machine)) problems.push('machine of the request');
  if (!same(request.policy, doc.policy)) problems.push('selected policy of the request');
  if (!/^[0-9a-f]{40}$/.test(String(x.base))) problems.push('no campaign base in the request');
  return problems;
}

const relDir = (request) => path.relative(request.repo, path.resolve(request.runDir))
  .replace(/\\/g, '/');

function commonRequest(request, what) {
  const p = request.plan;
  if (!p || typeof p.file !== 'string' || !/^[0-9a-f]{64}$/.test(p.rawSha256) ||
    !/^[0-9a-f]{64}$/.test(p.manifestSha256)) throw new Error(what + ' request names its plan');
}

const recorder = {
  type: 'gp-recorder',
  allowsMissExit: false,
  validateRequest(request) {
    commonRequest(request, 'a gp-recorder');
    const c = request.chunk;
    if (!c || typeof c.chunkId !== 'string' || !Number.isInteger(c.i0) || !Number.isInteger(c.n)) {
      throw new Error('a gp-recorder request carries its planned chunk');
    }
    if (request.attempt !== 1 && request.attempt !== 2) throw new Error('attempt is 1 or 2');
    const args = request.command.args;
    if (request.standin !== true) {
      const want = frozenRecorderArgs(request.plan.file, { dir: relDir(request), chunkId: c.chunkId });
      if (!same(args, want)) throw new Error('a real recorder takes the frozen command line only');
    }
  },
  cellOf: (request) => ({ variant: request.chunk.variant, level: request.chunk.level,
    targetMs: request.chunk.target }),
  declaredDirs: (request) => plan.declaredDirsOf(readPlan(request).doc),
  extraChecks(request, ctx) {
    const problems = [];
    let doc = null;
    try {
      doc = readPlan(request).doc;
    } catch (err) {
      problems.push(err.message);
    }
    const records = {};
    if (doc) {
      identityProblems(request, doc).forEach((p) => problems.push(p));
      const slot = plan.slotForDir(doc, relDir(request));
      const chunk = doc.chunks.filter((c) => c.chunkId === request.chunk.chunkId)[0];
      if (!slot || slot.role !== 'chunk' || slot.chunkId !== request.chunk.chunkId ||
        slot.attempt !== request.attempt || slot.runId !== request.runId) {
        problems.push('the run directory is not the declared slot of this chunk attempt');
      }
      if (!chunk || !same(chunk, request.chunk)) problems.push('the request chunk is not the planned entry');
      const attempts = chunkAttempts({ baseDir: path.dirname(path.resolve(request.runDir)),
        chunkId: request.chunk.chunkId, runId: request.runId, ledgerFile: ctx.cLedger,
        rulings: ctx.journals ? ctx.journals.rulings : null, nowMs: ctx.nowMs });
      records['attempts.json'] = attempts;
      if (attempts.decision !== 'allow') attempts.reasons.forEach((r) => problems.push('attempts: ' + r));
      if (request.attempt === 1 && attempts.admissions >= 1) {
        problems.push('attempt 1 although another run folder of the chunk exists');
      }
      if (request.attempt === 2 && attempts.admissions < 1) problems.push('attempt 2 without an attempt 1');
    }
    records['plan-check.json'] = { schema: 'ms18d-c-plan-check-1', ok: problems.length === 0, problems,
      planManifestSha256: doc ? doc.manifestSha256 : null };
    return { ok: problems.length === 0, problems, records };
  },
  classify(e) {
    const t = transportCheck(e, [0]);
    const chunk = e.request.chunk;
    const lines = linesOf(e.stdout);
    const start = lines.length === 2 ? START.exec(lines[0]) : null;
    const marker = lines.length === 2 ? MARKER.exec(lines[1]) : null;
    if (!start || !marker) t.bad('output', 'stdout is not exactly the start line and the completion marker');
    else if (start[1] !== chunk.chunkId || Number(start[2]) !== chunk.i0 || Number(start[3]) !== chunk.n ||
      Number(start[4]) !== chunk.seedBase || marker[1] !== chunk.chunkId) {
      t.bad('output', 'the start line or the marker names another chunk');
    }
    const bytes = e.readRunBytes('ledger.json');
    let ledger = null;
    if (bytes === null) t.bad('ledger', 'ledger.json is missing');
    else {
      if (marker && (Number(marker[2]) !== bytes.length || marker[3] !== sha256(bytes))) {
        t.bad('ledger', 'the completion marker is not the size and digest of ledger.json');
      }
      try {
        ledger = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
      } catch (err) {
        t.bad('ledger', 'ledger.json is not JSON');
      }
    }
    if (ledger) {
      validateLedgerShape(ledger, chunk, { allowStandin: e.request.standin === true })
        .forEach((p) => t.bad('ledger', 'ledger: ' + p));
      const id = ledger.identity || {};
      if (id.planManifestSha256 !== e.request.plan.manifestSha256) t.bad('ledger', 'ledger: another plan');
      if (id.base !== (e.request.expected && e.request.expected.base)) {
        t.bad('ledger', 'ledger: campaign base');
      }
      const o = ledger.observation || {};
      if (!o.provenance || o.provenance.standin !== (e.request.standin === true)) {
        t.bad('ledger', 'ledger: provenance disagrees with the request');
      }
      if (e.binding && e.binding.head && o.head !== e.binding.head.actual) t.bad('ledger', 'ledger: HEAD');
    }
    return resultOf('gp-recorder', t, e, { ledger: ledger ? { chunkId: ledger.chunk && ledger.chunk.chunkId,
      requests: Array.isArray(ledger.requests) ? ledger.requests.length : null,
      sha256: bytes === null ? null : sha256(bytes) } : null });
  }
};

const merge = {
  type: 'gp-merge',
  allowsMissExit: true,
  validateRequest(request) {
    commonRequest(request, 'a gp-merge');
    if (!/^(all-79|cell:[A-Za-z0-9]+\/[A-Za-z0-9]+)$/.test(String(request.scope))) {
      throw new Error('a gp-merge request names its scope');
    }
    const g = request.gate;
    if (!g || !Number.isInteger(g.cells) || !Number.isInteger(g.requiredSuccesses)) {
      throw new Error('a gp-merge request carries the gate of the manifest');
    }
    if (request.standin !== true) {
      const out = ('..\\' + relDir(request) + '\\report.json').replace(/\//g, '\\');
      const want = [MERGE_REL, '--plan=' + request.plan.file, '--scope=' + request.scope, '--out=' + out];
      if (!same(request.command.args, want)) {
        throw new Error('a real merge takes the frozen command line only');
      }
    }
  },
  cellOf: () => null,
  declaredDirs: (request) => plan.declaredDirsOf(readPlan(request).doc),
  extraChecks(request) {
    const problems = [];
    let doc = null;
    try {
      doc = readPlan(request).doc;
    } catch (err) {
      problems.push(err.message);
    }
    if (doc) {
      identityProblems(request, doc).forEach((p) => problems.push(p));
      const slot = plan.slotForDir(doc, relDir(request));
      const all = request.scope === 'all-79';
      if (!slot || slot.role !== (all ? 'final-merge' : 'cell-merge') ||
        (!all && 'cell:' + slot.cell !== request.scope) || slot.runId !== request.runId) {
        problems.push('the run directory is not the declared merge slot of this scope');
      }
      if (request.gate.cells !== doc.gate.cells ||
        request.gate.requiredSuccesses !== doc.gate.requiredSuccesses) {
        problems.push('the gate of the request is not the manifest gate');
      }
    }
    return { ok: problems.length === 0, problems, records: { 'plan-check.json': {
      schema: 'ms18d-c-plan-check-1', ok: problems.length === 0, problems,
      planManifestSha256: doc ? doc.manifestSha256 : null } } };
  },
  classify(e) {
    const t = transportCheck(e, [0, 1]);
    const lines = linesOf(e.stdout);
    const last = lines.length > 0 ? lines[lines.length - 1] : null;
    const cell = last === null ? null : RESULT_CELL.exec(last);
    const all = last === null ? null : RESULT_ALL.exec(last);
    const hit = cell || all;
    let meets = null;
    if (!hit) t.bad('result-line', 'stdout does not end in a complete machine-readable result line');
    else {
      meets = hit[2] === 'true';
      if (hit[1] !== e.request.scope) t.bad('result-line', 'the result line names another scope: ' + hit[1]);
      if (t.exitCode === 0 && !meets) t.bad('contradiction', 'exit 0 with meets=false');
      if (t.exitCode === 1 && meets) t.bad('contradiction', 'exit 1 with meets=true');
    }
    let report = null;
    const reportText = e.readRunFile('report.json');
    if (reportText === null) t.bad('report', 'report.json is missing');
    else {
      try {
        report = JSON.parse(reportText.replace(/^\uFEFF/, ''));
      } catch (err) {
        t.bad('report', 'report.json is not JSON');
      }
    }
    if (hit && report) {
      if (report.resultLine !== last || report.complete !== true || report.scope !== hit[1] ||
        report.meets !== meets) t.bad('report', 'report.json disagrees with the result line');
      if (cell) {
        const p95 = Number(cell[3]);
        const target = Number(cell[4]);
        const stats = report.cells && report.cells.length === 1 ? report.cells[0].stats : null;
        if (!Number.isFinite(p95) || !Number.isFinite(target) || meets !== (p95 < target)) {
          t.bad('contradiction', 'meets is not the strict p95 < target of the line');
        }
        if (!stats || stats.p95 !== p95 || stats.target !== target) {
          t.bad('report', 'the numbers of the line are not those of report.json');
        }
      } else {
        const successes = Number(all[3]);
        const cells = Number(all[4]);
        const required = Number(all[5]);
        const done = report.cells ? report.cells.filter((c) => c.complete && c.stats).length : -1;
        const met = report.cells
          ? report.cells.filter((c) => c.complete && c.stats && c.stats.meets).length : -1;
        if (cells !== e.request.gate.cells || required !== e.request.gate.requiredSuccesses) {
          t.bad('contradiction', 'the line is not for the gate of the manifest');
        }
        if (meets !== (successes >= required)) {
          t.bad('contradiction', 'meets is not successes >= required');
        }
        if (done !== cells || met !== successes) {
          t.bad('report', 'the success count is not that of report.json');
        }
      }
    }
    return resultOf('gp-merge', t, e, { result: hit ? { line: last, meets } : null });
  }
};

module.exports = { recorder, merge, transportCheck, readPlan, MERGE_REL };
