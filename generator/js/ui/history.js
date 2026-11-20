/**
 * Puzzle history `SG.history`: every generated puzzle is added to a list kept in `localStorage` (key
 * `sg.history.v1`, newest first, at most 100) and shown in the left panel (`#history-root`). An entry holds
 * what the list and the export picker show (variant, level, seed, clues, score) and the configuration that
 * rebuilds the puzzle; its `id` (`keyOf`) is derived from those fields when the list is read, not stored.
 * An entry may also hold `ratingVersion`, the `rating.ratingVersion` of the result it was made from (a
 * positive integer, never the current version; it is display data, not part of the key or of the recipe). The
 * panel says "made by an earlier version" for an entry without it or with a smaller one than the current
 * `SG.difficulty.RATING_VERSION`, because no puzzle is stored, only its recipe.
 * Picking one regenerates it from its recipe with the current rating model (the result cache serves it at
 * once when it holds a compatible one); an entry made by an earlier version may give another puzzle.
 * `entryOf`, `keyOf` and `createList` are pure data/storage (no DOM; storage access is guarded, memory-only
 * when blocked). `init(app)` fills the panel and follows the app's 'result' and 'locale' events; `destroy()`
 * undoes it. Loads in Node: the DOM and `localStorage` are touched only inside functions.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.history && typeof SG.history.init === 'function') return;

  const STORAGE_KEY = 'sg.history.v1';
  const VERSION = 1;
  const LIMIT = 100;
  const STORED_FIELDS = Object.freeze(['variantId', 'requested', 'level', 'seed', 'clues', 'score',
    'symbolMode', 'symmetry', 'digOrder', 'maxAttempts', 'variantOptions', 'ratingVersion']);

  function isNum(x) {
    return typeof x === 'number' && isFinite(x);
  }

  // A rating version is a positive integer; anything else is no marker (it is never coerced or rounded).
  function isVersion(x) {
    return Number.isInteger(x) && x > 0;
  }

  function countClues(givens) {
    let n = 0;
    if (givens) for (let i = 0; i < givens.length; i++) if (givens[i] > 0) n++;
    return n;
  }

  function plainOptions(options) {
    const out = {};
    if (options !== null && typeof options === 'object') {
      Object.keys(options).forEach(function (name) {
        const value = options[name];
        if (typeof value === 'string' || typeof value === 'boolean' || isNum(value)) out[name] = value;
      });
    }
    return out;
  }

  /**
   * What makes a puzzle the same puzzle: variant and options, level, seed and dig settings (not the symbol
   * set).
   */
  function keyOf(config, seed) {
    const c = config || {};
    const options = plainOptions(c.variantOptions);
    const optionText = Object.keys(options).sort().map(function (name) { return name + '=' + options[name]; });
    return [c.variantId, c.difficulty, String(seed), c.symmetry, c.digOrder, c.maxAttempts,
      optionText.join('&')].join('|');
  }

  /**
   * Null for a result that cannot be rebuilt (no seed or configuration). `id` is derived when read (`idOf`).
   */
  function entryOf(result) {
    if (result === null || typeof result !== 'object' || !result.config) return null;
    const config = result.config;
    if (result.seed === undefined || result.seed === null || typeof config.variantId !== 'string') return null;
    const rating = result.rating || {};
    const requested = typeof config.difficulty === 'string' ? config.difficulty : rating.level;
    if (typeof requested !== 'string') return null;
    const entry = {
      variantId: config.variantId,
      requested: requested,
      level: typeof rating.level === 'string' ? rating.level : requested,
      seed: String(result.seed),
      clues: countClues(result.givens),
      score: isNum(rating.score) ? Math.round(rating.score) : 0,
      symbolMode: typeof config.symbolMode === 'string' ? config.symbolMode : undefined,
      symmetry: config.symmetry,
      digOrder: config.digOrder,
      maxAttempts: config.maxAttempts,
      variantOptions: plainOptions(config.variantOptions)
    };
    // The producer as the result states it: a missing or malformed version stays missing, never today's.
    if (isVersion(rating.ratingVersion)) entry.ratingVersion = rating.ratingVersion;
    return withId(entry);
  }

  function idOf(e) {
    return keyOf({ variantId: e.variantId, difficulty: e.requested, symmetry: e.symmetry,
      digOrder: e.digOrder, maxAttempts: e.maxAttempts, variantOptions: e.variantOptions }, e.seed);
  }

  function withId(e) {
    return Object.assign({ id: idOf(e) }, e);
  }

  // What is written: the entry without its `id` (derived when read); older `at` and `cells` fields go too,
  // and a rating version that is not a positive integer (the recipe stays).
  function storedEntry(e) {
    const out = {};
    STORED_FIELDS.forEach(function (name) {
      if (e[name] === undefined || (name === 'ratingVersion' && !isVersion(e[name]))) return;
      out[name] = e[name];
    });
    return out;
  }

  function validEntry(e) {
    return e !== null && typeof e === 'object' && typeof e.variantId === 'string' &&
      typeof e.requested === 'string' && typeof e.level === 'string' && typeof e.seed === 'string';
  }

  /** The store state that rebuilds the entry's puzzle (for `SG.app.generate`). */
  function overridesOf(entry) {
    const out = {
      variantId: entry.variantId,
      difficulty: entry.requested,
      seed: entry.seed,
      variantOptions: Object.assign({}, entry.variantOptions)
    };
    ['symbolMode', 'symmetry', 'digOrder', 'maxAttempts'].forEach(function (name) {
      if (entry[name] !== undefined && entry[name] !== null) out[name] = entry[name];
    });
    return out;
  }

  /**
   * Entries newest first, persisted as `{ version, entries }` under one storage key. Every operation re-reads
   * the stored list first (another tab may have changed it). Nothing throws; an unusable `storage` means
   * memory only.
   */
  function createList(options) {
    const o = options || {};
    const limit = Number.isInteger(o.limit) && o.limit > 0 ? o.limit : LIMIT;
    const key = typeof o.key === 'string' ? o.key : STORAGE_KEY;
    let memory = [];
    let persistent = false;
    let failed = false;

    function storage() {
      if (o.storage !== undefined) return o.storage;
      try {
        return root.localStorage || null;
      } catch (err) {
        return null;
      }
    }

    // An unreadable or unwritable storage leaves the list in memory for the rest of the session.
    function read() {
      const st = storage();
      if (st === null || st === undefined || failed) {
        persistent = false;
        return memory.slice();
      }
      try {
        const text = st.getItem(key);
        persistent = true;
        if (typeof text !== 'string') return [];
        const value = JSON.parse(text);
        if (value === null || typeof value !== 'object' || value.version !== VERSION ||
            !Array.isArray(value.entries)) {
          return [];
        }
        const seen = new Set();
        return value.entries.filter(validEntry).map(function (e) {
          return withId(storedEntry(e));
        }).filter(function (e) {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
      } catch (err) {
        persistent = false;
        return memory.slice();
      }
    }

    function write(entries) {
      memory = entries.slice();
      const st = storage();
      if (st === null || st === undefined) {
        persistent = false;
        return;
      }
      try {
        st.setItem(key, JSON.stringify({ version: VERSION, entries: entries.map(storedEntry) }));
        persistent = true;
      } catch (err) {
        persistent = false;
        failed = true;
      }
    }

    return {
      list: function list() {
        const entries = read();
        memory = entries.slice();
        return entries;
      },

      /**
       * An entry already in the list is replaced; `touch: false` keeps its place (opening one does not move
       * it up).
       */
      add: function add(entry, opts) {
        if (!validEntry(entry)) return read();
        const item = withId(storedEntry(entry));
        const entries = read();
        const at = entries.findIndex(function (e) { return e.id === item.id; });
        if (at !== -1 && opts && opts.touch === false) {
          entries[at] = item;
        } else {
          if (at !== -1) entries.splice(at, 1);
          entries.unshift(item);
        }
        const kept = entries.slice(0, limit);
        write(kept);
        return kept;
      },

      remove: function remove(id) {
        const entries = read().filter(function (e) { return e.id !== id; });
        write(entries);
        return entries;
      },

      clear: function clear() {
        write([]);
        return [];
      },

      persistent: function isPersistent() {
        read();
        return persistent;
      }
    };
  }

  function t(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function nameOf(prefix, id) {
    return SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(prefix + id) ? t(prefix + id)
      : String(id);
  }

  function make(doc, tag, attrs, children) {
    const node = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function icon(doc, name) {
    const svgNs = 'http://www.w3.org/2000/svg';
    const use = doc.createElementNS(svgNs, 'use');
    use.setAttribute('href', '#ic-' + name);
    const svg = doc.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.appendChild(use);
    return svg;
  }

  let controller = null;
  let controllerApp = null;

  function createController(app, list) {
    const doc = root.document;
    const rootEl = doc.getElementById('history-root');
    const listEl = doc.getElementById('history-list');
    const emptyEl = doc.getElementById('history-empty');
    const clearBtn = doc.getElementById('history-clear');
    if (!rootEl || !listEl) return null;

    let entries = list.list();
    let currentId = null;
    let opening = null;
    const off = [];
    const listeners = [];

    function listen(el, type, fn) {
      if (!el) return;
      el.addEventListener(type, fn);
      listeners.push({ el: el, type: type, fn: fn });
    }

    function title(entry) {
      return t('history.item.title', {
        variant: nameOf('variant.', entry.variantId), level: nameOf('difficulty.', entry.level)
      });
    }

    function shortSeed(seed) {
      return seed.slice(-6);
    }

    function metaNodes(entry) {
      return [
        make(doc, 'strong', { class: 'history-item__level', text: nameOf('difficulty.', entry.level) }),
        doc.createTextNode(t('history.item.meta', { score: entry.score, seed: shortSeed(entry.seed) }))
      ];
    }

    // Only the recipe is stored: an entry without a version, or with one below the current model's, was made
    // by an earlier version. An equal or higher version, or one that cannot be compared, gets no note.
    function madeEarlier(entry) {
      if (entry.ratingVersion === undefined) return true;
      const current = SG.difficulty ? SG.difficulty.RATING_VERSION : undefined;
      return isVersion(current) && entry.ratingVersion < current;
    }

    function open(entry) {
      opening = entry.id;
      const run = app.generate(overridesOf(entry));
      if (run && typeof run.then === 'function') {
        run.then(function () { opening = null; }, function () { opening = null; });
      }
    }

    function item(entry) {
      const name = title(entry);
      const earlier = madeEarlier(entry);
      const lines = [
        make(doc, 'span', { class: 'history-item__title', text: nameOf('variant.', entry.variantId) }),
        make(doc, 'span', { class: 'history-item__meta' }, metaNodes(entry))
      ];
      if (earlier) {
        lines.push(make(doc, 'span', { class: 'history-item__meta history-item__note', 'data-role': 'earlier',
          text: t('history.item.earlier') }));
      }
      const main = make(doc, 'button', {
        type: 'button', class: 'history-item__open', 'data-role': 'open',
        'aria-current': entry.id === currentId ? 'true' : null,
        title: t(earlier ? 'history.item.earlier.title' : 'history.open.title')
      }, lines);
      main.addEventListener('click', function () { open(entry); });
      const remove = make(doc, 'button', {
        type: 'button', class: 'btn btn--ghost btn--icon btn--sm history-item__remove', 'data-role': 'remove',
        'aria-label': t('history.remove', { name: name }), title: t('history.remove', { name: name })
      }, [icon(doc, 'x')]);
      remove.addEventListener('click', function () {
        const at = entries.findIndex(function (e) { return e.id === entry.id; });
        entries = list.remove(entry.id);
        render();
        const next = listEl.querySelectorAll('[data-role="open"]')[Math.min(at, entries.length - 1)];
        if (next) next.focus();
        else if (clearBtn) clearBtn.focus();
      });
      return make(doc, 'li', { class: 'history-item', 'data-id': entry.id }, [main, remove]);
    }

    function render() {
      listEl.textContent = '';
      entries.forEach(function (entry) { listEl.appendChild(item(entry)); });
      if (emptyEl) emptyEl.hidden = entries.length > 0;
      listEl.hidden = entries.length === 0;
      if (clearBtn) clearBtn.disabled = entries.length === 0;
    }

    function onResult(payload) {
      const result = payload && payload.result;
      if (!result || payload.imported === true) {
        currentId = null;
        render();
        return;
      }
      const entry = entryOf(result);
      if (entry === null) return;
      currentId = entry.id;
      entries = list.add(entry, { touch: opening !== entry.id });
      render();
    }

    listen(clearBtn, 'click', function () {
      entries = list.clear();
      render();
      if (typeof app.toast === 'function') app.toast('info', 'history.cleared');
    });
    off.push(app.on('result', onResult));
    off.push(app.on('locale', render));
    off.push(app.on('generate:start', function () { currentId = null; render(); }));

    // A reload brings back the list; the puzzle already on screen (an auto run) is added by its event.
    render();

    return {
      refresh: function refresh() {
        entries = list.list();
        render();
      },
      destroy: function destroy() {
        off.splice(0).forEach(function (fn) { if (typeof fn === 'function') fn(); });
        listeners.splice(0).forEach(function (l) { l.el.removeEventListener(l.type, l.fn); });
        listEl.textContent = '';
      }
    };
  }

  let shared = null;

  function sharedList() {
    if (shared === null) shared = createList({});
    return shared;
  }

  /** Idempotent; false without a DOM or without `#history-root`. */
  function init(app) {
    if (typeof document === 'undefined' || !app || typeof app.on !== 'function') return false;
    if (controller !== null && controllerApp === app) {
      controller.refresh();
      return true;
    }
    if (controller !== null) controller.destroy();
    controller = createController(app, sharedList());
    controllerApp = controller === null ? null : app;
    return controller !== null;
  }

  function destroy() {
    if (controller !== null) controller.destroy();
    controller = null;
    controllerApp = null;
  }

  SG.history = {
    STORAGE_KEY: STORAGE_KEY,
    VERSION: VERSION,
    LIMIT: LIMIT,
    keyOf: keyOf,
    entryOf: entryOf,
    overridesOf: overridesOf,
    createList: createList,
    list: function list() { return sharedList().list(); },
    clear: function clear() { return sharedList().clear(); },
    init: init,
    destroy: destroy
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'history.title': 'Generated puzzles',
      'history.empty': 'The puzzles you generate are saved here, so you can open them again.',
      'history.clear': 'Remove all',
      'history.clear.title': 'Remove every puzzle from the list',
      'history.cleared': 'The list of puzzles was cleared.',
      'history.open.title': 'Generate this puzzle again',
      'history.item.earlier': 'Made by an earlier version; selecting this entry regenerates the puzzle ' +
        'using the current rating model.',
      'history.item.earlier.title': 'History stores the seed and settings, not the puzzle. Regeneration ' +
        'uses the current rating model, so the puzzle, difficulty level or score may change. A compatible ' +
        'cached result may be reused.',
      'history.item.title': '{variant} - {level}',
      'history.item.meta': ': score {score}, seed {seed}',
      'history.remove': 'Remove \u201c{name}\u201d from the list'
    },
    vi: {
      'history.title': 'Các đề đã tạo',
      'history.empty': 'Các đề bạn tạo sẽ được lưu ở đây để mở lại khi cần.',
      'history.clear': 'Xóa hết',
      'history.clear.title': 'Xóa mọi đề khỏi danh sách',
      'history.cleared': 'Đã xóa danh sách các đề.',
      'history.open.title': 'Tạo lại đề này',
      'history.item.earlier': 'Do phiên bản cũ hơn tạo; chọn mục này sẽ tạo lại đề bằng mô hình tính điểm ' +
        'hiện tại.',
      'history.item.earlier.title': 'Lịch sử lưu seed và các tùy chọn, không lưu đề. Khi tạo lại, đề, ' +
        'mức độ khó hoặc điểm có thể thay đổi theo mô hình tính điểm hiện tại. Có thể dùng lại kết quả ' +
        'trong bộ nhớ đệm nếu còn phù hợp.',
      'history.item.title': '{variant} - {level}',
      'history.item.meta': ': điểm {score}, seed {seed}',
      'history.remove': 'Xóa \u201c{name}\u201d khỏi danh sách'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
