/**
 * Pure helpers of the bounded recorders of the quick-test evidence (difficulty v3, MS03a; reused by the
 * hash recorder of MS03d). Exposed as SG.fixtures.toolRecords; they are test tooling, not part of any
 * application script list, and know no file system, clock or hash function (the Node tools pass those in).
 *
 * A manifest is an ordered array of { key, request }: the identity of every record a tool can produce.
 * A ledger is the output of one bounded run (one or a few keys), a plain JSON object:
 *   { schema: 1, kind, sourceHash, manifestHash, node, commit, dirty, records: [{ key, request, value }] }
 * plus optional run information that never takes part in a comparison: `generatedAt`, `argv` (ledger) and
 * `ms`, `overrides` (record). `value` is the data the fixture is made of; timestamps and timings stay
 * outside it.
 *
 *  - canonicalJson(value), manifestText(manifest)   deterministic text (sorted object keys) to hash
 *  - selectKeys(manifest, text)   the keys of an `--ids=` list in manifest order; unknown or duplicate throw
 *  - ledgerOf(meta, records), ledgerText(ledger)    build a ledger, and its text (UTF-8, CRLF, a line each)
 *  - checkLedger(ledger, expect)    the problems of one ledger (kind, source, manifest, shape of the records)
 *  - merge(files, expect)           { ok, problems, records }: every ledger valid, every manifest key exactly
 *                                   once; the records come in manifest order, never in file order
 *  - diffValues(saved, fresh)       the field differences { path, saved, fresh } between two plain values
 *  - withRequestedLevel(variantId, level, fn)   runs fn with the level offered by the variant, then restores
 *                                   the exact original support array
 * `expect` is { kind, sourceHash, manifestHash, manifest }.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SCHEMA = 1;
  var HASH = /^[0-9a-f]{64}$/;

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /** JSON with the keys of every object in sorted order: equal data gives equal text. */
  function canonicalJson(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return JSON.stringify(value);
    }
    if (typeof value === 'number') {
      if (!isFinite(value)) throw new TypeError('canonicalJson: a number is not finite');
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
    if (isObject(value)) {
      return '{' + Object.keys(value).sort().map(function (key) {
        return JSON.stringify(key) + ':' + canonicalJson(value[key]);
      }).join(',') + '}';
    }
    throw new TypeError('canonicalJson: not plain JSON data (' + typeof value + ')');
  }

  function keysOf(manifest) {
    return manifest.map(function (entry) { return entry.key; });
  }

  /** The recipe list that identifies a corpus: keys and requests, none of the expected output. */
  function manifestText(manifest) {
    return canonicalJson(manifest.map(function (entry) {
      return { key: entry.key, request: entry.request };
    }));
  }

  /** The keys of "G01,G02" in manifest order. @throws Error for an empty, unknown or duplicate key. */
  function selectKeys(manifest, text) {
    var known = keysOf(manifest);
    var asked = String(text).split(',');
    var seen = {};
    asked.forEach(function (key) {
      if (key === '') throw new Error('--ids: an empty key in "' + text + '"');
      if (known.indexOf(key) === -1) {
        throw new Error('--ids: unknown key ' + key + ' (known: ' + known.join(', ') + ')');
      }
      if (seen[key]) throw new Error('--ids: duplicate key ' + key);
      seen[key] = true;
    });
    return known.filter(function (key) { return seen[key] === true; });
  }

  /** A ledger (fixed field order); `meta` has kind, sourceHash, manifestHash, node, commit and dirty. */
  function ledgerOf(meta, records) {
    var ledger = {
      schema: SCHEMA, kind: meta.kind, sourceHash: meta.sourceHash, manifestHash: meta.manifestHash,
      node: meta.node, commit: meta.commit, dirty: meta.dirty
    };
    if (meta.generatedAt !== undefined) ledger.generatedAt = meta.generatedAt;
    if (meta.argv !== undefined) ledger.argv = meta.argv;
    ledger.records = records.map(function (record) {
      var out = { key: record.key, request: record.request, value: record.value };
      if (record.ms !== undefined) out.ms = record.ms;
      if (record.overrides !== undefined) out.overrides = record.overrides;
      return out;
    });
    return ledger;
  }

  /** The text of a ledger: one line per field and per record, CRLF, a final line end. */
  function ledgerText(ledger) {
    var lines = ['{'];
    var names = Object.keys(ledger).filter(function (name) { return name !== 'records'; });
    names.forEach(function (name) {
      lines.push('  ' + JSON.stringify(name) + ': ' + JSON.stringify(ledger[name]) + ',');
    });
    lines.push('  "records": [');
    ledger.records.forEach(function (record, i) {
      lines.push('    ' + JSON.stringify(record) + (i < ledger.records.length - 1 ? ',' : ''));
    });
    lines.push('  ]');
    lines.push('}');
    return lines.join('\r\n') + '\r\n';
  }

  function sameJson(a, b) {
    return canonicalJson(a) === canonicalJson(b);
  }

  /**
   * The problems of one ledger against what a tool expects (an empty array: valid). Records are checked one
   * by one: a key outside the manifest, a request that is not the manifest's, a missing or non-object value,
   * and a key twice in the same ledger.
   */
  function checkLedger(ledger, expect) {
    var problems = [];
    if (!isObject(ledger)) return ['not a ledger object'];
    if (ledger.schema !== SCHEMA) {
      problems.push('schema ' + JSON.stringify(ledger.schema) + ' is not ' + SCHEMA);
    }
    if (ledger.kind !== expect.kind) {
      problems.push('kind ' + JSON.stringify(ledger.kind) + ' is not ' + JSON.stringify(expect.kind));
    }
    if (typeof ledger.sourceHash !== 'string' || !HASH.test(ledger.sourceHash)) {
      problems.push('sourceHash is not a SHA-256 hex string');
    } else if (ledger.sourceHash !== expect.sourceHash) {
      problems.push('sourceHash ' + ledger.sourceHash.slice(0, 12) + '... is not the current ' +
        expect.sourceHash.slice(0, 12) + '... (recorded from other sources)');
    }
    if (typeof ledger.manifestHash !== 'string' || !HASH.test(ledger.manifestHash)) {
      problems.push('manifestHash is not a SHA-256 hex string');
    } else if (ledger.manifestHash !== expect.manifestHash) {
      problems.push('manifestHash ' + ledger.manifestHash.slice(0, 12) + '... is not the current ' +
        expect.manifestHash.slice(0, 12) + '... (another recipe list)');
    }
    if (typeof ledger.node !== 'string') problems.push('node is not a string');
    if (ledger.commit !== null && typeof ledger.commit !== 'string') {
      problems.push('commit is not a string or null');
    }
    if (ledger.dirty !== null && typeof ledger.dirty !== 'boolean') {
      problems.push('dirty is not a boolean or null');
    }
    if (!Array.isArray(ledger.records)) return problems.concat('records is not an array');
    var seen = {};
    ledger.records.forEach(function (record, i) {
      var label = 'record ' + i;
      if (!isObject(record) || typeof record.key !== 'string') {
        problems.push(label + ' has no string key');
        return;
      }
      label = 'record ' + record.key;
      var entry = expect.manifest.filter(function (m) { return m.key === record.key; })[0];
      if (entry === undefined) {
        problems.push(label + ' is not in the manifest');
        return;
      }
      if (seen[record.key]) problems.push(label + ' appears twice');
      seen[record.key] = true;
      var requestOk = false;
      try {
        requestOk = sameJson(record.request, entry.request);
      } catch (err) {
        requestOk = false;
      }
      if (!requestOk) problems.push(label + ' has a request that is not the manifest\'s');
      if (!isObject(record.value)) problems.push(label + ' has no value object');
    });
    return problems;
  }

  /**
   * Merges ledgers. `files` is [{ name, ledger }] (or { name, error } for a file that could not be read or
   * parsed). Valid only when every ledger is valid and every manifest key has exactly one record.
   * @returns {{ ok: boolean, problems: string[], records: ({ key, request, value }[]|null) }}
   */
  function merge(files, expect) {
    var problems = [];
    var found = {};
    var order = files.slice().sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    if (order.length === 0) problems.push('no ledger to merge');
    order.forEach(function (file) {
      if (file.error !== undefined) {
        problems.push(file.name + ': ' + file.error);
        return;
      }
      var own = checkLedger(file.ledger, expect);
      own.forEach(function (problem) { problems.push(file.name + ': ' + problem); });
      if (!isObject(file.ledger) || !Array.isArray(file.ledger.records)) return;
      file.ledger.records.forEach(function (record) {
        if (!isObject(record) || typeof record.key !== 'string') return;
        (found[record.key] = found[record.key] || []).push({ name: file.name, record: record });
      });
    });
    var records = [];
    expect.manifest.forEach(function (entry) {
      var list = found[entry.key] || [];
      if (list.length === 0) problems.push(entry.key + ': missing (no ledger records it)');
      else if (list.length > 1) {
        problems.push(entry.key + ': duplicate, recorded by ' +
          list.map(function (x) { return x.name; }).join(' and '));
      } else records.push({ key: entry.key, request: entry.request, value: list[0].record.value });
    });
    return { ok: problems.length === 0, problems: problems, records: problems.length === 0 ? records : null };
  }

  function show(value) {
    var text = value === undefined ? 'undefined' : JSON.stringify(value);
    return text.length > 60 ? text.slice(0, 57) + '...' : text;
  }

  /** The field differences between two plain values: [{ path, saved, fresh }] in a fixed order. */
  function diffValues(saved, fresh, path, out) {
    var diffs = out || [];
    var here = path || '';
    if (Array.isArray(saved) && Array.isArray(fresh)) {
      if (saved.length !== fresh.length) {
        diffs.push({ path: here + '.length', saved: saved.length, fresh: fresh.length });
      }
      for (var i = 0; i < Math.min(saved.length, fresh.length); i++) {
        diffValues(saved[i], fresh[i], here + '[' + i + ']', diffs);
      }
    } else if (isObject(saved) && isObject(fresh)) {
      var keys = Object.keys(saved);
      Object.keys(fresh).forEach(function (key) { if (keys.indexOf(key) === -1) keys.push(key); });
      keys.forEach(function (key) {
        var inSaved = Object.prototype.hasOwnProperty.call(saved, key);
        var inFresh = Object.prototype.hasOwnProperty.call(fresh, key);
        var child = here === '' ? key : here + '.' + key;
        if (inSaved && inFresh) {
          diffValues(saved[key], fresh[key], child, diffs);
        } else {
          diffs.push({ path: child, saved: inSaved ? saved[key] : undefined,
            fresh: inFresh ? fresh[key] : undefined });
        }
      });
    } else if (!(saved === fresh || (typeof saved === 'number' && typeof fresh === 'number' &&
      isNaN(saved) && isNaN(fresh)))) {
      diffs.push({ path: here, saved: saved, fresh: fresh });
    }
    return diffs;
  }

  /** One line for a difference of `diffValues`. */
  function diffLine(diff) {
    return diff.path + ': saved ' + show(diff.saved) + ', fresh ' + show(diff.fresh);
  }

  /**
   * Runs `fn` with `level` offered by the variant (a missing level is added to a copy of its support array;
   * the exact original array is put back in `finally`). A level that is not a level of the ladder changes
   * nothing. Only for fixed diagnostic requests whose level qualification has hidden: never a change of a
   * production offer.
   * @returns {{ value: *, overridden: boolean }}
   */
  function withRequestedLevel(variantId, level, fn) {
    var def = SG.variants.get(variantId);
    var original = def.difficultySupport;
    var ladder = SG.difficulty.LEVELS;
    var overridden = original.indexOf(level) === -1 && ladder.indexOf(level) !== -1;
    if (overridden) {
      def.difficultySupport = ladder.filter(function (name) {
        return original.indexOf(name) !== -1 || name === level;
      });
    }
    try {
      return { value: fn(), overridden: overridden };
    } finally {
      if (overridden) def.difficultySupport = original;
    }
  }

  SG.fixtures.toolRecords = {
    SCHEMA: SCHEMA,
    canonicalJson: canonicalJson,
    keysOf: keysOf,
    manifestText: manifestText,
    selectKeys: selectKeys,
    ledgerOf: ledgerOf,
    ledgerText: ledgerText,
    checkLedger: checkLedger,
    merge: merge,
    diffValues: diffValues,
    diffLine: diffLine,
    withRequestedLevel: withRequestedLevel
  };
})();
