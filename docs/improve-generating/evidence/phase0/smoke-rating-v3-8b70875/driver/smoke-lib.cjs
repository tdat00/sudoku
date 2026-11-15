'use strict';

/*
 * Smoke-only supervisor library (compatibility smoke of the harness against another source tree). It is not a task of
 * the pack and changes no existing harness file. It spawns child node processes (units), enforces a payload deadline
 * counted from the start of THIS process (the origin of the low-priority wrapper's own backstop), terminates only the
 * children it spawned (by PID), verifies that they are gone and writes one durable result document. It owns no lock
 * and never touches the wrapper: the wrapper (Invoke-IgNode) is the PowerShell process that launched this one.
 * Nothing here touches git, the sources under test or any path outside the output folder it is given.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const cp = require('child_process');

const MAX_CAPTURE_BYTES = 1024 * 1024;
const TERMINATE_WAIT_MS = 1500;

function nowIso() {
  return new Date().toISOString();
}

/** Milliseconds since the start of this process (the same origin the wrapper's backstop counts from). */
function elapsedMs() {
  return performance.now();
}

function processStartedAtIso() {
  return new Date(performance.timeOrigin).toISOString();
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** CRLF, no trailing whitespace, one final newline: the format of every file this smoke writes. */
function normaliseText(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    .map(function (line) { return line.replace(/[ \t]+$/, ''); });
  return (lines.join('\n').replace(/\n+$/, '') + '\n').replace(/\n/g, '\r\n');
}

function writeTextFile(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const body = normaliseText(text);
  fs.writeFileSync(abs, body, { encoding: 'utf8', flag: 'w' });
  return { file: abs, bytes: Buffer.byteLength(body, 'utf8'), sha256: sha256(body) };
}

function writeJsonFile(abs, value) {
  return writeTextFile(abs, JSON.stringify(value, null, 2));
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/** The lock file as the wrapper wrote it ("pid|IG task|time"), read only. */
function readLockFile() {
  const file = path.join(os.tmpdir(), 'dv3-sudoku.lock');
  try {
    const content = fs.readFileSync(file, 'utf8');
    const parts = content.split('|');
    return { file: file, content: content, ownerPid: Number(parts[0]), ownerText: parts[1] || null,
      ownerPidIsParent: Number(parts[0]) === process.ppid, parentPid: process.ppid };
  } catch (err) {
    return { file: file, content: null, error: err.code || String(err), parentPid: process.ppid };
  }
}

class UnitSupervisor {
  /**
   * @param {object} options label, payloadMs (deadline from process start), outDir, concurrency, cwd,
   *   minStartMs (a unit is not started with less than this left), failSafeMs (hard exit after the deadline)
   */
  constructor(options) {
    this.label = options.label;
    this.payloadMs = options.payloadMs;
    this.outDir = options.outDir;
    this.concurrency = options.concurrency || 1;
    this.cwd = options.cwd || process.cwd();
    this.minStartMs = options.minStartMs === undefined ? 800 : options.minStartMs;
    this.failSafeMs = options.failSafeMs === undefined ? 900 : options.failSafeMs;
    this.units = [];
    this.live = new Map();
    this.deadlineHit = false;
    this.deadlineHitAtMs = null;
  }

  addUnit(unit) {
    if (!path.isAbsolute(unit.script)) throw new Error('unit script must be absolute: ' + unit.script);
    if (!fs.existsSync(unit.script)) throw new Error('unit script does not exist: ' + unit.script);
    this.units.push(Object.assign({ args: [], kind: 'unit', parse: 'none', barrier: false, stopOnFail: false },
      unit));
  }

  remainingMs() {
    return this.payloadMs - elapsedMs();
  }

  /** Terminates one owned child by PID and proves that it is gone. */
  async terminate(entry) {
    const child = entry.child;
    const rec = entry.rec;
    const t0 = elapsedMs();
    const termination = { pid: child.pid, requestedAtMs: round1(t0), methods: [], exited: false, verifiedGone: false,
      ms: null };
    rec.termination = termination;
    try {
      termination.methods.push('child.kill(SIGKILL) [TerminateProcess on pid ' + child.pid + ']');
      child.kill('SIGKILL');
    } catch (err) {
      termination.methods.push('kill failed: ' + err.message);
    }
    await Promise.race([entry.closed, delay(TERMINATE_WAIT_MS)]);
    if (isAlive(child.pid)) {
      const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
      termination.methods.push('taskkill /PID ' + child.pid + ' /T /F');
      try {
        cp.spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 3000 });
      } catch (err) {
        termination.methods.push('taskkill failed: ' + err.message);
      }
      await Promise.race([entry.closed, delay(500)]);
    }
    termination.exited = child.exitCode !== null || child.signalCode !== null;
    termination.verifiedGone = !isAlive(child.pid);
    termination.ms = round1(elapsedMs() - t0);
  }

  runUnit(unit) {
    const rec = { id: unit.id, kind: unit.kind, script: unit.script, args: unit.args, status: 'running',
      reason: null, pid: null, startedAtMs: round1(elapsedMs()), endedAtMs: null, wallMs: null, exitCode: null,
      signal: null, killedByDeadline: false, termination: null, stdout: null, stderr: null, parsed: null };
    unit.rec = rec;
    const chunks = { out: [], err: [] };
    const sizes = { out: 0, err: 0 };
    const truncated = { out: false, err: false };
    const grab = function (kind) {
      return function (data) {
        if (sizes[kind] + data.length > MAX_CAPTURE_BYTES) {
          truncated[kind] = true;
          return;
        }
        sizes[kind] += data.length;
        chunks[kind].push(data);
      };
    };
    const self = this;
    return new Promise(function (resolve) {
      let child;
      try {
        child = cp.spawn(process.execPath, [unit.script].concat(unit.args), { cwd: self.cwd,
          stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
      } catch (err) {
        rec.status = 'spawn-error';
        rec.reason = err.message;
        rec.endedAtMs = round1(elapsedMs());
        resolve();
        return;
      }
      rec.pid = child.pid;
      const entry = { child: child, rec: rec, closed: null };
      entry.closed = new Promise(function (done) { child.once('close', done); });
      self.live.set(unit.id, entry);
      child.stdout.on('data', grab('out'));
      child.stderr.on('data', grab('err'));
      child.once('error', function (err) {
        if (rec.status === 'running') {
          rec.status = 'spawn-error';
          rec.reason = err.message;
        }
      });
      entry.closed.then(function () {
        self.live.delete(unit.id);
        rec.endedAtMs = round1(elapsedMs());
        rec.wallMs = round1(rec.endedAtMs - rec.startedAtMs);
        rec.exitCode = child.exitCode;
        rec.signal = child.signalCode;
        ['out', 'err'].forEach(function (kind) {
          const text = Buffer.concat(chunks[kind]).toString('utf8');
          const name = unit.id.replace(/[^A-Za-z0-9._-]/g, '_') + (kind === 'out' ? '.stdout.txt' : '.stderr.txt');
          if (text.length > 0) {
            const written = writeTextFile(path.join(self.outDir, name), text);
            rec[kind === 'out' ? 'stdout' : 'stderr'] = { file: name, bytes: written.bytes, sha256: written.sha256,
              truncated: truncated[kind] };
          }
          if (kind === 'out') rec.stdoutText = text;
        });
        if (rec.status === 'spawn-error') {
          // keep
        } else if (rec.killedByDeadline) {
          rec.status = 'timeout';
          rec.reason = 'terminated at the payload deadline';
        } else if (rec.exitCode === 0) {
          rec.status = 'passed';
        } else {
          rec.status = 'failed';
          rec.reason = 'exit ' + rec.exitCode + (rec.signal ? ' signal ' + rec.signal : '');
        }
        parseUnit(unit, rec);
        if (rec.status === 'passed' && typeof unit.verify === 'function') {
          const problem = unit.verify(rec);
          if (problem) {
            rec.status = 'failed';
            rec.reason = problem;
          }
        }
        delete rec.stdoutText;
        resolve();
      });
    });
  }

  async terminateAll() {
    const entries = Array.from(this.live.values());
    entries.forEach(function (e) { e.rec.killedByDeadline = true; });
    await Promise.all(entries.map(this.terminate.bind(this)));
  }

  async run() {
    const self = this;
    fs.mkdirSync(this.outDir, { recursive: true });
    const pending = this.units.slice();
    const running = new Map();
    const startedAt = processStartedAtIso();
    let failSafeTimer = null;
    let deadlineTimer = null;
    const deadlineP = new Promise(function (resolve) {
      deadlineTimer = setTimeout(function () {
        self.deadlineHit = true;
        self.deadlineHitAtMs = round1(elapsedMs());
        failSafeTimer = setTimeout(function () {
          self.partialAndExit(startedAt, pending);
        }, self.failSafeMs);
        resolve();
      }, Math.max(0, this.remainingMs()));
    }.bind(this));
    let gateStopped = null;
    while (pending.length > 0 || running.size > 0) {
      while (pending.length > 0 && !this.deadlineHit && gateStopped === null) {
        const u = pending[0];
        if (this.remainingMs() < this.minStartMs) break;
        const exclusive = Array.from(running.keys()).some(function (id) {
          return self.units.find(function (x) { return x.id === id; }).barrier;
        });
        if (exclusive || (u.barrier && running.size > 0) || running.size >= this.concurrency) break;
        pending.shift();
        running.set(u.id, this.runUnit(u).then(function () {
          running.delete(u.id);
          if (u.stopOnFail && u.rec.status !== 'passed') gateStopped = u.id;
        }));
        if (u.barrier) break;
      }
      if (running.size === 0) break;
      await Promise.race([deadlineP].concat(Array.from(running.values())));
      if (this.deadlineHit) {
        await this.terminateAll();
        await Promise.all(Array.from(running.values()));
        break;
      }
    }
    if (failSafeTimer) clearTimeout(failSafeTimer);
    clearTimeout(deadlineTimer);
    pending.forEach(function (u) {
      u.rec = { id: u.id, kind: u.kind, script: u.script, args: u.args, status: 'unstarted',
        reason: gateStopped !== null ? 'gate unit ' + gateStopped + ' did not pass' :
          (this.deadlineHit ? 'payload deadline reached' : 'less than ' + this.minStartMs +
            ' ms of the payload left') };
    }, this);
    return this.result(startedAt);
  }

  result(startedAt) {
    const recs = this.units.map(function (u) { return u.rec || { id: u.id, kind: u.kind, script: u.script,
      args: u.args, status: 'unstarted', reason: 'never scheduled' }; });
    const terminated = recs.filter(function (r) { return r.termination; });
    return {
      units: recs,
      summary: {
        planned: recs.length,
        passed: recs.filter(function (r) { return r.status === 'passed'; }).length,
        failed: recs.filter(function (r) { return r.status === 'failed'; }).length,
        timedOut: recs.filter(function (r) { return r.status === 'timeout'; }).length,
        unstarted: recs.filter(function (r) { return r.status === 'unstarted'; }).length,
        spawnErrors: recs.filter(function (r) { return r.status === 'spawn-error'; }).length,
        terminations: terminated.length,
        terminationsVerified: terminated.filter(function (r) { return r.termination.verifiedGone; }).length
      },
      timing: { startedAt: startedAt, payloadMs: this.payloadMs, deadlineHit: this.deadlineHit,
        deadlineHitAtMs: this.deadlineHitAtMs, endedAtMs: round1(elapsedMs()), endedAt: nowIso() }
    };
  }

  /** Last resort after the deadline: whatever is known is written, owned children are killed again, exit 4. */
  partialAndExit(startedAt, pending) {
    const self = this;
    Array.from(this.live.values()).forEach(function (e) {
      try {
        e.child.kill('SIGKILL');
      } catch (err) {
        // reported below through the liveness check
      }
    });
    const result = this.result(startedAt);
    result.failSafe = true;
    result.stillAlive = Array.from(this.live.values()).map(function (e) { return e.child.pid; })
      .filter(isAlive);
    result.unscheduled = pending.map(function (u) { return u.id; });
    try {
      writeJsonFile(path.join(self.outDir, 'supervisor-failsafe.json'), result);
    } catch (err) {
      // nothing more can be done
    }
    process.exit(4);
  }
}

/** Unit outputs: one JSON document (probes) or the ok/FAIL lines of an engine-free test file. */
function parseUnit(unit, rec) {
  const text = rec.stdoutText || '';
  if (unit.parse === 'json') {
    try {
      rec.parsed = JSON.parse(text);
    } catch (err) {
      rec.parseError = err.message;
    }
  } else if (unit.parse === 'tests') {
    const lines = text.split(/\r?\n/);
    const ok = lines.filter(function (l) { return /^ok\s/.test(l); });
    const fail = [];
    lines.forEach(function (l, i) {
      if (/^FAIL\s/.test(l)) {
        const next = lines[i + 1] && /^\s+\S/.test(lines[i + 1]) ? ' | ' + lines[i + 1].trim() : '';
        fail.push(l + next);
      }
    });
    const nonEmpty = lines.filter(function (l) { return l.trim() !== ''; });
    rec.parsed = { okLines: ok.length, failLines: fail.length, firstFailure: fail.length > 0 ? fail[0].slice(0, 600) : null,
      failures: fail.slice(0, 8).map(function (f) { return f.slice(0, 600); }),
      summaryLine: nonEmpty.length > 0 ? nonEmpty[nonEmpty.length - 1].slice(0, 300) : null,
      lastLines: nonEmpty.slice(-3).map(function (l) { return l.slice(0, 300); }) };
  }
}

/** Unit/phase result document: process identity, the lock file as observed, the deadline and the units. */
function buildSupervisorDocument(context, outcome) {
  return Object.assign({
    schema: 'ig-smoke-supervisor/1',
    phase: context.phase,
    wrapperTask: context.wrapperTask,
    round: context.round,
    process: { pid: process.pid, ppid: process.ppid, node: process.version, platform: process.platform,
      startedAt: processStartedAtIso(), script: process.argv[1] },
    lockAtStart: context.lockAtStart,
    lockAtEnd: readLockFile(),
    payload: { payloadMs: context.payloadMs, concurrency: context.concurrency,
      deadlineAt: new Date(performance.timeOrigin + context.payloadMs).toISOString() }
  }, outcome);
}

function parseArgs(argv, names) {
  const out = { rest: [] };
  let i = 0;
  for (; i < argv.length; i++) {
    if (argv[i] === '--') {
      out.rest = argv.slice(i + 1);
      break;
    }
    const m = /^--([a-z-]+)=(.*)$/.exec(argv[i]);
    if (!m || names.indexOf(m[1]) < 0) throw new Error('unknown argument ' + argv[i]);
    out[m[1]] = m[2];
  }
  return out;
}

module.exports = { UnitSupervisor, buildSupervisorDocument, parseArgs, readLockFile, writeJsonFile, writeTextFile,
  normaliseText, sha256, isAlive, elapsedMs, processStartedAtIso, nowIso, round1, delay };
