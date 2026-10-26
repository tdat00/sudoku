#!/usr/bin/env node
'use strict';

/*
 * Regenerates the puzzle documents of tests/fixtures/puzzles/ with the generator of this repository.
 *
 *   node tests/tools/make-fixtures.js [path-to-generator] [--only=classic9,killer] [--out=<dir>]
 *
 * The generator (default: ../generator) is only READ: its sources are loaded with vm.runInThisContext, the
 * way its own tests/node-runner.js does. For each puzzle the script runs `SG.pipeline.run` at an easy level
 * with a fixed seed and writes the document that the generator's "Play online" feature sends:
 *
 *   SG.exportUi.toJson(result, ctx)  +  model: SG.exchange.plain(SG.pipeline.toWire(result).model)
 *
 * `SG.exchange` is ../core/js/ui/exchange.js, which the generator's source list loads. The fixtures
 * are committed, so this script is only needed when the document format changes (see docs/fixtures.md).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PLAYER_ROOT = path.resolve(__dirname, '..', '..');
/** The generator sits next to the player in the repository. */
const DEFAULT_GENERATOR = path.resolve(PLAYER_ROOT, '..', 'generator');
const GENERATED_AT = '2026-01-15T10:00:00.000Z';

/** One entry per file: the generator config and the language of the labels the document carries. */
const FIXTURES = [
  { file: 'classic4', variantId: 'classic4', difficulty: 'veryEasy', seed: 4 },
  { file: 'classic6', variantId: 'classic6', difficulty: 'veryEasy', seed: 6 },
  { file: 'classic9', variantId: 'classic9', difficulty: 'easy', seed: 9 },
  { file: 'mega12', variantId: 'mega12', difficulty: 'easy', seed: 12 },
  { file: 'mega16', variantId: 'mega16', difficulty: 'easy', seed: 16 },
  { file: 'diagonalX', variantId: 'diagonalX', difficulty: 'easy', seed: 21 },
  { file: 'hyper', variantId: 'hyper', difficulty: 'easy', seed: 22 },
  { file: 'jigsaw9', variantId: 'jigsaw9', difficulty: 'easy', seed: 23 },
  { file: 'killer', variantId: 'killer', difficulty: 'easy', seed: 24 },
  { file: 'greaterThan', variantId: 'greaterThan', difficulty: 'normal', seed: 26,
    variantOptions: { futoshiki: true } },
  { file: 'samurai', variantId: 'samurai', difficulty: 'easy', seed: 26 },
  { file: 'sohei', variantId: 'sohei', difficulty: 'easy', seed: 27 },
  { file: 'butterfly', variantId: 'butterfly', difficulty: 'easy', seed: 28 },
  { file: 'flower', variantId: 'flower', difficulty: 'easy', seed: 29 },
  { file: 'wordoku', variantId: 'wordoku', difficulty: 'easy', seed: 30, symbolMode: 'word' },
  { file: 'classic9.vi', variantId: 'classic9', difficulty: 'normal', seed: 91, locale: 'vi' },
  { file: 'killer.vi', variantId: 'killer', difficulty: 'normal', seed: 92, locale: 'vi' },
  { file: 'wordoku.vi', variantId: 'wordoku', difficulty: 'easy', seed: 93, locale: 'vi', symbolMode: 'word',
    variantOptions: { language: 'vi' } }
];

function parseArgs(argv) {
  const opts = { generator: null, only: null, out: path.join(PLAYER_ROOT, 'tests', 'fixtures', 'puzzles') };
  argv.forEach(function (arg) {
    let m = /^--only=(.*)$/.exec(arg);
    if (m) opts.only = m[1].split(',');
    else if ((m = /^--out=(.*)$/.exec(arg))) opts.out = path.resolve(m[1]);
    else if (!arg.startsWith('--') && opts.generator === null) opts.generator = path.resolve(arg);
    else throw new Error('Unknown argument: ' + arg);
  });
  if (opts.generator === null) opts.generator = DEFAULT_GENERATOR;
  return opts;
}

function runFile(abs) {
  vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
}

/** The generator's own source list: the SOURCE_FILES array of its tests/node-runner.js, in load order. */
function generatorSources(root) {
  const runner = fs.readFileSync(path.join(root, 'tests', 'node-runner.js'), 'utf8');
  const block = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (block === null) throw new Error('SOURCE_FILES not found in the generator runner');
  return block[1].match(/'([^']+)'/g).map(function (s) { return s.slice(1, -1); });
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  runFile(path.join(opts.generator, '..', 'core', 'tests', 'harness.js'));
  generatorSources(opts.generator).forEach(function (rel) {
    const abs = path.join(opts.generator, rel);
    if (fs.existsSync(abs)) runFile(abs);
  });
  const SG = globalThis.SG;
  if (!SG.exportUi || !SG.pipeline || !SG.exchange) throw new Error('the generator sources did not load');

  fs.mkdirSync(opts.out, { recursive: true });
  FIXTURES.filter(function (f) { return opts.only === null || opts.only.indexOf(f.file) !== -1; })
    .forEach(function (f) {
      const started = Date.now();
      const config = { variantId: f.variantId, difficulty: f.difficulty, seed: f.seed, trace: 'off',
        variantOptions: f.variantOptions || {} };
      if (f.symbolMode) config.symbolMode = f.symbolMode;
      const result = SG.pipeline.run(config, null);
      const locale = f.locale || 'en';
      SG.i18n.setLocale(locale);
      const data = SG.exportUi.toJson(result, { generatedAt: GENERATED_AT, locale: locale });
      data.model = SG.exchange.plain(SG.pipeline.toWire(result).model);
      const text = JSON.stringify(data) + '\n';
      fs.writeFileSync(path.join(opts.out, f.file + '.json'), text);
      console.log(f.file + ': ' + Math.round(text.length / 100) / 10 + ' kB, ' + data.stats.clues + ' clues, ' +
        data.cages.length + ' cages, ' + data.inequalities.length + ' signs, ' + (Date.now() - started) + ' ms');
    });
}

main();
