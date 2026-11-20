'use strict';

/*
 * MS05r6a fix round (IR10): one diagnostic request of the regression-hash corpus outside E. It generates the puzzle of one
 * (variant, level, seed) with the route and the hash of tests/perf.js (`SG.fixtures.toolRecords.withRequestedLevel`,
 * `SG.pipeline.run({ variantId, difficulty, seed, trace: 'off' }, null)`, `perfTools.hash64(perfTools.serialize(...))`), with
 * the allowance and the attempts of the arguments, and writes one JSON record. It writes no E ledger and no fixture, and
 * the record's kind (`ir10-diagnostic`) is refused by every E merge. It generates a puzzle: run it only through
 * Run-Dv3Logged.ps1 or run-shards.cjs.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/ir10-diagnostic.cjs --key=samurai/easy --seed=8
 *        --allowance=none|256 --attempts=default|8 --json=<file.json>
 *
 * --allowance=none sets SG.digger.SHALLOW_SEARCH_RATINGS to Infinity for this process (the source default, 256, is the
 * other setting and is checked); --attempts=8 puts an explicit maxAttempts of 8 in the request (the size default is
 * the other setting).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
}

function engineFiles() {
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(readSource('tests/node-runner.js'));
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  return files.filter((rel) => !/^js\/(ui|worker)\//.test(rel) && fs.existsSync(path.join(ROOT, rel)));
}

function parseArgs(argv) {
  const out = { key: null, seed: null, allowance: null, attempts: null, json: null };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--key=([A-Za-z0-9]+\/[A-Za-z0-9]+)$/.exec(arg))) out.key = m[1];
    else if ((m = /^--seed=(\d+)$/.exec(arg))) out.seed = Number(m[1]);
    else if ((m = /^--allowance=(none|256)$/.exec(arg))) out.allowance = m[1];
    else if ((m = /^--attempts=(default|8)$/.exec(arg))) out.attempts = m[1];
    else if ((m = /^--json=(.+)$/.exec(arg))) out.json = m[1];
    else throw new Error('unknown argument ' + arg);
  });
  if (!out.key || out.seed === null || !out.allowance || !out.attempts || !out.json) {
    throw new Error('usage: --key=<variant>/<level> --seed=<n> --allowance=none|256 --attempts=default|8 --json=<file>');
  }
  return out;
}

function loadSources() {
  engineFiles().forEach((rel) => vm.runInThisContext(readSource(rel), { filename: path.join(ROOT, rel) }));
  ['tests/fixtures/perf-helper.js', 'tests/fixtures/tool-records.js'].forEach((rel) =>
    vm.runInThisContext(readSource(rel), { filename: path.join(ROOT, rel) }));
  return globalThis.SG;
}

function main(argv) {
  if (argv.includes('--load-only')) {
    const S = loadSources();
    console.log('load only (nothing generated): ' + JSON.stringify({ run: typeof S.pipeline.run, copyWork: typeof S.digger.copyWork,
      defaultMaxAttempts: typeof S.digger.defaultMaxAttempts, requiredOf: typeof S.difficulty.requiredOf,
      hash64: typeof S.fixtures.perfTools.hash64, serialize: typeof S.fixtures.perfTools.serialize,
      withRequestedLevel: typeof S.fixtures.toolRecords.withRequestedLevel, allowance: S.digger.SHALLOW_SEARCH_RATINGS,
      combos: S.fixtures.perfTools.COMBOS.length }));
    return 0;
  }
  const opts = parseArgs(argv);
  const abs = path.resolve(process.cwd(), opts.json);
  if (fs.existsSync(abs)) throw new Error(opts.json + ': exists already (a diagnostic record is never overwritten)');
  const SG = loadSources();
  const tools = SG.fixtures.perfTools;
  const combo = tools.COMBOS.filter((c) => c.key === opts.key)[0];
  if (!combo) throw new Error(opts.key + ' is not a combination of the hash corpus');
  if (tools.SEEDS.indexOf(opts.seed) === -1) throw new Error(opts.seed + ' is not a fixed seed of the hash corpus');
  const sourceDefault = SG.digger.SHALLOW_SEARCH_RATINGS;
  if (sourceDefault !== 256) throw new Error('the source allowance is not 256: ' + sourceDefault);
  if (opts.allowance === 'none') SG.digger.SHALLOW_SEARCH_RATINGS = Infinity;
  const request = { variantId: combo.variant, difficulty: combo.level, seed: opts.seed, trace: 'off' };
  if (opts.attempts === '8') request.maxAttempts = 8;
  const started = process.hrtime.bigint();
  const run = SG.fixtures.toolRecords.withRequestedLevel(combo.variant, combo.level, () => SG.pipeline.run(request, null));
  const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e3) / 1e3;
  const result = run.value;
  const work = SG.digger.copyWork(result.work);
  const derived = SG.difficulty.requiredOf(result.rating, combo.level, result.model);
  const record = {
    schema: 1, kind: 'ir10-diagnostic', task: 'MS05r6a', request: { variant: combo.variant, level: combo.level,
      seed: opts.seed }, config: { allowance: opts.allowance === 'none' ? null : 256, allowanceText: opts.allowance,
      maxAttempts: opts.attempts === '8' ? 8 : null, attempts: opts.attempts,
      cellCount: result.model.cellCount, sizeDefaultAttempts: SG.digger.defaultMaxAttempts(result.model.cellCount),
      sourceAllowance: sourceDefault }, argv: argv.slice(), node: process.version, startedAt: new Date().toISOString(),
    hash: tools.hash64(tools.serialize(result)), overrides: run.overridden ? [opts.key.replace('/', ':')] : [],
    wallMs: ms,
    result: { attempts: result.attempts, exact: result.exact === true, required: derived === null ? null : derived.required,
      score: result.rating.score, warnings: result.warnings.slice(),
      clues: Array.prototype.filter.call(result.givens, (v) => v !== 0).length,
      puzzleDigest: crypto.createHash('sha256').update(Array.prototype.join.call(result.givens, ',') + '|' +
        Array.prototype.join.call(result.solution, ',')).digest('hex') },
    work: work === null || work === undefined ? null : work.map((a) => ({ ratings: a.ratings, proposals: a.proposals,
      localSearches: a.localSearches.map((l) => ({ ratings: l.ratings, shallowRatings: l.shallowRatings,
        shallowLimit: l.shallowLimit, capHit: l.capHit })) }))
  };
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(record, null, 2) + '\r\n', 'utf8');
  console.log(opts.key + '#' + opts.seed + ' allowance ' + opts.allowance + ', attempts ' + opts.attempts + ': hash ' +
    record.hash + ', ' + result.attempts + ' attempt(s), exact ' + record.result.exact + ', ' + ms.toFixed(0) +
    ' ms; record ' + opts.json);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.stack || err));
  process.exitCode = 1;
}
