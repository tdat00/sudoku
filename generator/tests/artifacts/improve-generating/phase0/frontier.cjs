'use strict';

/*
 * The S1/S2 frontier prototype and the native comparison samples of one grid trial (IG-S04, test side, provisional
 * (pre-freeze)). Algorithm of the task file, step by step; every choice the text leaves open is listed in
 * `INTERPRETATIONS` and in variant-manifest.json for the author's review, never adopted silently.
 *
 * One trial = the native model and full grid of a request seed (forks `model` and `grid#1`), then ONE sample of ordinal 1
 * (root fork `dig#1.1`) in one of eight modes:
 *   proposal-only / ordinary-only   the native `digLevel` sample of that kind (native forks, caps, keeper);
 *   F0 F1 FC FM FU FS               the frontier variants (full ladder / cheap / middle floor, S2 on or off, final or
 *                                    snapshot reference parent, optional after-DFS floor filter).
 *
 * Reference solver only. Phase A never assumes uniqueness. S2 is a separate outcome (`rederived`), never a forged solved
 * report or rating. Every count is charged to a deterministic vector (sample-budget.cjs); a stop is a distinct harness
 * reason, never a swallowed production error. The independent verifier and the S2 audit run outside the timing.
 *
 * The engine pieces come in through `env.SG` (the private patched instance) and `env.rt` (frontier-runtime.cjs, whose
 * `digger` holds the native constants and helpers); the control flow itself touches nothing else, so it is tested with a
 * scripted fake engine (frontier-test.cjs) as well as on the real one.
 */
const crypto = require('crypto');
const C = require('./common.cjs');
const SB = require('./sample-budget.cjs');

const HarnessError = C.HarnessError;

const CHEAP_GROUPS = Object.freeze(['basic', 'locked', 'subset', 'wing']);
const MIDDLE_GROUPS = Object.freeze(CHEAP_GROUPS.concat(['fish']));

const FRONTIER_IDS = Object.freeze(['F0', 'F1', 'FC', 'FM', 'FU', 'FS']);
const NATIVE_IDS = Object.freeze(['proposal-only', 'ordinary-only']);
const MODE_ORDER = Object.freeze(['proposal-only', 'ordinary-only', 'F0', 'F1', 'FC', 'FM', 'FU', 'FS']);

const MODES = Object.freeze({
  'proposal-only': Object.freeze({ id: 'proposal-only', kind: 'native', proposal: true,
    description: 'native digLevel sample of the proposal kind at ordinal 1 (fork dig#1.1), native caps and keeper' }),
  'ordinary-only': Object.freeze({ id: 'ordinary-only', kind: 'native', proposal: false,
    description: 'native digLevel sample of the ordinary (score-targeted) kind at ordinal 1 (fork dig#1.1), native caps' }),
  F0: Object.freeze({ id: 'F0', kind: 'frontier', floor: 'ladder', s2: false, parent: 'final', fuFilter: false,
    description: 'full ladder (cheap, middle, full floor), S2 off, final parent, no extra filter' }),
  F1: Object.freeze({ id: 'F1', kind: 'frontier', floor: 'ladder', s2: true, parent: 'final', fuFilter: false,
    description: 'full ladder, S2 on, final parent, no extra filter (the default frontier)' }),
  FC: Object.freeze({ id: 'FC', kind: 'frontier', floor: 'cheap', s2: true, parent: 'final', fuFilter: false,
    description: 'cheap floor only (basic, locked, subset, wing), S2 on, final parent' }),
  FM: Object.freeze({ id: 'FM', kind: 'frontier', floor: 'middle', s2: true, parent: 'final', fuFilter: false,
    description: 'middle floor only (cheap plus fish and the single-digit patterns), S2 on, final parent' }),
  FU: Object.freeze({ id: 'FU', kind: 'frontier', floor: 'ladder', s2: true, parent: 'final', fuFilter: true,
    description: 'full ladder, S2 on, final parent, then after the fresh uniqueness proof the full canonical floor with ' +
      'uniqueness enabled filters floor-solvable entries' }),
  FS: Object.freeze({ id: 'FS', kind: 'frontier', floor: 'ladder', s2: true, parent: 'snapshot', fuFilter: false,
    description: 'full ladder, S2 on, the stored immutable snapshot of each entry as its reference parent' })
});

// What the task text leaves open; each is the reading this prototype implements, for the author to confirm or correct.
const INTERPRETATIONS = Object.freeze([
  'PhaseA runs the bounded native DFS uniqueness count after EVERY genuinely stuck floor test (a floor solve that ended ' +
    'stuck; a budget stop or a contradiction is never a refusal), at every rung; a proved second solution rejects the ' +
    'group permanently (never retested at a later rung), an unknown or capped count keeps the entry with proof "unknown"',
  'A ladder keeps, per group, only the LAST rung\'s eligible failure as the phaseB entry (new discovery ordinal); earlier ' +
    'rungs stay diagnostics; an entry is dropped when its group is later removed or proved ambiguous; phaseB admits an ' +
    'entry only if its rung is the last EXECUTED rung (a diagnostic otherwise), so an earlier-rung entry cannot survive a ' +
    'later feasibility skip of its group (above all in FS, where no feasibility is re-tested at the snapshot)',
  'The S2 signal is not raised when the grid is complete at that step: the solve finishes and is a complete proof',
  'PhaseB ATTEMPTS at most K_F = 12 entries (counts.phaseBTries: every entry examined after the feasibility filter, ' +
    'including one whose fresh uniqueness proof fails or that the FU filter rejects); only an entry that reaches the ' +
    'allowed-set solve is an allowed-set solve (counts.phaseBSolves, never more than the attempts, structural ceiling 12); ' +
    'K_F = 12 and the 16 deepen proposals are acceptable prototype limits, not adopted defaults',
  'The allowed-set solve is the actual spec.allowedTechniques ladder with uniqueness assumed, run only after the fresh ' +
    'bounded DFS count proved the reference candidate unique; a stuck solve is the ordinary miss, but a contradiction (or ' +
    'any status other than solved or stuck) after the proved uniqueness is a correctness ERROR, never an ordinary miss',
  'A phaseB candidate considered for return is rated by the untouched canonical rating through the native rateCounted ' +
    '(charged to the attempt caps and to the vector); exactness is native requiredOf + complete in-band rating + known uniqueness',
  'Deepen is applied to each complete phaseB candidate whose canonical score is below the band, with the proposals left of ' +
    'the 16 of the whole sample: repeated best-of-pool steps of the native bounded objective in a seeded order (fork ' +
    'deepen) until the band minimum is reached or no admissible proposal remains; the final committed puzzle is rated once',
  'Deepen never invents a numeric score: an objective that is not a plain number stops the sample as UNSUPPORTED (an ' +
    'unsupported-source stop for the author, never a sample that finishes as complete)',
  'The initial fully given grid is rated canonically first (charged) and kept as the valid fallback; sample-budget stays ' +
    'the outcome even when a fallback exists',
  'DECLARED PROTOTYPE RESTRICTION (not a theorem): the final phase A parent is never rated or offered. Only a complete ' +
    'floor solve would make it floor-solvable; with S2 its last accepted removal rests on operational solvability, which ' +
    'is heuristic, and canonical requiredness is the authority, so the omitted parent could in principle be rated exact; ' +
    'a sample without a better candidate returns the fully given fallback (a valid puzzle, never an exact hit)',
  'The post-timing S2 audit re-solves, with the accepting rung\'s set and assumeUniqueness false, the first, middle and ' +
    'last S2-rederived removal (deduplicated) and the final phaseA parent (own last rung set and the full floor), outside the ' +
    'timed interval, with a fixed check ceiling per solve; a solve beyond it is "unknown", never "agreed"'
]);

class FrontierError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'FrontierError';
    this.code = code;
    this.details = details === undefined ? null : details;
  }
}

function noop() {}

function hashGivens(givens) {
  const view = Int32Array.from(givens);
  return crypto.createHash('sha256').update(Buffer.from(view.buffer, view.byteOffset, view.byteLength)).digest('hex');
}

// --- the floor sets: cheap, middle, full -------------------------------------------------------------------------------

/**
 * The actual floor ids of a spec split by technique group, in registry order: cheap = groups basic, locked, subset and
 * wing; middle adds fish (the registered single-digit patterns are in that group); full = the whole actual floor. The
 * ladder is cheap, middle, full with equal sets removed. Metadata that no longer implements the families is
 * `unsupported-source` (stop for the author), never a guess.
 */
function floorSets(SG, spec) {
  const known = SG.techniques.GROUPS || null;
  CHEAP_GROUPS.concat(['fish']).forEach(function (g) {
    if (known !== null && known.indexOf(g) < 0) {
      throw new HarnessError('unsupported-source', 'the technique registry has no group "' + g + '"');
    }
  });
  const floor = spec.floorTechniques.slice();
  const groupOf = function (id) { return SG.techniques.get(id).group; };
  const usable = function (ids) {
    return ids.filter(function (id) { return SG.techniques.get(id).assumesUniqueness !== true; });
  };
  const sets = {
    cheap: floor.filter(function (id) { return CHEAP_GROUPS.indexOf(groupOf(id)) >= 0; }),
    middle: floor.filter(function (id) { return MIDDLE_GROUPS.indexOf(groupOf(id)) >= 0; }),
    full: floor
  };
  if (sets.cheap.length === 0 || !sets.cheap.some(function (id) { return groupOf(id) === 'basic'; })) {
    throw new HarnessError('unsupported-source', 'the actual floor has no cheap (basic) techniques');
  }
  const rung = function (name) {
    return { id: name, ids: sets[name].slice(), effectiveIds: usable(sets[name]) };
  };
  const byName = { cheap: rung('cheap'), middle: rung('middle'), full: rung('full') };
  const ladder = [];
  const seen = new Set();
  ['cheap', 'middle', 'full'].forEach(function (name) {
    const key = sets[name].join(',');
    if (!seen.has(key)) {
      seen.add(key);
      ladder.push(byName[name]);
    }
  });
  const fish = sets.middle.filter(function (id) { return groupOf(id) === 'fish'; });
  return { byName: byName, ladder: ladder, singleDigitPatterns: fish, groups: { cheap: CHEAP_GROUPS, middle: MIDDLE_GROUPS } };
}

function rungsOf(variant, sets) {
  if (variant.floor === 'ladder') return sets.ladder;
  if (variant.floor === 'cheap') return [sets.byName.cheap];
  if (variant.floor === 'middle') return [sets.byName.middle];
  throw new HarnessError('plan-missing', 'unknown floor mode ' + variant.floor);
}

/** The typed/numeric adapter of the native objective: a plain number is a score or a refusal, anything else unsupported. */
function objectiveOutcome(value, D) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0) return { kind: 'refused', reason: D.refusalReason(value) };
    return { kind: 'score', score: value };
  }
  return { kind: 'unsupported', type: value === null ? 'null' : typeof value };
}

// --- the frontier sample ---------------------------------------------------------------------------------------------

/**
 * One frontier sample. ctx: SG, rt, model, solution (Int32Array, the full grid), spec, level, cfg, rng (the sample root
 * `dig#1.1`), variant, budget (pass-through budget object), limits (the count vector or null), progress(fn),
 * testOnly ({ kF }: never in a manifest). Returns the plain result; throws FrontierError/Unsound for a correctness stop.
 */
function runFrontier(ctx) {
  const SG = ctx.SG;
  const rt = ctx.rt;
  const D = rt.digger;
  const model = ctx.model;
  const solution = ctx.solution;
  const spec = ctx.spec;
  const level = ctx.level;
  const cfg = ctx.cfg;
  const variant = ctx.variant;
  const budget = ctx.budget;
  const progress = ctx.progress || noop;
  const now = ctx.now || function () { return performance.now(); };
  const kF = ctx.testOnly && ctx.testOnly.kF !== undefined ? ctx.testOnly.kF : SB.K_F;
  const n = model.cellCount;
  const meter = new SB.SampleBudget(ctx.limits || null);
  const caps = D.newCaps({});

  const groups = SG.symmetry.groups(model, cfg.symmetry);
  const G = groups.length;
  const groupIndexOfCell = new Int32Array(n);
  groups.forEach(function (g, i) { for (let k = 0; k < g.length; k++) groupIndexOfCell[g[k]] = i; });
  const sequence = D.groupSequence(D.cellSequence(model, cfg.digOrder, ctx.rng.fork('random')), groups, n);

  const sets = floorSets(SG, spec);
  const rungs = rungsOf(variant, sets);
  const S = {
    phase: 'init', counts: { phaseBTries: 0, fuFilterSolves: 0 }, phaseCosts: {}, passes: [], removals: [],
    entries: new Map(), diagnostics: [], discovery: 0, phaseBLog: [], deepen: { runs: [], proposals: 0 },
    finalHash: null, finalParent: null, best: null, fallback: null, referenceChecks: [], s2: { rederived: 0, solved: 0 },
    refusals: { stuckUnique: 0, stuckUnknown: 0, ambiguous: 0 }, objectiveKind: 'numeric'
  };

  function costOf(name) {
    if (S.phaseCosts[name] === undefined) {
      S.phaseCosts[name] = { wallMs: 0, solves: 0, deductions: 0, logicalChecks: 0, dfsCalls: 0, dfsEntries: 0, dfsChecks: 0 };
    }
    return S.phaseCosts[name];
  }

  // Attributes the engine counters and the wall of `fn` to a phase (diagnostics: the host clock is the timing).
  function inPhase(name, fn) {
    const before = rt.snapshot();
    const t0 = now();
    const previous = S.phase;
    S.phase = name;
    try {
      return fn();
    } finally {
      S.phase = previous;
      const d = rt.diff(rt.snapshot(), before);
      const c = costOf(name);
      c.wallMs += now() - t0;
      c.solves += d.totals.solves;
      c.deductions += d.totals.deductions;
      c.logicalChecks += d.totals.logicalChecks;
      c.dfsCalls += d.totals.dfsCalls;
      c.dfsEntries += d.totals.dfsEntries;
      c.dfsChecks += d.totals.dfsChecks;
    }
  }

  function post(kind, extra) {
    const snap = rt.snapshot();
    progress(Object.assign({ type: 'progress', phase: kind, floorTests: meter.used.floorTests,
      ladderPasses: meter.used.ladderPasses, phaseBSolves: meter.used.phaseBSolves,
      canonicalRatings: meter.used.canonicalRatings, deepenProposals: S.deepen.proposals,
      removals: S.removals.length, entries: S.entries.size, counters: rt.countersOf(snap) }, extra || {}));
  }

  function withPurpose(purpose, fn) {
    const previous = rt.setPurpose(purpose);
    try {
      return fn();
    } finally {
      rt.setPurpose(previous);
    }
  }

  function canonical(givens, phase) {
    meter.need('canonicalRatings', 1, phase);
    const rating = withPurpose('canonical', function () { return D.rateCounted(model, givens, budget, caps); });
    if (rating === null) throw new SB.BudgetStop('nativeRatingCap', D.CAP_RATINGS, caps.ratings, phase);
    return rating;
  }

  // The best complete candidate with the native quality/tie rule: strictly better replaces, an equal one keeps the first.
  function consider(givens, rating, source, uniqueness, extra) {
    if (rating.solved !== true) return { kept: false, quality: Infinity };
    const quality = D.qualityOf(rating, spec, level, model);
    const kept = S.best === null || quality < S.best.quality;
    if (kept) {
      S.best = Object.assign({ givens: Int32Array.from(givens), rating: rating, source: source, uniqueness: uniqueness,
        quality: quality, exact: quality === 0 }, extra || {});
    }
    return { kept: kept, quality: quality };
  }

  const unitClues = new Int32Array(model.units.length);
  for (let c = 0; c < n; c++) {
    const us = model.cellUnits[c];
    for (let k = 0; k < us.length; k++) unitClues[us[k]]++;
  }
  const parent = Int32Array.from(solution);
  let clues = n;
  const removedFlag = new Uint8Array(G);
  const ambiguousFlag = new Uint8Array(G);

  function removeGroup(g) {
    for (let i = 0; i < g.length; i++) {
      parent[g[i]] = 0;
      const us = model.cellUnits[g[i]];
      for (let k = 0; k < us.length; k++) unitClues[us[k]]--;
    }
    clues -= g.length;
  }

  function hasEmptyTier() {
    return spec.tierTechniques.length === 0 || SG.difficulty.levelIndex(level) === 0;
  }

  // The weakened parent (parent minus g, the cells restored whatever happens) tested with a rung's set.
  function floorTest(g, rung) {
    for (let i = 0; i < g.length; i++) parent[g[i]] = 0;
    const previous = rt.setPurpose('floor');
    try {
      if (variant.s2) rt.armS2(g, solution);
      let report;
      try {
        report = SG.logicalSolver.solve(model, parent, {
          allowedTechniques: rung.ids, collectSteps: false, assumeUniqueness: false, budget: budget
        });
      } catch (err) {
        if (err instanceof rt.Rederived) return { kind: 'rederived', deductions: err.info.ordinal, unsolved: null };
        throw err;
      }
      if (report.status === 'solved') return { kind: 'solved', deductions: rt.solveDeductions, unsolved: 0 };
      if (report.status === 'stuck') {
        return { kind: 'stuck', deductions: rt.solveDeductions, unsolved: report.state.unsolvedCount };
      }
      throw new FrontierError('floor-contradiction', 'a sound floor solve of a weakened unique puzzle contradicted',
        { cells: Array.from(g), rung: rung.id });
    } finally {
      rt.disarmS2();
      rt.setPurpose(previous);
      for (let i = 0; i < g.length; i++) parent[g[i]] = solution[g[i]];
    }
  }

  // Bounded native DFS uniqueness of `base` minus the cells: 1, 2, or null (unknown: the native guard was reached).
  function dfsCount(base, cells) {
    const work = Int32Array.from(base);
    for (let i = 0; i < cells.length; i++) work[cells[i]] = 0;
    const count = withPurpose('dfs', function () { return D.countWithin(model, work, budget); });
    if (count === 0) {
      throw new FrontierError('dfs-zero-solutions', 'a weakened parent of a unique puzzle has no solution',
        { cells: Array.from(cells) });
    }
    return count;
  }

  // --- init: the fully given fallback, rated canonically and charged ---------------------------------------------------
  function init() {
    S.phase = 'init';
    // An empty actual tier is vacuous: not a real frontier, so it is not searched (stop for the author).
    if (hasEmptyTier()) {
      throw new HarnessError('unsupported-source', 'the tier of ' + level + ' on ' + model.variantId +
        ' is empty (vacuous, an unsupported frontier): nothing is searched');
    }
    inPhase('init', function () {
      const rating = canonical(solution, 'init');
      S.fallback = { level: rating.level, score: rating.score, solved: rating.solved };
      consider(solution, rating, 'fallback', 'full-grid');
    });
  }

  // --- phase A: the floor descent, one pass per distinct rung -----------------------------------------------------------
  function phaseA() {
    S.phase = 'phaseA';
    post('phaseA-start', { rungs: rungs.map(function (r) { return r.id; }) });
    for (let ri = 0; ri < rungs.length; ri++) {
      const rung = rungs[ri];
      meter.need('ladderPasses', 1, 'phaseA');
      const pass = { rung: rung.id, index: ri, ids: rung.ids.length, effectiveIds: rung.effectiveIds.length, tests: 0,
        solved: 0, rederived: 0, stuckUnique: 0, stuckUnknown: 0, ambiguous: 0, skippedAmbiguous: 0, skippedMinClues: 0,
        skippedUnitMinimum: 0, accepted: 0, deductionsSolved: 0, deductionsRederived: 0, deductionsStuck: 0 };
      S.passes.push(pass);
      post('rung-start', { rung: rung.id });
      inPhase('phaseA', function () {
        for (let s = 0; s < sequence.length; s++) {
          const g = sequence[s];
          const gi = groupIndexOfCell[g[0]];
          if (removedFlag[gi] === 1) continue;
          if (ambiguousFlag[gi] === 1) {
            pass.skippedAmbiguous++;
            continue;
          }
          if (clues - g.length < spec.minClues) {
            pass.skippedMinClues++;
            continue;
          }
          if (spec.minCluesPerUnit > 0 && !D.unitsStayFilled(model, unitClues, g, spec.minCluesPerUnit)) {
            pass.skippedUnitMinimum++;
            continue;
          }
          const ordinal = meter.need('floorTests', 1, 'phaseA');
          pass.tests++;
          const test = floorTest(g, rung);
          if (test.kind === 'solved' || test.kind === 'rederived') {
            removeGroup(g);
            removedFlag[gi] = 1;
            pass.accepted++;
            if (test.kind === 'solved') {
              pass.solved++;
              pass.deductionsSolved += test.deductions;
              S.s2.solved++;
            } else {
              pass.rederived++;
              pass.deductionsRederived += test.deductions;
              S.s2.rederived++;
            }
            S.removals.push({ group: gi, rung: ri, kind: test.kind, deductions: test.deductions, test: ordinal });
            if (S.entries.has(gi)) {
              S.diagnostics.push(Object.assign(entryView(S.entries.get(gi)), { fate: 'removed-later' }));
              S.entries.delete(gi);
            }
          } else {
            pass.deductionsStuck += test.deductions;
            const count = dfsCount(parent, g);
            if (count === 2) {
              ambiguousFlag[gi] = 1;
              pass.ambiguous++;
              S.refusals.ambiguous++;
              if (S.entries.has(gi)) {
                S.diagnostics.push(Object.assign(entryView(S.entries.get(gi)), { fate: 'ambiguous-later' }));
                S.entries.delete(gi);
              }
            } else {
              if (count === 1) {
                pass.stuckUnique++;
                S.refusals.stuckUnique++;
              } else {
                pass.stuckUnknown++;
                S.refusals.stuckUnknown++;
              }
              if (S.entries.has(gi)) {
                S.diagnostics.push(Object.assign(entryView(S.entries.get(gi)), { fate: 'replaced-by-later-rung' }));
              }
              S.entries.set(gi, {
                group: gi, cells: Array.from(g), rung: ri, rungId: rung.id, ordinal: ++S.discovery,
                unsolved: test.unsolved, proof: count === 1 ? 'unique' : 'unknown', snapshot: Int32Array.from(parent),
                parentHash: hashGivens(parent), clues: clues, test: ordinal
              });
            }
          }
          if (meter.used.floorTests % 8 === 0) post('floor-tests');
        }
      });
      post('rung-end', { rung: rung.id });
    }
    S.finalParent = Int32Array.from(parent);
    S.finalHash = hashGivens(parent);
  }

  function entryView(e) {
    return { group: e.group, cells: e.cells, rung: e.rungId, ordinal: e.ordinal, unsolved: e.unsolved, proof: e.proof,
      parentHash: e.parentHash, clues: e.clues, test: e.test };
  }

  // --- phase B: cross the frontier -------------------------------------------------------------------------------------
  function phaseB() {
    S.phase = 'phaseB';
    if (ctx.testOnly && typeof ctx.testOnly.beforePhaseB === 'function') ctx.testOnly.beforePhaseB(S.entries, parent);
    post('phaseB-start');
    // Only an entry of the last EXECUTED rung is a candidate: an earlier-rung entry whose group a later pass skipped (a
    // clue or unit floor) would otherwise survive with a snapshot that no later pass confirmed.
    const lastRung = S.passes.length === 0 ? -1 : S.passes[S.passes.length - 1].index;
    Array.from(S.entries.values()).forEach(function (e) {
      if (e.rung !== lastRung) {
        S.diagnostics.push(Object.assign(entryView(e), { fate: 'earlier-than-last-rung' }));
        S.entries.delete(e.group);
      }
    });
    const list = Array.from(S.entries.values()).sort(function (a, b) {
      return a.unsolved - b.unsolved || a.ordinal - b.ordinal;
    });
    // Feasibility at the chosen parent (the final parent: its clue count and unit clues; a snapshot was feasible when
    // it was recorded and is immutable).
    const eligible = [];
    list.forEach(function (e) {
      if (variant.parent === 'final') {
        const present = e.cells.every(function (c) { return parent[c] !== 0; });
        const floorsOk = present && clues - e.cells.length >= spec.minClues &&
          (spec.minCluesPerUnit === 0 || D.unitsStayFilled(model, unitClues, e.cells, spec.minCluesPerUnit));
        if (!floorsOk) {
          S.diagnostics.push(Object.assign(entryView(e), { fate: 'infeasible-at-final-parent' }));
          return;
        }
      }
      eligible.push(e);
    });
    for (let i = 0; i < eligible.length; i++) {
      if (S.best !== null && S.best.exact) break;
      if (S.counts.phaseBTries >= kF) break;
      const e = eligible[i];
      S.counts.phaseBTries++;
      inPhase('phaseB', function () { tryEntry(e); });
      post('phaseB-try', { entry: e.group });
    }
  }

  function tryEntry(e) {
    const finalOk = hashGivens(parent) === S.finalHash;
    let base;
    if (variant.parent === 'final') {
      base = parent;
      if (!finalOk) throw new FrontierError('stale-final-parent', 'the final parent changed during phase B');
    } else {
      if (hashGivens(e.snapshot) !== e.parentHash) {
        throw new FrontierError('stale-snapshot', 'the immutable snapshot of group ' + e.group + ' changed');
      }
      base = e.snapshot;
    }
    const referenceHash = hashGivens(base);
    S.referenceChecks.push({ group: e.group, mode: variant.parent, referenceHash: referenceHash,
      equalsFinal: referenceHash === S.finalHash, equalsRecordedSnapshot: referenceHash === e.parentHash });
    const cand = Int32Array.from(base);
    for (let k = 0; k < e.cells.length; k++) cand[e.cells[k]] = 0;
    const row = { group: e.group, rung: e.rungId, ordinal: e.ordinal, unsolved: e.unsolved, referenceHash: referenceHash,
      candidateHash: hashGivens(cand), outcome: null };
    S.phaseBLog.push(row);

    // Fresh uniqueness proof of this exact reference candidate, before any uniqueness-assuming solve.
    const proof = withPurpose('dfs', function () { return D.countWithin(model, cand, budget); });
    row.proof = proof;
    if (proof === 0) throw new FrontierError('dfs-zero-solutions', 'a reference candidate has no solution', { group: e.group });
    if (proof === 2) {
      row.outcome = 'ambiguous-at-reference';
      return;
    }
    if (proof !== 1) {
      row.outcome = 'unknown-uniqueness';
      return;
    }

    if (variant.fuFilter) {
      S.counts.fuFilterSolves++;
      const verdict = withPurpose('fu', function () { return SG.difficulty.certifyFloor(model, cand, level, budget); });
      row.fu = { required: verdict.required, vacuous: verdict.vacuous, unsolved: verdict.unsolvedCount };
      if (verdict.required !== true) {
        row.outcome = 'fu-filtered-shallow';
        return;
      }
    }

    meter.need('phaseBSolves', 1, 'phaseB');
    const report = withPurpose('allowed', function () {
      return SG.logicalSolver.solve(model, cand, {
        allowedTechniques: spec.allowedTechniques, collectSteps: false, assumeUniqueness: true, budget: budget
      });
    });
    row.allowedStatus = report.status;
    if (report.status !== 'solved' && report.status !== 'stuck') {
      throw new FrontierError('allowed-contradiction', 'the allowed-set solve of a candidate proved unique ended ' +
        report.status, { group: e.group, rung: e.rungId, status: report.status });
    }
    if (report.solved !== true) {
      row.outcome = 'allowed-set-not-solved';
      return;
    }
    const rating = canonical(cand, 'phaseB');
    row.rating = { solved: rating.solved, level: rating.level, score: rating.score,
      hardestTechnique: rating.hardestTechnique };
    const verdict = consider(cand, rating, 'phaseB', 'dfs-count', { entry: e.group });
    row.quality = verdict.quality;
    row.kept = verdict.kept;
    row.outcome = rating.solved !== true ? 'canonical-incomplete' : (verdict.quality === 0 ? 'exact' :
      (verdict.quality === D.SHALLOW_QUALITY ? 'shallow' : 'rated'));
    if (verdict.quality === 0) return;
    if (rating.solved === true && rating.score < spec.min) deepenFrom(cand, rating, e);
  }

  // --- deepen: a few more removals with the native bounded objective ----------------------------------------------------
  function deepenFrom(start, rating, entry) {
    if (S.deepen.proposals >= SB.DEEPEN_MAX) return;
    const objective = D.removalObjective(model, spec, false);
    const rng = ctx.rng.fork('deepen');
    const working = Int32Array.from(start);
    const rejected = new Uint8Array(n);
    const uc = new Int32Array(model.units.length);
    let c = 0;
    for (let cell = 0; cell < n; cell++) {
      if (working[cell] === 0) continue;
      c++;
      const us = model.cellUnits[cell];
      for (let k = 0; k < us.length; k++) uc[us[k]]++;
    }
    const stats = { oracleCalls: 0 };
    const run = { from: hashGivens(start), startScore: rating.score, proposals: 0, committed: 0, refused: 0,
      reachedBand: false, unsupported: false, stoppedBy: null, result: null };
    S.deepen.runs.push(run);
    const poolLimit = Math.max(D.GUIDED_MIN_CANDIDATES, Math.min(D.GUIDED_CANDIDATES,
      Math.round(D.GUIDED_CANDIDATES * 81 / n)));
    let lastScore = null;
    inPhase('deepen', function () {
      for (;;) {
        if (S.deepen.proposals >= SB.DEEPEN_MAX) {
          run.stoppedBy = 'proposals';
          break;
        }
        const candidates = [];
        for (let gi = 0; gi < groups.length; gi++) {
          const present = Array.from(groups[gi]).filter(function (cell) { return working[cell] !== 0; });
          if (present.length === 0 || c - present.length < spec.minClues) continue;
          if (present.some(function (cell) { return rejected[cell] === 1; })) continue;
          if (spec.minCluesPerUnit > 0 && !D.unitsStayFilled(model, uc, present, spec.minCluesPerUnit)) continue;
          candidates.push(present);
        }
        if (candidates.length === 0) {
          run.stoppedBy = 'no-feasible-group';
          break;
        }
        rng.shuffle(candidates);
        const pool = candidates.slice(0, Math.min(poolLimit, SB.DEEPEN_MAX - S.deepen.proposals));
        let best = null;
        for (let p = 0; p < pool.length; p++) {
          const group = pool[p];
          meter.need('deepenProposals', 1, 'deepen');
          S.deepen.proposals++;
          run.proposals++;
          for (let i = 0; i < group.length; i++) working[group[i]] = 0;
          let value;
          try {
            value = withPurpose('deepen', function () { return objective(working, solution, group, budget, stats); });
          } finally {
            for (let i = 0; i < group.length; i++) working[group[i]] = solution[group[i]];
          }
          const out = objectiveOutcome(value, D);
          if (out.kind === 'unsupported') {
            run.unsupported = true;
            S.objectiveKind = 'unsupported:' + out.type;
            run.stoppedBy = 'unsupported-objective';
            return;
          }
          if (out.kind === 'refused') {
            run.refused++;
            for (let i = 0; i < group.length; i++) rejected[group[i]] = 1;
          } else if (best === null || out.score > best.score) {
            best = { group: group, score: out.score };
          }
        }
        if (best === null) continue;
        for (let i = 0; i < best.group.length; i++) {
          working[best.group[i]] = 0;
          const us = model.cellUnits[best.group[i]];
          for (let k = 0; k < us.length; k++) uc[us[k]]--;
        }
        c -= best.group.length;
        run.committed++;
        lastScore = best.score;
        if (best.score >= spec.min) {
          run.reachedBand = true;
          run.stoppedBy = 'band-reached';
          break;
        }
      }
    });
    if (run.unsupported) {
      throw new HarnessError('unsupported-source', 'the native removal objective returned a non-numeric value (' +
        S.objectiveKind + '): deepen never invents a score, so the sample stops as unsupported');
    }
    if (run.committed === 0) return;
    const deepRating = canonical(working, 'deepen');
    run.result = { solved: deepRating.solved, level: deepRating.level, score: deepRating.score, lastObjective: lastScore,
      hash: hashGivens(working) };
    // The committed puzzle was reached by solves that assume nothing (assumeUniqueness false, complete): unique by proof.
    const verdict = consider(working, deepRating, 'deepen', 'logical-proof', { entry: entry.group });
    run.result.quality = verdict.quality;
    run.result.kept = verdict.kept;
  }

  // --- the sample ---------------------------------------------------------------------------------------------------------
  let status = 'complete';
  let stop = null;
  rt.setLimits(ctx.limits || null);
  try {
    init();
    phaseA();
    phaseB();
  } catch (err) {
    if (err instanceof SB.BudgetStop) {
      status = 'sample-budget';
      stop = Object.assign(err.describe(), { atPhase: S.phase });
    } else {
      throw err;
    }
  } finally {
    rt.disarmS2();
    rt.setLimits(null);
  }
  meter.absorb(rt.countersOf());
  post('done', { status: status });

  const sel = selectionOfAudit(S, variant);
  return {
    status: status,
    budgetStop: stop,
    best: S.best,
    fallback: S.fallback,
    counts: {
      floorTests: meter.used.floorTests,
      floorDeductions: meter.used.floorDeductions,
      solverChecks: meter.used.solverChecks,
      dfsEntries: meter.used.dfsEntries,
      dfsChecks: meter.used.dfsChecks,
      ladderPasses: meter.used.ladderPasses,
      phaseBSolves: meter.used.phaseBSolves,
      deepenProposals: S.deepen.proposals,
      verificationSolves: caps.ratings,
      canonicalRatings: caps.ratings,
      phaseBTries: S.counts.phaseBTries,
      fuFilterSolves: S.counts.fuFilterSolves
    },
    caps: D.copyWork([caps]),
    detail: {
      groups: G,
      rungs: rungs.map(function (r) { return { id: r.id, ids: r.ids, effectiveIds: r.effectiveIds }; }),
      singleDigitPatterns: sets.singleDigitPatterns,
      passes: S.passes,
      removalsCount: S.removals.length,
      removals: S.removals.map(function (r) { return [r.group, r.rung, r.kind === 'rederived' ? 1 : 0, r.deductions, r.test]; }),
      s2: S.s2,
      refusals: S.refusals,
      entries: Array.from(S.entries.values()).map(entryView),
      diagnostics: S.diagnostics,
      phaseB: S.phaseBLog,
      referenceChecks: S.referenceChecks,
      deepen: S.deepen,
      objectiveKind: S.objectiveKind,
      phaseCosts: S.phaseCosts,
      finalParentHash: S.finalHash,
      finalClues: S.finalParent === null ? null : clues,
      parentMode: variant.parent
    },
    audit: S.finalParent === null ? null : {
      removals: S.removals.map(function (r) { return [r.group, r.rung, r.kind === 'rederived' ? 1 : 0, r.deductions]; }),
      rungSets: rungs.map(function (r) { return r.effectiveIds; }),
      rungIds: rungs.map(function (r) { return r.id; }),
      fullFloorIds: spec.floorTechniques.filter(function (id) { return SG.techniques.get(id).assumesUniqueness !== true; }),
      selected: sel,
      finalParentHash: S.finalHash
    }
  };
}

/** The first, middle and last S2-rederived removal (deduplicated), as indices into the removal list. */
function selectionOfAudit(S, variant) {
  if (!variant.s2) return [];
  const idx = [];
  S.removals.forEach(function (r, i) { if (r.kind === 'rederived') idx.push(i); });
  if (idx.length === 0) return [];
  const picks = [idx[0], idx[Math.floor((idx.length - 1) / 2)], idx[idx.length - 1]];
  return picks.filter(function (v, i) { return picks.indexOf(v) === i; });
}

// --- the native comparison sample ------------------------------------------------------------------------------------

/**
 * The native sample of ordinal 1 in the given kind: the unchanged `digLevel` with the native forks, caps, keeper and
 * guards, the proposal flag forced. The closest candidate is chosen as the native run chooses it (the keeper wins only
 * when strictly closer). ctx as for runFrontier plus `kind` ({ proposal }), `where`.
 */
function runNative(ctx) {
  const SG = ctx.SG;
  const rt = ctx.rt;
  const D = rt.digger;
  const model = ctx.model;
  const spec = ctx.spec;
  const level = ctx.level;
  const cfg = ctx.cfg;
  const budget = ctx.budget;
  const caps = D.newCaps({});
  const keeper = D.createKeeper(spec, level, budget);
  const em = SG.events.toEmitter(null);
  const stage = SG.digger.createStageSteps(em, { budget: budget, cooperative: false });
  const groups = SG.symmetry.groups(model, cfg.symmetry);
  const coarse = groups.some(function (g) { return g.length > 2; });
  const digTries = coarse ? D.DEFAULT_DIG_TRIES_COARSE : D.DEFAULT_DIG_TRIES;
  const options = {
    symmetry: cfg.symmetry, order: cfg.digOrder, maxAttempts: cfg.maxAttempts, budget: budget, emit: em, stage: stage,
    cooperative: false, postGenerate: null, strategy: SG.digger.getStrategy('cells'), strategyId: 'cells', spec: spec,
    keeper: keeper, where: { attempt: 1, maxAttempts: cfg.maxAttempts, sample: 1, maxSamples: digTries }, caps: caps,
    proposal: ctx.kind.proposal === true
  };
  rt.setPurpose('native');
  const puzzle = SG.digger.digLevel(model, ctx.solution, level, ctx.rng, options);
  rt.setPurpose('other');
  let best = puzzle;
  const sampleQuality = D.qualityOf(puzzle.rating, spec, level, puzzle.model);
  let source = 'sample';
  if (keeper.best !== null && keeper.distance < sampleQuality) {
    best = D.keptPuzzle(keeper.best, level);
    source = 'keeper';
  }
  return {
    status: 'complete',
    budgetStop: null,
    best: { givens: best.givens, model: best.model, rating: best.rating, source: source,
      quality: D.qualityOf(best.rating, spec, level, best.model), exact: best.exact === true,
      uniqueness: source === 'keeper' ? 'dfs-count' : 'secureUniqueness', log: best.log },
    sample: { quality: sampleQuality, exact: puzzle.exact === true, unsound: puzzle.unsound === true,
      clues: puzzle.clues, stats: puzzle.stats },
    keeper: { distance: keeper.distance === Infinity ? null : keeper.distance, held: keeper.best !== null },
    caps: D.copyWork([caps]),
    counts: { ratings: caps.ratings, proposals: caps.proposals }
  };
}

// --- the post-timing S2 audit (unpatched engine, outside the timed interval) ----------------------------------------------

const AUDIT_CHECKS = 300000;

function limitedSolve(SG, model, givens, ids, limit, collect) {
  let used = 0;
  const budget = {
    tick: noop,
    check: function check() {
      if (++used > limit) {
        const err = new Error('audit check ceiling');
        err.code = 'ig.audit-limit';
        throw err;
      }
    }
  };
  try {
    const report = SG.logicalSolver.solve(model, givens, {
      allowedTechniques: ids, collectSteps: collect, assumeUniqueness: false, budget: budget
    });
    return { report: report, limited: false, checks: used };
  } catch (err) {
    if (err && err.code === 'ig.audit-limit') return { report: null, limited: true, checks: used };
    throw err;
  }
}

/**
 * Re-solves, fully, the weakened puzzle of one S2 removal with the accepting rung's set and finds where the group was
 * re-derived and where the full solve ends. The ordinal is compared with the trial's own record.
 */
function auditRemoval(SG, model, groups, solution, input, index, limit) {
  const removal = input.removals[index];
  const parent = Int32Array.from(solution);
  for (let i = 0; i < index; i++) {
    const g = groups[input.removals[i][0]];
    for (let k = 0; k < g.length; k++) parent[g[k]] = 0;
  }
  const group = groups[removal[0]];
  for (let k = 0; k < group.length; k++) parent[group[k]] = 0;
  const ids = input.rungSets[removal[1]];
  const out = limitedSolve(SG, model, parent, ids, limit, true);
  const row = { index: index, group: removal[0], rung: input.rungIds[removal[1]], kind: removal[2] === 1 ? 'rederived' : 'solved',
    recordedOrdinal: removal[3], cells: group.length };
  if (out.limited) {
    row.status = 'unknown-audit-checks';
    row.checks = out.checks;
    return row;
  }
  const steps = out.report.steps;
  const wanted = new Set(Array.from(group));
  let placed = 0;
  let rederivedAt = null;
  let unsound = false;
  for (let i = 0; i < steps.length && rederivedAt === null; i++) {
    const placements = steps[i].placements || [];
    for (let p = 0; p < placements.length; p++) {
      const cell = placements[p][0];
      if (!wanted.has(cell)) continue;
      if (placements[p][1] !== solution[cell]) unsound = true;
      wanted.delete(cell);
      placed++;
    }
    if (wanted.size === 0) rederivedAt = i + 1;
  }
  row.status = 'audited';
  row.checks = out.checks;
  row.fullStatus = out.report.status;
  row.fullSolved = out.report.solved === true;
  row.fullOrdinal = out.report.solved === true ? steps.length : null;
  row.stepsToStuckOrEnd = steps.length;
  row.rederivedOrdinal = rederivedAt;
  row.unsound = unsound;
  const completesAtEnd = row.fullSolved && rederivedAt === steps.length;
  row.ordinalMatches = row.kind === 'rederived' ? (rederivedAt === removal[3] && !completesAtEnd) : null;
  row.operationalDisagreement = !row.fullSolved;
  row.placedCells = placed;
  return row;
}

/** The whole audit of a trial: the selected removals and the final phaseA parent (own last rung set and full floor). */
function auditS2(SG, input) {
  const cfg = SG.pipeline.normalizeConfig(input.config);
  const def = SG.variants.get(cfg.variantId);
  const rng = SG.rng.create(cfg.seed);
  const model = def.build(cfg.variantOptions, rng.fork('model'));
  const groups = SG.symmetry.groups(model, cfg.symmetry);
  const solution = Int32Array.from(input.solution);
  const limit = input.checkLimit || AUDIT_CHECKS;
  const rows = input.audit.selected.map(function (index) {
    return auditRemoval(SG, model, groups, solution, input.audit, index, limit);
  });
  const finalParent = Int32Array.from(solution);
  input.audit.removals.forEach(function (r) {
    const g = groups[r[0]];
    for (let k = 0; k < g.length; k++) finalParent[g[k]] = 0;
  });
  const ownIds = input.audit.rungSets[input.audit.rungSets.length - 1];
  const solveRow = function (ids) {
    const out = limitedSolve(SG, model, finalParent, ids, limit, false);
    if (out.limited) return { status: 'unknown-audit-checks', checks: out.checks };
    return { status: 'audited', checks: out.checks, solved: out.report.solved === true, reportStatus: out.report.status,
      unsolved: out.report.state.unsolvedCount };
  };
  const finalRow = {
    hash: hashGivens(finalParent),
    recordedHash: input.audit.finalParentHash,
    hashMatches: hashGivens(finalParent) === input.audit.finalParentHash,
    ownLastRung: Object.assign({ rung: input.audit.rungIds[input.audit.rungIds.length - 1] }, solveRow(ownIds)),
    fullFloor: solveRow(input.audit.fullFloorIds)
  };
  const accepted = input.audit.removals.length;
  const rederived = input.audit.removals.filter(function (r) { return r[2] === 1; }).length;
  return {
    acceptedRemovals: accepted,
    rederivedRemovals: rederived,
    audited: rows.length,
    removals: rows,
    finalParent: finalRow,
    operationalDisagreements: rows.filter(function (r) { return r.operationalDisagreement === true; }).length +
      (finalRow.ownLastRung.solved === false ? 1 : 0) + (finalRow.fullFloor.solved === false ? 1 : 0),
    correctnessProblems: rows.filter(function (r) { return r.unsound === true || r.ordinalMatches === false; }).length +
      (finalRow.hashMatches ? 0 : 1)
  };
}

module.exports = {
  CHEAP_GROUPS, MIDDLE_GROUPS, FRONTIER_IDS, NATIVE_IDS, MODE_ORDER, MODES, INTERPRETATIONS, FrontierError, AUDIT_CHECKS,
  hashGivens, floorSets, rungsOf, objectiveOutcome, runFrontier, runNative, auditS2, auditRemoval, selectionOfAudit
};
