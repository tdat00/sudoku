'use strict';

/*
 * MS14a: the in-memory mutations of the law-of-leftovers kernel in core/js/engine/tech-subset.js (IR72 F1). Each entry replaces
 * text fragments of that file in memory (run-mutations.cjs / mutant-run.cjs load the Generator's runner with a patched
 * fs.readFileSync, so no file on disk changes) and the tests of the kernel (--suite=tech-subset --filter="law of leftovers")
 * must fail. `edits` is a list of { from, to }: every `from` has to occur exactly once in the file (check-mutations.cjs).
 * `equivalent` names the argument for a mutation that cannot change a result; such a mutation is expected to survive.
 *
 *   geometry (G), signatures and multisets (S), fixed digits (F), support and intersection (I), output (O),
 *   work limit, budget and cancellation (B), ownership and state (X)
 */
const TARGET = 'core/js/engine/tech-subset.js';
const list = [];
function m(name, from, to, extra) {
  const edits = Array.isArray(from) ? from : [{ from: from, to: to }];
  list.push(Object.assign({ name: name, target: TARGET, edits: edits, app: 'generator', suites: 'tech-subset',
    filter: 'law of leftovers' }, extra || {}));
}
const CRLF = '\r\n';

// ---- geometry
m('G01 incomplete units accepted', 'if (ctx.completeUnits[u] !== 1) continue;', 'if (false) continue;');
m('G02 a unit of another kind taken as a row', "if (kind === 'row') rows.push(u);", "if (kind === 'row' || kind === 'diag') rows.push(u);");
m('G03 every other kind taken as a region', "else if (kind === 'region') regions.push(u);", 'else regions.push(u);');
m('G04 a box taken as a region', "else if (kind === 'region') regions.push(u);", "else if (kind === 'region' || kind === 'box') regions.push(u);");
m('G05 columns never taken', "else if (kind === 'col') cols.push(u);", "else if (kind === 'col') { /* none */ }");
m('G06 rows never taken', "if (kind === 'row') rows.push(u);", "if (kind === 'row') { /* none */ }");
m('G07 one unit per side at most', 'for (let n = 1; n <= LEFTOVER_LIMITS.units; n++) {', 'for (let n = 1; n <= 1; n++) {');
m('G08 three units per side', 'for (let n = 1; n <= LEFTOVER_LIMITS.units; n++) {', 'for (let n = 1; n <= 3; n++) {');
m('G09 five cells left over allowed', 'if (cellsA.length > LEFTOVER_LIMITS.cells) return null;', 'if (cellsA.length > 5) return null;');
m('G10 three cells left over at most', 'if (cellsA.length > LEFTOVER_LIMITS.cells) return null;', 'if (cellsA.length > 3) return null;');
m('G12 no limit of cells', 'if (cellsA.length > LEFTOVER_LIMITS.cells) return null;', '');
m('G13 a choice with no open cell is examined', 'if (sideA.open + sideB.open === 0) return null;', '');
m('G14 overlapping units accepted on a side', 'if (!free) continue;', '');
m('G15 marks of a unit kept after its subtree', 'for (k = 0; k < cells.length; k++) mark[cells[k]] = 0;', '');
m('G16 units that cannot complete the side are tried', 'const last = pool.length - (frame.n - depth);', 'const last = pool.length - 1;');
m('G17 the line side leaves the shared cells (condition reversed)', 'if (frame.inRegion[line[k]] === 0) cellsA.push(line[k]);',
  'if (frame.inRegion[line[k]] !== 0) cellsA.push(line[k]);');
m('G18 the region side keeps the shared cells', 'if (frame.inLine[region[k]] === 0) cellsB.push(region[k]);',
  'cellsB.push(region[k]);');
m('G19 only the first unit of each side counts', 'for (i = 0; i < frame.n; i++) {', 'for (i = 0; i < 1; i++) {');
m('G20 the cells of a side are not sorted', 'return leftoverConclusion(frame, cellsA.sort(numeric), cellsB.sort(numeric));',
  'return leftoverConclusion(frame, cellsA, cellsB);');
m('G21 no scope guard', 'if (model.variantId === LEFTOVER_VARIANT) found = scanLeftovers(model, state, ctx, run);',
  'found = scanLeftovers(model, state, ctx, run);');
m('G22 another scope id', "const LEFTOVER_VARIANT = 'jigsaw9';", "const LEFTOVER_VARIANT = 'jigsaw';");
m('G23 columns before rows', 'chooseLeftoverUnits(frame, orientation === 0 ? rows : cols, frame.inLine,',
  'chooseLeftoverUnits(frame, orientation === 0 ? cols : rows, frame.inLine,');
m('G24 two units before one', 'for (let n = 1; n <= LEFTOVER_LIMITS.units; n++) {', 'for (let n = LEFTOVER_LIMITS.units; n >= 1; n--) {');

// ---- signatures, multisets and fixed digits
m('S01 signature is the set of digits (bitset)', 'walk(position + 1, key + weights[digit]);', 'walk(position + 1, key | (1 << digit));');
m('S02 signature weight 2^d', 'weights.push(Math.pow(SIGNATURE_RADIX, d));', 'weights.push(Math.pow(2, d));');
m('S03 signature is the sum of the digits', 'weights.push(Math.pow(SIGNATURE_RADIX, d));', 'weights.push(d + 1);');
m('S04 radix of the cells limit, not one more', 'const SIGNATURE_RADIX = LEFTOVER_LIMITS.cells + 1;',
  'const SIGNATURE_RADIX = LEFTOVER_LIMITS.cells;', { equivalent: 'a side holds a digit at most once per unit, so at most n <= 2 times; radix 4 keeps every count below it' });
m('S05 radix 2', 'const SIGNATURE_RADIX = LEFTOVER_LIMITS.cells + 1;', 'const SIGNATURE_RADIX = 2;');
m('F01 a fixed cell takes its candidate mask', 'masks[i] = 1 << (state.value[c] - 1);', 'masks[i] = state.candidates[c];');
m('F02 fixed and open cells swapped', 'if (state.value[c] !== 0) {', 'if (state.value[c] === 0) {');
m('F03 no peers inside a side', 'if (model.peers[c].indexOf(cells[q]) !== -1) seen[i] |= 1 << q;', '');
m('F04 only the first cell of a side is a peer', 'for (let q = 0; q < position && !clash; q++) {', 'for (let q = 0; q < Math.min(position, 1) && !clash; q++) {');
m('F05 every cell of a side counts as a peer', 'clash = (side.seen[position] & (1 << q)) !== 0 && chosen[q] === digit;', 'clash = chosen[q] === digit;');
m('F06 a clash is not skipped', 'if (clash) continue;', '');

// ---- support and intersection
m('I01 the line side keeps the support of unmatched signatures', 'if (takenB === undefined) return;',
  'if (takenB === undefined) { for (let i = 0; i < takenA.length; i++) supportA[i] |= takenA[i]; return; }');
m('I02 the region side keeps the support of unmatched signatures', 'if (shared === 0) return LEFTOVER_DECLINED;',
  'tableB.forEach(function (t) { for (let j = 0; j < t.length; j++) supportB[j] |= t[j]; }); if (shared === 0) return LEFTOVER_DECLINED;');
m('I03 only the first shared signature supports', 'shared++;', 'if (shared++ > 0) return;');
m('I04 an empty intersection skips the choice', 'if (shared === 0) return LEFTOVER_DECLINED;', 'if (shared === 0) return null;');
m('I05 an empty intersection removes every candidate', 'if (shared === 0) return LEFTOVER_DECLINED;', '');
m('I06 the supported candidates are removed', 'for (let lost = state.candidates[c] & ~pair[1][i]; lost !== 0; lost &= lost - 1) {',
  'for (let lost = state.candidates[c] & pair[1][i]; lost !== 0; lost &= lost - 1) {');
m('I07 solved cells are listed in the eliminations', 'if (state.value[c] !== 0) continue;', '');
m('I08 digit off by one', 'eliminations.push([c, lowestBitIndex(lost) + 1]);', 'eliminations.push([c, lowestBitIndex(lost)]);');
m('I09 a Finding without eliminations is returned', 'if (eliminations.length === 0) return null;', '');
m('I10 the support of a signature is not kept per cell (all cells share the first)', 'for (let i = 0; i < count; i++) support[i] |= 1 << chosen[i];',
  'for (let i = 0; i < count; i++) support[i] |= 1 << chosen[0];');

// ---- output
m('O01 eliminations by digit, then cell', 'eliminations.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });',
  'eliminations.sort(function (x, y) { return x[1] - y[1] || x[0] - y[0]; });');
m('O02 eliminations unsorted', 'eliminations.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });', '');
m('O03 cells unsorted', 'const cells = cellsA.concat(cellsB).sort(numeric);', 'const cells = cellsA.concat(cellsB);');
m('O04 digits unsorted', 'digits: digits.sort(numeric)', 'digits: digits');
m('O05 digits repeated', 'if (digits.indexOf(e[1]) === -1) digits.push(e[1]);', 'digits.push(e[1]);');
m('O06 numbers sorted as text', 'function numeric(a, b) { return a - b; }', 'function numeric(a, b) { return String(a) < String(b) ? -1 : 1; }');
m('O07 lines named by the regions', 'lines: frame.lineUnits.map(', 'lines: frame.regionUnits.map(');
m('O08 another step key', "i18nKey: 'technique.' + LEFTOVER_ID + '.step',", "i18nKey: 'technique.' + LEFTOVER_ID + '.desc',");
m('O09 another technique id', 'technique: LEFTOVER_ID,', "technique: 'leftovers',");
m('O10 placements not empty', ['cells: cells,', CRLF, '      placements: [],'].join(''), ['cells: cells,', CRLF, '      placements: [[0, 1]],'].join(''));
m('O11 cells as numbers in the arguments', 'cells: cells.map(function (c) { return SG.model.cellLabel(model, c); }),', 'cells: cells,');

// ---- work limit, budget and cancellation
m('B01 limit allows one unit more', 'if (run.work >= run.limit) throw LEFTOVER_CAP;', 'if (run.work > run.limit) throw LEFTOVER_CAP;');
m('B02 limit stops one unit early', 'if (run.work >= run.limit) throw LEFTOVER_CAP;', 'if (run.work + 1 >= run.limit) throw LEFTOVER_CAP;');
m('B03 default limit 49999', 'work: 50000 });', 'work: 49999 });');
m('B04 budget checked one unit early', 'if (run.work + 1 - run.checkedAt > LEFTOVER_CHECK_UNITS) {', 'if (run.work + 1 - run.checkedAt >= LEFTOVER_CHECK_UNITS) {');
m('B05 budget checked one unit late', 'if (run.work + 1 - run.checkedAt > LEFTOVER_CHECK_UNITS) {', 'if (run.work + 1 - run.checkedAt > LEFTOVER_CHECK_UNITS + 1) {');
m('B06 check every 255 units', 'const LEFTOVER_CHECK_UNITS = 256;', 'const LEFTOVER_CHECK_UNITS = 255;');
m('B07 check every 512 units', 'const LEFTOVER_CHECK_UNITS = 256;', 'const LEFTOVER_CHECK_UNITS = 512;');
m('B08 the check position is not remembered', 'run.checkedAt = run.work;', '');
m('B09 no check at entry', ['try {', CRLF, '      ctx.check();'].join(''), 'try {');
m('B10 every error swallowed', "else if (!(err && err.code === 'budget.exceeded')) throw err;", 'else if (false) throw err;');
m('B11 cancellation swallowed', "else if (!(err && err.code === 'budget.exceeded')) throw err;",
  "else if (!(err && (err.code === 'budget.exceeded' || err.code === 'budget.cancelled'))) throw err;");
m('B12 a spent budget propagates', "else if (!(err && err.code === 'budget.exceeded')) throw err;", 'else throw err;');
m('B13 a spent limit is not reported', "if (err === LEFTOVER_CAP) run.capped = true;", "if (err === LEFTOVER_CAP) run.capped = false;");
m('B14 capHit inverted', "capHit: run.capped ? 'work' : null,", "capHit: run.capped ? null : 'work',");
m('B15 capHit always work', "capHit: run.capped ? 'work' : null,", "capHit: 'work',");
m('B16 retained is a list', 'retained: null', 'retained: []');
m('B17 work recorded one more', 'work: run.work,', 'work: run.work + 1,');
m('B18 default limit recorded', ['limit: limit,', CRLF, '        capHit'].join(''), ['limit: LEFTOVER_LIMITS.work,', CRLF, '        capHit'].join(''));
m('B19 fractional limit not floored', 'limit = Math.floor(given);', 'limit = given;');
m('B20 fractional limit rounded up', 'limit = Math.floor(given);', 'limit = Math.ceil(given);');
m('B21 infinite or NaN limit accepted', "typeof given !== 'number' || !Number.isFinite(given) || given < 0", "typeof given !== 'number' || given < 0");
m('B22 a limit of 0 rejected', "typeof given !== 'number' || !Number.isFinite(given) || given < 0", "typeof given !== 'number' || !Number.isFinite(given) || given <= 0");
m('B23 a limit of 0 ignored', 'if (given !== undefined) {', 'if (given) {');
m('B24 options required', 'const given = opts === undefined || opts === null ? undefined : opts.workLimit;', 'const given = opts.workLimit;');
m('B25 the counter outlives the call', 'const run = { ctx: ctx, limit: limit, work: 0, checkedAt: 0, capped: false };',
  'globalThis.__lo = globalThis.__lo || { work: 0, checkedAt: 0 }; const run = Object.assign(globalThis.__lo, { ctx: ctx, limit: limit, capped: false });');
m('B26 unit tries not counted', '      spendLeftover(frame.run);', '');
m('B27 digit tries not counted', '        spendLeftover(run);', '');
m('B28 rejected digits not counted', 'if (clash) continue;', 'if (clash) { run.work--; continue; }');
m('B29 no record of a spent limit', "if (typeof observer === 'function') {", "if (typeof observer === 'function' && !run.capped) {");
m('B30 another id in the record', 'id: LEFTOVER_ID,', "id: 'leftovers',");
m('B31 the context options are required', 'const observer = ctx.options ? ctx.options.onPatternWork : undefined;', 'const observer = ctx.options.onPatternWork;');

// ---- ownership and state
m('X01 the state is written', 'eliminations.push([c, lowestBitIndex(lost) + 1]);',
  'eliminations.push([c, lowestBitIndex(lost) + 1]); state.candidates[c] &= ~(lost & -lost);');
m('X02 the placements array is shared between calls', ['cells: cells,', CRLF, '      placements: [],'].join(''),
  ['cells: cells,', CRLF, '      placements: (globalThis.__lop = globalThis.__lop || []),'].join(''));
m('X03 the signature table is shared between calls', 'const table = new Map();', 'const table = (globalThis.__lot = globalThis.__lot || new Map());');
m('X04 an answer is remembered per state object', [
  { from: 'const run = { ctx: ctx, limit: limit, work: 0, checkedAt: 0, capped: false };',
    to: 'globalThis.__lom = globalThis.__lom || new WeakMap(); if (globalThis.__lom.has(state)) return globalThis.__lom.get(state); const run = { ctx: ctx, limit: limit, work: 0, checkedAt: 0, capped: false };' },
  { from: '    return found;' + CRLF + '  }' + CRLF + CRLF + '  SG.leftoverPatterns', to: '    globalThis.__lom.set(state, found);' + CRLF + '    return found;' + CRLF + '  }' + CRLF + CRLF + '  SG.leftoverPatterns' }
]);
m('X05 the marks of the sides outlive the call', 'inLine: new Uint8Array(model.cellCount), inRegion: new Uint8Array(model.cellCount)',
  'inLine: (globalThis.__lil = globalThis.__lil || new Uint8Array(model.cellCount)), inRegion: (globalThis.__lir = globalThis.__lir || new Uint8Array(model.cellCount))');
m('X06 the cells of the Finding are the unit cells', ['cells: cells,', CRLF, '      placements: [],'].join(''),
  ['cells: frame.lineUnits,', CRLF, '      placements: [],'].join(''));

module.exports = list;
