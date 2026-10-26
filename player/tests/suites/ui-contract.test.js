// UI contract: what every module promises to the others and to the page, checked on Node without a DOM.
// 1. the function surface of each module, 2. every file loads without a DOM, the engines have no DOM and the
// player holds none of the generator's modules, 3. no colour literal outside the token files, 4. index.html:
// mount points, no hard-coded visible text, script order equal to SOURCE_FILES (node-runner.js, tests.html),
// 5. every suite is listed in tests.html. Pure source scans: the files are read as text, nothing here needs a
// browser.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var NODE = SG.test.node;

  /** The engine shared with the generator (core/) and the player's own. */
  var ENGINE_DIRS = ['../core/js/engine', 'js/engine'];

  function needNode() {
    if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return NODE;
  }

  function readText(rel) {
    var env = needNode();
    return env.fs.readFileSync(env.path.join(env.root, rel), 'utf8').replace(/^\uFEFF/, '');
  }

  function exists(rel) {
    var env = needNode();
    return env.fs.existsSync(env.path.join(env.root, rel));
  }

  function listDir(rel, suffix) {
    var env = needNode();
    var abs = env.path.join(env.root, rel);
    if (!env.fs.existsSync(abs)) return [];
    return env.fs.readdirSync(abs).filter(function (name) { return name.endsWith(suffix); }).sort();
  }

  /** The quoted file names inside `[ ... ]` that follows `marker` in `text`. */
  function quotedList(text, marker) {
    var at = text.indexOf(marker);
    if (at === -1) return null;
    var open = text.indexOf('[', at);
    var close = text.indexOf(']', open);
    var inside = text.slice(open + 1, close).replace(/\/\/[^\n]*/g, '');
    return (inside.match(/'[^']+'/g) || []).map(function (s) { return s.slice(1, -1); });
  }

  function sourceFilesOfRunner() {
    return quotedList(readText('tests/node-runner.js'), 'const SOURCE_FILES');
  }

  // ---------------------------------------------------------------------------------------------
  // 1. Function surface
  // ---------------------------------------------------------------------------------------------

  /** Module -> the functions it must export (when the module is loaded). Extra members are fine. */
  var SURFACE = {
    i18n: ['t', 'tError', 'has', 'setLocale', 'onChange', 'applyTo', 'detect', 'formatNumber', 'formatDuration',
      'setCellLabeler'],
    store: ['defaults', 'sanitize', 'parseUrl', 'createStorage', 'storage', 'createStore', 'instance'],
    theme: ['init', 'destroy', 'get', 'set', 'cycle', 'apply', 'effective', 'resolveTheme', 'attributeFor',
      'nextTheme', 'fontSizeValue'],
    importer: ['open', 'openDocument', 'openText', 'detect', 'parseText', 'validate', 'puzzleId', 'issueText'],
    exchange: ['encode', 'decode', 'tokenFromHash', 'playerUrl', 'isDocument', 'plain'],
    classicModel: ['build', 'variantIdOf'],
    modelAids: ['signEdges', 'describeWord', 'readWord', 'isWordSolved', 'symbolModes'],
    symbols: ['modesFor', 'glyph', 'legend', 'legendMarkup', 'renderLegend'],
    boardView: ['create', 'geometry', 'renderMarkup', 'cellView'],
    a11y: ['init', 'destroy', 'openSettings', 'cellLabel', 'moveTarget', 'attachGrid'],
    progress: ['createProgress', 'instance', 'validId', 'trimState'],
    play: ['init', 'attach', 'detach', 'createGame', 'restoreGame', 'describeHint', 'createKeyReader',
      'typedLabels'],
    help: ['start', 'buildExample', 'drawExample', 'render', 'SECTION_IDS', 'SHORTCUTS'],
    app: ['getStore', 'getBoard', 'getResult', 'toast', 'openModal', 'announce', 'on', 'emit', 'showResult',
      'getPuzzle', 'open', 'openPuzzle', 'start']
  };

  describe('ui contract: function surface', function () {
    Object.keys(SURFACE).forEach(function (name) {
      it('SG.' + name + ' exports its declared members', function () {
        if (!SG[name]) SG.test.skip('SG.' + name + ' is not part of the sources loaded yet');
        expect(typeof SG[name]).toBe('object');
        var missing = SURFACE[name].filter(function (member) { return SG[name][member] === undefined; });
        expect(missing).toEqual([]);
      });
    });

    it('describes every function of SG.app in the JSDoc header of app.js', function () {
      if (!exists('js/ui/app.js')) SG.test.skip('js/ui/app.js does not exist yet');
      var text = readText('js/ui/app.js');
      var header = text.slice(0, text.indexOf('(function (root)'));
      SURFACE.app.forEach(function (member) { expect(header).toContain(member); });
      ['result', 'locale', 'settings', 'action'].forEach(function (name) {
        expect(header).toContain("'" + name + "'");
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // 2. Loading without a DOM; what the player does not contain
  // ---------------------------------------------------------------------------------------------

  describe('ui contract: loads without a DOM', function () {
    it('loads every source file, in the declared order, in a context that has no DOM globals', function () {
      var env = needNode();
      var files = sourceFilesOfRunner().filter(function (rel) { return exists(rel); });
      expect(files.length).toBeGreaterThan(20);
      var context = env.vm.createContext({ console: console, setTimeout: setTimeout, clearTimeout: clearTimeout });
      files.forEach(function (rel) {
        try {
          env.vm.runInContext(readText(rel), context, { filename: rel });
        } catch (err) {
          throw new Error(rel + ' does not load without a DOM: ' + err.message);
        }
      });
      var absent = env.vm.runInContext(
        "['document', 'window', 'localStorage', 'navigator', 'location', 'HTMLElement'].filter(function (n) {" +
        " return typeof globalThis[n] !== 'undefined'; }).join()", context);
      expect(absent).toBe('');
    });

    it('the engines touch no DOM, storage or browser global (and js/ui keeps them inside functions)', function () {
      needNode();
      ENGINE_DIRS.forEach(function (dir) {
        listDir(dir, '.js').forEach(function (name) {
          var code = stripJsComments(readText(dir + '/' + name));
          var hit = /\b(?:document|window|localStorage|sessionStorage|navigator|location|XMLHttpRequest)\b/.exec(code);
          expect(hit === null ? '' : dir + '/' + name + ': ' + hit[0]).toBe('');
        });
      });
    });

    it('has no import, export or require in js/', function () {
      needNode();
      ENGINE_DIRS.concat(['../core/js/ui', 'js/ui']).forEach(function (dir) {
        listDir(dir, '.js').forEach(function (name) {
          var code = stripJsComments(readText(dir + '/' + name));
          expect(/^\s*(?:import\s|export\s)|\brequire\(/m.test(code) ? dir + '/' + name : '').toBe('');
        });
      });
    });
  });

  describe('ui contract: what the player does not contain', function () {
    var FORBIDDEN = ['pipeline', 'digger', 'fullGrid', 'variants', 'workerClient', 'symmetry', 'difficulty', 'rng',
      'events', 'exportUi', 'importUi', 'explainCard', 'resultView', 'stepView', 'cache', 'controls'];

    it('loads no generation, registry, worker, cache, steps, replay, explain, result or export module', function () {
      var present = FORBIDDEN.filter(function (name) { return SG[name] !== undefined; });
      expect(present).toEqual([]);
    });

    it('has no source file or page for them either', function () {
      needNode();
      var banned = ['full-grid', 'digger', 'pipeline', 'symmetry', 'difficulty', 'rng', 'events', 'registry',
        'worker-client', 'gen.worker', 'step-view', 'explain', 'result-view', 'export', 'cache', 'controls',
        'print'];
      var offenders = [];
      ENGINE_DIRS.concat(['../core/js/ui', 'js/ui', '../core/css', 'css']).forEach(function (dir) {
        listDir(dir, '').forEach(function (name) {
          var base = name.replace(/\.[a-z]+$/, '');
          if (banned.indexOf(base) !== -1) offenders.push(dir + '/' + name);
        });
      });
      expect(offenders).toEqual([]);
      expect(exists('js/variants')).toBe(false);
      expect(exists('js/worker')).toBe(false);
    });

    it('does not use a generator module in any script of js/', function () {
      needNode();
      var pattern = new RegExp('\\bSG\\.(?:' + FORBIDDEN.join('|') + ')\\b');
      var offenders = [];
      ENGINE_DIRS.concat(['../core/js/ui', 'js/ui']).forEach(function (dir) {
        listDir(dir, '.js').forEach(function (name) {
          var code = stripJsComments(readText(dir + '/' + name));
          if (pattern.test(code)) offenders.push(dir + '/' + name + ': ' + pattern.exec(code)[0]);
        });
      });
      expect(offenders).toEqual([]);
    });
  });
  // ---------------------------------------------------------------------------------------------
  // 3. No colour literals outside the token files
  // ---------------------------------------------------------------------------------------------

  var NAMED_COLORS = ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan ' +
    'darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen ' +
    'darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey ' +
    'darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite ' +
    'forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink ' +
    'indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral ' +
    'lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta ' +
    'maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue ' +
    'mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin ' +
    'navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen ' +
    'paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red ' +
    'rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue ' +
    'slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
    'whitesmoke yellow yellowgreen').split(' ');
  var NAMED_SET = {};
  NAMED_COLORS.forEach(function (name) { NAMED_SET[name] = true; });

  /** Values that carry no colour of their own and are always fine. */
  var NEUTRAL = { transparent: true, currentcolor: true, none: true, inherit: true, initial: true, unset: true };

  var COLOR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|device-cmyk)\(/;
  var HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

  /** Properties whose value is (or contains) a colour. Custom properties count: they are colour tokens. */
  var COLOR_PROPERTY = new RegExp('^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|' +
    'inline|block)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|stop-color|flood-color|' +
    'lighting-color|box-shadow|text-shadow|caret-color|accent-color|column-rule(?:-color)?|' +
    'text-decoration(?:-color)?|scrollbar-color|text-emphasis-color|--[\\w-]+)$');

  function stripCssComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  /** Colour literals in the value of one declaration (a `var(...)` reference is never a literal). */
  function literalsInValue(property, rawValue) {
    var found = [];
    var value = rawValue.replace(/url\([^)]*\)/g, '').replace(/var\([^)]*\)/g, '').replace(/"[^"]*"|'[^']*'/g, '');
    var hex = HEX_COLOR.exec(value);
    if (hex) found.push(hex[0]);
    var fn = COLOR_FUNCTION.exec(value);
    if (fn) found.push(fn[0]);
    if (COLOR_PROPERTY.test(property)) {
      (value.match(/[a-zA-Z][a-zA-Z-]*/g) || []).forEach(function (word) {
        var lower = word.toLowerCase();
        if (NAMED_SET[lower] === true && NEUTRAL[lower] !== true) found.push(word);
      });
    }
    return found;
  }

  /** Every colour literal of a stylesheet text, as 'property: literal'. */
  function cssColorLiterals(css) {
    var out = [];
    var re = /(?:^|[;{}\s])((?:--)?[a-zA-Z][\w-]*)\s*:\s*([^;{}]*)/g;
    var m;
    var text = stripCssComments(css);
    while ((m = re.exec(text)) !== null) {
      literalsInValue(m[1], m[2]).forEach(function (literal) { out.push(m[1] + ': ' + literal); });
    }
    return out;
  }

  /** Removes comments from JavaScript without touching strings such as 'http://...'. */
  function stripJsComments(code) {
    var out = '';
    var i = 0;
    var n = code.length;
    var quote = null;
    while (i < n) {
      var c = code[i];
      var d = code[i + 1];
      if (quote !== null) {
        out += c;
        if (c === '\\') {
          out += d === undefined ? '' : d;
          i += 2;
          continue;
        }
        if (c === quote) quote = null;
        i++;
      } else if (c === '/' && d === '*') {
        var end = code.indexOf('*/', i + 2);
        i = end === -1 ? n : end + 2;
        out += ' ';
      } else if (c === '/' && d === '/') {
        while (i < n && code[i] !== '\n') i++;
      } else {
        if (c === "'" || c === '"' || c === '`') quote = c;
        out += c;
        i++;
      }
    }
    return out;
  }

  /**
   * Colour literals in JavaScript source: hex colours and colour functions anywhere in a string, named
   * colours as the value of a colour property in CSS-like text or of a colour attribute.
   */
  function jsColorLiterals(code) {
    var text = stripJsComments(code);
    var out = [];
    var hex = /#[0-9a-fA-F]{3,8}\b(?!-)/g;
    var m;
    while ((m = hex.exec(text)) !== null) out.push(m[0]);
    var fn = new RegExp(COLOR_FUNCTION.source.replace('\\b', '\\b'), 'g');
    while ((m = fn.exec(text)) !== null) out.push(m[0]);
    var names = NAMED_COLORS.join('|');
    var css = new RegExp('\\b(?:color|fill|stroke|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|' +
      'stop-color)\\s*[:=]\\s*[\'"]?\\s*(' + names + ')\\b(?!-)', 'gi');
    while ((m = css.exec(text)) !== null) out.push(m[0]);
    var attr = new RegExp('[\'"](?:fill|stroke|color|stop-color|flood-color)[\'"]\\s*,\\s*[\'"]\\s*(' + names +
      ')[\'"]', 'gi');
    while ((m = attr.exec(text)) !== null) out.push(m[0]);
    return out;
  }

  describe('ui contract: colour literal scanners', function () {
    it('finds hex colours, colour functions and named colours in CSS, never in var() references', function () {
      expect(cssColorLiterals('a { color: #fff; }')).toEqual(['color: #fff']);
      expect(cssColorLiterals('a { background: rgba(0, 0, 0, .5) }')).toEqual(['background: rgba(']);
      expect(cssColorLiterals('a { border: 1px solid red; }')).toEqual(['border: red']);
      expect(cssColorLiterals('a { box-shadow: 0 0 2px hsl(0 0% 0%) }')).toEqual(['box-shadow: hsl(']);
      expect(cssColorLiterals('a { color: var(--sg-color-text); background: transparent; fill: currentColor; ' +
        'border: 1px solid var(--sg-color-border); }')).toEqual([]);
      expect(cssColorLiterals('/* color: red */ #a11y-live { color: inherit; font-family: Tan, sans-serif }'))
        .toEqual([]);
      expect(cssColorLiterals(':root { --sg-x: navy; }')).toEqual(['--sg-x: navy']);
    });

    it('finds colour literals in JavaScript strings but ignores comments and plain words', function () {
      expect(jsColorLiterals("el.style.cssText = 'color: #ff0000';")).toEqual(['#ff0000']);
      expect(jsColorLiterals("x = 'rgb(1, 2, 3)';")).toEqual(['rgb(']);
      expect(jsColorLiterals("x = 'background: white';").length).toBe(1);
      expect(jsColorLiterals("node.setAttribute('fill', 'red');").length).toBe(1);
      expect(jsColorLiterals("// color: red\n/* #fff */ var a = 'http://www.w3.org/2000/svg'; id = '#a11y-live';"))
        .toEqual([]);
      expect(jsColorLiterals("x = 'var(--sg-color-text)'; y = { color: 'currentColor', fill: 'none' };"))
        .toEqual([]);
    });
  });

  describe('ui contract: no colour literal outside css/tokens.css and css/tokens-board.css', function () {
    var TOKEN_FILES = ['tokens.css', 'tokens-board.css'];

    /** The shared stylesheets of core/css and the project's own, as paths from the project root. */
    var sheets = ['../core/css', 'css'].reduce(function (all, dir) {
      return all.concat(listDir(dir, '.css').map(function (name) { return dir + '/' + name; }));
    }, []);

    it('has the stylesheets to check', function () {
      var names = sheets.map(function (rel) { return rel.slice(rel.lastIndexOf('/') + 1); });
      ['base.css', 'layout.css', 'components.css'].forEach(function (name) { expect(names).toContain(name); });
    });

    sheets.forEach(function (rel) {
      if (TOKEN_FILES.indexOf(rel.slice(rel.lastIndexOf('/') + 1)) !== -1) return;
      it(rel + ' uses var(--sg-...) tokens only', function () {
        expect(cssColorLiterals(readText(rel))).toEqual([]);
      });
    });

    var scripts = ['../core/js/ui', 'js/ui'].reduce(function (all, dir) {
      return all.concat(listDir(dir, '.js').map(function (name) { return dir + '/' + name; }));
    }, []);

    scripts.forEach(function (rel) {
      // JavaScript may read the computed value of a token, it never writes a colour of its own. The board's
      // SVG export (`staticCss` in board-view.js) is written with `var(--sg-...)` and resolved at run time.
      it(rel + ' contains no colour literal', function () {
        expect(jsColorLiterals(readText(rel))).toEqual([]);
      });
    });

    it('index.html has no colour literal in a style attribute, a <style> block or a colour attribute', function () {
      var html = readText('index.html').replace(/<!--[\s\S]*?-->/g, '');
      var found = [];
      (html.match(/<style[\s\S]*?<\/style>/gi) || []).forEach(function (block) {
        found = found.concat(cssColorLiterals(block.replace(/<\/?style[^>]*>/gi, '')));
      });
      var attr = /\s(style|fill|stroke|color|bgcolor|stop-color|flood-color|lighting-color)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
      var m;
      while ((m = attr.exec(html)) !== null) {
        var name = m[1].toLowerCase();
        var value = m[2] !== undefined ? m[2] : m[3];
        if (name === 'style') found = found.concat(cssColorLiterals('x{' + value + '}'));
        else if (NEUTRAL[value.trim().toLowerCase()] !== true && !/^var\(/.test(value.trim())) {
          found.push(name + '="' + value + '"');
        }
      }
      expect(found).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // 4. index.html
  // ---------------------------------------------------------------------------------------------

  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1,
    track: 1, wbr: 1 };

  function parseAttrs(text) {
    var attrs = {};
    var re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      attrs[m[1]] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ''));
    }
    return attrs;
  }

  /**
   * A small HTML reader for index.html: the elements with their attributes and the non-blank text nodes
   * with the element that holds them. Scripts and styles are skipped.
   */
  function readHtml(html) {
    var src = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!doctype[^>]*>/i, '');
    var tagRe = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
    var elements = [];
    var texts = [];
    var scripts = [];
    var stack = [];
    var last = 0;
    var m;
    function text(upTo) {
      var chunk = src.slice(last, upTo).replace(/&[a-zA-Z#0-9]+;/g, ' ');
      if (chunk.trim() !== '') texts.push({ text: chunk.trim(), parent: stack[stack.length - 1] || null });
    }
    while ((m = tagRe.exec(src)) !== null) {
      text(m.index);
      var name = m[2].toLowerCase();
      if (m[1] === '/') {
        while (stack.length > 0 && stack[stack.length - 1].tag !== name) stack.pop();
        stack.pop();
        last = tagRe.lastIndex;
        continue;
      }
      var el = { tag: name, attrs: parseAttrs(m[3]) };
      elements.push(el);
      if (name === 'script' || name === 'style') {
        var close = src.toLowerCase().indexOf('</' + name, tagRe.lastIndex);
        if (name === 'script') scripts.push(el.attrs.src || null);
        tagRe.lastIndex = close === -1 ? src.length : src.indexOf('>', close) + 1;
        last = tagRe.lastIndex;
        continue;
      }
      if (VOID[name] !== 1 && m[4] !== '/') stack.push(el);
      last = tagRe.lastIndex;
    }
    return { elements: elements, texts: texts, scripts: scripts };
  }

  var MOUNT_IDS = ['skip-link', 'app-title', 'lang-switch', 'theme-switch', 'btn-open', 'btn-settings', 'btn-help',
    'main', 'welcome', 'btn-welcome-open', 'link-generator', 'welcome-recent', 'player-layout', 'board-root',
    'board-svg', 'board-title', 'board-desc', 'board-legend', 'play-status', 'side-root', 'play-root', 'options-root',
    'recent-root', 'status-line', 'drop-overlay', 'modal-root', 'toast-root', 'a11y-live'];

  describe('ui contract: index.html', function () {
    it('has every mount point of the page and the language and theme buttons', function () {
      var page = readHtml(readText('index.html'));
      var ids = {};
      page.elements.forEach(function (el) { if (el.attrs.id) ids[el.attrs.id] = true; });
      expect(MOUNT_IDS.filter(function (id) { return ids[id] !== true; })).toEqual([]);
      function count(attribute) {
        return page.elements.filter(function (el) { return el.attrs[attribute] !== undefined; })
          .map(function (el) { return el.attrs[attribute]; }).sort();
      }
      expect(count('data-lang')).toEqual(['en', 'vi']);
      expect(count('data-theme-value')).toEqual(['dark', 'high-contrast', 'light']);
    });

    it('has no hard-coded visible text: every text node, title and label is translated', function () {
      var page = readHtml(readText('index.html'));
      var loose = page.texts.filter(function (t) {
        // The <noscript> notice cannot be translated by a script that does not run: it is bilingual text.
        if (t.parent !== null && t.parent.attrs.class === 'noscript') return false;
        return t.parent === null || t.parent.attrs['data-i18n'] === undefined;
      }).map(function (t) { return (t.parent ? '<' + t.parent.tag + '> ' : '') + t.text; });
      expect(loose).toEqual([]);

      var VISIBLE = ['title', 'aria-label', 'placeholder', 'alt', 'aria-description', 'aria-roledescription',
        'aria-placeholder', 'aria-valuetext', 'label'];
      var untranslated = [];
      page.elements.forEach(function (el) {
        var translated = {};
        (el.attrs['data-i18n-attr'] || '').split(',').forEach(function (pair) {
          var cut = pair.lastIndexOf(':');
          if (cut > 0) translated[pair.slice(0, cut).trim()] = true;
        });
        VISIBLE.concat(el.tag === 'button' ? ['value'] : []).forEach(function (name) {
          if (el.attrs[name] !== undefined && translated[name] !== true) {
            untranslated.push('<' + el.tag + (el.attrs.id ? '#' + el.attrs.id : '') + '> ' + name + '="' +
              el.attrs[name] + '"');
          }
        });
      });
      expect(untranslated).toEqual([]);
    });

    it('the reader finds hard-coded text and untranslated labels (so the test above can fail)', function () {
      var page = readHtml('<main><h1>Hello</h1><p data-i18n="a.b"></p><button title="Go" aria-label="Go" ' +
        'data-i18n-attr="aria-label:x.y"></button><script>var a = "<b>";</script></main>');
      expect(page.texts.map(function (t) { return t.text; })).toEqual(['Hello']);
      expect(page.elements.map(function (el) { return el.tag; })).toEqual(['main', 'h1', 'p', 'button', 'script']);
      expect(page.elements[3].attrs.title).toBe('Go');
    });

    it('lists the scripts in the order of SOURCE_FILES (tests/node-runner.js), without the files of the guide', function () {
      var page = readHtml(readText('index.html'));
      var scripts = page.scripts.filter(function (src) { return src !== null; });
      expect(scripts).toEqual(sourceFilesOfRunner().filter(function (rel) { return HELP_ONLY.indexOf(rel) === -1; }));
    });
  });

  // help.html is the guide that the Help button opens in a new tab: it needs the core (the examples replay
  // the hints), the strings and the board, and none of the page of the player.
  var HELP_ONLY = ['js/ui/help-examples.js', 'js/ui/help.js'];
  var NOT_IN_GUIDE = ['../core/js/ui/exchange.js', 'js/ui/importer.js', 'js/ui/a11y.js', 'js/ui/progress.js', 'js/ui/app.js',
    '../core/assets/wordbook/words.vi.js', '../core/assets/wordbook/words.en.js', '../core/js/ui/wordbook.js'];

  describe('ui contract: help.html', function () {
    var page = readHtml(readText('help.html'));

    it('has its mount points and the language and theme buttons', function () {
      var ids = {};
      page.elements.forEach(function (el) { if (el.attrs.id) ids[el.attrs.id] = true; });
      ['main', 'help-root', 'help-toc', 'skip-link', 'help-lang', 'help-theme'].forEach(function (id) {
        expect(ids[id]).toBe(true);
      });
      function count(attribute) {
        return page.elements.filter(function (el) { return el.attrs[attribute] !== undefined; })
          .map(function (el) { return el.attrs[attribute]; }).sort();
      }
      expect(count('data-lang')).toEqual(['en', 'vi']);
      expect(count('data-theme-value')).toEqual(['dark', 'high-contrast', 'light']);
    });

    it('has no hard-coded visible text and no dialog, About or Variants', function () {
      var loose = page.texts.filter(function (t) {
        if (t.parent !== null && t.parent.attrs.class === 'noscript') return false;
        return t.parent === null || t.parent.attrs['data-i18n'] === undefined;
      }).map(function (t) { return (t.parent ? '<' + t.parent.tag + '> ' : '') + t.text; });
      expect(loose).toEqual([]);
      var text = readText('help.html') + readText('js/ui/help.js');
      expect(/openModal|help\.tab\.|help\.about|help\.variant/.test(text)).toBe(false);
    });

    it('loads the sources of the guide, in the order of SOURCE_FILES, and the files exist', function () {
      var scripts = page.scripts.filter(function (src) { return src !== null; });
      expect(scripts).toEqual(sourceFilesOfRunner().filter(function (rel) { return NOT_IN_GUIDE.indexOf(rel) === -1; }));
      scripts.forEach(function (src) { expect(exists(src) ? '' : src + ' is missing').toBe(''); });
    });

    it('links the stylesheets that exist, and the Help button of the player opens it in a new tab', function () {
      page.elements.filter(function (el) { return el.tag === 'link' && el.attrs.rel === 'stylesheet'; })
        .forEach(function (el) { expect(exists(el.attrs.href) ? '' : el.attrs.href + ' is missing').toBe(''); });
      var button = readHtml(readText('index.html')).elements.filter(function (el) { return el.attrs.id === 'btn-help'; })[0];
      expect(button.tag).toBe('a');
      expect(button.attrs.href).toBe('help.html');
      expect(button.attrs.target).toBe('_blank');
      expect(button.attrs.rel).toContain('noopener');
      expect(exists('help.html')).toBe(true);
    });

    it('is published with the app, next to the shared code', function () {
      var workflow = readText('../.github/workflows/pages.yml');
      expect(workflow).toContain('player/help.html');
      expect(workflow).toContain('core/js');
    });
  });

  describe('ui contract: one list of source files everywhere', function () {
    it('tests.html loads the same SOURCE_FILES as the Node runner, in the same order', function () {
      var listed = quotedList(readText('tests.html'), 'var SOURCE_FILES');
      expect(listed).toEqual(sourceFilesOfRunner());
    });

    it('index.html links the stylesheets that exist, the favicon and the generator link of the meta tag', function () {
      var page = readHtml(readText('index.html'));
      var sheets = page.elements.filter(function (el) { return el.tag === 'link' && el.attrs.rel === 'stylesheet'; })
        .map(function (el) { return el.attrs.href; });
      expect(sheets.length).toBeGreaterThan(3);
      sheets.forEach(function (href) { expect(exists(href) ? '' : href + ' is missing').toBe(''); });
      var meta = page.elements.filter(function (el) { return el.tag === 'meta' && el.attrs.name === 'sg-generator-url'; });
      expect(meta).toHaveLength(1);
      expect(meta[0].attrs.content).toBe('../generator/index.html');
      // A page, not a folder: opened from a disk a folder shows a file listing instead of the page.
      expect(needNode().fs.statSync(needNode().path.join(needNode().root, meta[0].attrs.content)).isFile()).toBe(true);
    });

    it('every suite in tests/suites is listed in the SUITE_FILES of tests.html', function () {
      var listed = quotedList(readText('tests.html'), 'var SUITE_FILES');
      expect(listed).not.toBeNull();
      var suites = listDir('tests/suites', '.test.js').map(function (name) {
        return name.slice(0, -'.test.js'.length);
      });
      expect(suites.length).toBeGreaterThan(3);
      expect(suites.filter(function (name) { return listed.indexOf(name) === -1; })).toEqual([]);
    });

    it('every suite in ../core/tests/suites is listed in the CORE_SUITE_FILES of tests.html', function () {
      var listed = quotedList(readText('tests.html'), 'var CORE_SUITE_FILES');
      expect(listed).not.toBeNull();
      var suites = listDir('../core/tests/suites', '.test.js').map(function (name) {
        return name.slice(0, -'.test.js'.length);
      });
      expect(suites.length).toBeGreaterThan(5);
      expect(suites.filter(function (name) { return listed.indexOf(name) === -1; })).toEqual([]);
      expect(listed.filter(function (name) { return suites.indexOf(name) === -1; })).toEqual([]);
    });

    it('the list reader of this file notices a missing entry', function () {
      var listed = quotedList("var SUITE_FILES = [\n  'a', 'b', // c\n  'd'\n];", 'var SUITE_FILES');
      expect(listed).toEqual(['a', 'b', 'd']);
      expect(['a', 'x'].filter(function (name) { return listed.indexOf(name) === -1; })).toEqual(['x']);
    });
  });

})();
