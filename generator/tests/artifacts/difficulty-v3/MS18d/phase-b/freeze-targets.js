'use strict';

/*
 * MS18d Phase B task-owned and READ-ONLY (it writes only its --json file): the freeze of the target table
 * before any GG shard runs. It loads the declarations the way Phase A's project-gp.js did (replay-fixtures
 * loadFixtures, never perf.js, nothing is generated) and records:
 *  - all 135 target positions (15 variants x 9 levels; a positive number for the 79 offered cells, null for
 *    the 56 others) and a SHA-256 of their canonical text;
 *  - the diff to Phase A's frozen preflight (gp-preflight.json, which it only reads and whose bytes it
 *    binds): exactly the 17 reviewed updates (old, new, q, predecessor, ceil(3q), budget, rule) and the 62
 *    retained targets, every position equal to the reviewed `proposedTarget`;
 *  - the source identities: producer sources, qualifier hash, E hash-family identity (must have changed),
 *    replay identity (must NOT have changed), the raw hashes of perf.js, perf-helper.js and tool-records.js;
 *  - the design.md section 9.1 table, parsed back to milliseconds (exact to the integer millisecond),
 *    compared with the frozen positions, and the cells in bold compared with the 17 updates;
 *  - the retained budgets of the manual suites (BUDGET_MS) and of the mega suite, compared with the frozen
 *    targets of the offered levels: the rows that differ, checked against the documented list, and whether
 *    design.md and both developer guides state each pair.
 *   node tests/artifacts/difficulty-v3/MS18d/phase-b/freeze-targets.js
 *        --preflight=<gp-preflight.json> --json=<targets-frozen.json>
 * Exit code 0: everything agrees; 1: something differs (a QUESTION, not a correction); 2: invalid input.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const gp = require('../project-gp.js');

const GENERATOR = path.resolve(__dirname, '..', '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');
const PHASE_A_PREFLIGHT_SHA =
  '74FFD94DA77055EDE5CCAA967CF727AE80A4682647C8B472586993FC8AB869FC'.toLowerCase();

// The rows of the retained budgets that differ from the frozen targets of an offered level (the documented
// list of design.md 15.1 and both developer guides): file, variant, level, retained ms, frozen target ms.
const DOCUMENTED_CV6 = [
  ['killer.test.js', 'killer', 'normal', 700, 5425],
  ['jigsaw.test.js', 'jigsaw9', 'easy', 350, 1905],
  ['jigsaw.test.js', 'jigsaw9', 'hell2', 5000, 10000],
  ['wordoku.test.js', 'wordoku', 'easy', 250, 2921],
  ['extra-regions.test.js', 'diagonalX+hyper', 'normal', 200, 1573],
  ['extra-regions.test.js', 'diagonalX+hyper', 'nightmare', 3000, 10000],
  ['difficulty.test.js', 'classic9', 'easy', 150, 2342],
  ['difficulty.test.js', 'classic9', 'normal', 150, 2627],
  ['difficulty.test.js', 'classic9', 'expert', 600, 1323],
  ['difficulty.test.js', 'classic9', 'nightmare', 2500, 8377],
  ['mega.test.js', 'mega12', 'nightmare', 3000, 18842]
];

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readText = (abs) => fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');

/** `< 2.342 s`, `< 31 ms`, `**< 30 s**` -> { ms, bold }; the decimals are read as text, never as floats. */
function parseTarget(cell) {
  const text = cell.trim();
  if (text === '\u2014') return { ms: null, bold: false };
  const m = /^(\*\*)?<\s*(\d+)(?:\.(\d+))?\s*(ms|s)(\*\*)?$/.exec(text);
  if (!m || (m[1] === undefined) !== (m[5] === undefined)) throw new Error('not a target: ' + cell);
  const fraction = m[3] || '';
  if (m[4] === 'ms') {
    if (fraction !== '') throw new Error('milliseconds with decimals: ' + cell);
    return { ms: Number(m[2]), bold: m[1] !== undefined };
  }
  if (fraction.length > 3) {
    throw new Error('more than three decimals of seconds, not exact to the ms: ' + cell);
  }
  return { ms: Number(m[2]) * 1000 + Number(fraction.padEnd(3, '0')), bold: m[1] !== undefined };
}

/** The table of design.md 9.1 (header row to the first non-row line): { variant: { level: {ms, bold} } }. */
function parseDesignTable(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\| Variant \| veryEasy \|/.test(l));
  if (start === -1) throw new Error('the 9.1 table is not in design.md');
  const levels = lines[start].split('|').slice(2, -1).map((c) => c.trim());
  const rows = {};
  for (let i = start + 2; i < lines.length && /^\|/.test(lines[i]); i++) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    const variant = cells[0].replace(/`/g, '');
    rows[variant] = {};
    levels.forEach((level, k) => { rows[variant][level] = parseTarget(cells[k + 1]); });
  }
  return { levels, rows };
}

/** A budget table written as an object literal in a test file (data only), evaluated without any context. */
function literalAfter(text, pattern) {
  const m = pattern.exec(text);
  if (!m) throw new Error('literal not found: ' + pattern);
  return JSON.parse(JSON.stringify(vm.runInNewContext('(' + m[1] + ')', {}, { timeout: 1000 })));
}

const group = (n, sep) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

/** The documented pair as the English guide and design.md write it, and as the Vietnamese guide does. */
const pairText = (retained, target, sep) => group(retained, sep) + ' \u2192 ' + group(target, sep);

/**
 * The retained budget rows of the suites that differ from the frozen target of an offered level.
 * `suites`: [{ file, kind, text }], `published`: { variant: [levels] },
 * `targets`: { variant: { level: ms } }.
 */
function retainedDifferences(suites, published, targets) {
  const out = [];
  const offered = (variant, level) => published[variant].indexOf(level) !== -1;
  suites.forEach((suite) => {
    if (suite.file === 'mega.test.js') {
      const boards = literalAfter(suite.text, /var BOARDS = (\{[\s\S]*?\n {2}\});/);
      ['mega12', 'mega16'].forEach((variant) => {
        Object.keys(boards[variant].budgets).forEach((level) => {
          if (offered(variant, level) && boards[variant].budgets[level] !== targets[variant][level]) {
            out.push([suite.file, variant, level, boards[variant].budgets[level], targets[variant][level]]);
          }
        });
      });
      return;
    }
    const budget = literalAfter(suite.text, /var BUDGET_MS = (\{[\s\S]*?\});/);
    const variants = suite.variants;
    Object.keys(budget).forEach((level) => {
      const have = variants.filter((v) => offered(v, level));
      if (have.length === 0) return;
      const target = Math.max.apply(null, have.map((v) => targets[v][level]));
      if (budget[level] !== target) out.push([suite.file, have.join('+'), level, budget[level], target]);
    });
  });
  return out;
}

const keyOf = (row) => row.slice(0, 3).join('/') + ':' + row[3] + '>' + row[4];

const SUITES = [
  ['killer.test.js', ['killer']], ['jigsaw.test.js', ['jigsaw9']], ['wordoku.test.js', ['wordoku']],
  ['greater-than.test.js', ['greaterThan']], ['extra-regions.test.js', ['diagonalX', 'hyper']],
  ['difficulty.test.js', ['classic9']], ['mega.test.js', ['mega12', 'mega16']]
];

function main(argv, io) {
  const env = Object.assign({ out: console.log, err: console.error, cwd: process.cwd(), repo: REPO },
    io || {});
  const problems = [];
  try {
    const opts = { preflight: null, json: null };
    argv.forEach((arg) => {
      let m;
      if ((m = /^--preflight=(.+)$/.exec(arg))) opts.preflight = m[1];
      else if ((m = /^--json=(.+)$/.exec(arg))) opts.json = m[1];
      else throw new gp.InputError(['unknown argument ' + arg]);
    });
    if (!opts.preflight || !opts.json) throw new gp.InputError(['usage: --preflight=<file> --json=<file>']);
    const preflightFile = path.resolve(env.cwd, opts.preflight);
    const jsonFile = path.resolve(env.cwd, opts.json);
    if (path.relative(env.repo, jsonFile).startsWith('..')) {
      throw new gp.InputError(['--json must be inside the repo']);
    }
    if (!fs.existsSync(preflightFile)) throw new gp.InputError(['missing ' + opts.preflight]);
    const preflightBytes = fs.readFileSync(preflightFile);
    const preflight = JSON.parse(preflightBytes.toString('utf8'));
    if (sha256(preflightBytes) !== PHASE_A_PREFLIGHT_SHA) {
      problems.push('the Phase A preflight is not the frozen file');
    }

    const replayFixtures = require(path.join(GENERATOR, 'tests', 'replay-fixtures.js'));
    const decl = gp.loadDeclarations(replayFixtures.loadFixtures,
      GENERATOR);
    const records = gp.loadRecords(GENERATOR);
    const variants = Array.from(records.VARIANTS);
    const levels = decl.targetLevels;
    const positions = [];
    variants.forEach((variant) => levels.forEach((level) => {
      const target = decl.targets[variant][level];
      const active = decl.published[variant].indexOf(level) !== -1;
      if (active !== (target !== undefined)) {
        problems.push(variant + '/' + level + ': target and offer disagree');
      }
      positions.push({ key: variant + '/' + level, variant, level,
        target: target === undefined ? null : target });
    }));
    const active = positions.filter((p) => p.target !== null);

    const rows = new Map(preflight.targetProposal.rows.map((r) => [r.key, r]));
    const updates = [];
    active.forEach((p) => {
      const row = rows.get(p.key);
      if (!row) return problems.push(p.key + ': not in the Phase A table');
      if (p.target !== row.proposedTarget) {
        return problems.push(p.key + ': live ' + p.target + ' differs from the reviewed ' +
          row.proposedTarget);
      }
      if (row.action === 'update') {
        updates.push({ key: p.key, old: row.oldTarget, target: p.target, q: row.q,
          predecessor: row.predecessor,
          ceil3q: row.ceil3q, budget: row.budget, decidedBy: row.decidedBy });
      }
    });
    if (rows.size !== active.length) {
      problems.push('the Phase A table has ' + rows.size + ' rows, not ' + active.length);
    }
    const retained = active.length - updates.length;

    const identities = gp.computeIdentities(GENERATOR);
    const was = gp.ACCEPTED;
    if (identities.sources !== was.publicationSources) problems.push('the producer sources changed');
    if (identities.qualifierHash !== was.qualifierHash) problems.push('the qualifier hash changed');
    if (identities.replayIdentity !== was.replayIdentity) {
      problems.push('the replay identity CHANGED (not expected)');
    }
    if (identities.hashIdentity === was.hashIdentity) {
      problems.push('the hash identity did not change (expected)');
    }
    if (identities.files['tests/perf.js'] !== was.perfJsSha256) problems.push('perf.js changed');
    if (identities.files['tests/fixtures/tool-records.js'] !== was.toolRecordsSha256) {
      problems.push('tool-records.js changed');
    }
    if (identities.files['tests/fixtures/perf-helper.js'] === was.perfHelperSha256) {
      problems.push('perf-helper.js is unchanged');
    }

    const designText = readText(path.join(GENERATOR, 'design.md'));
    const design = parseDesignTable(designText);
    const designBold = [];
    const beforeDesign = problems.length;
    positions.forEach((p) => {
      const cell = design.rows[p.variant] && design.rows[p.variant][p.level];
      if (!cell) return problems.push(p.key + ': not in the design table');
      if (cell.ms !== p.target) problems.push(p.key + ': design.md says ' + cell.ms + ', frozen ' + p.target);
      if (cell.bold) designBold.push(p.key);
    });
    if (designBold.slice().sort().join() !== updates.map((u) => u.key).sort().join()) {
      problems.push('the bold cells of the design table are not the 17 updates');
    }
    const designAgrees = problems.length === beforeDesign;

    const suites = SUITES.map(([file, vs]) => ({
      file, variants: vs,
      text: readText(path.join(GENERATOR, 'tests', file.startsWith('mega') ? 'suites' : 'manual', file))
    }));
    const differing = retainedDifferences(suites, decl.published, decl.targets);
    const documented = DOCUMENTED_CV6.map(keyOf).sort();
    const found = differing.map(keyOf).sort();
    if (documented.join('|') !== found.join('|')) {
      problems.push('the retained budgets that differ are not the documented ones');
    }
    const guides = { design: designText, en: readText(path.join(env.repo, 'DEVELOPERGUIDE.md')),
      vi: readText(path.join(env.repo, 'DEVELOPERGUIDE.vn.md')) };
    const stated = DOCUMENTED_CV6.map((row) => ({
      row: row.slice(0, 5), design: designText.indexOf(pairText(row[3], row[4], ',')) !== -1,
      en: guides.en.indexOf(pairText(row[3], row[4], ',')) !== -1,
      vi: guides.vi.indexOf(pairText(row[3], row[4], '.')) !== -1
    }));
    stated.filter((s) => !(s.design && s.en && s.vi))
      .forEach((s) => problems.push('a document does not state ' + s.row.join(' ')));

    const table = positions.map((p) => p.key + '=' + p.target).join('\n');
    const output = {
      schema: 1, kind: 'ms18d-phase-b-targets-frozen',
      note: 'Frozen before any GG shard. A rule applied to qualification data, not a measurement.',
      counts: { positions: positions.length, active: active.length, absent: positions.length - active.length,
        retained, updated: updates.length },
      tableSha256: sha256(table), positions, updates,
      phaseA: { file: path.relative(env.repo, preflightFile).replace(/\\/g, '/'),
        sha256: sha256(preflightBytes) },
      identities: { sources: identities.sources, qualifierHash: identities.qualifierHash,
        hashIdentity: identities.hashIdentity, hashIdentityBefore: was.hashIdentity,
        replayIdentity: identities.replayIdentity, replayIdentityBefore: was.replayIdentity,
        files: identities.files },
      designTable: { cells: positions.length, bold: designBold.length, equalToFrozen: designAgrees },
      retainedBudgets: { differing, documented: DOCUMENTED_CV6, statedIn: stated },
      problems
    };
    fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
    const outText = JSON.stringify(output, null, 2).replace(/\n/g, '\r\n') + '\r\n';
    fs.writeFileSync(jsonFile + '.part', outText, 'utf8');
    fs.renameSync(jsonFile + '.part', jsonFile);
    env.out('positions ' + positions.length + ': active ' + active.length + ', absent ' +
      (positions.length - active.length) + '; retained ' + retained + ', updated ' + updates.length);
    updates.forEach((u) => env.out('  ' + u.key + ' ' + u.old + ' -> ' + u.target + ' (' + u.decidedBy +
      ', q ' + u.q + ')'));
    env.out('table sha256 ' + output.tableSha256);
    env.out('hash identity ' + identities.hashIdentity + ' (was ' + was.hashIdentity + ')');
    env.out('replay identity ' + identities.replayIdentity +
      (identities.replayIdentity === was.replayIdentity ? ' (unchanged)' : ' (CHANGED)'));
    env.out('retained budgets that differ: ' + differing.length + ' (documented ' +
      DOCUMENTED_CV6.length + ')');
    differing.forEach((d) => env.out('  ' + d.join(' ')));
    problems.forEach((p) => env.err('DIFFERS: ' + p));
    env.out('wrote ' + path.relative(env.repo, jsonFile));
    return problems.length === 0 ? 0 : 1;
  } catch (err) {
    env.err('INVALID: ' + (err.problems ? err.problems.join('; ') : err.message));
    return 2;
  }
}

module.exports = { parseTarget, parseDesignTable, literalAfter, retainedDifferences, pairText, group, main,
  DOCUMENTED_CV6, SUITES };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
