'use strict';

/*
 * MS18c post-GQ task-owned, FILE-ONLY check of the publication step (no generation, no solver; the engine
 * files are loaded only to read the registry declarations, as `inputs.cjs` does):
 *   node generator/tests/artifacts/difficulty-v3/MS18c/publication-check.cjs
 * It reports, and exits 1 on any problem:
 *  - the publication identity `engine.sources` and the files that differ from the measured identity of the
 *    manifest (only the eight variant files that hold `difficultySupport` may differ), the unchanged tool
 *    hash and attempt-policy digest;
 *  - that the engine files of checkpoint A (6a473f7a) and of the working tree register the same 15 variant
 *    definitions in every
 *    respect (functions by their source text) except `difficultySupport`: the diff changes support lists
 *    only;
 *  - that every `difficultySupport` is exactly the support of the checked merge, in global level order, 79
 *    cells, and that Killer Hard and Expert are absent;
 *  - that the live report `docs/difficulty-rating/qualification.md` has exactly the merged table (137 lines,
 *    byte for byte), 135 rows in the shape the manual report test parses, whose offered levels equal the
 *    arrays, and that it states the identities and the 39 removals.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('./util.cjs');
const rules = require('./rules.cjs');
const inputs = require('./inputs.cjs');

const EVIDENCE = path.join(util.REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c');
const LIVE = path.join(util.REPO, 'docs', 'difficulty-rating', 'qualification.md');
// Checkpoint A, the pre-publication tree: HEAD was A when this was written and is B since B was committed.
const BASE = '6a473f7a';
const problems = [];
const notes = [];
const check = (ok, text) => { if (!ok) problems.push(text); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const lf = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

const manifest = readJson(path.join(util.REPO, util.MANIFEST_PATH));
const merged = readJson(path.join(EVIDENCE, 'merge', 'qualification-v3.json'));

// ---- identities -------------------------------------------------------------------------------------------
const source = inputs.sourceIdentity();
const baseline = new Map(manifest.identities.source.files.map((f) => [f.file, f.sha256]));
const changed = source.files.filter((f) => baseline.get(f.file) !== f.sha256).map((f) => f.file);
const variantFiles = ['classic', 'extra-regions', 'greater-than', 'jigsaw', 'killer', 'mega', 'multigrid',
  'wordoku'].map((n) => 'generator/js/variants/' + n + '.js');
check(source.fileCount === 46, 'the source list has ' + source.fileCount + ' files');
check(JSON.stringify(changed.slice().sort()) === JSON.stringify(variantFiles.slice().sort()),
  'changed files: ' + changed.join(', '));
const tool = inputs.toolIdentity();
const policy = inputs.attemptPolicyIdentity();
check(tool.qualifierHash === manifest.identities.tool.qualifierHash, 'the qualifier tool hash changed');
check(policy.digest === manifest.identities.attemptPolicy.digest, 'the attempt-policy digest changed');
notes.push('measured engine.sources ' + manifest.identities.source.engineSources + ' (ed2fe50c, dirty)');
notes.push('publication engine.sources ' + source.engineSources + ', ' + source.fileCount + ' files, ' +
  changed.length + ' changed: ' + changed.map((f) => path.basename(f)).join(', '));
notes.push('qualifierHash ' + tool.qualifierHash + ' and attempt-policy digest unchanged');

// ---- the diff changes support lists only ------------------------------------------------------------------
function loadSources(readText) {
  const context = vm.createContext({ console: console });
  inputs.sourceFileList().forEach((r) => {
    vm.runInContext(lf(readText(r)), context, { filename: r });
  });
  return context.SG;
}

function headText(r) {
  const file = path.posix.normalize('generator/' + r);
  const run = childProcess.spawnSync('git', ['--no-optional-locks', 'show', BASE + ':' + file],
    { cwd: util.REPO, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0 || run.stdout.length === 0) throw new Error('git show failed or empty for ' + file);
  return run.stdout;
}

function plain(value) {
  if (typeof value === 'function') return 'fn:' + lf(Function.prototype.toString.call(value));
  if (value === null || typeof value !== 'object') return value;
  if (ArrayBuffer.isView(value)) return 'typed:' + Array.from(value).join(',');
  if (Array.isArray(value)) return value.map(plain);
  const out = {};
  Object.keys(value).sort().forEach((k) => { out[k] = plain(value[k]); });
  return out;
}

const SGold = loadSources(headText);
const SGnew = loadSources((r) => fs.readFileSync(path.join(util.GENERATOR, r), 'utf8'));
const defsOf = (SG) => SG.variants.list().map((d) => ({ id: d.id, def: plain(Object.assign({}, d,
  { difficultySupport: null })), support: Array.from(d.difficultySupport) }));
const before = defsOf(SGold);
const after = defsOf(SGnew);
check(before.length === 15 && after.length === 15, 'the registry has ' + before.length + '/' + after.length);
let same = 0;
let differing = 0;
after.forEach((a, i) => {
  if (rules.canon(a.def) === rules.canon(before[i].def) && a.id === before[i].id) same++;
  else problems.push('definition of ' + a.id + ' differs beyond difficultySupport');
  if (rules.canon(a.support) !== rules.canon(before[i].support)) differing++;
});
notes.push('registry definitions equal apart from difficultySupport: ' + same + ' of 15; support lists ' +
  'differing from ' + BASE + ': ' + differing + ' (classic4 and classic6 unchanged)');
check(differing === 13, differing + ' lists differ, not 13');

// ---- the arrays are the support of the checked merge -----------------------------------------------------
const LEVELS = Array.from(SGnew.difficulty.LEVELS);
let total = 0;
after.forEach((a) => {
  const want = merged.support[a.id];
  total += a.support.length;
  check(rules.canon(a.support) === rules.canon(want), a.id + ' support ' + a.support.join(',') +
    ' is not the merged ' + (want || []).join(','));
  const order = a.support.map((l) => LEVELS.indexOf(l));
  check(order.every((x, i) => x >= 0 && (i === 0 || order[i - 1] < x)), a.id + ' is not in level order');
  notes.push(a.id + ': ' + a.support.join(', '));
});
check(total === 79, total + ' levels in the arrays, not 79');
const killer = after.filter((a) => a.id === 'killer')[0].support;
check(killer.indexOf('hard') === -1 && killer.indexOf('expert') === -1, 'Killer Hard/Expert are offered');

// ---- the live report ------------------------------------------------------------------------------------
if (fs.existsSync(LIVE)) {
  const text = fs.readFileSync(LIVE, 'utf8');
  check(!/(^|[^\r])\n/.test(text) && text.endsWith('\r\n'), 'the live report is not CRLF text');
  const lines = text.split('\r\n');
  const tableLines = fs.readFileSync(path.join(EVIDENCE, 'merge', 'table.md'), 'utf8').split('\r\n')
    .filter((l) => l.charAt(0) === '|');
  check(tableLines.length === 137, 'the merged table has ' + tableLines.length + ' lines');
  const start = lines.indexOf(tableLines[0]);
  check(start !== -1 && tableLines.every((l, i) => lines[start + i] === l),
    'the live report does not contain the merged table byte for byte');
  const offered = {};
  let rows = 0;
  lines.forEach((line) => {
    const m = /^\| (\w+) \| (\w+) \| \d+ \| \d+ \|.*\| (offered|hidden)[^|]*\|$/.exec(line);
    if (!m) return;
    rows++;
    offered[m[1]] = offered[m[1]] || [];
    if (m[3] === 'offered') offered[m[1]].push(m[2]);
  });
  check(rows === 135, 'the live report has ' + rows + ' table rows the manual test parses, not 135');
  after.forEach((a) => check(rules.canon(offered[a.id] || []) === rules.canon(a.support),
    'live table offers ' + (offered[a.id] || []).join(',') + ' for ' + a.id));
  const need = [merged.engine.sources, source.engineSources, tool.qualifierHash, 'MS18c-GQ-host-active',
    'ed2fe50c', 'S-OD7', '10,192.4051', '11,795.9214'];
  need.forEach((s) => check(text.indexOf(s) !== -1, 'the live report does not state ' + s));
  const v2Removed = text.split('\r\n').filter((l) => /^\| \w+\/\w+ \| \d+\/\d+ \|/.test(l));
  check(v2Removed.length === 39, 'the removals table has ' + v2Removed.length + ' rows, not 39');
  notes.push('live report: ' + lines.length + ' lines, ' + rows + ' table rows, ' + v2Removed.length +
    ' removals');
} else {
  problems.push('the live report is missing');
}

notes.forEach((n) => console.log('NOTE ' + n));
problems.slice(0, 40).forEach((p) => console.log('PROBLEM ' + p));
console.log(problems.length === 0 ? 'OK: no problem' : problems.length + ' problems');
process.exitCode = problems.length === 0 ? 0 : 1;
