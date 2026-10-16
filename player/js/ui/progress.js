/**
 * Saved progress (design.md section 7): `SG.progress`. What the player keeps in the browser so that a reload or a
 * return visit carries on where the person was, all through the safe storage of `SG.store` (every access in
 * try / catch, blocked storage = memory for the session):
 *
 *   sg.player.progress.v1  { version, entries: [{ id, at, symbolMode, percent, solved, state }] }, LRU of 20;
 *                          `state` is a `game.serialize()` whose history is cut to the last 300 undo and 100
 *                          redo steps
 *   sg.player.puzzles.v1   { version, entries: [{ id, at, doc, meta }] }, LRU of 10; the opened documents
 *                          (a document over 160 kB is not stored, the total stays under 900 kB)
 *   sg.player.last.v1      the id of the puzzle on the board (a reload without a fragment restores it)
 *   sg.player.tour.v1      the first-visit tour was seen
 *
 * An id is `SG.importer.puzzleId(model, givens)`: the same variant and the same clues are the same puzzle, so
 * opening a puzzle again finds its progress. Anything that does not fit (corrupt JSON, another `version`, an
 * entry of the wrong shape) is dropped, never thrown; a full storage (`QuotaExceededError`) evicts the least
 * recently used entries and retries.
 *
 * PUBLIC API (`SG.progress`)
 *   KEYS, VERSION, LIMITS            the constants above
 *   validId(id)                      whether `id` looks like a puzzle id
 *   trimState(state)                 a copy of a saved game with the history cut to the limits
 *   createProgress(storage?, now?)   -> progress; `storage` from `SG.store.createStorage` (default: the shared
 *                                    one), `now()` a clock in ms (default Date.now)
 *   instance()                       the shared progress of the page
 * progress:
 *   saveProgress(id, { symbolMode, percent, solved, state }) -> 'ok' | 'quota' | 'blocked' | 'invalid'
 *   loadProgress(id) -> entry | null          removeProgress(id)          progressList() -> entries
 *   savePuzzle(id, doc, meta?) -> 'ok' | 'quota' | 'blocked' | 'tooLarge' | 'invalid'
 *   loadPuzzle(id) -> { id, at, doc, meta } | null      removePuzzle(id)
 *   recent(limit?) -> [{ id, at, meta, percent, solved, hasProgress }], the stored puzzles, newest first
 *   forget(id)                       the progress and the stored document of one puzzle
 *   setLast(id) / getLast() / clearLast()
 *   tourSeen() / markTourSeen()
 *   clear()                          every key of the player except the preferences
 *   persistent()                     false while the storage is blocked or full (memory only)
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads: the running page must survive.
  if (SG.progress && typeof SG.progress.createProgress === 'function') return;

  const VERSION = 1;
  const KEYS = Object.freeze({
    progress: 'sg.player.progress.v1',
    puzzles: 'sg.player.puzzles.v1',
    last: 'sg.player.last.v1',
    tour: 'sg.player.tour.v1'
  });
  const LIMITS = Object.freeze({
    progressEntries: 20,
    puzzleEntries: 10,
    docBytes: 160 * 1024,
    puzzlesBytes: 900 * 1024,
    undoSteps: 300,
    redoSteps: 100,
    metaBytes: 2048
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
    return isObject(entry) && validId(entry.id) && Number.isFinite(entry.at) && isObject(entry.doc) &&
      (entry.meta === null || isObject(entry.meta));
  }

  /**
   * A saved game with its history cut: the most recent steps stay (they are at the end of each stack).
   * @param {Object} state  `game.serialize()`.
   * @returns {Object} A shallow copy; `state` itself is untouched.
   */
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

  /**
   * @param {Object} [backend]  A storage from `SG.store.createStorage`; default: the shared one.
   * @param {function(): number} [now]
   * @returns {Object} The progress store, see the file header.
   */
  function createProgress(backend, now) {
    const disk = backend || SG.store.storage();
    const clock = typeof now === 'function' ? now : function () { return Date.now(); };

    /** The valid entries of a list key; a damaged or foreign value is removed. */
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

    // ---- progress ----------------------------------------------------------------------------------

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
      const list = readEntries(KEYS.progress, validProgressEntry).filter(function (e) { return e.id !== id; });
      list.unshift(entry);
      return writeEntries(KEYS.progress, list.slice(0, LIMITS.progressEntries), id);
    }

    function loadProgress(id) {
      if (!validId(id)) return null;
      const found = readEntries(KEYS.progress, validProgressEntry).filter(function (e) { return e.id === id; });
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

    // ---- opened puzzles ----------------------------------------------------------------------------

    function savePuzzle(id, doc, meta) {
      if (!validId(id) || !isObject(doc)) return 'invalid';
      let docText = '';
      try {
        docText = JSON.stringify(doc);
      } catch (err) {
        return 'invalid';
      }
      if (docText.length > LIMITS.docBytes) return 'tooLarge';
      let small = null;
      if (isObject(meta)) {
        const text = JSON.stringify(meta);
        small = text.length <= LIMITS.metaBytes ? JSON.parse(text) : null;
      }
      const list = readEntries(KEYS.puzzles, validPuzzleEntry).filter(function (e) { return e.id !== id; });
      list.unshift({ id: id, at: clock(), doc: JSON.parse(docText), meta: small });
      return writeEntries(KEYS.puzzles, list.slice(0, LIMITS.puzzleEntries), id,
        function (entries, text) {
          return entries.length <= 1 || text.length <= LIMITS.puzzlesBytes;
        });
    }

    function loadPuzzle(id) {
      if (!validId(id)) return null;
      const found = readEntries(KEYS.puzzles, validPuzzleEntry).filter(function (e) { return e.id === id; });
      return found.length > 0 ? found[0] : null;
    }

    function removePuzzle(id) {
      const list = readEntries(KEYS.puzzles, validPuzzleEntry);
      const rest = list.filter(function (e) { return e.id !== id; });
      if (rest.length !== list.length) writeEntries(KEYS.puzzles, rest, null);
    }

    function recent(limit) {
      const max = limit > 0 ? limit : LIMITS.puzzleEntries;
      const progress = new Map();
      readEntries(KEYS.progress, validProgressEntry).forEach(function (e) { progress.set(e.id, e); });
      return readEntries(KEYS.puzzles, validPuzzleEntry).map(function (p) {
        const saved = progress.get(p.id);
        return {
          id: p.id,
          at: saved === undefined ? p.at : Math.max(p.at, saved.at),
          meta: p.meta || null,
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

    // ---- the puzzle on the board, the tour -----------------------------------------------------------

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

    function tourSeen() {
      return disk.getItem(KEYS.tour) === '1';
    }

    function markTourSeen() {
      disk.setItem(KEYS.tour, '1');
    }

    function clear() {
      [KEYS.progress, KEYS.puzzles, KEYS.last, KEYS.tour].forEach(function (key) { disk.removeItem(key); });
    }

    return {
      saveProgress: saveProgress,
      loadProgress: loadProgress,
      removeProgress: removeProgress,
      progressList: progressList,
      savePuzzle: savePuzzle,
      loadPuzzle: loadPuzzle,
      removePuzzle: removePuzzle,
      recent: recent,
      forget: forget,
      setLast: setLast,
      getLast: getLast,
      clearLast: clearLast,
      tourSeen: tourSeen,
      markTourSeen: markTourSeen,
      clear: clear,
      persistent: function persistent() { return disk.persistent(); }
    };
  }

  let shared = null;

  /** @returns {Object} The progress store of the page (over the shared storage), created on first use. */
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
