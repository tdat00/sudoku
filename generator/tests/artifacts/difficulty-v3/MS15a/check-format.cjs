'use strict';
// Scratch (MS15a, from MS14a's): checks BOM, CRLF, final newline and trailing whitespace of every changed or new file of
// the task (git status), the 110-column limit of the engine files (failure) and of the other JavaScript files the task
// touched (reported as "long", not a failure: the repository states the limit for the engines). It also reports the files
// that the E recorders hash (every SOURCE_FILES entry that exists, plus the recorder and hash helper files) that are modified
// or new, so that a freeze names them all. Usage (from the repository root):
//   node generator/tests/artifacts/difficulty-v3/MS15a/check-format.cjs
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = 'Q:\\git\\sudoku';
const status = cp.execSync('git status --porcelain --untracked-files=all', { cwd: root, encoding: 'utf8' });
const files = status.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ''));
let bad = 0;
let checked = 0;
let longLines = 0;
const longList = [];
files.forEach((rel) => {
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
  if (/\.(js|cjs)$/.test(slashed) && !/\/artifacts\//.test(slashed)) {
    const engine = /^(core\/js\/engine|generator\/js\/engine)\//.test(slashed);
    t.split(/\r?\n/).forEach((line, i) => {
      if (line.length > 110) {
        if (engine) problems.push('line ' + (i + 1) + ' is ' + line.length);
        else { longLines += 1; longList.push(slashed + ':' + (i + 1) + ' (' + line.length + ')'); }
      }
    });
  }
  checked += 1;
  if (problems.length) { bad += 1; console.log('FAIL ' + rel + ': ' + problems.join(', ')); }
});
console.log('checked ' + checked + ' files, ' + bad + ' with problems, ' + longLines + ' non-engine lines over 110');
if (process.env.LIST_LONG) longList.forEach((l) => console.log('  long ' + l));
const gen = path.join(root, 'generator');
const runner = fs.readFileSync(path.join(gen, 'tests/node-runner.js'), 'utf8');
const sources = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));
const hashed = sources.concat(['tests/fixtures/tool-records.js', 'tests/fixtures/replay-recording.js', 'tests/replay-fixtures.js', 'tests/replay-goldens.js'])
  .map((rel) => path.relative(root, path.resolve(gen, rel)).replace(/\\/g, '/'));
const changed = new Set(files.map((f) => f.replace(/\\/g, '/')));
const touched = hashed.filter((rel) => changed.has(rel));
console.log('E-hashed sources ' + hashed.filter((rel) => fs.existsSync(path.join(root, rel))).length + ' of ' + hashed.length + '; of them modified or new: ' + (touched.join(', ') || 'none'));
process.exit(bad ? 1 : 0);
