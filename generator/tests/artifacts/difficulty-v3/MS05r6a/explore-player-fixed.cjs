'use strict';

/*
 * MS05r6a fix round (IR11): the 11 fixed real results of the `player` suite, through the route of its `realResult`
 * (`SG.pipeline.run({ variantId, difficulty, seed, trace: 'off' }, null)`), analysed and viewed as the suite does
 * (`SG.replay.analyse`, `SG.player.buildViews`). Per request it records every compact step whose last part is
 * `replay.folded.reveal` (position, peak, restored clues, the English sentence), the plain folds, and, for information,
 * the multi-move jumps, the jumps that are no jump in the details view, and the new-hardest steps at a flat or
 * lower score in the details view. It generates puzzles: run it only through Run-Dv3Logged.ps1.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/explore-player-fixed.cjs --json=<file.json>
 */
const fs = require('fs');
const path = require('path');
const { loadFixtures } = require('../../../replay-fixtures.js');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// The order of the brief (the player suite's `realResult` and `CASES` requests).
const REQUESTS = [
  ['classic9', 'normal', 3], ['classic9', 'veryEasy', 1], ['classic9', 'nightmare', 5], ['classic4', 'veryEasy', 2],
  ['killer', 'easy', 1], ['killer', 'normal', 2], ['greaterThan', 'normal', 4], ['jigsaw9', 'easy', 6],
  ['wordoku', 'easy', 1], ['mega12', 'easy', 2], ['mega16', 'veryEasy', 1]
];

function sourceList() {
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(fs.readFileSync(path.join(ROOT, 'tests', 'node-runner.js'), 'utf8'));
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
}

function main(argv) {
  const jsonArg = argv.map((a) => /^--json=(.+)$/.exec(a)).filter(Boolean)[0];
  const loadOnly = argv.includes('--load-only');
  if (!jsonArg && !loadOnly) throw new Error('usage: --json=<file.json> | --load-only');
  const SG = loadFixtures(['tests/fixtures/tool-records.js']);
  loadFixtures(sourceList());
  const R = SG.replay;
  const P = SG.player;
  if (loadOnly) {
    console.log('load only (nothing generated): ' + JSON.stringify({ analyse: typeof R.analyse, buildViews: typeof P.buildViews,
      describeStep: typeof P.describeStep, run: typeof SG.pipeline.run, locale: typeof SG.i18n.setLocale, requests: REQUESTS.length }));
    return 0;
  }
  const out = { requests: [], reveal: [] };

  REQUESTS.forEach((r) => {
    const started = Date.now();
    const result = SG.pipeline.run({ variantId: r[0], difficulty: r[1], seed: r[2], trace: 'off' }, null);
    const generationMs = Date.now() - started;
    const analysis = R.analyse(result);
    const views = P.buildViews(result, analysis);
    const model = result.model;
    SG.i18n.setLocale('en');
    SG.i18n.setCellLabeler((cell) => SG.model.cellLabel(model, cell));
    const folds = [];
    views.compact.steps.forEach((step, i) => {
      const last = step.parts[step.parts.length - 1];
      if (!last || !/^replay\.folded\./.test(last.key)) return;
      folds.push({ i: i, position: step.position, kind: step.kind, score: step.table.score, key: last.key,
        peak: last.args.peak, revealed: last.args.revealed === undefined ? null : last.args.revealed,
        sentence: P.describeStep(step) });
    });
    SG.i18n.setCellLabeler(null);
    const multiMove = analysis.transitions.filter((t) => t.view === 'compact' && t.tier === 'jump' && t.cause &&
      t.cause.class === 'multi-move').map((t) => ({ to: t.to, before: t.before.total, after: t.after.total }));
    const viewDependent = analysis.transitions.filter((t) => t.view === 'compact' && t.tier === 'jump' &&
      t.role === 'step').map((t) => {
      const d = analysis.transitions.filter((x) => x.view === 'details' && x.to === t.to && x.role === 'step')[0];
      return d && d.tier !== 'jump' ? { position: t.to, compact: [t.before.total, t.after.total],
        details: [d.before.total, d.after.total] } : null;
    }).filter(Boolean);
    const flatOrLower = analysis.transitions.filter((t) => t.view === 'details' && t.tier === 'newPeak' && t.newHardest &&
      t.role === 'step' && t.change <= 0).map((t) => ({ to: t.to, before: t.before.total, after: t.after.total,
      change: t.change }));
    const entry = { request: { variantId: r[0], difficulty: r[1], seed: r[2] }, generationMs: generationMs,
      positions: analysis.moves.length, compactSteps: views.compact.steps.length,
      detailsSteps: views.details.steps.length, folds: folds, multiMoveJumps: multiMove,
      viewDependentJumps: viewDependent, newHardestFlatOrLower: flatOrLower };
    out.requests.push(entry);
    folds.filter((f) => f.key === 'replay.folded.reveal').forEach((f) => out.reveal.push(Object.assign(
      { request: entry.request }, f)));
  });
  out.firstReveal = out.reveal.length === 0 ? null : out.reveal[0];
  fs.writeFileSync(path.resolve(process.cwd(), jsonArg[1]), JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log('wrote ' + jsonArg[1] + ': ' + out.requests.length + ' requests, ' + out.reveal.length +
    ' reveal-fold step(s)' + (out.reveal.length ? ', first ' + JSON.stringify({ request: out.reveal[0].request,
      i: out.reveal[0].i, position: out.reveal[0].position, peak: out.reveal[0].peak, revealed: out.reveal[0].revealed }) : ''));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.stack || err));
  process.exitCode = 1;
}
