'use strict';

/*
 * MS07d scratch measurement (no generation): how many workers of tests/qualify.js are busy in the second round
 * of a level that expands from 40 to 100 requests. Fake workers, a fake classic4 registry and the real scheduler
 * in a context of its own. Run from generator/: node tests/artifacts/difficulty-v3/MS07d/round2-workers.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const FILE = path.join(ROOT, 'tests', 'qualify.js');
const MISSES = [3, 9, 14, 22, 27, 31, 37];

function run(jobs) {
  const pending = [];
  const inFlight = new Set();
  const exited = [];
  const stats = { maxFirst: 0, maxSecond: 0, secondDispatched: 0, aliveAtSecondStart: null };
  let alive = 0;
  function fork() {
    const handlers = {};
    alive++;
    const w = {
      on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return w; },
      emit(name, a, b) { (handlers[name] || []).forEach((fn) => fn(a, b)); },
      send(task) {
        if (task === 'exit') { pending.push({ w, task }); return; }
        inFlight.add(task.index);
        if (task.index >= 40) {
          if (stats.aliveAtSecondStart === null) stats.aliveAtSecondStart = alive - exited.length;
          stats.secondDispatched++;
          const n = Array.from(inFlight).filter((i) => i >= 40).length;
          stats.maxSecond = Math.max(stats.maxSecond, n);
        } else {
          stats.maxFirst = Math.max(stats.maxFirst, inFlight.size);
        }
        pending.push({ w, task });
      },
      kill() {}
    };
    pending.push({ w, ready: true });
    return w;
  }
  const modules = {
    fs: { readFileSync: fs.readFileSync, existsSync: fs.existsSync, mkdirSync() {}, writeFileSync() {}, renameSync() {},
      rmSync() {} },
    path, vm, crypto: require('crypto'), child_process: { fork }, os: { cpus: () => [], totalmem: () => 0 }
  };
  const ctx = vm.createContext({ require: (n) => modules[n], module: { exports: {} }, process, __filename: FILE,
    __dirname: path.dirname(FILE), console: { log() {}, error() {} } });
  vm.runInContext(fs.readFileSync(FILE, 'utf8'), ctx, { filename: FILE });
  ctx.fakeSG = {
    difficulty: { LEVELS: ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'],
      RATING_VERSION: 2 },
    variants: { list: () => [{ id: 'classic4', build: () => ({ cellCount: 16 }) }], cellCountOf: () => 16 },
    digger: { defaultMaxAttempts: () => 8 }, rng: { create: () => ({ fork: () => ({}) }) }
  };
  vm.runInContext('loadSources = () => fakeSG; engineInfo = () => ({ sources: "s" }); machineInfo = (j) => ({ jobs: j });' +
    'qualifierHash = () => "q"; attemptPolicy = () => ({});', ctx);
  ctx.opts = { variants: null, levels: ['hard'], jobs, json: null, markdown: null, earlyStop: true, quiet: true,
    probe: 0 };
  const done = vm.runInContext('parent(opts)', ctx);
  let seed = 1;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  return new Promise((resolve) => {
    (function step() {
      if (pending.length === 0) return resolve();
      const item = pending.splice(Math.floor(rand() * pending.length), 1)[0];
      if (item.ready) item.w.emit('message', { ready: true });
      else if (item.task === 'exit') { exited.push(1); item.w.emit('exit', 0, null); }
      else {
        const hit = !MISSES.includes(item.task.index);
        inFlight.delete(item.task.index);
        item.w.emit('message', { key: item.task.key, index: item.task.index, seed: item.task.seed, hit, ms: 100,
          achieved: item.task.level, score: 1, solved: true, approximate: !hit, exact: hit, valid: true });
      }
      Promise.resolve().then(step);
    }());
  }).then(() => done).then(() => ({ jobs, ...stats }));
}

(async () => {
  for (const jobs of [1, 2, 4, 8]) console.log(JSON.stringify(await run(jobs)));
})();
