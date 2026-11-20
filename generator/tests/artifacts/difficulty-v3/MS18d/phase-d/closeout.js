'use strict';

/*
 * MS18d Phase D, task-owned and FILE-ONLY (dispatch 6e4d97bc / b54e67ae): the report, audit and coverage checks
 * of the closeout. It reads the committed campaign records, the saved final report and the Phase D results; it
 * generates nothing, runs no test and no recorder, merges nothing, and writes ONLY the new files that --out /
 * --csv / --rows-md name (an existing file is refused: nothing is overwritten). Every mode is called through
 * run-locked-d.ps1 (the shared lock helper and the unchanged tee), like every Phase D Node command.
 *
 *   cells        --csv=<new> --rows-md=<new>   the 79 rows of final.m1/report.json against the V2 plan
 *   audit        --out=<new>                    provenance audit of the 114 consumed ledgers, nine holds, records
 *   consumers    --out=<new>                    consumer/hold/scheduling-version audit, sourced waits, unknowns
 *   extract      --transcript=<file> --out=<new>   the lines of a tee transcript between its markers
 *   register     --register=<json>              mandatory item register check (exit 2 on a problem)
 *   report       --report=<md> --cells=<csv>    the 79 rows of performance-v3.md against the CSV (exit 2)
 *   bindings     ...                            the seven identities and the target re-check validation
 *   coverage     ...                            per-app (suite, ordinal) reconciliation of the quick results
 *   cost         ...                            tee seconds, the projection rule and the job arithmetic
 *   hashes       ...                            the SHA-256 inventory of the owned helpers and Phase D outputs
 * Exit code: 0 everything agrees, 2 a problem (printed), 3 invalid usage or input.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const EV = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d');
const PHASE_C = path.join(EV, 'phase-c');
const TASKS = path.join(REPO, 'tasks', 'difficulty-v3');
const FINAL = path.join(EV, 'gp', 'all-79', 'final.m1');
const SHA_REPORT = '0d2c8baf1ef8131081935747484923dd8593f78f606dd202a0303d7ec324e349';
const SHA_RECOMPUTE = '1779f78ba4451e3906492df53cee88bfff0cc35e30e3d8764f835542ec663409';
const MISSES = ['mega12/expert', 'sohei/hell2', 'butterfly/hell2', 'wordoku/expert', 'wordoku/nightmare'];
const EXPECT = {
  node: 'v26.13.0', cpu: 'AMD EPYC 7763 64-Core Processor', logicalProcessors: 16, memoryGb: 64,
  platform: 'win32 10.0.26300', hashIdentity: '344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1',
  tableSha256: '3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a', sources: '75b0955e3e356bd1',
  replayIdentity: '1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc'
};

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fileSha = (abs) => sha256(fs.readFileSync(abs));
const readText = (abs) => fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
const readJson = (abs) => JSON.parse(readText(abs));
const rel = (abs) => path.relative(REPO, abs).replace(/\\/g, '/');
const crlf = (text) => text.replace(/\r?\n/g, '\r\n');
const jsonText = (value) => JSON.stringify(value, null, 2) + '\n';

/** Writes a NEW file (CRLF, final newline); an existing file is an error, never overwritten. */
function writeNew(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const body = text.endsWith('\n') ? text : text + '\n';
  fs.writeFileSync(abs, Buffer.from(crlf(body), 'utf8'), { flag: 'wx' });
}

function parseArgs(argv) {
  const out = { mode: argv[0], opts: {} };
  argv.slice(1).forEach((arg) => {
    const m = /^--([a-z0-9-]+)=(.*)$/.exec(arg);
    if (!m) throw new Error('not an option --name=value: ' + arg);
    out.opts[m[1]] = m[2];
  });
  return out;
}

const need = (opts, name) => {
  if (!opts[name]) throw new Error('--' + name + ' is required');
  return path.resolve(REPO, opts[name]);
};

/** Display rounding of a millisecond value: four decimals, trailing zeros dropped (never used to compare). */
const fmt = (n) => String(Number(Number(n).toFixed(4)));

const git = (args) => childProcess.execFileSync('git', args, { cwd: REPO, maxBuffer: 1 << 28 });
const isAncestor = (a, b) => childProcess.spawnSync('git', ['merge-base', '--is-ancestor', a, b],
  { cwd: REPO }).status === 0;

// ---------------------------------------------------------------------------------------------------------------
// cells: the 79 rows

/** Plan cells in order: [{ cell, variant, level, target, chunks: [chunk] }] from the V2 `chunks`. */
function planCells(plan) {
  const byCell = new Map();
  plan.chunks.forEach((c) => {
    if (!byCell.has(c.cell)) {
      byCell.set(c.cell, { cell: c.cell, variant: c.variant, level: c.level, target: c.target, chunks: [] });
    }
    byCell.get(c.cell).chunks.push(c);
  });
  return Array.from(byCell.values());
}

/**
 * The rows of the final report against the plan. `ledgerOf(runDir)` returns { sha256, requests } of a consumed
 * ledger or null. { rows, problems }. Nothing is recomputed from the raw times (SA1's recompute did that and
 * is attached): the exact values and verdicts are the merger's; only references, indices and seeds are checked.
 */
function cellRows(report, plan, ledgerOf) {
  const problems = [];
  const bad = (text) => problems.push(text);
  const cells = planCells(plan);
  if (report.schema !== 'ms18d-gp-merge-report-v1') bad('the report schema is not ms18d-gp-merge-report-v1');
  if (report.complete !== true || report.meets !== true) bad('the report is not complete and meeting');
  if (report.successes !== 74 || report.required !== 72) bad('successes/required are not 74/72');
  if (report.totals.requests !== 3950 || report.totals.cells !== 79) bad('totals are not 79 cells / 3950');
  if (report.extraColdStarts !== 35) bad('extraColdStarts is not 35');
  if (report.problems.length !== 0) bad('the report lists problems');
  if (cells.length !== 79) bad('the plan has ' + cells.length + ' cells, not 79');
  if (report.cells.length !== 79) bad('the report has ' + report.cells.length + ' cells, not 79');
  const names = new Set();
  report.cells.forEach((c) => {
    if (names.has(c.cell)) bad('cell ' + c.cell + ' twice in the report');
    names.add(c.cell);
  });
  cells.forEach((c) => { if (!names.has(c.cell)) bad('cell ' + c.cell + ' missing from the report'); });
  const consumed = new Map(report.consumed.map((x) => [x.chunkId, x]));
  if (consumed.size !== 114 || report.consumed.length !== 114) bad('the report does not consume 114 ledgers');
  const rows = [];
  let extra = 0;
  let flagged = 0;
  let meets = 0;
  cells.forEach((pc) => {
    const rc = report.cells.filter((c) => c.cell === pc.cell)[0];
    if (!rc) return;
    const s = rc.stats;
    const verdict = s.p95 < s.target ? 'meets' : 'MISS';
    if ((verdict === 'meets') !== (s.meets === true)) bad(pc.cell + ': the verdict is not strict p95 < target');
    if (rc.complete !== true || s.n !== 50) bad(pc.cell + ': not complete with 50 requests');
    if (s.target !== pc.target) bad(pc.cell + ': the target is not the plan target');
    if (JSON.stringify(rc.chunks.map((x) => x.chunkId)) !== JSON.stringify(pc.chunks.map((x) => x.chunkId))) {
      bad(pc.cell + ': the report chunks are not the plan chunks in order');
    }
    rc.chunks.forEach((x) => {
      if (x.complete !== 1 || x.failed !== 0) bad(pc.cell + ': ' + x.chunkId + ' is not one complete chunk');
    });
    let next = 0;
    pc.chunks.forEach((chunk) => {
      const ref = consumed.get(chunk.chunkId);
      if (!ref) {
        bad(pc.cell + ': ' + chunk.chunkId + ' has no consumed ledger');
        return;
      }
      const led = ledgerOf(ref.runDir);
      if (!led) {
        bad(chunk.chunkId + ': the ledger file is missing');
        return;
      }
      if (led.sha256 !== ref.ledgerSha256) bad(chunk.chunkId + ': the ledger bytes differ from the report');
      if (chunk.i0 !== next) bad(chunk.chunkId + ': the chunk does not start at index ' + next);
      next += chunk.n;
      const idx = led.requests.map((r) => r.index);
      const seeds = led.requests.map((r) => r.seed);
      const wantIdx = chunk.seeds.map((_, i) => chunk.i0 + i);
      if (JSON.stringify(idx) !== JSON.stringify(wantIdx)) bad(chunk.chunkId + ': indices are not the plan indices');
      if (JSON.stringify(seeds) !== JSON.stringify(chunk.seeds)) bad(chunk.chunkId + ': seeds are not the plan seeds');
      if (chunk.seeds.some((x, i) => x !== 7000 + 101 * (chunk.i0 + i))) bad(chunk.chunkId + ': seed rule 7000+101i');
    });
    if (next !== 50) bad(pc.cell + ': its chunks cover ' + next + ' indices, not 50');
    extra += pc.chunks.length - 1;
    if (rc.coldStartSensitive) flagged++;
    if (verdict === 'meets') meets++;
    rows.push({ cell: pc.cell, variant: pc.variant, level: pc.level, n: s.n, p50: s.p50, p95: s.p95, max: s.max,
      mean: s.mean, target: s.target, verdict, k: pc.chunks.length, extra: pc.chunks.length - 1,
      cold: rc.coldStartSensitive === true, coldStart: rc.coldStart });
  });
  if (extra !== 35) bad('extra starts sum to ' + extra + ', not 35');
  if (flagged !== 30) bad('cold-start-sensitive cells: ' + flagged + ', not 30');
  if (meets !== 74) bad('cells meeting: ' + meets + ', not 74');
  const missed = rows.filter((r) => r.verdict === 'MISS').map((r) => r.cell).sort();
  if (JSON.stringify(missed) !== JSON.stringify(MISSES.slice().sort())) bad('the misses are not the five named');
  if (rows.filter((r) => r.k === 1).length !== 62 || rows.filter((r) => r.k > 1).length !== 17) {
    bad('cells are not 62 one-chunk and 17 multi-chunk');
  }
  if (rows.reduce((a, r) => a + r.k, 0) !== 114) bad('chunks do not sum to 114');
  return { rows, problems };
}

const coldText = (r) => r.coldStart.map((c) => c.index + ':' + c.ms + ':' + (c.extraStart ? 'extra' : 'first')).join(';');

function csvOf(rows) {
  const head = 'cell,variant,level,n,p50_ms,p95_ms,max_ms,mean_ms,target_ms,verdict,chunks_k,extra_starts,' +
    'cold_start_sensitive,cold_starts(index:ms:kind)';
  return [head].concat(rows.map((r) => [r.cell, r.variant, r.level, r.n, r.p50, r.p95, r.max, r.mean, r.target,
    r.verdict, r.k, r.extra, r.cold, coldText(r)].join(','))).join('\n') + '\n';
}

const mdRow = (r) => '| ' + [r.cell, r.n, fmt(r.p50), fmt(r.p95), fmt(r.max), r.target,
  r.verdict === 'MISS' ? '**MISS**' : 'meets', r.k, r.extra, r.cold ? 'yes' : '—'].join(' | ') + ' |';

function mdRowsOf(rows) {
  return ['| Cell | n | p50 ms | p95 ms | max ms | Target ms | Verdict | k | Extra starts | Cold flag |',
    '|---|---:|---:|---:|---:|---:|---|---:|---:|---|'].concat(rows.map(mdRow)).join('\n') + '\n';
}

function cellsMode(opts) {
  const report = readJson(path.join(FINAL, 'report.json'));
  const plan = readJson(path.join(PHASE_C, 'gp-chunk-manifest-a3-v2.json'));
  if (fileSha(path.join(FINAL, 'report.json')) !== SHA_REPORT) throw new Error('the report bytes are not those of the dispatch');
  const ledgerOf = (runDir) => {
    const abs = path.join(REPO, runDir, 'ledger.json');
    if (!fs.existsSync(abs)) return null;
    return { sha256: fileSha(abs), requests: readJson(abs).requests };
  };
  const { rows, problems } = cellRows(report, plan, ledgerOf);
  if (problems.length === 0) {
    writeNew(need(opts, 'csv'), csvOf(rows));
    writeNew(need(opts, 'rows-md'), mdRowsOf(rows));
  }
  return { problems, summary: rows.length + ' rows, ' + rows.filter((r) => r.verdict === 'meets').length + ' meet' };
}

// ---------------------------------------------------------------------------------------------------------------
// extract

/** The command output of a tee transcript: the lines between its first (`$ node ...`) and its final marker. */
function bodyOf(text) {
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length < 2 || !/^\$ node /.test(lines[0])) throw new Error('not a tee transcript');
  if (!/^(exit=-?\d+|signal=\S+|spawn-error=.*) seconds=[0-9.]+$/.test(lines[lines.length - 1])) {
    throw new Error('the transcript has no final marker');
  }
  return lines.slice(1, -1);
}

function extractMode(opts) {
  const body = bodyOf(readText(need(opts, 'transcript')));
  writeNew(need(opts, 'out'), body.join('\n') + '\n');
  return { problems: [], summary: body.length + ' lines' };
}

// ---------------------------------------------------------------------------------------------------------------
// audit: the provenance of the 114 consumed ledgers and the nine holds

const EPOCH_PLANS = ['phase-c/gp-chunk-manifest.json', 'phase-c/gp-chunk-manifest.json',
  'phase-c/gp-chunk-manifest.json', 'phase-c/gp-chunk-manifest-a3-v2.json'];
const RECORDS = ['MS18d-gp-campaign-base.jsonl', 'MS18d-gp-campaign-base-2.jsonl', 'MS18d-gp-campaign-base-3.jsonl',
  'MS18d-gp-campaign-base-4.jsonl'];
const SUCCESS_FILES = ['acquisition.json', 'admission.json', 'attempts.json', 'binding.json', 'cleanup-wrapper.json',
  'cleanup.json', 'journals.json', 'ledger.json', 'pids.jsonl', 'plan-check.json', 'readiness-after.json',
  'readiness-before.json', 'readiness.json', 'request.json', 'result.json', 'stderr.txt', 'stdout.txt',
  'transcript.txt', 'watch.json', 'wrapper.json'];
const HOLD_FILES = ['acquisition.json', 'admission.json', 'attempts.json', 'binding.json', 'cleanup-wrapper.json',
  'journals.json', 'pids.jsonl', 'plan-check.json', 'readiness-after.json', 'readiness-before.json',
  'readiness.json', 'request.json', 'result.json', 'watch.json', 'wrapper.json'];
const ACQUISITION_HOLD_FILES = ['acquisition.json', 'cleanup-wrapper.json', 'pids.jsonl', 'request.json', 'result.json',
  'watch.json', 'wrapper.json'];
const HEX64 = /^[0-9a-f]{64}$/;
const GIT_CHECKPOINTS = { e76eb34a: 'e76eb34a3eb8b0c7fd26a5c2041c74b7b81dcda5',
  e1e2233f: 'e1e2233f044021741cd15fb2752a2d62f103416c', '732d1b66': '732d1b66b31e00f996365a796251de1a19dedd53' };

const jsonl = (abs) => readText(abs).split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));

/** The committed blob of `path` at `commit`, and whether `declared` is its hash (LF blob or CRLF checkout form). */
function journalCheck(cache, ref) {
  const key = ref.commit + ':' + ref.path;
  if (!cache.has(key)) {
    let buf = null;
    try {
      buf = git(['show', key]);
    } catch (err) {
      buf = null;
    }
    const lf = buf === null ? null : sha256(buf);
    const crlfForm = buf === null ? null : sha256(Buffer.from(crlf(buf.toString('utf8').replace(/\r\n/g, '\n')), 'utf8'));
    cache.set(key, { lf, crlf: crlfForm });
  }
  const c = cache.get(key);
  const how = c.lf === ref.sha256 ? 'git blob bytes' : (c.crlf === ref.sha256 ? 'CRLF checkout form' : null);
  return { commit: ref.commit, path: ref.path, entryCount: ref.entryCount, sha256: ref.sha256, matches: how };
}

function auditSuccess(ctx, ref, chunk, pair, epochIdx) {
  const dir = path.join(REPO, ref.runDir);
  const j = (name) => readJson(path.join(dir, name));
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(ref.chunkId + ': ' + text); return ok; };
  const files = fs.readdirSync(dir).sort();
  bad(SUCCESS_FILES.every((f) => files.indexOf(f) !== -1), 'a run file is missing');
  const ledger = j('ledger.json');
  const result = j('result.json');
  const wrapper = j('wrapper.json');
  const binding = j('binding.json');
  const journals = j('journals.json');
  const admission = j('admission.json');
  const request = j('request.json');
  const id = ledger.identity;
  const obs = ledger.observation;
  const cls = result.classification;
  bad(fileSha(path.join(dir, 'ledger.json')) === ref.ledgerSha256, 'ledger bytes differ from the report');
  bad(result.outcome === 'success' && result.payloadStarted === true && cls.complete === true &&
    cls.problems.length === 0 && result.controllerExit === 0 && result.cli.exit === 0 && result.tee.exit === 0 &&
    /^exit=0 seconds=/.test(result.tee.marker) && result.rawBytes.stderr === 0 &&
    result.barrier.verdict === 'clean', 'result.json is not a clean success with zero stderr');
  bad(fs.statSync(path.join(dir, 'stderr.txt')).size === 0, 'stderr.txt is not empty');
  bad(wrapper.outcome === 'success' && wrapper.problems.length === 0 && wrapper.releaseVerified === true &&
    wrapper.exit === 0, 'wrapper.json is not a verified success');
  const args = request.command.args;
  bad(request.standin === false && request.profile === 'gp-recorder' && request.cell.targetMs === chunk.target,
    'request.json is not a real gp-recorder request of the planned target');
  bad(args[0].endsWith('record-gp.js') && args[1] === '--plan=' + pair.planRel.replace(/\//g, '\\') &&
    args[2] === '--chunk=' + chunk.chunkId && /ledger\.json$/.test(args[3]), 'the recorder command is not the planned one');
  bad(binding.ok === true && binding.head.actual === ref.head && binding.head.base === pair.base &&
    binding.head.descendant === true && binding.head.ok === true && binding.head.diff.violations.length === 0 &&
    binding.status.reviewedClean === true && obs.head === ref.head, 'binding.json: head/base/status');
  bad(ctx.ancestor(pair.base, ref.head), 'the saved head is not a descendant of its epoch base');
  const idChecks = id.execArgv.length === 0 && id.nodeOptions === '' && id.identityMethod === 'captured-exec-v1' &&
    id.loadedFiles.length > 0 && id.loadedFiles.every((f) => HEX64.test(f.rawSha256) && HEX64.test(f.sha256)) &&
    obs.executedTargets.offered === 79 && obs.executedTargets.matched === 79 && obs.provenance.standin === false;
  bad(idChecks, 'R5: captured executed contents / empty execArgv and NODE_OPTIONS / executed targets');
  bad(id.base === pair.base && id.helperManifestSha256 === pair.helperManifestSha256 &&
    id.planManifestSha256 === pair.planManifestSha256, 'the ledger names another epoch tuple');
  bad(id.hashIdentity === EXPECT.hashIdentity && id.tableSha256 === EXPECT.tableSha256 &&
    id.sourcesPublished === EXPECT.sources && id.node === EXPECT.node && id.machine.cpu === EXPECT.cpu &&
    id.machine.logicalProcessors === EXPECT.logicalProcessors && id.machine.memoryGb === EXPECT.memoryGb &&
    id.machine.platform === EXPECT.platform, 'source/table/Node/machine identity');
  bad(id.selectedPolicy.selector === 'S-OD15' && id.selectedPolicy.choice === 'A' &&
    id.selectedPolicy.name === 'MS18d-GP-host-active' && ledger.policy.trace === 'summary' &&
    ledger.policy.warmup === 0 && ledger.policy.jobs === 1 && ledger.protocol.measureCalls === 1,
    'policy/protocol is not S-OD15 A, trace summary, warmup 0, jobs 1, one measure call');
  bad(ledger.chunk.chunkId === chunk.chunkId && ledger.chunk.i0 === chunk.i0 && ledger.chunk.n === chunk.n &&
    ledger.chunk.target === chunk.target && ledger.requests.length === chunk.n, 'the ledger chunk is not the plan chunk');
  const tr = obs.transport;
  const receipts = ['request', 'acquisition', 'binding', 'admission'].every((k) =>
    fileSha(path.join(dir, tr[k].file)) === tr[k].sha256);
  bad(receipts, 'a transport receipt differs from its saved file');
  const ra = admission.readiness;
  const savedReadiness = fileSha(path.join(dir, 'readiness.json'));
  bad(admission.decision === 'proceed' && admission.acquisition === 'proceed' && admission.binding === true &&
    admission.payloadChecks === true && admission.lateStart === false && ra.complete === true &&
    ra.admitted === true && ra.policy.name === 'MS18d-GP-host-active' && ra.sha256 === savedReadiness &&
    files.indexOf('readiness-before.json') !== -1 && files.indexOf('readiness-after.json') !== -1,
    'admission: complete saved A readiness, admitted, saved file hash');
  const host = journals.hostBinding;
  const rul = journals.rulings;
  bad(host.ok === true && rul.ok === true && host.reference.bindingId === 'host-b1' &&
    host.reference.evidence.verified === true, 'journals.json: host binding / rulings not ok');
  const hostJ = journalCheck(ctx.blobs, host.reference.journal);
  const rulJ = journalCheck(ctx.blobs, rul.reference);
  bad(hostJ.matches !== null && rulJ.matches !== null, 'a journal version used is not the committed blob');
  return { row: { chunkId: ref.chunkId, runId: ref.runDir.split('/').pop(), epoch: epochIdx + 1, head: ref.head,
    ledgerSha256: ref.ledgerSha256, ready: ra.ready, admitted: ra.admitted, readinessSha256: savedReadiness,
    loadedFiles: id.loadedFiles.length, executedTargets: obs.executedTargets, execArgv: id.execArgv,
    nodeOptions: id.nodeOptions, hostJournal: hostJ, rulingsJournal: rulJ, tee: result.tee.marker,
    callToSpawnMs: admission.callToSpawnMs }, problems };
}

function auditHold(ctx, runId, line) {
  const slot = ctx.slots.get(runId);
  const dir = path.join(REPO, slot.dir);
  const files = fs.readdirSync(dir).sort();
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(runId + ': ' + text); };
  const result = readJson(path.join(dir, 'result.json'));
  const wrapper = readJson(path.join(dir, 'wrapper.json'));
  // a hold at acquisition stops before binding, readiness and the journals are written
  const atAcquisition = result.heldAt === 'acquisition';
  bad((atAcquisition ? ACQUISITION_HOLD_FILES : HOLD_FILES).every((f) => files.indexOf(f) !== -1),
    'a hold file is missing');
  bad(files.indexOf('ledger.json') === -1 && files.indexOf('transcript.txt') === -1, 'a hold has a ledger/transcript');
  bad(result.outcome === 'control-hold' && result.payloadStarted === false && result.controllerExit === 64,
    'result.json is not an unstarted control-hold, exit 64');
  bad(wrapper.outcome === 'control-hold' && wrapper.barrierVerdict === 'clean' && wrapper.releaseVerified === true,
    'wrapper.json is not a clean verified hold');
  let host = null;
  let rul = null;
  let head = null;
  if (!atAcquisition) {
    const journals = readJson(path.join(dir, 'journals.json'));
    host = journalCheck(ctx.blobs, journals.hostBinding.reference.journal);
    rul = journalCheck(ctx.blobs, journals.rulings.reference);
    head = readJson(path.join(dir, 'binding.json')).head.actual;
    bad(host.matches !== null && rul.matches !== null, 'a journal version used is not the committed blob');
  }
  return { row: { runId, chunkId: slot.chunkId, attempt: slot.attempt, cLogLine: line, heldAt: result.heldAt,
    reasons: result.reasons, eligibleReAsk: wrapper.eligibleReAsk, payloadStarted: result.payloadStarted,
    controllerExit: result.controllerExit, head, resultSha256: fileSha(path.join(dir, 'result.json')), files,
    hostJournal: host, rulingsJournal: rul, note: atAcquisition ? 'held at acquisition (release-history-unproved) ' +
    'before binding, readiness and the journals are written: no journal version is recorded' : null }, problems };
}

function auditMode(opts) {
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(text); return ok; };
  const report = readJson(path.join(FINAL, 'report.json'));
  const plan = readJson(path.join(PHASE_C, 'gp-chunk-manifest-a3-v2.json'));
  const slots = new Map(plan.runSlots.map((s) => [s.runId, s]));
  const chunkOf = new Map(plan.chunks.map((c) => [c.chunkId, c]));
  const heads = new Map();
  const ctx = { slots, blobs: new Map(), ancestor: (a, b) => {
    const k = a + '>' + b;
    if (!heads.has(k)) heads.set(k, isAncestor(a, b));
    return heads.get(k);
  } };
  // the base records and the declared epoch tuples
  const records = RECORDS.map((f) => jsonl(path.join(TASKS, f))[0]);
  const pairs = report.epochs.pairs.map((p, i) => {
    const planFile = path.join(EV, EPOCH_PLANS[i]);
    return Object.assign({}, p, { planRel: p.plan.file, planManifestSha256: p.plan.manifestSha256,
      planRawFileSha256: fileSha(planFile) });
  });
  bad(pairs.length === 4, 'the report chain has ' + pairs.length + ' pairs, not 4');
  const chain = records.map((rec, i) => {
    const hm = rec.helperManifest;
    const hFile = path.join(REPO, hm.file);
    const same = fileSha(hFile) === hm.sha256;
    bad(same, 'B' + (i + 1) + ': the helper manifest file is not the recorded hash');
    bad(rec.campaignBase === pairs[i].base && hm.sha256 === pairs[i].helperManifestSha256,
      'B' + (i + 1) + ': the record is not the report pair');
    bad(pairs[i].planRawFileSha256 === pairs[i].plan.rawSha256, 'B' + (i + 1) + ': the plan raw hash differs');
    if (i > 0) bad(rec.previousBase === records[i - 1].campaignBase, 'B' + (i + 1) + ': previousBase is not B' + i);
    return { epoch: i + 1, base: rec.campaignBase, previousBase: rec.previousBase || null,
      checkpoint: rec.checkpoint || null, helperManifest: { file: hm.file, sha256: hm.sha256, entries: hm.entries },
      plan: pairs[i].plan, attempts: pairs[i].attempts, record: { file: 'tasks/difficulty-v3/' + RECORDS[i],
      sha256: fileSha(path.join(TASKS, RECORDS[i])) } };
  });
  bad(records[3].checkpoint === GIT_CHECKPOINTS.e76eb34a, 'B4 checkpoint is not e76eb34a');
  // the C log
  const clogAbs = path.join(PHASE_C, 'lock-log.jsonl');
  const clog = jsonl(clogAbs);
  bad(clog.length === 125, 'the C log has ' + clog.length + ' lines, not 125');
  const lineOf = (pred) => clog.map((r, i) => (pred(r) ? i + 1 : 0)).filter((n) => n > 0);
  const successes = clog.map((r, i) => ({ r, n: i + 1 })).filter((x) => x.r.payload === 'gp-recorder' &&
    x.r.outcome === 'success');
  const holds = clog.map((r, i) => ({ r, n: i + 1 })).filter((x) => x.r.outcome === 'control-hold');
  const pre = lineOf((r) => r.type === 'pre-window-hold');
  const merges = lineOf((r) => r.payload === 'gp-merge');
  bad(successes.length === 114 && holds.length === 9 && pre.length === 1 && pre[0] === 24 &&
    merges.length === 1 && merges[0] === 125, 'C log: 114 successes, 9 control-holds, pre-window L24, merge L125');
  bad(clog.every((r) => r.standin === false && (r.problems || []).length === 0), 'a C-log line is a stand-in or has problems');
  // the 114 ledgers
  const ledgers = [];
  report.consumed.forEach((ref) => {
    const chunk = chunkOf.get(ref.chunkId);
    const epochIdx = ref.epoch.id - 1;
    const a = auditSuccess(ctx, ref, chunk, pairs[epochIdx], epochIdx);
    a.problems.forEach((p) => problems.push(p));
    const line = successes.filter((x) => x.r.runId === a.row.runId);
    bad(line.length === 1 && line[0].r.runDir === ref.runDir && line[0].r.releaseVerified === true &&
      line[0].r.barrierVerdict === 'clean', ref.chunkId + ': not exactly one verified C-log success line');
    a.row.cLogLine = line.length === 1 ? line[0].n : null;
    ledgers.push(a.row);
  });
  const perEpoch = [1, 2, 3, 4].map((e) => ledgers.filter((l) => l.epoch === e).length);
  bad(JSON.stringify(perEpoch) === JSON.stringify([22, 0, 89, 3]), 'consumed per epoch is ' + perEpoch);
  // the nine holds
  const holdRows = holds.map((h) => {
    const a = auditHold(ctx, h.r.runId, h.n);
    a.problems.forEach((p) => problems.push(p));
    return a.row;
  });
  // the run folders: exactly the 114 + 9 recorder runs and the merge folder
  const runBase = path.join(EV, 'gp');
  const folders = [];
  fs.readdirSync(runBase, { withFileTypes: true }).filter((d) => d.isDirectory()).forEach((d) => {
    fs.readdirSync(path.join(runBase, d.name), { withFileTypes: true }).filter((x) => x.isDirectory())
      .forEach((x) => folders.push(d.name + '/' + x.name));
  });
  const want = ledgers.map((l) => l.runId).concat(holdRows.map((h) => h.runId));
  const unexpected = folders.filter((f) => f !== 'all-79/final.m1' && want.indexOf(f.split('/')[1]) === -1);
  bad(unexpected.length === 0 && folders.length === 124, 'run folders: ' + folders.length + ', unexpected ' + unexpected);
  // attempts per chunk
  const perChunk = new Map();
  clog.forEach((r, i) => {
    if (r.payload !== 'gp-recorder') return;
    if (!perChunk.has(r.chunkId)) perChunk.set(r.chunkId, []);
    perChunk.get(r.chunkId).push({ line: i + 1, attempt: r.attempt, outcome: r.outcome });
  });
  const S = ['mega16-easy.i0.n50', 'hyper-hard.i0.n50', 'butterfly-master.i0.n50'];
  const attempts = Array.from(perChunk.entries()).map(([chunkId, list]) => {
    const folderRuns = list.filter((x) => x.outcome !== 'pre-window-hold');
    return { chunkId, lines: list, admissions: folderRuns.length,
      successes: list.filter((x) => x.outcome === 'success').length };
  });
  bad(attempts.length === 114 && attempts.every((a) => a.successes === 1), 'not every chunk has exactly one success');
  bad(attempts.filter((a) => S.indexOf(a.chunkId) === -1).every((a) => a.admissions <= 2) &&
    attempts.filter((a) => S.indexOf(a.chunkId) !== -1).every((a) => a.admissions === 3),
    'admissions: two at most except the three owner-approved a3 chunks with three');
  bad(clog.filter((r) => r.attempt && r.attempt > 3).length === 0, 'an attempt above 3');
  bad(JSON.stringify(clog.slice(121, 124).map((r) => r.chunkId)) === JSON.stringify(S) &&
    clog.slice(121, 124).every((r) => r.attempt === 3 && r.outcome === 'success'), 'the three a3s are lines 122-124 in S order');
  // checkpoints: git objects, ancestry and the append-only log prefix
  const checkpoints = Object.keys(GIT_CHECKPOINTS).map((k) => {
    const id = GIT_CHECKPOINTS[k];
    const logBlob = git(['show', id + ':docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl']).toString('utf8');
    return { id, logLines: logBlob.split('\n').filter((l) => l !== '').length, logBlob };
  });
  const prefixOk = checkpoints.every((c, i) => i === 0 || c.logBlob.startsWith(checkpoints[i - 1].logBlob));
  bad(prefixOk && JSON.stringify(checkpoints.map((c) => c.logLines)) === '[121,124,125]',
    'the C log is not the append-only 121 / 124 / 125 line chain at the three checkpoints');
  bad(isAncestor(GIT_CHECKPOINTS.e76eb34a, GIT_CHECKPOINTS.e1e2233f) &&
    isAncestor(GIT_CHECKPOINTS.e1e2233f, GIT_CHECKPOINTS['732d1b66']), 'the checkpoints are not in order');
  // the final merge
  const finalFiles = fs.readdirSync(FINAL).sort().map((f) => ({ file: f, bytes: fs.statSync(path.join(FINAL, f)).size,
    sha256: fileSha(path.join(FINAL, f)) }));
  const fr = readJson(path.join(FINAL, 'result.json'));
  bad(fr.outcome === 'success' && fr.controllerExit === 0 && fr.rawBytes.stderr === 0 &&
    fr.barrier.verdict === 'clean' && fileSha(path.join(FINAL, 'report.json')) === SHA_REPORT &&
    fileSha(path.join(FINAL, 'stderr.txt')) === sha256(Buffer.alloc(0)), 'final.m1 is not a clean exit-0 merge');
  // frozen identities
  const frozen = {};
  const hashFile = (abs) => { frozen[rel(abs)] = { sha256: fileSha(abs), bytes: fs.statSync(abs).size }; };
  [path.join(PHASE_C, 'gp-chunk-manifest.json'), path.join(PHASE_C, 'gp-chunk-manifest-a3-v2.json'),
    path.join(PHASE_C, 'helpers-c4-sha256.txt'), path.join(PHASE_C, 'lock-log.jsonl'),
    path.join(TASKS, 'MS18d-gp-rulings.jsonl'), path.join(TASKS, 'MS18d-gp-host-bindings.jsonl'),
    path.join(TASKS, 'MS18d-gp-host-evidence', 'host-b1.json'),
    path.join(TASKS, 'MS18d-hyper-hard-line-disposition.json'),
    path.join(TASKS, 'MS18d-butterfly-master-line-disposition.json'),
    path.join(TASKS, 'MS18d-gp-campaign-base-2-proof.json'), path.join(TASKS, 'MS18d-gp-campaign-base-3-proof.json'),
    path.join(TASKS, 'MS18d-gp-campaign-base-4-proof.json'), path.join(EV, 'gp-preflight.json'),
    path.join(EV, 'phase-b', 'targets-frozen-final.json'),
    path.join(EV, 'phase-d', 'operator', 'operator-records.json'),
    path.join(EV, 'phase-d', 'sa1-recompute', 'recompute.json')].concat(
    finalFiles.map((f) => path.join(FINAL, f.file))).forEach(hashFile);
  bad(frozen[rel(path.join(EV, 'phase-d', 'sa1-recompute', 'recompute.json'))].sha256 === SHA_RECOMPUTE,
    'the SA1 recompute is not the committed 1779f78b file');
  const operator = readJson(path.join(EV, 'phase-d', 'operator', 'operator-records.json'));
  const operatorFiles = operator.files.map((f) => {
    const abs = path.join(EV, 'phase-d', 'operator', f.name);
    const actual = fileSha(abs);
    bad(actual === f.committedSha256, 'operator file ' + f.name + ' differs from its committed hash');
    return { name: f.name, committedSha256: f.committedSha256, sourceSha256: f.sourceSha256, actualSha256: actual,
      byteIdenticalToSource: f.sourceSha256 === f.committedSha256 };
  });
  const recompute = readJson(path.join(EV, 'phase-d', 'sa1-recompute', 'recompute.json'));
  bad(recompute.problems.length === 0 && recompute.equality.cells === '79/79' &&
    recompute.equality.consumed === '114/114' && recompute.equality.totals === true &&
    recompute.equality.holds === true && recompute.totals.meets === true, 'the SA1 recompute is not an equality');
  // journal versions used, grouped
  const versions = new Map();
  ledgers.map((l) => ({ id: l.runId, k: 'rulings', j: l.rulingsJournal })).concat(
    ledgers.map((l) => ({ id: l.runId, k: 'hostBindings', j: l.hostJournal })),
    holdRows.filter((h) => h.rulingsJournal).map((h) => ({ id: h.runId, k: 'rulings', j: h.rulingsJournal })),
    holdRows.filter((h) => h.hostJournal).map((h) => ({ id: h.runId, k: 'hostBindings', j: h.hostJournal }))
  ).forEach((x) => {
    const key = x.k + ':' + x.j.sha256 + ':' + x.j.entryCount;
    if (!versions.has(key)) versions.set(key, { journal: x.k, path: x.j.path, sha256: x.j.sha256,
      entryCount: x.j.entryCount, runs: [] });
    versions.get(key).runs.push(x.id);
  });
  const doc = { schema: 'ms18d-phase-d-provenance-audit-v1', label: 'file-only audit of committed records; authority ' +
    'stays with the C log, run folders, base records and rulings', report: { file: rel(path.join(FINAL, 'report.json')),
    sha256: SHA_REPORT, identity: report.identity }, chain, cLog: { lines: clog.length, successes: successes.length,
    controlHolds: holds.length, preWindow: pre, finalMerge: merges, checkpointLines: checkpoints.map((c) => ({
    id: c.id, lines: c.logLines })), appendOnly: prefixOk }, perEpochLedgers: perEpoch, attempts, ledgers,
  holds: holdRows, runFolders: { count: folders.length, unexpected }, journalVersions: Array.from(versions.values())
    .map((v) => ({ journal: v.journal, path: v.path, sha256: v.sha256, entryCount: v.entryCount,
      runs: v.runs.length, first: v.runs[0], last: v.runs[v.runs.length - 1] })),
  readyRawVersusAdmitted: { readyFalseAdmitted: ledgers.filter((l) => l.ready === false && l.admitted === true).length,
    readyTrue: ledgers.filter((l) => l.ready === true).length, admittedAll: ledgers.every((l) => l.admitted === true) },
  finalMerge: { runDir: rel(FINAL), files: finalFiles, result: { outcome: fr.outcome, controllerExit: fr.controllerExit,
    teeMarker: fr.tee.marker } }, frozenInputs: frozen, operatorFiles,
  sa1Recompute: { sha256: SHA_RECOMPUTE, totals: recompute.totals, equality: recompute.equality },
  gitCheckpoints: GIT_CHECKPOINTS, problems };
  if (problems.length === 0) writeNew(need(opts, 'out'), jsonText(doc));
  return { problems, summary: ledgers.length + ' ledgers, ' + holdRows.length + ' holds, ' + folders.length + ' folders' };
}

// ---------------------------------------------------------------------------------------------------------------
// consumers: holds, consumer categories, scheduling versions, sourced waits, clocks and unknowns

const S_CHUNKS = ['mega16-easy.i0.n50', 'hyper-hard.i0.n50', 'butterfly-master.i0.n50'];
const HOLD_RUNS = ['mega16-easy.i0.n50.a1', 'mega16-easy.i0.n50.a2', 'mega16-normal.i0.n50.a1',
  'hyper-hard.i0.n50.a1', 'hyper-hard.i0.n50.a2', 'greaterThan-easy.i0.n50.a1', 'butterfly-master.i0.n50.a1',
  'butterfly-master.i0.n50.a2', 'wordoku-veryEasy.i0.n50.a1'];
// the consumer categories: the run records give the process name, PID and rate; the service or the ancestry is the
// pack's identification (a source named here), never read from the run record when it does not hold it
const CATEGORIES = [
  { category: 'EventLog svchost', runs: ['mega16-easy.i0.n50.a1', 'mega16-normal.i0.n50.a1'], expect: [3640],
    name: 'svchost.exe', identification: 'EventLog host (svchost 3640) per the a1 hold of mega16-easy; the run record of ' +
    'mega16-normal a1 names svchost.exe 3640 only', source: 'tasks/difficulty-v3/MS18d-epoch3-release-history-repair.md' },
  { category: 'Dnscache svchost', runs: ['hyper-hard.i0.n50.a1'], expect: [3048], name: 'svchost.exe',
    identification: 'Dnscache host (svchost 3048), at 0.711 beside the Intune PowerShell',
    source: 'tasks/difficulty-v3/MS18d-hyper-hard-holds-and-scheduling.md' },
  { category: 'Intune PowerShell / AgentExecutor', runs: ['hyper-hard.i0.n50.a1', 'hyper-hard.i0.n50.a2'],
    expect: [32956, 20636], name: 'powershell.exe', identification: 'PowerShell 32956 under AgentExecutor 9848 and ' +
    'PowerShell 20636 under AgentExecutor 448, both beneath IntuneWindowsAgent.exe 7220 (reported lineage)',
    source: 'tasks/difficulty-v3/MS18d-hyper-hard-holds-and-scheduling.md, MS18d-hyper-hard-line-disposition.json' },
  { category: 'SenseIR PowerShell', runs: ['greaterThan-easy.i0.n50.a1'], expect: [13104], name: 'powershell.exe',
    identification: 'PowerShell 13104 whose parent was SenseIR.exe 10964 (Defender for Endpoint investigation)',
    source: 'tasks/difficulty-v3/MS18d-gate-senseir-extension.md' },
  { category: 'BackgroundDownload', runs: ['butterfly-master.i0.n50.a1'], expect: [34696], name: 'BackgroundDownload.exe',
    identification: 'BackgroundDownload.exe 34696 (parent svchost 2292)', source: 'tasks/difficulty-v3/MS18d-gate-wide-stability.md' },
  { category: 'MsMpEng', runs: ['butterfly-master.i0.n50.a2'], expect: [5632], name: 'MsMpEng.exe',
    identification: 'MsMpEng.exe 5632 (Defender antivirus)', source: 'tasks/difficulty-v3/MS18d-gate-wide-stability.md' },
  { category: '1ESDevBoxHibernationDelayAgent', runs: ['wordoku-veryEasy.i0.n50.a1'], expect: [30416],
    name: '1ESDevBoxHibernationDelayAgent.exe', identification: 'a new process in the readiness window of the a1 run; ' +
    'a2 succeeded', source: 'docs/difficulty-v3/evidence/MS18d/gp/wordoku-veryEasy/wordoku-veryEasy.i0.n50.a1/readiness.json' }
];
const DISPATCH_CLOCKS = { teeSeconds: [0.921, 1.118, 10.124], controllerSeconds: [10.564, 10.78, 19.811],
  runnerSeconds: [31.1, 30.4, 39.5], mergeTee: 6.889, mergeController: 9.602 };

const plus7 = (ms) => {
  const d = new Date(ms + 7 * 3600 * 1000).toISOString();
  return d.slice(0, 23) + '+07:00';
};

function consumersMode(opts) {
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(text); return ok; };
  const plan = readJson(path.join(PHASE_C, 'gp-chunk-manifest-a3-v2.json'));
  const slots = new Map(plan.runSlots.map((s) => [s.runId, s]));
  const clog = jsonl(path.join(PHASE_C, 'lock-log.jsonl'));
  const operator = readJson(path.join(EV, 'phase-d', 'operator', 'operator-records.json'));
  const lineFor = (runId, outcome) => clog.map((r, i) => (r.runId === runId && r.outcome === outcome ? i + 1 : 0))
    .filter((n) => n > 0);
  const holds = HOLD_RUNS.map((runId) => {
    const dir = path.join(REPO, slots.get(runId).dir);
    const result = readJson(path.join(dir, 'result.json'));
    const wrapper = readJson(path.join(dir, 'wrapper.json'));
    const readinessFile = path.join(dir, 'readiness.json');
    const readiness = fs.existsSync(readinessFile) ? readJson(readinessFile) : null;
    const decision = readiness ? readiness.decision : null;
    const proc = decision && decision.processes ? decision.processes : { consumers: [] };
    const counters = decision && decision.counters ? decision.counters : null;
    const line = lineFor(runId, 'control-hold');
    bad(line.length === 1, runId + ': not exactly one C-log control-hold line');
    return { runId, cLogLine: line[0], requestedAt: wrapper.requestedAt, finished: wrapper.finished,
      heldAt: result.heldAt, kind: decision ? decision.kind : 'acquisition-hold (no readiness: ' +
      result.reasons.join(', ') + ')', reasons: result.reasons,
      eligibleReAsk: result.eligibleReAsk, consumers: proc.consumers.map((c) => ({ pid: c.pid, name: c.name,
        ppid: c.ppid, cpuSecondsPerSecond: c.cpuSecondsPerSecond, newInWindow: c.newInWindow,
        createdAt: plus7(c.createdMs) })), meanBusyCores: counters ? counters.mean : null,
      maxBusyCores: counters ? counters.max : null, resultSha256: fileSha(path.join(dir, 'result.json')) };
  });
  const categories = CATEGORIES.map((c) => {
    const seen = [];
    c.runs.forEach((runId) => {
      const h = holds.filter((x) => x.runId === runId)[0];
      h.consumers.forEach((x) => { if (c.expect.indexOf(x.pid) !== -1) seen.push({ runId, cLogLine: h.cLogLine,
        pid: x.pid, name: x.name, ppid: x.ppid, cpuSecondsPerSecond: x.cpuSecondsPerSecond, at: x.createdAt }); });
    });
    bad(c.expect.every((pid) => seen.some((x) => x.pid === pid)) &&
      c.runs.every((runId) => seen.some((x) => x.runId === runId)) && seen.every((x) => x.name === c.name),
    c.category + ': the hold records do not show the expected process(es)');
    return { category: c.category, identification: c.identification, source: c.source, observed: seen };
  });
  const finishedLines = clog.map((r, i) => ({ r, n: i + 1 }));
  const chunkNo = (n) => plan.chunks[n - 1];
  const boundaries = [24, 41, 42, 58, 97, 98].map((n) => {
    const ch = chunkNo(n);
    const first = finishedLines.filter((x) => x.r.chunkId === ch.chunkId)[0];
    return { chunkNumber: n, chunkId: ch.chunkId, firstCLogLine: first.n, requestedAt: first.r.requestedAt || first.r.at };
  });
  const gateCommits = ['b0c0bfac752248c4223f633f2ed55bd67f6f6cdc', '2a5cb26ab37c91e1127310dbd348c2ca17533289',
    '55c4e8671dce081f88cb314d4de4b8c8ad150215'].map((id) => ({ commit: id, committedAt:
    git(['show', '-s', '--format=%cI', id]).toString('utf8').trim() }));
  // the clocks of the three a3 payloads and of the final merge, each from its own record
  const clockOf = (dir) => {
    const r = readJson(path.join(dir, 'result.json'));
    const m = /seconds=([0-9.]+)$/.exec(r.tee.marker);
    return { teeMarker: r.tee.marker, teeSeconds: Number(m[1]), controllerSeconds:
      Number(((r.finishedAtMs - r.startedAtMs) / 1000).toFixed(3)) };
  };
  const gpResults = jsonl(path.join(EV, 'phase-d', 'operator', 'gp-results.jsonl'));
  const a3Rows = gpResults.filter((r) => r.seq === 'a3');
  bad(gpResults.length === 121 && gpResults.every((r) => r.code === 0) && a3Rows.length === 3,
    'gp-results.jsonl is not 121 rows of runner code 0 with three a3 rows');
  const a3Clocks = S_CHUNKS.map((chunkId, i) => {
    const c = clockOf(path.join(REPO, slots.get(chunkId + '.a3').dir));
    const row = a3Rows.filter((r) => r.chunk === chunkId)[0];
    const seconds = JSON.parse(row.line.replace(/^GP-CHUNK-RESULT /, '')).seconds;
    bad(c.teeSeconds === DISPATCH_CLOCKS.teeSeconds[i] && c.controllerSeconds === DISPATCH_CLOCKS.controllerSeconds[i] &&
      seconds === DISPATCH_CLOCKS.runnerSeconds[i], chunkId + ' a3: a clock differs from the dispatch');
    return { chunkId, runId: chunkId + '.a3', teeSeconds: c.teeSeconds, teeMarker: c.teeMarker,
      controllerSpanSeconds: c.controllerSeconds, gpResultsRunnerSeconds: seconds };
  });
  const merge = clockOf(FINAL);
  bad(merge.teeSeconds === DISPATCH_CLOCKS.mergeTee && merge.controllerSeconds === DISPATCH_CLOCKS.mergeController,
    'the final merge clocks differ from the dispatch');
  const l24 = clog[23];
  bad(l24.type === 'pre-window-hold' && l24.heldAt === 'foreign-lock-watch' && l24.watch.giveUpSeconds === 4.2332728,
    'L24 is not the pre-window event with its 4.233 s last watch');
  const incident = readText(path.join(TASKS, 'MS18d-epoch2-transport-repair.md'));
  bad(/Frozen incident and preserved state/.test(incident) && /after about 1,203 s/.test(incident),
    'the epoch-2 repair leaf does not state the about 1,203 s');
  const gates = operator.a3Gates;
  bad(gates.map((g) => g.waitS).join() === '325,124,247' && gates.reduce((a, g) => a + g.waitS, 0) === 696,
    'the a3 gate waits are not 325 / 124 / 247 s (696)');
  operator.manualLaunches.forEach((m) => {
    bad(clog[m.cLogLine - 1].runId === m.run, 'manual launch L' + m.cLogLine + ' is not ' + m.run);
  });
  const first = clog[0];
  const lastRun = clog[124];
  const doc = { schema: 'ms18d-phase-d-external-consumers-v1', label: 'operational disclosure; the C log, run folders ' +
    'and committed rulings are the authority', item: 'MS18d-C2-EXTERNAL-CONSUMERS', holds, categories,
  consumerRule: 'a gate pass never guaranteed that no later consumer would appear; no service was disabled, no ' +
    'ancestry-wide CPU exemption and no normalization was applied; the five misses are not attributed to a consumer',
  schedulingVersions: { provenance: operator.gateVersions.provenance, ranges: operator.gateVersions.ranges,
    notes: operator.gateVersions.notes, boundaries, gateRulingCommits: gateCommits,
    wideGateFromChunk: 98, source: 'docs/difficulty-v3/evidence/MS18d/phase-d/operator/operator-records.json' },
  manualLaunches: operator.manualLaunches, a3Gates: { rows: operator.a3Gates, sumSeconds: 696, scope: 'the three ' +
    'a3 gates only; not a campaign total and no zero-expiry inference', limits: 'the mega16 row was copied by hand from ' +
    'shell output; a3-pre-mega16.txt holds earlier pre-launch checks only' }, clocks: { a3Payloads: a3Clocks,
    finalMerge: { teeSeconds: merge.teeSeconds, teeMarker: merge.teeMarker, controllerSpanSeconds: merge.controllerSeconds,
      enclosingInvocation: 'about 28 s (rounded announcement; not an exact wrapper duration)' },
    distinct: ['scheduled 300 s cooldown', 'outer gate wait', 'lock/pre-window watch', 'controller/readiness',
      'recorder process (tee marker)', 'raw request times (never combined with any wait)', 'whole campaign wall span'] },
  l24: { cLogLine: 24, heldAt: l24.heldAt, lastWatchGiveUpSeconds: l24.watch.giveUpSeconds, enclosingInvocation:
    'about 1,203 s per MS18d-epoch2-transport-repair.md, "Frozen incident and preserved state"; not read from L24, ' +
    'not an outer-gate expiry and not proof of a foreign lock or CPU episode', admissions: 0 },
  campaignWallSpan: { from: first.requestedAt, to: lastRun.finished, note: 'wall clock of the whole campaign, ' +
    'waits, pauses, repairs and owner questions included; not a measurement time' },
  gpResults: { rows: gpResults.length, runnerCode: 'the runner exit (0 on all 121 rows, holds included), not the ' +
    'recorder outcome', seconds: 'the enclosing runner clock, not the recorder-process duration' },
  unknown: operator.unknownNotRecorded, problems };
  if (problems.length === 0) writeNew(need(opts, 'out'), jsonText(doc));
  return { problems, summary: holds.length + ' holds, ' + categories.length + ' categories' };
}

// ---------------------------------------------------------------------------------------------------------------
// register and report

const REQUIRED_ITEMS = ['S-AV01', 'S-OD7 / S-AV05 / S-AV06', 'S-AV27', 'IR17', 'MS18c-GQ-ENGINE-COST',
  'MS18d-GP-BOUND-sohei-hell2', 'MS18d-GP-BOUND-REMAINDER', 'MS18d-C0-G1-G5', 'MS18d-C0b-R24',
  'MS18d-C1-F1-F6', 'MS18d-C2-TRANSPORT-WATCH / MS18d-C2-RELEASE-HISTORY', 'MS18d-DEEP-PUBLIC-REGISTRATIONS',
  'S-AV11', 'S-AV31', 'S-AV33', 'S-AV34', 'S-AV36', 'S-AV37', 'S-AV38', 'S-AV39', 'MS15b-GP-J', 'MS15b-GP-U',
  'MS18d-C2-EXTERNAL-CONSUMERS', 'S-OD16/17/18 and F3 dispositions', 'MS18d-GP-MISS-mega12-expert',
  'MS18d-GP-MISS-sohei-hell2', 'MS18d-GP-MISS-butterfly-hell2', 'MS18d-GP-MISS-wordoku-expert',
  'MS18d-GP-MISS-wordoku-nightmare', 'S-AV08'];
const STATUSES = ['closed', 'open', 'retained', 'held', 'history', 'disclosed', 'not-offered', 'finding', 'hidden'];
const PLACEHOLDER = /TODO|TBD|FIXME|<<FILL|XXX/;

/** The register against the mandatory list: every item once, every field filled, no placeholder. */
function registerProblems(register) {
  const problems = [];
  if (register.schema !== 'ms18d-phase-d-item-register-v1') problems.push('the register schema is wrong');
  const items = register.items || [];
  const seen = new Map();
  items.forEach((it) => {
    seen.set(it.id, (seen.get(it.id) || 0) + 1);
    ['source', 'population', 'numbers', 'limitations', 'disposition', 'nextOwner'].forEach((f) => {
      const v = it[f];
      if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ||
        (typeof v === 'object' && Object.keys(v).length === 0)) problems.push(it.id + ': ' + f + ' is empty');
    });
    if (STATUSES.indexOf(it.status) === -1) problems.push(it.id + ': status ' + it.status + ' is not allowed');
    if (!Array.isArray(it.evidence) || it.evidence.length === 0) problems.push(it.id + ': no evidence reference');
    if (PLACEHOLDER.test(JSON.stringify(it))) problems.push(it.id + ': a placeholder');
  });
  REQUIRED_ITEMS.forEach((id) => {
    if (!seen.has(id)) problems.push('item ' + id + ' is missing');
    else if (seen.get(id) > 1) problems.push('item ' + id + ' is listed twice');
  });
  seen.forEach((n, id) => { if (REQUIRED_ITEMS.indexOf(id) === -1) problems.push('unexpected item ' + id); });
  return problems;
}

function registerMode(opts) {
  const problems = registerProblems(readJson(need(opts, 'register')));
  return { problems, summary: REQUIRED_ITEMS.length + ' mandatory items' };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l !== '');
  return lines.slice(1).map((line) => {
    const c = line.split(',');
    return { cell: c[0], n: Number(c[3]), p50: Number(c[4]), p95: Number(c[5]), max: Number(c[6]),
      target: Number(c[8]), verdict: c[9], k: Number(c[10]), extra: Number(c[11]), cold: c[12] === 'true' };
  });
}

/** The 79 rows of the performance report's table against the CSV (exact text of the generated rows). */
function reportProblems(markdown, rows, final) {
  const problems = [];
  const lines = markdown.split(/\r?\n/);
  const head = lines.findIndex((l) => l.indexOf('| Cell | n | p50 ms | p95 ms | max ms | Target ms |') === 0);
  if (head < 0) return ['the 79-row table header is not in the report'];
  const table = [];
  for (let i = head + 2; i < lines.length && lines[i].startsWith('| '); i++) table.push(lines[i]);
  if (table.length !== rows.length) problems.push('the table has ' + table.length + ' rows, not ' + rows.length);
  rows.forEach((r, i) => { if (table[i] !== mdRow(r)) problems.push('row ' + (i + 1) + ' (' + r.cell + ') differs'); });
  if (final && PLACEHOLDER.test(markdown)) problems.push('the report still holds a placeholder');
  return problems;
}

function reportMode(opts) {
  const rows = parseCsv(readText(need(opts, 'cells')));
  const problems = reportProblems(readText(need(opts, 'report')), rows, opts.final === '1');
  return { problems, summary: rows.length + ' rows compared' };
}

// ---------------------------------------------------------------------------------------------------------------
// bindings, coverage, cost and hashes: the final identities, the quick results and the CI arithmetic

const IDENTITY_LINES = [['generatorQuick', /^generator quick fingerprint ([0-9a-f]{64})$/],
  ['playerQuick', /^player quick fingerprint ([0-9a-f]{64})$/],
  ['generatorWithManual', /^generator with the manual trees ([0-9a-f]{64})$/],
  ['replayIdentity', /^replay identity \(wire and analysis ledgers\) ([0-9a-f]{64})$/],
  ['hashIdentity', /^hash identity \(hash ledgers\) ([0-9a-f]{64})$/]];
const BASELINE = { generatorQuick: '49089814be577a8cf821c85a22c843bbd9060014555790a933abcaecd95bb1f8',
  playerQuick: 'aa352658286737074b8b5b9dc21b6d67fc6f082b32ce38a609e77f220b51d8c4',
  generatorWithManual: '176f9c95f17492b5947df8ba393aff0a6956ea8a64ee6add3bac52f2407e9567',
  replayIdentity: EXPECT.replayIdentity, hashIdentity: EXPECT.hashIdentity };

/** The five identities of an `identities-now.cjs` output text (a file of five lines), or a problem. */
function parseIdentities(text) {
  const lines = text.split(/\r?\n/).filter((l) => l !== '');
  const out = {};
  const problems = [];
  IDENTITY_LINES.forEach(([key, re], i) => {
    const m = lines[i] ? re.exec(lines[i]) : null;
    if (m) out[key] = m[1];
    else problems.push('identity line ' + (i + 1) + ' is not the ' + key + ' line');
  });
  if (lines.length !== 5) problems.push('the identity output has ' + lines.length + ' lines, not 5');
  return { identities: out, problems };
}

/** The validation of one unchanged freeze-targets.js JSON (a Phase D re-check). */
function recheckProblems(doc, label) {
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(label + ': ' + text); };
  const c = doc.counts || {};
  bad(c.positions === 135 && c.active === 79 && c.absent === 56 && c.retained === 62 && c.updated === 17,
    'counts are not 135 / 79 / 56 / 62 / 17');
  bad(doc.tableSha256 === EXPECT.tableSha256, 'table sha256');
  const id = doc.identities || {};
  bad(id.sources === EXPECT.sources && id.hashIdentity === EXPECT.hashIdentity &&
    id.replayIdentity === EXPECT.replayIdentity && id.replayIdentityBefore === EXPECT.replayIdentity,
    'sources, hash identity or replay identity');
  bad(doc.designTable && doc.designTable.equalToFrozen === true && doc.designTable.bold === 17,
    'the design table is not the frozen one with 17 bold cells');
  const stated = (doc.retainedBudgets && doc.retainedBudgets.statedIn) || [];
  bad(stated.length === 11 && stated.every((s) => s.design === true && s.en === true && s.vi === true),
    'the eleven retained-versus-GP pairs are not stated in design, en and vi');
  bad(Array.isArray(doc.problems) && doc.problems.length === 0, 'the tool lists problems');
  return problems;
}

function bindingsMode(opts) {
  const problems = [];
  const read = (name) => readText(need(opts, name));
  const before = parseIdentities(read('ids-before'));
  const final = parseIdentities(read('ids-final'));
  const after = parseIdentities(read('ids-after'));
  [before, final, after].forEach((x) => x.problems.forEach((p) => problems.push(p)));
  Object.keys(BASELINE).forEach((k) => {
    if (before.identities[k] !== BASELINE[k]) problems.push('the before ' + k + ' is not the dispatch baseline');
  });
  ['replayIdentity', 'hashIdentity'].forEach((k) => {
    if (final.identities[k] !== before.identities[k]) problems.push(k + ' changed between before and final');
  });
  ['generatorQuick', 'playerQuick', 'generatorWithManual'].forEach((k) => {
    if (final.identities[k] === before.identities[k]) problems.push(k + ' did not change with the design/guide inputs');
  });
  Object.keys(final.identities).forEach((k) => {
    if (after.identities[k] !== final.identities[k]) problems.push(k + ' differs after the quick runs and the CI edits');
  });
  const rb = readJson(need(opts, 'recheck-before'));
  const rf = readJson(need(opts, 'recheck-final'));
  recheckProblems(rb, 'before re-check').concat(recheckProblems(rf, 'final re-check')).forEach((p) => problems.push(p));
  if (JSON.stringify(rb) !== JSON.stringify(rf)) problems.push('the two re-check outputs differ');
  const doc = { schema: 'ms18d-phase-d-bindings-v1', identities: { before: before.identities, final: final.identities,
    afterQuick: after.identities }, sevenValues: { generatorQuick: final.identities.generatorQuick,
    playerQuick: final.identities.playerQuick, generatorWithManual: final.identities.generatorWithManual,
    replayIdentity: final.identities.replayIdentity, hashIdentity: final.identities.hashIdentity,
    producerSources: rf.identities.sources, targetTable: rf.tableSha256 },
  inputDelta: 'the quick and with-manual fingerprints cover generator/design.md, DEVELOPERGUIDE.md and ' +
    'DEVELOPERGUIDE.vn.md, which the R6 edits changed; no code, test, fixture, target or offer input changed',
  targetRechecks: { labelledAs: 'Phase D re-checks (the unchanged tool\'s fixed kind/note still says Phase B and "before GG")',
    toolKind: rf.kind, toolNote: rf.note, before: { sha256: sha256(Buffer.from(JSON.stringify(rb))), problems: rb.problems },
    final: { problems: rf.problems }, counts: rf.counts, designTable: rf.designTable,
    retainedBudgets: { differ: rf.retainedBudgets.differ, statedIn: rf.retainedBudgets.statedIn.length,
      allDesignEnVi: true }, hashIdentityBefore: rf.identities.hashIdentityBefore }, problems };
  if (problems.length === 0) writeNew(need(opts, 'out'), jsonText(doc));
  return { problems, summary: '5 identities x 3 captures, 2 re-checks' };
}

/** Quick result rows against an inventory by (suite, ordinal): { problems, tally }. */
function reconcileShard(label, inventory, result, expect) {
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(label + ': ' + text); };
  bad(result.schema === 1 && result.app === inventory.app, 'not a schema 1 result of ' + inventory.app);
  bad(result.complete === true && result.sourceStable === true, 'the run is not complete and source-stable');
  bad(result.results && result.results.bailed === false, 'the run bailed or has no results');
  bad(Array.isArray(result.registrationErrors) && result.registrationErrors.length === 0, 'registration errors');
  bad(result.sourceHash === expect.sourceHash && inventory.sourceHash === expect.sourceHash,
    'sourceHash is not the final fingerprint (stale or mixed source)');
  bad(result.node === inventory.node && result.timeFactor === inventory.timeFactor && result.timeFactor === 2,
    'Node or time factor differs from the inventory (default factor 2)');
  bad(JSON.stringify(result.argv) === JSON.stringify(expect.argv), 'argv is not the shard command');
  bad(result.selection && result.selection.count === inventory.tests.length, 'the selection count is not the inventory');
  const rows = result.results ? result.results.tests : [];
  const inv = new Map(inventory.tests.map((t) => [t.suite + '/' + t.ordinal, t]));
  const seen = new Set();
  const tally = { expected: inventory.tests.length, rows: rows.length, passed: 0, failed: 0, skipped: 0 };
  rows.forEach((r) => {
    const key = r.suite + '/' + r.ordinal;
    const t = inv.get(key);
    if (!t) problems.push(label + ': unexpected row ' + key);
    else if (t.fullName !== r.fullName) problems.push(label + ': ' + key + ' has another full name');
    if (seen.has(key)) problems.push(label + ': duplicate row ' + key);
    seen.add(key);
    if (r.status === 'pass') tally.passed++;
    else if (r.status === 'skip') {
      tally.skipped++;
      if (!t || t.skipped !== true) problems.push(label + ': ' + key + ' is an unexplained skip');
    } else {
      tally.failed++;
      problems.push(label + ': ' + key + ' ' + r.status);
    }
  });
  inv.forEach((t, key) => { if (!seen.has(key)) problems.push(label + ': missing row ' + key); });
  bad(result.results && result.results.total === rows.length, 'results.total differs from the number of rows');
  return { problems, tally };
}

function coverageMode(opts) {
  const problems = [];
  const ci = need(opts, 'ci');
  const quick = need(opts, 'quick');
  const ids = parseIdentities(readText(need(opts, 'ids')));
  ids.problems.forEach((p) => problems.push(p));
  const manifest = readJson(need(opts, 'manifest'));
  const shards = [].concat(...manifest.groups.map((g) => g.shards));
  const apps = {};
  // Generator: the eight shards against their own inventories, and their union against the whole inventory
  const gAll = readJson(path.join(ci, 'generator-all.json'));
  const covered = new Map();
  const shardRows = shards.map((s) => {
    const inv = readJson(path.join(ci, 'shard-' + s.id + '.json'));
    const file = path.join(quick, 'generator-' + s.id + '.json');
    const result = readJson(file);
    const r = reconcileShard('generator/' + s.id, inv, result, { sourceHash: ids.identities.generatorQuick,
      argv: ['--suite=' + s.suites.join(','), '--results=..\\' + rel(file).replace(/\//g, '\\')] });
    r.problems.forEach((p) => problems.push(p));
    if (inv.tests.length !== s.tests) problems.push('generator/' + s.id + ': the manifest counts ' + s.tests +
      ' tests, the inventory ' + inv.tests.length);
    result.results.tests.forEach((t) => {
      const key = t.suite + '/' + t.ordinal;
      covered.set(key, (covered.get(key) || 0) + 1);
    });
    return Object.assign({ shard: s.id, suites: s.suites.length, resultFile: rel(file),
      resultSha256: fileSha(file), sourceHash: result.sourceHash, wallMs: result.wallMs }, r.tally);
  });
  const gKeys = new Set(gAll.tests.map((t) => t.suite + '/' + t.ordinal));
  gKeys.forEach((k) => { if (covered.get(k) !== 1) problems.push('generator: ' + k + ' covered ' + (covered.get(k) || 0) + ' time(s)'); });
  covered.forEach((n, k) => { if (!gKeys.has(k)) problems.push('generator: unexpected key ' + k); });
  apps.generator = { expected: gAll.tests.length, sourceHash: gAll.sourceHash, shards: shardRows,
    covered: covered.size, passed: shardRows.reduce((a, s) => a + s.passed, 0),
    failed: shardRows.reduce((a, s) => a + s.failed, 0), skipped: shardRows.reduce((a, s) => a + s.skipped, 0) };
  // Player: the whole quick set in one command
  const pAll = readJson(path.join(ci, 'player-all.json'));
  const pFile = path.join(quick, 'player-quick.json');
  const pr = reconcileShard('player/whole-quick', pAll, readJson(pFile), { sourceHash: ids.identities.playerQuick,
    argv: ['--results=..\\' + rel(pFile).replace(/\//g, '\\')] });
  pr.problems.forEach((p) => problems.push(p));
  apps.player = { expected: pAll.tests.length, sourceHash: pAll.sourceHash, resultFile: rel(pFile),
    resultSha256: fileSha(pFile), wallMs: readJson(pFile).wallMs, covered: pr.tally.rows, passed: pr.tally.passed,
    failed: pr.tally.failed, skipped: pr.tally.skipped };
  if (apps.generator.expected !== 4807 || apps.player.expected !== 2981) problems.push('the quick counts are not 4807 / 2981');
  const doc = { schema: 'ms18d-phase-d-quick-coverage-v1', method: 'per app, by (suite, ordinal) with the full name; ' +
    'shared suites run in both apps and are not deduplicated across them; focused-docs.json and any superseded ' +
    'result are excluded', fingerprints: ids.identities, apps, excluded: ['results/focused-docs.json'], problems };
  if (problems.length === 0) writeNew(need(opts, 'out'), jsonText(doc));
  return { problems, summary: 'generator ' + apps.generator.covered + ' / ' + apps.generator.expected + ', player ' +
    apps.player.covered + ' / ' + apps.player.expected };
}

/** 10 * ceil(1.5 m / 10) in exact integer arithmetic on milliseconds (m has at most three decimals). */
function roundedProjection(m) {
  const ms = Math.round(m * 1000);
  return 10 * Math.floor((3 * ms + 19999) / 20000);
}
const newProjection = (old, m) => Math.max(old, roundedProjection(m));

/** The job arithmetic of the manifest with the given projections: [{ job, sum, projected, limit }]. */
function jobArithmetic(manifest, projections) {
  const job = manifest.job;
  const rows = manifest.groups.map((g) => {
    const sum = g.shards.reduce((a, s) => a + projections[s.id], 0);
    return { job: g.id, shards: g.shards.map((s) => s.id), sum, projected: job.jobOverheadSeconds +
      job.ciSlowdownFactor * sum, limit: job.timeoutMinutes * 60 };
  });
  rows.push({ job: 'Player job', shards: ['player-app'], sum: projections['player-app'],
    projected: job.jobOverheadSeconds + job.ciSlowdownFactor * projections['player-app'], limit: 900,
    genericManifestLimit: job.timeoutMinutes * 60, note: 'the actual workflow limit is 900 s (15 minutes)' });
  return rows;
}

function costMode(opts) {
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(text); return ok; };
  const oldManifest = JSON.parse(git(['show', 'HEAD:.github/scripts/generator-quick.json']).toString('utf8'));
  const shards = [].concat(...oldManifest.groups.map((g) => g.shards));
  const log = jsonl(path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'phase-d', 'lock-log.jsonl'));
  const quick = need(opts, 'quick');
  const rowOf = (id) => {
    const rows = log.filter((r) => r.id === id && r.outcome === 'ok');
    bad(rows.length === 1, id + ': not exactly one successful locked run');
    return rows[0];
  };
  const clocks = (id, resultFile) => {
    const r = rowOf(id);
    const res = readJson(resultFile);
    bad(r.tee && r.tee.complete === true && r.tee.exit === 0 && r.helperExit === 0, id + ': incomplete or failed run');
    return { id, teeSeconds: r.teeSeconds, helperSeconds: r.helperSeconds, callerSeconds: r.callerSeconds,
      lockWaitDerivedSeconds: r.lockWaitDerivedSeconds, gapSleptSeconds: r.gapSleptSeconds,
      runnerBodySeconds: Number((res.wallMs / 1000).toFixed(3)), harnessMs: res.results.ms, startedAt: r.startedAt,
      endedAt: r.endedAt, transcript: r.transcript };
  };
  const rows = shards.map((s) => {
    const c = clocks('quick-generator-' + s.id, path.join(quick, 'generator-' + s.id + '.json'));
    const m = c.teeSeconds;
    return Object.assign({ kind: 'generator-shard', shard: s.id, tests: s.tests, oldProjection: s.projectionSeconds,
      m, onePointFiveM: Number((1.5 * m).toFixed(4)), roundedToTen: roundedProjection(m),
      newProjection: newProjection(s.projectionSeconds, m), measuredSecondsNew: Number(m.toFixed(1)) }, c);
  });
  const pc = clocks('quick-player', path.join(quick, 'player-quick.json'));
  const player = Object.assign({ kind: 'player-app', shard: 'player-app', tests: oldManifest.player.tests,
    oldProjection: oldManifest.player.projectionSeconds, m: pc.teeSeconds, onePointFiveM: Number((1.5 * pc.teeSeconds).toFixed(4)),
    roundedToTen: roundedProjection(pc.teeSeconds), newProjection: newProjection(oldManifest.player.projectionSeconds,
      pc.teeSeconds), measuredSecondsNew: Number(pc.teeSeconds.toFixed(1)) }, pc);
  const proj = {};
  rows.forEach((r) => { proj[r.shard] = r.newProjection; });
  proj['player-app'] = player.newProjection;
  const jobs = jobArithmetic(oldManifest, proj);
  rows.concat([player]).forEach((r) => {
    bad(r.newProjection <= 450, r.shard + ': the projection exceeds 450 s');
    bad(r.newProjection >= r.oldProjection, r.shard + ': a projection would fall');
  });
  jobs.forEach((j) => bad(j.projected <= j.limit, j.job + ': ' + j.projected + ' s exceeds ' + j.limit + ' s'));
  if (opts['manifest-new']) {
    const mn = readJson(need(opts, 'manifest-new'));
    const got = {};
    [].concat(...mn.groups.map((g) => g.shards)).forEach((s) => {
      got[s.id] = { p: s.projectionSeconds, m: s.measuredSeconds, t: s.tests };
    });
    rows.forEach((r) => bad(got[r.shard] && got[r.shard].p === r.newProjection && got[r.shard].m === r.measuredSecondsNew &&
      got[r.shard].t === r.tests, r.shard + ': the edited manifest differs from the computed values'));
    bad(mn.player.projectionSeconds === player.newProjection && mn.player.measuredSeconds === player.measuredSecondsNew &&
      mn.player.tests === player.tests, 'player: the edited manifest differs from the computed values');
    bad(mn.job.ciSlowdownFactor === 3 && mn.job.jobOverheadSeconds === 180 && mn.job.timeoutMinutes === 30,
      'the job factor, overhead or timeout changed');
  }
  const doc = { schema: 'ms18d-phase-d-quick-cost-v1', rule: 'newProjection = max(old, 10 * ceil(1.5 * m / 10)), m = the tee ' +
    'final seconds of the successful complete run; raises only', clocks: 'teeSeconds (m), helperSeconds, runnerBodySeconds ' +
    '(the harness wall of the results file), callerSeconds and lockWaitDerivedSeconds are distinct clocks; no ' +
    'projection is derived from the helper or the runner body', shards: rows, player, jobs, problems };
  if (opts.out) writeNew(need(opts, 'out'), jsonText(doc));
  return { problems, summary: rows.map((r) => r.shard + ' ' + r.m + '->' + r.newProjection).concat(['player ' +
    player.m + '->' + player.newProjection]).join(', ') };
}

const hashLine = (abs) => fileSha(abs).toUpperCase() + '  ' + rel(abs).replace(/\//g, '\\');

function hashesMode(opts) {
  const here = __dirname;
  const helpers = ['closeout.js', 'test-closeout.js', 'run-locked-d.ps1'].map((f) => path.join(here, f));
  const phaseD = path.join(EV, 'phase-d');
  const skip = (abs) => /[\\/]phase-d[\\/](operator|sa1-recompute)[\\/]/.test(abs) ||
    /[\\/]phase-d[\\/]lock-log\.jsonl$/.test(abs) || /[\\/]closeout-(hashes|verify)[A-Za-z0-9._-]*\.txt$/.test(abs) ||
    /[\\/]outputs-sha256\.txt$/.test(abs);
  const walk = (dir) => [].concat(...fs.readdirSync(dir, { withFileTypes: true }).map((d) => (d.isDirectory() ?
    walk(path.join(dir, d.name)) : [path.join(dir, d.name)])));
  const outputs = walk(phaseD).filter((f) => !skip(f)).sort();
  writeNew(need(opts, 'helpers'), helpers.map(hashLine).join('\n'));
  writeNew(need(opts, 'outputs'), outputs.map(hashLine).join('\n'));
  return { problems: [], summary: helpers.length + ' helpers, ' + outputs.length + ' outputs' };
}

const MODES = { cells: cellsMode, audit: auditMode, consumers: consumersMode, extract: extractMode,
  register: registerMode, report: reportMode, bindings: bindingsMode, coverage: coverageMode, cost: costMode,
  hashes: hashesMode };

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
    if (!MODES[args.mode]) throw new Error('mode: ' + Object.keys(MODES).join(' | '));
  } catch (err) {
    console.log('ms18d-closeout usage error: ' + err.message);
    return 3;
  }
  try {
    const r = MODES[args.mode](args.opts);
    r.problems.forEach((p) => console.log('PROBLEM ' + p));
    console.log('ms18d-closeout ' + args.mode + ': ' + (r.problems.length === 0 ? 'ok' : r.problems.length + ' problem(s)') +
      ' (' + r.summary + ')');
    return r.problems.length === 0 ? 0 : 2;
  } catch (err) {
    console.log('ms18d-closeout ' + args.mode + ' error: ' + err.message);
    return 3;
  }
}

module.exports = { fmt, planCells, cellRows, csvOf, mdRowsOf, mdRow, bodyOf, writeNew, parseArgs, sha256, fileSha,
  readJson, readText, rel, isAncestor, git, jsonText, need, REPO, EV, PHASE_C, TASKS, FINAL, EXPECT, MISSES,
  SHA_REPORT, SHA_RECOMPUTE, crlf, jsonl, journalCheck, registerProblems, reportProblems, parseCsv, REQUIRED_ITEMS,
  parseIdentities, recheckProblems, reconcileShard, roundedProjection, newProjection, jobArithmetic, main, MODES };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
