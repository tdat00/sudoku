'use strict';

/*
 * MS18d Phase C0 task-owned: the live `io` of source-binding.js, over the real tree. The identities and the
 * canonical 135-position target table are computed with the frozen Phase A helper (project-gp.js, read only,
 * the same calls as the Phase B freeze-targets.js), Git is read with `--no-optional-locks` and never written,
 * and the machine facts have the shape of the Phase A preflight. Nothing here generates a puzzle.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { sha256, machineFacts } = require('./common.js');
const loader = require('./loader.js');

function gitReader(repo) {
  return (args) => childProcess.execFileSync('git', ['--no-optional-locks'].concat(args), {
    cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, maxBuffer: 1 << 26
  });
}

function liveIo(repo) {
  const generator = path.join(repo, 'generator');
  const gp = require(path.join(generator, 'tests', 'artifacts', 'difficulty-v3', 'MS18d', 'project-gp.js'));
  return {
    git: gitReader(repo),
    readWorking: (rel) => fs.readFileSync(path.join(repo, rel), 'utf8'),
    identities: () => {
      const ids = gp.computeIdentities(generator);
      return { sources: ids.sources, qualifierHash: ids.qualifierHash, hashIdentity: ids.hashIdentity,
        replayIdentity: ids.replayIdentity };
    },
    table: () => {
      const loader = require(path.join(generator, 'tests', 'replay-fixtures.js')).loadFixtures;
      const decl = gp.loadDeclarations(loader, generator);
      const variants = Array.from(gp.loadRecords(generator).VARIANTS);
      const positions = [];
      variants.forEach((variant) => decl.targetLevels.forEach((level) => {
        const target = decl.targets[variant][level];
        positions.push({ key: variant + '/' + level, target: target === undefined ? null : target });
      }));
      const byKey = new Map(positions.map((p) => [p.key, p.target]));
      return {
        sha256: sha256(positions.map((p) => p.key + '=' + p.target).join('\n')),
        positions,
        targetOf: (key) => (byKey.has(key) ? byKey.get(key) : null)
      };
    },
    machine: () => machineFacts(),
    node: () => process.version,
    loader: () => {
      const cap = loader.captureAll(generator);
      return Object.assign({ recipe: cap.recipe, files: loader.loadedManifest(cap) },
        loader.identitiesOf(cap));
    }
  };
}

module.exports = { liveIo, gitReader };
