'use strict';

/*
 * Evidence tooling of the two Node test runners (generator/tests/node-runner.js and
 * player/tests/node-runner.js). Node only, built-in modules only, and not an application script: no source
 * list names it. It knows neither application: the runner injects the repository root, its app name and the
 * files and folders its source fingerprint covers.
 *
 *   --list-tests=<file.json>  register the selected suites, write the inventory (SG.test.list), run no test
 *   --exact=<full name>       select the tests whose full name equals it (not a substring; not --filter)
 *   --results=<file.json>     run, then write the result of every selected test (also after a failure)
 *
 * The file is a project-relative .json path (resolved from the working folder) inside the repository, in no
 * fingerprinted folder, and it must not exist: an evidence file is never overwritten. It is written whole
 * (text, CRLF, one line per row) to `<file>.partial` and then put in place, so a killed process leaves no
 * result.
 *
 * The inventory is { schema, app, node, sourceHash, files: [{ path, hash }], timeFactor, selection,
 * registrationMs, complete, tests: [{ suite, ordinal, fullName, kind, skipped, timeoutMs }],
 * registrationErrors, argv, machine }; `complete` is false when a describe block threw or a file failed to
 * load. The result is { schema, app, node, sourceHash, timeFactor, selection, complete, sourceStable, wallMs,
 * results: { total, passed, failed, skipped, bailed, ms, tests, suites, benches }, registrationErrors, argv,
 * machine }; `complete` is true only when every selected test ran (no bail, no registration error) on sources
 * that did not change during the run. Neither says that a test passed: read `failed` and the rows.
 *
 * The sourceHash is the SHA-256 of `<path>\0<hash>\n` over the sorted, repository-relative paths of the
 * fingerprint: for every file the SHA-256 of its text with LF line ends and no BOM (bytes when it holds a
 * NUL). The set does not depend on the selection (all shards of one app on one tree share it), except that
 * the Generator's manual suites count only when a manual suite is selected. Folders named artifacts,
 * node_modules and .git are not entered.
 */
const SCHEMA = 1;
const SKIPPED_DIRS = ['artifacts', 'node_modules', '.git'];
const OPTION_KEYS = { 'list-tests': 'listTests', results: 'results', exact: 'exact' };

/**
 * Takes --list-tests, --results or --exact at argv[i] into `opts` (listTests, results, exact; null if absent).
 * @returns {number} the index of the last element consumed, or -1 when argv[i] is another option
 */
function parseOption(argv, i, opts) {
  const m = /^--(list-tests|results|exact)(?:=(.*))?$/.exec(argv[i]);
  if (!m) return -1;
  let value = m[2];
  let last = i;
  if (value === undefined) {
    value = argv[i + 1];
    last = i + 1;
    if (value !== undefined && value.startsWith('--')) value = undefined;
  }
  if (value === undefined || value === '') throw new Error('Missing value for --' + m[1]);
  const key = OPTION_KEYS[m[1]];
  if (opts[key] !== null && opts[key] !== undefined) throw new Error('--' + m[1] + ' is given twice');
  opts[key] = value;
  return last;
}

/** The combinations that are refused: --list-tests with --results, and --exact with --filter. */
function checkOptions(opts) {
  if (opts.listTests && opts.results) throw new Error('--list-tests and --results are mutually exclusive');
  if (opts.exact && opts.filter) throw new Error('--exact and --filter are mutually exclusive');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRows(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isObject);
}

/** One JSON line per field, and one per element of an array of objects (in the object of a field, too). */
function emit(lines, level, key, value, comma) {
  const pad = '  '.repeat(level);
  const tail = comma ? ',' : '';
  const head = JSON.stringify(key) + ': ';
  if (isObject(value) && level < 2 && Object.keys(value).some((k) => isRows(value[k]))) {
    lines.push(pad + head + '{');
    const keys = Object.keys(value);
    keys.forEach((k, i) => emit(lines, level + 1, k, value[k], i < keys.length - 1));
    lines.push(pad + '}' + tail);
  } else if (isRows(value)) {
    lines.push(pad + head + '[');
    value.forEach((item, i) => {
      lines.push(pad + '  ' + JSON.stringify(item) + (i < value.length - 1 ? ',' : ''));
    });
    lines.push(pad + ']' + tail);
  } else {
    lines.push(pad + head + JSON.stringify(value === undefined ? null : value) + tail);
  }
}

/** The text of a document: UTF-8 without BOM, CRLF, a final line end, no trailing space. */
function render(document) {
  const lines = ['{'];
  const keys = Object.keys(document);
  keys.forEach((key, i) => emit(lines, 1, key, document[key], i < keys.length - 1));
  lines.push('}');
  return lines.join('\r\n') + '\r\n';
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * @param {Object} env
 * @param {string} env.app        'generator' or 'player'
 * @param {string} env.repoRoot   the repository root (the folder of core/, generator/ and player/)
 * @param {Object} env.inputs     { files, trees, manualTrees }: repository-relative paths; a tree is a folder
 *                                (string) or { dir, recursive: false } for its direct files only
 * @param {string} [env.cwd]      the folder the output paths are relative to (default: the working folder)
 * @param {Object} [env.fs] [env.path] [env.crypto] [env.os] [env.node] [env.out] [env.err]  for tests
 */
function create(env) {
  const fs = env.fs || require('fs');
  const path = env.path || require('path');
  const crypto = env.crypto || require('crypto');
  const os = env.os || require('os');
  const out = env.out || ((text) => console.log(text));
  const err = env.err || ((text) => console.error(text));
  const repoRoot = path.resolve(env.repoRoot);
  const cwd = path.resolve(env.cwd || process.cwd());
  const inputs = env.inputs || {};
  const app = env.app;
  const node = env.node || process.version;

  const posix = (rel) => rel.split(path.sep).join('/');
  const round = (ms) => Math.round(ms * 10) / 10;
  // A result row or suite summary with its time to the microsecond (the keys keep their order).
  const rounded = (row) => Object.assign({}, row, { ms: Math.round(row.ms * 1000) / 1000 });

  function isInside(abs, folder) {
    const rel = path.relative(folder, abs);
    return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
  }

  function treeOf(tree) {
    return typeof tree === 'string' ? { dir: tree, recursive: true } :
      { dir: tree.dir, recursive: tree.recursive !== false };
  }

  function walk(abs, recursive, found) {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      throw new Error(posix(path.relative(repoRoot, abs)) + ': a fingerprint folder is missing');
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const child = path.join(abs, entry.name);
      if (entry.isDirectory()) {
        if (recursive && !SKIPPED_DIRS.includes(entry.name)) walk(child, true, found);
      } else if (entry.isFile()) {
        found.add(posix(path.relative(repoRoot, child)));
      } else {
        throw new Error(posix(path.relative(repoRoot, child)) + ': neither a file nor a folder');
      }
    }
  }

  /** The repository-relative paths of the fingerprint, sorted, without repeats. */
  function collect(manual) {
    const found = new Set();
    for (const rel of inputs.files || []) {
      const abs = path.resolve(repoRoot, rel);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        throw new Error(rel + ': a fingerprint file is missing');
      }
      found.add(posix(path.relative(repoRoot, abs)));
    }
    (inputs.trees || []).concat(manual ? inputs.manualTrees || [] : []).forEach((tree) => {
      const spec = treeOf(tree);
      walk(path.resolve(repoRoot, spec.dir), spec.recursive, found);
    });
    return Array.from(found).sort(compare);
  }

  function hashOfFile(abs) {
    const bytes = fs.readFileSync(abs);
    const hash = crypto.createHash('sha256');
    if (bytes.includes(0)) hash.update(bytes);
    else hash.update(bytes.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
    return hash.digest('hex');
  }

  /** @returns {{sourceHash: string, files: {path: string, hash: string}[]}} the hashed files, sorted */
  function fingerprint(options) {
    const files = collect(Boolean(options && options.manual)).map((rel) => ({
      path: rel, hash: hashOfFile(path.resolve(repoRoot, rel))
    }));
    const all = crypto.createHash('sha256');
    files.forEach((f) => all.update(f.path + '\0' + f.hash + '\n'));
    return { sourceHash: all.digest('hex'), files: files };
  }

  function inFingerprint(abs) {
    const files = (inputs.files || []).map((rel) => path.resolve(repoRoot, rel));
    if (files.includes(abs)) return true;
    return (inputs.trees || []).concat(inputs.manualTrees || []).some((tree) => {
      const spec = treeOf(tree);
      const folder = path.resolve(repoRoot, spec.dir);
      if (!isInside(abs, folder)) return false;
      const parts = path.relative(folder, abs).split(path.sep);
      if (!spec.recursive) return parts.length === 1;
      return !parts.slice(0, -1).some((part) => SKIPPED_DIRS.includes(part));
    });
  }

  /**
   * Checks the value of --list-tests or --results before anything runs.
   * @returns {{abs: string, shown: string}} the absolute path and the repository-relative one
   */
  function outputTarget(option, value) {
    const refuse = (reason) => new Error(option + '=' + value + ': ' + reason);
    if (typeof value !== 'string' || value === '') throw new Error('Missing value for ' + option);
    if (path.isAbsolute(value) || path.parse(value).root !== '') {
      throw refuse('give a project-relative path, not an absolute one');
    }
    if (path.extname(value) !== '.json') throw refuse('the file needs the extension .json');
    const abs = path.resolve(cwd, value);
    if (!isInside(abs, repoRoot)) throw refuse('the path must stay inside the repository');
    let existing = abs;
    while (!fs.existsSync(existing) && path.dirname(existing) !== existing) existing = path.dirname(existing);
    const realRoot = fs.realpathSync(repoRoot);
    const real = fs.realpathSync(existing);
    if (real !== realRoot && !isInside(real, realRoot)) {
      throw refuse('the path leaves the repository through a link');
    }
    if (inFingerprint(abs)) {
      throw refuse('the file would be part of the fingerprinted sources: use an evidence folder');
    }
    if (fs.existsSync(abs) || fs.existsSync(abs + '.partial')) {
      throw refuse('the file exists already (an evidence file is never overwritten)');
    }
    return { abs: abs, shown: posix(path.relative(repoRoot, abs)) };
  }

  /** The repository's own absolute path, if a message or a stack carries it, made `<repo>`. */
  function scrub(text) {
    return [repoRoot, repoRoot.replace(/\\/g, '/'), repoRoot.replace(/\\/g, '\\\\')]
      .reduce((all, root) => all.split(root).join('<repo>'), text);
  }

  /** Writes the text whole to `<file>.partial`, then puts it in place; an existing file is refused. */
  function write(target, text) {
    const partial = target.abs + '.partial';
    fs.mkdirSync(path.dirname(target.abs), { recursive: true });
    let fd;
    try {
      fd = fs.openSync(partial, 'wx');
      fs.writeFileSync(fd, text, 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      const exists = () => new Error(target.shown +
        ': the file exists already (an evidence file is never overwritten)');
      try {
        fs.linkSync(partial, target.abs);
      } catch (linkError) {
        if (linkError.code === 'EEXIST') throw exists();
        if (fs.existsSync(target.abs)) throw exists();
        fs.renameSync(partial, target.abs);
      }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
      fs.rmSync(partial, { force: true });
    }
  }

  function machine() {
    const cpus = os.cpus();
    return {
      platform: os.platform(), arch: os.arch(), cpu: cpus.length > 0 ? String(cpus[0].model).trim() : null,
      cores: cpus.length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30))
    };
  }

  function selectionRecord(selection, count) {
    return {
      set: selection.set, suites: selection.suites.slice(), filter: selection.filter || null,
      exact: selection.exact || null, count: count
    };
  }

  /**
   * @param {Object} ctx { SG, selection: { set, suites, filter, exact }, identity (fingerprint),
   *   registrationMs, argv }; registration has happened, nothing has run
   */
  function inventory(ctx) {
    const listing = ctx.SG.test.list({
      suite: ctx.selection.suites, filter: ctx.selection.filter, exact: ctx.selection.exact
    });
    return {
      schema: SCHEMA, app: app, node: node, sourceHash: ctx.identity.sourceHash, files: ctx.identity.files,
      timeFactor: ctx.SG.test.TIME_FACTOR, selection: selectionRecord(ctx.selection, listing.tests.length),
      registrationMs: round(ctx.registrationMs), complete: listing.registrationErrors.length === 0,
      tests: listing.tests, registrationErrors: listing.registrationErrors, argv: ctx.argv.slice(),
      machine: machine()
    };
  }

  /**
   * @param {Object} ctx { SG, selection, identity (before the run), identityAfter (after it), expected (the
   *   selected count, from SG.test.list), registrationErrors, results (SG.testResults), wallMs, argv }
   */
  function resultsDocument(ctx) {
    const r = ctx.results;
    const sourceStable = ctx.identityAfter.sourceHash === ctx.identity.sourceHash;
    return {
      schema: SCHEMA, app: app, node: node, sourceHash: ctx.identity.sourceHash,
      timeFactor: ctx.SG.test.TIME_FACTOR, selection: selectionRecord(ctx.selection, ctx.expected),
      complete: !r.bailed && r.total === ctx.expected && ctx.registrationErrors.length === 0 && sourceStable,
      sourceStable: sourceStable, wallMs: round(ctx.wallMs),
      results: {
        total: r.total, passed: r.passed, failed: r.failed, skipped: r.skipped, bailed: r.bailed,
        ms: round(r.ms), tests: r.tests.map(rounded), suites: r.suites.map(rounded), benches: r.benches
      },
      registrationErrors: ctx.registrationErrors, argv: ctx.argv.slice(), machine: machine()
    };
  }

  function showRegistrationErrors(errors) {
    errors.forEach((e) => {
      err('Registration error (' + e.type + '): ' + e.fullName + ': ' + e.name + ': ' + e.message);
    });
  }

  /**
   * --list-tests: writes the inventory of the registered selection; no test ran.
   * @returns {number} the exit code: 0 for a complete inventory, 1 for no selected test, a registration error
   *   (the inventory is written, marked incomplete) or a failed write
   */
  function listCommand(ctx) {
    const document = inventory(ctx);
    showRegistrationErrors(document.registrationErrors);
    if (document.tests.length === 0) {
      err('No tests were selected; no inventory was written.');
      return 1;
    }
    try {
      write(ctx.target, scrub(render(document)));
    } catch (error) {
      err('The inventory could not be written: ' + (error && error.message ? error.message : String(error)));
      return 1;
    }
    const rows = document.tests;
    const suites = new Set(rows.map((t) => t.suite)).size;
    const skipped = rows.filter((t) => t.skipped).length;
    const benches = rows.filter((t) => t.kind === 'bench').length;
    out('Inventory: ' + rows.length + ' tests in ' + suites + ' suites (' + skipped + ' skipped, ' + benches +
      ' benchmarks), registration ' + (document.registrationMs / 1000).toFixed(1) + ' s');
    out('Written: ' + ctx.target.shown + (document.complete ? '' : ' (INCOMPLETE: registration errors)'));
    return document.complete ? 0 : 1;
  }

  /**
   * --results: writes the result of a finished run (also after failures or a bail); the caller does not
   * call it for a run of no test.
   * @returns {number} 0, or 1 when the file could not be written
   */
  function resultsCommand(ctx) {
    const document = resultsDocument(ctx);
    try {
      write(ctx.target, scrub(render(document)));
    } catch (error) {
      err('The results could not be written: ' + (error && error.message ? error.message : String(error)));
      return 1;
    }
    out('Results: ' + ctx.target.shown + (document.complete ? '' :
      ' (INCOMPLETE: not every selected test ran, or the sources changed, or registration failed)'));
    return 0;
  }

  return {
    fingerprint: fingerprint, outputTarget: outputTarget, write: write, scrub: scrub, inventory: inventory,
    resultsDocument: resultsDocument, listCommand: listCommand, resultsCommand: resultsCommand
  };
}

module.exports = {
  SCHEMA: SCHEMA, parseOption: parseOption, checkOptions: checkOptions, render: render, create: create
};
