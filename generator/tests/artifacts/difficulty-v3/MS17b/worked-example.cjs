'use strict';

/*
 * MS17b scratch (read-only, no generation beyond rating two fixed puzzles, well under 1 s): the two worked examples of the manual
 * `difficulty` suite ("reproduces the worked examples: classic9 499 and Samurai 633") evaluated against the current source, to
 * explain the one GD failure. It reads the expected literals from the test file itself (the pins evaluated are the pins written),
 * rates the same two puzzles with SG.difficulty.rate, and prints expected against actual (counts, empties, score, level, hardest
 * technique) and the position of skyscraper and simpleColouring in the registry ladder with their weights.
 * Usage (from generator/): node tests/artifacts/difficulty-v3/MS17b/worked-example.cjs
 */
const fs = require('fs');
const path = require('path');
const SG = require('../MS16/load.js');
const D = SG.difficulty;

const text = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'manual', 'difficulty.test.js'), 'utf8');
const literal = (name) => new Function('return ' + new RegExp('var ' + name + ' = (\\{[\\s\\S]*?\\});').exec(text)[1])();
const classicExpected = literal('classic');
const samuraiExpected = literal('samurai');
const show = (counts) => JSON.stringify(counts);

const order = SG.techniques.list().map((t) => t.id);
console.log('registry position (0-based) of skyscraper ' + order.indexOf('skyscraper') + ' (weight ' + D.WEIGHTS.skyscraper +
  '), simpleColouring ' + order.indexOf('simpleColouring') + ' (weight ' + D.WEIGHTS.simpleColouring + '), xWing ' + order.indexOf('xWing'));

const model9 = SG.fixtures.models.boxGrid('boxGrid9', 3, 3);
const parse = (s) => Int32Array.from(s.split('').map(Number));
const parsed = /parse\('([0-9]+)' \+\s*'([0-9]+)'\)/.exec(text);
const classic = D.rate(model9, parse(parsed[1] + parsed[2]));
console.log('classic9 worked example: expected counts ' + show(classicExpected) + ', empties 53, score 499, level hard');
console.log('                         actual   counts ' + show(classic.techniqueCounts) + ', empties ' + classic.empties + ', score ' +
  classic.score + ', level ' + classic.level + ', hardest ' + classic.hardestTechnique);

const samuraiModel = SG.variants.get('samurai').build({}, SG.rng.create(1));
const samuraiText = '00503000000080040007600923020700006000050000805100000200008000942000000000070400000900' +
  '70400000002006001000000709000060000100020050784301000900650002000070000060000001000003000' +
  '05000560070001093840100600030000200009030000004008002000000070300900000106000000000093200' +
  '07000080000064090000200002000090503690085000800300000008030000000908051007200000010600000' +
  '0950014020500000';
const samurai = D.rate(samuraiModel, parse(samuraiText));
console.log('Samurai worked example:  expected counts ' + show(samuraiExpected) + ', empties 263, score 633, level hard');
console.log('                         actual   counts ' + show(samurai.techniqueCounts) + ', empties ' + samurai.empties + ', score ' +
  samurai.score + ', level ' + samurai.level + ', hardest ' + samurai.hardestTechnique);
const asExpected = D.breakdown(samuraiExpected, 263);
const asActual = D.breakdown(samurai.techniqueCounts, samurai.empties);
console.log('breakdown of the expected counts: peak ' + asExpected.peak + ', work ' + asExpected.work + ', score ' + asExpected.score +
  '; of the actual counts: peak ' + asActual.peak + ', work ' + asActual.work + ', score ' + asActual.score);
