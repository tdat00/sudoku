'use strict';
// Scratch (MS11b): checks BOM, CRLF, final newline and trailing whitespace of every changed or new file of the task
// (git status), and the 110-column limit of the engine files. Usage (from the repository root):
//   node generator/tests/artifacts/difficulty-v3/MS11b/check-format.cjs
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = 'Q:\\git\\sudoku';
const status = cp.execSync('git status --porcelain --untracked-files=all', { cwd: root, encoding: 'utf8' });
const files = status.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ''));
let bad = 0;
let checked = 0;
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
  if (/^(core\/js\/engine|generator\/js\/engine)\//.test(rel.replace(/\\/g, '/'))) {
    t.split(/\r?\n/).forEach((line, i) => { if (line.length > 110) problems.push('line ' + (i + 1) + ' is ' + line.length); });
  }
  checked += 1;
  if (problems.length) { bad += 1; console.log('FAIL ' + rel + ': ' + problems.join(', ')); }
});
console.log('checked ' + checked + ' files, ' + bad + ' with problems');
process.exit(bad ? 1 : 0);
