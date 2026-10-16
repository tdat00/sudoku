/**
 * Symmetric cell groups for hole digging (design.md section 6.8, improvement 2).
 *
 * Symmetry is defined on the drawing canvas (`layout.cellRow` / `layout.cellCol`), not on a single 9x9 grid,
 * so overlapping multi-grid boards are mirrored about the centre of the whole canvas. A transformed position
 * that holds no cell is simply left out of the group: the group shrinks instead of failing.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /**
   * Symmetry kinds. Reflections are named by the axis they mirror across:
   *  - mirrorH  mirrors across the horizontal midline (row r <-> row R-1-r)
   *  - mirrorV  mirrors across the vertical midline   (column c <-> column C-1-c)
   * @type {string[]}
   */
  const KINDS = ['none', 'rotational180', 'rotational90', 'mirrorH', 'mirrorV', 'mirrorBoth', 'diagonal',
    'antiDiagonal'];

  /**
   * Each kind lists the transforms of its symmetry group. A transform maps a canvas position (r, c) on an
   * R x C canvas to a position, written as [row, col].
   */
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

  /** Kinds whose transform only makes sense when the canvas is a square. */
  const NEEDS_SQUARE = { rotational90: true, diagonal: true, antiDiagonal: true };

  /**
   * Partitions all cells into groups that are dug out and restored together.
   *
   * The groups are the orbits of the cells under the symmetry; their union is every cell exactly once. They
   * are ordered by their lowest cell index, and each group is sorted ascending. A cell on the centre or on an
   * axis forms a smaller group (possibly a group of one).
   *
   * @param {PuzzleModel} model
   * @param {string} kind  One of `SG.symmetry.KINDS`.
   * @returns {Int32Array[]}
   * @throws {SG.errors.GenerationError} 'symmetry.unknownKind', or 'symmetry.needsSquareCanvas' when a
   *         rotational90 / diagonal / antiDiagonal symmetry is asked for on a canvas that is not square.
   */
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
