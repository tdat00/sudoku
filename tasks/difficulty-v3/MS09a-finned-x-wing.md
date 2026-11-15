# MS09a — Finned X-Wing, including sashimi

| Header | Value |
|---|---|
| Depends on | MS08c accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M9a |
| Authority | R10/R12/R20/R21 |
| Status | Not started |

## Goal & business context

Recognize a two-base finned fish soundly, including a missing apparent corner, without changing
ordinary fish results or expanding into Franken/mutant fish.

## Scope and repository rules

In: bounded reusable n-fish fin engine, activate n=2 only, full B. Out: n=3 registration until MS09b.
AGENTS/checklist, no Git/pack/log edits, both locales/guides, CRLF, owned E.

## Inputs & context

R12, verbatim:

> For size n=2/3 choose n disjoint complete base lines and n disjoint covers. Every base candidate
> outside the covers is a fin; fins are nonempty and all in one box. A target lies on a chosen cover,
> outside the bases, and sees every fin. If no fin is true, the ordinary n-fish fills the covers;
> if a fin is true, it excludes the target. This permits a missing apparent corner (sashimi).

Register finnedXWing: fish/order 126/weight 400/baseCost 40, unscoped, no uniqueness.
Finding key `technique.finnedXWing.step`; args `{digit,bases:string[],covers:string[],fins:string[]}`;
R10 fields with placements=[], sorted/deduplicated owned output.
Use safe fish owner tables, actual peers and genuine complete lines; no all-cell bit mask.
Keep n=2/3/4 ordinary fish outputs unchanged. Fins must be nonempty; an ordinary fish is not relabelled.
New work limit 50000 combination extensions, entry/every 256 checks, per-call reset and metrics.

Vector: digit 5 bases R1{C2,C8}, R4{C2,C8,C9}; covers C2/C8, fin R4C9; eliminate at R5C8.
Remove apparent R4C2 corner for sashimi. Add R4C7 as a same-box second fin.
Reject split-box fins, off-cover target R5C7, target R7C8 missing fin visibility, partial/overlapping lines.
These geometry vectors supplement, not replace, real fixture/help requirements.
Baseline `core/js/engine/tech-fish.js:56-125` and `:281-305` (`function findFish`).

## Files to create/modify

- Fish engine/suite; full B and E. Generator design 6.6, Player technique design, both guide languages.

## Implementation steps

1. Enumerate bounded base/cover selections with exact full fin set and a complete witness.
2. Activate n=2; keep shared n=3 code unregistered until the next task.
3. Add ordinary/multiple-fin/sashimi/transpose tests and real B fixtures/example.
4. Measure limits, record reference changes and perform E/GH/quick acceptance.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS09a-B01 | Fins and sashimi are named only with the full visibility proof |
| MS09a-B02 | Ordinary fish and excluded families remain unchanged |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS09a-T01 | Complete/disjoint bases/covers, one fin box and every fin peer are checked |
| MS09a-T02 | Exact Findings, negatives, ordinary regression, caps/cancellation and state purity pass |
| MS09a-T03 | Full B/E/GH/cost and both quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Complete E MS09a:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS09a\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS09a\analysis\G01.json
node tests\pattern-cost.js --ids=finnedXWing --runs=20 --json=..\docs\difficulty-v3\evidence\MS09a\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=finnedXWing --sources=tests\artifacts\difficulty-v3\MS09a\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=finnedXWing --sources=tests\artifacts\difficulty-v3\MS09a\sources.json --max-puzzles=8 --max-hints=400 --check
```

Use B's colour/chain real sources, then classic9 hard/expert bounded discovery. Jobs 1/no --jobs.
E 10-90 minutes; cost 1-30 seconds; GH 1-120 seconds curated or <=8 minutes/discovery.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Record at most one own-limit adjustment and rerun affected evidence; 540-second process ceiling.

## Definition of done & handoff

Hand MS09b the bounded shared enumeration and its proof/ordering. Only finnedXWing is registered.

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
| Status | Accepted (orchestrator check against IR72 A-J; outside the analyst review set). The developer stopped before E with eight questions; the pack author (SA2) accepted Q1-Q6 and Q8 as implemented and changed the wording (Q7) and one shared comment (Q2) |
| Start | 2026-11-15 22:36:31 (+07:00), base `eecc372` (the MS09b pack note `5acff75` landed mid-task, touching only its own file) |
| End | 2026-11-15 23:10 stop before E; 23:17-23:20 SA2 ruling; 23:22-2026-11-16 00:50:52 E and final evidence; orchestrator re-check and commit |
| Duration | 2 h 14 min developer (34 min to the question + 1 h 28 min after the ruling, incl. two mutation compounds and two quick passes); about 4 min SA2 ruling; 81 locked commands, 342.5 s lock wait (pentomino's MP17 gate shared the machine) |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 ruling); claude-opus-5.5 (orchestrator) |
| Token usage | 366 model calls; 129,657,022 input tokens (127,999,260 cache reads); 459,175 output tokens |
| AI credits | about 2,154 (developer) |
| Verification | `finnedXWing` in `core/js/engine/tech-fish.js` (fish group, order 126, base cost 40, unscoped, `assumesUniqueness: false`), `WEIGHTS.finnedXWing = 400` (between `emptyRectangle` 380 and `swordfish` 420: Hard tier). Pattern (SA2 Q1-Q3): two complete base lines and two covers; every base candidate, fins included, keeps `findFish` ownership; a body cell in every base and cover; at least one fin, all fins in one single-owner `box` or `region`; targets are cover cells outside the bases that see every fin by real peers; sashimi is the n=2 missing-corner form, with no flag, ID or key. Finding `{ cells, placements: [], eliminations, i18nArgs { digit, bases, covers, fins } }`, deterministic order (digit, rows then columns, base pairs, cover pairs). Work unit: one tested pair of base lines, counted before rejection, at most 36 cover trials on 9x9 and 153 on multi-grids; limit 50,000, budget cadence 256; structural maximum 17,820 (Samurai and Flower, 36 %); pattern cost 66-216, none capped. n=3 reachable only through the unregistered seam (`finnedSwordfish` asserted not registered). Ordinary fish (X-Wing, Swordfish, Jellyfish, Skyscraper, Kite, Empty Rectangle) identical to `eecc372` on 35,040 lines. `tech-fish` 317 -> 395, `techniques` 213 -> 222, `technique-weights` 9 -> 10; 49/50 mutants (one equivalent: a placed cell as a target). **E** (once, frozen source; merge-checks re-run on the final tree): 23 of 520 hashes changed, none below Hard (classic9 expert and master, diagonalX nightmare, jigsaw9 master, one greaterThan hard seed); wires G09, G11 (other puzzles), G10 (counters only); analyses G04, G05, G06, G09, G11, G12, G14. Reference ratings: 4 change (worlds-hardest-2012 5,592 -> 5,544; platinum-blonde 5,665 -> 5,675; constructed-nightmare-1 2,704 -> 2,727; constructed-nightmare-2 2,637 -> 2,652), no level or `v3Expected` change. Help catalogue 32 (`finnedXWing` from Nightmare 1156 step 32; six regenerated from their own sources), 32/32. Quick sets: Generator 3,830/3,830 (324.0 s; +5.1 % for +2.4 % tests), Player 2,074/2,074 (45.3 s); fingerprints match; CI check passes. Orchestrator: locked gate suites 675/675 (`tech-fish` 395, `techniques` 222, `technique-weights` 10, `difficulty-floor` 48; 44.7 s); CI shard check 3,830 |
| Acceptance | MS09a-B01, B02, T01, T02, T03 met; IR72 A-J pass (A design §6.6 and the reference enumeration on every class; B registration and 4 rating changes, 0 levels; C limits, cadence, structural maxima; D positives, negatives, supplements; E bilingual wording as ruled; F 49/50 with one equivalent; G complete E with re-checks; H 32/32 help; I pin table; J fingerprints, lock log, base named) |
| Issues & resolutions | **Questions before E:** units for bases, covers and the fin box; sashimi; the target rule; the Finding and order; the work unit (incl. the n=3 maxima 128,520 and 255,420 on four multi-grid boards); the weight; the wording; the n=3 seam. SA2 accepted the implemented behaviour, changed the wording to "one box or region" / "một khối hoặc vùng" and the final step sentence, corrected the shared sashimi comment, and added an MS09b pack note on the n=3 limit (`5acff75`). The first quick pass is kept as superseded (the design and one VI guide sentence changed afterwards). Honest gaps stated in the evidence: Butterfly held no finned X-Wing in 300 sampled states (its agreement compares two empty answers; the design says so); no golden specimen of the "mixed" jump sentence remains (pinned by synthetic tests); the manual `difficulty` suite is evaluated by script. Lock waits all recorded (`lock-log.jsonl`). No new S-AV item; S-AV08 re-measured (324.0 s / 45.3 s) |
| Handoff | To MS09b: the shared finned-fish enumeration and seam (`SG.fishSearch.finnedFish(..., {size})`), the n=3 maxima above 50,000 on Sohei, Butterfly, Samurai and Flower, the pack note on an independent n=3 limit with deterministic truncation; replace the "not registered" assertion; base quick totals Generator 3,830 (324.0 s) and Player 2,074 (45.3 s); help catalogue 32; ask before E |
