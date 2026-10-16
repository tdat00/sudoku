/**
 * Help and first-time tour (task T-7.6): `SG.help`.
 *
 * Two features, both plugged in through the optional-module hook of js/ui/app.js (`init(SG.app)`):
 *  - the HELP DIALOG, opened by the Help button (`action { id: 'help' }`): five tabs (variant rules,
 *    difficulty and the technique ladder, how generation works, controls and keys, about). The texts are
 *    locale keys `help.*`; what the registries already know (variant names, options, levels, technique names
 *    and descriptions, step names) is READ from them and never copied, so the help cannot drift away from
 *    the code.
 *  - the TOUR, a skippable four-step walk over the real page, shown only the first time (`sg.tour.v1` in
 *    localStorage; blocked storage means once per page load; never with `auto=1` in the URL).
 *
 * Pure helpers (no DOM, used by the tests): `entries`, `ladder`, `steps`, `shortcuts`, `controlsGlossary`,
 * `illustration`, `requiredKeys`, `tourSteps`, `shouldShowTour`, `placeCard`, `unionRect`.
 *
 * ---------------------------------------------------------------------------------------------------------
 * PUBLIC API (`SG.help`)
 * ---------------------------------------------------------------------------------------------------------
 *   init(app)             -> boolean. Idempotent. Listens to `action { id: 'help' }` and schedules the tour
 *                            when `shouldShowTour` allows it. `app` is `SG.app`.
 *   open(options?)        -> the modal handle of `SG.app.openModal`, or null (no DOM / not initialised).
 *                            `options.tab`: 'variants' | 'difficulty' | 'generation' | 'shortcuts' | 'about';
 *                            `options.variantId`: opens that variant on the variants tab.
 *   close()               -> closes the dialog.
 *   startTour(options?)   -> boolean. Starts the tour now (also when it was seen). `options.persist ===
 *                            false` does not remember the end of this run.
 *   stopTour(reason?)     -> ends a running tour ('skip' | 'done' | 'help' | any string); remembers it.
 *   isTourActive()        -> boolean.
 *   destroy()             -> removes everything the module added.
 *   TOUR_KEY, TAB_IDS     constants ('sg.tour.v1').
 *   entries(variantList?) -> the variant help registry (see `entries`).
 *   ladder()              -> the difficulty ladder rows and the variant-specific techniques.
 *   steps()               -> the seven generation steps as translation keys.
 *   shortcuts()           -> the groups of keyboard shortcuts.
 *   controlsGlossary()    -> the controls and what they do, as translation keys.
 *   illustration(id)      -> `{ variantId, width, height, viewBox, markup, cells }` or null.
 *   requiredKeys()        -> every translation key the help reads from other files or from its own fragment.
 *   tourSteps()           -> the tour steps `{ id, titleKey, textKey, targets }`.
 *   shouldShowTour(storage, url) -> boolean.
 *   placeCard(rect, card, viewport, options?) -> `{ left, top, side }` position of the tour card.
 *   unionRect(rects)      -> the smallest rectangle that holds all of them, or null.
 *
 * Keycaps ("Esc", "Ctrl", arrows) are printed on the keyboard and are the same in both languages, so they
 * live in `shortcuts()` as plain text; everything else goes through `SG.i18n.t`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: a running dialog or tour must survive.
  if (SG.help && typeof SG.help.init === 'function') return;

  /** localStorage key that remembers that the tour was seen. */
  const TOUR_KEY = 'sg.tour.v1';
  const TAB_IDS = Object.freeze(['variants', 'difficulty', 'generation', 'shortcuts', 'about']);
  const AUTO_TRUE = /^(?:1|true|on|yes)$/i;
  const TOUR_DELAY_MS = 700;
  const SVG_SAMPLE_SEED = 11;
  const SAMPLE_WORD = 'SUNFLOWER';

  const hasOwn = Object.prototype.hasOwnProperty;

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  // ---------------------------------------------------------------------------------------------
  // The variant help registry
  // ---------------------------------------------------------------------------------------------

  /**
   * The picture each variant gets: 'board' draws the empty board of the variant (regions, diagonals,
   * windows, overlapping grids); 'killer', 'signs' and 'word' are small samples of what is special.
   * Every registered variant needs an entry here AND the keys `help.variant.<id>.rules|special|figure`
   * (tests/suites/help.test.js fails otherwise).
   */
  const VARIANT_HELP = Object.freeze({
    classic4: { figure: 'board' },
    classic6: { figure: 'board' },
    classic9: { figure: 'board' },
    mega12: { figure: 'board' },
    mega16: { figure: 'board' },
    diagonalX: { figure: 'board' },
    hyper: { figure: 'board' },
    jigsaw9: { figure: 'board' },
    killer: { figure: 'killer' },
    greaterThan: { figure: 'signs' },
    samurai: { figure: 'board' },
    sohei: { figure: 'board' },
    butterfly: { figure: 'board' },
    flower: { figure: 'board' },
    wordoku: { figure: 'word' }
  });

  function safeOptions(def) {
    try {
      return SG.variants.optionsOf(def);
    } catch (err) {
      return [];
    }
  }

  /**
   * The help entry of one variant definition.
   * @param {Object} def  A variant definition (a registered one, or any object with `id`, `i18nKey`, ...).
   * @returns {Object} `{ id, generic, nameKey, groupId, groupKey, summaryKey, rulesKey, specialKey,
   *          figureKey, figure, digits, levels, symbolModes, options: [{ id, labelKey, hintKey }], keys }`.
   *          `generic` is
   *          true when the help has no hand-written text for the variant: the dialog then shows its name,
   *          summary and options only, and the test suite reports the missing entry.
   */
  function entryOf(def) {
    const id = String(def && def.id);
    const known = hasOwn.call(VARIANT_HELP, id);
    const prefix = 'help.variant.' + id + '.';
    const group = def && typeof def.group === 'string' ? def.group : '';
    const entry = {
      id: id,
      generic: !known,
      nameKey: def && typeof def.i18nKey === 'string' ? def.i18nKey : 'variant.' + id,
      groupId: group,
      groupKey: 'group.' + group,
      summaryKey: 'variant.' + id + '.desc',
      rulesKey: known ? prefix + 'rules' : null,
      specialKey: known ? prefix + 'special' : null,
      figureKey: known ? prefix + 'figure' : null,
      figure: known ? VARIANT_HELP[id].figure : 'board',
      digits: def && Number.isInteger(def.digits) ? def.digits : 0,
      levels: def && Array.isArray(def.difficultySupport) ? def.difficultySupport.slice() : [],
      symbolModes: def && Array.isArray(def.symbolModes) ? def.symbolModes.slice() : [],
      options: safeOptions(def).map(function (o) {
        return { id: o.id, labelKey: o.labelKey, hintKey: o.hintKey };
      }),
      keys: []
    };
    const keys = [entry.nameKey, entry.groupKey, entry.summaryKey];
    if (known) keys.push(entry.rulesKey, entry.specialKey, entry.figureKey);
    entry.options.forEach(function (o) {
      keys.push(o.labelKey);
      if (o.hintKey !== null) keys.push(o.hintKey);
    });
    entry.levels.forEach(function (level) { keys.push('difficulty.' + level); });
    entry.symbolModes.forEach(function (mode) { keys.push('symbolMode.' + mode); });
    entry.keys = keys;
    return entry;
  }

  /**
   * The variant help registry: one entry per variant, in registry order.
   * @param {Object[]} [variantList]  Defaults to `SG.variants.list()`; tests inject a list with a fake
   *        variant.
   * @returns {Object[]} See `entryOf`.
   */
  function entries(variantList) {
    const list = Array.isArray(variantList) ? variantList : SG.variants.list();
    return list.map(entryOf);
  }

  // ---------------------------------------------------------------------------------------------
  // Illustrations (pure: markup strings)
  // ---------------------------------------------------------------------------------------------

  const sampleCache = new Map();

  function cached(name, make) {
    if (!sampleCache.has(name)) sampleCache.set(name, make());
    return sampleCache.get(name);
  }

  function classicBase() {
    return cached('base', function () {
      return SG.variants.get('classic9').build({}, SG.rng.create(1).fork('model'));
    });
  }

  /** A fixed valid 9x9 grid: the numbers behind the Killer sums and the Greater-Than signs. */
  function sampleSolution() {
    return cached('solution', function () {
      const base = classicBase();
      return SG.dfs.solve(base, new Int32Array(base.cellCount), SG.rng.create(SVG_SAMPLE_SEED));
    });
  }

  /** Three cages of three cells inside every box (they hold distinct digits because a box does). */
  const BOX_CAGES = [[[0, 0], [0, 1], [1, 0]], [[0, 2], [1, 2], [2, 2]], [[1, 1], [2, 1], [2, 0]]];

  function killerSpec() {
    const solution = sampleSolution();
    const cages = [];
    for (let box = 0; box < 9; box++) {
      const top = Math.floor(box / 3) * 3;
      const left = (box % 3) * 3;
      BOX_CAGES.forEach(function (shape) {
        const cells = shape.map(function (rc) { return (top + rc[0]) * 9 + left + rc[1]; })
          .sort(function (a, b) { return a - b; });
        cages.push({ cells: cells, sum: cells.reduce(function (sum, i) { return sum + solution[i]; }, 0) });
      });
    }
    return { model: SG.killer.modelFromCages(cages), state: {}, opts: {}, crop: { rows: 3, cols: 3 } };
  }

  function signsSpec() {
    const solution = sampleSolution();
    const base = SG.variants.get('greaterThan').build({}, null);
    const model = SG.greaterThan.withSigns(base, SG.greaterThan.placeSigns(base, solution, 'box'));
    const values = new Int32Array(model.cellCount);
    [0, 10, 20].forEach(function (i) { values[i] = solution[i]; });
    return { model: model, state: { values: values, givens: values }, opts: {}, crop: { rows: 3, cols: 3 } };
  }

  function wordSpec() {
    const model = SG.variants.get('wordoku').build({
      word: SAMPLE_WORD, language: 'en', placement: 'diagonal'
    }, SG.rng.create(1).fork('model'));
    const fixed = Int32Array.from(model.fixedCells);
    const state = { values: fixed, givens: fixed };
    return { model: model, state: state, opts: { symbolMode: 'word' }, crop: null };
  }

  function figureSpec(id) {
    const kind = hasOwn.call(VARIANT_HELP, id) ? VARIANT_HELP[id].figure : 'board';
    if (kind === 'killer') return killerSpec();
    if (kind === 'signs') return signsSpec();
    if (kind === 'word') return wordSpec();
    const model = SG.variants.get(id).build(SG.variants.defaultOptions(id), SG.rng.create(1).fork('model'));
    return { model: model, state: {}, opts: {}, crop: null };
  }

  /**
   * The picture of a variant as SVG markup built by the board renderer (so it follows the board theme).
   * Killer and Greater-Than show the top-left box of a sample puzzle, Wordoku a board with its key word,
   * everything else the empty board with its regions, diagonals, windows or overlapping grids.
   * @param {string} variantId  A registered variant id.
   * @returns {?{variantId: string, width: number, height: number, viewBox: string, markup: string,
   *          cells: number}}  `markup` goes inside an `<svg class="sgb" viewBox="...">`; null when the
   *          renderer is missing or the variant cannot be drawn.
   */
  function illustration(variantId) {
    const BV = SG.boardView;
    if (!BV || typeof BV.renderMarkup !== 'function' || !SG.variants.has(variantId)) return null;
    let spec;
    try {
      spec = cached('figure:' + variantId, function () { return figureSpec(variantId); });
    } catch (err) {
      return null;
    }
    const geo = BV.geometry(spec.model, {});
    const edge = BV.MARGIN + 2;
    const width = spec.crop ? edge + spec.crop.cols * BV.CELL : geo.width;
    const height = spec.crop ? edge + spec.crop.rows * BV.CELL : geo.height;
    const options = Object.assign({ idPrefix: 'help-' + variantId, symbolMode: 'digits' }, spec.opts);
    return {
      variantId: variantId,
      width: width,
      height: height,
      viewBox: '0 0 ' + width + ' ' + height,
      markup: BV.renderMarkup(spec.model, spec.state, options),
      cells: spec.model.cellCount
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Difficulty ladder, generation steps, shortcuts, controls (pure data, as translation keys)
  // ---------------------------------------------------------------------------------------------

  function techniqueItem(tech) {
    return {
      id: tech.id,
      nameKey: 'technique.' + tech.id,
      descKey: 'technique.' + tech.id + '.desc',
      group: tech.group,
      order: tech.order,
      variants: Array.isArray(tech.variantScope) ? tech.variantScope.slice() : []
    };
  }

  function byOrder(a, b) {
    return a.order - b.order;
  }

  /**
   * The difficulty ladder as the registries define it: level `i` adds the technique group
   * `SG.difficulty.BASE_GROUPS[i]`; the techniques of a group are listed in the order the solver tries them.
   * @returns {{levels: Object[], variantGroups: Object[], scoring: Object}}  `levels[i]` is `{ level,
   *          nameKey, descKey, group, groupKey, techniques, minClues, maxClues, minScore, maxScore }`
   *          (`maxScore` is Infinity for the last level; the clue counts are the 9x9 numbers);
   *          `variantGroups` holds the groups with a `variantScope` (`{ group, groupKey, techniques }`).
   */
  function ladder() {
    const D = SG.difficulty;
    const all = SG.techniques.list().map(techniqueItem).sort(byOrder);
    const table = D.TABLE;
    const levels = D.LEVELS.map(function (level, i) {
      const group = D.BASE_GROUPS[i];
      const row = table[i] || {};
      const next = table[i + 1];
      return {
        level: level,
        nameKey: 'difficulty.' + level,
        descKey: 'difficulty.' + level + '.desc',
        group: group,
        groupKey: 'techniqueGroup.' + group,
        techniques: all.filter(function (x) { return x.group === group && x.variants.length === 0; }),
        minClues: row.minClues,
        maxClues: row.maxClues,
        minScore: row.min,
        maxScore: next ? next.min : Infinity
      };
    });
    const variantGroups = [];
    all.filter(function (x) { return x.variants.length > 0; }).forEach(function (x) {
      let entry = variantGroups.filter(function (g) { return g.group === x.group; })[0];
      if (!entry) {
        entry = { group: x.group, groupKey: 'techniqueGroup.' + x.group, techniques: [] };
        variantGroups.push(entry);
      }
      entry.techniques.push(x);
    });
    return { levels: levels, variantGroups: variantGroups, scoring: D.SCORING };
  }

  /**
   * The seven generation steps, in order.
   * @returns {Array<{id: string, nameKey: string, whatKey: string, whyKey: string}>}
   */
  function steps() {
    const ids = SG.events && SG.events.STEP_IDS ? SG.events.STEP_IDS : SG.explain.STEP_IDS;
    return ids.map(function (id) {
      return {
        id: id,
        nameKey: 'step.' + id + '.name',
        whatKey: 'explain.' + id + '.what',
        whyKey: 'explain.' + id + '.why'
      };
    });
  }

  function shortcutRow(id, keys) {
    return { id: id, keys: keys, textKey: 'help.keys.' + id };
  }

  /**
   * The keyboard shortcuts of the page, in groups. `keys` is a list of alternatives, each a list of keycaps
   * pressed together. A group may carry a `noteKey`: a sentence shown above its rows.
   * @returns {Array<{id: string, titleKey: string, noteKey: ?string, rows: Array<{id: string,
   *          keys: string[][], textKey: string}>}>}
   */
  function shortcuts() {
    const arrows = [['\u2191'], ['\u2193'], ['\u2190'], ['\u2192']];
    return [
      {
        id: 'general',
        titleKey: 'help.keys.group.general',
        noteKey: null,
        rows: [
          shortcutRow('tab', [['Tab'], ['Shift', 'Tab']]),
          shortcutRow('activate', [['Enter'], ['Space']]),
          shortcutRow('escape', [['Esc']]),
          shortcutRow('tabs', [['\u2190'], ['\u2192'], ['Home'], ['End']])
        ]
      },
      {
        id: 'replay',
        titleKey: 'help.keys.group.replay',
        noteKey: null,
        rows: [
          shortcutRow('scrubber', [['\u2190'], ['\u2192']]),
          shortcutRow('scrubberEnds', [['Home'], ['End']])
        ]
      },
      {
        id: 'board',
        titleKey: 'help.keys.group.board',
        noteKey: null,
        rows: [
          shortcutRow('cells', arrows),
          shortcutRow('rowEnds', [['Home'], ['End']]),
          shortcutRow('boardEnds', [['Ctrl', 'Home'], ['Ctrl', 'End']]),
          shortcutRow('pages', [['PageUp'], ['PageDown']])
        ]
      }
    ];
  }

  /**
   * The controls of the page and what they do: `{ labelKey, textKey }` pairs of existing translation keys
   * (the hints of the form controls are reused, not copied).
   * @returns {Array<{id: string, labelKey: string, textKey: string}>}
   */
  function controlsGlossary() {
    const pair = function (id, labelKey, textKey) {
      return { id: id, labelKey: labelKey, textKey: textKey };
    };
    return [
      pair('variant', 'controls.variant.label', 'help.controls.variant'),
      pair('difficulty', 'controls.difficulty.label', 'help.controls.difficulty'),
      pair('seed', 'controls.seed.label', 'controls.seed.hint'),
      pair('symmetry', 'controls.symmetry.label', 'help.controls.symmetry'),
      pair('symbolMode', 'controls.symbolMode.label', 'help.controls.symbolMode'),
      pair('digOrder', 'controls.digOrder.label', 'controls.digOrder.hint'),
      pair('maxAttempts', 'controls.maxAttempts.label', 'controls.maxAttempts.hint'),
      pair('trace', 'controls.trace.label', 'controls.trace.hint'),
      pair('generate', 'shell.btn.generate', 'shell.btn.generate.title'),
      pair('regenerate', 'shell.btn.regenerate', 'shell.btn.regenerate.title'),
      pair('export', 'shell.btn.export', 'shell.btn.export.title'),
      pair('instant', 'player.speed.instant', 'player.speed.instant.title'),
      pair('fast', 'player.speed.fast', 'player.speed.fast.title'),
      pair('step', 'player.speed.step', 'player.speed.step.title'),
      pair('manual', 'player.speed.manual', 'player.speed.manual.title')
    ];
  }

  /** Fixed texts of the dialog (everything that is not read from another registry or file). */
  const UI_KEYS = Object.freeze([
    'help.title', 'help.tabs.label', 'help.tab.variants', 'help.tab.difficulty', 'help.tab.generation',
    'help.tab.shortcuts', 'help.tab.about',
    'help.variants.intro', 'help.variants.levelsNote', 'help.variant.rules.title',
    'help.variant.special.title',
    'help.variant.options.title', 'help.variant.noOptions', 'help.variant.facts',
    'help.difficulty.intro', 'help.difficulty.levels.title', 'help.difficulty.levels.caption',
    'help.difficulty.col.level', 'help.difficulty.col.adds', 'help.difficulty.col.clues',
    'help.difficulty.col.score', 'help.difficulty.score', 'help.difficulty.scoreOpen',
    'help.difficulty.ladder.title', 'help.difficulty.ladder.intro', 'help.difficulty.level.adds',
    'help.difficulty.variant.title', 'help.difficulty.variant.intro', 'help.difficulty.variant.for',
    'help.difficulty.guarantee.title', 'help.difficulty.guarantee.oracle',
    'help.difficulty.guarantee.hardest', 'help.difficulty.guarantee.evil', 'help.difficulty.guarantee.verify',
    'help.difficulty.closest.title', 'help.difficulty.closest.text',
    'help.generation.intro', 'help.generation.steps.title', 'help.generation.replay',
    'help.generation.worker', 'help.generation.seed',
    'help.shortcuts.intro', 'help.keys.group.general', 'help.keys.group.replay', 'help.keys.group.board',
    'help.keys.tab', 'help.keys.activate', 'help.keys.escape',
    'help.keys.tabs', 'help.keys.scrubber', 'help.keys.scrubberEnds', 'help.keys.cells', 'help.keys.rowEnds',
    'help.keys.boardEnds', 'help.keys.pages', 'help.controls.title', 'help.controls.intro',
    'help.controls.variant', 'help.controls.difficulty', 'help.controls.symmetry', 'help.controls.symbolMode',
    'help.about.privacy.title', 'help.about.privacy.text', 'help.about.repro.title', 'help.about.repro.text',
    'help.about.tech.title', 'help.about.tech.text', 'help.about.credits.title', 'help.about.credits.text',
    'help.about.tour.title', 'help.about.tour.text',
    'help.tour.label', 'help.tour.progress', 'help.tour.skip', 'help.tour.done', 'help.tour.again',
    'help.tour.step.controls.title', 'help.tour.step.controls.text', 'help.tour.step.generate.title',
    'help.tour.step.generate.text', 'help.tour.step.board.title', 'help.tour.step.board.text',
    'help.tour.step.steps.title', 'help.tour.step.steps.text'
  ]);

  /**
   * Every translation key the help reads, own and foreign, for the variants registered now.
   * @returns {string[]} Sorted, without duplicates.
   */
  function requiredKeys() {
    const set = new Set(UI_KEYS);
    const add = function (key) { if (typeof key === 'string' && key !== '') set.add(key); };
    entries().forEach(function (e) { e.keys.forEach(add); });
    const lad = ladder();
    lad.levels.forEach(function (row) {
      add(row.nameKey);
      add(row.descKey);
      add(row.groupKey);
      row.techniques.forEach(function (x) { add(x.nameKey); add(x.descKey); });
    });
    lad.variantGroups.forEach(function (g) {
      add(g.groupKey);
      g.techniques.forEach(function (x) {
        add(x.nameKey);
        add(x.descKey);
        x.variants.forEach(function (id) { add('variant.' + id); });
      });
    });
    steps().forEach(function (s) { add(s.nameKey); add(s.whatKey); add(s.whyKey); });
    shortcuts().forEach(function (g) {
      add(g.titleKey);
      add(g.noteKey);
      g.rows.forEach(function (r) { add(r.textKey); });
    });
    controlsGlossary().forEach(function (c) { add(c.labelKey); add(c.textKey); });
    ['app.mode.main', 'app.mode.worker', 'result.warning.approximate.badge', 'result.warning.retry',
      'common.close', 'common.next', 'common.back'].forEach(add);
    return Array.from(set).sort();
  }

  // ---------------------------------------------------------------------------------------------
  // Tour logic (pure)
  // ---------------------------------------------------------------------------------------------

  /**
   * The tour steps. `targets` is a list of alternatives; each alternative is a list of selectors whose
   * elements are highlighted together. The first alternative that is visible is used (on a phone the
   * options panel is a closed drawer, so the Options bar is highlighted instead).
   * @returns {Array<{id: string, titleKey: string, textKey: string, targets: string[][]}>}
   */
  function tourSteps() {
    const step = function (id, targets) {
      return {
        id: id,
        titleKey: 'help.tour.step.' + id + '.title',
        textKey: 'help.tour.step.' + id + '.text',
        targets: targets
      };
    };
    return [
      step('controls', [['#controls-root'], ['#btn-drawer']]),
      step('generate', [['#btn-generate'], ['#btn-drawer']]),
      step('board', [['#board-root', '#player-root'], ['#board-root']]),
      step('steps', [['#steps-root']])
    ];
  }

  /** Whether a URL (a string, a Location, a URL) carries `auto=1`: an automated or shared link. */
  function isAutoUrl(url) {
    let text = '';
    if (typeof url === 'string') text = url;
    else if (url && typeof url.search === 'string') text = url.search;
    else if (url && typeof url.href === 'string') text = url.href;
    const q = text.indexOf('?');
    if (q === -1) return false;
    const hash = text.indexOf('#', q);
    const query = text.slice(q + 1, hash === -1 ? undefined : hash);
    return query.split('&').some(function (pair) {
      const eq = pair.indexOf('=');
      if (eq === -1 || pair.slice(0, eq) !== 'auto') return false;
      let value = pair.slice(eq + 1);
      try {
        value = decodeURIComponent(value);
      } catch (err) {
        /* keep the raw text */
      }
      return AUTO_TRUE.test(value);
    });
  }

  /**
   * Should the first-time tour be offered? Not when the URL says `auto=1`, not when the tour was seen
   * (any non-empty value under `sg.tour.v1`). Storage that is missing or throws counts as "not seen": the
   * caller then shows it once per page load.
   * @param {?{getItem: function(string): ?string}} storage  `localStorage` or null.
   * @param {(string|{search: string})} [url]  The page address or its query string.
   * @returns {boolean}
   */
  function shouldShowTour(storage, url) {
    if (isAutoUrl(url)) return false;
    if (!storage || typeof storage.getItem !== 'function') return true;
    try {
      const value = storage.getItem(TOUR_KEY);
      return value === null || value === undefined || value === '';
    } catch (err) {
      return true;
    }
  }

  function markSeen(storage) {
    try {
      storage.setItem(TOUR_KEY, '1');
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * The smallest rectangle that holds all the given ones.
   * @param {Array<{left: number, top: number, right: number, bottom: number}>} rects
   * @returns {?{left: number, top: number, right: number, bottom: number, width: number, height: number}}
   */
  function unionRect(rects) {
    const list = (rects || []).filter(function (r) { return r && r.right > r.left && r.bottom > r.top; });
    if (list.length === 0) return null;
    const out = {
      left: Math.min.apply(null, list.map(function (r) { return r.left; })),
      top: Math.min.apply(null, list.map(function (r) { return r.top; })),
      right: Math.max.apply(null, list.map(function (r) { return r.right; })),
      bottom: Math.max.apply(null, list.map(function (r) { return r.bottom; }))
    };
    out.width = out.right - out.left;
    out.height = out.bottom - out.top;
    return out;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, Math.max(min, max)));
  }

  function overlapArea(a, b) {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  }

  /**
   * Where the tour card goes: next to the highlighted rectangle (right, left, below, above, in that order
   * of preference), always inside the viewport. When no side has room the card goes where it covers the
   * least of the target; without a target it is centred.
   * @param {?{left: number, top: number, right: number, bottom: number}} rect  The highlighted area.
   * @param {{width: number, height: number}} card  Size of the card.
   * @param {{width: number, height: number}} viewport
   * @param {{margin?: number, gap?: number}} [options]  Distance to the viewport edge and to the target.
   * @returns {{left: number, top: number, side: string, covered: number}}  `side` is 'right' | 'left' |
   *          'bottom' | 'top' | 'center'; `covered` is the area of the target (in px squared) that the card
   *          hides: 0 when the card has room beside it.
   */
  function placeCard(rect, card, viewport, options) {
    const o = options || {};
    const margin = o.margin === undefined ? 12 : o.margin;
    const gap = o.gap === undefined ? 12 : o.gap;
    const maxLeft = viewport.width - card.width - margin;
    const maxTop = viewport.height - card.height - margin;
    if (!rect) {
      return { left: clamp((viewport.width - card.width) / 2, margin, maxLeft),
        top: clamp((viewport.height - card.height) / 2, margin, maxTop), side: 'center', covered: 0 };
    }
    const midX = rect.left + (rect.right - rect.left) / 2 - card.width / 2;
    const midY = rect.top + (rect.bottom - rect.top) / 2 - card.height / 2;
    // A side "fits" when the card has room on that side of the target; along the other axis it slides to
    // stay inside the viewport.
    const options4 = [
      { side: 'right', left: rect.right + gap, top: midY, vertical: false },
      { side: 'left', left: rect.left - gap - card.width, top: midY, vertical: false },
      { side: 'bottom', left: midX, top: rect.bottom + gap, vertical: true },
      { side: 'top', left: midX, top: rect.top - gap - card.height, vertical: true }
    ].map(function (c) {
      const fits = c.vertical
        ? c.top >= margin && c.top <= maxTop + 0.5
        : c.left >= margin && c.left <= maxLeft + 0.5;
      const left = clamp(c.left, margin, maxLeft);
      const top = clamp(c.top, margin, maxTop);
      return {
        side: c.side,
        left: left,
        top: top,
        fits: fits,
        covered: overlapArea(rect, {
          left: left, top: top, right: left + card.width, bottom: top + card.height
        })
      };
    });
    let best = options4[0];
    for (let i = 0; i < options4.length; i++) {
      const c = options4[i];
      if (c.fits && !best.fits) best = c;
      else if (c.fits === best.fits && c.covered < best.covered) best = c;
    }
    return { left: Math.round(best.left), top: Math.round(best.top), side: best.side,
      covered: Math.round(best.covered) };
  }

  // ---------------------------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------------------------

  /** Creates an element; attributes of null / undefined / false are skipped, `true` gives ''. */
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function safely(fn) {
    try {
      return fn();
    } catch (err) {
      if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
      return undefined;
    }
  }

  function localStorageOrNull() {
    try {
      return root.localStorage || null;
    } catch (err) {
      return null;
    }
  }

  function reducedMotion() {
    try {
      if (document.documentElement.getAttribute('data-motion') === 'off') return true;
      return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (err) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The help dialog
  // ---------------------------------------------------------------------------------------------

  let app = null;
  let initialised = false;
  let offAction = null;
  let tourTimer = null;
  let tourOffered = false;

  /** State of the dialog that is open (null when closed). */
  let dialog = null;

  function listText(keys, prefix) {
    return keys.map(function (key) { return t(prefix + key); }).join(', ');
  }

  function renderFigure(entry) {
    const art = illustration(entry.id);
    if (art === null) return null;
    const label = entry.figureKey !== null ? t(entry.figureKey, { word: SAMPLE_WORD }) : t(entry.nameKey);
    const capId = 'help-figcap-' + entry.id;
    const holder = h('div', { class: 'help-figure__art' });
    holder.innerHTML = '<svg class="sgb help-figure__svg" viewBox="' + art.viewBox + '" role="img" ' +
      'aria-labelledby="' + capId + '" focusable="false" preserveAspectRatio="xMidYMid meet">' +
      art.markup + '</svg>';
    const svg = holder.firstChild;
    svg.setAttribute('data-cells', String(art.cells));
    const wide = art.width > art.height * 1.2;
    const className = 'help-figure' + (wide ? ' help-figure--wide' : '');
    return h('figure', { class: className, 'data-size': art.cells }, [
      holder,
      h('figcaption', { class: 'help-figure__caption', id: capId, text: label })
    ]);
  }

  function variantBody(entry) {
    const body = h('div', { class: 'disclosure__body help-variant__body' });
    const text = h('div', { class: 'help-variant__text' });
    if (!entry.generic) {
      text.appendChild(h('h4', { class: 'help__h4', text: t('help.variant.rules.title') }));
      text.appendChild(h('p', { text: t(entry.rulesKey) }));
      text.appendChild(h('h4', { class: 'help__h4', text: t('help.variant.special.title') }));
      text.appendChild(h('p', { text: t(entry.specialKey) }));
    } else {
      text.appendChild(h('p', { text: t(entry.summaryKey) }));
    }
    text.appendChild(h('h4', { class: 'help__h4', text: t('help.variant.options.title') }));
    if (entry.options.length === 0) {
      text.appendChild(h('p', { class: 'text-muted', text: t('help.variant.noOptions') }));
    } else {
      text.appendChild(h('ul', { class: 'help-list' }, entry.options.map(function (o) {
        return h('li', {}, [
          h('strong', { text: t(o.labelKey) }),
          o.hintKey !== null ? h('span', { class: 'help-list__hint', text: t(o.hintKey) }) : null
        ]);
      })));
    }
    text.appendChild(h('p', { class: 'help-variant__facts text-muted', text: t('help.variant.facts', {
      digits: entry.digits,
      levels: listText(entry.levels, 'difficulty.'),
      modes: listText(entry.symbolModes, 'symbolMode.')
    }) }));
    body.appendChild(h('div', { class: 'help-variant__figure', 'data-figure': entry.id }));
    body.appendChild(text);
    return body;
  }

  function ensureFigure(details) {
    const slot = details.querySelector('[data-figure]');
    if (!slot || slot.firstChild) return;
    const entry = entries().filter(function (e) { return e.id === slot.getAttribute('data-figure'); })[0];
    if (!entry) return;
    const figure = safely(function () { return renderFigure(entry); });
    if (figure) slot.appendChild(figure);
  }

  function variantDetails(entry) {
    const isOpen = dialog.openIds.has(entry.id);
    const details = h('details', {
      class: 'disclosure help-variant', id: 'help-variant-' + entry.id, 'data-variant': entry.id, open: isOpen
    }, [
      h('summary', {}, [
        h('span', { class: 'help-variant__name', text: t(entry.nameKey) }),
        h('span', { class: 'help-variant__short', text: t(entry.summaryKey) })
      ]),
      variantBody(entry)
    ]);
    details.addEventListener('toggle', function () {
      if (details.open) {
        dialog.openIds.add(entry.id);
        ensureFigure(details);
      } else {
        dialog.openIds.delete(entry.id);
      }
    });
    if (isOpen) ensureFigure(details);
    return details;
  }

  function renderVariants(panel) {
    const list = entries();
    const intro = t('help.variants.intro', { count: list.length });
    panel.appendChild(h('p', { class: 'help__lead', text: intro }));
    panel.appendChild(h('p', { class: 'help__note', text: t('help.variants.levelsNote') }));
    const groups = [];
    list.forEach(function (entry) {
      let g = groups.filter(function (x) { return x.id === entry.groupId; })[0];
      if (!g) {
        g = { id: entry.groupId, key: entry.groupKey, entries: [] };
        groups.push(g);
      }
      g.entries.push(entry);
    });
    groups.forEach(function (g) {
      const headingId = 'help-group-' + g.id;
      panel.appendChild(h('section', { class: 'help__group', 'aria-labelledby': headingId }, [
        h('h3', { class: 'help__h3', id: headingId, text: SG.i18n.has(g.key) ? t(g.key) : g.id })
      ].concat(g.entries.map(variantDetails))));
    });
  }

  function techniqueList(items, withVariants) {
    return h('dl', { class: 'help-terms help-terms--techniques' }, items.reduce(function (out, x) {
      out.push(h('dt', { text: t(x.nameKey) }));
      out.push(h('dd', {}, [
        h('span', { text: t(x.descKey) }),
        withVariants && x.variants.length > 0
          ? h('span', { class: 'help-terms__scope badge', text: t('help.difficulty.variant.for', {
            variants: x.variants.map(function (id) { return t('variant.' + id); }).join(', ')
          }) })
          : null
      ]));
      return out;
    }, []));
  }

  function renderLevelsTable(lad) {
    const caption = t('help.difficulty.levels.caption');
    const num = function (n) { return SG.i18n.formatNumber(n); };
    const head = h('thead', {}, [h('tr', {}, ['level', 'adds', 'clues', 'score'].map(function (id) {
      return h('th', { scope: 'col', text: t('help.difficulty.col.' + id) });
    }))]);
    const body = h('tbody', {}, lad.levels.map(function (row) {
      const score = isFinite(row.maxScore)
        ? num(row.minScore) + '\u2013' + num(row.maxScore)
        : t('help.difficulty.scoreOpen', { min: num(row.minScore) });
      return h('tr', {}, [
        h('th', { scope: 'row', text: t(row.nameKey) }),
        h('td', { text: t(row.groupKey) }),
        h('td', { class: 'help-table__num', text: num(row.minClues) + '\u2013' + num(row.maxClues) }),
        h('td', { class: 'help-table__num', text: score })
      ]);
    }));
    const table = h('table', { class: 'help-table' }, [
      h('caption', { class: 'visually-hidden', text: caption }), head, body
    ]);
    return h('div', { class: 'help-table-wrap', role: 'region', tabindex: '0', 'aria-label': caption },
      [table]);
  }

  function renderDifficulty(panel) {
    const lad = ladder();
    const num = function (n) { return SG.i18n.formatNumber(n); };
    panel.appendChild(h('p', { class: 'help__lead', text: t('help.difficulty.intro') }));
    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.difficulty.levels.title') }));
    panel.appendChild(renderLevelsTable(lad));
    panel.appendChild(h('p', { class: 'help__note', text: t('help.difficulty.score', {
      multiplier: num(lad.scoring.firstUseMultiplier), bonus: num(lad.scoring.emptyCellBonus)
    }) }));

    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.difficulty.ladder.title') }));
    panel.appendChild(h('p', { text: t('help.difficulty.ladder.intro') }));
    lad.levels.forEach(function (row, i) {
      panel.appendChild(h('section', { class: 'help-rung', 'aria-labelledby': 'help-rung-' + row.level }, [
        h('h4', { class: 'help__h4', id: 'help-rung-' + row.level }, [
          h('span', { class: 'help-rung__index', 'aria-hidden': 'true', text: String(i + 1) }),
          h('span', { text: t(row.nameKey) })
        ]),
        h('p', { text: t(row.descKey) }),
        h('p', { class: 'help-rung__adds', text: t('help.difficulty.level.adds', {
          group: t(row.groupKey)
        }) }),
        techniqueList(row.techniques, false)
      ]));
    });

    if (lad.variantGroups.length > 0) {
      panel.appendChild(h('h3', { class: 'help__h3', text: t('help.difficulty.variant.title') }));
      panel.appendChild(h('p', { text: t('help.difficulty.variant.intro') }));
      lad.variantGroups.forEach(function (g) {
        panel.appendChild(h('section', { class: 'help-rung', 'aria-labelledby': 'help-vgroup-' + g.group }, [
          h('h4', { class: 'help__h4', id: 'help-vgroup-' + g.group, text: t(g.groupKey) }),
          techniqueList(g.techniques, true)
        ]));
      });
    }

    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.difficulty.guarantee.title') }));
    ['oracle', 'hardest', 'evil', 'verify'].forEach(function (part) {
      panel.appendChild(h('p', { text: t('help.difficulty.guarantee.' + part) }));
    });
    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.difficulty.closest.title') }));
    panel.appendChild(h('p', { text: t('help.difficulty.closest.text', {
      badge: t('result.warning.approximate.badge'), retry: t('result.warning.retry')
    }) }));
  }

  function renderGeneration(panel) {
    panel.appendChild(h('p', { class: 'help__lead', text: t('help.generation.intro') }));
    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.generation.steps.title') }));
    panel.appendChild(h('ol', { class: 'help-steps' }, steps().map(function (s) {
      return h('li', { class: 'help-steps__item' }, [
        h('strong', { class: 'help-steps__name', text: t(s.nameKey) }),
        h('span', { class: 'help-steps__what', text: t(s.whatKey) }),
        h('span', { class: 'help-steps__why text-muted', text: t(s.whyKey) })
      ]);
    })));
    panel.appendChild(h('p', { text: t('help.generation.replay') }));
    panel.appendChild(h('p', { text: t('help.generation.seed') }));
    panel.appendChild(h('p', { text: t('help.generation.worker', {
      main: t('app.mode.main'), worker: t('app.mode.worker')
    }) }));
  }

  function keycaps(combos) {
    const out = [];
    combos.forEach(function (combo, i) {
      if (i > 0) out.push(h('span', { class: 'help-keys__or', 'aria-hidden': 'true', text: '/' }));
      const parts = [];
      combo.forEach(function (cap, j) {
        if (j > 0) parts.push(h('span', { class: 'help-keys__plus', 'aria-hidden': 'true', text: '+' }));
        parts.push(h('kbd', { class: 'help-key', text: cap }));
      });
      out.push(h('span', { class: 'help-keys__combo' }, parts));
    });
    return h('span', { class: 'help-keys__caps' }, out);
  }

  function renderShortcuts(panel) {
    panel.appendChild(h('p', { class: 'help__lead', text: t('help.shortcuts.intro') }));
    shortcuts().forEach(function (group) {
      const headingId = 'help-keys-' + group.id;
      panel.appendChild(h('section', { class: 'help__group', 'aria-labelledby': headingId }, [
        h('h3', { class: 'help__h3', id: headingId, text: t(group.titleKey) }),
        group.noteKey !== null ? h('p', { class: 'help__note', text: t(group.noteKey) }) : null,
        h('dl', { class: 'help-keys' }, group.rows.reduce(function (out, row) {
          out.push(h('dt', {}, [keycaps(row.keys)]));
          out.push(h('dd', { text: t(row.textKey) }));
          return out;
        }, []))
      ]));
    });
    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.controls.title') }));
    panel.appendChild(h('p', { text: t('help.controls.intro') }));
    panel.appendChild(h('dl', { class: 'help-terms' }, controlsGlossary().reduce(function (out, c) {
      out.push(h('dt', { text: t(c.labelKey) }));
      out.push(h('dd', { text: t(c.textKey) }));
      return out;
    }, [])));
  }

  function renderAbout(panel) {
    const section = function (id, extra) {
      const nodes = [
        h('h3', { class: 'help__h3', id: 'help-about-' + id, text: t('help.about.' + id + '.title') }),
        h('p', { text: t('help.about.' + id + '.text') })
      ];
      return h('section', { class: 'help__group', 'aria-labelledby': 'help-about-' + id },
        nodes.concat(extra || []));
    };
    panel.appendChild(section('privacy'));
    panel.appendChild(section('repro', [
      h('p', {}, [h('code', { class: 'help-code', text: '?v=killer&d=hard&seed=2024&lang=vi&auto=1' })])
    ]));
    panel.appendChild(section('tech'));
    const again = h('button', { type: 'button', class: 'btn btn--secondary', 'data-role': 'tour-again',
      text: t('help.tour.again') });
    again.addEventListener('click', function () { showTourAgain(); });
    panel.appendChild(section('tour', [h('p', {}, [again])]));
    panel.appendChild(section('credits'));
  }

  const RENDERERS = {
    variants: renderVariants,
    difficulty: renderDifficulty,
    generation: renderGeneration,
    shortcuts: renderShortcuts,
    about: renderAbout
  };

  function renderPanel(id) {
    const panel = dialog.panels[id];
    panel.textContent = '';
    RENDERERS[id](panel);
    dialog.rendered.add(id);
  }

  function selectTab(id, focus) {
    if (TAB_IDS.indexOf(id) === -1 || dialog === null) return;
    dialog.tab = id;
    TAB_IDS.forEach(function (name) {
      const active = name === id;
      const tab = dialog.tabs[name];
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      dialog.panels[name].hidden = !active;
    });
    if (!dialog.rendered.has(id)) renderPanel(id);
    dialog.scroller.scrollTop = 0;
    if (focus) dialog.tabs[id].focus();
    if (typeof dialog.tabs[id].scrollIntoView === 'function') {
      dialog.tabs[id].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function onTabKey(event) {
    const at = TAB_IDS.indexOf(dialog.tab);
    let next = -1;
    if (event.key === 'ArrowRight') next = (at + 1) % TAB_IDS.length;
    else if (event.key === 'ArrowLeft') next = (at + TAB_IDS.length - 1) % TAB_IDS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TAB_IDS.length - 1;
    if (next === -1) return;
    event.preventDefault();
    selectTab(TAB_IDS[next], true);
  }

  function buildTabs() {
    const list = h('div', { class: 'help__tabs', role: 'tablist', 'aria-label': t('help.tabs.label') });
    TAB_IDS.forEach(function (id) {
      const tab = h('button', {
        type: 'button', class: 'help__tab', role: 'tab', id: 'help-tab-' + id,
        'aria-controls': 'help-panel-' + id, 'aria-selected': 'false', tabindex: '-1',
        text: t('help.tab.' + id)
      });
      tab.addEventListener('click', function () { selectTab(id, false); });
      tab.addEventListener('keydown', onTabKey);
      dialog.tabs[id] = tab;
      list.appendChild(tab);
    });
    return list;
  }

  function buildBody(container) {
    const wrap = h('div', { class: 'help' });
    wrap.appendChild(buildTabs());
    TAB_IDS.forEach(function (id) {
      const panel = h('div', {
        class: 'help__panel', role: 'tabpanel', id: 'help-panel-' + id, 'aria-labelledby': 'help-tab-' + id,
        tabindex: '0', hidden: true
      });
      dialog.panels[id] = panel;
      wrap.appendChild(panel);
    });
    dialog.scroller = container;
    return wrap;
  }

  function buildFooter(container) {
    const again = h('button', { type: 'button', class: 'btn btn--secondary help__again',
      'data-role': 'tour-again', text: t('help.tour.again') });
    const done = h('button', { type: 'button', class: 'btn btn--primary', 'data-role': 'help-close',
      text: t('common.close') });
    again.addEventListener('click', function () { showTourAgain(); });
    done.addEventListener('click', function () { close(); });
    dialog.footerAgain = again;
    dialog.footerClose = done;
    container.appendChild(again);
    container.appendChild(done);
  }

  function relocalise() {
    if (dialog === null) return;
    dialog.rendered.clear();
    TAB_IDS.forEach(function (id) { dialog.tabs[id].textContent = t('help.tab.' + id); });
    dialog.tabs[TAB_IDS[0]].parentNode.setAttribute('aria-label', t('help.tabs.label'));
    if (dialog.footerAgain) dialog.footerAgain.textContent = t('help.tour.again');
    if (dialog.footerClose) dialog.footerClose.textContent = t('common.close');
    if (tour !== null) renderTourContent();
    const top = dialog.scroller.scrollTop;
    renderPanel(dialog.tab);
    dialog.scroller.scrollTop = top;
  }

  /**
   * Opens the help dialog (or brings the open one to the front).
   * @param {{tab?: string, variantId?: string}} [options]
   * @returns {?Object} The modal handle of `SG.app.openModal`; null without a DOM or before `init`.
   */
  function open(options) {
    if (typeof document === 'undefined' || app === null || typeof app.openModal !== 'function') return null;
    const o = options || {};
    stopTour('help');
    const wantTab = TAB_IDS.indexOf(o.tab) !== -1 ? o.tab : null;
    let variantId = typeof o.variantId === 'string' && SG.variants.has(o.variantId) ? o.variantId : null;
    if (variantId === null && dialog === null && wantTab === null) {
      const state = safely(function () { return app.getStore().get(); });
      if (state && SG.variants.has(state.variantId)) variantId = state.variantId;
    }
    if (dialog !== null) {
      if (variantId !== null) dialog.openIds.add(variantId);
      selectTab(variantId !== null && wantTab === null ? 'variants' : (wantTab || dialog.tab), true);
      if (dialog.tab === 'variants') renderPanel('variants');
      scrollToVariant(variantId);
      return dialog.handle;
    }
    dialog = {
      handle: null, scroller: null, tabs: {}, panels: {}, rendered: new Set(), openIds: new Set(),
      tab: wantTab || 'variants', footerAgain: null, footerClose: null, offLocale: null
    };
    if (variantId !== null) dialog.openIds.add(variantId);
    const state = dialog;
    const handle = app.openModal({
      titleKey: 'help.title',
      wide: true,
      body: buildBody,
      footer: buildFooter,
      onClose: function () {
        if (state.offLocale) state.offLocale();
        if (dialog === state) dialog = null;
      }
    });
    if (handle === null || handle === undefined) {
      dialog = null;
      return null;
    }
    state.handle = handle;
    state.offLocale = SG.i18n.onChange(relocalise);
    selectTab(state.tab, true);
    scrollToVariant(variantId);
    return handle;
  }

  function scrollToVariant(variantId) {
    if (variantId === null || dialog === null || dialog.tab !== 'variants') return;
    const details = dialog.panels.variants.querySelector('#help-variant-' + variantId);
    if (!details) return;
    if (!details.open) details.open = true;
    if (typeof details.scrollIntoView === 'function') {
      details.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }

  /** Closes the help dialog, if it is open. */
  function close() {
    if (dialog !== null && dialog.handle) dialog.handle.close();
  }

  function showTourAgain() {
    close();
    root.setTimeout(function () { startTour({ persist: true }); }, 0);
  }

  // ---------------------------------------------------------------------------------------------
  // The tour (DOM)
  // ---------------------------------------------------------------------------------------------

  /** The running tour or null: `{ steps, index, card, spot, parts, previous, listeners, persist }`. */
  let tour = null;

  function isVisible(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = root.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }

  /** The elements of every alternative of a step whose elements are all visible, in order of preference. */
  function visibleTargets(step) {
    const out = [];
    step.targets.forEach(function (alternative) {
      const els = alternative.map(function (selector) { return document.querySelector(selector); });
      if (els.length > 0 && els.every(isVisible)) out.push(els);
    });
    return out;
  }

  function rectOf(els) {
    return unionRect(els.map(function (el) { return el.getBoundingClientRect(); }));
  }

  function stepsOfThisPage() {
    return tourSteps().filter(function (step) { return visibleTargets(step).length > 0; });
  }

  function viewportSize() {
    const el = document.documentElement;
    return { width: el.clientWidth || root.innerWidth, height: el.clientHeight || root.innerHeight };
  }

  function renderTourContent() {
    const step = tour.steps[tour.index];
    const last = tour.index === tour.steps.length - 1;
    tour.parts.title.textContent = t(step.titleKey);
    tour.parts.text.textContent = t(step.textKey);
    tour.parts.progress.textContent = t('help.tour.progress', {
      n: tour.index + 1, total: tour.steps.length
    });
    tour.parts.skip.textContent = t('help.tour.skip');
    tour.parts.back.textContent = t('common.back');
    tour.parts.back.hidden = tour.index === 0;
    tour.parts.next.textContent = last ? t('help.tour.done') : t('common.next');
    tour.card.setAttribute('aria-label', t('help.tour.label'));
  }

  /** Highlights the alternative of the step next to which the card hides the least, and places the card. */
  function positionTour() {
    if (tour === null) return;
    const gap = 16;
    const size = { width: tour.card.offsetWidth, height: tour.card.offsetHeight };
    const view = viewportSize();
    let best = null;
    visibleTargets(tour.steps[tour.index]).forEach(function (els) {
      const rect = rectOf(els);
      const where = placeCard(rect, size, view, { margin: 12, gap: gap });
      if (best === null || where.covered < best.where.covered) best = { rect: rect, where: where };
    });
    if (best === null) {
      tour.spot.hidden = true;
      best = { rect: null, where: placeCard(null, size, view, { margin: 12 }) };
    } else {
      const pad = 6;
      tour.spot.hidden = false;
      tour.spot.style.left = Math.round(best.rect.left - pad) + 'px';
      tour.spot.style.top = Math.round(best.rect.top - pad) + 'px';
      tour.spot.style.width = Math.round(best.rect.width + 2 * pad) + 'px';
      tour.spot.style.height = Math.round(best.rect.height + 2 * pad) + 'px';
    }
    tour.card.style.left = best.where.left + 'px';
    tour.card.style.top = best.where.top + 'px';
    tour.card.setAttribute('data-side', best.where.side);
  }

  /** True when less than 60% of the (viewport-sized part of the) target is on screen. */
  function needsScroll(rect) {
    const height = viewportSize().height;
    const visible = Math.min(rect.bottom, height) - Math.max(rect.top, 0);
    return visible < Math.min(rect.height, height) * 0.6;
  }

  function showStep(index) {
    tour.index = index;
    renderTourContent();
    const first = visibleTargets(tour.steps[index])[0];
    const rect = first ? rectOf(first) : null;
    if (rect !== null && needsScroll(rect) && typeof first[0].scrollIntoView === 'function') {
      first[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
    positionTour();
  }

  function schedulePosition() {
    if (tour === null || tour.frame) return;
    const raf = root.requestAnimationFrame || function (fn) { return root.setTimeout(fn, 16); };
    tour.frame = raf(function () {
      if (tour === null) return;
      tour.frame = 0;
      positionTour();
    });
  }

  function onTourKey(event) {
    if (tour === null || event.key !== 'Escape') return;
    if (document.querySelector('dialog[open]')) return;
    event.preventDefault();
    event.stopPropagation();
    stopTour('skip');
  }

  function focusAfterTour(previous) {
    const target = previous && previous.isConnected && previous !== document.body ? previous
      : document.getElementById('btn-generate');
    if (target && typeof target.focus === 'function') target.focus();
  }

  /**
   * Starts the tour: a spotlight over the real page and a card with Back / Next / Skip. It does not block the
   * page (the highlight lets clicks through) and does nothing when the page has none of the target elements.
   * @param {{persist?: boolean}} [options]  `persist: false` leaves the "seen" flag alone.
   * @returns {boolean} Whether the tour is running.
   */
  function startTour(options) {
    if (typeof document === 'undefined' || !document.body) return false;
    if (tour !== null) return true;
    const found = stepsOfThisPage();
    if (found.length === 0) return false;
    const o = options || {};
    const spot = h('div', { class: 'tour-spot', 'aria-hidden': 'true' });
    const parts = {
      title: h('h2', { class: 'tour-card__title', id: 'tour-title' }),
      text: h('p', { class: 'tour-card__text', id: 'tour-text' }),
      progress: h('span', { class: 'tour-card__progress' }),
      skip: h('button', { type: 'button', class: 'btn btn--ghost btn--sm', 'data-role': 'tour-skip' }),
      back: h('button', { type: 'button', class: 'btn btn--secondary btn--sm', 'data-role': 'tour-back' }),
      next: h('button', { type: 'button', class: 'btn btn--primary btn--sm', 'data-role': 'tour-next' })
    };
    const content = h('div', { class: 'tour-card__content', 'aria-live': 'polite', 'aria-atomic': 'true' },
      [parts.progress, parts.title, parts.text]);
    const card = h('section', {
      class: 'tour-card', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'tour-title',
      'aria-describedby': 'tour-text'
    }, [content, h('div', { class: 'tour-card__actions' }, [parts.skip, parts.back, parts.next])]);
    tour = {
      steps: found, index: 0, card: card, spot: spot, parts: parts, frame: 0,
      previous: document.activeElement, persist: o.persist !== false, offLocale: null
    };
    document.body.appendChild(spot);
    document.body.appendChild(card);
    parts.skip.addEventListener('click', function () { stopTour('skip'); });
    parts.back.addEventListener('click', function () {
      if (tour && tour.index > 0) showStep(tour.index - 1);
    });
    parts.next.addEventListener('click', function () {
      if (tour === null) return;
      if (tour.index >= tour.steps.length - 1) stopTour('done');
      else showStep(tour.index + 1);
    });
    document.addEventListener('keydown', onTourKey, true);
    root.addEventListener('resize', schedulePosition);
    root.addEventListener('scroll', schedulePosition, true);
    tour.offLocale = SG.i18n.onChange(function () {
      if (tour === null) return;
      renderTourContent();
      positionTour();
    });
    showStep(0);
    parts.next.focus();
    return true;
  }

  /**
   * Ends the running tour, remembers that it was seen (when the run persists) and returns the focus.
   * @param {string} [reason]  'skip' | 'done' | 'help' | any other label (informational).
   * @returns {boolean} Whether a tour was running.
   */
  function stopTour(reason) {
    if (tour === null) return false;
    const finished = tour;
    tour = null;
    if (finished.frame && typeof root.cancelAnimationFrame === 'function') {
      root.cancelAnimationFrame(finished.frame);
    }
    document.removeEventListener('keydown', onTourKey, true);
    root.removeEventListener('resize', schedulePosition);
    root.removeEventListener('scroll', schedulePosition, true);
    if (finished.offLocale) finished.offLocale();
    [finished.card, finished.spot].forEach(function (node) {
      if (node.parentNode) node.parentNode.removeChild(node);
    });
    if (finished.persist) {
      const storage = localStorageOrNull();
      if (storage) markSeen(storage);
    }
    if (reason !== 'help') focusAfterTour(finished.previous);
    return true;
  }

  function offerTour() {
    if (tourOffered) return;
    tourOffered = true;
    let auto = false;
    try {
      auto = app.getStore().get().auto === true;
    } catch (err) {
      auto = false;
    }
    const search = root.location ? root.location.search : '';
    if (auto || !shouldShowTour(localStorageOrNull(), search)) return;
    tourTimer = root.setTimeout(function () {
      tourTimer = null;
      if (typeof document === 'undefined' || document.querySelector('dialog[open]')) return;
      startTour({ persist: true });
    }, TOUR_DELAY_MS);
  }

  // ---------------------------------------------------------------------------------------------
  // Module hook
  // ---------------------------------------------------------------------------------------------

  /**
   * Plugs the help into the application: the Help button opens the dialog, the first visit gets the tour.
   * @param {Object} appApi  `SG.app`.
   * @returns {boolean} True when the module is running (also on a repeated call).
   */
  function init(appApi) {
    if (initialised) return true;
    if (!appApi || typeof appApi.on !== 'function') return false;
    initialised = true;
    app = appApi;
    offAction = app.on('action', function (event) {
      if (event && event.id === 'help') open();
    });
    offerTour();
    return true;
  }

  /** Removes the dialog, the tour and the listeners. */
  function destroy() {
    if (tourTimer !== null) root.clearTimeout(tourTimer);
    tourTimer = null;
    stopTour('destroy');
    close();
    if (typeof offAction === 'function') offAction();
    offAction = null;
    app = null;
    initialised = false;
    tourOffered = false;
  }

  SG.help = {
    TOUR_KEY: TOUR_KEY,
    TAB_IDS: TAB_IDS,
    init: init,
    open: open,
    close: close,
    startTour: startTour,
    stopTour: stopTour,
    isTourActive: function isTourActive() { return tour !== null; },
    destroy: destroy,
    entries: entries,
    ladder: ladder,
    steps: steps,
    shortcuts: shortcuts,
    controlsGlossary: controlsGlossary,
    illustration: illustration,
    requiredKeys: requiredKeys,
    tourSteps: tourSteps,
    shouldShowTour: shouldShowTour,
    placeCard: placeCard,
    unionRect: unionRect
  };

  // ---------------------------------------------------------------------------------------------
  // Strings of the help
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'help.title': 'Help',
      'help.tabs.label': 'Help sections',
      'help.tab.variants': 'Variants',
      'help.tab.difficulty': 'Difficulty',
      'help.tab.generation': 'How it works',
      'help.tab.shortcuts': 'Controls and keys',
      'help.tab.about': 'About',

      'help.variants.intro': 'Every variant follows the same core idea of Sudoku: fill the grid so that no ' +
        'group of cells (a row, a column, a box or a region) repeats a symbol. Open a variant to see its ' +
        'rules, its options and a picture of its board. There are {count} variants, grouped by family.',
      'help.variants.levelsNote': 'A variant only offers the levels it can generate reliably and quickly, ' +
        'so some variants have fewer than six. The levels of each variant are listed in its section; if ' +
        'you switch to a variant that lacks your current level, the level is changed for you and a note ' +
        'says so.',
      'help.variant.rules.title': 'Rules',
      'help.variant.special.title': 'What is special',
      'help.variant.options.title': 'Options',
      'help.variant.noOptions': 'This variant has no options of its own.',
      'help.variant.facts': '{digits} different symbols per row, column and region · Levels: {levels} · ' +
        'Symbol sets: {modes}',

      'help.variant.classic4.rules': 'Fill the 4×4 grid so that every row, every column and every 2×2 box ' +
        'contains each of the digits 1 to 4 exactly once. Some digits are given; you work out the others ' +
        'by logic alone, and there is always exactly one solution.',
      'help.variant.classic4.special': 'The smallest board and the quickest to generate: a good first look ' +
        'at how the generator works, and a friendly start for children (try the Shapes or Colours symbol ' +
        'sets).',
      'help.variant.classic4.figure': 'The empty 4×4 board: each box outlined in thick lines holds the ' +
        'digits 1 to 4 once.',
      'help.variant.classic6.rules': 'Fill the 6×6 grid so that every row, every column and every box ' +
        'contains each of the digits 1 to 6 exactly once. The boxes are 2 rows high and 3 columns wide.',
      'help.variant.classic6.special': 'The boxes are wider than they are tall, so a box and a row overlap ' +
        'in a different way than on the 9×9 board. A comfortable board for learning the basic techniques.',
      'help.variant.classic6.figure': 'The empty 6×6 board with its six boxes of 2 rows by 3 columns.',
      'help.variant.classic9.rules': 'The classic puzzle. Fill the 9×9 grid so that every row, every ' +
        'column and every 3×3 box contains each of the digits 1 to 9 exactly once. The given digits are ' +
        'enough to make the solution unique.',
      'help.variant.classic9.special': 'The reference variant of the generator: the difficulty scale and ' +
        'its technique ladder were tuned on this board first, and it offers all six levels.',
      'help.variant.classic9.figure': 'The empty 9×9 board with its nine 3×3 boxes.',
      'help.variant.mega12.rules': 'Fill the 12×12 grid so that every row, every column and every box ' +
        'contains each of the 12 symbols exactly once. The boxes are 3 rows high and 4 columns wide. The ' +
        'symbols are the digits 1 to 9 followed by A, B and C, or the numbers 1 to 12.',
      'help.variant.mega12.special': 'A large board: generation takes longer, and on a small screen the ' +
        'grid is wide, so scroll or zoom. The symbol set option only changes how the values are drawn; the ' +
        'puzzle itself does not change.',
      'help.variant.mega12.figure': 'The empty 12×12 board with its twelve boxes of 3 rows by 4 columns.',
      'help.variant.mega16.rules': 'Fill the 16×16 grid so that every row, every column and every 4×4 box ' +
        'contains each of the 16 symbols exactly once. By default the symbols are the hexadecimal digits 0 ' +
        'to 9 and A to F; you can use 1 to 9 and A to G instead.',
      'help.variant.mega16.special': 'The largest single-grid board, nicknamed Monster Sudoku. The cells ' +
        'are small, so use a big screen or zoom in. Expect longer generation times than on 9×9 boards; the ' +
        'page stays responsive when the generator runs in the background thread.',
      'help.variant.mega16.figure': 'The empty 16×16 board with its sixteen 4×4 boxes.',
      'help.variant.diagonalX.rules': 'Classic 9×9 rules, plus one more: each of the two long diagonals, ' +
        'from corner to corner, must also contain each of the digits 1 to 9 exactly once.',
      'help.variant.diagonalX.special': 'The diagonals are tinted on the board. Every diagonal cell has to ' +
        'satisfy four groups at once (row, column, box and diagonal), which gives the puzzle more ' +
        'deductions. The advanced option adds the four Hyper windows as well and makes a hybrid.',
      'help.variant.diagonalX.figure': 'The 9×9 board with both diagonals tinted.',
      'help.variant.hyper.rules': 'Classic 9×9 rules, plus four extra 3×3 windows, drawn shaded. Each ' +
        'window must also contain each of the digits 1 to 9 exactly once. The windows sit one cell in from ' +
        'the corners of the grid: rows and columns 2 to 4 and 6 to 8.',
      'help.variant.hyper.special': 'Also known as Windoku. The windows overlap the normal boxes, so a ' +
        'digit often has fewer places to go. The advanced option adds both diagonals as well and makes a ' +
        'hybrid.',
      'help.variant.hyper.figure': 'The 9×9 board with the four shaded windows.',
      'help.variant.jigsaw9.rules': 'The nine 3×3 boxes are replaced by nine irregular regions of nine ' +
        'cells each, drawn with thick borders. Every row, every column and every region contains each of ' +
        'the digits 1 to 9 exactly once.',
      'help.variant.jigsaw9.special': 'A different set of regions is drawn for every puzzle, so there is ' +
        'no box pattern to rely on: read the shapes. The compactness option chooses between rounded, ' +
        'compact regions and winding, snake-like ones, which are harder to read.',
      'help.variant.jigsaw9.figure': 'A sample Jigsaw layout: nine tinted regions of nine cells each.',
      'help.variant.killer.rules': 'The cells are grouped into cages, drawn with dashed outlines, and the ' +
        'small number in the corner of a cage is its sum. The digits in a cage must add up to that sum and ' +
        'may not repeat inside the cage. The usual row, column and box rules apply as well. Few or no ' +
        'digits are given.',
      'help.variant.killer.special': 'Cage techniques (Cage Sum Combination, Rule of 45, Cage Splitting) ' +
        'are part of the difficulty ladder. The generator grows the cages from the solution, checks that ' +
        'the sums pin down a single solution, and reveals a few digits when they do not; the easiest level ' +
        'reveals the most. The cage size option tilts the puzzle towards smaller or larger cages.',
      'help.variant.killer.figure': 'Part of a Killer board: dashed cages, each with its sum in the ' +
        'top-left corner.',
      'help.variant.greaterThan.rules': 'Signs between neighbouring cells tell which of the two digits is ' +
        'larger. The point of a < or > sign is on the side of the smaller digit, and it opens towards the ' +
        'larger one. The usual row, column and box rules apply as well.',
      'help.variant.greaterThan.special': 'By default signs are only placed between neighbours in the same ' +
        'box; the Futoshiki option also puts them between neighbours in different boxes. The generator ' +
        'removes signs, not only digits: it keeps just enough of them for a single solution at the chosen ' +
        'level.',
      'help.variant.greaterThan.figure': 'Part of a Greater-Than board: signs between the neighbouring ' +
        'cells of one box.',
      'help.variant.samurai.rules': 'Five 9×9 grids overlap in an X shape: four corner grids and one in ' +
        'the middle. The middle grid shares one 3×3 box with each corner grid. Every grid follows the ' +
        'classic rules, and a shared box counts for both of its grids at once. 369 cells in all.',
      'help.variant.samurai.special': 'One of the biggest boards, so generation takes a few seconds, runs ' +
        'in the background and can be cancelled. A symmetry you choose applies to the whole canvas, not to ' +
        'each grid on its own.',
      'help.variant.samurai.figure': 'The Samurai board: five overlapping 9×9 grids.',
      'help.variant.sohei.rules': 'Four 9×9 grids are arranged in a ring around an empty middle. Each grid ' +
        'shares one 3×3 box with each of its two neighbours. Every grid follows the classic rules, and a ' +
        'shared box counts for both of its grids at once. 288 cells in all.',
      'help.variant.sohei.special': 'Two corners of every grid are locked to its neighbours, so a digit ' +
        'placed in a shared box helps two grids at once. The empty centre belongs to none of the grids.',
      'help.variant.sohei.figure': 'The Sohei board: four overlapping 9×9 grids around an empty middle.',
      'help.variant.butterfly.rules': 'Four 9×9 grids, each shifted by three cells from the next, overlap ' +
        'in a central 6×6 area (144 cells in all). Every grid follows the classic rules, and a cell in an ' +
        'overlap must satisfy every grid it belongs to.',
      'help.variant.butterfly.special': 'The middle 6×6 area belongs to all four grids at once, so a digit ' +
        'placed there is checked against four grids.',
      'help.variant.butterfly.figure': 'The Butterfly board: four overlapping 9×9 grids.',
      'help.variant.flower.rules': 'Five 9×9 grids: a centre grid and four petals above, below, left and ' +
        'right of it, each shifted by three cells. A petal overlaps the centre in a band of 6×9 cells, and ' +
        'the petals overlap one another near the corners of the centre. 189 cells in all; every grid ' +
        'follows the classic rules.',
      'help.variant.flower.special': 'The densest overlap of all the variants: many cells belong to two or ' +
        'three grids, so every placement has far-reaching consequences.',
      'help.variant.flower.figure': 'The Flower board: a centre grid and four overlapping petals.',
      'help.variant.wordoku.rules': 'A 9×9 Sudoku played with nine letters instead of digits: every row, ' +
        'column and 3×3 box contains each of the nine letters exactly once. The nine letters are those of ' +
        'a hidden key word, written along one line of the solution: the main diagonal by default, or a row ' +
        'or a column.',
      'help.variant.wordoku.special': 'The word is not shown while the puzzle is unsolved; solve it to ' +
        'read it. Choose an English or a Vietnamese word list (Vietnamese words are written without ' +
        'accents, and English is used when the Vietnamese list is too short), or type a word of your own ' +
        'with nine different letters. The Digits symbol set plays the same puzzle with numbers.',
      'help.variant.wordoku.figure': 'A Wordoku board with the key word {word} written along the main ' +
        'diagonal.',

      'help.difficulty.intro': 'The difficulty of a puzzle is not a guess: it is defined by the solving ' +
        'techniques a person would need. Each level allows more advanced techniques than the one before it ' +
        'and has fewer clues. The generator only removes a clue while the puzzle can still be solved with ' +
        'the techniques of the requested level.',
      'help.difficulty.levels.title': 'The six levels',
      'help.difficulty.levels.caption': 'The levels, the technique group each one adds, the usual number ' +
        'of clues on a 9×9 board and the score band',
      'help.difficulty.col.level': 'Level',
      'help.difficulty.col.adds': 'Adds',
      'help.difficulty.col.clues': 'Clues (9×9)',
      'help.difficulty.col.score': 'Score',
      'help.difficulty.score': 'The score adds up the cost of every step needed to solve the puzzle: each ' +
        'technique has its own cost, the first use of a technique counts {multiplier} times, and every ' +
        'empty cell adds {bonus}. On larger boards the clue counts and the score bands scale with the size ' +
        'of the board.',
      'help.difficulty.scoreOpen': '{min} and more',
      'help.difficulty.ladder.title': 'The technique ladder',
      'help.difficulty.ladder.intro': 'The solver always tries the cheapest technique first. A level ' +
        'allows the techniques of its own group and of every group before it, so each rung below adds a ' +
        'few new techniques to the ones you already know.',
      'help.difficulty.level.adds': 'New at this level: {group}',
      'help.difficulty.variant.title': 'Techniques for specific variants',
      'help.difficulty.variant.intro': 'Some variants have extra rules, and extra techniques that only ' +
        'apply to them. These are available at every level of those variants.',
      'help.difficulty.variant.for': 'For: {variants}',
      'help.difficulty.guarantee.title': 'How the level is guaranteed',
      'help.difficulty.guarantee.oracle': 'While it removes clues, the generator asks one question after ' +
        'every removal: can the puzzle still be solved using only the techniques allowed at the requested ' +
        'level? If so, the clue stays removed; if not, it is put back. Every technique is a sound ' +
        'deduction, so a puzzle that can be solved this way also has exactly one solution.',
      'help.difficulty.guarantee.hardest': 'At the end the puzzle is rated. It is accepted when the ' +
        'hardest technique it needs belongs to the requested level, not to an easier one, and its score ' +
        'lies inside the band of the level. If it is still too easy, the generator starts again from a new ' +
        'solution grid, up to the maximum number of attempts in the advanced options.',
      'help.difficulty.guarantee.evil': 'The last level allows chains and trial and error, so there is no ' +
        'fixed list of techniques to check against. For that level the generator checks after every ' +
        'removal that exactly one solution remains, and rates the finished puzzle at the end.',
      'help.difficulty.guarantee.verify': 'Whatever the level, a separate solver counts the solutions of ' +
        'every finished puzzle as a safety net. A puzzle with more than one solution never reaches you.',
      'help.difficulty.closest.title': 'When the level cannot be reached',
      'help.difficulty.closest.text': 'Some combinations are hard to hit exactly, for example a strict ' +
        'symmetry together with a very high level. When no attempt reaches the requested level, you get ' +
        'the closest puzzle found, marked “{badge}”, together with the level it really reached. The puzzle ' +
        'is still valid and still has exactly one solution; only its difficulty differs. Use “{retry}” or ' +
        'raise the number of attempts.',

      'help.generation.intro': 'Every puzzle is made in seven steps, always in the same order. The ' +
        'generator runs at full speed and records everything it does; the board and the steps panel then ' +
        'replay that record at the speed you choose, so watching never slows the algorithm down.',
      'help.generation.steps.title': 'The seven steps',
      'help.generation.replay': 'Use the player under the board to play or pause the replay, move one step ' +
        'forward or back, or drag the slider to any moment. Pick a speed from Instant, which jumps to the ' +
        'finished puzzle, to Manual, which moves only when you press Next step. Click a step in the list ' +
        'to jump to its start; the explanation card shows what the step does, why, and the pseudocode that ' +
        'runs.',
      'help.generation.seed': 'The seed is the number that starts every random choice. The same seed with ' +
        'the same options always gives the same puzzle, so any puzzle can be shared and reproduced. Leave ' +
        'it empty to get a new random puzzle each time.',
      'help.generation.worker': 'When the page is served over http or https, the generator runs in a Web ' +
        'Worker, so the page stays smooth and Cancel works at once. When index.html is opened straight ' +
        'from disk, the browser does not allow workers: the generator then runs on the main thread, the ' +
        'badge says “{main}” instead of “{worker}”, and the page may freeze for a moment on large boards.',

      'help.shortcuts.intro': 'Everything can be done with the keyboard. These keys work wherever the ' +
        'focus is, unless noted.',
      'help.keys.group.general': 'Anywhere',
      'help.keys.group.replay': 'Replay',
      'help.keys.group.board': 'Board',
      'help.keys.tab': 'Move to the next or to the previous control.',
      'help.keys.activate': 'Press the focused button, or open and close a section.',
      'help.keys.escape': 'Close the open dialog, or skip the quick tour.',
      'help.keys.tabs': 'On the tabs of this dialog: switch tab, or jump to the first or the last one.',
      'help.keys.scrubber': 'On the replay slider: move one event back or forward.',
      'help.keys.scrubberEnds': 'On the replay slider: jump to the start or to the end.',
      'help.keys.cells': 'On the board: move to the neighbouring cell.',
      'help.keys.rowEnds': 'On the board: jump to the first or the last cell of the row.',
      'help.keys.boardEnds': 'On the board: jump to the first or the last cell of the whole board.',
      'help.keys.pages': 'On the board: move several rows up or down at once.',
      'help.controls.title': 'The controls',
      'help.controls.intro': 'The options panel on the left (the Options bar on a phone) chooses what is ' +
        'generated; the buttons under it start the generation. These are the controls and the replay speeds.',
      'help.controls.variant': 'Pick one of the variants. Its own options appear under it.',
      'help.controls.difficulty': 'How demanding the techniques needed to solve the puzzle are. A variant ' +
        'that lacks a level moves to the nearest one it offers.',
      'help.controls.symmetry': 'Clues are removed in matching groups, so the pattern of the given cells ' +
        'is symmetric. A stricter symmetry makes the highest levels harder to reach.',
      'help.controls.symbolMode': 'Only changes how the values are drawn (digits, letters, colours with ' +
        'shapes, or shapes). The puzzle does not change.',

      'help.about.privacy.title': 'Privacy',
      'help.about.privacy.text': 'Everything runs inside your browser. Puzzles are generated on your own ' +
        'device and nothing is sent to a server; there are no accounts, no trackers and no cookies. The ' +
        'only things kept are small items in the local storage of your browser: your language, theme and ' +
        'last options, whether you have seen the quick tour, and a few recently generated puzzles, so that ' +
        'the same one can be shown again at once. \u201cPlay online\u201d opens the separate sudoku-player ' +
        'page in a new tab; the puzzle travels only inside the address, after the \u201c#\u201d, which a ' +
        'browser never sends to a server.',
      'help.about.repro.title': 'Sharing and reproducing a puzzle',
      'help.about.repro.text': 'The seed together with the variant, the level and the options fully ' +
        'determines the puzzle, and the address bar keeps them. Copy the link, or use the Export button, ' +
        'and anyone who opens it gets exactly the same puzzle. Add auto=1 to a link to generate as soon as ' +
        'the page loads. For example:',
      'help.about.tech.title': 'Built with',
      'help.about.tech.text': 'Plain HTML, CSS and JavaScript: no framework, no build step and no external ' +
        'library. Once the files are on your computer it also works offline: open index.html directly, or ' +
        'serve the folder with any static web server.',
      'help.about.tour.title': 'Quick tour',
      'help.about.tour.text': 'A short walk over the page that shows where to choose a puzzle, how to ' +
        'generate it and how to watch it being built. It appears only the first time you visit.',
      'help.about.credits.title': 'Credits and licence',
      'help.about.credits.text': 'See the project repository for the source code, the documentation and ' +
        'the licence.',

      'help.tour.label': 'Quick tour',
      'help.tour.progress': 'Step {n} of {total}',
      'help.tour.skip': 'Skip tour',
      'help.tour.done': 'Got it',
      'help.tour.again': 'Show the tour again',
      'help.tour.step.controls.title': 'Choose what to generate',
      'help.tour.step.controls.text': 'Pick a variant and a difficulty here, and a seed if you want to ' +
        'reproduce a puzzle exactly. On a phone, open the Options bar at the bottom of the screen.',
      'help.tour.step.generate.title': 'Generate a puzzle',
      'help.tour.step.generate.text': 'Press Generate. The puzzle is made in a moment, and everything the ' +
        'generator did is recorded so that you can watch it.',
      'help.tour.step.board.title': 'Watch it being built',
      'help.tour.step.board.text': 'The board shows the puzzle. Use the player under it to play, pause, ' +
        'step forward or back, or drag the slider; the speed buttons go from Instant to Manual.',
      'help.tour.step.steps.title': 'Follow the steps',
      'help.tour.step.steps.text': 'The seven steps of the generation are listed here, each with an ' +
        'explanation. Click one to jump to it. Open Help at any time for the rules of every variant, or to ' +
        'see this tour again.'
    },
    vi: {
      'help.title': 'Trợ giúp',
      'help.tabs.label': 'Các mục trợ giúp',
      'help.tab.variants': 'Biến thể',
      'help.tab.difficulty': 'Độ khó',
      'help.tab.generation': 'Cách hoạt động',
      'help.tab.shortcuts': 'Điều khiển và phím tắt',
      'help.tab.about': 'Giới thiệu',

      'help.variants.intro': 'Mọi biến thể đều theo cùng một ý tưởng của Sudoku: điền vào lưới sao cho ' +
        'không có nhóm ô nào (hàng, cột, khối hay vùng) lặp lại một ký hiệu. Hãy mở từng biến thể để xem ' +
        'luật chơi, các tùy chọn và hình minh họa bảng của nó. Có tất cả {count} biến thể, xếp theo nhóm.',
      'help.variants.levelsNote': 'Mỗi biến thể chỉ cung cấp những mức độ khó mà nó tạo được một cách ổn ' +
        'định và nhanh chóng, nên một số biến thể có ít hơn sáu mức. Các mức của từng biến thể được liệt ' +
        'kê ngay trong phần của nó; nếu bạn chuyển sang biến thể không có mức hiện tại, mức độ khó sẽ được ' +
        'đổi giúp bạn kèm một ghi chú.',
      'help.variant.rules.title': 'Luật chơi',
      'help.variant.special.title': 'Điểm đặc biệt',
      'help.variant.options.title': 'Tùy chọn',
      'help.variant.noOptions': 'Biến thể này không có tùy chọn riêng.',
      'help.variant.facts': '{digits} ký hiệu khác nhau trên mỗi hàng, cột và vùng · Mức độ khó: {levels} ' +
        '· Bộ ký hiệu: {modes}',

      'help.variant.classic4.rules': 'Điền vào lưới 4×4 sao cho mỗi hàng, mỗi cột và mỗi khối 2×2 đều chứa ' +
        'các chữ số từ 1 đến 4, mỗi số đúng một lần. Một số ô đã được cho sẵn; bạn chỉ dùng suy luận để ' +
        'tìm các ô còn lại, và luôn chỉ có đúng một lời giải.',
      'help.variant.classic4.special': 'Bảng nhỏ nhất và tạo nhanh nhất: rất hợp để xem lần đầu bộ sinh ' +
        'hoạt động ra sao, cũng là khởi đầu nhẹ nhàng cho trẻ em (hãy thử bộ ký hiệu Hình khối hoặc Màu ' +
        'sắc).',
      'help.variant.classic4.figure': 'Bảng 4×4 trống: mỗi khối viền nét đậm chứa các chữ số từ 1 đến 4, ' +
        'mỗi số một lần.',
      'help.variant.classic6.rules': 'Điền vào lưới 6×6 sao cho mỗi hàng, mỗi cột và mỗi khối đều chứa các ' +
        'chữ số từ 1 đến 6, mỗi số đúng một lần. Mỗi khối cao 2 hàng và rộng 3 cột.',
      'help.variant.classic6.special': 'Khối rộng hơn chiều cao, nên khối và hàng giao nhau theo cách khác ' +
        'với bảng 9×9. Một bảng dễ chịu để làm quen với các kỹ thuật cơ bản.',
      'help.variant.classic6.figure': 'Bảng 6×6 trống với sáu khối, mỗi khối 2 hàng × 3 cột.',
      'help.variant.classic9.rules': 'Câu đố kinh điển. Điền vào lưới 9×9 sao cho mỗi hàng, mỗi cột và mỗi ' +
        'khối 3×3 đều chứa các chữ số từ 1 đến 9, mỗi số đúng một lần. Các số cho sẵn vừa đủ để lời giải ' +
        'là duy nhất.',
      'help.variant.classic9.special': 'Biến thể chuẩn của bộ sinh: thang độ khó và các bậc kỹ thuật được ' +
        'chỉnh trước hết trên bảng này, và nó có đủ cả sáu mức.',
      'help.variant.classic9.figure': 'Bảng 9×9 trống với chín khối 3×3.',
      'help.variant.mega12.rules': 'Điền vào lưới 12×12 sao cho mỗi hàng, mỗi cột và mỗi khối đều chứa đủ ' +
        '12 ký hiệu, mỗi ký hiệu đúng một lần. Mỗi khối cao 3 hàng và rộng 4 cột. Các ký hiệu là chữ số từ ' +
        '1 đến 9 rồi đến A, B, C, hoặc các số từ 1 đến 12.',
      'help.variant.mega12.special': 'Bảng lớn: việc tạo đề lâu hơn, và trên màn hình nhỏ lưới khá rộng ' +
        'nên hãy cuộn hoặc thu phóng. Tùy chọn bộ ký hiệu chỉ đổi cách vẽ các giá trị; bản thân câu đố ' +
        'không thay đổi.',
      'help.variant.mega12.figure': 'Bảng 12×12 trống với mười hai khối, mỗi khối 3 hàng × 4 cột.',
      'help.variant.mega16.rules': 'Điền vào lưới 16×16 sao cho mỗi hàng, mỗi cột và mỗi khối 4×4 đều chứa ' +
        'đủ 16 ký hiệu, mỗi ký hiệu đúng một lần. Mặc định các ký hiệu là chữ số hệ thập lục phân từ 0 đến ' +
        '9 và từ A đến F; bạn cũng có thể dùng từ 1 đến 9 và từ A đến G.',
      'help.variant.mega16.special': 'Bảng một lưới lớn nhất, còn gọi là Sudoku Quái vật. Các ô khá nhỏ ' +
        'nên hãy dùng màn hình lớn hoặc phóng to. Thời gian tạo đề lâu hơn bảng 9×9; trang vẫn mượt khi bộ ' +
        'sinh chạy ở luồng nền.',
      'help.variant.mega16.figure': 'Bảng 16×16 trống với mười sáu khối 4×4.',
      'help.variant.diagonalX.rules': 'Luật Sudoku 9×9 cổ điển, thêm một luật nữa: mỗi đường chéo dài, từ ' +
        'góc này sang góc đối diện, cũng phải chứa các chữ số từ 1 đến 9, mỗi số đúng một lần.',
      'help.variant.diagonalX.special': 'Hai đường chéo được tô màu trên bảng. Mỗi ô nằm trên đường chéo ' +
        'phải thỏa mãn cùng lúc bốn nhóm (hàng, cột, khối và đường chéo), nên đề có nhiều suy luận hơn. ' +
        'Tùy chọn nâng cao thêm cả bốn cửa sổ của Hyper để tạo ra một biến thể lai.',
      'help.variant.diagonalX.figure': 'Bảng 9×9 với hai đường chéo được tô màu.',
      'help.variant.hyper.rules': 'Luật Sudoku 9×9 cổ điển, thêm bốn cửa sổ 3×3 được tô bóng. Mỗi cửa sổ ' +
        'cũng phải chứa các chữ số từ 1 đến 9, mỗi số đúng một lần. Các cửa sổ nằm lùi vào một ô so với ' +
        'các góc của lưới: hàng và cột 2 đến 4 và 6 đến 8.',
      'help.variant.hyper.special': 'Còn gọi là Windoku. Các cửa sổ chồng lên những khối thông thường nên ' +
        'một chữ số thường có ít chỗ đặt hơn. Tùy chọn nâng cao thêm cả hai đường chéo để tạo ra một biến ' +
        'thể lai.',
      'help.variant.hyper.figure': 'Bảng 9×9 với bốn cửa sổ được tô bóng.',
      'help.variant.jigsaw9.rules': 'Chín khối 3×3 được thay bằng chín vùng không đều, mỗi vùng gồm chín ô ' +
        'và có viền đậm. Mỗi hàng, mỗi cột và mỗi vùng đều chứa các chữ số từ 1 đến 9, mỗi số đúng một lần.',
      'help.variant.jigsaw9.special': 'Mỗi đề có một bộ vùng khác nhau nên không có khuôn khối nào để dựa ' +
        'vào: hãy đọc hình dạng của chúng. Tùy chọn độ gọn chọn giữa các vùng tròn trịa, gọn gàng và các ' +
        'vùng ngoằn ngoèo như con rắn, khó nhìn hơn.',
      'help.variant.jigsaw9.figure': 'Một bố cục Jigsaw mẫu: chín vùng tô màu, mỗi vùng chín ô.',
      'help.variant.killer.rules': 'Các ô được gom thành những lồng viền nét đứt, và con số nhỏ ở góc lồng ' +
        'là tổng của nó. Các chữ số trong một lồng phải cộng lại bằng tổng đó và không được lặp lại trong ' +
        'lồng. Các luật hàng, cột và khối thông thường vẫn áp dụng. Hầu như không có chữ số cho sẵn.',
      'help.variant.killer.special': 'Các kỹ thuật về lồng (Tổ hợp tổng của lồng, Quy tắc 45, Tách lồng) ' +
        'là một phần của bậc thang độ khó. Bộ sinh tạo lồng từ lời giải, kiểm tra xem các tổng có xác định ' +
        'đúng một lời giải hay không, và mở thêm vài chữ số khi chưa đủ; mức dễ nhất mở nhiều nhất. Tùy ' +
        'chọn kích thước lồng nghiêng đề về các lồng nhỏ hơn hoặc lớn hơn.',
      'help.variant.killer.figure': 'Một phần bảng Killer: các lồng nét đứt, mỗi lồng ghi tổng ở góc trên ' +
        'bên trái.',
      'help.variant.greaterThan.rules': 'Các dấu giữa hai ô cạnh nhau cho biết chữ số nào lớn hơn. Đầu ' +
        'nhọn của dấu < hoặc > hướng về phía chữ số nhỏ hơn và mở ra phía chữ số lớn hơn. Các luật hàng, ' +
        'cột và khối thông thường vẫn áp dụng.',
      'help.variant.greaterThan.special': 'Mặc định các dấu chỉ đặt giữa những ô cạnh nhau trong cùng một ' +
        'khối; tùy chọn Futoshiki đặt thêm cả giữa các ô cạnh nhau thuộc hai khối khác nhau. Bộ sinh bỏ ' +
        'bớt dấu chứ không chỉ bỏ chữ số: nó chỉ giữ đủ số dấu để có một lời giải duy nhất ở mức đã chọn.',
      'help.variant.greaterThan.figure': 'Một phần bảng So sánh: các dấu giữa những ô cạnh nhau trong một ' +
        'khối.',
      'help.variant.samurai.rules': 'Năm lưới 9×9 chồng lên nhau theo hình chữ X: bốn lưới ở góc và một ' +
        'lưới ở giữa. Lưới giữa dùng chung một khối 3×3 với từng lưới góc. Mỗi lưới theo luật cổ điển, và ' +
        'khối dùng chung được tính cho cả hai lưới cùng lúc. Tổng cộng 369 ô.',
      'help.variant.samurai.special': 'Một trong những bảng lớn nhất, nên việc tạo đề mất vài giây, chạy ở ' +
        'nền và có thể hủy. Kiểu đối xứng bạn chọn áp dụng cho toàn bộ khung chứ không phải riêng từng lưới.',
      'help.variant.samurai.figure': 'Bảng Samurai: năm lưới 9×9 chồng lên nhau.',
      'help.variant.sohei.rules': 'Bốn lưới 9×9 xếp thành một vòng quanh một khoảng trống ở giữa. Mỗi lưới ' +
        'dùng chung một khối 3×3 với từng lưới trong hai lưới bên cạnh. Mỗi lưới theo luật cổ điển, và ' +
        'khối dùng chung được tính cho cả hai lưới cùng lúc. Tổng cộng 288 ô.',
      'help.variant.sohei.special': 'Hai góc của mỗi lưới gắn chặt với các lưới bên cạnh, nên một chữ số ' +
        'đặt trong khối dùng chung giúp được cả hai lưới cùng lúc. Khoảng trống ở giữa không thuộc lưới nào.',
      'help.variant.sohei.figure': 'Bảng Sohei: bốn lưới 9×9 chồng lên nhau quanh một khoảng trống ở giữa.',
      'help.variant.butterfly.rules': 'Bốn lưới 9×9, mỗi lưới lệch ba ô so với lưới kế tiếp, chồng lên ' +
        'nhau ở một vùng 6×6 ở giữa (tổng cộng 144 ô). Mỗi lưới theo luật cổ điển, và một ô nằm trong vùng ' +
        'chồng phải thỏa mãn mọi lưới chứa nó.',
      'help.variant.butterfly.special': 'Vùng 6×6 ở giữa thuộc cả bốn lưới cùng lúc, nên một chữ số đặt ở ' +
        'đó được kiểm tra theo bốn lưới.',
      'help.variant.butterfly.figure': 'Bảng Cánh bướm: bốn lưới 9×9 chồng lên nhau.',
      'help.variant.flower.rules': 'Năm lưới 9×9: một lưới ở giữa và bốn cánh hoa ở phía trên, dưới, trái, ' +
        'phải của nó, mỗi cánh lệch ba ô. Một cánh chồng lên lưới giữa ở một dải 6×9 ô, và các cánh còn ' +
        'chồng lên nhau gần các góc của lưới giữa. Tổng cộng 189 ô; mỗi lưới theo luật cổ điển.',
      'help.variant.flower.special': 'Mức chồng lấn dày đặc nhất trong các biến thể: nhiều ô thuộc hai ' +
        'hoặc ba lưới, nên mỗi lần đặt số đều kéo theo nhiều hệ quả.',
      'help.variant.flower.figure': 'Bảng Bông hoa: một lưới giữa và bốn cánh hoa chồng lên nhau.',
      'help.variant.wordoku.rules': 'Một câu Sudoku 9×9 chơi bằng chín chữ cái thay cho chữ số: mỗi hàng, ' +
        'cột và khối 3×3 đều chứa đủ chín chữ cái, mỗi chữ đúng một lần. Chín chữ cái là các chữ của một ' +
        'từ khóa ẩn, được viết dọc theo một đường của lời giải: mặc định là đường chéo chính, hoặc một ' +
        'hàng hay một cột.',
      'help.variant.wordoku.special': 'Từ khóa không hiện khi đề chưa giải xong; giải xong bạn sẽ đọc được ' +
        'nó. Bạn có thể chọn danh sách từ tiếng Anh hoặc tiếng Việt (từ tiếng Việt viết không dấu, và nếu ' +
        'danh sách tiếng Việt quá ngắn thì dùng tiếng Anh), hoặc tự nhập một từ gồm chín chữ cái khác ' +
        'nhau. Bộ ký hiệu Chữ số chơi cùng câu đố đó bằng số.',
      'help.variant.wordoku.figure': 'Một bảng Wordoku với từ khóa {word} viết dọc theo đường chéo chính.',

      'help.difficulty.intro': 'Độ khó của một đề không phải là phỏng đoán: nó được xác định bởi các kỹ ' +
        'thuật giải mà người chơi cần dùng. Mỗi mức cho phép những kỹ thuật nâng cao hơn mức trước và có ' +
        'ít số cho sẵn hơn. Bộ sinh chỉ bỏ một số cho sẵn khi đề vẫn giải được bằng các kỹ thuật của mức ' +
        'đã chọn.',
      'help.difficulty.levels.title': 'Sáu mức độ khó',
      'help.difficulty.levels.caption': 'Các mức độ khó, nhóm kỹ thuật mà mỗi mức bổ sung, số lượng số cho ' +
        'sẵn thường gặp trên bảng 9×9 và dải điểm',
      'help.difficulty.col.level': 'Mức độ',
      'help.difficulty.col.adds': 'Bổ sung',
      'help.difficulty.col.clues': 'Số cho sẵn (9×9)',
      'help.difficulty.col.score': 'Điểm',
      'help.difficulty.score': 'Điểm số cộng chi phí của mọi bước cần để giải đề: mỗi kỹ thuật có chi phí ' +
        'riêng, lần dùng đầu tiên của một kỹ thuật được nhân {multiplier}, và mỗi ô trống cộng thêm ' +
        '{bonus}. Với bảng lớn hơn, số lượng số cho sẵn và các dải điểm được co giãn theo kích thước bảng.',
      'help.difficulty.scoreOpen': 'từ {min} trở lên',
      'help.difficulty.ladder.title': 'Bậc thang kỹ thuật',
      'help.difficulty.ladder.intro': 'Bộ giải luôn thử kỹ thuật rẻ nhất trước. Mỗi mức cho phép các kỹ ' +
        'thuật của nhóm riêng nó và của mọi nhóm trước đó, nên mỗi bậc bên dưới bổ sung vài kỹ thuật mới ' +
        'vào những kỹ thuật bạn đã biết.',
      'help.difficulty.level.adds': 'Mới ở mức này: {group}',
      'help.difficulty.variant.title': 'Kỹ thuật dành riêng cho từng biến thể',
      'help.difficulty.variant.intro': 'Một số biến thể có thêm luật, và có thêm các kỹ thuật chỉ áp dụng ' +
        'cho chúng. Những kỹ thuật này có ở mọi mức của các biến thể đó.',
      'help.difficulty.variant.for': 'Dành cho: {variants}',
      'help.difficulty.guarantee.title': 'Mức độ khó được đảm bảo như thế nào',
      'help.difficulty.guarantee.oracle': 'Khi bỏ bớt số cho sẵn, sau mỗi lần bỏ bộ sinh đặt một câu hỏi: ' +
        'đề có còn giải được chỉ bằng các kỹ thuật cho phép ở mức đã chọn không? Nếu có, số đó được giữ ở ' +
        'trạng thái đã bỏ; nếu không, nó được đặt lại. Mọi kỹ thuật đều là suy luận chắc chắn đúng, nên ' +
        'một đề giải được theo cách này cũng có đúng một lời giải.',
      'help.difficulty.guarantee.hardest': 'Cuối cùng đề được chấm điểm. Đề được chấp nhận khi kỹ thuật ' +
        'khó nhất mà nó cần thuộc đúng mức đã chọn chứ không phải mức dễ hơn, và điểm số nằm trong dải của ' +
        'mức đó. Nếu đề vẫn còn quá dễ, bộ sinh làm lại từ một lưới lời giải mới, tối đa bằng số lần thử ' +
        'trong phần tùy chọn nâng cao.',
      'help.difficulty.guarantee.evil': 'Mức cuối cùng cho phép dùng chuỗi suy luận và thử–sai, nên không ' +
        'có danh sách kỹ thuật cố định để đối chiếu. Với mức này, sau mỗi lần bỏ số bộ sinh kiểm tra rằng ' +
        'vẫn còn đúng một lời giải, và chấm điểm đề hoàn chỉnh ở cuối.',
      'help.difficulty.guarantee.verify': 'Ở mọi mức, một bộ giải riêng còn đếm số lời giải của từng đề ' +
        'hoàn chỉnh như một lớp bảo vệ. Một đề có nhiều hơn một lời giải sẽ không bao giờ đến tay bạn.',
      'help.difficulty.closest.title': 'Khi không đạt được mức độ yêu cầu',
      'help.difficulty.closest.text': 'Một số tổ hợp rất khó đạt chính xác, chẳng hạn kiểu đối xứng chặt ' +
        'kết hợp với mức rất cao. Khi không lần thử nào đạt mức yêu cầu, bạn nhận được đề gần nhất tìm ' +
        'được, đánh dấu “{badge}”, kèm mức mà nó thực sự đạt. Đề vẫn hợp lệ và vẫn có đúng một lời giải; ' +
        'chỉ độ khó là khác. Hãy dùng “{retry}” hoặc tăng số lần thử.',

      'help.generation.intro': 'Mỗi đề được tạo qua bảy bước, luôn theo cùng một thứ tự. Bộ sinh chạy hết ' +
        'tốc độ và ghi lại mọi việc nó làm; bảng và khung các bước sau đó phát lại bản ghi ấy với tốc độ ' +
        'bạn chọn, nên việc xem không bao giờ làm thuật toán chậm đi.',
      'help.generation.steps.title': 'Bảy bước',
      'help.generation.replay': 'Dùng bộ phát bên dưới bảng để phát hoặc tạm dừng, lùi hay tiến một bước, ' +
        'hoặc kéo thanh trượt đến bất kỳ thời điểm nào. Chọn tốc độ từ Tức thì, nhảy thẳng đến đề hoàn ' +
        'chỉnh, đến Thủ công, chỉ chuyển bước khi bạn bấm Bước tiếp theo. Bấm vào một bước trong danh sách ' +
        'để nhảy đến đầu bước đó; thẻ giải thích cho biết bước đó làm gì, vì sao, và đoạn mã giả đang chạy.',
      'help.generation.seed': 'Seed là con số khởi động mọi lựa chọn ngẫu nhiên. Cùng seed và cùng tùy ' +
        'chọn sẽ luôn cho ra cùng một đề, nên đề nào cũng có thể chia sẻ và tạo lại. Để trống nếu bạn muốn ' +
        'mỗi lần một đề ngẫu nhiên mới.',
      'help.generation.worker': 'Khi trang được phục vụ qua http hoặc https, bộ sinh chạy trong Web Worker ' +
        'nên trang luôn mượt và nút Hủy có tác dụng ngay. Khi mở trực tiếp index.html từ ổ đĩa, trình ' +
        'duyệt không cho dùng worker: bộ sinh khi đó chạy trên luồng chính, huy hiệu ghi “{main}” thay vì ' +
        '“{worker}”, và trang có thể khựng một lúc với bảng lớn.',

      'help.shortcuts.intro': 'Mọi thao tác đều làm được bằng bàn phím. Các phím này dùng được ở bất kỳ ' +
        'đâu con trỏ đang đứng, trừ khi có ghi chú khác.',
      'help.keys.group.general': 'Ở mọi nơi',
      'help.keys.group.replay': 'Phát lại',
      'help.keys.group.board': 'Bảng',
      'help.keys.tab': 'Chuyển đến điều khiển kế tiếp hoặc phía trước.',
      'help.keys.activate': 'Bấm nút đang được chọn, hoặc mở và đóng một mục.',
      'help.keys.escape': 'Đóng hộp thoại đang mở, hoặc bỏ qua phần hướng dẫn nhanh.',
      'help.keys.tabs': 'Trên các thẻ của hộp thoại này: chuyển thẻ, hoặc nhảy đến thẻ đầu hay thẻ cuối.',
      'help.keys.scrubber': 'Trên thanh trượt phát lại: lùi hoặc tiến một sự kiện.',
      'help.keys.scrubberEnds': 'Trên thanh trượt phát lại: nhảy đến đầu hoặc cuối.',
      'help.keys.cells': 'Trên bảng: chuyển sang ô bên cạnh.',
      'help.keys.rowEnds': 'Trên bảng: nhảy đến ô đầu hoặc ô cuối của hàng.',
      'help.keys.boardEnds': 'Trên bảng: nhảy đến ô đầu hoặc ô cuối của toàn bộ bảng.',
      'help.keys.pages': 'Trên bảng: lên hoặc xuống nhiều hàng cùng lúc.',
      'help.controls.title': 'Các điều khiển',
      'help.controls.intro': 'Bảng tùy chọn bên trái (thanh Tùy chọn trên điện thoại) quyết định đề được ' +
        'tạo ra thế nào; các nút bên dưới bắt đầu việc tạo đề. Đây là các điều khiển và các tốc độ phát lại.',
      'help.controls.variant': 'Chọn một biến thể. Các tùy chọn riêng của nó hiện ngay bên dưới.',
      'help.controls.difficulty': 'Các kỹ thuật cần dùng để giải đề đòi hỏi nhiều đến đâu. Biến thể nào ' +
        'không có mức đó sẽ chuyển sang mức gần nhất mà nó có.',
      'help.controls.symmetry': 'Các số cho sẵn được bỏ theo từng nhóm tương ứng, nên hình dạng các ô cho ' +
        'sẵn đối xứng. Đối xứng càng chặt thì các mức cao nhất càng khó đạt.',
      'help.controls.symbolMode': 'Chỉ đổi cách vẽ các giá trị (chữ số, chữ cái, màu kèm hình, hoặc hình ' +
        'khối). Câu đố không thay đổi.',

      'help.about.privacy.title': 'Quyền riêng tư',
      'help.about.privacy.text': 'Mọi thứ chạy ngay trong trình duyệt của bạn. Đề được tạo trên chính ' +
        'thiết bị của bạn và không có gì được gửi đến máy chủ; không có tài khoản, không theo dõi và không ' +
        'dùng cookie. Chỉ có một vài mục nhỏ được lưu trong bộ nhớ cục bộ của trình duyệt: ngôn ngữ, giao ' +
        'diện và các tùy chọn gần nhất của bạn, việc bạn đã xem hướng dẫn nhanh hay chưa, và vài đề vừa tạo ' +
        'để có thể hiện lại ngay. “Chơi trực tuyến” mở trang sudoku-player riêng trong một thẻ mới; đề chỉ ' +
        'nằm trong địa chỉ, sau dấu “#”, phần mà trình duyệt không bao giờ gửi đến máy chủ.',
      'help.about.repro.title': 'Chia sẻ và tạo lại một đề',
      'help.about.repro.text': 'Seed cùng với biến thể, mức độ khó và các tùy chọn xác định hoàn toàn đề, ' +
        'và thanh địa chỉ luôn giữ chúng. Hãy sao chép liên kết, hoặc dùng nút Xuất đề, và bất kỳ ai mở nó ' +
        'cũng nhận được đúng đề đó. Thêm auto=1 vào liên kết để tạo đề ngay khi trang tải xong. Ví dụ:',
      'help.about.tech.title': 'Được xây dựng bằng',
      'help.about.tech.text': 'HTML, CSS và JavaScript thuần: không framework, không bước biên dịch và ' +
        'không thư viện ngoài. Khi các tệp đã có trên máy, trang cũng chạy được khi không có mạng: mở trực ' +
        'tiếp index.html, hoặc phục vụ thư mục bằng bất kỳ máy chủ web tĩnh nào.',
      'help.about.tour.title': 'Hướng dẫn nhanh',
      'help.about.tour.text': 'Một vòng ngắn trên trang cho thấy nơi chọn đề, cách tạo đề và cách xem đề ' +
        'được dựng ra sao. Nó chỉ xuất hiện ở lần đầu bạn truy cập.',
      'help.about.credits.title': 'Ghi công và giấy phép',
      'help.about.credits.text': 'Hãy xem kho mã nguồn của dự án để biết mã nguồn, tài liệu và giấy phép.',

      'help.tour.label': 'Hướng dẫn nhanh',
      'help.tour.progress': 'Bước {n} trên {total}',
      'help.tour.skip': 'Bỏ qua',
      'help.tour.done': 'Đã hiểu',
      'help.tour.again': 'Xem lại hướng dẫn nhanh',
      'help.tour.step.controls.title': 'Chọn đề cần tạo',
      'help.tour.step.controls.text': 'Chọn biến thể và độ khó ở đây, thêm seed nếu bạn muốn tạo lại chính ' +
        'xác một đề. Trên điện thoại, hãy mở thanh Tùy chọn ở cuối màn hình.',
      'help.tour.step.generate.title': 'Tạo một đề',
      'help.tour.step.generate.text': 'Bấm Tạo đề. Đề được tạo trong chốc lát, và mọi việc bộ sinh đã làm ' +
        'đều được ghi lại để bạn có thể xem.',
      'help.tour.step.board.title': 'Xem đề được dựng ra sao',
      'help.tour.step.board.text': 'Bảng hiện đề. Dùng bộ phát bên dưới để phát, tạm dừng, tiến hoặc lùi ' +
        'một bước, hay kéo thanh trượt; các nút tốc độ đi từ Tức thì đến Thủ công.',
      'help.tour.step.steps.title': 'Theo dõi từng bước',
      'help.tour.step.steps.text': 'Bảy bước của quá trình tạo đề được liệt kê ở đây, mỗi bước kèm một lời ' +
        'giải thích. Bấm vào một bước để nhảy đến đó. Mở Trợ giúp bất cứ lúc nào để xem luật của mọi biến ' +
        'thể, hoặc để xem lại hướng dẫn này.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
