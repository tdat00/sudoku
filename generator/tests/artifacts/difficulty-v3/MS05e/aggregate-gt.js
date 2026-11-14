'use strict';

/*
 * MS05e aggregation helper (reads the measure-gt.js files, writes tables; generates nothing):
 *
 *   node tests/artifacts/difficulty-v3/MS05e/aggregate-gt.js --diagnosis=<diagnosis.json> --out=<markdown>
 *   node tests/artifacts/difficulty-v3/MS05e/aggregate-gt.js --compare=<dir>[,<dir>...] --out=<markdown> [--json=<path>]
 *
 * --compare reads <level>-<from>-r<repeat>.json of each evidence folder of docs/difficulty-v3/evidence/MS05e (before,
 * pool-4, pool-8, pool-16) and prints one row per file: nearest-rank p50 / p95 / max as the manual suite computes
 * them, exact hits, attempts, oracle work, full ratings, failed checks. --diagnosis counts the disjoint outcomes of
 * every dug sample of a diagnose file and where the time of the requests went.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(ROOT, 'docs', 'difficulty-v3', 'evidence', 'MS05e');
const COHORTS = [['normal', 300, 20], ['normal', 7000, 40], ['easy', 300, 20], ['hard', 300, 20], ['expert', 300, 20]];

function args(argv) {
  const out = {};
  argv.forEach((a) => {
    const m = /^--([a-z]+)=(.+)$/.exec(a);
    if (!m) throw new Error('unknown argument ' + a);
    out[m[1]] = m[2];
  });
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function write(rel, text) {
  const abs = path.resolve(process.cwd(), rel);
  if (!(abs + path.sep).startsWith(ROOT + path.sep)) throw new Error(rel + ': outside the repository');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text.replace(/\r?\n/g, '\r\n'), 'utf8');
}

function fixed(n, d) {
  return n === null || n === undefined ? 'n/a' : Number(n).toFixed(d === undefined ? 0 : d);
}

function table(head, rows) {
  const line = (cells) => '| ' + cells.join(' | ') + ' |';
  return [line(head), line(head.map(() => '---'))].concat(rows.map(line)).join('\n');
}

/** Nearest-rank percentile, exactly as tests/manual/greater-than.test.js computes it. */
function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

/**
 * The files of one cohort in one evidence folder (a shard by literal seed range is a file whose first seed lies in the
 * cohort), merged: every seed of the cohort exactly once, or the cohort is reported incomplete. The summary is
 * recomputed from the requests, so shards and whole files are summarised the same way.
 */
function cohortOf(dir, level, from, count, repeat) {
  const folder = path.join(EVIDENCE, dir);
  const files = fs.existsSync(folder) ? fs.readdirSync(folder).filter((name) => {
    const m = /^([a-zA-Z0-9]+)-(\d+)-r(\d+)\.json$/.exec(name);
    return m && m[1] === level && Number(m[3]) === repeat && Number(m[2]) >= from && Number(m[2]) < from + count;
  }).sort() : [];
  if (files.length === 0) return null;
  const docs = files.map((name) => readJson(path.join(folder, name)));
  const seen = {};
  let duplicates = 0;
  const requests = [];
  docs.forEach((d) => d.requests.forEach((r) => {
    if (seen[r.seed]) duplicates++;
    seen[r.seed] = true;
    requests.push(r);
  }));
  const missing = [];
  for (let s = from; s < from + count; s++) if (!seen[s]) missing.push(s);
  const times = requests.map((r) => r.elapsedMs);
  const ok = requests.filter((r) => r.ok);
  const sum = (list) => list.reduce((a, b) => a + b, 0);
  return {
    files: files, complete: missing.length === 0 && duplicates === 0 && docs.every((d) => d.complete),
    missing: missing, duplicates: duplicates, signPool: docs[0].config.signPool, source: docs[0].source,
    sameSource: docs.every((d) => d.source.sourceHash === docs[0].source.sourceHash &&
      d.source.greaterThanHash === docs[0].source.greaterThanHash),
    summary: {
      requests: requests.length, errors: requests.length - ok.length, exactHits: ok.filter((r) => r.exact).length,
      elapsedMs: { p50: percentile(times, 0.5), p95: percentile(times, 0.95),
        max: times.length ? Math.max.apply(null, times) : null, total: sum(times) },
      attempts: sum(ok.map((r) => r.attempts)), samplesDug: sum(requests.map((r) => r.counters.samplesDug)),
      oracleCalls: sum(requests.map((r) => r.counters.oracleCalls)),
      fullRatings: sum(ok.map((r) => r.workTotals.ratings)), localSearches: sum(ok.map((r) => r.workTotals.localSearches)),
      checksFailed: ok.filter((r) => !r.checks.allOk).length
    }
  };
}

function compare(dirs) {
  const rows = [];
  const data = [];
  COHORTS.forEach(([level, from, count]) => {
    dirs.forEach((dir) => {
      [1, 2].forEach((repeat) => {
        const c = cohortOf(dir, level, from, count, repeat);
        if (c === null) {
          rows.push([level + ' ' + from, dir, 'r' + repeat, 'not run', '', '', '', '', '', '', '', '', '', '', '', '']);
          return;
        }
        const s = c.summary;
        data.push({ dir: dir, level: level, from: from, count: count, repeat: repeat, files: c.files,
          complete: c.complete, sameSource: c.sameSource, signPool: c.signPool, source: c.source, summary: s });
        rows.push([
          level + ' ' + from + '-' + (from + count - 1), dir + (c.complete ? '' : ' (INCOMPLETE)') +
            (c.files.length > 1 ? ' (' + c.files.length + ' shards)' : ''), 'r' + repeat,
          s.requests + '/' + count, s.errors, s.exactHits, fixed(s.elapsedMs.p50), fixed(s.elapsedMs.p95),
          fixed(s.elapsedMs.max), fixed(s.elapsedMs.total / 1000, 1), s.attempts, s.samplesDug, s.oracleCalls,
          s.fullRatings, s.localSearches, s.checksFailed
        ]);
      });
    });
  });
  const head = ['Cohort', 'Source', 'Repeat', 'Requests', 'Errors', 'Exact', 'p50 ms', 'p95 ms', 'max ms', 'Total s',
    'Attempts', 'Samples dug', 'Oracle calls', 'Full ratings', 'Local searches', 'Checks failed'];
  const identity = [];
  dirs.forEach((dir) => {
    const seen = {};
    data.filter((x) => x.dir === dir).forEach((x) => {
      seen[x.source.sourceHash.slice(0, 12) + ' / ' + x.source.greaterThanHash.slice(0, 12) + ' / pool ' + x.signPool +
        (x.sameSource ? '' : ' (MIXED SOURCES)')] = true;
    });
    identity.push('- `' + dir + '`: ' + (Object.keys(seen).join('; ') || 'no file'));
  });
  return { markdown: '## Timing, hits and work per cohort and repeat\n\n' + table(head, rows) +
    '\n\nSource identity of the files (sourceHash / greater-than.js hash / pool):\n\n' + identity.join('\n') + '\n',
  data: data };
}

/** One row per per-level selector of a gd/<tag> folder: the manifest line (selected total) and its results file. */
function gd(tag) {
  const dir = path.join(EVIDENCE, 'gd', tag);
  const manifest = fs.readFileSync(path.join(dir, 'manifest.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l !== '')
    .map((l) => JSON.parse(l));
  const rows = [];
  manifest.forEach((m) => {
    const file = path.join(dir, m.level + '-' + m.kind + '-results.json');
    const r = fs.existsSync(file) ? readJson(file) : null;
    const t = r && r.results && r.results.tests.length === 1 ? r.results.tests[0] : null;
    const outcome = t === null ? 'no result' : t.status === 'pass' ? 'pass' : t.status === 'fail' ? 'FAIL' : t.status;
    rows.push([m.level, m.count, m.kind, m.selectedTotal, t === null ? 'n/a' : fixed(t.ms / 1000, 2), outcome,
      t && t.error ? t.error.message : '', r ? r.sourceHash.slice(0, 12) : '', r ? r.timeFactor : '']);
  });
  return table(['Level', 'Count', 'Cell', 'Selected total', 'Test s', 'Outcome', 'Failure message', 'Source hash',
    'Time factor'], rows);
}

/** The commands of runs.jsonl: label, exit code, node seconds and the lock wait of each (every locked command). */
function runs() {
  const rows = fs.readFileSync(path.join(EVIDENCE, 'runs.jsonl'), 'utf8').split(/\r?\n/).filter((l) => l !== '')
    .map((l) => JSON.parse(l));
  const sum = rows.reduce((n, r) => n + (r.nodeSeconds || 0), 0);
  const wait = rows.reduce((m, r) => Math.max(m, r.lockWaitSeconds || 0), 0);
  const body = rows.map((r) => [r.label, r.startedAt.replace('T', ' ').slice(0, 19) + 'Z', r.exit,
    r.nodeSeconds === null ? 'n/a' : fixed(r.nodeSeconds, 2), r.lockWaitSeconds === null ? 'n/a' : fixed(r.lockWaitSeconds, 2),
    r.failure ? r.failure : '']);
  return rows.length + ' locked commands, ' + fixed(sum, 1) + ' s of node time in all, the longest lock wait ' +
    fixed(wait, 2) + ' s. Times are UTC (+07:00 minus 7 h); exit 1 of a driver or of a manual cell is the recorded outcome, ' +
    'never a pass (see evidence.md).\n\n' + table(['Label', 'Started (UTC)', 'Exit', 'Node s', 'Lock wait s', 'Failure'], body);
}

function diagnosis(file) {
  const d = readJson(file);
  const cats = {};
  const bump = (k) => { cats[k] = (cats[k] || 0) + 1; };
  const per = [];
  let samples = 0;
  let digMs = 0;
  let total = 0;
  let capped = 0;
  let cappedMs = 0;
  let minimalOk = 0;
  let uniqueOk = 0;
  d.requests.forEach((r) => {
    const own = {};
    r.samples.forEach((s) => {
      samples++;
      const key = s.category === 'below' ? (s.tuneReveals === 0 ? 'below band, no clue revealed after the setup' :
        'below band, after a clue reveal') : s.category;
      bump(key);
      own[key] = (own[key] || 0) + 1;
      if (s.minimal === true) minimalOk++;
      if (s.unique === true) uniqueOk++;
    });
    const searches = r.work.reduce((n, a) => n + a.localSearches.filter((x) => x.capHit === 'proposals').length, 0);
    capped += searches;
    if (searches > 0) cappedMs += r.elapsedMs;
    digMs += r.counters.digMs;
    total += r.elapsedMs;
    per.push([r.seed, r.attempts, r.samples.length, r.exact ? 'yes' : 'no', fixed(r.elapsedMs), fixed(r.counters.digMs),
      searches, Object.keys(own).map((k) => own[k] + ' ' + k).join('; ')]);
  });
  const order = ['exact', 'shallow', 'below band, no clue revealed after the setup', 'below band, after a clue reveal',
    'above', 'unrated'];
  const rows = order.map((k) => [k, cats[k] || 0, fixed(100 * (cats[k] || 0) / samples, 1) + ' %']);
  const miss = samples - (cats.exact || 0);
  const trap = (cats['below band, no clue revealed after the setup'] || 0) + (cats['below band, after a clue reveal'] || 0);
  let md = '## Samples by disjoint outcome (every dug sample of every attempt)\n\n' +
    table(['Outcome', 'Samples', 'Share'], rows) + '\n\n' +
    samples + ' samples in ' + d.requests.length + ' requests (' + d.requests.reduce((n, r) => n + r.attempts, 0) +
    ' attempts); ' + miss + ' are not exact, of which ' + trap + ' (' + fixed(100 * trap / miss, 1) +
    ' %) are below the band with a minimal sign set. Unique: ' + uniqueOk + '/' + samples + '; minimal sign set verified: ' +
    minimalOk + '/' + samples + '.\n\n';
  md += '## Where the time went\n\n' + 'Process time of the requests: ' + fixed(total / 1000, 1) + ' s; the sign digs of the ' +
    'samples: ' + fixed(digMs / 1000, 1) + ' s (' + fixed(100 * digMs / total, 1) + ' %). ' + capped +
    ' local searches ended on the proposals cap, in requests that took ' + fixed(cappedMs / 1000, 1) + ' s (' +
    fixed(100 * cappedMs / total, 1) + ' %).\n\n';
  md += '## Per request\n\n' + table(['Seed', 'Attempts', 'Samples', 'Exact', 'Request ms', 'Sign digs ms',
    'Searches at the cap', 'Sample outcomes'], per) + '\n';
  return md;
}

function main() {
  const a = args(process.argv.slice(2));
  if (a.diagnosis) {
    write(a.out, '# MS05e diagnosis tables (generated by aggregate-gt.js from ' + path.basename(a.diagnosis) + ')\n\n' +
      diagnosis(path.resolve(process.cwd(), a.diagnosis)));
  } else if (a.compare) {
    const result = compare(a.compare.split(','));
    write(a.out, '# MS05e comparison tables (generated by aggregate-gt.js)\n\n' + result.markdown);
    if (a.json) write(a.json, JSON.stringify(result.data, null, 1) + '\n');
  } else if (a.gd) {
    write(a.out, '# MS05e per-level CV6 / I5 cells, tag ' + a.gd + ' (generated by aggregate-gt.js)\n\n' + gd(a.gd) + '\n');
  } else if (a.runs) {
    write(a.out, '# MS05e locked commands (generated by aggregate-gt.js from runs.jsonl)\n\n' + runs() + '\n');
  } else {
    throw new Error('--diagnosis=<file>, --compare=<dirs>, --gd=<tag> or --runs=1, and --out=<markdown>');
  }
  console.log('written ' + a.out);
}

main();
