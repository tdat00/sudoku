# MS05r6c: runs one command through Invoke-Dv3Node (same folder, unchanged) and appends one record to runs.jsonl.
# From the app folder (generator/ or player/), the lock helper takes its working directory from the caller:
#   pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r6c\Run-Dv3Logged.ps1 -Label <name> -App generator
#   -ArgsJson '["tests\\node-runner.js","--suite=store"]' [-AllowExit1] 2>&1 | Tee-Object logs\<name>.txt
# The console output (the node command's own and the helper's summary line) goes to the caller, which keeps it in
# logs\<Label>.txt. The lock wait is the wall time minus the node seconds the helper prints (it includes the helper's
# own start-up). A node exit code other than 0 (and 1 with -AllowExit1) makes the helper throw after printing its
# summary: the code is read from $LASTEXITCODE and recorded as it is. No command starts without the lock.
param(
  [Parameter(Mandatory)][string]$Label,
  [Parameter(Mandatory)][string]$ArgsJson,
  [string]$App = 'generator',
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
  $lines = Invoke-Dv3Node -Task MS05r6c -NodeArgs $nodeArgs -AllowExit1:$AllowExit1 6>&1
  $exitCode = $LASTEXITCODE
  $lines | ForEach-Object { Write-Output "$_" }
  $summary = $lines | Where-Object { "$_" -match '^MS05r6c exit=(\d+) seconds=([\d.]+)$' } | Select-Object -Last 1
  if ($summary) { $nodeSeconds = [double]$Matches[2] }
} catch {
  $failure = "$($_.Exception.Message)"
  $exitCode = $LASTEXITCODE
  Write-Output "FAILED: $failure"
}
$wall = ((Get-Date) - $started).TotalSeconds
$record = [ordered]@{
  label = $Label; task = 'MS05r6c'; app = $App; nodeArgs = $nodeArgs; allowExit1 = [bool]$AllowExit1
  startedAt = $started.ToUniversalTime().ToString('o'); exit = $exitCode; nodeSeconds = $nodeSeconds
  wallSeconds = [math]::Round($wall, 3)
  lockWaitSeconds = $(if ($null -ne $nodeSeconds) { [math]::Round($wall - $nodeSeconds, 3) } else { $null })
  failure = $failure
}
$line = ($record | ConvertTo-Json -Compress -Depth 4) + "`n"
[IO.File]::AppendAllText((Join-Path $PSScriptRoot 'runs.jsonl'), $line, (New-Object Text.UTF8Encoding $false))
if ($failure) { exit 1 }
exit $exitCode
