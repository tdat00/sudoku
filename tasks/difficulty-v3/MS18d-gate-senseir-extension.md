# MS18d — Scheduling gate extension: Defender (SenseIR) descendants

Orchestrator record of a scheduling-only change to the bounded pre-launch gate of
`MS18d-hyper-hard-holds-and-scheduling.md` (SA2 pack `b0c0bfac`). Recorded 2026-11-20T00:54:59+07:00.

## Trigger

Chunk 57 `greaterThan-easy.i0.n50` a1 (2026-11-20 00:40:37 +07:00) was an eligible
additional-consumer hold. The consumer was `powershell.exe` 13104 at 0.900 CPU-s/s, whose
parent was `SenseIR.exe` 10964 (Microsoft Defender for Endpoint automated investigation).
The Intune-only gate had passed. a2 ran after the 300 s cooldown plus a fresh gate and
succeeded.

## SA2 ruling (verbatim, scheduling only)

> During the same 120-second observed-absence window, require no `AgentExecutor.exe` and no
> `powershell.exe`/`pwsh.exe` descended from either
> `Microsoft.Management.Services.IntuneWindowsAgent.exe` or `SenseIR.exe`. Identify instances
> by PID plus creation time; uncertain ancestry is not quiet. Any detection resets that clock.
> The resident Intune/SenseIR roots alone need not disappear.
>
> After concurrence and your between-chunk pack commit, start a fresh combined window; carry
> forward no Intune-only seconds. All other rules remain unchanged.
>
> No CPU exemption, owner decision, helper change or new epoch.

## SA1 concurrence (CONCUR with one condition, text-only reply ~00:55 +07:00)

Drop the "pre-agent ancestor" reference point entirely. A creation-time cut-off from either
root is unsafe: SenseIR.exe 10964 was created at 00:21:58 and its parent MsSense.exe at 22:48:20;
the Intune agent 7220 dates from 11-13, but the machine booted on 11-11 at 20:53.

Walking up with PID plus creation time:
- **Hit, resetting the 120 s clock:** any `AgentExecutor.exe`; or a `powershell.exe`/
  `pwsh.exe` whose verified chain contains `IntuneWindowsAgent.exe`, `SenseIR.exe` or
  `AgentExecutor.exe`.
- **Not watched:** the chain first reaches the gate's own process; or the bound host (PID 1968
  plus its creation time); or a current-boot System, smss, wininit or services root.
- **Anything else** is uncertain, so not quiet.

A user PowerShell window whose chain breaks holds the gate until its 30-minute pause; it is
reported and never killed.

## Effect

This is scheduling only. Readiness thresholds, helpers, plan, identities, admissions, 450/540 s
and gaps are unchanged, and no epoch is added. The gate is read-only PowerShell outside the
repository. Its first use after this commit starts a fresh combined window (chunk 58,
`greaterThan-hard.i0.n50`). Carried into `MS18d-C2-EXTERNAL-CONSUMERS`.