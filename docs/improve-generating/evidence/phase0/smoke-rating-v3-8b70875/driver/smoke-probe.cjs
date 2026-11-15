'use strict';

/*
 * Smoke-only probes of the compatibility smoke (units of the phase IG-S01/smoke-inventory). Source-only: they read the
 * source set and the harness, apply the private transforms to strings in memory and build plans; they load no engine,
 * start no worker, generate nothing and write nothing (one JSON document on stdout).
 *
 *   node smoke-probe.cjs --mode=inspect --round=<r> --expect-root=<abs> --reference-root=<abs>
 *        --forbidden-roots=<abs|abs> [--target-commit=<sha>]
 *   node smoke-probe.cjs --mode=analyze --round=<r> --runtime-label=<text>
 */
const fs = require('fs');
const path = require('path');
const S = require('./smoke-lib.cjs');
const C = require('./common.cjs');
const L = require('./loader.cjs');
const M = require('./manifest.cjs');
const RUN = require('./run.cjs');

const TASKS = ['IG-S01', 'IG-S02', 'IG-S03', 'IG-S04', 'IG-S05', 'IG-S06', 'IG-S07', 'IG-S08', 'IG-S09', 'IG-S10'];
const SMOKE_FILE = /^(Invoke-IgSmoke\.ps1|smoke-[a-z-]+\.cjs)$/;

// Adapter sets read from the plan sources, used only where a manifest cannot be built in this tree (its plan reads
// evidence that is absent here); every built manifest is used as it is.
const STATIC_COMBOS = {
  'IG-S03': [['attempt-pool', 'scoped-solver'], ['scoped-solver'], ['scoped-solver', 'scoped-audit']],
  'IG-S05': [['frontier-hooks']],
  'IG-S07': [['profile'], []]
};

function lower(p) {
  return path.resolve(p).toLowerCase();
}

function insideOrSame(parent, child) {
  const a = lower(parent);
  const b = lower(child);
  return a === b || b.startsWith(a.endsWith(path.sep) ? a : a + path.sep);
}

function listFiles(dir, skip) {
  const out = [];
  const walk = function (d, prefix) {
    fs.readdirSync(d, { withFileTypes: true }).sort(function (x, y) { return x.name < y.name ? -1 : 1; })
      .forEach(function (e) {
        const rel = prefix === '' ? e.name : prefix + '/' + e.name;
        if (e.isDirectory()) {
          if (!(skip && skip.indexOf(e.name) >= 0)) walk(path.join(d, e.name), rel);
        } else if (e.isFile()) {
          out.push({ rel: rel, sha256: S.sha256(fs.readFileSync(path.join(d, e.name))),
            bytes: fs.statSync(path.join(d, e.name)).size });
        }
      });
  };
  walk(dir, '');
  return out;
}

function errorInfo(err) {
  return { code: err && err.code ? err.code : (err && err.name) || 'error',
    message: String(err && err.message ? err.message : err).slice(0, 500) };
}

// --- inspect ---------------------------------------------------------------------------------------------------

function loaderParityPrediction(round) {
  const manifest = M.buildManifest('IG-S01', round);
  const shard = M.shardOf(manifest, 'loader-parity');
  const pack = function (deadlineMs) {
    const physical = M.packCommands(M.blocksFor(manifest, shard.jobKeys), M.commandWindowMs(deadlineMs));
    return { deadlineMs: deadlineMs, windowMs: physical.windowMs, commands: physical.commands.length,
      firstCommandKeys: physical.commands.length > 0 ? physical.commands[0].jobKeys : [],
      oversize: physical.oversize };
  };
  let minPair = null;
  let minAll = null;
  for (let d = 23000; d <= 80000; d += 500) {
    const p = pack(d);
    if (minPair === null && p.firstCommandKeys.length >= 2) minPair = d;
    if (minAll === null && p.firstCommandKeys.length >= shard.jobKeys.length) minAll = d;
  }
  const jobs = M.jobsOf(manifest, shard.jobKeys);
  return { plannedKeys: shard.jobKeys, jobEstimateMs: jobs.map(function (j) { return j.estimateMs; }),
    at25000: pack(25000), minDeadlineMsForOnePair: minPair, minDeadlineMsForAllRows: minAll,
    note: 'static packing arithmetic of manifest.cjs: only the first physical command is run by one run.cjs call' };
}

function inspect(opts) {
  const root = C.DEFAULT_REPO_ROOT;
  const forbidden = (opts['forbidden-roots'] || '').split('|').filter(Boolean);
  const set = L.loadSourceSet({ repoRoot: root });
  const outside = set.files.filter(function (f) { return !insideOrSame(root, f.abs); }).map(function (f) { return f.rel; });
  const inForbidden = [];
  forbidden.forEach(function (fr) {
    set.files.forEach(function (f) {
      if (insideOrSame(fr, f.abs) && !insideOrSame(root, f.abs)) inForbidden.push({ root: fr, file: f.rel });
    });
  });
  const harnessCopy = listFiles(C.HARNESS_DIR, ['scratch']);
  const smokeFiles = harnessCopy.filter(function (f) { return SMOKE_FILE.test(f.rel); });
  const packFiles = harnessCopy.filter(function (f) { return !SMOKE_FILE.test(f.rel); });
  const hf = C.harnessFingerprint();
  const packOnly = C.digestOf(hf.files.filter(function (f) { return !SMOKE_FILE.test(f.file); }));
  const out = {
    schema: 'ig-smoke-inspect/1',
    mode: 'inspect',
    process: { argv1: process.argv[1], cwd: process.cwd(), pid: process.pid, ppid: process.ppid, node: process.version },
    roots: {
      expected: opts['expect-root'], defaultRepoRoot: root, harnessDir: C.HARNESS_DIR,
      defaultRepoRootIsExpected: lower(root) === lower(opts['expect-root']),
      harnessInsideExpected: insideOrSame(opts['expect-root'], C.HARNESS_DIR),
      scriptInsideHarness: insideOrSame(C.HARNESS_DIR, process.argv[1]),
      forbidden: forbidden, loadedFilesOutsideRoot: outside, loadedFilesInForbiddenRoots: inForbidden,
      belongsToSmokeWorktree: lower(root) === lower(opts['expect-root']) && outside.length === 0 &&
        inForbidden.length === 0
    },
    lock: RUN.observeLock('IG-S01/smoke-inventory'),
    lockFile: S.readLockFile(),
    constants: {
      guards: C.GUARDS,
      selfTestEstimateMs: Number((/const SELF_TEST_ESTIMATE_MS = (\d+);/.exec(
        fs.readFileSync(path.join(C.HARNESS_DIR, 'run.cjs'), 'utf8')) || [])[1]),
      parityEstimateMs: Number((/const PARITY_ESTIMATE_MS = (\d+);/.exec(
        fs.readFileSync(path.join(C.HARNESS_DIR, 'manifest.cjs'), 'utf8')) || [])[1]),
      allocationIgS01Ms: M.ALLOCATIONS_MS['IG-S01'],
      defaultRuntimeLabel: RUN.DEFAULT_RUNTIME_LABEL
    },
    source: {
      runner: L.RUNNER_REL, runnerSha256: set.runnerSha256, runtimeFingerprint: set.fingerprint,
      count: set.files.length, files: set.files.map(function (f) { return { rel: f.rel, bytes: f.bytes, sha256: f.sha256 }; })
    },
    harness: {
      dir: C.HARNESS_DIR, fileCount: harnessCopy.length, harnessFingerprintWithSmokeFiles: hf.fingerprint,
      harnessFingerprintPackFilesOnly: packOnly, smokeFiles: smokeFiles, packFileCount: packFiles.length,
      fingerprintedFiles: hf.files.length
    },
    loaderParityPrediction: loaderParityPrediction(opts.round)
  };
  // The unchanged copy of the pack in the improve-generating worktree and its (older) runtime, read only.
  const ref = opts['reference-root'];
  out.reference = { root: ref };
  try {
    const refHarnessDir = path.join(ref, ...C.HARNESS_REL.split('/'));
    const refFiles = listFiles(refHarnessDir, ['scratch']);
    const refMap = new Map(refFiles.map(function (f) { return [f.rel, f.sha256]; }));
    const copyMap = new Map(packFiles.map(function (f) { return [f.rel, f.sha256]; }));
    out.reference.harness = {
      dir: refHarnessDir, fileCount: refFiles.length,
      harnessFingerprint: C.harnessFingerprint(refHarnessDir).fingerprint,
      identicalToPackFilesOfCopy: refFiles.length === packFiles.length && refFiles.every(function (f) {
        return copyMap.get(f.rel) === f.sha256;
      }),
      differing: refFiles.filter(function (f) { return copyMap.has(f.rel) && copyMap.get(f.rel) !== f.sha256; })
        .map(function (f) { return f.rel; }),
      onlyInReference: refFiles.filter(function (f) { return !copyMap.has(f.rel); }).map(function (f) { return f.rel; }),
      onlyInCopy: packFiles.filter(function (f) { return !refMap.has(f.rel); }).map(function (f) { return f.rel; })
    };
  } catch (err) {
    out.reference.harnessError = errorInfo(err);
  }
  try {
    const refSet = L.loadSourceSet({ repoRoot: ref });
    const a = new Map(refSet.files.map(function (f) { return [f.rel, f.sha256]; }));
    const b = new Map(set.files.map(function (f) { return [f.rel, f.sha256]; }));
    out.reference.runtime = {
      runtimeFingerprint: refSet.fingerprint, count: refSet.files.length, runnerSha256: refSet.runnerSha256,
      sameFingerprintAsSmoke: refSet.fingerprint === set.fingerprint,
      changedInSmoke: Array.from(b.keys()).filter(function (k) { return a.has(k) && a.get(k) !== b.get(k); }),
      addedInSmoke: Array.from(b.keys()).filter(function (k) { return !a.has(k); }),
      removedInSmoke: Array.from(a.keys()).filter(function (k) { return !b.has(k); })
    };
  } catch (err) {
    out.reference.runtimeError = errorInfo(err);
  }
  return out;
}

// --- analyze ---------------------------------------------------------------------------------------------------

function sequentialDryRun(set, adapters) {
  const texts = new Map(set.files.map(function (e) { return [e.rel, e.text]; }));
  const byRel = new Map(set.files.map(function (e) { return [e.rel, e]; }));
  const seen = new Set();
  const applied = [];
  let first = null;
  adapters.every(function (adapter) {
    return adapter.transforms.every(function (t) {
      try {
        L.validateTransformShape(t);
        if (seen.has(t.id)) throw Object.assign(new Error('transform id used twice: ' + t.id), { code: 'transform-duplicate' });
        seen.add(t.id);
        if (!byRel.has(t.file)) {
          throw Object.assign(new Error('transform file is not a listed source: ' + t.file), { code: 'transform-file' });
        }
        const out = L.applyTransform(byRel.get(t.file), texts.get(t.file), t);
        texts.set(t.file, out.text);
        applied.push(t.id);
        return true;
      } catch (err) {
        first = Object.assign({ adapterId: adapter.id, transformId: t.id, file: t.file,
          anchor: String(t.anchor || '').trim().slice(0, 200), position: t.position,
          find: typeof t.find === 'string' ? t.find.slice(0, 200) : null }, errorInfo(err));
        return false;
      }
    });
  });
  let authoritative;
  try {
    const desc = L.describePlan(L.buildLoadPlan(set, adapters));
    authoritative = { ok: true, transforms: desc.transforms.length, patchedFiles: desc.patchedFiles,
      adapterHashes: desc.adapterHashes };
  } catch (err) {
    authoritative = Object.assign({ ok: false }, errorInfo(err));
  }
  return { ok: first === null && authoritative.ok, applied: applied.length, firstFailure: first,
    authoritative: authoritative, replicaAgreesWithLoader: (first === null) === authoritative.ok };
}

function independentDryRun(set, adapter) {
  const byRel = new Map(set.files.map(function (e) { return [e.rel, e]; }));
  const rows = adapter.transforms.map(function (t) {
    const row = { id: t.id, file: t.file, position: t.position };
    try {
      if (!byRel.has(t.file)) throw Object.assign(new Error('not a listed source: ' + t.file), { code: 'transform-file' });
      const out = L.applyTransform(byRel.get(t.file), byRel.get(t.file).text, t);
      row.ok = true;
      row.functionName = out.record.functionName;
    } catch (err) {
      row.ok = false;
      row.anchor = String(t.anchor || '').trim().slice(0, 200);
      Object.assign(row, errorInfo(err));
    }
    return row;
  });
  return { total: rows.length, applicable: rows.filter(function (r) { return r.ok; }).length, rows: rows };
}

function classifyPlanError(task, err) {
  const info = errorInfo(err);
  if (task === 'IG-S06' && info.code === 'plan-missing' && /has no plan/.test(info.message)) {
    return 'expected-no-plan-file';
  }
  if (info.code === 'plan-missing' && /(missing|mismatch)/.test(info.message) && /evidence/.test(info.message)) {
    return 'prerequisite-evidence-absent';
  }
  return 'unexpected';
}

function analyze(opts) {
  const root = C.DEFAULT_REPO_ROOT;
  const set = L.loadSourceSet({ repoRoot: root });
  const adapterDir = path.join(C.HARNESS_DIR, 'adapters');
  const ids = ['noop-expose'].concat(fs.readdirSync(adapterDir).filter(function (n) { return /\.cjs$/.test(n); })
    .map(function (n) { return n.replace(/\.cjs$/, ''); }).sort());
  const adapters = ids.map(function (id) {
    const row = { id: id, source: id === 'noop-expose' ? 'builtin (loader.cjs)' : 'adapters/' + id + '.cjs' };
    try {
      const adapter = L.getAdapter(id);
      row.hash = C.digestOf(adapter);
      row.transformCount = adapter.transforms.length;
      row.files = Array.from(new Set(adapter.transforms.map(function (t) { return t.file; })));
      row.independent = independentDryRun(set, adapter);
      row.sequential = sequentialDryRun(set, [adapter]);
    } catch (err) {
      row.loadError = errorInfo(err);
    }
    return row;
  });

  const manifests = {};
  TASKS.forEach(function (task) {
    try {
      const manifest = M.buildManifest(task, opts.round);
      const sets = new Map();
      manifest.jobs.forEach(function (j) { sets.set(JSON.stringify(j.adapterIds || []), j.adapterIds || []); });
      manifests[task] = { built: true, manifestHash: manifest.manifestHash, jobs: manifest.jobs.length,
        shards: manifest.shards.map(function (s) { return s.shard; }), combos: Array.from(sets.values()) };
    } catch (err) {
      manifests[task] = { built: false, error: errorInfo(err), classification: classifyPlanError(task, err),
        combos: STATIC_COMBOS[task] || [] };
    }
  });
  const comboMap = new Map();
  TASKS.forEach(function (task) {
    manifests[task].combos.forEach(function (ids) {
      const key = JSON.stringify(ids);
      if (!comboMap.has(key)) comboMap.set(key, { adapterIds: ids, usedBy: [], origins: [] });
      const c = comboMap.get(key);
      if (c.usedBy.indexOf(task) < 0) c.usedBy.push(task);
      const origin = manifests[task].built ? 'manifest' : 'static (manifest not buildable here)';
      if (c.origins.indexOf(origin) < 0) c.origins.push(origin);
    });
  });
  const combos = Array.from(comboMap.values()).map(function (c) {
    if (c.adapterIds.length === 0) return Object.assign(c, { native: true, ok: true, applied: 0, firstFailure: null });
    try {
      return Object.assign(c, sequentialDryRun(set, c.adapterIds.map(L.getAdapter)));
    } catch (err) {
      return Object.assign(c, { ok: false, loadError: errorInfo(err) });
    }
  });

  const plans = TASKS.map(function (task) {
    try {
      const plan = RUN.planOnly({ task: task, round: opts.round, runtimeLabel: opts['runtime-label'] || null,
        freezeReceipt: null, budgetReceipt: null }, root);
      return { task: task, ok: true, mode: plan.mode, runtimeFingerprint: plan.runtimeFingerprint,
        harnessFingerprint: plan.harnessFingerprint, manifestHash: plan.manifestHash, gate: plan.gate.state,
        adapters: plan.adapters, projectedMachineMs: plan.projectedMachineMs,
        budget: { allocationMs: plan.budget.allocationMs, remainingTaskMs: plan.budget.remainingTaskMs,
          effectiveDeadlineMs: plan.budget.effectiveDeadlineMs, canAdmit: plan.budget.canAdmit },
        shards: plan.shards.map(function (s) { return { shard: s.shard, kind: s.kind, status: s.status,
          keys: s.keys.length, unstarted: s.unstartedKeys.length, projectedMachineMs: s.projectedMachineMs }; }) };
    } catch (err) {
      return { task: task, ok: false, error: errorInfo(err), classification: classifyPlanError(task, err) };
    }
  });
  return { schema: 'ig-smoke-analyze/1', mode: 'analyze', root: root, runtimeFingerprint: set.fingerprint,
    adapters: adapters, manifests: manifests, combos: combos, plans: plans };
}

try {
  const opts = S.parseArgs(process.argv.slice(2), ['mode', 'round', 'expect-root', 'reference-root', 'forbidden-roots',
    'target-commit', 'runtime-label']);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new Error('bad --round');
  let doc;
  if (opts.mode === 'inspect') doc = inspect(opts);
  else if (opts.mode === 'analyze') doc = analyze(opts);
  else throw new Error('--mode is inspect or analyze');
  process.stdout.write(JSON.stringify(doc) + '\n', function () { process.exit(0); });
} catch (err) {
  process.stderr.write('IG smoke-probe error: ' + (err && err.stack ? err.stack : String(err)) + '\n');
  process.exit(3);
}
