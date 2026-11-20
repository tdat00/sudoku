'use strict';

// MS08a scratch: the engine mutations of tech-fish.js that the skyscraper tests must detect (each one in memory only).
module.exports = [
  { name: 'a root may be a target',
    from: 'c !== roots[0] &&\r\n          c !== roots[1] &&', to: 'true &&' },
  { name: 'an X-Wing (two shared cover lines) counts as a skyscraper',
    from: 'if (shared !== 1) return null;', to: 'if (shared === 0) return null;' },
  { name: 'a target must see only one end',
    from: 'info.peerMark[c] === 1 && val[c] === 0', to: 'val[c] === 0' },
  { name: 'base lines need not be disjoint',
    from: 'if (info.disjoint[u] === 0) continue;', to: '' },
  { name: 'the parent budget is checked one unit early',
    from: 'run.work + 1 - run.checkedAt > WORK_CHECK_UNITS', to: 'run.work + 1 - run.checkedAt >= WORK_CHECK_UNITS' },
  { name: 'cancellation is swallowed like a spent budget',
    from: 'else if (!(err && err.code === \'budget.exceeded\')) throw err;',
    to: 'else if (!(err && (err.code === \'budget.exceeded\' || err.code === \'budget.cancelled\'))) throw err;' },
  { name: 'the work limit allows one unit more',
    from: 'if (run.work >= run.limit) throw WORK_CAP;', to: 'if (run.work > run.limit) throw WORK_CAP;' },
  { name: 'the ends are listed in line order, not sorted',
    from: 'ends: cellsToLabels(model, ends)', to: 'ends: cellsToLabels(model, [endA, endB])' },
  { name: 'a cover line without an owner is accepted',
    from: 'if (positions === 2 || coverOf[c] === -1) {', to: 'if (positions === 2) {' },
  { name: 'the shared line pair is taken from the wrong root',
    from: 'const endB = info.skyCell[b + 1 - rootB];', to: 'const endB = info.skyCell[b + rootB];' }
];
