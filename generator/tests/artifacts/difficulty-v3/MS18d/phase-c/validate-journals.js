'use strict';

/*
 * MS18d Phase C1 task-owned, read-only: validates the two committed operational journals with the SAME reader
 * the controller and the merger use (journals.js), and optionally compares the live host with the binding in
 * force. It writes nothing.
 *
 *   node validate-journals.js [--repo <dir>] [--head <rev>] [--base <rev>] [--live] [--working]
 *
 *   --head     the commit whose committed journals are read (default HEAD);
 *   --base     the campaign base B: both journals must keep their version at B as an exact line prefix;
 *   --live     one bounded read-only probe of the bound host process, compared fact by fact (PID, parent,
 *              executable, .NET start time at 100 ns, CIM creation time at 6 digits; ProcessName ignored);
 *   --working  reads the journals and the evidence from the WORKING TREE instead of a commit, for a check
 *              BEFORE the orchestrator commits an entry. Such a result has `authority: false`: only the
 *              committed state is authority.
 *   --report-only  exit 0 whatever the verdict (the last line still says ok=false); for a look at a journal
 *              that may not be valid yet, through a runner that accepts exit 0 only.
 *
 * Exit code: 0 both journals valid (a host binding is configured and, with --live, verified), 2 a problem
 * (an empty or invalid host-binding journal included), 3 an exception. The last stdout line is
 * `VALIDATE-JOURNALS ok=<bool> authority=<bool> ...`; the lines before it are the JSON report.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const journals = require('./journals.js');
const core = require('./readiness-core.js');
const { gitReader } = require('./source-io.js');

function argValue(argv, name) {
  const hit = argv.filter((a) => a === name || a.startsWith(name + '='))[0];
  if (hit === undefined) return null;
  if (hit.includes('=')) return hit.slice(name.length + 1);
  const at = argv.indexOf(hit);
  return at + 1 < argv.length ? argv[at + 1] : null;
}

/** A `git show <ref>:<path>` served from the working tree (the pre-commit check only). */
function workingReader(repo) {
  return (args) => {
    if (args[0] !== 'show') throw new Error('the working reader serves git show only');
    const m = /^[^:]*:(.*)$/.exec(args[1]);
    return fs.readFileSync(path.join(repo, m[1]), 'utf8');
  };
}

function probeHost(pid) {
  const script = path.join(__dirname, 'readiness-probe.ps1');
  const run = childProcess.spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-File', script, '-Action',
    'host', '-HostPid', String(pid), '-TimeoutSeconds', '15'], { encoding: 'utf8', timeout: 20000,
    windowsHide: true, maxBuffer: 1 << 24 });
  if (run.error || run.status !== 0) {
    return { found: false, error: String((run.error && run.error.message) || run.stderr || run.status) };
  }
  return JSON.parse(run.stdout);
}

function validate(argv) {
  const repo = path.resolve(argValue(argv, '--repo') ||
    path.join(__dirname, '..', '..', '..', '..', '..', '..'));
  const working = argv.includes('--working');
  const git = working ? workingReader(repo) : gitReader(repo);
  const revOf = (name) => String(git(['rev-parse', name])).trim();
  const headArg = argValue(argv, '--head');
  const head = working ? 'WORKING-TREE' : revOf(headArg || 'HEAD');
  const baseArg = argValue(argv, '--base');
  const base = baseArg ? (working ? baseArg : revOf(baseArg)) : null;
  // the base version is always read from Git, whatever the head is read from
  const baseGit = gitReader(repo);
  const splitGit = working
    ? (args) => (String(args[1]).startsWith('WORKING-TREE:') ? git(args) : baseGit(args)) : git;
  const host = journals.hostBindingState(splitGit, head, base);
  const rulings = journals.rulingsState(splitGit, head, base);
  const report = { schema: 'ms18d-c-validate-journals-1', authority: !working, repo, head, base,
    hostBinding: { ok: host.ok, configured: host.ok, bindingId: host.current ? host.current.bindingId : null,
      entryCount: host.journal.entries.length, tuple: host.expected, reference: host.reference,
      problems: host.problems },
    rulings: { ok: rulings.ok, entryCount: rulings.entries.length, reference: rulings.reference,
      problems: rulings.problems },
    live: null };
  if (argv.includes('--live')) {
    if (!host.ok) {
      report.live = { checked: false, verified: false, problems: ['no host binding is configured'] };
    } else {
      const facts = probeHost(host.expected.pid);
      const verdict = core.evaluateHost(host.expected, facts);
      report.live = { checked: true, verified: verdict.verified, kind: verdict.kind,
        problems: verdict.problems, facts };
    }
  }
  const ok = host.ok && rulings.ok && (!report.live || report.live.verified);
  return { report, ok };
}

function main(argv) {
  const { report, ok } = validate(argv);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  const bound = report.hostBinding.ok ? report.hostBinding.bindingId : 'none';
  process.stdout.write('VALIDATE-JOURNALS ok=' + ok + ' authority=' + report.authority + ' hostBinding=' +
    bound + ' rulings=' + report.rulings.entryCount +
    (report.live ? ' live=' + report.live.verified : '') + '\n');
  // --report-only is for a look at a journal that may not be valid yet: the verdict is in the last line
  return ok || argv.includes('--report-only') ? 0 : 2;
}

module.exports = { validate, main, workingReader };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('VALIDATE-JOURNALS exception: ' + (err && err.stack ? err.stack : err) + '\n');
    process.exitCode = 3;
  }
}
