'use strict';

/*
 * MS18d Phase B task-owned tests of the pure parts of freeze-targets.js, on synthetic text: the exact
 * reading of the targets of the design table, the table parser, the literal reader of the retained
 * budgets and the comparison of the retained budgets with the frozen targets. The real tree is checked
 * by running the freeze itself, not here.
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-b/test-freeze-targets.js
 */
const assert = require('assert');
const ft = require('./freeze-targets.js');

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

test('a target is read exactly to the millisecond: seconds with up to three decimals, never rounded', () => {
  const ms = (cell) => ft.parseTarget(cell).ms;
  assert.deepStrictEqual(['< 31 ms', '< 0.031 s', '< 2.342 s', '< 30 s', '< 18.842 s', '< 1.2 s', '< 10 s']
    .map(ms), [31, 31, 2342, 30000, 18842, 1200, 10000]);
  assert.deepStrictEqual(ft.parseTarget('**< 2.627 s**'), { ms: 2627, bold: true });
  assert.deepStrictEqual(ft.parseTarget('\u2014'), { ms: null, bold: false });
  ['< 2.3421 s', '< 31.5 ms', '< 2 min', '2 s', '**< 3 s', '< 3 s**', ''].forEach((bad) => {
    assert.throws(() => ft.parseTarget(bad), Error, bad);
  });
});

const TABLE = [
  'text before', '', '| Variant | veryEasy | easy | normal | hell2 |', '|---|---|---|---|---|',
  '| `alpha` | **< 31 ms** | \u2014 | < 1.2 s | **< 30 s** |',
  '| `beta` | < 150 ms | < 2.342 s | \u2014 | < 10 s |',
  '', 'text after'
].join('\r\n');

test('the table of design.md is read per variant and level, with the bold cells and the dashes', () => {
  const t = ft.parseDesignTable(TABLE);
  assert.deepStrictEqual(t.levels, ['veryEasy', 'easy', 'normal', 'hell2']);
  assert.deepStrictEqual(Object.keys(t.rows), ['alpha', 'beta']);
  assert.deepStrictEqual(t.rows.alpha.veryEasy, { ms: 31, bold: true });
  assert.deepStrictEqual(t.rows.alpha.easy, { ms: null, bold: false });
  assert.deepStrictEqual(t.rows.beta.easy, { ms: 2342, bold: false });
  assert.throws(() => ft.parseDesignTable('no table here'), /not in design.md/);
});

test('a budget literal is evaluated as data only', () => {
  const text = 'var X = 1;\r\n  var BUDGET_MS = { a: 1, b: 2,\r\n    c: 3 };\r\nvar Y = {};';
  assert.deepStrictEqual(ft.literalAfter(text, /var BUDGET_MS = (\{[\s\S]*?\});/), { a: 1, b: 2, c: 3 });
  assert.throws(() => ft.literalAfter(text, /var NOPE = (\{[\s\S]*?\});/), /not found/);
});

test('retained budgets: only offered levels are compared; the larger of two rows; the mega table', () => {
  const published = { alpha: ['veryEasy', 'easy'], beta: ['veryEasy', 'normal'],
    mega12: ['veryEasy', 'nightmare'], mega16: ['veryEasy'] };
  const targets = { alpha: { veryEasy: 10, easy: 500 }, beta: { veryEasy: 20, normal: 3000 },
    mega12: { veryEasy: 400, nightmare: 18842 }, mega16: { veryEasy: 1500 } };
  const suites = [
    { file: 'one.test.js', variants: ['alpha'],
      text: 'var BUDGET_MS = { veryEasy: 10, easy: 350, hard: 99 };' },
    { file: 'two.test.js', variants: ['alpha', 'beta'],
      text: 'var BUDGET_MS = { veryEasy: 15, easy: 500, normal: 200, hell2: 7 };' },
    { file: 'mega.test.js', variants: ['mega12', 'mega16'], text: [
      '  var BOARDS = {', '    mega12: { digits: 12, peers: 11 + 11 + 6,',
      '      budgets: { veryEasy: 400, nightmare: 3000, hell1: 4500 } },',
      '    mega16: { digits: 16, budgets: { veryEasy: 1500, hell1: 10000 } }', '  };'].join('\n') }
  ];
  assert.deepStrictEqual(ft.retainedDifferences(suites, published, targets), [
    ['one.test.js', 'alpha', 'easy', 350, 500], ['two.test.js', 'alpha+beta', 'veryEasy', 15, 20],
    ['two.test.js', 'beta', 'normal', 200, 3000], ['mega.test.js', 'mega12', 'nightmare', 3000, 18842]]);
});

test('the pairs as the documents write them: a comma in English, a dot in Vietnamese', () => {
  assert.strictEqual(ft.pairText(700, 5425, ','), '700 \u2192 5,425');
  assert.strictEqual(ft.pairText(3000, 18842, '.'), '3.000 \u2192 18.842');
  assert.strictEqual(ft.group(1234567, ','), '1,234,567');
  assert.strictEqual(ft.DOCUMENTED_CV6.length, 11);
  assert.ok(ft.DOCUMENTED_CV6.every((r) => r[3] !== r[4]));
});

console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
