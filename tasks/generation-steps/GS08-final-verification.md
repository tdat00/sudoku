# GS08 — Final verification (Q9 c) and release evidence

| Header | Value |
|---|---|
| ID | GS08 |
| Depends on | GS07 (accepted and committed); GS01–GS06 accepted and committed |
| Estimated size | Medium: about 1 hour of runs; one dated section of `docs/qa/browser-run.md` |
| Owner role | QA / release |
| Milestone | M8 — the integrated branch is verified; the release record can be filled |
| Design refs | `docs/generation-steps/report-detailed.md` R1, R18, §9.3, §10 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The user asked (2026-10-28) for a Generation Steps replay where every step has a score table and the score rises
steadily, with the generator itself unchanged (N1–N3), and later (13:54) for an explanation of every score jump
that grouping cannot remove (N4). GS01–GS07 built it, each checked with the quick suites only. The user decided
(Q9 c, 15:58) that at the end, **once**, the full generator set (`--all`), the player's browser scripts and the
generator's browser test page run on the integrated branch. This task runs them, adds the checks that only a real
page or a comparison with the old tree can give (the main-mode wait of Q19 a, the frames, the byte identity of the
puzzle, the cache entry, the history entry and the export), records the results, and reports defects. It never
fixes product code.

## Scope

### In scope

- The final gates of [check-list §7](check-list.md#7-final-gates-q9-c--run-once-in-gs08), in the order below.
- Scripts and evidence in **E — this task's experiment folder, not part of the repository**, supplied by the
  orchestrator in `SG_REPLAY_EVIDENCE`. No absolute value of E goes in a document.
- Full tracked-tree snapshots of the accepted candidate HEAD and baseline `8d9510a`, under `E\candidate` and
  `E\baseline`. Browser helpers run from the candidate snapshot, so their profiles/screenshots stay in E too.
- A new dated section in `docs/qa/browser-run.md`, right after "How to repeat" (the dated sections are newest
  first), and new bullets in its last section "What was not checked"; in English, no absolute path, CRLF.

### Out of scope

- Any change to product code, tests, fixtures, the regression hashes, the qualification lists, the guides, `design.md`
  or the task pack. A failure is a **defect report** to the orchestrator (file, test, message, how to reproduce).
- `soak.js`, `perf.js`, `qualify.js`, `--update-hashes` / `SG_UPDATE_HASHES`, `SG_DEEP=1`, `--manual` alone,
  `tests.html?all=1`. Only the commands of this task.
- Screenshots of `docs/screenshots/` (not retaken in this change; say so in "What was not checked").

## Repository rules

- Never commit, stage, stash, push or switch branches; only read-only git commands (`status`, `log`, `diff`,
  `archive`, `branch`, `rev-parse`, `for-each-ref`). The orchestrator commits the QA section after acceptance.
- Stop only processes this task started, by PID (`Stop-Process -Id <pid>`); never by name.
- Run `--all` alone: its manual suites measure time (`perf`), so nothing else runs at the same time.
- The scripts below serve snapshots on `127.0.0.1` only and write only in E. Do not import the working-tree
  browser helper: merely requiring it creates `player/.scratch-shots`. Never use the system temporary directory.
- If a script of this task fails for a reason that is not the product (a typo, a timing, a selector that GS05/GS06
  named differently), fix the **script**, say what changed in the handoff, and run it again; never change the
  product to suit the script.

## Inputs & context

### What the page must do (from GS01–GS06)

- With a Worker (served over http): after the puzzle appears, the score tables are prepared in the background
  (`#replay-status` shows "Preparing the score tables… {done} of {total}"), then the replay opens in the compact
  view. The example (`?v=classic9&d=expert&seed=3275974478`) has **7** compact steps with the Totals `0`,
  `23 (+23)`, `44 (+21)`, `551 (+507)`, `568 (+17)`, `992 (+424)`, `992 (unchanged)` and **33** steps with
  "Show every move"; compact step 4 ↔ details step 24; details step 26 → compact step 5.
- Step 4: in `#steps-heading` a `span.step-badge.step-badge--jump` "Score jump ×12.5" (Vietnamese "Điểm tăng vọt
  ×12,5"); in `#step-detail` a `div.step-callout` with `p.step-callout__heading` "Score jump: 44 → 551 (+507)"
  (Vietnamese "Điểm tăng vọt: 44 → 551 (+507)") and a closed `details.step-why`; on the board exactly one
  `.cell--cause` (R1C2) and the legend "Removing this clue causes the score jump"; the Total row
  `tr.step-table__total [data-role="score"]` reads "551 (+507)".
- Without a Worker (Q17 b, Q19 a; e.g. `file://`): the finished puzzle and its Summary are usable at once; the
  replay shows only `#replay-status` with the notice (it names the button "Prepare score tables") and
  `#btn-prepare-replay`; `#scrubber`, `#btn-first`, `#btn-prev`, `#btn-next`, `#btn-last` and
  `#replay-view-details` are disabled; no score table; nothing starts by itself. After the press: both views.
- Greater-Than Expert seed 42 (`?v=greaterThan&d=expert&seed=42`, about 9 s to generate): **9** compact steps; step 7
  is the jump 242 → 973, badge "Score jump ×4.0", exactly one `.sign--cause` (the sign R2C4 < R1C4).
- The toggle is `input#replay-view-details` inside `label.replay-view` ("Show every move", Vietnamese "Hiện từng
  thay đổi"); the scrubber `#scrubber` has `max` = the number of steps of the view and `value` = the position.

### Known values at the baseline `8d9510a` (measured for this task)

`digest.js` (below) printed, at `8d9510a` and identically on two runs:

```text
payload  d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d
cache    2 sg.cache.v1
key      82d89648e2b42748872a110f6355d7c3416055201dcae2a5d340383d5371503e
entry    14fcbdf8dde2a49a69def46ecbb6643751dce0369185618c98461e25124d9d12
history  fa83aa721063b3ff02812713601afeb1e7bf0ce7c9733afc99a9e7261d188b03
export   897e6f3033f5e0036a12e685744465d67b5d796bd2d635949b974e9d6a5889a7
```

The branch must print the same six lines (the payload digest, the cache version and storage key, the cache key of
the request, the stored cache entry, the history entry and the export).

The prototype of the design measured the ratings of the 107-request corpus at a median of 3.14 ms per puzzle, p95
160.22 ms, maximum 594.34 ms (Mega 16×16 Hell 2 seed 12 = G14), and the explanations of 84 compact jumps at
132.42 ms in all (report §7.5): the sweep below records the real numbers.

### How the browser runs work today

- `player/tests/browser/run-all.js` runs `fragment.js` (file and http), `open.js`, `play.js`, `ui.js`, `visual.js`,
  `help.js` and `links.js` in headless Microsoft Edge (Node 22 or later, about four minutes). They use the HTTP ports
  8765, 8766, 8768, 8769, 8771, 8772, 8774 and the DevTools ports 9333–9345. `EDGE_PATH` selects another
  Chromium-based browser; the default is Edge's standard installation path on Windows.
- `player/tests/browser/lib.js` exports `launch({ port, name })` (a headless browser with a throw-away profile in
  `player/.scratch-profile/`, closed by `browser.close()`), `newPage(browser, url)`, `sleep` and the class `Page`
  (`eval`, `waitFor(expression, timeout)`, `click(selector)` with real mouse events, `send(method, params)`,
  `errors`: console errors and exceptions, `close()`, `targetId`). Its own `serve()` refuses any path that contains
  `.scratch`, so this task uses its own static server (D10).
- `generator/tests.html` loads the quick suites, runs them on load, then sets `#summary` to "N tests: … passed, …
  failed, … skipped — …" with the class `summary pass` or `summary fail`, and `document.title` to "✓ Sudoku
  Generator - tests" or "✗ …". Each failure is an `li` of `#failure-list` with `strong.fail` (the full name) and a
  `div` (the message); unloadable files are listed in `#missing-list`. Existing browser failures, if any, are
  recorded baseline limitations, not failures "by design". No new failure, missing file or runtime exception is
  accepted, and the new replay suite must actually run. No committed script runs `tests.html` today;
  `docs/qa/browser-run.md` records that it was
  opened by hand.
- Ports of this task (D10): 8790 / 9390 (`tests.html`, branch), 8791 / 9391 (`tests.html`, baseline),
  8792 / 9392 (the smoke). Check they are free first.

## Files to create/modify

### Exclusive ownership

- `docs/qa/browser-run.md` (one new dated section after "How to repeat"; new bullets in "What was not checked").
- E only for scripts, snapshots, profiles and raw evidence; no scratch files in the working tree.

### Documentation slot

The dated section of `docs/qa/browser-run.md` (template in step 10).

## Implementation steps

### 1. Preconditions

```powershell
$ErrorActionPreference = 'Stop'
$branch = git --no-pager branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'generation-steps') { throw 'Wrong or unreadable branch' }
$status = git --no-pager status --porcelain
if ($LASTEXITCODE -ne 0 -or $status) { throw 'Candidate must be clean and committed' }
$root = git --no-pager rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve repository root' }
if ((Get-Location).Path -ne [System.IO.Path]::GetFullPath($root)) { throw 'Run from the repository root' }
git --no-pager log --oneline 8d9510a..HEAD         # documents, then accepted GS01..GS07 commits
if ($LASTEXITCODE -ne 0) { throw 'Cannot read accepted commits' }
$upstream = git --no-pager for-each-ref '--format=%(upstream)' refs/heads/generation-steps
if ($LASTEXITCODE -ne 0 -or $upstream) { throw 'The branch must not have an upstream' }
$version = node --version
if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v24\.') { throw 'Node 24 is required' }
$edge = if ($env:EDGE_PATH) { $env:EDGE_PATH }
  else { "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path -LiteralPath $edge -PathType Leaf)) { throw 'Browser executable not found' }
$E = $env:SG_REPLAY_EVIDENCE                     # supplied outside this repository
if (-not $E) { throw 'SG_REPLAY_EVIDENCE is required' }
if (-not [System.IO.Path]::IsPathFullyQualified($E)) { throw 'Supply E as a fully qualified environment value' }
$Candidate = git --no-pager rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve candidate' }
```

Ports free (an empty answer means free; if not, wait or report, never stop a process you did not start):

```powershell
$ports = @(8765..8774) + @(8790..8792) + @(9333..9345) + @(9390..9392)
$busy = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $ports -contains $_.LocalPort }
if ($busy) { $busy | Select-Object LocalPort, OwningProcess; throw 'Required ports are in use' }
```

### 2. The external evidence folder and snapshots

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
if (-not $E) { throw 'SG_REPLAY_EVIDENCE is required' }
$root = git --no-pager rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve repository root' }
$repo = [System.IO.Path]::GetFullPath($root).TrimEnd('\')
$eFull = [System.IO.Path]::GetFullPath($E).TrimEnd('\')
if ($eFull -eq $repo -or $eFull.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Evidence must be outside the repository'
}
if (Test-Path $E) {
  if (Get-ChildItem $E -Force) { throw 'Use a fresh empty evidence folder; do not overwrite another run' }
}
New-Item -ItemType Directory -Force $E | Out-Null
$Candidate = git --no-pager rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve candidate' }
foreach ($item in @(@('candidate', $Candidate), @('baseline', '8d9510a'))) {
  $dest = Join-Path $E $item[0]
  $archive = Join-Path $E ($item[0] + '.tar')
  New-Item -ItemType Directory $dest | Out-Null
  git archive --format=tar --output=$archive $item[1]
  if ($LASTEXITCODE -ne 0) { throw 'Archive failed' }
  tar -x -f $archive -C $dest
  if ($LASTEXITCODE -ne 0) { throw 'Extraction failed' }
}
$version = node --version
if ($LASTEXITCODE -ne 0) { throw 'Cannot read Node version' }
@{ purpose = 'generation-steps-GS08'; candidate = $Candidate; baseline = '8d9510a'; node = $version } |
  ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $E 'run.json')
```

(Do not use `git worktree` or `git stash`; do not pipe binary data between commands in PowerShell.)

Create the six scripts below in E (UTF-8). Each fresh shell must receive `SG_REPLAY_EVIDENCE`; run commands from
the working repository root unless a block explicitly changes it. Do not restart this snapshot-creation block
on a non-empty E: retain the run's immutable candidate and its evidence.

`E\common.js`:

```js
'use strict';
// GS08 helpers in the external evidence folder: a static server for a snapshot, and the
// generator's scripts loaded into Node the way tests/node-runner.js loads them.
const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const E = process.env.SG_REPLAY_EVIDENCE && path.resolve(process.env.SG_REPLAY_EVIDENCE);
if (!E) throw new Error('SG_REPLAY_EVIDENCE is required');
const CANDIDATE = path.join(E, 'candidate');
const BASELINE = path.join(E, 'baseline');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.md': 'text/plain; charset=utf-8', '.png': 'image/png' };

function serveDir(root, port) {
  const base = path.resolve(root);
  const server = http.createServer(function (req, res) {
    let url;
    try { url = decodeURIComponent(req.url.split('?')[0]); }
    catch (err) { res.writeHead(400); res.end(); return; }
    if (url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const file = path.normalize(path.join(base, url.endsWith('/') ? url + 'index.html' : url));
    if (!file.startsWith(base + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, function (err, data) {
      if (err) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise(function (resolve, reject) {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', function () { resolve(server); });
  });
}

function loadGenerator(root, extra) {
  const gen = path.join(path.resolve(root), 'generator');
  const runner = fs.readFileSync(path.join(gen, 'tests', 'node-runner.js'), 'utf8');
  const match = /^const SOURCE_FILES = (\[[\s\S]*?\n\]);/m.exec(runner);
  if (!match) throw new Error('SOURCE_FILES not found in ' + gen);
  for (const rel of vm.runInNewContext(match[1]).concat(extra || [])) {
    const file = path.join(gen, ...rel.split('/'));
    vm.runInThisContext(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), { filename: file });
  }
  return globalThis.SG;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value, function (k, v) { return ArrayBuffer.isView(v) ? Array.from(v) : v; }));
}

module.exports = { E, CANDIDATE, BASELINE, serveDir, loadGenerator, plain };
```

`E\digest.js` (the baseline values above were checked at `8d9510a`):

```js
'use strict';
// GS08 (N1): the example's payload digest and the bytes it stores or exports.
// node digest.js <snapshot-root>
const crypto = require('crypto');
const { loadGenerator, plain, CANDIDATE } = require('./common.js');

const KNOWN = 'd350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d';
const SG = loadGenerator(process.argv[2] || CANDIDATE);
const sha = (v) => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(plain(v)))
  .digest('hex');
const config = SG.store.toConfig({ variantId: 'classic9', difficulty: 'expert', seed: '3275974478' });
const r = SG.pipeline.run(config, null, SG.budget.create({ ms: 120000 }));
const w = SG.pipeline.toWire(r);
const payload = sha({ model: w.model, givens: w.givens, solution: w.solution, rating: w.rating, config: w.config,
  digLog: w.digLog, warnings: w.warnings, seed: w.seed, attempts: w.attempts });
r.timings = {};
function identity() {
  return {
    payload,
    cache: SG.cache.VERSION + ' ' + SG.cache.STORAGE_KEY,
    key: sha(SG.cache.configKey(r.config)),
    entry: sha(JSON.stringify(SG.cache.serialize(r))),
    history: sha(JSON.stringify(SG.history.entryOf(r))),
    export: sha(JSON.stringify(SG.exportUi.toJson(r, { generatedAt: '2026-10-28T00:00:00.000Z' })))
  };
}
const expected = {
  payload: KNOWN, cache: '2 sg.cache.v1',
  key: '82d89648e2b42748872a110f6355d7c3416055201dcae2a5d340383d5371503e',
  entry: '14fcbdf8dde2a49a69def46ecbb6643751dce0369185618c98461e25124d9d12',
  history: 'fa83aa721063b3ff02812713601afeb1e7bf0ce7c9733afc99a9e7261d188b03',
  export: '897e6f3033f5e0036a12e685744465d67b5d796bd2d635949b974e9d6a5889a7'
};
const before = JSON.stringify(plain(SG.pipeline.toWire(r)));
const keysBefore = Reflect.ownKeys(r);
if (SG.replay) SG.replay.analyse(r);
if (JSON.stringify(plain(SG.pipeline.toWire(r))) !== before ||
    Reflect.ownKeys(r).length !== keysBefore.length ||
    Reflect.ownKeys(r).some((key, i) => key !== keysBefore[i])) throw new Error('Analysis mutated the result');
const actual = identity();
for (const key of Object.keys(expected)) {
  console.log(key.padEnd(9) + actual[key]);
  if (actual[key] !== expected[key]) throw new Error(key + ' identity differs');
}
```

`E\strings.js` (two baseline copies yielded 0 differences):

```js
'use strict';
// GS08: the string keys added, changed or removed since the baseline, for the English / Vietnamese review.
//   node strings.js dump <root> <file.json>
//   node strings.js diff <baseline.json> <branch.json> <file.md>
const fs = require('fs');

const [mode, a, b, c] = process.argv.slice(2);
if (mode === 'dump') {
  const SG = require('./common.js').loadGenerator(a);
  const out = {};
  SG.i18n.keys('en').concat(SG.i18n.keys('vi')).forEach(function (key) {
    out[key] = [SG.locales.en[key] === undefined ? null : SG.locales.en[key],
      SG.locales.vi[key] === undefined ? null : SG.locales.vi[key]];
  });
  fs.writeFileSync(b, JSON.stringify(out, null, 1) + '\n');
} else if (mode === 'diff') {
  const before = JSON.parse(fs.readFileSync(a, 'utf8'));
  const after = JSON.parse(fs.readFileSync(b, 'utf8'));
  const cell = (s) => s === null ? '—' : String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const lines = ['| Change | Key | English | Vietnamese |', '|---|---|---|---|'];
  const keys = Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).sort();
  let n = 0;
  keys.forEach(function (key) {
    const x = before[key];
    const y = after[key];
    const change = x === undefined ? 'new' : y === undefined ? 'removed' :
      JSON.stringify(x) !== JSON.stringify(y) ? 'changed' : null;
    if (change === null) return;
    n++;
    const z = y === undefined ? x : y;
    lines.push('| ' + change + ' | `' + key + '` | ' + cell(z[0]) + ' | ' + cell(z[1]) + ' |');
  });
  fs.writeFileSync(c, lines.join('\r\n') + '\r\n');
  console.log(n + ' keys added, changed or removed; table in ' + c);
} else {
  console.error('usage: strings.js dump <root> <file.json> | diff <baseline.json> <branch.json> <file.md>');
  process.exitCode = 2;
}
```

`E\sweep.js` (all golden fields and the complete two-view cost; run with `--expose-gc`):

```js
'use strict';
// GS08: immutable golden expectations, full preparation, and approximate retained memory (not peak memory).
const fs = require('fs');
const path = require('path');
const { loadGenerator, plain, E, CANDIDATE } = require('./common.js');
if (typeof global.gc !== 'function') throw new Error('Run sweep.js with --expose-gc');
const SG = loadGenerator(CANDIDATE, ['tests/fixtures/replay-goldens.js', 'tests/fixtures/replay-wire.js']);
const now = () => Number(process.hrtime.bigint()) / 1e6;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rows = [];
const union = new Set();
let compactJumps = 0;
let detailsJumps = 0;
console.log('id checks steps(c/d) total-ms positions-ms post-positions-ms heap-delta array-buffer-delta json-bytes');
for (const g of SG.fixtures.replayGoldens) {
  const wire = SG.fixtures.replayWire[g.id];
  const result = wire ? SG.replay.fromPlainWire(wire)
    : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  const original = JSON.stringify(SG.replay.toPlainWire(result));
  global.gc();
  const memoryBefore = process.memoryUsage();
  const t0 = now();
  const iterator = SG.replay.prepare(result);
  let a, rated = false, positionsMs = 0, postPositionsMs = 0;
  for (;;) {
    const began = now();
    const next = iterator.next();
    const elapsed = now() - began;
    if (rated) postPositionsMs += elapsed; else positionsMs += elapsed;
    if (next.done) { a = next.value; break; }
    if (next.value.done === next.value.total) rated = true;
  }
  const ms = now() - t0;
  global.gc();
  const memoryAfter = process.memoryUsage();
  const errors = [];
  const check = (label, ok) => { if (!ok) errors.push(label); };
  const label = c => SG.model.cellLabel(result.model, c);
  const transition = s => s.transition === null ? null : a.transitions[s.transition];
  const frame = f => !f ? '—' : f.kind === 'cell' ? label(f.cell) :
    's' + f.sign + '(' + label(a.signs[f.sign][0]) + '<' + label(a.signs[f.sign][1]) + ')';
  const scores = (view) => a.views[view].steps.map((s) => a.ratings[s.position].score);
  const compactRows = a.views.compact.steps.map(function (s, i, steps) {
    const r = a.ratings[s.position], t = transition(s);
    const before = i ? a.ratings[steps[i - 1].position].score : 0;
    return [i + 1, s.position, SG.replay.phaseCode(s, a.structure), r.empties, r.score, r.score - before,
      r.hardest || '—', t && t.tier === 'jump' ? 'Y' : '—', frame(t && t.cause && t.cause.frame),
      t && t.tier === 'first' ? 'F' : t && t.tier === 'newPeak' ? 'N' : '—'];
  });
  check('compact rows', same(compactRows, g.rows));
  check('details scores', same(scores('details'), g.details));
  check('step counts', a.views.compact.steps.length === g.counts.compact &&
    a.views.details.steps.length === g.counts.details);
  if (g.alive) check('alive signs', same(a.views.compact.steps.map(s => a.moves[s.position].alive.length), g.alive));
  check('result unchanged', JSON.stringify(SG.replay.toPlainWire(result)) === original);
  for (const t of a.transitions.filter(t => t.tier === 'jump')) {
    if (t.view === 'compact') compactJumps++; else detailsJumps++;
    union.add(g.id + ':' + t.from + ':' + t.to);
    check('complete jump ' + t.view + '/' + t.step, !!t.cause && !!t.choice && !!a.proofs[t.to]);
  }
  for (const j of g.jumps) {
    const t = transition(a.views.compact.steps[j.step - 1]);
    check('jump ' + j.step, t && t.tier === 'jump' && t.before.total === j.from && t.after.total === j.to);
    if (!t || !t.cause) continue;
    for (const side of ['before', 'after']) for (const key of ['P', 'W', 'R', 'V', 'E']) {
      check('term ' + j.step + '/' + side + '/' + key, Math.abs(t[side][key] - j[side][key]) <= 0.000001);
    }
    check('levels ' + j.step, t.before.level === j.before.level && t.after.level === j.after.level);
    check('cause ' + j.step, t.cause.class === j.cause && frame(t.cause.frame) === (j.frame || '—'));
    check('probes ' + j.step, same(t.cause.singles.map(s => ({ op: s.action, cell: label(s.cell), score: s.score })),
      j.singles));
    if (j.choice) for (const key of Object.keys(j.choice)) {
      check('choice ' + j.step + '/' + key, t.choice && t.choice.kind === 'guided' &&
        t.choice[key] === j.choice[key]);
    }
    if (!j.choice) check('non-guided choice ' + j.step, t.choice && t.choice.kind !== 'guided');
    const first = a.proofs[t.to] && a.proofs[t.to].firstUse;
    check('first use ' + j.step, first && first.k === j.firstUse.k && first.n === j.firstUse.n &&
      first.technique === j.firstUse.technique && first.i18nKey === j.key);
    if (first) {
      const effects = [];
      if (first.eliminations.length) effects.push('remove candidate ' +
        first.eliminations.map(([c, d]) => d + '@' + label(c)).join(', '));
      if (first.placements.length) effects.push('place ' +
        first.placements.map(([c, d]) => d + '@' + label(c)).join(', '));
      check('effects ' + j.step, effects.join('; ') === j.effects);
    }
    check('restricted ' + j.step, a.proofs[t.to] && a.proofs[t.to].restricted === 'stuck');
  }
  const folds = a.views.compact.steps.map((s, i) => ({ s, i, t: transition(s) }))
    .filter(x => x.t && x.t.folded.peak !== null);
  check('fold count', folds.length === g.folds.length);
  for (const f of g.folds) {
    const t = transition(a.views.compact.steps[f.step - 1]);
    check('fold ' + f.step, t && t.folded.peak === f.peak && t.after.total === f.end);
  }
  const row = { id: g.id, errors, ms, positionsMs, postPositionsMs, fresh: a.stats.fresh,
    checks: a.stats.checks, heapDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
    arrayBuffersDelta: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
    bytes: Buffer.byteLength(JSON.stringify(plain(a))) };
  rows.push(row);
  console.log([g.id, errors.length ? 'FAIL:' + errors.join(',') : 'ok', g.counts.compact + '/' + g.counts.details,
    ms.toFixed(1), positionsMs.toFixed(1), postPositionsMs.toFixed(1), row.heapDelta, row.arrayBuffersDelta,
    row.bytes].join('  '));
}
const failed = rows.some(r => r.errors.length) || compactJumps !== 13 || detailsJumps !== 16 || union.size !== 19;
fs.writeFileSync(path.join(E, 'sweep.json'), JSON.stringify({ rows, compactJumps, detailsJumps,
  distinctTransitions: union.size }, null, 2));
console.log((failed ? 'golden verification FAILED' : 'all 14 goldens equal') +
  '; jumps ' + compactJumps + '/' + detailsJumps + '; distinct transitions ' + union.size);
process.exitCode = failed ? 1 : 0;
```

`E\tests-html.js`:

```js
'use strict';
// GS08: generator/tests.html in headless Edge on the branch and on the baseline 8d9510a; every test that fails
// on the candidate must already be a documented baseline failure.
const fs = require('fs');
const path = require('path');
const { E, CANDIDATE, BASELINE, serveDir } = require('./common.js');
const { launch, newPage } = require(path.join(CANDIDATE, 'player', 'tests', 'browser', 'lib.js'));

const RUNS = [
  { name: 'branch', root: CANDIDATE, http: 8790, devtools: 9390 },
  { name: 'baseline', root: BASELINE, http: 8791, devtools: 9391 }
];
const READ = '(function () { var s = document.getElementById("summary"); return { summary: s.textContent,' +
  ' pass: s.classList.contains("pass"), failures: Array.prototype.map.call(' +
  'document.querySelectorAll("#failure-list > li"), function (li) { var n = li.querySelector("strong.fail");' +
  ' var m = li.querySelector("div"); return { name: n ? n.textContent : "", message: m ? m.textContent : "" }; }),' +
  ' missing: Array.prototype.map.call(document.querySelectorAll("#missing-list li"),' +
  ' function (li) { return li.textContent; }),' +
  ' suites: Array.from(document.querySelectorAll("#results > details")).map(function(g) {' +
  ' return { name: g.querySelector("summary").textContent.split(" \\u2014 ")[0],' +
  ' passed: Array.from(g.querySelectorAll("li.pass")).map(function(li){return li.textContent;}),' +
  ' skipped: Array.from(g.querySelectorAll("li.skip")).map(function(li){return li.textContent;}) }; }) }; })()';

async function run(r) {
  const server = await serveDir(r.root, r.http);
  let browser = null;
  const started = Date.now();
  try {
    browser = await launch({ port: r.devtools, name: 'gs08-' + r.name });
    console.log(r.name + ': browser pid ' + browser.proc.pid);
    const version = await (await fetch('http://127.0.0.1:' + r.devtools + '/json/version')).json();
    console.log(r.name + ': ' + version.Browser);
    const page = await newPage(browser, 'http://127.0.0.1:' + r.http + '/generator/tests.html');
    await page.waitFor('/^[\\u2713\\u2717]/.test(document.title)', 30 * 60 * 1000);
    const out = await page.eval(READ);
    out.seconds = Math.round((Date.now() - started) / 1000);
    out.errors = page.errors.slice();
    return out;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

(async function () {
  const out = {};
  for (const r of RUNS) {
    const o = out[r.name] = await run(r);
    console.log(r.name + ': ' + o.summary + '; ' + o.failures.length + ' failing, ' + o.missing.length +
      ' missing files, ' + o.errors.length + ' console errors, ' + o.seconds + ' s');
  }
  const base = new Set(out.baseline.failures.map((f) => f.name));
  const mine = new Set(out.branch.failures.map((f) => f.name));
  const extra = out.branch.failures.filter((f) => !base.has(f.name));
  const gone = out.baseline.failures.filter((f) => !mine.has(f.name));
  console.log('failing on both: ' + (out.branch.failures.length - extra.length));
  console.log('failing only on the branch: ' + extra.length);
  extra.forEach((f) => console.log('  ' + f.name + ' :: ' + f.message));
  console.log('failing only on the baseline: ' + gone.length);
  gone.forEach((f) => console.log('  ' + f.name));
  const normalize = s => s.replace(/http:\/\/127\.0\.0\.1:\d+/g, '<origin>').split('\n')[0];
  const allowances = new Map();
  out.baseline.errors.map(normalize).forEach(e => allowances.set(e, (allowances.get(e) || 0) + 1));
  const extraErrors = [];
  for (const e of out.branch.errors.map(normalize)) {
    const left = allowances.get(e) || 0;
    if (left > 0) allowances.set(e, left - 1); else extraErrors.push(e);
  }
  const replay = out.branch.suites.find(s => s.name === 'replay');
  const absentGoldenChecks = Array.from({ length: 14 }, (_, i) => 'golden G' + String(i + 1).padStart(2, '0') +
    ' details').filter(name => !replay || !replay.passed.some(test => test.includes(name)));
  console.log('new runtime errors: ' + extraErrors.length + '; missing golden browser checks: ' +
    absentGoldenChecks.length);
  fs.writeFileSync(path.join(E, 'tests-html.json'), JSON.stringify({ runs: out, extra, extraErrors,
    absentGoldenChecks }, null, 2));
  process.exitCode = extra.length === 0 && extraErrors.length === 0 && absentGoldenChecks.length === 0 &&
    out.branch.missing.length === 0 && out.baseline.missing.length === 0 ? 0 : 1;
})().catch(function (err) {
  console.error(err);
  process.exitCode = 1;
});
```

`E\smoke.js`:

```js
'use strict';
// GS08: the real page. Worker mode over http, main mode from file:// without a Worker, Vietnamese,
// Greater-Than. All scripts/profiles/evidence belong to the external candidate snapshot.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { E, CANDIDATE, serveDir } = require('./common.js');
const { launch, newPage, sleep } = require(path.join(CANDIDATE, 'player', 'tests', 'browser', 'lib.js'));

const ROOT = CANDIDATE;
const HTTP = 'http://127.0.0.1:8792/generator/index.html';
const FILE = pathToFileURL(path.join(ROOT, 'generator', 'index.html')).href;
const EXAMPLE = '?v=classic9&d=expert&seed=3275974478';
const checks = [];
let browser = null;

// Register before app.js's DOMContentLoaded self-start (app.js:1199-1203).
const INSTRUMENT = '(' + function () {
  document.addEventListener('DOMContentLoaded', function () {
    const S = window.SG;
    const c = window.__gs08 = { generationCalls: 0, prepare: 0, analyse: 0, outsideSolves: 0 };
    let generationDepth = 0;
    const run = S.pipeline.run;
    S.pipeline.run = function () {
      c.generationCalls++; generationDepth++;
      try { return run.apply(this, arguments); } finally { generationDepth--; }
    };
    const runSteps = S.pipeline.runSteps;
    S.pipeline.runSteps = function () {
      c.generationCalls++;
      const iterator = runSteps.apply(this, arguments);
      const wrap = method => function (value) {
        generationDepth++;
        try { return iterator[method](value); } finally { generationDepth--; }
      };
      return { next: wrap('next'), return: wrap('return'), throw: wrap('throw'),
        [Symbol.iterator]: function () { return this; } };
    };
    const solve = S.logicalSolver.solve;
    S.logicalSolver.solve = function () {
      if (!generationDepth) c.outsideSolves++;
      return solve.apply(this, arguments);
    };
    for (const key of ['prepare', 'analyse']) {
      const fn = S.replay[key];
      S.replay[key] = function () { c[key]++; return fn.apply(this, arguments); };
    }
  }, { once: true });
}.toString() + ')();';

function check(name, ok, detail) {
  checks.push({ name: name, ok: !!ok, detail: detail });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : ''));
}
const q = (sel) => 'document.querySelector(' + JSON.stringify(sel) + ')';
const text = (page, sel) => page.eval('(' + q(sel) + ' || { textContent: null }).textContent');
const count = (page, sel) => page.eval('document.querySelectorAll(' + JSON.stringify(sel) + ').length');
const max = (page) => page.eval(q('#scrubber') + '.max');
const value = (page) => page.eval(q('#scrubber') + '.value');

async function open(url, noWorker) {
  const page = await newPage(browser);
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });
  if (noWorker) {
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.Worker = undefined;' });
  }
  await page.goto(url, 1500);
  await page.waitFor('window.SG && SG.app && SG.app.getResult() !== null', 240000);
  await page.eval(q('#tab-steps') + '.click()');
  return page;
}
async function shut(page) {
  page.close();
  await fetch('http://127.0.0.1:' + browser.port + '/json/close/' + page.targetId);
}
function views(page) {
  return page.waitFor('!' + q('#scrubber') + '.disabled && ' + q('#replay-status') + '.hidden', 240000);
}
async function seek(page, position) {
  await page.eval('(function () { var s = ' + q('#scrubber') + '; s.value = "' + position + '";' +
    ' s.dispatchEvent(new Event("input", { bubbles: true })); })()');
  await sleep(250);
}
async function toggle(page) {
  await page.eval(q('#replay-view-details') + '.click()');
  await sleep(250);
}

async function workerMode() {
  const page = await open(HTTP + EXAMPLE + '&lang=en', false);
  check('worker: the client runs in a worker', await page.eval('SG.workerClient.mode') === 'worker');
  await views(page);
  check('worker: analysis never ran on the page', await page.eval(
    '__gs08.prepare === 0 && __gs08.analyse === 0 && __gs08.outsideSolves === 0'));
  check('worker: 7 compact steps', await max(page) === '7', await max(page));
  const totals = [];
  let tables = 0;
  for (let k = 1; k <= 7; k++) {
    await seek(page, k);
    if (await count(page, '#step-detail table') > 0) tables++;
    totals.push(await text(page, '#step-detail tr.step-table__total [data-role="score"]'));
  }
  check('worker: a score table on every step', tables === 7, tables);
  check('worker: the Totals of all seven steps', JSON.stringify(totals) === JSON.stringify(['0', '23 (+23)',
    '44 (+21)', '551 (+507)', '568 (+17)', '992 (+424)', '992 (unchanged)']), totals);
  await seek(page, 4);
  const badge = await text(page, '#steps-heading .step-badge--jump');
  check('worker: step 4 badge', badge === 'Score jump \u00d712.5', badge);
  const heading = await text(page, '#step-detail .step-callout__heading');
  check('worker: step 4 callout', heading === 'Score jump: 44 \u2192 551 (+507)', heading);
  check('worker: "Why?" closed', await page.eval(q('#step-detail details.step-why') + '.open') === false);
  check('worker: three visible explanation sentences',
    await count(page, '#step-detail .step-callout__text') === 3);
  await page.click('#step-detail details.step-why > summary');
  check('worker: disclosure opens', await page.eval(q('#step-detail details.step-why') + '.open') === true);
  const why = await text(page, '#step-detail .step-why__list');
  check('worker: explanation data and first use', why.includes('1 \u2192 360') &&
    why.includes('43 \u2192 768.25') && why.includes('32 of 47') && why.includes('R5C2') && why.includes('R8C3'), why);
  check('worker: one framed clue', await count(page, '.cell--cause') === 1, await count(page, '.cell--cause'));
  check('worker: the framed clue is R1C2', await count(page, '.cell--cause[data-hl="1"]') === 1);
  check('worker: its legend', await page.eval('document.body.textContent.indexOf(' +
    JSON.stringify('Removing this clue causes the score jump') + ') !== -1'));
  const navigationBefore = await page.eval('JSON.stringify(__gs08)');
  await page.eval('SG.i18n.setLocale("vi")');
  check('worker: locale redraw has the Vietnamese badge',
    await text(page, '#steps-heading .step-badge--jump') === 'Điểm tăng vọt ×12,5');
  await page.eval('SG.i18n.setLocale("en")');
  await toggle(page);
  check('worker: every move: 33 steps, at step 24', await max(page) === '33' && await value(page) === '24',
    [await max(page), await value(page)]);
  await seek(page, 26);
  await toggle(page);
  check('worker: back to compact step 5', await max(page) === '7' && await value(page) === '5',
    [await max(page), await value(page)]);
  check('worker: navigation and locale use cached analysis',
    await page.eval('JSON.stringify(__gs08)') === navigationBefore);
  check('worker: no console error', page.errors.length === 0, page.errors);
  await shut(page);
}

async function mainMode() {
  const page = await open(FILE + EXAMPLE + '&lang=en', true);
  check('main: the client runs on the page', await page.eval('SG.workerClient.mode') === 'main');
  await sleep(3000);
  check('main: only the requested generation ran before consent', await page.eval(
    '__gs08.generationCalls === 1 && __gs08.prepare === 0 && __gs08.analyse === 0 && __gs08.outsideSolves === 0'));
  check('main: the notice and the button', await page.eval('!' + q('#replay-status') + '.hidden && !' +
    q('#btn-prepare-replay') + '.hidden && !' + q('#btn-prepare-replay') + '.disabled'));
  const notice = await text(page, '#replay-status-text');
  check('main: the notice names the button', (notice || '').indexOf('Prepare score tables') !== -1, notice);
  check('main: browsing disabled', await page.eval('["#scrubber", "#btn-first", "#btn-prev", "#btn-next",' +
    ' "#btn-last", "#replay-view-details"].every(function (s) { return document.querySelector(s).disabled; })'));
  check('main: no score table before the press', await count(page, '#step-detail table') === 0);
  await page.eval(q('#tab-result') + '.click()');
  check('main: the puzzle and its Summary are usable', await page.eval('!' + q('#result-panel') + '.hidden && ' +
    q('#result-root') + '.textContent.trim().length > 0 && !' + q('#btn-play-online') + '.disabled'));
  await page.eval(q('#tab-steps') + '.click()');
  await page.click('#btn-prepare-replay');
  await views(page);
  check('main: the press starts preparation', await page.eval('__gs08.prepare > 0 && __gs08.outsideSolves > 0'));
  check('main: 7 compact steps after the press', await max(page) === '7', await max(page));
  await toggle(page);
  check('main: 33 steps with every move', await max(page) === '33', await max(page));
  const prepared = await page.eval('JSON.stringify(__gs08)');
  await seek(page, 24);
  await page.eval('SG.i18n.setLocale("vi")');
  await toggle(page);
  check('main: navigation and locale do not solve again', await page.eval('JSON.stringify(__gs08)') === prepared);
  check('main: no console error', page.errors.length === 0, page.errors);
  await shut(page);
}

async function vietnamese() {
  const page = await open(HTTP + EXAMPLE + '&lang=vi', false);
  await views(page);
  await seek(page, 4);
  const badge = await text(page, '#steps-heading .step-badge--jump');
  check('vi: step 4 badge', badge === '\u0110i\u1ec3m t\u0103ng v\u1ecdt \u00d712,5', badge);
  const heading = await text(page, '#step-detail .step-callout__heading');
  check('vi: step 4 callout', heading === '\u0110i\u1ec3m t\u0103ng v\u1ecdt: 44 \u2192 551 (+507)', heading);
  const label = await text(page, 'label.replay-view');
  check('vi: the toggle', (label || '').indexOf('Hi\u1ec7n t\u1eebng thay \u0111\u1ed5i') !== -1, label);
  check('vi: no console error', page.errors.length === 0, page.errors);
  await shut(page);
}

async function greaterThan() {
  const page = await open(HTTP + '?v=greaterThan&d=expert&seed=42&lang=en', false);
  await views(page);
  check('greaterThan: 9 compact steps', await max(page) === '9', await max(page));
  await seek(page, 7);
  const badge = await text(page, '#steps-heading .step-badge--jump');
  check('greaterThan: step 7 badge', badge === 'Score jump \u00d74.0', badge);
  check('greaterThan: one framed sign', await count(page, '.sign--cause') === 1, await count(page, '.sign--cause'));
  check('greaterThan: frame 6 surrounds an inactive removed sign', await page.eval(
    '(function(){var f=document.querySelector("rect.sign--cause[data-cause-sign=\\"6\\"]");' +
    'var s=document.querySelector(".sign[data-sign=\\"6\\"]");if(!f||!s)return false;' +
    'var a=f.getBBox(),b=s.getBBox();return s.classList.contains("sign--removed") &&' +
    ' a.x < b.x && a.y < b.y && a.width > b.width && a.height > b.height;})()'));
  check('greaterThan: no console error', page.errors.length === 0, page.errors);
  await shut(page);
}

(async function () {
  const server = await serveDir(ROOT, 8792);
  try {
    browser = await launch({ port: 9392, name: 'gs08-smoke' });
    console.log('browser pid ' + browser.proc.pid);
    const version = await (await fetch('http://127.0.0.1:9392/json/version')).json();
    console.log('browser ' + version.Browser);
    await workerMode();
    await mainMode();
    await vietnamese();
    await greaterThan();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  const failed = checks.filter((c) => !c.ok);
  fs.writeFileSync(path.join(E, 'smoke.json'), JSON.stringify(checks, null, 2));
  console.log((checks.length - failed.length) + '/' + checks.length + ' checks passed');
  process.exitCode = failed.length > 0 ? 1 : 0;
})().catch(function (err) {
  console.error(err);
  process.exitCode = 1;
});
```

(`window.Worker = undefined` makes the client fall back to the page, as a browser without workers does: from
`file://` a browser started with `--allow-file-access-from-files`, as `lib.launch` does, might otherwise start the
worker. The Vietnamese is written with `\u` escapes so that the file's encoding cannot change it.)

### 3. Node gates (run one at a time; `--all` alone)

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
Push-Location generator
try {
  node tests\node-runner.js --all 2>&1 | Tee-Object (Join-Path $E 'generator-all.log')
  if ($LASTEXITCODE -ne 0) { throw 'Generator full gate failed' }
  node tests\node-runner.js 2>&1 | Tee-Object (Join-Path $E 'generator-quick.log')
  if ($LASTEXITCODE -ne 0) { throw 'Generator quick gate failed' }
  node tests\replay-fixtures.js --check 2>&1 | Tee-Object (Join-Path $E 'fixtures-check.log')
  if ($LASTEXITCODE -ne 0) { throw 'Replay fixture check failed' }
} finally { Pop-Location }
Push-Location player
try {
  node tests\node-runner.js 2>&1 | Tee-Object (Join-Path $E 'player-quick.log')
  if ($LASTEXITCODE -ne 0) { throw 'Player quick gate failed' }
} finally { Pop-Location }
```

### 4. Identity (N1)

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
node (Join-Path $E 'digest.js') (Join-Path $E 'candidate') | Tee-Object (Join-Path $E 'identity-candidate.log')
if ($LASTEXITCODE -ne 0) { throw 'Candidate identity failed' }
node (Join-Path $E 'digest.js') (Join-Path $E 'baseline') | Tee-Object (Join-Path $E 'identity-baseline.log')
if ($LASTEXITCODE -ne 0) { throw 'Baseline identity failed' }
$engine = 'generator/js/engine', 'generator/js/variants', 'core/js/engine',
  'generator/tests/manual', 'generator/tests/qualify.js', 'generator/tests/perf.js', 'generator/tests/soak.js',
  'docs/difficulty-rating'
$engineDiff = @(git --no-pager diff --name-status 8d9510a HEAD -- $engine)
if ($LASTEXITCODE -ne 0) { throw 'Engine diff failed' }
$engineDiff
if ($engineDiff.Count -ne 1 -or $engineDiff[0] -ne "A`tgenerator/js/engine/replay.js") {
  throw 'An engine, variant or protected research file changed'
}
$fixtures = @(git --no-pager diff --name-status 8d9510a HEAD -- generator/tests/fixtures)
if ($LASTEXITCODE -ne 0) { throw 'Fixture diff failed' }
$fixtures
$allowedFixtures = @("A`tgenerator/tests/fixtures/replay-goldens.js", "A`tgenerator/tests/fixtures/replay-wire.js")
if ($fixtures.Count -ne 2 -or @($fixtures | Where-Object { $_ -notin $allowedFixtures }).Count) {
  throw 'An existing fixture changed or the new replay fixtures are missing'
}
$stored = 'generator/js/ui/history.js', 'generator/js/ui/export.js', 'generator/tests/suites/history.test.js',
  'generator/tests/suites/export.test.js', 'generator/tests/suites/smoke.test.js', 'player', 'exports',
  'core/tests', 'player/js/ui/help-examples.js'
$storedDiff = @(git --no-pager diff --name-status 8d9510a HEAD -- $stored)
if ($LASTEXITCODE -ne 0) { throw 'Storage diff failed' }
if ($storedDiff) { $storedDiff; throw 'A protected storage, player or shared-test file changed' }
```

Expected: both `digest.js` runs print the six known values; the engine diff has only the new `replay.js`;
the fixture diff has only the two new replay fixture files; the storage/player/shared-test diff is empty.
These are assertions, not just output to inspect. GS06's allowed core board renderer/CSS edits are outside
these protected paths; inspect the complete diff against the task ownership lists too.

### 5. Golden sweep and cost

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
node --expose-gc (Join-Path $E 'sweep.js') | Tee-Object (Join-Path $E 'sweep.log')
if ($LASTEXITCODE -ne 0) { throw 'Golden sweep failed' }
```

Expected: 14 `ok` rows, `all 14 goldens equal`, jumps 13/16 and 19 request-scoped transitions. Record full
preparation time, reconstruction/rating-phase time and post-position work (selection plus **both views'**
explanations). JSON bytes cover the complete analysis; heap/array-buffer deltas after GC are approximate retained
memory while holding it, **not peak memory** and not a pure allocator benchmark. Keep negative/noisy deltas as
observations rather than relabeling them exact sizes. Compare G14 cautiously with the prototype's ratings-only
594.34 ms. A time over 5,000 ms is a finding, not an automatic failure.

### 6. Strings for the review

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
node (Join-Path $E 'strings.js') dump (Join-Path $E 'baseline') (Join-Path $E 'strings-baseline.json')
if ($LASTEXITCODE -ne 0) { throw 'Baseline strings failed' }
node (Join-Path $E 'strings.js') dump (Join-Path $E 'candidate') (Join-Path $E 'strings-candidate.json')
if ($LASTEXITCODE -ne 0) { throw 'Candidate strings failed' }
node (Join-Path $E 'strings.js') diff (Join-Path $E 'strings-baseline.json') (Join-Path $E 'strings-candidate.json') (Join-Path $E 'strings.md')
if ($LASTEXITCODE -ne 0) { throw 'String comparison failed' }
```

Put the table of `strings.md` in the handoff (not in the repository) for the orchestrator's English / Vietnamese
review (release record: "EN / VI review of the new strings"). Check by eye that no Vietnamese text is a copy of the
English and that the `replay.*`, `steps.*` keys of GS05 and GS06 are all there.

### 7. The player's browser scripts

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
Push-Location (Join-Path $E 'candidate\player')
try {
  node tests\browser\run-all.js 2>&1 | Tee-Object (Join-Path $E 'player-browser.log')
  if ($LASTEXITCODE -ne 0) { throw 'Player browser gate failed' }
} finally { Pop-Location }
```

### 8. The generator's browser test page

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
node (Join-Path $E 'tests-html.js') 2>&1 | Tee-Object (Join-Path $E 'tests-html.log')
if ($LASTEXITCODE -ne 0) { throw 'Generator browser gate failed' }
```

Expected: no new failing test/runtime error, no missing file on either snapshot, and all 14 named golden details
checks passed in the browser. Record pre-existing failures as limitations, never as an all-pass result. A renamed
failure is still a failed gate until the orchestrator verifies its old/new identity and identical cause; do not
silently waive it or alter the script's assertion. A test new in this change that needs Node
or the fake DOM should call `SG.test.skip(reason)` in a browser, as the existing suites do (`help.test.js` line 21,
`i18n.test.js` line 432): a failure there is a defect of the task that added it.

### 9. The real page

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
node (Join-Path $E 'smoke.js') 2>&1 | Tee-Object (Join-Path $E 'smoke.log')
if ($LASTEXITCODE -ne 0) { throw 'Real-page smoke failed' }
```

Expected: every line `ok`, then `N/N checks passed`.

### 10. The QA document

Insert into `docs/qa/browser-run.md`, right after "How to repeat", a section like this one with the real numbers
(no absolute path; describe `file://` loading of the candidate snapshot's `generator/index.html`, not its
physical address):

```markdown
## Generation Steps (YYYY-MM-DD)

The branch `generation-steps` (GS01–GS07 of `tasks/generation-steps/`), checked once against a copy of `8d9510a`.
Microsoft Edge <version>, Node <version>.

    cd generator && node tests/node-runner.js --all   # <S> suites, <T> tests, 0 failed, <time>
    cd generator && node tests/node-runner.js         # 43 suites, <T> tests
    cd player && node tests/node-runner.js            # <S> suites, <T> tests
    node tests/browser/run-all.js                    # from E\candidate\player: fragment file / http, ...

`generator/tests.html` over http: the branch <n> tests, <f> failing; the copy of `8d9510a` <n> tests, <f>
failing; list the carried baseline limitations explicitly. No new failure, runtime error or missing file;
the 14 new golden details checks passed (not skipped).

The real page (scripted, headless Edge): with a worker, Classic 9×9 Expert seed 3275974478 prepares its score
tables by itself and shows 7 steps (Totals 0, 23, 44, 551, 568, 992, 992), the "Score jump ×12.5" badge, the
callout, a closed "Why?" and R1C2 framed on step 4, and 33 steps with "Show every move"; in Vietnamese
"Điểm tăng vọt ×12,5". Opened from a file without a worker, the puzzle and its Summary work at once, the replay
waits for "Prepare score tables" with browsing disabled, then shows both views. Greater-Than Expert seed 42 frames
one sign on its jump (×4.0). No console error.

The puzzle is unchanged: the payload digest of the example is still `d350758d…` and its cache entry, history
entry and export are byte-identical to those of `8d9510a`. The 14 golden requests give their golden sequences;
preparing their score tables took <median> ms per puzzle in Node (maximum <max> ms, Mega 16×16 Hell 2 seed 12).
```

Extend "What was not checked" with: screen readers on the new callout and "Why?"; touch devices; Firefox and Safari;
the main-mode press on a slow device (the page may pause while it prepares); the screenshots of `docs/screenshots/`
were not retaken.

### 11. Clean-up

```powershell
$ErrorActionPreference = 'Stop'
$E = $env:SG_REPLAY_EVIDENCE
if (-not $E) { throw 'SG_REPLAY_EVIDENCE is required' }
$record = Get-Content -Raw (Join-Path $E 'run.json') | ConvertFrom-Json
if ($record.purpose -ne 'generation-steps-GS08') { throw 'Not an owned GS08 evidence folder' }
$profileRoot = Join-Path $E 'candidate\player\.scratch-profile'
$owned = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and $_.CommandLine.IndexOf($profileRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0
}
if ($owned) {
  $owned | Select-Object ProcessId, ParentProcessId, CommandLine
  throw 'Owned browsers remain: close only these verified PIDs before removing their snapshots'
}
# After all owned browsers have closed, preserve screenshots outside the disposable snapshot.
$shots = Join-Path $E 'candidate\player\.scratch-shots'
if (Test-Path $shots) { Copy-Item $shots (Join-Path $E 'player-shots') -Recurse }
foreach ($name in @('candidate', 'baseline', 'candidate.tar', 'baseline.tar')) {
  $path = Join-Path $E $name
  if (Test-Path $path) { Remove-Item -Recurse -Force $path }
}
# Keep run.json, scripts, logs, JSON results, the string table and screenshots in E for review.
$ports = @(8765..8774) + @(8790..8792) + @(9333..9345) + @(9390..9392)
$busy = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $ports -contains $_.LocalPort }
if ($busy) { $busy | Select-Object LocalPort, OwningProcess; throw 'A gate port is still in use' }
$head = git --no-pager rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -ne $record.candidate) { throw 'The tested candidate changed' }
$status = @(git --no-pager status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Cannot read final status' }
$status
if ($status.Count -ne 1 -or $status[0] -ne ' M docs/qa/browser-run.md') { throw 'Unexpected working-tree change' }
```

If a run was interrupted, stop the browser by the PID the script printed (`Stop-Process -Id <pid>`), then delete
only its profile inside the candidate snapshot. Never delete working-tree profiles or the parent experiment
folder. Keep E's evidence until the orchestrator has reviewed it.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| GS08-B01 | N2, N3, N4 (Q1 a, Q4 b, Q5 a, Q10 b) in a real browser: the user's example shows 7 compact steps, each with a score table, Totals 0 → 23 → 44 → 551 → 568 → 992 → 992; step 4 has the "Score jump ×12.5" badge, the callout, a closed "Why?" and R1C2 framed with its legend; "Show every move" shows 33 steps and keeps the place (compact 4 ↔ details 24; details 26 → compact 5) | `smoke.js` output |
| GS08-B02 | Q17 b, Q19 a: opened from a file without a Worker, the puzzle and its Summary work at once; the replay shows only the notice and "Prepare score tables", browsing disabled, no table, nothing starts by itself; after the press both views | `smoke.js` output |
| GS08-B03 | N1: the same request gives the same puzzle as before the change, and the same cache entry, history entry and export | `digest.js` on both trees; `sweep.js` |
| GS08-B04 | The explanation works beyond Classic and in Vietnamese: Greater-Than Expert seed 42 frames one sign on its jump (×4.0); the Vietnamese page shows "Điểm tăng vọt ×12,5" and "Hiện từng thay đổi"; the new strings are listed for the EN / VI review | `smoke.js`; `strings.md` |
| GS08-B05 | The release record of [check-list §9](check-list.md#9-release-decision-record) can be filled from this task's evidence | the handoff |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| GS08-T01 | `cd generator && node tests/node-runner.js --all` passes, run once and alone (Q9 c; the regression hashes and the manual suites included) | the output's Suites / Tests / Time lines |
| GS08-T02 | Both quick sets pass on the final tree; `node tests/replay-fixtures.js --check` passes | outputs |
| GS08-T03 | Identity: both `digest.js` runs assert the six values; the engine diff contains only new `replay.js`; fixture additions are exactly `replay-goldens.js`/`replay-wire.js`; protected storage, player, shared tests, generated examples and old research are unchanged | assertions and diff output |
| GS08-T04 | From `E\candidate\player`, `node tests\browser\run-all.js` passes (seven script files, eight executions including both fragment modes); profiles/screenshots stay in E | output |
| GS08-T05 | `generator/tests.html`: no new failing test or runtime error, no missing file in either snapshot, and all 14 golden details checks passed; carried baseline limitations are named | `tests-html.js` output and `tests-html.json` |
| GS08-T06 | The real-page smoke passes every check with no console error | `smoke.js` output |
| GS08-T07 | The golden sweep: 14 of 14 equal; the cost table recorded | `sweep.js` output |
| GS08-T08 | `docs/qa/browser-run.md` has the new dated section with the real numbers, no absolute path, CRLF; `help` and the quick set still pass | the diff; `cd generator && node tests/node-runner.js --suite=help` |
| GS08-T09 | Git and cleanup: branch `generation-steps`; recorded candidate SHA and expected accepted-task commits; no push/upstream; only owned snapshots/profiles removed, evidence retained in E, ports free, no owned browser running; working-tree status lists only the QA document | outputs and run.json |

## Test plan

### Exact commands

The commands of steps 1–11, in that order. Total about one hour (`--all` about nine minutes, `run-all.js` about
four, `tests.html` two runs of a few minutes each, the rest a few minutes).

## Definition of done & handoff

- Every criterion has its evidence; every defect found is reported (file, test or check, message, steps to
  reproduce) and nothing in the product was changed by this task.
- The reply gives: the outputs' summary lines; the `tests.html` comparison (counts, both lists of differences); the
  smoke checks; the identity lines; the sweep table; the `strings.md` table; the QA section added; the clean-up
  state; any script change made to fit the real markup (with the reason).
- The orchestrator checks the logs, exit codes and tested candidate SHA, re-runs cheap checks if needed, commits
  the QA section, and fills the release record and the
  orchestrated execution summary of the check-list. Merging `generation-steps` is the user's decision; nothing is
  pushed. Do not automatically repeat `--all` or browser gates already completed on this candidate. Product
  fixes invalidate that candidate and require an explicitly recorded replacement final-gate run.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
