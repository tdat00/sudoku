# MS18c Stage 3 task-owned PROOF HARNESS for the Job Object containment (proof 1) and the read/write
# resilience of the supervision (B1). Every stand-in has a PRIVATE lock: nothing here touches the real
# dv3-sudoku.lock. Each scenario starts the stand-in supervisor (standin-supervisor.ps1, the same library
# as the real supervisor) SUSPENDED inside an OUTER kill-on-close Job Object of this harness (so the
# supervisor's own job is nested in it, as it is nested in the CLI host's job), then watches the tree and
# checks what the brief requires: every owned process (launcher, Node parent, the 4 forked Node children,
# Node's own child jobs) is a member of the supervisor's job and is gone after
#   normal / normal-ps51   the stand-in completes by itself (PowerShell 7 and Windows PowerShell 5.1);
#   t-expiry         the supervisor's wall-clock T is reached (it terminates only its own job);
#   supervisor-loss  the supervisor process is killed (Stop-Process -Id <that pid> -Force);
#   full-chain       the REAL gq-launch.cjs (readiness, creation-boundary R, transcripts);
#   beat-fault       the heartbeat callback throws on every beat: the window must still end normally;
#   held-readers     a reader holds status.json, supervisor.log and events.jsonl for the whole run, and
#                    journal.jsonl for its first 13 s, with FileShare.Read: the window must complete, the
#                    launch intent and the creation must be journalled, and the post-run must still happen;
#   status-reader    status-gq.ps1 reads the run again and again while it runs: it must never block it.
# Nothing is generated and no qualifier runs. Output: <Root>\proof-job-results.json.
param(
  [string]$Root = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS18c\standin-s3b',
  [string[]]$Scenarios = @('normal', 'normal-ps51', 't-expiry', 'supervisor-loss', 'full-chain',
    'beat-fault', 'held-readers', 'status-reader')
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'gq-common.ps1')
Add-GqNative
$pwshExe = (Get-Process -Id $PID).Path
$ps51Exe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$standIn = Join-Path $PSScriptRoot 'standin-supervisor.ps1'
$statusScript = Join-Path $PSScriptRoot 'status-gq.ps1'
$environment = Get-GqLauncherEnvironment
New-Item -ItemType Directory -Force -Path $Root | Out-Null

function Get-Numbers([string]$Text, [string]$Pattern) {
  $m = [regex]::Match([string]$Text, $Pattern)
  if (-not $m.Success) { return @() }
  @([regex]::Matches($m.Groups[1].Value, '\d+') | ForEach-Object { [int]$_.Value })
}

function Get-Members([string]$Dir) {
  Get-Numbers (Read-GqSharedText (Join-Path $Dir 'status.json')) '"members":\s*\[([^\]]*)\]'
}

function Get-FileMembers([string]$Dir) {
  $parent = Read-GqSharedText (Join-Path $Dir 'members.json')
  $ids = @(Get-Numbers $parent '"parent":(\d+)')
  $ids += @(Get-Numbers $parent '"children":\[([^\]]*)\]')
  $ids += @(Get-Numbers (Read-GqSharedText (Join-Path $Dir 'result.json')) '"members":\s*\[([^\]]*)\]')
  @($ids | Sort-Object -Unique)
}

function Invoke-Scenario {
  param([string]$Name, [string]$Shell, [string]$Mode, [double]$RunSeconds, [double]$TSeconds,
    [bool]$KillSupervisor = $false, [string[]]$Options = @())
  $dir = Join-Path $Root $Name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $holds = New-Object Collections.Generic.List[object]
  $journalHold = $null
  $journalReleasedAt = $null
  if ($Options -contains 'hold') {
    foreach ($f in 'status.json', 'supervisor.log', 'events.jsonl', 'journal.jsonl') {
      $path = Join-Path $dir $f
      [IO.File]::WriteAllText($path, '')
      $s = New-Object IO.FileStream($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
      if ($f -eq 'journal.jsonl') { $journalHold = $s } else { $holds.Add($s) }
    }
  }
  $outer = [GqNative]::CreateKillOnCloseJob()
  $cmd = '{0} -NoProfile -File {1} -Dir {2} -Name {3} -Scenario {4} -RunSeconds {5} -TSeconds {6} ' +
    '-Children 4 -HeartbeatSeconds 1'
  $line = $cmd -f (ConvertTo-GqArgument $Shell), (ConvertTo-GqArgument $standIn),
    (ConvertTo-GqArgument $dir), $Name, $Mode, $RunSeconds, $TSeconds
  if ($Options -contains 'beat-fault') { $line += ' -BeatFault' }
  $launch = [GqNative]::CreateSuspended($Shell, $line, $PSScriptRoot, $environment.pairs,
    (Join-Path $dir 'supervisor-stdout.txt'), (Join-Path $dir 'supervisor-stderr.txt'))
  [GqNative]::AssignToJob($outer, $launch)
  [GqNative]::Resume($launch)
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $starts = @{}
  $names = @{}
  $nested = @{}
  $killedAt = $null
  $maxMembers = 0
  $timedOut = $false
  $readerRuns = New-Object Collections.Generic.List[object]
  $lastReader = -10.0
  while (-not [GqNative]::WaitExit($launch, 400)) {
    if ($clock.Elapsed.TotalSeconds -gt 240) {
      $timedOut = $true
      [GqNative]::TerminateJob($outer, 1)
      break
    }
    if ($journalHold -and $clock.Elapsed.TotalSeconds -gt 13) {
      $journalHold.Dispose()
      $journalHold = $null
      $journalReleasedAt = Get-GqIso
    }
    $members = @(Get-Members $dir) + @(Get-FileMembers $dir)
    foreach ($p in ($members | Sort-Object -Unique)) {
      $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
      if ($proc) {
        $starts[$p] = $proc.StartTime.ToUniversalTime().Ticks
        $names[$p] = $proc.ProcessName
        $nested[$p] = [GqNative]::PidInJob($p, $outer)
      }
    }
    if ($members.Count -gt $maxMembers) { $maxMembers = $members.Count }
    $expected = if ($Mode -eq 'full-chain') { 6 } else { 5 }
    if ($KillSupervisor -and $null -eq $killedAt -and $members.Count -ge $expected) {
      $killedAt = [math]::Round($clock.Elapsed.TotalSeconds, 3)
      Stop-Process -Id $launch.Pid -Force
    }
    if ($Options -contains 'status-reader' -and ($clock.Elapsed.TotalSeconds - $lastReader) -gt 2.5) {
      $lastReader = $clock.Elapsed.TotalSeconds
      $json = & $pwshExe -NoProfile -File $statusScript -StatusFile (Join-Path $dir 'status.json') 2>&1
      $readerRuns.Add(@{ at = [math]::Round($clock.Elapsed.TotalSeconds, 2)
        exit = $LASTEXITCODE; text = (($json | Out-String) -replace '\s+', ' ').Trim() })
    }
  }
  $supervisorGone = [math]::Round($clock.Elapsed.TotalSeconds, 3)
  foreach ($s in $holds) { $s.Dispose() }
  if ($journalHold) { $journalHold.Dispose() }
  foreach ($p in (Get-FileMembers $dir)) {
    if (-not $starts.ContainsKey($p)) { $starts[$p] = $null }
  }
  $delays = [ordered]@{}
  $limit = $clock.Elapsed.TotalSeconds + 15
  $pending = @($starts.Keys | Where-Object { $null -ne $starts[$_] })
  while ($pending.Count -gt 0 -and $clock.Elapsed.TotalSeconds -lt $limit) {
    $stillThere = @()
    foreach ($p in $pending) {
      $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
      if ($proc -and $proc.StartTime.ToUniversalTime().Ticks -eq $starts[$p]) { $stillThere += $p }
      else { $delays["$p"] = [math]::Round($clock.Elapsed.TotalSeconds - $supervisorGone, 3) }
    }
    $pending = $stillThere
    if ($pending.Count -gt 0) { Start-Sleep -Milliseconds 100 }
  }
  $statusRaw = Read-GqSharedText (Join-Path $dir 'status.json')
  $resultRaw = Read-GqSharedText (Join-Path $dir 'result.json')
  $final = [regex]::Match([string]$statusRaw, '"finalStatus":\s*(null|"([^"]+)")').Groups[2].Value
  $resFinal = [regex]::Match([string]$resultRaw, '"finalStatus":\s*(null|"([^"]+)")').Groups[2].Value
  $inner = [regex]::Matches([string]$statusRaw, '"inThisJob":\s*true').Count
  $innerNot = [regex]::Matches([string]$statusRaw, '"inThisJob":\s*false').Count
  $w = [regex]::Match([string]$statusRaw, '"wSeconds":\s*([0-9.]+)').Groups[1].Value
  $hostInfo = [regex]::Match([string]$statusRaw, '"hostJob":\s*\{\s*"inJob":\s*(true|false)').Groups[1].Value
  $writeFailures = [regex]::Match([string]$resultRaw, '"writeFailures":\s*(\d+)').Groups[1].Value
  $callbackErrors = [regex]::Match([string]$resultRaw, '"callbackErrors":\s*(\d+)').Groups[1].Value
  $windowFault = [regex]::Match([string]$resultRaw, '"fault":\s*"([^"]*)"').Groups[1].Value
  $journalText = Read-GqSharedText (Join-Path $dir 'journal.jsonl')
  $journalTypes = @([regex]::Matches([string]$journalText, '"type":"([a-z-]+)"') |
    ForEach-Object { $_.Groups[1].Value })
  $alive = @($pending)
  $lockFile = Join-Path $dir 'own.lock'
  $lockLeft = Test-Path -LiteralPath $lockFile
  $lockContent = if ($lockLeft) { [IO.File]::ReadAllText($lockFile) } else { $null }
  if ($lockLeft) { Remove-Item -LiteralPath $lockFile }
  $notNested = @($nested.Keys | Where-Object { $nested[$_] -ne $true })
  $result = [ordered]@{}
  $result.name = $Name
  $result.shell = $Shell
  $result.mode = $Mode
  $result.runSeconds = $RunSeconds
  $result.tSeconds = $TSeconds
  $result.options = $Options
  $result.supervisorKilledByHarness = $KillSupervisor
  $result.supervisorKilledAtSeconds = $killedAt
  $result.supervisorExitedAtSeconds = $supervisorGone
  $result.harnessTimedOut = $timedOut
  $result.supervisorPid = $launch.Pid
  $result.supervisorExitCode = [GqNative]::ExitCode($launch)
  $result.supervisorInHostJob = $hostInfo
  $result.finalStatus = $final
  $result.standInResultFinal = $resFinal
  $result.wSeconds = $w
  $result.standInWriteFailures = $writeFailures
  $result.standInCallbackErrors = $callbackErrors
  $result.standInWindowFault = $windowFault
  $result.journalEventTypes = $journalTypes
  $result.ownedProcessesObserved = $starts.Count
  $result.maxMembersInStatus = $maxMembers
  $memberRows = @()
  foreach ($p in ($starts.Keys | Sort-Object)) {
    $memberRows += [ordered]@{ pid = $p; name = $names[$p]; inHarnessOuterJob = $nested[$p] }
  }
  $result.members = $memberRows
  $result.innerJobMembershipSamplesTrue = $inner
  $result.innerJobMembershipSamplesFalse = $innerNot
  $result.allObservedInHarnessOuterJob = ($notNested.Count -eq 0)
  $result.deathDelaysSecondsAfterSupervisorExit = $delays
  $result.stillAliveAfter15s = $alive
  $result.allGone = ($alive.Count -eq 0 -and $starts.Count -gt 0)
  $result.statusReaderRuns = $readerRuns.ToArray()
  $result.privateLockLeftBehind = $lockLeft
  $result.privateLockContent = $lockContent
  $result.journalHoldReleasedAt = $journalReleasedAt
  [GqNative]::Release($launch)
  [GqNative]::Close($outer)
  [pscustomobject]$result
}

$all = @()
foreach ($s in $Scenarios) {
  Write-Host "scenario $s"
  switch ($s) {
    'normal' { $all += Invoke-Scenario 'normal' $pwshExe 'direct' 8 60 }
    'normal-ps51' { $all += Invoke-Scenario 'normal-ps51' $ps51Exe 'direct' 8 60 }
    't-expiry' { $all += Invoke-Scenario 't-expiry' $pwshExe 'direct' 90 12 }
    'supervisor-loss' { $all += Invoke-Scenario 'supervisor-loss' $pwshExe 'direct' 90 120 $true }
    'full-chain' { $all += Invoke-Scenario 'full-chain' $pwshExe 'full-chain' 6 120 }
    'beat-fault' { $all += Invoke-Scenario 'beat-fault' $pwshExe 'direct' 8 60 $false @('beat-fault') }
    'held-readers' {
      $all += Invoke-Scenario 'held-readers' $pwshExe 'full-chain' 6 120 $false @('hold')
    }
    'status-reader' {
      $all += Invoke-Scenario 'status-reader' $pwshExe 'full-chain' 6 120 $false @('status-reader')
    }
    default { throw "unknown scenario $s" }
  }
}
$out = [ordered]@{ schema = 'MS18c-proof-job-v2'; at = (Get-GqIso); harnessShell = $pwshExe
  harnessPowerShell = $PSVersionTable.PSVersion.ToString(); scenarios = $all }
$file = Join-Path $Root 'proof-job-results.json'
$text = (ConvertTo-Json -InputObject $out -Depth 8) -replace "`r?`n", "`r`n"
[IO.File]::WriteAllText($file, $text + "`r`n")
$all | ForEach-Object {
  $delays = $_.deathDelaysSecondsAfterSupervisorExit.Values -join ','
  '{0}: exit={1} final={2} w={3} owned={4} allGone={5} nestedOuter={6} writeFailures={7} delays={8}' -f
    $_.name, $_.supervisorExitCode, $_.finalStatus, $_.wSeconds, $_.ownedProcessesObserved, $_.allGone,
    $_.allObservedInHarnessOuterJob, $_.standInWriteFailures, $delays
}
Write-Host "results: $file"
