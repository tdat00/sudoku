'use strict';

/*
 * MS15b scratch: the in-memory mutants of the ALS-XZ finder in core/js/engine/tech-als.js (registration, the seam, disjointness,
 * common digits, the restricted common digit, the z digit, the targets and the pivot, the order, the Finding, the work units and
 * the one guard, the caps and the observer record, the parent budget and the errors), in the style of MS15a's. Each entry is
 * { name, target, edits: [{ from, to }], runs: [{ app, suites, filter? }] }; every `from` fragment must occur EXACTLY once in the
 * file (check-mutations.cjs checks it). The file on disk is never changed: mutant-hook.cjs serves the edited text for that one path.
 * A mutant is DETECTED when a run of its suite fails; the whole `tech-als` suite is its run (--bail). `equivalent` (a string) marks a
 * mutant that is expected not to be detected, with the non-circular reason (given in the evidence).
 * MS15a's 131 enumerator mutants are NOT in this list: they are run from MS15a's own scripts (unchanged list) on the final source.
 */
const TARGET = 'core/js/engine/tech-als.js';
const RUNS = [{ app: 'generator', suites: 'tech-als' }];
const NL = '\r\n';

const MUTATIONS = [];
function add(name, edits, extra) {
  MUTATIONS.push(Object.assign({ name, target: TARGET, edits: edits.map(([from, to]) => ({ from, to })), runs: RUNS }, extra || {}));
}

// ---- R: registration and the exported API
add('R01 order 190 (a tie with forcingChain)', [['order: 194,', 'order: 190,']]);
add('R02 order 198 (a tie with forcingChainLong)', [['order: 194,', 'order: 198,']]);
add('R03 base cost 90', [['baseCost: 106,', 'baseCost: 90,']]);
add('R04 base cost 118', [['baseCost: 106,', 'baseCost: 118,']]);
add('R05 group fish', [["group: 'chain',", "group: 'fish',"]]);
add('R06 scoped to classic9', [['variantScope: null,', "variantScope: ['classic9'],"]]);
add('R07 assumes uniqueness', [['assumesUniqueness: false,', 'assumesUniqueness: true,']]);
add('R08 the registered finder forwards a fourth argument', [['find: function (model, state, ctx) { return findXz(model, state, ctx); }',
  'find: function (model, state, ctx, opts) { return findXz(model, state, ctx, opts); }']]);
add('R09 registered without the guard against a second load', [['if (!SG.techniques.has(XZ_ID)) {', 'if (true) {']]);
add('R10 id spelled alsXZ', [["const XZ_ID = 'alsXz';", "const XZ_ID = 'alsXZ';"]]);
add('R11 findXz not exported', [['    findXz: findXz,' + NL, '']]);

// ---- S: the seam of the tests
add('S01 a null opts is accepted', [["if (opts === null || typeof opts !== 'object') throw invalidOption('opts', 'must be an object');",
  "if (typeof opts !== 'object') throw invalidOption('opts', 'must be an object');"]]);
add('S02 a non-object opts is accepted', [["if (opts === null || typeof opts !== 'object') throw invalidOption('opts', 'must be an object');",
  "if (opts === null) throw invalidOption('opts', 'must be an object');"]]);
add('S03 the work limit of opts is ignored', [['const work = createWork(seam.workLimit);', 'const work = createWork();']]);
add('S04 the limits of opts are not forwarded', [['enumerate(model, state, ctx, work, seam.limits)', 'enumerate(model, state, ctx, work)']]);

// ---- D: disjoint sets
add('D01 overlapping sets allowed', [['    if (sharesCell(a.cells, b.cells)) return null;' + NL, '']]);
add('D02 disjointness read from the first cells only', [['if (sharesCell(a.cells, b.cells)) return null;', 'if (a.cells[0] === b.cells[0]) return null;']]);
add('D03 sharesCell looks at the first cell of A only', [['if (b.indexOf(a[k]) !== -1) return true;', 'return b.indexOf(a[k]) !== -1;']]);

// ---- C: the common digits
add('C01 one common digit is enough to enter the pair', [['if (common.length < 2) return null;', 'if (common.length < 1) return null;']],
  { equivalent: 'with one common digit x there is no other common digit z, so the z loop never runs and nothing is charged: same result, same work' });
add('C02 three common digits are needed', [['if (common.length < 2) return null;', 'if (common.length < 3) return null;']]);
add('C03 the merge of the digit lists is reversed', [['} else if (a[i] < b[j]) {', '} else if (a[i] > b[j]) {']]);
add('C04 the common digits are the digits of A', [['const common = commonDigits(a.digits, b.digits);', 'const common = a.digits.slice();']]);

// ---- X: the restricted common digit
add('X01 one cross-peer is enough', [['if (!sees(model, inA[i], inB[j])) return false;', 'if (sees(model, inA[i], inB[j])) return true;'],
  ['    return true;' + NL + '  }' + NL + NL + '  // The targets of z', '    return false;' + NL + '  }' + NL + NL + '  // The targets of z']]);
add('X02 only the first x cell of A is tested', [['for (let i = 0; i < inA.length; i++) {', 'for (let i = 0; i < 1; i++) {']]);
add('X03 only the first x cell of B is tested', [['for (let j = 0; j < inB.length; j++) {', 'for (let j = 0; j < 1; j++) {']]);
add('X04 no restricted common test', [['      if (!restrictedCommon(model, a, b, common[i])) continue;' + NL, '']]);

// ---- Z: the other common digit
add('Z01 z may be x', [['        if (k === i) continue;' + NL, '']]);
add('Z02 z only above x', [['if (k === i) continue;', 'if (k <= i) continue;']]);
add('Z03 only the first z of a pair is tried', [['if (targets.length > 0) return xzFinding(model, a, b, common[i], common[k], targets);',
  'if (targets.length > 0) return xzFinding(model, a, b, common[i], common[k], targets);' + NL + '        break;']]);
add('Z04 the digit x is removed, not z', [['eliminations: targets.map(function (c) { return [c, z]; }),',
  'eliminations: targets.map(function (c) { return [c, x]; }),']]);
add('Z05 digitX and digitY swapped', [['digitX: x,' + NL + '        digitY: z,', 'digitX: z,' + NL + '        digitY: x,']]);
add('Z06 x tried descending', [['for (let i = 0; i < common.length; i++) {', 'for (let i = common.length - 1; i >= 0; i--) {']]);
add('Z07 z tried descending', [['for (let k = 0; k < common.length; k++) {', 'for (let k = common.length - 1; k >= 0; k--) {']]);

// ---- T: the targets and the pivot
add('T01 a target must see the first z cell only', [['for (let q = 0; q < zCells.length && all; q++) all = sees(model, c, zCells[q]);',
  'for (let q = 0; q < 1 && all; q++) all = sees(model, c, zCells[q]);']]);
add('T02 the z cells of A only', [['const zCells = a.occurrences[z].concat(b.occurrences[z]);', 'const zCells = a.occurrences[z].slice();']]);
add('T03 the z cells of B only', [['const zCells = a.occurrences[z].concat(b.occurrences[z]);', 'const zCells = b.occurrences[z].slice();']]);
add('T04 a z cell of the sets counts as seeing itself', [['all = sees(model, c, zCells[q]);', 'all = zCells[q] === c || sees(model, c, zCells[q]);']]);
add('T05 a solved cell may be a target', [['if (state.value[c] !== 0 || (state.candidates[c] & bit) === 0) continue;',
  'if ((state.candidates[c] & bit) === 0) continue;']]);
add('T06 a cell without the candidate z may be a target', [['if (state.value[c] !== 0 || (state.candidates[c] & bit) === 0) continue;',
  'if (state.value[c] !== 0) continue;']]);
add('T07 the pivot is the first z cell of B', [['const pivot = model.peers[a.occurrences[z][0]];', 'const pivot = model.peers[b.occurrences[z][0]];']]);
add('T08 the pivot is the last z cell of A', [['const pivot = model.peers[a.occurrences[z][0]];',
  'const pivot = model.peers[a.occurrences[z][a.occurrences[z].length - 1]];']]);
add('T09 the peers are visited descending', [['for (let i = 0; i < pivot.length; i++) {', 'for (let i = pivot.length - 1; i >= 0; i--) {']]);
add('T10 the scan stops at the first target', [['if (all) targets.push(c);', 'if (all) { targets.push(c); break; }']]);

// ---- O: the order of the pairs
add('O01 pairs in both orders', [['for (let j = i + 1; j < records.length; j++) {', 'for (let j = 0; j < records.length; j++) {']]);
add('O02 the records visited from the end', [['for (let i = 0; i < records.length; i++) {', 'for (let i = records.length - 1; i >= 0; i--) {']]);
add('O03 B before A', [['const found = xzOfPair(model, state, ctx, work, records[i], records[j]);',
  'const found = xzOfPair(model, state, ctx, work, records[j], records[i]);']]);

// ---- F: the Finding
add('F01 cells not sorted', [['const cells = a.cells.concat(b.cells).sort(numeric);', 'const cells = a.cells.concat(b.cells);']]);
add('F02 cells of A only', [['const cells = a.cells.concat(b.cells).sort(numeric);', 'const cells = a.cells.slice();']]);
add('F03 another technique id', [['technique: XZ_ID,', "technique: 'alsXz2',"]]);
add('F04 another step key', [["i18nKey: 'technique.' + XZ_ID + '.step',", "i18nKey: 'technique.' + XZ_ID,"]]);
add('F05 the labels are the cell numbers, and the array of the Finding', [['cells: cells.map(function (c) { return SG.model.cellLabel(model, c); })', 'cells: cells']]);

// ---- W: the work units, the one guard, the caps and the record
add('W01 a pair of records is not charged', [['        chargeUnit(work, ctx);' + NL + '        const found = xzOfPair', '        const found = xzOfPair']]);
add('W02 an opened (x, z) scan is not charged', [['        chargeUnit(work, ctx);' + NL + '        const targets = xzTargets', '        const targets = xzTargets']]);
add('W03 the visited peers are not charged', [['      chargeUnit(work, ctx);' + NL + '      const c = pivot[i];', '      const c = pivot[i];']]);
add('W04 only the peers that hold the candidate are charged', [['      chargeUnit(work, ctx);' + NL + '      const c = pivot[i];' + NL +
  '      if (state.value[c] !== 0 || (state.candidates[c] & bit) === 0) continue;', '      const c = pivot[i];' + NL +
  '      if (state.value[c] !== 0 || (state.candidates[c] & bit) === 0) continue;' + NL + '      chargeUnit(work, ctx);']]);
add('W05 the pair phase has a guard of its own', [['found = xzSearch(model, state, ctx, work, enumerated.records);',
  'found = xzSearch(model, state, ctx, createWork(seam.workLimit), enumerated.records);']]);
add('W06 a refused unit does not end the phase', [['if (!spend(work, ctx)) throw XZ_CAP;', 'if (!spend(work, ctx)) return;']]);
add('W07 the record quota is reported before the work cap', [["capHit: work.capped ? 'work' : recordsCut ? 'records' : null,",
  "capHit: recordsCut ? 'records' : work.capped ? 'work' : null,"]]);
add('W08 the record quota is never reported', [["capHit: work.capped ? 'work' : recordsCut ? 'records' : null,", "capHit: work.capped ? 'work' : null,"]]);
add('W09 any incomplete enumeration is read as the record quota', [["recordsCut = enumerated.capHit === 'records';", 'recordsCut = !enumerated.complete;']]);
add('W10 retained is always 0', [['retained: retained', 'retained: 0']]);
add('W11 the reported limit is the production one', [['limit: work.limit,', 'limit: LIMITS.work,']]);
add('W12 the reported work is the limit', [['work: work.used,', 'work: work.limit,']]);

// ---- B: the parent budget, errors and the observer
add('B01 no recheck of the budget after the enumeration', [["      } else if (enumerated.capHit !== 'work') {" + NL + '        ctx.check();' + NL + '        found = xzSearch',
  "      } else if (enumerated.capHit !== 'work') {" + NL + '        found = xzSearch']]);
add('B02 no final recheck of the budget', [['        found = xzSearch(model, state, ctx, work, enumerated.records);' + NL + '        ctx.check();',
  '        found = xzSearch(model, state, ctx, work, enumerated.records);']]);
add('B03 a stop of the parent in the enumeration is not remembered', [['if (enumerated.capHit === null && !enumerated.complete) {', 'if (false) {']]);
add('B04 the remembered stop asks the budget no more', [['even if a recheck now passes.' + NL + '        ctx.check();', 'even if a recheck now passes.']]);
add('B05 every error is swallowed', [["if (err !== XZ_CAP && !(err && err.code === 'budget.exceeded')) throw err;", 'if (err !== XZ_CAP && false) throw err;']]);
add('B06 cancellation is swallowed', [["if (err !== XZ_CAP && !(err && err.code === 'budget.exceeded')) throw err;",
  "if (err !== XZ_CAP && !(err && (err.code === 'budget.exceeded' || err.code === 'budget.cancelled'))) throw err;"]]);
add('B07 a Finding survives a failed final check', [['    } catch (err) {' + NL + '      found = null;' + NL, '    } catch (err) {' + NL]]);
add('B08 an observer that throws is swallowed', [["      observer({" + NL + "        id: XZ_ID,", "      try { observer({" + NL + "        id: XZ_ID,"],
  ['        retained: retained' + NL + '      });', '        retained: retained' + NL + '      }); } catch (e) { /* swallowed */ }']]);
add('B09 the record is published twice', [['      });' + NL + '    }' + NL + '    return found;', '      });' + NL +
  '      observer({ id: XZ_ID, work: 0, limit: 0, capHit: null, retained: 0 });' + NL + '    }' + NL + '    return found;']]);
add('B10 the budget is asked again after a cut enumeration', [["} else if (enumerated.capHit !== 'work') {", '} else if (true) {']]);

module.exports = MUTATIONS;
