# MS13a scratch (copied from MS12's, names adapted): one locked command per call, with the lock wait recorded. It
# dot-sources the verbatim helper (docs/difficulty-v3/evidence/MS13a/invoke-dv3node.ps1), waits so that at least 15
# seconds have passed since this task's previous release, runs `node` through Invoke-Dv3Node (through tee-run.cjs,
# which also writes the transcript), and appends one JSON line to docs/difficulty-v3/evidence/MS13a/lock-log.jsonl:
# the task, when it asked, when it finished, the node seconds the helper reports, the wait (total minus node seconds)
# and the exit code.
#   . generator\tests\artifacts\difficulty-v3\MS13a\run-locked.ps1
#   Invoke-Locked -Task 'MS13a tech-chain' -Log 'logs\tech-chain.txt' -NodeArgs @('tests\node-runner.js', '--suite=tech-chain')
$script:MS13Root = 'Q:\git\sudoku'
. "$script:MS13Root\docs\difficulty-v3\evidence\MS13a\invoke-dv3node.ps1"
$script:LockLog = "$script:MS13Root\docs\difficulty-v3\evidence\MS13a\lock-log.jsonl"
$script:LastRelease = "$script:MS13Root\generator\tests\artifacts\difficulty-v3\MS13a\.last-release"

function Invoke-Locked {
  param([string]$Task, [string]$Log, [string[]]$NodeArgs, [switch]$AllowExit1, [switch]$NoTee)
  if (Test-Path $script:LastRelease) {
    $gap = 15 - ((Get-Date) - [DateTime]::Parse((Get-Content $script:LastRelease -Raw).Trim(), $null,
      [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()).TotalSeconds
    if ($gap -gt 0) { Start-Sleep -Milliseconds ([int]($gap * 1000)) }
  }
  $asked = Get-Date
  $cwd = (Get-Location).Path
  $args2 = $NodeArgs
  if (-not $NoTee) {
    $tee = Join-Path $script:MS13Root 'generator\tests\artifacts\difficulty-v3\MS13a\tee-run.cjs'
    $logPath = if ([IO.Path]::IsPathRooted($Log)) { $Log } else { Join-Path $script:MS13Root "docs\difficulty-v3\evidence\MS13a\$Log" }
    $args2 = @($tee, $logPath) + $NodeArgs
  }
  $summary = $null
  $failed = $null
  try {
    $summary = Invoke-Dv3Node -Task $Task -NodeArgs $args2 -AllowExit1:$AllowExit1 6>&1 | Out-String
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = Get-Date
  [IO.File]::WriteAllText($script:LastRelease, $finished.ToUniversalTime().ToString('o') + "`r`n")
  $nodeSeconds = $null
  if ($summary -match 'seconds=([0-9.]+)') { $nodeSeconds = [double]$Matches[1] }
  $total = ($finished - $asked).TotalSeconds
  $record = [ordered]@{
    task = $Task; asked = $asked.ToString('yyyy-MM-ddTHH:mm:ss.fffzzz'); finished = $finished.ToString('yyyy-MM-ddTHH:mm:ss.fffzzz')
    cwd = $cwd; exit = $LASTEXITCODE; nodeSeconds = $nodeSeconds
    waitSeconds = if ($null -ne $nodeSeconds) { [math]::Round($total - $nodeSeconds, 1) } else { $null }
    error = $failed
  }
  [IO.File]::AppendAllText($script:LockLog, (($record | ConvertTo-Json -Compress) + "`r`n"))
  Write-Host ("LOCKED {0}: exit={1} node={2}s wait={3}s{4}" -f $Task, $LASTEXITCODE, $nodeSeconds, $record.waitSeconds,
    $(if ($failed) { " ERROR $failed" } else { '' }))
}
