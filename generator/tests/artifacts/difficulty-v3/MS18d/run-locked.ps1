# MS18d task-owned (from run-locked.ps1 of MS18c): one locked command per call, with the lock wait recorded.
# It dot-sources the VERBATIM shared helper (invoke-dv3node.ps1 of the MS18c folder, unchanged), waits so that
# at least 15 seconds have passed since this task's previous release (read from the last line of its lock
# log), runs `node` through Invoke-Dv3Node (through tee-run.js, which also writes the transcript) and
# appends one JSON line to docs/difficulty-v3/evidence/MS18d/lock-log.jsonl: the task, the argument list,
# when it asked, when it finished, the node seconds the helper reports, the wait (total minus node
# seconds) and the exit code. Run from generator/ (the working directory is the node working directory).
# Every top-level Node command of this task goes through it, even a file-only one.
#   . tests\artifacts\difficulty-v3\MS18d\run-locked.ps1
#   Invoke-Locked -Task 'MS18d tests' -Log 'tests.txt' -NodeArgs @('tests\artifacts\difficulty-v3\MS18d\x.js')
$script:Ms18dRoot = 'Q:\git\sudoku'
$script:Ms18dTools = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18d"
. "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1"
$script:Ms18dEvidence = "$script:Ms18dRoot\docs\difficulty-v3\evidence\MS18d"
$script:LockLog = "$script:Ms18dEvidence\lock-log.jsonl"

function Invoke-Locked {
  param([string]$Task, [string]$Log, [string[]]$NodeArgs, [switch]$AllowExit1, [switch]$NoTee)
  if (Test-Path $script:LockLog) {
    $last = @(Get-Content $script:LockLog | Where-Object { $_.Trim() -ne '' }) | Select-Object -Last 1
    if ($last -and $last -match '"finished":"([^"]+)"') {
      $then = [DateTimeOffset]::Parse($Matches[1])
      $gap = 15 - ([DateTimeOffset]::Now - $then).TotalSeconds
      if ($gap -gt 0) { Start-Sleep -Milliseconds ([int]($gap * 1000)) }
    }
  }
  $asked = Get-Date
  $cwd = (Get-Location).Path
  $args2 = $NodeArgs
  if (-not $NoTee) {
    $tee = Join-Path $script:Ms18dTools 'tee-run.js'
    $logPath = $Log
    if (-not [IO.Path]::IsPathRooted($Log)) { $logPath = Join-Path "$script:Ms18dEvidence\transcripts" $Log }
    $args2 = @($tee, $logPath) + $NodeArgs
  }
  $summary = $null
  $failed = $null
  # The helper sets LASTEXITCODE only after the process ends: a timeout must not log a stale exit code.
  $global:LASTEXITCODE = $null
  try {
    $summary = Invoke-Dv3Node -Task $Task -NodeArgs $args2 -AllowExit1:$AllowExit1 6>&1 | Out-String
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = Get-Date
  $nodeSeconds = $null
  if ($summary -match 'seconds=([0-9.]+)') { $nodeSeconds = [double]$Matches[1] }
  $total = ($finished - $asked).TotalSeconds
  $stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  $record = [ordered]@{
    task = $Task; argv = ($NodeArgs -join ' '); asked = $asked.ToString($stamp)
    finished = $finished.ToString($stamp); cwd = $cwd; exit = $LASTEXITCODE; nodeSeconds = $nodeSeconds
    waitSeconds = $(if ($null -ne $nodeSeconds) { [math]::Round($total - $nodeSeconds, 1) } else { $null })
    error = $failed
  }
  New-Item -ItemType Directory -Force -Path $script:Ms18dEvidence | Out-Null
  [IO.File]::AppendAllText($script:LockLog, (($record | ConvertTo-Json -Compress) + "`r`n"))
  $note = $(if ($failed) { " ERROR $failed" } else { '' })
  Write-Host ("LOCKED {0}: exit={1} node={2}s wait={3}s{4}" -f $Task, $LASTEXITCODE, $nodeSeconds,
    $record.waitSeconds, $note)
}
