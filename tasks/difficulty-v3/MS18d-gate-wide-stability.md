# MS18d — Chunk 97 butterfly-master holds, Q4 and the wide stability gate

Orchestrator record, written 2026-11-20T03:31:42+07:00, of SA2's text-only rulings with SA1's concurrence. The
campaign was live, so the SAs performed no repository operations.

## Facts

- At checkpoint `2fe18f4b23b8c7f4aacda1e9f153bfadb1704b54` the C log has 94 successes,
  8 control-holds and 1 pre-window-hold (103 lines).
- `butterfly-master.i0.n50`: two eligible unstarted additional-consumer holds, C-log lines
  102-103, no ledger:
  - a1 at 03:10:07: `BackgroundDownload.exe` 34696 (parent svchost 2292) at 0.712 CPU-s/s.
  - a2 at 03:19:33, after the 300 s cooldown and a gate that waited out a SenseIR PowerShell at
    03:17:24: `MsMpEng.exe` 5632 (Defender antivirus) at 0.846 CPU-s/s.

## F4 disposition (SA2 approves; SA1 concurs)

Line release only, recorded in `MS18d-butterfly-master-line-disposition.json` and journal
line 3. Both admissions remain spent; no retry or a3 is authorized.

## Owner question MS18d-Q4 (separate; S-OD18 reserved)

Q4 is posted verbatim as SA2 worded it. It is independent of Q2 and Q3.

## Wide stability gate (SA2 text, SA1 CONCUR with conditions)

> During the fresh 120-second observed window, retain the existing Intune/SenseIR presence rules
> and require every valid fixed-cadence CPU interval to show no non-exempt process at
> >=0.5 CPU-s/s. A detection or invalid required observation resets that stability window. Use
> PID plus creation time and the existing per-instance CPU-rate semantics.
>
> Exempt only the verified approved host instance, Idle, and individually identified gate/query
> instrumentation instances - not all ancestors, descendants or "campaign" processes. These
> scheduling exclusions do not alter authoritative readiness exclusions.
>
> Keep the existing cooldown, final >=20-second sampling requirement, query bounds and single
> 30-minute deadline, then pause. Take the first qualifying window; never poll actual readiness
> until green. No additional MsMpEng-specific 300-second rule.

SA1's conditions:
- read CPU and identity from CIM `Win32_Process` (KernelModeTime + UserModeTime, ProcessId +
  CreationDate);
- treat the same PID with a different creation time as a new process, rated over max(1 s,
  now - max(created, previous sample));
- dry-run the final version once before chunk 98 (passed 03:31:01 after a reset on an MsMpEng
  burst at 0.99);
- on the 30-minute expiry, pause and report; never loosen the rule.

Exempt: Idle (PID 0), host 1968 (PID plus creation time) and the gate's own process only. Counted:
WmiPrvSE, System, MemCompression, services.exe and the gate's parent shells. The rule applies
from chunk 98 onward and to any approved a3. Readiness remains authoritative.

## B4

Up to three named candidates: mega16-easy, hyper-hard and butterfly-master. Each is bound to its
own owner answer (S-OD16/17/18), giving 229+m slots (230-232). The default cap remains two. The
approved a3s run last, in that order, after the 17 remaining chunks. No implementation starts
before then.

Carried into `MS18d-C2-EXTERNAL-CONSUMERS`: the consumer list (EventLog, Dnscache, Intune
PowerShell, SenseIR PowerShell, BackgroundDownload, MsMpEng), the gate change at chunk 98, and
the wait and expiry counts.

## Exact MS18d-Q4 wording

Verbatim copy, archived on SA2's ruling before B4, of the owner question as posted. The text was read
back from the Discord API, not reconstructed. The Discord message remains the provenance source; this
pack copy is the authoritative wording record for `questionWording` (S-OD18).

- Channel `ai-agent-session2` / `1571779348573323334`, message **`1573073374584774872`**, author `AI-Agents` (bot),
  posted **2026-11-19T20:31:58.791Z** (03:31:58.791 +07:00).
- `content` SHA-256 (UTF-8 bytes of the API `content` string, LF line breaks, no trailing newline): `3f96aa3d29674375cdbd52532c2275ae030ea7b8ec1a7783bc36f21e89b123f7`.
- `content` length: 889 characters. Lines below are joined with this file's line endings; the hash
  applies to the LF form.

````text
**[Sudoku difficulty-v3] ❓ CÂU HỎI CHO ANH — MS18d-Q4 (riêng butterfly-master.i0.n50)**

Hai lượt admission đều bị giữ hợp lệ (BackgroundDownload ở lượt 1, MsMpEng ở lượt 2); chưa chạy payload nào.
- Lượt 2 đã chờ đủ 300 giây và qua gate mới.
- Không phải lỗi công cụ; hai lượt vẫn được tính.

Anh chọn **Q4=A**: cho đúng **một admission `.a3` riêng cho đoạn này**.
- Lượt này chạy cuối, sau 17 đoạn còn lại và sau khi B4 được kiểm thử/review.
- Giữ hai lượt cũ, 50 mẫu, seed/trace/target, jobs 1, chính sách CPU/khóa và giới hạn 450/540 giây.
- Tối đa một payload, không đo lại, không `.a4`.

Hay **Q4=B**: không thêm lượt, ô này thiếu dữ liệu và GP không đủ 79 ô?

Q4 độc lập với Q2/Q3; phê duyệt câu trước không tự áp dụng sang câu này. Anh trả lời **Q4=A** hoặc **Q4=B**.

_(Đang chờ cả 3 câu: Q2 — mega16-easy, Q3 — hyper-hard, Q4 — butterfly-master. Mỗi câu trả lời A hoặc B riêng.)_
````
