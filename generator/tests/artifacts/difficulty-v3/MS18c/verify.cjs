'use strict';

/*
 * MS18c Stage 3 task-owned verification of the FROZEN inputs against the committed manifest, run
 * before every admission (after the lock, before the sampling; never during a payload). `gather`
 * reads the facts of this tree with the qualifier's own recipes (the Stage 1 `inputs.cjs` functions,
 * unchanged) and read-only Git; `compare` is PURE and returns every difference, so that tests need no
 * repository. Missing input files fail closed (the qualifier's legacy loader would skip them). HEAD
 * must be the base commit or pack-only descendants, with every intervening commit checked, not only
 * their net diff.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/verify.cjs --cell=<variant/level>  (JSON out)
 */
const fs = require('fs');
const path = require('path');
const rules = require('./rules.cjs');
const util = require('./util.cjs');
const gitro = require('./gitro.cjs');
const manifestLib = require('./manifest.cjs');
const inputs = require('./inputs.cjs');

const DECL_START = 'const SOURCE_FILES = [';
const PACK_ROOTS = ['tasks/difficulty-v3/', 'docs/difficulty-v3/'];

/** The raw bytes of the SOURCE_FILES declaration of node-runner.js (from the opening to `];`, inclusive). */
function selectorOf(bytes) {
  const text = bytes.toString('latin1');
  const from = text.indexOf(DECL_START);
  if (from === -1) return null;
  const to = text.indexOf('];', from);
  if (to === -1) return null;
  const raw = bytes.subarray(from, to + 2);
  const entries = (raw.toString('latin1').match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  return { bytes: raw.length, sha256: util.sha256(raw), entries: entries };
}

/** HEAD is the base or a chain of pack-only commits on top of it (every commit checked). */
function ancestry(git, base, packRoots) {
  const head = git(['rev-parse', 'HEAD']).stdout;
  const problems = [];
  if (head === base) return { head: head, commits: [], problems: problems };
  if (git(['merge-base', '--is-ancestor', base, 'HEAD']).status !== 0) {
    problems.push('the base ' + base + ' is not an ancestor of HEAD ' + head);
    return { head: head, commits: [], problems: problems };
  }
  const commits = git(['rev-list', base + '..HEAD']).stdout.split(/\r?\n/).filter(Boolean).reverse();
  commits.forEach((c) => {
    const parents = git(['rev-list', '--parents', '-n', '1', c]).stdout.split(' ').length - 1;
    if (parents !== 1) problems.push('commit ' + c + ' has ' + parents + ' parents (no merges allowed)');
    const names = git(['diff-tree', '--no-commit-id', '--name-only', '-r', c]).stdout;
    const files = names.split(/\r?\n/).filter(Boolean);
    files.filter((f) => !packRoots.some((root) => f.indexOf(root) === 0)).forEach((f) => {
      problems.push('commit ' + c + ' changed ' + f + ', which is not a pack file');
    });
  });
  return { head: head, commits: commits, problems: problems };
}

/** The facts of this tree, by the qualifier's recipes. */
function gather(manifest, deps) {
  const d = deps || {};
  const git = d.git || gitro.createGit(util.REPO);
  const nodeRunner = fs.readFileSync(path.join(util.GENERATOR, 'tests', 'node-runner.js'));
  const decl = inputs.loadDeclarations();
  const boards = {};
  decl.order.forEach((id) => { boards[id] = { cellCount: decl.boards[id].cellCount }; });
  const policy = inputs.attemptPolicyIdentity();
  return {
    ancestry: ancestry(git, manifest.base, PACK_ROOTS),
    selector: selectorOf(nodeRunner),
    source: inputs.sourceIdentity(),
    tool: inputs.toolIdentity(),
    policy: { digest: policy.digest, object: policy.object, files: policy.files,
      listed: inputs.policyFileList() },
    node: inputs.nodeIdentity(),
    machine: inputs.machineIdentity(rules.PROTOCOL.jobs),
    gitConfig: { autocrlf: git(['config', '--get', 'core.autocrlf']).stdout,
      safecrlf: git(['config', '--get', 'core.safecrlf']).stdout },
    boards: boards, ratingVersion: decl.ratingVersion,
    preflight: manifest.preflight.files.map((f) => {
      const file = path.join(util.REPO, manifest.preflight.directory, f.file);
      return { file: f.file, sha256: fs.existsSync(file) ? util.sha256(fs.readFileSync(file)) : null };
    })
  };
}

/** Every difference between the facts and the manifest (empty: the frozen inputs are the approved ones). */
function compare(manifest, facts) {
  const problems = [];
  const eq = (label, got, want) => {
    if (rules.canon(got) !== rules.canon(want)) {
      problems.push(label + ' differs: ' + JSON.stringify(got).slice(0, 70) + ' vs approved ' +
        JSON.stringify(want).slice(0, 70));
    }
  };
  facts.ancestry.problems.forEach((p) => problems.push('ancestry: ' + p));
  const id = manifest.identities;
  const sel = id.sourceSelector;
  if (!facts.selector) {
    problems.push('the SOURCE_FILES declaration was not found');
  } else {
    eq('SOURCE_FILES declaration bytes', facts.selector.bytes, sel.bytes);
    eq('SOURCE_FILES declaration SHA-256', facts.selector.sha256, sel.sha256);
    eq('SOURCE_FILES entries', facts.selector.entries, sel.entries);
  }
  eq('engine.sources', facts.source.engineSources, id.source.engineSources);
  eq('source file count', facts.source.fileCount, id.source.fileCount);
  eq('source files', facts.source.files.map((f) => [f.file, f.bytes, f.sha256]),
    id.source.files.map((f) => [f.file.replace('generator/../', 'generator/../'), f.bytes, f.sha256]));
  eq('qualifierHash', facts.tool.qualifierHash, id.tool.qualifierHash);
  eq('tool files', facts.tool.files.map((f) => [f.file, f.bytes, f.sha256]),
    id.tool.files.map((f) => [f.file, f.bytes, f.sha256]));
  eq('attempt-policy digest', facts.policy.digest, id.attemptPolicy.digest);
  eq('attempt-policy object', facts.policy.object, id.attemptPolicy.object);
  eq('attempt-policy files', facts.policy.files.map((f) => [f.file, f.bytes, f.sha256]),
    id.attemptPolicy.files.map((f) => [f.file, f.bytes, f.sha256]));
  eq('POLICY_FILES of qualify.js', facts.policy.listed, Object.keys(id.attemptPolicy.object.sources));
  eq('Node version', facts.node.version, id.node.version);
  eq('Node executable', facts.node.execPath, id.node.execPath);
  eq('Node architecture', facts.node.arch, id.node.arch);
  eq('Node V8', facts.node.v8, id.node.v8);
  eq('Node modules', facts.node.modules, id.node.modules);
  eq('machine object', facts.machine.object, id.machine.object);
  eq('machine digest', facts.machine.digest, id.machine.digest);
  const lineEndings = { autocrlf: id.gitLineEndings.autocrlf, safecrlf: id.gitLineEndings.safecrlf };
  eq('git line endings', facts.gitConfig, lineEndings);
  manifest.rows.forEach((row) => {
    const board = facts.boards[row.key.split('/')[0]];
    if (!board || board.cellCount !== row.cellCount) {
      problems.push('row ' + row.key + ': the registry size ' + (board ? board.cellCount : 'unknown') +
        ' is not the manifest\'s ' + row.cellCount);
    }
  });
  const approved = manifest.preflight.files.map((f) => ({ file: f.file, sha256: f.sha256 }));
  eq('preflight files', facts.preflight, approved);
  return problems;
}

/** The whole check for one cell: the manifest with its Git authority, the frozen facts, the row. */
function verifyCell(key, deps) {
  const d = deps || {};
  const loaded = (d.loadManifest || manifestLib.loadManifest)();
  const problems = loaded.problems.slice();
  let row = null;
  let facts = null;
  if (loaded.manifest) {
    row = manifestLib.rowOf(loaded.manifest, key);
    if (row === null) problems.push('cell ' + key + ' is not a row of the manifest (exact key required)');
    if (loaded.ok) {
      facts = (d.gather || gather)(loaded.manifest, d);
      compare(loaded.manifest, facts).forEach((p) => problems.push('frozen: ' + p));
    }
  }
  return {
    ok: problems.length === 0, problems: problems, manifestBlob: loaded.blob,
    manifestSha256: loaded.workingTreeSha256, row: row, head: facts ? facts.ancestry.head : null,
    commits: facts ? facts.ancestry.commits : [], ratingVersion: facts ? facts.ratingVersion : null,
    engineSources: facts ? facts.source.engineSources : null,
    qualifierHash: facts ? facts.tool.qualifierHash : null,
    epoch: loaded.manifest ? loaded.manifest.epoch : null
  };
}

module.exports = { selectorOf, ancestry, gather, compare, verifyCell, PACK_ROOTS };

if (require.main === module) {
  const arg = process.argv.slice(2).filter((a) => a.indexOf('--cell=') === 0)[0];
  if (!arg) {
    console.error('usage: verify.cjs --cell=<variant/level>');
    process.exitCode = 2;
  } else {
    const result = verifyCell(arg.slice(7));
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.ok ? 0 : 1;
  }
}
