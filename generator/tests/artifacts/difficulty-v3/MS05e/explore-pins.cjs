'use strict';

// MS05e scratch: what the refreshed G11 / G12 analyses look like, to re-derive the pins of the replay and steps suites
// that are tied to them. Reads the published fixtures, generates nothing (the analysis rates saved boards). Run it only
// under the lock (the analysis of G11 is a few seconds). Writes the JSON given as the only argument (project-relative).
const fs = require('fs');
const path = require('path');
const { loadFixtures, nodeEnv } = require('../../../replay-fixtures.js');

nodeEnv().engine();
loadFixtures(['tests/fixtures/replay-goldens.js', 'tests/fixtures/replay-wire.js']);
const SG = globalThis.SG;
const R = SG.replay;
const out = {};

function trimTransition(t) {
  return {
    view: t.view, from: t.from, to: t.to, tier: t.tier, role: t.role, before: t.before.total, after: t.after.total,
    change: t.change, ratio: t.ratio, newHardest: t.newHardest, hardestAfter: t.after.hardest,
    hardestBefore: t.before.hardest, folded: t.folded || null,
    cause: t.cause ? { class: t.cause.class, frame: t.cause.frame, k: t.cause.k, n: t.cause.n, kMove: t.cause.kMove,
      sign: t.cause.sign } : null,
    choice: t.choice ? t.choice.kind : null
  };
}

['G11', 'G12'].forEach((id) => {
  const res = R.fromPlainWire(SG.fixtures.replayWire[id]);
  const analysis = R.analyse(res);
  const views = SG.player.buildViews(res, analysis);
  const entry = { moves: analysis.moves.length, transitions: analysis.transitions.map(trimTransition) };
  entry.steps = {};
  ['compact', 'details'].forEach((name) => {
    entry.steps[name] = views[name].steps.map((s, index) => {
      const t = s.table.transition;
      return {
        index: index, position: s.position, first: s.first, last: s.last, transition: t ? t.tier : null,
        before: t ? t.before.total : null, after: t ? t.after.total : null,
        parts: (s.parts || []).map((p) => ({ key: p.key, args: p.args && p.args.peak !== undefined ? p.args : undefined }))
      };
    });
  });
  // the sentences of every jump step, as the panel writes them in English
  SG.i18n.setLocale('en');
  SG.i18n.setCellLabeler((c) => SG.model.cellLabel(res.model, c));
  entry.sentences = {};
  ['compact', 'details'].forEach((name) => {
    views[name].steps.forEach((s) => {
      const text = SG.stepView.explain(s.table, s);
      if (text.callout) entry.sentences[name + ':' + s.position] = text.callout.sentences;
      else if (s.table.transition && s.table.transition.newHardest) {
        entry.sentences[name + ':' + s.position + ':line'] = [text.total, text.line, text.rowLabel && text.rowLabel.technique];
      }
    });
  });
  SG.i18n.setCellLabeler(null);
  out[id] = entry;
});

const target = path.resolve(process.cwd(), process.argv[2]);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log('written ' + process.argv[2]);
