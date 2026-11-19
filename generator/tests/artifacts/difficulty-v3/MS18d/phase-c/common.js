'use strict';

/*
 * MS18d Phase C0 task-owned: small shared helpers of the Phase C transport (record writing and strict time
 * parsing). Nothing here starts a process or reads the clock for a decision.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(Z|[+-]\d{2}:\d{2})$/;

/**
 * An ISO-8601 instant with an explicit zone ("2026-11-19T11:44:03.013+07:00", "...Z") as epoch milliseconds
 * (the fraction is truncated to milliseconds), else null. Anything that is not exactly that, or that is not a
 * real calendar instant, is null: a time that cannot be proved is never guessed.
 */
function parseIsoMs(text) {
  if (typeof text !== 'string') return null;
  const m = ISO.exec(text);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, frac, zone] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);
  let offset = 0;
  if (zone !== 'Z') {
    const hh = Number(zone.slice(1, 3));
    const mm = Number(zone.slice(4, 6));
    if (hh > 23 || mm > 59) return null;
    offset = (zone[0] === '-' ? -1 : 1) * (hh * 60 + mm) * 60000;
  }
  const ms = Number(((frac || '') + '000').slice(0, 3));
  const utc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const back = new Date(utc);
  if (back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day ||
    back.getUTCHours() !== hour || back.getUTCMinutes() !== minute || back.getUTCSeconds() !== second) {
    return null;
  }
  return utc - offset;
}

const isoZ = (ms) => new Date(ms).toISOString();

const CRLF = (text) => String(text).replace(/\r?\n/g, '\r\n');

/** One JSON line (CRLF) appended and flushed to disk: a record that survives a kill right after the call. */
function appendJsonl(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'a');
  try {
    fs.writeSync(fd, JSON.stringify(value) + '\r\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/** A new JSON file (pretty, CRLF), created exclusively and flushed: an earlier record is kept. */
function writeJsonExclusive(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'wx');
  try {
    fs.writeSync(fd, CRLF(JSON.stringify(value, null, 2)) + '\r\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/** The non-blank lines of a JSON-lines file: { entries: [{ line, value }], problems: [text] }. */
function readJsonl(file) {
  const entries = [];
  const problems = [];
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  text.split(/\r?\n/).forEach((raw, i) => {
    if (raw.trim() === '') return;
    try {
      entries.push({ line: i + 1, value: JSON.parse(raw) });
    } catch (err) {
      problems.push(path.basename(file) + ':' + (i + 1) + ': not JSON');
    }
  });
  return { entries, problems };
}

/**
 * The frozen files of earlier phases that the Phase C helpers read or run, repo-relative with backslashes.
 * They are listed in the helper manifest next to the Phase C helpers, so that one hash check covers every
 * byte in use.
 */
const REFERENCED_FROZEN = [
  'generator\\tests\\artifacts\\difficulty-v3\\MS18d\\project-gp.js',
  'generator\\tests\\artifacts\\difficulty-v3\\MS18d\\phase-b\\append-writer.js',
  'generator\\tests\\artifacts\\difficulty-v3\\MS18d\\phase-b\\tee-append.js',
  'generator\\tests\\artifacts\\difficulty-v3\\MS18d\\phase-b\\fake-child.js',
  'generator\\tests\\artifacts\\difficulty-v3\\MS18c\\invoke-dv3node.ps1',
  'docs\\difficulty-v3\\evidence\\MS18d\\phase-b\\targets-frozen-final.json'
];

/**
 * The frozen chunk manifest (R24): listed in the helper manifest with the helpers, because every recorder and
 * merge run reads it and the real wrapper requires it there. It is an input of the campaign, not a helper.
 */
const FROZEN_PLAN = [
  'docs\\difficulty-v3\\evidence\\MS18d\\phase-c\\gp-chunk-manifest.json'
];

/** The machine facts of the Phase A preflight: CPU model, logical processors, memory (GB), platform. */
function machineFacts() {
  const os = require('os');
  const cpus = os.cpus();
  return {
    cpu: cpus.length > 0 ? cpus[0].model.trim() : 'unknown', logicalProcessors: cpus.length,
    memoryGb: Math.round(os.totalmem() / 1073741824), platform: os.platform() + ' ' + os.release()
  };
}

module.exports = { sha256, parseIsoMs, isoZ, CRLF, appendJsonl, writeJsonExclusive, readJsonl,
  REFERENCED_FROZEN, FROZEN_PLAN, machineFacts };
