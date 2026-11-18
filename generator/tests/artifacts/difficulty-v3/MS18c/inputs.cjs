'use strict';

/*
 * MS18c Stage 1 task-owned, READ-ONLY inputs of the preflight: the source / tool / attempt-policy / Node /
 * machine identities by the qualifier's own recipes (tests/qualify.js: `sourceFiles`, `sourcesHash`,
 * `qualifierHash`, `attemptPolicy`, `machineInfo`, re-implemented here byte for byte; the qualifier is not
 * edited and not run), the board sizes read from the registry declarations, and read-only Git facts.
 *
 * What it does NOT do: it never calls a generator, a solver, a uniqueness checker or `def.build`, it never
 * runs the qualifier or its workers, never writes (the only Git commands are the read-only ones of READONLY)
 * and takes no CPU sample. Loading the declarations is `vm.runInThisContext` of the engine files, as the
 * qualifier does, and nothing is called but the registry's static size (`cellCountOf`, "known without
 * building a model: no seed, no random draw") and the pure default-attempts rule.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const childProcess = require('child_process');
const rules = require('./rules.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const GEN = path.join(REPO, 'generator');
const QUALIFY_FILE = path.join(GEN, 'tests', 'qualify.js');
const RECORDS_FILE = path.join(GEN, 'tests', 'fixtures', 'qualification-records.js');
const RUNNER_FILE = path.join(GEN, 'tests', 'node-runner.js');
const MANIFEST = 'tasks/difficulty-v3/MS18c-gq-approved-ceilings.json';
// Stage 1's own outputs: the only paths allowed to differ from HEAD.
const OWN_PATHS = ['docs/difficulty-v3/evidence/MS18c/', 'generator/tests/artifacts/difficulty-v3/MS18c/'];
// The commit Stage 1 was dispatched on (a pack-only commit); HEAD may have moved on by pack-only commits.
const DISPATCH_BASE = '3d166c79cb8fcb07822624415ab90bbb1605a28d';
const PACK_FILES = ['tasks/difficulty-v3/MS18c-qualify-and-publish-offers.md',
  'tasks/difficulty-v3/check-list.md'];

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const rel = (file) => path.relative(REPO, file).replace(/\\/g, '/');

// ---------------------------------------------------------------------------------------------------------
// Read-only Git
// ---------------------------------------------------------------------------------------------------------

const COMMIT = /^(HEAD|[0-9a-f]{7,40})$/;

/** The only Git invocations the preflight makes: no write, no index change, no object written. */
function readOnlyGit(args) {
  const [cmd, ...more] = args;
  if (cmd === 'rev-parse') {
    return more.every((a) => /^(--short|--verify|--quiet|--abbrev-ref|HEAD~1|(HEAD|[0-9a-f]{7,40})(:.+)?)$/
      .test(a));
  }
  if (cmd === 'status') return more.length === 1 && more[0] === '--porcelain';
  if (cmd === 'hash-object') return more.length === 1 && !more[0].startsWith('-');
  if (cmd === 'diff') {
    const quiet = more.length === 4 && more[0] === '--quiet' && more[1] === 'HEAD' && more[2] === '--';
    const names = more.length === 3 && more[0] === '--name-only' && COMMIT.test(more[1]) &&
      COMMIT.test(more[2]);
    return quiet || names;
  }
  if (cmd === 'config') return more.length === 2 && more[0] === '--get';
  return false;
}

function git(args) {
  if (!readOnlyGit(args)) throw new Error('refused: not a read-only Git command: git ' + args.join(' '));
  // --no-optional-locks: status and diff must not refresh (rewrite) the index.
  const run = childProcess.spawnSync('git', ['--no-optional-locks'].concat(args), { cwd: REPO,
    encoding: 'utf8', windowsHide: true, timeout: 30000 });
  const text = (x) => String(x || '').trim();
  return { status: run.status, stdout: text(run.stdout), stderr: text(run.stderr) };
}

// ---------------------------------------------------------------------------------------------------------
// The identities, by the qualifier's recipes
// ---------------------------------------------------------------------------------------------------------

/** The engine's source files in the order of SOURCE_FILES of tests/node-runner.js (UI/worker skipped). */
function sourceFileList() {
  const runner = fs.readFileSync(RUNNER_FILE, 'utf8');
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (!match) throw new Error('cannot find SOURCE_FILES in tests/node-runner.js');
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1))
    .filter((r) => !/^js\/(ui|worker)\//.test(r) && fs.existsSync(path.join(GEN, r)));
}

/** POLICY_FILES as qualify.js declares them (parsed from its text, so that a change cannot go unseen). */
function policyFileList() {
  const match = /const POLICY_FILES = \[([\s\S]*?)\];/.exec(fs.readFileSync(QUALIFY_FILE, 'utf8'));
  if (!match) throw new Error('cannot find POLICY_FILES in tests/qualify.js');
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
}

/** `engine.sources`: the first 16 hex digits of the SHA-256 over the source files' bytes, no separator. */
function sourceIdentity() {
  const files = sourceFileList();
  const hash = crypto.createHash('sha256');
  const list = files.map((r) => {
    const bytes = fs.readFileSync(path.join(GEN, r));
    hash.update(bytes);
    return { file: 'generator/' + r, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return { engineSources: hash.digest('hex').slice(0, 16), fileCount: files.length, files: list };
}

/** `qualifierHash`: the SHA-256 over qualify.js, a NUL byte, the records helper and a NUL byte. */
function toolIdentity() {
  const hash = crypto.createHash('sha256');
  const list = [QUALIFY_FILE, RECORDS_FILE].map((file) => {
    const bytes = fs.readFileSync(file);
    hash.update(bytes);
    hash.update('\0');
    return { file: rel(file), bytes: bytes.length, sha256: sha256(bytes) };
  });
  return { qualifierHash: hash.digest('hex'), files: list };
}

/** `attemptPolicy` as the qualifier records it, plus a digest of its canonical text (this task's own). */
function attemptPolicyIdentity() {
  const sources = {};
  const list = policyFileList().map((r) => {
    const bytes = fs.readFileSync(path.join(GEN, r));
    sources[r] = sha256(bytes);
    return { file: 'generator/' + r, bytes: bytes.length, sha256: sources[r] };
  });
  const object = { function: 'SG.digger.defaultMaxAttempts', explicitMaxAttempts: false, sources: sources };
  return { object: object, digest: sha256(rules.canon(object)), files: list };
}

function nodeIdentity() {
  return {
    version: process.version, execPath: process.execPath, arch: process.arch, v8: process.versions.v8,
    modules: process.versions.modules
  };
}

/** `machineInfo(jobs)` of the qualifier, plus the OS build string and a digest of the canonical record. */
function machineIdentity(jobs) {
  const cpus = os.cpus();
  const object = {
    cpu: cpus.length > 0 ? cpus[0].model.trim() : 'unknown', logicalProcessors: cpus.length,
    memoryGb: Math.round(os.totalmem() / 1073741824), platform: os.platform() + ' ' + os.release(),
    node: process.version, jobs: jobs
  };
  return { object: object, digest: sha256(rules.canon(object)), osVersion: os.version(), arch: os.arch(),
    totalMemoryBytes: os.totalmem() };
}

// ---------------------------------------------------------------------------------------------------------
// Declarations and cross-checks
// ---------------------------------------------------------------------------------------------------------

/** The pure records helper, run once in a context of its own as qualify.js does (nothing is called on it
 * but constants, `budgetOf` and `canon`). */
function recordsConstants() {
  const sandbox = vm.createContext({});
  vm.runInContext(fs.readFileSync(RECORDS_FILE, 'utf8').replace(/^\uFEFF/, ''), sandbox,
    { filename: RECORDS_FILE });
  return vm.runInContext('SG.fixtures.qualificationRecords', sandbox);
}

/** Loads the engine files as qualify.js `loadSources` does and reads the static metadata (no generation). */
function loadDeclarations() {
  const started = process.hrtime.bigint();
  sourceFileList().forEach((r) => {
    const abs = path.join(GEN, r);
    vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  });
  const SG = globalThis.SG;
  const defs = SG.variants.list();
  const boards = {};
  const order = [];
  defs.forEach((def) => {
    order.push(def.id);
    boards[def.id] = {
      cellCount: SG.variants.cellCountOf(def), digits: def.digits,
      declaredCellCount: def.cellCount === undefined ? null : def.cellCount,
      defaultAttemptsEngine: SG.digger.defaultMaxAttempts(SG.variants.cellCountOf(def))
    };
  });
  return {
    order: order, boards: boards, levels: SG.difficulty.LEVELS.slice(),
    ratingVersion: SG.difficulty.RATING_VERSION,
    loadMs: Number(process.hrtime.bigint() - started) / 1e6,
    defaultAttempts: (n) => SG.digger.defaultMaxAttempts(n)
  };
}

/** The cross-checks between the rule module, the records helper and the declarations; a list of problems. */
function crossChecks(decl, lib) {
  const problems = [];
  const eq = (a, b) => rules.canon(a) === rules.canon(b);
  if (!eq(Array.from(lib.VARIANTS), Array.from(rules.VARIANTS))) problems.push('records VARIANTS differ');
  if (!eq(Array.from(lib.LEVELS), Array.from(rules.LEVELS))) problems.push('records LEVELS differ');
  if (!eq(decl.order, Array.from(rules.VARIANTS))) problems.push('registry order is not the 15 variants');
  if (!eq(decl.levels, Array.from(rules.LEVELS))) problems.push('SG.difficulty.LEVELS is not the 9 levels');
  ['seedBase', 'firstSeeds', 'moreSeeds', 'guardMs', 'jobs'].forEach((name) => {
    if (lib.PROTOCOL[name] !== rules.PROTOCOL[name]) {
      problems.push('PROTOCOL.' + name + ' is ' + lib.PROTOCOL[name] + ', not ' + rules.PROTOCOL[name]);
    }
  });
  const sizes = [1, 16, 36, 37, 81, 82, 144, 145, 256, 369].concat(
    Object.keys(decl.boards).map((id) => decl.boards[id].cellCount));
  sizes.forEach((n) => {
    if (lib.budgetOf(n) !== rules.budgetSecondsOf(n) * 1000) problems.push('budgetOf(' + n + ') differs');
    if (decl.defaultAttempts(n) !== rules.defaultAttemptsOf(n)) {
      problems.push('defaultMaxAttempts(' + n + ') differs');
    }
  });
  const sample = { function: 'x', n: [1, { b: 2, a: 1 }], z: null };
  if (lib.canon(sample) !== rules.canon(sample)) problems.push('canon of the records helper differs');
  return problems;
}

// ---------------------------------------------------------------------------------------------------------
// Git facts and the manifest-check mechanics
// ---------------------------------------------------------------------------------------------------------

/**
 * The commits and the pack bytes this preflight relied on: HEAD (and its parent), the dispatch base, the
 * files HEAD changed since it (a pack-only commit has only pack files), and for the brief and the check-list
 * the blob at each commit plus the working tree's blob and SHA-256 (CRLF bytes).
 */
function packFacts() {
  const head = git(['rev-parse', 'HEAD']).stdout;
  const blob = (commit, file) => git(['rev-parse', commit + ':' + file]).stdout;
  return {
    dispatchBase: DISPATCH_BASE, head: head, headParent: git(['rev-parse', 'HEAD~1']).stdout,
    headIsDispatchBase: head === DISPATCH_BASE,
    changedSinceDispatchBase: git(['diff', '--name-only', DISPATCH_BASE, 'HEAD']).stdout.split(/\r?\n/)
      .filter(Boolean),
    files: PACK_FILES.map((file) => {
      const bytes = fs.readFileSync(path.join(REPO, file));
      return {
        file: file, blobAtDispatchBase: blob(DISPATCH_BASE, file), blobAtHead: blob('HEAD', file),
        workingTreeBlob: git(['hash-object', file]).stdout, workingTreeSha256: sha256(bytes),
        workingTreeBytes: bytes.length
      };
    })
  };
}

function gitFacts() {
  const full = git(['rev-parse', 'HEAD']).stdout;
  const short = git(['rev-parse', '--short', 'HEAD']).stdout;
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout;
  const entries = git(['status', '--porcelain']).stdout.split(/\r?\n/).filter(Boolean);
  const own = (line) => OWN_PATHS.some((p) => line.slice(3).replace(/"/g, '').startsWith(p));
  return {
    head: full, headShort: short, branch: branch, entriesOutsideStage1Paths: entries.filter((l) => !own(l)),
    autocrlf: git(['config', '--get', 'core.autocrlf']).stdout,
    safecrlf: git(['config', '--get', 'core.safecrlf']).stdout
  };
}

/**
 * The mechanics of the Stage 3 manifest check, shown on this tree with read-only commands: the approved file
 * is not at HEAD (and not in the working tree); `git diff --quiet HEAD -- <it>` succeeds all the same; and
 * for the two tracked qualifier files `git hash-object` of the working-tree bytes equals
 * `git rev-parse HEAD:<path>` under the repository's CRLF settings.
 */
function manifestMechanics() {
  const atHead = git(['rev-parse', '--verify', '--quiet', 'HEAD:' + MANIFEST]);
  const diff = git(['diff', '--quiet', 'HEAD', '--', MANIFEST]);
  const probes = ['generator/tests/qualify.js', 'generator/tests/fixtures/qualification-records.js']
    .map((file) => {
      const blob = git(['rev-parse', 'HEAD:' + file]).stdout;
      const hashed = git(['hash-object', file]);
      return { file: file, blobAtHead: blob, hashObject: hashed.stdout, hashObjectExit: hashed.status,
        equal: hashed.status === 0 && hashed.stdout === blob };
    });
  return {
    manifestPath: MANIFEST, existsAtHead: atHead.status === 0,
    existsInWorkingTree: fs.existsSync(path.join(REPO, MANIFEST)),
    diffQuietExitForThatPath: diff.status, probes: probes,
    allProbesEqual: probes.every((p) => p.equal)
  };
}

module.exports = {
  REPO, GEN, MANIFEST, OWN_PATHS, sha256, git, readOnlyGit, sourceFileList, policyFileList, sourceIdentity,
  toolIdentity, attemptPolicyIdentity, nodeIdentity, machineIdentity, recordsConstants, loadDeclarations,
  crossChecks, gitFacts, packFacts, manifestMechanics
};
