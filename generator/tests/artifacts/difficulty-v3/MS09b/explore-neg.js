'use strict';
// Scratch (MS09b): candidates for the negative fixtures of finnedSwordfish on real unique puzzles.
//   N2: the position through finnedXWing (before swordfish) has a genuine ordinary Swordfish and no finned Swordfish.
//   N3: the position through emptyRectangle (before finnedXWing) has a finned X-Wing and no finned Swordfish.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/explore-neg.js [count] [seeds]
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const THROUGH_ER = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair',
  'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite',
  'simpleColouring', 'emptyRectangle'];
const THROUGH_FIN = THROUGH_ER.concat(['finnedXWing']);
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const seen = new Set();
const out = { n2: 0, n3: 0 };

function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen.has(puzzle)) return;
  seen.add(puzzle);
  let state;
  try { state = H.stateAfter(m9, puzzle, THROUGH_FIN); } catch (e) { return; }
  if (state.unsolvedCount !== 0) {
    const sword = SG.techniques.get('swordfish').find(m9, state, ctx);
    const fsf = SG.techniques.get('finnedSwordfish').find(m9, state, ctx);
    if (sword !== null && fsf === null) {
      out.n2++;
      console.log('N2 ' + JSON.stringify({ name, puzzle, left: state.unsolvedCount, bases: sword.i18nArgs.baseUnits,
        covers: sword.i18nArgs.coverUnits, digit: sword.i18nArgs.digit,
        el: sword.eliminations.map((e) => H.label(m9, e[0])) }));
    }
  }
  let st2;
  try { st2 = H.stateAfter(m9, puzzle, THROUGH_ER); } catch (e) { return; }
  if (st2.unsolvedCount === 0) return;
  const fx = SG.techniques.get('finnedXWing').find(m9, st2, ctx);
  const f3 = SG.techniques.get('finnedSwordfish').find(m9, st2, ctx);
  if (fx !== null && f3 === null) {
    out.n3++;
    console.log('N3 ' + JSON.stringify({ name, puzzle, left: st2.unsolvedCount, digit: fx.i18nArgs.digit,
      bases: fx.i18nArgs.bases, covers: fx.i18nArgs.covers, fins: fx.i18nArgs.fins }));
  }
}

SG.fixtures.classic.unique.forEach((fx) => row(fx.name, fx.puzzle));
SG.fixtures.rated.entries.forEach((fx) => row('rated:' + fx.name, fx.puzzle));
const count = Number(process.argv[2] || 300);
const seeds = (process.argv[3] || '20260101,99,777').split(',').map(Number);
seeds.forEach((seed) => {
  const items = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(seed), count);
  items.forEach((it, i) => { if (it.kind === 'initial') row('rand' + seed + '#' + i, H.puzzleString(m9, it.givens)); });
});
console.error('candidates ' + JSON.stringify(out));
