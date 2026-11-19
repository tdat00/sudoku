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