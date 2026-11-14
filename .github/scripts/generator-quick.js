'use strict';

/*
 * The CI grouping of the Generator quick tier (difficulty v3, MS05r6c). Node 18 or later, built-in modules only.
 * Run it through .github/scripts/generator-suites.sh; both workflows do.
 *
 *   node .github/scripts/generator-quick.js check [--keep=<dir>]
 *       Registers the quick set of the Generator and of the Player, and every shard of generator-quick.json,
 *       with --list-tests (no test runs), and fails unless the groups cover the quick set exactly: every quick
 *       suite and every test in exactly one shard, no unknown or manual suite in a group, no shard that selects
 *       nothing, no registration error, every manual suite declared as out of CI, every job inside its time
 *       limit. --keep=<dir> keeps the inventories there (a new project-relative folder); otherwise they are
 *       removed.
 *   node .github/scripts/generator-quick.js matrix
 *       The job matrix of the workflows, one JSON line: { "include": [{ "group", "name" }] }.
 *   node .github/scripts/generator-quick.js list <group>
 *       The suites of a group, comma separated.
 *   node .github/scripts/generator-quick.js run <group> [--dry-run] [--results-dir=<dir>]
 *       Registers the shards of the group (a shard that selects nothing fails), then runs each one as its own
 *       `node tests/node-runner.js --suite=<suites>` in generator/, argument array as it is, no shell. Every
 *       shard runs even after a failure; the exit code is 1 if any shard failed. --dry-run registers and prints
 *       the commands, and runs no test. --results-dir=<dir> (evidence runs, not CI) adds
 *       --results=<dir>/generator-<shard>.json to every shard, a new file each, for a coverage reconciliation.
 *
 * The check answers "what happens to a suite that is added later": it fails until the suite has a group, and it
 * never reaches tests/manual. The time factor and the job limits are not set or raised here.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const GENERATOR = path.join(REPO, 'generator');
const PLAYER = path.join(REPO, 'player');
const MANIFEST = path.join(__dirname, 'generator-quick.json');
const MAX_JOB_MINUTES = 30;
const MAX_SHARD_SECONDS = 450;
const SUITE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ID_NAME = /^[a-z][a-z0-9-]*$/;
const USAGE = 'usage: generator-suites.sh check [--keep=<dir>] | matrix | list <group> | ' +
  'run <group> [--dry-run] [--results-dir=<dir>] | selftest';

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isList = (value) => Array.isArray(value) && value.length > 0;
const keyOf = (row) => row.suite + '/' + row.ordinal;
const sorted = (list) => list.slice().sort();
const sameList = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
}

/** Projected seconds of a job: its overhead plus the slowdown factor times the bounds of its shards. */
function projectedSeconds(manifest, shards) {
  return manifest.job.jobOverheadSeconds +
    manifest.job.ciSlowdownFactor * shards.reduce((sum, s) => sum + s.projectionSeconds, 0);
}

/** The argument array of a shard's node command: the suites of the shard as one --suite option. */
function shardArgs(shard) {
  return ['tests/node-runner.js', '--suite=' + shard.suites.join(',')];
}

function checkIds(entry, where, seen, problems) {
  if (!entry || typeof entry.id !== 'string' || !ID_NAME.test(entry.id)) {
    problems.push(where + ': an id of a-z, 0-9 and -');
  } else if (seen.has(entry.id)) problems.push(where + ': the id is used twice');
  else seen.add(entry.id);
}

function checkShard(shard, label, suiteOwner, problems) {
  if (!shard || !isList(shard.suites)) {
    problems.push(label + ': suites must be a non-empty list');
    return;
  }
  shard.suites.forEach((suite) => {
    if (typeof suite !== 'string' || !SUITE_NAME.test(suite)) {
      problems.push(label + ': "' + suite + '" is not a suite name (a file name without .test.js, ' +
        'no comma, space or option)');
    } else if (suiteOwner.has(suite)) {
      problems.push(label + ': suite ' + suite + ' is also in shard ' + suiteOwner.get(suite) +
        ' (the shards are disjoint)');
    } else suiteOwner.set(suite, shard.id);
  });
  if (!isNumber(shard.projectionSeconds) || shard.projectionSeconds <= 0 ||
      shard.projectionSeconds > MAX_SHARD_SECONDS) {
    problems.push(label + ': projectionSeconds must be a finite number above 0 and at most ' +
      MAX_SHARD_SECONDS);
  }
}

/** The structure of the manifest and the job budgets; the problems found, as texts. */
function checkShape(manifest) {
  const problems = [];
  const bad = (text) => problems.push(text);
  if (!manifest || manifest.schema !== 1 || manifest.kind !== 'ci-generator-quick-groups') {
    return ['manifest: not a schema 1 ci-generator-quick-groups document'];
  }
  const job = manifest.job || {};
  if (!Number.isInteger(job.timeoutMinutes) || job.timeoutMinutes < 1 || job.timeoutMinutes > MAX_JOB_MINUTES) {
    bad('job.timeoutMinutes must be an integer from 1 to ' + MAX_JOB_MINUTES + ' (the limit is never raised)');
  }
  if (!isNumber(job.ciSlowdownFactor) || job.ciSlowdownFactor < 1) {
    bad('job.ciSlowdownFactor must be a number of at least 1');
  }
  if (!isNumber(job.jobOverheadSeconds) || job.jobOverheadSeconds < 0) {
    bad('job.jobOverheadSeconds must be a number of at least 0');
  }
  if (!isList(manifest.groups)) {
    bad('groups must be a non-empty list');
    return problems;
  }
  const groupIds = new Set();
  const shardIds = new Set();
  const suiteOwner = new Map();
  manifest.groups.forEach((group, gi) => {
    const where = 'group #' + gi + (group && group.id ? ' ' + group.id : '');
    checkIds(group, where, groupIds, problems);
    if (!group || typeof group.name !== 'string' || group.name === '') bad(where + ': a name is required');
    if (!group || !isList(group.shards)) {
      bad(where + ': shards must be a non-empty list');
      return;
    }
    group.shards.forEach((shard, si) => {
      const label = where + ', shard #' + si + (shard && shard.id ? ' ' + shard.id : '');
      checkIds(shard, label, shardIds, problems);
      checkShard(shard, label, suiteOwner, problems);
    });
  });
  const player = manifest.player || {};
  if (!isNumber(player.projectionSeconds) || player.projectionSeconds <= 0 ||
      player.projectionSeconds > MAX_SHARD_SECONDS) {
    bad('player.projectionSeconds must be a finite number above 0 and at most ' + MAX_SHARD_SECONDS);
  }
  const out = manifest.outOfCi || {};
  const listOk = (list) => Array.isArray(list) && new Set(list).size === list.length &&
    list.every((item) => typeof item === 'string' && item !== '');
  if (!listOk(out.manualSuites)) bad('outOfCi.manualSuites must be a list of distinct suite names');
  if (!listOk(out.tools)) bad('outOfCi.tools must be a list of distinct paths');
  if (problems.length === 0) {
    const limit = job.timeoutMinutes * 60;
    manifest.groups.forEach((group) => {
      const projected = projectedSeconds(manifest, group.shards);
      if (projected > limit) {
        bad('group ' + group.id + ' projects ' + projected + ' s, above the ' + limit + ' s of its job: ' +
          'split it (the limit and the factor are not raised)');
      }
    });
    const playerProjected = projectedSeconds(manifest, [player]);
    if (playerProjected > limit) {
      bad('the Player job projects ' + playerProjected + ' s, above ' + limit + ' s');
    }
  }
  return problems;
}

/** One registration-only inventory: complete, no registration error, at least one test. */
function checkInventory(label, inventory) {
  if (!inventory) return [label + ': no inventory'];
  if (inventory.error) return [label + ': ' + inventory.error];
  const problems = [];
  if (inventory.schema !== 1) problems.push(label + ': not a schema 1 inventory');
  if (inventory.complete !== true || (inventory.registrationErrors || []).length > 0) {
    problems.push(label + ': incomplete inventory or registration errors');
  }
  if (!Array.isArray(inventory.tests) || inventory.tests.length === 0) {
    problems.push(label + ': zero tests selected');
  }
  return problems;
}

/** The inventory of one shard against its manifest entry: the suites, and nothing else, selected. */
function checkShardInventory(shard, inventory) {
  const label = 'shard ' + shard.id;
  const problems = checkInventory(label, inventory);
  if (problems.length > 0) return problems;
  if (!inventory.selection) return [label + ': no selection'];
  if (!sameList(inventory.selection.suites, shard.suites)) {
    problems.push(label + ': the runner selected ' + inventory.selection.suites.join(',') + ', not ' +
      shard.suites.join(','));
  }
  const seen = new Set(inventory.tests.map((t) => t.suite));
  inventory.tests.filter((t) => !shard.suites.includes(t.suite)).slice(0, 3).forEach((t) => {
    problems.push(label + ': a test of another suite is selected: ' + keyOf(t));
  });
  shard.suites.filter((suite) => !seen.has(suite)).forEach((suite) => {
    problems.push(label + ': suite ' + suite + ' selects no test');
  });
  return problems;
}

/** The suites of the whole quick set: the owners, the folders and the runner against each other. */
function checkSuites(manifest, full, disk, problems) {
  const quick = full.selection ? full.selection.suites : [];
  if (!full.selection || full.selection.set !== 'quick' || full.selection.filter || full.selection.exact) {
    problems.push('quick set of the Generator: the inventory is not the whole quick set');
  }
  if (!sameList(quick, disk.quick)) {
    const differ = quick.filter((s) => !disk.quick.includes(s)).concat(disk.quick.filter((s) => !quick.includes(s)));
    problems.push('the runner registers ' + quick.length + ' quick suites, the folders hold ' +
      disk.quick.length + ': ' + sorted(differ).join(', '));
  }
  const names = new Map();
  full.tests.forEach((t) => {
    if (names.has(t.fullName)) problems.push('the full name of ' + keyOf(t) + ' repeats ' + names.get(t.fullName));
    else names.set(t.fullName, keyOf(t));
  });
  const withTests = new Set(full.tests.map((t) => t.suite));
  quick.filter((s) => !withTests.has(s)).forEach((s) => problems.push('quick suite ' + s + ' registers no test'));

  const owner = new Map();
  manifest.groups.forEach((g) => g.shards.forEach((s) => s.suites.forEach((suite) => owner.set(suite, s.id))));
  owner.forEach((id, suite) => {
    if (disk.manual.includes(suite)) {
      problems.push('shard ' + id + ': ' + suite + ' is a manual suite; manual and deep suites stay out of CI');
    } else if (!quick.includes(suite)) {
      problems.push('shard ' + id + ': ' + suite + ' is not a quick suite');
    }
  });
  sorted(Array.from(new Set(quick.concat(disk.quick)))).filter((suite) => !owner.has(suite)).forEach((suite) => {
    problems.push('quick suite ' + suite + ' has no CI group: add it to a shard of ' +
      '.github/scripts/generator-quick.json, with its measured time');
  });
}

/** Every key of the whole quick set in exactly one shard. @returns {number} the keys covered */
function checkKeys(shards, full, listings, problems) {
  const covered = new Map();
  const duplicates = [];
  const unexpected = [];
  const inFull = new Map(full.tests.map((t) => [keyOf(t), t.fullName]));
  shards.forEach((shard) => {
    const inventory = (listings.shards || {})[shard.id];
    problems.push.apply(problems, checkShardInventory(shard, inventory));
    if (!inventory || !Array.isArray(inventory.tests)) return;
    inventory.tests.forEach((t) => {
      const key = keyOf(t);
      if (!inFull.has(key) || inFull.get(key) !== t.fullName) unexpected.push(shard.id + ': ' + key);
      else if (covered.has(key)) duplicates.push(key + ' in ' + covered.get(key) + ' and ' + shard.id);
      else covered.set(key, shard.id);
    });
  });
  const missing = Array.from(inFull.keys()).filter((key) => !covered.has(key));
  const sample = (list) => list.slice(0, 5).join('; ') + (list.length > 5 ? '; ...' : '');
  if (missing.length > 0) problems.push(missing.length + ' quick test(s) in no shard: ' + sample(missing));
  if (duplicates.length > 0) {
    problems.push(duplicates.length + ' quick test(s) in two shards: ' + sample(duplicates));
  }
  if (unexpected.length > 0) problems.push(unexpected.length + ' unexpected test(s): ' + sample(unexpected));
  return covered.size;
}

/** The manual tier and the tools: declared out of CI, and not in a shard. */
function checkOutOfCi(manifest, shards, disk, problems) {
  const declared = manifest.outOfCi.manualSuites;
  disk.manual.filter((s) => !declared.includes(s)).forEach((s) => {
    problems.push('manual suite ' + s + ' is not declared in outOfCi.manualSuites: it stays out of CI, so ' +
      'say which evidence replaces it');
  });
  declared.filter((s) => !disk.manual.includes(s)).forEach((s) => {
    problems.push('outOfCi.manualSuites names ' + s + ', which is not in generator/tests/manual');
  });
  declared.filter((s) => shards.some((shard) => shard.suites.includes(s))).forEach((s) => {
    problems.push('manual suite ' + s + ' is also in a CI shard');
  });
  (disk.missingTools || []).forEach((tool) => {
    problems.push('outOfCi.tools names ' + tool + ', which does not exist');
  });
}

/**
 * The coverage check, pure. `listings`: { full, shards: { <id>: inventory }, player }, each the parsed
 * inventory of `--list-tests` or { error }. `disk`: { quick, manual, core, missingTools } (names found on disk).
 * @returns {{problems: string[], summary: Object}}
 */
function validateCoverage(manifest, listings, disk) {
  const problems = checkShape(manifest);
  const summary = { groups: [], quickSuites: 0, quickTests: 0, playerSuites: 0, playerTests: 0 };
  if (problems.length > 0) return { problems: problems, summary: summary };
  const shards = [];
  manifest.groups.forEach((g) => g.shards.forEach((s) => shards.push(s)));

  const full = listings.full;
  const fullProblems = checkInventory('quick set of the Generator', full);
  problems.push.apply(problems, fullProblems);
  if (fullProblems.length === 0) {
    checkSuites(manifest, full, disk, problems);
    summary.quickSuites = full.selection ? full.selection.suites.length : 0;
    summary.quickTests = full.tests.length;
    summary.covered = checkKeys(shards, full, listings, problems);
  }
  checkOutOfCi(manifest, shards, disk, problems);

  const player = listings.player;
  const playerProblems = checkInventory('quick set of the Player', player);
  problems.push.apply(problems, playerProblems);
  if (playerProblems.length === 0) {
    if (!player.selection || player.selection.set !== 'quick') {
      problems.push('quick set of the Player: the inventory is not the whole quick set');
    } else {
      disk.core.filter((s) => !player.selection.suites.includes(s)).forEach((s) => {
        problems.push('shared suite ' + s + ' is not in the Player quick set');
      });
      summary.playerSuites = player.selection.suites.length;
    }
    summary.playerTests = player.tests.length;
  }

  manifest.groups.forEach((group) => {
    const ids = group.shards.map((s) => s.id);
    const tests = ids.reduce((n, id) => {
      const inv = (listings.shards || {})[id];
      return n + (inv && Array.isArray(inv.tests) ? inv.tests.length : 0);
    }, 0);
    summary.groups.push({
      id: group.id, shards: ids, tests: tests, projectedSeconds: projectedSeconds(manifest, group.shards),
      limitSeconds: manifest.job.timeoutMinutes * 60
    });
  });
  summary.player = { projectedSeconds: projectedSeconds(manifest, [manifest.player]) };
  return { problems: problems, summary: summary };
}

/**
 * Runs the shards of a group one after the other. `spawn(args)` returns { status, error }; a missing status
 * (a signal, a failed start) counts as a failure, and every shard runs whatever an earlier one returned.
 * `extra(shard)` may add arguments after the shard's own (the evidence option --results-dir).
 * @returns {{code: number, results: Object[]}}
 */
function executeShards(group, counts, spawn, log, extra) {
  const results = group.shards.map((shard) => {
    const args = shardArgs(shard).concat(extra ? extra(shard) : []);
    log('==== shard ' + shard.id + ' (' + (counts[shard.id] || 0) + ' tests): node ' + args.join(' '));
    const started = Date.now();
    const child = spawn(args);
    if (child.error) log('could not run: ' + child.error.message);
    const code = typeof child.status === 'number' ? child.status : 1;
    return { id: shard.id, code: code, seconds: Math.round(Date.now() - started) / 1000 };
  });
  results.forEach((r) => log('shard ' + r.id + ': exit ' + r.code + ', ' + r.seconds.toFixed(1) + ' s'));
  const failed = results.filter((r) => r.code !== 0);
  if (failed.length > 0) log('FAILED: ' + failed.map((r) => r.id).join(', '));
  return { code: failed.length > 0 ? 1 : 0, results: results };
}

function suiteNames(abs) {
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.test.js'))
    .map((f) => f.slice(0, -'.test.js'.length)).sort();
}

/** The suites and tools on disk. */
function discover(manifest) {
  const core = suiteNames(path.join(REPO, 'core', 'tests', 'suites'));
  const own = suiteNames(path.join(GENERATOR, 'tests', 'suites'));
  const tools = (manifest.outOfCi || {}).tools || [];
  return {
    quick: sorted(core.concat(own)), core: core, manual: suiteNames(path.join(GENERATOR, 'tests', 'manual')),
    missingTools: tools.filter((tool) => !fs.existsSync(path.join(REPO, tool)))
  };
}

/** A folder of the repository for an evidence option, from the working folder. */
function insideRepo(option, value) {
  const abs = path.resolve(process.cwd(), value);
  const rel = path.relative(REPO, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(option + ' must stay inside the repository');
  }
  return abs;
}

function workFolder(keep) {
  if (keep) {
    const abs = insideRepo('--keep', keep);
    fs.mkdirSync(abs, { recursive: true });
    return { dir: abs, remove: () => {} };
  }
  const parent = path.join(GENERATOR, 'tests', 'artifacts');
  fs.mkdirSync(parent, { recursive: true });
  const dir = fs.mkdtempSync(path.join(parent, 'ci-quick-'));
  return { dir: dir, remove: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

/** `node tests/node-runner.js <selector> --list-tests=<new file>` in `cwd`: the inventory, or { error }. */
function register(cwd, selector, name, dir) {
  const file = path.join(dir, name + '.json');
  const child = childProcess.spawnSync(process.execPath,
    ['tests/node-runner.js'].concat(selector, ['--list-tests=' + path.relative(cwd, file)]),
    { cwd: cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (child.error || child.status !== 0 || !fs.existsSync(file)) {
    const text = ((child.stderr || '') + (child.stdout || '')).trim().split(/\r?\n/).slice(-3).join(' | ');
    const why = child.error ? child.error.message : text;
    return { error: 'registration failed (exit ' + child.status + '): ' + why };
  }
  return readJson(file);
}

function registerShards(shards, dir) {
  const found = {};
  shards.forEach((shard) => {
    found[shard.id] = register(GENERATOR, shardArgs(shard).slice(1), 'shard-' + shard.id, dir);
  });
  return found;
}

function report(problems) {
  problems.forEach((p) => console.error('PROBLEM: ' + p));
}

function check(manifest, keep) {
  const shapeProblems = checkShape(manifest);
  if (shapeProblems.length > 0) {
    report(shapeProblems);
    return 1;
  }
  const work = workFolder(keep);
  let result;
  try {
    const shards = [];
    manifest.groups.forEach((g) => g.shards.forEach((s) => shards.push(s)));
    const listings = {
      full: register(GENERATOR, [], 'generator-all', work.dir),
      shards: registerShards(shards, work.dir),
      player: register(PLAYER, [], 'player-all', work.dir)
    };
    result = validateCoverage(manifest, listings, discover(manifest));
  } finally {
    work.remove();
  }
  const s = result.summary;
  const limit = manifest.job.timeoutMinutes * 60;
  console.log('Generator quick set: ' + s.quickTests + ' tests in ' + s.quickSuites + ' suites; ' +
    'Player quick set: ' + s.playerTests + ' tests in ' + s.playerSuites + ' suites');
  s.groups.forEach((g) => {
    console.log('  group ' + g.id + ': ' + g.shards.length + ' shard(s) (' + g.shards.join(', ') + '), ' +
      g.tests + ' tests, projected ' + g.projectedSeconds + ' s of ' + g.limitSeconds + ' s');
  });
  console.log('  Player job: projected ' + s.player.projectedSeconds + ' s of ' + limit + ' s');
  if (result.problems.length > 0) {
    report(result.problems);
    console.error('The quick-tier grouping check FAILED (' + result.problems.length + ' problem(s)).');
    return 1;
  }
  console.log('Every quick test is in exactly one shard (' + s.covered + ' of ' + s.quickTests + '), no manual ' +
    'or unknown suite, no empty shard, every job inside its limit: check passed.');
  return 0;
}

function runGroup(manifest, group, options) {
  const work = workFolder(null);
  let listings;
  try {
    listings = registerShards(group.shards, work.dir);
  } finally {
    work.remove();
  }
  const problems = [];
  group.shards.forEach((shard) => {
    problems.push.apply(problems, checkShardInventory(shard, listings[shard.id]));
  });
  if (problems.length > 0) {
    report(problems);
    return 1;
  }
  const counts = {};
  group.shards.forEach((shard) => { counts[shard.id] = listings[shard.id].tests.length; });
  let extra = null;
  if (options.resultsDir) {
    const dir = insideRepo('--results-dir', options.resultsDir);
    extra = (shard) => ['--results=' + path.relative(GENERATOR, path.join(dir, 'generator-' + shard.id + '.json'))];
  }
  if (options.dryRun) {
    group.shards.forEach((shard) => {
      const args = shardArgs(shard).concat(extra ? extra(shard) : []);
      console.log('would run in generator/: node ' + args.join(' ') + '  (' + counts[shard.id] +
        ' tests, bound ' + shard.projectionSeconds + ' s)');
    });
    console.log('dry run: ' + group.id + ' projects ' + projectedSeconds(manifest, group.shards) + ' s of ' +
      manifest.job.timeoutMinutes * 60 + ' s; no test was run');
    return 0;
  }
  const spawn = (args) => childProcess.spawnSync(process.execPath, args, { cwd: GENERATOR, stdio: 'inherit' });
  return executeShards(group, counts, spawn, (line) => console.log(line), extra).code;
}

/** The command line: { command, keep, dryRun, resultsDir, positional }, or an error text. */
function parseArgs(argv) {
  const out = { command: argv[0], keep: null, dryRun: false, resultsDir: null, positional: [] };
  for (const arg of argv.slice(1)) {
    let m;
    if (out.command === 'check' && (m = /^--keep=(.+)$/.exec(arg))) out.keep = m[1];
    else if (out.command === 'run' && (m = /^--results-dir=(.+)$/.exec(arg))) out.resultsDir = m[1];
    else if (out.command === 'run' && arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--')) return { error: 'unknown option ' + arg };
    else out.positional.push(arg);
  }
  const wanted = { check: 0, matrix: 0, list: 1, run: 1 }[out.command];
  if (wanted === undefined || out.positional.length !== wanted) return { error: null };
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.error !== undefined) {
    console.error((args.error ? args.error + '\n' : '') + USAGE);
    return 2;
  }
  const manifest = readJson(MANIFEST);
  if (args.command === 'check') return check(manifest, args.keep);
  const shapeProblems = checkShape(manifest);
  if (shapeProblems.length > 0) {
    report(shapeProblems);
    return 1;
  }
  if (args.command === 'matrix') {
    console.log(JSON.stringify({ include: manifest.groups.map((g) => ({ group: g.id, name: g.name })) }));
    return 0;
  }
  const group = manifest.groups.find((g) => g.id === args.positional[0]);
  if (!group) {
    console.error('unknown group ' + args.positional[0] + '; groups: ' + manifest.groups.map((g) => g.id).join(', '));
    return 2;
  }
  if (args.command === 'list') {
    console.log(group.shards.reduce((all, s) => all.concat(s.suites), []).join(','));
    return 0;
  }
  return runGroup(manifest, group, args);
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(String(err && err.message || err));
    process.exitCode = 1;
  }
}

module.exports = {
  checkShape: checkShape, checkInventory: checkInventory, checkShardInventory: checkShardInventory,
  validateCoverage: validateCoverage, executeShards: executeShards, shardArgs: shardArgs,
  projectedSeconds: projectedSeconds, parseArgs: parseArgs
};
