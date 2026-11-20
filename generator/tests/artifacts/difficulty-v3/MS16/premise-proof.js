'use strict';
// Scratch (MS16): the proof that re-pointing the registry-position fixtures to the list that includes sueDeCoq keeps their positions.
// For every fixture and supplement whose explicit `after` list now contains sueDeCoq (forcingChainLong, nishio, nishioDeep and the
// sueDeCoq negative that names THROUGH_SDC), the position stuck after the list without sueDeCoq (the list of 8b26e83) and after the
// list with it must be the same candidates and values, and sueDeCoq must find nothing there. Read-only: no generation, no corpus.
const crypto = require('crypto');
const SG = require('./load.js');
const H = SG.techHelper;
const F = SG.fixtures.techniques;
const model = H.model('classic9');
const digest = (state) => crypto.createHash('sha256').update(Buffer.from(state.candidates.buffer, state.candidates.byteOffset, state.candidates.byteLength))
  .update(Buffer.from(state.value.buffer, state.value.byteOffset, state.value.byteLength)).digest('hex').slice(0, 16);
let checked = 0;
let different = 0;
let fires = 0;
function check(where, fixture) {
  if (!fixture.after || fixture.after.indexOf('sueDeCoq') === -1) return;
  const oldList = fixture.after.filter((id) => id !== 'sueDeCoq');
  const a = H.stateAfter(model, fixture.puzzle, oldList);
  const b = H.stateAfter(model, fixture.puzzle, fixture.after);
  const same = digest(a) === digest(b);
  const sdc = SG.alsPatterns.findSueDeCoq(model, a, SG.techniques.createContext(model, {})) !== null;
  checked++;
  if (!same) different++;
  if (sdc) fires++;
  console.log(where + ' | ' + fixture.name.slice(0, 70) + ' | old ' + oldList.length + ' ids, new ' + fixture.after.length + ' ids | ' + digest(a) + ' ' +
    digest(b) + ' ' + (same ? 'same' : 'DIFFERENT') + ' | sueDeCoq on the old position: ' + (sdc ? 'FIRES' : 'null'));
}
Object.keys(F.byId).forEach((id) => {
  ['positive', 'negative'].forEach((kind) => (F.byId[id][kind] || []).forEach((fx) => check(id + ' ' + kind, fx)));
});
Object.keys(F.supplements).forEach((id) => F.supplements[id].forEach((fx) => check(id + ' supplement', fx)));
console.log('fixtures whose list contains sueDeCoq: ' + checked + ', different positions: ' + different + ', sueDeCoq firing on the old position: ' + fires);
process.exitCode = different === 0 && fires === 0 ? 0 : 1;
