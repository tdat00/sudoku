/**
 * Explanation data for the seven pipeline steps (design.md section 7.4): what the step does, why, and how,
 * its pseudocode, and a status line that follows the metrics while the step runs.
 *
 * This file is pure data. It holds translation KEYS only, never display text: the texts live in the locale
 * packs (js/ui/locale.en.js, locale.vi.js), which must define every key that `SG.explain.keys()` lists. The
 * UI card (js/ui/explain.js) reads this data; nothing here touches the DOM.
 *
 * Per step (`SG.explain[stepId]`):
 *  - `stepId`, `index` (1..7), `name` (key of the step title).
 *  - `what`, `why`, `how`  keys of the three fixed parts of the card.
 *  - `pseudocode`  the listing as an array of lines `{ label, indent, key }`. `label` names the line so the
 *    UI can highlight it, `indent` is the nesting depth, `key` is the translation key of the line's text.
 *    The comment beside every line gives the text the locale packs should carry.
 *  - `highlight`  which line is executing while an event is replayed: event `i18nKey` -> line `label`.
 *  - `liveKey` and `liveArgs`  the key of the status line and the names of its placeholders.
 *  - `live(metrics, t)`  returns `{ key, args }` for the status line; every placeholder is read from
 *    `metrics` (missing or non-numeric values read as 0). `t` (elapsed ms) is accepted and unused.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** The seven step ids in pipeline order (the same list as `SG.events.STEP_IDS`). */
  const STEP_IDS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  function makeLive(key, names) {
    return function live(metrics) {
      const m = metrics || {};
      const args = {};
      names.forEach(function (name) {
        args[name] = typeof m[name] === 'number' && isFinite(m[name]) ? m[name] : 0;
      });
      return { key: key, args: args };
    };
  }

  /**
   * @param {string} id
   * @param {number} index
   * @param {Array<[string, number]>} lines  `[label, indent]` per pseudocode line.
   * @param {Object<string, string>} highlight  Event key -> line label.
   * @param {string[]} liveArgs
   */
  function describeStep(id, index, lines, highlight, liveArgs) {
    const prefix = 'explain.' + id + '.';
    return {
      stepId: id,
      index: index,
      name: 'step.' + id + '.name',
      what: prefix + 'what',
      why: prefix + 'why',
      how: prefix + 'how',
      pseudocode: lines.map(function (line) {
        return { label: line[0], indent: line[1], key: prefix + 'code.' + line[0] };
      }),
      highlight: highlight,
      liveKey: prefix + 'live',
      liveArgs: liveArgs,
      live: makeLive(prefix + 'live', liveArgs)
    };
  }

  const explain = {};

  explain.configure = describeStep('configure', 1, [
    ['normalize', 0], // config <- normalize(options)
    ['validate', 0], // check the variant, the level, the symmetry and the dig order
    ['seed', 0] // seed <- config.seed, or a random seed when it is missing
  ], {
    'configure.config': 'normalize'
  }, []);

  explain.buildModel = describeStep('buildModel', 2, [
    ['build', 0], // model <- variant.build(options, rng)
    ['units', 0], // units <- rows + columns + regions of every grid
    ['peers', 0], // peers[c] <- the cells that share a unit with c
    ['spec', 0] // spec <- difficultySpec(level), scaled to the number of cells
  ], {
    'buildModel.model': 'units',
    'buildModel.spec': 'spec'
  }, ['cells', 'units']);

  explain.fullGrid = describeStep('fullGrid', 3, [
    ['fixed', 0], // state <- the fixed cells of the variant, then propagate()
    ['seed', 0], // prefill the state with variant.fastSeed(state) when the variant has one
    ['pick', 0], // cell <- the open cell with the fewest candidates
    ['loop', 0], // for value in shuffle(candidates(cell)):
    ['place', 1], // place(cell, value) and propagate()
    ['descend', 1], // if no cell is left without a candidate: continue with the next cell
    ['backtrack', 1], // otherwise undo the placement and try the next value
    ['restart', 0] // too many failed guesses: start over with a new random stream
  ], {
    'fullGrid.fixed': 'fixed',
    'fullGrid.seed': 'seed',
    'fullGrid.place': 'place',
    'fullGrid.conflict': 'backtrack',
    'fullGrid.backtrack': 'backtrack',
    'fullGrid.restart': 'restart'
  }, ['placed', 'backtracks', 'restarts']);

  explain.extraStructure = describeStep('extraStructure', 4, [
    ['hook', 0], // if the variant defines postGenerate:
    ['build', 1], // build the extra structure (cages, signs, key word) from the solution
    ['none', 0] // otherwise there is nothing to do
  ], {
    'extraStructure.built': 'build',
    'extraStructure.none': 'none'
  }, []);

  explain.dig = describeStep('dig', 5, [
    ['order', 0], // order <- shuffle(symmetric cell groups)
    ['loop', 0], // for group in order:
    ['filter', 1], // skip the group when the clues, a row, a column or a region would run too low
    ['try', 1], // remove the group from the puzzle
    ['check', 1], // if the puzzle can still be solved with the allowed techniques:
    ['accept', 2], // keep the group removed
    ['reject', 2], // otherwise put the group back
    ['deeper', 0], // then dig deeper: keep the removal that makes the puzzle hardest
    ['verify', 0] // verify that exactly one solution is left
  ], {
    'dig.restore': 'order',
    'dig.pass.start': 'loop',
    'dig.skip': 'filter',
    'dig.try': 'try',
    'dig.accept': 'accept',
    'dig.reject': 'reject',
    'dig.keep': 'deeper',
    'dig.pass.end': 'loop',
    'dig.verify': 'verify',
    'dig.unsound': 'verify'
  }, ['attempts', 'accepted', 'rejected', 'clues']);

  explain.rate = describeStep('rate', 6, [
    ['solve', 0], // report <- solve the puzzle by logic, with every technique
    ['count', 0], // count how often each technique was needed
    ['score', 0], // score <- the sum of the technique costs
    ['classify', 0] // level <- the difficulty band that contains the score
  ], {
    'rate.technique': 'count',
    'rate.result': 'classify'
  }, ['clues', 'score']);

  explain.tune = describeStep('tune', 7, [
    ['compare', 0], // if the level of the puzzle is the requested level:
    ['accept', 1], // accept the puzzle
    ['retry', 1], // otherwise dig another puzzle, or draw a new grid
    ['best', 0], // when the attempts run out, use the closest puzzle
    ['package', 0] // package the result
  ], {
    'tune.hit': 'accept',
    'tune.miss': 'retry',
    'retry.difficulty': 'retry',
    'tune.best': 'best',
    'tune.final': 'package'
  }, ['clues', 'score']);

  /**
   * @param {string} stepId
   * @returns {?Object} The explanation of a step, or null for an unknown id.
   */
  function get(stepId) {
    return STEP_IDS.indexOf(stepId) === -1 ? null : explain[stepId];
  }

  /**
   * The pseudocode line to highlight while an event is replayed.
   * @param {string} stepId
   * @param {string} i18nKey  The key of the event.
   * @returns {?string} A line label, or null when the event executes no particular line.
   */
  function lineFor(stepId, i18nKey) {
    const step = get(stepId);
    if (step === null || !Object.prototype.hasOwnProperty.call(step.highlight, i18nKey)) return null;
    return step.highlight[i18nKey];
  }

  /**
   * @returns {string[]} Every translation key this file uses (step names, what / why / how, code lines and
   *          status lines), sorted, without duplicates. Both locale packs must define them all.
   */
  function keys() {
    const all = [];
    STEP_IDS.forEach(function (id) {
      const step = explain[id];
      all.push(step.name, step.what, step.why, step.how, step.liveKey);
      step.pseudocode.forEach(function (line) { all.push(line.key); });
    });
    return all.filter(function (k, i) { return all.indexOf(k) === i; }).sort();
  }

  Object.defineProperties(explain, {
    STEP_IDS: { value: STEP_IDS },
    get: { value: get },
    lineFor: { value: lineFor },
    keys: { value: keys }
  });

  SG.explain = explain;
})(typeof self !== 'undefined' ? self : globalThis);
