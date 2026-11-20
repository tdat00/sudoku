'use strict';

/*
 * MS06d: reads the 17 ledgers and transcripts of MS06a (before) and MS06d (after) and writes the comparison tables
 * of the record as comparison-tables.md in this folder. It generates nothing and changes no ledger; all figures are
 * recomputed from the rows and cross-checked against the tool's own summary (any disagreement is printed and is
 * also in the "Cross-checks" section of the output).
 *
 *   node docs/difficulty-v3/evidence/MS06d/compare.cjs
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVIDENCE = path.resolve(__dirname, '..');
const BEFORE = path.join(EVIDENCE, 'MS06a');
const AFTER = __dirname;
const RECORD = path.resolve(EVIDENCE, '..', 'target-scope-2026-11-14.md');
const OUT = path.join(AFTER, 'comparison-tables.md');

const CELLS = [
  ['classic9', 'normal', 150], ['classic9', 'hard', 400], ['classic9', 'expert', 400],
  ['classic9', 'master', 900], ['classic9', 'nightmare', 2500], ['classic9', 'hell1', 2500],
  ['killer', 'normal', 700], ['killer', 'hard', 1800], ['killer', 'expert', 10000],
  ['jigsaw9', 'normal', 350], ['jigsaw9', 'hard', 900], ['jigsaw9', 'expert', 900], ['jigsaw9', 'nightmare', 5000],
  ['greaterThan', 'normal', 700], ['greaterThan', 'hard', 6000], ['greaterThan', 'expert', 10000],
  ['diagonalX', 'nightmare', 3000]
].map((c) => ({ variant: c[0], level: c[1], budget: c[2], name: c[0] + '-' + c[1], key: c[0] + '/' + c[1] }));

const EPS = 1e-9;
const crosschecks = [];
const check = (label, ok, detail) => crosschecks.push({ label, ok, detail: detail || '' });

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function load(dir, c) {
  const jsonFile = path.join(dir, c.name + '.json');
  const txt = fs.readFileSync(path.join(dir, c.name + '.txt'), 'utf8');
  const led = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const soak = /in ([\d.]+) s\)/.exec(txt);
  const helper = /exit=(\d+) seconds=([\d.]+)/.exec(txt);
  const flag = /\s(SLOW|ok)\s*$/m.exec(txt.split('\n').filter((l) => /^\S+\s+(\.|\d+)\s/.test(l) && /%/.test(l)).join('\n'));
  const result = /^RESULT: (\S+)/m.exec(txt);
  const start = /^START (\S+)/m.exec(txt);
  const end = /^END (\S+)/m.exec(txt);
  return {
    led, rows: led.rows, sha: sha256(jsonFile),
    soakS: soak ? Number(soak[1]) : null, helperS: helper ? Number(helper[2]) : null,
    helperExit: helper ? Number(helper[1]) : null, flag: flag ? flag[1] : null,
    gate: result ? result[1] : null, start: start ? start[1] : null, end: end ? end[1] : null
  };
}

const sum = (a) => a.reduce((s, x) => s + x, 0);
const sorted = (a) => a.slice().sort((x, y) => x - y);
const upperMedian = (a) => (a.length ? sorted(a)[Math.floor(a.length / 2)] : null);
const mean = (a) => (a.length ? sum(a) / a.length : null);
const maxOf = (a) => (a.length ? Math.max.apply(null, a) : null);
const minOf = (a) => (a.length ? Math.min.apply(null, a) : null);
const finite = (x) => typeof x === 'number' && Number.isFinite(x);

const isExact = (r) => r.generationExact === true;
const inBand = (r) => r.solved === true && r.achieved === r.requested;
const isShallow = (r) => inBand(r) && !isExact(r);
const category = (r) => (isExact(r) ? 'exact' : isShallow(r) ? 'shallow' : 'miss');

function stats(set) {
  const rows = set.rows;
  const gen = rows.map((r) => r.generationMs / 1000);
  const exact = rows.filter(isExact);
  const band = rows.filter(inBand);
  const searches = [];
  for (const r of rows) for (const a of r.work || []) for (const s of a.localSearches || []) searches.push(s);
  const capHit = (v) => searches.filter((s) => s.capHit === v).length;
  const row = (f) => rows.map(f);
  return {
    n: rows.length, exact: exact.length, inBand: band.length, shallow: band.length - exact.length,
    miss: rows.length - band.length,
    genS: sum(gen), genMean: mean(gen), genMedian: upperMedian(gen), genMax: maxOf(gen),
    soakS: set.soakS, helperS: set.helperS, flag: set.flag,
    fullRatings: sum(row((r) => r.fullRatings)), frMean: mean(row((r) => r.fullRatings)),
    frMedian: upperMedian(row((r) => r.fullRatings)), frMax: maxOf(row((r) => r.fullRatings)),
    attempts: sum(row((r) => (r.work || []).length)),
    attemptsMin: minOf(row((r) => (r.work || []).length)), attemptsMax: maxOf(row((r) => (r.work || []).length)),
    proposals: sum(row((r) => r.proposals)), localRatings: sum(row((r) => r.localRatings)),
    shallowRatings: sum(row((r) => r.shallowRatings)),
    capShallow: sum(row((r) => r.capHits.shallow)), capRatings: sum(row((r) => r.capHits.ratings)),
    capProposals: sum(row((r) => r.capHits.proposals)),
    searches: searches.length, searchNoCap: searches.filter((s) => !s.capHit).length,
    searchShallow: capHit('shallow'), searchRatings: capHit('ratings'), searchProposals: capHit('proposals'),
    searchProposalSum: sum(searches.map((s) => s.proposals)), searchRatingSum: sum(searches.map((s) => s.ratings)),
    searchOther: searches.filter((s) => s.capHit && ['shallow', 'ratings', 'proposals'].indexOf(s.capHit) < 0).length,
    errors: rows.filter((r) => r.outcome !== 'ok').length
  };
}

function cohort(rows, pick) {
  const raw = rows.filter(pick).map((r) => r.position && r.position.raw).filter(finite);
  const adj = rows.filter(pick).map((r) => r.position && r.position.adjusted).filter(finite);
  const reasons = {};
  for (const r of rows.filter(pick)) {
    if (!(r.position && finite(r.position.adjusted))) {
      const k = (r.position && r.position.reason) || 'no-position';
      reasons[k] = (reasons[k] || 0) + 1;
    }
  }
  const shape = (a) => ({ n: a.length, min: minOf(a), median: upperMedian(a), max: maxOf(a), mean: mean(a) });
  const adjStat = shape(adj);
  adjStat.top = adj.filter((x) => x >= 0.75).length;
  return { raw: shape(raw), adj: adjStat, reasons };
}

function agree(label, a, b) {
  if (a === null || b === null) check(label, a === b, String(a) + ' vs ' + String(b));
  else check(label, Math.abs(a - b) < EPS, String(a) + ' vs ' + String(b));
}

function crossCheckSummary(tag, set, c, cohorts) {
  const sc = set.led.summary.cells[c.key];
  const st = stats(set);
  check(tag + ' ' + c.key + ' in-band = summary', st.inBand === sc.inBand, st.inBand + ' vs ' + sc.inBand);
  check(tag + ' ' + c.key + ' exact = summary', st.exact === sc.oldHits.count && st.exact === sc.qualifiedHits.count,
    st.exact + ' vs ' + sc.oldHits.count + '/' + sc.qualifiedHits.count);
  check(tag + ' ' + c.key + ' shallow = summary', st.shallow === sc.shallow.count, st.shallow + ' vs ' + sc.shallow.count);
  check(tag + ' ' + c.key + ' exact + shallow + miss = 12', st.exact + st.shallow + st.miss === 12);
  for (const kind of ['exact', 'inBand']) {
    const mine = kind === 'exact' ? cohorts.exact : cohorts.band;
    for (const m of ['raw', 'adjusted']) {
      const s = sc.cohorts[kind][m];
      const mm = m === 'raw' ? mine.raw : mine.adj;
      check(tag + ' ' + c.key + ' ' + kind + ' ' + m + ' n', s.n === mm.n, s.n + ' vs ' + mm.n);
      if (s.n > 0) {
        agree(tag + ' ' + c.key + ' ' + kind + ' ' + m + ' min', s.deciles[0], mm.min);
        agree(tag + ' ' + c.key + ' ' + kind + ' ' + m + ' upper median', s.upperMedian, mm.median);
        agree(tag + ' ' + c.key + ' ' + kind + ' ' + m + ' max', s.deciles[10], mm.max);
      }
    }
    const nr = sc.cohorts[kind].nullReasons || {};
    const mr = mine.reasons;
    check(tag + ' ' + c.key + ' ' + kind + ' null reasons', JSON.stringify(nr) === JSON.stringify(mr),
      JSON.stringify(nr) + ' vs ' + JSON.stringify(mr));
  }
  const fr = sc.work.fullRatings;
  check(tag + ' ' + c.key + ' full ratings upper median = summary', fr.upperMedian === st.frMedian,
    fr.upperMedian + ' vs ' + st.frMedian);
}

// ---------------------------------------------------------------- load and cross-check
const data = CELLS.map((c) => {
  const b = load(BEFORE, c);
  const a = load(AFTER, c);
  const cb = { exact: cohort(b.rows, isExact), band: cohort(b.rows, inBand) };
  const ca = { exact: cohort(a.rows, isExact), band: cohort(a.rows, inBand) };
  crossCheckSummary('before', b, c, cb);
  crossCheckSummary('after', a, c, ca);
  return { c, b, a, sb: stats(b), sa: stats(a), cb, ca };
});

const f = (x, d) => (x === null || x === undefined || Number.isNaN(x) ? 'n/a' : x.toFixed(d));
const sgn = (x, d) => (x === null || x === undefined ? 'n/a' : (x > 0 ? '+' : x < 0 ? '-' : '') + Math.abs(x).toFixed(d));
const int = (x) => (x === null || x === undefined ? 'n/a' : Math.round(x).toLocaleString('en-US'));
const dint = (x) => (x > 0 ? '+' : x < 0 ? '-' : '') + Math.abs(Math.round(x)).toLocaleString('en-US');
const ratio = (a, b) => (b ? f(a / b, 2) + 'x' : 'n/a');
const pct = (n, d) => (d ? Math.round((100 * n) / d) + '%' : 'n/a');
const out = [];
const table = (head, rows, align) => {
  out.push('| ' + head.join(' | ') + ' |');
  out.push('|' + head.map((h, i) => (align && align[i] === 'l' ? '---|' : '---:|')).join(''));
  for (const r of rows) out.push('| ' + r.join(' | ') + ' |');
  out.push('');
};
const heading = (t) => { out.push(t); out.push(''); };
const tot = (key, which) => sum(data.map((d) => d[which][key]));
const L = (c) => c.variant + ' ' + c.level;

heading('# MS06d comparison tables (generated by compare.cjs)');
out.push('Before: `evidence/MS06a/`, source before the target policy. After: `evidence/MS06d/`, the same 17 commands on the');
out.push('source of MS06c2 (the policy active). Every figure is recomputed from the ledger rows; the tool\'s own summaries are');
out.push('cross-checked in the last section. Seconds are of a shared Windows machine: indicative, not a GP gate.');
out.push('');

// ---------------------------------------------------------------- identity
heading('## 1. Identity and configuration (MS06d-T01)');
const mb = data[0].b.led.meta;
const ma = data[0].a.led.meta;
for (const which of ['b', 'a']) {
  const phase = which === 'b' ? 'before' : 'after';
  for (const field of ['sourceHash', 'toolHash', 'commit', 'dirty', 'node']) {
    const values = new Set(data.map((d) => String(d[which].led.meta[field])));
    check(phase + ': the ' + field + ' is one value in all 17 ledgers', values.size === 1, Array.from(values).join(','));
  }
  const versions = new Set();
  for (const d of data) for (const r of d[which].rows) versions.add(String(r.ratingVersion));
  check(phase + ': ratingVersion is 2 in all 204 rows', versions.size === 1 && versions.has('2'), Array.from(versions).join(','));
  const targets = data.reduce((s, d) => s + d[which].rows.filter((r) => finite(r.target)).length, 0);
  check(phase + ': finite targets in ' + (which === 'b' ? '0' : '204') + ' of 204 rows', targets === (which === 'b' ? 0 : 204), String(targets));
}
table(['Item', 'Before (MS06a)', 'After (MS06d)', 'Same'], [
  ['Commit', '`' + mb.commit.slice(0, 7) + '`', '`' + ma.commit.slice(0, 7) + '`', mb.commit === ma.commit ? 'yes' : 'no (the policy)'],
  ['Dirty', String(mb.dirty), String(ma.dirty), mb.dirty === ma.dirty ? 'yes' : 'no'],
  ['Source hash (63 files)', '`' + mb.sourceHash.slice(0, 16) + '...`', '`' + ma.sourceHash.slice(0, 16) + '...`',
    mb.sourceHash === ma.sourceHash ? 'yes' : 'no (the policy)'],
  ['Source files', String(mb.sourceFiles), String(ma.sourceFiles), mb.sourceFiles === ma.sourceFiles ? 'yes' : 'no'],
  ['Tool hash', '`' + mb.toolHash.slice(0, 16) + '...`', '`' + ma.toolHash.slice(0, 16) + '...`',
    mb.toolHash === ma.toolHash ? 'yes' : 'no (soak.js: MS06c1 target field)'],
  ['Node', mb.node, ma.node, mb.node === ma.node ? 'yes' : 'no'],
  ['Machine', mb.machine.cpuModel + ', ' + mb.machine.cpus + ' logical, ' + mb.machine.memoryGiB + ' GiB',
    ma.machine.cpuModel + ', ' + ma.machine.cpus + ' logical, ' + ma.machine.memoryGiB + ' GiB',
    JSON.stringify(mb.machine) === JSON.stringify(ma.machine) ? 'yes' : 'no'],
  ['Seed base, shallow allowance, cap', mb.seedBase + ', ' + mb.shallowSearchRatings + ', ' + mb.shallowCap,
    ma.seedBase + ', ' + ma.shallowSearchRatings + ', ' + ma.shallowCap,
    mb.seedBase === ma.seedBase && mb.shallowSearchRatings === ma.shallowSearchRatings && mb.shallowCap === ma.shallowCap ? 'yes' : 'no'],
  ['Rating version, reference budget', mb.manifest.ratingVersion + ', ' + mb.manifest.referenceBudgetMs + ' ms',
    ma.manifest.ratingVersion + ', ' + ma.manifest.referenceBudgetMs + ' ms',
    mb.manifest.ratingVersion === ma.manifest.ratingVersion && mb.manifest.referenceBudgetMs === ma.manifest.referenceBudgetMs ? 'yes' : 'no']
], ['l', 'l', 'l', 'l']);

const argvNorm = (m) => m.argv.filter((x) => !/^--json=/.test(x)).join(' ');
const manifestNorm = (m) => JSON.stringify(m.manifest);
const identRows = data.map((d) => {
  const keyOf = (r) => [r.variant, r.requested, r.index, r.tag, r.pipelineSeed === undefined ? 'none' : r.pipelineSeed].join('|');
  let same = 0;
  let samePuzzle = 0;
  for (let i = 0; i < 12; i += 1) {
    if (keyOf(d.b.rows[i]) === keyOf(d.a.rows[i]) && d.b.rows[i].index === i && d.a.rows[i].index === i) same += 1;
    if (d.b.rows[i].puzzleHash === d.a.rows[i].puzzleHash) samePuzzle += 1;
  }
  const argvSame = argvNorm(d.b.led.meta) === argvNorm(d.a.led.meta);
  const manSame = manifestNorm(d.b.led.meta) === manifestNorm(d.a.led.meta);
  check('identity ' + d.c.key + ' request identities', same === 12, same + ' of 12');
  check('identity ' + d.c.key + ' argv', argvSame, argvNorm(d.b.led.meta) + ' vs ' + argvNorm(d.a.led.meta));
  check('identity ' + d.c.key + ' manifest', manSame);
  check('identity ' + d.c.key + ' ledger complete, 12 rows, outcome ok', d.a.led.complete === true && d.a.rows.length === 12 &&
    d.a.rows.every((r) => r.outcome === 'ok'));
  const route = d.a.led.meta.manifest.cells[0].route;
  return [L(d.c), route, same + '/12', argvSame ? 'yes' : 'NO', manSame ? 'yes' : 'NO', samePuzzle + '/12',
    '`' + d.b.sha.slice(0, 12) + '`', '`' + d.a.sha.slice(0, 12) + '`'];
});
table(['Cell', 'Route', 'Request identities equal (variant, level, index, tag, pipeline seed)', 'Command equal (minus the ledger path)',
  'Manifest equal', 'Same puzzle hash', 'Before SHA-256', 'After SHA-256'], identRows, ['l', 'l', 'r', 'r', 'r', 'r', 'l', 'l']);
out.push('Same puzzle hash counts the requests whose puzzle is byte-for-byte the one MS06a generated (a seed gives another puzzle');
out.push('by design once the policy draws a target; an equal hash means the policy changed nothing for that request).');
out.push('');

// verify the before ledgers against the record's SHA-256 table
const record = fs.readFileSync(RECORD, 'utf8');
let recordMatches = 0;
for (const d of data) {
  const m = new RegExp('\\| ' + d.c.name + '\\.json \\| `([0-9a-f]{64})` \\|').exec(record);
  if (m && m[1] === d.b.sha) recordMatches += 1;
  else check('before ledger ' + d.c.name + ' SHA-256 equals the record', false, m ? m[1] : 'missing');
}
check('before ledgers equal the SHA-256 table of the record', recordMatches === 17, recordMatches + ' of 17');

// ---------------------------------------------------------------- hits
heading('## 2. Hits (denominator: all 12 requests of the cell)');
const hitRows = data.map((d) => {
  const x = d.sb; const y = d.sa;
  const dE = y.exact - x.exact;
  const flag = dE < 0 ? 'LOSS ' + dE : dE > 0 ? 'gain +' + dE : 'same';
  const bandFlag = y.inBand < x.inBand ? ' (in band ' + (y.inBand - x.inBand) + ')' : y.inBand > x.inBand ? ' (in band +' + (y.inBand - x.inBand) + ')' : '';
  return [L(d.c), x.exact + ' / ' + x.shallow + ' / ' + x.miss, y.exact + ' / ' + y.shallow + ' / ' + y.miss,
    pct(x.exact, 12) + ' -> ' + pct(y.exact, 12), x.inBand + ' -> ' + y.inBand, flag + bandFlag, d.b.gate + ' -> ' + d.a.gate];
});
hitRows.push(['**Total (204)**', tot('exact', 'sb') + ' / ' + tot('shallow', 'sb') + ' / ' + tot('miss', 'sb'),
  tot('exact', 'sa') + ' / ' + tot('shallow', 'sa') + ' / ' + tot('miss', 'sa'),
  pct(tot('exact', 'sb'), 204) + ' -> ' + pct(tot('exact', 'sa'), 204), tot('inBand', 'sb') + ' -> ' + tot('inBand', 'sa'),
  dint(tot('exact', 'sa') - tot('exact', 'sb')) + ' exact', data.filter((d) => d.b.gate === 'FAIL').length + ' FAIL -> ' +
  data.filter((d) => d.a.gate === 'FAIL').length + ' FAIL']);
table(['Cell', 'Before exact / shallow / miss', 'After exact / shallow / miss', 'Exact share', 'In band', 'Change in exact hits',
  'Soak gate line (informational under --no-gate)'], hitRows, ['l', 'r', 'r', 'r', 'r', 'l', 'l']);
out.push('Exact: the generator\'s strict `exact` flag. Shallow: solved in the requested band but not exact. Miss: no puzzle in the');
out.push('requested band (off-band, unrated or an error). The three add up to 12 in every cell. The soak gate line is the old 90%');
out.push('(classic9) / 80% (other boards) hit-rate line; `--no-gate` keeps the exit code at 0, the line is recorded as measured.');
out.push('');

heading('### Requests with the same puzzle and with another puzzle');
const grp = { same: { n: 0, eb: 0, ea: 0, sb: 0, sa: 0, mb: 0, ma: 0, tb: 0, ta: 0 }, diff: { n: 0, eb: 0, ea: 0, sb: 0, sa: 0, mb: 0, ma: 0, tb: 0, ta: 0 } };
for (const d of data) {
  for (let i = 0; i < 12; i += 1) {
    const rb = d.b.rows[i]; const ra = d.a.rows[i];
    const g = grp[rb.puzzleHash === ra.puzzleHash ? 'same' : 'diff'];
    g.n += 1;
    g.eb += category(rb) === 'exact' ? 1 : 0; g.ea += category(ra) === 'exact' ? 1 : 0;
    g.sb += category(rb) === 'shallow' ? 1 : 0; g.sa += category(ra) === 'shallow' ? 1 : 0;
    g.mb += category(rb) === 'miss' ? 1 : 0; g.ma += category(ra) === 'miss' ? 1 : 0;
    g.tb += rb.generationMs / 1000; g.ta += ra.generationMs / 1000;
  }
}
check('same + different puzzle requests = 204', grp.same.n + grp.diff.n === 204);
check('a request with the same puzzle keeps its outcome', grp.same.eb === grp.same.ea && grp.same.sb === grp.same.sa && grp.same.mb === grp.same.ma);
table(['Group', 'Requests', 'Exact before -> after', 'Shallow before -> after', 'Miss before -> after', 'Generation s before -> after'],
  [['Same puzzle hash', grp.same.n, grp.same.eb + ' -> ' + grp.same.ea, grp.same.sb + ' -> ' + grp.same.sa, grp.same.mb + ' -> ' + grp.same.ma,
    f(grp.same.tb, 2) + ' -> ' + f(grp.same.ta, 2)],
  ['Another puzzle', grp.diff.n, grp.diff.eb + ' -> ' + grp.diff.ea, grp.diff.sb + ' -> ' + grp.diff.sa, grp.diff.mb + ' -> ' + grp.diff.ma,
    f(grp.diff.tb, 2) + ' -> ' + f(grp.diff.ta, 2)]].map((r) => r.map(String)), ['l', 'r', 'r', 'r', 'r', 'r']);

heading('### Requests whose outcome changed');
const changed = [];
for (const d of data) {
  for (let i = 0; i < 12; i += 1) {
    const rb = d.b.rows[i]; const ra = d.a.rows[i];
    if (category(rb) !== category(ra)) changed.push({ d, rb, ra });
  }
}
const desc = (r) => category(r) + (r.achieved && r.achieved !== r.requested ? ' (' + r.achieved + ')' : '') + ', ' + r.score;
table(['Request', 'Before', 'After', 'Before: time s, attempts, full ratings', 'After: time s, attempts, full ratings', 'Change'],
  changed.map(({ d, rb, ra }) => {
    const rank = { miss: 0, shallow: 1, exact: 2 };
    const dir = rank[category(ra)] > rank[category(rb)] ? 'gain' : 'LOSS';
    return [rb.tag, desc(rb), desc(ra),
      f(rb.generationMs / 1000, 2) + ', ' + (rb.work || []).length + ', ' + rb.fullRatings,
      f(ra.generationMs / 1000, 2) + ', ' + (ra.work || []).length + ', ' + ra.fullRatings, dir];
  }), ['l', 'l', 'l', 'r', 'r', 'l']);
if (!changed.length) { out.pop(); out.push('(none: every request has the category it had before)'); out.push(''); }

heading('### Every non-exact request after the policy (none is dropped)');
const nonExact = [];
for (const d of data) for (const ra of d.a.rows) if (!isExact(ra)) nonExact.push({ d, ra });
const shown = nonExact.filter((x) => !(x.d.c.key === 'killer/hard' || x.d.c.key === 'killer/expert'));
table(['Request', 'Outcome (score)', 'Time s', 'Attempts', 'Full ratings', 'Target', 'Before'],
  shown.map(({ d, ra }) => {
    const rb = d.b.rows[ra.index];
    return [ra.tag, category(ra) + (ra.achieved !== ra.requested ? ' (' + ra.achieved + ')' : '') + ', ' + ra.score,
      f(ra.generationMs / 1000, 2), String((ra.work || []).length), String(ra.fullRatings),
      finite(ra.target) ? f(ra.target, 1) : 'null', category(rb) + ', ' + rb.score];
  }), ['l', 'l', 'r', 'r', 'r', 'r', 'l']);
for (const key of ['killer/hard', 'killer/expert']) {
  const d = data.find((x) => x.c.key === key);
  const nSh = d.a.rows.filter((r) => !isExact(r) && isShallow(r)).length;
  out.push(key + ': ' + nSh + ' of 12 shallow, ' + (12 - nSh - d.sa.exact) + ' miss after (before ' + d.sb.shallow +
    ' shallow, ' + d.sb.miss + ' miss).');
}
out.push('');

// ---------------------------------------------------------------- time
heading('## 3. Generation time (the sum of the 12 requests; max is the soak\'s p95 at 12 samples)');
const timeRows = data.map((d) => {
  const x = d.sb; const y = d.sa;
  return [L(d.c), f(x.genS, 2), f(y.genS, 2), sgn(y.genS - x.genS, 2), ratio(y.genS, x.genS), f(x.genMean, 2) + ' -> ' + f(y.genMean, 2),
    f(x.genMedian, 2) + ' -> ' + f(y.genMedian, 2), f(x.genMax, 2) + ' -> ' + f(y.genMax, 2),
    f(x.soakS, 1) + ' -> ' + f(y.soakS, 1), f(x.helperS, 2) + ' -> ' + f(y.helperS, 2), x.flag + ' -> ' + y.flag];
});
timeRows.push(['**Total**', f(tot('genS', 'sb'), 2), f(tot('genS', 'sa'), 2), sgn(tot('genS', 'sa') - tot('genS', 'sb'), 2),
  ratio(tot('genS', 'sa'), tot('genS', 'sb')), '', '', '', f(tot('soakS', 'sb'), 1) + ' -> ' + f(tot('soakS', 'sa'), 1),
  f(tot('helperS', 'sb'), 1) + ' -> ' + f(tot('helperS', 'sa'), 1),
  data.filter((d) => d.sb.flag === 'SLOW').length + ' -> ' + data.filter((d) => d.sa.flag === 'SLOW').length + ' SLOW']);
table(['Cell', 'Before s', 'After s', 'Change s', 'Ratio', 'Mean s', 'Upper median s', 'Max s (p95)', 'Soak s', 'Helper s', 'Flag vs 9.1 target'],
  timeRows, ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']);
for (const d of data) {
  const calc = d.sa.genMax * 1000 > d.c.budget ? 'SLOW' : 'ok';
  check('SLOW flag after ' + d.c.key + ' (max against the 9.1 target)', calc === d.sa.flag, calc + ' vs ' + d.sa.flag);
  const calcB = d.sb.genMax * 1000 > d.c.budget ? 'SLOW' : 'ok';
  check('SLOW flag before ' + d.c.key, calcB === d.sb.flag, calcB + ' vs ' + d.sb.flag);
}

heading('### The eight slowest requests after the policy, with the same request before');
const all = [];
for (const d of data) for (const ra of d.a.rows) all.push({ d, ra, rb: d.b.rows[ra.index] });
all.sort((p, q) => q.ra.generationMs - p.ra.generationMs);
table(['Request', 'After s', 'Before s', 'Outcome after', 'Outcome before'],
  all.slice(0, 8).map(({ ra, rb }) => [ra.tag, f(ra.generationMs / 1000, 2), f(rb.generationMs / 1000, 2),
    category(ra) + ', ' + ra.score, category(rb) + ', ' + rb.score]), ['l', 'r', 'r', 'l', 'l']);
const slower = all.filter((x) => x.ra.generationMs > 1.5 * x.rb.generationMs && x.ra.generationMs - x.rb.generationMs > 500);
const faster = all.filter((x) => x.rb.generationMs > 1.5 * x.ra.generationMs && x.rb.generationMs - x.ra.generationMs > 500);
const named = (list, key) => list.map((x) => x.ra.tag + ' (' + f(x.rb.generationMs / 1000, 2) + ' -> ' + f(x.ra.generationMs / 1000, 2) + ' s)').join(', ') || 'none';
out.push('Requests more than 1.5x slower and 0.5 s or more slower than before: ' + slower.length + ' of 204: ' + named(slower) +
  '. More than 1.5x faster and 0.5 s or more faster: ' + faster.length + ' of 204: ' + named(faster) + '.');
out.push('');

heading('### The runs (every command locked, one cell at a time, 16-second gaps)');
table(['Cell', 'Start', 'End', 'Helper s (MS06a -> MS06d)', 'Projection s', 'Within projection', 'Soak s'],
  data.map((d) => {
    const proj = Math.max(20, Math.ceil(2 * d.sb.helperS));
    const hhmmss = (iso) => iso.slice(11, 19);
    check('run ' + d.c.key + ' within its projection', d.sa.helperS <= proj, d.sa.helperS + ' vs ' + proj);
    return [L(d.c), hhmmss(d.a.start), hhmmss(d.a.end), f(d.sb.helperS, 2) + ' -> ' + f(d.sa.helperS, 2), String(proj),
      d.sa.helperS <= proj ? 'yes' : 'NO', f(d.sa.soakS, 1)];
  }), ['l', 'r', 'r', 'r', 'r', 'r', 'r']);

// ---------------------------------------------------------------- work
heading('## 4. Work (full ratings, attempts, proposals, local search)');
table(['Cell', 'Full ratings before -> after', 'Upper median', 'Max', 'Attempts (per request)', 'Proposals', 'Local ratings',
  'Shallow ratings', 'Cap hits allowance / ratings / proposals'],
  data.map((d) => {
    const x = d.sb; const y = d.sa;
    return [L(d.c), int(x.fullRatings) + ' -> ' + int(y.fullRatings), int(x.frMedian) + ' -> ' + int(y.frMedian),
      int(x.frMax) + ' -> ' + int(y.frMax),
      x.attempts + ' (' + x.attemptsMin + '-' + x.attemptsMax + ') -> ' + y.attempts + ' (' + y.attemptsMin + '-' + y.attemptsMax + ')',
      int(x.proposals) + ' -> ' + int(y.proposals), int(x.localRatings) + ' -> ' + int(y.localRatings),
      int(x.shallowRatings) + ' -> ' + int(y.shallowRatings),
      x.capShallow + ' / ' + x.capRatings + ' / ' + x.capProposals + ' -> ' + y.capShallow + ' / ' + y.capRatings + ' / ' + y.capProposals];
  }).concat([['**Total**', int(tot('fullRatings', 'sb')) + ' -> ' + int(tot('fullRatings', 'sa')), '', '',
    tot('attempts', 'sb') + ' -> ' + tot('attempts', 'sa'), '', '', '',
    tot('capShallow', 'sb') + ' / ' + tot('capRatings', 'sb') + ' / ' + tot('capProposals', 'sb') + ' -> ' +
    tot('capShallow', 'sa') + ' / ' + tot('capRatings', 'sa') + ' / ' + tot('capProposals', 'sa')]]),
  ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']);

heading('### Local searches (the plateau effect: a search no longer follows an equal-quality move)');
table(['Cell', 'Searches before -> after', 'Ended by allowance', 'Ended by rating cap', 'Ended by proposal cap', 'Ended without a cap',
  'Proposals per search', 'Ratings per search'],
  data.map((d) => {
    const x = d.sb; const y = d.sa;
    const per = (n, k) => (k ? f(n / k, 1) : 'n/a');
    const perInt = (n, k) => (k ? int(n / k) : 'n/a');
    return [L(d.c), x.searches + ' -> ' + y.searches, x.searchShallow + ' -> ' + y.searchShallow,
      x.searchRatings + ' -> ' + y.searchRatings, x.searchProposals + ' -> ' + y.searchProposals,
      x.searchNoCap + ' -> ' + y.searchNoCap, perInt(x.searchProposalSum, x.searches) + ' -> ' +
      perInt(y.searchProposalSum, y.searches), per(x.searchRatingSum, x.searches) + ' -> ' + per(y.searchRatingSum, y.searches)];
  }).concat([['**Total**', tot('searches', 'sb') + ' -> ' + tot('searches', 'sa'), tot('searchShallow', 'sb') + ' -> ' + tot('searchShallow', 'sa'),
    tot('searchRatings', 'sb') + ' -> ' + tot('searchRatings', 'sa'), tot('searchProposals', 'sb') + ' -> ' + tot('searchProposals', 'sa'),
    tot('searchNoCap', 'sb') + ' -> ' + tot('searchNoCap', 'sa'), '', '']]),
  ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r']);
check('local-search cap values are only shallow, ratings, proposals or none', tot('searchOther', 'sb') + tot('searchOther', 'sa') === 0,
  'other ' + (tot('searchOther', 'sb') + tot('searchOther', 'sa')));
for (const d of data) {
  check('work conservation after ' + d.c.key, d.a.led.summary.cells[d.c.key].work.checks.ok === 12);
  check('row caps = per-search caps after ' + d.c.key, d.sa.capShallow === d.sa.searchShallow &&
    d.sa.capRatings === d.sa.searchRatings && d.sa.capProposals === d.sa.searchProposals,
    d.sa.capShallow + '/' + d.sa.capRatings + '/' + d.sa.capProposals + ' vs ' + d.sa.searchShallow + '/' + d.sa.searchRatings + '/' + d.sa.searchProposals);
}

// ---------------------------------------------------------------- positions
const posTable = (title, kind, nullTitle) => {
  heading(title);
  const rows = [];
  for (const d of data) {
    const cb = d.cb[kind]; const ca = d.ca[kind];
    const tri = (s) => (s.n ? f(s.min, 3) + ' / ' + f(s.median, 3) + ' / ' + f(s.max, 3) : 'empty');
    const reasons = (r) => (Object.keys(r).length ? Object.keys(r).map((k) => k + ' x ' + r[k]).join(', ') : 'none');
    const nr = reasons(cb.reasons) === reasons(ca.reasons) ? reasons(ca.reasons) : reasons(cb.reasons) + ' -> ' + reasons(ca.reasons);
    rows.push([L(d.c), cb.raw.n + ' -> ' + ca.raw.n, tri(cb.raw), tri(ca.raw), cb.adj.n + ' -> ' + ca.adj.n, tri(cb.adj), tri(ca.adj),
      (cb.adj.n ? cb.adj.top + '/' + cb.adj.n : 'n/a') + ' -> ' + (ca.adj.n ? ca.adj.top + '/' + ca.adj.n : 'n/a'),
      (cb.adj.n ? sgn(ca.adj.median - cb.adj.median, 3) : 'n/a'), nr]);
  }
  const pool = (phase) => {
    const set = [].concat(...data.map((d) => d[phase].rows.filter(kind === 'exact' ? isExact : inBand)));
    const shape = (a) => ({ n: a.length, min: minOf(a), median: upperMedian(a), max: maxOf(a) });
    const raw = set.map((r) => r.position && r.position.raw).filter(finite);
    const adj = set.map((r) => r.position && r.position.adjusted).filter(finite);
    return { raw: shape(raw), adj: shape(adj), top: adj.filter((x) => x >= 0.75).length };
  };
  const tri3 = (s) => f(s.min, 3) + ' / ' + f(s.median, 3) + ' / ' + f(s.max, 3);
  const pb = pool('b'); const pa = pool('a');
  rows.push(['**All cells (pooled)**', pb.raw.n + ' -> ' + pa.raw.n, tri3(pb.raw), tri3(pa.raw), pb.adj.n + ' -> ' + pa.adj.n, tri3(pb.adj),
    tri3(pa.adj), pb.top + '/' + pb.adj.n + ' -> ' + pa.top + '/' + pa.adj.n, sgn(pa.adj.median - pb.adj.median, 3), 'Hell 1 undefined']);
  table(['Cell', 'n before -> after', 'Raw min / median / max before', 'Raw after', 'Adjusted n', 'Adjusted min / median / max before',
    'Adjusted after', 'Adjusted >= 0.75 (top quarter)', 'Median change (adjusted)', nullTitle], rows,
  ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'l']);
};
heading('## 5. Positions (AC01; raw `(score - min) / (max - min)`, adjusted `(score - lower) / (max - lower)`, unclamped)');
out.push('Median is the upper median (sorted index floor(n / 2)). The adjusted position is `null` with a reason where undefined; the');
out.push('raw position stays. "Top quarter" counts the cohort puzzles with adjusted position 0.75 or more. Judge upper bias on the');
out.push('adjusted exact cohort (R7); the cohort sizes differ before and after, so a median is never read without its n.');
out.push('');
posTable('### Exact cohort (the puzzles with the exact flag)', 'exact', 'Null reasons (adjusted)');
posTable('### All-in-band cohort (the solved puzzles in the requested band, exact and shallow)', 'band', 'Null reasons (adjusted)');

heading('### Undefined or out-of-cohort positions in the 204 rows (none is dropped)');
const outRows = [];
for (const phase of ['b', 'a']) {
  const reasons = {};
  let noCohort = 0;
  let adjNull = 0;
  let offBand = [];
  for (const d of data) {
    for (const r of d[phase].rows) {
      const hasAdj = r.position && finite(r.position.adjusted);
      if (!hasAdj) {
        adjNull += 1;
        const k = (r.position && r.position.reason) || 'no-position';
        reasons[k] = (reasons[k] || 0) + 1;
      }
      if (!inBand(r)) { noCohort += 1; offBand.push(r.tag + ' raw ' + (r.position && finite(r.position.raw) ? f(r.position.raw, 3) : 'n/a')); }
    }
  }
  outRows.push([phase === 'b' ? 'Before' : 'After', String(adjNull), Object.keys(reasons).map((k) => k + ' x ' + reasons[k]).join(', '),
    String(noCohort), offBand.join('; ') || 'none']);
}
table(['Run', 'Rows with adjusted null', 'Reasons', 'Rows in neither cohort (off-band, unrated)', 'Which'], outRows, ['l', 'r', 'l', 'r', 'l']);

// ---------------------------------------------------------------- target
heading('## 6. Target deviation (after only: the 204 before rows have `target: null`)');
out.push('The target of a row is the draw of the sample (or search) that produced the selected result, uniform on the raw finite band');
out.push('(R7). Target position `tp = (target - min) / (max - min)`; deviation `d = raw position - tp` in band widths (positive: the');
out.push('puzzle is above its target). "Paired" is the mean `|d|` of each puzzle against its own target; "shuffled" is the mean');
out.push('`|raw position of puzzle i - tp of puzzle j|` over all pairs i, j of the cell cohort (i = j included): what the figure would be');
out.push('if each target were unrelated to the puzzle it was drawn for. Paired well below shuffled would be a pull towards the target;');
out.push('paired near shuffled is no visible pull. Descriptive, 12 requests per cell.');
out.push('');
const devOf = (rows) => rows.filter((r) => r.position && finite(r.position.raw) && finite(r.target) && r.position.inputs)
  .map((r) => {
    const w = r.position.inputs.max - r.position.inputs.min;
    const tp = (r.target - r.position.inputs.min) / w;
    return { x: r.position.raw, tp };
  });
const devTable = (title, pick) => {
  heading(title);
  const rowsT = [];
  let allPaired = []; let allShuffled = [];
  for (const d of data) {
    const dv = devOf(d.a.rows.filter(pick));
    const n = dv.length;
    if (!n) { rowsT.push([L(d.c), '0', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a']); continue; }
    const paired = dv.map((p) => Math.abs(p.x - p.tp));
    const shuffled = [];
    for (const p of dv) for (const q of dv) shuffled.push(Math.abs(p.x - q.tp));
    allPaired = allPaired.concat(paired); allShuffled = allShuffled.concat(shuffled);
    rowsT.push([L(d.c), String(n), f(mean(dv.map((p) => p.tp)), 3), f(mean(dv.map((p) => p.x)), 3),
      sgn(mean(dv.map((p) => p.x - p.tp)), 3), f(mean(paired), 3), f(upperMedian(paired), 3), f(mean(shuffled), 3)]);
  }
  rowsT.push(['**All cells**', String(allPaired.length), '', '', '', f(mean(allPaired), 3), f(upperMedian(allPaired), 3), f(mean(allShuffled), 3)]);
  table(['Cell', 'n', 'Mean target position', 'Mean puzzle position', 'Mean signed d', 'Paired mean abs d', 'Paired upper median abs d',
    'Shuffled mean abs d'], rowsT, ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r']);
};
devTable('### Exact cohort', isExact);
devTable('### All-in-band cohort', inBand);
const targetNull = data.reduce((s, d) => s + d.a.rows.filter((r) => !finite(r.target)).length, 0);
const targetFin = data.reduce((s, d) => s + d.a.rows.filter((r) => finite(r.target)).length, 0);
const beforeFin = data.reduce((s, d) => s + d.b.rows.filter((r) => finite(r.target)).length, 0);
out.push('Target present in ' + targetFin + ' of 204 rows after (' + targetNull + ' null); ' + beforeFin + ' of 204 before.');
out.push('');
const gtRows = data.filter((d) => d.c.variant === 'greaterThan').map((d) => {
  let identical = 0;
  for (let i = 0; i < 12; i += 1) if (d.b.rows[i].puzzleHash === d.a.rows[i].puzzleHash) identical += 1;
  return [L(d.c), identical + '/12', d.sb.exact + ' -> ' + d.sa.exact, f(d.sb.genS, 2) + ' -> ' + f(d.sa.genS, 2),
    int(d.sb.fullRatings) + ' -> ' + int(d.sa.fullRatings), f(d.cb.exact.adj.median, 3) + ' -> ' + f(d.ca.exact.adj.median, 3)];
});
heading('### Greater-Than cells (CV6-05: the target is transported, not consumed by the sign pass)');
table(['Cell', 'Same puzzle hash', 'Exact', 'Generation s', 'Full ratings', 'Adjusted exact median'], gtRows, ['l', 'r', 'r', 'r', 'r', 'r']);

// ---------------------------------------------------------------- checks
heading('## 7. Checks and errors');
const chk = (set) => set.led.summary.checks;
const chkRows = data.map((d) => {
  const c = chk(d.a);
  const iv = Object.keys(c.invariantViolations).reduce((s, k) => s + c.invariantViolations[k], 0);
  const sc = d.a.led.summary.cells[d.c.key];
  return [L(d.c), String(d.sa.errors), String(iv), String(c.checkErrors.length), String(c.referenceErrors), String(c.pathErrors) + ' / ' + c.pathMismatches,
    sc.work.checks.ok + ' / ' + sc.work.checks.mismatch + ' / ' + sc.work.checks.unavailable, String(sc.exactDisagreements),
    sc.references.ok + ' / ' + sc.references.vacuous + ' / ' + sc.references.error + ' / ' + sc.references.skipped,
    c.result, String(d.a.helperExit)];
});
table(['Cell', 'Request errors', 'Invariant violations (I1-I7)', 'Check errors', 'Reference errors', 'Path errors / mismatches',
  'Work ok / mismatch / unavailable', 'Exact-flag disagreements', 'References ok / vacuous / error / skipped', 'Diagnostics', 'Exit'],
chkRows, ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'l', 'r']);
const failures = data.filter((d) => chk(d.a).failed || d.sa.errors || d.a.helperExit !== 0).length;
out.push('Cells with any error, invariant failure or non-zero exit: ' + failures + ' of 17.');
out.push('');

// ---------------------------------------------------------------- cross-checks
heading('## 8. Cross-checks of this script');
const bad = crosschecks.filter((c) => !c.ok);
out.push(crosschecks.length + ' checks (recomputed figures against the tools\' own summaries, identity, SLOW flags, work conservation): ' +
  (crosschecks.length - bad.length) + ' agree, ' + bad.length + ' do not.');
out.push('');
for (const b of bad) out.push('- DISAGREES: ' + b.label + ' (' + b.detail + ')');
if (bad.length) out.push('');

const text = out.join('\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '\n').replace(/\n/g, '\r\n');
fs.writeFileSync(OUT, text, 'utf8');
console.log('wrote ' + OUT + ' (' + out.length + ' lines); cross-checks: ' + (crosschecks.length - bad.length) + ' agree, ' + bad.length + ' do not');
for (const b of bad) console.log('DISAGREES: ' + b.label + ' (' + b.detail + ')');
