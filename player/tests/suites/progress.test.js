// Saved progress: the per-puzzle progress, the stored documents and the recent list, over fake storages (a
// healthy one, a small one that runs full, a blocked one). Pure, runs on Node.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var PG = SG.progress;

  function ready() {
    if (!PG || !SG.store || !SG.importer || !SG.testkit) SG.test.skip('SG.progress is not loaded here');
  }

  /** A `Storage` look-alike; `limit` makes it throw QuotaExceededError like a full browser storage. */
  function fakeBackend(options) {
    var o = options || {};
    var data = new Map();
    function total() {
      var sum = 0;
      data.forEach(function (value, key) { sum += key.length + value.length; });
      return sum;
    }
    return {
      data: data,
      get length() { return data.size; },
      key: function key(i) { return Array.from(data.keys())[i] || null; },
      getItem: function getItem(name) {
        if (o.blocked) throw new Error('SecurityError');
        return data.has(name) ? data.get(name) : null;
      },
      setItem: function setItem(name, value) {
        if (o.blocked) throw new Error('SecurityError');
        var before = data.get(name);
        data.set(name, String(value));
        if (o.limit !== undefined && total() > o.limit) {
          if (before === undefined) data.delete(name);
          else data.set(name, before);
          var err = new Error('full');
          err.name = 'QuotaExceededError';
          throw err;
        }
      },
      removeItem: function removeItem(name) {
        if (o.blocked) throw new Error('SecurityError');
        data.delete(name);
      }
    };
  }

  function make(options, startAt) {
    var backend = fakeBackend(options);
    var time = startAt || 1000;
    var progress = PG.createProgress(SG.store.createStorage(backend), function () { return ++time; });
    return { backend: backend, progress: progress };
  }

  function id(n) {
    return 'classic9-' + ('0000000000000000' + n.toString(16)).slice(-16);
  }

  function state(extra) {
    return Object.assign({ v: 1, cells: 81, digits: 9, values: [], notes: [], undo: [], redo: [] }, extra);
  }

  function record(percent, extra) {
    return Object.assign({ symbolMode: 'digits', percent: percent, solved: false, state: state() }, extra);
  }

  describe('progress: saving and loading a game', function () {
    it('keeps the state, the percentage and the symbol mode of a puzzle, and says when it is not there', function () {
      ready();
      var p = make().progress;
      expect(p.loadProgress(id(1))).toBeNull();
      expect(p.saveProgress(id(1), record(42, { symbolMode: 'colors', state: state({ values: [1, 2, 3] }) })))
        .toBe('ok');
      var got = p.loadProgress(id(1));
      expect(got.percent).toBe(42);
      expect(got.symbolMode).toBe('colors');
      expect(got.state.values).toEqual([1, 2, 3]);
      expect(got.solved).toBe(false);
      expect(p.loadProgress(id(2))).toBeNull();
    });

    it('replaces the entry of the same puzzle and keeps the most recent first', function () {
      ready();
      var p = make().progress;
      p.saveProgress(id(1), record(10));
      p.saveProgress(id(2), record(20));
      p.saveProgress(id(1), record(30));
      var list = p.progressList();
      expect(list.map(function (e) { return e.id; })).toEqual([id(1), id(2)]);
      expect(list[0].percent).toBe(30);
    });

    it('keeps the last 20 puzzles (least recently used goes first)', function () {
      ready();
      var p = make().progress;
      for (var n = 1; n <= 25; n++) p.saveProgress(id(n), record(n));
      var list = p.progressList();
      expect(list.length).toBe(PG.LIMITS.progressEntries);
      expect(p.loadProgress(id(1))).toBeNull();
      expect(p.loadProgress(id(5))).toBeNull();
      expect(p.loadProgress(id(6)).percent).toBe(6);
      expect(p.loadProgress(id(25)).percent).toBe(25);
      p.saveProgress(id(6), record(66));
      p.saveProgress(id(26), record(26));
      expect(p.loadProgress(id(6)).percent).toBe(66);
      expect(p.loadProgress(id(7))).toBeNull();
    });

    it('cuts the history to the last 300 undo and 100 redo steps', function () {
      ready();
      var undo = [];
      var redo = [];
      for (var i = 0; i < 400; i++) undo.push({ k: 'set', c: [[i % 81, 0, 1, 0, 0]] });
      for (var j = 0; j < 150; j++) redo.push({ k: 'set', c: [[j % 81, 0, 2, 0, 0]] });
      var full = state({ undo: undo, redo: redo });
      var trimmed = PG.trimState(full);
      expect(trimmed.undo.length).toBe(300);
      expect(trimmed.redo.length).toBe(100);
      expect(trimmed.undo[299]).toBe(undo[399]);
      expect(trimmed.redo[99]).toBe(redo[149]);
      expect(full.undo.length).toBe(400);
      var p = make().progress;
      p.saveProgress(id(1), record(5, { state: full }));
      expect(p.loadProgress(id(1)).state.undo.length).toBe(300);
    });

    it('refuses what is not a puzzle id or a record', function () {
      ready();
      var p = make().progress;
      ['', 'classic9', 'x-y', null, 5, '../etc', 'classic9-XYZ'].forEach(function (bad) {
        expect(p.saveProgress(bad, record(1))).toBe('invalid');
      });
      expect(p.saveProgress(id(1), { percent: 5 })).toBe('invalid');
      expect(p.saveProgress(id(1), record(120))).toBe('invalid');
      expect(p.saveProgress(id(1), record(1.5))).toBe('invalid');
      expect(p.progressList()).toEqual([]);
    });

    it('removes progress and forgets a puzzle completely', function () {
      ready();
      var p = make().progress;
      p.saveProgress(id(1), record(10));
      p.savePuzzle(id(1), { format: 'x' }, { variantId: 'classic9' });
      p.setLast(id(1));
      p.removeProgress(id(1));
      expect(p.loadProgress(id(1))).toBeNull();
      expect(p.loadPuzzle(id(1))).not.toBeNull();
      p.saveProgress(id(1), record(10));
      p.forget(id(1));
      expect(p.loadProgress(id(1))).toBeNull();
      expect(p.loadPuzzle(id(1))).toBeNull();
      expect(p.getLast()).toBeNull();
    });
  });

  describe('progress: the stored documents and the recent list', function () {
    it('stores a document with its meta and gives it back', function () {
      ready();
      var p = make().progress;
      expect(p.savePuzzle(id(1), { format: 'sudoku-generator/puzzle', n: 1 }, { variantId: 'classic9', clues: 30 }))
        .toBe('ok');
      var got = p.loadPuzzle(id(1));
      expect(got.doc.n).toBe(1);
      expect(got.meta.clues).toBe(30);
      expect(p.loadPuzzle(id(2))).toBeNull();
    });

    it('keeps the last 10 documents', function () {
      ready();
      var p = make().progress;
      for (var n = 1; n <= 14; n++) p.savePuzzle(id(n), { n: n }, null);
      expect(p.recent(50).length).toBe(PG.LIMITS.puzzleEntries);
      expect(p.loadPuzzle(id(4))).toBeNull();
      expect(p.loadPuzzle(id(5)).doc.n).toBe(5);
    });

    it('does not store a document over 160 kB, and keeps the total under 900 kB', function () {
      ready();
      var p = make().progress;
      var big = { pad: new Array(PG.LIMITS.docBytes).join('x') };
      expect(p.savePuzzle(id(1), big, null)).toBe('tooLarge');
      expect(p.loadPuzzle(id(1))).toBeNull();
      var medium = { pad: new Array(150 * 1024).join('x') };
      for (var n = 1; n <= 8; n++) expect(p.savePuzzle(id(n), medium, null)).toBe('ok');
      var kept = p.recent(50).length;
      expect(kept).toBeLessThan(8);
      expect(kept).toBeGreaterThan(3);
      expect(p.loadPuzzle(id(8))).not.toBeNull();
    });

    it('lists the stored puzzles newest first with their progress', function () {
      ready();
      var p = make().progress;
      p.savePuzzle(id(1), { n: 1 }, { variantId: 'classic9' });
      p.savePuzzle(id(2), { n: 2 }, { variantId: 'killer' });
      p.savePuzzle(id(3), { n: 3 }, null);
      p.saveProgress(id(1), record(55, { solved: false }));
      p.saveProgress(id(2), record(100, { solved: true }));
      var list = p.recent();
      expect(list.map(function (e) { return e.id; })).toEqual([id(2), id(1), id(3)]);
      var byId = {};
      list.forEach(function (e) { byId[e.id] = e; });
      expect(byId[id(1)].percent).toBe(55);
      expect(byId[id(1)].hasProgress).toBe(true);
      expect(byId[id(2)].solved).toBe(true);
      expect(byId[id(3)].hasProgress).toBe(false);
      expect(byId[id(3)].meta).toBeNull();
      expect(p.recent(2).length).toBe(2);
    });

    it('drops a meta that is too big instead of the puzzle', function () {
      ready();
      var p = make().progress;
      expect(p.savePuzzle(id(1), { n: 1 }, { text: new Array(PG.LIMITS.metaBytes + 10).join('m') })).toBe('ok');
      expect(p.loadPuzzle(id(1)).meta).toBeNull();
    });
  });

  describe('progress: the last puzzle and the tour', function () {
    it('remembers the id of the puzzle on the board and ignores anything else', function () {
      ready();
      var m = make();
      expect(m.progress.getLast()).toBeNull();
      m.progress.setLast(id(3));
      expect(m.progress.getLast()).toBe(id(3));
      m.progress.setLast('not an id');
      expect(m.progress.getLast()).toBe(id(3));
      m.backend.data.set(PG.KEYS.last, '<script>');
      expect(m.progress.getLast()).toBeNull();
      m.progress.clearLast();
      expect(m.progress.getLast()).toBeNull();
    });

    it('marks the tour as seen, and clear() forgets everything of the player', function () {
      ready();
      var p = make().progress;
      expect(p.tourSeen()).toBe(false);
      p.markTourSeen();
      expect(p.tourSeen()).toBe(true);
      p.saveProgress(id(1), record(1));
      p.savePuzzle(id(1), { n: 1 }, null);
      p.setLast(id(1));
      p.clear();
      expect(p.tourSeen()).toBe(false);
      expect(p.progressList()).toEqual([]);
      expect(p.recent()).toEqual([]);
      expect(p.getLast()).toBeNull();
    });

    it('never touches the preferences key', function () {
      ready();
      var m = make();
      m.backend.setItem(SG.store.KEY, '{"v":1}');
      m.progress.saveProgress(id(1), record(1));
      m.progress.clear();
      expect(m.backend.getItem(SG.store.KEY)).toBe('{"v":1}');
    });
  });

  describe('progress: damaged storage, other versions, full or blocked storage', function () {
    it('purges corrupt JSON and a value of another version, and carries on', function () {
      ready();
      var m = make();
      m.backend.setItem(PG.KEYS.progress, '{not json');
      expect(m.progress.progressList()).toEqual([]);
      expect(m.backend.getItem(PG.KEYS.progress)).toBeNull();
      m.backend.setItem(PG.KEYS.progress, JSON.stringify({ version: 2, entries: [{ id: id(1) }] }));
      expect(m.progress.loadProgress(id(1))).toBeNull();
      expect(m.backend.getItem(PG.KEYS.progress)).toBeNull();
      m.backend.setItem(PG.KEYS.puzzles, JSON.stringify([1, 2, 3]));
      expect(m.progress.recent()).toEqual([]);
      expect(m.backend.getItem(PG.KEYS.puzzles)).toBeNull();
      expect(m.progress.saveProgress(id(1), record(9))).toBe('ok');
    });

    it('drops the entries of the wrong shape and keeps the good ones', function () {
      ready();
      var m = make();
      var good = { id: id(1), at: 5, symbolMode: 'digits', percent: 10, solved: false, state: state() };
      var bad = [
        { id: 'bad', at: 1, symbolMode: 'digits', percent: 1, solved: false, state: {} },
        { id: id(2), at: 'x', symbolMode: 'digits', percent: 1, solved: false, state: {} },
        { id: id(3), at: 1, symbolMode: 'digits', percent: 500, solved: false, state: {} },
        { id: id(4), at: 1, symbolMode: 'digits', percent: 1, solved: 'no', state: {} },
        { id: id(5), at: 1, symbolMode: 'digits', percent: 1, solved: false, state: null },
        null, 7, 'text'
      ];
      m.backend.setItem(PG.KEYS.progress, JSON.stringify({ version: 1, entries: bad.concat([good]) }));
      var list = m.progress.progressList();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(id(1));
    });

    it('a full storage evicts the oldest entries and the new one is kept', function () {
      ready();
      var m = make({ limit: 9000 });
      var big = state({ values: new Array(600).fill(5) });
      var statuses = [];
      for (var n = 1; n <= 12; n++) statuses.push(m.progress.saveProgress(id(n), record(n, { state: big })));
      expect(statuses.every(function (s) { return s === 'ok'; })).toBe(true);
      var list = m.progress.progressList();
      expect(list.length).toBeLessThan(12);
      expect(list.length).toBeGreaterThan(0);
      expect(m.progress.loadProgress(id(12)).percent).toBe(12);
      expect(m.progress.loadProgress(id(1))).toBeNull();
    });

    it('one entry that does not fit at all reports "quota" and never throws', function () {
      ready();
      var m = make({ limit: 300 });
      var status = m.progress.saveProgress(id(1), record(5, { state: state({ values: new Array(500).fill(1) }) }));
      expect(status).toBe('quota');
      expect(function () { m.progress.recent(); m.progress.progressList(); }).not.toThrow();
    });

    it('blocked storage: nothing throws, the session works from memory, persistent() says false', function () {
      ready();
      var m = make({ blocked: true });
      expect(m.progress.saveProgress(id(1), record(33))).toBe('blocked');
      expect(m.progress.loadProgress(id(1)).percent).toBe(33);
      expect(m.progress.savePuzzle(id(1), { n: 1 }, null)).toBe('blocked');
      expect(m.progress.loadPuzzle(id(1)).doc.n).toBe(1);
      m.progress.setLast(id(1));
      expect(m.progress.getLast()).toBe(id(1));
      m.progress.markTourSeen();
      expect(m.progress.tourSeen()).toBe(true);
      expect(m.progress.persistent()).toBe(false);
      expect(function () { m.progress.clear(); }).not.toThrow();
    });

    it('works without any backend at all (no localStorage)', function () {
      ready();
      var p = PG.createProgress(SG.store.createStorage(null));
      expect(p.saveProgress(id(1), record(7))).toBe('blocked');
      expect(p.loadProgress(id(1)).percent).toBe(7);
    });
  });

  describe('progress: the same puzzle is found again', function () {
    it('the id of a puzzle is the same for the same variant and clues, and differs when a clue differs', function () {
      ready();
      if (SG.testkit.document('classic9') === null) SG.test.skip('the puzzle fixtures cannot be read here');
      var a = SG.importer.openDocument(SG.testkit.document('classic9'));
      var b = SG.importer.openDocument(SG.testkit.document('classic9'));
      expect(a.ok && b.ok).toBe(true);
      expect(a.puzzle.id).toBe(b.puzzle.id);
      expect(PG.validId(a.puzzle.id)).toBe(true);
      var doc = SG.testkit.document('classic9');
      var cell = doc.givens.findIndex(function (v) { return v > 0; });
      var other = SG.importer.openDocument(Object.assign({}, doc, { givens: doc.givens.map(function (v, i) {
        return i === cell ? 0 : v;
      }) }));
      expect(other.ok).toBe(true);
      expect(other.puzzle.id).not.toBe(a.puzzle.id);
    });

    it('every fixture has a valid id, and the ids are all different', function () {
      ready();
      if (SG.testkit.document('classic9') === null) SG.test.skip('the puzzle fixtures cannot be read here');
      var seen = {};
      SG.testkit.documentNames().forEach(function (name) {
        var outcome = SG.importer.openDocument(SG.testkit.document(name));
        expect(outcome.ok).toBe(true);
        expect(PG.validId(outcome.puzzle.id)).toBe(true);
        expect(seen[outcome.puzzle.id]).toBeUndefined();
        seen[outcome.puzzle.id] = name;
      });
    });

    it('a saved game of a real puzzle restores to the same grid', function () {
      ready();
      if (SG.testkit.document('killer') === null || !SG.play) SG.test.skip('needs the fixtures and SG.play');
      var puzzle = SG.importer.openDocument(SG.testkit.document('killer')).puzzle;
      var game = SG.play.createGame(puzzle.model, puzzle.givens, puzzle.solution);
      var empties = [];
      for (var i = 0; i < puzzle.givens.length; i++) if (puzzle.givens[i] === 0) empties.push(i);
      game.setValue(empties[0], puzzle.solution[empties[0]]);
      game.toggleNote(empties[1], 3);
      var p = make().progress;
      p.saveProgress(puzzle.id, { symbolMode: 'digits', percent: 3, solved: false, state: game.serialize() });
      var loaded = p.loadProgress(puzzle.id);
      var again = SG.play.restoreGame(puzzle.model, puzzle.givens, puzzle.solution, loaded.state);
      expect(Array.from(again.snapshot().values)).toEqual(Array.from(game.snapshot().values));
      expect(Array.from(again.snapshot().notes)).toEqual(Array.from(game.snapshot().notes));
      expect(again.canUndo()).toBe(true);
    });
  });
})();
