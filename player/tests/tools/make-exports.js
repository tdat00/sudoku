#!/usr/bin/env node
'use strict';

/*
 * Regenerates the text fixtures of tests/fixtures/exports/ from a checkout of sudoku-generator.
 *
 *   node tests/tools/make-exports.js <path-to-sudoku-generator> [--out=<dir>]
 *
 * Each file is the real output of the generator's "Export" box (`SG.exportUi.buildExportText`), in English
 * (`<name>.en.txt`) and in Vietnamese (`<name>.vi.txt`): this is what the player's Import takes. The generator
 * repository is only READ (its sources are loaded with vm.runInThisContext, as its tests/node-runner.js does).
 * The fixtures are committed, so this is only needed when the generator's text format changes.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PLAYER_ROOT = path.resolve(__dirname, '..', '..');

/** One entry per file: the puzzles written, in this order, as [variantId, difficulty, seed]. */
const SETS = {
  'classic-mixed': [['classic9', 'easy', 3], ['classic4', 'veryEasy', 2], ['classic6', 'veryEasy', 7],
    ['classic9', 'hard', 4]],
  structured: [['jigsaw9', 'easy', 3], ['killer', 'easy', 5], ['greaterThan', 'easy', 4], ['wordoku', 'easy', 6]],
  derived: [['diagonalX', 'easy', 6], ['hyper', 'easy', 7], ['mega12', 'easy', 2], ['mega16', 'easy', 2]],
  multigrid: [['samurai', 'easy', 2], ['sohei', 'normal', 3], ['butterfly', 'easy', 4], ['flower', 'easy', 5]],
  single: [['classic9', 'easy', 21]]
};

function parseArgs(argv) {
  const opts = { generator: null, out: path.join(PLAYER_ROOT, 'tests', 'fixtures', 'exports') };
  argv.forEach(function (arg) {
    const m = /^--out=(.*)$/.exec(arg);
    if (m) opts.out = path.resolve(m[1]);
    else if (!arg.startsWith('--') && opts.generator === null) opts.generator = path.resolve(arg);
    else throw new Error('Unknown argument: ' + arg);
  });
  if (opts.generator === null) throw new Error('Usage: node tests/tools/make-exports.js <generator-repo>');
  return opts;
}

function loadGenerator(dir) {
  const runner = fs.readFileSync(path.join(dir, 'tests', 'node-runner.js'), 'utf8');
  const block = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (block === null) throw new Error('SOURCE_FILES not found in the generator tests/node-runner.js');
  block[1].match(/'([^']+)'/g).map(function (s) { return s.slice(1, -1); }).forEach(function (rel) {
    const abs = path.join(dir, rel);
    if (fs.existsSync(abs)) vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  });
  return globalThis.SG;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const SG = loadGenerator(opts.generator);
  fs.mkdirSync(opts.out, { recursive: true });
  Object.keys(SETS).forEach(function (name) {
    const items = SETS[name].map(function (a) {
      return { result: SG.pipeline.run({ variantId: a[0], difficulty: a[1], seed: a[2], trace: 'off',
        variantOptions: {} }, null) };
    });
    ['en', 'vi'].forEach(function (code) {
      SG.i18n.setLocale(code);
      fs.writeFileSync(path.join(opts.out, name + '.' + code + '.txt'), SG.exportUi.buildExportText(items));
    });
    console.log('wrote ' + name + ' (' + items.length + ' puzzles, en + vi)');
  });
  SG.i18n.setLocale('en');
}

main();
