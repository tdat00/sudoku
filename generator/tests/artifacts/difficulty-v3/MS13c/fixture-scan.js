'use strict';
// MS13c scratch: forcingChainLong fixtures of core/tests/fixtures/techniques.js under the grouped ladder (C = 4). For the
// three DUG_ puzzles of the fixtures: the registered forcingChainLong Finding at the position reached with every technique
// through forcingChain (`THROUGH_SHORT_CHAIN`). With a range: the same for the puzzles of the seeded stream 161 (fork
// 'minimal.<i>'), printing the indices whose Finding has the wanted length. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS13c/fixture-scan.js dug
//   node tests/artifacts/difficulty-v3/MS13c/fixture-scan.js scan <from> <count> <length>
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const through = SG.techniques.list().filter((t) => t.variantScope === null &&
  SG.techniques.get('forcingChainLong').order > t.order).map((t) => t.id);
function at(puzzle) {
  const state = H.stateAfter(m9, puzzle, through);
  if (state.unsolvedCount === 0) return 'solved';
  const records = [];
  const f = SG.techniques.get('forcingChainLong').find(m9, state,
    SG.techniques.createContext(m9, { onPatternWork: (r) => records.push(r) }));
  const sc = SG.techniques.get('forcingChain').find(m9, state, SG.techniques.createContext(m9, {}));
  return { open: state.unsolvedCount, long: f && { len: f.i18nArgs.length, kind: f.i18nArgs.kind, elim: f.eliminations,
    plc: f.placements, v2: f.i18nArgs.proofVersion === 2 }, short: sc && sc.i18nArgs.length, stop: records[0].grouped.stop };
}
if (process.argv[2] === 'dug') {
  const names = { DUG_24: '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.',
    DUG_379: '......4..4..8...15.5...7....8...19....23.8.......64.7........8614.........9.2...3',
    DUG_155: '...284.....51..83.....53....9.........8.....6.6..351.437.....6....4.2..88.......7' };
  Object.keys(names).forEach((k) => console.log(k, JSON.stringify(at(names[k]))));
} else {
  const from = Number(process.argv[3]); const count = Number(process.argv[4]); const want = Number(process.argv[5]);
  const rng = SG.testkit.rng.create(161);
  for (let i = from; i < from + count; i++) {
    const r = rng.fork('minimal.' + i);
    const solution = SG.testkit.randomSolution(m9, r.fork('grid'));
    const dug = SG.testkit.dig(m9, solution, r.fork('dig'), { symmetry: 'none', minClues: 0 });
    const puzzle = H.puzzleString(m9, dug.givens);
    const res = at(puzzle);
    if (res !== 'solved' && res.long && res.long.len === want && res.stop === null) {
      console.log("'" + puzzle + "', // #" + i + ' ' + JSON.stringify(res));
    }
  }
}
