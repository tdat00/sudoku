'use strict';

/*
 * MS18d Phase C0b task-owned (R24, SA1 R5): the SOURCE LOADER of the raw-time recorder. It follows the loader
 * recipe of tests/perf.js without requiring or running perf.js:
 *   1. parse the existing `SOURCE_FILES` declaration of tests/node-runner.js, omit js/ui and js/worker, keep
 *      the files that exist, in declared order (the engine scripts);
 *   2. then tests/fixtures/perf-helper.js, tests/fixtures/tool-records.js and, when it exists,
 *      tests/fixtures/regression.js (the three fixtures), each run as a classic script through
 *      `vm.runInThisContext`, with the BOM removed exactly like perf.js `readSource`.
 * Every file is read ONCE, into a captured buffer, and the hash that the ledger records is the hash of the
 * exact string that is passed to the VM (its UTF-8 bytes; the raw-buffer digest is kept next to it where the
 * two differ, a BOM being the only difference). The VM executes that same captured string, never a second
 * disk read, so a backing file that changes after the capture cannot change what ran. E's separate
 * identities (the LF-normalized hash identity of the engine files, perf-helper.js, tool-records.js and
 * perf.js, and the raw-byte `sources` hash of the engine files) are derived from the same captured texts:
 * LF normalization is not an executed-byte proof, so both are recorded. regression.js is loaded but is not
 * part of E's recipe: its executed digest is bound here, separately. perf.js is captured for E only and is
 * never executed. Nothing here calls the pipeline or `measure`.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sha256 } = require('./common.js');

const RUNNER = 'tests/node-runner.js';
const FIXTURES = ['tests/fixtures/perf-helper.js', 'tests/fixtures/tool-records.js'];
const REGRESSION = 'tests/fixtures/regression.js';
const PERF = 'tests/perf.js';
const SKIPPED = /^js\/(ui|worker)\//;

/** One file read once: the raw buffer and the exact string that the VM will be given. */
function capture(root, rel) {
  const abs = path.join(root, rel);
  const buffer = fs.readFileSync(abs);
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  return { rel, abs, bytes: buffer.length, buffer, text, rawSha256: sha256(buffer),
    execSha256: sha256(Buffer.from(text, 'utf8')) };
}

/**
 * Everything the recorder loads, captured but not yet run: { recipe, runner, engine, fixtures, perfJs,
 * loaded }. `recipe` counts the declared, excluded and missing sources of the declaration.
 */
function captureAll(root) {
  const runner = capture(root, RUNNER);
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner.text);
  if (!match) throw new Error('cannot find SOURCE_FILES in ' + RUNNER);
  const declared = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  const excluded = declared.filter((rel) => SKIPPED.test(rel));
  const kept = declared.filter((rel) => !SKIPPED.test(rel));
  const present = kept.filter((rel) => fs.existsSync(path.join(root, rel)));
  const engine = present.map((rel) => capture(root, rel));
  const fixtureNames = FIXTURES.concat(fs.existsSync(path.join(root, REGRESSION)) ? [REGRESSION] : []);
  const fixtures = fixtureNames.map((rel) => capture(root, rel));
  const perfJs = capture(root, PERF);
  return {
    recipe: { declared: declared.length, excluded: excluded.length, missing: kept.length - present.length,
      engine: engine.length, fixtures: fixtures.length, loaded: engine.length + fixtures.length },
    runner, engine, fixtures, perfJs, loaded: engine.concat(fixtures)
  };
}

/** E's identities derived from the captured texts (the recipes of project-gp.js computeIdentities). */
function identitiesOf(cap) {
  const lf = (c) => c.text.replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha256');
  cap.engine.concat(cap.fixtures.slice(0, 2), [cap.perfJs]).forEach((c) => {
    hash.update(c.rel + '\0' + lf(c));
  });
  const sources = crypto.createHash('sha256');
  cap.engine.forEach((c) => sources.update(c.buffer));
  return { hashIdentity: hash.digest('hex'), sources: sources.digest('hex').slice(0, 16) };
}

/** The ordered list the ledger and the manifest keep: rel, bytes, raw digest, executed digest. */
const loadedManifest = (cap) => cap.loaded.map((c) => ({ rel: c.rel, bytes: c.bytes, rawSha256: c.rawSha256,
  sha256: c.execSha256 }));

/** Runs the captured strings, in order, as classic scripts: the same strings that were hashed. */
function execute(cap) {
  cap.loaded.forEach((c) => vm.runInThisContext(c.text, { filename: c.abs }));
  return globalThis.SG;
}

module.exports = { captureAll, identitiesOf, loadedManifest, execute, capture, RUNNER, FIXTURES, REGRESSION,
  PERF };
