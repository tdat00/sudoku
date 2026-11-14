'use strict';

/*
 * MS06c2 scratch (pins of the replay suites): loads the engine sources, the golden fixtures and prints the facts the
 * pins of `replay.test.js`, `steps.test.js` and `replay-recorders.test.js` state about the goldens, so that they can be
 * re-derived from the refreshed fixtures. Reads only; it generates the live goldens (G01-G08, G14) like the suite.
 *
 *   node tests/artifacts/difficulty-v3/MS06c2/probe-goldens.cjs [G01,G04]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
for (const rel of (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1))) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
}
for (const f of ['tests/fixtures/replay-goldens.js', 'tests/fixtures/replay-wire.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}
const SG = globalThis.SG;
const R = SG.replay;
const ids = (process.argv[2] || 'G01').split(',');

for (const id of ids) {
  const g = SG.fixtures.replayGoldens.filter((x) => x.id === id)[0];
  const result = SG.fixtures.replayWire[id] ? R.fromPlainWire(SG.fixtures.replayWire[id])
    : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  const mm = R.moves(result);
  const kinds = mm.moves.map((m) => m.kind);
  const runs = [];
  kinds.forEach((k) => {
    if (runs.length && runs[runs.length - 1][0] === k) runs[runs.length - 1][1]++;
    else runs.push([k, 1]);
  });
  console.log('== ' + id + ' ' + JSON.stringify(g.request) + ' score ' + result.rating.score + ' ' + result.rating.level +
    ' log ' + result.digLog.length + ' target ' + result.target);
  console.log('moves ' + mm.moves.length + ' runs ' + JSON.stringify(runs));
  let cells = 0;
  mm.moves.forEach((m) => { if (m.kind === 'random') cells += m.removed.length; });
  console.log('random cells removed ' + cells);
  mm.moves.forEach((m, i) => {
    if (m.kind === 'guided' || m.kind === 'exchange' || m.kind === 'searchAdd' || m.kind === 'searchRemove') {
      if (i < 60) console.log('  move ' + i + ' ' + m.kind + ' at ' + m.at + ' span ' + JSON.stringify(m.span ? {
        rated: m.span.rated, refused: m.span.refused, chosen: m.span.chosen, others: m.span.others, nulls: m.span.nulls,
        max: m.span.max } : null));
    }
  });
  const a = R.analyse(result);
  console.log('stats ' + JSON.stringify(Object.assign({}, a.stats, { checks: '-' })) + ' compact ' +
    a.views.compact.steps.length + ' details ' + a.views.details.steps.length + ' transitions ' + a.transitions.length);
  console.log('compact scores ' + JSON.stringify(a.views.compact.steps.map((s) => a.ratings[s.position].score)) +
    ' positions ' + JSON.stringify(a.views.compact.steps.map((s) => s.position)));
  console.log('compact audit ' + JSON.stringify(a.views.compact.audit.map((e) => ({ scope: e.scope, ins: e.inserted.length,
    rem: !!e.remaining }))));
  console.log('tiers ' + JSON.stringify(a.views.compact.steps.map((s) => (s.transition === null ? null : a.transitions[s.transition].tier))));
  console.log('golden rows ' + JSON.stringify(g.rows).slice(0, 400));
  console.log('golden jumps ' + JSON.stringify(g.jumps.map((j) => [j.step, j.from, j.to])) + ' counts ' + JSON.stringify(g.counts));
  if (process.argv[3] === 'explain') {
    const steps = R.prepare(result);
    const calls = { solve: 0, count: 0 };
    const solve = SG.logicalSolver.solve;
    const counter = SG.dfs.countSolutions;
    for (let i = 0; i < a.moves.length; i++) steps.next();
    SG.logicalSolver.solve = function () { calls.solve++; return solve.apply(this, arguments); };
    SG.dfs.countSolutions = function () { calls.count++; return counter.apply(this, arguments); };
    let next;
    do { next = steps.next(); } while (!next.done);
    SG.logicalSolver.solve = solve;
    SG.dfs.countSolutions = counter;
    const full = next.value;
    const label = (c) => SG.model.cellLabel(result.model, c);
    console.log('explain calls ' + JSON.stringify(calls));
    full.views.compact.steps.forEach((s, k) => {
      if (s.transition === null) return;
      const t = full.transitions[s.transition];
      if (t.tier !== 'jump') return;
      const mv = full.moves[t.to];
      console.log('  compact jump k=' + k + ' ' + t.from + '>' + t.to + ' totals ' + t.before.total + '>' + t.after.total +
        ' levels ' + t.before.level + '>' + t.after.level + ' ratio ' + t.ratio + ' newHardest ' + t.newHardest + ' change ' + t.change);
      console.log('    cause ' + JSON.stringify({ class: t.cause.class, culprit: t.cause.culprit && { cell: label(t.cause.culprit.cell),
        action: t.cause.culprit.action, score: t.cause.culprit.score, otherScore: t.cause.culprit.otherScore },
      singles: t.cause.singles.map((x) => [x.action, label(x.cell), x.score]), changes: t.cause.changes.map((x) => x.action + ':' + label(x.cell)),
      largest: t.cause.largest, frame: t.cause.frame, k: t.cause.k, n: t.cause.n }));
      console.log('    choice ' + JSON.stringify(t.choice));
      const pr = full.proofs[t.to];
      console.log('    proof ' + JSON.stringify({ restricted: pr.restricted, k: pr.firstUse.k, n: pr.firstUse.n, tech: pr.firstUse.technique,
        key: pr.firstUse.i18nKey, args: pr.firstUse.i18nArgs, placements: pr.firstUse.placements.length }));
      console.log('    move removed ' + JSON.stringify(mv.removed.map(label)) + ' restored ' + JSON.stringify(mv.restored.map(label)));
    });
  }
}
