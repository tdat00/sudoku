# MS05r5m: runs one command through Invoke-Dv3Node (same folder, unchanged) and appends one record to runs.jsonl.
# From generator/:  pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r5m\Run-Dv3Logged.ps1 -Label <name>
#   -ArgsJson '["tests\\node-runner.js","--suite=store"]' [-AllowExit1]
# The lock wait is the wall time minus the node seconds the helper prints (it includes the helper's own start-up).
# Exit codes of tests\mega-contract.js other than 0 (3: an availability outcome; 1: a failed check) make the helper
# throw after printing its summary: the code is read from $LASTEXITCODE and recorded as it is.
param(
  [Parameter(Mandatory)][string]$Label,
  [Parameter(Mandatory)][string]$ArgsJson,
  [switch]$AllowExit1
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-Dv3Node.ps1')
$nodeArgs = [string[]](ConvertFrom-Json $ArgsJson)
$started = Get-Date
$failure = $null
$exitCode = $null
$nodeSeconds = $null
try {
  $lines = Invoke-Dv3Node -Task MS05r5m -NodeArgs $nodeArgs -AllowExit1:$AllowExit1 6>&1
  $exitCode = $LASTEXITCODE
  $lines | ForEach-Object { Write-Output "$_" }
  $summary = $lines | Where-Object { "$_" -match '^MS05r5m exit=(\d+) seconds=([\d.]+)$' } | Select-Object -Last 1
  if ($summary) { $nodeSeconds = [double]$Matches[2] }
} catch {
  $failure = "$($_.Exception.Message)"
  $exitCode = $LASTEXITCODE
  Write-Output "FAILED: $failure"
}
$wall = ((Get-Date) - $started).TotalSeconds
$record = [ordered]@{
  label = $Label; task = 'MS05r5m'; nodeArgs = $nodeArgs; allowExit1 = [bool]$AllowExit1
  startedAt = $started.ToUniversalTime().ToString('o'); exit = $exitCode; nodeSeconds = $nodeSeconds
  wallSeconds = [math]::Round($wall, 3)
  lockWaitSeconds = $(if ($null -ne $nodeSeconds) { [math]::Round($wall - $nodeSeconds, 3) } else { $null })
  failure = $failure
}
$line = ($record | ConvertTo-Json -Compress -Depth 4) + "`n"
[IO.File]::AppendAllText((Join-Path $PSScriptRoot 'runs.jsonl'), $line, (New-Object Text.UTF8Encoding $false))
if ($failure) { exit 1 }
exit $exitCode
