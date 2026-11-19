#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase C0b task-owned STAND-IN support for the PowerShell wrapper tests: builds, in a NEW folder,
 * the fake repository of standin-gp.js (a fake generator project, a reduced plan manifest over two invented
 * cells, optionally the synthetic run folders of a complete fake campaign) and prints a JSON description, so
 * that the wrapper test can drive the real wrapper, controller and tee over it. Nothing here measures
 * anything.
 *   node standin-world.js --repo=<new folder> [--campaign=pass|miss] [--helper-sha=<hex>]
 * `--campaign` writes one complete synthetic run folder per chunk (a recorder run that never happened; its
 * times are invented: `pass` is below every target, `miss` is above that of fakea/easy), recorded against
 * the helper manifest hash given with --helper-sha.
 */
const fs = require('fs');
const path = require('path');
const standin = require('./standin-gp.js');
const { machineFacts } = require('./common.js');

function main(argv) {
  const get = (name) => argv.map((a) => new RegExp('^--' + name + '=(.+)$').exec(a)).filter(Boolean)
    .map((m) => m[1])[0];
  const repo = get('repo');
  const campaign = get('campaign');
  const helperSha = get('helper-sha');
  if (!repo || (campaign && !['pass', 'miss'].includes(campaign)) || (campaign && !helperSha)) {
    console.error('usage: standin-world.js --repo=<new folder> [--campaign=pass|miss --helper-sha=<hex>]');
    return 2;
  }
  if (fs.existsSync(repo)) {
    console.error('the folder exists');
    return 2;
  }
  fs.mkdirSync(repo, { recursive: true });
  const g = standin.makeFakeProject(repo);
  const made = standin.makeFakeManifest(repo);
  const doc = made.doc;
  const slots = doc.runSlots.filter((s) => s.role === 'chunk' && s.attempt === 1);
  if (campaign) {
    slots.forEach((slot) => {
      const chunk = doc.chunks.filter((c) => c.chunkId === slot.chunkId)[0];
      const miss = campaign === 'miss' && chunk.cell === 'fakea/easy';
      const times = standin.timesFor(chunk, 50, 0).map((t) => (miss ? 200 : t));
      standin.writeRunFolder(repo, made, slot, { helper: { sha256: helperSha }, times });
    });
  }
  console.log(JSON.stringify({
    repo, generator: g, planRel: made.planRel,
    expected: { hashIdentity: doc.sources.hashIdentity, replayIdentity: doc.sources.replayIdentity,
      sources: doc.sources.sources, tableSha256: doc.targets.tableSha256, node: doc.environment.node,
      machine: machineFacts() },
    base: standin.BASE, head: standin.BASE, chunkIds: doc.chunks.map((c) => c.chunkId),
    cells: { 'fakea/easy': 100, 'fakeb/easy': 300 }, runBase: standin.RUN_BASE
  }));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
