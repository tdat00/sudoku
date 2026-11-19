# MS18d Phase C0 task-owned tests of owned-processes.ps1 (G5, the orphan barrier): the pure decision on
# synthetic process tables (a PID reused by another process, unknown liveness, descendants of a dead
# parent, the processes that are never touched) and the real thing on short-lived STAND-INS (fake-gp.js): a
# command and a grandchild stopped through verified handles, an unrelated process left alone. Run through
# the node launcher (it gives this script an isolated TEMP, and puts it under the shared lock):
#   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/run-ps-test.js <this file>
$ErrorActionPreference = 'Stop'
$scratch = $env:MS18D_SCRATCH
if (-not $scratch -or $env:TEMP -ne $scratch) { throw 'run this through run-ps-test.js (isolated TEMP)' }
Set-Location 'Q:\git\sudoku\generator'
$tools = 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS18d\phase-c'
. "$tools\owned-processes.ps1"
$fake = "$tools\fake-gp.js"
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
function PidList($items) { (@($items | ForEach-Object Pid) | Sort-Object) -join ',' }

# A short-lived stand-in process (node), tracked so that it is stopped at the end whatever happens.
function Start-Node([string[]]$NodeArgs, [hashtable]$Environment = @{}) {
  $si = [Diagnostics.ProcessStartInfo]::new('node')
  $si.UseShellExecute = $false
  $si.CreateNoWindow = $true
  $si.RedirectStandardOutput = $true
  $si.RedirectStandardError = $true
  foreach ($a in $NodeArgs) { $si.ArgumentList.Add($a) }
  foreach ($k in $Environment.Keys) { $si.Environment[$k] = [string]$Environment[$k] }
  $before = NowMs
  $p = [Diagnostics.Process]::Start($si)
  $after = NowMs
  $script:started.Add($p)
  return [pscustomobject]@{ Process = $p; Pid = $p.Id; BeforeMs = $before; AfterMs = $after }
}
function Start-Fake([string]$Mode, [string]$PidFile) {
  return Start-Node @($fake, '--variant=classic4', '--level=veryEasy') @{
    FAKE_GP_MODE = $Mode; FAKE_PIDFILE = $PidFile; FAKE_GP_TARGET_MS = 100 }
}
function Wait-Until([scriptblock]$Condition, [string]$What, [int]$Seconds = 15) {
  $until = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $until) {
    if (& $Condition) { return }
    Start-Sleep -Milliseconds 100
  }
  throw "timed out waiting for $What"
}
function PidsOf([string]$File) {
  $map = @{}
  if (Test-Path $File) {
    foreach ($l in [IO.File]::ReadAllLines($File)) {
      if ($l.Trim() -eq '') { continue }
      $parts = $l.Split(' ')
      $map[$parts[0]] = [int]$parts[1]
    }
  }
  return $map
}
function IsAlive([int]$ProcessId) { return [bool](Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) }
function Add-Record([string]$File, $Object) {
  [IO.File]::AppendAllText($File, (($Object | ConvertTo-Json -Compress) + "`r`n"))
}
function Spawn-Window($info, [string]$Role, [int]$Parent = $PID) {
  return [ordered]@{ role = $Role; pid = $info.Pid; ppid = $Parent; beforeMs = $info.BeforeMs
    afterMs = $info.AfterMs }
}
function New-Records([string]$Name) {
  $file = Join-Path $scratch "$Name.jsonl"
  if (Test-Path $file) { Remove-Item $file }
  return $file
}
function Exit-Event([long]$At) {
  return [ordered]@{ event = 'command-exit'; atMs = $At; code = 0; signal = $null }
}

# ---- pure decisions on synthetic process tables ------------------------------------------------------------

$T = 1800000000000
function Snap($processes, [bool]$Ok = $true) {
  return [pscustomobject]@{ Ok = $Ok; Error = $(if ($Ok) { $null } else { 'simulated failure' })
    Processes = @($processes) }
}
function Proc([int]$ProcId, [int]$Ppid, $Created, [string]$Name = 'node.exe') {
  return [pscustomobject]@{ Pid = $ProcId; Ppid = $Ppid; CreatedMs = $Created; Name = $Name }
}
function Recs($roots, $events = @(), $problems = @()) {
  return [pscustomobject]@{ Roots = @($roots); Events = @($events); Problems = @($problems) }
}
function Root([string]$Role, [int]$ProcId, $Before, $After) {
  return [pscustomobject]@{ role = $Role; pid = $ProcId; beforeMs = $Before; afterMs = $After }
}
function Resolve([object]$Records, [object]$Snapshot, [switch]$IncludeController) {
  return Resolve-OwnedProcesses -Records $Records -Snapshot $Snapshot -SelfPid 50 `
    -IncludeController:$IncludeController
}
$exitEvent = [pscustomobject]@{ event = 'command-exit'; atMs = ($T + 5000); code = 0; signal = $null }
$self = Proc 50 4 ($T - 9)
$cmdRoot = Root 'command' 101 ($T + 10) ($T + 20)

Test-Case 'pure: everything recorded is gone: no survivor, nothing unknown' {
  $records = Recs @((Root 'tee' 100 $T ($T + 5)), $cmdRoot) @($exitEvent)
  $r = Resolve $records (Snap @((Proc 4 0 0 'System'), (Proc 50 4 ($T - 99999))))
  Assert ($r.Survivors.Count -eq 0 -and -not $r.Ambiguous) "survivors $($r.Survivors.Count)"
  Assert (($r.Roots | Where-Object State -EQ 'absent').Count -eq 2) 'both absent'
}

Test-Case 'pure: a live process created inside the spawn window is the recorded instance: a survivor' {
  $r = Resolve (Recs @($cmdRoot)) (Snap @((Proc 101 100 ($T + 15)), $self))
  Assert ($r.Survivors.Count -eq 1 -and $r.Survivors[0].Pid -eq 101) 'the command'
  Assert (-not $r.Ambiguous) 'not ambiguous'
}

Test-Case 'pure: the window has a tolerance of 1 s and no more' {
  $in = Resolve (Recs @($cmdRoot)) (Snap @((Proc 101 100 ($T + 1019)), $self))
  Assert ($in.Survivors.Count -eq 1) 'created 999 ms after the window'
  $out = Resolve (Recs @($cmdRoot)) (Snap @((Proc 101 100 ($T + 1021)), $self))
  Assert ($out.Survivors.Count -eq 0 -and $out.Ambiguous) '1001 ms after the window: unproved'
}

Test-Case 'pure: descendants of a live command are survivors, and so are those of a dead one' {
  $table = Snap @((Proc 101 100 ($T + 15)), (Proc 102 101 ($T + 30)), (Proc 103 102 ($T + 40)), $self)
  $live = Resolve (Recs @($cmdRoot)) $table
  Assert ((PidList $live.Survivors) -eq '101,102,103') 'the command, its child and its grandchild'
  $orphans = Snap @((Proc 102 101 ($T + 30)), (Proc 103 102 ($T + 40)), $self)
  $dead = Resolve (Recs @($cmdRoot) @($exitEvent)) $orphans
  Assert ((PidList $dead.Survivors) -eq '102,103') 'the orphans of the dead command'
  Assert (-not $dead.Ambiguous) 'not ambiguous'
}

Test-Case 'pure: a child of the dead pid created before the command is not ours' {
  $r = Resolve (Recs @($cmdRoot) @($exitEvent)) (Snap @((Proc 102 101 ($T - 60000)), $self))
  Assert ($r.Survivors.Count -eq 0) 'a child created before the window belongs to an earlier holder'
}

Test-Case 'pure: a child created after the command ended belongs to a later holder of the pid' {
  $table = Snap @((Proc 101 4 ($T + 60000)), (Proc 102 101 ($T + 70000)), $self)
  $r = Resolve (Recs @($cmdRoot) @($exitEvent)) $table
  Assert ($r.Survivors.Count -eq 0 -and -not $r.Ambiguous) 'pid 101 is reused after the proved exit: clean'
  Assert (($r.Roots | Where-Object Pid -EQ 101).State -eq 'pid-reused') 'the state says pid-reused'
}

Test-Case 'pure: a reused pid with NO proof that the recorded process ended is unknown, never a kill' {
  $table = Snap @((Proc 101 4 ($T + 60000)), (Proc 102 101 ($T + 70000)), $self)
  $r = Resolve (Recs @($cmdRoot)) $table
  Assert ($r.Ambiguous) 'ambiguous'
  Assert ($r.Survivors.Count -eq 0) 'nothing is claimed as ours'
  Assert (($r.Problems -join ' ') -match 'nothing proves the recorded one ended') 'the reason is told'
}

Test-Case 'pure: no usable table, an unusable or unknown record, an unknown creation time: unknown' {
  $none = Resolve (Recs @((Root 'command' 101 $T ($T + 1)))) (Snap @() $false)
  Assert ($none.Ambiguous -and $none.Survivors.Count -eq 0) 'no table'
  $bad = Resolve (Recs @((Root 'command' 101 ($T + 9) $T))) (Snap @($self))
  Assert ($bad.Ambiguous) 'before after after'
  $text = Resolve (Recs @((Root 'command' 101 'x' 'y'))) (Snap @($self))
  Assert ($text.Ambiguous) 'not numbers'
  $nocreate = Resolve (Recs @((Root 'command' 101 $T ($T + 1)))) (Snap @((Proc 101 4 $null), $self))
  Assert ($nocreate.Ambiguous -and $nocreate.Survivors.Count -eq 0) 'a process with no creation time'
  $problem = Resolve (Recs @() @() @('pids line 3: not JSON')) (Snap @($self))
  Assert ($problem.Problems.Count -eq 1) 'a record problem is carried'
}

Test-Case 'pure: the wrapper role is ignored, the controller only when asked, itself never' {
  $roots = @((Root 'wrapper' 60 $T ($T + 1)), (Root 'controller' 61 $T ($T + 1)),
    (Root 'command' 62 $T ($T + 1)), (Root 'tee' 50 $T ($T + 1)))
  $snap = Snap @((Proc 60 4 $T), (Proc 61 60 $T), (Proc 62 61 $T), (Proc 50 62 ($T - 5)))
  $without = Resolve (Recs $roots) $snap
  Assert ((@($without.Survivors | ForEach-Object Pid)) -notcontains 60) 'wrapper'
  Assert ((@($without.Survivors | ForEach-Object Pid)) -notcontains 61) 'controller skipped'
  $with = Resolve (Recs $roots) $snap -IncludeController
  Assert ((@($with.Survivors | ForEach-Object Pid)) -notcontains 61) 'an ancestor of this process: protected'
  Assert (($with.Roots | Where-Object Pid -EQ 61).State -eq 'protected') 'protected'
  Assert (($with.Roots | Where-Object Pid -EQ 50).State -eq 'protected') 'self'
}

Test-Case 'pure: the protected pids are the process and every ancestor of it in the table' {
  $chain = Snap @((Proc 10 0 1), (Proc 20 10 2), (Proc 30 20 3), (Proc 40 30 4))
  $p = Get-ProtectedPids -Snapshot $chain -SelfPid 40
  Assert ((($p | Sort-Object) -join ',') -eq '10,20,30,40') ($p -join ',')
  $q = Get-ProtectedPids -Snapshot (Snap @((Proc 10 20 1), (Proc 20 10 2))) -SelfPid 10
  Assert ($q.Count -le 3) 'a cycle in the table ends'
}

# ---- the real thing on stand-ins ------------------------------------------------------------------------

Test-Case 'real: a live command and its grandchild are stopped through verified handles; a bystander lives' {
  $bystander = Start-Node @('-e', 'setInterval(()=>{},1000)')
  $pidFile = Join-Path $scratch 'r1-pids.txt'
  $cmd = Start-Fake 'hang-grand' $pidFile
  Wait-Until { $m = PidsOf $pidFile; $m.ContainsKey('grandchild') -and $m.ContainsKey('command') } 'both'
  $grand = (PidsOf $pidFile)['grandchild']
  $records = New-Records 'r1'
  Add-Record $records (Spawn-Window $cmd 'command')
  $result = Invoke-OwnedBarrier -RecordsFile $records -ConfirmSeconds 10
  Assert ($result.verdict -eq 'stopped-owned') "verdict $($result.verdict): $($result.problems -join '; ')"
  Assert ($result.survivors.Count -eq 2) "survivors $($result.survivors.Count)"
  Assert (@($result.stops | Where-Object outcome -EQ 'stopped').Count -eq 2) 'both stopped, verified'
  Assert ($result.confirmedGone) 'a fresh snapshot confirms'
  Assert (-not (IsAlive $cmd.Pid) -and -not (IsAlive $grand)) 'the command and the grandchild are gone'
  Assert (IsAlive $bystander.Pid) 'the unrelated process is alive'
}

Test-Case 'real: a command that exited by itself leaves a clean barrier and nothing is stopped' {
  $cmd = Start-Fake 'ok' (Join-Path $scratch 'r2-pids.txt')
  $null = $cmd.Process.WaitForExit(10000)
  $records = New-Records 'r2'
  Add-Record $records (Spawn-Window $cmd 'command')
  Add-Record $records (Exit-Event (NowMs))
  $result = Invoke-OwnedBarrier -RecordsFile $records
  Assert ($result.verdict -eq 'clean') "verdict $($result.verdict)"
  Assert ($result.stops.Count -eq 0 -and $result.survivors.Count -eq 0) 'nothing to stop'
}

Test-Case 'real: the command exited but its grandchild lives on: found by the stale parent pid, stopped' {
  $pidFile = Join-Path $scratch 'r3-pids.txt'
  $cmd = Start-Fake 'survive' $pidFile
  $null = $cmd.Process.WaitForExit(10000)
  Wait-Until { (PidsOf $pidFile).ContainsKey('grandchild') } 'the grandchild'
  $grand = (PidsOf $pidFile)['grandchild']
  Assert (IsAlive $grand) 'the grandchild outlived the command'
  $records = New-Records 'r3'
  Add-Record $records (Spawn-Window $cmd 'command')
  Add-Record $records (Exit-Event (NowMs))
  $result = Invoke-OwnedBarrier -RecordsFile $records
  Assert ($result.verdict -eq 'stopped-owned') "verdict $($result.verdict): $($result.problems -join '; ')"
  Assert ($result.survivors.Count -eq 1 -and $result.survivors[0].Pid -eq $grand) 'only the grandchild'
  Assert (-not (IsAlive $grand)) 'stopped'
}

Test-Case 'real: the tee died first (its pid is gone), the command still runs: it has its own record' {
  $pidFile = Join-Path $scratch 'r4-pids.txt'
  $dead = Start-Node @('-e', '0')
  $null = $dead.Process.WaitForExit(10000)
  $cmd = Start-Fake 'hang' $pidFile
  Wait-Until { (PidsOf $pidFile).ContainsKey('command') } 'the command'
  $records = New-Records 'r4'
  Add-Record $records (Spawn-Window $dead 'tee')
  Add-Record $records (Spawn-Window $cmd 'command' $dead.Pid)
  $result = Invoke-OwnedBarrier -RecordsFile $records
  Assert ($result.verdict -eq 'stopped-owned') "verdict $($result.verdict): $($result.problems -join '; ')"
  Assert (($result.roots | Where-Object Role -EQ 'tee').State -eq 'absent') 'the tee is absent'
  Assert (-not (IsAlive $cmd.Pid)) 'the command is stopped'
}

Test-Case 'real: a recorded pid now held by an unrelated process is never touched (reuse)' {
  $other = Start-Node @('-e', 'setInterval(()=>{},1000)')
  $records = New-Records 'r5a'
  $old = [ordered]@{ role = 'command'; pid = $other.Pid; ppid = $PID; beforeMs = ((NowMs) - 3600000)
    afterMs = ((NowMs) - 3599000) }
  Add-Record $records $old
  $unknown = Invoke-OwnedBarrier -RecordsFile $records
  Assert ($unknown.verdict -eq 'hold-unknown') "verdict $($unknown.verdict)"
  Assert ($unknown.stops.Count -eq 0 -and $unknown.survivors.Count -eq 0) 'nothing stopped, none claimed'
  Assert (IsAlive $other.Pid) 'the unrelated process is alive'
  $records2 = New-Records 'r5b'
  Add-Record $records2 $old
  Add-Record $records2 (Exit-Event ((NowMs) - 3500000))
  $proved = Invoke-OwnedBarrier -RecordsFile $records2
  Assert ($proved.verdict -eq 'clean') "verdict $($proved.verdict): $($proved.problems -join '; ')"
  Assert (IsAlive $other.Pid) 'still alive'
}

Test-Case 'real: the controller record is stopped only when the wrapper asks for it' {
  $ctl = Start-Node @('-e', 'setInterval(()=>{},1000)')
  $records = New-Records 'r6'
  Add-Record $records (Spawn-Window $ctl 'controller')
  $skipped = Invoke-OwnedBarrier -RecordsFile $records
  Assert ($skipped.verdict -eq 'clean' -and (IsAlive $ctl.Pid)) 'the controller barrier spares the controller'
  $asked = Invoke-OwnedBarrier -RecordsFile $records -IncludeController
  Assert ($asked.verdict -eq 'stopped-owned' -and -not (IsAlive $ctl.Pid)) "verdict $($asked.verdict)"
}

Test-Case 'real: a process of the wrong creation time is not stopped by the verified stop' {
  $p = Start-Node @('-e', 'setInterval(()=>{},1000)')
  Start-Sleep -Milliseconds 300
  $created = [DateTimeOffset]::new($p.Process.StartTime).ToUnixTimeMilliseconds()
  $wrong = [pscustomobject]@{ Pid = $p.Pid; CreatedMs = ($created - 10000); Name = 'node.exe'; Why = 'test' }
  $r = @(Stop-VerifiedProcesses -Survivors @($wrong))
  Assert ($r[0].outcome -eq 'identity-changed-not-stopped') "outcome $($r[0].outcome)"
  Assert (IsAlive $p.Pid) 'still alive'
  $right = [pscustomobject]@{ Pid = $p.Pid; CreatedMs = $created; Name = 'node.exe'; Why = 'test' }
  $s = @(Stop-VerifiedProcesses -Survivors @($right))
  Assert ($s[0].outcome -eq 'stopped' -and -not (IsAlive $p.Pid)) "outcome $($s[0].outcome)"
  $nobody = [pscustomobject]@{ Pid = 99999999; CreatedMs = 1; Name = 'x'; Why = 'test' }
  $gone = @(Stop-VerifiedProcesses -Survivors @($nobody))
  Assert ($gone[0].outcome -eq 'gone-before-stop') 'a pid that does not exist'
}

Test-Case 'real: a protected process (this one, or an ancestor) is recorded and never stopped' {
  $records = New-Records 'r8'
  $parent = (Get-CimInstance Win32_Process -Filter "ProcessId=$PID").ParentProcessId
  $now = NowMs
  Add-Record $records ([ordered]@{ role = 'command'; pid = $PID; ppid = $parent; beforeMs = ($now - 600000)
    afterMs = ($now + 600000) })
  Add-Record $records ([ordered]@{ role = 'tee'; pid = $parent; ppid = 1; beforeMs = ($now - 600000)
    afterMs = ($now + 600000) })
  $r = Invoke-OwnedBarrier -RecordsFile $records
  Assert ($r.verdict -eq 'clean' -and $r.stops.Count -eq 0) "verdict $($r.verdict)"
  Assert (@($r.roots | Where-Object State -EQ 'protected').Count -eq 2) 'both protected'
}

Test-Case 'real: a missing or malformed records file is unknown liveness' {
  $missing = Invoke-OwnedBarrier -RecordsFile (Join-Path $scratch 'no-such.jsonl')
  Assert ($missing.verdict -eq 'hold-unknown') "missing: $($missing.verdict)"
  $file = New-Records 'r9'
  [IO.File]::WriteAllText($file, "{bad`r`n")
  $bad = Invoke-OwnedBarrier -RecordsFile $file
  Assert ($bad.verdict -eq 'hold-unknown') "malformed: $($bad.verdict)"
  Assert (($bad.problems -join ' ') -match 'not JSON') 'the reason is told'
}

# ---- the script interface ---------------------------------------------------------------------------------

function Invoke-Script([string[]]$Arguments) {
  $out = & pwsh -NoProfile -NonInteractive -File "$tools\owned-processes.ps1" @Arguments 2>&1
  return [pscustomobject]@{ Exit = $LASTEXITCODE; Output = ($out -join "`n") }
}
function Barrier-Args([string]$Records, [string]$Out, [string]$Table = '') {
  $a = @('-Action', 'barrier', '-RecordsFile', $Records, '-OutFile', $Out)
  if ($Table) { $a += @('-SnapshotFile', $Table) }
  return $a
}

Test-Case 'script: the exit code is the verdict (0 clean); the cleanup record is created once only' {
  $records = New-Records 's1'
  [IO.File]::WriteAllText($records, '')
  $outFile = Join-Path $scratch 's1-cleanup.json'
  $r = Invoke-Script (Barrier-Args $records $outFile)
  Assert ($r.Exit -eq 0) "exit $($r.Exit): $($r.Output)"
  $json = Get-Content $outFile -Raw | ConvertFrom-Json
  Assert ($json.verdict -eq 'clean' -and $json.schema -eq 'ms18d-c-cleanup-1' -and $json.snapshotOk) 'record'
  Assert ((Get-Content $outFile -Raw) -notmatch "[^`r]`n") 'CRLF only'
  $before = (Get-FileHash $outFile).Hash
  $again = Invoke-Script (Barrier-Args $records $outFile)
  Assert ($again.Exit -eq 2 -and $again.Output -match 'never overwritten') "exit $($again.Exit)"
  Assert ((Get-FileHash $outFile).Hash -eq $before) 'unchanged'
  Assert ((Invoke-Script @('-Action', 'nope')).Exit -eq 2) 'unknown action'
  Assert ((Invoke-Script @('-Action', 'barrier')).Exit -eq 2) 'usage'
  $snap = Invoke-Script @('-Action', 'snapshot')
  Assert ($snap.Exit -eq 0 -and ($snap.Output | ConvertFrom-Json).Ok) 'the snapshot action'
}

Test-Case 'script: a simulated process table never stops anything: survivor 21, unknown liveness 20' {
  $pidFile = Join-Path $scratch 's2-pids.txt'
  $cmd = Start-Fake 'hang' $pidFile
  Wait-Until { (PidsOf $pidFile).ContainsKey('command') } 'the command'
  $records = New-Records 's2'
  Add-Record $records (Spawn-Window $cmd 'command')
  $created = [DateTimeOffset]::new($cmd.Process.StartTime).ToUnixTimeMilliseconds()
  $live = Join-Path $scratch 's2-live.json'
  $liveRow = [ordered]@{ pid = $cmd.Pid; ppid = $PID; createdMs = $created; name = 'node.exe' }
  $liveJson = [ordered]@{ ok = $true; processes = @($liveRow) } | ConvertTo-Json -Depth 4
  $liveJson | Set-Content -LiteralPath $live
  $r = Invoke-Script (Barrier-Args $records (Join-Path $scratch 's2a.json') $live)
  Assert ($r.Exit -eq 21) "survivor exit $($r.Exit)"
  $recorded = Get-Content (Join-Path $scratch 's2a.json') -Raw | ConvertFrom-Json
  Assert ($recorded.simulated) 'marked simulated'
  Assert (IsAlive $cmd.Pid) 'a simulated table stops nothing'
  $failed = Join-Path $scratch 's2-failed.json'
  ([ordered]@{ ok = $false; processes = @() } | ConvertTo-Json) | Set-Content -LiteralPath $failed
  $u = Invoke-Script (Barrier-Args $records (Join-Path $scratch 's2b.json') $failed)
  Assert ($u.Exit -eq 20) "unknown exit $($u.Exit)"
  $reuse = Join-Path $scratch 's2-reuse.json'
  $reuseRow = [ordered]@{ pid = $cmd.Pid; ppid = 4; createdMs = ($created + 3600000); name = 'other.exe' }
  ([ordered]@{ ok = $true; processes = @($reuseRow) } | ConvertTo-Json -Depth 4) |
    Set-Content -LiteralPath $reuse
  $x = Invoke-Script (Barrier-Args $records (Join-Path $scratch 's2c.json') $reuse)
  Assert ($x.Exit -eq 20) "reuse exit $($x.Exit)"
  Assert (IsAlive $cmd.Pid) 'still alive'
}

# ---- end ------------------------------------------------------------------------------------------------

foreach ($p in $script:started) {
  try { if (-not $p.HasExited) { $p.Kill() } } catch { }
}
Write-Host "$script:passed passed, $($script:failed.Count) failed"
if ($script:failed.Count -gt 0) { Write-Host ('FAILED: ' + ($script:failed -join ' | ')); exit 1 }
exit 0
