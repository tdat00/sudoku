# MS18d Phase C0 task-owned tests of slot-watch.ps1 (SA1 C0-1, the lock watch): both lock files are looked
# at at least once a second for the window before the call, a lock seen restarts the window, an observation
# gap restarts it, the wait is bounded and ends in a give-up, the earliest instant of the call is honoured,
# and the first and last check are recorded. Short windows on an isolated TEMP and stand-in lock files only.
# Run through the node launcher (isolated TEMP, shared lock):
#   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/run-ps-test.js <this file>
$ErrorActionPreference = 'Stop'
$scratch = $env:MS18D_SCRATCH
if (-not $scratch -or $env:TEMP -ne $scratch) { throw 'run this through run-ps-test.js (isolated TEMP)' }
Set-Location 'Q:\git\sudoku\generator'
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS18d\phase-c\slot-watch.ps1'
$shared = Join-Path $scratch 'dv3-sudoku.lock'
$timing = Join-Path $scratch 'dv3-timing.lock'
$script:started = [System.Collections.Generic.List[object]]::new()
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
function NowMs { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }

# A stand-in "other agent": creates the named lock file after $AfterMs and removes it after $HoldMs more;
# the instants are written to a file so that the test can compare them with the watch record.
function Start-OtherAgent([string]$LockFile, [int]$AfterMs, [int]$HoldMs, [string]$Times) {
  $js = "const fs=require('fs');const t={};" +
    "setTimeout(()=>{fs.writeFileSync(process.argv[1],'foreign');t.created=Date.now();" +
    "fs.writeFileSync(process.argv[2],JSON.stringify(t))},$AfterMs);" +
    "setTimeout(()=>{fs.unlinkSync(process.argv[1]);t.removed=Date.now();" +
    "fs.writeFileSync(process.argv[2],JSON.stringify(t))}," + ($AfterMs + $HoldMs) + ')'
  $si = [Diagnostics.ProcessStartInfo]::new('node')
  $si.UseShellExecute = $false
  $si.CreateNoWindow = $true
  foreach ($a in @('-e', $js, $LockFile, $Times)) { $si.ArgumentList.Add($a) }
  $p = [Diagnostics.Process]::Start($si)
  $script:started.Add($p)
  return $p
}

Test-Case 'a free slot: a lock-free window of the asked length, checked at least once a second, recorded' {
  $before = NowMs
  $w = Wait-SlotQuiet -WindowSeconds 1.2 -GiveUpSeconds 20 -IntervalMs 200 -TempDir $scratch
  $after = NowMs
  Assert (-not $w.gaveUp) 'not given up'
  Assert ($w.schema -eq 'ms18d-c-watch-1') 'schema'
  Assert (($w.lastCheckMs - $w.firstCheckMs) -ge 1200) "window $($w.lastCheckMs - $w.firstCheckMs) ms"
  Assert ($w.firstCheckMs -ge $before -and $w.lastCheckMs -le $after) 'inside the call'
  Assert ($w.maxIntervalMs -le 1000 -and $w.maxIntervalMs -ge 150) "max interval $($w.maxIntervalMs)"
  Assert ($w.windowChecks -ge 6 -and $w.checks -eq $w.windowChecks) "checks $($w.checks) / $($w.windowChecks)"
  Assert ($w.restartCount -eq 0 -and $w.windowSightings -eq 0) 'no restart'
  Assert ($w.requiredWindowMs -eq 1200 -and $w.giveUpSeconds -eq 20) 'the asked values are recorded'
}

Test-Case 'a foreign lock appearing inside the window restarts it: the proof starts after the lock is gone' {
  $times = Join-Path $scratch 'agent1.json'
  $agent = Start-OtherAgent $shared 600 900 $times
  $w = Wait-SlotQuiet -WindowSeconds 1.5 -GiveUpSeconds 30 -IntervalMs 200 -TempDir $scratch
  $null = $agent.WaitForExit(5000)
  $t = Get-Content $times -Raw | ConvertFrom-Json
  Assert (-not $w.gaveUp) 'finished'
  Assert ($w.restartCount -ge 1) "restarts $($w.restartCount)"
  $named = @($w.restarts | Where-Object { $_.reason -eq 'lock-present' -and $_.shared })
  Assert ($named.Count -ge 1) 'the lock was seen and named'
  Assert ($w.firstCheckMs -ge ($t.removed - 50)) "window starts $($w.firstCheckMs - $t.removed) ms later"
  Assert (($w.lastCheckMs - $w.firstCheckMs) -ge 1500) 'a full window after the lock'
  Assert (-not (Test-Path $shared)) 'the stand-in removed its lock'
}

Test-Case 'the timing lock restarts the window as well' {
  $times = Join-Path $scratch 'agent2.json'
  $agent = Start-OtherAgent $timing 500 800 $times
  $w = Wait-SlotQuiet -WindowSeconds 1.2 -GiveUpSeconds 30 -IntervalMs 200 -TempDir $scratch
  $null = $agent.WaitForExit(5000)
  $t = Get-Content $times -Raw | ConvertFrom-Json
  Assert (-not $w.gaveUp -and $w.restartCount -ge 1) "restarts $($w.restartCount)"
  $named = @($w.restarts | Where-Object { $_.reason -eq 'lock-present' -and $_.timing })
  Assert ($named.Count -ge 1) 'the timing lock was named'
  Assert ($w.firstCheckMs -ge ($t.removed - 50)) 'the window starts after the removal'
}

Test-Case 'the wait is bounded: a lock that never goes ends in a give-up, never in a start' {
  [IO.File]::WriteAllText($shared, 'someone')
  try {
    $started = NowMs
    $w = Wait-SlotQuiet -WindowSeconds 1 -GiveUpSeconds 1.5 -IntervalMs 200 -TempDir $scratch
    $elapsed = (NowMs) - $started
  } finally {
    Remove-Item $shared
  }
  Assert ($w.gaveUp) 'gave up'
  Assert ($null -eq $w.firstCheckMs) 'no lock-free window was ever seen'
  Assert ($elapsed -ge 1500 -and $elapsed -lt 4000) "elapsed $elapsed ms"
  Assert ($w.restartCount -ge 5) "restarts $($w.restartCount)"
}

Test-Case 'an observation gap restarts the window: checks further apart than the maximum prove nothing' {
  $w = Wait-SlotQuiet -WindowSeconds 1 -GiveUpSeconds 1.6 -IntervalMs 200 -MaxIntervalMs 50 `
    -TempDir $scratch
  Assert ($w.gaveUp) 'never a window'
  Assert (@($w.restarts | Where-Object { $_.reason -eq 'observation-gap' }).Count -ge 3) 'gaps named'
  Assert (@($w.restarts | Where-Object { $_.reason -eq 'observation-gap' })[0].gapMs -gt 50) 'with their size'
  Assert ($w.windowChecks -le 1) 'the window never grew'
}

Test-Case 'the earliest instant of the call is honoured even when the slot was quiet all along' {
  $notBefore = (NowMs) + 1800
  $w = Wait-SlotQuiet -WindowSeconds 0.3 -GiveUpSeconds 20 -IntervalMs 200 -NotBeforeMs $notBefore `
    -TempDir $scratch
  Assert (-not $w.gaveUp) 'finished'
  Assert ($w.lastCheckMs -ge $notBefore) "last check $($notBefore - $w.lastCheckMs) ms before the instant"
  Assert ($w.notBeforeMs -eq $notBefore) 'recorded'
}

Test-Case 'the defaults are the 15.3 s window, a 1 s maximum interval and a 20 minute bound' {
  $cmd = Get-Command Wait-SlotQuiet
  Assert ($cmd.Parameters['WindowSeconds'].Attributes.Count -ge 0) 'parameter exists'
  $text = Get-Content "$PSScriptRoot\slot-watch.ps1" -Raw
  Assert ($text -match '\[double\]\$WindowSeconds = 15\.3') '15.3 s'
  Assert ($text -match '\[double\]\$GiveUpSeconds = 1200') '20 minutes'
  Assert ($text -match '\[int\]\$MaxIntervalMs = 1000') '1 s'
}

foreach ($p in $script:started) {
  try { if (-not $p.HasExited) { $p.Kill() } } catch { }
}
Write-Host "$script:passed passed, $($script:failed.Count) failed"
if ($script:failed.Count -gt 0) { Write-Host ('FAILED: ' + ($script:failed -join ' | ')); exit 1 }
exit 0
