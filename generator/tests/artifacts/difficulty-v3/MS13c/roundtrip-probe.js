'use strict';
// MS13c scratch: which puzzles of the long-chain list have a version 2 grouped step in their canonical rating, and what
// replay.firstUse(model, givens, id) says for the first use of forcingChain / forcingChainLong.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const R = SG.replay;
const list = {
  '#589': '7...38..6..........532.4....94......1.......23...9.8.5....51.........3.7..29..56.',
  '#68': '.6.4....2..1..7..93..5...8...........52....971...2.84.23.....56..61.9............',
  '#1244': '7..9..34..98.....151.....6.1.....8.....7...54..54.2.......9.....2..56...6..82....',
  '#1349': '....5.4.7.1..3...57..1..3.....5..8..9..2.8.....6.91.........96..31..7....2.....7.',
  '#2475': '..82....1.24.....7....5..3.4....5..37..48....186.9.......561..........1.2..7..6.9',
  '#1024': '..41..98.5..4.........9..7.....1...9..7..52..49...2..8...2.3.1.........261....5..',
  '#1375': '3.4....7.2..76...1....3.2...5..2.....6.8.9...8....1..2..7......1..3...84.4..1.5..'
};
Object.entries(list).forEach(([name, text]) => {
  const givens = H.parsePuzzle(m9, text);
  const rating = SG.difficulty.rate(m9, givens, { collectSteps: true });
  const steps = rating.steps || [];
  const v2 = steps.map((s, i) => [i, s]).filter(([, s]) => s.i18nArgs && s.i18nArgs.proofVersion === 2);
  const uses = ['forcingChain', 'forcingChainLong'].map((id) => {
    const u = R.firstUse(m9, givens, id);
    return id + ':' + (u ? 'k' + u.k + '/' + u.n + (u.i18nArgs.proofVersion === 2 ? ' v2' : ' v1') : 'none');
  });
  console.log(name, 'solved', rating.solved, 'steps', steps.length, 'v2 steps', v2.map(([i, s]) => i + ':' + s.technique + ' len' + s.i18nArgs.length).join(', '), '|', uses.join(' '));
});
