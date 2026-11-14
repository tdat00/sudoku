#!/usr/bin/env node
'use strict';

/*
 * The cost of the technique finders on their real fixtures (difficulty v3, MS07a; GP-cost of the technique
 * tasks). Node >= 18, built-in modules only. It is a tool, not a discovered `*.test.js` suite, not a CI step and
 * not product qualification: its numbers are evidence for the owner of a finder, never a time assertion.
 *
 *   node tests/pattern-cost.js --ids=forcingChain,nishio --runs=20 --json=<new.json> [--case=<text>]
 *   node tests/pattern-cost.js --ids=forcingChain --list
 *
 *   --ids=<id>[,<id>]   registered, unscoped technique ids; every positive and negative fixture of each one (the
 *                       active `byId` map of core/tests/fixtures/techniques.js) is a case
 *   --runs=<n>          identical read-only finds per case (default 20)
 *   --json=<file>       a new project-relative .json file (never overwritten); required for a run
 *   --case=<text>       only the cases whose key or fixture name contains the text
 *   --list              print the cases, run nothing
 *
 * It loads what node-runner.js loads, in the same order (the harness, SOURCE_FILES, then FIXTURES_DIRS, read from
 * that file so that they cannot drift apart) and no suite, builds each fixture position with
 * `SG.techHelper.makeState` / `stateAfter` and repeats the find. It generates no puzzle. The record holds the
 * source, fixture and tool hashes, Node, the machine, the configuration and, per case, the Finding, the work
 * records of `ctx.options.onPatternWork`, the cap hits and p50 / p95 / max of the time (the helpers and the
 * record are described in tests/fixtures/pattern-cost.js and tested by the `pattern-cost-tools` suite on fake
 * observations). One caller budget of 480000 ms is shared by every find (the process limit is 540 s): run it
 * through `Invoke-Dv3Node`. Exit codes: see `--help`.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const evidenceTools = require('../../core/tests/node-evidence.js');
const replayFixtures = require('./replay-fixtures.js');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const RUNNER = 'tests/node-runner.js';
const HELPER = 'tests/fixtures/pattern-cost.js';
// The code that decides a record besides the engine sources (the engine is the sourceHash) and the fixtures.
const TOOL_FILES = ['tests/pattern-cost.js', HELPER];
// Where an evidence file is never written: the sources and fixtures that a quick test loads or reads.
const EVIDENCE_INPUTS = {
  files: [],
  trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'generator/js',
    'generator/css', 'generator/assets', 'generator/tests/fixtures', 'generator/tests/suites',
    { dir: 'generator/tests', recursive: false }]
};

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
}

/** The pure helpers, from a context of their own: parsing a command line needs no engine. */
function helperOf() {
  const sandbox = {};
  vm.runInNewContext(readSource(HELPER), sandbox, { filename: path.join(ROOT, HELPER) });
  return sandbox.SG.fixtures.patternCost;
}

/** The quoted strings of the array `const <name> = [...]` of the runner. */
function listOf(runner, name) {
  const match = new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(runner);
  if (!match) throw new Error('cannot find ' + name + ' in ' + RUNNER);
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
}

/**
 * The environment of the runner without its suites: the harness, the ordered SOURCE_FILES that exist, then the
 * `.js` files of FIXTURES_DIRS (alphabetical within a directory). Returns the fixture hash: SHA-256 over
 * `<dir>/<name>\0<text with LF line ends>` of every fixture file loaded.
 */
function loadEnvironment() {
  const runner = readSource(RUNNER);
  const harness = /const HARNESS_FILE = '([^']+)';/.exec(runner);
  if (!harness) throw new Error('cannot find HARNESS_FILE in ' + RUNNER);
  const run = (rel) => vm.runInThisContext(readSource(rel), { filename: path.join(ROOT, rel) });
  run(harness[1]);
  globalThis.SG.test.node = Object.freeze({ fs: fs, path: path, vm: vm, root: ROOT });
  listOf(runner, 'SOURCE_FILES').filter((rel) => fs.existsSync(path.join(ROOT, rel))).forEach(run);
  const hash = crypto.createHash('sha256');
  listOf(runner, 'FIXTURES_DIRS').forEach((dir) => {
    fs.readdirSync(path.join(ROOT, dir)).filter((name) => name.endsWith('.js')).sort().forEach((name) => {
      const rel = dir + '/' + name;
      hash.update(rel + '\0' + readSource(rel).replace(/\r\n/g, '\n'));
      run(rel);
    });
  });
  return hash.digest('hex');
}

/** SHA-256 over the tool files as `<path>\0<text with LF line ends>`. */
function toolHash() {
  const hash = crypto.createHash('sha256');
  TOOL_FILES.forEach((rel) => hash.update(rel + '\0' + readSource(rel).replace(/\r\n/g, '\n')));
  return hash.digest('hex');
}

function machine() {
  const cpus = os.cpus();
  return {
    platform: os.platform(), arch: os.arch(), cpu: cpus.length > 0 ? String(cpus[0].model).trim() : null,
    cores: cpus.length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30))
  };
}

function main(argv) {
  const P = helperOf();
  let args;
  try {
    args = P.parseArgs(argv);
  } catch (err) {
    console.error(err && err.message ? err.message : String(err));
    if (err && err.code === 'usage') console.error('\n' + P.USAGE);
    return 2;
  }
  if (args.mode === 'help') {
    console.log(P.USAGE);
    return 0;
  }
  const evidence = evidenceTools.create({ app: 'generator', repoRoot: REPO, inputs: EVIDENCE_INPUTS });
  let target = null;
  if (args.mode === 'run') {
    try {
      target = evidence.outputTarget('--json', args.json);
    } catch (err) {
      console.error(err && err.message ? err.message : String(err));
      return 2;
    }
  }

  let fixtureHash;
  let plan;
  try {
    fixtureHash = loadEnvironment();
    const patternCost = globalThis.SG.fixtures.patternCost;
    plan = patternCost.planCases(patternCost.inventoryOf(args.ids), args.caseText);
  } catch (err) {
    console.error('cannot load the environment of the runner: ' + (err && err.stack ? err.stack : String(err)));
    return 2;
  }
  if (plan.problems.length > 0) {
    plan.problems.forEach((problem) => console.error(problem));
    return 2;
  }
  const C = globalThis.SG.fixtures.patternCost;
  if (args.mode === 'list') {
    console.log(C.listText(plan.cases));
    return 0;
  }

  const env = replayFixtures.nodeEnv();
  const source = env.identity([]);
  const identity = {
    sourceHash: source.sourceHash, fixtureHash: fixtureHash, toolHash: toolHash(), node: source.node,
    commit: source.commit, dirty: source.dirty
  };
  const config = { ids: args.ids, caseText: args.caseText, runs: args.runs, budgetMs: C.BUDGET_MS };
  const startedAt = env.now();
  let measured;
  try {
    measured = C.measure(plan.cases, config, { clock: env.clock, digest: sha256 });
  } catch (err) {
    console.error('no record: ' + (err && err.stack ? err.stack : String(err)));
    return 1;
  }
  const doc = C.documentOf({
    argv: argv, identity: identity, machine: machine(), config: config, cases: plan.cases, startedAt: startedAt,
    endedAt: env.now(), measured: measured
  });
  try {
    evidence.write(target, evidence.scrub(evidenceTools.render(doc)));
  } catch (err) {
    console.error('the record could not be written: ' + (err && err.message ? err.message : String(err)));
    return 1;
  }
  console.log(C.renderText(doc));
  console.log('record: ' + target.shown);
  return C.exitCodeOf(doc);
}

module.exports = { main: main, toolHash: toolHash };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
