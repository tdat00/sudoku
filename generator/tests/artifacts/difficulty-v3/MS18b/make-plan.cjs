'use strict';

/*
 * MS18b task-owned, file-only: the bounded plan of the two fixed experiments (R5 cap, R9 window), from the
 * retained current-source records of MS18a only (no generation, no launch). It writes
 * docs/difficulty-v3/evidence/MS18b/plan-recheck.json (read by drive.cjs and run-entry.ps1),
 * plan-recheck.txt and manifest-keys.json, and prints the table.
 *   node generator/tests/artifacts/difficulty-v3/MS18b/make-plan.cjs
 *
 * The 30 logical cells x 12 requests (R5: classic9 normal/master/nightmare, killer hard/expert, jigsaw9
 * expert at 64, 128, 256, none with the default C 4 and no --chain-window; R9: classic9, diagonalX, jigsaw9
 * nightmare at C 4 and C 6 with the default 256 and no --shallow-cap). Every request is the request of MS18a
 * (tag `variant:level:index`, base seed 20260101, pipeline seed `seedFor`); this tool checks the keys against
 * the 8 MS18a cells it reads (the R5 and R9 sets share classic9 nightmare).
 *
 * The projection of a command is a STATED CONSERVATIVE BOUND (IR12), not a measurement of this setting:
 *   units of a command = its requests + one extra per request whose absolute index is a multiple of 5 (the
 *                        soak's I4 check generates that request a second time)
 *   whole-command bound = sum over its requests of (b_i x units_i) + FLAT seconds
 * Per-request bound b_i, from MS18a's record of the SAME request on this very source at the defaults
 * 256 / C 4 (T_i seconds, a_i attempts, s_i local searches that ended by the shallow allowance):
 *   - 256 (R5) and C 4 (R9) are the defaults of MS18a: the same deterministic path, so b_i = SAFETY x T_i;
 *   - 64 and 128: the attempts are independent random streams (digger.js forks `grid#A`, `dig#A.T`,
 *     `search#A`), and a lower allowance only ends a local search earlier (a prefix of the same walk), so the
 *     work of the first a_i attempts cannot grow, and the request may need the remaining attempts of the
 *     board (8 - a_i), each at most the cell's worst measured per-attempt average CMAX:
 *     b_i = SAFETY x (T_i + (8 - a_i) x CMAX);
 *   - none: the attempts that ended by the allowance may continue up to the existing rating cap (1024 minus
 *     the 256 already spent, EXT ratings), at the cell's measured seconds per full rating RATE (an
 *     overestimate: it includes the sample work); the attempts before and after are the same path (the
 *     continuation can only end the request earlier): b_i = SAFETY x (T_i + s_i x EXT x RATE);
 *   - C 6 changes the rating of every candidate and with it the whole search path, so no per-request record
 *     of MS18a applies; the bound is uniform per cell: K6 x TMAX, the slowest request of the cell at C 4.
 *     K6 is 10: MS07c's fresh C 6 against C 4 requests (older source `ddf2fa5a`, kept as a basis only) had
 *     slowest requests 6.6x (classic9), 7.2x (diagonalX) and 5.6x (jigsaw9) those of C 4; 10 leaves a margin
 *     of 1.4.
 * SAFETY 2 (the same path was measured on a shared machine with the host active); every b_i is at least 1 s.
 * FLAT 30 s covers the readiness screen, the process start, the source load, the I1/I5/I7 checks, the two
 * sampled references, the final-path ratings and the ledger writes: MS18a measured at most 7.2 s of
 * readiness and 1.2 s of non-generation process time in all 32 of its commands (about 10 s with the
 * launcher), so 30 s is 3 times the largest measurement. A command is the fewest balanced contiguous shards
 * (absolute indexes, --from/--count/--total-count 12) whose every bound is at most 450 s; a request whose
 * own bound does not fit is listed as NOT ADMISSIBLE and stays an exact unexecuted population.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence');
const BASIS = path.join(EVIDENCE, 'MS18a');
const OUT = path.join(EVIDENCE, 'MS18b');
const SEED = 20260101;
const REQUESTS = 12;
const ADMISSION = 450;
const CEILING = 540;
const FLAT = 30;
const SAFETY = 2;
const K6 = 10;
const ATTEMPTS = 8;
const EXT_RATINGS = 1024 - 256;
const FLOOR_S = 1;

const R5_CELLS = [['classic9', 'normal'], ['classic9', 'master'], ['classic9', 'nightmare'],
  ['killer', 'hard'], ['killer', 'expert'], ['jigsaw9', 'expert']];
const R9_CELLS = [['classic9', 'nightmare'], ['diagonalX', 'nightmare'], ['jigsaw9', 'nightmare']];
const CAP_SETTINGS = ['256', '64', '128', 'none'];
const WINDOW_SETTINGS = ['4', '6'];

/** The same FNV-1a seed as `seedFor` of tests/soak.js (the pipeline route). */
function seedFor(tag) {
  let h = (2166136261 ^ SEED) >>> 0;
  for (let k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
  return h;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const text = (value) => JSON.stringify(value, null, 2).replace(/\n/g, '\r\n') + '\r\n';
const up1 = (x) => Math.ceil(x * 10) / 10;

/** The 12 rows (by index) and the meta of one cell of MS18a, from its whole ledger or its shards. */
function basisCell(variant, level) {
  const whole = path.join(BASIS, variant + '-' + level + '.json');
  const files = [];
  if (fs.existsSync(whole)) files.push(whole);
  const dir = path.join(BASIS, 'shards');
  fs.readdirSync(dir).filter((f) => f.startsWith(variant + '-' + level + '-') && /-\d+-\d+\.json$/.test(f))
    .forEach((f) => files.push(path.join(dir, f)));
  const rows = [];
  let meta = null;
  files.forEach((file) => {
    const ledger = readJson(file);
    if (ledger.complete !== true) throw new Error(file + ' is not complete');
    meta = meta || ledger.meta;
    ledger.rows.forEach((row) => rows.push(row));
  });
  rows.sort((a, b) => a.index - b.index);
  if (rows.length !== REQUESTS || rows.some((row, i) => row.index !== i)) {
    throw new Error(variant + '/' + level + ': the MS18a rows are not the indexes 0..11 once');
  }
  return { rows: rows, meta: meta, route: meta.manifest.cells[0].route };
}

function statsOf(cell) {
  const T = cell.rows.map((r) => r.generationMs / 1000);
  const a = cell.rows.map((r) => r.work.length);
  const s = cell.rows.map((r) => {
    let n = 0;
    r.work.forEach((attempt) => attempt.localSearches.forEach((ls) => { if (ls.capHit === 'shallow') n++; }));
    return n;
  });
  const totalT = T.reduce((x, y) => x + y, 0);
  const ratings = cell.rows.reduce((x, r) => x + r.fullRatings, 0);
  return {
    T: T, a: a, s: s, tMax: Math.max.apply(null, T), totalSeconds: totalT, fullRatings: ratings,
    cMax: Math.max.apply(null, T.map((t, i) => t / a[i])), ratePerRating: totalT / ratings
  };
}

/** The per-request bounds (seconds, one decimal, rounded up) of a setting of a family for one cell. */
function requestBounds(family, setting, st) {
  const out = [];
  for (let i = 0; i < REQUESTS; i++) {
    let b;
    if (family === 'window' && setting === '6') b = K6 * st.tMax;
    else if (setting === '256' || setting === '4') b = SAFETY * st.T[i];
    else if (setting === 'none') b = SAFETY * (st.T[i] + st.s[i] * EXT_RATINGS * st.ratePerRating);
    else b = SAFETY * (st.T[i] + (ATTEMPTS - st.a[i]) * st.cMax);
    out.push(up1(Math.max(b, FLOOR_S)));
  }
  return out;
}

const unitsOf = (i) => (i % 5 === 0 ? 2 : 1);

/** The partition of 0..11 into n contiguous groups that minimises the largest group weight. */
function partition(bounds, n) {
  const weight = (from, to) => {
    let w = 0;
    for (let i = from; i < to; i++) w += bounds[i] * unitsOf(i);
    return w;
  };
  const best = [];
  for (let k = 0; k <= n; k++) best.push(new Array(REQUESTS + 1).fill(Infinity));
  const cut = [];
  for (let k = 0; k <= n; k++) cut.push(new Array(REQUESTS + 1).fill(0));
  best[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let j = k; j <= REQUESTS; j++) {
      for (let t = k - 1; t < j; t++) {
        const v = Math.max(best[k - 1][t], weight(t, j));
        if (v < best[k][j]) {
          best[k][j] = v;
          cut[k][j] = t;
        }
      }
    }
  }
  const groups = [];
  let j = REQUESTS;
  for (let k = n; k >= 1; k--) {
    const t = cut[k][j];
    groups.unshift({ from: t, count: j - t, weight: weight(t, j) });
    j = t;
  }
  return groups;
}

function shardsOf(bounds) {
  for (let n = 1; n <= REQUESTS; n++) {
    const groups = partition(bounds, n);
    if (groups.every((g) => Math.ceil(g.weight + FLAT) <= ADMISSION)) return groups;
  }
  return partition(bounds, REQUESTS);
}

const basis = {};
const cellKey = (v, l) => v + '/' + l;
R5_CELLS.concat(R9_CELLS).forEach(([v, l]) => {
  if (!basis[cellKey(v, l)]) {
    const cell = basisCell(v, l);
    basis[cellKey(v, l)] = Object.assign({ variant: v, level: l }, cell, { stats: statsOf(cell) });
  }
});
const metas = Object.keys(basis).map((k) => basis[k].meta);
const SOURCE_HASH = metas[0].sourceHash;
const TOOL_HASH = metas[0].toolHash;
const NODE = metas[0].node;
metas.forEach((m) => {
  if (m.sourceHash !== SOURCE_HASH || m.toolHash !== TOOL_HASH || m.node !== NODE) {
    throw new Error('the MS18a ledgers do not share one source, tool and Node identity');
  }
});

const entries = [];
const phases = {};
const cells = [];
const manifest = { schema: 1, seedBase: SEED, requestsPerCell: REQUESTS, experiments: {} };

function addExperiment(name, family, cellList, settings) {
  const exp = { family: family, settings: settings.slice(), cells: [], requests: 0 };
  cellList.forEach(([variant, level]) => {
    const b = basis[cellKey(variant, level)];
    const keys = [];
    for (let i = 0; i < REQUESTS; i++) {
      const tag = variant + ':' + level + ':' + i;
      const pipelineSeed = b.route === 'pipeline' ? seedFor(tag) : null;
      const row = b.rows[i];
      if (row.tag !== tag || row.pipelineSeed !== pipelineSeed) {
        throw new Error(tag + ': the MS18a row says ' + row.tag + ' seed ' + row.pipelineSeed);
      }
      keys.push({ index: i, tag: tag, pipelineSeed: pipelineSeed });
    }
    exp.cells.push({ variant: variant, level: level, route: b.route, keys: keys });
  });
  exp.requests = exp.cells.length * settings.length * REQUESTS;
  manifest.experiments[name] = exp;
  settings.forEach((setting) => {
    const phase = name === 'R5' ? 'R5-' + setting : 'R9-C' + setting;
    phases[phase] = [];
    cellList.forEach(([variant, level]) => {
      const b = basis[cellKey(variant, level)];
      const bounds = requestBounds(family, setting, b.stats);
      const shards = shardsOf(bounds);
      cells.push({
        experiment: name, setting: setting, variant: variant, level: level, route: b.route,
        perRequestBounds: bounds, commands: shards.length
      });
      const dir = (family === 'cap' ? 'cap-' : 'window-') + setting;
      shards.forEach((shard) => {
        const whole = shards.length === 1;
        const stem = variant + '-' + level + (whole ? '' : '-' + shard.from + '-' + shard.count);
        const id = dir + '-' + stem;
        const json = dir + '\\' + (whole ? '' : 'shards\\') + stem + '.json';
        const bound = Math.ceil(shard.weight + FLAT);
        const identity = {
          family: family, setting: setting, variant: variant, level: level, seed: SEED, from: shard.from,
          count: shard.count, total: REQUESTS,
          defaults: { shallowAllowance: 256, chainShortMax: 4, attemptsPerRequest: 'board default (8)',
            ratingVersion: 3 },
          sourceHash: SOURCE_HASH, toolHash: TOOL_HASH
        };
        identity[family === 'cap' ? 'otherChainWindow' : 'otherShallowCap'] = 'default';
        const payload = ['tests\\soak.js', '--variant=' + variant, '--level=' + level,
          '--count=' + shard.count];
        if (!whole) payload.push('--from=' + shard.from, '--total-count=' + REQUESTS);
        payload.push('--seed=' + SEED, '--no-gate',
          (family === 'cap' ? '--shallow-cap=' : '--chain-window=') + setting,
          '--json=..\\docs\\difficulty-v3\\evidence\\MS18b\\' + json);
        const requests = Array.from({ length: shard.count }, (_, k) => shard.from + k);
        const units = requests.reduce((n, i) => n + unitsOf(i), 0);
        const basisSeconds = requests.reduce((n, i) => n + b.stats.T[i] * unitsOf(i), 0);
        entries.push({
          id: id, experiment: name, family: family, setting: setting, variant: variant, level: level,
          route: b.route, shard: !whole, from: shard.from, count: shard.count, requests: requests,
          units: units, boundSeconds: bound, admissible: bound <= ADMISSION,
          basisSeconds: Math.round(basisSeconds * 10) / 10, json: json, log: 'logs\\' + id + '.txt',
          readiness: 'readiness\\' + id + '.json', identity: identity, payload: payload
        });
        phases[phase].push(id);
      });
    });
  });
}
addExperiment('R5', 'cap', R5_CELLS, CAP_SETTINGS);
addExperiment('R9', 'window', R9_CELLS, WINDOW_SETTINGS);

const order = ['R5-256', 'R9-C4', 'R5-64', 'R5-128', 'R5-none', 'R9-C6'];
const orderedPhases = {};
order.forEach((name) => { orderedPhases[name] = phases[name]; });

const basisSummary = {};
Object.keys(basis).forEach((k) => {
  const st = basis[k].stats;
  basisSummary[k] = {
    route: basis[k].route, totalSeconds: Math.round(st.totalSeconds * 100) / 100,
    slowestRequestSeconds: Math.round(st.tMax * 100) / 100,
    worstPerAttemptSeconds: Math.round(st.cMax * 1000) / 1000, fullRatings: st.fullRatings,
    secondsPerFullRating: Math.round(st.ratePerRating * 1e6) / 1e6,
    attempts: st.a.reduce((x, y) => x + y, 0), shallowEnded: st.s.reduce((x, y) => x + y, 0),
    perRequestSeconds: st.T.map((t) => Math.round(t * 100) / 100), perRequestAttempts: st.a,
    perRequestShallowEnded: st.s
  };
});
const plan = {
  schema: 1, admissionSeconds: ADMISSION, ceilingSeconds: CEILING, flatSeconds: FLAT, safetyFactor: SAFETY,
  c6Factor: K6, extensionRatings: EXT_RATINGS, attemptsPerRequest: ATTEMPTS, seed: SEED,
  expected: { sourceHash: SOURCE_HASH, toolHash: TOOL_HASH, node: NODE, shallowAllowance: 256,
    chainShortMax: 4 },
  rule: 'bound = sum of (per-request bound x units) + 30 s; units = requests + requests whose absolute ' +
    'index is a multiple of 5 (I4 regeneration); per-request bounds as in make-plan.cjs',
  basis: basisSummary, phaseOrder: order, phases: orderedPhases, cells: cells, entries: entries
};
fs.writeFileSync(path.join(OUT, 'plan-recheck.json'), text(plan), 'utf8');
fs.writeFileSync(path.join(OUT, 'manifest-keys.json'), text(manifest), 'utf8');

const lines = [];
lines.push('basis cell                  route     total s  slowest s  worst s/attempt  full ratings' +
  '  s/rating');
Object.keys(basisSummary).forEach((k) => {
  const b = basisSummary[k];
  lines.push(k.padEnd(27) + b.route.padEnd(9) + String(b.totalSeconds).padStart(8) +
    String(b.slowestRequestSeconds).padStart(11) + String(b.worstPerAttemptSeconds).padStart(17) +
    String(b.fullRatings).padStart(14) + String(b.secondsPerFullRating).padStart(10));
});
lines.push('');
lines.push('entry                                         requests  units  bound s  basis s  admissible');
order.forEach((name) => {
  lines.push('-- ' + name);
  entries.filter((e) => phases[name].indexOf(e.id) !== -1).forEach((e) => {
    lines.push(e.id.padEnd(46) + (e.from + '-' + (e.from + e.count - 1)).padEnd(10) +
      String(e.units).padStart(5) + String(e.boundSeconds).padStart(9) + String(e.basisSeconds).padStart(9) +
      '  ' + (e.admissible ? 'yes' : 'NO'));
  });
});
lines.push('');
const per = {};
order.forEach((name) => {
  const list = entries.filter((e) => phases[name].indexOf(e.id) !== -1);
  per[name] = list.length + ' commands, bound sum ' + list.reduce((n, e) => n + e.boundSeconds, 0) + ' s';
});
lines.push(entries.length + ' commands for ' + cells.length + ' logical cells, ' +
  entries.reduce((n, e) => n + e.count, 0) + ' requests; largest bound ' +
  Math.max.apply(null, entries.map((e) => e.boundSeconds)) + ' s (admission ' + ADMISSION +
  ' s, process ceiling ' + CEILING + ' s); not admissible: ' + entries.filter((e) => !e.admissible).length);
order.forEach((name) => lines.push('  ' + name + ': ' + per[name]));
lines.push('manifest: R5 ' + manifest.experiments.R5.requests + ' requests, R9 ' +
  manifest.experiments.R9.requests + ' requests; source ' + SOURCE_HASH.slice(0, 12) + ', tool ' +
  TOOL_HASH.slice(0, 12) + ', Node ' + NODE);
lines.push('plan-recheck.json sha256 ' + crypto.createHash('sha256').update(text(plan)).digest('hex'));
fs.writeFileSync(path.join(OUT, 'plan-recheck.txt'), lines.join('\r\n') + '\r\n', 'utf8');
lines.forEach((line) => console.log(line));
