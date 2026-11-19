'use strict';

/*
 * MS18d Phase C0 task-owned STAND-IN (SA1 C0-6): a classifier module of a payload type that is NOT built: a
 * command that writes a ledger file and exits 0 only after writing it. It exists to prove the hook of
 * payloads.js: the transport (acquisition, binding, barrier, records) is the same, and only this module's
 * G3 check differs. It is loaded only for a stand-in request (`classifierModule`), is not registered, and
 * is not the recorder: it reads `ledger.json` from the run directory through `readRunFile` and checks it
 * holds the number of records the command was asked for.
 */
const { STOP_EXIT } = require('./classify.js');

module.exports = {
  type: 'standin-ledger',
  allowsMissExit: false,
  validateRequest(request) {
    if (!Number.isInteger(request.expectedRecords)) {
      throw new Error('a standin-ledger request names expectedRecords');
    }
  },
  cellOf: () => null,
  classify(e) {
    const kinds = [];
    const problems = [];
    const bad = (kind, text) => {
      if (kinds.indexOf(kind) === -1) kinds.push(kind);
      problems.push(text);
    };
    if (e.cli.signal || e.cli.exit !== 0) {
      bad('cli-not-zero', 'exit ' + e.cli.exit + ' signal ' + e.cli.signal);
    }
    if (e.stderrBytes !== 0) bad('stderr-output', 'stderr bytes: ' + e.stderrBytes);
    if (!e.tee.marker || !/^exit=0 seconds=/.test(e.tee.marker)) bad('marker-missing', String(e.tee.marker));
    if (!e.barrier || e.barrier.verdict !== 'clean') {
      bad('orphan', 'barrier ' + (e.barrier && e.barrier.verdict));
    }
    if (!e.binding || e.binding.ok !== true) bad('binding', 'source binding');
    if (!e.acquisition || e.acquisition.decision !== 'proceed') bad('admission', 'acquisition');
    const text = e.readRunFile('ledger.json');
    let ledger = null;
    if (text === null || text === undefined) {
      bad('ledger-missing', 'ledger.json is missing');
    } else {
      try {
        ledger = JSON.parse(text);
      } catch (err) {
        bad('ledger-missing', 'ledger.json is not JSON');
      }
    }
    if (ledger && (!Array.isArray(ledger.records) || ledger.records.length !== e.request.expectedRecords)) {
      bad('ledger-incomplete', 'the ledger has ' + (ledger.records && ledger.records.length) +
        ' records, not ' + e.request.expectedRecords);
    }
    const complete = problems.length === 0;
    return { schema: 'ms18d-c-result-class-1', profile: 'standin-ledger',
      outcome: complete ? 'success' : 'stop', complete, controllerExit: complete ? 0 : STOP_EXIT, kinds,
      problems, cli: e.cli, tee: e.tee,
      records: ledger && Array.isArray(ledger.records) ? ledger.records.length : null };
  }
};
