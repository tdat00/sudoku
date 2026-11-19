# MS18d Phase C0 task-owned: the Phase C copy of the lock wrapper (from phase-b/run-locked.ps1, which it
# does not modify). One locked command per call, through the VERBATIM shared helper (invoke-dv3node.ps1 of
# the MS18c folder, dot-sourced unchanged: its 540 s ceiling and its slot rules are the ones in force). The
# transport works for ANY payload type (payloads.js); only the G3 check differs per type. What it adds:
#
#  G1  the lock WATCH (slot-watch.ps1, SA1 C0-1): during the gap wait it looks at both lock files at least
#      once a second for the 15.3 s right before the call (any lock restarts the window, the wait is bounded
#      and ends in a hold) and records the first and last check, the proof of the last release for locks
#      held by others. It records the slot state and the instant of the request; the controller records the
#      ACTUAL start from inside the locked child and holds when the slot was busy or the start was more than
#      2.000 s late unless a release of another job is proved at least 15 s before (acquisition.js);
#  G2  it reads the release logs of Phase A, Phase B and Phase C and any coordinator evidence, writes every
#      record of a run into <runs root>\<variant>-<level>\<run-id>\ and indexes the run in the new
#      append-only phase-c\lock-log.jsonl. It never writes into the Phase A or B records. After the helper
#      returns it records a conservative verified release OBSERVATION (both lock files absent), not an exact
#      removal instant;
#  G3  exit 1 is allowed for the shared helper (-AllowExit1) ONLY for a payload type that defines it (a
#      complete GP miss), and accepted only when result.json says `miss`; any other exit 1 is a STOP;
#  G4  it verifies the frozen helper manifest before it asks for the slot (the controller binds the
#      sources);
#  G5  after the helper returned it runs the same orphan barrier as the controller (owned-processes.ps1)
#      over the run's pids.jsonl, controller included: the abnormal-exit verification when the controller
#      was killed.
#
# Outcomes: gp-success / success (a complete success), gp-miss / miss (a complete miss), control-hold
# (nothing was started; a hold, not a result, never an eligible re-ask) and stop (anything else: the call
# THROWS after the record is written). A stand-in run is marked as such everywhere and never enters the
# real GP matrix.
#
# From generator\:   . tests\artifacts\difficulty-v3\MS18d\phase-c\run-locked-c.ps1
#   Invoke-GpLocked -Task 'MS18d GP classic4/veryEasy' -RunId 'r1' -Cell 'classic4/veryEasy' `
#     -CampaignBase <sha>
#   Invoke-RecorderLocked -ChunkId <id> -Attempt 1|2 -CampaignBase <sha>   (the raw-time recorder, R24)
#   Invoke-MergeLocked -Scope all-79 -CampaignBase <sha>                  (the check-only merge)
# The variables below are overridden only by the stand-in tests.
$script:Ms18dRoot = 'Q:\git\sudoku'
$script:RunRepo = $script:Ms18dRoot
$script:ToolsC = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18d\phase-c"
$script:ControllerPath = "$script:ToolsC\controller.js"
$script:HelperPath = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1"
$script:EvidenceRoot = "$script:Ms18dRoot\docs\difficulty-v3\evidence\MS18d"
$script:LogA = "$script:EvidenceRoot\lock-log.jsonl"
$script:LogB = "$script:EvidenceRoot\phase-b\lock-log.jsonl"
$script:LogC = "$script:EvidenceRoot\phase-c\lock-log.jsonl"
$script:CoordinatorEvidence = @()
$script:RunsRoot = "$script:EvidenceRoot\gp"
$script:TargetsFrozen = "$script:EvidenceRoot\phase-b\targets-frozen-final.json"
$script:HelperManifest = [pscustomobject]@{
  File = "$script:EvidenceRoot\phase-c\helpers-c-sha256.txt"; Sha256 = $null; Required = @()
}
$script:Expected = [ordered]@{
  base = $null
  identities = [ordered]@{
    hashIdentity = '344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1'
    replayIdentity = '1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc'
    sources = '75b0955e3e356bd1'
  }
  tableSha256 = '3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a'
  node = 'v26.13.0'
  machine = [ordered]@{
    cpu = 'AMD EPYC 7763 64-Core Processor'; logicalProcessors = 16; memoryGb = 64
    platform = 'win32 10.0.26300'
  }
}
# Whether exit 1 has a defined meaning (a complete miss) for a payload type: the helper may allow it only
# then. The controller checks that the request and its payload module agree (payloads.js).
$script:PayloadExit1 = @{ 'gp-cell' = $true; 'generic' = $false; 'gp-recorder' = $false; 'gp-merge' = $true }
# The frozen chunk manifest (R2/R24) and the command lines of the final-matrix payloads, relative to
# generator\ (the working directory of the command) and to the repository.
$script:PlanFileRel = 'docs\difficulty-v3\evidence\MS18d\phase-c\gp-chunk-manifest.json'
$script:RecorderRel = 'tests\artifacts\difficulty-v3\MS18d\phase-c\record-gp.js'
$script:MergeRel = 'tests\artifacts\difficulty-v3\MS18d\phase-c\merge-gp.js'
$script:GapSeconds = 15
$script:GapMarginSeconds = 0.3
$script:WatchGiveUpSeconds = 1200
$script:WatchIntervalMs = 250
$script:ReleaseWaitSeconds = 3
$script:Stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
. $script:HelperPath
. "$script:ToolsC\owned-processes.ps1"
. "$script:ToolsC\slot-watch.ps1"

function Read-JsonLines {
  param([string]$File)
  if (-not (Test-Path -LiteralPath $File)) { return @() }
  $rows = @()
  foreach ($line in [IO.File]::ReadAllLines($File)) {
    if ($line.Trim() -eq '') { continue }
    try { $rows += ($line | ConvertFrom-Json -DateKind String) } catch { }
  }
  return $rows
}

# The latest release in the Phase A, B and C logs and in coordinator evidence (the courtesy wait only: the
# controller decides from the same files on its own).
function Get-LastReleaseC {
  $times = @()
  foreach ($file in @($script:LogA, $script:LogB, $script:LogC)) {
    foreach ($row in (Read-JsonLines -File $file)) {
      if ($row.finished) { $times += [string]$row.finished }
      if ($row.releaseObservedAt) { $times += [string]$row.releaseObservedAt }
    }
  }
  foreach ($file in $script:CoordinatorEvidence) {
    foreach ($row in (Read-JsonLines -File $file)) { if ($row.at) { $times += [string]$row.at } }
  }
  $latest = $null
  foreach ($text in $times) {
    $when = [DateTimeOffset]::MinValue
    if ([DateTimeOffset]::TryParse($text, [ref]$when)) {
      if ($null -eq $latest -or $when -gt $latest) { $latest = $when }
    }
  }
  return $latest
}

function Get-SlotStateC {
  $tmp = $env:TEMP
  [pscustomobject]@{
    shared = [bool](Test-Path -LiteralPath (Join-Path $tmp 'dv3-sudoku.lock'))
    timing = [bool](Test-Path -LiteralPath (Join-Path $tmp 'dv3-timing.lock'))
  }
}

# Problems of the frozen helper manifest ("<sha256>  <path relative to the repository>" lines), [] when it
# holds.
function Test-HelperManifestC {
  $m = $script:HelperManifest
  $problems = @()
  if (-not (Test-Path -LiteralPath $m.File)) { return @("the helper manifest $($m.File) does not exist") }
  if ($m.Sha256) {
    $actual = (Get-FileHash -LiteralPath $m.File -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $m.Sha256.ToLowerInvariant()) {
      $problems += "the helper manifest is not the reviewed one ($actual)"
    }
  }
  $listed = @()
  foreach ($line in [IO.File]::ReadAllLines($m.File)) {
    if ($line.Trim() -eq '') { continue }
    if ($line -notmatch '^([0-9A-Fa-f]{64})  (.+)$') {
      $problems += "a manifest line is malformed: $line"
      continue
    }
    $rel = $Matches[2].Replace('\', '/')
    $listed += $rel
    $abs = Join-Path $script:Ms18dRoot $Matches[2]
    if (-not (Test-Path -LiteralPath $abs)) { $problems += "listed file missing: $rel"; continue }
    $actual = (Get-FileHash -LiteralPath $abs -Algorithm SHA256).Hash
    if ($actual -ne $Matches[1].ToUpperInvariant()) {
      $problems += "helper bytes differ from the manifest: $rel"
    }
  }
  foreach ($req in $m.Required) {
    if ($listed -notcontains $req.Replace('\', '/')) { $problems += "not in the manifest: $req" }
  }
  return $problems
}

# The record of a run (wrapper.json and one line of the Phase C ledger); `Hold` runs have no controller
# result.
function Write-RunRecord {
  param($Record, [string]$RunDir)
  Write-OwnedJson -Path (Join-Path $RunDir 'wrapper.json') -Object $Record
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $script:LogC) | Out-Null
  [IO.File]::AppendAllText($script:LogC, (($Record | ConvertTo-Json -Depth 6 -Compress) + "`r`n"))
}

function Invoke-PayloadLocked {
  param(
    [Parameter(Mandatory)][string]$Task,
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][string]$Profile,
    [string]$Cell = '',
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{},
    [System.Collections.IDictionary]$PayloadRequest = @{},
    [string]$RunFolder = ''
  )
  # R5: the tee's child inherits the environment, so a Node option is refused before anything is spawned
  if ($env:NODE_OPTIONS) {
    throw 'MS18d-C: NODE_OPTIONS is set; the transport refuses to spawn (it is never silently cleared)'
  }
  if ($RunId -notmatch '^[A-Za-z0-9._-]+$') { throw "MS18d-C: the run id '$RunId' is not a plain name" }
  if (-not $script:PayloadExit1.ContainsKey($Profile)) { throw "MS18d-C: unknown payload type $Profile" }
  $finalMatrix = @('gp-recorder', 'gp-merge') -contains $Profile
  if (-not $finalMatrix -and -not $Standin) {
    throw "MS18d-C: the payload type $Profile is for stand-ins only: the final GP evidence is the recorder"
  }
  if ($ExtraRequest.Count -gt 0 -and -not $Standin) {
    throw 'MS18d-C: extra request fields are for stand-ins only'
  }
  if ($PayloadRequest.Count -gt 0 -and -not $finalMatrix) {
    throw 'MS18d-C: payload request fields belong to the final-matrix payload types'
  }
  $cellInfo = $null
  $cellDir = 'generic'
  $args2 = $CommandArgs
  if ($finalMatrix) {
    if (-not $RunFolder) { throw 'MS18d-C: a final-matrix run names its declared folder' }
    $cellDir = $RunFolder
    $cellInfo = $PayloadRequest['cellInfo']
    if (-not $Standin) {
      if ($CommandArgs.Count -gt 0) { throw 'MS18d-C: a real run takes the frozen command line only' }
      $args2 = @($PayloadRequest['frozenArgs'])
    } elseif ($CommandArgs.Count -eq 0) {
      throw 'MS18d-C: a stand-in names its command'
    }
  } elseif ($Profile -eq 'gp-cell') {
    if ($Cell -notmatch '^([A-Za-z0-9]+)/([A-Za-z0-9]+)$') { throw "MS18d-C: '$Cell' is not variant/level" }
    $variant = $Matches[1]
    $level = $Matches[2]
    $frozen = Get-Content -LiteralPath $script:TargetsFrozen -Raw | ConvertFrom-Json
    $position = @($frozen.positions | Where-Object { $_.key -eq $Cell })
    if ($position.Count -ne 1 -or $null -eq $position[0].target) {
      throw "MS18d-C: $Cell is not an offered cell of the frozen table"
    }
    $cellInfo = [ordered]@{ variant = $variant; level = $level; targetMs = [int]$position[0].target }
    $cellDir = "$variant-$level"
    if ($CommandArgs.Count -eq 0) { throw 'MS18d-C: a stand-in names its command' }
  } elseif ($CommandArgs.Count -eq 0) {
    throw 'MS18d-C: no command'
  }
  if (-not $Standin -and $CampaignBase -notmatch '^[0-9a-f]{40}$') {
    throw 'MS18d-C: a real run needs the campaign base commit B the orchestrator declared (40 hex digits)'
  }
  $runDir = Join-Path (Join-Path $script:RunsRoot $cellDir) $RunId
  if (Test-Path -LiteralPath $runDir) {
    throw "MS18d-C: the run directory $runDir exists; a run is never overwritten"
  }
  $manifestProblems = @(Test-HelperManifestC)
  if ($manifestProblems.Count -gt 0) {
    throw ('MS18d-C hold before the lock (the helpers are not frozen as reviewed): ' +
      ($manifestProblems -join '; '))
  }
  if ($finalMatrix -and -not $Standin) {
    $required = @($script:HelperManifest.Required | ForEach-Object { $_.Replace('/', '\') })
    if ($required -notcontains $script:PlanFileRel) {
      throw "MS18d-C: the helper manifest must require the frozen chunk manifest $script:PlanFileRel"
    }
  }
  New-Item -ItemType Directory -Force -Path $runDir | Out-Null

  # the lock watch during the gap wait: both lock files at least once a second for the 15.3 s right before
  # the call
  $last = Get-LastReleaseC
  $notBefore = 0
  if ($null -ne $last) {
    $gapMs = ($script:GapSeconds + $script:GapMarginSeconds) * 1000
    $notBefore = $last.ToUnixTimeMilliseconds() + [long]$gapMs
  }
  $watch = Wait-SlotQuiet -WindowSeconds ($script:GapSeconds + $script:GapMarginSeconds) `
    -GiveUpSeconds $script:WatchGiveUpSeconds -IntervalMs $script:WatchIntervalMs -NotBeforeMs $notBefore
  Write-OwnedJson -Path (Join-Path $runDir 'watch.json') -Object $watch
  if ($watch.gaveUp) {
    $record = [ordered]@{
      schema = 'ms18d-c-run-1'; task = $Task; runId = $RunId; cell = $Cell; payload = $Profile
      chunkId = $(if ($PayloadRequest['chunk']) { $PayloadRequest['chunk'].chunkId } else { $null })
      attempt = $PayloadRequest['attempt']; scope = $PayloadRequest['scope']
      standin = [bool]$Standin; runDir = $runDir; outcome = 'control-hold'; heldAt = 'foreign-lock-watch'
      reasons = @('a lock of another job did not leave a 15.3 s quiet window within the bounded wait')
      watch = [ordered]@{ startedAtMs = $watch.startedAtMs; lastCheckMs = $watch.lastCheckMs
        checks = $watch.checks; restartCount = $watch.restartCount; giveUpSeconds = $watch.giveUpSeconds
        gaveUp = $true }
      problems = @()
    }
    Write-RunRecord -Record $record -RunDir $runDir
    Write-Host ("LOCKED-C ${Task}: outcome=control-hold (the slot was never quiet for 15.3 s within " +
      "$($watch.giveUpSeconds) s)")
    return [pscustomobject]@{ Outcome = 'control-hold'; Exit = $null; RunDir = $runDir; Result = $null
      Record = $record }
  }

  # the request: instant and slot state, then the record the controller reads
  $asked = [DateTimeOffset]::Now
  $slot = Get-SlotStateC
  $sources = @(
    [ordered]@{ label = 'A'; file = $script:LogA; kind = 'log'; required = $true }
    [ordered]@{ label = 'B'; file = $script:LogB; kind = 'log'; required = $true }
    [ordered]@{ label = 'C'; file = $script:LogC; kind = 'log'; required = $false }
  )
  $n = 0
  foreach ($file in $script:CoordinatorEvidence) {
    $n++
    $sources += [ordered]@{ label = "coordinator$n"; file = $file; kind = 'coordinator'; required = $true }
  }
  $expected = [ordered]@{
    base = $(if ($CampaignBase) { $CampaignBase } else { $null })
    identities = $script:Expected.identities; tableSha256 = $script:Expected.tableSha256
    node = $script:Expected.node; machine = $script:Expected.machine
  }
  $command = [ordered]@{ args = @($args2) }
  if ($ExecOverride) { $command.exec = $ExecOverride }
  $allowExit1 = [bool]$script:PayloadExit1[$Profile]
  $request = [ordered]@{
    schema = 'ms18d-c-request-1'; runId = $RunId; task = $Task; standin = [bool]$Standin; profile = $Profile
    allowExit1 = $allowExit1; cell = $cellInfo; runDir = $runDir; repo = $script:RunRepo; command = $command
    requestedAt = $asked.ToString($script:Stamp); wrapperPid = $PID; slotBefore = $slot; watch = $watch
    releaseSources = $sources; cLedger = $script:LogC; expected = $expected
    helpers = [ordered]@{
      manifestFile = $script:HelperManifest.File; manifestSha256 = $script:HelperManifest.Sha256
      required = @($script:HelperManifest.Required); repoRoot = $script:Ms18dRoot
    }
    powershell = (Get-Process -Id $PID).Path; ownedProcesses = "$script:ToolsC\owned-processes.ps1"
  }
  foreach ($k in $PayloadRequest.Keys) {
    if (@('cellInfo', 'frozenArgs') -notcontains $k) { $request[$k] = $PayloadRequest[$k] }
  }
  if ($BindingFixture) { $request.bindingFixture = $BindingFixture }
  foreach ($k in $ExtraRequest.Keys) { $request[$k] = $ExtraRequest[$k] }
  $requestPath = Join-Path $runDir 'request.json'
  Write-OwnedJson -Path $requestPath -Object $request

  # the locked call: the verbatim shared helper runs the controller. Exit 1 is allowed for the helper only
  # for a payload type that defines it, and is accepted below only against result.json
  $failed = $null
  $global:LASTEXITCODE = $null
  $nodeArgs = @($script:ControllerPath, "--request=$requestPath")
  try {
    if ($allowExit1) {
      Invoke-Dv3Node -Task $Task -NodeArgs $nodeArgs -AllowExit1 | Out-Null
    } else {
      Invoke-Dv3Node -Task $Task -NodeArgs $nodeArgs | Out-Null
    }
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = [DateTimeOffset]::Now
  $exitCode = $global:LASTEXITCODE

  # a conservative verified release observation, after the helper returned
  $sharedLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
  $observed = $null
  $until = [DateTimeOffset]::Now.AddSeconds($script:ReleaseWaitSeconds)
  do {
    if (-not (Test-Path -LiteralPath $sharedLock)) { $observed = [DateTimeOffset]::Now; break }
    Start-Sleep -Milliseconds 100
  } while ([DateTimeOffset]::Now -lt $until)

  # the abnormal-exit verification: no process of the run is alive (the controller itself included)
  $barrier = Invoke-OwnedBarrier -RecordsFile (Join-Path $runDir 'pids.jsonl') -IncludeController `
    -ConfirmSeconds 10
  Write-OwnedJson -Path (Join-Path $runDir 'cleanup-wrapper.json') -Object $barrier

  $result = $null
  $resultFile = Join-Path $runDir 'result.json'
  if (Test-Path -LiteralPath $resultFile) {
    try { $result = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json } catch { $result = $null }
  }
  $problems = @()
  $helperNote = $null
  if ($failed) {
    # the shared helper throws for every nonzero exit but an allowed 1; that is expected when it is the
    # controller's own defined exit code (a hold, a stop), anything else (the 540 s limit, a slot race) is
    # a problem
    $sameExit = $failed -match 'command failed: (\d+)$' -and $null -ne $exitCode -and
      [int]$Matches[1] -eq $exitCode
    if ($sameExit) {
      $helperNote = $failed
    } else {
      $problems += $failed
    }
  }
  if ($null -eq $observed) { $problems += 'the shared lock file is still there after the helper returned' }
  if ($barrier.verdict -ne 'clean') { $problems += "the wrapper barrier verdict is $($barrier.verdict)" }
  $outcome = 'stop'
  if ($null -eq $result) {
    $problems += 'the controller wrote no result.json: the run is incomplete'
  } elseif ($null -eq $exitCode -or $exitCode -ne $result.controllerExit) {
    $problems += "the helper exit code $exitCode differs from the controller's $($result.controllerExit)"
  } elseif ($problems.Count -eq 0) {
    if ($result.outcome -eq 'success' -and $exitCode -eq 0) { $outcome = 'success' }
    elseif ($result.outcome -eq 'miss' -and $exitCode -eq 1 -and $allowExit1) { $outcome = 'miss' }
    elseif ($result.outcome -eq 'control-hold' -and $exitCode -eq 64 -and -not $result.payloadStarted) {
      $outcome = 'control-hold'
    } else { $problems += "the controller outcome '$($result.outcome)' with exit $exitCode is a stop" }
  }
  if ($problems.Count -gt 0) { $outcome = 'stop' }
  if ($Profile -eq 'gp-cell' -and $outcome -eq 'success') { $outcome = 'gp-success' }
  if ($Profile -eq 'gp-cell' -and $outcome -eq 'miss') { $outcome = 'gp-miss' }

  $startedFromChild = $null
  $acquisitionFile = Join-Path $runDir 'acquisition.json'
  if (Test-Path -LiteralPath $acquisitionFile) {
    $acq = Get-Content -LiteralPath $acquisitionFile -Raw | ConvertFrom-Json
    if ($acq.startedAtMs) {
      $startedAt = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$acq.startedAtMs).ToLocalTime()
      $startedFromChild = $startedAt.ToString($script:Stamp)
    }
  }
  $rel = $runDir
  if ($runDir.StartsWith($script:Ms18dRoot, [StringComparison]::OrdinalIgnoreCase)) {
    $rel = $runDir.Substring($script:Ms18dRoot.Length).TrimStart('\').Replace('\', '/')
  }
  $record = [ordered]@{
    schema = 'ms18d-c-run-1'; task = $Task; runId = $RunId; cell = $Cell; payload = $Profile
    chunkId = $(if ($PayloadRequest['chunk']) { $PayloadRequest['chunk'].chunkId } else { $null })
    attempt = $PayloadRequest['attempt']; scope = $PayloadRequest['scope']
    standin = [bool]$Standin; runDir = $rel; requestedAt = $asked.ToString($script:Stamp)
    slotBefore = $slot
    watch = [ordered]@{ firstCheckMs = $watch.firstCheckMs; lastCheckMs = $watch.lastCheckMs
      checks = $watch.checks; restartCount = $watch.restartCount; maxIntervalMs = $watch.maxIntervalMs }
    startedAtFromChild = $startedFromChild; finished = $finished.ToString($script:Stamp)
    releaseObservedAt = $(if ($observed) { $observed.ToString($script:Stamp) } else { $null })
    releaseVerified = [bool]$observed; releaseExact = $false; exit = $exitCode
    controllerOutcome = $(if ($result) { $result.outcome } else { $null })
    barrierVerdict = $barrier.verdict; helperNote = $helperNote; outcome = $outcome; problems = $problems
  }
  Write-RunRecord -Record $record -RunDir $runDir
  Write-Host ("LOCKED-C {0}: outcome={1} exit={2} barrier={3}{4}" -f $Task, $outcome, $exitCode,
    $barrier.verdict, $(if ($problems.Count -gt 0) { ' PROBLEMS ' + ($problems -join '; ') } else { '' }))
  if ($outcome -eq 'stop') {
    throw ("MS18d-C $Task STOP: $($problems -join '; '). Nothing is retried; report it for a ruling " +
      "(run $runDir).")
  }
  return [pscustomobject]@{ Outcome = $outcome; Exit = $exitCode; RunDir = $runDir; Result = $result
    Record = $record }
}

# The GP cell: one fresh original CLI process (stand-ins only since C0b: the final GP evidence is the raw-time
# recorder, Invoke-RecorderLocked).
function Invoke-GpLocked {
  param(
    [Parameter(Mandatory)][string]$Task,
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][string]$Cell,
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{}
  )
  return Invoke-PayloadLocked -Task $Task -RunId $RunId -Profile 'gp-cell' -Cell $Cell `
    -CampaignBase $CampaignBase -CommandArgs $CommandArgs -Standin:$Standin -ExecOverride $ExecOverride `
    -BindingFixture $BindingFixture -ExtraRequest $ExtraRequest
}

# The frozen chunk manifest as the wrapper reads it: the document and the references the request carries (the
# raw file digest and the canonical digest the document states; the controller verifies both).
function Read-PlanC {
  $file = Join-Path $script:RunRepo $script:PlanFileRel
  if (-not (Test-Path -LiteralPath $file)) { throw "MS18d-C: the chunk manifest $file does not exist" }
  $doc = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json -DateKind String
  return [pscustomobject]@{
    Doc = $doc
    Info = [ordered]@{
      file = $script:PlanFileRel
      rawSha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
      manifestSha256 = [string]$doc.manifestSha256
    }
  }
}

# One planned chunk of the final matrix: the raw-time recorder, in the declared slot of attempt 1 or 2 (a
# second attempt is allowed only by the controller's accounting, R4). The run id, the folder and the command
# line all come from the manifest.
function Invoke-RecorderLocked {
  param(
    [Parameter(Mandatory)][string]$ChunkId,
    [ValidateSet(1, 2)][int]$Attempt = 1,
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{}
  )
  $plan = Read-PlanC
  $chunk = @($plan.Doc.chunks | Where-Object { $_.chunkId -eq $ChunkId })
  if ($chunk.Count -ne 1) { throw "MS18d-C: $ChunkId is not a chunk of the manifest" }
  $c = $chunk[0]
  $slot = @($plan.Doc.runSlots | Where-Object {
      $_.role -eq 'chunk' -and $_.chunkId -eq $ChunkId -and $_.attempt -eq $Attempt })
  if ($slot.Count -ne 1) { throw "MS18d-C: no declared slot for $ChunkId attempt $Attempt" }
  $out = '..\' + ($slot[0].dir -replace '/', '\') + '\ledger.json'
  $payload = [ordered]@{
    chunk = $c; attempt = $Attempt; plan = $plan.Info; policy = $plan.Doc.policy
    cellInfo = [ordered]@{ variant = [string]$c.variant; level = [string]$c.level; targetMs = [int]$c.target }
    frozenArgs = @($script:RecorderRel, "--plan=$($script:PlanFileRel)", "--chunk=$ChunkId", "--out=$out")
  }
  return Invoke-PayloadLocked -Task "MS18d GP record $ChunkId a$Attempt" -RunId $slot[0].runId `
    -Profile 'gp-recorder' -Cell ([string]$c.cell) -CampaignBase $CampaignBase -CommandArgs $CommandArgs `
    -Standin:$Standin -ExecOverride $ExecOverride -BindingFixture $BindingFixture `
    -ExtraRequest $ExtraRequest -PayloadRequest $payload -RunFolder "$($c.variant)-$($c.level)"
}

# The check-only merge: the one final all-79 merge, or (when the manifest declares the slot) a selected cell.
function Invoke-MergeLocked {
  param(
    [Parameter(Mandatory)][string]$Scope,
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{}
  )
  $plan = Read-PlanC
  if ($Scope -eq 'all-79') {
    $slot = @($plan.Doc.runSlots | Where-Object { $_.role -eq 'final-merge' })
    $folder = 'all-79'
  } elseif ($Scope -match '^cell:([A-Za-z0-9]+)/([A-Za-z0-9]+)$') {
    $cell = "$($Matches[1])/$($Matches[2])"
    $slot = @($plan.Doc.runSlots | Where-Object { $_.role -eq 'cell-merge' -and $_.cell -eq $cell })
    $folder = "$($Matches[1])-$($Matches[2])"
  } else {
    throw "MS18d-C: the merge scope is all-79 or cell:<variant>/<level>, not '$Scope'"
  }
  if ($slot.Count -ne 1) { throw "MS18d-C: the manifest declares no merge slot for $Scope" }
  $out = '..\' + ($slot[0].dir -replace '/', '\') + '\report.json'
  $gate = [ordered]@{ cells = [int]$plan.Doc.gate.cells
    requiredSuccesses = [int]$plan.Doc.gate.requiredSuccesses }
  $payload = [ordered]@{
    scope = $Scope; plan = $plan.Info; policy = $plan.Doc.policy; gate = $gate
    cellInfo = $null
    frozenArgs = @($script:MergeRel, "--plan=$($script:PlanFileRel)", "--scope=$Scope", "--out=$out")
  }
  return Invoke-PayloadLocked -Task "MS18d GP merge $Scope" -RunId $slot[0].runId -Profile 'gp-merge' `
    -CampaignBase $CampaignBase -CommandArgs $CommandArgs -Standin:$Standin -ExecOverride $ExecOverride `
    -BindingFixture $BindingFixture -ExtraRequest $ExtraRequest -PayloadRequest $payload -RunFolder $folder
}
