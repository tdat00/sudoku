'use strict';

/*
 * MS07c scratch: summarises the six ledgers of the 72-request experiment (docs/difficulty-v3/evidence/MS07c/<C>/<cell>.json
 * and the guard-probe records beside them) into experiment-summary.json and a markdown table on the console. Read-only
 * apart from that one file. The selection predicate: total exact hits per cutoff (the generator's own `exact` flag,
 * every error a miss), the cutoff with more wins, 6 on a tie.
 */
const fs = require('fs');
const path = require('path');

const EVIDENCE = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS07c');
const CELLS = ['classic9-nightmare', 'diagonalX-nightmare', 'jigsaw9-nightmare'];
const CUTOFFS = [4, 6];

function sorted(list) { return list.slice().sort((a, b) => a - b); }
function pick(list, p) { const s = sorted(list); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
function hist(list) {
  const out = {};
  list.forEach((x) => { out[x] = (out[x] || 0) + 1; });
  return out;
}

const result = { cutoffs: {}, identity: {}, rule: 'more exact hits in total (the generator\'s own exact flag, every error or timeout a miss); C = 6 on a tie' };
const rows = [];
CUTOFFS.forEach((c) => {
  const total = { requests: 0, exact: 0, shallow: 0, errors: 0, seconds: 0, generationMs: 0 };
  result.cutoffs[c] = { cells: {} };
  CELLS.forEach((cell) => {
    const file = path.join(EVIDENCE, String(c), cell + '.json');
    const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
    const probe = JSON.parse(fs.readFileSync(path.join(EVIDENCE, String(c), cell + '.guard.json'), 'utf8'));
    const log = fs.readFileSync(path.join(EVIDENCE, String(c), cell + '.txt'), 'utf8');
    const seconds = Number(/^exit=\d+ seconds=([\d.]+)/m.exec(log)[1]);
    const r = ledger.rows;
    const ms = r.map((x) => x.generationMs);
    const exact = r.filter((x) => x.generationExact === true).length;
    const qualified = r.filter((x) => x.qualifiedHit === true).length;
    const inBand = r.filter((x) => x.scoreHit === true).length;
    const shallow = r.filter((x) => x.shallow === true).length;
    const errors = r.filter((x) => x.outcome === 'error').length;
    const attempts = r.map((x) => x.work ? x.work.length : 0);
    const fullRatings = r.map((x) => x.fullRatings);
    const lengths = [].concat.apply([], r.map((x) => x.chainLengths));
    const depths = [].concat.apply([], r.map((x) => x.nishioDepths));
    const counts = { forcingChain: 0, forcingChainLong: 0, nishio: 0, nishioDeep: 0 };
    r.forEach((x) => Object.keys(counts).forEach((id) => { counts[id] += (x.techniqueCounts && x.techniqueCounts[id]) || 0; }));
    const cellResult = {
      requests: r.length, exact: exact, qualified: qualified, inBand: inBand, shallow: shallow, errors: errors,
      checks: ledger.summary.checks.result, commandSeconds: seconds, generationSeconds: Number((ms.reduce((a, b) => a + b, 0) / 1000).toFixed(3)),
      generationMs: { p50: Number(pick(ms, 0.5).toFixed(1)), p95: Number(pick(ms, 0.95).toFixed(1)), max: Number(Math.max.apply(null, ms).toFixed(1)) },
      attempts: attempts.reduce((a, b) => a + b, 0), fullRatings: fullRatings.reduce((a, b) => a + b, 0),
      fullRatingsMedian: sorted(fullRatings)[Math.floor(fullRatings.length / 2)], techniqueSteps: counts,
      chainLengths: hist(lengths), nishioDepths: hist(depths),
      guard: { solves: probe.solves, refusals: probe.guardRefusals, requestsWithRefusals: probe.requestsWithGuardRefusals },
      exactIndexes: r.filter((x) => x.generationExact === true).map((x) => x.index),
      missIndexes: r.filter((x) => x.generationExact !== true).map((x) => x.index),
      sourceHash: ledger.meta.sourceHash, toolHash: ledger.meta.toolHash, chainWindow: ledger.meta.chainWindow,
      chainShortMax: ledger.meta.chainShortMax, node: ledger.meta.node
    };
    result.cutoffs[c].cells[cell] = cellResult;
    result.identity[c + '/' + cell] = cellResult.sourceHash.slice(0, 12) + '/' + cellResult.toolHash.slice(0, 12) + '/' + cellResult.node;
    total.requests += r.length; total.exact += exact; total.shallow += shallow; total.errors += errors;
    total.seconds += seconds; total.generationMs += ms.reduce((a, b) => a + b, 0);
  });
  result.cutoffs[c].total = total;
});
const hits4 = result.cutoffs[4].total.exact;
const hits6 = result.cutoffs[6].total.exact;
result.selection = { exact4: hits4, exact6: hits6, chosen: hits4 > hits6 ? 4 : 6, tie: hits4 === hits6 };
result.identicalIdentity = new Set(Object.values(result.identity)).size === 1;
fs.writeFileSync(path.join(EVIDENCE, 'experiment-summary.json'), JSON.stringify(result, null, 2).replace(/\n/g, '\r\n') + '\r\n');

console.log('| Cell | C | exact | in band, shallow | errors | command s | generation s (p50 / p95 / max ms) | attempts | full ratings | steps fC / fCL / n / nD |');
console.log('|---|---:|---:|---:|---:|---:|---|---:|---:|---|');
CELLS.forEach((cell) => CUTOFFS.forEach((c) => {
  const x = result.cutoffs[c].cells[cell];
  console.log('| ' + cell.replace('-nightmare', '') + ' | ' + c + ' | ' + x.exact + '/12 | ' + x.shallow + ' | ' + x.errors + ' | ' + x.commandSeconds + ' | ' +
    x.generationSeconds + ' (' + x.generationMs.p50 + ' / ' + x.generationMs.p95 + ' / ' + x.generationMs.max + ') | ' + x.attempts + ' | ' + x.fullRatings + ' | ' +
    [x.techniqueSteps.forcingChain, x.techniqueSteps.forcingChainLong, x.techniqueSteps.nishio, x.techniqueSteps.nishioDeep].join(' / ') + ' |');
}));
CUTOFFS.forEach((c) => {
  const t = result.cutoffs[c].total;
  console.log('C=' + c + ' total: exact ' + t.exact + '/' + t.requests + ', shallow ' + t.shallow + ', errors ' + t.errors + ', command seconds ' + t.seconds.toFixed(3) +
    ', generation seconds ' + (t.generationMs / 1000).toFixed(3));
});
console.log('selection: ' + JSON.stringify(result.selection) + ', identical identity ' + result.identicalIdentity);
CELLS.forEach((cell) => CUTOFFS.forEach((c) => {
  const x = result.cutoffs[c].cells[cell];
  console.log(cell + ' C=' + c + ' guard ' + JSON.stringify(x.guard) + ' lengths ' + JSON.stringify(x.chainLengths) + ' depths ' + JSON.stringify(x.nishioDepths) + ' miss ' + JSON.stringify(x.missIndexes));
}));
