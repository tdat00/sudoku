# IG-S03 - Scoped solver prototype and virtual-check parity

| Header | Value |
|---|---|
| Depends on | IG-S02 accepted |
| Developer | claude-sonnet-5.5 |
| Size /active time | Large;2-3 h |
| Machine allocation | 22 min, admission grace included |
| Owner /milestone | Test-side S3/SM4; M2 |
| Authority | IG-S-Q03, including the per-family fallback rule |
| Status | Not started |

## Goal and business context

Measure the smallest meaningful S3 implementation, not rewrite the whole solver. Preserve actual
Findings, calibrated ratings, check order and cap-failure boundary. Then measure its contribution to
the paired six-cell request rows, alone on one seed and combined with S5a on H3.

## Scope and files

Add H `scoped-solver.cjs`, private basic/subset adapters, parity tests and task records.
Read `logical-solver.js:iterate/applyFinding`, `tech-basic.js`, `tech-subset.js`,
`techniques.js:createContext`, and the objective/Killer rating guards.
Only private in-memory copies change. No production source, S4, graph/chain caching, extra techniques,
weight/order changes or cap-unit changes.

## Fixed prototype design

1. Optimise negative scopes for naked singles (cell), hidden singles (unit), and the six existing
   naked/hidden pair/triple/quad finders (unit). Other finders, including chains, remain native full scans.
   Cache **negative** results only; never reuse an old positive Finding.
2. Preserve each finder's original unit/cell/digit/combination order. Per-solve ownership is mandatory;
   recursive/trial states and different models/allowed sets cannot share mutable dirty state.
3. Invalidate conservatively after placements: the placed cell and all its peers, hence their units.
   Invalidate elimination cells/units. Marking too much dirty is safe and costs time; missing a peer is not.
4. A special trap in `tech-subset.js`: `nodes` resets once per find, but the every256-node cadence spans
   units. The last scan's check count is NOT solely a function of one unit's candidates.
   Cache the negative scope's raw enumeration-node increment and replay check positions using the
   current incoming residue, plus its unit-entry check. Preserve the actual `CHECK_EVERY` from the source.
   Do not reuse the previous number of checks blindly.
   The key includes finder definition (size, naked/hidden), unit values/candidates, model/digit geometry
   and `completeUnits[u]` for hidden subsets. MAX_UNIT/incomplete-unit skips still make the unit-entry
   check and have zero enumeration increment. With incoming nodes r and cached increment inc, emit that
   entry check, then `floor((r+inc)/CHECK_EVERY)-floor(r/CHECK_EVERY)` real `ctx.check()` calls at the
   corresponding virtual node positions, then finish at nodes=r+inc. A throwing check must expose the
   boundary state, not the end of the skipped scope.
5. Virtual checks must cross the cap at the same original logical site/ordinal and propagate the same
   error/result. Calling `check()` once for a whole skipped scope is not equivalent to charging its
   several checks. Bulk charging is permitted only with a proved equivalent failure boundary and
   trace; the simplest prototype may issue each virtual check explicitly.
6. Check the two obligations from Q03: scope dependencies, and no budget handler consuming interrupted
   partial scratch state. A family without a proof remains native. At least one nonzero-check family
   must actually skip work and pass parity; do not present a singles-only cache as a virtual-check result.
7. Instrumented audit mode hashes every logical check-site token and step/Finding, retaining bounded
   first/last and mismatch context. Benchmark mode has no per-check hashing or per-finder clocks.
   Do not use audited wall time as a speed measurement.

## Exact audit and timing population

Audit the18 saved H3 puzzles from IG-S02, with the native canonical ladder and the applicable restricted
sets. Add private synthetic states specifically crossing the subset enumeration cadence with different
incoming residues. Fixed states/seeds and their hashes must be in the pre-run audit manifest.

For each saved-puzzle solve, test unlimited/count-observer parity plus injected count failures at
the first check, the middle check, the last check and the check immediately before/after a skipped-scope
boundary (deduplicate ordinals). Use native error codes/catch paths. For100000 objective and30000 Killer
rating guards, controlled precharge can place that same boundary at the real ceiling; label these
**boundary-injected**, not naturally binding measurements. Include any naturally binding captured cases
separately. Do not pretend S3 changes the DFS-only repair meter.

Timing:

- `scoped-attempts-w4` for every H3 request (18 observations), paired with IG-S02's exact matched baselines.
- `scoped-native-w1` on mega16:3, mega12:3, samurai:42, classic9:3, killer:3, greaterThan:3
  (6 observations), to isolate serial S3.
- Baseline reuse requires the unchanged active reference fingerprints. Otherwise stop for an author-approved
  refresh, not an unbudgeted automatic rerun.

Planned timing shards: one per H3 cell (6); serial mega16 (1), serial mega12+samurai (1),
serial classic9+killer+greaterThan (1). Audit/synthetic checks use two additional shards.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S03 -Round provisional-r1
```

Approximately9 min measured request/audit work,8.25 min grace and4.75 min margin =22 min.
Frozen rerun uses the same diagnostic population, re-deriving the current ladder:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S03 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | The report distinguishes partial-S3 measured gain from the unimplemented full S3 forecast |
| B02 | No performance win is accepted in exchange for different proof, puzzle or guard behaviour |
| B03 | All six headline rows have matched scoped-pool evidence; two-attempt local work stays limited |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | Complete Finding/step/rating equality and logical check-sequence equality hold on the audit population |
| T02 | Injected/native guard outcomes, failure ordinal/site and exposed error fields agree |
| T03 | Subset incoming-residue, peer invalidation, per-state isolation and budget-error cleanup are covered |
| T04 | Uncensored request outputs agree with their native/pool counterparts |
| T05 | Timing has audit instrumentation disabled; skipped/real/virtual work and CPU are still accounted for |

## Test plan and records

The focused tests must fail for stale-peer invalidation, last-check-count-only caching, wrong scan order
and a bulk check that skips the true failure boundary. Use deliberately failing synthetic mutations in
the test-side implementation only; restore the real prototype before the measurement.

Write common records, `parity.json`, `check-sequences.json`, `coverage.json`, `summary.json/md`.
For each finder record real/negative/skipped scopes, raw enumeration visits, virtual check charges,
invalidation count, full-scan fallback reason and implemented IDs. Record zero/negative gain honestly.
No hash/golden update is allowed to make equality pass.

## Definition of done and handoff

The orchestrator reviews the scope proof and parity, not just a fast number. Handoff: a test-only selectable
`solverMode=reference|scoped`, native fallback for unproved families, and the observed serial/pool factors.
S3 failure on a family is reported to Astra; it does not authorise changing the production guards.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: SM4 sufficient for these families on this runtime; reporting fixes applied in `summary-r3`) |
| Start /end | 2026-11-15 00:07-01:21 (+07:00) first pass; 01:20 orchestrator approval of 90 s and the mega16 serial row (r2); 01:43 reporting revision r3; orchestrator commit |
| Developer /model | claude-sonnet-5.5; 159 model calls, 67,028,961 input tokens (65,751,633 cache reads), 350,637 output tokens, about 1,327 AI credits. Author review gpt-6-astra; orchestrator claude-opus-5.5 |
| Files /source identities | New under `phase0/`: `scoped-solver.cjs`, `adapters/scoped-solver.cjs`, `adapters/scoped-audit.cjs`, `scoped-audit.cjs`, `scoped-audit-worker.cjs`, `scoped-audit-host.cjs`, `scoped-test.cjs`, `plans/ig-s03.cjs`, `ig03-run.cjs`, `ig03-aggregate.cjs`; `run.cjs` (one hook line) and `README.md` changed. Harness `baeb9ea2…` for the generation shards, `dedddaef…` for `ser-m16` (only the aggregator differs); runtime unchanged; baselines IG-S02 `summary-r2` reused, never rerun |
| Verification /evidence | `docs/improve-generating/evidence/phase0/provisional-r1/IG-S03/` (`summary-r3.md` current; r1 and r2 kept as history). SM4 parity: 18 saved puzzles x 4 solver sets equal in findings, steps, ratings, final states and check-site token hash; 770 injected count failures equal in ordinal, site, steps and error fields; boundary-injected ceilings (100,000 objective guard, 30,000 Killer slice); 0 skipped-scope audit violations; four deliberate mutations detected; 24 request identities digest-equal to IG-S02. Families: singles proved with no checks; six subset finders proved in replay form; 17 other techniques stay native full scans |
| Machine charged /priority wait | 1,307.2 s of 1,320 s + 90 s approved by the orchestrator (12 commands; the failed audit-1 a1 cost 309 s); priority waits 959.9 s, not charged |
| Findings /author answers | Verdict (r3): this partial S3 (singles and subsets) gives **no material net gain observed on this cohort** (serial 0.94-1.03, incremental over the pool 0.91-1.02; combined equals the pool's gain: mega16 1.97, mega12 3.34, samurai 1.83, classic9 2.92, Killer 2.50, Greater-Than 2.45); it does not supply the report's 1.3-1.65x and does **not** refute full S3: the remaining 17 families' cost and the cache overhead were not measured, so SM1 (IG-S07) must locate the solver time. Early-exact regressions (first exact at attempt 1): classic9:2 and Greater-Than:1, combined 0.83x. SM4 is sufficient for these families on this runtime; multi-check skipped scopes are covered only by engine-free tests; not a certification of the frozen source. Disclosures: an audit-session race (two consumers of one worker channel) failed a1, fixed and rerun as a2 with a1 kept; one prohibited read-only `git status` (not repeated) |
| Orchestrator review /acceptance | Only harness and evidence folders changed; formats checked |
| Handoff | IG-S04 as written: 12-minute cap, reference solver only, no assumed S3 gain, mega16/samurai seed-11 controls and F1 first, then the mandatory reprojection. The reporting-only harness change `baeb9ea2…` -> `dedddaef…` is compatible |
