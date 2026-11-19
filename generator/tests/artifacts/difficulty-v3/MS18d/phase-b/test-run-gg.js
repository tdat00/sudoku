'use strict';

/*
 * MS18d Phase B task-owned tests of run-gg.js (the compound driver of the GG hash shards) on short-lived
 * STAND-INS (fake-shard.js) in a scratch tree of the project: never perf.js, never a generator, never a
 * measurement. They show the admission and resume, the clean pass, and the stop for a ruling on a nonzero
 * exit, an incomplete or missing ledger, a wrong identity, a stray or `.partial` file, a shard already
 * run, and a kill mid-run that leaves the partial transcript and no end record. Run it through the lock
 * wrapper:
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-b/test-run-gg.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RUN = path.join(__dirname, 'run-gg.js');
const FAKE = path.join(__dirname, 'fake-shard.js');
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const SRC = 'ab'.repeat(32);
const LEDGER_DIR = '..\\docs\\difficulty-v3\\evidence\\MS18d\\hashes\\';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};
async function until(test, what, limitMs) {
  const end = Date.now() + (limitMs || 10000);
  for (;;) {
    const value = test();
    if (value) return value;
    if (Date.now() > end) throw new Error('timed out waiting for ' + what);
    await sleep(30);
  }
}

const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-b-gg-'));
const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

function makeRepo(name) {
  const root = path.join(scratch, name);
  fs.mkdirSync(path.join(root, 'generator'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'hashes'), { recursive: true });
  return {
    root, plan: path.join(root, 'plan.json'),
    ledgers: path.join(root, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'hashes'),
    gg: path.join(root, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'phase-b', 'gg')
  };
}

const logOf = (repo, label) => path.join(repo.gg, 'logs', label + '.txt');
const runsOf = (repo) => readText(path.join(repo.gg, 'shard-runs.jsonl')).split('\r\n')
  .filter((l) => l !== '').map((l) => JSON.parse(l));

function item(label, key, from, projection, extra) {
  return { label, projectionSeconds: projection, projectionBasis: 'stand-in',
    args: [FAKE, '--hash-key=' + key, '--hash-from=' + from, '--hash-count=5',
      '--hash-record=' + LEDGER_DIR + label + '.json'].concat(extra || []) };
}

function writePlan(repo, items) {
  fs.writeFileSync(repo.plan, JSON.stringify(items, null, 2));
}

function start(repo, extra, env) {
  const args = [RUN, '--plan=' + repo.plan, '--repo=' + repo.root, '--source-hash=' + SRC]
    .concat(extra || []);
  const proc = spawn(process.execPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: Object.assign({}, process.env, { FAKE_SOURCE_HASH: SRC }, env || {})
  });
  const run = { proc, out: '' };
  proc.stdout.on('data', (d) => { run.out += d; });
  proc.stderr.on('data', (d) => { run.out += d; });
  run.done = new Promise((resolve) => proc.on('close', (code, signal) => resolve({ code, signal })));
  return run;
}

async function drive(repo, extra, env) {
  const run = start(repo, extra, env);
  const end = await run.done;
  return { code: end.code, out: run.out };
}

let passed = 0;
const failed = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

const THREE = (mid) => [item('g1', 'a/x', 0, 10), item('g2', 'b/y', 5, 10, mid ? ['--fake=' + mid] : []),
  item('g3', 'c/z', 10, 10)];

async function main() {
  await test('a clean compound: every shard passes, transcripts and ledgers are complete, runs are recorded',
    async () => {
      const repo = makeRepo('clean');
      writePlan(repo, THREE());
      const r = await drive(repo);
      assert.strictEqual(r.code, 0, r.out);
      assert.ok(/compound complete: 3 shard\(s\)/.test(r.out) && /next --from=3/.test(r.out), r.out);
      ['g1', 'g2', 'g3'].forEach((label) => {
        assert.ok(/exit=0 seconds=[0-9.]+\r\n$/.test(readText(logOf(repo, label))), label);
        const ledger = JSON.parse(readText(path.join(repo.ledgers, label + '.json')));
        assert.strictEqual(ledger.records.length, 5);
      });
      const runs = runsOf(repo);
      assert.deepStrictEqual(runs.map((x) => x.event), ['start', 'end', 'start', 'end', 'start', 'end']);
      assert.ok(runs.filter((x) => x.event === 'end').every((x) => x.pass === true && x.exit === 0));
    });

  await test('admission: a shard that does not fit is not started, the compound ends normally and resumes',
    async () => {
      const repo = makeRepo('admit');
      writePlan(repo, [item('g1', 'a/x', 0, 2), item('g2', 'b/y', 5, 2)]);
      const first = await drive(repo, ['--budget-seconds=3'], { FAKE_HOLD_MS: '1800' });
      assert.strictEqual(first.code, 0, first.out);
      assert.ok(/compound stops before #1 g2/.test(first.out) && /resume with --from=1/.test(first.out),
        first.out);
      assert.ok(!fs.existsSync(logOf(repo, 'g2')) && !fs.existsSync(path.join(repo.ledgers, 'g2.json')));
      const second = await drive(repo, ['--from=1', '--budget-seconds=3']);
      assert.strictEqual(second.code, 0, second.out);
      assert.ok(fs.existsSync(path.join(repo.ledgers, 'g2.json')));
      assert.strictEqual(runsOf(repo).filter((x) => x.event === 'end' && x.pass).length, 2);
    });

  await test('a nonzero exit stops the compound: the next shard never starts, the failed one is kept',
    async () => {
      const repo = makeRepo('fail');
      writePlan(repo, THREE('fail'));
      const r = await drive(repo);
      assert.strictEqual(r.code, 1, r.out);
      assert.ok(/STOP at #1/.test(r.out) && /not a result of the check/.test(r.out), r.out);
      assert.ok(!fs.existsSync(logOf(repo, 'g3')) && !fs.existsSync(path.join(repo.ledgers, 'g3.json')));
      assert.ok(!fs.existsSync(path.join(repo.ledgers, 'g2.json')), 'no ledger of the failed shard');
      assert.ok(/an error line|stand-in failure/.test(readText(logOf(repo, 'g2'))));
      assert.ok(/exit=1 seconds=[0-9.]+\r\n$/.test(readText(logOf(repo, 'g2'))));
      const end = runsOf(repo).filter((x) => x.event === 'end' && x.label === 'g2')[0];
      assert.strictEqual(end.pass, false);
      const again = await drive(repo, ['--from=1']);
      assert.strictEqual(again.code, 3, again.out);
      assert.ok(/STOP before #1 g2: its transcript or ledger exists already/.test(again.out), again.out);
      assert.strictEqual(runsOf(repo).length, 4, 'no new record, nothing was started again');
    });

  for (const [mode, reason] of [['partial', /4 records, expected 5/], ['badsource', /sourceHash/],
    ['nofile', /the ledger does not exist/]]) {
    await test('exit 0 is not a pass without its complete ledger of the right identity: ' + mode,
      async () => {
        const repo = makeRepo('bad-' + mode);
        writePlan(repo, [item('g1', 'a/x', 0, 10, ['--fake=' + mode]), item('g2', 'b/y', 5, 10)]);
        const r = await drive(repo);
        assert.strictEqual(r.code, 3, r.out);
        assert.ok(reason.test(r.out), r.out);
        assert.ok(!fs.existsSync(logOf(repo, 'g2')), 'the next shard never started');
        assert.ok(/exit=0 seconds=/.test(readText(logOf(repo, 'g1'))), 'its transcript is kept');
        if (mode !== 'nofile') {
          assert.ok(fs.existsSync(path.join(repo.ledgers, 'g1.json')), 'its ledger is kept');
        }
        assert.strictEqual(runsOf(repo).filter((x) => x.event === 'end')[0].pass, false);
      });
  }

  await test('a shard already run is never run again or replaced; nothing is touched', async () => {
    const repo = makeRepo('again');
    writePlan(repo, THREE());
    assert.strictEqual((await drive(repo)).code, 0);
    const snap = () => ['g1', 'g2', 'g3'].map((l) => readText(logOf(repo, l)) +
      readText(path.join(repo.ledgers, l + '.json'))).join('|') +
      readText(path.join(repo.gg, 'shard-runs.jsonl'));
    const before = snap();
    const r = await drive(repo);
    assert.strictEqual(r.code, 3, r.out);
    assert.ok(/STOP before #0 g1: its transcript or ledger exists already/.test(r.out), r.out);
    assert.strictEqual(snap(), before);
  });

  await test('a stray or .partial file in the ledgers directory stops everything before the first shard',
    async () => {
      for (const name of ['stray.json', 'g1.json.partial']) {
        const repo = makeRepo('stray-' + name.replace(/\W/g, ''));
        writePlan(repo, THREE());
        fs.writeFileSync(path.join(repo.ledgers, name), 'x');
        const r = await drive(repo);
        assert.strictEqual(r.code, 3, r.out);
        assert.ok(/STOP before anything ran: stray file\(s\)/.test(r.out) && r.out.indexOf(name) !== -1,
          r.out);
        assert.ok(!fs.existsSync(repo.gg), 'nothing was written');
        assert.strictEqual(readText(path.join(repo.ledgers, name)), 'x', 'and nothing deleted');
      }
    });

  await test('the compound is killed mid-shard: the partial transcript stays, no end record, no ledger',
    async () => {
      const repo = makeRepo('kill');
      writePlan(repo, [item('g1', 'a/x', 0, 10), item('g2', 'b/y', 5, 10, ['--fake=hang'])]);
      const pids = path.join(repo.root, 'pids.txt');
      const run = start(repo, [], { FAKE_PIDFILE: pids });
      await until(() => /seeds/.test(readText(logOf(repo, 'g2'))), 'the partial transcript of shard 2');
      const during = readText(logOf(repo, 'g2'));
      run.proc.kill('SIGKILL');
      await run.done;
      assert.ok(/seeds 6, 7, 8, 9, 10/.test(during) && !/(^|\r\n)(exit=|signal=)/.test(during), during);
      const runs = runsOf(repo);
      assert.deepStrictEqual(runs.map((x) => x.event + ':' + x.label), ['start:g1', 'end:g1', 'start:g2']);
      assert.ok(fs.existsSync(path.join(repo.ledgers, 'g1.json')));
      assert.ok(!fs.existsSync(path.join(repo.ledgers, 'g2.json')));
      const shards = readText(pids).split('\n').filter((l) => l !== '').map((l) => Number(l.split(' ')[1]));
      shards.filter(alive).forEach((pid) => process.kill(pid, 'SIGKILL'));
      await until(() => shards.every((pid) => !alive(pid)), 'the stand-ins to be gone');
      assert.ok(!fs.existsSync(path.join(repo.ledgers, 'g2.json')));
    });

  await test('a dry run writes nothing; refusals of bad arguments and plans are exit 2', async () => {
    const repo = makeRepo('misc');
    writePlan(repo, THREE());
    const dry = await drive(repo, ['--dry-run']);
    assert.strictEqual(dry.code, 0, dry.out);
    assert.ok(/would run #0 g1/.test(dry.out) && /would run #2 g3/.test(dry.out), dry.out);
    assert.ok(!fs.existsSync(repo.gg) && fs.readdirSync(repo.ledgers).length === 0);
    const high = await drive(repo, ['--budget-seconds=451']);
    assert.strictEqual(high.code, 2);
    assert.ok(/planned at 450 s at most/.test(high.out), high.out);
    const unknown = await drive(repo, ['--bogus']);
    assert.strictEqual(unknown.code, 2);
    writePlan(repo, [{ label: 'g1', args: item('g1', 'a/x', 0, 10).args }]);
    const none = await drive(repo);
    assert.strictEqual(none.code, 2);
    assert.ok(/no projection/.test(none.out), none.out);
    writePlan(repo, [item('g1', 'a/x', 0, 500)]);
    const over = await drive(repo);
    assert.strictEqual(over.code, 2);
    assert.ok(/exceeds the budget/.test(over.out), over.out);
    assert.ok(!fs.existsSync(repo.gg));
  });
}

main().then(() => {
  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = failed.length === 0 ? 0 : 1;
}, (err) => {
  console.log('ERROR ' + (err && err.stack));
  process.exitCode = 1;
}).then(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});
