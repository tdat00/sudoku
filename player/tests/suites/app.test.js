// The app (js/ui/app.js): what can be checked without a page. The flows themselves (fragment, paste, file,
// drop, continue, recent list, storage failures) are checked by the browser scripts of tests/browser; here
// the contract of the module is pinned: its surface, its events, the elements it needs from index.html, the
// way it treats text and storage.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var A = SG.app;
  var NODE = SG.test.node;

  function ready() {
    if (!A || !SG.i18n) SG.test.skip('SG.app is not loaded here');
  }

  function needNode() {
    if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return NODE;
  }

  function read(rel) {
    var env = needNode();
    return env.fs.readFileSync(env.path.join(env.root, rel), 'utf8').replace(/^\uFEFF/, '');
  }

  function stripComments(code) {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  }

  describe('app: without a page', function () {
    it('does not start without a board, and has no puzzle, board or result', function () {
      ready();
      if (typeof document !== 'undefined' && document.getElementById('board-svg')) {
        SG.test.skip('this check needs an environment without the player page');
      }
      expect(A.start()).toBe(false);
      expect(A.getPuzzle()).toBeNull();
      expect(A.getResult()).toBeNull();
      expect(A.getBoard()).toBeNull();
    });

    it('toast and openModal do nothing without a page instead of throwing', function () {
      ready();
      if (typeof document !== 'undefined') SG.test.skip('this check needs an environment without a DOM');
      var t = A.toast('success', 'common.ok');
      expect(typeof t.close).toBe('function');
      t.close();
      expect(A.openModal({ titleKey: 'common.ok' })).toBeNull();
      expect(function () { A.announce('hello'); }).not.toThrow();
    });

    it('opens nothing from an object that is not a puzzle', function () {
      ready();
      return A.openPuzzle({}).then(function (shown) {
        expect(shown).toBe(false);
        return A.showResult(null);
      }).then(function (shown) {
        expect(shown).toBe(false);
      });
    });
  });

  describe('app: events', function () {
    it('delivers a payload and the name, and the returned function unsubscribes', function () {
      ready();
      var seen = [];
      var off = A.on('test:event', function (payload, name) { seen.push([payload, name]); });
      A.emit('test:event', { n: 1 });
      off();
      A.emit('test:event', { n: 2 });
      expect(seen).toEqual([[{ n: 1 }, 'test:event']]);
    });

    it('a throwing listener is logged and does not stop the others', function () {
      ready();
      var calls = [];
      var errors = [];
      var original = console.error;
      console.error = function (err) { errors.push(err); };
      var offs = [];
      try {
        offs.push(A.on('test:throw', function () { throw new Error('boom'); }));
        offs.push(A.on('test:throw', function () { calls.push('second'); }));
        A.emit('test:throw');
      } finally {
        console.error = original;
        offs.forEach(function (off) { off(); });
      }
      expect(calls).toEqual(['second']);
      expect(errors.length).toBe(1);
    });

    it('refuses a listener that is not a function', function () {
      ready();
      expect(function () { A.on('x', null); }).toThrow();
      expect(function () { A.on(5, function () {}); }).toThrow();
    });
  });

  describe('app: the page it needs', function () {
    it('every element the app looks up by id is in index.html (or made by the app itself)', function () {
      ready();
      var code = stripComments(read('js/ui/app.js'));
      var html = read('index.html');
      var ids = {};
      (code.match(/byId\('([\w-]+)'\)/g) || []).forEach(function (m) { ids[m.slice(6, -2)] = true; });
      var fields = /(?:welcome|welcomeRecent|layout|heading|svg|recent|status|drop|generatorLink)/;
      (code.match(new RegExp(fields.source + ": byId\\('([\\w-]+)'\\)", 'g')) || [])
        .forEach(function (m) { ids[/'([\w-]+)'/.exec(m)[1]] = true; });
      (code.match(/\['(btn-[\w-]+)', '\w+'\]/g) || [])
        .forEach(function (m) { ids[/'(btn-[\w-]+)'/.exec(m)[1]] = true; });
      var names = Object.keys(ids);
      expect(names.length).toBeGreaterThan(14);
      names.forEach(function (id) {
        expect(html.indexOf('id="' + id + '"')).not.toBe(-1);
      });
      // play.js mounts into these:
      ['play-status', 'play-root', 'options-root', 'board-legend'].forEach(function (id) {
        expect(html.indexOf('id="' + id + '"')).not.toBe(-1);
      });
    });

    it('describes every event it emits in its header, and every function of its API', function () {
      ready();
      var text = read('js/ui/app.js');
      var header = text.slice(0, text.indexOf('(function (root)'));
      var code = stripComments(text);
      var emitted = {};
      (code.match(/emit\('([\w:]+)'/g) || [])
        .forEach(function (m) { emitted[/'([\w:]+)'/.exec(m)[1]] = true; });
      expect(Object.keys(emitted).length).toBeGreaterThan(3);
      Object.keys(emitted).forEach(function (name) { expect(header).toContain("'" + name + "'"); });
      var api = /const api = \{([\s\S]*?)\n  \};/.exec(code)[1];
      var members = (api.match(/^\s{4}(\w+):/gm) || []).map(function (m) { return m.trim().slice(0, -1); });
      expect(members.length).toBeGreaterThan(14);
      members.forEach(function (member) { expect(header).toContain(member); });
    });

    it('the generator link comes from the meta tag, and index.html carries it', function () {
      ready();
      var html = read('index.html');
      var meta = '<meta name="sg-generator-url" content="../generator/index.html">';
      expect(html).toContain(meta);
    });
  });

  describe('app: text and storage', function () {
    ['js/ui/app.js', 'js/ui/help.js', 'js/ui/progress.js'].forEach(function (rel) {
      it(rel + ' never builds HTML from data or runs strings as code', function () {
        ready();
        var code = stripComments(read(rel));
        var unsafe = /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/;
        expect(unsafe.test(code)).toBe(false);
      });
    });

    it('only store.js and progress.js write to the browser storage, and only under sg.player.', function () {
      ready();
      var env = needNode();
      var storage = /localStorage|sessionStorage|document\.cookie|indexedDB/;
      ['js/ui/app.js', 'js/ui/help.js', 'js/ui/play.js', 'js/ui/a11y.js', 'js/ui/theme.js', 'js/ui/importer.js']
        .forEach(function (rel) {
          expect(storage.test(stripComments(read(rel)))).toBe(false);
        });
      var keys = {};
      ['js/ui/store.js', 'js/ui/progress.js'].forEach(function (rel) {
        (read(rel).match(/'(sg\.[\w.]+)'/g) || []).forEach(function (m) { keys[m.slice(1, -1)] = true; });
      });
      Object.keys(keys).forEach(function (key) { expect(key.indexOf('sg.player.')).toBe(0); });
      expect(Object.keys(keys).length).toBe(4);
      expect(env.fs.existsSync(env.path.join(env.root, 'index.html'))).toBe(true);
    });

    it('reads the hash of a "Play online" link with the exchange module and removes it', function () {
      ready();
      var code = stripComments(read('js/ui/app.js'));
      expect(code).toContain('SG.exchange.tokenFromHash');
      expect(code).toContain('history.replaceState');
      expect(code).toContain("'hashchange'");
    });

    it('a file is read as text, up to 8 MB, never evaluated', function () {
      ready();
      var code = stripComments(read('js/ui/app.js'));
      expect(/MAX_FILE_BYTES = 8 \* 1024 \* 1024/.test(code)).toBe(true);
      expect(/file\.text\(\)|readAsText/.test(code)).toBe(true);
    });
  });
})();
