'use strict';

/*
 * IG-S03 audit instrumentation (test side, provisional (pre-freeze)): the observer of logical check sites, its budget
 * wrappers, the ordinal selection of the injected failures and the pure comparison of two audited solves.
 *
 * Instrumented audit mode hashes EVERY logical check-site token (the site kind, the finder, the unit, the enumeration
 * node counter and the solver step) and keeps a bounded first/last window and checkpoint hashes so that a mismatch can
 * be localised and its context re-captured. Audited wall time is never a speed measurement: benchmark workers do not
 * load this module's engine hooks at all (adapter `scoped-audit` is not part of a timing instance).
 *
 * Site kinds: 1 solver step check, 2 check before declaring "stuck", 3 subset unit entry, 4 subset enumeration node,
 * 5 a check of a finder that is not annotated (the finder id is recorded).
 */
const C = require('./common.cjs');

const KIND_NAMES = ['?', 'iterate-step', 'iterate-stuck', 'subset-unit', 'subset-node', 'finder-check'];
const CHECKPOINT_EVERY = 1024;
const RING = 24;
const SKIP_SAMPLE_EVERY = 64;

// Native error classes of the guards this audit injects (the literal codes of the production sources):
// SG.budget (budget.exceeded), digger.js boundedObjective (OBJECTIVE_STEPS), killer.js nodeSlice (ANALYSIS_NODES).
const GUARD_CODES = Object.freeze({
  native: 'budget.exceeded',
  objective: 'digger.objectiveGuard',
  killer: 'killer.sliceExpired'
});
const CEILINGS = Object.freeze({ objective: 100000, killer: 30000 });

function createObserver() {
  const ids = new Map();
  const names = [];
  let ordinal = 0;
  let steps = 0;
  let h1 = 0;
  let h2 = 0;
  let pending = 0;
  let pf = 0;
  let pu = 0;
  let pn = 0;
  let curFinder = 0;
  let curUnit = 0;
  let first = [];
  let ring = [];
  let ringAt = 0;
  let cps = [];
  let lastToken = null;
  let capture = null;
  let captured = [];
  let skips = null;

  function idx(name) {
    let i = ids.get(name);
    if (i === undefined) {
      i = names.length;
      ids.set(name, i);
      names.push(name);
    }
    return i;
  }

  function resetSkips() {
    skips = { count: 0, first: null, firstMulti: null, max: null, last: null, sampled: [], virtualNodeChecks: 0,
      crossing: 0, multi: 0, residues: new Set() };
  }

  function tokenString(t) {
    return KIND_NAMES[t[0]] + ':' + (names[t[1]] || '-') + ':u' + t[2] + ':n' + t[3] + ':s' + t[4];
  }

  const A = {
    muted: false,
    reset: function (options) {
      ordinal = 0;
      steps = 0;
      h1 = 0x811c9dc5;
      h2 = 0x1b873593;
      pending = 0;
      curFinder = 0;
      curUnit = 0;
      first = [];
      ring = [];
      ringAt = 0;
      cps = [];
      lastToken = null;
      captured = [];
      capture = options && options.capture ? options.capture : null;
      A.muted = false;
      resetSkips();
    },
    site: function (kind) {
      if (A.muted) return;
      pending = kind;
      pf = 0;
      pu = 0;
      pn = 0;
    },
    siteUnit: function (id, u, nodes) {
      if (A.muted) return;
      curFinder = idx(id);
      curUnit = u;
      pending = 3;
      pf = curFinder;
      pu = u;
      pn = nodes;
    },
    siteNode: function (nodes) {
      if (A.muted) return;
      pending = 4;
      pf = curFinder;
      pu = curUnit;
      pn = nodes;
    },
    finder: function (id) {
      if (A.muted) return;
      curFinder = idx(id);
    },
    // Called by the budget wrapper at every real check, before it may throw.
    onCheck: function () {
      ordinal++;
      let kind = pending;
      let f = pf;
      let u = pu;
      let n = pn;
      if (kind === 0) {
        kind = 5;
        f = curFinder;
        u = 0;
        n = 0;
      }
      pending = 0;
      if (kind === 1) steps++;
      const t = [kind, f, u, n, steps];
      for (let i = 0; i < 5; i++) {
        const x = t[i] | 0;
        h1 = Math.imul(h1 ^ (x & 0xffff), 0x01000193) >>> 0;
        h1 = Math.imul(h1 ^ (x >>> 16), 0x01000193) >>> 0;
        h2 = (Math.imul((h2 + x + 0x9e3779b9) | 0, 0x85ebca6b) ^ (h2 >>> 13)) >>> 0;
      }
      lastToken = t;
      if (first.length < RING) first.push(t);
      if (ring.length < RING) ring.push(t);
      else {
        ring[ringAt] = t;
        ringAt = (ringAt + 1) % RING;
      }
      if (ordinal % CHECKPOINT_EVERY === 0) cps.push(((h1 ^ Math.imul(h2, 31)) >>> 0));
      if (capture !== null && ordinal >= capture.from && ordinal <= capture.to) captured.push(tokenString(t));
    },
    // The runtime reports a skipped scope: its entry check had ordinal `ord0`, then `made` virtual node checks.
    scopeSkipped: function (id, u, ord0, made, inc, residue) {
      if (A.muted || skips === null) return;
      const rec = { ord0: ord0, m: made, finder: id, unit: u, inc: inc };
      skips.count++;
      skips.virtualNodeChecks += made;
      if (made >= 1) skips.crossing++;
      if (made >= 2) skips.multi++;
      if (residue !== undefined) skips.residues.add(residue & 255);
      if (skips.first === null) skips.first = rec;
      if (made >= 2 && skips.firstMulti === null) skips.firstMulti = rec;
      if (skips.max === null || made > skips.max.m) skips.max = rec;
      skips.last = rec;
      if (skips.count % SKIP_SAMPLE_EVERY === 0) skips.sampled.push(rec);
    },
    get ordinal() { return ordinal; },
    get steps() { return steps; },
    lastTokenString: function () { return lastToken === null ? null : tokenString(lastToken); },
    summary: function () {
      const out = [];
      for (let i = 0; i < ring.length; i++) out.push(ring[(ringAt + i) % ring.length]);
      return {
        checks: ordinal,
        hash: ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')),
        first: first.map(tokenString),
        last: (ring.length < RING ? ring : out).map(tokenString),
        checkpoints: cps.slice(),
        captured: captured.slice(),
        skips: skips === null ? null : {
          count: skips.count, virtualNodeChecks: skips.virtualNodeChecks, first: skips.first,
          firstMulti: skips.firstMulti, max: skips.max, last: skips.last, sampled: skips.sampled,
          crossing: skips.crossing, multi: skips.multi, distinctResidues: skips.residues.size
        }
      };
    }
  };
  A.reset();
  return A;
}

// --- budgets ------------------------------------------------------------------------------------------------------

/**
 * The count budgets of the audit, built on the engine `SG` of the worker. `spec` = { form, k }:
 *  - observe: counts only (the unlimited run);
 *  - native: the real `SG.budget` with `nodes: k - 1`, so the k-th check throws budget.exceeded;
 *  - objective: the wrapper of digger.js boundedObjective (OBJECTIVE_STEPS = 100,000), precharged so that the k-th check
 *    of the solve crosses the real ceiling ("boundary-injected"); `k: 0` is the natural, unprecharged guard;
 *  - killer: the wrapper of killer.js nodeSlice (ANALYSIS_NODES = 30,000) with its `meter.spent`, likewise.
 * With an observer every check is first reported to it; the error is thrown by the same code as in production.
 */
function makeBudget(SG, observer, spec) {
  const form = spec.form;
  const k = spec.k;
  const notify = observer === null ? function () {} : function () { observer.onCheck(); };
  let counted = 0;
  const meter = { spent: 0 };
  const budget = { tick: function () {}, meter: meter, count: function () { return counted; } };
  if (form === 'observe') {
    budget.check = function () { counted++; notify(); };
  } else if (form === 'native') {
    const inner = SG.budget.create({ nodes: k - 1 });
    budget.check = function () { counted++; notify(); inner.check(); };
  } else if (form === 'objective' || form === 'killer') {
    const limit = CEILINGS[form];
    let used = k > 0 ? limit - k + 1 : 0;
    budget.check = function () {
      counted++;
      notify();
      if (form === 'killer') meter.spent++;
      if (++used > limit) {
        throw new SG.errors.GenerationError(GUARD_CODES[form], form === 'killer' ? { nodes: used } : { steps: used });
      }
    };
  } else {
    throw new Error('unknown budget form ' + form);
  }
  return budget;
}

/** The error fields that must agree (wall-clock fields excluded: elapsedMs is time, not logic). */
function errorFields(err) {
  const args = Object.assign({}, err && err.i18nArgs);
  delete args.elapsedMs;
  return { name: err && err.name, code: err && err.code, args: C.canonicalize(args) };
}

// --- ordinal selection --------------------------------------------------------------------------------------------

/**
 * The failure ordinals of one audited solve with `total` checks (deduplicated, in the order of priority, at most
 * `max`): the first, the last and the middle check, then for the first skipped scope, the first multi-check skipped
 * scope, the one nearest the middle and the last, the check immediately before the scope, its middle check and the
 * check immediately after it. `b` = the boundaries reported by the scoped run.
 */
function selectOrdinals(total, boundaries, max) {
  const limit = max || 12;
  const out = [];
  const add = function (k) {
    if (Number.isInteger(k) && k >= 1 && k <= total && out.indexOf(k) < 0) out.push(k);
  };
  add(1);
  add(total);
  add(Math.ceil(total / 2));
  const b = boundaries || {};
  const mid = nearestTo(b.sampled || [], total / 2);
  [b.first, b.firstMulti, b.last, mid].forEach(function (s) {
    if (!s) return;
    add(s.ord0 - 1);
    add(s.ord0 + Math.max(0, Math.ceil(s.m / 2)));
    add(s.ord0 + s.m + 1);
  });
  [b.first, b.firstMulti, b.last, mid].forEach(function (s) {
    if (!s) return;
    add(s.ord0);
    add(s.ord0 + s.m);
  });
  return out.slice(0, limit);
}

function nearestTo(list, target) {
  let best = null;
  list.forEach(function (s) {
    if (best === null || Math.abs(s.ord0 - target) < Math.abs(best.ord0 - target)) best = s;
  });
  return best;
}

/** The scopes (with their ordinals) that the selected ordinals sit around, for the record. */
function boundaryLabels(total, boundaries) {
  const b = boundaries || {};
  const mid = nearestTo(b.sampled || [], total / 2);
  return { first: b.first || null, firstMulti: b.firstMulti || null, mid: mid, last: b.last || null,
    maxChecks: b.max || null };
}

// --- comparison of audited solves ---------------------------------------------------------------------------------

/** Equality of the unlimited runs: checks, token hash and checkpoints, steps and report digests. */
function compareUnlimited(ref, scoped, plain) {
  const problems = [];
  const same = function (name, a, b) {
    if (C.canonicalJson(a) !== C.canonicalJson(b)) problems.push(name + ': ' + C.canonicalJson(a) + ' vs ' +
      C.canonicalJson(b));
  };
  same('checks', ref.checks, scoped.checks);
  same('tokenHash', ref.hash, scoped.hash);
  same('checkpoints', ref.checkpoints, scoped.checkpoints);
  same('first window', ref.first, scoped.first);
  same('last window', ref.last, scoped.last);
  same('stepsDigest', ref.stepsDigest, scoped.stepsDigest);
  same('reportDigest', ref.reportDigest, scoped.reportDigest);
  if (plain) {
    same('plain checks', plain.checks, ref.checks);
    same('plain stepsDigest', plain.stepsDigest, ref.stepsDigest);
    same('plain reportDigest', plain.reportDigest, ref.reportDigest);
  }
  return { equal: problems.length === 0, problems: problems };
}

/** Equality of one injected failure: outcome, error fields, ordinal, site token, steps applied, guard state. */
function compareFailure(ref, scoped, plain) {
  const problems = [];
  const pick = function (o) {
    return { completed: o.completed, error: o.error || null, ordinal: o.ordinal, token: o.token, steps: o.steps,
      meter: o.meter === undefined ? null : o.meter, report: o.reportDigest || null };
  };
  if (C.canonicalJson(pick(ref)) !== C.canonicalJson(pick(scoped))) {
    problems.push('outcome: ' + C.canonicalJson(pick(ref)) + ' vs ' + C.canonicalJson(pick(scoped)));
  }
  if (scoped.boundaryNodesOk === false) problems.push('the module node counter at the throw is not the boundary');
  if (plain) {
    const coarse = function (o) {
      return { completed: o.completed, error: o.error || null, ordinal: o.ordinal,
        meter: o.meter === undefined ? null : o.meter, report: o.reportDigest || null };
    };
    if (C.canonicalJson(coarse(plain)) !== C.canonicalJson(coarse(ref))) {
      problems.push('plain native: ' + C.canonicalJson(coarse(plain)) + ' vs ' + C.canonicalJson(coarse(ref)));
    }
  }
  return { equal: problems.length === 0, problems: problems };
}

/** The first differing window of two checkpoint lists (null when equal as far as they go), for a re-capture. */
function firstDifferingWindow(a, b, total) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return { from: i * CHECKPOINT_EVERY + 1, to: (i + 1) * CHECKPOINT_EVERY };
  }
  if (a.length !== b.length) return { from: n * CHECKPOINT_EVERY + 1, to: total };
  return null;
}

/** First differing token of two captured windows with a few tokens of context. */
function mismatchContext(a, b, from) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      const lo = Math.max(0, i - 3);
      return { ordinal: from + i, reference: a.slice(lo, i + 4), scoped: b.slice(lo, i + 4) };
    }
  }
  return null;
}

// --- synthetic states ---------------------------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function maskOf(rand, digits) {
  const want = rand() < 0.1 ? 5 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 3);
  let mask = 0;
  let have = 0;
  while (have < want) {
    const bit = 1 << Math.floor(rand() * digits);
    if ((mask & bit) === 0) {
      mask |= bit;
      have++;
    }
  }
  return mask;
}

/**
 * The initial candidate masks of a synthetic scenario, a pure function of (seed, cell count, digits): every cell open
 * with 2 to 4 random candidates (now and then 5 to 7), so units hold many items and the subset enumeration of one unit
 * easily exceeds the CHECK_EVERY cadence. Returns the masks and the PRNG, which the scenario goes on drawing from.
 */
function initialMasks(spec) {
  const rand = mulberry32(spec.seed);
  const masks = [];
  for (let c = 0; c < spec.cells; c++) masks.push(maskOf(rand, spec.digits));
  return { masks: masks, rand: rand };
}

/** The fixed synthetic scenarios of the pre-run audit manifest, with the hash of each initial state. */
function syntheticPlan() {
  const specs = [];
  for (let i = 0; i < 6; i++) {
    specs.push({ id: 'syn-m16-' + (i + 1), variantId: 'mega16', cells: 256, digits: 16, seed: 20261114 + i,
      rounds: 6, mutations: 4, placeShare: 0.4 });
  }
  for (let i = 0; i < 3; i++) {
    specs.push({ id: 'syn-m12-' + (i + 1), variantId: 'mega12', cells: 144, digits: 12, seed: 20261214 + i,
      rounds: 6, mutations: 4, placeShare: 0.4 });
  }
  return specs.map(function (spec) {
    return Object.assign({}, spec, { initialStateHash: C.digestOf(initialMasks(spec).masks) });
  });
}

module.exports = {
  KIND_NAMES, CHECKPOINT_EVERY, GUARD_CODES, CEILINGS, createObserver, makeBudget, errorFields, selectOrdinals,
  boundaryLabels, compareUnlimited, compareFailure, firstDifferingWindow, mismatchContext, mulberry32, maskOf,
  initialMasks, syntheticPlan
};
