# MS18d Phase C0 task-owned tests of run-locked-c.ps1 (the Phase C lock wrapper: G1 lock watch and request,
# G2 records and ledger, G4 helper manifest, G5 wrapper barrier, exit-code reconciliation), run through
# run-ps-test.js as ONE command under the real shared lock. Everything here is a STAND-IN: an isolated TEMP
# (the real dv3-*.lock files are never touched), isolated logs and run directories (never docs/.../gp/), a
# scratch repository whose tests\perf.js is fake-gp.js, fake-controller.js for the bookkeeping cases, and,
# for the kill case only, a copy of the verbatim shared helper in which the single literal 540000 is
# replaced IN MEMORY (the file is untouched). The 15.3 s lock watch runs for real in two cases and in the
# give-up case; the other cases stub it with a record that satisfies the controller and capture what the
# wrapper asked of it.
$ErrorActionPreference = 'Stop'
$scratch = $env:MS18D_SCRATCH
$evidence = $env:GPC_TEST_EVIDENCE
$manifestFile = $env:GPC_MANIFEST
if (-not $scratch -or $env:TEMP -ne $scratch -or -not $evidence -or -not $manifestFile) {
  throw 'run this through run-ps-test.js (isolated TEMP)'
}
Set-Location 'Q:\git\sudoku\generator'
$tools = 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS18d\phase-c'
. "$tools\run-locked-c.ps1"
$realLogA = $script:LogA
$realLogB = $script:LogB
$realHashA = (Get-FileHash -LiteralPath $realLogA).Hash
$realHashB = (Get-FileHash -LiteralPath $realLogB).Hash
$helperText = [IO.File]::ReadAllText($script:HelperPath)
if ([regex]::Matches($helperText, '540000').Count -ne 1) { throw 'the helper no longer has one 540000' }
$sharedLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
$timingLock = Join-Path $env:TEMP 'dv3-timing.lock'
$stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
$env:FAKE_GP_TARGET_MS = '31'
$gpArgs = @('tests\perf.js', '--variant=classic4', '--level=veryEasy', '--runs=50', '--warmup=0',
  '--seed=7000', '--gate', '--ascii')
$head = 'a' * 40

# the scratch repository, the binding fixture and the isolated wrapper settings
$repo = "$scratch\repo"
New-Item -ItemType Directory -Force -Path "$repo\generator\tests" | Out-Null
[IO.File]::WriteAllText("$repo\generator\tests\perf.js",
  "require('" + ($tools -replace '\\', '/') + "/fake-gp.js');`r`n")
$fixtureFile = "$scratch\fixture.json"
$fixture = [ordered]@{
  head = $head; statusPorcelainZ = ''
  identities = [ordered]@{ hashIdentity = 'H'; replayIdentity = 'R'; sources = 'S' }
  table = [ordered]@{ sha256 = 'TABLE'; positions = @([ordered]@{ key = 'classic4/veryEasy'; target = 31 })
    targets = [ordered]@{ 'classic4/veryEasy' = 31 } }
  machine = $script:Expected.machine; node = 'v26.13.0'
  committed = [ordered]@{}; workingFiles = [ordered]@{}
}
[IO.File]::WriteAllText($fixtureFile, ($fixture | ConvertTo-Json -Depth 8))
$script:RunRepo = $repo
$script:Expected = [ordered]@{
  head = $null
  identities = [ordered]@{ hashIdentity = 'H'; replayIdentity = 'R'; sources = 'S' }
  tableSha256 = 'TABLE'; node = 'v26.13.0'; machine = $script:Expected.machine
}
$script:HelperManifest = [pscustomobject]@{ File = $manifestFile; Sha256 = $null
  Required = @('generator/tests/artifacts/difficulty-v3/MS18d/phase-c/controller.js') }

# the lock watch: real, or a stub that records what the wrapper asked for and returns a conforming record
$script:UseRealWatch = $false
$script:WatchCalls = [System.Collections.Generic.List[object]]::new()
$realWatch = ${function:Wait-SlotQuiet}
function Wait-SlotQuiet {
  param([double]$WindowSeconds = 15.3, [double]$GiveUpSeconds = 1200, [int]$IntervalMs = 250,
    [int]$MaxIntervalMs = 1000, [long]$NotBeforeMs = 0, [string]$TempDir = $env:TEMP)
  if ($script:UseRealWatch) { return & $realWatch @PSBoundParameters }
  $script:WatchCalls.Add([pscustomobject]@{ WindowSeconds = $WindowSeconds; GiveUpSeconds = $GiveUpSeconds
      NotBeforeMs = $NotBeforeMs })
  $t = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  return [pscustomobject][ordered]@{
    schema = 'ms18d-c-watch-1'; startedAtMs = $t - 15400; firstCheckMs = $t - 15400; lastCheckMs = $t - 10
    requiredWindowMs = 15300; maxIntervalAllowedMs = 1000; intervalMs = 250; checks = 62; windowChecks = 62
    maxIntervalMs = 260; windowSightings = 0; restartCount = 0; restarts = @(); giveUpSeconds = $GiveUpSeconds
    gaveUp = $false; notBeforeMs = $NotBeforeMs; stub = $true
  }
}

$script:passed = 0
$script:failed = @()
$script:started = [System.Collections.Generic.List[object]]::new()
$script:worlds = 0
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
function Assert-Throws([scriptblock]$body, [string]$pattern, [string]$what) {
  $message = $null
  try { & $body } catch { $message = $_.Exception.Message }
  Assert ($null -ne $message) "$what did not throw"
  Assert ($message -match $pattern) "$what threw '$message', not /$pattern/"
}
function NowMs { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
function Read-Json([string]$file) { Get-Content -LiteralPath $file -Raw | ConvertFrom-Json -DateKind String }
function Get-Ledger { @(Read-JsonLines -File $script:LogC) }
function Get-Stamp([datetime]$when) { $when.ToString($stamp) }
function Write-Finished([string]$file, [datetime]$when) {
  [IO.File]::WriteAllText($file, '{"finished":"' + (Get-Stamp $when) + "`"}`r`n")
}
function Wait-Gone([int[]]$ids) {
  $until = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $until) {
    if (-not ($ids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })) { return $true }
    Start-Sleep -Milliseconds 100
  }
  return $false
}

# a fresh world: its own logs (old releases in A and B, no C), run directory root and settings
function New-World {
  $script:worlds++
  $n = $script:worlds
  $logs = "$scratch\logs$n"
  New-Item -ItemType Directory -Force -Path $logs | Out-Null
  Write-Finished "$logs\a.jsonl" (Get-Date).AddHours(-1)
  Write-Finished "$logs\b.jsonl" (Get-Date).AddMinutes(-30)
  $script:LogA = "$logs\a.jsonl"
  $script:LogB = "$logs\b.jsonl"
  $script:LogC = "$logs\c.jsonl"
  $script:CoordinatorEvidence = @()
  $script:RunsRoot = "$evidence\runs$n"
  $script:ControllerPath = "$tools\controller.js"
  $script:WatchCalls.Clear()
  return $logs
}
function Start-Gp([string]$RunId, [hashtable]$Extra = @{}, [string]$Cell = 'classic4/veryEasy') {
  Invoke-GpLocked -Task "stand-in $RunId" -RunId $RunId -Cell $Cell -Standin -CommandArgs $gpArgs `
    -BindingFixture $fixtureFile -ExtraRequest $Extra
}
# a stand-in "other agent" process: removes a lock file after a delay, or creates it and removes it later
function Start-Agent([string]$File, [int]$CreateAfterMs, [int]$RemoveAfterMs) {
  $js = "const fs=require('fs');const f=process.argv[1];" +
    "if($CreateAfterMs>=0)setTimeout(()=>fs.writeFileSync(f,'foreign'),$CreateAfterMs);" +
    "setTimeout(()=>{try{fs.unlinkSync(f)}catch(e){}},$RemoveAfterMs)"
  $si = [Diagnostics.ProcessStartInfo]::new('node')
  $si.UseShellExecute = $false
  $si.CreateNoWindow = $true
  foreach ($a in @('-e', $js, $File)) { $si.ArgumentList.Add($a) }
  $p = [Diagnostics.Process]::Start($si)
  $script:started.Add($p)
  return $p
}

Test-Case 'success through the REAL watch, controller and tee: all records, one ledger line' {
  New-World | Out-Null
  $script:UseRealWatch = $true
  try { $r = Start-Gp 'r1' } finally { $script:UseRealWatch = $false }
  Assert ($r.Outcome -eq 'gp-success' -and $r.Exit -eq 0) "outcome $($r.Outcome) exit $($r.Exit)"
  foreach ($n in 'request.json', 'watch.json', 'acquisition.json', 'binding.json', 'admission.json',
    'pids.jsonl', 'transcript.txt', 'stdout.txt', 'stderr.txt', 'cleanup.json', 'result.json',
    'cleanup-wrapper.json', 'wrapper.json') { Assert (Test-Path "$($r.RunDir)\$n") "missing $n" }
  $watch = Read-Json "$($r.RunDir)\watch.json"
  Assert (-not $watch.gaveUp -and ($watch.lastCheckMs - $watch.firstCheckMs) -ge 15300 -and
    $watch.maxIntervalMs -le 1000 -and $watch.windowSightings -eq 0) 'the real watch record'
  $acq = Read-Json "$($r.RunDir)\acquisition.json"
  Assert ($acq.decision -eq 'proceed' -and $acq.startDelayMs -le 2000 -and -not $acq.busyAtRequest) 'acq'
  $ledger = @(Get-Ledger)
  Assert ($ledger.Count -eq 1) "ledger lines $($ledger.Count)"
  $rec = $ledger[0]
  Assert ($rec.outcome -eq 'gp-success' -and $rec.exit -eq 0 -and $rec.standin -eq $true -and
    $rec.barrierVerdict -eq 'clean' -and $rec.controllerOutcome -eq 'success') 'the ledger line'
  Assert ($rec.releaseVerified -eq $true -and $rec.releaseExact -eq $false -and $rec.releaseObservedAt) `
    'a conservative release observation, not an exact instant'
  Assert ($rec.startedAtFromChild -and $rec.watch.restartCount -eq 0 -and $rec.watch.checks -ge 50) 'child'
  Assert (-not (Test-Path $sharedLock)) 'the isolated lock is released'
}

Test-Case 'a foreign lock inside the REAL watch restarts the window and the run still proceeds' {
  New-World | Out-Null
  $agent = Start-Agent -File $timingLock -CreateAfterMs 500 -RemoveAfterMs 1300
  $script:UseRealWatch = $true
  try { $r = Start-Gp 'r2' } finally { $script:UseRealWatch = $false }
  Assert ($r.Outcome -eq 'gp-success') "outcome $($r.Outcome)"
  $watch = Read-Json "$($r.RunDir)\watch.json"
  $seen = $watch.restarts | Where-Object { $_.reason -eq 'lock-present' }
  Assert ($watch.restartCount -ge 1 -and $seen) 'the restart is recorded'
  Assert (($watch.lastCheckMs - $watch.firstCheckMs) -ge 15300) 'a full quiet window after the lock'
  Assert ($watch.windowSightings -eq 0 -and $watch.firstCheckMs -gt ($watch.startedAtMs + 1200)) 'window'
  $rec = @(Get-Ledger)[0]
  Assert ($rec.watch.restartCount -ge 1) 'the ledger records the restart'
  Assert (-not (Test-Path $timingLock)) 'the stand-in agent removed its lock'
}

Test-Case 'a complete MISS comes back as a result, not a throw: the only place exit 1 is allowed' {
  New-World | Out-Null
  $env:FAKE_GP_MODE = 'miss'
  try { $r = Start-Gp 'r3' } finally { Remove-Item Env:\FAKE_GP_MODE }
  Assert ($r.Outcome -eq 'gp-miss' -and $r.Exit -eq 1) "outcome $($r.Outcome) exit $($r.Exit)"
  $rec = @(Get-Ledger)[0]
  Assert ($rec.outcome -eq 'gp-miss' -and $rec.controllerOutcome -eq 'miss' -and
    $rec.barrierVerdict -eq 'clean') 'ledger'
  Assert (@($rec.problems).Count -eq 0) 'no problem recorded'
}

Test-Case 'a crash is a STOP: the call throws after the record is written, and every byte is kept' {
  New-World | Out-Null
  $env:FAKE_GP_MODE = 'crash'
  $runDir = "$script:RunsRoot\classic4-veryEasy\r4"
  try { Assert-Throws { Start-Gp 'r4' } 'STOP' 'a crash' } finally { Remove-Item Env:\FAKE_GP_MODE }
  $rec = @(Get-Ledger)[0]
  Assert ($rec.outcome -eq 'stop' -and $rec.exit -eq 65) "ledger outcome $($rec.outcome) exit $($rec.exit)"
  Assert (@($rec.problems).Count -ge 1 -or $rec.helperNote -match 'command failed: 65') 'recorded'
  Assert ((Test-Path "$runDir\wrapper.json") -and (Test-Path "$runDir\transcript.txt") -and
    (Test-Path "$runDir\stderr.txt")) 'the records and streams are kept'
  Assert ((Get-Content "$runDir\stderr.txt" -Raw) -match 'stand-in generation error') 'stderr kept'
  Assert (-not (Test-Path $sharedLock)) 'the isolated lock is released'
}

Test-Case 'a control-hold is returned, not thrown, and nothing was started (own release 5 s ago)' {
  New-World | Out-Null
  Write-Finished $script:LogC (Get-Date).AddSeconds(-5)
  $r = Start-Gp 'r5'
  Assert ($r.Outcome -eq 'control-hold' -and $r.Exit -eq 64) "outcome $($r.Outcome) exit $($r.Exit)"
  $acq = Read-Json "$($r.RunDir)\acquisition.json"
  Assert ($acq.decision -eq 'hold' -and ($acq.reasons -contains 'release-gap-under-15s')) 'the 15 s rule'
  Assert (-not (Test-Path "$($r.RunDir)\transcript.txt")) 'no payload ran'
  $rec = @(Get-Ledger)[-1]
  Assert ($rec.outcome -eq 'control-hold' -and $rec.controllerOutcome -eq 'control-hold') 'the ledger line'
}

Test-Case 'A/B/C continuity: the next run reads the C ledger and the watch is asked to wait until 15.3 s' {
  New-World | Out-Null
  $first = Start-Gp 'r6a'
  Assert ($first.Outcome -eq 'gp-success') 'first run'
  $rec = @(Get-Ledger)[0]
  $last = [DateTimeOffset]::Parse($rec.releaseObservedAt).ToUnixTimeMilliseconds()
  $wanted = $last + [long](($script:GapSeconds + $script:GapMarginSeconds) * 1000)
  $second = Start-Gp 'r6b'
  Assert ($script:WatchCalls.Count -eq 2) "watch calls $($script:WatchCalls.Count)"
  $asked = $script:WatchCalls[1]
  Assert ($asked.NotBeforeMs -eq $wanted) "not before $($asked.NotBeforeMs) vs $wanted"
  Assert ([math]::Abs($asked.WindowSeconds - 15.3) -lt 0.0001) 'the 15.3 s window is asked for'
  Assert ($second.Outcome -eq 'control-hold') 'the controller read the same ledger and held'
  Assert (@(Get-Ledger).Count -eq 2) 'both runs are in the ledger'
}

Test-Case 'coordinator evidence is a release too: the wait honours it and the controller holds on it' {
  $logs = New-World
  [IO.File]::WriteAllText("$logs\coordinator.jsonl", '{"at":"' + (Get-Stamp (Get-Date).AddSeconds(-4)) +
    "`",`"source`":`"orchestrator message: another job released the slot`"}`r`n")
  $script:CoordinatorEvidence = @("$logs\coordinator.jsonl")
  $line = (Read-JsonLines -File "$logs\coordinator.jsonl")[0]
  $at = [DateTimeOffset]::Parse($line.at).ToUnixTimeMilliseconds()
  $r = Start-Gp 'r7'
  $asked = $script:WatchCalls[0]
  Assert ($asked.NotBeforeMs -eq ($at + 15300)) "not before $($asked.NotBeforeMs)"
  Assert ($r.Outcome -eq 'control-hold') "outcome $($r.Outcome)"
  $acq = Read-Json "$($r.RunDir)\acquisition.json"
  Assert ($acq.reasons -contains 'release-gap-under-15s' -and
    $acq.latestRelease.label -eq 'coordinator1') 'label'
}

Test-Case 'a slot found busy at the request, and a start over 2 s late, is held (the 5 s helper poll)' {
  New-World | Out-Null
  [IO.File]::WriteAllText($sharedLock, 'foreign')
  $agent = Start-Agent -File $sharedLock -CreateAfterMs -1 -RemoveAfterMs 2500
  $r = Start-Gp 'r8'
  Assert ($r.Outcome -eq 'control-hold' -and $r.Exit -eq 64) "outcome $($r.Outcome)"
  $acq = Read-Json "$($r.RunDir)\acquisition.json"
  Assert ($acq.busyAtRequest -and $acq.late -and $acq.startDelayMs -gt 2000) "delay $($acq.startDelayMs)"
  Assert ($acq.reasons -contains 'slot-busy-and-foreign-release-unproved') ($acq.reasons -join ',')
  Assert (-not (Test-Path "$($r.RunDir)\transcript.txt")) 'no payload ran'
}

Test-Case 'a watch that gives up is a control-hold: no request, no helper, nothing started' {
  New-World | Out-Null
  [IO.File]::WriteAllText($timingLock, 'foreign')
  $script:UseRealWatch = $true
  $script:WatchGiveUpSeconds = 2
  try { $r = Start-Gp 'r9' } finally {
    $script:UseRealWatch = $false
    $script:WatchGiveUpSeconds = 1200
    Remove-Item -LiteralPath $timingLock -ErrorAction SilentlyContinue
  }
  Assert ($r.Outcome -eq 'control-hold' -and $null -eq $r.Exit) "outcome $($r.Outcome)"
  Assert ((Test-Path "$($r.RunDir)\watch.json") -and
    -not (Test-Path "$($r.RunDir)\request.json")) 'no request'
  $rec = @(Get-Ledger)[0]
  Assert ($rec.outcome -eq 'control-hold' -and $rec.heldAt -eq 'foreign-lock-watch' -and
    $rec.watch.gaveUp) 'ledger'
  Assert (-not (Test-Path $sharedLock)) 'the shared lock was never taken'
}

Test-Case 'a wrong helper manifest stops before the lock: tampered, unlisted, not the reviewed one' {
  $logs = New-World
  $lines = [IO.File]::ReadAllLines($manifestFile)
  $i = [array]::FindIndex($lines, [Predicate[string]]{ param($l) $l -match 'phase-c\\controller\.js$' })
  Assert ($i -ge 0) 'the controller is listed'
  $bad = $lines.Clone()
  $first = $bad[$i].Substring(0, 1)
  $bad[$i] = $(if ($first -eq '0') { '1' } else { '0' }) + $bad[$i].Substring(1)
  [IO.File]::WriteAllLines("$logs\tampered.txt", $bad)
  $rest = @($lines | Where-Object { $_ -notmatch 'phase-c\\controller\.js$' })
  [IO.File]::WriteAllLines("$logs\unlisted.txt", $rest)
  $keep = $script:HelperManifest
  $req = $keep.Required
  try {
    $script:HelperManifest = [pscustomobject]@{ File = "$logs\tampered.txt"; Sha256 = $null; Required = $req }
    Assert-Throws { Start-Gp 'r10a' } 'hold before the lock.*differ from the manifest' 'a tampered helper'
    $script:HelperManifest = [pscustomobject]@{ File = "$logs\unlisted.txt"; Sha256 = $null; Required = $req }
    Assert-Throws { Start-Gp 'r10b' } 'not in the manifest' 'an unlisted helper'
    $script:HelperManifest = [pscustomobject]@{ File = $manifestFile; Sha256 = ('0' * 64); Required = $req }
    Assert-Throws { Start-Gp 'r10c' } 'not the reviewed one' 'another manifest'
    $script:HelperManifest = [pscustomobject]@{ File = "$logs\none.txt"; Sha256 = $null; Required = $req }
    Assert-Throws { Start-Gp 'r10d' } 'does not exist' 'no manifest'
  } finally { $script:HelperManifest = $keep }
  Assert (-not (Test-Path "$script:RunsRoot\classic4-veryEasy")) 'no run directory was made'
  Assert (@(Get-Ledger).Count -eq 0 -and -not (Test-Path $sharedLock)) 'nothing recorded, no lock'
}

Test-Case 'refusals before anything starts: base, command line, cell, type, name, existing run directory' {
  New-World | Out-Null
  $cell = 'classic4/veryEasy'
  Assert-Throws { Invoke-GpLocked -Task t -RunId x1 -Cell $cell } 'stand-ins only' 'a real stock GP cell'
  Assert-Throws { Invoke-GpLocked -Task t -RunId x2 -Cell $cell -CampaignBase $head `
      -CommandArgs @('other.js') } 'stand-ins only' 'a real run with its own command line'
  Assert-Throws { Invoke-GpLocked -Task t -RunId x3 -Cell 'classic4/nope' -Standin -CommandArgs $gpArgs } `
    'not an offered cell' 'an unknown cell'
  Assert-Throws { Invoke-GpLocked -Task t -RunId x4 -Cell 'classic4' -Standin -CommandArgs $gpArgs } `
    'not variant/level' 'a cell without a level'
  Assert-Throws { Invoke-PayloadLocked -Task t -RunId x5 -Profile generic -CommandArgs @('x') } `
    'stand-ins only' 'a generic payload outside a stand-in'
  Assert-Throws { Invoke-PayloadLocked -Task t -RunId x6 -Profile standin-ledger -Standin `
      -CommandArgs @('x') } 'unknown payload type' 'an unregistered payload type'
  Assert-Throws { Invoke-GpLocked -Task t -RunId '..\x7' -Cell $cell -Standin -CommandArgs $gpArgs } `
    'not a plain name' 'an unsafe run id'
  Assert-Throws { Invoke-GpLocked -Task t -RunId x8 -Cell $cell -Standin } 'names its command' 'no command'
  Assert-Throws { Invoke-GpLocked -Task t -RunId x9 -Cell $cell -CommandArgs $gpArgs `
      -ExtraRequest @{ a = 1 } -CampaignBase $head } 'stand-ins only' 'extra fields outside a stand-in'
  $existing = "$script:RunsRoot\classic4-veryEasy\x10"
  New-Item -ItemType Directory -Force -Path $existing | Out-Null
  [IO.File]::WriteAllText("$existing\marker.txt", "earlier evidence`r`n")
  Assert-Throws { Start-Gp 'x10' } 'never overwritten' 'an existing run directory'
  Assert ([IO.File]::ReadAllText("$existing\marker.txt") -eq "earlier evidence`r`n") 'earlier run untouched'
  Assert (@(Get-Ledger).Count -eq 0 -and -not (Test-Path $sharedLock)) 'nothing recorded, no lock'
}

Test-Case 'exit code and result.json are reconciled (a stand-in controller): every disagreement is a STOP' {
  New-World | Out-Null
  $script:ControllerPath = "$tools\fake-controller.js"
  $mode = {
    param([string]$m, [string]$id, [string]$profile)
    $env:FAKE_CONTROLLER_MODE = $m
    try {
      if ($profile -eq 'gp-cell') { Start-Gp $id } else {
        Invoke-PayloadLocked -Task "stand-in $id" -RunId $id -Profile generic -Standin -CommandArgs @('x') `
          -BindingFixture $fixtureFile
      }
    } finally { Remove-Item Env:\FAKE_CONTROLLER_MODE }
  }
  $ok = & $mode 'ok' 'c1' 'gp-cell'
  Assert ($ok.Outcome -eq 'gp-success' -and $ok.Exit -eq 0) 'ok'
  $generic = & $mode 'ok' 'c2' 'generic'
  Assert ($generic.Outcome -eq 'success' -and $generic.Exit -eq 0) 'a generic success'
  $held = & $mode 'hold' 'c3' 'gp-cell'
  Assert ($held.Outcome -eq 'control-hold' -and $held.Exit -eq 64) 'a hold is returned'
  $miss = & $mode 'miss' 'c4' 'gp-cell'
  Assert ($miss.Outcome -eq 'gp-miss' -and $miss.Exit -eq 1) 'a GP miss is returned'
  Assert-Throws { & $mode 'miss' 'c5' 'generic' } "outcome 'miss' with exit 1 is a stop" 'a generic miss'
  Assert-Throws { & $mode 'hold-started' 'c6' 'gp-cell' } "'control-hold' with exit 64 is a stop" 'a hold'
  Assert-Throws { & $mode 'result0-exit3' 'c7' 'gp-cell' } 'differs from the controller' 'a disagreement'
  Assert-Throws { & $mode 'no-result' 'c8' 'gp-cell' } 'no result.json' 'no result'
  $records = @(Get-Ledger)
  Assert ($records.Count -eq 8) "ledger lines $($records.Count)"
  Assert (($records | Where-Object { $_.outcome -eq 'stop' }).Count -eq 4) 'four stops are recorded'
}

Test-Case 'a process of the run that outlives the controller is stopped by the wrapper barrier: a STOP' {
  New-World | Out-Null
  $script:ControllerPath = "$tools\fake-controller.js"
  $env:FAKE_CONTROLLER_MODE = 'orphan'
  $runDir = "$script:RunsRoot\classic4-veryEasy\o1"
  try { Assert-Throws { Start-Gp 'o1' } 'wrapper barrier verdict is stopped-owned' 'an orphan' } finally {
    Remove-Item Env:\FAKE_CONTROLLER_MODE
  }
  $cleanup = Read-Json "$runDir\cleanup-wrapper.json"
  Assert ($cleanup.verdict -eq 'stopped-owned' -and @($cleanup.stops).Count -ge 1 -and
    $cleanup.confirmedGone) 'cleanup'
  $orphan = @(Get-Content "$runDir\pids.jsonl" | ForEach-Object { $_ | ConvertFrom-Json } |
    Where-Object { $_.role -eq 'command' })[0]
  Assert (-not (Get-Process -Id $orphan.pid -ErrorAction SilentlyContinue)) 'the orphan is gone'
  $rec = @(Get-Ledger)[0]
  Assert ($rec.outcome -eq 'stop' -and $rec.barrierVerdict -eq 'stopped-owned') 'the ledger line'
}

Test-Case 'the 540 s path (a 6 s copy of the helper): partial bytes kept, nothing invented, tree gone' {
  New-World | Out-Null
  . ([scriptblock]::Create($helperText.Replace('540000', '6000')))
  $pidFile = "$scratch\kill-pids.txt"
  $env:FAKE_PIDFILE = $pidFile
  $env:FAKE_GP_MODE = 'hang-grand'
  $runDir = "$script:RunsRoot\classic4-veryEasy\k1"
  try { Assert-Throws { Start-Gp 'k1' @{ teeDetached = $true } } 'STOP' 'the limit' } finally {
    Remove-Item Env:\FAKE_PIDFILE
    Remove-Item Env:\FAKE_GP_MODE
  }
  $text = [IO.File]::ReadAllText("$runDir\transcript.txt")
  Assert ($text -match 'Sudoku Generator performance') "the partial output is kept: $text"
  Assert ($text -notmatch '(^|\r\n)(exit=|signal=|spawn-error=)') 'no invented completion line'
  Assert (-not (Test-Path "$runDir\result.json")) 'the killed controller wrote no result'
  $rec = @(Get-Ledger)[0]
  Assert ($rec.outcome -eq 'stop' -and $null -eq $rec.exit -and $null -eq $rec.controllerOutcome) 'record'
  Assert (($rec.problems -join ' ') -match '540-second limit') 'the limit is recorded'
  Assert (($rec.problems -join ' ') -match 'no result.json') 'the missing result is recorded'
  Assert ($rec.barrierVerdict -in @('clean', 'stopped-owned')) "barrier $($rec.barrierVerdict)"
  $owned = @(Get-Content $pidFile | ForEach-Object { [int]($_ -split ' ')[1] })
  $owned += @(Get-Content "$runDir\pids.jsonl" | ForEach-Object { $_ | ConvertFrom-Json } |
    Where-Object { $_.pid } | ForEach-Object { [int]$_.pid })
  Assert ($owned.Count -ge 3) "recorded $($owned.Count) processes"
  Assert (Wait-Gone ($owned | Select-Object -Unique)) 'every recorded process is gone'
  Assert (-not (Test-Path $sharedLock)) 'the isolated lock is released'
}

Test-Case 'C0-6: a ledger-writing payload runs on the same transport with its own G3 classifier' {
  New-World | Out-Null
  $script:PayloadExit1['standin-ledger'] = $false
  $dir = "$script:RunsRoot\generic\l1"
  $out = "$dir\ledger.json"
  $extra = @{ classifierModule = "$tools\standin-payload-classifier.js"; expectedRecords = 3 }
  $writer = "$tools\fake-writer.js"
  try {
    $r = Invoke-PayloadLocked -Task 'stand-in l1' -RunId 'l1' -Profile 'standin-ledger' -Standin `
      -BindingFixture $fixtureFile -ExtraRequest $extra `
      -CommandArgs @($writer, "--out=$out", '--records=3', '--mode=ok')
    Assert ($r.Outcome -eq 'success' -and $r.Exit -eq 0) "outcome $($r.Outcome)"
    Assert ((Test-Path $out) -and $r.Result.profile -eq 'standin-ledger') 'the ledger payload ran'
    New-World | Out-Null
    $short = "$script:RunsRoot\generic\l2\ledger.json"
    Assert-Throws { Invoke-PayloadLocked -Task 'stand-in l2' -RunId 'l2' -Profile 'standin-ledger' `
        -Standin -BindingFixture $fixtureFile -ExtraRequest $extra `
        -CommandArgs @($writer, "--out=$short", '--records=3', '--mode=short') } 'STOP' 'a short ledger'
    $rec = @(Get-Ledger)[0]
    Assert ($rec.outcome -eq 'stop' -and $rec.exit -eq 65) 'a ledger of too few records is a stop'
  } finally { $script:PayloadExit1.Remove('standin-ledger') }
}

function New-StandinWorld([string]$Name, [string]$Campaign = '') {
  $dir = "$scratch\$Name"
  $sha = (Get-FileHash -LiteralPath $manifestFile -Algorithm SHA256).Hash.ToLowerInvariant()
  $nodeArgs = @("$tools\standin-world.js", "--repo=$dir")
  if ($Campaign) { $nodeArgs += @("--campaign=$Campaign", "--helper-sha=$sha") }
  $json = & node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "standin-world.js failed for $Name" }
  return ($json | ConvertFrom-Json)
}

# Runs `$Body` over a stand-in world (a fake repository with a fake generator project and a reduced chunk
# manifest): the wrapper settings are switched to it and always restored.
function Invoke-InStandinWorld($World, [scriptblock]$Body) {
  $keep = @{ Repo = $script:RunRepo; Runs = $script:RunsRoot; Expected = $script:Expected }
  $script:RunRepo = $World.repo
  $script:RunsRoot = "$($World.repo)\docs\difficulty-v3\evidence\MS18d\gp"
  $script:Expected = [ordered]@{
    base = $null
    identities = [ordered]@{ hashIdentity = $World.expected.hashIdentity
      replayIdentity = $World.expected.replayIdentity; sources = $World.expected.sources }
    tableSha256 = $World.expected.tableSha256; node = $World.expected.node; machine = $World.expected.machine
  }
  $targets = [ordered]@{}
  $positions = @()
  foreach ($p in $World.cells.PSObject.Properties) {
    $targets[$p.Name] = [int]$p.Value
    $positions += [ordered]@{ key = $p.Name; target = [int]$p.Value }
  }
  $fx = [ordered]@{
    head = $World.head; statusPorcelainZ = ''; identities = $script:Expected.identities
    table = [ordered]@{ sha256 = $World.expected.tableSha256; positions = $positions; targets = $targets }
    machine = $World.expected.machine; node = $World.expected.node
    committed = [ordered]@{}; workingFiles = [ordered]@{}
  }
  $script:StandinFixture = "$($World.repo)\binding-fixture.json"
  [IO.File]::WriteAllText($script:StandinFixture, ($fx | ConvertTo-Json -Depth 8))
  try { & $Body } finally {
    $script:RunRepo = $keep.Repo
    $script:RunsRoot = $keep.Runs
    $script:Expected = $keep.Expected
  }
}

function Get-PlanDocC($World) {
  $file = "$($World.repo)\$($script:PlanFileRel)"
  return (Get-Content -LiteralPath $file -Raw | ConvertFrom-Json -DateKind String)
}

function Get-StandinRecorderArgs($World, [string]$ChunkId, [int]$Attempt = 1) {
  $doc = Get-PlanDocC $World
  $slot = @($doc.runSlots | Where-Object {
      $_.role -eq 'chunk' -and $_.chunkId -eq $ChunkId -and $_.attempt -eq $Attempt })[0]
  $out = "$($World.repo)\" + ($slot.dir -replace '/', '\') + '\ledger.json'
  return @("$tools\record-gp.js", "--plan=$($script:PlanFileRel)", "--chunk=$ChunkId", "--out=$out",
    "--standin-root=$($World.generator)")
}

function Get-StandinMergeArgs($World, [string]$Scope) {
  $doc = Get-PlanDocC $World
  $slot = @($doc.runSlots | Where-Object { $_.role -eq 'final-merge' })[0]
  $out = "$($World.repo)\" + ($slot.dir -replace '/', '\') + '\report.json'
  return @("$tools\merge-gp.js", "--plan=$($script:PlanFileRel)", "--scope=$Scope", "--out=$out")
}

# Old release times in the C ledger of the world, so the 15 s rule of the controller is not what holds.
function Set-LedgerOld {
  $rows = @(Read-JsonLines -File $script:LogC)
  $old = (Get-Date).AddHours(-2)
  $lines = foreach ($row in $rows) {
    $row.finished = Get-Stamp $old
    if ($row.releaseObservedAt) { $row.releaseObservedAt = Get-Stamp $old }
    $row | ConvertTo-Json -Depth 6 -Compress
  }
  [IO.File]::WriteAllText($script:LogC, (($lines -join "`r`n") + "`r`n"))
}

function Start-StandinRecorder($World, [string]$ChunkId, [int]$Attempt = 1) {
  return Invoke-RecorderLocked -ChunkId $ChunkId -Attempt $Attempt -CampaignBase $World.base -Standin `
    -BindingFixture $script:StandinFixture -CommandArgs (Get-StandinRecorderArgs $World $ChunkId $Attempt)
}

function Start-StandinMerge($World, [string]$Scope = 'all-79') {
  return Invoke-MergeLocked -Scope $Scope -CampaignBase $World.base -Standin `
    -BindingFixture $script:StandinFixture -CommandArgs (Get-StandinMergeArgs $World $Scope)
}

Test-Case 'R24 recorder through wrapper, controller, tee and recorder: ledger, receipts, accounting' {
  New-World | Out-Null
  $w = New-StandinWorld 'rw1'
  Invoke-InStandinWorld $w {
    $id = 'fakea-easy.i0.n50'
    $r = Start-StandinRecorder $w $id
    Assert ($r.Outcome -eq 'success' -and $r.Exit -eq 0) "outcome $($r.Outcome) exit $($r.Exit)"
    $dir = $r.RunDir
    Assert ($dir -eq "$($w.repo)\docs\difficulty-v3\evidence\MS18d\gp\fakea-easy\$id.a1") "run dir $dir"
    foreach ($n in 'request.json', 'acquisition.json', 'binding.json', 'admission.json', 'attempts.json',
      'plan-check.json', 'transcript.txt', 'stdout.txt', 'stderr.txt', 'pids.jsonl', 'cleanup.json',
      'result.json', 'wrapper.json', 'ledger.json') { Assert (Test-Path "$dir\$n") "missing $n" }
    Assert ((Get-Item "$dir\stderr.txt").Length -eq 0) 'stderr is empty'
    $lines = @(Get-Content "$dir\stdout.txt" | Where-Object { $_.Trim() })
    Assert ($lines.Count -eq 2 -and $lines[0] -match '^ms18d-gp-recorder-start ' -and
      $lines[1] -match '^ms18d-gp-ledger-complete ') 'stdout is the start line and the marker'
    $ledger = Read-Json "$dir\ledger.json"
    Assert ($ledger.schema -eq 'ms18d-gp-request-ledger-v1' -and @($ledger.requests).Count -eq 50 -and
      $ledger.observation.provenance.standin -eq $true -and $ledger.identity.base -eq $w.base) 'the ledger'
    $result = Read-Json "$dir\result.json"
    Assert ($result.classification.complete -eq $true -and $result.profile -eq 'gp-recorder') 'G3 complete'
    $att = Read-Json "$dir\attempts.json"
    Assert ($att.decision -eq 'allow' -and $att.admissions -eq 0 -and $att.payloads -eq 0) 'accounting before'
    $adm = Read-Json "$dir\admission.json"
    Assert ($adm.decision -eq 'proceed' -and $adm.payloadChecks -eq $true) 'admission'
    $row = @(Get-Ledger)[0]
    Assert ($row.payload -eq 'gp-recorder' -and $row.chunkId -eq $id -and $row.attempt -eq 1 -and
      $row.outcome -eq 'success') "the C ledger row $($row | ConvertTo-Json -Compress)"
    $req = Read-Json "$dir\request.json"
    Assert ($req.plan.manifestSha256 -match '^[0-9a-f]{64}$' -and $req.chunk.chunkId -eq $id -and
      $req.policy.selector -eq 'S-OD15') 'the request carries the plan, the chunk and the policy'
  }
}

Test-Case 'R4 through the wrapper: a chunk whose payload started is never run again (a control-hold)' {
  New-World | Out-Null
  $w = New-StandinWorld 'rw2'
  Invoke-InStandinWorld $w {
    $id = 'fakea-easy.i0.n50'
    $first = Start-StandinRecorder $w $id
    Assert ($first.Outcome -eq 'success') 'attempt 1'
    Set-LedgerOld
    $second = Start-StandinRecorder $w $id 2
    Assert ($second.Outcome -eq 'control-hold' -and $second.Exit -eq 64) "outcome $($second.Outcome)"
    $att = Read-Json "$($second.RunDir)\attempts.json"
    Assert ($att.decision -eq 'refuse' -and $att.payloads -eq 1 -and $att.admissions -eq 1) 'accounting'
    $why = (Read-Json "$($second.RunDir)\result.json").reasons -join ' '
    Assert ($why -match 'chunk-payload-already-started') "reasons: $why"
    Assert (-not (Test-Path "$($second.RunDir)\transcript.txt") -and
      -not (Test-Path "$($second.RunDir)\ledger.json")) 'no payload started'
    $rows = @(Get-Ledger)
    Assert ($rows.Count -eq 2 -and $rows[1].attempt -eq 2 -and
      $rows[1].outcome -eq 'control-hold') 'ledger rows'
  }
}

Test-Case 'R5 through the wrapper: NODE_OPTIONS set means the transport refuses to spawn (no run folder)' {
  New-World | Out-Null
  $w = New-StandinWorld 'rw3'
  Invoke-InStandinWorld $w {
    $id = 'fakea-easy.i0.n50'
    $env:NODE_OPTIONS = '--no-warnings'
    try {
      Assert-Throws { Start-StandinRecorder $w $id } 'NODE_OPTIONS is set' 'the recorder'
      Assert-Throws { Start-StandinMerge $w } 'NODE_OPTIONS is set' 'the merge'
    } finally { Remove-Item Env:\NODE_OPTIONS }
    Assert (-not (Test-Path "$script:RunsRoot\fakea-easy")) 'no run folder was made'
    Assert (@(Get-Ledger).Count -eq 0 -and -not (Test-Path $sharedLock)) 'nothing recorded, no lock'
  }
}

Test-Case 'final-matrix refusals before anything starts: unknown chunk, undeclared slot, no base' {
  New-World | Out-Null
  $w = New-StandinWorld 'rw4'
  Invoke-InStandinWorld $w {
    Assert-Throws { Invoke-RecorderLocked -ChunkId 'fakea-easy.i0.n49' -Standin -CommandArgs @('x') } `
      'not a chunk of the manifest' 'an unknown chunk'
    Assert-Throws { Invoke-RecorderLocked -ChunkId 'fakea-easy.i0.n50' -CampaignBase 'main' } `
      '40 hex' 'a real recorder without a base commit'
    Assert-Throws { Invoke-MergeLocked -Scope 'cell:fakea/easy' -Standin -CommandArgs @('x') } `
      'declares no merge slot' 'a selected-cell merge the manifest does not declare'
    Assert-Throws { Invoke-MergeLocked -Scope 'everything' -Standin -CommandArgs @('x') } `
      'merge scope is all-79' 'a wrong scope'
    Assert-Throws { Invoke-RecorderLocked -ChunkId 'fakea-easy.i0.n50' -CampaignBase $w.base `
        -CommandArgs @('x') } 'frozen command line only' 'a real run with its own command line'
    Assert-Throws { Invoke-RecorderLocked -ChunkId 'fakea-easy.i0.n50' -CampaignBase $w.base } `
      'must require the frozen chunk manifest' 'a helper manifest that does not list the plan'
    Assert (@(Get-Ledger).Count -eq 0 -and
      -not (Test-Path "$script:RunsRoot\fakea-easy")) 'nothing started'
  }
}

Test-Case 'R1 through the wrapper: a final merge returns success (0) or a complete MISS (1), no throw' {
  foreach ($case in @(@('pass', 'success', 0), @('miss', 'miss', 1))) {
    New-World | Out-Null
    $w = New-StandinWorld ('mw-' + $case[0]) $case[0]
    Invoke-InStandinWorld $w {
      $r = Start-StandinMerge $w
      Assert ($r.Outcome -eq $case[1] -and $r.Exit -eq $case[2]) `
        "$($case[0]): outcome $($r.Outcome) exit $($r.Exit)"
      Assert ((Test-Path "$($r.RunDir)\report.json") -and
        (Test-Path "$($r.RunDir)\plan-check.json")) 'the report'
      $report = Read-Json "$($r.RunDir)\report.json"
      Assert ($report.complete -eq $true -and $report.meets -eq ($case[0] -eq 'pass')) 'the verdict'
      $lastLine = @(Get-Content "$($r.RunDir)\stdout.txt" | Where-Object { $_.Trim() })[-1]
      Assert ($lastLine -match '^ms18d-gp-merge-result scope=all-79 complete=true meets=') "line: $lastLine"
      Assert ($r.Result.classification.complete -eq $true -and $r.Result.profile -eq 'gp-merge') 'G3'
      Assert ((Get-Item "$($r.RunDir)\stderr.txt").Length -eq 0) 'stderr is empty'
      $row = @(Get-Ledger)[0]
      Assert ($row.payload -eq 'gp-merge' -and $row.scope -eq 'all-79' -and
        $row.outcome -eq $case[1]) 'ledger row'
    }
  }
}

Test-Case 'R1 through the wrapper: incomplete input is exit 2: a STOP that keeps every record' {
  New-World | Out-Null
  $w = New-StandinWorld 'mw-incomplete' 'pass'
  Remove-Item -LiteralPath "$($w.repo)\docs\difficulty-v3\evidence\MS18d\gp\fakeb-easy" -Recurse -Force
  Invoke-InStandinWorld $w {
    $dir = "$script:RunsRoot\all-79\final.m1"
    Assert-Throws { Start-StandinMerge $w } 'STOP' 'an incomplete merge'
    $row = @(Get-Ledger)[0]
    Assert ($row.outcome -eq 'stop' -and $row.exit -eq 65) "ledger $($row.outcome) exit $($row.exit)"
    $report = Read-Json "$dir\report.json"
    Assert ($report.complete -eq $false -and $null -eq $report.resultLine) 'the incomplete report is kept'
    Assert ((Get-Content "$dir\stdout.txt" -Raw) -match 'ms18d-gp-merge-incomplete') 'the transcript is kept'
  }
}

Test-Case 'the Phase A and Phase B ledgers were never written by the wrapper' {
  Assert ((Get-FileHash -LiteralPath $realLogA).Hash -eq $realHashA) 'the Phase A lock log is unchanged'
  Assert ((Get-FileHash -LiteralPath $realLogB).Hash -eq $realHashB) 'the Phase B lock log is unchanged'
  Assert (-not (Test-Path 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS18d\gp')) 'no real GP directory'
}

foreach ($p in $script:started) {
  try { if (-not $p.HasExited) { $p.Kill() } } catch { }
}
Write-Host "$script:passed passed, $($script:failed.Count) failed"
if ($script:failed.Count -gt 0) { Write-Host ('FAILED: ' + ($script:failed -join ' | ')); exit 1 }
exit 0
