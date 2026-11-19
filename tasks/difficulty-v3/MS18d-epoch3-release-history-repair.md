# MS18d — Second halt: release-history repair and owner admission decision

**Campaign paused; no retry or third admission is authorized.**
SA2 ruling for SA1 concurrence, 2026-11-19: preserve/checkpoint the new a2
folder and C log, correct the semantic release reader, and use a **new B3**
if a repaired toolchain is deployed. Never amend B2 or relabel its a2.
**MS18d-Q2 requires the owner** for any exceptional third admission.

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

**Checkpoint now, under the lock:** commit the complete a2 directory and
append-only C log as observed. These are allowed campaign-output paths.
Do not edit line 24, add a fictitious release, delete/rename a2, truncate the
log or overwrite either epoch record/manifest. B3 must descend from this new
checkpoint; record its actual hash once the orchestrator commits it.

## Correct fix — classify non-acquisition events before release parsing

The defect is in **`release-history.js::fromLog`**, which treats every row as
a release and requires `finished`. **`acquisition.js` correctly fails closed**
on its `history.problems`; do not weaken that decision to ignore problems,
hard-code line 24 or accept unknown history.

Prepare, under the lock and without real GP:

1. In `release-history.js`, recognize the valid F1 **`pre-window-hold`**
   event class as **no lock acquired, no release to collect**. Skip it before
   requiring/parsing release timestamps. Preserve/audit the ignored event
   references; do not silently ignore malformed/unknown rows or ordinary
   real-run rows missing a valid `finished`.
2. Recognize historical/current writer forms, including
   `heldAt:"foreign-lock-watch"` and `"pre-window-recheck"`, by their typed
   no-acquisition semantics. Do not infer the old event's meaning from whether
   a same-named a2 directory exists **later**: line 24 preceded line 25.
   Contradictory claims of an acquired lock/payload are not an ignorable event.
3. Apply the same semantic exclusion in the wrapper's **`Get-LastReleaseC`**
   courtesy reader. A pre-window event is not a release even if it has a
   timestamp. Do not substitute `at` as a release or supply a filtered
   replacement C log to the rest of the system.
4. Future pre-window records should also carry **`finished` as the time the
   pre-window operation ended**, with explicit no-acquisition/no-admission/
   no-payload metadata. It is diagnostic, **not `releaseObservedAt`** and
   not proof that a lock was held. Typed readers still exclude the event.
   B2 currently writes only `at`, so adding the field alone cannot repair
   the immutable historical line or prevent semantic misclassification.
5. Keep acquisition thresholds, watch cadence, 450/540, CPU rules, current
   admission counts and every raw measurement unchanged.

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
  the current cap. Preserve a2 and all earlier bytes.

## mega16-easy: owner decision, not a relabel

The existing owner-notified limit is **two admissions per chunk**. Neither
the tool's fault nor the lack of a payload authorizes analysts to erase an
admission, reuse `.a2` or call a new attempt "second". Existing F3
`allowAttempt:2` lines **cannot authorize a third**.

**MS18d-Q2 is pending** (reserve the next owner-decision record, S-OD16, for
the actual answer; this text is not a grant):

- **A, recommended:** exactly **one exceptional third admission** for
  `mega16-easy.i0.n50`, after the repair/testing/review/B3 declaration.
  Both old holds remain. All other chunks keep two admissions; every chunk
  still has at most one actual GP payload. A failed/held a3 grants no a4.
- **B:** keep two; the cell remains incomplete and the original **79/79
  completeness gate cannot pass**. Any later continuation of the other
  chunks needs the fixed/reviewed tooling and a jointly approved F4 line
  disposition. Do not lower the denominator or call the gate passed.

If A is approved, the owner exception must be explicit in the committed pack
and reviewed tooling. The current immutable manifest has only `.a1/.a2`.
Create/version the narrowly authorized **`.a3` slot** and its exact identity/
allowlist/attempt/merger rules; preserve the old manifest and both hold folders.
Keep every numerical chunk/seed/target/protocol entry identical. An extra
admission slot is not an extra measured sample or a rerun.
Do not insert `allowAttempt:3` into the existing F3 schema or raise the global
cap to three. The exact manifest/exception format is finalized with SA1 after
the owner's answer, not guessed into a live invocation now.

## Identity and release sequence

**B3, not an amendment of B2.** B2/H2 produced the real a2 records and is
immutable, even though no measurement began there. Preserve B1's 22 successful
ledgers, B2's control hold, both base records/proofs and the complete log.

Prepare the release-reader/wrapper repair and regression tests while waiting
for Q2. Do not modify the live admission ceiling/slots or run a real payload.
After the owner disposition, freeze one reviewed B3 toolchain with an exact
file/hash difference proof and a separate committed declaration at
**`tasks\difficulty-v3\MS18d-gp-campaign-base-3.jsonl`**.
The current two-epoch allowlist does **not** silently authorize this repair.
The epoch-3 record must name its predecessor B2, B1 campaign root, new
checkpoint, helper identity, exact changed files, retained evidence, owner
decision (where applicable), immutable inherited counts and resume disposition.

The merger must validate each historical record against its own declared epoch.
B2 has **no measurement ledgers**, but its a2 hold still counts in history.
If A adds a versioned slot exception/manifest, declare that additional identity
explicitly and prove that its only plan delta is the authorized slot/metadata;
never pretend the original manifest SHA stayed the same.
No retagging, count reset, hidden third helper/plan identity, discarded hold,
recording repeat or measurement-code/CPU/target change is permitted.

**No real continuation before**: checkpoint retained, owner Q2 disposition,
joint repair/identity review, B3/freeze/base-3 records, verified journals and
proper line disposition, then fresh lock/source/watch/readiness checks.
The campaign remains halted meanwhile. A final merge may truthfully report
incomplete; no exception is inferred merely to make the gate green.

## Exact owner question for Discord

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
