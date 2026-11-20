# MS18d — Hyper Hard holds, Q3 and bounded scheduling

**Current C2 halt, 2026-11-19. SA2 ruling for explicit SA1 concurrence.**
Preserve both legitimate holds. Release only the recording line after the
joint F3 disposition; no third admission follows from this ruling.
Ask **a separate MS18d-Q3**, not an extension or reinterpretation of Q2.
The scheduling procedure below changes no frozen helper or admission policy.

## Retained facts

- Deployed B3 **`8e95cb14aad100a6d219af072bbdf3dc227273d1`**, H3
  **`4a0e5881f26f244b94f526da2fa42f2ce8ec839ec567f49383cb66c84f8bc47d`**;
  base-3/proof/mega16-easy F3 record **`bce27077044f5d92e5bb1729713e188bf304cd8f`**.
  B3/V1 and its two-admission cap are unchanged.
- Checkpoint **`d3e6b36690a3c4b03d8bdce8e204943286eaf578`** contains
  **39 successful chunks / 1,550 requests / 31 complete cells**.
  Mega16-normal's eligible a1 was followed by its successful a2.
- **73 original chunks / 2,300 requests remain**, starting
  **`hyper-master.i0.n50` a1**, in their original relative order.
  Mega16-easy and hyper-hard each have two spent admissions and zero payloads.
- Hyper-hard a1/a2 are readiness `control-hold`, exit 64,
  `eligibleReAsk:true`, `payloadStarted:false`, cleanup barrier clean.
  No GP transcript/stream/ledger or tee/command PID exists in either folder.

| Run | Recorded consumer rates, CPU-s per elapsed second | Verified release |
|---|---|---|
| `hyper-hard.i0.n50.a1` | PowerShell 32956: **0.897**; svchost 3048 (Dnscache): **0.711** | `2026-11-19T23:22:56.687+07:00` |
| `hyper-hard.i0.n50.a2` | PowerShell 20636: **0.875** | `2026-11-19T23:24:30.999+07:00` |

The reported retained lineage is PowerShell 32956 -> AgentExecutor 9848
and PowerShell 20636 -> AgentExecutor 448, both beneath
`Microsoft.Management.Services.IntuneWindowsAgent.exe` 7220. This explains
the management batch; it creates **no corporate-service/OS exemption**.
These are legitimate additional-consumer holds, unlike mega16-easy a2's
release-history defect.

The orchestrator disclosed scheduling the re-ask automatically 65 s after
a1's release. The C log's actual post-watch a2 request is **23:24:22.138**,
**85.451 s after release**: the >=60 s numerical minimum was respected.
The scheduling error was assuming that minimum meant the batch had cleared.
Do not refund either admission, invalidate an otherwise correct hold, or
describe this as a failed measured payload.

Evidence: C-log **lines 44–45** and the two
`docs\difficulty-v3\evidence\MS18d\gp\hyper-hard\hyper-hard.i0.n50.a{1,2}\`
folders at that checkpoint. The 45-line C log is 41,144 checkout bytes,
SHA-256 **`350b4c731dc34d86e8a43a9f5d6ab4bdfdcf35b2d2dcb4d98ffae107f7711cda`**.
The a1/a2 `result.json` SHA-256 values are respectively
`aa0d17fdc11dfa20e14b4ae254909c2cec483a55f34be76282e9a3ef53edde29` and
`99a2974e222b3c0e12856a4947216c63f9365b7b70680e2234c36a933ba4615b`.
Keep all preceding successes, holds and log bytes too.

## F4 disposition

**SA2 approves**, subject to **explicit SA1 concurrence**, a
**line-release-only** F3 disposition for **`hyper-hard.i0.n50.a2`**.
Both admissions stay spent; both eligible flags and outcomes remain as saved.
A second eligible hold is terminal under V1, not permission for an a3.

The orchestrator alone commits a durable joint decision at
**`tasks\difficulty-v3\MS18d-hyper-hard-line-disposition.json`**, carrying this
SA2 ruling/commit, the actual SA1 concurrence/ref, checkpoint and evidence
above, `purpose:"line-release-only"`, `admissionsSpent:2`, `payloads:0`,
and `authorizes:"no admission"`. This is a pack decision record of the same
kind as base-3's `lineDisposition`, not a new measurement/evidence class.
Do not edit the never-edited base-3 record to add it.

Then append and commit the ordinary F3 line, preserving its existing prefix:

```json
{"chunkId":"hyper-hard.i0.n50","heldRunId":"hyper-hard.i0.n50.a2","allowAttempt":2,"ref":"tasks/difficulty-v3/MS18d-hyper-hard-line-disposition.json","at":"<actual append time in +07:00>"}
```

The timestamp is real, after the outcome/agreement and never future-dated.
This template itself is not a journal entry or authority to launch.
The existing a1 is followed by its a2; no extra a1 ruling is needed.
F3 opens only other chunks and the eventual check-only merge. F2 still
refuses hyper-hard a1/a2/a3, and no eligibility flag bypasses the cap.
No helper change or new epoch is required for this line release.

After the joint decision/ruling commit, validate committed journals under
B3, preserve/verify the checkpoint and identities, and use the fresh
scheduling/ordinary admission checks for **hyper-master a1**. Neither Q2 nor
Q3 needs to be answered to continue these other 73 chunks.
Every later real non-success still follows F1-F6; this is not blanket
permission to skip through held cells or automatically grant more slots.

## Bounded scheduling, not a new readiness policy

**SA2 permits the following conservative orchestrator scheduling procedure,
subject to SA1 concurrence**, prospectively from this checkpoint for **every
remaining recorder invocation**, including re-asks and any approved B4 a3.
It is a pause for known foreign work, not repeated A-readiness trials.
Leave all frozen helpers/CLI arguments, source/plan identities, CPU admission
rules, 1200 s lock-watch bound, >=15 s gaps, and 450/540 limits unchanged.

1. **No fixed 65 s automatic re-ask.** A re-ask still requires the existing
   eligible unstarted hold and unused second slot. First wait at least
   **300 s from its verified release**, then start a fresh quiet observation
   window. Waiting longer does not create eligibility or another admission.
2. Before each prospective call, observe **at least 120 s** with no
   `AgentExecutor.exe` and no `powershell.exe`/`pwsh.exe` descended from the
   identified `Microsoft.Management.Services.IntuneWindowsAgent.exe`.
   Use PID **plus creation time** and credible ancestry, not hard-coded PIDs
   or name-only attribution. The resident management service itself need
   not disappear. Unknown ancestry/identity is not proved quiet.
3. Use a fixed **5 s nominal observation cadence**, with valid timestamped
   samples no more than **10 s apart**. A detected manager/descendant resets
   the 120 s absence clock; missing/late/invalid facts reset the affected
   window. This proves an **observed** clean interval, not absence of
   unobserved short-lived processes between samples.
4. In the **last at least 20 s** of that observation, get at least five
   samples/four consecutive CPU intervals for the process instances hosting
   **EventLog and Dnscache**. Resolve current service-to-PID bindings and use
   full process CPU deltas divided by **actual elapsed seconds**.
   Each rate must be **<0.5 CPU-s/s**; invalid/negative/reset counters,
   unresolved bindings or changed instances are not zero/quiet. A dirty
   service interval restarts its 20 s window. Shared svchost CPU is not
   subtracted or attributed away. Do not rank candidate windows by CPU.
5. Accept the **first** window satisfying those predeclared facts, not the
   quietest/fastest of several. Finish sampling before the unchanged wrapper
   begins its own fresh source/watch/acquisition/readiness sequence. Its A
   check remains authoritative and can still hold; do not cancel/restart it
   because a counter looks unfavorable.
6. Bound each observation query to **<=15 s** and the whole scheduling
   episode to **30 wall-clock minutes**, including any 300 s cooldown.
   Never reset that deadline when a window restarts. On expiry, launch
   nothing, report the named availability item and **pause**. No immediate
   loop through a new deadline or other chunk IDs; the orchestrator must
   schedule a genuinely later window explicitly. This is not an increase
   of any helper/lock/payload deadline and not another owner-answer gate.
7. Scheduling is **read-only PowerShell, no Node/probe/no-op payload and no
   files/folders/log entries written**. Do not hold a shared timing lock
   during this potentially 30-minute wait. The coordinator must guarantee
   no timed payload in either repository while active samples run; if that
   cannot be guaranteed, yield/reschedule instead of sampling concurrently.
   If another workload takes the slot, stop sampling and restart the
   observations only after a coordinated quiet window is available.
   Ordinary lock watches still protect the later real call.
8. No stopping, suspending, disabling or reconfiguring Intune, AgentExecutor,
   PowerShell management scripts, EventLog or Dnscache; no new OS-service,
   host-descendant or scheduling-probe exemption. Stop optional pollers
   before the actual admission/timing; no other developer work overlaps it.

No sample is generated or selected by this procedure. Gated-away waits
consume no admission because no recorder call/folder is made; real calls
still consume their immutable slot exactly as before. No choosing cells,
seeds, outcomes or reruns based on measured speed. Keep the timing label
**shared-slot, CLI-host-active**, not strict-quiet-machine timing.

The operational item **MS18d-C2-EXTERNAL-CONSUMERS** carries the observed CPU
rates, two terminal holds, scheduler disclosure, gate start at this
checkpoint, wait/expiry counts and wall cost into **MS18d and MS18e**.
Emit a short gate result/wait summary to existing orchestration output;
carry it in the usual progress/final audit, not a new evidence tool/class.
Do not add waiting to or subtract it from raw GP request times.
The 120 s requirement alone adds **at least 146 minutes across 73 clean first
calls**, before acquisition/payload time and any re-asks; disclose that cost
without treating it as a new engine latency or a deadline waiver.

## Owner question — separate MS18d-Q3

Keep the posted **Q2** text/reference unchanged: it is only mega16-easy.
Reserve **S-OD17** for the actual **Q3** answer; S-OD16 remains Q2's record.
No answer, an ambiguous bare A/B, or permission for Q2 alone grants hyper-hard
a3. Use the reply's explicit question/message binding; do not infer two grants.
If the owner explicitly answers both, record each named decision separately.

Exact Vietnamese wording:

> **MS18d-Q3 — riêng hyper-hard.i0.n50:** Đoạn này đã dùng hai lượt admission
> nhưng chưa chạy payload nào. Cả hai lần giữ đều đúng theo chính sách CPU:
> PowerShell của Intune, kèm Dnscache ở lượt 1; không phải lỗi công cụ.
> Bộ điều phối đã tự gọi lại sau 65 giây, đủ mức tối thiểu nhưng quá sớm trong
> cùng đợt Intune. Hai lượt vẫn được tính, không hoàn lại.
>
> Anh chọn **Q3=A**: cho phép **đúng một lượt admission `.a3` riêng cho đoạn
> này**, sau khi phần còn lại kết thúc và B4 được kiểm thử/review; chạy cuối,
> giữ nguyên hai lượt ở các đoạn khác trừ quyết định riêng Q2, tối đa một
> payload/đoạn, 50 mẫu, seed/trace/target, jobs 1, chính sách CPU/khóa và
> giới hạn 450/540 giây. Giữ cả hai lượt cũ; không đo lại, không có `.a4`.
>
> Hay **Q3=B**: giữ giới hạn hai lượt; ô này thiếu dữ liệu và GP không thể đủ
> 79 ô? **39 đoạn đã đo được giữ nguyên; 73 đoạn còn lại vẫn tiếp tục theo
> B3 với lịch chờ thận trọng hơn.**
>
> Câu này **độc lập MS18d-Q2 về mega16-easy**; không sửa hay suy rộng câu Q2.
> Anh trả lời **Q3=A** hoặc **Q3=B**.

## B4 and final merge

The amended `MS18d-epoch4-a3-exception.md` covers **only the explicitly
approved subset** of the two named candidates. Resolve both owner questions
before B4 freeze/final merge. No B4 implementation/test/freeze before the
remaining 73 original chunks are disposed and checkpointed.

- Both A: two distinct a3 slots, **231** slots in V2, mega16-easy then
  hyper-hard in original matrix order after all remaining original chunks.
- Exactly one A: only that slot, **230** slots; the other cell stays incomplete.
- Both resolved answers B: no B4/V2; final check-only merge under B3, incomplete.

Default cap stays two; each named grant changes only its own maximum to
three admissions/one payload, with both old holds retained and no a4.
Any a3 hold/failure stops F4 before another exception/final merge until its
own joint line-only disposition. No automatic exception cascade.
Keep `final.m1` unused while either question is unresolved.
If all remaining original chunks complete, the baseline is
**112 successes / 3,850 requests / 77 complete cells**. Each successful
approved a3 adds its original 50 requests once. Only both complete can
restore 79/79 completeness; the separate >=72 strict p95 gate still applies.
