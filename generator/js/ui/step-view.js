/**
 * Steps panel: the description of the replay step on show. Each step is a change the board shows (full
 * solution, cages or signs, a batch of removals, a "hardest removal" round, the finished puzzle; see
 * `SG.player.buildViews`); technical work is not listed. The replay controls under the board move through the
 * steps; the panel shows the number, title, summary and sentence of the current step, its score table, the
 * explanation of a score jump and a legend of the board frames. Pure: `chartModel(counts, options)`
 * (technique order, labels and bar geometry), `explain(table, step)` (the texts of a table model: the Total
 * and its change, the badge, the tier line, the callout with its "Why?" lines, the status sentences) and
 * `STEP_IDS`. DOM: `create(rootEl, { table })` renders into `#step-detail` of `#steps-root`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.stepView && typeof SG.stepView.create === 'function') return;

  // Same list as `SG.events.STEP_IDS`.
  const STEP_IDS = Object.freeze(['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate',
    'tune']);

  const CHART_WIDTH = 300;
  const CHART_ROW = 32;
  const CHART_BAR = 8;
  const CHART_LABEL_Y = 13;
  const CHART_BAR_Y = 19;
  const CHART_MIN_BAR = 3;

  /** [frame of a step's `marks` (or sign mark of `signs`), translation key] */
  const LEGEND = Object.freeze([['dug', 'steps.legend.dug'], ['kept', 'steps.legend.kept'],
    ['revealed', 'steps.legend.revealed'], ['signRemoved', 'steps.legend.signRemoved'],
    ['signKept', 'steps.legend.signKept'], ['cause', 'replay.legend.cause.cell'],
    ['causeRestore', 'replay.legend.cause.restore'], ['signCause', 'replay.legend.cause.sign']]);

  function usesMark(step, name) {
    if (name === 'signRemoved') return !!(step.signs && step.signs.removed.length > 0);
    if (name === 'signKept') return !!(step.signs && step.signs.kept.length > 0);
    if (name === 'signCause') return !!(step.signs && step.signs.cause && step.signs.cause.length > 0);
    return !!(step.marks && step.marks[name] && step.marks[name].length > 0);
  }

  function isNum(x) {
    return typeof x === 'number' && isFinite(x);
  }

  function round2(x) {
    return Math.round(x * 100) / 100;
  }

  function translate(key, args) {
    if (SG.i18n && typeof SG.i18n.t === 'function') return SG.i18n.t(key, args);
    return key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  function techniqueInfo(id) {
    const reg = SG.techniques;
    if (reg && typeof reg.has === 'function' && reg.has(id)) {
      const def = reg.get(id);
      return { order: def.order, group: def.group, key: def.i18nKey || 'technique.' + id };
    }
    return { order: null, group: null, key: 'technique.' + id };
  }

  function techniqueLabel(id, key) {
    return hasText(key) ? translate(key) : id;
  }

  // Tokens of a formula (`scoreTip`): a string is plain text, { v } a variable (italic), { b } a result
  // (bold), { sub: [tokens] } a subscript, { frac: [[tokens], [tokens]] } a fraction.
  function V(x) { return { v: x }; }
  function B(x) { return { b: x }; }
  function SUB() { return { sub: Array.prototype.slice.call(arguments) }; }
  function FRAC(top, bottom) { return { frac: [top, bottom] }; }

  /**
   * The model of a score tooltip: how a whole number of the Difficulty Score table comes from the exact
   * numbers of `SG.difficulty.scoreTable`, as formulas with the real values:
   * { lines: [{ label, math: [tokens], then: [tokens] }], notes: [text] } (`then` is the same formula with
   * the numbers put in). The hardest technique also gets P in full, the empty cells V, and the work term R is
   * shared among the techniques in proportion to their work. `prefix` is the locale prefix ('...tip.'),
   * `kind` is 'technique' (with its `row`), 'empties' or 'total'. Pure data; `renderScoreTip` draws it and
   * `scoreTipText` flattens it.
   */
  function scoreTip(prefix, kind, table, row) {
    const f = function (n) {
      return SG.i18n && typeof SG.i18n.formatNumber === 'function'
        ? SG.i18n.formatNumber(n, { maximumFractionDigits: 2 }) : String(round2(n));
    };
    const k = function (key) { return translate(prefix + key); };
    const shown = { label: k('shown'), math: ['≈ ', B(f(kind === 'empties' ? table.emptyTotal
      : kind === 'total' ? table.total : row.total))] };
    if (kind === 'total') {
      return {
        lines: [{ label: k('total'), math: [V('S'), ' = ', V('V'), ' + ', V('P'), ' + ', V('R')],
          then: ['= ', f(table.emptyShare), ' + ', f(table.peak), ' + ', f(table.workTerm), ' = ',
            B(f(table.unrounded))] },
        shown],
        notes: [k('where.total'), k('rounding')]
      };
    }
    if (kind === 'empties') {
      const e = f(table.empties);
      return {
        lines: [{ label: k('empties'), math: [V('V'), ' = 80 × ', FRAC([V('E')], [V('E'), ' + 40'])],
          then: ['= 80 × ', FRAC([e], [e, ' + 40']), ' = ', B(f(table.emptyShare))] }, shown],
        notes: [k('where.empties'), k('rounding')]
      };
    }
    const Wt = [V('W'), SUB(V('t'))];
    const part = FRAC([f(row.work)], [f(table.work)]);
    const log = function (top, bottom) { return ['(1 + ', FRAC(top, bottom), ')']; };
    return {
      lines: [
        { label: k('work'), math: Wt.concat([' = ', V('n'), SUB(V('t')), ' × ', V('w'), SUB(V('t'))]),
          then: ['= ', f(row.uses), ' × ', f(row.points), ' = ', B(f(row.work))] },
        { label: k('all'), math: [V('W'), ' = Σ '].concat(Wt, [' = ', B(f(table.work))]) },
        { label: k('term'),
          math: [V('R'), ' = ' + f(0.25) + ' × ', V('P'), ' × log', SUB('2')].concat(log([V('W')], [V('P')])),
          then: ['= ' + f(0.25) + ' × ', f(table.peak), ' × log', SUB('2')].concat(
            log([f(table.work)], [f(table.peak)]), [' = ', B(f(table.workTerm))]) },
        row.hardest
          ? { label: k('hardest'), math: [V('P'), ' + ', V('R'), ' × ', FRAC(Wt, [V('W')])],
            then: ['= ', f(table.peak), ' + ', f(table.workTerm), ' × ', part, ' = ', B(f(row.share))] }
          : { label: k('share'), math: [V('R'), ' × ', FRAC(Wt, [V('W')])],
            then: ['= ', f(table.workTerm), ' × ', part, ' = ', B(f(row.share))] },
        shown],
      notes: [k('where.technique'), k('rounding')]
    };
  }

  function tipTokens(tokens) {
    return tokens.map(function (t) {
      if (typeof t === 'string') return t;
      if (t.v !== undefined) return t.v;
      if (t.b !== undefined) return t.b;
      if (t.sub !== undefined) return '_' + tipTokens(t.sub);
      return tipTokens(t.frac[0]) + ' / ' + tipTokens(t.frac[1]);
    }).join('');
  }

  /** One line per formula, then the notes. */
  function scoreTipText(model) {
    if (model === null || typeof model !== 'object') return '';
    return model.lines.map(function (line) {
      return line.label + ': ' + tipTokens(line.math) + (line.then ? ' ' + tipTokens(line.then) : '');
    }).concat(model.notes).join('\n');
  }

  function mathNodes(doc, tokens) {
    return tokens.map(function (t) {
      if (typeof t === 'string') return doc.createTextNode(t);
      if (t.v !== undefined) return html(doc, 'var', {}, [doc.createTextNode(t.v)]);
      if (t.b !== undefined) return html(doc, 'strong', {}, [doc.createTextNode(t.b)]);
      if (t.sub !== undefined) return html(doc, 'sub', {}, mathNodes(doc, t.sub));
      return html(doc, 'span', { class: 'math-frac' }, [
        html(doc, 'span', { class: 'math-frac__top' }, mathNodes(doc, t.frac[0])),
        html(doc, 'span', { class: 'visually-hidden' }, [doc.createTextNode(' / ')]),
        html(doc, 'span', { class: 'math-frac__bottom' }, mathNodes(doc, t.frac[1]))
      ]);
    });
  }

  /**
   * Opens a help tip towards the side of its icon that has room: below by default, above when the pop-up does
   * not fit under the icon and there is more room over it (the last rows of a table are near the bottom of
   * the window). Measured each time the tip is about to show, so scrolling and resizing are taken into
   * account.
   */
  function placeTip(wrap) {
    const pop = typeof wrap.querySelector === 'function' ? wrap.querySelector('.help-tip__pop') : null;
    const view = wrap.ownerDocument && wrap.ownerDocument.defaultView;
    if (pop === null || !view || typeof wrap.getBoundingClientRect !== 'function') return;
    wrap.removeAttribute('data-above');
    wrap.setAttribute('data-measure', '');
    const need = pop.offsetHeight + 8;
    wrap.removeAttribute('data-measure');
    const box = wrap.getBoundingClientRect();
    const below = view.innerHeight - box.bottom;
    if (need > below && box.top > below) wrap.setAttribute('data-above', '');
  }

  /** The nodes of a tip model: each formula under its label, then the notes. */
  function renderScoreTip(doc, model) {
    return model.lines.map(function (line, i) {
      const last = i === model.lines.length - 1;
      const rows = [html(doc, 'div', { class: 'score-tip__label' }, [doc.createTextNode(line.label)]),
        html(doc, 'div', { class: 'score-tip__math' }, mathNodes(doc, line.math))];
      if (line.then) rows.push(html(doc, 'div', { class: 'score-tip__math' }, mathNodes(doc, line.then)));
      return html(doc, 'div', { class: 'score-tip__line' + (last ? ' score-tip__line--result' : '') }, rows);
    }).concat(model.notes.map(function (note) {
      return html(doc, 'div', { class: 'score-tip__note' }, [doc.createTextNode(note)]);
    }));
  }

  /**
   * Geometry of the technique-frequency bar chart: one row per technique (name left, count right above a thin
   * bar, so long names never collide with the bar). Ordered by the technique ladder (`SG.techniques`
   * `order`); unknown techniques come last, by id. Counts that are zero, negative or not numbers are dropped.
   * `options.label(id, i18nKey)` overrides the translated label.
   */
  function chartModel(counts, options) {
    const o = options || {};
    const width = isNum(o.width) && o.width > 0 ? o.width : CHART_WIDTH;
    const rowHeight = isNum(o.rowHeight) && o.rowHeight > 0 ? o.rowHeight : CHART_ROW;
    const barHeight = isNum(o.barHeight) && o.barHeight > 0 ? o.barHeight : CHART_BAR;
    const minBar = isNum(o.minBarWidth) && o.minBarWidth >= 0 ? o.minBarWidth : CHART_MIN_BAR;
    const labelOf = typeof o.label === 'function' ? o.label : techniqueLabel;

    const entries = [];
    Object.keys(counts || {}).forEach(function (id) {
      const count = counts[id];
      if (!isNum(count) || count <= 0) return;
      const info = techniqueInfo(id);
      entries.push({ id: id, count: count, order: info.order, group: info.group, key: info.key });
    });
    entries.sort(function (a, b) {
      if (a.order !== b.order) {
        if (a.order === null) return 1;
        if (b.order === null) return -1;
        return a.order - b.order;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    let max = 0;
    let total = 0;
    entries.forEach(function (e) {
      if (e.count > max) max = e.count;
      total += e.count;
    });
    const bars = entries.map(function (e, i) {
      const y = i * rowHeight;
      const ratio = max > 0 ? e.count / max : 0;
      return {
        id: e.id,
        key: e.key,
        label: labelOf(e.id, e.key),
        group: e.group,
        order: e.order,
        count: e.count,
        ratio: round2(ratio),
        y: y,
        labelY: y + CHART_LABEL_Y,
        valueX: width,
        barY: y + CHART_BAR_Y,
        barHeight: barHeight,
        barWidth: round2(Math.min(width, Math.max(minBar, ratio * width))),
        trackWidth: width
      };
    });
    return {
      width: width,
      height: bars.length * rowHeight,
      rowHeight: rowHeight,
      max: max,
      total: total,
      empty: bars.length === 0,
      bars: bars
    };
  }

  // ---- The texts of a table model (pure, in the current language) ----

  function fmt(x, options) {
    return SG.i18n && typeof SG.i18n.formatNumber === 'function' ? SG.i18n.formatNumber(x, options) : String(x);
  }

  function fmt2(x) {
    return fmt(x, { maximumFractionDigits: 2 });
  }

  /** The change of a term, rounded after the subtraction: "+0.91", "\u221220". */
  function signed(d) {
    const rounded = Math.round(d * 100) / 100;
    return rounded >= 0 ? '+' + fmt2(rounded) : '\u2212' + fmt2(-rounded);
  }

  function techName(id) {
    return typeof id === 'string' ? techniqueLabel(id, 'technique.' + id) : '\u2013';
  }

  function levelName(level) {
    if (typeof level !== 'string') return '\u2013';
    return hasText('difficulty.' + level) ? translate('difficulty.' + level) : level;
  }

  function cellName(cell) {
    return SG.i18n && typeof SG.i18n.cellLabel === 'function' ? SG.i18n.cellLabel(cell) : '#' + (cell + 1);
  }

  /** "a", "a and b", "a, b and c". */
  function listOf(items) {
    if (items.length < 2) return items.join('');
    return translate('replay.list.last', { list: items.slice(0, -1).join(', '), last: items[items.length - 1] });
  }

  function cellsText(cells) {
    return listOf(cells.map(cellName));
  }

  /** The Total of a table: its score and the change from the step shown before. */
  function totalText(table) {
    const score = isNum(table.score) ? table.score : 0;
    if (!isNum(table.change)) return fmt(score);
    if (table.change === 0) return translate('steps.techniques.unchanged', { score: fmt(score) });
    return translate('steps.techniques.change', { score: fmt(score), change: signed(table.change) });
  }

  /** What a move did, as the `{change}` fragment of a sentence (`moves`: the moves of the step). */
  function changeText(moves, count, signs) {
    if (count !== 1 || moves.length !== 1) return translate('steps.jump.change.moves', { count: count });
    const move = moves[0];
    const removed = Array.isArray(move.removed) ? move.removed : [];
    const restored = Array.isArray(move.restored) ? move.restored : [];
    if (typeof move.sign === 'number' && signs !== null && Array.isArray(signs[move.sign])) {
      const pair = signs[move.sign];
      return translate('steps.jump.change.sign', {
        sign: translate('replay.sign', { a: cellName(pair[0]), b: cellName(pair[1]) })
      });
    }
    if (removed.length > 0 && restored.length > 0) {
      return translate('steps.jump.change.exchange',
        { removedCells: cellsText(removed), restoredCells: cellsText(restored) });
    }
    if (removed.length > 0) {
      return translate('steps.jump.change.remove', { count: removed.length, cells: cellsText(removed) });
    }
    if (restored.length > 0) {
      return translate('steps.jump.change.restore', { count: restored.length, cells: cellsText(restored) });
    }
    return translate('steps.jump.change.moves', { count: count });
  }

  /** The sentence that says which part of the move carries the jump (null: nothing is claimed). */
  function causeText(t, step) {
    const cause = t.cause;
    if (!cause) return null;
    const after = t.after;
    const changes = Array.isArray(cause.changes) ? cause.changes : [];
    const restores = changes.some(function (c) { return c.action === 'restore'; });
    switch (cause.class) {
      case 'single-culprit': {
        const c = cause.culprit;
        if (!c) return null;
        const args = { cell: cellName(c.cell), score: fmt(c.score), otherScore: fmt(c.otherScore) };
        if (c.action === 'restore') return translate('steps.jump.cause.culpritRestore', args);
        if (restores) return translate('steps.jump.cause.culpritExchange', args);
        if (changes.length === 2) {
          const other = changes.filter(function (x) { return x.cell !== c.cell; })[0];
          return translate('steps.jump.cause.culprit',
            Object.assign(args, { other: other ? cellName(other.cell) : '\u2013' }));
        }
        return translate('steps.jump.cause.culpritGroup',
          Object.assign(args, { count: Math.max(changes.length - 1, 1) }));
      }
      case 'together': {
        const scores = listOf((cause.singles || []).map(function (s) { return fmt(s.score); }));
        return translate(restores ? 'steps.jump.cause.togetherExchange' : 'steps.jump.cause.together',
          { scores: scores, after: fmt(after.total) });
      }
      case 'mixed': {
        const part = cause.largest;
        if (!part) return null;
        return translate(restores ? 'steps.jump.cause.partsExchange' : 'steps.jump.cause.parts',
          { cell: cellName(part.cell), score: fmt(part.score), after: fmt(after.total) });
      }
      case 'single-sign':
        return translate('steps.jump.cause.sign');
      case 'single-cell': {
        const only = changes[0] || (cause.singles || [])[0];
        return translate(only && only.action === 'restore' ? 'steps.jump.cause.cellRestore'
          : 'steps.jump.cause.cell');
      }
      case 'multi-move': {
        if (!isNum(cause.k)) return translate('steps.jump.cause.combined', { count: cause.n });
        const ctx = step && step.context ? step.context : null;
        const moves = ctx && Array.isArray(ctx.moves) ? ctx.moves : [];
        const signs = ctx && Array.isArray(ctx.signs) ? ctx.signs : null;
        const at = isNum(cause.kMove) ? moves[cause.kMove] : null;
        return translate(cause.verifiedOnly ? 'steps.jump.cause.groupedRated' : 'steps.jump.cause.grouped', {
          technique: techName(after.hardest), k: fmt(cause.k), n: fmt(cause.n),
          change: changeText(at ? [at] : [], 1, signs)
        });
      }
      case 'unavailable':
        return translate('steps.jump.cause.unavailable');
      default:
        return null;
    }
  }

  /** The lines about how the generator chose the move (what its log records). */
  function choiceLines(choice) {
    const lines = [];
    if (!choice) return lines;
    const rated = choice.rated;
    const refused = choice.refused;
    if (choice.kind === 'guided') {
      const others = isNum(choice.others) ? choice.others : 0;
      const nulls = isNum(choice.nulls) ? choice.nulls : 0;
      if (others >= 1) {
        lines.push(translate('steps.jump.choice.guided', {
          count: others, rated: rated, refused: refused, max: isNum(choice.max) ? fmt(choice.max) : '\u2013'
        }));
        if (nulls >= 1) lines.push(translate('steps.jump.choice.nulls', { count: nulls }));
      } else if (nulls >= 1) {
        lines.push(translate('steps.jump.choice.span', { rated: rated, refused: refused }));
        lines.push(translate('steps.jump.choice.noScores'));
      } else {
        if (rated >= 2) lines.push(translate('steps.jump.choice.span', { rated: rated, refused: refused }));
        lines.push(translate('steps.jump.choice.only'));
      }
      if (choice.chosen === null) lines.push(translate('steps.jump.choice.chosenUnscored'));
    } else if (choice.kind === 'random') {
      lines.push(translate('steps.jump.choice.random'));
    } else if (choice.kind === 'checked') {
      lines.push(translate('steps.jump.choice.checked'));
    } else if (choice.kind === 'combined') {
      lines.push(translate('steps.jump.choice.none', { count: choice.count }));
    }
    return lines;
  }

  /** What the first use of the new technique does: a line per cells with the same candidates, then the digits. */
  function effectLines(use) {
    const lines = [];
    const byCell = new Map();
    (use.eliminations || []).forEach(function (pair) {
      if (!byCell.has(pair[0])) byCell.set(pair[0], []);
      if (byCell.get(pair[0]).indexOf(pair[1]) === -1) byCell.get(pair[0]).push(pair[1]);
    });
    const groups = new Map();
    byCell.forEach(function (digits, cell) {
      const sorted = digits.slice().sort(function (a, b) { return a - b; });
      const key = sorted.join(',');
      if (!groups.has(key)) groups.set(key, { digits: sorted, cells: [] });
      groups.get(key).cells.push(cell);
    });
    groups.forEach(function (group) {
      lines.push(translate('steps.jump.removedHere', {
        count: group.digits.length, digits: listOf(group.digits.map(String)), cells: cellsText(group.cells)
      }));
    });
    (use.placements || []).forEach(function (pair) {
      lines.push(translate('steps.jump.placedHere', { digit: String(pair[1]), cell: cellName(pair[0]) }));
    });
    return lines;
  }

  /** The "Why?" lines of a jump: the terms of the score, the level, the choice, the proof and the scope. */
  function whyLines(t, proof) {
    const before = t.before;
    const after = t.after;
    const lines = [
      translate('steps.jump.p', { from: fmt2(before.P), to: fmt2(after.P), change: signed(after.P - before.P) }),
      translate('steps.jump.w', { from: fmt2(before.W), to: fmt2(after.W) }),
      translate('steps.jump.r', { from: fmt2(before.R), to: fmt2(after.R), change: signed(after.R - before.R) }),
      translate('steps.jump.e', { from: fmt(before.E), to: fmt(after.E) }),
      translate('steps.jump.v', { from: fmt2(before.V), to: fmt2(after.V), change: signed(after.V - before.V) }),
      translate('steps.jump.total', {
        from: fmt(before.total), to: fmt(after.total), change: signed(after.total - before.total)
      }),
      translate('steps.jump.level', { from: levelName(before.level), to: levelName(after.level) })
    ];
    choiceLines(t.choice).forEach(function (line) { lines.push(line); });
    if (proof && proof.restricted === 'stuck') lines.push(translate('steps.jump.lighter', { w: fmt(after.P) }));
    if (t.auditScope === 'ratedOnly') lines.push(translate('steps.jump.auditScope'));
    if (proof && proof.firstUse) {
      const use = proof.firstUse;
      lines.push(translate('steps.jump.firstUse', { k: fmt(use.k), n: fmt(use.n) }));
      if (hasText(use.i18nKey)) lines.push(translate(use.i18nKey, use.i18nArgs));
      effectLines(use).forEach(function (line) { lines.push(line); });
    }
    lines.push(translate('steps.jump.scope'));
    return lines;
  }

  /** The callout of a jump: the heading, two or three sentences and the "Why?" lines. */
  function calloutText(step, t, proof) {
    const before = t.before;
    const after = t.after;
    const ctx = step && step.context ? step.context : null;
    const all = ctx && Array.isArray(ctx.moves) ? ctx.moves : [];
    const signs = ctx && Array.isArray(ctx.signs) ? ctx.signs : null;
    const hasSpan = step && isNum(step.first) && isNum(step.last);
    const count = hasSpan ? step.last - step.first + 1 : 1;
    const change = changeText(hasSpan ? all.slice(step.first, step.last + 1) : [], count, signs);
    const sentences = [
      after.hardest !== before.hardest
        ? translate('steps.jump.uses', {
          change: change,
          technique: techName(after.hardest),
          count: after.counts && isNum(after.counts[after.hardest]) ? after.counts[after.hardest] : 0,
          previous: techName(before.hardest)
        })
        : translate('steps.jump.work', { change: change, from: fmt2(before.W), to: fmt2(after.W) }),
      translate('steps.jump.full', { w: fmt(after.P) })
    ];
    const cause = causeText(t, step);
    if (cause !== null) sentences.push(cause);
    return {
      heading: translate('steps.jump.heading', {
        from: fmt(before.total), to: fmt(after.total), change: signed(after.total - before.total)
      }),
      sentences: sentences,
      why: whyLines(t, proof)
    };
  }

  const STATUS_IDS = Object.freeze(['capped', 'stuck', 'ambiguous', 'unverified']);

  /** The sentences of a board that cannot be rated, and the note that its rows are attempts. */
  function statusText(table) {
    const reasons = Array.isArray(table.reasons) ? table.reasons : [];
    let main = STATUS_IDS.indexOf(table.status) !== -1 ? table.status : 'unverified';
    if (reasons.indexOf('missingRating') !== -1) main = 'missingRating';
    else if (reasons.indexOf('contradiction') !== -1) main = 'contradiction';
    const sentences = [translate('steps.status.' + main)];
    if (reasons.indexOf('ambiguous') !== -1 && main !== 'ambiguous') {
      sentences.push(translate('steps.status.ambiguous'));
    }
    const counts = table.counts || {};
    const attempted = table.status !== 'capped' && Object.keys(counts).some(function (id) {
      return isNum(counts[id]) && counts[id] > 0;
    });
    return { sentences: sentences, attempted: attempted ? translate('steps.status.attempted') : null };
  }

  /**
   * The texts of a table model (`player.tableAt`) for its step: { total, badge, line, rowLabel,
   * totalHighlight, callout, status }. `total` is the Total cell (the score and its change; null for the
   * start and a status); `badge` { kind: 'jump' | 'first', text }; `line` the sentence of a first rated
   * puzzle or a new hardest technique; `rowLabel` { technique, text }; `callout` { heading, sentences,
   * why } of a score jump; `status` { sentences, attempted } of a board that cannot be rated. Pure: it only
   * reads `table`, `step.first`, `step.last` and `step.context` ({ moves, signs }), and never rates a board.
   */
  function explain(table, step) {
    const out = { total: null, badge: null, line: null, rowLabel: null, totalHighlight: false,
      callout: null, status: null };
    if (!table || typeof table !== 'object' || table.state === 'start') return out;
    if (table.state === 'status') {
      out.status = statusText(table);
      return out;
    }
    out.total = totalText(table);
    const t = table.transition;
    if (!t || !t.before || !t.after) return out;
    if (t.tier === 'first') {
      out.badge = { kind: 'first', text: translate('steps.first.label') };
      out.line = translate('steps.first', { score: fmt(t.after.total), technique: techName(t.after.hardest) });
    } else if (t.tier === 'jump') {
      const ratio = isNum(t.ratio) ? t.ratio
        : SG.replay && typeof SG.replay.badgeRatio === 'function'
          ? SG.replay.badgeRatio(t.before.total, t.after.total) : null;
      if (isNum(ratio)) {
        out.badge = { kind: 'jump', text: translate('steps.jump.badge', {
          ratio: fmt(ratio, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        }) };
      }
      out.totalHighlight = !t.newHardest;
      out.callout = calloutText(step, t, table.proof || null);
    } else if (t.tier === 'newPeak') {
      out.line = translate('steps.newPeak', {
        technique: techName(t.after.hardest), w: fmt(t.after.P), previous: techName(t.before.hardest),
        previousW: fmt(t.before.P)
      });
    }
    if (t.newHardest && (t.tier === 'jump' || t.tier === 'newPeak')) {
      out.rowLabel = { technique: t.after.hardest, text: translate('steps.techniques.newPeak') };
    }
    return out;
  }

  function html(doc, tag, attrs, children) {
    const el = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      el.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { el.appendChild(child); });
    return el;
  }

  /**
   * Shows the description of the replay step on show inside `#steps-root` (`#step-detail`, created when
   * missing), with a legend of the board frames after it. `options.table(position)` gives the table model of
   * a position (`SG.player` `tableAt`: `state` 'start', 'zero', 'scored', 'final' or 'status', see `explain`);
   * the panel draws its states (the start, the steps before the first score, the score table with the change
   * of the Total, the status of a board that cannot be rated), the tier line, the badge in the heading and
   * the callout with "Why?" of a score jump; without it, or when it returns null, the step shows no table.
   * Returns { setSteps(steps) (none on show until `setPosition`), setPosition(p) (0: none, a hint to use the
   * replay controls), clear(), getPosition(), refresh() (also done on `SG.i18n.onChange`), destroy() }.
   */
  function create(rootEl, options) {
    if (!rootEl || typeof rootEl.querySelector !== 'function') {
      throw new TypeError('SG.stepView.create needs the #steps-root element');
    }
    const opts = options || {};
    const doc = rootEl.ownerDocument;
    const created = [];

    let detailEl = rootEl.querySelector('#step-detail');
    if (detailEl === null) {
      detailEl = html(doc, 'div', { id: 'step-detail', class: 'step-detail' });
      rootEl.appendChild(detailEl);
      created.push(detailEl);
    }
    const legendEl = html(doc, 'ul', { class: 'steps-legend', hidden: true });
    detailEl.parentNode.insertBefore(legendEl, detailEl.nextSibling);
    created.push(legendEl);
    detailEl.textContent = '';
    const headingEl = rootEl.querySelector('#steps-heading');

    let steps = [];
    let position = 0;

    function player() {
      return SG.player || null;
    }

    function renderLegend() {
      legendEl.textContent = '';
      LEGEND.forEach(function (entry) {
        if (!steps.some(function (s) { return usesMark(s, entry[0]); })) return;
        legendEl.appendChild(html(doc, 'li', { class: 'steps-legend__item', 'data-mark': entry[0] }, [
          html(doc, 'span', { class: 'steps-legend__swatch steps-legend__swatch--' + entry[0],
            'aria-hidden': 'true' }),
          html(doc, 'span', {}, [doc.createTextNode(translate(entry[1]))])
        ]));
      });
      legendEl.hidden = legendEl.firstChild === null;
      legendEl.setAttribute('aria-label', translate('steps.legend.label'));
    }

    /** The heading, "Step k – Title", then the badge of a first rated puzzle or of a score jump (text). */
    function renderHeading(text) {
      if (headingEl === null) return;
      const step = steps[position - 1];
      const p = player();
      const title = step
        ? translate('steps.title', { number: String(position), title: p ? p.stepTitle(step) : step.kind })
        : translate('shell.steps.heading');
      headingEl.textContent = '';
      headingEl.appendChild(doc.createTextNode(title));
      if (text.badge !== null) {
        headingEl.appendChild(doc.createTextNode(' '));
        headingEl.appendChild(html(doc, 'span', { class: 'step-badge step-badge--' + text.badge.kind },
          [doc.createTextNode(text.badge.text)]));
      }
    }

    function formatNumber(n, options) {
      return SG.i18n && typeof SG.i18n.formatNumber === 'function' ? SG.i18n.formatNumber(n, options) : String(n);
    }

    function cell(tag, text, cls) {
      return html(doc, tag, cls ? { class: cls } : {}, [doc.createTextNode(text)]);
    }

    /** Opens on hover, focus and click; Esc closes it. `content` is text or an array of nodes. */
    function helpTip(popId, content, label) {
      if (typeof doc.createElementNS !== 'function') return null;
      const svgNs = 'http://www.w3.org/2000/svg';
      const use = doc.createElementNS(svgNs, 'use');
      use.setAttribute('href', '#ic-help');
      const svg = doc.createElementNS(svgNs, 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.appendChild(use);
      const pop = html(doc, 'div', { class: 'help-tip__pop', id: popId, role: 'tooltip' },
        typeof content === 'string' ? [doc.createTextNode(content)] : content);
      const button = html(doc, 'button', {
        type: 'button', class: 'help-tip__btn', 'aria-describedby': popId, 'aria-label': label
      }, [svg]);
      const wrap = html(doc, 'span', { class: 'help-tip help-tip--inline' }, [button, pop]);
      ['mouseenter', 'focusin'].forEach(function (name) {
        wrap.addEventListener(name, function () { placeTip(wrap); });
      });
      button.addEventListener('click', function () {
        if (wrap.getAttribute('data-open') === null) {
          placeTip(wrap);
          wrap.setAttribute('data-open', '');
        } else {
          wrap.removeAttribute('data-open');
        }
      });
      wrap.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') wrap.removeAttribute('data-open');
      });
      wrap.addEventListener('focusout', function () { wrap.removeAttribute('data-open'); });
      return wrap;
    }

    function techniqueHelp(id, name) {
      const key = 'technique.' + id + '.desc';
      if (!hasText(key)) return null;
      return helpTip('step-tech-' + id + '-help', translate(key),
        translate('steps.techniques.help', { name: name }));
    }

    function partHelp(part, name) {
      return helpTip('step-part-' + part + '-help', translate('steps.techniques.' + part + '.desc'),
        translate('steps.techniques.help', { name: name }));
    }

    function nameCell(text, help) {
      const label = html(doc, 'span', { class: 'result-table__name' }, [doc.createTextNode(text)]);
      if (help !== null) label.appendChild(help);
      return html(doc, 'th', { scope: 'row' }, [label]);
    }

    /**
     * The whole number (`data-role="score"`) and a help icon for the `scoreTip` model `tip` (null: no icon).
     */
    function scoreCell(part, name, value, tip) {
      const children = [html(doc, 'span', { 'data-role': 'score' }, [doc.createTextNode(value)])];
      const help = tip === null ? null : helpTip('step-score-' + part + '-help', renderScoreTip(doc, tip),
        translate('steps.techniques.help.score', { name: name }));
      if (help !== null) {
        help.setAttribute('class', 'help-tip help-tip--inline help-tip--end');
        help.setAttribute('data-role', 'score-help');
        children.push(help);
      }
      return html(doc, 'td', { class: 'result-table__num' },
        [html(doc, 'span', { class: 'result-table__score' }, children)]);
    }

    function numHead(col) {
      const key = 'steps.techniques.col.' + col;
      return html(doc, 'th', { class: 'result-table__num' }, [
        html(doc, 'span', { class: 'result-table__full' }, [doc.createTextNode(translate(key))]),
        html(doc, 'span', { class: 'result-table__short', 'aria-hidden': 'true' },
          [doc.createTextNode(translate(key + '.short'))])
      ]);
    }

    function nameHead() {
      return html(doc, 'th', {}, [html(doc, 'span', { class: 'visually-hidden' },
        [doc.createTextNode(translate('steps.techniques.col.name'))])]);
    }

    function textBlock(tag, cls, text) {
      return html(doc, tag, { class: cls }, [doc.createTextNode(text)]);
    }

    function block(state) {
      return html(doc, 'div', { class: 'step-detail__techniques', 'data-state': state }, [
        html(doc, 'h3', { class: 'step-detail__subtitle' },
          [doc.createTextNode(translate('steps.techniques.title'))])
      ]);
    }

    /** The start of the replay: the empty grid has no score. */
    function startBlock() {
      const box = block('start');
      box.appendChild(textBlock('p', 'step-detail__empty', translate('replay.start.noScore')));
      return box;
    }

    /**
     * A board that cannot be rated: the sentences of its status, a note that the rows are attempts, and the
     * techniques the solver applied with their uses. No points, work, score, total or tooltip.
     */
    function statusBlock(model, text) {
      const box = html(doc, 'div', { class: 'step-detail__techniques', 'data-state': 'status' });
      text.status.sentences.forEach(function (sentence) {
        box.appendChild(textBlock('p', 'step-status', sentence));
      });
      if (text.status.attempted === null) return box;
      box.appendChild(textBlock('p', 'text-muted step-status__attempted', text.status.attempted));
      const rows = chartModel(model.counts).bars.map(function (bar) {
        return html(doc, 'tr', { 'data-technique': bar.id }, [
          nameCell(bar.label, null), cell('td', formatNumber(bar.count), 'result-table__num')
        ]);
      });
      box.appendChild(html(doc, 'table', { class: 'result-table step-table--status' }, [
        html(doc, 'thead', {}, [html(doc, 'tr', {}, [nameHead(), numHead('count')])]),
        html(doc, 'tbody', {}, rows)
      ]));
      return box;
    }

    /**
     * The techniques the puzzle of a step needs with uses and share of the score. The total is the difficulty
     * score of the puzzle of that step (the one the summary shows at the end) and its change from the step
     * shown before: the technique shares plus that of the empty cells (`SG.difficulty.scoreTable`). Each score
     * has a help icon that explains how it was calculated. A step before the first score (`zero`) has only the
     * empty cells row and the Total.
     */
    function scoreBlock(model, text) {
      const zero = model.state === 'zero';
      const counts = model.counts || {};
      const bars = chartModel(counts).bars;
      const box = block(model.state);
      if (bars.length === 0) {
        box.appendChild(textBlock('p', 'step-detail__empty', translate('steps.techniques.none')));
      }
      const empties = Number.isFinite(model.empties) && model.empties > 0 ? model.empties : 0;
      let table = null;
      if (SG.difficulty && typeof SG.difficulty.scoreTable === 'function') {
        try {
          table = SG.difficulty.scoreTable(counts, empties);
        } catch (err) {
          table = null;
        }
      }
      const byId = {};
      if (table !== null) table.rows.forEach(function (row) { byId[row.id] = row; });
      const hasEmpties = zero || (table !== null && table.empties > 0);
      if (bars.length === 0 && !hasEmpties) return box;

      const rows = bars.map(function (bar) {
        const previous = (model.before && model.before[bar.id]) || 0;
        const more = bar.count - previous;
        const label = html(doc, 'span', { class: 'result-table__name' }, [doc.createTextNode(bar.label)]);
        if (text.rowLabel !== null && text.rowLabel.technique === bar.id) {
          label.appendChild(html(doc, 'span', { class: 'step-table__label', 'data-role': 'new-hardest' },
            [doc.createTextNode(text.rowLabel.text)]));
        }
        const help = techniqueHelp(bar.id, bar.label);
        if (help !== null) label.appendChild(help);
        const name = html(doc, 'th', { scope: 'row' }, [label]);
        const row = byId[bar.id] || null;
        return html(doc, 'tr', { 'data-technique': bar.id }, [
          name,
          cell('td', formatNumber(bar.count) + (more > 0 ? ' (+' + formatNumber(more) + ')' : ''),
            'result-table__num'),
          cell('td', row !== null ? formatNumber(row.points, { maximumFractionDigits: 2 }) : '',
            'result-table__num'),
          cell('td', row !== null ? formatNumber(row.work, { maximumFractionDigits: 2 }) : '',
            'result-table__num'),
          row !== null
            ? scoreCell(bar.id, bar.label, formatNumber(row.total),
              scoreTip('steps.techniques.tip.', 'technique', table, row))
            : cell('td', '', 'result-table__num')
        ]);
      });
      const other = [];
      if (hasEmpties) {
        const emptiesName = translate('steps.techniques.empties');
        other.push(html(doc, 'tr', { 'data-part': 'empties' }, [
          nameCell(emptiesName, partHelp('empties', emptiesName)),
          cell('td', formatNumber(zero ? 0 : table.empties), 'result-table__num'),
          cell('td', '', 'result-table__num'),
          cell('td', '', 'result-table__num'),
          zero ? scoreCell('empties', emptiesName, formatNumber(0), null)
            : scoreCell('empties', emptiesName, formatNumber(table.emptyTotal),
              scoreTip('steps.techniques.tip.', 'empties', table, null))
        ]));
      }
      const head = html(doc, 'tr', {}, [
        nameHead(), numHead('count'), numHead('unit'), numHead('work'), numHead('score')
      ]);
      const foot = html(doc, 'tr', {
        class: 'step-table__total' + (text.totalHighlight ? ' step-table__total--jump' : '')
      }, [
        cell('th', translate('steps.techniques.total')),
        cell('td', '', 'result-table__num'),
        cell('td', '', 'result-table__num'),
        cell('td', !zero && table !== null ? formatNumber(table.work, { maximumFractionDigits: 2 }) : '',
          'result-table__num'),
        scoreCell('total', translate('steps.techniques.total'),
          text.total === null ? formatNumber(0) : text.total,
          !zero && table !== null ? scoreTip('steps.techniques.tip.', 'total', table, null) : null)
      ]);
      const section = function (key) {
        return html(doc, 'tr', { class: 'result-table__section', 'data-section-row': key }, [
          html(doc, 'th', { scope: 'colgroup', colspan: '5' },
            [doc.createTextNode(translate('steps.techniques.section.' + key))])
        ]);
      };
      const groups = [];
      if (rows.length > 0) {
        groups.push(html(doc, 'tbody', { 'data-group': 'technique' }, [section('technique')].concat(rows)));
      }
      if (other.length > 0) {
        groups.push(html(doc, 'tbody', { 'data-group': 'other' }, [section('other')].concat(other)));
      }
      box.appendChild(html(doc, 'table', { class: 'result-table' },
        [html(doc, 'thead', {}, [head])].concat(groups, [html(doc, 'tfoot', {}, [foot])])));
      box.appendChild(html(doc, 'p', { class: 'text-muted result__note result-table__legend', 'data-role': 'legend' }, [
        html(doc, 'span', {}, [doc.createTextNode(translate('steps.techniques.legend.1'))]),
        html(doc, 'span', {}, [doc.createTextNode(translate('steps.techniques.legend.2'))])
      ]));
      return box;
    }

    /** The table block of a position by the state of its model (null: nothing to show). */
    function techniquesBlock(model, text) {
      if (!model) return null;
      if (model.state === 'start') return startBlock();
      if (model.state === 'status') return statusBlock(model, text);
      return scoreBlock(model, text);
    }

    /** The callout of a score jump: heading, two or three sentences, and "Why?" (closed) with its lines. */
    function calloutNode(callout) {
      const why = html(doc, 'details', { class: 'step-why' }, [
        html(doc, 'summary', {}, [doc.createTextNode(translate('steps.jump.why'))]),
        html(doc, 'ul', { class: 'step-why__list' }, callout.why.map(function (line) {
          return html(doc, 'li', {}, [doc.createTextNode(line)]);
        }))
      ]);
      return html(doc, 'div', { class: 'step-callout', 'data-role': 'jump' },
        [textBlock('p', 'step-callout__heading', callout.heading)].concat(
          callout.sentences.map(function (sentence) { return textBlock('p', 'step-callout__text', sentence); }),
          [why]));
    }

    function render() {
      detailEl.textContent = '';
      const step = steps[position - 1];
      const model = typeof opts.table === 'function' && steps.length > 0 ? opts.table(position) : null;
      const text = explain(model, step);
      if (steps.length === 0) {
        detailEl.removeAttribute('data-kind');
      } else if (!step) {
        detailEl.removeAttribute('data-kind');
        detailEl.appendChild(textBlock('p', 'step-detail__empty', translate('steps.detail.empty')));
        const start = techniquesBlock(model, text);
        if (start !== null) detailEl.appendChild(start);
      } else {
        const p = player();
        detailEl.setAttribute('data-kind', step.kind);
        detailEl.appendChild(textBlock('p', 'step-detail__meta', p ? p.stepMeta(step) : ''));
        detailEl.appendChild(textBlock('p', 'step-detail__text', p ? p.describeStep(step) : ''));
        if (text.line !== null) detailEl.appendChild(textBlock('p', 'step-tier', text.line));
        if (text.callout !== null) detailEl.appendChild(calloutNode(text.callout));
        const techniques = techniquesBlock(model, text);
        if (techniques !== null) detailEl.appendChild(techniques);
      }
      renderHeading(text);
      renderLegend();
    }

    const unsubscribeLocale = SG.i18n && typeof SG.i18n.onChange === 'function'
      ? SG.i18n.onChange(render) : null;
    render();

    return {
      setSteps: function setSteps(next) {
        steps = Array.isArray(next) ? next.slice() : [];
        position = 0;
        render();
      },
      setPosition: function setPosition(p) {
        const next = Number.isInteger(p) && p >= 0 && p <= steps.length ? p : 0;
        if (next === position) return;
        position = next;
        render();
      },
      clear: function clear() {
        steps = [];
        position = 0;
        render();
      },
      getPosition: function getPosition() {
        return position;
      },
      refresh: render,
      destroy: function destroy() {
        if (unsubscribeLocale !== null) unsubscribeLocale();
        detailEl.textContent = '';
        created.forEach(function (node) {
          if (node.parentNode) node.parentNode.removeChild(node);
        });
        steps = [];
      }
    };
  }

  /**
   * Whole numbers for the parts of a total that add up to the rounded total (largest remainders get the extra
   * points), so a table of scores can be added up by hand. Used by the summary and the steps.
   */
  function roundToTotal(values, total) {
    const target = Math.round(total);
    const out = values.map(function (v) { return Math.floor(v); });
    let left = target - out.reduce(function (sum, v) { return sum + v; }, 0);
    const order = values.map(function (v, i) { return i; }).sort(function (a, b) {
      return (values[b] - Math.floor(values[b])) - (values[a] - Math.floor(values[a])) || a - b;
    });
    for (let k = 0; k < order.length && left > 0; k++, left--) out[order[k]] += 1;
    return out;
  }

  SG.stepView = {
    STEP_IDS: STEP_IDS,
    chartModel: chartModel,
    explain: explain,
    scoreTip: scoreTip,
    scoreTipText: scoreTipText,
    renderScoreTip: renderScoreTip,
    placeTip: placeTip,
    roundToTotal: roundToTotal,
    create: create
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'steps.title': 'Step {number} – {title}',
      'steps.techniques.title': 'Techniques needed at this step',
      'steps.techniques.none': 'No solving technique is needed yet.',
      'steps.techniques.col.name': 'Item',
      'steps.techniques.col.count': 'Uses',
      'steps.techniques.col.unit': 'Points per use',
      'steps.techniques.col.work': 'Work',
      'steps.techniques.col.score': 'Score',
      'steps.techniques.col.count.short': 'n',
      'steps.techniques.col.unit.short': 'w',
      'steps.techniques.col.work.short': 'W',
      'steps.techniques.col.score.short': 'q',
      'steps.techniques.legend.1': 'n = uses, w = points per use',
      'steps.techniques.legend.2': 'W = work (n × w), q = score',
      'steps.techniques.empties': 'Empty cells',
      'steps.techniques.section.technique': 'Technique',
      'steps.techniques.section.other': 'Other',
      'steps.techniques.empties.desc': 'Empty cells add 80 × E ÷ (E + 40) points, at most 80.',
      'steps.techniques.total': 'Total',
      'steps.techniques.help': 'About \u201c{name}\u201d',
      'steps.techniques.help.score': 'How the score of \u201c{name}\u201d is calculated',
      'steps.techniques.tip.work': 'Work of this technique',
      'steps.techniques.tip.all': 'All the work of the puzzle',
      'steps.techniques.tip.term': 'Work term of the score',
      'steps.techniques.tip.share': 'Its share of the work term',
      'steps.techniques.tip.hardest': 'Hardest technique: its points in full + its share of the work term',
      'steps.techniques.tip.empties': 'Empty cells',
      'steps.techniques.tip.total': 'Score',
      'steps.techniques.tip.shown': 'Shown as (rounded)',
      'steps.techniques.tip.where.technique': 'n = uses, w = points per use, P = points of the hardest technique.',
      'steps.techniques.tip.where.empties': 'E = number of empty cells.',
      'steps.techniques.tip.where.total': 'V = empty cells, P = hardest technique, R = work term.',
      'steps.techniques.tip.rounding': 'The rows are rounded together, so they add up to the total.',
      'steps.detail.empty': 'Use the replay controls under the board to go through the steps of how the ' +
        'puzzle was made. The description of each step shows here.',
      'steps.legend.label': 'Frames on the board',
      'steps.legend.dug': 'Removed in this step',
      'steps.legend.kept': 'Tried, but put back',
      'steps.legend.revealed': 'Clue shown in this step',
      'steps.legend.signRemoved': 'Sign removed in this step',
      'steps.legend.signKept': 'Sign tried, but kept',
      'steps.techniques.change': '{score} ({change})',
      'steps.techniques.unchanged': '{score} (unchanged)',
      'steps.techniques.newPeak': 'New hardest technique',
      'steps.status.capped': 'Not rated: the computational limit for this rating was reached.',
      'steps.status.stuck': 'Not rated: this solver stopped before completing the board.',
      'steps.status.ambiguous': 'Not rated: this board has at least two solutions.',
      'steps.status.unverified': 'Not rated: the page could not confirm a unique solution for this board.',
      'steps.status.attempted': 'The rows show techniques the solver applied, not a validated difficulty rating.',
      'steps.status.missingRating': 'Not rated: no verified final rating is available.',
      'steps.status.contradiction': 'Not rated: the board or deduction trace contains a contradiction.',
      'steps.first.label': 'First rated puzzle',
      'steps.first': 'First rated puzzle: score {score}. The generator\'s solution uses {technique} as its ' +
        'hardest technique.',
      'steps.newPeak': 'The generator\'s solution now uses {technique} (weight {w}) as its hardest technique, ' +
        'instead of {previous} (weight {previousW}).',
      'steps.jump.badge': 'Score jump \u00d7{ratio}',
      'steps.jump.heading': 'Score jump: {from} \u2192 {to} ({change})',
      'steps.jump.change.remove_one': 'the clue at {cells} is removed',
      'steps.jump.change.remove_other': 'the clues at {cells} are removed',
      'steps.jump.change.restore_one': 'the clue at {cells} is restored',
      'steps.jump.change.restore_other': 'the clues at {cells} are restored',
      'steps.jump.change.sign': '{sign} is removed',
      'steps.jump.change.exchange': 'the clues at {removedCells} are removed and those at {restoredCells} ' +
        'are restored',
      'steps.jump.change.moves': 'the {count} changes in this step',
      'steps.jump.uses_one': 'After {change}, the generator\'s solution uses {technique} once; previously, ' +
        'its hardest technique was {previous}.',
      'steps.jump.uses_other': 'After {change}, the generator\'s solution uses {technique} {count} times; ' +
        'previously, its hardest technique was {previous}.',
      'steps.jump.work': 'After {change}, the weighted sum of technique uses in the generator\'s solution ' +
        'grew from {from} to {to}.',
      'steps.jump.full': 'The largest technique weight, {w}, contributes in full as the P term of the score ' +
        '(P = {w}).',
      'steps.jump.cause.culprit': 'Removing the clue at {cell} alone gives {score}; removing the clue at ' +
        '{other} alone gives {otherScore}.',
      'steps.jump.cause.culpritGroup': 'Removing the clue at {cell} alone gives {score}; removing the other ' +
        '{count} clues without it gives {otherScore}.',
      'steps.jump.cause.culpritExchange': 'Removing the clue at {cell} alone gives {score}; the rest of this ' +
        'change without it gives {otherScore}.',
      'steps.jump.cause.culpritRestore': 'Restoring the clue at {cell} alone gives {score}; the rest of this ' +
        'change without it gives {otherScore}.',
      'steps.jump.cause.together': 'Removing each clue alone gives {scores}; removing the whole group gives ' +
        '{after}.',
      'steps.jump.cause.togetherExchange': 'The separate changes give {scores}; the combined change gives ' +
        '{after}.',
      'steps.jump.cause.parts': 'Removing the clue at {cell} alone gives {score}, versus {after} for the ' +
        'whole symmetric group, which is always displayed as one complete change.',
      'steps.jump.cause.partsExchange': 'On its own, the change at {cell} gives {score}, versus {after} for ' +
        'the whole change, which is always displayed as one complete change.',
      'steps.jump.cause.sign': 'This step removes one sign; there is no smaller sign-removal move to show.',
      'steps.jump.cause.cell': 'This step removes one clue; there is no smaller clue-removal move to show.',
      'steps.jump.cause.cellRestore': 'This step restores one clue; there is no smaller clue-restoring move ' +
        'to show.',
      'steps.jump.cause.grouped': 'Within this step, {technique} first appears after complete change {k} of ' +
        '{n} ({change}).',
      'steps.jump.cause.groupedRated': 'The first rated position using {technique} within this step follows ' +
        'change {k} of {n} ({change}).',
      'steps.jump.cause.combined': 'This step combines {count} complete changes; no single cause is named.',
      'steps.jump.cause.unavailable': 'The parts of this change could not all be rated, so no single cause is ' +
        'named.',
      'steps.jump.why': 'Why?',
      'steps.jump.p': 'P, peak technique weight: {from} \u2192 {to} ({change})',
      'steps.jump.w': 'W, weighted sum of technique uses: {from} \u2192 {to}',
      'steps.jump.r': 'R = 0.25 \u00d7 P \u00d7 log\u2082(1 + W \u00f7 P): {from} \u2192 {to} ({change})',
      'steps.jump.e': 'E, number of empty cells: {from} \u2192 {to}',
      'steps.jump.v': 'V = 80 \u00d7 E \u00f7 (E + 40): {from} \u2192 {to} ({change})',
      'steps.jump.total': 'Score = V + P + R, rounded: {from} \u2192 {to} ({change})',
      'steps.jump.level': 'Level: {from} \u2192 {to}',
      'steps.jump.choice.guided_one': 'The log records {rated} candidates before this accepted removal, with ' +
        '{refused} rejected; the other candidate with a completed score reached {max} by the generator\'s ' +
        'limited check.',
      'steps.jump.choice.guided_other': 'The log records {rated} candidates before this accepted removal, ' +
        'with {refused} rejected; the other {count} candidates with completed scores reached at most {max} ' +
        'by the generator\'s limited check.',
      'steps.jump.choice.span': 'The log records {rated} candidates before this accepted removal, with ' +
        '{refused} rejected.',
      'steps.jump.choice.nulls_one': 'The limited check did not finish the board for {count} other retained ' +
        'candidate, so it has no numerical check score.',
      'steps.jump.choice.nulls_other': 'The limited check did not finish the boards for {count} other ' +
        'retained candidates, so they have no numerical check score.',
      'steps.jump.choice.noScores': 'No numerical score from the limited check is available for the other ' +
        'candidates.',
      'steps.jump.choice.only': 'The log records no other retained removal candidate for this choice.',
      'steps.jump.choice.chosenUnscored': 'The generator\'s limited check did not finish the board after the ' +
        'chosen removal; its objective ranks such a removal above every removal it could finish.',
      'steps.jump.choice.random': 'This group was picked at random.',
      'steps.jump.choice.checked': 'The log contains no comparable-candidate scores for this change.',
      'steps.jump.choice.none': 'This step combines {count} changes; it is not a single candidate-comparison ' +
        'round.',
      'steps.jump.lighter': 'In a separate check, this solver stopped before completing the board using only ' +
        'techniques with weights below {w}.',
      'steps.jump.auditScope': 'Only the recorded boards that could be rated were searched for smaller steps.',
      'steps.jump.firstUse': 'First use in the generator\'s solution: logical deduction {k} of {n}.',
      'steps.jump.removedHere_one': 'In that deduction, candidate {digits} is removed from {cells}.',
      'steps.jump.removedHere_other': 'In that deduction, candidates {digits} are removed from {cells}.',
      'steps.jump.placedHere': 'In that deduction, {digit} is placed in {cell}.',
      'steps.jump.scope': 'These numbers describe the generator\'s solution, not every way to solve the puzzle.'
    },
    vi: {
      'steps.title': 'Bước {number} – {title}',
      'steps.techniques.title': 'Kỹ thuật cần dùng ở bước này',
      'steps.techniques.none': 'Chưa cần kỹ thuật giải nào.',
      'steps.techniques.col.name': 'Mục',
      'steps.techniques.col.count': 'Lần dùng',
      'steps.techniques.col.unit': 'Điểm mỗi lần',
      'steps.techniques.col.work': 'Khối lượng',
      'steps.techniques.col.score': 'Điểm',
      'steps.techniques.col.count.short': 'n',
      'steps.techniques.col.unit.short': 'w',
      'steps.techniques.col.work.short': 'W',
      'steps.techniques.col.score.short': 'q',
      'steps.techniques.legend.1': 'n = lần dùng, w = điểm mỗi lần',
      'steps.techniques.legend.2': 'W = khối lượng (n × w), q = điểm',
      'steps.techniques.empties': 'Ô trống',
      'steps.techniques.section.technique': 'Kỹ thuật',
      'steps.techniques.section.other': 'Khác',
      'steps.techniques.empties.desc': 'Các ô trống cộng 80 × E ÷ (E + 40) điểm, tối đa 80.',
      'steps.techniques.total': 'Tổng',
      'steps.techniques.help': 'Giải thích về \u201c{name}\u201d',
      'steps.techniques.help.score': 'Cách tính điểm của \u201c{name}\u201d',
      'steps.techniques.tip.work': 'Khối lượng của kỹ thuật này',
      'steps.techniques.tip.all': 'Toàn bộ khối lượng của đề',
      'steps.techniques.tip.term': 'Phần khối lượng của điểm số',
      'steps.techniques.tip.share': 'Phần của nó trong phần khối lượng',
      'steps.techniques.tip.hardest': 'Kỹ thuật khó nhất: đủ điểm của nó + phần của nó trong phần khối lượng',
      'steps.techniques.tip.empties': 'Ô trống',
      'steps.techniques.tip.total': 'Điểm số',
      'steps.techniques.tip.shown': 'Hiển thị (đã làm tròn)',
      'steps.techniques.tip.where.technique': 'n = số lần dùng, w = điểm mỗi lần, P = điểm của kỹ thuật khó nhất.',
      'steps.techniques.tip.where.empties': 'E = số ô trống.',
      'steps.techniques.tip.where.total': 'V = ô trống, P = kỹ thuật khó nhất, R = phần khối lượng.',
      'steps.techniques.tip.rounding': 'Các dòng được làm tròn cùng nhau nên cộng lại đúng bằng tổng.',
      'steps.detail.empty': 'Dùng các nút phát lại dưới bàn cờ để xem từng bước tạo ra đề. Mô tả của mỗi ' +
        'bước hiện ở đây.',
      'steps.legend.label': 'Các khung trên bàn cờ',
      'steps.legend.dug': 'Bị xóa ở bước này',
      'steps.legend.kept': 'Đã thử nhưng trả lại',
      'steps.legend.revealed': 'Số cho sẵn được hiện ở bước này',
      'steps.legend.signRemoved': 'Dấu bị bỏ ở bước này',
      'steps.legend.signKept': 'Dấu đã thử nhưng giữ lại',
      'steps.techniques.change': '{score} ({change})',
      'steps.techniques.unchanged': '{score} (không đổi)',
      'steps.techniques.newPeak': 'Kỹ thuật khó nhất mới',
      'steps.status.capped': 'Chưa chấm điểm: đã đạt giới hạn tính toán cho lần chấm này.',
      'steps.status.stuck': 'Chưa chấm điểm: bộ giải này đã dừng khi chưa giải xong đề.',
      'steps.status.ambiguous': 'Chưa chấm điểm: đề này có ít nhất hai lời giải.',
      'steps.status.unverified': 'Chưa chấm điểm: chưa xác nhận được đề này có lời giải duy nhất.',
      'steps.status.attempted': 'Các dòng chỉ ghi những kỹ thuật bộ giải đã áp dụng, không phải kết quả chấm ' +
        'độ khó.',
      'steps.status.missingRating': 'Chưa chấm điểm: không có kết quả chấm điểm cuối cùng đã được xác nhận.',
      'steps.status.contradiction': 'Chưa chấm điểm: bàn cờ hoặc chuỗi suy luận có mâu thuẫn.',
      'steps.first.label': 'Đề đầu tiên được chấm điểm',
      'steps.first': 'Đề đầu tiên được chấm điểm: {score} điểm. Trong lời giải mà trình sinh đề tìm được, ' +
        'kỹ thuật khó nhất là {technique}.',
      'steps.newPeak': 'Trong lời giải mới của trình sinh đề, kỹ thuật khó nhất là {technique} (trọng số {w}), ' +
        'thay cho {previous} (trọng số {previousW}).',
      'steps.jump.badge': 'Điểm tăng vọt \u00d7{ratio}',
      'steps.jump.heading': 'Điểm tăng vọt: {from} \u2192 {to} ({change})',
      'steps.jump.change.remove_one': 'khi bỏ số cho sẵn ở {cells}',
      'steps.jump.change.remove_other': 'khi bỏ số cho sẵn ở {cells}',
      'steps.jump.change.restore_one': 'khi khôi phục số cho sẵn ở {cells}',
      'steps.jump.change.restore_other': 'khi khôi phục số cho sẵn ở {cells}',
      'steps.jump.change.sign': 'khi bỏ {sign}',
      'steps.jump.change.exchange': 'khi bỏ số ở {removedCells} và khôi phục số ở {restoredCells}',
      'steps.jump.change.moves': '{count} thay đổi trong bước này',
      'steps.jump.uses_one': 'Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} 1 lần; ' +
        'trước đó, kỹ thuật khó nhất là {previous}.',
      'steps.jump.uses_other': 'Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} {count} ' +
        'lần; trước đó, kỹ thuật khó nhất là {previous}.',
      'steps.jump.work': 'Sau {change}, tổng trọng số các lần áp dụng kỹ thuật trong lời giải tăng từ {from} ' +
        'lên {to}.',
      'steps.jump.full': 'Trọng số cao nhất {w} được tính toàn bộ vào điểm ở thành phần P (P = {w}).',
      'steps.jump.cause.culprit': 'Chỉ bỏ số ở {cell} cho {score} điểm; chỉ bỏ số ở {other} cho ' +
        '{otherScore} điểm.',
      'steps.jump.cause.culpritGroup': 'Chỉ bỏ số ở {cell} cho {score} điểm; bỏ {count} số còn lại mà không ' +
        'bỏ số ở ô này cho {otherScore} điểm.',
      'steps.jump.cause.culpritExchange': 'Chỉ bỏ số ở {cell} cho {score} điểm; thực hiện các thay đổi còn ' +
        'lại và giữ nguyên ô này cho {otherScore} điểm.',
      'steps.jump.cause.culpritRestore': 'Chỉ khôi phục số ở {cell} cho {score} điểm; thực hiện các thay đổi ' +
        'còn lại và giữ nguyên ô này cho {otherScore} điểm.',
      'steps.jump.cause.together': 'Bỏ riêng từng số cho các điểm {scores}; bỏ cả nhóm cho {after} điểm.',
      'steps.jump.cause.togetherExchange': 'Từng thay đổi riêng lẻ cho các điểm {scores}; thay đổi gộp cho ' +
        '{after} điểm.',
      'steps.jump.cause.parts': 'Chỉ bỏ số ở {cell} cho {score} điểm, còn cả nhóm đối xứng cho {after} điểm ' +
        'và luôn được hiển thị trong một thay đổi trọn vẹn.',
      'steps.jump.cause.partsExchange': 'Riêng thay đổi ở {cell} cho {score} điểm, còn cả thay đổi cho ' +
        '{after} điểm và luôn được hiển thị trong một thay đổi trọn vẹn.',
      'steps.jump.cause.sign': 'Bước này bỏ một dấu; không có thay đổi bỏ dấu nhỏ hơn để hiển thị.',
      'steps.jump.cause.cell': 'Bước này bỏ một số cho sẵn; không có thay đổi bỏ số nhỏ hơn để hiển thị.',
      'steps.jump.cause.cellRestore': 'Bước này khôi phục một số cho sẵn; không có thay đổi khôi phục số nhỏ ' +
        'hơn để hiển thị.',
      'steps.jump.cause.grouped': 'Trong bước này, {technique} xuất hiện lần đầu sau thay đổi trọn vẹn thứ ' +
        '{k}/{n} ({change}).',
      'steps.jump.cause.groupedRated': 'Trong bước này, trạng thái đầu tiên được chấm điểm có dùng ' +
        '{technique} xuất hiện sau thay đổi thứ {k}/{n} ({change}).',
      'steps.jump.cause.combined': 'Bước này gộp {count} thay đổi trọn vẹn; không xác định riêng một nguyên ' +
        'nhân.',
      'steps.jump.cause.unavailable': 'Không chấm được điểm cho mọi phần của thay đổi này, nên không nêu ' +
        'nguyên nhân riêng.',
      'steps.jump.why': 'Vì sao?',
      'steps.jump.p': 'P, trọng số cao nhất: {from} \u2192 {to} ({change})',
      'steps.jump.w': 'W, tổng trọng số các lần áp dụng kỹ thuật: {from} \u2192 {to}',
      'steps.jump.r': 'R = 0,25 \u00d7 P \u00d7 log\u2082(1 + W \u00f7 P): {from} \u2192 {to} ({change})',
      'steps.jump.e': 'E, số ô trống: {from} \u2192 {to}',
      'steps.jump.v': 'V (điểm của ô trống) = 80 \u00d7 E \u00f7 (E + 40): {from} \u2192 {to} ({change})',
      'steps.jump.total': 'Điểm = V + P + R, làm tròn: {from} \u2192 {to} ({change})',
      'steps.jump.level': 'Mức độ: {from} \u2192 {to}',
      'steps.jump.choice.guided_one': 'Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó ' +
        '{refused} bị loại; phương án khác còn lại có điểm sau phép kiểm tra giới hạn của trình sinh đề ' +
        'đạt {max} điểm.',
      'steps.jump.choice.guided_other': 'Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong ' +
        'đó {refused} bị loại; {count} phương án khác có điểm sau phép kiểm tra giới hạn của trình sinh đề ' +
        'đạt cao nhất {max} điểm.',
      'steps.jump.choice.span': 'Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó ' +
        '{refused} bị loại.',
      'steps.jump.choice.nulls_one': 'Với {count} phương án khác được giữ lại, phép kiểm tra giới hạn chưa ' +
        'giải xong đề, nên các phương án đó không có điểm kiểm tra.',
      'steps.jump.choice.nulls_other': 'Với {count} phương án khác được giữ lại, phép kiểm tra giới hạn chưa ' +
        'giải xong đề, nên các phương án đó không có điểm kiểm tra.',
      'steps.jump.choice.noScores': 'Không có điểm từ phép kiểm tra giới hạn để so sánh với các phương án ' +
        'khác.',
      'steps.jump.choice.only': 'Bản ghi không có phương án bỏ số nào khác được giữ lại cho lần chọn này.',
      'steps.jump.choice.chosenUnscored': 'Phép kiểm tra giới hạn của trình sinh đề chưa giải xong đề sau lần ' +
        'bỏ số được chọn; tiêu chí lựa chọn ưu tiên các phương án chưa giải xong đề hơn những phương án đã ' +
        'giải xong trong phép kiểm tra này.',
      'steps.jump.choice.random': 'Nhóm này được chọn ngẫu nhiên.',
      'steps.jump.choice.checked': 'Bản ghi không có dữ liệu so sánh các phương án cho thay đổi này.',
      'steps.jump.choice.none': 'Bước này gồm {count} thay đổi; nó không tương ứng với một vòng so sánh ' +
        'phương án duy nhất.',
      'steps.jump.lighter': 'Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số ' +
        'dưới {w} và đã dừng khi chưa giải xong đề.',
      'steps.jump.auditScope': 'Chỉ các trạng thái bàn cờ đã được ghi lại và chấm điểm mới được xét để chia ' +
        'nhỏ các bước.',
      'steps.jump.firstUse': 'Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận {k}/{n}.',
      'steps.jump.removedHere_one': 'Ở bước suy luận đó, loại ứng viên {digits} khỏi {cells}.',
      'steps.jump.removedHere_other': 'Ở bước suy luận đó, loại ứng viên {digits} khỏi {cells}.',
      'steps.jump.placedHere': 'Ở bước suy luận đó, điền {digit} vào {cell}.',
      'steps.jump.scope': 'Các con số này mô tả cách giải mà trình sinh đề tìm được, không đại diện cho mọi ' +
        'cách giải đề.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
