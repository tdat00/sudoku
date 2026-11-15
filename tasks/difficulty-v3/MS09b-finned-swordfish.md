# MS09b — Finned Swordfish

| Header | Value |
|---|---|
| Depends on | MS09a accepted |
| Size / active time | Medium; 40-55 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M9 complete |
| Authority | R10/R12/R20/R21 |
| Status | Not started |

## Goal & business context

Complete the three-base version with the same constructive fin proof, not an unrestricted fish search.

## Scope

In: n=3 and full B. Out: changing MS09a's selected limit or ordinary/four-base fish.

## Repository rules

AGENTS/checklist; no Git/pack/log writes; complete real fixtures/help, EN+VI and task-owned E.

## Inputs & context

R12, verbatim:

> Every base candidate outside the covers is a fin; fins are nonempty and all in one box.
> A target lies on a chosen cover, outside the bases, and sees every fin.

Use exactly three disjoint complete bases and three disjoint covers. If no fin is true the
three bases fill the three covers; otherwise the true fin excludes the target. Missing corners
are allowed; no complete-support claim from truncated enumeration.
Register finnedSwordfish: fish/order 134/weight 480/baseCost 48, unscoped, no uniqueness.
R10 Finding; key `technique.finnedSwordfish.step`;
args `{digit,bases:string[],covers:string[],fins:string[]}`. Sorted owned cells/eliminations.
Own work limit starts at 50000; do not silently change finnedXWing's already selected limit.

### MS09a handoff — the n=3 work limit (SA2 ruling, 2026-11-15)

- **Inherited unit and order.** One unit is one tested complete combination of three eligible
  base lines for one digit and orientation, counted before rejection checks. All cover choices
  for that combination are tried inside it, in MS09a's deterministic order. It is not a count
  of individual cover choices, visibility checks or targets. Keep the per-call reset, entry
  check and at-most-256-unit parent-budget cadence.
- **Independent limit.** The registered `finnedSwordfish` finder and the `size: 3` test seam
  use their own n=3 limit, initially **50,000**. Do not leave the seam tied to
  `FINNED_X_WING_WORK_LIMIT`; the n=2 finder and seam retain MS09a's selected limit and behavior.
  No board-dependent limit or automatic increase to a structural maximum is authorized.
- **Bounds are not observations.** MS09a's structural upper bounds in these units are
  **128,520** on Sohei and Butterfly and **255,420** on Samurai and Flower. A multigrid base
  triple can contain up to **2,925 cover trials**; distinguish that inner cost from the work
  counter. Exceeding 50,000 in this table does not establish an observed cap hit or latency.
  Record actual work, cap hits and latency on bounded affected-multigrid states as well as
  the standard fixture cost run, with the source, state/seed, limit and outcome identified.
- **Deterministic truncation.** Exhaustion returns `null` with `capHit: 'work'`; it never
  proves that no finned Swordfish exists. A complete witnessed Finding found before exhaustion
  remains valid. Test a witnessed result within the searched prefix and a capped prefix that
  cannot supply a result, including repeatability and the exact boundary. Independent agreement
  checks use the same searched base-combination prefix and its cover order, not an unrestricted
  oracle whose later witness would wrongly turn an allowed truncation into a failure. On an
  uncapped complete scan, retain full first-removing-pattern agreement. Keep all existing
  soundness populations and firing requirements; a capped result is not an exhaustive negative.
- **One-time adjustment.** Any adjustment of this new n=3 limit follows R10: measured
  before/after cap-hit and latency evidence on the same identified population, the chosen value
  in the task record and v3 notes, and one common value across boards. A structural bound alone
  is not a reason to raise it. This permission never changes `finnedXWing`'s limit.
- **Activation tests.** Replace MS09a's assertion that `finnedSwordfish` is not registered
  with registration and independent-limit checks, including the registered finder and the
  `size: 3` seam. Keep the n=3 kernel/agreement/soundness tests and all ordinary-fish/n=2
  regressions; do not delete the inactive-kernel coverage when its wrapper becomes active.
- **Sparse bodies.** Preserve this shared-comment wording:
  > At n=2, one body cell in a base line gives the missing-corner sashimi form. At n=3, sparse
  > bodies are also permitted by the same proof.

  Every base and cover still needs a body candidate. Do not classify every n=3 base with fewer
  than three body cells as sashimi: an ordinary Swordfish may already have two. No separate
  sashimi ID, key or Finding field is introduced.

These are the existing bounded finder, cost and test obligations, not a new qualification or
generation gate. The possibility of hitting the cap is not an owner stop; report its actual
coverage/cost effect under S-OD4 and continue within the existing command bounds.

Vector: digit 5 bases R1{C2,C5}, R4{C5,C8,C9}, R7{C2,C8}; covers C2/C5/C8;
fin R4C9; target R5C8. Add same-box fins, a missing apparent corner and transpose.
Negative: wrong base/cover count, split fin boxes, off-cover target, one unseen fin,
overlapping/partial units. Preserve every ordinary n=2/3/4 regression.
Baseline `core/js/engine/tech-fish.js:281-305` (`function findFish`); the shared fin kernel is MS09a.

## Files to create/modify

- Fish engine/suite; full B/E; applicable designs and both user/developer guide languages.

## Implementation steps

1. Add n=3 wrapper and independent per-ID work setting/metrics; update the seam and replace the
   not-registered assertion as the handoff above specifies.
2. Keep the inherited n=3 tests; test witness obligations, capped-prefix agreement and negatives;
   add two real exact-Finding positives and a negative.
3. Ship weight/registration/locales/current expectations/real help together.
4. Record actual cap hits/latency separately from structural bounds, reference changes and complete E/GH.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS09b-B01 | Three-base fin proofs are named and explained correctly |
| MS09b-B02 | Existing fish behavior and bounds are not retuned |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS09b-T01 | Exact three-base proof, sashimi/transpose and all fin visibility negatives pass |
| MS09b-T02 | State purity, independent n=3 default/seam limits, deterministic capped-prefix agreement, parent checks/cancellation and full B hold; n=2 behavior and limit unchanged |
| MS09b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Complete E MS09b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS09b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS09b\analysis\G01.json
node tests\pattern-cost.js --ids=finnedSwordfish --runs=20 --json=..\docs\difficulty-v3\evidence\MS09b\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=finnedSwordfish --sources=tests\artifacts\difficulty-v3\MS09b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=finnedSwordfish --sources=tests\artifacts\difficulty-v3\MS09b\sources.json --max-puzzles=8 --max-hints=400 --check
```

Use B's fish/chain sources then bounded classic9 hard/expert/master. Jobs 1/no --jobs; E 10-90 minutes,
cost 1-30 seconds, curated GH 1-120 seconds/discovery<=8 minutes. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Own limit may adjust once
with evidence. Never exceed 540 seconds/process.

## Definition of done & handoff

M9 is complete with both IDs independently bounded and all old fish regressions retained.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and generic soundness/order-invariant suites,
not routine analyst cross-review. Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical item for MS18c/MS18d and work continues within the bounds.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list, actual gates and CI membership.

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
