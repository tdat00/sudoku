'use strict';

/*
 * MS18c Stage 3 task-owned manifest handling. `validateManifest` is PURE and re-derives everything
 * numeric from the agreed structural rule of rules.cjs (so an edited or inconsistent manifest is
 * refused, and the supervisor never takes an A/T/O from the developer); `loadManifest` adds the Git
 * authority check (the file must exist in HEAD and the working-tree bytes must hash to that exact
 * blob, `git diff --quiet` is only an extra); the payload builder produces the one argument vector
 * of a cell and refuses everything else.
 */
const fs = require('fs');
const path = require('path');
const rules = require('./rules.cjs');
const util = require('./util.cjs');
const gitro = require('./gitro.cjs');

const SCHEMA = 'MS18c-gq-approved-ceilings-v1';
const BASE = '42e0d239bc8b9b8bd66a2d868ccc8601d8b0d5e4';
const BINDING = 'joint-approved; staged release required';
const APPROVALS = ['MS18c-S2-SA1-20261118', 'MS18c-S2-SA2-20261118'];
const OWNER_DECISIONS = ['S-OD13', 'S-OD14'];
const HOST = Object.freeze({
  pid: 1968, parentPid: 18780, cimName: 'copilot.exe',
  executablePath: 'C:\\Users\\ledat\\AppData\\Local\\Microsoft\\WinGet\\Links\\copilot.exe',
  dotNetStartTime: '2026-11-13T19:26:33.6916441+07:00',
  cimCreationDateUtcMicroseconds: '2026-11-13T12:26:33.691644Z'
});

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** The problems of the manifest object (empty: it is consistent and equals the agreed rule). */
function validateManifest(m) {
  if (!isObject(m)) return ['the manifest is not an object'];
  const problems = [];
  const eq = (label, got, want) => {
    if (rules.canon(got) !== rules.canon(want)) {
      problems.push(label + ' is ' + JSON.stringify(got).slice(0, 80) + ', not ' +
        JSON.stringify(want).slice(0, 80));
    }
  };
  eq('schema', m.schema, SCHEMA);
  eq('binding', m.binding, BINDING);
  eq('method', m.method, rules.METHOD);
  eq('policy', m.policy, rules.POLICY);
  eq('base', m.base, BASE);
  if (typeof m.epoch !== 'string' || !/^MS18c-GQ-\d{8}-\d\d$/.test(m.epoch)) {
    problems.push('epoch is not an epoch id');
  }
  const approvals = Array.isArray(m.approvals) ? m.approvals.map((a) => a && a.id) : [];
  eq('approval references', approvals, APPROVALS);
  const owner = Array.isArray(m.ownerDecisions) ? m.ownerDecisions.map((d) => d && d.id) : [];
  eq('owner decisions', owner, OWNER_DECISIONS);
  const s14 = Array.isArray(m.ownerDecisions) ?
    m.ownerDecisions.filter((d) => d && d.id === 'S-OD14')[0] : null;
  if (!s14 || s14.individualRecoveryAuthorized !== false) {
    problems.push('S-OD14 must not authorize a recovery');
  }
  const c = m.constants;
  if (!isObject(c)) {
    problems.push('constants are missing');
  } else {
    eq('H', c.H, rules.ALLOWANCES.H);
    eq('D', c.D, rules.ALLOWANCES.D);
    eq('V', c.V, rules.ALLOWANCES.V);
    eq('epsilon', c.epsilon, rules.ALLOWANCES.epsilon);
    eq('G', c.G, rules.G);
    eq('outerExtra', c.outerExtra, rules.OUTER_EXTRA);
    eq('outer caps', c.outerCapsOnly, rules.OUTER_CAPS);
  }
  const mon = m.monitor;
  if (!isObject(mon) || mon.version !== 2 || mon.maxRequestMs !== rules.MAX_REQUEST_MS ||
      mon.clampResiduals !== false || mon.adjustRequestTimes !== false) {
    problems.push('monitor is not revision 2');
  }
  const adm = m.admission;
  if (!isObject(adm) || adm.policy !== rules.POLICY || adm.perPowerShellOrCimCallMaxSeconds !== 15 ||
      adm.cumulativePreQualifierMaxSeconds !== 45 || adm.reservedHSeconds !== 15 ||
      adm.ordinaryGapSeconds !== 15 || adm.eligibleReaskGapSeconds !== 60) {
    problems.push('admission caps are not the approved ones');
  }
  const h = m.host;
  if (!isObject(h)) {
    problems.push('host is missing');
  } else {
    Object.keys(HOST).forEach((k) => {
      const key = k === 'parentPid' ? 'parentPid' : k;
      if (h[key] !== HOST[k]) problems.push('host.' + key + ' is not the approved ' + HOST[k]);
    });
    if (h.ignoreDotNetProcessName !== true) problems.push('host must ignore the .NET ProcessName');
  }
  const p = m.protocol;
  if (!isObject(p) || p.jobs !== 4 || p.seedBase !== 20260601 || p.firstSeeds !== 40 || p.moreSeeds !== 60 ||
      p.guardMs !== 120000 || p.earlyStop !== 'default' || p.singleCell !== true || p.probe !== 0 ||
      p.explicitMaxAttempts !== false) problems.push('protocol is not the unchanged one');
  const rec = m.recovery;
  if (!isObject(rec) || rec.maxPayloadOpportunities !== 2 || rec.maxAdmissionsPerAuthorizedSlot !== 2 ||
      rec.reserveLaunchBeforeCreation !== true || rec.implicitCounterReset !== false) {
    problems.push('recovery contract is not the S-OD14 one');
  }
  const id = m.identities;
  if (!isObject(id) || !isObject(id.source) || !Array.isArray(id.source.files) ||
      id.source.files.length !== 46 ||
      !isObject(id.sourceSelector) || id.sourceSelector.entryCount !== 64 || !isObject(id.tool) ||
      !isObject(id.attemptPolicy) || !isObject(id.node) || !isObject(id.machine)) {
    problems.push('identities are incomplete');
  }
  if (!Array.isArray(m.rows)) {
    problems.push('rows is not an array');
    return problems;
  }
  const want = rules.expectedKeys();
  if (m.rows.length !== 135) problems.push('has ' + m.rows.length + ' rows, not 135');
  m.rows.forEach((row, i) => {
    const where = 'row ' + (i + 1) + (row && row.key ? ' ' + row.key : '') + ': ';
    if (!isObject(row)) {
      problems.push(where + 'is not an object');
      return;
    }
    if (row.key !== want[i]) problems.push(where + 'key is not ' + want[i]);
    if (row.binding !== 'approved') problems.push(where + 'binding is not approved');
    if (!Number.isInteger(row.cellCount) || row.cellCount < 1) {
      problems.push(where + 'cellCount is not a whole number');
      return;
    }
    const b = rules.budgetSecondsOf(row.cellCount);
    if (row.b !== b || row.budgetMs !== b * 1000) {
      problems.push(where + 'budget is not the board\'s ' + b + ' s');
    }
    if (row.attempts !== rules.defaultAttemptsOf(row.cellCount)) {
      problems.push(where + 'attempts are not the default');
    }
    const e = rules.envelopeOf(b);
    ['F', 'P', 'A', 'T', 'O'].forEach((n) => {
      if (row[n] !== e[n] || (n !== 'F' && row[n] !== rules.BRIEF_TABLE[b][n])) {
        problems.push(where + n + ' is not ' + e[n]);
      }
    });
  });
  const counts = { 2: 0, 10: 0, 30: 0 };
  m.rows.forEach((r) => { if (r && counts[r.b] !== undefined) counts[r.b]++; });
  eq('class counts', counts, rules.CLASS_COUNTS);
  const sums = { cells: m.rows.length, P: 0, A: 0, T: 0, O: 0 };
  m.rows.forEach((r) => ['P', 'A', 'T', 'O'].forEach((n) => {
    sums[n] += r && Number.isFinite(r[n]) ? r[n] : 0;
  }));
  if (m.structuralSums) {
    ['cells', 'P', 'A', 'T', 'O'].forEach((n) => {
      if (m.structuralSums[n] !== sums[n]) problems.push('sum ' + n);
    });
  }
  return problems;
}

/** The manifest row of an exact `variant/level` key (no alias, no case folding). */
function rowOf(manifest, key) {
  const found = manifest.rows.filter((r) => r.key === key);
  return found.length === 1 ? found[0] : null;
}

/** `..\docs\...\runs\<cell>\payload-N\admission-M\<name>`: the qualifier's paths, relative to generator/. */
function relOutput(key, slot, ordinal, name) {
  return path.join('..', 'docs', 'difficulty-v3', 'evidence', 'MS18c', 'runs', util.cellDirName(key),
    'payload-' + slot, 'admission-' + ordinal, name);
}

/** The only argument vector of a cell's payload (after `node`): one variant, one level, jobs 4. */
function payloadArgs(row, slot, ordinal) {
  return ['tests\\qualify.js', '--variant=' + row.key.split('/')[0], '--level=' + row.key.split('/')[1],
    '--jobs=4', '--json=' + relOutput(row.key, slot, ordinal, 'qualifier.json'),
    '--markdown=' + relOutput(row.key, slot, ordinal, 'qualifier.md')];
}

const FORBIDDEN = [
  [/^--no-early-stop$/, 'no early stop'], [/^--probe(=|$)/, 'a probe'], [/^--merge(=|$)/, 'a merge'],
  [/^--child$/, 'a child worker'], [/^--help$|^-h$/, 'help'], [/^--quiet$/, 'a changed output'],
  [/^--(variant|level)=.*,/, 'a list of cells'], [/^--jobs=(?!4$)/, 'another job count'],
  [/^--(from|shard|seed|seeds|count|cap|window|attempts|max-attempts|timeout)/,
    'a shard, cap, window, attempt or timeout'],
  [/^(-r|--require|--import|--loader|--experimental-loader|--eval|-e|-p|--print|--inspect)/,
    'a preload or eval'],
  [/^--max-old-space-size|^--stack-size|^--cpu-prof/, 'a runtime option']
];

/** Why an argument vector is not the approved payload of the row (empty: it is exactly the approved one). */
function payloadProblems(argv, row, slot, ordinal) {
  if (!Array.isArray(argv)) return ['the payload is not an argument list'];
  const problems = [];
  argv.forEach((arg) => {
    FORBIDDEN.forEach(([pattern, what]) => {
      if (typeof arg === 'string' && pattern.test(arg)) problems.push('refused ' + what + ': ' + arg);
    });
  });
  const want = payloadArgs(row, slot, ordinal);
  if (rules.canon(argv) !== rules.canon(want)) problems.push('the payload is not exactly ' + want.join(' '));
  return problems;
}

/**
 * The manifest of HEAD with the Git authority check. deps: { git (gitro.createGit), readFile, exists }.
 * Returns { ok, problems, manifest, blob, workingTreeSha256 }.
 */
function loadManifest(deps) {
  const d = deps || {};
  const git = d.git || gitro.createGit(util.REPO);
  const abs = path.join(util.REPO, util.MANIFEST_PATH);
  const exists = d.exists || ((f) => fs.existsSync(f));
  const read = d.readFile || ((f) => fs.readFileSync(f));
  const problems = [];
  const atHead = git(['rev-parse', '--verify', '--quiet', 'HEAD:' + util.MANIFEST_PATH]);
  const blob = atHead.status === 0 ? atHead.stdout : null;
  if (blob === null) problems.push('the manifest does not exist in HEAD');
  if (!exists(abs)) problems.push('the manifest is not in the working tree');
  let manifest = null;
  let sha = null;
  if (exists(abs)) {
    const bytes = read(abs);
    sha = util.sha256(bytes);
    const hashed = git(['hash-object', util.MANIFEST_PATH]);
    if (blob !== null && (hashed.status !== 0 || hashed.stdout !== blob)) {
      problems.push('the working-tree manifest does not hash to the committed blob');
    }
    const diff = git(['diff', '--quiet', 'HEAD', '--', util.MANIFEST_PATH]);
    if (diff.status !== 0) problems.push('git diff reports the manifest as changed');
    try {
      manifest = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    } catch (err) {
      problems.push('the manifest is not JSON: ' + err.message);
    }
  }
  if (manifest !== null) validateManifest(manifest).forEach((p) => problems.push('manifest: ' + p));
  return { ok: problems.length === 0, problems: problems, manifest: manifest, blob: blob,
    workingTreeSha256: sha };
}

module.exports = {
  SCHEMA, BASE, BINDING, APPROVALS, OWNER_DECISIONS, HOST, validateManifest, rowOf, relOutput, payloadArgs,
  payloadProblems, loadManifest
};
