'use strict';

/*
 * MS05r6c: derives the shard plan of this task's quick evidence from the CI manifest
 * .github/scripts/generator-quick.json (the same shards the CI jobs run) and writes it to the evidence folder.
 * Nothing runs a test. The Generator is then run through the CI entry itself, one group per locked command:
 *   node .github/scripts/generator-quick.js run <group> --results-dir=docs/difficulty-v3/evidence/MS05r6c/quick
 *
 *   node generator/tests/artifacts/difficulty-v3/MS05r6c/make-plans.cjs
 *
 * quick/shard-plan.json     the shards of both apps, for quick/manifest.js and quick/Run-Preflights.ps1
 * Each shard carries its own finite projection (the stated bound of the manifest, a multiple of r6b's measurement).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = 'docs/difficulty-v3/evidence/MS05r6c';
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'generator-quick.json'), 'utf8')
  .replace(/^\uFEFF/, ''));

const shards = [];
manifest.groups.forEach((g) => g.shards.forEach((s) => shards.push(s)));
const resultOf = (app, id) => EVIDENCE + '/quick/' + app + '-' + id + '.json';
const basis = (s) => 'MEASURED ' + s.measuredSeconds + ' s by MS05r6b (final run, locked, same code; only ' +
  'documents differ here), stated bound ' + s.projectionSeconds + ' s (' +
  (s.projectionSeconds / s.measuredSeconds).toFixed(1) + ' times), from .github/scripts/generator-quick.json';

const plan = {
  schema: 1,
  note: 'The quick shards of MS05r6c on the fingerprint of the final documents: the shards of ' +
    '.github/scripts/generator-quick.json (identical to MS05r6b quick-final/shard-plan.json), whole suites only.',
  apps: {
    generator: {
      inventoryPath: EVIDENCE + '/generator-inventory.json',
      shards: shards.map((s) => ({
        id: s.id, args: ['tests/node-runner.js', '--suite=' + s.suites.join(',')],
        projectionSeconds: s.projectionSeconds, projectionBasis: basis(s), resultPath: resultOf('generator', s.id)
      }))
    },
    player: {
      inventoryPath: EVIDENCE + '/player-inventory.json',
      shards: [{
        id: 'all', args: ['tests/node-runner.js'], projectionSeconds: manifest.player.projectionSeconds,
        projectionBasis: 'MEASURED ' + manifest.player.measuredSeconds + ' s by MS05r6b (locked, same code), ' +
          'stated bound ' + manifest.player.projectionSeconds + ' s, from .github/scripts/generator-quick.json',
        resultPath: resultOf('player', 'all')
      }]
    }
  }
};

const out = path.join(ROOT, EVIDENCE, 'quick');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'shard-plan.json'), JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n',
  { encoding: 'utf8', flag: 'wx' });
console.log('written: ' + EVIDENCE + '/quick/shard-plan.json (' + shards.length + ' Generator shards, 1 Player)');