'use strict';

// MS07b scratch: the format rules of AGENTS.md on every modified or untracked text file of the working tree
// (read-only `git status`): CRLF line ends only (LF for .github/scripts/*.sh), no BOM, no trailing whitespace and a
// final newline; optionally the longest line of the engine files. Usage: node check-format.js [--lines]
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..', '..', '..', '..', '..');
const status = execFileSync('git', ['status', '--porcelain=v1', '-uall', '-z'], { cwd: repo, encoding: 'utf8' })
  .split('\0').filter(Boolean);
const TEXT = /\.(js|json|md|html|css|sh|yml|yaml|txt|cjs|mjs|ps1)$/i;
let problems = 0;
let checked = 0;
status.forEach((entry) => {
  const code = entry.slice(0, 2);
  const rel = entry.slice(3);
  if (code.includes('D') || !TEXT.test(rel)) return;
  const abs = path.join(repo, rel);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return;
  const buffer = fs.readFileSync(abs);
  if (buffer.length === 0) {
    console.log('EMPTY ' + rel);
    problems++;
    return;
  }
  checked++;
  const text = buffer.toString('utf8');
  const lf = /\.sh$/i.test(rel);
  const bad = [];
  if (text.charCodeAt(0) === 0xfeff) bad.push('BOM');
  if (lf ? /\r/.test(text) : /(?<!\r)\n/.test(text)) bad.push(lf ? 'CR in an LF file' : 'bare LF');
  if (!text.endsWith('\n')) bad.push('no final newline');
  const lines = text.split(/\r?\n/);
  const trailing = lines.reduce((n, line, i) => n + (/[ \t]+$/.test(line) && !(i === lines.length - 1 && line === '') ? 1 : 0), 0);
  if (trailing > 0) bad.push(trailing + ' trailing-whitespace line(s)');
  if (/\r\n\r\n\r\n/.test(text) && false) bad.push('blank lines');
  if (bad.length > 0) {
    problems++;
    console.log(rel + ': ' + bad.join(', '));
  }
});
console.log('checked ' + checked + ' text files, ' + problems + ' with problems');
process.exit(problems > 0 ? 1 : 0);
