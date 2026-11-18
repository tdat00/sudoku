# MS18c Stage 3 task-owned supervision library, dot-sourced by supervise-gq.ps1,
# standin-supervisor.ps1, proof-job.ps1 and status-gq.ps1 (one set of code for the real supervisor
# and its stand-ins). Nothing here decides a policy: the planner (gq-plan.cjs) decides, the
# committed manifest authorizes, and this library only owns the processes: the lock, the
# non-inheritable kill-on-close Job Object, the suspended launcher, the wall-clock T watchdog, the
# atomic status and the identity (PID plus CIM CreationDate in UTC microseconds).
# Works in Windows PowerShell 5.1 and PowerShell 7.
$script:GqTools = $PSScriptRoot
$script:GqRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..')).Path
$script:GqNode = 'C:\Program Files\nodejs\node.exe'
$script:GqRuns = Join-Path $script:GqRoot 'docs\difficulty-v3\evidence\MS18c\runs'

function Get-GqIso { [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ') }

function Get-GqMicros([DateTime]$When) {
  $utc = $When.ToUniversalTime()
  $utc.ToString('yyyy-MM-ddTHH:mm:ss.ffffff', [Globalization.CultureInfo]::InvariantCulture) + 'Z'
}

$script:GqWriteFailures = 0

# A bounded retry of a file action (a reader that holds a file without write sharing is the usual cause).
# It never throws: $true when the action succeeded, $false (and a counted failure) when it did not.
function Invoke-GqRetry {
  param([scriptblock]$Action, [int]$Tries = 6, [int]$DelayMs = 100)
  for ($i = 1; $i -le $Tries; $i++) {
    try {
      $null = & $Action
      return $true
    } catch {
      if ($i -lt $Tries) { Start-Sleep -Milliseconds $DelayMs }
    }
  }
  $script:GqWriteFailures++
  $false
}

# One JSON line of a log; best effort with bounded retries, never fatal.
function Write-GqLog {
  param([string]$File, [string]$Type, [hashtable]$Fields)
  $o = [ordered]@{ at = (Get-GqIso); type = $Type }
  if ($Fields) { foreach ($k in $Fields.Keys) { $o[$k] = $Fields[$k] } }
  $line = (ConvertTo-Json -InputObject $o -Compress -Depth 8) + "`r`n"
  $null = Invoke-GqRetry -Tries 6 { [IO.File]::AppendAllText($File, $line) }
}

# The latest status, replaced whole (a `.part` file and an atomic replace); readers never see half a
# file. Bounded retries; a heartbeat that still fails is skipped (returns $false) and never throws.
function Write-GqStatus {
  param([string]$File, $Status, [int]$Tries = 6)
  $text = ((ConvertTo-Json -InputObject $Status -Depth 8) -replace "`r?`n", "`r`n") + "`r`n"
  $part = "$File.part"
  Invoke-GqRetry -Tries $Tries {
    [IO.File]::WriteAllText($part, $text)
    if (Test-Path -LiteralPath $File) {
      [IO.File]::Replace($part, $File, [NullString]::Value)
    } else { [IO.File]::Move($part, $File) }
  }
}

function Add-GqNative {
  if (-not ('GqNative' -as [type])) {
    Add-Type -TypeDefinition ([IO.File]::ReadAllText((Join-Path $script:GqTools 'gq-native.cs'))) `
      -Language CSharp
  }
}

# CIM CreationDate of a process, UTC, truncated to microseconds: the source of the supervisor identity.
function Get-GqCimIdentity {
  param([int]$ProcessId)
  $c = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -OperationTimeoutSec 15 -ErrorAction Stop
  if (-not $c) { return $null }
  [pscustomobject]@{ pid = [int]$c.ProcessId; name = $c.Name; parent = [int]$c.ParentProcessId
    createdUtcMicros = (Get-GqMicros $c.CreationDate); exe = $c.ExecutablePath }
}

# The identity of this process: the CIM value, cross-checked with GetProcessTimes (the same FILETIME).
function Get-GqSelfIdentity {
  $cim = Get-GqCimIdentity -ProcessId $PID
  $ticks = [GqNative]::CreationFileTimeOf($PID)
  $native = if ($ticks -gt 0) { Get-GqMicros ([DateTime]::FromFileTimeUtc($ticks)) } else { $null }
  if (-not $cim -or $native -ne $cim.createdUtcMicros) {
    throw "The CIM creation time '$($cim.createdUtcMicros)' and GetProcessTimes '$native' differ"
  }
  $cim
}

function Get-GqHostJobInfo {
  $in = [GqNative]::InJob([GqNative]::CurrentProcess(), [IntPtr]::Zero)
  $limits = $null
  if ($in) { $limits = [GqNative]::JobLimits([IntPtr]::Zero) }
  [pscustomobject]@{ inJob = $in; limits = $limits }
}

# The environment block of the owned launcher: the current one without Node/Sudoku test variables.
function Get-GqLauncherEnvironment {
  $removed = New-Object Collections.Generic.List[string]
  $pairs = New-Object Collections.Generic.List[string]
  $all = [Environment]::GetEnvironmentVariables().GetEnumerator() |
    Sort-Object { ([string]$_.Key).ToUpperInvariant() }
  foreach ($e in $all) {
    $name = [string]$e.Key
    if ($name -match '^(NODE_|SG_|NPM_CONFIG_)' -or $name -eq 'NODE') { $removed.Add($name) }
    else { $pairs.Add("$name=$($e.Value)") }
  }
  [pscustomobject]@{ pairs = $pairs.ToArray(); removed = $removed.ToArray() }
}

function ConvertTo-GqArgument([string]$Text) {
  if ($Text -match '[\s"]') { '"' + ($Text -replace '"', '\"') + '"' } else { $Text }
}

# One bounded Node command of the planner; the last output line is its JSON. Only that child is ever killed.
function Invoke-GqNode {
  param([string[]]$NodeArgs, [int]$TimeoutSeconds, [string]$WorkingDirectory = $script:GqRoot)
  $si = New-Object Diagnostics.ProcessStartInfo
  $si.FileName = $script:GqNode
  $si.Arguments = (($NodeArgs | ForEach-Object { ConvertTo-GqArgument $_ }) -join ' ')
  $si.UseShellExecute = $false
  $si.RedirectStandardOutput = $true
  $si.RedirectStandardError = $true
  $si.CreateNoWindow = $true
  $si.WorkingDirectory = $WorkingDirectory
  $p = [Diagnostics.Process]::Start($si)
  $out = $p.StandardOutput.ReadToEndAsync()
  $err = $p.StandardError.ReadToEndAsync()
  if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
    try { $p.Kill() } catch { }
    return [pscustomobject]@{ ok = $false; timedOut = $true; exit = $null; json = $null; stderr = '' }
  }
  $p.WaitForExit()
  $text = $out.Result
  $line = ($text -split "`r?`n" | Where-Object { $_.Trim() -ne '' } | Select-Object -Last 1)
  $json = $null
  try { $json = ConvertFrom-Json -InputObject $line } catch { }
  [pscustomobject]@{ ok = ($p.ExitCode -eq 0 -and $null -ne $json); timedOut = $false; exit = $p.ExitCode
    json = $json; stderr = $err.Result }
}

# The timing lock, with the task's rules: our lock `<pid>|<run>|<utc>` held open (FileShare.Read), a foreign
# dv3-timing.lock is only observed, never removed; >= 15 s after our previous release and after an observed
# foreign release; ONE bounded acquisition wait. Returns { acquired, handle, waitedSeconds, ... }.
function Enter-GqLock {
  param([string]$OwnLock, [string]$ForeignLock, [string]$RunId, [double]$WaitSeconds,
    [string]$LastRelease, [string]$LogFile)
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $r = [ordered]@{ acquired = $false; handle = $null; waitedSeconds = 0; reason = $null; foreignSeen = $null
    foreignReleased = $null; ownPresentAtAsk = (Test-Path -LiteralPath $OwnLock) }
  if ($LastRelease -and (Test-Path -LiteralPath $LastRelease)) {
    $text = ([IO.File]::ReadAllText($LastRelease)).Trim()
    $released = [DateTime]::Parse($text, [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
    $gap = 15 - ([DateTime]::UtcNow - $released).TotalSeconds
    if ($gap -gt 0) { Start-Sleep -Milliseconds ([int][math]::Ceiling($gap * 1000)) }
  }
  while ($true) {
    $foreign = Test-Path -LiteralPath $ForeignLock
    $own = Test-Path -LiteralPath $OwnLock
    if ($foreign -and -not $r.foreignSeen) {
      $r.foreignSeen = Get-GqIso
      Write-GqLog $LogFile 'lock-foreign-seen' @{ path = $ForeignLock }
    }
    if ($r.foreignSeen -and -not $foreign -and -not $r.foreignReleased) {
      $r.foreignReleased = Get-GqIso
      Write-GqLog $LogFile 'lock-foreign-released' @{ settleSeconds = 15 }
      Start-Sleep -Seconds 15
      continue
    }
    if (-not $foreign -and -not $own) {
      $fs = $null
      try {
        $fs = [IO.File]::Open($OwnLock, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write,
          [IO.FileShare]::Read)
      } catch [IO.IOException] { $fs = $null }
      if ($fs) {
        $bytes = [Text.Encoding]::UTF8.GetBytes("$PID|$RunId|$(Get-GqIso)")
        $fs.Write($bytes, 0, $bytes.Length)
        $fs.Flush()
        if (Test-Path -LiteralPath $ForeignLock) {
          $fs.Dispose()
          Remove-Item -LiteralPath $OwnLock -ErrorAction SilentlyContinue
          Write-GqLog $LogFile 'lock-race' @{ note = 'a foreign lock appeared; released our own and waiting' }
          continue
        }
        $r.acquired = $true
        $r.handle = $fs
        $r.waitedSeconds = [math]::Round($sw.Elapsed.TotalSeconds, 3)
        return [pscustomobject]$r
      }
    }
    if ($sw.Elapsed.TotalSeconds -ge $WaitSeconds) {
      $seconds = [math]::Round($sw.Elapsed.TotalSeconds, 1)
      $r.reason = "no timing slot after $seconds s (foreign=$foreign, own=$own)"
      $r.waitedSeconds = [math]::Round($sw.Elapsed.TotalSeconds, 3)
      return [pscustomobject]$r
    }
    Start-Sleep -Seconds 1
  }
}

function Exit-GqLock {
  param($Lock, [string]$OwnLock, [string]$LastRelease)
  $problem = $null
  try { $Lock.handle.Dispose() } catch { $problem = "dispose: $($_.Exception.Message)" }
  try { Remove-Item -LiteralPath $OwnLock -ErrorAction Stop } catch {
    $problem = "remove: $($_.Exception.Message)"
  }
  if ($LastRelease) { [IO.File]::WriteAllText($LastRelease, (Get-GqIso) + "`r`n") }
  $problem
}

function Get-GqElapsed($Start, $Freq) { ([GqNative]::NowTicks() - $Start) / $Freq }

# The text of a file that another process may be appending to or replacing: opened with
# ReadWrite|Delete sharing so that the reader never blocks a writer. $null when it cannot be read.
function Read-GqSharedText {
  param([string]$File)
  $stream = $null
  try {
    $share = [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete
    $stream = New-Object IO.FileStream($File, [IO.FileMode]::Open, [IO.FileAccess]::Read, $share)
    (New-Object IO.StreamReader($stream)).ReadToEnd()
  } catch {
    $null
  } finally {
    if ($stream) { $stream.Dispose() }
  }
}

function Get-GqSeenDetail($Seen) {
  @($Seen.Keys | Sort-Object | ForEach-Object { [ordered]@{ pid = $_; createdUtcMicros = $Seen[$_] } })
}

# Remembers every job member with its creation time (UTC microseconds) the first time it is seen.
function Update-GqSeen($Seen, $Ids) {
  foreach ($id in $Ids) {
    if (-not $Seen.ContainsKey($id)) {
      $ticks = [GqNative]::CreationFileTimeOf($id)
      $Seen[$id] = if ($ticks -gt 0) { Get-GqMicros ([DateTime]::FromFileTimeUtc($ticks)) } else { $null }
    }
  }
}

# The owned window: Job Object (unnamed, kill-on-close, no breakaway, never inherited), the launcher
# created SUSPENDED, assigned, then resumed; the wall-clock T runs from the creation (T-start is a
# QueryPerformanceCounter value, the clock of Node's process.hrtime, passed to the launcher in
# nanoseconds); at T the whole job is terminated; W ends when the job has no process. A failed setup
# throws before anything has run; afterwards nothing throws (a fault is flagged in the result).
function Invoke-GqWindow {
  param([string]$Exe, [string[]]$Arguments, [string]$Directory, [string[]]$Environment, [string]$StdoutPath,
    [string]$StderrPath, [double]$TSeconds, [scriptblock]$OnStarted, [scriptblock]$OnBeat,
    [double]$HeartbeatSeconds = 10, [double]$LeftoverGraceSeconds = 5)
  $freq = [double][GqNative]::Frequency()
  $job = [GqNative]::CreateKillOnCloseJob()
  $launch = $null
  $res = [ordered]@{ jobLimits = [GqNative]::JobLimits($job); launcherPid = $null; launcherCreated = $null
    tStartIso = $null; tStartTicks = $null; tStartNs = $null; createdAfterSeconds = $null
    resumedAfterSeconds = $null; launcherExit = $null; tExpired = $false; leftover = $false; stuck = $false
    wSeconds = $null; launcherExitedAfterSeconds = $null; members = @(); membersDetail = @()
    fault = $null; callbackErrors = 0; lastCallbackError = $null }
  try {
    # Setup: a failure here throws and nothing has run (no uncontained fallback).
    $t0 = [GqNative]::NowTicks()
    $ns = [GqNative]::TicksToNs($t0)
    $res.tStartIso = Get-GqIso
    $res.tStartTicks = $t0
    $res.tStartNs = $ns
    $parts = @((ConvertTo-GqArgument $Exe)) + ($Arguments | ForEach-Object { ConvertTo-GqArgument $_ }) +
      "$ns"
    $launch = [GqNative]::CreateSuspended($Exe, ($parts -join ' '), $Directory, $Environment,
      $StdoutPath, $StderrPath)
    $res.launcherPid = $launch.Pid
    $res.launcherCreated = Get-GqMicros ([DateTime]::FromFileTimeUtc($launch.CreationFileTime))
    $res.createdAfterSeconds = Get-GqElapsed $t0 $freq
    [GqNative]::AssignToJob($job, $launch)
    [GqNative]::Resume($launch)
    $res.resumedAfterSeconds = Get-GqElapsed $t0 $freq

    # From here on nothing throws: only the launcher exit, T expiry or an empty job end the window. A
    # failing callback is counted; an unexpected fault ends the job (it cannot be supervised) and is flagged.
    $seen = New-Object 'Collections.Generic.Dictionary[int,object]'
    try { if ($OnStarted) { & $OnStarted $res $job } } catch {
      $res.callbackErrors++
      $res.lastCallbackError = $_.Exception.Message
    }
    try {
      $beat = 0.0
      while ($true) {
        $exited = [GqNative]::WaitExit($launch, 250)
        $elapsed = Get-GqElapsed $t0 $freq
        Update-GqSeen $seen ([GqNative]::ProcessIds($job))
        if ($exited) { break }
        if ($elapsed -ge $TSeconds) {
          $res.tExpired = $true
          [GqNative]::TerminateJob($job, 1)
          break
        }
        if ($elapsed -ge $beat) {
          $beat = $elapsed + $HeartbeatSeconds
          try {
            if ($OnBeat) {
              & $OnBeat $elapsed ([GqNative]::ActiveProcesses($job)) ([GqNative]::ProcessIds($job)) `
                (Get-GqSeenDetail $seen)
            }
          } catch {
            $res.callbackErrors++
            $res.lastCallbackError = $_.Exception.Message
          }
        }
      }
    } catch {
      $res.fault = 'window loop: ' + $_.Exception.Message
      try { [GqNative]::TerminateJob($job, 1) } catch { }
    }
    try {
      $res.launcherExitedAfterSeconds = Get-GqElapsed $t0 $freq
      $limit = $res.launcherExitedAfterSeconds + $(if ($res.tExpired) { 10 } else { $LeftoverGraceSeconds })
      while ([GqNative]::ActiveProcesses($job) -gt 0) {
        Update-GqSeen $seen ([GqNative]::ProcessIds($job))
        if ((Get-GqElapsed $t0 $freq) -ge $limit) {
          if ($res.tExpired -or $res.leftover -or $res.fault) { $res.stuck = $true; break }
          $res.leftover = $true
          [GqNative]::TerminateJob($job, 1)
          $limit = (Get-GqElapsed $t0 $freq) + 10
          continue
        }
        Start-Sleep -Milliseconds 50
      }
    } catch {
      $res.fault = (@($res.fault, 'drain: ' + $_.Exception.Message) | Where-Object { $_ }) -join '; '
      try { [GqNative]::TerminateJob($job, 1) } catch { }
    }
    $res.wSeconds = Get-GqElapsed $t0 $freq
    try { $res.launcherExit = [GqNative]::ExitCode($launch) } catch { $res.launcherExit = -1 }
    $res.members = @($seen.Keys | Sort-Object)
    $res.membersDetail = Get-GqSeenDetail $seen
    [pscustomobject]$res
  } finally {
    if ($launch) { [GqNative]::Release($launch) }
    [GqNative]::Close($job)
  }
}
