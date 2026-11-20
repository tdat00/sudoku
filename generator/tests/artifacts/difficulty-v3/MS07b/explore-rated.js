'use strict';
// Scratch (MS07b): the canonical rating of every rated fixture under the registry with the four chain IDs,
// against its v3Expected record (the reclassifications of MS07b).
const SG = require('./load.js');
const H = SG.techHelper;
const D = SG.difficulty;
const m9 = H.model('classic9');
const rows = [];
SG.fixtures.rated.entries.forEach((entry) => {
  const givens = H.parsePuzzle(m9, entry.puzzle);
  const rating = D.rate(m9, givens, {});
  const level = rating.level;
  let req = null;
  try { req = level === null ? null : D.requiredOf(rating, level, m9); } catch (e) { req = 'err ' + e.message; }
  let ref = null;
  try { ref = level === null ? null : D.certifyFloor(m9, givens, level, SG.budget.create({})); } catch (e) { ref = 'err ' + e.message; }
  rows.push({
    name: entry.name, label: entry.label, v3Level: entry.v3Expected.level, v3Required: entry.v3Expected.required,
    level, score: rating.score, required: req, reference: ref && ref.required !== undefined ? ref.required : ref,
    changed: level !== entry.v3Expected.level || (req && req.required !== entry.v3Expected.required),
    counts: rating.techniqueCounts
  });
});
rows.forEach((r) => {
  if (r.changed || process.argv[2] === 'all') console.log(JSON.stringify(r));
});
console.log('entries', rows.length, 'changed', rows.filter((r) => r.changed).length);
