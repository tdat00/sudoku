# MS18d Phase C1 task-owned: the bounded, read-only PROBE of the host-active readiness (policy A): the facts
# of one named host process and a process table with cumulative CPU times, each from ONE bounded CIM query
# (never longer than -TimeoutSeconds, 15 s at most). It starts nothing, stops nothing and writes nothing but
# its JSON; it is run by readiness.js before and after the five aggregate intervals (never inside them) and,
# dot-sourced, by the wrapper's pre-flight host check.
#
# Facts of the host (Get-HostFactsC), each source on its own, never padded into the other:
#   pid, parentPid, name, exePath      CIM Win32_Process;
#   netStartUtc                        .NET Process.StartTime (100 ns), as UTC with seven digits;
#   cimCreationUtc                     CIM CreationDate, as UTC with six digits (the CIM resolution);
#   displayName                        .NET ProcessName, informational only: an update may rename a running
#                                      binary (`copilot.exe.old-...`), so no decision ever uses it.
# A process that does not exist has found = false; a fact that could not be read is null (the caller holds).
#
# Snapshot (Get-SnapshotC, schema ms18d-c-snapshot-1): { ok, error, queryStartMs, queryEndMs, takenAtMs (the
# middle of the query: when the counters were read), selfPid, selfCreatedMs (this probe, so that its own
# CPU is told apart), host, processes: [{ pid, ppid, name, createdMs, cpuMs }] } where cpuMs is
# KernelModeTime + UserModeTime in milliseconds.
#
# Run as a script:
#   pwsh -NoProfile -NonInteractive -File readiness-probe.ps1 -Action snapshot -HostPid <n> `
#        [-TimeoutSeconds 15]
#   pwsh ... -Action host -HostPid <n>
#   pwsh ... -Action observe -HostPid <n>     (a host observation in the shape of a journal entry's `host`)
# The JSON is the only stdout. Exit code: 0 a record was produced (check `ok`), 2 usage.
param(
  [string]$Action = '',
  [int]$HostPid = 0,
  [int]$TimeoutSeconds = 15
)

$script:NetFormat = "yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'"
$script:CimFormat = "yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'"

function Get-NowMsC { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }

function ConvertTo-NetUtcC($When) {
  if ($null -eq $When) { return $null }
  return ([datetime]$When).ToUniversalTime().ToString($script:NetFormat,
    [Globalization.CultureInfo]::InvariantCulture)
}

function ConvertTo-CimUtcC($When) {
  if ($null -eq $When) { return $null }
  return ([datetime]$When).ToUniversalTime().ToString($script:CimFormat,
    [Globalization.CultureInfo]::InvariantCulture)
}

# The facts of one process from its CIM row (or $null) and its .NET object (or $null).
function New-HostFactsC {
  param([int]$ProcessId, $Row, $NetProcess)
  $facts = [ordered]@{
    found = $false; pid = $ProcessId; parentPid = $null; name = $null; exePath = $null
    netStartUtc = $null; cimCreationUtc = $null; displayName = $null; error = $null
  }
  if ($null -eq $Row -and $null -eq $NetProcess) { return $facts }
  $facts.found = $true
  if ($null -ne $Row) {
    $facts.parentPid = [int]$Row.ParentProcessId
    $facts.name = [string]$Row.Name
    $facts.exePath = $(if ($Row.ExecutablePath) { [string]$Row.ExecutablePath } else { $null })
    $facts.cimCreationUtc = ConvertTo-CimUtcC $Row.CreationDate
  }
  if ($null -ne $NetProcess) {
    try {
      $facts.netStartUtc = ConvertTo-NetUtcC $NetProcess.StartTime
      $facts.displayName = [string]$NetProcess.ProcessName
    } catch {
      $facts.error = 'the .NET start time could not be read: ' + $_.Exception.Message
    }
  }
  return $facts
}

# The facts of one process, bounded by the CIM operation timeout; an error is in `error`, never a guess.
function Get-HostFactsC {
  param([int]$ProcessId, [int]$TimeoutSeconds = 15)
  try {
    $net = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    $row = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" `
      -OperationTimeoutSec ([math]::Min($TimeoutSeconds, 15)) -ErrorAction Stop
    return New-HostFactsC -ProcessId $ProcessId -Row $row -NetProcess $net
  } catch {
    $facts = New-HostFactsC -ProcessId $ProcessId -Row $null -NetProcess $null
    $facts.error = $_.Exception.Message
    return $facts
  }
}

# One bounded observation of the host, in the shape of a host-binding journal entry (the pack authors append
# the entry; this only observes): `host` carries the five bound facts (the .NET start time with its local
# offset and seven digits, the CIM creation time as UTC with six digits), `observedAt` the instant, and the
# rest is diagnostic (the display name an update may have changed, the CIM name, the probe's own PID). A host
# that is absent or has an unreadable fact gives `ok: false` and no `host`.
function Get-HostObservationC {
  param([int]$ProcessId, [int]$TimeoutSeconds = 15)
  $observedAt = [DateTimeOffset]::Now
  $facts = Get-HostFactsC -ProcessId $ProcessId -TimeoutSeconds $TimeoutSeconds
  $net = $null
  if ($facts.found) { $net = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue }
  $record = [ordered]@{
    schema = 'ms18d-c-host-observation-1'; ok = $false; problems = @(); host = $null
    observedAt = $observedAt.ToString("yyyy-MM-dd'T'HH:mm:ss.fffzzz",
      [Globalization.CultureInfo]::InvariantCulture)
    diagnostics = [ordered]@{ displayName = $facts.displayName; cimName = $facts.name; probePid = $PID
      error = $facts.error; netStartUtc = $facts.netStartUtc }
  }
  if (-not $facts.found) { $record.problems = @("process $ProcessId is not running"); return $record }
  $missing = @(@('parentPid', 'exePath', 'netStartUtc', 'cimCreationUtc') |
      Where-Object { $null -eq $facts[$_] })
  if ($null -eq $net) { $missing += 'dotNetStartTime' }
  if ($missing.Count -gt 0) {
    $record.problems = @("could not read: $($missing -join ', ')")
    return $record
  }
  $record.host = [ordered]@{
    pid = $ProcessId
    dotNetStartTime = ([DateTimeOffset]$net.StartTime).ToString("yyyy-MM-dd'T'HH:mm:ss.fffffffzzz",
      [Globalization.CultureInfo]::InvariantCulture)
    cimCreationDateUtcMicroseconds = $facts.cimCreationUtc
    parentPid = $facts.parentPid
    executablePath = $facts.exePath
  }
  $record.ok = $true
  return $record
}

# The process table with cumulative CPU times and the facts of the host, from ONE CIM query.
function Get-SnapshotC {
  param([int]$HostPid, [int]$TimeoutSeconds = 15)
  $started = Get-NowMsC
  $record = [ordered]@{
    schema = 'ms18d-c-snapshot-1'; ok = $false; error = $null; queryStartMs = $started; queryEndMs = $null
    takenAtMs = $null; selfPid = $PID; selfCreatedMs = $null; host = $null; processes = @()
  }
  try {
    $limit = [math]::Min($TimeoutSeconds, 15)
    $rows = @(Get-CimInstance Win32_Process -OperationTimeoutSec $limit -ErrorAction Stop)
    $net = $null
    if ($HostPid -gt 0) { $net = Get-Process -Id $HostPid -ErrorAction SilentlyContinue }
    $ended = Get-NowMsC
    $list = [System.Collections.Generic.List[object]]::new()
    $hostRow = $null
    foreach ($r in $rows) {
      $created = $null
      if ($r.CreationDate) {
        $created = [DateTimeOffset]::new([datetime]$r.CreationDate).ToUnixTimeMilliseconds()
      }
      $cpu = $null
      if ($null -ne $r.KernelModeTime -and $null -ne $r.UserModeTime) {
        $cpu = ([double]$r.KernelModeTime + [double]$r.UserModeTime) / 10000.0
      }
      $list.Add([ordered]@{ pid = [int]$r.ProcessId; ppid = [int]$r.ParentProcessId; name = [string]$r.Name
          createdMs = $created; cpuMs = $cpu })
      if ($HostPid -gt 0 -and [int]$r.ProcessId -eq $HostPid) { $hostRow = $r }
      if ([int]$r.ProcessId -eq $PID) { $record.selfCreatedMs = $created }
    }
    $record.queryEndMs = $ended
    $record.takenAtMs = [long](($started + $ended) / 2)
    $record.host = $(if ($HostPid -gt 0) { New-HostFactsC -ProcessId $HostPid -Row $hostRow -NetProcess $net }
      else { $null })
    $record.processes = $list.ToArray()
    $record.ok = ($list.Count -gt 0) -and ($null -ne $record.selfCreatedMs)
    if (-not $record.ok) { $record.error = 'the process table is empty or does not contain this probe' }
  } catch {
    $record.queryEndMs = Get-NowMsC
    $record.error = $_.Exception.Message
  }
  return $record
}

if ($Action -eq 'snapshot') {
  if ($HostPid -le 0) {
    [Console]::Error.WriteLine('usage: -Action snapshot -HostPid <n>')
    exit 2
  }
  [Console]::Out.Write((Get-SnapshotC -HostPid $HostPid -TimeoutSeconds $TimeoutSeconds |
      ConvertTo-Json -Depth 6 -Compress))
  exit 0
} elseif ($Action -eq 'host') {
  if ($HostPid -le 0) {
    [Console]::Error.WriteLine('usage: -Action host -HostPid <n>')
    exit 2
  }
  [Console]::Out.Write((Get-HostFactsC -ProcessId $HostPid -TimeoutSeconds $TimeoutSeconds |
      ConvertTo-Json -Depth 4 -Compress))
  exit 0
} elseif ($Action -eq 'observe') {
  if ($HostPid -le 0) {
    [Console]::Error.WriteLine('usage: -Action observe -HostPid <n>')
    exit 2
  }
  [Console]::Out.Write((Get-HostObservationC -ProcessId $HostPid -TimeoutSeconds $TimeoutSeconds |
      ConvertTo-Json -Depth 5))
  [Console]::Out.Write("`n")
  exit 0
} elseif ($Action -ne '') {
  [Console]::Error.WriteLine("unknown -Action $Action")
  exit 2
}
