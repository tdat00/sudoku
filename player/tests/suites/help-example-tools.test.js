// The help-example tool (difficulty v3, MS03b): the pure helper of tests/fixtures/help-example-tools.js (options,
// source files, the cap, the replay of a source with the Player's own hints, selection, the catalogue, the
// bounded discovery with fake generators, clocks and child processes) runs in both runners; the tool itself
// (tests/tools/make-technique-examples.js) runs in Node only, in real processes on the saved sources and sandbox
// catalogues, and never generates a puzzle: nothing here touches js/ui/help-examples.js.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var T = SG.fixtures.helpExampleTools;
  var EXAMPLES = SG.helpExamples;
  var TOOL = 'tests/tools/make-technique-examples.js';
  var SANDBOX = 'tests/artifacts/difficulty-v3/MS03b/sandbox-tool';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function registry() {
    return SG.techniques.list().map(function (tech) { return tech.id; });
  }

  function thrown(fn) {
    try {
      fn();
    } catch (err) {
      return err;
    }
    return null;
  }

  function sourceOf(id) {
    return { variantId: EXAMPLES[id].variant, level: null, seed: null, text: EXAMPLES[id].source.puzzle };
  }

  function fileOf(sources) {
    return { schema: 1, sources: sources };
  }

  // ---------------------------------------------------------------------------------------------
  // The command line
  // ---------------------------------------------------------------------------------------------

  describe('help example tools: the options', function () {
    it('reads no option as a read-only check of every ID from the saved sources, within the old bounds', function () {
      expect(T.parseOptions([])).toEqual({ help: false, generator: null, ids: null, sources: null, maxPuzzles: 64,
        maxHints: 400, mode: 'check', discover: false, variants: null, levels: null, out: null,
        recordSources: null, workDir: null });
      expect([T.DEFAULT_MAX_PUZZLES, T.DEFAULT_MAX_HINTS, T.DEADLINE_MS]).toEqual([64, 400, 480000]);
      expect(T.DEFAULT_WORK_DIR).toBe('tests/artifacts/difficulty-v3/help');
      expect(T.parseOptions(['--help'])).toEqual({ help: true });
      expect(T.parseOptions(['-h'])).toEqual({ help: true });
    });

    it('reads every option, keeps the optional generator folder, and takes --puzzles as the same cap', function () {
      var opts = T.parseOptions(['..\\generator', '--ids=nakedSingle,cageCombo', '--sources=a\\s.json',
        '--max-puzzles=5', '--max-hints=7', '--write', '--out=x\\help-examples.js', '--work-dir=w']);
      expect(opts).toEqual({ help: false, generator: '..\\generator', ids: ['nakedSingle', 'cageCombo'],
        sources: 'a\\s.json', maxPuzzles: 5, maxHints: 7, mode: 'write', discover: false, variants: null,
        levels: null, out: 'x\\help-examples.js', recordSources: null, workDir: 'w' });
      var found = T.parseOptions(['--discover', '--record-sources=r.json', '--variants=classic9,killer',
        '--levels=hard']);
      expect([found.mode, found.discover, found.recordSources, found.variants, found.levels])
        .toEqual(['record', true, 'r.json', ['classic9', 'killer'], ['hard']]);
      expect(T.parseOptions(['--check']).mode).toBe('check');
      expect(T.parseOptions(['--discover', '--write']).mode).toBe('write');
      expect(T.parseOptions(['--puzzles=3']).maxPuzzles).toBe(3);
      expect(T.parseOptions(['--puzzles=3', '--max-puzzles=3']).maxPuzzles).toBe(3);
    });

    it('refuses a conflicting, malformed or unsafe command line before any work, as a usage error', function () {
      [[['--check', '--write'], /exclude each other/],
        [['--record-sources=a.json', '--check'], /excludes --check and --write/],
        [['--record-sources=a.json', '--write'], /excludes --check and --write/],
        [['--record-sources=a.json', '--out=b.js'], /excludes --record-sources/],
        [['--discover'], /needs --write or --record-sources/],
        [['--discover', '--check'], /a check never generates/],
        [['--discover', '--write', '--sources=a.json'], /--sources and --discover exclude each other/],
        [['--variants=classic9'], /only filter a --discover run/],
        [['--levels=hard', '--write'], /only filter a --discover run/],
        [['--discover', '--write', '--variants=nosuch'], /"nosuch" is not in the plan/],
        [['--discover', '--write', '--levels=veryEasy'], /"veryEasy" is not in the plan/],
        [['--puzzles=3', '--max-puzzles=4'], /disagree/],
        [['--max-puzzles=0'], /positive whole number/], [['--max-puzzles=-1'], /positive whole number/],
        [['--max-puzzles=1.5'], /positive whole number/], [['--max-puzzles=abc'], /positive whole number/],
        [['--max-puzzles='], /needs a value/], [['--max-hints=0'], /positive whole number/],
        [['--puzzles=0'], /positive whole number/],
        [['--ids='], /needs a value/], [['--ids=a,,b'], /not a valid name/], [['--ids=1a'], /not a valid name/],
        [['--ids=nakedSingle,nakedSingle'], /given twice/], [['--ids=a', '--ids=b'], /--ids is given twice/],
        [['--bogus'], /Unknown argument: --bogus/], [['--check=1'], /takes no value/],
        [['a', 'b'], /Unknown argument: b/], [['--Check'], /Unknown argument/],
        [['--stage1=x'], /Unknown argument/], [['--help', '--check'], /--help takes no other argument/],
        [['--out=C:\\x.js'], /not an absolute one/], [['--out=/x.js'], /not an absolute one/],
        [['--out=\\\\host\\x.js'], /not an absolute one/], [['--out=x.json'], /needs the extension \.js/],
        [['--record-sources=a.js'], /needs the extension \.json/], [['--sources=a.txt'], /extension \.json/],
        [['--work-dir=D:\\w'], /not an absolute one/]
      ].forEach(function (c) {
        var err = thrown(function () { T.parseOptions(c[0]); });
        expect(err === null ? 'no error for ' + c[0].join(' ') : '').toBe('');
        expect(err.name).toBe('UsageError');
        expect(err.usage).toBe(true);
        expect(err.message).toMatch(c[1]);
      });
    });

    it('reads the command line of the generator child, which needs its folder, file, cap and deadline', function () {
      var args = T.childArguments({ maxPuzzles: 12, variants: ['classic9'], levels: ['hard', 'expert'] },
        'w/stage1-1.json', 1795000000000);
      expect(args).toEqual(['--stage1=w/stage1-1.json', '--max-puzzles=12', '--deadline-at=1795000000000',
        '--variants=classic9', '--levels=hard,expert']);
      expect(T.parseChildOptions(['gen'].concat(args))).toEqual({ generator: 'gen', stage1: 'w/stage1-1.json',
        maxPuzzles: 12, deadlineAt: 1795000000000, variants: ['classic9'], levels: ['hard', 'expert'] });
      expect(T.parseChildOptions(['gen', '--stage1=f', '--max-puzzles=1', '--deadline-at=5']).variants).toBeNull();
      [['--stage1=f', '--max-puzzles=1', '--deadline-at=5'], ['gen', '--max-puzzles=1', '--deadline-at=5'],
        ['gen', '--stage1=f', '--deadline-at=5'], ['gen', '--stage1=f', '--max-puzzles=1'],
        ['gen', '--stage1=f', '--max-puzzles=0', '--deadline-at=5'], ['gen', '--stage1=f', '--write']
      ].forEach(function (c) {
        expect(thrown(function () { T.parseChildOptions(c); }).name).toBe('UsageError');
      });
    });

    it('selects exact registered IDs in registry order and names an unknown one', function () {
      var ids = registry();
      expect(T.selectIds(ids, null)).toEqual(ids);
      expect(T.selectIds(ids, ['cageCombo', 'nakedSingle'])).toEqual(
        ids.filter(function (id) { return id === 'cageCombo' || id === 'nakedSingle'; }));
      var err = thrown(function () { T.selectIds(ids, ['nakedSingle', 'brandNew']); });
      expect(err.name).toBe('UsageError');
      expect(err.message).toContain('brandNew');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Sources: the file, the defaults, the cap
  // ---------------------------------------------------------------------------------------------

  describe('help example tools: the sources', function () {
    var IDS = ['nakedSingle', 'cageCombo'];

    function valid() {
      return fileOf({ nakedSingle: [{ variantId: 'classic9', level: 'easy', seed: '1',
        text: '  ' + EXAMPLES.nakedSingle.source.puzzle + '\r\n' }],
      cageCombo: [sourceOf('cageCombo')] });
    }

    it('accepts the source schema, trims the text, and leaves the listed order of the sources', function () {
      var data = valid();
      data.sources.nakedSingle.push({ variantId: 'classic9', level: null, seed: null,
        text: EXAMPLES.hiddenSingleBox.source.puzzle });
      var checked = T.validateSources(data, registry());
      expect(checked.problems).toEqual([]);
      expect(checked.sources.nakedSingle).toHaveLength(2);
      expect(checked.sources.nakedSingle[0]).toEqual({ variantId: 'classic9', level: 'easy', seed: '1',
        text: EXAMPLES.nakedSingle.source.puzzle });
      expect(checked.sources.nakedSingle[1].text).toBe(EXAMPLES.hiddenSingleBox.source.puzzle);
      expect(Object.keys(checked.sources)).toEqual(IDS);
    });

    it('names the ID and the entry of every malformed source, and accepts nothing of a damaged file', function () {
      function broken(change) {
        var data = valid();
        change(data);
        return T.validateSources(data, registry());
      }
      [[function (d) { d.schema = 2; }, 'schema 2 is not 1'],
        [function (d) { d.extra = 1; }, 'expected {"schema":1,"sources":{...}} and nothing else'],
        [function (d) { delete d.schema; }, 'and nothing else'],
        [function (d) { d.sources = []; }, 'sources is not an object'],
        [function (d) { d.sources.brandNew = [sourceOf('nakedSingle')]; }, 'sources.brandNew: not a registered'],
        [function (d) { d.sources.cageCombo = []; }, 'sources.cageCombo: needs a non-empty list'],
        [function (d) { d.sources.cageCombo = 'x'; }, 'sources.cageCombo: needs a non-empty list'],
        [function (d) { d.sources.cageCombo[0] = 7; }, 'sources.cageCombo[0]: expected exactly'],
        [function (d) { delete d.sources.cageCombo[0].seed; }, 'sources.cageCombo[0]: expected exactly'],
        [function (d) { d.sources.cageCombo[0].extra = 1; }, 'sources.cageCombo[0]: expected exactly'],
        [function (d) { d.sources.cageCombo[0].variantId = ''; }, 'sources.cageCombo[0].variantId'],
        [function (d) { d.sources.cageCombo[0].level = 3; }, 'sources.cageCombo[0].level'],
        [function (d) { d.sources.cageCombo[0].seed = 11; }, 'sources.cageCombo[0].seed'],
        [function (d) { d.sources.cageCombo[0].text = '  '; }, 'sources.cageCombo[0].text'],
        [function (d) { d.sources.cageCombo[0].text = 5; }, 'sources.cageCombo[0].text']
      ].forEach(function (c) {
        var checked = broken(c[0]);
        expect(checked.sources).toBeNull();
        expect(checked.problems.join('\n')).toContain(c[1]);
      });
      expect(T.validateSources(null, registry()).sources).toBeNull();
      expect(thrown(function () { T.parseSources('{"schema":'); }).message).toMatch(/^not valid JSON/);
      expect(T.parseSources('\uFEFF{"schema":1,"sources":{}}')).toEqual({ schema: 1, sources: {} });
    });

    it('takes a default source from the saved example of the ID, and names an ID that has none', function () {
      var found = T.defaultSources(EXAMPLES, IDS);
      expect(found.nakedSingle).toEqual([sourceOf('nakedSingle')]);
      expect(found.cageCombo[0].variantId).toBe('killer');
      var without = Object.assign({}, EXAMPLES);
      delete without.pointing;
      var err = thrown(function () { T.defaultSources(without, ['nakedSingle', 'pointing', 'brandNew']); });
      expect(err.message).toContain('no source for pointing, brandNew');
      expect(err.message).toContain('--sources');
    });

    it('assigns a sources file only to the requested IDs and names a requested ID it does not list', function () {
      var checked = T.validateSources(valid(), registry());
      expect(Object.keys(T.assignSources(['cageCombo'], checked.sources))).toEqual(['cageCombo']);
      expect(thrown(function () { T.assignSources(['cageCombo', 'pointing'], checked.sources); }).message)
        .toBe('no source for pointing in the sources file');
    });

    it('admits the sources in registry and listed order up to the cap of distinct puzzles', function () {
      var a = sourceOf('nakedSingle');
      var b = sourceOf('hiddenSingleBox');
      var c = sourceOf('pointing');
      var assigned = { nakedSingle: [a, b], hiddenSingleBox: [b], pointing: [c] };
      var ids = ['nakedSingle', 'hiddenSingleBox', 'pointing'];
      var all = T.admit(ids, assigned, 64);
      expect(all.puzzles.map(function (p) { return p.item.text; })).toEqual([a.text, b.text, c.text]);
      expect(all.byId).toEqual({ nakedSingle: [0, 1], hiddenSingleBox: [1], pointing: [2] });
      expect(all.puzzles[1].ids).toEqual(['nakedSingle', 'hiddenSingleBox']);
      expect([all.skipped, all.missing]).toEqual([0, []]);
      var two = T.admit(ids, assigned, 2);
      expect(two.puzzles).toHaveLength(2);
      expect(two.byId.pointing).toEqual([]);
      expect([two.skipped, two.missing]).toEqual([1, ['pointing']]);
      var one = T.admit(ids, assigned, 1);
      expect(one.byId).toEqual({ nakedSingle: [0], hiddenSingleBox: [], pointing: [] });
      expect([one.skipped, one.missing]).toEqual([3, ['hiddenSingleBox', 'pointing']]);
      var shared = T.admit(['nakedSingle', 'hiddenSingleBox'], { nakedSingle: [b], hiddenSingleBox: [b, b] }, 1);
      expect(shared.puzzles).toHaveLength(1);
      expect(shared.byId).toEqual({ nakedSingle: [0], hiddenSingleBox: [0] });
      expect(shared.missing).toEqual([]);
    });

    it('prints the recorded sources as CRLF text without a BOM that reads back to the same sources', function () {
      var found = { cageCombo: { item: sourceOf('cageCombo') },
        nakedSingle: { item: { variantId: 'classic9', level: 'easy', seed: '1',
          text: EXAMPLES.nakedSingle.source.puzzle } } };
      var data = T.recordedSources(['nakedSingle', 'cageCombo'], found);
      expect(Object.keys(data.sources)).toEqual(['nakedSingle', 'cageCombo']);
      expect(data.sources.nakedSingle).toHaveLength(1);
      var text = T.sourcesText(data);
      expect(text.charCodeAt(0)).not.toBe(0xfeff);
      expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(text)).toBe(false);
      expect(text.slice(-2)).toBe('\r\n');
      expect(text.split('\r\n')).toHaveLength(1 + 2 + 2 * 3 + 2 + 1);
      expect(JSON.parse(text)).toEqual(data);
      expect(T.validateSources(JSON.parse(text), registry()).problems).toEqual([]);
      expect(T.sourcesText(JSON.parse(text))).toBe(text);
    });

    it('combines per-ID source files without touching a puzzle text, and refuses an ID in two files', function () {
      var one = fileOf({ nakedSingle: [sourceOf('nakedSingle')] });
      var two = fileOf({ cageCombo: [sourceOf('cageCombo')] });
      var both = T.combineSources([{ name: 'one.json', data: one }, { name: 'two.json', data: two }]);
      expect(both.ok).toBe(true);
      expect(Object.keys(both.data.sources)).toEqual(['nakedSingle', 'cageCombo']);
      expect(both.data.sources.cageCombo[0].text).toBe(EXAMPLES.cageCombo.source.puzzle);
      var twice = T.combineSources([{ name: 'one.json', data: one }, { name: 'again.json', data: one }]);
      expect(twice.ok).toBe(false);
      expect(twice.data).toBeNull();
      expect(twice.problems).toEqual(['nakedSingle: in both one.json and again.json']);
      var damaged = T.combineSources([{ name: 'bad.json', data: { schema: 1, sources: { nakedSingle: [] } } }]);
      expect(damaged.ok).toBe(false);
      expect(damaged.problems[0]).toMatch(/^bad\.json: sources\.nakedSingle: needs a non-empty list/);
      expect(T.combineSources([]).problems).toEqual(['no source file to combine']);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The replay with the Player's own hints, and the choice of the example
  // ---------------------------------------------------------------------------------------------

  describe('help example tools: replaying a source', function () {
    function ready() {
      if (!SG.importer || !SG.play || !EXAMPLES) SG.test.skip('the Player is not loaded here');
    }

    function replay(id, hints) {
      return T.replayPuzzle(SG, sourceOf(id), [id], { maxHints: hints });
    }

    it('rebuilds the saved snapshot of an example from its own source, field for field', function () {
      ready();
      var run = replay('nakedSingle', 1);
      expect(run.ok).toBe(true);
      expect([run.hints, run.stop]).toEqual([1, 'limit']);
      expect(JSON.stringify(run.best.nakedSingle.data)).toBe(JSON.stringify(EXAMPLES.nakedSingle));
      expect(run.best.nakedSingle.data.source.step).toBe(0);
    });

    it('finds the saved example further into the puzzle and gives the same data again', function () {
      ready();
      var first = replay('hiddenSingleBox', 60);
      expect(JSON.stringify(first.best.hiddenSingleBox.data)).toBe(JSON.stringify(EXAMPLES.hiddenSingleBox));
      expect(first.best.hiddenSingleBox.data.source.step).toBe(58);
      expect(JSON.stringify(replay('hiddenSingleBox', 60))).toBe(JSON.stringify(first));
    });

    it('stops at the hint limit of the puzzle, and a later hint is not an example', function () {
      ready();
      var run = T.replayPuzzle(SG, sourceOf('hiddenSingleBox'), ['hiddenSingleBox', 'nakedSingle'],
        { maxHints: 5 });
      expect([run.hints, run.stop]).toEqual([5, 'limit']);
      Object.keys(run.best).forEach(function (id) {
        expect(run.best[id].data.source.step).toBeLessThan(5);
      });
      expect(run.best.hiddenSingleBox.data.source.step).toBe(1);
      expect(JSON.stringify(run.best.hiddenSingleBox.data)).not.toBe(JSON.stringify(EXAMPLES.hiddenSingleBox));
      var checks = 0;
      T.replayPuzzle(SG, sourceOf('nakedSingle'), ['nakedSingle'],
        { maxHints: 3, check: function () { checks++; } });
      expect(checks).toBe(3);
      var cut = thrown(function () {
        T.replayPuzzle(SG, sourceOf('nakedSingle'), ['nakedSingle'],
          { maxHints: 3, check: function () { throw T.incompleteError('incomplete: the deadline'); } });
      });
      expect(cut.incomplete).toBe(true);
    });

    it('waits for a cage of at least two cells for cageCombo, and has no other special rule', function () {
      ready();
      var sizes = function (size) { return T.eligible({ technique: 'cageCombo', stepArgs: { size: size } }); };
      expect([sizes(1), sizes(2), sizes(3)]).toEqual([false, true, true]);
      expect(T.eligible({ technique: 'cageCombo' })).toBe(true);
      expect(T.eligible({ technique: 'nakedSingle', stepArgs: { size: 1 } })).toBe(true);
      var run = replay('cageCombo', 12);
      expect(run.best.cageCombo.data.hint.stepArgs.size).toBeGreaterThan(1);
      expect(JSON.stringify(run.best.cageCombo.data)).toBe(JSON.stringify(EXAMPLES.cageCombo));
    });

    it('reports a text that is not one puzzle of the generator, or not the variant it declares, by name', function () {
      ready();
      var bad = function (item) { return T.replayPuzzle(SG, item, ['nakedSingle'], { maxHints: 1 }); };
      var text = EXAMPLES.nakedSingle.source.puzzle;
      var none = bad({ variantId: 'classic9', text: 'not a puzzle' });
      expect([none.ok, none.hints, none.stop]).toEqual([false, 0, 'unreadable']);
      expect(none.error).toContain('not exactly one puzzle block');
      expect(bad({ variantId: 'classic9', text: text + '\n\n' + text.replace('#1,', '#2,') }).error)
        .toContain('2 found');
      expect(bad({ variantId: 'killer', text: text }).error).toBe(
        'it declares the variant killer but the puzzle is classic9');
      expect(bad({ variantId: 'classic9', text: '#1,Classic Sudoku 9x9,Easy,1\n123\n456' }).ok).toBe(false);
    });

    it('chooses the clearest example, the earliest on a tie, from the assigned sources only', function () {
      var plan = { puzzles: [{ item: { text: 'a' } }, { item: { text: 'b' } }, { item: { text: 'c' } }],
        byId: { x: [0, 1, 2], y: [1], z: [] } };
      var candidate = function (score) {
        return { ok: true, best: { x: { score: score, data: { s: score } }, y: { score: score, data: { s: score } } } };
      };
      var out = T.winners(['x', 'y', 'z'], plan, [candidate(4), candidate(4), candidate(3)]);
      expect(out.found.x.score).toBe(3);
      expect(out.found.x.item.text).toBe('c');
      expect(out.found.y.at).toBe(1);
      expect(out.missing).toEqual(['z']);
      var tie = T.winners(['x'], plan, [candidate(4), candidate(4), candidate(4)]);
      expect([tie.found.x.at, tie.found.x.item.text]).toEqual([0, 'a']);
      var unreadable = T.winners(['x'], plan, [{ ok: false, error: 'bad' }, candidate(9), candidate(9)]);
      expect(unreadable.found.x.at).toBe(1);
      expect(T.winners(['x'], { puzzles: [], byId: { x: [] } }, []).missing).toEqual(['x']);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The catalogue: text, merge, comparison
  // ---------------------------------------------------------------------------------------------

  describe('help example tools: the catalogue', function () {
    it('renders the saved catalogue as CRLF without a BOM, in registry order, and reads it back', function () {
      var ids = registry();
      var text = T.render(ids, EXAMPLES);
      expect(text.charCodeAt(0)).not.toBe(0xfeff);
      expect(text.slice(-2)).toBe('\r\n');
      expect(/(?<!\r)\n|\r(?!\n)/.test(text)).toBe(false);
      expect(text).toContain('GENERATED by tests/tools/make-technique-examples.js: do not edit by hand.');
      expect(Object.keys(T.catalogueOf(text))).toEqual(ids);
      expect(clone(T.catalogueOf(text))).toEqual(clone(EXAMPLES));
      expect(T.render(ids, T.catalogueOf(text))).toBe(text);
      var swapped = T.render(['pointing', 'nakedSingle'], EXAMPLES);
      expect(swapped.indexOf('    pointing:')).toBeLessThan(swapped.indexOf('    nakedSingle:'));
    });

    it('is exactly the saved js/ui/help-examples.js, so a rewrite of unchanged data changes nothing', function () {
      if (!SG.test.node || !SG.test.node.fs) SG.test.skip('needs the Node file system');
      var host = SG.test.node;
      var saved = host.fs.readFileSync(host.path.join(host.root, 'js', 'ui', 'help-examples.js'), 'utf8');
      // The saved file has the line ends of the checkout (LF on Linux); the tool always writes CRLF.
      expect(T.render(registry(), EXAMPLES).replace(/\r\n/g, '\n')).toBe(saved.replace(/\r\n/g, '\n'));
    });

    it('refuses a text that defines no catalogue', function () {
      expect(thrown(function () { T.catalogueOf('var x = ;'); }).message).toMatch(/^not a catalogue script/);
      expect(thrown(function () { T.catalogueOf('var y = 1;'); }).message).toContain('no SG.helpExamples');
    });

    it('merges the selected examples into the saved catalogue and keeps every other ID as it was', function () {
      var ids = registry();
      var changed = clone(EXAMPLES.pointing);
      changed.source.step += 1;
      var merged = T.mergeCatalogue(ids, EXAMPLES, ['pointing'], { pointing: changed });
      expect(merged.ok).toBe(true);
      expect(merged.problems).toEqual([]);
      expect(Object.keys(merged.catalogue)).toEqual(ids);
      expect(merged.catalogue.pointing.source.step).toBe(EXAMPLES.pointing.source.step + 1);
      ids.filter(function (id) { return id !== 'pointing'; }).forEach(function (id) {
        expect(merged.catalogue[id]).toBe(EXAMPLES[id]);
      });
    });

    it('writes nothing while an ID has no example: a selected one not found, or a new one nobody supplied', function () {
      var ids = registry();
      var saved = Object.assign({}, EXAMPLES);
      delete saved.pointing;
      delete saved.boxLine;
      var fresh = { pointing: clone(EXAMPLES.pointing) };
      var onlyOne = T.mergeCatalogue(ids, saved, ['pointing'], fresh);
      expect(onlyOne.ok).toBe(false);
      expect(onlyOne.catalogue).toBeNull();
      expect(onlyOne.problems).toEqual(['boxLine: not selected and not in the saved catalogue']);
      var notFound = T.mergeCatalogue(ids, saved, ['pointing', 'boxLine'], fresh);
      expect(notFound.ok).toBe(false);
      expect(notFound.problems).toEqual(['boxLine: no example was found']);
      fresh.boxLine = clone(EXAMPLES.boxLine);
      var both = T.mergeCatalogue(ids, saved, ['pointing', 'boxLine'], fresh);
      expect(both.ok).toBe(true);
      expect(Object.keys(both.catalogue)).toEqual(ids);
    });

    it('rejects an example that is not valid for its ID, and drops an ID the registry no longer has', function () {
      var ids = registry();
      var wrong = clone(EXAMPLES.pointing);
      wrong.hint.technique = 'boxLine';
      expect(T.mergeCatalogue(ids, EXAMPLES, ['pointing'], { pointing: wrong }).problems)
        .toEqual(['pointing: its hint is not a hint of pointing']);
      var damaged = clone(EXAMPLES.pointing);
      damaged.source.puzzle = 'x';
      damaged.values = damaged.values.slice(1);
      expect(T.validateSnapshot('pointing', damaged)).toEqual([
        'pointing: givens and values are not strings of the same length',
        'pointing: source.puzzle is not the text of a puzzle block']);
      expect(T.validateSnapshot('pointing', null)).toEqual(['pointing: no example object']);
      expect(T.validateSnapshot('pointing', EXAMPLES.pointing)).toEqual([]);
      var stale = Object.assign({}, EXAMPLES, { retired: clone(EXAMPLES.pointing) });
      var merged = T.mergeCatalogue(ids, stale, ['pointing'], { pointing: clone(EXAMPLES.pointing) });
      expect(merged.ok).toBe(true);
      expect(merged.dropped).toEqual(['retired']);
      expect(Object.keys(merged.catalogue)).toEqual(ids);
    });

    it('compares the selected examples field by field and names the ID and the field that differ', function () {
      var fresh = { nakedSingle: clone(EXAMPLES.nakedSingle), pointing: clone(EXAMPLES.pointing),
        boxLine: clone(EXAMPLES.boxLine) };
      fresh.pointing.hint.cells = [22];
      fresh.pointing.source.step = 99;
      var saved = Object.assign({}, EXAMPLES);
      delete saved.boxLine;
      var before = JSON.stringify(fresh);
      var report = T.compare(['nakedSingle', 'pointing', 'boxLine'], saved, fresh);
      expect(report.map(function (r) { return [r.id, r.status]; })).toEqual([['nakedSingle', 'match'],
        ['pointing', 'differs'], ['boxLine', 'new']]);
      expect(report[1].diffs.map(T.diffLine)).toEqual(['hint.cells.length: saved 2, fresh 1',
        'source.step: saved 27, fresh 99']);
      expect(JSON.stringify(fresh)).toBe(before);
      expect(T.compare(['nakedSingle'], EXAMPLES, { nakedSingle: clone(EXAMPLES.nakedSingle) })[0].diffs)
        .toEqual([]);
    });

    it('names the fields that differ, with their paths, and shows long values short', function () {
      var saved = { a: 1, b: [1, 2, 3], c: { d: 'x', e: null }, f: 5 };
      var fresh = { a: 1, b: [1, 9], c: { d: 'y', e: null, g: 1 } };
      expect(T.diffValues(saved, fresh).map(T.diffLine)).toEqual(['b.length: saved 3, fresh 2',
        'b[1]: saved 2, fresh 9', 'c.d: saved "x", fresh "y"', 'c.g: saved undefined, fresh 1',
        'f: saved 5, fresh undefined']);
      expect(T.diffValues(saved, clone(saved))).toEqual([]);
      expect(T.diffLine({ path: 'p', saved: 'x'.repeat(100), fresh: 1 })).toMatch(/^p: saved "x{56}\.\.\., fresh 1$/);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The bounded discovery, with fake generators, clocks and child processes
  // ---------------------------------------------------------------------------------------------

  describe('help example tools: bounded discovery', function () {
    var LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];

    function supportOf(id) {
      return id === 'classic9' ? LEVELS.slice(0, 8) : LEVELS;
    }

    function clock() {
      var state = { now: 0 };
      state.read = function () { return state.now; };
      return state;
    }

    function generator(state, options) {
      var o = options || {};
      return function (variantId, level, seed) {
        state.calls.push(variantId + '/' + level + '/' + seed);
        if (o.clock) o.clock.now += o.step || 1;
        if (o.failAt && o.failAt.indexOf(state.calls.length) !== -1) throw new Error('budget.exceeded');
        return { variantId: variantId, level: level, seed: String(seed), text: '#1,x' };
      };
    }

    function hardOnly() {
      return T.planDiscovery(supportOf, { variants: ['classic9'], levels: ['hard'] });
    }

    it('filters the plan by variant and level before it makes anything, and merges a repeated combination', function () {
      var all = T.planDiscovery(supportOf, { variants: null, levels: null });
      var keys = all.map(function (c) { return c.variantId + '/' + c.level; });
      expect(keys[0]).toBe('classic9/easy');
      expect(keys.filter(function (key, i) { return keys.indexOf(key) !== i; })).toEqual([]);
      expect(all.filter(function (c) { return c.variantId === 'classic9' && c.level === 'hell1'; }))
        .toEqual([{ variantId: 'classic9', level: 'hell1', seeds: 1500 }]);
      expect(keys).not.toContain('classic9/hell2');
      expect(hardOnly()).toEqual([{ variantId: 'classic9', level: 'hard', seeds: 120 }]);
      expect(T.planDiscovery(supportOf, { variants: ['killer'], levels: ['easy', 'hard'] }).map(function (c) {
        return c.level;
      })).toEqual(['easy', 'hard']);
      expect(T.planDiscovery(supportOf, { variants: ['classic9'], levels: ['hell2'] })).toEqual([]);
      expect(T.planDiscovery(supportOf, { variants: ['greaterThan'], levels: ['expert'] })).toEqual([]);
      expect(T.planDiscovery(supportOf, { variants: ['diagonalX'], levels: ['hell2'] }))
        .toEqual([{ variantId: 'diagonalX', level: 'hell2', seeds: 600 }]);
    });

    it('stops the plan loop before request N+1: the cap counts attempts, failures included', function () {
      var never = clock();
      var deadline = function () { return T.makeDeadline(never.read, 0, 1000); };
      var one = { calls: [] };
      var run = T.runDiscovery(hardOnly(), 1, generator(one), deadline());
      expect(one.calls).toEqual(['classic9/hard/1']);
      expect([run.complete, run.attempted, run.items.length, run.failures.length]).toEqual([true, 1, 1, 0]);
      var failing = { calls: [] };
      var log = [];
      var broken = T.runDiscovery(hardOnly(), 3, generator(failing, { failAt: [1, 2, 3] }), deadline(),
        function (line) { log.push(line); });
      expect(failing.calls).toHaveLength(3);
      expect([broken.complete, broken.attempted, broken.items.length]).toEqual([true, 3, 0]);
      expect(broken.failures).toEqual([1, 2, 3].map(function (seed) {
        return { variantId: 'classic9', level: 'hard', seed: String(seed), error: 'budget.exceeded' };
      }));
      expect(log[0]).toBe('request 1/3 classic9 hard 1: failed (budget.exceeded)');
      var some = { calls: [] };
      var mixed = T.runDiscovery(hardOnly(), 5, generator(some, { failAt: [2] }), deadline());
      expect(some.calls).toHaveLength(5);
      expect([mixed.attempted, mixed.items.length, mixed.failures.length]).toEqual([5, 4, 1]);
    });

    it('makes fewer than the cap when the plan has fewer requests, in plan order', function () {
      var tiny = [{ variantId: 'classic9', level: 'easy', seeds: 2 }, { variantId: 'killer', level: 'easy', seeds: 1 }];
      var state = { calls: [] };
      var run = T.runDiscovery(tiny, 64, generator(state), T.makeDeadline(clock().read, 0, 1000));
      expect(state.calls).toEqual(['classic9/easy/1', 'classic9/easy/2', 'killer/easy/1']);
      expect([run.complete, run.attempted]).toEqual([true, 3]);
    });

    it('ends unfinished at the deadline, before the next request, and never calls it complete', function () {
      var time = clock();
      var state = { calls: [] };
      var run = T.runDiscovery(hardOnly(), 10, generator(state, { clock: time, step: 400 }),
        T.makeDeadline(time.read, 0, 1000));
      expect(state.calls).toHaveLength(3);
      expect([run.complete, run.attempted]).toEqual([false, 3]);
    });

    var GOOD = JSON.stringify({ schema: 1, complete: true, attempted: 2, items: [
      { variantId: 'classic9', level: 'hard', seed: '1', text: '#1,a' },
      { variantId: 'classic9', level: 'hard', seed: '2', text: '#1,b' }], failures: [] });

    // A child process that is fake: it records what the tool asks of it and what it removes.
    function fakeChild(options) {
      var o = options || {};
      var state = { files: { 'work/foreign.json': 'keep' }, spawns: [], removed: [], released: [] };
      return { state: state, env: {
        file: 'work/stage1-7.json',
        args: ['--stage1=work/stage1-7.json'],
        ensureDir: function () { return 'work'; },
        release: function (token) { state.released.push(token); },
        spawn: function (args, timeout) {
          state.spawns.push(timeout);
          if (o.output !== null) state.files['work/stage1-7.json'] = o.output === undefined ? GOOD : o.output;
          return o.run || { status: 0, signal: null };
        },
        readText: function (file) { return state.files[file] === undefined ? null : state.files[file]; },
        remove: function (file) { state.removed.push(file); delete state.files[file]; }
      } };
    }

    function runChild(child, now) {
      var deadline = T.makeDeadline(function () { return now || 0; }, 0, 480000);
      return T.runStage1(child.env, { maxPuzzles: 12 }, deadline);
    }

    it('reads what the child made, then removes its own intermediate and only that file', function () {
      var child = fakeChild();
      var found = runChild(child);
      expect(found.items.map(function (item) { return item.text; })).toEqual(['#1,a', '#1,b']);
      expect(child.state.spawns).toEqual([480000]);
      expect(child.state.removed).toEqual(['work/stage1-7.json']);
      expect(Object.keys(child.state.files)).toEqual(['work/foreign.json']);
      expect(child.state.released).toEqual(['work']);
    });

    it('gives the child the time that is left of the deadline as its hard timeout', function () {
      var child = fakeChild();
      runChild(child, 478999);
      expect(child.state.spawns).toEqual([1001]);
      var late = fakeChild();
      runChild(late, 479500);
      expect(late.state.spawns).toEqual([1000]);
    });

    it('reports a child that timed out, was killed or stopped at the deadline as incomplete, and cleans up', function () {
      [{ error: { code: 'ETIMEDOUT' }, status: null, signal: 'SIGKILL' }, { status: null, signal: 'SIGKILL' },
        { status: 3, signal: null }].forEach(function (outcome) {
        var child = fakeChild({ run: outcome });
        var err = thrown(function () { runChild(child); });
        expect(err.name).toBe('IncompleteError');
        expect(err.incomplete).toBe(true);
        expect(err.message).toContain('nothing was written');
        expect(child.state.removed).toEqual(['work/stage1-7.json']);
        expect(child.state.released).toEqual(['work']);
        expect(Object.keys(child.state.files)).toEqual(['work/foreign.json']);
      });
    });

    it('never starts the child once the deadline has passed, and still releases the folder it made', function () {
      var child = fakeChild();
      var err = thrown(function () { runChild(child, 480000); });
      expect(err.incomplete).toBe(true);
      expect(err.message).toContain('480-second deadline');
      expect(child.state.spawns).toEqual([]);
      expect(child.state.released).toEqual(['work']);
    });

    it('fails, not incomplete, for a child that crashed, left nothing or left a damaged result', function () {
      var result = function (change) {
        return JSON.stringify(Object.assign({ schema: 1, complete: true, attempted: 0, items: [], failures: [] },
          change));
      };
      [[{ run: { status: 1, signal: null } }, /failed \(exit 1\)/],
        [{ run: { error: { code: 'ENOENT' }, status: null } }, /could not run \(ENOENT\)/],
        [{ output: null }, /left no result/], [{ output: '{"schema":' }, /no valid result/],
        [{ output: result({ complete: false }) }, /not a complete result/],
        [{ output: result({ attempted: 13 }) }, /damaged result/],
        [{ output: result({ attempted: 1, items: [{ text: 'x' }] }) }, /damaged result \(item 0\)/]
      ].forEach(function (c) {
        var child = fakeChild(c[0]);
        var err = thrown(function () { runChild(child); });
        expect(err.message).toMatch(c[1]);
        expect(err.incomplete).toBeUndefined();
        expect(child.state.removed).toEqual(['work/stage1-7.json']);
        expect(child.state.released).toEqual(['work']);
      });
    });

    it('keeps a deadline of its own, which says how long it was and where it was reached', function () {
      var time = clock();
      time.now = 1000;
      var deadline = T.makeDeadline(time.read, 1000, 5000);
      expect([deadline.at, deadline.remaining(), deadline.expired()]).toEqual([6000, 5000, false]);
      deadline.check('now');
      time.now = 6000;
      expect([deadline.remaining(), deadline.expired()]).toEqual([0, true]);
      var err = thrown(function () { deadline.check('before puzzle 2'); });
      expect(err.message).toBe('incomplete: the 5-second deadline of the tool was reached before puzzle 2; ' +
        'nothing was written');
      expect(T.DEADLINE_MS).toBe(8 * 60 * 1000);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The tool itself (Node only): real processes, saved sources, sandbox catalogues, no generation
  // ---------------------------------------------------------------------------------------------

  describe('help example tools: the tool (Node only)', function () {
    function node() {
      var host = SG.test.node;
      var spawn = typeof process !== 'undefined' && process.getBuiltinModule ?
        process.getBuiltinModule('child_process') : null;
      if (!host || !host.fs || !spawn) SG.test.skip('needs Node (fs and child_process); skipped in the browser');
      return { host: host, spawn: spawn };
    }

    function tool(args) {
      var n = node();
      var run = n.spawn.spawnSync(process.execPath, [TOOL].concat(args), { cwd: n.host.root, encoding: 'utf8',
        windowsHide: true, timeout: 120000 });
      return { code: run.status, out: (run.stdout || '').replace(/\r\n/g, '\n'),
        err: (run.stderr || '').replace(/\r\n/g, '\n') };
    }

    function inSandbox(fn) {
      var n = node();
      var dir = n.host.path.join(n.host.root, SANDBOX);
      n.host.fs.rmSync(dir, { recursive: true, force: true });
      n.host.fs.mkdirSync(dir, { recursive: true });
      try {
        return fn(n.host);
      } finally {
        n.host.fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    function read(host, rel) {
      return host.fs.readFileSync(host.path.join(host.root, rel), 'utf8');
    }

    function put(host, rel, text) {
      host.fs.writeFileSync(host.path.join(host.root, rel), text, 'utf8');
    }

    function exists(host, rel) {
      return host.fs.existsSync(host.path.join(host.root, rel));
    }

    // A catalogue of the saved examples without some IDs, and with another `values` for nakedSingle on request.
    function catalogue(skip, tamper) {
      var byId = {};
      registry().filter(function (id) { return skip.indexOf(id) === -1; }).forEach(function (id) {
        byId[id] = clone(EXAMPLES[id]);
      });
      if (tamper) byId.nakedSingle.values = 'x' + byId.nakedSingle.values.slice(1);
      return T.render(Object.keys(byId), byId);
    }

    it('shows its usage without loading anything, and its source has no system-temp directory', function () {
      var help = tool(['--help']);
      expect(help.code).toBe(0);
      ['--ids=', '--sources=', '--max-puzzles=', '--max-hints=', '--check', '--write', '--record-sources=',
        '--discover', '--variants=', '--levels=', '--out=', '--work-dir=', '--help', '--puzzles=N'].forEach(
        function (flag) { expect(help.out).toContain(flag); });
      expect(help.out).toContain('Exit code 0');
      var host = node().host;
      [TOOL, 'tests/fixtures/help-example-tools.js'].forEach(function (rel) {
        expect(read(host, rel)).not.toMatch(/os\.tmpdir|require\('os'\)|process\.env\.TEMP|\/tmp\b/);
      });
      expect(read(host, TOOL)).toContain('help-examples.js');
    });

    it('refuses a bad command line before it loads a source or writes a byte', function () {
      var host = node().host;
      var work = 'tests/artifacts/difficulty-v3/help';
      [['--check', '--write'], ['--discover'], ['--ids=nosuchid'], ['--max-puzzles=0'], ['--out=C:\\x.js']
      ].forEach(function (args) {
        var run = tool(args);
        expect(run.code).toBe(1);
        expect(run.out).toBe('');
        expect(run.err).toContain('Usage: node tests/tools/make-technique-examples.js');
      });
      var outside = tool(['--ids=nakedSingle', '--out=../../outside.js']);
      expect(outside.code).toBe(1);
      expect(outside.err).toContain('--out: the path must stay inside the repository');
      expect(exists(host, '../../outside.js')).toBe(false);
      expect(exists(host, work)).toBe(false);
    });

    it('checks the saved source of an ID without a generator, and takes --puzzles as the cap', function () {
      var run = tool(['tests/artifacts/no-such-generator', '--ids=nakedSingle', '--puzzles=1', '--max-hints=1']);
      expect(run.code).toBe(0);
      expect(run.err).toBe('');
      expect(run.out).toContain('replaying 1 puzzle(s) for 1 ID(s) (--max-puzzles=1, --max-hints=1)');
      expect(run.out).toContain('nakedSingle: matches help-examples.js');
      expect(run.out).toContain('help-examples.js is up to date for the 1 selected ID(s)');
      expect(run.out).not.toMatch(/[A-Za-z]:[\\/]/);
      var capped = tool(['--ids=nakedSingle,pointing', '--max-puzzles=1', '--max-hints=1']);
      expect(capped.code).toBe(1);
      expect(capped.err).toContain('no source within --max-puzzles=1 for pointing');
      expect(capped.out).not.toContain('replaying');
      var clash = tool(['--puzzles=2', '--max-puzzles=3']);
      expect(clash.code).toBe(1);
      expect(clash.err).toContain('disagree');
    });

    it('checks against an alternate catalogue, names the field that differs, and writes nothing', function () {
      inSandbox(function (host) {
        var alt = SANDBOX + '/alt.js';
        put(host, alt, catalogue([], true));
        var before = read(host, alt);
        var canonical = read(host, 'js/ui/help-examples.js');
        var run = tool(['--ids=nakedSingle', '--max-hints=1', '--out=' + alt]);
        expect(run.code).toBe(1);
        expect(run.out).toContain('nakedSingle: 1 field(s) differ from alt.js');
        expect(run.out).toContain('  values: saved "x');
        expect(run.out).toContain('alt.js differs or lacks an example for 1 of the 1 selected ID(s)');
        expect(read(host, alt)).toBe(before);
        expect(read(host, 'js/ui/help-examples.js')).toBe(canonical);
        expect(host.fs.readdirSync(host.path.join(host.root, SANDBOX))).toEqual(['alt.js']);
        var missing = tool(['--ids=nakedSingle', '--max-hints=1', '--out=' + SANDBOX + '/none.js']);
        expect(missing.code).toBe(1);
        expect(missing.err).toContain('there is no catalogue to compare with');
      });
    });

    it('writes only the selected ID into an alternate catalogue, equal to the saved one, and cleans up', function () {
      inSandbox(function (host) {
        var alt = SANDBOX + '/alt.js';
        put(host, alt, catalogue([], true));
        var canonical = read(host, 'js/ui/help-examples.js');
        var run = tool(['--ids=nakedSingle', '--max-hints=1', '--write', '--out=' + alt,
          '--work-dir=' + SANDBOX + '/work']);
        expect(run.code).toBe(0);
        expect(run.out).toContain('wrote player/' + alt + ' (' + registry().length +
          ' examples; 1 selected: nakedSingle; the others kept)');
        expect(read(host, alt)).toBe(T.render(registry(), EXAMPLES));
        expect(read(host, 'js/ui/help-examples.js')).toBe(canonical);
        expect(host.fs.readdirSync(host.path.join(host.root, SANDBOX))).toEqual(['alt.js']);
        expect(tool(['--ids=nakedSingle', '--max-hints=1', '--out=' + alt]).code).toBe(0);
      });
    });

    it('records the sources of two new IDs separately, and writes the catalogue only when both are given',
      function () {
        inSandbox(function (host) {
          var alt = SANDBOX + '/alt.js';
          put(host, alt, catalogue(['pointing', 'boxLine']));
          var short = read(host, alt);
          var one = tool(['--ids=pointing', '--max-hints=30', '--record-sources=' + SANDBOX + '/pointing.json']);
          var two = tool(['--ids=boxLine', '--max-hints=30', '--record-sources=' + SANDBOX + '/boxLine.json']);
          expect([one.code, two.code]).toEqual([0, 0]);
          expect(one.out).toContain('recorded 1 source(s) into player/' + SANDBOX + '/pointing.json');
          var first = JSON.parse(read(host, SANDBOX + '/pointing.json'));
          var second = JSON.parse(read(host, SANDBOX + '/boxLine.json'));
          expect(Object.keys(first.sources)).toEqual(['pointing']);
          expect(first.sources.pointing).toEqual([sourceOf('pointing')]);
          expect(read(host, SANDBOX + '/pointing.json')).toBe(T.sourcesText(first));
          expect(read(host, alt)).toBe(short);
          var partial = tool(['--ids=pointing', '--max-hints=30', '--sources=' + SANDBOX + '/pointing.json',
            '--write', '--out=' + alt]);
          expect(partial.code).toBe(1);
          expect(partial.out).toContain('boxLine: not selected and not in the saved catalogue');
          expect(partial.out).toContain('player/' + alt + ' is untouched');
          expect(read(host, alt)).toBe(short);
          var combined = T.combineSources([{ name: 'pointing.json', data: first },
            { name: 'boxLine.json', data: second }]);
          expect(combined.ok).toBe(true);
          put(host, SANDBOX + '/both.json', T.sourcesText(combined.data));
          var all = tool(['--ids=pointing,boxLine', '--max-hints=30', '--sources=' + SANDBOX + '/both.json',
            '--write', '--out=' + alt]);
          expect(all.code).toBe(0);
          expect(read(host, alt)).toBe(T.render(registry(), EXAMPLES));
          expect(tool(['--ids=pointing,boxLine', '--max-hints=30', '--sources=' + SANDBOX + '/both.json',
            '--out=' + alt]).code).toBe(0);
        });
      });

    it('keeps the old source file when a requested ID has no source, no readable source or no example', function () {
      inSandbox(function (host) {
        var target = SANDBOX + '/pointing.json';
        var good = T.sourcesText(fileOf({ pointing: [sourceOf('pointing')] }));
        put(host, target, good);
        put(host, SANDBOX + '/garbage.json', T.sourcesText(fileOf({ pointing: [{ variantId: 'classic9',
          level: null, seed: null, text: 'not a puzzle' }] })));
        var garbage = tool(['--ids=pointing', '--sources=' + SANDBOX + '/garbage.json',
          '--record-sources=' + target]);
        expect(garbage.code).toBe(1);
        expect(garbage.err).toContain('a source cannot be replayed');
        expect(garbage.err).toContain('not exactly one puzzle block');
        var lacking = tool(['--ids=pointing,boxLine', '--sources=' + target, '--record-sources=' + target]);
        expect(lacking.code).toBe(1);
        expect(lacking.err).toContain('no source for boxLine in the sources file');
        var short = tool(['--ids=pointing', '--max-hints=1', '--sources=' + target, '--record-sources=' + target]);
        expect(short.code).toBe(1);
        expect(short.out).toContain('pointing: no example found in 1 puzzle(s) within 1 hint(s) ' +
          '(1 stopped at the hint limit)');
        expect(short.out).toContain('no example for 1 selected ID(s); nothing was written');
        expect(read(host, target)).toBe(good);
        expect(host.fs.readdirSync(host.path.join(host.root, SANDBOX)).sort()).toEqual(['garbage.json',
          'pointing.json']);
      });
    });

    it('refuses an invalid sources file, an output outside the repository and a missing generator', function () {
      inSandbox(function (host) {
        put(host, SANDBOX + '/bad.json', '{"schema":1,"sources":{"nakedSingle":[{"variantId":"classic9"}]}}');
        var bad = tool(['--ids=nakedSingle', '--sources=' + SANDBOX + '/bad.json']);
        expect(bad.code).toBe(1);
        expect(bad.err).toContain('is not a valid sources file');
        expect(bad.err).toContain('sources.nakedSingle[0]: expected exactly');
        expect(tool(['--ids=nakedSingle', '--sources=' + SANDBOX + '/none.json']).err)
          .toContain('no such sources file');
        var outside = tool(['--ids=nakedSingle', '--record-sources=../../outside.json']);
        expect(outside.code).toBe(1);
        expect(outside.err).toContain('--record-sources: the path must stay inside the repository');
        expect(exists(host, '../../outside.json')).toBe(false);
        var generator = tool(['tests/artifacts/no-such-generator', '--ids=nakedSingle', '--discover', '--write',
          '--max-puzzles=1', '--out=' + SANDBOX + '/alt.js', '--work-dir=' + SANDBOX + '/work']);
        expect(generator.code).toBe(1);
        expect(generator.err).toContain('not a generator folder');
        expect(exists(host, SANDBOX + '/work')).toBe(false);
        expect(exists(host, SANDBOX + '/alt.js')).toBe(false);
      });
    });
  });
})();
