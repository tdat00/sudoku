# MS18c Stage 3 task-owned STAND-IN SUPERVISOR (a proof tool, never a payload, and it NEVER touches the
# real dv3-sudoku.lock: it has a private lock only). It runs the SAME library code as supervise-gq.ps1
# (gq-common.ps1: lock, Job Object, suspended launcher, T watchdog, atomic status, identity) over a
# stand-in tree instead of the qualifier: scenario `direct` makes the launcher a Node parent that forks N
# Node children (like qualify.js forks its workers); `full-chain` makes it the real gq-launch.cjs with
# that parent as its stand-in payload (readiness, creation-boundary R, transcripts, launch-intent in a
# private journal). It writes the status of the real supervisor's shape (PID and CIM creation time, cell,
# deadlines, every job member with its creation time) and, at the end, result.json. -BeatFault makes the
# heartbeat callback throw on every beat, to prove that a failing callback cannot end the window.
#   standin-supervisor.ps1 -Dir <abs dir> -Name <n> [-Scenario direct|full-chain] [-RunSeconds 15]
#     [-TSeconds 60] [-Children 4] [-HeartbeatSeconds 2] [-BeatFault]
param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [Parameter(Mandatory = $true)][string]$Name,
  [ValidateSet('direct', 'full-chain')][string]$Scenario = 'direct',
  [double]$RunSeconds = 15,
  [double]$TSeconds = 60,
  [int]$Children = 4,
  [double]$HeartbeatSeconds = 2,
  [switch]$BeatFault
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'gq-common.ps1')
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$log = Join-Path $Dir 'supervisor.log'
$statusFile = Join-Path $Dir 'status.json'
$membersFile = Join-Path $Dir 'members.json'
Add-GqNative
$self = Get-GqSelfIdentity
$hostJob = Get-GqHostJobInfo
$runId = 'standin-{0}-{1}-{2}' -f $Name, [DateTime]::UtcNow.ToString('yyyyMMddHHmmss'), $PID
$ownLock = Join-Path $Dir 'own.lock'
$foreignLock = Join-Path $Dir 'foreign.lock'
$lastRelease = Join-Path $Dir 'last-release.txt'
$oStart = Get-GqIso

$status = [ordered]@{
  schema = 'MS18c-gq-status-v1'; standIn = $true; name = $Name; scenario = $Scenario; runId = $runId
  cell = 'stand-in/none'; state = 'starting'
  supervisor = [ordered]@{ pid = $self.pid; createdUtcMicros = $self.createdUtcMicros
    source = 'CIM Win32_Process.CreationDate, UTC, truncated to microseconds'; hostJob = $hostJob
    powershell = $PSVersionTable.PSVersion.ToString(); exe = (Get-Process -Id $PID).Path }
  job = $null; launcher = $null
  clocks = [ordered]@{ oStart = $oStart; tStart = $null; tDeadline = $null; T = $TSeconds; rSeconds = $null
    wSeconds = $null
    note = 'T starts at the creation of the owned launcher and excludes the lock acquisition' }
  lock = [ordered]@{ mode = 'private'; own = $ownLock; foreign = $foreignLock }
  outputs = [ordered]@{ dir = $Dir; status = $statusFile; log = $log; members = $membersFile }
  members = @(); membersSeen = @(); heartbeatAt = $null; finalStatus = $null
}
function Save-Status {
  param([int]$Tries = 6)
  $status.heartbeatAt = Get-GqIso
  $null = Write-GqStatus $statusFile $status -Tries $Tries
}
Write-GqLog $log 'standin-start' @{ runId = $runId; scenario = $Scenario; pid = $PID; hostJob = $hostJob }
Save-Status

$lock = $null
$res = $null
$script:Job = $null
$script:Membership = @()
try {
  $status.state = 'waiting-lock'
  Save-Status
  $lock = Enter-GqLock -OwnLock $ownLock -ForeignLock $foreignLock -RunId $runId -WaitSeconds 120 `
    -LastRelease $lastRelease -LogFile $log
  if (-not $lock.acquired) { throw "no lock: $($lock.reason)" }
  Write-GqLog $log 'lock-acquired' @{ waitedSeconds = $lock.waitedSeconds }

  $argumentsDirect = @((Join-Path $PSScriptRoot 'standin-parent.cjs'), 'parent', "$RunSeconds",
    "$Children", $membersFile)
  if ($Scenario -eq 'direct') {
    $arguments = $argumentsDirect
    $directory = $PSScriptRoot
  } else {
    $manifestFile = Join-Path $script:GqRoot 'tasks\difficulty-v3\MS18c-gq-approved-ceilings.json'
    $manifest = Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json
    $spec = [ordered]@{
      schema = 'MS18c-gq-launch-spec-v1'; runId = $runId; cell = 'stand-in/none'; epoch = 'stand-in'
      slot = 1; ordinal = 1; policy = $manifest.policy; attemptDir = $Dir
      journalFile = (Join-Path $Dir 'journal.jsonl')
      lockFile = $ownLock; foreignLockFile = $foreignLock; nodePath = $script:GqNode
      nodeVersion = $manifest.identities.node.version; generatorDir = $PSScriptRoot
      payloadArgs = @('standin-parent.cjs', 'parent', "$RunSeconds", "$Children", $membersFile)
      host = $manifest.host; caps = [ordered]@{ callSeconds = 15; cumulativeSeconds = 45 }
      T = $TSeconds; O = $TSeconds }
    $specFile = Join-Path $Dir 'launch-spec.json'
    $specText = (ConvertTo-Json -InputObject $spec -Depth 8) -replace "`r?`n", "`r`n"
    [IO.File]::WriteAllText($specFile, $specText + "`r`n")
    $arguments = @((Join-Path $PSScriptRoot 'gq-launch.cjs'), $specFile)
    $directory = $PSScriptRoot
  }
  $environment = Get-GqLauncherEnvironment
  $onStarted = {
    param($res, $job)
    $script:Job = $job
    $status.state = 'running'
    $status.job = [ordered]@{ unnamed = $true; limits = $res.jobLimits
      handleHeldBy = 'this supervisor only' }
    $status.launcher = [ordered]@{ pid = $res.launcherPid; createdUtcMicros = $res.launcherCreated
      launchedSuspendedAssignedResumed = $true }
    $status.clocks.tStart = $res.tStartIso
    $left = $TSeconds - $res.resumedAfterSeconds
    $status.clocks.tDeadline = ([DateTime]::UtcNow.AddSeconds($left)).ToString('o')
    Save-Status
    Write-GqLog $log 'window-started' @{ launcherPid = $res.launcherPid; created = $res.launcherCreated
      tStartNs = $res.tStartNs; createdAfterSeconds = $res.createdAfterSeconds
      resumedAfterSeconds = $res.resumedAfterSeconds }
  }
  $onBeat = {
    param($elapsed, $active, $pids, $detail)
    $rows = @($pids | ForEach-Object {
      $proc = Get-Process -Id $_ -ErrorAction SilentlyContinue
      [ordered]@{ pid = $_; name = $(if ($proc) { $proc.ProcessName } else { $null })
        inThisJob = [GqNative]::PidInJob($_, $script:Job) } })
    if ($rows.Count -gt $script:Membership.Count) { $script:Membership = $rows }
    $status.membership = @($script:Membership)
    $status.members = @($pids)
    $status.membersSeen = @($detail)
    $status.clocks.elapsedSeconds = [math]::Round($elapsed, 3)
    $status.activeProcesses = $active
    $text = Read-GqSharedText (Join-Path $Dir 'events.jsonl')
    if ($text) {
      foreach ($line in ($text -split "`r?`n")) {
        if ($line -match '"type":"qualifier-created"' -and $line -match '"rSeconds":([0-9.eE+-]+)') {
          $status.clocks.rSeconds = [double]$Matches[1]
        }
      }
    }
    Save-Status
    if (Test-Path -LiteralPath (Join-Path $Dir 'stop.txt')) {
      Write-GqLog $log 'stop-file' @{ note = 'stop.txt found: terminating only the owned job' }
      [GqNative]::TerminateJob($script:Job, 1)
    }
    if ($BeatFault) { throw 'stand-in heartbeat fault (on purpose)' }
  }
  $res = Invoke-GqWindow -Exe $script:GqNode -Arguments $arguments -Directory $directory `
    -Environment $environment.pairs -StdoutPath (Join-Path $Dir 'launcher-stdout.txt') `
    -StderrPath (Join-Path $Dir 'launcher-stderr.txt') -TSeconds $TSeconds -OnStarted $onStarted `
    -OnBeat $onBeat -HeartbeatSeconds $HeartbeatSeconds
  $status.clocks.wSeconds = $res.wSeconds
  $status.members = @($res.members)
  $status.membersSeen = @($res.membersDetail)
  $final = 'exit-' + $res.launcherExit
  if ($res.fault) { $final = 'window-fault' }
  elseif ($res.tExpired) { $final = 'tExpired' }
  elseif ($res.launcherExit -eq 0) { $final = 'completed' }
  $status.finalStatus = $final
  $status.window = $res
  $status.membership = @($script:Membership)
  $status.state = 'finished'
  Write-GqLog $log 'window-ended' @{ launcherExit = $res.launcherExit; tExpired = $res.tExpired
    leftover = $res.leftover; wSeconds = $res.wSeconds; members = @($res.members)
    fault = $res.fault; callbackErrors = $res.callbackErrors }
} catch {
  $status.state = 'fault'
  $status.finalStatus = 'fault'
  $status.fault = $_.Exception.Message
  Write-GqLog $log 'fault' @{ message = $_.Exception.Message }
} finally {
  if ($lock -and $lock.acquired) {
    $problem = Exit-GqLock -Lock $lock -OwnLock $ownLock -LastRelease $lastRelease
    Write-GqLog $log 'lock-released' @{ problem = $problem }
  }
  $status.writeFailures = $script:GqWriteFailures
  Save-Status -Tries 30
  # result.json is the stand-in's own record of what the window did, kept apart from the files that a
  # reader may be holding; a stand-in that was killed leaves none.
  $result = [ordered]@{ name = $Name; finalStatus = $status.finalStatus; fault = $status.fault
    writeFailures = $script:GqWriteFailures; window = $res }
  $text = ((ConvertTo-Json -InputObject $result -Depth 8) -replace "`r?`n", "`r`n") + "`r`n"
  $null = Invoke-GqRetry -Tries 30 { [IO.File]::WriteAllText((Join-Path $Dir 'result.json'), $text) }
}
