'use strict';
// MS14c scratch (the format of MS14b's mutations.cjs): the in-memory mutations of this task, one record each:
//   name, target (repository-relative file), edits [{ from, to }] (every `from` occurs exactly once in the target), runs (the
//   runner invocations that must make a test fail: each { app, suites, filter? }, tried in order, a failure ends the mutant),
//   optional equivalent (a non-circular argument, only for a mutant expected to survive).
// Target: the cage engine core/js/engine/tech-cage.js, the code behind the two interactions pinned by the new core suite tech-cage
// (pointOutOfCage and the survivors and forced digits that feed it, the Finding it is reported in, the registration). Kinds:
// P the pointing step, N the digits a cage needs, S the surviving-combination filter, F the Finding's fields, R registration.
// The files on disk are never changed: mutant-hook.cjs wraps fs.readFileSync (in this process and, through NODE_OPTIONS, in the
// processes the tests start) for the one target path. The file has CRLF line ends: a fragment over two lines carries them.
const CRLF = '\r\n';
const CAGE = 'core/js/engine/tech-cage.js';
const SUITE = { app: 'generator', suites: 'tech-cage' };

const M = [];
const add = (name, from, to, extra) => M.push(Object.assign({ name, target: CAGE, edits: [{ from, to }], runs: [SUITE] }, extra || {}));
const addMany = (name, edits, extra) => M.push(Object.assign({ name, target: CAGE, edits, runs: [SUITE] }, extra || {}));

const FIRST_UNITS = 'const first = model.cellUnits[positions[0]];';
const NEXT_UNIT = 'if (!all) continue;' + CRLF + '      const cells = model.units[u];';
const COMMON_LOOP = 'for (let i = 1; i < count && all; i++) all = hasUnit(model, positions[i], u);';
const EACH_UNIT = 'for (let a = 0; a < first.length; a++) {';
const POINTING = '} else if (places > 1) {';
const ALWAYS_AND = 'always &= survivorsA[j];';
const ALWAYS_INIT = 'let always = -1;';
const FILTER = 'if ((cm & forbidden) !== 0 || (cm & ~unionMask) !== 0) continue;';

// ---- P: the pointing step (pointOutOfCage and how it is reached)
add('P01 pointing never fires', POINTING, '} else if (false) {');
add('P02 pointing needs three places', POINTING, '} else if (places > 2) {');
add('P03 pointing for exactly two places', POINTING, '} else if (places === 2) {');
addMany('P04 only the first common unit', [
  { from: FIRST_UNITS, to: FIRST_UNITS + ' let done = false;' },
  { from: NEXT_UNIT, to: 'if (!all || done) continue;' + CRLF + '      done = true;' + CRLF + '      const cells = model.units[u];' }
]);
add('P05 the last unit of the first place skipped', EACH_UNIT, 'for (let a = 0; a < first.length - 1; a++) {');
add('P06 the first unit of the first place skipped', EACH_UNIT, 'for (let a = 1; a < first.length; a++) {');
add('P07 the last place ignored when units are compared', COMMON_LOOP, 'for (let i = 1; i < count - 1 && all; i++) all = hasUnit(model, positions[i], u);');
add('P08 one place too few passed on', 'partBuf, places, bit, eliminations);', 'partBuf, places - 1, bit, eliminations);');
add('P09 every unit of the first place counts', COMMON_LOOP, 'for (let i = 1; i < count && all; i++) all = true;');
add('P10 the cage cells are not spared', 'index.cageOf[x] !== k &&', 'true &&');
add('P11 a cell without the digit is listed', '(cand[x] & bit) !== 0 &&', 'true &&');
add('P12 a solved cell is not spared', 'value[x] === 0 &&', 'true &&', {
  equivalent: 'constraints.js assign() (lines 365-387) and place() (lines 392-406) set the candidates of a placed cell to its own digit ' +
    'alone, and a state is peer-consistent: every fixed value is removed from its peers (assign does it at once, place and propagate ' +
    'through run; the comment of the fast propagate at line 304 states the invariant). Take a solved cell x of a unit u that holds all ' +
    'the places of the digit d. If x holds d, those places share u with x, so they have lost d and are no places: contradiction. If x ' +
    'holds another digit, cand[x] has no d, so the guard (cand[x] & bit) !== 0 that follows keeps x out. Every state of the engine, ' +
    'the solver and the test helper is built that way, so no reachable state reaches the elimination branch with a solved cell.'
});
add('P13 an elimination listed twice', '!hasPair(eliminations, x, digit)', 'true');
add('P14 the wrong digit', 'const digit = 32 - Math.clz32(bit);', 'const digit = 31 - Math.clz32(bit);');

// ---- N: the digits a cage needs
addMany('N01 a digit that some surviving set has is needed', [
  { from: ALWAYS_INIT, to: 'let always = 0;' },
  { from: ALWAYS_AND, to: 'always |= survivorsA[j];' }
]);
add('N02 only the first surviving set decides', ALWAYS_AND, 'always = survivorsA[0];');
add('N03 only the last surviving set decides', ALWAYS_AND, 'always = survivorsA[n - 1];');
add('N04 no digit is ever needed', ALWAYS_INIT, 'let always = 0;');

// ---- S: the surviving-combination filter
add('S01 the candidates of the cage do not limit the sets', FILTER, 'if ((cm & forbidden) !== 0) continue;');
add('S02 a digit already placed in the cage is not excluded', FILTER, 'if ((cm & ~unionMask) !== 0) continue;');
add('S03 a set need not give every open cell a digit', 'if ((cand[cells[i]] & cm) === 0) {', 'if (false) {');
add('S04 the placed digits are not subtracted from the sum', 'const rest = index.sum[k] - fixedSum;', 'const rest = index.sum[k];');
add('S05 a placed digit may be in the sets (forbidden mask 0)', 'rest, fixedMask, model.digits, survivorsA)', 'rest, 0, model.digits, survivorsA)');
add('S06 the digits of the cage are the last set only', 'valid |= survivorsA[j];', 'valid = survivorsA[j];');
add('S07 an empty Finding is returned', 'if (placements.length === 0 && eliminations.length === 0) return null;', 'if (false) return null;');
add('S08 the last cage is not scanned', 'for (let k = 0; k < index.count; k++) {' + CRLF + '      if (index.distinct[k] === 0) continue;',
  'for (let k = 0; k < index.count - 1; k++) {' + CRLF + '      if (index.distinct[k] === 0) continue;');

// ---- F: the Finding's fields
add('F01 the cells are the open cells', 'for (i = s; i < e; i++) cells.push(index.cells[i]);' + CRLF + '    const forced',
  'for (i = s; i < e; i++) if (value[index.cells[i]] === 0) cells.push(index.cells[i]);' + CRLF + '    const forced');
add('F02 the size is the number of open cells', 'size: e - s,', 'size: open,');
add('F03 the digits are the forced digits', 'digits: toArray(valid),', 'digits: forced,');
add('F04 the sum is what is left', '      sum: index.sum[k],' + CRLF + '      size: e - s,', '      sum: rest,' + CRLF + '      size: e - s,');
add('F05 the technique is reported as cageSplit', "technique: 'cageCombo',", "technique: 'cageSplit',");

// ---- R: registration
add('R01 a cageLocked technique shares the finder', "['cageSplit', 40, 135, findCageSplit]",
  "['cageSplit', 40, 135, findCageSplit]," + CRLF + "    ['cageLocked', 10, 45, findCageCombo]");
add('R02 cageCombo registered as cageLocked', "['cageCombo', 10, 44, findCageCombo],", "['cageLocked', 10, 44, findCageCombo],");
add('R03 the cage group renamed', "group: 'cage',", "group: 'subset',");
add('R04 the scope is every variant', "variantScope: ['killer'],", 'variantScope: null,');
add('R05 the scope is another variant', "variantScope: ['killer'],", "variantScope: ['killer9'],");

module.exports = M;
