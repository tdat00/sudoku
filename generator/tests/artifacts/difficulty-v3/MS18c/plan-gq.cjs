'use strict';

/*
 * MS18c Stage 1 task-owned planner: builds the 135-row preflight of the GQ cells from the declarations and
 * the identities of the tree, file-only. It generates no puzzle, runs no solver, qualifier, probe or pilot,
 * edits no source and emits no approval (every row is `awaiting Stage 2`). The only files it can write are
 * the three outputs below, put in place whole (`.part`, then renamed), and only when every check passes.
 *
 *   node generator/tests/artifacts/difficulty-v3/MS18c/plan-gq.cjs           print the summary only
 *   node generator/tests/artifacts/difficulty-v3/MS18c/plan-gq.cjs --write   write the three outputs
 *   node generator/tests/artifacts/difficulty-v3/MS18c/plan-gq.cjs --check   recompute and compare the
 *                                                                         written outputs byte for byte
 *
 * Outputs in docs/difficulty-v3/evidence/MS18c/preflight/: gq-cells.json (the 135 rows), gq-cells.md (the
 * same numbers as a table) and hash-audit.json (every hashed file, the recipes, the baseline comparison).
 * Exit code: 0; 1 when a check fails or a written output differs (--check); 2 for a usage error.
 */
const fs = require('fs');
const path = require('path');
const rules = require('./rules.cjs');
const inputs = require('./inputs.cjs');

const OUT = path.join(inputs.REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c', 'preflight');
const NAMES = { cells: 'gq-cells.json', table: 'gq-cells.md', hashes: 'hash-audit.json' };

// The identities the brief ("Baseline identities") computed file-only at 14d8c903 by the same recipes.
const BRIEF_BASELINES = Object.freeze({
  engineSources: '0ca29eaeebc295b6', sourceFileCount: 46,
  qualifierHash: 'c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77'
});

const RECIPES = Object.freeze({
  source: 'engine.sources = first 16 hex of SHA-256 over the bytes of the files of SOURCE_FILES in ' +
    'generator/tests/node-runner.js (js/ui and js/worker skipped, missing files skipped), in that order, ' +
    'no separator (tests/qualify.js sourceFiles + sourcesHash)',
  tool: 'qualifierHash = SHA-256 over generator/tests/qualify.js bytes, NUL, generator/tests/fixtures/' +
    'qualification-records.js bytes, NUL (tests/qualify.js qualifierHash)',
  attemptPolicy: 'the object { function: "SG.digger.defaultMaxAttempts", explicitMaxAttempts: false, ' +
    'sources: { file: SHA-256 of its bytes } } of tests/qualify.js attemptPolicy for POLICY_FILES; ' +
    'digest = SHA-256 of its canonical text (sorted keys, as the records helper canon): the digest is ' +
    'this task\'s own, the qualifier compares the object',
  machine: 'the object of tests/qualify.js machineInfo(4): { cpu, logicalProcessors, memoryGb, platform, ' +
    'node, jobs }; digest = SHA-256 of its canonical text',
  node: 'process.version of the Node that runs this planner (the Node the locked runner starts is the ' +
    'first `node` on PATH; the qualifier workers use process.execPath)'
});

function collect() {
  const problems = [];
  const lib = inputs.recordsConstants();
  const decl = inputs.loadDeclarations();
  const source = inputs.sourceIdentity();
  const tool = inputs.toolIdentity();
  const policy = inputs.attemptPolicyIdentity();
  const node = inputs.nodeIdentity();
  const machine = inputs.machineIdentity(rules.PROTOCOL.jobs);
  const gitFacts = inputs.gitFacts();
  const manifest = inputs.manifestMechanics();
  const pack = inputs.packFacts();
  pack.changedSinceDispatchBase.filter((f) => !/^(tasks|docs)\//.test(f)).forEach((f) => {
    problems.push('HEAD changed ' + f + ' since the dispatch base: not a pack-only move');
  });
  inputs.crossChecks(decl, lib).forEach((p) => problems.push('cross-check: ' + p));
  const baselines = [
    { name: 'engine.sources', brief: BRIEF_BASELINES.engineSources, recomputed: source.engineSources },
    { name: 'source file count', brief: BRIEF_BASELINES.sourceFileCount, recomputed: source.fileCount },
    { name: 'qualifierHash', brief: BRIEF_BASELINES.qualifierHash, recomputed: tool.qualifierHash }
  ].map((b) => Object.assign(b, { match: b.brief === b.recomputed }));
  baselines.filter((b) => !b.match).forEach((b) => {
    problems.push('baseline ' + b.name + ' differs from the brief');
  });
  if (machine.object.node !== node.version) problems.push('machine.node differs from process.version');
  const expanded = {
    source: { engineSources: source.engineSources, fileCount: source.fileCount, recipe: RECIPES.source },
    tool: { qualifierHash: tool.qualifierHash, files: tool.files, recipe: RECIPES.tool },
    attemptPolicy: { digest: policy.digest, object: policy.object, recipe: RECIPES.attemptPolicy },
    node: Object.assign({ recipe: RECIPES.node }, node),
    machine: {
      digest: machine.digest, object: machine.object, osVersion: machine.osVersion, arch: machine.arch,
      recipe: RECIPES.machine
    }
  };
  const base = {
    stage: 'Stage 1 preflight (file-only)', head: gitFacts.head, headShort: gitFacts.headShort,
    headParent: pack.headParent, dispatchBase: pack.dispatchBase,
    changedSinceDispatchBase: pack.changedSinceDispatchBase,
    briefBlobAtDispatchBase: pack.files[0].blobAtDispatchBase, briefBlobAtHead: pack.files[0].blobAtHead,
    branch: gitFacts.branch, ratingVersion: decl.ratingVersion,
    sizeSource: 'SG.variants.cellCountOf(def): the registry\'s static size; the built-model count is the ' +
      'quick test variants-registry MS05r5p-T01, not run here'
  };
  const boards = {};
  decl.order.forEach((id) => {
    boards[id] = { cellCount: decl.boards[id].cellCount, digits: decl.boards[id].digits };
  });
  const doc = rules.buildDocument(boards, expanded, base);
  rules.validateRows(doc.rows).forEach((p) => problems.push('rows: ' + p));
  rules.approvalOffences(doc).forEach((w) => problems.push('approval-like content at ' + w));
  const audit = {
    schema: 'MS18c-hash-audit-v1', head: gitFacts.head, headShort: gitFacts.headShort,
    branch: gitFacts.branch, pack: pack, recipes: RECIPES, baselines: baselines,
    source: { engineSources: source.engineSources, files: source.files },
    tool: { qualifierHash: tool.qualifierHash, files: tool.files },
    attemptPolicy: { digest: policy.digest, object: policy.object, files: policy.files },
    node: node,
    machine: {
      digest: machine.digest, object: machine.object, osVersion: machine.osVersion, arch: machine.arch,
      totalMemoryBytes: machine.totalMemoryBytes
    },
    git: { autocrlf: gitFacts.autocrlf, safecrlf: gitFacts.safecrlf },
    manifestCheckMechanics: manifest,
    declarations: {
      ratingVersion: decl.ratingVersion, registryOrder: decl.order,
      variants: decl.order.map((id) => Object.assign({ id: id }, decl.boards[id], {
        budgetSeconds: rules.budgetSecondsOf(decl.boards[id].cellCount) }))
    }
  };
  return {
    doc: doc, audit: audit, problems: problems, loadMs: decl.loadMs, git: gitFacts, manifest: manifest
  };
}

const crlf = (text) => text.replace(/\r?\n/g, '\r\n') + '\r\n';

function render(result) {
  return {
    [NAMES.cells]: rules.renderJson(result.doc),
    [NAMES.table]: rules.renderMarkdown(result.doc),
    [NAMES.hashes]: crlf(JSON.stringify(result.audit, null, 2))
  };
}

/** Puts every text in place whole: `.part` files first, renamed only when all of them were written. */
function writeAll(texts) {
  fs.mkdirSync(OUT, { recursive: true });
  const names = Object.keys(texts);
  try {
    names.forEach((name) => fs.writeFileSync(path.join(OUT, name + '.part'), texts[name], 'utf8'));
    names.forEach((name) => fs.renameSync(path.join(OUT, name + '.part'), path.join(OUT, name)));
  } finally {
    names.forEach((name) => fs.rmSync(path.join(OUT, name + '.part'), { force: true }));
  }
}

function summary(result) {
  const doc = result.doc;
  const id = doc.identities;
  const lines = [];
  lines.push('MS18c Stage 1 planner: ' + doc.rows.length + ' rows, method ' + doc.method + ', binding "' +
    doc.binding + '"');
  lines.push('HEAD ' + result.git.head + ' (' + result.git.branch + '), declarations loaded in ' +
    result.loadMs.toFixed(0) + ' ms');
  lines.push('dispatch base ' + doc.base.dispatchBase + ', HEAD parent ' + doc.base.headParent +
    ', changed since the base: ' + doc.base.changedSinceDispatchBase.join(', '));
  lines.push('brief blob at the base ' + doc.base.briefBlobAtDispatchBase + ', at HEAD ' +
    doc.base.briefBlobAtHead);
  lines.push('source ' + id.source.engineSources + ' (' + id.source.fileCount + ' files)');
  lines.push('tool ' + id.tool.qualifierHash);
  lines.push('attempt policy ' + id.attemptPolicy.digest);
  lines.push('Node ' + id.node.version + ', machine ' + id.machine.digest);
  doc.table.forEach((c) => {
    lines.push('class ' + c.b + ' s: ' + c.cells + ' cells, P ' + c.P + ' A ' + c.A + ' T ' + c.T +
      ' O ' + c.O);
  });
  const s = doc.structuralSums;
  lines.push('structural sums over ' + s.cells + ' cells: P ' + s.P + ' A ' + s.A + ' T ' + s.T + ' O ' +
    s.O);
  lines.push('manifest at HEAD: ' + (result.manifest.existsAtHead ? 'PRESENT' : 'absent') +
    '; hash-object == HEAD blob on both qualifier files: ' + result.manifest.allProbesEqual);
  if (result.git.entriesOutsideStage1Paths.length > 0) {
    lines.push('NOTE: git status entries outside the Stage 1 paths: ' +
      result.git.entriesOutsideStage1Paths.join(' | '));
  }
  lines.push(result.problems.length === 0 ? 'checks: all passed' : 'checks: ' + result.problems.length +
    ' PROBLEM(S): ' + result.problems.join(' | '));
  return lines;
}

function main(argv) {
  const bad = argv.filter((a) => a !== '--write' && a !== '--check');
  if (bad.length > 0 || argv.length > 1) {
    console.error('usage: plan-gq.cjs [--write | --check]');
    return 2;
  }
  const result = collect();
  summary(result).forEach((line) => console.log(line));
  if (result.problems.length > 0) return 1;
  const texts = render(result);
  if (argv[0] === '--write') {
    writeAll(texts);
    console.log('wrote ' + Object.keys(texts).map((n) => 'preflight/' + n).join(', '));
  } else if (argv[0] === '--check') {
    const differ = Object.keys(texts).filter((name) => {
      const file = path.join(OUT, name);
      return !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== texts[name];
    });
    console.log(differ.length === 0 ? 'check: the written outputs equal a fresh computation' :
      'check: DIFFERENT or missing: ' + differ.join(', '));
    return differ.length === 0 ? 0 : 1;
  }
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { collect, render, BRIEF_BASELINES, RECIPES, NAMES };
