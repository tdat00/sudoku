'use strict';
// MS13b scratch: the final inactivity differential, one locked command. For each app (Generator, Player) it runs render-diff.js
// three times, each in its own child process, and writes the three records under the evidence folder:
//   tree           the tree's sources,
//   base           every source file of the base commit, read from git into memory (nothing is written),
//   base+packs     the base commit's formatter/localization code with the TREE's two language packs (load.js, MS13B_TREE_LOCALES=1),
// then checks
//   1. the engine digest (calls, Findings, observer records, ratings or solver reports) is equal in all three, and the Generator's
//      equals MS13a's published digest `8c0f69aa...42e3` (the same populations and the same stream);
//   2. the text digest of base+packs equals the tree's: with IDENTICAL locale templates the legacy formatting and the Player's
//      localization write byte-for-byte the same text (so the formatter and localizeArgs changed no legacy output);
//   3. base against tree: the per-key digests differ ONLY for the six step keys whose templates were rewritten (the two IDs' endpoints,
//      contradiction and forced, in each language that renders them), and are equal for every other key.
//   node generator/tests/artifacts/difficulty-v3/MS13b/render-compare.cjs <out folder> [commit]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const outDir = path.resolve(process.argv[2]);
const commit = process.argv[3] || '7932132';
const script = path.join(__dirname, 'render-diff.js');
const MS13A_DIGEST = '8c0f69aa5c7c22acb3ec85be9af1907030916f97aa9c7d9450012a7e35b042e3';
const CHANGED = /^(en|vi) technique\.forcingChain(Long)?\.step\.(endpoints|contradiction|forced)$/;
fs.mkdirSync(outDir, { recursive: true });

const problems = [];
const lines = ['# MS13b inactivity differential (final source)', '',
  'Base `' + commit + '`. Each row is one run of `render-diff.js` (the populations of MS13a: 6,370 calls, 2,306 Findings, 135 ratings or ' +
  'solver reports with 6,129 steps, the text of every Finding and step in both languages).', ''];
const records = {};
['generator', 'player'].forEach((app) => {
  lines.push('| App | Sources | Calls | Findings | Ratings / reports (steps) | Texts (with chains) | Engine SHA-256 | Text SHA-256 |');
  lines.push('|---|---|---:|---:|---|---:|---|---|');
  [['tree', {}], ['base', { MS13B_BASE: 'git:' + commit }], ['base+packs', { MS13B_BASE: 'git:' + commit, MS13B_TREE_LOCALES: '1' }]]
    .forEach(([mode, extra]) => {
      const file = path.join(outDir, app + '-' + mode.replace('+', '-') + '.json');
      const env = Object.assign({}, process.env, { MS13B_APP: app, MS13B_OUT: file });
      delete env.MS13B_BASE;
      delete env.MS13B_TREE_LOCALES;
      Object.assign(env, extra);
      const run = spawnSync(process.execPath, [script], { env, encoding: 'utf8', maxBuffer: 1 << 26 });
      console.log(run.stdout.trim());
      if (run.status !== 0) throw new Error(app + ' ' + mode + ' exit ' + run.status + ': ' + run.stderr);
      const r = JSON.parse(fs.readFileSync(file, 'utf8'));
      records[app + ' ' + mode] = r;
      lines.push('| ' + app + ' | ' + r.sources + ' | ' + r.calls + ' | ' + r.withFinding + ' | ' + r.ratings + ' (' + r.steps + ') | ' +
        r.texts + ' (' + r.chainTexts + ') | `' + r.engineSha256 + '` | `' + r.textSha256 + '` |');
    });
  const tree = records[app + ' tree'];
  const base = records[app + ' base'];
  const packs = records[app + ' base+packs'];
  if (tree.engineSha256 !== base.engineSha256 || tree.engineSha256 !== packs.engineSha256) problems.push(app + ': the engine digests differ');
  if (app === 'generator' && tree.engineSha256 !== MS13A_DIGEST) problems.push('the Generator engine digest is not MS13a\'s');
  if (packs.textSha256 !== tree.textSha256) problems.push(app + ': with identical templates the legacy text differs');
  const keys = Array.from(new Set(Object.keys(tree.byKey).concat(Object.keys(base.byKey)))).sort();
  const differing = keys.filter((k) => !base.byKey[k] || !tree.byKey[k] || base.byKey[k].sha256 !== tree.byKey[k].sha256);
  const unexpected = differing.filter((k) => !CHANGED.test(k));
  if (unexpected.length > 0) problems.push(app + ': keys that differ without an authorized template change: ' + unexpected.join(', '));
  const samePacksKeys = keys.filter((k) => !packs.byKey[k] || !tree.byKey[k] || packs.byKey[k].sha256 !== tree.byKey[k].sha256);
  if (samePacksKeys.length > 0) problems.push(app + ': keys that differ with identical templates: ' + samePacksKeys.join(', '));
  lines.push('');
  lines.push('**' + app + '**: ' + keys.length + ' (language, key) groups of rendered texts; ' + differing.length + ' differ between the base ' +
    'and the tree, all of them among the six rewritten step templates: ' + differing.map((k) => '`' + k + '` (' + tree.byKey[k].count +
    (tree.byKey[k].count === 1 ? ' text)' : ' texts)')).join(', ') + '; with the tree\'s language packs under the base code **' +
    samePacksKeys.length + ' differ**.');
  lines.push('');
});
lines.push(problems.length === 0 ? '**All checks passed**: the engine digest is equal in every run (the Generator\'s is MS13a\'s `' +
  MS13A_DIGEST.slice(0, 8) + '...`); legacy formatting is byte-identical under identical templates; only the six authorized step ' +
  'templates change what is written.' : '**FAILED**: ' + problems.join('; '));
fs.writeFileSync(path.join(outDir, 'differential.md'), lines.join('\r\n') + '\r\n', 'utf8');
console.log(problems.length === 0 ? 'differential: every check passed' : 'differential FAILED: ' + problems.join('; '));
process.exit(problems.length === 0 ? 0 : 1);
