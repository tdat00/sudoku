'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');

process.chdir(__dirname);
// Copied into the repository (docs/difficulty-rating/gpt-6-astra/evidence): the repository root is four levels up,
// the generator is `generator/` and the player `player/` in it.
const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const ROOT = path.join(REPO, 'generator');
const PLAYER = path.join(REPO, 'player');
const runner = fs.readFileSync(path.join(ROOT, 'tests', 'node-runner.js'), 'utf8');
const sourceFiles = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1]
  .match(/'[^']+'/g).map(s => s.slice(1, -1));
for (const file of sourceFiles) {
  const absolute = path.join(ROOT, file);
  if (fs.existsSync(absolute)) vm.runInThisContext(fs.readFileSync(absolute, 'utf8'), { filename: absolute });
}
const SG = globalThis.SG;
const Q = require(path.join(ROOT, 'tests', 'qualify.js'));
const mode = process.argv[2] || 'contracts';
const outputPrefix = process.env.SG_REVIEW_OUTPUT_PREFIX || 'implementation';
const output = { mode, node: process.version, cases: [] };
const sourceHash = crypto.createHash('sha256');
sourceFiles.filter(f => !/^js\/(ui|worker)\//.test(f)).forEach(f => {
  if (fs.existsSync(path.join(ROOT, f))) sourceHash.update(fs.readFileSync(path.join(ROOT, f)));
});
output.engineHash = sourceHash.digest('hex').slice(0, 16);

function record(name, details) {
  output.cases.push({ name, ...details });
  console.log(JSON.stringify(output.cases[output.cases.length - 1]));
}

function maskErrors(result) {
  return SG.symmetry.groups(result.model, result.config.symmetry)
    .filter(g => Array.from(g).some(c => Boolean(result.givens[c]) !== Boolean(result.givens[g[0]])))
    .map(g => Array.from(g));
}

function replayErrors(result) {
  const values = Int32Array.from(result.solution);
  let signs = null;
  const hidden = new Set();
  for (const entry of result.digLog) {
    if (entry.op === 'signs') signs = entry.signs;
    else if (entry.op === 'clear') values.fill(0);
    else if (entry.op === 'restart') values.set(result.solution);
    else if (entry.op === 'reveal') entry.cells.forEach(c => { values[c] = result.solution[c]; });
    else if (entry.op === 'accept') {
      if (typeof entry.sign === 'number') hidden.add(entry.sign);
      else entry.cells.forEach(c => { values[c] = 0; });
    }
  }
  const wrongValues = Array.from(values).flatMap((v, c) => v === result.givens[c] ? [] : [c]);
  let wrongSigns = false;
  if (signs) {
    const expected = signs.filter((_, i) => !hidden.has(i)).map(s => s.join(',')).sort();
    const actual = result.model.inequalities.map(s => [s.a, s.b].join(',')).sort();
    wrongSigns = JSON.stringify(expected) !== JSON.stringify(actual);
  }
  const built = SG.player.buildSteps(result);
  const markedButFilled = [];
  const revealAlreadyVisible = [];
  const snapshotClueMismatch = [];
  built.steps.forEach((step, index) => {
    const actualClues = Array.from(step.values).filter(Boolean).length;
    if (step.metrics && step.metrics.clues !== actualClues) {
      snapshotClueMismatch.push({ index: step.index, kind: step.kind, actualClues,
        metricsClues: step.metrics.clues });
    }
    if (step.kind === 'reveal' && index > 0) {
      for (const c of step.marks.revealed) {
        if (built.steps[index - 1].values[c] !== 0) {
          revealAlreadyVisible.push({ index: step.index, precedingKind: built.steps[index - 1].kind, cell: c });
        }
      }
    }
    if (step.kind !== 'guided' && step.kind !== 'random') return;
    for (const c of step.marks.dug) {
      if (step.values[c] !== 0) markedButFilled.push({ index: step.index, kind: step.kind, cell: c });
    }
  });
  return { wrongValues, wrongSigns, markedButFilled, revealAlreadyVisible, snapshotClueMismatch };
}

function cageErrors(result) {
  const model = result.model;
  const seen = new Set();
  const errors = [];
  model.cages.forEach((cage, i) => {
    const cells = Array.from(cage.cells);
    if (cells.length < 2) errors.push(['short', i]);
    if (new Set(cells.map(c => result.solution[c])).size !== cells.length) errors.push(['digits', i]);
    if (cells.reduce((s, c) => s + result.solution[c], 0) !== cage.sum) errors.push(['sum', i]);
    const reached = new Set([cells[0]]);
    for (;;) {
      const oldSize = reached.size;
      cells.forEach(c => {
        if (cells.some(d => reached.has(d) &&
          Math.abs(model.layout.cellRow[c] - model.layout.cellRow[d]) +
          Math.abs(model.layout.cellCol[c] - model.layout.cellCol[d]) === 1)) reached.add(c);
      });
      if (oldSize === reached.size) break;
    }
    if (reached.size !== cells.length) errors.push(['disconnected', i]);
    cells.forEach(c => { if (seen.has(c)) errors.push(['duplicate', c]); seen.add(c); });
  });
  if (model.cages.length && seen.size !== model.cellCount) errors.push(['partition', seen.size]);
  return errors;
}

function generate(config) {
  const started = performance.now();
  const result = SG.pipeline.run({ trace: 'off', ...config }, null, SG.budget.create({ ms: 120000 }));
  const generationMs = performance.now() - started;
  const table = SG.difficulty.scoreTable(result.rating.techniqueCounts, result.rating.empties);
  return {
    result,
    evidence: {
      config, generationMs, achieved: result.rating.level, score: result.rating.score,
      complete: result.rating.solved, warnings: result.warnings,
      unique: SG.dfs.countSolutions(result.model, result.givens, 2) === 1,
      validSolution: SG.model.isSolution(result.model, result.solution),
      matchingGivens: Array.from(result.givens).every((v, c) => v === 0 || v === result.solution[c]),
      maskErrors: maskErrors(result), replayErrors: replayErrors(result), cageErrors: cageErrors(result),
      rowTotal: table.rows.reduce((s, r) => s + r.total, table.emptyTotal),
      revealCount: result.digLog.filter(e => e.op === 'reveal').length
    }
  };
}

if (mode === 'contracts') {
  const a = SG.pipeline.run({ variantId: 'classic9', difficulty: 'veryEasy', seed: 1, trace: 'off' });
  const synthetic = Object.assign({}, a, {
    givens: Int32Array.from(a.solution),
    digLog: [
      { op: 'pass', pass: 'random', clues: 81 },
      { op: 'accept', cells: [0, 80] },
      { op: 'reveal', cells: [0, 80] }
    ]
  });
  record('reveal-flush-order', {
    steps: SG.player.buildSteps(synthetic).steps.filter(s => s.kind === 'random' || s.kind === 'reveal')
      .map(s => ({ kind: s.kind, values: [s.values[0], s.values[80]], marks: s.marks, args: s.args }))
  });
  const ties = [['nakedQuad', 'ruleOf45'], ['jellyfish', 'cageSplit'], ['ineqChain', 'pointing']];
  record('tie-rule', { ties: ties.map(ids => ({
    ids, hardest: SG.difficulty.breakdown(Object.fromEntries(ids.map(id => [id, 1])), 10).hardest
  })) });
  const examples = [
    [{}, 0], [{}, 81],
    [{ nakedSingle: 29, hiddenSingleBox: 19, hiddenSingleLine: 5, pointing: 5, nakedPair: 1, xWing: 1 }, 53]
  ];
  record('score-examples', { tables: examples.map(([counts, empties]) =>
    SG.difficulty.scoreTable(counts, empties)) });
  let failures = 0;
  const random = SG.rng.create(2060619);
  const ids = Object.keys(SG.difficulty.WEIGHTS);
  for (let i = 0; i < 10000; i++) {
    const counts = Object.fromEntries(ids.filter(() => random.next() < 0.2)
      .map(id => [id, random.int(370)]));
    const e = random.int(370);
    const t = SG.difficulty.scoreTable(counts, e);
    if (t.rows.reduce((s, r) => s + r.total, t.emptyTotal) !== t.total) failures++;
  }
  record('apportionment', { n: 10000, seed: 2060619, failures });
  const locales = {};
  for (const language of ['en', 'vi']) {
    const sandbox = { SG: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(PLAYER, 'js', 'ui', `locale.${language}.js`), 'utf8'), sandbox);
    locales[language] = SG.difficulty.LEVELS.flatMap(level => ['', '.desc'].flatMap(suffix => {
      const key = 'difficulty.' + level + suffix;
      return SG.locales[language][key] === sandbox.SG.locales[language][key] ? [] : [{
        key, generator: SG.locales[language][key], player: sandbox.SG.locales[language][key]
      }];
    }));
  }
  record('player-locale-parity', { mismatches: locales });
  record('support-lists', { support: Object.fromEntries(SG.variants.list()
    .map(d => [d.id, d.difficultySupport])) });
  for (const variantId of ['classic4', 'classic6']) {
    try {
      const r = SG.pipeline.run({ variantId, seed: 1, trace: 'off' });
      record('omitted-difficulty-' + variantId, { achieved: r.rating.level });
    } catch (error) {
      record('omitted-difficulty-' + variantId, { error: error.code, args: error.args });
    }
  }
} else if (mode === 'generation') {
  const pairs = [
    ['classic4', 'veryEasy'], ['classic6', 'hard'], ['classic9', 'nightmare1'],
    ['mega12', 'veryEasy'], ['mega16', 'veryEasy'], ['mega16', 'evil'],
    ['mega16', 'nightmare1'], ['mega16', 'nightmare2'], ['diagonalX', 'nightmare2'],
    ['hyper', 'nightmare2'], ['jigsaw9', 'nightmare2'], ['killer', 'veryHard'],
    ['killer', 'expert'], ['killer', 'evil'], ['killer', 'nightmare2'],
    ['greaterThan', 'veryHard'], ['greaterThan', 'nightmare2'],
    ['samurai', 'veryEasy'], ['samurai', 'evil'], ['sohei', 'nightmare2'],
    ['butterfly', 'nightmare2'], ['flower', 'nightmare2'], ['wordoku', 'nightmare1']
  ];
  for (const [variantId, difficulty] of pairs) {
    const config = { variantId, difficulty, seed: Q.seedFor(`${variantId}/${difficulty}/0`) };
    const { result, evidence } = generate(config);
    if (['killer', 'mega16', 'greaterThan'].includes(variantId)) {
      const again = generate(config).result;
      evidence.deterministic = JSON.stringify({
        givens: Array.from(result.givens), solution: Array.from(result.solution),
        cages: result.model.cages, signs: result.model.inequalities, rating: result.rating, log: result.digLog
      }) === JSON.stringify({
        givens: Array.from(again.givens), solution: Array.from(again.solution),
        cages: again.model.cages, signs: again.model.inequalities, rating: again.rating, log: again.digLog
      });
    }
    record(`${variantId}/${difficulty}`, evidence);
  }
  for (const variantId of ['killer', 'wordoku', 'greaterThan']) {
    for (const symmetry of ['mirrorBoth', 'diagonal']) {
      record(`${variantId}/expert/${symmetry}`,
        generate({ variantId, difficulty: 'expert', symmetry, seed: 61843, maxAttempts: 2 }).evidence);
    }
  }
} else if (mode === 'caps' || mode === 'cap-boundary') {
  const cases = mode === 'cap-boundary' ? [['classic9', 'nightmare2']] : [
    ['classic9', 'nightmare2'], ['greaterThan', 'hard'], ['greaterThan', 'veryHard'], ['killer', 'veryHard']
  ];
  for (const [variantId, difficulty] of cases) {
    const def = SG.variants.get(variantId);
    const support = def.difficultySupport;
    def.difficultySupport = SG.difficulty.LEVELS.slice();
    const priorHook = def.postGenerate;
    const priorRate = SG.difficulty.rate;
    let cap;
    let rateCalls = 0;
    const callsAt = [];
    const hook = function (ctx) {
      cap = ctx.caps;
      if (mode === 'cap-boundary') cap.maxRatings = 20;
      return priorHook ? priorHook(ctx) : undefined;
    };
    def.postGenerate = hook;
    SG.difficulty.rate = function () {
      rateCalls++;
      callsAt.push(cap ? { ratings: cap.ratings, proposals: cap.proposals } : null);
      return priorRate.apply(this, arguments);
    };
    try {
      const { evidence } = generate({ variantId, difficulty, seed: Q.seedFor(`${variantId}/${difficulty}/0`),
        maxAttempts: 1 });
      record(`${variantId}/${difficulty}`, { ...evidence, cap, rateCalls,
        uncountedCalls: rateCalls - cap.ratings, lastRateCalls: callsAt.slice(-5) });
    } finally {
      def.postGenerate = priorHook;
      def.difficultySupport = support;
      SG.difficulty.rate = priorRate;
    }
  }
} else if (mode === 'replay') {
  const cases = JSON.parse(fs.readFileSync('implementation-generation.json', 'utf8')).cases;
  for (const c of cases.filter(c => c.revealCount > 0)) {
    const { evidence } = generate(c.config);
    record(c.name, evidence);
  }
} else if (mode === 'exchange') {
  const player = { console, TextEncoder, TextDecoder, setTimeout, clearTimeout, performance };
  vm.createContext(player);
  const list = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(
    fs.readFileSync(path.join(PLAYER, 'tests', 'node-runner.js'), 'utf8'))[1]
    .match(/'[^']+'/g).map(s => s.slice(1, -1));
  for (const file of list) {
    const absolute = path.join(PLAYER, file);
    if (fs.existsSync(absolute)) vm.runInContext(fs.readFileSync(absolute, 'utf8'), player, { filename: absolute });
  }
  for (const [variantId, difficulty] of [
    ['classic9', 'veryHard'], ['classic9', 'nightmare1'], ['killer', 'nightmare2'],
    ['greaterThan', 'nightmare2'], ['mega16', 'nightmare2']
  ]) {
    const result = SG.pipeline.run({
      variantId, difficulty, seed: Q.seedFor(`${variantId}/${difficulty}/0`), trace: 'off'
    });
    const document = SG.exportUi.toJson(result);
    player.input = JSON.stringify(document);
    const imported = vm.runInContext('SG.importer.openDocument(JSON.parse(input))', player);
    record(`${variantId}/${difficulty}`, {
      format: document.format, exportedDifficulty: document.difficulty,
      ok: imported.ok, errors: imported.errors,
      importedDifficulty: imported.ok ? imported.puzzle.info.difficulty : null,
      matchingGivens: imported.ok && JSON.stringify(Array.from(imported.puzzle.givens)) ===
        JSON.stringify(Array.from(result.givens))
    });
  }
} else if (mode === 'closest') {
  const cases = [];
  for (const file of ['implementation-qualified-classic6-hard.json', 'implementation-qualified-killer-veryHard.json']) {
    const cell = JSON.parse(fs.readFileSync(file, 'utf8')).cells[0];
    const miss = cell.requests.find(r => !r.hit);
    if (!miss) continue;
    cases.push({ variantId: cell.variant, difficulty: cell.level, seed: miss.seed });
  }
  cases.push({ variantId: 'killer', difficulty: 'expert', seed: 61843, symmetry: 'mirrorBoth', maxAttempts: 2 });
  cases.push({ variantId: 'killer', difficulty: 'expert', seed: 61843, symmetry: 'diagonal', maxAttempts: 2 });
  for (const config of cases) {
    const band = SG.difficulty.bandOf(config.difficulty);
    function distance(rating) {
      if (!rating.solved) return Infinity;
      const gap = Math.abs(SG.difficulty.levelIndex(rating.level) - SG.difficulty.levelIndex(config.difficulty));
      const off = rating.score < band.min ? (band.min - rating.score) / Math.max(band.min, 1)
        : rating.score >= band.max ? (rating.score - band.max) / band.max : 0;
      return gap * 1000 + off;
    }
    const rate = SG.difficulty.rate;
    let best = null;
    let bestModel = null;
    let calls = 0;
    SG.difficulty.rate = function (model, givens) {
      const rating = rate.apply(this, arguments);
      calls++;
      if (rating.solved && (!best || distance(rating) < best.distance)) {
        let unique = SG.difficulty.provesUniqueness(rating);
        if (!unique) {
          try { unique = SG.dfs.countSolutions(model, givens, 2, SG.budget.create({ nodes: 200000 })) === 1; }
          catch (error) { unique = false; }
        }
        if (unique) {
          bestModel = model;
          best = {
            call: calls, distance: distance(rating), rating,
            origin: new Error().stack.split('\n').slice(2, 7),
            givens: Array.from(givens),
            cages: model.cages.map(c => ({ cells: Array.from(c.cells), sum: c.sum, distinct: c.distinct })),
            signs: model.inequalities, unique,
            maskErrors: maskErrors({ model, givens, config: { symmetry: config.symmetry || 'rotational180' } })
          };
        }
      }
      return rating;
    };
    try {
      const { result, evidence } = generate(config);
      best.dfsSolutions = SG.dfs.countSolutions(bestModel, best.givens, 2);
      const solved = SG.dfs.solve(bestModel, best.givens);
      best.cageErrors = cageErrors({ model: bestModel, solution: solved });
      best.verifiedScore = rate(bestModel, best.givens).score;
      record(`${config.variantId}/${config.difficulty}/${config.symmetry || 'default'}`, {
        ...evidence, fullRatings: calls, returnedDistance: distance(result.rating), bestRatedCandidate: best
      });
    } finally {
      SG.difficulty.rate = rate;
    }
  }
} else if (mode === 'fallback-replay') {
  const config = { variantId: 'killer', difficulty: 'expert', seed: 61843,
    symmetry: 'diagonal', maxAttempts: 2, trace: 'off' };
  const { result, evidence } = generate(config);
  const built = SG.player.buildSteps(result);
  record('killer-layout-fallback-replay', {
    ...evidence,
    log: result.digLog,
    replaySteps: built.steps.map(s => ({ index: s.index, kind: s.kind, key: s.key,
      clues: Array.from(s.values).filter(Boolean).length, removed: s.marks.dug.length })),
    finalReplayEqualsPuzzle: JSON.stringify(Array.from(built.steps[built.steps.length - 1].values)) ===
      JSON.stringify(Array.from(result.givens))
  });
} else if (mode === 'keeper-safety') {
  const id = 'reviewKeeperGuesser';
  const ambiguous = new WeakMap();
  SG.difficulty.WEIGHTS[id] = 350;
  SG.techniques.register({
    id, group: 'basic', baseCost: 1, order: 5, i18nKey: 'technique.' + id,
    find(model, state, ctx) {
      const givens = Int32Array.from(state.value);
      if (!ambiguous.has(model)) {
        ambiguous.set(model, SG.dfs.countSolutions(model, givens, 2, ctx.budget) === 2);
      }
      if (!ambiguous.get(model)) return null;
      const cell = Array.from(givens).findIndex(value => value === 0);
      if (cell < 0) return null;
      const solved = SG.dfs.solve(model, givens, null, ctx.budget);
      if (!solved || (state.candidates[cell] & (1 << (solved[cell] - 1))) === 0) return null;
      return { technique: id, cells: [cell], placements: [[cell, solved[cell]]], eliminations: [],
        i18nKey: 'technique.' + id + '.step', i18nArgs: {} };
    }
  });
  try {
    for (const seed of [61843, 3680590658, 1]) {
      const config = { variantId: 'killer', difficulty: 'expert', seed, symmetry: 'diagonal',
        maxAttempts: 1, trace: 'off' };
      try {
        const result = SG.pipeline.run(config, null, SG.budget.create({ ms: 30000 }));
        const count = SG.dfs.countSolutions(result.model, result.givens, 2);
        record('keeper-technique-bug-safety', {
          config, score: result.rating.score, level: result.rating.level, warnings: result.warnings,
          dfsSolutions: count, usedGuesser: result.rating.techniqueCounts[id] || 0,
          solved: result.rating.solved, log: result.digLog
        });
        if (count !== 1) break;
      } catch (error) {
        record('keeper-technique-bug-safety', { config, error: error.code || error.message });
      }
    }
  } finally {
    SG.techniques.unregister(id);
    delete SG.difficulty.WEIGHTS[id];
  }
} else if (mode === 'fixtures') {
  const tree = childProcess.execFileSync('git',
    ['-C', ROOT, 'ls-tree', 'HEAD', '--', 'tests\\fixtures\\regression.js'], { encoding: 'utf8' });
  const blob = /^\d+ blob ([a-f0-9]+)/.exec(tree)[1];
  const before = childProcess.execFileSync('git', ['-C', ROOT, 'cat-file', 'blob', blob], { encoding: 'utf8' });
  const after = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'regression.js'), 'utf8');
  function load(code) {
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox.SG.fixtures.regression;
  }
  const a = load(before), b = load(after);
  record('regression-hash-diff', {
    seedsUnchanged: JSON.stringify(a.seeds) === JSON.stringify(b.seeds),
    removed: Object.keys(a.hashes).filter(key => !b.hashes[key]),
    added: Object.keys(b.hashes).filter(key => !a.hashes[key]),
    shared: Object.keys(b.hashes).filter(key => a.hashes[key]).map(key => ({
      key, n: b.hashes[key].length, unchanged: b.hashes[key].filter((hash, i) => hash === a.hashes[key][i]).length
    }))
  });
  const counts = { nakedSingle: 21, hiddenSingleBox: 14, nakedPair: 3, xWing: 1 };
  const score = SG.difficulty.scoreOf(counts, 54);
  record('design-json-example', {
    declaredScore: 612, actualScore: score, confidence: Math.min(score - 400, 700 - score) / 150
  });
  const hash = crypto.createHash('sha256');
  sourceFiles.filter(f => !/^js\/(ui|worker)\//.test(f)).forEach(file => {
    if (!fs.existsSync(path.join(ROOT, file))) return;
    let bytes = fs.readFileSync(path.join(ROOT, file));
    if (file === 'js/core/explain-data.js') {
      bytes = Buffer.from(bytes.toString('utf8').replace(
        'score <- the hardest technique in full, the rest of the work on a log scale, the empties',
        'score <- the sum of the technique costs'));
    }
    hash.update(bytes);
  });
  record('qualification-fingerprint-provenance', {
    current: output.engineHash, published: 'f67c9276d07d0070',
    withOnlyOldExplainComment: hash.digest('hex').slice(0, 16)
  });
} else if (mode === 'rejections' || mode === 'rejections-high') {
  let runs = 0;
  let checks = 0;
  const high = mode === 'rejections-high';
  outer: for (let seed = 1; seed <= (high ? 10 : 30); seed++) {
    for (const variant of (high ? ['classic9', 'diagonalX', 'hyper'] : ['classic9'])) {
    for (const level of (high ? ['expert', 'evil', 'nightmare1'] : ['medium', 'hard', 'veryHard'])) {
      const rng = SG.rng.create(seed);
      const model = SG.variants.get(variant).build({}, rng.fork('build'));
      const spec = SG.difficulty.spec(level, model);
      const solution = SG.fullGrid.generate(model, rng.fork('grid#1'), null);
      const log = [];
      SG.digger.digStage(model, solution, level, rng.fork('dig#1.1'), {
        log, budget: SG.budget.create({ ms: 120000 }), spec
      });
      runs++;
      const values = Int32Array.from(solution);
      const refused = new Map();
      for (const entry of log) {
        if (entry.op === 'reject' && entry.reason === 'tooHard') {
          const trial = Int32Array.from(values);
          entry.cells.forEach(c => { trial[c] = 0; });
          refused.set(entry.cells.join(','), { cells: entry.cells, original: trial });
        } else if (entry.op === 'accept') {
          entry.cells.forEach(c => { values[c] = 0; });
          for (const previous of refused.values()) {
            const trial = Int32Array.from(values);
            previous.cells.forEach(c => { trial[c] = 0; });
            if (Array.from(trial).filter(Boolean).length < spec.minClues) continue;
            if (model.units.some(u => Array.from(u).filter(c => trial[c] !== 0).length < spec.minCluesPerUnit)) continue;
            checks++;
            const options = { allowedTechniques: spec.allowedTechniques, assumeUniqueness: false };
            const solved = SG.logicalSolver.solve(model, trial, options);
            if (!solved.solved) continue;
            const current = SG.difficulty.classify(solved, model);
            if (current.score >= spec.max) continue;
            const old = SG.difficulty.classify(SG.logicalSolver.solve(model, previous.original, options), model);
            record('tooHard-refusal-became-valid', {
              variant, seed, level, runs, checks, rejectedGroup: previous.cells, acceptedGroup: entry.cells,
              oldScore: old.score, newScore: current.score, maximum: spec.max,
              oldCounts: old.techniqueCounts, newCounts: current.techniqueCounts,
              originallyRejectedGivens: Array.from(previous.original), newlyAdmissibleGivens: Array.from(trial)
            });
            refused.delete(previous.cells.join(','));
            if (output.cases.length >= 3) break outer;
          }
        }
        }
      }
    }
  }
  record('scan-totals', { runs, checks });
} else {
  throw new Error('Unknown mode: ' + mode);
}

fs.writeFileSync(`${outputPrefix}-${mode}.json`, JSON.stringify(output, null, 2));
