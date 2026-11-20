'use strict';

/*
 * MS18d Phase C0 task-owned: the Phase C copy of the incremental tee of Phase B (phase-b/tee-append.js,
 * whose frozen bytes and semantics are kept: `$ node <args>` first, the output of the command line by line
 * as it arrives in ONE transcript, and one final line that says how the command ended:
 * `exit=<code> seconds=<n>`, `signal=<name> seconds=<n>`, `spawn-error=<message> seconds=<n>` or
 * `tee-interrupted signal=<name> ...`; a transcript with none of them was cut off). It uses the frozen
 * phase-b/append-writer.js unchanged. The additions are off unless the controller asks for them by
 * environment variable, and none changes the transcript:
 *
 *   TEE_SPAWN_RECORD=<jsonl file>  appends, flushed when written, the identity of the COMMAND the tee
 *       starts (not only the tee), right after the spawn and without querying any process:
 *       { role: 'command', pid, ppid, beforeMs, afterMs, startedAtIso, argv }, the spawn time window (the
 *       clock just before and just after the spawn; the creation time of the process is read, after the tee
 *       ended, and compared with it: a process is identified by PID plus creation time); when the command
 *       ends { event: 'command-exit', atMs, code, signal }; and last, when the tee is done,
 *       { event: 'tee-exit', atMs, stdoutBytes, stderrBytes, cpuUserMicros, cpuSystemMicros }: the RAW
 *       bytes that arrived on each pipe (so that one stray byte on stderr is never lost to the line
 *       normalisation of the files) and the CPU time of this tee;
 *   TEE_STREAMS_DIR=<directory>    keeps stdout and stderr APART as they arrive in stdout.txt and
 *       stderr.txt (new files, same line normalisation as the transcript, which stays the one merged
 *       record);
 *   TEE_DETACHED=1                 (verification only) starts the command detached, so that it is not in
 *       the job object that makes the children of a node process end with it: the way a stand-in command
 *       survives the death of its tee.
 *
 * The tee does no periodic work: it only reacts to the data, exit and close events of the command and
 * writes what arrives; no timer, no poll, no process query runs while the command does.
 *
 *   node tee-c.js <new transcript file> <node argument> [more node arguments...]
 * Exit code: that of the command (1 for a signal or an interruption, 127 when it could not be started, 2
 * for a usage error or a transcript that already exists). TEE_QUIET=1 copies nothing to the console;
 * TEE_EXEC=<path> replaces the node executable (verification of the spawn-error path only).
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { StringDecoder } = require('string_decoder');
const { createAppender } = require('../phase-b/append-writer.js');
const { appendJsonl } = require('./common.js');

const [out, ...args] = process.argv.slice(2);
if (!out || args.length === 0) {
  console.error('usage: tee-c.js <new transcript file> <node argument> [more node arguments...]');
  process.exit(2);
}

let writer;
let streams = null;
try {
  writer = createAppender(out);
  if (process.env.TEE_STREAMS_DIR) {
    const dir = process.env.TEE_STREAMS_DIR;
    fs.mkdirSync(dir, { recursive: true });
    streams = { stdout: createAppender(path.join(dir, 'stdout.txt')),
      stderr: createAppender(path.join(dir, 'stderr.txt')) };
  }
} catch (err) {
  console.error('cannot create the transcript or its streams ' + out + ': ' + err.message);
  process.exit(2);
}
const spawnRecord = process.env.TEE_SPAWN_RECORD || null;
const bytes = { stdout: 0, stderr: 0 };

const started = Date.now();
const seconds = () => ((Date.now() - started) / 1000).toFixed(3);
const exec = process.env.TEE_EXEC || process.execPath;
let ended = false;
let child = null;

function end(finalLine, code) {
  if (ended) return;
  ended = true;
  try {
    writer.line(finalLine);
    writer.close();
    if (streams) {
      streams.stdout.close();
      streams.stderr.close();
    }
    if (spawnRecord) {
      const cpu = process.cpuUsage();
      appendJsonl(spawnRecord, { event: 'tee-exit', atMs: Date.now(), stdoutBytes: bytes.stdout,
        stderrBytes: bytes.stderr, cpuUserMicros: cpu.user, cpuSystemMicros: cpu.system });
    }
  } finally {
    process.exitCode = code;
  }
}

writer.line('$ node ' + args.join(' '));

const beforeMs = Date.now();
try {
  child = spawn(exec, args,
    { stdio: ['inherit', 'pipe', 'pipe'], detached: process.env.TEE_DETACHED === '1' });
} catch (err) {
  end('spawn-error=' + String(err && err.message) + ' seconds=' + seconds(), 127);
}

if (child) {
  const afterMs = Date.now();
  if (spawnRecord && child.pid) {
    appendJsonl(spawnRecord, { role: 'command', pid: child.pid, ppid: process.pid, beforeMs, afterMs,
      startedAtIso: new Date(afterMs).toISOString(), argv: [exec].concat(args) });
  }
  const echo = (target) => (chunk) => { if (!process.env.TEE_QUIET) target.write(chunk); };
  const copy = (stream, target, name) => {
    const decoder = new StringDecoder('utf8');
    const apart = new StringDecoder('utf8');
    const own = streams ? streams[name] : null;
    const show = echo(target);
    stream.on('data', (chunk) => {
      bytes[name] += chunk.length;
      show(chunk);
      if (!ended) writer.write(decoder.write(chunk));
      if (own && !ended) own.write(apart.write(chunk));
    });
    stream.on('end', () => {
      const rest = decoder.end();
      const restApart = apart.end();
      if (!ended && rest !== '') writer.write(rest);
      if (own && !ended && restApart !== '') own.write(restApart);
    });
  };
  copy(child.stdout, process.stdout, 'stdout');
  copy(child.stderr, process.stderr, 'stderr');
  child.on('error', (err) => {
    end('spawn-error=' + String(err && err.message) + ' seconds=' + seconds(), 127);
  });
  child.on('exit', (code, signal) => {
    if (spawnRecord) appendJsonl(spawnRecord, { event: 'command-exit', atMs: Date.now(), code, signal });
  });
  child.on('close', (code, signal) => {
    if (signal) end('signal=' + signal + ' seconds=' + seconds(), 1);
    else end('exit=' + code + ' seconds=' + seconds(), code === null ? 1 : code);
  });
  ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP'].forEach((name) => {
    try {
      process.on(name, () => {
        try { child.kill(); } catch (err) { /* the child may already be gone */ }
        end('tee-interrupted signal=' + name + ' seconds=' + seconds(), 1);
        process.exit(1);
      });
    } catch (err) { /* a signal this platform does not know */ }
  });
}
