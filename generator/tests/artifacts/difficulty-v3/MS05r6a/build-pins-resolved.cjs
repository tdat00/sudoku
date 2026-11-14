'use strict';

/*
 * MS05r6a, C: writes evidence/MS05r6a/pins/resolved.json: every entry of the reviewed r4 pin manifest and every coupled
 * golden pin, each with its original request and requirement, the exact before and after, the reason and the focused
 * verification read from its own --exact result file (a zero-test or failed selection is an error here).
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/build-pins-resolved.cjs
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence';

function json(rel) {
  return JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));
}

function verification(file) {
  const r = json(EV + '/MS05r6a/pins/exact/' + file);
  if (r.selection.count !== 1 || r.results.total !== 1 || r.results.passed !== 1 || r.results.failed !== 0 ||
    r.results.skipped !== 0 || r.complete !== true) {
    throw new Error(file + ': the exact selection is not one passed test');
  }
  const t = r.results.tests[0];
  return { results: EV + '/MS05r6a/pins/exact/' + file, quickFingerprint: r.sourceHash, status: t.status, ms: t.ms,
    fullName: t.fullName };
}

const T = 'generator/tests/suites/';
const pins = [
  {
    id: 'P01', file: T + 'steps.test.js', suite: 'steps', ordinal: 17, result: 'steps-17.json',
    oldName: 'steps > stepView: the tiers, the badge and the lines > marks 12 compact and 15 details jumps over the 14 ' +
      'goldens, and one first rated puzzle per view',
    request: 'the 14 golden requests G01-G14 (G09-G13 from the saved wire, the others generated); requirement: every ' +
      'jump of both views has a badge, a callout and a ratio, and one first rated puzzle per view',
    before: '{ compact: 12, details: 15 }', after: '{ compact: 13, details: 16 }',
    reason: 'G07 (jigsaw9 Nightmare 3962167687) is now a required puzzle with two jumps (47 to 511 at move 26, 511 to 1582 ' +
      'at move 27) where the shallow one had one (46 to 252); G06 keeps one jump (106 to 1697) and every other golden is ' +
      'unchanged: compact 12 + 1, details 15 + 1. Title and number only; every other assertion of the test is unchanged',
    class: 'data pin (count)', coverage: 'kept'
  },
  {
    id: 'P02', file: T + 'steps.test.js', suite: 'steps', ordinal: 22, result: 'steps-22.json',
    oldName: 'steps > stepView: the callout of a score jump > names the cause of a move per class, on the goldens',
    request: 'goldens G03, G05, G07, G11, G13; requirement: the third sentence of the callout of each class of cause',
    before: "third('G07', 24).sentences[2] = 'Removing the clue at R1C4 alone gives 136, versus 252 for the whole symmetric " +
      "group, which is always displayed as one complete change.' (class `mixed`)",
    after: "third('G09', 37).sentences[2] = 'Removing the clue at R3C5 alone gives 524, versus 562 for the whole symmetric " +
      "group, which is always displayed as one complete change.' (class `mixed`)",
    reason: 'the new G07 jumps are single-culprit (R9C4, R6C3), so the `mixed` specimen of the old G07 no longer exists; ' +
      'the same sentence variant is preserved against G09 (Killer Expert, saved wire), the only golden with a `mixed` ' +
      'jump (compact step 8, position 37, 165 to 562). G03, G05, G11 and G13 specimens are unchanged',
    class: 'data pin (specimen moved to an existing golden)', coverage: 'kept: the class and its sentence stay asserted'
  },
  {
    id: 'P03', file: T + 'steps.test.js', suite: 'steps', ordinal: 23, result: 'steps-23.json',
    oldName: 'steps > stepView: the callout of a score jump > a jump over several moves says in which complete change the ' +
      'new technique first appears',
    request: 'goldens G06, G11, G12 (compact positions 31, 111, 103); requirement: a multi-move jump names the complete ' +
      'change in which the new technique first appears',
    before: "[['G06', 31, 'compact'], ['G11', 111, 'compact'], ['G12', 103, 'compact']]",
    after: "[['G11', 111, 'compact'], ['G12', 103, 'compact']]",
    reason: 'the new G06 jump (106 to 1697 by the clue R8C4) is a single-culprit jump, not a multi-move one; the only ' +
      'multi-move jumps among the 14 goldens are G11 and G12, which stay',
    class: 'data pin (specimen absent from the changed golden)',
    coverage: 'reduced from 3 specimens to 2 (no other existing fixed example has a multi-move jump: the steps and replay suites have no fixed results other than the goldens); the assertion itself is unchanged'
  },
  {
    id: 'P04', file: T + 'replay.test.js', suite: 'replay', ordinal: 90, result: 'replay-90.json',
    oldName: 'replay > replay: golden compact view and transitions > has the same end position as a jump in one view and ' +
      'not in the other (G06, G11, G12, G01)',
    request: 'goldens G06, G11, G12, G01; requirement: the same end position can be a jump in the compact view and not in ' +
      'the details view, with the signed change of the details transition',
    before: "rows G06 (31, [138, 1678], [2967, 1678]), G11, G12; toPosition(G06, 'details', 31).change = -1289",
    after: "rows G11 (111, [119, 957], [962, 957]), G12 (103, [130, 638], [642, 638]); details change G11 = -5, G12 = -4",
    reason: 'in the new G06 the jump at move 27 (106 to 1697) is a jump in both views, so the old specimen is gone; the ' +
      'signed-change assertion moves to the two goldens that still have the branch (962 to 957 and 642 to 638)',
    class: 'data pin (specimen absent from the changed golden)',
    coverage: 'reduced from 3 specimens to 2 (the steps and replay suites have no fixed results other than the goldens); the signed change is now asserted for both remaining ones'
  },
  {
    id: 'P05', file: T + 'replay.test.js', suite: 'replay', ordinal: 91, result: 'replay-91.json',
    oldName: 'replay > replay: golden compact view and transitions > has 12 compact, 15 details and 18 distinct jump ' +
      'transitions in the 14 goldens',
    request: 'the 14 goldens; requirement: the exact number of jump transitions per view and of distinct ones',
    before: '{ compact: 12, details: 15 } and 18 distinct', after: '{ compact: 13, details: 16 } and 18 distinct',
    reason: 'as P01; the distinct count stays 18 (the two new G07 jumps are shared by both views and replace the three ' +
      'distinct transitions of the old G06 and G07 data)',
    class: 'data pin (count)', coverage: 'kept'
  },
  {
    id: 'P06', file: T + 'replay.test.js', suite: 'replay', ordinal: 92, result: 'replay-92.json',
    oldName: 'replay > replay: golden compact view and transitions > labels a new hardest technique also at a flat or ' +
      'lower score (details: G13, G11, G07)',
    request: 'goldens G13, G11, G07 (details positions 101, 104, 31); requirement: a new hardest technique is labelled ' +
      'also when the score stays or falls',
    before: "rows G13 (101, 70 to 70), G11 (104, 1967 to 1264), G07 (31, 2515 to 1938, forcingChain over nishio)",
    after: "rows G13 (101, 70 to 70) and G11 (104, 1967 to 1264)",
    reason: 'the new G07 has no new-hardest transition at a flat or lower score (its last one is 1902 to 2340); across the ' +
      '14 goldens only G13 (flat) and G11 (fall) have one',
    class: 'data pin (specimen absent from the changed golden)',
    coverage: 'reduced from 3 specimens to 2 (one flat, one fall); no other existing fixed example has the branch: the steps and replay suites have no fixed results other than the goldens'
  },
  {
    id: 'P07', file: T + 'replay.test.js', suite: 'replay', ordinal: 143, result: 'replay-143.json',
    oldName: 'replay > replay: explaining the jumps > has a cause, a choice and a proof for every jump of the goldens: 12 ' +
      'compact and 15 details',
    request: 'the 14 goldens; requirement: every jump has a cause, a choice and a proof; the count per view',
    before: '{ compact: 12, details: 15 }', after: '{ compact: 13, details: 16 }',
    reason: 'as P01 (the explained jumps of the same goldens)', class: 'data pin (count)', coverage: 'kept'
  },
  {
    id: 'P08', file: T + 'replay.test.js', suite: 'replay', ordinal: 144, result: 'replay-144.json',
    oldName: 'replay > replay: explaining the jumps > frames the details jumps too: G06 R4C6 and the four sign jumps of G11',
    request: 'golden G06 and the four sign jumps of G11; requirement: a jump of the details view has a cause, a frame and ' +
      'the single scores',
    before: "G06 details position 29: [138, 1778, 'single-culprit'], frame R4C6, culprit.otherScore 138",
    after: "G06 details position 27: [106, 1697, 'single-culprit'], frame R8C4, culprit.otherScore 107",
    reason: 'the new G06 is a different puzzle (a required one); its single details jump is the one of P03 (R8C4 alone gives ' +
      '1,697, R2C6 alone gives 107). The G11 sign jumps are unchanged',
    class: 'data pin (exact datum re-derived)', coverage: 'kept'
  },
  {
    id: 'P09', file: T + 'replay.test.js', suite: 'replay', ordinal: 145, result: 'replay-145.json',
    oldName: 'replay > replay: explaining the jumps > describes a jump over several moves by its first move with the new ' +
      'technique (G06, G11, G12)',
    request: 'goldens G06, G11, G12 (compact steps 5, 4, 4); requirement: a multi-move jump is described by the first move ' +
      'that has the new technique',
    before: "[['G06', 5], ['G11', 4], ['G12', 4]]", after: "[['G11', 4], ['G12', 4]]",
    reason: 'as P03: the new G06 has no multi-move jump (compact step 5 is a new peak without a cause)',
    class: 'data pin (specimen absent from the changed golden)',
    coverage: 'reduced from 3 specimens to 2 (the steps and replay suites have no fixed results other than the goldens)'
  },
  {
    id: 'P10', file: T + 'replay.test.js', suite: 'replay', ordinal: null, result: null,
    oldName: 'replay > replay: explaining the jumps (the table UNRECORDED, used by the per-golden choice tests)',
    request: 'goldens G05, G06, G11, G12; requirement: a jump without recorded candidates has the stated kind',
    before: "UNRECORDED = { 'G05:5': 'checked', 'G06:6': 'combined', 'G11:5': 'combined', 'G12:5': 'combined' }",
    after: "UNRECORDED = { 'G05:5': 'checked', 'G11:5': 'combined', 'G12:5': 'combined' }",
    reason: 'a table keyed by golden and step: the new G06 has no jump at step 6 (its one jump, step 5, has recorded ' +
      'candidates), so the entry was unused; no test failed on it. The per-golden choice tests (all 14) pass in the ' +
      'complete run of the suite',
    class: 'stale data entry removed (no behaviour asserted by it any more)', coverage: 'kept for the goldens that have such a jump'
  },
  {
    id: 'P11', file: T + 'player.test.js', suite: 'player', ordinal: 29, result: 'player-29.json',
    oldName: 'player > player: texts of the steps > the example of the guides: Classic 9x9 easy, seed 3, replays in 7 steps ' +
      '(26 with every move shown)',
    request: 'classic9 easy seed 3 (trace off); requirement: the example the developer guides and design.md state (7 compact ' +
      'steps, 26 with every move shown, the finished puzzle with 34 clues)',
    before: 'scores [0, 14, 24, 34, 44, 46, 46]; kinds [solution, random x4, guided, final]',
    after: 'scores [0, 15, 26, 44, 46, 100, 100]; kinds [solution, random x3, guided x2, final]; 26 details steps and 34 clues unchanged',
    reason: 'the puzzle of classic9/easy#3 is the improved (exact, required) one since MS05b1: its regression hash is one ' +
      'of the 149 that b1 changed, kept at the final source. The guides and generator/design.md state the example: ' +
      'DEVELOPERGUIDE.md and .vn.md and generator/design.md 7.5 now say three random steps (15, 26, 44) and two guided ' +
      'steps (46, 100)',
    class: 'data pin (guide example)', coverage: 'kept'
  },
  {
    id: 'P12', file: T + 'player.test.js', suite: 'player', ordinal: 30, result: 'player-30.json',
    oldName: 'player > player: texts of the steps > tells what a compact step folds: the inner peak (above the level with ' +
      'clues restored, or plain) and nothing for a step that folds nothing',
    request: 'goldens G06, G07, G11, G12; requirement: a compact step that folds says the inner peak, with the clues ' +
      'restored when the peak was above the level',
    before: "reveal steps G06[5], G07[7], G11[2]; G06[5] peak 2967 ('the score reached 2,967')",
    after: "reveal step G11[2] only; its peak 1967 ('the score reached 1,967'); G12[2] plain peak 130 and the no-fold " +
      "checks of G06 (steps 0-3 and every details step) unchanged",
    reason: 'the new G06 and G07 have no step that folds a refinement peak (their compact steps are single guided moves ' +
      'or one exchange); across the 14 goldens only G11 (reveal) and G12 (plain) fold',
    class: 'data pin (specimen absent from the changed golden)',
    coverage: 'reduced: the reveal branch has 1 specimen (G11) instead of 3; the exact peak assertion moved from G06 to ' +
      'G11. Searched scope (IR11, pins/explore-player-fixed.json, command e1): the 14 goldens, the guides example and the ' +
      'player suite 11 other fixed real results (classic9 normal 3, veryEasy 1, nightmare 5; classic4 veryEasy 2; killer ' +
      'easy 1, normal 2; greaterThan normal 4; jigsaw9 easy 6; wordoku easy 1; mega12 easy 2; mega16 veryEasy 1): none ' +
      'carries a replay.folded.reveal step (greaterThan normal 4 has three plain folds, peaks 127, 149 and 287). The ' +
      'single specimen is the named coverage item MS05r6a-COV01 for MS18e'
  },
  {
    id: 'P13', file: T + 'player.test.js', suite: 'player', ordinal: 41, result: 'player-41.json',
    oldName: 'player > player: the frame of the one clue or sign that causes a score jump > frames exactly the jumps that one ' +
      'clue or one sign causes (the 14 goldens, both views)',
    request: 'the 14 goldens, both views; requirement: exactly the jumps with one culprit are framed',
    before: 'jumps = 27', after: 'jumps = 29 (compact 13 + details 16); 21 framed (more than 8, fewer than the jumps) unchanged',
    reason: 'as P01: two more jumps over the 14 goldens (G07)', class: 'data pin (count)', coverage: 'kept'
  }
];

function main() {
  const manifest = json(EV + '/MS05r4/default-pin-manifest.json');
  const explore = json(EV + '/MS05r6a/pins/explore.json');
  const perGolden = {};
  Object.keys(explore.goldens).forEach((id) => {
    const g = explore.goldens[id];
    perGolden[id] = { compactJumps: g.framed.jumps.compact, detailsJumps: g.framed.jumps.details,
      framedCompact: g.framed.compact, framedDetails: g.framed.details };
  });
  const entries = pins.map((p) => Object.assign({}, p, { verification: p.result ? verification(p.result) : {
    results: EV + '/MS05r6a/pins/replay-run2.json', note: 'a data table, covered by the complete passed run of the replay suite' } }));
  entries.forEach((e) => { delete e.result; });
  const run2 = ['steps', 'replay', 'player'].map((s) => {
    const r = json(EV + '/MS05r6a/pins/' + s + '-run2.json');
    return { suite: s, results: EV + '/MS05r6a/pins/' + s + '-run2.json', total: r.results.total, passed: r.results.passed,
      failed: r.results.failed, skipped: r.results.skipped, complete: r.complete, quickFingerprint: r.sourceHash };
  });
  const run1 = ['steps', 'replay', 'player'].map((s) => {
    const r = json(EV + '/MS05r6a/pins/' + s + '-run1.json');
    return { suite: s, results: EV + '/MS05r6a/pins/' + s + '-run1.json', total: r.results.total, passed: r.results.passed,
      failed: r.results.failed, failedTests: r.results.tests.filter((t) => t.status === 'fail').map((t) => t.ordinal) };
  });
  const branch = json(EV + '/MS05r6a/pins/g13-branch.json');
  const search = json(EV + '/MS05r6a/pins/explore-player-fixed.json');
  if (search.requests.length !== 11 || search.reveal.length !== 0) throw new Error('the IR11 search is not 11 requests without a reveal fold');
  const doc = {
    schema: 1, kind: 'pins-resolved', task: 'MS05r6a',
    ownedFiles: ['generator/tests/suites/steps.test.js', 'generator/tests/suites/replay.test.js',
      'generator/tests/suites/player.test.js', 'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md', 'generator/design.md'],
    r4Manifest: { path: EV + '/MS05r4/default-pin-manifest.json', selectedDefault: manifest.selectedDefault,
      pins: manifest.pins, returnedPremises: manifest.returnedPremises, blockers: manifest.blockers.map((b) => b.id),
      reconciliation: 'pins [] and returnedPremises []: no r4 entry to repair; the two blockers are the original-limit ' +
        'mega preflights, answered by S-OD3/S-OD4 and not pins (MS05r5m, MS05b3)' },
    g13G14: 'the recorded G13 and G14 requests name no attempts and regenerate at 2 attempts; their analysis goldens are ' +
      'unchanged (the published G13 and G14 records match the earlier ones field for field), so no G13 or G14 pin changed',
    firstRunBeforeThePins: run1, entries: entries, completeRunAfterThePins: run2,
    newTests: { g13SavedWireBranch: { results: EV + '/MS05r6a/pins/g13-branch.json', total: branch.results.total,
      passed: branch.results.passed, suites: ['steps', 'replay', 'player'], exactResults: ['steps-0.json', 'replay-25.json',
        'player-0.json'].map((f) => EV + '/MS05r6a/pins/exact/' + f) } },
    jumpsPerGolden: perGolden,
    ir11Search: { results: EV + '/MS05r6a/pins/explore-player-fixed.json', command: 'e1-explore-player-fixed (one locked command)',
      requests: search.requests.map((r) => ({ request: r.request, positions: r.positions, compactSteps: r.compactSteps,
        folds: r.folds.map((f) => ({ i: f.i, position: f.position, key: f.key, peak: f.peak, revealed: f.revealed })),
        multiMoveJumps: r.multiMoveJumps.length, viewDependentJumps: r.viewDependentJumps.length,
        newHardestFlatOrLower: r.newHardestFlatOrLower.length })),
      revealFoldSteps: search.reveal.length },
    coverageItems: [{ id: 'MS05r6a-COV01', owner: 'MS18e',
      branch: 'a compact step that folds a refinement peak above the chosen level with clues restored (replay.folded.reveal)',
      specimen: 'G11 compact step 2 (position 108, peak 1,967, 10 clues restored): the only one of the 14 goldens, the guides' +
        ' example and the 11 other fixed player results',
      risk: 'if G11 changes, the test fails loudly (the row and its peak are asserted by name), and no second specimen exists',
      option: 'a synthetic, non-generating test of the fold rendering would protect the branch independently of the goldens; ' +
        'not part of MS05r6a (no new golden, wire or request)' }],
    unresolved: []
  };
  fs.writeFileSync(path.join(REPO, EV, 'MS05r6a', 'pins', 'resolved.json'), JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log('resolved: ' + entries.length + ' entries, ' + run2.map((r) => r.suite + ' ' + r.passed + '/' + r.total).join(', '));
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(String(err && err.stack || err));
  process.exitCode = 1;
}
