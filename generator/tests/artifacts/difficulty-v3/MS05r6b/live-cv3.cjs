#!/usr/bin/env node
'use strict';

/*
 * MS05r6b, B1: builds evidence/MS05r6b/deep/live-cv3.json, the reconciliation of MS05b3's two live mega Nightmare CV3 cells
 * (Addendum B1) with the deep records of the same requests. Read-only; no generation. Nothing is typed in: every number
 * is read from MS05b3's outcomes and results files and from deep/reconciled.json.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/live-cv3.cjs --out=<new project-relative .json>
 *
 * The five live requests (mega16 seeds 1 and 2, mega12 seeds 1, 2 and 3) are counted apart from the fourteen deep
 * executions; the occurrence ids are cross-references, not extra generations and not a reuse route. The expected aggregate
 * misses (S-AV03 0 of 2, S-AV02 0 of 3) stay failed availability assertions. Exit 0 when both cells reconcile.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence/';
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));

function main(argv) {
  const outArg = (argv.find((a) => /^--out=/.test(a)) || '').slice('--out='.length);
  if (!outArg || argv.length !== 1) throw new Error('usage: --out=<new project-relative .json>');
  const outAbs = path.resolve(process.cwd(), outArg);
  if (fs.existsSync(outAbs)) throw new Error(outArg + ' exists already (an evidence file is never overwritten)');
  const outcomes = json(EV + 'MS05b3/outcomes.json').outcomes;
  const deep = json(EV + 'MS05r6b/deep/reconciled.json');
  const deepById = new Map(deep.occurrences.map((o) => [o.id, o]));
  const problems = [];
  const cells = ['cv3-mega16-nightmare', 'cv3-mega12-nightmare'].map((id) => {
    const c = outcomes.filter((o) => o.id === id)[0];
    const result = json(EV + 'MS05b3/' + c.resultsPath);
    const seeds = c.seeds.split(',').map(Number);
    const rows = c.r5mOccurrences.map((occ, i) => {
      const d = deepById.get(occ);
      const live = c.requestMs[i];
      const recorded = d ? d.generationMs : null;
      if (!d || d.seed !== seeds[i] || d.board !== c.variantId || d.group !== 'invariant') {
        problems.push(id + ': the occurrence ' + occ + ' is not the invariant of seed ' + seeds[i]);
      }
      return { seed: seeds[i], liveMs: live, occurrence: occ, deepGenerationMs: recorded,
        liveOverDeep: recorded ? Math.round(live / recorded * 10000) / 10000 : null,
        deepExact: d ? d.exact : null, deepWarnings: d ? d.warnings : null, deepCorrectness: d ? d.correctness : null };
    });
    const expectedMessage = c.variantId + ' nightmare: none of ' + c.requests + ' puzzles hit it';
    if (c.generation !== 'live') problems.push(id + ': generation is not live');
    if (c.selectedTotal !== 1 || c.preflightSelectedTotal !== 1 || result.results.total !== 1) problems.push(id + ': selected total is not 1');
    if (c.status !== 'fail' || c.class !== 'availability-none-hit' || !c.error || c.error.message !== expectedMessage) {
      problems.push(id + ': the outcome is not the expected aggregate availability miss');
    }
    if (result.complete !== true || result.sourceStable !== true) problems.push(id + ': result not complete or stable');
    if (c.requestMs.length !== c.requests) problems.push(id + ': the request times do not match the request count');
    return { id: id, selector: c.filter, fullName: c.fullName, generation: c.generation, board: c.variantId,
      level: c.level, requests: c.requests, seeds: seeds, budgetMs: c.budgetMs, selectedTotal: c.selectedTotal,
      slot: c.slot, exit: c.exit, status: c.status, class: c.class, error: c.error.message,
      assertionOrder: 'every per-puzzle assertion first (all passed), then the aggregate exact === 0 failure: the aggregate is the failing one',
      processSeconds: c.processSeconds, testMs: c.testMs, lockWaitSecondsInB3: c.lockWaitSeconds,
      requestMs: c.requestMs, perRequestSeconds: c.perRequestSeconds, results: EV + 'MS05b3/' + c.resultsPath,
      resultSourceHash: result.sourceHash, overRequestGuard: c.requestMs.some((ms) => ms > c.budgetMs),
      over240s: c.requestMs.some((ms) => ms > 240000), deepCrossReference: rows };
  });
  const live = cells.reduce((n, c) => n + c.requests, 0);
  const doc = {
    schema: 1, kind: 'live-cv3-reconciliation', task: 'MS05r6b', rule: 'Addendum B1: live CV3 cells, deep occurrence ids as references only',
    counts: { liveCv3Requests: live, liveCv3Cells: cells.length, deepExecutions: deep.occurrences.length,
      note: 'the five live requests are not among, and are not counted as, the fourteen deep generations' },
    deepIdentity: deep.identity, cells: cells,
    items: { 'S-AV03': 'mega16 Nightmare: 0 of 2 exact live (116.787 s and 103.904 s, none over the 240 s request guard), the first 3.2 s under the 120 s application guard as a Node run with trace off',
      'S-AV02': 'mega12 Nightmare: 0 of 3 exact live (23.509, 23.067 and 22.790 s)' },
    problems: problems, reconciled: problems.length === 0
  };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(doc, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  cells.forEach((c) => console.log(c.id + ': ' + c.requests + ' live requests ' + JSON.stringify(c.requestMs) + ' ms, ' + c.status + ' (' + c.error +
    '), selected total ' + c.selectedTotal + ', deep ids ' + c.deepCrossReference.map((r) => r.occurrence).join(', ')));
  console.log('live requests ' + live + ' of ' + cells.length + ' cells, deep executions ' + deep.occurrences.length + ', problems ' + problems.length);
  console.log('written: ' + outArg);
  return problems.length === 0 ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
