'use strict';

// MS05e: proves that the final greater-than.js equals the source the pool-4 files were measured on, except for the one
// statement that was wrapped to stay within 110 characters. Reads only; run from generator/.
const fs = require('fs');
const crypto = require('crypto');

const h = (text) => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const text = fs.readFileSync('js/variants/greater-than.js', 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const wrapped = "            if (log !== null) {\n" +
  "              log.push({ op: 'reject', cells: pair.slice(), sign: idx, reason: rated.reason });\n" +
  "            }";
const single = "            if (log !== null) log.push({ op: 'reject', cells: pair.slice(), sign: idx, reason: rated.reason });";
const measured = JSON.parse(fs.readFileSync('../docs/difficulty-v3/evidence/MS05e/pool-4/normal-300-r1.json', 'utf8')).source;
const reverted = text.replace(wrapped, single);
console.log('wrapped statement present: ' + text.includes(wrapped));
console.log('final greater-than.js sha256            ' + h(text));
console.log('final with the statement on one line    ' + h(reverted));
console.log('pool-4 files record (greaterThanHash)   ' + measured.greaterThanHash);
console.log('identical apart from the wrap: ' + (h(reverted) === measured.greaterThanHash));
text.split('\n').forEach((line, i) => {
  if (line.length > 110) console.log('line ' + (i + 1) + ' has ' + line.length + ' characters');
  if (/[ \t]+$/.test(line)) console.log('line ' + (i + 1) + ' has trailing whitespace');
});
