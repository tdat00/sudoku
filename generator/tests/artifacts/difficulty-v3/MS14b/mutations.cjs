'use strict';
// MS14b scratch (from MS14a's/MS13c's mutation tooling): the in-memory mutations of this task, one record each:
//   name, target (repository-relative file), edits [{ from, to }] (every `from` occurs exactly once in the target), runs (the
//   runner invocations that must make a test fail: each { app, suites, filter? }, tried in order, a failure ends the mutant),
//   optional equivalent (a non-circular argument, only for a mutant expected to survive).
// Kinds: R registration, S scope, W weight and order, A the scoped cost adapter, T the cost tool's identity, H help integration.
// The files on disk are never changed: mutant-hook.cjs wraps fs.readFileSync (in this process and, through NODE_OPTIONS, in the
// processes the tests start) for the one target path.
const CRLF = '\r\n';
const SUBSET = 'core/js/engine/tech-subset.js';
const DIFFICULTY = 'generator/js/engine/difficulty.js';
const COST_HELPER = 'generator/tests/fixtures/pattern-cost.js';
const COST_TOOL = 'generator/tests/pattern-cost.js';
const KERNEL = { app: 'generator', suites: 'tech-subset', filter: 'law of leftovers' };
const WEIGHTS = { app: 'generator', suites: 'technique-weights' };
const REGISTRY = { app: 'generator', suites: 'techniques' };
const FLOOR = { app: 'generator', suites: 'difficulty-floor' };
const COST = { app: 'generator', suites: 'pattern-cost-tools' };
const PLAYER_KERNEL = { app: 'player', suites: 'tech-subset', filter: 'law of leftovers' };

const M = [];
const add = (name, target, from, to, runs, extra) => M.push(Object.assign({ name, target, edits: [{ from, to }], runs }, extra || {}));

// ---- R: registration
add('R01 group subset instead of locked', SUBSET, "group: 'locked',", "group: 'subset',", [KERNEL, WEIGHTS]);
add('R02 order 88', SUBSET, 'order: 87,', 'order: 88,', [KERNEL, WEIGHTS]);
add('R03 order 86', SUBSET, 'order: 87,', 'order: 86,', [KERNEL, WEIGHTS]);
add('R04 order 91 (after hiddenTriple)', SUBSET, 'order: 87,', 'order: 91,', [KERNEL, WEIGHTS]);
add('R05 order 85 (the order of minMaxForcing)', SUBSET, 'order: 87,', 'order: 85,', [KERNEL, WEIGHTS]);
add('R06 base cost 21', SUBSET, 'baseCost: 20,', 'baseCost: 21,', [KERNEL, WEIGHTS]);
add('R07 base cost 19', SUBSET, 'baseCost: 20,', 'baseCost: 19,', [KERNEL, WEIGHTS]);
add('R08 name key of the step', SUBSET, "i18nKey: 'technique.' + LEFTOVER_ID,", "i18nKey: 'technique.' + LEFTOVER_ID + '.step',", [KERNEL, { app: 'generator', suites: 'i18n' }]);
add('R09 assumes uniqueness', SUBSET, 'variantScope: [LEFTOVER_VARIANT],' + CRLF + '      assumesUniqueness: false,', 'variantScope: [LEFTOVER_VARIANT],' + CRLF + '      assumesUniqueness: true,', [KERNEL, WEIGHTS]);
add('R10 not registered twice: the guard dropped', SUBSET, 'if (!SG.techniques.has(LEFTOVER_ID)) {', 'if (true) {', [KERNEL]);
add('R11 the registered id lawOfLeftover', SUBSET, "const LEFTOVER_ID = 'lawOfLeftovers';", "const LEFTOVER_ID = 'lawOfLeftover';", [KERNEL, WEIGHTS]);
add('R12 find passes the options through', SUBSET, 'find: function (model, state, ctx) { return findLeftovers(model, state, ctx); }', 'find: function (model, state, ctx, opts) { return findLeftovers(model, state, ctx, opts); }', [KERNEL]);
add('R13 find with a limit of 49999', SUBSET, 'find: function (model, state, ctx) { return findLeftovers(model, state, ctx); }', 'find: function (model, state, ctx) { return findLeftovers(model, state, ctx, { workLimit: 49999 }); }', [KERNEL]);
add('R14 find with a limit of 50001', SUBSET, 'find: function (model, state, ctx) { return findLeftovers(model, state, ctx); }', 'find: function (model, state, ctx) { return findLeftovers(model, state, ctx, { workLimit: 50001 }); }', [KERNEL]);
add('R15 find never finds anything', SUBSET, 'find: function (model, state, ctx) { return findLeftovers(model, state, ctx); }', 'find: function (model, state, ctx) { findLeftovers(model, state, ctx); return null; }', [KERNEL]);
add('R16 find reads another context', SUBSET, 'find: function (model, state, ctx) { return findLeftovers(model, state, ctx); }', 'find: function (model, state, ctx) { return findLeftovers(model, state, SG.techniques.createContext(model, {})); }', [KERNEL]);
add('R17 registered with the limits object shared and mutable', SUBSET, 'const LEFTOVER_LIMITS = Object.freeze({ units: 2, cells: 4, work: 50000 });', 'const LEFTOVER_LIMITS = { units: 2, cells: 4, work: 50000 };', [KERNEL]);

// ---- S: scope
add('S01 scope: every variant', SUBSET, 'variantScope: [LEFTOVER_VARIANT],', 'variantScope: null,', [KERNEL]);
add('S02 scope: jigsaw9 and classic9', SUBSET, 'variantScope: [LEFTOVER_VARIANT],', "variantScope: [LEFTOVER_VARIANT, 'classic9'],", [KERNEL]);
add('S03 scope: killer', SUBSET, 'variantScope: [LEFTOVER_VARIANT],', "variantScope: ['killer'],", [KERNEL]);
add('S04 the finder\'s own scope check dropped', SUBSET, 'if (model.variantId === LEFTOVER_VARIANT) found = scanLeftovers(model, state, ctx, run);', 'found = scanLeftovers(model, state, ctx, run);', [KERNEL]);
add('S05 the finder\'s scope id is jigsaw', SUBSET, "const LEFTOVER_VARIANT = 'jigsaw9';", "const LEFTOVER_VARIANT = 'jigsaw';", [KERNEL]);
add('S06 the finder\'s scope check also lets classic9 through', SUBSET, 'if (model.variantId === LEFTOVER_VARIANT) found = scanLeftovers(model, state, ctx, run);', "if (model.variantId === LEFTOVER_VARIANT || model.variantId === 'classic9') found = scanLeftovers(model, state, ctx, run);", [KERNEL]);

// ---- W: weight and order
add('W01 weight 199', DIFFICULTY, 'lawOfLeftovers: 200,', 'lawOfLeftovers: 199,', [WEIGHTS, FLOOR]);
add('W02 weight 201', DIFFICULTY, 'lawOfLeftovers: 200,', 'lawOfLeftovers: 201,', [WEIGHTS, FLOOR]);
add('W03 weight 180 (tie with nakedTriple)', DIFFICULTY, 'lawOfLeftovers: 200,', 'lawOfLeftovers: 180,', [WEIGHTS, FLOOR]);
add('W04 weight 220 (tie with hiddenTriple)', DIFFICULTY, 'lawOfLeftovers: 200,', 'lawOfLeftovers: 220,', [WEIGHTS, FLOOR]);
add('W05 weight 320 (a Hard-tier weight)', DIFFICULTY, 'lawOfLeftovers: 200,', 'lawOfLeftovers: 320,', [WEIGHTS, FLOOR]);
add('W06 weight 140 (an Easy-tier weight)', DIFFICULTY, 'lawOfLeftovers: 200,', 'lawOfLeftovers: 140,', [WEIGHTS, FLOOR]);
add('W07 no weight entry', DIFFICULTY, '    lawOfLeftovers: 200,' + CRLF, '', [WEIGHTS, FLOOR]);

// ---- A: the scoped cost adapter (helper of the tool)
add('A01 no scoped fixtures are read: the technique is refused again', COST_HELPER, 'var scoped = item.scoped || null;', 'var scoped = null;', [COST]);
add('A02 the scope of the fixtures is not compared with the technique\'s', COST_HELPER, ' || !sameList(scoped.scope, item.scope)', '', [COST]);
add('A03 the fixture file is not compared with the board of the scope', COST_HELPER, 'scoped.source !== board || ', '', [COST]);
add('A04 every case on the classic9 board', COST_HELPER, 'if (c.scope === null || c.scope === undefined) {', 'if (true) {', [COST]);
add('A05 a classic case is planned with a scope', COST_HELPER, 'add(item, item, null);', "add(item, item, 'jigsaw9');", [COST]);
add('A06 the puzzle of a scoped record is the classic field', COST_HELPER, 'puzzle: scoped ? c.fixture.givens : c.fixture.puzzle,', 'puzzle: c.fixture.puzzle,', [COST]);
add('A07 the record names no board', COST_HELPER, 'record.model = c.scope;', 'record.model = null;', [COST]);
add('A08 the record keeps no region map', COST_HELPER, 'record.cellRegion = copy(c.fixture.cellRegion);', 'record.cellRegion = null;', [COST]);
add('A09 the board of a run is always classic9', COST_HELPER, "return ids.length === 1 ? ids[0] : ids.length === 0 ? MODEL_ID : 'mixed';", 'return MODEL_ID;', [COST]);
add('A10 a mixed run names its first board', COST_HELPER, "return ids.length === 1 ? ids[0] : ids.length === 0 ? MODEL_ID : 'mixed';", 'return ids.length === 0 ? MODEL_ID : ids[0];', [COST]);
add('A11 a second board accepted for the killer scope', COST_HELPER, "var SCOPED_FIXTURES = { jigsaw9: 'jigsawTechniques' };", "var SCOPED_FIXTURES = { jigsaw9: 'jigsawTechniques', killer: 'jigsawTechniques' };", [COST]);
add('A12 the empty scoped lists are accepted', COST_HELPER, 'scoped.positive.length + scoped.negative.length === 0', 'false', [COST]);
add('A13 the scoped refusal text names no scope', COST_HELPER, "var where = 'technique ' + item.id + ' is scoped to [' + item.scope.join(', ') + ']';", "var where = 'technique ' + item.id + ' is scoped';", [COST]);

// ---- T: the identity of a cost record (the tool runs as a process: the hook reaches it through NODE_OPTIONS)
add('T01 the tool hash leaves out the helper', COST_TOOL, "const TOOL_FILES = ['tests/pattern-cost.js', HELPER];", "const TOOL_FILES = ['tests/pattern-cost.js'];", [COST]);
add('T02 the fixture hash leaves out the scoped fixtures', COST_TOOL, "hash.update(rel + '\\0' + readSource(rel).replace(/\\r\\n/g, '\\n'));", "if (!/jigsaw-techniques/.test(rel)) hash.update(rel + '\\0' + readSource(rel).replace(/\\r\\n/g, '\\n'));", [COST]);
add('T03 the fixture hash leaves out the Jigsaw builder', COST_TOOL, "hash.update(rel + '\\0' + readSource(rel).replace(/\\r\\n/g, '\\n'));", "if (!/jigsaw-models/.test(rel)) hash.update(rel + '\\0' + readSource(rel).replace(/\\r\\n/g, '\\n'));", [COST]);

// ---- H: help integration (locale packs of both apps, the saved example of the Player's guide, the two tests.html fixture lists)
const GEN_I18N = { app: 'generator', suites: 'i18n' };
const PL_I18N = { app: 'player', suites: 'i18n' };
const PL_HELP = { app: 'player', suites: 'help' };
const PL_TOOLS = { app: 'player', suites: 'help-example-tools' };
const LOCALES = [
  ['generator English', 'generator/js/ui/locale.en.js', [GEN_I18N], 'Law of Leftovers', 'the lines {lines} and', 'the regions {regions} are', 'The cells left over, {cells},', 'the digits {digits} in a'],
  ['generator Vietnamese', 'generator/js/ui/locale.vi.js', [GEN_I18N], 'Luật phần dư (Law of Leftovers)', 'các hàng/cột {lines} và', 'các vùng {regions} đều', 'Các ô còn lại, {cells}, chia', '{digits} vào đó, chữ số ấy'],
  ['player English', 'player/js/ui/locale.en.js', [PL_I18N, PL_HELP], 'Law of Leftovers', 'the lines {lines} and', 'the regions {regions} are', 'The cells left over, {cells},', 'the digits {digits} in a'],
  ['player Vietnamese', 'player/js/ui/locale.vi.js', [PL_I18N, PL_HELP], 'Luật phần dư (Law of Leftovers)', 'các hàng/cột {lines} và', 'các vùng {regions} đều', 'Các ô còn lại, {cells}, chia', '{digits} vào đó, chữ số ấy']
];
LOCALES.forEach((l) => {
  const where = l[0];
  const target = l[1];
  const runs = l[2];
  add('H name of the technique missing (' + where + ')', target, "'technique.lawOfLeftovers': '" + l[3] + "',", '', runs);
  add('H description key renamed (' + where + ')', target, "'technique.lawOfLeftovers.desc':", "'technique.lawOfLeftovers.descX':", runs);
  add('H step keeps no {lines} (' + where + ')', target, l[4], l[4].replace('{lines}', ''), runs);
  add('H step keeps no {regions} (' + where + ')', target, l[5], l[5].replace('{regions}', ''), runs);
  add('H step keeps no {cells} (' + where + ')', target, l[6], l[6].replace('{cells}', ''), runs);
  add('H step names {digit} instead of {digits} (' + where + ')', target, l[7], l[7].replace('{digits}', '{digit}'), runs);
});
const HELP_EXAMPLES = 'player/js/ui/help-examples.js';
const EX = (name, from, to) => add('H saved example: ' + name, HELP_EXAMPLES, from, to, [PL_HELP, PL_TOOLS]);
EX('the technique id of the entry renamed', '    lawOfLeftovers: {"variant":"jigsaw9",', '    lawOfLeftoversX: {"variant":"jigsaw9",');
EX('variant classic9', 'lawOfLeftovers: {"variant":"jigsaw9",', 'lawOfLeftovers: {"variant":"classic9",');
EX('the map has a region of ten cells', '"cellRegion":[0,0,0,1,1,1,1,1,1,0,0,0,2,', '"cellRegion":[1,0,0,1,1,1,1,1,1,0,0,0,2,');
EX('the map of the regular boxes', '"cellRegion":[0,0,0,1,1,1,1,1,1,0,0,0,2,3,3,3,1,1,0,0,2,2,4,3,3,5,1,0,2,2,2,4,3,3,5,5,6,6,2,2,4,3,3,5,5,6,6,2,4,4,4,5,5,5,6,6,4,4,4,7,8,5,8,6,6,7,7,7,7,8,8,8,6,7,7,7,7,8,8,8,8]',
  '"cellRegion":[0,0,0,1,1,1,2,2,2,0,0,0,1,1,1,2,2,2,0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,3,3,3,4,4,4,5,5,5,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,6,6,6,7,7,7,8,8,8,6,6,6,7,7,7,8,8,8]');
EX('two cells of the map swapped (same region sizes)', '"cellRegion":[0,0,0,1,1,1,1,1,1,0,0,0,2,3,', '"cellRegion":[1,0,0,1,1,1,0,1,1,0,0,0,2,3,');
EX('the other region named in the step', '"regions":["J8","J9"]', '"regions":["J7","J9"]');
EX('the other lines named in the step', '"lines":["R8","R9"]', '"lines":["R8","R7"]');
EX('another digit in the step', '"R9C1"],"digits":[4]', '"R9C1"],"digits":[5]');
EX('another digit eliminated', '"eliminations":[[64,4]]', '"eliminations":[[64,5]]');
EX('another cell eliminated', '"eliminations":[[64,4]],"region"', '"eliminations":[[63,4]],"region"');
EX('a cell missing from the hint', '"cells":[59,60,62,63,64,72]', '"cells":[59,60,62,63,64,73]');
EX('another step of the source', 'regions: 111222222 111344422 113354462 133354466 773354466 773555666 775558969 778888999 788889999","step":22}}', 'regions: 111222222 111344422 113354462 133354466 773354466 773555666 775558969 778888999 788889999","step":21}}');
EX('another mask of the notes shown', '"notes":{"59":17,"64":89,"72":81}', '"notes":{"59":17,"64":89,"72":80}');
EX('the values changed', '"values":"..3...6.2....6..9', '"values":"..3...6.1....6..9');
add('H generator tests.html lists no jigsaw-techniques fixture', 'generator/tests.html', "'jigsaw-models', 'jigsaw-techniques', ", "'jigsaw-models', ", [{ app: 'generator', suites: 'ui-contract' }]);
add('H player tests.html lists no jigsaw-techniques fixture', 'player/tests.html', "'../core/tests/fixtures/jigsaw-techniques.js',", '', [{ app: 'player', suites: 'ui-contract' }]);

module.exports = M;
