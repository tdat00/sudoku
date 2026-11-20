'use strict';
// Scratch (MS09a): MS09a adds the finned X-Wing to tech-fish.js (new `infoFor` buffers and new functions). This script
// shows that the ordinary fish and the other patterns did not change: those of the base commit (git show eecc372:core/js/
// engine/tech-fish.js) and those of the working tree give the same Finding (JSON of the whole object) and the same observer
// record on the same states of every agreement setup of tech-fish.test.js, and with an explicit limit on every seam one.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS09a/fish-differential.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(ROOT, '..');
const FISH = 'core/js/engine/tech-fish.js';
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));

function load(source) {
  const run = (abs, text) => vm.runInThisContext(text.replace(/^\uFEFF/, ''), { filename: abs });
  run('harness', fs.readFileSync(path.join(ROOT, '../core/tests/harness.js'), 'utf8'));
  files.forEach((f) => {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) return;
    run(abs, /tech-fish\.js$/.test(f) && source ? source : fs.readFileSync(abs, 'utf8'));
  });
  ['../core/tests/fixtures', 'tests/fixtures'].forEach((dir) => {
    fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js')).sort()
      .forEach((n) => run(dir + '/' + n, fs.readFileSync(path.join(ROOT, dir, n), 'utf8')));
  });
  return globalThis.SG;
}

function buildGrid(SG, variantId, boxRows, boxCols) {
  const D = boxRows * boxCols;
  const n = D * D;
  const cellRow = new Int32Array(n);
  const cellCol = new Int32Array(n);
  const cellRegion = new Int32Array(n);
  const units = [];
  const unitMeta = [];
  for (let r = 0; r < D; r++) {
    for (let c = 0; c < D; c++) {
      cellRow[r * D + c] = r;
      cellCol[r * D + c] = c;
      cellRegion[r * D + c] = Math.floor(r / boxRows) * (D / boxCols) + Math.floor(c / boxCols);
    }
  }
  for (let r = 0; r < D; r++) {
    units.push(Array.from({ length: D }, (_, c) => r * D + c));
    unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
  }
  for (let c = 0; c < D; c++) {
    units.push(Array.from({ length: D }, (_, r) => r * D + c));
    unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
  }
  for (let b = 0; b < D; b++) {
    const top = Math.floor(b / (D / boxCols)) * boxRows;
    const left = (b % (D / boxCols)) * boxCols;
    const cells = [];
    for (let r = 0; r < boxRows; r++) for (let c = 0; c < boxCols; c++) cells.push((top + r) * D + left + c);
    units.push(cells);
    unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
  }
  return SG.model.create({ variantId, digits: D, cellCount: n, units, unitMeta,
    layout: { rows: D, cols: D, cellRow, cellCol, cellRegion } });
}

function lines(SG) {
  const H = SG.techHelper;
  const out = [];
  const setups = [
    ['classic9', () => H.model('classic9'), 400, 777], ['classic9', () => H.model('classic9'), 400, 99],
    ['classic9', () => H.model('classic9'), 300, 20260101], ['classic6', () => H.model('classic6'), 400, 777],
    ['classic4', () => H.model('classic4'), 300, 777], ['fishTest12', () => buildGrid(SG, 'fishTest12', 3, 4), 60, 2026],
    ['fishTest16', () => buildGrid(SG, 'fishTest16', 4, 4), 32, 2026]
  ];
  ['diagonalX', 'hyper', 'jigsaw9', 'killer', 'greaterThan', 'wordoku', 'samurai', 'sohei', 'butterfly', 'flower'].forEach((v) => {
    if (SG.testkit.hasVariant(v)) setups.push([v, () => H.model(v), v === 'jigsaw9' || v === 'diagonalX' || v === 'hyper' ? 120 : 12, 4242]);
  });
  setups.forEach(([name, make, n, seed]) => {
    const model = make();
    const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
    const techs = ['xWing', 'swordfish', 'jellyfish', 'skyscraper', 'twoStringKite', 'emptyRectangle'];
    const records = [];
    const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(JSON.stringify(r)) });
    let found = 0;
    items.forEach((it) => {
      techs.forEach((id) => {
        const tech = SG.techniques.get(id);
        const before = JSON.stringify(Array.from(it.state.candidates || []));
        const f = tech.find(model, it.state, ctx);
        if (f) found++;
        out.push(name + ' ' + id + ' ' + seed + ' ' + JSON.stringify(f) + ' ' + records.splice(0).join('|') +
          (before === JSON.stringify(Array.from(it.state.candidates || [])) ? '' : ' STATE CHANGED'));
        if (!SG.fishSearch[id]) return;
        [0, 1, 3].forEach((limit) => {
          const g = SG.fishSearch[id](model, it.state, ctx, { workLimit: limit });
          out.push(name + ' ' + id + ' limit ' + limit + ' ' + JSON.stringify(g) + ' ' + records.splice(0).join('|'));
        });
      });
    });
    console.log(name + ' seed ' + seed + ': ' + items.length + ' states, ' + found + ' findings of the six');
  });
  return out;
}

if (process.argv[2] === 'old' || process.argv[2] === 'new') {
  const old = process.argv[2] === 'old';
  const source = old ? cp.execSync('git show eecc372:' + FISH, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }) : null;
  const out = lines(load(source));
  console.log(process.argv[2].toUpperCase() + ' ' + out.length + ' lines ' +
    crypto.createHash('sha256').update(out.join('\n')).digest('hex'));
  if (process.argv[3]) fs.writeFileSync(process.argv[3], out.join('\r\n') + '\r\n');
} else {
  const a = cp.spawnSync(process.execPath, [__filename, 'old'], { encoding: 'utf8', cwd: ROOT, maxBuffer: 1 << 26 });
  const b = cp.spawnSync(process.execPath, [__filename, 'new'], { encoding: 'utf8', cwd: ROOT, maxBuffer: 1 << 26 });
  process.stdout.write(a.stdout + (a.stderr || '') + b.stdout + (b.stderr || ''));
  const hash = (s) => (/^(?:OLD|NEW) \d+ lines ([0-9a-f]{64})\s*$/m.exec(s) || [])[1];
  const same = hash(a.stdout) !== undefined && hash(a.stdout) === hash(b.stdout);
  console.log(same ? 'IDENTICAL: the six patterns (X-Wing, Swordfish, Jellyfish, Skyscraper, Kite, Empty Rectangle) of the base commit and of the working tree agree on every line'
    : 'DIFFERENT (run with old|new <file> to write the lines)');
  process.exit(same ? 0 : 1);
}
