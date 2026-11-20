'use strict';
// Scratch (MS07b): the smallest maxChainLength with which lower techniques + forcingChain + forcingChainLong
// (no nishio) solve each long-chain puzzle.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const lower = SG.techniques.list().filter((t) => t.group !== 'chain' && t.variantScope === null).map((t) => t.id);
const puzzles = require('fs').readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter((l) => l.startsWith('{')).map(JSON.parse)
  .filter((r) => r.forcingChainLong && r.forcingChainLong !== 'solved').slice(0, 14);
puzzles.forEach((r) => {
  const row = [];
  for (let limit = 5; limit <= 12; limit++) {
    const rep = SG.logicalSolver.solve(m9, H.parsePuzzle(m9, r.puzzle), {
      allowedTechniques: lower.concat(['forcingChain', 'forcingChainLong']), collectSteps: true, maxChainLength: limit });
    row.push(rep.solved ? 'S' : (rep.status === 'stuck' ? '-' : rep.status));
  }
  const full = SG.logicalSolver.solve(m9, H.parsePuzzle(m9, r.puzzle), {
    allowedTechniques: lower.concat(['forcingChain', 'forcingChainLong']), collectSteps: true });
  const lens = full.steps.filter((s) => s.technique === 'forcingChainLong').map((s) => s.i18nArgs.length);
  console.log(r.i, r.forcingChainLong && r.forcingChainLong.len, row.join(''), 'long steps', JSON.stringify(lens));
});
