'use strict';

/*
 * MS18c Stage 3 task-owned shared helpers: paths of the task, SHA-256, the canonical JSON of the
 * records helper,
 * CRLF text and atomic / append-only writes (UTF-8, CRLF, a final line end, no trailing whitespace, so that
 * every record this task writes passes check-format.cjs), and the clock text. Nothing here decides anything.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const rules = require('./rules.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const GENERATOR = path.join(REPO, 'generator');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c');
const RUNS = path.join(EVIDENCE, 'runs');
const QUALIFICATION = path.join(EVIDENCE, 'qualification');
const MANIFEST_PATH = 'tasks/difficulty-v3/MS18c-gq-approved-ceilings.json';
const RECOVERY_DIR = 'tasks/difficulty-v3/MS18c-gq-recovery';
const NODE_PATH = 'C:\\Program Files\\nodejs\\node.exe';
const ZERO_HASH = '0'.repeat(64);

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const canon = rules.canon;

const BUSY_CODES = ['EBUSY', 'EPERM', 'EACCES'];
const sleeper = new Int32Array(new SharedArrayBuffer(4));
const sleepMs = (ms) => { if (ms > 0) Atomics.wait(sleeper, 0, 0, ms); };

/**
 * Runs `fn` and retries it, a bounded number of times, when the file is busy (another process holds it
 * without write sharing: EBUSY, EPERM, EACCES). Any other error, or the last busy one, is thrown.
 */
function withRetry(fn, options) {
  const o = Object.assign({ tries: 5, delayMs: 100, sleep: sleepMs }, options);
  for (let attempt = 1; ; attempt++) {
    try {
      return fn(attempt);
    } catch (err) {
      if (attempt >= o.tries || BUSY_CODES.indexOf(err && err.code) === -1) throw err;
      o.sleep(o.delayMs);
    }
  }
}

/** CRLF text of a value: pretty (2 spaces) or one compact line; always a final line end. */
function jsonText(value, pretty) {
  const text = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  return text.replace(/\r?\n/g, '\r\n') + '\r\n';
}

/** Puts a text in place whole: `<file>.part`, then a rename over the target (the latest-status writer). */
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const part = file + '.part';
  const fd = fs.openSync(part, 'w');
  try {
    fs.writeSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(part, file);
}

/** Creates a new file and refuses to overwrite an existing one (immutable records). */
function writeNew(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'wx');
  try {
    fs.writeSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/** Appends one line (CRLF) and flushes it to the disk before returning. */
function appendLine(file, line) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  withRetry(() => {
    const fd = fs.openSync(file, 'a');
    try {
      fs.writeSync(fd, line.replace(/[ \t]+$/, '') + '\r\n');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }, { tries: 5, delayMs: 100 });
}

const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);

/** The lines of a CRLF (or LF) text file, without empty ones. */
function readLines(file) {
  const text = readText(file);
  return text === null ? [] : text.split(/\r?\n/).filter((line) => line !== '');
}

/** An ISO instant in UTC with milliseconds, from a Date or a millisecond number. */
const isoUtc = (when) => new Date(when === undefined ? Date.now() : when).toISOString();

/** `variant/level` -> `variant-level` (the directory of a cell); only registered identifiers pass. */
function cellDirName(key) {
  const parts = String(key).split('/');
  if (parts.length !== 2 || rules.VARIANTS.indexOf(parts[0]) === -1 ||
      rules.LEVELS.indexOf(parts[1]) === -1) {
    throw new RangeError('cell ' + String(key) + ' is not a registered variant/level');
  }
  return parts[0] + '-' + parts[1];
}

/** The directory of one attempt of a cell: runs/<variant>-<level>/payload-N/admission-M. */
function attemptDir(key, slot, ordinal) {
  return path.join(RUNS, cellDirName(key), 'payload-' + slot, 'admission-' + ordinal);
}

const cellRunsDir = (key) => path.join(RUNS, cellDirName(key));

module.exports = {
  REPO, GENERATOR, EVIDENCE, RUNS, QUALIFICATION, MANIFEST_PATH, RECOVERY_DIR, NODE_PATH, ZERO_HASH, sha256,
  canon, jsonText, writeAtomic, writeNew, appendLine, readText, readLines, isoUtc, cellDirName, attemptDir,
  cellRunsDir, withRetry, sleepMs, BUSY_CODES
};
