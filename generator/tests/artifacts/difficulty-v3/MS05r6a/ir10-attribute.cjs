'use strict';

/*
 * MS05r6a fix round (IR10): the attribution of the 9 changed hash keys to the allowance and the size default, from the
 * 15 diagnostic records (evidence/MS05r6a/diagnostic/*.json, written outside E by ir10-diagnostic.cjs), the E ledgers
 * (allowance 256, size default: "now"), MS05b1's ledgers (no allowance, 8 attempts: the interim) and MS04's fixture
 * (6165c42: the old engine, the base). Read-only; no generation. It writes diagnostic/attribution.json.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/ir10-attribute.cjs
 *
 * Configurations (allowance, attempts): interim (none, 8) = MS05b1's record; now (256, size default) = E;
 * (i) (none, size default) and (ii) (256, 8) = the diagnostics. On a board of at most 81 cells the size default is 8, so
 * (i) is the interim configuration again (a check that nothing else changed) and (ii) is "now". On a large board:
 *   allowance alone  changes the key when (ii) != interim; size default alone when (i) != interim.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = path.join(REPO, 'docs', 'difficulty-v3', 'evidence');
const KEYS = [['classic9/nightmare', 8], ['diagonalX/nightmare', 5], ['diagonalX/nightmare', 1597],
  ['samurai/easy', 8], ['samurai/easy', 610], ['samurai/easy', 987], ['samurai/easy', 2584],
  ['butterfly/normal', 610], ['butterfly/normal', 10946]];

function ledgerHashes(dir) {
  const map = new Map();
  fs.readdirSync(dir).filter((n) => n.endsWith('.json')).forEach((n) => {
    JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')).records.forEach((r) => map.set(r.key, { hash: r.hash, ms: r.ms }));
  });
  return map;
}

function fixtureAt(rev) {
  const text = childProcess.execFileSync('git', ['show', rev + ':generator/tests/fixtures/regression.js'], {
    cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
  const context = { self: undefined, globalThis: undefined };
  context.self = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(text.replace(/^\uFEFF/, ''), context);
  return context.SG.fixtures.regression;
}

function main() {
  const now = ledgerHashes(path.join(EV, 'MS05r6a', 'hashes'));
  const b1 = ledgerHashes(path.join(EV, 'MS05b1', 'hashes'));
  const base = fixtureAt('6165c42');
  const head = fixtureAt('HEAD');
  const diag = new Map();
  fs.readdirSync(path.join(EV, 'MS05r6a', 'diagnostic')).filter((n) => n.endsWith('.json') && n !== 'attribution.json').forEach((n) => {
    const r = JSON.parse(fs.readFileSync(path.join(EV, 'MS05r6a', 'diagnostic', n), 'utf8'));
    const cfg = r.config.allowanceText + '/' + r.config.attempts;
    diag.set(r.request.variant + '/' + r.request.level + '#' + r.request.seed + ' ' + cfg, r);
  });
  const rows = KEYS.map((k) => {
    const key = k[0] + '#' + k[1];
    const seedIndex = head.seeds.indexOf(k[1]);
    const baseHash = base.hashes[k[0]][seedIndex];
    const interim = b1.get(key).hash;
    if (head.hashes[k[0]][seedIndex] !== interim) throw new Error(key + ': HEAD fixture differs from the b1 ledger');
    const nowHash = now.get(key).hash;
    const i = diag.get(key + ' none/default');
    const ii = diag.get(key + ' 256/8');
    if (!i) throw new Error(key + ': diagnostic (i) is missing');
    const cells = i.config.cellCount;
    const sizeDefault = i.config.sizeDefaultAttempts;
    const large = sizeDefault !== 8;
    if (large && !ii) throw new Error(key + ': diagnostic (ii) is missing');
    // I = interim (no allowance, 8 attempts), P = (i) (no allowance, size default), Q = (ii) (256, 8 attempts),
    // N = now (256, size default). The allowance has an effect when Q != I or N != P; the size default when P != I or N != Q.
    const I = interim;
    const P = i.hash;
    const Q = ii ? ii.hash : interim;
    const N = nowHash;
    const allowanceEffect = Q !== I || N !== P;
    const sizeEffect = large && (P !== I || N !== Q);
    let verdict;
    let detail;
    if (!large) {
      verdict = P === I && allowanceEffect ? 'allowance only' : 'NOT the allowance only';
      detail = 'size default is 8, as the interim: (i) is the interim configuration and ' +
        (P === I ? 'reproduces the interim hash, so nothing else changed' : 'does NOT reproduce the interim hash');
    } else if (allowanceEffect && !sizeEffect) {
      verdict = 'allowance only';
      detail = 'the size default changes nothing at either allowance (no allowance: ' + (P === I) + ', 256: ' + (N === Q) +
        '); the allowance alone gives now (' + (N === Q) + ')';
    } else if (sizeEffect && !allowanceEffect) {
      verdict = 'size default only';
      detail = 'the allowance changes nothing at either attempts setting (8 attempts: ' + (Q === I) + ', size default: ' +
        (N === P) + '); the size default alone gives now (' + (N === P) + ')';
    } else if (allowanceEffect && sizeEffect) {
      verdict = P === I ? 'allowance (necessary); the size default decides which result' :
        Q === I ? 'size default (necessary); the allowance decides which result' : 'allowance and size default';
      detail = 'no allowance, size default gives ' + (P === I ? 'the interim hash' : 'another hash') + '; 256 with 8 attempts gives ' +
        (Q === I ? 'the interim hash' : Q === N ? 'now' : 'a third hash') + '; now gives ' + (N === base.hashes[k[0]][seedIndex] ? "MS04's puzzle" : 'a third puzzle');
    } else {
      verdict = 'unchanged (not a changed key)';
      detail = 'all four configurations agree';
    }
    const cfg = (r) => r ? { hash: r.hash, attempts: r.result.attempts, exact: r.result.exact, required: r.result.required,
      warnings: r.result.warnings, wallMs: r.wallMs, score: r.result.score } : null;
    return {
      key: key, cells: cells, sizeDefaultAttempts: sizeDefault,
      hashes: { base: baseHash, interim: interim, now: nowHash, noAllowanceSizeDefault: i.hash,
        allowance256Attempts8: ii ? ii.hash : null },
      nowClass: nowHash === baseHash ? 'lost (the old puzzle returns)' : 'third puzzle',
      configurations: { noAllowanceSizeDefault: cfg(i), allowance256Attempts8: cfg(ii) },
      ms: { interim: b1.get(key).ms, now: now.get(key).ms },
      verdict: verdict, detail: detail
    };
  });
  const out = { kind: 'ir10-attribution', task: 'MS05r6a', keys: rows.length, rows: rows,
    summary: rows.reduce((o, r) => { o[r.verdict] = (o[r.verdict] || 0) + 1; return o; }, {}),
    nothingElseOnTheSmallBoards: rows.filter((r) => r.sizeDefaultAttempts === 8).every((r) => r.verdict === 'allowance only') };
  fs.writeFileSync(path.join(EV, 'MS05r6a', 'diagnostic', 'attribution.json'), JSON.stringify(out, null, 2) + '\r\n', 'utf8');
  rows.forEach((r) => console.log(r.key.padEnd(28) + String(r.cells).padStart(4) + ' cells, size default ' + r.sizeDefaultAttempts +
    ' | ' + r.nowClass.padEnd(30) + '| ' + r.verdict));
  console.log('summary ' + JSON.stringify(out.summary) + '; nothing else on the small boards: ' + out.nothingElseOnTheSmallBoards);
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(String(err && err.stack || err));
  process.exitCode = 1;
}
