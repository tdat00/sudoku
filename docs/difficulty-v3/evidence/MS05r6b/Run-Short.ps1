# MS05r6b: runs one short no-generation command WITHOUT the lock (check-list section 7, IR07: registration listings,
# --reconcile, merges and scripts that generate nothing, each known to be well under 10 s) and appends one record to
# runs.jsonl with locked = false. The caller keeps the output in logs\<Label>.txt.
# From generator/ or player/:  pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r6b\Run-Short.ps1 -Label <name>
#   -App generator -ArgsJson '["tests\\replay-fixtures.js","--merge=..\\docs\\x","--check"]'
param(
  [Parameter(Mandatory)][string]$Label,
  [Parameter(Mandatory)][string]$ArgsJson,
  [string]$App = 'generator'
)
$ErrorActionPreference = 'Stop'
$nodeArgs = [string[]](ConvertFrom-Json $ArgsJson)
$started = Get-Date
$clock = [Diagnostics.Stopwatch]::StartNew()
$text = & node @nodeArgs 2>&1 | Out-String
$code = $LASTEXITCODE
$clock.Stop()
Write-Output $text.TrimEnd()
Write-Output ("MS05r6b short {0} exit={1} seconds={2}" -f $Label, $code, [math]::Round($clock.Elapsed.TotalSeconds, 3))
$record = [ordered]@{
  label = $Label; task = 'MS05r6b'; app = $App; locked = $false; nodeArgs = $nodeArgs
  startedAt = $started.ToUniversalTime().ToString('o'); exit = $code; nodeSeconds = [math]::Round($clock.Elapsed.TotalSeconds, 3)
}
[IO.File]::AppendAllText((Join-Path $PSScriptRoot 'runs.jsonl'), (($record | ConvertTo-Json -Compress -Depth 4) + "`n"),
  (New-Object Text.UTF8Encoding $false))
exit $code
