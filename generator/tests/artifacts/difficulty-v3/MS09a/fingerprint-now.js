'use strict';
// Scratch (MS08b): the source fingerprint of the tree now, computed with the inputs of the two runners (copied from
// generator/tests/node-runner.js and player/tests/node-runner.js), to compare with the sourceHash of a results file
// (J2 of IR72: after the final quick sets only files outside the fingerprints may change).
// Usage (from the repository root): node generator/tests/artifacts/difficulty-v3/MS08b/fingerprint-now.js
const path = require('path');
const evidenceTools = require('../../../../../core/tests/node-evidence.js');
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const COMMON = ['AGENTS.md', 'README.md', 'USERGUIDE.md', 'USERGUIDE.vn.md', 'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md',
  'core/tests/harness.js', 'core/tests/node-evidence.js'];
const inputs = {
  generator: {
    files: COMMON.concat(['generator/design.md', 'generator/index.html', 'generator/tests.html']),
    trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'generator/js',
      'generator/css', 'generator/assets', 'generator/tests/fixtures', 'generator/tests/suites',
      { dir: 'generator/tests', recursive: false }],
    manualTrees: ['generator/tests/manual']
  },
  player: {
    files: COMMON.concat(['player/design.md', 'player/help.html', 'player/index.html', 'player/tests.html']),
    trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'player/js', 'player/css',
      'player/assets', 'player/tests/fixtures', 'player/tests/suites', 'player/tests/tools',
      { dir: 'player/tests', recursive: false }]
  }
};
Object.keys(inputs).forEach((app) => {
  const evidence = evidenceTools.create({ app, repoRoot: REPO, inputs: inputs[app] });
  console.log(app + ' ' + evidence.fingerprint().sourceHash);
});
