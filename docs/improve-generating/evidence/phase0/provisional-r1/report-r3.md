# IG-S10: estimates against measurements, and the frozen-rerun handoff (provisional-r1, revision r3)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance, changes a default or authorises the bank route.**

**Revision r3** (pack-author report-only rulings after the owner's audit (statistic labels, S1/S2 cost and yield, first-phase formula, withdrawn costing premises, two unmeasured rows, source preparation, Killer and Greater-Than wording, staleness)). It supersedes the r1 and r2 documents, which stay unchanged beside it (sha-256 first 16: r1 report.json f4594501127300e3; r1 report.md 4a291f9bb5a69971; r1 coverage.json 3faf6a8cc9caeed6; r1 budget-summary.json c4d9bcdfd4e815de; r1 gate.json 86713925f30f89d5; r1 frozen-rerun-plan.json caa2c4855a69ebc5; r1 IG-S10/reconcile/command.json 92a1a5b3a88ff3ee; r2 coverage-r2.json e470a93cbab8ab56; r2 budget-summary-r2.json a58f5eabc5674354; r2 gate-r2.json fc006176b961a438; r2 frozen-rerun-plan-r2.json a16174f19beebd92; r2 report-r2.json b367270949676348; r2 report-r2.md 9088fea96dba06e2). the r3 aggregation (ig10-run.cjs --write-r3): unwrapped, read-only, no engine, no worker, no generation, not charged. Writer harness fingerprint 53e7acbc62e6fd45bde6999f30c9861455065e2980267d9c437e659466f59372 (the r2 writer ran harness 8f0018b5c36db04a...; the wrapped r1 command ran harness 9a8afa85b3ff9165...). Against r2 (revision header, test counts and disclosures ignored): coverage-r3.json equals coverage-r2.json; budget-summary-r3.json equals budget-summary-r2.json; gate-r3.json equals gate-r2.json; frozen-rerun-plan-r3.json differs from frozen-rerun-plan-r2.json.

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze** (see gate-r3.json). Pre-MS07 catalogue and runtime; every number below is a provisional measurement of a prototype, never a production result. Original estimates are labelled **P** (the joint report: Measured today, otherwise Derived or Projection).

Scope of this document: the reconciliation of IG-S01 to IG-S09 (IG-S06 deferred), the estimate-versus-measured table of the check-list, the provisional gate report, the machine accounting and the frozen-rerun proposal. It generated no puzzle, started no engine and no worker, and changed no production source.

## 0. Errata to the joint report, the plan and the earlier IG-S10 reports

The pack author's report-only rulings correct the passages below. The originals (`report.md`, `plan.md`, `clarifications.md` and the r1 / r2 reports) are not edited; line numbers are located in the files as they are now. Measured records and accounting figures are unchanged.

| # | ruling | subject | affected passage (document: lines) | what was wrong | correction (this revision) |
|---|---|---|---|---|---|
| E1 | 1 | Samurai baseline and the other CV3 anchors | report.md (joint report): 49, 64, 92-95; IG-S10 report.md (r1): 125; IG-S10 report-r2.md: 134 | 26.74 s is the CV3 maximum of two requests (MS05b3), not a median; it stood in a "median / p95" column and was compared with a measured median | compare descriptively with the new maximum 26.53 s (-0.8 %); the new median 24.93 s is shown separately; sohei 27.49, flower 23.07 and butterfly 32.82 are CV3 maxima of two requests too and are labelled so (anchors and proxies); the mega12 / mega16 anchors are deep medians (n = 7), classic9 the R5 median (n = 12), Killer and Greater-Than I5 per-request medians |
| E2 | 2 | The native sample mix | IG-S10 report.md (r1): 308, 323, 338, 353; IG-S10 report-r2.md: 317, 332, 347, 362 | the equal-weight mix was labelled "NOT the native request mix (unknown here)" | equal weighting matches the observed ordinary/proposal counts of the four SM1 requests (48/48, 12/12, 24/24, 12/12; IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix |
| E3 | 3 | S1 per-sample cost against yield | report.md (joint report): 35-36, 108, 136; IG-S10 report-r2.md: 140, 158 | the planning expectation was a near-constant per-sample cost (time per sample divided by about 1 / 1.2 / 1.5-2 / 3) | not observed for this prototype and cohort: F1 sample CPU over the equal-weight native mix is about 0.38 / 0.28 / 0.12 / 0.23 (classic9 / mega12 / mega16 / samurai); the cheap work is attributed to unsuccessful, empty-frontier and above-band outcomes; cost per verified exact puzzle remains unestablished and yield inconclusive (0 hits in every mode) |
| E4 | 4 | S2 isolated (F0 versus F1) | plan.md (joint plan): 99; report.md (joint report): 107; IG-S10 report-r2.md: 140, 158 | S2 was priced inside the combined S1 + S2 divisor and measured only inside the combined S1/S2 row | an isolated row: F1/F0 mean sample CPU is about 1.01-1.12 on the same 8 grid clusters x 2 samples per cell: no CPU saving on this cohort; correctness and deduction-saving evidence is kept separate; not generalised to "S2 never helps" |
| E5 | 5 | The first-phase formula and its verdict | report.md (joint report): 65, 101; IG-S10 report.md (r1): 123-128; IG-S10 report-r2.md: 132-137 | the verdict text treated S1/S2/S5b as missing components of the first phases and called S4 merely "unimplemented" | the original first-phase formula is full S3 x S4 x S5a with S3 alone on the local continuation; only S5a and partial S3 were measured; S4 is unimplemented and under Q04 moves to phase 3 under the new generator version; S1/S2/S5b are phase-3 items, not missing components of that formula |
| E6 | 6 | 1,296 solves per sample and "10x fewer solves" | plan.md (joint plan): 67, 74, 98, 154, 338, 350; report.md (joint report): 27 | the plan costs every sample at about 1,296 full solves for every board and projects 10x fewer solves from S1 | withdrawn as representative costing and speed-up premises: SM1 observed roughly 74-331 solves per ordinary sample; a lower observed count does not refute a mathematical upper bound, which stays only as a separately justified loose bound, never as typical work or an empirical 10x prediction |
| E7 | 7 | Two missing measurements: the SM5 width sweep and the restricted-floor probes | plan.md (joint plan): 366; report.md (joint report): 42, 136, 263; clarifications.md: 186, 503 | the pack lists the SM5 sweep (1, 2, 4 workers on mega12 and classic9) and the restricted-floor probes, and neither was measured | explicit UNMEASURED rows (the existing floor parity is not the probes; the width-4 pool and the effective two-worker operation on two-attempt boards are not the width-two comparison); added to the frozen proposal and decisions D9 / A7; no run authorised |
| E8 | 8 | Source preparation before the frozen commands | IG-S10 report.md (r1): 531; IG-S10 report-r2.md: 540 | the frozen proposal ran the commands without a prerequisite and priced no adapter repair or recalibration | prerequisite: a dedicated worktree at the attested frozen commit, a pinned harness installed and fingerprinted, a capability inventory; adapter repairs, reproof and recalibration are uncosted approval-dependent work outside every runtime projection; never a fallback to the old engine |
| E9 | 9 | Killer wording | IG-S10 report.md (r1): 129; IG-S10 report-r2.md: 136, 138 | a bare "refuted" for the Killer S5a planning factor | "below the planning range on all three observed pairs; no general refutation" (no numerical change; the x2.55 median, the x2.07-2.65 range and the original IG-S02 verdict stay as historical evidence) |
| E10 | 10 | The IG-S09 Nightmare cohort | IG-S10 report-r2.md: 144 | the Nightmare cohort was called "censored" | "partial, budget-limited cohort": its recorded requests completed and eight rows were unstarted |

## 1. Sources and identities

| item | value |
|---|---|
| runtime fingerprint (every measurement command; recheck by file reads) | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime files | 63 |
| catalogue fingerprint | d035b740ff3ad78310773050a53f0633ca6ac4e4b38e68df173c19befef9fb3e |
| catalogue | rating version 2, 15 variants, 26 techniques |
| harness fingerprint of this r3 report writer (unwrapped aggregation) | 53e7acbc62e6fd45bde6999f30c9861455065e2980267d9c437e659466f59372 |
| harness fingerprint of the r2 report writer | 8f0018b5c36db04a16707d44fd3c3f011ff3a75321c6d9c81e539beb283bd901 |
| harness fingerprint of the wrapped r1 command | 9a8afa85b3ff9165648fe6e1267a567c4c62e95ad9126a43e76db2d1ecb364c2 |
| harness fingerprint before the IG-S10 edits (= the IG-S09 F2 follow-up) | bbd5db2da6cd55bb1cbb93aab2d76777e855a8b5ece6b2ade9b33f0f9cf103b4 |
| source stability and firewall | every command of the nine tasks reports sourceStable and firewallClean; the runtime fingerprint loaded now equals the one every measurement command recorded; the r1 command checked the production firewall (command.json firewallClean); the r3 aggregation reads the evidence and writes only the six r3 files in the round folder |

computed with common.cjs harnessFingerprint() at the start of this task, before any IG-S10 edit; it is the IG-S09 F2-follow-up harness (bbd5db2da6cd...); IG-S10 adds files and one glue line in run.cjs, so the fingerprint of this run differs

Three identities are kept apart for every task: the **measurement** command(s) that produced the records, the **report writer(s)** that produced the accepted summaries, and the **corrected harness** after later corrections. The corrections (reporting, verification, branches no trial exercised) were NOT rerun on the engine.

| task | measurement (recorded by the commands) | report writer(s) (prefix, found in evidence) | corrected harness (prefix, engine-rerun) |
|---|---|---|---|
| IG-S01 | 64b1e3869d7e | none | none |
| IG-S02 | dd759a22bf13 | c4f3a6e0 (yes) | c4f3a6e0 (yes, no) |
| IG-S03 | baeb9ea2c1ae, dedddaef9979 | dedddaef (yes) | none |
| IG-S04 | 694eea9bf608 | 98016f2c (yes) | 98016f2c (yes, no) |
| IG-S05 | 58c583c213f1 | f297ca31 (yes) | f297ca31 (yes, no) |
| IG-S07 | 0feb1ea57bd4, 062742c330eb | f91e6e527f67 (yes), 5027a528f03a (yes) | 062742c330eb (yes, no), 5027a528f03a (yes, no) |
| IG-S08 | fe2bae1efce6 | acd724186e2d (yes), 82b623923934 (yes) | 82b623923934 (yes, no) |
| IG-S09 | 9da69f60fbd2 | 89105175e832 (log only), d414ebac (yes) | bbd5db2da6cd (log only, no) |

Accepted revisions used: IG-S02 summary-r2 + Killer audit-a1; IG-S03 summary-r3; IG-S04 summary-r2, budgets-r2; IG-S05 summary-r2; IG-S07 r2; IG-S08 r3; IG-S09 r2 plus the F2 follow-up (bbd5db2da6cd...). Earlier revisions of every summary stay as history and are not used.

| accepted document | sha-256 (first 16) | bytes |
|---|---|---|
| IG-S02/summary-r2.json | fbbb8298da2ef695 | 92376 |
| IG-S02/killer/audit-a1/audit.json | 28b1f1fa36bf7e69 | 22761 |
| IG-S03/summary-r3.json | 6cf91b5ef9b3bfcc | 91928 |
| IG-S03/coverage-r3.json | 56976b4ea681552d | 21296 |
| IG-S03/parity-r3.json | 65b537683daea7ff | 85878 |
| IG-S03/check-sequences-r3.json | 8c6320620189b7d8 | 1143082 |
| IG-S04/summary-r2.json | 47a3f47b2681fb3e | 84793 |
| IG-S04/budgets-r2.json | 81e138da9616ab4b | 30844 |
| IG-S04/s2-audit-r2.json | 4b1139f137865c95 | 117501 |
| IG-S04/engine-retest-r2.json | b96b278a899510b6 | 10787 |
| IG-S04/pilot-reprojection.json | e610ad8c527f22bc | 30377 |
| IG-S05/summary-r2.json | 3323e3f5b5a2db25 | 24764 |
| IG-S05/rates-r2.json | 1d15b8641cac659b | 228769 |
| IG-S05/paired-intervals-r2.json | e68ff271d4fb4760 | 127868 |
| IG-S05/selection.json | c8784b7a71fb5651 | 9876 |
| IG-S05/screen-manifest.json | 6f17660709b67fba | 59136 |
| IG-S07/summary-r2.json | 7ca966f76a90ba16 | 224411 |
| IG-S07/stage-profile-r2.json | cc2ceda5becce573 | 618501 |
| IG-S07/finder-profile-r2.json | 1caeea629af164a1 | 257878 |
| IG-S07/overhead.json | 85a01ff388dc7bbc | 24572 |
| IG-S07/frontier-phase-a.json | b938b77633dec5c9 | 114019 |
| IG-S08/summary-r3.json | ca096fcc3758a12f | 75323 |
| IG-S08/tail-attribution-r3.json | 99ada2e10aaaef53 | 85337 |
| IG-S09/summary-r2.json | d23fb1727262cb89 | 134614 |
| IG-S09/miss-split-r2.json | fe5d407b00a24a25 | 24010 |
| IG-S09/order-parity-r2.json | 31cef8deccb49143 | 14826 |
| IG-S09/setup-probes-r2.json | 5255888a79020555 | 36774 |
| IG-S09/samples-r2.json | 80dd9920eb6baf36 | 5960876 |
| IG-S09/sign-passes-r2.json | b8c863af7979e3ea | 5775653 |

## 2. Coverage reconciliation (planned against observed)

Planned keys 480 across 8 tasks: completed 452, completed by audit overlay 6, budget-ended 13, censored 1, errors 0, validation unknown 0, **unstarted 8**; early-exact skipped 0, aliases 0, blocked 0; deferred: **IG-S06** (not planned, not run). Every manifest equals its preregistered population: true. Reconciliation problems: 0. A key is never counted twice and none is dropped.

| task | status | planned | completed | audit overlay | budget-ended | censored | error | unstarted | manifest |
|---|---|---|---|---|---|---|---|---|---|
| IG-S01 | accepted | 4 | 4 | 0 | 0 | 0 | 0 | 0 | equal |
| IG-S02 | accepted | 36 | 30 | 6 | 0 | 0 | 0 | 0 | equal |
| IG-S03 | accepted | 43 | 43 | 0 | 0 | 0 | 0 | 0 | equal |
| IG-S04 | accepted | 64 | 64 | 0 | 0 | 0 | 0 | 0 | equal |
| IG-S05 | accepted-inconclusive | 256 | 243 | 0 | 13 | 0 | 0 | 0 | equal |
| IG-S07 | accepted | 12 | 12 | 0 | 0 | 0 | 0 | 0 | hash differs (see notes) |
| IG-S08 | accepted | 3 | 2 | 0 | 0 | 1 | 0 | 0 | equal |
| IG-S09 | accepted-partial | 62 | 54 | 0 | 0 | 0 | 0 | 8 | equal |
| IG-S06 | deferred | not planned | 0 | 0 | 0 | 0 | 0 | n/a | no manifest |

- **IG-S01** (accepted after one fix round (harness 64b1e386); infrastructure only, no estimate): attempt history kept (failed and paused attempts included): self-test [a1:complete a2:complete]; loader-parity [a1:complete a2:paused-unstarted a3:complete]
- **IG-S02** (accepted after the Killer audit (summary-r2 with the hash-linked sidecar)): Killer overlay: 6 stored `error` rows verified by the hash-linked re-audit (`provisional-r1/IG-S02/killer/audit-a1/audit.json`, sha-256 28b1f1fa36bf7e69); the stored records are unchanged | attempt history kept (failed and paused attempts included): c9 [a1:error a2:error a3:complete]
- **IG-S03** (accepted (summary-r3): SM4 parity sufficient for these families; no material net gain from the partial S3): attempt history kept (failed and paused attempts included): audit-1 [a1:parity-failed a2:complete]
- **IG-S04** (accepted after the six-key completion and one correction round (summary-r2, budgets-r2)): attempt history kept (failed and paused attempts included): s1-large-controls [a1:error a2:complete]; s2-small-all [a1:paused-unstarted a2:paused-unstarted a3:complete]; s4-large-floors [a1:paused-unstarted a2:complete]; s5-large-reference [a1:paused-unstarted a2:paused-unstarted a3:paused-unstarted a4:paused-unstarted a5:paused-unstarted a6:complete]
- **IG-S05** (accepted, inconclusive by the preregistered rule (summary-r2)): sample ordinals: {"returned":499,"sample-budget":13,"censored":0,"error":0,"not-reached":0,"unstarted":0}; early-exact skipped 0 | attempt history kept (failed and paused attempts included): screen [a1:paused-unstarted a2:paused-unstarted a3:paused-unstarted a4:paused-unstarted a5:paused-unstarted a6:paused-unstarted a7:paused-unstarted a8:paused-unstarted a9:paused-unstarted a10:complete]
- **IG-S07** (accepted after one fix round (summary-r2): provisional attribution, not complete solver-check accounting): the manifest hash differs from the recorded one because the plan was extended after the run (a request-free shard); every planned request key is identical
- **IG-S08** (accepted after one reporting-only round (summary-r3): a censored lower bound, not a latency gate): censored: IG-S08/tail/jigsaw9:expert:1111/profiled (request-timeout, scope request, cold wall lower bound 240.015 s)
- **IG-S09** (accepted as an authorised partial diagnostic (summary-r2, F1-F5 closed): Nightmare 706-709 unstarted): UNSTARTED (not excluded, failed or replaced): IG-S09/nightmare-706-707/greaterThan:nightmare:706/g0, IG-S09/nightmare-706-707/greaterThan:nightmare:706/g1, IG-S09/nightmare-706-707/greaterThan:nightmare:707/g1, IG-S09/nightmare-706-707/greaterThan:nightmare:707/g0, IG-S09/nightmare-708-709/greaterThan:nightmare:708/g0, IG-S09/nightmare-708-709/greaterThan:nightmare:708/g1, IG-S09/nightmare-708-709/greaterThan:nightmare:709/g1, IG-S09/nightmare-708-709/greaterThan:nightmare:709/g0 | shards never run: nightmare-706-707, nightmare-708-709
- **IG-S06** (DEFERRED this pre-freeze round (2026-11-15 scheduling decision): not passed, not refuted, not run): full-request composition (S1/S2 plus S5b, held-out requests 201/202, N1/CA4/CQ1/CQ4) is UNMEASURED: not passed, not refuted; the 24-minute allocation was not run and is not an automatic transfer.

Commands outside every shard (charged once, listed here, their requests excluded from every count):

| command | task | status | occupied | role |
|---|---|---|---|---|
| IG-S02/killer/audit-a1/command.json | IG-S02 | complete | 2.9 s | re-audit sidecar of the six saved Killer puzzles (no generation) |
| IG-S04/engine-retest-r2/command.json | IG-S04 | complete | 1.6 s | real-engine retest of the corrected frontier code (no trial, nothing timed) |
| IG-S09/dev-check/command.json | IG-S09 | dev-check-complete | 7.0 s | development check of the per-job flow (not part of any shard; its requests are excluded) |

This task's own wrapped command (a shard attempt of its own plan, never an auxiliary command):

| command | task | status | occupied | role |
|---|---|---|---|---|
| IG-S10/reconcile/command.json | IG-S10/reconcile | complete | 6.8 s | the one wrapped reconciliation command of this task (r1); the r2 and r3 documents are unwrapped read-only aggregations |

Observations that enter no count, rate or interval:

| task | what | observations | why |
|---|---|---|---|
| IG-S05 | dev-check (dev-check-a1.json) | 16 | the 16 keys are identical to the screen's (earlier harness and manifest, admission rule only); stay excluded from every count, rate, interval and selection |
| IG-S09 | dev-check (IG-S09/dev-check) | 3 | three disclosed development requests (Normal seed 300: G0, G1 and the observer-free control); excluded from every count; its machine time is charged once (52.035 s) and it is a command outside every shard |
| IG-S07 | unwrapped pre-check (disclosed) | 2 | 0.47 s and 0.41 s CPU on a puzzle later replaced by Escargot; not a profile row; the 0.470 s is debited once as a manual adjustment without grace (see the budget summary), the 0.41 s is not added |
| IG-S02 | Killer re-audit sidecar (audit-a1) | 6 | verification of six saved puzzles, no generation; the six stored rows keep their original error outcome and are counted as completed by audit overlay |
| IG-S04 | engine retest r2 (engine-retest-r2) | 15 | a retest of the corrected frontier code on the real engine: 15 checks, no trial, nothing timed |

No reconciliation problem: identities, counts, firewall and gate labels agree.

## 3. Estimate versus measured (the check-list table, filled)

Verdict rules (r2; no invented numeric threshold): a "Today" anchor and an SM1 share are shown with their DESCRIPTIVE difference to the report and carry no verdict. An S5a factor follows the IG-S02 rule (accepted by the pack author) against the report's planning range: **supported** when the median ready-wall speed-up reaches the low end of the range, **inconclusive** when it does not but at least one pair does, and when no pair reaches it the label is "planning-factor estimate refuted on these pairs" (this does not refute the usefulness of the measured improvement). Partial S3 had no assigned gain forecast: its result is "no material net gain demonstrated" (the median of the paired incremental ratios) and the full-S3 forecast is **untested/inconclusive**. A first-phase or all-phase estimate whose components are not all implemented is **inconclusive**, never decided by a partial implementation. Verdicts concern the IMPLEMENTED scope of each prototype on this pre-MS07 catalogue; n = 3 (or 8 clusters) is descriptive.

| Report row / multiplier | P: report planning anchor | Paired measured before | Measured prototype after | CPU ratio / wall ratio | Hits / CPU s / wall s | Scope, censoring, source | Verdict (implemented scope) |
|---|---|---|---|---|---|---|---|
| mega16 Nightmare | Today 104.11 / 116.95 s (median / p95: deep requests, MS05r5m, n = 7; report, Measured); first phases 39 / 50 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 11 / 14 s, envelope 3.3-44 s (P); S5a x1.7-1.8; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 107.53 / max 116.04 s; cold p50 107.61 s; CPU p50 107.55 s | S5a w4: ready p50 55.89 / max 69.96 s (cold p50 56.00); S5a + partial S3: ready p50 54.66 / max 69.92 s; serial partial S3 (n = 1): 104.49 s | S5a ready x1.92 (1.66-1.96), cold x1.92, CPU pool/native x0.98 (0.98-0.99); partial S3 over the pool: median paired incremental ready ratio x1.01 (1.00-1.02), CPU x0.99 (S5a+S3 / native; median combined ready x1.97) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 107.53 s against the median 104.11 s (+3.42 s, +3.3 %); S5a: supported (median x1.92 reaches the low end of the planning range x1.7-1.8); partial S3: no material net gain demonstrated (median paired incremental ratio x1.01, range 1.00-1.02), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 54.66 s ready |
| mega12 Nightmare | Today 23.72 / 25.24 s (median / p95: deep requests, MS05r5m, n = 7; report, Measured); first phases 5.4 / 7.2 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 4.6 / 5.9 s, envelope 1-15 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 23.35 / max 23.50 s; cold p50 23.46 s; CPU p50 23.83 s | S5a w4: ready p50 7.06 / max 7.69 s (cold p50 7.18); S5a + partial S3: ready p50 6.80 / max 7.92 s; serial partial S3 (n = 1): 23.33 s | S5a ready x3.22 (3.04-3.43), cold x3.18, CPU pool/native x1.12 (1.09-1.13); partial S3 over the pool: median paired incremental ready ratio x1.02 (0.97-1.04), CPU x1.10 (S5a+S3 / native; median combined ready x3.34) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 23.35 s against the median 23.72 s (-0.37 s, -1.5 %); S5a: supported (median x3.22 reaches the low end of the planning range x2.8-3.0); partial S3: no material net gain demonstrated (median paired incremental ratio x1.02, range 0.97-1.04), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 6.80 s ready |
| samurai Nightmare | Today 26.74 s (maximum of two requests: CV3, MS05b3: the larger of two requests, not a median; report, Measured); first phases 10.3 / 11.6 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 5.6 / 6.5 s, envelope 1.9-19 s (P); S5a x1.7-1.8; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 24.93 / max 26.53 s; cold p50 25.02 s; CPU p50 25.56 s | S5a w4: ready p50 13.64 / max 14.83 s (cold p50 13.74); S5a + partial S3: ready p50 13.40 / max 14.53 s; serial partial S3 (n = 1): 21.40 s | S5a ready x1.79 (1.70-1.83), cold x1.78, CPU pool/native x1.04 (1.01-1.05); partial S3 over the pool: median paired incremental ready ratio x1.02 (0.98-1.02), CPU x1.03 (S5a+S3 / native; median combined ready x1.83) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured maximum 26.53 s against the CV3 maximum of two requests 26.74 s (-0.21 s, -0.8 %); the measured median is 24.93 s (shown separately, not compared with a maximum); S5a: supported (median x1.79 reaches the low end of the planning range x1.7-1.8); partial S3: no material net gain demonstrated (median paired incremental ratio x1.02, range 0.98-1.02), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 13.40 s ready |
| classic9 Nightmare | Today 4.91 / 5.72 s (median / p95: R5 cell, MS05r4, n = 12; report, Measured); first phases 1.17 / 1.7 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 1.2 / 1.7 s, envelope 0.38-3.2 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 4.98 / max 5.64 s; cold p50 5.07 s; CPU p50 5.64 s | S5a w4: ready p50 1.55 / max 1.74 s (cold p50 1.67); S5a + partial S3: ready p50 1.71 / max 1.76 s; serial partial S3 (n = 1): 5.82 s | S5a ready x3.22 (0.91-3.25), cold x3.04, CPU pool/native x1.45 (1.40-4.39); partial S3 over the pool: median paired incremental ready ratio x0.91 (0.91-0.99), CPU x1.64 (S5a+S3 / native; median combined ready x2.92) | native 1/3 exact, 0.0782/CPU s, 0.0865/wall s; S5a 1/3 exact, 0.0469/CPU s, 0.2279/wall s; S5a+S3 1/3 exact, 0.0437/CPU s, 0.2144/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 4.98 s against the median 4.91 s (+0.07 s, +1.5 %); S5a: supported (median x3.22 reaches the low end of the planning range x2.8-3.0); partial S3: no material net gain demonstrated (median paired incremental ratio x0.91, range 0.91-0.99), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 1.71 s ready |
| Killer Nightmare | Today 17.82 / 29.98 s (median / p95: I5 per-request results, MS05b3; report, Measured); first phases 4.5 / 9.8 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 4.5 / 9.8 s, envelope 2.8-17.9 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 21.11 / max 30.44 s; cold p50 21.20 s; CPU p50 22.16 s | S5a w4: ready p50 7.97 / max 14.73 s (cold p50 8.08); S5a + partial S3: ready p50 8.46 / max 15.10 s; serial partial S3 (n = 1): 22.40 s | S5a ready x2.55 (2.07-2.65), cold x2.52, CPU pool/native x1.14 (1.12-1.22); partial S3 over the pool: median paired incremental ready ratio x0.98 (0.94-0.98), CPU x1.25 (S5a+S3 / native; median combined ready x2.50) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; Killer rows by hash-linked audit overlay; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 21.11 s against the median 17.82 s (+3.29 s, +18.5 %); S5a: below the planning range on all 3 observed pairs (x2.07-2.65 versus x2.8-3.0); no general refutation: the x2.55 (median) pool improvement stands, and the original IG-S02 verdict (estimate-refuted (no pair reaches 2.8)) is kept as historical evidence in IG-S02/summary-r2; partial S3: no material net gain demonstrated (median paired incremental ratio x0.98, range 0.94-0.98), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 8.46 s ready |
| Greater-Than Nightmare | Today 9.3 / 19.19 s (median / p95: I5 per-request results, MS05b3; report, Measured); first phases 2.2 / 6 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 2.2 / 6 s, envelope 1.2-9.4 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 11.57 / max 19.32 s; cold p50 11.65 s; CPU p50 15.50 s | S5a w4: ready p50 4.41 / max 6.31 s (cold p50 4.52); S5a + partial S3: ready p50 4.72 / max 7.12 s; serial partial S3 (n = 1): 11.45 s | S5a ready x2.62 (0.89-3.06), cold x2.58, CPU pool/native x1.58 (1.23-4.13); partial S3 over the pool: median paired incremental ready ratio x0.93 (0.89-0.93), CPU x1.73 (S5a+S3 / native; median combined ready x2.45) | native 3/3 exact, 0.0704/CPU s, 0.0933/wall s; S5a 3/3 exact, 0.0483/CPU s, 0.2405/wall s; S5a+S3 3/3 exact, 0.0433/CPU s, 0.2201/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 11.57 s against the median 9.3 s (+2.27 s, +24.4 %); S5a: inconclusive (median x2.62 is below the low end of x2.8-3.0 but at least one pair reaches it, up to x3.06); partial S3: no material net gain demonstrated (median paired incremental ratio x0.93, range 0.89-0.93), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 4.72 s ready |
| S5a width 4 | at most 2 active attempts on two-attempt boards; x2.8-3.0 on 8/4-attempt boards, x1.7-1.8 on two-attempt boards | native-w1, n = 3 per cell (rows above) | attempts-w4: mega16 x1.92 (1.66-1.96); mega12 x3.22 (3.04-3.43); samurai x1.79 (1.70-1.83); classic9 x3.22 (0.91-3.25); killer x2.55 (2.07-2.65); greaterThan x2.62 (0.89-3.06) | CPU pool/native p50: mega16 0.98, mega12 1.12, samurai 1.04, classic9 1.45, killer 1.14, greaterThan 1.58; the pool reads CPU once at the host (speculation, startup and cleanup included) | verified exact identical in both arms in every cell: true (classic9 1/3, Greater-Than 3/3, others 0/3) | pooled == native on 18/18 pairs (identity of every digest section); two-attempt ceiling respected (mega16 peak active 2 of 2; samurai peak active 2 of 2); speculative attempts completed and discarded: mega16 0, mega12 0, samurai 0, classic9 1, killer 0, greaterThan 3; early-exact regressions (first exact at attempt 1): classic9:2 x0.91, greaterThan:1 x0.89; n = 3 descriptive; no censoring; above 120 s: 0 | supported on mega16, mega12, samurai, classic9; Killer: below the planning range on all 3 observed pairs (x2.07-2.65 versus x2.8-3.0); no general refutation: the x2.55 (median) pool improvement stands, and the original IG-S02 verdict (estimate-refuted (no pair reaches 2.8)) is kept as historical evidence in IG-S02/summary-r2; Greater-Than: inconclusive (median x2.62 is below the low end of x2.8-3.0 but at least one pair reaches it, up to x3.06) |
| Partial S3 | same check/failure sequence (parity); no gain forecast was assigned to the partial scope (the report's x1.3-1.65 is the full-S3 planning range) | native-w1 / attempts-w4 baselines of IG-S02 (reused, never rerun) | scoped-native-w1 (n = 1 per cell on 6 seeds) and scoped-attempts-w4 (18 requests): mega16 serial 1.03 (n = 1), median paired incremental 1.01 (1.00-1.02); mega12 serial 1.01 (n = 1), median paired incremental 1.02 (0.97-1.04); samurai serial 1.01 (n = 1), median paired incremental 1.02 (0.98-1.02); classic9 serial 0.97 (n = 1), median paired incremental 0.91 (0.91-0.99); killer serial 0.94 (n = 1), median paired incremental 0.98 (0.94-0.98); greaterThan serial 1.01 (n = 1), median paired incremental 0.93 (0.89-0.93) | serial x0.94-1.03, median paired incremental over the pool x0.89-1.04 per request; CPU pool+S3/pool x0.97-1.13 | verified exact unchanged on 24/24 scoped requests (24 request identities digest-equal to IG-S02) | PARTIAL: naked/hidden singles (3 finders, no checks) and the six naked/hidden pair/triple/quad finders (replayed checks); 17 other techniques (pointing, box/line, fish, wings, chains, cages, inequalities) stay native full scans; skipped scopes charging two or more virtual node checks covered by engine-free tests only; no naturally binding ceiling captured (boundary-injected only) | parity supported (SM4 sufficient for these families on this runtime: 18 saved puzzles x 4 solver sets equal, 770 injected failures equal in ordinal, site and error fields, four deliberate mutations detected, 0 audit violations); no material net gain demonstrated within the partial scope; full-S3 forecast untested/inconclusive (17 families and the cache overhead unmeasured; SM1 conditional scenarios are not ceilings) |
| S1 F0/F1/FC/FM/FU/FS: sample cost and yield kept apart | a hit-rate lever, not a speed lever: a near-constant per-sample cost, time per sample divided by about 1 (81 cells), 1.2 (144), 1.5-2 (multigrids), 3 (mega16) (report.md:35-36, 108); yield (p) unmeasured, decided by SM2 | native kinds, 8 grid clusters per cell: proposal-only and ordinary-only, 0 verified hits in 64 trials; 0 exact of 128 native samples (89 shallow) | six frontier variants x 4 cells x 8 clusters = 192 trials: 0 verified hits; budget-ended frontier trials per cell: classic9 0, mega12 0, mega16 12, samurai 1 | COST (separate from yield), F1 sample CPU over the equal-weight native mix of the same grids: classic9 x0.38 (F1/ordinary x0.25, F1/proposal x0.80); mega12 x0.28 (F1/ordinary x0.17, F1/proposal x0.83); mega16 x0.12 (F1/ordinary x0.07, F1/proposal x0.78); samurai x0.23 (F1/ordinary x0.15, F1/proposal x0.50). The near-constant-cost planning expectation was not observed for this prototype and cohort; the cheap work is attributable to unsuccessful, empty or above-band outcomes: classic9 16/16 empty unique frontiers, 0 above-band candidates; mega12 12/16 empty unique frontiers, 7 above-band candidates; mega16 2/16 empty unique frontiers, 24 above-band candidates, 2 count-budget stops; samurai 15/16 empty unique frontiers, 1 above-band candidates; no exact, shallow or below-band candidate in any cell. Equal weighting matches the observed ordinary/proposal counts of the four SM1 requests (48/48, 12/12, 24/24, 12/12; IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix | YIELD: 0 verified hits in every mode and cell, native controls included (rates and all 104 paired intervals: 104 degenerate, 0 [0, 0]); sample-origin 0, local-origin not measured (no local continuation in these trials). Cost per verified exact puzzle is unestablished (no hit to divide by) | two-sample grid trials on the pre-MS07 catalogue, reference solver, width 1; whole-request recovery and local search excluded; classic9, mega12, mega16, samurai only (wordoku, sohei, flower, butterfly: not measured); selection F1 is a non-winning diagnostic default in all four cells; held-out outcomes unmeasured; the S2 isolation is the next row | cost: F1 samples cost 0.38 / 0.28 / 0.12 / 0.23 of the native mix on classic9 / mega12 / mega16 / samurai, not the near-constant cost the planning expectation gave, and the cheap work belongs to unsuccessful, empty or above-band outcomes; yield: inconclusive (no demonstrated exact-yield benefit and no refutation: 0 hits include the native controls); cost per verified exact puzzle unestablished; separate problems kept apart (empty unique frontiers, shallow or above-band candidates, count-budget stops); formal gate not-evaluable-pre-freeze; no S1 drop and no S9 routing implied |
| S2 isolated: F0 versus F1 | S2 re-derivation early exit of removal tests: "a removal test costs a few deductions, not a solve" (plan.md:99), part of the S1 + S2 per-sample divisor (report.md:107-108) | F0 (frontier without the re-derivation): mean sample CPU ms classic9 27.19, mega12 115.38, mega16 524.56, samurai 211.88 | F1 (with the re-derivation), the same grids and samples: mean sample CPU ms classic9 29.00, mega12 128.88, mega16 528.25, samurai 224.63 | F1/F0 CPU, statistic: ratio of the mean sample CPU over the same samples of the same 8 grid clusters per cell (8 grid clusters (grid seeds 101-108), at most two samples per grid, the same grids and samples in F0 and F1, reference solver, width 1 (n = 16 samples per mode)): classic9 x1.07, mega12 x1.12, mega16 x1.01, samurai x1.06 (1.01-1.12); ratio of the cohort totals of ready CPU: classic9 x1.11, mega12 x1.14, mega16 x1.01, samurai x1.05; median of the 8 paired per-cluster ready-CPU ratios (min-max): classic9 x0.90 (0.49-4.00), mega12 x1.05 (0.78-1.89), mega16 x1.00 (0.91-1.20), samurai x0.99 (0.82-1.44) (dispersed at n = 8) | n/a (cost row); F0 and F1 take the same decisions in every cell (floor tests, candidates, outcomes equal): classic9 true, mega12 true, mega16 true, samurai true; 0 verified hits in both | paired population: 8 grid clusters (grid seeds 101-108), at most two samples per grid, the same grids and samples in F0 and F1, reference solver, width 1 (n = 16 samples per mode); KEPT SEPARATE: correctness and deduction-saving evidence (F1 accepted removals by re-derivation instead of a full proof: classic9 362 of 427 (84.8 %); mega12 662 of 736 (89.9 %); mega16 1170 of 1241 (94.3 %); samurai 2041 of 2128 (95.9 %); S2 audited on the IG-S04 pilot: 48 trials, 120 removals, 0 correctness problems); not generalised: whole requests, other cells, larger floors and the deduction-saving mechanism are not isolated here | no CPU saving on this cohort: F1/F0 CPU x1.01-1.12 (mean sample CPU, same 16 samples per cell); correctness and deduction-saving evidence is reported separately and is not contradicted by this; not generalised to "S2 never helps" |
| S5b composition | samples parallel; local continuation remains per attempt (never four lanes on a two-attempt board) | not measured | not measured | n/a | n/a | IG-S06 (held-out requests 201/202, N1/CA4/CQ1/CQ4, quota protocol) is DEFERRED for the pre-freeze round: no implementation, no run, no record; the full-request composition of S1/S2 with S5b is unmeasured | inconclusive: deferred, unmeasured (not passed, not refuted); see the frozen-rerun plan for when to implement and run it (after the frozen SM2 review and a separate budget approval) |
| SM1 shares | mega16 samples ~90 %, local ~10 %; G13 (samurai) ~72 % / ~28 %; mega12 83 %; classic9 ~53 % (a fitted component share) | nine profiled native requests, n = 1 per cell, instrumented wall (not the before/after timing evidence) | sample / local share of engine-root wall: mega16 90.5 % / 9.5 % (P 90 %, +0.5 points); mega12 83.5 % / 16.4 % (P 83 %, +0.5 points); samurai 72.8 % / 27.2 % (P 72 %, +0.8 points); classic9 60.3 % / 39.6 % (P 53 %, +7.3 points) | profile overhead (profiled / unprofiled ready wall) beside each cell in the report JSON; chains (`nishio`, `forcingChain`) about 81 % of the mega16 and 77 % of the mega12 profile (hotspots, not cacheability) | n/a (attribution); sample / local share of the Nightmare profiles without an anchor: killer:nightmare:3 57.9 % / 19.3 %; greaterThan:nightmare:3 57.0 % / 42.9 % | n = 1 per cell; Killer and Greater-Than have large non-finder shares (Killer DFS 45 %, Greater-Than local search own code 25 %); S3 scenarios are CONDITIONAL zero-cost figures, not full-S3 ceilings; frontier phase A per-finder wall unmeasured (counts and phase wall only); pre-MS07; observed 74-331 solves per ordinary sample in the four SM1 requests, so the plan's 1,296 solves per sample and its "10x fewer solves per sample" are withdrawn as representative costing and speed-up premises (section 7) | descriptive, no verdict (n = 1 per cell, no threshold is set by the pack): sample-share differences to the report in percentage points mega16 +0.5, mega12 +0.5, samurai +0.8, classic9 +7.3; Killer and Greater-Than have no sample/local anchor |
| SM3 Jigsaw 1111 | historical 325.313 s (I5 n = 20, one request); stage unknown | historical 325.313 s, uninstrumented, not remeasured (a 400 s command would break the 300 s ceiling) | censored at 240.015 s (guard 240 s), CPU at least 238.55 s, no puzzle; control seed 1100 ready-wall factor 1.16 (n = 1) | n/a: a censored lower bound is not a completed latency; cumulative full-grid contexts 99.5 % | n/a (no puzzle) | one instrumented request, censored by the 240 s Jigsaw guard; the instrumented run passed the 120 s application guard which does not establish uninstrumented latency; counters of the running search are in none of the completed counts; per-attempt counts unknown, not reconstructed; no safe ceiling inferred | supported as an attribution (full-grid search, Q07 option (b)), censored: lower bound 240.015 s; consistent with, not proof of, the historical 325 s being the same stage |
| Greater-Than Normal / Q16 | MS05e: 22.1 % of the Normal misses end at the clue floor (named trap); 95 % is a request-group cost, not a stage share | G0 (native sign pass), trace SUMMARY: Normal 20 pairs ready 41.30 s; Nightmare 6 of 10 pairs 51.95 s | G1 (sound-solve-first, first technique pass only): Normal 40.08 s; Nightmare 305.89 s | G0/G1 ratio of cohort totals: ready wall Normal 1.030, Nightmare 0.170; CPU (incl. startup and cleanup) Normal 1.034, Nightmare 0.214 (a value below 1 means G1 took longer) | verified exact samples per cohort: Normal 18 of 394, Nightmare 6 of 175 (the split is identical in G0 and G1: true); named trap 83/376 of Normal misses, 19/169 of Nightmare misses | trace SUMMARY cohort, never the trace-off headline; Normal 20/20 pairs, Nightmare 6/10 (a partial, budget-limited cohort: 706-709 UNSTARTED, eight rows; the recorded requests completed); 26/26 pairs identical (digests, ratings, sign decisions, semantic counters), no guard-binding difference; `counts.dfsEntries` in the records are countSolutions CALLS (erratum applied); probes: 15 executed group checks plus 15 reused rows; two singleton observer controls; no global G1 winner, no production adoption | named trap: 22.1 % of Normal misses end at the clue floor against 22.1 % in MS05e (descriptive, no threshold; minimality 83/83); the 95 % is the request-group share (94.3 % here) while the measured local-stage share is 71.3 %; G1: modest Normal benefit (x1.030), substantial Nightmare regression (x0.170, six pairs, a partial, budget-limited cohort: its recorded requests completed and eight rows were unstarted); no global winner (cohorts differ) and no production adoption |
| SM5 pool width sweep 1 / 2 / 4 | S5a in Node worker_threads with 1, 2 and 4 workers on mega12 and classic9 Nightmare: identical puzzles and wall time; decides the pool design and the message cost (plan.md:366) | not measured | not measured | n/a | n/a | UNMEASURED: no 1 / 2 / 4-width sweep exists for classic9 or mega12. IG-S02 compared the serial native run (width 1) with the pool at width min(4, A) on six cells and 3 seeds; the effective two-worker operation on the two-attempt boards (mega16, samurai) is not the missing width-two comparison on classic9 and mega12 | unmeasured (not passed, not refuted); added to the frozen proposal (D9, A7) and no run is authorised |
| Restricted-floor performance probes | restricted-floor (and prefix) probes of the new test costs: an accepted floor test, a refused floor test at each floor level, a DFS uniqueness check, a full solve (clarifications.md:186, 503; report.md:42, 136, 263) | not measured | not measured | n/a | n/a | UNMEASURED: no probe times these operations in isolation. The existing floor parity evidence (equal floor decisions of the equal-result checks and the F0/F1 comparison) is not that experiment; the frontier trials count floor tests and report a phase-A wall share, not a cost per operation kind | unmeasured (not passed, not refuted); added to the frozen proposal (D9, A7) and no run is authorised |

Verdict labels per aspect (the full rows are in the report JSON):

| row | verdicts |
|---|---|
| mega16 Nightmare | {"today":"descriptive-difference","s5a":"supported","partialS3":"no-material-net-gain-demonstrated","fullS3":"untested-inconclusive","firstPhases":"inconclusive","allPhases":"inconclusive"} |
| mega12 Nightmare | {"today":"descriptive-difference","s5a":"supported","partialS3":"no-material-net-gain-demonstrated","fullS3":"untested-inconclusive","firstPhases":"inconclusive","allPhases":"inconclusive"} |
| samurai Nightmare | {"today":"descriptive-difference","s5a":"supported","partialS3":"no-material-net-gain-demonstrated","fullS3":"untested-inconclusive","firstPhases":"inconclusive","allPhases":"inconclusive"} |
| classic9 Nightmare | {"today":"descriptive-difference","s5a":"supported","partialS3":"no-material-net-gain-demonstrated","fullS3":"untested-inconclusive","firstPhases":"inconclusive","allPhases":"inconclusive"} |
| Killer Nightmare | {"today":"descriptive-difference","s5a":"below-planning-range-on-all-observed-pairs","partialS3":"no-material-net-gain-demonstrated","fullS3":"untested-inconclusive","firstPhases":"inconclusive","allPhases":"inconclusive"} |
| Greater-Than Nightmare | {"today":"descriptive-difference","s5a":"inconclusive","partialS3":"no-material-net-gain-demonstrated","fullS3":"untested-inconclusive","firstPhases":"inconclusive","allPhases":"inconclusive"} |
| S5a width 4 | {"mega16":"supported","mega12":"supported","samurai":"supported","classic9":"supported","killer":"below-planning-range-on-all-observed-pairs","greaterThan":"inconclusive"} |
| Partial S3 | {"parity":"supported","partialScopeGain":"no-material-net-gain-demonstrated","fullS3":"untested-inconclusive"} |
| S1 F0/F1/FC/FM/FU/FS: sample cost and yield kept apart | {"sampleCost":"planning-expectation-not-observed","costPerVerifiedExactPuzzle":"unestablished","yield":"inconclusive"} |
| S2 isolated: F0 versus F1 | {"cpuSaving":"none-observed-on-this-cohort","correctnessAndDeductionSaving":"reported-separately","generalisation":"not-claimed"} |
| S5b composition | {"composition":"inconclusive"} |
| SM1 shares | {"descriptive":"no verdict; differences in percentage points beside each cell"} |
| SM3 Jigsaw 1111 | {"stageAttribution":"supported"} |
| Greater-Than Normal / Q16 | {"namedTrapShare":"descriptive-reproduced","requestGroupShare":"descriptive-reproduced","g1":"inconclusive"} |
| SM5 pool width sweep 1 / 2 / 4 | {"sweep":"unmeasured"} |
| Restricted-floor performance probes | {"probes":"unmeasured"} |

## 4. The six headline cells: paired per-seed rows, summaries and uncertainty (trace off, Nightmare, 3 paired seeds)

Cohort: IG-S02 (native-w1 against S5a attempts-w4) and IG-S03 (scoped solver: partial S3). Seconds. CPU is the host's process-wide CPU read once, startup, speculation and cleanup included. Ready = from engine-ready; cold = from worker start. n = 3: p95 is the observed maximum; the intervals are descriptive provisional ones with poor small-sample coverage.

### mega16 Nightmare (attempts 2)

| seed | native ready / cold / CPU | S5a ready / cold / CPU | S5a+S3 ready / CPU | serial S3 ready | S5a ready x | S5a CPU x | combined x | exact (native/S5a/S5a+S3) |
|---|---|---|---|---|---|---|---|---|
| 1 | 116.04 / 116.13 / 116.19 | 69.96 / 70.07 / 115.22 | 69.92 / 114.45 | not run | 1.66 | 0.99 | 1.66 | no / no / no |
| 2 | 102.69 / 102.77 / 103.03 | 52.41 / 52.51 / 101.31 | 51.79 / 102.97 | not run | 1.96 | 0.98 | 1.98 | no / no / no |
| 3 | 107.53 / 107.61 / 107.55 | 55.89 / 56.00 / 105.75 | 54.66 / 103.59 | 104.49 | 1.92 | 0.98 | 1.97 | no / no / no |

| arm | n | complete | ready p50 / max | cold p50 | CPU p50 / max | startup p50 ms | cleanup p50 ms | verified exact | hits / CPU s | hits / wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| native-w1 | 3 | 3 | 107.53 / 116.04 | 107.61 | 107.55 / 116.19 | 89.83 | 5.2 | 0 | 0.0000 | 0.0000 |
| attempts-w4 | 3 | 3 | 55.89 / 69.96 | 56.00 | 105.75 / 115.22 | 105.336 | 5.869 | 0 | 0.0000 | 0.0000 |
| scoped-attempts-w4 | 3 | 3 | 54.66 / 69.92 | 54.77 | 103.59 / 114.45 | 117.862 | 10.111 | 0 | 0.0000 | 0.0000 |
| scoped-native-w1 | 1 | 1 | 104.49 / 104.49 | 104.58 | 105.14 / 105.14 | 92.803 | 4.602 | 0 | 0.0000 | 0.0000 |

S5a ready-wall ratio of cohort totals 1.83, 95 % interval [1.66, 1.96] (one-sided lower bound 1.73); CPU ratio 0.99 [0.98, 0.99] (2,000 resamples of whole seed clusters, analysis seed 20261114; descriptive, n = 3). Full-request on-time exact fraction (verified exact and cold wall within 30 s): native 0/3 (lower bound 0.000), S5a 0/3 (0.000), S5a+S3 0/3 (0.000). With n = 3 the largest attainable lower bound is 0.368: this statistic cannot approach 0.5 on this cohort and corroborates nothing about feasibility.

Pool (S5a): width 2, peak active 2; attempts consumed 2/2/2, started 2/2/2 (the difference is discarded speculative work, its CPU is in the totals); speculative attempts completed 0; duplicated model build ms 2.587/2.558/2.574; requests above the 120 s application guard (native/pooled): {"native":0,"pooled":0} (a research observation, not an application pass).

### mega12 Nightmare (attempts 4)

| seed | native ready / cold / CPU | S5a ready / cold / CPU | S5a+S3 ready / CPU | serial S3 ready | S5a ready x | S5a CPU x | combined x | exact (native/S5a/S5a+S3) |
|---|---|---|---|---|---|---|---|---|
| 1 | 23.35 / 23.46 / 23.83 | 7.69 / 7.82 / 26.70 | 7.92 / 27.05 | not run | 3.04 | 1.12 | 2.95 | no / no / no |
| 2 | 22.71 / 22.79 / 23.30 | 7.06 / 7.18 / 26.31 | 6.80 / 25.63 | not run | 3.22 | 1.13 | 3.34 | no / no / no |
| 3 | 23.50 / 23.60 / 23.92 | 6.86 / 6.98 / 26.10 | 6.72 / 25.86 | 23.33 | 3.43 | 1.09 | 3.49 | no / no / no |

| arm | n | complete | ready p50 / max | cold p50 | CPU p50 / max | startup p50 ms | cleanup p50 ms | verified exact | hits / CPU s | hits / wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| native-w1 | 3 | 3 | 23.35 / 23.50 | 23.46 | 23.83 / 23.92 | 97.756 | 6.184 | 0 | 0.0000 | 0.0000 |
| attempts-w4 | 3 | 3 | 7.06 / 7.69 | 7.18 | 26.31 / 26.70 | 119.088 | 7.818 | 0 | 0.0000 | 0.0000 |
| scoped-attempts-w4 | 3 | 3 | 6.80 / 7.92 | 6.92 | 25.86 / 27.05 | 121.73 | 11.378 | 0 | 0.0000 | 0.0000 |
| scoped-native-w1 | 1 | 1 | 23.33 / 23.33 | 23.43 | 24.11 / 24.11 | 97.704 | 13.78 | 0 | 0.0000 | 0.0000 |

S5a ready-wall ratio of cohort totals 3.22, 95 % interval [3.04, 3.43] (one-sided lower bound 3.09); CPU ratio 1.11 [1.09, 1.13] (2,000 resamples of whole seed clusters, analysis seed 20261114; descriptive, n = 3). Full-request on-time exact fraction (verified exact and cold wall within 30 s): native 0/3 (lower bound 0.000), S5a 0/3 (0.000), S5a+S3 0/3 (0.000). With n = 3 the largest attainable lower bound is 0.368: this statistic cannot approach 0.5 on this cohort and corroborates nothing about feasibility.

Pool (S5a): width 4, peak active 4; attempts consumed 4/4/4, started 4/4/4 (the difference is discarded speculative work, its CPU is in the totals); speculative attempts completed 0; duplicated model build ms 7.789/6.193/6.472; requests above the 120 s application guard (native/pooled): {"native":0,"pooled":0} (a research observation, not an application pass).

### samurai Nightmare (attempts 2)

| seed | native ready / cold / CPU | S5a ready / cold / CPU | S5a+S3 ready / CPU | serial S3 ready | S5a ready x | S5a CPU x | combined x | exact (native/S5a/S5a+S3) |
|---|---|---|---|---|---|---|---|---|
| 1 | 26.53 / 26.62 / 27.14 | 14.83 / 14.93 / 28.23 | 14.53 / 28.39 | not run | 1.79 | 1.04 | 1.83 | no / no / no |
| 2 | 24.93 / 25.02 / 25.56 | 13.64 / 13.74 / 26.84 | 13.40 / 26.38 | not run | 1.83 | 1.05 | 1.86 | no / no / no |
| 42 | 21.70 / 21.78 / 22.39 | 12.79 / 12.90 / 22.53 | 13.02 / 23.13 | 21.40 | 1.70 | 1.01 | 1.67 | no / no / no |

| arm | n | complete | ready p50 / max | cold p50 | CPU p50 / max | startup p50 ms | cleanup p50 ms | verified exact | hits / CPU s | hits / wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| native-w1 | 3 | 3 | 24.93 / 26.53 | 25.02 | 25.56 / 27.14 | 86.62 | 3.123 | 0 | 0.0000 | 0.0000 |
| attempts-w4 | 3 | 3 | 13.64 / 14.83 | 13.74 | 26.84 / 28.23 | 102.729 | 6.211 | 0 | 0.0000 | 0.0000 |
| scoped-attempts-w4 | 3 | 3 | 13.40 / 14.53 | 13.51 | 26.38 / 28.39 | 112.646 | 13.665 | 0 | 0.0000 | 0.0000 |
| scoped-native-w1 | 1 | 1 | 21.40 / 21.40 | 21.50 | 22.33 / 22.33 | 94.011 | 11.226 | 0 | 0.0000 | 0.0000 |

S5a ready-wall ratio of cohort totals 1.77, 95 % interval [1.70, 1.83] (one-sided lower bound 1.73); CPU ratio 1.03 [1.01, 1.05] (2,000 resamples of whole seed clusters, analysis seed 20261114; descriptive, n = 3). Full-request on-time exact fraction (verified exact and cold wall within 30 s): native 0/3 (lower bound 0.000), S5a 0/3 (0.000), S5a+S3 0/3 (0.000). With n = 3 the largest attainable lower bound is 0.368: this statistic cannot approach 0.5 on this cohort and corroborates nothing about feasibility.

Pool (S5a): width 2, peak active 2; attempts consumed 2/2/2, started 2/2/2 (the difference is discarded speculative work, its CPU is in the totals); speculative attempts completed 0; duplicated model build ms 3.011/3.104/2.982; requests above the 120 s application guard (native/pooled): {"native":0,"pooled":0} (a research observation, not an application pass).

### classic9 Nightmare (attempts 8)

| seed | native ready / cold / CPU | S5a ready / cold / CPU | S5a+S3 ready / CPU | serial S3 ready | S5a ready x | S5a CPU x | combined x | exact (native/S5a/S5a+S3) |
|---|---|---|---|---|---|---|---|---|
| 1 | 4.98 / 5.07 / 5.64 | 1.55 / 1.67 / 8.19 | 1.71 / 9.23 | not run | 3.22 | 1.45 | 2.92 | no / no / no |
| 2 | 0.65 / 0.74 / 1.05 | 0.72 / 0.84 / 4.59 | 0.79 / 5.06 | not run | 0.91 | 4.39 | 0.83 | yes / yes / yes |
| 3 | 5.64 / 5.73 / 6.09 | 1.74 / 1.86 / 8.53 | 1.76 / 8.58 | 5.82 | 3.25 | 1.40 | 3.20 | no / no / no |

| arm | n | complete | ready p50 / max | cold p50 | CPU p50 / max | startup p50 ms | cleanup p50 ms | verified exact | hits / CPU s | hits / wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| native-w1 | 3 | 3 | 4.98 / 5.64 | 5.07 | 5.64 / 6.09 | 84.384 | 6.031 | 1 | 0.0782 | 0.0865 |
| attempts-w4 | 3 | 3 | 1.55 / 1.74 | 1.67 | 8.19 / 8.53 | 119.212 | 7.965 | 1 | 0.0469 | 0.2279 |
| scoped-attempts-w4 | 3 | 3 | 1.71 / 1.76 | 1.84 | 8.58 / 9.23 | 116.114 | 12.202 | 1 | 0.0437 | 0.2144 |
| scoped-native-w1 | 1 | 1 | 5.82 / 5.82 | 5.92 | 6.63 / 6.63 | 95.614 | 6.789 | 0 | 0.0000 | 0.0000 |

S5a ready-wall ratio of cohort totals 2.82, 95 % interval [0.91, 3.25] (one-sided lower bound 2.11); CPU ratio 1.67 [1.40, 4.39] (2,000 resamples of whole seed clusters, analysis seed 20261114; descriptive, n = 3). Full-request on-time exact fraction (verified exact and cold wall within 10 s): native 1/3 (lower bound 0.017), S5a 1/3 (0.017), S5a+S3 1/3 (0.017). With n = 3 the largest attainable lower bound is 0.368: this statistic cannot approach 0.5 on this cohort and corroborates nothing about feasibility.

Pool (S5a): width 4, peak active 4; attempts consumed 8/1/8, started 8/5/8 (the difference is discarded speculative work, its CPU is in the totals); speculative attempts completed 1; duplicated model build ms 7.375/1.514/8.81; requests above the 120 s application guard (native/pooled): {"native":0,"pooled":0} (a research observation, not an application pass).

### Killer Nightmare (attempts 8)

| seed | native ready / cold / CPU | S5a ready / cold / CPU | S5a+S3 ready / CPU | serial S3 ready | S5a ready x | S5a CPU x | combined x | exact (native/S5a/S5a+S3) |
|---|---|---|---|---|---|---|---|---|
| 1 | 18.00 / 18.09 / 19.30 | 7.06 / 7.18 / 23.45 | 7.21 / 24.80 | not run | 2.55 | 1.22 | 2.50 | no / no / no |
| 2 | 30.44 / 30.53 / 31.45 | 14.73 / 14.84 / 35.30 | 15.10 / 36.73 | not run | 2.07 | 1.12 | 2.02 | no / no / no |
| 3 | 21.11 / 21.20 / 22.16 | 7.97 / 8.08 / 25.23 | 8.46 / 27.77 | 22.40 | 2.65 | 1.14 | 2.50 | no / no / no |

| arm | n | complete | ready p50 / max | cold p50 | CPU p50 / max | startup p50 ms | cleanup p50 ms | verified exact | hits / CPU s | hits / wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| native-w1 | 3 | 3 | 21.11 / 30.44 | 21.20 | 22.16 / 31.45 | 85.765 | 12.482 | 0 | 0.0000 | 0.0000 |
| attempts-w4 | 3 | 3 | 7.97 / 14.73 | 8.08 | 25.23 / 35.30 | 110.845 | 16.867 | 0 | 0.0000 | 0.0000 |
| scoped-attempts-w4 | 3 | 3 | 8.46 / 15.10 | 8.58 | 27.77 / 36.73 | 123.42 | 24.613 | 0 | 0.0000 | 0.0000 |
| scoped-native-w1 | 1 | 1 | 22.40 / 22.40 | 22.50 | 23.92 / 23.92 | 95.734 | 8.916 | 0 | 0.0000 | 0.0000 |

S5a ready-wall ratio of cohort totals 2.34, 95 % interval [2.07, 2.65] (one-sided lower bound 2.16); CPU ratio 1.15 [1.12, 1.22] (2,000 resamples of whole seed clusters, analysis seed 20261114; descriptive, n = 3). Full-request on-time exact fraction (verified exact and cold wall within 10 s): native 0/3 (lower bound 0.000), S5a 0/3 (0.000), S5a+S3 0/3 (0.000). With n = 3 the largest attainable lower bound is 0.368: this statistic cannot approach 0.5 on this cohort and corroborates nothing about feasibility.

Pool (S5a): width 4, peak active 4; attempts consumed 8/8/8, started 8/8/8 (the difference is discarded speculative work, its CPU is in the totals); speculative attempts completed 0; duplicated model build ms 5.765/6.875/5.837; requests above the 120 s application guard (native/pooled): {"native":0,"pooled":0} (a research observation, not an application pass).

### Greater-Than Nightmare (attempts 8)

| seed | native ready / cold / CPU | S5a ready / cold / CPU | S5a+S3 ready / CPU | serial S3 ready | S5a ready x | S5a CPU x | combined x | exact (native/S5a/S5a+S3) |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.93 / 1.01 / 1.53 | 1.04 / 1.16 / 6.33 | 1.12 / 6.86 | not run | 0.89 | 4.13 | 0.83 | yes / yes / yes |
| 2 | 19.32 / 19.42 / 25.59 | 6.31 / 6.42 / 31.38 | 7.12 / 35.61 | not run | 3.06 | 1.23 | 2.72 | yes / yes / yes |
| 3 | 11.57 / 11.65 / 15.50 | 4.41 / 4.52 / 24.45 | 4.72 / 26.78 | 11.45 | 2.62 | 1.58 | 2.45 | yes / yes / yes |

| arm | n | complete | ready p50 / max | cold p50 | CPU p50 / max | startup p50 ms | cleanup p50 ms | verified exact | hits / CPU s | hits / wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| native-w1 | 3 | 3 | 11.57 / 19.32 | 11.65 | 15.50 / 25.59 | 88.169 | 20.129 | 3 | 0.0704 | 0.0933 |
| attempts-w4 | 3 | 3 | 4.41 / 6.31 | 4.52 | 24.45 / 31.38 | 108.116 | 72.307 | 3 | 0.0483 | 0.2405 |
| scoped-attempts-w4 | 3 | 3 | 4.72 / 7.12 | 4.85 | 26.78 / 35.61 | 124.333 | 89.016 | 3 | 0.0433 | 0.2201 |
| scoped-native-w1 | 1 | 1 | 11.45 / 11.45 | 11.55 | 15.50 / 15.50 | 90.298 | 18.474 | 1 | 0.0645 | 0.0865 |

S5a ready-wall ratio of cohort totals 2.70, 95 % interval [0.89, 3.06] (one-sided lower bound 2.07); CPU ratio 1.46 [1.23, 4.13] (2,000 resamples of whole seed clusters, analysis seed 20261114; descriptive, n = 3). Full-request on-time exact fraction (verified exact and cold wall within 10 s): native 1/3 (lower bound 0.017), S5a 3/3 (0.368), S5a+S3 3/3 (0.368). With n = 3 the largest attainable lower bound is 0.368: this statistic cannot approach 0.5 on this cohort and corroborates nothing about feasibility.

Pool (S5a): width 4, peak active 4; attempts consumed 1/6/4, started 5/8/8 (the difference is discarded speculative work, its CPU is in the totals); speculative attempts completed 3; duplicated model build ms 1.658/6.801/6.188; requests above the 120 s application guard (native/pooled): {"native":0,"pooled":0} (a research observation, not an application pass).

### S3: the implemented scope and its parity

PARTIAL S3 (naked/hidden singles and the six naked/hidden pair/triple/quad finders; 17 other techniques stay native full scans: pointing, cageCombo, ineqChain, boxLine, minMaxForcing, ruleOf45, xWing, simpleColouring, swordfish, cageSplit, jellyfish, xyWing, xyzWing, wWing, uniqueRectangle, forcingChain, nishio). Implemented finder coverage: nakedSingle, hiddenSingleBox, hiddenSingleLine, nakedPair, hiddenPair, nakedTriple, hiddenTriple, nakedQuad, hiddenQuad.

| finder | status | skipped scopes (audit) | virtual node checks (audit) |
|---|---|---|---|
| nakedSingle | proved + exercised (skipped scopes under audit) | 1268188 | 0 |
| hiddenSingleBox | proved + exercised (skipped scopes under audit) | 62625 | 0 |
| hiddenSingleLine | proved + exercised (skipped scopes under audit) | 62542 | 0 |
| nakedPair | proved + exercised (skipped scopes under audit) | 30582 | 63 |
| hiddenPair | proved + exercised (skipped scopes under audit) | 24582 | 76 |
| nakedTriple | proved + exercised (skipped scopes under audit) | 20222 | 226 |
| hiddenTriple | proved + exercised (skipped scopes under audit) | 18833 | 170 |
| nakedQuad | proved + exercised (skipped scopes under audit) | 14852 | 321 |
| hiddenQuad | proved + exercised (skipped scopes under audit) | 14679 | 284 |

Parity: 18 of 18 saved puzzles parity-ok (0 failed) in four solver sets (canonical: 18 puzzles, unlimited runs equal 18, 97457 checks audited, 191 of 191 injected failures equal; floor: 18 puzzles, unlimited runs equal 18, 96841 checks audited, 180 of 180 injected failures equal; oracle: 18 puzzles, unlimited runs equal 18, 108822 checks audited, 219 of 219 injected failures equal; proposal: 18 puzzles, unlimited runs equal 18, 29412 checks audited, 180 of 180 injected failures equal); synthetic cadence states pass (9 scenarios, 108 scopes crossing the cadence); four deliberate mutations detected; scope audit violations 0; request identity 24 of 24 digest-equal to IG-S02; SM4 sufficient for these families on this runtime, not a certification of the frozen source; multi-check skipped scopes are covered by engine-free tests only.

## 5. SM2: the frontier variants F0/F1/FC/FM/FU/FS and both native controls (two-sample grid trials, 8 clusters per cell)

two-sample grid trials (grid seeds 101-108, at most two native-fork samples per grid, no local continuation, reference solver, width 1); NOT a whole request; per-sample cost and yield only

### classic9

| mode | trials | verified hits | ready CPU s | ready wall s | hits/CPU s | budget-ended | mean sample CPU ms | empty frontier | floor tests | refused (ambiguous / stuck unique) | DFS entries | canonical rated | cand. exact/shallow/below/above | phase-A wall share |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| proposal-only | 8 | 0 | 0.658 | 0.296 | 0.0000 | 0 | 36.13 | n/a | 1097 tried | n/a | n/a | 16 | 0/2/14/0 (samples) | n/a |
| ordinary-only | 8 | 0 | 2.062 | 1.006 | 0.0000 | 0 | 116.06 | n/a | 1097 tried | n/a | n/a | 16 | 0/2/14/0 (samples) | n/a |
| F0 | 8 | 0 | 0.562 | 0.266 | 0.0000 | 0 | 27.19 | 16 | 656 | 229 / 0 | 1300 | 0 | 0/0/0/0 | 92.5 % |
| F1 | 8 | 0 | 0.622 | 0.292 | 0.0000 | 0 | 29.00 | 16 | 656 | 229 / 0 | 1300 | 0 | 0/0/0/0 | 92.4 % |
| FC | 8 | 0 | 0.499 | 0.261 | 0.0000 | 0 | 24.44 | 16 | 656 | 229 / 0 | 1300 | 0 | 0/0/0/0 | 92.5 % |
| FM | 8 | 0 | 0.875 | 0.317 | 0.0000 | 0 | 45.88 | 16 | 656 | 229 / 0 | 1300 | 0 | 0/0/0/0 | 94.8 % |
| FU | 8 | 0 | 0.671 | 0.275 | 0.0000 | 0 | 27.25 | 16 | 656 | 229 / 0 | 1300 | 0 | 0/0/0/0 | 92.8 % |
| FS | 8 | 0 | 0.624 | 0.264 | 0.0000 | 0 | 21.56 | 16 | 656 | 229 / 0 | 1300 | 0 | 0/0/0/0 | 92.5 % |

F1 mean sample CPU 29.00 ms against ordinary 116.06 ms (x0.25) and proposal 36.13 ms (x0.80); equal-weight mix x0.38 (Derived: ratios of the mean sample CPU of the same grids. Equal weighting of the ordinary and the proposal sample matches the observed ordinary/proposal counts of the four SM1 requests (IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix). Selection: F1 (explicitly non-winning diagnostic default, all-zero-verified-hits). Finding: inconclusive (every rate is zero in this cell: no verified hit in any mode)

### mega12

| mode | trials | verified hits | ready CPU s | ready wall s | hits/CPU s | budget-ended | mean sample CPU ms | empty frontier | floor tests | refused (ambiguous / stuck unique) | DFS entries | canonical rated | cand. exact/shallow/below/above | phase-A wall share |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| proposal-only | 8 | 0 | 2.658 | 1.146 | 0.0000 | 0 | 154.44 | n/a | 2051 tried | n/a | n/a | 43 | 0/16/0/0 (samples) | n/a |
| ordinary-only | 8 | 0 | 12.363 | 10.063 | 0.0000 | 0 | 760.88 | n/a | 2002 tried | n/a | n/a | 16 | 0/14/2/0 (samples) | n/a |
| F0 | 8 | 0 | 1.972 | 0.900 | 0.0000 | 0 | 115.38 | 12 | 1196 | 409 / 51 | 5445 | 7 | 0/0/0/7 | 58.9 % |
| F1 | 8 | 0 | 2.248 | 0.888 | 0.0000 | 0 | 128.88 | 12 | 1196 | 409 / 51 | 5445 | 7 | 0/0/0/7 | 58.1 % |
| FC | 8 | 0 | 7.342 | 5.817 | 0.0000 | 0 | 444.31 | 4 | 1152 | 391 / 30 | 5124 | 16 | 0/5/1/10 | 5.0 % |
| FM | 8 | 0 | 2.173 | 0.948 | 0.0000 | 0 | 123.06 | 5 | 1152 | 397 / 23 | 5451 | 13 | 0/7/0/6 | 48.9 % |
| FU | 8 | 0 | 2.003 | 0.945 | 0.0000 | 0 | 113.25 | 12 | 1196 | 409 / 51 | 5445 | 7 | 0/0/0/7 | 54.5 % |
| FS | 8 | 0 | 2.297 | 0.931 | 0.0000 | 0 | 132.81 | 12 | 1196 | 409 / 51 | 5445 | 7 | 0/0/0/7 | 59.3 % |

F1 mean sample CPU 128.88 ms against ordinary 760.88 ms (x0.17) and proposal 154.44 ms (x0.83); equal-weight mix x0.28 (Derived: ratios of the mean sample CPU of the same grids. Equal weighting of the ordinary and the proposal sample matches the observed ordinary/proposal counts of the four SM1 requests (IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix). Selection: F1 (explicitly non-winning diagnostic default, all-zero-verified-hits). Finding: inconclusive (every rate is zero in this cell: no verified hit in any mode)

### mega16

| mode | trials | verified hits | ready CPU s | ready wall s | hits/CPU s | budget-ended | mean sample CPU ms | empty frontier | floor tests | refused (ambiguous / stuck unique) | DFS entries | canonical rated | cand. exact/shallow/below/above | phase-A wall share |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| proposal-only | 8 | 0 | 11.231 | 8.497 | 0.0000 | 0 | 673.81 | n/a | 2472 tried | n/a | n/a | 92 | 0/16/0/0 (samples) | n/a |
| ordinary-only | 8 | 0 | 125.764 | 123.584 | 0.0000 | 0 | 7847.75 | n/a | 2416 tried | n/a | n/a | 16 | 0/16/0/0 (samples) | n/a |
| F0 | 8 | 0 | 8.611 | 6.341 | 0.0000 | 2 | 524.56 | 2 | 2222 | 762 / 217 | 176909 | 24 | 0/0/0/24 | 51.9 % |
| F1 | 8 | 0 | 8.735 | 6.346 | 0.0000 | 2 | 528.25 | 2 | 2222 | 762 / 217 | 176909 | 24 | 0/0/0/24 | 52.0 % |
| FC | 8 | 0 | 12.280 | 9.874 | 0.0000 | 2 | 750.88 | 0 | 2045 | 684 / 129 | 145622 | 55 | 0/12/1/42 | 18.9 % |
| FM | 8 | 0 | 9.498 | 6.831 | 0.0000 | 2 | 574.19 | 0 | 2035 | 675 / 125 | 148146 | 48 | 0/10/0/38 | 34.9 % |
| FU | 8 | 0 | 9.122 | 6.514 | 0.0000 | 2 | 552.69 | 2 | 2222 | 762 / 217 | 176909 | 24 | 0/0/0/24 | 50.9 % |
| FS | 8 | 0 | 9.765 | 7.039 | 0.0000 | 2 | 587.00 | 2 | 2222 | 762 / 217 | 176711 | 29 | 0/0/0/29 | 46.9 % |

F1 mean sample CPU 528.25 ms against ordinary 7847.75 ms (x0.07) and proposal 673.81 ms (x0.78); equal-weight mix x0.12 (Derived: ratios of the mean sample CPU of the same grids. Equal weighting of the ordinary and the proposal sample matches the observed ordinary/proposal counts of the four SM1 requests (IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix). Selection: F1 (explicitly non-winning diagnostic default, all-zero-verified-hits). Finding: inconclusive (every rate is zero in this cell: no verified hit in any mode)

### samurai

| mode | trials | verified hits | ready CPU s | ready wall s | hits/CPU s | budget-ended | mean sample CPU ms | empty frontier | floor tests | refused (ambiguous / stuck unique) | DFS entries | canonical rated | cand. exact/shallow/below/above | phase-A wall share |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| proposal-only | 8 | 0 | 7.532 | 4.912 | 0.0000 | 0 | 449.38 | n/a | 5262 tried | n/a | n/a | 64 | 0/13/3/0 (samples) | n/a |
| ordinary-only | 8 | 0 | 23.812 | 20.477 | 0.0000 | 0 | 1467.69 | n/a | 5204 tried | n/a | n/a | 16 | 0/10/5/1 (samples) | n/a |
| F0 | 8 | 0 | 3.781 | 1.912 | 0.0000 | 0 | 211.88 | 15 | 2996 | 831 / 37 | 9662 | 1 | 0/0/0/1 | 88.3 % |
| F1 | 8 | 0 | 3.953 | 1.804 | 0.0000 | 0 | 224.63 | 15 | 2996 | 831 / 37 | 9662 | 1 | 0/0/0/1 | 87.7 % |
| FC | 8 | 0 | 5.640 | 3.247 | 0.0000 | 0 | 332.88 | 2 | 2960 | 816 / 26 | 9476 | 11 | 0/7/1/3 | 33.5 % |
| FM | 8 | 0 | 5.139 | 2.933 | 0.0000 | 1 | 292.88 | 3 | 2949 | 816 / 21 | 12430 | 15 | 0/9/0/6 | 61.3 % |
| FU | 8 | 0 | 3.903 | 1.862 | 0.0000 | 0 | 221.63 | 15 | 2996 | 831 / 37 | 9662 | 1 | 0/0/0/1 | 87.1 % |
| FS | 8 | 0 | 3.580 | 1.846 | 0.0000 | 0 | 206.13 | 15 | 2996 | 831 / 37 | 9662 | 1 | 0/0/0/1 | 87.7 % |

F1 mean sample CPU 224.63 ms against ordinary 1467.69 ms (x0.15) and proposal 449.38 ms (x0.50); equal-weight mix x0.23 (Derived: ratios of the mean sample CPU of the same grids. Equal weighting of the ordinary and the proposal sample matches the observed ordinary/proposal counts of the four SM1 requests (IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix). Selection: F1 (explicitly non-winning diagnostic default, all-zero-verified-hits). Finding: inconclusive (every rate is zero in this cell: no verified hit in any mode)

**S1: sample cost and yield, kept apart.** Cost: F1 sample CPU over the equal-weight native mix of the same grids is classic9 x0.38, mega12 x0.28, mega16 x0.12, samurai x0.23. The planning expectation was a near-constant per-sample cost (report.md:35-36, 108); it was not observed for this prototype and cohort. The cheap work is attributable to unsuccessful, empty or above-band outcomes; yield is a separate question and remains inconclusive.

| cell | F1 mean sample CPU ms | equal-weight mix ms | F1 / mix | planning expectation (divisor) | samples | empty unique frontier | exact / shallow / below candidates | above-band candidates | count-budget stops | verified hits (F1 / all modes) | cost per verified exact puzzle |
|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | 29.00 | 76.10 | 0.38 | 1 (81 cells) | 16 | 16 | 0 / 0 / 0 | 0 | 0 | 0 / 0 | unestablished (no verified hit) |
| mega12 | 128.88 | 457.66 | 0.28 | 1.2 (144 cells) | 16 | 12 | 0 / 0 / 0 | 7 | 0 | 0 / 0 | unestablished (no verified hit) |
| mega16 | 528.25 | 4260.78 | 0.12 | 3 (mega16) | 16 | 2 | 0 / 0 / 0 | 24 | 2 | 0 / 0 | unestablished (no verified hit) |
| samurai | 224.63 | 958.54 | 0.23 | 1.5-2 (multigrids) | 16 | 15 | 0 / 0 / 0 | 1 | 0 | 0 / 0 | unestablished (no verified hit) |

Native sample mix: Derived: ratios of the mean sample CPU of the same grids. Equal weighting of the ordinary and the proposal sample matches the observed ordinary/proposal counts of the four SM1 requests (IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix. Observed in the profiled SM1 requests (ordinary / proposal samples): classic9:nightmare:3 48 / 48; mega16:nightmare:3 12 / 12; mega12:nightmare:3 24 / 24; samurai:nightmare:42 12 / 12; killer:nightmare:3 48 / 48; greaterThan:nightmare:3 18 / 19.

**S2 isolated: F0 versus F1.** Statistic: the ratio of the mean sample CPU of F1 over F0 on the same samples; paired population: 8 grid clusters (grid seeds 101-108), at most two samples per grid, the same grids and samples in F0 and F1, reference solver, width 1 (n = 16 samples per mode). F1/F0 CPU is 1.01-1.12: no CPU saving on this cohort. Correctness and deduction-saving evidence is reported separately and the result is not generalised to "S2 never helps".

| cell | F0 mean sample CPU ms | F1 mean sample CPU ms | F1 / F0 (mean sample CPU) | F1 / F0 (ready CPU, cluster totals) | paired per-cluster ready-CPU ratio: median (min-max) | same decisions in F0 and F1 | F1 accepted by re-derivation / all accepted | F0 accepted by full proof |
|---|---|---|---|---|---|---|---|---|
| classic9 | 27.19 | 29.00 | 1.067 | 1.107 | 0.90 (0.49-4.00) | true | 362 / 427 (84.8 %) | 427 |
| mega12 | 115.38 | 128.88 | 1.117 | 1.140 | 1.05 (0.78-1.89) | true | 662 / 736 (89.9 %) | 736 |
| mega16 | 524.56 | 528.25 | 1.007 | 1.014 | 1.00 (0.91-1.20) | true | 1170 / 1241 (94.3 %) | 1241 |
| samurai | 211.88 | 224.63 | 1.060 | 1.045 | 0.99 (0.82-1.44) | true | 2041 / 2128 (95.9 %) | 2128 |

Outcomes over 256 trials: {"complete":243,"budgetEnded":13,"censored":0,"errors":0}; verified hits 0. Intervals: all paired intervals are 0 [0, 0] over whole grid clusters: degenerate, not evidence of equivalence or non-inferiority (104 of 104 rows). S2 audit (pilot): {"trialsAudited":48,"acceptedRemovals":3388,"rederivedRemovals":2652,"auditedRemovals":120,"operationalDisagreements":0,"correctnessProblems":0}. Held-out: unmeasured: IG-S06 (held-out request seeds 201/202, native versus the selected frontier) is deferred.

Pilot (IG-S04, a separate dataset: IG-S04 pilot: grid seeds 11 and 12, one sample per trial, 64 trials, the dataset that fitted the count budgets; kept apart from the screen) budgets frozen as hash f0a0c42203276525: mega16 fitted, samurai fitted, classic9 fitted, mega12 fitted. Two-grid fits are experimental limits, not tail guarantees.

- the intervals come from eight whole grid clusters per cell and are descriptive provisional ones with poor small-sample coverage, not lower-confidence guarantees
- a per-sample rate is not extrapolated to an unqualified 90% request claim; two-grid budget fits are experimental limits, not tail guarantees
- the zero-baseline feasibility threshold (the lower-bound rate projecting to half of the requests inside the budget at width 4) is projection-awaits-author-review, never evaluated here
- F0/F1 is the isolated S2 comparison, FC/FM/F1 the floor choices, FU/F1 the uniqueness filter, FS/F1 the reference-parent choice; the gains are correlated and are not multiplied
- the final phase A parent classification is a post-timing diagnostic: it never steers generation and never enters a hit count
- unreached keys are unstarted/inconclusive: they are not zero-cost trials and not censored observations

## 6. Composition (IG-S06): deferred, unmeasured

- IG-S06 (held-out requests 201/202, N1/CA4/CQ1/CQ4, the ordered quota protocol) is DEFERRED for this pre-freeze round: not implemented, not run, no records. It is neither passed nor refuted.
- Why: IG-S05 found 0 verified exact hits in every mode (native controls included) on eight grid clusters per cell; F1 is an explicitly non-winning diagnostic default (selection.json), not a selected strategy to compose; the catalogue, floors and search may change when difficulty-v3 freezes (MS07).
- Unmeasured as a result: the full-request composition of S1/S2 with S5b; the frontier request cost; local-origin hits of the frontier; the quota protocol; large-board CQ1 equality.
- The 24-minute allocation was not run and is not an automatic transfer or a spending target; the 180-minute ceiling and difficulty-v3 priority stay.
- Proposal: implement and run IG-S06 only after the frozen IG-S05 review by the plan author (Fable) and the pack author (Astra) and after a separate budget approval (the frozen-rerun plan, section ig06: populations, formula and planning scenarios).

## 7. SM1: stage and finder profiles (n = 1 per cell, instrumented; attribution, not timing evidence)

nine profiled native requests (n = 1 per cell, instrumented wall) and three unprofiled controls; attribution, not the before/after figure; the zero-cost scenarios are CONDITIONAL, not full-S3 ceilings (a cache costs lookups and invalidation; neither is measured)

| request | sample share | local share | other | solver / root | covered finders / root | remaining finders / root | chain group / root | no covered-finder time | no negative calls (covered) | no negative calls (remaining; w/o chains) | measured partial S3 serial | profile / unprofiled ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| c9 classic9:nightmare:3 | 60.3 % | 39.6 % | 0.1 % | 72.7 % | 5.2 % | 64.3 % | 55.3 % | 1.055 | 1.040 | 1.865 (1.092) | 0.970 | 1.027 |
| m16 mega16:nightmare:3 | 90.5 % | 9.5 % | 0.0 % | 98.1 % | 3.9 % | 93.9 % | 81.4 % | 1.040 | 1.038 | 1.678 (1.140) | 1.029 | 0.992 |
| m12 mega12:nightmare:3 | 83.5 % | 16.4 % | 0.0 % | 96.7 % | 5.4 % | 90.1 % | 76.6 % | 1.057 | 1.049 | 2.360 (1.150) | 1.007 | 1.038 |
| sam samurai:nightmare:42 | 72.8 % | 27.2 % | 0.1 % | 92.8 % | 12.7 % | 76.7 % | 52.6 % | 1.145 | 1.101 | 1.841 (1.298) | 1.014 | 1.034 |
| killer-n killer:nightmare:3 | 57.9 % | 19.3 % | 22.8 % | 47.5 % | 8.5 % | 34.5 % | 17.1 % | 1.093 | 1.075 | 1.168 (1.084) | 0.943 | 1.053 |
| gt-n greaterThan:nightmare:3 | 57.0 % | 42.9 % | 0.1 % | 48.1 % | 7.3 % | 38.4 % | 24.2 % | 1.079 | 1.065 | 1.252 (1.129) | 1.010 | 1.075 |
| killer-h killer:hard:1 | 50.5 % | 19.2 % | 30.3 % | 47.8 % | 15.4 % | 19.0 % | 0.0 % | 1.182 | 1.127 | 1.088 (1.088) | no row | 1.143 |
| killer-e killer:expert:1 | 34.4 % | 10.3 % | 55.3 % | 64.9 % | 15.3 % | 41.5 % | 6.9 % | 1.181 | 1.146 | 1.165 (1.107) | no row | 1.096 |
| gt-normal greaterThan:normal:300 | 27.5 % | 72.1 % | 0.4 % | 15.2 % | 6.6 % | 4.4 % | 0.0 % | 1.071 | 1.026 | 1.020 (1.020) | no row | 1.022 |

Scenario columns are CONDITIONAL zero-cost figures of one profiled run (the named wall time set to zero), not ceilings of a full S3. solver-check totals are inexact (loop-check boundaries; chain propagation checks bypass ctx.check); the loop check on the real engine passed 13/13.

- classic9 nightmare 3: the covered finders take 5.2 % of the profiled request (3.9 % in negative calls) and the remaining finders 64.3 % (46.4 % in negative calls; the chain group alone 55.3 %). Scenarios: no covered-finder time 1.054x, no negative calls of the covered finders 1.040x (the measured partial S3 of this request: 0.970x); no negative calls of the remaining finders 1.865x (without the chain group 1.092x).
- mega16 nightmare 3: the covered finders take 3.9 % of the profiled request (3.6 % in negative calls) and the remaining finders 93.9 % (40.4 % in negative calls; the chain group alone 81.4 %). Scenarios: no covered-finder time 1.040x, no negative calls of the covered finders 1.038x (the measured partial S3 of this request: 1.029x); no negative calls of the remaining finders 1.678x (without the chain group 1.140x).
- mega12 nightmare 3: the covered finders take 5.4 % of the profiled request (4.7 % in negative calls) and the remaining finders 90.1 % (57.6 % in negative calls; the chain group alone 76.6 %). Scenarios: no covered-finder time 1.057x, no negative calls of the covered finders 1.049x (the measured partial S3 of this request: 1.007x); no negative calls of the remaining finders 2.360x (without the chain group 1.150x).
- samurai nightmare 42: the covered finders take 12.7 % of the profiled request (9.1 % in negative calls) and the remaining finders 76.7 % (45.7 % in negative calls; the chain group alone 52.6 %). Scenarios: no covered-finder time 1.145x, no negative calls of the covered finders 1.101x (the measured partial S3 of this request: 1.014x); no negative calls of the remaining finders 1.841x (without the chain group 1.298x).
- killer nightmare 3: the covered finders take 8.5 % of the profiled request (7.0 % in negative calls) and the remaining finders 34.5 % (14.3 % in negative calls; the chain group alone 17.1 %). Scenarios: no covered-finder time 1.093x, no negative calls of the covered finders 1.075x (the measured partial S3 of this request: 0.943x); no negative calls of the remaining finders 1.167x (without the chain group 1.084x).
- greaterThan nightmare 3: the covered finders take 7.3 % of the profiled request (6.1 % in negative calls) and the remaining finders 38.4 % (20.1 % in negative calls; the chain group alone 24.2 %). Scenarios: no covered-finder time 1.079x, no negative calls of the covered finders 1.065x (the measured partial S3 of this request: 1.010x); no negative calls of the remaining finders 1.252x (without the chain group 1.129x).
- killer hard 1: the covered finders take 15.4 % of the profiled request (11.3 % in negative calls) and the remaining finders 19.0 % (8.1 % in negative calls; the chain group alone 0.0 %). Scenarios: no covered-finder time 1.181x, no negative calls of the covered finders 1.127x (the measured partial S3 of this request: no row); no negative calls of the remaining finders 1.088x (without the chain group 1.088x).
- killer expert 1: the covered finders take 15.3 % of the profiled request (12.8 % in negative calls) and the remaining finders 41.4 % (14.2 % in negative calls; the chain group alone 6.9 %). Scenarios: no covered-finder time 1.181x, no negative calls of the covered finders 1.146x (the measured partial S3 of this request: no row); no negative calls of the remaining finders 1.165x (without the chain group 1.107x).
- greaterThan normal 300: the covered finders take 6.6 % of the profiled request (2.5 % in negative calls) and the remaining finders 4.3 % (1.9 % in negative calls; the chain group alone 0.0 %). Scenarios: no covered-finder time 1.071x, no negative calls of the covered finders 1.026x (the measured partial S3 of this request: no row); no negative calls of the remaining finders 1.020x (without the chain group 1.020x).
- These are conditional zero-cost scenarios of one profiled run, not ceilings of a full S3: a call that returns a Finding can also skip cached negative scopes, and a cache costs lookups and invalidation; neither is measured here. What the profile does support is attribution: where the finder time sits (covered against remaining, and the chain group), and that a change confined to the covered finders cannot save more than their time. How much of the remaining finders' time a full S3 could skip needs per-scope data (what a call scanned, what invalidated it); nothing is extrapolated from the partial S3 to the other finders, to chains or to the cap behaviour.

**Costing premises withdrawn** (withdrawn as representative costing and speed-up premises): the plan's "about 1,296 solves per sample for every board" (G x B(N), plan.md:67); the plan's "10x fewer solves per sample" from S1 (plan.md:98) and the 10 / 2 / 3 factors of the mega16 projection (plan.md:350). SM1 observed (mean solves per ordinary sample, the four SM1 requests): classic9:nightmare:3 73.52, mega16:nightmare:3 152.75, mega12:nightmare:3 127.04, samurai:nightmare:42 330.50 (about 74-331; source IG-S07/summary-r2.md lines 78-88 (mean solves per ordinary sample, the four SM1 requests)). A lower observed count does not refute a mathematical upper bound: G x B(N) may be kept only as a separately justified loose bound, not as typical work and not as an empirical 10x prediction. Affected passages: plan.md (joint plan) 67, 74, 98, 154, 338, 350; report.md (joint report) 27.

## 8. SM3: bounded attribution of the Jigsaw Expert seed-1111 tail (censored)

Jigsaw Expert seed 1111, one instrumented request under the 240 s Jigsaw guard: a CENSORED lower bound, not a completed latency, not an uncensored 325 s rerun, and no evidence that any S7 ceiling is safe

| item | value |
|---|---|
| historical (uninstrumented, not remeasured) | 325.313 s (I5 (n = 20 Jigsaw Expert requests in the report)) |
| this run | request-timeout (censored true, completed false) |
| wall lower bound / guard | 240.015 s / 240 s (jigsaw) |
| CPU lower bound | 238.55 s |
| control seed 1100 | IG-S08/control/jigsaw9:expert:1100/unprofiled, identity true, ready-wall factor 1.16 (n = 1), engine checks 28/28 |

| stage | wall lower bound ms | share |
|---|---|---|
| outside | 5.41 | 0.0 % |
| configure | 0.39 | 0.0 % |
| buildModel | 37.74 | 0.0 % |
| fullGrid | 238776.64 | 99.5 % |
| extraStructure | 0.20 | 0.0 % |
| dig | 270.27 | 0.1 % |
| rate | 11.16 | 0.0 % |
| tune | 0.48 | 0.0 % |
| local | 774.78 | 0.3 % |

the tail points at the full-grid search (Q07 option (b): versioned total-work or restart limits and an explicit "unknown" outcome), not at buildJigsaw, the safety count, rating or local search; consistent with, not proof of, the historical 325 s being the same stage; no ceiling is sized from one censored request

- Context fullGrid points at the full-grid search (generate: unlimited last search after the 50th restart; restarts keep forking `grid#a.k`): the ceiling on total restarts or work of IG-S-Q07 option (b).
- What this one request offers for sizing a count-based full-grid ceiling, with its scope: 3 finished full-grid stage(s) took 0.32 s in total (the longest 0.20 s); the open stage alone was observed for at least 238.46 s, its unlimited last search for at least 238.18 s; the depth-first counts (84717442 nodes, 176221059 backtracks) are cumulative over ALL 4 full-grid stage entries and come from the instrumented search, and 111 searches had COMPLETED (the running one is not counted); no per-attempt node, backtrack or restart count exists. A single request gives no distribution per successful full-grid attempt, so no ceiling can be sized from it.
- The instrumented observation ran past 120 s without finishing. That does not establish this source's uninstrumented latency: the observation's overhead was measured once, on a different request (seed 1100, n = 1), and estimated from a micro-benchmark, and the tail's uninstrumented throughput was not measured. The historical uninstrumented 325.313 s (I5) is a separate risk statement, not re-established here. What either implies for the application's 120 s guard is not decided by this run.
- The request was censored at 240.00 s (request): this is a lower bound. It does not show how long the request takes, that the observed stage is the only expensive one, or that any particular S7 ceiling is safe or sufficient.
- No ceiling is chosen or tested here. A ceiling and its reaction need the separately designed experiment the task file names, after the frozen catalogue (MS07).
Unknown counters (never zero): solverBudgetChecks: not instrumented: the totals of the solver's budget checks are not counted (the request passes no external budget, but the digger's internal budgets, such as the stage B objective step guard and the uniqueness-count node slices, issue checks); the propagation checks of the chain finders bypass ctx.check in any case (IG-S07 limitation); constraintPropagationOperations: no counter exists in the private source; the time is part of the cell of the caller (the logical solver's own code, a finder or the depth-first search); findingApplicationTime: part of the logical solver's own code (sub solver), not separated from the ladder loop; perCallTimeOfOracleObjectiveKeeperLocal: wall time and call counts are kept per context, not per individual call.

## 9. Greater-Than: exact miss split and physical work (IG-S09)

Greater-Than, TRACE SUMMARY (the historical diagnostic population), not the trace-off headline: Normal seeds 300-319 (20 pairs) and Nightmare seeds 700-709 (6 of 10 pairs; 706-709 UNSTARTED); G0 native first-allowed sign pass, G1 sound-solve-first in the first technique pass only; separate cohorts; no global G1 winner; no production adoption

### normal (20 of 20 pairs)

| seed | G0 ready s | G1 ready s | G0 CPU s | G1 CPU s | ready G0/G1 | CPU G0/G1 | exact G0/G1 |
|---|---|---|---|---|---|---|---|
| 300 | 2.10 | 1.98 | 3.61 | 3.22 | 1.062 | 1.122 | yes / yes |
| 301 | 0.08 | 0.07 | 0.28 | 0.24 | 1.041 | 1.196 | yes / yes |
| 302 | 0.30 | 0.25 | 0.83 | 0.59 | 1.192 | 1.395 | yes / yes |
| 303 | 3.76 | 3.67 | 6.03 | 6.11 | 1.024 | 0.987 | yes / yes |
| 304 | 0.27 | 0.23 | 0.58 | 0.55 | 1.161 | 1.057 | yes / yes |
| 305 | 0.10 | 0.09 | 0.39 | 0.30 | 1.123 | 1.313 | yes / yes |
| 306 | 0.27 | 0.22 | 0.61 | 0.59 | 1.222 | 1.027 | yes / yes |
| 307 | 0.23 | 0.19 | 0.69 | 0.50 | 1.218 | 1.374 | yes / yes |
| 308 | 4.97 | 5.04 | 8.41 | 8.52 | 0.986 | 0.987 | yes / yes |
| 309 | 2.05 | 2.11 | 3.55 | 3.28 | 0.970 | 1.081 | yes / yes |
| 310 | 7.49 | 6.89 | 12.70 | 11.69 | 1.087 | 1.087 | yes / yes |
| 311 | 0.13 | 0.11 | 0.45 | 0.36 | 1.123 | 1.265 | yes / yes |
| 312 | 0.21 | 0.18 | 0.56 | 0.42 | 1.182 | 1.331 | yes / yes |
| 313 | 3.86 | 3.83 | 5.92 | 6.27 | 1.006 | 0.945 | yes / yes |
| 314 | 0.39 | 0.35 | 0.70 | 0.72 | 1.136 | 0.978 | yes / yes |
| 315 | 3.78 | 3.91 | 6.34 | 6.33 | 0.967 | 1.002 | yes / yes |
| 316 | 3.89 | 3.59 | 6.39 | 5.41 | 1.083 | 1.182 | yes / yes |
| 317 | 1.69 | 1.74 | 2.92 | 3.08 | 0.970 | 0.949 | yes / yes |
| 318 | 5.32 | 5.25 | 8.45 | 9.19 | 1.014 | 0.920 | yes / yes |
| 319 | 0.41 | 0.36 | 0.97 | 0.70 | 1.115 | 1.378 | yes / yes |

Ratio of cohort totals (G0 / G1; below 1 means G1 took longer): ready wall 1.030 [1.002, 1.061], CPU 1.034 [0.988, 1.091] (descriptive, whole pairs resampled); paired median ready ratio 1.083.

Miss split (identical in G0 and G1): {"exact":18,"shallow":21,"above-or-unrated":0,"below-trap":83,"below-tune":85,"below-setup2":187,"other-below":0,"unconfirmed":0}; misses 376; named trap 83 (lower share 83/376); minimality decided 83/83; trap unknown 0. Local stage of engine wall: G0 71.3 %, G1 74.7 %; request-group share of capped-local requests (G0) 94.3 %.

### nightmare (6 of 10 pairs; a partial, budget-limited cohort: the recorded requests completed, 8 rows were unstarted)

| seed | G0 ready s | G1 ready s | G0 CPU s | G1 CPU s | ready G0/G1 | CPU G0/G1 | exact G0/G1 |
|---|---|---|---|---|---|---|---|
| 700 | 12.09 | 67.78 | 15.58 | 71.09 | 0.178 | 0.219 | yes / yes |
| 701 | 16.29 | 100.84 | 21.48 | 104.78 | 0.162 | 0.205 | yes / yes |
| 702 | 9.71 | 64.60 | 12.69 | 67.28 | 0.150 | 0.189 | yes / yes |
| 703 | 1.97 | 11.31 | 2.45 | 11.91 | 0.174 | 0.206 | yes / yes |
| 704 | 0.33 | 0.85 | 0.66 | 1.34 | 0.382 | 0.488 | yes / yes |
| 705 | 11.57 | 60.50 | 15.81 | 64.31 | 0.191 | 0.246 | yes / yes |

Ratio of cohort totals (G0 / G1; below 1 means G1 took longer): ready wall 0.170 [0.156, 0.188], CPU 0.214 [0.197, 0.238] (descriptive, whole pairs resampled); paired median ready ratio 0.174.

Miss split (identical in G0 and G1): {"exact":6,"shallow":56,"above-or-unrated":0,"below-trap":19,"below-tune":87,"below-setup2":7,"other-below":0,"unconfirmed":0}; misses 169; named trap 19 (lower share 19/169); minimality decided 19/19; trap unknown 0. Local stage of engine wall: G0 36.1 %, G1 6.1 %; request-group share of capped-local requests (G0) 95.6 %.

Physical work of the first technique pass:

| cohort | dfsCalls G0 | dfsCalls G1 | saved by skips | restricted solves G0 | restricted solves G1 | extra solves on count-rejected candidates | wall G0 ms | wall G1 ms | reading |
|---|---|---|---|---|---|---|---|---|---|
| normal | 42552 | 2355 | 40197 | 40465 | 42552 | 2087 | 10508.912 | 8919.757 | no regression in the first technique pass |
| nightmare | 18900 | 2541 | 16359 | 16359 | 18900 | 2541 | 23780.715 | 277863.654 | the first technique pass took more wall time in G1 although it skipped 16359 count(s) |

**Counter erratum applied.** The recorded `counts.dfsEntries` of the 52 IG-S09 request records are countSolutions CALLS (capture.totals.dfsCalls), not depth-first node entries; this report calls them `dfsCalls`, never node entries; node entries and the solver's own budget checks are not instrumented (null, never zero); the records are not rewritten. Units: dfsCalls = calls of SG.dfs.countSolutions (one per uniqueness count, whatever its depth); NOT depth-first node entries; dfsChecks = budget checks of the depth-first search loop (`ws.budget.check()` in `search`); propagation checks are not included; restrictedSolves = calls of the allowed-set restricted solve (`solveWithin`); node entries and solver budget checks: not instrumented (null). Record check: 52 of 52 records.

Setup probes (after timing, the first missed sample of each request, at most three above-floor groups): **15 executed group checks** plus **15 reused rows** (30 listed; never 30 independent executions); 13 requests executed a probe, 13 reused one. cpuTotalMs is the CPU of the whole request from the start of the worker to its cleanup (startup and cleanup included); the ready wall excludes startup; the two are never interchanged.

Unstarted (eight rows, both arms; no catch-up run): IG-S09/nightmare-706-707/greaterThan:nightmare:706/g0, IG-S09/nightmare-706-707/greaterThan:nightmare:706/g1, IG-S09/nightmare-706-707/greaterThan:nightmare:707/g1, IG-S09/nightmare-706-707/greaterThan:nightmare:707/g0, IG-S09/nightmare-708-709/greaterThan:nightmare:708/g0, IG-S09/nightmare-708-709/greaterThan:nightmare:708/g1, IG-S09/nightmare-708-709/greaterThan:nightmare:709/g1, IG-S09/nightmare-708-709/greaterThan:nightmare:709/g0.

Observer controls (two singletons, time-separated; compatible with the captured G0; no population-wide overhead claim): normal 300: captured G0 / observer-free ready wall x1.005, CPU x1.027 (compatible true); nightmare 700: captured G0 / observer-free ready wall x0.993, CPU x0.938 (compatible true).

## 10. The gate (provisional report)

State: **not-evaluable-pre-freeze**. Formal gate enabled: false; formal verdict: none; projection: **projection-awaits-author-review**. Decision owner: the plan author (Fable), advised by the pack author (Astra): this evaluator publishes inputs and never a go or a no-go. pre-freeze round: no gate is evaluated whatever the numbers or a frozen flag say

The real gate document stays `not-evaluable-pre-freeze`: pre-freeze observations are descriptive and cannot enable a cell, select an allowance, change a default or authorise the bank route. The frozen-gate evaluator (`gate.cjs`) was exercised on SYNTHETIC 40-cluster fixtures only (14 of 14 cases passed in the run that wrote this document); its statistics are not a real frozen decision. Descriptive pre-freeze inputs per SM2 cell (verified hits per ready CPU and wall second):

| cell | clusters | modes with all trials | verified hits (every mode) | rates / paired intervals | selection |
|---|---|---|---|---|---|
| classic9 | 8 | 8 | proposal-only 0, ordinary-only 0, F0 0, F1 0, FC 0, FM 0, FU 0, FS 0 | all zero / all intervals degenerate [0, 0] | F1 (non-winning default: all-zero-verified-hits) |
| mega12 | 8 | 8 | proposal-only 0, ordinary-only 0, F0 0, F1 0, FC 0, FM 0, FU 0, FS 0 | all zero / all intervals degenerate [0, 0] | F1 (non-winning default: all-zero-verified-hits) |
| mega16 | 8 | 8 | proposal-only 0, ordinary-only 0, F0 0, F1 0, FC 0, FM 0, FU 0, FS 0 | all zero / all intervals degenerate [0, 0] | F1 (non-winning default: all-zero-verified-hits) |
| samurai | 8 | 8 | proposal-only 0, ordinary-only 0, F0 0, F1 0, FC 0, FM 0, FU 0, FS 0 | all zero / all intervals degenerate [0, 0] | F1 (non-winning default: all-zero-verified-hits) |

## 11. Machine accounting of the whole round

Final charge of the round: **6610.42 s** (110.2 min) of the 10800 s (180 min) ceiling; unused **4189.58 s**. It is 77 wrapped commands (71 ledger entries, including IG-S10's own, entry 71, 53.54 s, and 6 commands the ledger does not reference: charged once, the IG-S09 dev check among them) = 6609.95 s (6556.41 s before IG-S10; occupied 3144.95 s + charged grace 3465.00 s), plus the manual adjustment listed apart: IG-S07 0.470 s, grace 0 s (no quiet-admission grace; debited once; kept apart from the wrapped-command counts). Priority waits are excluded from every charge: **13796.813 s known** (ledger entries 13342.190 s + auxiliary command receipts 454.623 s); 3 commands have no wait on record (two IG-S01 evidence-only commands and the IG-S09 dev-check: unknown, not 0).

| task | allocation s | approved s | commands | charged s | grace s | manual s | unused of allocation + approval s | known priority wait s | unknown waits | status |
|---|---|---|---|---|---|---|---|---|---|---|
| IG-S01 | 240 | 0 | 5 | 237.000 | 225 | 0 | 3.00 | 168.77 | 2 |  |
| IG-S02 | 1500 | 0 | 11 | 1399.885 | 495 | 0 | 100.12 | 2999.97 | 0 |  |
| IG-S03 | 1320 | 90 | 12 | 1307.230 | 540 | 0 | 102.77 | 959.95 | 0 |  |
| IG-S04 | 720 | 330 | 16 | 828.329 | 720 | 0 | 221.67 | 1318.53 | 0 |  |
| IG-S05 | 2880 | 0 | 11 | 841.285 | 495 | 0 | 2038.72 | 4811.74 | 0 |  |
| IG-S06 | 1440 | 0 | 0 | 0.000 | 0 | 0 | 1440.00 | 0.00 | 0 | deferred: not run, not an automatic transfer |
| IG-S07 | 720 | 12 | 10 | 711.082 | 450 | 0.47 | 20.92 | 1185.40 | 0 |  |
| IG-S08 | 360 | 0 | 2 | 336.394 | 90 | 0 | 23.61 | 90.35 | 0 |  |
| IG-S09 | 900 | 90 | 9 | 895.678 | 405 | 0 | 94.32 | 914.19 | 1 |  |
| IG-S10 | 240 | 0 | 1 | 53.535 | 45 | 0 | 186.47 | 1347.93 | 0 |  |

Approvals (extra time lifted by the orchestrator or the pack author): IG-S03 +90 s (used beyond the base allocation: 0.00 s); IG-S04 +330 s (used beyond the base allocation: 108.33 s); IG-S07 +12 s (used beyond the base allocation: 0.00 s); IG-S09 +90 s (used beyond the base allocation: 0.00 s). Tasks that charged more than their base allocation: IG-S04 (108.33 s over).

## 12. The frozen rerun: proposal and the approvals it needs

PROPOSAL - grants no execution authority. Every frozen run needs the receipts and approvals below, and its own budget; nothing here is charged to the first round. Every cost figure is a planning scenario: none is a guaranteed upper bound, and the source preparation of the prerequisites (and any adapter repair, reproof or recalibration) is uncosted.

**Prerequisite of every frozen command, before the table below (uncosted):** a proposal; authorises nothing and is not costed.

1. prepare a dedicated worktree at the ATTESTED frozen commit (the commit the freeze receipt names), never the development worktree
2. install the pinned harness (the files of the harness fingerprint the freeze receipt pins) into that worktree
3. fingerprint the installed harness and the loaded runtime and compare both with the receipts
4. inventory the capabilities on that source: every adapter, hook contract, guard and the catalogue (the -PlanOnly and dry-run forms)

if a capability is missing or a hook contract changed the run stops with unsupported-source (exit 2) for the author; the harness never falls back to the old engine. Uncosted, approval-dependent work: adapter repairs and their reproof on the frozen source; recalibration (count budgets, the CPU quantum, the guards) on the frozen source; any rerun the above requires. none of this is in any runtime projection of this plan (they price the frozen commands only).

Measurements the first round never made (explicit unmeasured rows of the estimate table; no run authorised):

- **GAP-SM5**: the SM5 pool-width sweep: 1, 2 and 4 workers on classic9 and mega12 Nightmare (plan.md:366). Not the same as: the IG-S02 pool at width min(4, A) against the serial run, and the effective two-worker operation on the two-attempt boards, are not the missing width-two comparison. UNMEASURED, uncosted, no run authorised.
- **GAP-FLOOR**: the restricted-floor performance probes: an accepted floor test, a refused floor test at each floor level, a DFS uniqueness check and a full solve, each timed in isolation. Not the same as: the existing floor parity evidence is not that experiment. UNMEASURED, uncosted, no run authorised.

| order | task | depends on | population | frozen keys | first round charged s | planning scenario charged s (low - admission plan / guard scenario) | commands (low - admission plan / guard scenario) |
|---|---|---|---|---|---|---|---|
| 1 | IG-S01 | none | loader parity on classic4/veryEasy/1 and classic9/hard/1 plus the synthetic self-test | 4 keys, 2 shard(s) | 237 | 95 - 145 | 2 - 2 |
| 2 | IG-S02 | IG-S01 | H3: Nightmare on mega16[1,2,3], mega12[1,2,3], samurai[1,2,42], classic9[1,2,3], killer[1,2,3], greaterThan[1,2,3]; native-w1 against attempts-w4 (36 requests) | 36 keys, 8 shard(s) | 1400 | 1247 - 1482 | 8 - 8 |
| 3 | IG-S03 | IG-S02 | the 18 saved H3 puzzles audited (four solver sets, injected failures) plus scoped-attempts-w4 on H3 (18) and scoped-native-w1 on six seeds (6) | 43 keys, 11 shard(s) | 1307 | 994 - 1469 | 11 - 11 |
| 4 | IG-S04 | IG-S03 | pilot grid seeds 11 and 12, classic9/mega12/mega16/samurai Nightmare, eight modes (64 trials); recomputes the budgets | 64 keys, 6 shard(s) | 828 | 366 - 2740 | 6 - 10 |
| 5 | IG-S05 | IG-S04 (its budgets are recomputed on the frozen pilot first) | SM2 grid seeds 101-140 (40 clusters per cell), the same four cells and eight modes, at most two samples per trial (1,280 trials) - the decision population of IG-S-Q05 | 1280 keys, 1 shard(s) | 841 | 1945 - 12303 | 7 - 51 |
| 6 | IG-S06 | IG-S05 (frozen SM2 review and its selection); a separate budget approval; implementation of ig-s06 (not written) | held-out request seeds 201-240 on the four frontier cells, native-mixed and the selected frontier only (two modes x 40 = 320 requests, NOT four modes), plus the six-cell two-seed (201, 202) diagnostic population N1/CA4/CQ1/CQ4 (40 primary + 4 optional) | not implemented | 0 | 5759 - 103740 | 20 - 364 |
| 7 | IG-S07 | IG-S05 (frozen reporting); IG-S02/IG-S03 frozen baselines | the nine profiled requests and three controls of this round (same cells and seeds) | 12 keys, 10 shard(s) | 711 | 705 - 740 | 10 - 10 |
| 8 | IG-S08 | IG-S07 | Jigsaw Expert seed 1111 (240 s guard) and the control seed 1100 | 3 keys, 2 shard(s) | 336 | 336 - 336 | 2 - 2 |
| 9 | IG-S09 | IG-S08 | Greater-Than Normal 300-319 and Nightmare 700-709 (all ten shards, including the eight rows left unstarted in the first round), trace summary, G0/G1 plus two observer-free controls | 62 keys, 10 shard(s) | 896 | 1172 - 1282 | 10 - 10 |
| 10 | IG-S10 | IG-S09; IG-S06 when it was run | reconciliation of the frozen evidence, the frozen gate inputs (gate.cjs) and the closure report | 1 keys, 1 shard(s) | 54 | 65 - 240 | 1 - 1 |

Each command is `& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S0N -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'` (replace the task id; `-PlanOnly` shows the expanded cost before approval). low: measured occupied time scaled plus the minimum grace; admission plan: the dispatcher's admission estimates plus grace, a planning figure and NOT a guaranteed upper bound. Totals: tasks with a harness 115.4 min to 345.6 min. **Planning scenarios with incomplete upper bounds** (none is a guaranteed ceiling: validation, cleanup, diagnostics and retries are not all included): IG-S06 (unimplemented) 96.0 min (formula, 20 commands), 140.7 min (central, no saving credited, 29 commands), guard scenario 1729.0 min (364 requests, each its own command at the 180 s request guard + 60 s validation guard + 45 s grace; omits the scheduler tests, re-projection and pool-invariance checks, cleanup beyond the guards and retries); the four extensions 81.7 min central, 44.2 min to 157.5 min (proxy-based, very low confidence). Four-cell frozen request population: two modes x 40 requests, 320 requests, not four modes.

IG-S06 commands by phase (confirmatory + diagnostic; the phases cannot share an invocation): low 16 + 4, central 25 + 4.

The extension phases (pilot, SM2 screen, requests) cannot share an invocation across their dependency boundaries: each phase is at least one wrapped command (45 s grace each) and the counts are recomputed for every scenario (minimum central total 23 commands).

| extension (UNAPPROVED) | proxy (scale; statistic) | pilot 11,12 trials | SM2 101-140 trials | requests 201-240 | commands low / central / high | central commands pilot + SM2 + requests | planning scenario charged s: central (low-high) |
|---|---|---|---|---|---|---|---|
| wordoku | classic9 (x1.01; median over median) | 16 | 320 | 80 | 3 / 3 / 4 | 1 + 1 + 1 | 328 (231-566) |
| sohei | samurai (x1.028; maximum of two over maximum of two (like statistics)) | 16 | 320 | 80 | 5 / 8 / 13 | 1 + 2 + 5 | 1792 (941-3448) |
| flower | samurai (x0.863; maximum of two over maximum of two (like statistics)) | 16 | 320 | 80 | 4 / 6 / 11 | 1 + 1 + 4 | 1471 (781-2898) |
| butterfly | mega12 (x1.384; a maximum of two over a median of seven (UNLIKE statistics: the scale is likely biased high)) | 16 | 320 | 80 | 4 / 6 / 10 | 1 + 1 + 4 | 1313 (701-2536) |

Approvals needed before any frozen run:

- **A1** (orchestrator): the freeze receipt (ig-s-freeze/1): accepted MS17b/MS18e labels, the runtime and catalogue fingerprints, the accepted limits and defaults, an attestation; a ratingVersion 3 flag or a round name alone is not proof of a freeze
- **A2** (orchestrator with the plan author (Fable)): the budget receipt (ig-s-budget/1): the authorised total, per-task figures and source; no frozen run is charged silently to the first round
- **A3** (plan author (Fable)): the projection assumption set and the non-inferiority margin that gate.cjs needs before it presents a numeric request-fraction projection; without them it reports projection-awaits-author-review
- **A4** (plan author (Fable) with the pack author (Astra)): IG-S06: its implementation, its populations and its own budget (a separate approval; the first-round allocation was not run and does not transfer)
- **A5** (plan author (Fable) with the pack author (Astra)): each of the four Nightmare extensions separately (wordoku, sohei, flower, butterfly); none is covered by classic9 or samurai
- **A6** (pack author (Astra)): IG-S09 Nightmare 706-709 (eight rows unstarted in the first round): whether the frozen run includes them; no catch-up run is authorised before the freeze
- **A7** (plan author (Fable) with the pack author (Astra)): whether the SM5 pool-width sweep (1, 2 and 4 workers on classic9 and mega12 Nightmare) and the restricted-floor performance probes join the frozen scope: two measurements the first round never made, uncosted here, no run authorised
- **A8** (plan author (Fable) with the pack author (Astra)): the source preparation of the frozen rerun and the work it may expose (adapter repairs and their reproof, recalibration): uncosted, approval-dependent, outside every runtime projection

IG-S06: after the frozen IG-S05 screen has been reviewed by the plan author (Fable) and the pack author (Astra), and after a separate budget approval for IG-S06 itself; the pre-freeze result (0 verified hits in 256 trials, native kinds included) is not the reason to compose anything if the frozen screen still finds no variant with verified hits, IG-S06 composes a non-winning F1 default: ask the author whether to run it at all (a full-request frontier with zero grid yield is a cost measurement only)

## 13. Remaining decisions for the plan author (Fable) and the pack author (Astra)

- **D1** (plan author (Fable) with the pack author (Astra)): Approve (or change) the frozen-rerun order, populations and the budget receipt amount; this report only projects the cost (the frozen-rerun plan) and grants nothing.
- **D2** (plan author (Fable) with the pack author (Astra)): IG-S06 (held-out requests and ordered composition): implement and run only after the frozen SM2 review and a separate budget approval; the first-round deferral is not a pass or a refutation. Decide whether the composition should still be attempted if the frozen SM2 screen has no verified hits in any mode.
- **D3** (plan author (Fable)): Approve the assumption set that converts a verified-hit rate lower bound into a request fraction (the gate's projection stays `projection-awaits-author-review` until then) and the non-inferiority margin for positive-baseline cells (the evaluator defaults to zero tolerance, pending your review).
- **D4** (plan author (Fable), design review by the pack author (Astra)): The four Nightmare extensions (wordoku, sohei, flower, butterfly) are listed as UNAPPROVED separate populations with proxy-based planning scenarios; decide whether any joins the frozen round.
- **D5** (pack author (Astra)): IG-S09 Nightmare 706-709 (eight unstarted rows): the frozen rerun covers all ten shards; decide whether the Nightmare regression of G1 (0.170x ready wall on six pairs) justifies completing them or whether the frozen scope should drop the arm; no catch-up run is authorised here.
- **D6** (pack author (Astra)): IG-S07 shows legacy `nishio`/`forcingChain` at about 81 % / 77 % of the single mega16 / mega12 profiles; frozen attribution must distinguish MS07b's new chain families (`forcingChainLong`, `nishioDeep`). Decide whether a per-finder frontier profile (unmeasured here) is wanted.
- **D7** (plan author (Fable)): S7 (Q07 option (b)): the censored 240.015 s Jigsaw 1111 observation points at the full-grid search; the versioned total-work/restart limit is a design question for phase 2; no ceiling is inferred from this run.
- **D8** (plan author (Fable) with the pack author (Astra)): Adapter, guard and footprint points carried forward: scoped S3 skipped scopes charging two or more virtual node checks are covered only by engine-free tests; the 120 s application guard is not what the research guards (180/45/240 s) measure; solver-check totals are inexact in IG-S07; Killer needed a Killer-only verifier rule.
- **D9** (plan author (Fable) with the pack author (Astra)): Two measurements the first round never made (explicit unmeasured rows of the estimate table, no run authorised): the SM5 sweep of the pool at width 1, 2 and 4 on classic9 and mega12 Nightmare (plan.md:366; the IG-S02 width-4 pool and the effective two-worker operation on two-attempt boards are not that sweep) and the restricted-floor performance probes (an accepted floor test, a refused floor test at each floor level, a DFS uniqueness check, a full solve; the existing floor parity is not that experiment). Decide whether they join the frozen scope and with what budget.
- **D10** (plan author (Fable) with the pack author (Astra)): Source preparation for the frozen rerun (prerequisite of every frozen command): a dedicated worktree at the attested frozen commit, a pinned harness installed and fingerprinted there, a capability inventory. Adapter repairs and their reproof and any recalibration are uncosted, approval-dependent work that no runtime projection in this report includes; the harness never falls back to the old engine.

## 14. Cross-checks, tests, deviations and limitations

Cross-checks of the recomputed raw-record values against the accepted summaries: 118 of 118 agree. Tests run by the writer: reconciliation 22/22, synthetic gate 14/14.

- Revision r3 (after r1 and r2): the r1 command ran through the supplied low-priority wrapper once (one analysis shard, ledger entry 71); the r2 and r3 documents were written by unwrapped, read-only aggregations (`ig10-run.cjs --write-r2`, `--write-r3`: no engine, no worker, no generation, no wrapper, no second wrapped command, local CPU only, not charged). The pure tests, the source-only dry runs and -PlanOnly ran directly during development and are disclosed in budget-summary-r3.json.
- The r1 and r2 documents stay unchanged beside the r3 ones (hashes in `revision.supersedes`). Three identities are kept apart: the wrapped r1 command's harness fingerprint, the r3 writer's harness fingerprint (the corrected reporting code; not engine-run, there is nothing to run) and the measurement fingerprints of the nine tasks.
- Revision r3 applies the pack author's report-only rulings (errata table, section 0): no measured record, coverage figure, accounting figure or gate state changed; statistic labels, wording, three new rows (the isolated S2 comparison and two unmeasured measurements), the frozen-rerun prerequisites and the staleness section did.
- budget-summary-r3.json includes IG-S10's own wrapped charge (ledger entry 71, occupied time plus 45 s grace) and the 0.470 s IG-S07 pre-check debit, once, without admission grace, listed apart from the wrapped command counts (as in r2).
- No numeric verdict threshold is used (the r1 thresholds were the report writer's and are removed); the pack names none.
- IG-S02 Killer rows are counted as completed by the hash-linked audit overlay; the stored records stay `error` and the harness shard status stays `failed` (historical).
- IG-S09 recorded `counts.dfsEntries` are countSolutions calls (erratum applied everywhere in this report); node entries are not instrumented.
- The frozen closure (round frozen-gate) is implemented and tested on synthetic inputs only: no frozen evidence exists, so its readers have never run on real frozen records. It rejects a claimed-exact request whose verification failed and non-distinct seed populations.
- The corrections after the measurements (IG-S04 98016f2c, IG-S05 f297ca31, IG-S07 r2, IG-S08 r3, IG-S09 r2 and the F2 follow-up) were not engine-rerun; their report-writer and corrected-harness fingerprints are listed beside the measurement fingerprints.

Acceptance (self-assessed from the facts above; the orchestrator reviews):

| id | status | evidence |
|---|---|---|
| B01 | pass | the report, section 3: 16 rows (the check-list's 13, the isolated S2 comparison and the two unmeasured rows), each with a verdict and an explicit scope (measured, partial or named unanswered: IG-S06 composition, SM5 sweep, restricted-floor probes) |
| B02 | pass | the gate document: state not-evaluable-pre-freeze; formalVerdict null; no production, default or offer change |
| B03 | pass | the frozen-rerun plan: 10 ordered commands, populations, 40-seed expansions, planning-scenario cost, 8 approvals, four unapproved extensions |
| T01 | pass | the coverage document: 0 problems; synthetic cases reject duplicates, silent exclusions and incompatible identities (22/22) |
| T02 | pass | paired whole-cluster bootstrap, all-spent CPU/wall denominators, censored and budget-ended trials kept (reconcile tests) |
| T03 | pass | provisional records cannot produce a formal go; sample-only evidence reports not-established-sample-only; claimed-exact requests whose verification failed and repeated seeds are rejected (gate tests) |
| T04 | pass | 14/14 gate cases run the real analysis on synthetic 40-cluster fixtures |
| T05 | pass | no engine, no worker, no generation; budget summary from the common reader; firewall and formats checked by the runner |

## 15. Staleness of the measurements

- Every measurement of IG-S01 to IG-S09 ran on the MS05e-era runtime (commit `ef8a9cc`, runtime fingerprint `36b2b832...`), the catalogue of rating version 2 (15 variants, 26 techniques).
- Rating v3 (`8b70875`) includes MS06a-d and MS07a-d: 11 runtime files changed (+808 / -208 lines), among them the windowed chain kernels with `SHORT_MAX` = 4, `forcingChainLong` (1400) and `nishioDeep` (2600).
- MS07c's classic9 Nightmare experiment at C = 4: 12 of 12 exact, p50 0.15 s, p95 0.51 s; G13 samurai/42 exact at attempt 1; G10 Killer/42 shallow to exact; Hell 1 non-vacuous.
- MS08 to MS16 are expected to add about 14 finders.

The MS07c observations come from a different source, cohort and cap: they are not paired improvements over the measurements of this report and are not combined with them. Every timing here describes the MS05e-era runtime; the frozen rerun is on the attested frozen commit.

Compatibility smoke: see `evidence/phase0/smoke-rating-v3-8b70875/`
