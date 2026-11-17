'use strict';
// MS13c scratch: the table of the activation census (census-run.js output): one block per model and population with its
// denominator, the grouped attempt's completion and caps per id, the short id's fallbacks, the work (every stage) and the
// whole-call latency, the full-build work of S-AV36 and the candidate allowance's caps and latency (R10).
// Usage: node census-table.js <census dir> <out.md>
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const out = process.argv[3];
const q = (xs, p) => {
  if (xs.length === 0) return null;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const fmt = (v) => v === null || v === undefined ? '-' : (Number.isInteger(v) ? String(v) : v.toFixed(3));
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const lines = [];
lines.push('# MS13c census (activation source)', '');
lines.push('Every row is one population of one model; "calls" is its denominator (positions). Per id: **ok** = the grouped attempt', 'completed (graph and minimum), of which **found** a Finding; caps are **construction-work / construction-nodes / search-work**;', '**pb** = parent-budget stops (no budget is used here, so always 0); **fb** = the short id entered its fallback, of which **found**.', 'Work is every stage (construction + search + fallback); latency is the warm median of 3 calls, in ms.', '');
const totals = {};
files.forEach((file) => {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  data.populations.forEach((pop) => {
    lines.push('## ' + data.id + ' / ' + pop.name + ' (' + pop.calls + ' calls)', '');
    lines.push('| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    ['forcingChain', 'forcingChainLong'].forEach((id) => {
      const rows = pop.rows.map((r) => r[id]);
      const n = rows.length;
      const count = (f) => rows.filter(f).length;
      const ok = count((r) => r.stop === null);
      const found = count((r) => r.stop === null && r.found);
      const cw = count((r) => r.stop === 'construction-work');
      const cn = count((r) => r.stop === 'construction-nodes');
      const sw = count((r) => r.stop === 'search-work');
      const pb = count((r) => r.stop === 'parent-budget');
      const fb = count((r) => r.fallback !== null && r.fallback.entered);
      const fbFound = count((r) => r.fallback !== null && r.fallback.entered && r.fallback.outcome === 'found');
      const work = rows.map((r) => r.work);
      const t = rows.map((r) => r.ms);
      const fk = rows.filter((r) => r.fallbackKernelMs !== undefined).map((r) => r.fallbackKernelMs);
      const cand = rows.map((r) => r.candidate);
      const cCap = cand.filter((c) => c.stop === 'construction-work' || c.stop === 'construction-nodes').length;
      const cSw = cand.filter((c) => c.stop === 'search-work').length;
      const cFb = cand.filter((c) => c.fallbackEntered).length;
      const ct = cand.map((c) => c.ms);
      lines.push('| ' + id + ' | ' + ok + ' / ' + found + ' | ' + cw + ' / ' + cn + ' / ' + sw + ' | ' + pb + ' | ' + fb + ' / ' + fbFound +
        ' | ' + fmt(q(work, 0.5)) + ' / ' + fmt(q(work, 0.95)) + ' / ' + fmt(q(work, 1)) + ' | ' + fmt(q(t, 0.5)) + ' / ' + fmt(q(t, 0.95)) +
        ' / ' + fmt(q(t, 1)) + ' | ' + fmt(q(fk, 0.5)) + ' | ' + cCap + ' / ' + cSw + ', ' + cFb + ', ' + fmt(q(ct, 0.5)) + ' / ' + fmt(q(ct, 1)) + ' |');
      const key = id + ' ' + pop.name;
      const tt = totals[key] = totals[key] || { calls: 0, cw: 0, cn: 0, sw: 0, ok: 0, found: 0, fb: 0, fbFound: 0, ccap: 0, csw: 0, work: 0, ms: 0, cms: 0 };
      tt.calls += n; tt.cw += cw; tt.cn += cn; tt.sw += sw; tt.ok += ok; tt.found += found; tt.fb += fb; tt.fbFound += fbFound;
      tt.ccap += cCap; tt.csw += cSw; tt.work += work.reduce((a, b) => a + b, 0); tt.ms += t.reduce((a, b) => a + b, 0); tt.cms += ct.reduce((a, b) => a + b, 0);
    });
    const fullWork = pop.rows.map((r) => r.fullBuild.work);
    const over = pop.rows.filter((r) => r.fullBuild.work > data.limits.work).length;
    const addMax = Math.max.apply(null, pop.rows.map((r) => r.fullBuild.additional));
    lines.push('', 'Full-build work (the lifted builder, S-AV36): median ' + fmt(q(fullWork, 0.5)) + ', maximum ' + fmt(q(fullWork, 1)) + ', over ' +
      data.limits.work + ': ' + over + ' of ' + pop.calls + '; most additional nodes ' + addMax + ' (quota ' + data.limits.groups + ').', '');
  });
});
lines.push('## Totals by id and population (all models)', '');
lines.push('| id / population | calls | ok / found | cw / cn / sw | fb / found | total work | total ms | candidate caps (construction / search) | candidate total ms |');
lines.push('|---|---|---|---|---|---|---|---|---|');
Object.keys(totals).sort().forEach((key) => {
  const t = totals[key];
  lines.push('| ' + key + ' | ' + t.calls + ' | ' + t.ok + ' / ' + t.found + ' | ' + t.cw + ' / ' + t.cn + ' / ' + t.sw + ' | ' + t.fb + ' / ' + t.fbFound +
    ' | ' + t.work + ' | ' + t.ms.toFixed(1) + ' | ' + t.ccap + ' / ' + t.csw + ' | ' + t.cms.toFixed(1) + ' |');
});
fs.writeFileSync(out, lines.join('\r\n') + '\r\n', 'utf8');
console.log('wrote ' + out + ' (' + lines.length + ' lines)');
