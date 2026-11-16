'use strict';

/*
 * MS12 scratch (JF-01 / S-OD10): scans the materialized prefix of the seeded test-kit corpus (classic9, rng seed 4242, indices
 * 0 to 19,999, corpus-4242-0-19999.json, built once by generator/tests/artifacts/difficulty-v3/MS12/corpus-materialize.js) for a
 * Jellyfish through the existing Player tool, in ascending chunks of at most 64 indices (the tool's own replay with the Player's
 * hint code, --max-hints=400, `--check`: nothing is written to the catalogue). One run of this script is one IR12 compound: run it
 * through Invoke-Dv3Node (540 s process ceiling), with the admission rule of the other compounds (a chunk starts only when
 * elapsed + max(floor 60 s, twice the slowest chunk so far) <= the budget of 450 s). Original givens, level null and the
 * provenance `testkit-4242-<index>` are those of the corpus. Every chunk appends one line to
 * docs/difficulty-v3/evidence/MS12/jellyfish-scan-chunks.jsonl (range, exit, seconds, puzzles replayed, solved, stuck, hints,
 * whether a Jellyfish was found). The first chunk that supplies a hint of the technique stops the scan and keeps its sources file
 * as chunk-<first>-<last>.json (nothing further is acquired). A prefix that is exhausted, an incomplete tool run (exit 2), a tool
 * error or a chunk that does not replay all its puzzles stops the scan and says so; there is no automatic expansion.
 *   node tests/artifacts/difficulty-v3/MS12/scan-chunks.cjs --from=<index> [--chunk=64] [--budget-seconds=450] [--floor=60]
 * (from player/)
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const PLAYER = path.resolve(__dirname, '..', '..', '..', '..');
const HERE = path.relative(PLAYER, __dirname);
const EVIDENCE = path.resolve(PLAYER, '..', 'docs', 'difficulty-v3', 'evidence', 'MS12');
const LEDGER = path.join(EVIDENCE, 'jellyfish-scan-chunks.jsonl');
const END = 20000;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const from = Number(opt('from', 0));
const chunkSize = Number(opt('chunk', 64));
const budget = Number(opt('budget-seconds', 450));
const floor = Number(opt('floor', 60));
if (!(chunkSize >= 1 && chunkSize <= 64)) throw new Error('a chunk has at most 64 puzzles');
if (budget > 450) throw new Error('a compound is planned at 450 s at most');

const cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus-4242-0-19999.json'), 'utf8'));
if (cache.count !== END || cache.seed !== 4242) throw new Error('the cache is not the prefix 0-19,999 of seed 4242');

function sourcesOf(a, b) {
  const entries = [];
  for (let i = a; i < b; i++) {
    const marker = 'testkit-4242-' + i;
    const rows = [];
    for (let r = 0; r < 9; r++) rows.push(cache.givens[i].slice(r * 9, r * 9 + 9));
    entries.push({ variantId: 'classic9', level: null, seed: marker, text: '#1,Classic Sudoku 9x9,,' + marker + '\n' + rows.join('\n') });
  }
  return { schema: 1, sources: { jellyfish: entries } };
}

const started = Date.now();
const elapsed = () => (Date.now() - started) / 1000;
let slowest = 0;
let index = from;
let chunks = 0;
while (index < END) {
  const a = index;
  const b = Math.min(a + chunkSize, END);
  const estimate = Math.max(floor, 2 * slowest);
  if (chunks > 0 && elapsed() + estimate > budget) {
    console.log('compound stops before ' + a + ' (' + elapsed().toFixed(1) + ' s used, next projected ' + estimate.toFixed(1) +
      ' s, budget ' + budget + ' s); resume with --from=' + a);
    process.exit(0);
  }
  const file = path.join(__dirname, 'chunk-current.json');
  fs.writeFileSync(file, JSON.stringify(sourcesOf(a, b), null, 1).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
  const t0 = Date.now();
  const run = childProcess.spawnSync('node', ['tests/tools/make-technique-examples.js', '../generator', '--ids=jellyfish',
    '--sources=' + path.join(HERE, 'chunk-current.json'), '--max-puzzles=' + chunkSize, '--max-hints=400', '--check'],
  { cwd: PLAYER, encoding: 'utf8', maxBuffer: 1 << 26, windowsHide: true });
  const seconds = (Date.now() - t0) / 1000;
  slowest = Math.max(slowest, seconds);
  const text = (run.stdout || '') + (run.stderr || '');
  const replayed = Number((/replaying (\d+) puzzle/.exec(text) || [])[1] || 0);
  const lines = text.split(/\r?\n/).filter((l) => /^puzzle \d+\/\d+ /.test(l));
  const solved = lines.filter((l) => /, solved;/.test(l)).length;
  const stuck = lines.filter((l) => /, stuck;/.test(l)).length;
  const hints = lines.reduce((n, l) => n + Number((/-> (\d+) hint/.exec(l) || [])[1] || 0), 0);
  const hits = lines.filter((l) => /wanted found: .*\bjellyfish\b/.test(l));
  const record = { first: a, last: b - 1, size: b - a, exit: run.status, seconds: Number(seconds.toFixed(3)), replayed, solved, stuck,
    hints, found: hits.length > 0 };
  fs.appendFileSync(LEDGER, JSON.stringify(record) + '\r\n', 'utf8');
  console.log('chunk ' + a + '-' + (b - 1) + ': exit=' + run.status + ' replayed=' + replayed + ' solved=' + solved + ' stuck=' + stuck +
    ' hints=' + hints + ' found=' + (hits.length > 0) + ' ' + seconds.toFixed(2) + ' s (compound ' + elapsed().toFixed(1) + ' s)');
  chunks++;
  if (run.status !== 0 && run.status !== 1) {
    console.log('STOP: the tool exited with ' + run.status + ' (2 is incomplete); range ' + a + '-' + (b - 1) + ' is NOT completed');
    console.log(text.split(/\r?\n/).slice(-12).join('\n'));
    process.exit(2);
  }
  if (replayed !== b - a || lines.length !== b - a) {
    console.log('STOP: replayed ' + replayed + ' and reported ' + lines.length + ' of ' + (b - a) + ' puzzles; range ' + a + '-' + (b - 1) +
      ' is NOT completed');
    console.log(text.split(/\r?\n/).slice(-12).join('\n'));
    process.exit(2);
  }
  if (hits.length > 0) {
    const kept = path.join(__dirname, 'chunk-' + a + '-' + (b - 1) + '.json');
    fs.copyFileSync(file, kept);
    console.log('HIT in chunk ' + a + '-' + (b - 1) + ' (acquisition stops here; sources kept as ' + path.relative(PLAYER, kept) + '):');
    hits.forEach((l) => console.log('  ' + l));
    process.exit(0);
  }
  index = b;
}
console.log('PREFIX EXHAUSTED: indices ' + from + '-' + (END - 1) + ' of this run replayed, no Jellyfish');
process.exit(0);
