# GS04 — Worker job, client `replay` in both modes, cache forwarding

| Header | Value |
|---|---|
| ID | GS04 |
| Depends on | GS03 (accepted and committed, including GS01–GS02); the complete two-view analysis and its explanation iterator are consumed here |
| Estimated size | Medium: about 400–700 lines of code and tests |
| Owner role | Worker/browser integration |
| Milestone | M4 — the analysis is prepared off the page in worker mode, and on the page only when asked |
| Design refs | `docs/generation-steps/report-detailed.md` R4, R15, R16; §9.1; §9.3 case 11 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The score tables of the replay come from `SG.replay.prepare(result)` (GS01–GS03): one rating per recorded
position plus the explanations of the jumps. Most puzzles need a few milliseconds, but the measured maximum is
594.34 ms (Mega 16×16 Hell 2 seed 12) in Node, and perhaps 2–4 times more on a phone. The user decided:

- **Q17 b** (16:20): when the page has no Web Worker (for example opened from `file://`), the work runs only when
  the user presses "Prepare score tables"; **nothing runs automatically**.
- **Q18 b** (16:20): a position whose guard runs out shows an honest status, no retry.
- **N1**: the generation and its puzzles stay exactly as they are.

This task gives the generation client a second kind of job, `replay(result)`, in **both** modes:

- worker mode: the worker runs the iterator of `SG.replay.prepare` in slices, reports progress, answers the analysis;
  `generate`, `replay` and `cancel` pre-empt it at the next slice, exactly like a generation;
- main mode: the client runs the same iterator on the page in cooperative slices — **only inside `replay()`**, never
  by itself; the page (GS05) calls it only after the user pressed the button.

The page wiring (when to call `replay`, the button, the status line, the views) is GS05.

## Scope

### In scope

- `generator/js/worker/gen.worker.js`: the `replay` request, the slice loop, the three answers, the shared
  `active` slot, the protocol comment.
- `generator/js/worker/worker-client.js`: `replay(result, options)` and `cancelReplay()` on every client (both modes),
  the shared `SG.workerClient` facade, the header comment.
- `generator/js/ui/app.js`: `directClient` gains `replay` and `cancelReplay` (the client used when
  `SG.workerClient` is absent), and the "Generation client" sentence of the header names them.
- `generator/js/ui/cache.js`: the wrapper client forwards `replay` and `cancelReplay` to its inner client.
- Tests: `generator/tests/suites/worker.test.js`, `cache.test.js` (forwarding), `ui-contract.test.js`
  (`CLIENT_SURFACE` only).
- Documents: `generator/design.md` §9.3 and §13.10; the "Worker and fallback" part of both developer guides.

### Out of scope

- Calling `replay` from the page, the preparation controller, the button, the status line, the cache's trace gate
  (GS05). This task adds the capability only; no page code calls it yet.
- Any change to `SG.replay` (report a defect to the orchestrator), to the generation protocol (`generate`, `events`,
  `done`, `error`, `cancel`, `cancelled`, `ping`, `pong` keep their shapes and meaning) or to the cache's storage.

## Repository rules

- Classic scripts on `SG`; no `import` / `export` / `require` in `js/`; `worker-client.js` and `cache.js` must still
  load without a DOM (the `ui-contract` suite runs every source file in a bare context).
- 2-space indent, single quotes, semicolons; UTF-8 without BOM, CRLF, final newline.
- Quick suites only; no commit, stage, stash, push or branch switch; do not edit `tasks/generation-steps/`.
- Do not change the existing worker or client tests except where this task says so; a generation test that fails is
  a defect of this change.

## Inputs & context

### What exists (GS01–GS03, read-only here)

- `SG.replay.prepare(result, options) -> Iterator` (a generator function): yields `{ done, total }` (`total` = the
  number of positions; `done` grows by one per position, then stays at `total` while the explanations run) and
  returns the `Analysis` (plain data: numbers, strings, arrays, objects, and `Int32Array` board values in
  `analysis.moves[i].values`). Options: `{ rateNodes, countNodes, probeNodes, explain }` (all optional).
- `SG.replay.toPlainWire(result)` → the `SG.pipeline.toWire` data with every typed array as a plain array (it
  survives JSON); `SG.replay.fromPlainWire(data)` → a `PuzzleResult` again (throws on data that is not of its
  version).
- `SG.replay.analyse(result, options)` → the same analysis synchronously (tests compare against it).
- `replay.js` is already in `SCRIPTS` of `gen.worker.js` (GS01), right after `pipeline.js`.

### Today's code (anchors at `8d9510a`)

- `generator/js/worker/gen.worker.js`: protocol comment lines 8–31; `let active = null` line 89; `errorData` 113;
  `later` (MessageChannel or `setTimeout` hand-back, about lines 126–146); `number` 148, `nonNegative` 152; `stop(run)`
  164 (calls `run.steps.return()`); `fail` 174; `finish` 185; `slice` 196; `onGenerate` 224; `onCancel` 258;
  `scope.onmessage` 263 (its `catch` posts `{ type: 'error', session }`).
- `generator/js/worker/worker-client.js`: `create(options)` 160; state `decided`, `worker`, `workerBusy` (the session
  the worker is busy with), `current` (the generation), `lastSession` (one counter for every session id) 176–189;
  `settle` 191; `workerFree` 233 (dispatches a waiting generation); `dropWorker` 240; `armKill` 249 (kills a worker
  that does not answer a cancel within `killAfterMs`, then re-sends the waiting run); `onWorkerMessage` 259;
  `onWorkerError` 284; `ensureWorker` 337; `dispatch` 348; `runInWorker` 367; `runInMain` 386 (slices of `chunkMs`
  with `yieldFn`, after `paintFn`); `ready` 443; `cancel` 476; `generate` 491; `dispose` 514; the returned client
  529–535; the shared facade `SG.workerClient` 545–556.
- `generator/js/ui/app.js`: `directClient` 218–265 (`generate`, `cancel`, `mode: 'main'`; runs `SG.pipeline.run`
  after the busy state is painted); header sentence "Generation client: …" lines 66–71.
- `generator/js/ui/cache.js`: the wrapper client 1152–1161 (`generate`, `cancel`, `ready`, `mode`, `inner`).
- Test anchors: `worker.test.js` — fake worker `createFakeWorker` 603 (`say()` answers, `ofType()`), `makeClient`
  660, the loopback `createLoopback` 1269 (runs the real `gen.worker.js` in a `vm` context; **page → worker messages
  are passed through `JSON.stringify`**, worker → page through `structuredClone`; the worker's event loop is a task
  list run by `w.run(n)`), `loopClient` 1327; `ui-contract.test.js` — `CLIENT_SURFACE` line 74 (checked on
  `SG.app.directClient`); `cache.test.js` — `fakeInner` 141.

### Protocol additions (decision D6)

| Direction | Message | Meaning |
|---|---|---|
| page → worker | `{ type: 'replay', session, result, options }` | analyse `result` (`SG.replay.toPlainWire` data, with its `digLog`); a generation or a replay in progress is dropped first. `options` (all optional): `chunkMs` (slice length, default 12), `rateNodes`, `countNodes`, `probeNodes` (guards passed to `SG.replay.prepare` when they are positive numbers) |
| worker → page | `{ type: 'replayProgress', session, done, total }` | after a slice, when `done` changed since the last progress message of this job |
| worker → page | `{ type: 'replayDone', session, analysis }` | the analysis (structured clone keeps its `Int32Array` values) |
| worker → page | `{ type: 'replayError', session, error }` | `error` = `errorData(err)` as for `error`; the move model or the ratings failed, the data could not be read, or the scripts failed to load |
| page → worker | `{ type: 'cancel', session }` (unchanged) | also drops a replay; answered by `cancelled` as today |

One job at a time: the worker keeps one `active` run, of kind `'generate'` or `'replay'`; `generate`, `replay` and
`cancel` stop it (`run.steps.return()`) before anything else.

### Client API additions

```js
client.replay(result, options) -> Promise<Analysis>
  // result: a PuzzleResult with its digLog; options:
  // { onProgress({ done, total }), allowMain: false } (defaults).
  // Only the page's explicit Prepare consent sets allowMain: true.
  // rejects with GenerationError('budget.cancelled') when cancelled or replaced,
  //         with GenerationError('unexpected', { message: 'busy' }) when a generation of this client is running,
  //         with budget.cancelled and i18nArgs.reason === 'replayConsentRequired' if main-thread execution
  //         would be needed without allowMain (including a worker failure after ready() resolved),
  //         with the error of a replayError (errorFromWire) or of the main-mode iterator otherwise.
client.cancelReplay() -> boolean   // true when a replay was running: rejects it at once, the work stops at the
                                   // next slice boundary (worker: a 'cancel' message, then the kill timer as for
                                   // a generation)
// generate(config, onEvent) cancels a running replay of the same client first (its promise rejects with
// 'budget.cancelled'); the generation is sent when the worker has answered (workerFree), as today.
SG.workerClient.replay(result, options), SG.workerClient.cancelReplay()   // the shared client's
SG.app.directClient.replay(result, options), SG.app.directClient.cancelReplay()
```

## Files to create/modify

### Exclusive ownership

- `generator/js/worker/gen.worker.js`
- `generator/js/worker/worker-client.js`
- `generator/js/ui/app.js` — only `directClient` and the "Generation client" sentence of the header
- `generator/js/ui/cache.js` — only the wrapper client object (lines 1152–1161)
- `generator/tests/suites/worker.test.js`
- `generator/tests/suites/cache.test.js` — only a new test of the forwarding and the `replay` / `cancelReplay`
  members of the `fakeInner` helper
- `generator/tests/suites/ui-contract.test.js` — only `CLIENT_SURFACE`

### Documentation slot

- `generator/design.md` §9.3 (line 1032): add to the API block
  `replay(result, { onProgress, allowMain: false }) → Promise<Analysis>, // GS05 grants main-mode consent`
  and `cancelReplay() → boolean,`; then a paragraph **"The replay job."**: the page asks the same client for
  `replay(result)` after the puzzle is shown; in worker mode a `replay` message carries `SG.replay.toPlainWire(result)`
  (plain arrays, so the message survives a JSON copy), the worker runs `SG.replay.prepare` in slices of `chunkMs`,
  answers `replayProgress { done, total }` and `replayDone { analysis }` or `replayError`; the worker has one job at a
  time, which `generate`, `replay` and `cancel` pre-empt at the next slice; in main mode the client runs the same
  iterator on the page in slices, and only inside `replay()` — nothing starts by itself (Q17 b); a generation of the
  same client cancels its replay, and `replay()` during a generation is refused (`busy`).
- `generator/design.md` §13.10 (line 1531): two lines in the API block:
  `SG.workerClient.replay(result, { onProgress, allowMain: false }?): Promise<Analysis>` and
  `SG.workerClient.cancelReplay(): boolean`; explain that main execution requires `allowMain: true`.
- `DEVELOPERGUIDE.md` "Worker and fallback" (lines 259–269): one or two sentences: `SG.workerClient.replay(result,
  { onProgress })` returns a promise of the replay analysis — `SG.replay.prepare` run in the worker in slices, or on
  the page in main mode, and only when the page asks — and `.cancelReplay()` stops it; a new generation pre-empts it.
- `DEVELOPERGUIDE.vn.md` "Worker và phương án dự phòng" (lines 244–254): the same facts in Vietnamese.
- The protocol comment of `gen.worker.js` and the header comment of `worker-client.js` describe the new messages
  and methods (they are the contract the guides point to).

## Implementation steps

### 1. `gen.worker.js`

1. Protocol comment: add the `replay` request, the three answers and "a `cancel` also drops a replay" in the style
   of the existing entries; mention that the worker has one job at a time.
2. Runs carry a kind: in `onGenerate` add `kind: 'generate'` to the run object. A replay run is
   `{ kind: 'replay', id: msg.session, steps: <the prepare iterator>, chunkMs, lastDone: -1, pending: [] }` (keep the
   field name `steps`, so that `stop(run)` works unchanged for both kinds).
3. `onReplay(msg)`: `if (active !== null) stop(active);` a `loadError` → post `replayError` for `msg.session` and
   return; read `options` like `onGenerate`; `chunkMs = nonNegative(options.chunkMs, DEFAULT_CHUNK_MS)`; build the
   prepare options from `rateNodes`, `countNodes`, `probeNodes` when each is a positive finite number; set
   `active = run` **before** building, then inside `try`: `const result = SG.replay.fromPlainWire(msg.result);
   run.steps = SG.replay.prepare(result, prepareOptions);` — a throw → `failReplay(run, err)`; then
   `replaySlice(run)`.
4. `replaySlice(run)`: return unless `active === run`; advance the iterator at least once and until done or
   `chunkMs` elapsed. Retain the **latest progress value from every non-final yield**, even when the next
   `next()` returns the analysis in the same slice. Before finishing/scheduling, post that progress if its
   `done` differs from `run.lastDone`. Thus a fast one-slice job still emits its final progress before
   `replayDone`, and explanation yields at the same `done === total` do not duplicate progress.
   A throw calls `failReplay`; done calls `finishReplay`; otherwise schedule through `later`.
5. `failReplay(run, err)`: return unless `active === run`; `active = null`; post `{ type: 'replayError', session:
   run.id, error: errorData(err) }`. `finishReplay(run, analysis)`: return unless `active === run`; inside `try`:
   post `{ type: 'replayDone', session: run.id, analysis }` then `active = null`; a throw (a value that cannot be
   cloned) → `failReplay(run, err)`.
   Before `replayDone`, flush `{ done: analysis.stats.positions, total: analysis.stats.positions }` if that count
   has not been reported (including a conservative fallback whose iterator yielded nothing). Apply the same
   completion rule in the main/direct schedulers, without duplicating an already reported count.
6. `scope.onmessage`: add `else if (msg.type === 'replay') onReplay(msg);`; its `catch` posts `replayError` instead
   of `error` when `msg.type === 'replay'`.
7. `onCancel` is unchanged: it stops the active run of either kind and answers `cancelled`.

### 2. `worker-client.js` (inside `create`)

1. State: `let currentReplay = null;` A replay record is `{ id: ++lastSession, result, onProgress, allowMain,
   lastDone: -1, state: 'running', sent: false, abort: null, resolve, reject }` (the session counter is shared with generations, so ids never
   clash).
2. `settleReplay(r, ok, value)`: like `settle` for `currentReplay` (state `'done'` / `'failed'`, clear
   `currentReplay`, call `r.abort` on failure, resolve or reject); false when already settled.
3. `progress(r, done, total)`: when running and `done !== r.lastDone`, update `lastDone` and call `onProgress`
   inside `try` when present. Never repeat the completed-position count during explanations.
4. `replay(result, options)`: when `current !== null` (a generation of this client runs) return
   `Promise.reject(new SG.errors.GenerationError('unexpected', { message: 'busy' }))`; when `currentReplay !== null`
   call `cancelReplay()`; create the record (`allowMain = options && options.allowMain === true`) and its promise;
   `currentReplay = r`; then `ready().then(function (mode)
   { if (currentReplay !== r) return; if (mode === 'worker') replayInWorker(r); else replayInMain(r); })`, with a
   `catch` that settles `r` with `unexpectedError(err)`. Nothing else ever calls `replayInWorker` /
   `replayInMain`.
5. `dispatchReplay(r)`: `r.sent = true; workerBusy = r.id;` post `{ type: 'replay', session: r.id, result:
   SG.replay.toPlainWire(r.result), options: { chunkMs: opt.chunkMs } }` inside `try`; on a throw `workerBusy = 0`,
   `r.sent = false`, settle with `unexpectedError(err)`.
6. `replayInWorker(r)`: spawn when needed; wait while `workerBusy !== 0`, otherwise dispatch. If a worker cannot
   start, set `decided = 'main'` and enter the guarded main path below; **never silently run on the page**.
7. `replayInMain(r)`: first require `r.allowMain === true`; otherwise settle with
   `new SG.errors.GenerationError('budget.cancelled', { reason: 'replayConsentRequired' })` and do no work.
   GS05 recognizes this machine-readable reason and returns to the existing translated consent notice.
   Inside `try` create `iterator = SG.replay.prepare(r.result)` (settle with the error on a throw);
   `r.abort = function () { try { iterator.return(); } catch (err) { /* abandoned */ } };` slices exactly like
   `runInMain`: `opt.now()` clock, `do { step = iterator.next(); } while (!step.done && opt.now() - began <
   opt.chunkMs)`. Retain/flush the latest progress exactly as in the worker **before resolving a completed
   slice**, then re-check that `r` is running (the callback can cancel it). A throw settles with the error;
   otherwise settle when done or use `yieldFn().then(guarded)`. The first slice runs after
   `Promise.resolve(opt.paintFn())`. A slice never interrupts one rating: a slice is at least one position.
8. `cancelReplay()`: `r = currentReplay`; none → false; `settleReplay(r, false, cancelledError())`; when `r.sent`
   and the worker exists post `{ type: 'cancel', session: r.id }` (a throw → `dropWorker()`), and `armKill()` when
   `workerBusy === r.id`; return true.
9. `generate(config, onEvent)`: call `cancelReplay()` first when `currentReplay !== null`.
10. `onWorkerMessage`: `mineReplay = currentReplay !== null && m.session === currentReplay.id`. A
    `replayProgress` → `progress(currentReplay, m.done, m.total)` when mine, then return. Accept the types `done`,
    `error`, `cancelled`, `replayDone`, `replayError` for the rest: `replayDone` (mine) settles with `m.analysis`;
    `replayError` (mine) settles with `errorFromWire(m.error)`; the existing generation branches stay; `if (own)
    workerFree();` as today.
11. `workerFree()`: after clearing, when `decided === 'worker'`: dispatch the waiting generation as today, else a
    waiting replay (`currentReplay !== null && !currentReplay.sent` → `replayInWorker(currentReplay)`). `armKill`'s
    timer does the same after `dropWorker()`.
12. `onWorkerError`: handle a replay even when `current === null` (do not retain the generation-only early
    return). A sent replay fails honestly; a queued replay may try a worker again, but every route to main
    execution still checks `allowMain`. Generation behavior stays unchanged.
13. `dispose()`: `cancelReplay()` too.
14. The returned client gains `replay` and `cancelReplay`; the shared facade `SG.workerClient` gains
    `replay: function (result, options) { return sharedClient().replay(result, options); }` and
    `cancelReplay: function () { return sharedClient().cancelReplay(); }`.
15. Header comment: describe `replay` and `cancelReplay` in the style of the existing lines.

**Worker-only trace prerequisite for GS05:** also honor `forceMode: 'worker'` in the existing generation
`runInWorker` respawn-failure branch (`worker-client.js:367–380`): reject rather than call `runInMain`.
Initial `ready()` already enforces this mode; respawns must not bypass it. Default `'auto'` generation fallback,
the generation messages and every engine budget/result stay unchanged. Test a successful worker followed by a
failed replacement: a forced-worker generation must make 0 main-thread pipeline calls.

### 3. `app.js` `directClient`

Add, inside the IIFE of `directClient`: `let replayToken = 0; let replayStop = null;`

- `cancelReplay()`: when `replayStop !== null`, call it (it returns the iterator, rejects the promise with
  `cancelledError()`), set it to null and return true; else false.
- `replay(result, options)`: first reject with the consent-required cancellation above unless
  `options && options.allowMain === true`. Then `cancelReplay()`; when a generation is waiting to paint (`abort !== null`) reject with
  `new SG.errors.GenerationError('unexpected', { message: 'busy' })`; otherwise create `iterator =
  SG.replay.prepare(result)` inside `try` (reject on a throw) and run slices of about 12 ms with
  `root.setTimeout(slice, 0)` between them, calling `options.onProgress({ done, total })` (guarded with `safely`)
  after each slice, flushing the latest yielded progress before completion and suppressing repeated `done`.
  Resolve with the returned analysis; a throw rejects. Every scheduled slice checks its captured `replayToken`.
  `replayStop` invalidates that token, returns the iterator, clears the stop callback and rejects.
- `generate()` calls `cancelReplay()` first.
- Return `{ generate, cancel, replay, cancelReplay, mode: 'main' }`.
- The header sentence: "a client is `{ generate(config, onEvent) -> Promise<PuzzleResult>, cancel(), replay(result,
  { onProgress }) -> Promise<Analysis>, cancelReplay(), mode: 'worker' | 'main', ready()? }`".

### 4. `cache.js` wrapper client

```js
replay: function replay(result, options) {
  if (typeof inner.replay !== 'function') {
    return Promise.reject(new SG.errors.GenerationError('unexpected', { message: 'replay' }));
  }
  return inner.replay(result, options);
},
cancelReplay: function cancelReplay() {
  return typeof inner.cancelReplay === 'function' ? inner.cancelReplay() : false;
},
```

Nothing else in `cache.js` changes in this task (the trace gate is GS05).

### 5. Tests, documents, quick set

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| GS04-B01 | In worker mode the analysis is prepared off the page: the real worker answers `replayProgress` then `replayDone` with an analysis equal to `SG.replay.analyse` on the page | `worker` suite (loopback) |
| GS04-B02 | A new generation, a new replay and a cancel pre-empt a replay at the next slice; nothing of a cancelled or replaced job reaches the page | `worker` suite |
| GS04-B03 | Q17 b: no client starts a replay by itself — creating a client, `ready()`, `mode` and a generation never call `SG.replay.prepare`; main-mode work requires `replay(result, { allowMain: true })` | `worker` suite (spy on `SG.replay.prepare`) |
| GS04-B04 | The cache's wrapper forwards `replay` and `cancelReplay`, so the page reaches the same client whatever wraps it | `cache` suite |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| GS04-T01 | The protocol of D6 exactly: message shapes, one active job, `replayError` for a failed load, unreadable data or a thrown iterator; `cancel` answered `cancelled` | `worker` suite (loopback) |
| GS04-T02 | `replayProgress` is posted only when `done` changed; with `chunkMs: 0` the `done` values are 1 … N (N = positions), all with `total` N | `worker` suite |
| GS04-T03 | The `replay` message survives the loopback's JSON copy (it carries `toPlainWire` data) and the answer keeps the `Int32Array` board values | `worker` suite |
| GS04-T04 | Client sessions: `replayProgress` / `replayDone` of another session are ignored; `cancelReplay()` rejects at once with `budget.cancelled`, posts `cancel` and returns true (false when idle); `replay()` during a generation rejects with `unexpected` / `busy`; `generate()` cancels a running replay and is sent after the worker answers | `worker` suite (fake worker) |
| GS04-T05 | Main mode: `replay()` runs in slices with `yieldFn`, reports progress, resolves with the same analysis as `SG.replay.analyse`; `cancelReplay()` between slices stops it; no Worker is created | `worker` suite |
| GS04-T06 | `SG.app.directClient` and `SG.workerClient` expose `replay` and `cancelReplay`; `CLIENT_SURFACE` is `['generate', 'cancel', 'replay', 'cancelReplay']` and passes | `ui-contract` suite |
| GS04-T07 | N1: the generation protocol tests, `pipeline`, `smoke`, `cache`, `history` and `export` pass unchanged; the regression hashes are untouched | quick set output |
| GS04-T08 | Documents in both languages (design §9.3, §13.10; developer guides "Worker and fallback"); `help` passes (every `SG.x.y` resolves); CRLF; no absolute path | `help` suite; review |

## Test plan

### Exact Node commands

```powershell
$ErrorActionPreference = 'Stop'
Push-Location generator
try {
  node tests\node-runner.js --suite=worker
  if ($LASTEXITCODE -ne 0) { throw 'Worker suite failed' }
  node tests\node-runner.js --suite=cache,ui-contract,help
  if ($LASTEXITCODE -ne 0) { throw 'Contract suites failed' }
  node tests\node-runner.js
  if ($LASTEXITCODE -ne 0) { throw 'Generator quick set failed' }
} finally { Pop-Location }
Push-Location player
try {
  node tests\node-runner.js --suite=help
  if ($LASTEXITCODE -ne 0) { throw 'Player guide checks failed' }
} finally { Pop-Location }
```

### Required test cases

Use a fast real result, for example `SG.pipeline.run(SG.store.toConfig({ variantId: 'classic9', difficulty:
'normal', seed: '12' }), null)` (or the example `classic9` / `expert` / `3275974478`, 32 positions). Compare analyses
with `plain(x) = JSON.parse(JSON.stringify(x, (k, v) => ArrayBuffer.isView(v) ? Array.from(v) : v))`.

| Case | Expected result |
|---|---|
| Loopback: a replay in slices | `w.postMessage({ type: 'replay', session: 5, result: SG.replay.toPlainWire(r), options: { chunkMs: 0 } }); w.run();` → every answer has session 5; the `replayProgress` `done` values are 1 … N in order with `total` N; the last answer is `replayDone`; `plain(analysis)` equals `plain(SG.replay.analyse(r))` and `analysis.moves[1].values` is an `Int32Array` |
| Loopback: cancel | post the replay, `w.run(3)`, post `{ type: 'cancel', session: 5 }`, `w.run()` → a `cancelled` answer and no `replayDone` |
| Loopback: pre-emption | replay then (after `w.run(2)`) a `generate` → no `replayDone`, the generation answers `done`; generate then (after `w.run(2)`) a replay → no `done`, a `replayDone` |
| Loopback: errors | `result: { v: 999 }` → `replayError` with session and a code; `createLoopback({ failLoad: 'blocked' })` → `replayError` |
| Loopback client end to end | `loopClient().replay(r)` resolves with `plain` equal to `SG.replay.analyse(r)`; `onProgress` saw increasing `done` |
| Fake worker: message | `makeClient()` then `replay(r, { onProgress })` posts exactly `{ type: 'replay', session, result, options: { chunkMs } }` where `JSON.parse(JSON.stringify(result))` deep-equals `result` and equals `SG.replay.toPlainWire(r)`; `say(replayProgress)` reaches `onProgress`; `say(replayDone)` resolves with that analysis; a `replayDone` of another session is ignored |
| Fake worker: errors and cancel | `say(replayError)` rejects with a `GenerationError` carrying the code; `cancelReplay()` → true, rejects with `budget.cancelled`, a `cancel` message with that session; second call → false |
| Fake worker: overlaps | `replay()` while `generate()` runs → rejects `unexpected` with `i18nArgs.message === 'busy'`; `generate()` while a replay runs → the replay rejects `budget.cancelled`, the `generate` message is sent after the worker answers `cancelled` (with `factory: { ack: true }`) |
| Main mode | `CLIENT.create({ forceMode: 'main', yieldFn: () => Promise.resolve(), paintFn: () => null })`: `replay(r, { allowMain: true, onProgress })` resolves with `plain` equal to `SG.replay.analyse(r)`; progress has increasing `done`; `cancelReplay()` after the first progress rejects at once and no progress follows |
| Nothing by itself (Q17 b) | wrap `SG.replay.prepare` with a counting spy (restore it in `finally`): `create()`, `ready()`, `mode`, and a `generate()` in both modes leave the count at 0; one `replay(r, { allowMain: true })` in main mode makes it 1 |
| Direct client | `SG.app.directClient.replay(r, { allowMain: true })` resolves with `plain` equal to `SG.replay.analyse(r)`; `cancelReplay()` during it rejects with `budget.cancelled` |
| Cache forwarding | the wrapper's `replay(r, o)` calls `inner.replay(r, o)` and returns its promise; `cancelReplay()` returns the inner's answer; an inner without `replay` → the wrapper rejects with `GenerationError` `unexpected` |

For every explicitly authorized main/direct replay in these tests, pass `{ allowMain: true }` (alongside
`onProgress` when used). Add: default/false `allowMain` in main mode yields the consent-required cancellation
and 0 `prepare` calls; a worker that fails **after** `ready()` must do the same, not silently fall back.
Add a fast one-slice iterator yielding `{ done: 1, total: 1 }` then returning: all three schedulers report
progress before completion. An explanation-only slice repeating `done: total` produces no duplicate callback.
An iterator returning a fallback immediately still reports its final position count once before completion.

## Definition of done & handoff

- All criteria have their evidence; the quick set passes; no generation test was changed.
- Handoff to GS05: the client methods as implemented, their rejection codes (`budget.cancelled`, `unexpected` /
  `busy`), the explicit `allowMain` grant, and the consent-required cancellation
  (`err.code === 'budget.cancelled' && err.i18nArgs.reason === 'replayConsentRequired'`).

## Execution log

| Field | Value |
|---|---|
| Status | Done |
| Start | 2026-10-28 23:51:20 (+07:00) |
| End | 2026-10-29 00:06:13 (+07:00) |
| Duration | 14 min 53 s |
| Model | claude-sonnet-5.5 (sub-agent `GS04-worker-job`, general-purpose); wave 4, alone |
| Token usage | 82 model calls; 11,541,974 input (11,339,374 cache read), 104,271 output |
| AI credits | 268.31 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: `--suite=worker` 138/138 (12.5 s); `--suite=cache,ui-contract,help` 187/187; generator quick set 43 suites 2,743/2,743 (79.3 s); player `--suite=help` 22/22; three mutation checks, reverted (removing the `forceMode: 'worker'` guard, the `allowMain` check or the final progress flush makes the matching tests fail). Orchestrator re-run: generator quick set 43 suites, 2,743 passed / 0 failed (80.0 s); player `--suite=help` 22/22; the ten edited files CRLF, no BOM; nothing outside the GS04 list changed; the `forceMode: 'worker'` no-fallback change matches the task's "worker-only trace prerequisite for GS05". |
| Acceptance | GS04-B01–B04 and GS04-T01–T08 met; B03's spy on `SG.replay.prepare` is in `worker.test.js`; the real worker runs in the loopback and the `Int32Array` boards are asserted after the JSON copy; analyses compared with `checks` zeroed. |
| Issues & resolutions | (1) Unspecified cases decided by the developer: a replay with `forceMode: 'worker'` rejects with `unexpected` even with `allowMain: true`; a `replayDone` whose analysis is not an object rejects with `unexpected`. Accepted. (2) The direct-client tests live in `worker.test.js`, because `ui-contract` may only change `CLIENT_SURFACE` (an intended contract change, D13). (3) The `generator/design.md` line anchors of the task (§9.3 at 1032, §13.10 at 1531) had moved; the headings were used. (4) No generation test changed; a `replay` / `cancelReplay` surface test was added. |
| Handoff | Every client (`SG.workerClient`, `create()` clients, `SG.app.directClient`, the cache wrapper) has `replay(result, { onProgress({ done, total }), allowMain = false }) → Promise<Analysis>` and `cancelReplay() → boolean`. Rejections: `budget.cancelled` when cancelled or replaced; `budget.cancelled` with `i18nArgs.reason === 'replayConsentRequired'` when page work is needed without `allowMain: true` (also for a worker that fails after `ready()`); `unexpected` with `i18nArgs.message === 'busy'` while a generation of that client runs; otherwise the analysis error (worker errors through `errorFromWire`; main-mode throws as they are, possibly without `.code`: GS05 treats any other rejection as a generic failure). `generate()` cancels a running replay. Worker protocol D6: `replay`, `replayProgress` (only when `done` changed), `replayDone`, `replayError`; `cancel` answered by `cancelled`; every scheduler flushes the final position count. `forceMode: 'worker'` never falls back, even when a worker must be replaced; `'auto'` still falls back, and after a worker failure `mode` stays `'main'` (existing behaviour). New fake-worker, main-mode and direct-client tests are browser-safe; the loopback tests are Node-only. |
