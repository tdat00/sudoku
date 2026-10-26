// UI contract: what every UI module promises to the others and to the page, checked on Node
// without a DOM. 1. the function surface of each module, 2. every UI file loads without a DOM, 3. no colour
// literal outside the token files, 4. index.html: mount points, no hard-coded visible text, script order
// equal to SOURCE_FILES (node-runner.js, tests.html, js/worker/gen.worker.js), 5. every suite is listed in
// tests.html, 6. the main-thread generation client of the app. Pure source scans: the files are read as
// text, nothing here needs a browser.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var NODE = SG.test.node;

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

  /** Module -> the functions it must export. Extra members are fine, a missing one fails. */
  var SURFACE = {
    i18n: ['t', 'tError', 'eventText', 'has', 'setLocale', 'onChange', 'applyTo', 'detect', 'formatNumber',
      'formatDuration', 'setCellLabeler'],
    exchange: ['canCompress', 'plain', 'encode', 'decode', 'tokenFromHash', 'isAllowedBase', 'playerUrl',
      'isDocument'],
    store: ['defaults', 'sanitize', 'toConfig', 'parseUrl', 'readUrl', 'toUrlParams', 'toSearchString',
      'shareUrl', 'create', 'instance'],
    controls: ['describe', 'mount', 'copyText'],
    symbols: ['modesFor', 'glyph', 'legend', 'legendMarkup', 'renderLegend'],
    boardView: ['create', 'geometry', 'renderMarkup', 'exportSvg', 'cellView', 'resolveTokens'],
    stepView: ['create', 'chartModel', 'placeTip'],
    explainCard: ['create', 'viewModel'],
    player: ['create', 'buildSteps', 'viewAt', 'describeStep', 'stepTitle', 'stepMeta', 'positionText'],
    resultView: ['create', 'viewModel'],
    app: ['getStore', 'getBoard', 'getPlayer', 'getStepView', 'getExplainContext', 'getResult', 'generate',
      'cancel', 'toast',
      'openModal', 'announce', 'on', 'emit']
  };

  /** The instance interfaces that can be created without a DOM. */
  var PLAYER_INSTANCE = ['load', 'reset', 'next', 'prev', 'first', 'last', 'seek', 'state', 'describe',
    'getSteps', 'getStep', 'bindControls', 'destroy'];

  var CLIENT_SURFACE = ['generate', 'cancel'];

  describe('ui contract: function surface', function () {
    Object.keys(SURFACE).forEach(function (name) {
      it('SG.' + name + ' exports ' + SURFACE[name].length + ' declared functions', function () {
        expect(typeof SG[name]).toBe('object');
        var missing = SURFACE[name].filter(function (member) {
          return typeof SG[name][member] !== 'function';
        });
        expect(missing).toEqual([]);
      });
    });

    it('the replay player instance has the declared interface', function () {
      var player = SG.player.create({});
      try {
        var missing = PLAYER_INSTANCE.filter(function (member) {
          return typeof player[member] !== 'function';
        });
        expect(missing).toEqual([]);
      } finally {
        player.destroy();
      }
    });

    it('the main-thread client has the interface of the worker client', function () {
      var client = SG.app.directClient;
      CLIENT_SURFACE.forEach(function (member) { expect(typeof client[member]).toBe('function'); });
      expect(client.mode).toBe('main');
    });

    it('every function of SG.app is described in the JSDoc header of app.js', function () {
      var text = readText('js/ui/app.js');
      var header = text.slice(0, text.indexOf('(function (root)'));
      SURFACE.app.concat(['regenerate', 'start', 'destroy']).forEach(function (member) {
        expect(header).toContain(member);
      });
      ['generate:start', 'generate:progress', 'generate:end', 'generate:error', 'result', 'locale',
        'position', 'theme', 'settings', 'action'].forEach(function (name) {
        expect(header).toContain("'" + name + "'");
      });
      ['exportUi', 'a11y', 'theme', 'help', 'cache', 'history'].forEach(function (name) {
        expect(header).toContain('SG.' + name);
      });
    });
  });

  describe('ui contract: loads without a DOM', function () {
    it('loads every source file, in the declared order, in a context that has no DOM globals', function () {
      var env = needNode();
      var files = sourceFilesOfRunner().filter(function (rel) { return exists(rel); });
      var uiFiles = files.filter(function (rel) { return /^js\/(ui|worker)\//.test(rel); });
      expect(uiFiles.length).toBeGreaterThan(8);
      var context = env.vm.createContext({
        console: console, setTimeout: setTimeout, clearTimeout: clearTimeout
      });
      files.forEach(function (rel) {
        try {
          env.vm.runInContext(readText(rel), context, { filename: rel });
        } catch (err) {
          throw new Error(rel + ' does not load without a DOM: ' + err.message);
        }
      });
      var absent = env.vm.runInContext(
        "['document', 'window', 'localStorage', 'navigator', 'location', 'HTMLElement']" +
        ".filter(function (n) { return typeof globalThis[n] !== 'undefined'; }).join()", context);
      expect(absent).toBe('');
      var surface = env.vm.runInContext(
        'JSON.stringify(Object.keys(SG).filter(function (k) { return k === "app" || k === "resultView"; }))',
        context);
      expect(JSON.parse(surface).sort()).toEqual(['app', 'resultView']);
    });

    it('SG.app does nothing without a DOM: no start, no toast, no modal, generate resolves null',
      function () {
        expect(SG.app.start()).toBe(false);
        expect(SG.app.getBoard()).toBeNull();
        expect(SG.app.getPlayer()).toBeNull();
        expect(SG.app.getStepView()).toBeNull();
        expect(SG.app.getExplainContext()).toBeNull();
        expect(SG.app.getResult()).toBeNull();
        expect(SG.app.openModal({ titleKey: 'result.title' })).toBeNull();
        expect(typeof SG.app.toast('info', 'result.title').close).toBe('function');
        return SG.app.generate().then(function (result) { expect(result).toBeNull(); });
      });
  });

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
  var NEUTRAL = {
    transparent: true, currentcolor: true, none: true, inherit: true, initial: true, unset: true
  };

  var COLOR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|device-cmyk)\(/;
  var HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

  /** Properties whose value is (or contains) a colour. Custom properties count: they are colour tokens. */
  var COLOR_PROPERTY = new RegExp('^(?:color|background(?:-color|-image)?|' +
    'border(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?(?:-color)?|' +
    'outline(?:-color)?|fill|stroke|stop-color|flood-color|' +
    'lighting-color|box-shadow|text-shadow|caret-color|accent-color|column-rule(?:-color)?|' +
    'text-decoration(?:-color)?|scrollbar-color|text-emphasis-color|--[\\w-]+)$');

  function stripCssComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  /** Colour literals in the value of one declaration (a `var(...)` reference is never a literal). */
  function literalsInValue(property, rawValue) {
    var found = [];
    var value = rawValue.replace(/url\([^)]*\)/g, '').replace(/var\([^)]*\)/g, '')
      .replace(/"[^"]*"|'[^']*'/g, '');
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
    var css = new RegExp('\\b(?:color|fill|stroke|background(?:-color)?|border(?:-[a-z]+)*|' +
      'outline(?:-color)?|stop-color)\\s*[:=]\\s*[\'"]?\\s*(' + names + ')\\b(?!-)', 'gi');
    while ((m = css.exec(text)) !== null) out.push(m[0]);
    var attr = new RegExp('[\'"](?:fill|stroke|color|stop-color|flood-color)[\'"]\\s*,\\s*[\'"]\\s*(' +
      names + ')[\'"]', 'gi');
    while ((m = attr.exec(text)) !== null) out.push(m[0]);
    return out;
  }

  describe('ui contract: colour literal scanners', function () {
    it('finds hex colours, colour functions and named colours in CSS, never in var() references',
      function () {
        expect(cssColorLiterals('a { color: #fff; }')).toEqual(['color: #fff']);
        expect(cssColorLiterals('a { background: rgba(0, 0, 0, .5) }')).toEqual(['background: rgba(']);
        expect(cssColorLiterals('a { border: 1px solid red; }')).toEqual(['border: red']);
        expect(cssColorLiterals('a { box-shadow: 0 0 2px hsl(0 0% 0%) }')).toEqual(['box-shadow: hsl(']);
        expect(cssColorLiterals('a { color: var(--sg-color-text); background: transparent; fill: ' +
          'currentColor; ' +
          'border: 1px solid var(--sg-color-border); }')).toEqual([]);
        var neutral = '/* color: red */ #a11y-live { color: inherit; font-family: Tan, sans-serif }';
        expect(cssColorLiterals(neutral)).toEqual([]);
        expect(cssColorLiterals(':root { --sg-x: navy; }')).toEqual(['--sg-x: navy']);
      });

    it('finds colour literals in JavaScript strings but ignores comments and plain words', function () {
      expect(jsColorLiterals("el.style.cssText = 'color: #ff0000';")).toEqual(['#ff0000']);
      expect(jsColorLiterals("x = 'rgb(1, 2, 3)';")).toEqual(['rgb(']);
      expect(jsColorLiterals("x = 'background: white';").length).toBe(1);
      expect(jsColorLiterals("node.setAttribute('fill', 'red');").length).toBe(1);
      var commented = "// color: red\n/* #fff */ var a = 'http://www.w3.org/2000/svg'; id = '#a11y-live';";
      expect(jsColorLiterals(commented)).toEqual([]);
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
      ['base.css', 'layout.css', 'components.css'].forEach(function (name) {
        expect(names).toContain(name);
      });
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
    if (exists('js/worker/worker-client.js')) scripts.push('js/worker/worker-client.js');

    scripts.forEach(function (rel) {
      // JavaScript may read the computed value of a token, it never writes a colour of its own. The board's
      // SVG export (`staticCss` in board-view.js) is written with `var(--sg-...)` and resolved at run time.
      it(rel + ' contains no colour literal', function () {
        expect(jsColorLiterals(readText(rel))).toEqual([]);
      });
    });

    it('index.html has no colour literal in a style attribute, a <style> block or a colour attribute',
      function () {
        var html = readText('index.html').replace(/<!--[\s\S]*?-->/g, '');
        var found = [];
        (html.match(/<style[\s\S]*?<\/style>/gi) || []).forEach(function (block) {
          found = found.concat(cssColorLiterals(block.replace(/<\/?style[^>]*>/gi, '')));
        });
        var attr = new RegExp('\\s(style|fill|stroke|color|bgcolor|stop-color|flood-color|lighting-color)' +
          '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'gi');
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

  var VOID = {
    area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1,
    wbr: 1
  };

  function parseAttrs(text) {
    var attrs = {};
    var re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      var value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
      attrs[m[1]] = value !== undefined ? value : '';
    }
    return attrs;
  }

  /**
   * A small HTML reader for index.html: the elements with their attributes and the non-blank text nodes
   * with the element that holds them. Scripts and styles are skipped.
   */
  function readHtml(html) {
    var src = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!doctype[^>]*>/i, '');
    var tagRe =
      /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
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

  var MOUNT_IDS = ['skip-link', 'app-title', 'lang-switch', 'theme-switch', 'btn-settings', 'btn-help',
    'btn-drawer', 'controls-root', 'controls-form', 'btn-generate', 'btn-regenerate', 'btn-cancel',
    'btn-export', 'btn-export-code', 'btn-play-online',
    'board-root', 'board-svg', 'board-title', 'board-desc', 'player-root', 'btn-first', 'btn-prev',
    'btn-next', 'btn-last', 'scrubber', 'player-time', 'steps-root', 'step-detail',
    'btn-explain', 'result-root', 'modal-root', 'toast-root', 'a11y-live'];

  describe('ui contract: index.html', function () {
    it('has every mount point of the contract and the language and theme buttons',
      function () {
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

    it('starts with Generate and Generate random both enabled (the random one never waits for a first run)',
      function () {
        var page = readHtml(readText('index.html'));
        ['btn-generate', 'btn-regenerate'].forEach(function (id) {
          var button = page.elements.filter(function (el) { return el.attrs.id === id; })[0];
          expect(button).toBeDefined();
          expect(button.attrs.disabled).toBeUndefined();
        });
      });

    it('has no hard-coded visible text: every text node, title and label is translated', function () {
      var page = readHtml(readText('index.html'));
      var loose = page.texts.filter(function (t) {
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
      expect(page.elements.map(function (el) { return el.tag; }))
        .toEqual(['main', 'h1', 'p', 'button', 'script']);
      expect(page.elements[3].attrs.title).toBe('Go');
    });

    it('lists the scripts in the order of SOURCE_FILES (tests/node-runner.js)', function () {
      var page = readHtml(readText('index.html'));
      var scripts = page.scripts.filter(function (src) { return src !== null; });
      expect(scripts).toEqual(sourceFilesOfRunner());
    });
  });

  describe('ui contract: one list of source files everywhere', function () {
    it('tests.html loads the same SOURCE_FILES as the Node runner, in the same order', function () {
      var listed = quotedList(readText('tests.html'), 'var SOURCE_FILES');
      expect(listed).toEqual(sourceFilesOfRunner());
    });

    it('js/worker/gen.worker.js imports the core, the variants and the word lists in the same order, no UI',
      function () {
        var text = readText('js/worker/gen.worker.js').replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        // Every script path written in the file, in order (a SCRIPTS array or importScripts arguments), as a
        // path from the project root: paths are relative to js/worker/.
        var paths = (text.match(/['"][^'"\s]+\.js['"]/g) || []).map(function (s) { return s.slice(1, -1); });
        var normalised = paths.map(function (p) {
          return /^\.\.?\//.test(p) ? NODE.path.posix.normalize('js/worker/' + p) : p;
        });
        var expected = sourceFilesOfRunner().filter(function (rel) {
          return /^(?:\.\.\/core\/js\/engine|js\/engine|js\/variants|assets\/wordlists)\//.test(rel);
        });
        expect(normalised).toEqual(expected);
        paths.forEach(function (p) {
          expect(/\/ui\/|worker-client/.test(p)).toBe(false);
        });
      });

    it('every suite in tests/suites is listed in the SUITE_FILES of tests.html', function () {
      var listed = quotedList(readText('tests.html'), 'var SUITE_FILES');
      expect(listed).not.toBeNull();
      var suites = listDir('tests/suites', '.test.js').map(function (name) {
        return name.slice(0, -'.test.js'.length);
      });
      expect(suites.length).toBeGreaterThan(10);
      expect(suites.filter(function (name) { return listed.indexOf(name) === -1; })).toEqual([]);
    });

    it('every suite in tests/manual is listed in the MANUAL_SUITE_FILES of tests.html, and only there',
      function () {
        var listed = quotedList(readText('tests.html'), 'var MANUAL_SUITE_FILES');
        var quick = quotedList(readText('tests.html'), 'var SUITE_FILES');
        expect(listed).not.toBeNull();
        var suites = listDir('tests/manual', '.test.js').map(function (name) {
          return name.slice(0, -'.test.js'.length);
        });
        expect(suites.length).toBeGreaterThan(0);
        expect(suites.filter(function (name) { return listed.indexOf(name) === -1; })).toEqual([]);
        expect(listed.filter(function (name) { return quick.indexOf(name) !== -1; })).toEqual([]);
      });

    it('the Pages workflow of the repository publishes this app and the code it shares', function () {
      var workflow = readText('../.github/workflows/pages.yml');
      expect(workflow).toContain('generator/index.html');
      expect(workflow).toContain('core/js');
      expect(workflow).toContain('core/css');
      expect(workflow).toContain('core/assets');
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

  describe('app: main-thread generation client', function () {
    var CONFIG = { variantId: 'classic4', difficulty: 'veryEasy', seed: 7, trace: 'summary' };

    it('runs the pipeline and returns the same puzzle as a direct call, events in order', function () {
      var events = [];
      var running = SG.app.directClient.generate(CONFIG, function (event) { events.push(event); });
      return running.then(function (result) {
        var direct = SG.pipeline.run(CONFIG, null);
        expect(Array.from(result.givens)).toEqual(Array.from(direct.givens));
        expect(result.seed).toBe(7);
        expect(events.length).toBeGreaterThan(5);
        expect(events[events.length - 1].type).toBe('done');
        events.forEach(function (event, i) { expect(event.seq).toBe(i); });
      });
    });

    it('cancel() before the run starts rejects with budget.cancelled and delivers nothing', function () {
      var events = [];
      var pending = SG.app.directClient.generate(CONFIG, function (event) { events.push(event); });
      SG.app.directClient.cancel();
      return pending.then(function () {
        throw new Error('the cancelled run must not resolve');
      }, function (err) {
        expect(err instanceof SG.errors.GenerationError).toBe(true);
        expect(err.code).toBe('budget.cancelled');
        expect(events.length).toBe(0);
      });
    });

    it('a newer generate() replaces the one that is still waiting', function () {
      var first = SG.app.directClient.generate(CONFIG, null);
      var second = SG.app.directClient.generate(Object.assign({}, CONFIG, { seed: 8 }), null);
      return Promise.all([
        first.then(function () { return 'resolved'; }, function (err) { return err.code; }),
        second.then(function (result) { return result.seed; })
      ]).then(function (out) {
        expect(out).toEqual(['budget.cancelled', 8]);
      });
    });

    it('a failing run delivers its error event and rejects with the GenerationError', function () {
      var events = [];
      var collect = function (event) { events.push(event); };
      return SG.app.directClient.generate({ variantId: 'no-such-variant' }, collect)
        .then(function () {
          throw new Error('an unknown variant must not resolve');
        }, function (err) {
          expect(err instanceof SG.errors.GenerationError).toBe(true);
          expect(events.some(function (event) { return event.type === 'error'; })).toBe(true);
          expect(SG.i18n.tError(err)).not.toBe('');
        });
    });

    it('settings helpers: font sizes and the data-theme attribute', function () {
      expect(SG.app.fontSizeValue('small')).toBe('87.5%');
      expect(SG.app.fontSizeValue('normal')).toBe('100%');
      expect(SG.app.fontSizeValue('large')).toBe('125%');
      expect(SG.app.fontSizeValue('huge')).toBe('100%');
      expect(SG.app.themeAttribute('auto')).toBeNull();
      expect(SG.app.themeAttribute('dark')).toBe('dark');
      expect(SG.app.themeAttribute('high-contrast')).toBe('high-contrast');
    });

    it('events: on() returns an unsubscribe function and a throwing listener is isolated', function () {
      var seen = [];
      var savedError = console.error;
      console.error = function () {};
      try {
        var off = SG.app.on('contract:test', function (payload, name) { seen.push(name + ':' + payload); });
        SG.app.on('contract:test', function () { throw new Error('listener failure'); });
        SG.app.emit('contract:test', 1);
        off();
        SG.app.emit('contract:test', 2);
      } finally {
        console.error = savedError;
      }
      expect(seen).toEqual(['contract:test:1']);
      expect(function () { SG.app.on('x', 'not a function'); }).toThrow(TypeError);
    });
  });
})();
