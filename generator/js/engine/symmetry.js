/**
 * Symmetric cell groups for hole digging. Symmetry is defined on the drawing canvas (`layout.cellRow` /
 * `cellCol`), so overlapping multi-grid boards mirror about the canvas centre; a transformed position without
 * a cell is left out (the group shrinks instead of failing).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // mirrorH mirrors across the horizontal midline (row r <-> R-1-r), mirrorV across the vertical one.
  const KINDS = ['none', 'rotational180', 'rotational90', 'mirrorH', 'mirrorV', 'mirrorBoth', 'diagonal',
    'antiDiagonal'];

  // Per kind, the transforms of its group: canvas position (r, c) on an R x C canvas -> [row, col].
  const TRANSFORMS = {
    none: [],
    rotational180: [function (r, c, R, C) { return [R - 1 - r, C - 1 - c]; }],
    rotational90: [
      function (r, c, R) { return [c, R - 1 - r]; },
      function (r, c, R, C) { return [R - 1 - r, C - 1 - c]; },
      function (r, c, R, C) { return [C - 1 - c, r]; }
    ],
    mirrorH: [function (r, c, R) { return [R - 1 - r, c]; }],
    mirrorV: [function (r, c, R, C) { return [r, C - 1 - c]; }],
    mirrorBoth: [
      function (r, c, R) { return [R - 1 - r, c]; },
      function (r, c, R, C) { return [r, C - 1 - c]; },
      function (r, c, R, C) { return [R - 1 - r, C - 1 - c]; }
    ],
    diagonal: [function (r, c) { return [c, r]; }],
    antiDiagonal: [function (r, c, R, C) { return [C - 1 - c, R - 1 - r]; }]
  };

  const NEEDS_SQUARE = { rotational90: true, diagonal: true, antiDiagonal: true };

  // Partitions all cells into orbits under the symmetry (dug out and restored together), ordered by lowest
  // cell index, each sorted ascending; cells on an axis or the centre form smaller groups.
  // Throws 'symmetry.unknownKind', or 'symmetry.needsSquareCanvas' for rotational90 / diagonal / antiDiagonal
  // on a non-square canvas.
  function groups(model, kind) {
    const transforms = TRANSFORMS[kind];
    if (!Object.prototype.hasOwnProperty.call(TRANSFORMS, kind)) {
      throw new SG.errors.GenerationError('symmetry.unknownKind', { kind: String(kind) });
    }
    const layout = model.layout;
    const R = layout.rows;
    const C = layout.cols;
    if (NEEDS_SQUARE[kind] && R !== C) {
      throw new SG.errors.GenerationError('symmetry.needsSquareCanvas', { kind: kind, rows: R, cols: C });
    }

    const n = model.cellCount;
    const at = new Int32Array(R * C).fill(-1);
    for (let c = 0; c < n; c++) at[layout.cellRow[c] * C + layout.cellCol[c]] = c;

    const done = new Uint8Array(n);
    const result = [];
    for (let c = 0; c < n; c++) {
      if (done[c] === 1) continue;
      const members = [c];
      done[c] = 1;
      const r = layout.cellRow[c];
      const col = layout.cellCol[c];
      for (let t = 0; t < transforms.length; t++) {
        const pos = transforms[t](r, col, R, C);
        if (pos[0] < 0 || pos[0] >= R || pos[1] < 0 || pos[1] >= C) continue;
        const other = at[pos[0] * C + pos[1]];
        if (other !== -1 && done[other] === 0) {
          done[other] = 1;
          members.push(other);
        }
      }
      result.push(Int32Array.from(members.sort(function (a, b) { return a - b; })));
    }
    return result;
  }

  SG.symmetry = { KINDS: KINDS, groups: groups };
})(typeof self !== 'undefined' ? self : globalThis);
