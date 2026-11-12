#!/usr/bin/env node
'use strict';

/*
 * Finds a real, reproducible example for the techniques of the Help page and checks or writes
 * js/ui/help-examples.js. Every decision lives in tests/fixtures/help-example-tools.js
 * (SG.fixtures.helpExampleTools); this file reads and writes the files, loads the sources and starts the
 * generator child.
 *
 *   node tests/tools/make-technique-examples.js [path-to-generator] [options]      (--help lists them)
 *
 * The default is a read-only check of the selected IDs against the saved catalogue, replaying the puzzle of
 * each saved example: nothing is generated, nothing is written. The Player plays each source the way a person
 * who keeps asking for hints would: fill in all the notes, ask for a hint, apply it, and so on until the game
 * is stuck, solved or --max-hints hints were used. The first hint of a technique is a candidate for its
 * example, and the easiest one to read wins (the fewest cells, removals and candidates on show, a plain 9x9
 * board preferred; the earliest on a tie). What is saved is a snapshot of the board and the hint, so the guide
 * draws it at once and plays nothing (`SG.helpExamples`, see js/ui/help.js); the puzzle and the number of
 * hints are kept in it only so that a test can check the snapshot against the player's own hints.
 *
 * Sources are real puzzles of the generator, named by an explicit file (--sources) or the saved example of the
 * ID. Only with --discover (and --write or --record-sources) does a child process load the generator (default
 * ../generator, which is only READ) and make at most --max-puzzles puzzles of the plan, as the text of the
 * generator's Export box. The intermediate of that child lives in --work-dir (inside the repository), the
 * tool stops at an eight-minute deadline (exit 2, nothing written), and every file is written through a
 * partial file that replaces the old one only when the whole result is valid. The file is committed; this is
 * only needed when the solver, the hints or the generator change.
 *
 * Exit code: 0 done or up to date; 1 a difference, a missing example, a wrong command line or an error;
 * 2 incomplete (the deadline or the generator child's time ran out).
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PLAYER_ROOT = path.resolve(__dirname, '..', '..');
const REPO = path.resolve(PLAYER_ROOT, '..');
/** The generator sits next to the player in the repository. */
const DEFAULT_GENERATOR = path.resolve(REPO, 'generator');
const CANONICAL = path.join(PLAYER_ROOT, 'js', 'ui', 'help-examples.js');
const FIXTURE = path.join(PLAYER_ROOT, 'tests', 'fixtures', 'help-example-tools.js');
const EXIT_INCOMPLETE = 2;
const EXIT_CHILD_INCOMPLETE = 3;
const CHILD_MARGIN_MS = 5000;

const USAGE = [
  'Usage: node tests/tools/make-technique-examples.js [path-to-generator] [options]',
  '',
  '  --ids=id[,id]             exact technique IDs (default: every registered ID)',
  '  --sources=<file.json>     real puzzle sources per ID:',
  '                            {schema:1, sources:{id:[{variantId, level, seed, text}]}}',
  '                            (default: the puzzle of the saved example of each ID)',
  '  --max-puzzles=N           at most N puzzles in all, before generating and before replaying',
  '                            (default 64); --puzzles=N is the same cap',
  '  --max-hints=N             at most N hints per puzzle (default 400)',
  '  --check                   compare the selected examples with the catalogue, write nothing (default)',
  '  --write                   merge the selected examples into the complete catalogue and write it',
  '  --record-sources=<f.json> save the real source of each selected ID; no catalogue is written',
  '  --discover                make at most --max-puzzles puzzles of the plan (needs --write or',
  '                            --record-sources; not with --sources or --check)',
  '  --variants=id[,id]        only these variants of the plan (with --discover)',
  '  --levels=id[,id]          only these levels of the plan (with --discover)',
  '  --out=<file.js>           the catalogue to compare with or write (default js/ui/help-examples.js)',
  '  --work-dir=<directory>    project-relative folder of the intermediates',
  '                            (default tests/artifacts/difficulty-v3/help)',
  '  --help                    this text; nothing is loaded or generated',
  '',
  'Paths are relative to the current folder and stay inside the repository. Exit code 0: done or up to',
  'date; 1: a difference, a missing example, a wrong command line or an error; 2: incomplete (the',
  'eight-minute deadline of the tool or the time of the generator child ran out; nothing was written).'
].join('\n');

/** A path as the repository shows it: relative to the repository root, with forward slashes. */
function show(abs) {
  return path.relative(REPO, abs).split(path.sep).join('/');
}

function inside(abs, folder) {
  const rel = path.relative(folder, abs);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** A path of the command line as an absolute one; it must stay inside the repository. */
function projectFile(T, value, flag) {
  const abs = path.resolve(value);
  if (!inside(abs, REPO)) {
    throw T.usageError(flag + ': the path must stay inside the repository (' + value + ')');
  }
  return abs;
}

function readText(abs) {
  return fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
}

function runScript(abs) {
  vm.runInThisContext(readText(abs), { filename: abs });
}

/** Runs the sources of an app in this context, in the order of the SOURCE_FILES of its node-runner.js. */
function loadSources(dir) {
  const runner = path.join(dir, 'tests', 'node-runner.js');
  if (!fs.existsSync(runner)) {
    throw new Error(show(dir) + ': not an app folder (tests/node-runner.js is missing)');
  }
  const block = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(readText(runner));
  if (block === null) throw new Error('SOURCE_FILES not found in ' + show(runner));
  block[1].match(/'([^']+)'/g).map(function (s) { return s.slice(1, -1); }).forEach(function (rel) {
    const abs = path.join(dir, rel);
    if (fs.existsSync(abs)) runScript(abs);
  });
  return globalThis.SG;
}

/** Creates the folder if it is missing and returns the first folder this call created (null: it existed). */
function ensureDir(dir) {
  if (fs.existsSync(dir)) return null;
  return fs.mkdirSync(dir, { recursive: true }) || null;
}

/** Removes the folders `ensureDir` created, from the innermost one, only while they are empty. */
function releaseDir(dir, created) {
  if (created === null) return;
  for (let d = dir; ; d = path.dirname(d)) {
    try {
      fs.rmdirSync(d);
    } catch (err) {
      return;
    }
    if (d === created) return;
  }
}

/** Writes a file through a partial file of the work directory: the old file stays until the new is whole. */
function writeAtomic(target, text, workDir) {
  const made = ensureDir(workDir);
  const partial = path.join(workDir, 'write-' + process.pid + '.partial');
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(partial, text, 'utf8');
    fs.renameSync(partial, target);
  } finally {
    fs.rmSync(partial, { force: true });
    releaseDir(workDir, made);
  }
}

// ---------------------------------------------------------------------------------------------
// Stage 1: the generator child makes the puzzles (only with --discover)
// ---------------------------------------------------------------------------------------------

function childMain(argv) {
  runScript(FIXTURE);
  const T = globalThis.SG.fixtures.helpExampleTools;
  const opts = T.parseChildOptions(argv);
  const generator = path.resolve(opts.generator);
  const SG = loadSources(generator);
  SG.i18n.setLocale('en');
  const deadline = T.makeDeadline(Date.now, Date.now(), opts.deadlineAt - Date.now());
  const combos = T.planDiscovery(function (id) { return SG.variants.get(id).difficultySupport; },
    { variants: opts.variants, levels: opts.levels });
  if (combos.length === 0) {
    throw new Error('the plan has no request for these --variants and --levels; nothing was generated');
  }
  const generate = function (variantId, level, seed) {
    const ms = Math.max(1000, Math.min(T.REQUEST_BUDGET_MS, deadline.remaining()));
    const result = SG.pipeline.run({ variantId: variantId, difficulty: level, seed: seed, trace: 'off',
      variantOptions: {} }, null, SG.budget.create({ ms: ms }));
    return { variantId: variantId, level: level, seed: String(seed),
      text: SG.exportUi.buildExportText([{ result: result }]).trim() };
  };
  const done = T.runDiscovery(combos, opts.maxPuzzles, generate, deadline, console.log);
  if (!done.complete) {
    console.error('incomplete: the deadline came after ' + done.attempted + ' request(s)');
    return EXIT_CHILD_INCOMPLETE;
  }
  fs.writeFileSync(opts.stage1, JSON.stringify({ schema: T.SOURCE_SCHEMA, complete: true,
    attempted: done.attempted, items: done.items, failures: done.failures }), 'utf8');
  return 0;
}

function discover(T, opts, generator, workDir, deadline) {
  if (!fs.existsSync(path.join(generator, 'tests', 'node-runner.js'))) {
    throw new Error(show(generator) + ': not a generator folder (tests/node-runner.js is missing)');
  }
  const file = path.join(workDir, 'stage1-' + process.pid + '.json');
  const env = {
    file: file,
    args: [__filename, generator].concat(T.childArguments(opts, file, deadline.at - CHILD_MARGIN_MS)),
    ensureDir: function () { return ensureDir(workDir); },
    release: function (made) { releaseDir(workDir, made); },
    spawn: function (args, timeout) {
      return childProcess.spawnSync(process.execPath, args, { stdio: 'inherit', timeout: timeout,
        killSignal: 'SIGKILL', windowsHide: true });
    },
    readText: function (abs) { return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null; },
    remove: function (abs) { fs.rmSync(abs, { force: true }); }
  };
  return T.runStage1(env, opts, deadline);
}

// ---------------------------------------------------------------------------------------------
// Stage 2: the Player replays the sources
// ---------------------------------------------------------------------------------------------

function label(item) {
  return item.variantId + ' ' + (item.level === null ? '-' : item.level) + ' ' +
    (item.seed === null ? '-' : item.seed);
}

/** The sources of the selected IDs: discovered, from a file, or the saved examples. */
function sourcesOf(SG, T, opts, ids, files, deadline) {
  if (opts.discover) {
    const found = discover(T, opts, files.generator, files.workDir, deadline);
    console.log('discovery: ' + found.attempted + ' request(s), ' + found.items.length + ' puzzle(s), ' +
      found.failures.length + ' failed');
    found.failures.forEach(function (f) {
      console.log('  failed ' + f.variantId + ' ' + f.level + ' ' + f.seed + ': ' + f.error);
    });
    if (found.items.length === 0) throw new Error('discovery made no puzzle: nothing to replay');
    const items = found.items.map(function (item) {
      return Object.assign({}, item, { text: item.text.trim() });
    });
    const assigned = {};
    ids.forEach(function (id) { assigned[id] = items; });
    return assigned;
  }
  if (files.sources !== null) {
    if (!fs.existsSync(files.sources)) throw new Error(show(files.sources) + ': no such sources file');
    let data;
    try {
      data = T.parseSources(readText(files.sources));
    } catch (err) {
      throw new Error(show(files.sources) + ': ' + err.message);
    }
    const registry = SG.techniques.list().map(function (tech) { return tech.id; });
    const checked = T.validateSources(data, registry);
    if (checked.problems.length > 0) {
      throw new Error(show(files.sources) + ' is not a valid sources file:\n  ' +
        checked.problems.join('\n  '));
    }
    return T.assignSources(ids, checked.sources);
  }
  return T.defaultSources(SG.helpExamples, ids);
}

function replay(SG, T, opts, ids, assigned, deadline) {
  const plan = T.admit(ids, assigned, opts.maxPuzzles);
  if (plan.skipped > 0) {
    console.log('note: ' + plan.skipped + ' source(s) beyond --max-puzzles=' + opts.maxPuzzles +
      ' are not replayed');
  }
  if (plan.missing.length > 0) {
    throw new Error('no source within --max-puzzles=' + opts.maxPuzzles + ' for ' + plan.missing.join(', ') +
      ' (raise the cap or select fewer IDs)');
  }
  if (!opts.discover) {
    const problems = [];
    plan.puzzles.forEach(function (p, i) {
      const opened = T.openSource(SG, p.item);
      if (!opened.ok) {
        problems.push('  source ' + (i + 1) + ' (' + p.ids.join(', ') + '; ' + label(p.item) + '): ' +
          opened.error);
      }
    });
    if (problems.length > 0) throw new Error('a source cannot be replayed:\n' + problems.join('\n'));
  }
  console.log('replaying ' + plan.puzzles.length + ' puzzle(s) for ' + ids.length + ' ID(s) (--max-puzzles=' +
    opts.maxPuzzles + ', --max-hints=' + opts.maxHints + ')');
  const results = [];
  plan.puzzles.forEach(function (p, i) {
    deadline.check('before puzzle ' + (i + 1));
    const limits = { maxHints: opts.maxHints,
      check: function () { deadline.check('during puzzle ' + (i + 1)); } };
    const r = T.replayPuzzle(SG, p.item, p.ids, limits);
    results.push(r);
    console.log('puzzle ' + (i + 1) + '/' + plan.puzzles.length + ' ' + label(p.item) + ' -> ' +
      (r.ok ? r.hints + ' hint(s), ' + r.stop + '; wanted found: ' +
        (p.ids.filter(function (id) { return r.best[id] !== undefined; }).join(', ') || '-') : r.error));
  });
  return { plan: plan, results: results };
}

function describeMissing(opts, run, id) {
  const replays = run.plan.byId[id].map(function (at) { return run.results[at]; });
  const limited = replays.filter(function (r) { return r.ok && r.stop === 'limit'; }).length;
  return id + ': no example found in ' + replays.length + ' puzzle(s) within ' + opts.maxHints +
    ' hint(s)' + (limited > 0 ? ' (' + limited + ' stopped at the hint limit)' : '');
}

// ---------------------------------------------------------------------------------------------
// The modes
// ---------------------------------------------------------------------------------------------

function check(T, saved, out, ids, outcome, describe) {
  let differ = 0;
  outcome.missing.forEach(function (id) { console.log(describe(id)); });
  const have = ids.filter(function (id) { return outcome.found[id] !== undefined; });
  const fresh = {};
  have.forEach(function (id) { fresh[id] = outcome.found[id].data; });
  const name = path.basename(out);
  T.compare(have, saved, fresh).forEach(function (r) {
    if (r.status === 'match') {
      console.log(r.id + ': matches ' + name);
      return;
    }
    differ++;
    if (r.status === 'new') {
      console.log(r.id + ': has no example in ' + name + ' (a new one)');
      return;
    }
    console.log(r.id + ': ' + r.diffs.length + ' field(s) differ from ' + name);
    r.diffs.slice(0, 8).forEach(function (d) { console.log('  ' + T.diffLine(d)); });
    if (r.diffs.length > 8) console.log('  ... and ' + (r.diffs.length - 8) + ' more');
  });
  const bad = differ + outcome.missing.length;
  console.log(bad === 0 ? name + ' is up to date for the ' + ids.length + ' selected ID(s)' :
    name + ' differs or lacks an example for ' + bad + ' of the ' + ids.length + ' selected ID(s)');
  return bad === 0 ? 0 : 1;
}

function write(SG, T, out, workDir, registry, ids, found) {
  const saved = fs.existsSync(out) ? T.catalogueOf(readText(out)) : SG.helpExamples;
  const fresh = {};
  ids.forEach(function (id) { fresh[id] = found[id].data; });
  const merged = T.mergeCatalogue(registry, saved, ids, fresh);
  if (!merged.ok) {
    console.log('the resulting catalogue is not complete and valid; ' + show(out) + ' is untouched:');
    merged.problems.forEach(function (p) { console.log('  ' + p); });
    return 1;
  }
  const text = T.render(registry, merged.catalogue);
  const back = T.catalogueOf(text);
  const flawed = registry.filter(function (id) {
    return JSON.stringify(back[id]) !== JSON.stringify(merged.catalogue[id]);
  });
  if (flawed.length > 0) {
    throw new Error('the rendered catalogue does not read back the same for ' + flawed.join(', '));
  }
  writeAtomic(out, text, workDir);
  if (readText(out) !== text) throw new Error(show(out) + ' does not hold what was written');
  if (merged.dropped.length > 0) {
    console.log('dropped from the catalogue (not registered): ' + merged.dropped.join(', '));
  }
  console.log('wrote ' + show(out) + ' (' + registry.length + ' examples; ' + ids.length + ' selected: ' +
    ids.join(', ') + '; the others kept)');
  return 0;
}

function main(argv) {
  const started = Date.now();
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    console.log(USAGE);
    return 0;
  }
  if (argv.some(function (arg) { return /^--stage1(=|$)/.test(arg); })) return childMain(argv);

  const SG = loadSources(PLAYER_ROOT);
  runScript(FIXTURE);
  const T = SG.fixtures.helpExampleTools;
  SG.i18n.setLocale('en');
  const opts = T.parseOptions(argv);
  const files = {
    generator: path.resolve(opts.generator === null ? DEFAULT_GENERATOR : opts.generator),
    out: opts.out === null ? CANONICAL : projectFile(T, opts.out, '--out'),
    sources: opts.sources === null ? null : projectFile(T, opts.sources, '--sources'),
    record: opts.recordSources === null ? null : projectFile(T, opts.recordSources, '--record-sources'),
    workDir: opts.workDir === null ? path.join(PLAYER_ROOT, T.DEFAULT_WORK_DIR) :
      projectFile(T, opts.workDir, '--work-dir')
  };
  const registry = SG.techniques.list().map(function (tech) { return tech.id; });
  const ids = T.selectIds(registry, opts.ids);
  const deadline = T.makeDeadline(Date.now, started, T.DEADLINE_MS);
  console.log('selected ' + ids.length + ' technique ID(s); mode ' + (opts.discover ? 'discover + ' : '') +
    opts.mode);

  let saved = null;
  if (opts.mode === 'check') {
    if (!fs.existsSync(files.out)) {
      throw new Error(show(files.out) + ': there is no catalogue to compare with');
    }
    saved = T.catalogueOf(readText(files.out));
  }
  const assigned = sourcesOf(SG, T, opts, ids, files, deadline);
  const run = replay(SG, T, opts, ids, assigned, deadline);
  const outcome = T.winners(ids, run.plan, run.results);
  const describe = function (id) { return describeMissing(opts, run, id); };

  if (opts.mode === 'check') {
    return check(T, saved, files.out, ids, outcome, describe);
  }
  if (outcome.missing.length > 0) {
    outcome.missing.forEach(function (id) { console.log(describe(id)); });
    console.log('no example for ' + outcome.missing.length + ' selected ID(s); nothing was written');
    return 1;
  }
  deadline.check('before writing');
  if (opts.mode === 'record') {
    writeAtomic(files.record, T.sourcesText(T.recordedSources(ids, outcome.found)), files.workDir);
    console.log('recorded ' + ids.length + ' source(s) into ' + show(files.record));
    return 0;
  }
  return write(SG, T, files.out, files.workDir, registry, ids, outcome.found);
}

/** An error text without the machine path of the repository (a log shows relative paths only). */
function scrub(text) {
  return String(text).split(REPO).join('.').split(REPO.split(path.sep).join('/')).join('.');
}

function report(err) {
  if (err && err.usage) {
    console.error(scrub(err.message) + '\n\n' + USAGE);
    return 1;
  }
  if (err && err.incomplete) {
    console.error(scrub(err.message));
    return EXIT_INCOMPLETE;
  }
  console.error(scrub(err && err.name === 'Error' ? err.message : err && err.stack ? err.stack : err));
  return 1;
}

module.exports = { main: main, USAGE: USAGE };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.exitCode = report(err);
  }
}
