'use strict';

/*
 * MS16 scratch: the in-memory mutants. One list in three sets, in this order:
 *   sdc   the Sue de Coq finder findSueDeCoq and its registration (this task's own mutants), three of the other files (weight,
 *         locale packs);
 *   xz    MS15b's 73 ALS-XZ finder mutants, re-run because tech-als.js changed: the 18 whose fragment no longer occurs exactly once
 *         (the two finders share statements) are anchored to findXz's own neighbouring text with the same intent (the NL + six
 *         spaces anchors do not match the eight-space lines of findSueDeCoq), and S01 / S02, whose fragment was the seam that is now
 *         the shared finderSeam, are replaced by the seam mutants S01-S03 of the sdc set (the same intents on the shared seam);
 *   enum  MS15a's 131 enumerator mutants, unchanged except W14, whose fragment is anchored to spend (checkpoint repeats the statement).
 * Each entry is { set, name, target, edits: [{ from, to }], runs: [{ app, suites, filter? }] }; every `from` must occur EXACTLY once in
 * its target (check-mutations.cjs checks it). The file on disk is never changed: mutant-hook.cjs serves the edited text for that one
 * path. A mutant is DETECTED when a run fails (--bail). `equivalent` (a string) marks a mutant expected not to be detected, with the
 * non-circular reason (given in the evidence).
 */
const NL = '\r\n';
const ALS = 'core/js/engine/tech-als.js';
const RUN_SDC = [{ app: 'generator', suites: 'tech-als', filter: 'sue-de-coq' }];
const RUN_ALS = [{ app: 'generator', suites: 'tech-als' }];

const MUTATIONS = [];
function add(set, name, target, runs, edits, extra) {
  MUTATIONS.push(Object.assign({ set, name, target, edits: edits.map(([from, to]) => ({ from, to })), runs }, extra || {}));
}
function sdc(name, edits, extra) { add('sdc', name, ALS, RUN_SDC, edits, extra); }

const OBS = NL + '        retained: retained' + NL + '      });' + NL + '    }' + NL + '    return found;' + NL + '  }' + NL + NL +
  '  SG.alsPatterns = {';
const CAP = "capHit: work.capped ? 'work' : recordsCut ? 'records' : null,";
const OBS_HEAD = 'id: SDC_ID,' + NL + '        work: work.used,' + NL + '        limit: work.limit,' + NL + '        ' + CAP;

// ---- R: registration and the exported API
sdc('R01 order 194 (a tie with alsXz)', [['order: 196,', 'order: 194,']]);
sdc('R02 order 198 (a tie with forcingChainLong)', [['order: 196,', 'order: 198,']]);
sdc('R03 base cost 106 (a tie with alsXz)', [['baseCost: 112,', 'baseCost: 106,']]);
sdc('R04 base cost 118 (a tie with forcingChainLong)', [['baseCost: 112,', 'baseCost: 118,']]);
sdc('R05 group fish', [["group: 'chain'," + NL + '      baseCost: 112,', "group: 'fish'," + NL + '      baseCost: 112,']]);
sdc('R06 scoped to classic9', [["i18nKey: 'technique.' + SDC_ID," + NL + '      variantScope: null,',
  "i18nKey: 'technique.' + SDC_ID," + NL + "      variantScope: ['classic9'],"]]);
sdc('R07 assumes uniqueness', [['assumesUniqueness: false,' + NL + '      find: function (model, state, ctx) { return findSueDeCoq(',
  'assumesUniqueness: true,' + NL + '      find: function (model, state, ctx) { return findSueDeCoq(']]);
sdc('R08 the registered finder forwards a fourth argument', [['find: function (model, state, ctx) { return findSueDeCoq(model, state, ctx); }',
  'find: function (model, state, ctx, opts) { return findSueDeCoq(model, state, ctx, opts); }']]);
sdc('R09 registered without the guard against a second load', [['if (!SG.techniques.has(SDC_ID)) {', 'if (true) {']]);
sdc('R10 id spelled sueDecoq', [["const SDC_ID = 'sueDeCoq';", "const SDC_ID = 'sueDecoq';"]]);
sdc('R11 findSueDeCoq not exported', [['    findSueDeCoq: findSueDeCoq,' + NL, '']]);

// ---- S: the seam of the tests (finderSeam is shared by both finders)
sdc('S01 a null opts is accepted', [["if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {",
  "if (typeof opts !== 'object' || Array.isArray(opts)) {"]]);
sdc('S02 a non-object opts is accepted', [["if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {",
  'if (opts === null || Array.isArray(opts)) {']]);
sdc('S03 an array opts is accepted', [["if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {",
  "if (opts === null || typeof opts !== 'object') {"]]);
sdc('S04 the work limit of opts is ignored', [['const work = createWork(seam.workLimit === undefined ? SDC_WORK_LIMIT : seam.workLimit);',
  'const work = createWork(SDC_WORK_LIMIT);']]);
sdc('S05 the default allowance is LIMITS.work, not its own constant', [['seam.workLimit === undefined ? SDC_WORK_LIMIT : seam.workLimit',
  'seam.workLimit === undefined ? LIMITS.work : seam.workLimit']],
  { equivalent: 'SDC_WORK_LIMIT and LIMITS.work are both the number 50000 (two const bindings of the same literal value), so the expression has the same value in every call' });
sdc('S06 a work limit of 0 is read as absent', [['seam.workLimit === undefined ? SDC_WORK_LIMIT : seam.workLimit',
  'seam.workLimit || SDC_WORK_LIMIT']]);
sdc('S07 the limits of opts are not forwarded to the enumeration', [['        const enumerated = enumerate(model, state, ctx, work, seam.limits);',
  '        const enumerated = enumerate(model, state, ctx, work);']]);
sdc('S08 an explicit limits override is not checked before the geometry', [['    resolveLimits(seam.limits);' + NL, '']]);

// ---- G: the roles of the units and the geometry
sdc('G01 a column is not a line', [["if (kind === 'row' || kind === 'col') roles[u] = SDC_LINE;", "if (kind === 'row') roles[u] = SDC_LINE;"]]);
sdc('G02 a row is not a line', [["if (kind === 'row' || kind === 'col') roles[u] = SDC_LINE;", "if (kind === 'col') roles[u] = SDC_LINE;"]]);
sdc('G03 a region is not a box', [["else if (kind === 'box' || kind === 'region') roles[u] = SDC_BOX;", "else if (kind === 'box') roles[u] = SDC_BOX;"]]);
sdc('G04 a box is not a box (regions only)', [["else if (kind === 'box' || kind === 'region') roles[u] = SDC_BOX;", "else if (kind === 'region') roles[u] = SDC_BOX;"]]);
sdc('G05 a window is a box', [["else if (kind === 'box' || kind === 'region') roles[u] = SDC_BOX;",
  "else if (kind === 'box' || kind === 'region' || kind === 'window') roles[u] = SDC_BOX;"]]);
sdc('G06 every unit that is not a box is a line', [["if (kind === 'row' || kind === 'col') roles[u] = SDC_LINE;",
  "if (kind !== 'box' && kind !== 'region') roles[u] = SDC_LINE;"]]);
sdc('G07 every unit that is not a line is a box', [["else if (kind === 'box' || kind === 'region') roles[u] = SDC_BOX;", 'else roles[u] = SDC_BOX;']]);
sdc('G08 a solved cell counts as an open shared cell', [['        if (state.value[c] !== 0) continue;' + NL + '        const us = model.cellUnits[c];',
  '        const us = model.cellUnits[c];']]);
sdc('G09 one shared cell makes a pair', [['if (list.length >= 2) pairs.push(', 'if (list.length >= 1) pairs.push(']]);
sdc('G10 three shared cells are needed', [['if (list.length >= 2) pairs.push(', 'if (list.length >= 3) pairs.push(']]);
sdc('G11 pairs ordered box first', [['a.line - b.line || a.box - b.box', 'a.box - b.box || a.line - b.line']]);
sdc('G12 pairs not ordered', [['return pairs.sort(function (a, b) { return a.line - b.line || a.box - b.box; });', 'return pairs;']]);
sdc('G13 the cells of a box are not sorted', [['const cells = Array.from(model.units[v]).sort(numeric);', 'const cells = Array.from(model.units[v]);']]);
sdc('G14 a visited box cell is not charged', [['        chargeSdc(work, ctx);' + NL + '        const c = cells[i];', '        const c = cells[i];']]);
sdc('G15 only the open box cells are charged', [['        chargeSdc(work, ctx);' + NL + '        const c = cells[i];' + NL + '        if (state.value[c] !== 0) continue;',
  '        const c = cells[i];' + NL + '        if (state.value[c] !== 0) continue;' + NL + '        chargeSdc(work, ctx);']]);
sdc('G16 only the first unit of a cell is read as a line', [['for (let k = 0; k < us.length; k++) {' + NL + '          if (roles[us[k]] !== SDC_LINE) continue;',
  'for (let k = 0; k < 1; k++) {' + NL + '          if (roles[us[k]] !== SDC_LINE) continue;']]);
sdc('G17 every unit of a cell is a line', [['          if (roles[us[k]] !== SDC_LINE) continue;' + NL, '']]);

// ---- K: the classification of the records
sdc('K01 the digit mask is shifted by one', [['mask |= 1 << (record.digits[k] - 1);', 'mask |= 1 << record.digits[k];']]);
sdc('K02 holdsAll tests the first cell too', [['for (let k = 1; k < cells.length; k++) {' + NL + '      if (model.cellUnits[cells[k]]',
  'for (let k = 0; k < cells.length; k++) {' + NL + '      if (model.cellUnits[cells[k]]']],
  { equivalent: 'the unit u tested comes from model.cellUnits[record.cells[0]] (the loop over `first` in sdcClassify), so the first cell always holds u and the extra test cannot fail' });
sdc('K03 holdsAll tests the second cell only', [['for (let k = 1; k < cells.length; k++) {' + NL + '      if (model.cellUnits[cells[k]]',
  'for (let k = 1; k < 2 && k < cells.length; k++) {' + NL + '      if (model.cellUnits[cells[k]]']]);
sdc('K04 a unit that is neither line nor box also gets home lists', [['if (roles[u] === 0 || !holdsAll(model, u, record.cells)) continue;',
  'if (!holdsAll(model, u, record.cells)) continue;']],
  { equivalent: 'a unit with role 0 is stored under its own key in boxHomes; the lists are read only with pair.box (a unit of role SDC_BOX) and pair.line (SDC_LINE), so an entry under any other key is never read, and the classification charges one unit per record whatever the number of its homes' });
sdc('K05 the line and the box lists are swapped', [['const homes = roles[u] === SDC_LINE ? lineHomes : boxHomes;', 'const homes = roles[u] === SDC_LINE ? boxHomes : lineHomes;']]);
sdc('K06 a record is a home of every unit of its first cell', [['if (roles[u] === 0 || !holdsAll(model, u, record.cells)) continue;',
  'if (roles[u] === 0) continue;']]);
sdc('K07 a classified record is not charged', [['      chargeSdc(work, ctx);' + NL + '      const record = records[i];', '      const record = records[i];']]);
sdc('K08 the records are classified from the end', [['    for (let i = 0; i < records.length; i++) {' + NL + '      chargeSdc(work, ctx);' + NL + '      const record = records[i];',
  '    for (let i = records.length - 1; i >= 0; i--) {' + NL + '      chargeSdc(work, ctx);' + NL + '      const record = records[i];']]);
sdc('K09 the size of a record is its digit count', [['size: record.cells.length }', 'size: record.digits.length }']]);

// ---- O: the outside lists
sdc('O01 the records inside the other unit are kept', [['outside = !other.has(cells[k]);', 'outside = other.has(cells[k]);']]);
sdc('O02 only the first cell of a record is tested', [['for (let k = 0; k < cells.length && outside; k++) outside', 'for (let k = 0; k < 1 && outside; k++) outside']]);
sdc('O03 the last cell of a record decides', [['for (let k = 0; k < cells.length && outside; k++) outside = !other.has(cells[k]);',
  'for (let k = 0; k < cells.length; k++) outside = !other.has(cells[k]);']]);
sdc('O04 a tested home record is not charged', [['    for (let i = 0; i < homes.length; i++) {' + NL + '      chargeSdc(work, ctx);', '    for (let i = 0; i < homes.length; i++) {']]);
sdc('O05 the A side is tested against the line', [['classes.lineHomes.get(pair.line), scope.inBox),', 'classes.lineHomes.get(pair.line), scope.inLine),']]);
sdc('O06 the B side is tested against the box', [['classes.boxHomes.get(pair.box), scope.inLine)', 'classes.boxHomes.get(pair.box), scope.inBox)']]);
sdc('O07 a pair without an A or a B is searched', [['      if (sides.a.length === 0 || sides.b.length === 0) continue;' + NL, '']]);
sdc('O08 only a missing A ends the pair', [['if (sides.a.length === 0 || sides.b.length === 0) continue;', 'if (sides.a.length === 0) continue;']]);
sdc('O09 only a missing B ends the pair', [['if (sides.a.length === 0 || sides.b.length === 0) continue;', 'if (sides.b.length === 0) continue;']]);

// ---- T: the tuples
sdc('T01 two-cell I only', [['for (let size = 2; size <= 3 && size <= pair.shared.length; size++) {', 'for (let size = 2; size <= 2 && size <= pair.shared.length; size++) {']]);
sdc('T02 four-cell I allowed', [['for (let size = 2; size <= 3 && size <= pair.shared.length; size++) {', 'for (let size = 2; size <= 4 && size <= pair.shared.length; size++) {']]);
sdc('T03 three-cell I only', [['for (let size = 2; size <= 3 &&', 'for (let size = 3; size <= 3 &&']]);
sdc('T04 a size above the shared cells is walked', [['for (let size = 2; size <= 3 && size <= pair.shared.length; size++) {', 'for (let size = 2; size <= 3; size++) {']],
  { equivalent: 'for size > shared.length, sdcEachTuple runs walk(0, 0) with the bound i <= cells.length - size, which is negative, so no tuple is visited, nothing is charged and null is returned: the same as skipping the call' });
sdc('T05 a cell may repeat in a tuple', [['walk(depth + 1, i + 1)', 'walk(depth + 1, i)']]);
sdc('T06 the last tuple is missed', [['for (let i = from; i <= cells.length - (size - depth); i++) {', 'for (let i = from; i < cells.length - (size - depth); i++) {']]);
sdc('T07 the walk ends after the first tuple', [['        if (out !== null) return out;', '        return out;']]);
sdc('T08 three-cell I before two-cell I', [['for (let size = 2; size <= 3 && size <= pair.shared.length; size++) {', 'for (let size = 3; size >= 2; size--) {']]);

// ---- V: the witness conditions
sdc('V01 C is the candidates of the first cell of I', [['for (let k = 0; k < tuple.length; k++) union |= state.candidates[tuple[k]];',
  'for (let k = 0; k < 1; k++) union |= state.candidates[tuple[k]];']]);
sdc('V02 the digits inside C are not tested', [['if ((classes.info[side[i]].mask & ~union) === 0) candidates', 'if (true) candidates']]);
sdc('V03 the digits inside C test is inverted', [['if ((classes.info[side[i]].mask & ~union) === 0) candidates', 'if ((classes.info[side[i]].mask & ~union) !== 0) candidates']]);
sdc('V04 overlapping digits of A and B are allowed', [['if ((a.mask & b.mask) !== 0 || total !== tuple.length + a.size + b.size) continue;',
  'if (total !== tuple.length + a.size + b.size) continue;']]);
sdc('V05 |C| below |I| + p + q is allowed', [['total !== tuple.length + a.size + b.size', 'total > tuple.length + a.size + b.size']]);
sdc('V06 |C| above |I| + p + q is allowed', [['total !== tuple.length + a.size + b.size', 'total < tuple.length + a.size + b.size']]);
sdc('V07 A counts as one cell', [['total !== tuple.length + a.size + b.size', 'total !== tuple.length + 1 + b.size']]);
sdc('V08 B counts as one cell', [['total !== tuple.length + a.size + b.size', 'total !== tuple.length + a.size + 1']]);
sdc('V09 Z keeps the digits of A', [['const zMask = union & ~a.mask & ~b.mask;', 'const zMask = union & ~b.mask;']]);
sdc('V10 Z is always empty', [['const zMask = union & ~a.mask & ~b.mask;', 'const zMask = 0;']]);
sdc('V11 the cells of B may be targets', [['const proving = new Set(tuple.concat(a.record.cells, b.record.cells));', 'const proving = new Set(tuple.concat(a.record.cells));']]);
sdc('V12 the cells of I may be targets', [['const proving = new Set(tuple.concat(a.record.cells, b.record.cells));', 'const proving = new Set(a.record.cells.concat(b.record.cells));']]);
sdc('V13 the cells of A may be targets', [['const proving = new Set(tuple.concat(a.record.cells, b.record.cells));', 'const proving = new Set(tuple.concat(b.record.cells));']]);
sdc('V14 a witness without a target is a Finding', [['if (targets.length > 0) return sdcFinding(', 'return sdcFinding(']]);
sdc('V15 the B candidates are tried from the end', [['for (let j = 0; j < candidates[1].length; j++) {', 'for (let j = candidates[1].length - 1; j >= 0; j--) {']]);
sdc('V16 the A candidates are tried from the end', [['for (let i = 0; i < candidates[0].length; i++) {', 'for (let i = candidates[0].length - 1; i >= 0; i--) {']]);
sdc('V17 an opened I is not charged', [['  function sdcTuple(model, state, ctx, work, classes, pair, scope, sides, tuple) {' + NL + '    chargeSdc(work, ctx);',
  '  function sdcTuple(model, state, ctx, work, classes, pair, scope, sides, tuple) {']]);
sdc('V18 a side record tested for C is not charged', [['      for (let i = 0; i < side.length; i++) {' + NL + '        chargeSdc(work, ctx);', '      for (let i = 0; i < side.length; i++) {']]);
sdc('V19 a pair (A, B) tested is not charged', [['        chargeSdc(work, ctx);' + NL + '        const a = candidates[0][i];', '        const a = candidates[0][i];']]);
sdc('V20 the sides are swapped (A from the box list)', [['[sides.a, sides.b].forEach(function (side, which) {', '[sides.b, sides.a].forEach(function (side, which) {']]);

// ---- X: the targets
sdc('X01 the line cells lose the digits of B too', [['if (scope.inLine.has(c)) mask |= aMask | zMask;', 'if (scope.inLine.has(c)) mask |= aMask | bMask | zMask;']]);
sdc('X02 the line cells lose the digits of B instead of A', [['if (scope.inLine.has(c)) mask |= aMask | zMask;', 'if (scope.inLine.has(c)) mask |= bMask | zMask;']]);
sdc('X03 the box cells lose the digits of A instead of B', [['if (scope.inBox.has(c)) mask |= bMask | zMask;', 'if (scope.inBox.has(c)) mask |= aMask | zMask;']]);
sdc('X04 Z is not removed from the line', [['if (scope.inLine.has(c)) mask |= aMask | zMask;', 'if (scope.inLine.has(c)) mask |= aMask;']]);
sdc('X05 Z is not removed from the box', [['if (scope.inBox.has(c)) mask |= bMask | zMask;', 'if (scope.inBox.has(c)) mask |= bMask;']]);
sdc('X06 a solved cell may be a target', [['if (state.value[c] !== 0 || proving.has(c)) continue;', 'if (proving.has(c)) continue;']]);
sdc('X07 a cell of the witness may be a target (solved cells aside)', [['if (state.value[c] !== 0 || proving.has(c)) continue;', 'if (state.value[c] !== 0) continue;']]);
sdc('X08 a visited target cell is not charged', [['      chargeSdc(work, ctx);' + NL + '      const c = scope.cells[i];', '      const c = scope.cells[i];']]);
sdc('X09 only the open target cells are charged', [['      chargeSdc(work, ctx);' + NL + '      const c = scope.cells[i];' + NL + '      if (state.value[c] !== 0 || proving.has(c)) continue;',
  '      const c = scope.cells[i];' + NL + '      if (state.value[c] !== 0 || proving.has(c)) continue;' + NL + '      chargeSdc(work, ctx);']]);
sdc('X10 the cells of U and V are not deduplicated', [['cells: Array.from(new Set(Array.from(inLine).concat(Array.from(inBox)))).sort(numeric),',
  'cells: Array.from(inLine).concat(Array.from(inBox)).sort(numeric),']]);
sdc('X11 the cells of U and V are not sorted', [['cells: Array.from(new Set(Array.from(inLine).concat(Array.from(inBox)))).sort(numeric),',
  'cells: Array.from(new Set(Array.from(inLine).concat(Array.from(inBox)))),']]);
sdc('X12 the removed digits are not intersected with the candidates', [['SG.bits.forEach(mask & state.candidates[c], function (d) { out.push([c, d]); });',
  'SG.bits.forEach(mask, function (d) { out.push([c, d]); });']]);

// ---- F: the Finding
sdc('F01 cells not sorted', [['cells: tuple.concat(a.record.cells, b.record.cells).sort(numeric),', 'cells: tuple.concat(a.record.cells, b.record.cells),']]);
sdc('F02 cells of A and B only', [['cells: tuple.concat(a.record.cells, b.record.cells).sort(numeric),', 'cells: a.record.cells.concat(b.record.cells).sort(numeric),']]);
sdc('F03 another technique id', [['technique: SDC_ID,', "technique: 'sueDeCoq2',"]]);
sdc('F04 the step keys are swapped', [["(zMask === 0 ? '.step' : '.step.extra')", "(zMask === 0 ? '.step.extra' : '.step')"]]);
sdc('F05 the step key never has the extra form', [["i18nKey: 'technique.' + SDC_ID + (zMask === 0 ? '.step' : '.step.extra'),", "i18nKey: 'technique.' + SDC_ID + '.step',"]]);
sdc('F06 digits and partDigits swapped', [['digits: a.record.digits.slice(),' + NL + '        partDigits: b.record.digits.slice(),',
  'digits: b.record.digits.slice(),' + NL + '        partDigits: a.record.digits.slice(),']]);
sdc('F07 forced is always empty', [['forced: SG.bits.toArray(zMask),', 'forced: [],']]);
sdc('F08 the line and box labels are swapped', [['line: model.unitMeta[pair.line].label,' + NL + '        box: model.unitMeta[pair.box].label',
  'line: model.unitMeta[pair.box].label,' + NL + '        box: model.unitMeta[pair.line].label']]);
sdc('F09 digits is the record\'s own array', [['digits: a.record.digits.slice(),' + NL, 'digits: a.record.digits,' + NL]],
  { equivalent: 'the record objects are made inside the call by enumerate (nothing caches or shares them) and are dropped when findSueDeCoq returns, so the only holder of that array after the call is the Finding: writing to it changes no other result' });
sdc('F10 partDigits is the record\'s own array', [['partDigits: b.record.digits.slice(),', 'partDigits: b.record.digits,']],
  { equivalent: 'the same argument as F09: the enumerator\'s records live only inside the call' });
sdc('F11 a placement is reported', [['      placements: [],' + NL + '      eliminations: targets,', '      placements: [0],' + NL + '      eliminations: targets,']]);
sdc('F12 the first elimination is dropped', [['eliminations: targets,', 'eliminations: targets.slice(1),']]);

// ---- W: the work units, the one guard, the caps and the record
sdc('W01 the allowance is 49,999', [['const SDC_WORK_LIMIT = 50000;', 'const SDC_WORK_LIMIT = 49999;']]);
sdc('W02 the allowance is 100,000', [['const SDC_WORK_LIMIT = 50000;', 'const SDC_WORK_LIMIT = 100000;']]);
sdc('W03 the record quota is reported before the work cap', [[OBS_HEAD, OBS_HEAD.replace(CAP, "capHit: recordsCut ? 'records' : work.capped ? 'work' : null,")]]);
sdc('W04 the record quota is never reported', [[OBS_HEAD, OBS_HEAD.replace(CAP, "capHit: work.capped ? 'work' : null,")]]);
sdc('W05 any incomplete enumeration is read as the record quota', [["        recordsCut = enumerated.capHit === 'records';", '        recordsCut = !enumerated.complete;']]);
sdc('W06 retained is always 0', [[OBS, OBS.replace('retained: retained', 'retained: 0')]]);
sdc('W07 the reported limit is the shared one', [['id: SDC_ID,' + NL + '        work: work.used,' + NL + '        limit: work.limit,',
  'id: SDC_ID,' + NL + '        work: work.used,' + NL + '        limit: LIMITS.work,']]);
sdc('W08 the reported work is the limit', [['id: SDC_ID,' + NL + '        work: work.used,', 'id: SDC_ID,' + NL + '        work: work.limit,']]);
sdc('W09 the record carries the id of ALS-XZ', [['id: SDC_ID,' + NL + '        work: work.used,', 'id: XZ_ID,' + NL + '        work: work.used,']]);
sdc('W10 a refused unit does not end the call', [['if (!spend(work, ctx)) throw SDC_CAP;', 'if (!spend(work, ctx)) return;']]);
sdc('W11 the enumeration runs without a pair', [['      if (pairs.length > 0) {', '      if (true) {']]);
sdc('W12 the search is entered after a cut enumeration', [["        } else if (enumerated.capHit !== 'work') {", '        } else if (true) {']]);
sdc('W13 the record is published twice', [[OBS, OBS.replace('      });' + NL + '    }', '      });' + NL +
  '      observer({ id: SDC_ID, work: 0, limit: 0, capHit: null, retained: 0 });' + NL + '    }')]]);
sdc('W14 retained is never set', [['        retained = enumerated.records.length;' + NL, '']]);

// ---- B: the parent budget, errors and the observer
sdc('B01 no check at entry', [['    try {' + NL + '      checkpoint(ctx, work);' + NL + '      const roles = sdcRoles(model);', '    try {' + NL + '      const roles = sdcRoles(model);']]);
sdc('B02 no check at the end of the geometry', [['      const pairs = sdcGeometry(model, state, ctx, work, roles);' + NL + '      checkpoint(ctx, work);',
  '      const pairs = sdcGeometry(model, state, ctx, work, roles);']]);
sdc('B03 no check after the enumeration', [["        } else if (enumerated.capHit !== 'work') {" + NL + '          checkpoint(ctx, work);' + NL + '          const classes',
  "        } else if (enumerated.capHit !== 'work') {" + NL + '          const classes']]);
sdc('B04 no check after the classification', [['          const classes = sdcClassify(model, ctx, work, roles, enumerated.records);' + NL + '          checkpoint(ctx, work);',
  '          const classes = sdcClassify(model, ctx, work, roles, enumerated.records);']]);
sdc('B05 no final check before publishing', [['          found = sdcSearch(model, state, ctx, work, pairs, classes);' + NL + '          ctx.check();',
  '          found = sdcSearch(model, state, ctx, work, pairs, classes);']]);
sdc('B06 a checkpoint does not restart the 256 units', [['    ctx.check();' + NL + '    work.checkedAt = work.used;' + NL + '  }' + NL + NL + '  // Phase 1.',
  '    ctx.check();' + NL + '  }' + NL + NL + '  // Phase 1.']]);
sdc('B07 a checkpoint does not ask the budget', [['  function checkpoint(ctx, work) {' + NL + '    ctx.check();', '  function checkpoint(ctx, work) {']]);
sdc('B08 a stop of the parent in the enumeration is not remembered', [["        recordsCut = enumerated.capHit === 'records';" + NL + '        if (enumerated.capHit === null && !enumerated.complete) {',
  "        recordsCut = enumerated.capHit === 'records';" + NL + '        if (false) {']]);
sdc('B09 the remembered stop asks the budget no more', [['even if a recheck now passes.' + NL + '          ctx.check();', 'even if a recheck now passes.']]);
sdc('B10 every error is swallowed', [["if (err !== SDC_CAP && !(err && err.code === 'budget.exceeded')) throw err;", 'if (err !== SDC_CAP && false) throw err;']]);
sdc('B11 cancellation is swallowed', [["if (err !== SDC_CAP && !(err && err.code === 'budget.exceeded')) throw err;",
  "if (err !== SDC_CAP && !(err && (err.code === 'budget.exceeded' || err.code === 'budget.cancelled'))) throw err;"]]);
sdc('B12 a Finding survives a failed final check', [['      found = null;' + NL + '      if (err !== SDC_CAP', '      if (err !== SDC_CAP']]);
sdc('B13 an observer that throws is swallowed', [['      observer({' + NL + '        id: SDC_ID,', '      try { observer({' + NL + '        id: SDC_ID,'],
  [OBS, OBS.replace('      });' + NL + '    }', '      }); } catch (e) { /* swallowed */ }' + NL + '    }')]]);

// ---- Z: the other files that carry the technique (weight, locale packs)
add('sdc', 'Z01 weight 1250 (a tie with alsXz)', 'generator/js/engine/difficulty.js', [{ app: 'generator', suites: 'technique-weights' }],
  [['    sueDeCoq: 1300,', '    sueDeCoq: 1250,']]);
add('sdc', 'Z02 weight 1400 (a tie with forcingChainLong)', 'generator/js/engine/difficulty.js', [{ app: 'generator', suites: 'technique-weights' }],
  [['    sueDeCoq: 1300,', '    sueDeCoq: 1400,']]);
add('sdc', 'Z03 the Generator English extra step key is misspelled', 'generator/js/ui/locale.en.js', [{ app: 'generator', suites: 'i18n' }],
  [["    'technique.sueDeCoq.step.extra': 'Sue de Coq where", "    'technique.sueDeCoq.step.extr': 'Sue de Coq where"]]);
add('sdc', 'Z04 the Generator Vietnamese step key is misspelled', 'generator/js/ui/locale.vi.js', [{ app: 'generator', suites: 'i18n' }],
  [["    'technique.sueDeCoq.step': 'Sue de Coq tại chỗ", "    'technique.sueDeCoq.stepp': 'Sue de Coq tại chỗ"]]);
add('sdc', 'Z05 the Player English extra step key is misspelled', 'player/js/ui/locale.en.js', [{ app: 'player', suites: 'i18n' }],
  [["    'technique.sueDeCoq.step.extra': 'Sue de Coq where", "    'technique.sueDeCoq.step.extr': 'Sue de Coq where"]]);
add('sdc', 'Z06 the Player Vietnamese extra step key is misspelled', 'player/js/ui/locale.vi.js', [{ app: 'player', suites: 'i18n' }],
  [["    'technique.sueDeCoq.step.extra': 'Sue de Coq tại chỗ", "    'technique.sueDeCoq.step.extr': 'Sue de Coq tại chỗ"]]);

// ---- xz: MS15b's ALS-XZ mutants, with the anchored fragments
const ANCHOR_XZ = (extra) => extra;
const OBS_XZ_HEAD = 'id: XZ_ID,' + NL + '        work: work.used,' + NL + '        limit: work.limit,' + NL + '        ' + CAP + NL + '        retained: retained';
const OBS_XZ_TAIL = NL + '        retained: retained' + NL + '      });' + NL + '    }' + NL + '    return found;' + NL + '  }' + NL + NL + '  // The roles';
const PATCH = {
  R05: [["group: 'chain'," + NL + '      baseCost: 106,', "group: 'fish'," + NL + '      baseCost: 106,']],
  R06: [["i18nKey: 'technique.' + XZ_ID," + NL + '      variantScope: null,', "i18nKey: 'technique.' + XZ_ID," + NL + "      variantScope: ['classic9'],"]],
  R07: [['assumesUniqueness: false,' + NL + '      find: function (model, state, ctx) { return findXz(model, state, ctx); }',
    'assumesUniqueness: true,' + NL + '      find: function (model, state, ctx) { return findXz(model, state, ctx); }']],
  S04: [['    try {' + NL + '      const enumerated = enumerate(model, state, ctx, work, seam.limits);', '    try {' + NL + '      const enumerated = enumerate(model, state, ctx, work);']],
  O02: [['for (let i = 0; i < records.length; i++) {' + NL + '      for (let j = i + 1;', 'for (let i = records.length - 1; i >= 0; i--) {' + NL + '      for (let j = i + 1;']],
  W07: [[OBS_XZ_HEAD, OBS_XZ_HEAD.replace(CAP, "capHit: recordsCut ? 'records' : work.capped ? 'work' : null,")]],
  W08: [[OBS_XZ_HEAD, OBS_XZ_HEAD.replace(CAP, "capHit: work.capped ? 'work' : null,")]],
  W09: [[';' + NL + "      recordsCut = enumerated.capHit === 'records';", ';' + NL + '      recordsCut = !enumerated.complete;']],
  W10: [[OBS_XZ_HEAD, OBS_XZ_HEAD.replace('retained: retained', 'retained: 0')]],
  W11: [['id: XZ_ID,' + NL + '        work: work.used,' + NL + '        limit: work.limit,', 'id: XZ_ID,' + NL + '        work: work.used,' + NL + '        limit: LIMITS.work,']],
  W12: [['id: XZ_ID,' + NL + '        work: work.used,', 'id: XZ_ID,' + NL + '        work: work.limit,']],
  B03: [[NL + '      if (enumerated.capHit === null && !enumerated.complete) {', NL + '      if (false) {']],
  B07: [['    } catch (err) {' + NL + '      found = null;' + NL + '      if (err !== XZ_CAP', '    } catch (err) {' + NL + '      if (err !== XZ_CAP']],
  B08: [['      observer({' + NL + '        id: XZ_ID,', '      try { observer({' + NL + '        id: XZ_ID,'],
    [OBS_XZ_TAIL, OBS_XZ_TAIL.replace('      });' + NL + '    }', '      }); } catch (e) { /* swallowed */ }' + NL + '    }')]],
  B09: [[OBS_XZ_TAIL, OBS_XZ_TAIL.replace('      });' + NL + '    }', '      });' + NL + '      observer({ id: XZ_ID, work: 0, limit: 0, capHit: null, retained: 0 });' + NL + '    }')]],
  B10: [[NL + "      } else if (enumerated.capHit !== 'work') {", NL + '      } else if (true) {']]
};
const SUPERSEDED = { S01: true, S02: true };
void ANCHOR_XZ;
require('../MS15b/mutations.cjs').forEach((m) => {
  const key = m.name.split(' ')[0];
  if (SUPERSEDED[key]) return;
  const edits = PATCH[key] ? PATCH[key].map(([from, to]) => ({ from, to })) : m.edits;
  MUTATIONS.push({ set: 'xz', name: m.name, target: m.target, edits, runs: m.runs, equivalent: m.equivalent });
});

// ---- enum: MS15a's enumerator mutants (its own list), W14 anchored to spend
require('../MS15a/mutations.cjs').forEach((m) => {
  const key = m.name.split(' ')[0];
  const edits = key === 'W14' ? [{ from: NL + '      work.checkedAt = work.used;', to: NL + '      ;' }] : m.edits;
  MUTATIONS.push({ set: 'enum', name: m.name, target: m.target, edits, runs: m.runs, equivalent: m.equivalent });
});

module.exports = MUTATIONS;
