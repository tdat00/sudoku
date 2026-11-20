'use strict';
// Scratch (MS13b, from MS13a's): checks BOM, CRLF, final newline and trailing whitespace of every changed or new file of
// the task (git status), the 110-column limit of the engine files (failure) and of the other JavaScript files the task
// touched (reported as "long", not a failure: the repository states the limit for the engines). Usage (from the repository
// root):
//   node generator/tests/artifacts/difficulty-v3/MS13b/check-format.cjs
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = 'Q:\\git\\sudoku';
const status = cp.execSync('git status --porcelain --untracked-files=all', { cwd: root, encoding: 'utf8' });
const files = status.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ''));
let bad = 0;
let checked = 0;
let longLines = 0;
files.forEach((rel) => {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return;
  if (/\.last-release$/.test(rel)) return;
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
        else { longLines += 1; }
      }
    });
  }
  checked += 1;
  if (problems.length) { bad += 1; console.log('FAIL ' + rel + ': ' + problems.join(', ')); }
});
console.log('checked ' + checked + ' files, ' + bad + ' with problems, ' + longLines + ' non-engine lines over 110');
process.exit(bad ? 1 : 0);
