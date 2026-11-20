'use strict';

/*
 * MS17b scratch: the explanation of the wire merge-check difference (E1). Reads the five canonical wires of
 * generator/tests/fixtures/replay-wire.js (one JSON object per line) and the five fresh ledgers of an evidence folder, and lists
 * EVERY path whose value differs between a canonical wire and the fresh one (a deep comparison of plain JSON: objects by key, arrays
 * by index and length), with both values. It also states what the brief expects, so that the reader can see whether the difference is
 * exactly that: one `rating.ratingVersion` per wire, 2 in the canonical wire and 3 in the fresh one, and nothing else. File-only: no
 * generation, no write. Usage (from the repository root):
 *   node generator/tests/artifacts/difficulty-v3/MS17b/wire-diff.cjs <ledger folder> [out file]
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const folder = path.resolve(process.argv[2] || path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS17b', 'wire'));
const fixture = fs.readFileSync(path.join(REPO, 'generator', 'tests', 'fixtures', 'replay-wire.js'), 'utf8');
const canonical = {};
fixture.split(/\r?\n/).forEach((line) => {
  const m = /^\s+(G\d+): (\{.*\}),?\s*$/.exec(line);
  if (m) canonical[m[1]] = JSON.parse(m[2]);
});
const lines = [];
const say = (text) => { lines.push(text); console.log(text); };

function describe(value) {
  const text = JSON.stringify(value);
  return text === undefined ? 'undefined' : (text.length > 80 ? text.slice(0, 77) + '...' : text);
}

function diff(a, b, where, out) {
  if (a === b) return;
  const aObject = a !== null && typeof a === 'object';
  const bObject = b !== null && typeof b === 'object';
  if (!aObject || !bObject || Array.isArray(a) !== Array.isArray(b)) {
    out.push({ path: where, canonical: a, fresh: b });
    return;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) out.push({ path: where + '.length', canonical: a.length, fresh: b.length });
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], where + '[' + i + ']', out);
    return;
  }
  const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b))));
  keys.forEach((k) => {
    if (!(k in a)) out.push({ path: where + '.' + k, canonical: undefined, fresh: b[k] });
    else if (!(k in b)) out.push({ path: where + '.' + k, canonical: a[k], fresh: undefined });
    else diff(a[k], b[k], where + '.' + k, out);
  });
}

say('MS17b wire difference: canonical tests/fixtures/replay-wire.js against the fresh ledgers of ' + path.relative(REPO, folder));
let total = 0;
let expected = 0;
['G09', 'G10', 'G11', 'G12', 'G13'].forEach((id) => {
  const file = path.join(folder, id + '.json');
  if (!fs.existsSync(file)) { say(id + ': no ledger'); return; }
  const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  const record = ledger.records.filter((r) => r.key === id)[0];
  const out = [];
  diff(canonical[id], record.value, id, out);
  const version = out.filter((d) => d.path === id + '.rating.ratingVersion' && d.canonical === 2 && d.fresh === 3);
  say(id + ': source ' + ledger.sourceHash.slice(0, 12) + '..., ' + out.length + ' differing path(s)' +
    (out.length === 1 && version.length === 1 ? ' - exactly rating.ratingVersion 2 -> 3' : ' - NOT only the version'));
  out.slice(0, 20).forEach((d) => say('    ' + d.path + ': canonical ' + describe(d.canonical) + ' -> fresh ' + describe(d.fresh)));
  total += out.length;
  expected += version.length;
});
say('total differing paths ' + total + ', of which the expected rating.ratingVersion 2 -> 3: ' + expected +
  (total === expected && expected === 5 ? ' (all and only the five version fields)' : ' (NOT the expected version-only difference)'));
if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(total === expected && expected === 5 ? 0 : 1);
