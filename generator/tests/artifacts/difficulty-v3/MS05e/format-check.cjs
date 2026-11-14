'use strict';

// MS05e: the format check of check-list section 3 (no BOM, CRLF only, no trailing whitespace, final newline) over every
// file this task changed or created. Reads only unless --fix is given (then it normalises the files of the evidence folder
// and the scratch scripts, never a source or a document of the repository). Run from the repository root.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const fix = process.argv.includes('--fix');
const ROOT = process.cwd();
const listed = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ''));
const mine = (f) => /^docs\/difficulty-v3\/evidence\/MS05e\//.test(f) || /^generator\/tests\/artifacts\/difficulty-v3\/MS05e\//.test(f);
let bad = 0;
listed.forEach((f) => {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return;
  if (/^\.github\/scripts\/.*\.sh$/.test(f)) return;
  let text = fs.readFileSync(abs, 'utf8');
  const problems = [];
  if (text.charCodeAt(0) === 65279) problems.push('BOM');
  if (/(?<!\r)\n|\r(?!\n)/.test(text)) problems.push('LF-only or lone CR');
  if (/[ \t]+\r?$/m.test(text)) problems.push('trailing whitespace');
  if (!text.endsWith('\r\n')) problems.push('no final CRLF');
  if (problems.length === 0) return;
  if (fix && mine(f)) {
    text = text.replace(/^\uFEFF/, '').replace(/\r\n|\r|\n/g, '\n').replace(/[ \t]+$/gm, '');
    if (!text.endsWith('\n')) text += '\n';
    fs.writeFileSync(abs, text.replace(/\n/g, '\r\n'), 'utf8');
    console.log('fixed   ' + f + ' (' + problems.join(', ') + ')');
  } else {
    bad++;
    console.log('PROBLEM ' + f + ': ' + problems.join(', '));
  }
});
console.log((fix ? 'fix run; ' : '') + listed.length + ' paths listed, ' + bad + ' with a problem left');
