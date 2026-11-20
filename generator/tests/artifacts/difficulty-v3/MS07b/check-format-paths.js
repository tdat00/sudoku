'use strict';

// MS07b scratch (no git): the format rules of AGENTS.md on the given files and folders (recursive): CRLF line ends only, no BOM,
// no trailing whitespace, a final newline, and no empty file. Usage: node check-format-paths.js <path> [<path>...]
const fs = require('fs');
const path = require('path');

const TEXT = /\.(js|json|md|html|css|yml|yaml|txt|cjs|mjs|ps1)$/i;
let checked = 0;
let problems = 0;

function check(abs) {
  const buffer = fs.readFileSync(abs);
  checked++;
  if (buffer.length === 0) {
    console.log('EMPTY ' + abs);
    problems++;
    return;
  }
  const text = buffer.toString('utf8');
  const bad = [];
  if (text.charCodeAt(0) === 0xfeff) bad.push('BOM');
  if (/(?<!\r)\n/.test(text)) bad.push('bare LF');
  if (!text.endsWith('\n')) bad.push('no final newline');
  const lines = text.split(/\r?\n/);
  const trailing = lines.filter((line, i) => /[ \t]+$/.test(line) && !(i === lines.length - 1 && line === '')).length;
  if (trailing > 0) bad.push(trailing + ' trailing-whitespace line(s)');
  if (bad.length > 0) {
    problems++;
    console.log(abs + ': ' + bad.join(', '));
  }
}

function walk(abs) {
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) fs.readdirSync(abs).forEach((name) => walk(path.join(abs, name)));
  else if (TEXT.test(abs)) check(abs);
}

process.argv.slice(2).forEach((p) => walk(path.resolve(p)));
console.log('checked ' + checked + ' text files, ' + problems + ' with problems');
process.exit(problems > 0 ? 1 : 0);
