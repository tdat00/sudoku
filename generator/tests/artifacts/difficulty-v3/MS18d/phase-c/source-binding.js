'use strict';

/*
 * MS18d Phase C0 task-owned (G4): the binding of a run to its sources, tools and machine, made inside the
 * locked child before any payload. It records, and holds on any difference:
 *   - the actual Git HEAD against the campaign base commit B the orchestrator declared (R3: required for a
 *     real run): HEAD is B or a descendant of B whose `git diff --name-only B HEAD` lists only the
 *     manifest-declared run outputs (R2: literal directories), the release ledger and the pack files of
 *     tasks/difficulty-v3/; anything else that changed since B is a hold;
 *   - the RAW `git status` (all of it) and a separately named, explicitly reviewed clean-input check. The
 *     reviewed check (SA1 C0-4, exactly) allows only: new (untracked) files directly inside a run
 *     directory that the frozen manifest DECLARES (R2: a literal repository-relative directory, such as
 *     `docs/difficulty-v3/evidence/MS18d/gp/<variant>-<level>/<run-id>/` or `.../gp/all-79/<run-id>/`,
 *     never a pattern) and that this campaign created (the release ledger or this run lists it), and the
 *     release ledger `docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl` as ` M` only, committed
 *     before the first
 *     timed command, with its committed bytes an exact prefix of the working file. Nothing staged,
 *     deleted, renamed or otherwise changed, and no helper or artifact exemption, no blanket exemption for
 *     an evidence tree. A global status is never called clean when run outputs make it dirty: `rawClean`
 *     and `reviewedClean` are separate fields and the raw status lines are kept;
 *   - the E hash identity (344afdec...), the replay identity and the producer sources, the canonical
 *     135-position target table (3d0bffdb...) and the frozen target of the requested cell;
 *   - Node and the machine (CPU, logical processors, memory, platform);
 *   - the frozen helper manifest (the Phase C helpers and the Phase A/B files they reference), by hash.
 * Every fact comes through `io` (git, identities, target table, machine, files), so the real tree and the
 * stand-ins use the same code. A step that cannot be completed is a problem, never a guess.
 */
const fs = require('fs');
const path = require('path');
const { sha256 } = require('./common.js');

const RUN_DIR_BASE = 'docs/difficulty-v3/evidence/MS18d/gp';
const LEDGER = 'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl';
const RUN_FILE = /^(?!\.+$)[A-Za-z0-9._-]+$/;

/** `git status --porcelain=v1 -z --untracked-files=all` as entries { xy, path, from }. */
function parsePorcelainZ(text) {
  const parts = String(text).split('\0');
  if (parts[parts.length - 1] === '') parts.pop();
  const entries = [];
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];
    const xy = item.slice(0, 2);
    const entry = { xy, path: item.slice(3), from: null };
    if (/[RC]/.test(xy)) entry.from = parts[++i] || null;
    entries.push(entry);
  }
  return entries;
}

/**
 * The reviewed clean-input check (C0-4, SA1). `allow`: { declaredRuns: ['docs/.../gp/<cell>/<run-id>', ...],
 * ledger, ledgerIsPrefix(path) -> boolean }. Allowed, and nothing else: `??` files directly inside a declared
 * run directory, and ` M` of the release ledger when its committed bytes are an exact prefix of the working
 * file (the ledger is committed before the first timed command; an untracked ledger is not allowed). Staged,
 * deleted, renamed or otherwise changed paths, and any helper, artifact, record or input, are violations.
 * Returns { rawClean, reviewedClean, entries, allowed, violations }.
 */
function evaluateStatus(entries, allow) {
  const ledger = allow.ledger || LEDGER;
  const runs = (allow.declaredRuns || []).map((d) => d.replace(/\\/g, '/').replace(/\/$/, ''));
  const allowed = [];
  const violations = [];
  entries.forEach((e) => {
    const file = e.path.replace(/\\/g, '/');
    if (e.xy === '??') {
      const dir = path.posix.dirname(file);
      const name = path.posix.basename(file);
      if (runs.indexOf(dir) !== -1 && RUN_FILE.test(name)) {
        allowed.push({ path: file, xy: e.xy, why: 'new output of a declared run' });
        return;
      }
    }
    if (e.xy === ' M' && file === ledger) {
      const prefix = allow.ledgerIsPrefix ? allow.ledgerIsPrefix(file) : false;
      if (prefix === true) {
        allowed.push({ path: file, xy: e.xy, why: 'release ledger, committed bytes are an exact prefix' });
        return;
      }
      violations.push({ path: file, xy: e.xy,
        why: 'the release ledger is not a pure append of its committed bytes' });
      return;
    }
    violations.push({ path: file, xy: e.xy, why: 'not an append-only run output or the release ledger' });
  });
  return { rawClean: entries.length === 0, reviewedClean: violations.length === 0, entries, allowed,
    violations };
}

const normDir = (d) => String(d).replace(/\\/g, '/').replace(/\/$/, '');

/**
 * R2 (SA1): the run directories the campaign has created so far that the frozen manifest DECLARES, as
 * literal repository-relative paths (not a pattern): the earlier runs of the release ledger plus the one
 * being prepared, kept only when they are in `declaredDirs`.
 */
function declaredRunDirs(ledgerRuns, thisRun, declaredDirs) {
  const declared = new Set((declaredDirs || []).map(normDir));
  const out = [];
  ledgerRuns.concat(thisRun ? [thisRun] : []).forEach((d) => {
    const rel = normDir(d);
    if (declared.has(rel) && out.indexOf(rel) === -1) out.push(rel);
  });
  return out;
}

/**
 * R3 (SA1): the paths `git diff --name-only <base> <HEAD>` may list while the campaign runs: a file directly
 * inside a run directory the frozen manifest declares (R2, literal), the release ledger and the task-pack
 * files of tasks/difficulty-v3/. Nothing else: a helper, a source, a target or an accepted record that moved
 * since the base commit is a violation. `allow`: { declaredDirs, ledger }.
 */
function campaignDiffViolations(paths, allow) {
  const ledger = allow.ledger || LEDGER;
  const dirs = new Set((allow.declaredDirs || []).map(normDir));
  const violations = [];
  paths.forEach((raw) => {
    const file = raw.replace(/\\/g, '/');
    const inPack = file.startsWith('tasks/difficulty-v3/') && !file.split('/').some((p) => p === '..');
    const inRun = dirs.has(path.posix.dirname(file)) && RUN_FILE.test(path.posix.basename(file));
    if (!inPack && !inRun && file !== ledger) violations.push(file);
  });
  return violations;
}

/** The manifest lines `HASH  relative\path` against the files; every `required` file must be in it. */
function verifyManifest(manifestFile, repoRoot, expectedManifestSha256, required) {
  const problems = [];
  const result = { file: manifestFile, entries: 0, mismatches: [], missing: [] };
  let bytes;
  try {
    bytes = fs.readFileSync(manifestFile);
  } catch (err) {
    problems.push('the helper manifest cannot be read: ' + err.message);
    return { problems, result };
  }
  result.sha256 = sha256(bytes);
  if (expectedManifestSha256 && result.sha256 !== expectedManifestSha256.toLowerCase()) {
    problems.push('the helper manifest is not the reviewed one (sha256 ' + result.sha256 + ')');
  }
  const listed = new Set();
  bytes.toString('utf8').split(/\r?\n/).forEach((line) => {
    if (line.trim() === '') return;
    const m = /^([0-9A-Fa-f]{64})  (.+)$/.exec(line);
    if (!m) {
      problems.push('a manifest line is not "<sha256>  <path>": ' + line);
      return;
    }
    const rel = m[2].replace(/\\/g, '/');
    listed.add(rel);
    result.entries++;
    let actual = null;
    try {
      actual = sha256(fs.readFileSync(path.join(repoRoot, rel)));
    } catch (err) {
      result.missing.push(rel);
      return;
    }
    if (actual !== m[1].toLowerCase()) result.mismatches.push(rel);
  });
  (required || []).forEach((rel) => {
    if (!listed.has(rel.replace(/\\/g, '/'))) result.missing.push('(not in the manifest) ' + rel);
  });
  if (result.mismatches.length > 0) {
    problems.push('helper bytes differ from the manifest: ' + result.mismatches.join(', '));
  }
  if (result.missing.length > 0) {
    problems.push('helper files missing or unlisted: ' + result.missing.join(', '));
  }
  return { problems, result };
}

/**
 * `opts`: { expected: { base, identities: { hashIdentity, replayIdentity, sources }, tableSha256, node,
 *   machine: { cpu, logicalProcessors, memoryGb, platform }, cell: { variant, level, targetMs } | null },
 *   allow: { declaredRuns, declaredDirs, ledger }, helpers: { manifestFile, manifestSha256, required,
 *   repoRoot } | null, requireHead, io }. `base` is the campaign base commit B (R3): HEAD must be B or a
 *   descendant of B whose diff from B lists only campaign outputs and pack files. `cell` is the check of a GP
 *   cell payload; another payload type passes null and adds its own facts. `io`: { git(args) -> text,
 *   readWorking(path) -> text, identities() -> {...}, table() -> { sha256, targetOf(key) }, machine() ->
 *   {...}, node() -> 'v..' }. Returns the binding record; `ok` is true only when nothing was held.
 */
function bindSource(opts) {
  const { expected, allow, helpers, io } = opts;
  const problems = [];
  const record = { schema: 'ms18d-c-binding-1', ok: false, problems };
  const attempt = (what, fn) => {
    try {
      return fn();
    } catch (err) {
      problems.push(what + ': ' + (err && err.message ? err.message : String(err)));
      return undefined;
    }
  };

  const head = attempt('git HEAD', () => io.git(['rev-parse', 'HEAD']).trim());
  const base = expected.base || null;
  record.head = { actual: head === undefined ? null : head, base, descendant: null, diff: null, ok: false };
  if (opts.requireHead && !base) problems.push('no campaign base commit is declared');
  if (base && !/^[0-9a-f]{40}$/.test(base)) {
    problems.push('the campaign base is not a full commit id: ' + base);
  } else if (head !== undefined) {
    const headProblems = problems.length;
    if (!/^[0-9a-f]{40}$/.test(head)) problems.push('git HEAD is not a full commit id: ' + head);
    else if (base && head === base) {
      record.head.descendant = true;
      record.head.diff = { paths: [], violations: [] };
    } else if (base) {
      // R3: the base commit, or a descendant of it whose only changes are campaign outputs and pack files
      let descendant = false;
      try {
        io.git(['merge-base', '--is-ancestor', base, head]);
        descendant = true;
      } catch (err) {
        descendant = false;
      }
      record.head.descendant = descendant;
      if (!descendant) {
        problems.push('HEAD ' + head + ' is neither the campaign base ' + base + ' nor a descendant of it');
      } else {
        const names = attempt('git diff', () => io.git(['diff', '--name-only', '-z', base, head])
          .split('\0').filter(Boolean));
        if (names !== undefined) {
          const violations = campaignDiffViolations(names, allow);
          record.head.diff = { paths: names, violations };
          if (violations.length > 0) {
            problems.push('since the campaign base ' + violations.length + ' path(s) changed that are not ' +
              'campaign outputs or pack files: ' + violations.slice(0, 10).join('; '));
          }
        }
      }
    }
    record.head.ok = problems.length === headProblems && base !== null;
  }

  const porcelain = attempt('git status',
    () => io.git(['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  if (porcelain !== undefined) {
    const entries = parsePorcelainZ(porcelain);
    // the committed bytes of the ledger must be an exact prefix of the working file (modulo the line-end
    // conversion that `core.autocrlf` makes between the blob and the working tree)
    const ledgerIsPrefix = (file) => {
      try {
        const committed = io.git(['show', 'HEAD:' + file]).replace(/\r\n/g, '\n');
        const working = io.readWorking(file).replace(/\r\n/g, '\n');
        return working.startsWith(committed);
      } catch (err) {
        return false;
      }
    };
    const status = evaluateStatus(entries, Object.assign({ ledgerIsPrefix }, allow));
    record.status = Object.assign({ rawText: porcelain.replace(/\0/g, '\n').trim().split('\n')
      .filter(Boolean) }, status);
    if (!status.reviewedClean) {
      problems.push('the reviewed clean-input check found ' + status.violations.length + ' path(s): ' +
        status.violations.map((v) => v.xy + ' ' + v.path).join('; '));
    }
  } else {
    record.status = null;
  }

  const identities = attempt('identities', () => io.identities());
  record.identities = identities || null;
  if (identities) {
    ['hashIdentity', 'replayIdentity', 'sources'].forEach((k) => {
      const want = expected.identities && expected.identities[k];
      if (!want) problems.push('no expected ' + k + ' is declared');
      else if (identities[k] !== want) problems.push(k + ' ' + identities[k] + ' differs from ' + want);
    });
  }

  const table = attempt('target table', () => io.table());
  record.table = table ? { sha256: table.sha256, expected: expected.tableSha256 || null } : null;
  if (table) {
    if (!expected.tableSha256) problems.push('no expected target table hash is declared');
    else if (table.sha256 !== expected.tableSha256) {
      problems.push('the target table ' + table.sha256 + ' differs from ' + expected.tableSha256);
    }
    if (expected.cell) {
      const key = expected.cell.variant + '/' + expected.cell.level;
      const target = attempt('target of ' + key, () => table.targetOf(key));
      record.cell = { key, target: target === undefined ? null : target, expected: expected.cell.targetMs };
      if (target !== expected.cell.targetMs) {
        problems.push('the target of ' + key + ' is ' + target + ', not ' + expected.cell.targetMs);
      }
    }
  }

  const nodeVersion = attempt('node', () => io.node());
  record.node = { actual: nodeVersion === undefined ? null : nodeVersion, expected: expected.node || null };
  if (nodeVersion !== undefined && nodeVersion !== expected.node) {
    problems.push('node ' + nodeVersion + ' differs from ' + expected.node);
  }

  const machine = attempt('machine', () => io.machine());
  record.machine = { actual: machine || null, expected: expected.machine || null };
  if (machine) {
    ['cpu', 'logicalProcessors', 'memoryGb', 'platform'].forEach((k) => {
      if (!expected.machine || machine[k] !== expected.machine[k]) {
        problems.push('machine ' + k + ' ' + machine[k] + ' differs from ' +
          (expected.machine && expected.machine[k]));
      }
    });
  }

  if (helpers) {
    const checked = attempt('helper manifest', () => verifyManifest(helpers.manifestFile, helpers.repoRoot,
      helpers.manifestSha256, helpers.required));
    if (checked) {
      record.helpers = checked.result;
      checked.problems.forEach((p) => problems.push(p));
    } else {
      record.helpers = null;
    }
  } else {
    record.helpers = null;
    problems.push('no helper manifest was given: the helpers are not frozen');
  }

  record.ok = problems.length === 0;
  return record;
}

module.exports = { bindSource, evaluateStatus, parsePorcelainZ, declaredRunDirs, campaignDiffViolations,
  verifyManifest, RUN_DIR_BASE, LEDGER };
