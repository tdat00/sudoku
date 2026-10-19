// Play: the game engine of SG.play is pure, so entries, notes, undo / redo, conflicts, hints, the timer,
// completion and the saved state are all checked on Node with the puzzles of the fixtures (opened through
// SG.importer). The DOM layer (SG.play.init) needs the page and is verified in the browser run (docs/qa.md);
// here only what is cheap without one is checked (it refuses to start, its strings, its pure helpers).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var P = SG.play;
  var NODE = SG.test.node;

  function ready() {
    if (!P || !SG.importer || !SG.testkit || !SG.logicalSolver || !SG.i18n) {
      SG.test.skip('SG.play is not loaded here');
    }
    if (SG.testkit.document('classic9') === null) SG.test.skip('the puzzle fixtures cannot be read here');
  }

  var cache = {};

  function openFixture(doc) {
    var outcome = SG.importer.openDocument(JSON.parse(JSON.stringify(doc)));
    if (!outcome.ok) throw new Error('fixture: ' + JSON.stringify(outcome.errors));
    return outcome.puzzle;
  }

  /** How far a harder puzzle is dug: the share of the cells that stay as clues (0 = as far as it goes). */
  var CLUE_SHARE = { normal: 0.42, hard: 0.34, master: 0 };
  var DIGGABLE = { classic4: true, classic6: true, classic9: true, diagonalX: true, hyper: true, jigsaw9: true };

  /**
   * The puzzle of a fixture; for the harder levels of a variant without cages or signs, the solution of the
   * fixture dug again (one solution kept) with the seed. Other variants use their fixture as it is.
   */
  function realResult(variantId, level, seed) {
    var key = [variantId, level, seed].join('/');
    if (!cache[key]) {
      var base = cache['fixture/' + variantId];
      if (!base) base = cache['fixture/' + variantId] = openFixture(SG.testkit.document(variantId));
      var share = CLUE_SHARE[level];
      if (share === undefined || DIGGABLE[variantId] !== true) {
        cache[key] = base;
      } else {
        var dug = SG.testkit.dig(base.model, base.solution, SG.testkit.rng.create(seed),
          { minClues: Math.round(base.model.cellCount * share) });
        cache[key] = Object.assign({}, base, { givens: dug.givens });
      }
    }
    return cache[key];
  }

  /** The Mega 12 fixture with the numbers 1 to 12 as its symbols (two-character entries). */
  function numbersMega12() {
    if (!cache.numbers) {
      var doc = SG.testkit.document('mega12');
      var labels = [];
      for (var i = 1; i <= 12; i++) labels.push(String(i));
      doc.symbols.labels = labels;
      doc.model.symbols.labels = labels;
      cache.numbers = openFixture(doc);
    }
    return cache.numbers;
  }

  function newGame(result, options) {
    return P.createGame(result.model, result.givens, result.solution, options);
  }

  function openCells(result) {
    var out = [];
    for (var i = 0; i < result.givens.length; i++) if (result.givens[i] === 0) out.push(i);
    return out;
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  function placeholders(text) {
    var found = {};
    String(text).replace(/\{(\w+)\}/g, function (m, name) { found[name] = true; return m; });
    return Object.keys(found).sort();
  }

  /** Enters the whole solution, cell by cell (the first `limit` cells when given). */
  function enterSolution(game, result, limit) {
    var cells = openCells(result);
    var count = limit === undefined ? cells.length : Math.min(limit, cells.length);
    for (var k = 0; k < count; k++) game.setValue(cells[k], result.solution[cells[k]]);
  }

  /** The rule conflicts among the visible values by brute force over the units (no cages, no signs). */
  function referenceUnitConflicts(game) {
    var model = game.model;
    var flagged = {};
    model.units.forEach(function (cells) {
      var seen = {};
      Array.prototype.forEach.call(cells, function (c) {
        var v = game.getValue(c);
        if (v === 0) return;
        (seen[v] = seen[v] || []).push(c);
      });
      Object.keys(seen).forEach(function (v) {
        if (seen[v].length > 1) seen[v].forEach(function (c) { flagged[c] = true; });
      });
    });
    return Object.keys(flagged).map(Number).sort(function (a, b) { return a - b; });
  }

  function snapshotText(game) {
    var s = game.snapshot();
    return Array.from(s.values).join(',') + '|' + Array.from(s.notes).join(',');
  }

  // ---------------------------------------------------------------------------------------------
  // Pure helpers
  // ---------------------------------------------------------------------------------------------

  describe('play: note grids, pad layout and keys', function () {
    it('sizes the note mini grid per number of digits (3x3, 2x3, 2x2, 3x4, 4x4)', function () {
      ready();
      expect(P.noteLayout(9)).toEqual({ cols: 3, rows: 3 });
      expect(P.noteLayout(6)).toEqual({ cols: 3, rows: 2 });
      expect(P.noteLayout(4)).toEqual({ cols: 2, rows: 2 });
      expect(P.noteLayout(12)).toEqual({ cols: 4, rows: 3 });
      expect(P.noteLayout(16)).toEqual({ cols: 4, rows: 4 });
      [4, 6, 9, 12, 16].forEach(function (d) {
        var lay = P.noteLayout(d);
        expect(lay.cols * lay.rows).toBeGreaterThanOrEqual(d);
        expect(lay.cols * (lay.rows - 1)).toBeLessThan(d);
      });
    });

    it('lays out the number pad in rows of about equal length', function () {
      ready();
      expect(P.padLayout(9, 9)).toEqual({ cols: 9, rows: 1 });
      expect(P.padLayout(9, 6)).toEqual({ cols: 5, rows: 2 });
      expect(P.padLayout(12, 9)).toEqual({ cols: 6, rows: 2 });
      expect(P.padLayout(16, 6)).toEqual({ cols: 6, rows: 3 });
      expect(P.padLayout(4, 6)).toEqual({ cols: 4, rows: 1 });
    });

    it('finds the cell under a board point, and none in the margin or in a hole', function () {
      ready();
      var model = realResult('classic9', 'easy', 1).model;
      var geo = SG.boardView.geometry(model);
      for (var i = 0; i < model.cellCount; i++) {
        expect(P.cellAtPoint(geo, geo.cellX[i] + 20, geo.cellY[i] + 20)).toBe(i);
        expect(P.cellAtPoint(geo, geo.cellX[i] + 0.5, geo.cellY[i] + 39.5)).toBe(i);
      }
      expect(P.cellAtPoint(geo, 1, 1)).toBe(-1);
      expect(P.cellAtPoint(geo, geo.width - 1, geo.height - 1)).toBe(-1);
      var samurai = realResult('samurai', 'veryEasy', 1).model;
      var sg = SG.boardView.geometry(samurai);
      var holes = 0;
      for (var r = 0; r < sg.rows; r++) {
        for (var c = 0; c < sg.cols; c++) {
          if (sg.at[r * sg.cols + c] === -1) {
            holes++;
            expect(P.cellAtPoint(sg, sg.originX + c * sg.cell + 20, sg.originY + r * sg.cell + 20)).toBe(-1);
          }
        }
      }
      expect(holes).toBeGreaterThan(0);
    });

    it('moves the selection by arrows, jumping over the holes of a multi-grid canvas', function () {
      ready();
      var model = realResult('classic9', 'easy', 1).model;
      var geo = SG.boardView.geometry(model);
      expect(P.moveSelection(geo, 0, 0, 1)).toBe(1);
      expect(P.moveSelection(geo, 0, 1, 0)).toBe(9);
      expect(P.moveSelection(geo, 0, 0, -1)).toBe(0);
      expect(P.moveSelection(geo, 0, -1, 0)).toBe(0);
      expect(P.moveSelection(geo, 80, 0, 1)).toBe(80);
      expect(P.moveSelection(geo, 80, 1, 0)).toBe(80);
      var samurai = realResult('samurai', 'veryEasy', 1).model;
      var sg = SG.boardView.geometry(samurai);
      // The last cell of the first row of the top-left grid: the next cell to the right lies behind a hole.
      var last = -1;
      for (var c = 0; c < sg.cols; c++) if (sg.at[c] >= 0 && sg.at[c + 1] === -1) { last = sg.at[c]; break; }
      var next = P.moveSelection(sg, last, 0, 1);
      expect(next).not.toBe(last);
      expect(sg.cellRow[next]).toBe(sg.cellRow[last]);
      expect(sg.cellCol[next]).toBeGreaterThan(sg.cellCol[last] + 1);
      expect(P.moveSelection(sg, next, 0, -1)).toBe(last);
    });

    it('reads typed characters: one-character symbols at once, hexadecimal 0 is the first value', function () {
      ready();
      var classic = P.createKeyReader(P.typedLabels(realResult('classic9', 'easy', 1).model, 'digits'));
      expect(classic.feed('5', 0)).toEqual({ value: 5, pending: false, continued: false });
      expect(classic.feed('x', 10)).toBeNull();
      var hex = P.createKeyReader(P.typedLabels(realResult('mega16', 'veryEasy', 1).model, 'digits'));
      expect(hex.feed('0', 0).value).toBe(1);
      expect(hex.feed('F', 5).value).toBe(16);
      expect(hex.feed('f', 9).value).toBe(16);
      expect(hex.feed('g', 12)).toBeNull();
    });

    it('reads the two-character symbols of mega12 numbers (1-12) with a pending first digit', function () {
      ready();
      var model = numbersMega12().model;
      var labels = P.typedLabels(model, 'digits');
      expect(labels.slice(8)).toEqual(['9', '10', '11', '12']);
      var reader = P.createKeyReader(labels, { timeoutMs: 1000 });
      expect(reader.feed('3', 0)).toEqual({ value: 3, pending: false, continued: false });
      expect(reader.feed('1', 100)).toEqual({ value: 1, pending: true, continued: false });
      expect(reader.feed('2', 400)).toEqual({ value: 12, pending: false, continued: true });
      expect(reader.feed('1', 500)).toEqual({ value: 1, pending: true, continued: false });
      // Too late: the second digit starts a new entry.
      expect(reader.feed('0', 2000)).toBeNull();
      expect(reader.feed('1', 3000).pending).toBe(true);
      expect(reader.feed('1', 3200)).toEqual({ value: 11, pending: false, continued: true });
      expect(reader.feed('1', 4000).pending).toBe(true);
      reader.reset();
      expect(reader.feed('0', 4100)).toBeNull();
    });

    it('types letters in a Wordoku and in letter mode; digits stand for the first values there', function () {
      ready();
      var word = realResult('wordoku', 'easy', 1).model;
      var letters = P.typedLabels(word, 'word');
      expect(letters).toEqual(word.symbols.labels.map(String));
      var reader = P.createKeyReader(letters);
      expect(reader.feed(letters[2].toLowerCase(), 0).value).toBe(3);
      expect(reader.feed('1', 10).value).toBe(1);
      expect(P.typedLabels(word, 'digits')[0]).toBe('1');
      var classic = realResult('classic9', 'easy', 1).model;
      expect(P.typedLabels(classic, 'letters')).toEqual('ABCDEFGHI'.split(''));
    });

    it('groups eliminations by digit and writes digits the way the board draws them', function () {
      ready();
      expect(P.groupEliminations([[5, 3], [2, 3], [9, 1]])).toEqual([{ value: 1, cells: [9] },
        { value: 3, cells: [2, 5] }]);
      expect(P.groupEliminations([])).toEqual([]);
      var hex = realResult('mega16', 'veryEasy', 1).model;
      var args = P.localizeArgs(hex, { digit: 1, digitX: 10, digits: [1, 16], chains: [[[0, 3, 1]]], cell: 'R1C1' },
        'digits');
      expect(args.digit).toBe('0');
      expect(args.digitX).toBe('9');
      expect(args.digits).toEqual(['0', 'F']);
      expect(args.chains).toEqual([[['R1C1', '2', 1]]]);
      expect(args.cell).toBe('R1C1');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Entries, notes, undo and redo
  // ---------------------------------------------------------------------------------------------

  describe('play: entries and notes', function () {
    it('enters, replaces and clears values; clues cannot be changed', function () {
      ready();
      var r = realResult('classic9', 'normal', 4);
      var g = newGame(r);
      var open = openCells(r);
      var clue = r.givens.findIndex(function (v) { return v > 0; });
      expect(g.getValue(clue)).toBe(r.givens[clue]);
      expect(g.isGiven(clue)).toBe(true);
      expect(g.setValue(clue, r.givens[clue] % 9 + 1)).toBe(false);
      expect(g.clearValue(clue)).toBe(false);
      expect(g.toggleNote(clue, 1)).toBe(false);
      expect(g.erase(clue)).toBe(false);
      var c = open[0];
      expect(g.getValue(c)).toBe(0);
      expect(g.setValue(c, 4)).toBe(true);
      expect(g.getValue(c)).toBe(4);
      expect(g.userValue(c)).toBe(4);
      expect(g.setValue(c, 4)).toBe(false);
      expect(g.setValue(c, 7)).toBe(true);
      expect(g.userValue(c)).toBe(7);
      expect(g.setValue(c, 0)).toBe(false);
      expect(g.setValue(c, 10)).toBe(false);
      expect(g.setValue(-1, 3)).toBe(false);
      expect(g.setValue(c, 1.5)).toBe(false);
      expect(g.clearValue(c)).toBe(true);
      expect(g.getValue(c)).toBe(0);
      expect(g.clearValue(c)).toBe(false);
    });

    it('notes: toggled on empty cells only, the value of a cell removes its notes, erase clears value then notes',
      function () {
        ready();
        var r = realResult('classic9', 'normal', 4);
        var g = newGame(r);
        var c = openCells(r)[0];
        expect(g.toggleNote(c, 3)).toBe(true);
        expect(g.toggleNote(c, 5)).toBe(true);
        expect(g.getNotes(c)).toBe((1 << 2) | (1 << 4));
        expect(g.toggleNote(c, 3)).toBe(true);
        expect(g.getNotes(c)).toBe(1 << 4);
        expect(g.toggleNote(c, 12)).toBe(false);
        g.setValue(c, 8);
        expect(g.getNotes(c)).toBe(0);
        expect(g.toggleNote(c, 2)).toBe(false);
        expect(g.erase(c)).toBe(true);
        expect(g.getValue(c)).toBe(0);
        g.toggleNote(c, 2);
        expect(g.erase(c)).toBe(true);
        expect(g.getNotes(c)).toBe(0);
        expect(g.erase(c)).toBe(false);
      });

    it('a placed value leaves the notes of its peers (autoNotes), and undo brings them back', function () {
      ready();
      var r = realResult('classic9', 'normal', 4);
      var g = newGame(r);
      var open = openCells(r);
      var c = open[0];
      var peer = open.filter(function (x) { return r.model.peers[c].indexOf(x) !== -1; })[0];
      var far = open.filter(function (x) { return x !== c && r.model.peers[c].indexOf(x) === -1; })[0];
      [peer, far].forEach(function (x) { g.toggleNote(x, 6); g.toggleNote(x, 2); });
      g.setValue(c, 6);
      expect(g.getNotes(peer)).toBe(1 << 1);
      expect(g.getNotes(far)).toBe((1 << 1) | (1 << 5));
      g.undo();
      expect(g.getNotes(peer)).toBe((1 << 1) | (1 << 5));
      expect(g.getNotes(c)).toBe(0);
      var plain = newGame(r, { autoNotes: false });
      plain.toggleNote(peer, 6);
      plain.setValue(c, 6);
      expect(plain.getNotes(peer)).toBe(1 << 5);
      plain.setOptions({ autoNotes: true });
      expect(plain.getOptions().autoNotes).toBe(true);
    });

    it('fills in all notes with the symbols the peers still allow, in one undo step', function () {
      ready();
      var r = realResult('classic9', 'easy', 2);
      var g = newGame(r);
      var before = snapshotText(g);
      expect(g.fillNotes()).toBe(true);
      var full = (1 << 9) - 1;
      openCells(r).forEach(function (c) {
        var mask = full;
        r.model.peers[c].forEach(function (p) { if (g.getValue(p) > 0) mask &= ~(1 << (g.getValue(p) - 1)); });
        expect(g.getNotes(c)).toBe(mask);
        expect(g.getNotes(c) & (1 << (r.solution[c] - 1))).not.toBe(0);
      });
      expect(g.fillNotes()).toBe(false);
      g.undo();
      expect(snapshotText(g)).toBe(before);
    });

    it('amends the last typed value of a cell (two-character symbols) into a single undo step', function () {
      ready();
      var r = numbersMega12();
      var g = newGame(r);
      var c = openCells(r)[0];
      expect(g.setValue(c, 1)).toBe(true);
      expect(g.setValue(c, 12, { amend: true })).toBe(true);
      expect(g.userValue(c)).toBe(12);
      expect(g.undo()).toBe(true);
      expect(g.userValue(c)).toBe(0);
      expect(g.canUndo()).toBe(false);
      g.setValue(c, 2);
      var d = openCells(r)[1];
      g.setValue(d, 3);
      g.setValue(c, 5, { amend: true });
      expect(g.userValue(d)).toBe(3);
      expect(g.userValue(c)).toBe(5);
    });
  });

  describe('play: undo and redo', function () {
    it('undo and redo are exact: random operations against a reference of every state', function () {
      ready();
      [['classic9', 'normal', 3], ['killer', 'easy', 2], ['classic6', 'easy', 5]].forEach(function (cfg) {
        var r = realResult(cfg[0], cfg[1], cfg[2]);
        var g = newGame(r);
        var n = r.model.cellCount;
        var D = r.model.digits;
        var rng = SG.testkit.rng.create(1000 + cfg[2]);
        var states = [snapshotText(g)];
        var at = 0;
        for (var step = 0; step < 500; step++) {
          var kind = rng.int(12);
          var cell = rng.int(n);
          var v = 1 + rng.int(D);
          var changed = false;
          if (kind <= 3) changed = g.setValue(cell, v);
          else if (kind === 4) changed = g.clearValue(cell);
          else if (kind <= 6) changed = g.toggleNote(cell, v);
          else if (kind === 7) changed = g.erase(cell);
          else if (kind === 8) changed = g.fillNotes();
          else if (kind === 9 || kind === 10) {
            expect(g.undo()).toBe(at > 0);
            if (at > 0) at--;
            expect(snapshotText(g)).toBe(states[at]);
            continue;
          } else {
            expect(g.redo()).toBe(at < states.length - 1);
            if (at < states.length - 1) at++;
            expect(snapshotText(g)).toBe(states[at]);
            continue;
          }
          if (changed) {
            states = states.slice(0, at + 1);
            states.push(snapshotText(g));
            at++;
          }
          expect(snapshotText(g)).toBe(states[at]);
          expect(g.canUndo()).toBe(at > 0);
          expect(g.canRedo()).toBe(at < states.length - 1);
        }
        while (g.undo()) { /* back to the start */ }
        expect(snapshotText(g)).toBe(states[0]);
        while (g.redo()) { /* and forward again */ }
        expect(snapshotText(g)).toBe(states[states.length - 1]);
      });
    });

    it('a new action clears the redo stack; reset forgets the history', function () {
      ready();
      var r = realResult('classic9', 'normal', 3);
      var g = newGame(r);
      var open = openCells(r);
      g.setValue(open[0], 1);
      g.setValue(open[1], 2);
      g.undo();
      expect(g.canRedo()).toBe(true);
      g.setValue(open[2], 3);
      expect(g.canRedo()).toBe(false);
      g.toggleNote(open[3], 4);
      g.reset();
      expect(g.canUndo()).toBe(false);
      expect(g.canRedo()).toBe(false);
      expect(g.progress().filled).toBe(0);
      expect(g.getNotes(open[3])).toBe(0);
      expect(g.timerState().started).toBe(false);
      expect(g.status()).toBe('idle');
    });

    it('notifies subscribers of every change with the cells it touched', function () {
      ready();
      var r = realResult('classic9', 'normal', 3);
      var g = newGame(r);
      var events = [];
      var off = g.subscribe(function (e) { events.push(e); });
      var c = openCells(r)[0];
      g.setValue(c, 9);
      g.toggleNote(openCells(r)[1], 2);
      g.undo();
      g.redo();
      expect(events.map(function (e) { return e.type; })).toEqual(['set', 'note', 'undo', 'redo']);
      expect(events[0].cells).toContain(c);
      expect(events[0].values).toBe(true);
      expect(events[1].values).toBe(false);
      off();
      g.undo();
      expect(events.length).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Conflicts, mistakes, progress and completion
  // ---------------------------------------------------------------------------------------------

  describe('play: rule conflicts and mistakes', function () {
    it('flags the same digit twice in a row, column or box, clues included, and nothing else', function () {
      ready();
      ['classic9', 'jigsaw9', 'diagonalX', 'hyper'].forEach(function (id) {
        var r = realResult(id, 'easy', 6);
        var g = newGame(r);
        expect(g.conflicts().cells).toEqual([]);
        var model = r.model;
        for (var u = 0; u < 4; u++) {
          var cells = Array.from(model.units[u * 5 % model.units.length]);
          var open = cells.filter(function (c) { return r.givens[c] === 0; });
          if (open.length < 2) continue;
          var used = cells.map(function (c) { return g.getValue(c); });
          var v = 1;
          while (used.indexOf(v) !== -1 && v < model.digits) v++;
          g.setValue(open[0], v);
          g.setValue(open[1], v);
          var flagged = g.conflicts().cells;
          expect(flagged).toEqual(referenceUnitConflicts(g));
          expect(flagged).toContain(open[0]);
          expect(flagged).toContain(open[1]);
          g.undo();
          g.undo();
        }
        expect(g.conflicts().cells).toEqual([]);
      });
    });

    it('flags a user entry that repeats a clue and names the unit', function () {
      ready();
      var r = realResult('classic9', 'easy', 6);
      var g = newGame(r);
      var model = r.model;
      var clue = r.givens.findIndex(function (v) { return v > 0; });
      var mate = Array.from(model.peers[clue]).filter(function (p) { return r.givens[p] === 0; })[0];
      g.setValue(mate, r.givens[clue]);
      var found = g.conflicts();
      expect(found.cells).toContain(clue);
      expect(found.cells).toContain(mate);
      expect(found.units.length).toBeGreaterThan(0);
      expect(found.units.every(function (u) {
        return Array.from(model.units[u]).indexOf(mate) !== -1 || Array.from(model.units[u]).indexOf(clue) !== -1;
      })).toBe(true);
    });

    it('flags cells that share a unit of another grid of a Samurai, not only the first grid', function () {
      ready();
      var r = realResult('samurai', 'veryEasy', 3);
      var g = newGame(r);
      var model = r.model;
      var shared = -1;
      for (var c = 0; c < model.cellCount && shared < 0; c++) {
        if (model.cellUnits[c].length >= 6 && r.givens[c] === 0) shared = c;
      }
      expect(shared).toBeGreaterThanOrEqual(0);
      var units = Array.from(model.cellUnits[shared]);
      var checked = 0;
      units.forEach(function (u) {
        var mates = Array.from(model.units[u]).filter(function (x) {
          return x !== shared && r.givens[x] === 0 && g.getValue(x) === 0;
        });
        if (mates.length === 0) return;
        var used = {};
        Array.from(model.units[u]).forEach(function (x) { used[g.getValue(x)] = true; });
        Array.from(model.cellUnits[shared]).forEach(function (w) {
          Array.from(model.units[w]).forEach(function (x) { used[g.getValue(x)] = true; });
        });
        var v = 1;
        while (used[v] && v < 9) v++;
        if (used[v]) return;
        g.setValue(shared, v);
        g.setValue(mates[0], v);
        var flagged = g.conflicts().cells;
        expect(flagged).toContain(shared);
        expect(flagged).toContain(mates[0]);
        expect(flagged).toEqual(referenceUnitConflicts(g));
        g.undo();
        g.undo();
        checked++;
      });
      expect(checked).toBeGreaterThanOrEqual(3);
    });

    it('Killer: flags a repeated digit in a cage and cage sums that can no longer be reached', function () {
      ready();
      var r = realResult('killer', 'easy', 2);
      var model = r.model;
      var tested = 0;
      model.cages.forEach(function (cage, k) {
        var cells = Array.from(cage.cells);
        if (tested >= 12 || cells.length < 2 || cells.some(function (c) { return r.givens[c] > 0; })) return;
        var g = newGame(r);
        // The right value never flags the cage.
        g.setValue(cells[0], r.solution[cells[0]]);
        expect(g.conflicts().cages).not.toContain(k);
        g.undo();
        // A value that no completion of the cage can use is flagged, and only the cage cells carry it.
        for (var v = 1; v <= 9; v++) {
          var feasible = false;
          (function search(i, sum, used) {
            if (feasible) return;
            if (i === cells.length) { feasible = sum === cage.sum; return; }
            for (var d = 1; d <= 9; d++) {
              if (i === 0 && d !== v) continue;
              if (used & (1 << d)) continue;
              search(i + 1, sum + d, used | (1 << d));
            }
          })(0, 0, 0);
          g.setValue(cells[0], v);
          var flagged = g.conflicts();
          if (flagged.cages.indexOf(k) !== -1) expect(feasible).toBe(false);
          if (!feasible && v === 1 + (cage.sum > 9 ? 0 : cage.sum - 1)) expect(flagged.cages).toContain(k);
          g.undo();
        }
        tested++;
      });
      expect(tested).toBeGreaterThanOrEqual(3);
      // A repeated digit and a complete cage with the wrong sum.
      var pair = model.cages.filter(function (c) {
        return c.cells.length >= 2 && Array.from(c.cells).every(function (x) { return r.givens[x] === 0; });
      })[0];
      var g2 = newGame(r);
      g2.setValue(pair.cells[0], 4);
      g2.setValue(pair.cells[1], 4);
      var dup = g2.conflicts();
      expect(dup.cages.length).toBeGreaterThan(0);
      expect(dup.cells).toContain(pair.cells[0]);
      expect(dup.cells).toContain(pair.cells[1]);
    });

    it('Killer: a complete cage with the right sum is quiet, with a wrong sum it is flagged', function () {
      ready();
      var r = realResult('killer', 'easy', 2);
      var cage = r.model.cages.filter(function (c) {
        return c.cells.length === 2 && Array.from(c.cells).every(function (x) { return r.givens[x] === 0; });
      })[0];
      if (!cage) SG.test.skip('no free two-cell cage in this puzzle');
      var g = newGame(r);
      g.setValue(cage.cells[0], r.solution[cage.cells[0]]);
      g.setValue(cage.cells[1], r.solution[cage.cells[1]]);
      expect(g.conflicts().cages).not.toContain(r.model.cages.indexOf(cage));
      g.setValue(cage.cells[1], r.solution[cage.cells[1]] === 9 ? 8 : r.solution[cage.cells[1]] + 1);
      expect(g.conflicts().cages).toContain(r.model.cages.indexOf(cage));
      expect(g.conflicts().cells).toContain(cage.cells[0]);
    });

    it('Greater-Than: flags a sign that is not satisfied, and a digit that cannot satisfy it', function () {
      ready();
      var r = realResult('greaterThan', 'normal', 2);
      var model = r.model;
      var q = model.inequalities.findIndex(function (s) { return r.givens[s.a] === 0 && r.givens[s.b] === 0; });
      expect(q).toBeGreaterThanOrEqual(0);
      var sign = model.inequalities[q];
      var g = newGame(r);
      g.setValue(sign.a, r.solution[sign.a]);
      g.setValue(sign.b, r.solution[sign.b]);
      expect(g.conflicts().signs).not.toContain(q);
      g.undo();
      g.undo();
      g.setValue(sign.a, model.digits);
      var alone = g.conflicts();
      expect(alone.signs).toContain(q);
      expect(alone.cells).toContain(sign.a);
      g.setValue(sign.b, 1);
      var both = g.conflicts();
      expect(both.signs).toContain(q);
      expect(both.cells).toContain(sign.a);
      expect(both.cells).toContain(sign.b);
      g.undo();
      g.setValue(sign.b, 2);
      expect(g.conflicts().signs).toContain(q);
    });

    it('lists the entries that differ from the solution and counts the progress', function () {
      ready();
      var r = realResult('classic9', 'normal', 3);
      var g = newGame(r);
      var open = openCells(r);
      var p0 = g.progress();
      expect(p0.total).toBe(open.length);
      expect(p0.givens).toBe(81 - open.length);
      expect(p0.filled).toBe(0);
      expect(p0.percent).toBe(0);
      g.setValue(open[0], r.solution[open[0]]);
      g.setValue(open[1], r.solution[open[1]] % 9 + 1);
      g.setValue(open[2], r.solution[open[2]]);
      expect(g.wrongCells()).toEqual([open[1]]);
      var p = g.progress();
      expect(p.filled).toBe(3);
      expect(p.correct).toBe(2);
      expect(p.wrong).toBe(1);
      expect(p.remaining).toBe(open.length - 2);
      var res = g.check();
      expect(res.wrong).toEqual([open[1]]);
      expect(res.ok).toBe(false);
      expect(res.filled).toBe(3);
      expect(res.complete).toBe(false);
      expect(g.counters().checks).toBe(1);
      g.clearValue(open[1]);
      expect(g.check().ok).toBe(true);
    });

    it('a complete correct solution is never flagged on the way, for every kind of puzzle', function () {
      ready();
      [['classic4', 'easy', 1], ['classic6', 'easy', 2], ['classic9', 'hard', 2], ['killer', 'normal', 3],
        ['greaterThan', 'normal', 3], ['jigsaw9', 'normal', 2], ['mega12', 'easy', 1], ['diagonalX', 'easy', 2],
        ['wordoku', 'easy', 2], ['samurai', 'veryEasy', 2], ['flower', 'veryEasy', 1]].forEach(function (cfg) {
        var r = realResult(cfg[0], cfg[1], cfg[2]);
        var g = newGame(r);
        var cells = openCells(r);
        var solvedEvents = 0;
        g.subscribe(function (e) { if (e.type === 'solved') solvedEvents++; });
        for (var k = 0; k < cells.length; k++) {
          expect(g.isSolved()).toBe(false);
          g.setValue(cells[k], r.solution[cells[k]]);
          if (k % 7 === 0 || k === cells.length - 1) expect(g.conflicts().cells).toEqual([]);
        }
        expect(g.isSolved()).toBe(true);
        expect(g.status()).toBe('solved');
        expect(g.wrongCells()).toEqual([]);
        expect(g.progress().percent).toBe(100);
        expect(solvedEvents).toBe(1);
        if (r.model.layout.overlays.some(function (o) { return o.kind === 'wordLine'; })) {
          var full = Array.from(r.givens).map(function (v, i) { return v || g.userValue(i); });
          expect(SG.modelAids.isWordSolved(r.model, full)).toBe(true);
        }
      });
    });

    it('does not report a wrong full grid as solved, and undo after the last cell re-opens the game', function () {
      ready();
      var r = realResult('classic9', 'easy', 4);
      var g = newGame(r);
      var cells = openCells(r);
      enterSolution(g, r, cells.length - 1);
      var last = cells[cells.length - 1];
      g.setValue(last, r.solution[last] % 9 + 1);
      expect(g.isSolved()).toBe(false);
      expect(g.status()).toBe('playing');
      g.setValue(last, r.solution[last]);
      expect(g.isSolved()).toBe(true);
      g.undo();
      expect(g.isSolved()).toBe(false);
      g.redo();
      expect(g.isSolved()).toBe(true);
    });

    it('reveals a cell (the selected one, else the easiest) and the whole solution without a success', function () {
      ready();
      var r = realResult('classic9', 'normal', 3);
      var g = newGame(r);
      var open = openCells(r);
      var shown = g.revealCell(open[5]);
      expect(shown).toEqual({ cell: open[5], value: r.solution[open[5]] });
      expect(g.userValue(open[5])).toBe(r.solution[open[5]]);
      var auto = g.revealCell();
      expect(auto.cell).not.toBe(open[5]);
      expect(auto.value).toBe(r.solution[auto.cell]);
      expect(g.revealCell(r.givens.findIndex(function (v) { return v > 0; })).cell).not.toBe(-1);
      expect(g.counters().reveals).toBe(3);
      expect(g.revealSolution()).toBe(true);
      expect(g.isSolved()).toBe(true);
      expect(g.status()).toBe('gaveUp');
      expect(g.timerState().running).toBe(false);
      g.undo();
      expect(g.isSolved()).toBe(false);
      expect(g.status()).toBe('playing');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------------------------

  describe('play: timer', function () {
    it('starts on the first entry, pauses and resumes, and stops when the puzzle is solved', function () {
      ready();
      var r = realResult('classic4', 'easy', 2);
      var t = 0;
      var g = newGame(r, { now: function () { return t; } });
      var cells = openCells(r);
      expect(g.timerState()).toEqual({ started: false, running: false, paused: false, pausedBy: null, elapsedMs: 0 });
      t = 1000;
      expect(g.elapsedMs()).toBe(0);
      expect(g.pauseTimer('user')).toBe(false);
      g.setValue(cells[0], r.solution[cells[0]]);
      expect(g.timerState().started).toBe(true);
      expect(g.timerState().running).toBe(true);
      t = 4000;
      expect(g.elapsedMs()).toBe(3000);
      expect(g.pauseTimer('user')).toBe(true);
      t = 9000;
      expect(g.elapsedMs()).toBe(3000);
      expect(g.timerState()).toEqual({ started: true, running: false, paused: true, pausedBy: 'user',
        elapsedMs: 3000 });
      expect(g.resumeTimer('auto')).toBe(false);
      expect(g.resumeTimer('user')).toBe(true);
      t = 10000;
      expect(g.elapsedMs()).toBe(4000);
      expect(g.pauseTimer('auto')).toBe(true);
      t = 20000;
      expect(g.timerState().pausedBy).toBe('auto');
      expect(g.resumeTimer('auto')).toBe(true);
      t = 21000;
      expect(g.elapsedMs()).toBe(5000);
      enterSolution(g, r);
      var done = g.elapsedMs();
      expect(g.isSolved()).toBe(true);
      expect(g.timerState().running).toBe(false);
      t = 99000;
      expect(g.elapsedMs()).toBe(done);
      expect(g.resumeTimer('user')).toBe(false);
      // Undoing the last cell re-opens the game and the clock runs again.
      g.undo();
      expect(g.timerState().running).toBe(true);
      t = 100000;
      expect(g.elapsedMs()).toBe(done + 1000);
    });

    it('startTimer starts the clock of a game nobody played, once, and a reset makes it idle again', function () {
      ready();
      var r = realResult('classic4', 'easy', 2);
      var t = 10;
      var g = newGame(r, { now: function () { return t; } });
      expect(g.startTimer()).toBe(true);
      expect(g.status()).toBe('playing');
      expect(g.startTimer()).toBe(false);
      t = 2010;
      expect(g.elapsedMs()).toBe(2000);
      g.reset();
      expect(g.status()).toBe('idle');
      expect(g.timerState().started).toBe(false);
      expect(g.startTimer()).toBe(true);
    });

    it('notes and clues do not matter for the clock: any first entry starts it, a check does not', function () {
      ready();
      var r = realResult('classic4', 'easy', 2);
      var t = 50;
      var g = newGame(r, { now: function () { return t; } });
      g.check();
      g.hint();
      expect(g.timerState().started).toBe(false);
      g.toggleNote(openCells(r)[0], 1);
      expect(g.timerState().started).toBe(true);
    });

    it('keeps its time when the game is saved and restored (the clock comes back paused)', function () {
      ready();
      var r = realResult('classic4', 'easy', 2);
      var t = 0;
      var g = newGame(r, { now: function () { return t; } });
      g.setValue(openCells(r)[0], r.solution[openCells(r)[0]]);
      t = 7000;
      var data = JSON.parse(JSON.stringify(g.serialize()));
      t = 500000;
      var back = P.restoreGame(r.model, r.givens, r.solution, data, { now: function () { return t; } });
      expect(back.timerState().running).toBe(false);
      expect(back.timerState().pausedBy).toBe('auto');
      expect(back.elapsedMs()).toBe(7000);
      expect(back.resumeTimer('auto')).toBe(true);
      t = 501000;
      expect(back.elapsedMs()).toBe(8000);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Hints
  // ---------------------------------------------------------------------------------------------

  /** Follows the hints of a puzzle, applying each, and checks every one against the solution. */
  function walkHints(result, maxHints, onHint) {
    var g = newGame(result);
    var out = { steps: 0, techniques: {}, kinds: {}, stopped: null, game: g, keys: {} };
    var guard = 0;
    while (!g.isSolved() && out.steps < maxHints && guard++ < 3000) {
      var h = g.hint();
      if (!h.ok) {
        out.stopped = h.reason;
        break;
      }
      expect(h.level).toBe(1);
      var h2 = g.hint();
      var h3 = g.hint();
      expect(h2.level).toBe(2);
      expect(h3.level).toBe(3);
      expect(g.hint().level).toBe(3);
      expect(g.currentHint().level).toBe(3);
      h3.placements.forEach(function (p) {
        expect(result.solution[p[0]]).toBe(p[1]);
        expect(result.givens[p[0]]).toBe(0);
      });
      h3.eliminations.forEach(function (e) {
        expect(result.solution[e[0]]).not.toBe(e[1]);
      });
      expect(h3.placements.length + h3.eliminations.length).toBeGreaterThan(0);
      expect(h3.kind).toBe(h3.placements.length > 0 ? 'placement' : 'elimination');
      h3.cells.forEach(function (c) { expect(c >= 0 && c < result.model.cellCount).toBe(true); });
      h3.targets.forEach(function (c) { expect(c >= 0 && c < result.model.cellCount).toBe(true); });
      out.techniques[h3.technique] = (out.techniques[h3.technique] || 0) + 1;
      out.kinds[h3.kind] = (out.kinds[h3.kind] || 0) + 1;
      out.keys[h3.stepKey] = h3.nameKey;
      if (onHint) onHint(h3, g);
      expect(g.applyHint()).toBe(true);
      out.steps++;
    }
    return out;
  }

  var HINT_SAMPLE = [
    ['classic9', 'veryEasy', 1, 60], ['classic9', 'easy', 2, 60], ['classic9', 'normal', 3, 60],
    ['classic9', 'hard', 4, 60], ['classic9', 'master', 5, 60], ['classic6', 'hard', 1, 40],
    ['classic4', 'easy', 2, 40], ['killer', 'easy', 3, 30], ['greaterThan', 'normal', 2, 40],
    ['jigsaw9', 'normal', 3, 50], ['diagonalX', 'hard', 2, 40], ['hyper', 'hard', 2, 40],
    ['mega12', 'easy', 2, 30], ['mega16', 'veryEasy', 1, 15], ['wordoku', 'normal', 2, 40],
    ['samurai', 'easy', 2, 12], ['sohei', 'easy', 2, 12], ['butterfly', 'veryEasy', 2, 12],
    ['flower', 'easy', 2, 12]
  ];

  describe('play: hints', function () {
    var allKeys = {};

    HINT_SAMPLE.forEach(function (cfg) {
      it('every hint of ' + cfg[0] + ' ' + cfg[1] + ' (seed ' + cfg[2] + ') agrees with the solution', function () {
        ready();
        var r;
        try {
          r = realResult(cfg[0], cfg[1], cfg[2]);
        } catch (err) {
          SG.test.skip('cannot generate ' + cfg[0] + ' ' + cfg[1] + ': ' + err.message);
        }
        var walk = walkHints(r, cfg[3]);
        expect(walk.steps).toBeGreaterThan(0);
        // A puzzle the logical solver can finish is solved by following the hints; a longer one is cut off.
        if (walk.steps < cfg[3]) expect(walk.game.isSolved()).toBe(true);
        Object.keys(walk.keys).forEach(function (k) { allKeys[k] = walk.keys[k]; });
        expect(walk.game.conflicts().cells).toEqual([]);
      });
    });

    it('has a translated name, description and step text for every technique the hints used, in both packs',
      function () {
        ready();
        var keys = Object.keys(allKeys);
        expect(keys.length).toBeGreaterThan(5);
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            keys.forEach(function (stepKey) {
              var nameKey = allKeys[stepKey];
              expect(SG.i18n.has(stepKey)).toBe(true);
              expect(SG.i18n.has(nameKey)).toBe(true);
              expect(SG.i18n.has(nameKey + '.desc')).toBe(true);
              expect(SG.i18n.t(nameKey)).not.toBe(nameKey);
            });
          });
        });
      });

    it('describes a hint in words, in English and Vietnamese, with no placeholder left over', function () {
      ready();
      var r = realResult('classic9', 'hard', 4);
      var seen = 0;
      var walk = walkHints(r, 80, function (h) {
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            var d = P.describeHint(r.model, h, { mode: 'digits' });
            expect(d.ok).toBe(true);
            ['title', 'region', 'cells', 'action', 'explanation'].forEach(function (field) {
              expect(typeof d[field]).toBe('string');
              expect(d[field].length).toBeGreaterThan(0);
              expect(d[field]).not.toMatch(/\{\w+\}|undefined|play\.hint|technique\./);
            });
            expect(d.title).toBe(SG.i18n.t(h.nameKey));
            expect(d.description).toBe(SG.i18n.t(h.descKey));
            var cell = SG.model.cellLabel(r.model, h.targets[0]);
            expect(d.action).toContain(cell);
          });
        });
        seen++;
      });
      expect(seen).toBeGreaterThan(5);
      expect(walk.game.isSolved()).toBe(true);
    });

    it('names the region of a hidden single and of a pair, and the cage of a Killer cage hint', function () {
      ready();
      var seenRegion = {};
      [['classic9', 'hard', 4], ['classic9', 'master', 5], ['killer', 'hard', 4], ['jigsaw9', 'normal', 3]]
        .forEach(function (cfg) {
          var r = realResult(cfg[0], cfg[1], cfg[2]);
          walkHints(r, 60, function (h) {
            if (h.region === null) return;
            seenRegion[h.region.kind] = true;
            expect(typeof h.region.label).toBe('string');
            expect(h.region.cells.length).toBeGreaterThan(0);
            h.region.cells.forEach(function (c) { expect(c >= 0 && c < r.model.cellCount).toBe(true); });
            if (h.technique === 'hiddenSingleBox' || h.technique === 'hiddenSingleLine') {
              expect(h.region.cells).toContain(h.placements[0][0]);
              expect(h.region.label).toBe(h.stepArgs.unit);
            }
            if (h.region.kind !== 'cage') expect(SG.i18n.has('unitKind.' + h.region.kind)).toBe(true);
          });
        });
      expect(Object.keys(seenRegion).length).toBeGreaterThanOrEqual(2);
    });

    it('never suggests a wrong value, even with wrong entries on the board, and says it ignored them', function () {
      ready();
      var r = realResult('classic9', 'normal', 3);
      var fresh = newGame(r);
      var base = fresh.hint();
      var g = newGame(r);
      var open = openCells(r);
      // A wrong entry that breaks no rule, and one that does.
      var quiet = open[3];
      var loud = open[10];
      g.setValue(quiet, r.solution[quiet] % 9 + 1);
      g.setValue(loud, r.solution[open[11]] === r.solution[loud] ? r.solution[loud] % 9 + 1 : r.solution[open[11]]);
      var wrong = g.wrongCells().length;
      expect(wrong).toBeGreaterThanOrEqual(1);
      var h = g.hint();
      expect(h.ok).toBe(true);
      expect(h.ignored).toBe(wrong);
      expect(h.technique).toBe(base.technique);
      expect(h.placements).toEqual(base.placements);
      for (var k = 0; k < 30 && !g.isSolved(); k++) {
        var cur = g.hint();
        if (!cur.ok) break;
        cur.placements.forEach(function (p) { expect(r.solution[p[0]]).toBe(p[1]); });
        cur.eliminations.forEach(function (e) { expect(r.solution[e[0]]).not.toBe(e[1]); });
        expect(cur.ignored).toBe(g.wrongCells().length);
        g.applyHint();
      }
      var text = P.describeHint(r.model, g.hint(), {});
      var stillWrong = g.wrongCells().length;
      if (text.ok && stillWrong > 0) expect(text.ignored).toContain(String(stillWrong));
      if (text.ok && stillWrong === 0) expect(text.ignored).toBe('');
    });

    it('uses the correct entries of the player: the hint after an entry is the next step of the grid', function () {
      ready();
      var r = realResult('classic9', 'normal', 3);
      var g = newGame(r);
      var first = g.hint();
      expect(first.kind).toBe('placement');
      g.hint();
      g.hint();
      expect(g.currentHint().level).toBe(3);
      g.setValue(first.placements[0][0], first.placements[0][1]);
      expect(g.currentHint()).toBeNull();
      var next = g.hint();
      expect(next.ok).toBe(true);
      expect(next.level).toBe(1);
      expect(next.placements.length === 0 || next.placements[0][0] !== first.placements[0][0]).toBe(true);
      // The same grid reached by applying the hint gives the same next hint.
      var other = newGame(r);
      other.hint();
      other.applyHint();
      expect(other.hint().placements).toEqual(next.placements);
    });

    it('walks an elimination plan with nextHintStep and remembers an applied elimination', function () {
      ready();
      var found = null;
      [['classic9', 'hard', 4], ['classic9', 'master', 5], ['classic9', 'hard', 7], ['classic9', 'master', 8],
        ['diagonalX', 'hard', 2]].forEach(function (cfg) {
        if (found !== null) return;
        var r = realResult(cfg[0], cfg[1], cfg[2]);
        var g = newGame(r);
        for (var k = 0; k < 80 && found === null && !g.isSolved(); k++) {
          var h = g.hint();
          if (!h.ok) return;
          if (h.kind === 'elimination') found = { r: r, g: g, hint: h };
          else g.applyHint();
        }
      });
      if (found === null) SG.test.skip('no elimination step in the sampled puzzles');
      var g = found.g;
      var key = JSON.stringify(found.hint.eliminations);
      g.hint();
      g.hint();
      var notesBefore = found.hint.eliminations.map(function (e) { return g.getNotes(e[0]); });
      expect(g.applyHint()).toBe(true);
      expect(g.currentHint()).toBeNull();
      expect(notesBefore.length).toBeGreaterThan(0);
      var after = g.hint();
      expect(after.ok).toBe(true);
      expect(after.level).toBe(1);
      expect(JSON.stringify(after.eliminations)).not.toBe(key);
      // The remembered eliminations survive a save and a restore.
      var back = P.restoreGame(found.r.model, found.r.givens, found.r.solution,
        JSON.parse(JSON.stringify(g.serialize())));
      var again = back.hint();
      expect(again.ok).toBe(true);
      expect(JSON.stringify(again.eliminations)).not.toBe(key);
      // Applying an elimination takes the candidate out of the notes that hold it.
      var noted = newGame(found.r);
      noted.fillNotes();
      var h = noted.hint();
      for (var guard = 0; guard < 80 && h.ok && h.kind !== 'elimination'; guard++) {
        noted.applyHint();
        h = noted.hint();
      }
      if (h.ok) {
        var gone = h.eliminations.filter(function (e) { return (noted.getNotes(e[0]) & (1 << (e[1] - 1))) !== 0; });
        noted.hint();
        noted.hint();
        noted.applyHint();
        gone.forEach(function (e) { expect(noted.getNotes(e[0]) & (1 << (e[1] - 1))).toBe(0); });
        noted.undo();
        gone.forEach(function (e) { expect(noted.getNotes(e[0]) & (1 << (e[1] - 1))).not.toBe(0); });
      }
    });

    it('steps through the plan: Next step moves on, the last step has no next, the step numbers add up',
      function () {
        ready();
        var r = realResult('classic9', 'hard', 4);
        var g = newGame(r);
        var first = g.hint();
        expect(first.step).toBe(0);
        expect(first.steps).toBeGreaterThan(3);
        var second = g.nextHintStep();
        expect(second.ok).toBe(true);
        expect(second.step).toBe(1);
        expect(second.level).toBe(1);
        expect(second.steps).toBe(first.steps);
        var last = second;
        for (var k = 0; k < first.steps; k++) {
          var n = g.nextHintStep();
          if (!n.ok) break;
          last = n;
          n.placements.forEach(function (p) { expect(r.solution[p[0]]).toBe(p[1]); });
        }
        expect(last.step).toBe(first.steps - 1);
        expect(g.nextHintStep()).toEqual({ ok: false, reason: 'stuck', ignored: 0 });
      });

    it('is honest when no logical step exists: a nearly empty grid gives "stuck", and one cell can be revealed',
      function () {
        ready();
        var r = realResult('classic9', 'easy', 2);
        var sparse = new Int32Array(81);
        for (var i = 0; i < 6; i++) sparse[i * 13 % 81] = r.solution[i * 13 % 81];
        var g = P.createGame(r.model, sparse, r.solution);
        var h = g.hint();
        expect(h).toEqual({ ok: false, reason: 'stuck', ignored: 0 });
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            var d = P.describeHint(r.model, h, {});
            expect(d.ok).toBe(false);
            expect(d.text).toBe(SG.i18n.t('play.hint.stuck'));
            expect(d.text).not.toBe('play.hint.stuck');
          });
        });
        var shown = g.revealCell();
        expect(g.userValue(shown.cell)).toBe(r.solution[shown.cell]);
        expect(g.counters().reveals).toBe(1);
      });

    it('says there is nothing to hint on a solved grid, and a failing solver is reported, not thrown', function () {
      ready();
      var r = realResult('classic4', 'easy', 2);
      var g = newGame(r);
      enterSolution(g, r);
      expect(g.hint()).toEqual({ ok: false, reason: 'solved', ignored: 0 });
      expect(g.applyHint()).toBe(false);
      expect(P.describeHint(r.model, g.currentHint(), {}).text).toBe(SG.i18n.t('play.hint.solved'));
      var broken = newGame(r);
      var original = SG.logicalSolver.solve;
      SG.logicalSolver.solve = function () { throw new Error('boom'); };
      try {
        expect(broken.hint()).toEqual({ ok: false, reason: 'unavailable', ignored: 0 });
      } finally {
        SG.logicalSolver.solve = original;
      }
    });

    it('counts a hint once per step, however many levels are shown', function () {
      ready();
      var r = realResult('classic9', 'normal', 3);
      var g = newGame(r);
      g.hint();
      g.hint();
      g.hint();
      expect(g.counters().hints).toBe(1);
      g.nextHintStep();
      expect(g.counters().hints).toBe(2);
      g.clearHint();
      expect(g.currentHint()).toBeNull();
    });

    it('switches on the lazy cage and sign propagation before it solves (an imported puzzle)', function () {
      ready();
      var cage = realResult('killer', 'easy', 3);
      var sign = realResult('greaterThan', 'normal', 2);
      var listed = SG.constraints.listExtensions().slice();
      SG.comboTable.disablePropagation();
      var signId = null;
      listed.forEach(function (id) {
        if (signId === null && SG.constraints.unregisterExtension(id) && SG.ineq.ensureExtension()) signId = id;
      });
      expect(signId).not.toBeNull();
      SG.constraints.unregisterExtension(signId);
      try {
        var gk = newGame(cage);
        expect(gk.hint().ok).toBe(true);
        expect(SG.comboTable.enablePropagation('killer')).toBe(false);
        var gs = newGame(sign);
        expect(gs.hint().ok).toBe(true);
        expect(SG.ineq.ensureExtension()).toBe(false);
      } finally {
        listed.forEach(function (id) {
          if (SG.constraints.listExtensions().indexOf(id) === -1 && id === signId) SG.ineq.ensureExtension();
        });
        SG.comboTable.enablePropagation('killer');
        SG.ineq.ensureExtension();
      }
      expect(SG.constraints.listExtensions().slice().sort()).toEqual(listed.slice().sort());
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Saved state
  // ---------------------------------------------------------------------------------------------

  describe('play: saved state', function () {
    it('round trips through JSON: same entries, notes, history, counters and clock', function () {
      ready();
      var r = realResult('killer', 'easy', 2);
      var t = 0;
      var now = function () { return t; };
      var g = newGame(r, { now: now });
      var rng = SG.testkit.rng.create(77);
      var n = r.model.cellCount;
      for (var k = 0; k < 120; k++) {
        t += 100;
        var cell = rng.int(n);
        var v = 1 + rng.int(9);
        var kind = rng.int(8);
        if (kind < 4) g.setValue(cell, v);
        else if (kind === 4) g.toggleNote(cell, v);
        else if (kind === 5) g.erase(cell);
        else if (kind === 6) g.undo();
        else g.redo();
      }
      g.hint();
      g.hint();
      g.check();
      g.revealCell();
      var data = g.serialize();
      var text = JSON.stringify(data);
      expect(text.length).toBeGreaterThan(100);
      var back = P.restoreGame(r.model, r.givens, r.solution, JSON.parse(text), { now: now });
      expect(snapshotText(back)).toBe(snapshotText(g));
      var again = back.serialize();
      var ref = JSON.parse(text);
      expect(again.values).toEqual(ref.values);
      expect(again.notes).toEqual(ref.notes);
      expect(again.undo).toEqual(ref.undo);
      expect(again.redo).toEqual(ref.redo);
      expect(again.counters).toEqual(ref.counters);
      expect(again.timer.elapsed).toBe(ref.timer.elapsed);
      expect(back.counters()).toEqual(g.counters());
      expect(back.progress()).toEqual(g.progress());
      // The history is as exact as before: walk both back to the start together.
      var steps = 0;
      while (g.canUndo()) {
        expect(back.canUndo()).toBe(true);
        g.undo();
        back.undo();
        expect(snapshotText(back)).toBe(snapshotText(g));
        steps++;
      }
      expect(back.canUndo()).toBe(false);
      expect(steps).toBeGreaterThan(5);
      while (g.canRedo()) {
        g.redo();
        back.redo();
        expect(snapshotText(back)).toBe(snapshotText(g));
      }
    });

    it('restores a solved game as solved, with the clock stopped', function () {
      ready();
      var r = realResult('classic6', 'easy', 5);
      var g = newGame(r);
      enterSolution(g, r);
      var back = P.restoreGame(r.model, r.givens, r.solution, JSON.parse(JSON.stringify(g.serialize())));
      expect(back.isSolved()).toBe(true);
      expect(back.status()).toBe('solved');
      expect(back.timerState().running).toBe(false);
      expect(back.timerState().paused).toBe(false);
    });

    it('rejects data that does not belong to the puzzle', function () {
      ready();
      var r = realResult('classic9', 'easy', 2);
      var other = realResult('classic6', 'easy', 2);
      var g = newGame(r);
      g.setValue(openCells(r)[0], 1);
      var data = JSON.parse(JSON.stringify(g.serialize()));
      expect(function () { P.restoreGame(other.model, other.givens, other.solution, data); }).toThrow(TypeError);
      expect(function () { P.restoreGame(r.model, r.givens, r.solution, null); }).toThrow(TypeError);
      expect(function () { P.restoreGame(r.model, r.givens, r.solution, { v: 99 }); }).toThrow(TypeError);
      var onClue = JSON.parse(JSON.stringify(data));
      onClue.values[r.givens.findIndex(function (v) { return v > 0; })] = 3;
      expect(function () { P.restoreGame(r.model, r.givens, r.solution, onClue); }).toThrow(/clue/);
      var badNote = JSON.parse(JSON.stringify(data));
      badNote.notes[openCells(r)[1]] = 1 << 12;
      expect(function () { P.restoreGame(r.model, r.givens, r.solution, badNote); }).toThrow(TypeError);
      var badHistory = JSON.parse(JSON.stringify(data));
      badHistory.undo = [{ k: 'set', c: [[0, 1]] }];
      expect(function () { P.restoreGame(r.model, r.givens, r.solution, badHistory); }).toThrow(TypeError);
      expect(function () { P.createGame(r.model, r.givens.slice(0, 5), r.solution); }).toThrow(TypeError);
      expect(function () { P.createGame(r.model, r.givens, null); }).toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Strings, source and DOM layer
  // ---------------------------------------------------------------------------------------------

  describe('play: strings and the DOM layer', function () {
    it('has the same play.* keys in English and Vietnamese, with the same placeholders and no empty text',
      function () {
        ready();
        var en = SG.locales.en;
        var vi = SG.locales.vi;
        var enKeys = Object.keys(en).filter(function (k) { return k.indexOf('play.') === 0; }).sort();
        var viKeys = Object.keys(vi).filter(function (k) { return k.indexOf('play.') === 0; }).sort();
        expect(enKeys.length).toBeGreaterThan(60);
        expect(viKeys).toEqual(enKeys);
        enKeys.forEach(function (key) {
          expect(typeof en[key]).toBe('string');
          expect(en[key].trim().length).toBeGreaterThan(0);
          expect(vi[key].trim().length).toBeGreaterThan(0);
          expect(placeholders(vi[key])).toEqual(placeholders(en[key]));
        });
        expect(SG.i18n.conflicts.filter(function (c) { return c.key.indexOf('play.') === 0; })).toEqual([]);
      });

    it('keeps its keys out of the base packs and uses only keys that exist', function () {
      ready();
      var env = NODE;
      if (!env || !env.fs) SG.test.skip('needs the Node file system');
      var text = env.fs.readFileSync(env.path.join(env.root, 'js/ui/play.js'), 'utf8');
      var fragmentAt = text.indexOf('SG.localeFragments.push');
      var code = text.slice(0, fragmentAt);
      var used = {};
      (code.match(/'(play\.[A-Za-z0-9.]+)'/g) || []).forEach(function (q) { used[q.slice(1, -1)] = true; });
      ['off', 'conflicts', 'live'].forEach(function (m) { used['play.options.check.' + m] = true; });
      ['stuck', 'solved', 'unavailable'].forEach(function (m) { used['play.hint.' + m] = true; });
      ['notes', 'erase', 'undo', 'redo', 'hint', 'check'].forEach(function (m) {
        used['play.tool.' + m] = true;
        used['play.tool.' + m + '.title'] = true;
      });
      ['en', 'vi'].forEach(function (code2) {
        inLocale(code2, function () {
          Object.keys(used).forEach(function (key) {
            if (key === 'play.options.check.' || key === 'play.hint.' || key === 'play.tool.') return;
            expect(SG.i18n.has(key)).toBe(true);
          });
        });
      });
      expect(Object.keys(used).length).toBeGreaterThan(40);
    });

    it('does nothing without a page: init refuses, there is no game, attach and detach are harmless', function () {
      ready();
      if (typeof document !== 'undefined') SG.test.skip('this check needs an environment without a DOM');
      expect(P.init({ on: function () { return function () {}; } })).toBe(false);
      expect(P.init(null)).toBe(false);
      expect(P.isActive()).toBe(false);
      expect(P.getGame()).toBeNull();
      expect(P.attach(realResult('classic4', 'easy', 1))).toBeNull();
      expect(P.detach()).toBe(false);
      expect(P.getSymbolMode()).toBe('digits');
      expect(P.setSymbolMode('letters')).toBe(false);
      P.select(3);
      P.destroy();
    });

    it('exports the documented API', function () {
      ready();
      ['init', 'attach', 'detach', 'isActive', 'getGame', 'getSymbolMode', 'setSymbolMode', 'select', 'destroy', 'createGame', 'restoreGame',
        'describeHint', 'renderSnapshot', 'localizeArgs', 'groupEliminations', 'valueText', 'typedLabels', 'createKeyReader',
        'noteLayout', 'padLayout', 'cellAtPoint', 'moveSelection'].forEach(function (name) {
        expect(typeof P[name]).toBe('function');
      });
      expect(P.CHECK_MODES).toEqual(['off', 'conflicts', 'live']);
      expect(root.SG.store ? Array.from(root.SG.store.CHECK_MODES) : P.CHECK_MODES).toEqual(P.CHECK_MODES);
      var r = realResult('classic4', 'easy', 1);
      var g = newGame(r);
      ['getValue', 'userValue', 'isGiven', 'getNotes', 'snapshot', 'setValue', 'clearValue', 'erase', 'toggleNote',
        'fillNotes', 'undo', 'redo', 'canUndo', 'canRedo', 'reset', 'conflicts', 'wrongCells', 'check', 'progress',
        'isSolved', 'status', 'hint', 'nextHintStep', 'applyHint', 'clearHint', 'currentHint', 'revealCell',
        'revealSolution', 'startTimer', 'pauseTimer', 'resumeTimer', 'elapsedMs', 'timerState', 'subscribe', 'setOptions',
        'getOptions', 'counters', 'serialize'].forEach(function (name) {
        expect(typeof g[name]).toBe('function');
      });
    });

    it('play.css answers forced colours and keeps no style of the generator toggle', function () {
      ready();
      var env = NODE;
      if (!env || !env.fs) SG.test.skip('needs the Node file system');
      var css = env.fs.readFileSync(env.path.join(env.root, 'css/play.css'), 'utf8');
      expect(css).toContain('@media (forced-colors: active)');
      expect(css).not.toContain('play__toggle');
    });

    it('takes its preferences from the store: no storage key of its own', function () {
      ready();
      var env = NODE;
      if (!env || !env.fs) SG.test.skip('needs the Node file system');
      var text = env.fs.readFileSync(env.path.join(env.root, 'js/ui/play.js'), 'utf8');
      expect(/localStorage|sessionStorage|sg\.play\./.test(text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''))).toBe(false);
    });
  });
})();
