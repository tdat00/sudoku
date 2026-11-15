'use strict';
// MS07f: proves that the four relocated cases keep every helper, request, seed, assertion and timeout of the
// accepted source (HEAD), and that the quick files lost nothing else. Reads HEAD through `git show` (a read) and
// the working files; writes nothing. Run from the repository root: node docs/difficulty-v3/evidence/MS07f/relocation-check.cjs
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const lf = (s) => s.replace(/\r\n/g, '\n');
const head = (file) => lf(execFileSync('git', ['show', 'HEAD:' + file], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }));
const work = (file) => {
  const raw = fs.readFileSync(path.join(REPO, file), 'utf8');
  if (/(?<!\r)\n/.test(raw)) throw new Error(file + ': a line ending that is not CRLF');
  return lf(raw);
};

const F = {
  pipeline: 'generator/tests/suites/pipeline.test.js',
  player: 'generator/tests/suites/player.test.js',
  perf: 'generator/tests/manual/perf.test.js',
  variants: 'generator/tests/manual/variants.test.js'
};
const H = { pipeline: head(F.pipeline), player: head(F.player) };
const W = { pipeline: work(F.pipeline), player: work(F.player), perf: work(F.perf), variants: work(F.variants) };

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  ' + detail : ''));
}

/** The text from the line holding `start` (whole line) through the line holding `end`, inclusive; `from` is where to look. */
function block(text, start, end, from) {
  const s = text.indexOf(start, from || 0);
  if (s < 0) throw new Error('start not found: ' + start);
  const lineStart = text.lastIndexOf('\n', s) + 1;
  const e = text.indexOf(end, s + start.length);
  if (e < 0) throw new Error('end not found: ' + end);
  const lineEnd = text.indexOf('\n', e);
  return text.slice(lineStart, lineEnd + 1);
}
const trimLines = (t) => t.split('\n').map((l) => l.trim()).join('\n');

// ---- A. the three generation-cost ratios: pipeline (HEAD) -> perf (working tree)
console.log('A. ratios: tests/suites/pipeline.test.js (HEAD) -> tests/manual/perf.test.js');
const helpersStart = '    /** The workload of one measurement';
const itOff = "    it(\"generating puzzles: verbosity 'off' costs less than 2%\"";
const fullEnd = "      expect(costRatio(generateWork, 'full', 1.35, 4)).toBeLessThan(1.35);\n    }, 120000);\n";
const headHelpers = H.pipeline.slice(H.pipeline.indexOf(helpersStart), H.pipeline.indexOf(itOff));
const headIts = H.pipeline.slice(H.pipeline.indexOf(itOff), H.pipeline.indexOf(fullEnd) + fullEnd.length);
const newDescribeStart = W.perf.indexOf("  describe('instrumented generators: what the events cost', function () {");
const newDescribe = W.perf.slice(newDescribeStart);
check('helpers emitFor, bestTimes, costRatio, generateWork identical (exact text)', newDescribe.includes(headHelpers),
  headHelpers.split('\n').length - 1 + ' lines');
check('the three tests identical (exact text: titles, assertions, limits, attempts, timeouts)', newDescribe.includes(headIts),
  headIts.split('\n').length - 1 + ' lines');
const keyLines = headIts.split('\n').filter((l) => /expect\(|\}, \d+\);|it\(/.test(l));
keyLines.forEach((l) => check('  line in both: ' + l.trim(), newDescribe.includes(l + '\n') || newDescribe.includes(l)));
const nowHead = block(H.pipeline, '  function now() {', '  }\n');
const nowNew = block(newDescribe, '    function now() {', '    }\n');
check('now() identical (indentation apart)', trimLines(nowHead) === trimLines(nowNew));
check('model9 construction identical (indentation apart)',
  H.pipeline.includes("  var model9 = SG.variants.get('classic9').build({}, null);\n") &&
  newDescribe.includes("    var model9 = SG.variants.get('classic9').build({}, null);\n"));
check('E alias identical', H.pipeline.includes('  var E = SG.events;\n') && newDescribe.includes('    var E = SG.events;\n'));
check('no skip, catch or relaxed wrapper in the new describe',
  !/SG\.test\.skip|try\s*\{|catch\s*\(|\.skip\(/.test(newDescribe));
// The new quick pipeline file is HEAD minus generateWork and the three tests, plus a comment and a header line.
const removed = headHelpers.slice(headHelpers.indexOf('    function generateWork')) + headIts;
check('removed block = generateWork + the three tests', removed.startsWith('    function generateWork(emit) {'));
const comment = "    // The three generation-cost ratios ('off', 'summary' and 'full', the generating puzzles tests) are in\n" +
  '    // tests/manual/perf.test.js since MS07f (S-OD8).\n\n';
const headerOld = '// replaying the patches, the cost of the instrumentation, determinism, hooks, retries and cancellation.\n';
const headerNew = '// replaying the patches, the cost of the instrumentation (the short digging and full-grid ratios; the ratios\n' +
  '// of whole generations are in tests/manual/perf.test.js), determinism, hooks, retries and cancellation.\n';
let expectedPipeline = H.pipeline.replace(removed + '\n', comment).replace(headerOld, headerNew);
check('new pipeline.test.js = HEAD without the moved block (only a comment and the header differ)',
  expectedPipeline === W.pipeline);
check('helpers still used by the quick tests stay (emitFor, bestTimes, costRatio, now, model9)',
  ['function emitFor(', 'function bestTimes(', 'function costRatio(', 'function now()'].every((s) => W.pipeline.includes(s)) &&
  !W.pipeline.includes('generateWork'));

// ---- B. the replay case: player (HEAD) -> player (quick) + variants (manual)
console.log('B. replay: tests/suites/player.test.js (HEAD) -> player.test.js (quick) + tests/manual/variants.test.js');
const caseStart = "    it('real top-level results with clues shown again replay faithfully (mega16, classic9)'";
const headCase = block(H.player, caseStart, '    }, 60000);\n');
const threeInputs = "[['mega16', 'nightmare', 478576959], ['mega16', 'hell1', 2422420669], ['classic9', 'hell1', 3]]";
check('the original input array is the three requests, in order', headCase.includes(threeInputs));
const quickCase = headCase.replace('(mega16, classic9)', '(classic9)').replace(threeInputs, "[['classic9', 'hell1', 3]]");
const manualCase = headCase.replace('(mega16, classic9)', '(mega16)')
  .replace(threeInputs, "[['mega16', 'nightmare', 478576959], ['mega16', 'hell1', 2422420669]]");
check('quick case = original with the classic9 request only (exact text, timeout 60000)', W.player.includes(quickCase));
check('manual case = original with the two mega16 requests, in the original order (exact text, timeout 60000)',
  W.variants.includes(manualCase));
const commentB = '    // The two mega16 requests of this case moved unchanged to the case (mega16) of the manual\n' +
  '    // tests/manual/variants.test.js (MS07f, S-OD8).\n';
check('new player.test.js = HEAD with only the case replaced and a two-line comment added',
  H.player.replace(headCase, commentB + quickCase) === W.player);
const manualStart = W.variants.indexOf("  describe('player: the replay steps of a result', function () {");
const newBlock = W.variants.slice(manualStart);
[
  ['realResult', '  function realResult(', '  }\n', '    function realResult(', '    }\n'],
  ['analysisOf', '  function analysisOf(', '  }\n', '    function analysisOf(', '    }\n'],
  ['viewsOf', '  function viewsOf(', '  }\n', '    function viewsOf(', '    }\n'],
  ['stepsOf', '  function stepsOf(', '  }\n', '    function stepsOf(', '    }\n'],
  ['clues', '  function clues(', '  }\n', '    function clues(', '    }\n'],
  ['sameValues', '  function sameValues(', '  }\n', '    function sameValues(', '    }\n']
].forEach(([name, s1, e1, s2, e2]) => {
  check('helper ' + name + ' identical (indentation apart)', trimLines(block(H.player, s1, e1)) === trimLines(block(newBlock, s2, e2)));
});
const efStart = '    function expectFaithful(steps) {';
check('helper expectFaithful identical (exact text)', block(H.player, efStart, '    }\n') === block(newBlock, efStart, '    }\n'));
check('aliases P, R and the caches identical', ['var P = SG.player;', 'var R = SG.replay;', 'var resultCache = {};',
  'var analysisCache = [];'].every((l) => H.player.includes('  ' + l + '\n') && newBlock.includes('    ' + l + '\n')));
check('the manual case is the only test of its describe and is not skipped', (newBlock.match(/\n    it\(/g) || []).length === 1 &&
  !/skip/.test(newBlock));

// ---- C. the rest of the two manual files is untouched except the header/comment lines
console.log('C. the other lines of the manual files');
const headPerf = head(F.perf);
const headVariants = head(F.variants);
const perfHeaderLine = '// Performance (warn only), regression hashes of generated puzzles (design.md 9.1 and 9.2) and the cost ratios\n' +
  '// of the events.\n';
const perfComment = W.perf.match(/\/\/  - "instrumented generators: what the events cost"[^]*?stay in the quick suite\.\n/);
let perfBack = W.perf.replace(newDescribe, '})();\n').replace('\n\n})();\n', '\n})();\n')
  .replace(perfHeaderLine, '// Performance (warn only) and regression hashes of generated puzzles (design.md 9.1 and 9.2).\n');
if (perfComment) perfBack = perfBack.replace(perfComment[0], '');
check('perf.test.js = HEAD plus the header comment and the new describe at the end (nothing else differs)',
  perfComment !== null && perfBack === headPerf);
const variantsComment = W.variants.indexOf("  // The two real mega16 requests of the replay case");
const variantsBack = W.variants.slice(0, variantsComment).replace(/\/\/\n\/\/ Apart from[^]*?\(S-OD8\)\.\n/, '') + '})();\n';
check('variants.test.js = HEAD plus the header comment and the new describe at the end (nothing else differs)',
  variantsBack.replace('\n\n})();\n', '\n})();\n') === headVariants);

console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
