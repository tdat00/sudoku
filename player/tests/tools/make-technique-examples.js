#!/usr/bin/env node
'use strict';

/*
 * Finds a concrete example for every technique of the Help page and writes js/ui/help-examples.js.
 *
 *   node tests/tools/make-technique-examples.js <path-to-sudoku-generator> [--puzzles=<n>] [--out=<file>]
 *
 * Stage 1 (a child process that loads the generator, which is only READ) makes a list of puzzles of several
 * variants and levels, as the text of the generator's Export box. Stage 2 plays each of them the way a person
 * who keeps asking for hints would: fill in all the notes, ask for a hint, apply it, and so on until the
 * game is stuck or solved. The first hint of every technique is a candidate for its example, and the easiest
 * one to read wins (the fewest cells, removals and candidates on show, a plain 9x9 board preferred; the
 * earliest on a tie). What is written is a snapshot of the board and the hint, so the guide draws it at once
 * and plays nothing (`SG.helpExamples`, see js/ui/help.js); the puzzle and the number of hints are kept in it
 * only so that a test can check the snapshot against the player's own hints. The file is committed; this is
 * only needed when the solver, the hints or the generator change.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const PLAYER_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DEFAULT = path.join(PLAYER_ROOT, 'js', 'ui', 'help-examples.js');

/** [variantId, preferred levels, number of seeds, optional 'highest' supported level only]. */
const PLAN = [
  ['classic9', ['easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'], 120],
  ['killer', ['easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'], 60],
  ['greaterThan', ['easy', 'normal', 'hard'], 12],
  ['jigsaw9', ['hard', 'expert', 'master'], 40],
  ['diagonalX', ['hard', 'expert', 'master', 'nightmare'], 40],
  ['hyper', ['hard', 'expert', 'master', 'nightmare'], 40],
  // The rarest techniques (Jellyfish) need many hard puzzles to turn up.
  ['classic9', ['nightmare', 'hell1', 'hell2'], 1500, 'highest'],
  ['diagonalX', ['nightmare', 'hell1', 'hell2'], 600, 'highest'],
  ['hyper', ['nightmare', 'hell1', 'hell2'], 600, 'highest']
];

function parseArgs(argv) {
  const opts = { generator: null, puzzles: 0, out: OUT_DEFAULT, stage1: null };
  argv.forEach(function (arg) {
    let m;
    if ((m = /^--puzzles=(\d+)$/.exec(arg))) opts.puzzles = Number(m[1]);
    else if ((m = /^--out=(.*)$/.exec(arg))) opts.out = path.resolve(m[1]);
    else if ((m = /^--stage1=(.*)$/.exec(arg))) opts.stage1 = path.resolve(m[1]);
    else if (!arg.startsWith('--') && opts.generator === null) opts.generator = path.resolve(arg);
    else throw new Error('Unknown argument: ' + arg);
  });
  if (opts.generator === null) throw new Error('Usage: node tests/tools/make-technique-examples.js <generator-repo>');
  return opts;
}

function loadSources(dir) {
  const runner = fs.readFileSync(path.join(dir, 'tests', 'node-runner.js'), 'utf8');
  const block = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (block === null) throw new Error('SOURCE_FILES not found in ' + dir);
  block[1].match(/'([^']+)'/g).map(function (s) { return s.slice(1, -1); }).forEach(function (rel) {
    const abs = path.join(dir, rel);
    if (fs.existsSync(abs)) vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  });
  return globalThis.SG;
}

// ---------------------------------------------------------------------------------------------
// Stage 1: the generator makes the puzzles
// ---------------------------------------------------------------------------------------------

function stage1(opts) {
  const SG = loadSources(opts.generator);
  SG.i18n.setLocale('en');
  const list = [];
  PLAN.forEach(function (row) {
    const supported = SG.variants.get(row[0]).difficultySupport;
    let levels = row[1].filter(function (level) { return supported.indexOf(level) !== -1; });
    if (row[3] === 'highest') levels = levels.slice(-1);
    levels.forEach(function (level) {
      for (let seed = 1; seed <= row[2]; seed++) {
        const result = SG.pipeline.run({ variantId: row[0], difficulty: level, seed: seed, trace: 'off',
          variantOptions: {} }, null);
        list.push({ variantId: row[0], level: level, seed: seed,
          text: SG.exportUi.buildExportText([{ result: result }]) });
      }
    });
  });
  fs.writeFileSync(opts.stage1, JSON.stringify(list));
}

// ---------------------------------------------------------------------------------------------
// Stage 2: play the puzzles with hints
// ---------------------------------------------------------------------------------------------

function popcount(mask) {
  let n = 0;
  for (let m = mask; m !== 0; m &= m - 1) n++;
  return n;
}

/** The cells whose notes the Help page draws: the area to look at, the cells of the hint and the ones it changes. */
function shownCells(hint) {
  const set = new Set(hint.region ? hint.region.cells : []);
  hint.cells.forEach(function (c) { set.add(c); });
  hint.targets.forEach(function (c) { set.add(c); });
  return Array.from(set).sort(function (a, b) { return a - b; });
}

/**
 * How hard an example is to read: the fewer cells, removals and candidates on show the clearer it is, and a plain
 * 9x9 board is clearer than one with extra regions.
 */
function difficulty(SG, game, hint, puzzle) {
  const scope = SG.techniques.get(hint.technique).variantScope;
  const extra = scope === null && puzzle.variantId !== 'classic9' ? 8 : 0;
  let clutter = 0;
  shownCells(hint).forEach(function (c) { if (game.userValue(c) === 0) clutter += popcount(game.getNotes(c)); });
  return hint.cells.length + hint.eliminations.length + hint.placements.length + clutter / 4 + extra;
}

/** Everything the page needs to draw an example without playing anything: the board, the notes, the hint. */
function snapshot(SG, game, puzzle, hint, item, step) {
  const model = puzzle.model;
  const n = model.cellCount;
  const notes = {};
  shownCells(hint).forEach(function (c) {
    if (game.userValue(c) === 0 && game.getNotes(c) !== 0) notes[c] = game.getNotes(c);
  });
  const digitsOf = function (list) {
    return Array.from(list).map(function (v) { return v > 0 ? String(v) : '.'; }).join('');
  };
  const values = [];
  for (let i = 0; i < n; i++) values.push(game.userValue(i));
  const out = {
    variant: puzzle.variantId,
    givens: digitsOf(puzzle.givens),
    values: digitsOf(values),
    notes: notes
  };
  if (model.cages.length > 0) {
    out.cages = model.cages.map(function (cage) { return { cells: Array.from(cage.cells), sum: cage.sum }; });
  }
  if (model.inequalities.length > 0) {
    out.signs = model.inequalities.map(function (sign) { return { a: sign.a, b: sign.b }; });
  }
  out.hint = {
    technique: hint.technique, nameKey: hint.nameKey, descKey: hint.descKey, stepKey: hint.stepKey,
    stepArgs: hint.stepArgs, kind: hint.kind, cells: hint.cells, targets: hint.targets,
    placements: hint.placements, eliminations: hint.eliminations, region: hint.region
  };
  out.source = { puzzle: item.text.trim(), step: step };
  return out;
}

async function stage2(opts, puzzles) {
  const SG = loadSources(PLAYER_ROOT);
  SG.i18n.setLocale('en');
  const best = new Map();
  let seen = 0;
  for (const item of puzzles) {
    seen++;
    const block = SG.importer.exportBlocks(item.text);
    const parsed = SG.importer.parseExportBlock(block[0], 1);
    if (!parsed.ok) continue;
    const outcome = SG.importer.openDocument(parsed.data, { kind: 'export' });
    if (!outcome.ok) continue;
    const puzzle = outcome.puzzle;
    const game = SG.play.createGame(puzzle.model, puzzle.givens, puzzle.solution, { now: function () { return 0; } });
    game.fillNotes();
    const found = [];
    for (let k = 0; k < 400 && !game.isSolved(); k++) {
      game.clearHint();
      const hint = game.hint();
      if (!hint || hint.ok !== true) break;
      found.push(hint.technique);
      // A cage of one cell is no example of a combination of digits: wait for a cage with at least two.
      const eligible = !(hint.technique === 'cageCombo' && hint.stepArgs && hint.stepArgs.size < 2);
      if (eligible) {
        const score = difficulty(SG, game, hint, puzzle);
        const old = best.get(hint.technique);
        if (old === undefined || score < old.score) {
          best.set(hint.technique, { score: score, data: snapshot(SG, game, puzzle, hint, item, k) });
        }
      }
      game.applyHint();
    }
    process.stdout.write('puzzle ' + seen + '/' + puzzles.length + ' ' + item.variantId + ' ' + item.level + ' ' +
      item.seed + ' -> ' + Array.from(new Set(found)).join(',') + '\n');
  }
  return best;
}

function write(opts, SG, best) {
  const ids = SG.techniques.list().map(function (tech) { return tech.id; });
  const missing = ids.filter(function (id) { return !best.has(id); });
  if (missing.length > 0) throw new Error('No example for: ' + missing.join(', '));
  const body = ids.map(function (id) {
    return '    ' + id + ': ' + JSON.stringify(best.get(id).data);
  }).join(',\n');
  const text = [
    '/**',
    ' * A concrete example for every technique of the guide (help.html): `SG.helpExamples[id]`. The data is a',
    ' * snapshot, so the page draws it at once and plays nothing:',
    ' *   variant   \'classic9\', \'diagonalX\', \'hyper\', \'killer\' (with `cages`) or \'greaterThan\' (with `signs`): the board to build;',
    ' *   givens, values   81 characters each, \'.\' for an empty cell: the clues, and what the hints entered so far;',
    ' *   notes     { cell: bit mask } of the cells that are drawn with their candidates;',
    ' *   hint      what `game.hint()` said at that moment (technique, text key and arguments, cells, the cells and',
    ' *             candidates it changes, the area to look at);',
    ' *   source    the puzzle (the text of the generator\'s Export box) and the number of hints applied (with all the',
    ' *             notes filled in first) before this one: only the tests use it, to check that the snapshot is still',
    ' *             what the player\'s own hint says.',
    ' *',
    ' * GENERATED by tests/tools/make-technique-examples.js: do not edit by hand.',
    ' */',
    '(function (root) {',
    '  \'use strict\';',
    '',
    '  const SG = root.SG = root.SG || {};',
    '',
    '  SG.helpExamples = Object.freeze({',
    body,
    '  });',
    '})(typeof self !== \'undefined\' ? self : globalThis);',
    ''
  ].join('\n');
  fs.writeFileSync(opts.out, text);
  console.log('wrote ' + path.relative(PLAYER_ROOT, opts.out) + ' (' + ids.length + ' examples)');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.stage1 !== null) {
    stage1(opts);
    return;
  }
  const tmp = path.join(os.tmpdir(), 'sg-technique-puzzles-' + process.pid + '.json');
  execFileSync(process.execPath, [__filename, opts.generator, '--stage1=' + tmp], { stdio: 'inherit',
    maxBuffer: 1 << 28 });
  const puzzles = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.unlinkSync(tmp);
  const best = await stage2(opts, opts.puzzles > 0 ? puzzles.slice(0, opts.puzzles) : puzzles);
  write(opts, globalThis.SG, best);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
