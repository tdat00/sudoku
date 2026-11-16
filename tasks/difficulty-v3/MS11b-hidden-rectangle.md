# MS11b — Hidden Unique Rectangle

| Header | Value |
|---|---|
| Depends on | MS11a accepted |
| Size / active time | Medium; 35-50 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M11b |
| Authority | R10/R14/R20/R21 |
| Status | Not started |

## Goal & business context

Complete the hidden rectangle form while keeping the same deadly-geometry and uniqueness guards.

## Scope and repository rules

In: hidden form after existing subtypes, its text/fixtures. Out: BUG/new IDs/weight changes.
AGENTS/checklist, no Git/pack/log edits, both language pairs and task-owned E.

## Inputs & context

R14, verbatim:

> Hidden form: one corner exactly x/y; the opposite corner has conjugate links on x along its row
> and column to the adjacent rectangle corners. It cannot be y, which would force a deadly rectangle.
> Search the transposes and swapped digit roles.

Same ID/order 180/weight 900/baseCost/uniqueness flag. Key
`technique.uniqueRectangle.hidden.step`, args `{digit:x,digits:[x,y],cells:string[]}`.
Actual complete row/column conjugates, same swap-preserving geometry, no cages/signs, false
uniqueness context => null. Preserve type 1/2 priority and MS11a's types before the new hidden pass.
Own work limit 50000 extensions, entry/every 256 checks, copied deterministic Findings/metrics.

Vector: A=R1C1{1,2}, B=R1C4{1,2,4}, C=R2C1{1,2,5}, D=R2C4{1,2,3}.
If 1 is conjugate D-C on row 2 and D-B on column 4, eliminate 2 at D. If D were 2 then B/C are 1
and A is 2, the forbidden rectangle. Add an extra 1 in either conjugate unit => no such witness.
Test digit swap, transpose, wrong opposite corner, incomplete/extra units and ctx=false.
Baseline `core/js/engine/tech-wing.js:349-399`, `:477-528` (`function findUniqueRectangle`).

### Pre-E rulings — SA2, 2026-11-16

These are interpretations/corrections within R10/R14/IR72, not a prior, scope or owner-decision
change. No Fable/owner escalation is required. Apply the reporting correction and wording below,
verify the affected contracts, then freeze for E; do not treat the preliminary results as final.

1. **Admitted rectangles: accept (a).** "One corner exactly x/y" designates a floor F; it does
   not say "exactly one corner is bivalue". The opposite target O may itself be {X,Y}. If O=Y,
   the two X conjugates force the row/column neighbours to X and F to Y. The unchanged swap
   geometry then contradicts uniqueness. This proof does not require an extra candidate at O;
   removing Y simply leaves X there. Retain the 128 observed two-exact-corner cases, the
   exact-Finding regression for that configuration, and the four-bare-corners negative.
   Skip the wholly bare deadly rectangle; do not remove or weaken the existing two-solutions
   regression. Keep four open corners, their common mask exactly {X,Y}, all swap guards,
   `assumeUniqueness:false` and the cage/inequality ban. Do not broaden to neighbours lacking Y.
2. **Work records: accept (a), but change publication timing to preserve IR72 C2.** On a normal
   return use the existing record schema and ID, in pass order: zero records for pass 1/context
   rejection, one for pass 2 when it returns a Finding or spends the parent budget, two if the
   hidden pass runs. Each record retains its own limit/work/cap status. Do not merge the records,
   create an extra technique/diagnostic ID or add a new evidence schema.

   **Buffer the records until all passes needed by this finder invocation return normally.**
   Let the bounded helper return its record/data; publish in the outer dispatcher only after
   the subsequent pass, if any, has finished. If a search pass propagates cancellation or a
   non-budget error, publish **no records from that invocation**. Current code/tests permit
   one already-published pass-2 record on a pass-3 cancellation; that is the required correction,
   not an IR72 exception. SA2's finite read-only probe confirmed it at the hidden entry check.
   Change that cancellation/error expectation to an empty observer list, covering entry and
   mid-pass failure; preserve the thrown error, exact check positions and all MS11a assertions.
   Observer-thrown errors still propagate; do not swallow them.

   A handled spent parent budget remains a normal null return: one record if pass 2 stopped,
   two if pass 3 stopped, the spent pass with `capHit:null`; the caller's budget remains spent.
   A local work cap remains `capHit:'work'`. Retain the fresh counters and each pass's entry and
   <=256-unit cadence.

   **Existing tools are compatible.** `generator/tests/fixtures/pattern-cost.js::recordOf`
   retains `reports` and the ordered `work` array, sums `workUnits`, and retains an observed cap.
   Its existing "adds up several work records" test already covers two records with the same ID.
   Thus an aggregate above 50,000 is not a single-pass overrun; compare each record to its own
   limit. A capped pass 2 followed by a valid hidden Finding remains a valid complete proof, not
   evidence that pass 2 was exhaustive. Run the existing `pattern-cost-tools` coverage; no
   production recorder/schema rewrite is needed.
   The MS11b census already separates `own[0]` and `own[1]`; validate the expected 0/1/2 record
   count and ID/order rather than silently ignoring extras. Report whole finder calls once,
   pass-2/pass-3 executions/caps/work separately, and whole-call latency (including legacy work
   and table construction where applicable). Fix its stale baseline comment: `ef95fc5` already
   has passes 1 and 2, not "first pass alone/no second-pass record". Preserve archived MS11a tools.
3. **Arguments: accept ascending pair and rectangle order.** `digit` is the link digit X;
   `digits` is the pair ascending even when X is the larger digit; both `cells` arrays preserve
   rectangle order. The elimination identifies O and Y. Keep the explicit hidden-key exception
   in the header; do not make `digit` mean Y or introduce new role-ordered fields.
   In both apps, change the text's floor clause and final sentence for clarity:
   - EN floor clause: `and at least one of them holds only {digits}.`
   - VI floor clause: `và ít nhất một góc trong số đó chỉ chứa {digits}.`
   - EN ending: `So the digit of {digits} other than {digit} is removed from the opposite corner.`
   - VI ending: `Vậy chữ số của {digits} khác {digit} bị loại khỏi góc đối diện.`
   Keep the intervening proof, placeholders, digit-swap and localized render tests.
4. **Pass order and independent limits: accept.** After all earlier subtype passes, enumerate
   rectangles and targets in the existing rectangle order, lower link digit first. A local
   pass-2 work cap may fall through to the independently bounded hidden pass; a spent parent
   budget may not. Preserve/pass-test both cases, with their ordered records. Do not describe a
   capped pass 2 as proof that no Type 3/4 deduction exists. No shared or enlarged work allowance.
5. **Links: accept.** Require the actual row and column units joining O to the two neighbouring
   corners, with kind row/col and both complete. No substitute box/extra-unit/layout-line link.
   Account for a solved holder instead of ignoring it; retain that negative and the third-holder
   negatives. The survivor changing `holders === 2` to `holders <= 2` is equivalent behind these
   guards: both distinct open corners already hold X in each selected unit, so there cannot be
   fewer than two holders. Keep the equality and record the precise guarded argument.
6. **Work unit/limit: accept; no adjustment.** One unit is a tested (target, link digit) with
   both holder scans inside it. Ineligible targets need no such unit. At most four targets x two
   digits gives eight per admitted rectangle: the supplied bounds (36,864 on 16 digits,
   13,392 on Samurai, 3,888 on classic9) are below the hidden limit of 50,000 on the listed
   geometries. This bounds hidden work only, not the whole finder, elapsed time or the parent
   budget, and it does not close pass 2's S-AV34. Keep reduced-limit seam/boundary tests and the
   final-source census/pattern cost. Label the Killer/Greater-Than test-helper geometries as
   uncaged/unconstrained; real cages/signs remain excluded. No new named item follows solely
   from this non-binding hidden limit; carry S-AV34 and S-AV08 with final-source observations.
7. **Fixtures and pins: accept.** Add the real unique hidden positive and two supplements,
   preserving the four earlier positives, earlier supplements and historical/v2 records.
   Five positives/five supplements and the new subtype-key expectations are legitimate integration
   pins, not weakened assertions. Keep independent uniqueness/completion evidence, all old
   seeded populations/minima, and the added hidden firing minima. Re-run the adapted MS11a
   mutations and the hidden mutations on the final source; retain the initial survivor/fix runs
   and document equivalence rather than counting a survivor or missing fragment as detected.
8. **E/GH: proceed after the corrections; no extra reachability gate.** Complete all five
   G09-G13 wires, fourteen G01-G14 analyses and 520 hashes, wires published/checked before
   analyses. The four admitting cells restrict the **GG hash manifest**, not every wire/analysis
   or the names of affected help techniques. Explain all changes; an unexpected below-Master GG
   change or an unexplained correctness/evidence failure needs `QUESTION:` before publication.
   R20 permits explained score/level/requiredness changes; retain the priors and historical labels.
   Recheck the 26 references on final source and record causes, not only new numbers.

   Run GH `--check` for **all 35 IDs first**; the one focused failure does not establish that only
   Empty Rectangle is affected. Own-source replay/refresh comes first for every affected ID;
   changing the hint at its old step does not by itself mean the puzzle never yields that ID.
   Then use real catalogue sources, then B's task-wide maximum of four distinct batches of twelve
   requests if needed, starting classic9 master/nightmare, <=400 hints and <=8-minute deadline;
   failed attempts count. Keep the task's eight-source curated command. Preserve old/new source
   provenance, do not suppress earlier techniques or fabricate snapshots, and stop with `QUESTION:`
   if the allowed route cannot supply a required real example. One example per ID remains the
   contract; retain the UR example if it still replays and finish the complete GH check.

   Finish live guides/designs before their fingerprinted checks, notes, both complete quick sets,
   final-source merge/fingerprint checks and CI under the projection-maintenance rule (including
   Player's actual 900 s limit). Keep preliminary reach/evidence source-qualified; no extra
   30,000-puzzle campaign is required. Use the relayed announcement and normal coordination,
   shared lock, IR12 admission, <=450 s compound admission, <=540 s process-tree ceiling and
   >=15 s gaps. A 50-60 minute phase estimate is not one payload allowance.
   Retain the disclosed editing-method deviations in the record and use approved edit tools
   going forward; do not rewrite history to erase them.

## Files to create/modify

- Wing engine/suite, B's affected UR fixture/current-reference/locale/help data, E.
- Applicable Generator/Player designs, both guide languages, v3 notes.

## Implementation steps

1. Add hidden proof after existing subtype passes with unchanged geometry guards.
2. Add uniquely proved real positive, exact elimination and all conjugate/geometry negatives.
3. Add both apps' subtype text and update reference changes without fitting weights.
4. Record cost/E/GH and quick results.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS11b-B01 | The hidden proof is explicit and conditional on genuine uniqueness |
| MS11b-B02 | No new technique ID or changed old subtype priority |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS11b-T01 | Both true conjugates, opposite-corner geometry and false-context guards pass |
| MS11b-T02 | ID/key, state purity, deterministic bounds and historical/current separation hold |
| MS11b-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor,tech-chain,i18n,pattern-cost-tools`;
Player `--suite=play,i18n,help,help-example-tools,tech-chain,tech-wing,techniques`; both quick sets.
Complete E MS11b:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS11b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS11b\analysis\G01.json
node tests\pattern-cost.js --ids=uniqueRectangle --runs=20 --json=..\docs\difficulty-v3\evidence\MS11b\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11b\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=uniqueRectangle --sources=tests\artifacts\difficulty-v3\MS11b\sources.json --max-puzzles=8 --max-hints=400 --check
```

B acquisition: existing UR source, then bounded classic9 master/nightmare. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-60 seconds, curated GH 1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Only this new pass's limit may adjust once; 540-second process ceiling.

## Definition of done & handoff

Report hidden-form proof and real fixture, with no deferred locale/help or reference update.

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
