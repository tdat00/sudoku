#!/usr/bin/env node
'use strict';

/*
 * Soak test and calibration tool for the difficulty system (design.md section 15.4; rating v2,
 * docs/difficulty-rating/report-detailed.md).
 *
 *   node tests/soak.js [--quick | --full] [--count=N] [--per-combo=N] [--seed=N] [--variant=id[,id]]
 *                      [--level=id[,id]] [--weights=JSON] [--bands=a,b,c,d,e,f,g,h,i] [--no-gate]
 *                      [--json=<file>] [--verbose] [--help]
 *
 * It generates puzzles for every (variant x difficulty) combination of the registered variants, checks the
 * invariants I1-I7 of design.md section 15.3 on every one of them, and prints
 *   - a confusion matrix per variant (requested level in the rows, achieved level in the columns),
 *   - the time per puzzle against the budget of design.md section 9.1,
 *   - a histogram of the scores, and which technique group the hardest technique of the puzzles of each
 *     level belongs to.
 * Variants with their own dig strategy or a postGenerate step (killer, greaterThan, wordoku) and those whose
 * board depends on the seed (jigsaw) are generated through SG.pipeline.run (one model per puzzle); the
 * others call SG.digger.generate on one model.
 * Invariant I5 (rating v2): every puzzle has a complete logical proof, and an exact one has its score in the
 * band of its level. Invariant I6 compares the clue count with `SG.difficulty.spec(level, model).minClues`,
 * which is the variant's own floor (`clueFloorScale` / `clueFloor` of its definition, see
 * js/engine/difficulty.js). The soak is not part of the normal test run (node tests/node-runner.js): it takes
 * a while and has no pass/fail per puzzle, only totals. Which levels a variant offers is decided by
 * `node tests/qualify.js`, not by this tool.
 *
 * Exit code: 0 when no invariant was violated, every level of classic9 reached a hit rate of at least 90%
 * and every other variant and level at least 80%; 1 otherwise; 2 for a usage error. `--no-gate` always
 * exits 0 (for calibration runs). The budget column is the p95 target of design.md section 9.1 (the same
 * table as tests/perf.js, tests/fixtures/perf-helper.js); `node tests/perf.js` measures it properly.
 *
 * Measuring a level a variant does not offer: `--variant=classic6 --level=master --include-unsupported`.
 *
 * Baseline diagnostics (difficulty v3, docs/difficulty-v3/baseline.md): `--json=<file>` (a path inside the
 * repository) adds, without changing how a puzzle is generated or what the sections above print, a ledger of
 * every request (schema 1: the puzzle or its error, the hits, the raw and the attainable position, the
 * counters of the generation) and a diagnostic summary after the text. The new solves, the reference floor of
 * the requested level (`SG.difficulty.certifyFloor`, after I1 proved uniqueness) and the final path rated
 * again with steps (chain lengths, Nishio depths), run only after every generation and every check of I1-I7
 * of this invocation has finished: the pre-MS04 subset finder keeps a check-spacing counter across solves,
 * so a solve in between could change a later puzzle. A request that fails stays in the denominators as an
 * error row; errors and invariant violations fail the diagnostics even with --no-gate, which only silences
 * the exit status. The helpers are in tests/fixtures/difficulty-diagnostics.js.
 *
 * Calibration workflow: change SG.difficulty.WEIGHTS / SG.difficulty.TABLE in js/engine/difficulty.js, run
 * this, read the matrix. `--weights='{"ruleOf45":145}'` and `--bands=0,45,180,400,700,1000,1500,2400,3600`
 * try a change without editing the file (they patch the tables for the run and are printed in the header).
 *
 * The source files are the ones listed in SOURCE_FILES of tests/node-runner.js (read from it, so the two
 * cannot drift apart); files that do not exist are skipped.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const crypto = require('crypto');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');

const USAGE = [
  'Usage: node tests/soak.js [options]',
  '',
  '  --quick            about 700 puzzles (20 per classic9 level, 5 per other combination)',
  '  --full             25 puzzles per (variant, level) combination, 100 per classic9 level',
  '                     (about 3,550 puzzles); same as --per-combo=25',
  '  --per-combo=N      N puzzles per (variant, level) combination (4N for each classic9 level)',
  '  --count=N          total number of puzzles (default 500), shared out over the combinations',
  '  --seed=N           base seed (default 20260101); every puzzle derives its own stream from it',
  '  --variant=a,b      only these variants (default: every registered variant)',
  '  --level=a,b        only these levels (default: every level a variant supports)',
  '  --include-unsupported  also run the levels a variant does NOT list in difficultySupport (to measure',
  '                     whether a level could be offered; those rows are marked with * and never gated)',
  '  --weights=JSON     override technique weights for this run, e.g. {"ruleOf45":145}',
  '  --bands=a,...,i    override the lower score bound of the nine bands for this run',
  '  --no-gate          never fail on the hit rate or on invariants (calibration runs)',
  '  --json=file        also diagnose every request (reference floor, positions, final path) and write the',
  '                     ledger of the run (schema 1) to this file, a path inside the repository',
  '  --verbose          list every invariant violation with its seed',
  '  --help             show this help'
].join('\n');

function parseArgs(argv) {
  const opts = {
    quick: false, count: 500, perCombo: 0, seed: 20260101, variants: null, levels: null, weights: null,
    bands: null, gate: true, verbose: false, help: false, includeUnsupported: false, json: null
  };
  for (const arg of argv) {
    let m;
    if (arg === '--quick') opts.quick = true;
    else if (arg === '--full') opts.perCombo = 25;
    else if ((m = /^--per-combo=(\d+)$/.exec(arg))) opts.perCombo = Math.max(1, parseInt(m[1], 10));
    else if (arg === '--no-gate') opts.gate = false;
    else if (arg === '--verbose') opts.verbose = true;
    else if (arg === '--include-unsupported') opts.includeUnsupported = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if ((m = /^--count=(\d+)$/.exec(arg))) opts.count = parseInt(m[1], 10);
    else if ((m = /^--seed=(\d+)$/.exec(arg))) opts.seed = parseInt(m[1], 10);
    else if ((m = /^--variant=(.+)$/.exec(arg))) opts.variants = m[1].split(',');
    else if ((m = /^--level=(.+)$/.exec(arg))) opts.levels = m[1].split(',');
    else if ((m = /^--weights=(.+)$/.exec(arg))) opts.weights = JSON.parse(m[1]);
    else if ((m = /^--bands=(.+)$/.exec(arg))) opts.bands = m[1].split(',').map(Number);
    else if ((m = /^--json=(.+)$/.exec(arg))) opts.json = m[1];
    else throw new Error('Unknown argument: ' + arg);
  }
  return opts;
}

/** Identity of the loaded sources, set by `loadSources`: { hash, files } (`sourceHash` of the ledger). */
let sourceIdentity = null;

function loadSources() {
  const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (!match) throw new Error('cannot find SOURCE_FILES in tests/node-runner.js');
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  // The hash covers the SOURCE_FILES that exist, in load order, as `<path>\0<text>` with LF line ends, so
  // that a CRLF and an LF checkout of the same commit agree.
  const hash = crypto.createHash('sha256');
  let loaded = 0;
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
    hash.update(rel + '\0' + text.replace(/\r\n/g, '\n'));
    loaded++;
    vm.runInThisContext(text, { filename: abs });
  }
  sourceIdentity = { hash: hash.digest('hex'), files: loaded };
  const helpers = ['tests/fixtures/perf-helper.js', 'tests/fixtures/difficulty-diagnostics.js'];
  for (const rel of helpers) {
    const helper = path.join(ROOT, rel);
    if (fs.existsSync(helper)) {
      vm.runInThisContext(fs.readFileSync(helper, 'utf8').replace(/^\uFEFF/, ''), { filename: helper });
    }
  }
  return globalThis.SG;
}

/** Combinations that carry more weight when the puzzles are shared out: classic9 is the one that is gated. */
const GATED_VARIANT = 'classic9';
/** Hit rate every other variant and level must reach; classic9 needs 0.9. */
const OTHER_MIN_HIT = 0.8;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function pad(text, width, left) {
  const s = String(text);
  if (s.length >= width) return s;
  return left ? s + ' '.repeat(width - s.length) : ' '.repeat(width - s.length) + s;
}

function fmtMs(ms) {
  return ms >= 100 ? ms.toFixed(0) : ms >= 10 ? ms.toFixed(1) : ms.toFixed(2);
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message + '\n\n' + USAGE);
    return 2;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  let jsonFile = null;
  if (opts.json !== null) {
    jsonFile = path.resolve(process.cwd(), opts.json);
    const inside = path.relative(REPO, jsonFile);
    if (inside === '' || inside.split(path.sep)[0] === '..' || path.isAbsolute(inside)) {
      console.error('--json needs a file inside the repository (' + REPO + ')\n\n' + USAGE);
      return 2;
    }
  }

  const SG = loadSources();
  const D = SG.difficulty;
  const LEVELS = D.LEVELS;
  if (opts.weights) Object.assign(D.WEIGHTS, opts.weights);
  if (opts.bands) {
    if (opts.bands.length !== LEVELS.length || opts.bands.some((v) => !isFinite(v))) {
      console.error('--bands needs ' + LEVELS.length + ' numbers\n\n' + USAGE);
      return 2;
    }
    opts.bands.forEach((v, i) => { D.TABLE[i].min = v; });
  }

  // ---- combinations ----------------------------------------------------------------------------
  const combos = [];
  for (const def of SG.variants.list()) {
    if (opts.variants && opts.variants.indexOf(def.id) === -1) continue;
    let model;
    try {
      model = def.build({}, SG.rng.create(opts.seed).fork('build:' + def.id));
    } catch (err) {
      console.log('skip ' + def.id + ': cannot build without options (' + err.message + ')');
      continue;
    }
    // A variant with its own dig strategy or a postGenerate step (killer, greaterThan, wordoku ...) or a
    // `build(opts, rng)` that draws the board from the seed (jigsaw) is run through the pipeline, which
    // builds a model per puzzle; the others dig the one model directly.
    const viaPipeline = Boolean(def.digStrategy || def.postGenerate || def.build.length >= 2);
    const supported = def.difficultySupport.slice();
    if (opts.includeUnsupported) def.difficultySupport = LEVELS.slice();
    for (const level of LEVELS) {
      const unsupported = supported.indexOf(level) === -1;
      if (unsupported && !opts.includeUnsupported) continue;
      if (opts.levels && opts.levels.indexOf(level) === -1) continue;
      combos.push({
        id: def.id, level: level, model: model, viaPipeline: viaPipeline, unsupported: unsupported,
        weight: def.id === GATED_VARIANT ? 4 : 1
      });
    }
  }
  if (combos.length === 0) {
    console.error('nothing to do: no variant / level combination selected');
    return 2;
  }
  const totalWeight = combos.reduce((a, c) => a + c.weight, 0);
  for (const c of combos) {
    c.n = opts.quick ? (c.weight > 1 ? 20 : 5) : opts.perCombo ? opts.perCombo * c.weight :
      Math.max(5, Math.round(opts.count * c.weight / totalWeight));
  }
  const total = combos.reduce((a, c) => a + c.n, 0);

  // ---- diagnostics (--json) --------------------------------------------------------------------
  const diag = jsonFile !== null;
  const diagnostics = diag ? SG.fixtures.difficultyDiagnostics : null;
  const ledgerRows = [];
  const entries = [];
  const checkErrors = [];
  let requestErrors = 0;
  const meta = diag ? metaOf(opts, combos, total, SG) : null;
  const diagEnv = {
    difficulty: D,
    makeBudget: (ms) => SG.budget.create({ ms: ms }),
    now: () => Number(process.hrtime.bigint()) / 1e6
  };

  // ---- run -------------------------------------------------------------------------------------
  const violations = { I1: [], I2: [], I3: [], I4: [], I5: [], I6: [], I7: [] };
  const base = SG.rng.create(opts.seed);
  const started = process.hrtime.bigint();
  const results = new Map();

  function note(invariant, combo, i, detail) {
    violations[invariant].push(combo.id + '/' + combo.level + '#' + i + ' ' + detail);
  }

  /** A uint32 seed for the pipeline path, derived from the base seed and the puzzle's tag (FNV-1a). */
  function seedFor(tag) {
    let h = (2166136261 ^ opts.seed) >>> 0;
    for (let k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
    return h;
  }

  /** One puzzle of a combination, in the shape the checks below read. The same tag gives the same puzzle. */
  function generateOne(combo, tag) {
    if (!combo.viaPipeline) {
      const p = SG.digger.generate(combo.model, combo.level, base.fork(tag), {});
      return {
        model: p.model, givens: p.givens, solution: p.solution, clues: p.clues, achieved: p.achieved,
        exact: p.exact, rating: p.rating, samples: p.samples, warnings: p.warnings
      };
    }
    const r = SG.pipeline.run(
      { variantId: combo.id, difficulty: combo.level, seed: seedFor(tag), trace: 'off' }, null);
    let clues = 0;
    for (let c = 0; c < r.givens.length; c++) if (r.givens[c] !== 0) clues++;
    return {
      model: r.model, givens: r.givens, solution: r.solution, clues: clues, achieved: r.rating.level,
      exact: r.rating.level === combo.level, rating: r.rating, samples: r.attempts, warnings: r.warnings
    };
  }

  /** A diagnostic run records a check that throws and goes on; a plain run lets the error end it. */
  function guarded(stage, combo, i, fn) {
    if (!diag) return fn();
    try {
      return fn();
    } catch (err) {
      const e = diagnostics.errorOf(err);
      checkErrors.push(combo.id + '/' + combo.level + '#' + i + ' ' + stage + ' ' + e.code + ': ' +
        e.message);
      return undefined;
    }
  }

  /** Counts the calls of SG.difficulty.rate until stop(); a pass-through of arguments, result and errors. */
  function countRatings() {
    const real = D.rate;
    const counter = { calls: 0 };
    D.rate = function () {
      counter.calls++;
      return real.apply(this, arguments);
    };
    return { stop() { D.rate = real; return counter.calls; } };
  }

  function checksNow() {
    const invariantViolations = {};
    let invariantTotal = 0;
    Object.keys(violations).forEach((k) => {
      invariantViolations[k] = violations[k].length;
      invariantTotal += violations[k].length;
    });
    const count = (pick) => ledgerRows.filter(pick).length;
    const referenceErrors = count((r) => r.referenceStatus === 'error');
    const pathErrors = count((r) => r.pathCheck.status === 'error');
    const pathMismatches = count((r) => r.pathCheck.status === 'mismatch');
    const failures = requestErrors + checkErrors.length + invariantTotal;
    const incomplete = referenceErrors + pathErrors + pathMismatches;
    return {
      invariantViolations: invariantViolations, requestErrors: requestErrors,
      checkErrors: checkErrors.slice(), referenceErrors: referenceErrors, pathErrors: pathErrors,
      pathMismatches: pathMismatches,
      failed: failures > 0, result: failures > 0 ? 'FAIL' : incomplete > 0 ? 'INCOMPLETE' : 'PASS'
    };
  }

  /** Writes the ledger so far (to a neighbour file, then renamed): a run that stops leaves a whole file. */
  function writeLedger(complete) {
    if (!diag) return;
    const text = diagnostics.ledgerText(diagnostics.ledgerOf({
      complete: complete, meta: meta, rows: ledgerRows, checks: checksNow()
    }));
    const part = jsonFile + '.part';
    fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
    fs.writeFileSync(part, text, 'utf8');
    try {
      fs.renameSync(part, jsonFile);
    } catch (err) {
      fs.writeFileSync(jsonFile, text, 'utf8');
      fs.rmSync(part, { force: true });
    }
  }
  writeLedger(false);

  for (const combo of combos) {
    const rows = [];
    for (let i = 0; i < combo.n; i++) {
      const tag = combo.id + ':' + combo.level + ':' + i;
      const counter = diag ? countRatings() : null;
      const t0 = process.hrtime.bigint();
      let p;
      let failure = null;
      try {
        p = generateOne(combo, tag);
      } catch (err) {
        if (!diag) throw err;
        failure = err;
      }
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      const fullRatings = counter === null ? null : counter.stop();
      if (failure !== null) {
        // The request stays in every denominator as a miss; its checks need a puzzle and are not run.
        rows.push({ achieved: null, exact: false, ms: ms, score: null, solved: false, group: null, samples: 0,
          warnings: [] });
        requestErrors++;
        ledgerRows.push(diagnostics.rowOf({
          variant: combo.id, requested: combo.level, index: i, tag: tag,
          pipelineSeed: combo.viaPipeline ? seedFor(tag) : null, puzzle: null, error: failure,
          band: { min: 0, max: Infinity }, tierWeights: [], vacuous: false, generationMs: ms,
          fullRatings: fullRatings
        }));
        writeLedger(false);
        continue;
      }
      const model = p.model;
      const spec = D.spec(combo.level, model);
      rows.push({ achieved: p.achieved, exact: p.exact, ms: ms, score: p.rating.score,
        solved: p.rating.solved, group: p.rating.hardestGroup, samples: p.samples, warnings: p.warnings });

      // I1: exactly one solution (checked with the DFS alone).
      const solutions = guarded('I1', combo, i, () => SG.dfs.countSolutions(model, p.givens, 2));
      if (solutions !== undefined && solutions !== 1) note('I1', combo, i, 'not unique');
      // I2: the givens are a subset of the solution.
      for (let c = 0; c < model.cellCount; c++) {
        if (p.givens[c] !== 0 && p.givens[c] !== p.solution[c]) {
          note('I2', combo, i, 'cell ' + c + ' contradicts the solution');
          break;
        }
      }
      // I3: the solution satisfies every unit, cage and inequality.
      if (!SG.model.isSolution(model, p.solution)) note('I3', combo, i, 'solution is invalid');
      // I4: the same seed gives the same puzzle (every 5th puzzle is generated a second time).
      if (i % 5 === 0) {
        guarded('I4', combo, i, () => {
          const again = generateOne(combo, tag);
          if (Array.from(again.givens).join('') !== Array.from(p.givens).join('')) {
            note('I4', combo, i, 'differs');
          }
        });
      }
      // I5 (rating v2): every puzzle has a complete proof; an exact one has its score in the band.
      if (p.rating.solved !== true) note('I5', combo, i, 'no complete logical proof');
      if (p.exact) {
        guarded('I5', combo, i, () => {
          const r = D.rate(model, p.givens);
          const inBand = r.score >= spec.min && r.score < spec.max;
          if (!r.solved || !inBand || r.level !== combo.level) {
            note('I5', combo, i, 'score ' + r.score + ' hardest ' + r.hardestTechnique);
          }
        });
      }
      // I6: at least spec.minClues givens; the floor is the variant's own (`clueFloorScale` / `clueFloor`).
      if (p.clues < spec.minClues) note('I6', combo, i, p.clues + ' < ' + spec.minClues);
      // I7: every deduction of the full ladder on the way to the solution is sound.
      guarded('I7', combo, i, () => {
        const report = SG.logicalSolver.solve(model, p.givens, { collectSteps: true });
        for (const step of report.steps) {
          const bad = step.placements.some((pl) => p.solution[pl[0]] !== pl[1]) ||
            step.eliminations.some((el) => p.solution[el[0]] === el[1]);
          if (bad) {
            note('I7', combo, i, step.technique + ' is unsound');
            break;
          }
        }
      });
      if (p.warnings.indexOf('digger.unsoundTechnique') !== -1) {
        note('I7', combo, i, 'a technique made an ambiguous puzzle');
      }
      if (diag) {
        const row = diagnostics.rowOf({
          variant: combo.id, requested: combo.level, index: i, tag: tag,
          pipelineSeed: combo.viaPipeline ? seedFor(tag) : null,
          puzzle: { achieved: p.achieved, exact: p.exact, rating: p.rating },
          band: { min: spec.min, max: spec.max },
          tierWeights: spec.tierTechniques.map((id) => D.WEIGHTS[id]),
          vacuous: D.levelIndex(combo.level) === 0 || spec.tierTechniques.length === 0,
          puzzleHash: puzzleHashOf(p), generationMs: ms, fullRatings: fullRatings
        });
        ledgerRows.push(row);
        entries.push({
          row: row, model: model, givens: p.givens.slice(), rating: p.rating, requested: combo.level,
          unique: solutions === 1
        });
        writeLedger(false);
      }
    }
    results.set(combo, rows);
  }
  const wallS = Number(process.hrtime.bigint() - started) / 1e9;

  // The diagnostic solves, now that every generation and every check of I1-I7 has finished.
  const diagStarted = process.hrtime.bigint();
  for (const entry of entries) {
    diagnostics.diagnose(entry, diagEnv);
    writeLedger(false);
  }
  const diagS = Number(process.hrtime.bigint() - diagStarted) / 1e9;

  // ---- report ----------------------------------------------------------------------------------
  const out = [];
  out.push('Sudoku Generator soak test  (node ' + process.version + ', seed ' + opts.seed + ', ' + total +
    ' puzzles in ' + wallS.toFixed(1) + ' s' + (opts.quick ? ', --quick' : '') +
    (opts.perCombo && !opts.quick ? ', ' + opts.perCombo + ' per combination' : '') + ')');
  out.push('');
  out.push('Calibration in force (score bands, lower bound of each level, the same on every board):');
  out.push('  ' + LEVELS.map((l, i) => l + ' ' + D.TABLE[i].min).join(' | '));
  out.push('Technique weights: ' + Object.keys(D.WEIGHTS).map((id) => id + ' ' + D.WEIGHTS[id]).join(', '));
  if (opts.weights || opts.bands) out.push('(overridden on the command line for this run)');

  const hitRates = {};
  const gatedRates = {};
  const variantsRun = [];
  combos.forEach((c) => { if (variantsRun.indexOf(c.id) === -1) variantsRun.push(c.id); });

  /** Width of a level column ('hell1' is ten characters). */
  const COL = 11;

  for (const id of variantsRun) {
    const mine = combos.filter((c) => c.id === id);
    out.push('');
    out.push('== ' + id + ' (' + mine[0].model.cellCount + ' cells) ==');
    const head = pad('requested', COL, true) + LEVELS.map((l) => pad(l, COL)).join('') + pad('n', 5) +
      pad('hit', 7) + pad('samples', 9) + pad('ms p50', 8) + pad('p95', 8) + pad('max', 8) +
      pad('budget', 8);
    out.push(head);
    let allHit = 0;
    let allN = 0;
    for (const c of mine) {
      const rows = results.get(c);
      const counts = {};
      rows.forEach((r) => {
        const key = r.achieved === null ? 'unrated' : r.achieved;
        counts[key] = (counts[key] || 0) + 1;
      });
      const hits = rows.filter((r) => r.exact).length;
      allHit += hits;
      allN += rows.length;
      const times = rows.map((r) => r.ms).sort((a, b) => a - b);
      const samples = rows.reduce((a, r) => a + r.samples, 0) / rows.length;
      const targets = SG.fixtures && SG.fixtures.perfTools ? SG.fixtures.perfTools.PERF_TARGETS : {};
      const budget = (targets[id] || {})[c.level];
      const p95 = percentile(times, 0.95);
      const flag = budget === undefined ? '' : p95 <= budget ? ' ok' : ' SLOW';
      const label = c.level + (c.unsupported ? '*' : '');
      out.push(pad(label, COL, true) + LEVELS.map((l) => pad(counts[l] || '.', COL)).join('') +
        pad(rows.length, 5) +
        pad((hits / rows.length * 100).toFixed(0) + '%', 7) + pad(samples.toFixed(1), 9) +
        pad(fmtMs(percentile(times, 0.5)), 8) + pad(fmtMs(p95), 8) + pad(fmtMs(times[times.length - 1]), 8) +
        pad(budget === undefined ? '-' : budget + flag, 8));
      hitRates[id + '/' + c.level] = hits / rows.length;
      if (!c.unsupported) gatedRates[id + '/' + c.level] = hits / rows.length;
    }
    out.push('exact: ' + allHit + ' of ' + allN + ' (' + (allHit / allN * 100).toFixed(1) + '%)');

    // The group of the hardest technique of the puzzles of each level (descriptive: the score sets levels).
    out.push('');
    out.push('group of the hardest technique per requested level (share of puzzles):');
    for (const c of mine) {
      const rows = results.get(c);
      const groups = {};
      rows.forEach((r) => { groups[r.group || 'none'] = (groups[r.group || 'none'] || 0) + 1; });
      out.push('  ' + pad(c.level, COL, true) + Object.keys(groups).sort().map((g) =>
        g + ' ' + (groups[g] / rows.length * 100).toFixed(0) + '%').join('  '));
    }
  }

  // Score histogram: the bands are the same on every board, so the scores are binned as they are.
  const edges = D.TABLE.map((row) => row.min).concat([5400])
    .filter((v, i, a) => i === 0 || v > a[i - 1]);
  const labels = edges.map((e, i) => (i + 1 < edges.length ? e + '-' + edges[i + 1] : e + '+'));
  out.push('');
  out.push('Score histogram (the bands of every board), all puzzles, by requested level:');
  out.push(pad('bin', 12, true) + combosByLevelHeader(LEVELS, COL) + '   all');
  const hist = labels.map(() => ({ all: 0 }));
  LEVELS.forEach((l) => hist.forEach((h) => { h[l] = 0; }));
  for (const c of combos) {
    results.get(c).forEach((r) => {
      if (typeof r.score !== 'number') return;
      let b = 0;
      for (let k = 0; k < edges.length; k++) if (r.score >= edges[k]) b = k;
      hist[b][c.level]++;
      hist[b].all++;
    });
  }
  const maxAll = Math.max.apply(null, hist.map((h) => h.all).concat([1]));
  hist.forEach((h, k) => {
    out.push(pad(labels[k], 12, true) + LEVELS.map((l) => pad(h[l] || '.', COL)).join('') + '  ' +
      pad(h.all, 5) + ' ' +
      '#'.repeat(Math.round(30 * h.all / maxAll)));
  });

  // Invariants.
  out.push('');
  out.push('Invariants over ' + total + ' puzzles:');
  let failed = 0;
  Object.keys(violations).forEach((k) => {
    failed += violations[k].length;
    out.push('  ' + k + ' ' + (violations[k].length === 0 ? 'ok' : violations[k].length + ' VIOLATIONS'));
    if (violations[k].length > 0) {
      violations[k].slice(0, opts.verbose ? 1000 : 3).forEach((line) => out.push('      ' + line));
    }
  });

  // Gate.
  const gated = LEVELS.filter((l) => hitRates[GATED_VARIANT + '/' + l] !== undefined);
  const lowLevels = gated.filter((l) => hitRates[GATED_VARIANT + '/' + l] < 0.9);
  out.push('');
  if (gated.length > 0) {
    out.push('classic9 hit rate per level: ' + gated.map((l) => l + ' ' +
      (hitRates[GATED_VARIANT + '/' + l] * 100).toFixed(0) +
      '%').join(', '));
  }
  const zero = Object.keys(hitRates).filter((k) => hitRates[k] === 0);
  if (zero.length > 0) out.push('NOTE levels that were never hit: ' + zero.join(', '));
  const lowOthers = Object.keys(gatedRates).filter((k) =>
    k.split('/')[0] !== GATED_VARIANT && gatedRates[k] < OTHER_MIN_HIT);
  const others = Object.keys(gatedRates).filter((k) => k.split('/')[0] !== GATED_VARIANT);
  if (others.length > 0) {
    const worst = others.reduce((a, k) => (gatedRates[k] < gatedRates[a] ? k : a), others[0]);
    out.push('other variants: lowest hit rate ' + (gatedRates[worst] * 100).toFixed(0) + '% (' + worst +
      '), required at least ' + OTHER_MIN_HIT * 100 + '%');
  }
  const ok = failed === 0 && lowLevels.length === 0 && lowOthers.length === 0;
  out.push(ok ? 'RESULT: PASS' : 'RESULT: FAIL' + (failed > 0 ? ' (invariants)' : '') +
    (lowLevels.length > 0 ? ' (classic9 below 90%: ' + lowLevels.join(', ') + ')' : '') +
    (lowOthers.length > 0 ? ' (below ' + OTHER_MIN_HIT * 100 + '%: ' + lowOthers.join(', ') + ')' : ''));

  // Diagnostics: errors and invariant violations fail the report, even where --no-gate silences the exit.
  let diagFailed = false;
  if (diag) {
    const checks = checksNow();
    diagFailed = checks.requestErrors > 0 || checks.checkErrors.length > 0;
    const summary = diagnostics.ledgerOf({ complete: true, meta: meta, rows: ledgerRows, checks: checks })
      .summary;
    out.push('');
    out.push('Difficulty diagnostics (' + path.relative(REPO, jsonFile).split(path.sep).join('/') + '): ' +
      ledgerRows.length + ' of ' + total +
      ' requests recorded; the diagnostic solves took ' + diagS.toFixed(1) +
      ' s after the generation and the checks');
    diagnostics.summaryLines(summary).forEach((line) => out.push(line));
    out.push('');
    out.push('DIAGNOSTICS: ' + checks.result + ' (request errors ' + checks.requestErrors +
      ', invariant violations ' + failed + ', check errors ' + checks.checkErrors.length +
      ', reference errors ' + checks.referenceErrors + ', final-path errors ' + checks.pathErrors +
      ', final-path mismatches ' + checks.pathMismatches + ')');
    checks.checkErrors.slice(0, opts.verbose ? 1000 : 3).forEach((line) => out.push('      ' + line));
  }
  console.log(out.join('\n'));
  writeLedger(true);
  return (ok && !diagFailed) || !opts.gate ? 0 : 1;
}

function combosByLevelHeader(levels, width) {
  return levels.map((l) => pad(l, width)).join('');
}

/** Commit and working-tree state of the repository (evidence folder excluded); null without git. */
function gitState() {
  const git = (args) => childProcess.execFileSync('git', args, {
    cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true
  });
  try {
    const commit = git(['rev-parse', 'HEAD']).trim();
    const changed = git(['status', '--porcelain', '--', '.', ':(exclude)docs/difficulty-v3/evidence'])
      .split(/\r?\n/).filter((line) => line !== '');
    return { commit: commit, dirty: changed.length > 0, dirtyFiles: changed.slice(0, 50) };
  } catch (err) {
    return { commit: null, dirty: null, dirtyFiles: [] };
  }
}

function machineInfo() {
  const cpus = os.cpus();
  return {
    platform: os.platform(), release: os.release(), arch: os.arch(),
    cpuModel: cpus.length > 0 ? cpus[0].model.trim() : null, cpus: cpus.length,
    memoryGiB: Math.round(os.totalmem() / 2 ** 30 * 10) / 10
  };
}

/** The `meta` of the ledger: source identity, state, machine, command line and the manifest of the run. */
function metaOf(opts, combos, total, SG) {
  const git = gitState();
  return {
    sourceHash: sourceIdentity.hash,
    sourceFiles: sourceIdentity.files,
    commit: git.commit,
    dirty: git.dirty,
    dirtyFiles: git.dirtyFiles,
    startedAt: new Date().toISOString(),
    node: process.version,
    machine: machineInfo(),
    argv: process.argv.slice(2),
    seedBase: opts.seed,
    manifest: {
      requests: total,
      cells: combos.map((c) => ({
        variant: c.id, level: c.level, requests: c.n, route: c.viaPipeline ? 'pipeline' : 'direct',
        unsupported: c.unsupported
      })),
      count: opts.count, perCombo: opts.perCombo, quick: opts.quick,
      includeUnsupported: opts.includeUnsupported, weights: opts.weights, bands: opts.bands,
      gate: opts.gate, ratingVersion: SG.difficulty.RATING_VERSION,
      referenceBudgetMs: SG.fixtures.difficultyDiagnostics.REFERENCE_BUDGET_MS
    }
  };
}

/** Identity of a returned puzzle: givens, solution, regions, cages, signs and symbols. */
function puzzleHashOf(p) {
  const model = p.model;
  const join = (list) => Array.prototype.join.call(list, ',');
  const text = [
    'g:' + join(p.givens),
    's:' + join(p.solution),
    'r:' + join(model.layout.cellRegion),
    'c:' + model.cages.map((cage) => Array.prototype.join.call(cage.cells, '.') + '=' + cage.sum).join(';'),
    'q:' + model.inequalities.map((q) => q.a + '<' + q.b).join(';'),
    'y:' + (model.symbols && model.symbols.labels ? model.symbols.labels.join('') : '')
  ].join('|');
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

process.exitCode = main();
