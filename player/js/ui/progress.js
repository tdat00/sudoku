/**
 * Saved progress: `SG.progress`, all through the safe storage of `SG.store`:
 *
 *   sg.player.progress.v1  { version, entries: [{ id, at, symbolMode, percent, solved, state }] }, LRU of
 *                          100; `state` is a `game.serialize()` cut to the last 300 undo and 100 redo steps
 *   sg.player.puzzles.v1   { version, entries: [{ id, at, doc }] }, LRU of 100: the imported documents (one
 *                          over 160 kB is not stored, the total stays under 900 kB). The recent list reads
 *                          variant, level and clues from the id and `doc`; a stored `meta` (older versions)
 *                          is ignored and dropped at the next write
 *   sg.player.last.v1      the id of the puzzle on the board (a reload without a fragment restores it)
 *
 * An id is `SG.importer.puzzleId(model, givens)`: same variant and clues = same puzzle. Anything that does
 * not fit (corrupt JSON, another `version`, an entry of the wrong shape) is dropped, never thrown; a full
 * storage evicts the least recently used entries and retries.
 *
 * `saveProgress` returns 'ok' | 'quota' | 'blocked' | 'invalid'; `savePuzzle` also 'tooLarge'.
 * `recent(limit?)` lists the puzzles newest added first (playing one does not move it). `clear()` removes
 * every key of the player except the preferences; `persistent()` is false while the storage is blocked or
 * full. `createProgress(storage?, now?)` takes a `SG.store.createStorage` and a clock in ms.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.progress && typeof SG.progress.createProgress === 'function') return;

  const VERSION = 1;
  const KEYS = Object.freeze({
    progress: 'sg.player.progress.v1',
    puzzles: 'sg.player.puzzles.v1',
    last: 'sg.player.last.v1'
  });
  const LIMITS = Object.freeze({
    progressEntries: 100,
    puzzleEntries: 100,
    docBytes: 160 * 1024,
    puzzlesBytes: 900 * 1024,
    undoSteps: 300,
    redoSteps: 100
  });

  const ID_PATTERN = /^[A-Za-z0-9]{3,24}-[0-9a-f]{16}$/;

  function validId(id) {
    return typeof id === 'string' && ID_PATTERN.test(id);
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function validProgressEntry(entry) {
    return isObject(entry) && validId(entry.id) && Number.isFinite(entry.at) &&
      typeof entry.symbolMode === 'string' && entry.symbolMode.length <= 16 &&
      Number.isInteger(entry.percent) && entry.percent >= 0 && entry.percent <= 100 &&
      typeof entry.solved === 'boolean' && isObject(entry.state);
  }

  function validPuzzleEntry(entry) {
    return isObject(entry) && validId(entry.id) && Number.isFinite(entry.at) && isObject(entry.doc);
  }

  function storedPuzzle(entry) {
    return { id: entry.id, at: entry.at, doc: entry.doc };
  }

  /** What the recent list shows of a stored document: variant, achieved level and number of clues. */
  function metaOf(id, doc) {
    const difficulty = isObject(doc.difficulty) ? doc.difficulty : null;
    const stats = isObject(doc.stats) ? doc.stats : null;
    return {
      variantId: id.slice(0, id.indexOf('-')),
      achieved: difficulty !== null && typeof difficulty.achieved === 'string' ? difficulty.achieved : null,
      clues: stats !== null && Number.isInteger(stats.clues) ? stats.clues : null
    };
  }

  function trimState(state) {
    const copy = Object.assign({}, state);
    if (Array.isArray(copy.undo) && copy.undo.length > LIMITS.undoSteps) {
      copy.undo = copy.undo.slice(copy.undo.length - LIMITS.undoSteps);
    }
    if (Array.isArray(copy.redo) && copy.redo.length > LIMITS.redoSteps) {
      copy.redo = copy.redo.slice(copy.redo.length - LIMITS.redoSteps);
    }
    return copy;
  }

  function byNewest(a, b) {
    return b.at - a.at;
  }

  function createProgress(backend, now) {
    const disk = backend || SG.store.storage();
    const clock = typeof now === 'function' ? now : function () { return Date.now(); };

    function readEntries(key, valid) {
      const raw = disk.getItem(key);
      if (raw === null) return [];
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        data = null;
      }
      if (!isObject(data) || data.version !== VERSION || !Array.isArray(data.entries)) {
        disk.removeItem(key);
        return [];
      }
      return data.entries.filter(valid).sort(byNewest);
    }

    /**
     * Writes a list; when the storage is full the oldest entry (never `keepId`) goes and it tries again.
     * `fits(entries, text)` lets a caller refuse a list that is too big.
     */
    function writeEntries(key, entries, keepId, fits) {
      let list = entries.slice();
      for (;;) {
        const text = JSON.stringify({ version: VERSION, entries: list });
        if (fits === undefined || fits(list, text)) {
          const status = disk.setItem(key, text);
          if (status !== 'quota') return status;
        }
        let drop = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].id !== keepId) {
            drop = i;
            break;
          }
        }
        if (drop < 0) return 'quota';
        list = list.slice(0, drop).concat(list.slice(drop + 1));
      }
    }

    function saveProgress(id, record) {
      const ok = validId(id) && isObject(record) && isObject(record.state) &&
        Number.isInteger(record.percent) && record.percent >= 0 && record.percent <= 100;
      if (!ok) return 'invalid';
      const entry = {
        id: id,
        at: clock(),
        symbolMode: typeof record.symbolMode === 'string' ? record.symbolMode.slice(0, 16) : 'digits',
        percent: record.percent,
        solved: record.solved === true,
        state: trimState(record.state)
      };
      const list = readEntries(KEYS.progress, validProgressEntry)
        .filter(function (e) { return e.id !== id; });
      list.unshift(entry);
      return writeEntries(KEYS.progress, list.slice(0, LIMITS.progressEntries), id);
    }

    function loadProgress(id) {
      if (!validId(id)) return null;
      const found = readEntries(KEYS.progress, validProgressEntry)
        .filter(function (e) { return e.id === id; });
      return found.length > 0 ? found[0] : null;
    }

    function removeProgress(id) {
      const list = readEntries(KEYS.progress, validProgressEntry);
      const rest = list.filter(function (e) { return e.id !== id; });
      if (rest.length !== list.length) writeEntries(KEYS.progress, rest, null);
    }

    function progressList() {
      return readEntries(KEYS.progress, validProgressEntry);
    }

    function readPuzzles() {
      return readEntries(KEYS.puzzles, validPuzzleEntry).map(storedPuzzle);
    }

    function savePuzzle(id, doc) {
      if (!validId(id) || !isObject(doc)) return 'invalid';
      let docText = '';
      try {
        docText = JSON.stringify(doc);
      } catch (err) {
        return 'invalid';
      }
      if (docText.length > LIMITS.docBytes) return 'tooLarge';
      // A puzzle keeps its place and the time it was first added: opening or saving it never moves it.
      const all = readPuzzles();
      const at = all.findIndex(function (e) { return e.id === id; });
      const entry = { id: id, at: at === -1 ? clock() : all[at].at, doc: JSON.parse(docText) };
      const list = all.slice();
      if (at === -1) list.unshift(entry);
      else list[at] = entry;
      return writeEntries(KEYS.puzzles, list.slice(0, LIMITS.puzzleEntries), id,
        function (entries, text) {
          return entries.length <= 1 || text.length <= LIMITS.puzzlesBytes;
        });
    }

    function loadPuzzle(id) {
      if (!validId(id)) return null;
      const found = readPuzzles().filter(function (e) { return e.id === id; });
      return found.length > 0 ? found[0] : null;
    }

    function removePuzzle(id) {
      const list = readPuzzles();
      const rest = list.filter(function (e) { return e.id !== id; });
      if (rest.length !== list.length) writeEntries(KEYS.puzzles, rest, null);
    }

    function recent(limit) {
      const max = limit > 0 ? limit : LIMITS.puzzleEntries;
      const progress = new Map();
      readEntries(KEYS.progress, validProgressEntry).forEach(function (e) { progress.set(e.id, e); });
      return readPuzzles().map(function (p) {
        const saved = progress.get(p.id);
        return {
          id: p.id,
          at: p.at,
          meta: metaOf(p.id, p.doc),
          percent: saved === undefined ? 0 : saved.percent,
          solved: saved !== undefined && saved.solved,
          hasProgress: saved !== undefined
        };
      }).sort(byNewest).slice(0, max);
    }

    function forget(id) {
      removeProgress(id);
      removePuzzle(id);
      if (getLast() === id) clearLast();
    }

    function setLast(id) {
      if (validId(id)) disk.setItem(KEYS.last, id);
    }

    function getLast() {
      const id = disk.getItem(KEYS.last);
      return validId(id) ? id : null;
    }

    function clearLast() {
      disk.removeItem(KEYS.last);
    }

    function clear() {
      [KEYS.progress, KEYS.puzzles, KEYS.last].forEach(function (key) { disk.removeItem(key); });
    }

    return {
      saveProgress: saveProgress,
      loadProgress: loadProgress,
      removeProgress: removeProgress,
      progressList: progressList,
      savePuzzle: savePuzzle,
      loadPuzzle: loadPuzzle,
      recent: recent,
      forget: forget,
      setLast: setLast,
      getLast: getLast,
      clearLast: clearLast,
      clear: clear,
      persistent: function persistent() { return disk.persistent(); }
    };
  }

  let shared = null;

  function instance() {
    if (shared === null) shared = createProgress();
    return shared;
  }

  SG.progress = {
    VERSION: VERSION,
    KEYS: KEYS,
    LIMITS: LIMITS,
    validId: validId,
    trimState: trimState,
    createProgress: createProgress,
    instance: instance
  };
})(typeof self !== 'undefined' ? self : globalThis);
