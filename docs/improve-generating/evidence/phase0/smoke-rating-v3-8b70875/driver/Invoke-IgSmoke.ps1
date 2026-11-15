<#
.SYNOPSIS
  Smoke-only compatibility supervisor: the improve-generating phase-0 harness against another source tree.

.DESCRIPTION
  Runs three wrapper admissions, each released before the next, through the supplied low-priority wrapper
  (Invoke-IgNode, sourced from -LockHelper; this script owns no lock and implements none):

    1. IG-S01/smoke-inventory  source-list and fingerprint inspection, source-only adapter dry runs, plan-only of
                               IG-S01..IG-S10 and the explicit engine-free test entry points, as time permits
    2. IG-S01/self-test        the existing synthetic self-test (supervised child)
    3. IG-S01/loader-parity    the existing four-row shard, only after the self-test passed (supervised child)

  Every admission launches smoke-inventory.cjs or smoke-supervise.cjs, which spawn the real work as child processes,
  enforce the payload deadline from their own process start, terminate only the children they spawned (by PID) and
  verify that they are gone. The wrapper and its 300 s backstop are never touched.

  Accounting (-BudgetMs is a hard cap, no extension): each admission is charged its occupied time from the wrapper's
  own receipt plus 45 s of quiet-admission grace; priority waits are recorded and never charged. Before an admission
  the payload deadline is reserved from what is left after this admission's grace and cleanup reserve and after the
  grace, cleanup reserve and minimum payload of every later phase; a phase that cannot get its minimum is recorded as
  unstarted. The request time is captured before the wrapper call waits. A child's own command.json is referenced in
  the ledger (charged once). Nothing is written into any closed round and no git command except the read-only
  rev-parse and status is run.

    & '<harness>\Invoke-IgSmoke.ps1' -Round 'smoke-rating-v3-8b70875' -TargetCommit '8b70875e1839d7f2753d20853a4a0c9226cf2035' `
      -BudgetMs 180000 -MaxPayloadMs 25000 -LockHelper '<ig-lock.ps1>'

  -PlanOnly prints the reservation arithmetic and starts nothing.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$Round,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$TargetCommit,
  [Parameter(Mandatory)][ValidateRange(1, 180000)][int]$BudgetMs,
  [Parameter(Mandatory)][ValidateRange(1000, 180000)][int]$MaxPayloadMs,
  [Parameter(Mandatory)][string]$LockHelper,
  [string]$ArchiveRoot = 'Q:\git\sudoku.improve-generating\docs\improve-generating\evidence\phase0',
  [string]$ReferenceRoot = 'Q:\git\sudoku.improve-generating',
  [string]$ForbiddenRoot = 'Q:\git\sudoku',
  [switch]$PlanOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$GraceMs = 45000
$CleanupReserveMs = 1000
$MaxAdmissions = 3
$startedAtScript = [DateTime]::UtcNow
$startLocation = (Get-Location).Path
$harness = $PSScriptRoot
$smokeRoot = [IO.Path]::GetFullPath((Join-Path $harness '..\..\..\..\..')).TrimEnd('\')
$evidenceRel = 'docs\improve-generating\evidence\phase0'
$smokeRound = Join-Path $smokeRoot (Join-Path $evidenceRel $Round)
$archive = Join-Path $ArchiveRoot $Round
$runtimeLabel = "rating-v3@$TargetCommit"
$utf8 = New-Object Text.UTF8Encoding $false

$phases = @(
  @{ key = 'smoke-inventory'; wrapperTask = 'IG-S01/smoke-inventory'; minPayloadMs = 2000 },
  @{ key = 'self-test'; wrapperTask = 'IG-S01/self-test'; minPayloadMs = 15000 },
  @{ key = 'loader-parity'; wrapperTask = 'IG-S01/loader-parity'; minPayloadMs = 23000 }
)

function Get-NormalizedPath([string]$Path) {
  return [IO.Path]::GetFullPath($Path).TrimEnd('\').ToLowerInvariant()
}

function Write-TextFile([string]$Path, [string]$Text) {
  $lines = ($Text -replace "`r`n", "`n" -replace "`r", "`n") -split "`n" | ForEach-Object { $_.TrimEnd() }
  $body = ((($lines -join "`n").TrimEnd("`n")) + "`n") -replace "`n", "`r`n"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  [IO.File]::WriteAllText($Path, $body, $utf8)
}

function Write-JsonFile([string]$Path, $Value) {
  Write-TextFile $Path ($Value | ConvertTo-Json -Depth 60)
}

function Read-JsonFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 60)
}

function Get-FileSha([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function ConvertTo-UtcDate($Value) {
  if ($Value -is [DateTime]) { return $Value.ToUniversalTime() }
  $styles = [Globalization.DateTimeStyles]::AdjustToUniversal -bor [Globalization.DateTimeStyles]::AssumeUniversal
  return [DateTime]::Parse([string]$Value, [Globalization.CultureInfo]::InvariantCulture, $styles)
}

function Get-GitState([string]$Root) {
  $head = (& git --no-pager -C $Root rev-parse HEAD 2>&1 | Out-String).Trim()
  $status = @(& git --no-pager -C $Root status --short 2>&1 | ForEach-Object { "$_" })
  return [ordered]@{
    root = $Root; head = $head; statusShort = $status
    trackedChanges = @($status | Where-Object { $_ -notmatch '^\?\?' })
    untracked = @($status | Where-Object { $_ -match '^\?\?' })
  }
}

# The payload deadline reserved for a phase: what is left after this admission's grace and cleanup reserve and after
# the grace, cleanup reserve and minimum payload of every later phase, capped by -MaxPayloadMs.
function Get-Reservation([int]$Index, [int]$Charged) {
  $later = 0
  for ($j = $Index + 1; $j -lt $phases.Count; $j++) { $later += $GraceMs + $CleanupReserveMs + $phases[$j].minPayloadMs }
  $remaining = $BudgetMs - $Charged
  $available = $remaining - ($GraceMs + $CleanupReserveMs) - $later
  $payload = [int][Math]::Min($MaxPayloadMs, $available)
  return [ordered]@{
    phase = $phases[$Index].key; remainingBeforeMs = $remaining; graceMs = $GraceMs
    cleanupReserveMs = $CleanupReserveMs; laterPhasesReservedMs = $later; availablePayloadMs = $available
    maxPayloadMs = $MaxPayloadMs; payloadMs = $payload; minPayloadMs = $phases[$Index].minPayloadMs
    canAdmit = ($payload -ge $phases[$Index].minPayloadMs)
  }
}

# --- preflight -------------------------------------------------------------------------------------------------

if ((Get-NormalizedPath $smokeRoot) -eq (Get-NormalizedPath $ReferenceRoot) -or
    (Get-NormalizedPath $smokeRoot) -eq (Get-NormalizedPath $ForbiddenRoot)) {
  throw "The harness lives in $smokeRoot, which is a forbidden root; run the smoke copy inside its own worktree"
}
if (-not (Test-Path -LiteralPath (Join-Path $smokeRoot 'generator\tests\node-runner.js'))) { throw "Not a sudoku worktree: $smokeRoot" }

if ($PlanOnly) {
  $nominal = @(); $worst = @(); $chargedNominal = 0; $chargedWorst = 0
  for ($i = 0; $i -lt $phases.Count; $i++) {
    $nominal += , (Get-Reservation $i $chargedNominal)
    $w = Get-Reservation $i $chargedWorst
    $worst += , $w
    $chargedWorst += $GraceMs + [Math]::Max(0, $w.payloadMs) + $CleanupReserveMs
    $chargedNominal += $GraceMs
  }
  [ordered]@{ budgetMs = $BudgetMs; graceMsPerAdmission = $GraceMs; cleanupReserveMs = $CleanupReserveMs
    occupiedBudgetMs = $BudgetMs - $MaxAdmissions * $GraceMs; ifEarlierPhasesTakeNoTime = $nominal
    ifEarlierPhasesTakeTheirWholeDeadline = $worst } | ConvertTo-Json -Depth 10
  return
}

if (-not (Test-Path -LiteralPath $LockHelper)) { throw "Lock helper not found: $LockHelper" }
if (Test-Path -LiteralPath $archive) { throw "The smoke archive already exists (a smoke is never rerun into it): $archive" }
if (Test-Path -LiteralPath $smokeRound) { throw "The smoke worktree already holds evidence for this round: $smokeRound" }
if (-not (Test-Path -LiteralPath $ArchiveRoot)) { throw "Archive root not found: $ArchiveRoot" }
$gitBefore = Get-GitState $smokeRoot
if ($gitBefore.head -ne $TargetCommit) { throw "The smoke worktree is at $($gitBefore.head), not $TargetCommit" }
$referenceHead = (& git --no-pager -C $ReferenceRoot rev-parse HEAD 2>&1 | Out-String).Trim()

. $LockHelper
if (-not (Get-Command Invoke-IgNode -ErrorAction SilentlyContinue)) { throw 'The lock helper does not define Invoke-IgNode' }

$driverFiles = @(Get-ChildItem -LiteralPath $harness -File | Where-Object { $_.Name -match '^(Invoke-IgSmoke\.ps1|smoke-[a-z-]+\.cjs)$' })
$ledgerPath = Join-Path $archive 'ledger.json'
$script:charged = 0
$script:admissions = 0
$script:entries = @()
$script:skipped = @()
$script:fatal = $null

function Save-Ledger {
  $occupied = 0; $wait = 0
  foreach ($e in $script:entries) { $occupied += $e.occupiedMs; $wait += $e.priorityWaitMs }
  Write-JsonFile $ledgerPath ([ordered]@{
    schema = 'ig-s-ledger/1'; round = $Round
    kind = 'compatibility smoke (not a pack round); no entry or charge belongs to provisional-r1'
    targetCommit = $TargetCommit; budgetMs = $BudgetMs; graceMsPerAdmission = $GraceMs
    maxAdmissions = $MaxAdmissions; maxPayloadMs = $MaxPayloadMs; cleanupReserveMs = $CleanupReserveMs
    entries = @($script:entries); approvals = @(); skipped = @($script:skipped)
    totals = [ordered]@{ admissions = $script:admissions; occupiedMs = $occupied
      chargedGraceMs = $script:admissions * $GraceMs; chargedMs = $script:charged
      remainingMs = $BudgetMs - $script:charged; overrun = ($script:charged -gt $BudgetMs)
      priorityWaitMsExcluded = $wait }
  })
}

function Copy-Tree([string]$From, [string]$To) {
  if (-not (Test-Path -LiteralPath $From)) { return }
  New-Item -ItemType Directory -Force -Path $To | Out-Null
  Copy-Item -Path (Join-Path $From '*') -Destination $To -Recurse -Force
}

function Get-PhaseArgs($Phase, [int]$PayloadMs, [string]$OutDir, [string]$RequestedAt) {
  $sup = Join-Path $harness 'smoke-supervise.cjs'
  switch ($Phase.key) {
    'smoke-inventory' {
      return @((Join-Path $harness 'smoke-inventory.cjs'), "--round=$Round", "--out-dir=$OutDir", "--payload-ms=$PayloadMs",
        "--expect-root=$smokeRoot", "--reference-root=$ReferenceRoot", "--forbidden-roots=$ForbiddenRoot|$ReferenceRoot",
        "--target-commit=$TargetCommit", "--runtime-label=$runtimeLabel")
    }
    'self-test' {
      return @($sup, '--phase=self-test', '--wrapper-task=IG-S01/self-test', "--round=$Round", "--out-dir=$OutDir",
        "--payload-ms=$PayloadMs", '--', (Join-Path $harness 'self-test.cjs'), '--task=IG-S01', "--round=$Round", '--attempt=a1')
    }
    'loader-parity' {
      return @($sup, '--phase=loader-parity', '--wrapper-task=IG-S01/loader-parity', "--round=$Round", "--out-dir=$OutDir",
        "--payload-ms=$PayloadMs", '--', (Join-Path $harness 'run.cjs'), '--task=IG-S01', "--round=$Round",
        '--shard=loader-parity', '--attempt=a1', "--deadline-ms=$PayloadMs", "--runtime-label=$runtimeLabel",
        "--lock-helper=$LockHelper", "--requested-at=$RequestedAt")
    }
  }
}

# One admission: the supplied Invoke-IgNode once, the request time taken before it can wait, the receipt for the time.
function Invoke-SmokePhase([int]$Index, $Reservation) {
  $phase = $phases[$Index]
  $outDir = Join-Path $smokeRound (Join-Path 'smoke' $phase.key)
  $requested = [DateTime]::UtcNow
  $nodeArgs = Get-PhaseArgs $phase $Reservation.payloadMs $outDir $requested.ToString('o')
  Write-Host ("[{0}] request {1}: payload deadline {2} ms, remaining before {3} ms" -f $phase.key,
    $requested.ToString('o'), $Reservation.payloadMs, $Reservation.remainingBeforeMs)
  Set-Location -LiteralPath $smokeRoot
  $failure = $null
  try {
    Invoke-IgNode -Repo sudoku -Task $phase.wrapperTask -NodeArgs $nodeArgs -InformationVariable wrapperInfo | Out-Null
  } catch {
    $failure = $_
  }
  $ended = [DateTime]::UtcNow
  $infoText = ''
  if (Test-Path variable:wrapperInfo) { $infoText = (@($wrapperInfo) | ForEach-Object { "$($_.MessageData)" }) -join "`n" }
  $receipt = $null; $wrapperExit = $null; $wrapperSeconds = $null
  if ($infoText -match 'IG [^\r\n]*exit=(\d+) seconds=([0-9.]+)') {
    $receipt = $Matches[0]
    $wrapperExit = [int]$Matches[1]
    $wrapperSeconds = [double]::Parse($Matches[2], [Globalization.CultureInfo]::InvariantCulture)
  }
  $hardLimit = ($null -ne $failure) -and ($failure.ToString() -match 'limit reached')
  $supervisorFile = Join-Path $outDir 'supervisor.json'
  $sup = Read-JsonFile $supervisorFile
  $admitted = ($null -ne $wrapperSeconds) -or $hardLimit -or ($null -ne $sup)
  $occupiedSource = 'wrapper receipt'
  if ($hardLimit) { $occupiedMs = 300000; $occupiedSource = 'wrapper 300 s backstop' }
  elseif ($null -ne $wrapperSeconds) { $occupiedMs = [int][Math]::Ceiling($wrapperSeconds * 1000) }
  elseif ($null -ne $sup) { $occupiedMs = [int][Math]::Ceiling($sup.timing.endedAtMs) + 500; $occupiedSource = 'supervisor estimate (no wrapper receipt)' }
  else { $occupiedMs = 0; $occupiedSource = 'not admitted' }
  $admittedUtc = $null
  if ($null -ne $sup) { $admittedUtc = ConvertTo-UtcDate $sup.process.startedAt }
  $admittedAt = if ($null -ne $admittedUtc) { $admittedUtc.ToString('o') } else { $null }
  $waitMs = [int][Math]::Max(0, ($ended - $requested).TotalMilliseconds - $occupiedMs)
  $waitToAdmissionMs = $null
  if ($null -ne $admittedUtc) { $waitToAdmissionMs = [int][Math]::Max(0, ($admittedUtc - $requested).TotalMilliseconds) }
  $charged = if ($admitted) { $occupiedMs + $GraceMs } else { 0 }
  return [ordered]@{
    phase = $phase.key; wrapperTask = $phase.wrapperTask; requestedAt = $requested.ToString('o')
    admittedAt = $admittedAt; endedAt = $ended.ToString('o'); wrapperReceipt = $receipt; wrapperExit = $wrapperExit
    wrapperSeconds = $wrapperSeconds; occupiedMs = $occupiedMs; occupiedSource = $occupiedSource
    chargedGraceMs = $(if ($admitted) { $GraceMs } else { 0 }); chargedMs = $charged
    priorityWaitMs = $waitMs; priorityWaitToAdmissionMs = $waitToAdmissionMs; admitted = $admitted
    payloadDeadlineMs = $Reservation.payloadMs; reservation = $Reservation
    wrapperFailure = $(if ($null -ne $failure) { $failure.ToString() } else { $null })
    supervisorResult = "smoke/$($phase.key)/supervisor.json"; supervisorFound = ($null -ne $sup)
    supervisor = $sup
  }
}

function Get-PhaseVerdict($Phase, $Result) {
  $sup = $Result.supervisor
  $child = $null
  if ($null -ne $sup) { $child = @($sup.units)[0] }
  $unverified = ($null -ne $sup) -and ($sup.summary.terminations -gt $sup.summary.terminationsVerified)
  switch ($Phase.key) {
    'smoke-inventory' { return [ordered]@{ ok = ($null -ne $sup); unverifiedTermination = $unverified; detail = $(if ($null -ne $sup) { $sup.summary } else { $null }) } }
    'self-test' {
      $cmd = Read-JsonFile (Join-Path $smokeRound 'IG-S01\self-test\command.json')
      $passed = ($null -ne $child) -and ($child.status -eq 'passed') -and ($null -ne $cmd) -and
        ($cmd.status -eq 'complete') -and ($cmd.selfTestPassed -eq $true)
      return [ordered]@{ ok = $passed; unverifiedTermination = $unverified
        detail = [ordered]@{ childStatus = $(if ($child) { $child.status } else { $null }); commandStatus = $(if ($cmd) { $cmd.status } else { $null }) } }
    }
    'loader-parity' {
      $cmd = Read-JsonFile (Join-Path $smokeRound 'IG-S01\loader-parity\command.json')
      return [ordered]@{ ok = ($null -ne $child) -and ($child.status -eq 'passed'); unverifiedTermination = $unverified
        detail = [ordered]@{ childStatus = $(if ($child) { $child.status } else { $null }); commandStatus = $(if ($cmd) { $cmd.status } else { $null })
          unstartedKeys = $(if ($cmd) { @($cmd.unstartedKeys) } else { $null }) } }
    }
  }
}

# --- run -------------------------------------------------------------------------------------------------------

try {
  New-Item -ItemType Directory -Force -Path $archive | Out-Null
  foreach ($f in $driverFiles) {
    New-Item -ItemType Directory -Force -Path (Join-Path $archive 'driver') | Out-Null
    Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $archive (Join-Path 'driver' $f.Name)) -Force
  }
  Write-JsonFile (Join-Path $archive 'preflight.json') ([ordered]@{
    schema = 'ig-smoke-preflight/1'; round = $Round; startedAt = $startedAtScript.ToString('o')
    parameters = [ordered]@{ budgetMs = $BudgetMs; maxPayloadMs = $MaxPayloadMs; lockHelper = $LockHelper; targetCommit = $TargetCommit
      archive = $archive; referenceRoot = $ReferenceRoot; forbiddenRoot = $ForbiddenRoot; runtimeLabel = $runtimeLabel }
    paths = [ordered]@{ harness = $harness; smokeRoot = $smokeRoot; smokeRound = $smokeRound }
    machine = [ordered]@{ processors = [Environment]::ProcessorCount; os = [Environment]::OSVersion.VersionString; powershell = $PSVersionTable.PSVersion.ToString() }
    git = [ordered]@{ smokeWorktreeBefore = $gitBefore; referenceHead = $referenceHead }
    accounting = [ordered]@{ graceMs = $GraceMs; cleanupReserveMs = $CleanupReserveMs; maxAdmissions = $MaxAdmissions
      minPayloadMs = [ordered]@{ 'smoke-inventory' = 2000; 'self-test' = 15000; 'loader-parity' = 23000 }
      basis = 'self-test: SELF_TEST_ESTIMATE_MS of run.cjs; loader-parity: GUARDS.minWindowMs + GUARDS.finalizeReserveMs, the smallest --deadline-ms run.cjs accepts' }
    driverFiles = @($driverFiles | ForEach-Object { [ordered]@{ file = $_.Name; sha256 = Get-FileSha $_.FullName } })
  })
  Save-Ledger

  $selfTestPassed = $false
  $stop = $null
  for ($i = 0; $i -lt $phases.Count; $i++) {
    $phase = $phases[$i]
    if ($null -ne $stop) {
      $script:skipped += , [ordered]@{ phase = $phase.key; reason = $stop; charged = 0 }
      continue
    }
    if ($phase.key -eq 'loader-parity' -and -not $selfTestPassed) {
      $script:skipped += , [ordered]@{ phase = $phase.key; reason = 'the self-test did not pass (or was not completed): loader-parity runs only after it passed'; charged = 0 }
      continue
    }
    $reservation = Get-Reservation $i $script:charged
    if (-not $reservation.canAdmit -or $script:admissions -ge $MaxAdmissions) {
      $script:skipped += , [ordered]@{ phase = $phase.key; reason = 'budget: the reserved payload of ' + $reservation.payloadMs + ' ms is below the minimum of ' + $phase.minPayloadMs + ' ms (or the admission limit)'; reservation = $reservation; charged = 0 }
      continue
    }
    $result = Invoke-SmokePhase $i $reservation
    $verdict = Get-PhaseVerdict $phase $result
    if ($result.admitted) {
      $script:admissions++
      $script:charged += $result.chargedMs
    }
    $commandRel = $null
    if ($phase.key -ne 'smoke-inventory') { $commandRel = "IG-S01/$($phase.key)/command.json" }
    $entry = [ordered]@{ seq = $script:entries.Count + 1; task = 'IG-S01'; round = $Round; shard = $phase.key; attemptId = 'a1'
      wrapperTask = $phase.wrapperTask }
    foreach ($k in 'requestedAt', 'admittedAt', 'endedAt', 'wrapperReceipt', 'wrapperExit', 'wrapperSeconds', 'occupiedMs', 'occupiedSource',
      'chargedGraceMs', 'chargedMs', 'priorityWaitMs', 'priorityWaitToAdmissionMs', 'payloadDeadlineMs', 'reservation') { $entry[$k] = $result[$k] }
    $entry.status = $(if ($verdict.ok) { 'ok' } elseif ($null -ne $result.supervisor) { 'completed-with-findings' } else { 'wrapper-failed' })
    $entry.commandJson = $commandRel
    $entry.supervisorResult = $result.supervisorResult
    $entry.verdict = $verdict
    $entry.note = $result.wrapperFailure
    if ($result.admitted) { $script:entries += , $entry }
    else { $script:skipped += , [ordered]@{ phase = $phase.key; reason = 'the wrapper did not admit the command: ' + $result.wrapperFailure; charged = 0 } }
    Save-Ledger
    Copy-Tree (Join-Path $smokeRound "smoke\$($phase.key)") (Join-Path $archive "smoke\$($phase.key)")
    if ($phase.key -ne 'smoke-inventory') { Copy-Tree (Join-Path $smokeRound "IG-S01\$($phase.key)") (Join-Path $archive "IG-S01\$($phase.key)") }
    if ($phase.key -eq 'self-test') { $selfTestPassed = [bool]$verdict.ok }
    if ($verdict.unverifiedTermination) { $stop = 'a child process could not be verified as terminated in the previous phase' }
    elseif (-not $result.admitted) { $stop = 'the wrapper did not admit the previous phase' }
    elseif ($null -ne $result.wrapperExit -and $result.wrapperExit -ne 0 -and $null -eq $result.supervisor) { $stop = 'the previous phase failed in its supervisor' }
    Write-Host ("[{0}] done: {1}, occupied {2} ms ({3}), charged {4} ms, total charged {5}/{6} ms, wait {7} ms" -f $phase.key, $entry.status,
      $result.occupiedMs, $result.occupiedSource, $result.chargedMs, $script:charged, $BudgetMs, $result.priorityWaitMs)
  }
} catch {
  $script:fatal = $_.ToString()
  Write-Host "FATAL: $script:fatal"
} finally {
  Set-Location -LiteralPath $startLocation
}

# --- postflight, report, hash manifest -------------------------------------------------------------------------------

try {
  Save-Ledger
  $gitAfter = Get-GitState $smokeRoot
  Write-JsonFile (Join-Path $archive 'postflight.json') ([ordered]@{
    schema = 'ig-smoke-postflight/1'; round = $Round; endedAt = [DateTime]::UtcNow.ToString('o'); fatal = $script:fatal
    git = [ordered]@{ smokeWorktreeAfter = $gitAfter; headUnchanged = ($gitAfter.head -eq $TargetCommit)
      trackedFilesUnchanged = (@($gitAfter.trackedChanges).Count -eq 0); statusBeforeUntracked = @($gitBefore.untracked) }
    driverUnchanged = @($driverFiles | ForEach-Object {
      $copy = Join-Path $archive (Join-Path 'driver' $_.Name)
      [ordered]@{ file = $_.Name; sourceSha256 = Get-FileSha $_.FullName; archiveSha256 = $(if (Test-Path -LiteralPath $copy) { Get-FileSha $copy } else { $null }) } })
  })
  & node (Join-Path $harness 'smoke-report.cjs') "--archive=$archive" "--round=$Round" "--target-commit=$TargetCommit"
  if ($LASTEXITCODE -ne 0) { Write-Host "smoke-report.cjs exit $LASTEXITCODE" }

  $files = @(Get-ChildItem -LiteralPath $archive -Recurse -File | Where-Object { $_.Name -ne 'hash-manifest.json' } | Sort-Object FullName)
  $entriesOut = @($files | ForEach-Object {
    [ordered]@{ file = $_.FullName.Substring($archive.Length + 1).Replace('\', '/'); bytes = $_.Length; sha256 = Get-FileSha $_.FullName } })
  # Verification: every archived copy of a source is compared with the source it was copied from.
  $problems = @()
  foreach ($f in $driverFiles) {
    $copy = Join-Path $archive (Join-Path 'driver' $f.Name)
    if (-not (Test-Path -LiteralPath $copy) -or (Get-FileSha $copy) -ne (Get-FileSha $f.FullName)) { $problems += "driver/$($f.Name) differs from its source" }
  }
  $pairs = @()
  foreach ($p in $phases) {
    $pairs += , @((Join-Path $smokeRound "smoke\$($p.key)"), (Join-Path $archive "smoke\$($p.key)"))
    if ($p.key -ne 'smoke-inventory') { $pairs += , @((Join-Path $smokeRound "IG-S01\$($p.key)"), (Join-Path $archive "IG-S01\$($p.key)")) }
  }
  $compared = 0
  foreach ($pair in $pairs) {
    if (-not (Test-Path -LiteralPath $pair[0])) { continue }
    foreach ($src in (Get-ChildItem -LiteralPath $pair[0] -Recurse -File)) {
      $rel = $src.FullName.Substring($pair[0].Length + 1)
      $dst = Join-Path $pair[1] $rel
      $compared++
      if (-not (Test-Path -LiteralPath $dst) -or (Get-FileSha $dst) -ne (Get-FileSha $src.FullName)) { $problems += "$($pair[1])\$rel differs from its source" }
    }
  }
  Write-JsonFile (Join-Path $archive 'hash-manifest.json') ([ordered]@{
    schema = 'ig-smoke-hash-manifest/1'; round = $Round; algorithm = 'SHA-256'; fileCount = $entriesOut.Count
    note = 'every archive file except this manifest; the manifest hash is reported out of band'
    verification = [ordered]@{ copiesComparedWithSource = $compared; driverFilesCompared = @($driverFiles).Count; problems = @($problems); ok = (@($problems).Count -eq 0) }
    files = $entriesOut })
  Write-Host ("archive {0}: {1} files hashed, verification {2}" -f $archive, $entriesOut.Count, $(if (@($problems).Count -eq 0) { 'ok' } else { 'PROBLEMS: ' + ($problems -join '; ') }))
} catch {
  Write-Host "POSTFLIGHT FAILED: $($_.ToString())"
  $script:fatal = "$script:fatal | postflight: $($_.ToString())"
} finally {
  Set-Location -LiteralPath $startLocation
}
Write-Host ("smoke ended {0}: charged {1}/{2} ms in {3} admission(s)" -f [DateTime]::UtcNow.ToString('o'), $script:charged, $BudgetMs, $script:admissions)
if ($null -ne $script:fatal) { exit 1 }
exit 0
