# Improve generating (Sudoku): questions for the plan author

This file holds the **open questions** for the plan author, the owner's decisions and the plan author's notes on each
plan version. At the owner's request (2026-11-15) answered questions are removed once the analysts have checked the
answers. The full text of IG-S-Q01 to IG-S-Q27 with their answers, the plan author's direction of 2026-11-14 and the
plan author's positions on IG-S-D1 to IG-S-D6 is in this file at commit `477cd53`; `plan.md` and the reports cite them
by ID. Plan version 4 has taken in the answers to IG-S-Q26 and IG-S-Q27 and the corrections accepted from the joint
report on version 3.

---

## Owner decisions (2026-11-14, 19:10, through `ask_user` and email)

| Id | Decision |
|---|---|
| IG-S-Q01 | **Confirmed as answered:** `generatorVersion` and history version 2 (stored puzzle and provenance) ship in phase 1, before the search changes; version-1 entries regenerate on the current path with a notice that they may differ. |
| IG-S-Q02 | **Confirmed as answered:** with a pool, the 120 s guard is the wall time of the request from its start. |
| Phase 0 | **Confirmed:** the official phase-0 measurements start once difficulty-v3 freezes. Prototypes are built now as test-side harnesses with no production change; their numbers are provisional (pre-freeze) and are re-run on the frozen catalogue. |

---

## Interim note after the first prototype measurements (2026-11-15)

**Non-gating; provisional (pre-freeze), on the pre-MS07 catalogue.** These prototypes changed no production code.
IG-S02 median ready-wall S5a speed-ups (three pairs per cell): mega16 1.92x, mega12 3.22x, samurai 1.79x,
classic9 3.22x, Killer 2.55x and Greater-Than 2.62x; CPU costs and early-exact regressions are retained.
IG-S03 found no material net gain from partial S3 (singles and subsets); this does not refute full S3,
or show that the remaining finders dominate solver time.
IG-S04/05 show no demonstrated exact-yield benefit on classic9, mega12, mega16 and samurai.
IG-S05: zero verified hits in every mode, native controls included, over eight grid clusters per cell.
Failure modes differ: empty unique frontiers, above-band or shallow candidates, and count-budget stops.
MS07 may change the window, floors and search; these pre-freeze results decide neither the S1 gate nor S9.
IG-S06 is deferred (not passed or refuted); SM1, SM3 and the Greater-Than diagnostic continue.
IG-S10 will bring the full interpretation, SM1 attribution and the frozen-catalogue rerun proposal.
No question or policy decision is requested.

IG-S07 (non-gating, pre-MS07): about 81 % / 77 % of the single mega16 / mega12 Nightmare profiles' engine-root
wall time lies in legacy `nishio`/`forcingChain`: hotspots, not evidence of cacheability or achievable gains.
Frozen attribution must distinguish MS07b's new chain families (`forcingChainLong`, `nishioDeep`).
The interpretation remains with IG-S10.

---

## Phase-0 measurement round closed (2026-11-15)

The authorised pre-freeze measurement round is closed. The [final report](evidence/phase0/provisional-r1/report-r2.md)
links the reconciled coverage, final accounting, disabled gate and frozen-rerun proposal.
IG-S06 remains deferred; IG-S09 Nightmare 706-709 remain unstarted. No catch-up or frozen round is authorised now.
Difficulty-v3 resumes.

D1-D8 remain future decisions: frozen order/budget; composition after zero yield; projection assumptions and
non-inferiority margin; four extensions; missing Nightmare pairs; MS07b chain attribution; versioned S7 limits;
and adapter/guard/footprint carry-overs.

Future work requires A1-A6 as applicable: freeze attestation, budget approval, approved assumptions/margin,
separate IG-S06 approval, each extension's approval, and a decision on the missing Nightmare pairs.
All findings remain provisional: the gate is `not-evaluable-pre-freeze`, and no qualification, default,
bank-route or production decision follows.

---

## Cover note for provisional review (2026-11-15)

The [r3 measurement report](evidence/phase0/provisional-r1/report-r3.md) supersedes r2's interpretations,
not its measurements. This package supports provisional design review; it is not an official gate
or a source-current measurement basis for plan-v2 performance and yield forecasts.

The measurements use the MS05e-era runtime (f7be90f, unchanged by ef8a9cc; fingerprint 36b2b832…).
The audit/smoke snapshot, rating-v3 8b70875, includes MS06a-d and MS07a-d: 11 runtime files changed
(+808/-208), including windowed chain kernels with SHORT_MAX = 4. The canonical-rating technique
weights are 1400 for forcingChainLong and 2600 for nishioDeep, not complete puzzle scores.
The reported MS07c classic9 Nightmare experiment at C = 4 achieved 12/12 exact, p50 0.15 s and
p95 0.51 s; G13 samurai/42 became exact at attempt 1, G10 Killer/42 changed from shallow to exact,
and Hell 1 became non-vacuous. These are different source/cohort/cap observations, not paired
improvements over this package. MS08-MS16 are expected to add about 14 further finders.

Errata E1-E10 correct the baseline statistics and sample-mix wording, distinguish cheap unsuccessful
sample processing from exact yield, report isolated S2 costs, correct the first-phase formula and
S4's placement, withdraw representative 1,296/10x costing, and identify missing measurements and
source-preparation costs. Killer's comparison remains three-pair evidence; unstarted requests are
not censored requests.

Compatibility smoke ([report](evidence/phase0/smoke-rating-v3-8b70875/smoke-report-r2.md)): harness
`8f0018b5c36d…` against rating-v3 `8b70875`: self-test 36/36; 5/8 adapters apply textually, while
`profile`, `jigsaw-profile` and `gt-diagnostic` fail at digger anchors, and `frontier-hooks` has a stale
`refusalReason` exposure; two pure suites timed out and native/no-op puzzle parity remains untested
(1/4 loader rows completed); 144.472 s separately charged, with no adapter repairs or performance
conclusions. Compatibility only; no repair or performance conclusion.

Decisions D1-D10 and applicable approvals A1-A8 remain pending. D9/A7 adds the missing width sweep
and restricted-floor probes; D10/A8 adds frozen-source preparation, repairs, reproof and recalibration.
Apart from the separately authorised compatibility smoke, no new measurements, IG-S06,
Nightmare 706-709 catch-up or frozen round are authorised. The gate remains `not-evaluable-pre-freeze`.

---

## Plan version 2 (plan author, 2026-11-15)

`plan.md` is revised to version 2 from the provisional round and the r3 report, as "Next actions" 4 asked. Its
section 0 gives the estimate against the measurement and the changes; errata E1 to E10 are taken into it. It
authorises no run and changes no gate: the gate remains `not-evaluable-pre-freeze`.

- **As estimated:** S5a (x1.8 to 3.2 on the wall clock, the same puzzles). **Below the estimate:** the first
  phases as built (1.3 to 2.1 times short of the report's figures), because the partial S3 added nothing.
  **No evidence either way:** S1's hit rate (no exact puzzle in any mode, controls included). **No saving:** S2.
- **Changed:** phase 1 is the version field, history v2 and S5a only; S3 is re-scoped to the chain kernels and
  gated by the frozen SM1; S1 and S2 get a stop rule at the frozen SM2 screen; S5b is promoted and decoupled
  from S1; S7 targets the full-grid search first; the "1,296 solves per sample" and "10 times fewer solves"
  premises are withdrawn.
- **Positions on D1 to D10:** plan section 5. They are proposals for the pack author and the owner, not
  approvals; A1 to A8 stay pending.
- **Owner decisions:** plan section 7 (new: OD-S5, the pool's CPU cost; the harness repair on the frozen source
  before the frozen budget is set).

---

## Owner decisions (2026-11-15, after the plan author's positions; through `ask_user` and email)

The owner approved all six decisions as the plan author and the analysts recommend, with the plan author's
conditions as written in each answer above.

| Id | Decision |
|---|---|
| IG-S-D1 (OD-S5) | **(B)** selective pooling up to four workers with an early-hit path (head start or serial where the cell hits early) and a serial fallback; default enablement only after the frozen CPU, cold-wall and ready-wall results; a phone-class check before mobile enablement. Replaces plan section 7's "accept, up to 1.6 times". |
| IG-S-D2 (D10/A8) | **(B)** a narrowed, separately costed harness repair after MS18e on the attested frozen source, with actual native and no-op puzzle parity and no fallback to the old engine; the measurement round is priced only afterwards; no provisional time carries over. |
| IG-S-D3 (OD-S3) | **(A)** bounded diagnosis while Hell 1 stays unoffered; (B) only with a named hypothesis, (C) only with a priced plan; no bank designed before the final catalogue. |
| IG-S-D4 | **(A)** inner width four and outer `--jobs=1` for paired timing and budget verdicts, serial controls at outer `--jobs=1`; any throughput study kept apart; difficulty-v3's qualification unchanged. |
| IG-S-D5 | **(A)** the reduced staged frozen round (F0 to F6 of the joint report, each with its stop condition); the passing-cell Nightmare screen and the attempt sweep retired; cohorts of 20 or more costed after the repair. |
| IG-S-D6 | **(A)** no preliminary SM5 before the freeze. |

---

## Plan version 3 (plan author, 2026-11-15)

`plan.md` is revised to version 3 from the joint report on version 2, the answers IG-S-Q19 to IG-S-Q25 and the
owner decisions IG-S-D1 to IG-S-D6. It is one current document: the "version 2" notes and the section 9
addendum are merged into their sections, and version 2 stays at commit `adb7184`, where the full mechanism
text of the parked and dropped items remains. It ran nothing; the gate remains `not-evaluable-pre-freeze`.

- **Changed:** the targets re-derived on the rating-v3 checkpoint (section 2); S1, S2, the Nightmare screen
  and the attempt sweep out of the mandatory scope; S5a selective with a mandatory early-hit path; no kernel
  factor priced (K2 conditional, K4 a diagnostic, K1 and the chain work parked, K3 and K5 dropped); the
  contract boundary of IG-S-Q19 (section 3.1); the kernel gate of IG-S-Q20 (section 5.4); the reduced staged
  frozen round F0 to F6 after the narrowed repair (section 5).
- **Corrections:** JV2-S01 to JV2-S16 are taken in; the "220 to 590 points" window is withdrawn.
- **Still to come to the owner:** the cost of the repair and the round's price after MS18e, OD-S1 and OD-S2
  before phase 2, the pool's enablement after F2, and Hell 1's route after F5 (plan section 7).

---

## The plan author on the plan-v3 joint report (2026-11-15)

- **The corrections of section 3 are accepted** and go into the next revision of `plan.md`: butterfly Hell 1's
  phase-1 scenario becomes 11.2 to 19.1 s (a four-attempt board; I recomputed `38.3 / 3.43` and `39.5 / 2.07`),
  the "real-tier" wording, Q's relation to MS08a, the workers sentence, and the outcome-reuse rule of JV3-S03 in
  place of my sentence in IG-S-Q24 that matching final records "can serve for outcomes". A timeout or an error
  is never reused as a proved non-exact outcome.
- **JV3-S08.** The K2 admission note is taken as written: at a threshold of 1.15 the share needed is 13 % for an
  unbounded kernel gain and 26 % at a kernel factor of 2.
- **Answers IG-S-Q26 and IG-S-Q27** above add a step (F5b) and fix a statistic. They change no owner decision;
  IG-S-D1 to IG-S-D6 remain in force.

---

## Analysts on the answers to IG-S-Q26 and IG-S-Q27 (2026-11-15)

Opus (SA1) and Astra (SA2) checked the answers independently against the source at `75b99e6`, the owner decisions
IG-S-D1 to IG-S-D6, the joint report and the plan. **Both answers are accepted; no follow-up question; no owner
decision is needed.**

- **IG-S-Q26.** F5b fits IG-S-D5: that decision already approved confirmation cohorts of 20 or more, costed after the
  repair; F5b only gives them their place in the sequence.
- **IG-S-Q27.** The CPU rule of at least 1.0 on targets does not conflict with S5a: in the kernel gate both arms run
  the same pool and early-hit policy, so the ratio judges the kernel only; S5a's serial "not slower" check stays a
  separate rule with its statistic fixed in F2's manifest.
- **Notes for the next revision (no answer needed).** F5b gets its own stop conditions, as IG-S-D5 requires "each
  with its stop condition": a puzzle mismatch stops the cell, and a failure or a cohort incomplete at a ceiling is
  recorded as such. Phase 0's gate for the pool's enablement reads "(F2 and F5b)" instead of "(F2)".

## Plan version 4 (plan author, 2026-11-15)

`plan.md` is revised to version 4. It takes in the corrections of the joint report on version 3 (JV3-S01 to
JV3-S09), the answers IG-S-Q26 and IG-S-Q27 and the analysts' two notes above. Version 3 is `plan.md` at
commit `2278b61` (before the cleanup). Version 4 ran nothing; the gate remains `not-evaluable-pre-freeze`. No
owner decision is needed, and IG-S-D1 to IG-S-D6 remain in force.

- **Section 5:** the confirmation step F5b with its stop conditions, after a five-seed pilot and a policy
  freeze in F2; the outcome-reuse rule of JV3-S03; the kernel gate's CPU statistic and the scope of the 0.95
  tolerance; the K2 admission note.
- **Sections 1, 2 and 4:** the workers sentence, Q's relation to MS08a, the "real-tier" wording, and butterfly
  Hell 1's scenario at 11.2 to 19.1 s.
- **Sections 6 and 7:** the pool's enablement rests on F2 and F5b.

## Analysts on plan version 4 (2026-11-15)

Opus (SA1) and Astra (SA2) checked version 4 (`plan.md` at `072612a`) independently against the joint report on
version 3, the answers IG-S-Q26 and IG-S-Q27, the analysts' notes and the source at `398c832`. **Version 4 is ready as
the planning basis. No follow-up question; no owner decision is needed.**

- **Fidelity:** JV3-S01 to JV3-S09 and the section 3 corrections are taken in word for word, butterfly Hell 1's
  phase-1 scenario at 11.2 to 19.1 s included; the F2 pilot, the policy freeze at the end of F2 and F5b with its stop
  conditions; the scope of the 0.95 tolerance and the CPU statistic as defaults until the targets are named; the
  pool's enablement on F2 and F5b in sections 6 and 7.
- **Arithmetic** checked: 13.04 / 26.09 / 72.33 %, 1 / 0.95 = about 5.3 %, 20 / 40 / 80 executions per cell.
- **Note (no answer needed):** `398c832` is MS08b (Two-String Kite), which also postdates the checkpoint Q: 18 of 520
  hashes and four reference ratings changed by 1 to 13 points, no level change. The plan's sentence stays correct as
  pinned to `75b99e6`, its code anchors are unchanged, and F1 re-derives the baseline on the final catalogue.

## Open questions

None for the Sudoku plan (2026-11-15).
