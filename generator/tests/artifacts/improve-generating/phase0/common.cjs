'use strict';

/*
 * Shared helpers of the improve-generating phase-0 harness (H): constants, hashing, canonical JSON, the text and
 * JSON writers and the path rules. Evidence is provisional (pre-freeze) unless a frozen round says otherwise.
 * No git, no temporary-directory file, no network.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCHEMA = 'ig-s-phase0/1';
const EVIDENCE_PROVISIONAL = 'provisional (pre-freeze)';
const EVIDENCE_FROZEN = 'frozen-confirmatory';
const ROUND_FROZEN = 'frozen-gate';
const HARNESS_REL = 'generator/tests/artifacts/improve-generating/phase0';
const EVIDENCE_REL = 'docs/improve-generating/evidence/phase0';
const HARNESS_DIR = __dirname;
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

// Research safety guards, not the 10/30 s qualification or the 120 s application guard. graceMs is what the
// supplied wrapper's quiet admission is charged per invocation; finalizeReserveMs is what the host keeps below its
// deadline to terminate workers and write the last observation before the wrapper's 300 s backstop.
const GUARDS = Object.freeze({
  commandMs: 270000,
  requestMs: 180000,
  sampleMs: 45000,
  jigsawMs: 240000,
  validationMs: 60000,
  wrapperLimitMs: 300000,
  graceMs: 45000,
  finalizeReserveMs: 8000,
  startMarginMs: 2000,
  minWindowMs: 15000
});

class HarnessError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'HarnessError';
    this.code = code;
    this.details = details === undefined ? null : details;
  }
}

// Failures that mean "this source or plan is not supported": exit 2 and stop for the author.
const UNSUPPORTED_CODES = new Set([
  'source-list', 'source-missing', 'source-escape', 'anchor-missing', 'anchor-ambiguous', 'anchor-not-function',
  'anchor-position', 'transform-shape', 'transform-syntax', 'transform-duplicate', 'transform-file',
  'adapter-unknown', 'adapter-shape', 'capability-missing', 'plan-missing', 'unsupported-source',
  'frozen-receipt-missing', 'frozen-receipt-invalid', 'frozen-runtime-mismatch', 'frozen-catalogue-mismatch'
]);

function exitCodeOf(err) {
  return err instanceof HarnessError && UNSUPPORTED_CODES.has(err.code) ? 2 : 1;
}

const clockBase = process.hrtime.bigint();

/** Monotonic milliseconds since this module was loaded (sub-microsecond resolution, no epoch drift). */
function nowMs() {
  return Number(process.hrtime.bigint() - clockBase) / 1e6;
}

function isoNow() {
  return new Date().toISOString();
}

/** Milliseconds since this process started (the origin the wrapper's 300 s backstop is counted from). */
function processAgeMs() {
  return performance.now();
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Plain, key-sorted data: typed arrays become arrays, non-finite numbers become tagged strings and undefined is
// dropped from objects (null in arrays), so the same value always has the same text.
function canonicalize(value) {
  if (value === null) return null;
  switch (typeof value) {
    case 'undefined': case 'function': case 'symbol':
      return undefined;
    case 'number':
      return Number.isFinite(value) ? value : { $number: String(value) };
    case 'bigint':
      return { $bigint: value.toString() };
    case 'object':
      break;
    default:
      return value;
  }
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (Array.isArray(value)) {
    return value.map(function (item) {
      const plain = canonicalize(item);
      return plain === undefined ? null : plain;
    });
  }
  const out = {};
  Object.keys(value).sort().forEach(function (key) {
    const plain = canonicalize(value[key]);
    if (plain !== undefined) out[key] = plain;
  });
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function digestOf(value) {
  return sha256(canonicalJson(value));
}

/** CRLF, no BOM, no trailing whitespace, exactly one final newline. */
function normaliseText(text) {
  let t = String(text).replace(/^\uFEFF/, '').replace(/\r\n|\r|\n/g, '\n');
  t = t.split('\n').map(function (line) { return line.replace(/[ \t]+$/, ''); }).join('\n');
  return (t.replace(/\n+$/, '') + '\n').replace(/\n/g, '\r\n');
}

function jsonText(value) {
  return normaliseText(JSON.stringify(value, null, 2));
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

function isInsideOrSame(parent, child) {
  return path.resolve(parent) === path.resolve(child) || isInside(parent, child);
}

function toPosix(rel) {
  return rel.split(path.sep).join('/');
}

function authorisedRoots(repoRoot) {
  return [path.join(repoRoot, ...HARNESS_REL.split('/')), path.join(repoRoot, ...EVIDENCE_REL.split('/'))];
}

/** Every write goes through this: only the harness folder and the phase-0 evidence folder are writable. */
function assertAuthorised(repoRoot, abs) {
  const full = path.resolve(abs);
  if (!authorisedRoots(repoRoot).some(function (root) { return isInsideOrSame(root, full); })) {
    throw new HarnessError('path-unauthorised', 'write outside the authorised harness/evidence folders: ' + full);
  }
  return full;
}

function ensureDir(repoRoot, dir) {
  const full = assertAuthorised(repoRoot, dir);
  fs.mkdirSync(full, { recursive: true });
  return full;
}

function writeTextExclusive(repoRoot, abs, text) {
  const full = assertAuthorised(repoRoot, abs);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  try {
    fs.writeFileSync(full, normaliseText(text), { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    if (err && err.code === 'EEXIST') throw new HarnessError('output-exists', 'output already exists: ' + full);
    throw err;
  }
  return full;
}

/**
 * Atomic JSON: a sibling `.partial` file, then a rename. A final file is immutable: writing it twice fails
 * unless `overwrite` is set (only for explicitly mutable files such as a ledger).
 */
function writeJsonAtomic(repoRoot, abs, value, options) {
  const full = assertAuthorised(repoRoot, abs);
  const overwrite = !!(options && options.overwrite);
  if (!overwrite && fs.existsSync(full)) throw new HarnessError('output-exists', 'output already exists: ' + full);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const text = jsonText(value);
  const partial = full + '.partial';
  fs.writeFileSync(partial, text, { encoding: 'utf8', flag: 'w' });
  fs.renameSync(partial, full);
  return sha256(text);
}

/** One durable JSON line (CRLF) for the journal: opened, written, flushed to disk and closed each time. */
function appendJsonl(repoRoot, abs, value) {
  const full = assertAuthorised(repoRoot, abs);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const fd = fs.openSync(full, 'a');
  try {
    fs.writeSync(fd, JSON.stringify(value) + '\r\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function readJsonl(abs) {
  if (!fs.existsSync(abs)) return [];
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/).filter(function (line) { return line !== ''; });
  return lines.map(function (line, i) {
    try {
      return JSON.parse(line);
    } catch (err) {
      throw new HarnessError('journal-corrupt', 'journal line ' + (i + 1) + ' is not JSON: ' + abs);
    }
  });
}

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
}

/** Source fingerprint of the harness itself: its own scripts (and adapters), by content. */
function harnessFingerprint(dir) {
  const base = dir || HARNESS_DIR;
  const files = [];
  const add = function (folder, prefix) {
    if (!fs.existsSync(folder)) return;
    fs.readdirSync(folder).sort().forEach(function (name) {
      const full = path.join(folder, name);
      if (/\.(cjs|ps1)$/.test(name) && fs.statSync(full).isFile()) {
        files.push({ file: prefix + name, sha256: sha256(fs.readFileSync(full)) });
      }
    });
  };
  add(base, '');
  add(path.join(base, 'adapters'), 'adapters/');
  add(path.join(base, 'plans'), 'plans/');
  return { fingerprint: digestOf(files), files: files };
}

/** True when a value (deep) holds a key with this name: how test-only settings are kept out of manifests. */
function hasKeyDeep(value, key) {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(function (item) { return hasKeyDeep(item, key); });
  return Object.keys(value).some(function (k) { return k === key || hasKeyDeep(value[k], key); });
}

module.exports = {
  SCHEMA, EVIDENCE_PROVISIONAL, EVIDENCE_FROZEN, ROUND_FROZEN, HARNESS_REL, EVIDENCE_REL, HARNESS_DIR,
  DEFAULT_REPO_ROOT, GUARDS, HarnessError, exitCodeOf, nowMs, isoNow, processAgeMs, sha256, canonicalize,
  canonicalJson,
  digestOf, normaliseText, jsonText, isInside, isInsideOrSame, toPosix, authorisedRoots, assertAuthorised,
  ensureDir, writeTextExclusive, writeJsonAtomic, appendJsonl, readJsonl, readJson, harnessFingerprint,
  hasKeyDeep
};
