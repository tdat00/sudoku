'use strict';

// MS07c scratch: the canonical rating, level and requiredness of the rated fixtures at the selected cutoff C, and at C = 6
// for comparison (read-only; the three constructed Nightmare puzzles and every other rated entry).
const SG = globalThis.SG;
const D = SG.difficulty;
const model = SG.variants.get('classic9').build({}, SG.rng.create(1));
const entries = SG.fixtures.rated.entries;

function describeAt(c) {
  const before = SG.chainSearch.SHORT_MAX;
  SG.chainSearch.SHORT_MAX = c;
  try {
    return entries.map((entry) => {
      const givens = new Int32Array(81);
      for (let i = 0; i < 81; i++) givens[i] = entry.puzzle[i] === '.' ? 0 : Number(entry.puzzle[i]);
      const rating = D.rate(model, givens);
      const label = D.requiredOf(rating, entry.label, model);
      const own = rating.solved ? D.requiredOf(rating, rating.level, model) : null;
      const counts = Object.keys(rating.techniqueCounts).filter((id) => /forcingChain|nishio/.test(id))
        .map((id) => id + '=' + rating.techniqueCounts[id]).join(',');
      return { name: entry.name, label: entry.label, level: rating.level, score: rating.score,
        requiredAtLabel: label.required, requiredAtLevel: own && own.required, counts: counts, expected: entry.v3Expected };
    });
  } finally {
    SG.chainSearch.SHORT_MAX = before;
  }
}

const now = describeAt(SG.chainSearch.SHORT_MAX);
const old = describeAt(6);
now.forEach((r, i) => {
  const o = old[i];
  const same = o.level === r.level && o.requiredAtLabel === r.requiredAtLabel && o.requiredAtLevel === r.requiredAtLevel;
  console.log((same ? '  ' : '* ') + r.name + ' label ' + r.label + ': C=' + SG.chainSearch.SHORT_MAX + ' level ' + r.level +
    ' score ' + r.score + ' reqLabel ' + r.requiredAtLabel + ' reqLevel ' + r.requiredAtLevel + ' [' + r.counts + '] expected ' +
    JSON.stringify(r.expected) + (same ? '' : ' | C=6 level ' + o.level + ' score ' + o.score + ' reqLabel ' +
    o.requiredAtLabel + ' reqLevel ' + o.requiredAtLevel + ' [' + o.counts + ']'));
});
