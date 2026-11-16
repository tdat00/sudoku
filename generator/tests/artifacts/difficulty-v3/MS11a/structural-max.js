'use strict';
// Scratch (MS11a): the structural bound of the work of the second pass of uniqueRectangle on every registered variant, against
// the limit of 50000 (an upper bound of the rule, not an observation of real states, which work-census.js records). A unit is one
// tested extension of a type 3 subset or one tested digit of a type 4 link. For one rectangle and one choice of roofs (a pair
// of its corners that share a unit) the bound is, over the units that hold both roofs, the tests of the whole depth-first
// enumeration of the subsets of 1 to min(m, digits - 1) of the m = |unit| - 2 other cells (no cap of its own) with nothing pruned and nothing found (the sum over
// k of the extensions tried at every depth), plus two tested digits for a complete unit; for a rectangle the worst of
// its six pairs of corners; for a call the sum over the rectangles (the rectangles of the first pass: the geometry copied from
// isDeadlyGeometry / buildRectangles of core/js/engine/tech-wing.js, which this does not run). No state can make every
// rectangle spend its worst bound at once (the floors and roofs of overlapping rectangles exclude each other), so the totals
// are far above any reachable cost. The constructed floods of the suite (a row of a 16-digit board, 5,832 units; three such
// rows, 17,532) are measured costs, not bounds. Cages and inequalities exclude the rectangles (a model with them has none).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11a/structural-max.js
const SG = require('./load.js');
const H = SG.techHelper;

const KIND = { row: 1, col: 2, box: 3, region: 3 };
function rectanglesOf(model) {
  if (model.cages.length > 0 || model.inequalities.length > 0) return [];
  const kinds = new Uint8Array(model.units.length);
  for (let u = 0; u < kinds.length; u++) kinds[u] = KIND[model.unitMeta[u].kind] || 0;
  const hits = new Int32Array(model.units.length);
  const seen = new Set();
  const out = [];
  const n = model.cellCount;
  function geometry(quad) {
    let k;
    let j;
    for (k = 0; k < 4; k++) {
      const us = model.cellUnits[quad[k]];
      for (j = 0; j < us.length; j++) hits[us[j]]++;
    }
    let ok = true;
    let rows = 0;
    let cols = 0;
    let boxes = 0;
    for (k = 0; k < 4; k++) {
      const us = model.cellUnits[quad[k]];
      let inBox = false;
      for (j = 0; j < us.length; j++) {
        const u = us[j];
        if (kinds[u] === 3) inBox = true;
        const h = hits[u];
        if (h === 0) continue;
        hits[u] = 0;
        if (h !== 2) ok = false;
        else if (kinds[u] === 1) rows++;
        else if (kinds[u] === 2) cols++;
        else if (kinds[u] === 3) boxes++;
      }
      if (!inBox) ok = false;
    }
    return ok && rows === 2 && cols === 2 && boxes === 2;
  }
  function shares(c, d, kind) {
    const uc = model.cellUnits[c];
    const ud = model.cellUnits[d];
    for (let i = 0; i < uc.length; i++) {
      if (kinds[uc[i]] !== kind) continue;
      for (let j = 0; j < ud.length; j++) if (ud[j] === uc[i]) return true;
    }
    return false;
  }
  for (let u = 0; u < kinds.length; u++) {
    if (kinds[u] !== 1) continue;
    const row = model.units[u];
    for (let i = 0; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++) {
        const a = row[i];
        const b = row[j];
        const ua = model.cellUnits[a];
        const ub = model.cellUnits[b];
        for (let x = 0; x < ua.length; x++) {
          if (kinds[ua[x]] !== 2) continue;
          const colA = model.units[ua[x]];
          for (let p = 0; p < colA.length; p++) {
            const c = colA[p];
            if (c === a || c === b) continue;
            for (let y = 0; y < ub.length; y++) {
              if (kinds[ub[y]] !== 2 || ub[y] === ua[x]) continue;
              const colB = model.units[ub[y]];
              for (let q = 0; q < colB.length; q++) {
                const d = colB[q];
                if (d === a || d === b || d === c || !shares(c, d, 1)) continue;
                const quad = [a, b, c, d];
                if (!geometry(quad)) continue;
                const key = quad.slice().sort((s, t) => s - t).join(',');
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(quad);
              }
            }
          }
        }
      }
    }
  }
  return out;
}

function tests(m, k, depth, from) {
  let t = 0;
  for (let i = from; i <= m - (k - depth); i++) {
    t++;
    if (depth < k - 1) t += tests(m, k, depth + 1, i + 1);
  }
  return t;
}
const wMemo = {};
const W = (m, digits) => {
  const key = m + '/' + digits;
  if (wMemo[key] === undefined) {
    let t = 0;
    for (let k = 1; k <= Math.min(m, digits - 1); k++) t += tests(m, k, 0, 0);
    wMemo[key] = t;
  }
  return wMemo[key];
};

const rows = [];
SG.variants.list().forEach((def) => { if (SG.testkit.hasVariant(def.id)) rows.push([def.id, H.model(def.id)]); });
rows.push(['boxGrid 12 digits (3 x 4)', SG.fixtures.models.boxGrid('census-12', 3, 4)]);
rows.push(['boxGrid 16 digits (4 x 4)', SG.fixtures.models.boxGrid('census-16', 4, 4)]);
['classic4', 'classic6'].forEach((id) => rows.push([id, H.model(id)]));
rows.forEach(([id, model]) => {
  const rects = rectanglesOf(model);
  let total = 0;
  let worstRect = 0;
  let mostUnits = 0;
  rects.forEach((quad) => {
    let best = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        let sum = 0;
        let units = 0;
        const ua = model.cellUnits[quad[i]];
        const ub = model.cellUnits[quad[j]];
        for (let x = 0; x < ua.length; x++) {
          for (let y = 0; y < ub.length; y++) {
            if (ua[x] !== ub[y]) continue;
            const u = ua[x];
            units++;
            sum += W(model.units[u].length - 2, model.digits);
            if (model.units[u].length === model.digits && !model.unitMeta[u].partial) sum += 2;
          }
        }
        if (sum > best) best = sum;
        if (units > mostUnits) mostUnits = units;
      }
    }
    total += best;
    if (best > worstRect) worstRect = best;
  });
  const row = { id, digits: model.digits, cells: model.cellCount, units: model.units.length, rectangles: rects.length,
    worstRectangle: worstRect, unitsPerRoofPairMax: mostUnits, structuralBound: total, limit: 50000,
    boundExceedsLimit: total > 50000,
    note: model.cages.length > 0 || model.inequalities.length > 0 ? 'cages or inequalities: no rectangles' :
      (id === 'killer' || id === 'greaterThan' ? 'uncaged / uninequalitied model of the test helper' : undefined) };
  console.log(JSON.stringify(row));
});
