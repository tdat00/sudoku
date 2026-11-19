'use strict';

/*
 * MS18d Phase B task-owned: the incremental tee that replaces tee-run.js of Phase A. It runs the real command
 * as a child of the locked process (the lock wrapper `Invoke-Dv3Node` starts `node` with the console of the
 * host, so a pipeline cannot capture what a command prints), copies its output (stdout and stderr, in order
 * of arrival) to the console and appends it to a transcript FILE AS IT ARRIVES (append-writer.js), so that
 * the output of a command that is killed, or never ends, is kept.
 *
 *   Invoke-Dv3Node -Task '...' -NodeArgs @('tests\artifacts\difficulty-v3\MS18d\phase-b\tee-append.js',
 *     '<new transcript file>', '<node argument>', '<node argument>'...)
 *
 * The transcript starts with `$ node <args>` and each output line follows when the child writes it. Its LAST
 * line says how the command ended, and only one of these lines is ever written:
 *   exit=<code> seconds=<n>            the child ended with that exit code (zero: success)
 *   signal=<name> seconds=<n>          the child ended on that signal
 *   spawn-error=<message> seconds=<n>  the child could not be started
 *   tee-interrupted signal=<name> ...  the tee itself was interrupted (and stopped the child)
 * A transcript with none of them was cut off (the tee was killed, for example by the 540 s ceiling of the
 * lock wrapper): it is INCOMPLETE and never a result. No completion marker is ever invented.
 * The tee exits with the code of the child (1 for a signal or an interruption, 127 when the child could
 * not be started, 2 for a usage error or a transcript that already exists: a transcript is never
 * overwritten).
 * TEE_QUIET=1 copies nothing to the console; TEE_EXEC=<path> (verification of the spawn-error path only)
 * replaces the node executable.
 */
const { spawn } = require('child_process');
const { StringDecoder } = require('string_decoder');
const { createAppender } = require('./append-writer.js');

const [out, ...args] = process.argv.slice(2);
if (!out || args.length === 0) {
  console.error('usage: tee-append.js <new transcript file> <node argument> [more node arguments...]');
  process.exit(2);
}

let writer;
try {
  writer = createAppender(out);
} catch (err) {
  console.error('cannot create the transcript ' + out + ': ' + err.message);
  process.exit(2);
}

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
  } finally {
    process.exitCode = code;
  }
}

writer.line('$ node ' + args.join(' '));

try {
  child = spawn(exec, args, { stdio: ['inherit', 'pipe', 'pipe'] });
} catch (err) {
  end('spawn-error=' + String(err && err.message) + ' seconds=' + seconds(), 127);
}

if (child) {
  const echo = (target) => (chunk) => { if (!process.env.TEE_QUIET) target.write(chunk); };
  const copy = (stream, target) => {
    const decoder = new StringDecoder('utf8');
    const show = echo(target);
    stream.on('data', (chunk) => {
      show(chunk);
      if (!ended) writer.write(decoder.write(chunk));
    });
    stream.on('end', () => {
      const rest = decoder.end();
      if (!ended && rest !== '') writer.write(rest);
    });
  };
  copy(child.stdout, process.stdout);
  copy(child.stderr, process.stderr);
  child.on('error', (err) => {
    end('spawn-error=' + String(err && err.message) + ' seconds=' + seconds(), 127);
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
