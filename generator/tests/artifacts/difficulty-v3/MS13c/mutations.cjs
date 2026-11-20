'use strict';

/*
 * MS13c: the in-memory mutations of the grouped forcing activation in core/js/engine/tech-chain.js (S-OD11 option A, IR72).
 * Each entry replaces text fragments of that file in memory (run-mutations.cjs / mutant-run.cjs load the Generator's runner
 * with a patched fs.readFileSync, so no file on disk changes) and the tests of the chain engine (--suite=tech-chain) must fail.
 * `edits` is a list of { from, to }: every `from` has to occur exactly once in the file (check-mutations.cjs). `equivalent`
 * names the argument for a mutation that cannot change a result; such a mutation is expected to survive.
 *
 *   fallback conditions (F), stage accounting and the shared allowance (A), proof form and ownership (P), the singleton
 *   start rule (S), all-member endpoint conflicts and the graph (E), budget, window and options (B)
 */
const TARGET = 'core/js/engine/tech-chain.js';
const list = [];
function m(name, from, to, extra) {
  const edits = Array.isArray(from) ? from : [{ from: from, to: to }];
  list.push(Object.assign({ name: name, target: TARGET, edits: edits, app: 'generator', suites: 'tech-chain' }, extra || {}));
}
const N = '\r\n';

// ---- fallback conditions
m('F01 fallback after every stop (a window and a spent budget included)', 'const capped = LOCAL_CAPS.indexOf(g.stop) !== -1;',
  'const capped = g.stop !== null;');
m('F02 fallback after a completed negative', 'if (spec.fallback && capped) {',
  'if (spec.fallback && (capped || (g.stop === null && found === null))) {');
m('F03 fallback never', 'if (spec.fallback && capped) {', 'if (false) {');
m('F04 forcingChainLong falls back too', "LONG_MAX_CHAIN_LENGTH, callerMax(ctx, 'maxChainLength', LONG_MAX_CHAIN_LENGTH)),"
  + N + '      groupLimit: GROUP_NODE_LIMIT,' + N + '      workLimit: GRAPH_WORK_LIMIT,' + N + '      fallback: false',
  "LONG_MAX_CHAIN_LENGTH, callerMax(ctx, 'maxChainLength', LONG_MAX_CHAIN_LENGTH)),"
  + N + '      groupLimit: GROUP_NODE_LIMIT,' + N + '      workLimit: GRAPH_WORK_LIMIT,' + N + '      fallback: true');
m('F05 forcingChain never falls back', '      workLimit: GRAPH_WORK_LIMIT,' + N + '      fallback: true',
  '      workLimit: GRAPH_WORK_LIMIT,' + N + '      fallback: false');
m('F06 no parent-budget check before the fallback', '        ctx.check();' + N + '        fallback.entered = true;',
  '        fallback.entered = true;');
m('F07 the fallback has the grouped allowance as its limit',
  'const legacy = { id: spec.id, min: spec.min, max: spec.max, limit: NO_WORK_LIMIT };',
  'const legacy = { id: spec.id, min: spec.min, max: spec.max, limit: spec.workLimit };');
m('F08 the fallback ignores the window minimum', 'const legacy = { id: spec.id, min: spec.min,',
  'const legacy = { id: spec.id, min: 1,');
m('F09 the fallback outcome inverted', "fallback.outcome = found === null ? 'none' : 'found';",
  "fallback.outcome = found === null ? 'found' : 'none';");
m('F10 the fallback entry never noted', 'fallback.entered = true;', '');
m('F11 the domain of a fallback stays grouped', "domain = 'singleton';", "domain = 'grouped';");
m('F12 a spent budget in the fallback overwrites the cap', "if (fallback === null) g.stop = 'parent-budget';",
  "g.stop = 'parent-budget';");
m('F13 cancellation and other errors swallowed',
  "      if (!(err && err.code === 'budget.exceeded')) throw err;" + N + '      found = null;',
  '      found = null;');
m('F14 the fallback runs on a fresh result of the window (min above 1)', 'found = singletonFallback(model, state, ctx, spec, fallback);',
  'found = singletonFallback(model, state, ctx, Object.assign({}, spec, { min: spec.min + 1 }), fallback);');

// ---- stage accounting and the shared allowance
m('A01 the search restarts the counter', '        work: g.construction,', '        work: 0,');
m('A02 the search work includes the construction', 'if (r !== null) g.search = r.work - g.construction;',
  'if (r !== null) g.search = r.work;');
m('A03 the record omits the construction', 'work: g.construction + g.search + (fallback === null ? 0 : fallback.work),',
  'work: g.search + (fallback === null ? 0 : fallback.work),');
m('A04 the record omits the fallback', 'work: g.construction + g.search + (fallback === null ? 0 : fallback.work),',
  'work: g.construction + g.search,');
m('A05 the record omits the search', 'work: g.construction + g.search + (fallback === null ? 0 : fallback.work),',
  'work: g.construction + (fallback === null ? 0 : fallback.work),');
m('A06 a fresh allowance for the search', '        workLimit: spec.workLimit,', '        workLimit: spec.workLimit + g.construction,');
m('A07 the construction ignores the allowance of the call',
  '{ groupLimit: spec.groupLimit, workLimit: spec.workLimit }', '{ groupLimit: spec.groupLimit, workLimit: GRAPH_WORK_LIMIT }');
m('A08 the construction ignores the node quota of the call',
  '{ groupLimit: spec.groupLimit, workLimit: spec.workLimit }', '{ groupLimit: GROUP_NODE_LIMIT, workLimit: spec.workLimit }');
m('A09 construction work cap named a node cap', "g.stop = built.capHit === 'work' ? 'construction-work'",
  "g.stop = built.capHit === 'work' ? 'construction-nodes'");
m('A10 a spent budget of the construction named a work cap', "'construction-nodes' : 'parent-budget';",
  "'construction-nodes' : 'construction-work';");
m('A11 the search cap named a construction cap', "g.stop = 'search-work';", "g.stop = 'construction-work';");
m('A12 the cap of the no-fallback call always work', "capHit = g.stop === 'construction-nodes' ? 'nodes' : 'work';",
  "capHit = 'work';");
m('A13 the limit of the record always the allowance', 'limit: spec.fallback ? null : spec.workLimit,', 'limit: spec.workLimit,');
m('A14 the cap of forcingChain published too', 'if (!spec.fallback && LOCAL_CAPS.indexOf(g.stop) !== -1) {',
  'if (LOCAL_CAPS.indexOf(g.stop) !== -1) {');
m('A15 no domain for a completed grouped call', "if (g.stop === null) domain = 'grouped';", '');
m('A16 the minimum of a capped search recorded complete', "g.minimum = 'incomplete';", "g.minimum = 'complete';");
m('A17 the additional nodes count the singletons', 'g.additional = count - adjacency.singles;', 'g.additional = count;');
m('A18 a search that ends exactly at the allowance is a cap', 'if (todo < count) r.capped = true;' + N + '    return false;' + N + '  }' + N + N + '  function groupedSearch(',
  'if (todo <= count) r.capped = true;' + N + '    return false;' + N + '  }' + N + N + '  function groupedSearch(');
m('A19 the construction allowance is one more', 'if (run.work >= run.limit) throw WORK_CAP;', 'if (run.work > run.limit) throw WORK_CAP;');
m('A20 the gate check of the search starts at zero', '        checkedAt: g.construction,', '        checkedAt: 0,',
  { equivalent: 'r.checkedAt is read only by gate(), which only groupedExpand calls; groupedExpand is reached only from groupedSearch, and scanGrouped calls that only right after assigning r.checkedAt = r.work, so the initial value is never read' });

// ---- proof form and ownership
m('P01 the node cells shared with the graph', 'return { cells: node.cells.slice(), digit: node.digit, truth: lit & 1 };',
  'return { cells: node.cells, digit: node.digit, truth: lit & 1 };');
m('P02 the union cells unsorted', 'cells: grouped ? cells.sort(ascending) : cells,', 'cells: cells,');
m('P03 a group proof keeps the singleton form', 'if (grouped) {', 'if (false) {');
m('P04 every proof of version 2', 'return chain.some(function (step) { return step.cells.length !== 1; });', 'return true;');
m('P05 proof version 1', 'proofVersion: 2, kind: best.kind', 'proofVersion: 1, kind: best.kind');
m('P06 the length one too many', 'length: best.length, chains: chains };', 'length: best.length + 1, chains: chains };');
m('P07 the second path of a polarity proof missing', 'const paths = best.other === null ? [best.path] : [best.path, best.other];',
  'const paths = [best.path];');
m('P08 a forced start eliminated instead of placed', 'placements = [[start.cells[0], start.digit]];',
  'eliminations = [[start.cells[0], start.digit]];');
m('P09 the endpoint eliminations unsorted', 'best.eliminated.slice().sort(ascending).map(function (node) {',
  'best.eliminated.slice().map(function (node) {');
m('P10 the truth of every step true', 'return { cells: node.cells.slice(), digit: node.digit, truth: lit & 1 };',
  'return { cells: node.cells.slice(), digit: node.digit, truth: 1 };');
m('P11 the contradiction start not the first step', 'eliminations = [[start.cells[0], start.digit]];',
  'eliminations = [[chains[0][chains[0].length - 1].cells[0], chains[0][chains[0].length - 1].digit]];');

// ---- the singleton start rule
m('S01 every start a singleton', 'r.startSingleton = startNode < r.singles;', 'r.startSingleton = true;');
m('S02 a group has a true start', 'const lastTruth = node < r.singles ? 1 : 0;', 'const lastTruth = 1;');
m('S03 polarity proofs from a group start', 'if (r.startSingleton && stamp[next ^ 1] === r.stampId) {',
  'if (stamp[next ^ 1] === r.stampId) {');
m('S04 contradiction and forced swapped', 'return groupedRecord(r, r.startTruth === 1 ? KIND_CONTRADICTION : KIND_FORCED, next, nd, null);',
  'return groupedRecord(r, r.startTruth === 1 ? KIND_FORCED : KIND_CONTRADICTION, next, nd, null);');
m('S05 endpoints from a true start', 'if (r.startTruth === 0 && node > r.startNode) {', 'if (node > r.startNode) {',
  { equivalent: 'r.mark is written only in groupedSearch for a start with truth 0, with the stamp of that very search, and the stamp rises at every search; in a search from a true start no node carries the current stamp, so commonTargets returns null and nothing is recorded: the guard is redundant' });
m('S06 an endpoint at the start node itself', 'if (r.startTruth === 0 && node > r.startNode) {',
  'if (r.startTruth === 0 && node >= r.startNode) {');
m('S07 a start with no strong link searched', 'if (truth === 0 && r.sStart[node + 1] === r.sStart[node]) continue;', '');
m('S08 the same-cell weak links after the peers', 'if (weak[k] < singles && nodes[weak[k]].cells[0] === cell) wTo[at++] = weak[k];',
  'if (weak[k] < singles && nodes[weak[k]].cells[0] !== cell) wTo[at++] = weak[k];');
m('S09 the conjugate links by descending rank', 'while (p > 0 && (rankOf[p - 1] > rank ||', 'while (p > 0 && (rankOf[p - 1] < rank ||');
m('S11 the scan order of the nodes reversed per truth', 'const lastTruth = node < r.singles ? 1 : 0;' + N + '        for (let truth = 0; truth <= lastTruth; truth++) {',
  'const lastTruth = node < r.singles ? 1 : 0;' + N + '        for (let truth = lastTruth; truth >= 0; truth--) {');
m('S12 the search never stops at a shorter bound', 'const limit = Math.min(spec.max, r.bestLength - 1);', 'const limit = spec.max;');
m('S13 a proof below the window not the answer', 'if (r.best !== null && r.bestLength < spec.min) {',
  'if (r.best !== null && r.bestLength < 0) {');
m('S14 the first proof wins (no shorter one sought)', 'if (limit < 1) {', 'if (limit < 1 || r.best !== null) {');

// ---- all-member endpoint conflicts and the graph
m('E01 an endpoint target need not see the start', 'if (j < r.singles && r.mark[j] === r.stampId) {', 'if (j < r.singles) {');
m('E02 the start marks nothing', 'if (r.wTo[k] < r.singles) r.mark[r.wTo[k]] = r.stampId;', '');
m('E03 one convenient pair of two groups', 'if (peerMatrix[a[i] * n + b[j]] === 0) return false;',
  'if (peerMatrix[a[0] * n + b[0]] === 0) return false;');
m('E04 an extra occurrence accepted in a strong group', 'occ[u * digits + d0] !== total', 'occ[u * digits + d0] < total');
m('E05 one group beyond the quota', 'if (collected.size >= groupLimit) throw GROUP_CAP;', 'if (collected.size > groupLimit) throw GROUP_CAP;');
m('E06 overlapping nodes linked', 'if (!disjointCells(x.cells, y.cells)) continue;', '');
m('E07 an intersection of one complete unit used', 'if (complete[pair.box] !== 1 || complete[pair.line] !== 1) continue;',
  'if (complete[pair.box] !== 1 && complete[pair.line] !== 1) continue;');
m('E08 a group target eliminated', 'if (j < r.singles && r.mark[j] === r.stampId) {', 'if (r.mark[j] === r.stampId) {',
  { equivalent: 'r.mark[j] equals the current stamp only for a node written by the marking loop of this search, which writes only indices below r.singles (its own condition), so j < r.singles already holds' });
m('E09 a start marks the group neighbours too', 'if (r.wTo[k] < r.singles) r.mark[r.wTo[k]] = r.stampId;',
  'r.mark[r.wTo[k]] = r.stampId;', { equivalent: 'commonTargets reads r.mark[j] only for j < r.singles (its first condition), so a mark written for a group node (index >= singles) is never read' });
m('E10 the group weak link of one shared digit only', 'if (seeEachOther(peerMatrix, n, x.cells, y.cells)) linkNodes(weak, list[a], list[b]);',
  'linkNodes(weak, list[a], list[b]);');
m('E11 a conjugate link without the cover', 'if (coverUnit(model, complete, occ, placed, digits, x, y)) linkNodes(strong, list[a], list[b]);',
  'linkNodes(strong, list[a], list[b]);');

// ---- budget, window and options
m('B01 a window with the minimum above the maximum searched', 'if (spec.max < 1 || spec.max < spec.min) {', 'if (spec.max < 1) {');
m('B02 no entry check of the search', '      ctx.check();' + N + '      const adjacency = searchAdjacency(model, state, ctx, graph);',
  '      const adjacency = searchAdjacency(model, state, ctx, graph);');
m('B03 no check before a start', '          ctx.check();' + N + '          r.checkedAt = r.work;', '          r.checkedAt = r.work;');
m('B04 no gate in the expansions', 'const end = Math.min(todo, i + WORK_CHECK_UNITS);' + N + '      gate(r, end - i);',
  'const end = Math.min(todo, i + WORK_CHECK_UNITS);');
m('B05 pieces of 512 links', 'const end = Math.min(todo, i + WORK_CHECK_UNITS);', 'const end = Math.min(todo, i + 2 * WORK_CHECK_UNITS);');
m('B06 the link that proves is not counted', 'if (groupedVisit(r, to[first + i] * 2 + tbit, lit, nd)) {' + N + '          r.work += i - from + 1;',
  'if (groupedVisit(r, to[first + i] * 2 + tbit, lit, nd)) {' + N + '          r.work += i - from;');
m('B07 a negative limit accepted by the seam', "throw invalidOption(seam, pair[0], 'must be a number of at least 0');", '');
m('B08 a fractional limit kept', 'spec[pair[1]] = Math.floor(value);', 'spec[pair[1]] = value;');
m('B09 a non-boolean fallback accepted', "if (typeof opts.fallback !== 'boolean') throw invalidOption(seam, 'fallback', 'must be true or false');", '');
m('B10 the caller maximum of forcingChain ignored', "max: Math.min(c, callerMax(ctx, 'maxChainLength', c)),", 'max: c,');
m('B11 the minimum of forcingChainLong is C', 'min: shortMax() + 1,', 'min: shortMax(),');
m('B12 the entry check of the construction missing', '  function constructGraph(model, state, ctx, groupLimit, run) {' + N + '    ctx.check();',
  '  function constructGraph(model, state, ctx, groupLimit, run) {');

module.exports = list;
