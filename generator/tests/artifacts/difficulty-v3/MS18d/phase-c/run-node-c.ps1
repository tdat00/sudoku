# MS18d Phase C0 task-owned: the runner of Node commands of the Phase C TOOLING work (tests, format check,
# freeze), a Phase C copy of phase-b/run-locked.ps1 that writes nothing into the Phase A or Phase B records.
# Every Node command runs through the VERBATIM shared helper (invoke-dv3node.ps1 of the MS18c folder,
# unchanged: one slot, 450 projected / 540 s ceiling) and the frozen Phase B incremental tee
# (tee-append.js, whose transcript is on disk while the command runs). It keeps what Phase B settled and
# what SA1 asked since:
#  - the 15 s gap (plus a 0.3 s margin) is measured from the latest release of the Phase A log, the Phase B
#    log, the Phase C release ledger (phase-c\lock-log.jsonl, written only by real GP runs) and this runner's
#    own log, and the actual gap is written to the record;
#  - a transcript that exists, or a shared lock whose process is gone, stops the call before anything starts;
#    a stale lock is reported and NEVER deleted here;
#  - a failure is never swallowed and exit 1 is NOT allowed: the call THROWS after the record is written when
#    the exit code is not 0, the helper failed, or the transcript has no `exit=` line. (There is deliberately
#    no -Expect: an exit 1 has no defined meaning for a test or a tool; only the GP controller defines one.)
# The log is docs/difficulty-v3/evidence/MS18d/phase-c/tooling-lock-log.jsonl, the transcripts are in
# phase-c\transcripts\. From generator\:
#   . tests\artifacts\difficulty-v3\MS18d\phase-c\run-node-c.ps1
#   Invoke-NodeC -Task 'MS18d-C tests' -Log 'units-1.txt' -NodeArgs @('tests\artifacts\...\test-units.js')
$script:Ms18dRoot = 'Q:\git\sudoku'
$script:ToolsB = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18d\phase-b"
$script:HelperPath = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1"
$script:EvidenceRoot = "$script:Ms18dRoot\docs\difficulty-v3\evidence\MS18d"
$script:ReleaseLogs = @("$script:EvidenceRoot\lock-log.jsonl", "$script:EvidenceRoot\phase-b\lock-log.jsonl",
  "$script:EvidenceRoot\phase-c\lock-log.jsonl")
$script:RunnerLog = "$script:EvidenceRoot\phase-c\tooling-lock-log.jsonl"
$script:Transcripts = "$script:EvidenceRoot\phase-c\transcripts"
$script:GapSeconds = 15
$script:GapMarginSeconds = 0.3
$script:WatchGiveUpSeconds = 1200
. $script:HelperPath
. "$PSScriptRoot\slot-watch.ps1"

# The latest `finished` or `releaseObservedAt` instant in the release logs and in this runner's log, or $null.
function Get-LastReleaseNodeC {
  $latest = $null
  foreach ($file in ($script:ReleaseLogs + @($script:RunnerLog))) {
    if (-not (Test-Path -LiteralPath $file)) { continue }
    foreach ($line in [IO.File]::ReadAllLines($file)) {
      foreach ($name in @('finished', 'releaseObservedAt')) {
        if ($line -match ('"' + $name + '":"([^"]+)"')) {
          $when = [DateTimeOffset]::MinValue
          $parsed = [DateTimeOffset]::TryParse($Matches[1], [ref]$when)
          if ($parsed -and ($null -eq $latest -or $when -gt $latest)) {
            $latest = $when
          }
        }
      }
    }
  }
  return $latest
}

function Get-SlotStateNodeC {
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

function Invoke-NodeC {
  param([Parameter(Mandatory)][string]$Task, [Parameter(Mandatory)][string]$Log,
    [Parameter(Mandatory)][string[]]$NodeArgs)
  $stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  $logPath = $Log
  if (-not [IO.Path]::IsPathRooted($Log)) { $logPath = Join-Path $script:Transcripts $Log }
  if (Test-Path -LiteralPath $logPath) {
    throw "MS18d-C: the transcript $logPath exists; a transcript is never overwritten. Nothing was started."
  }
  $slot = Get-SlotStateNodeC
  if ($slot.SharedLock -and $slot.SharedLockAlive -eq $false) {
    throw ("MS18d-C: the shared lock dv3-sudoku.lock names process $($slot.SharedLockPid) " +
      "($($slot.SharedLockTask)), which is gone. It looks stale. It is NOT deleted here: report it to " +
      'the orchestrator. Nothing was started.')
  }
  $last = Get-LastReleaseNodeC
  $notBefore = 0
  if ($null -ne $last) {
    $gapMs = ($script:GapSeconds + $script:GapMarginSeconds) * 1000
    $notBefore = $last.ToUnixTimeMilliseconds() + [long]$gapMs
  }
  # the lock watch (SA1 C0-1) during the same gap wait: both lock files at least once a second for the
  # 15.3 s right before the call; any lock restarts the window; the wait is bounded and ends in a refusal
  # to start
  $watch = Wait-SlotQuiet -WindowSeconds ($script:GapSeconds + $script:GapMarginSeconds) `
    -GiveUpSeconds $script:WatchGiveUpSeconds -IntervalMs 250 -NotBeforeMs $notBefore
  if ($watch.gaveUp) {
    throw ("MS18d-C: the shared slot was not quiet for 15.3 s within $($script:WatchGiveUpSeconds) s " +
      "($($watch.restartCount) restarts). Nothing was started; report it to the orchestrator.")
  }
  $asked = Get-Date
  $gap = $null
  if ($null -ne $last) { $gap = [math]::Round(([DateTimeOffset]$asked - $last).TotalSeconds, 3) }
  $cwd = (Get-Location).Path
  $args2 = @((Join-Path $script:ToolsB 'tee-append.js'), $logPath) + $NodeArgs
  $failed = $null
  $global:LASTEXITCODE = $null
  try {
    Invoke-Dv3Node -Task $Task -NodeArgs $args2 | Out-Null
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = Get-Date
  $exitCode = $global:LASTEXITCODE
  $complete = $false
  $transcriptExit = $null
  if (Test-Path -LiteralPath $logPath) {
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
    }
  }
  $elapsed = [math]::Round(($finished - $asked).TotalSeconds, 3)
  $problem = $failed
  if (-not $problem -and $null -eq $exitCode) { $problem = 'the command returned no exit code' }
  if (-not $problem -and -not $complete) { $problem = 'the transcript has no exit line: it is incomplete' }
  if (-not $problem -and $transcriptExit -ne $exitCode) {
    $problem = "the exit code $exitCode differs from the transcript's $transcriptExit"
  }
  if (-not $problem -and $exitCode -ne 0) { $problem = "exit code $exitCode, expected 0" }
  $record = [ordered]@{
    task = $Task; argv = ($NodeArgs -join ' '); transcript = $logPath; asked = $asked.ToString($stamp)
    finished = $finished.ToString($stamp); cwd = $cwd; exit = $exitCode; elapsedSeconds = $elapsed
    lastReleaseBefore = $(if ($null -ne $last) { $last.ToString($stamp) } else { $null })
    gapBeforeAskSeconds = $gap; transcriptComplete = $complete; slotBefore = $slot; error = $problem
    watch = [ordered]@{ firstCheckMs = $watch.firstCheckMs; lastCheckMs = $watch.lastCheckMs
      checks = $watch.checks; restartCount = $watch.restartCount; maxIntervalMs = $watch.maxIntervalMs }
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $script:RunnerLog) | Out-Null
  [IO.File]::AppendAllText($script:RunnerLog, (($record | ConvertTo-Json -Compress -Depth 4) + "`r`n"))
  Write-Host ("LOCKED-C {0}: exit={1} elapsed={2}s gap={3}s complete={4}{5}" -f $Task, $exitCode, $elapsed,
    $gap, $complete, $(if ($problem) { " ERROR $problem" } else { '' }))
  if ($problem) {
    throw "MS18d-C $Task FAILED: $problem (transcript $logPath). Stop; do not retry or continue."
  }
  return [pscustomobject]@{ Task = $Task; Exit = $exitCode; Elapsed = $elapsed; Transcript = $logPath
    GapBeforeAsk = $gap }
}
