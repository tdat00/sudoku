'use strict';
// MS13c scratch: per model and population, the default 50,000/4,096 attempt against the candidate allowance (R10):
// whole-call latency of both ids, the local caps (not counting window rejections) and the Findings found.
// Usage: node census-compare.js <census dir>
const fs = require('fs');
const dir = process.argv[2];
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };
log('model/population calls | default ms (both ids) | candidate ms | caps fc/long default | caps fc/long candidate | found fc/long default -> candidate');
const sum = { calls: 0, dm: 0, cm: 0, dc: [0, 0], cc: [0, 0], df: [0, 0], cf: [0, 0] };
fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
  const data = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  data.populations.forEach((pop) => {
    if (pop.rows.length === 0) return;
    const t = { dm: 0, cm: 0, dc: [0, 0], cc: [0, 0], df: [0, 0], cf: [0, 0] };
    pop.rows.forEach((row) => {
      ['forcingChain', 'forcingChainLong'].forEach((id, i) => {
        const x = row[id];
        t.dm += x.ms; t.cm += x.candidate.ms;
        if (x.stop && x.stop !== 'window') t.dc[i]++;
        if (x.candidate.stop && x.candidate.stop !== 'window') t.cc[i]++;
        if (x.found) t.df[i]++;
        if (x.candidate.found) t.cf[i]++;
      });
    });
    log(data.id + '/' + pop.name + ' ' + pop.calls + ' | ' + t.dm.toFixed(0) + ' | ' + t.cm.toFixed(0) + ' | ' + t.dc.join('/') +
      ' | ' + t.cc.join('/') + ' | ' + t.df.join('/') + ' -> ' + t.cf.join('/'));
    if (pop.name !== 'activation-ladder') return;
    sum.calls += pop.calls; sum.dm += t.dm; sum.cm += t.cm;
    [0, 1].forEach((i) => { sum.dc[i] += t.dc[i]; sum.cc[i] += t.cc[i]; sum.df[i] += t.df[i]; sum.cf[i] += t.cf[i]; });
  });
});
log('TOTAL activation-ladder ' + sum.calls + ' | ' + sum.dm.toFixed(0) + ' | ' + sum.cm.toFixed(0) + ' | ' + sum.dc.join('/') + ' | ' + sum.cc.join('/') +
  ' | ' + sum.df.join('/') + ' -> ' + sum.cf.join('/'));
if (process.argv[3]) fs.writeFileSync(process.argv[3], lines.join('\r\n') + '\r\n', 'utf8');
