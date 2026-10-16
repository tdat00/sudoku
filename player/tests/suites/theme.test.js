// Themes and visual polish: the pure parts of SG.theme, and the stylesheets read as text, because a
// theme is data: every theme defines the same tokens, the dark palette of `prefers-color-scheme` equals the
// explicit one, text contrast is WCAG AA (4.5:1) and lines / borders / focus rings are >= 3:1 in all three
// themes (7:1 for the text of the high-contrast theme), colours exist only in the token files and the favicon,
// every animation is switched off for reduced motion, and the cell and board effects exist with their
// durations. The ratios are computed from the real token values, nothing is hard-coded here.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var T = SG.theme;
  var NODE = SG.test.node;

  function ready() {
    if (!T || !SG.i18n) SG.test.skip('SG.theme is not loaded here');
  }

  function needNode() {
    if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return NODE;
  }

  function read(rel) {
    var env = needNode();
    return env.fs.readFileSync(env.path.join(env.root, rel), 'utf8').replace(/^\uFEFF/, '');
  }

  function listFiles(rel, suffix) {
    var env = needNode();
    var abs = env.path.join(env.root, rel);
    if (!env.fs.existsSync(abs)) return [];
    return env.fs.readdirSync(abs).filter(function (name) { return name.endsWith(suffix); }).sort();
  }

  // ---------------------------------------------------------------------------------------------
  // A small CSS reader: rules with their selectors, declarations and media query
  // ---------------------------------------------------------------------------------------------

  function stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  function parseRules(css) {
    var rules = [];
    function walk(src, media) {
      var i = 0;
      while (i < src.length) {
        var open = src.indexOf('{', i);
        if (open === -1) break;
        var head = src.slice(i, open).trim();
        var depth = 1;
        var j = open + 1;
        while (j < src.length && depth > 0) {
          if (src[j] === '{') depth++;
          else if (src[j] === '}') depth--;
          j++;
        }
        var body = src.slice(open + 1, j - 1);
        if (head.indexOf('@media') === 0) {
          walk(body, head.slice(6).trim());
        } else if (head.charAt(0) !== '@') {
          var decl = {};
          body.split(';').forEach(function (d) {
            var k = d.indexOf(':');
            if (k > 0) decl[d.slice(0, k).trim()] = d.slice(k + 1).trim();
          });
          rules.push({ selectors: head.split(',').map(function (s) { return s.trim(); }), decl: decl, media: media,
            body: body });
        }
        i = j;
      }
    }
    walk(stripComments(css), null);
    return rules;
  }

  /** The declarations of the blocks that define one theme (light is also the default of `:root`). */
  function themeTokens(rules, theme) {
    var out = {};
    function match(sel) {
      if (theme === 'light') {
        return sel === ':root' || sel === ':root[data-theme="light"]' || sel === '[data-sg-theme="light"]';
      }
      return sel === ':root[data-theme="' + theme + '"]' || sel === '[data-sg-theme="' + theme + '"]';
    }
    rules.forEach(function (r) {
      if (r.media === null && r.selectors.some(match)) Object.assign(out, r.decl);
    });
    return out;
  }

  /** The declarations of the dark block of `prefers-color-scheme` (used while no theme is chosen). */
  function mediaDark(rules) {
    var found = null;
    rules.forEach(function (r) {
      if (r.media === '(prefers-color-scheme: dark)' && r.selectors.indexOf(':root:not([data-theme])') !== -1) {
        found = r.decl;
      }
    });
    return found;
  }

  // ---------------------------------------------------------------------------------------------
  // Colour maths (WCAG 2.x relative luminance)
  // ---------------------------------------------------------------------------------------------

  function parseColor(value) {
    var v = String(value).trim();
    var m = /^#([0-9a-f]{3})$/i.exec(v);
    if (m) {
      return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16),
        b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
    }
    m = /^#([0-9a-f]{6})$/i.exec(v);
    if (m) {
      return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16),
        b: parseInt(m[1].slice(4, 6), 16), a: 1 };
    }
    m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(v);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    return null;
  }

  function over(fg, bg) {
    return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
  }

  function luminance(c) {
    function channel(x) {
      var s = x / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  function ratio(a, b) {
    var l1 = luminance(a);
    var l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // ---------------------------------------------------------------------------------------------
  // The helpers of SG.theme
  // ---------------------------------------------------------------------------------------------

  describe('theme: resolving a preference', function () {
    it('keeps an explicit theme and lets the system decide only for auto', function () {
      ready();
      ['light', 'dark', 'high-contrast'].forEach(function (theme) {
        expect(T.resolveTheme(theme, true)).toBe(theme);
        expect(T.resolveTheme(theme, false)).toBe(theme);
      });
      expect(T.resolveTheme('auto', true)).toBe('dark');
      expect(T.resolveTheme('auto', false)).toBe('light');
      expect(T.resolveTheme('auto')).toBe('light');
      expect(T.resolveTheme('nonsense', true)).toBe('dark');
    });

    it('removes data-theme for auto (so prefers-color-scheme rules) and sets it otherwise', function () {
      ready();
      expect(T.attributeFor('auto')).toBeNull();
      expect(T.attributeFor('whatever')).toBeNull();
      ['light', 'dark', 'high-contrast'].forEach(function (theme) { expect(T.attributeFor(theme)).toBe(theme); });
    });

    it('cycles auto -> light -> dark -> high-contrast -> auto', function () {
      ready();
      var seen = [];
      var pref = 'auto';
      for (var i = 0; i < 4; i++) {
        pref = T.nextTheme(pref);
        seen.push(pref);
      }
      expect(seen).toEqual(['light', 'dark', 'high-contrast', 'auto']);
      expect(T.nextTheme('unknown')).toBe('auto');
    });

    it('lists the themes of the store, in the order of the Settings dialog', function () {
      ready();
      if (!SG.store) SG.test.skip('SG.store is not loaded here');
      expect(Array.from(T.THEMES)).toEqual(Array.from(SG.store.THEMES));
    });
  });

  describe('theme: the font-size mapping', function () {
    it('maps the three settings to the base size and falls back to the normal size', function () {
      ready();
      expect(T.fontSizeValue('small')).toBe('87.5%');
      expect(T.fontSizeValue('normal')).toBe('100%');
      expect(T.fontSizeValue('large')).toBe('125%');
      expect(T.fontSizeValue('huge')).toBe('100%');
      expect(T.fontSizeValue(undefined)).toBe('100%');
      expect(T.fontSizeValue('constructor')).toBe('100%');
    });

    it('is the table that the first-paint script of index.html uses', function () {
      ready();
      var html = read('index.html');
      var script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
      expect(script).toContain("'" + T.fontSizeValue('small') + "'");
      expect(script).toContain("'" + T.fontSizeValue('large') + "'");
    });
  });

  describe('theme: without a DOM', function () {
    it('does nothing and reports that it is not running', function () {
      ready();
      expect(T.init(SG.app)).toBe(false);
      expect(T.init(null)).toBe(false);
      expect(T.get()).toBe('auto');
      expect(T.set('dark')).toBe('auto');
      expect(T.cycle()).toBe('auto');
      expect(T.apply({ theme: 'dark' })).toBeNull();
      expect(function () { T.destroy(); }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The token files
  // ---------------------------------------------------------------------------------------------

  var THEMES = ['light', 'dark', 'high-contrast'];
  var generalRules = null;
  var boardRules = null;

  function rulesOf(file) {
    if (file === 'tokens.css') {
      if (generalRules === null) generalRules = parseRules(read('css/tokens.css'));
      return generalRules;
    }
    if (boardRules === null) boardRules = parseRules(read('css/tokens-board.css'));
    return boardRules;
  }

  function themed(name) {
    return /^--sg-(?:color|shadow)-/.test(name) || (/^--sg-board-/.test(name) && !/^--sg-board-dur-/.test(name));
  }

  function tokensOf(theme) {
    return Object.assign({}, themeTokens(rulesOf('tokens.css'), theme), themeTokens(rulesOf('tokens-board.css'), theme));
  }

  describe('theme: every theme defines every themed token', function () {
    ['tokens.css', 'tokens-board.css'].forEach(function (file) {
      it(file + ': light, dark and high-contrast define the same colour, shadow and board tokens', function () {
        var names = {};
        THEMES.forEach(function (theme) {
          names[theme] = Object.keys(themeTokens(rulesOf(file), theme)).filter(themed).sort();
        });
        expect(names.light.length).toBeGreaterThan(15);
        expect(names.dark).toEqual(names.light);
        expect(names['high-contrast']).toEqual(names.light);
      });

      it(file + ': the dark block of prefers-color-scheme equals the explicit dark theme', function () {
        var explicit = themeTokens(rulesOf(file), 'dark');
        var media = mediaDark(rulesOf(file));
        expect(media).not.toBeNull();
        expect(media).toEqual(explicit);
      });
    });

    it('the tokens are real colours (or transparent / none for shadows)', function () {
      THEMES.forEach(function (theme) {
        var tokens = tokensOf(theme);
        Object.keys(tokens).filter(function (n) { return /^--sg-(?:color|board)-/.test(n); }).forEach(function (name) {
          if (/-(?:width|weight|dash|dur)-?/.test(name) && !/color/.test(name)) return;
          if (/^--sg-board-(?:width|weight|cage-width|cage-dash|sign-width|dur)/.test(name)) return;
          expect(parseColor(tokens[name]) !== null).toBe(true);
        });
      });
    });
  });

  describe('theme: contrast (WCAG 2.x), computed from the token files', function () {
    var failures = [];

    function checker(theme) {
      var t = tokensOf(theme);
      function color(name, backdrop) {
        var c = parseColor(t[name]);
        if (c === null) throw new Error(theme + ': token ' + name + ' is missing or not a colour');
        return c.a < 1 ? over(c, backdrop || parseColor(t['--sg-color-surface'])) : c;
      }
      return {
        tokens: t,
        pair: function (fg, bg, min, label) {
          var back = color(bg);
          var r = ratio(color(fg, back), back);
          if (r < min) failures.push(theme + ': ' + (label || '') + ' ' + fg + ' on ' + bg + ' = ' + r.toFixed(2) + ' (< ' + min + ')');
          return r;
        },
        raw: function (fg, bgColor, min, label) {
          var r = ratio(fg, bgColor);
          if (r < min) failures.push(theme + ': ' + label + ' = ' + r.toFixed(2) + ' (< ' + min + ')');
          return r;
        },
        color: color
      };
    }

    var SURFACES = ['--sg-color-bg', '--sg-color-surface', '--sg-color-surface-2', '--sg-color-hover'];
    var BOARD_INKS = ['--sg-board-ink-given', '--sg-board-ink-placed', '--sg-board-ink-solution', '--sg-board-ink-sum'];

    THEMES.forEach(function (theme) {
      it(theme + ': text is >= 4.5:1 on every surface, button, badge, alert and status colour', function () {
        failures = [];
        var c = checker(theme);
        var text = function (fg, bg) { c.pair(fg, bg, 4.5, 'text'); };
        SURFACES.forEach(function (s) {
          text('--sg-color-text', s);
          text('--sg-color-text-muted', s);
        });
        text('--sg-color-text', '--sg-color-accent-soft');
        text('--sg-color-text-muted', '--sg-color-accent-soft');
        text('--sg-color-accent-text', '--sg-color-accent');
        text('--sg-color-accent-text', '--sg-color-accent-hover');
        ['--sg-color-bg', '--sg-color-surface', '--sg-color-surface-2'].forEach(function (s) {
          text('--sg-color-accent', s);
        });
        text('--sg-color-accent', '--sg-color-accent-soft');
        text('--sg-color-accent-hover', '--sg-color-surface');
        ['success', 'warning', 'danger'].forEach(function (kind) {
          text('--sg-color-' + kind, '--sg-color-surface');
          text('--sg-color-' + kind, '--sg-color-surface-2');
          text('--sg-color-' + kind, '--sg-color-' + kind + '-bg');
          text('--sg-color-text', '--sg-color-' + kind + '-bg');
          text('--sg-color-text-muted', '--sg-color-' + kind + '-bg');
        });
        text('--sg-color-danger', '--sg-color-bg');
        expect(failures).toEqual([]);
      });

      it(theme + ': disabled text is still >= 4.5:1 (no opacity trick), the placeholder uses muted text', function () {
        failures = [];
        var c = checker(theme);
        ['--sg-color-surface-2', '--sg-color-bg', '--sg-color-surface'].forEach(function (s) {
          c.pair('--sg-color-disabled-text', s, 4.5, 'disabled');
        });
        expect(failures).toEqual([]);
        var components = read('css/components.css');
        expect(/::placeholder\s*\{[^}]*var\(--sg-color-text-muted\)/.test(components)).toBe(true);
        // A disabled control with text never fades with opacity (that would drop the text below 4.5:1); the
        // slider and the switch track hold no text and may.
        stripComments(components).replace(/([^{}]+)\{([^}]*)\}/g, function (all, selector, body) {
          if (/slider|range|switch/.test(selector)) return all;
          if (/:disabled|\[aria-disabled/.test(selector)) expect(/opacity\s*:/.test(body)).toBe(false);
          return all;
        });
      });

      it(theme + ': borders, focus ring, selected and status colours are >= 3:1 against their surfaces', function () {
        failures = [];
        var c = checker(theme);
        var ui = function (fg, bg) { c.pair(fg, bg, 3, 'ui'); };
        ['--sg-color-bg', '--sg-color-surface', '--sg-color-surface-2'].forEach(function (s) {
          ui('--sg-color-border', s);
          ui('--sg-color-focus', s);
        });
        ['--sg-color-accent-soft', '--sg-color-hover', '--sg-color-danger-bg', '--sg-color-warning-bg',
          '--sg-color-success-bg'].forEach(function (s) { ui('--sg-color-focus', s); });
        ui('--sg-color-border', '--sg-color-track');
        ui('--sg-color-accent', '--sg-color-surface');
        ui('--sg-color-accent', '--sg-color-surface-2');
        ui('--sg-color-accent', '--sg-color-track');
        ui('--sg-color-accent', '--sg-color-accent-soft');
        ['success', 'warning', 'danger'].forEach(function (kind) {
          ui('--sg-color-' + kind, '--sg-color-surface');
          ui('--sg-color-' + kind, '--sg-color-' + kind + '-bg');
        });
        expect(failures).toEqual([]);
      });

      it(theme + ': grid lines, cage outlines, signs and effects are >= 3:1 on the paper, the tints and the overlays',
        function () {
          failures = [];
          var c = checker(theme);
          var t = c.tokens;
          var ui = function (fg, bg, label) { c.pair(fg, bg, 3, label || 'board'); };
          ['--sg-board-line-thin', '--sg-board-line-thick', '--sg-board-line-subgrid', '--sg-board-cage-line',
            '--sg-board-sign', '--sg-board-probe', '--sg-board-backtrack', '--sg-board-technique',
            '--sg-board-selected', '--sg-board-focus'].forEach(function (n) { ui(n, '--sg-board-paper'); });
          var tints = [];
          for (var k = 1; k <= 9; k++) tints.push('--sg-board-region-' + k);
          for (k = 0; k < 5; k++) tints.push('--sg-board-cage-' + k);
          tints.forEach(function (tint) {
            if (t[tint] === 'transparent') return;
            ui('--sg-board-line-thin', tint);
            if (/cage/.test(tint)) {
              ui('--sg-board-cage-line', tint);
              ui('--sg-board-sign', tint);
            }
          });
          ['diag', 'window', 'overlap', 'word'].forEach(function (kind) {
            var paper = parseColor(t['--sg-board-paper']);
            var blended = over(parseColor(t['--sg-board-overlay-' + kind]), paper);
            c.raw(parseColor(t['--sg-board-line-thin']), blended, 3, 'line-thin on overlay-' + kind);
          });
          expect(failures).toEqual([]);
        });

      it(theme + ': the ink of the numbers is >= 4.5:1 on the paper, every region tint, cage colour and overlay',
        function () {
          failures = [];
          var c = checker(theme);
          var t = c.tokens;
          var text = function (fg, bg) { c.pair(fg, bg, 4.5, 'board text'); };
          BOARD_INKS.concat(['--sg-board-ink-coord']).forEach(function (n) { text(n, '--sg-board-paper'); });
          var tints = [];
          for (var k = 1; k <= 9; k++) tints.push('--sg-board-region-' + k);
          for (k = 0; k < 5; k++) tints.push('--sg-board-cage-' + k);
          tints.forEach(function (tint) {
            if (t[tint] === 'transparent') return;
            BOARD_INKS.forEach(function (ink) { text(ink, tint); });
          });
          ['diag', 'window', 'overlap', 'word'].forEach(function (kind) {
            var blended = over(parseColor(t['--sg-board-overlay-' + kind]), parseColor(t['--sg-board-paper']));
            BOARD_INKS.forEach(function (ink) {
              c.raw(parseColor(t[ink]), blended, 4.5, ink + ' on overlay-' + kind);
            });
          });
          expect(failures).toEqual([]);
        });

      it(theme + ': every symbol of colour mode is visible on its palette colour (white fill or dark outline >= 3:1)',
        function () {
          failures = [];
          var c = checker(theme);
          for (var k = 1; k <= 16; k++) {
            var fill = c.color('--sg-board-sym-' + k);
            var best = Math.max(ratio(c.color('--sg-board-sym-ink'), fill), ratio(c.color('--sg-board-sym-edge'), fill));
            c.raw(c.color('--sg-board-sym-ink'), c.color('--sg-board-sym-ink'), 1, '');
            if (best < 3) failures.push(theme + ': symbol on sym-' + k + ' = ' + best.toFixed(2));
          }
          expect(failures).toEqual([]);
        });
    });

    it('high-contrast: text and ink reach 7:1 (AAA)', function () {
      failures = [];
      var c = checker('high-contrast');
      var triples = [
        ['--sg-color-text', '--sg-color-bg'], ['--sg-color-text', '--sg-color-surface'],
        ['--sg-color-text', '--sg-color-surface-2'], ['--sg-color-text', '--sg-color-hover'],
        ['--sg-color-text-muted', '--sg-color-surface'], ['--sg-color-text-muted', '--sg-color-surface-2'],
        ['--sg-color-text-muted', '--sg-color-hover'], ['--sg-color-disabled-text', '--sg-color-surface-2'],
        ['--sg-color-accent-text', '--sg-color-accent'], ['--sg-color-accent', '--sg-color-surface'],
        ['--sg-color-accent', '--sg-color-accent-soft'], ['--sg-color-success', '--sg-color-success-bg'],
        ['--sg-color-warning', '--sg-color-warning-bg'], ['--sg-color-danger', '--sg-color-danger-bg'],
        ['--sg-color-border', '--sg-color-surface'], ['--sg-color-focus', '--sg-color-surface'],
        ['--sg-board-ink-given', '--sg-board-paper'], ['--sg-board-ink-placed', '--sg-board-paper'],
        ['--sg-board-ink-solution', '--sg-board-paper'], ['--sg-board-ink-coord', '--sg-board-paper'],
        ['--sg-board-line-thin', '--sg-board-paper'], ['--sg-board-line-thick', '--sg-board-paper']
      ];
      triples.forEach(function (p) { c.pair(p[0], p[1], 7, 'AAA'); });
      expect(failures).toEqual([]);
    });

    it('the calculator is right (21:1 black on white, 1:1 equal colours, alpha over a backdrop)', function () {
      expect(ratio(parseColor('#000000'), parseColor('#ffffff'))).toBeCloseTo(21, 5);
      expect(ratio(parseColor('#777777'), parseColor('#777777'))).toBeCloseTo(1, 5);
      expect(ratio(parseColor('#767676'), parseColor('#ffffff'))).toBeGreaterThan(4.5);
      expect(ratio(parseColor('#777777'), parseColor('#ffffff'))).toBeLessThan(4.5);
      var half = over(parseColor('rgba(0, 0, 0, 0.5)'), parseColor('#ffffff'));
      expect(Math.round(half.r)).toBe(128);
      expect(parseColor('transparent').a).toBe(0);
      expect(parseColor('var(--x)')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Colours only in the token files, the favicon, the first paint
  // ---------------------------------------------------------------------------------------------

  var HEX = /#[0-9a-fA-F]{3,8}\b/;
  var COLOR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color-mix)\(/;

  function hasCssColor(text) {
    var clean = stripComments(text).replace(/url\([^)]*\)/g, '').replace(/"[^"]*"|'[^']*'/g, '');
    return HEX.test(clean) || COLOR_FUNCTION.test(clean);
  }

  describe('theme: colours exist only in the token files and the favicon', function () {
    it('no stylesheet other than the two token files has a colour literal', function () {
      var offenders = listFiles('css', '.css').filter(function (name) {
        return name !== 'tokens.css' && name !== 'tokens-board.css' && hasCssColor(read('css/' + name));
      });
      expect(offenders).toEqual([]);
      expect(hasCssColor(read('css/tokens.css'))).toBe(true);
      expect(hasCssColor(read('css/tokens-board.css'))).toBe(true);
    });

    it('no script or page has a colour literal in code or style (comments aside)', function () {
      var files = listFiles('js/ui', '.js').map(function (n) { return 'js/ui/' + n; }).concat(['index.html']);
      var offenders = files.filter(function (rel) {
        var text = read(rel).replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/[^\n]*/g, '');
        return hasCssColor(text.replace(/&#\d+;/g, ''));
      });
      expect(offenders).toEqual([]);
    });

    it('the favicon is the one asset with colours, follows the colour scheme and is linked from the page', function () {
      var svg = read('assets/favicon.svg');
      expect(HEX.test(svg)).toBe(true);
      expect(svg).toContain('prefers-color-scheme: dark');
      expect(svg).toContain('<svg');
      expect(/<script|onload|href=["']http/i.test(svg)).toBe(false);
      var html = read('index.html');
      expect(html).toContain('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">');
      var others = listFiles('assets', '.svg').filter(function (n) { return n !== 'favicon.svg'; });
      others.forEach(function (name) { expect(HEX.test(read('assets/' + name))).toBe(false); });
    });

    it('theme.js reads the colour of the theme from the tokens (computed style), it never writes one', function () {
      var text = read('js/ui/theme.js');
      expect(text).toContain('--sg-color-surface');
      expect(text).toContain('theme-color');
      expect(HEX.test(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))).toBe(false);
    });
  });

  describe('theme: the first paint has no flash', function () {
    function firstScript() {
      var html = read('index.html');
      var head = html.slice(0, html.indexOf('</head>'));
      var m = /<script>([\s\S]*?)<\/script>/.exec(head);
      expect(m).not.toBeNull();
      return { code: m[1], at: head.indexOf(m[0]), head: head };
    }

    it('an inline script in the head runs before the first stylesheet', function () {
      var s = firstScript();
      expect(s.at).toBeLessThan(s.head.indexOf('<link rel="stylesheet"'));
    });

    it('applies the stored theme, motion and font size inside try/catch, from the key of the store', function () {
      ready();
      var code = firstScript().code;
      expect(code).toContain("'sg.player.prefs.v1'");
      if (SG.store) expect(SG.store.KEY).toBe('sg.player.prefs.v1');
      expect(code).toContain('try {');
      expect(code).toContain('catch');
      expect(code).toContain('data-theme');
      expect(code).toContain('data-motion');
      expect(code).toContain('--sg-font-size-base');
    });

    function run(stored, throwing) {
      var attrs = { 'data-theme': 'light' };
      var vars = {};
      var fake = {
        documentElement: {
          setAttribute: function (k, v) { attrs[k] = String(v); },
          removeAttribute: function (k) { delete attrs[k]; },
          style: { setProperty: function (k, v) { vars[k] = v; } }
        }
      };
      var storage = {
        getItem: function () {
          if (throwing) throw new Error('blocked');
          return stored;
        }
      };
      var env = NODE.vm.createContext({ document: fake, localStorage: storage });
      NODE.vm.runInContext(firstScript().code, env);
      return { attrs: attrs, vars: vars };
    }

    it('sets what the stored preferences say', function () {
      needNode();
      var dark = run(JSON.stringify({ v: 1, theme: 'dark', fontSize: 'large', reducedMotion: true }));
      expect(dark.attrs['data-theme']).toBe('dark');
      expect(dark.attrs['data-motion']).toBe('off');
      expect(dark.vars['--sg-font-size-base']).toBe('125%');
      var hc = run(JSON.stringify({ theme: 'high-contrast', fontSize: 'small' }));
      expect(hc.attrs['data-theme']).toBe('high-contrast');
      expect(hc.vars['--sg-font-size-base']).toBe('87.5%');
      expect(hc.attrs['data-motion']).toBeUndefined();
    });

    it('removes the default data-theme for auto, and survives missing, blocked or corrupt storage', function () {
      needNode();
      [JSON.stringify({ theme: 'auto' }), null, 'not json', '42', 'null', JSON.stringify({ theme: 'neon' })]
        .forEach(function (stored) {
          var out = run(stored);
          expect(out.attrs['data-theme']).toBeUndefined();
          expect(out.attrs['data-motion']).toBeUndefined();
          expect(out.vars['--sg-font-size-base']).toBeUndefined();
        });
      var blocked = run(null, true);
      expect(blocked.attrs['data-theme']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Motion and effects
  // ---------------------------------------------------------------------------------------------

  describe('theme: every animation and transition is off for reduced motion', function () {
    function motionOff(css, selectorHint) {
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      expect(css).toContain(selectorHint);
    }

    it('base.css switches animations and transitions off for the system preference and for data-motion="off"', function () {
      var css = read('css/base.css');
      motionOff(css, ':root[data-motion="off"] *');
      var reduce = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)[1];
      var off = /:root\[data-motion="off"\] \*,[\s\S]*?\{([\s\S]*?)\}/.exec(css)[1];
      [reduce, off].forEach(function (block) {
        expect(block).toContain('animation-duration: 0.01ms !important');
        expect(block).toContain('animation-iteration-count: 1 !important');
        expect(block).toContain('transition-duration: 0.01ms !important');
        expect(block).toContain('scroll-behavior: auto !important');
      });
    });

    it('the duration tokens go to zero for both switches', function () {
      var rules = rulesOf('tokens.css');
      var reduced = rules.filter(function (r) { return r.media === '(prefers-reduced-motion: reduce)'; })[0];
      var off = rules.filter(function (r) { return r.selectors.indexOf(':root[data-motion="off"]') !== -1; })[0];
      [reduced, off].forEach(function (r) {
        expect(r.decl['--sg-motion-fast']).toBe('0ms');
        expect(r.decl['--sg-motion-base']).toBe('0ms');
      });
    });

    it('the board has its own switches (class, system preference, data-motion, animate: false)', function () {
      var css = read('css/board.css');
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      expect(css).toContain(':root[data-motion="off"] .sgb');
      expect(css).toContain('.sgb[data-animate="off"]');
      expect(/\.sgb \*\s*\{\s*animation: none !important;\s*transition: none !important;/.test(css)).toBe(true);
    });

    it('the theme change fades colours only, and only when motion is allowed', function () {
      var css = read('css/base.css');
      var block = /@media \(prefers-reduced-motion: no-preference\)\s*\{([\s\S]*?)\n\}/.exec(css);
      expect(block).not.toBeNull();
      var text = block[1];
      expect(text).toContain(':root.is-theming:not([data-motion="off"])');
      var props = /transition:([\s\S]*?)!important/.exec(text)[1].split(',').map(function (s) {
        return s.trim().split(/\s+/)[0];
      });
      expect(props.sort()).toEqual(['background-color', 'border-color', 'color', 'fill', 'outline-color', 'stroke']);
    });

    it('no stylesheet starts an animation or a transition outside the reach of these rules', function () {
      // Every animation / transition of the other files is a plain declaration, covered by the rules above:
      // none of them sets `!important` (which could beat them) or an animation on a selector outside <html>.
      listFiles('css', '.css').forEach(function (name) {
        var css = stripComments(read('css/' + name));
        css.replace(/(animation|transition)(?:-[a-z]+)?\s*:[^;{}]*;/g, function (decl) {
          if (name === 'base.css' || name === 'board.css') return decl;
          expect(/!important/.test(decl)).toBe(false);
          return decl;
        });
      });
    });
  });

  describe('theme: the cell and board effects', function () {
    var EFFECTS = [
      { cls: 'cell--placing', token: '--sg-board-dur-placing', ms: 120 },
      { cls: 'cell--backtrack', token: '--sg-board-dur-backtrack', ms: 180 },
      { cls: 'cell--probing', token: '--sg-board-dur-probing', ms: 200 },
      { cls: 'cell--removed', token: '--sg-board-dur-removed', ms: 200 },
      { cls: 'cell--restored', token: '--sg-board-dur-restored', ms: 300 },
      { cls: 'cell--technique', token: '--sg-board-dur-technique', ms: 400 },
      { cls: 'board--done', token: '--sg-board-dur-done', ms: 500 }
    ];

    EFFECTS.forEach(function (effect) {
      it('.' + effect.cls + ' exists, animates with ' + effect.token + ' = ' + effect.ms + ' ms', function () {
        var tokens = themeTokens(rulesOf('tokens-board.css'), 'light');
        expect(tokens[effect.token]).toBe(effect.ms + 'ms');
        var css = stripComments(read('css/board.css'));
        var rule = new RegExp('\\.' + effect.cls + '\\s*\\{[^}]*animation:[^;]*var\\(' + effect.token + '\\)');
        expect(rule.test(css)).toBe(true);
      });
    });

    it('every effect has a keyframes definition', function () {
      var css = stripComments(read('css/board.css'));
      ['sgb-place', 'sgb-remove', 'sgb-backtrack', 'sgb-probe', 'sgb-technique', 'sgb-restored', 'sgb-done']
        .forEach(function (name) { expect(css).toContain('@keyframes ' + name); });
    });
  });

  describe('theme: forced colours and increased contrast', function () {
    it('base.css keeps a visible focus ring and the pressed / selected states in forced-colors mode', function () {
      expect(read('css/base.css')).toContain('@media (forced-colors: active)');
      var components = read('css/components.css');
      expect(components).toContain('@media (forced-colors: active)');
      expect(components).toContain('.choice:has(> input:checked)');
      expect(read('css/board.css')).toContain('@media (forced-colors: active)');
    });

    it('tokens.css answers prefers-contrast: more with text-coloured borders and a thicker focus ring', function () {
      var rule = rulesOf('tokens.css').filter(function (r) { return r.media === '(prefers-contrast: more)'; })[0];
      expect(rule).toBeDefined();
      expect(rule.decl['--sg-color-border']).toBe('var(--sg-color-text)');
      expect(rule.decl['--sg-color-text-muted']).toBe('var(--sg-color-text)');
      expect(parseFloat(rule.decl['--sg-focus-width'])).toBeGreaterThan(3);
    });
  });
})();
