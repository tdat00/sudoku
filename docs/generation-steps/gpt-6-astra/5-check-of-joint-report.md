# Check of the joint report — corrections and conditional sign-off

- **Reviewer:** gpt-6-astra.
- **Date:** 2026-10-28.
- **Reviewed:** [the joint draft](../report-detailed.md), all **1169 lines**, including §6 and every string in §8.
- **Draft SHA-256:** `3723952cfdce2450d19cdbefa1d0bb9cb0d18dcd2ce9b4f512c3ae39e027de81`.
- **Code:** `8d9510aade5d99f4fec9fda3835245a31f411ede`.
- **Notation:** `J:line` refers to `docs/generation-steps/report-detailed.md` at that draft identity.
  `E\…` means **my experiment folder (not part of the repository)**.
  `C\…` means the peer's experiment folder (also not part of the repository).
- **Scope:** research only. This new check does not edit the joint draft, earlier reports, code or tests.

## 0. Verdict and the four requested answers

**Not signed yet.** The scoring formula, example sequences, selected 243-screen policy and principal decisions
are consistent with the [golden acceptance data](4-acceptance-data.md).
The blockers are implementation-contract and explanation issues, not a request to change generation or the score.

There are **13 must-fix corrections**, **3 optional improvements**, and **1 visibility question for the user**.

| Item left by the drafter | Answer |
|---|---|
| 1. Lighter-technique sentence | **Reword and conditionally approve**, as an observed result of this configured solver; M8 gives exact EN/VI text and the `stuck` gate. Put it in “Why?”, not a fourth visible sentence. |
| 2. Badge decimals | **Agree to one decimal, rounded down**, locale-formatted: ×12.5 / ×12,5. Classification uses exact integer totals, not the formatted ratio. Rule below. |
| 3. Vietnamese | All **67 table rows / 69 expanded keys**, the seven step-text rows and both rendered examples were reviewed. M12 and Appendix B supply corrections; unchanged entries are explicitly identified. |
| 4. No steps before Prepare | **Not implied by Q17 b.** This is a genuine visibility choice, F1 below. Neither option may start main-thread work automatically. |

### Agreed badge rule

For an already classified jump:

```js
const badgeRatio = Math.floor(10 * afterScore / beforeScore) / 10;
```

Format with exactly **one fractional digit**, using the locale: 551/44 → **×12.5** in English,
**×12,5** in Vietnamese; 300/100 → **×3.0 / ×3,0**; 1000/300 → **×3.3 / ×3,3**.
Never apply this rule at a zero or unknown baseline.
The badge predicate remains `before > 0 && after >= 3 * before && after - before >= 100`.
I withdraw my earlier two-decimal display preference; none of the golden scores or jump flags changes.
The exact numerator/denominator may remain in an accessible calculation description.

## 1. Must fix before sign-off

### M1. Explanation identity must be a displayed transition, not just its endpoint

**Where:** R6/R9/R15, `J:450–460,533–550,710–722`.

**Wrong:** `explain: { <moveIndex>: ... }` cannot represent the transitions of both views.
It also cannot distinguish the final duplicate from the preceding step at the same endpoint.

**Evidence from the goldens:**

| Case / endpoint | Compact transition | Details transition |
|---|---|---|
| G06, m31 | **138 → 1678**, +1540, jump | **2967 → 1678**, −1289, no jump |
| G10, m42 | **607 → 1940**, +1333, jump | **2788 → 1940**, −848, no jump |
| G12, m103 | **130 → 638**, +508, jump | **642 → 638**, −4, no jump |
| G01, m31 | 568 → 992; W before **906.5** | 568 → 992; W before **906.75** |

The final verification is a third transition: m31 → m31 in G01, **992 → 992**, delta 0, no new-technique line.

**Correct contract:**

> Ratings are position-keyed. Tiers, deltas, before/after terms, causal probes, log spans and choice text are
> transition-keyed, for example by `(view, fromMove, toMove, stepRole)`, or stored directly on each displayed step.
> Endpoint-only facts, such as a collected proof, may be shared separately.

Prepare the union needed by **both** views before declaring the analysis ready; navigation must not trigger a solver.
The 14 goldens have **13 compact jumps**, **16 details jumps**, and **19 distinct jump transitions/endpoints**.
The compact-only 13 proofs therefore do not cover the details view.
Extend the tests with G06 and the final duplicate, not just G01's unchanged integer baseline.
[E\joint-check-evidence.json; E\joint-check-metrics.json]

### M2. The no-Worker gate must include cache trace work and actual client readiness

**Where:** R4/R15/R16 and file list, `J:401–421,692–744,1055–1071`.

**Wrong/incomplete:** checking a mode property and starting on `attachTrace` does not enforce Q17 b on every path.
The draft also leaves `cache.js` unchanged without specifying how the wrapped client exposes the new operation.

Canonical source:

- `generator/js/worker/worker-client.js:8–10,529–535`: `mode` is only final after `ready()`; before that it can be a guess.
- `generator/js/ui/cache.js:686–688`: its background client uses automatic worker/main fallback.
- `generator/js/ui/cache.js:1008–1035,1071–1087`: a cache result starts trace generation automatically.
  The worker-only check for **pre-generation** is not a gate on this trace job.
- `generator/js/ui/cache.js:1152–1161`: the wrapper forwards `generate`, `cancel`, `ready`, `mode` and `inner`,
  but has no `replay` method.

A simulated main-mode cache hit produced **1 automatic trace-generation invocation before any Prepare click**.
The cached result had no log; the inner client had a `replay` method, the wrapper did not.
No actual puzzle generation was performed by this simulation.
[E\joint-check-cache.json]

**Correct contract:**

> Await readiness of the client that will actually execute the preparation.
> Automatic preparation is allowed only in confirmed worker mode, never by URL assumptions or an optimistic guess.
> Main-thread trace acquisition and score analysis require consent for the displayed puzzle.
> `attachTrace`, cache hits, failed worker startup, autoplay, locale changes and navigation cannot bypass that gate.

Choose an explicit routing design: forwarding/unwrapping the existing client, or a separately managed analysis client.
If the log is missing on a cache hit, the manual path must explicitly acquire it without looping through the same
cache hit, then analyze it, or clearly report that the full trace is unavailable.
Update the file plan to permit the necessary cache-controller coordination; **storage schema, keys and payloads stay
unchanged**. This is separate from the pre-click visibility question F1.

### M3. Unscorable tables must preserve available attempt data without inventing score components

**Where:** R5/R9/R15, `J:423–448,535–546,710–718`.

**Wrong:** Q14 a requires the available deductions in an unscorable details step, but the `ambiguous` row says
“no rows”. Conversely, the `unverified` row says “the rows” without distinguishing attempted deductions from a
validated difficulty table.

G01's old half-step 11 has **E=53**, `status:'stuck'`, no score, at least two solutions, and these available counts:

```text
nakedSingle 2; hiddenSingleBox 15; pointing 6; boxLine 1; nakedPair 2;
hiddenPair 2; wWing 2; uniqueRectangle 1; forcingChain 4
```

**Correct contract:**

> Keep an unscorable details move as its own step. Show available attempted-technique counts with a clear
> “attempted deductions, not a validated difficulty rating” label and the known reason(s).
> Hide the Total **and numerical score-contribution cells/tooltips**; do not score partial counts.
> A guarded call that returned no counts must not invent an empty completed proof.

This needs an explicit branch rather than calling `scoreTable(partialCounts, E)` and merely hiding the Total:
`generator/js/ui/step-view.js:429–467` currently computes the per-technique score shares.

Also make the status source precise. `SG.difficulty.rate` discards the raw solver status
(`generator/js/engine/difficulty.js:391–453`).
If a specific `stuck`/contradiction reason is required, use one canonical-options
`SG.logicalSolver.solve` plus `SG.difficulty.classify`, not a second solve or an invented reason.
Count result **2 means at least two solutions**; 0 is not “more than one”.

Seed the known certified final rating into state memoization before optional ratings, so an earlier identical final
state cannot be needlessly capped. Optional first-use/lighter/cause failures must not erase a certified rating or
discard the whole otherwise valid replay. An unavailable optional explanation gets an honest limitation, no retry.
[4-acceptance-data.md §2.2–§2.4; E\acceptance-controls.json]

### M4. Do not suppress a new-hardest line just because the score is flat or decreases

**Where:** R10 and its counts/tests, `J:558–570,884–890,1102–1106`.

**Wrong:** “A decrease … gets no tier” conflicts with Q4's every-new-hardest rule and the draft's own
“not used by the preceding proof” definition.
The measured prototype also requires `after > before` for a one-line explanation.

Concrete saved positions:

| Request | Transition | New hardest technique absent from the preceding proof |
|---|---|---|
| Samurai Nightmare 42 | m100 → m101: **70 → 70** | Naked Single → Hidden Single (box), P **1 → 1.25** |
| Samurai Expert 1 | m85 → m86: **68 → 68** | Naked Single → Hidden Single (box), P **1 → 1.25** |
| Killer Nightmare 42 | m41 → m42: **2788 → 1940** | Nishio → Forcing Chain |
| Greater-Than Expert 42 | m103 → m104: **1967 → 1264** | Forcing Chain → W-Wing |
| Jigsaw Nightmare 3962167687 | m30 → m31: **2515 → 1938** | Nishio → Forcing Chain |

**Correction:**

> A decrease gets no **jump badge**. A new endpoint-hardest technique still gets the neutral proof-change line
> whenever the preceding displayed proof is known, including flat and decreasing scores.
> “New hardest” does not assert that its weight or total score increased.

The reverse condition also matters: a jump whose hardest technique is already present must **not** receive a
false “New hardest technique” row label. Highlight the relevant existing row/Total without that label.

On the 35-request saved pool, rising-only versus full-rule line counts are **40 → 40 compact**, **52 → 57 details**.
The draft's **149** details lines on 107 requests are an old-rule measurement; recount rather than carry that
number forward as the complete implementation expectation.
[E\joint-check-metrics.json; C\xreview\p3-converged.js:43–66]

### M5. Choice text needs a chosen-null branch and a distinction between unscored and rejected alternatives

**Where:** R13/R15/strings, `J:635–646,715–717,1037–1042`.

**Wrong:** only null **alternatives** get a fallback; the selected objective can itself be null.
The schema has no explicit chosen objective/status.
“No other removal passed” is not equivalent to “no other numerical score exists”.

The goldens supply two required cases:

| Request / accept-log index | Chosen objective | Other numeric candidates / maximum |
|---|---|---|
| G13 Samurai Nightmare 42 / **229** | **null** | **6 / 72** |
| G14 Mega16 Hell2 12 / **84** | **null** | **6 / 66** |

At Mega16 m76, accept-log index **167**, the chosen objective is null and there are **2 other unscored retained
candidates**, **0 numerical alternatives**. “No other passed” is false.

**Correction:** retain `chosenObjective`, numerical/unscored alternative counts, the maximum of **numerical**
alternatives only, and the exact source offset.
Use, for example:

> The generator's limited check did not finish the chosen removal. Of the other candidates with completed
> check scores, 6 scored at most 72 by that check. The displayed board's full rating is 1483.

Null is not 0, not a clock timeout, and not a failed uniqueness test.
When no completed alternative score exists, say exactly that; do not deny the existence of retained but unscored
alternatives. The code explicitly logs its stuck objective as null:
`generator/js/engine/digger.js:369–372,646–673`.
[E\joint-check-evidence.json; 4-acceptance-data.md G13–G14]

### M6. A log span since the previous accept is not necessarily one guided round

**Where:** R2/R12/R13, `J:360–364,601–605,635–640`.

**Wrong:** the text treats every such span's tested/refused counts as one round.
A failed round can contain only rejects and no accept; the next round follows without a round marker.

**Witness:** Mega16 Hell2 seed 12, m76, accept-log index **167**:
the window at log indices **151–166** contains **16 candidates: 13 rejects and 3 keeps**.
The generator's maximum pool for that board is **10 candidates per round**.
This span therefore contains more than one round.
Source: `generator/js/engine/digger.js:605–606,754–781`.

**Correction:**

> Attribute tested/refused counts to the displayed step or the log span since the preceding accepted change.
> Do not call that span one round without reconstructing the actual loop boundaries.
> The other **keep** entries associated with a guided accept remain valid comparison context:
> a round with a keep proceeds to an accept, while a failed round has none.

This witness is a general guided-step text case, not an assertion that the example's 15/5 or the measured
84 jump callouts already have an incorrect count.
Reword `replay.guided.rounds` around accepted removals/choices, or implement an explicitly verified round model.
[E\joint-check-evidence.json]

### M7. Non-guided choice and step text must not invent provenance or randomness

**Where:** definitions/R2/R3/R12/R13/strings, `J:31–35,366–371,378–386,601–614,642–646,988–997,1040–1042,1048–1051`.

**Wrong:** “kept because it passed … no other candidate was compared” is not supported by the log.
Local search compares scores and the keeper can retain a candidate that was not accepted into the current search.
Source: `generator/js/engine/digger.js:1441–1469`.

Also, `kind:'random'` names Stage A, not necessarily a random order.
The engine supports **random, rowByRow, snake, spiral, jumpOne**:
`generator/js/engine/digger.js:79,210–221,829–852`.
A rebuilt Killer log is in group order; adding a rebuilt disclaimer does not make “picked at random” true.

**Correction:**

> Describe a complete **log-derived construction change**, not an unconditionally accepted historical transaction.
> For an exchange/sign/local-search change without a recorded comparison round:
> “The log contains no comparable-candidate scores for this change.”
> Say “picked at random” only for a normal log and a genuinely random configured order.
> Use order-neutral removal text for ordered Stage A and reconstructed logs.
> Reconstructed means “not a record of the original generation order”, not a proof that the orders could never coincide.

Keep the numerical objective explicitly scoped to the generator's check.
Remove affected legacy strings from the blanket “kept as they are” statement at J:1048–1051.
The ordinary non-search reveal contract still remains unchanged.
For the rebuilt-Killer high-level gate, use the **requested** `result.config.difficulty`, not the achieved rating's
level: the keeper can return a puzzle below the requested band.

### M8. Reword the lighter check and preserve the 2–3 visible-sentence limit

**Where:** R11 h/R13/R14/example/string, `J:587–590,623–629,682,824,853,1022,1027,1161–1163`.

**Wrong:** “The lighter techniques alone no longer finish this board” sounds like a statement about all ways
to use those techniques. A bounded deterministic attempt establishes only what this configured solver did.
“No longer” is also unsafe for a same-hardest jump without a corresponding successful before-check.

I approve this replacement **only when a canonical-uniqueness-confirmed board's separate restricted solve returns
`status:'stuck'`**:

**EN**

> In a separate check, this solver stopped before completing the board using only techniques with weights below {w}.

**VI**

> Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới {w}
> và đã dừng khi chưa giải xong đề.

The weight restriction is strict `< w`. Use `SG.logicalSolver.solve` with the applicable lower-weight catalogue,
the existing intrinsic limits and a bounded budget. A guard/cancellation/error is **not** a `stuck` result;
omit the statement in those cases. A completed restricted proof also suppresses it.

Fresh checks on the **13 golden compact jumps** completed all **13 before boards** and stopped on all
**13 after boards**, with no guard failures; after-check time totalled **54.50 ms** in this run.
This agrees with, but does not expand, the peer's observed **84/84** after-board results.
It is not a proof of named-technique necessity: the example still solves without Simple Colouring via W-Wing at
**1113**, and without XYZ-Wing at **1117**.
[E\joint-check-evidence.json; 3-response-to-review.md §1.5]

Put this optional checked observation **inside “Why?”**.
The normal visible example already has three sentences; adding it as a fourth violates Q5 a.
The `parts` cause itself currently has two sentences; join them into one, or budget the other visible sentences
so the total never exceeds three.

### M9. Replace universal claims with their actual evidence and uncertainty scope

**Where:** definitions/executive/diagnosis/R3/audit, `J:31–35,60–71,270–304,387–391,513–527`.

Required corrections:

1. **1849:** replace “never existed for the generator” with:
   “1849 is the rating of the removal-only checkpoint exposed by the replay, not the accepted complete fifth
   change, whose rating is 992.”
   The generator constructs the removal half before adding clues; the log does not prove that the same board
   was never tried elsewhere.
2. **Uniqueness/completeness:** replace the universal bold claim with:
   “All 5911 fresh ratings in the 107-request sample completed and the required uniqueness checks passed.”
   Proposal and minimal-sign acceptance can establish uniqueness without a complete logical proof.
   An abandoned dig and a rebuilt log require the already specified status/provenance handling.
   Sources: `generator/js/engine/digger.js:646–673`;
   `generator/js/variants/greater-than.js:291–300,379–410`.
3. **Stage A:** replace “stops at 38 clues on 9×9; its positions need singles only” with the actual conditional
   hand-over near `max(clueFloor, round(0.47 * cellCount))`, subject to legal removals and score bounds.
   G02 ends at **40 clues**; G09's Stage A already scores **96, 98** with **Cage Combination**.
   Source: `generator/js/engine/digger.js:829–852`.
4. **Multiplicity:** label saturated DFS counts **“at least 2”**, including the table's old steps 11/13/15/17.
5. **Audit:** an unknown/capped intermediate position cannot certify an irreducible gap over all recorded boards.
   Carry the audit's completeness/scope into the explanation; say “among the successfully rated complete positions”
   when that is all that was checked. Do not silently turn an omitted rating into proof that no bridge exists.
6. **Starting clues:** clarify that this is the first rated **move**, not necessarily the first compact screen.
   In G11 the first compact puzzle is m24, **135**, after **23** sign removals; in G12 it is m92, **130**, after
   **91** sign removals. The starting-clue move is visible separately in details.
   “First rated puzzle” labels the first selected puzzle in the current view, without forcing a new compact anchor.

These are scope corrections, not evidence that the measured scores or final puzzles are wrong.

### M10. Label serialized sizes and compact-only diagnostics correctly

**Where:** executive/R15/cost, `J:89–91,694–696,949–966`.

**Wrong:** **3005 / 20068 B** are called analysis “in memory”.
The measurement is `Buffer.byteLength(JSON.stringify(moves.map(ratingJson)))`, not a heap measurement and not
the proposed full R15 payload.
It excludes move/value storage, explanatory probes, first-use findings, model/solver memory and transfer overhead.
Source: `C\xreview\p3-converged.js:145–147,224–226`.

**Correction:**

> Serialized rating-row UTF-8 JSON: median 3005 B, maximum 20068 B.
> This is not total analysis memory. One prototype retained up to 197784 B of value buffers separately;
> production may reduce that by reconstructing snapshots from deltas.
> The full two-view analysis payload/heap has not yet been measured.

The **140.02 ms** explanation sum is **42.87 + 64.37 + 32.78 ms**, for the compact jump checks.
R1 and M1 require both views' explanation work; do not call the compact-only figure the complete two-view cost.
Likewise, **64.66 ms** in §7.3 was my entire 35-request comparison of both phase policies plus details and audits,
not the timing of a single production compact selector.

### M11. Keep mathematical quantities, action words and first-use effects exact

**Where:** R10/R13/R14/strings/examples, `J:560,623–647,665–687,827–837,856–867,1014–1035,1043–1045`.

Required corrections:

- **P is a weight**, not a technique: label it “P, peak technique weight” / “P, trọng số cao nhất”.
  W is the **weighted sum of technique uses**. Say that weighted work grew, not that W itself is a count of
  deductions or that “the solution became much longer”. The same-hardest fallback is unexercised in the
  measured compact jumps; keep its language data-driven.
- A new-hardest row label is conditional on the technique actually being new; M4 specifies the predicate.
- A subset probe can **restore**, not just remove, a clue. Carry the action with the culprit and select
  removing/restoring wording and legend accordingly; never describe adding a value as removing it.
  For unsupported/unverified attribution, use neutral combined-change text and no false frame.
- “Neither clue” is only grammatical for two clues. A four-cell symmetric group also uses the `together`
  branch; use “No individual clue removal …; removing the whole group …”.
- Separate **counted-unit placeholders** from **cell-list placeholders**.
  In particular, use `{removedCells}` / `{restoredCells}` in the callout's change fragment rather than
  assuming the step text's `{removed}` means the same thing. Current formatting treats `removed` as a counted
  unit: `generator/js/ui/player.js:416–441`.
- First-use effects are arrays. Format **every digit/cell pair**, and both placements and eliminations when
  present; do not choose one `{digit}` for the whole finding.
  G09's first Rule of 45 eliminates **2 and 5 at R7C5**; G10's eliminates **1, 6, 7 and 9 at R7C1**.
  These are effects at the cited **logical-proof step**, not marks on the current clue board.

The corrected templates and examples in Appendix A implement these distinctions.

### M12. Correct the inaccurate/unidiomatic Vietnamese and apply matching EN changes

**Where:** `J:797–872,980–1046`, and the “kept” list at `J:1048–1051`.

Semantic blockers include:

- **“phải dùng”** reintroduces the necessity claim rejected in R11 a;
- **“xóa cách”** is not a grammatical description of selecting a removal;
- **“tìm quanh đó”**, **“lần đào bị bỏ”**, and **“cần nhiều công hơn”** are unsuitable literal/jargon translations;
- **“P, kỹ thuật khó nhất”** labels a numerical weight as a technique;
- **“Loại ở đây”** leaves the proof-state scope unclear;
- null-candidate and “no other passed” wording must reflect M5–M6, not merely be polished Vietnamese.

Apply the required semantic/grammar replacements in Appendix A and update both the string table and rendered examples.
Where a valid existing phrase merely has a more fluent alternative, A identifies it as optional polish.
Technique names and the existing logical explanation itself should continue to come from the locale packs.

### M13. Correct the research chronology and distinguish old-rule metrics

**Where:** document index/method, `J:20,132–151`, and claims of a fully agreed implementation spec.

**Wrong:** both cross-reviews did not use a 35-request corpus.

**Correct text:**

> The two cross-reviews compared both proposals on different common corpora:
> gpt-6-astra used 35 requests; claude-opus-5.5 used 104.
> Their intersection is 32 requests and their union is the subsequent 107-request corpus.
> Section 7.3 is the later matched comparison on all 35 of gpt-6-astra's requests.

Those counts were recomputed from the saved request keys.
The independent cross-review summaries and the later joint benchmark should not be conflated.
[E\joint-check-evidence.json]

Until this review and F1 are addressed, retain **draft / pending conditional sign-off** status.
The score sequences are agreed; the current protocol, all-tier counts and pre-click visibility are not yet a
fully signed implementation specification.

## 2. Optional improvements

### O1. Make the final browser-validation recipe reproducible

**Where:** `J:758–764,1083–1132`.

The paths are valid: `player/tests/browser/run-all.js` exists; the generator has `generator/tests.html`,
not an equivalent `generator/tests/browser/run-all.js`.
Record the repository-root server/entry URLs, browser and successful completion, not just that a page opened.
The generator page loads quick suites by default; `?all=1` additionally loads manual suites
(`generator/tests.html:91–98`). Do not accidentally turn the approved one-time full run into repeated heavy runs.
Keep the user's final-validation policy; no such run was performed for this review.

### O2. Adopt the optional fluency edits in Appendix A consistently

**Where:** §6 and §8.

“Trình sinh đề” and “trình tạo đề” are both acceptable; I retain the draft's **trình sinh đề** below to avoid
unnecessary terminology churn. The optional edits improve flow but are not independent mathematical defects.
Use the same accepted copy in the example, key inventory and eventual locale fragment.

### O3. Add a negative unique-culprit fixture rather than copying the old prototype verbatim

**Where:** R14 and test case 8, `J:665–689,1107–1108`.

R14's **exactly one** rule is correct.
I rechecked all 84 compact classifications: **42 culprit, 21 together, 4 parts, 4 single signs, 13 grouped**;
all 42 current culprits are uniquely dominant, so **46 frames** is confirmed.

However, the older research helper used `shares.some(...)`, not a uniqueness test.
A synthetic probe vector in which **two** singleton shares exceed 0.9 must produce **no unique-culprit frame**.
Also test a guarded probe. This is protection against copying old research code, not a correction to the
measured 46.
[E\joint-check-metrics.json; C\xreview\p3-converged.js:133–139]

## 3. F1 — for the user: what is visible before a manual Prepare click?

**Where:** `J:412–418,541,1166–1167`.

Q17 b settles **execution consent**, not pre-click visibility.
The drafter's no-browsing interpretation is reasonable but is not a logical consequence of needing ratings for
compact selection.

| Option | Before the click | After the click |
|---|---|---|
| **A — wait for preparation** | Finished puzzle/Summary remain usable; the replay shows the notice/button, with browsing disabled. | Bounded preparation, then both scored views. |
| **B — permit an explicitly unprepared preview** | If the log exists, allow complete-move details with unprepared status tables and known setup/final data; compact selection remains unavailable. If the log is missing, show only known data and say so. | Same bounded preparation and the same final views. |

Both require **zero automatic main-thread solver/trace-generation calls**; neither may invent intermediate scores.
B requires a distinct **unprepared** status, not “stuck” or “capped”, and clear labelling that the compact plan
has not been prepared. Reconstructing known log changes does not inherently require a solve.

**My disposition:** list A/B for the user rather than recording either as already decided.
This is the only new product choice I am raising. It does not change the prepared golden sequences.

## 4. Appendix A — Vietnamese audit and bilingual replacement copy

The following inventory accounts for every key in the proposed table.
**Required** means the wording or its selection condition must change for the associated M item.
**Polish** means the original is understandable and semantically acceptable.
This is replacement copy for the design, not an instruction to hard-code text outside `SG.i18n.t()`.

### A1. Accepted unchanged, with the specified conditions

| Key(s) | Vietnamese retained | Condition |
|---|---|---|
| `replay.view.details` | Hiện từng thay đổi | A complete move, not a half-exchange. |
| `replay.preparing` | Đang chuẩn bị bảng điểm… {done}/{total} | Real progress, not a promise of successful ratings. |
| `replay.prepare.button` | Chuẩn bị bảng điểm | Explicit foreground consent in main mode. |
| `replay.unit.move_one`, `replay.unit.move_other` | {count} thay đổi | Retain separate EN plural forms. |
| `replay.sign` | dấu giữa {a} và {b} | Use the variant's cell labels. |
| `replay.list.last` | {list} và {last} | Appropriate for the final pair of a list. |
| `steps.techniques.change` | {score} ({change}) | Certified numeric table only. |
| `steps.techniques.unchanged` | {score} (không đổi) | Certified numeric table only. |
| `steps.techniques.newPeak` | Kỹ thuật khó nhất mới | Apply only when the technique is new by R10/M4. |
| `steps.jump.badge` | Điểm tăng vọt ×{ratio} | One decimal rounded down; exact predicate. |
| `steps.jump.heading` | Điểm tăng vọt: {from} → {to} ({change}) | Exact total-score difference. |
| `steps.jump.why` | Vì sao? | A keyboard-accessible disclosure. |
| `steps.jump.total` | Điểm = V + P + R, làm tròn: {from} → {to} ({change}) | Round the total; do not sum rounded display terms. |
| `steps.jump.level` | Mức độ: {from} → {to} | Localized names of the computed levels. |
| `steps.jump.choice.random` | Nhóm này được chọn ngẫu nhiên. | Only a normal log with actual random order, M7. |

The corresponding English is also acceptable, subject to those same conditions.

### A2. Preparation, phase and move text

- **`replay.prepare.notice` — required clarification of consent; fluent replacement.**
  - EN: “This page has no background worker. Press ‘Prepare score tables’ to calculate them on this page;
    the page may stop responding briefly while it works.”
  - VI: “Trang này không có tiến trình nền. Nhấn ‘Chuẩn bị bảng điểm’ để tính ngay trên trang;
    trang có thể tạm thời không phản hồi trong lúc tính.”
  - Use the translated button label, not a second independently translated literal.
    No claim that all `file://` loads lack a worker is needed.
- **`replay.prepare.error` — required scope, M3.**
  - EN: “The replay could not be fully prepared. Available tables are kept; unavailable results show a status.”
  - VI: “Không thể chuẩn bị đầy đủ phần phát lại. Các bảng điểm đã có vẫn được giữ lại;
    kết quả chưa có được thay bằng trạng thái tương ứng.”
  - A fatal normalization failure may leave only known setup/final states; an optional failed probe must not
    produce that same whole-job fallback.
- **`replay.start.noScore` — polish.**
  - EN retained: “No score yet: this is not a puzzle yet.”
  - VI: “Chưa có điểm: chưa có đề để chấm.”
  - Only position 0 before a puzzle exists; not the unprepared case in F1 B.
- **`replay.title.mixed` — polish.**
  - EN retained: “Combined changes”.
  - VI: “Các thay đổi được gộp”.
- **`replay.title.search` — required fluency.**
  - EN: “Adjusting the puzzle”.
  - VI: “Điều chỉnh đề”.
- **`replay.exchange_one` — required neutral construction wording, M7.**
  - EN: “Adjust the clues to look for a higher-scoring puzzle: clear {removed} and restore {revealed}.”
  - VI: “Điều chỉnh số cho sẵn để thử tạo đề có điểm cao hơn:
    bỏ số ở {removed} và khôi phục {revealed}.”
- **`replay.exchange_other` — required neutral construction wording, M7.**
  - EN: “Across {count} complete changes, clear {removed} and restore {revealed}
    while looking for a higher-scoring puzzle.”
  - VI: “Qua {count} thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn,
    tổng cộng bỏ số ở {removed} và khôi phục {revealed}.”
  - Here `{removed}` is a counted cell unit and `{revealed}` a counted clue unit; totals are cumulative,
    not necessarily the net differences framed on the board.
- **`replay.searchRemove` — required fluency.**
  - EN: “Clear {removed} while looking for a higher-scoring puzzle.”
  - VI: “Bỏ số ở {removed} để thử tạo đề có điểm cao hơn.”
- **`replay.folded.peak` — polish.**
  - EN: “Within this step, the score reached {peak}.”
  - VI: “Trong bước này, điểm có lúc đạt {peak}.”
- **`replay.folded.reveal` — polish, with a required factual gate.**
  - EN: “Within this step, the score reached {peak}, above the chosen level,
    and {revealed} were restored during refinement.”
  - VI: “Trong bước này, điểm có lúc đạt {peak}, vượt mức độ khó đã chọn;
    {revealed} đã được khôi phục khi điều chỉnh đề.”
  - Use the above-level clause only when the peak and phase establish it.
    For a different excursion, use neutral peak text plus the actual restore action.
- **`replay.folded.unscored_one`, `replay.folded.unscored_other` — polish.**
  - EN: “1 position within this step could not be rated.” /
    “{count} positions within this step could not be rated.”
  - VI, both forms: “Có {count} trạng thái trong bước này không chấm được điểm.”
- **`replay.restart.folded` — required fluency.**
  - EN: “Before starting again, generation reached {peak} points after {moves}.”
  - VI: “Trước khi làm lại, quá trình tạo đề đã đạt {peak} điểm sau {moves}.”
  - `{moves}` is already a localized counted unit; show a known peak, not a fabricated peak for unscorable states.
- **`replay.rebuilt` — required scope, M7.**
  - EN: “This replay is reconstructed from the finished puzzle's clues;
    it is not a record of the original generation order.”
  - VI: “Bản phát lại này được dựng từ các số cho sẵn của đề hoàn chỉnh,
    không ghi lại thứ tự tạo đề ban đầu.”
- **`replay.clues` — required clarity.**
  - EN: “Clear the grid, then show {clues}.”
  - VI: “Xóa các số trên lưới rồi hiện {clues}.”
  - This describes a net clue-board construction, not a claim that the signs alone solve it.
- **`replay.legend.cause.cell` — polish plus the required action gate, M11.**
  - EN: “Removing this clue causes the score jump”.
  - VI: “Bỏ số cho sẵn này làm điểm tăng vọt”.
- **`replay.legend.cause.sign` — polish.**
  - EN: “Removing this sign causes the score jump”.
  - VI: “Bỏ dấu này làm điểm tăng vọt”.
- **Additional restoration legend, required if a restored culprit is supported.**
  - Proposed key: `replay.legend.cause.restore`.
  - EN: “Restoring this clue causes the score jump”.
  - VI: “Khôi phục số cho sẵn này làm điểm tăng vọt”.
  - Without verified restoration attribution, no culprit frame is preferable to a false removal legend.

### A3. Status and new-technique lines

- **`steps.status.capped` — required fluency and observational wording.**
  - EN: “Not rated: the computational limit for this rating was reached.”
  - VI: “Chưa chấm điểm: đã đạt giới hạn tính toán cho lần chấm này.”
- **`steps.status.stuck` — required scope, M3/M8.**
  - EN: “Not rated: this solver stopped before completing the board.”
  - VI: “Chưa chấm điểm: bộ giải này đã dừng khi chưa giải xong đề.”
  - Append the attempted-row label only when rows exist.
- **`steps.status.ambiguous` — semantically correct; recommended precise wording.**
  - EN: “Not rated: this board has at least two solutions.”
  - VI: “Chưa chấm điểm: đề này có ít nhất hai lời giải.”
- **`steps.status.unverified` — polish; preserve the distinction from ambiguity.**
  - EN: “Not rated: the page could not confirm a unique solution for this board.”
  - VI: “Chưa chấm điểm: chưa xác nhận được đề này có lời giải duy nhất.”
- **Additional attempted-row label, required by M3.**
  - Proposed key: `steps.status.attempted`.
  - EN: “The rows show techniques the solver applied, not a validated difficulty rating.”
  - VI: “Các dòng chỉ ghi những kỹ thuật bộ giải đã áp dụng, không phải kết quả chấm độ khó.”
- **`steps.first.label` — polish.**
  - EN retained: “First rated puzzle”.
  - VI: “Đề đầu tiên được chấm điểm”.
- **`steps.first` — polish, with scope to the displayed view.**
  - EN retained: “First rated puzzle: score {score}.
    The generator's solution uses {technique} as its hardest technique.”
  - VI: “Đề đầu tiên được chấm điểm: {score} điểm.
    Trong lời giải mà trình sinh đề tìm được, kỹ thuật khó nhất là {technique}.”
- **`steps.newPeak` — polish; required neutral use on flat/dropping totals, M4.**
  - EN retained: “The generator's solution now uses {technique} (weight {w}) as its hardest technique,
    instead of {previous} (weight {previousW}).”
  - VI: “Trong lời giải mới của trình sinh đề, kỹ thuật khó nhất là {technique} (trọng số {w}),
    thay cho {previous} (trọng số {previousW}).”

### A4. Visible callout grammar

These fragments are deliberately language-specific. Render `SG.i18n.t()` fragments into the full
`After {change}, …` / `Sau {change}, …` sentence; do not concatenate an English word order in Vietnamese.

| Key | English fragment | Vietnamese fragment |
|---|---|---|
| `steps.jump.change.remove` | the clues at {cells} are removed | khi bỏ số cho sẵn ở {cells} |
| `steps.jump.change.sign` | {sign} is removed | khi bỏ {sign} |
| `steps.jump.change.exchange` | the clues at {removedCells} are removed and those at {restoredCells} are restored | khi bỏ số ở {removedCells} và khôi phục số ở {restoredCells} |
| `steps.jump.change.moves` | the {count} changes in this step | {count} thay đổi trong bước này |

An action-aware renderer needs corresponding singular/restoration forms when those actions occur.
The examples above intentionally describe **clues in cells**, not deletion of cells from the grid.

- **`steps.jump.uses_one` — required removal of necessity language.**
  - EN: “After {change}, the generator's solution uses {technique} once;
    previously, its hardest technique was {previous}.”
  - VI: “Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} 1 lần;
    trước đó, kỹ thuật khó nhất là {previous}.”
- **`steps.jump.uses_other` — same required correction.**
  - EN: “After {change}, the generator's solution uses {technique} {count} times;
    previously, its hardest technique was {previous}.”
  - VI: “Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} {count} lần;
    trước đó, kỹ thuật khó nhất là {previous}.”
- **`steps.jump.work` — required mathematical wording, M11.**
  - EN: “After {change}, the weighted sum of technique uses in the generator's solution
    grew from {from} to {to}.”
  - VI: “Sau {change}, tổng trọng số các lần áp dụng kỹ thuật trong lời giải
    tăng từ {from} lên {to}.”
- **`steps.jump.full` — polish.**
  - EN: “The largest technique weight, {w}, contributes in full as the P term of the score (P = {w}).”
  - VI: “Trọng số cao nhất {w} được tính toàn bộ vào điểm ở thành phần P (P = {w}).”
- **`steps.jump.lighter` — required scope and placement.**
  - Use M8's exact replacement, **inside “Why?”**, only on its verified `stuck` branch.

### A5. Cause copy

All numerical probe claims are gated by certified probe outcomes and the correct action.
The removal forms below must not be used for restoration.

- **`steps.jump.cause.culprit` — fluent removal form.**
  - EN: “Removing the clue at {cell} alone gives {score};
    removing the clue at {other} alone gives {otherScore}.”
  - VI: “Chỉ bỏ số ở {cell} cho {score} điểm; chỉ bỏ số ở {other} cho {otherScore} điểm.”
- **`steps.jump.cause.culpritGroup` — fluent removal form.**
  - EN: “Removing the clue at {cell} alone gives {score};
    removing the other {count} clues without it gives {otherScore}.”
  - VI: “Chỉ bỏ số ở {cell} cho {score} điểm;
    bỏ {count} số còn lại mà không bỏ số ở ô này cho {otherScore} điểm.”
- **`steps.jump.cause.together` — required generalization beyond two cells, M11.**
  - EN: “Removing each clue alone gives {scores}; removing the whole group gives {after}.”
  - VI: “Bỏ riêng từng số cho các điểm {scores}; bỏ cả nhóm cho {after} điểm.”
  - This uses the measured numbers rather than a potentially misleading absolute “not much”.
- **`steps.jump.cause.togetherExchange` — recommended quantified form.**
  - EN: “The separate changes give {scores}; the combined change gives {after}.”
  - VI: “Từng thay đổi riêng lẻ cho các điểm {scores}; thay đổi gộp cho {after} điểm.”
  - Only when every stated probe is verified. Otherwise say why attribution is unavailable.
- **`steps.jump.cause.parts` — required one-sentence form, M8.**
  - EN: “Removing the clue at {cell} alone gives {score}, versus {after} for the whole symmetric group,
    which is always displayed as one complete change.”
  - VI: “Chỉ bỏ số ở {cell} cho {score} điểm, còn cả nhóm đối xứng cho {after} điểm
    và luôn được hiển thị trong một thay đổi trọn vẹn.”
- **`steps.jump.cause.sign` — required action-specific observation, not an optimality claim.**
  - EN: “This step removes one sign; there is no smaller sign-removal move to show.”
  - VI: “Bước này bỏ một dấu; không có thay đổi bỏ dấu nhỏ hơn để hiển thị.”
- **`steps.jump.cause.cell` — required action-aware form.**
  - EN removal: “This step removes one clue; there is no smaller clue-removal move to show.”
  - VI removal: “Bước này bỏ một số cho sẵn; không có thay đổi bỏ số nhỏ hơn để hiển thị.”
  - Restoration needs “restores” / “khôi phục”, not the removal form.
- **`steps.jump.cause.grouped` — polish and explicit transition scope.**
  - EN: “Within this step, {technique} first appears after complete change {k} of {n} ({change}).”
  - VI: “Trong bước này, {technique} xuất hiện lần đầu sau thay đổi trọn vẹn thứ {k}/{n} ({change}).”
  - Do not fill `{k}` from a failed/unrated intervening position or claim the earliest use outside this step.

### A6. Formula disclosure

These are labels for scalar values, not technique names:

- **`steps.jump.p` — required.**
  - EN: “P, peak technique weight: {from} → {to} ({change})”.
  - VI: “P, trọng số cao nhất: {from} → {to} ({change})”.
- **`steps.jump.r` — required precision.**
  - EN: “W, weighted sum of technique uses: {wFrom} → {wTo};
    R = 0.25 × P × log₂(1 + W ÷ P): {from} → {to} ({change})”.
  - VI: “W, tổng trọng số các lần áp dụng kỹ thuật: {wFrom} → {wTo};
    R = 0,25 × P × log₂(1 + W ÷ P): {from} → {to} ({change})”.
- **`steps.jump.v` — polish.**
  - EN: “E, number of empty cells: {eFrom} → {eTo};
    V = 80 × E ÷ (E + 40): {from} → {to} ({change})”.
  - VI: “E, số ô trống: {eFrom} → {eTo};
    V = 80 × E ÷ (E + 40): {from} → {to} ({change})”.

Keep the `P=0 → R=0` special case in the computation and any expandable formula help;
do not literally evaluate division by zero for setup states.

### A7. Generator-choice disclosure

All changes here address M5–M7, not just style.
Do not silently expand “the generator's check” into the full replay-rating objective.
Here “limited” refers to the generator's recorded check configuration, not exhaustion of the replay's work guard.

- **`steps.jump.choice.guided` — required scope and round correction.**
  - EN: “The log records {rated} candidates before this accepted removal, with {refused} rejected;
    the other {others} candidates with completed scores reached at most {max} by the generator's limited check.”
  - VI: “Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó {refused} bị loại;
    {others} phương án khác có điểm sau phép kiểm tra giới hạn của trình sinh đề đạt cao nhất {max} điểm.”
  - If `{rated}` already includes a pluralized “possible removals” unit, omit the extra literal “candidates” /
    “phương án”; keep the schema's count and display-unit types explicit.
  - The span and candidate records must actually support these counts.
- **`steps.jump.choice.nulls` — required null meaning.**
  - EN: “The limited check did not finish the boards for {nulls} other retained candidates,
    so they have no numerical check score.”
  - VI: “Với {nulls} phương án khác được giữ lại, phép kiểm tra giới hạn chưa giải xong đề,
    nên các phương án đó không có điểm kiểm tra.”
- **`steps.jump.choice.only` — required branch gate.**
  - EN: “The log records no other retained removal candidate for this choice.”
  - VI: “Bản ghi không có phương án bỏ số nào khác được giữ lại cho lần chọn này.”
  - Only when the number of **all** other retained candidates is zero, not merely the numerical count.
- **New `steps.jump.choice.noScores` — required null-alternative fallback.**
  - EN: “No numerical score from the limited check is available for the other candidates.”
  - VI: “Không có điểm từ phép kiểm tra giới hạn để so sánh với các phương án khác.”
- **New `steps.jump.choice.chosenUnscored` — required chosen-null fallback.**
  - EN: “The generator's limited check did not finish the board after the chosen removal.”
  - VI: “Phép kiểm tra giới hạn của trình sinh đề chưa giải xong đề sau lần bỏ số được chọn.”
- **`steps.jump.choice.checked` — required removal of invented comparisons.**
  - EN: “The log contains no comparable-candidate scores for this change.”
  - VI: “Bản ghi không có dữ liệu so sánh các phương án cho thay đổi này.”
- **`steps.jump.choice.none` — required scope.**
  - EN: “This step combines {count} changes; it is not a single candidate-comparison round.”
  - VI: “Bước này gồm {count} thay đổi; nó không tương ứng với một vòng so sánh phương án duy nhất.”

A rebuilt log suppresses original-choice claims entirely.
If the narrative lists a numerical full rating next to a limited-check maximum, label the two objectives separately.

### A8. First use and scope

- **`steps.jump.firstUse` — recommended disambiguation.**
  - EN: “First use in the generator's solution: logical deduction {k} of {n}.”
  - VI: “Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận {k}/{n}.”
- **`steps.jump.removedHere` — required proof-state scope and candidate wording.**
  - EN: “In that deduction, candidate {digit} is removed from {cells}.”
  - VI: “Ở bước suy luận đó, loại ứng viên {digit} khỏi {cells}.”
- **`steps.jump.placedHere` — required proof-state scope.**
  - EN: “In that deduction, {digit} is placed in {cell}.”
  - VI: “Ở bước suy luận đó, điền {digit} vào {cell}.”
  - Repeat/group the appropriate clauses for every effect; do not discard different digits or an effect type.
- **`steps.jump.scope` — polish.**
  - EN retained: “These numbers describe the generator's solution, not every way to solve the puzzle.”
  - VI: “Các con số này mô tả cách giải mà trình sinh đề tìm được,
    không đại diện cho mọi cách giải đề.”

The quoted Simple Colouring proof paragraph in §6.2 is a correct reuse of the current
`technique.simpleColouring.step` family (`generator/js/ui/locale.vi.js:388–396`).
Keep it localized through the solver's key/arguments.
It is **logical deduction 32 of 47**, not replay step 32 and not index 32.

### A9. Existing strings and the seven example rows

The blanket instruction to retain all old strings needs exceptions for objective/provenance and fluent wording:

- `replay.title.guided`: prefer **“Choosing clues to remove” / “Chọn số cho sẵn để bỏ”**.
  Do not title a local-search exchange “Hardest removal”.
- `replay.guided`: “Compare {rated} ({refused} rejected) and choose the removal preferred by the
  generator's check: {cellList}.” /
  “Xét {rated} ({refused} bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề:
  bỏ số ở {cellList}.”
- `replay.guided.rounds`: describe **accepted removals/choices**, not inferred round counts, M6.
  “Across {rounds} accepted removals, compare {rated} ({refused} rejected); the removed clues are at {cellList}.” /
  “Qua {rounds} lần chọn phương án bỏ số, đã xét {rated} ({refused} bị loại);
  các ô được bỏ số là {cellList}.”
- `replay.random.*`: retain random wording only when true; use order-neutral counterparts for configured
  nonrandom orders and rebuilt logs. Their caption must not contradict a reconstruction disclaimer.
- `replay.reveal.search`: replace “tìm quanh đó” with explicit adjustment language;
  for example “Khôi phục {revealed} để thử tạo đề có điểm cao hơn.”
- `replay.restart`: the existing “đào lại” can be replaced by “bắt đầu lại” / “tạo lại đề”.
  State the actual recorded reason, not a generic failed-score story.

Here is the complete corrected Vietnamese compact-step copy for the example:

1. **Accepted:** “Điền kín lưới bằng một lời giải ngẫu nhiên tuân theo mọi luật (81 ô).”
2. “Bỏ số ở 14 ô được chọn ngẫu nhiên: đề vẫn giải được khi thiếu các số đó. —
   Đề đầu tiên được chấm điểm: 23 điểm. Trong lời giải mà trình sinh đề tìm được,
   kỹ thuật khó nhất là Ô một ứng viên (Naked Single).”
3. “Thử bỏ số ở 35 ô được chọn ngẫu nhiên: bỏ được số ở 29 ô và khôi phục số ở 6 ô,
   vì bộ giải chưa giải xong đề bằng các kỹ thuật của mức này khi thiếu các số đó.”
4. “Xét 15 cách bỏ số (5 bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề:
   bỏ số ở R1C2 và R9C8.” Then the callout in A10.
5. “Qua 3 lần chọn phương án bỏ số, đã xét 17 cách (6 bị loại);
   các ô được bỏ số là R3C3, R7C7, R3C9, R7C1, R4C1 và R6C9.”
6. “Qua 5 thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn, tổng cộng bỏ số ở 10 ô và khôi phục 10 số cho sẵn. —
   Trong lời giải mới của trình sinh đề, kỹ thuật khó nhất là XYZ-Wing (trọng số 750),
   thay cho Tô màu đơn giản (Simple Colouring) (trọng số 360).”
7. **Accepted:** “Đề hoàn chỉnh: 30 số cho sẵn.”

Make matching English changes to rows 3–6: a stopped configured solver rather than a general impossibility,
an objective-scoped choice, counted accepted changes rather than guessed rounds, and complete construction changes
rather than an asserted five accepted search transactions.
Keep the **7-step sequence `0, 23, 44, 551, 568, 992, 992`**.
The last complete exchange is still **568 → 992**, has no Q4 badge, and does get its new-technique line.

### A10. Corrected example callout, with three visible sentences

**English**

```text
Step 4 — Choosing clues to remove                             [Score jump ×12.5]
Compare 15 possible removals (5 rejected) and choose the removal preferred by the generator's check:
R1C2 and R9C8.

Score jump: 44 → 551 (+507)
After the clues at R1C2 and R9C8 are removed, the generator's solution uses Simple Colouring
2 times; previously, its hardest technique was Naked Single.
The largest technique weight, 360, contributes in full as the P term of the score (P = 360).
Removing the clue at R1C2 alone gives 550; removing the clue at R9C8 alone gives 44.

Why?
  P, peak technique weight: 1 → 360 (+359)
  W, weighted sum of technique uses: 43 → 768.25
  R = 0.25 × P × log₂(1 + W ÷ P): 1.36 → 148.32 (+146.96)
  E, number of empty cells: 43 → 45
  V = 80 × E ÷ (E + 40): 41.45 → 42.35 (+0.91)
  Score = V + P + R, rounded: 44 → 551 (+507)
  Level: Very easy → Hard
  The log records 15 candidates before this accepted removal, with 5 rejected;
  the other 9 candidates with completed scores reached at most 45 by the generator's limited check.
  In a separate check, this solver stopped before completing the board
  using only techniques with weights below 360.
  First use in the generator's solution: logical deduction 32 of 47.
  [The existing localized Simple Colouring proof paragraph.]
  In that deduction, candidate 3 is removed from R5C2 and R8C3.
  These numbers describe the generator's solution, not every way to solve the puzzle.

Table: Naked Single 32; Hidden Single (box) 13; Simple Colouring 2 [New hardest technique].
Empty cells 45; Total 551 (+507).
Board legend at R1C2: Removing this clue causes the score jump.
```

**Vietnamese**

```text
Bước 4 — Chọn số cho sẵn để bỏ                               [Điểm tăng vọt ×12,5]
Xét 15 cách bỏ số (5 bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề:
bỏ số ở R1C2 và R9C8.

Điểm tăng vọt: 44 → 551 (+507)
Sau khi bỏ số cho sẵn ở R1C2 và R9C8, lời giải mà trình sinh đề tìm được dùng
Tô màu đơn giản (Simple Colouring) 2 lần; trước đó, kỹ thuật khó nhất là Ô một ứng viên (Naked Single).
Trọng số cao nhất 360 được tính toàn bộ vào điểm ở thành phần P (P = 360).
Chỉ bỏ số ở R1C2 cho 550 điểm; chỉ bỏ số ở R9C8 cho 44 điểm.

Vì sao?
  P, trọng số cao nhất: 1 → 360 (+359)
  W, tổng trọng số các lần áp dụng kỹ thuật: 43 → 768,25
  R = 0,25 × P × log₂(1 + W ÷ P): 1,36 → 148,32 (+146,96)
  E, số ô trống: 43 → 45
  V = 80 × E ÷ (E + 40): 41,45 → 42,35 (+0,91)
  Điểm = V + P + R, làm tròn: 44 → 551 (+507)
  Mức độ: Rất dễ → Khó
  Bản ghi có 15 phương án trước lần bỏ số được chọn này, trong đó 5 bị loại;
  9 phương án khác có điểm sau phép kiểm tra giới hạn của trình sinh đề đạt cao nhất 45 điểm.
  Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới 360
  và đã dừng khi chưa giải xong đề.
  Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận 32/47.
  [Đoạn giải thích Tô màu đơn giản đã có trong bản dịch của bộ giải.]
  Ở bước suy luận đó, loại ứng viên 3 khỏi R5C2 và R8C3.
  Các con số này mô tả cách giải mà trình sinh đề tìm được, không đại diện cho mọi cách giải đề.

Bảng: Ô một ứng viên (Naked Single) 32; Số đơn ẩn trong khối (Hidden Single) 13;
Tô màu đơn giản (Simple Colouring) 2 [Kỹ thuật khó nhất mới]. Ô trống 45; Tổng 551 (+507).
Chú giải tại R1C2: Bỏ số cho sẵn này làm điểm tăng vọt.
```

The bracketed solver paragraph stands for the unchanged localized paragraph already reproduced in J:833–837 /
J:863–867, not a proposed literal UI string or an extra proof-on-board view.
Only the three sentences above “Why?” form the visible callout; ordinary step text remains separate.
Numeric term deltas are rounded **after subtraction**:
V's exact change is approximately **0.907158**, hence **+0.91**, not 42.35 − 41.45 = 0.90.

## 5. Evidence, integrity and sign-off condition

New external evidence:

- `E\joint-check-evidence.cjs` / `E\joint-check-evidence.json`: string inventory, transition collisions,
  13 before/after lighter checks, corpus intersections and the multi-round log-window witness.
- `E\joint-check-metrics.cjs` / `E\joint-check-metrics.json`: unique-culprit recount, flat/decreasing
  new-technique lines and the two-view jump union.
- `E\joint-check-cache.cjs` / `E\joint-check-cache.json`: fake-client main-mode cache reproduction; no actual generation.
- `E\joint-check-preservation.json`: hashes of the draft and earlier research files.
- `E\joint-check-verification.json`: final integrity and document checks.

No full corpus was regenerated; no heavy or browser test was run.
The source inspection confirms the worker, cache, test-page and browser-runner paths.
I have not edited the draft or substituted my corrections into it.

Start and end `git --no-pager status --short`:

```text
?? docs/generation-steps/
```

HEAD remains `8d9510aade5d99f4fec9fda3835245a31f411ede`; tracked and staged diffs are empty.
The **9 protected files** remain byte-identical.
This new check uses CRLF, UTF-8 without BOM, relative repository links and experiment notation only.

**Conditional sign-off:** I will sign the corrected research report once M1–M13 are applied and checked.
F1 must be answered by the user or explicitly remain a pending product decision that blocks the corresponding
implementation choice. I do not sign the current draft as a completely settled implementation specification.
