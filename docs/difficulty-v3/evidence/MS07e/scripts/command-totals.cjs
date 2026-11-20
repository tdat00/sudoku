#!/usr/bin/env node
'use strict';

/*
 * MS07e command totals (reads only): from run-log.jsonl, the number of locked invocations (per-item runs of the first driver and
 * compounds), the commands inside them, node seconds and lock waits per phase; written to commands.json and commands.md.
 *
 *   node command-totals.cjs
 */
const fs = require('fs');
const path = require('path');

const EVIDENCE = 'Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e';
const rows = fs.readFileSync(path.join(EVIDENCE, 'run-log.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const ran = rows.filter((r) => r.state === 'ran');
const byPhase = {};
const phaseOf = (r) => {
  if (r.phase === 'gd-pilot') return 'gd';
  if (r.phase === 'gg-check') return 'gg';
  return r.phase;
};
ran.forEach((r) => {
  const p = phaseOf(r);
  const t = byPhase[p] = byPhase[p] || { commands: 0, nodeSeconds: 0, timeouts: 0, expectedExit1: 0, failed: 0 };
  t.commands++;
  t.nodeSeconds += r.nodeSeconds || 0;
  if (r.outcome === 'timeout') t.timeouts++;
  if (r.outcome === 'expected-exit1') t.expectedExit1++;
  if (/^failed/.test(r.outcome)) t.failed++;
});
// locked invocations: the first driver ran one item per lock (records without a compound field), later ones are compounds
const single = ran.filter((r) => !r.compound && r.lockWaitSeconds !== undefined);
const compounds = rows.filter((r) => r.state === 'compound');
const lockWait = single.reduce((a, r) => a + (r.lockWaitSeconds || 0), 0) +
  compounds.reduce((a, r) => a + (r.lockWaitSeconds || 0), 0);
const maxWait = Math.max.apply(null, single.map((r) => r.lockWaitSeconds || 0).concat(compounds.map((r) => r.lockWaitSeconds || 0)));
const out = {
  schema: 1, task: 'MS07e', commands: ran.length, lockedInvocations: single.length + compounds.length,
  singleItemInvocations: single.length, compounds: compounds.length, timeouts: ran.filter((r) => r.outcome === 'timeout').length,
  unexecuted: rows.filter((r) => r.state === 'unexecuted').length,
  nodeSeconds: Math.round(ran.reduce((a, r) => a + (r.nodeSeconds || 0), 0) * 1000) / 1000,
  lockWaitSeconds: Math.round(lockWait * 1000) / 1000, longestLockWaitSeconds: maxWait,
  waitsOver20Minutes: compounds.filter((r) => /waited>20min/.test(r.note || '')).length,
  byPhase: byPhase,
  compoundList: compounds.map((c) => ({ compound: c.compound, started: c.started, outcome: c.outcome, nodeSeconds: c.nodeSeconds,
    totalSeconds: c.totalSeconds, lockWaitSeconds: c.lockWaitSeconds }))
};
fs.writeFileSync(path.join(EVIDENCE, 'commands.json'), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n');
const md = ['| phase | commands | node seconds | expected exit 1 | timeouts | failed |', '|---|---:|---:|---:|---:|---:|'];
Object.keys(byPhase).forEach((p) => {
  const t = byPhase[p];
  md.push('| ' + p + ' | ' + t.commands + ' | ' + t.nodeSeconds.toFixed(1) + ' | ' + t.expectedExit1 + ' | ' + t.timeouts + ' | ' + t.failed + ' |');
});
md.push('');
md.push('locked invocations ' + out.lockedInvocations + ' (' + out.singleItemInvocations + ' one item each, ' + out.compounds + ' compounds); ' +
  'lock wait total ' + out.lockWaitSeconds.toFixed(0) + ' s, longest ' + out.longestLockWaitSeconds + ' s, waits over 20 minutes ' +
  out.waitsOver20Minutes + '; unexecuted items ' + out.unexecuted + '; timeouts ' + out.timeouts);
md.push('');
md.push('| compound | started | outcome | node s | total s | lock wait s |');
md.push('|---|---|---|---:|---:|---:|');
compounds.forEach((c) => md.push('| ' + c.compound + ' | ' + c.started + ' | ' + c.outcome + ' | ' + c.nodeSeconds + ' | ' + c.totalSeconds + ' | ' + c.lockWaitSeconds + ' |'));
fs.writeFileSync(path.join(EVIDENCE, 'commands.md'), md.join('\r\n') + '\r\n');
console.log(md.slice(0, md.length > 12 ? 12 : md.length).join('\n'));
