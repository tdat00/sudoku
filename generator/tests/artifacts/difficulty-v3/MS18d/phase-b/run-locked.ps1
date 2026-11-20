# MS18d Phase B task-owned (from run-locked.ps1 of Phase A, which it does not modify): one locked command
# per call. It dot-sources the VERBATIM shared helper (invoke-dv3node.ps1 of the MS18c folder, unchanged),
# keeps the shared slot rules and runs `node` through Invoke-Dv3Node and the INCREMENTAL tee
# (tee-append.js), which writes the transcript while the command runs. It differs from Phase A's wrapper in
# what it refuses to hide:
#  - the 15-second gap is measured from the LATEST release found in this phase's lock log AND in Phase A's
#    (a new file name is not a gap reset); the actual gap before the call is written to the log record;
#  - a transcript that already exists stops the call before the lock is taken; a stale-looking shared lock
#    (its process is gone) stops it at once, is reported and is NEVER deleted here;
#  - a failure is never swallowed: the call THROWS when the command ended with an exit code that is not in
#    -Expect (default 0), when the helper failed or timed out, or when the transcript is incomplete, after the
#    record is logged. A caller that continues after it did not ask for that.
# Run from generator/ (the working directory is the node working directory):
#   . tests\artifacts\difficulty-v3\MS18d\phase-b\run-locked.ps1
#   Invoke-Locked -Task 'MS18d tests' -Log 'tests.txt' -NodeArgs @('tests\artifacts\...\x.js')
# The lock log is docs/difficulty-v3/evidence/MS18d/phase-b/lock-log.jsonl, the transcripts are in its
# transcripts\ folder. The variables below are overridden only by the tests of this wrapper.
$script:Ms18dRoot = 'Q:\git\sudoku'
$script:Ms18dTools = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18d\phase-b"
$script:HelperPath = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1"
$script:PhaseALockLog = "$script:Ms18dRoot\docs\difficulty-v3\evidence\MS18d\lock-log.jsonl"
$script:PhaseBEvidence = "$script:Ms18dRoot\docs\difficulty-v3\evidence\MS18d\phase-b"
$script:LockLog = "$script:PhaseBEvidence\lock-log.jsonl"
$script:GapSeconds = 15
$script:GapMarginSeconds = 0.3
. $script:HelperPath

# The latest `finished` instant in the lock logs (text parse: the exact milliseconds and offset), or $null.
function Get-LastRelease {
  $latest = $null
  foreach ($file in @($script:PhaseALockLog, $script:LockLog)) {
    if (-not (Test-Path -LiteralPath $file)) { continue }
    foreach ($line in [IO.File]::ReadAllLines($file)) {
      if ($line -match '"finished":"([^"]+)"') {
        $when = [DateTimeOffset]::Parse($Matches[1])
        if ($null -eq $latest -or $when -gt $latest) { $latest = $when }
      }
    }
  }
  return $latest
}

# What the shared slot looks like now, without touching it.
function Get-SlotState {
  $timing = Join-Path $env:TEMP 'dv3-timing.lock'
  $mine = Join-Path $env:TEMP 'dv3-sudoku.lock'
  $state = [ordered]@{ TimingLock = (Test-Path -LiteralPath $timing)
    SharedLock = (Test-Path -LiteralPath $mine)
    SharedLockPid = $null; SharedLockTask = $null; SharedLockAlive = $null }
  if ($state.SharedLock) {
    try {
      $stream = [IO.File]::Open($mine, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
      try { $text = (New-Object IO.StreamReader($stream)).ReadToEnd() } finally { $stream.Dispose() }
      $parts = $text.Split('|')
      if ($parts.Count -ge 2 -and $parts[0] -match '^\d+$') {
        $state.SharedLockPid = [int]$parts[0]
        $state.SharedLockTask = $parts[1]
        $state.SharedLockAlive = [bool](Get-Process -Id $state.SharedLockPid -ErrorAction SilentlyContinue)
      }
    } catch {
      $state.SharedLockAlive = $null
    }
  }
  return [pscustomobject]$state
}

function Invoke-Locked {
  param([string]$Task, [string]$Log, [string[]]$NodeArgs, [int[]]$Expect = @(0), [switch]$NoTee)
  $stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  $transcripts = "$script:PhaseBEvidence\transcripts"
  $logPath = $null
  if (-not $NoTee) {
    $logPath = $Log
    if (-not [IO.Path]::IsPathRooted($Log)) { $logPath = Join-Path $transcripts $Log }
    if (Test-Path -LiteralPath $logPath) {
      throw "MS18d: the transcript $logPath exists; a transcript is never overwritten. Nothing was started."
    }
  }
  $slot = Get-SlotState
  if ($slot.SharedLock -and $slot.SharedLockAlive -eq $false) {
    throw ("MS18d: the shared lock dv3-sudoku.lock names process $($slot.SharedLockPid) " +
      "($($slot.SharedLockTask)), which is gone. It looks stale. It is NOT deleted here: report it to " +
      'the orchestrator. Nothing was started.')
  }
  $last = Get-LastRelease
  if ($null -ne $last) {
    $wait = $script:GapSeconds + $script:GapMarginSeconds - ([DateTimeOffset]::Now - $last).TotalSeconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds ([int]($wait * 1000)) }
  }
  $asked = Get-Date
  $gap = $null
  if ($null -ne $last) { $gap = [math]::Round(([DateTimeOffset]$asked - $last).TotalSeconds, 3) }
  $cwd = (Get-Location).Path
  $args2 = $NodeArgs
  if (-not $NoTee) { $args2 = @((Join-Path $script:Ms18dTools 'tee-append.js'), $logPath) + $NodeArgs }
  $failed = $null
  # The helper sets LASTEXITCODE only after the process ended: a timeout must not log a stale exit code.
  $global:LASTEXITCODE = $null
  try {
    Invoke-Dv3Node -Task $Task -NodeArgs $args2 -AllowExit1 | Out-Null
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = Get-Date
  $exitCode = $global:LASTEXITCODE
  $teeSeconds = $null
  $complete = $null
  $transcriptExit = $null
  if (-not $NoTee) {
    $complete = $false
    if (Test-Path -LiteralPath $logPath) {
      # A killed tee may still hold the file for a moment: read it shared, and never fail before the record.
      $final = $null
      try {
        $share = [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete
        $stream = [IO.File]::Open($logPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, $share)
        try { $text = (New-Object IO.StreamReader($stream)).ReadToEnd() } finally { $stream.Dispose() }
        $final = @($text -split "`r?`n" | Where-Object { $_.Trim() -ne '' }) | Select-Object -Last 1
      } catch {
        $final = $null
      }
      if ($final -match '^exit=(\d+) seconds=([0-9.]+)$') {
        $complete = $true
        $transcriptExit = [int]$Matches[1]
        $teeSeconds = [double]$Matches[2]
      }
    }
  }
  $elapsed = [math]::Round(($finished - $asked).TotalSeconds, 3)
  $problem = $failed
  if (-not $problem -and $null -eq $exitCode) { $problem = 'the command returned no exit code' }
  if (-not $problem -and -not $NoTee -and -not $complete) {
    $problem = 'the transcript has no exit line: it is incomplete'
  }
  if (-not $problem -and -not $NoTee -and $transcriptExit -ne $exitCode) {
    $problem = "the exit code $exitCode differs from the transcript's $transcriptExit"
  }
  if (-not $problem -and ($Expect -notcontains $exitCode)) {
    $problem = "exit code $exitCode, expected $($Expect -join ' or ')"
  }
  $record = [ordered]@{
    task = $Task; argv = ($NodeArgs -join ' '); transcript = $logPath; asked = $asked.ToString($stamp)
    finished = $finished.ToString($stamp); cwd = $cwd; exit = $exitCode; teeSeconds = $teeSeconds
    elapsedSeconds = $elapsed
    lastReleaseBefore = $(if ($null -ne $last) { $last.ToString($stamp) } else { $null })
    gapBeforeAskSeconds = $gap; transcriptComplete = $complete; slotBefore = $slot; error = $problem
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $script:LockLog) | Out-Null
  [IO.File]::AppendAllText($script:LockLog, (($record | ConvertTo-Json -Compress -Depth 4) + "`r`n"))
  Write-Host ("LOCKED {0}: exit={1} elapsed={2}s gap={3}s complete={4}{5}" -f $Task, $exitCode, $elapsed,
    $gap, $complete, $(if ($problem) { " ERROR $problem" } else { '' }))
  if ($problem) {
    throw "MS18d $Task FAILED: $problem (transcript $logPath). Stop; do not retry or continue."
  }
  return [pscustomobject]@{ Task = $Task; Exit = $exitCode; TeeSeconds = $teeSeconds; Elapsed = $elapsed
    Transcript = $logPath; Complete = $complete; GapBeforeAsk = $gap }
}
