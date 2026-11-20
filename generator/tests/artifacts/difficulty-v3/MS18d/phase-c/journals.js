'use strict';

/*
 * MS18d Phase C1 task-owned (pack section "C1 readiness, hold rulings and host rebinding"): the READERS of
 * the two committed, append-only operational journals the orchestrator alone appends and commits after SA2
 * rules and SA1 concurs:
 *
 *   tasks/difficulty-v3/MS18d-gp-rulings.jsonl         F3 hold rulings, one {chunkId, heldRunId,
 *                                                       allowAttempt: 2, ref, at} per line;
 *   tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl   the host-binding journal, one {bindingId, replaces,
 *                                                       host: {pid, dotNetStartTime,
 *                                                       cimCreationDateUtcMicroseconds, parentPid,
 *                                                       executablePath}, observedAt, evidence, ref, at}
 *                                                       per line, the first with replaces null, each later
 *                                                       one naming the exact prior bindingId.
 *
 * Only the COMMITTED journal at the admitted HEAD is read (`git show <ref>:<path>`): the working file, an
 * uncommitted line, a malformed or contradictory line or a journal that does not keep the version
 * committed at the campaign base B as an exact line prefix is not authority. An empty or invalid
 * host-binding journal means NO host binding is configured: nothing falls back to a PID that was approved
 * earlier. ProcessName never takes part in any match. `evidence` is `{ file, sha256 }`: the pack-owned
 * bounded observation tasks/difficulty-v3/MS18d-gp-host-evidence/<bindingId>.json and the SHA-256 of its
 * text with LF line ends (the committed blob and a CRLF working copy then agree).
 *
 * Pure but for `git`, a reader the caller supplies (args -> text, throwing on a failure), so the real tree
 * and the stand-ins use the same code. Nothing here writes anything.
 */
const { sha256, parseIsoMs } = require('./common.js');

const BINDINGS_REL = 'tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl';
const RULINGS_REL = 'tasks/difficulty-v3/MS18d-gp-rulings.jsonl';
const EVIDENCE_DIR = 'tasks/difficulty-v3/MS18d-gp-host-evidence/';

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const NET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}(Z|[+-]\d{2}:\d{2})$/;
const CIM_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const HEX64 = /^[0-9a-f]{64}$/;
const isInt = (v) => Number.isInteger(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

/** The non-blank lines of a journal, CR removed. */
const linesOf = (text) => String(text).replace(/^\uFEFF/, '').split('\n').map((l) => l.replace(/\r$/, ''))
  .filter((l) => l.trim() !== '');

/** SHA-256 of the lines, each ended by LF: the digest a record cites (CRLF/LF agnostic). */
const digestLines = (lines) => sha256(lines.length === 0 ? '' : lines.join('\n') + '\n');

/** SHA-256 of a text with CRLF read as LF (the evidence digest convention). */
const normalizedSha256 = (text) => sha256(String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));

/** True when `base` lines are exactly the first lines of `head`. */
const isLinePrefix = (base, head) => base.length <= head.length && base.every((l, i) => l === head[i]);

/**
 * An ISO instant with at most seven fraction digits and an explicit zone, as UTC with seven digits
 * ("2026-11-13T12:26:33.6916441Z"), else null: the .NET start time is compared at its 100 ns resolution.
 */
function utcTicks7(text) {
  const ms = parseIsoMs(text);
  if (ms === null) return null;
  const m = /\.(\d{1,7})(?:Z|[+-]\d{2}:\d{2})$/.exec(text);
  const frac = ((m ? m[1] : '') + '0000000').slice(0, 7);
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().slice(0, 19) + '.' + frac + 'Z';
}

/** The tuple readiness compares a live process with, from a journal entry. */
function bindingTuple(entry) {
  return { bindingId: entry.bindingId, pid: entry.host.pid, parentPid: entry.host.parentPid,
    netStartUtc: utcTicks7(entry.host.dotNetStartTime),
    cimCreationUtc: entry.host.cimCreationDateUtcMicroseconds, exePath: entry.host.executablePath };
}

/** Problems of one host-binding line (shape only). */
function entryProblems(e) {
  const p = [];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return ['not an object'];
  const keys = ['bindingId', 'replaces', 'host', 'observedAt', 'evidence', 'ref', 'at'];
  Object.keys(e).forEach((k) => {
    if (keys.indexOf(k) === -1) p.push('unknown member ' + k);
  });
  if (!ID.test(String(e.bindingId))) p.push('bindingId');
  if (e.replaces !== null && !ID.test(String(e.replaces))) p.push('replaces');
  const h = e.host;
  if (!h || typeof h !== 'object') p.push('host');
  else {
    Object.keys(h).forEach((k) => {
      if (['pid', 'dotNetStartTime', 'cimCreationDateUtcMicroseconds', 'parentPid', 'executablePath',
        'processName'].indexOf(k) === -1) p.push('unknown host member ' + k);
    });
    if (!isInt(h.pid) || h.pid <= 4) p.push('host.pid');
    if (!isInt(h.parentPid) || h.parentPid < 0) p.push('host.parentPid');
    if (!NET_TIME.test(String(h.dotNetStartTime)) || utcTicks7(h.dotNetStartTime) === null) {
      p.push('host.dotNetStartTime (seven fraction digits and a zone)');
    }
    if (!CIM_TIME.test(String(h.cimCreationDateUtcMicroseconds)) ||
      utcTicks7(h.cimCreationDateUtcMicroseconds) === null) {
      p.push('host.cimCreationDateUtcMicroseconds (UTC, six fraction digits)');
    }
    if (!isText(h.executablePath)) p.push('host.executablePath');
  }
  if (parseIsoMs(e.observedAt) === null) p.push('observedAt (an instant with a zone)');
  if (parseIsoMs(e.at) === null) p.push('at (an instant with a zone)');
  else if (parseIsoMs(e.observedAt) !== null && parseIsoMs(e.at) < parseIsoMs(e.observedAt)) {
    p.push('at is before observedAt');
  }
  const ev = e.evidence;
  if (!ev || typeof ev !== 'object' || ev.file !== EVIDENCE_DIR + e.bindingId + '.json' ||
    !HEX64.test(String(ev.sha256))) {
    p.push('evidence ({ file: ' + EVIDENCE_DIR + '<bindingId>.json, sha256 })');
  }
  if (!isText(e.ref)) p.push('ref');
  return p;
}

/** The host-binding lines: { entries, problems }; the chain (first replaces null, then each prior id). */
function parseBindings(lines) {
  const entries = [];
  const problems = [];
  const seen = new Set();
  lines.forEach((raw, i) => {
    let e;
    try {
      e = JSON.parse(raw);
    } catch (err) {
      problems.push('binding line ' + (i + 1) + ' is not JSON');
      return;
    }
    const bad = entryProblems(e);
    if (bad.length > 0) {
      problems.push('binding line ' + (i + 1) + ': ' + bad.join(', '));
      return;
    }
    if (seen.has(e.bindingId)) problems.push('binding line ' + (i + 1) + ': the bindingId repeats');
    seen.add(e.bindingId);
    const prior = entries.length > 0 ? entries[entries.length - 1].bindingId : null;
    if (e.replaces !== prior) {
      problems.push('binding line ' + (i + 1) + ': replaces ' + e.replaces + ', the exact prior binding is ' +
        prior);
    }
    entries.push(e);
  });
  if (problems.length > 0) return { entries: [], problems };
  return { entries, problems };
}

/** The F3 ruling lines: { entries, problems } (a repeated chunk and held run is contradictory). */
function parseRulings(lines) {
  const entries = [];
  const problems = [];
  const seen = new Set();
  lines.forEach((raw, i) => {
    let v;
    try {
      v = JSON.parse(raw);
    } catch (err) {
      problems.push('ruling line ' + (i + 1) + ' is not JSON');
      return;
    }
    const keys = ['chunkId', 'heldRunId', 'allowAttempt', 'ref', 'at'];
    const ok = v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length &&
      keys.every((k) => k in v) && isText(v.chunkId) && isText(v.heldRunId) && v.allowAttempt === 2 &&
      isText(v.ref) && parseIsoMs(v.at) !== null;
    if (!ok) {
      problems.push('ruling line ' + (i + 1) + ' is not exactly {chunkId, heldRunId, allowAttempt: 2, ref, ' +
        'at (with a zone)}');
      return;
    }
    const id = v.chunkId + '\u0000' + v.heldRunId;
    if (seen.has(id)) problems.push('ruling line ' + (i + 1) + ' repeats ' + v.chunkId + ' ' + v.heldRunId);
    seen.add(id);
    entries.push(v);
  });
  if (problems.length > 0) return { entries: [], problems };
  return { entries, problems };
}

/** `git show <ref>:<rel>`: { present, text }; a path that is not in that commit is `present: false`. */
function readCommitted(git, ref, rel) {
  try {
    return { present: true, text: String(git(['show', ref + ':' + rel])) };
  } catch (err) {
    return { present: false, text: null };
  }
}

/**
 * One journal at the admitted HEAD, checked against the version committed at the campaign base. `input`:
 * { git, head, base | null, rel, parse }. Returns { rel, head, base, present, lines, sha256, baseSha256,
 * appendOnly, entries, problems }. A journal that is not tracked at HEAD, or that does not keep the base
 * version as an exact line prefix, has problems and no entries.
 */
function loadJournal(input) {
  const out = { rel: input.rel, head: input.head, base: input.base || null, present: false, lines: [],
    sha256: null, baseSha256: null, appendOnly: null, entries: [], problems: [] };
  const now = readCommitted(input.git, input.head, input.rel);
  if (!now.present) {
    out.problems.push(input.rel + ' is not committed at ' + input.head);
    return out;
  }
  out.present = true;
  out.lines = linesOf(now.text);
  out.sha256 = digestLines(out.lines);
  if (input.base) {
    const before = readCommitted(input.git, input.base, input.rel);
    if (!before.present) {
      out.appendOnly = false;
      out.problems.push(input.rel + ' is not committed at the campaign base ' + input.base);
    } else {
      const baseLines = linesOf(before.text);
      out.baseSha256 = digestLines(baseLines);
      out.appendOnly = isLinePrefix(baseLines, out.lines);
      if (!out.appendOnly) out.problems.push(input.rel + ' does not keep the version committed at the base');
    }
  }
  if (out.problems.length > 0) return out;
  const parsed = input.parse(out.lines);
  out.entries = parsed.entries;
  parsed.problems.forEach((p) => out.problems.push(p));
  return out;
}

/** The evidence of one binding entry at HEAD: committed, with the cited digest and JSON; [] if it holds. */
function evidenceProblems(git, head, entry) {
  const got = readCommitted(git, head, entry.evidence.file);
  if (!got.present) return [entry.evidence.file + ' is not committed at ' + head];
  if (normalizedSha256(got.text) !== entry.evidence.sha256) {
    return [entry.evidence.file + ' is not the cited bytes'];
  }
  try {
    JSON.parse(got.text.replace(/^\uFEFF/, ''));
  } catch (err) {
    return [entry.evidence.file + ' is not JSON'];
  }
  return [];
}

/**
 * The host binding in force: the LAST entry of the committed, valid, append-only journal whose evidence is
 * committed. { ok, current (entry) | null, expected (the tuple) | null, reference, problems }. `reference` is
 * what an admission records: the binding id, the tuple, the journal path, commit, entry count and digest (the
 * digest of every line at that commit, which a later version of the journal keeps as a line prefix), the base
 * version digest and the evidence reference.
 */
function hostBindingState(git, head, base) {
  const journal = loadJournal({ git, head, base, rel: BINDINGS_REL, parse: parseBindings });
  const state = { ok: false, current: null, expected: null, reference: null,
    problems: journal.problems.slice(), journal };
  if (state.problems.length === 0 && journal.entries.length === 0) {
    state.problems.push('the host-binding journal is empty: no host binding is configured');
  }
  if (state.problems.length > 0) return state;
  const current = journal.entries[journal.entries.length - 1];
  evidenceProblems(git, head, current).forEach((p) => state.problems.push(p));
  if (state.problems.length > 0) return state;
  state.ok = true;
  state.current = current;
  state.expected = bindingTuple(current);
  state.reference = { bindingId: current.bindingId, host: current.host, ref: current.ref,
    journal: { path: BINDINGS_REL, commit: head, baseCommit: base || null,
      entryCount: journal.entries.length, sha256: journal.sha256, baseSha256: journal.baseSha256 },
    evidence: { file: current.evidence.file, sha256: current.evidence.sha256, verified: true } };
  return state;
}

/** The committed rulings at HEAD: { ok, entries, journal, problems, reference }. */
function rulingsState(git, head, base) {
  const journal = loadJournal({ git, head, base, rel: RULINGS_REL, parse: parseRulings });
  return { ok: journal.problems.length === 0, entries: journal.entries, problems: journal.problems, journal,
    reference: { path: RULINGS_REL, commit: head, baseCommit: base || null,
      entryCount: journal.entries.length, sha256: journal.sha256, baseSha256: journal.baseSha256 } };
}

module.exports = { BINDINGS_REL, RULINGS_REL, EVIDENCE_DIR, linesOf, digestLines, normalizedSha256,
  isLinePrefix, utcTicks7, bindingTuple, entryProblems, parseBindings, parseRulings, readCommitted,
  loadJournal, evidenceProblems, hostBindingState, rulingsState };
