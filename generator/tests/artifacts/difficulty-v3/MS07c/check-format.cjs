'use strict';

/*
 * MS07c scratch: the format rules of AGENTS.md on the files and folders named on the command line (no git): UTF-8
 * without BOM, CRLF line ends only, no trailing whitespace, a final newline, no empty file. Folders are read
 * recursively (text files only). Optional --max=<n> lists lines longer than n characters of the .js files named.
 *
 *   node tests/artifacts/difficulty-v3/MS07c/check-format.cjs [--max=110] <path> [<path> ...]
 */
const fs = require('fs');
const path = require('path');

const TEXT = /\.(js|cjs|mjs|json|jsonl|md|txt|ps1|html|css|yml|yaml)$/i;
let max = 0;
const roots = [];
process.argv.slice(2).forEach((arg) => {
  const m = /^--max=(\d+)$/.exec(arg);
  if (m) max = Number(m[1]); else roots.push(arg);
});

function files(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((name) => files(path.join(target, name)));
}

let checked = 0;
let problems = 0;
roots.flatMap(files).filter((file) => TEXT.test(file)).forEach((file) => {
  checked++;
  const buffer = fs.readFileSync(file);
  const bad = [];
  if (buffer.length === 0) bad.push('empty');
  const text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) bad.push('BOM');
  if (/(?<!\r)\n/.test(text)) bad.push('bare LF');
  if (/\r(?!\n)/.test(text)) bad.push('bare CR');
  if (!text.endsWith('\r\n')) bad.push('no final CRLF');
  const trailing = text.split(/\r?\n/).filter((line) => /[ \t]+$/.test(line)).length;
  if (trailing > 0) bad.push(trailing + ' trailing-whitespace line(s)');
  if (max > 0 && /\.(js|cjs)$/.test(file)) {
    const long = text.split(/\r?\n/).map((line, i) => (line.length > max ? i + 1 : 0)).filter(Boolean);
    if (long.length > 0) bad.push(long.length + ' line(s) over ' + max + ' (first ' + long[0] + ')');
  }
  if (bad.length > 0) {
    problems++;
    console.log(path.relative(process.cwd(), file) + ': ' + bad.join(', '));
  }
});
console.log('checked ' + checked + ' text files, ' + problems + ' with problems');
process.exitCode = problems > 0 ? 1 : 0;
