#!/usr/bin/env node
'use strict';

/*
 * MS05r4, original-limit preflight of the G13 closure request (design.md 6.8, S-OD2 FS27): the actual G13 golden
 * request (samurai, Nightmare, seed 42) generated once, with the normal attempts and the default of the source,
 * under the original 120000 ms generation guard of the recorders (`BUDGET_MS` of tests/replay-fixtures.js).
 * It is a generation-only preflight: not a golden, not a saved wire and not an independent-validity pass.
 *
 *   node tests/artifacts/difficulty-v3/MS05r4/g13-closure.cjs --json=<new project-relative file.json>
 *
 * Run it from generator/. The record (schema 1) holds the identities of the sources, the loader and this script,
 * the request and its normalised configuration, the default of the allowance, Node and the machine, the guard
 * and the outcome (wall time, attempts, score, exact, required, warnings, the copied work). The work of a failed
 * request is the partial work the error carries, or null with the reason: never zero. The puzzle is not saved.
 * Exit code: 0 for a completed generation, 1 for a generation error (the record is written all the same) or a
 * record that cannot be written, 2 for a usage error, a path that is not fresh, or a changed request or guard.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const USAGE = 'Usage: node tests/artifacts/difficulty-v3/MS05r4/g13-closure.cjs --json=<new project-relative .json>';
const SCRIPT = 'tests/artifacts/difficulty-v3/MS05r4/g13-closure.cjs';
const LOADER_FILES = ['tests/replay-fixtures.js', 'tests/fixtures/replay-goldens.js'];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function lfText(rel) {
  return fs.readFileSync(path.resolve(rel), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function usageError(message) {
  const err = new Error(message);
  err.usage = true;
  return err;
}

function main(argv) {
  let abs;
  let rel;
  let env;
  let loader;
  let SG;
  let g;
  try {
    const given = argv.filter((arg) => /^--json=/.test(arg));
    if (argv.length !== 1 || given.length !== 1 || given[0].length <= '--json='.length) {
      throw usageError('exactly one argument is accepted: --json=<file>');
    }
    rel = given[0].slice('--json='.length);
    if (!fs.existsSync(path.resolve('tests', 'replay-fixtures.js'))) {
      throw usageError('run it from the generator folder (tests/replay-fixtures.js is not here)');
    }
    loader = require(path.resolve('tests', 'replay-fixtures.js'));
    env = loader.nodeEnv();
    env.checkPath(rel, { extension: '.json' });
    abs = path.resolve(process.cwd(), rel);
    if (fs.existsSync(abs) || fs.existsSync(abs + '.partial')) {
      throw usageError(rel + ': the file exists already (an evidence file is never overwritten)');
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    env.engine();
    SG = loader.loadFixtures(['tests/fixtures/replay-goldens.js']);
    g = SG.fixtures.replayGoldens.find((entry) => entry.id === 'G13');
    if (!g || g.request.variantId !== 'samurai' || g.request.difficulty !== 'nightmare' ||
        String(g.request.seed) !== '42' || loader.BUDGET_MS !== 120000) {
      throw new Error('G13 closure request/guard changed');
    }
  } catch (err) {
    console.error((err && err.message ? err.message : String(err)) + (err && err.usage ? '\n\n' + USAGE : ''));
    return 2;
  }

  const config = SG.store.toConfig(g.request);
  const identity = env.identity([]);
  const record = {
    schema: 1,
    kind: 'g13-closure',
    task: 'MS05r4',
    complete: true,
    request: JSON.parse(JSON.stringify(g.request)),
    config: JSON.parse(JSON.stringify(config)),
    guardMs: loader.BUDGET_MS,
    identity: {
      sourceHash: identity.sourceHash,
      loaderHash: sha256(LOADER_FILES.map((f) => f + '\0' + lfText(f)).join('\n')),
      scriptHash: sha256(lfText(SCRIPT)),
      script: SCRIPT,
      loaderFiles: LOADER_FILES,
      commit: identity.commit,
      dirty: identity.dirty,
      node: process.version
    },
    machine: {
      platform: os.platform(), arch: os.arch(), cpu: os.cpus().length > 0 ? String(os.cpus()[0].model).trim() : null,
      cores: os.cpus().length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30))
    },
    selectedDefault: {
      text: String(SG.digger.SHALLOW_SEARCH_RATINGS),
      shallowSearchRatings: SG.digger.SHALLOW_SEARCH_RATINGS === Infinity ? null : SG.digger.SHALLOW_SEARCH_RATINGS
    },
    argv: argv.slice(),
    startedAt: new Date().toISOString(),
    outcome: null,
    wallMs: null,
    error: null,
    result: null,
    work: null,
    workUnavailableReason: null
  };

  let result = null;
  let failure = null;
  const t0 = process.hrtime.bigint();
  try {
    result = SG.pipeline.run(SG.store.toConfig(g.request), null,
      SG.budget.create({ ms: loader.BUDGET_MS }));
  } catch (err) {
    failure = err;
  }
  record.wallMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e3) / 1e3;

  if (failure === null) {
    const rating = result.rating;
    const derived = SG.difficulty.requiredOf(rating, g.request.difficulty, result.model);
    record.outcome = 'ok';
    record.result = {
      attempts: result.attempts,
      exact: result.exact === true,
      required: derived === null ? null : derived.required,
      score: rating.score,
      achieved: rating.level,
      hardestTechnique: rating.hardestTechnique,
      solved: rating.solved,
      warnings: result.warnings.slice(),
      clues: Array.prototype.filter.call(result.givens, (v) => v !== 0).length,
      puzzleHash: sha256(Array.prototype.join.call(result.givens, ',') + '|' +
        Array.prototype.join.call(result.solution, ','))
    };
    const work = SG.digger.copyWork(result.work);
    record.work = work === null || work === undefined ? null : work;
    if (record.work === null) record.workUnavailableReason = 'the result carries no valid work';
  } else {
    record.outcome = 'generation-error';
    record.error = {
      code: failure && failure.code ? String(failure.code) : null,
      message: String(failure && failure.message ? failure.message : failure)
    };
    const work = failure && failure.work ? SG.digger.copyWork(failure.work) : null;
    record.work = work === null || work === undefined ? null : work;
    if (record.work === null) {
      record.workUnavailableReason = 'the error carries no work: it was raised outside the generation of the digger';
    }
  }

  try {
    const body = JSON.stringify(record, null, 2).replace(/\n/g, '\r\n') + '\r\n';
    fs.writeFileSync(abs, body, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    console.error('the record could not be written: ' + (err && err.message ? err.message : String(err)));
    return 1;
  }
  const line = record.outcome === 'ok'
    ? 'attempts ' + record.result.attempts + ', score ' + record.result.score + ', exact ' + record.result.exact +
      ', required ' + record.result.required + ', warnings [' + record.result.warnings.join(', ') + ']'
    : 'error ' + record.error.code + ': ' + record.error.message;
  console.log('G13 closure: ' + record.outcome + ' in ' + (record.wallMs / 1000).toFixed(3) + ' s of the ' +
    record.guardMs / 1000 + ' s guard; ' + line);
  console.log('record: ' + rel);
  return record.outcome === 'ok' ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
