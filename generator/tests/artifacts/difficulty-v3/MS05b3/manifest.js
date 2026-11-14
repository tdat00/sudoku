#!/usr/bin/env node
'use strict';

/*
 * MS05b3: the manifest of the early I5 / CV3 / refusal cells, written BEFORE any of them runs.
 *   node tests/artifacts/difficulty-v3/MS05b3/manifest.js
 * writes docs/difficulty-v3/evidence/MS05b3/manifest.json (a new file). No puzzle is generated: the requests of every
 * cell (count, seeds, trace, options, budget) come from the lazy corpora read with a scripted pipeline, the selectors
 * from the real registrations of the six manual suites (SG.test.list of a registry of its own), and the projections
 * from the p95 budgets of design.md section 9.1 (SG.fixtures.perfTools.PERF_TARGETS) and the suites' own
 * BUDGET_MS, and, for the two mega Nightmare cells of CV3, from the records of MS05r5m.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const parity = require('./parity.js');

const OUT = process.env.MS05B3_MANIFEST_OUT ? path.resolve(process.env.MS05B3_MANIFEST_OUT) :
  path.join(parity.REPO, 'docs', 'difficulty-v3', 'evidence', 'MS05b3', 'manifest.json');
const FACTOR = 2; // SG.test.TIME_FACTOR of the suites' own time assertions
const OVERHEAD_SECONDS = 3; // loading the runner, registering the suites, the checks after the generation
const SHORT_SECONDS = 60; // a cell projected at most this long is first tried for at most 10 s without a timing slot

// MS05r5m, deep records, seconds of one live-equivalent request (generation time, trace off).
const R5M = {
  'mega16 nightmare': { seeds: [1, 2], seconds: [116.951, 103.606], ids: ['mega16-invariant-1', 'mega16-invariant-2'] },
  'mega12 nightmare': { seeds: [1, 2, 3], seconds: [23.721, 23.520, 23.637],
    ids: ['mega12-invariant-1', 'mega12-invariant-2', 'mega12-invariant-3'] }
};

const I5_SUITES = [
  { suite: 'killer', file: 'killer.test.js', names: ['corpusOf'], variant: 'killer', group: false },
  { suite: 'jigsaw', file: 'jigsaw.test.js', names: ['puzzleRun'], variant: 'jigsaw9', group: false },
  { suite: 'greater-than', file: 'greater-than.test.js', names: ['puzzleRun'], variant: 'greaterThan', group: false },
  { suite: 'extra-regions', file: 'extra-regions.test.js', names: ['puzzleRun', 'VARIANT_IDS'], variant: null,
    group: true },
  { suite: 'wordoku', file: 'wordoku.test.js', names: ['puzzleRun'], variant: 'wordoku', group: false }
];

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function main() {
  const MC = parity.loadHelpers();
  const sb = parity.newSandbox(MC);
  sb.load('tests/fixtures/perf-helper.js');
  const TARGETS = sb.SG.fixtures.perfTools.PERF_TARGETS;
  const sourceOf = (file) => parity.readText(path.join(parity.GENERATOR, 'tests', 'manual', file));
  const names = ['killer', 'jigsaw', 'greater-than', 'extra-regions', 'wordoku', 'variants'];
  names.forEach((name) => sb.register(name, 'tests/manual/' + name + '.test.js'));

  const cells = [];
  const select = (suite, filter) => {
    const listing = sb.list({ suite: suite, filter: filter });
    if (listing.registrationErrors.length > 0) throw new Error('registration errors in ' + suite);
    if (listing.tests.length !== 1) throw new Error(filter + ' selects ' + listing.tests.length + ' tests');
    return listing.tests[0];
  };
  const requestsOf = (read) => {
    const rec = MC.recorder({ budgetMsOf: sb.budgetMsOf });
    sb.withRun(rec.run, read);
    return MC.planOf(rec.log);
  };
  const describeRequests = (plan) => {
    const seeds = plan.map((r) => r.config.seed);
    const options = Array.from(new Set(plan.map((r) => r.config.variantOptions === undefined ? 'none' :
      JSON.stringify(r.config.variantOptions))));
    return {
      requests: plan.length, seedFirst: seeds[0], seedLast: seeds[seeds.length - 1],
      seeds: seeds.join(','), trace: plan[0].config.trace, options: options.join(' | '),
      callback: plan[0].emit, budgetMs: plan[0].budgetMs
    };
  };

  // I5 cells (and the CV6 selector, listed for the later owner, is not a cell of this task)
  I5_SUITES.forEach((entry) => {
    const probe = sb.probe(sourceOf(entry.file), entry.names.concat(['LEVELS', 'BUDGET_MS']));
    const variants = entry.group ? probe.VARIANT_IDS.map((id) => ({ id: id })) : [{ id: entry.variant }];
    variants.forEach((v) => {
      let previous = null;
      probe.LEVELS.forEach((level) => {
        const read = () => (entry.suite === 'killer' ? probe.corpusOf(level) : entry.group ?
          probe.puzzleRun()[v.id][level] : probe.puzzleRun()[level]);
        const plan = requestsOf(read);
        const count = plan.length;
        const filter = '> ' + (entry.group ? v.id + ' ' : '') + level + ': ' + count + ' puzzles > I5:';
        const test = select(entry.suite, filter);
        const perRequest = FACTOR * probe.BUDGET_MS[level] / 1000;
        const id = 'i5-' + entry.suite + (entry.group ? '-' + v.id : '') + '-' + level;
        cells.push(Object.assign({
          id: id, kind: 'i5', suite: entry.suite, variantId: v.id, level: level, filter: filter,
          fullName: test.fullName, selectedTotal: 1, generation: 'live',
          projection: {
            seconds: round(count * perRequest + OVERHEAD_SECONDS), perRequestSeconds: perRequest,
            basis: 'budget: ' + FACTOR + ' x BUDGET_MS of the suite (' + probe.BUDGET_MS[level] + ' ms, design.md ' +
              '9.1 p95 of rating v2) per request x ' + count + ' requests + ' + OVERHEAD_SECONDS + ' s; not a v3 ' +
              'measurement'
          },
          after: previous, listPath: 'selectors/' + id + '.json', resultsPath: 'i5/' + id + '.json',
          status: 'planned'
        }, describeRequests(plan)));
        previous = id;
      });
    });
  });

  // CV3 cells and the refusals
  const variantsProbe = sb.probe(sourceOf('variants.test.js'), ['contextOf', 'volumeOf']);
  sb.SG.variants.list().forEach((def) => {
    let previous = null;
    const ctx = variantsProbe.contextOf(def);
    def.difficultySupport.forEach((level) => {
      const plan = requestsOf(() => ctx.corpusOf(level));
      const filter = '> variants: ' + def.id + ' > CV3 ' + level + ':';
      const test = select('variants', filter);
      const target = TARGETS[def.id] && TARGETS[def.id][level];
      const key = def.id + ' ' + level;
      let projection;
      if (R5M[key]) {
        const sum = R5M[key].seconds.reduce((a, b) => a + b, 0);
        projection = {
          seconds: round(sum + OVERHEAD_SECONDS), perRequestSeconds: round(sum / R5M[key].seconds.length),
          basis: 'MS05r5m deep records of exactly these requests (seeds ' + R5M[key].seeds.join(', ') + ': ' +
            R5M[key].seconds.join(' + ') + ' s, engine source fee8b8d6..., trace off, node) + ' + OVERHEAD_SECONDS +
            ' s; prior measurement, not a live timing',
          r5mOccurrences: R5M[key].ids
        };
      } else {
        projection = {
          seconds: round(plan.length * FACTOR * target / 1000 + OVERHEAD_SECONDS),
          perRequestSeconds: FACTOR * target / 1000,
          basis: 'budget: ' + FACTOR + ' x the design.md 9.1 p95 target (' + target + ' ms, rating v2) per request x ' +
            plan.length + ' requests + ' + OVERHEAD_SECONDS + ' s; not a v3 measurement'
        };
      }
      const id = 'cv3-' + def.id + '-' + level;
      cells.push(Object.assign({
        id: id, kind: 'cv3', suite: 'variants', variantId: def.id, level: level, filter: filter,
        fullName: test.fullName, selectedTotal: 1, generation: 'live', projection: projection, after: previous,
        listPath: 'selectors/' + id + '.json', resultsPath: 'cv3/' + id + '.json', status: 'planned'
      }, describeRequests(plan)));
      previous = id;
    });
    const missing = sb.SG.difficulty.LEVELS.filter((level) => def.difficultySupport.indexOf(level) === -1);
    const filter = '> variants: ' + def.id + ' > CV3 unsupported:';
    const test = select('variants', filter);
    const id = 'cv3-' + def.id + '-unsupported';
    cells.push({
      id: id, kind: 'cv3-unsupported', suite: 'variants', variantId: def.id, level: null, filter: filter,
      fullName: test.fullName, selectedTotal: 1, generation: 'none (every request is refused before any generation)',
      unsupportedComplement: missing, requests: missing.length,
      projection: { seconds: 1, perRequestSeconds: 0, basis: 'no generation: ' + missing.length +
        ' refused requests of difficulty.unsupportedLevel; registration and load only' },
      after: null, listPath: 'selectors/' + id + '.json', resultsPath: 'cv3/' + id + '.json', status: 'planned'
    });
  });

  cells.forEach((cell) => {
    cell.timingSlot = cell.projection.seconds > SHORT_SECONDS ? 'locked (projected over ' + SHORT_SECONDS + ' s)' :
      'first tried for at most 10 s without the lock (a command that cannot exceed 10 s needs none); run again ' +
      'under the lock if it is stopped';
  });
  const total = cells.reduce((sum, c) => sum + c.projection.seconds, 0);
  const doc = {
    schema: 1, kind: 'manual-corpus-cell-manifest', task: 'MS05b3', node: process.version,
    note: 'Written before any cell ran. A cell is one runner command with a selected total of 1. Projections are ' +
      'labelled: budget-based ones are the p95 budgets of rating v2 times the time factor 2 per request (not v3 ' +
      'measurements); the two mega Nightmare cells use the MS05r5m deep records. After a cell has run, the sequencer ' +
      'projects the next level of the same variant as max(its budget projection, 3 x the observed seconds per ' +
      'request of the level before); a cell projected over 450 s is not launched but written to deferred-cv3.json ' +
      '(S-OD4), except the two mega Nightmare cells that Addendum B1 orders live.',
    limits: { processSeconds: 540, projectionSeconds: 450, requestGuardMs: 240000 },
    counts: {
      cells: cells.length, i5: cells.filter((c) => c.kind === 'i5').length,
      cv3: cells.filter((c) => c.kind === 'cv3').length,
      cv3Unsupported: cells.filter((c) => c.kind === 'cv3-unsupported').length,
      requests: cells.reduce((sum, c) => sum + (c.kind === 'cv3-unsupported' ? 0 : c.requests), 0),
      projectedSecondsTotal: round(total)
    },
    cells: cells
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, parity.json(doc), { encoding: 'utf8', flag: 'wx' });
  console.log('manifest: ' + cells.length + ' cells (' + doc.counts.i5 + ' I5, ' + doc.counts.cv3 + ' CV3, ' +
    doc.counts.cv3Unsupported + ' refusals), ' + doc.counts.requests + ' generation requests, projected ' +
    round(total) + ' s in all');
  return 0;
}

process.exitCode = main();
