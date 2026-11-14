'use strict';

/*
 * Private adapter of IG-S03 (audit mode only, never part of a timing instance): annotates the NATIVE check sites of an
 * in-memory copy of the engine so that every `ctx.check()` / `budget.check()` can be given a logical site token by the
 * observer of scoped-audit.cjs. It changes no behaviour: with the observer idle it only records which site is about to
 * call the budget. The scoped runtime calls the same observer API at its virtual checks, so the sequences of the
 * native and the scoped instance are comparable token by token.
 *
 *  - logical-solver.js: the solver-step check (site 1), the check before "stuck" (site 2) and the finder that is about
 *    to run;
 *  - tech-subset.js: the unit-entry check (site 3, with the incoming node counter) and the enumeration-node check
 *    (site 4, with the node counter).
 */
const SOLVER = '../core/js/engine/logical-solver.js';
const SUBSET = '../core/js/engine/tech-subset.js';

const ITERATE = 'function iterate(model, state, ladder, ctx, run) {';
const FIND_SUBSET = 'function findSubset(model, state, ctx, def) {';
const NEXT = 'function nextCombination(count, size, ctx) {';

globalThis.__igAuditFactory = function () {
  return require('../scoped-audit.cjs').createObserver();
};

module.exports = Object.freeze({
  id: 'scoped-audit',
  version: 1,
  description: 'Audit annotations of the native check sites; no behaviour change.',
  transforms: Object.freeze([
    Object.freeze({
      id: 'scoped-audit.boot', file: SOLVER, anchor: ITERATE, position: 'before',
      code: 'SG.__igAudit = typeof globalThis.__igAuditFactory === \'function\' ? ' +
        'globalThis.__igAuditFactory() : undefined;'
    }),
    Object.freeze({
      id: 'scoped-audit.step-site', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'while (state.unsolvedCount > 0) {',
      code: [
        'while (state.unsolvedCount > 0) {',
        '  if (SG.__igAudit !== undefined) SG.__igAudit.site(1);'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-audit.stuck-site', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: '// A technique that swallowed a budget error looks like "nothing found"; make it visible here.',
      code: [
        '// A technique that swallowed a budget error looks like "nothing found"; make it visible here.',
        'if (SG.__igAudit !== undefined) SG.__igAudit.site(2);'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-audit.finder', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'const found = tech.find(model, state, ctx);',
      code: [
        'if (SG.__igAudit !== undefined) SG.__igAudit.finder(tech.id);',
        'const found = tech.find(model, state, ctx);'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-audit.subset-unit', file: SUBSET, anchor: FIND_SUBSET, position: 'replace',
      find: '      ctx.check();',
      code: [
        '      if (SG.__igAudit !== undefined) SG.__igAudit.siteUnit(def.id, u, nodes);',
        '      ctx.check();'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-audit.subset-node', file: SUBSET, anchor: NEXT, position: 'replace',
      find: '      if ((++nodes & (CHECK_EVERY - 1)) === 0) ctx.check();',
      code: [
        '      if ((++nodes & (CHECK_EVERY - 1)) === 0) {',
        '        if (SG.__igAudit !== undefined) SG.__igAudit.siteNode(nodes);',
        '        ctx.check();',
        '      }'
      ].join('\n')
    })
  ])
});
