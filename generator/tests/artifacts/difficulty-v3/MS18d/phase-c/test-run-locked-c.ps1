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
$realLogC = $script:LogC
$realHashA = (Get-FileHash -LiteralPath $realLogA).Hash
$realHashB = (Get-FileHash -LiteralPath $realLogB).Hash
$realHashC = (Get-FileHash -LiteralPath $realLogC).Hash
$realGp = $script:RunsRoot
# the names and content digests of a folder tree (the real GP outputs of the campaign are read, never written)
function Get-TreeState([string]$Root) {
  if (-not (Test-Path -LiteralPath $Root)) { return 'absent' }
  $lines = Get-ChildItem -LiteralPath $Root -Recurse -File | Sort-Object FullName | ForEach-Object {
    $_.FullName.Substring($Root.Length) + '|' + (Get-FileHash -LiteralPath $_.FullName).Hash
  }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
  return [BitConverter]::ToString([Security.Cryptography.SHA256]::HashData($bytes)).Replace('-', '')
}
$realGpState = Get-TreeState $realGp
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
$script:WatchHook = $null
$script:WatchCalls = [System.Collections.Generic.List[object]]::new()
$realWatch = ${function:Wait-SlotQuiet}
function Wait-SlotQuiet {
  param([double]$WindowSeconds = 15.3, [double]$GiveUpSeconds = 1200, [int]$IntervalMs = 250,
    [int]$MaxIntervalMs = 1000, [long]$NotBeforeMs = 0, [string]$TempDir = $env:TEMP)
  if ($script:UseRealWatch) { return & $realWatch @PSBoundParameters }
  $script:WatchCalls.Add([pscustomobject]@{ WindowSeconds = $WindowSeconds; GiveUpSeconds = $GiveUpSeconds
      NotBeforeMs = $NotBeforeMs
      RunFolders = @(Get-ChildItem -LiteralPath $script:RunsRoot -Directory -Recurse `
          -ErrorAction SilentlyContinue).Count })
  $t = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $record = [pscustomobject][ordered]@{
    schema = 'ms18d-c-watch-1'; startedAtMs = $t - 15400; firstCheckMs = $t - 15400; lastCheckMs = $t - 10
    requiredWindowMs = 15300; maxIntervalAllowedMs = 1000; intervalMs = 250; checks = 62; windowChecks = 62
    maxIntervalMs = 260; windowSightings = 0; restartCount = 0; restarts = @(); giveUpSeconds = $GiveUpSeconds
    gaveUp = $false; notBeforeMs = $NotBeforeMs; stub = $true
  }
  # R2 tests: an event during the watch (a log line, a new HEAD) or a watch that is stale when it ends
  if ($script:WatchHook) { & $script:WatchHook $script:WatchCalls.Count $record $GiveUpSeconds }
  return $record
}

# Epoch 2 tests: the full checks of a cycle can be slowed, or made to change the state, by a test
$realLineChecks = ${function:Test-LineChecksC}
$script:LineChecksDelayMs = 0
$script:LineChecksHook = $null
$script:LineChecksCalls = 0
function Test-LineChecksC {
  param([string]$Profile, [string]$Unit, [int]$Attempt, [string]$CellDir, [string]$Base = '')
  $script:LineChecksCalls++
  if ($script:LineChecksDelayMs -gt 0) { Start-Sleep -Milliseconds $script:LineChecksDelayMs }
  if ($script:LineChecksHook) { & $script:LineChecksHook $script:LineChecksCalls }
  & $realLineChecks @PSBoundParameters
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
    Write-Host "     $($_.ScriptStackTrace -replace "`r?`n", ' | ')"
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

Test-Case 'a watch that gives up writes NO run folder: one pre-window-hold line, nothing started (F1)' {
  New-World | Out-Null
  [IO.File]::WriteAllText($timingLock, 'foreign')
  $script:UseRealWatch = $true
  $script:WatchGiveUpSeconds = 2
  try { $r = Start-Gp 'r9' } finally {
    $script:UseRealWatch = $false
    $script:WatchGiveUpSeconds = 1200
    Remove-Item -LiteralPath $timingLock -ErrorAction SilentlyContinue
  }
  Assert ($r.Outcome -eq 'control-hold' -and $null -eq $r.Exit -and $null -eq $r.RunDir) `
    "outcome $($r.Outcome)"
  Assert (-not (Test-Path "$script:RunsRoot\classic4-veryEasy")) 'no run folder exists'
  Assert (-not (Test-Path $script:RunsRoot) -or @(Get-ChildItem $script:RunsRoot -Recurse).Count -eq 0) `
    'nothing'
  $rows = @(Get-Ledger)
  Assert ($rows.Count -eq 1) "ledger lines $($rows.Count)"
  Assert ($rows[0].type -eq 'pre-window-hold' -and $rows[0].outcome -eq 'pre-window-hold' -and
    $rows[0].heldAt -eq 'foreign-lock-watch' -and $rows[0].watch.gaveUp) 'the typed ledger line'
  Assert (-not (Test-Path $sharedLock)) 'the shared lock was never taken'
  Assert ($null -eq (Get-LastReleaseC) -or (Get-LastReleaseC) -lt (Get-Date).AddMinutes(-20)) `
    'a pre-window hold is not a release: the gap clock does not move'
}

Test-Case 'F1: the run folder is created only AFTER the quiet window; the folder of a refusal never is' {
  New-World | Out-Null
  $r = Start-Gp 'f1a'
  Assert ($script:WatchCalls[0].RunFolders -eq 0) 'no folder existed while the watch ran'
  Assert (Test-Path "$($r.RunDir)\watch.json") 'the watch record is kept in the folder created afterwards'
  New-World | Out-Null
  $keep = $script:HelperManifest
  try {
    $script:HelperManifest = [pscustomobject]@{ File = $manifestFile; Sha256 = ('0' * 64); Required = @() }
    Assert-Throws { Start-Gp 'f1b' } 'not the reviewed one' 'a refusal'
  } finally { $script:HelperManifest = $keep }
  Assert ($script:WatchCalls.Count -eq 0) 'the watch was never reached'
  Assert (-not (Test-Path $script:RunsRoot)) 'no folder and no run base'
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

# ---- committed journals for the pre-flight (F1/F3/C1): a fake Git whose `show` serves two maps, the texts
# committed at HEAD and at the campaign base B (a test mutates the maps; the working tree is never consulted)
$script:Committed = @{}
$script:CommittedBase = @{}
$script:FixtureDoc = $null

# A fake Git reader: HEAD, whether the base is its ancestor, the changed names, whether the pack files are
# tracked, and the committed texts of `git show <ref>:<path>` (HEAD's own map, any other ref reads the base's)
function New-FakeGit([string]$Head, [bool]$Descendant, [string[]]$Names, [bool]$Tracked,
  [hashtable]$Show = $script:Committed, [hashtable]$ShowBase = $script:CommittedBase) {
  return {
    param([string[]]$a)
    if ($a[0] -eq 'rev-parse') {
      return [pscustomobject]@{ Exit = $(if ($Head) { 0 } else { 1 }); Out = $Head }
    }
    if ($a[0] -eq 'merge-base') {
      return [pscustomobject]@{ Exit = $(if ($Descendant) { 0 } else { 1 }); Out = '' }
    }
    if ($a -contains 'diff') { return [pscustomobject]@{ Exit = 0; Out = ($Names -join "`n") } }
    if ($a[0] -eq 'cat-file') {
      return [pscustomobject]@{ Exit = $(if ($Tracked) { 0 } else { 1 }); Out = '' }
    }
    if ($a[0] -eq 'show') {
      $colon = $a[1].IndexOf(':')
      $map = $(if ($a[1].Substring(0, $colon) -eq $Head) { $Show } else { $ShowBase })
      $rel = $a[1].Substring($colon + 1)
      if ($map.ContainsKey($rel)) { return [pscustomobject]@{ Exit = 0; Out = [string]$map[$rel] } }
      return [pscustomobject]@{ Exit = 128; Out = '' }
    }
    return [pscustomobject]@{ Exit = 2; Out = 'unexpected' }
  }.GetNewClosure()
}

# Sets one committed text (HEAD, and the base too with -AlsoBase) and, in a stand-in world, rewrites the
# binding fixture so that the controller reads the same committed state
function Set-Committed([string]$Rel, [string]$Text, [switch]$AlsoBase) {
  $script:Committed[$Rel] = $Text
  if ($AlsoBase) { $script:CommittedBase[$Rel] = $Text }
  if ($script:FixtureDoc) {
    [IO.File]::WriteAllText($script:StandinFixture, ($script:FixtureDoc | ConvertTo-Json -Depth 8))
  }
}

# Runs `$Body` over empty committed journals and a fake Git (no stand-in world): the maps and the reader are
# always restored
function Invoke-WithFakeJournals([scriptblock]$Body) {
  $keep = @{ Git = $script:GitOverride; Committed = $script:Committed; Base = $script:CommittedBase }
  $script:Committed = @{ $script:RulingsRel = ''; $script:HostBindingsRel = '' }
  $script:CommittedBase = @{ $script:RulingsRel = ''; $script:HostBindingsRel = '' }
  $script:GitOverride = New-FakeGit ('a' * 40) $true @() $true $script:Committed $script:CommittedBase
  try { & $Body } finally {
    $script:GitOverride = $keep.Git
    $script:Committed = $keep.Committed
    $script:CommittedBase = $keep.Base
  }
}

function Get-TextSha256([string]$Text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($Text -replace '^\uFEFF', '').Replace("`r`n", "`n"))
  $hex = [BitConverter]::ToString([Security.Cryptography.SHA256]::HashData($bytes)).Replace('-', '')
  return $hex.ToLowerInvariant()
}

# One host-binding journal line and its evidence file, for the facts of a host (Get-HostFactsC shape)
function New-BindingLine([string]$Id, $Replaces, $Facts, [hashtable]$Over = @{}) {
  $hostObject = [ordered]@{ pid = [int]$Facts.pid; dotNetStartTime = [string]$Facts.netStartUtc
    cimCreationDateUtcMicroseconds = [string]$Facts.cimCreationUtc; parentPid = [int]$Facts.parentPid
    executablePath = [string]$Facts.exePath }
  foreach ($k in @($Over.Keys | Where-Object { $_ -like 'host.*' })) {
    $hostObject[$k.Substring(5)] = $Over[$k]
  }
  $text = ([ordered]@{ schema = 'ms18d-c-host-observation-1'; ok = $true; host = $hostObject } |
      ConvertTo-Json -Depth 4) + "`n"
  $entry = [ordered]@{ bindingId = $Id; replaces = $Replaces; host = $hostObject
    observedAt = '2026-01-02T10:00:00.000+07:00'
    evidence = [ordered]@{ file = "$($script:EvidenceDirRel)$Id.json"; sha256 = (Get-TextSha256 $text) }
    ref = "SA2 ruling $Id"; at = '2026-01-02T10:05:00.000+07:00' }
  foreach ($k in @($Over.Keys | Where-Object { $_ -notlike 'host.*' })) { $entry[$k] = $Over[$k] }
  return [pscustomobject]@{ Line = ($entry | ConvertTo-Json -Depth 5 -Compress); File = $entry.evidence.file
    Text = $text }
}

# Commits a binding chain: lines in order (each a New-BindingLine result) and their evidence files
function Set-CommittedBindings($Lines, [switch]$AlsoBase) {
  $joined = @($Lines | ForEach-Object { $_.Line }) -join "`n"
  $text = $(if (@($Lines).Count -eq 0) { '' } else { $joined + "`n" })
  foreach ($l in @($Lines)) { Set-Committed $l.File $l.Text -AlsoBase:$AlsoBase }
  Set-Committed $script:HostBindingsRel $text -AlsoBase:$AlsoBase
}

function New-RulingLine([string]$Chunk, [string]$Held, [hashtable]$Over = @{}) {
  $r = Merge-Keys ([ordered]@{ chunkId = $Chunk; heldRunId = $Held; allowAttempt = 2; ref = 'SA2 ruling'
      at = (Get-Date).AddMinutes(-5).ToString($stamp) }) $Over
  return ($r | ConvertTo-Json -Compress)
}

function New-StandinWorld([string]$Name, [string]$Campaign = '') {
  $dir = "$scratch\$Name"
  $sha = (Get-FileHash -LiteralPath $manifestFile -Algorithm SHA256).Hash.ToLowerInvariant()
  $nodeArgs = @("$tools\standin-world.js", "--repo=$dir", "--wrapper-pid=$PID")
  if ($Campaign) { $nodeArgs += @("--campaign=$Campaign", "--helper-sha=$sha") }
  $json = & node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "standin-world.js failed for $Name" }
  return ($json | ConvertFrom-Json)
}

# Runs `$Body` over a stand-in world (a fake repository with a fake generator project and a reduced chunk
# manifest): the wrapper settings are switched to it and always restored.
function Invoke-InStandinWorld($World, [scriptblock]$Body) {
  $keep = @{ Repo = $script:RunRepo; Runs = $script:RunsRoot; Expected = $script:Expected
    Git = $script:GitOverride; Committed = $script:Committed; Base = $script:CommittedBase }
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
  # the committed journals of the world (one host binding in force, no ruling), read by the wrapper through
  # a fake Git and by the controller through the fixture: both see the same maps
  $script:Committed = @{}
  foreach ($p in $World.journals.committed.PSObject.Properties) {
    $script:Committed[$p.Name] = [string]$p.Value
  }
  $script:CommittedBase = $script:Committed.Clone()
  $script:GitOverride = New-FakeGit $World.head $true @() $true $script:Committed $script:CommittedBase
  $script:FixtureDoc = [ordered]@{
    head = $World.head; statusPorcelainZ = ''; identities = $script:Expected.identities
    table = [ordered]@{ sha256 = $World.expected.tableSha256; positions = $positions; targets = $targets }
    machine = $World.expected.machine; node = $World.expected.node
    committed = $script:Committed; committedBase = $script:CommittedBase; workingFiles = [ordered]@{}
  }
  $script:StandinFixture = "$($World.repo)\binding-fixture.json"
  [IO.File]::WriteAllText($script:StandinFixture, ($script:FixtureDoc | ConvertTo-Json -Depth 8))
  try { & $Body } finally {
    $script:RunRepo = $keep.Repo
    $script:RunsRoot = $keep.Runs
    $script:Expected = $keep.Expected
    $script:GitOverride = $keep.Git
    $script:Committed = $keep.Committed
    $script:CommittedBase = $keep.Base
    $script:FixtureDoc = $null
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
    -BindingFixture $script:StandinFixture -CommandArgs (Get-StandinMergeArgs $World $Scope) `
    -ExtraRequest @{ bindingJournalText = [string]$script:Committed[$script:HostBindingsRel] }
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

Test-Case 'R4/F2 through the wrapper: a chunk whose payload started never runs again; no folder is made' {
  New-World | Out-Null
  $w = New-StandinWorld 'rw2'
  Invoke-InStandinWorld $w {
    $id = 'fakea-easy.i0.n50'
    $first = Start-StandinRecorder $w $id
    Assert ($first.Outcome -eq 'success') 'attempt 1'
    Set-LedgerOld
    Assert-Throws { Start-StandinRecorder $w $id 2 } 'not an unstarted control-hold' 'a second attempt'
    Assert (-not (Test-Path "$script:RunsRoot\fakea-easy\$id.a2")) 'no second folder: the slot is not spent'
    Assert-Throws { Start-StandinRecorder $w $id 1 } 'a run is never overwritten' 'attempt 1 again'
    $rows = @(Get-Ledger)
    Assert ($rows.Count -eq 1 -and $rows[0].attempt -eq 1 -and $rows[0].outcome -eq 'success') 'ledger rows'
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
      'needs the reviewed helper manifest hash' 'a real run without the reviewed manifest hash'
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

function Write-Row([string]$Log, $Row) {
  [IO.File]::AppendAllText($Log, (($Row | ConvertTo-Json -Compress -Depth 4) + "`r`n"))
}

# A copy of an ordered base with the keys of $Over replaced or added
function Merge-Keys($Base, $Over) {
  $out = [ordered]@{}
  foreach ($k in $Base.Keys) { $out[$k] = $Base[$k] }
  foreach ($k in $Over.Keys) { $out[$k] = $Over[$k] }
  return $out
}

Test-Case 'F1: every pre-flight refusal of a REAL call comes before any folder, log line, watch or lock' {
  New-World | Out-Null
  $w = New-StandinWorld 'pf1'
  $planHash = (Get-FileHash -LiteralPath (Join-Path $script:Ms18dRoot $script:PlanFileRel)).Hash
  $plus = "$scratch\manifest-plus-plan.txt"
  [IO.File]::WriteAllLines($plus,
    @([IO.File]::ReadAllLines($manifestFile)) + @("$planHash  $script:PlanFileRel"))
  $plusSha = (Get-FileHash -LiteralPath $plus).Hash.ToLowerInvariant()
  $saved = @{ Manifest = $script:HelperManifest; Git = $script:GitOverride }
  $id = 'fakea-easy.i0.n50'
  Invoke-InStandinWorld $w {
    $good = New-FakeGit $w.base $true @() $true
    $orig = $script:Committed.Clone()
    $restore = {
      $script:Committed.Clear()
      $script:CommittedBase.Clear()
      foreach ($k in $orig.Keys) { $script:Committed[$k] = $orig[$k]; $script:CommittedBase[$k] = $orig[$k] }
    }
    $refuse = {
      param([string]$pattern, [string]$what, [hashtable]$more = @{})
      Assert-Throws { Invoke-RecorderLocked -ChunkId $id -CampaignBase $w.base @more } $pattern $what
      Assert (-not (Test-Path "$script:RunsRoot\fakea-easy")) "$what : no folder"
      Assert (@(Get-Ledger).Count -eq 0 -and -not (Test-Path $sharedLock)) "$what : no log line, no lock"
      Assert ($script:WatchCalls.Count -eq 0) "$what : the watch was never reached"
    }
    try {
      $script:HelperManifest = [pscustomobject]@{ File = $plus; Sha256 = $plusSha; Required = @() }
      $script:GitOverride = $good
      & $refuse 'ExecOverride is for stand-ins only' '-ExecOverride on a real run' @{ ExecOverride = 'node' }
      & $refuse 'binding fixture is for stand-ins only' 'a binding fixture on a real run' @{
        BindingFixture = $script:StandinFixture }
      $script:HelperManifest = [pscustomobject]@{ File = $plus; Sha256 = $null; Required = @() }
      & $refuse 'needs the reviewed helper manifest hash' 'no reviewed manifest hash'
      $script:HelperManifest = [pscustomobject]@{ File = $plus; Sha256 = ('0' * 64); Required = @() }
      & $refuse 'not the reviewed one' 'a manifest that is not the reviewed one'
      $script:HelperManifest = [pscustomobject]@{ File = $manifestFile
        Sha256 = (Get-FileHash -LiteralPath $manifestFile).Hash.ToLowerInvariant(); Required = @() }
      & $refuse 'not in the manifest: docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json' `
        'a manifest that does not list the plan'
      $script:HelperManifest = [pscustomobject]@{ File = $plus; Sha256 = $plusSha; Required = @() }
      Assert-Throws { Invoke-RecorderLocked -ChunkId $id -CampaignBase 'main' } '40 hex' 'an undeclared base'
      Assert-Throws { Invoke-RecorderLocked -ChunkId $id } '40 hex' 'no base'
      $script:GitOverride = New-FakeGit '' $true @() $true
      & $refuse 'HEAD cannot be read' 'unreadable HEAD'
      $script:GitOverride = New-FakeGit ('c' * 40) $false @() $true
      & $refuse 'neither the campaign base' 'a HEAD that is not a descendant of B'
      $script:GitOverride = New-FakeGit ('c' * 40) $true @('generator/tests/artifacts/x.js') $true
      & $refuse 'changed since the campaign base: generator/tests/artifacts/x.js' 'a changed helper since B'
      $script:GitOverride = New-FakeGit $w.base $true @() $false
      & $refuse 'phase-c/lock-log.jsonl is not tracked at HEAD' 'a C lock log that is not tracked'
      & $refuse 'MS18d-gp-host-bindings.jsonl is not tracked at HEAD' 'a host-binding journal not tracked'
      & $refuse 'MS18d-gp-rulings.jsonl is not tracked at HEAD' 'a rulings journal not tracked'
      $script:GitOverride = $good
      # the committed host-binding journal: an empty or invalid one means no binding, with no fall-back
      $dead = [ordered]@{ pid = 2147483000; parentPid = 1; netStartUtc = '2026-01-01T00:00:00.0000000Z'
        cimCreationUtc = '2026-01-01T00:00:00.000000Z'; exePath = 'C:\fake\copilot.exe' }
      $first = New-BindingLine 'host-1' $null $dead
      Set-CommittedBindings @($first) -AlsoBase
      & $refuse 'the bound host process 2147483000 is not running' 'a host that is not the bound one'
      Set-Committed $script:HostBindingsRel '' -AlsoBase
      & $refuse 'host-binding journal is empty: no host binding is configured' 'an empty journal'
      Set-Committed $script:HostBindingsRel "{broken`n" -AlsoBase
      & $refuse 'binding line 1 is not JSON' 'a corrupt journal'
      $odd = New-BindingLine 'host-1' $null $dead @{ extra = 1 }
      Set-Committed $script:HostBindingsRel ($odd.Line + "`n") -AlsoBase
      & $refuse 'binding line 1 is not valid' 'an unknown member'
      $other = New-BindingLine 'host-2' 'wrong' $dead
      Set-CommittedBindings @($first, $other) -AlsoBase
      & $refuse 'binding line 2 is not valid \(.*replaces' 'a broken chain'
      Set-CommittedBindings @($first) -AlsoBase
      $script:Committed.Remove($first.File)
      & $refuse 'host-evidence/host-1.json is not committed at HEAD' 'evidence that is not committed'
      Set-Committed $first.File ($first.Text + ' ')
      & $refuse 'is not the cited bytes' 'evidence that is not the cited one'
      & $restore
      # the version at B must stay an exact line prefix of the committed one (append-only)
      Set-CommittedBindings @($first)
      $rewritten = New-BindingLine 'host-1' $null $dead @{ ref = 'other' }
      $script:CommittedBase[$script:HostBindingsRel] = $rewritten.Line + "`n"
      $script:GitOverride = New-FakeGit ('c' * 40) $true @() $true
      & $refuse 'does not keep the version committed at the campaign base' 'a rewritten base line'
      $script:GitOverride = $good
      & $restore
      Set-Committed $script:RulingsRel "{broken`n" -AlsoBase
      & $refuse 'ruling line 1 is not JSON' 'a corrupt rulings journal'
      & $restore
    } finally {
      $script:HelperManifest = $saved.Manifest
      $script:GitOverride = $saved.Git
    }
  }
}

Test-Case 'F1: the campaign head check passes at B, at an allowed descendant, with a tracked C log' {
  $base = 'b' * 40
  $dirs = @('docs/difficulty-v3/evidence/MS18d/gp/fakea-easy')
  $script:GitOverride = New-FakeGit $base $true @() $true
  try {
    Assert (@(Get-CampaignHeadProblemsC -Base $base -DeclaredDirs $dirs).Count -eq 0) 'HEAD is B'
    $names = @('tasks/difficulty-v3/check-list.md', 'tasks/difficulty-v3/MS18d-gp-rulings.jsonl',
      'docs/difficulty-v3/evidence/MS18d/gp/fakea-easy/x.a1/ledger.json'.Replace('/x.a1', ''),
      'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl')
    $script:GitOverride = New-FakeGit ('c' * 40) $true $names $true
    $p = @(Get-CampaignHeadProblemsC -Base $base -DeclaredDirs $dirs)
    Assert ($p.Count -eq 0) "an allowed descendant: $($p -join '; ')"
    foreach ($bad in @('docs/difficulty-v3/evidence/MS18d/gp/fakea-easy/sub/ledger.json',
        'docs/difficulty-v3/evidence/MS18d/gp/other/ledger.json', 'tasks/difficulty-v3/../x',
        'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json')) {
      $script:GitOverride = New-FakeGit ('c' * 40) $true @($bad) $true
      Assert (@(Get-CampaignHeadProblemsC -Base $base -DeclaredDirs $dirs).Count -eq 1) "refused: $bad"
    }
  } finally { $script:GitOverride = $null }
}

Test-Case 'F1: a stale shared lock (its owner is gone) is reported at once, never deleted, never waited out' {
  New-World | Out-Null
  $p = Start-Process -FilePath 'node' -ArgumentList '-e', '0' -PassThru -WindowStyle Hidden
  $null = $p.WaitForExit(10000)
  [IO.File]::WriteAllText($sharedLock, "$($p.Id)|stand-in task|2026-01-01T00:00:00.000Z")
  $watch = $script:WatchCalls.Count
  Assert-Throws { Start-Gp 'f1stale' } 'looks stale.*NOT deleted' 'a stale lock'
  Assert (Test-Path $sharedLock) 'the lock file is still there'
  Assert ($script:WatchCalls.Count -eq $watch -and -not (Test-Path $script:RunsRoot)) 'no wait, no folder'
  Assert (@(Get-Ledger).Count -eq 0) 'nothing recorded'
  [IO.File]::WriteAllText($sharedLock, "$PID|a live owner|2026-01-01T00:00:00.000Z")
  Assert (-not (Get-StaleSharedLockC)) 'a live owner is not stale'
  Remove-Item -LiteralPath $sharedLock
}

# C1: the live host against the binding in force, with an idle node process as a stand-in for the host
Test-Case 'C1: the wrapper pre-flight verifies the live host instance fact by fact, from the journal' {
  $host1 = Start-Process -FilePath 'node' -ArgumentList '-e', 'setInterval(()=>{},1000)' -PassThru `
    -WindowStyle Hidden
  $script:started.Add($host1)
  Start-Sleep -Milliseconds 700
  $facts = Get-HostFactsC -ProcessId $host1.Id
  Assert ($facts.found -and $facts.netStartUtc -match '\.\d{7}Z$' -and
    $facts.cimCreationUtc -match '\.\d{6}Z$') "the facts: $($facts | ConvertTo-Json -Compress)"
  $working = "$scratch\hb-working"
  Invoke-WithFakeJournals {
    $line1 = New-BindingLine 'host-1' $null $facts
    Set-CommittedBindings @($line1) -AlsoBase
    Assert (@(Get-HostProblemsC).Count -eq 0) 'the exact instance verifies'
    # every bound fact on its own: a different parent, executable, .NET start time (a restart or a reused PID)
    # or CIM creation time is a different instance; the ProcessName is never matched
    $overs = @(@{ key = 'parentPid'; over = @{ 'host.parentPid' = [int]($facts.parentPid + 1) } },
      @{ key = 'exePath'; over = @{ 'host.executablePath' = 'C:\other\node.exe' } },
      @{ key = 'netStartUtc'; over = @{ 'host.dotNetStartTime' = '2020-01-01T00:00:00.0000000Z' } },
      @{ key = 'cimCreationUtc'
        over = @{ 'host.cimCreationDateUtcMicroseconds' = '2020-01-01T00:00:00.000000Z' } })
    foreach ($case in $overs) {
      Set-CommittedBindings @((New-BindingLine 'host-1' $null $facts $case.over)) -AlsoBase
      $p = @(Get-HostProblemsC)
      Assert ($p.Count -eq 1 -and $p[0] -match "the host's $($case.key) differs") `
        "$($case.key) : $($p -join '; ')"
    }
    $renamed = New-BindingLine 'host-1' $null $facts @{ 'host.processName' = 'copilot.exe.old-1' }
    Set-CommittedBindings @($renamed) -AlsoBase
    Assert (@(Get-HostProblemsC).Count -eq 0) 'a ProcessName that differs is no difference'
    $dead = New-BindingLine 'host-1' $null $facts @{ 'host.pid' = ($host1.Id + 1000000) }
    Set-CommittedBindings @($dead) -AlsoBase
    Assert ((@(Get-HostProblemsC) -join ' ') -match 'is not running') 'an absent host'
    # an unapproved rebinding (a working-tree line that is not committed) changes nothing: still held
    New-Item -ItemType Directory -Force -Path "$working\tasks\difficulty-v3" | Out-Null
    $line2 = New-BindingLine 'host-2' 'host-1' $facts
    $workingFile = "$working\tasks\difficulty-v3\MS18d-gp-host-bindings.jsonl"
    [IO.File]::WriteAllText($workingFile, $dead.Line + "`n" + $line2.Line + "`n")
    Assert ((@(Get-HostProblemsC) -join ' ') -match 'is not running') 'an uncommitted rebinding: no authority'
    # the approved rebinding: appended and committed by the pack authors; the prior entry is retained
    $committedBefore = [string]$script:Committed[$script:HostBindingsRel]
    Set-CommittedBindings @($dead, $line2)
    Assert (([string]$script:Committed[$script:HostBindingsRel]).StartsWith($committedBefore)) 'append-only'
    Assert (@(Get-HostProblemsC -Base ('b' * 40)).Count -eq 0) 'the approved rebinding is in force'
    $script:CommittedBase[$script:HostBindingsRel] = $dead.Line.Replace('host-1', 'host-X') + "`n"
    Assert-Throws { Get-HostProblemsC -Base ('b' * 40) } `
      'does not keep the version committed at the campaign base' 'a rewritten base'
    # a real restart of the host: the bound process ends, and nothing rebinds on its own
    $host1.Kill()
    $null = $host1.WaitForExit(5000)
    $workingBefore = [IO.File]::ReadAllText($workingFile)
    $headBefore = [string]$script:Committed[$script:HostBindingsRel]
    Assert ((@(Get-HostProblemsC) -join ' ') -match 'is not running') 'the host ended: held, no rebinding'
    Assert ([string]$script:Committed[$script:HostBindingsRel] -eq $headBefore -and
      [IO.File]::ReadAllText($workingFile) -eq $workingBefore) 'the tooling wrote nothing'
  }
}

Test-Case 'C1: the probe returns the host facts and a process table with cumulative CPU times' {
  $s = Get-SnapshotC -HostPid $PID -TimeoutSeconds 15
  Assert ($s.ok -and $s.selfPid -eq $PID -and $s.processes.Count -gt 10) 'a usable table'
  Assert ($s.host.found -and $s.host.pid -eq $PID -and $s.host.netStartUtc -match '\.\d{7}Z$') `
    'the host block'
  Assert ($s.takenAtMs -ge $s.queryStartMs -and $s.takenAtMs -le $s.queryEndMs -and
    ($s.queryEndMs - $s.queryStartMs) -lt 15000) 'one bounded query'
  $row = @($s.processes | Where-Object { $_.pid -eq $PID })[0]
  Assert ($row.createdMs -eq $s.selfCreatedMs -and $row.cpuMs -gt 0) 'this probe is told apart by pid+time'
  Assert (@($s.processes | Where-Object { $null -eq $_.createdMs -or $null -eq $_.cpuMs }).Count -eq 0) `
    'no gaps'
  $none = Get-HostFactsC -ProcessId 2147483000
  Assert ($none.found -eq $false) 'an absent process is found = false'
}

Test-Case 'C1: a host observation has the shape of a journal entry, and a journal made of it verifies' {
  $obs = Get-HostObservationC -ProcessId $PID
  Assert ($obs.ok -eq $true -and $obs.schema -eq 'ms18d-c-host-observation-1' -and
    $obs.problems.Count -eq 0) "the observation: $($obs | ConvertTo-Json -Compress -Depth 4)"
  $h = $obs.host
  $order = 'pid,dotNetStartTime,cimCreationDateUtcMicroseconds,parentPid,executablePath'
  Assert ((@($h.Keys) -join ',') -eq $order) 'the five bound facts, in the journal order'
  Assert ($h.pid -eq $PID -and $h.dotNetStartTime -match '\.\d{7}[+-]\d\d:\d\d$' -and
    $h.cimCreationDateUtcMicroseconds -match '\.\d{6}Z$' -and $h.parentPid -gt 0 -and $h.executablePath) `
    'seven-digit .NET start time with its offset, six-digit UTC CIM time, parent, executable'
  Assert ($obs.observedAt -match '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}[+-]\d\d:\d\d$') `
    'the instant has a zone'
  Assert ($null -ne $obs.diagnostics.displayName -and $obs.diagnostics.probePid -eq $PID) 'the diagnostics'
  # the observation file and the host member make a journal entry the wrapper's reader accepts and verifies
  $text = ($obs | ConvertTo-Json -Depth 5) + "`n"
  $evidence = [ordered]@{ file = "$($script:EvidenceDirRel)obs-1.json"; sha256 = (Get-TextSha256 $text) }
  $entry = [ordered]@{ bindingId = 'obs-1'; replaces = $null; host = $h; observedAt = $obs.observedAt
    evidence = $evidence; ref = 'a test observation'; at = $obs.observedAt }
  Invoke-WithFakeJournals {
    Set-Committed $script:HostBindingsRel (($entry | ConvertTo-Json -Depth 5 -Compress) + "`n")
    Set-Committed $entry.evidence.file $text
    $problems = @(Get-HostProblemsC)
    Assert ($problems.Count -eq 0) "the observed host verifies: $($problems -join '; ')"
  }
  $gone = Get-HostObservationC -ProcessId 2147483000
  Assert ($gone.ok -eq $false -and $null -eq $gone.host -and
    ($gone.problems -join ' ') -match 'not running') 'an absent host: ok = false, no host member'
}

# F2/F3/F4: the line rules, over folders and C log lines made by hand in a stand-in world; the files these
# tests leave in the kept evidence folder end with CRLF like every other record
function Write-TestFile([string]$Path, [string]$Text) {
  [IO.File]::WriteAllText($Path, $Text + "`r`n")
}

function New-ChunkFolder([string]$Cell, [string]$Name, [hashtable]$Files) {
  $dir = "$script:RunsRoot\$Cell\$Name"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  foreach ($k in $Files.Keys) {
    $text = $(if ($Files[$k] -is [string]) { $Files[$k] } else { $Files[$k] | ConvertTo-Json -Depth 5 })
    Write-TestFile "$dir\$k" $text
  }
  return $dir
}

function Assert-AttemptThrows([string]$Pattern, [string]$What, [int]$Attempt = 2) {
  Assert-Throws { Assert-AttemptC -ChunkId 'fakea-easy.i0.n50' -Attempt $Attempt -CellDir 'fakea-easy' } `
    $Pattern $What
}

Test-Case 'F2: the attempt is checked before the folder exists (attempt 1 needs none, 2 only a1)' {
  New-World | Out-Null
  $c = 'fakea-easy.i0.n50'
  $keepWait = $script:ReAskWaitSeconds
  $old = (Get-Date).AddMinutes(-10).ToString($stamp)
  Invoke-WithFakeJournals {
    try {
      Assert-AttemptC -ChunkId $c -Attempt 1 -CellDir 'fakea-easy'
      Assert-AttemptThrows 'exactly its attempt 1 folder' 'no a1'
      $held = @{ 'request.json' = @{ chunk = @{ chunkId = $c } }; 'wrapper.json' = @{ chunkId = $c
          releaseObservedAt = $old; finished = $old }
        'result.json' = @{ outcome = 'control-hold'; payloadStarted = $false; eligibleReAsk = $true } }
      $dir = New-ChunkFolder 'fakea-easy' "$c.a1" $held
      Assert-AttemptThrows 'run folder of the chunk exists' 'a1 exists' 1
      Assert-AttemptC -ChunkId $c -Attempt 2 -CellDir 'fakea-easy'
      # a folder that merely NAMES the chunk (a different folder name) is a folder of the chunk too
      New-ChunkFolder 'fakea-easy' 'odd-name' @{ 'request.json' = @{ chunk = @{ chunkId = $c } } } | Out-Null
      Assert-AttemptThrows 'exactly its attempt 1 folder' 'two folders'
      Remove-Item "$script:RunsRoot\fakea-easy\odd-name" -Recurse -Force
      # each sign of a payload makes the hold a started run
      foreach ($sign in @('transcript.txt', 'stdout.txt', 'stderr.txt', 'ledger.json')) {
        [IO.File]::WriteAllText("$dir\$sign", 'x')
        Assert-AttemptThrows 'not an unstarted control-hold' $sign
        Remove-Item "$dir\$sign"
      }
      [IO.File]::WriteAllText("$dir\pids.jsonl", '{"role":"tee","pid":1}' + "`r`n")
      Assert-AttemptThrows 'not an unstarted control-hold' 'a tee record'
      [IO.File]::WriteAllText("$dir\pids.jsonl", '{"role":"controller","pid":1}' + "`r`n")
      Assert-AttemptC -ChunkId $c -Attempt 2 -CellDir 'fakea-easy'
      # not eligible: no ruling, no re-ask
      $held['result.json'] = @{ outcome = 'control-hold'; payloadStarted = $false; eligibleReAsk = $false }
      Write-TestFile "$dir\result.json" ($held['result.json'] | ConvertTo-Json)
      Assert-AttemptThrows 'not an eligible re-ask and no valid committed ruling' 'not eligible'
      # a payload that started (the result says so)
      Write-TestFile "$dir\result.json" (@{ outcome = 'stop'; payloadStarted = $true } | ConvertTo-Json)
      Assert-AttemptThrows 'not an unstarted control-hold' 'started'
      # eligible but under 60 s: the release is 1 s ago
      $now = (Get-Date).AddSeconds(-1).ToString($stamp)
      Write-TestFile "$dir\result.json" (@{ outcome = 'control-hold'; payloadStarted = $false
          eligibleReAsk = $true } | ConvertTo-Json)
      Write-TestFile "$dir\wrapper.json" (@{ chunkId = $c; releaseObservedAt = $now } | ConvertTo-Json)
      Assert-AttemptThrows 'needs 60 s' 'under 60 s'
    } finally { $script:ReAskWaitSeconds = $keepWait }
  }
}

Test-Case 'F3: only a committed, current ruling stands in for the eligibility and the 60 s' {
  New-World | Out-Null
  Invoke-WithFakeJournals {
    $c = 'fakea-easy.i0.n50'
    $released = (Get-Date).AddMinutes(-10)
    $dir = New-ChunkFolder 'fakea-easy' "$c.a1" @{ 'request.json' = @{ chunk = @{ chunkId = $c } }
      'wrapper.json' = @{ chunkId = $c; releaseObservedAt = $released.ToString($stamp) }
      'result.json' = @{ outcome = 'control-hold'; payloadStarted = $false; eligibleReAsk = $false } }
    $line = { param($over) New-RulingLine $c "$c.a1" $over }
    Assert-AttemptThrows 'no valid committed ruling' 'no ruling'
    # a line that exists only in the working tree is nothing: only the committed text is read
    $working = "$scratch\f3-working"
    New-Item -ItemType Directory -Force -Path "$working\tasks\difficulty-v3" | Out-Null
    [IO.File]::WriteAllText("$working\tasks\difficulty-v3\MS18d-gp-rulings.jsonl", (& $line @{}) + "`n")
    Assert-AttemptThrows 'no valid committed ruling' 'an uncommitted ruling'
    # committed, after the release of the hold and not in the future
    Set-Committed $script:RulingsRel ((& $line @{}) + "`n")
    Assert-AttemptC -ChunkId $c -Attempt 2 -CellDir 'fakea-easy'
    Assert-AttemptC -ChunkId $c -Attempt 2 -CellDir 'fakea-easy' -Base ('b' * 40)
    # stale (before the release of the hold) and prospective (in the future) are no authority
    Set-Committed $script:RulingsRel ((& $line @{ at = $released.AddMinutes(-10).ToString($stamp) }) + "`n")
    Assert-AttemptThrows 'no valid committed ruling' 'a stale ruling'
    Set-Committed $script:RulingsRel ((& $line @{ at = (Get-Date).AddHours(1).ToString($stamp) }) + "`n")
    Assert-AttemptThrows 'no valid committed ruling' 'a prospective ruling'
    Set-Committed $script:RulingsRel ((& $line @{ heldRunId = "$c.a2" }) + "`n")
    Assert-AttemptThrows 'no valid committed ruling' 'a ruling of another run'
    # malformed or contradictory journals are errors, never skipped
    foreach ($bad in @(@("{broken`n", 'ruling line 1 is not JSON'),
        @(((& $line @{ allowAttempt = 3 }) + "`n"), 'ruling line 1 is not exactly'),
        @(((& $line @{ ref = '' }) + "`n"), 'ruling line 1 is not exactly'),
        @(((& $line @{ at = 't' }) + "`n"), 'ruling line 1 is not exactly'),
        @(((& $line @{ extra = 1 }) + "`n"), 'ruling line 1 is not exactly'),
        @(((& $line @{}) + "`n" + (& $line @{ ref = 'again' }) + "`n"), 'ruling line 2 repeats'))) {
      Set-Committed $script:RulingsRel $bad[0]
      Assert-AttemptThrows $bad[1] $bad[1]
    }
    # append-only: the version committed at the campaign base must stay an exact line prefix
    Set-Committed $script:RulingsRel ((& $line @{}) + "`n")
    $script:CommittedBase[$script:RulingsRel] = (& $line @{ ref = 'rewritten' }) + "`n"
    Assert-Throws { Assert-AttemptC -ChunkId $c -Attempt 2 -CellDir 'fakea-easy' -Base ('b' * 40) } `
      'does not keep the version committed at the campaign base' 'a rewritten base line'
    $script:CommittedBase[$script:RulingsRel] = ''
    # an eligible hold needs no ruling (a stale one does not stand in the way) once the 60 s have passed
    Write-TestFile "$dir\result.json" (@{ outcome = 'control-hold'; payloadStarted = $false
        eligibleReAsk = $true } | ConvertTo-Json)
    Set-Committed $script:RulingsRel ((& $line @{ at = $released.AddMinutes(-10).ToString($stamp) }) + "`n")
    Assert-AttemptC -ChunkId $c -Attempt 2 -CellDir 'fakea-easy'
  }
}

Test-Case 'F4: the line stops after anything but a success (or the own chunk re-ask after an eligible hold)' {
  New-World | Out-Null
  $w = New-StandinWorld 'fr4'
  Invoke-InStandinWorld $w {
    $row = { param($over) Write-Row $script:LogC (Merge-Keys ([ordered]@{ schema = 'ms18d-c-run-1'
          payload = 'gp-recorder'; runId = 'x'; chunkId = 'fakea-easy.i0.n50'; attempt = 1; scope = $null
          outcome = 'success'; controllerOutcome = 'success'; eligibleReAsk = $false }) $over) }
    $open = { param($c, $a) Assert-LineOpenC -ChunkId $c -Attempt $a }
    $b = 'fakeb-easy.i0.n25'
    $a = 'fakea-easy.i0.n50'
    & $open $a 1
    & $row @{ runId = "$a.a1" }
    & $open $b 1
    Write-Row $script:LogC ([ordered]@{ schema = 'ms18d-c-run-1'; type = 'pre-window-hold'
        payload = 'gp-recorder'; chunkId = $b; attempt = 1; outcome = 'pre-window-hold' })
    Write-Row $script:LogC ([ordered]@{ schema = 'ms18d-c-run-1'; payload = 'gp-cell'; runId = 'q'
        outcome = 'gp-miss' })
    & $open $b 1
    # a stop, a plain hold or a miss blocks every further call, whichever chunk
    foreach ($o in @(@{ outcome = 'stop'; controllerOutcome = 'stop' },
        @{ outcome = 'control-hold'; controllerOutcome = 'control-hold' }, @{ outcome = 'miss' })) {
      $stopped = "$a.a1.stopped"
      & $row (@{ runId = $stopped } + $o)
      Assert-Throws { & $open $b 1 } 'the line is stopped.*run .*stopped ended with' "after $($o.outcome)"
      Assert-Throws { & $open $a 2 } 'the line is stopped' "even the same chunk after $($o.outcome)"
      # a ruling that is only in the working tree (never committed) opens nothing
      New-Item -ItemType Directory -Force -Path "$($w.repo)\tasks\difficulty-v3" | Out-Null
      [IO.File]::WriteAllText("$($w.repo)\tasks\difficulty-v3\MS18d-gp-rulings.jsonl",
        (New-RulingLine $a $stopped) + "`n")
      Assert-Throws { & $open $b 1 } 'the line is stopped' "an uncommitted ruling after $($o.outcome)"
      # a committed ruling covering that run (chunk or scope, held run) opens it again
      Set-Committed $script:RulingsRel ((New-RulingLine $a $stopped) + "`n")
      & $open $b 1
      Set-Committed $script:RulingsRel ''
      $lines = @([IO.File]::ReadAllLines($script:LogC))
      [IO.File]::WriteAllLines($script:LogC, $lines[0..($lines.Count - 2)])
    }
    # an eligible hold: only the chunk's own attempt 2 may follow
    & $row @{ runId = "$b.a1"; chunkId = $b; outcome = 'control-hold'; controllerOutcome = 'control-hold'
      eligibleReAsk = $true }
    Assert-Throws { & $open $a 1 } 'only attempt 2 of fakeb-easy.i0.n25 may follow' `
      'another chunk after an eligible hold'
    Assert-Throws { & $open $b 1 } 'only attempt 2' 'its own attempt 1 again'
    & $open $b 2
    # the re-ask succeeded: open again
    & $row @{ runId = "$b.a2"; chunkId = $b; attempt = 2 }
    & $open $a 1
    # a second hold of the same chunk is not an eligible re-ask any more
    & $row @{ runId = "$b.a2x"; chunkId = $b; attempt = 2; outcome = 'control-hold'
      controllerOutcome = 'control-hold'; eligibleReAsk = $true }
    Assert-Throws { & $open $a 1 } 'the line is stopped' 'a hold of the re-ask itself'
    # a merge that was not a success stops the line too; a ruling by scope covers it
    Write-Row $script:LogC ([ordered]@{ schema = 'ms18d-c-run-1'; payload = 'gp-merge'; runId = 'final.m1'
        scope = 'all-79'; attempt = $null; outcome = 'miss'; controllerOutcome = 'miss' })
    $rulingLines = (New-RulingLine $b "$b.a2x"), (New-RulingLine 'all-79' 'final.m1')
    Set-Committed $script:RulingsRel (($rulingLines -join "`n") + "`n")
    & $open $a 1
    # a log line that is not JSON is never skipped
    [IO.File]::AppendAllText($script:LogC, "{broken`r`n")
    Assert-Throws { & $open $a 1 } 'is not JSON' 'a corrupt C lock log'
  }
}

Test-Case 'C1 through the wrapper: a consumer hold is eligible, re-ask after 60 s, other chunks wait (F4)' {
  New-World | Out-Null
  $w = New-StandinWorld 'rr1'
  $keepWait = $script:ReAskWaitSeconds
  Invoke-InStandinWorld $w {
    $cfg = { param($fixture) [ordered]@{ fixture = $fixture; logicalCpus = 16; powershell = 'pwsh'
        probeScript = 'unused' } }
    $a = 'fakea-easy.i0.n50'
    $b = 'fakeb-easy.i0.n25'
    try {
      $script:StandinReadiness = & $cfg $w.readinessFixtures.consumer
      $first = Start-StandinRecorder $w $a
      Assert ($first.Outcome -eq 'control-hold' -and $first.Exit -eq 64) "outcome $($first.Outcome)"
      $res = Read-Json "$($first.RunDir)\result.json"
      Assert ($res.heldAt -eq 'readiness' -and $res.eligibleReAsk -eq $true -and
        -not $res.payloadStarted) 'eligible'
      $adm = Read-Json "$($first.RunDir)\admission.json"
      Assert ($adm.readiness.admitted -eq $false -and $adm.readiness.eligibleReAsk -eq $true -and
        $adm.readiness.complete -eq $true) 'the readiness record says so'
      foreach ($n in 'readiness.json', 'readiness-before.json', 'readiness-after.json') {
        Assert (Test-Path "$($first.RunDir)\$n") "kept $n"
      }
      Assert (-not (Test-Path "$($first.RunDir)\transcript.txt")) 'no payload ran'
      $row = @(Get-Ledger)[0]
      Assert ($row.eligibleReAsk -eq $true -and $row.outcome -eq 'control-hold') 'the C log row says eligible'
      Assert-Throws { Start-StandinRecorder $w $b } 'only attempt 2 of fakea-easy.i0.n50 may follow' `
        'another chunk waits'
      Assert-Throws { Start-StandinRecorder $w $a 2 } 'needs 60 s' 'the re-ask is not yet allowed'
      # the 60 s: the wrapper's own wait is shortened for the test, the controller reads the old C log
      $script:ReAskWaitSeconds = 2
      Start-Sleep -Seconds 3
      Set-LedgerOld
      $script:StandinReadiness = & $cfg $w.readinessFixtures.quiet
      $again = Start-StandinRecorder $w $a 2
      Assert ($again.Outcome -eq 'success' -and $again.Exit -eq 0) "re-ask outcome $($again.Outcome)"
      $att = Read-Json "$($again.RunDir)\attempts.json"
      Assert ($att.admissions -eq 1 -and $att.payloads -eq 0 -and $att.decision -eq 'allow') 'the accounting'
      $adm2 = Read-Json "$($again.RunDir)\admission.json"
      Assert ($adm2.readiness.admitted -eq $true -and $adm2.readiness.ready -eq $true) 'admitted'
      $next = $null
      Set-LedgerOld
      $next = Start-StandinRecorder $w $b
      Assert ($next.Outcome -eq 'success') 'the line is open again after a success'
    } finally {
      $script:StandinReadiness = $null
      $script:ReAskWaitSeconds = $keepWait
    }
  }
}

Test-Case 'C1 through the wrapper: a replaced host holds with no eligibility; a committed ruling reopens' {
  New-World | Out-Null
  $w = New-StandinWorld 'rr2'
  Invoke-InStandinWorld $w {
    $a = 'fakea-easy.i0.n50'
    $b = 'fakeb-easy.i0.n25'
    $cfg = { param($fixture) [ordered]@{ fixture = $fixture; logicalCpus = 16; powershell = 'pwsh'
        probeScript = 'unused' } }
    try {
      $script:StandinReadiness = & $cfg $w.readinessFixtures.replaced
      $first = Start-StandinRecorder $w $a
      Assert ($first.Outcome -eq 'control-hold') "outcome $($first.Outcome)"
      $res = Read-Json "$($first.RunDir)\result.json"
      Assert ($res.eligibleReAsk -eq $false -and ($res.reasons -join ' ') -match 'host:') 'not eligible'
      Assert-Throws { Start-StandinRecorder $w $b } 'the line is stopped' 'the line is stopped'
      Assert-Throws { Start-StandinRecorder $w $a 2 } 'the line is stopped' 'the same chunk, no ruling'
      # a ruling in the working tree only is nothing; the committed line (dated after the hold) reopens it
      Start-Sleep -Seconds 1
      Set-LedgerOld
      $script:StandinReadiness = & $cfg $w.readinessFixtures.quiet
      New-Item -ItemType Directory -Force -Path "$($w.repo)\tasks\difficulty-v3" | Out-Null
      [IO.File]::WriteAllText("$($w.repo)\tasks\difficulty-v3\MS18d-gp-rulings.jsonl",
        (New-RulingLine $a "$a.a1" @{ at = (Get-Date).ToString($stamp) }) + "`n")
      Assert-Throws { Start-StandinRecorder $w $a 2 } 'the line is stopped' 'an uncommitted ruling'
      $ruled = New-RulingLine $a "$a.a1" @{ ref = 'SA2 ruling after a verified rebinding'
        at = (Get-Date).ToString($stamp) }
      Set-Committed $script:RulingsRel ($ruled + "`n")
      $again = Start-StandinRecorder $w $a 2
      Assert ($again.Outcome -eq 'success') "the ruled attempt 2: $($again.Outcome)"
      $att = Read-Json "$($again.RunDir)\attempts.json"
      Assert ($att.ruling.ref -like 'SA2 ruling*' -and $att.decision -eq 'allow') 'the ruling was honoured'
    } finally { $script:StandinReadiness = $null }
  }
}

Test-Case 'C1 through the wrapper: a renamed binary is no hold; a restart or reused PID holds until rebound' {
  New-World | Out-Null
  $w = New-StandinWorld 'rr3'
  Invoke-InStandinWorld $w {
    $a = 'fakea-easy.i0.n50'
    $b = 'fakeb-easy.i0.n25'
    $cfg = { param($fixture) [ordered]@{ fixture = $fixture; logicalCpus = 16; powershell = 'pwsh'
        probeScript = 'unused' } }
    try {
      # an update renamed the running binary (ProcessName and the CIM name changed): every bound fact holds
      $script:StandinReadiness = & $cfg $w.readinessFixtures.renamed
      $first = Start-StandinRecorder $w $a
      Assert ($first.Outcome -eq 'success') "a ProcessName-only rename: $($first.Outcome)"
      $adm = Read-Json "$($first.RunDir)\admission.json"
      $b1 = $adm.readiness.binding
      Assert ($b1.bindingId -eq 'host-1' -and $b1.journal.entryCount -eq 1 -and
        $b1.evidence.verified -eq $true -and $adm.readiness.admitted) 'the binding is recorded'
      # the same PID with another creation time is another instance: a hold, never eligible, never rebound
      Set-LedgerOld
      $script:StandinReadiness = & $cfg $w.readinessFixtures.restarted
      $held = Start-StandinRecorder $w $b
      Assert ($held.Outcome -eq 'control-hold') "a restarted host: $($held.Outcome)"
      $res = Read-Json "$($held.RunDir)\result.json"
      Assert ($res.eligibleReAsk -eq $false -and $res.heldAt -eq 'readiness' -and
        ($res.reasons -join ' ') -match 'host: .*(netStartUtc|cimCreationUtc) differs') 'a replaced host'
      Assert ([string]$script:Committed[$script:HostBindingsRel] -match '"host-1"' -and
        [string]$script:Committed[$script:HostBindingsRel] -notmatch 'host-2') 'nothing rebound on its own'
      # without a committed ruling the line stays stopped, whichever chunk or attempt is asked
      Assert-Throws { Start-StandinRecorder $w $b 2 } 'the line is stopped' 'the line stays stopped'
      # the approved rebinding: the pack authors append host-2 (replacing host-1), the ruling reopens the line
      $facts = [ordered]@{ pid = 4242; parentPid = 4000; netStartUtc = '2026-01-05T00:00:00.5000000Z'
        cimCreationUtc = '2026-01-05T00:00:00.500000Z'; exePath = 'C:\fake\copilot.exe' }
      $second = New-BindingLine 'host-2' 'host-1' $facts
      $one = ([string]$script:Committed[$script:HostBindingsRel]).TrimEnd("`n")
      Set-Committed $second.File $second.Text
      Set-Committed $script:HostBindingsRel ($one + "`n" + $second.Line + "`n")
      Start-Sleep -Seconds 1
      $ruled = New-RulingLine $b "$b.a1" @{ at = (Get-Date).ToString($stamp) }
      Set-Committed $script:RulingsRel ($ruled + "`n")
      Set-LedgerOld
      $again = Start-StandinRecorder $w $b 2
      Assert ($again.Outcome -eq 'success') "the rebound host: $($again.Outcome)"
      $adm2 = Read-Json "$($again.RunDir)\admission.json"
      $b2 = $adm2.readiness.binding
      Assert ($b2.bindingId -eq 'host-2' -and $b2.journal.entryCount -eq 2 -and
        $adm2.readiness.admitted -eq $true) 'host-2 is the recorded binding'
      $att = Read-Json "$($again.RunDir)\attempts.json"
      Assert ($att.admissions -eq 1 -and $att.payloads -eq 0) 'a rebinding resets no attempt count'
    } finally { $script:StandinReadiness = $null }
  }
}

Test-Case 'R2: facts are rechecked after the watch: a stop line or a new HEAD leaves no folder' {
  New-World | Out-Null
  $w = New-StandinWorld 'r2a'
  $a = 'fakea-easy.i0.n50'
  Invoke-InStandinWorld $w {
    $git0 = $script:GitOverride
    try {
      # another call ended in a stop while this one waited for the quiet slot
      $script:WatchHook = {
        param($call, $record, $giveUp)
        Write-Row $script:LogC ([ordered]@{ schema = 'ms18d-c-run-1'; payload = 'gp-recorder'
            runId = 'other.a1'; chunkId = 'fakeb-easy.i0.n25'; attempt = 1; outcome = 'stop'
            controllerOutcome = 'stop' })
      }
      Assert-Throws { Start-StandinRecorder $w $a } 'the line is stopped.*Nothing was started' `
        'a stop line during the watch'
      Assert ($script:WatchCalls.Count -eq 1) 'the watch ran once'
      Assert (-not (Test-Path "$script:RunsRoot\fakea-easy")) 'a stop line: no run folder'
      Assert (@(Get-Ledger).Count -eq 1) 'only the stop line of the other call is in the C log'
      # a commit landed on HEAD while this call waited: the call goes back through the FULL checks before the
      # next watch (it throws only when the new HEAD is no valid campaign HEAD; see the epoch 2 tests)
      Remove-Item -LiteralPath $script:LogC
      $script:WatchCalls.Clear()
      $script:WatchHook = {
        param($call, $record, $giveUp)
        $script:GitOverride = New-FakeGit ('c' * 40) $true @() $true $script:Committed $script:CommittedBase
      }
      $moved = Start-StandinRecorder $w $a
      Assert ($moved.Outcome -eq 'success') "outcome $($moved.Outcome)"
      Assert ($script:WatchCalls.Count -eq 2) 'a new HEAD: the quiet watch was repeated'
      $kept = Read-Json "$($moved.RunDir)\wrapper.json"
      Assert ($kept.preflight.cycles -eq 2 -and $kept.preflight.repeated -eq 1 -and
        $kept.preflight.reasons[0] -match 'HEAD') 'the repeat and its reason are recorded'
    } finally {
      $script:WatchHook = $null
      $script:GitOverride = $git0
    }
  }
}

Test-Case 'R2: a watch that is no longer right before the call is repeated, within the same bound' {
  New-World | Out-Null
  $w = New-StandinWorld 'r2b'
  $a = 'fakea-easy.i0.n50'
  $keepGive = $script:WatchGiveUpSeconds
  Invoke-InStandinWorld $w {
    try {
      # the rechecks took so long that the last check of the watch is 5 s old: watch again
      $script:WatchHook = {
        param($call, $record, $giveUp)
        if ($call -eq 1) { $record.lastCheckMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 5000 }
      }
      $r = Start-StandinRecorder $w $a
      Assert ($r.Outcome -eq 'success') "outcome $($r.Outcome)"
      Assert ($script:WatchCalls.Count -eq 2) "the watch ran $($script:WatchCalls.Count) times, not twice"
      Assert ($script:WatchCalls[1].RunFolders -eq 0) 'no folder before the second watch ended'
      $kept = Read-Json "$($r.RunDir)\watch.json"
      Assert ([long]$kept.lastCheckMs -gt [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 4000) `
        'the run keeps the second, fresh watch'
      # a watch that stays stale ends in the one bound: a pre-window-hold, no folder, no admission
      Remove-Item -LiteralPath $script:LogC
      Remove-Item -LiteralPath "$script:RunsRoot\fakea-easy" -Recurse -Force
      $script:WatchCalls.Clear()
      $script:WatchGiveUpSeconds = 1
      $script:WatchHook = {
        param($call, $record, $giveUp)
        Start-Sleep -Milliseconds 300
        $record.lastCheckMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 5000
        if ($giveUp -le 0.5) { $record.gaveUp = $true }
      }
      $held = Start-StandinRecorder $w $a
      Assert ($held.Outcome -eq 'control-hold' -and $null -eq $held.RunDir) "outcome $($held.Outcome)"
      Assert ($script:WatchCalls.Count -ge 2 -and $script:WatchCalls.Count -le 4) `
        "the watch ran $($script:WatchCalls.Count) times"
      Assert (-not (Test-Path "$script:RunsRoot\fakea-easy")) 'no run folder after the give-up'
      $rows = @(Get-Ledger)
      Assert ($rows.Count -eq 1 -and $rows[0].type -eq 'pre-window-hold') 'one pre-window-hold line'
      # the hold tells the watches that were repeated and why (a stale check is no foreign lock)
      Assert ($rows[0].watchCycles -eq $script:WatchCalls.Count -and $rows[0].repeatedCycles -ge 1) `
        'the hold counts the outer watches and the repeated ones'
      Assert ($rows[0].heldAt -eq 'pre-window-recheck') 'a stale check is not blamed on a foreign lock'
      Assert ($rows[0].reasons[0] -match 'not a foreign lock' -and
        $rows[0].reasons[1] -match 'cycle 1: the cheap check ended \d+ ms after the last check') `
        'the hold gives the reason of each repeat'
      Assert ($rows[0].cycles[0].result -eq 'repeated' -and $null -ne $rows[0].cycles[0].fullChecksMs -and
        $rows[0].cycles[0].cheapCheckMs -ge 0 -and $rows[0].cycles[0].ageMs -gt 600) `
        'the hold keeps the durations of a cycle'
      Assert ($rows[0].admissions -eq $null -and @($rows[0].problems).Count -eq 0) 'no admission is claimed'
    } finally {
      $script:WatchHook = $null
      $script:WatchGiveUpSeconds = $keepGive
    }
  }
}

# ---- Epoch 2 (fix b): full checks before each watch, only the cheap invariance check after it

function New-OtherSuccessRow([string]$Name, [string]$Finished = '') {
  $row = [ordered]@{ schema = 'ms18d-c-run-1'; payload = 'gp-recorder'; runId = "$Name.a1"; chunkId = $Name
    attempt = 1; outcome = 'success' }
  if ($Finished) { $row.finished = $Finished }
  return $row
}

Test-Case 'epoch 2: the fingerprint reads the C log, the cell folder and the slot fresh and compares them' {
  New-World | Out-Null
  $cell = "$scratch\fp-cell"
  New-Item -ItemType Directory -Force -Path $cell | Out-Null
  $fp = @{ CellPath = $cell; SlotPath = "$cell\slot1"; WithHead = $false; Real = $false }
  $a = Get-TransportFingerprintC @fp
  Assert ($a.LogLength -eq -1 -and $a.Problems.Count -eq 0 -and -not $a.SlotExists) 'an empty state'
  Assert (@(Compare-TransportFingerprintC $a (Get-TransportFingerprintC @fp)).Count -eq 0) 'the same state'
  Write-Row $script:LogC (New-OtherSuccessRow 'x1')
  $b = Get-TransportFingerprintC @fp
  $d = @(Compare-TransportFingerprintC $a $b) -join ' | '
  Assert ($d -match 'C log length -1 ->' -and $d -match 'write time') "a log line: $d"
  [IO.File]::SetLastWriteTimeUtc($script:LogC, [DateTime]::UtcNow.AddMinutes(-5))
  $c = Get-TransportFingerprintC @fp
  $d = @(Compare-TransportFingerprintC $b $c)
  Assert ($d.Count -eq 1 -and $d[0] -match 'write time') 'the same length but another write time is a change'
  New-Item -ItemType Directory -Path "$cell\elsewhere" | Out-Null
  $e = Get-TransportFingerprintC @fp
  Assert (@(Compare-TransportFingerprintC $c $e) -join '' -match 'folders of the cell changed') 'a new folder'
  New-Item -ItemType Directory -Path "$cell\slot1" | Out-Null
  $f = Get-TransportFingerprintC @fp
  $moved = @(Compare-TransportFingerprintC $e $f) -join ''
  Assert ($f.SlotExists -and $moved -match 'slot folder') 'the slot'
  # invalid facts: a real run without its C log, an unreadable HEAD
  $real = @{ CellPath = $cell; SlotPath = "$cell\slot2"; WithHead = $false; Real = $true }
  $script:LogC = "$scratch\no-such-log.jsonl"
  Assert ((Get-TransportFingerprintC @real).Problems -join '' -match 'C lock log is missing') 'real, no log'
  $git0 = $script:GitOverride
  try {
    $script:GitOverride = New-FakeGit $null $true @() $true @{} @{}
    $noHead = Get-TransportFingerprintC -CellPath $cell -SlotPath "$cell\slot2" -WithHead $true -Real $false
    Assert ($noHead.Problems -join '' -match 'HEAD cannot be read') 'no HEAD'
  } finally { $script:GitOverride = $git0 }
}

Test-Case 'epoch 2: 1.5 s full checks over a large growing C log still reach the call; cheap stays cheap' {
  New-World | Out-Null
  $w = New-StandinWorld 'e2a'
  $old = Get-Stamp (Get-Date).AddHours(-3)
  $fill = {
    param([int]$count, [int]$from)
    $lines = for ($i = $from; $i -lt $from + $count; $i++) {
      (New-OtherSuccessRow "old$i" $old) | ConvertTo-Json -Compress
    }
    [IO.File]::AppendAllText($script:LogC, (($lines -join "`r`n") + "`r`n"))
  }
  Invoke-InStandinWorld $w {
    try {
      $script:LineChecksDelayMs = 1500
      & $fill 300 0
      $r1 = Start-StandinRecorder $w 'fakea-easy.i0.n50'
      Assert ($r1.Outcome -eq 'success') "outcome $($r1.Outcome)"
      Set-LedgerOld
      & $fill 2500 300
      Assert ((Get-Item -LiteralPath $script:LogC).Length -gt 200000) 'a large C log'
      $r2 = Start-StandinRecorder $w 'fakeb-easy.i0.n25'
      Assert ($r2.Outcome -eq 'success') "outcome $($r2.Outcome)"
      Assert ($script:WatchCalls.Count -eq 2) "the watch ran $($script:WatchCalls.Count) times, once per call"
      foreach ($r in @($r1, $r2)) {
        $p = (Read-Json "$($r.RunDir)\wrapper.json").preflight
        Assert ($p.cycles -eq 1 -and $p.repeated -eq 0) 'one cycle, nothing repeated'
        Assert ($p.fullChecksMs -ge 1500) "the full checks took $($p.fullChecksMs) ms"
        Assert ($p.cheapCheckMs -lt 600 -and $p.ageMs -le 600) "cheap $($p.cheapCheckMs), age $($p.ageMs) ms"
      }
    } finally { $script:LineChecksDelayMs = 0 }
  }
}

Test-Case 'epoch 2: a state changing during the full checks is taken again; one never settling refuses' {
  New-World | Out-Null
  $w = New-StandinWorld 'e2b'
  $old = Get-Stamp (Get-Date).AddHours(-3)
  Invoke-InStandinWorld $w {
    try {
      $script:LineChecksCalls = 0
      $script:LineChecksHook = {
        param($call)
        if ($call -eq 1) { Write-Row $script:LogC (New-OtherSuccessRow 'other1' $old) }
      }
      $r = Start-StandinRecorder $w 'fakea-easy.i0.n50'
      Assert ($r.Outcome -eq 'success') "outcome $($r.Outcome)"
      Assert ($script:LineChecksCalls -eq 2) "the checks ran $($script:LineChecksCalls) times, not twice"
      $p = (Read-Json "$($r.RunDir)\wrapper.json").preflight
      Assert ($p.cycles -eq 1 -and $p.unstable[0] -match 'round 1: the C log length') 'the round is recorded'
      Remove-Item -LiteralPath "$script:RunsRoot\fakea-easy" -Recurse -Force
      $script:WatchCalls.Clear()
      $script:LineChecksCalls = 0
      $script:LineChecksHook = {
        param($call)
        Write-Row $script:LogC (New-OtherSuccessRow "churn$call" $old)
      }
      Assert-Throws { Start-StandinRecorder $w 'fakea-easy.i0.n50' } `
        'kept changing during the full checks.*Nothing was started' 'a state that never settles'
      Assert ($script:WatchCalls.Count -eq 0 -and $script:LineChecksCalls -eq 3) 'three rounds, no watch'
      Assert (-not (Test-Path "$script:RunsRoot\fakea-easy")) 'no run folder'
    } finally {
      $script:LineChecksHook = $null
      $script:LineChecksCalls = 0
    }
  }
}

Test-Case 'epoch 2: a new folder is watched again; a used slot, a stop and a bad HEAD leave no folder' {
  New-World | Out-Null
  $w = New-StandinWorld 'e2c'
  Invoke-InStandinWorld $w {
    $git0 = $script:GitOverride
    try {
      # an unrelated folder in the cell during the watch: the quiet watch is repeated, the call proceeds
      $script:WatchHook = {
        param($call, $record, $giveUp)
        if ($call -eq 1) {
          New-Item -ItemType Directory -Force -Path "$script:RunsRoot\fakea-easy\elsewhere" | Out-Null
        }
      }
      $r = Start-StandinRecorder $w 'fakea-easy.i0.n50'
      Assert ($r.Outcome -eq 'success' -and $script:WatchCalls.Count -eq 2) 'a new folder: watched again'
      $p = (Read-Json "$($r.RunDir)\wrapper.json").preflight
      Assert ($p.repeated -eq 1 -and $p.reasons[0] -match 'folders of the cell changed') "reason: $p"
      # the slot of the chunk appears during the watch (another process): no folder of ours, no payload
      Set-LedgerOld
      $script:WatchCalls.Clear()
      $slotDir = "$script:RunsRoot\fakeb-easy\fakeb-easy.i0.n25.a1"
      $script:WatchHook = {
        param($call, $record, $giveUp)
        New-Item -ItemType Directory -Force -Path $slotDir | Out-Null
      }
      Assert-Throws { Start-StandinRecorder $w 'fakeb-easy.i0.n25' } 'a run folder of the chunk exists' `
        'a used slot'
      Assert ($script:WatchCalls.Count -eq 1 -and @(Get-ChildItem -LiteralPath $slotDir).Count -eq 0) `
        'the folder is not ours and holds nothing'
      # an unreadable HEAD during the watch
      Remove-Item -LiteralPath $slotDir -Recurse -Force
      $script:WatchCalls.Clear()
      $script:WatchHook = {
        param($call, $record, $giveUp)
        $script:GitOverride = New-FakeGit $null $true @() $true $script:Committed $script:CommittedBase
      }
      Assert-Throws { Start-StandinRecorder $w 'fakeb-easy.i0.n25' } `
        'HEAD cannot be read.*Nothing was started' 'an unreadable HEAD'
      Assert (-not (Test-Path $slotDir)) 'an unreadable HEAD: no folder'
      # a HEAD that is no descendant of the campaign base: the full checks of the next cycle refuse it
      $script:GitOverride = $git0
      $script:StandinHeadChecks = $true
      $script:WatchCalls.Clear()
      $script:WatchHook = {
        param($call, $record, $giveUp)
        $script:GitOverride = New-FakeGit ('c' * 40) $false @() $true $script:Committed $script:CommittedBase
      }
      Assert-Throws { Start-StandinRecorder $w 'fakeb-easy.i0.n25' } `
        'neither the campaign base .* nor a descendant' 'a HEAD that left the campaign'
      Assert ($script:WatchCalls.Count -eq 1 -and -not (Test-Path $slotDir)) 'no folder, one watch'
      # a stop line during the watch
      $script:GitOverride = $git0
      $script:StandinHeadChecks = $false
      $script:WatchCalls.Clear()
      $script:WatchHook = {
        param($call, $record, $giveUp)
        Write-Row $script:LogC ([ordered]@{ schema = 'ms18d-c-run-1'; payload = 'gp-recorder'
            runId = 'other.a1'; chunkId = 'other'; attempt = 1; outcome = 'stop' })
      }
      Assert-Throws { Start-StandinRecorder $w 'fakeb-easy.i0.n25' } 'the line is stopped' 'a stop line'
      Assert ($script:WatchCalls.Count -eq 1 -and -not (Test-Path $slotDir)) 'a stop: no folder, one watch'
    } finally {
      $script:WatchHook = $null
      $script:StandinHeadChecks = $false
      $script:GitOverride = $git0
    }
  }
}

Test-Case 'epoch 2: the release constraint is recomputed from the log for every watch' {
  New-World | Out-Null
  $w = New-StandinWorld 'e2g'
  Invoke-InStandinWorld $w {
    try {
      $script:WatchHook = {
        param($call, $record, $giveUp)
        if ($call -eq 1) {
          Write-Row $script:LogC (New-OtherSuccessRow 'other1' (Get-Stamp (Get-Date)))
        }
      }
      # the controller may hold the run on the fresh release (its own 15 s rule): the outcome is not the point
      try { Start-StandinRecorder $w 'fakea-easy.i0.n50' | Out-Null } catch { }
      Assert ($script:WatchCalls.Count -eq 2) 'the changed log repeated the watch'
      $first = [long]$script:WatchCalls[0].NotBeforeMs
      $second = [long]$script:WatchCalls[1].NotBeforeMs
      Assert ($second -gt $first + 14000) "not-before $first -> $second (the new release plus 15.3 s)"
    } finally { $script:WatchHook = $null }
  }
}

Test-Case 'epoch 2: the one bound holds when every check is slow: a hold, no folder, no late call' {
  New-World | Out-Null
  $w = New-StandinWorld 'e2e'
  $keepGive = $script:WatchGiveUpSeconds
  Invoke-InStandinWorld $w {
    try {
      $script:WatchGiveUpSeconds = 2
      $script:LineChecksDelayMs = 700
      $script:WatchHook = {
        param($call, $record, $giveUp)
        Start-Sleep -Milliseconds 100
        $record.lastCheckMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 5000
        if ($giveUp -le 0.5) { $record.gaveUp = $true }
      }
      $clock = [Diagnostics.Stopwatch]::StartNew()
      $held = Start-StandinRecorder $w 'fakea-easy.i0.n50'
      $took = $clock.ElapsedMilliseconds
      Assert ($held.Outcome -eq 'control-hold' -and $null -eq $held.RunDir) "outcome $($held.Outcome)"
      Assert ($took -lt 7000) "the bound of 2 s was kept: $took ms"
      $row = @(Get-Ledger)[0]
      Assert ($row.type -eq 'pre-window-hold' -and $row.watchCycles -ge 2 -and $row.watchCycles -le 4) `
        "cycles $($row.watchCycles)"
      Assert ($row.cycles[0].fullChecksMs -ge 700) 'the slow full checks are recorded'
      Assert (-not (Test-Path "$script:RunsRoot\fakea-easy")) 'no run folder'
    } finally {
      $script:WatchHook = $null
      $script:LineChecksDelayMs = 0
      $script:WatchGiveUpSeconds = $keepGive
    }
  }
}

Test-Case 'epoch 2: the 600 ms, 1,000 ms and 1,200 s boundaries are unchanged' {
  Assert ($script:WatchFreshMs -eq 600) 'the cheap budget after the watch is 600 ms'
  Assert ($script:WatchGiveUpSeconds -eq 1200) 'the single bound is 1,200 s'
  Assert ($script:GapSeconds -eq 15 -and $script:GapMarginSeconds -eq 0.3) 'the window is 15.3 s'
  $acq = [IO.File]::ReadAllText("$tools\acquisition.js")
  Assert ($acq -match 'WATCH_LAST_CHECK_MAX_AGE_MS\s*=\s*1000') 'acquisition.js allows 1,000 ms'
  New-World | Out-Null
  $w = New-StandinWorld 'e2f'
  Invoke-InStandinWorld $w {
    try {
      # 450 ms old at the end of the watch (its window shifted with it): fresh enough, one cycle
      $script:WatchHook = {
        param($call, $record, $giveUp)
        $last = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 450
        $record.lastCheckMs = $last
        $record.startedAtMs = $last - 15400
        $record.firstCheckMs = $last - 15400
      }
      $r = Start-StandinRecorder $w 'fakea-easy.i0.n50'
      Assert ($r.Outcome -eq 'success' -and $script:WatchCalls.Count -eq 1) 'a 450 ms watch is fresh'
      Set-LedgerOld
      # 900 ms old: not fresh, the watch is repeated, never refreshed
      $script:WatchCalls.Clear()
      $script:WatchHook = {
        param($call, $record, $giveUp)
        if ($call -eq 1) { $record.lastCheckMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 900 }
      }
      $r2 = Start-StandinRecorder $w 'fakeb-easy.i0.n25'
      Assert ($r2.Outcome -eq 'success' -and $script:WatchCalls.Count -eq 2) 'a 900 ms watch is repeated'
      $kept = Read-Json "$($r2.RunDir)\watch.json"
      Assert ([long]$kept.lastCheckMs -gt [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 4000) `
        'the run keeps the second watch, not the first'
    } finally { $script:WatchHook = $null }
  }
}

Test-Case 'the real Phase A, B and C logs and the real GP outputs were never written by the wrapper' {
  Assert ((Get-FileHash -LiteralPath $realLogA).Hash -eq $realHashA) 'the Phase A lock log is unchanged'
  Assert ((Get-FileHash -LiteralPath $realLogB).Hash -eq $realHashB) 'the Phase B lock log is unchanged'
  Assert ((Get-FileHash -LiteralPath $realLogC).Hash -eq $realHashC) 'the Phase C lock log is unchanged'
  Assert ((Get-TreeState $realGp) -eq $realGpState) 'the real GP outputs are unchanged'
}

foreach ($p in $script:started) {
  try { if (-not $p.HasExited) { $p.Kill() } } catch { }
}
Write-Host "$script:passed passed, $($script:failed.Count) failed"
if ($script:failed.Count -gt 0) { Write-Host ('FAILED: ' + ($script:failed -join ' | ')); exit 1 }
exit 0
