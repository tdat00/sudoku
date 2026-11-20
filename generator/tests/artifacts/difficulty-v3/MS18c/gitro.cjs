'use strict';

/*
 * MS18c Stage 3 task-owned READ-ONLY Git: the only Git commands the supervisor side runs
 * (`--no-optional-locks` is always added, so `status` and `diff` never refresh the index). A command
 * outside the list is refused before
 * anything runs; no write, no index change and no object written is possible through it. The runner is
 * injectable so that tests need no repository.
 */
const childProcess = require('child_process');

const COMMIT = /^(HEAD|[0-9a-f]{7,40})$/;
const SPEC = /^(HEAD|[0-9a-f]{7,40})(:[^\s;|&<>]+)?$/;
const PATHLIKE = /^(?!-)[A-Za-z0-9_.\/-]+$/;

/** Is this argument list one of the read-only commands of the preflight/supervision? */
function allowed(args) {
  if (!Array.isArray(args) || args.length === 0) return false;
  const [cmd, ...more] = args;
  switch (cmd) {
    case 'rev-parse':
      return more.length > 0 && more.every((a) =>
        /^(--short|--verify|--quiet|--abbrev-ref|HEAD~\d+)$/.test(a) ||
        SPEC.test(a));
    case 'status':
      return more.length === 1 && more[0] === '--porcelain';
    case 'hash-object':
      return more.length === 1 && PATHLIKE.test(more[0]);
    case 'diff':
      return (more.length === 4 && more[0] === '--quiet' && more[1] === 'HEAD' && more[2] === '--' &&
        PATHLIKE.test(more[3])) ||
        (more.length === 3 && more[0] === '--name-only' && COMMIT.test(more[1]) && COMMIT.test(more[2]));
    case 'diff-tree':
      return more.length === 4 && more[0] === '--no-commit-id' && more[1] === '--name-only' &&
        more[2] === '-r' &&
        COMMIT.test(more[3]);
    case 'rev-list':
      return (more.length === 1 && /^([0-9a-f]{7,40}|HEAD)\.\.([0-9a-f]{7,40}|HEAD)$/.test(more[0])) ||
        (more.length === 4 && more[0] === '--parents' && more[1] === '-n' && more[2] === '1' &&
          COMMIT.test(more[3]));
    case 'merge-base':
      return more.length === 3 && more[0] === '--is-ancestor' && COMMIT.test(more[1]) && COMMIT.test(more[2]);
    case 'config':
      return more.length === 2 && more[0] === '--get' && /^core\.(autocrlf|safecrlf)$/.test(more[1]);
    default:
      return false;
  }
}

function defaultRunner(cwd) {
  return (args) => {
    const run = childProcess.spawnSync('git', ['--no-optional-locks'].concat(args), {
      cwd: cwd, encoding: 'utf8', windowsHide: true, timeout: 30000
    });
    return { status: run.status, stdout: String(run.stdout || '').trim(),
      stderr: String(run.stderr || '').trim() };
  };
}

/** A git function over `args` that refuses anything but the allowed commands. */
function createGit(cwd, runner) {
  const run = runner || defaultRunner(cwd);
  return function git(args) {
    if (!allowed(args)) {
      throw new Error('refused: not a read-only Git command: git ' + String(args && args.join(' ')));
    }
    return run(args);
  };
}

module.exports = { allowed, createGit };
