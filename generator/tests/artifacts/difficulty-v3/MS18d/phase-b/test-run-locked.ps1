# MS18d Phase B task-owned tests of run-locked.ps1 (the Phase B lock wrapper) on short-lived STAND-INS
# (fake-child.js), run by test-run-locked.js as ONE command under the real shared lock. They use an
# ISOLATED lock folder (TEMP is a project-local scratch folder, so the real dv3-*.lock files are never
# touched), isolated logs and, for the kill test only, a copy of the verbatim shared helper in which the
# single literal 540000 is replaced IN MEMORY by 4000 (the file is untouched): the same code, a shorter
# limit.
$ErrorActionPreference = 'Stop'
$scratch = $env:MS18D_SCRATCH
if (-not $scratch -or $env:TEMP -ne $scratch) { throw 'run this through test-run-locked.js (isolated TEMP)' }
Set-Location 'Q:\git\sudoku\generator'
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS18d\phase-b\run-locked.ps1'
$fake = 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS18d\phase-b\fake-child.js'
$script:PhaseALockLog = "$scratch\phase-a-lock-log.jsonl"
$script:PhaseBEvidence = "$scratch\evidence"
$script:LockLog = "$scratch\evidence\lock-log.jsonl"
$script:GapSeconds = 0
$script:GapMarginSeconds = 0
$helperText = [IO.File]::ReadAllText($script:HelperPath)
if ([regex]::Matches($helperText, '540000').Count -ne 1) { throw 'the helper no longer has one 540000' }
. ([scriptblock]::Create($helperText.Replace('540000', '4000')))
$env:FAKE_HOLD = '100'
$sharedLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
$transcripts = "$scratch\evidence\transcripts"

$script:passed = 0
$script:failed = @()
function Test-Case([string]$name, [scriptblock]$body) {
  try {
    & $body
    $script:passed++
    Write-Host "ok   $name"
  } catch {
    $script:failed += $name
    Write-Host "FAIL ${name}: $($_.Exception.Message)"
  }
}
function Assert([bool]$condition, [string]$message) {
  if (-not $condition) { throw "assertion failed: $message" }
}
function Get-Records {
  @(Get-Content $script:LockLog -ErrorAction SilentlyContinue |
    ForEach-Object { $_ | ConvertFrom-Json -DateKind String })
}
function Get-TranscriptText([string]$name) { [IO.File]::ReadAllText("$transcripts\$name") }
function Wait-Gone([int[]]$ids) {
  $until = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $until) {
    if (-not ($ids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })) { return $true }
    Start-Sleep -Milliseconds 100
  }
  return $false
}

Test-Case 'success: exit 0, complete transcript, one log record, the isolated lock is released' {
  $r = Invoke-Locked -Task 'ok' -Log 't1.txt' -NodeArgs @($fake, 'ok')
  Assert ($r.Exit -eq 0 -and $r.Complete) 'result'
  Assert ((Get-TranscriptText 't1.txt') -match "line one\r\nline two\r\nexit=0 seconds=") 'transcript'
  $rec = @(Get-Records)
  Assert ($rec.Count -eq 1 -and $rec[0].exit -eq 0 -and $rec[0].transcriptComplete -eq $true -and
    -not $rec[0].error) 'record'
  Assert (-not (Test-Path $sharedLock)) 'lock released'
}

Test-Case 'a nonzero exit throws after it is logged: the caller does not continue, nothing is retried' {
  $continued = $false
  $message = $null
  try {
    Invoke-Locked -Task 'fail' -Log 't2.txt' -NodeArgs @($fake, 'fail', '3')
    $continued = $true
  } catch { $message = $_.Exception.Message }
  Assert (-not $continued) 'the call returned'
  Assert ($message -match 'FAILED') "message $message"
  $rec = @(Get-Records)
  Assert ($rec[-1].exit -eq 3 -and $rec[-1].error) 'record'
  Assert ((Get-TranscriptText 't2.txt') -match "before the failure\r\nan error line\r\nexit=3 seconds=") `
    'transcript'
}

Test-Case '-Expect lists the accepted exit codes, and a success that is not expected also throws' {
  $r = Invoke-Locked -Task 'fail1' -Log 't3.txt' -Expect 0, 1 -NodeArgs @($fake, 'fail', '1')
  Assert ($r.Exit -eq 1) 'exit 1 accepted when listed'
  $threw = $false
  try {
    Invoke-Locked -Task 'ok-not-expected' -Log 't3b.txt' -Expect 1 -NodeArgs @($fake, 'ok')
  } catch { $threw = $true }
  Assert $threw 'exit 0 with -Expect 1'
}

Test-Case 'a command that cannot start: spawn-error, exit 127, incomplete, the call throws' {
  $env:TEE_EXEC = "$scratch\no-such-node.exe"
  $threw = $false
  try {
    Invoke-Locked -Task 'nospawn' -Log 't4.txt' -NodeArgs @($fake, 'ok')
  } catch { $threw = $true } finally {
    Remove-Item Env:\TEE_EXEC
  }
  Assert $threw 'throw'
  $rec = @(Get-Records)
  Assert ($rec[-1].exit -eq 127 -and $rec[-1].transcriptComplete -eq $false) 'record'
  Assert ((Get-TranscriptText 't4.txt') -match "spawn-error=.* seconds=[0-9.]+\r\n$") 'final line'
  Assert ((Get-TranscriptText 't4.txt') -notmatch '(^|\r\n)exit=') 'no exit line'
}

Test-Case 'the 4 s limit (the 540 s path): partial output kept, no completion line, tree gone, lock freed' {
  $pids = "$scratch\t5-pids.txt"
  $env:FAKE_PIDFILE = $pids
  $threw = $false
  $message = $null
  try {
    Invoke-Locked -Task 'limit' -Log 't5.txt' -NodeArgs @($fake, 'grand')
  } catch { $threw = $true; $message = $_.Exception.Message } finally {
    Remove-Item Env:\FAKE_PIDFILE
  }
  Assert $threw 'throw'
  $text = Get-TranscriptText 't5.txt'
  Assert ($text -match "line before the hang, grandchild started\r\n$") "partial output: $text"
  Assert ($text -notmatch '(^|\r\n)(exit=|signal=|spawn-error=)') 'no invented completion line'
  $rec = @(Get-Records)
  Assert ($null -eq $rec[-1].exit -and $rec[-1].transcriptComplete -eq $false -and
    $rec[-1].error -match 'limit reached') 'record'
  $owned = @(Get-Content $pids | ForEach-Object { ($_ -split ' ')[1] } | ForEach-Object { [int]$_ })
  Assert ($owned.Count -eq 2) "two stand-ins recorded: $($owned.Count)"
  Assert (Wait-Gone $owned) 'the child and the grandchild are gone'
  Assert (-not (Test-Path $sharedLock)) 'lock released'
}

Test-Case 'the 15 s gap is measured from the latest release of EITHER lock log, and the gap is logged' {
  $script:GapSeconds = 15
  $script:GapMarginSeconds = 0.3
  $keep = $script:LockLog
  $script:LockLog = "$scratch\evidence\gap-lock-log.jsonl"
  $stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  $newer = (Get-Date).AddSeconds(-5)
  $older = (Get-Date).AddSeconds(-12)
  $seedA = '{"task":"seed A","finished":"' + $newer.ToString($stamp) + "`"}`r`n"
  $seedB = '{"task":"seed B","finished":"' + $older.ToString($stamp) + "`"}`r`n"
  [IO.File]::WriteAllText($script:PhaseALockLog, $seedA)
  [IO.File]::WriteAllText($script:LockLog, $seedB)
  try {
    $r = Invoke-Locked -Task 'gap' -Log 't6.txt' -NodeArgs @($fake, 'ok')
    $rec = @(Get-Records)[-1]
  } finally {
    $script:LockLog = $keep
    $script:GapSeconds = 0
    $script:GapMarginSeconds = 0
  }
  Assert ($r.GapBeforeAsk -ge 15.0) "gap $($r.GapBeforeAsk)"
  $wanted = [DateTimeOffset]::Parse($newer.ToString($stamp))
  Assert ([DateTimeOffset]::Parse($rec.lastReleaseBefore) -eq $wanted) 'the newer log (Phase A) won'
  Assert ($rec.gapBeforeAskSeconds -ge 15.0) 'logged gap'
}

Test-Case 'an existing transcript stops the call before the lock and the run' {
  New-Item -ItemType Directory -Force -Path $transcripts | Out-Null
  [IO.File]::WriteAllText("$transcripts\t7.txt", "earlier evidence`r`n")
  $before = (Get-Records).Count
  $env:FAKE_PIDFILE = "$scratch\t7-pids.txt"
  $threw = $false
  try {
    Invoke-Locked -Task 'exists' -Log 't7.txt' -NodeArgs @($fake, 'ok')
  } catch { $threw = $true } finally { Remove-Item Env:\FAKE_PIDFILE }
  Assert $threw 'throw'
  Assert ((Get-Records).Count -eq $before) 'no record'
  Assert (-not (Test-Path "$scratch\t7-pids.txt")) 'the stand-in never ran'
  Assert ((Get-TranscriptText 't7.txt') -eq "earlier evidence`r`n") 'unchanged'
}

Test-Case 'a stale-looking shared lock is reported and NOT deleted; a live one is reported alive' {
  [IO.File]::WriteAllText($sharedLock, '99999999|someone else|2026-11-19T00:00:00.0000000Z')
  $threw = $false
  $message = $null
  try {
    Invoke-Locked -Task 'stale' -Log 't8.txt' -NodeArgs @($fake, 'ok')
  } catch { $threw = $true; $message = $_.Exception.Message }
  Assert ($threw -and $message -match 'looks stale' -and $message -match 'NOT deleted') "message $message"
  Assert ([IO.File]::ReadAllText($sharedLock) -eq '99999999|someone else|2026-11-19T00:00:00.0000000Z') `
    'the lock is untouched'
  Assert (-not (Test-Path "$transcripts\t8.txt")) 'nothing started'
  Remove-Item $sharedLock
  [IO.File]::WriteAllText($sharedLock, "$PID|me|2026-11-19T00:00:00.0000000Z")
  $state = Get-SlotState
  Remove-Item $sharedLock
  Assert ($state.SharedLock -and $state.SharedLockAlive -eq $true -and $state.SharedLockPid -eq $PID) `
    'live lock'
}

Test-Case 'without a tee (-NoTee) the exit code is still checked and logged' {
  $r = Invoke-Locked -Task 'notee' -NoTee -NodeArgs @($fake, 'ok')
  Assert ($r.Exit -eq 0 -and $null -eq $r.Complete) 'result'
  $threw = $false
  try { Invoke-Locked -Task 'notee-fail' -NoTee -NodeArgs @($fake, 'fail', '4') } catch { $threw = $true }
  Assert $threw 'throw'
}

Write-Host "$script:passed passed, $($script:failed.Count) failed"
if ($script:failed.Count -gt 0) { Write-Host ('FAILED: ' + ($script:failed -join ' | ')); exit 1 }
exit 0
