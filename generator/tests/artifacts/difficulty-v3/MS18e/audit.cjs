'use strict';
// MS18e E0 audit helper (file-only, read-only). Modes:
//   scan --out <json> [--phase before|final]   static scan of the 8 manual suites for generation requests
//   hashes --out <txt> [--dir <folder> [--exclude <regex>]] [<file>...]   raw sha256 lines "<hash>  <path>"
//   compat --old <commit> --inventory-old <json> --inventory-new <json> --out <json>
//                                              the four reuse checks of the variants suite (read-only git)
//   plan [--out-dir <dir>]                     scope map, admission plan and reuse map (reads only)
//   format <file>...                           BOM, CRLF, final newline and trailing whitespace of text files
//   coverage|cost|bindings|workflow|items      E3: quick coverage by (suite, ordinal), the CI projection rule and job arithmetic, the
//                                              source bindings, the static workflow audit and the extended item register
// Every top-level run goes through run-locked-e.ps1 (Invoke-Dv3Node semantics). Nothing here generates a puzzle.

const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const MANUAL = path.join(ROOT, 'generator', 'tests', 'manual');
const SUITES = ['difficulty', 'extra-regions', 'greater-than', 'jigsaw', 'killer', 'perf', 'variants', 'wordoku'];
const ENTRY = /\b(?:SG\.)?pipeline\.run\(|\b(?:SG\.)?digger\.(?:generate|digLevel)\(|\b(?:SG\.)?difficulty\.spec\(|\bD\.spec\(/;

// Offered levels of the 79 published cells (docs/difficulty-v3/evidence/MS18d/phase-d/gp-cells.csv); the other
// levels of a registered variant are hidden and refused unless the request goes through withRequestedLevel.
const OFFERED = {
  classic4: ['veryEasy'], classic6: ['veryEasy', 'hard'],
  classic9: ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare'],
  mega12: ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell2'],
  mega16: ['veryEasy', 'easy', 'normal', 'hard', 'master', 'hell2'],
  diagonalX: ['veryEasy', 'normal', 'hard', 'master', 'nightmare', 'hell2'],
  hyper: ['veryEasy', 'normal', 'hard', 'master', 'nightmare', 'hell2'],
  jigsaw9: ['veryEasy', 'easy', 'normal', 'hard', 'master', 'hell2'],
  killer: ['veryEasy', 'easy', 'normal'],
  greaterThan: ['veryEasy', 'easy', 'hard', 'master', 'hell2'],
  samurai: ['veryEasy', 'normal', 'hard', 'expert', 'master'],
  sohei: ['veryEasy', 'normal', 'hard', 'expert', 'master', 'hell2'],
  butterfly: ['veryEasy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell2'],
  flower: ['veryEasy', 'normal', 'hard', 'master', 'hell2'],
  wordoku: ['veryEasy', 'easy', 'hard', 'expert', 'master', 'nightmare']
};

// Hand classification of every entry-point call site, keyed by (suite, regex of the trimmed source line, optional
// regex of the describe/it/function chain). First match wins. The key is textual, never a line number, so the
// final scan after the two E1 guards classifies the same sites. Classes:
//   guarded            the request runs inside SG.fixtures.toolRecords.withRequestedLevel (tool-records.js:304-325)
//   offered-level      the level is one the variant offers (literal, or a loop over its difficultySupport)
//   unregistered-model a fixture model whose variantId is not registered, or a null model (difficulty.js:217-221)
//   temp-registered    a throw-away registered variant that offers every level it tests
//   manual-widened     the test widens difficultySupport itself and restores it in finally
//   refusal-expected   the test expects difficulty.unsupportedLevel / unknownLevel
//   hidden-unguarded   a hidden level of a registered variant, no guard (a finding)
function rule(file, test, cls, variant, level, why, extra) {
  return Object.assign({ file: file, test: test, cls: cls, variant: variant, level: level, why: why }, extra || {});
}
const D_ = 'difficulty';
const RULES = [
  rule(D_, /allowedTechniques: D\.spec\(level, model\)/, 'offered-level', 'classic9', 'OFFERED loop',
    'solvesWithin has one caller (the 1326 hit-rate check) inside the OFFERED.forEach of the classic9 batches'),
  rule(D_, /D\.spec\('impossible'/, 'refusal-expected', null, 'impossible', 'unknownLevel is thrown by levelIndex'),
  rule(D_, /expect\(D\.spec\(level, model\)\.minClues\)\.toBe\(D\.spec\(level, board9\)/, 'temp-registered', 'floorProbe',
    'every level', 'withFloor registers floorProbe with LEVELS.slice()'),
  rule(D_, /D\.spec\(level, (board9|board6|board)\)(?!\.minClues\)\.toBe\(expected)/, 'unregistered-model', 'boxGrid/test-samurai',
    'every level', 'boxGrid9/boxGrid6/boxGrid4/test-samurai are not registered variants'),
  rule(D_, /D\.spec\('(veryEasy|hell2|master)', board9\)/, 'unregistered-model', 'boxGrid9', 'literal',
    'boxGrid9 is not a registered variant'),
  rule(D_, /expect\(D\.spec\(level, model\)\.level\)/, 'offered-level', 'classic4/6/9', 'offered only',
    'reached only when def.difficultySupport contains the level (the if above it)'),
  rule(D_, /expectCode\(function \(\) \{ D\.spec\(level, model\); \}/, 'refusal-expected', 'classic4/6/9', 'hidden',
    'expects difficulty.unsupportedLevel'),
  rule(D_, /D\.spec\('nightmare', model4\)/, 'refusal-expected', 'classic4', 'nightmare', 'expects unsupportedLevel'),
  rule(D_, /(var floors = LEVELS\.map\(function \(level\) \{ return D\.spec\(level, model\)|var spec = D\.spec\(level, model\);|var floor = D\.spec\(level, model\)\.minClues|D\.spec\('(hard|expert|normal|veryEasy)', model\))/,
    'temp-registered', 'floorProbe', 'every level', 'withFloor registers floorProbe with LEVELS.slice()'),
  rule(D_, /D\.spec\('easy', null\)/, 'unregistered-model', null, 'easy', 'a null model supports every level'),
  rule(D_, /D\.spec\('veryEasy', SG\.fixtures\.models\.samurai\(\)\)/, 'unregistered-model', 'test-samurai', 'veryEasy',
    'test-samurai is not registered'),
  rule(D_, /D\.spec\(level, killer\)/, 'offered-level', 'killer', 'offered loop',
    'inside def.difficultySupport.forEach of killer'),
  rule(D_, /D\.spec\(level, board\)\.minClues\)\.toBe\(expected/, 'offered-level', 'greaterThan/diagonalX/hyper/jigsaw9',
    'offered loop', 'inside SG.variants.get(id).difficultySupport.forEach'),
  rule(D_, /^i === 0 \? \[\] : D\.spec\(LEVELS\[i - 1\], model9\)/, 'hidden-unguarded', 'classic9', 'hell1',
    'the four labelled hell2 puzzles give i = 8, so LEVELS[7] = hell1, which classic9 hides: spec throws ' +
    'difficulty.unsupportedLevel (a spec lookup, not a generation request)', { kind: 'spec', only: 'before' }),
  rule(D_, /^return D\.spec\(LEVELS\[i - 1\], model9\);$/, 'guarded', 'classic9', 'hell1',
    'inside SG.fixtures.toolRecords.withRequestedLevel (MS18e-COMPAT-CLASSIC-HELL1-FLOOR)',
    { only: 'final', near: /withRequestedLevel\('classic9', LEVELS\[i - 1\], function \(\) \{/ }),
  rule(D_, /puzzles\.push\(SG\.digger\.generate\(model9, level, rng, \{\}\)\)/, 'offered-level', 'classic9', 'OFFERED loop',
    'batch(level) is called from the OFFERED.forEach batches and the confusion matrix (OFFERED too)'),
  rule(D_, /var spec = D\.spec\(level, model9\);/, 'offered-level', 'classic9', 'OFFERED loop',
    'the OFFERED.forEach of the batches (or the difficultySupport.forEach of the minClues test)'),
  rule(D_, /generate\(model9, level, SG\.rng\.create\(81/, 'offered-level', 'classic9', 'normal, hard, nightmare',
    'the I4 test loops over three offered levels'),
  rule(D_, /generate\(model9, '(hard|normal)'/, 'offered-level', 'classic9', 'hard / normal', 'offered'),
  rule(D_, /generate\(model9, level, SG\.rng\.create\(8400/, 'offered-level', 'classic9', 'difficultySupport loop',
    'inside classic9 difficultySupport.forEach'),
  rule(D_, /^var p = SG\.digger\.generate\(model9, level, SG\.rng\.create\(8550/, 'hidden-unguarded', 'classic9', 'hell1',
    'the loop is [nightmare, hell1]; classic9 hides hell1 (classic.js:53-58), so digger.generate throws ' +
    'difficulty.unsupportedLevel at spec()', { kind: 'generate', only: 'before' }),
  rule(D_, /^return SG\.digger\.generate\(model9, level, SG\.rng\.create\(8550 \+ i\), \{\}\);$/, 'guarded', 'classic9', 'hell1',
    'inside SG.fixtures.toolRecords.withRequestedLevel (MS18e-COMPAT-CLASSIC-HELL1-SYMMETRY)',
    { only: 'final', near: /withRequestedLevel\('classic9', level, function \(\) \{/ }),
  rule(D_, /digLevel\(model9, solution, '(easy|hard|veryEasy)'/, 'offered-level', 'classic9', 'easy / hard / veryEasy', 'offered'),
  rule(D_, /generate\(model, level, SG\.rng\.create\(8700/, 'offered-level', 'classic4/classic6', 'difficultySupport loop',
    'inside SG.variants.get(model.variantId).difficultySupport.forEach'),
  rule(D_, /generate\(model4, 'nightmare'/, 'refusal-expected', 'classic4', 'nightmare', 'expects unsupportedLevel'),
  rule(D_, /generate\(model9, 'hell'/, 'refusal-expected', 'classic9', 'hell', 'expects unknownLevel'),
  rule(D_, /generate\(model9, '(easy|hard)'/, 'offered-level', 'classic9', 'easy / hard', 'offered (option checks, budget)'),
  rule(D_, /p = SG\.digger\.generate\(model, level, SG\.rng\.create\(seed\)/, 'manual-widened', 'any', 'any',
    'capped() sets def.difficultySupport = LEVELS.slice() and restores it in finally (difficulty.test.js:1519-1550)'),
  rule(D_, /generate\((board4|board6)/, 'unregistered-model', 'boxGrid4/boxGrid6', 'any', 'fixture boards are not registered'),
  rule(D_, /generate\(model9, 'veryEasy'/, 'offered-level', 'classic9', 'veryEasy', 'offered'),
  rule(D_, /^r = SG\.pipeline\.run\(config\);$/, 'hidden-unguarded', 'killer', 'master',
    'killer offers veryEasy, easy and normal only: the B1 hit of the ambiguous-candidate test',
    { kind: 'pipeline', only: 'before' }),
  rule(D_, /^return SG\.pipeline\.run\(config\);$/, 'guarded', 'killer', 'master',
    'inside SG.fixtures.toolRecords.withRequestedLevel (the B1 fix)',
    { only: 'final', near: /withRequestedLevel\('killer', 'master', function \(\) \{/ }),

  rule('extra-regions', /asLevel\(variantId, level, function \(\) \{ return SG\.difficulty\.spec/, 'guarded', 'diagonalX/hyper',
    'any', 'specOf() through asLevel'),
  rule('extra-regions', /asLevel\(variantId, level, function \(\) \{ return SG\.pipeline\.run\(cfg/, 'guarded',
    'diagonalX/hyper/classic9', 'any', 'generate() through asLevel'),
  rule('extra-regions', /difficulty: level, seed: 1, trace: 'off' \}, null\)/, 'refusal-expected', 'diagonalX/hyper',
    'hidden levels', 'expects difficulty.unsupportedLevel'),
  rule('extra-regions', /var spec = SG\.difficulty\.spec\(level, p\.model\)/, 'offered-level', 'diagonalX/hyper',
    'offeredOf(id) loop', 'inside the offeredOf(id).forEach registrations'),
  rule('extra-regions', /^return SG\.pipeline\.run\(\{$/, 'guarded', 'diagonalX/hyper', 'any', 'inside asLevel in run()'),
  rule('extra-regions', /var silent = SG\.pipeline\.run\(\{/, 'offered-level', 'diagonalX/hyper', 'hard', 'hard is offered'),

  rule('greater-than', /asLevel\(level, function \(\) \{ return SG\.difficulty\.spec/, 'guarded', 'greaterThan', 'any',
    'specOf() through asLevel'),
  rule('greater-than', /asLevel\(level, function \(\) \{ return SG\.pipeline\.run\(cfg/, 'guarded', 'greaterThan', 'any',
    'generate() through asLevel'),
  rule('greater-than', /SG\.difficulty\.spec\('master', SG\.variants\.get\('classic9'\)/, 'offered-level', 'classic9', 'master',
    'offered'),
  rule('greater-than', /SG\.difficulty\.spec\('(veryEasy|easy)', board\(\)\)/, 'offered-level', 'greaterThan',
    'veryEasy / easy', 'offered'),
  rule('greater-than', /difficulty: level, seed: 1 \}, null\)/, 'refusal-expected', 'greaterThan', 'hidden levels',
    'expects difficulty.unsupportedLevel'),
  rule('greater-than', /difficulty: 'hell'/, 'refusal-expected', 'greaterThan', 'hell', 'expects unknownLevel'),
  rule('greater-than', /var spec = SG\.difficulty\.spec\(level, p\.model\)/, 'offered-level', 'greaterThan', 'OFFERED loop',
    'inside OFFERED.forEach'),
  rule('greater-than', /SG\.difficulty\.spec\('hard', g\.model\)/, 'offered-level', 'greaterThan', 'hard', 'offered'),
  rule('greater-than', /return SG\.pipeline\.run\(\{ variantId: 'greaterThan', difficulty: level, seed: seed, trace: trace/,
    'guarded', 'greaterThan', 'any', 'trace() through asLevel'),
  rule('greater-than', /difficulty: 'hard', seed: 77/, 'offered-level', 'greaterThan', 'hard', 'offered'),
  rule('greater-than', /var r = SG\.pipeline\.run\(cfg, null\)/, 'offered-level', 'greaterThan', 'easy',
    'cfg.difficulty is easy, offered'),

  rule('jigsaw', /difficulty: level, seed: 1, trace: 'off' \}, null\)/, 'refusal-expected', 'jigsaw9', 'hidden levels',
    'expects difficulty.unsupportedLevel'),
  rule('jigsaw', /SG\.pipeline\.run\(Object\.assign\(\{ variantOptions: \{ compactness: [01] \} \}, cfg\)/, 'offered-level',
    'jigsaw9', 'veryEasy', 'cfg.difficulty is veryEasy'),
  rule('jigsaw', /difficulty: 'easy', seed: 1, trace: 'off',/, 'offered-level', 'jigsaw9', 'easy', 'offered'),
  rule('jigsaw', /return SG\.pipeline\.run\(config, null\)/, 'guarded', 'jigsaw9', 'any', 'generatePuzzle() through withRequestedLevel'),
  rule('jigsaw', /var spec = SG\.difficulty\.spec\(level, p\.model\)/, 'offered-level', 'jigsaw9', 'OFFERED loop',
    'inside OFFERED.forEach'),
  rule('jigsaw', /var withSink = SG\.pipeline\.run\(cfg/, 'offered-level', 'jigsaw9', 'hard', 'hard is offered'),

  rule('killer', /return SG\.pipeline\.run\(\{ variantId: 'killer', difficulty: level, seed: seed, trace: trace \|\| 'off' \}/,
    'guarded', 'killer', 'any', 'generate() through asLevel'),
  rule('killer', /SG\.difficulty\.spec\('master', H\.model\('classic9'\)\)/, 'offered-level', 'classic9', 'master', 'offered'),
  rule('killer', /SG\.difficulty\.spec\('(veryEasy|easy|normal)', board\)/, 'offered-level', 'killer', 'veryEasy / easy / normal',
    'offered'),
  rule('killer', /asLevel\('hard', function \(\) \{ return SG\.difficulty\.spec\('hard', board\)/, 'guarded', 'killer', 'hard',
    'through asLevel'),
  rule('killer', /asLevel\(p\.level, function \(\) \{ return SG\.difficulty\.spec/, 'guarded', 'killer', 'any', 'through asLevel'),
  rule('killer', /try \{ SG\.pipeline\.run\(\{ variantId: 'killer', difficulty: level/, 'refusal-expected', 'killer',
    'hidden levels', 'expects difficulty.unsupportedLevel'),
  rule('killer', /var spec = SG\.difficulty\.spec\(p\.level, p\.result\.model\)/, 'offered-level', 'killer', 'OFFERED loop',
    'inside OFFERED.forEach'),
  rule('killer', /difficulty: 'normal', seed: seed/, 'offered-level', 'killer', 'normal', 'offered'),
  rule('killer', /asLevel\('master', function \(\) \{ return SG\.pipeline\.run/, 'guarded', 'killer', 'master', 'through asLevel'),
  rule('killer', /^return SG\.pipeline\.run\(\{ variantId: 'killer', difficulty: 'hard', seed: 3/, 'guarded', 'killer', 'hard',
    'inside asLevel(\'hard\') in the same test'),

  rule('perf', /return SG\.pipeline\.run\(\{ variantId: variant, difficulty: level, seed: seed, trace: 'off' \}/,
    'hidden-unguarded', 'greaterThan', 'normal',
    'the result() helper: callers are classic4/veryEasy, killer/easy (offered) and greaterThan/normal (hidden, line of ' +
    'result(\'greaterThan\', \'normal\', 1))', { kind: 'pipeline', alt: { fileRe: /withRequestedLevel\('greaterThan', 'normal'/,
      cls: 'guarded-at-caller', why: 'the one hidden caller, greaterThan/normal, is wrapped in withRequestedLevel (B1 fix)' } }),
  rule('perf', /SG\.digger\.generate\(model9, '(easy|normal)'/, 'offered-level', 'classic9', 'easy / normal', 'offered'),

  rule('variants', /var result = SG\.pipeline\.run\(\{ variantId: def\.id, difficulty: level/, 'offered-level', 'every variant',
    'def.difficultySupport', 'generate() is called with levels of def.difficultySupport (lazyCorpus, checkDeterminism)'),
  rule('variants', /var spec = SG\.difficulty\.spec\(level, model\)/, 'offered-level', 'every variant', 'supported only',
    'after "if (!supported) return"'),
  rule('variants', /difficulty: level, seed: 1, trace: 'off' \}, null\)/, 'refusal-expected', 'every variant', 'unsupported levels',
    'expects difficulty.unsupportedLevel'),
  rule('variants', /var spec = SG\.difficulty\.spec\(level, (result\.model|m)\)/, 'offered-level', 'every variant',
    'def.difficultySupport', 'corpus levels of the definition'),
  rule('variants', /SG\.difficulty\.spec\('(veryEasy|easy)', model\)/, 'temp-registered', 'sweepFloor', 'veryEasy / easy',
    'fakeDef sweepFloor offers veryEasy and easy'),
  rule('variants', /return SG\.pipeline\.run\(\{ variantId: variantId, difficulty: difficulty/, 'guarded', 'any', 'any',
    'realResult() through withRequestedLevel'),

  rule('wordoku', /asLevel\(level, function \(\) \{ return SG\.pipeline\.run\(cfg/, 'guarded', 'wordoku', 'any',
    'generate() through asLevel'),
  rule('wordoku', /difficulty: 'easy', seed: 1/, 'offered-level', 'wordoku', 'easy', 'offered'),
  rule('wordoku', /difficulty: level, seed: 1, trace: 'off' \}, null\)/, 'refusal-expected', 'wordoku', 'hidden levels',
    'expects difficulty.unsupportedLevel'),
  rule('wordoku', /var spec = SG\.difficulty\.spec\(level, p\.model\)/, 'offered-level', 'wordoku', 'OFFERED loop',
    'inside OFFERED.forEach'),
  rule('wordoku', /^return SG\.pipeline\.run\(\{ variantId: 'wordoku', difficulty: 'normal'/, 'guarded', 'wordoku', 'normal',
    'inside asLevel(\'normal\')'),
  rule('wordoku', /^return SG\.pipeline\.run\(Object\.assign\(\{ variantId: 'wordoku', difficulty: level/, 'guarded', 'wordoku', 'any',
    'trace() helper through asLevel')
];

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

/** A JSON file the way the repository stores text: CRLF line ends only (core.safecrlf refuses a mixed file). */
const jsonText = (value) => JSON.stringify(value, null, 2).replace(/\n/g, '\r\n') + '\r\n';

/** `crlf <file>...`: rewrites files whose line ends are LF or mixed to CRLF; nothing else changes. */
function crlf(argv) {
  argv.forEach((rel) => {
    const abs = path.resolve(ROOT, rel);
    const before = fs.readFileSync(abs);
    const after = Buffer.from(before.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8');
    if (after.compare(before) !== 0) fs.writeFileSync(abs, after);
    console.log(rel + ': ' + sha256(before).slice(0, 16) + ' -> ' + sha256(after).slice(0, 16) +
      (after.compare(before) === 0 ? ' (already CRLF)' : ''));
  });
  return 0;
}

function arg(name, argv) {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
}

function indentOf(line) { return line.length - line.replace(/^\s+/, '').length; }

function chainOf(lines, index) {
  const chain = [];
  let limit = indentOf(lines[index]);
  for (let i = index - 1; i >= 0 && limit > 0; i--) {
    const text = lines[i];
    if (text.trim() === '' || indentOf(text) >= limit) continue;
    const m = /^\s*(it|describe)\(\s*(['"`])([^'"`]{0,80})/.exec(text) ||
      /^\s*(function)\s+(\w+)\(()/.exec(text);
    if (m) {
      chain.unshift(m[1] === 'function' ? 'function ' + m[2] : m[1] + ': ' + m[3]);
      limit = indentOf(text);
    }
  }
  return chain;
}

function enumerate(suite) {
  const file = path.join(MANUAL, suite + '.test.js');
  const raw = fs.readFileSync(file);
  const lines = raw.toString('utf8').split(/\r?\n/);
  const seen = {};
  const sites = [];
  lines.forEach(function (text, index) {
    const code = text.replace(/^\s*(\/\/|\*|\/\*).*$/, '');
    if (!ENTRY.test(code)) return;
    const snippet = code.trim();
    seen[snippet] = (seen[snippet] || 0) + 1;
    sites.push({ file: 'generator/tests/manual/' + suite + '.test.js', line: index + 1, snippet: snippet,
      nth: seen[snippet], chain: chainOf(lines, index), near: lines.slice(Math.max(0, index - 3), index).join(' ') });
  });
  return { suite: suite, bytes: raw.length, sha256: sha256(raw), lines: lines.length, sites: sites,
    text: raw.toString('utf8') };
}

function scan(argv) {
  const out = arg('--out', argv);
  const phase = arg('--phase', argv) || 'before';
  const rules = RULES.filter(function (r) { return !r.only || r.only === phase; });
  const files = SUITES.map(enumerate);
  const used = rules.map(function () { return 0; });
  const unclassified = [];
  const counts = {};
  const hits = [];
  const all = [];
  files.forEach(function (f) {
    f.sites.forEach(function (site) {
      const k = rules.findIndex(function (r) {
        return r.file === f.suite && r.test.test(site.snippet) && (!r.chain || r.chain.test(site.chain.join(' > '))) &&
          (!r.near || r.near.test(site.near));
      });
      if (k === -1) { unclassified.push(site); return; }
      used[k]++;
      const r = rules[k];
      site.class = r.cls;
      if (r.variant) site.variant = r.variant;
      if (r.level) site.level = r.level;
      site.why = r.why;
      if (r.alt && r.alt.fileRe.test(f.text)) { site.class = r.alt.cls; site.why = r.alt.why; }
      if (site.class === 'hidden-unguarded') {
        site.kind = r.kind;
        hits.push(site);
      }
      counts[site.class] = (counts[site.class] || 0) + 1;
      all.push(site);
    });
  });
  const stale = rules.filter(function (r, i) { return used[i] === 0; }).map(function (r) {
    return { file: r.file, test: String(r.test), why: r.why };
  });
  const report = {
    schema: 'ms18e-manual-hidden-requests-1', phase: phase, offeredLevels: OFFERED,
    entryPoints: String(ENTRY), offeredCells: 79,
    files: files.map(function (f) { return { suite: f.suite, bytes: f.bytes, lines: f.lines, sha256: f.sha256,
      sites: f.sites.length }; }),
    totalSites: all.length + unclassified.length, classCounts: counts,
    unguardedHiddenHits: hits.map(function (s) { return { file: s.file, line: s.line, snippet: s.snippet,
      variant: s.variant, level: s.level, chain: s.chain, why: s.why }; }),
    unclassified: unclassified, staleRules: stale, sites: all
  };
  if (out) fs.writeFileSync(path.resolve(ROOT, out), jsonText(report), { flag: 'wx' });
  console.log('scan ' + phase + ': ' + report.totalSites + ' sites in ' + files.length + ' suites; classes ' +
    JSON.stringify(counts) + '; unguarded hidden hits ' + hits.length + '; unclassified ' + unclassified.length +
    '; stale rules ' + stale.length);
  hits.forEach(function (s) {
    console.log('  HIT ' + s.file + ':' + s.line + ' ' + s.variant + '/' + s.level + ' | ' + s.snippet);
  });
  unclassified.slice(0, 200).forEach(function (s) { console.log('  ?? ' + s.file + ':' + s.line + ' ' + s.snippet); });
  stale.forEach(function (s) { console.log('  STALE ' + s.file + ' ' + s.test); });
  return unclassified.length === 0 && stale.length === 0 ? 0 : 1;
}

/**
 * `hashes --out <txt> [--dir <folder> [--exclude <regex>]] [<file>...]`: one line `<sha256>  <path>` (raw bytes, paths
 * relative to the repository with forward slashes, sorted) for the named files and every file of the folder.
 */
function hashes(argv) {
  const out = arg('--out', argv);
  const dir = arg('--dir', argv);
  const exclude = arg('--exclude', argv);
  const skip = new Set(['--out', '--dir', '--exclude']);
  const files = [];
  argv.forEach(function (a, i) { if (!skip.has(a) && !skip.has(argv[i - 1])) files.push(a); });
  const walk = function (rel) {
    fs.readdirSync(path.resolve(ROOT, rel), { withFileTypes: true }).forEach(function (e) {
      const child = rel + '/' + e.name;
      if (e.isDirectory()) walk(child);
      else if (!exclude || !new RegExp(exclude).test(child)) files.push(child);
    });
  };
  if (dir) walk(dir.replace(/\\/g, '/'));
  const rows = Array.from(new Set(files.map(function (f) { return f.replace(/\\/g, '/'); }))).sort().map(function (rel) {
    return { path: rel, sha256: sha256(fs.readFileSync(path.resolve(ROOT, rel))) };
  });
  const text = rows.map(function (r) { return r.sha256 + '  ' + r.path + '\r\n'; }).join('');
  if (out) fs.writeFileSync(path.resolve(ROOT, out), text, { flag: 'wx' });
  console.log('hashed ' + rows.length + ' files' + (out ? ' into ' + out : ''));
  return 0;
}

function git(args) {
  return childProcess.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r?\n$/, '');
}

function gitOrNull(args) {
  try { return git(args); } catch (err) { return null; }
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
}

const repoPath = (rel) => path.posix.normalize('generator/' + rel.replace(/\\/g, '/'));

/** The quoted entries of `const <name> = [ ... ];` in the text of node-runner.js. */
function runnerList(runner, name) {
  const m = new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(runner);
  return Array.from(m[1].matchAll(/'([^']+)'/g), (x) => x[1]);
}

function lineOf(text, needle) {
  const lines = text.split(/\r?\n/);
  const hit = [];
  lines.forEach((line, i) => { if (line.indexOf(needle) !== -1) hit.push(i + 1); });
  return hit;
}

function classifyChanged(rel) {
  if (/^(AGENTS|README|USERGUIDE|DEVELOPERGUIDE)(\.vn)?\.md$/.test(rel) || /^generator\/design\.md$/.test(rel) ||
    /^generator\/(index|tests)\.html$/.test(rel)) return 'document-or-page: hashed for the fingerprint, never executed';
  if (rel === 'generator/tests/fixtures/perf-helper.js') return 'perf-helper: criterion 2';
  if (/^generator\/tests\/manual\//.test(rel)) return 'manual suite: not loaded by --suite=variants';
  if (/^(core|generator)\/tests\/suites\//.test(rel)) return 'quick suite: not loaded by --suite=variants';
  if (/^generator\/tests\/[^/]+$/.test(rel)) return 'generator/tests tool file: not loaded (node-runner.js is criterion 1)';
  return 'LOADED PATH OR UNCLASSIFIED: must be byte-identical';
}

function compat(argv) {
  const out = arg('--out', argv);
  const old = arg('--old', argv);
  const invOldRel = arg('--inventory-old', argv);
  const invNewRel = arg('--inventory-new', argv);
  const runnerRel = 'generator/tests/node-runner.js';
  const runner = fs.readFileSync(path.join(ROOT, runnerRel), 'utf8');
  const sources = runnerList(runner, 'SOURCE_FILES').map(repoPath);
  const fixtureDirs = runnerList(runner, 'FIXTURES_DIRS').map(repoPath);
  const deviations = [];

  const identity = {
    oldCommit: old, oldCommitType: gitOrNull(['cat-file', '-t', old]), head: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain']).split(/\r?\n/).filter(Boolean),
    sgDeepUnsetInThisProcess: process.env.SG_DEEP === undefined, node: process.version,
    originalFingerprint: null, finalFingerprint: null
  };

  // Criterion 1: identical blobs and a complete path inventory.
  const fixtureFiles = {};
  fixtureDirs.forEach((dir) => {
    const oldNames = (gitOrNull(['ls-tree', '--name-only', old, dir + '/']) || '').split(/\r?\n/).filter(Boolean)
      .map((p) => p.slice(dir.length + 1)).filter((n) => n.endsWith('.js'));
    const newNames = fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js') &&
      fs.statSync(path.join(ROOT, dir, n)).isFile()).sort();
    fixtureFiles[dir] = {
      old: oldNames, final: newNames,
      missingFromFinal: oldNames.filter((n) => newNames.indexOf(n) === -1),
      addedInFinal: newNames.filter((n) => oldNames.indexOf(n) === -1)
    };
    if (fixtureFiles[dir].missingFromFinal.length || fixtureFiles[dir].addedInFinal.length) {
      deviations.push('fixture path inventory differs in ' + dir);
    }
  });
  const required = ['core/tests/harness.js', 'core/tests/node-evidence.js', runnerRel, 'generator/tests/manual/variants.test.js']
    .concat(sources);
  fixtureDirs.forEach((dir) => fixtureFiles[dir].final.forEach((n) => required.push(dir + '/' + n)));
  fixtureDirs.forEach((dir) => fixtureFiles[dir].old.forEach((n) => {
    if (required.indexOf(dir + '/' + n) === -1) required.push(dir + '/' + n);
  }));
  const rows = Array.from(new Set(required)).map((rel) => {
    const oldBlob = gitOrNull(['rev-parse', old + ':' + rel]);
    const headBlob = gitOrNull(['rev-parse', 'HEAD:' + rel]);
    const exists = fs.existsSync(path.join(ROOT, rel));
    const finalBlob = exists ? git(['hash-object', '--', rel]) : null;
    const isPerf = rel === 'generator/tests/fixtures/perf-helper.js';
    return { path: rel, oldBlob: oldBlob, headBlob: headBlob, finalBlob: finalBlob,
      identical: oldBlob !== null && oldBlob === finalBlob, expectedDifferent: isPerf };
  });
  rows.filter((r) => !r.identical && !r.expectedDifferent).forEach((r) => deviations.push('blob differs: ' + r.path));
  const localRequires = [];
  ['core/tests/harness.js', 'core/tests/node-evidence.js', runnerRel, 'generator/tests/manual/variants.test.js']
    .forEach((rel) => {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      Array.from(text.matchAll(/require\(\s*['"](\.[^'"]*)['"]\s*\)/g)).forEach((m) => {
        localRequires.push({ file: rel, request: m[1],
          resolved: path.posix.normalize(path.posix.dirname(rel) + '/' + m[1]) });
      });
    });
  localRequires.forEach((r) => {
    if (!rows.some((x) => x.path === r.resolved)) deviations.push('local require not compared: ' + r.resolved);
  });
  const criterion1 = { sourceFilesParsed: sources.length, fixtureDirs: fixtureFiles, localRequires: localRequires,
    blobs: rows, identicalCount: rows.filter((r) => r.identical).length,
    comparedCount: rows.length, proved: !rows.some((r) => !r.identical && !r.expectedDifferent) &&
      !Object.keys(fixtureFiles).some((d) => fixtureFiles[d].missingFromFinal.length || fixtureFiles[d].addedInFinal.length) };

  // Criterion 2: the perf-helper diff, comments and PERF_TARGETS rows only; the consumers of perfTools.
  const perfRel = 'generator/tests/fixtures/perf-helper.js';
  const diffText = git(['diff', '--no-color', '-U0', old, '--', perfRel]);
  const changedLines = diffText.split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
  const lineClass = (l) => {
    const body = l.slice(1);
    if (/^\s*(\/\/|\/\*|\*)/.test(body) || body.trim() === '') return 'comment-or-blank';
    if (/^\s*[A-Za-z0-9]+:\s*row\(/.test(body)) return 'PERF_TARGETS-row';
    return 'OTHER';
  };
  const classified = changedLines.map((l) => ({ sign: l[0], class: lineClass(l), text: l.slice(1).trim() }));
  const rowsOf = (text) => {
    const m = /var PERF_TARGETS = \{([\s\S]*?)\n  \};/.exec(text) || /var PERF_TARGETS = \{([\s\S]*?)\};/.exec(text);
    const table = {};
    Array.from(m[1].matchAll(/^\s*([A-Za-z0-9]+):\s*row\(([^)]*)\)/gm)).forEach((x) => {
      table[x[1]] = x[2].split(',').map((v) => v.trim());
    });
    return table;
  };
  const oldRows = rowsOf(git(['show', old + ':' + perfRel]));
  const newRows = rowsOf(fs.readFileSync(path.join(ROOT, perfRel), 'utf8'));
  const changedRows = Object.keys(newRows).filter((v) => JSON.stringify(newRows[v]) !== JSON.stringify(oldRows[v]));
  const changedValues = changedRows.reduce((n, v) => n + newRows[v].filter((x, i) => x !== (oldRows[v] || [])[i]).length, 0);
  const reads = [];
  const commentOnly = [];
  const scanFiles = required.filter((r) => r !== perfRel).concat(['core/tests/harness.js']);
  Array.from(new Set(scanFiles)).forEach((rel) => {
    fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (!/perfTools|PERF_TARGETS|perf-helper/.test(line)) return;
      const hit = { file: rel, line: i + 1, text: line.trim() };
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) commentOnly.push(hit);
      else reads.push(hit);
    });
  });
  const defining = [];
  fs.readFileSync(path.join(ROOT, perfRel), 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (/PERF_TARGETS|perfTools/.test(line)) defining.push({ line: i + 1, text: line.trim().slice(0, 120) });
  });
  const testSide = [];
  ['core/tests/suites', 'generator/tests/suites', 'generator/tests/manual', 'player/tests/suites', 'generator/tests'].forEach((dir) => {
    fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js') &&
      fs.statSync(path.join(ROOT, dir, n)).isFile()).forEach((n) => {
      const rel = dir + '/' + n;
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      if (/perfTools|PERF_TARGETS|perf-helper/.test(text)) {
        testSide.push({ file: rel, loadedBySuiteVariants: rel === 'generator/tests/manual/variants.test.js' ||
          rel === runnerRel });
      }
    });
  });
  const criterion2 = {
    diffLinesChanged: classified.length, byClass: classified.reduce((a, c) => { a[c.class] = (a[c.class] || 0) + 1; return a; }, {}),
    classifiedLines: classified, changedTargetRows: changedRows, changedTargetRowCount: changedRows.length,
    changedCellValueCount: changedValues, rowsExpected: 12, valuesExpected: 17,
    consumersInLoadedPathExceptDefiningFixture: reads, commentOnlyReferencesInLoadedPath: commentOnly,
    definingFixtureReferences: defining,
    testSideReferences: testSide,
    proved: !classified.some((c) => c.class === 'OTHER') && changedRows.length === 12 && changedValues === 17 &&
      reads.length === 0 && !testSide.some((t) => t.loadedBySuiteVariants)
  };
  if (!criterion2.proved) deviations.push('criterion 2 not proved');

  // Criteria 3 and 4: the loading path and the registration.
  const invOld = readJson(invOldRel);
  const invNew = readJson(invNewRel);
  identity.originalFingerprint = invOld.sourceHash;
  identity.finalFingerprint = invNew.sourceHash;
  const mapOf = (inv) => new Map(inv.files.map((f) => [f.path, f.hash]));
  const oldFiles = mapOf(invOld);
  const newFiles = mapOf(invNew);
  const changedInputs = [];
  new Set(Array.from(oldFiles.keys()).concat(Array.from(newFiles.keys()))).forEach((rel) => {
    if (oldFiles.get(rel) !== newFiles.get(rel)) {
      changedInputs.push({ path: rel, change: !oldFiles.has(rel) ? 'added' : !newFiles.has(rel) ? 'removed' : 'changed',
        classification: classifyChanged(rel) });
    }
  });
  changedInputs.sort((a, b) => (a.path < b.path ? -1 : 1));
  const loadedChanged = changedInputs.filter((c) => /^LOADED/.test(c.classification));
  if (loadedChanged.length > 0) deviations.push(loadedChanged.length + ' changed fingerprint inputs on the loaded path');
  const loops = {
    sourceFilesLoop: lineOf(runner, 'for (const rel of SOURCE_FILES)'),
    fixturesLoop: lineOf(runner, 'for (const dir of FIXTURES_DIRS)'),
    selectionBySuite: lineOf(runner, 'else if (opts.suites.length > 0) selected = available.filter') .concat(
      lineOf(runner, 'if (opts.suites.length > 0) selected = available.filter')),
    selectedSuiteLoop: lineOf(runner, 'for (const name of selected)'),
    selectedSuiteRunFile: lineOf(runner, "runFile(dirOf(name) + '/' + name + SUITE_SUFFIX)"),
    manualTreesOnlyForFingerprint: lineOf(runner, 'manualTrees'), listFiles: lineOf(runner, 'function listFiles')
  };
  const suitesInRows = Array.from(new Set(invNew.tests.map((t) => t.suite)));
  const criterion3 = {
    runnerLines: loops, selectionOfNewInventory: invNew.selection, suitesInRegisteredRows: suitesInRows,
    fingerprintInputsChangedSinceMs18c: changedInputs,
    manualFilesHashedOnly: Array.from(newFiles.keys()).filter((p) => /^generator\/tests\/manual\//.test(p)),
    proved: suitesInRows.length === 1 && suitesInRows[0] === 'variants' && invNew.selection.suites.length === 1 &&
      loops.selectedSuiteRunFile.length === 1 && loadedChanged.length === 0
  };
  if (!criterion3.proved) deviations.push('criterion 3 not proved');
  const keyOf = (t) => t.ordinal + '|' + t.fullName;
  const oldKeys = invOld.tests.map(keyOf);
  const newKeys = invNew.tests.map(keyOf);
  const oldSet = new Set(oldKeys);
  const newSet = new Set(newKeys);
  const ordinals = invNew.tests.map((t) => t.ordinal);
  const criterion4 = {
    oldTests: oldKeys.length, newTests: newKeys.length,
    omittedFromNew: oldKeys.filter((k) => !newSet.has(k)), addedInNew: newKeys.filter((k) => !oldSet.has(k)),
    duplicateKeysInNew: newKeys.filter((k, i) => newKeys.indexOf(k) !== i),
    duplicateOrdinalsInNew: ordinals.filter((o, i) => ordinals.indexOf(o) !== i),
    registrationErrorsNew: invNew.registrationErrors.length, registrationErrorsOld: invOld.registrationErrors.length,
    completeNew: invNew.complete, completeOld: invOld.complete,
    selectionOld: invOld.selection, selectionNew: invNew.selection,
    orderIdentical: JSON.stringify(oldKeys) === JSON.stringify(newKeys), sgDeepUnsetInThisProcess: identity.sgDeepUnsetInThisProcess
  };
  criterion4.proved = oldKeys.length === 285 && newKeys.length === 285 && criterion4.omittedFromNew.length === 0 &&
    criterion4.addedInNew.length === 0 && criterion4.duplicateKeysInNew.length === 0 &&
    criterion4.duplicateOrdinalsInNew.length === 0 && criterion4.registrationErrorsNew === 0 &&
    criterion4.completeNew === true && criterion4.orderIdentical;
  if (!criterion4.proved) deviations.push('criterion 4 not proved');

  const proved = deviations.length === 0 && criterion1.proved && criterion2.proved && criterion3.proved && criterion4.proved;
  const report = {
    schema: 'ms18e-variants-compatibility-1',
    label: proved ? 'reused-compatible' : 'NOT-PROVED',
    note: 'The MS18c record (285/285 passed under ' + invOld.sourceHash + ') keeps its old hash and receipts; it is not ' +
      'retagged with the current with-manual fingerprint ' + invNew.sourceHash + '.',
    identity: identity, criterion1: criterion1, criterion2: criterion2, criterion3: criterion3, criterion4: criterion4,
    deviations: deviations
  };
  if (out) fs.writeFileSync(path.resolve(ROOT, out), jsonText(report), { flag: 'wx' });
  console.log('compat: ' + report.label + '; blobs ' + criterion1.identicalCount + '/' + criterion1.comparedCount + ' identical (' +
    rows.filter((r) => r.expectedDifferent).length + ' expected different); perf-helper rows ' +
    changedRows.length + ' values ' + changedValues + ' classes ' + JSON.stringify(criterion2.byClass) +
    '; consumers in loaded path ' + reads.length + ' (comment-only references ' + commentOnly.length + ')' +
    '; changed fingerprint inputs ' + changedInputs.length +
    '; tests ' + criterion4.oldTests + '/' + criterion4.newTests + ' omitted ' + criterion4.omittedFromNew.length +
    ' added ' + criterion4.addedInNew.length + ' dup ' + criterion4.duplicateKeysInNew.length);
  deviations.forEach((d) => console.log('  DEVIATION ' + d));
  changedInputs.forEach((c) => console.log('  input ' + c.change + ' ' + c.path + ' -> ' + c.classification));
  return 0;
}

const MS18E = 'docs/difficulty-v3/evidence/MS18e';
const winPath = (rel) => rel.replace(/\//g, '\\');
const round1 = (x) => Math.round(x * 10) / 10;

function csvRows(rel) {
  const lines = fs.readFileSync(path.resolve(ROOT, rel), 'utf8').split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    head.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

/**
 * The scope map, the admission plan and the reuse map of E0, from the registration inventory, the current GP cells,
 * the MS17b / MS18c / MS07b / MS05r5m timings and the deep records. Reads only; no test or request runs.
 */
function plan(argv) {
  const outDir = arg('--out-dir', argv);
  const suffix = arg('--suffix', argv) || '';
  const invRel = arg('--inventory', argv) || MS18E + '/preflight/inventory-all.json';
  const scanRel = arg('--scan', argv);
  const compatRel = arg('--compat', argv) || MS18E + '/preflight/variants-compatibility.json';
  const previousRel = arg('--previous', argv);
  const EV = 'docs/difficulty-v3/evidence';
  const inv = readJson(invRel);
  const tests = inv.tests;
  const gp = {};
  csvRows(EV + '/MS18d/phase-d/gp-cells.csv').forEach((r) => { gp[r.cell] = r; });
  const matches = (suite, filter) => tests.filter((t) => t.suite === suite &&
    t.fullName.toLowerCase().indexOf(filter.toLowerCase()) !== -1);
  const results = {};
  let ms17bMachine = null;
  fs.readdirSync(path.join(ROOT, EV, 'MS17b/gd')).filter((n) => n.endsWith('.json') && n.indexOf('inventory') === -1).forEach((n) => {
    const r = readJson(EV + '/MS17b/gd/' + n);
    if (!r.selection || !r.results) return;
    ms17bMachine = ms17bMachine || r.machine || null;
    const key = (r.selection.filter || '').trim();
    const entry = { file: 'MS17b/gd/' + n, total: r.results.total, passed: r.results.passed,
      failed: r.results.failed, wallSeconds: round1(r.wallMs / 1000), sourceHash: r.sourceHash, timeFactor: r.timeFactor,
      failedTests: r.results.tests.filter((t) => t.status !== 'pass').map((t) => t.name),
      tests: r.results.tests.map((t) => ({ name: t.name, ms: t.ms, status: t.status })) };
    // a repaired run of the same selection (cap-repaired, score-v3-repaired) replaces the failed one; both stay named
    if (!results[key] || entry.failed < results[key].failed) {
      if (results[key]) entry.supersedes = results[key].file;
      results[key] = entry;
    } else {
      results[key].alsoRun = (results[key].alsoRun || []).concat(entry.file);
    }
  });
  const resultFor = (filter) => {
    const stripped = filter.replace(/^difficulty > /, '');
    const prefixKey = Object.keys(results).find((k) => k.length > 20 && (filter.indexOf(k) === 0 || stripped.indexOf(k) === 0));
    return results[filter] || results[stripped] || (prefixKey ? results[prefixKey] : undefined);
  };
  const engineChange = (commit) => {
    const text = git(['diff', '--shortstat', commit, 'HEAD', '--', 'core/js', 'generator/js']);
    const files = git(['diff', '--name-only', commit, 'HEAD', '--', 'core/js', 'generator/js']).split(/\r?\n/).filter(Boolean);
    return { commit: commit, shortstat: text.trim(), files: files };
  };
  const ms17b = engineChange(git(['rev-parse', '57c1b10a']));
  const ceiling = 450;
  const margin = 2;
  const label = (seconds) => ({ measuredSeconds: seconds, proposedProjectionSeconds: Math.ceil(seconds * margin),
    marginFactor: margin, headroomToCeiling: round1(ceiling / seconds),
    status: seconds * margin <= ceiling ? 'candidate-same-work' : 'no-defensible-bound' });
  const outDirectory = (name) => winPath('../' + MS18E + '/' + name);
  const resultArg = (sub, name) => '--results=' + outDirectory('manual/' + sub + '/' + name + '.json');
  const rows = [];
  const questions = [];

  // difficulty: the seven offered classic9 batches, the confusion matrix and the rest, disjoint by construction
  const diff = tests.filter((t) => t.suite === 'difficulty');
  const prefix = 'difficulty > digger.generate: classic9 puzzles per level (hit rate, invariants I1-I7, time) > ';
  const levels = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare'];
  const used = new Set();
  const hitsSeconds = {};
  levels.forEach((level) => {
    const filter = prefix + level + ' >';
    const sel = matches('difficulty', filter);
    sel.forEach((t) => used.add(t.ordinal));
    const old = resultFor(filter);
    hitsSeconds[level] = old ? old.tests[0].ms / 1000 : null;
    rows.push(Object.assign({
      id: 'GD-' + level, family: 'difficulty', kind: 'describe-selection',
      cwd: 'generator', argv: ['tests\\node-runner.js', '--suite=difficulty', '--filter=' + filter, '--verbose',
        resultArg('difficulty', level)],
      expectedSelected: 8, selectedInInventory: sel.length, ordinals: sel.map((t) => t.ordinal),
      population: '100 requests, SG.digger.generate(model9, ' + level + ', SG.rng.create(7000+i), {}), i 0..99; eight assertions',
      evidence: old ? { file: old.file, sourceHash: old.sourceHash, results: old.passed + '/' + old.total + ' passed',
        wallSeconds: old.wallSeconds, hitsTestSeconds: round1(old.tests[0].ms / 1000), timeFactor: old.timeFactor,
        failedTests: old.failedTests } : null,
      knownOutcomeAtMs17b: old && old.failedTests.length > 0 ? 'the engine is unchanged for this path, so the same deterministic outcome is expected: ' +
        old.failedTests.join('; ') + ' (MS17b evidence section 16: normal 83 of 100, S-AV14, an availability item, never relabelled)' : 'all passed',
      engineUnchangedSinceMs17b: 'git diff ' + ms17b.commit.slice(0, 8) + '..HEAD -- core/js generator/js: ' +
        ms17b.shortstat + ' (the digger, difficulty, solver and technique files are not among them)'
    }, old ? label(old.wallSeconds) : { status: 'no-defensible-bound', basis: 'no same-selector timing' }));
  });
  const cm = diff.filter((t) => /confusion matrix/.test(t.fullName));
  cm.forEach((t) => used.add(t.ordinal));
  const cmSeconds = levels.reduce((s, l) => s + (hitsSeconds[l] || 0), 0);
  rows.push(Object.assign({
    id: 'GD-confusion', family: 'difficulty', kind: 'exact-test', cwd: 'generator',
    argv: ['tests\\node-runner.js', '--suite=difficulty', '--exact=' + cm[0].fullName, '--verbose',
      resultArg('difficulty', 'confusion-matrix')],
    expectedSelected: 1, selectedInInventory: cm.length, ordinals: cm.map((t) => t.ordinal),
    population: 'calls batch(level) for all seven offered levels in one fresh process: 700 requests (the seven GD hit-rate generations, not 100)',
    evidence: { basis: 'the sum of the seven MS17b hit-rate tests (the test that builds each batch), same selector, same seeds',
      perLevelSeconds: hitsSeconds }
  }, label(round1(cmSeconds))));
  const groups = {};
  diff.filter((t) => !used.has(t.ordinal)).forEach((t) => {
    const key = t.fullName.split(' > ').slice(0, -1).join(' > ');
    (groups[key] = groups[key] || []).push(t);
  });
  const finalScan = scanRel ? readJson(scanRel) : null;
  const itemOf = { 'difficulty > difficulty: labelled puzzles (fixtures/rated.js)': 'MS18e-COMPAT-CLASSIC-HELL1-FLOOR',
    'difficulty > digger.generate: guarantees': 'MS18e-COMPAT-CLASSIC-HELL1-SYMMETRY' };
  const hitMap = { 'difficulty > difficulty: labelled puzzles (fixtures/rated.js)': 'difficulty.test.js:997 D.spec(LEVELS[i - 1], model9) on hell1',
    'difficulty > digger.generate: guarantees': 'difficulty.test.js:1445 digger.generate(model9, hell1, ...)' };
  Object.keys(groups).forEach((key, k) => {
    const grp = groups[key];
    const filter = key + ' >';
    const sel = matches('difficulty', filter);
    grp.forEach((t) => used.add(t.ordinal));
    const old = resultFor(filter);
    const exact = sel.length === grp.length;
    const open = finalScan === null || finalScan.unguardedHiddenHits.length > 0;
    const blocked = open ? hitMap[key] || null : null;
    const guard = !open && itemOf[key] ? itemOf[key] : null;
    rows.push(Object.assign({
      id: 'GD-rest-' + String(k + 1).padStart(2, '0'), family: 'difficulty', kind: 'describe-selection',
      describe: key, cwd: 'generator',
      argv: ['tests\\node-runner.js', '--suite=difficulty', '--filter=' + filter, '--verbose',
        resultArg('difficulty', 'rest-' + String(k + 1).padStart(2, '0'))],
      expectedSelected: grp.length, selectedInInventory: sel.length, selectorSelectsExactlyTheGroup: exact,
      ordinals: grp.map((t) => t.ordinal),
      evidence: old ? { file: old.file, sourceHash: old.sourceHash, results: old.passed + '/' + old.total + ' passed',
        wallSeconds: old.wallSeconds, countMatches: old.total === grp.length, timeFactor: old.timeFactor,
        failedTests: old.failedTests, supersedes: old.supersedes || null, alsoRun: old.alsoRun || null } : null,
      blockedByQuestion: blocked ? 'Q-B1-EXTRA: ' + blocked : null,
      hiddenLevelGuard: guard
    }, old ? label(old.wallSeconds) : { status: 'no-defensible-bound', basis: 'no same-selector timing (MS17b ran no such selection)' }));
  });
  const diffCovered = used.size;
  const diffSummary = { tests: diff.length, coveredByRows: diffCovered, disjointAndComplete: diffCovered === diff.length };

  // I5 selectors
  const i5Rows = [];
  const variantOf = { killer: 'killer', jigsaw: 'jigsaw9', 'greater-than': 'greaterThan', wordoku: 'wordoku' };
  ['killer', 'jigsaw', 'greater-than', 'wordoku', 'extra-regions'].forEach((suite) => {
    tests.filter((t) => t.suite === suite && /> I5:/.test(t.fullName)).forEach((t) => {
      const m = /> ([A-Za-z0-9]+ )?([A-Za-z0-9]+): (\d+) puzzles > I5:/.exec(t.fullName);
      const variant = suite === 'extra-regions' ? m[1].trim() : variantOf[suite];
      const level = m[2];
      const count = Number(m[3]);
      const filter = '> ' + (suite === 'extra-regions' ? variant + ' ' : '') + level + ': ' + count + ' puzzles > I5:';
      const sel = matches(suite, filter);
      const cell = gp[variant + '/' + level];
      const envelope = cell ? round1(count * Number(cell.max_ms) / 1000) : null;
      i5Rows.push({
        id: 'I5-' + suite + '-' + level + (suite === 'extra-regions' ? '-' + variant : ''), family: 'I5', suite: suite, cwd: 'generator',
        argv: ['tests\\node-runner.js', '--suite=' + suite, '--filter=' + filter, '--verbose',
          resultArg('i5', suite + '-' + (suite === 'extra-regions' ? variant + '-' : '') + level)],
        expectedSelected: 1, selectedInInventory: sel.length, ordinal: t.ordinal, fullName: t.fullName,
        population: count + ' fixed-corpus puzzles of ' + variant + ' ' + level + ' (original builders, seeds and options)',
        evidence: cell ? { cohort: 'current-source GP cell ' + variant + '/' + level + ': n=' + cell.n +
          ', mean ' + round1(Number(cell.mean_ms)) + ' ms, p95 ' + round1(Number(cell.p95_ms)) + ' ms, max ' +
          round1(Number(cell.max_ms)) + ' ms (seeds 7000+101i, trace summary: a DIFFERENT cohort)',
          envelopeSeconds: envelope } : null,
        status: envelope !== null && envelope * margin <= ceiling ? 'candidate-envelope-different-cohort' : 'no-defensible-bound',
        proposedProjectionSeconds: envelope !== null ? Math.ceil(envelope * margin) : null,
        note: 'no same-selector current-source timing exists; the envelope is N x the GP max of the cell, doubled; the ' +
          'orchestrator and SA decide whether a different-cohort envelope is accepted'
      });
    });
  });
  const i5Counts = i5Rows.reduce((a, r) => { a[r.suite] = (a[r.suite] || 0) + 1; return a; }, {});
  rows.push.apply(rows, i5Rows);

  // S-OD8: the three ratios
  const easy = hitsSeconds.easy / 100;
  const normal = hitsSeconds.normal / 100;
  const workSeconds = 24 * easy + 2 * normal;
  const ratio = [['off', 5, 1.02], ['summary', 4, 1.10], ['full', 4, 1.35]];
  ratio.forEach((x) => {
    const mode = x[0];
    const calls = x[1] * 13;
    const filter = "perf > instrumented generators: what the events cost > generating puzzles: verbosity '" + mode + "' costs less than " +
      (mode === 'off' ? '2' : mode === 'summary' ? '10' : '35') + '%';
    const sel = matches('perf', filter);
    const worst = calls * workSeconds * (1 + x[2]) / 2;
    const best = 13 * workSeconds * (1 + x[2]) / 2;
    rows.push({
      id: 'RATIO-' + mode, family: 'S-OD8', cwd: 'generator',
      argv: ['tests\\node-runner.js', '--suite=perf', '--exact=' + (sel[0] ? sel[0].fullName : filter), '--verbose',
        resultArg('ratios', mode)],
      expectedSelected: 1, selectedInInventory: sel.length, ordinal: sel[0] ? sel[0].ordinal : null,
      population: 'per work call 24 Easy + 2 Normal classic9 puzzles; one internal attempt = 1 warm-up + 12 measured = 13 calls; up to ' +
        x[1] + ' attempts = ' + calls + ' calls = ' + calls * 26 + ' puzzles',
      evidence: { perPuzzleSecondsFromMs17b: { easy: round1(easy * 1000) / 1000, normal: round1(normal * 1000) / 1000 },
        workCallSeconds: round1(workSeconds), formula: 'calls x workCall x (1 + limit)/2 (the rounds alternate the bare and the instrumented work)',
        bestCaseOneAttemptSeconds: round1(best), worstCaseAllAttemptsSeconds: round1(worst),
        historical: 'MS07f measured about 95 s per ratio on the engine of that time (docs/difficulty-v3/evidence/MS07f/manual/ratios.json); the techniques changed since' },
      status: worst <= ceiling ? 'candidate-same-work' : 'no-defensible-bound',
      note: 'the synchronous test is not stopped by its 120000 ms timeout (core/tests/harness.js:415-418); a pass on the first attempt is not a bound'
    });
  });

  // S-OD8 replay and CV3 reuse
  const replayResult = readJson(EV + '/MS18c/closure/manual-variants/result-mega16-replay.json');
  const replayName = 'variants > player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16)';
  const replayRow = matches('variants', replayName);
  const replaySeconds = round1(replayResult.results.tests[0].ms / 1000);
  rows.push({
    id: 'REPLAY-mega16', family: 'S-OD8', kind: 'reuse-no-run', cwd: 'generator',
    argv: ['tests\\node-runner.js', '--suite=variants', '--exact=' + replayName, '--verbose', resultArg('mega-replay', 'mega16')],
    expectedSelected: 1, selectedInInventory: replayRow.length, ordinal: replayRow[0] ? replayRow[0].ordinal : null,
    population: 'two fixed requests: Nightmare seed 478576959 and Hell 1 seed 2422420669, with the existing support restoration',
    evidence: { measuredSecondsSameEngineSameTestFile: replaySeconds, file: 'MS18c/closure/manual-variants/result-mega16-replay.json',
      headroomToCeiling: round1(ceiling / replaySeconds) },
    status: 'reuse-no-run',
    note: 'reused-compatible by ' + compatRel + '; if reuse is rejected the replacement command has a ' +
      replaySeconds + ' s same-work measurement (headroom ' + round1(ceiling / replaySeconds) + 'x: no 2x margin)'
  });
  const cv3 = [];
  const variantRows = {};
  fs.readdirSync(path.join(ROOT, EV, 'MS18c/closure/manual-variants')).filter((n) => /^result-(variant|rest|option)/.test(n)).forEach((n) => {
    readJson(EV + '/MS18c/closure/manual-variants/' + n).results.tests.forEach((t) => { variantRows[t.fullName] = t.ms; });
  });
  tests.filter((t) => t.suite === 'variants' && / > CV3 /.test(t.fullName)).forEach((t) => {
    const m = /^variants > variants: ([A-Za-z0-9]+) > CV3 ([A-Za-z0-9]+):/.exec(t.fullName);
    const filter = '> variants: ' + m[1] + ' > CV3 ' + m[2] + ':';
    const ms = variantRows[t.fullName];
    cv3.push({ id: m[1], level: m[2], ordinal: t.ordinal, filter: filter, selectedInInventory: matches('variants', filter).length,
      ms18cSeconds: ms === undefined ? null : round1(ms / 1000) });
  });
  const cv3Public = cv3.filter((c) => c.level !== 'unsupported');
  const cv3Refusals = cv3.filter((c) => c.level === 'unsupported');
  rows.push({ id: 'CV3-replacement', family: 'CV3', kind: 'reuse-no-run', expectedSelectors: cv3.length,
    publicCells: cv3Public.length, refusalChecks: cv3Refusals.length,
    maxCellSeconds: Math.max.apply(null, cv3.map((c) => c.ms18cSeconds || 0)), status: 'reuse-no-run',
    note: 'accepted by ' + compatRel + ' (reused-compatible); the per-cell table is in scope-map' + suffix + '.json.cv3' });

  // deep
  const deepRecord = (dirRel, level) => fs.readdirSync(path.join(ROOT, dirRel)).filter((n) => n.endsWith('.json')).sort().map((n) => {
    const r = readJson(dirRel + '/' + n);
    return { id: r.id, file: dirRel.replace(EV + '/', '') + '/' + n, oldGenerationSeconds: round1(r.generationMs / 1000),
      outcome: r.outcome, recordSourceHash: r.sourceHash, recordToolHash: r.toolHash, commit: r.commit, manifestHash: r.manifestHash,
      level: level };
  });
  const nightmare = deepRecord(EV + '/MS05r5m/records', 'nightmare');
  const hell1 = deepRecord(EV + '/MS07b/mega-hell1/records', 'hell1');
  const deepRows = nightmare.concat(hell1).map((r) => {
    const cell = r.id.indexOf('mega12') === 0 ? 'mega12' : 'mega16';
    const gpCell = r.level === 'nightmare' ? cell + '/nightmare' : cell + '/hell2';
    return {
      id: 'DEEP-' + r.id, family: 'deep', cwd: 'generator',
      argv: ['tests\\mega-contract.js', '--request=' + r.id, '--record=' + outDirectory('deep/' + r.level + '/' + r.id + '.json')],
      population: 'one fixed request of the ' + r.level + ' manifest, once per process, trace off, board default attempts, allowance 256, 500000 ms shared budget (not a bound)',
      evidence: { oldRecord: r.file, oldGenerationSeconds: r.oldGenerationSeconds, oldSourceHash: r.recordSourceHash.slice(0, 16),
        oldCommit: r.commit.slice(0, 8), currentSourceHashMatches: 'unknown until `--reconcile` computes the current identity; the engine files changed since the record commit (see reuse-map.json)',
        gpCohortForTheCell: gp[gpCell] ? gpCell + ' (hidden hell1/nightmare cells have none): max ' + round1(Number(gp[gpCell].max_ms)) + ' ms, a different cohort' : null },
      status: 'no-defensible-bound',
      note: 'no current-source timing of this request exists; the old duration is from a different engine; the 500000 ms diagnostic budget is not a launch bound'
    };
  });
  rows.push.apply(rows, deepRows);
  rows.push({ id: 'SAV11', family: 'S-AV11', kind: 'held',
    tuple: 'jigsaw9 / Expert / seed 1111 / trace off / default 8 attempts (hidden level: toolRecords.withRequestedLevel around the original SG.pipeline.run)',
    evidence: { observation: '325.313 s whole request, history only; source and machine of that observation are not a current bound',
      gpCohort: ['jigsaw9/hard', 'jigsaw9/master', 'jigsaw9/hell2'].map((c) => gp[c] ? c + ': mean ' + round1(Number(gp[c].mean_ms)) + ' ms, p95 ' + round1(Number(gp[c].p95_ms)) + ' ms, max ' + round1(Number(gp[c].max_ms)) + ' ms' : null) },
    status: 'no-defensible-bound',
    route: 'no existing tool runs this tuple: tests/difficulty-recovery.js knows only G13, mega12-nightmare and mega16-nightmare. Options in questions.md (Q-SAV11-ROUTE)' });

  const byStatus = rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const sha = (rel) => sha256(fs.readFileSync(path.resolve(ROOT, rel)));
  const previous = previousRel ? readJson(previousRel) : null;
  const continuity = previous === null ? null : (() => {
    const was = {};
    previous.rows.forEach((r) => { was[r.id] = r; });
    const mismatches = [];
    rows.forEach((r) => {
      const w = was[r.id];
      if (!w) mismatches.push(r.id + ': new row');
      else if (w.proposedProjectionSeconds !== r.proposedProjectionSeconds) {
        mismatches.push(r.id + ': projection ' + w.proposedProjectionSeconds + ' -> ' + r.proposedProjectionSeconds);
      } else if (w.status !== r.status) mismatches.push(r.id + ': status ' + w.status + ' -> ' + r.status);
    });
    previous.rows.forEach((w) => { if (!rows.some((r) => r.id === w.id)) mismatches.push(w.id + ': removed'); });
    return { previous: previousRel, previousSha256: sha(previousRel), previousRows: previous.rows.length,
      rows: rows.length, mismatches: mismatches, sameIdsProjectionsAndStatuses: mismatches.length === 0 };
  })();
  const normalRow = rows.filter((r) => r.id === 'GD-normal')[0];
  if (normalRow) {
    normalRow.exitPolicy = 'S-AV14 is preserved: the batch is expected to give 7 of 8, the hit-rate assertion at about 83 of 100 ' +
      '(MS17b, MS07e). The orchestrator inspects the raw exit-1 result before continuing: no automatic -AllowExit1, no ' +
      'retry, no relabelling as a pass; 83 of 100 is claimed only if the new evidence reports it; any different outcome ' +
      'means review.';
  }
  const admission = {
    schema: 'ms18e-admission-plan-2',
    rule: 'unknown or above 450 s is not admitted; a test timeout, the deep 500 s budget, GQ/GP time, a different cohort or the ' +
      'historical 430.5/449 s is not by itself a bound; no pilot run. The proposed projection is the measured same-work time times ' +
      margin + ' (a margin proposed here for the orchestrator and SA to confirm).',
    ceilingSeconds: ceiling, margin: margin, dispatchTransport: 'every row: tests via the locked caller, tee-c.js transcript, 540 s process ceiling, >= 15 s gap',
    transportEnvironment: { SG_TIME_FACTOR: '2 (set explicitly by run-locked-e.ps1; harness.js:36-41 defaults to 2 locally and 3 with CI)',
      CI: 'unset (the caller refuses to start when it is set)', timeFactorInTheInventory: inv.timeFactor,
      verification: 'the metadata of --list-tests and --results records timeFactor (core/tests/node-evidence.js:292 and :308)' },
    inventory: { file: invRel, sourceHash: inv.sourceHash, tests: tests.length },
    hiddenLevelScan: finalScan === null ? null : { file: scanRel, unguardedHiddenHits: finalScan.unguardedHiddenHits.length,
      sites: finalScan.totalSites },
    variantsReuseProof: compatRel,
    supersedes: previousRel ? { file: previousRel, sha256: previous === null ? null : sha(previousRel),
      reviewedSha256: 'f411c2f709db0e6891d71fd382d2d113341e2a7774a76ec6a50236e91fe447c9',
      matchesReviewed: previous !== null && sha(previousRel) === 'f411c2f709db0e6891d71fd382d2d113341e2a7774a76ec6a50236e91fe447c9' } : null,
    continuity: continuity,
    engineChangeSinceMs17b: ms17b, ms17bMachine: ms17bMachine, currentMachine: inv.machine,
    sameMachineClass: JSON.stringify(ms17bMachine) === JSON.stringify(inv.machine),
    difficultyCoverage: diffSummary, i5Counts: i5Counts, summaryByStatus: byStatus, rows: rows
  };

  const manualSuites = ['difficulty', 'extra-regions', 'greater-than', 'jigsaw', 'killer', 'perf', 'variants', 'wordoku'];
  const assigned = { difficulty: diff.length, 'extra-regions': i5Rows.filter((r) => /extra-regions/.test(r.id)).length,
    'greater-than': i5Rows.filter((r) => /greater-than/.test(r.id)).length, jigsaw: i5Rows.filter((r) => /-jigsaw-/.test(r.id)).length,
    killer: i5Rows.filter((r) => /-killer-/.test(r.id)).length, perf: 3, variants: 285, wordoku: i5Rows.filter((r) => /-wordoku-/.test(r.id)).length };
  const scope = {
    schema: 'ms18e-scope-map-1',
    inventory: { file: invRel, sourceHash: inv.sourceHash, suites: inv.selection.suites.length, tests: tests.length },
    manualSuites: manualSuites.map((s) => {
      const total = tests.filter((t) => t.suite === s).length;
      return { suite: s, tests: total, assignedByThisDispatch: assigned[s], notAssigned: total - assigned[s],
        label: assigned[s] === total ? 'complete (difficulty: every test through the rows of the admission plan; variants: reused)' :
          'the rest is OUTSIDE this dispatch and stays unexecuted: not reported as "the suite passed"' };
    }),
    families: {
      difficulty: { offeredBatches: 7, requestsPerBatch: 100, seeds: '7000+i', assertionsPerBatch: 8, confusionMatrixRequests: 700,
        rows: rows.filter((r) => r.family === 'difficulty').map((r) => ({ id: r.id, selected: r.expectedSelected })), coverage: diffSummary },
      i5: { selectors: i5Rows.length, bySuite: i5Counts, rows: i5Rows.map((r) => ({ id: r.id, ordinal: r.ordinal, fullName: r.fullName, selected: r.selectedInInventory })) },
      cv3: { publicCells: cv3Public.length, refusalChecks: cv3Refusals.length, requestGuardMs: 240000,
        perLevel: 'samurai, sohei, flower, mega16, butterfly 2; the others 3', cells: cv3 },
      sOd8: { ratios: 3, replayOrdinal: replayRow[0] ? replayRow[0].ordinal : null },
      deep: { occurrences: deepRows.length, nightmare: nightmare.length, hell1: hell1.length },
      sAv11: { held: true }
    }
  };
  const reuse = {
    schema: 'ms18e-reuse-map-1',
    variants: { label: 'reused-compatible', proof: compatRel,
      record: EV + '/MS18c/closure/manual-variants/reconciliation.json', oldFingerprint: '13cd63bfb0f5af687bc8e841d522cc7f216aa116125394b33fbc32a53ab1ef3f',
      note: 'the old fingerprint and receipts are kept; the current with-manual fingerprint is ' + inv.sourceHash },
    megaReplay: { label: 'reused-compatible (inside the 285)', secondsInMs18c: replaySeconds },
    deep: {
      nightmare: { records: nightmare, engineChangeSinceRecordCommit: engineChange(nightmare[0].commit),
        reconciliation: 'MS05r6b/deep/reconciled-final.json (currentMatches at that time: sourceHash false, toolHash true)' },
      hell1: { records: hell1, engineChangeSinceRecordCommit: engineChange(hell1[0].commit),
        reconciliation: 'MS07b/mega-hell1/reconciliation.json (currentMatches at that time: both true)' },
      rule: 'inspect identity.currentMatches.sourceHash and .toolHash on the final source; a mismatch is retained only through the recorded non-generation-diff exception, else a coherent fourteen-record level cohort is refreshed'
    },
    evidenceOnlyTimings: { gdMs17b: 'MS17b/gd (same engine for the digger path, see engineChangeSinceMs17b)', ratiosMs07f: 'MS07f/manual/ratios.json (older engine)' }
  };
  if (outDir) {
    const dirAbs = path.resolve(ROOT, outDir);
    fs.writeFileSync(path.join(dirAbs, 'admission-plan' + suffix + '.json'), jsonText(admission), { flag: 'wx' });
    fs.writeFileSync(path.join(dirAbs, 'scope-map' + suffix + '.json'), jsonText(scope), { flag: 'wx' });
    fs.writeFileSync(path.join(dirAbs, 'reuse-map' + suffix + '.json'), jsonText(reuse), { flag: 'wx' });
  }
  if (continuity) console.log('continuity with ' + previousRel + ': ' + (continuity.sameIdsProjectionsAndStatuses ? 'same ' + rows.length +
    ' ids, projections and statuses' : continuity.mismatches.join('; ')) + '; previous sha256 ' + continuity.previousSha256);
  console.log('plan: ' + rows.length + ' rows; by status ' + JSON.stringify(byStatus) + '; difficulty ' + JSON.stringify(diffSummary) +
    '; I5 ' + i5Rows.length + ' ' + JSON.stringify(i5Counts) + '; CV3 ' + cv3Public.length + ' + ' + cv3Refusals.length +
    '; deep ' + deepRows.length + '; engine files changed since MS17b ' + ms17b.files.length);
  rows.forEach((r) => {
    console.log('  ' + r.id + ' | ' + r.status + (r.proposedProjectionSeconds ? ' | proj ' + r.proposedProjectionSeconds + ' s' : '') +
      (r.selectedInInventory !== undefined ? ' | sel ' + r.selectedInInventory + '/' + r.expectedSelected : '') +
      (r.blockedByQuestion ? ' | BLOCKED ' + r.blockedByQuestion : ''));
  });
  return 0;
}

/** UTF-8 without a BOM, CRLF line ends only, a final newline and no trailing whitespace, for the named files. */
function format(argv) {
  let bad = 0;
  argv.forEach((rel) => {
    const raw = fs.readFileSync(path.resolve(ROOT, rel));
    const text = raw.toString('utf8');
    const problems = [];
    if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) problems.push('BOM');
    if (/(^|[^\r])\n/.test(text)) problems.push('bare LF');
    if (/\r(?!\n)/.test(text)) problems.push('bare CR');
    if (text.length > 0 && !text.endsWith('\n')) problems.push('no final newline');
    if (/[ \t]+\r?\n/.test(text)) problems.push('trailing whitespace');
    if (Buffer.from(text, 'utf8').compare(raw) !== 0) problems.push('not valid UTF-8');
    if (problems.length > 0) bad++;
    console.log((problems.length ? 'PROBLEM ' : 'ok      ') + rel + (problems.length ? ': ' + problems.join(', ') : ''));
  });
  console.log('checked ' + argv.length + ' files, ' + bad + ' with problems');
  return bad === 0 ? 0 : 1;
}

// ---- E3 modes: quick coverage, CI cost, source bindings (file-only; they read what the locked runs wrote) ----
// Reuses the pure checks that MS18d's closeout.js exports (reconcileShard, parseIdentities, recheckProblems and the
// projection rule); requiring it runs nothing and writes nothing.

const EVIDENCE = 'docs/difficulty-v3/evidence/MS18e';
const closeout = () => require('../MS18d/phase-d/closeout.js');
const readText = (rel) => fs.readFileSync(path.resolve(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
const lockRows = (rel) => readText(rel || EVIDENCE + '/lock-log.jsonl').split(/\r?\n/).filter((l) => l.trim() !== '')
  .map((l) => JSON.parse(l));

function writeNewJson(outRel, doc) {
  fs.mkdirSync(path.dirname(path.resolve(ROOT, outRel)), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT, outRel), jsonText(doc), { flag: 'wx' });
}

/** The five identities of an identities-now.cjs output (a transcript is fine: only its five lines are read). */
function identitiesOf(rel) {
  const lines = readText(rel).split(/\r?\n/).filter((l) => /^(generator quick fingerprint|player quick fingerprint|generator with the manual trees|replay identity|hash identity) /.test(l));
  return closeout().parseIdentities(lines.join('\n'));
}

function finish(name, problems, summary) {
  problems.forEach((p) => console.log('PROBLEM ' + p));
  console.log(name + ': ' + (problems.length === 0 ? 'ok' : problems.length + ' problem(s)') + ' (' + summary + ')');
  return problems.length === 0 ? 0 : 2;
}

/** One successful locked run of the log, with the three distinct clocks. */
function clocksOf(log, id, problems) {
  const rows = log.filter((r) => r.id === id && r.outcome === 'ok');
  if (rows.length !== 1) {
    problems.push(id + ': not exactly one successful locked run (' + rows.length + ')');
    return {};
  }
  const r = rows[0];
  if (!(r.tee && r.tee.complete === true && r.tee.exit === 0 && r.helperExit === 0)) problems.push(id + ': incomplete or failed run');
  return { teeSeconds: r.teeSeconds, helperSeconds: r.helperSeconds, callerSeconds: r.callerSeconds,
    lockWaitDerivedSeconds: r.lockWaitDerivedSeconds, gapSleptSeconds: r.gapSleptSeconds, startedAt: r.startedAt,
    endedAt: r.endedAt, transcript: r.transcript };
}

/**
 * `coverage --ci <dir> --quick <dir> --ids <identities> --manifest <json> [--out <json>] [--log <jsonl>]`: every quick
 * test of each app exactly once by (suite, ordinal) with its full name, from the inventories of the CI check and the
 * results of the shard commands; no failure, skip, registration error or stale/mixed source.
 */
function coverage(argv) {
  const tools = closeout();
  const ci = arg('--ci', argv);
  const quick = arg('--quick', argv);
  const out = arg('--out', argv);
  const problems = [];
  const ids = identitiesOf(arg('--ids', argv));
  ids.problems.forEach((p) => problems.push(p));
  const manifest = readJson(arg('--manifest', argv));
  const log = lockRows(arg('--log', argv));
  const shards = [].concat(...manifest.groups.map((g) => g.shards));
  const tally = (rows) => rows.reduce((acc, t) => {
    const s = acc[t.suite] || (acc[t.suite] = { tests: 0, passed: 0, failed: 0, skipped: 0 });
    s.tests++;
    if (t.status === 'pass') s.passed++;
    else if (t.status === 'skip') s.skipped++;
    else s.failed++;
    return acc;
  }, {});
  const covered = new Map();
  const generatorSuites = {};
  const shardRows = shards.map((s) => {
    const inv = readJson(ci + '/shard-' + s.id + '.json');
    const file = quick + '/generator-' + s.id + '.json';
    const result = readJson(file);
    const r = tools.reconcileShard('generator/' + s.id, inv, result, { sourceHash: ids.identities.generatorQuick,
      argv: ['--suite=' + s.suites.join(','), '--results=..\\' + file.replace(/\//g, '\\')] });
    r.problems.forEach((p) => problems.push(p));
    if (inv.tests.length !== s.tests) problems.push('generator/' + s.id + ': the manifest counts ' + s.tests + ', the inventory ' + inv.tests.length);
    result.results.tests.forEach((t) => covered.set(t.suite + '/' + t.ordinal, (covered.get(t.suite + '/' + t.ordinal) || 0) + 1));
    const bySuite = tally(result.results.tests);
    Object.keys(bySuite).forEach((k) => { generatorSuites[k] = bySuite[k]; });
    return Object.assign({ shard: s.id, suites: s.suites.length, resultFile: file, resultSha256: sha256(fs.readFileSync(path.resolve(ROOT, file))),
      sourceHash: result.sourceHash, timeFactor: result.timeFactor, node: result.node, runnerBodySeconds: Number((result.wallMs / 1000).toFixed(3)) },
    r.tally, clocksOf(log, 'quick-generator-' + s.id, problems));
  });
  const all = readJson(ci + '/generator-all.json');
  const keys = new Set(all.tests.map((t) => t.suite + '/' + t.ordinal));
  keys.forEach((k) => { if (covered.get(k) !== 1) problems.push('generator: ' + k + ' covered ' + (covered.get(k) || 0) + ' time(s)'); });
  covered.forEach((n, k) => { if (!keys.has(k)) problems.push('generator: unexpected key ' + k); });
  const sum = (field) => shardRows.reduce((a, s) => a + s[field], 0);
  const generator = { expected: all.tests.length, suites: new Set(all.tests.map((t) => t.suite)).size, sourceHash: all.sourceHash,
    covered: covered.size, passed: sum('passed'), failed: sum('failed'), skipped: sum('skipped'), shards: shardRows, bySuite: generatorSuites };
  const pFile = quick + '/player-quick.json';
  const pAll = readJson(ci + '/player-all.json');
  const pResult = readJson(pFile);
  const pr = tools.reconcileShard('player/whole-quick', pAll, pResult, { sourceHash: ids.identities.playerQuick,
    argv: ['--results=..\\' + pFile.replace(/\//g, '\\')] });
  pr.problems.forEach((p) => problems.push(p));
  const player = Object.assign({ expected: pAll.tests.length, suites: new Set(pAll.tests.map((t) => t.suite)).size, sourceHash: pAll.sourceHash,
    resultFile: pFile, resultSha256: sha256(fs.readFileSync(path.resolve(ROOT, pFile))), timeFactor: pResult.timeFactor, node: pResult.node,
    runnerBodySeconds: Number((pResult.wallMs / 1000).toFixed(3)), bySuite: tally(pResult.results.tests) },
  pr.tally, clocksOf(log, 'quick-player', problems));
  if (generator.expected !== 4807 || generator.suites !== 55 || player.expected !== 2981 || player.suites !== 32) {
    problems.push('the quick counts are not 4807 tests in 55 suites and 2981 in 32');
  }
  const doc = { schema: 'ms18e-quick-coverage-v1', method: 'per app, by (suite, ordinal) with the full name against the inventories of the CI ' +
    'check; shared suites run in both apps and are not deduplicated across them; the focused runs and any superseded result are excluded; ' +
    'pass/fail/skip are the runner rows of the shard commands', fingerprints: ids.identities, generator, player, problems };
  if (out && problems.length === 0) writeNewJson(out, doc);
  return finish('coverage', problems, 'generator ' + generator.covered + '/' + generator.expected + ' in ' + generator.suites + ' suites, player ' +
    player.rows + '/' + player.expected + ' in ' + player.suites + ' suites, passed ' + (generator.passed + player.passed) + ', failed ' +
    (generator.failed + player.failed) + ', skipped ' + (generator.skipped + player.skipped));
}

/**
 * `cost --quick <dir> --old-ref <git ref> [--manifest-new <json>] [--out <json>] [--log <jsonl>]`: the CI projection rule
 * newProjection = max(old, 10 * ceil(1.5 m / 10)) with m the tee seconds of the successful complete run, the job arithmetic
 * (Generator groups 180 + 3 sum <= 1800, Player 180 + 3 p <= 900) and, when given, the edited manifest against the computed values.
 */
function cost(argv) {
  const tools = closeout();
  const quick = arg('--quick', argv);
  const out = arg('--out', argv);
  const oldRef = arg('--old-ref', argv);
  const newRel = arg('--manifest-new', argv);
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(text); };
  const log = lockRows(arg('--log', argv));
  const oldManifest = JSON.parse(git(['show', oldRef + ':.github/scripts/generator-quick.json']));
  const shards = [].concat(...oldManifest.groups.map((g) => g.shards));
  const rowOf = (id, file, kind, tests, oldProjection) => {
    const c = clocksOf(log, id, problems);
    const res = readJson(file);
    const m = c.teeSeconds;
    return Object.assign({ kind: kind, shard: id.replace(/^quick-(generator-)?/, ''), tests: tests, oldProjection: oldProjection, m: m,
      onePointFiveM: Number((1.5 * m).toFixed(4)), roundedToTen: tools.roundedProjection(m),
      newProjection: tools.newProjection(oldProjection, m), measuredSecondsNew: Number(m.toFixed(1)),
      runnerBodySeconds: Number((res.wallMs / 1000).toFixed(3)), harnessMs: res.results.ms }, c);
  };
  const rows = shards.map((s) => rowOf('quick-generator-' + s.id, quick + '/generator-' + s.id + '.json', 'generator-shard', s.tests, s.projectionSeconds));
  const player = rowOf('quick-player', quick + '/player-quick.json', 'player-app', oldManifest.player.tests, oldManifest.player.projectionSeconds);
  player.shard = 'player-app';
  const proj = {};
  rows.forEach((r) => { proj[r.shard] = r.newProjection; });
  proj['player-app'] = player.newProjection;
  const jobs = tools.jobArithmetic(oldManifest, proj);
  rows.concat([player]).forEach((r) => {
    bad(r.newProjection <= 450, r.shard + ': the projection exceeds 450 s');
    bad(r.newProjection >= r.oldProjection, r.shard + ': a projection would fall');
    bad(typeof r.m === 'number' && r.m <= 540, r.shard + ': the tee seconds exceed the 540 s ceiling');
  });
  jobs.forEach((j) => bad(j.projected <= j.limit, j.job + ': ' + j.projected + ' s exceeds ' + j.limit + ' s'));
  let manifestCheck = null;
  if (newRel) {
    const mn = readJson(newRel);
    const strip = (m) => {
      const c = JSON.parse(JSON.stringify(m));
      delete c.provenance;
      c.groups.forEach((g) => g.shards.forEach((s) => { delete s.projectionSeconds; delete s.measuredSeconds; }));
      delete c.player.projectionSeconds;
      delete c.player.measuredSeconds;
      return JSON.stringify(c);
    };
    bad(strip(mn) === strip(oldManifest), 'the edited manifest changes more than projectionSeconds, measuredSeconds and provenance (membership, groups, commands or job rule)');
    const got = {};
    [].concat(...mn.groups.map((g) => g.shards)).forEach((s) => { got[s.id] = { p: s.projectionSeconds, m: s.measuredSeconds }; });
    rows.forEach((r) => bad(got[r.shard] && got[r.shard].p === r.newProjection && got[r.shard].m === r.measuredSecondsNew,
      r.shard + ': the edited manifest differs from the computed values'));
    bad(mn.player.projectionSeconds === player.newProjection && mn.player.measuredSeconds === player.measuredSecondsNew,
      'player: the edited manifest differs from the computed values');
    bad(mn.job.ciSlowdownFactor === 3 && mn.job.jobOverheadSeconds === 180 && mn.job.timeoutMinutes === 30, 'the job factor, overhead or timeout changed');
    manifestCheck = { file: newRel, sha256: sha256(fs.readFileSync(path.resolve(ROOT, newRel))), equalToComputed: problems.length === 0 };
  }
  const doc = { schema: 'ms18e-quick-cost-v1', rule: 'newProjection = max(old, 10 * ceil(1.5 * m / 10)), m = the tee final seconds of the ' +
    'successful complete run; raises only', oldManifestRef: oldRef, clocks: 'teeSeconds (m), helperSeconds, runnerBodySeconds (the harness wall of ' +
    'the results file), callerSeconds and lockWaitDerivedSeconds are distinct clocks; no projection is derived from the helper or the runner body',
  shards: rows, player: player, jobs: jobs, manifestCheck: manifestCheck, problems: problems };
  if (out && problems.length === 0) writeNewJson(out, doc);
  return finish('cost', problems, rows.map((r) => r.shard + ' ' + r.m + '->' + r.newProjection).concat(['player ' + player.m + '->' + player.newProjection]).join(', ') +
    '; ' + jobs.map((j) => j.job + ' ' + j.projected + '/' + j.limit).join(', '));
}

const FP_COMMON = ['AGENTS.md', 'README.md', 'USERGUIDE.md', 'USERGUIDE.vn.md', 'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md',
  'core/tests/harness.js', 'core/tests/node-evidence.js'];
const FP_APPS = {
  generator: { files: ['generator/design.md', 'generator/index.html', 'generator/tests.html'],
    trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'generator/js', 'generator/css',
      'generator/assets', 'generator/tests/fixtures', 'generator/tests/suites'], flat: ['generator/tests'], manual: ['generator/tests/manual'] },
  player: { files: ['player/design.md', 'player/help.html', 'player/index.html', 'player/tests.html'],
    trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'player/js', 'player/css', 'player/assets',
      'player/tests/fixtures', 'player/tests/suites', 'player/tests/tools'], flat: ['player/tests'], manual: [] }
};

/** Which fingerprints read this file (the input recipes of identities-now.cjs, copied, not the tool's own code). */
function fingerprintsOf(rel) {
  const hit = [];
  Object.keys(FP_APPS).forEach((app) => {
    const a = FP_APPS[app];
    const inTree = (dirs) => dirs.some((d) => rel.indexOf(d + '/') === 0);
    if (FP_COMMON.indexOf(rel) !== -1 || a.files.indexOf(rel) !== -1 || inTree(a.trees) || a.flat.some((d) => path.posix.dirname(rel) === d)) hit.push(app + '-quick');
    else if (inTree(a.manual)) hit.push(app + '-with-manual-only');
  });
  return hit;
}

/**
 * `bindings --ids-start <f> --ids-end <f> --ids-e2 <f> --recheck <json> --recheck-prior <json> --base <commit> --out <json>`:
 * the five identities unchanged from the E2 source identity through the end of E3, the target re-check validation, and
 * every file changed since the base commit classified by the fingerprints that read it.
 */
function bindings(argv) {
  const tools = closeout();
  const problems = [];
  const start = identitiesOf(arg('--ids-start', argv));
  const end = identitiesOf(arg('--ids-end', argv));
  const e2 = identitiesOf(arg('--ids-e2', argv));
  [start, end, e2].forEach((x) => x.problems.forEach((p) => problems.push(p)));
  const keys = Object.keys(e2.identities);
  keys.forEach((k) => {
    if (start.identities[k] !== e2.identities[k]) problems.push(k + ' at the start of E3 differs from the E2 source identity');
    if (end.identities[k] !== e2.identities[k]) problems.push(k + ' at the end of E3 differs from the E2 source identity');
  });
  const recheck = readJson(arg('--recheck', argv));
  const prior = readJson(arg('--recheck-prior', argv));
  tools.recheckProblems(recheck, 'target re-check').forEach((p) => problems.push(p));
  if (JSON.stringify(recheck) !== JSON.stringify(prior)) problems.push('the target re-check differs from the E1 one');
  const base = arg('--base', argv);
  const changed = new Set(git(['diff', '--name-only', base]).split(/\r?\n/).filter(Boolean));
  git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean).forEach((p) => changed.add(p));
  const files = Array.from(changed).sort().map((p) => ({ path: p, fingerprints: fingerprintsOf(p) }));
  const hashed = files.filter((f) => f.fingerprints.length > 0);
  if (hashed.length > 0) problems.push(hashed.length + ' changed file(s) are fingerprint inputs since ' + base);
  const byArea = files.reduce((acc, f) => {
    const area = f.path.indexOf(EVIDENCE + '/') === 0 ? 'evidence MS18e' : f.path.split('/').slice(0, 2).join('/');
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});
  const doc = { schema: 'ms18e-source-bindings-v1', head: git(['rev-parse', 'HEAD']), base: base,
    identitiesStart: start.identities, identitiesEnd: end.identities, identitiesE2: e2.identities,
    sevenValues: Object.assign({}, end.identities, { producerSources: recheck.identities.sources, targetTable: recheck.tableSha256 }),
    targetRecheck: { counts: recheck.counts, designTable: recheck.designTable, retainedBudgetsDiffer: recheck.retainedBudgets.differ,
      statedInAllThree: recheck.retainedBudgets.statedIn.every((s) => s.design && s.en && s.vi), problems: recheck.problems },
    changedSinceBase: { count: files.length, byArea: byArea, fingerprintInputs: hashed, files: files }, problems: problems };
  const out = arg('--out', argv);
  if (out && problems.length === 0) writeNewJson(out, doc);
  return finish('bindings', problems, files.length + ' changed files since ' + base + ', ' + hashed.length + ' fingerprint inputs');
}

/** The jobs of a workflow file, read from its text (the repository has no YAML dependency and these files are regular). */
function workflowJobs(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  const jobs = [];
  let cur = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    const key = /^ {2}([a-z][a-z0-9-]*):\s*$/.exec(l);
    if (key) {
      cur = { key: key[1], line: i + 1, name: null, timeoutMinutes: null, needs: [], runsOn: null, nodeVersions: [], envFactorOrDeep: false };
      jobs.push(cur);
    } else if (cur) {
      let m;
      if ((m = /^ {4}name:\s*(.+)$/.exec(l))) cur.name = m[1].trim();
      else if ((m = /^ {4}timeout-minutes:\s*(\d+)\s*$/.exec(l))) cur.timeoutMinutes = Number(m[1]);
      else if ((m = /^ {4}needs:\s*(.+)$/.exec(l))) cur.needs = m[1].replace(/[[\]]/g, '').split(',').map((x) => x.trim()).filter(Boolean);
      else if ((m = /^ {4}runs-on:\s*(.+)$/.exec(l))) cur.runsOn = m[1].trim();
      if ((m = /node-version:\s*'?([0-9]+)'?/.exec(l))) cur.nodeVersions.push(m[1]);
      if (/SG_TIME_FACTOR|SG_DEEP/.test(l) && !/^\s*#/.test(l)) cur.envFactorOrDeep = true;
    }
  }
  return jobs;
}

/**
 * `workflow [--out <json>]`: the static audit of both workflows against the final manifest: the eight task-defined PR job names,
 * every limit in seconds, Node 24 / ubuntu, no time-factor or deep setting, the triggers, Pages' dependencies and the
 * Player 900 s arithmetic. It reads files only; it says nothing about a remote run.
 */
function workflowAudit(argv) {
  const out = arg('--out', argv);
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(text); };
  const manifest = readJson('.github/scripts/generator-quick.json');
  const pr = readText('.github/workflows/pull-request.yml');
  const pages = readText('.github/workflows/pages.yml');
  const taskJobs = ['Test core', 'Plan generator tests', 'Test generator (shared and small suites)', 'Test generator (own suites)',
    'Test generator (pipeline)', 'Test generator (replay player)', 'Test player', 'Test player in a browser'];
  const matrixNames = manifest.groups.map((g) => 'Test generator (' + g.name + ')');
  const prJobs = workflowJobs(pr);
  const pageJobs = workflowJobs(pages);
  const expected = { 'test-core': [15, 'Test core'], 'plan-generator': [10, 'Plan generator tests'],
    'test-generator': [30, 'Test generator (${{ matrix.name }})'], 'test-player': [15, 'Test player'], 'test-browser': [30, 'Test player in a browser'] };
  const pagesExpected = { 'test-core': 15, 'plan-generator': 10, 'test-generator': 30, 'test-player': 15, deploy: null };
  const names = [];
  prJobs.forEach((j) => {
    const e = expected[j.key];
    bad(e && j.timeoutMinutes === e[0] && j.name === e[1], 'pull-request.yml ' + j.key + ': name/timeout is not ' + JSON.stringify(e));
    bad(j.runsOn === 'ubuntu-latest' && j.nodeVersions.every((v) => v === '24') && j.nodeVersions.length === 1, 'pull-request.yml ' + j.key + ': not ubuntu-latest with Node 24');
    bad(!j.envFactorOrDeep, 'pull-request.yml ' + j.key + ': sets a time factor or SG_DEEP');
    if (j.key === 'test-generator') matrixNames.forEach((n) => names.push(n));
    else names.push(j.name);
  });
  bad(JSON.stringify(prJobs.map((j) => j.key)) === JSON.stringify(Object.keys(expected)), 'pull-request.yml: the job list changed');
  bad(JSON.stringify(names.slice().sort()) === JSON.stringify(taskJobs.slice().sort()), 'the eight PR job names expanded from the manifest are not the task-defined eight: ' + names.join(' | '));
  pageJobs.forEach((j) => {
    bad(Object.prototype.hasOwnProperty.call(pagesExpected, j.key) && j.timeoutMinutes === pagesExpected[j.key], 'pages.yml ' + j.key + ': unexpected job or timeout');
    bad(j.runsOn === 'ubuntu-latest' && j.nodeVersions.every((v) => v === '24'), 'pages.yml ' + j.key + ': not ubuntu-latest with Node 24');
    bad(!j.envFactorOrDeep, 'pages.yml ' + j.key + ': sets a time factor or SG_DEEP');
  });
  const deploy = pageJobs.find((j) => j.key === 'deploy');
  bad(deploy && deploy.needs.indexOf('test-generator') !== -1 && deploy.needs.indexOf('test-player') !== -1, 'pages.yml deploy does not wait for the generator and player tests');
  bad(/^on:\r?\n {2}pull_request:\r?\n {4}branches: \[main\]/m.test(pr), 'pull-request.yml does not trigger on pull_request to main only');
  bad(/^on:\r?\n {2}push:\r?\n {4}branches: \[main\]\r?\n {2}workflow_dispatch:/m.test(pages), 'pages.yml triggers are not push to main and workflow_dispatch');
  const playerProjection = manifest.player.projectionSeconds;
  const playerJob = prJobs.find((j) => j.key === 'test-player');
  const playerLimit = playerJob.timeoutMinutes * 60;
  const projected = manifest.job.jobOverheadSeconds + manifest.job.ciSlowdownFactor * playerProjection;
  bad(playerLimit === 900 && projected <= playerLimit, 'the Player job projects ' + projected + ' s against ' + playerLimit + ' s');
  const groups = manifest.groups.map((g) => {
    const sum = g.shards.reduce((a, s) => a + s.projectionSeconds, 0);
    const p = manifest.job.jobOverheadSeconds + manifest.job.ciSlowdownFactor * sum;
    bad(p <= manifest.job.timeoutMinutes * 60, 'group ' + g.id + ' projects ' + p + ' s');
    return { group: g.id, job: 'Test generator (' + g.name + ')', shards: g.shards.map((s) => s.id), projectionSum: sum, projectedSeconds: p, limitSeconds: manifest.job.timeoutMinutes * 60 };
  });
  const doc = { schema: 'ms18e-workflow-audit-v1', scope: 'static read of the final files; no remote run is implied', taskDefinedPrJobs: taskJobs,
    expandedFromWorkflowAndManifest: names, pullRequest: prJobs, pages: pageJobs, limitsSeconds: { core: 900, plan: 600, generatorGroup: 1800, player: 900, browser: 1800 },
    generatorGroups: groups, player: { projectionSeconds: playerProjection, projectedSeconds: projected, limitSeconds: playerLimit,
      helperConstant: 'generator-quick.js PLAYER_JOB_SECONDS = 900', selftest: 'generator-quick.selftest.js reads test-player timeout-minutes in both workflows' },
    triggers: { pullRequest: 'pull_request to main', pages: 'push to main and workflow_dispatch (not triggered by a PR)' },
    unchanged: ['timeouts', 'Node 24 / ubuntu-latest', 'no SG_TIME_FACTOR or SG_DEEP (the harness uses factor 3 on CI)', 'triggers and permissions', 'job membership'], problems: problems };
  if (out && problems.length === 0) writeNewJson(out, doc);
  return finish('workflow', problems, prJobs.length + ' PR jobs, ' + pageJobs.length + ' Pages jobs, Player ' + projected + '/' + playerLimit + ' s');
}

/** The required tokens: every stable item S-AV01..S-AV39 of the check-list (S-AV09, S-AV10, S-AV12 and S-AV13 have their own text in MS05b3's evidence) and S-OD1..S-OD18 but 5. */
function requiredTokens() {
  const sav = Array.from({ length: 39 }, (_, i) => i + 1)
    .map((n) => 'S-AV' + String(n).padStart(2, '0'));
  const sod = Array.from({ length: 18 }, (_, i) => i + 1).filter((n) => n !== 5).map((n) => 'S-OD' + n);
  return sav.concat(sod, ['R6C-I01', 'R6C-I02', 'R6C-I04', 'IR21', 'IR22', 'MS05r6a-COV01', 'IR17']);
}

/**
 * `items --register <MS18d register> --input <json> [--patch <json>] [--out <json>]`: the accepted 30-item MS18d register extended, not replaced:
 * every inherited item verbatim with its E3 disposition, the items added at E3, and a check that every stable ID, every held row
 * and every named obligation is carried by at least one item. A patch (removeAdded ids, replaceAdded items, added items, inherited e3
 * overrides, heldRows) revises an earlier input without rewriting it; both files are hashed into the output.
 */
function items(argv) {
  const out = arg('--out', argv);
  const problems = [];
  const bad = (ok, text) => { if (!ok) problems.push(text); };
  const register = readJson(arg('--register', argv));
  const input = readJson(arg('--input', argv));
  const patchRel = arg('--patch', argv);
  const patch = patchRel ? readJson(patchRel) : {};
  let addedSource = (input.added || []).slice();
  (patch.removeAdded || []).forEach((id) => {
    const before = addedSource.length;
    addedSource = addedSource.filter((i) => i.id !== id);
    bad(addedSource.length === before - 1, 'patch removeAdded: no added item ' + id);
  });
  (patch.replaceAdded || []).forEach((item) => {
    const k = addedSource.findIndex((i) => i.id === item.id);
    bad(k !== -1, 'patch replaceAdded: no added item ' + item.id);
    if (k !== -1) addedSource[k] = item;
  });
  addedSource = addedSource.concat(patch.added || []);
  const inheritedE3 = Object.assign({}, input.inherited || {}, patch.inherited || {});
  const heldRows = patch.heldRows || input.heldRows || [];
  bad(Array.isArray(register.items) && register.items.length === 30, 'the MS18d register does not have 30 items');
  const inherited = register.items.map((item) => {
    const e3 = inheritedE3[item.id];
    bad(e3 && e3.status && e3.disposition && Array.isArray(e3.evidence) && e3.evidence.length > 0, 'inherited item without a complete E3 disposition: ' + item.id);
    return Object.assign({ origin: 'MS18d Phase D register (item-register.json, 30 items), verbatim' }, item, { e3: e3 || null });
  });
  Object.keys(inheritedE3).forEach((id) => bad(register.items.some((i) => i.id === id), 'E3 disposition for an unknown inherited item: ' + id));
  const added = addedSource.map((item) => {
    ['id', 'title', 'status', 'source', 'population', 'numbers', 'limitations', 'disposition', 'nextOwner', 'evidence'].forEach((f) => bad(item[f] !== undefined && item[f] !== '', 'added item ' + item.id + ' lacks ' + f));
    return Object.assign({ origin: 'added at MS18e' }, item);
  });
  const all = inherited.concat(added);
  const seen = new Set();
  all.forEach((i) => { bad(!seen.has(i.id), 'duplicate item id ' + i.id); seen.add(i.id); });
  const carried = (token) => {
    const re = new RegExp(token + '(?!\\d)');
    const inList = (list) => (list || []).some((x) => re.test(x));
    return all.filter((i) => re.test(i.id) || inList(i.covers) || (i.e3 && inList(i.e3.covers))).map((i) => i.id);
  };
  const coverage = {};
  requiredTokens().forEach((t) => {
    coverage[t] = carried(t);
    bad(coverage[t].length > 0, 'no item carries ' + t);
  });
  (input.requiredIds || []).forEach((id) => bad(seen.has(id), 'required item missing: ' + id));
  const exists = (p) => [p, EVIDENCE + '/' + p].some((c) => fs.existsSync(path.resolve(ROOT, c)));
  all.forEach((i) => (i.e3 ? i.e3.evidence : (i.evidence || [])).forEach((p) => bad(exists(p), 'evidence path does not exist (item ' + i.id + '): ' + p)));
  heldRows.forEach((h) => bad(all.some((i) => (i.heldRows || []).indexOf(h.row) !== -1 && /MS18e-Q-/.test(JSON.stringify(i))), 'held row ' + h.row + ' is not named with its owner question in an item'));
  const fileOf = (rel) => ({ file: rel, sha256: sha256(fs.readFileSync(path.resolve(ROOT, rel))) });
  const doc = { schema: 'ms18e-items-v1', base: 'the accepted 30-item MS18d Phase D register is extended, not replaced: inherited items keep every original field and add `e3`',
    sources: Object.assign({ register: fileOf(arg('--register', argv)), input: fileOf(arg('--input', argv)) }, patchRel ? { patch: fileOf(patchRel) } : {}),
    revision: patch.revision || null,
    counts: { inherited: inherited.length, added: added.length, total: all.length }, requiredTokenCoverage: coverage, heldRows: heldRows, items: all, problems: problems };
  if (out && problems.length === 0) writeNewJson(out, doc);
  return finish('items', problems, inherited.length + ' inherited + ' + added.length + ' added = ' + all.length + ' items; ' + Object.keys(coverage).length + ' tokens carried');
}

const mode = process.argv[2];
if (mode === 'workflow') process.exitCode = workflowAudit(process.argv.slice(3));
else if (mode === 'items') process.exitCode = items(process.argv.slice(3));
else if (mode === 'coverage') process.exitCode = coverage(process.argv.slice(3));
else if (mode === 'cost') process.exitCode = cost(process.argv.slice(3));
else if (mode === 'bindings') process.exitCode = bindings(process.argv.slice(3));
else if (mode === 'scan') process.exitCode = scan(process.argv.slice(3));
else if (mode === 'format') process.exitCode = format(process.argv.slice(3));
else if (mode === 'crlf') process.exitCode = crlf(process.argv.slice(3));
else if (mode === 'plan') process.exitCode = plan(process.argv.slice(3));
else if (mode === 'hashes') process.exitCode = hashes(process.argv.slice(3));
else if (mode === 'compat') process.exitCode = compat(process.argv.slice(3));
else { console.error('usage: audit.cjs scan|hashes|compat|plan|format|crlf|coverage|cost|bindings|workflow|items ...'); process.exitCode = 2; }
