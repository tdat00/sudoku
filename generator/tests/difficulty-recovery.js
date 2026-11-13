#!/usr/bin/env node
'use strict';

/*
 * Recovery profile driver (difficulty v3, MS05r1): where does one fixed request spend its time, in the
 * ordinary dig samples or in the local continuation that the shallow allowance of the recovery can limit?
 * Node >= 18, built-in modules only. Neither mode is an acceptance run and neither is a performance gate.
 *
 *   node tests/difficulty-recovery.js --mode=profile --case=G13 --json=<project-relative file>
 *   node tests/difficulty-recovery.js --mode=diagnostic --case=G13 --shallow-cap=64 --json=<file>
 *
 *   --mode=profile      one attempt (maxAttempts 1) of the fixed request; --shallow-cap absent or none
 *   --mode=diagnostic   the normal attempts of the request, with the shallow allowance 64, 128, 256 or none;
 *                       it needs the runtime allowance API of the recovery (SG.digger.SHALLOW_SEARCH_RATINGS)
 *                       and is refused before anything is generated while the source does not have it
 *   --case=<case>       G13 (the golden request through SG.store.toConfig), mega12-nightmare or
 *                       mega16-nightmare (the existing seed 3 Nightmare requests, trace off)
 *   --json=<file>       the record: a new .json file inside the repository; an existing file is refused
 *
 * One process runs exactly one case, once. The engine and the validation of the returned puzzle (givens
 * against solution, the model's `isSolution`, an independent uniqueness count and the complete canonical
 * rating that gives the requiredness) share one 500000 ms budget, below the 540 s limit of a bounded
 * command. The record (schema 1; see tests/fixtures/recovery-profile.js) holds the outcome, the work of every
 * attempt and the time and the full ratings of every stage, split into ordinary samples, the local
 * continuation and the rest.
 * Exit code: 0 when a record was written (read its `outcome`: a failed generation is a record too), 1 when no
 * trustworthy complete record could be made (an instrumentation problem, or the file could not be written),
 * 2 for an invalid command line, path or source setup. A process killed at the limit leaves no record.
 *
 * The helpers are pure (SG.fixtures.recoveryProfile, tests/fixtures/recovery-profile.js; the recovery-profile
 * suite tests them); this file only reads the command line, the file system, git and the hashes.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const replayFixtures = require('./replay-fixtures.js');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const FIXTURES = ['tests/fixtures/replay-goldens.js', 'tests/fixtures/recovery-profile.js'];
// The code that decides a record besides the engine sources: the toolHash covers these files.
const TOOL_FILES = [
  'tests/difficulty-recovery.js', 'tests/fixtures/recovery-profile.js', 'tests/replay-fixtures.js',
  'tests/fixtures/replay-goldens.js'
];

let loaded = null;

/** SG.fixtures.recoveryProfile, loaded once with the golden requests. */
function helpers() {
  if (loaded === null) loaded = replayFixtures.loadFixtures(FIXTURES).fixtures.recoveryProfile;
  return loaded;
}

function toolHash() {
  const hash = crypto.createHash('sha256');
  TOOL_FILES.forEach((rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    hash.update(rel + '\0' + text);
  });
  return hash.digest('hex');
}

function machine() {
  const cpus = os.cpus();
  return {
    platform: os.platform(), arch: os.arch(), cpu: cpus.length > 0 ? String(cpus[0].model).trim() : null,
    cores: cpus.length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30))
  };
}

/** The record text with the repository's own absolute path, if an error message carries it, made relative. */
function scrub(text) {
  return [REPO, REPO.replace(/\\/g, '/'), REPO.replace(/\\/g, '\\\\')].reduce(
    (out, root) => out.split(root).join('<repo>'), text);
}

function seconds(ms) {
  return (ms / 1000).toFixed(3) + ' s';
}

function report(record) {
  const s = record.summary;
  const lines = [
    record.caseId + ' ' + record.mode + ': outcome ' + record.outcome +
      (record.error ? ' (' + record.error.code + ')' : '') + ', exact ' + record.exact + ', required ' +
      record.required + ', attempts ' + record.attempts + ', samples ' + record.samples,
    '  generation ' + seconds(record.generationMs) + ', validation ' +
      (record.validationMs === null ? 'not run' : seconds(record.validationMs)),
    '  ordinary samples ' + seconds(s.sampleMs) + ' (' + s.sampleRatings + ' ratings), local continuation ' +
      seconds(s.localMs) + ' (' + s.localStageRatings + ' ratings, ' + s.localProposals + ' proposals), ' +
      'other ' + seconds(s.otherMs) + ' (' + s.otherRatings + ' ratings)'
  ];
  if (record.instrumentationProblems.length > 0) {
    record.instrumentationProblems.forEach((p) => lines.push('  instrumentation: ' + p));
  }
  return lines.join('\n');
}

function main(argv) {
  if (argv.indexOf('--help') !== -1 || argv.indexOf('-h') !== -1) {
    console.log(helpers().USAGE);
    return 0;
  }
  const env = replayFixtures.nodeEnv();
  let P;
  let args;
  let abs;
  let prepared;
  let identity;
  try {
    P = helpers();
    args = P.parseArgs(argv);
    env.checkPath(args.json, { extension: '.json' });
    abs = path.resolve(process.cwd(), args.json);
    if (fs.existsSync(abs) || fs.existsSync(abs + '.partial')) {
      throw new Error(args.json + ': the file exists already (an evidence file is never overwritten)');
    }
    env.engine();
    prepared = P.prepare(args);
    const source = env.identity([]);
    identity = {
      sourceHash: source.sourceHash, toolHash: toolHash(), commit: source.commit, dirty: source.dirty,
      node: source.node, machine: machine(), argv: argv.slice(), startedAt: env.now()
    };
  } catch (err) {
    console.error(err && err.message ? err.message : String(err));
    if (P && err && err.code === 'usage') console.error('\n' + P.USAGE);
    return 2;
  }

  let record;
  try {
    const out = P.profile(prepared, { clock: env.clock, sha256: env.sha256 });
    record = P.recordOf(prepared, identity, out.run);
  } catch (err) {
    console.error('no record: ' + (err && err.stack ? err.stack : String(err)));
    return 1;
  }
  try {
    const text = scrub(P.renderRecord(record));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    console.error('the record could not be written: ' + (err && err.message ? err.message : String(err)));
    return 1;
  }
  console.log(report(record));
  console.log('record: ' + args.json);
  return P.exitCodeOf(record);
}

module.exports = {
  main: main,
  helpers: helpers,
  parseArgs: (argv) => helpers().parseArgs(argv),
  renderRecord: (record) => helpers().renderRecord(record),
  exitCodeOf: (record) => helpers().exitCodeOf(record),
  toolHash: toolHash
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));
