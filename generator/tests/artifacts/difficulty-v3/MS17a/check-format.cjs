'use strict';
// Scratch (MS17a, from MS16's): checks BOM, CRLF, final newline and trailing whitespace of every changed or new file of the task
// (git status), the 110-column limit of the engine files (failure), and of every OTHER JavaScript line that this task added or
// changed (failure too: the brief asks the 110-character convention for new and touched comments, inline strings and test code;
// old lines over 110 in files the task touched are not reported). It also reports the files that the E recorders hash (every
// SOURCE_FILES entry that exists, plus the recorder and hash helper files) that are modified or new, so that a freeze names them
// all. Usage (any directory):
//   node generator/tests/artifacts/difficulty-v3/MS17a/check-format.cjs
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = 'Q:\\git\\sudoku';
const status = cp.execSync('git status --porcelain --untracked-files=all', { cwd: root, encoding: 'utf8' });
const entries = status.split(/\r?\n/).filter(Boolean).map((l) => ({ code: l.slice(0, 2), rel: l.slice(3).replace(/^"|"$/g, '') }));
const files = entries.map((e) => e.rel);

function addedLines(entry) {
  if (entry.code === '??') return null;
  const out = new Set();
  const diff = cp.execSync('git diff -U0 HEAD -- "' + entry.rel + '"', { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  diff.split(/\r?\n/).forEach((line) => {
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!m) return;
    const from = Number(m[1]);
    const n = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < n; i++) out.add(from + i);
  });
  return out;
}

let bad = 0;
let checked = 0;
entries.forEach((entry) => {
  const rel = entry.rel;
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return;
  if (/\.last-release$/.test(rel)) return;
  if (/^player\/tests\/fixtures\/exports\//.test(rel)) return;
  const t = fs.readFileSync(abs, 'utf8');
  const problems = [];
  if (t.charCodeAt(0) === 65279) problems.push('BOM');
  if (/(?<!\r)\n/.test(t)) problems.push('lone LF');
  if (/\r(?!\n)/.test(t)) problems.push('lone CR');
  if (/[ \t]+\r?$/m.test(t)) problems.push('trailing whitespace');
  if (!t.endsWith('\r\n')) problems.push('no final newline');
  const slashed = rel.replace(/\\/g, '/');
  if (/\.(js|cjs)$/.test(slashed) && !/\/artifacts\//.test(slashed) && !/^player\/js\/ui\/help-examples\.js$/.test(slashed)) {
    const engine = /^(core\/js\/engine|generator\/js\/engine)\//.test(slashed);
    const mine = engine ? null : addedLines(entry);
    t.split(/\r?\n/).forEach((line, i) => {
      if (line.length > 110 && (engine || mine === null || mine.has(i + 1))) problems.push('line ' + (i + 1) + ' is ' + line.length);
    });
  }
  checked += 1;
  if (problems.length) { bad += 1; console.log('FAIL ' + rel + ': ' + problems.join(', ')); }
});
console.log('checked ' + checked + ' files, ' + bad + ' with problems');
const gen = path.join(root, 'generator');
const runner = fs.readFileSync(path.join(gen, 'tests/node-runner.js'), 'utf8');
const sources = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));
const hashed = sources.concat(['tests/fixtures/tool-records.js', 'tests/fixtures/replay-recording.js', 'tests/replay-fixtures.js', 'tests/replay-goldens.js'])
  .map((rel) => path.relative(root, path.resolve(gen, rel)).replace(/\\/g, '/'));
const changed = new Set(files.map((f) => f.replace(/\\/g, '/')));
const touched = hashed.filter((rel) => changed.has(rel));
console.log('E-hashed sources ' + hashed.filter((rel) => fs.existsSync(path.join(root, rel))).length + ' of ' + hashed.length + '; of them modified or new: ' + (touched.join(', ') || 'none'));
process.exit(bad ? 1 : 0);
