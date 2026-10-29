/**
 * `SG.help`: the Help dialog, opened by the Help button (`action { id: 'help' }`) through the optional-module
 * hook of js/ui/app.js (`init(SG.app)`). Five tabs: variant rules, difficulty and the technique ladder, how
 * generation works, controls and keys, about. Texts are locale keys `help.*`; what the registries already
 * know (variant names, options, levels, technique names and descriptions, step names) is READ from them and
 * never copied, so the help cannot drift away from the code.
 *
 * Pure helpers (no DOM, used by the tests): `entries`, `ladder`, `steps`, `shortcuts`, `controlsGlossary`,
 * `illustration`, `requiredKeys` (every translation key the help reads, own and foreign). API: init(app) ->
 * boolean (idempotent), open(options?) (the modal handle of `SG.app.openModal`, or null without a DOM /
 * before init; `options.tab`: 'variants' | 'difficulty' | 'generation' | 'shortcuts' | 'about';
 * `options.variantId` opens that variant on the variants tab), close(), destroy(), `illustration(id)` -> `{
 * variantId, width, height, viewBox, markup, cells }` or null.
 *
 * Keycaps ("Esc", "Ctrl", arrows) are printed on the keyboard and are the same in both languages, so they
 * live in `shortcuts()` as plain text; everything else goes through `SG.i18n.t`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.help && typeof SG.help.init === 'function') return;

  const TAB_IDS = Object.freeze(['variants', 'difficulty', 'generation', 'shortcuts', 'about']);
  const SVG_SAMPLE_SEED = 11;
  const SAMPLE_WORD = 'SUNFLOWER';

  const hasOwn = Object.prototype.hasOwnProperty;

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  /**
   * The picture each variant gets: 'board' draws the empty board of the variant (regions, diagonals, windows,
   * overlapping grids); 'killer', 'signs' and 'word' are small samples of what is special. Every registered
   * variant needs an entry here AND the keys `help.variant.<id>.rules|special|figure`
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
   * The help entry of one variant definition: `{ id, generic, nameKey, groupId, groupKey, summaryKey,
   * rulesKey, specialKey, figureKey, figure, digits, levels, symbolModes, options: [{ id, labelKey, hintKey
   * }], keys }`. `generic` is true when the help has no hand-written text for the variant: the dialog then
   * shows its name, summary and options only, and the test suite reports the missing entry.
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

  /** One entry per variant, in registry order (`variantList`: default `SG.variants.list()`). */
  function entries(variantList) {
    const list = Array.isArray(variantList) ? variantList : SG.variants.list();
    return list.map(entryOf);
  }

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
   * SVG markup from the board renderer (so it follows the board theme): Killer and Greater-Than show the
   * top-left box of a sample puzzle, Wordoku a board with its key word, others the empty board. `markup` goes
   * inside an `<svg class="sgb" viewBox="...">`; null when the renderer is missing or the variant cannot be
   * drawn.
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

  function techniqueItem(tech) {
    const weights = SG.difficulty && SG.difficulty.WEIGHTS ? SG.difficulty.WEIGHTS : {};
    return {
      id: tech.id,
      nameKey: 'technique.' + tech.id,
      descKey: 'technique.' + tech.id + '.desc',
      group: tech.group,
      order: tech.order,
      points: Object.prototype.hasOwnProperty.call(weights, tech.id) ? weights[tech.id] : null,
      variants: Array.isArray(tech.variantScope) ? tech.variantScope.slice() : []
    };
  }

  function byOrder(a, b) {
    return a.order - b.order;
  }

  /**
   * The difficulty ladder as the registries define it: one row per level with its score band and the 9x9 clue
   * range, and the techniques that can first appear at that level. A technique of p points adds at least 1.25
   * x p to the score (`SG.difficulty.SCORING.peakBound`), so it can first appear in the band whose upper edge
   * lies above that: the pruning rule of `SG.difficulty.spec`. The techniques of a level are listed in the
   * order the solver tries them; the levels at the top add none.
   * Returns { levels, variantGroups, scoring }: `levels[i]` is `{ level, nameKey, descKey, groups, groupKeys,
   * techniques, minClues, maxClues, minScore, maxScore }` (`maxScore` is Infinity for the last level);
   * `variantGroups` holds the groups with a `variantScope` (`{ group, groupKey, techniques }`). Every
   * technique item has its `points`.
   */
  function ladder() {
    const D = SG.difficulty;
    const all = SG.techniques.list().map(techniqueItem).sort(byOrder);
    const table = D.TABLE;
    const bound = D.SCORING.peakBound;
    const levels = D.LEVELS.map(function (level, i) {
      const row = table[i] || {};
      const next = table[i + 1];
      const max = next ? next.min : Infinity;
      const techniques = all.filter(function (x) {
        if (x.variants.length > 0 || x.points === null) return false;
        const lowest = bound * x.points;
        return lowest < max && (i === 0 || lowest >= row.min);
      });
      const groups = [];
      techniques.forEach(function (x) { if (groups.indexOf(x.group) === -1) groups.push(x.group); });
      return {
        level: level,
        nameKey: 'difficulty.' + level,
        descKey: 'difficulty.' + level + '.desc',
        groups: groups,
        groupKeys: groups.map(function (g) { return 'techniqueGroup.' + g; }),
        techniques: techniques,
        minClues: row.minClues,
        maxClues: row.maxClues,
        minScore: row.min,
        maxScore: max
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

  /** Groups of shortcuts; `keys` lists alternatives, each a list of keycaps pressed together. */
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

  /** `{ labelKey, textKey }` pairs of existing keys (the hints of the form are reused, not copied). */
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
      pair('generate', 'shell.btn.generate', 'shell.btn.generate.title'),
      pair('regenerate', 'shell.btn.regenerate', 'shell.btn.regenerate.title'),
      pair('export', 'shell.btn.export', 'shell.btn.export.title'),
      pair('exportCode', 'shell.btn.exportCode', 'shell.btn.exportCode.title'),
      pair('replay', 'shell.player.heading', 'help.controls.replay')
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
    'help.difficulty.level.none',
    'help.difficulty.variant.title', 'help.difficulty.variant.intro', 'help.difficulty.variant.for',
    'help.difficulty.guarantee.title', 'help.difficulty.guarantee.oracle',
    'help.difficulty.guarantee.hardest', 'help.difficulty.guarantee.nightmare', 'help.difficulty.guarantee.verify',
    'help.difficulty.closest.title', 'help.difficulty.closest.text',
    'help.generation.intro', 'help.generation.steps.title', 'help.generation.steps.hint',
    'help.generation.steps.hint.none', 'help.generation.current', 'help.generation.replay',
    'help.generation.worker', 'help.generation.seed',
    'help.shortcuts.intro', 'help.keys.group.general', 'help.keys.group.replay', 'help.keys.group.board',
    'help.keys.tab', 'help.keys.activate', 'help.keys.escape',
    'help.keys.tabs', 'help.keys.scrubber', 'help.keys.scrubberEnds', 'help.keys.cells', 'help.keys.rowEnds',
    'help.keys.boardEnds', 'help.keys.pages', 'help.controls.title', 'help.controls.intro',
    'help.controls.variant', 'help.controls.difficulty', 'help.controls.symmetry', 'help.controls.symbolMode',
    'help.controls.replay',
    'help.about.privacy.title', 'help.about.privacy.text', 'help.about.repro.title', 'help.about.repro.text',
    'help.about.tech.title', 'help.about.tech.text', 'help.about.credits.title', 'help.about.credits.text',
  ]);

  function requiredKeys() {
    const set = new Set(UI_KEYS);
    const add = function (key) { if (typeof key === 'string' && key !== '') set.add(key); };
    entries().forEach(function (e) { e.keys.forEach(add); });
    const lad = ladder();
    lad.levels.forEach(function (row) {
      add(row.nameKey);
      add(row.descKey);
      row.groupKeys.forEach(add);
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

  function reducedMotion() {
    try {
      if (document.documentElement.getAttribute('data-motion') === 'off') return true;
      return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (err) {
      return false;
    }
  }

  let app = null;
  let initialised = false;
  let offAction = null;

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

  /**
   * Like the form tooltips: a blank line starts a paragraph, `**text**` is bold. DOM nodes, never innerHTML.
   */
  function richText(text) {
    return String(text).split(/\n{2,}/).map(function (paragraph) {
      const parts = [];
      paragraph.split(/\*\*(.+?)\*\*/).forEach(function (part, i) {
        if (part === '') return;
        parts.push(i % 2 === 1 ? h('strong', { text: part }) : part);
      });
      return h('p', {}, parts);
    });
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
          o.hintKey !== null ? h('div', { class: 'help-list__hint' }, richText(t(o.hintKey))) : null
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

  function groupNames(row) {
    return row.groupKeys.length > 0 ? row.groupKeys.map(function (key) { return t(key); }).join(', ')
      : '\u2014';
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
        h('td', { text: groupNames(row) }),
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
      factor: num(lad.scoring.workFactor), max: num(lad.scoring.emptyCellMax),
      half: num(lad.scoring.emptyCellHalf)
    }) }));

    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.difficulty.ladder.title') }));
    const bound = num(lad.scoring.peakBound);
    panel.appendChild(h('p', { text: t('help.difficulty.ladder.intro', { bound: bound }) }));
    lad.levels.forEach(function (row, i) {
      panel.appendChild(h('section', { class: 'help-rung', 'aria-labelledby': 'help-rung-' + row.level }, [
        h('h4', { class: 'help__h4', id: 'help-rung-' + row.level }, [
          h('span', { class: 'help-rung__index', 'aria-hidden': 'true', text: String(i + 1) }),
          h('span', { text: t(row.nameKey) })
        ]),
        h('p', { text: t(row.descKey) }),
        h('p', { class: 'help-rung__adds', text: row.groups.length > 0
          ? t('help.difficulty.level.adds', { group: groupNames(row) })
          : t('help.difficulty.level.none') }),
        row.techniques.length > 0 ? techniqueList(row.techniques, false) : null
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
    ['oracle', 'hardest', 'nightmare', 'verify'].forEach(function (part) {
      panel.appendChild(h('p', { text: t('help.difficulty.guarantee.' + part) }));
    });
    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.difficulty.closest.title') }));
    panel.appendChild(h('p', { text: t('help.difficulty.closest.text', {
      badge: t('result.warning.approximate.badge'), retry: t('result.warning.retry')
    }) }));
  }

  /** The pipeline step the replay shows now, for the "current" mark (null without a replay). */
  function explainContext() {
    if (app === null || typeof app.getExplainContext !== 'function') return null;
    return safely(function () { return app.getExplainContext(); }) || null;
  }

  function destroyCards() {
    if (dialog === null) return;
    dialog.cards.forEach(function (card) { safely(function () { card.destroy(); }); });
    dialog.cards = [];
  }

  /** Fills the body of a step once: the explanation card with the highlighted line of the current step. */
  function ensureStepCard(details, ctx) {
    const body = details.querySelector('.help-step__body');
    if (!body || body.firstChild || !SG.explainCard || typeof SG.explainCard.create !== 'function') return;
    const id = details.getAttribute('data-step');
    const card = SG.explainCard.create(body, { compact: true });
    const current = ctx !== null && ctx.stepId === id;
    card.show(id, current ? { lineLabel: ctx.lineLabel, metrics: ctx.metrics } : { lineLabel: null });
    dialog.cards.push(card);
  }

  function stepDetails(s, index, ctx) {
    const isCurrent = ctx !== null && ctx.stepId === s.id;
    const isOpen = dialog.openSteps.has(s.id);
    const details = h('details', {
      class: 'disclosure help-step', id: 'help-step-' + s.id, 'data-step': s.id,
      'data-current': isCurrent ? 'true' : null, open: isOpen
    }, [
      h('summary', {}, [
        h('span', { class: 'help-step__num', 'aria-hidden': 'true', text: String(index + 1) }),
        h('span', { class: 'help-step__name', text: t(s.nameKey) }),
        h('span', { class: 'help-step__what', text: t(s.whatKey) }),
        isCurrent ? h('span', { class: 'help-step__current', text: t('help.generation.current', {
          position: ctx.position, length: ctx.length
        }) }) : null
      ]),
      h('div', { class: 'disclosure__body help-step__body' })
    ]);
    details.addEventListener('toggle', function () {
      if (details.open) {
        dialog.openSteps.add(s.id);
        ensureStepCard(details, ctx);
      } else {
        dialog.openSteps.delete(s.id);
      }
    });
    if (isOpen) ensureStepCard(details, ctx);
    return details;
  }

  function renderGeneration(panel) {
    destroyCards();
    const ctx = explainContext();
    // The first time the tab is drawn, the step the replay shows is the one that is open.
    if (!dialog.stepsSeeded) {
      dialog.stepsSeeded = true;
      if (ctx !== null) dialog.openSteps.add(ctx.stepId);
    }
    panel.appendChild(h('p', { class: 'help__lead', text: t('help.generation.intro') }));
    panel.appendChild(h('h3', { class: 'help__h3', text: t('help.generation.steps.title') }));
    panel.appendChild(h('p', { class: 'text-muted', text: t(ctx === null
      ? 'help.generation.steps.hint.none' : 'help.generation.steps.hint') }));
    panel.appendChild(h('div', { class: 'help-steplist' }, steps().map(function (s, i) {
      return stepDetails(s, i, ctx);
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
    const done = h('button', { type: 'button', class: 'btn btn--primary', 'data-role': 'help-close',
      text: t('common.close') });
    done.addEventListener('click', function () { close(); });
    dialog.footerClose = done;
    container.appendChild(done);
  }

  function relocalise() {
    if (dialog === null) return;
    dialog.rendered.clear();
    TAB_IDS.forEach(function (id) { dialog.tabs[id].textContent = t('help.tab.' + id); });
    dialog.tabs[TAB_IDS[0]].parentNode.setAttribute('aria-label', t('help.tabs.label'));
    if (dialog.footerClose) dialog.footerClose.textContent = t('common.close');
    const top = dialog.scroller.scrollTop;
    renderPanel(dialog.tab);
    dialog.scroller.scrollTop = top;
  }

  function open(options) {
    if (typeof document === 'undefined' || app === null || typeof app.openModal !== 'function') return null;
    const o = options || {};
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
      openSteps: new Set(), stepsSeeded: false, cards: [],
      tab: wantTab || 'variants', footerClose: null, offLocale: null
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
        state.cards.forEach(function (card) { safely(function () { card.destroy(); }); });
        state.cards = [];
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

  function close() {
    if (dialog !== null && dialog.handle) dialog.handle.close();
  }

  function init(appApi) {
    if (initialised) return true;
    if (!appApi || typeof appApi.on !== 'function') return false;
    initialised = true;
    app = appApi;
    offAction = app.on('action', function (event) {
      if (event && event.id === 'help') open(event.tab ? { tab: event.tab } : undefined);
    });
    return true;
  }

  function destroy() {
    close();
    if (typeof offAction === 'function') offAction();
    offAction = null;
    app = null;
    initialised = false;
  }

  SG.help = {
    init: init,
    open: open,
    close: close,
    destroy: destroy,
    entries: entries,
    ladder: ladder,
    steps: steps,
    shortcuts: shortcuts,
    controlsGlossary: controlsGlossary,
    illustration: illustration,
    requiredKeys: requiredKeys
  };

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
        'so some variants have fewer than nine, and a list can skip a level. The levels of each variant ' +
        'are listed in its section; if ' +
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
        'in a different way from the 9×9 board. A comfortable board for learning the basic techniques.',
      'help.variant.classic6.figure': 'The empty 6×6 board with its six boxes of 2 rows by 3 columns.',
      'help.variant.classic9.rules': 'The classic puzzle. Fill the 9×9 grid so that every row, every ' +
        'column and every 3×3 box contains each of the digits 1 to 9 exactly once. The given digits are ' +
        'enough to make the solution unique.',
      'help.variant.classic9.special': 'The reference variant of the generator: the difficulty scale and ' +
        'its technique ladder were tuned on this board first.',
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
        'diacritics, and English is used when the Vietnamese list is too short), or type a word of your ' +
        'own with nine different letters. The Digits symbol set plays the same puzzle with numbers.',
      'help.variant.wordoku.figure': 'A Wordoku board with the key word {word} written along the main ' +
        'diagonal.',

      'help.difficulty.intro': 'The difficulty of a puzzle is not a guess: it is computed from the solving ' +
        'techniques a person would need and from the number of empty cells, with the same formula on every ' +
        'board. Every technique has points, and the score decides the level. The generator only removes a ' +
        'clue while the puzzle can still be solved with techniques that fit the requested level.',
      'help.difficulty.levels.title': 'The nine levels',
      'help.difficulty.levels.caption': 'The levels, the technique groups that can first appear at each ' +
        'one, the usual number of clues on a 9×9 board and the score band',
      'help.difficulty.col.level': 'Level',
      'help.difficulty.col.adds': 'Adds',
      'help.difficulty.col.clues': 'Clues (9×9)',
      'help.difficulty.col.score': 'Score',
      'help.difficulty.score': 'The score counts the points of the hardest technique the puzzle needs once ' +
        'in full, adds {factor} × those points × log₂(1 + work ÷ those points), where the work adds up ' +
        'points × uses of every technique, and adds {max} × E ÷ (E + {half}) for the E cells that are ' +
        'empty at the start (at most {max}). The score bands are the same on every board; only the clue ' +
        'counts scale with the size of the board.',
      'help.difficulty.scoreOpen': '{min} and more',
      'help.difficulty.ladder.title': 'The technique ladder',
      'help.difficulty.ladder.intro': 'The solver always tries the techniques in a fixed priority order. ' +
        'A technique adds at least {bound} times its points to the score, so it can first appear at the ' +
        'level whose band reaches above that. Each rung below lists the techniques that can first appear ' +
        'there; what a level typically uses is in its description.',
      'help.difficulty.level.adds': 'Can first appear at this level: {group}',
      'help.difficulty.level.none': 'No new technique: these scores come from more of the hardest steps.',
      'help.difficulty.variant.title': 'Techniques for specific variants',
      'help.difficulty.variant.intro': 'Some variants have extra rules, and extra techniques that only ' +
        'apply to them. They have points like every other technique and count in the score the same way.',
      'help.difficulty.variant.for': 'For: {variants}',
      'help.difficulty.guarantee.title': 'How the level is guaranteed',
      'help.difficulty.guarantee.oracle': 'While it removes clues, the generator asks one question after ' +
        'every removal: can the puzzle still be solved using only techniques that fit the requested level, ' +
        'without its score going past the top of the band? If so, the clue stays removed; if not, it is ' +
        'put back. Every technique is a sound deduction, so a puzzle that can be solved this way also has ' +
        'exactly one solution.',
      'help.difficulty.guarantee.hardest': 'At the end the puzzle is rated with every technique. It is ' +
        'accepted when the solver finishes it by logic and its score lies inside the band of the requested ' +
        'level. If not, the generator tries another dig, searches nearby (showing, removing or swapping ' +
        'clues, and on Killer reshaping cages), or starts again from a new solution grid, up to the ' +
        'maximum number of attempts in the advanced options.',
      'help.difficulty.guarantee.nightmare': 'For the highest levels the generator also digs quickly with only ' +
        'a uniqueness check, and when that puzzle comes out too hard it shows clues again until the score ' +
        'falls into the band. Whatever the path, a puzzle is only accepted when the solver can finish it ' +
        'by logic.',
      'help.difficulty.guarantee.verify': 'Whatever the level, a separate solver counts the solutions of ' +
        'every finished puzzle as a safety net. A puzzle with more than one solution never reaches you.',
      'help.difficulty.closest.title': 'When the level cannot be reached',
      'help.difficulty.closest.text': 'Some combinations are hard to hit exactly, for example a strict ' +
        'symmetry together with a very high level. When no attempt reaches the requested level, you get ' +
        'the closest puzzle found, marked “{badge}”, together with the level it really reached. The puzzle ' +
        'is still valid and still has exactly one solution; only its difficulty differs. Use “{retry}” or ' +
        'raise the number of attempts.',

      'help.generation.intro': 'Every puzzle is made in seven steps, always in the same order. The ' +
        'generator runs them at full speed and keeps a short log of what it did. The replay under the ' +
        'board is built from that log: it shows the steps you can see on the board, not every internal ' +
        'step, so watching never slows the algorithm down.',
      'help.generation.steps.title': 'The seven steps',
      'help.generation.steps.hint': 'Open a step to read what it does, why and how, with its pseudocode. ' +
        'The step that the replay shows now is marked and open: its running line is highlighted.',
      'help.generation.steps.hint.none': 'Open a step to read what it does, why and how, with its ' +
        'pseudocode. Generate a puzzle and step through its replay to see which step is current.',
      'help.generation.current': 'Now: replay step {position} of {length}',
      'help.generation.replay': 'As soon as a puzzle is ready, the board shows it; nothing plays by ' +
        'itself. The Generation steps tab then prepares a score table for every step (in the background; ' +
        'when the page has no background worker, for example opened from a file, press Prepare score ' +
        'tables first). Use First step, Previous step, Next step and Last step under the board, or drag ' +
        'the slider, to see how the puzzle was made: the full solution, the cages or the signs (Killer ' +
        'and Greater-Than only), the removals chosen at random, the removals the generator chose with ' +
        'its own check, any adjustments, and the finished puzzle. The steps are chosen so that the score ' +
        'rises steadily and never goes down; tick Show all moves to see each recorded change on its own, ' +
        'including changes that lowered the score. Every step has a score table; a position that cannot be ' +
        'rated shows its status and attempted techniques instead of a total. The Explain button opens this ' +
        'page at the step on show. On the board, an amber frame marks the cells whose clues were cleared in ' +
        'the step, a dashed red frame the cells put back, and a dotted frame the clues shown again. When the ' +
        'score jumps (at least three times as high and at least 100 points more), the step shows a ' +
        '\u201cScore jump\u201d badge and explains why; Why? opens the numbers behind it, and a frame marks ' +
        'the clue or sign that causes the jump when there is exactly one.',
      'help.generation.seed': 'The seed is the number that starts every random choice. With the same ' +
        'version of the generator, the same seed with the same options always gives the same puzzle, so ' +
        'any puzzle can be shared and reproduced; a link or a history entry made by an older version may ' +
        'give a different puzzle. Leave it empty to get a new random puzzle each time.',
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
      'help.keys.escape': 'Close the open dialog.',
      'help.keys.tabs': 'On the tabs of this dialog: switch tab, or jump to the first or the last one.',
      'help.keys.scrubber': 'On the replay slider: move one step back or forward.',
      'help.keys.scrubberEnds': 'On the replay slider: jump to the start or to the end.',
      'help.keys.cells': 'On the board: move to the neighbouring cell.',
      'help.keys.rowEnds': 'On the board: jump to the first or the last cell of the row.',
      'help.keys.boardEnds': 'On the board: jump to the first or the last cell of the whole board.',
      'help.keys.pages': 'On the board: move several rows up or down at once.',
      'help.controls.title': 'The controls',
      'help.controls.intro': 'The options panel on the left (the Options bar on a phone) chooses what is ' +
        'generated; the buttons under it start the generation. These are the controls, including the ' +
        'replay under the board.',
      'help.controls.variant': 'Pick one of the variants. Its own options appear under it.',
      'help.controls.difficulty': 'How demanding the techniques needed to solve the puzzle are. A variant ' +
        'that lacks a level moves to the nearest one it offers.',
      'help.controls.symmetry': 'Clues are removed in matching groups, so the pattern of the given cells ' +
        'is symmetric. A stricter symmetry makes the highest levels harder to reach.',
      'help.controls.symbolMode': 'Only changes how the values are drawn (digits, letters, colours with ' +
        'shapes, or shapes). The puzzle does not change.',
      'help.controls.replay': 'Under the board, First step and Last step jump to the beginning or the end ' +
        'of the replay, Previous step and Next step move one step at a time, and the slider goes straight ' +
        'to any step. The label beside them tells which step is shown. Show all moves switches between ' +
        'the steps chosen for a steady score and every recorded change, and keeps the replay at the same ' +
        'point of the generation. When the page has no background worker, these controls wait until ' +
        'Prepare score tables has been pressed and preparation has finished.',

      'help.about.privacy.title': 'Privacy',
      'help.about.privacy.text': 'Everything runs inside your browser. Puzzles are generated on your own ' +
        'device and nothing is sent to a server; there are no accounts, no trackers and no cookies. The ' +
        'only things kept are small items in the local storage of your browser: your language, theme and ' +
        'last options, and a few recently generated puzzles, so that the same one can be shown again at ' +
        'once. “Play” opens the separate Sudoku Player page in a new tab; the puzzle travels only inside ' +
        'the address, after the “#”, which a browser never sends to a server.',
      'help.about.repro.title': 'Sharing and reproducing a puzzle',
      'help.about.repro.text': 'The seed together with the variant, the level and the options fully ' +
        'determines the puzzle, and the address bar keeps them. Copy the link, ' +
        'and anyone who opens it gets exactly the same puzzle. Add auto=1 to a link to generate as soon as ' +
        'the page loads. For example:',
      'help.about.tech.title': 'Built with',
      'help.about.tech.text': 'Plain HTML, CSS and JavaScript: no framework, no build step and no external ' +
        'library. Once the files are on your computer it also works offline: open index.html directly, or ' +
        'serve the folder with any static web server.',
      'help.about.credits.title': 'Credits and licence',
      'help.about.credits.text': 'See the project repository for the source code, the documentation and ' +
        'the licence.'
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
        'luật chơi, các tùy chọn và hình minh họa bàn cờ của nó. Có tất cả {count} biến thể, xếp theo nhóm.',
      'help.variants.levelsNote': 'Mỗi biến thể chỉ cung cấp những mức độ khó mà nó tạo được một cách ổn ' +
        'định và nhanh chóng, nên một số biến thể có ít hơn chín mức, và danh sách có thể bỏ qua một mức. ' +
        'Các mức của từng biến thể được liệt ' +
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
      'help.variant.classic4.special': 'Bàn cờ nhỏ nhất và tạo nhanh nhất: rất hợp để xem lần đầu trình ' +
        'sinh đề hoạt động ra sao, cũng là khởi đầu nhẹ nhàng cho trẻ em (hãy thử bộ ký hiệu Hình dạng ' +
        'hoặc Màu sắc).',
      'help.variant.classic4.figure': 'Bàn cờ 4×4 trống: mỗi khối viền nét đậm chứa các chữ số từ 1 đến 4, ' +
        'mỗi số một lần.',
      'help.variant.classic6.rules': 'Điền vào lưới 6×6 sao cho mỗi hàng, mỗi cột và mỗi khối đều chứa các ' +
        'chữ số từ 1 đến 6, mỗi số đúng một lần. Mỗi khối cao 2 hàng và rộng 3 cột.',
      'help.variant.classic6.special': 'Khối rộng hơn chiều cao, nên khối và hàng giao nhau theo cách khác ' +
        'với bàn cờ 9×9. Một bàn cờ dễ chịu để làm quen với các kỹ thuật cơ bản.',
      'help.variant.classic6.figure': 'Bàn cờ 6×6 trống với sáu khối, mỗi khối 2 hàng × 3 cột.',
      'help.variant.classic9.rules': 'Đề cổ điển. Điền vào lưới 9×9 sao cho mỗi hàng, mỗi cột và mỗi ' +
        'khối 3×3 đều chứa các chữ số từ 1 đến 9, mỗi số đúng một lần. Các số cho sẵn vừa đủ để lời giải ' +
        'là duy nhất.',
      'help.variant.classic9.special': 'Biến thể chuẩn của trình sinh đề: thang độ khó và các bậc kỹ thuật ' +
        'được chỉnh trước hết trên bàn cờ này.',
      'help.variant.classic9.figure': 'Bàn cờ 9×9 trống với chín khối 3×3.',
      'help.variant.mega12.rules': 'Điền vào lưới 12×12 sao cho mỗi hàng, mỗi cột và mỗi khối đều chứa đủ ' +
        '12 ký hiệu, mỗi ký hiệu đúng một lần. Mỗi khối cao 3 hàng và rộng 4 cột. Các ký hiệu là chữ số từ ' +
        '1 đến 9 rồi đến A, B, C, hoặc các số từ 1 đến 12.',
      'help.variant.mega12.special': 'Bàn cờ lớn: việc tạo đề lâu hơn, và trên màn hình nhỏ lưới khá rộng ' +
        'nên hãy cuộn hoặc thu phóng. Tùy chọn bộ ký hiệu chỉ đổi cách vẽ các giá trị; bản thân đề không ' +
        'thay đổi.',
      'help.variant.mega12.figure': 'Bàn cờ 12×12 trống với mười hai khối, mỗi khối 3 hàng × 4 cột.',
      'help.variant.mega16.rules': 'Điền vào lưới 16×16 sao cho mỗi hàng, mỗi cột và mỗi khối 4×4 đều chứa ' +
        'đủ 16 ký hiệu, mỗi ký hiệu đúng một lần. Mặc định các ký hiệu là chữ số hệ thập lục phân từ 0 đến ' +
        '9 và từ A đến F; bạn cũng có thể dùng từ 1 đến 9 và từ A đến G.',
      'help.variant.mega16.special': 'Bàn cờ một lưới lớn nhất, còn gọi là Sudoku Quái vật. Các ô khá nhỏ ' +
        'nên hãy dùng màn hình lớn hoặc phóng to. Thời gian tạo đề lâu hơn bàn cờ 9×9; trang vẫn mượt khi ' +
        'trình sinh đề chạy ở luồng nền.',
      'help.variant.mega16.figure': 'Bàn cờ 16×16 trống với mười sáu khối 4×4.',
      'help.variant.diagonalX.rules': 'Luật Sudoku 9×9 cổ điển, thêm một luật nữa: mỗi đường chéo dài, từ ' +
        'góc này sang góc đối diện, cũng phải chứa các chữ số từ 1 đến 9, mỗi số đúng một lần.',
      'help.variant.diagonalX.special': 'Hai đường chéo được tô màu trên bàn cờ. Mỗi ô nằm trên đường chéo ' +
        'phải thỏa mãn cùng lúc bốn nhóm (hàng, cột, khối và đường chéo), nên đề có nhiều suy luận hơn. ' +
        'Tùy chọn nâng cao thêm cả bốn vùng siêu của Sudoku Siêu vùng để tạo ra một biến thể lai.',
      'help.variant.diagonalX.figure': 'Bàn cờ 9×9 với hai đường chéo được tô màu.',
      'help.variant.hyper.rules': 'Luật Sudoku 9×9 cổ điển, thêm bốn vùng siêu 3×3 được tô màu. Mỗi vùng ' +
        'siêu cũng phải chứa các chữ số từ 1 đến 9, mỗi số đúng một lần. Các vùng siêu nằm lùi vào một ô ' +
        'so với các góc của lưới: hàng và cột 2 đến 4 và 6 đến 8.',
      'help.variant.hyper.special': 'Còn gọi là Windoku. Các vùng siêu chồng lên những khối thông thường ' +
        'nên một chữ số thường có ít chỗ đặt hơn. Tùy chọn nâng cao thêm cả hai đường chéo để tạo ra một ' +
        'biến thể lai.',
      'help.variant.hyper.figure': 'Bàn cờ 9×9 với bốn vùng siêu được tô màu.',
      'help.variant.jigsaw9.rules': 'Chín khối 3×3 được thay bằng chín vùng không đều, mỗi vùng gồm chín ô ' +
        'và có viền đậm. Mỗi hàng, mỗi cột và mỗi vùng đều chứa các chữ số từ 1 đến 9, mỗi số đúng một lần.',
      'help.variant.jigsaw9.special': 'Mỗi đề có một bộ vùng khác nhau nên không có khuôn khối nào để dựa ' +
        'vào: hãy đọc hình dạng của chúng. Tùy chọn độ gọn chọn giữa các vùng tròn trịa, gọn gàng và các ' +
        'vùng ngoằn ngoèo như con rắn, khó nhìn hơn.',
      'help.variant.jigsaw9.figure': 'Một bố cục Ghép hình mẫu: chín vùng tô màu, mỗi vùng chín ô.',
      'help.variant.killer.rules': 'Các ô được gom thành những lồng viền nét đứt, và con số nhỏ ở góc lồng ' +
        'là tổng của nó. Các chữ số trong một lồng phải cộng lại bằng tổng đó và không được lặp lại trong ' +
        'lồng. Các luật hàng, cột và khối thông thường vẫn áp dụng. Hầu như không có chữ số cho sẵn.',
      'help.variant.killer.special': 'Các kỹ thuật về lồng (Tổ hợp tổng lồng, Quy tắc 45, Tách lồng) là ' +
        'một phần của bậc thang độ khó. Trình sinh đề tạo lồng từ lời giải, kiểm tra xem các tổng có xác ' +
        'định đúng một lời giải hay không, và mở thêm vài chữ số khi chưa đủ; mức dễ nhất mở nhiều nhất. ' +
        'Tùy chọn cỡ lồng nghiêng đề về các lồng nhỏ hơn hoặc lớn hơn.',
      'help.variant.killer.figure': 'Một phần bàn cờ Sát thủ: các lồng nét đứt, mỗi lồng ghi tổng ở góc ' +
        'trên bên trái.',
      'help.variant.greaterThan.rules': 'Các dấu giữa hai ô cạnh nhau cho biết chữ số nào lớn hơn. Đầu ' +
        'nhọn của dấu < hoặc > hướng về phía chữ số nhỏ hơn và mở ra phía chữ số lớn hơn. Các luật hàng, ' +
        'cột và khối thông thường vẫn áp dụng.',
      'help.variant.greaterThan.special': 'Mặc định các dấu chỉ đặt giữa những ô cạnh nhau trong cùng một ' +
        'khối; tùy chọn Futoshiki đặt thêm cả giữa các ô cạnh nhau thuộc hai khối khác nhau. Trình sinh đề ' +
        'bỏ bớt dấu chứ không chỉ bỏ chữ số: nó chỉ giữ đủ số dấu để có một lời giải duy nhất ở mức đã ' +
        'chọn.',
      'help.variant.greaterThan.figure': 'Một phần bàn cờ So sánh: các dấu giữa những ô cạnh nhau trong ' +
        'một khối.',
      'help.variant.samurai.rules': 'Năm lưới 9×9 chồng lên nhau theo hình chữ X: bốn lưới ở góc và một ' +
        'lưới ở giữa. Lưới giữa dùng chung một khối 3×3 với từng lưới góc. Mỗi lưới theo luật cổ điển, và ' +
        'khối dùng chung được tính cho cả hai lưới cùng lúc. Tổng cộng 369 ô.',
      'help.variant.samurai.special': 'Một trong những bàn cờ lớn nhất, nên việc tạo đề mất vài giây, chạy ' +
        'ở nền và có thể hủy. Kiểu đối xứng bạn chọn áp dụng cho toàn bộ khung chứ không phải riêng từng ' +
        'lưới.',
      'help.variant.samurai.figure': 'Bàn cờ Samurai: năm lưới 9×9 chồng lên nhau.',
      'help.variant.sohei.rules': 'Bốn lưới 9×9 xếp thành một vòng quanh một khoảng trống ở giữa. Mỗi lưới ' +
        'dùng chung một khối 3×3 với từng lưới trong hai lưới bên cạnh. Mỗi lưới theo luật cổ điển, và ' +
        'khối dùng chung được tính cho cả hai lưới cùng lúc. Tổng cộng 288 ô.',
      'help.variant.sohei.special': 'Hai góc của mỗi lưới gắn chặt với các lưới bên cạnh, nên một chữ số ' +
        'đặt trong khối dùng chung giúp được cả hai lưới cùng lúc. Khoảng trống ở giữa không thuộc lưới nào.',
      'help.variant.sohei.figure': 'Bàn cờ Sohei: bốn lưới 9×9 chồng lên nhau quanh một khoảng trống ở ' +
        'giữa.',
      'help.variant.butterfly.rules': 'Bốn lưới 9×9, mỗi lưới lệch ba ô so với lưới kế tiếp, chồng lên ' +
        'nhau ở một vùng 6×6 ở giữa (tổng cộng 144 ô). Mỗi lưới theo luật cổ điển, và một ô nằm trong vùng ' +
        'chồng phải thỏa mãn mọi lưới chứa nó.',
      'help.variant.butterfly.special': 'Vùng 6×6 ở giữa thuộc cả bốn lưới cùng lúc, nên một chữ số đặt ở ' +
        'đó được kiểm tra theo bốn lưới.',
      'help.variant.butterfly.figure': 'Bàn cờ Cánh bướm: bốn lưới 9×9 chồng lên nhau.',
      'help.variant.flower.rules': 'Năm lưới 9×9: một lưới ở giữa và bốn cánh hoa ở phía trên, dưới, trái, ' +
        'phải của nó, mỗi cánh lệch ba ô. Một cánh chồng lên lưới giữa ở một dải 6×9 ô, và các cánh còn ' +
        'chồng lên nhau gần các góc của lưới giữa. Tổng cộng 189 ô; mỗi lưới theo luật cổ điển.',
      'help.variant.flower.special': 'Mức chồng lấn dày đặc nhất trong các biến thể: nhiều ô thuộc hai ' +
        'hoặc ba lưới, nên mỗi lần đặt số đều kéo theo nhiều hệ quả.',
      'help.variant.flower.figure': 'Bàn cờ Bông hoa: một lưới giữa và bốn cánh hoa chồng lên nhau.',
      'help.variant.wordoku.rules': 'Một đề Sudoku 9×9 chơi bằng chín chữ cái thay cho chữ số: mỗi hàng, ' +
        'cột và khối 3×3 đều chứa đủ chín chữ cái, mỗi chữ đúng một lần. Chín chữ cái là các chữ của một ' +
        'từ khóa ẩn, được viết dọc theo một đường của lời giải: mặc định là đường chéo chính, hoặc một ' +
        'hàng hay một cột.',
      'help.variant.wordoku.special': 'Từ khóa không hiện khi đề chưa giải xong; giải xong bạn sẽ đọc được ' +
        'nó. Bạn có thể chọn kho từ tiếng Anh hoặc tiếng Việt (từ tiếng Việt viết không dấu, và nếu kho từ ' +
        'tiếng Việt quá ít từ thì dùng tiếng Anh), hoặc tự nhập một từ gồm chín chữ cái khác nhau. Bộ ký ' +
        'hiệu Chữ số chơi cùng đề đó bằng số.',
      'help.variant.wordoku.figure': 'Một bàn cờ Sudoku Chữ với từ khóa {word} viết dọc theo đường chéo ' +
        'chính.',

      'help.difficulty.intro': 'Độ khó của một đề không phải là phỏng đoán: nó được tính từ các kỹ thuật ' +
        'giải mà người chơi cần dùng và từ số ô trống, với cùng một công thức trên mọi bàn cờ. Mỗi kỹ ' +
        'thuật có một số điểm, và điểm số quyết định mức độ. Trình sinh đề chỉ bỏ một số cho sẵn khi đề ' +
        'vẫn giải được bằng các kỹ thuật phù hợp với mức đã chọn.',
      'help.difficulty.levels.title': 'Chín mức độ khó',
      'help.difficulty.levels.caption': 'Các mức độ khó, các nhóm kỹ thuật có thể bắt đầu xuất hiện ở mỗi ' +
        'mức, số lượng số cho sẵn thường gặp trên bàn cờ 9×9 và dải điểm',
      'help.difficulty.col.level': 'Mức độ',
      'help.difficulty.col.adds': 'Bổ sung',
      'help.difficulty.col.clues': 'Số cho sẵn (9×9)',
      'help.difficulty.col.score': 'Điểm',
      'help.difficulty.score': 'Điểm số tính đủ một lần điểm của kỹ thuật khó nhất mà đề cần, cộng ' +
        '{factor} × số điểm đó × log₂(1 + khối lượng ÷ số điểm đó), trong đó khối lượng là tổng điểm × số ' +
        'lần dùng của mọi kỹ thuật, và cộng {max} × E ÷ (E + {half}) cho E ô trống ban đầu (tối đa {max}). ' +
        'Các dải điểm giống nhau trên mọi bàn cờ; chỉ số lượng số cho sẵn được co giãn theo kích thước bàn ' +
        'cờ.',
      'help.difficulty.scoreOpen': 'từ {min} trở lên',
      'help.difficulty.ladder.title': 'Bậc thang kỹ thuật',
      'help.difficulty.ladder.intro': 'Bộ giải luôn thử các kỹ thuật theo một thứ tự ưu tiên cố định. ' +
        'Một kỹ thuật cộng vào điểm ít nhất {bound} lần số điểm của nó, nên nó chỉ có thể bắt đầu xuất ' +
        'hiện ở mức có dải điểm vượt quá giá trị đó. Mỗi bậc bên dưới liệt kê các kỹ thuật có thể bắt ' +
        'đầu xuất hiện ở đó; những gì một mức thường dùng nằm trong phần mô tả của mức.',
      'help.difficulty.level.adds': 'Có thể bắt đầu xuất hiện ở mức này: {group}',
      'help.difficulty.level.none': 'Không có kỹ thuật mới: điểm cao hơn đến từ nhiều bước khó hơn.',
      'help.difficulty.variant.title': 'Kỹ thuật dành riêng cho từng biến thể',
      'help.difficulty.variant.intro': 'Một số biến thể có thêm luật, và có thêm các kỹ thuật chỉ áp dụng ' +
        'cho chúng. Chúng cũng có điểm như mọi kỹ thuật khác và được tính vào điểm số theo cùng một cách.',
      'help.difficulty.variant.for': 'Dành cho: {variants}',
      'help.difficulty.guarantee.title': 'Mức độ khó được đảm bảo như thế nào',
      'help.difficulty.guarantee.oracle': 'Khi bỏ bớt số cho sẵn, sau mỗi lần bỏ, trình sinh đề đặt một ' +
        'câu hỏi: đề có còn giải được chỉ bằng các kỹ thuật phù hợp với mức đã chọn, mà điểm không vượt ' +
        'quá đầu trên của dải không? Nếu có, số đó được giữ ở trạng thái đã bỏ; nếu không, nó được đặt ' +
        'lại. Mọi kỹ thuật đều là suy luận chắc chắn đúng, nên một đề giải được theo cách này cũng có đúng ' +
        'một lời giải.',
      'help.difficulty.guarantee.hardest': 'Cuối cùng đề được chấm điểm với mọi kỹ thuật. Đề được chấp ' +
        'nhận khi bộ giải giải hết được đề bằng suy luận và điểm số nằm trong dải của mức đã chọn. Nếu ' +
        'không, trình sinh đề thử một lần đào khác, tìm quanh đó (hiện lại, bỏ hoặc đổi số cho sẵn, và với ' +
        'Sudoku Sát thủ thì đổi hình các lồng), hoặc làm lại từ một lưới lời giải mới, tối đa bằng số lần ' +
        'thử trong phần tùy chọn nâng cao.',
      'help.difficulty.guarantee.nightmare': 'Với các mức cao nhất, trình sinh đề còn đào nhanh chỉ với ' +
        'phép kiểm tra lời giải duy nhất, và khi đề đó ra quá khó thì hiện lại số cho sẵn cho đến khi điểm ' +
        'rơi vào dải. Dù theo cách nào, một đề chỉ được chấp nhận khi bộ giải giải hết được nó bằng suy ' +
        'luận.',
      'help.difficulty.guarantee.verify': 'Ở mọi mức, một bộ giải riêng còn đếm số lời giải của từng đề ' +
        'hoàn chỉnh như một lớp bảo vệ. Một đề có nhiều hơn một lời giải sẽ không bao giờ đến tay bạn.',
      'help.difficulty.closest.title': 'Khi không đạt được mức độ yêu cầu',
      'help.difficulty.closest.text': 'Một số tổ hợp rất khó đạt chính xác, chẳng hạn kiểu đối xứng chặt ' +
        'kết hợp với mức rất cao. Khi không lần thử nào đạt mức yêu cầu, bạn nhận được đề gần nhất tìm ' +
        'được, đánh dấu “{badge}”, kèm mức mà nó thực sự đạt. Đề vẫn hợp lệ và vẫn có đúng một lời giải; ' +
        'chỉ độ khó là khác. Hãy dùng “{retry}” hoặc tăng số lần thử.',

      'help.generation.intro': 'Mỗi đề được tạo qua bảy bước, luôn theo cùng một thứ tự. Trình sinh đề ' +
        'chạy các bước này hết tốc độ và chỉ ghi lại một nhật ký ngắn về những gì nó đã làm. Phần phát lại ' +
        'bên dưới bàn cờ được dựng từ nhật ký đó: nó cho thấy những bước nhìn thấy được trên bàn cờ chứ ' +
        'không phải từng bước xử lý bên trong, nên việc xem lại không bao giờ làm thuật toán chậm đi.',
      'help.generation.steps.title': 'Bảy bước',
      'help.generation.steps.hint': 'Mở một bước để đọc nó làm gì, tại sao và bằng cách nào, kèm mã giả. ' +
        'Bước mà phần phát lại đang hiển thị được đánh dấu và mở sẵn: dòng đang chạy được tô sáng.',
      'help.generation.steps.hint.none': 'Mở một bước để đọc nó làm gì, tại sao và bằng cách nào, kèm mã ' +
        'giả. Hãy tạo một đề và xem lại từng bước để biết bước nào đang là hiện tại.',
      'help.generation.current': 'Hiện tại: bước phát lại {position}/{length}',
      'help.generation.replay': 'Khi đề đã sẵn sàng, bàn cờ hiện ngay đề hoàn chỉnh; không có gì tự chạy. ' +
        'Thẻ Các bước tạo đề sau đó chuẩn bị bảng điểm cho từng bước (chạy ở nền; nếu trang không có tiến ' +
        'trình nền, chẳng hạn khi mở từ tệp, hãy nhấn Chuẩn bị bảng điểm trước). Dùng các nút Bước đầu ' +
        'tiên, Bước trước, Bước tiếp theo và Bước cuối cùng bên dưới bàn cờ, hoặc kéo thanh trượt, để xem ' +
        'đề được làm ra thế nào: lời giải đầy đủ, các lồng hoặc các dấu so sánh (chỉ có ở Sudoku Sát thủ ' +
        'và Sudoku So sánh), các lần bỏ số được chọn ngẫu nhiên, các lần bỏ số do trình sinh đề chọn theo ' +
        'phép kiểm tra của nó, các lần điều chỉnh nếu có, và đề hoàn chỉnh. Các bước được chọn để điểm ' +
        'tăng đều và không bao giờ giảm; đánh dấu Hiện từng thay đổi để xem riêng từng thay đổi đã ghi ' +
        'lại, kể cả những thay đổi làm điểm giảm. Bước nào cũng có bảng điểm; trạng thái chưa chấm được ' +
        'điểm sẽ hiện lý do và các kỹ thuật đã thử thay cho dòng Tổng. Nút Giải thích mở trang này ở đúng ' +
        'bước đang xem. Trên bàn cờ, khung màu hổ phách đánh dấu các ô bị bỏ số ở bước này, khung đỏ nét ' +
        'đứt đánh dấu các ô được trả lại, và khung chấm đánh dấu các số cho sẵn được hiện lại. Khi điểm ' +
        'tăng vọt (gấp ba lần trở lên và tăng ít nhất 100 điểm), bước đó có nhãn \u201cĐiểm tăng vọt\u201d ' +
        'kèm lời giải thích; mục Vì sao? mở các con số phía sau, và một khung đánh dấu số cho sẵn hoặc dấu ' +
        'gây ra bước nhảy khi chỉ có đúng một.',
      'help.generation.seed': 'Seed là con số khởi động mọi lựa chọn ngẫu nhiên. Với cùng một phiên bản ' +
        'trình sinh đề, cùng seed và cùng tùy chọn sẽ luôn cho ra cùng một đề, nên đề nào cũng có thể chia ' +
        'sẻ và tạo lại; một liên kết hay một mục lịch sử do phiên bản cũ tạo ra có thể cho ra một đề khác. ' +
        'Để trống nếu bạn muốn mỗi lần một đề ngẫu nhiên mới.',
      'help.generation.worker': 'Khi trang được phục vụ qua http hoặc https, trình sinh đề chạy trong Web ' +
        'Worker nên trang luôn mượt và nút Hủy có tác dụng ngay. Khi mở trực tiếp index.html từ ổ đĩa, ' +
        'trình duyệt không cho dùng worker: trình sinh đề khi đó chạy trên luồng chính, huy hiệu ghi ' +
        '“{main}” thay vì “{worker}”, và trang có thể khựng một lúc với bàn cờ lớn.',

      'help.shortcuts.intro': 'Mọi thao tác đều làm được bằng bàn phím. Các phím này dùng được ở bất kỳ ' +
        'đâu con trỏ đang đứng, trừ khi có ghi chú khác.',
      'help.keys.group.general': 'Ở mọi nơi',
      'help.keys.group.replay': 'Phát lại',
      'help.keys.group.board': 'Bàn cờ',
      'help.keys.tab': 'Chuyển đến điều khiển kế tiếp hoặc phía trước.',
      'help.keys.activate': 'Bấm nút đang được chọn, hoặc mở và đóng một mục.',
      'help.keys.escape': 'Đóng hộp thoại đang mở.',
      'help.keys.tabs': 'Trên các thẻ của hộp thoại này: chuyển thẻ, hoặc nhảy đến thẻ đầu hay thẻ cuối.',
      'help.keys.scrubber': 'Trên thanh trượt phát lại: lùi hoặc tiến một bước.',
      'help.keys.scrubberEnds': 'Trên thanh trượt phát lại: nhảy đến đầu hoặc cuối.',
      'help.keys.cells': 'Trên bàn cờ: chuyển sang ô bên cạnh.',
      'help.keys.rowEnds': 'Trên bàn cờ: nhảy đến ô đầu hoặc ô cuối của hàng.',
      'help.keys.boardEnds': 'Trên bàn cờ: nhảy đến ô đầu hoặc ô cuối của toàn bộ bàn cờ.',
      'help.keys.pages': 'Trên bàn cờ: lên hoặc xuống nhiều hàng cùng lúc.',
      'help.controls.title': 'Các điều khiển',
      'help.controls.intro': 'Bảng tùy chọn bên trái (thanh Tùy chọn trên điện thoại) quyết định đề được ' +
        'tạo ra thế nào; các nút bên dưới bắt đầu việc tạo đề. Đây là các điều khiển, kể cả phần phát lại ' +
        'bên dưới bàn cờ.',
      'help.controls.variant': 'Chọn một biến thể. Các tùy chọn riêng của nó hiện ngay bên dưới.',
      'help.controls.difficulty': 'Các kỹ thuật cần dùng để giải đề đòi hỏi nhiều đến đâu. Biến thể nào ' +
        'không có mức đó sẽ chuyển sang mức gần nhất mà nó có.',
      'help.controls.symmetry': 'Các số cho sẵn được bỏ theo từng nhóm tương ứng, nên hình dạng các ô cho ' +
        'sẵn đối xứng. Đối xứng càng chặt thì các mức cao nhất càng khó đạt.',
      'help.controls.symbolMode': 'Chỉ đổi cách vẽ các giá trị (chữ số, chữ cái, màu kèm hình, hoặc hình ' +
        'dạng). Đề không thay đổi.',
      'help.controls.replay': 'Bên dưới bàn cờ, Bước đầu tiên và Bước cuối cùng nhảy về đầu hoặc đến cuối ' +
        'phần phát lại, Bước trước và Bước tiếp theo chuyển từng bước một, còn thanh trượt đưa thẳng đến ' +
        'bước bất kỳ. Nhãn bên cạnh cho biết bước nào đang được hiển thị. Hiện từng thay đổi chuyển giữa ' +
        'các bước được chọn để điểm tăng đều và toàn bộ các thay đổi đã ghi lại, và giữ phần phát lại ở ' +
        'cùng thời điểm của quá trình tạo đề. Khi trang không có tiến trình nền, các nút này chờ đến khi ' +
        'bạn nhấn Chuẩn bị bảng điểm và việc chuẩn bị đã hoàn tất.',

      'help.about.privacy.title': 'Quyền riêng tư',
      'help.about.privacy.text': 'Mọi thứ chạy ngay trong trình duyệt của bạn. Đề được tạo trên chính ' +
        'thiết bị của bạn và không có gì được gửi đến máy chủ; không có tài khoản, không theo dõi và không ' +
        'dùng cookie. Chỉ có một vài mục nhỏ được lưu trong bộ nhớ cục bộ của trình duyệt: ngôn ngữ, giao ' +
        'diện và các tùy chọn gần nhất của bạn, và vài đề vừa tạo để có thể hiện lại ngay. “Chơi” mở trang ' +
        'Trình chơi Sudoku riêng trong một tab mới; đề chỉ nằm trong địa chỉ, sau dấu “#”, phần mà trình ' +
        'duyệt không bao giờ gửi đến máy chủ.',
      'help.about.repro.title': 'Chia sẻ và tạo lại một đề',
      'help.about.repro.text': 'Seed cùng với biến thể, mức độ khó và các tùy chọn xác định hoàn toàn đề, ' +
        'và thanh địa chỉ luôn giữ chúng. Hãy sao chép liên kết, và bất kỳ ai mở nó ' +
        'cũng nhận được đúng đề đó. Thêm auto=1 vào liên kết để tạo đề ngay khi trang tải xong. Ví dụ:',
      'help.about.tech.title': 'Được xây dựng bằng',
      'help.about.tech.text': 'HTML, CSS và JavaScript thuần: không framework, không bước biên dịch và ' +
        'không thư viện ngoài. Khi các tệp đã có trên máy, trang cũng chạy được khi không có mạng: mở trực ' +
        'tiếp index.html, hoặc phục vụ thư mục bằng bất kỳ máy chủ web tĩnh nào.',
      'help.about.credits.title': 'Ghi công và giấy phép',
      'help.about.credits.text': 'Hãy xem kho mã nguồn của dự án để biết mã nguồn, tài liệu và giấy phép.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
