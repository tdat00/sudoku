# MS18c Stage 3 task-owned GQ SUPERVISOR: one bounded, detached-capable supervisor per admission
# attempt of ONE approved cell. It never takes an A/T/O or a payload from its caller: gq-plan.cjs reads
# the committed manifest, verifies every frozen input, decides the next admission from the durable
# S-OD14 journal and builds the only argument vector. This script owns the processes: the lock (one
# bounded wait), the unnamed kill-on-close Job Object, the suspended gq-launch.cjs (T starts at its
# creation), the wall-clock T watchdog and the atomic status. The launch tool call is:
#   Set-Location Q:\git\sudoku\generator
#   & .\tests\artifacts\difficulty-v3\MS18c\supervise-gq.ps1 -Cell 'classic4/veryEasy'
# with the powershell tool at mode=async, detach=true (the orchestrator's GQ-window GO is required).
# Exit: 0 accepted record, 1 complete record kept for review (also a record recovered from a lost
# run), 3 unstarted admission hold (a verdict, nothing launched), 4 live matching supervisor (adopt:
# no start), 5 refused (decision, manifest, frozen inputs, host tuple, ancestry, authorization),
# 6 no complete record (T-kill or worker fault), 7 supervisor fault (also a hold posted after a
# fault), 8 no timing slot (no admission consumed). A re-ask, a recovery or an adoption is never
# decided here and never retried here. Once the window has started, no log or status failure can
# stop the post-check: it always runs.
param([Parameter(Mandatory = $true)][string]$Cell)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'gq-common.ps1')
if ($Cell -notmatch '^[A-Za-z0-9]+/[A-Za-z0-9]+$') {
  Write-Host "refused: '$Cell' is not a variant/level key"
  exit 5
}
$oStopwatch = [Diagnostics.Stopwatch]::StartNew()
$oStart = Get-GqIso
$plan = Join-Path $PSScriptRoot 'gq-plan.cjs'
$runId = 'ms18c-{0}-{1}' -f [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff'), $PID
$cellDir = Join-Path $script:GqRuns ($Cell -replace '/', '-')
$preLog = Join-Path $cellDir "pre-$runId.log"
$ownLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
$foreignLock = Join-Path $env:TEMP 'dv3-timing.lock'
$lastRelease = Join-Path $script:GqRuns 'last-release.txt'

# No folder exists for the cell until the planner has confirmed an exact manifest row: what happens
# before is buffered and written once the folder exists.
$script:Log = $null
$script:Buffered = New-Object Collections.Generic.List[object]
function Write-Event([string]$Type, [hashtable]$Fields) {
  if ($script:Log) { Write-GqLog $script:Log $Type $Fields }
  else { $script:Buffered.Add(@($Type, $Fields, (Get-GqIso))) }
}
function Open-CellLog {
  New-Item -ItemType Directory -Force -Path $cellDir | Out-Null
  $script:Log = $preLog
  foreach ($b in $script:Buffered) { $b[1].bufferedAt = $b[2]; Write-GqLog $preLog $b[0] $b[1] }
  $script:Buffered.Clear()
}

function Stop-Gq([int]$Code, [string]$Message, $Extra) {
  Write-Event 'supervisor-exit' @{ code = $Code; message = $Message }
  $line = [ordered]@{ runId = $runId; cell = $Cell; exit = $Code; message = $Message; detail = $Extra }
  Write-Host (ConvertTo-Json -Compress -InputObject $line -Depth 6)
  exit $Code
}

function Request-Stop([int]$Code, [string]$Message, $Extra) {
  $script:StopRequest = @{ code = $Code; message = $Message; extra = $Extra }
  throw 'GQ-STOP'
}
$script:StopRequest = $null

Write-Event 'supervisor-start' @{ runId = $runId; cell = $Cell; pid = $PID; oStart = $oStart
  powershell = $PSVersionTable.PSVersion.ToString() }
$peekArgs = @($plan, 'peek', "--cell=$Cell")
$peek = Invoke-GqNode -NodeArgs $peekArgs -TimeoutSeconds 90
if (-not $peek.json) { Stop-Gq 7 'the planner (peek) returned no JSON' $peek.stderr }
if ($peek.json.code -eq 'not-a-row' -or $peek.json.code -eq 'manifest') {
  Stop-Gq 5 "refused: $($peek.json.code): $($peek.json.reason)" $peek.json
}
Open-CellLog
Write-Event 'peek' @{ result = $peek.json }
if ($peek.json.action -eq 'wait') {
  $seconds = [math]::Min(65, [double]$peek.json.waitSeconds)
  Write-Event 'reask-wait' @{ seconds = $seconds }
  Start-Sleep -Milliseconds ([int][math]::Ceiling($seconds * 1000))
  $peek = Invoke-GqNode -NodeArgs $peekArgs -TimeoutSeconds 90
  if (-not $peek.json) { Stop-Gq 7 'the planner (peek) returned no JSON' $peek.stderr }
  Write-Event 'peek' @{ result = $peek.json }
}
if ($peek.json.action -eq 'adopt') {
  Stop-Gq 4 'a live matching supervisor owns this cell: adopt it, do not start' $peek.json
}
$proceed = @('start', 'close', 'recover-record')
if ($proceed -notcontains $peek.json.action) {
  Stop-Gq 5 "refused: $($peek.json.code): $($peek.json.reason)" $peek.json
}

$lock = $null
$attemptDir = $null
$begin = $null
$status = $null
$statusFile = $null
$postDone = $false
$res = $null
$faulted = $false
$final = $null
$script:WindowStarted = $false
try {
  $lock = Enter-GqLock -OwnLock $ownLock -ForeignLock $foreignLock -RunId $runId -WaitSeconds 1200 `
    -LastRelease $lastRelease -LogFile $preLog
  if (-not $lock.acquired) { Request-Stop 8 "no timing slot: $($lock.reason)" $lock }
  Write-Event 'lock-acquired' @{ waitedSeconds = $lock.waitedSeconds
    foreignSeen = $lock.foreignSeen; foreignReleased = $lock.foreignReleased }
  Add-GqNative
  $self = Get-GqSelfIdentity
  $hostJob = Get-GqHostJobInfo
  # The full host tuple is checked here, under the lock and before anything is reserved: a restarted
  # CLI host costs no admission.
  $hostRun = Invoke-GqNode -NodeArgs @($plan, 'hostcheck') -TimeoutSeconds 60
  if (-not $hostRun.json -or -not $hostRun.json.ok) {
    Request-Stop 5 'the confirmed host tuple does not match: no admission was reserved' $hostRun.json
  }
  $beginRun = Invoke-GqNode -NodeArgs @($plan, 'begin', "--cell=$Cell", "--run-id=$runId",
    "--supervisor-pid=$PID", "--supervisor-created=$($self.createdUtcMicros)", "--o-start=$oStart",
    "--lock-file=$ownLock", "--foreign-lock-file=$foreignLock") -TimeoutSeconds 240
  if (-not $beginRun.json) {
    Request-Stop 7 'the planner (begin) returned no JSON' $beginRun.stderr
  }
  $begin = $beginRun.json
  Write-Event 'begin' @{ result = $begin }
  if ($begin.action -eq 'adopt') {
    Request-Stop 4 'a live matching supervisor owns this cell: adopt it' $begin
  }
  if ($begin.action -eq 'recovered-record') {
    $code = if ($begin.outcome -eq 'record-review') { 1 } else { 7 }
    Request-Stop $code 'a readable record of a lost run was recovered and is kept for review' $begin
  }
  if ($begin.action -ne 'start') {
    Request-Stop 5 "refused: $($begin.code): $($begin.reason)" $begin
  }
  if ($begin.nodePath -ne $script:GqNode) { throw "the approved Node is $($begin.nodePath)" }

  $attemptDir = $begin.attemptDir
  $script:Log = Join-Path $attemptDir 'supervisor.log'
  $statusFile = Join-Path $attemptDir 'status.json'
  Write-Event 'attempt-reserved' @{ runId = $runId; slot = $begin.slot
    ordinal = $begin.ordinal; preLog = $preLog; claimedRecovery = $begin.claimedRecovery }
  $oSeconds = [double]$begin.O
  $oLeftNow = $oSeconds - $oStopwatch.Elapsed.TotalSeconds
  $status = [ordered]@{
    schema = 'MS18c-gq-status-v1'; runId = $runId; cell = $Cell; epoch = $begin.epoch
    payloadSlot = $begin.slot; admissionOrdinal = $begin.ordinal; state = 'admission'
    manifestBlob = $begin.manifestBlob; head = $begin.head; inputs = $begin.inputs
    policy = 'MS18c-GQ-host-active'; method = 'MS18c-GQ-structural-v1'
    supervisor = [ordered]@{ pid = $self.pid; createdUtcMicros = $self.createdUtcMicros
      source = 'CIM Win32_Process.CreationDate, UTC, truncated to microseconds'; hostJob = $hostJob
      powershell = $PSVersionTable.PSVersion.ToString() }
    job = $null; launcher = $null
    clocks = [ordered]@{ oStart = $oStart; oSeconds = $oSeconds
      oDeadline = ([DateTime]::UtcNow.AddSeconds($oLeftNow)).ToString('o'); T = [double]$begin.T
      tStart = $null; tDeadline = $null; rSeconds = $null; wSeconds = $null
      lockWaitedSeconds = $lock.waitedSeconds
      note = 'T starts at the creation of the owned launcher after the lock acquisition and ' +
        'excludes that wait' }
    outputs = [ordered]@{ dir = $attemptDir; status = $statusFile; supervisorLog = $script:Log
      preLog = $preLog; events = (Join-Path $attemptDir 'events.jsonl')
      readiness = (Join-Path $attemptDir 'readiness.json')
      stdout = (Join-Path $attemptDir 'stdout.txt'); stderr = (Join-Path $attemptDir 'stderr.txt')
      qualifierJson = (Join-Path $attemptDir 'qualifier.json')
      qualifierMarkdown = (Join-Path $attemptDir 'qualifier.md')
      journal = (Join-Path $cellDir 'journal.jsonl')
      receipt = (Join-Path $cellDir 'acceptance-receipt.json') }
    members = @(); membersSeen = @(); heartbeatAt = $null; finalStatus = $null; exitCode = $null }
  function Save-Status {
    param([int]$Tries = 6)
    $status.heartbeatAt = Get-GqIso
    $null = Write-GqStatus $statusFile $status -Tries $Tries
  }
  Save-Status

  # The window may take T, then the leftover grace (15 s) and the post-check (one retry of 240 s each
  # at the very worst): the outer O must still hold.
  $oLeft = $oSeconds - $oStopwatch.Elapsed.TotalSeconds
  if ($oLeft -lt ([double]$begin.T + 300)) {
    $left = [math]::Round($oLeft)
    throw "only $left s of the outer O remain, less than T plus the 300 s post-check reserve"
  }
  $launchArgs = @((Join-Path $PSScriptRoot 'gq-launch.cjs'), (Join-Path $attemptDir 'launch-spec.json'))
  $environment = Get-GqLauncherEnvironment
  Write-Event 'environment' @{ removed = $environment.removed }
  $onStarted = {
    param($res, $job)
    $script:Job = $job
    $script:WindowStarted = $true
    $status.state = 'running'
    $status.job = [ordered]@{ unnamed = $true; limits = $res.jobLimits
      handleHeldBy = 'this supervisor only' }
    $status.launcher = [ordered]@{ pid = $res.launcherPid; createdUtcMicros = $res.launcherCreated }
    $status.clocks.tStart = $res.tStartIso
    $tLeft = [double]$begin.T - $res.resumedAfterSeconds
    $status.clocks.tDeadline = ([DateTime]::UtcNow.AddSeconds($tLeft)).ToString('o')
    Save-Status
    Write-Event 'window-started' @{ launcherPid = $res.launcherPid
      created = $res.launcherCreated; tStartNs = $res.tStartNs
      createdAfterSeconds = $res.createdAfterSeconds; resumedAfterSeconds = $res.resumedAfterSeconds }
  }
  $onBeat = {
    param($elapsed, $active, $pids, $detail)
    $status.members = @($pids)
    $status.membersSeen = @($detail)
    $status.activeProcesses = $active
    $status.clocks.elapsedSeconds = [math]::Round($elapsed, 3)
    $text = Read-GqSharedText (Join-Path $attemptDir 'events.jsonl')
    if ($text) {
      foreach ($line in ($text -split "`r?`n")) {
        if ($line -match '"type":"qualifier-created"' -and $line -match '"rSeconds":([0-9.eE+-]+)') {
          $status.clocks.rSeconds = [double]$Matches[1]
        }
      }
    }
    Save-Status
  }
  $res = Invoke-GqWindow -Exe $script:GqNode -Arguments $launchArgs -Directory $PSScriptRoot `
    -Environment $environment.pairs -StdoutPath (Join-Path $attemptDir 'launcher-stdout.txt') `
    -StderrPath (Join-Path $attemptDir 'launcher-stderr.txt') -TSeconds ([double]$begin.T) `
    -OnStarted $onStarted -OnBeat $onBeat -HeartbeatSeconds 10
  # From here on the post-check must run whatever else fails: every write below is best effort.
  if ($res.fault) { $faulted = $true }
  $status.clocks.wSeconds = $res.wSeconds
  $status.members = @($res.members)
  $status.membersSeen = @($res.membersDetail)
  $status.window = $res
  $status.state = 'post-check'
  Save-Status
  Write-Event 'window-ended' @{ launcherExit = $res.launcherExit
    tExpired = $res.tExpired; leftover = $res.leftover; wSeconds = $res.wSeconds
    fault = $res.fault; callbackErrors = $res.callbackErrors; members = @($res.members) }
  $expired = if ($res.tExpired) { 1 } else { 0 }
  $left = if ($res.leftover) { 1 } else { 0 }
  $flag = if ($res.fault) { 1 } else { 0 }
  $postArgs = @($plan, 'post', "--cell=$Cell", "--run-id=$runId", "--slot=$($begin.slot)",
    "--ordinal=$($begin.ordinal)", "--launcher-exit=$($res.launcherExit)", "--w=$($res.wSeconds)",
    "--t-expired=$expired", "--leftover=$left", "--fault=$flag")
  $post = Invoke-GqNode -NodeArgs $postArgs -TimeoutSeconds 240
  if (-not $post.json) {
    Write-Event 'post-retry' @{ timedOut = $post.timedOut; stderr = $post.stderr }
    $post = Invoke-GqNode -NodeArgs $postArgs -TimeoutSeconds 240
  }
  $postDone = $true
  if (-not $post.json) { throw "the planner (post) returned no JSON: $($post.stderr)" }
  Write-Event 'post' @{ result = $post.json }
  $final = $post.json
} catch {
  if (-not $script:StopRequest) {
    $faulted = $true
    Write-Event 'fault' @{ message = $_.Exception.Message; windowStarted = $script:WindowStarted }
    if ($begin -and $begin.action -eq 'start' -and -not $postDone) {
      # The window never started: nothing ran; the reserved admission ends as a launcher-fault hold.
      # The window did start: the post-check below the window cannot have been skipped, so the planner
      # is asked once more here with what is known.
      $known = @('--launcher-exit=71', '--w=0', '--t-expired=0', '--leftover=0', '--fault=1')
      if ($res) {
        $known = @("--launcher-exit=$($res.launcherExit)", "--w=$($res.wSeconds)",
          "--t-expired=$(if ($res.tExpired) { 1 } else { 0 })",
          "--leftover=$(if ($res.leftover) { 1 } else { 0 })", '--fault=1')
      } elseif ($script:WindowStarted) {
        $known = @('--launcher-exit=-1', '--w=0', '--t-expired=0', '--leftover=0', '--fault=1')
      }
      $fix = Invoke-GqNode -NodeArgs (@($plan, 'post', "--cell=$Cell", "--run-id=$runId",
        "--slot=$($begin.slot)", "--ordinal=$($begin.ordinal)") + $known) -TimeoutSeconds 240
      Write-Event 'post-after-fault' @{ result = $fix.json }
      $final = $fix.json
    }
    if ($status) { $status.fault = $_.Exception.Message }
    if (-not $final) {
      $final = [pscustomobject]@{ ok = $false; outcome = 'supervisor-fault'
        reason = $_.Exception.Message }
    }
  }
} finally {
  if ($lock -and $lock.acquired) {
    $problem = Exit-GqLock -Lock $lock -OwnLock $ownLock -LastRelease $lastRelease
    Write-Event 'lock-released' @{ problem = $problem }
  }
}
if ($script:StopRequest) {
  Stop-Gq $script:StopRequest.code $script:StopRequest.message $script:StopRequest.extra
}
$outcome = if ($final) { [string]$final.outcome } else { 'supervisor-fault' }
$code = switch ($outcome) {
  'record-accepted' { 0 }
  'record-review' { 1 }
  'record-unreadable' { 1 }
  'unstarted-hold' { 3 }
  'no-record' { 6 }
  default { 7 }
}
if ($faulted -and $outcome -eq 'unstarted-hold') { $code = 7 }
if ($status) {
  $status.state = 'finished'
  $status.finalStatus = $outcome
  $status.exitCode = $code
  $status.post = $final
  $status.heartbeatAt = Get-GqIso
  $status.writeFailures = $script:GqWriteFailures
  $null = Write-GqStatus $statusFile $status -Tries 30
}
Stop-Gq $code "attempt finished: $outcome" $final
