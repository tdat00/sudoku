#!/usr/bin/env node
'use strict';

/*
 * MS05r4: checks of select-cap.cjs on fake rows (no generation). Run from generator/:
 *   node tests/artifacts/difficulty-v3/MS05r4/select-cap.selftest.cjs
 * Exit code 0 when every case passes, 1 otherwise.
 */
const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const sel = require('./select-cap.cjs');

const GENERATOR = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');
const loader = require(path.join(GENERATOR, 'tests', 'replay-fixtures.js'));
loader.loadFixtures(['tests/fixtures/difficulty-diagnostics.js']);
const mergeShards = globalThis.SG.fixtures.difficultyDiagnostics.mergeShards;

const ROUTES = { classic9: 'direct', killer: 'pipeline', jigsaw9: 'pipeline' };
const FROZEN = { sourceHash: 'a'.repeat(64), toolHash: 'b'.repeat(64), node: 'v0.0.0' };
const SCRATCH = path.join(__dirname, 'scratch', 'selftest');

function keyOf(cell) {
  return cell.variant + '/' + cell.level;
}

function rowOf(planned, request, spec) {
  const error = spec.error === true;
  return {
    variant: planned.variant, requested: planned.level, index: request.index, tag: request.tag,
    pipelineSeed: request.pipelineSeed, outcome: error ? 'error' : 'ok', generationExact: !error && spec.exact === true,
    fullRatings: spec.work === 'unknown' ? null : spec.ratings, proposals: 10, localRatings: 3, shallowRatings: 2,
    capHits: { shallow: 0, ratings: 0, proposals: 0 }, generationMs: 5.5,
    referenceStatus: request.index === 0 || request.index === 11 ? 'ok' : 'not-selected',
    workCheck: spec.work === 'unknown' ? { status: 'unavailable', reason: 'the generation reported no work' }
      : spec.work === 'mismatch' ? { status: 'mismatch', reason: 'the work counts 1 but 2 calls were made' }
        : { status: 'ok', reason: null }
  };
}

/** One ledger of the span from .. from + count - 1 of a cell; `spec(index)` says what each request did. */
function ledgerOf(manifest, setting, key, from, count, spec, tweak) {
  const planned = manifest.cells.find((c) => keyOf(c) === key);
  const rows = planned.requests.slice(from, from + count).map((r) => rowOf(planned, r, spec(r.index)));
  const whole = from === 0 && count === 12;
  const ledger = {
    schema: 1,
    complete: true,
    meta: {
      acceptance: 'canonical-required-tier', sourceHash: manifest.frozen.sourceHash, sourceFiles: 63,
      toolHash: manifest.frozen.toolHash, node: manifest.frozen.node, seedBase: 20260101, shallowCap: setting,
      shallowSearchRatings: setting === 'none' ? null : Number(setting),
      manifest: {
        requests: count, logicalRequests: 12, shard: whole ? null : { from: from, count: count, total: 12 },
        cells: [{ variant: planned.variant, level: planned.level, requests: count, from: from, logicalTotal: 12,
          referenceIndexes: [0, 11], route: planned.route, unsupported: false }],
        count: count, perCombo: 0, quick: false, includeUnsupported: false, weights: null, bands: null, gate: false,
        ratingVersion: 2, referenceBudgetMs: 120000
      }
    },
    rows: rows,
    summary: {
      checks: {
        invariantViolations: { I1: 0, I2: 0, I3: 0, I4: 0, I5: 0, I6: 0, I7: 0 }, requestErrors: 0,
        checkErrors: [], referenceErrors: 0, pathErrors: 0, pathMismatches: 0, workUnavailable: 0
      }
    }
  };
  if (tweak) tweak(ledger);
  return ledger;
}

/**
 * Every ledger of the 24 cells; `spec(setting, key, index)` gives each request; `shards(setting, key)` the spans
 * of its ledgers (default: the whole cell); `tweak(setting, key, ledger)` may alter a ledger.
 */
function world(manifest, spec, shards, tweak) {
  const out = [];
  sel.SETTINGS.forEach((setting) => manifest.cells.forEach((planned) => {
    const key = keyOf(planned);
    (shards ? shards(setting, key) : [[0, 12]]).forEach((span) => {
      const ledger = ledgerOf(manifest, setting, key, span[0], span[1], (i) => spec(setting, key, i),
        tweak ? (l) => tweak(setting, key, l) : null);
      const file = 'selection/' + setting + '/' + planned.variant + '-' + planned.level + '-' + span[0] + '.json';
      out.push({ setting: setting, file: file, sha256: 'x', ledger: ledger });
    });
  }));
  return out;
}

const MANIFEST = sel.declareManifest(ROUTES, FROZEN);
const KEYS = MANIFEST.cells.map(keyOf);
const ENV = { mergeShards: mergeShards };

function analyse(ledgers, manifest) {
  return sel.analyse({ manifest: manifest || MANIFEST, ledgers: ledgers, diagnostics: [] }, ENV);
}

/** Hits: the first `hits` indexes are exact. Ratings: `base - cut` for every index. */
const flat = (hits, ratings) => (i) => ({ exact: i < hits, ratings: ratings });

function table(overrides) {
  // Everything ties (8 hits, 100 ratings) unless overrides(setting, key) returns { hits, ratings }.
  return (setting, key, i) => {
    const o = (overrides && overrides(setting, key)) || {};
    return flat(o.hits === undefined ? 8 : o.hits, o.ratings === undefined ? 100 : o.ratings)(i);
  };
}

const cases = [];
function it(name, fn) {
  cases.push([name, fn]);
}

it('the manifest has 288 selecting requests, 12 diagnostics and the seeds of tests/soak.js', () => {
  assert.strictEqual(MANIFEST.counts.selecting, 288);
  assert.strictEqual(MANIFEST.counts.diagnostic, 12);
  assert.strictEqual(MANIFEST.cells.length, 6);
  assert.ok(MANIFEST.cells.every((c) => c.requests.length === 12));
  assert.deepStrictEqual(MANIFEST.cells.map((c) => c.route),
    ['direct', 'direct', 'direct', 'pipeline', 'pipeline', 'pipeline']);
  assert.deepStrictEqual(MANIFEST.cells[0].requests.map((r) => r.pipelineSeed), new Array(12).fill(null));
  // killer/expert 0 and 11 in docs/difficulty-v3/evidence/MS02/killer-expert.json, seed base 20260101
  const killer = MANIFEST.cells.find((c) => keyOf(c) === 'killer/expert');
  assert.strictEqual(killer.requests[0].pipelineSeed, 605397093);
  assert.strictEqual(killer.requests[11].pipelineSeed, 503914329);
  assert.strictEqual(sel.declareManifest(ROUTES, FROZEN).manifestHash, MANIFEST.manifestHash);
});

it('the upper median of 12 values is the sorted index 6', () => {
  assert.strictEqual(sel.upperMedian([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]), 7);
  assert.strictEqual(sel.upperMedian([5, 5, 5, 5, 5, 5, 9, 9, 9, 9, 9, 9]), 9);
});

it('a tie everywhere, or no strict reduction, selects none', () => {
  const result = analyse(world(MANIFEST, table()));
  assert.strictEqual(result.decision.status, 'none');
  assert.strictEqual(result.decision.chosen, null);
  assert.deepStrictEqual(result.decision.eligible, []);
  const more = analyse(world(MANIFEST, table((s, k) => (s === '64' && k === KEYS[0] ? { hits: 12 } : null))));
  assert.strictEqual(more.decision.chosen, null, 'more hits without fewer ratings is not a reduction');
});

it('the smallest eligible finite setting wins: 64 with one strict reduction', () => {
  const result = analyse(world(MANIFEST, table((s, k) => (k === KEYS[2] && s !== 'none' ? { ratings: 90 } : null))));
  assert.strictEqual(result.decision.status, 'selected');
  assert.strictEqual(result.decision.chosen, '64');
  assert.deepStrictEqual(result.decision.eligible, ['64', '128', '256']);
});

it('a one-hit loss in any cell disqualifies 64; 128 wins when it keeps every cell and improves', () => {
  const result = analyse(world(MANIFEST, table((s, k) => {
    if (s === 'none') return null;
    if (s === '64' && k === KEYS[5]) return { hits: 7, ratings: 10 };
    return { ratings: 80 };
  })));
  assert.strictEqual(result.decision.chosen, '128');
  const sixtyFour = result.comparisons.find((c) => c.setting === '64');
  assert.strictEqual(sixtyFour.eligible, false);
  assert.deepStrictEqual(sixtyFour.hitLossCells, [KEYS[5]]);
});

it('hits gained in one cell never excuse a hit lost in another', () => {
  const result = analyse(world(MANIFEST, table((s, k) => {
    if (s !== '64') return null;
    if (k === KEYS[0]) return { hits: 12, ratings: 50 };
    if (k === KEYS[4]) return { hits: 7, ratings: 50 };
    return { ratings: 50 };
  })));
  assert.notStrictEqual(result.decision.chosen, '64');
  assert.strictEqual(result.decision.chosen, null, 'only 64 reduces anything, and it is disqualified');
});

it('a finite setting that is no better than none in ratings is not eligible although hits tie', () => {
  const result = analyse(world(MANIFEST, table((s) => (s === '256' ? { ratings: 100 } : s === '128' ? { ratings: 120 } :
    s === '64' ? { ratings: 130 } : null))));
  assert.strictEqual(result.decision.chosen, null);
});

it('error rows stay in the twelve and are misses', () => {
  const rows = [];
  const planned = MANIFEST.cells[0];
  planned.requests.forEach((r) => rows.push(rowOf(planned, r, r.index < 2 ? { error: true, ratings: 40 } :
    { exact: r.index < 7, ratings: 10 })));
  const stats = sel.cellStats(rows);
  assert.strictEqual(stats.ok, true);
  assert.strictEqual(stats.stats.requests, 12);
  assert.strictEqual(stats.stats.errors, 2);
  assert.strictEqual(stats.stats.hits, 5);
  assert.strictEqual(stats.stats.upperMedian, 10);
  assert.strictEqual(stats.stats.fullRatings[11], 40, 'the work of a failed request is kept');
});

it('unknown work is never zero: it blocks the selection', () => {
  const ledgers = world(MANIFEST, table((s, k) => (k === KEYS[1] ? { ratings: 90 } : null)));
  const victim = ledgers.find((e) => e.setting === '128' && e.file.indexOf('classic9-master') !== -1);
  victim.ledger.rows[4] = rowOf(MANIFEST.cells[1], MANIFEST.cells[1].requests[4], { work: 'unknown', error: true });
  const result = analyse(ledgers);
  assert.strictEqual(result.decision.status, 'blocked');
  assert.strictEqual(result.decision.chosen, undefined);
  assert.ok(result.decision.problems.some((p) => /index 4: work check unavailable/.test(p)));
});

it('a work mismatch blocks the selection', () => {
  const ledgers = world(MANIFEST, table(), null, (s, k, l) => {
    if (s === 'none' && k === KEYS[0]) l.rows[3] = rowOf(MANIFEST.cells[0], MANIFEST.cells[0].requests[3], { work: 'mismatch', ratings: 1 });
  });
  const result = analyse(ledgers);
  assert.strictEqual(result.decision.status, 'blocked');
  assert.ok(result.decision.problems.some((p) => /work check mismatch/.test(p)));
});

it('a duplicate or a missing index blocks the selection', () => {
  const overlap = analyse(world(MANIFEST, table(), (s, k) => (s === '256' && k === KEYS[4] ? [[0, 6], [5, 6]] : [[0, 12]])));
  assert.strictEqual(overlap.decision.status, 'blocked');
  assert.ok(overlap.decision.problems.some((p) => /index 5 is in ledger 0 and in ledger 1/.test(p)));
  const gap = analyse(world(MANIFEST, table(), (s, k) => (s === 'none' && k === KEYS[3] ? [[0, 5], [6, 6]] : [[0, 12]])));
  assert.strictEqual(gap.decision.status, 'blocked');
  assert.ok(gap.decision.problems.some((p) => /indexes are missing/.test(p)));
});

it('a missing ledger, a mixed source or a ledger in the wrong setting blocks the selection', () => {
  const missing = world(MANIFEST, table()).filter((e) => !(e.setting === '64' && /jigsaw9-expert/.test(e.file)));
  const a = analyse(missing);
  assert.strictEqual(a.decision.status, 'blocked');
  assert.ok(a.decision.problems.some((p) => /64 jigsaw9\/expert: no ledger/.test(p)));
  const mixed = analyse(world(MANIFEST, table(), null, (s, k, l) => {
    if (s === '256' && k === KEYS[2]) l.meta.sourceHash = 'c'.repeat(64);
  }));
  assert.strictEqual(mixed.decision.status, 'blocked');
  assert.ok(mixed.decision.problems.some((p) => /sourceHash/.test(p)));
  const tool = analyse(world(MANIFEST, table(), null, (s, k, l) => { if (s === '128') l.meta.toolHash = 'd'.repeat(64); }));
  assert.ok(tool.decision.problems.some((p) => /toolHash/.test(p)));
  const wrong = analyse(world(MANIFEST, table(), null, (s, k, l) => {
    if (s === '64' && k === KEYS[0]) { l.meta.shallowCap = '128'; l.meta.shallowSearchRatings = 128; }
  }));
  assert.ok(wrong.decision.problems.some((p) => /sits in the folder of 64/.test(p)));
  [['shallowCap', '128'], ['shallowSearchRatings', 128], ['shallowSearchRatings', null]].forEach((one) => {
    const half = analyse(world(MANIFEST, table(), null, (s, k, l) => {
      if (s === '64' && k === KEYS[0]) l.meta[one[0]] = one[1];
    }));
    assert.strictEqual(half.decision.status, 'blocked', 'only ' + one[0] + ' says ' + String(one[1]));
  });
});

it('a shard of two settings mixed in one cell, a wrong tag or a wrong seed blocks the selection', () => {
  const mix = analyse(world(MANIFEST, table(), (s, k) => (s === 'none' && k === KEYS[4] ? [[0, 6], [6, 6]] : [[0, 12]]),
    (s, k, l) => {
      if (s === 'none' && k === KEYS[4] && l.meta.manifest.cells[0].from === 6) {
        l.meta.shallowCap = '64';
        l.meta.shallowSearchRatings = 64;
      }
    }));
  assert.strictEqual(mix.decision.status, 'blocked');
  const seed = analyse(world(MANIFEST, table(), null, (s, k, l) => { if (s === '64' && k === KEYS[3]) l.rows[2].pipelineSeed = 7; }));
  assert.ok(seed.decision.problems.some((p) => /row 2 is killer:hard:2 seed 7/.test(p)));
});

it('an invariant violation or a check error in a ledger blocks the selection', () => {
  const invariant = analyse(world(MANIFEST, table(), null, (s, k, l) => {
    if (s === 'none' && k === KEYS[0]) l.summary.checks.invariantViolations.I1 = 1;
  }));
  assert.strictEqual(invariant.decision.status, 'blocked');
  const errors = analyse(world(MANIFEST, table(), null, (s, k, l) => {
    if (s === '64' && k === KEYS[1]) l.summary.checks.checkErrors = ['x'];
  }));
  assert.strictEqual(errors.decision.status, 'blocked');
});

it('shards give the statistics of the whole cell, computed from rows and not from shard medians', () => {
  const spec = (s, k, i) => ({ exact: i % 2 === 0, ratings: i < 6 ? 10 + i : 200 + i });
  const whole = analyse(world(MANIFEST, spec));
  const parts = analyse(world(MANIFEST, spec, () => [[0, 6], [6, 6]]));
  assert.strictEqual(whole.decision.status, 'none');
  assert.deepStrictEqual(parts.cells[KEYS[0]].none.fullRatings, whole.cells[KEYS[0]].none.fullRatings);
  assert.strictEqual(parts.cells[KEYS[0]].none.upperMedian, 200 + 6, 'sorted index 6 of the 12 rows');
  assert.strictEqual(parts.cells[KEYS[0]].none.hits, 6);
  assert.deepStrictEqual(parts.cells[KEYS[0]].none.shards.length, 2);
});

it('a manifest changed after its hash is refused', () => {
  const edited = JSON.parse(JSON.stringify(MANIFEST));
  edited.cells[0].requests[0].tag = 'classic9:normal:99';
  const result = analyse(world(MANIFEST, table()), edited);
  assert.strictEqual(result.decision.status, 'blocked');
  assert.ok(result.decision.problems.some((p) => /manifestHash/.test(p)));
});

it('the diagnostics: twelve planned outcomes, missing ones are named, a wrong setting is invalid', () => {
  const record = (id, setting) => ({ caseId: id, mode: 'diagnostic', capSetting: setting, complete: true, outcome: 'ok',
    error: null, exact: false, required: false, attempts: 8, samples: 90, generationMs: 1000, work: [] });
  const records = [{ setting: 'none', case: 'G13', file: 'd/none/G13.json', sha256: 'y', record: record('G13', 'none') },
    { setting: '64', case: 'G13', file: 'd/64/G13.json', sha256: 'y', record: record('G13', '128') }];
  const result = sel.analyse({ manifest: MANIFEST, ledgers: world(MANIFEST, table()), diagnostics: records }, ENV);
  assert.strictEqual(result.diagnostics.length, 12);
  assert.strictEqual(result.diagnostics.filter((d) => d.status === 'missing').length, 10);
  assert.strictEqual(result.diagnostics.filter((d) => d.status === 'recorded').length, 1);
  assert.strictEqual(result.diagnostics.find((d) => d.setting === '64' && d.case === 'G13').status, 'invalid');
});

function writeJson(rel, value) {
  const abs = path.join(GENERATOR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(value), 'utf8');
}

function cli(args) {
  const run = childProcess.spawnSync(process.execPath, [path.join(__dirname, 'select-cap.cjs')].concat(args), {
    cwd: GENERATOR, encoding: 'utf8'
  });
  return { code: run.status, out: run.stdout, err: run.stderr };
}

it('the command line: declare, refuse to overwrite, analyse, blocked, usage', () => {
  const rel = path.relative(GENERATOR, SCRATCH);
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  try {
    const manifestFile = path.join(rel, 'manifest.json');
    const declared = cli(['--declare=' + manifestFile]);
    assert.strictEqual(declared.code, 0, declared.err);
    assert.ok(/288 selecting requests and 12 diagnostic outcomes/.test(declared.out));
    assert.strictEqual(cli(['--declare=' + manifestFile]).code, 2, 'an existing file is never overwritten');
    const real = JSON.parse(fs.readFileSync(path.join(GENERATOR, manifestFile), 'utf8'));
    assert.strictEqual(real.counts.selecting, 288);
    assert.deepStrictEqual(real.cells.map((c) => c.route), ['direct', 'direct', 'direct', 'pipeline', 'pipeline', 'pipeline']);
    assert.ok(/^[0-9a-f]{64}$/.test(real.frozen.sourceHash) && /^[0-9a-f]{64}$/.test(real.frozen.toolHash));
    const ledgers = world(real, table((s, k) => (k === KEYS[4] && s === '128' ? { ratings: 60 } : null)));
    ledgers.forEach((e) => writeJson(path.join(rel, 'selection', e.setting, path.basename(e.file)), e.ledger));
    const args = ['--manifest=' + manifestFile, '--selection=' + path.join(rel, 'selection'),
      '--diagnostic=' + path.join(rel, 'diagnostic'), '--out=' + path.join(rel, 'selection.json')];
    const done = cli(args);
    assert.strictEqual(done.code, 0, done.err + done.out);
    const result = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'selection.json'), 'utf8'));
    assert.strictEqual(result.decision.status, 'selected');
    assert.strictEqual(result.decision.chosen, '128');
    assert.strictEqual(result.inputs.length, 24);
    assert.strictEqual(result.diagnostics.filter((d) => d.status === 'missing').length, 12);
    const bytes = fs.readFileSync(path.join(SCRATCH, 'selection.json'), 'utf8');
    assert.ok(bytes.endsWith('\r\n') && !/(?<!\r)\n/.test(bytes));
    assert.strictEqual(cli(args).code, 2, 'the selection is never overwritten either');
    // a gap in one cell
    fs.rmSync(path.join(SCRATCH, 'selection', 'none', 'killer-hard-0.json'));
    const blocked = cli(args.slice(0, 3).concat(['--out=' + path.join(rel, 'blocked.json')]));
    assert.strictEqual(blocked.code, 1);
    assert.ok(/blocked/.test(blocked.out) && /no ledger/.test(blocked.out));
    assert.strictEqual(cli(['--bogus']).code, 2);
    assert.strictEqual(cli(['--declare=' + manifestFile, '--out=x.json']).code, 2);
    assert.strictEqual(cli(['--declare=' + path.join(REPO, 'x.json')]).code, 2, 'an absolute path is refused');
  } finally {
    fs.rmSync(SCRATCH, { recursive: true, force: true });
  }
});

let failed = 0;
cases.forEach((c) => {
  try {
    c[1]();
    console.log('ok   ' + c[0]);
  } catch (err) {
    failed++;
    console.log('FAIL ' + c[0] + '\n     ' + String(err && err.stack ? err.stack : err).split('\n').slice(0, 6).join('\n     '));
  }
});
console.log((cases.length - failed) + ' of ' + cases.length + ' passed');
process.exitCode = failed === 0 ? 0 : 1;
