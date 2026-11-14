# MS05r5: runs one command through Invoke-Dv3Node (same folder, unchanged) and appends one record to runs.jsonl.
# From generator/ or player/:  pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r5\Run-Dv3Logged.ps1 -Label <name>
#   -ArgsJson '["tests\\node-runner.js","--suite=harness"]' [-AllowExit1]
# The lock wait is the wall time minus the node seconds the helper prints (it includes the helper's own start-up).
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
  $lines = Invoke-Dv3Node -Task MS05r5 -NodeArgs $nodeArgs -AllowExit1:$AllowExit1 6>&1
  $exitCode = $LASTEXITCODE
  $summary = $lines | Where-Object { "$_" -match '^MS05r5 exit=(\d+) seconds=([\d.]+)$' } | Select-Object -Last 1
  if ($summary) { Write-Output "$summary"; $nodeSeconds = [double]$Matches[2] }
} catch {
  $failure = "$($_.Exception.Message)"
  $exitCode = $LASTEXITCODE
  Write-Output "FAILED: $failure"
}
$wall = ((Get-Date) - $started).TotalSeconds
$record = [ordered]@{
  label = $Label; task = 'MS05r5'; app = (Split-Path -Leaf (Get-Location).Path); nodeArgs = $nodeArgs
  allowExit1 = [bool]$AllowExit1; startedAt = $started.ToUniversalTime().ToString('o'); exit = $exitCode
  nodeSeconds = $nodeSeconds; wallSeconds = [math]::Round($wall, 3)
  lockWaitSeconds = $(if ($null -ne $nodeSeconds) { [math]::Round($wall - $nodeSeconds, 3) } else { $null })
  failure = $failure
}
$line = ($record | ConvertTo-Json -Compress -Depth 4) + "`r`n"
[IO.File]::AppendAllText((Join-Path $PSScriptRoot 'runs.jsonl'), $line, (New-Object Text.UTF8Encoding $false))
if ($failure) { exit 1 }
exit $exitCode
