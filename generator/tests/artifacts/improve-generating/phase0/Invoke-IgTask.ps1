<#
.SYNOPSIS
  Dispatcher of the improve-generating phase-0 prototype pack: the one documented command of a task.

.DESCRIPTION
  Expands the task's manifest into shards, runs each shard through the supplied low-priority wrapper
  (Invoke-IgNode, sourced from -LockHelper, once per command and released between commands) and keeps the
  budget ledger. It owns no lock file and implements no lock. -PlanOnly loads no engine and times nothing.
  Every result is provisional (pre-freeze) unless a validated frozen receipt says otherwise.

  Run it from the repository root (the repository is derived from this script's location):

    & '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S01 -Round provisional-r1

  A productive pause (the remaining task/round budget or the command window cannot admit more work) exits 0 and
  says "paused-unstarted"; an incorrect result exits 1; an unsupported source or plan exits 2. A started row is
  never retried: -ResumeUnstarted <command.json> hands only never-started keys to a new attempt.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^IG-S(0[1-9]|10)$')][string]$Task,
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$Round,
  [string]$FreezeReceipt,
  [string]$BudgetReceipt,
  [string]$LockHelper = (Join-Path $env:USERPROFILE '.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'),
  [switch]$PlanOnly,
  [string]$ResumeUnstarted,
  [ValidatePattern('^a[1-9][0-9]{0,2}$')][string]$Attempt,
  [string]$RuntimeLabel,
  [string[]]$Shard
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$startLocation = (Get-Location).Path
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..\..'))
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'generator\tests\node-runner.js'))) {
  throw "Not a sudoku worktree: $repoRoot"
}
$relHarness = 'generator\tests\artifacts\improve-generating\phase0'

function Resolve-Given([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
  if ([IO.Path]::IsPathRooted($Path)) { return $Path }
  return [IO.Path]::GetFullPath((Join-Path $startLocation $Path))
}

$freezePath = Resolve-Given $FreezeReceipt
$budgetPath = Resolve-Given $BudgetReceipt
$resumePath = Resolve-Given $ResumeUnstarted
$helperPath = Resolve-Given $LockHelper

function Get-ReceiptArgs {
  $extra = @()
  if ($RuntimeLabel) { $extra += "--runtime-label=$RuntimeLabel" }
  if ($freezePath) { $extra += "--freeze-receipt=$freezePath" }
  if ($budgetPath) { $extra += "--budget-receipt=$budgetPath" }
  return $extra
}

# The only unwrapped node call: it reads and hashes sources and writes nothing, loads no engine and times nothing.
function Get-IgPlan {
  $nodeArgs = @((Join-Path $relHarness 'run.cjs'), "--task=$Task", "--round=$Round", '--plan-only') + (Get-ReceiptArgs)
  $text = & node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "plan-only failed with exit $LASTEXITCODE" }
  return (($text -join "`n") | ConvertFrom-Json -Depth 40)
}

function Write-IgLedger($Plan, [hashtable]$Entry) {
  $ledgerPath = Join-Path $repoRoot ($Plan.ledgerPath -replace '/', '\')
  if (Test-Path -LiteralPath $ledgerPath) {
    $ledger = Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json -Depth 40 -AsHashtable
  } else {
    $ledger = @{ schema = 'ig-s-ledger/1'; round = $Round; entries = @(); approvals = @() }
  }
  $Entry.seq = @($ledger.entries).Count + 1
  $ledger.entries = @($ledger.entries) + @($Entry)
  $text = $ledger | ConvertTo-Json -Depth 40
  $text = ((($text -split "\r?\n") | ForEach-Object { $_.TrimEnd() }) -join "`r`n").TrimEnd() + "`r`n"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ledgerPath) | Out-Null
  $partial = "$ledgerPath.partial"
  [IO.File]::WriteAllText($partial, $text, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $partial -Destination $ledgerPath -Force
}

# One wrapper command: the supplied Invoke-IgNode, the machine time of its own accounting and the ledger entry.
function Invoke-IgShard($Plan, $ShardPlan, [string]$AttemptId, [string]$ResumeFrom) {
  $wrapperTask = "$Task/$($ShardPlan.shard)"
  $requested = [DateTime]::UtcNow
  if ($ShardPlan.kind -eq 'synthetic') {
    $nodeArgs = @((Join-Path $relHarness 'self-test.cjs'), "--task=$Task", "--round=$Round", "--attempt=$AttemptId")
  } else {
    $nodeArgs = @((Join-Path $relHarness 'run.cjs'), "--task=$Task", "--round=$Round", "--shard=$($ShardPlan.shard)",
      "--attempt=$AttemptId", "--deadline-ms=$($Plan.budget.effectiveDeadlineMs)", "--lock-helper=$helperPath",
      "--requested-at=$($requested.ToString('o'))") + (Get-ReceiptArgs)
    if ($ResumeFrom) { $nodeArgs += "--resume=$ResumeFrom" }
  }
  $failure = $null
  try {
    Invoke-IgNode -Repo sudoku -Task $wrapperTask -NodeArgs $nodeArgs -InformationVariable wrapperInfo | Out-Null
  } catch {
    $failure = $_
  }
  $ended = [DateTime]::UtcNow
  $infoText = ''
  if (Test-Path variable:wrapperInfo) {
    $infoText = (@($wrapperInfo) | ForEach-Object { "$($_.MessageData)" }) -join "`n"
  }
  $wrapperExit = $null
  $wrapperSeconds = $null
  if ($infoText -match 'exit=(\d+) seconds=([0-9.]+)') {
    $wrapperExit = [int]$Matches[1]
    $wrapperSeconds = [double]::Parse($Matches[2], [Globalization.CultureInfo]::InvariantCulture)
  }
  $hardLimit = ($null -ne $failure) -and ($failure.ToString() -match 'limit reached')
  if ($hardLimit) { $occupiedMs = 300000 }
  elseif ($null -ne $wrapperSeconds) { $occupiedMs = [int][math]::Ceiling($wrapperSeconds * 1000) }
  else { $occupiedMs = 0 }
  $graceMs = 45000
  $dirRel = $ShardPlan.dirRel -replace '/', '\'
  $shardDir = Join-Path $repoRoot $dirRel
  $attemptDir = if ($AttemptId -eq 'a1') { $shardDir } else { Join-Path $shardDir $AttemptId }
  $commandFile = Join-Path $attemptDir 'command.json'
  $command = $null
  if (Test-Path -LiteralPath $commandFile) {
    $command = Get-Content -LiteralPath $commandFile -Raw | ConvertFrom-Json -Depth 40
  }
  $roundRel = $ShardPlan.dirRel -replace '^.*?/phase0/[^/]+/', ''
  $commandRel = if ($AttemptId -eq 'a1') { "$roundRel/command.json" } else { "$roundRel/$AttemptId/command.json" }
  if ($null -ne $command) { $status = [string]$command.status }
  elseif ($hardLimit) { $status = 'wrapper-timeout' }
  else { $status = 'wrapper-failed' }
  Write-IgLedger $Plan @{
    task = $Task; round = $Round; shard = $ShardPlan.shard; attemptId = $AttemptId; wrapperTask = $wrapperTask
    requestedAt = $requested.ToString('o'); endedAt = $ended.ToString('o'); wrapperExit = $wrapperExit
    wrapperSeconds = $wrapperSeconds; occupiedMs = $occupiedMs; chargedGraceMs = $graceMs
    chargedMs = $occupiedMs + $graceMs
    priorityWaitMs = [int][math]::Max(0, ($ended - $requested).TotalMilliseconds - $occupiedMs)
    status = $status; commandJson = $(if ($null -ne $command) { $commandRel } else { $null })
    note = $(if ($null -ne $failure) { $failure.ToString() } else { $null })
  }
  return @{ failure = $failure; wrapperExit = $wrapperExit; command = $command; commandFile = $commandFile }
}

function New-IgResult([string]$Status, $Detail, [int]$Code) {
  return @{ status = $Status; detail = $Detail; code = $Code }
}

function Invoke-IgDispatch($FirstPlan) {
  if ($Round -eq 'frozen-gate') {
    if (-not $freezePath -or -not $budgetPath) {
      return New-IgResult 'frozen-receipt-missing' 'a frozen run needs -FreezeReceipt and -BudgetReceipt' 2
    }
    # Both receipts are validated, and must name this runtime, before any wrapper command or generation.
    if (-not $FirstPlan.receipts.ok) {
      return New-IgResult $FirstPlan.receipts.code @{ problems = @($FirstPlan.receipts.problems) } 2
    }
  }
  if (-not (Test-Path -LiteralPath $helperPath)) { throw "Lock helper not found: $helperPath" }
  . $helperPath
  $outcomes = @()
  $resumeShard = $null
  if ($resumePath) { $resumeShard = [string](Get-Content -LiteralPath $resumePath -Raw | ConvertFrom-Json -Depth 40).shard }
  foreach ($name in @($FirstPlan.shards | ForEach-Object { $_.shard })) {
    if ($Shard -and ($Shard -notcontains $name)) { continue }
    $carry = $null
    if ($resumePath -and $name -eq $resumeShard) { $carry = $resumePath }
    $first = $true
    while ($true) {
      $plan = Get-IgPlan
      $sp = @($plan.shards | Where-Object { $_.shard -eq $name })[0]
      if ($sp.status -eq 'recorded') {
        Write-Host "  shard $name already recorded: not rerun"
        $outcomes += @{ shard = $name; status = 'recorded' }
        break
      }
      if ($sp.status -eq 'failed' -and -not ($first -and $Attempt)) {
        return New-IgResult 'stopped' @{ shard = $name; reason = "shard failed ($($sp.reason)); a fix needs a new -Attempt id and approval" } 1
      }
      if ($sp.status -eq 'paused' -and -not $carry) {
        return New-IgResult 'paused-unstarted' @{ shard = $name; unstarted = @($sp.unstartedKeys).Count
          resume = "rerun with -ResumeUnstarted $($sp.lastCommandJson)" } 0
      }
      if (-not $plan.budget.canAdmit) {
        return New-IgResult 'paused-unstarted' @{ shard = $name; unstarted = @($sp.unstartedKeys).Count
          reason = 'the remaining task/round budget cannot admit another command'; budget = $plan.budget } 0
      }
      $attemptId = [string]$sp.nextAttempt
      if ($first -and $Attempt) { $attemptId = $Attempt }
      Write-Host "  shard $name attempt ${attemptId}: wrapper command (deadline $($plan.budget.effectiveDeadlineMs) ms)"
      $result = Invoke-IgShard $plan $sp $attemptId $carry
      $first = $false
      $cmd = $result.command
      if ($null -ne $result.failure -or $null -eq $cmd) {
        $code = 1
        if ($result.wrapperExit -eq 2) { $code = 2 }
        return New-IgResult 'stopped' @{ shard = $name; reason = "wrapper command failed: $($result.failure)" } $code
      }
      if ($cmd.status -eq 'complete') {
        $outcomes += @{ shard = $name; status = 'complete'; attemptId = $attemptId }
        break
      }
      if ($cmd.status -eq 'paused-unstarted') {
        $progress = @($cmd.completedKeys).Count + @($cmd.censoredKeys).Count + @($cmd.errorKeys).Count +
          @($cmd.startedUnfinishedKeys).Count
        if ($progress -eq 0) {
          return New-IgResult 'stopped' @{ shard = $name; reason = 'a command made no progress; stopping for review' } 1
        }
        $carry = $result.commandFile
        continue
      }
      return New-IgResult 'stopped' @{ shard = $name; status = [string]$cmd.status; exit = $cmd.exit } ([int]$cmd.exit)
    }
  }
  return New-IgResult 'complete' @{ shards = $outcomes } 0
}

$final = $null
Set-Location -LiteralPath $repoRoot
try {
  $plan = Get-IgPlan
  Write-Host ("IG {0} {1}: runtime {2}, manifest {3}, gate {4}, projected machine time {5:N0} s" -f $Task, $Round,
    $plan.runtimeFingerprint.Substring(0, 12), $plan.manifestHash.Substring(0, 12), $plan.gate.state,
    ($plan.projectedMachineMs / 1000))
  foreach ($s in $plan.shards) {
    Write-Host ("  shard {0} [{1}] {2}: {3} keys, {4} unstarted, projected {5:N0} s" -f $s.shard, $s.kind, $s.status,
      @($s.keys).Count, @($s.unstartedKeys).Count, ($s.projectedMachineMs / 1000))
  }
  if ($PlanOnly) {
    $final = @{ plan = $plan; code = 0 }
  } else {
    $final = Invoke-IgDispatch $plan
    $final.evidenceStatus = $plan.evidenceStatus
  }
} catch {
  $final = @{ status = 'error'; detail = $_.ToString(); code = 1; evidenceStatus = 'provisional (pre-freeze)' }
} finally {
  Set-Location -LiteralPath $startLocation
}
if ($final.ContainsKey('plan')) {
  Write-Output ($final.plan | ConvertTo-Json -Depth 40)
} else {
  Write-Output ([ordered]@{ ig = 'dispatch'; task = $Task; round = $Round; status = $final.status
    evidenceStatus = $final.evidenceStatus; detail = $final.detail } | ConvertTo-Json -Depth 10 -Compress)
}
exit $final.code
