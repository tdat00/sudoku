'use strict';

/*
 * MS15a scratch: the in-memory mutants of core/js/engine/tech-als.js (the enumerator and its work guard), in the style of MS14a's
 * and MS14b's. Each entry is { name, target, edits: [{ from, to }], runs: [{ app, suites, filter? }] }; every `from` fragment must
 * occur EXACTLY once in the file (check-mutations.cjs checks it). The file on disk is never changed: mutant-hook.cjs serves the edited
 * text for that one path. A mutant is DETECTED when a run of its suite fails; the whole `tech-als` suite is its run (--bail).
 *
 * Kinds: C cardinality/union/DFS/order, R record fields, L record limit/probe/prefix, W work guard and budget, V option checks,
 * G geometry (which units), S ownership/immutability/cache, X misc.
 * `equivalent` (a string) marks a mutant that is expected not to be detected, with the reason (non-circular, in the evidence).
 */
const TARGET = 'core/js/engine/tech-als.js';
const RUNS = [{ app: 'generator', suites: 'tech-als' }];
const NL = '\r\n';

const MUTATIONS = [];
function add(name, edits, extra) {
  MUTATIONS.push(Object.assign({ name, target: TARGET, edits: edits.map(([from, to]) => ({ from, to })), runs: RUNS }, extra || {}));
}

// ---- C: cardinality, union bound, search, order
add('C01 exactly k digits instead of k + 1', [['if (digits === size + 1) {', 'if (digits === size) {']]);
add('C02 at most k + 1 digits', [['if (digits === size + 1) {', 'if (digits <= size + 1) {']]);
add('C03 exactly k + 2 digits', [['if (digits === size + 1) {', 'if (digits === size + 2) {']]);
add('C04 prune when the union exceeds k', [['if (digits > size + 1) continue;', 'if (digits > size) continue;']]);
add('C05 prune only above k + 2', [['if (digits > size + 1) continue;', 'if (digits > size + 2) continue;']]);
add('C06 no union bound while searching', [['if (digits > size + 1) continue;', 'if (false) continue;']]);
add('C07 prune at k + 1 digits too', [['if (digits > size + 1) continue;', 'if (digits >= size + 1) continue;']]);
add('C08 solved cells count as open', [['if (state.value[cells[i]] === 0) open.push(cells[i]);', 'if (true) open.push(cells[i]);']]);
add('C09 only solved cells count as open', [['if (state.value[cells[i]] === 0) open.push(cells[i]);', 'if (state.value[cells[i]] !== 0) open.push(cells[i]);']]);
add('C10 open cells without candidates are skipped', [['if (state.value[cells[i]] === 0) open.push(cells[i]);',
  'if (state.value[cells[i]] === 0 && state.candidates[cells[i]] !== 0) open.push(cells[i]);']]);
add('C11 the cells of a unit are not sorted', [['open.sort(numeric);', '']]);
add('C12 the cells of a unit are sorted descending', [['open.sort(numeric);', 'open.sort(function (a, b) { return b - a; });']]);
add('C13 numeric compares the other way', [['function numeric(a, b) { return a - b; }', 'function numeric(a, b) { return b - a; }']]);
add('C14 one more start index than can complete', [['const last = table.cells.length - (size - depth);', 'const last = table.cells.length - (size - depth) + 1;']]);
add('C15 the last index is too small at depth', [['const last = table.cells.length - (size - depth);', 'const last = table.cells.length - size;']]);
add('C16 no completion bound on the start', [['const last = table.cells.length - (size - depth);', 'const last = table.cells.length - 1;']]);
add('C17 a cell may be reused in a combination', [['} else if (extend(frame, depth + 1, i + 1, merged)) {', '} else if (extend(frame, depth + 1, i, merged)) {']]);
add('C18 the next cell skips its neighbour', [['} else if (extend(frame, depth + 1, i + 1, merged)) {', '} else if (extend(frame, depth + 1, i + 2, merged)) {']]);
add('C19 the union is an intersection', [['const merged = union | table.masks[i];', 'const merged = union & table.masks[i];']]);
add('C20 the found list shares the picked array', [['frame.found.push(frame.picked.slice());', 'frame.found.push(frame.picked);']]);
add('C21 the picked array has one slot too many', [['picked: new Array(size)', 'picked: new Array(size + 1)']]);
add('C22 the picked slot holds the index, not the cell', [['frame.picked[depth] = table.cells[i];', 'frame.picked[depth] = i;']]);
add('C23 the masks are the values, not the candidates', [['masks: open.map(function (c) { return state.candidates[c]; })', 'masks: open.map(function (c) { return state.value[c]; })']]);
add('C24 sizes start at 2', [['for (let size = 1; size <= top && capHit === null; size++) {', 'for (let size = 2; size <= top && capHit === null; size++) {']]);
add('C25 sizes stop one short', [['for (let size = 1; size <= top && capHit === null; size++) {', 'for (let size = 1; size < top && capHit === null; size++) {']]);
add('C26 sizes go one beyond the limit', [['for (let size = 1; size <= top && capHit === null; size++) {', 'for (let size = 1; size <= top + 1 && capHit === null; size++) {']]);
add('C27 the sets are not sorted', [['found.sort(compareSets);', '']]);
add('C28 the sets are not deduplicated', [['if (i === 0 || compareSets(found[i - 1], found[i]) !== 0) out.push(found[i]);', 'out.push(found[i]);']]);
add('C29 the first set is dropped', [['if (i === 0 || compareSets(found[i - 1], found[i]) !== 0) out.push(found[i]);', 'if (i > 0 && compareSets(found[i - 1], found[i]) !== 0) out.push(found[i]);']]);
add('C30 compare looks at the first cell only', [['for (let i = 0; i < a.length; i++) {', 'for (let i = 0; i < 1; i++) {']]);
add('C31 compare goes descending', [['if (a[i] !== b[i]) return a[i] - b[i];', 'if (a[i] !== b[i]) return b[i] - a[i];']]);
add('C32 compare says equal for different sets', [['if (a[i] !== b[i]) return a[i] - b[i];', 'if (a[i] !== b[i]) return 0;']]);
add('C33 popcount of the low byte only', [['const digits = popcount(merged);', 'const digits = popcount(merged & 255);']]);
add('C34 sizes ignore the digits of the board', [['const top = Math.min(limit.cells, model.digits - 1);', 'const top = limit.cells;']]);
add('C35 one size too many for the digits of the board', [['const top = Math.min(limit.cells, model.digits - 1);', 'const top = Math.min(limit.cells, model.digits);']]);
add('C36 one size too few for the digits of the board', [['const top = Math.min(limit.cells, model.digits - 1);', 'const top = Math.min(limit.cells, model.digits - 2);']]);
add('C37 the size bound is the digits alone', [['const top = Math.min(limit.cells, model.digits - 1);', 'const top = model.digits - 1;']]);

// ---- R: record fields
add('R01 digits descending', [['const digits = SG.bits.toArray(union);', 'const digits = SG.bits.toArray(union).reverse();']]);
add('R02 digits 0-based', [['const digits = SG.bits.toArray(union);', 'const digits = SG.bits.toArray(union).map(function (d) { return d - 1; });']]);
add('R03 the union misses the last cell', [['for (let i = 0; i < cells.length; i++) union |= candidates[cells[i]];', 'for (let i = 0; i < cells.length - 1; i++) union |= candidates[cells[i]];']]);
add('R04 the bit of a digit is shifted', [['const bit = 1 << (d - 1);', 'const bit = 1 << d;']]);
add('R05 occurrences list the cells without the digit', [['return (candidates[c] & bit) !== 0; });', 'return (candidates[c] & bit) === 0; });']]);
add('R06 occurrences list every cell', [['occurrences[d] = cells.filter(function (c) { return (candidates[c] & bit) !== 0; });', 'occurrences[d] = cells.slice();']]);
add('R07 cells of a record descending', [['return { cells: cells, digits: digits, occurrences: occurrences };', 'return { cells: cells.slice().reverse(), digits: digits, occurrences: occurrences };']]);
add('R08 occurrences keep the first cell only', [['occurrences[d] = cells.filter(function (c) { return (candidates[c] & bit) !== 0; });', 'occurrences[d] = cells.filter(function (c) { return (candidates[c] & bit) !== 0; }).slice(0, 1);']]);
add('R09 the result has no complete flag', [['return { records: records, complete: complete, capHit: capHit };', 'return { records: records, capHit: capHit };']]);
add('R10 the result carries the guard', [['return { records: records, complete: complete, capHit: capHit };', 'return { records: records, complete: complete, capHit: capHit, work: guard };']]);
add('R11 records without occurrences', [['return { cells: cells, digits: digits, occurrences: occurrences };', 'return { cells: cells, digits: digits };']]);

// ---- L: record limit, probe, prefix
add('L01 one record more than the limit', [['const room = limit.records - records.length;', 'const room = limit.records - records.length + 1;']]);
add('L02 the copy loop keeps one more', [['for (let i = 0; i < sets.length && i < room; i++) records.push(recordOf(sets[i], state.candidates));', 'for (let i = 0; i < sets.length && i <= room; i++) records.push(recordOf(sets[i], state.candidates));']]);
add('L03 the copy loop ignores the room', [['for (let i = 0; i < sets.length && i < room; i++) records.push(recordOf(sets[i], state.candidates));', 'for (let i = 0; i < sets.length; i++) records.push(recordOf(sets[i], state.candidates));']]);
add('L04 the cap is hit at exactly the limit', [["if (sets.length > room) capHit = 'records';", "if (sets.length >= room) capHit = 'records';"]]);
add('L05 the cap needs two more sets', [["if (sets.length > room) capHit = 'records';", "if (sets.length > room + 1) capHit = 'records';"]]);
add('L06 the cap is named work', [["if (sets.length > room) capHit = 'records';", "if (sets.length > room) capHit = 'work';"]]);
add('L07 no probe at an exact limit', [['collectLevel(tables, size, guard, ctx, room === 0)', 'collectLevel(tables, size, guard, ctx, room < 0)']]);
add('L08 probe one set early', [['collectLevel(tables, size, guard, ctx, room === 0)', 'collectLevel(tables, size, guard, ctx, room <= 1)']]);
add('L09 never a probe', [['collectLevel(tables, size, guard, ctx, room === 0)', 'collectLevel(tables, size, guard, ctx, false)']]);
add('L10 always a probe', [['collectLevel(tables, size, guard, ctx, room === 0)', 'collectLevel(tables, size, guard, ctx, true)']]);
add('L11 the probe does not stop at the first set', [['if (frame.first) return true;', 'if (false) return true;']]);
add('L12 the probe stops the unit, not the level', [['if (extend(frame, 0, 0, 0)) break;', 'extend(frame, 0, 0, 0);']]);
add('L13 the loop goes on after a cap', [['for (let size = 1; size <= top && capHit === null; size++) {', 'for (let size = 1; size <= top; size++) {']]);
add('L14 always complete', [['complete = capHit === null;', 'complete = true;']]);
add('L15 never complete', [['complete = capHit === null;', 'complete = false;']]);
add('L16 limit of cells 5', [['const LIMITS = Object.freeze({ cells: 4, records: 4096, work: 50000 });', 'const LIMITS = Object.freeze({ cells: 5, records: 4096, work: 50000 });']]);
add('L17 limit of records 4097', [['const LIMITS = Object.freeze({ cells: 4, records: 4096, work: 50000 });', 'const LIMITS = Object.freeze({ cells: 4, records: 4097, work: 50000 });']]);
add('L18 limit of work 50001', [['const LIMITS = Object.freeze({ cells: 4, records: 4096, work: 50000 });', 'const LIMITS = Object.freeze({ cells: 4, records: 4096, work: 50001 });']]);
add('L19 the limits are not frozen', [['const LIMITS = Object.freeze({ cells: 4, records: 4096, work: 50000 });', 'const LIMITS = ({ cells: 4, records: 4096, work: 50000 });']]);
add('L20 the default record limit is the work limit', [['const out = { cells: LIMITS.cells, records: LIMITS.records };', 'const out = { cells: LIMITS.cells, records: LIMITS.work };']]);

// ---- W: the shared work guard, the budget
add('W01 the limit allows one more unit', [['if (work.used >= work.limit) {', 'if (work.used > work.limit) {']]);
add('W02 the limit refuses one unit early', [['if (work.used >= work.limit) {', 'if (work.used + 1 >= work.limit) {']]);
add('W03 a refusal does not mark the guard', [['work.capped = true;', 'work.capped = work.capped;']]);
add('W04 a unit is not counted', [['work.used++;', ';']]);
add('W05 a unit counts twice', [['work.used++;', 'work.used += 2;']]);
add('W06 a refused unit says it was charged', [['work.capped = true;' + NL + '      return false;', 'work.capped = true;' + NL + '      return true;']]);
add('W07 the refusal does not stop the search', [['if (!spend(frame.work, frame.ctx)) throw WORK_CAP;', 'spend(frame.work, frame.ctx);']]);
add('W08 the refusal ends the call quietly', [['if (!spend(frame.work, frame.ctx)) throw WORK_CAP;', 'if (!spend(frame.work, frame.ctx)) return true;']]);
add('W09 the cadence checks at 256 units, not 257th', [['if (work.used + 1 - work.checkedAt > CHECK_UNITS) {', 'if (work.used + 1 - work.checkedAt >= CHECK_UNITS) {']]);
add('W10 the cadence is one unit late', [['if (work.used + 1 - work.checkedAt > CHECK_UNITS) {', 'if (work.used - work.checkedAt > CHECK_UNITS) {']]);
add('W11 the cadence is two units late', [['if (work.used + 1 - work.checkedAt > CHECK_UNITS) {', 'if (work.used + 1 - work.checkedAt > CHECK_UNITS + 1) {']]);
add('W12 the cadence is 128', [['const CHECK_UNITS = 256;', 'const CHECK_UNITS = 128;']]);
add('W13 the cadence is 512', [['const CHECK_UNITS = 256;', 'const CHECK_UNITS = 512;']]);
add('W14 the last check is not remembered', [['work.checkedAt = work.used;', ';']]);
add('W15 the check is not made in the cadence', [['ctx.check();' + NL + '      work.checkedAt = work.used;', 'work.checkedAt = work.used;']]);
add('W16 no check at entry', [['try {' + NL + '      ctx.check();', 'try {']]);
add('W17 the entry check is not remembered', [['guard.checkedAt = guard.used;', ';']]);
add('W18 the guard is reset at entry', [['guard.checkedAt = guard.used;', 'guard.used = 0;']]);
add('W19 the refusal flag is cleared at entry', [['guard.checkedAt = guard.used;', 'guard.checkedAt = guard.used; guard.capped = false;']]);
add('W20 a refusal is read as the budget', [["if (err === WORK_CAP) capHit = 'work';", 'if (err === WORK_CAP) capHit = null;']]);
add('W21 a refusal is read as a record cap', [["if (err === WORK_CAP) capHit = 'work';", "if (err === WORK_CAP) capHit = 'records';"]]);
add('W22 every error is swallowed', [["else if (!(err && err.code === 'budget.exceeded')) throw err;", 'else if (false) throw err;']]);
add('W23 cancellation is swallowed too', [["else if (!(err && err.code === 'budget.exceeded')) throw err;", "else if (!(err && (err.code === 'budget.exceeded' || err.code === 'budget.cancelled'))) throw err;"]]);
add('W24 a spent budget propagates', [["else if (!(err && err.code === 'budget.exceeded')) throw err;", 'else if (true) throw err;']]);
add('W25 a thrown null is not rethrown as it is', [["else if (!(err && err.code === 'budget.exceeded')) throw err;", "else if (!(err.code === 'budget.exceeded')) throw err;"]]);
add('W26 the default work limit is the record limit', [["limit: limit === undefined ? LIMITS.work : wholeLimit(limit, 'workLimit'),", "limit: limit === undefined ? LIMITS.records : wholeLimit(limit, 'workLimit'),"]]);
add('W27 a new guard is marked capped', [['      capped: false' + NL + '    };', '      capped: true' + NL + '    };']]);
add('W28 a new guard has used 1', [['      used: 0,', '      used: 1,']]);
add('W29 a new guard has a check mark of 1', [['      checkedAt: 0,', '      checkedAt: 1,']]);
add('W30 a fractional work limit is rounded', [['return Math.floor(value);', 'return Math.round(value);']]);
add('W31 a fractional work limit is not floored', [['return Math.floor(value);', 'return value;']]);
add('W32 a limit of 0 is refused', [['if (!Number.isFinite(value) || value < 0) {', 'if (!Number.isFinite(value) || value <= 0) {']]);
add('W33 a negative limit is allowed', [['if (!Number.isFinite(value) || value < 0) {', 'if (!Number.isFinite(value)) {']]);
add('W34 an infinite limit is allowed', [['if (!Number.isFinite(value) || value < 0) {', 'if (value < 0) {']]);
add('W35 a refusal throws another error', [['if (!spend(frame.work, frame.ctx)) throw WORK_CAP;', 'if (!spend(frame.work, frame.ctx)) throw new Error("refused");']]);

// ---- V: the guard and the option checks
add('V01 a guard without the refusal flag is accepted', [["typeof work.capped !== 'boolean'", 'false']]);
add('V02 a guard may have used more than its limit', [['work.used > work.limit || ', '']]);
add('V03 a guard may have a check mark ahead of its use', [['work.checkedAt > work.used ||', 'false ||']]);
add('V04 a null guard is not checked', [['work === null || ', '']]);
add('V05 a guard of another type is accepted', [["typeof work !== 'object' || ", '']]);
add('V06 a fractional count is a count', [['function isCount(x) { return Number.isInteger(x) && x >= 0; }', 'function isCount(x) { return Number.isFinite(x) && x >= 0; }']]);
add('V07 a negative count is a count', [['function isCount(x) { return Number.isInteger(x) && x >= 0; }', 'function isCount(x) { return Number.isInteger(x); }']]);
add('V08 limits may be null', [["if (limits === null || typeof limits !== 'object') throw invalidOption('limits', 'must be an object');", "if (typeof limits !== 'object') throw invalidOption('limits', 'must be an object');"]]);
add('V09 limits may be any value', [["if (limits === null || typeof limits !== 'object') throw invalidOption('limits', 'must be an object');", "if (limits === null) throw invalidOption('limits', 'must be an object');"]]);
add('V10 the record limit is not read', [["['cells', 'records'].forEach(function (key) {", "['cells'].forEach(function (key) {"]]);
add('V11 the cell limit is not read', [["['cells', 'records'].forEach(function (key) {", "['records'].forEach(function (key) {"]]);
add('V12 the option error has another code', [["new SG.errors.GenerationError('solver.invalidOption', { option: 'alsPatterns.' + key });", "new SG.errors.GenerationError('solver.invalid', { option: 'alsPatterns.' + key });"]]);
add('V13 an absent limits object is an error', [['if (limits === undefined) return out;', 'if (false) return out;']]);

// ---- G: geometry
add('G01 the last unit is skipped', [['for (let u = 0; u < model.units.length; u++) {', 'for (let u = 0; u < model.units.length - 1; u++) {']]);
add('G02 the first unit is skipped', [['for (let u = 0; u < model.units.length; u++) {', 'for (let u = 1; u < model.units.length; u++) {']]);
add('G03 only complete units', [['const cells = model.units[u];', 'const cells = model.units[u].length === model.digits ? model.units[u] : [];']]);
add('G04 only rows, columns and boxes', [['const cells = model.units[u];', "const cells = ['row', 'col', 'box'].indexOf(model.unitMeta[u].kind) === -1 ? [] : model.units[u];"]]);
add('G05 cages are not units', [['const cells = model.units[u];', "const cells = model.unitMeta[u].kind === 'cage' ? [] : model.units[u];"]]);
add('G06 diagonals and windows are not units', [['const cells = model.units[u];', "const cells = ['diag', 'window'].indexOf(model.unitMeta[u].kind) !== -1 ? [] : model.units[u];"]]);
add('G07 regions are not units', [['const cells = model.units[u];', "const cells = model.unitMeta[u].kind === 'region' ? [] : model.units[u];"]]);
add('G08 only rows and columns', [['const cells = model.units[u];', "const cells = ['row', 'col'].indexOf(model.unitMeta[u].kind) === -1 ? [] : model.units[u];"]]);

// ---- S: ownership, immutability, cache
add('S01 the tables are remembered per state object', [['const tables = [];', 'if (STALE.has(state)) return STALE.get(state);' + NL + '    const tables = [];' + NL + '    STALE.set(state, tables);'],
  ['const CHECK_UNITS = 256;', 'const CHECK_UNITS = 256;' + NL + '  const STALE = new WeakMap();']]);
add('S02 the digit lists are shared between records', [['const digits = SG.bits.toArray(union);', 'const digits = SHARED[union] || (SHARED[union] = SG.bits.toArray(union));'],
  ['const CHECK_UNITS = 256;', 'const CHECK_UNITS = 256;' + NL + '  const SHARED = {};']]);
add('S03 the unit of the model is sorted in place', [['open.sort(numeric);', 'open.sort(numeric);' + NL + '      cells.sort(numeric);']]);
add('S04 the state is written', [['complete = capHit === null;', 'complete = capHit === null;' + NL + '      state.unsolvedCount += 1;']]);
add('S05 the context is written', [['const guard = checkedWork(work);', 'const guard = checkedWork(work);' + NL + '    ctx.visited = true;']]);
add('S06 the records are remembered for the next call', [['return { records: records, complete: complete, capHit: capHit };', 'LAST.push(records);' + NL + '    return { records: records, complete: complete, capHit: capHit };'],
  ['const CHECK_UNITS = 256;', 'const CHECK_UNITS = 256;' + NL + '  const LAST = [];']]);
add('S07 the model is written', [['const guard = checkedWork(work);', 'const guard = checkedWork(work);' + NL + '    model.touched = true;']]);

module.exports = MUTATIONS;
