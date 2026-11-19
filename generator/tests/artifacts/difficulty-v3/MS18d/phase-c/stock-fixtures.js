'use strict';

/*
 * MS18d Phase C0 task-owned STAND-IN support: builds the stdout of the stock timing CLI (tests/perf.js) for
 * ONE cell as a string, from numbers, with its own copy of the stock formatting (pad, fmtMs, fmtTarget and
 * the header, legend, column, row, summary and Misses: lines of perf.js main()). It is deliberately not the
 * code of the classifier: the classifier tests and the fake CLI are written against this builder. Never a
 * measurement; every number given to it is invented by the test that gives it.
 */
function pad(text, width, left) {
  const s = String(text);
  if (s.length >= width) return s;
  return left ? s + ' '.repeat(width - s.length) : ' '.repeat(width - s.length) + s;
}

function fmtMs(ms) {
  return ms >= 100 ? ms.toFixed(0) : ms >= 10 ? ms.toFixed(1) : ms.toFixed(2);
}

function fmtTarget(ms) {
  return ms >= 1000 ? (ms / 1000) + ' s' : ms + ' ms';
}

/**
 * o: { variant, level, targetMs, p50, p95, max, mean, node, cpu, runs, seed, warmup, mark: 'ok' | 'MISS' |
 *   null (derived from p95 < target), met, cells, percent, misses: true | false (default: when MISS),
 *   missKey, missTarget }.
 */
function stockOutput(o) {
  const runs = o.runs === undefined ? 50 : o.runs;
  const seed = o.seed === undefined ? 7000 : o.seed;
  const warmup = o.warmup || 0;
  const ok = o.mark ? o.mark === 'ok' : o.p95 < o.targetMs;
  const mark = ok ? 'ok' : 'MISS';
  const met = o.met === undefined ? (ok ? 1 : 0) : o.met;
  const cells = o.cells === undefined ? 1 : o.cells;
  const share = met / cells;
  const lines = [];
  lines.push('Sudoku Generator performance  (node ' + (o.node || 'v26.13.0') + ', ' +
    (o.cpu || 'AMD EPYC 7763 64-Core Processor') + ', ' + runs + ' runs per cell' +
    (warmup ? ', ' + warmup + ' warm-up' : '') + ', trace summary, seed ' + seed + ')');
  lines.push('p95 target = design.md section 9.1; cells = variant x level the variant offers');
  lines.push('');
  lines.push(pad('variant', 12, true) + pad('level', 10, true) + pad('target', 9) + pad('p50', 9) +
    pad('p95', 9) + pad('max', 9) + pad('mean', 9) + '   ' + 'result');
  lines.push(pad(o.variant, 12, true) + pad(o.level, 10, true) + pad(fmtTarget(o.targetMs), 9) +
    pad(fmtMs(o.p50), 9) + pad(fmtMs(o.p95), 9) + pad(fmtMs(o.max), 9) + pad(fmtMs(o.mean), 9) + '   ' +
    mark);
  lines.push('');
  lines.push(met + ' of ' + cells + ' cells meet their p95 target (' +
    (o.percent === undefined ? (share * 100).toFixed(0) : o.percent) + ' %, acceptance: at least 90 %)');
  const misses = o.misses === undefined ? !ok : o.misses;
  if (misses) {
    lines.push('Misses:');
    lines.push('  ' + (o.missKey || o.variant + '/' + o.level) + ': p95 ' + fmtMs(o.p95) + ' ms against ' +
      fmtTarget(o.missTarget === undefined ? o.targetMs : o.missTarget) + ' (x' +
      (o.p95 / o.targetMs).toFixed(2) + '), max ' + fmtMs(o.max) + ' ms');
  }
  return lines.join('\n') + '\n';
}

module.exports = { stockOutput, pad, fmtMs, fmtTarget };
