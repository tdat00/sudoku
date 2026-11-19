# MS18d — Second halt: B3 history repair and separate Q2 admission decision

**Campaign paused pending B3 review/freeze and the joint F4 disposition below.
No retry or third admission is authorized.**
SA2 ruling for SA1 concurrence, updated 2026-11-19 after the B3 preparation:

- **Keep the writer as built: `at`, no `finished`.** A no-lock event is not a
  release. This supersedes item 4 of the earlier ruling.
- **B3 is the history repair only**, retaining the original manifest and
  two-admission cap. It need not wait for Q2; after its release gates, continue
  the **other 91 chunks** in their original relative order.
- **Q2=A, if actually approved:** defer the single a3 until those chunks are
  disposed, under a separately reviewed **B4**, not an expanded B3.
  The conditional developer specification is
  **[MS18d-epoch4-a3-exception.md](MS18d-epoch4-a3-exception.md)**.
- **Q2=B:** still run those other 91 chunks under B3, then the required final
  check-only merge; mega16/easy stays incomplete and the 79/79 gate fails.

The owner decides whether a3 exists, not whether already-authorized unrelated
chunks can continue after a safe technical repair. SA1 concurrence and the
orchestrator's committed disposition remain required; this pack amendment is
not a claim that the prepared B3 code has passed its final review.

## Facts and evidence disposition

- B2 **`b6de2c46e73581f54e61f1ece92a360dd9879736`**, H2
  **`bd6949efbef5aa7bc827324405faf5c3aa68ab248f09bba07daf1dc55504c0ae`**;
  declaration/proof commit **`42533fcc63eda15ed177223588f59dec675cf06f`**.
- **22 successful chunks / 950 requests remain unchanged.** No new GP
  measurement ran in either mega16-easy hold.
- **a1 was a legitimate additional-consumer hold**, EventLog/svchost 3640 at
  0.924 CPU-s/s, not a tooling defect.
- The earlier 19:09 pre-window give-up consumed **zero** admissions and wrote
  C-log **line 24**, `type:"pre-window-hold"`, with `at` but no `finished`.
- The real **a2 folder now exists**. It is an acquisition `control-hold`,
  exit 64, `payloadStarted:false`, non-eligible, with
  `historyProblems:["C:24: no usable finished time"]`. The watch/slot were
  otherwise valid (62 checks, max interval 269 ms, start delay 143 ms).
  There is no admission/readiness record or GP payload output.
- C-log **line 25** records this a2's actual finish/release:
  **20:50:13.562 / 20:50:13.563 +07:00**.
  Under F2, **both admissions are now consumed**, although both payloads
  were unstarted. That is different from the earlier no-folder watch.

**Checkpoint committed:** **`ed95a1f0caf127cbc3c37c63cb41df8c17c7f06a`**
preserves the complete a2 directory and append-only C log as observed.
Do not edit line 24, add a fictitious release, delete/rename a2, truncate the
log or overwrite either epoch record/manifest. B3 must descend from this
checkpoint; it is not a fresh campaign or a reset of the attempt count.

## Correct fix — classify non-acquisition events before release parsing

The defect is in **`release-history.js::fromLog`**, which treats every row as
a release and requires `finished`. **`acquisition.js` correctly fails closed**
on its `history.problems`; do not weaken that decision to ignore problems,
hard-code line 24 or accept unknown history.

Prepare, under the lock and without real GP:

1. In `release-history.js`, recognize the valid F1 **`pre-window-hold`**
   event class **in the C log only** as **no lock acquired, no release to
   collect**. Skip it before requiring/parsing release timestamps.
   Preserve/audit the ignored event references (`skippedLines`/`skippedEvents`);
   do not silently ignore malformed/unknown rows or ordinary real-run rows
   missing a valid `finished`. A matching type alone is insufficient.
2. Recognize historical/current writer forms, including
   `heldAt:"foreign-lock-watch"` and `"pre-window-recheck"`, by their typed
   no-acquisition semantics. Do not infer the old event's meaning from whether
   a same-named a2 directory exists **later**: line 24 preceded line 25.
   Contradictory claims of an acquired lock/payload are not an ignorable event.
3. Apply the same semantic exclusion in the wrapper's **`Get-LastReleaseC`**
   courtesy reader. A pre-window event is not a release even if it has a
   timestamp. Do not substitute `at` as a release or supply a filtered
   replacement C log to the rest of the system.
4. **Keep the prepared B3 writer unchanged:** future give-up rows carry
   **`at`** and explicit **`lockAcquired:false`, `admissionConsumed:false`,
   `payloadStarted:false`**, but **no `finished`**. Reserve the real-run
   `finished` field for the helper-return/release path. Readers accept a
   structurally valid historical/diagnostic pre-window row with or without
   `finished`, but never treat either timestamp as a release. This reverses
   the previous diagnostic-field suggestion; no writer change or re-freeze
   is required for this wording decision.
5. Keep acquisition thresholds, watch cadence, 450/540, CPU rules, current
   admission counts and every raw measurement unchanged.
6. Keep the prepared fail-closed history/status checks **before** the watch
   and folder. Only the cheap fingerprint/freshness check follows the watch;
   do not reintroduce B1's expensive post-watch checks. Untracked output is
   allowed only within declared run directories actually named by the C log;
   a modified C log must retain its committed bytes as an exact prefix.
   No general dirty-tree exception follows.

This technical repair does not need an owner timing-policy waiver, but it does
need **SA1/SA2 agreement, tests, a new freeze and epoch review before use**.
It does not itself permit an a3 or release the current F4 stop.

Tests must use retained data/stand-ins, not another real acquisition:

- replay the **first 24 lines as the pre-a2 history**: exclude line 24,
  retain line 23 as the latest C release, and retain every real history error;
- parse the **current 25-line history**: exclude only the non-acquisition
  event and recognize line 25's actual release;
- old/new typed pre-window rows, with/without diagnostic `finished`, never
  add a release; malformed/unknown/contradictory rows and a real run without
  its release time still hold;
- integrate the saved valid watch/start facts with an isolated controller
  stand-in, proving the historical event no longer poisons later acquisitions;
- verify F2/F4/counts still see the two real admissions and permit no a3 under
  the current cap, **even with the line-only F3 disposition**. Prove the next
  ordinary chunk can pass F4 with that disposition and still faces every
  admission check. Preserve a2 and all earlier bytes.

## mega16-easy: owner decision, not a relabel

The existing owner-notified limit is **two admissions per chunk**. Neither
the tool's fault nor the lack of a payload authorizes analysts to erase an
admission, reuse `.a2` or call a new attempt "second". Existing F3
`allowAttempt:2` lines **cannot authorize a third**.

**MS18d-Q2 is pending** (reserve the next owner-decision record, S-OD16, for
the actual answer; this text is not a grant):

- **A, recommended:** exactly **one exceptional third admission** for
  `mega16-easy.i0.n50`, after the repair/testing/review/B3 declaration and the
  separately reviewed **B4 slot implementation**, run last.
  Both old holds remain. All other chunks keep two admissions; every chunk
  still has at most one actual GP payload. A failed/held a3 grants no a4.
- **B:** keep two; the cell remains incomplete and the original **79/79
  completeness gate cannot pass**. Continue the other chunks after the
  B3/F4 gates below. Do not lower the denominator or call the gate passed.

The conditional B4 leaf fixes the slot, manifest delta, accounting, identity
chain, change allowlist and tests now. **Its preparation is not owner approval.**
If A is received, record the actual answer/message/time as S-OD16 before any
exception implementation is deployed. No `allowAttempt:3`, relabelled second
admission, global cap increase or extra measured sample is authorized by F3.

## F4 disposition

**SA2 approves a line-release-only disposition for**
**`mega16-easy.i0.n50.a2`**, conditional on **explicit SA1 concurrence**.
The evidence is the immutable `ed95a1f0` a2 folder/C log and the repair proof:
two admissions, zero payloads; a1 was the genuine CPU hold, a2 the history
defect. **The hold stays a hold and both admissions remain spent.**

The orchestrator alone appends and commits the usual F3 shape:

```json
{"chunkId":"mega16-easy.i0.n50","heldRunId":"mega16-easy.i0.n50.a2","allowAttempt":2,"ref":"tasks/difficulty-v3/MS18d-gp-campaign-base-3.jsonl","at":"<actual joint-disposition timestamp with timezone>"}
```

This is a **template, not an actual journal entry**. The cited base-3 record
must contain a `lineDisposition` naming this run, `purpose:"line-release-only"`,
this SA2 ruling, explicit SA1 concurrence and the exact retained evidence.
Use the real timestamp after the outcome and agreement; commit that record
and the appended ruling before any resumed call. Preserve the journal prefix.

`allowAttempt:2` is the fixed schema value, **not** permission to reuse a2
or create a3. F2 still refuses this chunk. The line only releases F4 for
**other chunks and, when otherwise eligible, the final check-only merge**.
The existing wrapper already distinguishes these checks; no F3-schema or
attempt-code change is needed for this disposition. The old a1 is followed
by its actual a2 in the log; it needs no second covering ruling.

The disposition applies whether Q2 is **pending, A or B**. It is not a blanket
ruling for future failures: each later non-success still follows F1-F6.
An a3 requires the separate owner decision and B4, not this line.

## Identity and release sequence

**B3, not an amendment of B2.** B2/H2 produced the real a2 records and is
immutable, even though no measurement began there. Preserve B1's 22 successful
ledgers, B2's control hold, both base records/proofs and the complete log.

Freeze one reviewed **history-only B3** toolchain with an exact file/hash
difference proof and a separate committed declaration at
**`tasks\difficulty-v3\MS18d-gp-campaign-base-3.jsonl`**.
The current two-epoch allowlist does **not** silently authorize this repair.
The epoch-3 record must name its predecessor B2, B1 campaign root, new
checkpoint, helper identity, exact changed files, retained evidence, owner
decision (where applicable), immutable inherited counts and resume disposition.

The prepared H3 is reported as
**`7d14b13f89d1ce2cb4b922fd6e194dac8fb35162f27ab97c2f7b0833e0f7eb97`**,
55 entries: 46 unchanged, four changed production helpers
(`release-history.js`, `run-locked-c.ps1`, `merge-core.js`, `merge-gp.js`),
three changed tests (`test-units.js`, `test-recorder-merge.js`,
`test-run-locked-c.ps1`) and two additions (`standin-history.js`,
`test-epoch3-proof.js`). These are the **B3 permitted helper differences**;
record the actual final freeze after review, not a guessed acceptance.
The original plan and `attempts.js`, `payload-gp.js`, `plan-data.js`,
`acquisition.js`, recorder, readiness, journals, controller, tee, owned-process
and slot-watch helpers remain byte-identical to H2. Existing output/evidence
and `tasks\difficulty-v3\` transition paths remain subject to the exact proof.

The merger accepts exactly the declared **B1/H1, B2/H2, B3/H3** pairs with the
same V1 plan, and validates each record against its own pair/base.
B2 has **zero successful measurement ledgers**; both held runs remain holds.
Keep B1's exact 22 successful ledger hashes, 950 requests and both older
base records/proofs. No retagging, count reset or hidden plan identity.

Complete the base-3 draft as follows; do not add fields to the F3 journal:

- `cutover.successes:22`, `requests:950`,
  **`nextChunk:"mega16-normal.i0.n50"`, `nextAttempt:1`**;
- `retainedEvidence.holds` includes both `mega16-easy.i0.n50.a1` and `.a2`;
  preserve their checkpoint/log hashes and the skipped-event audit;
- `ownerDecision:null` is correct **while Q2 is unanswered**. Record
  `deferredChunk:"mega16-easy.i0.n50"` and `exceptionDeployed:false`;
  even a later A answer cannot turn this B3 record into an a3 grant;
- `lineDisposition` supplies the joint decision above; `reviews` and `suites`
  cite actual accepted review/transcripts. Journal snapshots state the version
  they describe; the first resumed request records the committed F3 entry.

**Resume sequence, independent of the Q2 answer:** retain checkpoint; obtain
SA1/SA2 agreement and final B3 code/identity acceptance; commit B3/freeze;
commit base-3/proof and the approved F3 line; verify the tree/identities and
`validate-journals --base B3 --live` under the lock; then fresh source, quiet
watch, acquisition and A-readiness checks for **mega16-normal a1**.
Continue the other **91 chunks / 2,950 original requests** in relative matrix
order, one acquisition per chunk/eligible re-ask. No GP or developer write
overlaps another timed chunk; the owner-answer poller stops during timing.

If all those chunks complete, the totals without mega16/easy are
**113 successful chunks / 3,900 requests / 78 complete cells**, not a GP pass.
If Q2 is still pending then, retain/checkpoint and wait: **do not consume the
single `all-79/final.m1` slot** before resolving the last chunk's disposition.
With B, perform that check-only merge once under B3 and report incomplete.
With A, follow B4, run the one a3 last, then that same final slot once under B4.
Neither route reruns a successful/started chunk or promises a green result.

## Exact owner question for Discord

The question already posted at 21:12 is retained below. B4 is the additional
reviewed implementation of A after the B3 repair, not another requested
admission or a change to the posted numerical terms.

> **MS18d-Q2:** mega16-easy.i0.n50 đã dùng hai lượt admission nhưng chưa chạy
> phép đo nào: lượt 1 bị giữ vì EventLog dùng CPU cao; lượt 2 bị giữ do lỗi
> đọc lịch sử khóa. Giới hạn đã chốt là hai lượt nên SA không tự mở lượt 3.
>
> Anh chọn **A**: cho phép **đúng một lượt admission thứ 3 cho đoạn này**,
> sau khi sửa lỗi, kiểm thử và review B3; giữ nguyên hai lượt ở các đoạn khác,
> tối đa một payload/đoạn, 50 mẫu, seed/trace/target, jobs 1, 450/540 s và nghỉ
> >=15 s. Ghi rõ `.a3`, không đổi tên `.a2`, xóa log hay đo lại. Nếu lượt 3
> không thành công, không có lượt 4.
>
> Hay **B**: giữ giới hạn hai lượt, ghi ô này thiếu dữ liệu và GP không đạt
> điều kiện đủ 79 ô? 22 đoạn đã đo được giữ nguyên trong cả hai phương án.
