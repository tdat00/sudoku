'use strict';

/*
 * MS13b scratch: the in-memory mutants of the consumers of version-2 group proofs (IR72 F1, adapted): the two `formatChains`
 * of `js/ui/i18n.js` (formatLiteral/isGroupLiteral), `localizeStep` of the Player's `js/ui/play.js`, `describeHint`'s cells
 * line and the group example of the four description texts. Every mutant is one exact fragment replaced once in one file of
 * one app; the file on disk is never touched (mutant-run.cjs). `suites` are the suites of that app that must fail.
 * `equivalent: <argument>` marks a mutant that is expected to survive, with the argument (none is claimed without one).
 */
const GEN = 'generator/js/ui/i18n.js';
const PLY = 'player/js/ui/i18n.js';
const PLAY = 'player/js/ui/play.js';
const OR = " \\u2228 ";
const AND = " \\u2227 ";
const NE = "\\u2260";

const out = [];
function add(app, target, name, from, to, extra) {
  out.push(Object.assign({ app: app, target: target, name: name, from: from, to: to }, extra || {}));
}

const formatterMutants = [
  ['a node is read as a triple', "return lit !== null && typeof lit === 'object' && Array.isArray(lit.cells);", 'return false;'],
  ['a group reduced to its first member', 'lit.cells.map(function (cell) {', 'lit.cells.slice(0, 1).map(function (cell) {'],
  ['a group reduced to its last member', 'lit.cells.map(function (cell) {', 'lit.cells.slice(-1).map(function (cell) {'],
  ['a false group joined by a disjunction', "members.join(lit.truth === 1 ? '" + OR + "' : '" + AND + "')",
    "members.join('" + OR + "')"],
  ['a true group joined by a conjunction', "members.join(lit.truth === 1 ? '" + OR + "' : '" + AND + "')",
    "members.join('" + AND + "')"],
  ['the two joins swapped', "members.join(lit.truth === 1 ? '" + OR + "' : '" + AND + "')",
    "members.join(lit.truth === 1 ? '" + AND + "' : '" + OR + "')"],
  ['no parentheses around a group', "'(' + members.join(lit.truth === 1 ? '" + OR + "' : '" + AND + "') + ')'",
    "members.join(lit.truth === 1 ? '" + OR + "' : '" + AND + "')"],
  ['a one-cell node in parentheses', 'if (members.length === 1) return members[0];', ''],
  ['the polarity of a node swapped', "const sign = lit.truth === 1 ? '=' : '" + NE + "';",
    "const sign = lit.truth === 0 ? '=' : '" + NE + "';"],
  ['the digit of a node read as a triple', 'cellLabel(cell, labeler) + sign + lit.digit; });',
    'cellLabel(cell, labeler) + sign + lit[1]; });'],
  ['a node always true', "const sign = lit.truth === 1 ? '=' : '" + NE + "';", "const sign = '=';"],
  ['the polarity of a legacy triple swapped', "(lit[2] === 1 ? '=' : '" + NE + "') + lit[1];",
    "(lit[2] === 0 ? '=' : '" + NE + "') + lit[1];"],
  ['a legacy triple read as a node', 'if (!isGroupLiteral(lit)) return', 'if (false) return']
];
formatterMutants.forEach(function (m) {
  add('generator', GEN, 'Generator formatChains: ' + m[0], m[1], m[2], { suites: 'i18n' });
  add('player', PLY, 'Player formatChains: ' + m[0], m[1], m[2], { suites: 'i18n,play' });
});
add('generator', GEN, 'Generator formatChains: the label function not passed to a group member',
  'cellLabel(cell, labeler) + sign + lit.digit; });', 'cellLabel(cell) + sign + lit.digit; });', { suites: 'i18n' });

const localize = [
  ['a node is not localized', 'if (!Array.isArray(step.cells)) return Object.assign({}, step);', 'return Object.assign({}, step);'],
  ['the cells of a node are not labelled',
    "cells: step.cells.map(function (c) { return typeof c === 'number' ? SG.model.cellLabel(model, c) : c; }),",
    'cells: step.cells.slice(),'],
  ['the digit of a node is not written', "digit: typeof step.digit === 'number' ? valueText(model, step.digit, mode) : step.digit",
    'digit: step.digit'],
  ['a group reduced to its first member', 'cells: step.cells.map(function (c) {', 'cells: step.cells.slice(0, 1).map(function (c) {'],
  ['the input node is written', 'return Object.assign({}, step, {', 'return Object.assign(step, {'],
  ['the input cells are shared', "cells: step.cells.map(function (c) { return typeof c === 'number' ? SG.model.cellLabel(model, c) : c; }),",
    "cells: step.cells.every(function (c) { return typeof c !== 'number'; }) ? step.cells : step.cells.map(function (c) { return typeof c === 'number' ? SG.model.cellLabel(model, c) : c; }),"],
  ['a written label is asked for again', "typeof c === 'number' ? SG.model.cellLabel(model, c) : c; }),",
    'SG.model.cellLabel(model, c); }),'],
  ['a written symbol is written again', "digit: typeof step.digit === 'number' ? valueText(model, step.digit, mode) : step.digit",
    'digit: valueText(model, step.digit, mode)'],
  ['a step it does not know is returned itself', 'if (!Array.isArray(step.cells)) return Object.assign({}, step);',
    'if (!Array.isArray(step.cells)) return step;'],
  ['the truth of a node is lost', 'return Object.assign({}, step, {', 'return Object.assign({}, {'],
  ['the symbol mode of a node ignored', 'valueText(model, step.digit, mode) : step.digit', "valueText(model, step.digit, 'digits') : step.digit"],
  ['the symbol mode of a triple ignored', 'valueText(model, step[1], mode), step[2]];', "valueText(model, step[1], 'digits'), step[2]];"],
  ['the cell of a triple not labelled', 'return [SG.model.cellLabel(model, step[0]),', 'return [step[0],'],
  ['a triple turned into a node', 'if (Array.isArray(step)) {', 'if (false) {'],
  ['only the first chain localized', 'out.chains = out.chains.map(function (chain) {',
    'out.chains = out.chains.map(function (chain, k) {\n        if (k > 0) return chain;']
];
localize.forEach(function (m) {
  add('player', PLAY, 'Player localizeStep: ' + m[0], m[1], m[2], { suites: 'play' });
});
add('player', PLAY, 'Player describeHint: the last cell of the Finding is not listed',
  "cells: tr('play.hint.cells', { cells: cellLabels(model, hint.cells).join(', ') }),",
  "cells: tr('play.hint.cells', { cells: cellLabels(model, hint.cells.slice(0, -1)).join(', ') }),", { suites: 'play' });

[['generator', 'generator/js/ui/locale.en.js', 'written (R1C1=5 \\u2228 R1C2=5)', 'written (R1C1=5 \\u2227 R1C2=5)'],
  ['player', 'player/js/ui/locale.en.js', 'written (R1C1=5 \\u2228 R1C2=5)', 'written (R1C1=5 \\u2227 R1C2=5)'],
  ['generator', 'generator/js/ui/locale.vi.js', 'viết (R1C1=5 \\u2228 R1C2=5)', 'viết (R1C1=5 \\u2227 R1C2=5)'],
  ['player', 'player/js/ui/locale.vi.js', 'viết (R1C1=5 \\u2228 R1C2=5)', 'viết (R1C1=5 \\u2227 R1C2=5)']
].forEach(function (m) {
  add(m[0], m[1], (m[0] === 'generator' ? 'Generator ' : 'Player ') + m[1].slice(-8, -3) + ' description: the true group example with a conjunction',
    m[2], m[3], { suites: 'i18n' });
});

// the conditional group clause of the two descriptions, the endpoint sentence and the group-correct subtype explanations
[['generator', 'generator/js/ui/locale.en.js', 'en'], ['player', 'player/js/ui/locale.en.js', 'en'],
  ['generator', 'generator/js/ui/locale.vi.js', 'vi'], ['player', 'player/js/ui/locale.vi.js', 'vi']].forEach(function (f) {
  const who = (f[0] === 'generator' ? 'Generator ' : 'Player ') + f[2];
  const en = f[2] === 'en';
  add(f[0], f[1], who + ' forcingChain.desc: the group clause stated as capability',
    en ? 'If a proof step represents a group, it lists' : 'Nếu một bước chứng minh biểu diễn một nhóm, bước đó liệt kê',
    en ? 'A step can also be a group, it lists' : 'Một bước cũng có thể là một nhóm, bước đó liệt kê', { suites: 'i18n' });
  add(f[0], f[1], who + ' forcingChainLong.desc: the group clause stated as capability',
    en ? 'If a proof step represents a group, its truth' : 'Nếu một bước chứng minh biểu diễn một nhóm, ý nghĩa',
    en ? 'A step can also be a group, its truth' : 'Một bước cũng có thể là một nhóm, ý nghĩa', { suites: 'i18n' });
  add(f[0], f[1], who + ' forcingChain.step.endpoints: candidates that see the ends',
    en ? 'Candidates that conflict with every ' : 'Các ứng viên xung đột với từng ứng viên ',
    en ? 'Candidates that see both ends, every ' : 'Các ứng viên nhìn thấy cả hai đầu, từng ứng viên ', { suites: 'i18n' });
  add(f[0], f[1], who + ' forcingChain.step.contradiction: some candidate with both truth values',
    en ? 'candidate were true, a statement about a candidate or group would be both true and false, which is ' :
      'đúng thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không thể xảy ra. ',
    en ? 'candidate were true, some candidate would be both true and false, which is ' :
      'đúng thì sẽ có một ứng viên vừa đúng vừa sai, điều không thể xảy ra. ', { suites: 'i18n' });
  add(f[0], f[1], who + ' forcingChainLong.step.forced: some candidate with both truth values',
    en ? 'first candidate were false, a statement about a candidate or group' :
      'Nếu ứng viên đầu tiên sai thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không ',
    en ? 'first candidate were false, some candidate' :
      'Nếu ứng viên đầu tiên sai thì sẽ có một ứng viên vừa đúng vừa sai, điều không ', { suites: 'i18n' });
});

module.exports = out;
