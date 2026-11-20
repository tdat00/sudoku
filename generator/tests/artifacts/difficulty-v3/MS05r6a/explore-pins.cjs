'use strict';

/*
 * MS05r6a, C: the data behind the coupled pins of the `steps`, `replay` and `player` suites, from a fresh complete
 * analysis of the 14 golden requests and of the guides' example (classic9 easy seed 3), on the final source. It reads
 * what the tests read (the same routes: the saved wire for G09-G13, `SG.pipeline.run` through `SG.store.toConfig` with
 * a 120,000 ms budget for the others, `SG.replay.analyse`, `SG.player.buildViews`, `SG.stepView.explain`,
 * `SG.player.describeStep`) and writes one JSON file. It generates puzzles: run it only through Run-Dv3Logged.ps1.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/explore-pins.cjs --json=<file.json>
 */
const fs = require('fs');
const path = require('path');
const { loadFixtures } = require('../../../replay-fixtures.js');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function sourceList() {
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(fs.readFileSync(path.join(ROOT, 'tests', 'node-runner.js'), 'utf8'));
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
}

function main(argv) {
  const jsonArg = argv.map((a) => /^--json=(.+)$/.exec(a)).filter(Boolean)[0];
  const loadOnly = argv.includes('--load-only');
  if (!jsonArg && !loadOnly) throw new Error('usage: --json=<file.json> | --load-only');
  const SG = loadFixtures(['tests/fixtures/tool-records.js', 'tests/fixtures/replay-goldens.js',
    'tests/fixtures/replay-wire.js']);
  loadFixtures(sourceList());
  const R = SG.replay;
  const V = SG.stepView;
  const P = SG.player;
  if (loadOnly) {
    const need = { replay: R && typeof R.analyse, stepView: V && typeof V.explain, player: P && typeof P.buildViews,
      describeStep: P && typeof P.describeStep, i18n: SG.i18n && typeof SG.i18n.setLocale,
      labeler: SG.i18n && typeof SG.i18n.setCellLabeler, goldens: SG.fixtures.replayGoldens.length,
      wire: Object.keys(SG.fixtures.replayWire).join(',') };
    console.log('load only (nothing generated): ' + JSON.stringify(need));
    return 0;
  }
  const out = { goldens: {}, example: null };
  const timings = {};

  function analyse(result) {
    return R.analyse(result);
  }

  function labelOf(model) {
    return (cell) => SG.model.cellLabel(model, cell);
  }

  function frameText(analysis, model, frame) {
    if (frame === null || frame === undefined) return null;
    if (frame.kind === 'cell') return labelOf(model)(frame.cell);
    const pair = analysis.signs[frame.sign];
    return 's' + frame.sign + '(' + labelOf(model)(pair[0]) + '<' + labelOf(model)(pair[1]) + ')';
  }

  function inEnglish(model, fn) {
    SG.i18n.setLocale('en');
    SG.i18n.setCellLabeler(labelOf(model));
    try {
      return fn();
    } finally {
      SG.i18n.setCellLabeler(null);
    }
  }

  SG.fixtures.replayGoldens.forEach((g) => {
    const started = Date.now();
    const result = SG.fixtures.replayWire[g.id] ? R.fromPlainWire(SG.fixtures.replayWire[g.id]) :
      SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
    const analysis = analyse(result);
    const views = P.buildViews(result, analysis);
    const model = result.model;
    const transitions = analysis.transitions.filter((t) => t.tier === 'jump' || t.tier === 'newPeak').map((t) => ({
      view: t.view, role: t.role, from: t.from, to: t.to, before: t.before.total, after: t.after.total,
      change: t.change, ratio: t.ratio, tier: t.tier, newHardest: t.newHardest, beforeHardest: t.before.hardest,
      afterHardest: t.after.hardest, cause: t.cause ? t.cause.class : null,
      frame: t.cause ? frameText(analysis, model, t.cause.frame) : null,
      k: t.cause && t.cause.k !== undefined ? t.cause.k : null, n: t.cause && t.cause.n !== undefined ? t.cause.n : null,
      step: null
    }));
    const compactSteps = views.compact.steps.map((step, i) => {
      const tr = step.table.transition;
      const entry = { i: i, position: step.position, kind: step.kind, score: step.table.score,
        change: step.table.change, tier: tr ? tr.tier : null, cause: tr && tr.cause ? tr.cause.class : null,
        parts: step.parts.map((p) => p.key + (p.args && p.args.peak !== undefined ? '(peak ' + p.args.peak + ')' : '')) };
      if (tr && tr.tier === 'jump') {
        entry.callout = inEnglish(model, () => V.explain(step.table, step).callout.sentences);
        entry.describe = inEnglish(model, () => P.describeStep(step));
      } else if (step.parts.length && /^replay\.folded/.test(step.parts[step.parts.length - 1].key)) {
        entry.describe = inEnglish(model, () => P.describeStep(step));
      }
      return entry;
    });
    const detailsSteps = views.details.steps.map((step, i) => {
      const tr = step.table.transition;
      return { i: i, position: step.position, score: step.table.score, tier: tr ? tr.tier : null,
        folded: step.parts.some((p) => /^replay\.folded/.test(p.key)) };
    });
    // The end positions that are a jump in the compact view and not in the details view.
    const sameEnd = analysis.transitions.filter((t) => t.view === 'compact' && t.tier === 'jump' && t.role === 'step')
      .map((t) => {
        const d = analysis.transitions.filter((x) => x.view === 'details' && x.to === t.to && x.role === 'step')[0];
        return { position: t.to, compact: [t.before.total, t.after.total], details: d ? [d.before.total, d.after.total,
          d.change, d.tier] : null };
      });
    const framed = { compact: 0, details: 0, jumps: { compact: 0, details: 0 } };
    ['compact', 'details'].forEach((name) => {
      views[name].steps.forEach((step) => {
        const tr = step.table.transition;
        if (tr && tr.tier === 'jump') {
          framed.jumps[name]++;
          if (tr.cause && tr.cause.frame) framed[name]++;
        }
      });
    });
    out.goldens[g.id] = { request: g.request, positions: analysis.moves.length, compactSteps: compactSteps,
      detailsCount: views.details.steps.length, detailsSteps: g.id === 'G06' || g.id === 'G07' ? detailsSteps : undefined,
      transitions: transitions, sameEnd: sameEnd, framed: framed };
    timings[g.id] = Date.now() - started;
  });

  const example = SG.pipeline.run({ variantId: 'classic9', difficulty: 'easy', seed: 3, trace: 'off' }, null);
  const exampleViews = P.buildViews(example, analyse(example));
  out.example = {
    compactScores: exampleViews.compact.steps.map((s) => s.table.score),
    compactKinds: exampleViews.compact.steps.map((s) => s.kind),
    detailsCount: exampleViews.details.steps.length,
    lastClues: exampleViews.compact.steps[exampleViews.compact.steps.length - 1].args.clues,
    compactChanges: exampleViews.compact.steps.map((s) => s.table.change)
  };
  out.timingsMs = timings;
  fs.writeFileSync(path.resolve(process.cwd(), jsonArg[1]), JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log('wrote ' + jsonArg[1] + ' (' + Object.keys(out.goldens).length + ' goldens and the example)');
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.stack || err));
  process.exitCode = 1;
}
