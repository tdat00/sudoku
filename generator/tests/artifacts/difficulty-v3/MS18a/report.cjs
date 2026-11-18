'use strict';

/*
 * MS18a task-owned, READ-ONLY reporter: validates, merges and compares the 17 current GS cells with the
 * 17 original MS02 ledgers and writes the tables. It generates nothing, writes only the two output files
 * named on the command line and never touches a ledger. It loads the engine sources and the diagnostics
 * helper like tests/soak.js only to use their pure functions (`mergeShards`, `statsOf`, `summaryOf`); old
 * MS02 rows are never fed to the current merger, and old positions are read as stored (never recomputed
 * with today's weights).
 *
 *   node report.cjs [--old=<dir>] [--new=<dir>] [--plan=<plan-gs.json>|none] [--expect-rating=3]
 *                   [--out-md=<file>] [--out-json=<file>]
 *
 * Defaults: the MS02 and MS18a evidence folders and the plan written before the run. `--plan=none` reads
 * each new cell as one whole ledger `<variant>-<level>.json` (a dry run on other whole-cell ledgers, e.g.
 * MS06d, with `--expect-rating=2`). A cell with a missing, incomplete or unmergeable ledger is reported as
 * such and left out of the comparisons; a partial matrix is never presented as complete (exit 1 while any
 * check fails or a cell is missing).
 *
 * Conventions: shares have the stated denominators; upper median = sorted index floor(n / 2); deciles at
 * sorted index min(n - 1, floor(p * n)) (`statsOf` of the diagnostics helper); percentiles are computed
 * from raw rows, never averaged over shards; a historical counter that was not exposed is "n/a", never 0.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const admission = require('./admission.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const GEN = path.join(REPO, 'generator');
const EVID = path.join(REPO, 'docs', 'difficulty-v3', 'evidence');
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const OLD = path.resolve(opt('old', path.join(EVID, 'MS02')));
const NEW = path.resolve(opt('new', path.join(EVID, 'MS18a')));
const PLAN = opt('plan', path.join(NEW, 'plan-gs.json'));
const EXPECT_RATING = Number(opt('expect-rating', '3'));
const OUT_MD = opt('out-md', null);
const OUT_JSON = opt('out-json', null);
const SEED = 20260101;
const REFERENCE_INDEXES = [0, 11];

// ---- the sources, for their pure functions ------------------------------------------------------------
function load(rel) {
  const abs = path.join(GEN, rel);
  if (fs.existsSync(abs)) {
    vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  }
}
const runnerText = fs.readFileSync(path.join(GEN, 'tests/node-runner.js'), 'utf8');
const sourceList = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runnerText)[1].match(/'[^']+'/g) || [];
sourceList.map((s) => s.slice(1, -1)).forEach(load);
load('tests/fixtures/perf-helper.js');
load('tests/fixtures/difficulty-diagnostics.js');
const D = globalThis.SG.fixtures.difficultyDiagnostics;

// ---- small helpers ------------------------------------------------------------------------------------
const CELLS = [
  ['classic9', 'normal'], ['classic9', 'hard'], ['classic9', 'expert'], ['classic9', 'master'],
  ['classic9', 'nightmare'], ['classic9', 'hell1'], ['killer', 'normal'], ['killer', 'hard'],
  ['killer', 'expert'], ['jigsaw9', 'normal'], ['jigsaw9', 'hard'], ['jigsaw9', 'expert'],
  ['jigsaw9', 'nightmare'], ['greaterThan', 'normal'], ['greaterThan', 'hard'],
  ['greaterThan', 'expert'], ['diagonalX', 'nightmare']
].map(([variant, level]) => ({
  variant: variant, level: level, key: variant + '/' + level, name: variant + '-' + level,
  hell: variant === 'classic9' && level === 'hell1'
}));
const ROUTE = {
  classic9: 'direct', diagonalX: 'direct', killer: 'pipeline', jigsaw9: 'pipeline', greaterThan: 'pipeline'
};
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sum = (list) => list.reduce((a, b) => a + b, 0);
const mean = (list) => (list.length === 0 ? null : sum(list) / list.length);
const bump = (table, key) => { table[key] = (table[key] || 0) + 1; };
const f = (x, d) => (finite(x) ? x.toFixed(d === undefined ? 2 : d) : 'n/a');
const pct = (n, d) => (d === 0 ? 'n/a' : Math.round(100 * n / d) + '%');
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const label = (cell) => cell.variant + ' ' + cell.level;
const signed = (n) => (n > 0 ? '+' : '') + n;
const out = [];
const heading = (text) => { out.push('', text, ''); };
function table(headers, rows) {
  if (rows.length === 0) {
    out.push('None.', '');
    return;
  }
  out.push('| ' + headers.join(' | ') + ' |');
  out.push('|' + headers.map((h, i) => (i === 0 ? '---' : '---:')).join('|') + '|');
  rows.forEach((row) => out.push('| ' + row.join(' | ') + ' |'));
  out.push('');
}
const checks = [];
function check(text, ok, detail) {
  checks.push({ label: text, ok: ok === true, detail: detail === undefined ? '' : String(detail) });
}

/** 'exact' (qualified), 'shallow', 'miss' (not solved in band) or 'unverdicted' (in band, no verdict). */
function category(row) {
  if (row.scoreHit !== true) return 'miss';
  if (row.qualifiedHit === true) return 'exact';
  return row.shallow === true ? 'shallow' : 'unverdicted';
}

/** The cohort of rows as `cohortOf` of the diagnostics helper builds it, from the STORED positions. */
function cohortOf(rows) {
  const raw = [];
  const adjusted = [];
  const nullReasons = {};
  rows.forEach((row) => {
    const p = row.position && typeof row.position === 'object' ? row.position : { raw: null, adjusted: null };
    if (finite(p.raw) && p.reason !== 'off-band') raw.push(p.raw);
    if (finite(p.adjusted)) adjusted.push(p.adjusted);
    else bump(nullReasons, p.reason || 'unknown');
  });
  return { n: rows.length, raw: D.statsOf(raw), adjusted: D.statsOf(adjusted), nullReasons: nullReasons };
}
const statText = (s) => (s.n === 0 ? 'none' :
  f(s.deciles[0], 3) + ' / ' + f(s.upperMedian, 3) + ' / ' + f(s.deciles[10], 3));
const reasonsText = (t) => (Object.keys(t).length === 0 ? '-' :
  Object.keys(t).map((k) => k + ' ' + t[k]).join(', '));
function timeStats(rows) {
  const s = rows.map((r) => r.generationMs / 1000).sort((a, b) => a - b);
  const n = s.length;
  return {
    n: n, sum: sum(s), mean: mean(s), upperMedian: n ? s[Math.floor(n / 2)] : null,
    p95: n ? s[Math.min(n - 1, Math.floor(0.95 * n))] : null, max: n ? s[n - 1] : null
  };
}

// ---- the old ledgers (MS02) ---------------------------------------------------------------------------
const oldOf = {};
CELLS.forEach((cell) => {
  const ledger = readJson(path.join(OLD, cell.name + '.json'));
  oldOf[cell.key] = { ledger: ledger, rows: ledger.rows };
  const idx = ledger.rows.map((r) => r.index).sort((a, b) => a - b);
  check('old ' + cell.name + ': complete, 12 rows, indexes 0..11 once, checks PASS',
    ledger.complete === true && ledger.rows.length === 12 && idx.every((v, i) => v === i) &&
      ledger.summary.checks.result === 'PASS', ledger.summary.checks.result);
});

// ---- the new ledgers (current source), merged per cell ------------------------------------------------
const plan = PLAN === 'none' ? null : readJson(PLAN);
const newOf = {};
CELLS.forEach((cell) => {
  const entries = plan === null
    ? [{ id: cell.name, json: cell.name + '.json', from: 0, count: 12, shard: false }]
    : plan.entries.filter((e) => e.variant === cell.variant && e.level === cell.level);
  const shards = [];
  const missing = [];
  entries.forEach((entry) => {
    const file = path.join(NEW, entry.json);
    if (!fs.existsSync(file)) missing.push(entry.id);
    else shards.push({ entry: entry, file: file, ledger: readJson(file) });
  });
  const all = shards.length === entries.length && shards.length > 0;
  const merge = all ? D.mergeShards(shards.map((s) => s.ledger)) : null;
  const complete = merge !== null && merge.ok === true;
  // A cell with only some of its shards: its recorded rows are kept apart, only when the shards are valid and
  // compatible and the sole problem is the missing indexes (never merged into a complete distribution).
  let partial = null;
  if (!all && shards.length > 0) {
    const trial = D.mergeShards(shards.map((s) => s.ledger));
    const onlyMissing = trial.problems.length > 0 &&
      trial.problems.every((p) => /indexes are missing/.test(p));
    if (onlyMissing) {
      const rows = [].concat(...shards.map((s) => s.ledger.rows)).sort((a, b) => a.index - b.index);
      const have = new Set(rows.map((r) => r.index));
      const missingIndexes = Array.from({ length: 12 }, (_, i) => i).filter((i) => !have.has(i));
      partial = { rows: rows, missingIndexes: missingIndexes };
    }
  }
  newOf[cell.key] = {
    entries: entries, shards: shards, missing: missing, merge: merge, complete: complete, partial: partial,
    rows: complete ? merge.rows : []
  };
  check('new ' + cell.name + ': ' + entries.length + ' ledger(s) present', missing.length === 0,
    missing.length ? 'missing ' + missing.join(', ') : '');
  if (merge !== null) {
    check('new ' + cell.name + ': mergeShards ok (indexes 0..11 once, compatible)', complete,
      merge.problems.join('; '));
  }
});
const doneCells = CELLS.filter((cell) => newOf[cell.key].complete);
const doneCount = doneCells.length;

// ---- configuration and identity of the new ledgers ----------------------------------------------------
const allShards = [].concat(...CELLS.map((cell) => newOf[cell.key].shards));
const metas = allShards.map((s) => s.ledger.meta);
const distinct = (pick) => Array.from(new Set(metas.map((m) => String(JSON.stringify(pick(m))))));
const manifestOf = (m) => m.manifest;
const identity = {
  sourceHash: distinct((m) => m.sourceHash), toolHash: distinct((m) => m.toolHash),
  node: distinct((m) => m.node), commit: distinct((m) => m.commit), dirty: distinct((m) => m.dirty),
  acceptance: distinct((m) => m.acceptance), shallowSearchRatings: distinct((m) => m.shallowSearchRatings),
  shallowCap: distinct((m) => m.shallowCap), chainShortMax: distinct((m) => m.chainShortMax),
  chainWindow: distinct((m) => m.chainWindow), seedBase: distinct((m) => m.seedBase),
  ratingVersion: distinct((m) => manifestOf(m).ratingVersion),
  referenceBudgetMs: distinct((m) => manifestOf(m).referenceBudgetMs),
  includeUnsupported: distinct((m) => manifestOf(m).includeUnsupported),
  weights: distinct((m) => manifestOf(m).weights), bands: distinct((m) => manifestOf(m).bands),
  quick: distinct((m) => manifestOf(m).quick), perCombo: distinct((m) => manifestOf(m).perCombo),
  machine: distinct((m) => m.machine)
};
if (allShards.length > 0) {
  check('new ledgers: one sourceHash, one toolHash, one Node version across all shards of all cells',
    identity.sourceHash.length === 1 && identity.toolHash.length === 1 && identity.node.length === 1,
    identity.sourceHash.length + ' / ' + identity.toolHash.length + ' / ' + identity.node.length);
  const settingsOk = sameJson(identity.ratingVersion, [String(EXPECT_RATING)]) &&
    sameJson(identity.seedBase, [String(SEED)]) && sameJson(identity.referenceBudgetMs, ['120000']) &&
    sameJson(identity.includeUnsupported, ['false']) && sameJson(identity.weights, ['null']) &&
    sameJson(identity.bands, ['null']) && sameJson(identity.quick, ['false']) &&
    sameJson(identity.perCombo, ['0']) && sameJson(identity.shallowCap, ['null']) &&
    sameJson(identity.chainWindow, ['null']);
  check('new ledgers: rating version ' + EXPECT_RATING + ', seed ' + SEED +
    ', reference budget 120000 ms, no override', settingsOk, JSON.stringify(identity));
  check('new ledgers: acceptance canonical-required-tier',
    sameJson(identity.acceptance, ['"canonical-required-tier"']), identity.acceptance.join(' '));
}

// ---- the 204 request keys: tags, routes and pipeline seeds against MS02 ------------------------------
function seedFor(tag) {
  let h = (2166136261 ^ SEED) >>> 0;
  for (let k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
  return h;
}
let keysChecked = 0;
let keysEqual = 0;
doneCells.forEach((cell) => {
  newOf[cell.key].rows.forEach((row, i) => {
    const old = oldOf[cell.key].rows[i];
    keysChecked++;
    const want = ROUTE[cell.variant] === 'pipeline' ? seedFor(row.tag) : null;
    const same = row.index === old.index && row.tag === old.tag && row.variant === old.variant &&
      row.requested === old.requested && row.pipelineSeed === old.pipelineSeed && row.pipelineSeed === want;
    if (same) keysEqual++;
  });
  const route = newOf[cell.key].shards[0].ledger.meta.manifest.cells[0].route;
  check('new ' + cell.name + ': route ' + ROUTE[cell.variant], route === ROUTE[cell.variant], route);
});
check('request keys: tag, variant, level, index and pipeline seed equal MS02 and `seedFor` (' +
  keysChecked + ' rows)', keysChecked > 0 && keysEqual === keysChecked, keysEqual + ' of ' + keysChecked);

// ---- every raw summary.checks of every shard, and the row-level invariants ----------------------------
const shardChecks = [];
allShards.forEach((s) => {
  const c = s.ledger.summary.checks;
  const inv = sum(Object.keys(c.invariantViolations).map((k) => c.invariantViolations[k]));
  shardChecks.push({
    id: s.entry.id, result: c.result, requestErrors: c.requestErrors, invariants: inv,
    checkErrors: c.checkErrors.length, referenceErrors: c.referenceErrors, pathErrors: c.pathErrors,
    pathMismatches: c.pathMismatches, workUnavailable: c.workUnavailable, complete: s.ledger.complete
  });
  const detail = c.result + (c.checkErrors.length ? ': ' + c.checkErrors.slice(0, 2).join(' | ') : '');
  check('shard ' + s.entry.id + ': summary.checks PASS, complete',
    c.result === 'PASS' && s.ledger.complete === true, detail);
});
const newRows = [].concat(...doneCells.map((cell) => newOf[cell.key].rows));
const countBad = (pick) => newRows.filter((r) => !pick(r)).length + ' rows differ';
const rowOk = (r) => r.outcome === 'ok' && r.solved === true && r.ratingVersion === EXPECT_RATING;
const flagOk = (r) => (r.generationExact === true) === (r.qualifiedHit === true);
const workOk = (r) => !!r.workCheck && r.workCheck.status === 'ok';
const pathOk = (r) => !!r.pathCheck && r.pathCheck.status === 'ok';
const refOk = (r) => (REFERENCE_INDEXES.indexOf(r.index) !== -1) === (r.referenceStatus !== 'not-selected');
const verdictOk = (r) => category(r) !== 'unverdicted';
const nonEmpty = newRows.length > 0;
check('new rows: no request error, solved, rating version ' + EXPECT_RATING,
  nonEmpty && newRows.every(rowOk), countBad(rowOk));
check('new rows: generator flag equals the derived certificate in every row',
  nonEmpty && newRows.every(flagOk), countBad(flagOk));
check('new rows: work conservation ok in every row', nonEmpty && newRows.every(workOk), countBad(workOk));
check('new rows: final path ok in every row', nonEmpty && newRows.every(pathOk), countBad(pathOk));
check('new rows: a sampled reference only at logical indexes 0 and 11',
  nonEmpty && newRows.every(refOk), countBad(refOk));
check('new rows: every in-band row has a derived verdict', nonEmpty && newRows.every(verdictOk),
  countBad(verdictOk));

// ---- tool summary cross-check (the pure `summaryOf` on the merged rows) -------------------------------
doneCells.forEach((cell) => {
  const rows = newOf[cell.key].rows;
  const s = D.summaryOf(rows);
  const mine = {
    exact: rows.filter((r) => category(r) === 'exact').length,
    shallow: rows.filter((r) => category(r) === 'shallow').length,
    inBand: rows.filter((r) => r.scoreHit).length
  };
  const exactCohort = cohortOf(rows.filter((r) => r.generationExact === true));
  const bandCohort = cohortOf(rows.filter((r) => r.scoreHit === true));
  const agree = s.qualifiedHits.count === mine.exact && s.shallow.count === mine.shallow &&
    s.inBand === mine.inBand && sameJson(s.cohorts.exact.adjusted, exactCohort.adjusted) &&
    sameJson(s.cohorts.inBand.raw, bandCohort.raw);
  check('summaryOf cross-check ' + cell.name + ': qualified, shallow, in band, cohorts', agree,
    JSON.stringify(mine));
});

// ==========================================================================================================
// The tables
// ==========================================================================================================
const result = { cells: {}, totals: {}, checks: checks, transitions: [], readiness: [], target: [] };
out.push('# GS-after: the final matched soak against the MS02 baseline (generated by report.cjs)');
out.push('');
out.push('Old = the 17 original MS02 ledgers, read as stored (rating v2, the pre-order code, every row ' +
  'independently referenced). New = the 17 cells of this task on the current source, merged per cell ' +
  'with `mergeShards`. Every figure is computed from raw rows. Seconds are of a shared Windows machine: ' +
  'indicative only, never a GP result. **Every MS18a timing is "' + admission.LABEL + '"** (MS18a-Q1: the ' +
  'raw strict screen is recorded for every command and the named admission policy decided each launch). ' +
  '**MS02 ran while the Pentomino repository ran quick tests and ' +
  'recorded no quiet-machine metadata, so its times are historical and are not a quiet-machine ' +
  'guarantee or a v3 launch bound.**');
out.push('');
const missingCells = CELLS.filter((c) => !newOf[c.key].complete).map(label).join(', ');
out.push('Cells complete in the new data: **' + doneCount + ' of 17**' +
  (doneCount === 17 ? '.' : ' (missing: ' + missingCells + '). **The matrix is incomplete: sections 2-9 ' +
    'and the pooled figures cover the complete cells only, never a partial cell** (see sections 11 and ' +
    '13).'));

// ---- 1. identity --------------------------------------------------------------------------------------
heading('## 1. Identity and configuration');
const oldMeta = oldOf['classic9/normal'].ledger.meta;
const have = allShards.length > 0;
const one = (list) => (list.length === 1 ? list[0].replace(/"/g, '') : list.join(' ; '));
const short = (list) => '`' + one(list).slice(0, 16) + '...`';
const machineOf = (m) => m.cpuModel + ', ' + m.cpus + ' logical';
const commitCell = () => identity.commit.map((c) => c.replace(/"/g, '')).map((c) => '`' + c.slice(0, 8) +
  '` (' + metas.filter((m) => m.commit === c).length + ' shards)').join(', ');
table(['Item', 'Old (MS02)', 'New (this task)'], [
  ['Commit', '`' + oldMeta.commit.slice(0, 8) + '`', have ? commitCell() : 'n/a'],
  ['Dirty (the tool\'s own flag)', String(oldMeta.dirty) + ' (task-pack and MS02 tooling files)',
    have ? one(identity.dirty) : 'n/a'],
  ['Source hash (SOURCE_FILES)', '`' + oldMeta.sourceHash.slice(0, 16) + '...`',
    have ? short(identity.sourceHash) : 'n/a'],
  ['Tool hash', 'not recorded in MS02', have ? short(identity.toolHash) : 'n/a'],
  ['Node', oldMeta.node, have ? one(identity.node) : 'n/a'],
  ['Machine', machineOf(oldMeta.machine), have ? machineOf(metas[0].machine) : 'n/a'],
  ['Rating version', String(oldMeta.manifest.ratingVersion), have ? one(identity.ratingVersion) : 'n/a'],
  ['Seed, count', oldMeta.seedBase + ', 12 per cell',
    have ? one(identity.seedBase) + ', 12 per cell' : 'n/a'],
  ['Shallow allowance (R5)', 'n/a (not exposed)', have ? one(identity.shallowSearchRatings) : 'n/a'],
  ['Short-chain cutoff C', 'n/a (not exposed)', have ? one(identity.chainShortMax) : 'n/a'],
  ['Acceptance marker', 'none (verdicts of the reference)', have ? one(identity.acceptance) : 'n/a'],
  ['Independent references', 'all 204 requests', '34 requests: logical indexes 0 and 11 of every cell'],
  ['Reference + final-path budget', '120000 ms per request',
    have ? one(identity.referenceBudgetMs) + ' ms per request' : 'n/a']
]);

// ---- 2. hits ------------------------------------------------------------------------------------------
heading('## 2. Hits (denominator: all 12 requests of the cell)');
out.push('Old exact = the stored `qualifiedHit` rows (the reference-qualified cohort); the old score-only ' +
  'hit column is the old gate and is shown only so nobody compares it with required exactness. **Baseline ' +
  'Hell 1 was vacuous** (its tier was empty: `required: true` without a solve; its adjusted position is ' +
  'undefined `empty-tier`), so its 12 old qualified hits are the 12 in-band ones, not a measured ' +
  'requiredness. New exact = the derived required-tier certificate (`qualifiedHit`, which equals the ' +
  'generator flag in every row).');
out.push('');
const tally = (rows) => ({
  exact: rows.filter((r) => category(r) === 'exact').length,
  shallow: rows.filter((r) => category(r) === 'shallow').length,
  miss: rows.filter((r) => category(r) === 'miss').length,
  band: rows.filter((r) => r.scoreHit === true).length,
  scoreOnly: rows.filter((r) => r.generationExact === true).length
});
const KEYS = ['exact', 'shallow', 'miss', 'band', 'scoreOnly'];
const zero = () => ({ exact: 0, shallow: 0, miss: 0, band: 0, scoreOnly: 0 });
const total = { old: zero(), new: zero(), oldNoHell: zero(), newNoHell: zero() };
const hitRows = [];
doneCells.forEach((cell) => {
  const co = tally(oldOf[cell.key].rows);
  const cn = tally(newOf[cell.key].rows);
  result.cells[cell.key] = { old: co, new: cn };
  KEYS.forEach((k) => {
    total.old[k] += co[k];
    total.new[k] += cn[k];
    if (!cell.hell) {
      total.oldNoHell[k] += co[k];
      total.newNoHell[k] += cn[k];
    }
  });
  const d = cn.exact - co.exact;
  hitRows.push([label(cell) + (cell.hell ? ' (old vacuous)' : ''), String(co.exact), String(cn.exact),
    signed(d) + (d < 0 ? ' LOSS' : d > 0 ? ' gain' : ''), String(co.band), String(cn.band),
    String(co.scoreOnly), String(co.shallow), String(cn.shallow), String(co.miss), String(cn.miss)]);
});
hitRows.push(['**Total (' + doneCount * 12 + ')**', String(total.old.exact), String(total.new.exact),
  signed(total.new.exact - total.old.exact), String(total.old.band), String(total.new.band),
  String(total.old.scoreOnly), String(total.old.shallow), String(total.new.shallow),
  String(total.old.miss), String(total.new.miss)]);
table(['Cell', 'Old exact (qualified)', 'New exact', 'Change', 'Old in band', 'New in band',
  'Old score-only hits (not comparable)', 'Old shallow', 'New shallow', 'Old miss', 'New miss'], hitRows);
const nNoHell = (doneCount - CELLS.filter((c) => c.hell && newOf[c.key].complete).length) * 12;
out.push('Excluding classic9 Hell 1 (the vacuous old tier): old exact **' + total.oldNoHell.exact + '/' +
  nNoHell + '**, new exact **' + total.newNoHell.exact + '/' + nNoHell + '** (' +
  signed(total.newNoHell.exact - total.oldNoHell.exact) + ').');
out.push('');
out.push('Shallow share (shallow over the solved in-band puzzles): old **' + total.old.shallow + '/' +
  total.old.band + ' (' + pct(total.old.shallow, total.old.band) + ')**, new **' + total.new.shallow +
  '/' + total.new.band + ' (' + pct(total.new.shallow, total.new.band) + ')**; excluding Hell 1: old ' +
  total.oldNoHell.shallow + '/' + total.oldNoHell.band + ' (' +
  pct(total.oldNoHell.shallow, total.oldNoHell.band) + '), new ' + total.newNoHell.shallow + '/' +
  total.newNoHell.band + ' (' + pct(total.newNoHell.shallow, total.newNoHell.band) + ').');
out.push('');
result.totals.hits = total;

// ---- 3. request-level transitions ---------------------------------------------------------------------
heading('## 3. Request-level outcomes (the same request key before and after)');
const CATS = ['exact', 'shallow', 'miss'];
const matrix = {};
const lost = [];
const gained = [];
const bandLost = [];
doneCells.forEach((cell) => {
  newOf[cell.key].rows.forEach((nr, i) => {
    const or = oldOf[cell.key].rows[i];
    const oc = category(or);
    const nc = category(nr);
    bump(matrix, oc + '>' + nc);
    const move = {
      tag: nr.tag, old: oc, new: nc, oldScore: or.score, newScore: nr.score, oldAchieved: or.achieved,
      newAchieved: nr.achieved, oldMs: or.generationMs, newMs: nr.generationMs, oldFull: or.fullRatings,
      newFull: nr.fullRatings, newAttempts: nr.work ? nr.work.length : null,
      oldVacuous: or.referenceStatus === 'vacuous', samePuzzle: or.puzzleHash === nr.puzzleHash
    };
    if (oc === 'exact' && nc !== 'exact') lost.push(move);
    if (oc !== 'exact' && nc === 'exact') gained.push(move);
    if (or.scoreHit === true && nr.scoreHit !== true) bandLost.push(move);
    result.transitions.push(move);
  });
});
table(['Old \\ new', 'exact', 'shallow', 'miss'],
  CATS.map((oc) => [oc].concat(CATS.map((nc) => String(matrix[oc + '>' + nc] || 0)))));
const lostVacuous = lost.filter((x) => x.oldVacuous);
out.push('Old exact requests that are **not exact now: ' + lost.length + '** (' + lostVacuous.length +
  ' of them are classic9 Hell 1 requests whose old hit was vacuous; **' +
  (lost.length - lostVacuous.length) + '** others). Requests that are exact now and were not: **' +
  gained.length + '**. Old in-band requests that are not in band now: **' + bandLost.length + '**.');
out.push('');
const moveRow = (x) => [x.tag + (x.oldVacuous ? ' (old vacuous)' : ''), x.old + ', ' + x.oldScore,
  x.new + ', ' + x.newScore, f(x.oldMs / 1000) + ' -> ' + f(x.newMs / 1000), x.oldFull + ' -> ' + x.newFull,
  x.newAttempts === null ? 'n/a' : String(x.newAttempts), x.samePuzzle ? 'same' : 'different'];
const moveHead = ['Request', 'Before (score)', 'After (score)', 'Generation s', 'Full ratings',
  'Attempts after', 'Puzzle'];
out.push('### Losses: old exact, not exact now (none is dropped)', '');
table(moveHead, lost.map(moveRow));
out.push('### Gains: not exact before, exact now', '');
table(moveHead, gained.map(moveRow));
if (bandLost.length > 0) {
  out.push('### In band before, not in band now', '');
  table(moveHead, bandLost.map(moveRow));
}
let samePuzzles = 0;
doneCells.forEach((cell) => newOf[cell.key].rows.forEach((nr, i) => {
  if (nr.puzzleHash === oldOf[cell.key].rows[i].puzzleHash) samePuzzles++;
}));
out.push('Requests whose returned puzzle is byte-for-byte the MS02 puzzle (equal `puzzleHash`): **' +
  samePuzzles + ' of ' + doneCount * 12 + '**. The tags and seeds are the same; the puzzles are mostly ' +
  'not, because the source (solver, tier, cutoff, target) changed.');
out.push('');
result.totals.matrix = matrix;
result.totals.samePuzzle = samePuzzles;

// ---- 4. every non-exact request after -----------------------------------------------------------------
heading('## 4. Every request that is not exact now (none is dropped)');
const rest = [];
doneCells.forEach((cell) => newOf[cell.key].rows.forEach((nr, i) => {
  if (category(nr) === 'exact') return;
  const or = oldOf[cell.key].rows[i];
  const outcome = category(nr) + (category(nr) === 'miss' ? ' (' + (nr.achieved || 'unrated') + ')' : '');
  rest.push([nr.tag, outcome + ', ' + nr.score, f(nr.generationMs / 1000),
    nr.work ? String(nr.work.length) : 'n/a', String(nr.fullRatings),
    finite(nr.target) ? f(nr.target, 1) : 'null', category(or) + ', ' + or.score]);
}));
table(['Request', 'Outcome (score)', 'Time s', 'Attempts', 'Full ratings', 'Target', 'Before'], rest);
result.totals.nonExact = rest.length;

// ---- 5. cohorts ---------------------------------------------------------------------------------------
heading('## 5. Cohorts: exact and all-in-band, separately (positions as stored: raw and adjusted)');
out.push('R23: the shallow share is over the solved in-band puzzles, not over the exact ones; the exact ' +
  'cohort and the all-in-band cohort have separate counts and distributions, and "hugs the top" is ' +
  'judged on the exact cohort\'s attainable (adjusted) position. Each cell shows `min / upper median / ' +
  'max` over the cohort (the full deciles are in `comparison.json`); null adjusted reasons are listed. ' +
  'Old positions use the weights and limits stored in the old rows; nothing is recomputed with today\'s ' +
  'weights. Unclamped values stay as computed; there is no global-minimum or uniformity guarantee (AC01).');
out.push('');
const pooled = { oldExact: [], newExact: [], oldBand: [], newBand: [] };
const exactRows = [];
const bandRows = [];
doneCells.forEach((cell) => {
  const o = oldOf[cell.key].rows;
  const n = newOf[cell.key].rows;
  const sets = {
    oldExact: o.filter((r) => r.qualifiedHit === true), oldBand: o.filter((r) => r.scoreHit === true),
    newExact: n.filter((r) => r.generationExact === true), newBand: n.filter((r) => r.scoreHit === true)
  };
  const c = {};
  Object.keys(sets).forEach((k) => {
    c[k] = cohortOf(sets[k]);
    pooled[k] = pooled[k].concat(sets[k]);
  });
  result.cells[cell.key].cohorts = c;
  exactRows.push([label(cell), String(c.oldExact.n), statText(c.oldExact.adjusted), String(c.newExact.n),
    statText(c.newExact.adjusted), reasonsText(c.oldExact.nullReasons) + ' -> ' +
      reasonsText(c.newExact.nullReasons)]);
  bandRows.push([label(cell), String(c.oldBand.n), statText(c.oldBand.raw), statText(c.oldBand.adjusted),
    String(c.newBand.n), statText(c.newBand.raw), statText(c.newBand.adjusted),
    reasonsText(c.oldBand.nullReasons) + ' -> ' + reasonsText(c.newBand.nullReasons)]);
});
out.push('### Exact cohort (old: stored `qualifiedHit` rows; new: exact rows), adjusted position', '');
table(['Cell', 'Old n', 'Old adjusted min / median / max', 'New n', 'New adjusted min / median / max',
  'Adjusted undefined, old -> new'], exactRows);
out.push('### All-in-band cohort (solved in the requested band), raw and adjusted position', '');
table(['Cell', 'Old n', 'Old raw min / median / max', 'Old adjusted min / median / max', 'New n',
  'New raw min / median / max', 'New adjusted min / median / max', 'Adjusted undefined, old -> new'],
bandRows);
const pc = {};
Object.keys(pooled).forEach((k) => { pc[k] = cohortOf(pooled[k]); });
result.totals.pooledCohorts = pc;
const decileText = (s) => (s.n === 0 ? 'none' : s.deciles.map((v) => f(v, 3)).join(' '));
const pooledRow = (name, c) =>
  [name, String(c.adjusted.n), decileText(c.adjusted), f(c.adjusted.upperMedian, 3)];
out.push('### Pooled over the cells (computed from the raw rows, never from per-cell percentiles)', '');
table(['Cohort', 'n with a defined adjusted position', 'Adjusted deciles (min, p10 ... p90, max)',
  'Upper median'], [pooledRow('Old exact (qualified)', pc.oldExact), pooledRow('New exact', pc.newExact),
  pooledRow('Old in band', pc.oldBand), pooledRow('New in band', pc.newBand)]);
out.push('The pools mix cells with different cohort sizes and the old Hell 1 cell has no adjusted ' +
  'position, so they describe the samples, not a rate.');
out.push('');

// ---- 6. time ------------------------------------------------------------------------------------------
heading('## 6. Generation, diagnostic and process time (descriptive; see the caveat at the top)');
const baselinePath = path.join(REPO, 'docs/difficulty-v3/baseline.md');
const baselineText = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath, 'utf8') : '';
const oldWall = {};
baselineText.split(/\r?\n/).forEach((line) => {
  const m = /^\| (\w+) (\w+) \| 12 \|.*\| ([0-9.]+) \| ([0-9.]+) \|$/.exec(line);
  if (m) oldWall[m[1] + '/' + m[2]] = { soak: Number(m[3]), wall: Number(m[4]) };
});
function transcriptOf(id) {
  const file = path.join(NEW, 'logs', id + '.txt');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const soak = /puzzles in ([0-9.]+) s/.exec(text);
  const diag = /diagnostic solves took ([0-9.]+) s/.exec(text);
  const exit = /^exit=(\d+) seconds=([0-9.]+)/m.exec(text);
  return {
    soak: soak ? Number(soak[1]) : null, diag: diag ? Number(diag[1]) : null,
    exit: exit ? Number(exit[1]) : null, seconds: exit ? Number(exit[2]) : null
  };
}
function startedTranscriptId(id) {
  const second = path.join(NEW, 'readiness', id + '-admission2.json');
  return fs.existsSync(second) && readJson(second).payloadStartedAt ? id + '-admission2' : id;
}
const times = { oldGen: 0, newGen: 0, oldDiag: 0, newDiag: 0, newProc: 0 };
const timeRows = [];
doneCells.forEach((cell) => {
  const to = timeStats(oldOf[cell.key].rows);
  const tn = timeStats(newOf[cell.key].rows);
  const od = sum(oldOf[cell.key].rows.map((r) => r.diagnosticMs));
  const nd = sum(newOf[cell.key].rows.map((r) => r.diagnosticMs));
  const tr = newOf[cell.key].entries.map((e) => transcriptOf(startedTranscriptId(e.id)));
  const soak = tr.every((t) => t && finite(t.soak)) ? sum(tr.map((t) => t.soak)) : null;
  const proc = tr.every((t) => t && finite(t.seconds)) ? sum(tr.map((t) => t.seconds)) : null;
  times.oldGen += to.sum;
  times.newGen += tn.sum;
  times.oldDiag += od;
  times.newDiag += nd;
  if (proc !== null) times.newProc += proc;
  const ow = oldWall[cell.key] || null;
  result.cells[cell.key].time = {
    old: to, new: tn, oldDiagMs: od, newDiagMs: nd, newSoakSeconds: soak, newProcessSeconds: proc, oldWall: ow
  };
  timeRows.push([label(cell), f(to.sum), f(tn.sum), to.sum > 0 ? f(tn.sum / to.sum) + 'x' : 'n/a',
    f(to.mean) + ' -> ' + f(tn.mean), f(to.upperMedian) + ' -> ' + f(tn.upperMedian),
    f(to.max) + ' -> ' + f(tn.max), f(od / 1000, 3) + ' -> ' + f(nd / 1000, 3),
    (ow ? f(ow.soak, 1) : 'n/a') + ' -> ' + f(soak, 1), (ow ? f(ow.wall, 1) : 'n/a') + ' -> ' + f(proc, 1)]);
});
table(['Cell', 'Old gen. s (sum of 12)', 'New gen. s', 'Ratio', 'Mean s', 'Upper median s',
  'Max s (the soak\'s p95 at 12)', 'Diagnostic s (sum)', 'Soak header s', 'Process s'], timeRows);
out.push('Totals: generation old **' + f(times.oldGen) + ' s**, new **' + f(times.newGen) +
  ' s**; diagnostics old ' + f(times.oldDiag / 1000, 3) + ' s, new ' + f(times.newDiag / 1000, 3) +
  ' s; new process seconds (each shard\'s payload, readiness excluded) **' + f(times.newProc, 1) +
  ' s** (the old whole-command total was 176.2 s, historical). "Soak header" is the figure of the soak ' +
  'header (generation and the I1-I7 checks of the requests, without the deferred diagnostics); "process" ' +
  'is the child\'s whole run including the source load. New shards add up; nothing is normalized.');
out.push('');
const slow = [];
const fast = [];
doneCells.forEach((cell) => newOf[cell.key].rows.forEach((nr, i) => {
  const a = oldOf[cell.key].rows[i].generationMs / 1000;
  const b = nr.generationMs / 1000;
  const x = { tag: nr.tag, old: a, new: b };
  if (b > 1.5 * a && b - a >= 0.5) slow.push(x);
  if (a > 1.5 * b && a - b >= 0.5) fast.push(x);
}));
slow.sort((p, q) => (q.new - q.old) - (p.new - p.old));
fast.sort((p, q) => (q.old - q.new) - (p.old - p.new));
const listText = (list) => (list.length === 0 ? 'none' :
  list.map((x) => x.tag + ' (' + f(x.old) + ' -> ' + f(x.new) + ' s)').join(', '));
out.push('Requests more than 1.5x slower and 0.5 s or more slower than the matched MS02 request: **' +
  slow.length + ' of ' + doneCount * 12 + '**: ' + listText(slow) + '.');
out.push('');
out.push('Requests more than 1.5x faster and 0.5 s or more faster: **' + fast.length + '**: ' +
  listText(fast) + '.');
out.push('');
result.totals.times = times;
result.totals.slow = slow;
result.totals.fast = fast;
const slowest = newRows.slice().sort((a, b) => b.generationMs - a.generationMs).slice(0, 8);
out.push('The eight slowest new requests: ' + slowest.map((r) => r.tag + ' ' +
  f(r.generationMs / 1000) + ' s (' + category(r) + ')').join('; ') + '.');
out.push('');

// ---- 7. work and caps ---------------------------------------------------------------------------------
heading('## 7. Work and caps (counters the old code did not expose are n/a, never zero)');
function workOf(rows) {
  const known = rows.filter((r) => Array.isArray(r.work));
  const w = {
    requests: rows.length, workKnown: known.length, attempts: 0, maxAttempts: null, withEight: 0,
    proposals: 0, localRatings: 0, shallowRatings: 0, localSearches: 0, capShallow: 0, capRatings: 0,
    capProposals: 0, requestsWithCap: 0,
    fullRatings: D.statsOf(rows.filter((r) => finite(r.fullRatings)).map((r) => r.fullRatings))
  };
  known.forEach((r) => {
    w.attempts += r.work.length;
    w.maxAttempts = Math.max(w.maxAttempts === null ? 0 : w.maxAttempts, r.work.length);
    if (r.work.length === 8) w.withEight++;
    r.work.forEach((a) => { w.localSearches += a.localSearches.length; });
    w.proposals += finite(r.proposals) ? r.proposals : 0;
    w.localRatings += finite(r.localRatings) ? r.localRatings : 0;
    w.shallowRatings += finite(r.shallowRatings) ? r.shallowRatings : 0;
    if (r.capHits) {
      w.capShallow += r.capHits.shallow;
      w.capRatings += r.capHits.ratings;
      w.capProposals += r.capHits.proposals;
      if (r.capHits.shallow + r.capHits.ratings + r.capHits.proposals > 0) w.requestsWithCap++;
    }
  });
  return w;
}
const fullText = (s) => (s.n === 0 ? 'n/a' : s.deciles[0] + '/' + s.upperMedian + '/' + s.deciles[10]);
const workTotal = {
  fullOld: 0, fullNew: 0, attempts: 0, localSearches: 0, capShallow: 0, capRatings: 0, capProposals: 0,
  requestsWithCap: 0, eight: 0
};
const workRows = [];
doneCells.forEach((cell) => {
  const wo = workOf(oldOf[cell.key].rows);
  const wn = workOf(newOf[cell.key].rows);
  const fo = sum(oldOf[cell.key].rows.map((r) => r.fullRatings));
  const fn = sum(newOf[cell.key].rows.map((r) => r.fullRatings));
  result.cells[cell.key].work = { old: wo, new: wn };
  workTotal.fullOld += fo;
  workTotal.fullNew += fn;
  ['attempts', 'localSearches', 'capShallow', 'capRatings', 'capProposals', 'requestsWithCap']
    .forEach((k) => { workTotal[k] += wn[k]; });
  workTotal.eight += wn.withEight;
  const attempts = wn.workKnown === 12 ?
    wn.attempts + ' (max ' + wn.maxAttempts + '; ' + wn.withEight + ' requests at 8)' : 'n/a';
  workRows.push([label(cell), fo + ' (' + fullText(wo.fullRatings) + ')',
    fn + ' (' + fullText(wn.fullRatings) + ')',
    attempts, String(wn.localSearches), String(wn.proposals),
    wn.capShallow + ' / ' + wn.capRatings + ' / ' + wn.capProposals, wn.requestsWithCap + ' of 12']);
});
table(['Cell', 'Old full ratings (min/median/max)', 'New full ratings (min/median/max)',
  'New attempts (sum)', 'New local searches', 'New proposals',
  'Local searches ended by allowance / rating cap / proposal cap', 'Requests with any cap'], workRows);
out.push('Totals: full ratings old **' + workTotal.fullOld + '**, new **' + workTotal.fullNew +
  '**; new attempts ' + workTotal.attempts + ', local searches ' + workTotal.localSearches +
  ', ended by the allowance ' + workTotal.capShallow + ' (' +
  pct(workTotal.capShallow, workTotal.localSearches) + ' of the searches), rating cap ' +
  workTotal.capRatings + ', proposal cap ' + workTotal.capProposals + '; requests with any cap ' +
  workTotal.requestsWithCap + ' of ' + doneCount * 12 + '; requests that used all eight attempts ' +
  workTotal.eight + '. The old rows expose no attempts, proposals, local-search or cap counters (n/a, not ' +
  'zero); their `fullRatings` is the old count of ratings of the generation. The allowance is the ' +
  'shallow-search allowance of R5 (256 at this source); a cap hit is a local search that stopped, not a ' +
  'lost puzzle.');
out.push('');
result.totals.work = workTotal;

// ---- 8. targets ---------------------------------------------------------------------------------------
heading('## 8. Targets and deviations (new rows only: the 204 old rows have `target: null`)');
out.push('Target position `tp = (target - min) / (max - min)` of the band stored in the row; deviation ' +
  '`d = raw position - tp` in band widths (positive: the puzzle is above its target). Only solved ' +
  'in-band rows with a finite target and a finite raw position are counted; a missing target is null, ' +
  'never zero. Descriptive: the deviation is not a pass/fail quantity.');
out.push('');
function deviationOf(rows) {
  const ds = [];
  rows.forEach((r) => {
    const p = r.position;
    const usable = r.scoreHit === true && p && finite(p.raw) && finite(r.target) && p.inputs &&
      finite(p.inputs.min) && finite(p.inputs.max);
    if (!usable) return;
    const tp = (r.target - p.inputs.min) / (p.inputs.max - p.inputs.min);
    ds.push({ tp: tp, raw: p.raw, d: p.raw - tp });
  });
  const abs = ds.map((x) => Math.abs(x.d)).sort((a, b) => a - b);
  return {
    n: ds.length, meanTarget: mean(ds.map((x) => x.tp)), meanRaw: mean(ds.map((x) => x.raw)),
    meanSigned: mean(ds.map((x) => x.d)), meanAbs: mean(abs),
    upperMedianAbs: abs.length ? abs[Math.floor(abs.length / 2)] : null,
    maxAbs: abs.length ? abs[abs.length - 1] : null
  };
}
const targetRows = [];
doneCells.forEach((cell) => {
  const rows = newOf[cell.key].rows;
  const all = deviationOf(rows);
  const exact = deviationOf(rows.filter((r) => r.generationExact === true));
  const finiteTargets = rows.filter((r) => finite(r.target)).length;
  result.cells[cell.key].target = { finiteTargets: finiteTargets, inBand: all, exact: exact };
  targetRows.push([label(cell), finiteTargets + ' of 12', String(all.n), f(all.meanTarget, 3),
    f(all.meanRaw, 3), f(all.meanSigned, 3), f(all.meanAbs, 3), f(all.upperMedianAbs, 3),
    f(all.maxAbs, 3), String(exact.n), f(exact.meanSigned, 3), f(exact.meanAbs, 3)]);
});
table(['Cell', 'Finite targets', 'In-band n', 'Mean target pos.', 'Mean puzzle pos.', 'Mean signed d',
  'Mean abs d', 'Upper median abs d', 'Max abs d', 'Exact n', 'Exact mean signed d', 'Exact mean abs d'],
targetRows);

// ---- 9. references ------------------------------------------------------------------------------------
heading('## 9. References');
const oldRef = {};
const oldRows = [].concat(...doneCells.map((cell) => oldOf[cell.key].rows));
oldRows.forEach((r) => bump(oldRef, r.referenceStatus));
const oldAgree = oldRows.filter((r) => r.referenceStatus === 'ok' &&
  r.referenceRequired === r.required).length;
const newRef = {};
newRows.forEach((r) => bump(newRef, r.referenceStatus));
const refRows = newRows.filter((r) => r.referenceStatus === 'ok' || r.referenceStatus === 'vacuous');
const refAgree = refRows.filter((r) => r.referenceRequired === r.required).length;
const refDisagree = refRows.filter((r) => r.referenceRequired !== r.required);
const disagreeText = refDisagree.length === 0 ? ' (no disagreement)' : '; disagreements: ' +
  refDisagree.map((r) => r.tag + ' (reference ' + r.referenceRequired + ', derived ' + r.required + ')')
    .join(', ');
out.push('MS02 referenced **every** row independently (`referenceStatus`: ' + reasonsText(oldRef) +
  '; the old verdicts came from the reference, and on the ' + (oldRef.ok || 0) + ' `ok` rows the stored ' +
  '`referenceRequired` equals the stored `required` in ' + oldAgree + '). The current tool **derives ' +
  'requiredness for every row** from the returned canonical rating and references independently only ' +
  'logical indexes **0 and 11** of each cell (34 requests), under the unchanged 120000 ms reference and ' +
  'final-path budget; the sampling is not broadened. New `referenceStatus` over the ' + newRows.length +
  ' rows: ' + reasonsText(newRef) + '. On the ' + refRows.length + ' referenced rows the independent ' +
  'reference agrees with the derived verdict in **' + refAgree + '**' + disagreeText + '. The new counts ' +
  'therefore rest on the derived certificate for the other ' + (newRows.length - refRows.length) +
  ' rows.');
out.push('');
result.totals.references = {
  old: oldRef, oldAgree: oldAgree, new: newRef, newAgree: refAgree, newReferenced: refRows.length,
  disagreements: refDisagree.map((r) => r.tag)
};

// ---- 10. raw checks -----------------------------------------------------------------------------------
heading('## 10. Every raw `summary.checks` of every shard (a captured failure is not a lost record)');
table(['Shard', 'Result', 'Request errors', 'Invariant violations', 'Check errors', 'Reference errors',
  'Final-path errors', 'Final-path mismatches', 'Work unavailable', 'Complete'],
shardChecks.map((c) => [c.id, c.result, String(c.requestErrors), String(c.invariants),
  String(c.checkErrors), String(c.referenceErrors), String(c.pathErrors), String(c.pathMismatches),
  String(c.workUnavailable), String(c.complete)]));
result.totals.shardChecks = shardChecks;

// ---- 11. readiness and lock status --------------------------------------------------------------------
heading('## 11. Readiness (strict screen, MS18a-Q1 admission) and process status of every timed command');
const tally11 = { n: 0, strictFailed: 0, admitted: 0 };
const readyRows = [];
const lockLogFile = path.join(NEW, 'lock-log.jsonl');
const lockLog = fs.existsSync(lockLogFile) ?
  fs.readFileSync(lockLogFile, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
const clock = (iso) => (iso ? iso.slice(11, 19) : '-');
const attemptsOfEntry = {};
CELLS.forEach((cell) => newOf[cell.key].entries.forEach((entry) => ['', '-admission2'].forEach((suffix) => {
  const rid = entry.id + suffix;
  const file = path.join(NEW, 'readiness', rid + '.json');
  if (!fs.existsSync(file)) return;
  const r = readJson(file);
  const log = lockLog.filter((x) => x.id === rid);
  const last = log[log.length - 1];
  const own = r.locks && r.locks.own ? r.locks.own : {};
  const lockedAt = typeof own.content === 'string' ? own.content.split('|')[2] : null;
  const win = r.intervals ? [r.intervals[0].start, r.intervals[r.intervals.length - 1].end] : null;
  result.readiness.push({
    id: rid, entry: entry.id, attempt: suffix === '' ? 1 : 2, ready: r.ready, mean: r.meanBusyCores,
    max: r.maxBusyCores, cpus: r.logicalCpus,
    reasons: r.reasons, payloadExit: r.payloadExit === undefined ? null : r.payloadExit,
    payloadSeconds: r.payloadSeconds === undefined ? null : r.payloadSeconds, lockedAtUtc: lockedAt,
    window: win, payloadStartedAt: r.payloadStartedAt || null, payloadEndedAt: r.payloadEndedAt || null,
    readinessSeconds: r.readinessSeconds, foreignLockPresent: r.locks && r.locks.foreign ?
      r.locks.foreign.present : null, lockLogRecords: log.length
  });
  const foreign = last && last.foreignLockSeenAtAsk ?
    'seen, released ' + last.foreignLockReleaseObserved : 'none seen';
  const host = r.hostObservation && finite(r.hostObservation.cpuSeconds) ?
    f(r.hostObservation.cpuSeconds, 2) + ' (' + f(r.hostObservation.cpuSecondsPerSecond, 3) + '/s)' : 'n/a';
  const others = r.processContext ? r.processContext.busiest.filter((p) => !p.host && !p.launchChain)
    .slice(0, 1).map((p) => p.name + ' ' + f(p.perSecond, 3) + '/s').join('') : '';
  const verdict = admission.reportVerdict(r);
  tally11.n++;
  if (r.ready !== true) tally11.strictFailed++;
  if (r.admitted === true) tally11.admitted++;
  result.readiness[result.readiness.length - 1].policy = r.policy || null;
  result.readiness[result.readiness.length - 1].admitted = r.admitted === undefined ? null : r.admitted;
  result.readiness[result.readiness.length - 1].admissionReason = r.admissionReason || null;
  result.readiness[result.readiness.length - 1].host = r.hostObservation || null;
  result.readiness[result.readiness.length - 1].busiest = r.processContext ? r.processContext.busiest : null;
  result.readiness[result.readiness.length - 1].verdict = verdict;
  readyRows.push([rid + (suffix ? ' (attempt 2)' : ''), r.ready ? 'passed' : 'FAILED',
    f(r.meanBusyCores, 3) + ' / ' +
    f(r.maxBusyCores, 3), r.admitted ? 'admitted' : 'HOLD', host, others || '-',
  win ? clock(win[0]) + '-' + clock(win[1]) : 'n/a',
  r.payloadStartedAt ? clock(r.payloadStartedAt) : 'not started', clock(r.payloadEndedAt),
  r.payloadSeconds === undefined ? '-' : f(r.payloadSeconds, 1),
  String(r.payloadExit === undefined ? '-' : r.payloadExit), last ? f(last.waitSeconds, 1) : 'n/a', foreign]);
  if (!attemptsOfEntry[entry.id]) attemptsOfEntry[entry.id] = [];
  attemptsOfEntry[entry.id].push({
    id: rid, ordinal: suffix === '' ? 1 : 2, r: r, verdict: verdict, last: last, host: host, others: others
  });
})));
CELLS.forEach((cell) => newOf[cell.key].entries.forEach((entry) => {
  const list = attemptsOfEntry[entry.id] || [];
  const started = list.filter((a) => a.r.payloadStartedAt);
  if (list.length > 2) check('entry ' + entry.id + ': at most two admission attempts', false, list.length);
  if (started.length === 0) {
    check('entry ' + entry.id + ': executed (an unexecuted gap is not a pass)', false,
      list.length + ' admission attempt(s), the payload never started');
  } else {
    check('entry ' + entry.id + ': named admission (' + admission.POLICY + ') held and payload exit 0',
      started.length === 1 && started[0].verdict.ok === true,
      started.map((a) => a.verdict.reason).join('; '));
  }
}));
out.push('Policy `' + admission.POLICY + '`; environment label for every command: **' + admission.LABEL +
  '**. The strict screen (mean <= 0.5 and max <= 1.0 busy cores of 16, five one-second intervals) is the ' +
  'original verdict and is shown unchanged; `admitted` is the separate result of the named policy (the ' +
  'confirmed host PID 1968 only, no other process at 0.5 CPU-s per second or more over the snapshot ' +
  'window, ' +
  'locks, valid counters). The host column is an observation of that one instance, never subtracted.');
out.push('');
table(['Command', 'Strict screen', 'Mean / max busy cores', 'Admission', 'Host PID 1968 CPU-s (per s)',
  'Busiest other process', 'Window', 'Payload start', 'Payload end', 'Payload s', 'Exit', 'Lock wait s',
  'Foreign lock'], readyRows);
out.push('Commands with a readiness record: **' + tally11.n + '**; strict screen failed in **' +
  tally11.strictFailed + '**; admitted under the policy in **' + tally11.admitted + '**.');
out.push('');

// ---- 11b. MS18a-Q2-ADMISSION --------------------------------------------------------------------------
out.push('### MS18a-Q2-ADMISSION: the logical entries that were held at least once, with every attempt');
out.push('');
const q2Rows = [];
const gapEntries = [];
const attemptText = (a) => {
  if (!a) return '-';
  const released = a.last ? a.last.finished.slice(11, 19) : '-';
  const hold = a.r.admitted ? 'admitted' : 'HOLD: ' + (a.r.admissionHolds || []).join(' / ');
  return hold + '; strict ' + f(a.r.meanBusyCores, 3) + ' / ' + f(a.r.maxBusyCores, 3) + '; released ' +
    released +
    '; `readiness\\' + a.id + '.json`, `logs\\' + a.id + '.txt`';
};
CELLS.forEach((cell) => newOf[cell.key].entries.forEach((entry) => {
  const list = (attemptsOfEntry[entry.id] || []).slice().sort((a, b) => a.ordinal - b.ordinal);
  const executed = list.find((a) => a.r.payloadStartedAt);
  const ledger = fs.existsSync(path.join(NEW, entry.json));
  const ok = executed !== undefined && ledger;
  if (!ok) gapEntries.push({ entry: entry, attempts: list.length });
  if (list.length === 0 || (ok && list.length === 1 && executed.r.admitted)) return;
  let status = 'executed after a re-ask (attempt 2)';
  if (!ok) {
    status = 'UNEXECUTED GAP: ' + list.length + ' admission attempt(s)' +
      (list.length >= 2 ? ', environment-held after two attempts' : ', held, no re-ask yet');
  }
  q2Rows.push([entry.id, entry.requests.join(', '), attemptText(list[0]), attemptText(list[1]), status,
    ok ? '`' + entry.json + '`' : 'no ledger; absolute indexes ' + entry.requests.join(', ') + ' missing']);
}));
table(['Entry', 'Requests', 'Attempt 1', 'Attempt 2 (re-ask, 60 s after the release)', 'Status', 'Ledger'],
  q2Rows);
const gapCount = gapEntries.length;
out.push('Entries of the plan: **' + CELLS.reduce((n, c) => n + newOf[c.key].entries.length, 0) +
  '**; executed with a ledger: **' + (CELLS.reduce((n, c) => n + newOf[c.key].entries.length, 0) - gapCount) +
  '**; unexecuted: **' + gapCount + '**' + (gapCount ? ' (' + gapEntries.map((g) => g.entry.id).join(', ') +
  ')' : '') + '. A held attempt is an environmental hold, not a failed puzzle, and a gap is never filled ' +
  'with ' +
  'an error row, a miss, a zero time or a complete twelve-request distribution.');
out.push('');
const recordedPartial = CELLS.reduce((n, c) => n + (newOf[c.key].partial ?
  newOf[c.key].partial.rows.length : 0), 0);
const recorded = doneCount * 12 + recordedPartial;
out.push('**Recorded outcomes: ' + recorded + ' of the intended 204 requests** (' + doneCount +
  ' complete cells of 12' + (recordedPartial ? ' and ' + recordedPartial +
    ' request(s) of incomplete cells' : '') +
  '). ' + (recorded === 204 && gapCount === 0 ? 'The matrix is complete.' :
    '**The matrix is INCOMPLETE: MS18a-T01 is not satisfied.**'));
out.push('');
result.totals.q2 = { entries: q2Rows.length, gaps: gapEntries.map((g) => g.entry.id), recorded: recorded };

// ---- 12. isolated target comparison retained ----------------------------------------------------------
heading('## 12. The isolated target comparison, retained (MS06a before, MS06d after; not a new experiment)');
out.push('Records: `docs/difficulty-v3/target-scope-2026-11-14.md`, ' +
  '`docs/difficulty-v3/evidence/MS06d/comparison-tables.md` and their 34 original ledgers ' +
  '(`evidence/MS06a/`, `evidence/MS06d/`). MS06a and MS06d are two sources that differ **only** by the ' +
  'target policy; their counts are the generator\'s own exact flag at those sources (rating version 2). ' +
  'The MS02 -> final differences of sections 2-3 include later solver, cutoff and attempt changes as ' +
  'well, so they must **not** be attributed to targeting; only the MS06a -> MS06d column isolates it.');
out.push('');
const t06 = { a: 0, d: 0, o: 0, n: 0 };
const t06Rows = [];
const exactOf = (dir, cell) => {
  const file = path.join(EVID, dir, cell.name + '.json');
  return fs.existsSync(file) ? readJson(file).rows.filter((r) => r.generationExact === true) : null;
};
CELLS.forEach((cell) => {
  const ea = exactOf('MS06a', cell);
  const ed = exactOf('MS06d', cell);
  if (ea === null || ed === null) return;
  const oldQ = oldOf[cell.key].rows.filter((r) => r.qualifiedHit === true).length;
  const newQ = newOf[cell.key].complete ?
    newOf[cell.key].rows.filter((r) => r.generationExact === true).length : null;
  t06.a += ea.length;
  t06.d += ed.length;
  t06.o += oldQ;
  if (newQ !== null) t06.n += newQ;
  result.target.push({
    cell: cell.key, ms02Qualified: oldQ, ms06aExact: ea.length, ms06dExact: ed.length, finalExact: newQ
  });
  t06Rows.push([label(cell), String(oldQ), String(ea.length), String(ed.length),
    signed(ed.length - ea.length), newQ === null ? 'n/a' : String(newQ)]);
});
t06Rows.push(['**Total**', String(t06.o), String(t06.a), String(t06.d), signed(t06.d - t06.a),
  doneCount === 17 ? String(t06.n) : 'n/a']);
table(['Cell', 'MS02 qualified', 'MS06a exact (before target)', 'MS06d exact (target active)',
  'Target effect', 'This task exact'], t06Rows);
const poolDir = (dir) => cohortOf([].concat(...CELLS.map((cell) => exactOf(dir, cell) || [])));
const a06 = poolDir('MS06a');
const d06 = poolDir('MS06d');
out.push('Pooled adjusted exact position, upper median (n with a defined adjusted position): MS06a **' +
  f(a06.adjusted.upperMedian, 3) + '** (' + a06.adjusted.n + '), MS06d **' +
  f(d06.adjusted.upperMedian, 3) + '** (' + d06.adjusted.n + '); this task **' +
  f(pc.newExact.adjusted.upperMedian, 3) + '** (' + pc.newExact.adjusted.n + '). Greater-Than ' +
  'transports but does not consume the target in its first-allowed sign pass (CV6-05), so its three ' +
  'cells are a null effect of targeting by construction.');
out.push('');

// ---- 13. incomplete cells: recorded requests only -----------------------------------------------------
const partialCells = CELLS.filter((c) => !newOf[c.key].complete && newOf[c.key].partial);
heading('## 13. Incomplete cells: the recorded requests only (never a complete twelve-request distribution)');
if (partialCells.length === 0) {
  out.push('None: every cell with a ledger is complete.');
  out.push('');
}
partialCells.forEach((cell) => {
  const p = newOf[cell.key].partial;
  out.push('**' + label(cell) + '**: ' + p.rows.length + ' of 12 requests recorded; absolute indexes ' +
    p.missingIndexes.join(', ') + ' are **unexecuted** (no row, no error row, no time). The rows below ' +
    'are the ' +
    'matched requests that exist; their counts are not the cell\'s 12-request counts and are not in ' +
    'sections ' +
    '2-9 or the pooled figures.');
  out.push('');
  const rows = p.rows.map((nr) => {
    const or = oldOf[cell.key].rows[nr.index];
    return [nr.tag, category(or) + ', ' + or.score + ', ' + f(or.generationMs / 1000) + ' s',
      category(nr) + ', ' + nr.score + ', ' + f(nr.generationMs / 1000) + ' s',
      nr.work ? String(nr.work.length) : 'n/a', String(nr.fullRatings),
      nr.puzzleHash === or.puzzleHash ? 'same' : 'different'];
  });
  table(['Recorded request', 'Old (outcome, score, time)', 'New (outcome, score, time)', 'Attempts',
    'Full ratings',
    'Puzzle'], rows);
  const tl = (list, pick) => list.filter((r) => category(r) === pick).length;
  const oldSame = p.rows.map((nr) => oldOf[cell.key].rows[nr.index]);
  out.push('Over these ' + p.rows.length + ' recorded requests: old exact ' + tl(oldSame, 'exact') +
    ', new exact ' +
    tl(p.rows, 'exact') + '; old shallow ' + tl(oldSame, 'shallow') + ', new shallow ' +
    tl(p.rows, 'shallow') +
    '; old miss ' + tl(oldSame, 'miss') + ', new miss ' + tl(p.rows, 'miss') + '.');
  out.push('');
  result.cells[cell.key] = Object.assign(result.cells[cell.key] || {}, {
    partial: { recorded: p.rows.length, missingIndexes: p.missingIndexes,
      oldExact: tl(oldSame, 'exact'), newExact: tl(p.rows, 'exact') }
  });
});

// ---- checks and the end -------------------------------------------------------------------------------
heading('## 14. Checks of the reporter (a failed check is a finding to read, not a rewritten record)');
const failedChecks = checks.filter((c) => !c.ok);
out.push(checks.length + ' checks, **' + (checks.length - failedChecks.length) + ' pass, ' +
  failedChecks.length + ' fail**.');
out.push('');
failedChecks.forEach((c) => out.push('- FAIL: ' + c.label + (c.detail ? ' -- ' + c.detail : '')));
if (failedChecks.length > 0) out.push('');
result.totals.failedChecks = failedChecks.length;
result.totals.cellsComplete = doneCount;

const text = out.join('\r\n') + '\r\n';
if (OUT_MD) fs.writeFileSync(path.resolve(OUT_MD), text.replace(/[ \t]+\r\n/g, '\r\n'), 'utf8');
if (OUT_JSON) {
  const json = JSON.stringify(result, null, 2).replace(/\n/g, '\r\n') + '\r\n';
  fs.writeFileSync(path.resolve(OUT_JSON), json, 'utf8');
}
if (!OUT_MD) console.log(out.join('\n'));
console.log('report: ' + doneCount + ' of 17 cells complete; ' + checks.length + ' checks, ' +
  failedChecks.length + ' failed');
process.exitCode = failedChecks.length === 0 && doneCount === 17 ? 0 : 1;
