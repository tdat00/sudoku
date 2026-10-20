/**
 * SVG board view, shared by the generator and the player: draws every variant and updates it from the delta
 * patches of the event stream, touching only the DOM nodes of the cells that changed.
 *
 * Layers of the SVG tree, bottom to top (`setLayerVisible(name, flag)` shows or hides one by its `data-layer` name:
 * regions, overlays, word, cages, ineq, cells, values, grid, coords, overlay):
 *   layer-regions   paper, jigsaw region tints, diagonal / window / overlap / word-line overlays and the pale
 *                   colours of Killer cages
 *   layer-cells     one <rect class="cell" data-cell="i"> per cell: state and colour-mode background
 *   layer-cages     Killer: dashed inset outline of each cage and its sum (top-left cell)
 *   layer-ineq      Greater-Than: the sign on the edge between two cells
 *   layer-values    per cell one <text> (digits, letters, word) and one <use> (geometric symbol)
 *   layer-grid      thin lines inside a region, thick between regions and on the outer border, sub-grid outlines
 *                   of multi-grid boards, optional row / column coordinates
 *   layer-overlay   effects: highlighted (probed, technique, selected) cells and the replay frames (removed, put
 *                   back, revealed in the step on show)
 *
 * Pure part (runs in Node): `geometry(model, opts)` computes all coordinates, line segments and paths,
 * `renderMarkup(model, state, opts)` the inner SVG markup and `exportSvg(...)` a standalone SVG string.
 * DOM part: `create(svgEl, model, opts)` builds the tree once from that markup and then only patches nodes.
 * Units: one cell is 40 board units; the SVG viewBox scales the whole board, there is no resize code.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.boardView && typeof SG.boardView.create === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const CELL = 40;
  const MARGIN = 6;
  const COORD = 16;

  const CAGE_INSET = 4;
  const CAGE_FONT = 10.5;
  const SIGN_APEX = 5;
  const SIGN_HALF = 7.5;
    /** Half-length of the window cut into a thin grid line behind a sign. */
    const SIGN_GAP = SIGN_HALF + 2;

  const NONE = 0;
  const THIN = 1;
  const THICK = 2;

  const REGION_TINTS = 9;
  const CAGE_COLORS = 5;

  const TRANS_PLACING = 1;
  const TRANS_BACKTRACK = 2;
  const TRANS_REMOVING = 4;

  const LAYERS = Object.freeze(['regions', 'overlays', 'word', 'cages', 'ineq', 'cells', 'values', 'grid',
    'coords', 'overlay']);

  let viewCounter = 0;

  function num(x) {
    return String(Math.round(x * 100) / 100);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function translate(key, args) {
    if (SG.i18n && typeof SG.i18n.t === 'function') return SG.i18n.t(key, args);
    return key;
  }

  function sortedByRowCol(cells, rowOf, colOf) {
    return Array.from(cells).sort(function (a, b) {
      return rowOf[a] - rowOf[b] || colOf[a] - colOf[b];
    });
  }

  function cellsPath(cells, geo) {
    const sorted = sortedByRowCol(cells, geo.cellRow, geo.cellCol);
    let d = '';
    let k = 0;
    while (k < sorted.length) {
      const first = sorted[k];
      const row = geo.cellRow[first];
      let last = first;
      k++;
      while (k < sorted.length && geo.cellRow[sorted[k]] === row &&
             geo.cellCol[sorted[k]] === geo.cellCol[last] + 1) {
        last = sorted[k];
        k++;
      }
      const len = (geo.cellCol[last] - geo.cellCol[first] + 1) * CELL;
      d += 'M' + num(geo.cellX[first]) + ' ' + num(geo.cellY[first]) + 'h' + len + 'v' + CELL + 'h-' + len +
        'z';
    }
    return d;
  }

  function classify(model, a, b) {
    if (a < 0 && b < 0) return NONE;
    if (a < 0 || b < 0) return THICK;
    return model.layout.cellRegion[a] !== model.layout.cellRegion[b] ? THICK : THIN;
  }

  /**
   * Lattice edges of the canvas. Horizontal edge (r, c) lies on lattice row r above canvas row r, in column
   * c; vertical edge (r, c) lies on lattice column c left of canvas column c, in row r. An edge between two
   * cells is thick when their `cellRegion` differs, an edge with a cell on one side only (the outer border,
   * a hole of the canvas) is thick, an edge with no cell at all does not exist.
   */
  function buildEdges(model, geo) {
    const rows = geo.rows;
    const cols = geo.cols;
    const at = geo.at;
    const hType = new Uint8Array((rows + 1) * cols);
    const vType = new Uint8Array(rows * (cols + 1));
    const list = { thin: [], thick: [] };
    let r;
    let c;
    for (r = 0; r <= rows; r++) {
      for (c = 0; c < cols; c++) {
        const a = r > 0 ? at[(r - 1) * cols + c] : -1;
        const b = r < rows ? at[r * cols + c] : -1;
        const type = classify(model, a, b);
        hType[r * cols + c] = type;
        if (type !== NONE) {
          (type === THICK ? list.thick : list.thin).push({
            orientation: 'h', row: r, col: c, a: a, b: b,
            x1: geo.originX + c * CELL, y1: geo.originY + r * CELL,
            x2: geo.originX + (c + 1) * CELL, y2: geo.originY + r * CELL
          });
        }
      }
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c <= cols; c++) {
        const a = c > 0 ? at[r * cols + c - 1] : -1;
        const b = c < cols ? at[r * cols + c] : -1;
        const type = classify(model, a, b);
        vType[r * (cols + 1) + c] = type;
        if (type !== NONE) {
          (type === THICK ? list.thick : list.thin).push({
            orientation: 'v', row: r, col: c, a: a, b: b,
            x1: geo.originX + c * CELL, y1: geo.originY + r * CELL,
            x2: geo.originX + c * CELL, y2: geo.originY + (r + 1) * CELL
          });
        }
      }
    }
    return { hType: hType, vType: vType, list: list };
  }

  /**
   * Path of all edges of one type, collinear neighbours merged into single segments. `gaps` (thin edges
   * only) maps the key of an edge that carries an inequality sign to true: that edge is drawn in two
   * stubs with a window in the middle, so the grid line does not run through the sign.
   */
  function edgesPath(edges, type, geo, gaps) {
    const rows = geo.rows;
    const cols = geo.cols;
    let d = '';
    let r;
    let c;
    const gapped = function (orientation, row, col) {
      return type === THIN && gaps !== undefined && gaps.has(orientation + ':' + row + ',' + col);
    };
    const stub = Math.max(CELL / 2 - SIGN_GAP, 0);
    for (r = 0; r <= rows; r++) {
      c = 0;
      while (c < cols) {
        if (edges.hType[r * cols + c] !== type) {
          c++;
          continue;
        }
        const x0 = geo.originX + c * CELL;
        const y0 = geo.originY + r * CELL;
        if (gapped('h', r, c)) {
          d += 'M' + num(x0) + ' ' + num(y0) + 'h' + num(stub) + 'M' + num(x0 + CELL - stub) + ' ' +
            num(y0) + 'h' + num(stub);
          c++;
          continue;
        }
        const start = c;
        while (c < cols && edges.hType[r * cols + c] === type && !gapped('h', r, c)) c++;
        d += 'M' + num(geo.originX + start * CELL) + ' ' + num(y0) + 'H' + num(geo.originX + c * CELL);
      }
    }
    for (c = 0; c <= cols; c++) {
      r = 0;
      while (r < rows) {
        if (edges.vType[r * (cols + 1) + c] !== type) {
          r++;
          continue;
        }
        const x0 = geo.originX + c * CELL;
        const y0 = geo.originY + r * CELL;
        if (gapped('v', r, c)) {
          d += 'M' + num(x0) + ' ' + num(y0) + 'v' + num(stub) + 'M' + num(x0) + ' ' +
            num(y0 + CELL - stub) + 'v' + num(stub);
          r++;
          continue;
        }
        const start = r;
        while (r < rows && edges.vType[r * (cols + 1) + c] === type && !gapped('v', r, c)) r++;
        d += 'M' + num(x0) + ' ' + num(geo.originY + start * CELL) + 'V' + num(geo.originY + r * CELL);
      }
    }
    return d;
  }

  /**
   * Closed loops that bound a set of cells, as lists of lattice vertices (row, col) with the direction of
   * the edge that starts at each. Clockwise on screen: the interior is on the right of the direction.
   */
  function boundaryLoops(cells, rowOf, colOf) {
    const key = function (r, c) { return r * 4096 + c; };
    const inside = new Set();
    cells.forEach(function (i) { inside.add(key(rowOf[i], colOf[i])); });
    const out = new Map();
    function add(r1, c1, r2, c2) {
      const k = key(r1, c1);
      if (!out.has(k)) out.set(k, []);
      out.get(k).push({ r: r1, c: c1, r2: r2, c2: c2, used: false });
    }
    cells.forEach(function (i) {
      const r = rowOf[i];
      const c = colOf[i];
      if (!inside.has(key(r - 1, c))) add(r, c, r, c + 1);
      if (!inside.has(key(r, c + 1))) add(r, c + 1, r + 1, c + 1);
      if (!inside.has(key(r + 1, c))) add(r + 1, c + 1, r + 1, c);
      if (!inside.has(key(r, c - 1))) add(r + 1, c, r, c);
    });
    const loops = [];
    out.forEach(function (edges) {
      edges.forEach(function (first) {
        if (first.used) return;
        const loop = [];
        let e = first;
        while (e !== null && !e.used) {
          e.used = true;
          loop.push(e);
          const next = out.get(key(e.r2, e.c2));
          e = null;
          if (next !== undefined) {
            for (let k = 0; k < next.length; k++) {
              if (!next[k].used) {
                e = next[k];
                break;
              }
            }
          }
        }
        if (loop.length >= 4) loops.push(loop);
      });
    });
    return loops;
  }

  function cageOutline(cells, geo, inset) {
    let d = '';
    boundaryLoops(cells, geo.cellRow, geo.cellCol).forEach(function (loop) {
      const pts = [];
      for (let k = 0; k < loop.length; k++) {
        const prev = loop[(k + loop.length - 1) % loop.length];
        const cur = loop[k];
        const din = { x: Math.sign(prev.c2 - prev.c), y: Math.sign(prev.r2 - prev.r) };
        const dout = { x: Math.sign(cur.c2 - cur.c), y: Math.sign(cur.r2 - cur.r) };
        if (din.x === dout.x && din.y === dout.y) continue;
        const nx = -din.y + -dout.y;
        const ny = din.x + dout.x;
        pts.push(num(geo.originX + cur.c * CELL + inset * nx) + ' ' +
          num(geo.originY + cur.r * CELL + inset * ny));
      }
      if (pts.length >= 3) d += 'M' + pts.join('L') + 'Z';
    });
    return d;
  }

  const DIRECTIONS = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };

  function computeSigns(model) {
    return SG.modelAids.signEdges(model);
  }

  /** Chevron that opens towards the greater cell; its apex points at the smaller one. */
  function signPath(x, y, dir) {
    const dx = dir[0];
    const dy = dir[1];
    const px = -dy;
    const py = dx;
    return 'M' + num(x + dx * SIGN_APEX + px * SIGN_HALF) + ' ' + num(y + dy * SIGN_APEX + py * SIGN_HALF) +
      'L' + num(x - dx * SIGN_APEX) + ' ' + num(y - dy * SIGN_APEX) +
      'L' + num(x + dx * SIGN_APEX - px * SIGN_HALF) + ' ' + num(y + dy * SIGN_APEX - py * SIGN_HALF);
  }

  function overlayGroup(kind) {
    if (/^cageColor\d+$/.test(kind)) return 'cages';
    return kind === 'wordLine' ? 'word' : 'overlays';
  }

  const geometryCache = new WeakMap();

  /**
   * Pure geometry of a model, cached per model and option set; treat the result as read-only. `opts`: `showCoords`,
   * `regionTint`. Returns the canvas: `cell`, `width`, `height` (viewBox), `rows`, `cols`, `originX/Y`; per cell
   * `cellX[i]`, `cellY[i]` (top-left), `cellRow`, `cellCol`, `at` (canvas lookup, -1 = hole); lines: `edges.thin`,
   * `edges.thick` (every edge as {orientation, row, col, a, b, x1..y2}; b or a is -1 on the outer border) and the
   * merged `paths.thin`, `paths.thick`, `paths.paper`; `subGrids` [{gridIndex, x, y, size}] (multi-grid only);
   * `regions` [{id, token, cells, d}] (jigsaw tints); `overlays` [{index, kind, group, cells, d}]; `cages` [{index,
   * sum, cells, d, labelCell, labelX, labelY, color}]; `signs` [{index, a, b, x, y, direction, glyph, d}]; `coords`
   * {cols, rows} or null; `value` {font, shiftY}.
   */
  function geometry(model, opts) {
    const o = opts || {};
    const coords = o.showCoords === true;
    const tintOpt = o.regionTint === undefined ? 'auto' : o.regionTint;
    const cacheKey = (coords ? 'c' : '-') + String(tintOpt);
    let perModel = geometryCache.get(model);
    if (perModel === undefined) {
      perModel = new Map();
      geometryCache.set(model, perModel);
    }
    const cached = perModel.get(cacheKey);
    if (cached !== undefined) return cached;

    const layout = model.layout;
    const n = model.cellCount;
    const rows = layout.rows;
    const cols = layout.cols;
    const originX = MARGIN + (coords ? COORD : 0);
    const originY = originX;
    const geo = {
      cell: CELL,
      margin: MARGIN,
      rows: rows,
      cols: cols,
      cellCount: n,
      originX: originX,
      originY: originY,
      width: originX + cols * CELL + MARGIN,
      height: originY + rows * CELL + MARGIN,
      cellRow: layout.cellRow,
      cellCol: layout.cellCol,
      cellX: new Float64Array(n),
      cellY: new Float64Array(n),
      at: new Int32Array(rows * cols).fill(-1)
    };
    let i;
    for (i = 0; i < n; i++) {
      geo.at[layout.cellRow[i] * cols + layout.cellCol[i]] = i;
      geo.cellX[i] = originX + layout.cellCol[i] * CELL;
      geo.cellY[i] = originY + layout.cellRow[i] * CELL;
    }

    const edges = buildEdges(model, geo);
    geo.edges = edges.list;
    const signList = computeSigns(model);
    const gaps = new Map();
    signList.forEach(function (s) {
      const sameRow = layout.cellRow[s.a] === layout.cellRow[s.b];
      const key = sameRow
        ? 'v:' + layout.cellRow[s.a] + ',' + Math.max(layout.cellCol[s.a], layout.cellCol[s.b])
        : 'h:' + Math.max(layout.cellRow[s.a], layout.cellRow[s.b]) + ',' + layout.cellCol[s.a];
      gaps.set(key, true);
    });
    const all = [];
    for (i = 0; i < n; i++) all.push(i);
    geo.paths = {
      paper: cellsPath(all, geo),
      thin: edgesPath(edges, THIN, geo, gaps),
      thick: edgesPath(edges, THICK, geo)
    };

    geo.subGrids = [];
    if (layout.subGrids.length > 1) {
      layout.subGrids.forEach(function (g) {
        geo.subGrids.push({ gridIndex: g.gridIndex, x: originX + g.originCol * CELL,
          y: originY + g.originRow * CELL, size: model.digits * CELL });
      });
    }

    const tint = tintOpt === true || (tintOpt === 'auto' &&
      model.unitMeta.some(function (m) { return m.kind === 'region'; }));
    geo.tint = tint;
    geo.regions = [];
    if (tint) {
      const byRegion = new Map();
      for (i = 0; i < n; i++) {
        const id = layout.cellRegion[i];
        if (!byRegion.has(id)) byRegion.set(id, []);
        byRegion.get(id).push(i);
      }
      Array.from(byRegion.keys()).sort(function (a, b) { return a - b; }).forEach(function (id) {
        const cells = byRegion.get(id);
        geo.regions.push({ id: id, token: (id % REGION_TINTS) + 1, cells: cells, d: cellsPath(cells, geo) });
      });
    }

    const colorOfCell = new Int32Array(n).fill(-1);
    geo.overlays = layout.overlays.map(function (ov, index) {
      const cells = Array.from(ov.cells);
      const m = /^cageColor(\d+)$/.exec(ov.kind);
      if (m !== null) cells.forEach(function (c) { colorOfCell[c] = Number(m[1]); });
      return { index: index, kind: ov.kind, group: overlayGroup(ov.kind), cells: cells,
        d: cellsPath(cells, geo) };
    });

    geo.cages = model.cages.map(function (cage, index) {
      const cells = Array.from(cage.cells);
      const top = sortedByRowCol(cells, layout.cellRow, layout.cellCol)[0];
      return {
        index: index, sum: cage.sum, cells: cells,
        d: cageOutline(cells, geo, CAGE_INSET),
        labelCell: top,
        labelX: geo.cellX[top] + CAGE_INSET + 2.4,
        labelY: geo.cellY[top] + CAGE_INSET + 8.6,
        color: colorOfCell[top]
      };
    });

    geo.signs = signList.map(function (s) {
      const dir = DIRECTIONS[s.direction] || DIRECTIONS.right;
      const x = originX + (s.midCol + 0.5) * CELL;
      const y = originY + (s.midRow + 0.5) * CELL;
      return { index: s.index, a: s.a, b: s.b, x: x, y: y, direction: s.direction, glyph: s.glyph,
        d: signPath(x, y, dir) };
    });

    geo.coords = null;
    if (coords) {
      const colUsed = new Uint8Array(cols);
      const rowUsed = new Uint8Array(rows);
      for (i = 0; i < n; i++) {
        colUsed[layout.cellCol[i]] = 1;
        rowUsed[layout.cellRow[i]] = 1;
      }
      geo.coords = { cols: [], rows: [] };
      for (let c = 0; c < cols; c++) {
        if (colUsed[c]) {
          geo.coords.cols.push({ text: coordLabel(c, true), x: originX + (c + 0.5) * CELL, y: originY - 4 });
        }
      }
      for (let r = 0; r < rows; r++) {
        if (rowUsed[r]) {
          geo.coords.rows.push({ text: String(r + 1), x: originX - 4, y: originY + (r + 0.5) * CELL });
        }
      }
    }

    geo.value = { font: model.cages.length > 0 ? 22 : 24, shiftY: model.cages.length > 0 ? 2.5 : 0 };
    perModel.set(cacheKey, geo);
    return geo;
  }

  function coordLabel(index, letters) {
    if (!letters) return String(index + 1);
    let s = '';
    let k = index;
    do {
      s = String.fromCharCode(65 + (k % 26)) + s;
      k = Math.floor(k / 26) - 1;
    } while (k >= 0);
    return s;
  }

  function emptyGlyph() {
    return { text: null, shape: null, colorIndex: null, label: '' };
  }

  function glyphOf(mode, value, model, aux) {
    if (SG.symbols && typeof SG.symbols.glyph === 'function') {
      return SG.symbols.glyph(mode, value, model, { colorAuxSymbol: aux, label: false });
    }
    const labels = model.symbols && model.symbols.labels;
    return { text: labels && labels[value - 1] !== undefined ? String(labels[value - 1]) : String(value),
      shape: null, colorIndex: null, label: '' };
  }

  /** What one cell shows, from the board state. `kind` is 'empty' | 'placed' | 'given' | 'solution'; `value` the shown value (the solution value counts); `stateClass` the state of the background; `color` the colour-mode class of the background (' cell--c3' or ''); `aux`: draw the geometric symbol in colour mode. */
  function cellView(model, st, i, mode, aux) {
    const actual = st.values[i] | 0;
    const state = st.states ? st.states[i] : undefined;
    let shown = actual;
    let kind = 'empty';
    if (actual > 0) {
      kind = (st.givens && st.givens[i] > 0) || state === 'given' ? 'given' : 'placed';
    } else if (st.solution && st.solution[i] > 0) {
      shown = st.solution[i];
      kind = 'solution';
    }
    const g = shown > 0 ? glyphOf(mode, shown, model, aux) : emptyGlyph();
    const text = g.text === null ? '' : g.text;
    let stateClass = 'empty';
    if (actual > 0) stateClass = kind;
    else if (state === 'backtracked') stateClass = 'backtracked';
    let color = '';
    if (g.colorIndex !== null) {
      color = ' cell--c' + (g.colorIndex + 1) + (kind === 'solution' ? ' cell--sol' : '');
    }
    return {
      kind: kind, value: shown, stateClass: stateClass, color: color, text: text,
      lenClass: text.length >= 3 ? ' val--l3' : text.length === 2 ? ' val--l2' : '',
      shape: g.shape
    };
  }

  function rectClass(cv) {
    return 'cell cell--' + cv.stateClass + cv.color;
  }

  function textClass(cv) {
    return 'val val--' + cv.kind + cv.lenClass;
  }

  function useClass(cv, hasAux) {
    return cv.shape === null ? 'sym sym--off' : 'sym sym--' + cv.kind + (hasAux ? ' sym--aux' : '');
  }

  function hiddenClass(opts, name) {
    return opts.hiddenLayers && opts.hiddenLayers.indexOf(name) !== -1 ? ' is-hidden' : '';
  }

  function group(cls, layer, opts, inner, attrs) {
    return '<g class="' + cls + hiddenClass(opts, layer) + '" data-layer="' + layer + '"' +
      (attrs || '') + '>' +
      inner + '</g>';
  }

  function stateOf(model, state) {
    const n = model.cellCount;
    const st = state || {};
    return {
      values: st.values || new Int32Array(n),
      states: st.states || null,
      givens: st.givens || null,
      solution: st.solution || null
    };
  }

  /** Inner markup of the board SVG (everything inside the root element), without title and description unless `opts.title` is given. `opts.inline` = export form: no <use>, no data attributes, no empty elements, no <defs>. */
  function renderMarkup(model, state, opts) {
    const o = opts || {};
    const st = stateOf(model, state);
    const geo = geometry(model, o);
    const mode = o.symbolMode || 'digits';
    const aux = o.colorAuxSymbol !== false;
    const inline = o.inline === true;
    const prefix = o.idPrefix || 'sgb';
    const n = model.cellCount;
    const half = CELL / 2;
    let out = '';
    let i;

    if (o.title !== undefined) {
      out += '<title id="' + esc(o.titleId || 'board-title') + '">' + esc(o.title) + '</title>';
      out += '<desc id="' + esc(o.descId || 'board-desc') + '">' + esc(o.desc || '') + '</desc>';
    }

    if (!inline) {
      out += '<defs>';
      (SG.symbols ? SG.symbols.DEFAULT_AUX_SHAPES : []).forEach(function (shape) {
        out += '<path id="' + prefix + '-' + shape + '" fill-rule="evenodd" d="' +
          SG.symbols.shapePath(shape, 0, 0) + '"/>';
      });
      out += '</defs>';
    }

    let regions = '<path class="paper" d="' + geo.paths.paper + '"/>';
    if (geo.regions.length > 0) {
      regions += group('tint', 'regions', o, geo.regions.map(function (r) {
        return '<path class="reg reg--' + r.token + '" d="' + r.d + '"/>';
      }).join(''));
    }
    ['overlays', 'word', 'cages'].forEach(function (name) {
      const list = geo.overlays.filter(function (ov) { return ov.group === name; });
      if (list.length === 0) return;
      regions += group('ovs ovs--' + name, name, o, list.map(function (ov) {
        const m = /^cageColor(\d+)$/.exec(ov.kind);
        const cls = m !== null ? 'ov ov--cage' + (Number(m[1]) % CAGE_COLORS) :
          'ov ov--' + ov.kind.replace(/[^\w-]/g, '');
        return '<path class="' + cls + '" d="' + ov.d + '"/>';
      }).join(''));
    });
    out += '<g class="layer-regions">' + regions + '</g>';

    let cellRects = '';
    const cvs = new Array(n);
    for (i = 0; i < n; i++) {
      cvs[i] = cellView(model, st, i, mode, aux);
      if (inline && cvs[i].color === '') continue;
      cellRects += '<rect class="' + rectClass(cvs[i]) + '"' +
        (inline ? '' : ' data-cell="' + i + '" data-row="' + geo.cellRow[i] + '" data-col="' +
          geo.cellCol[i] + '"') +
        ' x="' + num(geo.cellX[i]) + '" y="' + num(geo.cellY[i]) + '" width="' + CELL + '" height="' + CELL +
        '"/>';
    }
    out += group('layer-cells', 'cells', o, cellRects);

    if (geo.cages.length > 0) {
      let cages = '';
      geo.cages.forEach(function (cage) {
        cages += '<path class="cage-line" d="' + cage.d + '"/>';
      });
      geo.cages.forEach(function (cage) {
        cages += '<text class="cage-sum" x="' + num(cage.labelX) + '" y="' + num(cage.labelY) + '">' +
          esc(cage.sum) + '</text>';
      });
      out += group('layer-cages', 'cages', o, cages);
    } else {
      out += group('layer-cages', 'cages', o, '');
    }

    out += group('layer-ineq', 'ineq', o, geo.signs.map(function (s) {
      return '<path class="sign" d="' + s.d + '"' + (inline ? '' : ' data-sign="' + s.index + '"') + '/>';
    }).join(''));

    const vx = half;
    const vy = half + geo.value.shiftY;
    let values = '';
    for (i = 0; i < n; i++) {
      const cv = cvs[i];
      const cx = geo.cellX[i] + vx;
      const cy = geo.cellY[i] + vy;
      if (inline) {
        if (cv.text !== '') {
          values += '<text class="' + textClass(cv) + '" x="' + num(cx) + '" y="' + num(cy) +
            '" dy="0.35em" text-anchor="middle">' + esc(cv.text) + '</text>';
        }
        if (cv.shape !== null) {
          values += '<path class="sym sym--' + cv.kind + (cv.color !== '' ? ' sym--aux' : '') +
            '" fill-rule="evenodd" d="' + SG.symbols.shapePath(cv.shape, cx, cy) + '"/>';
        }
        continue;
      }
      values += '<text class="' + textClass(cv) + '" data-cell="' + i + '" x="' + num(cx) + '" y="' +
        num(cy) + '" dy="0.35em" text-anchor="middle">' + esc(cv.text) + '</text>';
      values += '<use class="' + useClass(cv, cv.color !== '') + '" data-cell="' + i + '" href="#' + prefix +
        '-' + (cv.shape || 'circle') + '" x="' + num(cx) + '" y="' + num(cy) + '"/>';
    }
    out += group('layer-values', 'values', o, values, ' style="font-size:' + geo.value.font + 'px"');

    let grid = '';
    if (geo.paths.thin !== '') grid += '<path class="grid-thin" d="' + geo.paths.thin + '"/>';
    if (geo.paths.thick !== '') grid += '<path class="grid-thick" d="' + geo.paths.thick + '"/>';
    geo.subGrids.forEach(function (g) {
      grid += '<rect class="grid-sub" x="' + num(g.x) + '" y="' + num(g.y) + '" width="' + g.size +
        '" height="' + g.size + '"/>';
    });
    if (geo.coords !== null) {
      let labels = '';
      geo.coords.cols.forEach(function (c) {
        labels += '<text class="coord" x="' + num(c.x) + '" y="' + num(c.y) + '" text-anchor="middle">' +
          esc(c.text) + '</text>';
      });
      geo.coords.rows.forEach(function (r) {
        labels += '<text class="coord" x="' + num(r.x) + '" y="' + num(r.y) +
          '" dy="0.35em" text-anchor="end">' + esc(r.text) + '</text>';
      });
      grid += group('coords', 'coords', o, labels);
    }
    out += group('layer-grid', 'grid', o, grid);

    out += group('layer-overlay', 'overlay', o, '');
    return out;
  }

  /**
   * Static rules of a standalone SVG, written against the board tokens (`var(--sg-board-*)`); `exportSvg`
   * replaces each `var()` by the resolved light-theme value. Keep in step with css/board.css.
   */
  function staticCss() {
    const r = [];
    let k;
    r.push('.paper{fill:var(--sg-board-paper)}');
    for (k = 1; k <= REGION_TINTS; k++) r.push('.reg--' + k + '{fill:var(--sg-board-region-' + k + ')}');
    r.push('.ov{fill:var(--sg-board-overlay-overlap)}');
    r.push('.ov--diag{fill:var(--sg-board-overlay-diag)}');
    r.push('.ov--window{fill:var(--sg-board-overlay-window)}');
    r.push('.ov--overlap{fill:var(--sg-board-overlay-overlap)}');
    r.push('.ov--wordLine{fill:var(--sg-board-overlay-word)}');
    for (k = 0; k < CAGE_COLORS; k++) r.push('.ov--cage' + k + '{fill:var(--sg-board-cage-' + k + ')}');
    r.push('.cell{fill:none}');
    for (k = 1; k <= 16; k++) r.push('.cell--c' + k + '{fill:var(--sg-board-sym-' + k + ')}');
    r.push('.cell--sol{fill-opacity:.45}');
    r.push('.grid-thin{fill:none;stroke:var(--sg-board-line-thin);stroke-width:var(--sg-board-width-thin)}');
    r.push('.grid-thick{fill:none;stroke:var(--sg-board-line-thick);' +
      'stroke-width:var(--sg-board-width-thick);stroke-linecap:square}');
    r.push('.grid-sub{fill:none;stroke:var(--sg-board-line-subgrid);' +
      'stroke-width:var(--sg-board-width-subgrid)}');
    r.push('.cage-line{fill:none;stroke:var(--sg-board-cage-line);stroke-width:var(--sg-board-cage-width);' +
      'stroke-dasharray:var(--sg-board-cage-dash);stroke-linejoin:round}');
    r.push('.cage-sum{fill:var(--sg-board-ink-sum);font-family:var(--sg-font-family);font-size:' + CAGE_FONT +
      'px;font-weight:600}');
    r.push('.sign{fill:none;stroke:var(--sg-board-sign);stroke-width:var(--sg-board-sign-width);' +
      'stroke-linecap:round;stroke-linejoin:round}');
    r.push('.val{font-family:var(--sg-font-family);text-anchor:middle}');
    r.push('.val--given{fill:var(--sg-board-ink-given);font-weight:var(--sg-board-weight-given)}');
    r.push('.val--placed{fill:var(--sg-board-ink-placed);font-weight:var(--sg-board-weight-placed)}');
    r.push('.val--solution{fill:var(--sg-board-ink-solution);font-style:italic;' +
      'font-weight:var(--sg-board-weight-placed)}');
    r.push('.val--l2{font-size:.78em}');
    r.push('.val--l3{font-size:.6em}');
    r.push('.sym--given{fill:var(--sg-board-ink-given)}');
    r.push('.sym--placed{fill:var(--sg-board-ink-placed)}');
    r.push('.sym--solution{fill:var(--sg-board-ink-solution);opacity:.7}');
    r.push('.sym--aux{fill:var(--sg-board-sym-ink);stroke:var(--sg-board-sym-edge);stroke-width:1.4;' +
      'stroke-linejoin:round}');
    r.push('.coord{fill:var(--sg-board-ink-coord);font-family:var(--sg-font-family);font-size:10px}');
    r.push('.is-hidden{display:none}');
    return r.join('\n');
  }

  const TOKEN_NAMES = (function () {
    const found = ['--sg-font-family'];
    staticCss().replace(/var\((--[\w-]+)\)/g, function (m, name) {
      if (found.indexOf(name) === -1) found.push(name);
      return m;
    });
    return Object.freeze(found);
  })();

  /** A standalone SVG document of a board state. `tokens`: resolved values of `TOKEN_NAMES` (the caller reads them from the light theme; a missing one becomes `currentColor`); `opts.scale`: width and height attributes = viewBox size * scale (default 1). */
  function exportSvg(model, state, opts, tokens) {
    const o = Object.assign({}, opts || {}, { inline: true });
    const geo = geometry(model, o);
    const values = tokens || {};
    const scale = o.scale > 0 ? o.scale : 1;
    const css = staticCss().replace(/var\((--[\w-]+)\)/g, function (m, name) {
      const v = values[name];
      if (v !== undefined && v !== '') return v;
      return name === '--sg-font-family' ? 'sans-serif' : 'currentColor';
    });
    const title = o.title !== undefined ? o.title : model.variantId;
    const inner = renderMarkup(model, state, Object.assign({}, o, { title: title, titleId: 'sgb-title',
      descId: 'sgb-desc' }));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="sgb-title sgb-desc" ' +
      'viewBox="0 0 ' + geo.width + ' ' + geo.height + '" width="' + num(geo.width * scale) + '" height="' +
      num(geo.height * scale) + '">\n<style>' + css + '</style>\n' +
      '<rect class="paper" x="0" y="0" width="' + geo.width + '" height="' + geo.height + '"/>\n' +
      inner + '\n</svg>\n';
  }

  function normalizeHighlightClass(cls) {
    const c = cls === undefined || cls === null || cls === '' ? 'cell--probing' : String(cls);
    return c.indexOf('cell--') === 0 ? c : 'cell--' + c;
  }

  /** Builds the board into an `<svg>` element and returns the live view. The tree is built once; patches only change the class, text and `href` of the nodes of the cells they touch. */
  function create(svgEl, model, opts) {
    const options = Object.assign({ symbolMode: 'digits', showCoords: false, interactive: false,
      animate: true, colorAuxSymbol: true }, opts || {});
    const idPrefix = 'sgb' + (++viewCounter);
    const doc = svgEl.ownerDocument;
    const hidden = new Set();
    const hl = new Map();
    const timers = new Map();
    const durations = {};
    let st;
    let n;
    let geo;
    let mode = options.symbolMode;
    let aux = options.colorAuxSymbol !== false;
    let animate = options.animate !== false;
    let titleEl = null;
    let descEl = null;
    let layerOverlay = null;
    let rects = [];
    let texts = [];
    let uses = [];
    let sRect = [];
    let sTextCls = [];
    let sText = [];
    let sUseCls = [];
    let sHref = [];
    let sView = [];
    let trans;
    let lastActual;
    let unsubscribe = null;
    /** Marks of the Greater-Than signs, by sign index: `{ hidden, removed, kept }` sets, or null. */
    let signMarks = null;
    let destroyed = false;
    const motionQuery = typeof root.matchMedia === 'function' ?
      root.matchMedia('(prefers-reduced-motion: reduce)') : null;

    function motionOn() {
      if (!animate) return false;
      if (doc && doc.documentElement && doc.documentElement.getAttribute('data-motion') === 'off') {
        return false;
      }
      return !(motionQuery && motionQuery.matches);
    }

    function durationMs(token, fallback) {
      if (durations[token] !== undefined) return durations[token];
      let ms = fallback;
      try {
        const raw = root.getComputedStyle(svgEl).getPropertyValue(token).trim();
        const v = parseFloat(raw);
        if (v >= 0 && /ms$/.test(raw)) ms = v;
        else if (v >= 0 && /s$/.test(raw)) ms = v * 1000;
      } catch (err) {
        ms = fallback;
      }
      durations[token] = ms;
      return ms;
    }

    function later(key, fn, ms) {
      const old = timers.get(key);
      if (old !== undefined) root.clearTimeout(old);
      timers.set(key, root.setTimeout(function () {
        timers.delete(key);
        if (!destroyed) fn();
      }, ms));
    }

    function markupOptions() {
      return { symbolMode: mode, showCoords: options.showCoords, colorAuxSymbol: aux, idPrefix: idPrefix,
        hiddenLayers: Array.from(hidden) };
    }

    function stateOfView() {
      return { values: st.values, states: st.states, givens: st.givens, solution: st.solution };
    }

    function setClass(el, cls) {
      el.setAttribute('class', cls);
    }

    function rectCls(i, cv) {
      return rectClass(cv) + ((trans[i] & TRANS_BACKTRACK) !== 0 ? ' cell--backtrack' : '');
    }

    function textCls(i, cv) {
      return textClass(cv) + ((trans[i] & TRANS_PLACING) !== 0 ? ' cell--placing' : '') +
        ((trans[i] & TRANS_REMOVING) !== 0 ? ' cell--removed' : '');
    }

    function useCls(i, cv) {
      return useClass(cv, cv.color !== '') + ((trans[i] & TRANS_PLACING) !== 0 ? ' cell--placing' : '') +
        ((trans[i] & TRANS_REMOVING) !== 0 ? ' cell--removed' : '');
    }

    /** Ends the one-shot animation state of a cell once its animation is over (no animationend needed). */
    function endTransient(i, token, fallback) {
      later(i, function () {
        trans[i] = 0;
        renderCell(i, false);
      }, durationMs(token, fallback) + 60);
    }

    /** Writes only what differs from what is shown. `flash`: the patch wrote the state 'backtracked' to this cell: flash it red even if it was empty before (a conflicting guess never held a value). */
    function renderCell(i, anim, flash) {
      const actual = st.values[i] | 0;
      const prev = lastActual[i];
      lastActual[i] = actual;
      if (actual > 0) trans[i] &= ~TRANS_REMOVING;
      if (anim && motionOn()) {
        const backtracked = actual === 0 && st.states[i] === 'backtracked';
        if (actual > 0 && prev === 0) {
          trans[i] |= TRANS_PLACING;
          endTransient(i, '--sg-board-dur-placing', 120);
        } else if (actual === 0 && prev > 0 && !backtracked) {
          trans[i] |= TRANS_REMOVING;
          endTransient(i, '--sg-board-dur-removed', 200);
        }
        if (backtracked && flash === true) {
          if ((trans[i] & TRANS_BACKTRACK) !== 0) {
            // Same cell flashed again before the last flash ended: restart the animation.
            setClass(rects[i], rectClass(sView[i]));
            sRect[i] = rectClass(sView[i]);
            void rects[i].getBoundingClientRect();
          }
          trans[i] |= TRANS_BACKTRACK;
          endTransient(i, '--sg-board-dur-backtrack', 180);
        }
      }
      let cv = cellView(model, st, i, mode, aux);
      if ((trans[i] & TRANS_REMOVING) !== 0) {
        // The removed value stays on screen until its fade-out is over.
        cv = Object.assign({}, sView[i], { stateClass: cv.stateClass });
      }
      sView[i] = cv;
      const rc = rectCls(i, cv);
      if (rc !== sRect[i]) {
        setClass(rects[i], rc);
        sRect[i] = rc;
      }
      const tc = textCls(i, cv);
      if (tc !== sTextCls[i]) {
        setClass(texts[i], tc);
        sTextCls[i] = tc;
      }
      if (cv.text !== sText[i]) {
        texts[i].textContent = cv.text;
        sText[i] = cv.text;
      }
      const uc = useCls(i, cv);
      if (uc !== sUseCls[i]) {
        setClass(uses[i], uc);
        sUseCls[i] = uc;
      }
      if (cv.shape !== null) {
        const href = '#' + idPrefix + '-' + cv.shape;
        if (href !== sHref[i]) {
          uses[i].setAttribute('href', href);
          sHref[i] = href;
        }
      }
    }

    function renderAll() {
      for (let i = 0; i < n; i++) renderCell(i, false);
    }

    function refreshText() {
      if (titleEl === null) return;
      let filled = 0;
      for (let i = 0; i < n; i++) if (st.values[i] > 0) filled++;
      titleEl.textContent = translate('board.title', { variant: translate('variant.' + model.variantId) });
      let desc = translate('board.desc', { rows: geo.rows, cols: geo.cols, filled: filled, total: n });
      if (model.cages.length > 0) desc += ' ' + translate('board.desc.cages', { count: model.cages.length });
      if (model.inequalities.length > 0) {
        desc += ' ' + translate('board.desc.signs', { count: model.inequalities.length });
      }
      descEl.textContent = desc;
    }

    function removeHighlight(i) {
      const e = hl.get(i);
      if (e === undefined) return;
      const pending = timers.get('h' + i);
      if (pending !== undefined) {
        root.clearTimeout(pending);
        timers.delete('h' + i);
      }
      if (e.el.parentNode !== null) e.el.parentNode.removeChild(e.el);
      hl.delete(i);
    }

    function addHighlight(i, cls) {
      if (!(i >= 0 && i < n)) return;
      if (cls === 'cell--restored' && !motionOn()) return;
      const existing = hl.get(i);
      if (existing !== undefined) {
        if (existing.cls !== cls) {
          setClass(existing.el, 'hl ' + cls);
          existing.cls = cls;
        }
        return;
      }
      const el = doc.createElementNS(SVG_NS, 'rect');
      setClass(el, 'hl ' + cls);
      el.setAttribute('data-hl', String(i));
      el.setAttribute('x', num(geo.cellX[i] + 1.5));
      el.setAttribute('y', num(geo.cellY[i] + 1.5));
      el.setAttribute('width', String(CELL - 3));
      el.setAttribute('height', String(CELL - 3));
      layerOverlay.appendChild(el);
      hl.set(i, { el: el, cls: cls });
      if (cls === 'cell--restored') {
        later('h' + i, function () { removeHighlight(i); }, durationMs('--sg-board-dur-restored', 300) + 60);
      }
    }

    function resetTransient() {
      timers.forEach(function (t, key) {
        if (typeof key === 'number') {
          root.clearTimeout(t);
          timers.delete(key);
        }
      });
      trans.fill(0);
    }

    function applySignMarks() {
      const list = svgEl.querySelectorAll('[data-sign]');
      for (let k = 0; k < list.length; k++) {
        const el = list[k];
        const i = Number(el.getAttribute('data-sign'));
        const m = signMarks;
        el.classList.toggle('sign--hidden', m !== null && m.hidden.has(i));
        el.classList.toggle('sign--removed', m !== null && m.removed.has(i));
        el.classList.toggle('sign--kept', m !== null && m.kept.has(i));
      }
    }

    function onClick(ev) {
      if (!options.interactive || typeof options.onCellClick !== 'function') return;
      const el = ev.target && typeof ev.target.closest === 'function' ?
        ev.target.closest('[data-cell]') : null;
      if (el === null || !svgEl.contains(el)) return;
      options.onCellClick(Number(el.getAttribute('data-cell')), ev);
    }

    function collect() {
      rects = new Array(n);
      texts = new Array(n);
      uses = new Array(n);
      const rectList = svgEl.querySelectorAll('.layer-cells > rect.cell');
      const textList = svgEl.querySelectorAll('.layer-values > text.val');
      const useList = svgEl.querySelectorAll('.layer-values > use.sym');
      function index(el) {
        return Number(el.getAttribute('data-cell'));
      }
      for (let k = 0; k < rectList.length; k++) rects[index(rectList[k])] = rectList[k];
      for (let k = 0; k < textList.length; k++) texts[index(textList[k])] = textList[k];
      for (let k = 0; k < useList.length; k++) uses[index(useList[k])] = useList[k];
      layerOverlay = svgEl.querySelector('.layer-overlay');
    }

    function snapshotShown() {
      sRect = new Array(n);
      sTextCls = new Array(n);
      sText = new Array(n);
      sUseCls = new Array(n);
      sHref = new Array(n);
      sView = new Array(n);
      for (let i = 0; i < n; i++) {
        const cv = cellView(model, st, i, mode, aux);
        sView[i] = cv;
        sRect[i] = rectClass(cv);
        sTextCls[i] = textClass(cv);
        sText[i] = cv.text;
        sUseCls[i] = useClass(cv, cv.color !== '');
        sHref[i] = '#' + idPrefix + '-' + (cv.shape === null ? 'circle' : cv.shape);
        lastActual[i] = st.values[i] | 0;
      }
    }

    function build() {
      geo = geometry(model, options);
      trans = new Uint8Array(n);
      lastActual = new Int32Array(n);
      hl.clear();
      timers.forEach(function (t) { root.clearTimeout(t); });
      timers.clear();

      titleEl = svgEl.querySelector(':scope > title');
      descEl = svgEl.querySelector(':scope > desc');
      if (titleEl !== null) svgEl.removeChild(titleEl);
      if (descEl !== null) svgEl.removeChild(descEl);
      svgEl.innerHTML = renderMarkup(model, stateOfView(), markupOptions());
      if (titleEl === null) {
        titleEl = doc.createElementNS(SVG_NS, 'title');
        titleEl.setAttribute('id', 'board-title');
      }
      if (descEl === null) {
        descEl = doc.createElementNS(SVG_NS, 'desc');
        descEl.setAttribute('id', 'board-desc');
      }
      titleEl.removeAttribute('data-i18n');
      descEl.removeAttribute('data-i18n');
      svgEl.insertBefore(descEl, svgEl.firstChild);
      svgEl.insertBefore(titleEl, descEl);

      svgEl.setAttribute('viewBox', '0 0 ' + geo.width + ' ' + geo.height);
      svgEl.setAttribute('role', 'img');
      svgEl.setAttribute('aria-labelledby', titleEl.getAttribute('id') + ' ' + descEl.getAttribute('id'));
      svgEl.setAttribute('data-variant', model.variantId);
      svgEl.setAttribute('data-symbols', mode);
      svgEl.classList.add('sgb');
      svgEl.classList.toggle('board--interactive', options.interactive === true);
      svgEl.classList.toggle('board--animate-off', !animate);
      svgEl.setAttribute('data-animate', animate ? 'on' : 'off');
      collect();
      applySignMarks();
      snapshotShown();
      refreshText();
    }

    function resolveState(values) {
      const next = {
        values: new Int32Array(n),
        states: new Array(n).fill('empty'),
        givens: null,
        solution: null
      };
      if (values) {
        for (let i = 0; i < n; i++) {
          next.values[i] = values[i] | 0;
          next.states[i] = next.values[i] > 0 ? 'placed' : 'empty';
        }
      }
      return next;
    }

    n = model.cellCount;
    st = resolveState(null);
    build();
    svgEl.addEventListener('click', onClick);
    if (SG.i18n && typeof SG.i18n.onChange === 'function') unsubscribe = SG.i18n.onChange(refreshText);

    const view = {
      svg: svgEl,

      /** Applies one event patch: cells first, then unhighlight, then highlight. `popts.animate: false` skips the one-shot animation of this patch; `popts.highlightClass` names the highlight style (default `options.highlightClass`, else 'cell--probing'). */
      applyPatch: function applyPatch(patch, popts) {
        const anim = !popts || popts.animate !== false;
        const cells = patch.cells;
        let k;
        if (cells) {
          for (k = 0; k < cells.length; k++) {
            const c = cells[k];
            if (!(c.i >= 0 && c.i < n)) continue;
            st.values[c.i] = c.value | 0;
            st.states[c.i] = c.state || (c.value ? 'placed' : 'empty');
            renderCell(c.i, anim, c.state === 'backtracked');
          }
        }
        if (patch.unhighlight) {
          for (k = 0; k < patch.unhighlight.length; k++) removeHighlight(patch.unhighlight[k]);
        }
        if (patch.highlight) {
          const cls = normalizeHighlightClass(popts && popts.highlightClass !== undefined ?
            popts.highlightClass : options.highlightClass);
          for (k = 0; k < patch.highlight.length; k++) addHighlight(patch.highlight[k], cls);
        }
      },

      /** Replaces every value at once (no animation); `states` ('empty' | 'placed' | 'given' | 'backtracked' per cell) default by value. */
      setValues: function setValues(values, states) {
        resetTransient();
        for (let i = 0; i < n; i++) {
          st.values[i] = values[i] | 0;
          st.states[i] = states && states[i] ? states[i] : st.values[i] > 0 ? 'placed' : 'empty';
          lastActual[i] = st.values[i];
        }
        renderAll();
        refreshText();
      },

      setGivens: function setGivens(givens) {
        st.givens = givens ? Int32Array.from(givens) : null;
        renderAll();
      },

      showSolution: function showSolution(solution) {
        st.solution = solution ? Int32Array.from(solution) : null;
        renderAll();
      },

      /** `cls`: 'cell--probing' (default), 'cell--technique', 'cell--restored', 'cell--selected' or any class defined in css/board.css; the 'cell--' prefix is optional. */
      highlight: function highlight(cells, cls) {
        const c = normalizeHighlightClass(cls !== undefined ? cls : options.highlightClass);
        for (let k = 0; k < cells.length; k++) addHighlight(cells[k], c);
      },

      unhighlight: function unhighlight(cells) {
        for (let k = 0; k < cells.length; k++) removeHighlight(cells[k]);
      },

      clearHighlights: function clearHighlights() {
        Array.from(hl.keys()).forEach(removeHighlight);
      },

      /** Marks Greater-Than signs by their index in `model.inequalities` (the `data-sign` attribute): `hidden` are not drawn, `removed` are drawn faded (signs the step on show takes away), `kept` in the colour of a restored cell (signs that had to stay). The marks survive a rebuild of the tree; `null` clears them. */
      setSignMarks: function setSignMarks(marks) {
        signMarks = marks ? {
          hidden: new Set(marks.hidden || []),
          removed: new Set(marks.removed || []),
          kept: new Set(marks.kept || [])
        } : null;
        applySignMarks();
      },

      setSymbolMode: function setSymbolMode(next) {
        if (next === mode) return;
        mode = next;
        svgEl.setAttribute('data-symbols', mode);
        resetTransient();
        renderAll();
      },

      setColorAuxSymbol: function setColorAuxSymbol(flag) {
        aux = flag !== false;
        renderAll();
      },

      setLayerVisible: function setLayerVisible(name, visible) {
        if (visible === false) hidden.add(name);
        else hidden.delete(name);
        const list = svgEl.querySelectorAll('[data-layer="' + name + '"]');
        for (let k = 0; k < list.length; k++) list[k].classList.toggle('is-hidden', visible === false);
      },

      isLayerVisible: function isLayerVisible(name) {
        return !hidden.has(name);
      },

      setAnimate: function setAnimate(flag) {
        animate = flag !== false;
        svgEl.setAttribute('data-animate', animate ? 'on' : 'off');
        svgEl.classList.toggle('board--animate-off', !animate);
        if (!animate) {
          resetTransient();
          renderAll();
        }
      },

      setInteractive: function setInteractive(flag) {
        options.interactive = flag === true;
        svgEl.classList.toggle('board--interactive', options.interactive);
      },

      setOnCellClick: function setOnCellClick(fn) {
        options.onCellClick = fn;
      },

      setShowCoords: function setShowCoords(flag) {
        if ((flag === true) === (options.showCoords === true)) return;
        options.showCoords = flag === true;
        build();
      },

      /** Replaces the model (for example the final model with its cages) and redraws; values are kept. */
      setModel: function setModel(next) {
        const old = st;
        model = next;
        n = model.cellCount;
        st = resolveState(null);
        if (old.values.length === n) {
          st.values.set(old.values);
          st.states = old.states.slice();
          st.givens = old.givens;
          st.solution = old.solution;
        }
        build();
      },

      refreshText: refreshText,

      pulseDone: function pulseDone() {
        if (!motionOn()) return;
        svgEl.classList.remove('board--done');
        svgEl.classList.add('board--done');
        later('done', function () { svgEl.classList.remove('board--done'); },
          durationMs('--sg-board-dur-done', 500) + 60);
      },

      /** @returns {?Element} The background rect of cell i (carries `data-cell`, `data-row`, `data-col`). */
      getCellElement: function getCellElement(i) {
        return rects[i] || null;
      },

      getGeometry: function getGeometry() {
        return geo;
      },

      getState: function getState() {
        return { values: Int32Array.from(st.values), states: st.states.slice() };
      },

      toSvgString: function toSvgString(exportOptions) {
        const eo = Object.assign({}, markupOptions(),
          { title: titleEl.textContent, desc: descEl.textContent },
          exportOptions || {});
        return exportSvg(model, stateOfView(), eo, resolveTokens('light'));
      },

      /** Renders the standalone SVG onto a canvas (browser only); the PNG is viewBox size * `scale` (default 2) pixels. */
      toPngBlob: function toPngBlob(scale) {
        const k = scale > 0 ? scale : 2;
        const text = view.toSvgString({ scale: 1 });
        return svgToPngBlob(text, Math.round(geo.width * k), Math.round(geo.height * k), doc);
      },

      destroy: function destroy() {
        destroyed = true;
        timers.forEach(function (t) { root.clearTimeout(t); });
        timers.clear();
        svgEl.removeEventListener('click', onClick);
        if (unsubscribe !== null) unsubscribe();
        unsubscribe = null;
        hl.clear();
        svgEl.innerHTML = '';
        svgEl.classList.remove('sgb', 'board--interactive', 'board--done', 'board--animate-off');
      }
    };
    return view;
  }

  /** Resolved values of the board tokens (and the font family) for a theme, read from a probe element with `data-sg-theme` (see css/tokens-board.css), so `<html data-theme>` is never touched. Browser only. */
  function resolveTokens(theme) {
    const out = {};
    if (typeof document === 'undefined' || !document.body) return out;
    const probe = document.createElement('div');
    probe.setAttribute('data-sg-theme', theme || 'light');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.display = 'none';
    document.body.appendChild(probe);
    try {
      const cs = root.getComputedStyle(probe);
      TOKEN_NAMES.forEach(function (name) { out[name] = cs.getPropertyValue(name).trim(); });
    } finally {
      document.body.removeChild(probe);
    }
    return out;
  }

  function svgToPngBlob(svgText, width, height, doc) {
    return new Promise(function (resolve, reject) {
      const img = new root.Image();
      img.onload = function () {
        const canvas = doc.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(function (blob) {
          if (blob === null) reject(new Error('PNG export failed'));
          else resolve(blob);
        }, 'image/png');
      };
      img.onerror = function () { reject(new Error('SVG could not be rendered')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    });
  }

  SG.boardView = {
    CELL: CELL,
    MARGIN: MARGIN,
    LAYERS: LAYERS,
    TOKEN_NAMES: TOKEN_NAMES,
    create: create,
    geometry: geometry,
    renderMarkup: renderMarkup,
    exportSvg: exportSvg,
    cellView: cellView,
    staticCss: staticCss,
    resolveTokens: resolveTokens
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'board.title': 'Sudoku board: {variant}',
      'board.desc': '{rows} by {cols} grid, {filled} of {total} cells filled.',
      'board.desc.cages': 'It has {count} cages, each showing its sum.',
      'board.desc.signs': 'It has {count} inequality signs between cells.'
    },
    vi: {
      'board.title': 'Bảng Sudoku: {variant}',
      'board.desc': 'Lưới {rows} × {cols}, đã điền {filled} trên {total} ô.',
      'board.desc.cages': 'Có {count} nhóm ô, mỗi nhóm ghi tổng của nó.',
      'board.desc.signs': 'Có {count} dấu so sánh giữa các ô.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
