'use strict';

/*
 * MS18c step-5 task-owned, FILE-ONLY population map (no generation, no solver, no pipeline call: the
 * engine files are loaded only to register the manual suites and read the support declarations, as the
 * `manual-corpus` sandbox does):
 *   node generator/tests/artifacts/difficulty-v3/MS18c/population-map.cjs
 * It reads three states of the five manual suites, `variants` and `perf` by registration only:
 *   A       the pre-publication checkpoint 6a473f7a (read with `git show`, no checkout);
 *   BEFORE  HEAD, the publication checkpoint B before the step-5 edits;
 *   AFTER   the working tree.
 * Each state is registered in a sandbox of its own (engine, variants and fixtures of THAT state), and the
 * emulation is checked against the official `--list-tests` inventories saved under closure/population/
 * (BEFORE
 * and AFTER must equal them test for test). It writes closure/population-map.json and .md with: the inventory
 * of the three states, every removed public registration (variant, level, original index, seed recipe, count,
 * options, trace and the verdict of the final qualification), the renamed and added tests, the retained fixed
 * diagnostic corpora, the two smoke substitutions, the 39 performance targets removed (old values), the
 * refusal complements, and the old and new toolHash of the recovery profile. Exits 1 on any problem.
 */
const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('./util.cjs');

const GENERATOR = path.join(util.REPO, 'generator');
const CLOSURE = path.join(util.EVIDENCE, 'closure');
const POPULATION = path.join(CLOSURE, 'population');
const REFS = { A: '6a473f7a', BEFORE: 'HEAD', AFTER: 'WORKTREE' };
const SUITES = ['killer', 'jigsaw', 'greater-than', 'extra-regions', 'wordoku', 'variants', 'perf'];
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
const LADDER = { killer: LEVELS, jigsaw: LEVELS, 'greater-than': LEVELS, 'extra-regions': LEVELS,
  wordoku: LEVELS.slice(0, 8) };
const problems = [];
const check = (ok, text) => { if (!ok) problems.push(text); };
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const lf = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

// ---- reading a state ------------------------------------------------------------------------------------
function show(ref, rel) {
  const run = childProcess.spawnSync('git', ['--no-optional-locks', 'show', ref + ':' + rel],
    { cwd: util.REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (run.status !== 0) {
    console.log('git show ' + ref + ':' + rel + ' -> ' + run.status + ' ' + (run.error || '') + ' ' +
      String(run.stderr || '').trim());
  }
  return run.status === 0 ? run.stdout : null;
}

/** The text of a repository-relative file in a state (null when it does not exist there). */
function readState(state, rel) {
  if (REFS[state] === 'WORKTREE') {
    const file = path.join(util.REPO, rel);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  }
  return show(REFS[state], rel);
}

function nodeOf(state) {
  const fsShim = {
    readFileSync: (abs, enc) => {
      const rel = path.relative(util.REPO, abs).split(path.sep).join('/');
      const text = /^generator\//.test(rel) ? readState(state, rel) : fs.readFileSync(abs, 'utf8');
      if (text === null) throw new Error(state + ' has no ' + rel);
      return enc ? text : Buffer.from(text, 'utf8');
    },
    existsSync: (abs) => {
      const rel = path.relative(util.REPO, abs).split(path.sep).join('/');
      return /^generator\//.test(rel) ? readState(state, rel) !== null : fs.existsSync(abs);
    }
  };
  return { fs: fsShim, path, vm, root: GENERATOR };
}

/** A sandbox of the state with the suites registered: { suite: [fullName ...] } and the live support. */
function inventory(state) {
  const node = nodeOf(state);
  const context = vm.createContext({});
  const corpus = readState(state, 'generator/tests/fixtures/manual-corpus.js');
  vm.runInContext(corpus.replace(/^\uFEFF/, ''), context, { filename: 'manual-corpus.js' });
  const box = context.SG.fixtures.manualCorpus.sandbox(node);
  ['tests/fixtures/perf-helper.js', 'tests/fixtures/regression.js'].forEach((rel) => box.load(rel));
  const out = { suites: {}, support: {}, errors: [] };
  SUITES.forEach((name) => box.register(name, 'tests/manual/' + name + '.test.js'));
  SUITES.forEach((name) => {
    const listing = box.list({ suite: name });
    out.errors.push(...listing.registrationErrors.map(String));
    out.suites[name] = listing.tests.map((t) => t.fullName);
  });
  box.SG.variants.list().forEach((def) => { out.support[def.id] = def.difficultySupport.slice(); });
  return out;
}

const official = (file) => {
  const listed = JSON.parse(fs.readFileSync(path.join(POPULATION, file), 'utf8'));
  const out = {};
  listed.tests.forEach((t) => { (out[t.suite] = out[t.suite] || []).push(t.fullName); });
  return out;
};

const states = {};
Object.keys(REFS).forEach((state) => { states[state] = inventory(state); });
const officialBefore = official('inventory-before-current.json');
const officialAfter = official('inventory-after.json');
['killer', 'jigsaw', 'greater-than', 'extra-regions', 'wordoku', 'perf'].forEach((name) => {
  check(JSON.stringify(states.BEFORE.suites[name]) === JSON.stringify(officialBefore[name]),
    'the BEFORE emulation of ' + name + ' differs from the official inventory');
  check(JSON.stringify(states.AFTER.suites[name]) === JSON.stringify(officialAfter[name]),
    'the AFTER emulation of ' + name + ' differs from the official inventory');
});
Object.keys(states).forEach((s) => check(states[s].errors.length === 0, s + ' registration errors'));

// ---- the final qualification ----------------------------------------------------------------------------
const merged = JSON.parse(fs.readFileSync(path.join(util.EVIDENCE, 'merge', 'qualification-v3.json'),
  'utf8'));
const verdictOf = {};
merged.cells.forEach((c) => {
  verdictOf[c.variant + '/' + c.level] = { verdict: c.summary.verdict, hits: c.summary.hits, n: c.summary.n,
    stopped: c.summary.stopped, p95: c.summary.p95 };
});

// ---- parsing a registration -----------------------------------------------------------------------------
const RECIPE = {
  killer: { trace: 'off', options: null, seeds: (li, i) => i + 1,
    count: (level) => (LEVELS.indexOf(level) >= LEVELS.indexOf('expert') ? 8 : 20), text: 'i + 1' },
  jigsaw: { trace: 'off', options: null, seeds: (li, i) => 700 + li * 100 + i,
    count: (level) => (level === 'hell2' ? 8 : 20), text: '700 + 100 * li + i' },
  'greater-than': { trace: 'summary', options: null, seeds: (li, i) => 100 * (li + 1) + i,
    count: (level) => (['veryEasy', 'easy', 'normal'].indexOf(level) !== -1 ? 20 : 10),
    text: '100 * (li + 1) + i' },
  'extra-regions': { trace: 'summary', options: null,
    seeds: (li, i, vi) => 10000 * (vi + 1) + 100 * li + i, count: (level) => (level === 'hell2' ? 8 : 20),
    text: '10000 * (variantIndex + 1) + 100 * li + i' },
  wordoku: { trace: 'summary', options: 'placement cycle: diagonal, diagonal, row, column',
    seeds: (li, i) => 100 * (li + 1) + i, count: () => 20, text: '100 * (li + 1) + i' }
};

function describeRegistration(suite, fullName) {
  const parts = fullName.split(' > ');
  const test = parts[parts.length - 1];
  const block = parts[parts.length - 2];
  const m = /^(?:(diagonalX|hyper) )?(\w+): (\d+) puzzles$/.exec(block || '');
  const recipe = RECIPE[suite];
  if (!m || !recipe) return null;
  const level = m[2];
  const variant = m[1] || { killer: 'killer', jigsaw: 'jigsaw9', 'greater-than': 'greaterThan',
    wordoku: 'wordoku' }[suite];
  const li = LEVELS.indexOf(level);
  const vi = variant === 'hyper' ? 1 : 0;
  const count = Number(m[3]);
  check(count === recipe.count(level), fullName + ': the count ' + count + ' is not the recipe count');
  return { suite, id: fullName, variant, level, originalIndex: li, count, test, trace: recipe.trace,
    options: recipe.options, seedRecipe: recipe.text,
    seeds: [recipe.seeds(li, 0, vi), recipe.seeds(li, count - 1, vi)],
    gq: verdictOf[variant + '/' + level] || null };
}

const HEAVY = ['samurai', 'sohei', 'flower', 'mega16', 'butterfly'];

/** The public CV3 registration of the generic `variants` suite: its own population is the offered levels. */
function describeVariants(fullName) {
  const m = /^variants > variants: (\w+) > CV3 (\w+): puzzles at the supported level$/.exec(fullName);
  if (!m) return null;
  const count = HEAVY.indexOf(m[1]) !== -1 ? 2 : 3;
  return { suite: 'variants', id: fullName, variant: m[1], level: m[2], originalIndex: LEVELS.indexOf(m[2]),
    count, test: 'CV3 ' + m[2], trace: 'off', options: null, seedRecipe: 'i + 1 (the seeds 1..perLevel)',
    seeds: [1, count], gq: verdictOf[m[1] + '/' + m[2]] || null };
}

const diff = (from, to) => {
  const set = new Set(to);
  return from.filter((name) => !set.has(name));
};

const removed = [];
const added = [];
const totals = {};
SUITES.forEach((suite) => {
  const a = states.A.suites[suite];
  const before = states.BEFORE.suites[suite];
  const after = states.AFTER.suites[suite];
  totals[suite] = { A: a.length, before: before.length, after: after.length };
  diff(a, before).forEach((name) => removed.push({ at: 'checkpoint B (live support)', suite, name }));
  diff(before, after).forEach((name) => removed.push({ at: 'step 5', suite, name }));
  diff(after, before).forEach((name) => added.push({ suite, name }));
});
// the quick suite that checks the adapters has no sandbox registration: its official inventories are compared
totals['manual-corpus'] = { A: null, before: officialBefore['manual-corpus'].length,
  after: officialAfter['manual-corpus'].length };
diff(officialBefore['manual-corpus'], officialAfter['manual-corpus']).forEach((name) => {
  removed.push({ at: 'step 5 (renamed or replaced)', suite: 'manual-corpus', name });
});
diff(officialAfter['manual-corpus'], officialBefore['manual-corpus']).forEach((name) => {
  added.push({ suite: 'manual-corpus', name });
});

// a removed per-level public registration, or another test that disappeared
const publicRemoved = [];
const otherRemoved = [];
removed.forEach((row) => {
  const info = describeRegistration(row.suite, row.name) || describeVariants(row.name);
  if (info) publicRemoved.push(Object.assign({ at: row.at }, info));
  else otherRemoved.push(row);
});

// ---- the per-level cells: published and the diagnostic ladder ------------------------------------------
const refusal = Object.keys(states.AFTER.support).map((id) => ({ variant: id,
  offered: states.AFTER.support[id],
  refused: LEVELS.filter((l) => states.AFTER.support[id].indexOf(l) === -1) }));
check(refusal.reduce((n, r) => n + r.offered.length, 0) === 79, 'the registry does not offer 79 levels');
const diagnostics = Object.keys(LADDER).map((suite) => {
  const variants = suite === 'extra-regions' ? ['diagonalX', 'hyper']
    : [{ killer: 'killer', jigsaw: 'jigsaw9', 'greater-than': 'greaterThan', wordoku: 'wordoku' }[suite]];
  return variants.map((variant) => ({ suite, variant, ladder: LADDER[suite],
    offered: states.AFTER.support[variant],
    hidden: LADDER[suite].filter((l) => states.AFTER.support[variant].indexOf(l) === -1),
    perLevel: LADDER[suite].map((level) => ({ level, originalIndex: LEVELS.indexOf(level),
      count: RECIPE[suite].count(level),
      seeds: [RECIPE[suite].seeds(LEVELS.indexOf(level), 0, variant === 'hyper' ? 1 : 0),
        RECIPE[suite].seeds(LEVELS.indexOf(level), RECIPE[suite].count(level) - 1,
          variant === 'hyper' ? 1 : 0)],
      gq: verdictOf[variant + '/' + level] || null })) }));
}).reduce((all, list) => all.concat(list), []);

// ---- the performance table ------------------------------------------------------------------------------
function rowsOf(text) {
  const out = {};
  const re = /^ {4}(\w+): row\(([^)]*)\)/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    out[m[1]] = m[2].split(',').map((v) => (v.trim() === 'null' ? null : Number(v)));
  }
  return out;
}
const oldRows = rowsOf(readState('BEFORE', 'generator/tests/fixtures/perf-helper.js'));
const newRows = rowsOf(readState('AFTER', 'generator/tests/fixtures/perf-helper.js'));
const perfRemoved = [];
let active = 0;
let never = 0;
Object.keys(oldRows).forEach((variant) => {
  LEVELS.forEach((level, i) => {
    const offered = states.AFTER.support[variant].indexOf(level) !== -1;
    const was = oldRows[variant][i];
    const now = newRows[variant][i];
    if (offered) {
      check(was !== null && now === was, variant + '/' + level + ': an offered target changed');
      active++;
    } else if (was === null) {
      never++;
      check(now === null, variant + '/' + level + ': a never-offered cell has a target');
    } else {
      check(now === null, variant + '/' + level + ': a hidden cell keeps a target');
      perfRemoved.push({ key: variant + '/' + level, oldTargetMs: was, newTarget: null,
        gq: verdictOf[variant + '/' + level] || null });
    }
  });
});
check(active === 79 && perfRemoved.length === 39 && never === 17, 'the table is not 79 + 39 + 17');
const smokeOf = (state) => {
  const m = /var PERF_CELLS = \[([\s\S]*?)\];/.exec(readState(state, 'generator/tests/manual/perf.test.js'));
  return (m[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
};
const smokeBefore = smokeOf('BEFORE');
const smokeAfter = smokeOf('AFTER');
const substitutions = smokeBefore.map((key, i) => (key === smokeAfter[i] ? null
  : { from: key, to: smokeAfter[i],
    fromVerdict: verdictOf[key] || null, toVerdict: verdictOf[smokeAfter[i]] || null })).filter(Boolean);
check(substitutions.length === 2 && new Set(smokeAfter).size === 19,
  'the smoke selection is not 19 cells + 2');
check(JSON.stringify(substitutions.map((s) => [s.from, s.to])) ===
  JSON.stringify([['wordoku/normal', 'wordoku/easy'], ['greaterThan/normal', 'greaterThan/easy']]),
'the substitutions are not the two declared');

// ---- the recovery profile: the tool hash by the tool's own recipe ---------------------------------------
function toolHash(state) {
  const source = readState(state, 'generator/tests/difficulty-recovery.js');
  const files = (/const TOOL_FILES = \[([\s\S]*?)\];/.exec(source)[1].match(/'[^']+'/g) || [])
    .map((s) => s.slice(1, -1));
  const hash = crypto.createHash('sha256');
  const detail = files.map((rel) => {
    const text = readState(state, 'generator/' + rel);
    hash.update(rel + '\0' + lf(text));
    return { file: rel, sha256: sha256(lf(text)) };
  });
  const fixtureList = (/const FIXTURES = \[([\s\S]*?)\];/.exec(source)[1].match(/'[^']+'/g) || [])
    .map((s) => s.slice(1, -1));
  return { toolHash: hash.digest('hex'), files: detail, fixtures: fixtureList };
}
const oldTool = toolHash('BEFORE');
const newTool = toolHash('AFTER');
const changedFiles = newTool.files.filter((f) => {
  const was = oldTool.files.find((o) => o.file === f.file);
  return !was || was.sha256 !== f.sha256;
}).map((f) => f.file);

// ---- tests whose ID stays and whose assertions follow the offers ---------------------------------------
const inPlace = [
  { suite: 'killer', test: 'CV6: the 95th percentile of the generation time stays inside the killer row of ' +
    'design.md 9.1',
    change: 'the per-level budget checks of the hidden levels are not public: it asserts the ' +
    'published veryEasy, easy and normal only',
  removedChecks: ['hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'].map((level) => ({ level,
    budgetMs: { hard: 1800 }[level] || 10000, gq: verdictOf['killer/' + level] || null })) },
  { suite: 'killer', test: 'CV3: every supported level yields its puzzles of that variant',
    change: 'retained over the fixed nine-level corpus (the corpus integrity every diagnostic consumer ' +
      'relies on)' },
  { suite: 'killer, jigsaw, greater-than, extra-regions, wordoku', test: 'the variant definition tests',
    change: 'assert the published list and the refusal of its complement (the nine-level catalogue); GT, ' +
    'extra-regions and wordoku also changed title, see above' },
  { suite: 'killer, jigsaw, greater-than, extra-regions, wordoku', test: 'every fixed or corpus request',
    change: 'built inside the per-call withRequestedLevel guard (generate / trace / digFrom / spec reads)' },
  { suite: 'extra-regions',
    test: 'the check can tell: a classic9 puzzle keeps its unique solution on the classic board',
    change: 'a public-support control that follows the offers, not a fixed diagnostic population: it ' +
    'iterates classic9\'s live support, 7 levels since B (veryEasy to nightmare), so Hell 1 (seed 707, ' +
    'global level index 7) is no longer generated; the seeds of the 7 remaining levels are unchanged ' +
    '(700 + global level index, the values of the former array index); no seed is compacted' },
  { suite: 'perf', test: 'every cell of the table is a variant and a level that the variant offers',
    change: 'unchanged; it now holds because the 39 hidden targets are null' },
  { suite: 'recovery-profile (quick)', test: 'the three fixed requests',
    change: 'guards in caseOf, prepare and profile; G13 stays samurai nightmare 42; one focused test added' }
];

// ---- the result -----------------------------------------------------------------------------------------
const result = {
  schema: 1,
  states: { A: REFS.A, B: '387a4c8d', before: 'HEAD (checkpoint B)', after: 'working tree (step 5)' },
  status: 'policy/implementation resolved; live validation of killer, jigsaw, greater-than, ' +
    'extra-regions and wordoku pending MS18e',
  emulationChecked: { before: true, after: true },
  totals,
  supportA: states.A.support,
  supportAfter: states.AFTER.support,
  removedPublicRegistrations: publicRemoved,
  removedOther: otherRemoved,
  addedOrRenamed: added,
  changedInPlace: inPlace,
  retainedFixedDiagnostics: diagnostics,
  refusalComplements: refusal,
  perf: { active, neverOffered: never, targetsRemoved: perfRemoved, smokeBefore, smokeAfter, substitutions },
  recoveryProfile: { oldToolHash: oldTool.toolHash, newToolHash: newTool.toolHash, oldFiles: oldTool.files,
    newFiles: newTool.files, oldFixtures: oldTool.fixtures, newFixtures: newTool.fixtures, changedFiles },
  problems
};

function table(rows, columns) {
  const head = '| ' + columns.map((c) => c[0]).join(' | ') + ' |';
  const rule = '|' + columns.map(() => '---').join('|') + '|';
  return [head, rule].concat(rows.map((r) => '| ' + columns.map((c) => String(c[1](r))).join(' | ') + ' |'));
}
const gqText = (g) => (g ? g.verdict + ' ' + g.hits + '/' + g.n +
  (g.stopped ? ' (stopped: ' + g.stopped + ')' : '')
  : 'no cell');
const md = [];
md.push('# MS18c step 5: population map', '');
md.push('Status: ' + result.status + '. States: A `' + REFS.A + '` (pre-publication), B `387a4c8d` / ' +
  'HEAD, and the',
  'working tree of step 5. Registration inventories are saved under `closure/population/` and the ' +
  'emulation of',
  'BEFORE and AFTER equals the official `--list-tests` inventories test for test.', '');
md.push('## Registrations by suite', '');
md.push(...table(Object.keys(totals), [['suite', (s) => s],
  ['A', (s) => (totals[s].A === null ? 'n/a' : totals[s].A)],
  ['before (B)', (s) => totals[s].before], ['after', (s) => totals[s].after]]), '');
md.push('## Removed public per-level registrations (' + publicRemoved.length + ')', '');
md.push(...table(publicRemoved, [['removed at', (r) => r.at], ['suite', (r) => r.suite],
  ['variant', (r) => r.variant], ['level', (r) => r.level], ['original index', (r) => r.originalIndex],
  ['count', (r) => r.count], ['seed recipe', (r) => r.seedRecipe + ' = ' + r.seeds[0] + '..' + r.seeds[1]],
  ['trace', (r) => r.trace], ['options', (r) => r.options || '-'], ['test', (r) => r.test],
  ['GQ verdict', (r) => gqText(r.gq)]]), '');
md.push('## Other registrations that disappeared or appeared (' + (otherRemoved.length + added.length) +
  ')', '');
md.push(...table(otherRemoved.map((r) => ({ kind: 'removed ' + r.at, suite: r.suite, name: r.name }))
  .concat(added.map((r) => ({ kind: 'added', suite: r.suite, name: r.name }))),
[['change', (r) => r.kind], ['suite', (r) => r.suite], ['test', (r) => r.name]]), '');
md.push('## Tests that keep their ID and follow the offers', '');
md.push(...table(inPlace, [['suite', (r) => r.suite], ['test', (r) => r.test],
  ['change', (r) => r.change]]), '');
md.push('The removed per-level budget checks of Killer CV6:', '');
md.push(...table(inPlace[0].removedChecks, [['level', (r) => r.level], ['budget (ms)', (r) => r.budgetMs],
  ['GQ verdict', (r) => gqText(r.gq)]]), '');
md.push('## Retained fixed diagnostic corpora', '');
diagnostics.forEach((d) => {
  md.push('### ' + d.suite + ' / ' + d.variant + ': ' + d.ladder.length + ' levels, ' + d.hidden.length +
    ' hidden (built inside the per-call guard)', '');
  md.push(...table(d.perLevel, [['level', (r) => r.level], ['original index', (r) => r.originalIndex],
    ['count', (r) => r.count], ['seeds', (r) => r.seeds[0] + '..' + r.seeds[1]],
    ['offered', (r) => (d.offered.indexOf(r.level) !== -1 ? 'yes' : 'no')],
    ['GQ verdict', (r) => gqText(r.gq)]]), '');
});
md.push('## Refusal complements (the published levels out of the nine)', '');
md.push(...table(refusal, [['variant', (r) => r.variant], ['offered', (r) => r.offered.join(', ')],
  ['refused', (r) => r.refused.join(', ') || '-']]), '');
md.push('## Performance table: ' + active + ' active targets, ' + perfRemoved.length + ' removed, ' + never +
  ' never offered', '');
md.push(...table(perfRemoved, [['cell', (r) => r.key], ['old target (ms)', (r) => r.oldTargetMs],
  ['new', () => 'null'], ['GQ verdict', (r) => gqText(r.gq)]]), '');
md.push('Smoke cells (19 unique, warn only): the two substitutions:', '');
md.push(...table(substitutions, [['removed', (s) => s.from], ['replacement', (s) => s.to],
  ['removed cell GQ', (s) => gqText(s.fromVerdict)], ['replacement GQ', (s) => gqText(s.toVerdict)]]), '');
md.push('## Recovery profile', '');
md.push('Old `toolHash` `' + oldTool.toolHash + '`, new `' + newTool.toolHash +
  '` (the tool\'s own recipe: the',
  'files of `TOOL_FILES`, each as `<path>\\0<text with LF ends>`). Changed files: ' +
  changedFiles.map((f) => '`' + f + '`').join(', ') +
  '. The CLI now also loads `tests/fixtures/tool-records.js`',
  '(the guard) and hashes it. No request of the three cases changes.', '');
md.push(...table(newTool.files, [['file', (f) => f.file], ['new sha256 (LF text)', (f) => f.sha256],
  ['old sha256', (f) =>
    (oldTool.files.find((o) => o.file === f.file) || { sha256: '(not in the old list)' }).sha256]]),
'');
md.push(problems.length === 0 ? 'No problem found.' : 'PROBLEMS: ' + problems.join('; '), '');

util.writeAtomic(path.join(CLOSURE, 'population-map.json'), util.jsonText(result, true));
util.writeAtomic(path.join(CLOSURE, 'population-map.md'), md.join('\r\n').replace(/\r?\n/g, '\r\n'));
console.log('population map: ' + publicRemoved.length + ' removed public registrations, ' + added.length +
  ' added, ' + otherRemoved.length + ' other removed; perf ' + active + '/' + perfRemoved.length + '/' +
  never +
  '; toolHash ' + oldTool.toolHash.slice(0, 12) + ' -> ' + newTool.toolHash.slice(0, 12));
if (problems.length > 0) {
  console.log('PROBLEMS:\n  ' + problems.join('\n  '));
  process.exitCode = 1;
}
