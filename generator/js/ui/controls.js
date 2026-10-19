/**
 * Generation control panel (design.md 10.4, T-4.4): `SG.controls`.
 *
 * The whole form is generated from data, never from hand-written HTML per variant:
 *  - `describe(state, ctx)` is PURE (no DOM): it turns a store state into the form model, a list of fields
 *    with their choices, visibility, disabled flag and warnings. Everything that depends on the variant or on
 *    another option is decided here: the levels offered (`difficultySupport`), the symbol sets
 *    (`symbolModes`), the variant specific options (`SG.variants.optionsOf`, `visibleWhen`), the strict
 *    symmetry warning. It is what the tests exercise.
 *  - `mount(rootEl, store, opts)` renders that model into the `<form>` and wires the events to the store. It
 *    renders once, then updates the controls in place (a control that has the focus keeps it); only a
 *    language change rebuilds the labels, and only a variant change rebuilds the variant options.
 *
 * The form never starts a generation (app.js owns the Generate / Cancel / Export buttons). Strings are keys
 * of `SG.i18n` (`controls.*` fragment at the bottom of this file, plus the base packs).
 *
 * Field ids of the model: 'variant', 'difficulty', 'symbolMode', 'seed', 'symmetry' (advanced), 'digOrder',
 * 'maxAttempts', 'showSolution' and 'opt.<optionId>' for the options of the variant.
 *
 * The description of a field (`hintKey`) is shown in a help tooltip next to the label, not under the control.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.controls && typeof SG.controls.mount === 'function') return;

  const hasOwn = Object.prototype.hasOwnProperty;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ID_PREFIX = 'ctl-';
  const TOAST_MS = 2600;

  /**
   * Strict symmetry rule (data, so it is easy to tune): symmetry kind -> the first difficulty level at which
   * combining it with that kind deserves a warning. The four-way symmetries dig four cells at a time; the
   * digger (js/core/digger.js, "coarse" groups) then needs more samples and attempts and misses the requested
   * level more often (a classic9 run takes 1.3-1.8 full grids on average from 'hard' on, against 1.0-1.2 with
   * rotational180). Two-way symmetries and 'none' never warn.
   * @type {Object<string, string>}
   */
  const STRICT_SYMMETRY = Object.freeze({ rotational90: 'master', mirrorBoth: 'master' });

  /** The symmetry that is offered as the reliable alternative in the warning. */
  const RELIABLE_SYMMETRY = 'rotational180';

  // ---------------------------------------------------------------------------------------------
  // Texts
  // ---------------------------------------------------------------------------------------------

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  function hasText(key) {
    return typeof key === 'string' && SG.i18n.has(key);
  }

  function formatNumber(value) {
    return SG.i18n.formatNumber(value);
  }

  /** Text of a message model `{ messageKey, args, argKeys }`; the `argKeys` values are translated keys. */
  function messageText(message) {
    const args = Object.assign({}, message.args);
    Object.keys(message.argKeys || {}).forEach(function (name) { args[name] = t(message.argKeys[name]); });
    return t(message.messageKey, args);
  }

  // ---------------------------------------------------------------------------------------------
  // Form model (pure)
  // ---------------------------------------------------------------------------------------------

  /**
   * The strict symmetry warning for a symmetry / difficulty pair, or null.
   * @param {string} symmetry
   * @param {string} difficulty
   * @returns {?{id: string, messageKey: string, argKeys: Object<string, string>}}
   */
  function strictSymmetryWarning(symmetry, difficulty) {
    if (!hasOwn.call(STRICT_SYMMETRY, symmetry)) return null;
    const ladder = SG.difficulty.LEVELS;
    if (ladder.indexOf(difficulty) < ladder.indexOf(STRICT_SYMMETRY[symmetry])) return null;
    return {
      id: 'strictSymmetry',
      messageKey: 'controls.warn.strictSymmetry',
      argKeys: {
        symmetry: 'symmetry.' + symmetry,
        difficulty: 'difficulty.' + difficulty,
        alternative: 'symmetry.' + RELIABLE_SYMMETRY
      }
    };
  }

  const PREVIEW_SIZE = 9;
  /** The cell whose symmetric partners the preview highlights. */
  const PREVIEW_CELL = Object.freeze({ row: 1, col: 2 });
  const PREVIEW_MID = PREVIEW_SIZE / 2;
  const PREVIEW_AXES = Object.freeze({
    mirrorH: [[0, PREVIEW_MID, PREVIEW_SIZE, PREVIEW_MID]],
    mirrorV: [[PREVIEW_MID, 0, PREVIEW_MID, PREVIEW_SIZE]],
    mirrorBoth: [[0, PREVIEW_MID, PREVIEW_SIZE, PREVIEW_MID], [PREVIEW_MID, 0, PREVIEW_MID, PREVIEW_SIZE]],
    diagonal: [[0, 0, PREVIEW_SIZE, PREVIEW_SIZE]],
    antiDiagonal: [[PREVIEW_SIZE, 0, 0, PREVIEW_SIZE]]
  });
  const PREVIEW_CENTRE = Object.freeze({ rotational180: true, rotational90: true });

  /**
   * Miniature of a symmetry on a 9x9 board: the cells that are removed together with one sample cell, the
   * mirror axes (lines in board units) and whether the centre is marked.
   * @param {string} kind  One of `SG.symmetry.KINDS`.
   * @returns {{kind: string, size: number, marked: Array<{row: number, col: number}>,
   *   axes: number[][], centre: boolean}}
   */
  function symmetryPreview(kind) {
    const n = PREVIEW_SIZE;
    const cellRow = new Int32Array(n * n);
    const cellCol = new Int32Array(n * n);
    for (let i = 0; i < n * n; i++) {
      cellRow[i] = Math.floor(i / n);
      cellCol[i] = i % n;
    }
    const board = { cellCount: n * n, layout: { rows: n, cols: n, cellRow: cellRow, cellCol: cellCol } };
    const sample = PREVIEW_CELL.row * n + PREVIEW_CELL.col;
    let members = [sample];
    SG.symmetry.groups(board, kind).forEach(function (group) {
      if (Array.prototype.indexOf.call(group, sample) !== -1) members = Array.from(group);
    });
    return {
      kind: kind,
      size: n,
      marked: members.map(function (cell) { return { row: cellRow[cell], col: cellCol[cell] }; }),
      axes: PREVIEW_AXES[kind] ? PREVIEW_AXES[kind].map(function (line) { return line.slice(); }) : [],
      centre: PREVIEW_CENTRE[kind] === true
    };
  }

  function baseField(id, stateKey, section, type, labelKey) {
    return {
      id: id,
      stateKey: stateKey,
      optionId: null,
      section: section,
      type: type,
      labelKey: labelKey,
      hintKey: null,
      value: null,
      choices: [],
      visible: true,
      disabled: false,
      warnings: []
    };
  }

  function choice(value, labelKey) {
    return { value: value, labelKey: labelKey, label: String(value) };
  }

  function variantField(s) {
    const field = baseField('variant', 'variantId', 'basic', 'select', 'controls.variant.label');
    field.value = s.variantId;
    field.groups = [];
    const byGroup = {};
    SG.variants.list().forEach(function (def) {
      if (!hasOwn.call(byGroup, def.group)) {
        byGroup[def.group] = { id: def.group, labelKey: 'group.' + def.group, choices: [] };
        field.groups.push(byGroup[def.group]);
      }
      const item = choice(def.id, def.i18nKey);
      byGroup[def.group].choices.push(item);
      field.choices.push(item);
    });
    field.hintKey = 'variant.' + s.variantId + '.desc';
    return field;
  }

  function difficultyField(s, def) {
    const field = baseField('difficulty', 'difficulty', 'basic', 'select', 'controls.difficulty.label');
    field.value = s.difficulty;
    SG.difficulty.LEVELS.forEach(function (level) {
      if (SG.difficulty.isSupported(level, { variantId: def.id })) {
        field.choices.push(choice(level, 'difficulty.' + level));
      }
    });
    field.disabled = field.choices.length <= 1;
    field.hintKey = 'difficulty.' + s.difficulty + '.desc';
    return field;
  }

  function symbolModeField(s, def) {
    const field = baseField('symbolMode', 'symbolMode', 'basic', 'select', 'controls.symbolMode.label');
    field.value = s.symbolMode;
    field.hintKey = 'controls.symbolMode.hint';
    def.symbolModes.forEach(function (mode) { field.choices.push(choice(mode, 'symbolMode.' + mode)); });
    // A single choice is no choice: the large grids pick their symbols with their own variant option.
    field.disabled = field.choices.length <= 1;
    field.visible = field.choices.length > 1;
    return field;
  }

  function symmetryField(s) {
    const field = baseField('symmetry', 'symmetry', 'advanced', 'select', 'controls.symmetry.label');
    field.value = s.symmetry;
    field.hintKey = 'controls.symmetry.hint';
    SG.symmetry.KINDS.forEach(function (kind) { field.choices.push(choice(kind, 'symmetry.' + kind)); });
    field.preview = symmetryPreview(s.symmetry);
    const warning = strictSymmetryWarning(s.symmetry, s.difficulty);
    if (warning !== null) field.warnings.push(warning);
    return field;
  }

  function seedField(s) {
    const field = baseField('seed', 'seed', 'basic', 'seed', 'controls.seed.label');
    const info = SG.store.seedInfo(s.seed);
    field.value = s.seed;
    field.hintKey = 'controls.seed.hint';
    field.placeholderKey = 'common.random';
    field.maxLength = SG.store.SEED_MAX_LENGTH;
    field.seed = info;
    field.info = info.kind === 'text'
      ? [{ messageKey: 'controls.seed.hashed', args: { seed: String(info.value) } }] : [];
    return field;
  }

  function digOrderField(s) {
    const field = baseField('digOrder', 'digOrder', 'advanced', 'select', 'controls.digOrder.label');
    field.value = s.digOrder;
    field.hintKey = 'controls.digOrder.hint';
    SG.digger.ORDERS.forEach(function (order) { field.choices.push(choice(order, 'digOrder.' + order)); });
    return field;
  }

  function maxAttemptsField(s) {
    const field = baseField('maxAttempts', 'maxAttempts', 'advanced', 'number', 'controls.maxAttempts.label');
    field.value = s.maxAttempts;
    field.hintKey = 'controls.maxAttempts.hint';
    field.min = SG.store.MAX_ATTEMPTS.min;
    field.max = SG.store.MAX_ATTEMPTS.max;
    field.step = 1;
    field.defaultValue = SG.store.MAX_ATTEMPTS.default;
    return field;
  }

  function showSolutionField(s) {
    const field = baseField('showSolution', 'showSolution', 'advanced', 'boolean',
      'controls.showSolution.label');
    field.value = s.showSolution;
    field.hintKey = 'controls.showSolution.hint';
    return field;
  }

  /** One variant option (a `NormalizedOption`) as a form field. */
  function optionField(item, s, section) {
    const field = baseField('opt.' + item.id, null, section, item.type, item.labelKey);
    field.optionId = item.id;
    field.value = s.variantOptions[item.id];
    field.defaultValue = item.default;
    field.hintKey = item.hintKey;
    field.visible = SG.store.isOptionVisible(item, s.variantOptions);
    if (item.type === 'slider') {
      field.min = item.min;
      field.max = item.max;
      field.step = item.step;
      field.minLabelKey = item.minLabelKey;
      field.maxLabelKey = item.maxLabelKey;
      field.defaultLabelKey = item.defaultLabelKey;
    } else if (item.type === 'select') {
      item.choices.forEach(function (c) {
        field.choices.push({ value: c.value, labelKey: c.labelKey, label: String(c.value) });
      });
      field.disabled = field.choices.length <= 1;
    } else if (item.type === 'text') {
      field.maxLength = item.maxLength;
      field.placeholderKey = item.placeholderKey;
    }
    return field;
  }

  const NOTE_KINDS = Object.freeze({
    difficulty: {
      id: 'difficultyChanged', messageKey: 'controls.note.difficultyChanged', prefix: 'difficulty.'
    },
    symbolMode: {
      id: 'symbolModeChanged', messageKey: 'controls.note.symbolModeChanged', prefix: 'symbolMode.'
    }
  });

  /** Polite notes about options the form changed by itself (`adjustments` of `sanitizeWithNotes`). */
  function noteModels(s, adjustments) {
    const notes = [];
    (adjustments || []).forEach(function (a) {
      if (!a || !hasOwn.call(NOTE_KINDS, a.key)) return;
      const kind = NOTE_KINDS[a.key];
      notes.push({
        id: kind.id,
        messageKey: kind.messageKey,
        argKeys: { variant: 'variant.' + s.variantId, from: kind.prefix + a.from, to: kind.prefix + a.to }
      });
    });
    return notes;
  }

  /**
   * @typedef {Object} FormField
   * @property {string} id           'variant' | 'difficulty' | ... | 'opt.<optionId>'
   * @property {?string} stateKey    Key of the store state (null for variant options).
   * @property {?string} optionId    Option id for variant options, else null.
   * @property {('basic'|'options'|'advanced')} section  'options': variant options shown under the basic
   *           fields; 'advanced': inside the "Advanced" disclosure.
   * @property {('select'|'slider'|'number'|'boolean'|'text'|'seed')} type
   * @property {string} labelKey
   * @property {?string} hintKey     Help text (a description for the variant and the difficulty).
   * @property {*} value
   * @property {Array<{value: *, labelKey: ?string, label: string}>} choices  Selects only; `label` is the
   *           fallback text when `labelKey` is null.
   * @property {boolean} visible     False for an option hidden by its `visibleWhen`, and for a symbol set
   *           with a single choice (nothing to choose).
   * @property {boolean} disabled    A select with a single choice.
   * @property {Array<Object>} warnings  Non-blocking `{ id, messageKey, argKeys }`.
   * Plus, by type: min / max / step / defaultValue / minLabelKey / maxLabelKey / defaultLabelKey (slider,
   * number), maxLength / placeholderKey (text, seed), `groups` (variant), `preview` (symmetry), `seed` and
   * `info` (seed).
   */

  /**
   * The form model for a state. Pure: no DOM, no storage.
   * @param {Object} state  A store state (sanitised first).
   * @param {{adjustments: Array<Object>}} [ctx]  The corrections the store reported for the last change; they
   *        become `notes`.
   * @returns {{variantId: string, fields: FormField[], notes: Array<Object>, warnings: Array<Object>}}
   */
  function describe(state, ctx) {
    const s = SG.store.sanitize(state);
    const def = SG.variants.get(s.variantId);
    const items = SG.variants.optionsOf(def);
    const fields = [variantField(s), difficultyField(s, def), symbolModeField(s, def), seedField(s)];
    items.forEach(function (item) {
      if (!item.advanced) fields.push(optionField(item, s, 'options'));
    });
    fields.push(symmetryField(s), digOrderField(s), maxAttemptsField(s), showSolutionField(s));
    items.forEach(function (item) {
      if (item.advanced) fields.push(optionField(item, s, 'advanced'));
    });
    const warnings = [];
    fields.forEach(function (f) {
      f.warnings.forEach(function (w) { warnings.push(w); });
    });
    return {
      variantId: s.variantId,
      fields: fields,
      notes: noteModels(s, ctx && ctx.adjustments),
      warnings: warnings
    };
  }

  // ---------------------------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------------------------

  function domId(fieldId) {
    return ID_PREFIX + fieldId.replace(/[^A-Za-z0-9_-]/g, '-');
  }

  /** Creates an element; `attrs` values of null / undefined / false are skipped, `true` gives ''. */
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

  function makeSvg(doc, tag, attrs, children) {
    const node = doc.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value !== null && value !== undefined && value !== false) node.setAttribute(name, String(value));
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function icon(doc, name) {
    const use = makeSvg(doc, 'use', { href: '#ic-' + name }, []);
    return makeSvg(doc, 'svg', { class: 'icon', 'aria-hidden': 'true', focusable: 'false' }, [use]);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function choiceText(c) {
    return c.labelKey ? t(c.labelKey) : c.label;
  }

  /** The panel is narrow: alerts use the small text size and tighter spacing (design tokens only). */
  const ALERT_STYLE = 'gap: var(--sg-space-2); padding: var(--sg-space-2) var(--sg-space-3); ' +
    'font-size: var(--sg-font-size-sm)';

  /** Alert boxes (`.alert`) inside a container; rebuilt only when the texts changed. */
  function renderAlerts(doc, box, messages, modifier, withIcon, idPrefix) {
    const texts = messages.map(messageText);
    const signature = texts.join('\n');
    if (box.getAttribute('data-sig') === signature) return;
    box.setAttribute('data-sig', signature);
    clear(box);
    texts.forEach(function (text, i) {
      const alert = make(doc, 'div', {
        class: 'alert' + (modifier ? ' alert--' + modifier : ''),
        id: idPrefix + '-' + i,
        role: 'status',
        style: ALERT_STYLE
      });
      if (withIcon) alert.appendChild(icon(doc, 'alert'));
      alert.appendChild(make(doc, 'p', { text: text }));
      box.appendChild(alert);
    });
    box.hidden = texts.length === 0;
  }

  /** `aria-describedby` from the elements that currently carry something to read. */
  function describeBy(control, elements) {
    const ids = [];
    elements.forEach(function (el) {
      if (el && !el.hidden && el.id && (el.textContent !== '' || el.firstChild)) ids.push(el.id);
    });
    if (ids.length > 0) control.setAttribute('aria-describedby', ids.join(' '));
    else control.removeAttribute('aria-describedby');
  }

  // ---------------------------------------------------------------------------------------------
  // Field widgets. Each returns { node, control, update(field) }; `commit(field, value, resync)` writes to
  // the store, `extras()` lists more elements that describe the control (the variant's notes).
  // ---------------------------------------------------------------------------------------------

  function renderChoices(doc, select, f) {
    const signature = f.choices.map(function (c) { return String(c.value); }).join('|');
    if (select.getAttribute('data-choices') === signature) return;
    select.setAttribute('data-choices', signature);
    clear(select);
    function option(c) {
      return make(doc, 'option', { value: String(c.value), text: choiceText(c) });
    }
    if (f.groups) {
      f.groups.forEach(function (group) {
        select.appendChild(make(doc, 'optgroup', { label: t(group.labelKey) }, group.choices.map(option)));
      });
    } else {
      f.choices.forEach(function (c) { select.appendChild(option(c)); });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The help tooltip next to a field label. The description of a field lives here, not under the control.
  // It opens on hover, on keyboard focus and on click / tap (so it works on a phone), Esc closes it, and it
  // is styled text (not a native `title`): see `richText`.
  // ---------------------------------------------------------------------------------------------

  /**
   * Tooltip text with light formatting, built with DOM nodes (never innerHTML): a blank line starts a new
   * paragraph and `**text**` is bold. Plain text is a single paragraph.
   */
  function richText(doc, text) {
    return String(text).split(/\n{2,}/).map(function (paragraph) {
      const p = make(doc, 'p', {});
      paragraph.split(/\*\*(.+?)\*\*/).forEach(function (part, i) {
        if (part === '') return;
        p.appendChild(make(doc, i % 2 === 1 ? 'strong' : 'span', { text: part }));
      });
      return p;
    });
  }

  const tipDocs = typeof WeakSet === 'function' ? new WeakSet() : null;

  /** One click listener per document that closes the tooltips opened by a click elsewhere. */
  function closeTipsOnOutsideClick(doc) {
    if (tipDocs === null || tipDocs.has(doc) || typeof doc.addEventListener !== 'function') return;
    tipDocs.add(doc);
    doc.addEventListener('click', function (event) {
      if (typeof doc.querySelectorAll !== 'function') return;
      doc.querySelectorAll('.help-tip[data-open]').forEach(function (tip) {
        if (!tip.contains(event.target)) tip.removeAttribute('data-open');
      });
    });
  }

  function helpTip(doc, id) {
    const pop = make(doc, 'div', { class: 'help-tip__pop', id: id + '-hint', role: 'tooltip' });
    const button = make(doc, 'button', {
      type: 'button', class: 'help-tip__btn', 'aria-describedby': id + '-hint'
    }, [icon(doc, 'help')]);
    const wrap = make(doc, 'span', { class: 'help-tip' }, [button, pop]);
    wrap.hidden = true;
    button.addEventListener('click', function () {
      wrap.removeAttribute('data-dismissed');
      if (wrap.getAttribute('data-open') === null) wrap.setAttribute('data-open', '');
      else wrap.removeAttribute('data-open');
    });
    wrap.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || wrap.getAttribute('data-dismissed') !== null) return;
      wrap.removeAttribute('data-open');
      wrap.setAttribute('data-dismissed', '');
      event.stopPropagation();
    });
    wrap.addEventListener('mouseenter', function () { wrap.removeAttribute('data-dismissed'); });
    wrap.addEventListener('focusout', function () {
      wrap.removeAttribute('data-dismissed');
      wrap.removeAttribute('data-open');
    });
    closeTipsOnOutsideClick(doc);
    return {
      wrap: wrap,
      pop: pop,
      update: function (text, name) {
        wrap.hidden = text === '';
        if (pop.getAttribute('data-text') !== text) {
          pop.setAttribute('data-text', text);
          clear(pop);
          if (text !== '') richText(doc, text).forEach(function (p) { pop.appendChild(p); });
        }
        button.setAttribute('aria-label', t('controls.help.label', { name: name }));
      }
    };
  }

  function fieldShell(doc, f) {
    const id = domId(f.id);
    const label = make(doc, 'label', { class: 'field__label', for: id, text: t(f.labelKey) });
    const tip = helpTip(doc, id);
    return {
      id: id,
      wrap: make(doc, 'div', { class: 'field', 'data-field': f.id }),
      label: label,
      tip: tip,
      head: make(doc, 'div', { class: 'field__head' }, [label, tip.wrap]),
      warn: make(doc, 'div', { class: 'stack', id: id + '-warn', hidden: true })
    };
  }

  function updateShell(doc, shell, f, control, extras) {
    shell.wrap.hidden = !f.visible;
    shell.tip.update(hasText(f.hintKey) ? t(f.hintKey) : '', t(f.labelKey));
    renderAlerts(doc, shell.warn, f.warnings, 'warning', true, shell.id + '-alert');
    describeBy(control, [shell.tip.pop, shell.warn].concat(extras || []));
  }

  function appendShell(shell, middle) {
    shell.wrap.appendChild(shell.head);
    middle.forEach(function (node) { shell.wrap.appendChild(node); });
    shell.wrap.appendChild(shell.warn);
  }

  function selectWidget(doc, f, commit, extras) {
    const shell = fieldShell(doc, f);
    const select = make(doc, 'select', { class: 'select', id: shell.id });
    select.addEventListener('change', function () { commit(f, select.value); });
    appendShell(shell, [select]);
    return {
      node: shell.wrap,
      control: select,
      update: function (field) {
        renderChoices(doc, select, field);
        select.value = String(field.value);
        select.disabled = field.disabled;
        updateShell(doc, shell, field, select, extras ? extras() : null);
      }
    };
  }

  function previewParts(doc, preview) {
    const n = preview.size;
    const cells = preview.marked.map(function (m) {
      return makeSvg(doc, 'rect', { x: m.col, y: m.row, width: 1, height: 1 }, []);
    });
    const parts = [
      makeSvg(doc, 'path', {
        d: 'M3 0V9M6 0V9M0 3H9M0 6H9', fill: 'none', stroke: 'currentColor', 'stroke-width': 0.12,
        opacity: 0.5
      }, []),
      makeSvg(doc, 'g', { style: 'fill: var(--sg-color-accent)' }, cells),
      makeSvg(doc, 'rect', {
        x: 0.1, y: 0.1, width: n - 0.2, height: n - 0.2, fill: 'none', stroke: 'currentColor',
        'stroke-width': 0.2
      }, [])
    ];
    preview.axes.forEach(function (line) {
      parts.push(makeSvg(doc, 'line', {
        x1: line[0], y1: line[1], x2: line[2], y2: line[3], stroke: 'currentColor', 'stroke-width': 0.25,
        'stroke-dasharray': '0.6 0.4'
      }, []));
    });
    if (preview.centre) {
      parts.push(makeSvg(doc, 'circle', { cx: n / 2, cy: n / 2, r: 0.3, fill: 'currentColor' }, []));
    }
    return parts;
  }

  function symmetryWidget(doc, f, commit) {
    const shell = fieldShell(doc, f);
    const select = make(doc, 'select', { class: 'select', id: shell.id });
    const preview = makeSvg(doc, 'svg', {
      viewBox: '0 0 ' + f.preview.size + ' ' + f.preview.size, width: 40, height: 40, role: 'img',
      focusable: 'false', style: 'flex: none; color: var(--sg-color-text-muted)'
    }, []);
    select.addEventListener('change', function () { commit(f, select.value); });
    appendShell(shell, [make(doc, 'div', { class: 'input-group' }, [select, preview])]);
    return {
      node: shell.wrap,
      control: select,
      update: function (field) {
        renderChoices(doc, select, field);
        select.value = String(field.value);
        if (preview.getAttribute('data-kind') !== field.value) {
          preview.setAttribute('data-kind', field.value);
          clear(preview);
          previewParts(doc, field.preview).forEach(function (part) { preview.appendChild(part); });
          preview.setAttribute('aria-label',
            t('controls.symmetry.preview', { symmetry: t('symmetry.' + field.value) }));
        }
        updateShell(doc, shell, field, select);
      }
    };
  }

  function sliderWidget(doc, f, commit) {
    const shell = fieldShell(doc, f);
    const input = make(doc, 'input', {
      class: 'slider', type: 'range', id: shell.id, min: f.min, max: f.max, step: f.step
    });
    const output = make(doc, 'output', { class: 'field__hint', for: shell.id, id: shell.id + '-value' });
    const lower = make(doc, 'span', { class: 'field__hint' });
    const upper = make(doc, 'span', { class: 'field__hint' });
    function post() {
      const value = Number(input.value);
      if (Number.isFinite(value)) commit(f, value);
    }
    input.addEventListener('input', post);
    input.addEventListener('change', post);
    shell.wrap.appendChild(make(doc, 'div', { class: 'field field--inline field__head' }, [
      make(doc, 'span', { class: 'field__title' }, [shell.label, shell.tip.wrap]), output
    ]));
    shell.wrap.appendChild(input);
    shell.wrap.appendChild(make(doc, 'div', { class: 'field field--inline' }, [lower, upper]));
    shell.wrap.appendChild(shell.warn);
    return {
      node: shell.wrap,
      control: input,
      update: function (field) {
        input.value = String(field.value);
        const shown = field.value === field.defaultValue && hasText(field.defaultLabelKey)
          ? t(field.defaultLabelKey) : formatNumber(field.value);
        setText(output, shown);
        input.setAttribute('aria-valuetext', shown);
        setText(lower, hasText(field.minLabelKey) ? t(field.minLabelKey) : formatNumber(field.min));
        setText(upper, hasText(field.maxLabelKey) ? t(field.maxLabelKey) : formatNumber(field.max));
        updateShell(doc, shell, field, input);
      }
    };
  }

  function numberWidget(doc, f, commit) {
    const shell = fieldShell(doc, f);
    const input = make(doc, 'input', {
      class: 'input', type: 'number', id: shell.id, min: f.min, max: f.max, step: f.step, inputmode: 'numeric'
    });
    function typed() {
      const text = String(input.value).trim();
      return text !== '' && Number.isFinite(Number(text)) ? Number(text) : null;
    }
    input.addEventListener('input', function () {
      if (typed() !== null) commit(f, typed());
    });
    input.addEventListener('change', function () {
      commit(f, typed() !== null ? typed() : f.defaultValue, true);
    });
    appendShell(shell, [input]);
    return {
      node: shell.wrap,
      control: input,
      update: function (field) {
        if (typed() !== field.value) input.value = String(field.value);
        updateShell(doc, shell, field, input);
      }
    };
  }

  function booleanWidget(doc, f, commit) {
    const shell = fieldShell(doc, f);
    const input = make(doc, 'input', {
      class: 'switch__input', type: 'checkbox', role: 'switch', id: shell.id
    });
    const text = make(doc, 'span', { class: 'switch__text', text: t(f.labelKey) });
    const track = make(doc, 'span', { class: 'switch__track', 'aria-hidden': 'true' });
    input.addEventListener('change', function () { commit(f, input.checked); });
    shell.wrap.appendChild(make(doc, 'div', { class: 'field__head' }, [
      make(doc, 'label', { class: 'switch', for: shell.id }, [input, track, text]), shell.tip.wrap
    ]));
    shell.wrap.appendChild(shell.warn);
    return {
      node: shell.wrap,
      control: input,
      update: function (field) {
        input.checked = field.value === true;
        updateShell(doc, shell, field, input);
      }
    };
  }

  function textWidget(doc, f, commit) {
    const shell = fieldShell(doc, f);
    const input = make(doc, 'input', {
      class: 'input', type: 'text', id: shell.id, maxlength: f.maxLength, autocomplete: 'off',
      spellcheck: 'false'
    });
    input.addEventListener('input', function () { commit(f, input.value); });
    input.addEventListener('change', function () { input.value = input.value.trim(); });
    appendShell(shell, [input]);
    return {
      node: shell.wrap,
      control: input,
      update: function (field) {
        // The store trims the text; do not take a space away while it is still being typed.
        if (input.value !== field.value && input.value.trim() !== field.value) input.value = field.value;
        if (hasText(field.placeholderKey)) input.setAttribute('placeholder', t(field.placeholderKey));
        updateShell(doc, shell, field, input);
      }
    };
  }

  function seedWidget(doc, f, commit, actions) {
    const shell = fieldShell(doc, f);
    const input = make(doc, 'input', {
      class: 'input', type: 'text', id: shell.id, maxlength: f.maxLength, autocomplete: 'off',
      autocapitalize: 'off', spellcheck: 'false'
    });
    const info = make(doc, 'p', { class: 'field__hint', id: shell.id + '-info', hidden: true });
    const copy = make(doc, 'button', {
      type: 'button', class: 'btn btn--secondary btn--icon', 'data-action': 'copy-seed'
    }, [icon(doc, 'copy')]);
    input.addEventListener('input', function () { commit(f, input.value); });
    input.addEventListener('change', function () { commit(f, input.value.trim(), true); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.isComposing && typeof actions.submit === 'function') {
        event.preventDefault();
        actions.submit();
      }
    });
    copy.addEventListener('click', actions.copySeed);
    shell.wrap.appendChild(shell.head);
    shell.wrap.appendChild(make(doc, 'div', { class: 'input-group' }, [input, copy]));
    shell.wrap.appendChild(info);
    shell.wrap.appendChild(shell.warn);
    return {
      node: shell.wrap,
      control: input,
      update: function (field) {
        if (input.value !== field.value) input.value = field.value;
        input.setAttribute('placeholder', t(field.placeholderKey));
        const copyLabel = t('controls.seed.copy');
        copy.setAttribute('aria-label', copyLabel);
        copy.setAttribute('title', copyLabel);
        setText(info, field.info.length > 0 ? messageText(field.info[0]) : '');
        info.hidden = field.info.length === 0;
        updateShell(doc, shell, field, input, [info]);
      }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------------------------

  function fallbackCopy(doc, text) {
    let ok = false;
    const area = make(doc, 'textarea', {
      readonly: true, 'aria-hidden': 'true', tabindex: '-1',
      style: 'position: fixed; top: 0; left: 0; width: 1px; height: 1px; opacity: 0'
    });
    area.value = text;
    (doc.body || doc.documentElement).appendChild(area);
    try {
      area.focus();
      area.select();
      ok = typeof doc.execCommand === 'function' && doc.execCommand('copy') === true;
    } catch (err) {
      ok = false;
    }
    if (area.parentNode) area.parentNode.removeChild(area);
    return ok;
  }

  /**
   * Copies text to the clipboard: `navigator.clipboard` when it exists, else a hidden textarea and
   * `document.execCommand('copy')`.
   * @param {string} text
   * @param {Object} [doc]  The document (default: the global one).
   * @returns {Promise<boolean>} Whether the text was copied.
   */
  function copyText(text, doc) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      return nav.clipboard.writeText(text).then(function () { return true; }, function () {
        return d ? fallbackCopy(d, text) : false;
      });
    }
    return Promise.resolve(d ? fallbackCopy(d, text) : false);
  }

  // ---------------------------------------------------------------------------------------------
  // Mounting
  // ---------------------------------------------------------------------------------------------

  /**
   * Builds the form into `rootEl` (the `<form id="controls-form">`) and keeps it in step with the store.
   * @param {Element} rootEl
   * @param {Object} store  A store of `SG.store.create` (get / set / subscribe / newSeed).
   * @param {Object} [options]
   * @param {function(string, Object, string): void} [options.notify]  `notify(messageKey, args, kind)` with
   *        kind 'success' | 'warning' | 'danger', for the seed buttons; default: a toast in `#toast-root`.
   * @param {function(): void} [options.onSubmit]  Called when Enter is pressed in the seed field.
   * @returns {{refresh: function(): void, destroy: function(): void, focusFirst: function(): void}}
   */
  function mount(rootEl, store, options) {
    if (!rootEl || !store) throw new TypeError('SG.controls.mount needs a root element and a store');
    const opts = options || {};
    const doc = rootEl.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) throw new Error('SG.controls.mount needs a DOM');

    let records = {};
    let optionIds = [];
    let parts = null;
    let adjustments = [];
    let shownVariant = null;
    let destroyed = false;
    const toasts = [];

    function notify(messageKey, args, kind) {
      if (typeof opts.notify === 'function') {
        opts.notify(messageKey, args, kind);
        return;
      }
      const host = typeof doc.getElementById === 'function' ? doc.getElementById('toast-root') : null;
      if (!host) return;
      const toast = make(doc, 'div', { class: 'toast toast--' + (kind || 'success') }, [
        make(doc, 'span', { class: 'toast__message', text: t(messageKey, args) })
      ]);
      host.appendChild(toast);
      toasts.push({
        toast: toast,
        timer: setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, TOAST_MS)
      });
    }

    function commit(f, value, resync) {
      const patch = f.optionId !== null
        ? { variantOptions: { [f.optionId]: value } } : { [f.stateKey]: value };
      store.set(patch, { source: 'controls' });
      if (resync) sync();
    }

    const actions = {
      submit: typeof opts.onSubmit === 'function' ? function () { opts.onSubmit(); } : null,
      copySeed: function () {
        const seed = String(store.get().seed).trim();
        if (seed === '') {
          notify('controls.seed.nothingToCopy', {}, 'warning');
          return;
        }
        copyText(seed, doc).then(function (ok) {
          if (destroyed) return;
          if (ok) notify('controls.seed.copied', {}, 'success');
          else notify('controls.seed.copyFailed', {}, 'danger');
        });
      }
    };

    function widgetFor(f) {
      if (f.type === 'slider') return sliderWidget(doc, f, commit);
      if (f.type === 'number') return numberWidget(doc, f, commit);
      if (f.type === 'boolean') return booleanWidget(doc, f, commit);
      if (f.type === 'text') return textWidget(doc, f, commit);
      if (f.type === 'seed') return seedWidget(doc, f, commit, actions);
      if (f.id === 'symmetry') return symmetryWidget(doc, f, commit);
      return selectWidget(doc, f, commit, f.id === 'variant' ? function () { return [parts.notes]; } : null);
    }

    function buildOptionFields(model) {
      clear(parts.options);
      clear(parts.advancedOptions);
      optionIds.forEach(function (id) { delete records[id]; });
      optionIds = [];
      model.fields.forEach(function (f) {
        if (f.optionId === null) return;
        const widget = widgetFor(f);
        records[f.id] = widget;
        optionIds.push(f.id);
        (f.section === 'advanced' ? parts.advancedOptions : parts.options).appendChild(widget.node);
      });
      shownVariant = model.variantId;
    }

    function sync() {
      if (destroyed) return;
      const model = describe(store.get(), { adjustments: adjustments });
      if (model.variantId !== shownVariant) buildOptionFields(model);
      renderAlerts(doc, parts.notes, model.notes, '', false, ID_PREFIX + 'note');
      let visibleOptions = 0;
      let visibleAdvanced = 0;
      model.fields.forEach(function (f) {
        if (records[f.id]) records[f.id].update(f);
        if (f.optionId !== null && f.visible) {
          if (f.section === 'advanced') visibleAdvanced++;
          else visibleOptions++;
        }
      });
      parts.optionsGroup.hidden = visibleOptions === 0;
      parts.advancedOptions.hidden = visibleAdvanced === 0;
    }

    function build() {
      const model = describe(store.get(), { adjustments: adjustments });
      clear(rootEl);
      records = {};
      optionIds = [];
      const legendId = ID_PREFIX + 'options-legend';
      parts = {
        notes: make(doc, 'div', { class: 'stack', id: ID_PREFIX + 'notes', hidden: true }),
        options: make(doc, 'div', { class: 'stack' }),
        advancedOptions: make(doc, 'div', { class: 'stack' })
      };
      parts.optionsGroup = make(doc, 'fieldset', { class: 'field-group', 'aria-labelledby': legendId }, [
        make(doc, 'legend', {
          class: 'field-group__legend', id: legendId, text: t('controls.options.legend')
        }),
        parts.options
      ]);
      const advancedBody = make(doc, 'div', { class: 'disclosure__body' });
      parts.advanced = make(doc, 'details', { class: 'disclosure', id: ID_PREFIX + 'advanced' }, [
        make(doc, 'summary', { text: t('controls.advanced.summary') }),
        advancedBody
      ]);
      model.fields.forEach(function (f) {
        if (f.optionId !== null) return;
        const widget = widgetFor(f);
        records[f.id] = widget;
        if (f.section === 'advanced') {
          advancedBody.appendChild(widget.node);
          return;
        }
        rootEl.appendChild(widget.node);
        if (f.id === 'variant') rootEl.appendChild(parts.notes);
      });
      rootEl.appendChild(parts.optionsGroup);
      advancedBody.appendChild(parts.advancedOptions);
      rootEl.appendChild(parts.advanced);
      shownVariant = null;
      sync();
    }

    function rebuildForLocale() {
      if (destroyed) return;
      const active = doc.activeElement && doc.activeElement.id ? doc.activeElement.id : null;
      const open = parts !== null && parts.advanced.open === true;
      build();
      if (open) parts.advanced.open = true;
      const again = active && typeof doc.getElementById === 'function' ? doc.getElementById(active) : null;
      if (again && typeof again.focus === 'function') again.focus();
    }

    function onSubmit(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
    }

    rootEl.addEventListener('submit', onSubmit);
    build();

    const unsubscribeStore = store.subscribe(function (state, keys, meta) {
      const reported = meta && Array.isArray(meta.adjustments) ? meta.adjustments : [];
      const relevant = reported.filter(function (a) { return hasOwn.call(NOTE_KINDS, a.key); });
      if (relevant.length > 0) adjustments = relevant;
      else if (keys.some(function (key) { return hasOwn.call(NOTE_KINDS, key) || key === 'variantId'; })) {
        adjustments = [];
      }
      sync();
    });
    const unsubscribeLocale = SG.i18n.onChange(rebuildForLocale);

    return {
      refresh: sync,
      focusFirst: function () {
        const first = records.variant;
        if (first && first.control && typeof first.control.focus === 'function') first.control.focus();
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        unsubscribeStore();
        unsubscribeLocale();
        rootEl.removeEventListener('submit', onSubmit);
        toasts.forEach(function (entry) {
          clearTimeout(entry.timer);
          if (entry.toast.parentNode) entry.toast.parentNode.removeChild(entry.toast);
        });
        clear(rootEl);
      }
    };
  }

  /**
   * @namespace SG.controls
   */
  SG.controls = {
    STRICT_SYMMETRY: STRICT_SYMMETRY,
    describe: describe,
    symmetryPreview: symmetryPreview,
    strictSymmetryWarning: strictSymmetryWarning,
    messageText: messageText,
    copyText: copyText,
    mount: mount
  };

  // ---------------------------------------------------------------------------------------------
  // Strings of the form
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'controls.variant.label': 'Variant',
      'controls.difficulty.label': 'Difficulty',
      'controls.symbolMode.label': 'Symbol set',
      'controls.symbolMode.hint': 'Only changes how the values are drawn. The puzzle does not change.\n\n' +
        '**Digits**: numbers.\n\n**Letters**: letters.\n\n**Colours**: colours, each with its own shape.\n\n' +
        '**Shapes**: shapes only.',
      'controls.symmetry.label': 'Symmetry',
      'controls.symmetry.hint': 'Clues are removed in matching groups, so the pattern of the given cells ' +
        'is symmetric.\n\nA **stricter symmetry** makes the highest levels harder to reach.',
      'controls.help.label': 'About “{name}”',
      'controls.symmetry.preview': 'Pattern preview, {symmetry}: the highlighted cells are removed together',
      'controls.seed.label': 'Seed',
      'controls.seed.hint': 'Leave empty for a random puzzle. The same seed with the same options always ' +
        'gives the same puzzle.',
      'controls.seed.hashed': 'This text is turned into the number {seed}; the same text always gives the ' +
        'same puzzle.',
      'controls.seed.copy': 'Copy seed',
      'controls.seed.copied': 'Seed copied to the clipboard.',
      'controls.seed.copyFailed': 'Could not copy the seed. Select it and copy it by hand.',
      'controls.seed.nothingToCopy': 'There is no seed to copy yet. Type a seed or generate a puzzle first.',
      'controls.options.legend': 'Variant options',
      'controls.advanced.summary': 'Advanced options',
      'controls.digOrder.label': 'Dig order',
      'controls.digOrder.hint': 'The order in which the generator tries to remove clues from the finished ' +
        'grid.',
      'controls.maxAttempts.label': 'Maximum attempts',
      'controls.maxAttempts.hint': 'Full grids to try before settling for the closest puzzle (1–20).',
      'controls.showSolution.label': 'Show the solution',
      'controls.showSolution.hint': 'Display the solved grid together with the puzzle.',
      'controls.warn.strictSymmetry': 'The symmetry “{symmetry}” together with “{difficulty}” is ' +
        'demanding: the generator may need several attempts and could end up one level off. A gentler ' +
        'symmetry such as “{alternative}” is more reliable.',
      'controls.note.difficultyChanged': '{variant} does not offer “{from}”, so the difficulty was ' +
        'changed to “{to}”.',
      'controls.note.symbolModeChanged': '{variant} cannot use the “{from}” symbol set, so “{to}” was ' +
        'selected.'
    },
    vi: {
      'controls.variant.label': 'Biến thể',
      'controls.difficulty.label': 'Độ khó',
      'controls.symbolMode.label': 'Bộ ký hiệu',
      'controls.symbolMode.hint': 'Chỉ đổi cách vẽ các giá trị. Đề không thay đổi.\n\n' +
        '**Chữ số**: các con số.\n\n**Chữ cái**: các chữ cái.\n\n**Màu sắc**: các màu, mỗi màu kèm một ' +
        'hình riêng.\n\n**Hình khối**: chỉ dùng hình khối.',
      'controls.symmetry.label': 'Đối xứng',
      'controls.symmetry.hint': 'Các số cho sẵn được bỏ theo từng nhóm tương ứng, nên hình dạng các ô cho ' +
        'sẵn đối xứng.\n\n**Đối xứng càng chặt** thì các mức cao nhất càng khó đạt.',
      'controls.help.label': 'Giải thích về “{name}”',
      'controls.symmetry.preview': 'Xem trước mẫu {symmetry}: các ô được tô sáng sẽ được bỏ cùng nhau',
      'controls.seed.label': 'Seed',
      'controls.seed.hint': 'Để trống để tạo đề ngẫu nhiên. Cùng seed và cùng tùy chọn sẽ luôn cho ra ' +
        'cùng một đề.',
      'controls.seed.hashed': 'Chữ này được chuyển thành số {seed}; cùng một chữ luôn cho ra cùng một đề.',
      'controls.seed.copy': 'Sao chép seed',
      'controls.seed.copied': 'Đã sao chép seed vào bộ nhớ tạm.',
      'controls.seed.copyFailed': 'Không sao chép được seed. Hãy chọn và sao chép thủ công.',
      'controls.seed.nothingToCopy': 'Chưa có seed để sao chép. Hãy nhập seed hoặc tạo đề trước.',
      'controls.options.legend': 'Tùy chọn của biến thể',
      'controls.advanced.summary': 'Tùy chọn nâng cao',
      'controls.digOrder.label': 'Thứ tự đào lỗ',
      'controls.digOrder.hint': 'Thứ tự bộ sinh thử bỏ các số cho sẵn khỏi lưới đã điền đầy.',
      'controls.maxAttempts.label': 'Số lần thử tối đa',
      'controls.maxAttempts.hint': 'Số lưới đầy đủ được thử trước khi chọn đề gần nhất (1–20).',
      'controls.showSolution.label': 'Hiện lời giải',
      'controls.showSolution.hint': 'Hiển thị cả lưới đã giải cùng với đề bài.',
      'controls.warn.strictSymmetry': 'Đối xứng “{symmetry}” kết hợp với mức “{difficulty}” khá khắt khe: ' +
        'bộ sinh có thể phải thử nhiều lần và kết quả có thể lệch một mức. Kiểu đối xứng nhẹ hơn như ' +
        '“{alternative}” sẽ ổn định hơn.',
      'controls.note.difficultyChanged': '{variant} không có mức “{from}”, nên độ khó đã chuyển sang “{to}”.',
      'controls.note.symbolModeChanged': '{variant} không dùng được bộ ký hiệu “{from}”, nên đã chọn “{to}”.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
