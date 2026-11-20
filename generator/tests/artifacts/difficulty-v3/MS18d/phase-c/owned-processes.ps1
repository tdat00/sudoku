# MS18d Phase C0 task-owned (G5): the orphan barrier. ONE implementation of "which processes of this run
# are still alive, and are they ours", used by the controller (a script run by controller.js after every
# tee outcome, while our lock is still held) and, dot-sourced, by the outer wrapper after the shared helper
# has returned (the abnormal-exit verification: the controller itself may have been killed).
#
# The records are the controller's append-only pids.jsonl: one JSON object per line, each flushed when
# written
#   { "role": "controller" | "tee" | "command" | "wrapper", "pid": n, "ppid": n, "beforeMs": n,
#     "afterMs": n }
#   { "event": "command-exit", "atMs": n, "code": n | null, "signal": text | null }
# `beforeMs`/`afterMs` are the spawn window: the clock just before and just after the process was started.
# A process with that PID is the recorded instance only if its creation time lies in that window (+- 1 s);
# a process with the PID and another creation time is a REUSE of the PID and is never touched.
#
# Verdicts: clean | stopped-owned | hold-unknown | hold-survivor.
#   clean          every recorded process is positively gone and no descendant of one is alive;
#   stopped-owned  survivors existed (a failure, retained), each was stopped through a handle whose
#                  creation time was verified just before, and a fresh snapshot confirms they are gone;
#   hold-unknown   liveness cannot be proved (no usable process table, an unusable record, a PID reused
#                  with no proof that the recorded process ended): nothing unproved is killed, the run is
#                  held;
#   hold-survivor  a survivor could not be stopped or is still alive after the stop.
# PID reuse and unknown liveness are never a proof of exit and never a permission to kill another process.
# The barrier never stops itself, an ancestor of itself, or a record of role `wrapper`.
#
# Run as a script:
#   pwsh -NoProfile -NonInteractive -File owned-processes.ps1 -Action barrier -RecordsFile <pids.jsonl> `
#        -OutFile <new cleanup.json> [-IncludeController] [-ConfirmSeconds 10]
#   pwsh ... -Action snapshot            (prints the process table as JSON)
# Exit code: 0 clean, 10 stopped-owned, 20 hold-unknown, 21 hold-survivor, 2 usage. `-SnapshotFile <json>`
# (tests only) replaces the process table and forbids any stop.
param(
  [string]$Action = '',
  [string]$RecordsFile = '',
  [string]$OutFile = '',
  [string]$SnapshotFile = '',
  [int]$ConfirmSeconds = 10,
  [switch]$IncludeController
)

$script:OwnedToleranceMs = 1000

function Get-ProcessSnapshot {
  param([int]$TimeoutSeconds = 15, [string]$SimulatedFile = '')
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  try {
    if ($SimulatedFile) {
      $data = Get-Content -LiteralPath $SimulatedFile -Raw | ConvertFrom-Json
      $list = @($data.processes | ForEach-Object {
          [pscustomobject]@{ Pid = [int]$_.pid; Ppid = [int]$_.ppid; CreatedMs = $_.createdMs
            Name = [string]$_.name }
        })
      return [pscustomobject]@{ Ok = [bool]$data.ok; TakenAtMs = $now; Processes = $list; Error = $null
        Simulated = $true }
    }
    $rows = @(Get-CimInstance Win32_Process -OperationTimeoutSec $TimeoutSeconds -ErrorAction Stop)
    $list = @($rows | ForEach-Object {
        $created = $null
        if ($_.CreationDate) { $created = [DateTimeOffset]::new($_.CreationDate).ToUnixTimeMilliseconds() }
        [pscustomobject]@{ Pid = [int]$_.ProcessId; Ppid = [int]$_.ParentProcessId; CreatedMs = $created
          Name = [string]$_.Name }
      })
    $ok = ($list.Count -gt 0) -and (@($list | Where-Object { $_.Pid -eq $PID }).Count -eq 1)
    $err = $null
    if (-not $ok) { $err = 'the process table is empty or does not contain this process' }
    return [pscustomobject]@{ Ok = $ok; TakenAtMs = $now; Processes = $list; Error = $err
      Simulated = $false }
  } catch {
    return [pscustomobject]@{ Ok = $false; TakenAtMs = $now; Processes = @(); Error = $_.Exception.Message
      Simulated = $false }
  }
}

# The pids this process must never stop: itself and every ancestor found in the snapshot.
function Get-ProtectedPids {
  param($Snapshot, [int]$SelfPid)
  $protected = [System.Collections.Generic.List[int]]::new()
  $protected.Add($SelfPid)
  $byPid = @{}
  foreach ($p in $Snapshot.Processes) { $byPid[[int]$p.Pid] = $p }
  $cursor = $SelfPid
  for ($i = 0; $i -lt 64; $i++) {
    if (-not $byPid.ContainsKey($cursor)) { break }
    $parent = [int]$byPid[$cursor].Ppid
    if ($parent -le 0 -or $protected.Contains($parent)) { break }
    $protected.Add($parent)
    $cursor = $parent
  }
  return $protected.ToArray()
}

function Read-OwnedRecords {
  param([string]$File)
  $roots = [System.Collections.Generic.List[object]]::new()
  $events = [System.Collections.Generic.List[object]]::new()
  $problems = [System.Collections.Generic.List[string]]::new()
  if (-not (Test-Path -LiteralPath $File)) {
    $problems.Add('the pid records file does not exist')
    return [pscustomobject]@{ Roots = @(); Events = @(); Problems = $problems.ToArray() }
  }
  $n = 0
  foreach ($line in [IO.File]::ReadAllLines($File)) {
    $n++
    if ($line.Trim() -eq '') { continue }
    try { $o = $line | ConvertFrom-Json } catch { $problems.Add("pids line ${n}: not JSON"); continue }
    if ($o.PSObject.Properties.Name -contains 'event') { $events.Add($o); continue }
    if ($o.role -notin @('controller', 'tee', 'command', 'wrapper')) {
      $problems.Add("pids line ${n}: unknown role")
      continue
    }
    $roots.Add($o)
  }
  return [pscustomobject]@{ Roots = $roots.ToArray(); Events = $events.ToArray()
    Problems = $problems.ToArray() }
}

function Find-Descendants {
  param($Snapshot, [int]$RootPid, $NotBeforeMs, $NotAfterMs, [int[]]$Protected, [int]$ToleranceMs)
  $found = [System.Collections.Generic.List[object]]::new()
  $seen = [System.Collections.Generic.HashSet[int]]::new()
  $queue = [System.Collections.Generic.Queue[object]]::new()
  $queue.Enqueue([pscustomobject]@{ Pid = $RootPid; NotBefore = $NotBeforeMs; NotAfter = $NotAfterMs })
  while ($queue.Count -gt 0) {
    $item = $queue.Dequeue()
    $children = @($Snapshot.Processes |
        Where-Object { $_.Ppid -eq $item.Pid -and $_.Pid -ne $item.Pid })
    foreach ($c in $children) {
      if ($Protected -contains [int]$c.Pid) { continue }
      if ($null -eq $c.CreatedMs) { continue }
      if ($null -ne $item.NotBefore -and $c.CreatedMs -lt ($item.NotBefore - $ToleranceMs)) { continue }
      if ($null -ne $item.NotAfter -and $c.CreatedMs -gt ($item.NotAfter + $ToleranceMs)) { continue }
      if (-not $seen.Add([int]$c.Pid)) { continue }
      $found.Add($c)
      $queue.Enqueue([pscustomobject]@{ Pid = [int]$c.Pid; NotBefore = $c.CreatedMs; NotAfter = $null })
    }
  }
  return $found.ToArray()
}

# The console host (conhost.exe) that Windows gives a hidden console application is a system helper that ends
# with its client and cannot be stopped as a process of ours: it is listed as ignored, never as a survivor.
function Add-OwnedFound {
  param($Found, $Survivors, $Ignored, [string]$Why)
  foreach ($d in $Found) {
    $entry = [pscustomobject]@{ Pid = $d.Pid; CreatedMs = $d.CreatedMs; Name = $d.Name; Why = $Why }
    $key = "$($d.Pid)/$($d.CreatedMs)"
    if ($d.Name -ieq 'conhost.exe') { $Ignored[$key] = $entry } else { $Survivors[$key] = $entry }
  }
}

# Pure: records and a process table in, the state of every recorded process and the survivors out.
function Resolve-OwnedProcesses {
  param($Records, $Snapshot, [int]$SelfPid, [switch]$IncludeController)
  $tol = $script:OwnedToleranceMs
  $problems = [System.Collections.Generic.List[string]]::new()
  foreach ($p in $Records.Problems) { $problems.Add($p) }
  # an unreadable record is unproved liveness, whatever the process table says
  $ambiguous = ($Records.Problems.Count -gt 0)
  if (-not $Snapshot.Ok) {
    $problems.Add('no usable process table: ' + $Snapshot.Error)
    return [pscustomobject]@{ Roots = @(); Survivors = @(); Ignored = @(); Ambiguous = $true
      Problems = $problems.ToArray() }
  }
  $protected = Get-ProtectedPids -Snapshot $Snapshot -SelfPid $SelfPid
  $byPid = @{}
  foreach ($p in $Snapshot.Processes) { $byPid[[int]$p.Pid] = $p }
  $exit = $null
  foreach ($e in $Records.Events) { if ($e.event -eq 'command-exit') { $exit = $e } }
  $roots = [System.Collections.Generic.List[object]]::new()
  $survivors = [System.Collections.Generic.Dictionary[string, object]]::new()
  $ignored = [System.Collections.Generic.Dictionary[string, object]]::new()
  foreach ($r in $Records.Roots) {
    if ($r.role -eq 'wrapper') { continue }
    if ($r.role -eq 'controller' -and -not $IncludeController) { continue }
    $state = $null
    $before = $r.beforeMs
    $after = $r.afterMs
    $pidOk = ($r.pid -is [int] -or $r.pid -is [long]) -and $r.pid -gt 0
    $beforeOk = $before -is [long] -or $before -is [int]
    $afterOk = $after -is [long] -or $after -is [int]
    if (-not $pidOk -or -not $beforeOk -or -not $afterOk -or $before -gt $after) {
      $problems.Add("the record of $($r.role) is unusable")
      $ambiguous = $true
      $roots.Add([pscustomobject]@{ Role = $r.role; Pid = $r.pid; State = 'unusable-record' })
      continue
    }
    $rpid = [int]$r.pid
    if ($protected -contains $rpid) {
      $roots.Add([pscustomobject]@{ Role = $r.role; Pid = $rpid; State = 'protected' })
      continue
    }
    $notAfter = $null
    if ($r.role -eq 'command' -and $null -ne $exit) { $notAfter = $exit.atMs }
    if (-not $byPid.ContainsKey($rpid)) {
      $state = 'absent'
      $found = Find-Descendants -Snapshot $Snapshot -RootPid $rpid -NotBeforeMs $before `
        -NotAfterMs $notAfter -Protected $protected -ToleranceMs $tol
      Add-OwnedFound -Found $found -Survivors $survivors -Ignored $ignored `
        -Why "descendant of the absent $($r.role) $rpid"
    } else {
      $m = $byPid[$rpid]
      if ($null -eq $m.CreatedMs) {
        $state = 'unknown'
        $ambiguous = $true
        $problems.Add("the creation time of pid $rpid is not known")
      } elseif ($m.CreatedMs -ge ($before - $tol) -and $m.CreatedMs -le ($after + $tol)) {
        $state = 'alive'
        $survivors["$rpid/$($m.CreatedMs)"] = [pscustomobject]@{ Pid = $rpid; CreatedMs = $m.CreatedMs
          Name = $m.Name; Why = "the recorded $($r.role)" }
        $found = Find-Descendants -Snapshot $Snapshot -RootPid $rpid -NotBeforeMs $m.CreatedMs `
          -NotAfterMs $null -Protected $protected -ToleranceMs $tol
        Add-OwnedFound -Found $found -Survivors $survivors -Ignored $ignored `
          -Why "descendant of the $($r.role) $rpid"
      } else {
        $state = 'pid-reused'
        if ($r.role -eq 'command' -and $null -ne $exit) {
          $found = Find-Descendants -Snapshot $Snapshot -RootPid $rpid -NotBeforeMs $before `
            -NotAfterMs $notAfter -Protected $protected -ToleranceMs $tol
          Add-OwnedFound -Found $found -Survivors $survivors -Ignored $ignored `
            -Why "descendant of the ended command $rpid"
        } else {
          $ambiguous = $true
          $problems.Add("pid $rpid ($($r.role)) is held by a process created at another time and " +
            'nothing proves the recorded one ended')
        }
      }
    }
    $roots.Add([pscustomobject]@{ Role = $r.role; Pid = $rpid; State = $state })
  }
  return [pscustomobject]@{ Roots = $roots.ToArray(); Survivors = @($survivors.Values)
    Ignored = @($ignored.Values); Ambiguous = $ambiguous; Problems = $problems.ToArray() }
}

# Stops each survivor through a process handle whose creation time is verified just before the stop.
function Stop-VerifiedProcesses {
  param($Survivors)
  $results = [System.Collections.Generic.List[object]]::new()
  foreach ($s in ($Survivors | Sort-Object { $_.CreatedMs } -Descending)) {
    $entry = [ordered]@{ pid = $s.Pid; createdMs = $s.CreatedMs; name = $s.Name; why = $s.Why
      outcome = $null }
    $p = $null
    try {
      $p = [Diagnostics.Process]::GetProcessById([int]$s.Pid)
    } catch {
      $entry.outcome = 'gone-before-stop'
    }
    if ($p) {
      try {
        $startMs = [DateTimeOffset]::new($p.StartTime).ToUnixTimeMilliseconds()
        if ([math]::Abs($startMs - [long]$s.CreatedMs) -gt 50) {
          $entry.outcome = 'identity-changed-not-stopped'
        } else {
          $p.Kill()
          $entry.outcome = if ($p.WaitForExit(5000)) { 'stopped' } else { 'stop-not-confirmed' }
        }
      } catch {
        $entry.outcome = 'stop-failed: ' + $_.Exception.Message
      } finally {
        $p.Dispose()
      }
    }
    $results.Add([pscustomobject]$entry)
  }
  return $results.ToArray()
}

function Invoke-OwnedBarrier {
  param([string]$RecordsFile, [switch]$IncludeController, [int]$ConfirmSeconds = 10,
    [string]$SnapshotFile = '')
  $started = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $records = Read-OwnedRecords -File $RecordsFile
  $snapshot = Get-ProcessSnapshot -SimulatedFile $SnapshotFile
  $state = Resolve-OwnedProcesses -Records $records -Snapshot $snapshot -SelfPid $PID `
    -IncludeController:$IncludeController
  $stops = @()
  $confirmed = $true
  $stillAlive = @()
  $verdict = $null
  if ($state.Survivors.Count -gt 0 -and $snapshot.Simulated) {
    $verdict = 'hold-survivor'
    $confirmed = $false
    $stillAlive = $state.Survivors
  } elseif ($state.Survivors.Count -gt 0) {
    $stops = @(Stop-VerifiedProcesses -Survivors $state.Survivors)
    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($ConfirmSeconds)
    do {
      Start-Sleep -Milliseconds 300
      $again = Get-ProcessSnapshot
      $left = @()
      if ($again.Ok) {
        foreach ($s in $state.Survivors) {
          $now = $again.Processes | Where-Object { $_.Pid -eq $s.Pid -and $_.CreatedMs -eq $s.CreatedMs }
          if ($now) { $left += $s }
        }
      } else {
        $left = $state.Survivors
      }
      $stillAlive = $left
    } while ($stillAlive.Count -gt 0 -and [DateTimeOffset]::UtcNow -lt $deadline)
    $confirmed = ($stillAlive.Count -eq 0)
  }
  if (-not $verdict) {
    if (-not $confirmed) { $verdict = 'hold-survivor' }
    elseif ($state.Ambiguous) { $verdict = 'hold-unknown' }
    elseif ($state.Survivors.Count -gt 0) { $verdict = 'stopped-owned' }
    else { $verdict = 'clean' }
  }
  return [ordered]@{
    schema = 'ms18d-c-cleanup-1'; verdict = $verdict; startedAtMs = $started
    finishedAtMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); selfPid = $PID
    includeController = [bool]$IncludeController; simulated = [bool]$snapshot.Simulated
    snapshotOk = [bool]$snapshot.Ok; snapshotError = $snapshot.Error
    processCount = @($snapshot.Processes).Count
    roots = @($state.Roots); survivors = @($state.Survivors); ignored = @($state.Ignored); stops = @($stops)
    confirmedGone = $confirmed
    stillAlive = @($stillAlive); ambiguous = [bool]$state.Ambiguous; problems = @($state.Problems)
  }
}

$script:OwnedExitCodes = @{ 'clean' = 0; 'stopped-owned' = 10; 'hold-unknown' = 20; 'hold-survivor' = 21 }

# A new JSON record (CRLF), created exclusively and flushed: an existing one is never overwritten.
function Write-OwnedJson {
  param([string]$Path, $Object)
  $text = ($Object | ConvertTo-Json -Depth 8) -replace "`r?`n", "`r`n"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $fs = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try {
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($text + "`r`n")
    $fs.Write($bytes, 0, $bytes.Length)
    $fs.Flush($true)
  } finally { $fs.Dispose() }
}

if ($Action -eq 'snapshot') {
  $snap = Get-ProcessSnapshot
  $snap | ConvertTo-Json -Depth 5 -Compress
  exit 0
} elseif ($Action -eq 'barrier') {
  if (-not $RecordsFile -or -not $OutFile) {
    [Console]::Error.WriteLine('usage: -Action barrier -RecordsFile <f> -OutFile <f>')
    exit 2
  }
  if (Test-Path -LiteralPath $OutFile) {
    [Console]::Error.WriteLine("the cleanup record $OutFile exists; it is never overwritten")
    exit 2
  }
  $result = Invoke-OwnedBarrier -RecordsFile $RecordsFile -IncludeController:$IncludeController `
    -ConfirmSeconds $ConfirmSeconds -SnapshotFile $SnapshotFile
  Write-OwnedJson -Path $OutFile -Object $result
  exit $script:OwnedExitCodes[$result.verdict]
} elseif ($Action -ne '') {
  [Console]::Error.WriteLine("unknown -Action $Action")
  exit 2
}
