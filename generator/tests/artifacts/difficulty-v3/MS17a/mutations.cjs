'use strict';

/*
 * MS17a scratch: the in-memory mutants of the history marker (IR72 F1, adapted): `isVersion`, the marker in `entryOf`,
 * `STORED_FIELDS`, `storedEntry`, `validEntry`, the envelope version and key, the identity (`idOf`, `overridesOf`), the
 * replacement rules of `add`, the private `madeEarlier`, the rendering in `item`, the locale refresh, the result handler
 * and the four texts of the two new strings. Every mutant is one exact fragment replaced once in js/ui/history.js; the file
 * on disk is never touched (mutant-run.cjs). The `history` suite must fail on each.
 * `equivalent: <argument>` marks a mutant that is expected to survive, with the argument (none is claimed without one).
 */
const TARGET = 'generator/js/ui/history.js';

const IS_VERSION = 'return Number.isInteger(x) && x > 0;';
const COPY = 'if (isVersion(rating.ratingVersion)) entry.ratingVersion = rating.ratingVersion;';
const EARLIER = 'return isVersion(current) && entry.ratingVersion < current;';
const TITLE = "title: t(earlier ? 'history.item.earlier.title' : 'history.open.title')";

const out = [];
function add(name, from, to, extra) {
  out.push(Object.assign({ app: 'generator', target: TARGET, suites: 'history', name: name, from: from, to: to },
    extra || {}));
}

// isVersion: what counts as a marker
add('isVersion accepts zero', IS_VERSION, 'return Number.isInteger(x) && x >= 0;');
add('isVersion accepts a negative integer', IS_VERSION, 'return Number.isInteger(x);');
add('isVersion accepts a fraction and Infinity', IS_VERSION, "return typeof x === 'number' && x > 0;");
add('isVersion coerces a string, an array and true', IS_VERSION,
  'return Number.isInteger(Number(x)) && Number(x) > 0;');
add('isVersion accepts nothing', IS_VERSION, 'return false;');

// entryOf: the marker comes from the result's rating, and only a valid one
add('entryOf stamps the current version on every entry', COPY, 'entry.ratingVersion = SG.difficulty.RATING_VERSION;');
add('entryOf stamps the current version when the result states none', COPY,
  'entry.ratingVersion = isVersion(rating.ratingVersion) ? rating.ratingVersion : SG.difficulty.RATING_VERSION;');
add('entryOf never copies the marker', COPY, '');
add('entryOf copies any stated value', COPY,
  'if (rating.ratingVersion !== undefined) entry.ratingVersion = rating.ratingVersion;');
add('entryOf reads the marker from the result, not its rating',
  'if (isVersion(rating.ratingVersion)) entry.ratingVersion = rating.ratingVersion;',
  'if (isVersion(result.ratingVersion)) entry.ratingVersion = result.ratingVersion;');
add('entryOf copies only the current version', COPY,
  'if (rating.ratingVersion === SG.difficulty.RATING_VERSION) entry.ratingVersion = rating.ratingVersion;');

// the stored field and its filter
add('the marker is not a stored field', "'variantOptions', 'ratingVersion']);", "'variantOptions']);");
add('storedEntry keeps a malformed marker', "(name === 'ratingVersion' && !isVersion(e[name]))", 'false');
add('storedEntry keeps only a malformed marker', "(name === 'ratingVersion' && !isVersion(e[name]))",
  "(name === 'ratingVersion' && isVersion(e[name]))");
add('the entry without a marker is not valid', "typeof e.seed === 'string';",
  "typeof e.seed === 'string' && isVersion(e.ratingVersion);");
add('the entry with a malformed marker is not valid', "typeof e.seed === 'string';",
  "typeof e.seed === 'string' &&\n      (e.ratingVersion === undefined || isVersion(e.ratingVersion));");
add('the read path does not filter the marker', 'return withId(storedEntry(e));', 'return withId(e);');
add('the write path does not filter entries', 'entries.map(storedEntry)', 'entries');
add('add does not filter the marker', 'const item = withId(storedEntry(entry));', 'const item = withId(entry);');

// the envelope and the identity
add('the envelope version changes', 'const VERSION = 1;', 'const VERSION = 2;');
add('the storage key changes', "const STORAGE_KEY = 'sg.history.v1';", "const STORAGE_KEY = 'sg.history.v2';");
add('the id includes the marker', 'variantOptions: e.variantOptions }, e.seed);',
  "variantOptions: e.variantOptions }, e.seed + (e.ratingVersion || ''));");
add('the overrides carry the marker', "['symbolMode', 'symmetry', 'digOrder', 'maxAttempts'].forEach(",
  "['symbolMode', 'symmetry', 'digOrder', 'maxAttempts', 'ratingVersion'].forEach(");
add('an opened entry replaced in place inherits the old marker', 'entries[at] = item;',
  'entries[at] = Object.assign({}, entries[at], item);');
add('an entry generated again inherits the old marker', 'if (at !== -1) entries.splice(at, 1);',
  'if (at !== -1) item.ratingVersion = entries.splice(at, 1)[0].ratingVersion;');

// madeEarlier and the rendering
add('a missing marker gets no note', 'if (entry.ratingVersion === undefined) return true;',
  'if (entry.ratingVersion === undefined) return false;');
add('only a marker gets the note', 'if (entry.ratingVersion === undefined) return true;',
  'if (entry.ratingVersion !== undefined) return true;');
add('an equal marker gets the note', EARLIER, 'return isVersion(current) && entry.ratingVersion <= current;');
add('a future marker gets the note', EARLIER, 'return isVersion(current) && entry.ratingVersion !== current;');
add('a smaller marker gets no note', EARLIER, 'return isVersion(current) && entry.ratingVersion > current;');
add('a known older marker gets no note', EARLIER, 'return false;');
add('the current version is not validated', EARLIER, 'return current > 0 && entry.ratingVersion < current;');
add('the current version is not compared', EARLIER, 'return entry.ratingVersion < current;');
add('the current version is a literal', 'const current = SG.difficulty ? SG.difficulty.RATING_VERSION : undefined;',
  'const current = 3;');
add('the current version is read without a guard', 'const current = SG.difficulty ? SG.difficulty.RATING_VERSION : undefined;',
  'const current = SG.difficulty.RATING_VERSION;');
add('every entry gets the note', 'if (earlier) {', 'if (true) {');
add('no entry gets the note', 'if (earlier) {', 'if (false) {');
add('the note uses the explanation', "text: t('history.item.earlier') }));", "text: t('history.item.earlier.title') }));");
add('the title never explains', TITLE, "title: t('history.open.title')");
add('the title explains on the wrong entries', TITLE,
  "title: t(earlier ? 'history.open.title' : 'history.item.earlier.title')");
add('the locale event does not render again', "off.push(app.on('locale', render));",
  "off.push(app.on('locale', function () {}));");
add('opening an entry hands on its marker', 'const run = app.generate(overridesOf(entry));',
  'const run = app.generate(Object.assign({ ratingVersion: entry.ratingVersion }, overridesOf(entry)));');
add('an opened entry moves to the top', 'entries = list.add(entry, { touch: opening !== entry.id });',
  'entries = list.add(entry, { touch: true });');
add('a result without a marker is stamped with the current version', 'const entry = entryOf(result);',
  'const entry = entryOf(result); if (entry !== null && entry.ratingVersion === undefined) ' +
  'entry.ratingVersion = SG.difficulty.RATING_VERSION;');
add('an imported result is listed', 'if (!result || payload.imported === true) {', 'if (!result) {');

// the four texts
add('the English note says older', "'Made by an earlier version; selecting this entry regenerates the puzzle ' +",
  "'Made by an older version; selecting this entry regenerates the puzzle ' +");
add('the English note promises the same puzzle', "'using the current rating model.',",
  "'giving the same puzzle.',");
add('the English explanation drops the cache', "'cached result may be reused.',", "'cached result is never reused.',");
add('the Vietnamese note says newer', "'Do phiên bản cũ hơn tạo; chọn mục này sẽ tạo lại đề bằng mô hình tính điểm ' +",
  "'Do phiên bản mới hơn tạo; chọn mục này sẽ tạo lại đề bằng mô hình tính điểm ' +");
add('the Vietnamese explanation forbids the cache', "Có thể dùng lại kết quả ' +", "Không dùng lại kết quả ' +");

module.exports = out;
