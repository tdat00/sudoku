'use strict';

/*
 * MS18d Phase C0 task-owned (G3): the classifier of ONE stock GP cell, on retained bytes only (stdout and
 * stderr kept apart, the tee's final line, the real CLI exit and signal, the barrier verdict). It implements
 * the complete-result predicate of the Phase C plan:
 *   - the actual command line is the frozen one (`node tests\perf.js --variant=V --level=L --runs=50
 *     --warmup=0 --seed=7000 --gate --ascii`);
 *   - stdout is EXACTLY the stock output of one cell: the header declaring 50 runs, trace summary and seed
 *     7000 (and the frozen Node and CPU), the legend, the column header, exactly one row for the requested
 *     cell with the frozen target, the summary `1 of 1` or `0 of 1`, and for a miss the `Misses:` block with
 *     the one entry of that cell. Every line is rebuilt with the stock padding and compared, nothing is
 *     inferred;
 *   - `ok` + `1 of 1` + real exit 0 is a complete success; `MISS` + `0 of 1` + the matching `Misses:` entry
 *     + real exit 1 is a complete miss (the row's mark is authoritative: the rounded p95 and the rounded
 *     percentage decide nothing);
 *   - stderr is empty (zero raw bytes, counted by the tee; one stray byte is a stop), there was no signal,
 *     the tee's last line is `exit=<the real exit> seconds=<n>` and the tee's own exit equals it, and the
 *     barrier found no process of ours alive (verdict `clean`);
 *   - anything else is a STOP (the controller exits 65): exit 1 alone is never enough, a crash is not a
 *     miss, an exit-0 tee is not a pass. All the reasons found are listed, never only the first.
 * The generic profile (a command that is not a GP cell) accepts exit 0 only. Pure: no file, no clock.
 */
const STOP_EXIT = 65;

const pad = (text, width, left) => {
  const s = String(text);
  if (s.length >= width) return s;
  return left ? s + ' '.repeat(width - s.length) : ' '.repeat(width - s.length) + s;
};
const fmtTarget = (ms) => (ms >= 1000 ? (ms / 1000) + ' s' : ms + ' ms');

const LEGEND = 'p95 target = design.md section 9.1; cells = variant x level the variant offers';
const COLUMNS = pad('variant', 12, true) + pad('level', 10, true) + pad('target', 9) + pad('p50', 9) +
  pad('p95', 9) + pad('max', 9) + pad('mean', 9) + '   ' + 'result';
const NUM = '(\\d+(?:\\.\\d+)?)';
const HEADER = new RegExp('^Sudoku Generator performance {2}\\(node (v[^\\s,]+), (.+), (\\d+) runs per cell' +
  '(?:, (\\d+) warm-up)?, trace summary, seed (\\d+)\\)$');
const ROW = new RegExp('^(\\S+)\\s+(\\S+)\\s+(\\d+(?:\\.\\d+)? (?:ms|s))\\s+' + NUM + '\\s+' + NUM + '\\s+' +
  NUM + '\\s+' + NUM + '\\s{3}(ok|MISS)$');
const SUMMARY = /^(\d+) of (\d+) cells meet their p95 target \((\d+) %, acceptance: at least 90 %\)$/;
const MISS_ENTRY = new RegExp('^ {2}(\\S+): p95 ' + NUM + ' ms against (\\d+(?:\\.\\d+)? (?:ms|s)) ' +
  '\\(x(\\d+\\.\\d{2})\\), max ' + NUM + ' ms$');

const expectedArgv = (variant, level) => ['tests\\perf.js', '--variant=' + variant, '--level=' + level,
  '--runs=50', '--warmup=0', '--seed=7000', '--gate', '--ascii'];

const normalize = (text) => String(text === null || text === undefined ? '' : text).replace(/\r\n/g, '\n');

/**
 * C0-3 (SA1): a complete result has ZERO bytes on stderr. The retained stderr file is line-normalised, so
 * the tee also counts the raw bytes that arrived on the pipe; a missing count is as incomplete as a
 * non-zero one.
 */
function stderrBytesProblem(input, bad) {
  if (!Number.isInteger(input.stderrBytes)) {
    bad('stderr-output', 'the raw stderr byte count was not recorded');
  } else if (input.stderrBytes !== 0) {
    bad('stderr-output', input.stderrBytes + ' raw byte(s) arrived on stderr');
  }
}

/**
 * The stock stdout of a one-cell run against the expectation:
 * { kinds, problems, header, row, summary, miss }.
 */
function parseStock(stdout, expected) {
  const kinds = [];
  const problems = [];
  const bad = (kind, text) => {
    if (kinds.indexOf(kind) === -1) kinds.push(kind);
    problems.push(text);
  };
  const out = { kinds, problems, header: null, row: null, summary: null, miss: null };
  const body = normalize(stdout).replace(/\n$/, '');
  const lines = body === '' ? [] : body.split('\n');
  let i = 0;
  const next = () => (i < lines.length ? lines[i++] : null);
  const key = expected.variant + '/' + expected.level;

  const headerLine = next();
  if (headerLine === null) {
    bad('partial-output', 'stdout is empty');
    return out;
  }
  const h = HEADER.exec(headerLine);
  if (!h) {
    bad('wrong-header', 'the first line is not the stock header: ' + headerLine);
  } else {
    out.header = { node: h[1], cpu: h[2], runs: Number(h[3]), warmup: h[4] === undefined ? 0 : Number(h[4]),
      seed: Number(h[5]) };
    if (out.header.runs !== expected.runs || out.header.warmup !== 0 || out.header.seed !== expected.seed) {
      bad('wrong-header', 'the header declares ' + out.header.runs + ' runs, warm-up ' + out.header.warmup +
        ', seed ' + out.header.seed);
    }
    if (expected.node && out.header.node !== expected.node) {
      bad('wrong-header', 'the header names node ' + out.header.node);
    }
    if (expected.cpu && out.header.cpu !== expected.cpu) {
      bad('wrong-header', 'the header names the CPU ' + out.header.cpu);
    }
  }
  const expectLine = (text, what) => {
    const line = next();
    if (line === null) {
      bad('partial-output', 'stdout ends before ' + what);
      return false;
    }
    if (line !== text) {
      bad('wrong-format', what + ' is not the stock line: ' + line);
      return false;
    }
    return true;
  };
  if (!expectLine(LEGEND, 'the legend')) return out;
  if (!expectLine('', 'the blank line')) return out;
  if (!expectLine(COLUMNS, 'the column header')) return out;

  const rowLine = next();
  if (rowLine === null) {
    bad('partial-output', 'stdout ends before the result row');
    return out;
  }
  const r = ROW.exec(rowLine);
  if (!r) {
    bad('wrong-format', 'the result row is not a stock row: ' + rowLine);
    return out;
  }
  out.row = { variant: r[1], level: r[2], target: r[3], p50: r[4], p95: r[5], max: r[6], mean: r[7],
    mark: r[8] };
  const rebuilt = pad(r[1], 12, true) + pad(r[2], 10, true) + pad(r[3], 9) + pad(r[4], 9) + pad(r[5], 9) +
    pad(r[6], 9) + pad(r[7], 9) + '   ' + r[8];
  if (rebuilt !== rowLine) bad('wrong-format', 'the result row is not stock padded: ' + rowLine);
  if (r[1] !== expected.variant || r[2] !== expected.level) {
    bad('wrong-cell', 'the row is ' + r[1] + '/' + r[2] + ', not ' + key);
  }
  if (r[3] !== fmtTarget(expected.targetMs)) {
    bad('wrong-target', 'the row names the target ' + r[3] + ', not ' + fmtTarget(expected.targetMs));
  }
  const second = next();
  if (second === null) {
    bad('partial-output', 'stdout ends before the summary');
    return out;
  }
  if (second !== '') {
    bad('wrong-count', 'there is more than one result row or an unexpected line: ' + second);
    return out;
  }
  const summaryLine = next();
  if (summaryLine === null) {
    bad('partial-output', 'stdout ends before the summary');
    return out;
  }
  const s = SUMMARY.exec(summaryLine);
  if (!s) {
    bad('wrong-format', 'the summary is not the stock line: ' + summaryLine);
    return out;
  }
  out.summary = { met: Number(s[1]), cells: Number(s[2]), percent: s[3] };
  if (out.summary.cells !== 1 || (out.summary.met !== 0 && out.summary.met !== 1)) {
    bad('wrong-count', 'the summary is ' + s[1] + ' of ' + s[2] + ', not 1 of 1 or 0 of 1');
  } else if (s[3] !== (out.summary.met === 1 ? '100' : '0')) {
    bad('contradiction', 'the summary percentage ' + s[3] + ' does not fit ' + s[1] + ' of ' + s[2]);
  }
  if (out.row.mark === 'ok' && out.summary.met !== 1) {
    bad('contradiction', 'the row says ok but the summary is ' + s[1] + ' of ' + s[2]);
  }
  if (out.row.mark === 'MISS' && out.summary.met !== 0) {
    bad('contradiction', 'the row says MISS but the summary is ' + s[1] + ' of ' + s[2]);
  }

  if (out.row.mark === 'MISS') {
    const label = next();
    if (label === null) {
      bad('missing-miss-entry', 'a MISS without the Misses: block');
      return out;
    }
    if (label !== 'Misses:') {
      bad('missing-miss-entry', 'the line after a MISS summary is not Misses:: ' + label);
      return out;
    }
    const entryLine = next();
    const e = entryLine === null ? null : MISS_ENTRY.exec(entryLine);
    if (!e) {
      bad('missing-miss-entry', 'the Misses: block has no stock entry' +
        (entryLine === null ? '' : ': ' + entryLine));
      return out;
    }
    out.miss = { key: e[1], p95: e[2], target: e[3], ratio: e[4], max: e[5] };
    if (e[1] !== key) bad('missing-miss-entry', 'the Misses: entry is for ' + e[1] + ', not ' + key);
    if (e[3] !== fmtTarget(expected.targetMs)) {
      bad('missing-miss-entry', 'the Misses: entry names the target ' + e[3]);
    }
  }
  if (i < lines.length) bad('extra-output', 'stdout continues after the result: ' + lines[i]);
  return out;
}

/**
 * input: { expected: { variant, level, targetMs, runs, seed, node, cpu }, stdout, stderr,
 *          cli: { exit, signal }, tee: { marker, exit }, argvLine, barrier: { verdict }, binding: { ok },
 *          acquisition: { decision } }.
 */
function classifyGpRun(input) {
  const { expected, cli, tee } = input;
  const kinds = [];
  const problems = [];
  const bad = (kind, text) => {
    if (kinds.indexOf(kind) === -1) kinds.push(kind);
    problems.push(text);
  };
  const exitCode = cli && Number.isInteger(cli.exit) ? cli.exit : null;
  if (!cli || cli.signal) bad('cli-signal', 'the command ended on the signal ' + (cli && cli.signal));
  if (exitCode === null && !(cli && cli.signal)) bad('cli-no-exit', 'the command has no recorded exit code');

  const stderr = input.stderr === null || input.stderr === undefined ? null : String(input.stderr);
  if (stderr === null) bad('stderr-output', 'the retained stderr is missing');
  else if (stderr !== '') bad('stderr-output', 'stderr is not empty (' + stderr.length + ' characters)');
  stderrBytesProblem(input, bad);

  const want = '$ node ' + expectedArgv(expected.variant, expected.level).join(' ');
  if (input.argvLine !== want) bad('wrong-argv', 'the command line is not the frozen one: ' + input.argvLine);

  const marker = tee ? tee.marker : null;
  const m = typeof marker === 'string' ? /^exit=(\d+) seconds=[0-9.]+$/.exec(marker) : null;
  if (!m) bad('marker-missing', 'the tee transcript does not end with exit=<code> seconds=<n>: ' + marker);
  else if (exitCode !== null && Number(m[1]) !== exitCode) {
    bad('tee-status-mismatch', 'the tee says exit ' + m[1] + ' but the command exit was ' + exitCode);
  }
  if (!tee || !Number.isInteger(tee.exit) || (exitCode !== null && tee.exit !== exitCode)) {
    bad('tee-status-mismatch', 'the tee process exit ' + (tee && tee.exit) +
      ' differs from the command exit ' + exitCode);
  }

  if (!input.barrier || input.barrier.verdict !== 'clean') {
    bad('orphan', 'the orphan barrier did not find the command and its descendants gone: ' +
      (input.barrier && input.barrier.verdict));
  }
  if (!input.binding || input.binding.ok !== true) {
    bad('binding', 'the source binding is not a proved success');
  }
  if (!input.acquisition || input.acquisition.decision !== 'proceed') {
    bad('admission', 'the acquisition was not proceeded');
  }

  const stock = parseStock(input.stdout, expected);
  stock.kinds.forEach((k) => { if (kinds.indexOf(k) === -1) kinds.push(k); });
  stock.problems.forEach((p) => problems.push(p));
  if (stock.row && stock.summary && stock.kinds.length === 0) {
    if (stock.row.mark === 'ok' && exitCode !== 0) {
      bad('contradiction', 'ok and 1 of 1 with the exit code ' + exitCode);
    }
    if (stock.row.mark === 'MISS' && exitCode !== 1) {
      bad('contradiction', 'MISS and 0 of 1 with the exit code ' + exitCode);
    }
  }
  if (stock.kinds.indexOf('partial-output') !== -1 && exitCode === 1 && stderr) {
    bad('crash', 'exit 1 with a stack on stderr and no complete result: a crash, not a MISS');
  }

  const complete = problems.length === 0;
  const outcome = !complete ? 'stop' : stock.row.mark === 'ok' ? 'success' : 'miss';
  return {
    schema: 'ms18d-c-result-class-1', profile: 'gp-cell', outcome, complete,
    controllerExit: !complete ? STOP_EXIT : outcome === 'success' ? 0 : 1,
    kinds, problems, header: stock.header, row: stock.row, summary: stock.summary, miss: stock.miss,
    cli: { exit: exitCode, signal: cli ? cli.signal || null : null },
    tee: { marker: marker === undefined ? null : marker,
      exit: tee && tee.exit !== undefined ? tee.exit : null }
  };
}

/** A command that is not a GP cell: exit 0 with a clean transport and barrier, nothing else. */
function classifyGenericRun(input) {
  const { cli, tee } = input;
  const kinds = [];
  const problems = [];
  const bad = (kind, text) => {
    if (kinds.indexOf(kind) === -1) kinds.push(kind);
    problems.push(text);
  };
  const exitCode = cli && Number.isInteger(cli.exit) ? cli.exit : null;
  if (!cli || cli.signal) {
    bad('cli-signal', 'the command ended on the signal ' + (cli && cli.signal));
  } else if (exitCode !== 0) {
    bad('cli-nonzero', 'the command exit was ' + exitCode + ': only 0 is accepted for this profile');
  }
  stderrBytesProblem(input, bad);
  const m = tee && typeof tee.marker === 'string' ? /^exit=(\d+) seconds=[0-9.]+$/.exec(tee.marker) : null;
  if (!m) bad('marker-missing', 'the tee transcript does not end with exit=<code> seconds=<n>');
  else if (exitCode !== null && Number(m[1]) !== exitCode) {
    bad('tee-status-mismatch', 'the tee says exit ' + m[1]);
  }
  if (!tee || tee.exit !== exitCode) {
    bad('tee-status-mismatch', 'the tee process exit differs from the command exit');
  }
  if (!input.barrier || input.barrier.verdict !== 'clean') {
    bad('orphan', 'the orphan barrier verdict is not clean');
  }
  if (!input.binding || input.binding.ok !== true) {
    bad('binding', 'the source binding is not a proved success');
  }
  if (!input.acquisition || input.acquisition.decision !== 'proceed') {
    bad('admission', 'the acquisition was not proceeded');
  }
  const complete = problems.length === 0;
  return {
    schema: 'ms18d-c-result-class-1', profile: 'generic', outcome: complete ? 'success' : 'stop', complete,
    controllerExit: complete ? 0 : STOP_EXIT, kinds, problems,
    cli: { exit: exitCode, signal: cli ? cli.signal || null : null },
    tee: { marker: tee ? tee.marker : null, exit: tee ? tee.exit : null }
  };
}

module.exports = { classifyGpRun, classifyGenericRun, parseStock, expectedArgv, fmtTarget, pad, STOP_EXIT,
  LEGEND, COLUMNS };
