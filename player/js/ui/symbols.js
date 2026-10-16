/**
 * Presentation layer of the board symbols: how a value 1..D is shown. The core only knows the
 * integers 1..D; this file turns a value into what the board draws, per symbol mode, and builds the legend.
 *
 * Modes:
 *   digits   the label of the model (`model.symbols.labels`, so mega16 draws '0'..'F'); the plain value for
 *            a model whose labels are word letters (wordoku)
 *   letters  A, B, C, ...
 *   colors   a palette fill (`--sg-board-sym-1..16`) PLUS a small geometric symbol, so colour is never the
 *            only carrier of the value (switch the symbol off with `opts.colorAuxSymbol === false`)
 *   shapes   one of 16 geometric shapes
 *   word     the letters of the model (`model.symbols.labels`, wordoku)
 *
 * Everything here is pure (no DOM): a glyph is plain data, a legend is data or an SVG/HTML string, and
 * switching the mode never touches the puzzle. Texts go through `SG.i18n.t` (`symbols.*` keys, fragment at
 * the bottom of this file); without `SG.i18n` (Node) the English fragment is read directly.
 *
 * Colour index: `colorIndex` is 0-based, palette token `--sg-board-sym-<colorIndex + 1>`; entry i is always
 * drawn with shape `DEFAULT_AUX_SHAPES[i]`, so colour mode and shapes mode agree on what value v looks like.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.symbols && typeof SG.symbols.glyph === 'function') return;

  /** Every symbol mode, in the order a selector lists them. */
  const MODES = Object.freeze(['digits', 'letters', 'colors', 'shapes', 'word']);

  /** Number of palette entries (`--sg-board-sym-1..16`); at most `SG.MAX_DIGITS` values need one each. */
  const PALETTE_SIZE = 16;

  /** Shape of palette entry i (and of value i + 1 in shapes mode). 16 distinct geometric shapes. */
  const DEFAULT_AUX_SHAPES = Object.freeze([
    'circle', 'square', 'triangle', 'diamond', 'star', 'plus', 'hexagon', 'heart',
    'cross', 'ring', 'frame', 'triangleDown', 'star4', 'semicircle', 'hourglass', 'house'
  ]);

  /** Nominal radius of a shape in board units (a cell is 40 units wide). */
  const SHAPE_RADIUS = 13;

  const EN_FALLBACK = { en: {} };

  function round(x) {
    return Math.round(x * 100) / 100;
  }

  /** Path data of a closed polygon given as [x, y] pairs in unit coordinates. */
  function polygon(points, cx, cy, r) {
    return 'M' + points.map(function (p) {
      return round(cx + p[0] * r) + ' ' + round(cy + p[1] * r);
    }).join('L') + 'Z';
  }

  function circle(cx, cy, r, sweep) {
    const s = sweep ? 1 : 0;
    return 'M' + round(cx - r) + ' ' + round(cy) + 'a' + round(r) + ' ' + round(r) + ' 0 1 ' + s + ' ' +
      round(2 * r) + ' 0a' + round(r) + ' ' + round(r) + ' 0 1 ' + s + ' ' + round(-2 * r) + ' 0Z';
  }

  function regular(sides, startDeg, radius) {
    const pts = [];
    for (let k = 0; k < sides; k++) {
      const a = (startDeg + 360 * k / sides) * Math.PI / 180;
      pts.push([radius * Math.cos(a), radius * Math.sin(a)]);
    }
    return pts;
  }

  function starPoints(spikes, outer, inner) {
    const pts = [];
    for (let k = 0; k < spikes * 2; k++) {
      const a = (-90 + 180 * k / spikes) * Math.PI / 180;
      const rad = k % 2 === 0 ? outer : inner;
      pts.push([rad * Math.cos(a), rad * Math.sin(a)]);
    }
    return pts;
  }

  function crossPoints(arm, half) {
    return [[-half, -arm], [half, -arm], [half, -half], [arm, -half], [arm, half], [half, half],
      [half, arm], [-half, arm], [-half, half], [-arm, half], [-arm, -half], [-half, -half]];
  }

  function rotate(points, deg) {
    const a = deg * Math.PI / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return points.map(function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; });
  }

  const SHAPE_BUILDERS = {
    circle: function (x, y, r) { return circle(x, y, r * 0.95, true); },
    ring: function (x, y, r) { return circle(x, y, r * 0.98, true) + circle(x, y, r * 0.5, false); },
    square: function (x, y, r) {
      return polygon([[-0.84, -0.84], [0.84, -0.84], [0.84, 0.84], [-0.84, 0.84]], x, y, r);
    },
    frame: function (x, y, r) {
      return polygon([[-0.88, -0.88], [0.88, -0.88], [0.88, 0.88], [-0.88, 0.88]], x, y, r) +
        polygon([[-0.46, -0.46], [-0.46, 0.46], [0.46, 0.46], [0.46, -0.46]], x, y, r);
    },
    triangle: function (x, y, r) { return polygon([[0, -1.05], [1.0, 0.75], [-1.0, 0.75]], x, y, r); },
    triangleDown: function (x, y, r) { return polygon([[0, 1.05], [-1.0, -0.75], [1.0, -0.75]], x, y, r); },
    diamond: function (x, y, r) { return polygon([[0, -1.12], [0.82, 0], [0, 1.12], [-0.82, 0]], x, y, r); },
    star: function (x, y, r) { return polygon(starPoints(5, 1.12, 0.46), x, y, r); },
    star4: function (x, y, r) { return polygon(starPoints(4, 1.15, 0.38), x, y, r); },
    plus: function (x, y, r) { return polygon(crossPoints(1.0, 0.32), x, y, r); },
    cross: function (x, y, r) { return polygon(rotate(crossPoints(1.05, 0.3), 45), x, y, r); },
    hexagon: function (x, y, r) { return polygon(regular(6, 0, 1.02), x, y, r); },
    house: function (x, y, r) {
      return polygon([[0, -1.08], [0.98, -0.3], [0.72, 0.95], [-0.72, 0.95], [-0.98, -0.3]], x, y, r);
    },
    semicircle: function (x, y, r) {
      return 'M' + round(x - r) + ' ' + round(y + r * 0.5) + 'a' + round(r) + ' ' + round(r) + ' 0 0 1 ' +
        round(2 * r) + ' 0Z';
    },
    hourglass: function (x, y, r) {
      return polygon([[-0.92, -1], [0.92, -1], [0, 0]], x, y, r) +
        polygon([[0, 0], [0.92, 1], [-0.92, 1]], x, y, r);
    },
    heart: function (x, y, r) {
      return 'M' + round(x) + ' ' + round(y + 0.95 * r) +
        'C' + round(x - 1.3 * r) + ' ' + round(y - 0.05 * r) + ' ' + round(x - 0.95 * r) + ' ' +
        round(y - 1.0 * r) + ' ' + round(x) + ' ' + round(y - 0.4 * r) +
        'C' + round(x + 0.95 * r) + ' ' + round(y - 1.0 * r) + ' ' + round(x + 1.3 * r) + ' ' +
        round(y - 0.05 * r) + ' ' + round(x) + ' ' + round(y + 0.95 * r) + 'Z';
    }
  };

  /**
   * Path data (SVG `d`) of a shape, centred on (cx, cy) with nominal radius r. Rings and frames use two
   * sub-paths: draw them with `fill-rule="evenodd"` (`SG.symbols.FILL_RULE`).
   * @param {string} id  One of `DEFAULT_AUX_SHAPES`.
   * @param {number} cx
   * @param {number} cy
   * @param {number} [r]  Defaults to `SHAPE_RADIUS`.
   * @returns {string}
   */
  function shapePath(id, cx, cy, r) {
    const build = SHAPE_BUILDERS[id];
    if (build === undefined) return '';
    return build(cx, cy, r === undefined ? SHAPE_RADIUS : r);
  }

  // ---------------------------------------------------------------------------------------------
  // Text helpers
  // ---------------------------------------------------------------------------------------------

  function fill(template, args) {
    return String(template).replace(/\{(\w+)\}/g, function (m, name) {
      return args && args[name] !== undefined ? String(args[name]) : m;
    });
  }

  /** `SG.i18n.t` when it exists, else the English text of this file's fragment. */
  function tr(key, args) {
    if (SG.i18n && typeof SG.i18n.t === 'function') return SG.i18n.t(key, args);
    const text = EN_FALLBACK.en[key];
    return text === undefined ? key : fill(text, args);
  }

  function letterOf(value) {
    return value >= 1 && value <= 26 ? String.fromCharCode(64 + value) : String(value);
  }

  function labelsOf(model) {
    return model && model.symbols && model.symbols.labels ? model.symbols.labels : null;
  }

  function digitText(model, value) {
    const labels = labelsOf(model);
    if (labels !== null && labels[value - 1] !== undefined && model.symbols.mode !== 'word') {
      return String(labels[value - 1]);
    }
    return value <= 9 ? String(value) : String.fromCharCode(55 + value);
  }

  function wordText(model, value) {
    const labels = labelsOf(model);
    return labels !== null && labels[value - 1] !== undefined ? String(labels[value - 1]) : letterOf(value);
  }

  // ---------------------------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------------------------

  /**
   * The symbol modes a board offers (`SG.modelAids.symbolModes`, in the order of `MODES`).
   * @param {PuzzleModel} model
   * @returns {string[]} At least ['digits'].
   */
  function modesFor(model) {
    const offered = SG.modelAids && model ? SG.modelAids.symbolModes(model) : ['digits'];
    const out = MODES.filter(function (m) { return offered.indexOf(m) !== -1; });
    return out.length > 0 ? out : ['digits'];
  }

  /**
   * What the board draws for a value.
   * @typedef {Object} Glyph
   * @property {?string} text        Text to draw (digits, letters, word), else null.
   * @property {?string} shape       Id of the geometric shape to draw (shapes mode, colour mode with the
   *                                 auxiliary symbol), else null.
   * @property {?number} colorIndex  0-based palette index (colour mode), else null.
   * @property {string}  label       Accessible text; the translated 'empty' for value 0. '' when the glyph
   *                                 was asked for without a label (`opts.label === false`).
   */

  /**
   * Maps a value to its display in a symbol mode.
   * @param {string} mode   'digits' | 'letters' | 'colors' | 'shapes' | 'word'.
   * @param {number} value  0 (empty) or 1..D.
   * @param {PuzzleModel} [model]  Supplies `symbols.labels`; optional for letters, colors and shapes.
   * @param {{colorAuxSymbol?: boolean, label?: boolean}} [opts]  `colorAuxSymbol === false` drops the symbol
   *        of colour mode; `label === false` skips the (translated) label, which the board does not need
   *        while drawing.
   * @returns {Glyph}
   */
  function glyph(mode, value, model, opts) {
    const wantLabel = !(opts && opts.label === false);
    if (!(value >= 1)) {
      return { text: null, shape: null, colorIndex: null, label: wantLabel ? tr('symbols.empty') : '' };
    }
    const idx = (value - 1) % PALETTE_SIZE;
    const shape = DEFAULT_AUX_SHAPES[idx];
    const aux = !(opts && opts.colorAuxSymbol === false);
    let text;
    switch (mode) {
      case 'letters':
        text = letterOf(value);
        return { text: text, shape: null, colorIndex: null, label: wantLabel ? text : '' };
      case 'word':
        text = wordText(model, value);
        return { text: text, shape: null, colorIndex: null, label: wantLabel ? text : '' };
      case 'shapes':
        return { text: null, shape: shape, colorIndex: null,
          label: wantLabel ? tr('symbols.shape.' + shape) : '' };
      case 'colors': {
        let label = '';
        if (wantLabel) {
          const colour = tr('symbols.color.' + (idx + 1));
          label = aux ? tr('symbols.label.colorShape', { color: colour, shape: tr('symbols.shape.' + shape) })
            : colour;
        }
        return { text: null, shape: aux ? shape : null, colorIndex: idx, label: label };
      }
      default:
        text = digitText(model, value);
        return { text: text, shape: null, colorIndex: null, label: wantLabel ? text : '' };
    }
  }

  /**
   * The legend of a mode: what value 1..D looks like.
   * @param {string} mode
   * @param {PuzzleModel} model  Supplies the digit count D and the labels.
   * @param {{colorAuxSymbol?: boolean}} [opts]
   * @returns {Array<Glyph & {value: number}>}
   */
  function legend(mode, model, opts) {
    const out = [];
    const D = model && model.digits ? model.digits : 9;
    for (let v = 1; v <= D; v++) {
      const g = glyph(mode, v, model, opts);
      out.push({ value: v, text: g.text, shape: g.shape, colorIndex: g.colorIndex, label: g.label });
    }
    return out;
  }

  function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * SVG markup of one legend swatch (a 32 x 32 picture): the colour square, the shape or the text.
   * @param {Glyph} g
   * @returns {string}
   */
  function swatchMarkup(g) {
    let inner = '';
    if (g.colorIndex !== null) {
      inner += '<rect class="sgb-sw-fill cell--c' + (g.colorIndex + 1) +
        '" x="-15" y="-15" width="30" height="30" rx="4"/>';
    }
    if (g.shape !== null) {
      const cls = g.colorIndex !== null ? 'sym-aux' : 'sym-shape';
      inner += '<path class="' + cls + '" fill-rule="evenodd" d="' + shapePath(g.shape, 0, 0, 10) + '"/>';
    }
    if (g.text !== null) {
      inner += '<text class="sgb-sw-text" x="0" y="0" dy="0.35em" text-anchor="middle">' +
        escapeXml(g.text) + '</text>';
    }
    return '<svg class="sgb-sw" viewBox="-16 -16 32 32" width="32" height="32" aria-hidden="true" ' +
      'focusable="false">' + inner + '</svg>';
  }

  /**
   * HTML of a legend list (`<ul class="sgb-legend">`), translated; swatches are inline SVG and styled by
   * css/board.css.
   * @param {string} mode
   * @param {PuzzleModel} model
   * @param {{colorAuxSymbol?: boolean, showText?: boolean}} [opts]  `showText === false` leaves out the
   *        translated name next to each colour or shape swatch (digits and letters never get one, the
   *        swatch is the text; every item keeps an accessible name).
   * @returns {string}
   */
  function legendMarkup(mode, model, opts) {
    const items = legend(mode, model, opts).map(function (item) {
      const named = item.text === null && !(opts && opts.showText === false);
      const text = named ? '<span class="sgb-legend__text">' + escapeXml(item.label) + '</span>' : '';
      return '<li class="sgb-legend__item" data-value="' + item.value + '" title="' + escapeXml(item.label) +
        '"' + (named ? '' : ' aria-label="' + escapeXml(item.label) + '"') + '>' + swatchMarkup(item) +
        text + '</li>';
    });
    return '<ul class="sgb-legend" role="list" aria-label="' +
      escapeXml(tr('symbols.legend.aria', { mode: tr('symbolMode.' + mode) })) + '">' +
      items.join('') + '</ul>';
  }

  /**
   * Renders a legend into an element (browser only).
   * @param {Element} el
   * @param {string} mode
   * @param {PuzzleModel} model
   * @param {Object} [opts]  See `legendMarkup`.
   * @returns {Element} `el`.
   */
  function renderLegend(el, mode, model, opts) {
    el.innerHTML = legendMarkup(mode, model, opts);
    return el;
  }

  SG.symbols = {
    MODES: MODES,
    paletteSize: PALETTE_SIZE,
    DEFAULT_AUX_SHAPES: DEFAULT_AUX_SHAPES,
    SHAPE_RADIUS: SHAPE_RADIUS,
    FILL_RULE: 'evenodd',
    modesFor: modesFor,
    glyph: glyph,
    legend: legend,
    legendMarkup: legendMarkup,
    renderLegend: renderLegend,
    swatchMarkup: swatchMarkup,
    shapePath: shapePath
  };

  // ---------------------------------------------------------------------------------------------
  // Locale fragment
  // ---------------------------------------------------------------------------------------------

  const FRAGMENT = {
    en: {
      'symbols.empty': 'empty',
      'symbols.legend.aria': 'Symbol legend: {mode}',
      'symbols.label.colorShape': '{color} {shape}',
      'symbols.color.1': 'Emerald',
      'symbols.color.2': 'Pink',
      'symbols.color.3': 'Violet',
      'symbols.color.4': 'Mint',
      'symbols.color.5': 'Olive',
      'symbols.color.6': 'Periwinkle',
      'symbols.color.7': 'Black',
      'symbols.color.8': 'Mustard',
      'symbols.color.9': 'Plum',
      'symbols.color.10': 'Yellow',
      'symbols.color.11': 'Blue',
      'symbols.color.12': 'Teal',
      'symbols.color.13': 'Forest green',
      'symbols.color.14': 'Salmon',
      'symbols.color.15': 'Dark gray',
      'symbols.color.16': 'Gray',
      'symbols.shape.circle': 'circle',
      'symbols.shape.square': 'square',
      'symbols.shape.triangle': 'triangle',
      'symbols.shape.diamond': 'diamond',
      'symbols.shape.star': 'star',
      'symbols.shape.plus': 'plus',
      'symbols.shape.hexagon': 'hexagon',
      'symbols.shape.heart': 'heart',
      'symbols.shape.cross': 'cross',
      'symbols.shape.ring': 'ring',
      'symbols.shape.frame': 'square outline',
      'symbols.shape.triangleDown': 'inverted triangle',
      'symbols.shape.star4': 'four-point star',
      'symbols.shape.semicircle': 'half circle',
      'symbols.shape.hourglass': 'bow tie',
      'symbols.shape.house': 'house'
    },
    vi: {
      'symbols.empty': 'trống',
      'symbols.legend.aria': 'Chú giải ký hiệu: {mode}',
      'symbols.label.colorShape': '{shape} màu {color}',
      'symbols.color.1': 'lục bảo',
      'symbols.color.2': 'hồng',
      'symbols.color.3': 'tím xanh',
      'symbols.color.4': 'xanh bạc hà',
      'symbols.color.5': 'xanh ô liu',
      'symbols.color.6': 'xanh lam nhạt',
      'symbols.color.7': 'đen',
      'symbols.color.8': 'vàng nghệ',
      'symbols.color.9': 'tím mận',
      'symbols.color.10': 'vàng',
      'symbols.color.11': 'xanh dương',
      'symbols.color.12': 'xanh mòng két',
      'symbols.color.13': 'xanh rừng',
      'symbols.color.14': 'hồng cam',
      'symbols.color.15': 'xám đậm',
      'symbols.color.16': 'xám',
      'symbols.shape.circle': 'hình tròn',
      'symbols.shape.square': 'hình vuông',
      'symbols.shape.triangle': 'hình tam giác',
      'symbols.shape.diamond': 'hình thoi',
      'symbols.shape.star': 'ngôi sao',
      'symbols.shape.plus': 'dấu cộng',
      'symbols.shape.hexagon': 'hình lục giác',
      'symbols.shape.heart': 'hình trái tim',
      'symbols.shape.cross': 'dấu nhân',
      'symbols.shape.ring': 'vòng tròn',
      'symbols.shape.frame': 'khung vuông',
      'symbols.shape.triangleDown': 'tam giác ngược',
      'symbols.shape.star4': 'sao bốn cánh',
      'symbols.shape.semicircle': 'nửa hình tròn',
      'symbols.shape.hourglass': 'hình chiếc nơ',
      'symbols.shape.house': 'hình ngôi nhà'
    }
  };
  EN_FALLBACK.en = FRAGMENT.en;

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push(FRAGMENT);
})(typeof self !== 'undefined' ? self : globalThis);
