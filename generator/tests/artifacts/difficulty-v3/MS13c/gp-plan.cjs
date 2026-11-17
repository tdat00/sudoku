'use strict';
// MS13c scratch: the GP plan. Lists the cells of the performance table (SG.fixtures.perfTools.PERF_TARGETS, the variants and
// levels the variant offers) whose level admits forcingChain or forcingChainLong (master and above: the allowed techniques of the
// level, SG.difficulty.spec) and writes run-shards.cjs plans: the pilot plan (--runs=2 per cell, the cell's projection stated) and,
// from a pilot ledger, the GP plan (--runs=50 --warmup=0 --seed=7000 --gate per cell, projected 25 x the pilot seconds per
// 2 runs x 1.3 and bounded as the item's own projection; a cell projected above 450 s is not launched: it is a named cost item).
//   node tests/artifacts/difficulty-v3/MS13c/gp-plan.cjs pilot            writes plan-gp-pilot.json
//   node tests/artifacts/difficulty-v3/MS13c/gp-plan.cjs gp <pilot jsonl> writes plan-gp.json and gp-unsafe.txt
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');

const T = SG.fixtures.perfTools;
const out = [];
T.cells().forEach((cell) => {
  const model = SG.variants.get(cell.variant).build({}, SG.rng.create(1));
  let ids = [];
  try { ids = SG.difficulty.spec(cell.level, model).allowedTechniques; } catch (e) { ids = []; }
  if (ids.indexOf('forcingChain') !== -1 || ids.indexOf('forcingChainLong') !== -1) out.push(cell);
});
const mode = process.argv[2];
// cells whose pilot is not run (GP_SKIP="samurai,flower,sohei"): no cell-qualified measurement exists for them. The decision not to
// pilot them rested on one G13 wire request (Samurai Nightmare 42, about 94 to 97 s), which does not measure these cells.
const skip = (process.env.GP_SKIP || '').split(',').filter(Boolean);
// cells whose pilot of 2 runs did not finish inside one 540 s lock (GP_SKIP_CELLS="mega16/hell1,..."): named cost items too
const skipCells = (process.env.GP_SKIP_CELLS || '').split(',').filter(Boolean);
// cells whose 50-run GP was started and stopped by the 540 s ceiling (GP_TIMEOUT_CELLS="greaterThan/nightmare,..."): named cost items
const timeoutCells = (process.env.GP_TIMEOUT_CELLS || '').split(',').filter(Boolean);
const skipped = out.filter((c) => skip.indexOf(c.variant) !== -1);
const timedOut = out.filter((c) => skipCells.indexOf(c.key) !== -1);
const gpTimedOut = out.filter((c) => timeoutCells.indexOf(c.key) !== -1);
const kept = out.filter((c) => skip.indexOf(c.variant) === -1 && skipCells.indexOf(c.key) === -1);
const text = (x) => JSON.stringify(x, null, 2).replace(/\n/g, '\r\n') + '\r\n';
const evidence = '..\\docs\\difficulty-v3\\evidence\\MS13c';
if (mode === 'pilot') {
  const plan = kept.map((c) => ({ label: 'gp-pilot-' + c.variant + '-' + c.level,
    args: ['tests\\perf.js', '--variant=' + c.variant, '--level=' + c.level, '--runs=2', '--warmup=0', '--seed=7000'],
    projectionSeconds: c.target >= 20000 ? 120 : c.target >= 8000 ? 60 : 30,
    projectionBasis: 'two runs at the target of the cell (' + c.target + ' ms p95) at most: a stated bound' }));
  fs.writeFileSync(path.join(__dirname, 'plan-gp-pilot.json'), text(plan));
  console.log(plan.length + ' affected cells: ' + out.map((c) => c.key + ' (' + c.target + ' ms)').join(', '));
} else if (mode === 'gp') {
  const rows = {};
  fs.readFileSync(path.resolve(process.argv[3]), 'utf8').trim().split(/\r?\n/).forEach((l) => { const r = JSON.parse(l); rows[r.label] = r; });
  const plan = [];
  const unsafe = skipped.map((c) => c.key + ': not piloted; no cell-qualified measurement exists (the decision rested on one G13 wire request, Samurai Nightmare 42, about 94 to 97 s, which does not measure this cell); the duration of 50 runs is unknown');
  timedOut.forEach((c) => unsafe.push(c.key + ': the pilot of two runs was attempted twice and each attempt was stopped by the 540-second ceiling with no result; no duration of 50 runs is inferred'));
  kept.forEach((c) => {
    const pilot = rows['gp-pilot-' + c.variant + '-' + c.level];
    if (timeoutCells.indexOf(c.key) !== -1) { unsafe.push(c.key + ': projected ' + Math.ceil(25 * pilot.nodeSeconds * 1.3) + ' s (pilot ' + pilot.nodeSeconds + ' s), launched and stopped by the 540 s ceiling with no result'); return; }
    if (!pilot || pilot.exit === null) { unsafe.push(c.key + ': no pilot'); return; }
    const projected = Math.ceil(25 * pilot.nodeSeconds * 1.3);
    if (projected > 450) { unsafe.push(c.key + ': projected ' + projected + ' s (pilot ' + pilot.nodeSeconds + ' s for 2 runs) exceeds 450 s'); return; }
    plan.push({ label: 'gp-' + c.variant + '-' + c.level,
      args: ['tests\\perf.js', '--variant=' + c.variant, '--level=' + c.level, '--runs=50', '--warmup=0', '--seed=7000', '--gate'],
      projectionSeconds: Math.max(projected, 10), projectionBasis: 'pilot ' + pilot.nodeSeconds + ' s for 2 runs x 25 x 1.3' });
  });
  fs.writeFileSync(path.join(__dirname, 'plan-gp.json'), text(plan));
  fs.writeFileSync(path.join(__dirname, 'gp-unsafe.txt'), unsafe.join('\r\n') + '\r\n');
  console.log(plan.length + ' cells planned, ' + unsafe.length + ' named cost items: ' + unsafe.join(' | '));
} else {
  throw new Error('pilot | gp <pilot jsonl>');
}
