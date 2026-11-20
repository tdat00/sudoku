#!/usr/bin/env node
'use strict';

/*
 * MS05b3: merges the manifest (written before any cell ran), the run records (runs.jsonl, one line per command of the
 * sequencer) and the transcripts into docs/difficulty-v3/evidence/MS05b3/outcomes.json and deferred-cv3.json (new
 * files), and prints the per-level tables. Reads only; no generation.
 *   node tests/artifacts/difficulty-v3/MS05b3/finalize.js [--print]
 */
const fs = require('fs');
const path = require('path');
const parity = require('./parity.js');

const EVID = path.join(parity.REPO, 'docs', 'difficulty-v3', 'evidence', 'MS05b3');
const read = (name) => parity.readText(path.join(EVID, name));
const manifest = JSON.parse(read('manifest.json'));
const runs = fs.existsSync(path.join(EVID, 'runs.jsonl')) ? read('runs.jsonl').split(/\r?\n/).filter(Boolean)
  .map((line) => JSON.parse(line)) : [];

// The milliseconds of every request, per cell, from the `corpus <key>: N requests, ms [...]` lines of the
// transcripts: the last attempt of the cell (an escalated attempt that was stopped is discarded).
const requestMs = {};
const transcripts = fs.readdirSync(path.join(EVID, 'transcripts')).filter((n) => n.endsWith('.txt')).sort();
transcripts.forEach((name) => {
  let id = null;
  let lines = [];
  read(path.join('transcripts', name)).split(/\r?\n/).forEach((line) => {
    let m = /^== CELL (\S+) /.exec(line);
    if (m) { id = m[1]; lines = []; return; }
    if (/^== ESCALATE /.test(line)) { lines = []; return; }
    m = /^corpus (\S+): (\d+) requests, ms (\[.*\])$/.exec(line);
    if (m && id) { lines.push({ key: m[1], requests: Number(m[2]), ms: JSON.parse(m[3]) }); return; }
    if (/^== END /.test(line) && id) { requestMs[id] = lines; id = null; }
  });
});

const last = {};
runs.forEach((r) => { if (r.outcome === 'ran' || r.outcome === 'deferred' || r.outcome === 'preflight-failed') last[r.id] = r; });

// The same classification as run-cells.ps1 (Get-Class), applied again to the recorded error: a record made before
// the pattern of the hit-rate message was corrected ("to be > 16" as well as "to be greater than 16") is
// reclassified here, with the class it had at run time kept next to it.
function classOf(cell, run) {
  if (run.status === 'pass') return 'pass';
  if (!run.error) return run.class;
  const msg = String(run.error.message);
  if (/budget\.exceeded|budget\.cancelled|GenerationError/.test(String(run.error.name) + ' ' + msg)) {
    return 'availability-request-guard';
  }
  if (cell.kind === 'cv3' && /none of \d+ puzzles hit it$/.test(msg)) return 'availability-none-hit';
  const m = /to be (?:>=?|greater than(?: or equal to)?) ([\d.]+)$/.exec(msg);
  if (cell.kind === 'i5' && m) {
    const want = cell.suite === 'killer' ? 0.8 * cell.requests : 0.9;
    if (Math.abs(Number(m[1]) - want) < 1e-9) return 'availability-hit-rate';
  }
  return run.class === 'timeout' || run.class === 'incomplete' ? run.class : 'review';
}

const outcomes = manifest.cells.map((cell) => {
  const run = last[cell.id];
  const out = {
    id: cell.id, kind: cell.kind, suite: cell.suite, variantId: cell.variantId, level: cell.level,
    filter: cell.filter, fullName: cell.fullName, generation: cell.generation, requests: cell.requests,
    seeds: cell.seeds, trace: cell.trace, options: cell.options, budgetMs: cell.budgetMs,
    manifestProjectionSeconds: cell.projection.seconds, manifestProjectionBasis: cell.projection.basis,
    r5mOccurrences: cell.projection.r5mOccurrences, listPath: cell.listPath, resultsPath: cell.resultsPath
  };
  if (!run) return Object.assign(out, { state: 'not-run' });
  Object.assign(out, {
    state: run.outcome, projectionSeconds: run.projectionSeconds, projectionBasis: run.projectionBasis,
    slot: run.slot, escalated: run.escalated, exit: run.exit, processSeconds: run.processSeconds,
    lockWaitSeconds: run.lockWaitSeconds, wallSeconds: run.wallSeconds, selectedTotal: run.selectedTotal,
    preflightSelectedTotal: run.preflight && run.preflight.selectedTotal, status: run.status,
    class: run.outcome === 'ran' ? classOf(cell, run) : undefined, classAtRun: run.class,
    testMs: run.testMs, perRequestSeconds: run.perRequestSeconds, error: run.error, reason: run.reason,
    sourceHash: run.sourceHash, complete: run.complete, failure: run.failure
  });
  if (requestMs[cell.id] && requestMs[cell.id].length > 0) {
    out.requestMs = requestMs[cell.id].map((e) => e.ms).reduce((a, b) => a.concat(b), []);
    out.requestMsCount = out.requestMs.length;
  }
  return out;
});

const notRun = outcomes.filter((o) => o.state === 'not-run' || o.state === 'deferred');
const deferred = notRun.map((o) => ({
  id: o.id, variantId: o.variantId, level: o.level, kind: o.kind, state: o.state, filter: o.filter,
  requests: o.requests, seeds: o.seeds, trace: o.trace, budgetMs: o.budgetMs, projectionSeconds:
    o.projectionSeconds === undefined ? o.manifestProjectionSeconds : o.projectionSeconds,
  reason: o.reason || 'not launched',
  itemRoute: 'MS07e, then MS18c (availability) or MS18d (cost)'
}));

const counts = {};
outcomes.forEach((o) => { const key = o.state === 'ran' ? o.class : o.state; counts[key] = (counts[key] || 0) + 1; });

// The per-cell tables of outcomes.md.
function seconds(value) { return value === undefined || value === null ? '' : value.toFixed(2); }
function median(list) {
  const s = list.slice().sort((a, b) => a - b);
  return s.length === 0 ? null : s[Math.floor((s.length - 1) / 2)];
}
function outcomeText(o) {
  if (o.state === 'not-run') return 'not run';
  if (o.state === 'deferred') return 'deferred';
  if (o.state === 'preflight-failed') return 'preflight failed';
  if (o.class === 'pass') return 'pass';
  const m = o.error ? /(?:expected ([\d.]+) to be (?:>=?|greater than(?: or equal to)?) ([\d.]+)|none of (\d+) puzzles)/
    .exec(o.error.message) : null;
  const detail = m ? (m[3] ? '0 of ' + m[3] + ' hit' : 'got ' + m[1] + ', needs more than ' + m[2]) : '';
  return o.class + (detail ? ' (' + detail + ')' : '');
}
function row(o) {
  const ms = o.requestMs || [];
  return '| ' + [o.level === null ? 'refusals' : o.level, o.requests, o.generation && o.generation.indexOf('none') === 0 ?
    'none' : o.seeds.length > 24 ? o.seeds.split(',')[0] + '..' + o.seeds.split(',').pop() : o.seeds,
  outcomeText(o), seconds(o.testMs / 1000), o.slot ? o.slot + (o.escalated ? ' (escalated)' : '') : '',
  o.lockWaitSeconds === undefined ? '' : seconds(o.lockWaitSeconds), ms.length === 0 ? '' :
    Math.min.apply(null, ms) + ' / ' + median(ms) + ' / ' + Math.max.apply(null, ms)].join(' | ') + ' |';
}
const HEAD = '| Level | Requests | Seeds | Outcome | Test s | Slot | Lock wait s | Request ms (min / median / max) |\r\n' +
  '|---|---:|---|---|---:|---|---:|---|';
const md = ['# MS05b3 outcomes, per cell (generated by finalize.js from manifest.json, runs.jsonl and the ' +
  'transcripts; read outcomes.json for every field)', ''];
const groups = [];
outcomes.forEach((o) => {
  const key = o.kind === 'i5' ? 'I5 ' + o.suite + (o.suite === 'extra-regions' ? ' ' + o.variantId : '') :
    'CV3 ' + o.variantId;
  let g = groups.find((x) => x.key === key);
  if (!g) { g = { key: key, rows: [] }; groups.push(g); }
  g.rows.push(o);
});
groups.forEach((g) => {
  md.push('## ' + g.key, '', HEAD);
  g.rows.forEach((o) => md.push(row(o)));
  md.push('');
});

const doc = {
  schema: 1, kind: 'manual-corpus-outcomes', task: 'MS05b3', cells: outcomes.length, counts: counts,
  note: 'One row per cell of manifest.json; the last run record of the cell. `class`: pass; availability-hit-rate ' +
    '(the unchanged hit-rate assertion failed), availability-none-hit (CV3: none of N puzzles hit it), ' +
    'availability-request-guard, timeout, review (needs a person) or incomplete. `requestMs`: the time of every ' +
    'request, from the SG_CORPUS_TIMES line of the transcript.',
  outcomes: outcomes
};
if (process.argv.indexOf('--print') === -1) {
  fs.writeFileSync(path.join(EVID, 'outcomes.json'), parity.json(doc), { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(path.join(EVID, 'outcomes.md'), md.join('\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(path.join(EVID, 'deferred-cv3.json'), parity.json({
    schema: 1, kind: 'deferred-cv3', task: 'MS05b3',
    note: 'Cells of manifest.json that were not launched, with their full request population. None is a pass.',
    deferred: deferred
  }), { encoding: 'utf8', flag: 'wx' });
}
console.log(JSON.stringify(counts));
console.log('not run or deferred: ' + deferred.length);
outcomes.forEach((o) => {
  const ms = o.requestMs ? ' [' + o.requestMs.join(',') + ']' : '';
  console.log([o.id, o.state === 'ran' ? o.class : o.state, o.requests + ' req', o.testMs === undefined ? '' :
    (o.testMs / 1000).toFixed(2) + ' s', o.slot || '', o.escalated ? 'escalated' : '', o.error ?
      o.error.message.slice(0, 80) : ''].join(' | ') + ms);
});
