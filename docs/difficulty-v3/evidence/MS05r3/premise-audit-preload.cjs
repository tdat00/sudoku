'use strict';
// Audit-only preload of MS05r3 (never part of the product or of a test run): `node --require <this file>
// tests\node-runner.js ...` starts SG.digger.SHALLOW_SEARCH_RATINGS at DV3_AUDIT_CAP, a whole number, instead of
// the default Infinity. With DV3_AUDIT_FORCE=1 later assignments are ignored, so a test that scopes Infinity
// cannot undo it: that shows which test really needs the scope.
const cap = Number(process.env.DV3_AUDIT_CAP);
if (!Number.isInteger(cap) || cap < 0) throw new Error('DV3_AUDIT_CAP must be a whole number >= 0');
const force = process.env.DV3_AUDIT_FORCE === '1';
let current;

Object.defineProperty(globalThis, 'SG', {
  configurable: true,
  get() { return current; },
  set(value) {
    if (value === current) return;
    current = value;
    let digger;
    Object.defineProperty(value, 'digger', {
      configurable: true,
      enumerable: true,
      get() { return digger; },
      set(module) {
        digger = module;
        let setting = cap;
        Object.defineProperty(module, 'SHALLOW_SEARCH_RATINGS', {
          configurable: true,
          enumerable: true,
          get() { return setting; },
          set(next) { if (!force) setting = next; }
        });
      }
    });
  }
});
