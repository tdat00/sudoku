'use strict';

/*
 * MS18c Stage 3 FAKE-DATA tests of manifest.cjs, gitro.cjs and verify.cjs: the manifest authority
 * (HEAD blob, the working-tree hash, an untracked, changed, staged-new, incomplete or self-approved
 * manifest is refused), the independent re-derivation of every row, the payload of a cell and every
 * refused flag, the read-only Git allowlist, the ancestry rule (pack-only commits only, every commit
 * checked) and the frozen-input comparison. No solver, no payload, no file written; the real manifest
 * and the real SOURCE_FILES declaration are only read.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/test-manifest.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rules = require('./rules.cjs');
const util = require('./util.cjs');
const gitro = require('./gitro.cjs');
const manifestLib = require('./manifest.cjs');
const verify = require('./verify.cjs');

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.message));
  }
}

const REAL = JSON.parse(fs.readFileSync(path.join(util.REPO, util.MANIFEST_PATH), 'utf8'));
const copy = () => JSON.parse(JSON.stringify(REAL));
const hasText = (list, text) => list.some((p) => p.indexOf(text) !== -1);

test('the committed manifest equals the independent re-derivation of the agreed rule', () => {
  assert.deepStrictEqual(manifestLib.validateManifest(REAL), []);
  assert.strictEqual(REAL.rows.length, 135);
  assert.strictEqual(manifestLib.rowOf(REAL, 'classic4/veryEasy').A, 1770);
  assert.strictEqual(manifestLib.rowOf(REAL, 'mega16/hell2').T, 4500);
  assert.strictEqual(manifestLib.rowOf(REAL, 'Classic4/veryEasy'), null);
  assert.strictEqual(manifestLib.rowOf(REAL, 'classic4-veryEasy'), null);
});

test('an edited, incomplete or self-approved manifest is refused', () => {
  const cases = [
    [(m) => { m.rows[0].A = 2000; }, 'A is not 1770'], [(m) => { m.rows[5].T += 30; }, 'T is not'],
    [(m) => { m.rows[7].binding = 'awaiting Stage 2'; }, 'binding is not approved'],
    [(m) => { m.rows.splice(3, 1); }, 'has 134 rows'], [(m) => { m.rows.reverse(); }, 'key is not'],
    [(m) => { m.rows[9].cellCount = 300; }, 'budget is not'],
    [(m) => { m.approvals.pop(); }, 'approval references'],
    [(m) => { m.approvals[1].id = 'MS18c-S2-SA2-SELF'; }, 'approval references'],
    [(m) => { m.ownerDecisions[1].individualRecoveryAuthorized = true; }, 'must not authorize'],
    [(m) => { m.monitor.version = 1; }, 'monitor is not revision 2'],
    [(m) => { m.admission.cumulativePreQualifierMaxSeconds = 95; }, 'admission caps'],
    [(m) => { m.host.pid = 4242; }, 'host.pid'],
    [(m) => { m.host.ignoreDotNetProcessName = false; }, 'ProcessName'],
    [(m) => { m.constants.H = 120; }, 'H is'], [(m) => { m.protocol.jobs = 8; }, 'protocol is not'],
    [(m) => { m.recovery.implicitCounterReset = true; }, 'S-OD14 one'],
    [(m) => { m.epoch = 'epoch'; }, 'epoch'],
    [(m) => { m.base = 'abc'; }, 'base'], [(m) => { delete m.identities.node; }, 'identities are incomplete'],
    [(m) => { m.structuralSums.A += 30; }, 'sum A']
  ];
  cases.forEach(([mutate, text]) => {
    const m = copy();
    mutate(m);
    assert.ok(hasText(manifestLib.validateManifest(m), text),
      text + ' in ' + manifestLib.validateManifest(m));
  });
  assert.deepStrictEqual(manifestLib.validateManifest(null), ['the manifest is not an object']);
});

function fakeGit(over) {
  const o = Object.assign({ atHead: { status: 0, stdout: 'a'.repeat(40) },
    hash: { status: 0, stdout: 'a'.repeat(40) }, diff: { status: 0, stdout: '' } }, over);
  return (args) => {
    if (args[0] === 'rev-parse') return o.atHead;
    if (args[0] === 'hash-object') return o.hash;
    if (args[0] === 'diff') return o.diff;
    throw new Error('unexpected ' + args.join(' '));
  };
}
const bytes = Buffer.from(JSON.stringify(REAL));
const load = (over, files) => manifestLib.loadManifest({ git: fakeGit(over), exists: () => files !== false,
  readFile: () => bytes });

test('the authority check needs the manifest in HEAD, the same blob in the working tree and no diff', () => {
  const ok = load({});
  assert.ok(ok.ok, JSON.stringify(ok.problems));
  assert.strictEqual(ok.blob, 'a'.repeat(40));
  assert.ok(hasText(load({ atHead: { status: 1, stdout: '' } }).problems, 'does not exist in HEAD'));
  const differs = load({ hash: { status: 0, stdout: 'b'.repeat(40) } });
  assert.ok(hasText(differs.problems, 'does not hash to the committed'));
  assert.ok(hasText(load({ hash: { status: 128, stdout: '' } }).problems, 'does not hash to the committed'));
  assert.ok(hasText(load({ diff: { status: 1, stdout: '' } }).problems, 'git diff reports'));
  // Untracked / staged-new: the diff may be quiet, but there is no HEAD blob: never authority.
  const untracked = load({ atHead: { status: 1, stdout: '' }, diff: { status: 0, stdout: '' } });
  assert.ok(!untracked.ok && hasText(untracked.problems, 'does not exist in HEAD'));
  assert.ok(hasText(load({}, false).problems, 'not in the working tree'));
  const broken = manifestLib.loadManifest({ git: fakeGit({}), exists: () => true,
    readFile: () => Buffer.from('{') });
  assert.ok(hasText(broken.problems, 'not JSON'));
});

test('the payload of a cell is exactly one variant, one level, jobs 4 and the fixed paths', () => {
  const row = manifestLib.rowOf(REAL, 'greaterThan/hell1');
  const argv = manifestLib.payloadArgs(row, 1, 1);
  assert.deepStrictEqual(argv.slice(0, 4), ['tests\\qualify.js', '--variant=greaterThan', '--level=hell1',
    '--jobs=4']);
  assert.strictEqual(argv[4], '--json=..\\docs\\difficulty-v3\\evidence\\MS18c\\runs\\greaterThan-hell1\\' +
    'payload-1\\admission-1\\qualifier.json');
  assert.strictEqual(argv[5].slice(-12), 'qualifier.md');
  assert.deepStrictEqual(manifestLib.payloadProblems(argv, row, 1, 1), []);
  assert.ok(manifestLib.payloadArgs(row, 2, 2)[4].indexOf('payload-2\\admission-2') !== -1);
  assert.ok(hasText(manifestLib.payloadProblems(argv, row, 1, 2), 'not exactly'));
  assert.ok(hasText(manifestLib.payloadProblems(argv, row, 2, 1), 'not exactly'));
});

test('every forbidden flag, list, shard, override and preload is refused', () => {
  const row = manifestLib.rowOf(REAL, 'classic4/veryEasy');
  const good = manifestLib.payloadArgs(row, 1, 1);
  const extras = ['--no-early-stop', '--probe=3', '--probe', '--merge=x', '--child', '--help', '-h',
    '--quiet',
    '--jobs=8', '--jobs=1', '--from=5', '--shard=2', '--seed=1', '--seeds=40', '--count=10', '--cap=64',
    '--window=4', '--attempts=8', '--max-attempts=8', '--timeout=99999', '-r', '--require', '--import=x',
    '--eval', '--max-old-space-size=8192', '--inspect'];
  extras.forEach((extra) => {
    const found = manifestLib.payloadProblems(good.concat([extra]), row, 1, 1);
    assert.ok(found.length >= 1 && hasText(found, 'refused'), extra + ' ' + JSON.stringify(found));
  });
  const lists = [['--variant=classic4,classic6'], ['--level=veryEasy,easy']];
  lists.forEach((l) => {
    const argv = good.map((a) => (a.indexOf(l[0].split('=')[0]) === 0 ? l[0] : a));
    assert.ok(hasText(manifestLib.payloadProblems(argv, row, 1, 1), 'a list of cells'));
  });
  const padded = good.map((a) => (a === '--jobs=4' ? '--jobs=04' : a));
  assert.ok(hasText(manifestLib.payloadProblems(padded, row, 1, 1), 'refused'));
  assert.ok(hasText(manifestLib.payloadProblems(['-r', 'x.js'].concat(good), row, 1, 1), 'preload'));
  assert.ok(hasText(manifestLib.payloadProblems(good.slice(0, 3), row, 1, 1), 'not exactly'));
  assert.ok(hasText(manifestLib.payloadProblems('nope', row, 1, 1), 'not an argument list'));
  assert.throws(() => manifestLib.payloadArgs({ key: 'x/y' }, 1, 1), RangeError);
});

test('the read-only Git allowlist refuses every command that could write or change the index', () => {
  const ok = [['rev-parse', 'HEAD'], ['rev-parse', '--verify', '--quiet', 'HEAD:tasks/x.json'],
    ['rev-parse', 'HEAD~1'], ['status', '--porcelain'], ['hash-object', 'tasks/x.json'],
    ['diff', '--quiet', 'HEAD', '--', 'tasks/x.json'], ['diff', '--name-only', '42e0d239', 'HEAD'],
    ['diff-tree', '--no-commit-id', '--name-only', '-r', 'ed2fe50c'], ['rev-list', '42e0d239..HEAD'],
    ['rev-list', '--parents', '-n', '1', 'ed2fe50c'], ['merge-base', '--is-ancestor', '42e0d239', 'HEAD'],
    ['config', '--get', 'core.autocrlf']];
  ok.forEach((a) => assert.ok(gitro.allowed(a), a.join(' ')));
  const bad = [['add', '.'], ['commit', '-m', 'x'], ['stash'], ['checkout', 'x'], ['push'],
    ['reset', '--hard'],
    ['hash-object', '-w', 'x'], ['hash-object', '--stdin'], ['config', 'core.autocrlf', 'false'],
    ['config', '--get', 'user.name'], ['status'], ['diff', 'HEAD'], ['rev-parse', 'HEAD; rm -rf x'],
    ['rev-list', '--all'], ['update-index', '--refresh'], ['merge-base', 'HEAD', 'x'], ['gc'], [], null];
  bad.forEach((a) => assert.ok(!gitro.allowed(a), 'must refuse ' + String(a)));
  assert.throws(() => gitro.createGit('.', () => ({ status: 0, stdout: '' }))(['add', '.']), /refused/);
});

function fakeHistory(commits) {
  return (args) => {
    const key = args[0];
    if (key === 'rev-parse') return { status: 0, stdout: commits.head };
    if (key === 'merge-base') return { status: commits.ancestor === false ? 1 : 0, stdout: '' };
    if (key === 'rev-list' && args[1] !== '--parents') {
      return { status: 0, stdout: commits.list.join('\n') };
    }
    if (key === 'rev-list') return { status: 0, stdout: (commits.parents || {})[args[4]] || 'c p1' };
    if (key === 'diff-tree') return { status: 0, stdout: (commits.files[args[4]] || []).join('\n') };
    throw new Error('unexpected ' + args.join(' '));
  };
}

test('HEAD may be the base or pack-only descendants: every intervening commit is checked', () => {
  const base = REAL.base;
  const own = verify.ancestry(fakeHistory({ head: base, list: [], files: {} }), base, verify.PACK_ROOTS);
  assert.deepStrictEqual(own.problems, []);
  const packFiles = { h1: ['tasks/difficulty-v3/MS18c-x.json'],
    h2: ['docs/difficulty-v3/y.md', 'tasks/difficulty-v3/z.md'] };
  const pack = verify.ancestry(fakeHistory({ head: 'h2', list: ['h2', 'h1'], files: packFiles }),
    base, verify.PACK_ROOTS);
  assert.deepStrictEqual(pack.problems, []);
  assert.deepStrictEqual(pack.commits, ['h1', 'h2']);
  // A code commit that a later commit reverts leaves a zero net diff, and is still refused.
  const digger = ['generator/js/engine/digger.js'];
  const reverted = verify.ancestry(fakeHistory({ head: 'h2', list: ['h2', 'h1'],
    files: { h1: digger, h2: digger } }), base, verify.PACK_ROOTS);
  assert.strictEqual(reverted.problems.length, 2);
  assert.ok(hasText(reverted.problems, 'generator/js/engine/digger.js, which is not a pack file'));
  const merge = verify.ancestry(fakeHistory({ head: 'h1', list: ['h1'], files: {},
    parents: { h1: 'h1 p1 p2' } }), base, verify.PACK_ROOTS);
  assert.ok(hasText(merge.problems, '2 parents'));
  const foreign = verify.ancestry(fakeHistory({ head: 'h1', ancestor: false, list: [], files: {} }), base,
    verify.PACK_ROOTS);
  assert.ok(hasText(foreign.problems, 'not an ancestor'));
  const outside = verify.ancestry(fakeHistory({ head: 'h1', list: ['h1'],
    files: { h1: ['README.md'] } }), base, verify.PACK_ROOTS);
  assert.ok(hasText(outside.problems, 'README.md'));
});

test('the SOURCE_FILES declaration of node-runner.js has the approved bytes, hash and entries', () => {
  const real = verify.selectorOf(fs.readFileSync(path.join(util.GENERATOR, 'tests', 'node-runner.js')));
  const sel = REAL.identities.sourceSelector;
  assert.deepStrictEqual([real.bytes, real.sha256, real.entries.length],
    [sel.bytes, sel.sha256, sel.entryCount]);
  assert.deepStrictEqual(real.entries, sel.entries);
  assert.strictEqual(sel.bytes, 1988);
  assert.strictEqual(verify.selectorOf(Buffer.from('nothing here')), null);
  const edited = Buffer.from(fs.readFileSync(path.join(util.GENERATOR, 'tests', 'node-runner.js'))
    .toString('latin1').replace("'js/ui/app.js'", "'js/ui/app2.js'"), 'latin1');
  assert.notStrictEqual(verify.selectorOf(edited).sha256, sel.sha256);
});

/** Facts that equal the manifest, then mutated one category at a time. */
function factsOf(m) {
  const id = m.identities;
  const boards = {};
  m.rows.forEach((r) => { boards[r.key.split('/')[0]] = { cellCount: r.cellCount }; });
  return JSON.parse(JSON.stringify({
    ancestry: { head: m.base, commits: [], problems: [] },
    selector: { bytes: id.sourceSelector.bytes, sha256: id.sourceSelector.sha256,
      entries: id.sourceSelector.entries },
    source: { engineSources: id.source.engineSources, fileCount: id.source.fileCount,
      files: id.source.files },
    tool: { qualifierHash: id.tool.qualifierHash, files: id.tool.files },
    policy: { digest: id.attemptPolicy.digest, object: id.attemptPolicy.object,
      files: id.attemptPolicy.files, listed: Object.keys(id.attemptPolicy.object.sources) },
    node: id.node, machine: { object: id.machine.object, digest: id.machine.digest },
    gitConfig: { autocrlf: 'true', safecrlf: 'true' }, boards: boards, ratingVersion: 3,
    preflight: m.preflight.files.map((f) => ({ file: f.file, sha256: f.sha256 }))
  }));
}

test('the frozen inputs are compared with the manifest; every changed input is named', () => {
  assert.deepStrictEqual(verify.compare(REAL, factsOf(REAL)), []);
  const cases = [
    [(f) => { f.source.files[10].sha256 = '0'.repeat(64); }, 'source files'],
    [(f) => { f.source.engineSources = '0'.repeat(16); }, 'engine.sources'],
    [(f) => { f.source.files.pop(); f.source.fileCount = 45; }, 'source file count'],
    [(f) => { f.selector.sha256 = '0'.repeat(64); }, 'SOURCE_FILES declaration SHA-256'],
    [(f) => { f.selector.entries.push('js/x.js'); }, 'SOURCE_FILES entries'],
    [(f) => { f.selector = null; }, 'was not found'],
    [(f) => { f.tool.qualifierHash = '1'.repeat(64); }, 'qualifierHash'],
    [(f) => { f.tool.files[0].bytes += 1; }, 'tool files'],
    [(f) => { f.policy.object.sources['js/engine/digger.js'] = '2'.repeat(64); }, 'attempt-policy object'],
    [(f) => { f.policy.digest = '3'.repeat(64); }, 'attempt-policy digest'],
    [(f) => { f.policy.listed.pop(); }, 'POLICY_FILES'],
    [(f) => { f.node.version = 'v24.0.0'; }, 'Node version'],
    [(f) => { f.node.execPath = 'C:\\other\\node.exe'; }, 'Node executable'],
    [(f) => { f.machine.object.logicalProcessors = 8; }, 'machine object'],
    [(f) => { f.machine.digest = '4'.repeat(64); }, 'machine digest'],
    [(f) => { f.gitConfig.autocrlf = 'false'; }, 'git line endings'],
    [(f) => { f.boards.mega16.cellCount = 144; }, 'row mega16/'],
    [(f) => { f.preflight[0].sha256 = null; }, 'preflight files'],
    [(f) => { f.ancestry.problems.push('commit x changed generator/js/a.js'); }, 'ancestry']
  ];
  cases.forEach(([mutate, text]) => {
    const f = factsOf(REAL);
    mutate(f);
    assert.ok(hasText(verify.compare(REAL, f), text),
      text + ' in ' + JSON.stringify(verify.compare(REAL, f)));
  });
});

test('verifyCell refuses an unknown or aliased cell, and an unverified manifest reads no facts', () => {
  const okLoad = () => ({ ok: true, problems: [], manifest: REAL, blob: 'a'.repeat(40),
    workingTreeSha256: 'b' });
  const ran = [];
  const gather = (m) => { ran.push('gather'); return factsOf(m); };
  const good = verify.verifyCell('classic4/veryEasy', { loadManifest: okLoad, gather: gather });
  assert.ok(good.ok, JSON.stringify(good.problems));
  assert.strictEqual(good.row.key, 'classic4/veryEasy');
  assert.strictEqual(good.epoch, 'MS18c-GQ-20261118-01');
  const alias = verify.verifyCell('classic4-veryEasy', { loadManifest: okLoad, gather: gather });
  assert.ok(!alias.ok && hasText(alias.problems, 'not a row of the manifest'));
  ran.length = 0;
  const missing = { ok: false, problems: ['the manifest does not exist in HEAD'], manifest: REAL,
    blob: null, workingTreeSha256: null };
  const bad = verify.verifyCell('classic4/veryEasy', { gather: gather, loadManifest: () => missing });
  assert.ok(!bad.ok && ran.length === 0 && hasText(bad.problems, 'does not exist in HEAD'));
});

console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
