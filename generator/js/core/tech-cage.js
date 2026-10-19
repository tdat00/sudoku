/**
 * Cage techniques of the Killer variant. They apply to the variant `killer` only (`variantScope`) and work on
 * `model.cages`; everything else is read from the generic unit structure (no board shape beyond "complete
 * units of D
 * cells").
 *
 *   id          group  baseCost  order
 *   cageCombo   cage      10       55   Cage Sum Combination
 *   ruleOf45    cage      28       95   Rule of 45 (innies / outies)
 *   cageSplit   cage      40      135   Cage Splitting
 *
 * cageCombo. A cage of r open cells that must add up to s can only be filled with a digit set from
 * `SG.comboTable`. The
 * sets that still fit the candidates of the cells are the "survivors": a cell loses every digit that occurs
 * in none of
 * them, and a digit that occurs in all of them must be in the cage, so when only one open cell can still hold
 * it, it
 * goes there; if all its possible cells share a unit it is removed from the other cells of that unit
 * ("pointing" out of
 * a cage). Digits already fixed in the cage leave its other cells.
 *
 * ruleOf45. A set of complete units that do not overlap (k rows, k columns, k boxes) holds every digit k
 * times, so its
 * cells add up to k * 45. The cages lying completely inside the set account for their own sums; what is left
 * are the
 * "innies" (cells of the set in a cage that sticks out), and their sum is known. The same argument on the
 * cages that
 * touch the set gives the sum of the "outies" (cells outside the set in such a cage). A group with one open
 * cell is a
 * placement; a group of two to four open cells is filtered exhaustively against its sum (cells that share a
 * unit or a
 * cage must differ).
 *
 * cageSplit. When exactly one cage K sticks out of such a set, K falls apart into two virtual cages with
 * known sums:
 * the innies (K inside the set) and the outies (K outside it). Each is a distinct-digit cage of its own and
 * the two
 * digit sets must be disjoint, because both are parts of K. Filtered like cageCombo, with disjointness as the
 * extra
 * condition.
 *
 * Every deduction is sound: a digit is removed or a value placed only when no assignment of the cage sums and
 * the
 * all-different units can use it. All three only read the state and return the first deduction in a fixed
 * scan order
 * (cages by index; regions by kind, size and position).
 *
 * i18nArgs of the Findings (plain data; `cells` are cell labels such as 'R4C7', `units` unit labels):
 *   cageCombo   { sum, size, cells, digits, forced }
 *               digits = digits of the surviving combinations, forced = digits every combination needs
 *   ruleOf45    { kind, units, sum, cells }
 *               kind 'innie' | 'outie'; sum = what the open cells add up to
 *   ruleOf45 (placement)   { kind, units, sum, cell, digit }
 *   cageSplit   { sum, units, part, partSum, partDigits, rest, restSum, restDigits }
 *               part = the open cells of the innies, rest = the open cells of the outies
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registration on repeated loads.
  if (SG.techniques.has('cageCombo')) return;

  const comboTable = SG.comboTable;
  const toArray = SG.bits.toArray;

  const MAX_ENUM = 4;
  const MAX_REGION_UNITS = 4;
  /** Groups of innies / outies longer than this are not kept (they only matter very late in a solve). */
  const MAX_GROUP = 6;
  /** Scratch size: a cage or a kept group never has more cells than this. */
  const MAX_CAGE = 32;

  // Scratch shared by every call. find() is synchronous and never re-entered, so one set is enough.
  const openBuf = new Int32Array(MAX_CAGE);
  const partBuf = new Int32Array(MAX_CAGE);
  const restBuf = new Int32Array(MAX_CAGE);
  const survivorsA = new Int32Array(512);
  const survivorsB = new Int32Array(512);
  const openIndex = new Int32Array(MAX_CAGE);

  function labelsOf(model, cells, count) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(SG.model.cellLabel(model, cells[i]));
    return out;
  }

  // Digit sets that fit `count` open cells which must add up to `rest`, written into `out`: combination table
  // sets that
  // avoid `forbidden`, lie inside the union of the candidates and give every cell at least one of their
  // digits.
  // Returns how many were written.
  function survivingCombos(cand, cells, count, rest, forbidden, digits, out) {
    const list = comboTable.masks(count, rest, digits);
    let unionMask = 0;
    let i;
    for (i = 0; i < count; i++) unionMask |= cand[cells[i]];
    let n = 0;
    for (let j = 0; j < list.length; j++) {
      const cm = list[j];
      if ((cm & forbidden) !== 0 || (cm & ~unionMask) !== 0) continue;
      let fits = true;
      for (i = 0; i < count; i++) {
        if ((cand[cells[i]] & cm) === 0) {
          fits = false;
          break;
        }
      }
      if (fits) out[n++] = cm;
    }
    return n;
  }

  function hasUnit(model, cell, unit) {
    const us = model.cellUnits[cell];
    for (let i = 0; i < us.length; i++) if (us[i] === unit) return true;
    return false;
  }

  function isPlaced(placements, cell) {
    for (let i = 0; i < placements.length; i++) if (placements[i][0] === cell) return true;
    return false;
  }

  function hasPair(list, cell, digit) {
    for (let i = 0; i < list.length; i++) if (list[i][0] === cell && list[i][1] === digit) return true;
    return false;
  }

  // Removes `bit`, which the cage must contain somewhere among `positions`, from the other cells of every
  // unit holding
  // all of them.
  function pointOutOfCage(model, state, index, k, positions, count, bit, eliminations) {
    const cand = state.candidates;
    const value = state.value;
    const first = model.cellUnits[positions[0]];
    const digit = 32 - Math.clz32(bit);
    for (let a = 0; a < first.length; a++) {
      const u = first[a];
      let all = true;
      for (let i = 1; i < count && all; i++) all = hasUnit(model, positions[i], u);
      if (!all) continue;
      const cells = model.units[u];
      for (let i = 0; i < cells.length; i++) {
        const x = cells[i];
        if (value[x] === 0 && index.cageOf[x] !== k && (cand[x] & bit) !== 0 &&
            !hasPair(eliminations, x, digit)) {
          eliminations.push([x, digit]);
        }
      }
    }
  }

  function comboFinding(model, state, index, k) {
    const cand = state.candidates;
    const value = state.value;
    const s = index.start[k];
    const e = index.start[k + 1];
    let fixedMask = 0;
    let fixedSum = 0;
    let open = 0;
    let i;
    for (i = s; i < e; i++) {
      const c = index.cells[i];
      const v = value[c];
      if (v !== 0) {
        fixedMask |= 1 << (v - 1);
        fixedSum += v;
      } else {
        openBuf[open++] = c;
      }
    }
    if (open === 0) return null;
    const rest = index.sum[k] - fixedSum;
    const n = survivingCombos(cand, openBuf, open, rest, fixedMask, model.digits, survivorsA);
    if (n === 0) return null;
    let valid = 0;
    let always = -1;
    for (let j = 0; j < n; j++) {
      valid |= survivorsA[j];
      always &= survivorsA[j];
    }

    const placements = [];
    const eliminations = [];
    let needed = always;
    while (needed !== 0) {
      const bit = needed & -needed;
      needed ^= bit;
      let places = 0;
      for (i = 0; i < open; i++) {
        if ((cand[openBuf[i]] & bit) !== 0) partBuf[places++] = openBuf[i];
      }
      if (places === 1) {
        placements.push([partBuf[0], 32 - Math.clz32(bit)]);
      } else if (places > 1) {
        pointOutOfCage(model, state, index, k, partBuf, places, bit, eliminations);
      }
    }
    for (i = 0; i < open; i++) {
      const c = openBuf[i];
      if (isPlaced(placements, c)) continue;
      for (let extra = cand[c] & ~valid; extra !== 0; extra &= extra - 1) {
        eliminations.push([c, 32 - Math.clz32(extra & -extra)]);
      }
    }
    if (placements.length === 0 && eliminations.length === 0) return null;

    const cells = [];
    for (i = s; i < e; i++) cells.push(index.cells[i]);
    return {
      technique: 'cageCombo',
      cells: cells,
      placements: placements,
      eliminations: eliminations,
      i18nKey: 'technique.cageCombo.step',
      i18nArgs: {
        sum: index.sum[k],
        size: e - s,
        cells: labelsOf(model, cells, cells.length),
        digits: toArray(valid),
        forced: toArray(always & valid)
      }
    };
  }

  function findCageCombo(model, state, ctx) {
    const index = comboTable.cageIndex(model);
    for (let k = 0; k < index.count; k++) {
      if (index.distinct[k] === 0) continue;
      if ((k & 15) === 0) ctx.check();
      const finding = comboFinding(model, state, index, k);
      if (finding !== null) return finding;
    }
    return null;
  }

  // Region: { unitLabels, useIn (ruleOf45 looks at the innies: a short group, not seen before), innies (cells
  // of the
  // region in a cage that is not completely inside it, or in no cage), inSum (k * (1 + ... + D) minus the
  // sums of the
  // cages inside), inDistinct (innies.length ^ 2 flags: 1 when two innies must differ), useOut / outies
  // (cells outside
  // the region in a cage partly inside it) / outSum / outDistinct (the same for the outies), splitCage (the
  // only cage
  // sticking out of the region when it is a distinct cage and every cell of the region is in a cage, so
  // innies and
  // outies are its two parts; else -1) }

  const regionCache = new WeakMap();

  function isPeer(model, a, b) {
    const list = model.peers[a];
    let lo = 0;
    let hi = list.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid] === b) return true;
      if (list[mid] < b) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  function distinctMatrix(model, index, cells) {
    const len = cells.length;
    const out = new Uint8Array(len * len);
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < len; b++) {
        if (a === b) continue;
        const ka = index.cageOf[cells[a]];
        const sameCage = ka >= 0 && ka === index.cageOf[cells[b]] && index.distinct[ka] === 1;
        out[a * len + b] = sameCage || isPeer(model, cells[a], cells[b]) ? 1 : 0;
      }
    }
    return out;
  }

  function unitGroups(model) {
    const groups = new Map();
    for (let u = 0; u < model.units.length; u++) {
      const meta = model.unitMeta[u];
      if ((meta && meta.partial) || model.units[u].length !== model.digits) continue;
      const kind = meta ? meta.kind : 'region';
      if (!groups.has(kind)) groups.set(kind, []);
      groups.get(kind).push(u);
    }
    return groups;
  }

  function buildRegions(model) {
    const index = comboTable.cageIndex(model);
    const n = model.cellCount;
    const D = model.digits;
    const unitTotal = D * (D + 1) / 2;
    const regions = [];
    const seen = new Set();
    const inside = new Int32Array(index.count);
    const marked = new Uint8Array(n);

    function addRegion(picked) {
      let i;
      let cells;
      marked.fill(0);
      for (i = 0; i < picked.length; i++) {
        cells = model.units[picked[i]];
        for (let j = 0; j < cells.length; j++) {
          if (marked[cells[j]] === 1) return;
          marked[cells[j]] = 1;
        }
      }
      inside.fill(0);
      let uncovered = 0;
      for (let c = 0; c < n; c++) {
        if (marked[c] === 0) continue;
        if (index.cageOf[c] >= 0) inside[index.cageOf[c]]++;
        else uncovered++;
      }
      let insideSum = 0;
      let crossSum = 0;
      let crossing = 0;
      let crossCage = -1;
      for (let k = 0; k < index.count; k++) {
        if (inside[k] === 0) continue;
        if (inside[k] === index.size[k]) {
          insideSum += index.sum[k];
        } else {
          crossSum += index.sum[k];
          crossing++;
          crossCage = k;
        }
      }
      const innies = [];
      const outies = [];
      for (let c = 0; c < n; c++) {
        const k = index.cageOf[c];
        if (marked[c] === 1) {
          if (k < 0 || inside[k] !== index.size[k]) innies.push(c);
        } else if (k >= 0 && inside[k] > 0 && inside[k] !== index.size[k]) {
          outies.push(c);
        }
      }
      const inSum = picked.length * unitTotal - insideSum;
      const outSum = crossSum - inSum;
      // The same equation can come from a set and from its complement (innies and outies swap roles).
      const inKey = innies.join(',') + '=' + inSum;
      const outKey = outies.join(',') + '=' + outSum;
      const useIn = innies.length >= 1 && innies.length <= MAX_GROUP && !seen.has(inKey);
      const useOut = uncovered === 0 && outies.length >= 1 && outies.length <= MAX_GROUP && !seen.has(outKey);
      const split = crossing === 1 && uncovered === 0 && index.distinct[crossCage] === 1 ? crossCage : -1;
      if (!useIn && !useOut && split < 0) return;
      if (useIn) seen.add(inKey);
      if (useOut) seen.add(outKey);
      const keep = split >= 0;
      regions.push({
        unitLabels: picked.map(function (u) { return model.unitMeta[u].label; }),
        useIn: useIn,
        innies: useIn || keep ? Int32Array.from(innies) : new Int32Array(0),
        inSum: inSum,
        inDistinct: useIn ? distinctMatrix(model, index, innies) : new Uint8Array(0),
        useOut: useOut,
        outies: useOut || keep ? Int32Array.from(outies) : new Int32Array(0),
        outSum: outSum,
        outDistinct: useOut ? distinctMatrix(model, index, outies) : new Uint8Array(0),
        splitCage: split
      });
    }

    function choose(group, size, from, picked) {
      if (picked.length === size) {
        addRegion(picked.slice());
        return;
      }
      for (let i = from; i < group.length; i++) {
        picked.push(group[i]);
        choose(group, size, i + 1, picked);
        picked.pop();
      }
    }

    unitGroups(model).forEach(function (group) {
      let covered = 0;
      group.forEach(function (u) { covered += model.units[u].length; });
      // When the units tile the board, a set and its complement say the same thing: look at the smaller one.
      const maxSize = Math.min(MAX_REGION_UNITS, covered === n ? Math.floor(group.length / 2) : group.length);
      for (let size = 1; size <= maxSize; size++) choose(group, size, 0, []);
    });
    return regions;
  }

  function regionsOf(model) {
    let regions = regionCache.get(model);
    if (regions === undefined) {
      regions = model.cages && model.cages.length > 0 ? buildRegions(model) : [];
      regionCache.set(model, regions);
    }
    return regions;
  }

  // State of the exhaustive search over one group of open cells.
  const enumCand = new Int32Array(MAX_ENUM);
  const enumChosen = new Int32Array(MAX_ENUM);
  const enumSupport = new Int32Array(MAX_ENUM);
  const enumLow = new Int32Array(MAX_ENUM + 1);
  const enumHigh = new Int32Array(MAX_ENUM + 1);
  let enumCount = 0;
  let enumRest = 0;
  let enumSum = 0;
  let enumDigits = 0;
  let enumMatrix = null;
  let enumLen = 0;

  function clashes(depth, digit) {
    for (let j = 0; j < depth; j++) {
      if (enumChosen[j] === digit && enumMatrix[openIndex[j] * enumLen + openIndex[depth]] === 1) return true;
    }
    return false;
  }

  function walk(depth) {
    const m = enumCand[depth];
    if (depth === enumCount - 1) {
      const need = enumRest - enumSum;
      if (need < 1 || need > enumDigits || (m & (1 << (need - 1))) === 0 || clashes(depth, need)) return;
      for (let j = 0; j < depth; j++) enumSupport[j] |= 1 << (enumChosen[j] - 1);
      enumSupport[depth] |= 1 << (need - 1);
      return;
    }
    for (let rest = m; rest !== 0; rest &= rest - 1) {
      const digit = 32 - Math.clz32(rest & -rest);
      if (clashes(depth, digit)) continue;
      const sum = enumSum + digit;
      if (sum + enumLow[depth + 1] > enumRest || sum + enumHigh[depth + 1] < enumRest) continue;
      enumChosen[depth] = digit;
      enumSum = sum;
      walk(depth + 1);
      enumSum -= digit;
    }
  }

  function groupFinding(model, state, region, kindIsInnie) {
    const cells = kindIsInnie ? region.innies : region.outies;
    const target = kindIsInnie ? region.inSum : region.outSum;
    const matrix = kindIsInnie ? region.inDistinct : region.outDistinct;
    const cand = state.candidates;
    const value = state.value;
    let open = 0;
    let solved = 0;
    for (let i = 0; i < cells.length; i++) {
      const v = value[cells[i]];
      if (v === 0) openIndex[open++] = i;
      else solved += v;
    }
    if (open === 0) return null;
    const rest = target - solved;
    const kind = kindIsInnie ? 'innie' : 'outie';

    if (open === 1) {
      const cell = cells[openIndex[0]];
      if (rest < 1 || rest > model.digits || (cand[cell] & (1 << (rest - 1))) === 0) return null;
      return {
        technique: 'ruleOf45',
        cells: Array.from(cells),
        placements: [[cell, rest]],
        eliminations: [],
        i18nKey: 'technique.ruleOf45.place',
        i18nArgs: {
          kind: kind,
          units: region.unitLabels,
          sum: rest,
          cell: SG.model.cellLabel(model, cell),
          digit: rest
        }
      };
    }
    if (open > MAX_ENUM || region.splitCage >= 0) return null;

    enumCount = open;
    enumRest = rest;
    enumSum = 0;
    enumDigits = model.digits;
    enumMatrix = matrix;
    enumLen = cells.length;
    enumLow[open] = 0;
    enumHigh[open] = 0;
    for (let d = open - 1; d >= 0; d--) {
      const m = cand[cells[openIndex[d]]];
      enumCand[d] = m;
      enumSupport[d] = 0;
      enumLow[d] = enumLow[d + 1] + (32 - Math.clz32(m & -m));
      enumHigh[d] = enumHigh[d + 1] + (32 - Math.clz32(m));
    }
    walk(0);

    const eliminations = [];
    for (let d = 0; d < open; d++) {
      if (enumSupport[d] === 0) return null;
      const c = cells[openIndex[d]];
      for (let extra = cand[c] & ~enumSupport[d]; extra !== 0; extra &= extra - 1) {
        eliminations.push([c, 32 - Math.clz32(extra & -extra)]);
      }
    }
    if (eliminations.length === 0) return null;
    const openCells = [];
    for (let d = 0; d < open; d++) openCells.push(cells[openIndex[d]]);
    return {
      technique: 'ruleOf45',
      cells: Array.from(cells),
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.ruleOf45.step',
      i18nArgs: {
        kind: kind,
        units: region.unitLabels,
        sum: rest,
        cells: labelsOf(model, openCells, openCells.length)
      }
    };
  }

  function findRuleOf45(model, state, ctx) {
    const regions = regionsOf(model);
    for (let r = 0; r < regions.length; r++) {
      if ((r & 15) === 0) ctx.check();
      const region = regions[r];
      let finding = region.useIn ? groupFinding(model, state, region, true) : null;
      if (finding === null && region.useOut) finding = groupFinding(model, state, region, false);
      if (finding !== null) return finding;
    }
    return null;
  }

  function splitFinding(model, state, index, region) {
    const cand = state.candidates;
    const value = state.value;
    const k = region.splitCage;
    const inside = region.innies;
    const outside = region.outies;
    let fixedMask = 0;
    let part = 0;
    let rest = 0;
    let partSolved = 0;
    let restSolved = 0;
    let i;
    for (i = 0; i < inside.length; i++) {
      const v = value[inside[i]];
      if (v === 0) {
        partBuf[part++] = inside[i];
      } else {
        fixedMask |= 1 << (v - 1);
        partSolved += v;
      }
    }
    for (i = 0; i < outside.length; i++) {
      const v = value[outside[i]];
      if (v === 0) {
        restBuf[rest++] = outside[i];
      } else {
        fixedMask |= 1 << (v - 1);
        restSolved += v;
      }
    }
    if (part === 0 || rest === 0) return null;
    const partSum = region.inSum - partSolved;
    const restSum = index.sum[k] - region.inSum - restSolved;
    const nA = survivingCombos(cand, partBuf, part, partSum, fixedMask, model.digits, survivorsA);
    const nB = survivingCombos(cand, restBuf, rest, restSum, fixedMask, model.digits, survivorsB);
    if (nA === 0 || nB === 0) return null;
    let partDigits = 0;
    let restDigits = 0;
    for (let a = 0; a < nA; a++) {
      for (let b = 0; b < nB; b++) {
        if ((survivorsA[a] & survivorsB[b]) === 0) {
          partDigits |= survivorsA[a];
          restDigits |= survivorsB[b];
        }
      }
    }
    if (partDigits === 0) return null;

    const eliminations = [];
    for (i = 0; i < part; i++) {
      for (let extra = cand[partBuf[i]] & ~partDigits; extra !== 0; extra &= extra - 1) {
        eliminations.push([partBuf[i], 32 - Math.clz32(extra & -extra)]);
      }
    }
    for (i = 0; i < rest; i++) {
      for (let extra = cand[restBuf[i]] & ~restDigits; extra !== 0; extra &= extra - 1) {
        eliminations.push([restBuf[i], 32 - Math.clz32(extra & -extra)]);
      }
    }
    if (eliminations.length === 0) return null;

    const cells = [];
    for (i = index.start[k]; i < index.start[k + 1]; i++) cells.push(index.cells[i]);
    return {
      technique: 'cageSplit',
      cells: cells,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.cageSplit.step',
      i18nArgs: {
        sum: index.sum[k],
        units: region.unitLabels,
        part: labelsOf(model, partBuf, part),
        partSum: partSum,
        partDigits: toArray(partDigits),
        rest: labelsOf(model, restBuf, rest),
        restSum: restSum,
        restDigits: toArray(restDigits)
      }
    };
  }

  function findCageSplit(model, state, ctx) {
    const regions = regionsOf(model);
    if (regions.length === 0) return null;
    const index = comboTable.cageIndex(model);
    for (let r = 0; r < regions.length; r++) {
      if ((r & 15) === 0) ctx.check();
      if (regions[r].splitCage < 0) continue;
      const finding = splitFinding(model, state, index, regions[r]);
      if (finding !== null) return finding;
    }
    return null;
  }

  [
    ['cageCombo', 10, 55, findCageCombo],
    ['ruleOf45', 28, 95, findRuleOf45],
    ['cageSplit', 40, 135, findCageSplit]
  ].forEach(function (row) {
    SG.techniques.register({
      id: row[0],
      group: 'cage',
      baseCost: row[1],
      order: row[2],
      i18nKey: 'technique.' + row[0],
      variantScope: ['killer'],
      assumesUniqueness: false,
      find: row[3]
    });
  });
})(typeof self !== 'undefined' ? self : globalThis);
