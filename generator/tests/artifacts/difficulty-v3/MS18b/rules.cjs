'use strict';

/*
 * MS18b task-owned, PURE (no I/O) selection rules of the two fixed experiments, applied literally to the raw
 * rows of the merged cells. The rows are those of `SG.fixtures.difficultyDiagnostics.mergeShards` (twelve
 * requests, indexes 0..11 once); nothing here reads a shard summary, a median of shard medians or a
 * millisecond.
 *
 * R5 (the owner's rule, unchanged): "Choose the smallest finite cap with no exact-hit loss in any cell
 * against no extra cap and a strict reduction in median full ratings in at least one cell. Otherwise choose
 * no extra cap." Literally: for each finite cap, every cell's exact count must be >= none's count, and at
 * least one cell's upper median of `row.fullRatings` (all twelve requests and all attempts, sorted index 6)
 * must be strictly smaller than none's. The smallest eligible finite cap wins; if no finite cap qualifies on
 * complete valid evidence, the winner is `none`. Cells in which none and the cap both have zero exact hits
 * have no hit-count loss. Incomplete evidence is "undetermined", never the measured winner `none`.
 *
 * C (R9): the exact hits over the three twelve-request cells are summed per cutoff; more wins and C = 6
 * wins a tie (including 0 against 0). Per-variant counts stay visible. Incomplete evidence is
 * "undetermined".
 *
 * Hits are `row.generationExact === true`; an error row is a miss with its work when known; a request whose
 * work is not known has no median (work is unavailable, never zero).
 */
const FINITE_CAPS = ['64', '128', '256'];
const IN_FORCE = { R5: '256', C: '4' };

const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/** The upper median: the value at sorted index floor(n / 2) (index 6 of 12). */
function upperMedian(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const sum = (list) => list.reduce((a, b) => a + b, 0);

/** Counts of how the local searches of one request ended, from its `work` list (null when unknown). */
function endsOf(row) {
  if (!Array.isArray(row.work)) return null;
  const ends = { searches: 0, shallow: 0, proposals: 0, ratings: 0, natural: 0 };
  row.work.forEach((attempt) => {
    (attempt.localSearches || []).forEach((ls) => {
      ends.searches++;
      if (ls.capHit === 'shallow') ends.shallow++;
      else if (ls.capHit === 'proposals') ends.proposals++;
      else if (ls.capHit === 'ratings') ends.ratings++;
      else ends.natural++;
    });
  });
  return ends;
}

/**
 * The statistics of the twelve merged rows of one cell at one setting: { ok, problems, stats }. A row whose
 * work is unknown (a work check that is not 'ok', or a count that is not a whole number) is a problem and
 * there are no statistics: the median is unavailable, never a zero.
 */
function cellStats(rows, requests) {
  const n = requests === undefined ? 12 : requests;
  const problems = [];
  if (!Array.isArray(rows) || rows.length !== n) {
    return { ok: false, problems: [(rows ? rows.length : 0) + ' rows, not ' + n], stats: null };
  }
  rows.forEach((row) => {
    if (row.outcome !== 'ok' && row.outcome !== 'error') {
      problems.push('index ' + row.index + ': outcome ' + String(row.outcome));
    }
    if (typeof row.generationExact !== 'boolean') {
      problems.push('index ' + row.index + ': no generationExact');
    }
    const status = row.workCheck ? row.workCheck.status : 'missing';
    if (status !== 'ok') {
      problems.push('index ' + row.index + ': work ' + status + ' (unavailable, not zero)');
    } else if (!Number.isInteger(row.fullRatings) || row.fullRatings < 0) {
      problems.push('index ' + row.index + ': fullRatings ' + String(row.fullRatings));
    }
  });
  if (problems.length > 0) return { ok: false, problems: problems, stats: null };
  const ratings = rows.map((row) => row.fullRatings);
  const hits = rows.filter((row) => row.generationExact === true);
  const ends = rows.map(endsOf);
  const known = ends.every((e) => e !== null);
  const endSum = (pick) => (known ? sum(ends.map(pick)) : null);
  const inBand = rows.filter((row) => row.scoreHit === true);
  return {
    ok: true,
    problems: [],
    stats: {
      requests: rows.length,
      hits: hits.length,
      hitIndexes: hits.map((row) => row.index),
      inBand: inBand.length,
      shallow: inBand.filter((row) => row.shallow === true).length,
      errors: rows.filter((row) => row.outcome === 'error').length,
      errorIndexes: rows.filter((row) => row.outcome === 'error').map((row) => row.index),
      upperMedian: upperMedian(ratings),
      fullRatings: ratings.slice().sort((a, b) => a - b),
      sumFullRatings: sum(ratings),
      attempts: known ? sum(rows.map((row) => row.work.length)) : null,
      maxAttempts: known ? Math.max.apply(null, rows.map((row) => row.work.length)) : null,
      requestsWithEightAttempts: known ? rows.filter((row) => row.work.length >= 8).length : null,
      localSearches: endSum((e) => e.searches),
      endedByAllowance: endSum((e) => e.shallow),
      endedByProposals: endSum((e) => e.proposals),
      endedByRatingCap: endSum((e) => e.ratings),
      endedNaturally: endSum((e) => e.natural),
      requestCapHits: {
        shallow: sum(rows.map((row) => (row.capHits ? row.capHits.shallow || 0 : 0))),
        ratings: sum(rows.map((row) => (row.capHits ? row.capHits.ratings || 0 : 0))),
        proposals: sum(rows.map((row) => (row.capHits ? row.capHits.proposals || 0 : 0)))
      },
      generationSeconds: Math.round(sum(rows.map((row) => row.generationMs)) / 10) / 100,
      slowestSeconds: Math.round(Math.max.apply(null, rows.map((row) => row.generationMs)) / 10) / 100
    }
  };
}

/**
 * R5. table[setting][cellKey] is the `stats` of cellStats, or null when that (setting, cell) has no valid
 * twelve-request evidence. Returns { status: 'determined' | 'undetermined', winner, missing, comparisons,
 * eligible }, where winner is '64', '128', '256', 'none', or null when undetermined.
 */
function decideCap(table, cellKeys) {
  const missing = [];
  ['64', '128', '256', 'none'].forEach((setting) => {
    cellKeys.forEach((key) => {
      if (!table[setting] || !table[setting][key]) missing.push(setting + ' ' + key);
    });
  });
  const comparisons = FINITE_CAPS.map((setting) => {
    const perCell = cellKeys.map((key) => {
      const cap = table[setting] && table[setting][key];
      const none = table.none && table.none[key];
      if (!cap || !none) return { cell: key, known: false };
      const lost = none.hitIndexes.filter((i) => cap.hitIndexes.indexOf(i) === -1);
      const gained = cap.hitIndexes.filter((i) => none.hitIndexes.indexOf(i) === -1);
      return {
        cell: key, known: true, hits: cap.hits, noneHits: none.hits, hitDelta: cap.hits - none.hits,
        hitLoss: cap.hits < none.hits, upperMedian: cap.upperMedian, noneUpperMedian: none.upperMedian,
        medianDelta: cap.upperMedian - none.upperMedian, strictReduction: cap.upperMedian < none.upperMedian,
        lostIndexes: lost, gainedIndexes: gained
      };
    });
    const known = perCell.filter((c) => c.known);
    const hitLossCells = known.filter((c) => c.hitLoss).map((c) => c.cell);
    const reductionCells = known.filter((c) => c.strictReduction).map((c) => c.cell);
    const complete = known.length === cellKeys.length;
    let eligible = null;
    if (hitLossCells.length > 0) eligible = false;
    else if (complete) eligible = reductionCells.length > 0;
    return {
      setting: setting, perCell: perCell, complete: complete, hitLossCells: hitLossCells,
      reductionCells: reductionCells, eligible: eligible,
      matchedLosses: known.reduce((n, c) => n + c.lostIndexes.length, 0),
      matchedGains: known.reduce((n, c) => n + c.gainedIndexes.length, 0)
    };
  });
  const determined = missing.length === 0;
  const eligible = comparisons.filter((c) => c.eligible === true).map((c) => c.setting);
  return {
    status: determined ? 'determined' : 'undetermined', missing: missing, comparisons: comparisons,
    eligible: determined ? eligible : null,
    winner: determined ? (eligible.length ? eligible[0] : 'none') : null
  };
}

/**
 * C. table[setting][cellKey] as above for the settings '4' and '6'. Returns { status, winner, missing,
 * totals: { '4', '6' } (null when a cell is missing), tie, perCell }.
 */
function decideWindow(table, cellKeys) {
  const missing = [];
  ['4', '6'].forEach((setting) => {
    cellKeys.forEach((key) => {
      if (!table[setting] || !table[setting][key]) missing.push('C' + setting + ' ' + key);
    });
  });
  const totalOf = (setting) => (cellKeys.every((key) => table[setting] && table[setting][key]) ?
    sum(cellKeys.map((key) => table[setting][key].hits)) : null);
  const totals = { '4': totalOf('4'), '6': totalOf('6') };
  const determined = missing.length === 0;
  const tie = determined && totals['4'] === totals['6'];
  return {
    status: determined ? 'determined' : 'undetermined', missing: missing, totals: totals, tie: tie,
    winner: determined ? (totals['4'] > totals['6'] ? '4' : '6') : null
  };
}

/** The disposition of one choice: 'same', 'owner decision pending' or 'undetermined'. */
function dispositionOf(inForce, decision) {
  if (decision.status !== 'determined') return 'undetermined';
  return decision.winner === inForce ? 'same' : 'owner decision pending';
}

module.exports = {
  FINITE_CAPS: FINITE_CAPS, IN_FORCE: IN_FORCE, upperMedian: upperMedian, endsOf: endsOf,
  cellStats: cellStats, decideCap: decideCap, decideWindow: decideWindow, dispositionOf: dispositionOf,
  finite: finite
};
