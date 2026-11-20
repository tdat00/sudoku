#!/usr/bin/env node
'use strict';

/*
 * MS07e plan builder (execution record; it generates nothing and starts nothing): writes the plan files that
 * scripts/driver.ps1 runs, and the projection tables that plan.md quotes. From the repository root or generator/:
 *
 *   node make-plans.cjs gd-pilot                 plans/plan-gd-pilot.json
 *   node make-plans.cjs gd                       plans/plan-gd.json            (reads gd/pilot.json)
 *   node make-plans.cjs gd-confusion             plans/plan-gd-confusion.json  (reads the level results of gd/)
 *   node make-plans.cjs gg                       plans/plan-gg.json
 *   node make-plans.cjs pilot                    plans/plan-pilot.json + projections/prior.json
 *   node make-plans.cjs gq                       plans/plan-gq.json + projections/gq-projections.json|.md (reads pilot/)
 *
 * Projection rules (also in plan.md): see `gqProjection`.
 */
const fs = require('fs');
const path = require('path');

const EVIDENCE = path.resolve('Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e');
const REPO = path.resolve('Q:\\git\\sudoku');
const REL = '..\\docs\\difficulty-v3\\evidence\\MS07e\\';
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
const VARIANTS = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper', 'jigsaw9', 'killer',
  'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'];
// cell counts, default attempts (8 / 4 / 2 by <= 81 / <= 144 / > 144 cells) and p95 budgets (2 / 10 / 30 s)
const CELLS = { classic4: 16, classic6: 36, classic9: 81, mega12: 144, mega16: 256, diagonalX: 81, hyper: 81, jigsaw9: 81,
  killer: 81, greaterThan: 81, samurai: 369, sohei: 288, butterfly: 144, flower: 189, wordoku: 81 };
const attemptsOf = (n) => (n <= 81 ? 8 : n <= 144 ? 4 : 2);
const budgetOf = (n) => (n <= 36 ? 2 : n <= 81 ? 10 : 30);

// ---- the projection constants (stated in plan.md) -------------------------------------------------------------
const STARTUP_S = 8;          // parent start-up, four workers loading the sources, the final write
const F_PILOT = 1.5;          // margin on a current-source pilot mean (n >= 1 request of the cell's own seeds)
const F_STALE = 3.0;          // margin on a stale prior (MS05b3 / rating-v2 numbers)
const LAUNCH_MAX_S = 450;
const DIRECT_MAX_S = 150;     // a cell whose stale projection is within this runs without a pilot (3x error stays <= 450)
const EXCLUDE_UB = 0.55;      // expansion excluded when the 95 % upper bound of the hit rate is below this
const ROUNDS_FIRST = 10;      // 40 requests on 4 workers
const SERIAL_SECOND = 60;     // S-AV27: the second round runs on one worker

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/\r?\n/g, '\r\n'), 'utf8');
}

function writePlan(name, items) {
  writeText(path.join(EVIDENCE, 'plans', name), JSON.stringify(items, null, 2) + '\n');
  console.log('plans\\' + name + ': ' + items.length + ' items');
}

function binomCdf(h, n, p) {
  if (p <= 0) return 1;
  if (p >= 1) return h >= n ? 1 : 0;
  let term = Math.pow(1 - p, n);
  let sum = term;
  for (let k = 1; k <= h; k++) {
    term *= ((n - k + 1) / k) * (p / (1 - p));
    sum += term;
  }
  return Math.min(1, sum);
}

/** One-sided exact (Clopper-Pearson) 95 % upper bound of a hit rate: the p with P(X <= h | n, p) = 0.05. */
function upperBound(h, n) {
  if (n === 0) return 1;
  if (h >= n) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (binomCdf(h, n, mid) > 0.05) lo = mid; else hi = mid;
  }
  return hi;
}

// ---- GD ------------------------------------------------------------------------------------------------------
const GD_LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1'];
const GD_COUNT = { hell1: 20 };
const GD_GROUPS = [
  { id: 'levels', name: 'difficulty: levels', tests: 4, r6bSeconds: 0.415 },
  { id: 'spec9', name: 'difficulty: spec(level, model) on a 9x9 board', tests: 8, r6bSeconds: 0.393 },
  { id: 'spec-other', name: 'difficulty: spec on other boards, and difficultySupport', tests: 4, r6bSeconds: 0.406 },
  { id: 'qualification', name: 'qualification: tests/qualify.js counts every request (Node only, fake workers)', tests: 6,
    r6bSeconds: 3.763 },
  { id: 'clue-floor', name: 'difficulty: the clue floor of a variant (clueFloor)', tests: 9, r6bSeconds: 0.416 },
  { id: 'score-v2', name: 'difficulty: the score of rating v2', tests: 15, r6bSeconds: 0.514 },
  { id: 'score-table', name: 'difficulty: the Difficulty Score table (section 5.6)', tests: 4, r6bSeconds: 0.422 },
  { id: 'labelled', name: 'difficulty: labelled puzzles (fixtures/rated.js)', tests: 7, r6bSeconds: 1.183 },
  { id: 'removing', name: 'difficulty: removing a clue (the score is not monotone under clue removal, section 5.1)',
    tests: 2, r6bSeconds: 0.627 },
  { id: 'oracle', name: 'digger: technique-bounded oracle', tests: 7, r6bSeconds: 1.083 },
  { id: 'guarantees', name: 'digger.generate: guarantees', tests: 10, r6bSeconds: 52.17 },
  { id: 'cap', name: 'digger.generate: the full-rating cap of an attempt (section 5.7 (9))', tests: 5, r6bSeconds: 5.419 },
  { id: 'unreachable', name: 'digger.generate: when the level cannot be reached', tests: 5, r6bSeconds: 0.648 },
  { id: 'safety', name: 'digger.generate: safety net against a technique bug (risk R3)', tests: 3, r6bSeconds: 5.07 }
];

function gdItem(id, label, filter, suite, tests, projection, basis, listFile) {
  const results = REL + 'gd\\' + id + '.json';
  const runArgs = ['tests\\node-runner.js', '--suite=' + suite, '--filter=' + filter, '--verbose'];
  return {
    id: 'gd-' + id, phase: 'gd', label: label, args: runArgs.concat(['--results=' + results]),
    tee: REL + 'logs\\gd-' + id + '.txt', allowExit1: true, projectionSeconds: projection, projectionBasis: basis,
    launch: projection <= LAUNCH_MAX_S, reason: projection <= LAUNCH_MAX_S ? '' :
      'projection above 450 s: not launched (named unexecuted item, no ceiling raised, no count cut)',
    outputs: [results, REL + 'logs\\gd-' + id + '.txt'], failedDir: REL + 'gd-failed',
    preList: { args: ['tests\\node-runner.js', '--suite=' + suite, '--filter=' + filter,
      '--list-tests=' + REL + 'gd\\selectors\\' + id + '.json'], out: REL + 'gd\\selectors\\' + id + '.json',
      expectTotal: tests }
  };
}

function planGdPilot() {
  const out = REL + 'gd\\pilot.json';
  writePlan('plan-gd-pilot.json', [{
    id: 'gd-pilot', phase: 'gd-pilot', label: 'classic9 same-seed pilot (MS05r6b gd-pilot.cjs, unchanged)',
    args: ['tests\\artifacts\\difficulty-v3\\MS05r6b\\gd-pilot.cjs', '--json=' + out, '--count=8'],
    tee: REL + 'logs\\gd-pilot.txt', allowExit1: false, projectionSeconds: 150,
    projectionBasis: 'first 8 requests of each of the 8 offered levels, seeds 7000-7007, the exact call of batch(level): ' +
      'MS07c Hell 1 pilot 5.57 s mean x 8 = 45 s; Nightmare at the old source took 33 s (MS05r6b), now far less; the six ' +
      'other levels 7 s at MS05r6b; 150 s is a conservative bound',
    launch: true, reason: '', outputs: [out, REL + 'logs\\gd-pilot.txt']
  }]);
}

function planGd() {
  const pilot = readJson(path.join(EVIDENCE, 'gd', 'pilot.json'));
  const items = [];
  const order = ['nightmare', 'hell1', 'veryEasy', 'easy', 'normal', 'hard', 'expert', 'master'];
  const rows = [];
  order.forEach((level) => {
    const p = pilot.levels[level];
    const count = GD_COUNT[level] || 100;
    const meanS = p.meanMs / 1000;
    const projection = Math.ceil(10 + 2 * meanS * count);
    const basis = 'MEASURED same-seed pilot (gd/pilot.json, 8 requests, mean ' + p.meanMs.toFixed(1) + ' ms, max ' +
      p.maxMs.toFixed(1) + ' ms, ' + p.exact + ' of 8 exact) x ' + count + ' requests x 2 (conservative margin) + 10 s for the ' +
      'checks and the start-up = ' + projection + ' s';
    rows.push({ level: level, count: count, meanMs: p.meanMs, projection: projection });
    items.push(gdItem('classic9-' + level, 'classic9 ' + level + ' batch (' + count + ' requests)',
      'time) > ' + level + ' >', 'difficulty', 8, projection, basis));
  });
  GD_GROUPS.forEach((g) => {
    const projection = Math.ceil(10 + 2 * g.r6bSeconds);
    items.push(gdItem(g.id, g.name, 'difficulty > ' + g.name, 'difficulty', g.tests, projection,
      'MS05r6b actual ' + g.r6bSeconds + ' s (an older source, labelled) x 2 + 10 s = ' + projection + ' s'));
  });
  writeText(path.join(EVIDENCE, 'projections', 'gd-batches.json'), JSON.stringify(rows, null, 2) + '\n');
  writePlan('plan-gd.json', items);
}

function planGdConfusion() {
  const dir = path.join(EVIDENCE, 'gd');
  let sum = 0;
  const parts = [];
  GD_LEVELS.forEach((level) => {
    const result = readJson(path.join(dir, 'classic9-' + level + '.json'));
    const tests = [].concat.apply([], [].concat(result.results).map((r) => r.tests));
    const first = tests.find((t) => /hits the requested level/.test(t.fullName));
    const ms = first ? first.ms : 0;
    sum += ms / 1000;
    parts.push(level + ' ' + (ms / 1000).toFixed(1));
  });
  const projection = Math.ceil(10 + 1.25 * sum);
  const id = 'confusion-matrix';
  const item = gdItem(id, 'classic9 confusion matrix (reads the batches of all eight levels)', 'is a confusion matrix',
    'difficulty', 1, projection, 'MEASURED batch seconds of this run (first test of each level shard: ' + parts.join(', ') +
    ' = ' + sum.toFixed(1) + ' s; the batches are generated again in one process) x 1.25 + 10 s = ' + projection + ' s');
  writePlan('plan-gd-confusion.json', [item]);
}

function planGdCv6() {
  const id = 'greaterThan-nightmare-cv6';
  const filter = '> nightmare: 10 puzzles > CV6:';
  const item = gdItem(id, 'greaterThan Nightmare CV6 margin (existing selector, SA1 IR66 handoff)', filter, 'greater-than', 1,
    170, 'MS05b3 I5 greaterThan nightmare, 10 puzzles, 75.2 s at the old source (labelled) x 2 + 20 s = 170 s');
  writePlan('plan-gd-cv6.json', [item]);
}

// ---- GG ------------------------------------------------------------------------------------------------------
function planGg() {
  const old = readJson(path.join(REPO, 'generator', 'tests', 'artifacts', 'difficulty-v3', 'MS07c', 'plan-hashes.json'));
  const runs = fs.readFileSync(path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS07c', 'shard-runs.jsonl'), 'utf8')
    .split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const seconds = {};
  runs.forEach((r) => { if (/^g-hash-/.test(r.label)) seconds[r.label] = r.nodeSeconds; });
  const items = old.map((o) => {
    const out = o.args[4].replace(/evidence\\MS07c\\hashes\\/, 'evidence\\MS07e\\hashes\\');
    const measured = seconds[o.label];
    const projection = Math.ceil(2 * measured + 5);
    return {
      id: o.label.replace(/^g-hash-/, 'gg-'), phase: 'gg', label: o.label.replace(/^g-hash-/, ''),
      args: [o.args[0], o.args[1], o.args[2], o.args[3], out], tee: null, allowExit1: false,
      projectionSeconds: projection, projectionBasis: 'MEASURED at MS07c on the same 63 engine sources (' + measured +
        ' s node); 2 x + 5 s', launch: true, reason: '', outputs: [out.replace('--hash-record=', '')]
    };
  });
  writePlan('plan-gg.json', items);
}

// ---- GQ priors and projections ---------------------------------------------------------------------------------
function loadPriors() {
  const priors = {};
  VARIANTS.forEach((v) => LEVELS.forEach((l) => {
    priors[v + '/' + l] = { b3: null, v2p95Ms: null, v2p50Ms: null, hits: [] };
  }));
  const table = fs.readFileSync(path.join(REPO, 'docs', 'difficulty-rating', 'qualification.md'), 'utf8');
  table.split(/\r?\n/).forEach((line) => {
    const m = /^\| (\w+) \| (\w+) \| (\d+) \| (\d+) \| .*? \| ([\d.]+) (ms|s) \| ([\d.]+) (ms|s) \|/.exec(line);
    if (!m) return;
    const ms = (v, u) => Number(v) * (u === 's' ? 1000 : 1);
    const cell = priors[m[1] + '/' + m[2]];
    cell.v2p50Ms = ms(m[5], m[6]);
    cell.v2p95Ms = ms(m[7], m[8]);
    cell.v2 = { h: Number(m[4]), n: Number(m[3]) };
  });
  const b3 = readJson(path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS05b3', 'outcomes.json'));
  b3.outcomes.forEach((o) => {
    if (!o.requestMs || !o.level || !o.variantId) return;
    const cell = priors[o.variantId + '/' + o.level];
    if (!cell) return;
    const capped = o.requestMs.map((x) => Math.min(x, 120000));
    cell.b3 = cell.b3 || { ms: [] };
    cell.b3.ms = cell.b3.ms.concat(capped);
    if (o.class === 'availability-none-hit') cell.hits.push({ source: 'MS05b3 ' + o.id, h: 0, n: o.requests });
    else if (o.class === 'availability-hit-rate') {
      const m = /expected ([\d.]+) to be > ([\d.]+)/.exec((o.error && o.error.message) || '');
      if (m) {
        const got = Number(m[1]);
        // I5 hit rates of the wordoku cells are shares (0.75, 0.2), the others counts
        const h = got <= 1 && o.requests > 1 && Number(m[2]) < 1 ? Math.round(got * o.requests) : got;
        cell.hits.push({ source: 'MS05b3 ' + o.id, h: h, n: o.requests });
      }
    }
  });
  const add = (cell, source, h, n) => priors[cell].hits.push({ source: source, h: h, n: n });
  add('killer/hard', 'R5 selection (0/12 at every setting)', 0, 12);
  add('killer/expert', 'R5 selection (0/12 at every setting)', 0, 12);
  add('mega12/nightmare', 'MS05r5m deep records (old source, before the chain split)', 0, 7);
  add('mega16/nightmare', 'MS05r5m deep records (old source, before the chain split)', 0, 7);
  add('classic9/hell1', 'MS07b/MS07c pilots (C = 6 and C = 4)', 0, 4);
  add('mega12/hell1', 'MS07b deep records (C = 6)', 0, 7);
  add('mega16/hell1', 'MS07b deep records (C = 6)', 0, 7);
  Object.keys(priors).forEach((key) => {
    const p = priors[key];
    p.b3n = p.b3 ? p.b3.ms.length : 0;
    p.b3MeanMs = p.b3 ? p.b3.ms.reduce((a, b) => a + b, 0) / p.b3.ms.length : null;
    p.b3MaxMs = p.b3 ? Math.max.apply(null, p.b3.ms) : null;
    const sorted = p.b3 ? p.b3.ms.slice().sort((a, b) => a - b) : [];
    p.b3MedianMs = sorted.length > 0 ? sorted[sorted.length >> 1] : null;
    // a heavy tail in the old sample (at least 8 requests, the slowest at least 10 times the median): the old mean is
    // then a floor for the pilot, which cannot see a one-in-twenty request
    p.heavyTail = p.b3n >= 8 && p.b3MedianMs > 0 && p.b3MaxMs >= 10 * p.b3MedianMs;
  });
  return priors;
}

/** Stale planning mean in seconds of a cell: the MS05b3 mean (guard-capped), else the rating-v2 p95. */
function priorMean(key, priors) {
  const p = priors[key];
  const known = {
    'classic9/hell1': 5.565, 'mega12/hell1': 31.5, 'mega16/hell1': 110, 'classic9/nightmare': 0.6
  };
  if (known[key]) return { s: known[key], basis: 'MS07b/MS07c measurement (classic9 pilot mean at C = 4; mega deep records at ' +
    'C = 6; classic9 Nightmare window cell at C = 4 plus margin)' };
  const level = key.split('/')[1];
  let s;
  let basis;
  if (p.b3MeanMs !== null) {
    s = p.b3MeanMs / 1000;
    basis = 'MS05b3 mean of ' + p.b3n + ' requests (guard-capped, older source)';
  } else {
    s = p.v2p95Ms / 1000;
    basis = 'rating-v2 p95 (no MS05b3 request)';
  }
  if (level === 'hell1') {
    s *= 4;
    basis += ' x 4 (Hell 1 was vacuous before MS07b; classic9 went 1.38 -> 5.57 s)';
  }
  return { s: s, basis: basis };
}

function poolHits(key, priors, pilotCell) {
  let h = 0;
  let n = 0;
  const used = [];
  priors[key].hits.forEach((x) => { h += x.h; n += x.n; used.push(x.source + ' ' + x.h + '/' + x.n); });
  if (pilotCell && pilotCell.n > 0) {
    h += pilotCell.hits;
    n += pilotCell.n;
    used.push('MS07e pilot ' + pilotCell.hits + '/' + pilotCell.n);
  }
  return { h: h, n: n, ub: n > 0 ? upperBound(h, n) : 1, used: used };
}

/**
 * P = startup + f x m x (10 + 60 e): ten four-worker rounds of the first 40 requests, plus (when the cell may expand,
 * e = 1) the 60 second-round requests one after the other on one worker (S-AV27). No early stop is assumed.
 */
function gqProjection(key, priors, pilotCell) {
  const prior = priorMean(key, priors);
  const pooled = poolHits(key, priors, pilotCell);
  const v2 = priors[key].v2 || { h: 0, n: 0 };
  const v2ub = v2.n > 0 ? upperBound(v2.h, v2.n) : 1;
  const structural = /^classic4\/(?!veryEasy)/.test(key);
  // an excluded expansion needs a low hit rate in the pooled earlier evidence (or in the rating-v2 hits, a proxy that can only
  // be higher than a v3 exact hit rate under the old generator), and a pilot of this source that does not show a high rate
  const pilotLow = !pilotCell || pilotCell.n === 0 || pilotCell.hits * 2 <= pilotCell.n;
  const lowEvidence = (pooled.n >= 4 && pooled.ub < EXCLUDE_UB) || (v2.n >= 4 && v2ub < EXCLUDE_UB);
  const expansionExcluded = structural || (lowEvidence && pilotLow);
  const e = expansionExcluded ? 0 : 1;
  let m;
  let f;
  let basis;
  if (pilotCell && pilotCell.n > 0) {
    const pm = pilotCell.meanMs / 1000;
    const heavy = priors[key].heavyTail === true;
    m = heavy ? Math.max(pm, 0.5 * prior.s) : pm;
    f = F_PILOT;
    basis = 'pilot mean ' + pm.toFixed(3) + ' s (n ' + pilotCell.n + ')' + (heavy ? ' or half the stale prior ' + prior.s.toFixed(3) +
      ' s (heavy tail in the old sample), the larger' : '');
  } else {
    m = prior.s;
    f = F_STALE;
    basis = prior.basis + ': ' + prior.s.toFixed(3) + ' s';
  }
  const first = ROUNDS_FIRST * m;
  const second = SERIAL_SECOND * m * e;
  const P = STARTUP_S + f * (first + second);
  return { key: key, m: m, f: f, e: e, first: first, second: second, projection: P, basis: basis, prior: prior,
    pooled: pooled, v2: { h: v2.h, n: v2.n, ub: v2ub }, pilotLow: pilotLow, structural: structural };
}

function planPilot() {
  const priors = loadPriors();
  const rows = [];
  VARIANTS.forEach((v) => LEVELS.forEach((l) => {
    const key = v + '/' + l;
    const g = gqProjection(key, priors, null);
    const needs = g.projection > DIRECT_MAX_S || l === 'hell1' || priors[key].b3n === 0;
    const k = g.prior.s <= 3 ? 3 : g.prior.s <= 29 ? 2 : 1;
    rows.push({ key: key, variant: v, level: l, priorSeconds: g.prior.s, priorBasis: g.prior.basis, e: g.e,
      staleProjection: g.projection, pilot: needs && !g.structural, k: k });
  }));
  writeText(path.join(EVIDENCE, 'projections', 'prior.json'), JSON.stringify(rows, null, 2) + '\n');
  const commands = [];
  VARIANTS.forEach((v) => {
    let cur = null;
    rows.filter((r) => r.variant === v && r.pilot).forEach((r) => {
      const cost = r.k * r.priorSeconds;
      if (cur === null || cur.sum + cost > 280) {
        cur = { variant: v, cells: [], sum: 3 };
        commands.push(cur);
      }
      cur.cells.push(r);
      cur.sum += cost;
    });
  });
  const items = commands.map((c, i) => {
    const name = 'pilot-' + c.variant + (commands.filter((x) => x.variant === c.variant).length > 1 ?
      '-' + (commands.filter((x) => x.variant === c.variant).indexOf(c) + 1) : '');
    const out = REL + 'pilot\\' + name + '.json';
    const projection = Math.ceil(1.5 * c.sum + 5);
    return {
      id: name, phase: 'pilot', label: 'projection pilot ' + c.cells.map((r) => r.level + ':' + r.k).join(' ') + ' of ' + c.variant,
      args: ['Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e\\scripts\\pilot.cjs', '--json=' + out,
        '--cells=' + c.cells.map((r) => r.key + ':' + r.k).join(','), '--budget-seconds=420'],
      tee: REL + 'logs\\' + name + '.txt', allowExit1: false, projectionSeconds: projection,
      projectionBasis: 'stale priors (MS05b3 / rating-v2 / MS07b-c): sum of requests x prior mean = ' + (c.sum - 3).toFixed(1) +
        ' s, + 3 s start-up, x 1.5 + 5 s = ' + projection + ' s',
      launch: projection <= LAUNCH_MAX_S, reason: projection <= LAUNCH_MAX_S ? '' : 'pilot projection above 450 s',
      outputs: [out, REL + 'logs\\' + name + '.txt'], failedDir: REL + 'pilot-failed'
    };
  });
  writePlan('plan-pilot.json', items);
  console.log('pilot cells: ' + rows.filter((r) => r.pilot).length + ' of ' + rows.length + ' in ' + items.length + ' commands; ' +
    'direct (no pilot): ' + rows.filter((r) => !r.pilot).length);
}

function readPilots() {
  const cells = {};
  const dir = path.join(EVIDENCE, 'pilot');
  if (!fs.existsSync(dir)) return cells;
  fs.readdirSync(dir).filter((f) => /\.json$/.test(f)).forEach((f) => {
    const rec = readJson(path.join(dir, f));
    Object.keys(rec.cells).forEach((key) => {
      const c = rec.cells[key];
      if (!(c.n > 0)) return;
      const sum = c.meanMs * c.n;
      if (!cells[key]) cells[key] = { n: 0, hits: 0, sumMs: 0, maxMs: 0, files: [] };
      const t = cells[key];
      t.n += c.n; t.hits += c.hits; t.sumMs += sum; t.maxMs = Math.max(t.maxMs, c.maxMs); t.files.push(f);
    });
  });
  Object.keys(cells).forEach((key) => {
    cells[key].meanMs = cells[key].sumMs / cells[key].n;
    cells[key].file = cells[key].files.join('+');
  });
  return cells;
}

function planExt() {
  const priors = loadPriors();
  const pilots = readPilots();
  const cands = [];
  VARIANTS.forEach((v) => LEVELS.forEach((l) => {
    const key = v + '/' + l;
    const pc = pilots[key];
    if (!pc) return;
    const g = gqProjection(key, priors, pc);
    if (g.projection <= LAUNCH_MAX_S) return;
    // (a) a cell with no hit anywhere in its pooled evidence and fewer than 4 pooled requests can gain from more requests: with
    // 4 requests and no hit the 95 % upper bound of the hit rate is below 0.55 and the 60 serial requests drop out
    const zeroHit = g.pooled.h === 0 && g.pooled.n < 4 && pc.hits === 0 && STARTUP_S + F_PILOT * g.m * ROUNDS_FIRST <= LAUNCH_MAX_S;
    // (b) a cell just above the limit on one or two requests: a better mean (up or down) is worth two more requests
    const borderline = g.projection <= 700 && pc.n <= 2 && g.m <= 12;
    if (!zeroHit && !borderline) return;
    const want = zeroHit ? 4 - g.pooled.n : 4 - pc.n;
    cands.push({ key: key, variant: v, k: want, start: pc.n, cost: want * g.m, m: g.m, pooledN: g.pooled.n });
  }));
  const commands = [];
  VARIANTS.forEach((v) => {
    let cur = null;
    cands.filter((c) => c.variant === v).forEach((c) => {
      if (cur === null || cur.sum + c.cost > 280) {
        cur = { variant: v, cells: [], sum: 3 };
        commands.push(cur);
      }
      cur.cells.push(c);
      cur.sum += c.cost;
    });
  });
  const items = commands.map((c, i) => {
    const name = 'pilotx-' + c.variant + (commands.filter((x) => x.variant === c.variant).length > 1 ? '-' + (i + 1) : '');
    const out = REL + 'pilot\\' + name + '.json';
    const projection = Math.ceil(1.5 * c.sum + 5);
    return {
      id: name, phase: 'pilot', label: 'pilot extension (one more request so that 4 requests of the cell have no hit) ' +
        c.cells.map((x) => x.key + ':' + x.k + '@' + x.start).join(' '),
      args: ['Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e\\scripts\\pilot.cjs', '--json=' + out,
        '--cells=' + c.cells.map((x) => x.key + ':' + x.k + '@' + x.start).join(','), '--budget-seconds=420'],
      tee: REL + 'logs\\' + name + '.txt', allowExit1: false, projectionSeconds: projection,
      projectionBasis: 'pilot means of the same cells x requests = ' + (c.sum - 3).toFixed(1) + ' s, + 3 s, x 1.5 + 5 s',
      launch: projection <= LAUNCH_MAX_S, reason: projection <= LAUNCH_MAX_S ? '' : 'pilot projection above 450 s',
      outputs: [out, REL + 'logs\\' + name + '.txt'], failedDir: REL + 'pilot-failed'
    };
  });
  writePlan('plan-ext.json', items);
  console.log('extension candidates: ' + cands.map((c) => c.key + ' (+' + c.k + ')').join(', '));
}

function fmtS(s) {
  return s >= 100 ? s.toFixed(0) : s >= 10 ? s.toFixed(1) : s.toFixed(2);
}

function planGq() {
  const priors = loadPriors();
  const pilots = readPilots();
  const prior = readJson(path.join(EVIDENCE, 'projections', 'prior.json'));
  const rows = [];
  VARIANTS.forEach((v) => LEVELS.forEach((l) => {
    const key = v + '/' + l;
    const wasPilot = prior.find((r) => r.key === key).pilot;
    const pilotCell = pilots[key] || null;
    const g = gqProjection(key, priors, pilotCell);
    let launch = g.projection <= LAUNCH_MAX_S;
    let reason = '';
    if (wasPilot && !pilotCell && !g.structural) {
      launch = false;
      reason = 'no pilot record for this cell (not reached or not run): the stale projection ' + fmtS(g.projection) +
        ' s is not enough to launch it';
    }
    if (!launch && !reason) {
      reason = 'projected ' + fmtS(g.projection) + ' s > 450 s (S-AV27 rule: ' + g.f + ' x ' + fmtS(g.m) + ' s x (10' +
        (g.e ? ' + 60' : '') + ') + ' + STARTUP_S + ' s' + (g.e ? '; expansion not excluded: ' : '; expansion excluded: ') +
        g.pooled.h + ' hits of ' + g.pooled.n + ' pooled, 95 % upper bound ' + g.pooled.ub.toFixed(2) + ')';
    }
    const cellCount = CELLS[v];
    rows.push(Object.assign({ variant: v, level: l, cellCount: cellCount, budget: budgetOf(cellCount),
      attempts: attemptsOf(cellCount), launch: launch, reason: reason, pilot: pilotCell ? { n: pilotCell.n,
        hits: pilotCell.hits, meanMs: pilotCell.meanMs, maxMs: pilotCell.maxMs, file: pilotCell.file } : null }, g));
  }));
  writeText(path.join(EVIDENCE, 'projections', 'gq-projections.json'), JSON.stringify(rows, null, 2) + '\n');
  const md = ['| cell | cells | attempts | m (s) | basis | f | e | pooled earlier hits (95 % UB) | rating-v2 hits | pilot hits | P (s) | decision |',
    '|---|---:|---:|---:|---|---:|---:|---|---|---|---:|---|'];
  rows.forEach((r) => {
    md.push('| ' + r.variant + '/' + r.level + ' | ' + r.cellCount + ' | ' + r.attempts + ' | ' + fmtS(r.m) + ' | ' +
      r.basis.replace(/\|/g, '/') + ' | ' + r.f + ' | ' + r.e + ' | ' + r.pooled.h + '/' + r.pooled.n + ' (' + r.pooled.ub.toFixed(2) +
      ') | ' + r.v2.h + '/' + r.v2.n + ' | ' + (r.pilot ? r.pilot.hits + '/' + r.pilot.n : '-') + ' | ' + fmtS(r.projection) + ' | ' +
      (r.launch ? 'launch' : 'UNEXECUTED') + ' |');
  });
  writeText(path.join(EVIDENCE, 'projections', 'gq-projections.md'), md.join('\n') + '\n');
  const order = rows.slice().sort((a, b) => (b.launch - a.launch) || (a.projection - b.projection));
  const items = order.map((r) => {
    const id = r.variant + '-' + r.level;
    const json = REL + 'qualification\\' + id + '.json';
    const md2 = REL + 'qualification\\' + id + '.md';
    return {
      id: 'gq-' + id, phase: 'gq', label: r.variant + '/' + r.level,
      args: ['tests\\qualify.js', '--variant=' + r.variant, '--level=' + r.level, '--jobs=4', '--json=' + json,
        '--markdown=' + md2],
      tee: REL + 'logs\\gq\\' + id + '.txt', allowExit1: false, projectionSeconds: Math.ceil(r.projection),
      projectionBasis: 'S-AV27: ' + r.f + ' x ' + r.m.toFixed(3) + ' s x (10' + (r.e ? ' + 60' : '') + ') + ' + STARTUP_S +
        ' s; ' + r.basis, launch: r.launch, reason: r.reason, outputs: [json, md2], failedDir: REL + 'qualification-failed'
    };
  });
  const cv6n = gdItem('greaterThan-normal-cv6', 'greaterThan Normal CV6 (existing selector, S-AV01: this source\'s own number)',
    '> normal: 20 puzzles > CV6:', 'greater-than', 1, 120,
    'MS05b3 I5 greaterThan normal, 20 puzzles, 39.2 s at the old source (labelled) x 2 + 20 s = 100 s, rounded to 120 s');
  items.unshift(cv6n);
  const ggCheckOut = REL + 'logs\\gg-check.txt';
  items.unshift({
    id: 'gg-check', phase: 'gg-check', label: 'GG: complete merge of the 104 hash shards, check only (no generation, never --update-hashes)',
    args: ['tests\\perf.js', '--hash-merge=' + REL + 'hashes', '--check-hashes'], tee: ggCheckOut, allowExit1: true,
    projectionSeconds: 30, projectionBasis: 'MS07c hash-check 0.3 s of output; merge reads 104 small files and the fixture; 30 s bound',
    launch: true, reason: '', outputs: [ggCheckOut], failedDir: REL + 'gg-failed'
  });
  writePlan('plan-gq.json', items);
  console.log('launch ' + rows.filter((r) => r.launch).length + ', unexecuted ' + rows.filter((r) => !r.launch).length);
}

function planQuick() {
  const groups = [['shared-small', 70.3], ['own-suites', 168.0], ['pipeline', 309.5], ['replay-player', 134.8]];
  const results = REL + 'quick';
  const items = groups.map((g) => {
    const projection = Math.ceil(1.25 * g[1] + 10);
    return {
      id: 'quick-' + g[0], phase: 'quick', label: 'Generator quick group ' + g[0],
      args: ['..\\.github\\scripts\\generator-quick.js', 'run', g[0], '--results-dir=' + results],
      tee: REL + 'quick\\log-' + g[0] + '.txt', allowExit1: true, projectionSeconds: projection,
      projectionBasis: 'MEASURED at MS07d, same sources and tests (' + g[1] + ' s) x 1.25 + 10 s', launch: projection <= LAUNCH_MAX_S,
      reason: '', outputs: [REL + 'quick\\log-' + g[0] + '.txt'], failedDir: REL + 'quick-failed'
    };
  });
  const logAbs = 'Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e\\quick\\log-player-quick.txt';
  items.push({
    id: 'quick-player', phase: 'quick', label: 'Player quick set', cwd: 'player',
    args: ['tests\\node-runner.js', '--results=' + results + '\\player-quick.json'], tee: logAbs, allowExit1: true,
    projectionSeconds: 52, projectionBasis: 'MEASURED at MS07d (33.4 s) x 1.25 + 10 s', launch: true, reason: '',
    outputs: [logAbs], failedDir: REL + 'quick-failed'
  });
  writePlan('plan-quick.json', items);
}

function planRest() {
  const p = (name) => readJson(path.join(EVIDENCE, 'plans', name));
  const items = p('plan-gd.json').slice(9).concat(p('plan-gd-confusion.json'), p('plan-gd-cv6.json'), p('plan-gg.json'),
    p('plan-pilot.json'));
  writePlan('plan-rest.json', items);
}

const mode = process.argv[2];
const modes = { 'gd-pilot': planGdPilot, gd: planGd, 'gd-confusion': planGdConfusion, 'gd-cv6': planGdCv6, gg: planGg,
  pilot: planPilot, gq: planGq, quick: planQuick, rest: planRest, ext: planExt };
if (!modes[mode]) {
  console.error('usage: node make-plans.cjs <' + Object.keys(modes).join('|') + '>');
  process.exit(2);
}
modes[mode]();
