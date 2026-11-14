# Sudoku difficulty-v3 — review of MS06c1, nullable target transport without policy activation

| Field | Value |
|---|---|
| Reviewer | SA1 (agent Opus, claude-opus-5.5), analyst review set MS06b-MS06c2 (S-OD4) |
| Date | 2026-11-14 |
| Subject | MS06c1, uncommitted on `rating-v3` at `1d657b1` (`git diff` plus the untracked evidence and artifacts) |
| Against | `tasks/difficulty-v3/MS06c1-target-transport.md`; R6, R7 and R23 (`docs/difficulty-v3/report-detailed.md`); the FS12-FS16/FS20 dispositions in check-list §4; CV6-05's transport rule; what MS06c2 needs, including IR34 and IR38 |
| Ran | read-only only: git reads, file reads, and identities recomputed in memory with the repository's own hashing rules. No test, no generation |

**Verdict: accept.** There is no blocking or major finding, and no fix round is needed.

- The objective adapter ranks exactly as the old numbers did.
- The keeper views capture a scalar per context and keep a single source of state.
- Every transport hop maps a value that is not a finite number to `null`, keeps zero, and never reads a score.
- No production code draws or reads a target. `greater-than.js` and every other variant are untouched.
- GG check-only, GR and both quick sets hold on the final tree; I recomputed their identities.

The three reported deviations are within scope; none needs routing (section 3). The only Minor item, IR39, is a
handoff point for MS06c2's brief and needs no change here.

## 1. The implementation against the task

All references are to `generator/js/engine/digger.js` unless named otherwise.

| Requirement (task) | Result |
|---|---|
| Typed objectives with the old semantics: `refused` with the same reasons, `bounded` with `tierUsed` from the same restricted report (vacuous for Very Easy and an empty tier), `proposal` even when the solve finishes | Done (`:615-617`, `:686-744`). The refusal reasons map exactly as the old `refusalReason` did. `score < spec.max` is negated as before, so NaN is still refused. `tierUsed` costs no solve |
| The old ranking: maximise the number, first of an equal one, numeric `trace.keep`, refusal mask kept, no new solve or comparison | Done (`:748-750`, `:814-827`). Old non-refused values were never negative, so testing on the kind is equivalent to the old `value < 0` |
| Nullable transport: `LevelPuzzle`, keeper `best`, `keptPuzzle`, `GeneratedPuzzle`, pipeline result, `toWire`/`fromWire`, soak row, optional tune target | Done. `nullableTarget` (`:1196-1198`; `pipeline.js:45-47`) keeps zero and turns anything that is not a finite number into `null`. An old wire or cache entry decodes as `null` |
| Keeper view: `Object.create(keeper)` plus a wrapping `offer`, a captured scalar, the original receiver, no shadow state, the original keeper for structure searches | Done (`:1256-1263`). Every write to keeper state happens inside the original's `offer` through its closure (`:1230`, `:1236-1241`), so a view never shadows `best`, `distance` or `unsound`. `closer` reads its closure. The Killer layout search gets the original keeper (`:2027`), so its candidates carry `null` |
| No draw, no finite target from normal callers, no helper call, the MS06b forwarding unchanged | Done. `targetFor`, `preferObjective`, `applyBounded`, `preferRated` and `acceptReveal` appear only in their definition and the tests. The forwarding line is unchanged (`:1408`). The spied-stream test finds no `target` fork, and the `signs` spy (T03) is kept |
| No edit to variant algorithms, solvers or budgets; CV6-05 | Done. No variant, solver or budget file is modified |

The tests follow the task's test plan:

- two suspended contexts with targets 812 and 915, an earlier structure-only winner, and a cooperative yield;
- equal quality across contexts keeps the first;
- the wire, worker, cache and soak routes, with 812.5, zero, null and an old absent field;
- objective parity: the frozen refusals, bounded results, finished and stuck proposals, one solve and one
  classification;
- 29 recorded guided passes;
- the preparation-phase labels.

My MS06b items are applied:

- IR31: the floor case at target 705 (`digger-target.test.js:262-267`);
- IR32: the `design.md:719` phrase;
- IR33: the renamed case at `:129`;
- IR35: `D.bandOf('hell2')` at `:24`;
- IR36: the Vietnamese link.

## 2. Evidence

| Gate | Check | Result |
|---|---|---|
| GG check-only | The 104 ledgers carry `aec98868…`, which is `tests/perf.js`'s source hash of the current tree. The regression fixture equals the ledgers (520 of 520) and is unchanged against HEAD. Two compounds took 397.7 s and 169.7 s, all 123 items within their projections, peak elapsed 425.4 s (under 450 s) | Holds |
| GR wire | I compared the HEAD and working-tree fixtures: in each of G09-G13 the only difference is `target`, absent before and `null` now. Ledgers carry `733b995f…`, the current replay identity | Holds: exactly the nullable-metadata refresh the GR row allows |
| GR analyses | G01-G14 match `replay-goldens.js`, which is unchanged against HEAD | Holds |
| Quick sets | Generator: 3,323 of 3,323 in 8 shards (1,143 + 55 + 111 + 1,583 + 152 + 69 + 153 + 57), fingerprint `d9e03806…`. Player: 1,683 of 1,683, `3873abea…`. Both equal what I recompute for the current tree | Hold as they are |
| CI | `ci-check.txt`: 3,323 of 3,323 tests, each in exactly one shard; groups projected 630, 930, 1,260 and 720 s against 1,800 s. The manifest's counts and provenance are updated | Holds |
| Format | CRLF, no BOM, no trailing whitespace. No added engine line is over 110 characters; the only one in `digger.js` predates the task. Longer lines are in tests and tools, as before | Holds |

## 3. The three deviations

1. **Exporting `removalObjective`, `createKeeper`, `keeperView` and `keptPuzzle`.**
   - Within scope. The task's own test plan needs them: objective parity, keeper views, two contexts on one keeper.
   - The "Out: … exports/history" line of the scope means the puzzle export and history formats (R6: "Target is not
     a new puzzle-exchange field"), which are untouched: `export.js` takes only `toWire(result).model`.
   - Exporting engine internals for tests has precedent (`rateCounted`, `copyWork`, `CAP_RATINGS`).
   - One documentation gap: IR41.
2. **`tune` verdicts carry `target` only when it is finite.** This is the schema's documented rule (`events.js:325-326`:
   "left out when there is none"). It keeps every default event stream byte-identical, which is why the analyses did
   not change. Within scope.
3. **The search continuation passes `target: attemptBest.target`** (`:2077-2083`), so production now hands the
   search strategy its own `target: null`.
   - Within the carry scope: the anchor table assigns "carry selected target, no draw" for `searchStrategy` and
     `attemptBest`, and the inputs say "keep the target through … later search continuation".
   - It exceeds the literal sentence "no normal … caller starts adding such an option yet", but only with `null`,
     and it is MS06c2's end state ("a later search always passes the candidate's property even when null").
   - Record it in the Execution log as an accepted deviation; no routing.

## 4. Could a target leak, or could the explicit null change anything?

**The GG proof does not cover every route on its own.** The regression hash
(`perf-helper.js`: givens, solution, regions, cages, signs, symbols) does not contain `target`. It runs only the
in-process pipeline route. Every route is covered by the combination below.

- **By construction.**
  - No reader: the only `target` readers in engine code are the transport itself and the tune-schema check.
  - No draw: the spied-stream test, and MS06b's helper spy.
  - With nothing to read and nothing drawn, no route can choose a different puzzle because of a target.
- **Direct `SG.digger.generate`.**
  - The 29 digested `digStage` passes, bounded and proposal.
  - The soak's direct-route test (its puzzle hashes are equal with and without a forced target).
  - The `generate` transport cases of `digger-target`.
- **Pipeline:** GG 520 of 520; `pipeline.test.js` (the result field, and no target in any default verdict event).
- **Worker:** `worker.test.js`, where `expectSameResult` now also compares `target`, and the wire case with
  `structuredClone` covering numbers, zero, null, old wires and invalid values.
- **Cache:**
  - Keys come from the configuration (`cache.js:144-147`, `keyInfo(config)`), and `sameResult` ignores `target`.
  - Entries now store `"target":null`, and old entries decode as `null` (`cache.test.js`).
- **Exports and history:** no target. `export.js` takes only the model; the history format is untouched.

**The explicit `null` on the continuation changes nothing.** I checked each place it reaches:

- The search strategy's `ctx.target` has no reader.
- The search's keeper view captures `null`, the same as an absent target.
- The search's `LevelPuzzle.target` is `null` either way.
- Its verdict leaves `null` out.
- No stream is forked for it.
- Cache keys do not see it, and the result and wire values are `null` either way.

GG 520 of 520 and the unchanged analyses confirm this for the pipeline route.

## 5. What MS06c2 inherits

- **Transport.** Finite values survive every hop under strict tests, which answers IR34 for transport. MS06c2's own
  T01 (origin equality on the real `signs` route) remains to be written.
- **IR38.** A caller's `options.target` given to `generate` reaches every sample, the search and the result, and is
  documented and tested. See IR39 for the consequence.
- **Typed objectives.** Results are ready for `preferObjective` and `applyBounded`: `bounded` has a finite score and
  a boolean `tierUsed`; `proposal` has a finite priority. MS06c2 removes the `objectiveValue` adapter and seeds each
  pool with its first success.

## 6. Findings

| Id | Severity | File:line | Summary |
|---|---|---|---|
| IR39 | Minor | `digger-target.test.js:1002-1037`; `digger.js:1887-1889`; `MS06c2-activate-target-policy.md` ("Single draw and the strategy route") | Kept transport tests fix "an explicit `generate` target comes back as given"; MS06c2's per-sample draw would override it. MS06c2's brief must decide the meaning first |
| IR40 | Info | `docs/difficulty-v3/evidence/MS06c1/characterize-head.txt` | The 29 HEAD digests are recorded only as test constants; the HEAD run's printed table is not in the evidence |
| IR41 | Info | `generator/design.md` §13.13 (`:1760-1772`) | The `SG.digger` API block lists neither `targetPolicy` (MS06b) nor the four new exports; mark them internal there |
| IR42 | Info | `digger.js:1256-1263` | A view built over a view lets the inner (earlier) target win; production never nests, so MS06c2 must keep passing the original keeper |
| IR43 | Info | `design.md:721-723`, `:778`, `:1717`, `:1973`; both guides | Statements that become false at activation ("nothing draws one", "520 hashes the same"); MS06c2's file list covers them |
| IR44 | Info | `digger.js:1887-1889` (`GeneratedPuzzle.target`) | "Comes back as given" does not hold when a structure-search candidate wins (`null` by design); one clause |

#### IR39 — Minor: the meaning of an explicit `generate` target, before MS06c2

**What.** Three cases of `digger-target` are transport cases, not labelled preparation phase:

- `generate returns the target of the sample` / `… of the kept candidate` / `… of the local search`
  (`:1002-1037`).

They call `SG.digger.generate` with an explicit `options.target` of 812.5, 0, null, absent or NaN, and expect it
back. They rely on `digOptions` copying the caller's options into every sample (IR38).

**Why it matters.** MS06c2's brief draws a target in every sample ("`const target = targetPolicy.targetFor(spec,
sampleRng)` … pass … target in that call's options"). That draw overrides the copied value by `Object.assign` order,
so these cases would fail, including the null, absent and NaN rows. MS06c2's step 4 lists the preparation-phase
migrations and "retain … all wire/keeper tests", but it does not settle these.

**Routing (pack, not MS06c1).** SA2 adds one sentence to MS06c2 before dispatch, choosing one of:

- (a) An own `target` property on `generate` is a test seam that suppresses the per-sample draw: every sample uses
  it, and the three cases stay.
- (b) Every sample always draws, and the three cases migrate to the per-sample drawn targets (`targetFor(spec,
  SG.rng.create(sampleRng.seed))`), keeping the keeper and search inheritance assertions.

R7 ("each sample has its own target") favours (b) for production; (a) is acceptable only as a test seam. No owner
decision is involved.

#### IR40 — Info: the HEAD digests' record

- `characterize-head.txt` holds only "exit=0". The 29 digests survive only as the test's constants.
- Parity is independently confirmed: GG 520 of 520, analyses unchanged, and replay goldens unchanged. No rerun is
  needed.
- For the record, the printed HEAD table could be saved, or the evidence can state that the constants are the
  record.

#### IR41 — Info: the API listing

§13.13 lists `SG.digger`'s public functions. Add one line naming `targetPolicy`, `removalObjective`, `createKeeper`,
`keeperView` and `keptPuzzle` as internal seams for tests and MS06c2. §6.8 already describes them.

#### IR42 — Info: nested keeper views

**What.** `keeperView(view, t2)` wraps a view. Its `offer` hands the inner view a candidate carrying `t2`, and the
inner view then overrides it with its own captured target, so the earlier context's target wins.

**Why it does not matter now.** Every production `digLevelSteps` call receives the original keeper through
`digOptions.keeper`; the structure search gets the original too.

**For MS06c2.** Keep it that way: never pass a `ctx.keeper` (a view) into a nested `digLevelSteps`. Alternatively,
let `keeperView` unwrap a view.

#### IR43 — Info: statements that activation makes false

These are true now and become false at MS06c2:

- design §6.8: "nothing draws or reads a target", "the sample loop draws none and passes none";
- §7.2: "only an explicit test call can do";
- §13.9: "nothing draws one yet";
- §15.3 I4: "the 520 regression hashes are the same before and after it";
- both guides: "which every normal request has because nothing draws one".

MS06c2's file list (design 6.8/7.2/15.3, both guides) owns them. List them in its handoff so none is missed; §13.9
needs adding to that list.

#### IR44 — Info: one clause of `GeneratedPuzzle.target`

**What.** The comment says an explicit `generate` target "comes back as given". When the kept winner comes from a
variant's structure search (Killer's layout, offered to the original keeper), the result's target is `null`, as
design §6.8 and the tests say.

**Fix (optional).** Add "unless the result is a structure-search candidate, which has none".

MS06c1 REVIEWED: 0 blocking, 0 major, 1 minor (IR39, routed to MS06c2's brief), 5 info (IR40-IR44). Verdict: accept.
