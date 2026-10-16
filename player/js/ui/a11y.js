/**
 * Accessibility (design.md 8.4): `SG.a11y`. Everything the page needs on top of the markup of the other
 * modules, added through the app events and the DOM, never by changing their code:
 *
 *   - the board as an ARIA grid: the root `<svg>` gets `role="grid"` (the title and description stay its
 *     name and description), the cell rectangles of `layer-cells` are moved into `<g role="row">` groups and
 *     get `role="gridcell"`, `aria-rowindex` / `aria-colindex` (canvas position: the holes of a multi-grid
 *     canvas are simply not there) and a translated `aria-label`; every other layer is `aria-hidden` (the
 *     label carries the value, the cage sum and the signs). One cell is in the tab order (roving tabindex);
 *     arrow keys, Home, End, Ctrl+Home, Ctrl+End, Page Up and Page Down move between REAL cells (holes are
 *     skipped); Enter and Space send the click of the cell to the board when it has a click hook
 *     (`setInteractive(true)` + `setOnCellClick`). A focus ring is drawn on top of the board
 *     (`.a11y-ring`). The grid is editable (`aria-readonly="false"`): play.js owns the entries.
 *   - labels follow the DOM of the board: a MutationObserver on the value and cell layers re-labels only the
 *     cells that changed, a locale change re-labels all of them. The board view rebuilds its tree for each
 *     puzzle; the semantics are applied again by themselves.
 *   - the Settings dialog (`action {id: 'settings'}` -> `SG.app.openModal`): language, theme, text size,
 *     reduced motion, the colour-blind symbol, the check mode, the notes behaviour and the board
 *     coordinates, all through the store (`SG.store`).
 *   - the skip link moves the focus to `#main`; toasts and live announcements stay visible and audible while
 *     a modal dialog is open.
 *
 * Pure part (runs in Node, see tests/suites/a11y.test.js): `cellPosition`, `cellExtras`, `valueInfo`,
 * `cellLabel`, `moveTarget`, `pageStep`.
 *
 * PUBLIC API (`SG.a11y`)
 *   init(app)            idempotent; called by app.js at start-up. Returns true when it is running.
 *   destroy()            removes every listener / observer and the semantics added to the board.
 *   openSettings()       opens the Settings dialog (the 'settings' action does the same); returns the modal.
 *   closeSettings()      closes it.
 *   getGrid()            the board grid controller (or null): `{ labelOf(i), focusCell(i), current(),
 *                        refresh(), apply(), destroy() }`. 'cellfocus' ({ cell }) is emitted through
 *                        `SG.app.emit` whenever a cell takes the focus.
 *   attachGrid(board, hooks?)  the grid controller itself, for another board view.
 *   Pure helpers listed above, plus `NAV_KEYS`, `THEME_CHOICES`, `FONT_CHOICES`, `LANG_CHOICES`,
 *   `CHECK_CHOICES` (the data of the Settings dialog).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: the running page must survive.
  if (SG.a11y && typeof SG.a11y.init === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const NAV_KEYS = Object.freeze(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp',
    'PageDown']);
  const HIDDEN_LAYERS = Object.freeze(['regions', 'overlays', 'word', 'cages', 'ineq', 'values', 'grid',
    'coords', 'overlay']);

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  // ---------------------------------------------------------------------------------------------
  // Cell labels (pure)
  // ---------------------------------------------------------------------------------------------

  /**
   * Where a cell is, in the words of the puzzle. Single boards: `{ grid: 0, row, col }` (1-based). Multi-grid
   * boards: the coordinates are those of the first sub-grid that holds the cell (the numbering of
   * `SG.model.cellLabel`, 'G2-R4C7'), `shared` lists the other grids that hold it (the overlap cells).
   * @param {Object} geo  Board geometry: `cellRow`, `cellCol`, `subGrids`, `originX/Y`, `cell`.
   * @param {number} i  Cell index.
   * @returns {{grid: number, row: number, col: number, shared: number[]}}
   */
  function cellPosition(geo, i) {
    const row = geo.cellRow[i];
    const col = geo.cellCol[i];
    const grids = [];
    (geo.subGrids || []).forEach(function (g) {
      const r0 = Math.round((g.y - geo.originY) / geo.cell);
      const c0 = Math.round((g.x - geo.originX) / geo.cell);
      const size = Math.round(g.size / geo.cell);
      if (row >= r0 && row < r0 + size && col >= c0 && col < c0 + size) {
        grids.push({ grid: g.gridIndex + 1, row: row - r0 + 1, col: col - c0 + 1 });
      }
    });
    if (grids.length === 0) return { grid: 0, row: row + 1, col: col + 1, shared: [] };
    return {
      grid: grids[0].grid,
      row: grids[0].row,
      col: grids[0].col,
      shared: grids.slice(1).map(function (g) { return g.grid; })
    };
  }

  function directionOf(geo, from, to) {
    const dr = geo.cellRow[to] - geo.cellRow[from];
    const dc = geo.cellCol[to] - geo.cellCol[from];
    if (dr === 0 && dc === 1) return 'right';
    if (dr === 0 && dc === -1) return 'left';
    if (dr === 1 && dc === 0) return 'down';
    if (dr === -1 && dc === 0) return 'up';
    return null;
  }

  /**
   * What the label of a cell says besides its position and value: the cage sum (Killer) and the
   * inequality signs of its edges (Greater-Than; 'less' = the cell is smaller than that neighbour).
   * @param {Object} geo  Board geometry (`cages` [{cells, sum}], `signs` [{a, b}] with value[a] < value[b]).
   * @returns {{cage: Map<number, number>, relations: Map<number, Array<{rel: string, dir: string}>>}}
   */
  function cellExtras(geo) {
    const cage = new Map();
    const relations = new Map();
    (geo.cages || []).forEach(function (c) {
      c.cells.forEach(function (cell) { cage.set(cell, c.sum); });
    });
    function add(cell, rel, dir) {
      if (dir === null) return;
      if (!relations.has(cell)) relations.set(cell, []);
      relations.get(cell).push({ rel: rel, dir: dir });
    }
    (geo.signs || []).forEach(function (s) {
      add(s.a, 'less', directionOf(geo, s.a, s.b));
      add(s.b, 'greater', directionOf(geo, s.b, s.a));
    });
    return { cage: cage, relations: relations };
  }

  /**
   * The value a cell shows, from what the board DOM holds.
   * @param {{text: string, kind: string, colorIndex: ?number, shape: ?string}} raw  The text of the cell, its
   *        kind ('given' | 'placed' | 'solution'), the 0-based palette index of colour mode and the shape.
   * @returns {{state: string, value: string}} state 'empty' | 'value' | 'given' | 'solution'.
   */
  function valueInfo(raw) {
    const symbols = SG.symbols;
    let value = raw.text;
    if (raw.colorIndex !== null && symbols) {
      value = symbols.glyph('colors', raw.colorIndex + 1, null, { colorAuxSymbol: raw.shape !== null }).label;
    } else if (raw.shape !== null && symbols) {
      const at = symbols.DEFAULT_AUX_SHAPES.indexOf(raw.shape);
      value = at === -1 ? raw.shape : symbols.glyph('shapes', at + 1, null, {}).label;
    }
    if (value === '' || value === null || value === undefined) return { state: 'empty', value: '' };
    return { state: raw.kind === 'given' || raw.kind === 'solution' ? raw.kind : 'value', value: value };
  }

  /**
   * The accessible name of a cell: 'Row 4, column 7, value 5' ('Hàng 4, cột 7, giá trị 5'); multi-grid
   * boards say 'Grid 2, row 4, column 7'; empty cells say 'empty'; a Killer cell adds 'cage sum 15'; a
   * Greater-Than cell adds 'less than the cell to the right'.
   * @param {Object} info  `{ grid, row, col, shared?, state, value, cageSum?, relations? }`.
   * @param {function(string, Object=): string} [translate]  Defaults to `SG.i18n.t`.
   * @returns {string}
   */
  function cellLabel(info, translate) {
    const tr = typeof translate === 'function' ? translate : t;
    const parts = [info.grid > 0
      ? tr('a11y.cell.posGrid', { grid: info.grid, row: info.row, col: info.col })
      : tr('a11y.cell.pos', { row: info.row, col: info.col })];
    if (info.state === 'empty') parts.push(tr('a11y.cell.empty'));
    else parts.push(tr('a11y.cell.' + info.state, { value: info.value }));
    if (info.shared && info.shared.length > 0) {
      parts.push(tr('a11y.cell.shared', { grids: info.shared.join(', ') }));
    }
    if (info.cageSum !== null && info.cageSum !== undefined) {
      parts.push(tr('a11y.cell.cage', { sum: info.cageSum }));
    }
    (info.relations || []).forEach(function (r) {
      parts.push(tr('a11y.cell.' + r.rel, { dir: tr('a11y.dir.' + r.dir) }));
    });
    return parts.join(', ');
  }

  // ---------------------------------------------------------------------------------------------
  // Keyboard navigation (pure)
  // ---------------------------------------------------------------------------------------------

  /** The first real cell met from (row, col) in direction (dRow, dCol), -1 at the edge of the canvas. */
  function scan(geo, row, col, dRow, dCol) {
    let r = row + dRow;
    let c = col + dCol;
    while (r >= 0 && c >= 0 && r < geo.rows && c < geo.cols) {
      const found = geo.at[r * geo.cols + c];
      if (found >= 0) return found;
      r += dRow;
      c += dCol;
    }
    return -1;
  }

  /** How many rows Page Up / Page Down move: the box size of the digit count (3 for 9x9, 4 for 16x16). */
  function pageStep(geo) {
    const digits = geo.subGrids && geo.subGrids.length > 0
      ? Math.round(geo.subGrids[0].size / geo.cell) : Math.max(geo.rows, geo.cols);
    return Math.max(2, Math.round(Math.sqrt(digits)));
  }

  /**
   * Where a navigation key moves the focus. The geometry decides: a hole of the canvas is skipped (the
   * next real cell in that direction is taken), nothing wraps around.
   * @param {Object} geo  Board geometry (`rows`, `cols`, `at` canvas lookup, `cellRow`, `cellCol`).
   * @param {number} from  The focused cell.
   * @param {string} key  One of `NAV_KEYS`.
   * @param {boolean} [ctrl]  Home / End go to the first / last cell of the whole board.
   * @returns {number} The target cell; `from` when the key does not move.
   */
  function moveTarget(geo, from, key, ctrl) {
    const row = geo.cellRow[from];
    const col = geo.cellCol[from];
    let next = -1;
    switch (key) {
      case 'ArrowLeft': next = scan(geo, row, col, 0, -1); break;
      case 'ArrowRight': next = scan(geo, row, col, 0, 1); break;
      case 'ArrowUp': next = scan(geo, row, col, -1, 0); break;
      case 'ArrowDown': next = scan(geo, row, col, 1, 0); break;
      case 'Home':
      case 'End': {
        const first = key === 'Home';
        if (ctrl !== true) {
          next = first ? scan(geo, row, -1, 0, 1) : scan(geo, row, geo.cols, 0, -1);
          break;
        }
        for (let k = 0; k < geo.rows && next < 0; k++) {
          const r = first ? k : geo.rows - 1 - k;
          next = first ? scan(geo, r, -1, 0, 1) : scan(geo, r, geo.cols, 0, -1);
        }
        break;
      }
      case 'PageUp':
      case 'PageDown': {
        const d = key === 'PageUp' ? -1 : 1;
        let at = from;
        for (let k = 0; k < pageStep(geo); k++) {
          const step = scan(geo, geo.cellRow[at], geo.cellCol[at], d, 0);
          if (step < 0) break;
          at = step;
        }
        next = at;
        break;
      }
      default:
        return from;
    }
    return next >= 0 ? next : from;
  }

  // ---------------------------------------------------------------------------------------------
  // The board as a grid (DOM)
  // ---------------------------------------------------------------------------------------------

  function svgElement(doc, name, attrs) {
    const node = doc.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  /**
   * Gives the board view the semantics of a grid and keeps them in step with it (see the file header).
   * @param {Object} board  The `SG.boardView` view (`svg`, `getGeometry`, `getCellElement`).
   * @param {{emit?: function(string, *): void}} [hooks]
   * @returns {Object} `{ apply, refresh, labelOf, focusCell, current, destroy }`.
   */
  function attachGrid(board, hooks) {
    const svg = board.svg;
    const doc = svg.ownerDocument;
    const emit = hooks && typeof hooks.emit === 'function' ? hooks.emit : function () {};
    let geo = null;
    let extras = null;
    let textEls = [];
    let useEls = [];
    let labels = [];
    let current = -1;
    let ring = null;
    let destroyed = false;
    let valueObserver = null;
    let rowEls = [];
    let treeObserver = null;

    function cellEl(i) {
      return board.getCellElement(i);
    }

    function readCell(i) {
      const rect = cellEl(i);
      const textEl = textEls[i];
      const useEl = useEls[i];
      const textClass = textEl ? textEl.getAttribute('class') || '' : '';
      const kind = /\bval--(given|placed|solution)\b/.exec(textClass);
      const color = /\bcell--c(\d+)\b/.exec(rect.getAttribute('class') || '');
      let shape = null;
      if (useEl && (useEl.getAttribute('class') || '').indexOf('sym--off') === -1) {
        const href = useEl.getAttribute('href') || '';
        shape = href.slice(href.lastIndexOf('-') + 1);
      }
      return {
        text: textEl ? textEl.textContent : '',
        kind: kind === null ? 'placed' : kind[1],
        colorIndex: color === null ? null : Number(color[1]) - 1,
        shape: shape
      };
    }

    function labelOf(i) {
      const info = Object.assign(cellPosition(geo, i), valueInfo(readCell(i)), {
        cageSum: extras.cage.has(i) ? extras.cage.get(i) : null,
        relations: extras.relations.get(i) || []
      });
      return cellLabel(info);
    }

    function refreshCell(i) {
      const rect = cellEl(i);
      if (!rect) return;
      const label = labelOf(i);
      if (labels[i] !== label) {
        labels[i] = label;
        rect.setAttribute('aria-label', label);
      }
    }

    function refresh() {
      if (geo === null) return;
      labels = new Array(geo.cellCount);
      for (let i = 0; i < geo.cellCount; i++) refreshCell(i);
      rowEls.forEach(function (row) { row.el.setAttribute('aria-label', t('a11y.row', { row: row.row })); });
    }

    function onValueChange(records) {
      if (geo === null) return;
      const dirty = new Set();
      records.forEach(function (record) {
        const el = record.target.nodeType === 1 ? record.target : record.target.parentNode;
        const index = el && el.getAttribute ? el.getAttribute('data-cell') : null;
        if (index !== null) dirty.add(Number(index));
      });
      dirty.forEach(refreshCell);
    }

    function showRing(i, visible) {
      if (ring === null) return;
      const x = String(geo.cellX[i] + 2.5);
      const y = String(geo.cellY[i] + 2.5);
      Array.prototype.forEach.call(ring.childNodes, function (rect) {
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
      });
      ring.classList.toggle('is-on', visible);
    }

    function setCurrent(i) {
      if (current === i) return;
      const old = current >= 0 ? cellEl(current) : null;
      if (old) old.setAttribute('tabindex', '-1');
      current = i;
      const el = cellEl(i);
      if (el) el.setAttribute('tabindex', '0');
    }

    function cellOf(node) {
      if (!node || !node.getAttribute || node.getAttribute('role') !== 'gridcell') return -1;
      return Number(node.getAttribute('data-cell'));
    }

    function focusCell(i) {
      const el = cellEl(i);
      if (!el) return false;
      setCurrent(i);
      el.focus();
      return true;
    }

    function onFocusIn(event) {
      if (!svg.contains(event.target)) return;
      const i = cellOf(event.target);
      if (i < 0) return;
      setCurrent(i);
      let visible = true;
      try {
        visible = event.target.matches(':focus-visible');
      } catch (err) {
        visible = true;
      }
      showRing(i, visible);
      emit('cellfocus', { cell: i });
    }

    function onFocusOut(event) {
      if (!svg.contains(event.target)) return;
      if (cellOf(event.relatedTarget) < 0 && ring !== null) ring.classList.remove('is-on');
    }

    function onKeyDown(event) {
      const i = cellOf(event.target);
      if (i < 0 || event.defaultPrevented || event.altKey || event.metaKey || event.shiftKey) return;
      if (event.key === 'Enter' || event.key === ' ') {
        // Only a board with a click hook (setInteractive + setOnCellClick) has something to activate; the
        // keys stay free for the other modules (play mode erases a cell with Space) otherwise.
        if (!svg.classList.contains('board--interactive')) return;
        event.preventDefault();
        event.target.dispatchEvent(new root.MouseEvent('click', { bubbles: true, cancelable: true }));
        return;
      }
      const navigation = NAV_KEYS.indexOf(event.key) !== -1 &&
        (!event.ctrlKey || event.key === 'Home' || event.key === 'End');
      if (!navigation) return;
      event.preventDefault();
      const next = moveTarget(geo, i, event.key, event.ctrlKey);
      if (next !== i) focusCell(next);
    }

    function observeValues() {
      if (valueObserver !== null) valueObserver.disconnect();
      if (typeof root.MutationObserver !== 'function') return;
      valueObserver = new root.MutationObserver(onValueChange);
      const values = svg.querySelector('.layer-values');
      const cells = svg.querySelector('.layer-cells');
      if (values !== null) {
        valueObserver.observe(values, { subtree: true, childList: true, characterData: true, attributes: true,
          attributeFilter: ['class', 'href'] });
      }
      if (cells !== null) {
        valueObserver.observe(cells, { subtree: true, attributes: true, attributeFilter: ['class'] });
      }
    }

    function collectValueNodes() {
      textEls = new Array(geo.cellCount);
      useEls = new Array(geo.cellCount);
      Array.prototype.forEach.call(svg.querySelectorAll('.layer-values > text.val'), function (el) {
        textEls[Number(el.getAttribute('data-cell'))] = el;
      });
      Array.prototype.forEach.call(svg.querySelectorAll('.layer-values > use.sym'), function (el) {
        useEls[Number(el.getAttribute('data-cell'))] = el;
      });
    }

    /** Puts the rectangles of the cells into one row group per canvas row, in reading order. */
    function wrapRows(layer) {
      const byRow = new Map();
      for (let i = 0; i < geo.cellCount; i++) {
        const r = geo.cellRow[i];
        if (!byRow.has(r)) byRow.set(r, []);
        byRow.get(r).push(i);
      }
      const rows = Array.from(byRow.keys()).sort(function (a, b) { return a - b; });
      const fragment = doc.createDocumentFragment();
      rowEls = [];
      rows.forEach(function (r) {
        const group = svgElement(doc, 'g', {
          role: 'row', 'aria-rowindex': String(r + 1), class: 'a11y-row'
        });
        rowEls.push({ el: group, row: r + 1 });
        byRow.get(r).sort(function (a, b) { return geo.cellCol[a] - geo.cellCol[b]; }).forEach(function (i) {
          const el = cellEl(i);
          el.setAttribute('role', 'gridcell');
          el.setAttribute('aria-colindex', String(geo.cellCol[i] + 1));
          el.setAttribute('tabindex', '-1');
          group.appendChild(el);
        });
        fragment.appendChild(group);
      });
      layer.appendChild(fragment);
      layer.setAttribute('role', 'presentation');
      layer.setAttribute('data-a11y', 'rows');
    }

    /** Puts the cell rectangles back where the board view made them and removes what `apply` added. */
    function clearStructure() {
      const layer = svg.querySelector('.layer-cells');
      if (layer !== null) {
        Array.prototype.slice.call(layer.querySelectorAll('rect.cell')).forEach(function (el) {
          ['role', 'aria-colindex', 'aria-label', 'tabindex'].forEach(function (name) {
            el.removeAttribute(name);
          });
          layer.appendChild(el);
        });
        Array.prototype.slice.call(layer.querySelectorAll('.a11y-row')).forEach(function (group) {
          layer.removeChild(group);
        });
        layer.removeAttribute('role');
        layer.removeAttribute('data-a11y');
      }
      Array.prototype.slice.call(svg.querySelectorAll('.a11y-ring')).forEach(function (node) {
        svg.removeChild(node);
      });
      ring = null;
      rowEls = [];
      labels = [];
    }

    /** (Re)builds the semantics; runs again whenever the board rebuilds its tree. */
    function apply() {
      if (destroyed) return;
      const layer = svg.querySelector('.layer-cells');
      if (layer === null) return;
      clearStructure();
      geo = board.getGeometry();
      extras = cellExtras(geo);
      collectValueNodes();
      const ids = (svg.getAttribute('aria-labelledby') || 'board-title board-desc').split(/\s+/);
      svg.setAttribute('role', 'grid');
      svg.setAttribute('aria-labelledby', ids[0]);
      if (ids[1]) svg.setAttribute('aria-describedby', ids[1]);
      svg.setAttribute('aria-rowcount', String(geo.rows));
      svg.setAttribute('aria-colcount', String(geo.cols));
      svg.setAttribute('aria-readonly', 'false');
      Array.prototype.forEach.call(svg.querySelectorAll('defs'), function (el) {
        el.setAttribute('aria-hidden', 'true');
      });
      HIDDEN_LAYERS.forEach(function (name) {
        Array.prototype.forEach.call(svg.querySelectorAll('[data-layer="' + name + '"]'), function (el) {
          el.setAttribute('aria-hidden', 'true');
        });
      });
      wrapRows(layer);
      ring = svgElement(doc, 'g', { class: 'a11y-ring', 'aria-hidden': 'true' });
      ['halo', 'line'].forEach(function (part) {
        ring.appendChild(svgElement(doc, 'rect', { class: 'a11y-ring__' + part, width: '35', height: '35' }));
      });
      svg.appendChild(ring);
      if (current >= 0 && current < geo.cellCount) {
        const keep = current;
        current = -1;
        setCurrent(keep);
      } else {
        current = -1;
        setCurrent(moveTarget(geo, 0, 'Home', true));
      }
      refresh();
      observeValues();
    }

    // Focus listeners go on the document: Blink makes an SVG element that has them focusable, which would
    // put the whole board in the tab order before its first cell.
    doc.addEventListener('focusin', onFocusIn);
    doc.addEventListener('focusout', onFocusOut);
    svg.addEventListener('keydown', onKeyDown);
    if (typeof root.MutationObserver === 'function') {
      treeObserver = new root.MutationObserver(function () {
        if (svg.querySelector('.layer-cells[data-a11y]') === null) apply();
      });
      treeObserver.observe(svg, { childList: true });
    }
    apply();

    return {
      apply: apply,
      refresh: refresh,
      labelOf: labelOf,
      focusCell: focusCell,
      current: function () { return current; },
      destroy: function destroy() {
        destroyed = true;
        doc.removeEventListener('focusin', onFocusIn);
        doc.removeEventListener('focusout', onFocusOut);
        svg.removeEventListener('keydown', onKeyDown);
        if (treeObserver !== null) treeObserver.disconnect();
        if (valueObserver !== null) valueObserver.disconnect();
        clearStructure();
        const hidden = svg.querySelectorAll('[aria-hidden="true"][data-layer], defs');
        Array.prototype.forEach.call(hidden, function (el) { el.removeAttribute('aria-hidden'); });
        ['role', 'aria-describedby', 'aria-rowcount', 'aria-colcount', 'aria-readonly'].forEach(
          function (name) { svg.removeAttribute(name); });
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-labelledby', 'board-title board-desc');
      }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Settings dialog
  // ---------------------------------------------------------------------------------------------

  /** The choices of the Settings dialog (values are those of the store). */
  const LANG_CHOICES = Object.freeze([
    Object.freeze({ value: 'en', key: 'shell.lang.en.name' }),
    Object.freeze({ value: 'vi', key: 'shell.lang.vi.name' })
  ]);
  const THEME_CHOICES = Object.freeze([
    Object.freeze({ value: 'auto', key: 'a11y.settings.theme.auto' }),
    Object.freeze({ value: 'light', key: 'a11y.settings.theme.light' }),
    Object.freeze({ value: 'dark', key: 'a11y.settings.theme.dark' }),
    Object.freeze({ value: 'high-contrast', key: 'a11y.settings.theme.highContrast' })
  ]);
  const FONT_CHOICES = Object.freeze([
    Object.freeze({ value: 'small', key: 'a11y.settings.font.small', sample: 'A\u2212' }),
    Object.freeze({ value: 'normal', key: 'a11y.settings.font.normal', sample: 'A' }),
    Object.freeze({ value: 'large', key: 'a11y.settings.font.large', sample: 'A+' })
  ]);
  const CHECK_CHOICES = Object.freeze([
    Object.freeze({ value: 'off', key: 'play.options.check.off' }),
    Object.freeze({ value: 'conflicts', key: 'play.options.check.conflicts' }),
    Object.freeze({ value: 'live', key: 'play.options.check.live' })
  ]);

  let settingsCounter = 0;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'i18n') node.setAttribute('data-i18n', value);
      else if (name === 'i18nAttr') node.setAttribute('data-i18n-attr', value);
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function choiceGroup(name, legendKey, choices, onPick) {
    const group = el('div', { class: 'choice-group' });
    choices.forEach(function (choice) {
      const input = el('input', { type: 'radio', name: 'sg-' + name, value: choice.value,
        i18nAttr: choice.sample ? 'aria-label:' + choice.key + ',title:' + choice.key : null });
      input.addEventListener('change', function () { if (input.checked) onPick(choice.value); });
      const text = choice.sample
        ? el('span', { class: 'choice__text choice__text--' + choice.value, 'aria-hidden': 'true' })
        : el('span', { class: 'choice__text', i18n: choice.key });
      if (choice.sample) text.textContent = choice.sample;
      group.appendChild(el('label', { class: 'choice' }, [input, text]));
    });
    return el('fieldset', { class: 'field-group', 'data-setting': name }, [
      el('legend', { class: 'field-group__legend', i18n: legendKey }),
      group
    ]);
  }

  function switchRow(name, labelKey, hintKey, onToggle) {
    const hintId = 'a11y-hint-' + name + '-' + settingsCounter;
    const input = el('input', {
      class: 'switch__input', type: 'checkbox', role: 'switch', 'data-setting': name,
      'aria-describedby': hintId
    });
    input.addEventListener('change', function () { onToggle(input.checked); });
    return el('div', { class: 'setting' }, [
      el('label', { class: 'switch' }, [
        input,
        el('span', { class: 'switch__track', 'aria-hidden': 'true' }),
        el('span', { class: 'switch__text', i18n: labelKey })
      ]),
      el('p', { class: 'field__hint', id: hintId, i18n: hintKey })
    ]);
  }

  const ctx = {
    app: null,
    off: [],
    grid: null,
    modal: null,
    skipLink: null,
    onSkip: null,
    unwatchModals: null
  };

  function systemReducesMotion() {
    return typeof root.matchMedia === 'function' &&
      root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Brings the controls of an open Settings dialog in line with the store. */
  function syncSettings() {
    if (ctx.modal === null) return;
    const state = ctx.app.getStore().get();
    const body = ctx.modal.body;
    const current = { 'sg-lang': state.lang, 'sg-theme': state.theme, 'sg-fontSize': state.fontSize,
      'sg-check': state.check };
    Array.prototype.forEach.call(body.querySelectorAll('input[type="radio"]'), function (input) {
      input.checked = input.value === current[input.name];
    });
    Array.prototype.forEach.call(body.querySelectorAll('input[role="switch"]'), function (input) {
      input.checked = state[input.getAttribute('data-setting')] === true;
    });
  }

  function note(key) {
    return el('p', { class: 'field__hint setting__note', i18n: key });
  }

  function buildSettingsBody(container) {
    const store = ctx.app.getStore();
    const put = function (patch) { store.set(patch, { source: 'a11y' }); };
    settingsCounter++;
    container.appendChild(choiceGroup('lang', 'a11y.settings.lang.legend', LANG_CHOICES,
      function (value) { put({ lang: value }); }));
    container.appendChild(choiceGroup('theme', 'a11y.settings.theme.legend', THEME_CHOICES,
      function (value) { put({ theme: value }); }));
    container.appendChild(note('a11y.settings.theme.hint'));
    container.appendChild(choiceGroup('fontSize', 'a11y.settings.font.legend', FONT_CHOICES,
      function (value) { put({ fontSize: value }); }));
    container.appendChild(switchRow('reducedMotion', 'a11y.settings.motion.label',
      'a11y.settings.motion.hint', function (on) { put({ reducedMotion: on }); }));
    if (systemReducesMotion()) container.appendChild(note('a11y.settings.motion.system'));
    container.appendChild(switchRow('colorAuxSymbol', 'a11y.settings.aux.label', 'a11y.settings.aux.hint',
      function (on) { put({ colorAuxSymbol: on }); }));
    container.appendChild(choiceGroup('check', 'play.options.check', CHECK_CHOICES,
      function (value) { put({ check: value }); }));
    container.appendChild(switchRow('autoNotes', 'play.options.autoNotes', 'a11y.settings.notes.hint',
      function (on) { put({ autoNotes: on }); }));
    container.appendChild(switchRow('showCoords', 'a11y.settings.coords.label', 'a11y.settings.coords.hint',
      function (on) { put({ showCoords: on }); }));
    container.appendChild(note('a11y.settings.keys'));
    SG.i18n.applyTo(container);
  }

  function buildSettingsFooter(container) {
    const reset = el('button', { type: 'button', class: 'btn btn--secondary', i18n: 'a11y.settings.reset' });
    reset.addEventListener('click', function () {
      ctx.app.getStore().reset();
      syncSettings();
    });
    const close = el('button', { type: 'button', class: 'btn btn--primary', i18n: 'common.close' });
    close.addEventListener('click', function () { if (ctx.modal !== null) ctx.modal.close(); });
    container.appendChild(reset);
    container.appendChild(close);
    SG.i18n.applyTo(container);
  }

  /**
   * Opens the Settings dialog (or returns the one that is open).
   * @returns {?Object} The modal of `SG.app.openModal`; null without a DOM or before `init`.
   */
  function openSettings() {
    if (ctx.app === null || typeof document === 'undefined') return null;
    if (ctx.modal !== null) return ctx.modal;
    const modal = ctx.app.openModal({
      titleKey: 'a11y.settings.title',
      body: buildSettingsBody,
      footer: buildSettingsFooter,
      onClose: function () { ctx.modal = null; }
    });
    if (modal === null) return null;
    ctx.modal = modal;
    syncSettings();
    const checked = modal.body.querySelector('input[type="radio"]:checked');
    if (checked !== null) checked.focus();
    return modal;
  }

  function closeSettings() {
    if (ctx.modal !== null) ctx.modal.close();
  }

  function onLocale(payload) {
    if (ctx.grid !== null) ctx.grid.refresh();
    const code = payload && payload.locale ? payload.locale : SG.i18n.current;
    ctx.app.announce(t('a11y.announce.language', { language: t('shell.lang.' + code + '.name') }));
  }

  function onAction(payload) {
    if (payload && payload.id === 'settings') openSettings();
  }

  // ---------------------------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------------------------

  /** The skip link focuses `#main` itself (a fragment link would also leave '#main' in the address). */
  function wireSkipLink() {
    const link = document.getElementById('skip-link');
    if (link === null) return;
    ctx.skipLink = link;
    ctx.onSkip = function (event) {
      const main = document.getElementById('main');
      if (main === null) return;
      event.preventDefault();
      main.focus();
      if (typeof main.scrollIntoView === 'function') main.scrollIntoView({ block: 'start' });
    };
    link.addEventListener('click', ctx.onSkip);
  }

  /**
   * Toasts and the live region move into the open modal dialog: a modal makes everything outside it inert,
   * which hides a toast (it sits under the top layer) and silences `#a11y-live` and `#toast-root`.
   * They go back to their place when the last dialog is gone.
   */
  function watchModals() {
    const host = document.getElementById('modal-root');
    if (host === null || typeof root.MutationObserver !== 'function') return;
    const movers = ['toast-root', 'a11y-live'].map(function (id) {
      const node = document.getElementById(id);
      return node === null ? null : { node: node, parent: node.parentNode, next: node.nextSibling };
    }).filter(function (mover) { return mover !== null; });
    function reconcile() {
      const dialogs = host.querySelectorAll('.modal');
      if (dialogs.length > 0) {
        const top = dialogs[dialogs.length - 1];
        movers.forEach(function (m) { if (m.node.parentNode !== top) top.appendChild(m.node); });
        return;
      }
      movers.slice().reverse().forEach(function (m) {
        if (m.node.parentNode === m.parent) return;
        m.parent.insertBefore(m.node, m.next && m.next.parentNode === m.parent ? m.next : null);
      });
    }
    const observer = new root.MutationObserver(reconcile);
    observer.observe(host, { childList: true });
    ctx.unwatchModals = function () {
      observer.disconnect();
      reconcile();
    };
    reconcile();
  }

  /** Removes everything `init` added (tests and hot reloads). */
  function destroy() {
    ctx.off.splice(0).forEach(function (off) { off(); });
    if (ctx.modal !== null) ctx.modal.close();
    if (ctx.grid !== null) ctx.grid.destroy();
    if (ctx.unwatchModals !== null) ctx.unwatchModals();
    if (ctx.skipLink !== null && ctx.onSkip !== null) ctx.skipLink.removeEventListener('click', ctx.onSkip);
    ctx.app = null;
    ctx.grid = null;
    ctx.skipLink = null;
    ctx.onSkip = null;
    ctx.modal = null;
    ctx.unwatchModals = null;
  }

  /**
   * Starts the module (called by app.js at start-up; safe to call again).
   * @param {Object} app  `SG.app`.
   * @returns {boolean} Whether the module is running (false without a DOM).
   */
  function init(app) {
    if (typeof document === 'undefined' || !app) return false;
    if (ctx.app === app) return true;
    destroy();
    ctx.app = app;
    const board = app.getBoard();
    if (board) {
      ctx.grid = attachGrid(board, { emit: function (name, payload) { app.emit(name, payload); } });
    }
    ctx.off.push(app.on('locale', onLocale));
    ctx.off.push(app.on('settings', syncSettings));
    ctx.off.push(app.on('action', onAction));
    wireSkipLink();
    watchModals();
    return true;
  }

  SG.a11y = {
    NAV_KEYS: NAV_KEYS,
    LANG_CHOICES: LANG_CHOICES,
    THEME_CHOICES: THEME_CHOICES,
    FONT_CHOICES: FONT_CHOICES,
    CHECK_CHOICES: CHECK_CHOICES,
    cellPosition: cellPosition,
    cellExtras: cellExtras,
    valueInfo: valueInfo,
    cellLabel: cellLabel,
    moveTarget: moveTarget,
    pageStep: pageStep,
    attachGrid: attachGrid,
    init: init,
    destroy: destroy,
    openSettings: openSettings,
    closeSettings: closeSettings,
    getGrid: function getGrid() { return ctx.grid; }
  };

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'a11y.row': 'Row {row}',
      'a11y.cell.pos': 'Row {row}, column {col}',
      'a11y.cell.posGrid': 'Grid {grid}, row {row}, column {col}',
      'a11y.cell.empty': 'empty',
      'a11y.cell.value': 'value {value}',
      'a11y.cell.given': 'value {value}, given',
      'a11y.cell.solution': 'solution {value}',
      'a11y.cell.shared': 'also in grid {grids}',
      'a11y.cell.cage': 'cage sum {sum}',
      'a11y.cell.less': 'less than the cell {dir}',
      'a11y.cell.greater': 'greater than the cell {dir}',
      'a11y.dir.up': 'above',
      'a11y.dir.down': 'below',
      'a11y.dir.left': 'to the left',
      'a11y.dir.right': 'to the right',
      'a11y.announce.language': 'Language: {language}.',
      'a11y.settings.title': 'Settings',
      'a11y.settings.lang.legend': 'Language',
      'a11y.settings.theme.legend': 'Theme',
      'a11y.settings.theme.auto': 'Automatic',
      'a11y.settings.theme.light': 'Light',
      'a11y.settings.theme.dark': 'Dark',
      'a11y.settings.theme.highContrast': 'High contrast',
      'a11y.settings.theme.hint': 'Automatic follows the light or dark setting of your device, and then none ' +
        'of the theme buttons in the header is shown as pressed.',
      'a11y.settings.font.legend': 'Text size',
      'a11y.settings.font.small': 'Smaller text',
      'a11y.settings.font.normal': 'Normal text size',
      'a11y.settings.font.large': 'Larger text',
      'a11y.settings.motion.label': 'Reduce animations',
      'a11y.settings.motion.hint': 'Turns off the cell animations and the smooth colour changes.',
      'a11y.settings.motion.system': 'Your device already asks for reduced motion, so animations stay off.',
      'a11y.settings.aux.label': 'Show a symbol on colours',
      'a11y.settings.aux.hint': 'The colour symbol set also draws a shape in every cell, so the values ' +
        'can be told apart without telling the colours apart.',
      'a11y.settings.notes.hint': 'When you enter a symbol, it disappears from the notes of the cells that ' +
        'see it. Switch this off to keep every note until you erase it.',
      'a11y.settings.coords.label': 'Show row and column numbers',
      'a11y.settings.coords.hint': 'Adds numbers and letters around the board.',
      'a11y.settings.keys': 'Keyboard: Tab moves between the areas of the page. On the board, the arrow ' +
        'keys, Home, End, Page Up and Page Down move between cells, and typing a digit or a letter fills the ' +
        'selected cell.',
      'a11y.settings.reset': 'Reset to defaults'
    },
    vi: {
      'a11y.row': 'Hàng {row}',
      'a11y.cell.pos': 'Hàng {row}, cột {col}',
      'a11y.cell.posGrid': 'Lưới {grid}, hàng {row}, cột {col}',
      'a11y.cell.empty': 'trống',
      'a11y.cell.value': 'giá trị {value}',
      'a11y.cell.given': 'giá trị {value}, số đã cho',
      'a11y.cell.solution': 'đáp án {value}',
      'a11y.cell.shared': 'cũng thuộc lưới {grids}',
      'a11y.cell.cage': 'tổng nhóm ô {sum}',
      'a11y.cell.less': 'nhỏ hơn ô {dir}',
      'a11y.cell.greater': 'lớn hơn ô {dir}',
      'a11y.dir.up': 'phía trên',
      'a11y.dir.down': 'phía dưới',
      'a11y.dir.left': 'bên trái',
      'a11y.dir.right': 'bên phải',
      'a11y.announce.language': 'Ngôn ngữ: {language}.',
      'a11y.settings.title': 'Cài đặt',
      'a11y.settings.lang.legend': 'Ngôn ngữ',
      'a11y.settings.theme.legend': 'Giao diện',
      'a11y.settings.theme.auto': 'Tự động',
      'a11y.settings.theme.light': 'Sáng',
      'a11y.settings.theme.dark': 'Tối',
      'a11y.settings.theme.highContrast': 'Tương phản cao',
      'a11y.settings.theme.hint': 'Chế độ tự động theo thiết lập sáng hoặc tối của thiết bị; khi đó không ' +
        'nút giao diện nào trên thanh đầu trang được hiển thị là đang bật.',
      'a11y.settings.font.legend': 'Cỡ chữ',
      'a11y.settings.font.small': 'Chữ nhỏ hơn',
      'a11y.settings.font.normal': 'Cỡ chữ chuẩn',
      'a11y.settings.font.large': 'Chữ lớn hơn',
      'a11y.settings.motion.label': 'Giảm hiệu ứng chuyển động',
      'a11y.settings.motion.hint': 'Tắt hiệu ứng của các ô và các chuyển màu mượt.',
      'a11y.settings.motion.system': 'Thiết bị của bạn đã yêu cầu giảm chuyển động nên hiệu ứng luôn tắt.',
      'a11y.settings.aux.label': 'Hiện ký hiệu trên ô màu',
      'a11y.settings.aux.hint': 'Bộ ký hiệu màu sẽ vẽ thêm một hình trong mỗi ô, nhờ vậy vẫn phân biệt ' +
        'được các giá trị mà không cần phân biệt màu.',
      'a11y.settings.notes.hint': 'Khi bạn điền một ký hiệu, nó biến mất khỏi ghi chú của các ô nhìn thấy ' +
        'nó. Tắt tùy chọn này để giữ mọi ghi chú cho đến khi bạn xóa.',
      'a11y.settings.coords.label': 'Hiện số hàng và cột',
      'a11y.settings.coords.hint': 'Thêm số và chữ quanh bảng.',
      'a11y.settings.keys': 'Bàn phím: phím Tab chuyển giữa các vùng của trang. Trên bảng, các phím mũi ' +
        'tên, Home, End, Page Up và Page Down di chuyển giữa các ô, còn gõ một chữ số hoặc chữ cái sẽ điền ' +
        'vào ô đang chọn.',
      'a11y.settings.reset': 'Khôi phục mặc định'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
