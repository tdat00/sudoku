/**
 * `SG.player`: replay of a generation (design.md 7.3). After a generation the board shows the finished
 * puzzle at once; the replay steps back through how it was made, nothing plays by itself. The steps come from
 * the analysis of `SG.replay` (one rated board per move of the dig log), never from the event trace, and the
 * page never rates a board: it only shows what the analysis holds.
 *
 * `buildViews(result, analysis)` (pure): `{ compact, details, signs, cellCount }`, two views of the same
 * moves. The compact view has the few steps `SG.replay` chose so that the score never goes down; the details
 * view has one step per complete move. A step is plain data: `{ index, view, role, first, last, position,
 * kind, phase, line, parts, key, args, meta, values, structure, marks, signs, metrics, context, table }`.
 * `kind` is the title kind (see `KINDS`), `parts` the sentences (a run of moves of one kind per sentence),
 * `marks` and `signs` the frames of the NET change of the step, `metrics` counters over the moves up to the
 * step, and `table` the model of the score table (`state`: 'start', 'zero', 'scored', 'final' or 'status').
 *
 * `createPreparation(options)` (pure, no DOM): the controller that decides when the analysis is asked for.
 * With a Web Worker it starts by itself once the result is shown; without one (main thread, for example
 * `file://`) it waits for the user's "Prepare score tables" press (`consent`); a cached puzzle whose record
 * is missing waits for the record. `create(options)`: `load(result, { analysis, position })` draws the
 * finished puzzle;
 * `setAnalysis(analysis)` builds both views and shows the LAST position; `setView('compact' | 'details')`
 * switches and keeps the place; `first`, `prev`, `next`, `last`, `seek(position)` move; `tableAt(position)`
 * is the table model of a position; `setPreparation(state)` shows the status block; `bindControls(rootEl)`
 * wires `#btn-first #btn-prev #btn-next #btn-last #scrubber #player-time #replay-view-details #replay-status
 * #replay-status-text #btn-prepare-replay`; `reset()` forgets the puzzle. Callbacks: `onPosition({ position,
 * length, step, direction })` after every move ('forward' | 'backward' | 'seek'), `onStateChange({ position,
 * length, finished, loaded })` when the length or the end flag change, `onSteps({ steps, position, view })`
 * when the steps change (new analysis or other view), `onPrepare()` for the "Prepare score tables" button.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.player && typeof SG.player.create === 'function') return;

  const LAYER_NAMES = Object.freeze(['regions', 'overlays', 'grid', 'cells', 'cages', 'ineq', 'word']);

  const STRUCTURE_LAYERS = Object.freeze(['cages', 'ineq']);

  const KINDS = Object.freeze(['solution', 'cages', 'signs', 'clues', 'random', 'dig', 'guided', 'search',
    'signDig', 'reveal', 'mixed', 'restart', 'final']);

  const MARK_CLASSES = Object.freeze({ dug: 'cell--dug', kept: 'cell--kept', revealed: 'cell--revealed' });

  const VIEW_NAMES = Object.freeze(['compact', 'details']);

  /** The moves that clear cells for good: they count as accepted removals. */
  const REMOVING_KINDS = Object.freeze(['random', 'guided', 'searchRemove', 'exchange']);

  /** The only refusal reasons the sentences name; any other, or several, read as "still needed". */
  const NAMED_REASONS = Object.freeze(['ambiguous', 'techniques', 'tooHard']);

  /** The states of the preparation in which the controls are disabled. */
  const BLOCKING_STATES = Object.freeze(['consent', 'trace', 'preparing']);

  const CELL_LISTS = Object.freeze(['cellList', 'cells', 'removedCells', 'restoredCells']);

  function countClues(values) {
    let n = 0;
    for (let i = 0; i < values.length; i++) if (values[i] > 0) n++;
    return n;
  }

  function logError(err) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
  }

  function sumOf(list, pick) {
    let total = 0;
    list.forEach(function (item) { total += pick(item); });
    return total;
  }

  function isCount(value) {
    return typeof value === 'number' && isFinite(value);
  }

  /** The span and the trail of a move (what the log recorded before and after it), without the nulls. */
  function partsOfMove(move) {
    const span = move.span || null;
    return span === null ? [] : span.trail ? [span, span.trail] : [span];
  }

  function rejectedCellsOf(move) {
    let cells = [];
    partsOfMove(move).forEach(function (part) { cells = cells.concat(part.rejected || []); });
    return cells;
  }

  function rejectedSignsOf(move) {
    let signs = [];
    partsOfMove(move).forEach(function (part) { signs = signs.concat(part.rejectedSigns || []); });
    return signs;
  }

  function ratedOf(move) {
    return sumOf(partsOfMove(move), function (part) { return part.rated || 0; });
  }

  function refusedOf(move) {
    return sumOf(partsOfMove(move), function (part) { return part.refused || 0; });
  }

  /** The sole reason of the refusals of a run of moves when it is one the texts name, else 'mixed'. */
  function reasonOf(list) {
    const names = {};
    list.forEach(function (move) {
      partsOfMove(move).forEach(function (part) {
        Object.keys(part.reasons || {}).forEach(function (name) {
          if (part.reasons[name] > 0) names[name] = true;
        });
      });
    });
    const found = Object.keys(names);
    return found.length === 1 && NAMED_REASONS.indexOf(found[0]) !== -1 ? found[0] : 'mixed';
  }

  function ascending(set) {
    return Array.from(set).sort(function (a, b) { return a - b; });
  }

  /** Counters over the moves 1 .. i: accepted removals and refusals (a restart does not reset them). */
  function countersOf(moves) {
    const out = [{ accepted: 0, rejected: 0 }];
    for (let i = 1; i < moves.length; i++) {
      const move = moves[i];
      const before = out[i - 1];
      let accepted = before.accepted;
      if (REMOVING_KINDS.indexOf(move.kind) !== -1) accepted += move.removed.length;
      else if (move.kind === 'sign') accepted += 1;
      out.push({
        accepted: accepted,
        rejected: before.rejected + rejectedCellsOf(move).length + rejectedSignsOf(move).length
      });
    }
    return out;
  }

  /** The title kind of a view step (the rows of the table in design.md 7.3). */
  function kindOf(vs, analysis) {
    if (vs.role === 'solution') return 'solution';
    if (vs.role === 'structure') return analysis.structure === 'cages' ? 'cages' : 'signs';
    if (vs.role === 'restart') return 'restart';
    if (vs.role === 'final') return 'final';
    if (vs.phases.length > 1) return 'mixed';
    switch (vs.phases[0]) {
      case 'random': return analysis.randomOrder ? 'random' : 'dig';
      case 'guided': return 'guided';
      case 'search': return 'search';
      case 'reveal': return 'reveal';
      case 'clues': return 'clues';
      case 'signs':
      case 'signsMinimal': return 'signDig';
      default: return 'dig';
    }
  }

  function phaseOf(role) {
    return role === 'solution' ? 'fullGrid' : role === 'structure' ? 'extraStructure' : 'dig';
  }

  /** The pseudocode line a step explains in the Help: from the phase of its last move. */
  function lineOfPhase(phase) {
    switch (phase) {
      case 'random':
      case 'signs':
      case 'signsMinimal': return 'check';
      case 'guided':
      case 'search': return 'deeper';
      default: return null;
    }
  }

  function lineOf(role, vs, moves) {
    if (role === 'solution') return 'place';
    if (role === 'structure') return 'build';
    if (role === 'restart' || role === 'final') return 'verify';
    return lineOfPhase(vs.phases.length > 1 ? moves[vs.last].phase : vs.phases[0]);
  }

  /** The maximal runs of consecutive moves `first .. last` of one kind. */
  function runsOf(moves, first, last) {
    const runs = [];
    for (let i = first; i <= last; i++) {
      const run = runs.length > 0 ? runs[runs.length - 1] : null;
      if (run !== null && run.kind === moves[i].kind) run.moves.push(moves[i]);
      else runs.push({ kind: moves[i].kind, moves: [moves[i]] });
    }
    return runs;
  }

  /** The sentence of one run of moves of one kind. */
  function runPart(run, ctx) {
    const list = run.moves;
    const last = list[list.length - 1];
    const removed = sumOf(list, function (m) { return m.removed.length; });
    const restored = sumOf(list, function (m) { return m.restored.length; });
    switch (run.kind) {
      case 'clues':
        return { key: 'replay.clues', args: { clues: countClues(last.values) } };
      case 'random': {
        if (ctx.analysis.rebuilt) {
          return { key: 'replay.dig.rebuilt', args: { removed: removed, unit: 'cell' } };
        }
        const family = ctx.analysis.randomOrder ? 'replay.random' : 'replay.dig';
        const kept = sumOf(list, function (m) { return rejectedCellsOf(m).length; });
        if (kept === 0) return { key: family + '.all', args: { removed: removed, unit: 'cell' } };
        return { key: family + '.some', args: { tried: removed + kept, removed: removed, kept: kept,
          reason: reasonOf(list), unit: 'cell' } };
      }
      case 'guided': {
        let cellList = [];
        list.forEach(function (m) { cellList = cellList.concat(m.removed); });
        const args = { rated: sumOf(list, ratedOf), refused: sumOf(list, refusedOf), cellList: cellList };
        if (list.length === 1) return { key: 'replay.guided', args: args };
        return { key: 'replay.guided.rounds', args: Object.assign({ rounds: list.length }, args) };
      }
      case 'searchRemove':
        return { key: 'replay.searchRemove', args: { removed: removed, unit: 'cell' } };
      case 'exchange':
        return { key: 'replay.exchange', args: { count: list.length, removed: removed, revealed: restored,
          unit: 'cell' } };
      case 'searchAdd':
        return { key: 'replay.reveal.search', args: { revealed: restored } };
      case 'reveal':
        return { key: 'replay.reveal', args: { revealed: restored, clues: countClues(last.values) } };
      case 'sign': {
        const kept = sumOf(list, function (m) { return rejectedSignsOf(m).length; });
        const signs = last.alive === null || last.alive === undefined ? 0 : last.alive.length;
        if (kept === 0) return { key: 'replay.signDig.all', args: { removed: list.length, signs: signs,
          unit: 'sign' } };
        return { key: 'replay.signDig.some', args: { tried: list.length + kept, removed: list.length,
          kept: kept, reason: reasonOf(list), signs: signs, unit: 'sign' } };
      }
      default:
        return null;
    }
  }

  /** What the step folds in (compact view only): an inner peak, rows that could not be rated. */
  function foldedParts(transition) {
    const parts = [];
    const folded = transition === null ? null : transition.folded;
    if (folded === null) return parts;
    if (folded.peak !== null) {
      if (folded.aboveBand && folded.revealed > 0) {
        parts.push({ key: 'replay.folded.reveal', args: { peak: folded.peak, revealed: folded.revealed } });
      } else {
        parts.push({ key: 'replay.folded.peak', args: { peak: folded.peak } });
      }
    }
    if (folded.unscored > 0) parts.push({ key: 'replay.folded.unscored', args: { count: folded.unscored } });
    return parts;
  }

  /** The one-line summary of a step that moves (the table of design.md 7.3). */
  function movesMeta(vs, ctx, values) {
    const list = ctx.moves.slice(vs.first, vs.last + 1);
    const removed = sumOf(list, function (m) { return m.removed.length; });
    const restored = sumOf(list, function (m) { return m.kind === 'clues' ? 0 : m.restored.length; });
    const revealed = sumOf(list, function (m) { return m.restored.length; });
    const signMoves = list.filter(function (m) { return m.kind === 'sign'; });
    const keptCells = sumOf(list, function (m) { return rejectedCellsOf(m).length; });
    const clues = countClues(values);
    if (removed > 0 && restored > 0) {
      return { key: 'replay.meta.change', args: { removed: removed, revealed: restored, clues: clues,
        unit: 'cell' } };
    }
    if (signMoves.length > 0) {
      const alive = list[list.length - 1].alive;
      const signs = alive === null || alive === undefined ? 0 : alive.length;
      const keptSigns = sumOf(list, function (m) { return rejectedSignsOf(m).length; });
      if (keptSigns > 0) {
        return { key: 'replay.meta.signDigKept', args: { removed: signMoves.length, kept: keptSigns,
          signs: signs, unit: 'sign' } };
      }
      return { key: 'replay.meta.signDig', args: { removed: signMoves.length, signs: signs, unit: 'sign' } };
    }
    if (removed > 0) {
      if (keptCells > 0) {
        return { key: 'replay.meta.digKept', args: { removed: removed, kept: keptCells, clues: clues,
          unit: 'cell' } };
      }
      return { key: 'replay.meta.dig', args: { removed: removed, clues: clues, unit: 'cell' } };
    }
    if (restored > 0) return { key: 'replay.meta.reveal', args: { revealed: restored, clues: clues } };
    if (revealed > 0) return { key: 'replay.meta.clues', args: { clues: clues } };
    return { key: 'replay.meta.dig', args: { removed: 0, clues: clues, unit: 'cell' } };
  }

  /** The sentences and the one-line summary of a view step. */
  function textOf(vs, kind, viewName, transition, values, ctx) {
    const model = ctx.result.model;
    const n = ctx.n;
    const finalSigns = model.inequalities.length;
    switch (vs.role) {
      case 'solution':
        return { parts: [{ key: 'replay.solution', args: { filled: n, unit: 'cell' } }],
          meta: { key: 'replay.meta.solution', args: { filled: n, unit: 'cell' } } };
      case 'structure': {
        if (kind === 'cages') {
          const count = model.cages.length;
          return { parts: [{ key: 'replay.cages', args: { count: count } }],
            meta: { key: 'replay.meta.cages', args: { count: count } } };
        }
        const signs = ctx.signs !== null ? ctx.signs.length : finalSigns;
        return { parts: [{ key: 'replay.signs', args: { signs: signs } }],
          meta: { key: 'replay.meta.signs', args: { signs: signs } } };
      }
      case 'restart': {
        const parts = [{ key: 'replay.restart', args: { filled: n, unit: 'cell' } }];
        const folded = viewName === 'compact' && transition !== null ? transition.folded.restart : null;
        if (folded !== null && folded.peak !== null) {
          parts.push({ key: 'replay.restart.folded', args: { peak: folded.peak, moves: folded.moves } });
        }
        return { parts: parts, meta: { key: 'replay.meta.restart', args: { filled: n, unit: 'cell' } } };
      }
      case 'final': {
        const args = { clues: countClues(values) };
        if (finalSigns > 0) args.signs = finalSigns;
        const key = finalSigns > 0 ? 'replay.final.signs' : 'replay.final';
        return { parts: [{ key: key, args: args }],
          meta: { key: 'replay.meta.' + key.slice('replay.'.length), args: Object.assign({}, args) } };
      }
      default: {
        const parts = [];
        runsOf(ctx.moves, vs.first, vs.last).forEach(function (run) {
          const part = runPart(run, ctx);
          if (part !== null) parts.push(part);
        });
        if (parts.length === 0) parts.push({ key: 'replay.dig.all', args: { removed: 0, unit: 'cell' } });
        if (viewName === 'compact') foldedParts(transition).forEach(function (part) { parts.push(part); });
        if (ctx.analysis.rebuilt) parts.push({ key: 'replay.rebuilt', args: {} });
        return { parts: parts, meta: movesMeta(vs, ctx, values) };
      }
    }
  }

  /** The frames of the NET change of a step that moves, by cell. */
  function cellMarks(vs, ctx, values) {
    const moves = ctx.moves;
    const opening = moves[vs.first].kind === 'clues';
    const start = opening ? new Int32Array(ctx.n) : moves[vs.first - 1].values;
    const dug = [];
    const revealed = [];
    const asked = new Set();
    for (let c = 0; c < ctx.n; c++) {
      if (start[c] !== 0 && values[c] === 0) dug.push(c);
      else if (start[c] === 0 && values[c] !== 0) revealed.push(c);
    }
    for (let i = vs.first; i <= vs.last; i++) {
      rejectedCellsOf(moves[i]).forEach(function (c) { asked.add(c); });
    }
    const shown = new Set(revealed);
    const kept = ascending(asked).filter(function (c) { return values[c] !== 0 && !shown.has(c); });
    return { dug: dug, kept: kept, revealed: revealed };
  }

  /** The sign marks of a step by index into the sign list of the analysis (null: no signs). */
  function signMarks(vs, ctx) {
    if (ctx.signs === null) return null;
    const moves = ctx.moves;
    if (vs.role === 'solution' || vs.role === 'structure') return { hidden: [], removed: [], kept: [] };
    const aliveEnd = moves[vs.last].alive || [];
    const endSet = new Set(aliveEnd);
    if (vs.role === 'final') {
      const hiddenAtEnd = [];
      ctx.signs.forEach(function (pair, i) { if (!endSet.has(i)) hiddenAtEnd.push(i); });
      return { hidden: hiddenAtEnd, removed: [], kept: [] };
    }
    const aliveStart = moves[vs.first - 1].alive || [];
    const startSet = new Set(aliveStart);
    const hidden = [];
    ctx.signs.forEach(function (pair, i) { if (!startSet.has(i)) hidden.push(i); });
    const removed = aliveStart.filter(function (i) { return !endSet.has(i); });
    const asked = new Set();
    for (let i = vs.first; i <= vs.last; i++) {
      rejectedSignsOf(moves[i]).forEach(function (s) { asked.add(s); });
    }
    return {
      hidden: hidden,
      removed: removed.slice().sort(function (a, b) { return a - b; }),
      kept: ascending(asked).filter(function (s) { return endSet.has(s); })
    };
  }

  function metricsOf(vs, ctx) {
    if (ctx.analysis.fallback !== null || vs.role === 'solution' || vs.role === 'structure') return null;
    const at = ctx.counters[vs.last];
    return { attempts: at.accepted + at.rejected, accepted: at.accepted, rejected: at.rejected, clues: 0 };
  }

  /** The model of the score table of a step (the rows of design.md 7.3 and 13.14). */
  function tableOf(vs, viewName, transition, ctx) {
    const analysis = ctx.analysis;
    const proof = analysis.proofs && analysis.proofs[vs.position] ? analysis.proofs[vs.position] : null;
    const rating = analysis.ratings[vs.position];
    const base = { transition: transition, proof: proof, position: vs.position };
    if (vs.role === 'solution' || vs.role === 'structure' || vs.role === 'restart') {
      const change = vs.role === 'restart' && viewName === 'details' && transition !== null
        ? transition.change : null;
      return Object.assign({ state: 'zero', status: null, reasons: [], counts: {}, before: null, empties: 0,
        score: 0, change: change }, base);
    }
    if (isCount(rating.score)) {
      const before = transition !== null && isCount(transition.before.total)
        ? Object.assign({}, transition.before.counts) : null;
      return Object.assign({ state: vs.role === 'final' ? 'final' : 'scored', status: null, reasons: [],
        counts: Object.assign({}, rating.counts), before: before, empties: rating.empties,
        score: rating.score, change: transition !== null ? transition.change : null }, base);
    }
    return Object.assign({ state: 'status', status: rating.status, reasons: rating.reasons.slice(),
      counts: Object.assign({}, rating.counts), before: null, empties: rating.empties, score: null,
      change: null }, base);
  }

  function startTable() {
    return { state: 'start', status: null, reasons: [], counts: {}, before: null, empties: 0, score: null,
      change: null, transition: null, proof: null, position: null };
  }

  function buildStep(ctx, viewName, vs, k) {
    const analysis = ctx.analysis;
    const role = vs.role;
    const kind = kindOf(vs, analysis);
    const transition = typeof vs.transition === 'number' ? analysis.transitions[vs.transition] || null : null;
    const values = role === 'final' ? Int32Array.from(ctx.result.givens) : ctx.moves[vs.position].values;
    const text = textOf(vs, kind, viewName, transition, values, ctx);
    const moving = role === 'moves';
    const metrics = metricsOf(vs, ctx);
    if (metrics !== null) metrics.clues = countClues(values);
    return {
      index: k + 1,
      view: viewName,
      role: role,
      first: vs.first,
      last: vs.last,
      position: vs.position,
      kind: kind,
      phase: phaseOf(role),
      line: lineOf(role, vs, ctx.moves),
      parts: text.parts,
      key: text.parts[0].key,
      args: text.parts[0].args,
      meta: text.meta,
      values: values,
      structure: role !== 'solution' && analysis.structure !== null,
      marks: moving ? cellMarks(vs, ctx, values) : { dug: [], kept: [], revealed: [] },
      signs: signMarks(vs, ctx),
      metrics: metrics,
      context: ctx.context,
      table: tableOf(vs, viewName, transition, ctx)
    };
  }

  /**
   * The two views of an analysis for a result: `{ compact, details, signs, cellCount }` with `compact` and
   * `details` = `{ name, steps, signs, cellCount }`; `signs` lists every sign of a Greater-Than dig as
   * `[a, b]` (value[a] < value[b]), indexed by the sign marks of the steps. Pure: it reads, never rates.
   */
  function buildViews(result, analysis) {
    const n = result.model.cellCount;
    const ctx = {
      result: result,
      analysis: analysis,
      moves: analysis.moves,
      n: n,
      signs: analysis.signs,
      counters: countersOf(analysis.moves),
      context: Object.freeze({ moves: analysis.moves, signs: analysis.signs })
    };
    const views = { compact: null, details: null, signs: analysis.signs, cellCount: n };
    VIEW_NAMES.forEach(function (name) {
      views[name] = {
        name: name,
        steps: analysis.views[name].steps.map(function (vs, k) { return buildStep(ctx, name, vs, k); }),
        signs: analysis.signs,
        cellCount: n
      };
    });
    return views;
  }

  /** The board at a position: what `render` draws. Pure. */
  function viewAt(built, position) {
    const p = Math.max(0, Math.min(built.steps.length, Math.floor(Number(position)) || 0));
    const step = p === 0 ? null : built.steps[p - 1];
    if (step === null) {
      return { position: 0, step: null, values: new Int32Array(built.cellCount), final: false,
        structure: false, marks: { dug: [], kept: [], revealed: [] }, signs: null };
    }
    return { position: p, step: step, values: step.values, final: step.kind === 'final',
      structure: step.structure, marks: step.marks, signs: step.signs };
  }

  function T(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function unitText(unit, count) {
    const key = unit === 'sign' ? 'replay.unit.sign' : unit === 'clue' ? 'unit.clue'
      : unit === 'removal' ? 'replay.unit.removal' : unit === 'move' ? 'replay.unit.move' : 'unit.cell';
    return T(key, { count: count });
  }

  function cellName(cell, labeler) {
    return SG.i18n && typeof SG.i18n.cellLabel === 'function' ? SG.i18n.cellLabel(cell, labeler)
      : '#' + (cell + 1);
  }

  /** "R1C2", "R1C2 and R9C8", "R3C3, R7C7 and R6C9". */
  function listText(cells, labeler) {
    const names = cells.map(function (c) { return cellName(c, labeler); });
    if (names.length < 2) return names.join('');
    return T('replay.list.last', { list: names.slice(0, -1).join(', '), last: names[names.length - 1] });
  }

  function formatNumber(value) {
    return SG.i18n && typeof SG.i18n.formatNumber === 'function'
      ? SG.i18n.formatNumber(value) : String(value);
  }

  /** The arguments of a sentence as the text shows them: counted units, cell names, formatted numbers. */
  function displayArgs(args, labeler) {
    const a = args || {};
    const unit = a.unit || 'cell';
    const out = {};
    Object.keys(a).forEach(function (name) {
      const v = a[name];
      if (name === 'unit') return;
      if (CELL_LISTS.indexOf(name) !== -1) out[name] = listText(v, labeler);
      else if (name === 'reason') out[name] = T('replay.reason.' + v);
      else if (name === 'clues' || name === 'revealed') out[name] = unitText('clue', v);
      else if (name === 'signs') out[name] = unitText('sign', v);
      else if (name === 'rated') out[name] = unitText('removal', v);
      else if (name === 'moves') out[name] = unitText('move', v);
      else if (name === 'peak') out[name] = formatNumber(v);
      else if (name === 'filled' || name === 'tried' || name === 'removed' || name === 'kept') {
        out[name] = unitText(unit, v);
      } else out[name] = v;
    });
    return out;
  }

  /** Every sentence of a step (null: position 0) in the current language, joined with one space. */
  function describeStep(step, labeler) {
    if (step === null || step === undefined) return T('replay.start');
    const parts = Array.isArray(step.parts) && step.parts.length > 0 ? step.parts
      : [{ key: step.key, args: step.args }];
    return parts.map(function (part) { return T(part.key, displayArgs(part.args, labeler)); }).join(' ');
  }

  function stepTitle(step) {
    return T('replay.title.' + step.kind);
  }

  /** The one-line summary of a step. */
  function stepMeta(step, labeler) {
    return T(step.meta.key, displayArgs(step.meta.args, labeler));
  }

  function positionText(position, length) {
    return position === 0 ? T('replay.position.start')
      : T('replay.position', { step: position, total: length });
  }

  /**
   * Creates the player. `options.board`: a `SG.boardView` view (without one only callbacks and controls
   * work); used: `setValues`, `setGivens`, `clearHighlights`, `highlight`, `setLayerVisible`, and for
   * Greater-Than `setModel` and `setSignMarks`. Returns { load, setPreparation, setAnalysis, setView,
   * getView, tableAt, reset, first, prev, next, last, seek, state, describe, getSteps, getStep, bindControls,
   * destroy }. Callbacks: `onPosition`, `onStateChange`, `onSteps`, `onPrepare` (see the header).
   */
  function create(options) {
    const o = options || {};
    const board = o.board || null;
    const onPosition = typeof o.onPosition === 'function' ? o.onPosition : null;
    const onStateChange = typeof o.onStateChange === 'function' ? o.onStateChange : null;
    const onSteps = typeof o.onSteps === 'function' ? o.onSteps : null;
    const onPrepare = typeof o.onPrepare === 'function' ? o.onPrepare : null;

    let views = null;
    let viewName = 'compact';
    let built = null;
    let result = null;
    let position = 0;
    let fullModel = null;
    let shownModel = null;
    let stateKey = '';
    let ui = null;
    let destroyed = false;
    let prep = { status: 'idle', done: 0, total: 0 };

    function length() {
      return built === null ? 0 : built.steps.length;
    }

    function state() {
      const len = length();
      return { position: position, length: len, finished: len > 0 && position === len,
        loaded: built !== null };
    }

    function safely(fn, arg) {
      try {
        fn(arg);
      } catch (err) {
        logError(err);
      }
    }

    function callBoard(name, a, b) {
      if (board !== null && typeof board[name] === 'function') board[name](a, b);
    }

    /** Greater-Than: the board draws every sign during the replay and the model of the result at the end. */
    function ensureModel(kind) {
      if (board === null || typeof board.setModel !== 'function' || kind === shownModel) return;
      if (kind === 'full') {
        if (fullModel === null) {
          const signs = built.signs.map(function (pair) { return { a: pair[0], b: pair[1] }; });
          fullModel = SG.greaterThan && typeof SG.greaterThan.withSigns === 'function'
            ? SG.greaterThan.withSigns(result.model, signs) : result.model;
        }
        board.setModel(fullModel);
      } else {
        board.setModel(result.model);
      }
      shownModel = kind;
    }

    /** The finished puzzle, drawn at once: its clues, every layer, no frame. */
    function drawFinished() {
      if (board === null || result === null) return;
      callBoard('clearHighlights');
      callBoard('setValues', result.givens);
      callBoard('setGivens', result.givens);
      if (typeof board.setLayerVisible === 'function') {
        LAYER_NAMES.forEach(function (name) { board.setLayerVisible(name, true); });
      }
      callBoard('setSignMarks', null);
    }

    function render() {
      if (board === null || built === null) return;
      const view = viewAt(built, position);
      if (built.signs !== null) ensureModel(view.final ? 'final' : 'full');
      callBoard('setValues', view.values);
      callBoard('setGivens', view.final ? result.givens : null);
      callBoard('clearHighlights');
      Object.keys(MARK_CLASSES).forEach(function (name) {
        if (view.marks[name].length > 0) callBoard('highlight', view.marks[name], MARK_CLASSES[name]);
      });
      if (typeof board.setLayerVisible === 'function') {
        LAYER_NAMES.forEach(function (name) {
          board.setLayerVisible(name, view.structure || STRUCTURE_LAYERS.indexOf(name) === -1);
        });
      }
      callBoard('setSignMarks', view.final ? null : view.signs);
    }

    function setProp(el, prop, value) {
      if (el[prop] !== value) el[prop] = value;
    }

    function setAttr(el, name, value) {
      if (el.getAttribute(name) !== value) el.setAttribute(name, value);
    }

    function updateTicks(length) {
      const el = ui.ticks;
      if (!el || ui.tickCount === length || !el.ownerDocument) return;
      ui.tickCount = length;
      el.textContent = '';
      if (length < 1) return;
      el.style.setProperty('--n', String(length));
      for (let i = 0; i <= length; i++) {
        const tick = el.ownerDocument.createElement('span');
        tick.className = 'player__tick';
        tick.style.setProperty('--i', String(i));
        el.appendChild(tick);
      }
    }

    /** The notice, the progress or the failure the status block shows for a preparation state (or null). */
    function statusInfo() {
      switch (prep.status) {
        case 'consent':
          return { text: T('replay.prepare.notice', { button: T('replay.prepare.button') }), button: true };
        case 'trace':
          return { text: T('replay.preparing.trace'), button: false };
        case 'preparing': {
          const counts = { done: formatNumber(prep.done), total: formatNumber(prep.total) };
          return { text: T('replay.preparing', counts), button: false };
        }
        case 'unavailable':
          return { text: T('replay.trace.unavailable'), button: false };
        case 'error':
          return { text: T('replay.prepare.error'), button: false };
        default:
          return null;
      }
    }

    function updateUi() {
      if (ui === null) return;
      const s = state();
      const browsing = s.loaded && BLOCKING_STATES.indexOf(prep.status) === -1;
      updateTicks(s.loaded ? s.length : 0);
      [ui.first, ui.prev, ui.next, ui.last].forEach(function (el) {
        if (el) setProp(el, 'disabled', !browsing);
      });
      if (ui.scrubber) {
        setProp(ui.scrubber, 'disabled', !browsing);
        setProp(ui.scrubber, 'max', String(s.length));
        setProp(ui.scrubber, 'value', String(s.position));
        const step = s.loaded && s.position > 0 ? built.steps[s.position - 1] : null;
        const text = !s.loaded ? '' : step === null ? positionText(0, s.length)
          : positionText(s.position, s.length) + ': ' + stepTitle(step);
        setAttr(ui.scrubber, 'aria-valuetext', text);
      }
      if (ui.time) setProp(ui.time, 'textContent', s.loaded ? positionText(s.position, s.length) : '');
      if (ui.toggle) {
        setProp(ui.toggle, 'disabled', !browsing);
        setProp(ui.toggle, 'checked', s.loaded && viewName === 'details');
      }
      const info = statusInfo();
      if (ui.status) setProp(ui.status, 'hidden', info === null);
      if (ui.statusText) setProp(ui.statusText, 'textContent', info === null ? '' : info.text);
      if (ui.prepare) {
        setProp(ui.prepare, 'hidden', info === null || !info.button);
        setProp(ui.prepare, 'disabled', false);
      }
    }

    function emitState() {
      const s = state();
      const key = [s.length, s.finished, s.loaded].join('|');
      if (key === stateKey) return;
      stateKey = key;
      if (onStateChange !== null) safely(onStateChange, s);
    }

    function emitPosition(direction) {
      if (onPosition === null) return;
      safely(onPosition, {
        position: position,
        length: length(),
        step: built === null || position === 0 ? null : built.steps[position - 1],
        direction: direction
      });
    }

    function seekTo(target, direction) {
      if (destroyed || built === null) return;
      const wanted = Math.floor(Number(target));
      if (!isFinite(wanted)) return;
      const p = Math.max(0, Math.min(length(), wanted));
      if (p === position) {
        updateUi();
        return;
      }
      position = p;
      render();
      updateUi();
      emitPosition(direction);
      emitState();
    }

    /** Tells the app that the steps changed (a new analysis, the other view). */
    function emitSteps() {
      if (onSteps === null || built === null) return;
      safely(onSteps, { steps: built.steps, position: position, view: viewName });
    }

    /**
     * Forgets the views, stores the result and draws its finished puzzle at once: nothing can be browsed
     * until `setAnalysis` (or `opts.analysis`, with `opts.position`) gives the steps. The view starts as
     * 'compact'; the choice is not kept from one puzzle to the next.
     */
    function load(res, opts) {
      if (destroyed) return;
      const wasFull = shownModel === 'full';
      views = null;
      built = null;
      viewName = 'compact';
      result = res;
      position = 0;
      fullModel = null;
      shownModel = wasFull ? 'full' : 'final';
      if (wasFull) ensureModel('final');
      drawFinished();
      updateUi();
      emitState();
      if (opts && opts.analysis) setAnalysis(opts.analysis, { position: opts.position });
    }

    /** Builds both views from the analysis of the loaded result and shows the LAST position of the view. */
    function setAnalysis(analysis, opts) {
      if (destroyed || result === null) return;
      views = buildViews(result, analysis);
      built = views[viewName];
      const wanted = opts && Number.isInteger(opts.position) ? opts.position : length();
      position = Math.max(0, Math.min(length(), wanted));
      render();
      updateUi();
      emitSteps();
      emitState();
      emitPosition('seek');
    }

    /** The step of `to` that stands for the step `p` of the current view (R6), or 0 for the start. */
    function mappedPosition(to) {
      if (position === 0) return 0;
      const step = built.steps[position - 1];
      const steps = to.steps;
      const find = function (test) {
        for (let i = 0; i < steps.length; i++) if (test(steps[i])) return i + 1;
        return steps.length;
      };
      if (step.role === 'solution' || step.role === 'structure' || step.role === 'final') {
        return find(function (s) { return s.role === step.role; });
      }
      const moving = function (s) { return s.role === 'moves' || s.role === 'restart'; };
      if (to.name === 'details') {
        return find(function (s) { return moving(s) && s.position === step.last; });
      }
      return find(function (s) { return moving(s) && s.first <= step.position && step.position <= s.last; });
    }

    /** Switches between 'compact' and 'details', keeping the replay at the same point of the generation. */
    function setView(name) {
      if (destroyed || views === null || VIEW_NAMES.indexOf(name) === -1 || name === viewName) return;
      const target = mappedPosition(views[name]);
      viewName = name;
      built = views[name];
      position = target;
      render();
      updateUi();
      emitSteps();
      emitState();
      emitPosition('seek');
    }

    /** The table model of a position of the current view (the start for 0); null when there is none. */
    function tableAt(p) {
      if (built === null) return null;
      if (p === 0) return startTable();
      return p >= 1 && p <= built.steps.length ? built.steps[p - 1].table : null;
    }

    /** Shows the state of the preparation (the notice, the progress, a failure) in the status block. */
    function setPreparation(next) {
      if (destroyed) return;
      const s = next || {};
      prep = { status: typeof s.status === 'string' ? s.status : 'idle', done: Number(s.done) || 0,
        total: Number(s.total) || 0 };
      updateUi();
    }

    function reset() {
      if (destroyed) return;
      const hadSigns = built !== null && built.signs !== null;
      views = null;
      built = null;
      viewName = 'compact';
      result = null;
      position = 0;
      fullModel = null;
      shownModel = null;
      prep = { status: 'idle', done: 0, total: 0 };
      callBoard('clearHighlights');
      if (hadSigns) callBoard('setSignMarks', null);
      updateUi();
      emitState();
      emitPosition('seek');
    }

    function unbindControls() {
      if (ui === null) return;
      ui.listeners.forEach(function (l) { l.el.removeEventListener(l.type, l.fn); });
      if (ui.unsubscribe) ui.unsubscribe();
      ui = null;
    }

    /**
     * `#scrubber` is the position (0 .. length). The controls are disabled while there are no views (and
     * while the preparation is running or waiting for the user) and follow the language.
     * `#replay-view-details` is the view toggle; `#replay-status`, `#replay-status-text` and
     * `#btn-prepare-replay` the status block.
     * Returns a function that removes the listeners (`destroy` does it too).
     */
    function bindControls(rootEl) {
      unbindControls();
      if (destroyed || !rootEl || typeof rootEl.querySelector !== 'function') return unbindControls;
      const q = function (selector) { return rootEl.querySelector(selector); };
      ui = {
        first: q('#btn-first'),
        prev: q('#btn-prev'),
        next: q('#btn-next'),
        last: q('#btn-last'),
        scrubber: q('#scrubber'),
        ticks: q('.player__ticks'),
        tickCount: -1,
        time: q('#player-time'),
        toggle: q('#replay-view-details'),
        status: q('#replay-status'),
        statusText: q('#replay-status-text'),
        prepare: q('#btn-prepare-replay'),
        listeners: [],
        unsubscribe: null
      };
      const listen = function (el, type, fn) {
        if (!el) return;
        el.addEventListener(type, fn);
        ui.listeners.push({ el: el, type: type, fn: fn });
      };
      listen(ui.first, 'click', function () { player.first(); });
      listen(ui.prev, 'click', function () { player.prev(); });
      listen(ui.next, 'click', function () { player.next(); });
      listen(ui.last, 'click', function () { player.last(); });
      listen(ui.scrubber, 'input', function () { seekTo(Number(ui.scrubber.value), 'seek'); });
      listen(ui.toggle, 'change', function () { setView(ui.toggle.checked ? 'details' : 'compact'); });
      listen(ui.prepare, 'click', function () { if (onPrepare !== null) safely(onPrepare); });
      if (SG.i18n && typeof SG.i18n.onChange === 'function') ui.unsubscribe = SG.i18n.onChange(updateUi);
      updateUi();
      return unbindControls;
    }

    const player = {
      load: load,
      setPreparation: setPreparation,
      setAnalysis: setAnalysis,
      setView: setView,
      getView: function getView() { return views === null ? null : viewName; },
      tableAt: tableAt,
      reset: reset,
      first: function first() { seekTo(0, 'seek'); },
      prev: function prev() { seekTo(position - 1, 'backward'); },
      next: function next() { seekTo(position + 1, 'forward'); },
      last: function last() { seekTo(length(), 'seek'); },

      seek: function seek(target) { seekTo(target, 'seek'); },

      state: state,

      describe: function describe(at) {
        if (built === null) return { text: '', step: null };
        const p = at === undefined ? position : Math.max(0, Math.min(length(), Math.floor(at)));
        const step = p === 0 ? null : built.steps[p - 1];
        return { text: describeStep(step), step: step };
      },

      getSteps: function getSteps() { return built === null ? [] : built.steps; },

      getStep: function getStep(p) {
        return built === null || !(p >= 1 && p <= built.steps.length) ? null : built.steps[p - 1];
      },

      bindControls: bindControls,

      destroy: function destroy() {
        if (destroyed) return;
        unbindControls();
        if (built !== null && built.signs !== null) callBoard('setSignMarks', null);
        views = null;
        built = null;
        result = null;
        destroyed = true;
      }
    };
    return player;
  }

  /** The mode a client reports once it is ready: 'worker' or 'main' (anything else, or a failure: 'main'). */
  function readyMode(client) {
    let ready;
    try {
      ready = client !== null && client !== undefined && typeof client.ready === 'function' ? client.ready()
        : client ? client.mode : null;
    } catch (err) {
      return Promise.resolve('main');
    }
    return Promise.resolve(ready).then(function (mode) { return mode === 'worker' ? 'worker' : 'main'; },
      function () { return 'main'; });
  }

  function liveMode(client) {
    try {
      return client ? client.mode : undefined;
    } catch (err) {
      return undefined;
    }
  }

  function isCancelled(err) {
    return err !== null && typeof err === 'object' && err.code === 'budget.cancelled';
  }

  function needsConsent(err) {
    return isCancelled(err) && err.i18nArgs !== null && typeof err.i18nArgs === 'object' &&
      err.i18nArgs.reason === 'replayConsentRequired';
  }

  /**
   * The controller that decides when the replay analysis is asked for (a pure controller: no DOM). Options:
   * `getClient()` (the client of the app), `onState(state)`, `onAnalysis(analysis, result)`, `emit(name,
   * payload)` and `fallback(result, reason)` (default `SG.replay.fallback`); every callback runs inside a
   * try / catch. States: 'idle', 'waiting' (the client is not ready yet), 'consent' (no Web Worker: waits for
   * `press()`), 'trace' (the record of a cached puzzle is being rebuilt), 'preparing' (`done` of `total`
   * positions), 'ready', 'unavailable' (only the solution, the structure and the finished puzzle can be
   * shown), 'error'. Nothing asks the client to replay, and no solver runs, while the state is 'waiting' or
   * 'consent'; consent is for one result and is forgotten when another one is started.
   */
  function createPreparation(options) {
    const o = options || {};
    const getClient = typeof o.getClient === 'function' ? o.getClient : function () { return null; };
    const fallbackOf = typeof o.fallback === 'function' ? o.fallback : function (result, reason) {
      return SG.replay.fallback(result, reason);
    };
    let sequence = 0;
    let activeJob = null;
    let consented = null;
    let prep = { status: 'idle', done: 0, total: 0 };

    function call(fn, a, b) {
      if (typeof fn !== 'function') return undefined;
      try {
        return fn(a, b);
      } catch (err) {
        logError(err);
        return undefined;
      }
    }

    function setState(status, done, total) {
      prep = { status: status, done: done || 0, total: total || 0 };
      call(o.onState, { status: prep.status, done: prep.done, total: prep.total });
    }

    function isCurrent(job) {
      return activeJob === job && job.token !== 0;
    }

    /** Stops a job on the client it captured: its answer is stale from now on. */
    function stopJob(job) {
      if (job === null) return;
      job.token = 0;
      if (job.running) {
        job.running = false;
        call(function () { return job.client.cancelReplay(); });
      }
    }

    // A client that turned out to run on the page after it answered 'worker' needs the consent again.
    function needsPress(job) {
      if (job.mode === 'worker' && liveMode(job.client) === 'main') job.mode = 'main';
      return job.mode === 'main' && consented !== job.result;
    }

    function publish(job, analysis, status) {
      if (!isCurrent(job)) return;
      call(o.onAnalysis, analysis, job.result);
      if (!isCurrent(job)) return;
      setState(status, status === 'ready' ? prep.total : 0, status === 'ready' ? prep.total : 0);
    }

    function settle(job, mine, ok, value) {
      if (!isCurrent(job) || job.runId !== mine) return;
      job.running = false;
      if (ok && value !== null && typeof value === 'object') {
        publish(job, value, 'ready');
      } else if (!ok && needsConsent(value)) {
        job.mode = 'main';
        consented = null;
        setState('consent');
      } else if (!ok && isCancelled(value)) {
        cancel();
      } else {
        publish(job, fallbackOf(job.result, 'error'), 'error');
      }
    }

    function run(job) {
      if (!isCurrent(job)) return;
      if (needsPress(job)) {
        setState('consent');
        return;
      }
      const result = job.result;
      if (job.traceUnavailable) {
        publish(job, fallbackOf(result, 'noLog'), 'unavailable');
        return;
      }
      if (!Array.isArray(result.digLog) || result.digLog.length === 0) {
        if (result.fromCache === true) {
          setState('trace');
          if (consented === result) call(o.emit, 'replay:consent', { result: result });
        } else {
          publish(job, fallbackOf(result, 'noLog'), 'unavailable');
        }
        return;
      }
      let total = 0;
      try {
        total = SG.replay.moves(result).moves.length;
      } catch (err) {
        total = 0;
      }
      setState('preparing', 0, total);
      job.running = true;
      const mine = ++job.runId;
      let promise;
      try {
        promise = job.client.replay(result, {
          allowMain: consented === result,
          onProgress: function (info) {
            if (!isCurrent(job) || job.runId !== mine || info === null || typeof info !== 'object') return;
            setState('preparing', info.done, typeof info.total === 'number' ? info.total : total);
          }
        });
      } catch (err) {
        promise = Promise.reject(err);
      }
      Promise.resolve(promise).then(function (analysis) {
        settle(job, mine, true, analysis);
      }, function (err) {
        settle(job, mine, false, err);
      });
    }

    function start(result) {
      stopJob(activeJob);
      if (consented !== result) consented = null;
      const job = { token: ++sequence, result: result, client: call(getClient) || null, mode: null,
        running: false, runId: 0, traceUnavailable: false };
      activeJob = job;
      setState('waiting');
      readyMode(job.client).then(function (mode) {
        if (!isCurrent(job)) return;
        job.mode = mode;
        run(job);
      });
    }

    function press() {
      const job = activeJob;
      if (job === null || prep.status !== 'consent') return false;
      consented = job.result;
      run(job);
      return true;
    }

    function unavailable(result) {
      const job = activeJob;
      if (job === null || job.result !== result) return false;
      job.traceUnavailable = true;
      if (job.mode === null || needsPress(job)) return true;
      job.runId++;
      if (job.running) {
        job.running = false;
        call(function () { return job.client.cancelReplay(); });
      }
      publish(job, fallbackOf(result, 'noLog'), 'unavailable');
      return true;
    }

    function cancel() {
      const job = activeJob;
      activeJob = null;
      stopJob(job);
      consented = null;
      setState('idle');
    }

    return {
      start: start,
      press: press,
      unavailable: unavailable,
      cancel: cancel,
      state: function state() { return { status: prep.status, done: prep.done, total: prep.total }; }
    };
  }

  SG.player = {
    LAYER_NAMES: LAYER_NAMES,
    STRUCTURE_LAYERS: STRUCTURE_LAYERS,
    KINDS: KINDS,
    buildViews: buildViews,
    viewAt: viewAt,
    describeStep: describeStep,
    stepTitle: stepTitle,
    stepMeta: stepMeta,
    positionText: positionText,
    createPreparation: createPreparation,
    create: create
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'replay.position': 'Step {step} of {total}',
      'replay.position.start': 'Start',
      'replay.start': 'The empty grid. Press Next step to see how the puzzle was made.',
      'replay.unit.sign_one': '{count} sign',
      'replay.unit.sign_other': '{count} signs',
      'replay.unit.removal_one': '{count} possible removal',
      'replay.unit.removal_other': '{count} possible removals',
      'replay.unit.move_one': '{count} move',
      'replay.unit.move_other': '{count} moves',
      'replay.list.last': '{list} and {last}',

      'replay.view.details': 'Show every move',
      'replay.preparing': 'Preparing the score tables\u2026 {done} of {total}',
      'replay.preparing.trace': 'Preparing the score tables: rebuilding the generation record\u2026',
      'replay.prepare.button': 'Prepare score tables',
      'replay.prepare.notice': 'This page has no background worker. Press \'{button}\' to calculate the ' +
        'score tables on this page; the page may stop responding briefly while it works.',
      'replay.prepare.error': 'The replay could not be fully prepared. Available tables are kept; ' +
        'unavailable results show a status.',
      'replay.trace.unavailable': 'The full generation record of this puzzle is not available; the replay ' +
        'shows only the solution, the structure and the finished puzzle.',

      'replay.title.solution': 'Full solution',
      'replay.title.cages': 'Cages',
      'replay.title.signs': 'Signs',
      'replay.title.clues': 'Starting clues',
      'replay.title.random': 'Random removals',
      'replay.title.dig': 'Removing clues',
      'replay.title.guided': 'Choosing clues to remove',
      'replay.title.search': 'Adjusting the puzzle',
      'replay.title.signDig': 'Removing signs',
      'replay.title.reveal': 'More clues',
      'replay.title.mixed': 'Combined changes',
      'replay.title.restart': 'Starting again',
      'replay.title.final': 'Finished puzzle',

      'replay.solution': 'Fill the whole grid with a random solution that follows every rule ({filled}).',
      'replay.cages': 'Split the solution into {count} cages and write the sum of each cage in its corner.',
      'replay.signs': 'Put a sign between neighbouring cells to show which one is greater: {signs}.',
      'replay.clues': 'Clear the grid, then show {clues}.',
      'replay.random.all': 'Clear {removed} chosen at random: the puzzle can still be solved without their ' +
        'clues.',
      'replay.random.some': 'Try to clear {tried} chosen at random: {removed} cleared, {kept} put back ' +
        'because {reason}.',
      'replay.dig.all': 'Clear {removed}: the puzzle can still be solved without their clues.',
      'replay.dig.some': 'Try to clear {tried}: {removed} cleared, {kept} put back because {reason}.',
      'replay.dig.rebuilt': 'Clear {removed}.',
      'replay.guided': 'Compare {rated} ({refused} rejected) and choose the removal preferred by the ' +
        'generator\'s check: {cellList}.',
      'replay.guided.rounds': 'Across {rounds} accepted removals, compare {rated} ({refused} rejected); ' +
        'the removed clues are at {cellList}.',
      'replay.searchRemove': 'Clear {removed} while looking for a higher-scoring puzzle.',
      'replay.exchange_one': 'Adjust the clues to look for a higher-scoring puzzle: clear {removed} and ' +
        'restore {revealed}.',
      'replay.exchange_other': 'Across {count} complete changes, clear {removed} and restore {revealed} ' +
        'while looking for a higher-scoring puzzle.',
      'replay.signDig.all': 'Remove {removed}: the puzzle can still be solved without them.',
      'replay.signDig.some': 'Try to remove {tried}: {removed} removed, {kept} kept because {reason}.',
      'replay.reveal': 'The puzzle came out too hard for this level, so {revealed} more are shown.',
      'replay.reveal.search': 'Restore {revealed} while looking for a higher-scoring puzzle.',
      'replay.restart': 'The final check found a second solution, so the holes are dug again from the full ' +
        'grid with a plain uniqueness check ({filled}).',
      'replay.restart.folded': 'Before starting again, generation reached {peak} points after {moves}.',
      'replay.folded.peak': 'Within this step, the score reached {peak}.',
      'replay.folded.reveal': 'Within this step, the score reached {peak}, above the chosen level, and ' +
        '{revealed} were restored during refinement.',
      'replay.folded.unscored_one': '{count} position within this step could not be rated.',
      'replay.folded.unscored_other': '{count} positions within this step could not be rated.',
      'replay.rebuilt': 'This replay is reconstructed from the finished puzzle\'s clues; it is not a ' +
        'record of the original generation order.',
      'replay.final': 'The finished puzzle: {clues}.',
      'replay.final.signs': 'The finished puzzle: {clues} and {signs}.',
      'replay.reason.ambiguous': 'without them the puzzle would have more than one solution',
      'replay.reason.techniques': 'without their clues, the solver did not finish the puzzle with the ' +
        'techniques of this level',
      'replay.reason.tooHard': 'removing them would make the puzzle harder than this level',
      'replay.reason.mixed': 'the puzzle still needs them',

      'replay.meta.solution': '{filled}',
      'replay.meta.cages': '{count} cages',
      'replay.meta.signs': '{signs}',
      'replay.meta.clues': '{clues}',
      'replay.meta.dig': '{removed} removed \u00b7 {clues} left',
      'replay.meta.digKept': '{removed} removed \u00b7 {kept} put back \u00b7 {clues} left',
      'replay.meta.change': '{removed} cleared \u00b7 {revealed} restored \u00b7 {clues} left',
      'replay.meta.signDig': '{removed} removed \u00b7 {signs} left',
      'replay.meta.signDigKept': '{removed} removed \u00b7 {kept} kept \u00b7 {signs} left',
      'replay.meta.reveal': '{revealed} more \u00b7 {clues} in all',
      'replay.meta.restart': '{filled}',
      'replay.meta.final': '{clues}',
      'replay.meta.final.signs': '{clues} \u00b7 {signs}'
    },
    vi: {
      'replay.position': 'Bước {step}/{total}',
      'replay.position.start': 'Bắt đầu',
      'replay.start': 'Lưới trống. Bấm Bước tiếp theo để xem đề được tạo ra như thế nào.',
      'replay.unit.sign_one': '{count} dấu',
      'replay.unit.sign_other': '{count} dấu',
      'replay.unit.removal_one': '{count} cách bỏ số',
      'replay.unit.removal_other': '{count} cách bỏ số',
      'replay.unit.move_one': '{count} thay đổi',
      'replay.unit.move_other': '{count} thay đổi',
      'replay.list.last': '{list} và {last}',

      'replay.view.details': 'Hiện từng thay đổi',
      'replay.preparing': 'Đang chuẩn bị bảng điểm\u2026 {done}/{total}',
      'replay.preparing.trace': 'Đang chuẩn bị bảng điểm: đang dựng lại bản ghi quá trình tạo đề\u2026',
      'replay.prepare.button': 'Chuẩn bị bảng điểm',
      'replay.prepare.notice': 'Trang này không có tiến trình nền. Nhấn \'{button}\' để tính bảng điểm ' +
        'ngay trên trang; trang có thể tạm thời không phản hồi trong lúc tính.',
      'replay.prepare.error': 'Không thể chuẩn bị đầy đủ phần phát lại. Các bảng điểm đã có vẫn được giữ ' +
        'lại; kết quả chưa có được thay bằng trạng thái tương ứng.',
      'replay.trace.unavailable': 'Không có bản ghi đầy đủ quá trình tạo đề này; phần phát lại chỉ hiện ' +
        'lời giải, cấu trúc và đề hoàn chỉnh.',

      'replay.title.solution': 'Lời giải đầy đủ',
      'replay.title.cages': 'Các lồng',
      'replay.title.signs': 'Các dấu so sánh',
      'replay.title.clues': 'Số cho sẵn ban đầu',
      'replay.title.random': 'Xóa ngẫu nhiên',
      'replay.title.dig': 'Bỏ số cho sẵn',
      'replay.title.guided': 'Chọn số cho sẵn để bỏ',
      'replay.title.search': 'Điều chỉnh đề',
      'replay.title.signDig': 'Bỏ bớt dấu',
      'replay.title.reveal': 'Thêm số cho sẵn',
      'replay.title.mixed': 'Các thay đổi được gộp',
      'replay.title.restart': 'Làm lại từ đầu',
      'replay.title.final': 'Đề hoàn chỉnh',

      'replay.solution': 'Điền kín lưới bằng một lời giải ngẫu nhiên tuân theo mọi luật ({filled}).',
      'replay.cages': 'Chia lời giải thành {count} lồng và ghi tổng của mỗi lồng ở góc lồng.',
      'replay.signs': 'Đặt dấu giữa các ô kề nhau để cho biết ô nào lớn hơn: {signs}.',
      'replay.clues': 'Xóa các số trên lưới rồi hiện {clues}.',
      'replay.random.all': 'Bỏ số ở {removed} được chọn ngẫu nhiên: đề vẫn giải được khi thiếu các số đó.',
      'replay.random.some': 'Thử bỏ số ở {tried} được chọn ngẫu nhiên: bỏ được số ở {removed} và khôi phục ' +
        'số ở {kept}, vì {reason}.',
      'replay.dig.all': 'Bỏ số ở {removed}: đề vẫn giải được khi thiếu các số đó.',
      'replay.dig.some': 'Thử bỏ số ở {tried}: bỏ được số ở {removed} và khôi phục số ở {kept}, vì {reason}.',
      'replay.dig.rebuilt': 'Bỏ số ở {removed}.',
      'replay.guided': 'Xét {rated} ({refused} bị loại) và chọn phương án được ưu tiên theo phép kiểm tra ' +
        'của trình sinh đề: bỏ số ở {cellList}.',
      'replay.guided.rounds': 'Qua {rounds} lần chọn phương án bỏ số, đã xét {rated} ({refused} bị loại); ' +
        'các ô được bỏ số là {cellList}.',
      'replay.searchRemove': 'Bỏ số ở {removed} để thử tạo đề có điểm cao hơn.',
      'replay.exchange_one': 'Điều chỉnh số cho sẵn để thử tạo đề có điểm cao hơn: bỏ số ở {removed} và ' +
        'khôi phục {revealed}.',
      'replay.exchange_other': 'Qua {count} thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn, tổng cộng bỏ số ' +
        'ở {removed} và khôi phục {revealed}.',
      'replay.signDig.all': 'Bỏ {removed}: không có chúng đề vẫn giải được.',
      'replay.signDig.some': 'Thử bỏ {tried}: bỏ được {removed}, giữ lại {kept} vì {reason}.',
      'replay.reveal': 'Đề vẫn khó hơn mức đã chọn nên hiện thêm {revealed}.',
      'replay.reveal.search': 'Khôi phục {revealed} để thử tạo đề có điểm cao hơn.',
      'replay.restart': 'Bước kiểm tra cuối tìm thấy lời giải thứ hai, nên trình sinh đề bắt đầu lại từ ' +
        'lưới đầy đủ, chỉ với phép kiểm tra lời giải duy nhất ({filled}).',
      'replay.restart.folded': 'Trước khi làm lại, quá trình tạo đề đã đạt {peak} điểm sau {moves}.',
      'replay.folded.peak': 'Trong bước này, điểm có lúc đạt {peak}.',
      'replay.folded.reveal': 'Trong bước này, điểm có lúc đạt {peak}, vượt mức độ khó đã chọn; {revealed} ' +
        'đã được khôi phục khi điều chỉnh đề.',
      'replay.folded.unscored_one': 'Có {count} trạng thái trong bước này không chấm được điểm.',
      'replay.folded.unscored_other': 'Có {count} trạng thái trong bước này không chấm được điểm.',
      'replay.rebuilt': 'Bản phát lại này được dựng từ các số cho sẵn của đề hoàn chỉnh, không ghi lại thứ ' +
        'tự tạo đề ban đầu.',
      'replay.final': 'Đề hoàn chỉnh: {clues}.',
      'replay.final.signs': 'Đề hoàn chỉnh: {clues} và {signs}.',
      'replay.reason.ambiguous': 'thiếu chúng đề sẽ có nhiều hơn một lời giải',
      'replay.reason.techniques': 'bộ giải chưa giải xong đề bằng các kỹ thuật của mức này khi thiếu ' +
        'các số đó',
      'replay.reason.tooHard': 'xóa chúng sẽ làm đề khó hơn mức đã chọn',
      'replay.reason.mixed': 'đề vẫn cần đến chúng',

      'replay.meta.solution': '{filled}',
      'replay.meta.cages': '{count} lồng',
      'replay.meta.signs': '{signs}',
      'replay.meta.clues': '{clues}',
      'replay.meta.dig': 'xóa {removed} \u00b7 còn {clues}',
      'replay.meta.digKept': 'xóa {removed} \u00b7 trả lại {kept} \u00b7 còn {clues}',
      'replay.meta.change': 'bỏ số ở {removed} \u00b7 khôi phục {revealed} \u00b7 còn {clues}',
      'replay.meta.signDig': 'bỏ {removed} \u00b7 còn {signs}',
      'replay.meta.signDigKept': 'bỏ {removed} \u00b7 giữ {kept} \u00b7 còn {signs}',
      'replay.meta.reveal': 'thêm {revealed} \u00b7 tổng {clues}',
      'replay.meta.restart': '{filled}',
      'replay.meta.final': '{clues}',
      'replay.meta.final.signs': '{clues} \u00b7 {signs}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
