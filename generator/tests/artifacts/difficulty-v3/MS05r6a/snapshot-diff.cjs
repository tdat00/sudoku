'use strict';

/*
 * MS05r6a, A items 3-5 (IR04): the exact old-to-current file comparison of the producer snapshot of the 14 deep records
 * (a git ref the orchestrator supplies read-only) and the working tree. Read-only: it runs `git ls-tree`,
 * `git cat-file`, `git ls-files`, `git hash-object` and `git diff --no-index` on two scratch files (no index, ref or
 * repository file is written) and writes one JSON file and, with --patch-dir, the unified diffs.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/snapshot-diff.cjs --ref=<ref> --json=<file.json>
 *        [--patch-dir=<dir>] [--expect-patch=<repo path>=<patch file>]
 *
 * Blobs are compared as git stores them (the same line-end normalisation on both sides). The `sourceHash` of the tool
 * (tests/replay-fixtures.js `nodeEnv().identity`) is recomputed over the snapshot with the snapshot's own SOURCE_FILES,
 * to bind the ref to the recorded hash. With --patch-dir, one zero-context unified diff is written per changed path of
 * the load set (SOURCE_FILES, the tool and its fixtures, the shared loader and helpers); with --expect-patch the
 * +/- lines of that path's diff are compared with an earlier patch (MS05r5p's `store-diff.patch`).
 */
const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(GEN, '..');

function git(args, options) {
  return childProcess.execFileSync('git', args, Object.assign({
    cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore']
  }, options || {}));
}

function gitBuffer(args) {
  return childProcess.execFileSync('git', args, { cwd: REPO, maxBuffer: 1 << 28, windowsHide: true });
}

function parseArgs(argv) {
  const out = { ref: null, json: null, patchDir: null, expect: [] };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--ref=(.+)$/.exec(arg))) out.ref = m[1];
    else if ((m = /^--json=(.+)$/.exec(arg))) out.json = m[1];
    else if ((m = /^--patch-dir=(.+)$/.exec(arg))) out.patchDir = m[1];
    else if ((m = /^--expect-patch=([^=]+)=(.+)$/.exec(arg))) out.expect.push({ rel: m[1], file: m[2] });
    else throw new Error('unknown argument ' + arg);
  });
  if (!out.ref || !out.json) throw new Error('usage: --ref=<ref> --json=<file.json> [--patch-dir=<dir>]');
  return out;
}

function sourceListOf(text) {
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(text);
  if (!match) throw new Error('cannot find SOURCE_FILES');
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
}

function sourceHashOf(readText, list) {
  const hash = crypto.createHash('sha256');
  list.forEach((rel) => {
    const text = readText(path.posix.normalize('generator/' + rel));
    if (text === null) return;
    hash.update(rel + '\0' + text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
  });
  return hash.digest('hex');
}

/** The text of a top-level `function name(` of a script, up to its closing line, or null. */
function functionText(text, name) {
  const lf = text.replace(/\r\n/g, '\n');
  const start = lf.search(new RegExp('^function ' + name + '\\(', 'm'));
  if (start === -1) return null;
  const end = lf.indexOf('\n}\n', start);
  return end === -1 ? null : lf.slice(start, end + 3);
}

/** The +/- lines of a unified diff, without the file headers (what two diffs of the same change share). */
function changeLines(patch) {
  return patch.replace(/\r\n/g, '\n').split('\n').filter((line) => /^[+-]/.test(line) && !/^(\+\+\+|---) /.test(line));
}

function unifiedDiff(dir, a, b) {
  const fileA = path.join(dir, 'a.scratch');
  const fileB = path.join(dir, 'b.scratch');
  fs.writeFileSync(fileA, (a || '').replace(/\r\n/g, '\n'), 'utf8');
  fs.writeFileSync(fileB, (b || '').replace(/\r\n/g, '\n'), 'utf8');
  let text;
  try {
    text = git(['diff', '--no-index', '--no-color', '--unified=0', '--', 'a.scratch', 'b.scratch'], { cwd: dir });
  } catch (err) {
    text = err.stdout;
  }
  fs.rmSync(fileA);
  fs.rmSync(fileB);
  return String(text);
}

function main(argv) {
  const opts = parseArgs(argv);
  const refCommit = git(['rev-parse', '--verify', opts.ref + '^{commit}']).trim();
  const refTreeId = git(['rev-parse', '--verify', opts.ref + '^{tree}']).trim();
  const tree = new Map();
  git(['ls-tree', '-r', '-z', opts.ref]).split('\0').filter(Boolean).forEach((line) => {
    const m = /^(\d+) (\w+) ([0-9a-f]+)\t(.*)$/s.exec(line);
    if (m && m[2] === 'blob') tree.set(m[4], m[3]);
  });
  const work = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean)
    .filter((rel) => fs.existsSync(path.join(REPO, rel)));
  const workSet = new Set(work);
  const hashed = git(['hash-object', '--stdin-paths'], { input: work.join('\n') + '\n' }).trim().split('\n');
  if (hashed.length !== work.length) throw new Error('hash-object returned ' + hashed.length + ' ids for ' + work.length);
  const workBlob = new Map(work.map((rel, i) => [rel, hashed[i]]));

  const entries = [];
  new Set([...tree.keys(), ...workSet]).forEach((rel) => {
    const a = tree.get(rel) || null;
    const b = workBlob.get(rel) || null;
    const status = a === null ? 'added' : b === null ? 'removed' : a === b ? 'same' : 'changed';
    if (status !== 'same') entries.push({ path: rel, status: status, refBlob: a, workBlob: b });
  });
  entries.sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0));

  const refText = (rel) => {
    const id = tree.get(rel);
    return id ? gitBuffer(['cat-file', 'blob', id]).toString('utf8') : null;
  };
  const workText = (rel) => (workSet.has(rel) ? fs.readFileSync(path.join(REPO, rel), 'utf8') : null);
  const refList = sourceListOf(refText('generator/tests/node-runner.js'));
  const workList = sourceListOf(workText('generator/tests/node-runner.js'));
  const refHash = sourceHashOf(refText, refList);
  const workHash = sourceHashOf(workText, workList);

  const changedPaths = new Map(entries.map((e) => [e.path, e]));
  const sourcePaths = new Set(refList.concat(workList).map((rel) => path.posix.normalize('generator/' + rel)));
  const toolFiles = ['generator/tests/mega-contract.js', 'generator/tests/fixtures/mega-contract.js'];
  // What the deep tool requires or loads besides the engine: the shared loader, the level guard, the evidence helper.
  const loadSet = ['generator/tests/replay-fixtures.js', 'generator/tests/fixtures/tool-records.js',
    'core/tests/node-evidence.js'];
  const inLoadSet = (rel) => sourcePaths.has(rel) || toolFiles.includes(rel) || loadSet.includes(rel);
  const loadSetChanged = entries.filter((e) => inLoadSet(e.path));

  // The unhashed shared paths of the loader: their code, function by function, in the snapshot and now.
  const loaderFunctions = ['readSource', 'sourceList', 'loadFixtures', 'inside', 'gitState', 'nodeEnv'];
  const loaderPath = 'generator/tests/replay-fixtures.js';
  const guardPath = 'generator/tests/fixtures/tool-records.js';
  const loader = loaderFunctions.map((name) => {
    const a = functionText(refText(loaderPath), name);
    const b = functionText(workText(loaderPath), name);
    return { function: name, found: a !== null && b !== null, identical: a !== null && a === b };
  });
  const guardIdentical = !changedPaths.has(guardPath) && tree.has(guardPath) && workSet.has(guardPath);

  const patches = [];
  let expected = [];
  if (opts.patchDir) {
    const dir = path.resolve(process.cwd(), opts.patchDir);
    fs.mkdirSync(dir, { recursive: true });
    loadSetChanged.forEach((e) => {
      const text = unifiedDiff(dir, refText(e.path), workText(e.path))
        .replace(/a\/a\.scratch/g, 'a/' + e.path).replace(/b\/b\.scratch/g, 'b/' + e.path);
      const file = e.path.replace(/[\\/]/g, '__') + '.patch';
      fs.writeFileSync(path.join(dir, file), text.replace(/\n/g, '\r\n'), 'utf8');
      patches.push({ path: e.path, file: file, changeLines: changeLines(text).length, text: text });
    });
    expected = opts.expect.map((x) => {
      const mine = patches.filter((p) => p.path === x.rel)[0];
      const theirs = fs.readFileSync(path.resolve(process.cwd(), x.file), 'utf8');
      const a = mine ? changeLines(mine.text) : null;
      const b = changeLines(theirs);
      return { path: x.rel, patch: x.file, equal: a !== null && JSON.stringify(a) === JSON.stringify(b),
        changeLines: b.length };
    });
  }

  const report = {
    schema: 1,
    kind: 'snapshot-diff',
    ref: opts.ref,
    refCommit: refCommit,
    refTree: refTreeId,
    counts: {
      refFiles: tree.size, workFiles: workSet.size, changed: entries.filter((e) => e.status === 'changed').length,
      added: entries.filter((e) => e.status === 'added').length,
      removed: entries.filter((e) => e.status === 'removed').length
    },
    sourceFiles: {
      refCount: refList.length, workCount: workList.length,
      listsEqual: JSON.stringify(refList) === JSON.stringify(workList),
      refOnly: refList.filter((r) => !workList.includes(r)), workOnly: workList.filter((r) => !refList.includes(r)),
      refSourceHash: refHash, workSourceHash: workHash,
      changed: entries.filter((e) => sourcePaths.has(e.path))
    },
    toolFiles: toolFiles.map((rel) => ({ path: rel, changed: changedPaths.has(rel) })),
    loader: { path: loaderPath, functions: loader, levelGuard: { path: guardPath, identical: guardIdentical } },
    loadSetChanged: loadSetChanged.map((e) => ({ path: e.path, status: e.status, refBlob: e.refBlob,
      workBlob: e.workBlob })),
    patches: patches.map((p) => ({ path: p.path, file: p.file, changeLines: p.changeLines })),
    expectedPatches: expected,
    entries: entries
  };
  fs.writeFileSync(path.resolve(process.cwd(), opts.json), JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('ref ' + opts.ref + ' = ' + refCommit + ' (tree ' + refTreeId + ')');
  console.log('files: ref ' + tree.size + ', working tree ' + workSet.size + ': changed ' + report.counts.changed +
    ', added ' + report.counts.added + ', removed ' + report.counts.removed);
  console.log('SOURCE_FILES: ref ' + refList.length + ', working tree ' + workList.length + ', lists equal ' +
    report.sourceFiles.listsEqual);
  console.log('sourceHash recomputed over the ref   ' + refHash);
  console.log('sourceHash of the working tree       ' + workHash);
  console.log('changed SOURCE_FILES: ' + (report.sourceFiles.changed.map((e) => e.path + ' (' + e.status + ')')
    .join(', ') || 'none'));
  console.log('tool files changed: ' + (report.toolFiles.filter((t) => t.changed).map((t) => t.path).join(', ') ||
    'none'));
  console.log('load set changed: ' + (report.loadSetChanged.map((e) => e.path).join(', ') || 'none'));
  console.log('loader functions identical: ' + loader.map((f) => f.function + '=' + f.identical).join(', '));
  console.log('level guard (tool-records.js) identical: ' + guardIdentical);
  expected.forEach((x) => console.log('patch of ' + x.path + ' has the same +/- lines as ' + x.patch + ': ' + x.equal));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 1;
}
