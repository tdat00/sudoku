'use strict';

/*
 * MS18a task-owned, file-only: the bounded plan of the GS-after generation, from retained numbers only (no
 * generation, no launch). It writes docs/difficulty-v3/evidence/MS18a/plan-gs.json (read by run-gs.ps1) and
 * plan-gs.txt, and prints the table.
 *   node generator/tests/artifacts/difficulty-v3/MS18a/make-plan.cjs
 *
 * The projection of a command is a STATED CONSERVATIVE BOUND (IR12), not a measurement of this source:
 *   per-request bound b = max(HISTORICAL x slowest request of the cell in MS06d, CURRENT x slowest
 *                              retained run of the cell on a later source, where one exists)
 *   units of a command = its requests + one extra per request whose absolute index is a multiple of 5 (the
 *                        soak's I4 check generates that request a second time)
 *   whole-command bound = b x units + FLAT seconds
 * HISTORICAL 6: the largest growth of any cell's slowest request between MS06d (source of MS06c2) and the
 * MS17b hash ledgers (classic9 expert 0.14 s to 0.647 s, x4.6), with a margin of 1.3, rounded up. CURRENT 2
 * for a record of 20 or more runs, 4 for a two-run pilot. FLAT 60 s covers process start, the source load
 * (about 1.5 s), the readiness screen (about 10 s), the I1/I5/I7 checks, the two sampled references, the
 * final-path ratings of every request and the writing of the ledger (all measured at tens of milliseconds
 * to a few seconds before). A cell is one command when its bound is at most 450 s, otherwise the fewest
 * balanced contiguous shards (absolute indexes, --from/--count/--total-count 12) whose every bound is at
 * most 450 s.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence');
const OUT = path.join(EVIDENCE, 'MS18a');
const ADMISSION = 450;
const CEILING = 540;
const FLAT = 60;
const HISTORICAL = 6;
const CURRENT_LONG = 2;
const CURRENT_PILOT = 4;
const CELLS = [
  ['classic9', 'normal'], ['classic9', 'hard'], ['classic9', 'expert'], ['classic9', 'master'],
  ['classic9', 'nightmare'], ['classic9', 'hell1'], ['killer', 'normal'], ['killer', 'hard'],
  ['killer', 'expert'], ['jigsaw9', 'normal'], ['jigsaw9', 'hard'], ['jigsaw9', 'expert'],
  ['jigsaw9', 'nightmare'], ['greaterThan', 'normal'], ['greaterThan', 'hard'], ['greaterThan', 'expert'],
  ['diagonalX', 'nightmare']
];
// The slowest run (ms) retained on a later source, its number of runs and where it is written.
const HASH = 'MS17b hash ledgers, 20 seeds, source 57c1b10';
const CURRENT = {
  'classic9/normal': { ms: 1175, runs: 20, source: HASH },
  'classic9/hard': { ms: 132, runs: 20, source: HASH },
  'classic9/expert': { ms: 647, runs: 20, source: HASH },
  'classic9/master': { ms: 408, runs: 20, source: HASH },
  'classic9/nightmare': { ms: 5443, runs: 50, source: 'MS13c gp-table.md, 50 runs, p95 4902 ms' },
  'classic9/hell1': { ms: 10494, runs: 2, source: 'MS13c gp-table.md, two-run pilot (MS07b pilot 5354 ms)' },
  'killer/hard': { ms: 7406, runs: 20, source: HASH },
  'jigsaw9/normal': { ms: 149, runs: 20, source: HASH },
  'jigsaw9/nightmare': {
    ms: 22283, runs: 2, source: 'MS13c gp-table.md, two-run pilot (MS15b pilot 6854 ms)'
  },
  'greaterThan/normal': { ms: 10005, runs: 20, source: HASH },
  'greaterThan/hard': { ms: 4925, runs: 20, source: HASH },
  'diagonalX/nightmare': { ms: 25639, runs: 50, source: 'MS13c gp-table.md, 50 runs, p95 16534 ms' }
};

function units(from, count) {
  let n = count;
  for (let i = from; i < from + count; i++) if (i % 5 === 0) n++;
  return n;
}

function partition(perRequest) {
  for (let n = 1; n <= 12; n++) {
    const base = Math.floor(12 / n);
    const extra = 12 % n;
    const shards = [];
    let from = 0;
    for (let k = 0; k < n; k++) {
      const count = base + (k < extra ? 1 : 0);
      shards.push({ from: from, count: count, units: units(from, count),
        bound: Math.ceil(perRequest * units(from, count) + FLAT) });
      from += count;
    }
    if (shards.every((s) => s.bound <= ADMISSION)) return shards;
  }
  return null;
}

const cells = [];
const entries = [];
CELLS.forEach(([variant, level]) => {
  const key = variant + '/' + level;
  const ledgerFile = path.join(EVIDENCE, 'MS06d', variant + '-' + level + '.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
  const route = ledger.meta.manifest.cells[0].route;
  const slowest = Math.max.apply(null, ledger.rows.map((row) => row.generationMs)) / 1000;
  const current = CURRENT[key] || null;
  const fromHistory = HISTORICAL * slowest;
  const fromCurrent = current ? (current.runs >= 20 ? CURRENT_LONG : CURRENT_PILOT) * current.ms / 1000 : 0;
  const perRequest = Math.max(fromHistory, fromCurrent);
  const shards = partition(perRequest);
  if (shards === null) throw new Error(key + ': no shard plan fits the admission bound');
  cells.push({
    variant: variant, level: level, route: route, ms06dSlowestSeconds: Math.round(slowest * 1000) / 1000,
    current: current, perRequestSeconds: Math.round(perRequest * 10) / 10, commands: shards.length
  });
  shards.forEach((shard) => {
    const whole = shards.length === 1;
    const id = whole ? variant + '-' + level : variant + '-' + level + '-' + shard.from + '-' + shard.count;
    entries.push({
      id: id, variant: variant, level: level, route: route, shard: !whole, from: shard.from,
      count: shard.count, requests: Array.from({ length: shard.count }, (_, k) => shard.from + k),
      units: shard.units, perRequestSeconds: Math.round(perRequest * 10) / 10, boundSeconds: shard.bound,
      json: whole ? variant + '-' + level + '.json' :
        'shards\\' + variant + '-' + level + '-' + shard.from + '-' + shard.count + '.json',
      log: 'logs\\' + id + '.txt', readiness: 'readiness\\' + id + '.json'
    });
  });
});

const plan = {
  schema: 1, admissionSeconds: ADMISSION, ceilingSeconds: CEILING, flatSeconds: FLAT,
  historicalFactor: HISTORICAL, currentFactorLongRecord: CURRENT_LONG, currentFactorPilot: CURRENT_PILOT,
  seed: 20260101,
  rule: 'b = max(6 x MS06d slowest request, 2 or 4 x slowest retained later-source run); ' +
    'bound = b x units + 60 s; ' +
    'units = requests + requests whose absolute index is a multiple of 5 (I4 regeneration)',
  cells: cells, entries: entries
};
const planText = JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(path.join(OUT, 'plan-gs.json'), planText, 'utf8');

const lines = [];
lines.push('cell                       route     MS06d slowest s  later-source slowest   ' +
  'b s/request  commands');
cells.forEach((c) => {
  const later = c.current ? (c.current.ms / 1000 + ' s x' + c.current.runs + ' runs').padEnd(26) :
    'none'.padEnd(26);
  lines.push((c.variant + '/' + c.level).padEnd(26) + ' ' + c.route.padEnd(9) +
    String(c.ms06dSlowestSeconds).padStart(16) + '  ' + later +
    String(c.perRequestSeconds).padStart(10) + '  ' + c.commands);
});
lines.push('');
lines.push('entry                              requests     units  bound s  json');
entries.forEach((e) => {
  lines.push(e.id.padEnd(34) + (e.from + '-' + (e.from + e.count - 1)).padEnd(12) +
    String(e.units).padStart(5) + String(e.boundSeconds).padStart(9) + '  ' + e.json);
});
lines.push('');
lines.push(entries.length + ' commands for ' + cells.length + ' cells (' +
  entries.filter((e) => !e.shard).length + ' whole cells, ' + entries.filter((e) => e.shard).length +
  ' shards); sum of the bounds ' + entries.reduce((a, e) => a + e.boundSeconds, 0) + ' s; largest ' +
  Math.max.apply(null, entries.map((e) => e.boundSeconds)) + ' s (admission ' + ADMISSION +
  ' s, process ceiling ' + CEILING + ' s)');
fs.writeFileSync(path.join(OUT, 'plan-gs.txt'), lines.join('\r\n') + '\r\n', 'utf8');
lines.forEach((line) => console.log(line));
