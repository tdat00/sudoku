'use strict';

/*
 * Self-test of generator-quick.js on synthetic plans: a complete one, a gap, a duplicate, an unknown suite, a manual
 * suite in a group, a shard that selects nothing, a registration error, a new quick or manual suite nobody owns, a
 * missing or surplus test in a shard, a job over its limit, a missing shared suite in the Player, and the exit
 * semantics of the shard runner. Nothing is generated and no test of the repository runs.
 *
 *   node .github/scripts/generator-quick.selftest.js        (exit 0 when every check passed, 1 otherwise)
 */
const quick = require('./generator-quick.js');

let failures = 0;
let checks = 0;

function expect(name, condition, detail) {
  checks++;
  if (!condition) {
    failures++;
    console.error('FAIL: ' + name + (detail ? ' (' + detail + ')' : ''));
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value));

function manifest() {
  return {
    schema: 1, kind: 'ci-generator-quick-groups',
    job: { timeoutMinutes: 30, ciSlowdownFactor: 3, jobOverheadSeconds: 180 },
    groups: [
      { id: 'g1', name: 'one', shards: [
        { id: 's1', suites: ['a', 'b'], projectionSeconds: 60 },
        { id: 's2', suites: ['c'], projectionSeconds: 30 }
      ] },
      { id: 'g2', name: 'two', shards: [{ id: 's3', suites: ['d'], projectionSeconds: 100 }] }
    ],
    player: { projectionSeconds: 60 },
    outOfCi: { manualSuites: ['m1'], tools: ['generator/tests/tool.js'] }
  };
}

const ROWS = { a: 2, b: 1, c: 1, d: 3 };

function rows(suites) {
  const out = [];
  suites.forEach((suite) => {
    for (let i = 0; i < ROWS[suite]; i++) out.push({ suite: suite, ordinal: i, fullName: suite + ' > t' + i });
  });
  return out;
}

function inventory(set, suites, tests) {
  return {
    schema: 1, complete: true, registrationErrors: [], selection: { set: set, suites: suites, filter: null, exact: null },
    tests: tests || rows(suites)
  };
}

function listings() {
  return {
    full: inventory('quick', ['a', 'b', 'c', 'd']),
    shards: { s1: inventory('suites', ['a', 'b']), s2: inventory('suites', ['c']), s3: inventory('suites', ['d']) },
    player: inventory('quick', ['a', 'x', 'y'], [{ suite: 'a', ordinal: 0, fullName: 'a > t0' }])
  };
}

const DISK = { quick: ['a', 'b', 'c', 'd'], core: ['a'], manual: ['m1'], missingTools: [] };

function problemsOf(m, l, disk) {
  return quick.validateCoverage(m, l, disk || DISK).problems;
}

function has(problems, text) {
  return problems.some((p) => p.includes(text));
}

// 1. A complete plan passes, and the summary says what it covers.
const complete = quick.validateCoverage(manifest(), listings(), DISK);
expect('complete plan has no problem', complete.problems.length === 0, complete.problems.join(' | '));
expect('summary counts the tests', complete.summary.quickTests === 7 && complete.summary.covered === 7);
expect('summary projects g1', complete.summary.groups[0].projectedSeconds === 180 + 3 * 90);

// 2. A gap: a quick suite that no shard names, and its tests.
let m = manifest();
m.groups[1].shards[0].suites = ['x'];
let l = listings();
l.shards.s3 = inventory('suites', ['x'], []);
let p = problemsOf(m, l);
expect('a quick suite without a group fails', has(p, 'quick suite d has no CI group'), p.join(' | '));
expect('an unknown suite fails', has(p, 'x is not a quick suite'));
expect('its tests are reported as in no shard', has(p, '3 quick test(s) in no shard'));

// 3. A new quick suite on disk that the runner registers and no group owns.
let disk = Object.assign({}, DISK, { quick: ['a', 'b', 'c', 'd', 'e'] });
p = problemsOf(manifest(), listings(), disk);
expect('the folders and the runner must agree', has(p, 'the runner registers 4 quick suites, the folders hold 5'));
expect('a new quick suite has no group', has(p, 'quick suite e has no CI group'));
l = listings();
l.full = inventory('quick', ['a', 'b', 'c', 'd', 'e'], rows(['a', 'b', 'c', 'd']).concat([
  { suite: 'e', ordinal: 0, fullName: 'e > t0' }]));
p = problemsOf(manifest(), l, disk);
expect('a new suite that registers is reported, with its test missing', has(p, 'quick suite e has no CI group') &&
  has(p, '1 quick test(s) in no shard: e/0'), p.join(' | '));

// 4. A duplicate suite in two shards, and a duplicate test across two shards.
m = manifest();
m.groups[1].shards[0].suites = ['d', 'c'];
p = quick.checkShape(m);
expect('a suite in two shards is refused', has(p, 'suite c is also in shard s2'), p.join(' | '));
l = listings();
l.shards.s3 = inventory('suites', ['d'], rows(['d']).concat([{ suite: 'c', ordinal: 0, fullName: 'c > t0' }]));
p = problemsOf(manifest(), l);
expect('a test selected by two shards is a duplicate', has(p, '1 quick test(s) in two shards: c/0 in s2 and s3'),
  p.join(' | '));
expect('a test of another suite in a shard is reported', has(p, 'shard s3: a test of another suite is selected: c/0'));

// 5. A manual suite in a group, an undeclared manual suite, a stale declaration.
m = manifest();
m.groups[1].shards[0].suites = ['d', 'm1'];
l = listings();
l.shards.s3 = inventory('suites', ['d', 'm1'], rows(['d']).concat([{ suite: 'm1', ordinal: 0, fullName: 'm1 > t0' }]));
p = problemsOf(m, l);
expect('a manual suite in a group fails', has(p, 'm1 is a manual suite; manual and deep suites stay out of CI') &&
  has(p, 'manual suite m1 is also in a CI shard'), p.join(' | '));
p = problemsOf(manifest(), listings(), Object.assign({}, DISK, { manual: ['m1', 'm2'] }));
expect('a new manual suite must be declared', has(p, 'manual suite m2 is not declared in outOfCi.manualSuites'));
p = problemsOf(manifest(), listings(), Object.assign({}, DISK, { manual: [] }));
expect('a stale manual declaration fails', has(p, 'outOfCi.manualSuites names m1, which is not in generator/tests/manual'));
p = problemsOf(manifest(), listings(), Object.assign({}, DISK, { missingTools: ['generator/tests/tool.js'] }));
expect('a missing out-of-CI tool fails', has(p, 'outOfCi.tools names generator/tests/tool.js, which does not exist'));

// 6. Zero selection, registration errors and a failed registration.
l = listings();
l.shards.s2 = inventory('suites', ['c'], []);
p = problemsOf(manifest(), l);
expect('a shard that selects nothing fails', has(p, 'shard s2: zero tests selected'), p.join(' | '));
l = listings();
l.shards.s1.registrationErrors = [{ type: 'describe', fullName: 'a', name: 'Error', message: 'boom' }];
p = problemsOf(manifest(), l);
expect('a registration error fails', has(p, 'shard s1: incomplete inventory or registration errors'));
l = listings();
l.full = { error: 'registration failed (exit 1): Failed to load source file' };
p = problemsOf(manifest(), l);
expect('a failed registration fails', has(p, 'quick set of the Generator: registration failed (exit 1)'));
l = listings();
l.shards.s3 = { error: 'registration failed (exit 1): Unknown suite: d' };
p = problemsOf(manifest(), l);
expect('an unknown suite at the runner fails', has(p, 'shard s3: registration failed (exit 1): Unknown suite'));
l = listings();
l.full.complete = false;
expect('an incomplete full inventory fails', has(problemsOf(manifest(), l), 'quick set of the Generator: incomplete'));

// 7. A shard that omits a test of its suite, or selects another set of suites than the manifest names.
l = listings();
l.shards.s1 = inventory('suites', ['a', 'b'], rows(['a', 'b']).slice(1));
p = problemsOf(manifest(), l);
expect('a test missing from its shard is reported', has(p, '1 quick test(s) in no shard: a/0'), p.join(' | '));
l = listings();
l.shards.s1.selection.suites = ['a'];
p = problemsOf(manifest(), l);
expect('a runner selection that differs from the shard fails', has(p, 'shard s1: the runner selected a, not a,b'));
l = listings();
l.full.selection.filter = 'x';
expect('a filtered full inventory is refused', has(problemsOf(manifest(), l), 'not the whole quick set'));
l = listings();
l.full.tests.push({ suite: 'a', ordinal: 5, fullName: 'a > t0' });
expect('a repeated full name is reported', has(problemsOf(manifest(), l), 'repeats a/0'));

// 8. The shape: names, limits, budgets.
m = manifest();
m.job.timeoutMinutes = 31;
expect('a job limit above 30 minutes is refused', has(quick.checkShape(m), 'job.timeoutMinutes'));
m = manifest();
m.groups[0].shards[0].projectionSeconds = 440;
m.groups[0].shards[1].projectionSeconds = 150;
p = quick.checkShape(m);
expect('a group over its limit must be split', has(p, 'group g1 projects 1950 s') && !has(p, 'group g2'), p.join(' | '));
m = manifest();
m.groups[0].shards[0].suites = ['a,b'];
expect('a comma in a suite name is refused', has(quick.checkShape(m), 'is not a suite name'));
m = manifest();
m.groups[0].shards[0].suites = ['--all'];
expect('an option in place of a suite is refused', has(quick.checkShape(m), 'is not a suite name'));
m = manifest();
delete m.groups[0].shards[1].projectionSeconds;
expect('a shard without a projection is refused', has(quick.checkShape(m), 'projectionSeconds must be a finite number'));
m = manifest();
m.groups = [];
expect('no group at all is refused', has(quick.checkShape(m), 'groups must be a non-empty list'));
m = manifest();
m.groups[1].id = 'g1';
expect('a repeated group id is refused', has(quick.checkShape(m), 'the id is used twice'));
m = manifest();
m.player.projectionSeconds = 900;
expect('a Player bound above 450 s is refused', has(quick.checkShape(m), 'player.projectionSeconds'));

// 9. The Player: every shared suite must be in its quick set, and it must select tests.
l = listings();
l.player = inventory('quick', ['x', 'y'], [{ suite: 'x', ordinal: 0, fullName: 'x > t0' }]);
expect('a shared suite missing from the Player fails', has(problemsOf(manifest(), l), 'shared suite a is not in the Player'));
l = listings();
l.player = inventory('quick', ['a'], []);
expect('a Player quick set of no test fails', has(problemsOf(manifest(), l), 'quick set of the Player: zero tests'));

// 10. The argument array is the shard's, as one option, and the runner keeps going after a failure.
expect('the shard command is an argument array', JSON.stringify(quick.shardArgs(manifest().groups[0].shards[0])) ===
  JSON.stringify(['tests/node-runner.js', '--suite=a,b']));
function run(statuses) {
  const seen = [];
  const lines = [];
  let i = 0;
  const outcome = quick.executeShards(manifest().groups[0], { s1: 3, s2: 1 }, (args) => {
    seen.push(args);
    return statuses[i++];
  }, (line) => lines.push(line));
  return { outcome: outcome, seen: seen, lines: lines };
}
let r = run([{ status: 0 }, { status: 0 }]);
expect('all shards passing exits 0', r.outcome.code === 0 && r.seen.length === 2);
r = run([{ status: 1 }, { status: 0 }]);
expect('a failing shard exits 1 and the next shard still runs', r.outcome.code === 1 && r.seen.length === 2 &&
  r.lines.some((x) => x === 'FAILED: s1'));
r = run([{ status: 0 }, { status: 2 }]);
expect('a failure in a later shard is not masked', r.outcome.code === 1);
r = run([{ status: null }, { status: 0 }]);
expect('a shard that has no exit status (a signal) is a failure', r.outcome.code === 1);
r = run([{ error: new Error('spawn failed'), status: null }, { status: 0 }]);
expect('a shard that cannot start is a failure', r.outcome.code === 1 && r.lines.some((x) => /could not run/.test(x)));

// 11. The evidence option adds only its argument, and the command line is read strictly.
const seen = [];
quick.executeShards(manifest().groups[0], { s1: 3, s2: 1 }, (args) => {
  seen.push(args);
  return { status: 0 };
}, () => {}, (shard) => ['--results=x/' + shard.id + '.json']);
expect('--results-dir adds only the results option', JSON.stringify(seen[0]) ===
  JSON.stringify(['tests/node-runner.js', '--suite=a,b', '--results=x/s1.json']) && seen[1].length === 3);
let a = quick.parseArgs(['run', 'g1', '--results-dir=d', '--dry-run']);
expect('run takes a group, --dry-run and --results-dir', a.error === undefined && a.dryRun && a.resultsDir === 'd' &&
  a.positional[0] === 'g1');
a = quick.parseArgs(['check', '--keep=k']);
expect('check takes --keep', a.error === undefined && a.keep === 'k');
expect('an unknown option is refused', quick.parseArgs(['check', '--dry-run']).error === 'unknown option --dry-run');
expect('--results-dir is for run only', quick.parseArgs(['check', '--results-dir=d']).error !== undefined);
expect('run without a group is refused', quick.parseArgs(['run']).error === null);
expect('list with two groups is refused', quick.parseArgs(['list', 'a', 'b']).error === null);
expect('an unknown command is refused', quick.parseArgs(['sweep']).error === null);
expect('matrix takes no argument', quick.parseArgs(['matrix']).error === undefined &&
  quick.parseArgs(['matrix', 'x']).error === null);
console.log(checks + ' checks, ' + failures + ' failed');
process.exitCode = failures === 0 ? 0 : 1;
