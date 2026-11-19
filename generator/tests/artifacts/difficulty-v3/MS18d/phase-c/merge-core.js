'use strict';

/*
 * MS18d Phase C0b task-owned (R24): the CHECK-ONLY MERGE of the final GP matrix, the part that is pure or
 * reads only run folders. It never generates, never edits a ledger, never fills a gap and never writes a
 * canonical fixture or target (merge-gp.js writes the one report of its own run). Rules, from the R24 plan:
 *   - a chunk counts only through a run folder the frozen manifest DECLARES (R2: the two literal attempt
 *     slots of the chunk), and only when the whole run is complete: the recorder's ledger (exact planned
 *     chunk, n raw finite non-negative times in request order, indices and seeds, identity, no stand-in
 *     provenance) AND the exit-0 transport receipts (request, wrapper, controller result with a complete
 *     classification, pid records with the command exit 0 and zero stderr bytes, the orphan-barrier proof,
 *     admission, acquisition and binding, the completion marker whose size and digest are those of the
 *     ledger, an empty stderr). A killed recorder's apparently complete file is not rescued;
 *   - every planned chunk exactly once; no duplicate, extra, unknown or replacement run: a chunk with a
 *     complete ledger AND an earlier run that started its payload and failed is rejected (no replacement);
 *   - one common identity across the matrix: the manifest, the helpers, the executed sources, E, the table,
 *     Node, the machine, the policy, the campaign base and R5's empty flags. HEADs may differ only under R3
 *     (descendant of the base, only campaign outputs and pack files changed);
 *   - the statistics come from the 50 raw times of a cell, sorted numerically: p50 = sorted[24], p95 =
 *     sorted[47], max = sorted[49], mean = sum in request order / 50, meets = p95 < target (strict,
 *     unrounded). No percentile of a chunk is ever combined. The final gate is 79 complete cells and at
 *     least `requiredSuccesses` (72) cells that meet, by integer comparison;
 *   - the cold-start disclosure: every chunk whose first request is not below sorted[47] (ties included).
 */
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const { sha256 } = require('./common.js');
const { MARKER, START, validateLedgerShape, IDENTITY_METHOD } = require('./ledger-schema.js');
const rcore = require('./readiness-core.js');
const journals = require('./journals.js');
const { campaignDiffViolations, LEDGER } = require('./source-binding.js');

const RECORDER_REL = 'tests\\artifacts\\difficulty-v3\\MS18d\\phase-c\\record-gp.js';

/** The command line the transport runs for one chunk of a real run (generator-relative output path). */
function frozenRecorderArgs(planRel, slot) {
  const out = ('..\\' + slot.dir + '\\ledger.json').replace(/\//g, '\\');
  return [RECORDER_REL, '--plan=' + planRel, '--chunk=' + slot.chunkId, '--out=' + out];
}

// a value that is not plain JSON data (a missing member, say) is a difference, never an exception
const same = (a, b) => {
  try {
    return plan.canonicalJson(a) === plan.canonicalJson(b);
  } catch (err) {
    return false;
  }
};

const OWNED_ROLES = ['wrapper', 'controller', 'readiness-probe'];

/**
 * The host binding an admission used (pack section "Host-binding journal"): the id, tuple and journal
 * reference it recorded must be an entry of the COMMITTED journal at merge time, the very one in force at
 * that admission (the last of the `entryCount` entries it saw), and the journal it saw must be a line prefix
 * of the committed one (append-only). The binding approved FOR THAT ADMISSION is judged, not the latest
 * host: a later rebinding retags and rejects no earlier record. `chain` = { entries, lines, problems }.
 */
function bindingProblems(input, chain) {
  const p = [];
  const ref = input.binding;
  if (!chain || chain.problems.length > 0 || chain.entries.length === 0) {
    return ['the committed host-binding journal is empty or invalid'];
  }
  if (!ref || typeof ref.bindingId !== 'string' || !ref.journal ||
    !Number.isInteger(ref.journal.entryCount) || !ref.evidence || ref.evidence.verified !== true) {
    return ['the record names no verified host binding of the journal'];
  }
  const index = chain.entries.findIndex((e) => e.bindingId === ref.bindingId);
  if (index < 0) {
    return ['the host binding ' + ref.bindingId + ' is not in the committed journal (unapproved)'];
  }
  if (!same(journals.bindingTuple(chain.entries[index]), input.expected)) {
    p.push('the host tuple is not the one approved by entry ' + ref.bindingId);
  }
  const n = ref.journal.entryCount;
  if (index !== n - 1) p.push('the host binding was not the one in force at admission');
  if (n > chain.lines.length || journals.digestLines(chain.lines.slice(0, n)) !== ref.journal.sha256) {
    p.push('the journal the admission saw is not a prefix of the committed journal');
  }
  if (!same(ref.host, chain.entries[index].host)) p.push('the recorded host differs from the journal entry');
  return p;
}

/**
 * F6 and C1: the admission of a real recorder run must carry a COMPLETE, ADMITTED policy A readiness record,
 * and the retained raw data must give the same decision again: readiness.json (cited by size-exact SHA-256),
 * the two snapshots it cites, the host binding in force (one of the recorded bindings), the run's own
 * wrapper, controller and probe processes, the time since the call. Problems, [] when it holds.
 */
function readinessProblems(run, admission, request, pidRows, ctx) {
  const p = [];
  const bad = (text) => p.push('readiness: ' + text);
  const sum = admission && admission.readiness;
  if (!sum || sum.schema !== rcore.SCHEMA || sum.required !== true || sum.ran !== true) {
    bad('admission.json carries no readiness record of a run');
    return p;
  }
  if (sum.complete !== true || sum.admitted !== true || sum.eligibleReAsk === true) {
    bad('the record is not a complete admitted one');
  }
  const bytes = run.bytes('readiness.json');
  if (bytes === null || sum.sha256 !== sha256(bytes)) {
    bad('readiness.json is missing or not the cited bytes');
    return p;
  }
  const rec = run.json('readiness.json').value;
  if (!rec || rec.schema !== 'ms18d-c-readiness-record-1' || !rec.inputs || !rec.decision) {
    bad('readiness.json is not a readiness record');
    return p;
  }
  const snapshot = (name) => {
    const ref = rec.snapshots && rec.snapshots[name];
    const b = ref && typeof ref.file === 'string' ? run.bytes(ref.file) : null;
    if (b === null || sha256(b) !== ref.sha256) {
      bad('the ' + name + ' snapshot is missing or not the cited bytes');
      return null;
    }
    return run.json(ref.file).value;
  };
  const before = snapshot('before');
  const after = snapshot('after');
  if (!before || !after) return p;
  const input = rec.inputs;
  if (!ctx.doc.policy || ctx.doc.policy.choice !== rcore.POLICY.choice) bad('the manifest policy is not A');
  bindingProblems(input, ctx.bindingJournal).forEach(bad);
  if (input.logicalCpus !== ctx.doc.environment.machine.logicalProcessors) {
    bad('another logical processor count');
  }
  const controller = (pidRows || []).filter((x) => x && x.role === 'controller')[0];
  (input.owned || []).forEach((o) => {
    if (OWNED_ROLES.indexOf(o.role) === -1) bad('an excluded process has the role ' + o.role);
    if (o.role === 'wrapper' && (!request || o.pid !== request.wrapperPid)) {
      bad('the wrapper is not the run\'s');
    }
    if (o.role === 'controller' && (!controller || o.pid !== controller.pid)) {
      bad('the controller is not the run\'s');
    }
    if (o.role === 'readiness-probe' && ![before, after].some((s) => s.selfPid === o.pid &&
      s.selfCreatedMs === o.createdMs)) bad('a probe process is not that of a snapshot');
  });
  const again = JSON.parse(JSON.stringify(rcore.decideReadiness({ policy: ctx.doc.policy,
    expected: input.expected, bindingSource: input.bindingSource, logicalCpus: input.logicalCpus,
    readings: input.readings, before, after, owned: input.owned, budget: input.budget })));
  if (!same(again, rec.decision)) bad('the recorded decision is not the one the retained data give');
  if (again.complete !== true || again.admitted !== true) bad('the retained data do not admit the run');
  if (!admission || !(admission.callToSpawnMs <= rcore.LIMITS.callToSpawnMs) ||
    admission.lateStart !== false) {
    bad('more than 60 s between the call and the payload');
  }
  return p;
}

/** One run folder read as bytes and parsed JSON: { dir, files, subdirs, text(name), json(name), bytes }. */
function readRunFolder(dirAbs) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const cache = new Map();
  const bytes = (name) => {
    if (!cache.has(name)) {
      cache.set(name, files.indexOf(name) === -1 ? null : fs.readFileSync(path.join(dirAbs, name)));
    }
    return cache.get(name);
  };
  const json = (name) => {
    const b = bytes(name);
    if (b === null) return { present: false, value: null, error: null };
    try {
      return { present: true, value: JSON.parse(b.toString('utf8').replace(/^\uFEFF/, '')), error: null };
    } catch (err) {
      return { present: true, value: null, error: err.message };
    }
  };
  const rows = (name) => {
    const b = bytes(name);
    if (b === null) return null;
    const out = [];
    b.toString('utf8').split(/\r?\n/).forEach((line) => {
      if (line.trim() === '') return;
      try {
        out.push(JSON.parse(line));
      } catch (err) {
        out.push({ unparsable: line });
      }
    });
    return out;
  };
  return { dir: dirAbs, files, subdirs, bytes, json, rows };
}

/**
 * The verdict of ONE declared run folder of a chunk: { status: 'absent' | 'hold' | 'complete' | 'failed',
 * problems, ledger, ledgerSha256, head }. `hold` is a control-hold that started no payload and wrote no
 * ledger; `failed` is anything else that is not a complete run (a payload that started, or an incomplete
 * or inconsistent folder). ctx: { doc, slot, chunk, expectedIdentity, base, checkHead(head), realRun }.
 */
function judgeRun(run, ctx) {
  const { doc, slot, chunk } = ctx;
  if (run === null) return { status: 'absent', problems: [] };
  const problems = [];
  const bad = (text) => problems.push(text);
  if (run.subdirs.length > 0) bad('the run folder is not flat: ' + run.subdirs.join(', '));

  const result = run.json('result.json');
  const wrapper = run.json('wrapper.json');
  const ledgerBytes = run.bytes('ledger.json');
  const r = result.value;
  // F5: a hold is a control-hold that started no payload and left no payload sign at all: no tee/command
  // record, no transcript, stdout, stderr or ledger. (A wrapper.json that says `foreign-lock-watch` and is
  // the only file of the folder is the shape of a watch give-up and counts as a hold too.)
  const payloadSigns = ['transcript.txt', 'stdout.txt', 'stderr.txt', 'ledger.json']
    .filter((n) => run.files.indexOf(n) !== -1);
  const pidRows = run.rows('pids.jsonl') || [];
  const payloadRows = pidRows.filter((x) => x && (x.role === 'tee' || x.role === 'command' ||
    x.event === 'command-exit' || x.event === 'tee-exit'));
  if (r && r.outcome === 'control-hold' && r.payloadStarted === false && payloadSigns.length === 0 &&
    payloadRows.length === 0 && problems.length === 0) {
    return { status: 'hold', problems: [] };
  }
  const wv = wrapper.value;
  if (!result.present && wv && wv.outcome === 'control-hold' && wv.heldAt === 'foreign-lock-watch' &&
    run.files.length === 1 && run.files[0] === 'wrapper.json' && problems.length === 0) {
    return { status: 'hold', problems: [] };
  }
  [['result.json', result], ['wrapper.json', wrapper]].forEach(([name, parsed]) => {
    if (!parsed.present) bad(name + ' is missing');
    else if (parsed.error) bad(name + ' is not JSON: ' + parsed.error);
  });
  const w = wrapper.value;
  if (w) {
    if (w.schema !== 'ms18d-c-run-1' || w.payload !== 'gp-recorder') bad('wrapper.json: not a recorder run');
    if (w.standin !== false) bad('wrapper.json: stand-in provenance');
    if (w.outcome !== 'success' || w.exit !== 0) {
      bad('wrapper.json: outcome ' + w.outcome + ' exit ' + w.exit);
    }
    if (!Array.isArray(w.problems) || w.problems.length !== 0) bad('wrapper.json: problems recorded');
    if (w.barrierVerdict !== 'clean' || w.releaseVerified !== true) bad('wrapper.json: cleanup not proved');
  }
  if (r) {
    const cls = r.classification || {};
    if (r.outcome !== 'success' || r.controllerExit !== 0 || r.payloadStarted !== true ||
      cls.complete !== true) bad('result.json: not a complete success');
    if (r.standin !== false) bad('result.json: stand-in provenance');
    if (!r.cli || r.cli.exit !== 0 || r.cli.signal) bad('result.json: the command did not exit 0');
    if (!r.tee || !/^exit=0 seconds=[0-9.]+$/.test(String(r.tee.marker))) bad('result.json: tee marker');
    if (!r.rawBytes || r.rawBytes.stderr !== 0) bad('result.json: stderr bytes are not 0');
    if (!r.barrier || r.barrier.verdict !== 'clean') bad('result.json: barrier not clean');
  }
  const pids = run.rows('pids.jsonl');
  const exits = (pids || []).filter((x) => x && x.event === 'command-exit');
  const teeExits = (pids || []).filter((x) => x && x.event === 'tee-exit');
  if (!pids || exits.length !== 1 || exits[0].code !== 0 || exits[0].signal) bad('pids.jsonl: command exit');
  if (!pids || teeExits.length !== 1 || teeExits[0].stderrBytes !== 0) bad('pids.jsonl: tee exit / stderr');
  const cleanup = run.json('cleanup.json').value;
  if (!cleanup || cleanup.verdict !== 'clean') bad('cleanup.json: not clean');
  const admission = run.json('admission.json').value;
  const acquisition = run.json('acquisition.json').value;
  const binding = run.json('binding.json').value;
  if (!admission || admission.decision !== 'proceed') bad('admission.json: not proceed');
  if (!acquisition || acquisition.decision !== 'proceed') bad('acquisition.json: not proceed');
  if (!binding || binding.ok !== true) bad('binding.json: not ok');
  const request = run.json('request.json').value;
  // F6: a complete A readiness record, re-decided here from the retained raw data
  readinessProblems(run, admission, request, pidRows, ctx).forEach(bad);

  if (!request) bad('request.json is missing or not JSON');
  else {
    if (request.profile !== 'gp-recorder' || request.standin !== false || request.allowExit1 !== false) {
      bad('request.json: not a real recorder request');
    }
    if (request.command && request.command.exec !== undefined) bad('request.json: command.exec is set');
    if (!request.plan || request.plan.manifestSha256 !== doc.manifestSha256) bad('request.json: plan');
    if (!same(request.chunk, chunk)) bad('request.json: the chunk differs from the manifest');
    if (request.attempt !== slot.attempt || request.runId !== slot.runId) bad('request.json: slot');
    if (!request.expected || request.expected.base !== ctx.base) bad('request.json: campaign base');
    if (ctx.realRun && !same((request.command || {}).args, frozenRecorderArgs(ctx.planRel, slot))) {
      bad('request.json: the command line is not the frozen one');
    }
  }

  const stdout = run.bytes('stdout.txt');
  const stderr = run.bytes('stderr.txt');
  if (stderr === null || stderr.length !== 0) bad('stderr.txt is missing or not empty');
  let marker = null;
  if (stdout === null) bad('stdout.txt is missing');
  else {
    const lines = stdout.toString('utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
    const start = lines.length === 2 ? START.exec(lines[0]) : null;
    marker = lines.length === 2 ? MARKER.exec(lines[1]) : null;
    if (!start || !marker) bad('stdout.txt is not exactly the start line and the completion marker');
    else if (start[1] !== chunk.chunkId || Number(start[2]) !== chunk.i0 || Number(start[3]) !== chunk.n ||
      Number(start[4]) !== chunk.seedBase || marker[1] !== chunk.chunkId) bad('stdout.txt: another chunk');
  }

  let ledger = null;
  let ledgerSha256 = null;
  if (ledgerBytes === null) bad('ledger.json is missing');
  else {
    ledgerSha256 = sha256(ledgerBytes);
    if (marker && (Number(marker[2]) !== ledgerBytes.length || marker[3] !== ledgerSha256)) {
      bad('the completion marker is not the size and digest of ledger.json');
    }
    const parsed = run.json('ledger.json');
    if (parsed.error) bad('ledger.json is not JSON: ' + parsed.error);
    ledger = parsed.value;
  }
  if (ledger) {
    validateLedgerShape(ledger, chunk).forEach((p) => bad('ledger: ' + p));
    if (!same(ledger.identity, ctx.expectedIdentity)) {
      bad('ledger: identity differs from the campaign identity');
    }
    const o = ledger.observation || {};
    if (o.runDir !== slot.runId || o.attempt !== slot.attempt) bad('ledger: another run slot');
    const refs = o.transport || {};
    ['request', 'acquisition', 'binding', 'admission'].forEach((name) => {
      const b = run.bytes(name + '.json');
      if (!refs[name] || b === null || refs[name].sha256 !== sha256(b)) {
        bad('ledger: transport reference ' + name);
      }
    });
    if (binding && binding.head && o.head !== binding.head.actual) bad('ledger: HEAD is not the bound HEAD');
    if (binding && binding.head && binding.head.base !== ctx.base) bad('binding.json: campaign base');
    const headCheck = ctx.checkHead(o.head);
    headCheck.problems.forEach((p) => bad('HEAD ' + o.head + ': ' + p));
  }
  if (problems.length === 0) {
    return { status: 'complete', problems, ledger, ledgerSha256, head: ledger.observation.head,
      dir: slot.dir };
  }
  const started = !(r && r.payloadStarted === false);
  return { status: 'failed', problems, payloadStarted: started };
}

/** The numeric order, ascending: a copy. */
const ascending = (list) => list.slice().sort((a, b) => a - b);

/** The statistics of one cell from its 50 raw times (request order). Decisions use the unrounded values. */
function cellStats(times, target) {
  const sorted = ascending(times);
  const sum = times.reduce((a, b) => a + b, 0);
  const p95 = sorted[47];
  return { n: times.length, p50: sorted[24], p95, max: sorted[49], mean: sum / times.length, target,
    meets: p95 < target, sorted };
}

/**
 * One cell: `chunks` (the manifest entries in order), `verdicts` (chunkId -> [{ slot, verdict }]). Returns
 * { cell, complete, problems, stats, chunks: [...] }.
 */
function mergeCell(cell, chunks, verdicts) {
  const problems = [];
  const accepted = [];
  const detail = [];
  chunks.forEach((chunk) => {
    const list = verdicts.get(chunk.chunkId) || [];
    const complete = list.filter((x) => x.verdict.status === 'complete');
    const failed = list.filter((x) => x.verdict.status === 'failed');
    const holds = list.filter((x) => x.verdict.status === 'hold');
    failed.forEach((f) => f.verdict.problems.forEach((p) => problems.push(chunk.chunkId + ' ' +
      f.slot.runId + ': ' + p)));
    if (complete.length > 1) problems.push(chunk.chunkId + ': ' + complete.length + ' complete ledgers');
    if (complete.length === 1 && failed.length > 0) {
      problems.push(chunk.chunkId + ': a complete run follows a run that failed; a started chunk is ' +
        'never replaced');
    }
    if (complete.length === 0) {
      problems.push(chunk.chunkId + ': no complete run (' + holds.length + ' hold(s), ' + failed.length +
        ' failed)');
    }
    if (complete.length === 1 && failed.length === 0) {
      accepted.push({ chunk, verdict: complete[0].verdict });
    }
    detail.push({ chunkId: chunk.chunkId, complete: complete.length, failed: failed.length,
      holds: holds.length });
  });
  if (accepted.length !== chunks.length || problems.length > 0) {
    return { cell, complete: false, problems, stats: null, chunks: detail, coldStart: [] };
  }
  const times = [];
  const seen = new Set();
  accepted.forEach(({ verdict }) => verdict.ledger.requests.forEach((q) => {
    if (seen.has(q.index)) problems.push(cell + ': index ' + q.index + ' twice');
    seen.add(q.index);
    times[q.index] = q.ms;
  }));
  for (let i = 0; i < 50; i++) if (!seen.has(i)) problems.push(cell + ': index ' + i + ' is missing');
  if (problems.length > 0) {
    return { cell, complete: false, problems, stats: null, chunks: detail, coldStart: [] };
  }
  const stats = cellStats(times, chunks[0].target);
  const coldStart = accepted.map(({ verdict }) => verdict.ledger.requests[0])
    .filter((q) => q.ms >= stats.sorted[47])
    .map((q) => ({ index: q.index, ms: q.ms, extraStart: q.index > 0 }));
  return { cell, complete: true, problems, stats, chunks: detail, coldStart,
    coldStartSensitive: coldStart.length > 0,
    consumed: accepted.map(({ chunk, verdict }) => ({ chunkId: chunk.chunkId, runDir: verdict.dir,
      ledgerSha256: verdict.ledgerSha256, head: verdict.head })) };
}

/**
 * The whole evaluation. `input`: { doc, scope: { type: 'cell', cell } | { type: 'all' }, runFolders (a Map of
 * declared dir -> readRunFolder result or null), expectedIdentity, base, checkHead, realRun }. Returns
 * { scope, complete, problems, cells, successes, required, meets, extraStarts }.
 */
function evaluate(input) {
  const { doc, scope } = input;
  const problems = [];
  const cells = scope.type === 'all' ? Array.from(new Set(doc.chunks.map((c) => c.cell))) : [scope.cell];
  if (scope.type === 'cell' && !doc.chunks.some((c) => c.cell === scope.cell)) {
    return { scope, complete: false, problems: ['no such cell in the manifest: ' + scope.cell], cells: [] };
  }
  if (scope.type === 'all' && cells.length !== doc.gate.cells) {
    problems.push('the manifest has ' + cells.length + ' cells, the gate expects ' + doc.gate.cells);
  }
  const results = cells.map((cell) => {
    const chunks = doc.chunks.filter((c) => c.cell === cell);
    const verdicts = new Map();
    chunks.forEach((chunk) => {
      const list = [];
      doc.runSlots.filter((s) => s.role === 'chunk' && s.chunkId === chunk.chunkId).forEach((slot) => {
        const run = input.runFolders.get(slot.dir) || null;
        list.push({ slot, verdict: judgeRun(run, { doc, slot, chunk, expectedIdentity: input.expectedIdentity,
          base: input.base, checkHead: input.checkHead, realRun: input.realRun, planRel: input.planRel,
          bindingJournal: input.bindingJournal }) });
      });
      verdicts.set(chunk.chunkId, list);
    });
    return mergeCell(cell, chunks, verdicts);
  });
  results.forEach((c) => c.problems.forEach((p) => problems.push(c.cell + ': ' + p)));
  const complete = problems.length === 0 && results.every((c) => c.complete);
  const successes = results.filter((c) => c.complete && c.stats.meets).length;
  const required = doc.gate.requiredSuccesses;
  const out = { scope, complete, problems, cells: results, successes, required };
  if (complete) {
    out.meets = scope.type === 'all' ? successes >= required : results[0].stats.meets;
    out.extraStarts = results.reduce((sum, c) => sum + c.chunks.length - 1, 0);
  }
  return out;
}

/** The R3 check of one recorded HEAD against the base, through `git` (read-only): { ok, problems }. */
function makeHeadChecker(git, base, doc, ledgerPath) {
  const cache = new Map();
  return (head) => {
    if (cache.has(head)) return cache.get(head);
    const problems = [];
    if (!/^[0-9a-f]{40}$/.test(String(head))) problems.push('not a full commit id');
    else if (head !== base) {
      let descendant = false;
      try {
        git(['merge-base', '--is-ancestor', base, head]);
        descendant = true;
      } catch (err) {
        problems.push('not a descendant of the campaign base ' + base);
      }
      if (descendant) {
        try {
          const names = git(['diff', '--name-only', '-z', base, head]).split('\0').filter(Boolean);
          const violations = campaignDiffViolations(names, { declaredDirs: plan.declaredDirsOf(doc),
            ledger: ledgerPath || LEDGER });
          if (violations.length > 0) {
            problems.push('changed since the base: ' + violations.slice(0, 5).join('; '));
          }
        } catch (err) {
          problems.push('git diff failed: ' + err.message);
        }
      }
    }
    const verdict = { ok: problems.length === 0, problems };
    cache.set(head, verdict);
    return verdict;
  };
}

/** The identity every ledger of the campaign must carry exactly (from the manifest and this run). */
function expectedIdentityOf(doc, helperManifestSha256, base) {
  return {
    planManifestSha256: doc.manifestSha256, helperManifestSha256, hashIdentity: doc.sources.hashIdentity,
    tableSha256: doc.targets.tableSha256, sourcesPublished: doc.sources.sources,
    loadedFiles: doc.loader.files, loaderRecipe: doc.loader.recipe, node: doc.environment.node,
    machine: doc.environment.machine, execArgv: [], nodeOptions: '', base, selectedPolicy: doc.policy,
    identityMethod: IDENTITY_METHOD
  };
}

/**
 * R2 at merge time: the declared run folders of the scope are read, and anything else under the run base
 * that the manifest does not declare (a folder, a loose file) is a problem. `listDir(rel)` -> [{ name,
 * dir }] and `readDir(rel)` -> readRunFolder result, both relative to the repository.
 */
function collectRunFolders(doc, scope, fsio) {
  const folders = new Map();
  const problems = [];
  const declared = new Set(plan.declaredDirsOf(doc));
  const base = doc.runBase;
  const wanted = scope.type === 'all' ? null : scope.cell.replace('/', '-');
  fsio.listDir(base).forEach((entry) => {
    if (wanted !== null && entry.name !== wanted) return;
    if (!entry.dir) {
      problems.push('a loose file under the run base: ' + base + '/' + entry.name);
      return;
    }
    fsio.listDir(base + '/' + entry.name).forEach((run) => {
      const rel = base + '/' + entry.name + '/' + run.name;
      if (!declared.has(rel)) problems.push('an undeclared run directory: ' + rel);
    });
  });
  doc.runSlots.filter((s) => s.role === 'chunk').forEach((slot) => {
    if (wanted !== null && slot.dir.split('/').slice(-2)[0] !== wanted) return;
    folders.set(slot.dir, fsio.exists(slot.dir) ? fsio.readDir(slot.dir) : null);
  });
  return { folders, problems };
}

/** The numbers of a cell for the report (the sorted copy is dropped). */
const publicStats = (s) => (s ? { n: s.n, p50: s.p50, p95: s.p95, max: s.max, mean: s.mean, target: s.target,
  meets: s.meets } : null);

module.exports = { judgeRun, mergeCell, evaluate, cellStats, makeHeadChecker, expectedIdentityOf,
  collectRunFolders, readRunFolder, frozenRecorderArgs, publicStats, ascending };
