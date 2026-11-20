'use strict';

/*
 * MS05r6a: what changed in a saved fixture, field by field: the file as `git show <rev>:<path>` against the file in the
 * working tree. Read-only; no generation. It evaluates both classic scripts in a fresh context (they only set
 * SG.fixtures.<name>) and compares the data, writing a summary JSON.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/fixture-diff.cjs --path=generator/tests/fixtures/replay-wire.js
 *        --name=replayWire [--rev=HEAD] [--json=<file.json>] [--records=id]
 *
 * For an object keyed by id (replayWire) or an array of { id } records (replayGoldens, regression.hashes) the summary
 * lists, per record, the number of differing leaf paths, the first paths, and whether the record is new or removed.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');

function parseArgs(argv) {
  const out = { path: null, name: null, rev: 'HEAD', json: null, limit: 12 };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--path=(.+)$/.exec(arg))) out.path = m[1];
    else if ((m = /^--name=(.+)$/.exec(arg))) out.name = m[1];
    else if ((m = /^--rev=(.+)$/.exec(arg))) out.rev = m[1];
    else if ((m = /^--json=(.+)$/.exec(arg))) out.json = m[1];
    else if ((m = /^--limit=(\d+)$/.exec(arg))) out.limit = Number(m[1]);
    else throw new Error('unknown argument ' + arg);
  });
  if (!out.path || !out.name) throw new Error('usage: --path=<repo path> --name=<SG.fixtures name>');
  return out;
}

function evaluate(text, name) {
  const context = { self: undefined, globalThis: undefined };
  context.self = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(text.replace(/^\uFEFF/, ''), context);
  return JSON.parse(JSON.stringify(context.SG.fixtures[name]));
}

function leaves(a, b, at, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  const bothObjects = a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b);
  if (!bothObjects) {
    out.push({ path: at, old: preview(a), new: preview(b) });
    return;
  }
  const keys = Array.isArray(a) ? Array.from({ length: Math.max(a.length, b.length) }, (_, i) => i) :
    Array.from(new Set(Object.keys(a).concat(Object.keys(b))));
  keys.forEach((key) => leaves(a[key], b[key], at + (Array.isArray(a) ? '[' + key + ']' : '.' + key), out));
}

function preview(value) {
  const text = value === undefined ? 'undefined' : JSON.stringify(value);
  return text.length > 80 ? text.slice(0, 77) + '...' : text;
}

function recordsOf(data) {
  if (Array.isArray(data)) {
    const map = {};
    data.forEach((r, i) => { map[r && r.id !== undefined ? r.id : '#' + i] = r; });
    return map;
  }
  return data;
}

function main(argv) {
  const opts = parseArgs(argv);
  const oldText = childProcess.execFileSync('git', ['show', opts.rev + ':' + opts.path], {
    cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
  const newText = fs.readFileSync(path.join(REPO, opts.path), 'utf8');
  const oldData = recordsOf(evaluate(oldText, opts.name));
  const newData = recordsOf(evaluate(newText, opts.name));
  const ids = Array.from(new Set(Object.keys(oldData).concat(Object.keys(newData))));
  const summary = ids.map((id) => {
    if (!(id in oldData)) return { id: id, status: 'new' };
    if (!(id in newData)) return { id: id, status: 'removed' };
    const out = [];
    leaves(oldData[id], newData[id], '', out);
    return { id: id, status: out.length === 0 ? 'same' : 'changed', changedPaths: out.length,
      first: out.slice(0, opts.limit) };
  });
  const report = { path: opts.path, name: opts.name, rev: opts.rev, records: summary };
  if (opts.json) fs.writeFileSync(path.resolve(process.cwd(), opts.json), JSON.stringify(report, null, 2) + '\n', 'utf8');
  summary.forEach((r) => console.log(r.id + ': ' + r.status + (r.changedPaths ? ' (' + r.changedPaths + ' leaf paths)' : '')));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 1;
}
