// Static checks: the core and variant layers must stay free of DOM access and of module syntax.
(function () {
  'use strict';

  var SG = (typeof self !== 'undefined' ? self : globalThis).SG;

  var FORBIDDEN = ['document.', 'window.', 'localStorage', 'alert(', 'import ', 'export ', 'require('];
  var SCANNED_DIRS = ['../core/js/engine', 'js/engine', 'js/variants'];

  /** @returns {Array<{line:number, token:string}>} every forbidden token found, with its line number. */
  function findViolations(text) {
    var found = [];
    text.split(/\r?\n/).forEach(function (line, index) {
      FORBIDDEN.forEach(function (token) {
        if (line.indexOf(token) !== -1) found.push({ line: index + 1, token: token });
      });
    });
    return found;
  }

  /** Returns the Node helpers, or ends the running test as skipped when they are missing (browser). */
  function requireNode() {
    var env = SG.test.node;
    if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return env;
  }

  /** Recursively lists *.js files below a directory, relative to the project root, sorted. */
  function listScripts(env, relDir) {
    var abs = env.path.join(env.root, relDir);
    if (!env.fs.existsSync(abs)) return [];
    var out = [];
    env.fs.readdirSync(abs, { withFileTypes: true }).forEach(function (entry) {
      var rel = relDir + '/' + entry.name;
      if (entry.isDirectory()) out = out.concat(listScripts(env, rel));
      else if (entry.name.endsWith('.js')) out.push(rel);
    });
    return out.sort();
  }

  function scanFile(env, rel) {
    var text = env.fs.readFileSync(env.path.join(env.root, rel), 'utf8');
    return findViolations(text).map(function (v) {
      return rel + ':' + v.line + ' contains "' + v.token + '"';
    });
  }

  describe('purity scanner', function () {
    it('flags every forbidden token with its line number', function () {
      FORBIDDEN.forEach(function (token) {
        var found = findViolations('var ok = 1;\nfoo ' + token + ' bar\n');
        expect(found).toEqual([{ line: 2, token: token }]);
      });
    });

    it('accepts ordinary code', function () {
      var clean = "(function (root) {\n  'use strict';\n  var SG = root.SG = root.SG || {};\n" +
        "  var self = typeof self !== 'undefined' ? self : globalThis;\n})(globalThis);\n";
      expect(findViolations(clean)).toEqual([]);
    });

    it('skips instead of failing when no Node file system is available (browser)', function () {
      var saved = SG.test.node;
      SG.test.node = undefined;
      try {
        expect(function () { requireNode(); }).toThrow({ name: 'SkipSignal' });
      } finally {
        SG.test.node = saved;
      }
    });
  });

  describe('source purity (core/js/engine, js/engine, js/variants)', function () {
    var env = SG.test.node;

    if (!env || !env.fs) {
      it('contains no DOM access or module syntax', function () {
        requireNode();
      });
      return;
    }

    var files = [];
    SCANNED_DIRS.forEach(function (dir) { files = files.concat(listScripts(env, dir)); });

    it('finds the core files to scan', function () {
      requireNode();
      ['../core/js/engine/ns.js', '../core/js/engine/errors.js', '../core/js/engine/bits.js',
        '../core/js/engine/budget.js', 'js/engine/rng.js']
        .forEach(function (rel) { expect(files).toContain(rel); });
    });

    files.forEach(function (rel) {
      it(rel + ' has none of: ' + FORBIDDEN.join(' '), function () {
        expect(scanFile(requireNode(), rel)).toEqual([]);
      });
    });
  });
})();
