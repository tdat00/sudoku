'use strict';
// MS13c scratch: the account of all 50 affected cells of the performance table (the cells whose level admits forcingChain or
// forcingChainLong), written to docs/difficulty-v3/evidence/MS13c/gp-table.md. Three populations, never mixed:
//   A  a complete 50-run record (a GP verdict: perf.js --runs=50 --warmup=0 --seed=7000 --gate, an exit 0 or 1 ledger row and a result row),
//   B  a complete two-run pilot only (diagnostic maxima, no GP verdict; one cell had its 50-run command stopped by the 540 s ceiling),
//   C  no complete pilot (twelve cells never piloted, one whose pilot was stopped twice by the 540 s ceiling).
// It reads the raw logs and ledgers and changes none of them. No aggregate is computed from the measured subset.
//   node tests/artifacts/difficulty-v3/MS13c/gp-table-50.cjs
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');

const dir = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS13c');
const logs = path.join(dir, 'logs');
const ledger = (name) => (fs.existsSync(path.join(dir, name))
  ? fs.readFileSync(path.join(dir, name), 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l)) : []);
const byLabel = (rows) => rows.reduce((m, r) => { m[r.label] = r; return m; }, {});
const pilots = byLabel(ledger('gp-pilot-runs.jsonl'));
const gps = byLabel(ledger('gp-runs.jsonl'));
const bases = byLabel(ledger('gp-base-runs.jsonl'));

const parse = (file) => {
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .find((l) => /^\S+\s+\S+\s+\S+( s| ms)\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[✓✗]/.test(l));
  if (!line) return null;
  const m = line.trim().split(/\s+/);
  return { target: m[2] + ' ' + m[3], p50: +m[4], p95: +m[5], max: +m[6], ok: m[8] === '✓' };
};
const T = SG.fixtures.perfTools;
const cells = [];
T.cells().forEach((cell) => {
  const model = SG.variants.get(cell.variant).build({}, SG.rng.create(1));
  let ids = [];
  try { ids = SG.difficulty.spec(cell.level, model).allowedTechniques; } catch (e) { ids = []; }
  if (ids.indexOf('forcingChain') !== -1 || ids.indexOf('forcingChainLong') !== -1) cells.push(cell);
});
const fmt = (ms) => (ms >= 1000 ? (ms / 1000).toString().replace(/\.0$/, '') + ' s' : ms + ' ms');
const num = (n) => (n === undefined || n === null ? '-' : String(n));
const A = [];
const B = [];
const C = [];
cells.forEach((c) => {
  const id = c.variant + '-' + c.level;
  const gpRow = gps['gp-' + id];
  const gpLog = parse(path.join(logs, 'gp-' + id + '.txt'));
  const pilotRow = pilots['gp-pilot-' + id];
  const pilotLog = parse(path.join(logs, 'gp-pilot-' + id + '.txt'));
  const base2 = parse(path.join(logs, 'base-' + id + '.txt'));
  const base50 = parse(path.join(logs, 'base50-' + id + '.txt'));
  const row = { c, id, gpRow, gpLog, pilotRow, pilotLog, base2, base50 };
  if (gpRow && gpLog) A.push(row);
  else if (pilotRow && pilotLog) B.push(row);
  else C.push(row);
});
if (A.length !== 21 || B.length !== 16 || C.length !== 13 || A.length + B.length + C.length !== 50) {
  throw new Error('expected 21 + 16 + 13 = 50, got ' + A.length + ' + ' + B.length + ' + ' + C.length);
}

const out = [];
out.push('# MS13c GP account: all 50 affected cells', '',
  'The 50 cells are the variant x level cells of the performance table (`SG.fixtures.perfTools`) whose level admits `forcingChain` or',
  '`forcingChainLong` (Master and above). **Not a complete or passing GP matrix**: 21 complete 50-run records, 16 cells with a',
  'complete two-run pilot only and 13 without a complete pilot. No aggregate is computed from the measured subset. The mega16/easy',
  'control of the brief is a separate cell (last table), not one of the 50. Raw tool output is in `logs/`, never edited.', '',
  'Candidate = the uncommitted MS13c tree, chain engine SHA-256 `5EBA1AE5...AC9D1`. Comparator = the accepted MS14a chain engine',
  '(`4aa3d11`, read into memory by `base-run.cjs`), **not `main`**. A same seed does not give the same delivered puzzle or dig path.',
  'Two-run numbers are **diagnostic maxima** of two runs (the p95 of two runs is the larger), never a population p95 estimate and no GP verdict.', '',
  '## A. Complete 50-run records (GP verdicts): 21 cells, ' + A.filter((r) => r.gpLog.ok).length + ' meet, ' + A.filter((r) => !r.gpLog.ok).length + ' miss', '',
  'Request: `node tests\\perf.js --variant=<v> --level=<l> --runs=50 --warmup=0 --seed=7000 --gate` (50 runs, seed 7000), candidate tree, one locked process per record (exit 0: all met, exit 1: a miss; both complete).',
  'Projection = 25 x the two-run pilot seconds x 1.3 (a planning estimate; the pilot-based projection was too low in seven of these). Base-50 = the same request with the comparator engine, where it was run.', '',
  '| cell | target | p50 ms | p95 ms | max ms | result | projected s | actual s | within projection | comparator 50-run p95 ms | evidence |',
  '|---|---|---|---|---|---|---|---|---|---|---|');
A.forEach((r) => {
  out.push(`| ${r.c.key} | ${fmt(r.c.target)} | ${r.gpLog.p50} | ${r.gpLog.p95} | ${r.gpLog.max} | ${r.gpLog.ok ? 'meets' : 'misses'} | ${r.gpRow.projectionSeconds} | ${r.gpRow.nodeSeconds} | ${r.gpRow.withinProjection ? 'yes' : '**no**'} | ${r.base50 ? r.base50.p95 + (r.base50.ok ? ' (met)' : ' (missed)') : '-'} | \`logs/gp-${r.id}.txt\`${r.base50 ? ', `logs/base50-' + r.id + '.txt`' : ''}, \`gp-runs.jsonl\` |`);
});
out.push('', '## B. Complete two-run pilot only: 16 cells (diagnostic maxima, **no GP verdict**)', '',
  'Request: `node tests\\perf.js --variant=<v> --level=<l> --runs=2 --warmup=0 --seed=7000` (no `--gate`), candidate tree. The "bound" is the pilot',
  'duration I stated before the run (30, 60 or 120 s by the cell\'s target); it was **not** an upper bound (10 of the 37 completed pilots exceeded it; see the',
  'pilot ledger). Fifteen of these cells were withheld from a 50-run request because 25 x pilot x 1.3 exceeds 450 s (a projection, not a measurement of 50 runs);',
  '**greaterThan/nightmare** was admitted (projected 440 s) and its 50-run command was stopped by the 540-second ceiling with no output: that failed command is',
  'kept apart from its valid pilot and is not one of the 21 complete records.', '',
  '| cell | target (reference only) | two-run max ms | pilot s | stated bound s | within bound | projected 50-run s | status | comparator two-run max ms | evidence |',
  '|---|---|---|---|---|---|---|---|---|---|');
B.forEach((r) => {
  const projected = Math.ceil(25 * r.pilotRow.nodeSeconds * 1.3);
  const aborted = r.c.key === 'greaterThan/nightmare';
  const status = aborted ? 'pilot valid; 50-run command admitted and **aborted at 540 s** (lock-log `GP gp compound 4 from 13`), no output' : 'withheld: projection above 450 s';
  out.push(`| ${r.c.key} | ${fmt(r.c.target)} | ${r.pilotLog.max} | ${r.pilotRow.nodeSeconds} | ${r.pilotRow.projectionSeconds} | ${r.pilotRow.withinProjection ? 'yes' : '**no**'} | ${projected} | ${status} | ${r.base2 ? r.base2.max : '-'} | \`logs/gp-pilot-${r.id}.txt\`${r.base2 ? ', `logs/base-' + r.id + '.txt`' : ''}, \`gp-pilot-runs.jsonl\` |`);
});
out.push('', '## C. No complete pilot: 13 cells (unmeasured; no time is assumed)', '',
  'Twelve cells (Samurai, Sohei and Flower at master, nightmare, hell1 and hell2) were **never piloted**: my decision rested on one G13 wire request (Samurai Nightmare',
  '42, about 94 to 97 s), which is not a cell-qualified measurement of these cells; their cost is unknown. **mega16/hell1**: the two-run pilot was attempted twice and',
  'each attempt was stopped by the 540-second ceiling with no result (lock-log `GP pilot compound 3 from 25` and `GP pilot compound 1 from 32`; the second attempt was',
  'unchanged); that is a failed request, not a measured duration of 50 runs.', '',
  '| cell | target (reference only) | status | evidence |', '|---|---|---|---|');
C.forEach((r) => {
  const mega = r.c.key === 'mega16/hell1';
  out.push(`| ${r.c.key} | ${fmt(r.c.target)} | ${mega ? 'pilot attempted twice, each stopped at 540 s, no output' : 'never piloted; unmeasured'} | ${mega ? 'lock-log rows (no ledger row); no log' : '`gp-unsafe.txt`'} |`);
});
const e2 = parse(path.join(logs, 'gp-pilot-mega16-easy.txt'));
const e50 = parse(path.join(logs, 'gp-mega16-easy.txt'));
out.push('', '## Separate control: mega16/easy (the brief\'s command; not an affected cell, not in the 50)', '',
  '| request | target | p50 ms | p95 ms | max ms | result | evidence |', '|---|---|---|---|---|---|---|',
  `| 2 runs (pilot) | ${e2 ? e2.target : '-'} | ${e2 ? e2.p50 : '-'} | ${e2 ? e2.p95 : '-'} | ${e2 ? e2.max : '-'} | diagnostic, no verdict | \`logs/gp-pilot-mega16-easy.txt\` |`,
  `| 50 runs, \`--gate\` | ${e50 ? e50.target : '-'} | ${e50 ? e50.p50 : '-'} | ${e50 ? e50.p95 : '-'} | ${e50 ? e50.max : '-'} | ${e50 ? (e50.ok ? 'meets' : 'misses') : '-'} | \`logs/gp-mega16-easy.txt\` |`, '');
fs.writeFileSync(path.join(dir, 'gp-table.md'), out.join('\r\n') + '\r\n');
console.log(out.join('\n'));
