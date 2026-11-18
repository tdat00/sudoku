'use strict';

/*
 * MS17b scratch: the limit-freeze audit. Reads the production sources (file-only, no generation, no run of the engine) and
 * compares every value of the dispatch inventory (the brief's "Limit-freeze inventory" and "separate generation/window
 * policies" tables) with the numeric literal that the source holds, then writes a text transcript. A mismatch exits 1: it is a
 * QUESTION, never an edit. Usage (from the repository root):
 *   node generator/tests/artifacts/difficulty-v3/MS17b/limit-audit.cjs <out file>
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const FISH = 'core/js/engine/tech-fish.js';
const WING = 'core/js/engine/tech-wing.js';
const CHAIN = 'core/js/engine/tech-chain.js';
const SUBSET = 'core/js/engine/tech-subset.js';
const ALS = 'core/js/engine/tech-als.js';
const DIGGER = 'generator/js/engine/digger.js';
const DIFFICULTY = 'generator/js/engine/difficulty.js';
const CACHE = 'generator/js/ui/cache.js';
const PIPELINE = 'generator/js/engine/pipeline.js';

const constant = (name) => new RegExp('(?:const|let)\\s+' + name + '\\s*=\\s*([0-9]+)\\s*;');
const rows = [];
function check(label, file, pattern, expected) {
  const text = read(file);
  const m = pattern.exec(text);
  const found = m ? m.slice(1).join('/') : '(not found)';
  rows.push({ label, file, expected: String(expected), found, ok: found === String(expected) });
}

// the new pattern finders
[['Skyscraper', 'SKYSCRAPER_WORK_LIMIT'], ['Two-string kite', 'KITE_WORK_LIMIT'],
  ['Empty rectangle', 'EMPTY_RECTANGLE_WORK_LIMIT'], ['Finned X-Wing', 'FINNED_X_WING_WORK_LIMIT'],
  ['Finned Swordfish', 'FINNED_SWORDFISH_WORK_LIMIT']].forEach(([label, name]) => check(label + ' ' + name, FISH, constant(name), 50000));
[['Remote Pairs', 'REMOTE_PAIRS_WORK_LIMIT'], ['WXYZ-Wing', 'WXYZ_WORK_LIMIT'], ['UR types 3/4', 'UNIQUE_RECTANGLE_WORK_LIMIT'],
  ['Hidden UR', 'UNIQUE_RECTANGLE_HIDDEN_WORK_LIMIT'], ['BUG+1', 'BUG_PLUS_ONE_WORK_LIMIT']].forEach(([label, name]) => check(label + ' ' + name, WING, constant(name), 50000));
check('New singleton-chain kernels and XY-chain NEW_FINDER_WORK_LIMIT', CHAIN, constant('NEW_FINDER_WORK_LIMIT'), 50000);
check('Chain seam default DEFAULT_WORK_LIMIT (a seam default, not a local limit)', CHAIN, constant('DEFAULT_WORK_LIMIT'), 50000);
check('Grouped GROUP_NODE_LIMIT', CHAIN, constant('GROUP_NODE_LIMIT'), 4096);
check('Grouped GRAPH_WORK_LIMIT', CHAIN, constant('GRAPH_WORK_LIMIT'), 50000);
check('Parent budget check interval WORK_CHECK_UNITS (chain)', CHAIN, constant('WORK_CHECK_UNITS'), 256);
check('XY-chain ceiling XY_MAX_CHAIN_LENGTH', CHAIN, constant('XY_MAX_CHAIN_LENGTH'), 12);
check('Long forcing ceiling LONG_MAX_CHAIN_LENGTH', CHAIN, constant('LONG_MAX_CHAIN_LENGTH'), 12);
check('Legacy nishio depth SHALLOW_NISHIO_DEPTH', CHAIN, constant('SHALLOW_NISHIO_DEPTH'), 1);
check('nishioDeep minimum DEEP_NISHIO_MIN_DEPTH', CHAIN, constant('DEEP_NISHIO_MIN_DEPTH'), 2);
check('nishioDeep default DEFAULT_DEEP_NISHIO_DEPTH', CHAIN, constant('DEFAULT_DEEP_NISHIO_DEPTH'), 2);
check('nishioDeep caller ceiling NISHIO_DEPTH_CEILING', CHAIN, constant('NISHIO_DEPTH_CEILING'), 3);
check('Nested candidates NESTED_MAX_CANDIDATES', CHAIN, constant('NESTED_MAX_CANDIDATES'), 3);
check('Law of Leftovers LEFTOVER_LIMITS units/cells/work', SUBSET,
  /LEFTOVER_LIMITS\s*=\s*Object\.freeze\(\{\s*units:\s*([0-9]+),\s*cells:\s*([0-9]+),\s*work:\s*([0-9]+)\s*\}\)/, '2/4/50000');
check('ALS LIMITS cells/records/work', ALS,
  /const LIMITS\s*=\s*Object\.freeze\(\{\s*cells:\s*([0-9]+),\s*records:\s*([0-9]+),\s*work:\s*([0-9]+)\s*\}\)/, '4/4096/50000');
check('Sue de Coq SDC_WORK_LIMIT', ALS, constant('SDC_WORK_LIMIT'), 50000);

// generation and window policies
check('R9 chain cutoff C, INITIAL_SHORT_MAX', CHAIN, constant('INITIAL_SHORT_MAX'), 4);
check('R9 C exported as SG.chainSearch.SHORT_MAX', CHAIN, /SHORT_MAX:\s*(INITIAL_SHORT_MAX)\b/, 'INITIAL_SHORT_MAX');
check('R5 shallow allowance SHALLOW_SEARCH_DEFAULT', DIGGER, constant('SHALLOW_SEARCH_DEFAULT'), 256);
check('R5 exported as SG.digger.SHALLOW_SEARCH_RATINGS', DIGGER, /SHALLOW_SEARCH_RATINGS:\s*(SHALLOW_SEARCH_DEFAULT)\b/, 'SHALLOW_SEARCH_DEFAULT');
check('Size attempts: small board cells', DIGGER, constant('SMALL_BOARD_CELLS'), 81);
check('Size attempts: medium board cells', DIGGER, constant('MEDIUM_BOARD_CELLS'), 144);
check('Size attempts: 8 / 4 / 2 returns', DIGGER,
  /cellCount <= SMALL_BOARD_CELLS\) return ([0-9]+);\s*return cellCount <= MEDIUM_BOARD_CELLS \? ([0-9]+) : ([0-9]+);/, '8/4/2');
check('Pipeline small-board attempts (not a global eight)', PIPELINE,
  /DEFAULT_MAX_ATTEMPTS\s*=\s*(SG\.digger\.defaultMaxAttempts\(SG\.digger\.SMALL_BOARD_CELLS\));/, 'SG.digger.defaultMaxAttempts(SG.digger.SMALL_BOARD_CELLS)');
check('Dig tries DEFAULT_DIG_TRIES', DIGGER, constant('DEFAULT_DIG_TRIES'), 12);
check('Dig tries, coarse symmetries DEFAULT_DIG_TRIES_COARSE', DIGGER, constant('DEFAULT_DIG_TRIES_COARSE'), 30);
check('CAP_RATINGS', DIGGER, constant('CAP_RATINGS'), 1024);
check('CAP_PROPOSALS', DIGGER, constant('CAP_PROPOSALS'), 32768);
check('REFINE_RATINGS', DIGGER, constant('REFINE_RATINGS'), 64);
check('UNIQUE_NODES', DIGGER, constant('UNIQUE_NODES'), 200000);
check('OBJECTIVE_STEPS', DIGGER, constant('OBJECTIVE_STEPS'), 100000);

// the version
check('Rating version', DIFFICULTY, constant('RATING_VERSION'), 3);
check('Cache schema version', CACHE, constant('SCHEMA_VERSION'), 3);
check('Cache storage key', CACHE, /const STORAGE_KEY = '([^']+)';/, 'sg.cache.v1');

const bad = rows.filter((r) => !r.ok);
const lines = ['MS17b limit-freeze audit (file-only; sources read from the working tree)'];
rows.forEach((r) => lines.push((r.ok ? 'ok       ' : 'MISMATCH ') + r.label + ': expected ' + r.expected + ', found ' + r.found + '   [' + r.file + ']'));
lines.push(rows.length + ' values checked, ' + bad.length + ' mismatch(es)');
lines.forEach((l) => console.log(l));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(bad.length === 0 ? 0 : 1);
