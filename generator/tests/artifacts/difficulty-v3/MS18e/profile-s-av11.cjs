'use strict';

/*
 * MS18e S-AV11 diagnostic driver (task-owned, prepared and NOT run for real). It makes exactly the one original
 * guarded request of the S-AV11 observation and writes one record:
 *
 *   jigsaw9 / Expert (hidden by the final qualification) / seed 1111 / trace off / the default attempts (8 for a
 *   board of up to 81 cells, generator/js/engine/digger.js:625-632), no option, no request budget, no new seed.
 *
 * The request is the existing diagnostic route: SG.fixtures.toolRecords.withRequestedLevel('jigsaw9', 'expert', fn)
 * around SG.pipeline.run(config, null), the same shape as manual/variants.test.js:793-799. The record keeps the
 * seven existing `pipeline.timings` fields (milliseconds per step id, summed over attempts), three clocks of the
 * whole call (hrtime, performance.now, Date), the request, the effective defaults, the source, tool, Node and
 * machine identities and the outcome. It is not a profiler framework and measures nothing the pipeline does not
 * already report; a field the result does not carry is null, never zero.
 *
 *   node generator/tests/artifacts/difficulty-v3/MS18e/profile-s-av11.cjs [--json=<new file>]
 *        [--owner-decision=<Discord message id>]
 *
 * WITHOUT --owner-decision the driver prints the plan and exits 2: it loads no engine and calls nothing. The real
 * call needs the owner's answer to MS18e-Q-SAV11 (the message id is recorded in the record) and a technical route
 * review; it runs only through run-locked-e.ps1 (the 540 s process ceiling is the only stop). The record goes to a
 * new file under docs/difficulty-v3/evidence/MS18e/profile/s-av11/ (default record-1.json); an existing file or
 * folder entry is refused. Exit 0: a record was written (read its `outcome`); 1: no trustworthy record could be
 * made; 2: no call was made (missing or invalid decision, invalid path or command line).
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GENERATOR = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');
const OUT_FOLDER = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18e', 'profile', 's-av11');
const DEFAULT_OUT = 'docs/difficulty-v3/evidence/MS18e/profile/s-av11/record-1.json';
const REQUEST = Object.freeze({ variantId: 'jigsaw9', difficulty: 'expert', seed: 1111, trace: 'off' });
const TIMING_KEYS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];
const TOOL_FILES = [
  'tests/artifacts/difficulty-v3/MS18e/profile-s-av11.cjs', 'tests/fixtures/tool-records.js',
  'tests/replay-fixtures.js'
];

const scrub = (text) => [REPO, REPO.replace(/\\/g, '/'), REPO.replace(/\\/g, '\\\\')].reduce(
  (out, root) => out.split(root).join('<repo>'), String(text));
const crlfJson = (value) => JSON.stringify(value, null, 2).replace(/\n/g, '\r\n') + '\r\n';
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

function argOf(argv, name) {
  const hit = argv.filter((a) => a.indexOf('--' + name + '=') === 0);
  return hit.length === 1 ? hit[0].slice(name.length + 3) : null;
}

function plan(outRel) {
  return {
    schema: 'ms18e-sav11-plan-1',
    request: REQUEST,
    call: "SG.fixtures.toolRecords.withRequestedLevel('jigsaw9', 'expert', function () { " +
      'return SG.pipeline.run(config, null); }).value (no emit, no budget argument, no option)',
    defaults: 'attempts by the size of the board: 8 up to 81 cells (digger.js:625-632); the normalised config of the ' +
      'result is recorded',
    record: ['the seven pipeline.timings fields (' + TIMING_KEYS.join(', ') + ')',
      'clocks of the whole call: hrtime, performance.now, Date', 'the request and the normalised config',
      'effective defaults', 'source hash, tool hash, commit, dirty, Node, machine, argv', 'the outcome or the error'],
    output: outRel + ' (a new file, exclusive)',
    process: 'run-locked-e.ps1 only; the 540 s ceiling is the only stop; no retry, no second call',
    refusal: 'a real call needs --owner-decision=<Discord message id> (MS18e-Q-SAV11) and a technical route review'
  };
}

function machine() {
  const cpus = os.cpus();
  return { platform: os.platform(), arch: os.arch(), cpu: cpus.length > 0 ? String(cpus[0].model).trim() : null,
    cores: cpus.length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30)) };
}

function toolHash() {
  const hash = crypto.createHash('sha256');
  TOOL_FILES.forEach((rel) => {
    const text = fs.readFileSync(path.join(GENERATOR, rel), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    hash.update(rel + '\0' + text);
  });
  return hash.digest('hex');
}

function outcomeOf(result) {
  const givens = Array.from(result.givens);
  return {
    returned: true, exact: result.exact === true, achieved: result.rating ? result.rating.level : null,
    requested: result.config ? result.config.difficulty : null, score: result.rating ? result.rating.score : null,
    solved: result.rating ? result.rating.solved === true : null, attempts: result.attempts,
    clues: givens.filter((g) => g !== 0).length, warnings: result.warnings || null,
    puzzleDigest: sha256(givens.join(',') + '|' + Array.from(result.solution).join(','))
  };
}

function call(env) {
  const SG = globalThis.SG;
  const started = new Date();
  const h0 = process.hrtime.bigint();
  const p0 = performance.now();
  let result = null;
  let failure = null;
  try {
    result = SG.fixtures.toolRecords.withRequestedLevel(REQUEST.variantId, REQUEST.difficulty, function () {
      return SG.pipeline.run(Object.assign({}, REQUEST), null);
    }).value;
  } catch (err) {
    failure = { name: err && err.name ? err.name : 'Error', code: err && err.code ? err.code : null,
      message: scrub(err && err.message ? err.message : err) };
  }
  const p1 = performance.now();
  const h1 = process.hrtime.bigint();
  const ended = new Date();
  const timings = result && result.timings ? result.timings : null;
  const keys = timings ? Object.keys(timings).sort() : [];
  return {
    clocks: { hrtimeMs: Number(h1 - h0) / 1e6, performanceNowMs: p1 - p0, dateMs: ended.getTime() - started.getTime(),
      startedAt: started.toISOString(), endedAt: ended.toISOString() },
    timings: timings,
    timingKeysComplete: JSON.stringify(keys) === JSON.stringify(TIMING_KEYS.slice().sort()),
    timingsSumMs: timings ? TIMING_KEYS.reduce((s, k) => s + (typeof timings[k] === 'number' ? timings[k] : 0), 0) : null,
    normalisedConfig: result ? result.config : null,
    effective: {
      cellCount: result && result.model ? result.model.cellCount : null,
      defaultMaxAttempts: result && result.model ? SG.digger.defaultMaxAttempts(result.model.cellCount) : null,
      shallowSearchRatings: SG.digger.SHALLOW_SEARCH_RATINGS, capRatings: SG.digger.CAP_RATINGS,
      chainShortMax: SG.chainSearch ? SG.chainSearch.SHORT_MAX : null,
      support: SG.variants.get(REQUEST.variantId).difficultySupport.slice()
    },
    work: result && result.work !== undefined ? JSON.parse(JSON.stringify(result.work)) : null,
    outcome: failure ? { returned: false, error: failure } : outcomeOf(result)
  };
}

function main(argv) {
  const jsonArg = argOf(argv, 'json');
  const decision = argOf(argv, 'owner-decision');
  const outRel = jsonArg === null ? DEFAULT_OUT : jsonArg;
  const unknown = argv.filter((a) => !/^--(json|owner-decision)=/.test(a));
  if (unknown.length > 0) {
    console.error('unknown argument: ' + unknown.join(' '));
    return 2;
  }
  if (decision === null) {
    console.log('S-AV11 driver: NO CALL MADE (no --owner-decision). The plan:');
    console.log(JSON.stringify(plan(outRel), null, 2));
    return 2;
  }
  if (!/^[0-9]{17,20}$/.test(decision)) {
    console.error('--owner-decision must be the Discord message id (17 to 20 digits); no call was made');
    return 2;
  }
  if (process.env.CI) {
    console.error('CI is set: a local diagnostic is not run there; no call was made');
    return 2;
  }
  const abs = path.resolve(process.cwd(), outRel);
  const rel = path.relative(OUT_FOLDER, abs);
  if (path.extname(abs) !== '.json' || rel === '' || rel.startsWith('..') || path.isAbsolute(rel) ||
      rel.indexOf(path.sep) !== -1) {
    console.error(outRel + ': the record must be a new .json file directly in ' + path.relative(REPO, OUT_FOLDER));
    return 2;
  }
  if (fs.existsSync(abs) || fs.existsSync(abs + '.partial')) {
    console.error(outRel + ': the file exists already (an evidence file is never overwritten)');
    return 2;
  }

  const replayFixtures = require(path.join(GENERATOR, 'tests', 'replay-fixtures.js'));
  const env = replayFixtures.nodeEnv();
  let identity;
  try {
    env.engine();
    replayFixtures.loadFixtures(['tests/fixtures/tool-records.js']);
    const source = env.identity([]);
    identity = { sourceHash: source.sourceHash, toolHash: toolHash(), commit: source.commit, dirty: source.dirty,
      node: source.node, machine: machine(), argv: argv.slice(), sgTimeFactor: process.env.SG_TIME_FACTOR || null };
  } catch (err) {
    console.error('no call made: ' + scrub(err && err.stack ? err.stack : err));
    return 1;
  }
  const record = { schema: 'ms18e-sav11-record-1', ownerDecision: decision, request: REQUEST,
    calledAs: plan(outRel).call, identity: identity, result: call(env) };
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, crlfJson(record), { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    console.error('the record could not be written: ' + scrub(err && err.message ? err.message : err));
    return 1;
  }
  const r = record.result;
  console.log('jigsaw9 expert 1111: ' + (r.outcome.returned ? 'returned, exact ' + r.outcome.exact +
    ', attempts ' + r.outcome.attempts : 'error ' + r.outcome.error.code) + '; hrtime ' + (r.clocks.hrtimeMs / 1000).toFixed(3) +
    ' s; timings ' + (r.timingKeysComplete ? 'seven keys' : 'NOT seven keys'));
  console.log('record: ' + outRel);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
