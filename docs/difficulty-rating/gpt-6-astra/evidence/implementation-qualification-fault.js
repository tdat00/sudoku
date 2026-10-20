'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

process.chdir(__dirname);
// Copied into the repository (docs/difficulty-rating/gpt-6-astra/evidence): the repository root is four levels up,
// the generator is `generator/` in it.
const root = path.join(path.resolve(__dirname, '..', '..', '..', '..'), 'generator');
const file = path.join(root, 'tests', 'qualify.js');
const outputFile = (process.env.SG_REVIEW_OUTPUT_PREFIX || 'implementation') + '-qualification-fault.json';
const mockChildProcess = {
  fork() {
    const worker = new EventEmitter();
    worker.send = function (task) {
      if (task === 'exit') return setImmediate(() => worker.emit('exit', 0));
      if (task.index === 39) return setImmediate(() => worker.emit('exit', 1));
      setImmediate(() => worker.emit('message', {
        key: task.key, index: task.index, seed: task.seed,
        hit: true, valid: true, solved: true, approximate: false, ms: 1
      }));
    };
    setImmediate(() => worker.emit('message', { ready: true }));
    return worker;
  }
};
const sandbox = {
  require(name) { return name === 'child_process' ? mockChildProcess : require(name); },
  __dirname: path.dirname(file),
  __filename: file,
  module: { exports: {} },
  process,
  console,
  mockSG: {
    difficulty: { LEVELS: ['veryEasy'] },
    variants: { list: () => [{ id: 'classic4', build: () => ({ cellCount: 16 }) }] },
    rng: { create: () => ({ fork: () => ({}) }) }
  },
  mockOptions: {
    variants: ['classic4'], levels: ['veryEasy'], jobs: 1, probe: 0, earlyStop: true, quiet: true,
    json: outputFile, markdown: null
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
const run = vm.runInContext(`
  loadSources = () => mockSG;
  engineInfo = () => ({ sources: 'worker-exit-fault-injection' });
  machineInfo = () => ({ cpu: 'synthetic scheduler test', jobs: 1, node: process.version });
  parent(mockOptions);
`, sandbox);
run.then(() => {
  const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  console.log(JSON.stringify({
    injection: 'The final worker exits 1 on request index 39; no source files were modified.',
    summary: result.cells[0].summary, support: result.support
  }));
}).catch(error => { console.error(error); process.exitCode = 1; });
