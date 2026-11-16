# MS13b — Read and display version-2 group proofs

| Header | Value |
|---|---|
| Depends on | MS13a accepted |
| Size / active time | Medium; 35-50 minutes |
| Owner / milestone | Both app proof consumers; M13b |
| Authority | R16/R10; SA2 pre-final-gate rulings below |
| Status | Not started |

## Goal & business context

Prepare truthful group-proof formatting and digit localization while retaining every legacy
singleton example. No grouped finder is active yet.

## Scope

In: Player argument localization/highlights, both i18n chain formatters, mixed/legacy tests/docs,
the group-aware locale wording below and one short, verified MS13b notes entry.
Out: solver activation, new IDs, production synthetic examples or rating changes.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. EN+VI descriptions, existing symbol formatters, CRLF.

## Inputs & context

R16, verbatim:

```text
i18nArgs = {
  proofVersion:2, kind, length,
  chains: [ [ {cells:[...], digit, truth:0|1}, ... ], ... ]
}
```

> Legacy singleton triples remain readable; pure singleton findings may keep their old representation.
> Format group truth as a disjunction of its member candidates; group false means every member is false,
> not a disjunction of inequalities. Label every member, preserve Wordoku/hexadecimal digit display and
> highlight all proof cells.

Support both numeric raw group nodes and Player-localized `{cells:[labels],digit:displayValue,truth}`.
True group text: `(R1C1=5 ∨ R1C2=5)`; false: `(R1C1≠5 ∧ R1C2≠5)`. Mathematical join symbols need
no language-specific "or" token. Preserve existing `⇒` path and `|` two-path separators.
Do not mutate Finding args during localization; never turn a group into one guessed cell.
The existing step keys stay; update both languages' descriptions to explain group truth and bounded
grouped coverage, without claiming that the existing `forcingChain` has a new work cap.

### GC-01 / S-AV36 handoff — SA2, 2026-11-17

The MS13a census exposes a conflict between MS13c's proposed shared 50,000-work cap and MS07b's
accepted IR54 policy (`forcingChain` unbounded in work, with parent budget/cancellation intact).
The owner question **GC-01** is recorded in the MS13c brief; its answer and the corresponding pack
amendment are prerequisites for **MS13c dispatch**, not for this inactive consumer task.
Do not implement or advertise either a whole-ID cap or a singleton fallback here. Document the
inactive proof-format support and the existing live policy, not an unapproved proposal as product
behavior. Continue to accept legacy triples and v2/mixed proofs under either eventual choice.
Carry **S-AV36** (group construction cost/caps) to MS13c and the final cost/audit owners; no census,
limit selection, new measurement campaign or engine change is assigned to MS13b.

Baseline anchors:
`player/js/ui/play.js:226-245` (`function localizeArgs`);
`player/js/ui/i18n.js:240-246` and `generator/js/ui/i18n.js:252-258` (`function formatChains`).

### SA2 rulings before final gates — 2026-11-17

These resolve the developer's five questions. Grouped finders remain inactive; GC-01 is still
unanswered and neither activation policy is selected. No engine, limit, ID, weight, window,
canonical E fixture or help-example snapshot change is authorized.

1. **One-cell v2 node: accept (a).** It reads exactly like the corresponding legacy literal:
   `R1C2=1` or `R1C2≠1`, without parentheses. A multi-member node always has parentheses,
   with `∨` for true and `∧` for false. Keep raw/localized, mixed-path, Wordoku/hex and
   ownership tests. This is rendering, not permission to shrink a genuine multi-member node.

2. **Descriptions: choose (b), conditional wording; also correct the subtype explanations.**
   The proof format can represent groups, but a live finder does not emit them yet.
   "Intermediate commits are not deployed" does not justify describing inactive solver
   capability as live. Keep the existing introduction and length-window/limited-coverage
   wording, without a new work-cap or fallback claim, and use these conditional clauses
   in both apps:

   - EN, short description: **"If a proof step represents a group, it lists the cells that can
     still hold one digit where a box (or region) meets a row or column."**
   - VI: **"Nếu một bước chứng minh biểu diễn một nhóm, bước đó liệt kê các ô còn có thể chứa
     cùng một chữ số tại giao của một khối (hoặc vùng) với một hàng hoặc cột."**
   - EN, long description: **"If a proof step represents a group, its truth and falsehood
     have the same meaning as in a Forcing Chain."**
   - VI: **"Nếu một bước chứng minh biểu diễn một nhóm, ý nghĩa đúng và sai của nhóm giống
     như trong Chuỗi suy luận."**

   Retain the true-disjunction/false-conjunction examples and the rule that a true group
   does not choose a member. For the endpoint condition use **candidate conflict**, not just
   seeing cells: different candidates of the same cell also conflict, while `model.peers`
   does not include that cell itself.

   - EN: **"Any candidate removed by the endpoint rule must conflict with every candidate
     represented by each end."**
   - VI: **"Ứng viên bị loại theo quy tắc hai đầu phải xung đột với từng ứng viên được biểu
     diễn ở mỗi đầu."**

   **The step keys stay; their values need not stay singleton-only.** For both forcing IDs,
   preserve each existing prefix through `{chains}. ` (including `{length}`) and replace the
   following body with the corresponding text below, in both apps:

   | Subtype | EN body |
   |---|---|
   | `endpoints` | If the first end is false, the last end is true, so at least one end is true. Candidates that conflict with every candidate represented by each end are removed. |
   | `contradiction` | If the first candidate were true, a statement about a candidate or group would be both true and false, which is impossible. So the first candidate is false and is removed. |
   | `forced` | If the first candidate were false, a statement about a candidate or group would be both true and false, which is impossible. So the first candidate is true and is placed. |

   | Subtype | VI body |
   |---|---|
   | `endpoints` | Nếu đầu thứ nhất sai thì đầu cuối đúng, nên ít nhất một đầu là đúng. Các ứng viên xung đột với từng ứng viên được biểu diễn ở mỗi đầu đều bị loại. |
   | `contradiction` | Nếu ứng viên đầu tiên đúng thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không thể xảy ra. Vậy ứng viên đầu tiên sai và bị loại. |
   | `forced` | Nếu ứng viên đầu tiên sai thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không thể xảy ra. Vậy ứng viên đầu tiên đúng và được điền vào. |

   Endpoint roots may be groups; forced/contradiction roots remain singleton candidates.
   Their contradictory internal node may be a group, so its opposite truths must not be
   described as an identified individual candidate appearing with both polarities.
   These statements are also true of legacy proofs. No new key, placeholder or Finding
   field is needed. Retain the existing symbolic formatter and test these semantics on
   the valid group-endpoint and group-contradiction vectors, not only description strings.

   **Differential accounting changes intentionally.** The locale-value allowlist is now
   the two IDs' `.desc` and `.step.endpoints/.contradiction/.forced` in EN/VI in both apps:
   **32 locale entries**, instead of the preliminary eight. Record the exact old/new texts;
   all other locale values must remain equal. Do not claim all rendered legacy explanations
   are byte-identical after an authorized wording change. Conversely, do not ignore every
   render under a changed key: compare legacy formatter/localization output with the **same
   locale templates in both contexts**, separately from the actual locale-text differences.
   Preserve equality of engine Findings, observer records and ratings. This permits wording
   changes, not changed digits, cells, polarities, paths, actions, or canonical GH/E data.

3. **Guide/design statements: reword for scope, not to discard the shared-attempt rule.**
   SA1 is right that sharing the allowance **within the grouped attempt** is common to both
   GC-01 options. The ambiguity is treating it as the already-decided cap of the entire
   `forcingChain` call. Keep the inactive builder's actual 50,000/4,096 defaults and its
   no-reset handoff. Replace the ambiguous MS13a sentences in the two developer guides and
   both occurrences in Generator design with this qualification (one full explanation plus
   a clear cross-reference is sufficient within the same paragraph):

   **EN:** "The grouped attempt in MS13c shares one work allowance between construction and
   search, starting at 50,000, without resetting it between stages. This does not decide the
   whole-call policy for `forcingChain`: GC-01 still awaits the owner's choice of a singleton
   fallback with unbounded local work or a cap on the whole call. No grouped finder or
   fallback is active yet; parent budgets and cancellation remain in force."

   **VI:** "Lần thử đồ thị nhóm trong MS13c dùng chung một giới hạn công việc cho dựng đồ thị
   và tìm kiếm, ban đầu là 50.000, không đặt lại giữa hai giai đoạn. Điều này không quyết định
   chính sách cho toàn bộ lần gọi `forcingChain`: GC-01 vẫn chờ chủ sở hữu chọn đường dự phòng
   trên đồ thị ứng viên đơn không giới hạn công việc cục bộ hoặc giới hạn cho toàn bộ lần gọi.
   Hiện chưa có bộ tìm chuỗi nhóm hay đường dự phòng này hoạt động; ngân sách của bên gọi và
   việc hủy vẫn được giữ nguyên."

   Keep the existing fact that grouping concerns forcing/Long, not XY. This is a living-doc
   clarification, not a limit adjustment, an owner answer or a rewrite of MS13a's historical
   evidence/execution log. If GC-01 is answered before closure, use only its recorded amended
   contract; never infer an answer from these sentences.

4. **Highlights: accept (a); do not derive a second cell set from `chains`.** `Finding.cells`
   is the producer's contract; `buildHint` copies it, `describeHint` lists it, and both snapshot
   and live rendering use that list for pattern-cell membership. Targets remain separate.
   MS13c must emit the full sorted union, checked independently by `SG.chainProofs`.
   Keep the existing consumer assertions on the **cells line** for every proof member and
   the **action** for every elimination target, plus non-mutation. Do not silently repair a
   missing producer cell in the UI. Accept the unchanged renderer's inspected data flow;
   record that DOM/SVG marking was not executed. No new DOM implementation, browser gate
   or claimed runtime rendering coverage is required by this ruling.

5. **Notes: permit the requested short entry; add it to this task's file list.** Append one
   MS13b section to `docs/difficulty-v3/notes.md`, describing the new inactive proof-format
   support and intentional locale wording, with links to final evidence. Claim unchanged
   compared ratings/wires/analyses/hashes only after the relevant final checks pass; distinguish
   unchanged engine/canonical data from changed human-readable text. State the actual GC-01
   status, no finder activation and no applied work-policy/limit change. Do not rewrite
   earlier entries, register a decision, invent a reclassification or add a new measurement.
   The short user-guide addition is accepted in EN and VI, phrased conditionally:
   **"If a chain step represents a group..."** / **"Nếu một bước trong chuỗi biểu diễn một
   nhóm..."**; explain true as at least one member and false as every member false, without
   implying that a true group identifies a cell or that grouped search is live.

### Final-source E and protocol — same ruling

The proposed **five fresh wires + fourteen fresh analyses + retained hash-ledger merge-check**
is correct for this file surface. `replay-fixtures.js::nodeEnv.identity` includes the Generator
runner's UI source files; `replay-goldens.js` uses the same recorder identity. Their Generator
formatter/locale changes require whole-family current-source records. `perf.js::engineFiles`
excludes `js/ui` and `js/worker`, and `hashIdentity` hashes the remaining sources plus its named
helper/tool files; none is changed here. Preserve the accepted MS13a ledgers and their provenance,
and merge-check **all 520 keys** against final current required identities, without regeneration
solely for a new task/commit.

This is conditional on the actual frozen source: if a required identity does change, refresh
that complete affected family by the existing rule, never retag or bypass it. Verify the fresh
five wires against the unchanged canonical fixture before recording the fourteen analyses.
All three merge-checks must pass with no canonical writes or `--update-hashes`. The authorized
locale wording is not permission to refresh a wire, analysis, hash, help-example snapshot or
unrelated pin. Finish complete GH `--check`, final-source mutations/differentials, both quick
sets and CI. The eventual SA1 implementation review remains required.

Record the three unlocked `render-diff` trials and one unlocked `locale-diff` trial as protocol
deviations; retain their real identities/outcomes and known timings (one was 14.2 seconds),
mark unknown timings unknown, and do not retroactively label them locked or final acceptance
evidence. Read-only/no-generation is not an exemption from the >10-second locking rule.
Run the final comparisons and full mutation list under `Invoke-Dv3Node`, after all edits;
all further potentially >10-second payloads use the lock, existing admission/ceiling and gap.
This honest correction adds no owner stop, new S-AV item, evidence class or speculative rerun
campaign. Carry S-AV36 and the inherited item list; do not claim every development trial was locked.

## Files to create/modify

- `player/js/ui/play.js`; both apps' `js/ui/i18n.js`, affected locale descriptions/help.
- Player play/i18n/help and Generator i18n/format/help suites.
- Both app designs' proof/hint sections and both user/developer guides.
- One short, final-evidence-linked MS13b entry in `docs/difficulty-v3/notes.md`, as ruled above.

## Implementation steps

1. Branch on literal shape while preserving old triples.
2. Localize every group digit/cell using the board's existing symbol/label APIs.
3. Format truth/false correctly; show the complete Finding.cells union.
4. Add raw/localized/mixed/legacy/Wordoku/hex vectors and non-mutation checks.
5. Apply the conditional descriptions and group-correct subtype wording, qualify the pending
   GC-01 documentation, and separate unchanged-data evidence from the approved text changes.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13b-B01 | Displayed false group means every member is false |
| MS13b-B02 | Old puzzles/examples and nonnumeric symbols remain readable |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13b-T01 | proofVersion 2 and legacy paths format without lossy singleton conversion |
| MS13b-T02 | Wordoku/hex, every member highlight and retained input ownership pass |
| MS13b-T03 | Both locale/help sets and both quick sets pass; solver still inactive |

## Test plan

Generator `node tests\node-runner.js --suite=i18n,format,help`;
Player `node tests\node-runner.js --suite=play,i18n,help`; then both quick sets.
Test a two-path contradiction mixing singleton/group nodes, false group conjunction, true
disjunction, a hex value 1 displayed 0, Wordoku letters and another call not mutating saved args.
No qualification/performance/discovery gate or synthetic canonical help entry. Apply check-list
section 7's source-aware inactive E closure: retain still-current ledgers, but if an E family's
required identity changes, record that whole family on final source and merge-check without
changing canonical outputs. All three E merge-checks and complete GH check must be green;
the later MS13c activation does not waive this task's own closure.

## Definition of done & handoff

MS13c may activate only after both consumers accept the new proof and GC-01 has an owner answer
incorporated into the pack. Report exact display vectors and carry S-AV36; do not infer a resolved
activation policy from successful formatting tests.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness/evidence corruption or changing a recorded
decision; performance/availability is a named numerical item for MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any authorized new suite owns its r6c CI group/manifest entry too.
No new slow-cell evidence/tooling class. Return the inherited/new item list and legacy/group display proof.

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
