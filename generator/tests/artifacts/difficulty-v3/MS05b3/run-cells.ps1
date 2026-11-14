# MS05b3 sequencer: runs the cells of docs/difficulty-v3/evidence/MS05b3/manifest.json one command at a time.
# From generator/, in a fresh PowerShell:
#   pwsh -NoProfile -File tests\artifacts\difficulty-v3\MS05b3\run-cells.ps1 -Batch i5-killer -Kind i5 -Suite killer *> <transcript>
# Every cell: (1) the preflight `--list-tests` (selected total 1, the expected full name, not skipped, no
# registration error; under a second, no timing slot), (2) the generation command with --verbose and --results and
# SG_CORPUS_TIMES=1 (the milliseconds of every request in the transcript). Batches 1 and 2 ran a cell projected over
# 60 s under the shared timing lock (Invoke-Dv3Node of check-list section 7, saved verbatim in lock.ps1) at once;
# from the third batch every cell is first tried without the lock for at most 10 s (a command that cannot run longer
# needs none) unless the level before it took 30 s or more for as many requests or Addendum B1 orders it. A stopped
# attempt is discarded and the cell is run again under the lock. At least 15 s pass between two locked commands.
# The projection of a cell is its manifest projection, or, once the level before it of the same variant has run,
# 3 x the observed seconds per request of that level x its requests + 3 s if that is more. A cell projected over
# 450 s is not launched (written as `deferred` to runs.jsonl) unless it is one of the two mega Nightmare cells that
# Addendum B1 orders live. The batch stops at a failure that is not a recognised availability outcome (none of N
# puzzles hit it, the hit rate, a request over its guard): a possible correctness failure. Never deletes a lock;
# a wait of 20 minutes ends the batch (Invoke-Dv3Node throws) and is reported.
param(
  [Parameter(Mandatory)][string]$Batch,
  [string[]]$Ids,
  [string]$Kind,
  [string]$Suite,
  [string]$Variant,
  [switch]$Plan,
  [switch]$RetryDeferred,
  [double]$ProjectionSeconds,
  [string]$ProjectionReason
)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$gen = (Resolve-Path (Join-Path $here '..\..\..\..')).Path
$repo = Split-Path $gen -Parent
$evid = Join-Path $repo 'docs\difficulty-v3\evidence\MS05b3'
$rel = '..\docs\difficulty-v3\evidence\MS05b3'
$env:SG_CORPUS_TIMES = '1'
. (Join-Path $here 'lock.ps1')
Set-Location $gen

$manifest = Get-Content (Join-Path $evid 'manifest.json') -Raw | ConvertFrom-Json
$runs = Join-Path $evid 'runs.jsonl'
$script:lastRelease = $null

function Get-Runs { if (Test-Path $runs) { Get-Content $runs | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json } } else { @() } }

function Get-Projection($cell) {
  $b1 = ($cell.kind -eq 'cv3' -and $cell.level -eq 'nightmare' -and $cell.variantId -in @('mega12', 'mega16'))
  $seconds = $cell.projection.seconds
  $basis = $cell.projection.basis
  if (-not $b1 -and $cell.after) {
    $before = Get-Runs | Where-Object { $_.id -eq $cell.after -and $_.perRequestSeconds -ne $null } | Select-Object -Last 1
    if ($before) {
      $adaptive = [math]::Round(3 * $before.perRequestSeconds * $cell.requests + 3, 3)
      if ($adaptive -gt $seconds) {
        $seconds = $adaptive
        $basis = "3 x observed $($before.perRequestSeconds) s per request of $($cell.after) x $($cell.requests) + 3 s (above the budget projection of the manifest)"
      }
    }
  }
  [pscustomobject]@{ seconds = $seconds; basis = $basis; b1 = $b1 }
}

function Add-Run($record) {
  [IO.File]::AppendAllText($runs, (($record | ConvertTo-Json -Compress -Depth 8) + "`r`n"), (New-Object Text.UTF8Encoding $false))
}

function Wait-Gap {
  if ($script:lastRelease) {
    $left = 15 - ((Get-Date) - $script:lastRelease).TotalSeconds
    if ($left -gt 0) { Start-Sleep -Seconds ([math]::Ceiling($left)) }
  }
}

function Invoke-Unlocked($nodeArgs) {
  $si = [Diagnostics.ProcessStartInfo]::new('node')
  $si.UseShellExecute = $false
  $si.WorkingDirectory = (Get-Location).Path
  foreach ($a in $nodeArgs) { $si.ArgumentList.Add($a) }
  $start = Get-Date
  $p = [Diagnostics.Process]::Start($si)
  if (-not $p.WaitForExit(10000)) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    return [pscustomobject]@{ timedOut = $true; exit = $null; seconds = 10 }
  }
  [pscustomobject]@{ timedOut = $false; exit = $p.ExitCode; seconds = [math]::Round(((Get-Date) - $start).TotalSeconds, 3) }
}

function Get-Class($cell, $row) {
  if ($row.status -eq 'pass') { return 'pass' }
  $msg = [string]$row.error.message
  if (([string]$row.error.name + ' ' + $msg) -match 'budget\.exceeded|budget\.cancelled|GenerationError') { return 'availability-request-guard' }
  if ($cell.kind -eq 'cv3' -and $msg -match 'none of \d+ puzzles hit it$') { return 'availability-none-hit' }
  if ($cell.kind -eq 'i5' -and $msg -match 'to be (?:>=?|greater than(?: or equal to)?) ([\d.]+)$') {
    $need = [double]$Matches[1]
    $want = if ($cell.suite -eq 'killer') { 0.8 * $cell.requests } else { 0.9 }
    if ([math]::Abs($need - $want) -lt 1e-9) { return 'availability-hit-rate' }
  }
  'review'
}

$cells = @($manifest.cells)
if ($Ids) { $cells = @($Ids | ForEach-Object { $id = $_; $cells | Where-Object { $_.id -eq $id } }) }
if ($Kind) { $cells = @($cells | Where-Object { $_.kind -eq $Kind }) }
if ($Suite) { $cells = @($cells | Where-Object { $_.suite -eq $Suite }) }
if ($Variant) { $cells = @($cells | Where-Object { $_.variantId -eq $Variant }) }
Write-Host "== BATCH $Batch : $($cells.Count) cells at $((Get-Date).ToString('o'))"
if ($Plan) { $cells | ForEach-Object { Write-Host "$($_.id) requests=$($_.requests) projection=$((Get-Projection $_).seconds)" }; return }

foreach ($cell in $cells) {
  $done = Get-Runs | Where-Object { $_.id -eq $cell.id -and ($_.outcome -eq 'ran' -or ($_.outcome -eq 'deferred' -and -not $RetryDeferred)) }
  if ($done) { Write-Host "== SKIP $($cell.id): already recorded ($($done[-1].outcome))"; continue }
  $proj = Get-Projection $cell
  if ($RetryDeferred -and $ProjectionSeconds) {
    # An explicit, recorded revision of the projection that deferred the cell (the reason is kept in the record).
    $proj = [pscustomobject]@{ seconds = $ProjectionSeconds; basis = "revised: $ProjectionReason (was $($proj.seconds) s: $($proj.basis))"; b1 = $false }
  }
  $record = [ordered]@{ id = $cell.id; batch = $Batch; started = (Get-Date).ToString('o'); kind = $cell.kind;
    filter = $cell.filter; requests = $cell.requests; generation = $cell.generation; projectionSeconds = $proj.seconds;
    projectionBasis = $proj.basis }
  if ($proj.seconds -gt 450 -and -not $proj.b1) {
    $record.outcome = 'deferred'; $record.reason = "projected $($proj.seconds) s over the 450-second rule ($($proj.basis))"
    Add-Run $record
    Write-Host "== DEFER $($cell.id): $($record.reason)"
    continue
  }
  $listRel = Join-Path $rel $cell.listPath
  $resRel = Join-Path $rel $cell.resultsPath
  foreach ($d in @($listRel, $resRel)) {
    New-Item -ItemType Directory -Force (Split-Path (Join-Path $gen $d) -Parent) | Out-Null
    # A file left by an interrupted earlier attempt of this cell (the runner never overwrites): the cell has no completed record.
    $stale = Join-Path $gen $d
    if (Test-Path $stale) { Remove-Item -LiteralPath $stale -Force }
  }
  Write-Host "== CELL $($cell.id) requests=$($cell.requests) projection=$($proj.seconds)s ($($proj.basis))"

  # 1. the preflight: registration only, no generation
  $pre = Invoke-Unlocked @('tests\node-runner.js', "--suite=$($cell.suite)", "--filter=$($cell.filter)", "--list-tests=$listRel")
  $listFile = Join-Path $gen $listRel
  $selected = $null; $name = $null; $skipped = $null; $regErrors = $null
  if ($pre.exit -eq 0 -and (Test-Path $listFile)) {
    $list = Get-Content $listFile -Raw | ConvertFrom-Json
    $selected = @($list.tests).Count; $name = $list.tests[0].fullName; $skipped = $list.tests[0].skipped
    $regErrors = @($list.registrationErrors).Count
  }
  $record.preflight = [ordered]@{ exit = $pre.exit; selectedTotal = $selected; fullName = $name; skipped = $skipped; registrationErrors = $regErrors }
  if ($selected -ne 1 -or $name -ne $cell.fullName -or $skipped -or $regErrors -ne 0) {
    $record.outcome = 'preflight-failed'
    Add-Run $record
    Write-Host "== STOP $($cell.id): the preflight did not select exactly the expected test"
    break
  }

  # 2. the generation command
  $nodeArgs = @('tests\node-runner.js', "--suite=$($cell.suite)", "--filter=$($cell.filter)", '--verbose', "--results=$resRel")
  # Without the lock for at most 10 s unless the level before it took 30 s or more for as many requests (or Addendum B1
  # orders the cell): a command that is stopped at 10 s cannot disturb a timing run for longer.
  $known = $null
  if ($cell.after) {
    $before = Get-Runs | Where-Object { $_.id -eq $cell.after -and $_.perRequestSeconds -ne $null } | Select-Object -Last 1
    if ($before) { $known = $before.perRequestSeconds * $cell.requests }
  }
  $locked = $proj.b1 -or ($known -ne $null -and $known -ge 30)
  $wall = [Diagnostics.Stopwatch]::StartNew()
  $exit = $null; $seconds = $null; $failure = $null; $escalated = $false
  if (-not $locked) {
    $r = Invoke-Unlocked $nodeArgs
    if ($r.timedOut) {
      # The first attempt took over 10 s: it was stopped, its (absent) results are discarded, and the cell is run again under the lock.
      Write-Host "== ESCALATE $($cell.id): over 10 s without a timing slot; stopped, run again under the lock"
      $stale = Join-Path $gen $resRel
      if (Test-Path $stale) { Remove-Item -LiteralPath $stale -Force }
      $locked = $true; $escalated = $true
    } else { $exit = $r.exit; $seconds = $r.seconds }
  }
  if ($locked) {
    Wait-Gap
    try {
      $info = Invoke-Dv3Node -Task MS05b3 -AllowExit1 -NodeArgs $nodeArgs 6>&1
      $line = ($info | ForEach-Object { "$_" } | Where-Object { $_ -match 'exit=' } | Select-Object -Last 1)
      if ($line -match 'exit=(\d+) seconds=([\d.]+)') { $exit = [int]$Matches[1]; $seconds = [double]$Matches[2] }
    } catch { $failure = $_.Exception.Message }
    $script:lastRelease = Get-Date
  }
  $wall.Stop()
  $record.slot = if ($locked) { 'locked' } else { 'none' }
  $record.escalated = $escalated
  $record.exit = $exit; $record.processSeconds = $seconds
  $record.wallSeconds = [math]::Round($wall.Elapsed.TotalSeconds, 3)
  if ($locked -and $seconds -ne $null) { $record.lockWaitSeconds = [math]::Round($wall.Elapsed.TotalSeconds - $seconds, 3) }
  if ($failure) { $record.failure = $failure }

  # 3. what the runner recorded
  $resFile = Join-Path $gen $resRel
  $class = 'incomplete'
  if (Test-Path $resFile) {
    $res = Get-Content $resFile -Raw | ConvertFrom-Json
    $row = @($res.results.tests)[0]
    $record.selectedTotal = $res.results.total
    $record.complete = $res.complete
    $record.sourceHash = $res.sourceHash
    $record.sourceStable = $res.sourceStable
    $record.testName = $row.fullName
    $record.status = $row.status
    $record.testMs = $row.ms
    if ($row.error) { $record.error = [ordered]@{ name = $row.error.name; message = $row.error.message } }
    if ($res.results.total -eq 1 -and $res.complete -and $row.fullName -eq $cell.fullName) {
      $class = Get-Class $cell $row
      if ($cell.requests -gt 0 -and $cell.kind -ne 'cv3-unsupported') { $record.perRequestSeconds = [math]::Round($row.ms / 1000 / $cell.requests, 4) }
    }
  }
  if ($failure -and $failure -match '540-second') { $class = 'timeout' }
  $record.class = $class
  $record.outcome = 'ran'
  Add-Run $record
  Write-Host "== END $($cell.id) class=$class exit=$exit process=${seconds}s wall=$($record.wallSeconds)s slot=$($record.slot) status=$($record.status)"
  if ($class -in @('review', 'incomplete')) {
    Write-Host "== STOP $($cell.id): not a recognised availability outcome; review before going on"
    break
  }
}
Write-Host "== BATCH $Batch finished at $((Get-Date).ToString('o'))"
