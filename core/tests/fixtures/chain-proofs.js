/**
 * Independent proof checker for the grouped chain graph (difficulty v3, R16, MS13a), exposed as SG.chainProofs and
 * shared by the chain suites. Test-only: loaded by the node runners (every fixtures/*.js is) and by tests.html. It
 * reads the model and the candidates alone, with its own definitions; nothing here uses core/js/engine/tech-chain.js,
 * so a builder or a finder that trusted its own tables would disagree with it.
 *
 * Node = { cells, digit }: `cells` ascending, distinct and non-empty, every cell open and still holding the
 * candidate `digit`; the node is true when at least one listed cell holds the digit. A step of a proof is
 * { cells, digit, truth: 0 | 1 } (proofVersion 2) or the legacy triple [cell, digit, truth], read as one cell.
 *
 *   nodeProblems(m, state, node)       what is wrong with one node (empty = a valid node)
 *   weakLinked(m, state, a, b)         "at most one is true": same digit, disjoint, EVERY cross pair of cells sees
 *                                      each other (m.peers); different digits, two singletons of one cell
 *   strongLinked(m, state, a, b)       "at least one is true": same digit, disjoint, and together exactly all the
 *                                      open occurrences of the digit in a complete unit where it is not placed;
 *                                      different digits, the two candidates of a bivalue cell
 *   expectedNodes(m, state)            { singletons, groups, nodes, raw }: every open candidate in (cell, digit)
 *                                      order, then the groups (intersections of a complete box or region with a
 *                                      complete row or column, with at least two open occurrences of a digit),
 *                                      deduplicated, sorted by the key [digit, ...cells]; `raw` is the group list
 *                                      before deduplication
 *   expectedWork(m, state)             { groups, cells, pairs, total }: the tested combinations the builder charges
 *                                      (group candidates, candidate pairs of a cell, EVERY same-digit node pair)
 *   expectedTicks(m)                   the steps of the builder's uncharged per-call scans (a function of the model)
 *   graphProblems(m, state, graph)     the complete graph of the state, node by node and edge by edge
 *   solutionProblems(m, graph, sol)    every weak and strong edge holds in a known solution
 *   targets(m, state, start, end)      the candidates weakly linked to both ends, ascending
 *   pathProblems(m, state, finding)    the proof of a chain Finding: polarity, every edge, endpoints and targets
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};

  function bitOf(digit) {
    return 1 << (digit - 1);
  }

  function ascending(a, b) {
    return a - b;
  }

  function isOpen(state, cell, digit) {
    return state.value[cell] === 0 && (state.candidates[cell] & bitOf(digit)) !== 0;
  }

  function sees(m, a, b) {
    return a !== b && m.peers[a].indexOf(b) !== -1;
  }

  function candidateCount(state, cell) {
    var count = 0;
    for (var bit = state.candidates[cell]; bit !== 0; bit &= bit - 1) count++;
    return count;
  }

  /** A complete unit has one cell per digit and is no partial all-different unit. */
  function isComplete(m, u) {
    var meta = m.unitMeta[u];
    return m.units[u].length === m.digits && !(meta && meta.partial);
  }

  function isLine(m, u) {
    var meta = m.unitMeta[u];
    return !!meta && (meta.kind === 'row' || meta.kind === 'col');
  }

  /** The units that generate groups with a line: kind 'box' or 'region' (windows and diagonals do not). */
  function isBoxRegion(m, u) {
    var meta = m.unitMeta[u];
    return !!meta && (meta.kind === 'box' || meta.kind === 'region');
  }

  function sameList(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function disjoint(a, b) {
    for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) !== -1) return false;
    return true;
  }

  function sameNode(a, b) {
    return a.digit === b.digit && sameList(a.cells, b.cells);
  }

  function describe(node) {
    return '{cells:[' + node.cells.join(',') + '],digit:' + node.digit + '}';
  }

  /** The key order of the nodes: the digit, then the cells element by element, a shorter prefix first. */
  function compareKeys(a, b) {
    if (a.digit !== b.digit) return a.digit - b.digit;
    var shorter = Math.min(a.cells.length, b.cells.length);
    for (var i = 0; i < shorter; i++) if (a.cells[i] !== b.cells[i]) return a.cells[i] - b.cells[i];
    return a.cells.length - b.cells.length;
  }

  /** What is wrong with one node of a position (empty array = a valid node). */
  function nodeProblems(m, state, node) {
    var problems = [];
    if (node === null || typeof node !== 'object' || !Array.isArray(node.cells)) return ['not a node'];
    if (!(Number.isInteger(node.digit) && node.digit >= 1 && node.digit <= m.digits)) {
      problems.push('digit ' + node.digit + ' is not 1..' + m.digits);
      return problems;
    }
    if (node.cells.length === 0) problems.push('a node needs at least one cell');
    node.cells.forEach(function (c, i) {
      if (!(Number.isInteger(c) && c >= 0 && c < m.cellCount)) problems.push('cell ' + c + ' does not exist');
      else if (!isOpen(state, c, node.digit)) problems.push('cell ' + c + ' does not hold candidate ' + node.digit);
      if (i > 0 && !(node.cells[i - 1] < c)) problems.push('cells are not ascending and distinct at ' + i);
    });
    return problems;
  }

  /** The open cells of unit u that hold the digit, ascending; null when the digit is already placed in u. */
  function occurrences(m, state, u, digit) {
    var out = [];
    var cells = m.units[u];
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (state.value[c] === digit) return null;
      if (isOpen(state, c, digit)) out.push(c);
    }
    return out.sort(ascending);
  }

  // The two relations on nodes that are already known to be valid.
  function weakRaw(m, a, b) {
    if (a.digit !== b.digit) {
      return a.cells.length === 1 && b.cells.length === 1 && a.cells[0] === b.cells[0];
    }
    if (!disjoint(a.cells, b.cells)) return false;
    for (var i = 0; i < a.cells.length; i++) {
      for (var j = 0; j < b.cells.length; j++) if (!sees(m, a.cells[i], b.cells[j])) return false;
    }
    return true;
  }

  function strongRaw(m, state, a, b, occurrencesOf) {
    if (a.digit !== b.digit) {
      return a.cells.length === 1 && b.cells.length === 1 && a.cells[0] === b.cells[0] &&
        candidateCount(state, a.cells[0]) === 2;
    }
    if (!disjoint(a.cells, b.cells)) return false;
    var union = a.cells.concat(b.cells).sort(ascending);
    for (var u = 0; u < m.units.length; u++) {
      if (!isComplete(m, u)) continue;
      var found = occurrencesOf(u, a.digit);
      if (found !== null && sameList(found, union)) return true;
    }
    return false;
  }

  function plainOccurrences(m, state) {
    return function (u, digit) { return occurrences(m, state, u, digit); };
  }

  function weakLinked(m, state, a, b) {
    return nodeProblems(m, state, a).length === 0 && nodeProblems(m, state, b).length === 0 && weakRaw(m, a, b);
  }

  function strongLinked(m, state, a, b) {
    return nodeProblems(m, state, a).length === 0 && nodeProblems(m, state, b).length === 0 &&
      strongRaw(m, state, a, b, plainOccurrences(m, state));
  }

  /** Every open candidate as a singleton, in (cell, digit) order. */
  function singletonsOf(m, state) {
    var out = [];
    for (var c = 0; c < m.cellCount; c++) {
      for (var d = 1; d <= m.digits; d++) if (isOpen(state, c, d)) out.push({ cells: [c], digit: d });
    }
    return out;
  }

  /** One group per (complete box or region, complete row or column, digit) that has at least two open occurrences. */
  function groupCandidates(m, state) {
    var out = [];
    for (var b = 0; b < m.units.length; b++) {
      if (!isComplete(m, b) || !isBoxRegion(m, b)) continue;
      for (var l = 0; l < m.units.length; l++) {
        if (!isComplete(m, l) || !isLine(m, l)) continue;
        var shared = Array.prototype.filter.call(m.units[b], function (c) {
          return m.units[l].indexOf(c) !== -1;
        }).sort(ascending);
        if (shared.length < 2) continue;
        for (var d = 1; d <= m.digits; d++) {
          var members = shared.filter(function (c) { return isOpen(state, c, d); });
          if (members.length >= 2) out.push({ cells: members, digit: d });
        }
      }
    }
    return out;
  }

  function expectedNodes(m, state) {
    var singletons = singletonsOf(m, state);
    var raw = groupCandidates(m, state);
    var groups = raw.slice().sort(compareKeys).filter(function (g, i, all) {
      return i === 0 || compareKeys(all[i - 1], g) !== 0;
    });
    return { singletons: singletons, groups: groups, nodes: singletons.concat(groups), raw: raw };
  }

  /**
   * The units the builder charges, from the nodes of the position: the group candidates before deduplication, the
   * pairs of candidates of an open cell, and EVERY pair of nodes of one digit (before any visibility test).
   */
  function expectedWork(m, state) {
    var want = expectedNodes(m, state);
    var cells = 0;
    for (var c = 0; c < m.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      var k = candidateCount(state, c);
      cells += k * (k - 1) / 2;
    }
    var perDigit = {};
    want.nodes.forEach(function (node) { perDigit[node.digit] = (perDigit[node.digit] || 0) + 1; });
    var pairs = 0;
    Object.keys(perDigit).forEach(function (digit) { pairs += perDigit[digit] * (perDigit[digit] - 1) / 2; });
    return { groups: want.raw.length, cells: cells, pairs: pairs, total: want.raw.length + cells + pairs };
  }

  /**
   * The steps of the uncharged scans of one build, a function of the model alone: every cell of the state, every cell
   * of an intersection of a complete box or region with a complete line (two or more shared cells), and every cell of
   * a complete unit. The builder checks its parent budget at every 256th step.
   */
  function expectedTicks(m) {
    var ticks = m.cellCount;
    for (var b = 0; b < m.units.length; b++) {
      if (!isComplete(m, b)) continue;
      ticks += m.units[b].length;
      if (!isBoxRegion(m, b)) continue;
      for (var l = 0; l < m.units.length; l++) {
        if (!isComplete(m, l) || !isLine(m, l)) continue;
        var shared = Array.prototype.filter.call(m.units[b], function (c) { return m.units[l].indexOf(c) !== -1; });
        if (shared.length >= 2) ticks += shared.length;
      }
    }
    return ticks;
  }

  function listProblems(label, lists, count, problems) {
    if (!Array.isArray(lists) || lists.length !== count) {
      problems.push(label + ' has ' + (Array.isArray(lists) ? lists.length : lists) + ' lists for ' + count + ' nodes');
      return false;
    }
    var ok = true;
    lists.forEach(function (list, i) {
      if (!Array.isArray(list)) {
        problems.push(label + '[' + i + '] is not a list');
        ok = false;
        return;
      }
      list.forEach(function (j, k) {
        if (!(Number.isInteger(j) && j >= 0 && j < count)) {
          problems.push(label + '[' + i + '] holds ' + j + ', not a node');
          ok = false;
        } else if (j === i) {
          problems.push(label + '[' + i + '] holds itself');
          ok = false;
        } else if (k > 0 && !(list[k - 1] < j)) {
          problems.push(label + '[' + i + '] is not ascending without duplicates at ' + k);
          ok = false;
        }
      });
    });
    return ok;
  }

  /**
   * Everything wrong with a complete graph of a position (empty array = it is exactly the canonical graph): the
   * shape, the node list, and every weak and strong edge both ways (listed iff the obligation holds, symmetric).
   */
  function graphProblems(m, state, graph) {
    var problems = [];
    if (graph === null || typeof graph !== 'object') return ['the graph is not an object'];
    var keys = Object.keys(graph).sort();
    if (!sameList(keys, ['capHit', 'complete', 'nodes', 'strong', 'weak', 'work'])) {
      problems.push('keys are ' + JSON.stringify(keys));
    }
    if (graph.complete !== true) problems.push('the graph is not complete');
    if (graph.capHit !== null) problems.push('capHit is ' + graph.capHit);
    if (!(Number.isInteger(graph.work) && graph.work >= 0)) problems.push('work is ' + graph.work);
    var want = expectedNodes(m, state);
    if (!Array.isArray(graph.nodes)) return problems.concat('nodes is not a list');
    if (graph.nodes.length !== want.nodes.length) {
      problems.push('there are ' + graph.nodes.length + ' nodes, the position has ' + want.nodes.length);
    }
    var mismatches = 0;
    want.nodes.forEach(function (node, i) {
      var got = graph.nodes[i];
      var text = JSON.stringify(got === undefined ? null : { cells: got.cells, digit: got.digit });
      if (text !== JSON.stringify({ cells: node.cells, digit: node.digit }) && mismatches++ < 5) {
        problems.push('node ' + i + ' is ' + text + ', expected ' + describe(node));
      }
    });
    if (problems.length > 0) return problems;
    var count = want.nodes.length;
    var weakOk = listProblems('weak', graph.weak, count, problems);
    var strongOk = listProblems('strong', graph.strong, count, problems);
    if (!weakOk || !strongOk) return problems;

    var memo = {};
    function occurrencesOf(u, digit) {
      var key = u * (m.digits + 1) + digit;
      if (!(key in memo)) memo[key] = occurrences(m, state, u, digit);
      return memo[key];
    }
    var listed = { weak: graph.weak.map(function (l) { return new Set(l); }),
      strong: graph.strong.map(function (l) { return new Set(l); }) };
    var expected = { weak: 0, strong: 0 };
    function check(kind, i, j, holds) {
      var a = listed[kind][i].has(j);
      var b = listed[kind][j].has(i);
      if (holds) expected[kind]++;
      if (a !== holds || b !== holds) {
        problems.push(kind + ' edge ' + i + '-' + j + ' (' + describe(want.nodes[i]) + ', ' + describe(want.nodes[j]) +
          ') ' + (holds ? 'is missing' : 'is listed') + (a !== b ? ' (not symmetric)' : ''));
      }
    }
    var nodes = want.nodes;
    for (var i = 0; i < count && problems.length < 20; i++) {
      for (var j = i + 1; j < count; j++) {
        var sameDigit = nodes[i].digit === nodes[j].digit;
        var sameCell = nodes[i].cells.length === 1 && nodes[j].cells.length === 1 &&
          nodes[i].cells[0] === nodes[j].cells[0];
        if (!sameDigit && !sameCell) continue;
        check('weak', i, j, weakRaw(m, nodes[i], nodes[j]));
        check('strong', i, j, strongRaw(m, state, nodes[i], nodes[j], occurrencesOf));
      }
    }
    ['weak', 'strong'].forEach(function (kind) {
      var total = graph[kind].reduce(function (sum, list) { return sum + list.length; }, 0);
      if (total !== 2 * expected[kind]) {
        problems.push(kind + ' lists ' + total / 2 + ' edges, the position has ' + expected[kind]);
      }
    });
    return problems;
  }

  function isTrue(node, solution) {
    return node.cells.some(function (c) { return solution[c] === node.digit; });
  }

  /** Whether every edge of a graph holds in a solution: weak, not both true; strong, at least one true. */
  function solutionProblems(m, graph, solution) {
    var problems = [];
    graph.nodes.forEach(function (node, i) {
      graph.weak[i].forEach(function (j) {
        if (j > i && isTrue(node, solution) && isTrue(graph.nodes[j], solution)) {
          problems.push('weak edge ' + i + '-' + j + ' has both nodes true');
        }
      });
      graph.strong[i].forEach(function (j) {
        if (j > i && !isTrue(node, solution) && !isTrue(graph.nodes[j], solution)) {
          problems.push('strong edge ' + i + '-' + j + ' has both nodes false');
        }
      });
    });
    return problems;
  }

  /** The candidates that are weakly linked to both ends of an endpoints proof, ascending by cell and digit. */
  function targets(m, state, start, end) {
    var out = [];
    for (var c = 0; c < m.cellCount; c++) {
      for (var d = 1; d <= m.digits; d++) {
        if (!isOpen(state, c, d)) continue;
        var e = { cells: [c], digit: d };
        if (weakRaw(m, e, start) && weakRaw(m, e, end)) out.push([c, d]);
      }
    }
    return out;
  }

  function readStep(step, where, problems) {
    if (Array.isArray(step)) {
      if (step.length === 3) return { cells: [step[0]], digit: step[1], truth: step[2], legacy: true };
      problems.push(where + ': a legacy step is [cell, digit, truth]');
      return null;
    }
    if (step === null || typeof step !== 'object' || !Array.isArray(step.cells) ||
        !sameList(Object.keys(step).sort(), ['cells', 'digit', 'truth'])) {
      problems.push(where + ': a step is { cells, digit, truth }');
      return null;
    }
    return { cells: step.cells.slice(), digit: step.digit, truth: step.truth, legacy: false };
  }

  /**
   * Everything wrong with the proof of a chain Finding (empty array = valid), from the position alone: every step
   * is a valid node, the polarity alternates (a false node reaches a true one over a strong edge, a true node a
   * false one over a weak edge), the ends are as the kind demands, and placements and eliminations are exactly its
   * targets: `endpoints` removes the candidates that see EVERY member of both ends and places nothing; `forced` and
   * `contradiction` start from a SINGLETON and place or remove exactly that one candidate; a placement or an
   * elimination of anything else is wrong, so a true group never places an arbitrary member. A root candidate that
   * is also a member of a group inside the proof is fine: it is forced by the two paths, not chosen from a group.
   * opts.canonical additionally requires every node to be a canonical node of the position.
   */
  function pathProblems(m, state, finding, opts) {
    var problems = [];
    var args = finding.i18nArgs;
    if (!args || !Array.isArray(args.chains) || args.chains.length === 0) return ['i18nArgs.chains is missing'];
    var versionTwo = args.proofVersion === 2;
    if (versionTwo && !sameList(Object.keys(args).sort(), ['chains', 'kind', 'length', 'proofVersion'])) {
      problems.push('i18nArgs keys are ' + JSON.stringify(Object.keys(args)));
    }
    var canonical = opts && opts.canonical ? expectedNodes(m, state).nodes.map(function (n) {
      return JSON.stringify([n.digit, n.cells]);
    }) : null;
    var chains = args.chains.map(function (chain, k) {
      if (!Array.isArray(chain) || chain.length < 2) {
        problems.push('chain ' + k + ' needs at least two nodes');
        return [];
      }
      var steps = chain.map(function (step, i) {
        var where = 'chain ' + k + ', step ' + i;
        var node = readStep(step, where, problems);
        if (node === null) return null;
        if (node.truth !== 0 && node.truth !== 1) problems.push(where + ': truth must be 0 or 1');
        if (node.legacy === false && !versionTwo) problems.push(where + ': a group step needs proofVersion 2');
        nodeProblems(m, state, node).forEach(function (p) { problems.push(where + ': ' + p); });
        if (canonical !== null && canonical.indexOf(JSON.stringify([node.digit, node.cells])) === -1) {
          problems.push(where + ': ' + describe(node) + ' is not a canonical node');
        }
        return node;
      });
      steps.forEach(function (node, i) {
        if (i === 0 || node === null || steps[i - 1] === null) return;
        var prev = steps[i - 1];
        var where = 'chain ' + k + ', step ' + i;
        if (nodeProblems(m, state, node).length > 0 || nodeProblems(m, state, prev).length > 0) return;
        if (prev.truth === 0) {
          if (node.truth !== 1) problems.push(where + ': a false node must be followed by a true node');
          else if (!strongRaw(m, state, prev, node, plainOccurrences(m, state))) {
            problems.push(where + ': ' + describe(prev) + ' to ' + describe(node) + ' is not a strong edge');
          }
        } else if (node.truth !== 0) {
          problems.push(where + ': a true node must be followed by a false node');
        } else if (!weakRaw(m, prev, node)) {
          problems.push(where + ': ' + describe(prev) + ' to ' + describe(node) + ' is not a weak edge');
        }
      });
      return steps;
    });
    if (chains.some(function (steps) { return steps.length === 0 || steps.indexOf(null) !== -1; })) return problems;

    var lengths = chains.map(function (steps) { return steps.length - 1; });
    if (args.length !== Math.max.apply(null, lengths)) {
      problems.push('length ' + args.length + ' is not the largest number of edges ' + JSON.stringify(lengths));
    }
    var union = [];
    chains.forEach(function (steps) {
      steps.forEach(function (node) {
        node.cells.forEach(function (c) { if (union.indexOf(c) === -1) union.push(c); });
      });
    });
    union.sort(ascending);
    var cells = versionTwo ? finding.cells : finding.cells.slice().sort(ascending);
    if (!sameList(cells, union)) {
      problems.push('cells ' + JSON.stringify(finding.cells) + ' are not ' +
        (versionTwo ? 'the ascending union of the nodes' : 'the cells of the nodes') + ' ' + JSON.stringify(union));
    }

    var start = chains[0][0];
    var end = chains[0][chains[0].length - 1];
    var wantPlace = [];
    var wantEliminate = [];
    if (args.kind === 'endpoints') {
      if (chains.length !== 1) problems.push('endpoints has exactly one chain');
      if (start.truth !== 0 || end.truth !== 1) problems.push('endpoints runs from a false node to a true node');
      if (sameNode(start, end)) problems.push('endpoints with one and the same node');
      wantEliminate = targets(m, state, start, end);
      if (wantEliminate.length === 0) problems.push('endpoints has no target');
    } else if (args.kind === 'contradiction' || args.kind === 'forced') {
      var wantTruth = args.kind === 'contradiction' ? 1 : 0;
      if (chains.length !== 2) {
        problems.push(args.kind + ' has exactly two chains');
      } else {
        var other = chains[1];
        if (!sameNode(other[0], start) || other[0].truth !== start.truth) {
          problems.push('both chains must start at the same literal');
        }
        var last = other[other.length - 1];
        if (!sameNode(last, end) || last.truth === end.truth) {
          problems.push('the chains must end in the two polarities of one node');
        }
      }
      if (start.truth !== wantTruth) problems.push(args.kind + ' must start from truth ' + wantTruth);
      if (start.cells.length !== 1) {
        problems.push(args.kind + ' must start from a singleton: a group is no placement or elimination of one member');
      } else if (args.kind === 'forced') {
        wantPlace = [[start.cells[0], start.digit]];
      } else {
        wantEliminate = [[start.cells[0], start.digit]];
      }
    } else {
      problems.push('unknown kind ' + JSON.stringify(args.kind));
    }
    if (!sameList(finding.placements.map(String).sort(), wantPlace.map(String).sort())) {
      problems.push('placements ' + JSON.stringify(finding.placements) + ' are not ' + JSON.stringify(wantPlace));
    }
    if (!sameList(finding.eliminations.map(String).sort(), wantEliminate.map(String).sort())) {
      problems.push('eliminations ' + JSON.stringify(finding.eliminations) + ' are not ' +
        JSON.stringify(wantEliminate));
    }
    return problems;
  }

  SG.chainProofs = {
    nodeProblems: nodeProblems,
    weakLinked: weakLinked,
    strongLinked: strongLinked,
    expectedNodes: expectedNodes,
    expectedWork: expectedWork,
    expectedTicks: expectedTicks,
    graphProblems: graphProblems,
    solutionProblems: solutionProblems,
    targets: targets,
    pathProblems: pathProblems
  };
})();
