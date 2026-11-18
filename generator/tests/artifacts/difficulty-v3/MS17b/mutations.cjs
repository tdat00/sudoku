'use strict';

/*
 * MS17b scratch: the in-memory mutants of the version and cache logic (IR72 F1, adapted from MS17a's): the schema and rating
 * versions, the explicit exactness boundary, the strict rating table (`ratingProblem`), the technique-count map, the
 * standardized rating and the semantic model of the comparator (`classificationKey`, `modelKey`, `sameResult` and their
 * helpers). Every mutant is one exact single-line fragment replaced once in its target file; the file on disk is never touched
 * (mutant-run.cjs). The `cache` suite must fail on each.
 * `equivalent: <argument>` marks a mutant that is expected to survive, with the non-circular argument (none is claimed without
 * one).
 */
const CACHE = 'generator/js/ui/cache.js';
const DIFFICULTY = 'generator/js/engine/difficulty.js';

const out = [];
function add(name, from, to, extra, target) {
  out.push(Object.assign({ app: 'generator', target: target || CACHE, suites: 'cache', name: name, from: from, to: to },
    extra || {}));
}
const equivalent = (why) => ({ equivalent: why });

// versions and the store
add('schema stays 2', 'const SCHEMA_VERSION = 3;', 'const SCHEMA_VERSION = 2;');
add('schema 4', 'const SCHEMA_VERSION = 3;', 'const SCHEMA_VERSION = 4;');
add('storage key renamed', "const STORAGE_KEY = 'sg.cache.v1';", "const STORAGE_KEY = 'sg.cache.v2';");
add('an older list is read', 'value.version !== version ||', 'value.version > version ||');
add('a newer list is read', 'value.version !== version ||', 'value.version < version ||');
add('the exported VERSION says 2', 'VERSION: SCHEMA_VERSION,', 'VERSION: 2,');
add('the default store version stays 2', 'const version = o.version !== undefined ? o.version : SCHEMA_VERSION;',
  'const version = o.version !== undefined ? o.version : 2;');
add('rating version stays 2', 'const RATING_VERSION = 3;', 'const RATING_VERSION = 2;', null, DIFFICULTY);
add('rating version 4', 'const RATING_VERSION = 3;', 'const RATING_VERSION = 4;', null, DIFFICULTY);
add('rating version as text', 'const RATING_VERSION = 3;', "const RATING_VERSION = '3';", null, DIFFICULTY);
add('the exported rating version stays 2', 'RATING_VERSION: RATING_VERSION,', 'RATING_VERSION: 2,', null, DIFFICULTY);
add('classify stamps 2', 'ratingVersion: RATING_VERSION', 'ratingVersion: 2', null, DIFFICULTY);
add('classify stamps nothing', 'ratingVersion: RATING_VERSION', 'ratingVersion: undefined', null, DIFFICULTY);

// the explicit exactness flag and where the checks sit
const FLAG = "if (!isRecord(holder) || !hasOwn(holder, 'exact') || typeof holder.exact !== 'boolean') return 'exact';";
add('the record check of the holder is dropped', FLAG,
  "if (!hasOwn(holder, 'exact') || typeof holder.exact !== 'boolean') return 'exact';",
  equivalent('every caller passes an object that is a record or an array: serialize and classificationKey have tested ' +
    'isRecord, deserialize a non-null object (an array has no own exact: the same refusal), verify the result of fromWire'));
add('an inherited exact is accepted', FLAG, "if (!isRecord(holder) || typeof holder.exact !== 'boolean') return 'exact';");
add('a non-boolean exact is accepted', FLAG,
  "if (!isRecord(holder) || !hasOwn(holder, 'exact') || holder.exact === undefined) return 'exact';");
add('the rating is never checked', 'return ratingProblem(rating, cellCount);', 'return null;');
add('serialize accepts a non-record', "if (!isRecord(result)) throw invalidData('result');", '');
add('serialize skips the check', 'const problem = classificationProblem(result, result.rating, cellCountOf(result.model));',
  'const problem = null;');
add('deserialize skips the raw check', 'const problem = classificationProblem(wire, wire.rating, cellCountOf(wire.model));',
  'const problem = null;');
add('deserialize checks after the coercion',
  'const problem = classificationProblem(wire, wire.rating, cellCountOf(wire.model));',
  'const problem = classificationProblem(SG.pipeline.fromWire(wire), wire.rating, cellCountOf(wire.model));');
add('verify skips the check', 'const problem = classificationProblem(result, result.rating, n);', 'const problem = null;',
  equivalent('verify gets the result of fromWire, which hands over wire.rating and the flag unchanged (exact as a strict ' +
    'boolean) and a model of the wire cellCount: the deserialize check before it has already decided on the same data'));
add('the model size is never known', 'return isRecord(model) ? model.cellCount : undefined;', 'return undefined;');
add('the model size is read unguarded', 'return isRecord(model) ? model.cellCount : undefined;', 'return model.cellCount;');

// the rating table
add('the rating record check is dropped', "if (!isRecord(rating)) return 'rating';", '');
add('the own-field loop is dropped', "if (!hasOwn(rating, RATING_FIELDS[i])) return 'rating.' + RATING_FIELDS[i];", '');
add('level is not required to be own', "Object.freeze(['level', 'score',", "Object.freeze(['score',");
add('score is not required to be own', "'level', 'score', 'rawScore',", "'level', 'rawScore',");
add('rawScore is not required to be own', "'score', 'rawScore', 'confidence',", "'score', 'confidence',");
add('confidence is not required to be own', "'rawScore', 'confidence', 'hardestTechnique',",
  "'rawScore', 'hardestTechnique',");
add('hardestTechnique is not required to be own', "'confidence', 'hardestTechnique',", "'confidence',");
add('hardestGroup is not required to be own', "'hardestGroup', 'solved',", "'solved',");
add('solved is not required to be own', "'solved', 'empties',", "'empties',");
add('empties is not required to be own', "'empties', 'techniqueCounts',", "'techniqueCounts',");
add('techniqueCounts is not required to be own', "'techniqueCounts', 'ratingVersion']);", "'ratingVersion']);");
add('ratingVersion is not required to be own', "'techniqueCounts', 'ratingVersion']);", "'techniqueCounts']);");
add('the version is compared loosely', 'rating.ratingVersion !== current', 'rating.ratingVersion != current');
add('an older version is accepted', 'rating.ratingVersion !== current', 'rating.ratingVersion < current');
add('a newer version is accepted', 'rating.ratingVersion !== current', 'rating.ratingVersion > current');
add('the version is never compared', '|| rating.ratingVersion !== current) {', ') {');
add('the current version need only be an integer', '!Number.isSafeInteger(current)', '!Number.isInteger(current)');
add('the current version may be zero', 'current < 1 ||', 'current < 0 ||');
add('the current version may be negative', '|| current < 1 ||', '||');
add('the level list is not required', '!Array.isArray(difficulty.LEVELS) ||', '');
add('the level text check is dropped', "typeof rating.level !== 'string' ||", '',
  equivalent('LEVELS holds only strings, so indexOf of a non-string is -1 and the next test refuses it all the same'));
add('any level is accepted', 'difficulty.LEVELS.indexOf(rating.level) === -1', 'false');
add('a score need only be finite', '!Number.isInteger(rating.score) || rating.score < 0',
  '!isFinite(rating.score) || rating.score < 0');
add('a zero score is refused', "rating.score < 0) return 'rating.score';", "rating.score <= 0) return 'rating.score';");
add('a negative score is accepted', "if (!Number.isInteger(rating.score) || rating.score < 0) return 'rating.score';",
  "if (!Number.isInteger(rating.score)) return 'rating.score';");
add('rawScore is compared loosely', 'rating.rawScore !== rating.score', 'rating.rawScore != rating.score');
add('rawScore is not compared', "if (rating.rawScore !== rating.score) return 'rating.rawScore';", '');
add('a confidence text is accepted', "typeof rating.confidence !== 'number' ||", '');
add('a non-finite confidence is accepted', '!isFinite(rating.confidence) ||', '');
add('a zero confidence is refused', 'rating.confidence < 0 ||', 'rating.confidence <= 0 ||');
add('a negative confidence is accepted', 'rating.confidence < 0 ||', '');
add('a confidence of one is refused', 'rating.confidence > 1) {', 'rating.confidence >= 1) {');
add('a confidence above one is accepted', 'rating.confidence > 1) {', 'false) {');
add('one null hardest field is accepted',
  "if (rating.hardestTechnique !== null || rating.hardestGroup !== null) return 'rating.hardestTechnique';",
  "if (rating.hardestTechnique !== null && rating.hardestGroup !== null) return 'rating.hardestTechnique';");
add('the null pair test needs both',
  'if (rating.hardestTechnique === null || rating.hardestGroup === null) {',
  'if (rating.hardestTechnique === null && rating.hardestGroup === null) {',
  equivalent('with one null the original refuses in the inner test and the mutant in the else branch (a null technique is ' +
    'no string, a null group is not the registered one); with both null both accept; with neither null both go to the ' +
    'else branch'));
add('an unknown hardest technique is accepted', '!registered(rating.hardestTechnique) ||', '');
add('the hardest technique text check is dropped', "typeof rating.hardestTechnique !== 'string' ||", '',
  equivalent('the registry is a Map keyed by strings, so has() of a non-string is false and registered() refuses it'));
add('the hardest group is not checked',
  'rating.hardestGroup !== SG.techniques.get(rating.hardestTechnique).group) {', 'false) {');
add('the hardest group check is inverted',
  'rating.hardestGroup !== SG.techniques.get(rating.hardestTechnique).group) {',
  'rating.hardestGroup === SG.techniques.get(rating.hardestTechnique).group) {');
add('solved may be truthy', "if (rating.solved !== true) return 'rating.solved';",
  "if (!rating.solved) return 'rating.solved';");
add('solved is not checked', "if (rating.solved !== true) return 'rating.solved';", '');
add('the model size is not checked', "if (!Number.isInteger(cellCount) || cellCount < 1) return 'model.cellCount';", '');
add('the model size need not be an integer', '!Number.isInteger(cellCount) || cellCount < 1', 'cellCount < 1');
add('the model size may be zero', '!Number.isInteger(cellCount) || cellCount < 1', '!Number.isInteger(cellCount)');
add('empties need not be an integer', '!Number.isInteger(rating.empties) ||', '');
add('negative empties are accepted', 'rating.empties < 0 ||', '');
add('empties may equal the board size and more', 'rating.empties > cellCount) {', 'rating.empties > cellCount + 1) {');
add('empties of the whole board are refused', 'rating.empties > cellCount) {', 'rating.empties >= cellCount) {');
add('empties are not bounded', 'rating.empties > cellCount) {', 'false) {');
add('the counts are not checked',
  "if (countsOf(rating.techniqueCounts) === null) return 'rating.techniqueCounts';", '');

// the technique-count map
add('the count map record check is dropped', 'if (!isRecord(counts)) return null;', '');
add('the count map prototype check is dropped', 'if (proto !== Object.prototype && proto !== null) return null;', '');
add('a null-prototype count map is refused', 'proto !== Object.prototype && proto !== null',
  'proto !== Object.prototype');
add('every count map prototype is refused', '&& proto !== null) return null;', '|| proto !== null) return null;');
add('an unknown technique id is accepted', '!registered(ids[i]) ||', '');
add('the count type check is dropped', "typeof n !== 'number' ||", '',
  equivalent('Number.isSafeInteger is false for every non-number, so the next test refuses the same values'));
add('the safe-integer check is dropped', '!Number.isSafeInteger(n) ||', '');
add('a finite count is enough', '!Number.isSafeInteger(n) ||', '!isFinite(n) ||');
add('a negative count is accepted', '|| n < 0) return null;', ') return null;');
add('a zero count is refused', '|| n < 0) return null;', '|| n <= 0) return null;');
add('zero counts are kept', 'if (n > 0) pairs.push([ids[i], n]);', 'pairs.push([ids[i], n]);');
add('counts of one are dropped', 'if (n > 0) pairs.push([ids[i], n]);', 'if (n > 1) pairs.push([ids[i], n]);');
add('the counts are not sorted',
  'return pairs.sort(function (x, y) { return x[0] < y[0] ? -1 : (x[0] > y[0] ? 1 : 0); });', 'return pairs;');
add('the count sort never orders', 'return x[0] < y[0] ? -1 : (x[0] > y[0] ? 1 : 0);', 'return 0;');
add('the counts are sorted downwards', 'return x[0] < y[0] ? -1 : (x[0] > y[0] ? 1 : 0);',
  'return x[0] < y[0] ? 1 : (x[0] > y[0] ? -1 : 0);',
  equivalent('equality of two maps needs one canonical order of unique ids, and any total order of the ids, descending ' +
    'included, is one'));
add('a missing registry is not guarded', 'return Boolean(SG.techniques) &&', 'return');
add('a registry without has() is not guarded', "typeof SG.techniques.has === 'function' &&", '');
add('nothing is registered', "return Boolean(SG.techniques) && typeof SG.techniques.has === 'function' && SG.techniques.has(id);",
  'return false;');
add('everything is registered',
  "return Boolean(SG.techniques) && typeof SG.techniques.has === 'function' && SG.techniques.has(id);", 'return true;');

// the standardized rating of the comparator
add('the key drops exact', 'stableStringify({ exact: result.exact, level: r.level,', 'stableStringify({ level: r.level,');
add('the key drops level', 'level: r.level, score: r.score,', 'score: r.score,');
add('the key drops score', 'score: r.score, rawScore: r.rawScore,', 'rawScore: r.rawScore,',
  equivalent('ratingProblem makes rawScore exactly equal to score and the key keeps rawScore, so two valid ratings with ' +
    'equal rawScores have equal scores (claimed after run 1, where this was the first survivor of that kind; the ' +
    'mutant that drops both is the last entry of the list)'));
add('the key drops rawScore', 'rawScore: r.rawScore,', '',
  equivalent('ratingProblem refuses any rating whose rawScore is not exactly its score, so two valid ratings with equal ' +
    'scores have equal rawScores'));
add('the key drops confidence', 'confidence: r.confidence, hardestTechnique: r.hardestTechnique,',
  'hardestTechnique: r.hardestTechnique,');
add('the key drops hardestTechnique', 'hardestTechnique: r.hardestTechnique, hardestGroup: r.hardestGroup,',
  'hardestGroup: r.hardestGroup,');
add('the key drops hardestGroup', 'hardestGroup: r.hardestGroup,', '',
  equivalent('ratingProblem binds the group to the registered group of the technique, which the key compares, so equal ' +
    'techniques have equal groups'));
add('the key drops solved', 'solved: r.solved, empties: r.empties,', 'empties: r.empties,',
  equivalent('ratingProblem refuses any rating whose solved is not true, so every valid rating has the same value'));
add('the key drops empties', 'empties: r.empties, ratingVersion: r.ratingVersion,', 'ratingVersion: r.ratingVersion,');
add('the key drops the version', 'ratingVersion: r.ratingVersion,', '',
  equivalent('ratingProblem refuses any rating whose version is not the current one, so every valid rating has it'));
add('the key compares the raw counts', 'counts: countsOf(r.techniqueCounts) });', 'counts: r.techniqueCounts });');
add('the key drops the counts', 'counts: countsOf(r.techniqueCounts) });', 'counts: 0 });');
add('the key skips the validation',
  'if (classificationProblem(result, result.rating, cellCountOf(result.model)) !== null) return null;', '');
add('the key refuses what is valid',
  'if (classificationProblem(result, result.rating, cellCountOf(result.model)) !== null) return null;',
  'if (classificationProblem(result, result.rating, cellCountOf(result.model)) === null) return null;');

// sameResult and its value helpers
add('sameResult takes anything for a record', 'if (!isRecord(a) || !isRecord(b)) return false;', '');
add('the givens are not compared', 'if (!sameValues(a.givens, b.givens) || !sameValues(a.solution, b.solution)) return false;',
  'if (!sameValues(a.solution, b.solution)) return false;');
add('the solution is not compared', 'if (!sameValues(a.givens, b.givens) || !sameValues(a.solution, b.solution)) return false;',
  'if (!sameValues(a.givens, b.givens)) return false;');
add('an invalid rating on both sides matches', 'if (ratingA === null || ratingA !== classificationKey(b)) return false;',
  'if (ratingA !== classificationKey(b)) return false;');
add('the ratings are not compared', 'if (ratingA === null || ratingA !== classificationKey(b)) return false;',
  'if (ratingA === null) return false;');
add('a malformed model on both sides matches', 'return modelA !== null && modelA === modelKey(b.model);',
  'return modelA === modelKey(b.model);');
add('the models are not compared', 'return modelA !== null && modelA === modelKey(b.model);', 'return modelA !== null;');
add('a missing first list is not guarded', 'if (x === null || x === undefined || y === null || y === undefined ||',
  'if (y === null || y === undefined ||');
add('a missing second list is not guarded', 'y === null || y === undefined ||', '');
add('a list without a length is equal to one', "typeof x.length !== 'number' ||", '');
add('lists of another length are compared by prefix', 'x.length !== y.length) {', 'false) {');
add('list elements are not compared', 'for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;', '');
add('list elements are compared loosely', 'if (x[i] !== y[i]) return false;', 'if (x[i] != y[i]) return false;',
  equivalent('sameValues compares only the givens and the solution. The served side passed verify: SG.model.isSolution requires ' +
    'every solution entry to be an integer from 1 to the digit count, and each given is exactly 0 or (by !==) the solution\'s ' +
    'digit, so every served element is an integer number; the fresh side holds the producer\'s typed arrays, whose elements ' +
    'are integers too. For two integer numbers != and !== give the same answer, so the loose comparison cannot differ from the ' +
    'strict one on any reachable pair'));
add('typed arrays are no lists', "const typed = ArrayBuffer.isView(value) && typeof value.length === 'number';",
  'const typed = false;');
add('anything is a list', 'return Array.isArray(value) || typed ? Array.from(value) : null;', 'return Array.from(value);');
add('a data view is a list', "const typed = ArrayBuffer.isView(value) && typeof value.length === 'number';",
  'const typed = ArrayBuffer.isView(value);');
add('cells need not be integers', 'if (!Number.isInteger(list[i]) || list[i] < 0 || list[i] >= n) return null;',
  'if (list[i] < 0 || list[i] >= n) return null;');
add('negative cells are accepted', 'if (!Number.isInteger(list[i]) || list[i] < 0 || list[i] >= n) return null;',
  'if (!Number.isInteger(list[i]) || list[i] >= n) return null;');
add('cells beyond the board are accepted', 'if (!Number.isInteger(list[i]) || list[i] < 0 || list[i] >= n) return null;',
  'if (!Number.isInteger(list[i]) || list[i] < 0) return null;');
add('membership lists are not sorted', 'return list.sort(function (x, y) { return x - y; });', 'return list;');
add('membership lists are sorted downwards', 'return list.sort(function (x, y) { return x - y; });',
  'return list.sort(function (x, y) { return y - x; });',
  equivalent('a membership list is compared as a multiset, and any canonical order of its numbers, descending included, ' +
    'gives equal text for equal multisets'));
add('membership lists use the default sort', 'return list.sort(function (x, y) { return x - y; });', 'return list.sort();',
  equivalent('the default sort orders by the text of the numbers: a deterministic order of the multiset, so equal ' +
    'multisets give equal text'));
add('a vector of another length is accepted', 'if (list === null || list.length !== n) return null;',
  'if (list === null) return null;');
add('vector entries are not checked', 'for (let i = 0; i < n; i++) if (!Number.isInteger(list[i])) return null;', '');
add('board vectors are sorted', '    return list;', '    return list.sort(function (x, y) { return x - y; });');
add('a null item is kept', 'if (item === null) return null;', '');

// the model parts
add('a cage need not be a record', 'const cells = isRecord(cage) ? cellsOf(cage.cells, n) : null;',
  'const cells = cellsOf(cage.cells, n);');
add('a cage sum need not be a number', "typeof cage.sum !== 'number' ||", '');
add('a cage sum may be infinite', '!isFinite(cage.sum) ||', '');
add('a cage flag need not be a boolean', "typeof cage.distinct !== 'boolean'", 'false');
add('a sign need not be a record', 'const ok = isRecord(sign) && Number.isInteger(sign.a) && Number.isInteger(sign.b) &&',
  'const ok = Number.isInteger(sign.a) && Number.isInteger(sign.b) &&');
add('sign ends need not be integers', 'const ok = isRecord(sign) && Number.isInteger(sign.a) && Number.isInteger(sign.b) &&',
  'const ok = isRecord(sign) &&');
add('the first sign end is not bounded', 'sign.a >= 0 && sign.a < n && sign.b >= 0 && sign.b < n;',
  'sign.b >= 0 && sign.b < n;');
add('the second sign end is not bounded', 'sign.a >= 0 && sign.a < n && sign.b >= 0 && sign.b < n;',
  'sign.a >= 0 && sign.a < n;');
add('the first sign end may be negative', 'sign.a >= 0 && sign.a < n && sign.b >= 0 && sign.b < n;',
  'sign.a < n && sign.b >= 0 && sign.b < n;');
add('the second sign end may be negative', 'sign.a >= 0 && sign.a < n && sign.b >= 0 && sign.b < n;',
  'sign.a >= 0 && sign.a < n && sign.b < n;');
add('the first sign end may pass the board', 'sign.a >= 0 && sign.a < n && sign.b >= 0 && sign.b < n;',
  'sign.a >= 0 && sign.b >= 0 && sign.b < n;');
add('the second sign end may pass the board', 'sign.a >= 0 && sign.a < n && sign.b >= 0 && sign.b < n;',
  'sign.a >= 0 && sign.a < n && sign.b >= 0;');
add('a sign loses its direction', 'return ok ? { a: sign.a, b: sign.b } : null;',
  'return ok ? { a: Math.min(sign.a, sign.b), b: Math.max(sign.a, sign.b) } : null;');
add('an overlay need not be a record', 'const cells = isRecord(overlay) ? cellsOf(overlay.cells, n) : null;',
  'const cells = cellsOf(overlay.cells, n);');
add('an overlay kind need not be a text', "cells === null || typeof overlay.kind !== 'string' ? null :",
  'cells === null ? null :');
add('a sub-grid need not be a record', 'const ok = isRecord(grid) && Number.isInteger(grid.gridIndex) && Number.isInteger(grid.originRow) &&',
  'const ok = Number.isInteger(grid.gridIndex) && Number.isInteger(grid.originRow) &&');
add('a sub-grid index need not be an integer',
  'const ok = isRecord(grid) && Number.isInteger(grid.gridIndex) && Number.isInteger(grid.originRow) &&',
  'const ok = isRecord(grid) && Number.isInteger(grid.originRow) &&');
add('a sub-grid row origin need not be an integer',
  'const ok = isRecord(grid) && Number.isInteger(grid.gridIndex) && Number.isInteger(grid.originRow) &&',
  'const ok = isRecord(grid) && Number.isInteger(grid.gridIndex) &&');
add('a sub-grid column origin need not be an integer', 'Number.isInteger(grid.originCol);', 'true;');
add('the sub-grid key drops the row origin',
  'return ok ? { gridIndex: grid.gridIndex, originRow: grid.originRow, originCol: grid.originCol } : null;',
  'return ok ? { gridIndex: grid.gridIndex, originCol: grid.originCol } : null;');
add('the sub-grid key drops the column origin',
  'return ok ? { gridIndex: grid.gridIndex, originRow: grid.originRow, originCol: grid.originCol } : null;',
  'return ok ? { gridIndex: grid.gridIndex, originRow: grid.originRow } : null;');
add('the sub-grid key drops the index',
  'return ok ? { gridIndex: grid.gridIndex, originRow: grid.originRow, originCol: grid.originCol } : null;',
  'return ok ? { originRow: grid.originRow, originCol: grid.originCol } : null;');
add('unit metadata of another length is accepted',
  'if (cells === null || metas === null || cells.length !== metas.length) return null;',
  'if (cells === null || metas === null) return null;');
add('a malformed unit is accepted', 'const ok = list !== null && isRecord(meta) && typeof meta.kind === \'string\' &&',
  'const ok = isRecord(meta) && typeof meta.kind === \'string\' &&');
add('unit metadata need not be a record', 'const ok = list !== null && isRecord(meta) && typeof meta.kind === \'string\' &&',
  'const ok = list !== null && typeof meta.kind === \'string\' &&');
add('a unit kind need not be a text', 'const ok = list !== null && isRecord(meta) && typeof meta.kind === \'string\' &&',
  'const ok = list !== null && isRecord(meta) &&');
add('a unit grid index need not be an integer', 'Number.isInteger(meta.gridIndex) &&', '');
add('a partial flag need not be a boolean',
  "(meta.partial === undefined || typeof meta.partial === 'boolean')", 'true');
add('the partial flag is kept raw', 'partial: meta.partial === true });', 'partial: meta.partial });');
add('the unit key drops the cells', 'out.push({ cells: list, kind: meta.kind, gridIndex: meta.gridIndex, partial: meta.partial === true });',
  'out.push({ kind: meta.kind, gridIndex: meta.gridIndex, partial: meta.partial === true });');
add('the unit key drops the kind', 'out.push({ cells: list, kind: meta.kind, gridIndex: meta.gridIndex, partial: meta.partial === true });',
  'out.push({ cells: list, gridIndex: meta.gridIndex, partial: meta.partial === true });');
add('the unit key drops the grid index', 'out.push({ cells: list, kind: meta.kind, gridIndex: meta.gridIndex, partial: meta.partial === true });',
  'out.push({ cells: list, kind: meta.kind, partial: meta.partial === true });');
add('the unit key drops the partial flag', 'out.push({ cells: list, kind: meta.kind, gridIndex: meta.gridIndex, partial: meta.partial === true });',
  'out.push({ cells: list, kind: meta.kind, gridIndex: meta.gridIndex });');
add('the unit label is compared', 'out.push({ cells: list, kind: meta.kind, gridIndex: meta.gridIndex, partial: meta.partial === true });',
  'out.push({ cells: list, kind: meta.kind, gridIndex: meta.gridIndex, partial: meta.partial === true, label: meta.label });');
add('the symbols are compared', 'stableStringify({ variantId: model.variantId, cellCount: n, digits: digits,',
  'stableStringify({ symbols: model.symbols, variantId: model.variantId, cellCount: n, digits: digits,');

// modelKey
add('the layout guard is dropped', 'if (!isRecord(model) || !isRecord(model.layout)) return null;',
  'if (!isRecord(model)) return null;');
add('the model guard is dropped', 'if (!isRecord(model) || !isRecord(model.layout)) return null;',
  'if (!isRecord(model.layout)) return null;',
  equivalent('sameResult computes classificationKey of both results first, and that key is null unless result.model is a ' +
    'record with an integer cellCount of at least 1 (cellCountOf), so modelKey is never called with a non-record model ' +
    '(claimed after run 1, where this was a survivor)'));
add('the variant id is not checked', "typeof model.variantId !== 'string' ||", '');
add('the model size is not checked in the key', '!Number.isInteger(n) || n < 1 ||', '',
  equivalent('sameResult runs classificationKey first, which refuses a result whose model.cellCount is not an integer of at ' +
    'least 1, and vectorOf compares the list length to n strictly, so a non-number never equals a length'));
add('the digits need not be an integer', '!Number.isInteger(digits) ||', '');
add('zero digits are accepted', 'digits < 1) {', 'digits < 0) {');
add('the sizes are not checked', 'const sizes = Number.isInteger(layout.rows) && Number.isInteger(layout.cols);',
  'const sizes = true;');
add('a malformed part needs every part malformed', '.some(function (part) { return part === null; })) {',
  '.every(function (part) { return part === null; })) {');
add('the key drops the variant', 'stableStringify({ variantId: model.variantId, cellCount: n, digits: digits,',
  'stableStringify({ cellCount: n, digits: digits,');
add('the key drops the cell count', 'stableStringify({ variantId: model.variantId, cellCount: n, digits: digits,',
  'stableStringify({ variantId: model.variantId, digits: digits,',
  equivalent('cellCount is the common length of the compared vectors (vectorOf checks it strictly), so two models with ' +
    'equal vectors have equal cell counts'));
add('the key drops the digits', 'stableStringify({ variantId: model.variantId, cellCount: n, digits: digits,',
  'stableStringify({ variantId: model.variantId, cellCount: n,');
add('the key drops the fixed cells', 'fixedCells: fixedCells, units: units, cages: cages, inequalities: inequalities,',
  'units: units, cages: cages, inequalities: inequalities,');
add('the key drops the units', 'fixedCells: fixedCells, units: units, cages: cages, inequalities: inequalities,',
  'fixedCells: fixedCells, cages: cages, inequalities: inequalities,');
add('the key drops the cages', 'fixedCells: fixedCells, units: units, cages: cages, inequalities: inequalities,',
  'fixedCells: fixedCells, units: units, inequalities: inequalities,');
add('the key drops the signs', 'fixedCells: fixedCells, units: units, cages: cages, inequalities: inequalities,',
  'fixedCells: fixedCells, units: units, cages: cages,');
add('the key drops the row count', 'layout: { rows: layout.rows, cols: layout.cols, cellRow: cellRow, cellCol: cellCol,',
  'layout: { cols: layout.cols, cellRow: cellRow, cellCol: cellCol,');
add('the key drops the column count', 'layout: { rows: layout.rows, cols: layout.cols, cellRow: cellRow, cellCol: cellCol,',
  'layout: { rows: layout.rows, cellRow: cellRow, cellCol: cellCol,');
add('the key drops the cell rows', 'layout: { rows: layout.rows, cols: layout.cols, cellRow: cellRow, cellCol: cellCol,',
  'layout: { rows: layout.rows, cols: layout.cols, cellCol: cellCol,');
add('the key drops the cell columns', 'layout: { rows: layout.rows, cols: layout.cols, cellRow: cellRow, cellCol: cellCol,',
  'layout: { rows: layout.rows, cols: layout.cols, cellRow: cellRow,');
add('the key drops the regions', 'cellRegion: cellRegion, overlays: overlays, subGrids: subGrids } });',
  'overlays: overlays, subGrids: subGrids } });');
add('the key drops the overlays', 'cellRegion: cellRegion, overlays: overlays, subGrids: subGrids } });',
  'cellRegion: cellRegion, subGrids: subGrids } });');
add('the key drops the sub-grids', 'cellRegion: cellRegion, overlays: overlays, subGrids: subGrids } });',
  'cellRegion: cellRegion, overlays: overlays } });');
// added after run 1 (the first survivor of its kind was the mutant that drops score alone)
add('the key drops score and rawScore', 'score: r.score, rawScore: r.rawScore,', '');

module.exports = out;
