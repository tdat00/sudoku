'use strict';

/*
 * Isolated loader of the phase-0 harness. It reads the ordered SOURCE_FILES of generator/tests/node-runner.js
 * (the runner is never executed), refuses a missing or escaping source, fingerprints the unmodified bytes, applies
 * validated private transforms to the source strings in memory (never over their origin) and runs the scripts in
 * the global of the calling worker thread, which is the private VM. Also the read-only production firewall
 * inventory. No git, no temporary-directory file.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('./common.cjs');

const HarnessError = C.HarnessError;

// Real file-system access; the self-test swaps in `memoryIo` to corrupt, move or change files without touching
// any real one.
const nodeIo = {
  readFile: function (abs) { return fs.readFileSync(abs); },
  isFile: function (abs) {
    try {
      return fs.statSync(abs).isFile();
    } catch (err) {
      return false;
    }
  },
  realpath: function (abs) { return fs.realpathSync.native(abs); },
  readdir: function (abs) {
    return fs.readdirSync(abs, { withFileTypes: true }).map(function (d) {
      return { name: d.name, isDirectory: d.isDirectory(), isFile: d.isFile() };
    });
  },
  stat: function (abs) {
    const s = fs.statSync(abs);
    return { size: s.size, mtimeMs: s.mtimeMs };
  }
};

/** In-memory files (`rel` -> text or Buffer under `root`), `links` (abs -> real abs) emulate a junction. */
function memoryIo(root, files, links) {
  const map = new Map();
  Object.keys(files).forEach(function (rel) {
    map.set(path.resolve(root, rel), Buffer.from(files[rel]));
  });
  const linkMap = new Map(Object.entries(links || {}).map(function (e) { return [path.resolve(e[0]), e[1]]; }));
  const notFound = function (abs) {
    const err = new Error('ENOENT: ' + abs);
    err.code = 'ENOENT';
    return err;
  };
  return {
    files: map,
    readFile: function (abs) {
      const b = map.get(path.resolve(abs));
      if (!b) throw notFound(abs);
      return b;
    },
    isFile: function (abs) { return map.has(path.resolve(abs)); },
    realpath: function (abs) {
      const full = path.resolve(abs);
      return linkMap.has(full) ? linkMap.get(full) : full;
    },
    readdir: function (abs) {
      const dir = path.resolve(abs);
      const seen = new Map();
      map.forEach(function (_b, file) {
        if (!C.isInside(dir, file)) return;
        const parts = path.relative(dir, file).split(path.sep);
        if (!seen.has(parts[0])) seen.set(parts[0], parts.length > 1);
      });
      return Array.from(seen.entries()).map(function (e) {
        return { name: e[0], isDirectory: e[1], isFile: !e[1] };
      });
    },
    stat: function (abs) {
      const b = map.get(path.resolve(abs));
      if (!b) throw notFound(abs);
      return { size: b.length, mtimeMs: 0 };
    }
  };
}

const RUNNER_REL = 'generator/tests/node-runner.js';
const DECLARATION = 'const SOURCE_FILES = [';
const LIST_BODY = /^\s*(?:'[^'\\\r\n]+'\s*,\s*)*(?:'[^'\\\r\n]+'\s*)?$/;

/** The ordered SOURCE_FILES of the runner text. Anything but quoted paths and commas inside the array fails. */
function parseSourceList(runnerText) {
  const first = runnerText.indexOf(DECLARATION);
  if (first < 0) throw new HarnessError('source-list', 'no SOURCE_FILES declaration in the runner');
  if (runnerText.indexOf(DECLARATION, first + 1) >= 0) {
    throw new HarnessError('source-list', 'more than one SOURCE_FILES declaration in the runner');
  }
  const start = first + DECLARATION.length;
  const end = runnerText.indexOf('];', start);
  if (end < 0) throw new HarnessError('source-list', 'the SOURCE_FILES array is not closed');
  const inner = runnerText.slice(start, end);
  if (!LIST_BODY.test(inner)) {
    throw new HarnessError('source-list', 'the SOURCE_FILES array holds something but quoted paths');
  }
  const files = (inner.match(/'[^']+'/g) || []).map(function (s) { return s.slice(1, -1); });
  if (files.length === 0) throw new HarnessError('source-list', 'the SOURCE_FILES array is empty');
  if (new Set(files).size !== files.length) throw new HarnessError('source-list', 'a source is listed twice');
  files.forEach(function (rel) {
    if (path.isAbsolute(rel) || rel.indexOf('\\') >= 0 || rel.indexOf('\0') >= 0) {
      throw new HarnessError('source-list', 'not a relative forward-slash path: ' + rel);
    }
  });
  return files;
}

/** Each listed source resolved inside the worktree (lexically and through links); missing or escaping: fail. */
function resolveSources(files, options) {
  const repoRoot = path.resolve(options.repoRoot);
  const generatorDir = options.generatorDir || path.join(repoRoot, 'generator');
  const io = options.io || nodeIo;
  const realRoot = io.realpath(repoRoot);
  return files.map(function (rel) {
    const abs = path.resolve(generatorDir, rel);
    if (!C.isInside(repoRoot, abs)) throw new HarnessError('source-escape', 'source escapes the worktree: ' + rel);
    if (!io.isFile(abs)) throw new HarnessError('source-missing', 'listed source does not exist: ' + rel);
    const real = io.realpath(abs);
    if (!C.isInside(realRoot, real)) {
      throw new HarnessError('source-escape', 'source resolves outside the worktree: ' + rel);
    }
    return { rel: rel, abs: abs, real: real };
  });
}

/** The bytes of every source, hashed as they are (a BOM is only stripped from the text that runs). */
function readSourceEntries(resolved, io) {
  const reader = io || nodeIo;
  return resolved.map(function (s) {
    const bytes = reader.readFile(s.abs);
    return {
      rel: s.rel,
      abs: s.abs,
      bytes: bytes.length,
      sha256: C.sha256(bytes),
      text: bytes.toString('utf8').replace(/^\uFEFF/, '')
    };
  });
}

/** Ordered runtime fingerprint: the listed order and the hash of each file's bytes. */
function runtimeFingerprint(entries) {
  return C.sha256(entries.map(function (e) { return e.rel + '\0' + e.sha256 + '\n'; }).join(''));
}

function loadSourceSet(options) {
  const repoRoot = path.resolve(options.repoRoot || C.DEFAULT_REPO_ROOT);
  const io = options.io || nodeIo;
  const runnerAbs = path.join(repoRoot, ...RUNNER_REL.split('/'));
  if (!io.isFile(runnerAbs)) throw new HarnessError('source-missing', 'the runner is missing: ' + RUNNER_REL);
  const runnerBytes = io.readFile(runnerAbs);
  const files = parseSourceList(runnerBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const entries = readSourceEntries(resolveSources(files, { repoRoot: repoRoot, io: io }), io);
  return {
    repoRoot: repoRoot,
    runnerSha256: C.sha256(runnerBytes),
    files: entries,
    fingerprint: runtimeFingerprint(entries)
  };
}

/** The identity of a source set without the text, as it goes into a record. */
function describeSourceSet(set) {
  return {
    runner: RUNNER_REL,
    runnerSha256: set.runnerSha256,
    runtimeFingerprint: set.fingerprint,
    count: set.files.length,
    files: set.files.map(function (e) { return { rel: e.rel, bytes: e.bytes, sha256: e.sha256 }; })
  };
}

/** A changed, added or removed input invalidates the comparison. */
function compareSourceSets(before, after) {
  const a = new Map(before.files.map(function (e) { return [e.rel, e.sha256]; }));
  const b = new Map(after.files.map(function (e) { return [e.rel, e.sha256]; }));
  const changed = [];
  a.forEach(function (hash, rel) {
    if (b.has(rel) && b.get(rel) !== hash) changed.push(rel);
  });
  const removed = Array.from(a.keys()).filter(function (rel) { return !b.has(rel); });
  const added = Array.from(b.keys()).filter(function (rel) { return !a.has(rel); });
  const sameOrder = before.files.map(function (e) { return e.rel; }).join('\n') ===
    after.files.map(function (e) { return e.rel; }).join('\n');
  return {
    stable: changed.length === 0 && removed.length === 0 && added.length === 0 && sameOrder &&
      before.fingerprint === after.fingerprint,
    changed: changed, removed: removed, added: added, sameOrder: sameOrder
  };
}

// --- private transforms ---------------------------------------------------------------------------------------

const FUNCTION_HEADER = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrences(text, needle) {
  let count = 0;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length)) count++;
  return count;
}

function validateTransformShape(t) {
  const ok = t !== null && typeof t === 'object' && typeof t.id === 'string' && /^[a-z0-9][A-Za-z0-9._-]*$/.test(t.id) &&
    typeof t.file === 'string' && t.file !== '' && typeof t.anchor === 'string' && t.anchor.trim() !== '' &&
    (t.position === 'before' || t.position === 'bodyStart') && typeof t.code === 'string' && t.code.trim() !== '';
  if (!ok) throw new HarnessError('transform-shape', 'malformed transform ' + (t && t.id ? t.id : '?'));
}

/**
 * One transform on one source text. The anchor must be a function header that occurs exactly once, the function
 * name must be declared once and the anchor must start its line: no line numbers, no silent fallback. The patched
 * text must still compile. Returns the new text and the record with the before/after hashes.
 */
function applyTransform(entry, text, t) {
  validateTransformShape(t);
  const header = FUNCTION_HEADER.exec(t.anchor.trim());
  if (!header) throw new HarnessError('anchor-not-function', 'the anchor is not a function header: ' + t.id);
  const count = countOccurrences(text, t.anchor);
  if (count === 0) throw new HarnessError('anchor-missing', 'anchor not found in ' + entry.rel + ': ' + t.id);
  if (count > 1) {
    throw new HarnessError('anchor-ambiguous', 'anchor occurs ' + count + ' times in ' + entry.rel + ': ' + t.id);
  }
  const declared = (text.match(new RegExp('function\\s*\\*?\\s*' + escapeRegExp(header[1]) + '\\s*\\(', 'g')) || [])
    .length;
  if (declared !== 1) {
    throw new HarnessError('anchor-ambiguous', 'function ' + header[1] + ' is declared ' + declared + ' times in ' +
      entry.rel + ': ' + t.id);
  }
  const at = text.indexOf(t.anchor);
  const lineStart = text.lastIndexOf('\n', at - 1) + 1;
  const indent = text.slice(lineStart, at);
  if (indent.trim() !== '') {
    throw new HarnessError('anchor-position', 'the anchor does not start its line in ' + entry.rel + ': ' + t.id);
  }
  const eol = text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  let patched;
  if (t.position === 'before') {
    const lines = t.code.split(/\r?\n/).map(function (line) { return indent + line; }).join(eol);
    patched = text.slice(0, lineStart) + lines + eol + text.slice(lineStart);
  } else {
    if (!t.anchor.trimEnd().endsWith('{')) {
      throw new HarnessError('anchor-position', 'a bodyStart anchor must end with "{": ' + t.id);
    }
    const end = at + t.anchor.length;
    const lines = t.code.split(/\r?\n/).map(function (line) { return indent + '  ' + line; }).join(eol);
    patched = text.slice(0, end) + eol + lines + text.slice(end);
  }
  try {
    new vm.Script(patched, { filename: entry.abs + '#' + t.id });
  } catch (err) {
    throw new HarnessError('transform-syntax', 'patched source does not compile (' + t.id + '): ' + err.message);
  }
  return {
    text: patched,
    record: {
      id: t.id,
      file: entry.rel,
      anchor: t.anchor.trim(),
      position: t.position,
      functionName: header[1],
      anchorOffset: at,
      transformHash: C.digestOf(t),
      beforeTextHash: C.sha256(Buffer.from(text, 'utf8')),
      afterTextHash: C.sha256(Buffer.from(patched, 'utf8'))
    }
  };
}

/**
 * The scripts to run, in the listed order: the unmodified text or the text of the adapters' transforms applied one
 * after another. Never touches a file.
 */
function buildLoadPlan(set, adapters) {
  const texts = new Map(set.files.map(function (e) { return [e.rel, e.text]; }));
  const byRel = new Map(set.files.map(function (e) { return [e.rel, e]; }));
  const records = [];
  const seen = new Set();
  (adapters || []).forEach(function (adapter) {
    (adapter.transforms || []).forEach(function (t) {
      validateTransformShape(t);
      if (seen.has(t.id)) throw new HarnessError('transform-duplicate', 'transform id used twice: ' + t.id);
      seen.add(t.id);
      if (!byRel.has(t.file)) throw new HarnessError('transform-file', 'transform file is not a listed source: ' + t.file);
      const out = applyTransform(byRel.get(t.file), texts.get(t.file), t);
      texts.set(t.file, out.text);
      records.push(Object.assign({ adapterId: adapter.id }, out.record));
    });
  });
  return {
    fingerprint: set.fingerprint,
    adapterIds: (adapters || []).map(function (a) { return a.id; }),
    adapterHashes: (adapters || []).map(function (a) { return C.digestOf(a); }),
    transforms: records,
    items: set.files.map(function (e) {
      const code = texts.get(e.rel);
      return {
        rel: e.rel,
        abs: e.abs,
        code: code,
        patched: code !== e.text,
        beforeHash: e.sha256,
        afterHash: code === e.text ? e.sha256 : C.sha256(Buffer.from(code, 'utf8'))
      };
    })
  };
}

function describePlan(plan) {
  return {
    runtimeFingerprint: plan.fingerprint,
    adapterIds: plan.adapterIds,
    adapterHashes: plan.adapterHashes,
    transforms: plan.transforms,
    patchedFiles: plan.items.filter(function (i) { return i.patched; }).map(function (i) {
      return { rel: i.rel, beforeHash: i.beforeHash, afterHash: i.afterHash };
    })
  };
}

/** A private copy of a patched source for inspection: only under the harness folder, never over an origin. */
function writePrivateCopy(repoRoot, set, item, destAbs) {
  const full = C.assertAuthorised(repoRoot, destAbs);
  if (!C.isInside(path.join(repoRoot, ...C.HARNESS_REL.split('/')), full)) {
    throw new HarnessError('path-unauthorised', 'a private copy belongs under the harness folder: ' + full);
  }
  if (set.files.some(function (e) { return path.resolve(e.abs) === full; })) {
    throw new HarnessError('path-unauthorised', 'a private copy never replaces its origin: ' + full);
  }
  return C.writeTextExclusive(repoRoot, full, item.code);
}

// Adapters are named sets of transforms. The built-in no-op exposure hook publishes one internal function and
// changes nothing else, so its output must equal the native one. Later tasks add `adapters/<id>.cjs`, loaded lazily.
const NOOP_EXPOSE = Object.freeze({
  id: 'noop-expose',
  version: 1,
  description: 'Exposes pipeline.normalizeConfig as SG.__igHooks.normalizeConfig; no behaviour change.',
  transforms: Object.freeze([Object.freeze({
    id: 'noop-expose.pipeline.normalizeConfig',
    file: 'js/engine/pipeline.js',
    anchor: 'function normalizeConfig(config) {',
    position: 'before',
    code: '(SG.__igHooks = SG.__igHooks || {}).normalizeConfig = normalizeConfig;'
  })])
});

const BUILTIN_ADAPTERS = { 'noop-expose': NOOP_EXPOSE };

function getAdapter(id) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new HarnessError('adapter-unknown', 'bad adapter id: ' + String(id));
  }
  if (Object.prototype.hasOwnProperty.call(BUILTIN_ADAPTERS, id)) return BUILTIN_ADAPTERS[id];
  const file = path.join(C.HARNESS_DIR, 'adapters', id + '.cjs');
  if (!fs.existsSync(file)) throw new HarnessError('adapter-unknown', 'no adapter ' + id);
  const adapter = require(file);
  if (!adapter || adapter.id !== id || !Array.isArray(adapter.transforms)) {
    throw new HarnessError('adapter-shape', 'adapter ' + id + ' does not export { id, transforms }');
  }
  return adapter;
}

/** What a worker does before it is ready: read, verify the expected fingerprint, transform (if any). */
function prepareLoad(options) {
  const set = loadSourceSet({ repoRoot: options.repoRoot, io: options.io });
  if (options.expectedFingerprint && set.fingerprint !== options.expectedFingerprint) {
    throw new HarnessError('source-changed', 'the sources differ from the fingerprint the host recorded');
  }
  const adapters = (options.adapterIds || []).map(getAdapter);
  return { set: set, plan: buildLoadPlan(set, adapters) };
}

/** Runs the scripts of a plan in order. Unmodified scripts keep their own path as the file name, like the runner. */
function executePlan(plan, runScript) {
  plan.items.forEach(function (item) {
    runScript(item.code, item.patched ? item.abs + '#ig-patched' : item.abs);
  });
}

function runInThisContext(code, filename) {
  return vm.runInThisContext(code, { filename: filename });
}

// --- read-only production / fixture firewall ----------------------------------------------------------------

const FIREWALL = Object.freeze({
  excluded: Object.freeze([C.HARNESS_REL, C.EVIDENCE_REL]),
  skipNames: Object.freeze(['.git', 'node_modules']),
  statOnlyUnder: 'docs/',
  hashedUnder: Object.freeze(['docs/improve-generating'])
});

function isStatOnly(rel) {
  return rel.startsWith(FIREWALL.statOnlyUnder) && !FIREWALL.hashedUnder.some(function (h) {
    return rel === h || rel.startsWith(h + '/');
  });
}

/**
 * Inventory of everything outside the harness and evidence folders: SHA-256 of every file, except the large
 * documentation tree (docs/ besides docs/improve-generating), which is inventoried by size and mtime only.
 */
function takeFirewall(options) {
  const repoRoot = path.resolve(options.repoRoot || C.DEFAULT_REPO_ROOT);
  const io = options.io || nodeIo;
  const entries = new Map();
  const walk = function (relDir) {
    io.readdir(relDir === '' ? repoRoot : path.join(repoRoot, ...relDir.split('/'))).forEach(function (d) {
      if (FIREWALL.skipNames.indexOf(d.name) >= 0) return;
      const rel = relDir === '' ? d.name : relDir + '/' + d.name;
      if (FIREWALL.excluded.indexOf(rel) >= 0) return;
      if (d.isDirectory) {
        walk(rel);
      } else if (d.isFile) {
        const abs = path.join(repoRoot, ...rel.split('/'));
        if (isStatOnly(rel)) {
          const st = io.stat(abs);
          entries.set(rel, { size: st.size, mtimeMs: Math.round(st.mtimeMs), sha256: null });
        } else {
          const bytes = io.readFile(abs);
          entries.set(rel, { size: bytes.length, mtimeMs: null, sha256: C.sha256(bytes) });
        }
      }
    });
  };
  walk('');
  const keys = Array.from(entries.keys()).sort();
  const groups = {};
  keys.forEach(function (rel) {
    const top = rel.indexOf('/') < 0 ? '(root files)' : rel.slice(0, rel.indexOf('/'));
    const e = entries.get(rel);
    if (!groups[top]) groups[top] = { files: 0, items: [] };
    groups[top].files++;
    groups[top].items.push([rel, e.size, e.sha256, e.mtimeMs]);
  });
  const groupSummary = {};
  Object.keys(groups).sort().forEach(function (top) {
    groupSummary[top] = { files: groups[top].files, digest: C.digestOf(groups[top].items) };
  });
  const hashed = {};
  keys.forEach(function (rel) {
    const e = entries.get(rel);
    if (e.sha256 !== null) hashed[rel] = { size: e.size, sha256: e.sha256 };
  });
  return {
    entries: entries,
    snapshot: {
      schema: C.SCHEMA,
      takenAt: C.isoNow(),
      excluded: FIREWALL.excluded.slice(),
      statOnlyTree: FIREWALL.statOnlyUnder + ' (except ' + FIREWALL.hashedUnder.join(', ') + ')',
      files: keys.length,
      hashedFiles: Object.keys(hashed).length,
      statOnlyFiles: keys.length - Object.keys(hashed).length,
      treeDigest: C.digestOf(groupSummary),
      groups: groupSummary,
      hashedEntries: hashed
    }
  };
}

function diffFirewall(before, after) {
  const added = [];
  const removed = [];
  const changed = [];
  before.entries.forEach(function (e, rel) {
    const other = after.entries.get(rel);
    if (!other) removed.push(rel);
    else if (other.size !== e.size || other.sha256 !== e.sha256 || other.mtimeMs !== e.mtimeMs) changed.push(rel);
  });
  after.entries.forEach(function (_e, rel) {
    if (!before.entries.has(rel)) added.push(rel);
  });
  return { clean: added.length + removed.length + changed.length === 0, added: added, removed: removed, changed: changed };
}

module.exports = {
  nodeIo, memoryIo, RUNNER_REL, parseSourceList, resolveSources, readSourceEntries, runtimeFingerprint,
  loadSourceSet, describeSourceSet, compareSourceSets, applyTransform, validateTransformShape, buildLoadPlan,
  describePlan, writePrivateCopy, NOOP_EXPOSE, getAdapter, prepareLoad, executePlan, runInThisContext,
  takeFirewall, diffFirewall, FIREWALL
};
