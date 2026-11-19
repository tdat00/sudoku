'use strict';

/*
 * MS18d Phase C0b task-owned: the FROZEN R24 plan data and its derivation (tasks/difficulty-v3/
 * MS18d-r24-request-ledger.md and the per-cell table of MS18d-phase-c-admission.md, pack commit e4cd92d6).
 * Pure: no file, no clock, no process.
 *
 * MATRIX is the parent plan's table in its fixed order: [key, frozen target ms, GQ max ms, GG max ms or
 * null, P50 seconds]. R24_CHUNKS is the frozen [i0, n, P seconds] list of the 17 multi-chunk cells. The
 * common rule
 *   m = max(GQ max, GG max)      capacity = floor(390000 / m)      k = ceil(50 / capacity)
 *   n[j] = floor(50 / k) + (j < 50 % k ? 1 : 0)      P[j] = 60 + ceil(n[j] * m / 1000)
 * reproduces the frozen table from the displayed maxima (checked by deriveChunks and by the tests); the
 * frozen text, never the derivation, is what the manifest carries, and a difference is an error, not a
 * correction. No adaptive reallocation, no retry allowance and no different k are chosen here.
 */
const crypto = require('crypto');

const RUNS_PER_CELL = 50;
const SEED_BASE = 7000;
const SEED_STEP = 101;
const PROJECTION_LIMIT_SECONDS = 450;
const ALLOWANCE_SECONDS = 60;
const CAPACITY_MS = 390000;

const MATRIX = [
  ['classic4/veryEasy', 31, 12.9531, 8, 61], ['classic6/veryEasy', 39, 13.8671, 11, 61],
  ['classic6/hard', 350, 399.0431, 387, 80], ['classic9/veryEasy', 60, 19.8093, 14, 61],
  ['classic9/easy', 2342, 1318.719, 1406, 131], ['classic9/normal', 2627, 952.5775, 1112, 116],
  ['classic9/hard', 400, 493.1213, 129, 85], ['classic9/expert', 1323, 544.8815, 610, 91],
  ['classic9/master', 900, 468.8741, 410, 84], ['classic9/nightmare', 8377, 3228.1024, 1702, 222],
  ['mega12/veryEasy', 400, 26.8378, null, 62], ['mega12/easy', 1000, 53.8743, null, 63],
  ['mega12/normal', 1000, 127.5042, 50, 67], ['mega12/hard', 3000, 372.2446, null, 79],
  ['mega12/expert', 3000, 7953.7019, null, 458], ['mega12/master', 3000, 1112.9419, null, 116],
  ['mega12/nightmare', 18842, 8736.1104, null, 497], ['mega12/hell2', 16000, 11526.3005, null, 637],
  ['mega16/veryEasy', 1500, 39.7954, null, 62], ['mega16/easy', 4000, 61.4999, 58, 64],
  ['mega16/normal', 4000, 134.6989, null, 67], ['mega16/hard', 10000, 2023.2603, null, 162],
  ['mega16/master', 10000, 6384.3164, null, 380], ['mega16/hell2', 30000, 43048.0792, null, 2213],
  ['diagonalX/veryEasy', 80, 19.6909, null, 61], ['diagonalX/normal', 200, 399.7115, null, 80],
  ['diagonalX/hard', 500, 98.2527, null, 65], ['diagonalX/master', 1200, 914.6799, null, 106],
  ['diagonalX/nightmare', 10000, 7414.5825, 5015, 431], ['diagonalX/hell2', 3000, 3373.9294, null, 229],
  ['hyper/veryEasy', 80, 19.3498, null, 61], ['hyper/normal', 1573, 805.5777, null, 101],
  ['hyper/hard', 500, 138.827, 79, 67], ['hyper/master', 1200, 1545.0021, null, 138],
  ['hyper/nightmare', 10000, 11272.8636, null, 624], ['hyper/hell2', 5000, 6729.419, null, 397],
  ['jigsaw9/veryEasy', 150, 74.0841, null, 64], ['jigsaw9/easy', 1905, 768.6908, null, 99],
  ['jigsaw9/normal', 350, 413.6342, 143, 81], ['jigsaw9/hard', 900, 160.6444, null, 69],
  ['jigsaw9/master', 2000, 2719.933, 3389, 230], ['jigsaw9/hell2', 10000, 9904.8754, null, 556],
  ['killer/veryEasy', 300, 25.5256, null, 62], ['killer/easy', 700, 64.8644, 54, 64],
  ['killer/normal', 5425, 2252.0779, null, 173], ['greaterThan/veryEasy', 300, 55.2629, null, 63],
  ['greaterThan/easy', 700, 112.6005, null, 66], ['greaterThan/hard', 6000, 3213.7686, 5018, 311],
  ['greaterThan/master', 10000, 7828.2704, null, 452], ['greaterThan/hell2', 10000, 19426.627, null, 1032],
  ['samurai/veryEasy', 3000, 49.7793, null, 63], ['samurai/normal', 8000, 2718.3111, null, 196],
  ['samurai/hard', 20000, 1142.9887, null, 118], ['samurai/expert', 20000, 9047.9127, null, 513],
  ['samurai/master', 20000, 66790.9568, null, 3400], ['sohei/veryEasy', 3000, 44.398, 29, 63],
  ['sohei/normal', 8000, 9022.8878, null, 512], ['sohei/hard', 20000, 606.0797, null, 91],
  ['sohei/expert', 20000, 13851.4877, null, 753], ['sohei/master', 20000, 8092.3715, null, 465],
  ['sohei/hell2', 30000, 41652.8343, null, 2143], ['butterfly/veryEasy', 1000, 34.3091, null, 62],
  ['butterfly/normal', 3000, 1486.743, 1842, 153], ['butterfly/hard', 8000, 309.2124, null, 76],
  ['butterfly/expert', 8000, 4966.2758, null, 309], ['butterfly/master', 8000, 948.0175, null, 108],
  ['butterfly/nightmare', 30000, 21241.2245, null, 1123], ['butterfly/hell2', 15000, 14259.1274, null, 773],
  ['flower/veryEasy', 3000, 35.3335, null, 62], ['flower/normal', 8000, 2033.104, 1447, 162],
  ['flower/hard', 20000, 3523.2231, null, 237], ['flower/master', 20000, 2364.3572, null, 179],
  ['flower/hell2', 20000, 13936.7153, null, 757], ['wordoku/veryEasy', 100, 21.3596, null, 62],
  ['wordoku/easy', 2921, 1338.2495, null, 127], ['wordoku/hard', 600, 710.1285, null, 96],
  ['wordoku/expert', 600, 599.3611, null, 90], ['wordoku/master', 1500, 437.3951, null, 82],
  ['wordoku/nightmare', 1500, 4217.0411, null, 271]
];

const R24_CHUNKS = {
  'mega12/expert': [[0, 25, 259], [25, 25, 259]],
  'mega12/nightmare': [[0, 25, 279], [25, 25, 279]],
  'mega12/hell2': [[0, 25, 349], [25, 25, 349]],
  'mega16/hell2': [[0, 9, 448], [9, 9, 448], [18, 8, 405], [26, 8, 405], [34, 8, 405], [42, 8, 405]],
  'hyper/nightmare': [[0, 25, 342], [25, 25, 342]],
  'jigsaw9/hell2': [[0, 25, 308], [25, 25, 308]],
  'greaterThan/master': [[0, 25, 256], [25, 25, 256]],
  'greaterThan/hell2': [[0, 17, 391], [17, 17, 391], [34, 16, 371]],
  'samurai/expert': [[0, 25, 287], [25, 25, 287]],
  'samurai/master': [[0, 5, 394], [5, 5, 394], [10, 5, 394], [15, 5, 394], [20, 5, 394], [25, 5, 394],
    [30, 5, 394], [35, 5, 394], [40, 5, 394], [45, 5, 394]],
  'sohei/normal': [[0, 25, 286], [25, 25, 286]],
  'sohei/expert': [[0, 25, 407], [25, 25, 407]],
  'sohei/master': [[0, 25, 263], [25, 25, 263]],
  'sohei/hell2': [[0, 9, 435], [9, 9, 435], [18, 8, 394], [26, 8, 394], [34, 8, 394], [42, 8, 394]],
  'butterfly/nightmare': [[0, 17, 422], [17, 17, 422], [34, 16, 400]],
  'butterfly/hell2': [[0, 25, 417], [25, 25, 417]],
  'flower/hell2': [[0, 25, 409], [25, 25, 409]]
};

/** The common reservation rule for raw maximum `m` ms: { capacity, k, chunks: [[i0, n, P seconds]] }. */
function deriveChunks(m) {
  if (typeof m !== 'number' || !isFinite(m) || m <= 0) throw new Error('invalid maximum ' + m);
  const capacity = Math.floor(CAPACITY_MS / m);
  if (!(capacity >= 1)) throw new Error('zero capacity for ' + m + ' ms');
  const k = Math.ceil(RUNS_PER_CELL / capacity);
  const base = Math.floor(RUNS_PER_CELL / k);
  const remainder = RUNS_PER_CELL % k;
  const chunks = [];
  let i0 = 0;
  for (let j = 0; j < k; j++) {
    const n = base + (j < remainder ? 1 : 0);
    chunks.push([i0, n, ALLOWANCE_SECONDS + Math.ceil(n * m / 1000)]);
    i0 += n;
  }
  return { capacity, k, chunks };
}

/** Every frozen cell as { key, variant, level, target, m, p50, route, chunks: [[i0, n, P]] }. */
function frozenRows() {
  return MATRIX.map(([key, target, gq, gg, p50]) => {
    const m = Math.max(gq, gg === null ? 0 : gg);
    const [variant, level] = key.split('/');
    const multi = Object.prototype.hasOwnProperty.call(R24_CHUNKS, key);
    return { key, variant, level, target, m, p50, route: multi ? 'R' : 'C',
      chunks: multi ? R24_CHUNKS[key].map((c) => c.slice()) : [[0, RUNS_PER_CELL, p50]] };
  });
}

/** Problems of the frozen data against the rule: [] when the table is exactly what the rule gives. */
function checkFrozen(rows) {
  const problems = [];
  rows.forEach((row) => {
    const d = deriveChunks(row.m);
    const p50 = ALLOWANCE_SECONDS + Math.ceil(RUNS_PER_CELL * row.m / 1000);
    if (row.p50 !== p50) problems.push(row.key + ': P50 ' + row.p50 + ' is not ' + p50);
    if ((d.k === 1) !== (row.route === 'C')) {
      problems.push(row.key + ': k ' + d.k + ' for route ' + row.route);
    }
    if (JSON.stringify(d.chunks) !== JSON.stringify(row.chunks)) {
      problems.push(row.key + ': frozen chunks ' + JSON.stringify(row.chunks) + ' differ from the rule ' +
        JSON.stringify(d.chunks));
    }
    let covered = 0;
    row.chunks.forEach((c) => {
      if (c[0] !== covered) problems.push(row.key + ': chunk at ' + c[0] + ' is not contiguous');
      covered += c[1];
      if (c[2] > PROJECTION_LIMIT_SECONDS) problems.push(row.key + ': P ' + c[2] + ' is over the limit');
    });
    if (covered !== RUNS_PER_CELL) problems.push(row.key + ': chunks cover ' + covered + ' requests');
  });
  return problems;
}

/** The deterministic seed of request index i. */
const seedOf = (i) => SEED_BASE + SEED_STEP * i;

/** JSON with the keys of every object in sorted order: the recipe of toolRecords.canonicalJson. */
function canonicalJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!isFinite(value)) throw new TypeError('canonicalJson: a number is not finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key]))
      .join(',') + '}';
  }
  throw new TypeError('canonicalJson: not plain JSON data (' + typeof value + ')');
}

/** Lowercase hex SHA-256 of the canonical JSON of a value. */
const canonicalSha256 = (value) => crypto.createHash('sha256').update(canonicalJson(value), 'utf8')
  .digest('hex');

const chunkIdOf = (variant, level, i0, n) => variant + '-' + level + '.i' + i0 + '.n' + n;

const MERGE_RUN_ID = 'merge.m1';
const FINAL_RUN_ID = 'final.m1';
const FINAL_FOLDER = 'all-79';

/** One declared run slot (R2): the literal directory of a chunk attempt or of a merge. */
const slotOf = (mergeBase, role, folder, runId, extra) => Object.assign({ role, runId,
  dir: mergeBase + '/' + folder + '/' + runId }, extra);

/**
 * The manifest: `inputs` = { rows (default: the frozen rows), plan, targets, sources, environment, policy,
 * mergeBase } with the bindings the caller measured or read. Every chunk carries its immutable ID, range,
 * derived seeds and frozen projection. `runSlots` (R2) declares, as literal repository-relative directories,
 * the primary and the eligible re-ask slot of every chunk (`.a1`, `.a2`), optionally (`cellMergeSlots`, off
 * for the real campaign: only the final merge is required) one selected-cell merge slot per cell, and the one
 * final all-79 merge slot; nothing else may be written under gp/. `manifestSha256` is the canonical hash of
 * everything else.
 */
function buildManifest(inputs) {
  const rows = inputs.rows || frozenRows();
  const chunks = [];
  const runSlots = [];
  let oneChunkCells = 0;
  let multiChunkCells = 0;
  let multiChunkCommands = 0;
  rows.forEach((row, index) => {
    const folder = row.variant + '-' + row.level;
    if (row.chunks.length === 1) oneChunkCells++;
    else {
      multiChunkCells++;
      multiChunkCommands += row.chunks.length;
    }
    row.chunks.forEach((c, chunkIndex) => {
      const seeds = [];
      for (let i = c[0]; i < c[0] + c[1]; i++) seeds.push(seedOf(i));
      const chunkId = chunkIdOf(row.variant, row.level, c[0], c[1]);
      chunks.push({ chunkId, cell: row.key,
        variant: row.variant, level: row.level, target: row.target, matrixIndex: index,
        route: row.chunks.length === 1 ? 'C' : 'R', k: row.chunks.length, chunkIndex, i0: c[0], n: c[1],
        seedBase: SEED_BASE + SEED_STEP * c[0], seeds, projectionSeconds: c[2] });
      [1, 2].forEach((attempt) => runSlots.push(slotOf(inputs.mergeBase, 'chunk', folder,
        chunkId + '.a' + attempt, { cell: row.key, chunkId, attempt })));
    });
    if (inputs.cellMergeSlots === true) {
      runSlots.push(slotOf(inputs.mergeBase, 'cell-merge', folder, MERGE_RUN_ID, { cell: row.key }));
    }
  });
  runSlots.push(slotOf(inputs.mergeBase, 'final-merge', FINAL_FOLDER, FINAL_RUN_ID, { cell: null }));
  const requests = chunks.reduce((sum, c) => sum + c.n, 0);
  const doc = {
    schema: 'ms18d-gp-chunk-manifest-v1',
    plan: inputs.plan, targets: inputs.targets, sources: inputs.sources, environment: inputs.environment,
    policy: inputs.policy,
    protocol: { runsPerCell: RUNS_PER_CELL, seedBase: SEED_BASE, seedStep: SEED_STEP, trace: 'summary',
      warmup: 0, jobs: 1, budget: null, projectionLimitSeconds: PROJECTION_LIMIT_SECONDS,
      hardLimitSeconds: 540, allowanceSeconds: ALLOWANCE_SECONDS, capacityMs: CAPACITY_MS },
    gate: { cells: rows.length, requiredSuccesses: Math.floor((rows.length * 9 + 9) / 10) },
    loader: inputs.loader,
    runBase: inputs.mergeBase,
    slotPolicy: { chunkAttempts: 2, cellMerge: inputs.cellMergeSlots === true, finalMerge: true },
    runSlots,
    counts: { cells: rows.length, commands: chunks.length, requests, oneChunkCells, multiChunkCells,
      multiChunkCommands, extraColdStarts: chunks.length - rows.length, runSlots: runSlots.length,
      reservedSeconds: chunks.reduce((sum, c) => sum + c.projectionSeconds, 0),
      maxProjectionSeconds: chunks.reduce((max, c) => Math.max(max, c.projectionSeconds), 0) },
    chunks
  };
  doc.manifestSha256 = canonicalSha256(doc);
  return doc;
}

/** The literal run directories the manifest declares. */
const declaredDirsOf = (doc) => doc.runSlots.map((s) => s.dir);

/** The one slot of a manifest whose directory is `dir` (repository-relative), or null. */
function slotForDir(doc, dir) {
  const norm = String(dir).replace(/\\/g, '/').replace(/\/$/, '');
  const found = doc.runSlots.filter((s) => s.dir === norm);
  return found.length === 1 ? found[0] : null;
}

/** Problems of a manifest document (hash, ranges, seeds, run slots, counts); [] when it is sound. */
function verifyManifest(doc) {
  const problems = [];
  if (!doc || doc.schema !== 'ms18d-gp-chunk-manifest-v1') return ['not an ms18d-gp-chunk-manifest-v1'];
  const rest = Object.assign({}, doc);
  delete rest.manifestSha256;
  if (!/^[0-9a-f]{64}$/.test(String(doc.manifestSha256)) || doc.manifestSha256 !== canonicalSha256(rest)) {
    problems.push('the manifest hash does not match its content');
  }
  const ids = new Set();
  const covered = new Map();
  (doc.chunks || []).forEach((c) => {
    if (ids.has(c.chunkId)) problems.push('duplicate chunk ID ' + c.chunkId);
    ids.add(c.chunkId);
    if (c.chunkId !== chunkIdOf(c.variant, c.level, c.i0, c.n)) {
      problems.push(c.chunkId + ': ID differs from its range');
    }
    if (!Array.isArray(c.seeds) || c.seeds.length !== c.n) problems.push(c.chunkId + ': seeds are not n');
    else c.seeds.forEach((s, j) => { if (s !== seedOf(c.i0 + j)) problems.push(c.chunkId + ': seed ' + j); });
    if (c.seedBase !== seedOf(c.i0)) problems.push(c.chunkId + ': seedBase');
    if (c.projectionSeconds > doc.protocol.projectionLimitSeconds) problems.push(c.chunkId + ': over 450 s');
    if (!covered.has(c.cell)) covered.set(c.cell, []);
    covered.get(c.cell).push(c);
  });
  covered.forEach((list, cell) => {
    let next = 0;
    list.forEach((c) => {
      if (c.i0 !== next) problems.push(cell + ': chunks are not contiguous at ' + c.i0);
      next = c.i0 + c.n;
      if (c.k !== list.length) problems.push(cell + ': k ' + c.k + ' is not ' + list.length);
    });
    if (next !== doc.protocol.runsPerCell) problems.push(cell + ': chunks cover ' + next + ' requests');
  });
  verifySlots(doc, ids, covered).forEach((p) => problems.push(p));
  const ld = doc.loader;
  if (!ld || !ld.recipe || !Array.isArray(ld.files) || ld.files.length !== ld.recipe.loaded ||
    !/^[0-9a-f]{64}$/.test(String(ld.hashIdentity))) {
    problems.push('the loaded-source manifest is incomplete');
  }
  const counts = doc.counts || {};
  if (counts.cells !== covered.size) problems.push('cell count ' + counts.cells + ' is not ' + covered.size);
  if (counts.commands !== (doc.chunks || []).length) problems.push('command count');
  if (counts.requests !== counts.cells * doc.protocol.runsPerCell) problems.push('request count');
  if (counts.runSlots !== (doc.runSlots || []).length) problems.push('run slot count');
  if (doc.gate.cells !== covered.size) problems.push('gate cell count');
  return problems;
}

/** R2: the literal run slots are exactly two attempts per chunk, one merge per cell and one final merge. */
function verifySlots(doc, chunkIds, cells) {
  const problems = [];
  const policy = doc.slotPolicy || {};
  if (policy.chunkAttempts !== 2 || policy.finalMerge !== true || typeof policy.cellMerge !== 'boolean') {
    problems.push('the slot policy is not two attempts, a final merge and an explicit cell-merge flag');
  }
  const slots = Array.isArray(doc.runSlots) ? doc.runSlots : [];
  const dirs = new Set();
  const seen = new Map();
  slots.forEach((s) => {
    const folder = s.role === 'final-merge' ? FINAL_FOLDER : String(s.cell).replace('/', '-');
    if (s.dir !== doc.runBase + '/' + folder + '/' + s.runId) problems.push('slot ' + s.dir + ': wrong path');
    if (!/^[A-Za-z0-9._-]+$/.test(String(s.runId)) || /^\.+$/.test(String(s.runId))) {
      problems.push('slot ' + s.dir + ': run id is not a plain name');
    }
    if (dirs.has(s.dir)) problems.push('slot ' + s.dir + ': declared twice');
    dirs.add(s.dir);
    let expectedRunId = null;
    if (s.role === 'chunk') {
      expectedRunId = s.chunkId + '.a' + s.attempt;
      const chunk = (doc.chunks || []).filter((c) => c.chunkId === s.chunkId)[0];
      if (!chunkIds.has(s.chunkId) || !chunk || chunk.cell !== s.cell) {
        problems.push('slot ' + s.dir + ': not the cell of its chunk');
      }
      if (s.attempt !== 1 && s.attempt !== 2) problems.push('slot ' + s.dir + ': attempt ' + s.attempt);
    } else if (s.role === 'cell-merge') {
      expectedRunId = MERGE_RUN_ID;
      if (!cells.has(s.cell)) problems.push('slot ' + s.dir + ': merge of an unknown cell');
    } else if (s.role === 'final-merge') {
      expectedRunId = FINAL_RUN_ID;
      if (s.cell !== null) problems.push('slot ' + s.dir + ': the final merge names a cell');
    } else problems.push('slot ' + s.dir + ': role ' + s.role);
    if (expectedRunId !== null && s.runId !== expectedRunId) problems.push('slot ' + s.dir + ': run id');
    const key = s.role + '|' + (s.chunkId || s.cell || '') + '|' + (s.attempt || '');
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  chunkIds.forEach((id) => [1, 2].forEach((a) => {
    if (seen.get('chunk|' + id + '|' + a) !== 1) problems.push('chunk ' + id + ': attempt ' + a + ' slot');
  }));
  cells.forEach((list, cell) => {
    const got = seen.get('cell-merge|' + cell + '|') || 0;
    if (got !== (policy.cellMerge === true ? 1 : 0)) problems.push(cell + ': merge slot');
  });
  if (seen.get('final-merge||') !== 1) problems.push('the final merge slot');
  const expected = chunkIds.size * 2 + (policy.cellMerge === true ? cells.size : 0) + 1;
  if (slots.length !== expected) {
    problems.push('run slots: ' + slots.length + ' declared, ' + expected + ' expected');
  }
  return problems;
}

module.exports = { MATRIX, R24_CHUNKS, RUNS_PER_CELL, SEED_BASE, SEED_STEP, PROJECTION_LIMIT_SECONDS,
  MERGE_RUN_ID, FINAL_RUN_ID, FINAL_FOLDER, deriveChunks, frozenRows, checkFrozen, seedOf, canonicalJson,
  canonicalSha256, chunkIdOf, buildManifest, verifyManifest, declaredDirsOf, slotForDir };
